/**
 * Script para recalcular o ranking de profissionais do mês atual
 * aplicando os critérios de exclusão: Avulso/Clube, Caixinha e Bar
 *
 * Uso: node scripts/recalcular-ranking.mjs
 */
import { createRequire } from "module";
import { config } from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(__dirname, "../.env") });

// Importar via tsx/ts-node não é possível em .mjs puro — usar a API REST local
const BASE_URL = "http://localhost:3000";

async function main() {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  console.log(`\n🔄 Iniciando recálculo do ranking — ${meses[mes - 1]}/${ano}`);
  console.log("─".repeat(55));

  // Verificar se o servidor está rodando
  try {
    const health = await fetch(`${BASE_URL}/api/trpc/auth.me?batch=1&input=${encodeURIComponent(JSON.stringify({"0":{"json":null}}))}`);
    if (!health.ok) throw new Error(`Servidor retornou ${health.status}`);
    console.log("✅ Servidor acessível");
  } catch (e) {
    console.error("❌ Servidor não está acessível:", e.message);
    console.log("\nO recálculo deve ser feito pelo botão 'Recalcular Ranking' na sidebar do dashboard.");
    process.exit(1);
  }

  console.log("\n⚠️  Para executar o recálculo, use o botão 'Recalcular Ranking' na sidebar do dashboard.");
  console.log("   O recálculo requer autenticação de usuário e não pode ser feito via script sem sessão ativa.");
  console.log("\n   Alternativamente, o job horário do CashBarber já aplica os critérios de exclusão");
  console.log("   automaticamente na próxima sincronização.");
}

main().catch(console.error);
