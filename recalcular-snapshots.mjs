import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function recalcularSnapshots() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const mes = 4; // Abril
    const ano = 2026;
    
    console.log(`\n🔄 Recalculando snapshots quinzenais para ${mes}/${ano}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar empresas
    const [empresas] = await connection.query(
      'SELECT DISTINCT empresaSlug FROM faturamentos WHERE tenantId = ? AND data LIKE ? ORDER BY empresaSlug',
      [tenantId, `${ano}-${String(mes).padStart(2, '0')}-%`]
    );
    
    console.log(`\n📍 Empresas encontradas: ${empresas.length}`);
    
    // Para cada empresa, recalcular o snapshot
    for (const empresa of empresas) {
      const empresaSlug = empresa.empresaSlug;
      
      // Buscar faturamento dos dias 1-15
      const [rows] = await connection.query(
        `SELECT 
          data,
          cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9
         FROM faturamentos 
         WHERE tenantId = ? AND empresaSlug = ? AND data LIKE ?
         ORDER BY data`,
        [tenantId, empresaSlug, `${ano}-${String(mes).padStart(2, '0')}-%`]
      );
      
      // Filtrar apenas dias 1-15
      const dias1a15 = rows.filter(r => {
        const dia = parseInt(r.data.split('-')[2], 10);
        return dia >= 1 && dia <= 15;
      });
      
      // Calcular total
      const totalQuinzenal = dias1a15.reduce((acc, r) => {
        const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
        return acc + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
      }, 0);
      
      // Buscar meta quinzenal
      const [metaRows] = await connection.query(
        `SELECT metaQuinzenal FROM metas WHERE tenantId = ? AND empresaSlug = ? AND mes = ? AND ano = ?`,
        [tenantId, empresaSlug, mes, ano]
      );
      const metaQuinzenal = metaRows.length > 0 ? parseFloat(metaRows[0].metaQuinzenal) : 0;
      
      // Determinar se atingiu meta
      const atingiu = totalQuinzenal >= metaQuinzenal ? 1 : 0;
      
      // Buscar percentual de bonificação
      const [bonifRows] = await connection.query(
        `SELECT pctQuinzenalComMeta, pctQuinzenalSemMeta FROM bonificacoes WHERE tenantId = ? AND empresaSlug = ?`,
        [tenantId, empresaSlug]
      );
      const pctBonificacao = atingiu 
        ? (bonifRows.length > 0 ? parseFloat(bonifRows[0].pctQuinzenalComMeta) : 0.3)
        : (bonifRows.length > 0 ? parseFloat(bonifRows[0].pctQuinzenalSemMeta) : 0.2);
      
      // Buscar snapshot existente
      const [existing] = await connection.query(
        `SELECT id FROM snapshotQuinzenal WHERE tenantId = ? AND empresaSlug = ? AND mes = ? AND ano = ?`,
        [tenantId, empresaSlug, mes, ano]
      );
      
      // Atualizar ou inserir
      const payload = {
        totalRealizado: totalQuinzenal.toFixed(2),
        metaQuinzenal: metaQuinzenal.toFixed(2),
        atingiu,
        percentual: pctBonificacao.toFixed(2),
        origem: 'manual',
        congeladoEm: new Date(),
      };
      
      if (existing.length > 0) {
        await connection.query(
          `UPDATE snapshotQuinzenal SET ? WHERE id = ?`,
          [payload, existing[0].id]
        );
        console.log(`\n✅ ${empresaSlug} ATUALIZADO`);
      } else {
        await connection.query(
          `INSERT INTO snapshotQuinzenal SET ?`,
          [{
            tenantId,
            empresaSlug,
            mes,
            ano,
            ...payload
          }]
        );
        console.log(`\n✅ ${empresaSlug} INSERIDO`);
      }
      
      console.log(`  Dias: ${dias1a15.length}`);
      console.log(`  Total: R$ ${totalQuinzenal.toFixed(2)}`);
      console.log(`  Meta: R$ ${metaQuinzenal.toFixed(2)}`);
      console.log(`  Atingiu: ${atingiu ? 'SIM ✅' : 'NÃO ❌'}`);
      console.log(`  % Bonificação: ${pctBonificacao}%`);
    }
    
    console.log(`\n\n✅ Recálculo concluído!`);
    
  } finally {
    await connection.end();
  }
}

recalcularSnapshots().catch(console.error);
