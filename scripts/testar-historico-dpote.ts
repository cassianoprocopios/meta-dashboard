/**
 * Script para testar o histórico Dpote #68704 e verificar o valor atual
 * Executar: npx tsx scripts/testar-historico-dpote.ts
 */
import "dotenv/config";
import { cashbarberLogin, cashbarberBuscarValorAssinaturas, cashbarberCalcularDpotePorFichas } from "../server/cashbarber";
import { getCashbarberConfig } from "../server/db";
import { getDb } from "../server/db";
import { tenants } from "../drizzle/schema";

async function main() {
  const db = await getDb();
  const allTenants = await db.select().from(tenants).limit(1);
  const tenantId = allTenants[0].id;

  // Buscar config da MASCOTE para obter credenciais
  const config = await getCashbarberConfig(tenantId, "MASCOTE");
  if (!config?.cbEmail || !config?.cbSenha) {
    console.error("Config não encontrada");
    process.exit(1);
  }

  console.log("Fazendo login no CashBarber...");
  const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
  if (!token) {
    console.error("Falha no login");
    process.exit(1);
  }

  const historicoId = 68704;
  console.log(`\nBuscando histórico Dpote #${historicoId}...`);
  const dados = await cashbarberBuscarValorAssinaturas(token, historicoId);
  if (!dados) {
    console.error(`Histórico #${historicoId} não retornou dados`);
    process.exit(1);
  }

  console.log(`\n=== HISTÓRICO DPOTE #${historicoId} ===`);
  console.log(`Valor total assinaturas: R$ ${dados.valorAssinaturas.toFixed(2)}`);
  console.log(`Porcentagem barbearia: ${dados.porcentagemBarbearia}%`);

  // Calcular distribuição por filial
  const hoje = new Date();
  const dataFinal = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const dataInicial = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-01`;

  console.log(`\nCalculando distribuição por filial (${dataInicial} a ${dataFinal})...`);
  const resultados = await cashbarberCalcularDpotePorFichas(
    token, dataInicial, dataFinal, dados.valorAssinaturas, dados.porcentagemBarbearia
  );

  console.log(`\n=== DISTRIBUIÇÃO POR FILIAL ===`);
  for (const r of resultados) {
    const diasRealizados = hoje.getDate();
    const valorDiario = r.valorDistribuido / diasRealizados;
    console.log(`${r.filialNome}: R$ ${r.valorDistribuido.toFixed(2)} total | R$ ${valorDiario.toFixed(2)}/dia × ${diasRealizados} dias`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
