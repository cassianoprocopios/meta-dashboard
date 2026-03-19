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
  getAllEmpresas,
  createEmpresa,
  deactivateEmpresa,
} from "./db";

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

  // ─── EMPRESAS ──────────────────────────────────────────────────────────────
  empresa: router({
    listar: publicProcedure.query(async () => {
      return getAllEmpresas();
    }),

    criar: protectedProcedure
      .input(z.object({
        slug: z.string().min(2).max(64).toUpperCase(),
        nome: z.string().min(2).max(128),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
        tipoCategorias: z.enum(["padrao", "seraphine"]).default("padrao"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem criar empresas." });
        }
        return createEmpresa({
          slug: input.slug.toUpperCase(),
          nome: input.nome,
          cor: input.cor,
          tipoCategorias: input.tipoCategorias,
          ativo: 1,
        });
      }),

    remover: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem remover empresas." });
        }
        await deactivateEmpresa(input.id);
        return { success: true };
      }),
  }),

  // ─── FATURAMENTOS ──────────────────────────────────────────────────────────
  faturamento: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        const empresaSlug = ctx.user?.empresaVinculada ?? undefined;
        return getAllFaturamentos(input.mes, input.ano, empresaSlug);
      }),

    salvar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        cat1: z.number().min(0).default(0),
        cat2: z.number().min(0).default(0),
        cat3: z.number().min(0).default(0),
        cat4: z.number().min(0).default(0),
        cat5: z.number().min(0).default(0),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes podem realizar lançamentos." });
        }
        if (
          ctx.user.role !== "admin" &&
          ctx.user.empresaVinculada &&
          ctx.user.empresaVinculada !== input.empresaSlug
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode lançar dados da sua unidade." });
        }
        return upsertFaturamento({
          empresaSlug: input.empresaSlug,
          data: input.data,
          cat1: String(input.cat1),
          cat2: String(input.cat2),
          cat3: String(input.cat3),
          cat4: String(input.cat4),
          cat5: String(input.cat5),
          observacao: input.observacao ?? null,
          lancadoPor: ctx.user.id,
        });
      }),

    deletar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes podem deletar lançamentos." });
        }
        await deleteFaturamento(input.id);
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
      .input(z.object({
        empresaSlug: z.string().min(1),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020),
        metaMensal: z.number().min(0),
        metaQuinzenal: z.number().min(0),
        diasUteis: z.number().min(1).max(31).default(26),
        diasUteisQuinzenal: z.number().min(1).max(15).default(13),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes podem configurar metas." });
        }
        if (
          ctx.user.role !== "admin" &&
          ctx.user.empresaVinculada &&
          ctx.user.empresaVinculada !== input.empresaSlug
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar metas da sua unidade." });
        }
        return upsertMeta({
          empresaSlug: input.empresaSlug,
          mes: input.mes,
          ano: input.ano,
          metaMensal: String(input.metaMensal),
          metaQuinzenal: String(input.metaQuinzenal),
          diasUteis: input.diasUteis,
          diasUteisQuinzenal: input.diasUteisQuinzenal,
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
      .input(z.object({
        userId: z.number(),
        perfil: z.enum(["gerente", "operador"]),
        empresaVinculada: z.string().nullable(),
      }))
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
