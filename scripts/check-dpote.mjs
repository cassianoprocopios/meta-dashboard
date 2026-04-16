import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar configuração do D-Pote por empresa
const [configs] = await conn.execute(
  "SELECT * FROM cashbarberConfig WHERE tenantId = 1"
);
console.log('=== CASHBARBER CONFIG ===');
for (const r of configs) {
  const cols = Object.keys(r);
  console.log(JSON.stringify(r, null, 2));
}

// Verificar o cat9 por empresa e por dia em abril/2026
const [cat9] = await conn.execute(
  "SELECT empresaSlug, data, cat9, lancadoPor, updatedAt FROM faturamentos WHERE tenantId = 1 AND data LIKE '2026-04-%' AND cat9 > 0 ORDER BY empresaSlug, data"
);
console.log('\n=== CAT9 (D-POTE) POR DIA EM ABRIL ===');
const totais = {};
for (const r of cat9) {
  if (!totais[r.empresaSlug]) totais[r.empresaSlug] = 0;
  totais[r.empresaSlug] += parseFloat(r.cat9);
  console.log(`${r.empresaSlug} ${r.data}: R$${r.cat9} (por ${r.lancadoPor})`);
}
console.log('\nTotais cat9 por empresa:');
for (const [slug, total] of Object.entries(totais)) {
  console.log(`  ${slug}: R$${total.toFixed(2)}`);
}

// Verificar o dpoteSyncLog
const [dpoteLog] = await conn.execute(
  "SELECT * FROM dpoteSyncLog WHERE tenantId = 1 ORDER BY id DESC LIMIT 10"
);
console.log('\n=== DPOTE SYNC LOG ===');
const cols = dpoteLog.length > 0 ? Object.keys(dpoteLog[0]) : [];
console.log('Colunas:', cols.join(', '));
for (const r of dpoteLog) {
  console.log(JSON.stringify(r));
}

await conn.end();
