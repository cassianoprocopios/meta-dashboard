import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getAllFaturamentos,
  upsertFaturamento,
  deleteFaturamento,
  getMetasByMes,
  upsertMeta,
} from "./db";

const empresaEnum = z.enum(["MORUMBI", "MASCOTE", "SERAPHINE"]);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // ─── FATURAMENTOS ────────────────────────────────────────────────────────────
  faturamento: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input }) => {
        return getAllFaturamentos(input.mes, input.ano);
      }),

    salvar: publicProcedure
      .input(
        z.object({
          empresa: empresaEnum,
          data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          servicos: z.number().min(0).default(0),
          vendaProdutos: z.number().min(0).default(0),
          novasAssinaturas: z.number().min(0).default(0),
          recorrencia: z.number().min(0).default(0),
          observacao: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return upsertFaturamento({
          empresa: input.empresa,
          data: input.data,
          servicos: String(input.servicos),
          vendaProdutos: String(input.vendaProdutos),
          novasAssinaturas: String(input.novasAssinaturas),
          recorrencia: String(input.recorrencia),
          observacao: input.observacao ?? null,
        });
      }),

    deletar: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFaturamento(input.id);
        return { success: true };
      }),
  }),

  // ─── METAS ───────────────────────────────────────────────────────────────────
  meta: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input }) => {
        return getMetasByMes(input.mes, input.ano);
      }),

    salvar: publicProcedure
      .input(
        z.object({
          empresa: empresaEnum,
          mes: z.number().min(1).max(12),
          ano: z.number().min(2020),
          metaMensal: z.number().min(0),
        })
      )
      .mutation(async ({ input }) => {
        return upsertMeta({
          empresa: input.empresa,
          mes: input.mes,
          ano: input.ano,
          metaMensal: String(input.metaMensal),
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
