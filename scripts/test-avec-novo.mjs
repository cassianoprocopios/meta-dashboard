/**
 * Teste da nova função avecBrowserBuscarRelatorio0184Mes
 * que faz login uma única vez para todo o mês.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const mysql = require('mysql2/promise');

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  
  // Buscar configuração do Avec
  const [configs] = await conn.execute(
    "SELECT avecEmail, avecSenha FROM avecConfig WHERE tenantId = 1 AND empresaSlug = 'SERAPHINE' LIMIT 1"
  );
  
  if (!configs.length) {
    console.error('Configuração do Avec não encontrada!');
    await conn.end();
    return;
  }
  
  const { avecEmail, avecSenha } = configs[0];
  console.log(`Email: ${avecEmail}`);
  
  await conn.end();
  
  // Importar a função via tsx
  const { execSync } = require('child_process');
  
  // Verificar faturamento atual da Seraphine dias 16-18
  const conn2 = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn2.execute(
    "SELECT data, cat1, cat2, cat3, cat4, updatedAt FROM faturamentos WHERE tenantId = 1 AND empresaSlug = 'SERAPHINE' AND data >= '2026-04-16' ORDER BY data"
  );
  
  console.log('\n=== SERAPHINE DIAS 16-18 (ANTES) ===');
  for (const r of rows) {
    const total = [r.cat1,r.cat2,r.cat3,r.cat4].reduce((s,v) => s + parseFloat(v||'0'), 0);
    console.log(`${r.data} | cat1(serv): R$${parseFloat(r.cat1||'0').toFixed(2)} | cat2(pac): R$${parseFloat(r.cat2||'0').toFixed(2)} | cat3(prod): R$${parseFloat(r.cat3||'0').toFixed(2)} | cat4(caixa): R$${parseFloat(r.cat4||'0').toFixed(2)} | total: R$${total.toFixed(2)} | upd: ${new Date(r.updatedAt).toLocaleString('pt-BR')}`);
  }
  
  await conn2.end();
}

main().catch(console.error);
