/**
 * Script simples para corrigir nomes dos profissionais
 * Executa: node --loader tsx server/fixProfissionaisSimpleScript.ts
 */

import { getDb } from "./db";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";

async function main() {
  try {
    console.log("[Fix Script] Iniciando correção de nomes...");

    const db = await getDb();
    if (!db) {
      console.error("[Fix Script] Falha ao conectar ao banco de dados");
      process.exit(1);
    }

    const tenantId = 1;

    // Mapa de mapeamento: profissionalId -> { nome, empresaSlug }
    const mapeamento: Record<string, { nome: string; empresaSlug: string }> = {
      "24720": { nome: "Vinicius", empresaSlug: "mascote" },
      "2603": { nome: "Vanilson", empresaSlug: "morumbi" },
      "39507": { nome: "Taissa", empresaSlug: "morumbi" },
      "12372": { nome: "Samuel", empresaSlug: "mascote" },
      "32423": { nome: "Renan", empresaSlug: "mascote" },
      "23104": { nome: "Recepção Morumbi", empresaSlug: "morumbi" },
      "23105": { nome: "Recepção Mascote", empresaSlug: "mascote" },
      "22435": { nome: "Neudo", empresaSlug: "mascote" },
      "35930": { nome: "Mirela", empresaSlug: "mascote" },
      "25571": { nome: "Mell", empresaSlug: "mascote" },
      "29459": { nome: "Karen", empresaSlug: "mascote" },
      "34337": { nome: "Kaleb", empresaSlug: "morumbi" },
      "587": { nome: "João", empresaSlug: "morumbi" },
      "40943": { nome: "Jô", empresaSlug: "mascote" },
      "23224": { nome: "Isabella", empresaSlug: "mascote" },
      "34288": { nome: "Felipe", empresaSlug: "mascote" },
      "580": { nome: "Fábio", empresaSlug: "morumbi" },
      "23173": { nome: "Emerson", empresaSlug: "mascote" },
      "34191": { nome: "Eduarda", empresaSlug: "mascote" },
      "22436": { nome: "Edinho", empresaSlug: "mascote" },
      "24784": { nome: "Dan", empresaSlug: "morumbi" },
      "585": { nome: "Cleison", empresaSlug: "mascote" },
      "19442": { nome: "Christian", empresaSlug: "mascote" },
      "24575": { nome: "Adailton", empresaSlug: "morumbi" },
    };

    console.log(`[Fix Script] Mapeamento de ${Object.keys(mapeamento).length} profissionais`);

    let totalAtualizados = 0;

    for (const [profId, { nome, empresaSlug }] of Object.entries(mapeamento)) {
      try {
        const resultado = await db
          .update(cashbarberAtendimentos)
          .set({
            profissionalNome: nome,
            empresaSlug: empresaSlug,
          })
          .where(
            and(
              eq(cashbarberAtendimentos.tenantId, tenantId),
              eq(cashbarberAtendimentos.profissionalId, profId)
            )
          );

        console.log(`[Fix Script] ✓ ${profId}: ${nome} -> ${empresaSlug}`);
        totalAtualizados++;
      } catch (erro) {
        console.error(`[Fix Script] ✗ Erro ao atualizar ${profId}:`, (erro as any).message);
      }
    }

    console.log(`\n[Fix Script] Total de profissionais atualizados: ${totalAtualizados}`);
    console.log("[Fix Script] Correção concluída!");
    process.exit(0);
  } catch (erro) {
    console.error("[Fix Script] Erro:", erro);
    process.exit(1);
  }
}

main();
