/**
 * Script para sincronizar nomes de profissionais do CashBarber
 * Executa: node --loader tsx server/syncProfissionaisScript.ts
 */

import { sincronizarNomesProfissionaisTodosTenant } from "./cashbarberProfissionaisSyncJob";
import { getDb } from "./db";
import { tenants } from "../drizzle/schema";

async function main() {
  try {
    console.log("[Sync Script] Iniciando sincronização de nomes de profissionais...");

    const db = await getDb();
    if (!db) {
      console.error("[Sync Script] Falha ao conectar ao banco de dados");
      process.exit(1);
    }

    // Buscar todos os tenants
    const allTenants = await db.select().from(tenants);
    const tenantIds = allTenants.map((t: any) => t.id);

    console.log(`[Sync Script] Encontrados ${tenantIds.length} tenant(s)`);

    for (const tenantId of tenantIds) {
      console.log(`\n[Sync Script] Sincronizando tenant ${tenantId}...`);

      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();

      const resultado = await sincronizarNomesProfissionaisTodosTenant(tenantId, mes, ano);

      console.log(
        `[Sync Script] Tenant ${tenantId}: ${resultado.totalAtualizados} nomes atualizados, ${resultado.totalErros} erro(s)`
      );
    }

    console.log("\n[Sync Script] Sincronização concluída com sucesso!");
    process.exit(0);
  } catch (erro) {
    console.error("[Sync Script] Erro:", erro);
    process.exit(1);
  }
}

main();
