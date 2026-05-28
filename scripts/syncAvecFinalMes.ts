/**
 * Script para sincronizar os últimos dias de maio (27-31) de todas as três lojas.
 * Executar com: npx tsx scripts/syncAvecFinalMes.ts
 */
import { sincronizarFaturamentoAvecPorData } from "../server/avecSincronizador";

const TENANT_ID = 1;
const EMPRESAS = [
  "barbiero-seraphine",
  "barbiero-morumbi",
  "barbiero-mascote"
];
const DATA_INICIO = "2026-05-27";
const DATA_FIM = "2026-05-31";

async function main() {
  console.log(`\n[Sync Avec Final Mês] Iniciando sync de ${EMPRESAS.length} lojas para ${DATA_INICIO} a ${DATA_FIM}...`);
  
  for (const empresa of EMPRESAS) {
    console.log(`\n[Sync Avec Final Mês] Sincronizando ${empresa}...`);
    try {
      const resultado = await sincronizarFaturamentoAvecPorData(
        TENANT_ID,
        empresa,
        DATA_INICIO,
        DATA_FIM
      );
      
      console.log(`[Sync Avec Final Mês] ${empresa} - Resultado:`);
      console.log(`  Dias sincronizados: ${resultado.diasSincronizados}`);
      console.log(`  Dias ignorados: ${resultado.diasIgnorados}`);
      console.log(`  Dias fechados: ${resultado.diasFechados}`);
      
      if (resultado.detalhes && resultado.detalhes.length > 0) {
        let totalPeriodo = 0;
        resultado.detalhes.forEach((dia: any) => {
          if (dia.total) {
            console.log(`  ${dia.data}: R$ ${dia.total.toFixed(2)} - ${dia.mensagem}`);
            totalPeriodo += dia.total;
          }
        });
        console.log(`  📊 Total do período: R$ ${totalPeriodo.toFixed(2)}`);
      }
      
      if (resultado.erros) {
        console.error(`  ❌ Erro: ${resultado.erros}`);
      }
    } catch (err) {
      console.error(`[Sync Avec Final Mês] Erro ao sincronizar ${empresa}:`, err);
    }
  }
  
  console.log(`\n[Sync Avec Final Mês] Sincronização concluída!`);
  process.exit(0);
}

main();
