/**
 * Script para ressincronizar a Morumbi em março/2026
 * com a lógica corrigida do Dpote (dividido pelos dias realizados)
 *
 * Executar: npx tsx scripts/ressincronizar-morumbi.ts
 */
import "dotenv/config";
import { sincronizarFaturamentoCashbarber } from "../server/cashbarberSincronizador";
import { getDb } from "../server/db";
import { tenants } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  const allTenants = await db.select().from(tenants).limit(1);
  if (allTenants.length === 0) {
    console.error("Nenhum tenant encontrado");
    process.exit(1);
  }
  const tenantId = allTenants[0].id;

  console.log(`\nIniciando ressincronização da Morumbi - Março/2026...`);
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Empresa: MORUMBI`);
  console.log(`Período: 03/2026\n`);

  try {
    const resultado = await sincronizarFaturamentoCashbarber(
      tenantId,
      "MORUMBI",
      3,    // março
      2026,
      "manual"
    );

    console.log(`\n=== RESULTADO DA SINCRONIZAÇÃO ===`);
    console.log(`Dias sincronizados: ${resultado.diasSincronizados}`);
    console.log(`Dias ignorados: ${resultado.diasIgnorados}`);
    console.log(`Recorrência atualizada: ${resultado.recorrenciaAtualizada ? "Sim" : "Não"}`);
    if (resultado.recorrenciaValor) {
      console.log(`Valor recorrência (Dpote total): R$ ${resultado.recorrenciaValor.toFixed(2)}`);
      const hoje = new Date();
      const diasRealizados = hoje.getDate(); // estamos em março/2026
      const valorDiario = resultado.recorrenciaValor / diasRealizados;
      console.log(`Valor diário (÷${diasRealizados} dias): R$ ${valorDiario.toFixed(2)}`);
      console.log(`Total acumulado esperado: R$ ${resultado.recorrenciaValor.toFixed(2)}`);
    }
    if (resultado.erros) {
      console.log(`Erros: ${resultado.erros}`);
    }

    console.log(`\nÚltimos 5 dias sincronizados:`);
    resultado.detalhes
      .filter(d => d.status === "sincronizado")
      .slice(-5)
      .forEach(d => {
        console.log(`  ${d.data}: R$ ${d.totalGeral?.toFixed(2) ?? "0.00"}`);
      });

    console.log(`\nSincronização concluída com sucesso!`);
  } catch (err) {
    console.error("Erro na sincronização:", err);
    process.exit(1);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
