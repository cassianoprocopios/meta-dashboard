import { createConnection } from 'mysql2/promise';
import { config } from 'dotenv';
config({ path: '/home/ubuntu/meta-dashboard/.env' });

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);

  // 1. Verificar o tenantId e id da empresa SERAPHINE (coluna é 'slug' na tabela empresas)
  const [empresas] = await conn.execute(
    "SELECT id, tenantId, slug, cat1Nome, cat2Nome, cat3Nome, cat4Nome, cat5Nome, cat6Nome, cat7Nome, cat8Nome, cat9Nome FROM empresas WHERE slug = 'SERAPHINE'"
  );
  console.log('Empresa encontrada:', JSON.stringify(empresas, null, 2));

  if (!empresas.length) {
    // Tentar buscar todas as empresas para ver quais existem
    const [todas] = await conn.execute("SELECT id, tenantId, slug, nome FROM empresas LIMIT 20");
    console.log('Empresas disponíveis:', JSON.stringify(todas, null, 2));
    await conn.end();
    return;
  }

  const empresa = empresas[0];
  const { id, tenantId } = empresa;

  // 2. Renomear categorias: cat1=Serviços, cat2=Pacotes, cat3=Produtos, cat4=Caixinha
  await conn.execute(
    `UPDATE empresas SET 
      cat1Nome = 'Serviços', 
      cat2Nome = 'Pacotes', 
      cat3Nome = 'Produtos', 
      cat4Nome = 'Caixinha',
      cat5Nome = '',
      cat6Nome = '',
      cat7Nome = '',
      cat8Nome = ''
    WHERE id = ?`,
    [id]
  );
  console.log('✅ Categorias renomeadas com sucesso!');

  // 3. Verificar se já existe faturamento para 02/04/2026
  // Na tabela faturamentos, a coluna também é 'empresaSlug'
  const [existente] = await conn.execute(
    "SELECT id, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9 FROM faturamentos WHERE empresaSlug = 'SERAPHINE' AND data = '2026-04-02' AND tenantId = ?",
    [tenantId]
  );
  console.log('Faturamento existente:', JSON.stringify(existente, null, 2));

  // 4. Lançar faturamento: Serviços=cat1, Pacotes=cat2, Produtos=cat3, Caixinha=cat4
  // Valores: Serviços R$6.704,00 / Pacotes R$2.518,00 / Produtos R$56,50 / Caixinha R$51,00
  if (existente.length > 0) {
    await conn.execute(
      `UPDATE faturamentos SET 
        cat1 = 6704.00,
        cat2 = 2518.00,
        cat3 = 56.50,
        cat4 = 51.00,
        cat5 = 0,
        cat6 = 0,
        cat7 = 0,
        cat8 = 0,
        lancadoPor = 'Avec - Relatório 0184',
        updatedAt = NOW()
      WHERE empresaSlug = 'SERAPHINE' AND data = '2026-04-02' AND tenantId = ?`,
      [tenantId]
    );
    console.log('✅ Faturamento atualizado para 02/04/2026!');
  } else {
    await conn.execute(
      `INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, sincronizadoCB, lancadoPor, createdAt, updatedAt)
       VALUES (?, 'SERAPHINE', '2026-04-02', 6704.00, 2518.00, 56.50, 51.00, 0, 0, 0, 0, 0, 0, 'Avec - Relatório 0184', NOW(), NOW())`,
      [tenantId]
    );
    console.log('✅ Faturamento inserido para 02/04/2026!');
  }

  // 5. Verificar resultado final
  const [resultado] = await conn.execute(
    "SELECT id, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, lancadoPor FROM faturamentos WHERE empresaSlug = 'SERAPHINE' AND data = '2026-04-02' AND tenantId = ?",
    [tenantId]
  );
  console.log('Resultado final:', JSON.stringify(resultado, null, 2));

  await conn.end();
}

main().catch(console.error);
