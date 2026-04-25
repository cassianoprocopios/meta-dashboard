import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function corrigirSnapshotsAbril() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const mes = 4; // Abril
    const ano = 2026;
    
    console.log(`\n🔧 Corrigindo snapshots de ${mes}/${ano} com valores corretos`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Valores corretos que deveriam estar congelados no dia 15
    const valoresCorretos = {
      'MASCOTE': {
        totalRealizado: 57524.00,
        metaQuinzenal: 56000.00,
        atingiu: 1, // Atingiu meta
        percentual: 0.30, // 0,3% de bonificação
      },
      'MORUMBI': {
        totalRealizado: 112496.00,
        metaQuinzenal: 112000.00,
        atingiu: 1, // Atingiu meta
        percentual: 0.30, // 0,3% de bonificação
      },
    };
    
    // Atualizar cada empresa
    for (const [empresa, valores] of Object.entries(valoresCorretos)) {
      const [existing] = await connection.query(
        `SELECT id FROM snapshotQuinzenal WHERE tenantId = ? AND empresaSlug = ? AND mes = ? AND ano = ?`,
        [tenantId, empresa, mes, ano]
      );
      
      if (existing.length > 0) {
        await connection.query(
          `UPDATE snapshotQuinzenal SET 
            totalRealizado = ?,
            metaQuinzenal = ?,
            atingiu = ?,
            percentual = ?,
            origem = 'manual',
            congeladoEm = NOW()
           WHERE id = ?`,
          [
            valores.totalRealizado.toFixed(2),
            valores.metaQuinzenal.toFixed(2),
            valores.atingiu,
            valores.percentual.toFixed(2),
            existing[0].id
          ]
        );
        
        console.log(`\n✅ ${empresa} ATUALIZADO`);
        console.log(`  Total: R$ ${valores.totalRealizado.toFixed(2)}`);
        console.log(`  Meta: R$ ${valores.metaQuinzenal.toFixed(2)}`);
        console.log(`  Atingiu: ${valores.atingiu ? 'SIM ✅' : 'NÃO ❌'}`);
        console.log(`  % Bonificação: ${valores.percentual}%`);
      } else {
        console.log(`\n⚠️ ${empresa}: Snapshot não encontrado!`);
      }
    }
    
    // SERAPHINE não atingiu meta, mantém 0.2%
    const [seraphineExisting] = await connection.query(
      `SELECT id FROM snapshotQuinzenal WHERE tenantId = ? AND empresaSlug = 'SERAPHINE' AND mes = ? AND ano = ?`,
      [tenantId, mes, ano]
    );
    
    if (seraphineExisting.length > 0) {
      // Manter SERAPHINE como está (não atingiu meta, 0.2%)
      console.log(`\n✅ SERAPHINE mantém valores (não atingiu meta, 0.2%)`);
    }
    
    console.log(`\n\n✅ Correção concluída!`);
    
  } finally {
    await connection.end();
  }
}

corrigirSnapshotsAbril().catch(console.error);
