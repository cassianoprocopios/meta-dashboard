import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const tenantId = 1;

// Verificar dados dos dias 29 e 30 de abril
const [faturamentos] = await connection.execute(`
  SELECT 
    f.dia,
    f.empresaId,
    e.nome as empresa,
    f.cat1, f.cat2, f.cat3, f.cat4, f.cat5, f.cat6, f.cat7, f.cat8, f.cat9,
    (f.cat1 + f.cat2 + f.cat3 + f.cat4 + f.cat5 + f.cat6 + f.cat7 + f.cat8 + f.cat9) as total,
    f.createdAt
  FROM faturamentos f
  JOIN empresas e ON f.empresaId = e.id
  WHERE f.tenantId = ? 
    AND YEAR(f.dia) = 2026 
    AND MONTH(f.dia) = 4 
    AND DAY(f.dia) IN (29, 30)
  ORDER BY f.dia, e.nome
`, [tenantId]);

console.log('\n📊 FATURAMENTO DOS DIAS 29 E 30 DE ABRIL\n');
console.log('='.repeat(100));

if (faturamentos.length === 0) {
  console.log('❌ NENHUM DADO ENCONTRADO PARA OS DIAS 29 E 30!');
} else {
  faturamentos.forEach(f => {
    console.log(`\n📅 Dia ${f.dia.toLocaleDateString('pt-BR')} - ${f.empresa}`);
    console.log(`   cat1: R$ ${f.cat1.toFixed(2)}`);
    console.log(`   cat2: R$ ${f.cat2.toFixed(2)}`);
    console.log(`   cat3: R$ ${f.cat3.toFixed(2)}`);
    console.log(`   cat4: R$ ${f.cat4.toFixed(2)}`);
    console.log(`   cat5: R$ ${f.cat5.toFixed(2)}`);
    console.log(`   cat6: R$ ${f.cat6.toFixed(2)}`);
    console.log(`   cat7: R$ ${f.cat7.toFixed(2)}`);
    console.log(`   cat8: R$ ${f.cat8.toFixed(2)}`);
    console.log(`   cat9: R$ ${f.cat9.toFixed(2)}`);
    console.log(`   ────────────────────`);
    console.log(`   TOTAL: R$ ${f.total.toFixed(2)}`);
    console.log(`   Criado em: ${f.createdAt.toLocaleString('pt-BR')}`);
  });
}

// Resumo por empresa
console.log('\n\n📈 RESUMO POR EMPRESA (DIAS 29-30)\n');
console.log('='.repeat(100));

const [resumo] = await connection.execute(`
  SELECT 
    e.nome as empresa,
    COUNT(DISTINCT f.dia) as dias_sincronizados,
    SUM(f.cat1 + f.cat2 + f.cat3 + f.cat4 + f.cat5 + f.cat6 + f.cat7 + f.cat8 + f.cat9) as total_faturamento
  FROM faturamentos f
  JOIN empresas e ON f.empresaId = e.id
  WHERE f.tenantId = ? 
    AND YEAR(f.dia) = 2026 
    AND MONTH(f.dia) = 4 
    AND DAY(f.dia) IN (29, 30)
  GROUP BY e.id, e.nome
  ORDER BY e.nome
`, [tenantId]);

resumo.forEach(r => {
  console.log(`${r.empresa}: ${r.dias_sincronizados} dias, Total: R$ ${r.total_faturamento?.toFixed(2) || '0.00'}`);
});

// Verificar logs de sincronização
console.log('\n\n📋 LOGS DE SINCRONIZAÇÃO (ÚLTIMAS 24H)\n');
console.log('='.repeat(100));

const [logs] = await connection.execute(`
  SELECT 
    e.nome as empresa,
    csl.diasSincronizados,
    csl.dataInicio,
    csl.dataFim,
    csl.createdAt
  FROM cashbarberSyncLog csl
  JOIN empresas e ON csl.empresaId = e.id
  WHERE csl.tenantId = ? 
    AND csl.createdAt >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  ORDER BY csl.createdAt DESC
`, [tenantId]);

if (logs.length === 0) {
  console.log('❌ NENHUM LOG DE SINCRONIZAÇÃO NAS ÚLTIMAS 24 HORAS');
} else {
  logs.forEach(l => {
    console.log(`\n${l.empresa}`);
    console.log(`  Dias sincronizados: ${l.diasSincronizados}`);
    console.log(`  Período: ${l.dataInicio.toLocaleDateString('pt-BR')} a ${l.dataFim.toLocaleDateString('pt-BR')}`);
    console.log(`  Sincronizado em: ${l.createdAt.toLocaleString('pt-BR')}`);
  });
}

await connection.end();
