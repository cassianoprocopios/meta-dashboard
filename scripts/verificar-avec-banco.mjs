/**
 * Verifica o estado das tabelas avecConfig e avecMapeamento no banco.
 * Se não houver mapeamento, insere o mapeamento padrão da Seraphine.
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  // Verificar avecConfig
  const [configs] = await conn.execute("SELECT * FROM avec_config");
  console.log("=== avec_config ===");
  console.log(JSON.stringify(configs, null, 2));

  // Verificar avecMapeamento
  const [mapas] = await conn.execute("SELECT * FROM avec_mapeamento");
  console.log("\n=== avec_mapeamento ===");
  console.log(JSON.stringify(mapas, null, 2));

  if (mapas.length === 0) {
    console.log("\n⚠️  Nenhum mapeamento encontrado! Inserindo mapeamento padrão da Seraphine...");

    // Buscar o config da Seraphine para obter o tenantId
    const config = configs.find(c => c.empresa_slug === "seraphine");
    if (!config) {
      console.error("❌ Config da Seraphine não encontrada!");
      process.exit(1);
    }

    const tenantId = config.tenant_id;
    const empresaSlug = "seraphine";
    const now = new Date().toISOString().slice(0, 19).replace("T", " ");

    // Mapeamento padrão: categorias Avec → cats do Meta Dashboard
    const mapeamentos = [
      { avecCategoria: "Cabelo", metaCategoria: "cat1" },
      { avecCategoria: "Manicure e Pedicure", metaCategoria: "cat2" },
      { avecCategoria: "Sobrancelha", metaCategoria: "cat3" },
      { avecCategoria: "Pacote", metaCategoria: "cat4" },
      { avecCategoria: "Recorrência", metaCategoria: "cat5" },
    ];

    for (const m of mapeamentos) {
      await conn.execute(
        `INSERT INTO avec_mapeamento (tenant_id, empresa_slug, avec_categoria, meta_categoria, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, empresaSlug, m.avecCategoria, m.metaCategoria, now, now]
      );
      console.log(`  ✅ Mapeado: "${m.avecCategoria}" → ${m.metaCategoria}`);
    }

    console.log("\n✅ Mapeamento padrão inserido com sucesso!");
  } else {
    console.log(`\n✅ Mapeamento já existe: ${mapas.length} entradas`);
    mapas.forEach(m => console.log(`  - "${m.avec_categoria}" → ${m.meta_categoria}`));
  }
} finally {
  await conn.end();
}
