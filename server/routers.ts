import bcrypt from "bcryptjs";
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
  updateEmpresa,
  getUserByEmail,
  getUserById,
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
  getAllBonificacoes,
  getBonificacaoByEmpresa,
  upsertBonificacao,
  getCategoriasByEmpresa,
  addCategoria,
  removeCategoria,
  updateCategoriaNome,
} from "./db";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./_core/env";

// JWT helper para sessão própria
const APP_COOKIE = "meta_session";
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "meta-dashboard-secret-2024");

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

export const appRouter = router({
  system: systemRouter,

  // ─── AUTH MANUS OAUTH (mantido para compatibilidade) ─────────────────────
  auth: router({
    me: publicProcedure.query(async (opts) => {
      // Verificar sessão própria primeiro
      const appToken = opts.ctx.req.cookies?.[APP_COOKIE];
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
      // Limpar sessão OAuth
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      // Limpar sessão própria
      ctx.res.clearCookie(APP_COOKIE, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // Login com email + senha própria
    loginComSenha: publicProcedure
      .input(z.object({
        email: z.string().email(),
        senha: z.string().min(4),
      }))
      .mutation(async ({ input, ctx }) => {
        const ip = getClientIp(ctx.req);
        const ua = ctx.req.headers["user-agent"] || "";

        const user = await getUserByEmail(input.email);

        if (!user || !user.passwordHash) {
          await createAccessLog({
            userId: user?.id ?? null,
            userName: user?.name ?? null,
            userEmail: input.email,
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
            acao: "login_falhou",
            ip,
            userAgent: ua,
            detalhes: "Senha incorreta",
          });
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos." });
        }

        // Sucesso
        await updateUserLastSignedIn(user.id);
        await createAccessLog({
          userId: user.id,
          userName: user.name ?? null,
          userEmail: user.email ?? null,
          acao: "login",
          ip,
          userAgent: ua,
          detalhes: `Login bem-sucedido`,
        });

        const token = await signAppToken(user.id);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(APP_COOKIE, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });

        return {
          success: true,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            perfil: user.perfil,
            empresaVinculada: user.empresaVinculada,
          },
        };
      }),

    // Logout da sessão própria com log
    logoutApp: publicProcedure.mutation(async ({ ctx }) => {
      const appToken = ctx.req.cookies?.[APP_COOKIE];
      if (appToken) {
        const payload = await verifyAppToken(appToken);
        if (payload) {
          const user = await getUserById(payload.userId);
          if (user) {
            await createAccessLog({
              userId: user.id,
              userName: user.name ?? null,
              userEmail: user.email ?? null,
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

    // Verificar sessão própria
    verificarSessao: publicProcedure.query(async ({ ctx }) => {
      const appToken = ctx.req.cookies?.[APP_COOKIE];
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
        lastSignedIn: user.lastSignedIn,
      };
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
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem editar empresas." });
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
        // Admin vê tudo; utilizador vê apenas as suas empresas (via userEmpresas)
        if (!ctx.user || ctx.user.role === "admin") {
          return getAllFaturamentos(input.mes, input.ano);
        }
        const slugs = await getUserEmpresaSlugs(ctx.user.id);
        if (slugs.length === 0) {
          // Fallback para empresaVinculada legado
          return getAllFaturamentos(input.mes, input.ano, ctx.user.empresaVinculada ?? undefined);
        }
        // Busca faturamentos de todas as empresas do utilizador
        const allResults = await Promise.all(
          slugs.map((slug) => getAllFaturamentos(input.mes, input.ano, slug))
        );
        return allResults.flat();
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

  // ─── BONIFICAÇÕES ─────────────────────────────────────────────────────────
  bonificacao: router({
    listar: protectedProcedure.query(async ({ ctx }) => {
      // Admin vê todas; gerente vê apenas as das suas empresas
      const all = await getAllBonificacoes();
      if (ctx.user.role === "admin") return all;
      const slugs = await getUserEmpresaSlugs(ctx.user.id);
      return all.filter((b) => slugs.includes(b.empresaSlug));
    }),

    salvar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        pctQuinzenalSemMeta: z.number().min(0).max(100),
        pctQuinzenalComMeta: z.number().min(0).max(100),
        pctMensalSemMeta: z.number().min(0).max(100),
        pctMensalComMeta: z.number().min(0).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem configurar bonificações." });
        }
        await upsertBonificacao({
          empresaSlug: input.empresaSlug,
          pctQuinzenalSemMeta: String(input.pctQuinzenalSemMeta),
          pctQuinzenalComMeta: String(input.pctQuinzenalComMeta),
          pctMensalSemMeta: String(input.pctMensalSemMeta),
          pctMensalComMeta: String(input.pctMensalComMeta),
        });
        return { success: true };
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

    criarUsuario: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(128),
        email: z.string().email(),
        senha: z.string().min(6),
        perfil: z.enum(["gerente", "operador"]),
        empresaVinculada: z.string().nullable(),
        role: z.enum(["user", "admin"]).default("user"),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        // Verificar se email já existe
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "Este email já está em uso." });
        }
        const passwordHash = await bcrypt.hash(input.senha, 12);
        const result = await createUserWithPassword({
          name: input.name,
          email: input.email,
          passwordHash,
          perfil: input.perfil,
          empresaVinculada: input.empresaVinculada,
          role: input.role,
        });
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          acao: "criar_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Criou utilizador: ${input.email} (${input.perfil})`,
        });
        return { success: true, id: result.id };
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

    redefinirSenha: protectedProcedure
      .input(z.object({
        userId: z.number(),
        novaSenha: z.string().min(6),
      }))
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
          acao: "redefinir_senha",
          ip: null,
          userAgent: null,
          detalhes: `Redefiniu senha do utilizador ID: ${input.userId}`,
        });
        return { success: true };
      }),

    toggleAtivo: protectedProcedure
      .input(z.object({
        userId: z.number(),
        ativo: z.number().min(0).max(1),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await updateUserAtivo(input.userId, input.ativo);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
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
        perfil: z.enum(["gerente", "operador"]).optional(),
        empresaVinculada: z.string().nullable().optional(),
        role: z.enum(["user", "admin"]).optional(),
        novaSenha: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        const { userId, novaSenha, ...data } = input;
        let passwordHash: string | undefined;
        if (novaSenha) {
          passwordHash = await bcrypt.hash(novaSenha, 12);
        }
        await updateUserFull(userId, { ...data, passwordHash });
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          acao: "editar_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Editou utilizador ID: ${userId}`,
        });
        return { success: true };
      }),

    // Gerir empresas do utilizador (múltiplas unidades)
    listarEmpresasUsuario: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input, ctx }) => {
        // Admin pode ver qualquer utilizador; utilizador pode ver a si mesmo
        if (ctx.user.role !== "admin" && ctx.user.id !== input.userId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito." });
        }
        return getUserEmpresaSlugs(input.userId);
      }),

    definirEmpresasUsuario: protectedProcedure
      .input(z.object({
        userId: z.number(),
        slugs: z.array(z.string()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        await setUserEmpresas(input.userId, input.slugs);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          acao: "editar_empresas_usuario",
          ip: null,
          userAgent: null,
          detalhes: `Definiu empresas do utilizador ID ${input.userId}: ${input.slugs.join(", ")}`,
        });
        return { success: true };
      }),

     // Painel de auditoria (apenas owner/dev)
    listarAcessos: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(500).default(200) }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores." });
        }
        return getAccessLogs(input.limit);
      }),
  }),

  // ─── CATEGORIAS DINÂMICAS ───────────────────────────────────────────────────────────────────
  categorias: router({
    // Listar categorias de uma empresa (qualquer utilizador autenticado)
    listar: protectedProcedure
      .input(z.object({ empresaSlug: z.string().min(1) }))
      .query(async ({ input }) => {
        return getCategoriasByEmpresa(input.empresaSlug);
      }),

    // Adicionar categoria (gerente ou admin)
    adicionar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string().min(1),
        nome: z.string().min(1).max(64),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await addCategoria(input.empresaSlug, input.nome);
        await createAccessLog({
          userId: ctx.user.id,
          userName: ctx.user.name ?? null,
          userEmail: ctx.user.email ?? null,
          acao: "adicionar_categoria",
          ip: null,
          userAgent: null,
          detalhes: `Adicionou categoria "${input.nome}" à empresa ${input.empresaSlug}`,
        });
        return { success: true };
      }),

    // Remover categoria (gerente ou admin)
    remover: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await removeCategoria(input.id);
        return { success: true };
      }),

    // Editar nome de categoria (gerente ou admin)
    editar: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).max(64),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas gerentes e administradores podem gerir categorias." });
        }
        await updateCategoriaNome(input.id, input.nome);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;
