/**
 * Script para corrigir nomes e empresaSlug dos profissionais
 * Executa: node --loader tsx server/fixProfissionaisScript.ts
 */

import { getDb, listCashbarberConfigs } from "./db";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { cashbarberLogin, cashbarberListarBarbeirosAtivos } from "./cashbarber";

async function main() {
  try {
    console.log("[Fix Script] Iniciando correção de nomes e empresaSlug...");

    const db = await getDb();
    if (!db) {
      console.error("[Fix Script] Falha ao conectar ao banco de dados");
      process.exit(1);
    }

    const tenantId = 1; // Tenant principal

    // 1. Buscar configurações do CashBarber
    const configs = await listCashbarberConfigs(tenantId);
    console.log(`[Fix Script] Encontradas ${configs.length} configuração(ões)`);

    // Mapa de profissionalId (string) -> nome real
    const profissionalMap = new Map<string, { nome: string; empresaSlug: string }>();

    // 2. Para cada configuração, buscar profissionais
    for (const config of configs) {
      console.log(`\n[Fix Script] Processando ${config.empresaSlug}...`);

      const token = await cashbarberLogin(config.cbEmail!, config.cbSenha!);
      if (!token) {
        console.warn(`[Fix Script] Falha ao fazer login para ${config.empresaSlug}`);
        continue;
      }

      const profissionaisAtivos = await cashbarberListarBarbeirosAtivos(token);
      if (!profissionaisAtivos) {
        console.warn(`[Fix Script] Nenhum profissional encontrado para ${config.empresaSlug}`);
        continue;
      }

      profissionaisAtivos.forEach((prof) => {
        // Mapear para o empresaSlug correto
        let empresaSlug = config.empresaSlug;
        
        // Se estiver em barbiero-seraphine (que é "BARBIERO GRUPO"), verificar se deve estar em morumbi
        if (config.empresaSlug === "barbiero-seraphine") {
          // Profissionais que devem estar em morumbi
          const profissionaisMorumbi = [
            "Adailton", "Dan", "Fábio", "João", "Kaleb", "Taissa", "Vanilson"
          ];
          
          if (profissionaisMorumbi.includes(prof.usu_name)) {
            empresaSlug = "morumbi";
          } else {
            // Cassiano e Daniela ficam em mascote (que é o grupo)
            empresaSlug = "mascote";
          }
        }
        
        profissionalMap.set(prof.id.toString(), {
          nome: prof.usu_name,
          empresaSlug: empresaSlug,
        });
      });
    }

    console.log(`\n[Fix Script] Mapa de profissionais: ${profissionalMap.size} profissionais`);
    Array.from(profissionalMap.entries()).forEach(([id, v]) => {
      console.log(`  ${id} -> ${v.nome} (${v.empresaSlug})`);
    });

    // 3. Atualizar atendimentos com nomes corretos
    let totalAtualizados = 0;

    for (const [profId, { nome, empresaSlug }] of Array.from(profissionalMap.entries())) {
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

        console.log(`[Fix Script] Atualizado profissionalId ${profId}: ${nome} -> ${empresaSlug}`);
        totalAtualizados++;
      } catch (erro) {
        console.error(`[Fix Script] Erro ao atualizar profissionalId ${profId}:`, erro);
      }
    }

    console.log(`\n[Fix Script] Total de profissionais atualizados: ${totalAtualizados}`);
    console.log("[Fix Script] Correção concluída com sucesso!");
    process.exit(0);
  } catch (erro) {
    console.error("[Fix Script] Erro:", erro);
    process.exit(1);
  }
}

main();
