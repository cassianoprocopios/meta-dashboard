/**
 * Script para aplicar os valores de Recorrência de Março 2026
 * com base no histórico Dpote #68544 diretamente no banco.
 *
 * Histórico #68544:
 *   - Total assinaturas: R$ 73.171,20
 *   - Morumbi/Vila Andrade: 56.030 fichas (70,05%) = R$ 51.256,89
 *   - Mascote: 23.955 fichas (29,95%) = R$ 21.914,31
 *
 * Lógica (Opção C): cada dia de 1 a 26 (hoje) recebe valor_total ÷ 31 dias.
 * Dias 27-31 ficam com "0".
 */

import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("DATABASE_URL não encontrada no .env");
  process.exit(1);
}

// Dados do histórico #68544
const HISTORICO_ID = 68544;
const VALOR_TOTAL = 73171.20;
const DIAS_MARCO = 31;
const HOJE = 26; // dia 26 de março de 2026
const VALOR_DIARIO = VALOR_TOTAL / DIAS_MARCO;

const DISTRIBUICAO = {
  MORUMBI: { fichas: 56030, pct: 70.05, valorTotal: 51256.89 },
  MASCOTE: { fichas: 23955, pct: 29.95, valorTotal: 21914.31 },
};

const ANO = 2026;
const MES = 3;

async function main() {
  const conn = await createConnection(DB_URL);
  console.log("Conectado ao banco.");

  try {
    // Buscar tenantId e configurações das empresas
    const [configs] = await conn.execute(
      "SELECT empresaSlug, tenantId, dpoteFilialNome FROM cashbarberConfig WHERE dpoteFilialNome IS NOT NULL"
    );

    if (!configs.length) {
      console.error("Nenhuma configuração CashBarber com dpoteFilialNome encontrada.");
      process.exit(1);
    }

    const tenantId = configs[0].tenantId;
    console.log(`TenantId: ${tenantId}`);
    console.log(`Histórico: #${HISTORICO_ID} | Total: R$ ${VALOR_TOTAL.toFixed(2)} | Dias: ${DIAS_MARCO} | Valor diário: R$ ${VALOR_DIARIO.toFixed(2)}`);
    console.log(`Aplicando dias 1 a ${HOJE} com valor diário, dias ${HOJE + 1} a ${DIAS_MARCO} com R$ 0\n`);

    for (const config of configs) {
      const slug = config.empresaSlug;
      const dist = DISTRIBUICAO[slug];
      if (!dist) {
        console.log(`[SKIP] ${slug}: não encontrado na distribuição`);
        continue;
      }

      const valorDiario = dist.valorTotal / DIAS_MARCO;
      console.log(`\n=== ${slug} ===`);
      console.log(`  Valor total: R$ ${dist.valorTotal.toFixed(2)} | Valor diário: R$ ${valorDiario.toFixed(2)}`);

      let atualizados = 0;
      let inseridos = 0;

      for (let dia = 1; dia <= DIAS_MARCO; dia++) {
        const dataStr = `${ANO}-${String(MES).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
        const cat9Valor = dia <= HOJE ? valorDiario.toFixed(2) : "0";

        // Verificar se existe registro para esse dia
        const [rows] = await conn.execute(
          "SELECT id, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, sincronizadoCB, observacao, lancadoPor FROM faturamentos WHERE data = ? AND empresaSlug = ? AND tenantId = ?",
          [dataStr, slug, tenantId]
        );

        if (rows.length > 0) {
          const existente = rows[0];
          await conn.execute(
            "UPDATE faturamentos SET cat9 = ? WHERE id = ?",
            [cat9Valor, existente.id]
          );
          atualizados++;
        } else {
          // Só inserir se o valor for > 0 (não criar registros vazios para dias futuros)
          if (parseFloat(cat9Valor) > 0) {
            await conn.execute(
              "INSERT INTO faturamentos (tenantId, empresaSlug, data, cat1, cat2, cat3, cat4, cat5, cat6, cat7, cat8, cat9, sincronizadoCB) VALUES (?, ?, ?, '0', '0', '0', '0', '0', '0', '0', '0', ?, 0)",
              [tenantId, slug, dataStr, cat9Valor]
            );
            inseridos++;
          }
        }
      }

      console.log(`  Atualizados: ${atualizados} | Inseridos: ${inseridos}`);

      // Atualizar dpoteHistoricoId e dpoteValorAssinaturas no cashbarberConfig
      await conn.execute(
        "UPDATE cashbarberConfig SET dpoteHistoricoId = ?, dpoteValorAssinaturas = ?, dpoteHistoricoMes = ? WHERE empresaSlug = ? AND tenantId = ?",
        [HISTORICO_ID, VALOR_TOTAL, `${ANO}-${String(MES).padStart(2, "0")}`, slug, tenantId]
      );
      console.log(`  Config atualizada: dpoteHistoricoId=${HISTORICO_ID}, dpoteValorAssinaturas=${VALOR_TOTAL}`);
    }

    // Verificar resultado final
    console.log("\n=== VERIFICAÇÃO FINAL ===");
    for (const slug of ["MORUMBI", "MASCOTE"]) {
      const [rows] = await conn.execute(
        "SELECT data, cat9 FROM faturamentos WHERE empresaSlug = ? AND tenantId = ? AND data >= '2026-03-01' AND data <= '2026-03-31' ORDER BY data",
        [slug, tenantId]
      );
      const soma = rows.reduce((acc, r) => acc + parseFloat(r.cat9 || "0"), 0);
      console.log(`${slug}: ${rows.length} registros | Soma cat9 = R$ ${soma.toFixed(2)} (esperado: R$ ${DISTRIBUICAO[slug]?.valorTotal.toFixed(2)})`);
    }

  } finally {
    await conn.end();
    console.log("\nConexão encerrada.");
  }
}

main().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
