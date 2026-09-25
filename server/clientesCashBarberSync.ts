import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { sincronizarClientesCashbarberPeriodo } from "./clientesCashbarberService";

export const clientesCashBarberSyncRouter = router({
  /** Sincroniza clientes distintos diretamente do Relatório 09 oficial. */
  sincronizarPeriodo: protectedProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) {
        return { sucesso: false as const, erro: "Tenant não identificado" };
      }

      try {
        const resultado = await sincronizarClientesCashbarberPeriodo(
          tenantId,
          input.mes,
          input.ano
        );

        return {
          sucesso: true as const,
          mes: input.mes,
          ano: input.ano,
          unidades: resultado.unidades.map((unidade) => ({
            ...unidade,
            clientesPorServico: {},
          })),
          totalGeral: resultado.totalGeral,
          fonte: "cashbarber_relatorio09" as const,
        };
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : "Erro desconhecido";
        console.error("[CashBarber Clientes] Erro ao sincronizar Relatório 09:", mensagem);
        return { sucesso: false as const, erro: mensagem };
      }
    }),
});
