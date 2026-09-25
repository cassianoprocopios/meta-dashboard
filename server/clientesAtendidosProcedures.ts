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
   * Obtém evolução mensal de clientes para todas as unidades
   */
  evolucaoMensalPorUnidade: protectedProcedure
    .input(
      z.object({
        meses: z.number().min(1).default(12),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const hoje = new Date();
      const anoAtual = hoje.getFullYear();
      const mesAtual = hoje.getMonth() + 1;
      
      // Calcular meses anteriores
      const meses = [];
      for (let i = input.meses - 1; i >= 0; i--) {
        let mes = mesAtual - i;
        let ano = anoAtual;
        
        if (mes <= 0) {
          mes += 12;
          ano -= 1;
        }
        
        meses.push({ mes, ano });
      }
      
      // Obter dados de clientes para cada mês
      const evolucao = [];
      
      for (const { mes, ano } of meses) {
        // Obter dados consolidados para o mês
        const consolidado = await obterClientesAtendidosConsolidado(tenantId, mes, ano);
        
        const mesNome = new Date(ano, mes - 1).toLocaleDateString("pt-BR", {
          month: "long",
        });
        
        evolucao.push({
          mes: mesNome,
          mesNumero: mes,
          ano,
          morumbi: consolidado.porUnidade?.MORUMBI?.atual || 0,
          mascote: consolidado.porUnidade?.MASCOTE?.atual || 0,
          seraphine: consolidado.porUnidade?.SERAPHINE?.atual || 0,
          fonte: consolidado.fonte,
          sincronizadoEm: consolidado.sincronizadoEm,
        });
      }
      
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
