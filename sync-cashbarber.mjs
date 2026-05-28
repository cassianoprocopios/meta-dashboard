#!/usr/bin/env node

/**
 * Script para sincronizar dados do CashBarber
 * Uso: node sync-cashbarber.mjs [mes] [ano]
 */

import { extrairClientesTodosUnidades, fecharBrowser } from "./server/cashbarberClientesScraper.ts";

async function sincronizar() {
  try {
    const agora = new Date();
    const mes = parseInt(process.argv[2] || String(agora.getMonth() + 1));
    const ano = parseInt(process.argv[3] || String(agora.getFullYear()));

    console.log(`\n🔄 Iniciando sincronização para ${mes}/${ano}...\n`);

    const dados = await extrairClientesTodosUnidades(mes, ano);

    console.log("\n✅ Sincronização concluída!\n");
    console.log("📊 Resultados por unidade:\n");

    let totalGeral = 0;

    Object.entries(dados).forEach(([unidade, dadosUnidade]) => {
      console.log(`  ${unidade}:`);
      console.log(`    • Clientes distintos: ${dadosUnidade.totalClientesDistintos}`);
      console.log(`    • Serviços:`);

      Object.entries(dadosUnidade.clientesPorServico).forEach(([servico, quantidade]) => {
        console.log(`      - ${servico}: ${quantidade}`);
      });

      totalGeral += dadosUnidade.totalClientesDistintos;
      console.log();
    });

    console.log(`📈 Total consolidado: ${totalGeral} clientes distintos\n`);

    await fecharBrowser();
    process.exit(0);
  } catch (erro) {
    console.error("\n❌ Erro durante sincronização:", erro);
    await fecharBrowser();
    process.exit(1);
  }
}

sincronizar();
