import { getDb } from "./server/db";
import { faturamentos } from "./drizzle/schema";

async function verifyAprilData() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const aprilRows = await db
    .select()
    .from(faturamentos)
    .limit(1000);

  const april2026 = aprilRows.filter(r => r.data.startsWith("2026-04"));

  console.log("\n📊 Dados de Abril 2026:");
  console.log(`Total de registros: ${april2026.length}`);

  // Agrupar por empresa
  const byEmpresa: Record<string, any[]> = {};
  april2026.forEach(row => {
    if (!byEmpresa[row.empresaSlug]) byEmpresa[row.empresaSlug] = [];
    byEmpresa[row.empresaSlug].push(row);
  });

  Object.keys(byEmpresa).sort().forEach(slug => {
    const rows = byEmpresa[slug];
    const total = rows.reduce((sum, r) => {
      const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
      return sum + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
    }, 0);
    console.log(`\n${slug}:`);
    console.log(`  Registros: ${rows.length}`);
    console.log(`  Total: R$ ${total.toFixed(2)}`);
    console.log(`  Primeiros 3 dias:`);
    rows.slice(0, 3).forEach(r => {
      const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
      const dayTotal = cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
      const dia = r.data.split("-")[2];
      console.log(`    ${dia}: R$ ${dayTotal.toFixed(2)}`);
    });
  });
}

verifyAprilData().catch(console.error);
