import { getDb } from "./server/db";

async function comparar() {
  const db = await getDb();
  if (!db) {
    console.error("DB não disponível");
    process.exit(1);
  }

  const { faturamentos } = await import("./drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  // Buscar dados do dia 21/04/2026 para Seraphine
  const dados = await db
    .select()
    .from(faturamentos)
    .where(
      and(
        eq(faturamentos.empresaSlug, "SERAPHINE"),
        eq(faturamentos.data, "2026-04-21")
      )
    );

  console.log("[COMPARE] Dados salvos no dashboard - Seraphine - 21/04/2026:");
  if (dados.length === 0) {
    console.log("❌ Nenhum dado encontrado");
  } else {
    dados.forEach((d) => {
      console.log(`\nData: ${d.data}`);
      console.log(`cat1 (Serviços): ${d.cat1}`);
      console.log(`cat2 (Pacotes): ${d.cat2}`);
      console.log(`cat3 (Produtos): ${d.cat3}`);
      console.log(`cat4 (Caixinha): ${d.cat4}`);
      console.log(`cat9 (Recorrência): ${d.cat9}`);
      
      const total = (parseFloat(d.cat1 || "0") || 0) + 
                   (parseFloat(d.cat2 || "0") || 0) + 
                   (parseFloat(d.cat3 || "0") || 0) + 
                   (parseFloat(d.cat4 || "0") || 0);
      console.log(`\nTotal (cat1+cat2+cat3+cat4): R$${total.toFixed(2)}`);
      console.log(`\n📊 Esperado do Avec: R$6.090,00`);
      console.log(`   Serviços: R$6.060,00`);
      console.log(`   Pacotes: R$0,00`);
      console.log(`   Produtos: R$30,00`);
      console.log(`   Caixinha: R$0,00`);
      
      if (total === 6090) {
        console.log(`\n✅ VALORES CORRETOS`);
      } else {
        console.log(`\n❌ VALORES INCORRETOS - Diferença: R$${(6090 - total).toFixed(2)}`);
      }
    });
  }

  process.exit(0);
}

comparar().catch(console.error);
