import { sincronizarFaturamentoAvecPorData } from "./server/avecSincronizador";

async function sincronizar() {
  console.log("[SYNC] Iniciando sincronização retroativa do dia 21/04/2026...");
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(
      1, // tenantId
      "SERAPHINE",
      "2026-04-21", // dataInicio
      "2026-04-21"  // dataFim
    );
    console.log("[SYNC] Resultado:", resultado);
  } catch (e) {
    console.error("[SYNC] Erro:", e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

sincronizar();
