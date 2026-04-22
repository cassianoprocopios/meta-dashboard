import mysql from 'mysql2/promise';

async function query() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
    user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
    password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
    database: process.env.DATABASE_URL?.split('/').pop() || 'meta_dashboard'
  });

  try {
    const [rows] = await connection.execute(
      'SELECT * FROM faturamentos WHERE data = ? AND empresaSlug = ?',
      ['2026-04-21', 'SERAPHINE']
    );
    
    console.log('\n=== DADOS DO DIA 21/04/2026 ===\n');
    if (rows.length === 0) {
      console.log('✗ Nenhum registro encontrado');
    } else {
      rows.forEach(row => {
        const total = (row.cat1 || 0) + (row.cat2 || 0) + (row.cat3 || 0) + (row.cat4 || 0);
        console.log(`Serviços: R$${row.cat1}`);
        console.log(`Pacotes: R$${row.cat2}`);
        console.log(`Produtos: R$${row.cat3}`);
        console.log(`Caixinha: R$${row.cat4}`);
        console.log(`TOTAL: R$${total}`);
        console.log(`Esperado: R$6.090,00`);
        console.log(`Status: ${total === 6090 ? '✓ CORRETO' : '✗ INCORRETO'}`);
      });
    }
  } catch (e) {
    console.error('Erro:', e.message);
  } finally {
    await connection.end();
  }
  
  process.exit(0);
}

query();
