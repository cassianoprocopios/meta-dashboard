import { getDb } from './db';
import { faturamentos, InsertFaturamento } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function lancamentoSeraphine() {
  const db = await getDb();
  
  if (!db) {
    console.error('❌ Erro: Não foi possível conectar ao banco de dados');
    process.exit(1);
  }
  
  console.log('=== LANÇAMENTO DE FATURAMENTO - SERAPHINE ===\n');
  
  const data = '2026-04-29'; // Data de hoje
  const empresaSlug = 'seraphine';
  const tenantId = 1; // Ajuste conforme necessário
  
  // Dados do faturamento de hoje da Seraphine (puxado do avec)
  const faturamento = {
    dinheiro: 252.00,
    cartaoCredito: 2035.00,
    cartaoDebito: 479.00,
    transferencia: 300.00,
    pix: 501.00,
    dividas: -43.00,
    total: 3315.00
  };
  
  console.log(`Data: ${data}`);
  console.log(`Empresa: ${empresaSlug}`);
  console.log(`Total a lançar: R$ ${faturamento.total.toFixed(2)}`);
  console.log('\nDetalhamento:');
  console.log(`  - Dinheiro: R$ ${faturamento.dinheiro.toFixed(2)}`);
  console.log(`  - Cartão Crédito: R$ ${faturamento.cartaoCredito.toFixed(2)}`);
  console.log(`  - Cartão Débito: R$ ${faturamento.cartaoDebito.toFixed(2)}`);
  console.log(`  - Transferência: R$ ${faturamento.transferencia.toFixed(2)}`);
  console.log(`  - Pix: R$ ${faturamento.pix.toFixed(2)}`);
  console.log(`  - Dívidas: R$ ${faturamento.dividas.toFixed(2)}`);
  
  try {
    // Inserir lançamento no banco de dados
    const newFaturamento: InsertFaturamento = {
      tenantId,
      empresaSlug,
      data,
      cat1: faturamento.dinheiro, // Usando cat1 para dinheiro
      cat2: faturamento.cartaoCredito, // Usando cat2 para cartão crédito
      cat3: faturamento.cartaoDebito, // Usando cat3 para cartão débito
      cat4: faturamento.transferencia, // Usando cat4 para transferência
      cat5: faturamento.pix, // Usando cat5 para pix
      cat6: faturamento.dividas, // Usando cat6 para dívidas
      lancadoPor: 'Sistema Automático',
      observacao: 'Faturamento puxado do système avec em 29/04/2026'
    };
    
    const result = await db.insert(faturamentos).values(newFaturamento);
    
    console.log('\n✅ Lançamento realizado com sucesso!');
    console.log(`Resultado: ${JSON.stringify(result)}`);
    
    // Consultar o lançamento inserido
    const inserted = await db
      .select()
      .from(faturamentos)
      .where(and(
        eq(faturamentos.data, data),
        eq(faturamentos.empresaSlug, empresaSlug)
      ));
    
    console.log('\nDados inseridos no banco:');
    console.log(JSON.stringify(inserted, null, 2));
    
  } catch (error) {
    console.error('❌ Erro ao lançar faturamento:', error);
  }
  
  process.exit(0);
}

lancamentoSeraphine().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
