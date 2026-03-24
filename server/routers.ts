import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAllFaturamentosByTenant,
  upsertFaturamento,
  deleteFaturamento,
  getMetasByMesAndTenant,
  getMetasAnoByTenant,
  getFaturamentosAnoByTenant,
  upsertMeta,
  getAllUsersByTenant,
  getAllUsersByTenantWithEmpresas,
  getEmpresasByTenant,
  createEmpresa,
  deactivateEmpresa,
  updateEmpresa,
  getUserByEmail,
  getUserById,
  getTenantById,
  createUserWithPassword,
  updateUserPassword,
  updateUserAtivo,
  updateUserLastSignedIn,
  createAccessLog,
  getAccessLogs,
  deleteUser,
  updateUserFull,
  getUserEmpresaSlugs,
  setUserEmpresas,
  getAllBonificacoesByTenant,
  getBonificacaoByEmpresaTenant,
  upsertBonificacao,
  getCategoriasByEmpresaTenant,
  addCategoria,
  removeCategoria,
  updateCategoriaNome,
  reordenarCategorias,
  inicializarCategorias,
  getAllTenants,
  createTenant,
  updateTenantAtivo,
  updateTenantPlano,
  getTenantStats,
  getAllUsersForAdmin,
  getUserStats,
  getAllTenantsWithStats,
  createTenantDev,
  createAdminUserForTenant,
  updateTenantDev,
  updateEmpresaAtivo,
  getHistoricoCompleto,
  getAllEmpresasByTenantAdmin,
  eventoJaNotificado,
  registrarEventoNotificado,
  getEventosNotificados,
} from "./db";
import { SignJWT, jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { ENV } from "./_core/env";

// JWT helper para sessão própria
const APP_COOKIE = "meta_session";
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "meta-dashboard-secret-2024");

/** Lê um cookie do request (compatível com e sem cookie-parser) */
function getCookie(req: any, name: string): string | undefined {
  // Se cookie-parser está instalado, usa req.cookies
  if (req.cookies && typeof req.cookies === 'object') {
    return req.cookies[name];
  }
  // Fallback: parsear o header manualmente
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return undefined;
  const parsed = parseCookieHeader(cookieHeader);
  return parsed[name];
}

async function signAppToken(userId: number) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

async function verifyAppToken(token: string): Promise<{ userId: number } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return { userId: payload.userId as number };
  } catch {
    return null;
  }
}

function getClientIp(req: any): string {
  return (
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "unknown"
  );
}

/** Retorna o tenantId do utilizador autenticado. Super-admin (tenantId=null) usa tenantId=1 como fallback */
async function getTenantIdFromCtx(ctx: any): Promise<number> {
  const appToken = getCookie(ctx.req, APP_COOKIE);
  if (appToken) {
    const payload = await verifyAppToken(appToken);
    if (payload) {
      const user = await getUserById(payload.userId);
      if (user?.tenantId) return user.tenantId;
    }
  }
  if (ctx.user?.tenantId) return ctx.user.tenantId;
  return 1; // fallback para o tenant original
}

