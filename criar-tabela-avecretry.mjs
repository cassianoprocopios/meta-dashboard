import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function criarTabela() {
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  
  try {
    console.log(`\n📊 Criando tabela avecRetry...`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    
    const sql = `
      CREATE TABLE IF NOT EXISTS avecRetry (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        empresaSlug VARCHAR(64) NOT NULL,
        data VARCHAR(10) NOT NULL,
        tentativas INT NOT NULL DEFAULT 0,
        ultimaTentativa TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        status VARCHAR(16) NOT NULL DEFAULT 'pendente',
        erroMensagem TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
        UNIQUE KEY unique_retry (tenantId, empresaSlug, data)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await connection.query(sql);
    console.log(`\n✅ Tabela avecRetry criada com sucesso!`);
    
  } catch (err) {
    if (err.code === 'ER_TABLE_EXISTS_ERROR') {
      console.log(`\n✅ Tabela avecRetry já existe`);
    } else {
      console.error(`\n❌ Erro ao criar tabela:`, err.message);
    }
  } finally {
    await connection.end();
  }
}

criarTabela().catch(console.error);
