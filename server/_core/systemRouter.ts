import { z } from "zod";
import { adminProcedure, publicProcedure, router } from "./trpc";
import { verificarMetaQuinzenalParaTenant } from "../cashbarberJob";

// Função para obter tenant ID do contexto
async function getTenantIdFromCtx(ctx: any): Promise<number> {
  if (ctx.user?.tenantId) return ctx.user.tenantId;
  throw new Error("Tenant ID not found in context");
}

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async () => {
      // Notificações desativadas
      return { success: false } as const;
    }),

  testarFechamentoQuinzenal: adminProcedure
    .input(
      z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      console.log(`[System] Teste de fechamento quinzenal: ${input.mes}/${input.ano}`);
      
      // Obter tenant ID do contexto
      const tenantId = await getTenantIdFromCtx(ctx);
      
      // Executar fechamento quinzenal
      await verificarMetaQuinzenalParaTenant(tenantId, input.mes, input.ano);
      
      return { success: true, message: `Fechamento quinzenal ${input.mes}/${input.ano} executado com sucesso` };
    }),
});
