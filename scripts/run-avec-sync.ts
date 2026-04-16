/**
 * Script para sincronizar manualmente o faturamento do Avec para a Seraphine.
 * Executar com: npx tsx scripts/run-avec-sync.ts
 */
import { sincronizarFaturamentoAvec } from "../server/avecSincronizador";

async function main() {
  console.log("Iniciando sincronização manual do Avec para SERAPHINE - abril/2026...");
  try {
    const resultado = await sincronizarFaturamentoAvec(1, "SERAPHINE", 4, 2026, "manual");
    console.log("\n=== RESULTADO ===");
    console.log(`Sincronizados: ${resultado.diasSincronizados}`);
    console.log(`Fechados: ${resultado.diasFechados}`);
    console.log(`Ignorados: ${resultado.diasIgnorados}`);
    console.log("\nDetalhes por dia:");
    for (const d of resultado.detalhes) {
      console.log(` - ${d.data}: ${d.status} — ${d.mensagem || ""} ${d.total !== undefined ? `(R$ ${d.total})` : ""}`);
    }
  } catch (e) {
    console.error("ERRO na sincronização:", e instanceof Error ? e.message : e);
  }
}

main();
