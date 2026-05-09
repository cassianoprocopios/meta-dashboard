import { getDb } from './server/db';
import { faturamentoColaboradores } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('no db'); process.exit(1); }

  const rows = await db.select({
    detalhesServicos: faturamentoColaboradores.detalhesServicos,
    detalhesProdutos: faturamentoColaboradores.detalhesProdutos,
  }).from(faturamentoColaboradores)
    .where(and(eq(faturamentoColaboradores.mes, 5), eq(faturamentoColaboradores.ano, 2026)));

  const servMap = new Map<string, number>();
  const prodMap = new Map<string, number>();

  for (const r of rows) {
    if (r.detalhesServicos) {
      const s = JSON.parse(r.detalhesServicos as string);
      s.forEach((i: any) => servMap.set(i.ser_nome, (servMap.get(i.ser_nome) || 0) + Number(i.sum)));
    }
    if (r.detalhesProdutos) {
      const p = JSON.parse(r.detalhesProdutos as string);
      p.forEach((i: any) => prodMap.set(i.pro_nome, (prodMap.get(i.pro_nome) || 0) + Number(i.sum)));
    }
  }

  const servSort = [...servMap.entries()].sort((a, b) => b[1] - a[1]);
  const prodSort = [...prodMap.entries()].sort((a, b) => b[1] - a[1]);

  console.log('=== SERVIÇOS (por valor total) ===');
  servSort.forEach(([n, v]) => console.log(`  "${n}": R$ ${v.toFixed(2)}`));
  console.log('\n=== PRODUTOS (por valor total) ===');
  prodSort.forEach(([n, v]) => console.log(`  "${n}": R$ ${v.toFixed(2)}`));
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
