/**
 * Script para lançar os dados de faturamento da Seraphine para 01/04/2026
 * Dados do sistema Avec:
 * - Cabelo (cat1): R$ 1.050,00
 * - Manicure e Pedicure (cat2): R$ 2.549,00
 * - Sobrancelha (cat3): R$ 240,00
 * - Pacote (cat4): R$ 0,00
 * - Recorrência (cat5): R$ 0,00 (gerenciado pelo Dpote)
 * Total: R$ 3.839,00
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../.env") });

const db = await mysql.createConnection(process.env.DATABASE_URL);

// Dados do Avec para 01/04/2026
const DATA = "2026-04-01";
const EMPRESA_SLUG = "SERAPHINE";
const TENANT_ID = 1;

// Verificar se já existe um lançamento para essa data
const [existing] = await db.execute(
  "SELECT id, cat1, cat2, cat3, cat4, cat5 FROM faturamentos WHERE empresaSlug = ? AND data = ? AND tenantId = ?",
  [EMPRESA_SLUG, DATA, TENANT_ID]
);

console.log("=== Verificando lançamentos existentes ===");
if (existing.length > 0) {
  console.log("Já existe um lançamento para essa data:");
  console.log(existing[0]);
  console.log("\nAtualizando com os dados do Avec...");
  
  await db.execute(
    `UPDATE faturamentos SET 
      cat1 = ?, cat2 = ?, cat3 = ?, cat4 = ?, cat5 = ?,
      cat6 = '0', cat7 = '0', cat8 = '0',
      updatedAt = NOW()
     WHERE empresaSlug = ? AND data = ? AND tenantId = ?`,
    [
      "1050",   // cat1: Cabelo
      "2549",   // cat2: Manicure e Pedicure
      "240",    // cat3: Sobrancelha
      "0",      // cat4: Pacote
      "0",      // cat5: Recorrência (gerenciado pelo Dpote)
      EMPRESA_SLUG,
      DATA,
      TENANT_ID
    ]
  );
  console.log("Lançamento atualizado!");
} else {
  console.log("Nenhum lançamento existente. Criando novo...");
  
  // Buscar o tenantId correto
  const [empresa] = await db.execute(
    "SELECT id, tenantId FROM empresas WHERE slug = ?",
    [EMPRESA_SLUG]
  );
  
  if (empresa.length === 0) {
    console.error("Empresa SERAPHINE não encontrada!");
    await db.end();
    process.exit(1);
  }
  
  const tenantId = empresa[0].tenantId;
  console.log(`TenantId: ${tenantId}`);
  
  await db.execute(
    `INSERT INTO faturamentos 
      (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '0', '0', '0', '0', NOW(), NOW())`,
    [
      tenantId,
      EMPRESA_SLUG,
      DATA,
      "1050",   // cat1: Cabelo
      "2549",   // cat2: Manicure e Pedicure
      "240",    // cat3: Sobrancelha
      "0",      // cat4: Pacote
      "0",      // cat5: Recorrência (gerenciado pelo Dpote)
    ]
  );
  console.log("Lançamento criado!");
}

// Verificar o resultado
const [result] = await db.execute(
  "SELECT * FROM faturamentos WHERE empresaSlug = ? AND data = ? AND tenantId = ?",
  [EMPRESA_SLUG, DATA, TENANT_ID]
);

console.log("\n=== Lançamento final ===");
console.log(result[0]);

const total = parseFloat(result[0].cat1) + parseFloat(result[0].cat2) + parseFloat(result[0].cat3) + 
              parseFloat(result[0].cat4) + parseFloat(result[0].cat5);
console.log(`\nTotal: R$ ${total.toFixed(2)}`);
console.log("Esperado: R$ 3839.00");

await db.end();
console.log("\nScript concluído!");
