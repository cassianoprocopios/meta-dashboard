/**
 * Cria as tabelas avecConfig, avecMapeamento e avecSyncLog no banco de dados
 * e insere os dados iniciais da Seraphine.
 */

import mysql from "mysql2/promise";

// Carregar DATABASE_URL do ambiente (injetado pelo servidor)
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ DATABASE_URL não encontrada no ambiente!");
  process.exit(1);
}

const conn = await mysql.createConnection(dbUrl);

try {
  console.log("Criando tabelas Avec...\n");

  // Criar avecConfig
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS avecConfig (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      empresaSlug VARCHAR(64) NOT NULL,
      avecEmail VARCHAR(255),
      avecSenha VARCHAR(255),
      avecSalaoId VARCHAR(64),
      avecSalaoNome VARCHAR(255),
      ultimaSincronizacao TIMESTAMP NULL,
      statusUltimaSinc VARCHAR(64),
      ativo INT NOT NULL DEFAULT 1,
      sincAutoAtiva INT NOT NULL DEFAULT 0,
      horarioSinc VARCHAR(8),
      avecSessionCookie TEXT,
      cookieConfiguradoEm TIMESTAMP NULL,
      avecApiToken TEXT,
      apiTokenConfiguradoEm TIMESTAMP NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_empresa (tenantId, empresaSlug)
    )
  `);
  console.log("✅ Tabela avecConfig criada");

  // Criar avecMapeamento
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS avecMapeamento (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      empresaSlug VARCHAR(64) NOT NULL,
      avecCategoria VARCHAR(128) NOT NULL,
      metaCategoria VARCHAR(16) NOT NULL,
      createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_tenant_empresa_cat (tenantId, empresaSlug, avecCategoria)
    )
  `);
  console.log("✅ Tabela avecMapeamento criada");

  // Criar avecSyncLog
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS avecSyncLog (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tenantId INT NOT NULL,
      empresaSlug VARCHAR(64) NOT NULL,
      origem VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL,
      mes INT NOT NULL,
      ano INT NOT NULL,
      diasSincronizados INT NOT NULL DEFAULT 0,
      diasIgnorados INT NOT NULL DEFAULT 0,
      erros TEXT,
      executadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("✅ Tabela avecSyncLog criada\n");

  // Verificar se já há config da Seraphine
  const [configs] = await conn.execute("SELECT * FROM avecConfig WHERE empresaSlug = 'seraphine'");
  
  if (configs.length === 0) {
    // Buscar tenantId da Seraphine via tabela empresas
    const [empresas] = await conn.execute("SELECT tenantId FROM empresas WHERE slug = 'seraphine' LIMIT 1");
    const tenantId = empresas.length > 0 ? empresas[0].tenantId : 1;

    await conn.execute(`
      INSERT INTO avecConfig (tenantId, empresaSlug, avecEmail, avecSenha, ativo, sincAutoAtiva)
      VALUES (?, 'seraphine', 'seraphinebeauty24@gmail.com', 'Dxj4oue@', 1, 1)
    `, [tenantId]);
    console.log(`✅ Config da Seraphine inserida (tenantId: ${tenantId})`);
  } else {
    console.log("ℹ️  Config da Seraphine já existe");
    const tenantId = configs[0].tenantId;
    console.log(`   tenantId: ${tenantId}, email: ${configs[0].avecEmail}`);
  }

  // Verificar mapeamento
  const [mapas] = await conn.execute("SELECT * FROM avecMapeamento WHERE empresaSlug = 'seraphine'");
  
  if (mapas.length === 0) {
    const [configs2] = await conn.execute("SELECT tenantId FROM avecConfig WHERE empresaSlug = 'seraphine' LIMIT 1");
    const tenantId = configs2[0].tenantId;

    const mapeamentos = [
      { avecCategoria: "Cabelo", metaCategoria: "cat1" },
      { avecCategoria: "Manicure e Pedicure", metaCategoria: "cat2" },
      { avecCategoria: "Sobrancelha", metaCategoria: "cat3" },
      { avecCategoria: "Pacote", metaCategoria: "cat4" },
      { avecCategoria: "Recorrência", metaCategoria: "cat5" },
    ];

    for (const m of mapeamentos) {
      await conn.execute(
        `INSERT INTO avecMapeamento (tenantId, empresaSlug, avecCategoria, metaCategoria) VALUES (?, 'seraphine', ?, ?)`,
        [tenantId, m.avecCategoria, m.metaCategoria]
      );
      console.log(`✅ Mapeado: "${m.avecCategoria}" → ${m.metaCategoria}`);
    }
  } else {
    console.log(`\nℹ️  Mapeamento já existe: ${mapas.length} entradas`);
    mapas.forEach(m => console.log(`   - "${m.avecCategoria}" → ${m.metaCategoria}`));
  }

  console.log("\n✅ Tudo pronto! O sync Avec deve funcionar agora.");
} finally {
  await conn.end();
}
