import { getDb } from "./server/db";
import { faturamentos } from "./drizzle/schema";
import { eq } from "drizzle-orm";

async function fixSlugs() {
  const db = await getDb();
  if (!db) {
    console.log("❌ Database not available");
    return;
  }

  const mapping: Record<string, string> = {
    "MASCOTE": "barbiero-mascote",
    "MORUMBI": "barbiero-morumbi",
    "SERAPHINE": "barbiero-seraphine",
  };

  for (const [oldSlug, newSlug] of Object.entries(mapping)) {
    const result = await db
      .update(faturamentos)
      .set({ empresaSlug: newSlug })
      .where(eq(faturamentos.empresaSlug, oldSlug));
    
    console.log(`✅ Atualizado ${oldSlug} → ${newSlug}`);
  }

  console.log("\n✅ Slugs corrigidos com sucesso!");
}

fixSlugs().catch(console.error);
