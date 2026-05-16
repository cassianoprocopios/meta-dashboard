/**
 * Busca o faturamento do dia 15/05/2026 no Avec via Relatório 0184
 * e insere no banco de dados
 */
import { avecBrowserBuscarRelatorio0184 } from './server/avecBrowser';
import { drizzle } from 'drizzle-orm/mysql2';
import { faturamentos } from './drizzle/schema';
import { and, eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';
dotenv.config();

const db = drizzle(process.env.DATABASE_URL!);

const EMAIL = 'seraphinebeauty24@gmail.com';
const SENHA = 'Dxj4oue@';
const DATA = '2026-05-15';

console.log(`Buscando Relatório 0184 para ${DATA}...`);
const resultado = await avecBrowserBuscarRelatorio0184(EMAIL, SENHA, DATA);

console.log('\n=== RESULTADO DO AVEC ===');
console.log(JSON.stringify(resultado, null, 2));

if (resultado.cabelo !== undefined) {
  const cat1 = resultado.cabelo ?? 0;
  const cat2 = resultado.manicurePedicure ?? 0;
  const cat3 = resultado.sobrancelha ?? 0;
  const cat4 = resultado.pacote ?? 0;
  const cat5 = resultado.recorrencia ?? 0;
  const cat6 = resultado.outros ?? 0;
  const total = cat1 + cat2 + cat3 + cat4 + cat5 + cat6;

  console.log(`\nValores: cat1=${cat1} | cat2=${cat2} | cat3=${cat3} | cat4=${cat4} | cat5=${cat5} | cat6=${cat6}`);
  console.log(`Total: R$ ${total.toFixed(2)}`);

  // Verificar se já existe
  const existente = await db.select().from(faturamentos)
    .where(and(
      eq(faturamentos.empresaSlug, 'barbiero-seraphine'),
      eq(faturamentos.data, DATA)
    ));

  if (existente.length > 0) {
    console.log('\nJá existe registro para este dia, atualizando...');
    await db.update(faturamentos)
      .set({ cat1: String(cat1), cat2: String(cat2), cat3: String(cat3), cat4: String(cat4), cat5: String(cat5), cat6: String(cat6) })
      .where(eq(faturamentos.id, existente[0].id));
    console.log('✅ Atualizado');
  } else {
    console.log('\nInserindo novo registro...');
    await db.insert(faturamentos).values({
      tenantId: 1,
      empresaSlug: 'barbiero-seraphine',
      data: DATA,
      cat1: String(cat1),
      cat2: String(cat2),
      cat3: String(cat3),
      cat4: String(cat4),
      cat5: String(cat5),
      cat6: String(cat6),
      sincronizadoCB: 0,
      lancadoPor: 'sync-manual',
    });
    console.log('✅ Inserido');
  }
} else {
  console.log('\nNenhum dado retornado pelo Avec para este dia.');
}

process.exit(0);
