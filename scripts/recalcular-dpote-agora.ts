/**
 * Script para disparar o recálculo do Dpote imediatamente com o histórico #68704
 * Executar: npx tsx scripts/recalcular-dpote-agora.ts
 */
import "dotenv/config";
import { aplicarDpoteParaTenant } from "../server/cashbarberSincronizador";
import { getDb } from "../server/db";
import { tenants } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  const allTenants = await db.select().from(tenants).limit(1);
  const tenantId = allTenants[0].id;

  const hoje = new Date();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();

  console.log(`\nRecalculando Dpote para tenant ${tenantId} (${mes}/${ano})...`);
  
  const resultado = await aplicarDpoteParaTenant(tenantId, mes, ano);
  
  console.log("\n=== RESULTADO ===");
  for (const r of resultado.aplicados) {
    console.log(`${r.empresaSlug} (${r.filialNome}): R$ ${r.valorDistribuido.toFixed(2)} total`);
  }
  
  if (resultado.naoEncontrados.length > 0) {
    console.warn("Não encontrados:", resultado.naoEncontrados);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
