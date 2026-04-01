import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const conn = await mysql.createConnection(url);
try {
  await conn.execute("ALTER TABLE empresas ADD COLUMN IF NOT EXISTS whatsappGrupoLink VARCHAR(512) NULL");
  console.log("✅ Coluna whatsappGrupoLink adicionada com sucesso.");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") {
    console.log("ℹ️  Coluna já existe, nada a fazer.");
  } else {
    console.error("Erro:", e.message);
    process.exit(1);
  }
} finally {
  await conn.end();
}
