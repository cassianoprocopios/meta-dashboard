import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugDadosFaltando() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    console.log(`\n🔍 Verificando se há dados faltando`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Valores esperados pelo usuário
    const esperado = {
      'MASCOTE': 57524,
      'MORUMBI': 112496,
    };
    
    // Valores calculados (dias 1-15)
    const calculado = {
      'MASCOTE': 55605.78,
      'MORUMBI': 109553.42,
    };
    
    // Diferenças
    console.log(`\n📊 Comparação de Valores:`);
    for (const [empresa, esp] of Object.entries(esperado)) {
      const calc = calculado[empresa];
      const diff = esp - calc;
      const pct = (diff / esp * 100).toFixed(2);
      console.log(`\n${empresa}`);
      console.log(`  Esperado: R$ ${esp.toFixed(2)}`);
      console.log(`  Calculado (1-15): R$ ${calc.toFixed(2)}`);
      console.log(`  Diferença: R$ ${diff.toFixed(2)} (${pct}%)`);
    }
    
    // Verificar se há dados em outras datas
    console.log(`\n\n📅 Verificando faturamento por período:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [periodos] = await connection.query(
      `SELECT 
        empresaSlug,
        CASE 
          WHEN CAST(SUBSTRING(data, 9, 2) AS UNSIGNED) <= 15 THEN 'Dias 1-15'
          WHEN CAST(SUBSTRING(data, 9, 2) AS UNSIGNED) <= 20 THEN 'Dias 16-20'
          ELSE 'Dias 21-31'
        END as periodo,
        COUNT(*) as dias,
        SUM(CAST(cat1 AS DECIMAL(10,2)) + CAST(cat2 AS DECIMAL(10,2)) + CAST(cat3 AS DECIMAL(10,2)) + 
            CAST(cat4 AS DECIMAL(10,2)) + CAST(cat5 AS DECIMAL(10,2)) + CAST(cat6 AS DECIMAL(10,2)) + 
            CAST(cat7 AS DECIMAL(10,2)) + CAST(cat8 AS DECIMAL(10,2)) + CAST(cat9 AS DECIMAL(10,2))) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data LIKE '2026-04-%'
       GROUP BY empresaSlug, periodo
       ORDER BY empresaSlug, periodo`,
      [tenantId]
    );
    
    periodos.forEach(row => {
      console.log(`\n${row.empresaSlug} - ${row.periodo}`);
      console.log(`  Dias: ${row.dias}`);
      console.log(`  Total: R$ ${parseFloat(row.total).toFixed(2)}`);
    });
    
    // Verificar se há dados sincronizados do CashBarber
    console.log(`\n\n🔄 Verificando status de sincronização:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [syncLogs] = await connection.query(
      `SELECT 
        empresaSlug,
        mes,
        ano,
        origem,
        status,
        diasSincronizados,
        executadoEm
       FROM cashbarberSyncLog 
       WHERE tenantId = ? AND mes = 4 AND ano = 2026
       ORDER BY executadoEm DESC`,
      [tenantId]
    );
    
    syncLogs.forEach(log => {
      console.log(`\n${log.empresaSlug}`);
      console.log(`  Origem: ${log.origem}`);
      console.log(`  Status: ${log.status}`);
      console.log(`  Dias sincronizados: ${log.diasSincronizados}`);
      console.log(`  Executado em: ${log.executadoEm}`);
    });
    
  } finally {
    await connection.end();
  }
}

debugDadosFaltando().catch(console.error);
