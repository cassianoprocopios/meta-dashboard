import { getDb } from "./server/db";
import { faturamentos } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const allRows = await db
    .select()
    .from(faturamentos)
    .limit(1000);

  console.log(`\n📊 Total de registros no banco: ${allRows.length}`);
  
  // Agrupar por mês/ano
  const grouped: Record<string, any[]> = {};
  allRows.forEach(row => {
    const key = row.data.substring(0, 7); // YYYY-MM
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  });

  console.log("\n📅 Registros por mês:");
  Object.keys(grouped).sort().forEach(key => {
    console.log(`  ${key}: ${grouped[key].length} registros`);
  });

  // Verificar dados de abril/2026
  console.log("\n🔍 Dados de abril/2026:");
  const aprilRows = allRows.filter(r => r.data.startsWith("2026-04"));
  console.log(`  Total: ${aprilRows.length} registros`);
  
  // Agrupar por empresa
  const byEmpresa: Record<string, any[]> = {};
  aprilRows.forEach(row => {
    if (!byEmpresa[row.empresaSlug]) byEmpresa[row.empresaSlug] = [];
    byEmpresa[row.empresaSlug].push(row);
  });

  Object.keys(byEmpresa).sort().forEach(slug => {
    const rows = byEmpresa[slug];
    const total = rows.reduce((sum, r) => {
      const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
      return sum + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
    }, 0);
    console.log(`  ${slug}: ${rows.length} registros, total R$ ${total.toFixed(2)}`);
    rows.slice(0, 3).forEach(r => {
      const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
      const dayTotal = cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
      console.log(`    ${r.data}: R$ ${dayTotal.toFixed(2)}`);
    });
  });
}

checkData().catch(console.error);
