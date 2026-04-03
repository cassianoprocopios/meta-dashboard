/**
 * Script para buscar o faturamento da Seraphine do dia 01/04/2026
 * via Relatório 0184 do Avec e atualizar no banco de dados.
 */

import { avecBrowserBuscarRelatorio0184 } from "../server/avecBrowser";
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const email = "seraphinebeauty24@gmail.com";
  const senha = "Dxj4oue@";
  const data = "2026-04-01";

  console.log(`\n🔄 Buscando faturamento da Seraphine para ${data} via Relatório 0184...\n`);

  try {
    const resultado = await avecBrowserBuscarRelatorio0184(email, senha, data);

    console.log("\n📊 Resultado do Relatório 0184:");
    console.log(`   Serviços:  R$ ${resultado.servicos.toFixed(2)}`);
    console.log(`   Pacotes:   R$ ${resultado.pacotes.toFixed(2)}`);
    console.log(`   Produtos:  R$ ${resultado.produtos.toFixed(2)}`);
    console.log(`   Caixinha:  R$ ${resultado.caixinha.toFixed(2)}`);
    console.log(`   ─────────────────────────`);
    console.log(`   TOTAL:     R$ ${resultado.total.toFixed(2)}`);

    if (resultado.total === 0) {
      console.log("\n⚠️  Nenhum dado encontrado para 01/04. Verifique o screenshot em /tmp/avec-rel0184-debug-2026-04-01.png");
      return;
    }

    // Atualizar no banco de dados
    const conn = await createConnection(process.env.DATABASE_URL!);

    // Buscar tenantId da empresa SERAPHINE
    const [empresas] = await conn.execute(
      "SELECT id, tenantId FROM empresas WHERE slug = 'SERAPHINE' LIMIT 1"
    ) as any[];

    if (!empresas.length) {
      console.error("❌ Empresa SERAPHINE não encontrada no banco!");
      await conn.end();
      return;
    }

    const { tenantId } = empresas[0];

    // Verificar se já existe faturamento para 01/04
    const [existente] = await conn.execute(
      "SELECT id, cat1, cat2, cat3, cat4, cat9 FROM faturamentos WHERE empresaSlug = 'seraphine' AND data = '2026-04-01' AND tenantId = ?",
      [tenantId]
    ) as any[];

    console.log("\n📋 Faturamento atual no banco para 01/04:");
    if (existente.length > 0) {
      const fat = existente[0];
      console.log(`   cat1 (Serviços):  R$ ${fat.cat1}`);
      console.log(`   cat2 (Pacotes):   R$ ${fat.cat2}`);
      console.log(`   cat3 (Produtos):  R$ ${fat.cat3}`);
      console.log(`   cat4 (Caixinha):  R$ ${fat.cat4}`);
      console.log(`   cat9 (Recorrência): R$ ${fat.cat9} (preservado)`);

      await conn.execute(
        `UPDATE faturamentos SET 
          cat1 = ?, cat2 = ?, cat3 = ?, cat4 = ?,
          cat5 = 0, cat6 = 0, cat7 = 0, cat8 = 0,
          lancadoPor = 'avec-sync-rel0184',
          updatedAt = NOW()
        WHERE empresaSlug = 'seraphine' AND data = '2026-04-01' AND tenantId = ?`,
        [resultado.servicos, resultado.pacotes, resultado.produtos, resultado.caixinha, tenantId]
      );
      console.log("\n✅ Faturamento de 01/04 atualizado com sucesso!");
    } else {
      await conn.execute(
        `INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, sincronizadoCB, lancadoPor, createdAt, updatedAt)
         VALUES (?, 'seraphine', '2026-04-01', ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 'avec-sync-rel0184', NOW(), NOW())`,
        [tenantId, resultado.servicos, resultado.pacotes, resultado.produtos, resultado.caixinha]
      );
      console.log("\n✅ Faturamento de 01/04 inserido com sucesso!");
    }

    // Verificar resultado final
    const [final] = await conn.execute(
      "SELECT cat1, cat2, cat3, cat4, cat9, lancadoPor FROM faturamentos WHERE empresaSlug = 'seraphine' AND data = '2026-04-01' AND tenantId = ?",
      [tenantId]
    ) as any[];

    if (final.length > 0) {
      const f = final[0];
      console.log("\n📊 Faturamento final no banco para 01/04:");
      console.log(`   Serviços (cat1):    R$ ${f.cat1}`);
      console.log(`   Pacotes (cat2):     R$ ${f.cat2}`);
      console.log(`   Produtos (cat3):    R$ ${f.cat3}`);
      console.log(`   Caixinha (cat4):    R$ ${f.cat4}`);
      console.log(`   Recorrência (cat9): R$ ${f.cat9}`);
      console.log(`   Lançado por: ${f.lancadoPor}`);
    }

    await conn.end();
  } catch (e) {
    console.error("❌ Erro:", e);
  }
}

main();
