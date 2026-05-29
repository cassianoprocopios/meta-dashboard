import { extrairFaturamentoAvecDebug, fecharBrowserAvec } from "./server/avecFaturamentoScraperV2.ts";

async function debugAvec() {
  console.log("🔍 Iniciando debug do Avec...\n");

  try {
    const resultado = await extrairFaturamentoAvecDebug(
      "seraphinebeauty24@gmail.com",
      "2@Seraphine",
      28,
      5,
      2026
    );

    console.log("\n📊 Resultado do Debug:");
    console.log("====================");
    console.log(`Sucesso: ${resultado.sucesso ? "✅" : "❌"}`);
    console.log(`Mensagem: ${resultado.mensagem}`);

    if (resultado.debugInfo) {
      console.log("\n🔧 Informações de Debug:");
      console.log(JSON.stringify(resultado.debugInfo, null, 2));
    }

    console.log("\n📸 Screenshots salvos em:");
    console.log("  - /tmp/avec-login.png");
    console.log("  - /tmp/avec-estrutura.png");
  } catch (erro) {
    console.error("❌ Erro:", erro);
  } finally {
    await fecharBrowserAvec();
    console.log("\n✨ Debug concluído!");
  }
}

debugAvec().catch(console.error);
