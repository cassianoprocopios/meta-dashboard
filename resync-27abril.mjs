import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function resyncDia27Abril() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    const data = '2026-04-27';
    
    console.log(`\n🔄 Resincronizando dados de ${data}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Deletar registros de 27/4 para resincronizar
    const [deleteResult] = await connection.query(
      `DELETE FROM faturamentos WHERE tenantId = ? AND data = ?`,
      [tenantId, data]
    );
    
    console.log(`\n✅ Deletados ${deleteResult.affectedRows} registros de ${data}`);
    
    // Chamar o endpoint de sincronização manual
    console.log(`\n📡 Chamando endpoint de sincronização...`);
    console.log(`  POST /api/trpc/cashbarber.sincronizar`);
    console.log(`  Payload: { empresaSlug: "MASCOTE", mes: 4, ano: 2026 }`);
    console.log(`  Payload: { empresaSlug: "MORUMBI", mes: 4, ano: 2026 }`);
    
    console.log(`\n⚠️ Nota: Você precisa chamar o endpoint manualmente via API ou UI`);
    console.log(`  ou executar o job de sincronização do CashBarber.`);
    
  } finally {
    await connection.end();
  }
}

resyncDia27Abril().catch(console.error);
