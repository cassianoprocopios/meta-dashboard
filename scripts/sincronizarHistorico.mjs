/**
 * Script de sincronização histórica completa do CashBarber
 * Busca dados de jan/2026 até o mês atual para todos os profissionais
 */

import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config();

const DB_URL = process.env.DATABASE_URL;
const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona)/i;

async function cashbarberLogin(email, senha) {
  const resp = await fetch('https://api.cashbarber.com.br/api/painel/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: senha }),
  });
  if (!resp.ok) throw new Error(`Login falhou: ${resp.status}`);
  const data = await resp.json();
  const token = data.access_token ?? data.token ?? data.data?.access_token;
  if (!token) throw new Error('Token não encontrado na resposta do login');
  return token;
}

async function cashbarberRelatorio15(token, dataInicial, dataFinal, barbeiroId) {
  const body = { data_inicial: dataInicial, data_final: dataFinal };
  if (barbeiroId) body.barbeiro = barbeiroId;
  const resp = await fetch('https://api.cashbarber.com.br/api/painel/relatorios/15', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new Error(`Relatorio15 falhou: ${resp.status}`);
  return resp.json();
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const db = await createConnection(DB_URL);

// Buscar tenant e config do CashBarber
const [[tenant]] = await db.execute('SELECT id FROM tenants LIMIT 1');
const tenantId = tenant.id;

const [[cbConfig]] = await db.execute(
  `SELECT cbEmail, cbSenha FROM cashbarberConfig WHERE tenantId = ? AND ativo = 1 LIMIT 1`,
  [tenantId]
);

if (!cbConfig) {
  console.error('Configuração do CashBarber não encontrada.');
  process.exit(1);
}

const email = cbConfig.cbEmail;
const senha = cbConfig.cbSenha;

// Buscar colaboradores com ID do CashBarber
const [colaboradores] = await db.execute(
  `SELECT id, nome, apelido, cashbarberProfissionalId, empresaSlug 
   FROM colaboradores 
   WHERE tenantId = ? AND ativo = 1 AND cashbarberProfissionalId IS NOT NULL`,
  [tenantId]
);

console.log(`\n🔑 Fazendo login no CashBarber...`);
const token = await cashbarberLogin(email, senha);
console.log(`✅ Login OK! Sincronizando ${colaboradores.length} profissionais...\n`);

// Meses a sincronizar: jan/2026 até mês atual
const hoje = new Date();
const meses = [];
let ano = 2026, mes = 1;
while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth() + 1)) {
  meses.push({ mes, ano });
  mes++;
  if (mes > 12) { mes = 1; ano++; }
}

console.log(`📅 Meses a sincronizar: ${meses.map(m => `${m.mes}/${m.ano}`).join(', ')}\n`);

let totalSincronizados = 0;
let totalErros = 0;

for (const { mes: m, ano: a } of meses) {
  const dataInicial = `${a}-${String(m).padStart(2, '0')}-01`;
  const ultimoDia = new Date(a, m, 0).getDate();
  const dataFinal = `${a}-${String(m).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
  
  console.log(`\n📊 Sincronizando ${m}/${a} (${dataInicial} → ${dataFinal})`);
  
  // Re-login a cada mês para evitar expiração do token
  let tokenMes = token;
  try {
    tokenMes = await cashbarberLogin(email, senha);
  } catch (e) {
    console.warn(`  ⚠️  Re-login falhou, usando token anterior`);
  }
  
  for (const col of colaboradores) {
    try {
      await sleep(200); // Rate limiting
      const relatorio = await cashbarberRelatorio15(tokenMes, dataInicial, dataFinal, col.cashbarberProfissionalId);
      
      const servicosRanking = (relatorio.servicos ?? []).filter(s => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
      const produtosRanking = (relatorio.produtos ?? []).filter(p => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
      
      const totalServicos = servicosRanking.reduce((acc, s) => acc + (s.sum ?? 0), 0);
      const totalProdutos = produtosRanking.reduce((acc, p) => acc + (p.total ?? 0), 0);
      const totalGeral = totalServicos + totalProdutos;
      
      const detalhesServicos = JSON.stringify(
        servicosRanking.slice(0, 20).map(s => ({ ser_nome: s.ser_nome, sum: s.sum, count: s.count ?? 0 }))
      );
      const detalhesProdutos = JSON.stringify(
        produtosRanking.filter(p => p.total > 0).map(p => ({ pro_nome: p.pro_nome, sum: p.total, count: Number(p.count) || 0 })).slice(0, 30)
      );
      
      // Upsert: atualizar se existe, inserir se não existe
      const [[existing]] = await db.execute(
        `SELECT id FROM faturamentoColaboradores WHERE tenantId = ? AND colaboradorId = ? AND mes = ? AND ano = ?`,
        [tenantId, col.id, m, a]
      );
      
      if (existing) {
        await db.execute(
          `UPDATE faturamentoColaboradores SET totalServicos = ?, totalProdutos = ?, totalGeral = ?, detalhesServicos = ?, detalhesProdutos = ?, updatedAt = NOW()
           WHERE tenantId = ? AND colaboradorId = ? AND mes = ? AND ano = ?`,
          [totalServicos, totalProdutos, totalGeral, detalhesServicos, detalhesProdutos, tenantId, col.id, m, a]
        );
      } else {
        await db.execute(
          `INSERT INTO faturamentoColaboradores (tenantId, colaboradorId, empresaSlug, mes, ano, totalServicos, totalProdutos, totalGeral, detalhesServicos, detalhesProdutos, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [tenantId, col.id, col.empresaSlug, m, a, totalServicos, totalProdutos, totalGeral, detalhesServicos, detalhesProdutos]
        );
      }
      
      const nome = col.apelido || col.nome.split(' ')[0];
      console.log(`  ✅ ${nome}: serv R$ ${totalServicos.toFixed(2)} + prod R$ ${totalProdutos.toFixed(2)} = R$ ${totalGeral.toFixed(2)}`);
      totalSincronizados++;
    } catch (e) {
      console.error(`  ❌ ${col.nome}: ${e.message}`);
      totalErros++;
    }
  }
}

await db.end();

console.log(`\n🎉 Sincronização concluída!`);
console.log(`   ✅ ${totalSincronizados} registros sincronizados`);
console.log(`   ❌ ${totalErros} erros`);
console.log(`   📅 ${meses.length} meses processados`);
