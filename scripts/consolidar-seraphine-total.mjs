import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});
await connection.beginTransaction();
try {
  const [empresas] = await connection.query(
    "SELECT tenantId, slug FROM empresas WHERE tipoCategorias = 'seraphine'"
  );
  for (const empresa of empresas) {
    // Preserva o valor histórico: consolida todas as colunas no faturamento total (cat1).
    await connection.query(
      `UPDATE faturamentos
       SET cat1 = COALESCE(cat1, 0) + COALESCE(cat2, 0) + COALESCE(cat3, 0) +
                  COALESCE(cat4, 0) + COALESCE(cat5, 0) + COALESCE(cat6, 0) +
                  COALESCE(cat7, 0) + COALESCE(cat8, 0) + COALESCE(cat9, 0) +
                  COALESCE(cat10, 0),
           cat2 = 0, cat3 = 0, cat4 = 0, cat5 = 0, cat6 = 0,
           cat7 = 0, cat8 = 0, cat9 = 0, cat10 = 0
       WHERE tenantId = ? AND empresaSlug = ?`,
      [empresa.tenantId, empresa.slug]
    );
    await connection.query(
      "UPDATE empresas SET cat1Nome = 'Faturamento total' WHERE tenantId = ? AND slug = ?",
      [empresa.tenantId, empresa.slug]
    );
    // Mantém o histórico das categorias, mas somente Faturamento total fica ativo.
    const [categorias] = await connection.query(
      "SELECT id FROM categorias WHERE tenantId = ? AND empresaSlug = ? ORDER BY ordem, id",
      [empresa.tenantId, empresa.slug]
    );
    if (categorias.length > 0) {
      await connection.query(
        "UPDATE categorias SET nome = 'Faturamento total', ordem = 1, ativo = 1 WHERE id = ?",
        [categorias[0].id]
      );
      if (categorias.length > 1) {
        await connection.query(
          `UPDATE categorias SET ativo = 0 WHERE tenantId = ? AND empresaSlug = ? AND id <> ?`,
          [empresa.tenantId, empresa.slug, categorias[0].id]
        );
      }
    } else {
      await connection.query(
        "INSERT INTO categorias (tenantId, empresaSlug, nome, ordem, ativo) VALUES (?, ?, 'Faturamento total', 1, 1)",
        [empresa.tenantId, empresa.slug]
      );
    }
  }
  await connection.commit();
  console.log(`Seraphine consolidada: ${empresas.length} unidade(s)`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
