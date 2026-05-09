import { getDb } from './server/db';
import { faturamentoColaboradores, colaboradores } from './drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.log('no db'); process.exit(1); }

  const rows = await db.select({
    colaboradorId: faturamentoColaboradores.colaboradorId,
    totalServicos: faturamentoColaboradores.totalServicos,
    totalProdutos: faturamentoColaboradores.totalProdutos,
    totalGeral: faturamentoColaboradores.totalGeral,
    detalhesServicos: faturamentoColaboradores.detalhesServicos,
    detalhesProdutos: faturamentoColaboradores.detalhesProdutos,
  }).from(faturamentoColaboradores)
    .where(and(eq(faturamentoColaboradores.mes, 5), eq(faturamentoColaboradores.ano, 2026)));

  // Buscar nomes dos colaboradores
  const cols = await db.select({ id: colaboradores.id, nome: colaboradores.nome }).from(colaboradores);
  const nomeMap = new Map(cols.map(c => [c.id, c.nome]));

  console.log('=== ANÁLISE DE TOTAIS - MAIO 2026 ===\n');
  
  let totalGeralBanco = 0;
  let totalGeralCalculado = 0;

  for (const r of rows) {
    const servicos: Array<{ser_nome: string; sum: number; count: number}> = r.detalhesServicos ? JSON.parse(r.detalhesServicos as string) : [];
    const produtos: Array<{pro_nome: string; sum: number; count: number}> = r.detalhesProdutos ? JSON.parse(r.detalhesProdutos as string) : [];
    
    const totalServCalc = servicos.reduce((a, s) => a + Number(s.sum), 0);
    const totalProdCalc = produtos.reduce((a, p) => a + Number(p.sum), 0);
    const totalGeralCalc = totalServCalc + totalProdCalc;
    
    const totalBanco = Number(r.totalGeral);
    const nome = nomeMap.get(r.colaboradorId) || `ID ${r.colaboradorId}`;
    
    totalGeralBanco += totalBanco;
    totalGeralCalculado += totalGeralCalc;
    
    if (Math.abs(totalBanco - totalGeralCalc) > 1) {
      console.log(`⚠️  DIVERGÊNCIA - ${nome}:`);
      console.log(`   Banco: R$ ${totalBanco.toFixed(2)} | Calculado dos detalhes: R$ ${totalGeralCalc.toFixed(2)}`);
    }
    
    console.log(`\n📊 ${nome} (ID: ${r.colaboradorId})`);
    console.log(`   Total Banco: R$ ${totalBanco.toFixed(2)} (serv: R$ ${Number(r.totalServicos).toFixed(2)}, prod: R$ ${Number(r.totalProdutos).toFixed(2)})`);
    console.log(`   Total Calc:  R$ ${totalGeralCalc.toFixed(2)} (serv: R$ ${totalServCalc.toFixed(2)}, prod: R$ ${totalProdCalc.toFixed(2)})`);
    
    if (servicos.length > 0) {
      console.log(`   Serviços (${servicos.length} itens):`);
      servicos.sort((a, b) => Number(b.sum) - Number(a.sum)).forEach(s => {
        console.log(`     - "${s.ser_nome}": R$ ${Number(s.sum).toFixed(2)} (qtd: ${s.count})`);
      });
    }
    if (produtos.length > 0) {
      console.log(`   Produtos (${produtos.length} itens):`);
      produtos.sort((a, b) => Number(b.sum) - Number(a.sum)).forEach(p => {
        console.log(`     - "${p.pro_nome}": R$ ${Number(p.sum).toFixed(2)} (qtd: ${p.count})`);
      });
    }
  }
  
  console.log(`\n=== TOTAIS GERAIS ===`);
  console.log(`Total banco: R$ ${totalGeralBanco.toFixed(2)}`);
  console.log(`Total calculado dos detalhes: R$ ${totalGeralCalculado.toFixed(2)}`);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
