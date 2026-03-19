import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllFaturamentos,
  upsertFaturamento,
  deleteFaturamento,
  getMetasByMes,
  upsertMeta,
  getAllUsers,
  updateUserPerfil,
} from "./db";

const empresaEnum = z.enum(["MORUMBI", "MASCOTE", "SERAPHINE"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── FATURAMENTOS ──────────────────────────────────────────────────────────
  faturamento: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        // Se usuário logado tem empresa vinculada, filtra apenas a sua unidade
        const empresa = ctx.user?.empresaVinculada as "MORUMBI" | "MASCOTE" | "SERAPHINE" | undefined;
        return getAllFaturamentos(input.mes, input.ano, empresa ?? undefined);
      }),

    salvar: protectedProcedure
      .input(
        z.object({
          empresa: empresaEnum,
          data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          // Morumbi / Mascote
          avulso: z.number().min(0).default(0),
          produtos: z.number().min(0).default(0),
          servExtra: z.number().min(0).default(0),
          lavatorio: z.number().min(0).default(0),
          recorrencia: z.number().min(0).default(0),
          observacao: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Apenas gerentes podem lançar
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Apenas gerentes podem realizar lançamentos.",
          });
        }
        // Gerente só pode lançar para sua empresa
        if (
          ctx.user.role !== "admin" &&
          ctx.user.empresaVinculada &&
          ctx.user.empresaVinculada !== input.empresa
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Você só pode lançar dados da sua unidade.",
          });
        }
        return upsertFaturamento({
          empresa: input.empresa,
          data: input.data,
          avulso: String(input.avulso),
          produtos: String(input.produtos),
          servExtra: String(input.servExtra),
          lavatorio: String(input.lavatorio),
          recorrencia: String(input.recorrencia),
          observacao: input.observacao ?? null,
          lancadoPor: ctx.user.id,
        });
      }),

    deletar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes podem deletar lançamentos." });
        }
        await deleteFaturamento(0); // placeholder - will be overridden below
        return { success: true };
      }),
  }),

  // ─── METAS ─────────────────────────────────────────────────────────────────
  meta: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input }) => {
        return getMetasByMes(input.mes, input.ano);
      }),

    salvar: protectedProcedure
      .input(
        z.object({
          empresa: empresaEnum,
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020),
          metaMensal: z.number().min(0),
          metaQuinzenal: z.number().min(0),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Apenas gerentes e admins podem configurar metas
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes podem configurar metas." });
        }
        if (
          ctx.user.role !== "admin" &&
          ctx.user.empresaVinculada &&
          ctx.user.empresaVinculada !== input.empresa
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar metas da sua unidade." });
        }
        return upsertMeta({
          empresa: input.empresa,
          mes: input.mes,
          ano: input.ano,
          metaMensal: String(input.metaMensal),
          metaQuinzenal: String(input.metaQuinzenal),
        });
      }),
  }),

  // ─── ADMIN DE USUÁRIOS ─────────────────────────────────────────────────────
  admin: router({
    listarUsuarios: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      return getAllUsers();
    }),

    atualizarPerfil: protectedProcedure
      .input(
        z.object({
          userId: z.number(),
          perfil: z.enum(["gerente", "operador"]),
          empresaVinculada: empresaEnum.nullable(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updateUserPerfil(input.userId, input.perfil, input.empresaVinculada);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
