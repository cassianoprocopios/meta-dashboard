import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Calcular o totalQuinzenal correto (dias 1-15 com cat9) para cada empresa
const [rows] = await conn.execute(
  "SELECT empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9 FROM faturamentos WHERE tenantId = 1 AND data LIKE '2026-04-%' AND DAY(data) <= 15 ORDER BY empresaSlug, data"
);

const empresas = {};
for (const r of rows) {
  const slug = r.empresaSlug;
  if (!empresas[slug]) empresas[slug] = { total: 0, dias: 0 };
  const total = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
    .reduce((a, b) => a + parseFloat(b || '0'), 0);
  empresas[slug].total += total;
  if (total > 0) empresas[slug].dias++;
}

console.log('=== TOTAIS QUINZENAIS (dias 1-15 com D-Pote) ===');
let grand = 0;
for (const [slug, v] of Object.entries(empresas)) {
  console.log(`${slug}: R$${v.total.toFixed(2)} (${v.dias} dias com lançamento)`);
  grand += v.total;
}
console.log(`TOTAL GERAL: R$${grand.toFixed(2)}`);

// 2. Verificar se já existe snapshot para abril/2026
const [existing] = await conn.execute(
  "SELECT * FROM snapshotQuinzenal WHERE tenantId = 1 AND mes = 4 AND ano = 2026"
);
console.log('\n=== SNAPSHOTS EXISTENTES ===');
if (existing.length === 0) {
  console.log('Nenhum snapshot encontrado. Criando agora...');
} else {
  console.log('Snapshots existentes:');
  for (const r of existing) console.log(JSON.stringify(r));
  console.log('Atualizando...');
}

// 3. Verificar a estrutura da tabela snapshotQuinzenal
const [cols] = await conn.execute("DESCRIBE snapshotQuinzenal");
console.log('\nColunas:', cols.map(c => c.Field).join(', '));

// 4. Criar/atualizar snapshots para cada empresa
for (const [slug, v] of Object.entries(empresas)) {
  const [ex] = await conn.execute(
    "SELECT id FROM snapshotQuinzenal WHERE tenantId = 1 AND empresaSlug = ? AND mes = 4 AND ano = 2026",
    [slug]
  );
  
  if (ex.length > 0) {
    await conn.execute(
      "UPDATE snapshotQuinzenal SET totalRealizado = ?, origem = ?, updatedAt = NOW() WHERE id = ?",
      [v.total.toFixed(2), 'auto', ex[0].id]
    );
    console.log(`✅ Atualizado snapshot ${slug}: R$${v.total.toFixed(2)}`);
  } else {
    // Inserir novo snapshot
    await conn.execute(
      "INSERT INTO snapshotQuinzenal (tenantId, empresaSlug, mes, ano, totalRealizado, origem, congeladoEm, createdAt) VALUES (1, ?, 4, 2026, ?, 'auto', NOW(), NOW())",
      [slug, v.total.toFixed(2)]
    );
    console.log(`✅ Criado snapshot ${slug}: R$${v.total.toFixed(2)}`);
  }
}

// 5. Verificar faturamento do Morumbi dia 16 vs Mascote
console.log('\n=== FATURAMENTO DIA 16/04 ===');
const [dia16] = await conn.execute(
  "SELECT empresaSlug, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor, updatedAt FROM faturamentos WHERE tenantId = 1 AND data = '2026-04-16' ORDER BY empresaSlug"
);
for (const r of dia16) {
  const semCat9 = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8]
    .reduce((a, b) => a + parseFloat(b || '0'), 0);
  const cat9 = parseFloat(r.cat9 || '0');
  console.log(`${r.empresaSlug}: serviços/produtos=R$${semCat9.toFixed(2)}, cat9=R$${cat9.toFixed(2)}, lancadoPor=${r.lancadoPor}, upd=${new Date(r.updatedAt).toLocaleString('pt-BR')}`);
}

// 6. Verificar o cashbarber sync log de hoje
const [syncLog] = await conn.execute(
  "SELECT * FROM cashbarberSyncLog WHERE tenantId = 1 AND data = '2026-04-16' ORDER BY id DESC LIMIT 5"
);
console.log('\n=== CASHBARBER SYNC LOG DIA 16 ===');
const syncCols = syncLog.length > 0 ? Object.keys(syncLog[0]) : [];
console.log('Colunas:', syncCols.join(', '));
for (const r of syncLog) console.log(JSON.stringify(r));

await conn.end();
console.log('\nConcluído!');
