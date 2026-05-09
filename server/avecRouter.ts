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
  // ── Configuração ────────────────────────────────────────────────────────────

  // Buscar configuração do Avec para uma empresa (alias: getConfig e listarConfig)
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
        avecSenha: cfg.avecSenha,
        avecSalaoNome: cfg.avecSalaoNome,
        ultimaSincronizacao: cfg.ultimaSincronizacao,
        statusUltimaSinc: cfg.statusUltimaSinc,
        sincAutoAtiva: cfg.sincAutoAtiva === 1 ? 1 : 0,
        ativo: cfg.ativo === 1,
      };
    }),

  // Alias para getConfig (compatibilidade com o componente AvecIntegracao)
  listarConfig: protectedProcedure
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
        avecEmail: cfg.avecEmail ?? "",
        avecSenha: cfg.avecSenha ?? "",
        avecSalaoNome: cfg.avecSalaoNome,
        ultimaSincronizacao: cfg.ultimaSincronizacao,
        statusUltimaSinc: cfg.statusUltimaSinc,
        sincAutoAtiva: cfg.sincAutoAtiva === 1 ? 1 : 0,
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

  // Testar conexão com o Avec (faz login via browser headless)
  testarConexao: protectedProcedure
    .input(z.object({
      empresaSlug: z.string(),
      email: z.string().email(),
      senha: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      try {
        const { avecBrowserLogin, avecBrowserInvalidarSessao } = await import("./avecBrowser");
        // Invalidar cache para forçar novo login
        avecBrowserInvalidarSessao();
        await avecBrowserLogin(input.email, input.senha);
        return { sucesso: true, mensagem: "Conexão estabelecida com sucesso!" };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { sucesso: false, mensagem: msg };
      }
    }),

  // ── Mapeamento de Categorias ─────────────────────────────────────────────────

  // Listar mapeamento de categorias
  listarMapeamento: protectedProcedure
    .input(z.object({ empresaSlug: z.string() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const db = await getDb();
      if (!db) return [];
      const { avecMapeamento } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");
      return db
        .select()
        .from(avecMapeamento)
        .where(and(eq(avecMapeamento.tenantId, tenantId), eq(avecMapeamento.empresaSlug, input.empresaSlug)));
    }),

  // Salvar mapeamento de categorias
  salvarMapeamento: protectedProcedure
    .input(z.object({
      empresaSlug: z.string(),
      mapeamento: z.array(z.object({
        avecCategoria: z.string(),
        metaCategoria: z.string(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB indisponível" });
      const { avecMapeamento } = await import("../drizzle/schema");
      const { eq, and } = await import("drizzle-orm");

      // Remover mapeamentos existentes
      await db
        .delete(avecMapeamento)
        .where(and(eq(avecMapeamento.tenantId, tenantId), eq(avecMapeamento.empresaSlug, input.empresaSlug)));

      // Inserir novos mapeamentos
      for (const m of input.mapeamento) {
        await db.insert(avecMapeamento).values({
          tenantId,
          empresaSlug: input.empresaSlug,
          avecCategoria: m.avecCategoria,
          metaCategoria: m.metaCategoria,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return { sucesso: true };
    }),

  // ── Sincronização ────────────────────────────────────────────────────────────

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

  // ── Logs ─────────────────────────────────────────────────────────────────────

  // Buscar últimos logs de sync (alias: logs e listarLogs)
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

  // ── Setup / Manutenção ──────────────────────────────────────────────────────

  // Criar tabelas Avec e inserir dados iniciais (idempotente)
  setupTabelas: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = await getTenantIdFromCtx(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não disponível" });

    // Usar SQL direto via drizzle para criar tabelas se não existirem
    const { sql } = await import("drizzle-orm");

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS avecConfig (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        empresaSlug VARCHAR(64) NOT NULL,
        avecEmail VARCHAR(255),
        avecSenha VARCHAR(255),
        avecSalaoId VARCHAR(64),
        avecSalaoNome VARCHAR(255),
        ultimaSincronizacao TIMESTAMP NULL,
        statusUltimaSinc VARCHAR(64),
        ativo INT NOT NULL DEFAULT 1,
        sincAutoAtiva INT NOT NULL DEFAULT 0,
        horarioSinc VARCHAR(8),
        avecSessionCookie TEXT,
        cookieConfiguradoEm TIMESTAMP NULL,
        avecApiToken TEXT,
        apiTokenConfiguradoEm TIMESTAMP NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_tenant_empresa (tenantId, empresaSlug)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS avecMapeamento (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        empresaSlug VARCHAR(64) NOT NULL,
        avecCategoria VARCHAR(128) NOT NULL,
        metaCategoria VARCHAR(16) NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_tenant_empresa_cat (tenantId, empresaSlug, avecCategoria)
      )
    `);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS avecSyncLog (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId INT NOT NULL,
        empresaSlug VARCHAR(64) NOT NULL,
        origem VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL,
        mes INT NOT NULL,
        ano INT NOT NULL,
        diasSincronizados INT NOT NULL DEFAULT 0,
        diasIgnorados INT NOT NULL DEFAULT 0,
        erros TEXT,
        executadoEm TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Inserir config da Seraphine se não existir
    const { avecConfig, avecMapeamento } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    const existeConfig = await db
      .select({ id: avecConfig.id })
      .from(avecConfig)
      .where(and(eq(avecConfig.tenantId, tenantId), eq(avecConfig.empresaSlug, "seraphine")))
      .limit(1);

    if (existeConfig.length === 0) {
      await db.insert(avecConfig).values({
        tenantId,
        empresaSlug: "seraphine",
        avecEmail: "seraphinebeauty24@gmail.com",
        avecSenha: "Dxj4oue@",
        ativo: 1,
        sincAutoAtiva: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Inserir mapeamento padrão se não existir
    const existeMapeamento = await db
      .select({ id: avecMapeamento.id })
      .from(avecMapeamento)
      .where(and(eq(avecMapeamento.tenantId, tenantId), eq(avecMapeamento.empresaSlug, "seraphine")))
      .limit(1);

    if (existeMapeamento.length === 0) {
      const mapeamentos = [
        { avecCategoria: "Cabelo", metaCategoria: "cat1" },
        { avecCategoria: "Manicure e Pedicure", metaCategoria: "cat2" },
        { avecCategoria: "Sobrancelha", metaCategoria: "cat3" },
        { avecCategoria: "Pacote", metaCategoria: "cat4" },
        { avecCategoria: "Recorrência", metaCategoria: "cat5" },
      ];
      for (const m of mapeamentos) {
        await db.insert(avecMapeamento).values({
          tenantId,
          empresaSlug: "seraphine",
          avecCategoria: m.avecCategoria,
          metaCategoria: m.metaCategoria,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    return { ok: true, message: "Tabelas Avec criadas e dados iniciais inseridos com sucesso!" };
  }),

  // Sincronização rápida do dia atual (todas as empresas do tenant)
  syncHoje: protectedProcedure.mutation(async ({ ctx }) => {
    const tenantId = await getTenantIdFromCtx(ctx);
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB não disponível" });
    const { avecConfig } = await import("../drizzle/schema");
    const { eq } = await import("drizzle-orm");
    const configs = await db.select().from(avecConfig).where(eq(avecConfig.tenantId, tenantId));
    if (configs.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com Avec configurado" });
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");
    const dataHoje = `${ano}-${mes}-${dia}`;
    const { sincronizarFaturamentoAvecPorData } = await import("./avecSincronizador");
    const resultados: Record<string, { ok: boolean; total?: number; mensagem?: string; erro?: string }> = {};
    for (const config of configs) {
      try {
        const r = await sincronizarFaturamentoAvecPorData(tenantId, config.empresaSlug, dataHoje, dataHoje);
        const totalDia = r.detalhes?.[0]?.total ?? 0;
        const mensagem = r.detalhes?.[0]?.mensagem ?? (r.diasSincronizados > 0 ? "Sincronizado" : "Sem dados");
        resultados[config.empresaSlug] = { ok: true, total: totalDia, mensagem };
      } catch (err) {
        resultados[config.empresaSlug] = { ok: false, erro: err instanceof Error ? err.message : String(err) };
      }
    }
    const algumErro = Object.values(resultados).some(r => !r.ok);
    return { ok: !algumErro, data: dataHoje, resultados };
  }),

  // Alias para logs (compatibilidade com o componente AvecIntegracao)
  listarLogs: protectedProcedure
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
