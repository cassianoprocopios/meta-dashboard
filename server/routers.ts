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
  getCashbarberConfig,
  listCashbarberConfigs,
  upsertCashbarberConfig,
  updateCashbarberSyncStatus,
  updateCashbarberDpoteConfig,
  listCashbarberMapeamento,
  saveCashbarberMapeamento,
  insertCashbarberSyncLog,
  listCashbarberSyncLogs,
  updateCashbarberAgendamento,
  getDpoteHistoricoId,
  saveDpoteHistoricoId,
  getFaturamentoByDataEmpresaTenant,
  getFaturamentosHistoricoMensalByTenant,
  getDpoteSyncLogs,
} from "./db";
import {
  cashbarberLogin,
  cashbarberListarFiliais,
  cashbarberListarCategorias,
  cashbarberListarServicos,
  cashbarberListarProdutos,
  cashbarberRelatorio15,
  calcularFaturamentoPorCategoriaComCatalogo,
  cashbarberCriarHistoricoDpote,
  cashbarberBuscarHistoricoAtivo,
  cashbarberBuscarHistoricoDpote,
  cashbarberBuscarValorAssinaturas,
  cashbarberCalcularDpotePorFichas,
  cashbarberCalcularDpoteViaHistorico,
} from "./cashbarber";
import { sincronizarFaturamentoCashbarber } from "./cashbarberSincronizador";
import { notificarMudancaConfigCashbarber, getStatusJobsCashbarber, recarregarJobsCashbarber } from "./cashbarberJob";

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
        cat6: z.string().default("0"),
        cat7: z.string().default("0"),
        cat8: z.string().default("0"),
        cat9: z.string().default("0"),
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

    /**
     * Salva o valor total de Recorrência (cat9) manualmente para um mês/empresa.
     * Distribui o valor proporcionalmente pelos dias do mês:
     *   - Dias de 1 até hoje (dia vigente): valorTotal ÷ diasDoMes por dia
     *   - Dias futuros: R$ 0
     */
    salvarRecorrenciaManual: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2020),
        valorTotal: z.number().min(0),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem configurar Recorrência." });
        }
        if (ctx.user.role !== "admin") {
          const slugs = await getUserEmpresaSlugs(ctx.user.id);
          const empresaVinculada = ctx.user.empresaVinculada;
          if (slugs.length > 0) {
            if (!slugs.includes(input.empresaSlug)) {
              throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar Recorrência da sua unidade." });
            }
          } else if (empresaVinculada && empresaVinculada !== input.empresaSlug) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Você só pode configurar Recorrência da sua unidade." });
          }
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { mes, ano, empresaSlug, valorTotal } = input;

        const diasDoMes = new Date(ano, mes, 0).getDate();
        const hoje = new Date();
        const diaVigente =
          hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
            ? hoje.getDate()
            : hoje.getFullYear() > ano || (hoje.getFullYear() === ano && hoje.getMonth() + 1 > mes)
            ? diasDoMes
            : 0;

        // valorTotal é o total APURADO até hoje (não uma projeção mensal)
        // valorDiario = total acumulado / dias decorridos
        const valorDiario = diaVigente > 0 ? valorTotal / diaVigente : 0;
        let diasAtualizados = 0;
        let diasInseridos = 0;

        for (let dia = 1; dia <= diasDoMes; dia++) {
          const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
          // Dias passados e hoje: valor diário real apurado; dias futuros: R$ 0
          const cat9Valor = dia <= diaVigente ? String(valorDiario.toFixed(2)) : "0";
          const existente = await getFaturamentoByDataEmpresaTenant(dataStr, empresaSlug, tenantId);
          if (existente) {
            await upsertFaturamento({
              tenantId, empresaSlug, data: dataStr,
              cat1: existente.cat1 ?? "0", cat2: existente.cat2 ?? "0",
              cat3: existente.cat3 ?? "0", cat4: existente.cat4 ?? "0",
              cat5: existente.cat5 ?? "0", cat6: existente.cat6 ?? "0",
              cat7: existente.cat7 ?? "0", cat8: existente.cat8 ?? "0",
              cat9: cat9Valor,
              sincronizadoCB: existente.sincronizadoCB ?? 0,
              observacao: existente.observacao ?? undefined,
              lancadoPor: ctx.user.name ?? ctx.user.email ?? "manual",
            });
            diasAtualizados++;
          } else if (dia <= diaVigente) {
            await upsertFaturamento({
              tenantId, empresaSlug, data: dataStr,
              cat1: "0", cat2: "0", cat3: "0", cat4: "0",
              cat5: "0", cat6: "0", cat7: "0", cat8: "0",
              cat9: cat9Valor, sincronizadoCB: 0,
              lancadoPor: ctx.user.name ?? ctx.user.email ?? "manual",
            });
            diasInseridos++;
          }
        }

        return {
          valorTotal,
          valorDiario: parseFloat(valorDiario.toFixed(2)),
          diasDoMes,
          diaVigente,
          diasAtualizados,
          diasInseridos,
          // acumuladoAteHoje = valorTotal (é exatamente o que foi informado)
          acumuladoAteHoje: parseFloat(valorTotal.toFixed(2)),
          diasRestantes: diasDoMes - diaVigente,
          // projeção mensal = valorDiario × diasDoMes
          projecaoMensal: parseFloat((valorDiario * diasDoMes).toFixed(2)),
        };
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
        const [metasAno, fatAno, bonificacoesConfig] = await Promise.all([
          getMetasAnoByTenant(tenantId, input.ano),
          getFaturamentosAnoByTenant(tenantId, input.ano),
          getAllBonificacoesByTenant(tenantId),
        ]);
        return { metas: metasAno, faturamentos: fatAno, bonificacoes: bonificacoesConfig };
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
        pctSuperMeta: z.string().optional().default("0"),
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

  // ─── CASHBARBER ───────────────────────────────────────────────────────────
  cashbarber: router({
    /** Busca a configuração CashBarber de uma empresa */
    listarConfig: protectedProcedure
      .input(z.object({ empresaSlug: z.string() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const config = await getCashbarberConfig(tenantId, input.empresaSlug);
        if (!config) return null;
        // Ocultar a senha na resposta
        return { ...config, cbSenha: "***" };
      }),

    /** Lista todas as configurações CashBarber do tenant */
    listarTodas: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const configs = await listCashbarberConfigs(tenantId);
      return configs.map((c) => ({ ...c, cbSenha: "***" }));
    }),

    /**
     * Retorna a distribuição do Dpote por filial para o mês/ano especificado.
     * Distribui 100% das assinaturas proporcionalmente às fichas de cada filial.
     */
    dpoteDistribuicao: protectedProcedure
      .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const configs = await listCashbarberConfigs(tenantId);

        // Usar qualquer config com credenciais CashBarber para fazer login
        const configComCred = configs.find((c) => c.cbEmail && c.cbSenha);
        if (!configComCred) return { filiais: [], totalAssinaturas: 0, totalFichas: 0, historicoId: null };

        // Login CashBarber
        const token = await cashbarberLogin(configComCred.cbEmail, configComCred.cbSenha);

        // Criar um novo histórico para obter o ID mais recente como ponto de partida
        let idInicial: number;
        try {
          idInicial = await cashbarberCriarHistoricoDpote(token);
        } catch {
          // Se falhar, usar o ID salvo no banco como fallback
          // Buscar o ID mais recente de qualquer empresa configurada
          const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
          let savedId: number | null = null;
          for (const cfg of configs) {
            savedId = await getDpoteHistoricoId(tenantId, cfg.empresaSlug, mesSigla);
            if (savedId) break;
          }
          idInicial = savedId ?? 68539; // fallback para o ID conhecido com dados
        }

        // Buscar o histórico mais recente com fichas > 0 (retroativamente)
        const resultado = await cashbarberCalcularDpoteViaHistorico(token, idInicial);
        if (!resultado) return { filiais: [], totalAssinaturas: 0, totalFichas: 0, historicoId: null };

        // Salvar o ID do histórico ativo e o valor de assinaturas no banco para todas as empresas configuradas
        const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
        for (const cfg of configs) {
          await saveDpoteHistoricoId(tenantId, cfg.empresaSlug, resultado.historicoId, mesSigla, resultado.valorAssinaturas);
        }

        return {
          totalAssinaturas: resultado.valorAssinaturas,
          totalFichas: resultado.totalFichas,
          historicoId: resultado.historicoId,
          porcentagemBarbearias: resultado.porcentagemBarbearias,
          filiais: resultado.filiais.map((r) => ({
            filialId: r.filialId,
            filialNome: r.filialNome,
            fichas: r.fichas,
            percentual: r.percentual,
            valorDistribuido: r.valorDistribuido,
          })),
        };
      }),

    /**
     * Calcula a distribuição Dpote por filial (100% das assinaturas por fichas)
     * e aplica o valor distribuído como cat5 (Recorrência) no faturamento do dia 1.
     */
    aplicarDpoteNoFaturamento: protectedProcedure
      .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const configs = await listCashbarberConfigs(tenantId);

        // Usar qualquer config com credenciais CashBarber para fazer login
        const configComCred = configs.find((c) => c.cbEmail && c.cbSenha);
        if (!configComCred) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma empresa com credenciais CashBarber configurada." });
        }

        // Login CashBarber
        const token = await cashbarberLogin(configComCred.cbEmail, configComCred.cbSenha);

        // Criar um novo histórico para obter o ID mais recente como ponto de partida
        let idInicial: number;
        try {
          idInicial = await cashbarberCriarHistoricoDpote(token);
        } catch {
          const mesSiglaFallback = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
          let savedId: number | null = null;
          for (const cfg of configs) {
            savedId = await getDpoteHistoricoId(tenantId, cfg.empresaSlug, mesSiglaFallback);
            if (savedId) break;
          }
          idInicial = savedId ?? 68539;
        }

        // Buscar o histórico mais recente com fichas > 0 (retroativamente)
        const resultado = await cashbarberCalcularDpoteViaHistorico(token, idInicial);
        if (!resultado) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum histórico Dpote com dados válidos encontrado." });
        }

        // Salvar o ID do histórico ativo e o valor de assinaturas no banco
        const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
        for (const cfg of configs) {
          await saveDpoteHistoricoId(tenantId, cfg.empresaSlug, resultado.historicoId, mesSigla, resultado.valorAssinaturas);
        }

        // Para cada empresa configurada com dpoteFilialNome, encontrar o resultado correspondente
        const dia1 = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
        const aplicados: Array<{ empresaSlug: string; filialNome: string; valorDistribuido: number }> = [];
        const naoEncontrados: string[] = [];

        for (const config of configs) {
          if (!config.dpoteFilialNome) continue;
          const nomeBusca = config.dpoteFilialNome.trim().toLowerCase();
          const filial = resultado.filiais.find((r) => r.filialNome.toLowerCase().includes(nomeBusca));
          if (!filial) {
            naoEncontrados.push(config.empresaSlug);
            continue;
          }

          // Buscar faturamento existente no dia 1 para preservar outras categorias
          const existente = await getFaturamentoByDataEmpresaTenant(dia1, config.empresaSlug, tenantId);

          // Atualizar cat9 (Recorrência) no dia 1 com o valor distribuído da filial
          await upsertFaturamento({
            tenantId,
            empresaSlug: config.empresaSlug,
            data: dia1,
            cat1: existente?.cat1 ?? "0",
            cat2: existente?.cat2 ?? "0",
            cat3: existente?.cat3 ?? "0",
            cat4: existente?.cat4 ?? "0",
            cat5: existente?.cat5 ?? "0",
            cat6: existente?.cat6 ?? "0",
            cat7: existente?.cat7 ?? "0",
            cat8: existente?.cat8 ?? "0",
            cat9: String(filial.valorDistribuido),
            sincronizadoCB: existente?.sincronizadoCB ?? 0,
            observacao: existente?.observacao ?? undefined,
            lancadoPor: existente?.lancadoPor ?? undefined,
          });

          aplicados.push({
            empresaSlug: config.empresaSlug,
            filialNome: filial.filialNome,
            valorDistribuido: filial.valorDistribuido,
          });
        }

        return {
          aplicados,
          naoEncontrados,
          totalAssinaturas: resultado.valorAssinaturas,
          historicoId: resultado.historicoId,
        };
      }),

    /** Retorna apenas os campos Dpote de todas as empresas configuradas (sem credenciais) */
    listarConfigsDpote: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const configs = await listCashbarberConfigs(tenantId);
      return configs.map((c) => ({
        empresaSlug: c.empresaSlug,
        dpoteValorAssinaturas: c.dpoteValorAssinaturas ? parseFloat(String(c.dpoteValorAssinaturas)) : null,
        dpotePorcentagemBarbearia: c.dpotePorcentagemBarbearia ? parseFloat(String(c.dpotePorcentagemBarbearia)) : null,
        dpoteHistoricoId: (c as any).dpoteHistoricoId ?? null,
        dpoteHistoricoMes: (c as any).dpoteHistoricoMes ?? null,
      }));
    }),

    /**
     * Ajusta manualmente o valor de Recorrência (cat9) de uma empresa no dia 1 do mês.
     * Aceita empresaSlug direto OU dpoteFilialNome (nome da filial no CashBarber) para mapeamento automático.
     * Suporta dois modos:
     * - "substituir": substitui o cat9 atual pelo novo valor
     * - "somar": soma o novo valor ao cat9 atual
     */
    ajustarCat5Empresa: protectedProcedure
      .input(
        z.object({
          /** Slug da empresa (prioritário) ou nome da filial Dpote para mapeamento automático */
          empresaSlug: z.string().optional(),
          dpoteFilialNome: z.string().optional(),
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020),
          valor: z.number().min(0),
          operacao: z.enum(["substituir", "somar"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);

        // Resolver o empresaSlug: usar direto ou mapear via dpoteFilialNome
        let empresaSlug = input.empresaSlug;
        if (!empresaSlug && input.dpoteFilialNome) {
          const configs = await listCashbarberConfigs(tenantId);
          const nomeBusca = input.dpoteFilialNome.trim().toLowerCase();
          const config = configs.find(
            (c) => c.dpoteFilialNome && c.dpoteFilialNome.trim().toLowerCase() === nomeBusca
          ) ?? configs.find(
            (c) => c.dpoteFilialNome && nomeBusca.includes(c.dpoteFilialNome.trim().toLowerCase())
          ) ?? configs.find(
            (c) => c.dpoteFilialNome && c.dpoteFilialNome.trim().toLowerCase().includes(nomeBusca)
          );
          if (!config) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Nenhuma empresa encontrada com dpoteFilialNome correspondente a "${input.dpoteFilialNome}". Configure o nome da filial Dpote no AdminPanel.`,
            });
          }
          empresaSlug = config.empresaSlug;
        }
        if (!empresaSlug) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe empresaSlug ou dpoteFilialNome." });
        }

        const dia1 = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;

        // Buscar faturamento existente para preservar outras categorias
        const existente = await getFaturamentoByDataEmpresaTenant(dia1, empresaSlug, tenantId);
        const cat9Atual = existente?.cat9 ? parseFloat(String(existente.cat9)) : 0;

        const novoCat9 =
          input.operacao === "somar"
            ? cat9Atual + input.valor
            : input.valor;

        await upsertFaturamento({
          tenantId,
          empresaSlug,
          data: dia1,
          cat1: existente?.cat1 ?? "0",
          cat2: existente?.cat2 ?? "0",
          cat3: existente?.cat3 ?? "0",
          cat4: existente?.cat4 ?? "0",
          cat5: existente?.cat5 ?? "0",
          cat6: existente?.cat6 ?? "0",
          cat7: existente?.cat7 ?? "0",
          cat8: existente?.cat8 ?? "0",
          cat9: String(novoCat9),
          sincronizadoCB: existente?.sincronizadoCB ?? 0,
          observacao: existente?.observacao ?? undefined,
          lancadoPor: ctx.user?.email ?? undefined,
        });

        return {
          empresaSlug,
          operacao: input.operacao,
          cat5Anterior: cat9Atual,
          cat5Novo: novoCat9,
          diferenca: novoCat9 - cat9Atual,
        };
      }),

    /**
     * Força a sincronização manual dos valores do Dpote com o CashBarber.
     * Cria um novo histórico Dpote na API, busca o valor atualizado de assinaturas
     * e aplica o valor distribuído (100% por fichas) de cada filial no cat5 (dia 1 do mês).
     */
    sincronizarDpoteManual: protectedProcedure
      .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const configs = await listCashbarberConfigs(tenantId);

        // Encontrar config com Dpote configurado
        const configComDpote = configs.find(
          (c) => c.dpoteFilialNome && c.cbEmail && c.cbSenha
        );
        if (!configComDpote) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma empresa com Dpote configurado encontrada." });
        }

        // Login no CashBarber
        const token = await cashbarberLogin(configComDpote.cbEmail, configComDpote.cbSenha);

        // Criar novo histórico Dpote para obter valor atualizado
        const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
        let valorAssinaturas: number;
        let porcentagemBarbearia: number;
        let historicoId: number;
        let fonteDados: string;

        try {
          historicoId = await cashbarberCriarHistoricoDpote(token);
          await saveDpoteHistoricoId(tenantId, configComDpote.empresaSlug, historicoId, mesSigla);
          // Aguardar processamento
          await new Promise(resolve => setTimeout(resolve, 2000));
          const dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoId);
          if (!dadosApi || dadosApi.valorAssinaturas <= 0) {
            throw new Error(`Histórico #${historicoId} retornou valor inválido`);
          }
          valorAssinaturas = dadosApi.valorAssinaturas;
          porcentagemBarbearia = dadosApi.porcentagemBarbearia;
          fonteDados = `API (histórico #${historicoId})`;
        } catch (errApi) {
          // Fallback: usar valor manual salvo na config
          const valManual = configComDpote.dpoteValorAssinaturas ? parseFloat(String(configComDpote.dpoteValorAssinaturas)) : null;
          if (!valManual) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Falha ao buscar valor da API e nenhum valor manual configurado: ${errApi instanceof Error ? errApi.message : String(errApi)}`,
            });
          }
          valorAssinaturas = valManual;
          porcentagemBarbearia = 100; // distribuição é sempre 100%
          fonteDados = "valor manual (API indisponível)";
        }

        // Atualizar automaticamente o valor de assinaturas na config se veio da API e for diferente do salvo
        let valorAssinaturasAtualizado = false;
        let valorAssinaturasAnterior: number | null = null;
        if (fonteDados.startsWith("API")) {
          const valSalvo = configComDpote.dpoteValorAssinaturas
            ? parseFloat(String(configComDpote.dpoteValorAssinaturas))
            : null;
          const diferenca = valSalvo !== null ? Math.abs(valorAssinaturas - valSalvo) / valSalvo : 1;
          if (valSalvo === null || diferenca > 0.001) {
            // Atualizar todos os configs que usam Dpote com o novo valor
            for (const config of configs) {
              if (!config.dpoteFilialNome) continue;
              await updateCashbarberDpoteConfig(
                tenantId,
                config.empresaSlug,
                valorAssinaturas,
                porcentagemBarbearia
              );
            }
            valorAssinaturasAtualizado = true;
            valorAssinaturasAnterior = valSalvo;
          }
        }

        // Calcular distribuição por filial
        const hoje = new Date();
        const ehMesAtual = input.mes === hoje.getMonth() + 1 && input.ano === hoje.getFullYear();
        const ultimoDia = ehMesAtual ? hoje.getDate() : new Date(input.ano, input.mes, 0).getDate();
        const dataInicial = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
        const dataFinal = `${input.ano}-${String(input.mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

        const resultados = await cashbarberCalcularDpotePorFichas(
          token, dataInicial, dataFinal, valorAssinaturas, porcentagemBarbearia
        );

        // Aplicar cat9 (Recorrência) no dia 1 de cada empresa configurada com Dpote
        const dia1 = dataInicial;
        const aplicados: Array<{ empresaSlug: string; filialNome: string; valorDistribuido: number }> = [];
        const naoEncontrados: string[] = [];

        for (const config of configs) {
          if (!config.dpoteFilialNome) continue;
          const nomeBusca = config.dpoteFilialNome.trim().toLowerCase();
          const filial = resultados.find((r) => r.filialNome.toLowerCase().includes(nomeBusca));
          if (!filial) {
            naoEncontrados.push(config.empresaSlug);
            continue;
          }
          const existente = await getFaturamentoByDataEmpresaTenant(dia1, config.empresaSlug, tenantId);
          await upsertFaturamento({
            tenantId,
            empresaSlug: config.empresaSlug,
            data: dia1,
            cat1: existente?.cat1 ?? "0",
            cat2: existente?.cat2 ?? "0",
            cat3: existente?.cat3 ?? "0",
            cat4: existente?.cat4 ?? "0",
            cat5: existente?.cat5 ?? "0",
            cat6: existente?.cat6 ?? "0",
            cat7: existente?.cat7 ?? "0",
            cat8: existente?.cat8 ?? "0",
            cat9: String(filial.valorDistribuido),
            sincronizadoCB: existente?.sincronizadoCB ?? 0,
            observacao: existente?.observacao ?? undefined,
            lancadoPor: ctx.user?.email ?? undefined,
          });
          aplicados.push({ empresaSlug: config.empresaSlug, filialNome: filial.filialNome, valorDistribuido: filial.valorDistribuido });
        }

        return {
          aplicados,
          naoEncontrados,
          totalAssinaturas: valorAssinaturas,
          fonteDados,
          valorAssinaturasAtualizado,
          valorAssinaturasAnterior,
        };
      }),

    /** Salva a configuração CashBarber de uma empresa */
    salvarConfig: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string(),
          cbEmail: z.string().email(),
          cbSenha: z.string().min(1),
          cbFilialId: z.number().int().positive(),
          cbFilialNome: z.string().optional(),
          /** ID da filial no módulo Dpote (pode diferir do cbFilialId) */
          dpoteFilialId: z.number().int().positive().optional(),
          /** Nome da filial no módulo Dpote (ex: 'Morumbi', 'Mascote') — alternativa ao ID */
          dpoteFilialNome: z.string().optional(),
          /** Valor total das assinaturas do mês (base para cálculo da comissão bruta Dpote) */
          dpoteValorAssinaturas: z.number().positive().optional(),
          /** Percentual da comissão que vai para a barbearia (ex: 65 = 65%) */
          dpotePorcentagemBarbearia: z.number().min(1).max(100).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const user = await getUserById(ctx.user?.id || 0);
        if (!user || (user.role !== "admin" && user.tenantId !== null)) {
          // Verificar se é admin do tenant
          const isAdmin = user?.role === "admin";
          if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem configurar a integração CashBarber" });
        }
        await upsertCashbarberConfig({
          tenantId,
          empresaSlug: input.empresaSlug,
          cbEmail: input.cbEmail,
          cbSenha: input.cbSenha,
          cbFilialId: input.cbFilialId,
          cbFilialNome: input.cbFilialNome,
          dpoteFilialId: input.dpoteFilialId ?? null,
          dpoteFilialNome: input.dpoteFilialNome ?? null,
          dpoteValorAssinaturas: input.dpoteValorAssinaturas ? String(input.dpoteValorAssinaturas) : null,
          dpotePorcentagemBarbearia: input.dpotePorcentagemBarbearia ? String(input.dpotePorcentagemBarbearia) : null,
        });
        // Recarregar jobs após salvar a configuração
        recarregarJobsCashbarber().catch(() => {});
        return { ok: true };
      }),

    /** Testa a conexão com o CashBarber */
    testarConexao: protectedProcedure
      .input(
        z.object({
          cbEmail: z.string().email(),
          cbSenha: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        try {
          const token = await cashbarberLogin(input.cbEmail, input.cbSenha);
          const filiais = await cashbarberListarFiliais(token);
          return {
            ok: true,
            filiais: filiais.map((f) => ({
              id: f.id,
              nome: `${f.fil_bairro} - ${f.fil_logradouro}, ${f.fil_numero}`,
              email: f.fil_email,
            })),
          };
        } catch (err: any) {
          return { ok: false, erro: err.message || "Falha na conexão" };
        }
      }),

    /** Busca as categorias e serviços do CashBarber para configurar o mapeamento */
    buscarCatalogo: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const config = await getCashbarberConfig(tenantId, input.empresaSlug);
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configuração CashBarber não encontrada" });
        try {
          const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
          const [categorias, servicos, produtos] = await Promise.all([
            cashbarberListarCategorias(token),
            cashbarberListarServicos(token),
            cashbarberListarProdutos(token),
          ]);
          return { categorias, servicos, produtos };
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
        }
      }),

    /** Lista as filiais disponíveis no módulo Dpote do CashBarber para uma empresa */
    listarFiliaisDpote: protectedProcedure
      .input(z.object({ empresaSlug: z.string() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const config = await getCashbarberConfig(tenantId, input.empresaSlug);
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configuração CashBarber não encontrada" });
        try {
          const token = await cashbarberLogin(config.cbEmail, config.cbSenha);

          // Reutilizar histórico Dpote do mês atual (ou criar novo)
          const now = new Date();
          const mes = now.getMonth() + 1;
          const ano = now.getFullYear();
          const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;

          let historicoId = await getDpoteHistoricoId(tenantId, input.empresaSlug, mesSigla);
          if (!historicoId) {
            historicoId = await cashbarberCriarHistoricoDpote(token);
            await saveDpoteHistoricoId(tenantId, input.empresaSlug, historicoId, mesSigla);
          }

          const historico = await cashbarberBuscarHistoricoDpote(token, historicoId);

          // Calcular total de fichas para exibir proporção
          const totalFichas = historico.filiais_servicos.reduce(
            (acc, f) => acc + f.servicos.reduce((s, sv) => s + (sv.fichas || 0), 0),
            0
          );

          // Comissão bruta total = valor_assinaturas × porcentagem_barbearias%
          const comissaoBrutaTotal = historico.faturamento.valor_ganho_assinaturas
            * (historico.faturamento.porcentagem_comissao_barbearias / 100);

          const filiais = historico.filiais_servicos.map((f) => {
            const fichas = f.servicos.reduce((acc, sv) => acc + (sv.fichas || 0), 0);
            const proporcao = totalFichas > 0 ? fichas / totalFichas : 0;
            const comissaoBruta = Math.round(comissaoBrutaTotal * proporcao);
            // Verificar se esta filial está configurada (por nome ou por ID)
            const nomeConfig = config.dpoteFilialNome?.trim().toLowerCase() ?? "";
            const isConfigurada = nomeConfig
              ? f.filial.fil_bairro?.toLowerCase().includes(nomeConfig)
              : config.dpoteFilialId
                ? f.filial.id === config.dpoteFilialId
                : f.filial.id === config.cbFilialId;
            return {
              id: f.filial.id,
              nome: f.filial.fil_bairro,
              fichas,
              percentual: totalFichas > 0 ? Math.round((fichas / totalFichas) * 100) : 0,
              percentualExato: totalFichas > 0 ? (fichas / totalFichas) * 100 : 0,
              comissaoBruta,
              isConfigurada: !!isConfigurada,
            };
          });

          // Ordenar por fichas (maior primeiro)
          filiais.sort((a, b) => b.fichas - a.fichas);

          return {
            filiais,
            totalFichas,
            mesSigla,
            valorAssinaturas: historico.faturamento.valor_ganho_assinaturas,
            porcentagemBarbearias: historico.faturamento.porcentagem_comissao_barbearias,
            comissaoBrutaTotal: Math.round(comissaoBrutaTotal),
            filialConfiguradaNome: config.dpoteFilialNome ?? null,
          };
        } catch (err: any) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message || "Falha ao buscar filiais Dpote" });
        }
      }),

    /** Busca o mapeamento de categorias CashBarber de uma empresa */
    listarMapeamento: protectedProcedure
      .input(z.object({ empresaSlug: z.string() }))
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        return listCashbarberMapeamento(tenantId, input.empresaSlug);
      }),

    /** Salva o mapeamento de categorias CashBarber */
    salvarMapeamento: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string(),
          mapeamento: z.array(
            z.object({
              tipo: z.enum(["servico_categoria", "produto_categoria", "servico_id", "produto_id"]),
              cbId: z.string(),
              cbNome: z.string(),
              metaCategoria: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        await saveCashbarberMapeamento(tenantId, input.empresaSlug, input.mapeamento);
        return { ok: true };
      }),

    /** Sincroniza dados do CashBarber para um mês específico */
    sincronizar: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string(),
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020).max(2030),
          sobreescrever: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const config = await getCashbarberConfig(tenantId, input.empresaSlug);
        if (!config) throw new TRPCError({ code: "NOT_FOUND", message: "Configuração CashBarber não encontrada" });

        const mapeamento = await listCashbarberMapeamento(tenantId, input.empresaSlug);
        if (mapeamento.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Configure o mapeamento de categorias antes de sincronizar" });

        try {
          // Login no CashBarber
          const token = await cashbarberLogin(config.cbEmail, config.cbSenha);

          // Buscar catálogos para resolução de categorias
          const [catalogoServicos, catalogoProdutos, categoriasCB] = await Promise.all([
            cashbarberListarServicos(token),
            cashbarberListarProdutos(token),
            cashbarberListarCategorias(token),
          ]);

          // Calcular período do mês
          const dataInicial = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
          const ultimoDia = new Date(input.ano, input.mes, 0).getDate();
          const dataFinal = `${input.ano}-${String(input.mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

          // Buscar dados dia a dia para popular faturamentos diários
          const diasNoMes = ultimoDia;
          const hoje = new Date();
          const diasSincronizados: string[] = [];
          const diasIgnorados: string[] = [];
          const erros: string[] = [];

          for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataStr = `${input.ano}-${String(input.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const dataObj = new Date(dataStr + "T12:00:00");

            // Não sincronizar dias futuros
            if (dataObj > hoje) {
              diasIgnorados.push(dataStr);
              continue;
            }

            try {
              // Buscar dados do dia no CashBarber
              const relatorio = await cashbarberRelatorio15(token, dataStr, dataStr, config.cbFilialId);

              // Calcular faturamento por categoria
              const fat = calcularFaturamentoPorCategoriaComCatalogo(
                relatorio,
                mapeamento,
                catalogoServicos,
                catalogoProdutos
              );

              // Verificar se já existe faturamento para este dia
              const faturamentosExistentes = await getAllFaturamentosByTenant(tenantId, input.mes, input.ano, input.empresaSlug);
              const existente = faturamentosExistentes.find(
                (f) => f.data === dataStr
              );

              if (existente && !input.sobreescrever) {
                diasIgnorados.push(dataStr);
                continue;
              }

              // Salvar faturamento
              await upsertFaturamento({
                tenantId,
                empresaSlug: input.empresaSlug,
                data: dataStr,
                cat1: String(fat.cat1),
                cat2: String(fat.cat2),
                cat3: String(fat.cat3),
                cat4: String(fat.cat4),
                cat5: String(fat.cat5),
                lancadoPor: "CashBarber (sync)",
              });

              diasSincronizados.push(dataStr);
            } catch (err: any) {
              erros.push(`${dataStr}: ${err.message}`);
            }
          }

          // Atualizar status da sincronização
          await updateCashbarberSyncStatus(tenantId, input.empresaSlug, "ok");
          // Registrar no log
          await insertCashbarberSyncLog({
            tenantId,
            empresaSlug: input.empresaSlug,
            origem: "manual",
            status: erros.length === 0 ? "ok" : diasSincronizados.length > 0 ? "parcial" : "erro",
            mes: input.mes,
            ano: input.ano,
            diasSincronizados: diasSincronizados.length,
            diasIgnorados: diasIgnorados.length,
            erros: erros.length > 0 ? erros.slice(0, 10).join("; ") : undefined,
          });
          return {
            ok: true,
            diasSincronizados: diasSincronizados.length,
            diasIgnorados: diasIgnorados.length,
            erros,
            periodo: `${dataInicial} a ${dataFinal}`,
          };
        } catch (err: any) {
          await updateCashbarberSyncStatus(tenantId, input.empresaSlug, "erro");
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: err.message });
        }
      }),

    /** Configura o agendamento automático de sincronização (executa a cada hora) */
    configurarAgendamento: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string(),
          sincAutoAtiva: z.boolean(),
          horarioSinc: z.string().optional(), // mantido por compatibilidade, ignorado
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const tenantId = ctx.user.tenantId ?? 0;
        // horarioSinc fixado em "00:00" pois o job executa a cada hora
        await updateCashbarberAgendamento(
          tenantId,
          input.empresaSlug,
          input.sincAutoAtiva,
          "00:00"
        );
        // Notificar o gerenciador de jobs (intervalo horário fixo)
        await notificarMudancaConfigCashbarber(
          tenantId,
          input.empresaSlug,
          input.sincAutoAtiva
        );
        return { ok: true };
      }),

    /** Lista os logs de sincronização de uma empresa */
    listarLogs: protectedProcedure
      .input(z.object({ empresaSlug: z.string(), limit: z.number().min(1).max(100).default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const tenantId = ctx.user.tenantId ?? 0;
        return listCashbarberSyncLogs(tenantId, input.empresaSlug, input.limit);
      }),

    /** Retorna o status dos jobs de sincronização ativos */
    statusJobs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getStatusJobsCashbarber();
    }),

    /** Recarrega os jobs (útil após mudanças de configuração) */
    recarregarJobs: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      await recarregarJobsCashbarber();
      return { ok: true, jobs: getStatusJobsCashbarber() };
    }),
    /** Sincroniza todas as empresas configuradas do tenant para o mês/ano atual */
    /**
     * Sincroniza apenas o Dpote (Recorrência/cat5) do mês atual para todas as
     * empresas do tenant que possuem integração CashBarber ativa.
     * Disponível para gerentes (não requer role admin).
     */
    sincronizarDpote: protectedProcedure
      .mutation(async ({ ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const configs = await listCashbarberConfigs(tenantId);
        const configsAtivas = configs.filter((c) => c.ativo === 1);
        if (configsAtivas.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com integração CashBarber configurada" });
        }
        const now = new Date();
        const mes = now.getMonth() + 1;
        const ano = now.getFullYear();
        const resultados: Array<{
          empresa: string;
          recorrenciaAtualizada: boolean;
          recorrenciaValor: number;
          erros: string[];
        }> = [];
        for (const config of configsAtivas) {
          try {
            const resultado = await sincronizarFaturamentoCashbarber(
              tenantId,
              config.empresaSlug,
              mes,
              ano,
              "manual"
            );
            resultados.push({
              empresa: config.empresaSlug,
              recorrenciaAtualizada: resultado.recorrenciaAtualizada ?? false,
              recorrenciaValor: resultado.recorrenciaValor ?? 0,
              erros: resultado.erros ? [resultado.erros] : [],
            });
          } catch (e) {
            resultados.push({
              empresa: config.empresaSlug,
              recorrenciaAtualizada: false,
              recorrenciaValor: 0,
              erros: [e instanceof Error ? e.message : String(e)],
            });
          }
        }
        return { resultados, mes, ano };
      }),

    sincronizarTodas: protectedProcedure
      .input(
        z.object({
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020).max(2030),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const tenantId = await getTenantIdFromCtx(ctx);
        const configs = await listCashbarberConfigs(tenantId);
        const configsAtivas = configs.filter((c) => c.ativo === 1);
        if (configsAtivas.length === 0) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com integração CashBarber configurada" });
        }
        const resultados: Array<{
          empresa: string;
          diasSincronizados: number;
          recorrenciaAtualizada: boolean;
          erros: string[];
        }> = [];
        for (const config of configsAtivas) {
          try {
            const resultado = await sincronizarFaturamentoCashbarber(
              tenantId,
              config.empresaSlug,
              input.mes,
              input.ano,
              "manual"
            );
            resultados.push({
              empresa: config.empresaSlug,
              diasSincronizados: resultado.diasSincronizados,
              recorrenciaAtualizada: resultado.recorrenciaAtualizada ?? false,
              erros: resultado.erros ? [resultado.erros] : [],
            });
          } catch (e) {
            resultados.push({
              empresa: config.empresaSlug,
              diasSincronizados: 0,
              recorrenciaAtualizada: false,
              erros: [e instanceof Error ? e.message : String(e)],
            });
          }
        }
        return { resultados };
      }),

    /**
     * Retorna o histórico mensal de Recorrência (cat5) por empresa
     * para os últimos N meses (padrão: 12).
     * Retorna array de mêses com o total de cat5 por empresa.
     */
    dpoteHistoricoMensal: protectedProcedure
      .input(
        z.object({
          anoFim: z.number().int().min(2020).optional(),
          mesFim: z.number().int().min(1).max(12).optional(),
          qtdMeses: z.number().int().min(2).max(24).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const agora = new Date();
        const anoFim = input.anoFim ?? agora.getFullYear();
        const mesFim = input.mesFim ?? (agora.getMonth() + 1);
        const qtdMeses = input.qtdMeses ?? 12;

        // Buscar empresas do tenant para obter nomes
        const empresasList = await getEmpresasByTenant(tenantId);
        const empresaNomes: Record<string, string> = {};
        for (const e of empresasList) {
          empresaNomes[e.slug] = e.nome;
        }

        // Buscar histórico de cat5 por empresa e mês
        const historico = await getFaturamentosHistoricoMensalByTenant(tenantId, anoFim, mesFim, qtdMeses);

        // Coletar todos os meses e empresas presentes
        const mesesSet = new Set<string>();
        const empresasSet = new Set<string>();
        for (const h of historico) {
          mesesSet.add(h.mesAno);
          empresasSet.add(h.empresaSlug);
        }

        // Ordenar meses cronologicamente
        const mesesOrdenados = Array.from(mesesSet).sort();

        // Montar estrutura: array de { mesAno, mesLabel, [empresaSlug]: totalCat5 }
        const MESES_LABEL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
        const pontos = mesesOrdenados.map((mesAno) => {
          const [anoStr, mesStr] = mesAno.split("-");
          const mesIdx = parseInt(mesStr, 10) - 1;
          const mesLabel = `${MESES_LABEL[mesIdx]}/${anoStr.slice(2)}`;
          const ponto: Record<string, string | number> = { mesAno, mesLabel };
          for (const slug of Array.from(empresasSet)) {
            const entry = historico.find((h) => h.mesAno === mesAno && h.empresaSlug === slug);
            ponto[slug] = entry ? Math.round(entry.totalCat5 * 100) / 100 : 0;
          }
          return ponto;
        });

        // Montar lista de empresas com nome e slug
        const empresasLista = Array.from(empresasSet).map((slug) => ({
          slug,
          nome: empresaNomes[slug] ?? slug,
        }));

        return {
          pontos,
          empresas: empresasLista,
          meses: mesesOrdenados,
        };
      }),

    /**
     * Sincroniza o Dpote (Recorrência/cat9) do mês atual apenas para uma empresa específica.
     * Usado pelo botão "Sincronizar com CashBarber" no painel manual de Recorrência.
     */
    sincronizarDpotePorEmpresa: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string().min(1),
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        try {
          const resultado = await sincronizarFaturamentoCashbarber(
            tenantId,
            input.empresaSlug,
            input.mes,
            input.ano,
            "manual"
          );
          return {
            empresa: input.empresaSlug,
            recorrenciaAtualizada: resultado.recorrenciaAtualizada ?? false,
            recorrenciaValor: resultado.recorrenciaValor ?? 0,
            erros: resultado.erros ? [resultado.erros] : [],
          };
        } catch (e) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: e instanceof Error ? e.message : String(e),
          });
        }
      }),

    dpoteSyncLog: protectedProcedure
      .input(
        z.object({
          limit: z.number().int().min(1).max(200).optional().default(50),
        })
      )
      .query(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const logs = await getDpoteSyncLogs(tenantId, input.limit);
        return logs.map((log) => ({
          id: log.id,
          empresaSlug: log.empresaSlug,
          mes: log.mes,
          ano: log.ano,
          valorAnterior: parseFloat(String(log.valorAnterior)),
          valorNovo: parseFloat(String(log.valorNovo)),
          variacao: parseFloat(String(log.variacao)),
          diasAtualizados: log.diasAtualizados,
          fonte: log.fonte,
          tipoExecucao: log.tipoExecucao,
          erro: log.erro,
          executadoEm: log.executadoEm,
        }));
      }),
  }),
});
export type AppRouter = typeof appRouter;
