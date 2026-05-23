// Script para acionar o sync do Avec para o dia 21/05 da Seraphine
import { createRequire } from "module";
import { register } from "tsx/esm/api";

register();

const { sincronizarFaturamentoAvecPorData } = await import("../server/avecSincronizador.ts");

const TENANT_ID = 1; // ajustar se necessário
const EMPRESA_SLUG = "barbiero-seraphine";
const DATA = "2026-05-21";

console.log(`\n[Sync Avec] Iniciando sync de ${EMPRESA_SLUG} para ${DATA}...`);

try {
  const resultado = await sincronizarFaturamentoAvecPorData(TENANT_ID, EMPRESA_SLUG, DATA, DATA);
  console.log("\n[Sync Avec] Resultado:");
  console.log(JSON.stringify(resultado, null, 2));
} catch (err) {
  console.error("[Sync Avec] Erro:", err);
}

process.exit(0);
