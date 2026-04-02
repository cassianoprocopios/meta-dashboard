import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Verificar total de março da Seraphine por dia
const [rows] = await conn.execute(`
  SELECT 
    data,
    DAYOFWEEK(data) as dia_semana,
    DAYNAME(data) as nome_dia,
    COALESCE(cat1, 0) as cabelo,
    COALESCE(cat2, 0) as manicure,
    COALESCE(cat3, 0) as sobrancelha,
    COALESCE(cat4, 0) as pacote,
    COALESCE(cat5, 0) as recorrencia,
    (COALESCE(cat1,0) + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0)) as total
  FROM faturamentos
  WHERE empresaSlug = 'seraphine'
    AND data >= '2026-03-01'
    AND data <= '2026-03-31'
  ORDER BY data
`);

console.log('\n=== MARÇO/2026 - SERAPHINE ===');
let totalMes = 0;
for (const row of rows) {
  const data = typeof row.data === 'string' ? row.data.split('T')[0] : row.data instanceof Date ? row.data.toISOString().split('T')[0] : String(row.data).split('T')[0];
  const total = parseFloat(row.total);
  console.log(`${data} (${row.nome_dia}): R$ ${total.toFixed(2)}`);
  console.log(`  Cabelo: ${row.cabelo} | Manicure: ${row.manicure} | Sobrancelha: ${row.sobrancelha} | Pacote: ${row.pacote} | Recorrência: ${row.recorrencia}`);
  totalMes += total;
}
console.log(`\nTotal no banco: R$ ${totalMes.toFixed(2)}`);
console.log(`Total no Avec:  R$ 121.050,35`);
console.log(`Diferença: R$ ${(121050.35 - totalMes).toFixed(2)}`);
console.log(`\nDias registrados: ${rows.length}`);

// Verificar dias da semana faltantes
const diasRegistrados = rows.map(r => typeof r.data === 'string' ? r.data.split('T')[0] : r.data instanceof Date ? r.data.toISOString().split('T')[0] : String(r.data).split('T')[0]);
const todosDiasMarco = [];
for (let d = 1; d <= 31; d++) {
  const data = `2026-03-${String(d).padStart(2, '0')}`;
  const dt = new Date(data + 'T12:00:00Z');
  const diaSemana = dt.getDay(); // 0=Dom, 1=Seg
  todosDiasMarco.push({ data, diaSemana });
}

const diasFaltantes = todosDiasMarco.filter(d => !diasRegistrados.includes(d.data));
console.log('\nDias sem registro:');
for (const d of diasFaltantes) {
  const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  console.log(`  ${d.data} (${nomes[d.diaSemana]})`);
}

await conn.end();
