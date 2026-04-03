import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/meta-dashboard/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

const empresaSlug = 'SERAPHINE';
const tenantId = 1;

// Valores reais do Relatório 0184 - dia 01/04/2026
const servicos = 3839.00;
const pacotes = 512.00;
const produtos = 8.00;
const caixinha = 0.00;

// Verificar faturamento atual
const [existente] = await conn.execute(
  'SELECT id, cat1, cat2, cat3, cat4, cat9, lancadoPor FROM faturamentos WHERE empresaSlug = ? AND data = ? AND tenantId = ?',
  [empresaSlug, '2026-04-01', tenantId]
);

if (existente.length > 0) {
  const fat = existente[0];
  console.log('Faturamento atual 01/04:');
  console.log('  cat1 (Serviços):', fat.cat1);
  console.log('  cat2 (Pacotes):', fat.cat2);
  console.log('  cat3 (Produtos):', fat.cat3);
  console.log('  cat4 (Caixinha):', fat.cat4);
  console.log('  cat9 (Recorrência):', fat.cat9);
  console.log('  Lançado por:', fat.lancadoPor);

  await conn.execute(
    'UPDATE faturamentos SET cat1=?, cat2=?, cat3=?, cat4=?, cat5=0, cat6=0, cat7=0, cat8=0, lancadoPor=?, updatedAt=NOW() WHERE empresaSlug=? AND data=? AND tenantId=?',
    [servicos, pacotes, produtos, caixinha, 'avec-rel0184-correcao', empresaSlug, '2026-04-01', tenantId]
  );
  console.log('\n✅ CORRIGIDO com sucesso!');
} else {
  await conn.execute(
    'INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, sincronizadoCB, lancadoPor, createdAt, updatedAt) VALUES (?,?,?,?,?,?,?,0,0,0,0,0,0,?,NOW(),NOW())',
    [tenantId, empresaSlug, '2026-04-01', servicos, pacotes, produtos, caixinha, 'avec-rel0184-correcao']
  );
  console.log('\n✅ INSERIDO com sucesso!');
}

// Verificar resultado final
const [final] = await conn.execute(
  'SELECT cat1, cat2, cat3, cat4, cat9, lancadoPor FROM faturamentos WHERE empresaSlug=? AND data=? AND tenantId=?',
  [empresaSlug, '2026-04-01', tenantId]
);
const f = final[0];
const total = parseFloat(f.cat1) + parseFloat(f.cat2) + parseFloat(f.cat3) + parseFloat(f.cat4);
console.log('\n📊 RESULTADO FINAL 01/04:');
console.log('  Serviços (cat1):    R$', f.cat1);
console.log('  Pacotes (cat2):     R$', f.cat2);
console.log('  Produtos (cat3):    R$', f.cat3);
console.log('  Caixinha (cat4):    R$', f.cat4);
console.log('  Recorrência (cat9): R$', f.cat9);
console.log('  TOTAL:              R$', total.toFixed(2));

await conn.end();
