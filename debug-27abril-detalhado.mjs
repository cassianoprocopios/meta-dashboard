import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function debugDia27AbrilDetalhado() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1; // Barbiero Grupo
    const data = '2026-04-27';
    
    console.log(`\n📊 Verificando dados detalhados de 27/4/2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar faturamentos de 27/4 com detalhe de cada categoria
    const [faturamentos] = await connection.query(
      `SELECT id, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9
       FROM faturamentos 
       WHERE tenantId = ? AND data = ?
       ORDER BY empresaSlug`,
      [tenantId, data]
    );
    
    console.log(`\n✅ Faturamentos encontrados: ${faturamentos.length}\n`);
    
    faturamentos.forEach(f => {
      const cat1 = parseFloat(f.cat1 || 0);
      const cat2 = parseFloat(f.cat2 || 0);
      const cat3 = parseFloat(f.cat3 || 0);
      const cat4 = parseFloat(f.cat4 || 0);
      const cat5 = parseFloat(f.cat5 || 0);
      const cat6 = parseFloat(f.cat6 || 0);
      const cat7 = parseFloat(f.cat7 || 0);
      const cat8 = parseFloat(f.cat8 || 0);
      const cat9 = parseFloat(f.cat9 || 0);
      
      console.log(`${f.empresaSlug} (ID ${f.id}):`);
      console.log(`  cat1 (Serviços): R$ ${cat1.toFixed(2)}`);
      console.log(`  cat2 (Pacotes): R$ ${cat2.toFixed(2)}`);
      console.log(`  cat3 (Produtos): R$ ${cat3.toFixed(2)}`);
      console.log(`  cat4: R$ ${cat4.toFixed(2)}`);
      console.log(`  cat5: R$ ${cat5.toFixed(2)}`);
      console.log(`  cat6: R$ ${cat6.toFixed(2)}`);
      console.log(`  cat7: R$ ${cat7.toFixed(2)}`);
      console.log(`  cat8: R$ ${cat8.toFixed(2)}`);
      console.log(`  cat9 (Recorrência/Dpote): R$ ${cat9.toFixed(2)}`);
      
      const total = cat1 + cat2 + cat3 + cat4 + cat5 + cat6 + cat7 + cat8 + cat9;
      console.log(`  TOTAL: R$ ${total.toFixed(2)}\n`);
    });
    
    // Comparar com dados de 26/4
    console.log(`\n📊 Comparando com dados de 26/4/2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [faturamentos26] = await connection.query(
      `SELECT empresaSlug, SUM(cat1 + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0) + COALESCE(cat6,0) + COALESCE(cat7,0) + COALESCE(cat8,0) + COALESCE(cat9,0)) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data = '2026-04-26'
       GROUP BY empresaSlug
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    console.log(`\nDados de 26/4:`);
    faturamentos26.forEach(f => {
      console.log(`  ${f.empresaSlug}: R$ ${parseFloat(f.total || 0).toFixed(2)}`);
    });
    
    // Comparar com dados de 28/4
    console.log(`\n📊 Comparando com dados de 28/4/2026`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const [faturamentos28] = await connection.query(
      `SELECT empresaSlug, SUM(cat1 + COALESCE(cat2,0) + COALESCE(cat3,0) + COALESCE(cat4,0) + COALESCE(cat5,0) + COALESCE(cat6,0) + COALESCE(cat7,0) + COALESCE(cat8,0) + COALESCE(cat9,0)) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data = '2026-04-28'
       GROUP BY empresaSlug
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    console.log(`\nDados de 28/4:`);
    if (faturamentos28.length === 0) {
      console.log(`  ⚠️ Nenhum faturamento em 28/4!`);
    } else {
      faturamentos28.forEach(f => {
        console.log(`  ${f.empresaSlug}: R$ ${parseFloat(f.total || 0).toFixed(2)}`);
      });
    }
    
  } finally {
    await connection.end();
  }
}

debugDia27AbrilDetalhado().catch(console.error);
