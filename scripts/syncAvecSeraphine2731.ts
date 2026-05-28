/**
 * Script para sincronizar os últimos dias de maio (27-31) apenas da Seraphine.
 * Executar com: npx tsx scripts/syncAvecSeraphine2731.ts
 */
import { sincronizarFaturamentoAvecPorData } from "../server/avecSincronizador";

const TENANT_ID = 1;
const EMPRESA = "barbiero-seraphine";
const DATA_INICIO = "2026-05-27";
const DATA_FIM = "2026-05-31";

async function main() {
  console.log(`\n[Sync Avec Seraphine] Sincronizando ${EMPRESA} para ${DATA_INICIO} a ${DATA_FIM}...`);
  
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(
      TENANT_ID,
      EMPRESA,
      DATA_INICIO,
      DATA_FIM
    );
    
    console.log(`\n[Sync Avec Seraphine] Resultado:`);
    console.log(`  Dias sincronizados: ${resultado.diasSincronizados}`);
    console.log(`  Dias ignorados: ${resultado.diasIgnorados}`);
    console.log(`  Dias fechados: ${resultado.diasFechados}`);
    
    if (resultado.detalhes && resultado.detalhes.length > 0) {
      let totalPeriodo = 0;
      console.log(`\n[Sync Avec Seraphine] Detalhes por dia:`);
      resultado.detalhes.forEach((dia: any) => {
        if (dia.total) {
          console.log(`  ${dia.data}: R$ ${dia.total.toFixed(2)} - ${dia.mensagem}`);
          totalPeriodo += dia.total;
        }
      });
      console.log(`\n  📊 Total do período (27-31/05): R$ ${totalPeriodo.toFixed(2)}`);
    }
    
    if (resultado.erros) {
      console.error(`  ❌ Erro: ${resultado.erros}`);
    } else {
      console.log(`\n✅ Sincronização concluída com sucesso!`);
    }
  } catch (err) {
    console.error(`[Sync Avec Seraphine] Erro:`, err);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
