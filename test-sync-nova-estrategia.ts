import { sincronizarFaturamentoAvecPorData } from "./server/avecSincronizador";

async function test() {
  console.log("\n=== TESTE COM NOVA ESTRATÉGIA ===\n");
  try {
    const resultado = await sincronizarFaturamentoAvecPorData(1, "SERAPHINE", "2026-04-18", "2026-04-21");
    console.log("\n=== RESULTADO ===");
    if (Array.isArray(resultado)) {
      resultado.forEach(r => {
        console.log(`${r.data}: Total R$${r.total} (Serv: R$${r.cat1}, Pac: R$${r.cat2}, Prod: R$${r.cat3}, Caix: R$${r.cat4})`);
      });
    } else {
      console.log("Erro:", resultado);
    }
  } catch (e) {
    console.error("ERRO:", e instanceof Error ? e.message : String(e));
  }
  process.exit(0);
}

test();
