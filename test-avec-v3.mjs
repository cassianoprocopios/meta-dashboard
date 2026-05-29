import { extrairFaturamentoAvecMelhorado, fecharBrowserAvec } from "./server/avecFaturamentoScraperV3.ts";

async function testarAvec() {
  console.log("🔄 Testando scraper v3 do Avec...\n");

  try {
    const resultado = await extrairFaturamentoAvecMelhorado(
      "seraphinebeauty24@gmail.com",
      "2@Seraphine",
      28,
      5,
      2026
    );

    console.log("\n📊 Resultado:");
    console.log("=============");
    console.log(`Sucesso: ${resultado.sucesso ? "✅" : "❌"}`);
    console.log(`Mensagem: ${resultado.mensagem}`);

    if (resultado.faturamento.length > 0) {
      console.log("\n💰 Faturamento:");
      resultado.faturamento.forEach((f) => {
        console.log(`  Data: ${f.data}`);
        console.log(`  Total: R$ ${f.totalFaturamento.toFixed(2)}`);
        console.log(`  Transações: ${f.quantidadeTransacoes}`);
        console.log(`  Ticket Médio: R$ ${f.ticketMedio.toFixed(2)}`);
      });
    }
  } catch (erro) {
    console.error("❌ Erro:", erro);
  } finally {
    await fecharBrowserAvec();
    console.log("\n✨ Teste concluído!");
  }
}

testarAvec().catch(console.error);
