import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugTenants() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    // Buscar todos os tenants
    const [tenants] = await connection.query('SELECT id, nome, slug, ativo FROM tenants ORDER BY id');
    console.log(`\n📊 Tenants encontrados: ${tenants.length}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    for (const tenant of tenants) {
      console.log(`\n🏢 ${tenant.nome} (ID: ${tenant.id}, Slug: ${tenant.slug}, Ativo: ${tenant.ativo})`);
      
      // Contar faturamentos
      const [fatCount] = await connection.query(
        'SELECT COUNT(*) as cnt FROM faturamentos WHERE tenantId = ?',
        [tenant.id]
      );
      console.log(`  Faturamentos: ${fatCount[0].cnt}`);
      
      // Contar empresas
      const [empCount] = await connection.query(
        'SELECT COUNT(*) as cnt FROM empresas WHERE tenantId = ?',
        [tenant.id]
      );
      console.log(`  Empresas: ${empCount[0].cnt}`);
      
      // Contar bonificações
      const [bonCount] = await connection.query(
        'SELECT COUNT(*) as cnt FROM bonificacaoHistorico WHERE tenantId = ?',
        [tenant.id]
      );
      console.log(`  Snapshots de Bonificação: ${bonCount[0].cnt}`);
      
      // Listar empresas
      const [empresas] = await connection.query(
        'SELECT DISTINCT empresaSlug FROM faturamentos WHERE tenantId = ? ORDER BY empresaSlug',
        [tenant.id]
      );
      if (empresas.length > 0) {
        console.log(`  Empresas com faturamento: ${empresas.map(e => e.empresaSlug).join(', ')}`);
      }
      
      // Listar meses com faturamento
      const [meses] = await connection.query(
        `SELECT DISTINCT 
          YEAR(STR_TO_DATE(data, '%Y-%m-%d')) as ano,
          MONTH(STR_TO_DATE(data, '%Y-%m-%d')) as mes
         FROM faturamentos 
         WHERE tenantId = ? 
         ORDER BY ano DESC, mes DESC
         LIMIT 5`,
        [tenant.id]
      );
      if (meses.length > 0) {
        console.log(`  Últimos meses com dados: ${meses.map(m => `${m.mes}/${m.ano}`).join(', ')}`);
      }
    }
    
  } finally {
    await connection.end();
  }
}

debugTenants().catch(console.error);
