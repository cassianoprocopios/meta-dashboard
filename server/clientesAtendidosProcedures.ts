import { protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { obterClientesAtendidosStats, obterClientesAtendidosConsolidado } from "./clientesAtendidosStats";
import { obterClientesEvolucaoUltimos3Meses, obterClientesPorProfissional } from "./clientesEvolucao";

async function getTenantIdFromCtx(ctx: any): Promise<number> {
  if (ctx.user?.tenantId) return ctx.user.tenantId;
  throw new Error("Tenant ID not found in context");
}

/**
 * Router com procedures para estatísticas de clientes atendidos
 */
export const clientesAtendidosRouter = router({
  /**
   * Obtém estatísticas de clientes para uma unidade específica
   */
  porUnidade: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const stats = await obterClientesAtendidosStats(
        tenantId,
        input.empresaSlug,
        input.mes,
        input.ano
      );
      return stats;
    }),

  /**
   * Obtém estatísticas consolidadas de todas as unidades
   */
  consolidado: protectedProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const stats = await obterClientesAtendidosConsolidado(tenantId, input.mes, input.ano);
      return stats;
    }),

  /**
   * Obtém evolução de clientes dos últimos 3 meses
   */
  evolucaoUltimos3Meses: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const evolucao = await obterClientesEvolucaoUltimos3Meses(tenantId, input.empresaSlug);
      return evolucao;
    }),

  /**
   * Obtém clientes por profissional
   */
  porProfissional: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
        profissional: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const dados = await obterClientesPorProfissional(
        tenantId,
        input.empresaSlug,
        input.mes,
        input.ano,
        input.profissional
      );
      return dados;
    }),
});
