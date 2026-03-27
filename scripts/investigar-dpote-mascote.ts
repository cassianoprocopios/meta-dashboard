/**
 * Script para investigar o Dpote da Mascote em março/2026
 * e identificar por que a recorrência está divergindo
 *
 * Executar: npx tsx scripts/investigar-dpote-mascote.ts
 */
import "dotenv/config";
import {
  cashbarberLogin,
  cashbarberCalcularDpotePorFichas,
  cashbarberBuscarValorAssinaturas,
  cashbarberCriarHistoricoDpote,
} from "../server/cashbarber";
import { getCashbarberConfig, getDpoteHistoricoId } from "../server/db";

async function main() {
  const tenantId = 1;
  const empresaSlug = "MASCOTE";
  const mes = 3;
  const ano = 2026;

  const config = await getCashbarberConfig(tenantId, empresaSlug);
  if (!config || !config.cbEmail || !config.cbSenha) {
    console.error("Config não encontrada");
    process.exit(1);
  }

  console.log("=== INVESTIGAÇÃO DPOTE MASCOTE - MARÇO/2026 ===\n");

  // Login
  const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
  console.log("Login OK\n");

  // Buscar histórico salvo
  const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
  const historicoIdSalvo = await getDpoteHistoricoId(tenantId, empresaSlug, mesSigla);
  console.log(`Histórico Dpote salvo para ${mesSigla}: #${historicoIdSalvo ?? "nenhum"}`);

  // Buscar valor de assinaturas do histórico salvo
  if (historicoIdSalvo) {
    const dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
    console.log(`\nDados do histórico #${historicoIdSalvo}:`);
    console.log(`  valorAssinaturas: R$ ${dadosApi?.valorAssinaturas ?? "null"}`);
    console.log(`  porcentagemBarbearia: ${dadosApi?.porcentagemBarbearia ?? "null"}%`);
  }

  // Criar novo histórico para comparar
  console.log("\nCriando novo histórico para comparar...");
  const novoHistoricoId = await cashbarberCriarHistoricoDpote(token);
  console.log(`Novo histórico criado: #${novoHistoricoId}`);

  // Aguardar processamento
  await new Promise(resolve => setTimeout(resolve, 3000));

  const dadosNovo = await cashbarberBuscarValorAssinaturas(token, novoHistoricoId);
  console.log(`\nDados do novo histórico #${novoHistoricoId}:`);
  console.log(`  valorAssinaturas: R$ ${dadosNovo?.valorAssinaturas ?? "null"}`);
  console.log(`  porcentagemBarbearia: ${dadosNovo?.porcentagemBarbearia ?? "null"}%`);

  // Calcular distribuição por fichas para o mês completo
  const dataInicial = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const dataFinal = `${ano}-${String(mes).padStart(2, "0")}-27`; // até hoje

  if (dadosNovo?.valorAssinaturas) {
    console.log(`\n=== DISTRIBUIÇÃO POR FICHAS (${dataInicial} a ${dataFinal}) ===`);
    console.log(`Valor total assinaturas: R$ ${dadosNovo.valorAssinaturas}`);

    const resultados = await cashbarberCalcularDpotePorFichas(
      token,
      dataInicial,
      dataFinal,
      dadosNovo.valorAssinaturas,
      100
    );

    console.log("\nDistribuição por filial:");
    let totalDistribuido = 0;
    for (const r of resultados) {
      console.log(`  ${r.filialNome}: R$ ${r.valorDistribuido.toFixed(2)} (${r.percentual?.toFixed(2) ?? "?"}%)`);
      totalDistribuido += r.valorDistribuido;
    }
    console.log(`\nTotal distribuído: R$ ${totalDistribuido.toFixed(2)}`);

    // Encontrar Mascote
    const mascote = resultados.find(r => r.filialNome?.toLowerCase().includes("mascote"));
    if (mascote) {
      const totalDias = 31; // março tem 31 dias
      const valorDiario = mascote.valorDistribuido / totalDias;
      const valorMes = mascote.valorDistribuido;
      console.log(`\n=== MASCOTE ===`);
      console.log(`  Valor total mês: R$ ${valorMes.toFixed(2)}`);
      console.log(`  Valor diário (÷31): R$ ${valorDiario.toFixed(2)}`);
      console.log(`  Total 27 dias (até hoje): R$ ${(valorDiario * 27).toFixed(2)}`);
      console.log(`\n  Valor esperado pelo usuário: R$ 46.366,14`);
      console.log(`  Diferença: R$ ${(46366.14 - valorMes).toFixed(2)}`);
    }
  }

  // Verificar o valor atual no banco
  const { db } = await import("../server/db");
  const { faturamentos } = await import("../drizzle/schema");
  const { sql } = await import("drizzle-orm");

  const rows = await db.execute(sql`
    SELECT 
      SUM(cat9) as total_recorrencia,
      COUNT(*) as dias
    FROM faturamentos
    WHERE empresaSlug = 'MASCOTE'
      AND data LIKE '2026-03-%'
      AND cat9 > 0
  `);
  console.log(`\n=== BANCO DE DADOS ===`);
  console.log(`Recorrência total no banco (cat9): R$ ${parseFloat(rows.rows[0]?.total_recorrencia ?? 0).toFixed(2)}`);
  console.log(`Dias com cat9 > 0: ${rows.rows[0]?.dias}`);

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
