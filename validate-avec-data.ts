import { getDb } from "./server/db";

async function validar() {
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

  console.log("[VALIDATE] Dados do Avec - Seraphine - 21/04/2026:");
  if (dados.length === 0) {
    console.log("❌ Nenhum dado encontrado para 21/04/2026");
  } else {
    dados.forEach((d) => {
      const total = (parseFloat(d.cat1 || "0") || 0) + 
                   (parseFloat(d.cat2 || "0") || 0) + 
                   (parseFloat(d.cat3 || "0") || 0) + 
                   (parseFloat(d.cat4 || "0") || 0);
      console.log(`✅ Data: ${d.data}`);
      console.log(`   Serviços (cat1): R$${d.cat1}`);
      console.log(`   Pacotes (cat2): R$${d.cat2}`);
      console.log(`   Produtos (cat3): R$${d.cat3}`);
      console.log(`   Caixinha (cat4): R$${d.cat4}`);
      console.log(`   Total: R$${total.toFixed(2)}`);
      console.log(`   Esperado: R$6090.00`);
      console.log(`   Status: ${total === 6090 ? "✅ CORRETO" : "❌ INCORRETO"}`);
    });
  }

  process.exit(0);
}

validar().catch(console.error);
