import { getDb } from "./server/db";
import { faturamentos, empresas } from "./drizzle/schema";

async function checkSlugs() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  // Verificar slugs únicos em faturamentos
  const allFaturamentos = await db
    .select()
    .from(faturamentos)
    .limit(1000);

  const slugsInFaturamentos = new Set(allFaturamentos.map(f => f.empresaSlug));
  console.log("\n📊 Slugs em faturamentos:");
  slugsInFaturamentos.forEach(slug => {
    console.log(`  "${slug}"`);
  });

  // Verificar slugs em empresas
  const allEmpresas = await db
    .select()
    .from(empresas);

  console.log("\n🏢 Slugs em empresas:");
  allEmpresas.forEach(emp => {
    console.log(`  "${emp.slug}"`);
  });

  // Comparar
  console.log("\n🔍 Comparação:");
  slugsInFaturamentos.forEach(slug => {
    const exists = allEmpresas.some(e => e.slug === slug);
    console.log(`  "${slug}": ${exists ? "✅ existe em empresas" : "❌ NÃO existe em empresas"}`);
  });
}

checkSlugs().catch(console.error);
