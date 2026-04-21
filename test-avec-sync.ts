import { sincronizarFaturamentoAvec } from "./server/avecSincronizador";

async function testar() {
  console.log("[TEST] Iniciando teste de sync do Avec...");
  try {
    const resultado = await sincronizarFaturamentoAvec(1, "SERAPHINE", 4, 2026, "manual");
    console.log("[TEST] Resultado do sync:");
    console.log(JSON.stringify(resultado, null, 2));
  } catch (e) {
    console.error("[TEST] Erro:", e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

testar();
