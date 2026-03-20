import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getTenantById } from "../db";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

// ─── Middleware: requer autenticação ────────────────────────────────────────
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

// ─── Middleware: verifica validade do tenant ─────────────────────────────────
// Bloqueia acesso se o tenant estiver inativo ou com licença expirada.
// O super-dev (tenantId = null) e o super-admin (role = admin, tenantId = null) são isentos.
const requireActiveTenant = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  // Super-dev / super-admin: sem restrição de tenant
  if (ctx.user.tenantId === null) {
    return next({ ctx: { ...ctx, user: ctx.user } });
  }

  // Verificar tenant do utilizador
  const tenant = await getTenantById(ctx.user.tenantId);

  if (!tenant) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_NOT_FOUND",
    });
  }

  if (tenant.ativo === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_BLOCKED",
    });
  }

  if (tenant.validadeAte && new Date(tenant.validadeAte) < new Date()) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "TENANT_EXPIRED",
    });
  }

  return next({ ctx: { ...ctx, user: ctx.user } });
});

// ─── Procedures exportadas ──────────────────────────────────────────────────

/** Requer login + tenant ativo e dentro da validade */
export const protectedProcedure = t.procedure.use(requireActiveTenant);

/** Requer login sem verificação de tenant (para auth.me, logout, etc.) */
export const protectedProcedureNoTenantCheck = t.procedure.use(requireUser);

/** Requer role=admin */
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
