import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarSeraphine() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    
    console.log(`\n📊 Verificando faturamento de Seraphine - Dias 25 e 28 de Abril`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar dados de Seraphine em abril
    const [faturamentos] = await connection.query(
      `SELECT data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
              (cat1+cat2+cat3+cat4+cat5+cat6+cat7+cat8+cat9) as total
       FROM faturamentos 
       WHERE tenantId = ? AND empresaSlug = 'SERAPHINE' AND data BETWEEN '2026-04-01' AND '2026-04-30'
       ORDER BY data`,
      [tenantId]
    );
    
    console.log(`\n✅ Total de dias sincronizados para Seraphine: ${faturamentos.length}`);
    
    // Verificar especificamente dias 25 e 28
    const dia25 = faturamentos.find(f => f.data === '2026-04-25');
    const dia28 = faturamentos.find(f => f.data === '2026-04-28');
    
    console.log(`\n📅 Dia 25/4:`);
    if (dia25) {
      console.log(`  ✅ Encontrado`);
      console.log(`  Total: R$ ${parseFloat(dia25.total).toFixed(2)}`);
      console.log(`  cat1-cat8: R$ ${(parseFloat(dia25.cat1||0) + parseFloat(dia25.cat2||0) + parseFloat(dia25.cat3||0) + parseFloat(dia25.cat4||0) + parseFloat(dia25.cat5||0) + parseFloat(dia25.cat6||0) + parseFloat(dia25.cat7||0) + parseFloat(dia25.cat8||0)).toFixed(2)}`);
      console.log(`  cat9: R$ ${parseFloat(dia25.cat9||0).toFixed(2)}`);
    } else {
      console.log(`  ❌ NÃO ENCONTRADO`);
    }
    
    console.log(`\n📅 Dia 28/4:`);
    if (dia28) {
      console.log(`  ✅ Encontrado`);
      console.log(`  Total: R$ ${parseFloat(dia28.total).toFixed(2)}`);
      console.log(`  cat1-cat8: R$ ${(parseFloat(dia28.cat1||0) + parseFloat(dia28.cat2||0) + parseFloat(dia28.cat3||0) + parseFloat(dia28.cat4||0) + parseFloat(dia28.cat5||0) + parseFloat(dia28.cat6||0) + parseFloat(dia28.cat7||0) + parseFloat(dia28.cat8||0)).toFixed(2)}`);
      console.log(`  cat9: R$ ${parseFloat(dia28.cat9||0).toFixed(2)}`);
    } else {
      console.log(`  ❌ NÃO ENCONTRADO`);
    }
    
    // Listar todos os dias sincronizados
    console.log(`\n📋 Todos os dias sincronizados em abril:`);
    faturamentos.forEach(f => {
      const dataObj = new Date(f.data);
      const dia = dataObj.getDate();
      const total = parseFloat(f.total).toFixed(2);
      console.log(`  ${dia.toString().padStart(2, '0')}/04: R$ ${total}`);
    });
    
    // Verificar logs de sincronização do Avec
    console.log(`\n📊 Verificando logs de sincronização do Avec...`);
    const [logs] = await connection.query(
      `SELECT * FROM cashbarberSyncLog 
       WHERE tenantId = ? AND empresaSlug = 'SERAPHINE' 
       ORDER BY createdAt DESC 
       LIMIT 10`,
      [tenantId]
    );
    
    if (logs.length > 0) {
      console.log(`\n✅ Logs de sincronização encontrados:`);
      logs.forEach(log => {
        const data = new Date(log.createdAt);
        console.log(`  ${data.toLocaleString('pt-BR')}: ${log.diasSincronizados} dias`);
      });
    } else {
      console.log(`\n❌ Nenhum log de sincronização encontrado para Seraphine`);
    }
    
  } finally {
    await connection.end();
  }
}

verificarSeraphine().catch(console.error);
