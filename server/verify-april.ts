import { getDb } from './db';
import { faturamentos } from '../drizzle/schema';
import { like } from 'drizzle-orm';

async function check() {
  const db = await getDb();
  if (!db) {
    console.error('Erro ao conectar');
    process.exit(1);
  }

  // Verificar dados de abril
  const result = await db
    .select()
    .from(faturamentos)
    .where(like(faturamentos.data, '2026-04%'));
  
  console.log('Total de registros em abril:', result.length);
  console.log('\nÚltimos 10 registros:');
  result.slice(-10).forEach((f: any) => {
    console.log(`${f.data} | ${f.empresaSlug} | cat1=${f.cat1}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
