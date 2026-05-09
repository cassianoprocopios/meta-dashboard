import { getDb } from './server/db';
import { faturamentoColaboradores, colaboradores } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('no db'); process.exit(1); }

  const rows = await db.select({
    id: faturamentoColaboradores.colaboradorId,
    totalServicos: faturamentoColaboradores.totalServicos,
    totalGeral: faturamentoColaboradores.totalGeral,
    detalhesServicos: faturamentoColaboradores.detalhesServicos,
    detalhesProdutos: faturamentoColaboradores.detalhesProdutos,
  }).from(faturamentoColaboradores)
    .where(and(eq(faturamentoColaboradores.mes, 5), eq(faturamentoColaboradores.ano, 2026)))
    .limit(10);

  const EXCL = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*m[aá]quina|barba(\s*(completa|simples|na\s*te[sc]oura|na\s*m[aá]quina))?$|pezinho)/i;

  for (const r of rows) {
    const servicos = r.detalhesServicos ? JSON.parse(r.detalhesServicos as string) : [];
    const produtos = r.detalhesProdutos ? JSON.parse(r.detalhesProdutos as string) : [];
    
    const totalServFiltrado = servicos.filter((s: any) => !EXCL.test(s.ser_nome ?? '')).reduce((a: number, s: any) => a + Number(s.sum), 0);
    const totalServBruto = servicos.reduce((a: number, s: any) => a + Number(s.sum), 0);
    const totalProdFiltrado = produtos.reduce((a: number, p: any) => a + Number(p.sum), 0);
    
    const servExcluidos = servicos.filter((s: any) => EXCL.test(s.ser_nome ?? ''));
    
    if (servExcluidos.length > 0) {
      console.log(`\n⚠️  Colaborador ID ${r.id}:`);
      console.log(`   Total no banco: R$ ${Number(r.totalServicos).toFixed(2)} (serviços)`);
      console.log(`   Total bruto calculado: R$ ${totalServBruto.toFixed(2)}`);
      console.log(`   Total filtrado calculado: R$ ${totalServFiltrado.toFixed(2)}`);
      console.log(`   Serviços EXCLUÍDOS que ainda estão nos detalhes:`);
      servExcluidos.forEach((s: any) => console.log(`     - "${s.ser_nome}": R$ ${Number(s.sum).toFixed(2)}`));
    } else {
      console.log(`✅ Colaborador ID ${r.id}: sem serviços básicos nos detalhes (total: R$ ${Number(r.totalServicos).toFixed(2)})`);
    }
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
