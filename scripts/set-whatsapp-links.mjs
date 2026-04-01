import * as mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrada");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);

// 1. Adicionar coluna se não existir
try {
  await connection.execute(
    "ALTER TABLE empresas ADD COLUMN whatsappGrupoLink VARCHAR(512) NULL"
  );
  console.log("✅ Coluna whatsappGrupoLink criada.");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Coluna whatsappGrupoLink já existe.");
  } else {
    throw e;
  }
}

// 2. Atualizar Mascote
const [r1] = await connection.execute(
  "UPDATE empresas SET whatsappGrupoLink = ? WHERE slug = 'MASCOTE' OR slug = 'barbiero-mascote'",
  ["https://chat.whatsapp.com/ETyVMMRlZ1w6efpswJvCMe?mode=gi_t"]
);
console.log(`✅ Mascote atualizado: ${r1.affectedRows} linha(s)`);

// 3. Atualizar Morumbi
const [r2] = await connection.execute(
  "UPDATE empresas SET whatsappGrupoLink = ? WHERE slug = 'MORUMBI' OR slug = 'barbiero-morumbi'",
  ["https://chat.whatsapp.com/LdRv2KV4fiP1oCQ5Dgltqi?mode=gi_t"]
);
console.log(`✅ Morumbi atualizado: ${r2.affectedRows} linha(s)`);

// 4. Verificar resultado
const [rows] = await connection.execute(
  "SELECT slug, nome, whatsappGrupoLink FROM empresas"
);
console.log("\nEstado atual das empresas:");
console.table(rows);

await connection.end();
