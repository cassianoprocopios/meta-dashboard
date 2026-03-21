/**
 * migrate-empresa-vinculada.mjs
 *
 * Migração: converte o campo legado `empresaVinculada` (coluna única na tabela `users`)
 * para vínculos N:N na tabela `userEmpresas`.
 *
 * Comportamento:
 *  - Idempotente: pode ser executado múltiplas vezes sem duplicar dados
 *  - Dry-run: passe --dry-run para simular sem alterar o banco
 *  - Preserva vínculos existentes em userEmpresas (não sobrescreve)
 *  - Limpa empresaVinculada=NULL após migrar com sucesso
 *
 * Uso:
 *   node scripts/migrate-empresa-vinculada.mjs           # executa a migração
 *   node scripts/migrate-empresa-vinculada.mjs --dry-run # simula sem alterar
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const DRY_RUN = process.argv.includes("--dry-run");

const log = {
  info: (msg) => console.log(`[INFO]  ${msg}`),
  ok: (msg) => console.log(`[OK]    ${msg}`),
  skip: (msg) => console.log(`[SKIP]  ${msg}`),
  warn: (msg) => console.warn(`[WARN]  ${msg}`),
  error: (msg) => console.error(`[ERROR] ${msg}`),
};

async function main() {
  console.log("=".repeat(60));
  console.log(" Migração: empresaVinculada → userEmpresas");
  console.log(DRY_RUN ? " MODO: DRY-RUN (nenhuma alteração será feita)" : " MODO: EXECUÇÃO REAL");
  console.log("=".repeat(60));
  console.log();

  const db = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    // ── 1. Buscar todos os usuários com empresaVinculada preenchido ──────────
    const [legados] = await db.execute(
      `SELECT u.id, u.name, u.email, u.empresaVinculada, u.tenantId
       FROM users u
       WHERE u.empresaVinculada IS NOT NULL
       ORDER BY u.tenantId, u.id`
    );

    log.info(`Usuários com campo legado encontrados: ${legados.length}`);
    console.log();

    if (legados.length === 0) {
      log.ok("Nenhum usuário legado encontrado. Banco já está migrado.");
      return;
    }

    let migrados = 0;
    let pulados = 0;
    let erros = 0;

    // ── 2. Para cada usuário legado, criar vínculo em userEmpresas ───────────
    for (const user of legados) {
      const { id, name, email, empresaVinculada, tenantId } = user;

      try {
        // Verificar se já existe vínculo para este slug em userEmpresas
        const [existentes] = await db.execute(
          `SELECT id FROM userEmpresas WHERE userId = ? AND empresaSlug = ?`,
          [id, empresaVinculada]
        );

        if (existentes.length > 0) {
          log.skip(`Usuário #${id} (${email}) → ${empresaVinculada} já existe em userEmpresas`);
          // Mesmo assim, limpar o campo legado
          if (!DRY_RUN) {
            await db.execute(
              `UPDATE users SET empresaVinculada = NULL, updatedAt = NOW() WHERE id = ?`,
              [id]
            );
          }
          pulados++;
          continue;
        }

        log.info(`Migrando usuário #${id} (${name ?? email}) → ${empresaVinculada} [tenant ${tenantId}]`);

        if (!DRY_RUN) {
          // Inserir vínculo N:N
          await db.execute(
            `INSERT INTO userEmpresas (userId, tenantId, empresaSlug, createdAt)
             VALUES (?, ?, ?, NOW())`,
            [id, tenantId, empresaVinculada]
          );

          // Limpar campo legado
          await db.execute(
            `UPDATE users SET empresaVinculada = NULL, updatedAt = NOW() WHERE id = ?`,
            [id]
          );
        }

        log.ok(`  ✓ Vínculo criado: user #${id} → ${empresaVinculada}`);
        migrados++;
      } catch (err) {
        log.error(`Falha ao migrar usuário #${id} (${email}): ${err.message}`);
        erros++;
      }
    }

    // ── 3. Relatório final ───────────────────────────────────────────────────
    console.log();
    console.log("=".repeat(60));
    console.log(" Relatório Final");
    console.log("=".repeat(60));
    console.log(`  Total legados encontrados : ${legados.length}`);
    console.log(`  Migrados com sucesso      : ${migrados}`);
    console.log(`  Pulados (já existiam)     : ${pulados}`);
    console.log(`  Erros                     : ${erros}`);
    if (DRY_RUN) {
      console.log();
      console.log("  [DRY-RUN] Nenhuma alteração foi feita no banco.");
      console.log("  Execute sem --dry-run para aplicar a migração.");
    }
    console.log("=".repeat(60));

    if (erros > 0) {
      process.exit(1);
    }
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  log.error(`Erro fatal: ${err.message}`);
  process.exit(1);
});
