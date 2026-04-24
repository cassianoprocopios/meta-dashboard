import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugSnapshotQuinzenal() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    console.log(`\n📊 Verificando snapshotQuinzenal - Tenant ID: ${tenantId}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar snapshots quinzenais
    const [snapshots] = await connection.query(
      `SELECT 
        id,
        empresaSlug,
        mes,
        ano,
        totalRealizado,
        metaQuinzenal,
        atingiu,
        percentual,
        origem,
        congeladoEm,
        createdAt
       FROM snapshotQuinzenal 
       WHERE tenantId = ? AND mes = 4 AND ano = 2026
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    console.log(`\n📋 Snapshots Quinzenais (Abril 2026):`);
    if (snapshots.length > 0) {
      snapshots.forEach(s => {
        console.log(`\n${s.empresaSlug}`);
        console.log(`  Total Realizado: R$ ${parseFloat(s.totalRealizado).toFixed(2)}`);
        console.log(`  Meta Quinzenal: R$ ${parseFloat(s.metaQuinzenal).toFixed(2)}`);
        console.log(`  Atingiu: ${s.atingiu ? 'SIM ✅' : 'NÃO ❌'}`);
        console.log(`  Percentual: ${s.percentual}%`);
        console.log(`  Origem: ${s.origem}`);
        console.log(`  Congelado em: ${s.congeladoEm}`);
        console.log(`  Criado em: ${s.createdAt}`);
      });
    } else {
      console.log(`\n  ⚠️ Nenhum snapshot quinzenal encontrado para abril de 2026!`);
    }
    
    // Contar total de snapshots
    const [totalCount] = await connection.query(
      `SELECT COUNT(*) as cnt FROM snapshotQuinzenal WHERE tenantId = ?`,
      [tenantId]
    );
    console.log(`\n\n📊 Total de snapshots para tenant ${tenantId}: ${totalCount[0].cnt}`);
    
    // Listar todos os snapshots por mês/ano
    const [allSnapshots] = await connection.query(
      `SELECT 
        mes,
        ano,
        COUNT(*) as cnt
       FROM snapshotQuinzenal 
       WHERE tenantId = ?
       GROUP BY mes, ano
       ORDER BY ano DESC, mes DESC`,
      [tenantId]
    );
    
    console.log(`\n📅 Snapshots por período:`);
    allSnapshots.forEach(row => {
      console.log(`  ${String(row.mes).padStart(2, '0')}/${row.ano}: ${row.cnt} empresa(s)`);
    });
    
  } finally {
    await connection.end();
  }
}

debugSnapshotQuinzenal().catch(console.error);