export const appRouter = router({
  system: systemRouter,

  // ─── AUTH ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const appToken = getCookie(opts.ctx.req, APP_COOKIE);
      if (appToken) {
        const payload = await verifyAppToken(appToken);
        if (payload) {
          const user = await getUserById(payload.userId);
          if (user && user.ativo === 1) return user;
        }
      }
      return opts.ctx.user;
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(APP_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    loginComSenha: publicProcedure
      .input(z.object({ email: z.string().email(), senha: z.string().min(4) }))
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        const ua = ctx.req.headers["user-agent"] || "";
        const user = await getUserByEmail(input.email);

        if (!user || !user.passwordHash) {
          await createAccessLog({
            userId: user?.id ?? null,
            userName: user?.name ?? null,
            userEmail: input.email,
            tenantId: user?.tenantId ?? null,
            acao: "login_falhou",
            ip,
            userAgent: ua,
            detalhes: "Email não encontrado ou sem senha configurada",
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos." });
        }

        if (user.ativo === 0) {
          await createAccessLog({
            userId: user.id,
            userName: user.name ?? null,
            userEmail: user.email ?? null,
            tenantId: user.tenantId ?? null,
            acao: "login_falhou",
            ip,
            userAgent: ua,
            detalhes: "Utilizador bloqueado",
          });
          throw new TRPCError({ code: "FORBIDDEN", message: "Utilizador bloqueado. Contacte o administrador." });
        }

        const senhaValida = await bcrypt.compare(input.senha, user.passwordHash);
        if (!senhaValida) {
          await createAccessLog({
            userId: user.id,
            userName: user.name ?? null,
            userEmail: user.email ?? null,
            tenantId: user.tenantId ?? null,
            acao: "login_falhou",
            ip,
            userAgent: ua,
            detalhes: "Senha incorreta",
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos." });
        }

        // Verificar se o tenant está ativo e dentro da validade
        if (user.tenantId !== null) {
          const tenant = await getTenantById(user.tenantId);
          if (!tenant || tenant.ativo === 0) {
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
        }

        await updateUserLastSignedIn(user.id);
        await createAccessLog({
          userId: user.id,
          userName: user.name ?? null,
          userEmail: user.email ?? null,
          tenantId: user.tenantId ?? null,
          acao: "login",
          ip,
          userAgent: ua,
          detalhes: "Login bem-sucedido",
        });

        const token = await signAppToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(APP_COOKIE, token, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            perfil: user.perfil,
            empresaVinculada: user.empresaVinculada,
            tenantId: user.tenantId,
          },
        };
      }),

    /** Retorna o status do tenant do utilizador autenticado */
    tenantStatus: publicProcedure.query(async ({ ctx }) => {
      const appToken = getCookie(ctx.req, APP_COOKIE);
      if (!appToken) return { status: "ok" as const };
      const payload = await verifyAppToken(appToken);
      if (!payload) return { status: "ok" as const };
      const user = await getUserById(payload.userId);
      if (!user || user.tenantId === null) return { status: "ok" as const };
      const tenant = await getTenantById(user.tenantId);
      if (!tenant) return { status: "not_found" as const, message: "Tenant não encontrado." };
      if (tenant.ativo === 0) return { status: "blocked" as const, message: "Sua conta foi bloqueada. Entre em contato com o suporte." };
      if (tenant.validadeAte && new Date(tenant.validadeAte) < new Date()) {
        return { status: "expired" as const, message: "Sua licença expirou. Entre em contato para renovar." };
      }
      return { status: "ok" as const };
    }),

    logoutApp: publicProcedure.mutation(async ({ ctx }) => {
      const appToken = getCookie(ctx.req, APP_COOKIE);
      if (appToken) {
        const payload = await verifyAppToken(appToken);
        if (payload) {
          const user = await getUserById(payload.userId);
          if (user) {
            await createAccessLog({
              userId: user.id,
              userName: user.name ?? null,
              userEmail: user.email ?? null,
              tenantId: user.tenantId ?? null,
              acao: "logout",
              ip: getClientIp(ctx.req),
              userAgent: ctx.req.headers["user-agent"] || "",
              detalhes: null,
            });
          }
        }
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(APP_COOKIE, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    verificarSessao: publicProcedure.query(async ({ ctx }) => {
      const appToken = getCookie(ctx.req, APP_COOKIE);
      if (!appToken) return null;
      const payload = await verifyAppToken(appToken);
      if (!payload) return null;
      const user = await getUserById(payload.userId);
      if (!user || user.ativo === 0) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        perfil: user.perfil,
        empresaVinculada: user.empresaVinculada,
        tenantId: user.tenantId,
        lastSignedIn: user.lastSignedIn,
      };
    }),
  }),

  // ─── EMPRESAS ──────────────────────────────────────────────────────────────
  empresa: router({
    listar: publicProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      return getEmpresasByTenant(tenantId);
    }),

    criar: protectedProcedure
      .input(z.object({
        slug: z.string().min(2).max(64),
        nome: z.string().min(2).max(128),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#3b82f6"),
        tipoCategorias: z.enum(["padrao", "seraphine"]).default("padrao"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.perfil !== "gerente") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores e gerentes podem criar empresas." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        return createEmpresa({
          slug: input.slug.toUpperCase(),
          nome: input.nome,
          cor: input.cor,
          tipoCategorias: input.tipoCategorias,
          tenantId,
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

    atualizar: protectedProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().min(2).max(128).optional(),
        cor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
        tipoCategorias: z.enum(["padrao", "seraphine"]).optional(),
        cat1Nome: z.string().min(1).max(64).optional(),
        cat2Nome: z.string().min(1).max(64).optional(),
        cat3Nome: z.string().min(1).max(64).optional(),
        cat4Nome: z.string().min(1).max(64).optional(),
        cat5Nome: z.string().min(1).max(64).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.perfil !== "gerente") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores e gerentes podem editar empresas." });
        }
        const { id, ...data } = input;
        await updateEmpresa(id, data);
        return { success: true };
      }),
  }),

  // ─── FATURAMENTOS ──────────────────────────────────────────────────────────
  faturamento: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const user = ctx.user;
        if (!user || user.role === "admin") {
          return getAllFaturamentosByTenant(tenantId, input.mes, input.ano);
        }
        const slugs = await getUserEmpresaSlugs(user.id);
        if (slugs.length === 0) {
          return getAllFaturamentosByTenant(tenantId, input.mes, input.ano, user.empresaVinculada ?? undefined);
        }
        const allResults = await Promise.all(
          slugs.map((slug) => getAllFaturamentosByTenant(tenantId, input.mes, input.ano, slug))
        );
        return allResults.flat();
      }),

    salvar: protectedProcedure
      .input(z.object({
        data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        empresaSlug: z.string().min(1),
        cat1: z.string().default("0"),
        cat2: z.string().default("0"),
        cat3: z.string().default("0"),
        cat4: z.string().default("0"),
        cat5: z.string().default("0"),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Recepcionista, gerente e admin podem lançar faturamentos
        const perfisPerm = ["gerente", "recepcionista"];
        if (!perfisPerm.includes(ctx.user.perfil) && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para lançar faturamentos." });
        }
        // Verificar acesso à empresa: gerente só pode lançar na sua empresa vinculada
        if (ctx.user.role !== "admin") {
          const slugs = await getUserEmpresaSlugs(ctx.user.id);
          const empresaVinculada = ctx.user.empresaVinculada;
          if (slugs.length > 0) {
            if (!slugs.includes(input.empresaSlug)) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode lançar dados da sua unidade." });
            }
          } else if (empresaVinculada && empresaVinculada !== input.empresaSlug) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode lançar dados da sua unidade." });
          }
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        return upsertFaturamento({
          ...input,
          tenantId,
          lancadoPor: ctx.user.name ?? ctx.user.email ?? "desconhecido",
        });
      }),

    excluir: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Recepcionista NÃO pode excluir faturamentos - apenas gerente e admin
        if (ctx.user.perfil === "recepcionista") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Recepcionistas não podem excluir lançamentos. Solicite ao gerente." });
        }
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para excluir faturamentos." });
        }
        await deleteFaturamento(input.id);
        return { success: true };
      }),
  }),

  // ─── METAS ─────────────────────────────────────────────────────────────────
  meta: router({
    listar: publicProcedure
      .input(z.object({ mes: z.number().min(1).max(12), ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        return getMetasByMesAndTenant(tenantId, input.mes, input.ano);
      }),

    historicoAnual: publicProcedure
      .input(z.object({ ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const [metasAno, fatAno] = await Promise.all([
          getMetasAnoByTenant(tenantId, input.ano),
          getFaturamentosAnoByTenant(tenantId, input.ano),
        ]);
        return { metas: metasAno, faturamentos: fatAno };
      }),

    salvar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020),
        metaMensal: z.string(),
        metaQuinzenal: z.string(),
        superMeta: z.string().optional().default("0"),
        diasUteis: z.number().min(0).max(31),
        diasUteisQuinzenal: z.number().min(0).max(15),
      }))
      .mutation(async ({ input, ctx }) => {
        // Recepcionista NÃO pode alterar metas
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem configurar metas." });
        }
        // Verificar acesso à empresa: gerente só pode configurar meta da sua empresa vinculada
        if (ctx.user.role !== "admin") {
          const slugs = await getUserEmpresaSlugs(ctx.user.id);
          const empresaVinculada = ctx.user.empresaVinculada;
          if (slugs.length > 0) {
            if (!slugs.includes(input.empresaSlug)) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar metas da sua unidade." });
            }
          } else if (empresaVinculada && empresaVinculada !== input.empresaSlug) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar metas da sua unidade." });
          }
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        return upsertMeta({ ...input, tenantId });
      }),
  }),

  // ─── BONIFICAÇÕES ──────────────────────────────────────────────────────────
  bonificacao: router({
    listar: protectedProcedure.query(async ({ ctx }) => {
      // Gerente pode VER bonificação (read-only). Recepcionista não tem acesso.
      if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
      }
      const tenantId = await getTenantIdFromCtx(ctx);
      return getAllBonificacoesByTenant(tenantId);
    }),

    salvar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        pctQuinzenalSemMeta: z.string(),
        pctQuinzenalComMeta: z.string(),
        pctMensalSemMeta: z.string(),
        pctMensalComMeta: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem configurar bonificações." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        await upsertBonificacao({ ...input, tenantId });
        return { success: true };
      }),
  }),

  // ─── ADMIN DE UTILIZADORES ─────────────────────────────────────────────────
  admin: router({
    /** Lista todas as empresas do tenant (ativas E inativas) — exclusivo para o AdminPanel */
    listarTodasEmpresas: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      const tenantId = await getTenantIdFromCtx(ctx);
      return getAllEmpresasByTenantAdmin(tenantId);
    }),

    listarUsuarios: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      const tenantId = await getTenantIdFromCtx(ctx);
      return getAllUsersByTenantWithEmpresas(tenantId);
    }),

    criarUsuario: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(128),
        email: z.string().email(),
        senha: z.string().min(6),
        perfil: z.enum(["gerente", "operador", "recepcionista"]),
        empresasSlugs: z.array(z.string()).optional(), // N:N via userEmpresas (preferêncial)
        empresaVinculada: z.string().nullable().optional(), // legado — ignorado se empresasSlugs fornecido
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Email já registado." });
        }
        const passwordHash = await bcrypt.hash(input.senha, 12);
        // Sempre criar com empresaVinculada=NULL; os vínculos são geridos via userEmpresas
        const newUser = await createUserWithPassword({
          tenantId,
          name: input.name,
          email: input.email,
          passwordHash,
          perfil: input.perfil,
          empresaVinculada: null,
          role: input.role,
        });
        // Se foram fornecidos slugs de empresas, criar os vínculos N:N
        const slugs = input.empresasSlugs ?? (input.empresaVinculada ? [input.empresaVinculada] : []);
        if (slugs.length > 0) {
          await setUserEmpresas(newUser.id, tenantId, slugs);
        }
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId,
          acao: "criar_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Criou utilizador: ${input.email} com empresas: ${slugs.join(", ") || "nenhuma"}`,
        });
        return { success: true, userId: newUser.id };
      }),

    redefinirSenha: protectedProcedure
      .input(z.object({ userId: z.number(), novaSenha: z.string().min(6) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const passwordHash = await bcrypt.hash(input.novaSenha, 12);
        await updateUserPassword(input.userId, passwordHash);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: "redefinir_senha",
          ip: null,
          userAgent: null,
          detalhes: `Redefiniu senha do utilizador ID: ${input.userId}`,
        });
        return { success: true };
      }),

    toggleAtivo: protectedProcedure
      .input(z.object({ userId: z.number(), ativo: z.number().min(0).max(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updateUserAtivo(input.userId, input.ativo);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: input.ativo === 1 ? "ativar_usuario" : "bloquear_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Utilizador ID ${input.userId} ${input.ativo === 1 ? "ativado" : "bloqueado"}`,
        });
        return { success: true };
      }),

    excluirUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não é possível excluir o próprio utilizador." });
        }
        await deleteUser(input.userId);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: "excluir_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Excluiu utilizador ID: ${input.userId}`,
        });
        return { success: true };
      }),

    editarUsuario: protectedProcedure
      .input(z.object({
        userId: z.number(),
        name: z.string().min(2).max(128).optional(),
        email: z.string().email().optional(),
        perfil: z.enum(["gerente", "operador", "recepcionista"]).optional(),
        empresasSlugs: z.array(z.string()).optional(), // N:N via userEmpresas (preferencial)
        empresaVinculada: z.string().nullable().optional(), // legado — sempre sobrescrito para NULL
        role: z.enum(["user", "admin"]).optional(),
        novaSenha: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { userId, novaSenha, empresasSlugs, empresaVinculada: _legado, ...data } = input;
        let passwordHash: string | undefined;
        if (novaSenha) passwordHash = await bcrypt.hash(novaSenha, 12);
        // Sempre salvar empresaVinculada=NULL — os vínculos são geridos via userEmpresas
        await updateUserFull(userId, { ...data, empresaVinculada: null, passwordHash });
        // Se foram fornecidos slugs, atualizar os vínculos N:N
        if (empresasSlugs !== undefined) {
          await setUserEmpresas(userId, tenantId, empresasSlugs);
        }
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: "editar_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Editou utilizador ID: ${userId}${empresasSlugs ? ` | empresas: ${empresasSlugs.join(", ")}` : ""}`,
        });
        return { success: true };
      }),

    listarEmpresasUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
        }
        return getUserEmpresaSlugs(input.userId);
      }),

    definirEmpresasUsuario: protectedProcedure
      .input(z.object({ userId: z.number(), slugs: z.array(z.string()) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        await setUserEmpresas(input.userId, tenantId, input.slugs);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId,
          acao: "editar_empresas_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Definiu empresas do utilizador ID ${input.userId}: ${input.slugs.join(", ")}`,
        });
        return { success: true };
      }),

    listarAcessos: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(200) }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        return getAccessLogs(input.limit, tenantId);
      }),
    toggleEmpresaAtiva: protectedProcedure
      .input(z.object({ empresaId: z.number(), ativo: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updateEmpresaAtivo(input.empresaId, input.ativo ? 1 : 0);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: input.ativo ? "ativar_empresa" : "desativar_empresa",
          ip: null,
          userAgent: null,
          detalhes: `Empresa ID ${input.empresaId} ${input.ativo ? "ativada" : "desativada"}`,
        });
        return { success: true };
      }),
    toggleUsuarioAtivo: protectedProcedure
      .input(z.object({ userId: z.number(), ativo: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updateUserAtivo(input.userId, input.ativo ? 1 : 0);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: ctx.user.tenantId ?? null,
          acao: input.ativo ? "ativar_usuario" : "bloquear_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Utilizador ID ${input.userId} ${input.ativo ? "ativado" : "bloqueado"}`,
        });
        return { success: true };
      }),

    listarHistorico: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(300) }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        return getHistoricoCompleto(tenantId, input.limit);
      }),

    // ─── PAINEL DE VÍNCULOS ────────────────────────────────────────────────
    listarVinculos: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
      }
      const tenantId = await getTenantIdFromCtx(ctx);
      const [usuariosComEmpresas, todasEmpresas] = await Promise.all([
        getAllUsersByTenantWithEmpresas(tenantId),
        getAllEmpresasByTenantAdmin(tenantId),
      ]);
      return {
        usuarios: usuariosComEmpresas.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          perfil: u.perfil,
          ativo: u.ativo,
          empresasSlugs: u.empresasSlugs,
        })),
        empresas: todasEmpresas.map((e) => ({
          id: e.id,
          slug: e.slug,
          nome: e.nome,
          cor: e.cor,
          ativo: e.ativo,
        })),
      };
    }),

    toggleVinculo: protectedProcedure
      .input(z.object({
        userId: z.number().int().positive(),
        empresaSlug: z.string().min(1),
        vincular: z.boolean(), // true = adicionar, false = remover
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const slugsAtuais = await getUserEmpresaSlugs(input.userId);
        let novosSlug: string[];
        if (input.vincular) {
          novosSlug = slugsAtuais.includes(input.empresaSlug)
            ? slugsAtuais
            : [...slugsAtuais, input.empresaSlug];
        } else {
          novosSlug = slugsAtuais.filter((s) => s !== input.empresaSlug);
        }
        await setUserEmpresas(input.userId, tenantId, novosSlug);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId,
          acao: input.vincular ? "adicionar_vinculo" : "remover_vinculo",
          ip: null,
          userAgent: null,
          detalhes: `${input.vincular ? "Adicionou" : "Removeu"} vínculo do usuário ID ${input.userId} com empresa ${input.empresaSlug}`,
        });
        return { success: true, slugsAtualizados: novosSlug };
      }),
  }),

  // ─── CATEGORIAS DINÂMICAS ──────────────────────────────────────────────────
  categorias: router({
    listar: protectedProcedure
      .input(z.object({ empresaSlug: z.string().min(1) }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        return getCategoriasByEmpresaTenant(input.empresaSlug, tenantId);
      }),

    adicionar: protectedProcedure
      .input(z.object({ empresaSlug: z.string().min(1), nome: z.string().min(1).max(64) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        await addCategoria(input.empresaSlug, tenantId, input.nome);
        return { success: true };
      }),

    remover: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await removeCategoria(input.id);
        return { success: true };
      }),

    editar: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), nome: z.string().min(1).max(64) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await updateCategoriaNome(input.id, input.nome);
        return { success: true };
      }),

    reordenar: protectedProcedure
      .input(z.object({ ids: z.array(z.number().int().positive()) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await reordenarCategorias(input.ids);
        return { success: true };
      }),

    inicializar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        tipoCategorias: z.enum(["padrao", "seraphine"]).default("padrao"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem inicializar categorias." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        await inicializarCategorias(input.empresaSlug, tenantId, input.tipoCategorias);
        return { success: true };
      }),
  }),

  // ─── REGISTRO PÚBLICO DE TENANT ─────────────────────────────────────────────
  registro: router({
    novoTenant: publicProcedure
      .input(z.object({
        nomeEmpresa: z.string().min(2).max(128),
        nomeAdmin: z.string().min(2).max(128),
        email: z.string().email(),
        senha: z.string().min(6),
        telefone: z.string().optional(),
        plano: z.enum(["trial", "basico", "pro"]).default("trial"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verificar se o email já existe
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email já está em uso. Tente fazer login." });
        }
        // Gerar slug a partir do nome da empresa
        const slug = input.nomeEmpresa
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .substring(0, 64);
        // Criar o tenant
        const tenant = await createTenant({
          nome: input.nomeEmpresa,
          slug,
          adminEmail: input.email,
          plano: input.plano,
        });
        // Criar o admin do tenant
        const passwordHash = await bcrypt.hash(input.senha, 12);
        await createUserWithPassword({
          tenantId: tenant.id,
          name: input.nomeAdmin,
          email: input.email,
          passwordHash,
          perfil: "gerente",
          empresaVinculada: null,
          role: "admin",
        });
        // Registar log
        await createAccessLog({
          userId: null,
          userName: input.nomeAdmin,
          userEmail: input.email,
          tenantId: tenant.id,
          acao: "registro_tenant",
          ip: getClientIp(ctx.req),
          userAgent: ctx.req.headers["user-agent"] || "",
          detalhes: `Novo tenant registado: ${input.nomeEmpresa}`,
        });
        return { success: true, tenantId: tenant.id, slug };
      }),
  }),

  superAdmin: router({
    listarTenants: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
      }
      const tenants = await getAllTenants();
      const tenantsComStats = await Promise.all(
        tenants.map(async (t) => ({
          ...t,
          stats: await getTenantStats(t.id),
        }))
      );
      return tenantsComStats;
    }),

    criarTenant: protectedProcedure
      .input(z.object({
        nome: z.string().min(2).max(128),
        slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/),
        adminEmail: z.string().email(),
        adminNome: z.string().min(2).max(128),
        adminSenha: z.string().min(6),
        plano: z.enum(["trial", "basico", "pro"]).default("trial"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
        }
        // Criar o tenant
        const tenant = await createTenant({
          nome: input.nome,
          slug: input.slug,
          adminEmail: input.adminEmail,
          plano: input.plano,
        });
        // Criar o admin do tenant
        const passwordHash = await bcrypt.hash(input.adminSenha, 12);
        await createUserWithPassword({
          tenantId: tenant.id,
          name: input.adminNome,
          email: input.adminEmail,
          passwordHash,
          perfil: "gerente",
          empresaVinculada: null,
          role: "admin",
        });
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: 1,
          acao: "criar_tenant",
          ip: null,
          userAgent: null,
          detalhes: `Criou tenant: ${input.nome} (${input.slug})`,
        });
        return { success: true, tenantId: tenant.id };
      }),

    toggleTenantAtivo: protectedProcedure
      .input(z.object({ tenantId: z.number(), ativo: z.number().min(0).max(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
        }
        await updateTenantAtivo(input.tenantId, input.ativo);
        return { success: true };
      }),

    alterarPlano: protectedProcedure
      .input(z.object({ tenantId: z.number(), plano: z.enum(["trial", "basico", "pro"]) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
        }
        await updateTenantPlano(input.tenantId, input.plano);
        return { success: true };
      }),
  }),

  // ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
  adminDashboard: router({
    /** Lista todos os utilizadores de todos os tenants (apenas super-admin) */
    listarUtilizadores: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        return getAllUsersForAdmin();
      }),

    /** Estatísticas gerais de utilizadores */
    stats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        return getUserStats();
      }),

    /** Redefine a senha de um utilizador (apenas super-admin) */
    redefinirSenha: protectedProcedure
      .input(z.object({
        userId: z.number(),
        novaSenha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        const bcrypt = await import("bcryptjs");
        const hash = await bcrypt.hash(input.novaSenha, 10);
        await updateUserPassword(input.userId, hash);
        return { success: true };
      }),

    /** Atualiza o telefone de um utilizador */
    atualizarTelefone: protectedProcedure
      .input(z.object({
        userId: z.number(),
        telefone: z.string().max(32).nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        await updateUserFull(input.userId, { telefone: input.telefone });
        return { success: true };
      }),

    /** Ativa ou desativa um utilizador */
    toggleAtivo: protectedProcedure
      .input(z.object({
        userId: z.number(),
        ativo: z.number().min(0).max(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        await updateUserAtivo(input.userId, input.ativo);
        return { success: true };
      }),

    /** Lista usuários com sessão ativa recente (online) */
    usuariosOnline: protectedProcedure
      .input(z.object({
        minutosAtivo: z.number().min(1).max(1440).default(30),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito ao super-admin." });
        }
        const minutosAtivo = input?.minutosAtivo ?? 30;
        const limiteMs = minutosAtivo * 60 * 1000;
        const agora = Date.now();
        const todos = await getAllUsersForAdmin();
        return todos
          .filter((u) => {
            if (!u.lastSignedIn) return false;
            const ultimo = new Date(u.lastSignedIn).getTime();
            return agora - ultimo <= limiteMs;
          })
          .sort((a, b) => {
            const ta = a.lastSignedIn ? new Date(a.lastSignedIn).getTime() : 0;
            const tb = b.lastSignedIn ? new Date(b.lastSignedIn).getTime() : 0;
            return tb - ta;
          })
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            perfil: u.perfil,
            role: u.role,
            tenantNome: u.tenantNome,
            tenantId: u.tenantId,
            lastSignedIn: u.lastSignedIn,
            empresas: u.empresas,
            minutosAtras: Math.floor((agora - new Date(u.lastSignedIn!).getTime()) / 60000),
          }));
      }),
  }),

  // ─── PAINEL DO DESENVOLVEDOR ─────────────────────────────────────────────────
  // Acesso exclusivo para o desenvolvedor (role=admin, tenantId=null)
  devPanel: router({
    /** Lista todos os tenants com estatísticas */
    listarTenants: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin" || ctx.user.tenantId !== null) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao desenvolvedor." });
      }
      return getAllTenantsWithStats();
    }),

    /** Cria um novo tenant com email genérico (sem validação de domínio real) */
    criarTenant: protectedProcedure
      .input(z.object({
        nome: z.string().min(2).max(128),
        slug: z.string().min(2).max(64).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
        adminEmail: z.string().min(3).max(320),  // email genérico, sem validação de domínio
        adminNome: z.string().min(2).max(128),
        adminSenha: z.string().min(6),
        plano: z.enum(["trial", "basico", "pro"]).default("trial"),
        validadeAte: z.string().nullable().optional(),  // ISO date string
        observacoes: z.string().max(1000).nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" || ctx.user.tenantId !== null) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao desenvolvedor." });
        }
        try {
          const tenant = await createTenantDev({
            nome: input.nome,
            slug: input.slug,
            adminEmail: input.adminEmail,
            plano: input.plano,
            validadeAte: input.validadeAte ? new Date(input.validadeAte) : null,
            observacoes: input.observacoes ?? null,
          });
          const passwordHash = await bcrypt.hash(input.adminSenha, 12);
          await createAdminUserForTenant({
            tenantId: tenant.id,
            name: input.adminNome,
            email: input.adminEmail,
            passwordHash,
          });
          await createAccessLog({
            userId: ctx.user.id,
            userName: ctx.user.name ?? null,
            userEmail: ctx.user.email ?? null,
            tenantId: null,
            acao: "dev_criar_tenant",
            ip: null,
            userAgent: null,
            detalhes: `Criou tenant: ${input.nome} (${input.slug})`,
          });
          return { success: true, tenantId: tenant.id, slug: tenant.slug };
        } catch (e: any) {
          throw new TRPCError({ code: "CONFLICT", message: e.message ?? "Erro ao criar tenant." });
        }
      }),

    /** Edita dados de um tenant (plano, validade, status, observações) */
    editarTenant: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        nome: z.string().min(2).max(128).optional(),
        plano: z.enum(["trial", "basico", "pro"]).optional(),
        ativo: z.number().min(0).max(1).optional(),
        validadeAte: z.string().nullable().optional(),
        observacoes: z.string().max(1000).nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" || ctx.user.tenantId !== null) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao desenvolvedor." });
        }
        const { tenantId, validadeAte, ...rest } = input;
        await updateTenantDev(tenantId, {
          ...rest,
          validadeAte: validadeAte ? new Date(validadeAte) : (validadeAte === null ? null : undefined),
        });
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: null,
          acao: "dev_editar_tenant",
          ip: null,
          userAgent: null,
          detalhes: `Editou tenant ID ${tenantId}`,
        });
        return { success: true };
      }),

    /** Renova a validade de um tenant */
    renovarValidade: protectedProcedure
      .input(z.object({
        tenantId: z.number(),
        validadeAte: z.string(),  // ISO date string
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" || ctx.user.tenantId !== null) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao desenvolvedor." });
        }
        await updateTenantDev(input.tenantId, { validadeAte: new Date(input.validadeAte) });
        return { success: true };
      }),

    /** Ativa ou bloqueia um tenant */
    toggleAtivo: protectedProcedure
      .input(z.object({ tenantId: z.number(), ativo: z.number().min(0).max(1) }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" || ctx.user.tenantId !== null) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso exclusivo ao desenvolvedor." });
        }
        await updateTenantDev(input.tenantId, { ativo: input.ativo });
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          tenantId: null,
          acao: input.ativo === 1 ? "dev_ativar_tenant" : "dev_bloquear_tenant",
          ip: null,
          userAgent: null,
          detalhes: `Tenant ID ${input.tenantId} ${input.ativo === 1 ? "ativado" : "bloqueado"}`,
        });
        return { success: true };
      }),
  }),

  // ─── ANÁLISE DE IA ─────────────────────────────────────────────────────────────────────────────────
  ia: router({
    /** Gera análise estratégica dos dados de faturamento usando LLM */
    analisarDesempenho: protectedProcedure
      .input(z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2020).max(2100),
        mesAnterior: z.number().int().min(1).max(12),
        anoAnterior: z.number().int().min(2020).max(2100),
        empresas: z.array(z.object({
          nome: z.string(),
          slug: z.string(),
          total: z.number(),
          totalAnterior: z.number(),
          metaMensal: z.number(),
          mediaDiaria: z.number(),
          diasLancados: z.number(),
          diasUteis: z.number(),
          progressoMensal: z.number(),
          catTotals: z.array(z.number()),
          catLabels: z.array(z.string()),
        })),
        totalGeral: z.number(),
        totalGeralAnterior: z.number(),
        metaTotalGeral: z.number(),
        nomeMes: z.string(),
        nomeMesAnterior: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { invokeLLM } = await import("./_core/llm");

        const empresasTexto = input.empresas.map((e) => {
          const variacaoStr = e.totalAnterior > 0
            ? `${((e.total - e.totalAnterior) / e.totalAnterior * 100).toFixed(1)}% vs ${input.nomeMesAnterior}`
            : "sem dado anterior";
          const catStr = e.catLabels.map((l, i) => `${l}: R$ ${e.catTotals[i].toFixed(2)}`).join(", ");
          return `
**${e.nome}**
- Faturado: R$ ${e.total.toFixed(2)} (${variacaoStr})
- Meta mensal: R$ ${e.metaMensal.toFixed(2)} | Progresso: ${e.progressoMensal.toFixed(1)}%
- Média diária: R$ ${e.mediaDiaria.toFixed(2)} | Dias lançados: ${e.diasLancados}/${e.diasUteis}
- Por categoria: ${catStr}`;
        }).join("\n");

        const variacaoGeral = input.totalGeralAnterior > 0
          ? `${((input.totalGeral - input.totalGeralAnterior) / input.totalGeralAnterior * 100).toFixed(1)}%`
          : "sem dado anterior";

        const prompt = `Você é um consultor de negócios especialista em gestão de salões de beleza e estética. Analise os dados de desempenho abaixo e fornecer uma análise estratégica completa em português brasileiro.

## Dados de ${input.nomeMes} ${input.ano}

**Consolidado Geral:**
- Total faturado: R$ ${input.totalGeral.toFixed(2)}
- Meta total: R$ ${input.metaTotalGeral.toFixed(2)}
- Progresso geral: ${input.metaTotalGeral > 0 ? ((input.totalGeral / input.metaTotalGeral) * 100).toFixed(1) : 0}%
- Variação vs ${input.nomeMesAnterior}: ${variacaoGeral}

**Por Unidade:**
${empresasTexto}

## Sua Análise Deve Incluir:

1. **Diagnóstico Geral** (2-3 parágrafos): avalie o desempenho consolidado, destaque pontos fortes e áreas críticas.

2. **Análise por Unidade** (para cada empresa): identifique o que está funcionando bem e o que precisa de atenção.

3. **Estratégias de Melhora** (5-7 ações concretas e priorizadas): sugira ações práticas e mensuráveis para aumentar o faturamento, com foco em:
   - Aumento de ticket médio
   - Fidelização de clientes
   - Otimização de categorias com menor desempenho
   - Metas diárias e quinzenais

4. **Previsão e Meta para o Próximo Mês**: com base na tendência atual, sugira uma meta realista e ambiciosa.

Seja direto, prático e use números concretos nas suas recomendações.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um consultor especialista em gestão de salões de beleza e estética. Suas análises são objetivas, baseadas em dados e focadas em ações práticas." },
            { role: "user", content: prompt },
          ],
        });

        const rawContent = response?.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : (rawContent ? JSON.stringify(rawContent) : "Não foi possível gerar a análise. Tente novamente.");
        return { analise: content };
      }),
  }),

  // Sub-router de alertas de projeção
  alertas: router({
    /**
     * Envia notificação ao owner quando a projeção de fechamento de uma ou mais empresas
     * estiver abaixo de um limiar percentual da meta mensal.
     */
    notificarProjecaoBaixaMeta: protectedProcedure
      .input(
        z.object({
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020).max(2100),
          nomeMes: z.string().min(1),
          empresasEmRisco: z.array(
            z.object({
              nome: z.string(),
              projecao: z.number(),
              meta: z.number(),
              percentualProjecao: z.number(),
              totalRealizado: z.number(),
              diasRealizados: z.number(),
            })
          ),
          totalGeralRealizado: z.number(),
          totalGeralMeta: z.number(),
          limiarPercentual: z.number().min(0).max(100).default(80),
        })
      )
      .mutation(async ({ input }) => {
        const { mes, ano, nomeMes, empresasEmRisco, totalGeralRealizado, totalGeralMeta, limiarPercentual } = input;

        if (empresasEmRisco.length === 0) {
          return { success: false, message: "Nenhuma empresa em risco para notificar." };
        }

        const linhasEmpresas = empresasEmRisco
          .map((e) => {
            const pct = e.meta > 0 ? ((e.projecao / e.meta) * 100).toFixed(1) : "0.0";
            const realPct = e.meta > 0 ? ((e.totalRealizado / e.meta) * 100).toFixed(1) : "0.0";
            return [
              `• ${e.nome}`,
              `  Realizado: R$ ${e.totalRealizado.toFixed(2)} (${realPct}% da meta) em ${e.diasRealizados} dias`,
              `  Projeção de fechamento: R$ ${e.projecao.toFixed(2)} (${pct}% da meta)`,
              `  Meta mensal: R$ ${e.meta.toFixed(2)}`,
            ].join("\n");
          })
          .join("\n\n");

        const progressoGeral = totalGeralMeta > 0
          ? ((totalGeralRealizado / totalGeralMeta) * 100).toFixed(1)
          : "0.0";

        const title = `⚠️ Alerta: ${empresasEmRisco.length} empresa${empresasEmRisco.length > 1 ? "s" : ""} com projeção abaixo de ${limiarPercentual}% da meta — ${nomeMes}/${ano}`;

        const content = [
          `Olá,`,
          ``,
          `O sistema identificou que ${empresasEmRisco.length === 1 ? "a seguinte empresa está" : "as seguintes empresas estão"} com projeção de fechamento abaixo de ${limiarPercentual}% da meta mensal em ${nomeMes}/${ano}:`,
          ``,
          linhasEmpresas,
          ``,
          `————————————————————`,
          `Consolidado geral: R$ ${totalGeralRealizado.toFixed(2)} realizado de R$ ${totalGeralMeta.toFixed(2)} (${progressoGeral}% da meta)`,
          ``,
          `Acesse o Meta Dashboard para mais detalhes e tome as ações necessárias.`,
        ].join("\n");

        const { notifyOwner } = await import("./_core/notification");
        const delivered = await notifyOwner({ title, content });

        return {
          success: delivered,
          message: delivered
            ? `Notificação enviada com sucesso para ${empresasEmRisco.length} empresa${empresasEmRisco.length > 1 ? "s" : ""} em risco.`
            : "Não foi possível enviar a notificação no momento. Tente novamente.",
        };
      }),
  }),

  /**
   * Histórico de acuácia das previsões mês a mês.
   * Calcula, para cada mês dos últimos N meses, quantos dias foram lançados
   * como previstos (totalPrevisto preenchido) e já passaram, e qual foi o
   * desvio médio entre o previsto e o realizado.
   */
  historicoAcuracia: router({
    listar: protectedProcedure
      .input(z.object({ meses: z.number().int().min(1).max(24).default(6) }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const { meses } = input;

        // Gerar lista de (mes, ano) dos últimos N meses
        const hoje = new Date();
        const periodos: Array<{ mes: number; ano: number }> = [];
        for (let i = meses - 1; i >= 0; i--) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
          periodos.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
        }

        // Buscar empresas do tenant
        const empresas = await getEmpresasByTenant(tenantId);

        // Para cada período, buscar faturamentos e calcular acuácia
        const resultado = await Promise.all(
          periodos.map(async ({ mes, ano }) => {
            const rows = await getAllFaturamentosByTenant(tenantId, mes, ano);
            const ultimoDia = new Date(ano, mes, 0).getDate();
            const éMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
            const diaLimite = éMesAtual ? hoje.getDate() : ultimoDia;

            let totalDias = 0;
            let somaErroPct = 0;
            const porEmpresa: Record<string, { diasAnalisados: number; acuraciaMedia: number | null }> = {};

            empresas.forEach((emp) => {
              const empRows = rows.filter((r) => r.empresaSlug === emp.slug);
              let diasEmp = 0;
              let erroEmp = 0;

              empRows.forEach((row) => {
                const dia = parseInt((row.data as string).split("-")[2]);
                if (dia > diaLimite) return;

                const valorRealizado = [
                  parseFloat((row.cat1 as string) || "0"),
                  parseFloat((row.cat2 as string) || "0"),
                  parseFloat((row.cat3 as string) || "0"),
                  parseFloat((row.cat4 as string) || "0"),
                  parseFloat((row.cat5 as string) || "0"),
                ].reduce((a, b) => a + b, 0);

                let valorPrevisto: number | null = null;

                // Prioridade 1: campo totalPrevisto
                if (row.totalPrevisto !== null && row.totalPrevisto !== undefined) {
                  valorPrevisto = parseFloat(row.totalPrevisto as string);
                } else {
                  // Prioridade 2: createdAt < data do lançamento
                  const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt as string);
                  const dataLanc = new Date(ano, mes - 1, dia);
                  const createdDay = new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate());
                  const lancDay = new Date(dataLanc.getFullYear(), dataLanc.getMonth(), dataLanc.getDate());
                  if (createdDay < lancDay) {
                    // Usa o próprio valor como proxy (sem referência do mês anterior no servidor)
                    valorPrevisto = valorRealizado; // 0% de erro como fallback conservador
                  }
                }

                if (valorPrevisto === null) return;
                if (valorPrevisto === 0 && valorRealizado === 0) return;

                const erroPct = valorPrevisto > 0
                  ? Math.abs((valorRealizado - valorPrevisto) / valorPrevisto) * 100
                  : valorRealizado > 0 ? 100 : 0;

                diasEmp++;
                erroEmp += erroPct;
              });

              porEmpresa[emp.slug] = {
                diasAnalisados: diasEmp,
                acuraciaMedia: diasEmp > 0 ? Math.max(0, 100 - erroEmp / diasEmp) : null,
              };
              totalDias += diasEmp;
              somaErroPct += erroEmp;
            });

            const acuraciaGlobal = totalDias > 0
              ? Math.max(0, 100 - somaErroPct / totalDias)
              : null;

            return {
              mes,
              ano,
              label: `${String(mes).padStart(2, "0")}/${ano}`,
              totalDias,
              acuraciaGlobal,
              porEmpresa,
            };
          })
        );

        return {
          periodos: resultado,
          empresas: empresas.map((e) => ({ slug: e.slug, nome: e.nome, cor: e.cor })),
        };
      }),
  }),
  notificacoes: router({
    // Verifica e envia notificações de meta atingida e mudança de ranking
    verificarEventos: protectedProcedure
      .input(z.object({
        mes: z.number(),
        ano: z.number(),
        // Array de empresas com seus dados atuais de progresso
        empresas: z.array(z.object({
          slug: z.string(),
          nome: z.string(),
          totalRealizado: z.number(),
          metaMensal: z.number(),
          pctMeta: z.number(),
          posicaoRanking: z.number(), // 1-based
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { notifyOwner } = await import("./_core/notification");
        const { mes, ano, empresas } = input;
        const periodoKey = `${String(mes).padStart(2, "0")}-${ano}`;
        const notificacoesEnviadas: string[] = [];

        for (const emp of empresas) {
          // 1. Verificar meta atingida
          if (emp.pctMeta >= 100) {
            const chaveMetaAtingida = `meta_atingida:${emp.slug}:${periodoKey}`;
            const jaNotificado = await eventoJaNotificado(tenantId, chaveMetaAtingida);
            if (!jaNotificado) {
              const mensagem = `🎉 ${emp.nome} atingiu a meta mensal! Faturamento realizado: R$ ${emp.totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${emp.pctMeta.toFixed(1)}% da meta de R$ ${emp.metaMensal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`;
              await notifyOwner({
                title: `🎉 Meta atingida: ${emp.nome}`,
                content: mensagem,
              });
              await registrarEventoNotificado(tenantId, chaveMetaAtingida, "meta_atingida", emp.slug, mensagem);
              notificacoesEnviadas.push(`meta_atingida:${emp.nome}`);
            }
          }

          // 2. Verificar mudança de posição no ranking
          // Busca a última posição registrada para esta empresa neste período
          const eventosRanking = await getEventosNotificados(tenantId, 50);
          const ultimoRankingEvento = eventosRanking.find(
            (e) => e.tipo === "mudanca_ranking" && e.empresaSlug === emp.slug && e.chave.includes(periodoKey)
          );
          let posicaoAnterior: number | null = null;
          if (ultimoRankingEvento) {
            const match = ultimoRankingEvento.chave.match(/:pos(\d+)$/);
            if (match) posicaoAnterior = parseInt(match[1]);
          }

          if (posicaoAnterior !== null && posicaoAnterior !== emp.posicaoRanking) {
            const chaveRanking = `ranking:${emp.slug}:${periodoKey}:pos${emp.posicaoRanking}`;
            const jaNotificado = await eventoJaNotificado(tenantId, chaveRanking);
            if (!jaNotificado) {
              const direcao = emp.posicaoRanking < posicaoAnterior ? "subiu" : "caiu";
              const emoji = direcao === "subiu" ? "📈" : "📉";
              const mensagem = `${emoji} ${emp.nome} ${direcao} no ranking: ${posicaoAnterior}º → ${emp.posicaoRanking}º lugar. Faturamento atual: R$ ${emp.totalRealizado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${emp.pctMeta.toFixed(1)}% da meta).`;
              await notifyOwner({
                title: `${emoji} Mudança no ranking: ${emp.nome}`,
                content: mensagem,
              });
              await registrarEventoNotificado(tenantId, chaveRanking, "mudanca_ranking", emp.slug, mensagem);
              notificacoesEnviadas.push(`ranking:${emp.nome}`);
            }
          } else if (posicaoAnterior === null) {
            // Registra posição inicial sem notificar
            const chaveRankingInicial = `ranking:${emp.slug}:${periodoKey}:pos${emp.posicaoRanking}`;
            const jaNotificado = await eventoJaNotificado(tenantId, chaveRankingInicial);
            if (!jaNotificado) {
              await registrarEventoNotificado(tenantId, chaveRankingInicial, "mudanca_ranking", emp.slug, `Posição inicial: ${emp.posicaoRanking}º`);
            }
          }
        }

        return { notificacoesEnviadas, total: notificacoesEnviadas.length };
      }),

    // Lista os eventos de notificação recentes
    listarEventos: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const tenantId = ctx.user.tenantId;
        if (!tenantId) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getEventosNotificados(tenantId, input.limit ?? 20);
      }),
  }),
});
export type AppRouter = typeof appRouter;
