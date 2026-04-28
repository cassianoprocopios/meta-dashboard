import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function resyncDirectDB() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    const data = '2026-04-27';
    
    console.log(`\n🔄 Resincronizando dados de ${data} - Deletando registros antigos`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Deletar registros de 27/4 em diante para Mascote e Morumbi
    const [deleteResult] = await connection.query(
      `DELETE FROM faturamentos 
       WHERE tenantId = ? AND data >= ? AND empresaSlug IN ('MASCOTE', 'MORUMBI')`,
      [tenantId, data]
    );
    
    console.log(`\n✅ Deletados ${deleteResult.affectedRows} registros de ${data} em diante`);
    console.log(`\n⚠️ IMPORTANTE: Você precisa executar a sincronização manualmente!`);
    console.log(`\nOpções:`);
    console.log(`1. Clique em "Sincronizar Tudo" na UI do dashboard`);
    console.log(`2. Execute o job de sincronização do CashBarber (próximo agendamento: 7h e 18h BRT)`);
    console.log(`3. Chame o endpoint tRPC autenticado: POST /api/trpc/cashbarber.sincronizar`);
    
    console.log(`\n📊 Verificando dados após deleção...`);
    const [remaining] = await connection.query(
      `SELECT empresaSlug, COUNT(*) as qtd FROM faturamentos 
       WHERE tenantId = ? AND data >= '2026-04-20'
       GROUP BY empresaSlug`,
      [tenantId]
    );
    
    console.log(`\nDados restantes em 20/4 ou posterior:`);
    remaining.forEach(r => {
      console.log(`  ${r.empresaSlug}: ${r.qtd} registros`);
    });
    
  } finally {
    await connection.end();
  }
}

resyncDirectDB().catch(console.error);
