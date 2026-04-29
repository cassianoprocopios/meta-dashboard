import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
  user: process.env.DATABASE_URL?.split('//')[1]?.split(':')[0] || 'root',
  password: process.env.DATABASE_URL?.split(':')[1]?.split('@')[0] || '',
  database: process.env.DATABASE_URL?.split('/').pop() || 'meta_dashboard',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

try {
  // Query para pegar faturamento acumulado de cada empresa em abril 2026
  const [rows] = await connection.execute(`
    SELECT 
      tenant,
      SUM(faturamento_total) as total_acumulado,
      COUNT(DISTINCT DATE(data_sincronizacao)) as dias_sincronizados,
      MAX(data_sincronizacao) as ultima_sincronizacao
    FROM faturamentos
    WHERE YEAR(data_faturamento) = 2026 
      AND MONTH(data_faturamento) = 4
    GROUP BY tenant
    ORDER BY tenant
  `);

  console.log('📊 Faturamento Acumulado em Abril 2026:\n');
  rows.forEach(row => {
    console.log(`${row.tenant}:`);
    console.log(`  Total: R$ ${parseFloat(row.total_acumulado).toFixed(2)}`);
    console.log(`  Dias sincronizados: ${row.dias_sincronizados}`);
    console.log(`  Última sincronização: ${row.ultima_sincronizacao}`);
    console.log('');
  });

  // Query para pegar a meta mensal
  const [metas] = await connection.execute(`
    SELECT 
      tenant,
      meta_mensal
    FROM metas_mensais
    WHERE YEAR(mes) = 2026 
      AND MONTH(mes) = 4
    ORDER BY tenant
  `);

  console.log('🎯 Metas Mensais de Abril 2026:\n');
  metas.forEach(meta => {
    console.log(`${meta.tenant}: R$ ${parseFloat(meta.meta_mensal).toFixed(2)}`);
  });

  // Cálculo de dias úteis restantes
  console.log('\n📅 Dias Úteis Restantes: 2 dias (29 e 30 de abril)\n');

  // Comparação
  console.log('📈 Análise de Progresso:\n');
  rows.forEach(row => {
    const meta = metas.find(m => m.tenant === row.tenant);
    if (meta) {
      const faltando = parseFloat(meta.meta_mensal) - parseFloat(row.total_acumulado);
      const percentual = (parseFloat(row.total_acumulado) / parseFloat(meta.meta_mensal) * 100).toFixed(1);
      const mediaPodia = faltando / 2;
      
      console.log(`${row.tenant}:`);
      console.log(`  Meta: R$ ${parseFloat(meta.meta_mensal).toFixed(2)}`);
      console.log(`  Acumulado: R$ ${parseFloat(row.total_acumulado).toFixed(2)}`);
      console.log(`  Faltando: R$ ${faltando.toFixed(2)}`);
      console.log(`  Progresso: ${percentual}%`);
      console.log(`  Média/dia necessária (2 dias): R$ ${mediaPodia.toFixed(2)}`);
      console.log('');
    }
  });

} catch (error) {
  console.error('Erro:', error.message);
} finally {
  await connection.end();
}
