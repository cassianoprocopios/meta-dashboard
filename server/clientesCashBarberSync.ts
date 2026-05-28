import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { extrairClientesTodosUnidades, fecharBrowser } from "./cashbarberClientesScraper";

async function getTenantIdFromCtx(ctx: any): Promise<number> {
  if (ctx.user?.tenantId) return ctx.user.tenantId;
  throw new Error("Tenant ID not found in context");
}

/**
 * Router com procedures para sincronização de clientes do CashBarber
 */
export const clientesCashBarberSyncRouter = router({
  /**
   * Sincroniza clientes de todas as unidades para um período
   */
  sincronizarPeriodo: protectedProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = await getTenantIdFromCtx(ctx);

        console.log(`[Sync] Iniciando sincronização para ${input.mes}/${input.ano}`);

        // Extrair dados do CashBarber
        const dados = await extrairClientesTodosUnidades(input.mes, input.ano);

        // Fechar browser após uso
        await fecharBrowser();

        // Preparar resultado
        const resultado = {
          sucesso: true,
          mes: input.mes,
          ano: input.ano,
          unidades: Object.entries(dados).map(([unidade, dados]) => ({
            unidade,
            totalClientesDistintos: dados.totalClientesDistintos,
            clientesPorServico: dados.clientesPorServico,
          })),
          totalGeral: Object.values(dados).reduce((sum, u) => sum + u.totalClientesDistintos, 0),
        };

        console.log(`[Sync] Sincronização concluída:`, resultado);

        return resultado;
      } catch (erro) {
        console.error("[Sync] Erro durante sincronização:", erro);

        await fecharBrowser();

        return {
          sucesso: false,
          erro: erro instanceof Error ? erro.message : "Erro desconhecido",
          mes: input.mes,
          ano: input.ano,
        };
      }
    }),

  /**
   * Sincroniza clientes de uma unidade específica
   */
  sincronizarUnidade: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const tenantId = await getTenantIdFromCtx(ctx);

        console.log(
          `[Sync] Sincronizando ${input.empresaSlug} para ${input.mes}/${input.ano}`
        );

        // Extrair dados do CashBarber
        const dados = await extrairClientesTodosUnidades(input.mes, input.ano);

        // Fechar browser após uso
        await fecharBrowser();

        const unidadeDados = dados[input.empresaSlug.toUpperCase()];

        if (!unidadeDados) {
          return {
            sucesso: false,
            erro: `Unidade ${input.empresaSlug} não encontrada`,
          };
        }

        return {
          sucesso: true,
          empresaSlug: input.empresaSlug,
          mes: input.mes,
          ano: input.ano,
          totalClientesDistintos: unidadeDados.totalClientesDistintos,
          clientesPorServico: unidadeDados.clientesPorServico,
        };
      } catch (erro) {
        console.error("[Sync] Erro durante sincronização:", erro);

        await fecharBrowser();

        return {
          sucesso: false,
          erro: erro instanceof Error ? erro.message : "Erro desconhecido",
        };
      }
    }),
});
