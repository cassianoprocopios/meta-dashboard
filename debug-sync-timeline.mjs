import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugSyncTimeline() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    console.log(`\n📊 Timeline de Sincronização - Abril 2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Data do snapshot
    console.log(`\n📋 Snapshot criado em: Tue Apr 14 2026 16:14:35 GMT-0400`);
    console.log(`   (Equivalente a: 2026-04-14 20:14:35 UTC)`);
    
    // Buscar logs de sincronização
    const [syncLogs] = await connection.query(
      `SELECT 
        id,
        empresaSlug,
        mes,
        ano,
        origem,
        status,
        diasSincronizados,
        diasIgnorados,
        executadoEm
       FROM cashbarberSyncLog 
       WHERE tenantId = ? AND mes = 4 AND ano = 2026
       ORDER BY executadoEm DESC
       LIMIT 20`,
      [tenantId]
    );
    
    console.log(`\n🔄 Logs de Sincronização (Abril 2026):`);
    if (syncLogs.length > 0) {
      syncLogs.forEach(log => {
        console.log(`\n  ${log.empresaSlug}`);
        console.log(`    Origem: ${log.origem}`);
        console.log(`    Status: ${log.status}`);
        console.log(`    Dias sincronizados: ${log.diasSincronizados}`);
        console.log(`    Dias ignorados: ${log.diasIgnorados}`);
        console.log(`    Executado em: ${log.executadoEm}`);
      });
    } else {
      console.log(`  Nenhum log de sincronização encontrado`);
    }
    
    // Buscar faturamentos inseridos/atualizados após o snapshot
    console.log(`\n\n📅 Faturamentos inseridos APÓS o snapshot (14/04/2026 20:14:35 UTC):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [afterSnapshot] = await connection.query(
      `SELECT 
        data,
        empresaSlug,
        (CAST(cat1 AS DECIMAL(10,2)) + CAST(cat2 AS DECIMAL(10,2)) + CAST(cat3 AS DECIMAL(10,2)) + 
         CAST(cat4 AS DECIMAL(10,2)) + CAST(cat5 AS DECIMAL(10,2)) + CAST(cat6 AS DECIMAL(10,2)) + 
         CAST(cat7 AS DECIMAL(10,2)) + CAST(cat8 AS DECIMAL(10,2)) + CAST(cat9 AS DECIMAL(10,2))) as total_dia,
        createdAt,
        updatedAt
       FROM faturamentos 
       WHERE tenantId = ? AND data LIKE '2026-04-%'
       AND (createdAt > '2026-04-14 20:14:35' OR updatedAt > '2026-04-14 20:14:35')
       ORDER BY data, empresaSlug`,
      [tenantId]
    );
    
    if (afterSnapshot.length > 0) {
      console.log(`\nEncontrados ${afterSnapshot.length} registros:`);
      afterSnapshot.forEach(row => {
        const dia = parseInt(row.data.split('-')[2], 10);
        console.log(`  Dia ${String(dia).padStart(2, '0')} - ${row.empresaSlug}: R$ ${parseFloat(row.total_dia).toFixed(2)} (criado: ${row.createdAt})`);
      });
    } else {
      console.log(`\n✅ Nenhum faturamento foi inserido/atualizado após o snapshot`);
    }
    
    // Verificar quantos dias de cada empresa estão no banco
    console.log(`\n\n📊 Contagem de dias por empresa em Abril 2026:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [diasPorEmpresa] = await connection.query(
      `SELECT 
        empresaSlug,
        COUNT(DISTINCT data) as dias_com_dados,
        MIN(data) as primeiro_dia,
        MAX(data) as ultimo_dia
       FROM faturamentos 
       WHERE tenantId = ? AND data LIKE '2026-04-%'
       GROUP BY empresaSlug
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    diasPorEmpresa.forEach(row => {
      console.log(`\n${row.empresaSlug}`);
      console.log(`  Dias com dados: ${row.dias_com_dados}`);
      console.log(`  Primeiro dia: ${row.primeiro_dia}`);
      console.log(`  Último dia: ${row.ultimo_dia}`);
    });
    
  } finally {
    await connection.end();
  }
}

debugSyncTimeline().catch(console.error);
