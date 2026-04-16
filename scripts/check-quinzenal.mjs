import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Calcular o totalQuinzenal como o frontend faz (sumCats = cat1+cat2+cat3+cat4+cat5+cat6+cat7+cat8+cat9)
const [rows] = await conn.execute(
  "SELECT empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9 FROM faturamentos WHERE tenantId = 1 AND data LIKE '2026-04-%' AND DAY(data) <= 15 ORDER BY empresaSlug, data"
);

const empresas = {};
for (const r of rows) {
  const slug = r.empresaSlug;
  if (!empresas[slug]) empresas[slug] = { total: 0, cat9: 0, semCat9: 0 };
  const semCat9 = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8]
    .reduce((a, b) => a + parseFloat(b || '0'), 0);
  const cat9 = parseFloat(r.cat9 || '0');
  empresas[slug].total += semCat9 + cat9;
  empresas[slug].cat9 += cat9;
  empresas[slug].semCat9 += semCat9;
}

console.log('=== QUINZENAL COM sumCats (cat1-cat9) ===');
let grand = 0;
for (const [slug, v] of Object.entries(empresas)) {
  console.log(`${slug}: R$${v.total.toFixed(2)} (sem cat9: R$${v.semCat9.toFixed(2)}, cat9: R$${v.cat9.toFixed(2)})`);
  grand += v.total;
}
console.log('TOTAL GERAL: R$' + grand.toFixed(2));

// Verificar também o faturamento do Morumbi hoje (dia 16)
const [hoje] = await conn.execute(
  "SELECT empresaSlug, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, updatedAt FROM faturamentos WHERE tenantId = 1 AND data = '2026-04-16' ORDER BY empresaSlug"
);
console.log('\n=== FATURAMENTO HOJE (16/04) ===');
for (const r of hoje) {
  const total = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
    .reduce((a, b) => a + parseFloat(b || '0'), 0);
  console.log(`${r.empresaSlug}: R$${total.toFixed(2)} (cat9=${r.cat9}, lancadoPor=${r.lancadoPor}, upd=${new Date(r.updatedAt).toLocaleString('pt-BR')})`);
}

// Verificar o Morumbi dia 15 completo
const [m15] = await conn.execute(
  "SELECT cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, updatedAt FROM faturamentos WHERE tenantId = 1 AND empresaSlug LIKE '%MORUMBI%' AND data = '2026-04-15'"
);
if (m15.length > 0) {
  const r = m15[0];
  const total = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
    .reduce((a, b) => a + parseFloat(b || '0'), 0);
  console.log(`\n=== MORUMBI 15/04 ===`);
  console.log(`Total (cat1-cat9): R$${total.toFixed(2)}`);
  console.log(`cat1=${r.cat1} cat2=${r.cat2} cat3=${r.cat3} cat4=${r.cat4}`);
  console.log(`cat5=${r.cat5} cat6=${r.cat6} cat7=${r.cat7} cat8=${r.cat8} cat9=${r.cat9}`);
  console.log(`lancadoPor: ${r.lancadoPor}`);
  console.log(`updatedAt: ${new Date(r.updatedAt).toLocaleString('pt-BR')}`);
}

// Verificar o cashbarber sync log do Morumbi hoje
const [syncLog] = await conn.execute(
  "SELECT * FROM cashbarberSyncLog WHERE tenantId = 1 ORDER BY id DESC LIMIT 10"
);
console.log('\n=== CASHBARBER SYNC LOG (últimos 10) ===');
for (const r of syncLog) {
  console.log(`${new Date(r.executadoEm || r.createdAt).toLocaleString('pt-BR')}: ${r.origem} ${r.mes}/${r.ano} = ${r.status} (${r.diasSincronizados} sync, ${r.diasIgnorados} ignorados)`);
}

await conn.end();
