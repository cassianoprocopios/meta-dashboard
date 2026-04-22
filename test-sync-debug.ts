import { sincronizarFaturamentoAvecPorData } from "./server/avecSincronizador";

async function test() {
  console.log("\n=== TESTE DE SYNC COM DEBUG ===\n");
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(1, "SERAPHINE", "2026-04-21", "2026-04-21");
    console.log("\n=== RESULTADO ===");
    console.log(JSON.stringify(resultado, null, 2));
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

test();
