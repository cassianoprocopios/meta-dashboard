import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugDia27Abril() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const data = '2026-04-27';
    
    console.log(`\n📊 Verificando faturamento do dia 27/4/2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar faturamentos do dia 27/4
    const [faturamentos] = await connection.query(
      `SELECT id, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, createdAt, updatedAt 
       FROM faturamentos 
       WHERE tenantId = ? AND data = ?
       ORDER BY empresaSlug, createdAt`,
      [tenantId, data]
    );
    
    console.log(`\n✅ Faturamentos encontrados: ${faturamentos.length}`);
    
    if (faturamentos.length === 0) {
      console.log(`\n⚠️ Nenhum faturamento encontrado para 27/4!`);
      
      // Verificar se há dados em datas próximas
      console.log(`\nVerificando datas próximas...`);
      const [proximosDias] = await connection.query(
        `SELECT DISTINCT data FROM faturamentos 
         WHERE tenantId = ? AND data BETWEEN '2026-04-25' AND '2026-04-28'
         ORDER BY data`,
        [tenantId]
      );
      
      console.log(`Datas com faturamento próximas:`);
      proximosDias.forEach(d => console.log(`  - ${d.data}`));
      
    } else {
      // Agrupar por empresa
      const porEmpresa = {};
      faturamentos.forEach(f => {
        if (!porEmpresa[f.empresaSlug]) {
          porEmpresa[f.empresaSlug] = [];
        }
        porEmpresa[f.empresaSlug].push(f);
      });
      
      console.log(`\n📍 Faturamentos por empresa:`);
      for (const [empresa, registros] of Object.entries(porEmpresa)) {
        console.log(`\n  ${empresa}: ${registros.length} registro(s)`);
        
        let totalEmpresa = 0;
        registros.forEach(r => {
          const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
          const total = cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
          totalEmpresa += total;
          
          console.log(`    ID ${r.id}: R$ ${total.toFixed(2)} (criado em ${r.createdAt})`);
        });
        
        console.log(`    Total: R$ ${totalEmpresa.toFixed(2)}`);
      }
    }
    
    // Verificar logs de sincronização
    console.log(`\n\n📋 Verificando logs de sincronização do CashBarber...`);
    const [syncLogs] = await connection.query(
      `SELECT * FROM cashbarberSyncLog 
       WHERE tenantId = ? AND DATE(dataSync) = ?
       ORDER BY dataSync DESC
       LIMIT 10`,
      [tenantId, data]
    );
    
    if (syncLogs.length === 0) {
      console.log(`⚠️ Nenhum log de sincronização para 27/4!`);
      
      // Verificar logs recentes
      console.log(`\nÚltimas sincronizações:`);
      const [ultimasSync] = await connection.query(
        `SELECT DISTINCT DATE(dataSync) as data FROM cashbarberSyncLog 
         WHERE tenantId = ?
         ORDER BY dataSync DESC
         LIMIT 5`,
        [tenantId]
      );
      
      ultimasSync.forEach(s => console.log(`  - ${s.data}`));
      
    } else {
      console.log(`✅ Logs encontrados: ${syncLogs.length}`);
      syncLogs.forEach(log => {
        console.log(`\n  ${log.dataSync}:`);
        console.log(`    Empresa: ${log.empresaSlug}`);
        console.log(`    Dias sincronizados: ${log.diasSincronizados}`);
        console.log(`    Status: ${log.status}`);
        if (log.erroMensagem) {
          console.log(`    Erro: ${log.erroMensagem}`);
        }
      });
    }
    
  } finally {
    await connection.end();
  }
}

debugDia27Abril().catch(console.error);
