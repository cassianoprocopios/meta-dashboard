import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function testarFechamentoMaio() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const mes = 5; // Maio
    const ano = 2026;
    
    console.log(`\n📊 Teste de Fechamento Quinzenal - Maio 2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar empresas
    const [empresas] = await connection.query(
      'SELECT DISTINCT empresaSlug FROM faturamentos WHERE tenantId = ? AND data LIKE ? ORDER BY empresaSlug',
      [tenantId, `${ano}-${String(mes).padStart(2, '0')}-%`]
    );
    
    console.log(`\n📍 Empresas encontradas: ${empresas.length}`);
    
    // Para cada empresa, calcular o snapshot
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
      
      console.log(`\n${empresaSlug}`);
      console.log(`  Dias com faturamento: ${dias1a15.length}`);
      console.log(`  Total (1-15): R$ ${totalQuinzenal.toFixed(2)}`);
      console.log(`  Meta Quinzenal: R$ ${metaQuinzenal.toFixed(2)}`);
      console.log(`  Atingiu Meta: ${atingiu ? 'SIM ✅' : 'NÃO ❌'}`);
      console.log(`  % Bonificação: ${pctBonificacao}%`);
      
      const pctAtingimento = metaQuinzenal > 0 ? ((totalQuinzenal / metaQuinzenal) * 100).toFixed(1) : 0;
      console.log(`  % Atingimento: ${pctAtingimento}%`);
      
      if (totalQuinzenal < metaQuinzenal) {
        const faltou = metaQuinzenal - totalQuinzenal;
        console.log(`  Faltou: R$ ${faltou.toFixed(2)}`);
      }
    }
    
    console.log(`\n\n✅ Teste concluído!`);
    console.log(`\nPróximas etapas:`);
    console.log(`1. Verificar se há dados de maio no banco`);
    console.log(`2. Aguardar dia 16 de maio às 02:30 UTC para o job rodar automaticamente`);
    console.log(`3. Validar que os snapshots foram criados corretamente`);
    
  } finally {
    await connection.end();
  }
}

testarFechamentoMaio().catch(console.error);
