import { createConnection } from 'mysql2/promise';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL não encontrado no ambiente');
  process.exit(1);
}

const conn = await createConnection(dbUrl);

const [rows] = await conn.execute(
  'SELECT id, nome, empresaSlug, cashbarberProfissionalId, fotoUrl, ativo FROM colaboradores WHERE tenantId = 1 ORDER BY empresaSlug, nome'
);

console.log('Total de colaboradores:', rows.length);
console.log('\nColaboradores:');
for (const r of rows) {
  console.log(`  [${r.id}] ${r.nome} | ${r.empresaSlug} | cbId=${r.cashbarberProfissionalId ?? 'NULL'} | foto=${r.fotoUrl ? '✅ ' + r.fotoUrl.substring(0, 60) + '...' : '❌'} | ativo=${r.ativo}`);
}

await conn.end();
