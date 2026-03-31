import { aplicarDpoteParaTenant } from "../server/cashbarberSincronizador.js";

const mes = 3;
const ano = 2026;
console.log(`Disparando Dpote para tenant 1, mês ${mes}/${ano}...`);

try {
  const resultado = await aplicarDpoteParaTenant(1, mes, ano);
  console.log("Resultado:", JSON.stringify(resultado, null, 2));
  process.exit(0);
} catch (e: any) {
  console.error("Erro:", e.message);
  process.exit(1);
}
