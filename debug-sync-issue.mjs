import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugSyncIssue() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    
    console.log(`\n🔍 Investigando problema de sincronização`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // 1. Verificar quantos faturamentos existem por data
    console.log(`\n1️⃣ Distribuição de faturamentos por data (últimos 10 dias):`);
    const [porData] = await connection.query(
      `SELECT data, COUNT(*) as qtd, SUM(cat1 + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0) + COALESCE(cat6,0) + COALESCE(cat7,0) + COALESCE(cat8,0) + COALESCE(cat9,0)) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data >= '2026-04-20'
       GROUP BY data
       ORDER BY data DESC`,
      [tenantId]
    );
    
    porData.forEach(d => {
      console.log(`  ${d.data}: ${d.qtd} registros, Total R$ ${parseFloat(d.total || 0).toFixed(2)}`);
    });
    
    // 2. Verificar faturamentos por empresa
    console.log(`\n2️⃣ Distribuição de faturamentos por empresa (últimos 10 dias):`);
    const [porEmpresa] = await connection.query(
      `SELECT empresaSlug, COUNT(*) as qtd, SUM(cat1 + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0) + COALESCE(cat6,0) + COALESCE(cat7,0) + COALESCE(cat8,0) + COALESCE(cat9,0)) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data >= '2026-04-20'
       GROUP BY empresaSlug
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    porEmpresa.forEach(e => {
      console.log(`  ${e.empresaSlug}: ${e.qtd} registros, Total R$ ${parseFloat(e.total || 0).toFixed(2)}`);
    });
    
    // 3. Verificar se há registros duplicados ou com datas estranhas
    console.log(`\n3️⃣ Verificando registros de Mascote e Morumbi:`);
    const [mascote] = await connection.query(
      `SELECT data, COUNT(*) as qtd FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = 'MASCOTE'
       GROUP BY data
       ORDER BY data DESC
       LIMIT 5`,
      [tenantId]
    );
    
    console.log(`  MASCOTE (últimas 5 datas):`);
    mascote.forEach(m => console.log(`    ${m.data}: ${m.qtd} registros`));
    
    const [morumbi] = await connection.query(
      `SELECT data, COUNT(*) as qtd FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = 'MORUMBI'
       GROUP BY data
       ORDER BY data DESC
       LIMIT 5`,
      [tenantId]
    );
    
    console.log(`  MORUMBI (últimas 5 datas):`);
    morumbi.forEach(m => console.log(`    ${m.data}: ${m.qtd} registros`));
    
    // 4. Verificar se há dados de MASCOTE em 27/4
    console.log(`\n4️⃣ Verificando se MASCOTE tem log de sincronização em 27/4:`);
    const [mascoteLog] = await connection.query(
      `SELECT * FROM cashbarberSyncLog 
       WHERE tenantId = ? AND empresaSlug = 'MASCOTE' AND mes = 4 AND ano = 2026
       ORDER BY executadoEm DESC
       LIMIT 5`,
      [tenantId]
    );
    
    if (mascoteLog.length === 0) {
      console.log(`  ⚠️ Nenhum log de sincronização para MASCOTE em abril!`);
    } else {
      mascoteLog.forEach(log => {
        console.log(`  ${log.executadoEm}: ${log.diasSincronizados} dias, Status: ${log.status}`);
      });
    }
    
    // 5. Verificar se há faturamentos de 27/4 para SERAPHINE (para comparação)
    console.log(`\n5️⃣ Verificando faturamentos de SERAPHINE em 27/4 (para comparação):`);
    const [seraphine27] = await connection.query(
      `SELECT COUNT(*) as qtd, SUM(cat1 + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0) + COALESCE(cat6,0) + COALESCE(cat7,0) + COALESCE(cat8,0) + COALESCE(cat9,0)) as total
       FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = 'SERAPHINE' AND data = '2026-04-27'`,
      [tenantId]
    );
    
    console.log(`  SERAPHINE em 27/4: ${seraphine27[0].qtd} registros, Total R$ ${parseFloat(seraphine27[0].total || 0).toFixed(2)}`);
    
  } finally {
    await connection.end();
  }
}

debugSyncIssue().catch(console.error);
