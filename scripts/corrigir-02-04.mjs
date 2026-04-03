import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/meta-dashboard/.env' });

const conn = await createConnection(process.env.DATABASE_URL);

const empresaSlug = 'SERAPHINE';
const tenantId = 1;

// Valores reais do Avec para 02/04/2026 (lançados manualmente)
const servicos = 6704.00;
const pacotes = 2518.00;
const produtos = 56.50;
const caixinha = 51.00;

await conn.execute(
  'UPDATE faturamentos SET cat1=?, cat2=?, cat3=?, cat4=?, cat5=0, cat6=0, cat7=0, cat8=0, lancadoPor=?, updatedAt=NOW() WHERE empresaSlug=? AND data=? AND tenantId=?',
  [servicos, pacotes, produtos, caixinha, 'avec-rel0184-correcao-manual', empresaSlug, '2026-04-02', tenantId]
);
console.log('✅ Faturamento 02/04 CORRIGIDO!');

const [final] = await conn.execute(
  'SELECT cat1, cat2, cat3, cat4, cat9, lancadoPor FROM faturamentos WHERE empresaSlug=? AND data=? AND tenantId=?',
  [empresaSlug, '2026-04-02', tenantId]
);
const f = final[0];
const total = parseFloat(f.cat1) + parseFloat(f.cat2) + parseFloat(f.cat3) + parseFloat(f.cat4);
console.log('\n📊 RESULTADO FINAL 02/04:');
console.log('  Serviços (cat1):    R$', f.cat1);
console.log('  Pacotes (cat2):     R$', f.cat2);
console.log('  Produtos (cat3):    R$', f.cat3);
console.log('  Caixinha (cat4):    R$', f.cat4);
console.log('  Recorrência (cat9): R$', f.cat9);
console.log('  TOTAL:              R$', total.toFixed(2));
console.log('  Lançado por:', f.lancadoPor);

await conn.end();
