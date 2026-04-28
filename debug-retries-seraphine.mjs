import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function verificarRetries() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    const tenantId = 1;
    const empresaSlug = 'SERAPHINE';
    
    console.log(`\n📊 Verificando retries pendentes de ${empresaSlug}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    // Verificar se a tabela avecRetry existe
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'avecRetry'`
    );
    
    if (tables.length === 0) {
      console.log(`\n❌ Tabela avecRetry não existe`);
      return;
    }
    
    // Buscar retries pendentes
    const [retries] = await connection.query(
      `SELECT * FROM avecRetry 
       WHERE tenantId = ? AND empresaSlug = ?
       ORDER BY data DESC`,
      [tenantId, empresaSlug]
    );
    
    console.log(`\n✅ Retries encontrados: ${retries.length}`);
    
    if (retries.length === 0) {
      console.log(`\nNenhum retry pendente para ${empresaSlug}`);
    } else {
      retries.forEach(r => {
        console.log(`\nData: ${r.data}`);
        console.log(`  Status: ${r.status}`);
        console.log(`  Tentativas: ${r.tentativas}`);
        console.log(`  Última tentativa: ${new Date(r.ultimaTentativaEm).toLocaleString('pt-BR')}`);
        console.log(`  Próxima tentativa: ${new Date(r.proximaTentativaEm).toLocaleString('pt-BR')}`);
        console.log(`  Erro: ${r.erroMensagem}`);
      });
    }
    
    // Verificar especificamente dias 25 e 28
    console.log(`\n📅 Verificando especificamente dias 25 e 28...`);
    const [dia25] = await connection.query(
      `SELECT * FROM avecRetry 
       WHERE tenantId = ? AND empresaSlug = ? AND data = '2026-04-25'`,
      [tenantId, empresaSlug]
    );
    
    const [dia28] = await connection.query(
      `SELECT * FROM avecRetry 
       WHERE tenantId = ? AND empresaSlug = ? AND data = '2026-04-28'`,
      [tenantId, empresaSlug]
    );
    
    console.log(`\nDia 25/4: ${dia25.length > 0 ? '✅ Retry encontrado' : '❌ Sem retry'}`);
    if (dia25.length > 0) {
      console.log(`  Status: ${dia25[0].status}`);
      console.log(`  Tentativas: ${dia25[0].tentativas}`);
    }
    
    console.log(`\nDia 28/4: ${dia28.length > 0 ? '✅ Retry encontrado' : '❌ Sem retry'}`);
    if (dia28.length > 0) {
      console.log(`  Status: ${dia28[0].status}`);
      console.log(`  Tentativas: ${dia28[0].tentativas}`);
    }
    
  } finally {
    await connection.end();
  }
}

verificarRetries().catch(console.error);
