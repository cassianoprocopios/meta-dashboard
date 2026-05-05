import { getDb } from './server/db';

async function main() {
  const db = await getDb();
  if (!db) { console.error('DB not available'); process.exit(1); }

  const [morumbi] = await db.execute('SELECT * FROM cashbarberMapeamento WHERE empresaSlug = ? ORDER BY tipo, cbNome', ['barbiero-morumbi']);
  const [mascote] = await db.execute('SELECT * FROM cashbarberMapeamento WHERE empresaSlug = ? ORDER BY tipo, cbNome', ['barbiero-mascote']);

  console.log('=== MORUMBI ===');
  morumbi.forEach(m => console.log(`${m.tipo}: ${m.cbId} (${m.cbNome}) → ${m.metaCategoria}`));

  console.log('\n=== MASCOTE ===');
  mascote.forEach(m => console.log(`${m.tipo}: ${m.cbId} (${m.cbNome}) → ${m.metaCategoria}`));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
