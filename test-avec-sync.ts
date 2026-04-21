import { sincronizarFaturamentoAvec } from "./server/avecSincronizador";

async function testSync() {
  console.log("[TEST] Iniciando teste de sync do Avec...");
  
  try {
    const resultado = await sincronizarFaturamentoAvec(
      1, // tenantId
      "SERAPHINE", // empresaSlug
      4, // mês (abril)
      2026, // ano
      "manual"
    );
    
    console.log("[TEST] Resultado do sync:");
    console.log(JSON.stringify(resultado, null, 2));
  } catch (e) {
    console.error("[TEST] Erro:", e);
  }
}

testSync();
