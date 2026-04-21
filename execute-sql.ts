import mysql from 'mysql2/promise';

async function createTable() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'localhost',
    user: process.env.DATABASE_URL?.split('://')[1]?.split(':')[0] || 'root',
    password: process.env.DATABASE_URL?.split(':')[2]?.split('@')[0] || '',
    database: process.env.DATABASE_URL?.split('/').pop() || 'meta_db',
  });

  try {
    const sql = `
CREATE TABLE IF NOT EXISTS \`avecRetry\` (
  \`id\` int NOT NULL AUTO_INCREMENT PRIMARY KEY,
  \`tenantId\` int NOT NULL,
  \`empresaSlug\` varchar(64) NOT NULL,
  \`data\` varchar(10) NOT NULL,
  \`tentativas\` int NOT NULL DEFAULT 0,
  \`ultimaTentativa\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`status\` varchar(16) NOT NULL DEFAULT 'pendente',
  \`erroMensagem\` text,
  \`createdAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  \`updatedAt\` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY \`idx_tenant_empresa\` (\`tenantId\`, \`empresaSlug\`),
  KEY \`idx_status\` (\`status\`)
);
    `;
    
    await connection.query(sql);
    console.log('✅ Tabela avecRetry criada com sucesso');
  } finally {
    await connection.end();
  }
}

createTable().catch(console.error);
