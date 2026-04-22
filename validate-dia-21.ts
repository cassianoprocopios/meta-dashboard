import { db } from "./server/db";

async function validate() {
  console.log("\n=== VALIDANDO DADOS DO DIA 21/04/2026 ===\n");
  
  try {
    const faturamentos = await db.query.faturamentos.findMany({
      where: (table, { eq, and }) => and(
        eq(table.data, '2026-04-21'),
        eq(table.empresaSlug, 'SERAPHINE')
      )
    });
    
    console.log(`Total de registros encontrados: ${faturamentos.length}`);
    
    if (faturamentos.length === 0) {
      console.log("✗ Nenhum registro encontrado para 21/04/2026 SERAPHINE");
    } else {
      faturamentos.forEach(f => {
        const total = (f.cat1 || 0) + (f.cat2 || 0) + (f.cat3 || 0) + (f.cat4 || 0);
        console.log(`\n✓ Encontrado:`);
        console.log(`  Data: ${f.data}`);
        console.log(`  Serviços (cat1): R$${f.cat1}`);
        console.log(`  Pacotes (cat2): R$${f.cat2}`);
        console.log(`  Produtos (cat3): R$${f.cat3}`);
        console.log(`  Caixinha (cat4): R$${f.cat4}`);
        console.log(`  TOTAL: R$${total}`);
        console.log(`  Esperado: R$6.090,00`);
        console.log(`  Status: ${total === 6090 ? '✓ CORRETO' : '✗ INCORRETO'}`);
      });
    }
  } catch (e) {
    console.error("✗ Erro:", e instanceof Error ? e.message : String(e));
  }
  
  process.exit(0);
}

validate();
