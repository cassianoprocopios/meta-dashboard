import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  uri: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

const categoriasMeta = [
  "Avulso/Clube",
  "Serv. Extra",
  "Auxiliar",
  "Keune",
  "Don Alcides",
  "Caixinha",
  "Barbiero",
  "Bar",
  "Recorrência",
  "Pacote",
  "Estética",
  "Óleo Essencial",
];

const mapeamentos = [
  ["servico_categoria", "13295", "Auxiliar", "cat3"],
  ["servico_categoria", "22518", "AVULSO/CLUBE", "cat1"],
  ["servico_categoria", "28614", "Estética", "cat11"],
  ["servico_categoria", "28267", "Pacote", "cat10"],
  ["servico_categoria", "605", "SERVIÇO EXTRA", "cat2"],
  ["produto_categoria", "607", "Bar", "cat8"],
  ["produto_categoria", "606", "Barbiero", "cat7"],
  ["produto_categoria", "632", "Caixinha", "cat6"],
  ["produto_categoria", "17206", "Keune", "cat4"],
  ["produto_categoria", "29283", "Óleo Essencial", "cat12"],
  ["produto_categoria", "19096", "Don Alcides", "cat5"],
];

await connection.beginTransaction();
try {
  // A Seraphine não participa do CashBarber, inclusive nos jobs automáticos.
  await connection.query(
    `UPDATE cashbarberConfig cfg
     JOIN empresas emp ON emp.tenantId = cfg.tenantId AND emp.slug = cfg.empresaSlug
     SET cfg.ativo = 0, cfg.sincAutoAtiva = 0
     WHERE emp.tipoCategorias = 'seraphine'`
  );

  const [empresas] = await connection.query(
    `SELECT emp.tenantId, emp.slug
     FROM empresas emp
     JOIN cashbarberConfig cfg ON cfg.tenantId = emp.tenantId AND cfg.empresaSlug = emp.slug
     WHERE emp.tipoCategorias <> 'seraphine' AND emp.ativo = 1`
  );

  for (const empresa of empresas) {
    await connection.query(
      `UPDATE empresas SET
         cat1Nome='Avulso/Clube', cat2Nome='Serv. Extra', cat3Nome='Auxiliar',
         cat4Nome='Keune', cat5Nome='Don Alcides', cat6Nome='Caixinha',
         cat7Nome='Barbiero', cat8Nome='Bar', cat9Nome='Recorrência',
         cat10Nome='Pacote', cat11Nome='Estética', cat12Nome='Óleo Essencial'
       WHERE tenantId=? AND slug=?`,
      [empresa.tenantId, empresa.slug]
    );

    for (let i = 0; i < categoriasMeta.length; i++) {
      const ordem = i + 1;
      const nome = categoriasMeta[i];
      const [existentes] = await connection.query(
        `SELECT id FROM categorias WHERE tenantId=? AND empresaSlug=? AND ordem=? ORDER BY id LIMIT 1`,
        [empresa.tenantId, empresa.slug, ordem]
      );
      if (existentes.length) {
        await connection.query(`UPDATE categorias SET nome=?, ativo=1 WHERE id=?`, [nome, existentes[0].id]);
      } else {
        await connection.query(
          `INSERT INTO categorias (tenantId, empresaSlug, nome, ordem, ativo) VALUES (?, ?, ?, ?, 1)`,
          [empresa.tenantId, empresa.slug, nome, ordem]
        );
      }
    }

    for (const [tipo, cbId, cbNome, metaCategoria] of mapeamentos) {
      const [existentes] = await connection.query(
        `SELECT id FROM cashbarberMapeamento
         WHERE tenantId=? AND empresaSlug=? AND tipo=? AND cbId=?
         ORDER BY id LIMIT 1`,
        [empresa.tenantId, empresa.slug, tipo, cbId]
      );
      if (existentes.length) {
        await connection.query(
          `UPDATE cashbarberMapeamento SET cbNome=?, metaCategoria=? WHERE id=?`,
          [cbNome, metaCategoria, existentes[0].id]
        );
      } else {
        await connection.query(
          `INSERT INTO cashbarberMapeamento (tenantId, empresaSlug, tipo, cbId, cbNome, metaCategoria)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [empresa.tenantId, empresa.slug, tipo, cbId, cbNome, metaCategoria]
        );
      }
    }
  }

  await connection.commit();
  console.log(`CashBarber configurado em ${empresas.length} unidade(s); Seraphine desativada.`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
