/**
 * Script para sincronização retroativa de março/2026 para os profissionais do Morumbi
 * Usa a função executarRecalculoRanking que já está implementada no cashbarberJob
 */

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');

// Endpoint de sincronização manual
const SERVER_URL = 'http://localhost:3000';
const CRON_TOKEN = 'barbiero-cron-2026';

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // Verificar estado ANTES
  const [antes] = await conn.execute(`
    SELECT c.nome, c.cashbarberProfissionalId, fc.totalServicos, fc.totalProdutos, fc.totalGeral, fc.updatedAt
    FROM colaboradores c
    LEFT JOIN faturamentoColaboradores fc ON fc.colaboradorId = c.id AND fc.mes = 3 AND fc.ano = 2026
    WHERE c.tenantId = 1 AND c.empresaSlug = 'barbiero-morumbi' AND c.ativo = 1
    ORDER BY COALESCE(fc.totalGeral, 0) DESC
  `);

  console.log('=== Estado ANTES da sincronização retroativa ===');
  for (const r of antes) {
    const total = r.totalGeral ? parseFloat(r.totalGeral).toFixed(2) : '0.00';
    const cbId = r.cashbarberProfissionalId ?? 'SEM ID';
    const sync = r.updatedAt ? r.updatedAt.toISOString().substring(0, 16) : 'nunca';
    console.log(`  ${r.nome} (CB: ${cbId}): R$ ${total} (última sync: ${sync})`);
  }

  await conn.end();

  console.log('\n→ Chamando endpoint de sincronização retroativa...');
  
  try {
    const resp = await fetch(`${SERVER_URL}/api/internal/cron-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-token': CRON_TOKEN,
      },
    });
    const text = await resp.text();
    console.log(`  Status HTTP: ${resp.status}`);
    try {
      const json = JSON.parse(text);
      console.log('  Resultado:', JSON.stringify(json, null, 2));
    } catch {
      console.log('  Resposta:', text.substring(0, 500));
    }
  } catch (e) {
    console.error('  Erro ao chamar endpoint:', e.message);
  }

  // Aguardar 10s para o sync completar
  console.log('\n→ Aguardando 10s para o sync completar...');
  await new Promise(r => setTimeout(r, 10000));

  // Verificar estado DEPOIS
  const conn2 = await mysql.createConnection(DATABASE_URL);
  const [depois] = await conn2.execute(`
    SELECT c.nome, fc.totalServicos, fc.totalProdutos, fc.totalGeral, fc.updatedAt
    FROM colaboradores c
    LEFT JOIN faturamentoColaboradores fc ON fc.colaboradorId = c.id AND fc.mes = 3 AND fc.ano = 2026
    WHERE c.tenantId = 1 AND c.empresaSlug = 'barbiero-morumbi' AND c.ativo = 1
    ORDER BY COALESCE(fc.totalGeral, 0) DESC
  `);

  console.log('\n=== Estado DEPOIS da sincronização retroativa ===');
  for (const r of depois) {
    const total = r.totalGeral ? parseFloat(r.totalGeral).toFixed(2) : '0.00';
    const sync = r.updatedAt ? r.updatedAt.toISOString().substring(0, 16) : 'nunca';
    console.log(`  ${r.nome}: R$ ${total} (sync: ${sync})`);
  }

  await conn2.end();
  console.log('\n✅ Sincronização retroativa concluída!');
}

main().catch(console.error);
