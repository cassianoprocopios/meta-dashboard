import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugQuinzenal() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    console.log(`\n📊 Tenant ID: ${tenantId} (Barbiero Grupo)`);
    
    // Buscar empresas do faturamento
    const [empresas] = await connection.query(
      'SELECT DISTINCT empresaSlug FROM faturamentos WHERE tenantId = ? ORDER BY empresaSlug',
      [tenantId]
    );
    
    console.log(`\n📍 Empresas encontradas: ${empresas.length}`);
    empresas.forEach(e => console.log(`  - ${e.empresaSlug}`));
    
    // Para cada empresa, calcular faturamento dos dias 1-15 de abril
    console.log(`\n\n🔍 Faturamento de 1-15 de Abril de 2026:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const totaisPorEmpresa = {};
    
    for (const empresa of empresas) {
      const [rows] = await connection.query(
        `SELECT 
          data,
          cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
          (CAST(cat1 AS DECIMAL(10,2)) + CAST(cat2 AS DECIMAL(10,2)) + CAST(cat3 AS DECIMAL(10,2)) + 
           CAST(cat4 AS DECIMAL(10,2)) + CAST(cat5 AS DECIMAL(10,2)) + CAST(cat6 AS DECIMAL(10,2)) + 
           CAST(cat7 AS DECIMAL(10,2)) + CAST(cat8 AS DECIMAL(10,2)) + CAST(cat9 AS DECIMAL(10,2))) as total_dia
         FROM faturamentos 
         WHERE tenantId = ? AND empresaSlug = ? AND data LIKE '2026-04-%'
         ORDER BY data`,
        [tenantId, empresa.empresaSlug]
      );
      
      // Filtrar apenas dias 1-15
      const dias1a15 = rows.filter(r => {
        const dia = parseInt(r.data.split('-')[2], 10);
        return dia >= 1 && dia <= 15;
      });
      
      const totalQuinzenal = dias1a15.reduce((sum, r) => sum + parseFloat(r.total_dia || 0), 0);
      totaisPorEmpresa[empresa.empresaSlug] = totalQuinzenal;
      
      console.log(`\n${empresa.empresaSlug.toUpperCase()}`);
      console.log(`  Dias com dados: ${dias1a15.length}`);
      console.log(`  Total (1-15): R$ ${totalQuinzenal.toFixed(2)}`);
      
      if (dias1a15.length > 0) {
        console.log(`  Detalhes dos dias:`);
        dias1a15.forEach(r => {
          const dia = parseInt(r.data.split('-')[2], 10);
          console.log(`    Dia ${String(dia).padStart(2, '0')}: R$ ${parseFloat(r.total_dia).toFixed(2)}`);
        });
      }
    }
    
    // Buscar snapshots de meta mensal para abril
    console.log(`\n\n📋 Snapshots de Meta Mensal (Abril 2026):`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [snapshots] = await connection.query(
      `SELECT 
        empresaSlug, 
        mes, 
        ano,
        faturamentoTotal,
        metaMensal,
        superMeta,
        atingiuMeta,
        atingiuSuperMeta,
        valorQuinzenal,
        valorMensal,
        valorSuperMeta,
        totalPago,
        createdAt
       FROM bonificacaoHistorico 
       WHERE tenantId = ? AND mes = 4 AND ano = 2026
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    if (snapshots.length > 0) {
      snapshots.forEach(s => {
        const faturamentoEsperado = totaisPorEmpresa[s.empresaSlug];
        const diferenca = faturamentoEsperado - parseFloat(s.faturamentoTotal);
        const diferencaPercent = (diferenca / faturamentoEsperado * 100).toFixed(2);
        
        console.log(`\n${s.empresaSlug.toUpperCase()}`);
        console.log(`  Faturamento Esperado (1-15): R$ ${faturamentoEsperado.toFixed(2)}`);
        console.log(`  Faturamento no Snapshot: R$ ${parseFloat(s.faturamentoTotal).toFixed(2)}`);
        if (diferenca !== 0) {
          console.log(`  ⚠️ DIFERENÇA: R$ ${Math.abs(diferenca).toFixed(2)} (${diferencaPercent}%)`);
        }
        console.log(`  Meta Mensal: R$ ${parseFloat(s.metaMensal).toFixed(2)}`);
        console.log(`  Atingiu Meta: ${s.atingiuMeta ? 'SIM ✅' : 'NÃO ❌'}`);
        console.log(`  Valor Quinzenal: R$ ${parseFloat(s.valorQuinzenal).toFixed(2)}`);
        console.log(`  Criado em: ${s.createdAt}`);
      });
    } else {
      console.log('  ⚠️ Nenhum snapshot encontrado para abril de 2026!');
    }
    
    // Buscar configurações de bonificação
    console.log(`\n\n⚙️ Configurações de Bonificação:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [configs] = await connection.query(
      `SELECT 
        empresaSlug,
        pctQuinzenalSemMeta,
        pctQuinzenalComMeta,
        pctMensalSemMeta,
        pctMensalComMeta,
        pctSuperMeta
       FROM bonificacoes 
       WHERE tenantId = ?
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    if (configs.length > 0) {
      configs.forEach(c => {
        console.log(`\n${c.empresaSlug.toUpperCase()}`);
        console.log(`  % Quinzenal Sem Meta: ${c.pctQuinzenalSemMeta}%`);
        console.log(`  % Quinzenal Com Meta: ${c.pctQuinzenalComMeta}%`);
        console.log(`  % Mensal Sem Meta: ${c.pctMensalSemMeta}%`);
        console.log(`  % Mensal Com Meta: ${c.pctMensalComMeta}%`);
        console.log(`  % Super Meta: ${c.pctSuperMeta}%`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

debugQuinzenal().catch(console.error);
