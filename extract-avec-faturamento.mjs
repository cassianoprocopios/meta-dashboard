import { extrairFaturamentoAvec, fecharBrowserAvec } from "./server/avecFaturamentoScraper.ts";

async function extrairFaturamento() {
  console.log("🔄 Iniciando extração de faturamento do Avec...\n");

  try {
    // Extrair faturamento do dia 28 de maio de 2026
    const resultado = await extrairFaturamentoAvec(
      "seraphinebeauty24@gmail.com",
      "2@Seraphine",
      28,
      5,
      2026
    );

    console.log("\n📊 Resultado da Extração:");
    console.log("========================");
    console.log(`Unidade: ${resultado.unidade}`);
    console.log(`Data: ${resultado.data}`);
    console.log(`Sucesso: ${resultado.sucesso ? "✅ Sim" : "❌ Não"}`);

    if (resultado.mensagem) {
      console.log(`Mensagem: ${resultado.mensagem}`);
    }

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
    console.log("\n✨ Extração concluída!");
  }
}

extrairFaturamento().catch(console.error);
