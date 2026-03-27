/**
 * Script para investigar o Dpote da Mascote em março/2026
 * Executar: npx tsx scripts/investigar-dpote2.ts
 */
import "dotenv/config";
import {
  cashbarberLogin,
  cashbarberCalcularDpotePorFichas,
  cashbarberBuscarValorAssinaturas,
} from "../server/cashbarber";
import { getCashbarberConfig, getDpoteHistoricoId } from "../server/db";

async function main() {
  const tenantId = 1;
  const mes = 3;
  const ano = 2026;

  // Buscar config da Mascote
  const config = await getCashbarberConfig(tenantId, "MASCOTE");
  if (!config?.cbEmail || !config?.cbSenha) {
    console.error("Config não encontrada");
    process.exit(1);
  }

  console.log("=== INVESTIGAÇÃO DPOTE MASCOTE - MARÇO/2026 ===\n");

  // Login
  const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
  console.log("Login OK\n");

  // Buscar histórico salvo
  const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
  const historicoIdSalvo = await getDpoteHistoricoId(tenantId, "MASCOTE", mesSigla);
  console.log(`Histórico Dpote salvo: #${historicoIdSalvo ?? "nenhum"}`);

  // Buscar dados do histórico
  if (historicoIdSalvo) {
    const dados = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
    console.log(`Histórico #${historicoIdSalvo}:`);
    console.log(`  valorAssinaturas: R$ ${dados?.valorAssinaturas ?? "null"}`);
    console.log(`  porcentagemBarbearia: ${dados?.porcentagemBarbearia ?? "null"}%`);

    if (dados?.valorAssinaturas) {
      // Calcular distribuição por fichas
      const dataInicial = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const dataFinal = `${ano}-${String(mes).padStart(2, "0")}-27`;

      console.log(`\nCalculando distribuição por fichas (${dataInicial} a ${dataFinal})...`);
      console.log(`Valor total assinaturas: R$ ${dados.valorAssinaturas}`);

      const resultados = await cashbarberCalcularDpotePorFichas(
        token,
        dataInicial,
        dataFinal,
        dados.valorAssinaturas,
        100
      );

      console.log("\nDistribuição por filial:");
      let totalDistribuido = 0;
      for (const r of resultados) {
        console.log(`  ${r.filialNome}: fichas=${r.fichas} | ${r.percentual.toFixed(2)}% | R$ ${r.valorDistribuido.toFixed(2)}`);
        totalDistribuido += r.valorDistribuido;
      }
      console.log(`\nTotal distribuído: R$ ${totalDistribuido.toFixed(2)}`);

      // Encontrar Mascote
      const mascote = resultados.find(r => r.filialNome?.toLowerCase().includes("mascote"));
      if (mascote) {
        const totalDias = 31;
        const valorDiario = mascote.valorDistribuido / totalDias;
        console.log(`\n=== MASCOTE ===`);
        console.log(`  Fichas: ${mascote.fichas}`);
        console.log(`  Percentual: ${mascote.percentual.toFixed(2)}%`);
        console.log(`  Valor total mês: R$ ${mascote.valorDistribuido.toFixed(2)}`);
        console.log(`  Valor diário (÷31): R$ ${valorDiario.toFixed(2)}`);
        console.log(`  Total acumulado 27 dias: R$ ${(valorDiario * 27).toFixed(2)}`);
        console.log(`\n  Valor esperado (total mês): R$ 46.366,14`);
        console.log(`  Diferença: R$ ${(46366.14 - mascote.valorDistribuido).toFixed(2)}`);
        console.log(`\n  Recorrência necessária para bater R$ 78.635,43:`);
        const operacional = 32269.25; // cat1+cat2+cat3+cat4+cat5+cat6+cat7+cat8
        const recorrenciaNecessaria = 78635.43 - operacional;
        console.log(`  Operacional atual: R$ ${operacional.toFixed(2)}`);
        console.log(`  Recorrência necessária: R$ ${recorrenciaNecessaria.toFixed(2)}`);
        console.log(`  Recorrência atual no Dpote: R$ ${mascote.valorDistribuido.toFixed(2)}`);
        console.log(`  Diferença: R$ ${(recorrenciaNecessaria - mascote.valorDistribuido).toFixed(2)}`);
      }
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
