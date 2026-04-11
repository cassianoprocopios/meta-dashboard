import { createConnection } from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

await conn.execute(`
  CREATE TABLE IF NOT EXISTS bonificacaoHistorico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenantId INT NOT NULL,
    empresaSlug VARCHAR(64) NOT NULL,
    mes INT NOT NULL,
    ano INT NOT NULL,
    faturamentoTotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    metaMensal DECIMAL(12,2) NOT NULL DEFAULT 0,
    superMeta DECIMAL(12,2) NOT NULL DEFAULT 0,
    atingiuMeta TINYINT NOT NULL DEFAULT 0,
    atingiuSuperMeta TINYINT NOT NULL DEFAULT 0,
    valorQuinzenal DECIMAL(12,2) NOT NULL DEFAULT 0,
    valorMensal DECIMAL(12,2) NOT NULL DEFAULT 0,
    valorSuperMeta DECIMAL(12,2) NOT NULL DEFAULT 0,
    totalPago DECIMAL(12,2) NOT NULL DEFAULT 0,
    observacao VARCHAR(500),
    pagoEm TIMESTAMP NULL,
    createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_tenant_empresa_mes_ano (tenantId, empresaSlug, mes, ano)
  )
`);

console.log("✅ Tabela bonificacaoHistorico criada com sucesso!");
await conn.end();
