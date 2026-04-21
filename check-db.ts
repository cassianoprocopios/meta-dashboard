import { getDb } from "./server/db";

async function checkDb() {
  const db = await getDb();
  if (!db) {
    console.error("Não foi possível conectar ao banco de dados");
    process.exit(1);
  }

  const { faturamentos } = await import("./drizzle/schema");
  const { eq, like, and } = await import("drizzle-orm");

  try {
    // Verificar registros do dia 21 para Seraphine
    const rows = await db
      .select()
      .from(faturamentos)
      .where(
        and(
          eq(faturamentos.empresaSlug, "SERAPHINE"),
          like(faturamentos.data, "2026-04-21%")
        )
      )
      .orderBy(faturamentos.data);

    console.log("Registros do dia 21 para Seraphine:");

    if (rows.length === 0) {
      console.log("❌ Nenhum registro encontrado para 21/04/2026");
    } else {
      console.log(`✅ ${rows.length} registro(s) encontrado(s)`);
      rows.forEach((r: any) => {
        const total =
          parseFloat(r.cat1 || 0) +
          parseFloat(r.cat2 || 0) +
          parseFloat(r.cat3 || 0) +
          parseFloat(r.cat4 || 0) +
          parseFloat(r.cat9 || 0);
        console.log(`  Data: ${r.data}`);
        console.log(`  Total: R$${total.toFixed(2)}`);
        console.log(`  cat1 (Serviços): ${r.cat1}`);
        console.log(`  cat2 (Pacotes): ${r.cat2}`);
        console.log(`  cat3 (Produtos): ${r.cat3}`);
        console.log(`  cat4 (Caixinha): ${r.cat4}`);
        console.log(`  cat9 (Recorrência): ${r.cat9}`);
        console.log(`  lancadoPor: ${r.lancadoPor}`);
        console.log("---");
      });
    }
  } catch (e) {
    console.error("Erro:", e);
  }
}

checkDb();
