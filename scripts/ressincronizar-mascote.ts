/**
 * Script para ressincronizar a Mascote em março/2026
 * usando o sincronizador corrigido (com cat5 incluído)
 *
 * Executar: npx tsx scripts/ressincronizar-mascote.ts
 */
import "dotenv/config";
import { sincronizarFaturamentoCashbarber } from "../server/cashbarberSincronizador";
import { getTenantBySlug } from "../server/db";

async function main() {
  // Buscar o tenant ID do owner
  const tenant = await getTenantBySlug("barbiero-grupo");
  if (!tenant) {
    // Tentar buscar pelo primeiro tenant disponível
    const { db } = await import("../server/db");
    const { tenants } = await import("../drizzle/schema");
    const allTenants = await db.select().from(tenants).limit(1);
    if (allTenants.length === 0) {
      console.error("Nenhum tenant encontrado");
      process.exit(1);
    }
    const tenantId = allTenants[0].id;
    console.log(`Usando tenant ID: ${tenantId}`);
    await sincronizarMascote(tenantId);
  } else {
    console.log(`Tenant encontrado: ${tenant.nome} (ID: ${tenant.id})`);
    await sincronizarMascote(tenant.id);
  }
}

async function sincronizarMascote(tenantId: number) {
  console.log(`\nIniciando ressincronização da Mascote - Março/2026...`);
  console.log(`Tenant ID: ${tenantId}`);
  console.log(`Empresa: MASCOTE`);
  console.log(`Período: 03/2026\n`);

  try {
    const resultado = await sincronizarFaturamentoCashbarber(
      tenantId,
      "MASCOTE",
      3,    // março
      2026,
      "manual"
    );

    console.log(`\n=== RESULTADO DA SINCRONIZAÇÃO ===`);
    console.log(`Dias sincronizados: ${resultado.diasSincronizados}`);
    console.log(`Dias ignorados: ${resultado.diasIgnorados}`);
    console.log(`Recorrência atualizada: ${resultado.recorrenciaAtualizada ? "Sim" : "Não"}`);
    if (resultado.recorrenciaValor) {
      console.log(`Valor recorrência: R$ ${resultado.recorrenciaValor.toFixed(2)}`);
    }
    if (resultado.erros) {
      console.log(`Erros: ${resultado.erros}`);
    }

    // Mostrar detalhes dos últimos 5 dias
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
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
