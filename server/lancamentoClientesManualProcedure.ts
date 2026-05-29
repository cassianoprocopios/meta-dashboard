import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const lancamentoClientesManualRouter = router({
  /**
   * Lança dados de clientes manualmente para um período específico
   */
  lancarClientesMes: protectedProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
        morumbi: z.number().min(0),
        mascote: z.number().min(0),
        seraphine: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }: any) => {
      try {
        const tenantId = ctx.user?.tenantId || 1;
        const { cashbarberAtendimentos } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const { getDb } = await import("./db");
        const db = await getDb();
        
        console.log(`[Lançamento Manual] Lançando clientes para ${input.mes}/${input.ano}...`);
        
        // Deletar dados existentes para este período
        await (db!)
          .delete(cashbarberAtendimentos)
          .where(
            and(
              eq(cashbarberAtendimentos.tenantId, tenantId),
              eq(cashbarberAtendimentos.mes, input.mes),
              eq(cashbarberAtendimentos.ano, input.ano)
            )
          );
        
        const registros: any[] = [];
        
        // Gerar registros para Morumbi
        if (input.morumbi > 0) {
          for (let i = 0; i < input.morumbi; i++) {
            registros.push({
              tenantId,
              empresaSlug: "morumbi",
              clienteId: `CLI_MORUMBI_${input.mes}_${input.ano}_${i}`,
              clienteNome: `Cliente Morumbi ${i + 1}`,
              profissionalId: `PROF_${(i % 5) + 1}`,
              profissionalNome: `Profissional ${(i % 5) + 1}`,
              servicoTipo: ["Corte", "Barba", "Pacote"][i % 3],
              valor: (50 + (i % 150)).toFixed(2),
              dataAtendimento: new Date(input.ano, input.mes - 1, (i % 28) + 1)
                .toISOString()
                .split("T")[0],
              horaAtendimento: `${String((i % 24)).padStart(2, "0")}:${String((i % 60)).padStart(2, "0")}:00`,
              status: "concluido",
              mes: input.mes,
              ano: input.ano,
              sincronizadoEm: new Date(),
            });
          }
        }
        
        // Gerar registros para Mascote
        if (input.mascote > 0) {
          for (let i = 0; i < input.mascote; i++) {
            registros.push({
              tenantId,
              empresaSlug: "mascote",
              clienteId: `CLI_MASCOTE_${input.mes}_${input.ano}_${i}`,
              clienteNome: `Cliente Mascote ${i + 1}`,
              profissionalId: `PROF_${(i % 5) + 1}`,
              profissionalNome: `Profissional ${(i % 5) + 1}`,
              servicoTipo: ["Corte", "Barba", "Pacote"][i % 3],
              valor: (50 + (i % 150)).toFixed(2),
              dataAtendimento: new Date(input.ano, input.mes - 1, (i % 28) + 1)
                .toISOString()
                .split("T")[0],
              horaAtendimento: `${String((i % 24)).padStart(2, "0")}:${String((i % 60)).padStart(2, "0")}:00`,
              status: "concluido",
              mes: input.mes,
              ano: input.ano,
              sincronizadoEm: new Date(),
            });
          }
        }
        
        // Gerar registros para Seraphine
        if (input.seraphine && input.seraphine > 0) {
          for (let i = 0; i < input.seraphine; i++) {
            registros.push({
              tenantId,
              empresaSlug: "seraphine",
              clienteId: `CLI_SERAPHINE_${input.mes}_${input.ano}_${i}`,
              clienteNome: `Cliente Seraphine ${i + 1}`,
              profissionalId: `PROF_${(i % 5) + 1}`,
              profissionalNome: `Profissional ${(i % 5) + 1}`,
              servicoTipo: ["Corte", "Barba", "Pacote"][i % 3],
              valor: (50 + (i % 150)).toFixed(2),
              dataAtendimento: new Date(input.ano, input.mes - 1, (i % 28) + 1)
                .toISOString()
                .split("T")[0],
              horaAtendimento: `${String((i % 24)).padStart(2, "0")}:${String((i % 60)).padStart(2, "0")}:00`,
              status: "concluido",
              mes: input.mes,
              ano: input.ano,
              sincronizadoEm: new Date(),
            });
          }
        }
        
        // Inserir registros
        if (registros.length > 0) {
          await (db!).insert(cashbarberAtendimentos).values(registros);
        }
        
        return {
          sucesso: true,
          mes: input.mes,
          ano: input.ano,
          dados: {
            morumbi: input.morumbi,
            mascote: input.mascote,
            seraphine: input.seraphine || 0,
          },
          registrosInseridos: registros.length,
          mensagem: `${registros.length} registros de clientes lançados com sucesso para ${input.mes}/${input.ano}`,
        };
      } catch (error) {
        console.error("[Lançamento Manual] Erro:", error);
        return {
          sucesso: false,
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),

  /**
   * Lista dados de clientes já lançados para um período
   */
  obterClientesMes: protectedProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ ctx, input }: any) => {
      try {
        const tenantId = ctx.user?.tenantId || 1;
        const { cashbarberAtendimentos } = await import("../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");
        const { getDb } = await import("./db");
        const db = await getDb();
        
        const registros = await (db!)
          .select()
          .from(cashbarberAtendimentos)
          .where(
            and(
              eq(cashbarberAtendimentos.tenantId, tenantId),
              eq(cashbarberAtendimentos.mes, input.mes),
              eq(cashbarberAtendimentos.ano, input.ano)
            )
          );
        
        // Contar clientes por unidade
        const morumbi = registros.filter((r: any) => r.empresaSlug === "morumbi").length;
        const mascote = registros.filter((r: any) => r.empresaSlug === "mascote").length;
        const seraphine = registros.filter((r: any) => r.empresaSlug === "seraphine").length;
        
        return {
          mes: input.mes,
          ano: input.ano,
          morumbi,
          mascote,
          seraphine,
          total: registros.length,
        };
      } catch (error) {
        console.error("[Obter Clientes] Erro:", error);
        return {
          erro: error instanceof Error ? error.message : "Erro desconhecido",
        };
      }
    }),
});
