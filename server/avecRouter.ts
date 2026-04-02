/**
 * Router tRPC para integração com o Avec
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

// Helper para obter tenantId do contexto
async function getTenantIdFromCtx(ctx: { user?: { tenantId?: number | null } | null }) {
  const tenantId = ctx.user?.tenantId;
  if (!tenantId) throw new TRPCError({ code: "UNAUTHORIZED", message: "Tenant não identificado" });
  return tenantId;
}

export const avecRouter = router({
  // Buscar configuração do Avec para uma empresa
  getConfig: protectedProcedure
    .input(z.object({ empresaSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const db = await getDb();
      if (!db) return null;
      const { avecConfig } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      const rows = await db
        .select()
        .from(avecConfig)
        .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, input.empresaSlug)))
        .limit(1);
      const cfg = rows[0];
      if (!cfg) return null;
      return {
        id: cfg.id,
        empresaSlug: cfg.empresaSlug,
        avecEmail: cfg.avecEmail,
        avecSalaoNome: cfg.avecSalaoNome,
        ultimaSincronizacao: cfg.ultimaSincronizacao,
        statusUltimaSinc: cfg.statusUltimaSinc,
        sincAutoAtiva: cfg.sincAutoAtiva === 1,
        ativo: cfg.ativo === 1,
      };
    }),

  // Salvar/atualizar configuração do Avec
  salvarConfig: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        avecEmail: z.string().email(),
        avecSenha: z.string().min(1),
        sincAutoAtiva: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { avecConfig, avecMapeamento } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      const existente = await db
        .select()
        .from(avecConfig)
        .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, input.empresaSlug)))
        .limit(1);

      if (existente.length > 0) {
        await db
          .update(avecConfig)
          .set({
            avecEmail: input.avecEmail,
            avecSenha: input.avecSenha,
            sincAutoAtiva: input.sincAutoAtiva ? 1 : 0,
            updatedAt: new Date(),
          })
          .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, input.empresaSlug)));
      } else {
        await db.insert(avecConfig).values({
          tenantId,
          empresaSlug: input.empresaSlug,
          avecEmail: input.avecEmail,
          avecSenha: input.avecSenha,
          sincAutoAtiva: input.sincAutoAtiva ? 1 : 0,
          ativo: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Configurar mapeamento padrão de categorias se não existir
      const mapsExistentes = await db
        .select()
        .from(avecMapeamento)
        .where(and(eq(avecMapeamento.tenantId, tenantId), eq(avecMapeamento.empresaSlug, input.empresaSlug)));

      if (mapsExistentes.length === 0) {
        const mapeamentoPadrao = [
          { avecCategoria: "Cabelo", metaCategoria: "cat1" },
          { avecCategoria: "Manicure e Pedicure", metaCategoria: "cat2" },
          { avecCategoria: "Sobrancelha", metaCategoria: "cat3" },
          { avecCategoria: "Pacote", metaCategoria: "cat4" },
          { avecCategoria: "Recorrência", metaCategoria: "cat5" },
        ];
        for (const m of mapeamentoPadrao) {
          await db.insert(avecMapeamento).values({
            tenantId,
            empresaSlug: input.empresaSlug,
            avecCategoria: m.avecCategoria,
            metaCategoria: m.metaCategoria,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Recarregar job se sync automático foi ativado
      if (input.sincAutoAtiva) {
        const { recarregarJobAvec } = await import("./avecJob");
        recarregarJobAvec();
      }

      return { sucesso: true };
    }),

  // Disparar sincronização manual
  sincronizar: protectedProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        mes: z.number().int().min(1).max(12).optional(),
        ano: z.number().int().min(2020).max(2030).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const agora = new Date();
      const mes = input.mes ?? agora.getMonth() + 1;
      const ano = input.ano ?? agora.getFullYear();

      const { sincronizarFaturamentoAvec } = await import("./avecSincronizador");
      const resultado = await sincronizarFaturamentoAvec(tenantId, input.empresaSlug, mes, ano, "manual");

      return resultado;
    }),

  // Buscar status do job automático
  statusJob: protectedProcedure.query(async () => {
    const { getStatusJobAvec } = await import("./avecJob");
    return getStatusJobAvec();
  }),

  // Buscar últimos logs de sync
  logs: protectedProcedure
    .input(z.object({ empresaSlug: z.string(), limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const db = await getDb();
      if (!db) return [];
      const { avecSyncLog } = await import("../drizzle/schema");
      const { eq, and, desc } = await import("drizzle-orm");
      return db
        .select()
        .from(avecSyncLog)
        .where(and(eq(avecSyncLog.tenantId, tenantId), eq(avecSyncLog.empresaSlug, input.empresaSlug)))
        .orderBy(desc(avecSyncLog.executadoEm))
        .limit(input.limit);
    }),
});
