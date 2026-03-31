// Script para forçar sincronização imediata do ranking de março
// Chama diretamente a função executarRecalculoRanking do cashbarberJob

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Precisamos usar tsx para executar TypeScript diretamente
// Este script é um wrapper que chama via API interna

import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL não definida');

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  
  // Verificar estado atual antes da sincronização
  const [antes] = await conn.execute(`
    SELECT c.nome, fc.totalServicos, fc.totalProdutos, fc.totalGeral, fc.mes, fc.ano, fc.updatedAt
    FROM colaboradores c
    LEFT JOIN faturamentoColaboradores fc ON fc.colaboradorId = c.id AND fc.mes = 3 AND fc.ano = 2026
    WHERE c.tenantId = 1 AND c.empresaSlug = 'barbiero-morumbi' AND c.ativo = 1
    ORDER BY c.nome
  `);
  
  console.log('=== Estado ANTES da sincronização ===');
  for (const r of antes) {
    const total = r.totalGeral ? parseFloat(r.totalGeral).toFixed(2) : '0.00';
    const sync = r.updatedAt ? r.updatedAt.toISOString().substring(0, 16) : 'nunca';
    console.log(`  ${r.nome}: R$ ${total} (última sync: ${sync})`);
  }
  
  await conn.end();
  
  console.log('\n→ Iniciando sincronização via API interna...');
  
  // Chamar o endpoint interno de sync
  try {
    const resp = await fetch('http://localhost:3000/api/internal/cron-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET || '' }
    });
    const text = await resp.text();
    console.log(`  Status: ${resp.status}`);
    console.log(`  Resposta: ${text.substring(0, 200)}`);
  } catch (e) {
    console.log(`  Endpoint não disponível: ${e.message}`);
  }
}

main().catch(console.error);
