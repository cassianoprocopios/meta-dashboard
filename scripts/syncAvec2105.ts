/**
 * Script manual para sincronizar o faturamento do dia 21/05/2026 da Seraphine via Avec.
 * Executar com: npx tsx scripts/syncAvec2105.ts
 */
import { sincronizarFaturamentoAvecPorData } from "../server/avecSincronizador";

const TENANT_ID = 1;
const EMPRESA_SLUG = "barbiero-seraphine";
const DATA_INICIO = "2026-05-21";
const DATA_FIM = "2026-05-21";

async function main() {
  console.log(`\n[Sync Avec Manual] Iniciando sync de ${EMPRESA_SLUG} para ${DATA_INICIO}...`);
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(
      TENANT_ID,
      EMPRESA_SLUG,
      DATA_INICIO,
      DATA_FIM
    );
    console.log("\n[Sync Avec Manual] Resultado:");
    console.log(JSON.stringify(resultado, null, 2));
    if (resultado.detalhes && resultado.detalhes.length > 0) {
      const dia = resultado.detalhes[0];
      console.log(`\n✅ Dia ${DATA_INICIO}: total = R$ ${dia.total?.toFixed(2) ?? "0.00"}`);
      console.log(`   Mensagem: ${dia.mensagem}`);
    }
  } catch (err) {
    console.error("[Sync Avec Manual] Erro:", err);
    process.exit(1);
  }
  process.exit(0);
}

main();
