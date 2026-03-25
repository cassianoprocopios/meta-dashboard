/**
 * Script para sincronizar o Dpote (Recorrência/cat5) de março/2026
 * com os dados mais recentes do CashBarber.
 *
 * Uso: node scripts/sync-dpote-marco.mjs
 */

import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// Importar dinamicamente após carregar o .env
const { sincronizarFaturamentoCashbarber } = await import("../server/cashbarberSincronizador.ts");
const { listCashbarberConfigs, getAllTenants } = await import("../server/db.ts");

const MES = 3;
const ANO = 2026;

async function main() {
  console.log(`\n🔄 Sincronizando Dpote — ${ANO}-${String(MES).padStart(2, "0")}\n`);

  const tenants = await getAllTenants();
  if (tenants.length === 0) {
    console.error("❌ Nenhum tenant encontrado.");
    process.exit(1);
  }

  for (const tenant of tenants) {
    console.log(`\n📋 Tenant: ${tenant.nome} (ID: ${tenant.id})`);
    const configs = await listCashbarberConfigs(tenant.id);
    const configsAtivas = configs.filter((c) => c.ativo === 1);

    if (configsAtivas.length === 0) {
      console.log("   ⚠️  Nenhuma empresa com CashBarber ativo.");
      continue;
    }

    for (const config of configsAtivas) {
      console.log(`\n   🏪 Empresa: ${config.empresaSlug}`);
      try {
        const resultado = await sincronizarFaturamentoCashbarber(
          tenant.id,
          config.empresaSlug,
          MES,
          ANO,
          "manual"
        );

        if (resultado.recorrenciaAtualizada) {
          console.log(`   ✅ Recorrência atualizada: R$ ${resultado.recorrenciaValor?.toFixed(2)}`);
          console.log(`   📅 Dias atualizados: ${resultado.diasAtualizados ?? "?"}`);
        } else {
          console.log(`   ℹ️  Recorrência não alterada (valor: R$ ${resultado.recorrenciaValor?.toFixed(2) ?? "0"})`);
        }

        if (resultado.erros) {
          console.log(`   ⚠️  Aviso: ${resultado.erros}`);
        }
      } catch (e) {
        console.error(`   ❌ Erro: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }

  console.log("\n✅ Sincronização concluída.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Erro fatal:", e);
  process.exit(1);
});
