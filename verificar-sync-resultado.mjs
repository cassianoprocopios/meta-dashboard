import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarSyncResultado() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    const data = '2026-04-27';
    
    console.log(`\n📊 Verificando resultado da sincronização de ${data}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Buscar dados de 27/4
    const [faturamentos] = await connection.query(
      `SELECT empresaSlug, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9,
              (cat1+cat2+cat3+cat4+cat5+cat6+cat7+cat8+cat9) as total
       FROM faturamentos 
       WHERE tenantId = ? AND data = ?
       ORDER BY empresaSlug`,
      [tenantId, data]
    );
    
    if (faturamentos.length === 0) {
      console.log(`\n❌ Nenhum registro encontrado para ${data}`);
      return;
    }
    
    console.log(`\n✅ Registros encontrados: ${faturamentos.length}`);
    
    faturamentos.forEach(f => {
      const cat1a8 = parseFloat(f.cat1 || 0) + parseFloat(f.cat2 || 0) + parseFloat(f.cat3 || 0) + 
                    parseFloat(f.cat4 || 0) + parseFloat(f.cat5 || 0) + parseFloat(f.cat6 || 0) + 
                    parseFloat(f.cat7 || 0) + parseFloat(f.cat8 || 0);
      
      console.log(`\n${f.empresaSlug}:`);
      console.log(`  cat1-cat8: R$ ${cat1a8.toFixed(2)}`);
      console.log(`  cat9: R$ ${parseFloat(f.cat9 || 0).toFixed(2)}`);
      console.log(`  TOTAL: R$ ${parseFloat(f.total || 0).toFixed(2)}`);
      
      if (cat1a8 === 0 && parseFloat(f.cat9) > 0) {
        console.log(`  ⚠️ PROBLEMA: Apenas cat9 tem valor!`);
      } else if (cat1a8 > 0) {
        console.log(`  ✅ Dados sincronizados corretamente`);
      }
    });
    
    // Verificar quantos dias foram sincronizados
    console.log(`\n📅 Verificando quantos dias foram sincronizados em abril...`);
    const [diasSincronizados] = await connection.query(
      `SELECT empresaSlug, COUNT(*) as qtd, MIN(data) as primeiro, MAX(data) as ultimo
       FROM faturamentos 
       WHERE tenantId = ? AND data BETWEEN '2026-04-01' AND '2026-04-30'
       GROUP BY empresaSlug
       ORDER BY empresaSlug`,
      [tenantId]
    );
    
    diasSincronizados.forEach(d => {
      console.log(`\n${d.empresaSlug}: ${d.qtd} dias (${d.primeiro} a ${d.ultimo})`);
    });
    
  } finally {
    await connection.end();
  }
}

verificarSyncResultado().catch(console.error);
