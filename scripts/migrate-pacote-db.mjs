import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

async function hasColumn(table, column) {
  const [rows] = await connection.query(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

if (!(await hasColumn("empresas", "cat10Nome"))) {
  await connection.query(`ALTER TABLE empresas ADD COLUMN cat10Nome VARCHAR(64) NOT NULL DEFAULT 'Pacote'`);
  console.log("empresas.cat10Nome criada");
} else {
  console.log("empresas.cat10Nome já existia");
}

if (!(await hasColumn("faturamentos", "cat10"))) {
  await connection.query(`ALTER TABLE faturamentos ADD COLUMN cat10 DECIMAL(12,2) NOT NULL DEFAULT 0`);
  console.log("faturamentos.cat10 criada");
} else {
  console.log("faturamentos.cat10 já existia");
}

await connection.query(`UPDATE empresas SET cat10Nome = 'Pacote' WHERE cat10Nome IS NULL OR cat10Nome = ''`);
const [empresas] = await connection.query(`SELECT tenantId, slug FROM empresas`);
let inserted = 0;
for (const empresa of empresas) {
  const [rows] = await connection.query(
    `SELECT id FROM categorias WHERE tenantId = ? AND empresaSlug = ? AND ordem = 10 LIMIT 1`,
    [empresa.tenantId, empresa.slug]
  );
  if (rows.length === 0) {
    await connection.query(
      `INSERT INTO categorias (tenantId, empresaSlug, nome, ordem, ativo) VALUES (?, ?, 'Pacote', 10, 1)`,
      [empresa.tenantId, empresa.slug]
    );
    inserted++;
  }
}
console.log(`categorias ordem 10 garantidas; novas: ${inserted}`);
await connection.end();
