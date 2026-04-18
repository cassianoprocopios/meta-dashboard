import { avecRouter } from "./avecRouter";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  listarColaboradores,
  salvarColaborador,
  toggleColaboradorAtivo,
  deletarColaborador,
  listarRankingPorPeriodo,
  listarPeriodosComDados,
  upsertFaturamentoColaborador,
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
  listAllCashbarberSyncLogs,
  getUltimoSyncPorEmpresa,
  updateCashbarberAgendamento,
  getDpoteHistoricoId,
  saveDpoteHistoricoId,
  getFaturamentoByDataEmpresaTenant,
  getFaturamentosHistoricoMensalByTenant,
  getDpoteSyncLogs,
  saveRecorrenciaFonte,
  getRecorrenciaFonte,
  listarHistoricoUnidades,
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
  cashbarberRelatorio13,
  filialParaEmpresaSlug,
  cashbarberBuscarFotoProfissional,
  cashbarberListarBarbeirosAtivos,
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

// Versão pública (sem require auth) - sempre retorna tenant 1
async function getTenantIdFromCtxPublic(_ctx: any): Promise<number> {
  return 1;
}

// ─── PROFISSIONAIS ─────────────────────────────────────────────────────────
const profissionaisRouter = router({
  listar: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantIdFromCtx(ctx);
    const lista = await listarColaboradores(tenantId);
    return lista.map((c) => ({
      id: c.id,
      nome: c.nome,
      apelido: c.apelido,
      fotoUrl: c.fotoUrl,
      cargo: c.cargo,
      exibirNoRanking: c.exibirNoRanking === 1,
      ativo: c.ativo === 1,
      isGerencia: c.isGerencia === 1,
      cashbarberProfissionalId: c.cashbarberProfissionalId,
      empresaSlug: c.empresaSlug,
      categoriaRanking: (c.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
      pinAcesso: c.pinAcesso ?? null,
      telefone: c.telefone ?? null,
      metaMensal: c.metaMensal ? Number(c.metaMensal) : null,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }),

  salvar: protectedProcedure
    .input(
      z.object({
        id: z.number().optional(),
        nome: z.string().min(1),
        apelido: z.string().nullable().optional(),
        cargo: z.string().nullable().optional(),
        fotoUrl: z.string().nullable().optional(),
        exibirNoRanking: z.boolean().optional(),
        ativo: z.boolean().optional(),
        isGerencia: z.boolean().optional(),
        cashbarberProfissionalId: z.number().int().positive().nullable().optional(),
        empresaSlug: z.string().optional(),
        categoriaRanking: z.enum(['barbeiro', 'auxiliar', 'recepcao']).optional(),
        pinAcesso: z.string().nullable().optional(),
        metaMensal: z.number().nullable().optional(),
        telefone: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const result = await salvarColaborador(tenantId, {
        id: input.id,
        nome: input.nome,
        apelido: input.apelido ?? null,
        cargo: input.cargo ?? "Barbeiro",
        fotoUrl: input.fotoUrl ?? null,
        exibirNoRanking: input.exibirNoRanking !== false ? 1 : 0,
        ativo: input.ativo !== false ? 1 : 0,
        isGerencia: input.isGerencia ? 1 : 0,
        cashbarberProfissionalId: input.cashbarberProfissionalId ?? null,
        empresaSlug: input.empresaSlug ?? "barbiero-grupo",
        categoriaRanking: input.categoriaRanking ?? 'barbeiro',
        pinAcesso: input.pinAcesso ?? null,
        metaMensal: input.metaMensal?.toString() ?? null,
        telefone: input.telefone ?? null,
      });
      return result;
    }),

  toggleAtivo: protectedProcedure
    .input(z.object({ id: z.number(), ativo: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      await toggleColaboradorAtivo(tenantId, input.id, input.ativo);
      return { ok: true };
    }),

  deletar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      await deletarColaborador(tenantId, input.id);
      return { ok: true };
    }),

  listarParaAcesso: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantIdFromCtx(ctx);
    const lista = await listarColaboradores(tenantId);
    return lista
      .filter((c) => c.ativo === 1)
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        apelido: c.apelido,
        fotoUrl: c.fotoUrl,
        empresaSlug: c.empresaSlug,
        pinAcesso: c.pinAcesso,
        telefone: c.telefone ?? null,
        exibirNoRanking: c.exibirNoRanking === 1,
      }));
  }),

  ranking: protectedProcedure
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const [profissionais, { itens: faturamentos, ultimaAtualizacao }] = await Promise.all([
        listarColaboradores(tenantId),
        listarRankingPorPeriodo(tenantId, input.mes, input.ano),
      ]);
      const faturamentoMap = new Map(faturamentos.map((f) => [f.colaboradorId, f]));
      // Incluir na lista:
      // - Profissionais ativos com exibirNoRanking=1 (barbeiros, auxiliares)
      // - Recepção (categoriaRanking='recepcao') com dados de produtos, mesmo que exibirNoRanking=0
      const lista = profissionais
        .filter((p) => {
          if (p.ativo !== 1) return false;
          if (p.isGerencia === 1) return false; // gerentes não aparecem na competição
          if (p.exibirNoRanking === 1) return true;
          // Incluir recepção se tiver dados de produtos no período
          if (p.categoriaRanking === 'recepcao') {
            const fat = faturamentoMap.get(p.id);
            return fat && fat.totalProdutos > 0;
          }
          return false;
        })
        .map((p) => {
          const fat = faturamentoMap.get(p.id);
          return {
            id: p.id,
            nome: p.nome,
            apelido: p.apelido,
            fotoUrl: p.fotoUrl,
            cargo: p.cargo,
            empresaSlug: p.empresaSlug ?? 'barbiero-grupo',
            categoriaRanking: (p.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
            totalServicos: fat?.totalServicos ?? 0,
            totalProdutos: fat?.totalProdutos ?? 0,
            totalGeral: fat?.totalGeral ?? 0,
            temDados: !!fat,
            detalhesServicos: fat?.detalhesServicos ?? null,
            detalhesProdutos: fat?.detalhesProdutos ?? null,
            metaMensal: p.metaMensal ? parseFloat(String(p.metaMensal)) : null,
            pctMeta: (p.metaMensal && fat?.totalGeral)
              ? Math.round((fat.totalGeral / parseFloat(String(p.metaMensal))) * 100)
              : null,
          };
        })
        .sort((a, b) => b.totalGeral - a.totalGeral);
      return { lista, ultimaAtualizacao: ultimaAtualizacao ?? null };
    }),

  periodos: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = await getTenantIdFromCtx(ctx);
    return listarPeriodosComDados(tenantId);
  }),

  historicoUnidades: protectedProcedure
    .input(z.object({ ultimos: z.number().int().min(1).max(24).optional().default(6) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      return listarHistoricoUnidades(tenantId, input.ultimos);
    }),

  sincronizarFaturamento: protectedProcedure
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada.' });
      }
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      const comId = colaboradoresList.filter((c) => c.cashbarberProfissionalId && c.ativo === 1);
      if (comId.length === 0) {
        return { sincronizados: 0, erros: 0, mensagem: 'Nenhum profissional com ID do CashBarber configurado.' };
      }
      const dataInicial = `${input.ano}-${String(input.mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(input.ano, input.mes, 0).getDate();
      const dataFinal = `${input.ano}-${String(input.mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
      let sincronizados = 0;
      let erros = 0;
      for (const col of comId) {
        try {
          const relatorio = await cashbarberRelatorio15(token, dataInicial, dataFinal, null, col.cashbarberProfissionalId);
          // Excluir do ranking: Corte de Cabelo, Barba e Corte Kids
          // Todos os demais serviços + produtos são contabilizados
          // Excluir: Corte de Cabelo, Corte Kids, Raspar na Máquina, Barba simples/completa, Pezinho
          // INCLUIR: Barba com Barboterapia, Pigmentação Barba, Camulagem Barba, Hidratação Barba
          const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
          const servicosRanking = relatorio.servicos.filter(
            (s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? '')
          );
          // Excluir produtos de bar/bebidas/caixinha do ranking
          const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
          const produtosRanking = relatorio.produtos.filter(
            (p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? '')
          );
          const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
          const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
          const totalGeral = totalServicos + totalProdutos;
          const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
          const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
          await upsertFaturamentoColaborador({
            tenantId,
            colaboradorId: col.id,
            empresaSlug: col.empresaSlug ?? 'barbiero-grupo',
            mes: input.mes,
            ano: input.ano,
            totalServicos,
            totalProdutos,
            totalGeral,
            qtdServicos,
            qtdProdutos,
            // Salvar apenas os serviços válidos (excluídas as categorias ignoradas) com quantidade
            detalhesServicos: JSON.stringify(
              servicosRanking.slice(0, 20).map((s: any) => ({
                ser_nome: s.ser_nome,
                sum: s.sum,
                count: s.count ?? 0,
              }))
            ),
            // Salvar detalhamento de produtos por item com quantidade (excluindo bar/bebidas)
            detalhesProdutos: JSON.stringify(
              produtosRanking
                .filter((p: any) => p.total > 0)
                .map((p: any) => ({ pro_nome: p.pro_nome, sum: p.total, count: Number(p.count) || 0 }))
                .slice(0, 30)
            ),
          });
          sincronizados++;
        } catch (e) {
          console.error(`[Profissionais] Erro ao sincronizar ${col.nome}:`, e);
          erros++;
        }
      }
      return { sincronizados, erros, mensagem: `${sincronizados} profissional(is) sincronizado(s), ${erros} erro(s).` };
    }),

  recalcularRankingMes: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada.' });
      }
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      const comId = colaboradoresList.filter((c) => c.cashbarberProfissionalId && c.ativo === 1);
      if (comId.length === 0) {
        return { sincronizados: 0, erros: 0, mensagem: 'Nenhum profissional com ID do CashBarber configurado.' };
      }
      const dataInicial = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const ultimoDia = new Date(ano, mes, 0).getDate();
      const dataFinal = `${ano}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

      // Buscar mapeamento de filial via relatório 13 (barbeiros com filial)
      let mapaFilial: Map<string, string> = new Map();
      try {
        const rel13 = await cashbarberRelatorio13(token, dataInicial, dataFinal);
        for (const item of rel13) {
          if (item.barbeiro && item.filial) {
            mapaFilial.set(item.barbeiro.toLowerCase().trim(), filialParaEmpresaSlug(item.filial));
          }
        }
      } catch (e) {
        console.warn('[Ranking] Não foi possível buscar relatório 13 para mapeamento de filiais:', e);
      }

      // Excluir do ranking: Corte de Cabelo, Barba e Corte Kids
      // Todos os demais serviços + produtos são contabilizados
      // Excluir: Corte de Cabelo, Corte Kids, Raspar na Máquina, Barba simples/completa, Pezinho
          // INCLUIR: Barba com Barboterapia, Pigmentação Barba, Camulagem Barba, Hidratação Barba
          const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      let sincronizados = 0;
      let erros = 0;
      for (const col of comId) {
        try {
          const relatorio = await cashbarberRelatorio15(token, dataInicial, dataFinal, null, col.cashbarberProfissionalId);
          const servicosRanking = relatorio.servicos.filter(
            (s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? '')
          );
          // Excluir produtos de bar/bebidas/caixinha do ranking
          const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
          const produtosRanking = relatorio.produtos.filter(
            (p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? '')
          );
           const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
          const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
          const totalGeral = totalServicos + totalProdutos;
          const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
          const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
          // Determinar empresaSlug correto: usar mapeamento do rel13 se disponível, senão manter o atual
          const nomeCB = (col.apelido ?? col.nome).toLowerCase().trim();
          const slugCorreto = mapaFilial.get(nomeCB) ?? col.empresaSlug ?? 'barbiero-grupo';

          // Atualizar empresaSlug no colaborador se mudou
          if (slugCorreto !== col.empresaSlug) {
            const db = await (await import('./db')).getDb();
            if (db) {
              const { colaboradores } = await import('../drizzle/schema');
              const { eq, and } = await import('drizzle-orm');
              await db.update(colaboradores)
                .set({ empresaSlug: slugCorreto })
                .where(and(eq(colaboradores.id, col.id), eq(colaboradores.tenantId, tenantId)));
            }
          }

          await upsertFaturamentoColaborador({
            tenantId,
            colaboradorId: col.id,
            empresaSlug: slugCorreto,
            mes,
            ano,
            totalServicos,
            totalProdutos,
            totalGeral,
            qtdServicos,
            qtdProdutos,
            // Salvar serviços válidos com quantidade
            detalhesServicos: JSON.stringify(
              servicosRanking.slice(0, 20).map((s: any) => ({
                ser_nome: s.ser_nome,
                sum: s.sum,
                count: s.count ?? 0,
              }))
            ),
            // Salvar detalhamento de produtos por item com quantidade (excluindo bar/bebidas)
            detalhesProdutos: JSON.stringify(
              produtosRanking
                .filter((p: any) => p.total > 0)
                .map((p: any) => ({ pro_nome: p.pro_nome, sum: p.total, count: Number(p.count) || 0 }))
                .slice(0, 30)
            ),
          });
          sincronizados++;
        } catch (e) {
          console.error(`[Ranking] Erro ao recalcular ${col.nome}:`, e);
          erros++;
        }
      }
      const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      return {
        sincronizados,
        erros,
        mensagem: `Ranking de ${meses[mes - 1]}/${ano} recalculado: ${sincronizados} profissional(is) atualizado(s)${erros > 0 ? `, ${erros} erro(s)` : ''}.`,
      };
    }),

  // Gera PINs únicos para profissionais sem PIN e retorna links wa.me pré-preenchidos
  gerarLinksWhatsApp: protectedProcedure
    .input(z.object({
      appUrl: z.string().url(),
      apenasComTelefone: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const lista = await listarColaboradores(tenantId);
      const ativos = lista.filter((c) => c.ativo === 1);

      // Coletar PINs já em uso
      const pinsUsados = new Set(ativos.map((c) => c.pinAcesso).filter(Boolean) as string[]);

      function gerarPinUnico(): string {
        let pin: string;
        let tentativas = 0;
        do {
          pin = String(Math.floor(1000 + Math.random() * 9000));
          tentativas++;
          if (tentativas > 1000) throw new Error('Não foi possível gerar PINs únicos suficientes');
        } while (pinsUsados.has(pin));
        pinsUsados.add(pin);
        return pin;
      }

       const { colaboradores: colTable } = await import('../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');
      const dbRaw = await (await import('./db')).getDb();
      if (!dbRaw) throw new Error('DB not available');
      const db = dbRaw;
      const resultados: Array<{
        id: number;
        nome: string;
        apelido: string | null;
        telefone: string | null;
        pin: string;
        linkWhatsApp: string | null;
        mensagem: string;
      }> = [];

      for (const col of ativos) {
        // Gerar PIN se ainda não tem
        let pin = col.pinAcesso;
        if (!pin) {
          pin = gerarPinUnico();
          await db.update(colTable)
            .set({ pinAcesso: pin })
            .where(and(eq(colTable.id, col.id), eq(colTable.tenantId, tenantId)));
        }

        // Pular se não tem telefone e o filtro está ativo
        if (input.apenasComTelefone && !col.telefone) continue;

        const nomeExibido = col.apelido || col.nome.split(' ')[0];
        const linkAcesso = `${input.appUrl}/pro`;
        const mensagem = `Olá ${nomeExibido}! ✂️\n\nSeu acesso ao ranking da Barbiero está pronto!\n\n*PIN:* ${pin}\n*Link:* ${linkAcesso}\n\nAcesse pelo celular, digite seu PIN e acompanhe seu desempenho em tempo real. 🚀`;

        const telefoneFormatado = col.telefone ? col.telefone.replace(/\D/g, '') : null;
        // Garantir que o número não tenha o código 55 duplicado
        const numeroFinal = telefoneFormatado
          ? (telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`)
          : null;
        const linkWa = numeroFinal
          ? `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`
          : null;

        resultados.push({
          id: col.id,
          nome: col.nome,
          apelido: col.apelido ?? null,
          telefone: col.telefone ?? null,
          pin,
          linkWhatsApp: linkWa,
          mensagem,
        });
      }

      return { resultados, total: resultados.length };
    }),

  syncFotos: protectedProcedure
    .mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      if (!empresas.length) throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma empresa configurada.' });

      // Usar a primeira empresa ativa para fazer login no CashBarber
      const configs = await listCashbarberConfigs(tenantId);
      const config = configs.find((c) => c.ativo === 1);
      if (!config) throw new TRPCError({ code: 'NOT_FOUND', message: 'Nenhuma configuração CashBarber ativa.' });

      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const barbeiros = await cashbarberListarBarbeirosAtivos(token);

      // Atualizar fotos dos colaboradores que têm cashbarberProfissionalId
      const colaboradoresList = await listarColaboradores(tenantId);
      let atualizados = 0;
      let semFoto = 0;

      // Importar drizzle para fazer UPDATE cirúrgico apenas em fotoUrl
      const { drizzle: drizzleImport } = await import('drizzle-orm/mysql2');
      const mysql2Import = await import('mysql2/promise');
      const { colaboradores: colaboradoresTable } = await import('../drizzle/schema');
      const { eq: eqImport, and: andImport } = await import('drizzle-orm');
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DATABASE_URL não configurado' });
      const conn = await mysql2Import.createConnection(dbUrl);
      const dbDirect = drizzleImport(conn);

      try {
        for (const col of colaboradoresList) {
          if (!col.cashbarberProfissionalId) continue;
          const barbeiro = barbeiros.find((b) => b.id === col.cashbarberProfissionalId);
          if (!barbeiro) continue;

          const novaFoto = barbeiro.fotoUrl ?? null;
          if (novaFoto !== col.fotoUrl) {
            // UPDATE cirúrgico: apenas fotoUrl, sem tocar em categoriaRanking, pinAcesso ou outros campos
            await dbDirect
              .update(colaboradoresTable)
              .set({ fotoUrl: novaFoto, updatedAt: new Date() })
              .where(andImport(
                eqImport(colaboradoresTable.id, col.id),
                eqImport(colaboradoresTable.tenantId, tenantId)
              ));
            if (novaFoto) atualizados++;
            else semFoto++;
          }
        }
      } finally {
        await conn.end();
      }

      return { ok: true, atualizados, semFoto, totalBarbeiros: barbeiros.length };
    }),

  /**
   * Gera mensagens personalizadas de ranking para WhatsApp de cada profissional.
   * Retorna links wa.me pré-preenchidos com a posição atual, faturamento e quanto
   * falta para subir uma posição no ranking do mês vigente.
   */
  gerarMensagensRankingWhatsApp: protectedProcedure
    .input(z.object({
      appUrl: z.string().url(),
      mes: z.number().int().min(1).max(12).optional(),
      ano: z.number().int().min(2020).max(2100).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const agora = new Date();
      const mes = input.mes ?? (agora.getMonth() + 1);
      const ano = input.ano ?? agora.getFullYear();
      const [{ itens }, colaboradoresList, empresasList, metasList, faturamentosMes] = await Promise.all([
        listarRankingPorPeriodo(tenantId, mes, ano),
        listarColaboradores(tenantId),
        getEmpresasByTenant(tenantId),
        getMetasByMesAndTenant(tenantId, mes, ano),
        getAllFaturamentosByTenant(tenantId, mes, ano),
      ]);

      // Calcular faturamento acumulado por empresa no mês
      const fatPorEmpresa = new Map<string, number>();
      for (const f of faturamentosMes) {
        const slug = f.empresaSlug;
        const total = (Number(f.cat1) || 0) + (Number(f.cat2) || 0) + (Number(f.cat3) || 0) +
          (Number(f.cat4) || 0) + (Number(f.cat5) || 0) + (Number(f.cat6) || 0) +
          (Number(f.cat7) || 0) + (Number(f.cat8) || 0) + (Number(f.cat9) || 0);
        fatPorEmpresa.set(slug, (fatPorEmpresa.get(slug) ?? 0) + total);
      }
      // Meta por empresa
      const metaPorEmpresa = new Map<string, number>();
      for (const m of metasList) {
        if (m.empresaSlug) metaPorEmpresa.set(m.empresaSlug, Number(m.metaMensal) || 0);
      }

      // Ordenar por totalGeral desc
      const rankingOrdenado = itens
        .filter((i) => i.totalGeral > 0)
        .sort((a, b) => b.totalGeral - a.totalGeral);

      const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const nomeMes = MESES_PT[mes - 1];

      // Banco de frases motivacionais de alto impacto — varia por profissional (por índice)
      const FRASES_1 = [ // 1º lugar
        `👑 Você é o líder! Cada cliente que entra é uma chance de ampliar sua vantagem. Não dê respiro!`,
        `🔥 Número 1 não é sorte — é consistência. Mantenha o ritmo e feche o mês com chave de ouro!`,
        `🎯 Você está no topo! Campeões não tiram o pé do acelerador. Vamos ao próximo nível!`,
        `⚡ 1º lugar é seu! Agora é hora de transformar liderança em resultado histórico. Bora!`,
      ];
      const FRASES_SUBIR = [ // tem alguém acima
        `💪 Você está perto! Falta pouco para virar o jogo. Um cliente a mais pode mudar tudo!`,
        `🚀 A distância para o próximo é pequena. Foco total até o fim do mês — você consegue!`,
        `🔥 Cada serviço conta! Você está a um passo de subir. Não deixe essa oportunidade escapar!`,
        `🎯 Alta performance é sobre não desistir quando está perto. Empurra até o fim!`,
        `⚡ Você tem tudo para virar essa posição. Acredita no seu trabalho e vai com tudo!`,
        `💰 Cada atendimento é dinheiro no bolso e ponto no ranking. Bora fechar forte!`,
      ];
      const FRASES_GERAL = [ // qualquer posição
        `💪 Equipe de alta performance não para. Cada dia é uma nova chance de superar o limite!`,
        `🔥 Resultados extraordinários exigem esforço extraordinário. Você está no caminho certo!`,
        `🎯 Foco, consistência e atitude. É assim que campeões são feitos. Continue!`,
        `⚡ O ranking muda a cada serviço. Mantenha a intensidade e suba mais!`,
        `🚀 Grandes profissionais não esperam a oportunidade — eles criam. Vai com tudo hoje!`,
      ];

      const resultados: Array<{
        colaboradorId: number;
        nome: string;
        apelido: string | null;
        telefone: string | null;
        posicao: number;
        totalGeral: number;
        faltaParaSubir: number | null;
        mensagem: string;
        linkWhatsApp: string | null;
      }> = [];

      for (let i = 0; i < rankingOrdenado.length; i++) {
        const item = rankingOrdenado[i];
        const posicao = i + 1;
        const acimaDele = i > 0 ? rankingOrdenado[i - 1] : null;
        const faltaParaSubir = acimaDele ? Math.max(0, acimaDele.totalGeral - item.totalGeral + 0.01) : null;
        const col = colaboradoresList.find((c) => c.id === item.colaboradorId);
        const nomeExib = item.apelido || item.nome.split(' ')[0];
        const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `${posicao}º`;

        // Dados da unidade do profissional
        const empresaSlugRaw = col?.empresaSlug ?? item.empresaSlug ?? '';
        // Mapeamento: slug do colaborador (barbiero-morumbi) -> slug da tabela faturamentos (MORUMBI)
        const SLUG_MAP: Record<string, string> = {
          'barbiero-morumbi': 'MORUMBI',
          'barbiero-mascote': 'MASCOTE',
          'barbiero-seraphine': 'SERAPHINE',
          'barbiero-grupo': 'GRUPO',
        };
        const empresaSlug = SLUG_MAP[empresaSlugRaw] ?? empresaSlugRaw;
        const empresa = empresasList.find((e) => e.slug === empresaSlug);
        const nomeEmpresa = empresa?.nome ?? empresaSlug;
        const fatUnidade = fatPorEmpresa.get(empresaSlug) ?? 0;
        const metaUnidade = metaPorEmpresa.get(empresaSlug) ?? 0;
        const pctMeta = metaUnidade > 0 ? Math.round((fatUnidade / metaUnidade) * 100) : null;
        const faltaMeta = metaUnidade > 0 ? Math.max(0, metaUnidade - fatUnidade) : null;

        // Selecionar frase motivacional variada (por índice do profissional no ranking)
        let fraseMotiv: string;
        if (posicao === 1) {
          fraseMotiv = FRASES_1[i % FRASES_1.length];
        } else if (faltaParaSubir !== null && faltaParaSubir > 0) {
          fraseMotiv = FRASES_SUBIR[i % FRASES_SUBIR.length];
        } else {
          fraseMotiv = FRASES_GERAL[i % FRASES_GERAL.length];
        }

        // Montar mensagem
        let mensagem = `Olá ${nomeExib}! ✂️\n\n`;
        mensagem += `${fraseMotiv}\n\n`;
        mensagem += `━━━━━━━━━━━━━━━━━━━━\n`;
        mensagem += `🏆 *Ranking ${nomeMes}/${ano}*\n`;
        mensagem += `Sua posição: *${medalha} ${posicao}º lugar*\n`;
        mensagem += `Seu faturamento: *${fmtBRL(item.totalGeral)}*\n`;
        if (item.qtdServicos > 0) mensagem += `Serviços: *${item.qtdServicos}* atendimentos\n`;
        if (faltaParaSubir !== null && faltaParaSubir > 0) {
          mensagem += `\n🎯 Para subir uma posição: *${fmtBRL(faltaParaSubir)}*\n`;
        }
        // Bloco da unidade
        if (fatUnidade > 0) {
          mensagem += `\n━━━━━━━━━━━━━━━━━━━━\n`;
          mensagem += `🏢 *${nomeEmpresa} — ${nomeMes}/${ano}*\n`;
          mensagem += `Faturamento: *${fmtBRL(fatUnidade)}*`;
          if (metaUnidade > 0) {
            const semaforo = pctMeta! >= 100 ? '🟢' : pctMeta! >= 70 ? '🟡' : '🔴';
            mensagem += ` ${semaforo} *${pctMeta}% da meta*`;
            if (faltaMeta! > 0) {
              mensagem += `\nFalta para a meta: *${fmtBRL(faltaMeta!)}*`;
            } else {
              mensagem += `\n🎉 Meta atingida! Vamos superar!`;
            }
          }
          mensagem += `\n`;
        }
        mensagem += `\n📱 Ranking completo: ${input.appUrl}/pro`;

        const telefone = col?.telefone ?? null;
        const telefoneFormatado = telefone ? telefone.replace(/\D/g, '') : null;
        const numeroFinal = telefoneFormatado
          ? (telefoneFormatado.startsWith('55') ? telefoneFormatado : `55${telefoneFormatado}`)
          : null;
        const linkWa = numeroFinal
          ? `https://wa.me/${numeroFinal}?text=${encodeURIComponent(mensagem)}`
          : null;
        resultados.push({
          colaboradorId: item.colaboradorId,
          nome: item.nome,
          apelido: item.apelido ?? null,
          telefone: telefone,
          posicao,
          totalGeral: item.totalGeral,
          faltaParaSubir: faltaParaSubir,
          mensagem,
          linkWhatsApp: linkWa,
        });
      }
      return {
        resultados,
        total: resultados.length,
        comTelefone: resultados.filter((r) => r.linkWhatsApp !== null).length,
        semTelefone: resultados.filter((r) => r.linkWhatsApp === null).length,
        mes,
        ano,
        nomeMes,
      };
    }),

  // ─── RANKING GRUPO WHATSAPP ────────────────────────────────────────────────
  /**
   * Gera uma mensagem de texto com o ranking completo da unidade para ser
   * compartilhada no grupo de WhatsApp da equipe.
   * Suporta período mensal e semanal (semana atual).
   */
  gerarRankingGrupoWhatsApp: protectedProcedure
    .input(z.object({
      empresaSlug: z.string().min(1),
      mes: z.number().int().min(1).max(12).optional(),
      ano: z.number().int().min(2020).max(2100).optional(),
      periodo: z.enum(['mensal', 'semanal']).default('mensal'),
      appUrl: z.string().url(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const agora = new Date();
      const mes = input.mes ?? (agora.getMonth() + 1);
      const ano = input.ano ?? agora.getFullYear();
      const periodo = input.periodo ?? 'mensal';

      // Calcular datas da semana atual (segunda a domingo)
      const hoje = new Date();
      const diaSemana = hoje.getDay(); // 0=dom, 1=seg, ..., 6=sab
      const diffSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
      const segunda = new Date(hoje);
      segunda.setDate(hoje.getDate() + diffSegunda);
      const domingo = new Date(segunda);
      domingo.setDate(segunda.getDate() + 6);
      const fmtDataISO = (d: Date) => d.toISOString().slice(0, 10);
      const fmtDt = (d: Date) => `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      const dataInicioSemana = fmtDataISO(segunda);
      const dataFimSemana = fmtDataISO(domingo);

      const empresasAll = await getEmpresasByTenant(tenantId);
      const empresa = empresasAll.find((e) => e.slug === input.empresaSlug);
      const nomeEmpresa = empresa?.nome ?? input.empresaSlug;
      const grupoLink = empresa?.whatsappGrupoLink ?? null;

      // Mapeamento inverso: slug da empresa (MORUMBI) -> slug do colaborador (barbiero-morumbi)
      const SLUG_MAP_INV: Record<string, string> = {
        'MORUMBI': 'barbiero-morumbi',
        'MASCOTE': 'barbiero-mascote',
        'SERAPHINE': 'barbiero-seraphine',
        'GRUPO': 'barbiero-grupo',
      };
      const empresaSlugColaborador = SLUG_MAP_INV[input.empresaSlug] ?? input.empresaSlug;

      const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const nomeMes = MESES_PT[mes - 1];
      const diaDoMes = agora.getDate();

      // ─── PERÍODO SEMANAL ───────────────────────────────────────────────────
      if (periodo === 'semanal') {
        const empresaSlugCB = empresasAll[0]?.slug ?? 'barbiero-grupo';
        const config = await getCashbarberConfig(tenantId, empresaSlugCB);
        if (!config || !config.cbEmail || !config.cbSenha) {
          throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada para ranking semanal.' });
        }
        const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
        const colaboradoresList = await listarColaboradores(tenantId);
        const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
        const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
        const colsUnidade = colaboradoresList.filter(
          (c) => c.ativo === 1 && c.exibirNoRanking === 1 && c.isGerencia !== 1 &&
          c.cashbarberProfissionalId &&
          (c.empresaSlug === input.empresaSlug || c.empresaSlug === empresaSlugColaborador)
        );
        const resultadosSemana = await Promise.all(
          colsUnidade.map(async (col) => {
            try {
              const relatorio = await cashbarberRelatorio15(token, dataInicioSemana, dataFimSemana, null, col.cashbarberProfissionalId);
              const servicosRanking = relatorio.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
              const produtosRanking = relatorio.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
              const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
              const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
              const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
              return { nome: col.nome, apelido: col.apelido, totalGeral: totalServicos + totalProdutos, qtdServicos };
            } catch {
              return { nome: col.nome, apelido: col.apelido, totalGeral: 0, qtdServicos: 0 };
            }
          })
        );
        const rankingSemana = resultadosSemana.filter((r) => r.totalGeral > 0).sort((a, b) => b.totalGeral - a.totalGeral);
        const ABERTURAS_SEM = [
          `⚡ *Semana em chamas! Veja quem está dominando!*`,
          `🔥 *${nomeEmpresa} — A semana é de quem não para!*`,
          `🚀 *Alta performance semanal — confira o placar!*`,
          `💪 *${nomeEmpresa} — Cada dia conta. Cada serviço importa!*`,
          `🎯 *Foco total! Veja o ranking da semana!*`,
        ];
        const aberturaSem = ABERTURAS_SEM[diaDoMes % ABERTURAS_SEM.length];
        let msg = `${aberturaSem}\n\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `🏆 *Ranking Semanal*\n`;
        msg += `📍 Unidade: *${nomeEmpresa}*\n`;
        msg += `📅 Semana: *${fmtDt(segunda)} a ${fmtDt(domingo)}*\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        rankingSemana.forEach((item, idx) => {
          const pos = idx + 1;
          const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}º`;
          const nome = item.apelido || item.nome.split(' ')[0];
          msg += `${medalha} *${nome}* — ${fmtBRL(item.totalGeral)}`;
          if (item.qtdServicos > 0) msg += ` (${item.qtdServicos} serv.)`;
          msg += `\n`;
        });
        if (rankingSemana.length === 0) msg += `_Nenhum dado disponível para esta semana._\n`;
        msg += `\n📱 Ranking completo: ${input.appUrl}/pro`;
        const linkCompartilhar = `https://wa.me/?text=${encodeURIComponent(msg)}`;
        return {
          mensagem: msg,
          linkCompartilhar,
          grupoLink,
          nomeEmpresa,
          nomeMes: `Semana ${fmtDt(segunda)}–${fmtDt(domingo)}`,
          mes,
          ano,
          fatUnidade: 0,
          metaUnidade: 0,
          pctMeta: null,
          totalProfissionais: rankingSemana.length,
        };
      }

      // ─── PERÍODO MENSAL (padrão) ───────────────────────────────────────────
      const [{ itens }, metasList, faturamentosMes] = await Promise.all([
        listarRankingPorPeriodo(tenantId, mes, ano),
        getMetasByMesAndTenant(tenantId, mes, ano),
        getAllFaturamentosByTenant(tenantId, mes, ano, input.empresaSlug),
      ]);
      // Faturamento acumulado da unidade no mês
      let fatUnidade = 0;
      for (const f of faturamentosMes) {
        fatUnidade += (Number(f.cat1) || 0) + (Number(f.cat2) || 0) + (Number(f.cat3) || 0) +
          (Number(f.cat4) || 0) + (Number(f.cat5) || 0) + (Number(f.cat6) || 0) +
          (Number(f.cat7) || 0) + (Number(f.cat8) || 0) + (Number(f.cat9) || 0);
      }
      const metaObj = metasList.find((m) => m.empresaSlug === input.empresaSlug);
      const metaUnidade = Number(metaObj?.metaMensal) || 0;
      const pctMeta = metaUnidade > 0 ? Math.round((fatUnidade / metaUnidade) * 100) : null;
      const faltaMeta = metaUnidade > 0 ? Math.max(0, metaUnidade - fatUnidade) : null;

      const rankingUnidade = itens
        .filter((i) => (i.empresaSlug === input.empresaSlug || i.empresaSlug === empresaSlugColaborador) && i.totalGeral > 0)
        .sort((a, b) => b.totalGeral - a.totalGeral);

      const ABERTURAS = [
        `🔥 *Equipe ${nomeEmpresa} — Bora dominar o mês!*`,
        `⚡ *${nomeEmpresa} — Cada serviço conta. Cada cliente importa!*`,
        `🚀 *Alta performance é o padrão aqui. Veja como está o placar!*`,
        `💪 *${nomeEmpresa} — Time que trabalha junto, vence junto!*`,
        `🎯 *Foco, consistência e resultado. Confira o ranking!*`,
      ];
      const abertura = ABERTURAS[diaDoMes % ABERTURAS.length];
      let msg = `${abertura}\n\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🏆 *Ranking ${nomeMes}/${ano}*\n`;
      msg += `📍 Unidade: *${nomeEmpresa}*\n`;
      msg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
      // Lista do ranking
      for (let i = 0; i < rankingUnidade.length; i++) {
        const item = rankingUnidade[i];
        const pos = i + 1;
        const medalha = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `${pos}º`;
        const nomeExib = item.apelido || item.nome.split(' ')[0];
        msg += `${medalha} *${nomeExib}* — ${fmtBRL(item.totalGeral)}`;
        if (item.qtdServicos && item.qtdServicos > 0) msg += ` (${item.qtdServicos} serv.)`;
        msg += `\n`;
      }
      if (rankingUnidade.length === 0) {
        msg += `_Nenhum dado registrado ainda para este mês._\n`;
      }
      // Bloco da unidade
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🏢 *Faturamento da Unidade*\n`;
      msg += `💰 Total: *${fmtBRL(fatUnidade)}*`;
      if (metaUnidade > 0) {
        const semaforo = pctMeta! >= 100 ? '🟢' : pctMeta! >= 70 ? '🟡' : '🔴';
        msg += ` ${semaforo} *${pctMeta}% da meta*`;
        if (faltaMeta! > 0) {
          msg += `\n🎯 Falta para a meta: *${fmtBRL(faltaMeta!)}*`;
        } else {
          msg += `\n🎉 *META ATINGIDA! Vamos superar!*`;
        }
      }
      msg += `\n\n📱 Ranking completo: ${input.appUrl}/pro`;
      const linkCompartilhar = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      return {
        mensagem: msg,
        linkCompartilhar,
        grupoLink,
        nomeEmpresa,
        nomeMes,
        mes,
        ano,
        fatUnidade,
        metaUnidade,
        pctMeta,
        totalProfissionais: rankingUnidade.length,
      };
    }),
  // ─── PUSH SUBSCRIPTIONS (PWA) ────────────────────────────────────────────
  salvarPushSubscription: publicProcedure
    .input(z.object({
      profissionalId: z.number().int().positive(),
      endpoint: z.string().min(1),
      p256dh: z.string().min(1),
      auth: z.string().min(1),
      userAgent: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const { salvarPushSubscription } = await import("./pushNotifications");
      await salvarPushSubscription(
        tenantId,
        input.profissionalId,
        input.endpoint,
        input.p256dh,
        input.auth,
        input.userAgent
      );
      return { ok: true };
    }),

  removerPushSubscription: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const { removerPushSubscription } = await import("./pushNotifications");
      await removerPushSubscription(tenantId, input.profissionalId);
      return { ok: true };
    }),

  temPushSubscription: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const { temPushSubscription } = await import("./pushNotifications");
      const ativo = await temPushSubscription(tenantId, input.profissionalId);
      return { ativo };
    }),

  // Procedures de push removidas — notificações desativadas
  enviarPushRankingManual: protectedProcedure
    .input(z.object({
      profissionalId: z.number().int().positive(),
      titulo: z.string().min(1),
      mensagem: z.string().min(1),
    }))
    .mutation(async () => ({ enviou: false })),

  dispararPushRankingParaTodos: protectedProcedure
    .mutation(async () => ({ enviados: 0, erros: 0 })),
});
export const appRouter = router({
  system: systemRouter,
  profissionais: profissionaisRouter,

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

    /** Solicita recuperação de senha por email */
    solicitarRecuperacaoSenha: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        // Sempre retorna sucesso para não revelar se o email existe
        const user = await getUserByEmail(input.email);
        if (!user || !user.email) return { success: true };

        // Gerar token único
        const token = crypto.randomBytes(48).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        // Salvar token no banco
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { success: true };
        const { passwordResetTokens } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        // Invalidar tokens anteriores do mesmo usuário
        await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });

        return { success: true };
      }),

    /** Valida token de recuperação de senha */
    validarTokenRecuperacao: publicProcedure
      .input(z.object({ token: z.string() }))
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return { valid: false, message: "Erro interno. Tente novamente." };
        const { passwordResetTokens } = await import("../drizzle/schema");
        const { eq, and, isNull } = await import("drizzle-orm");
        const rows = await db.select().from(passwordResetTokens).where(
          and(
            eq(passwordResetTokens.token, input.token),
            isNull(passwordResetTokens.usedAt)
          )
        ).limit(1);
        if (!rows.length) return { valid: false, message: "Token inválido ou já utilizado." };
        const row = rows[0];
        if (new Date(row.expiresAt) < new Date()) return { valid: false, message: "Token expirado. Solicite uma nova recuperação de senha." };
        return { valid: true };
      }),

    /** Redefine a senha usando token de recuperação */
    redefinirSenhaComToken: publicProcedure
      .input(z.object({ token: z.string(), novaSenha: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro interno. Tente novamente." });
        const { passwordResetTokens } = await import("../drizzle/schema");
        const { eq, and, isNull } = await import("drizzle-orm");
        const rows = await db.select().from(passwordResetTokens).where(
          and(
            eq(passwordResetTokens.token, input.token),
            isNull(passwordResetTokens.usedAt)
          )
        ).limit(1);
        if (!rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Token inválido ou já utilizado." });
        const row = rows[0];
        if (new Date(row.expiresAt) < new Date()) throw new TRPCError({ code: "BAD_REQUEST", message: "Token expirado. Solicite uma nova recuperação de senha." });

        // Atualizar a senha
        const hash = await bcrypt.hash(input.novaSenha, 12);
        await updateUserPassword(row.userId, hash);

        // Marcar token como usado
        await db.update(passwordResetTokens)
          .set({ usedAt: new Date() })
          .where(eq(passwordResetTokens.id, row.id));

        return { success: true };
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
        whatsappGrupoLink: z.string().max(512).nullable().optional(),
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

        // Gravar o valor manual e o timestamp no cashbarberConfig para exibir no card
        await saveRecorrenciaFonte(tenantId, empresaSlug, "manual", valorTotal);

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

    historicoQuinzenal: protectedProcedure
      .input(z.object({ ano: z.number().min(2020) }))
      .query(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const [metasAno, fatAno] = await Promise.all([
          getMetasAnoByTenant(tenantId, input.ano),
          getFaturamentosAnoByTenant(tenantId, input.ano),
        ]);

        // Agrupar por empresa e mês
        const mesesSet = new Set(metasAno.map((m) => `${m.mes}-${m.ano}`));
        // Incluir meses que têm faturamento mas não têm meta cadastrada
        fatAno.forEach((f) => {
          const [ano, mes] = f.data.split("-").map(Number);
          mesesSet.add(`${mes}-${ano}`);
        });

        const empresasSlugs = Array.from(new Set([
          ...metasAno.map((m) => m.empresaSlug),
          ...fatAno.map((f) => f.empresaSlug),
        ]));

        const resultado: Array<{
          empresaSlug: string;
          mes: number;
          ano: number;
          metaQuinzenal: number;
          totalQuinzenal: number;
          pctQuinzenal: number;
          atingiu: boolean;
          diasUteisQuinzenal: number;
        }> = [];

        for (const slug of empresasSlugs) {
          for (const chave of Array.from(mesesSet)) {
            const [mes, ano] = chave.split("-").map(Number);
            const meta = metasAno.find((m) => m.empresaSlug === slug && m.mes === mes && m.ano === ano);
            const metaQ = parseFloat(meta?.metaQuinzenal || "0");
            const diasUteisQ = meta?.diasUteisQuinzenal ?? 0;

            // Faturamento dos dias 1-15 desta empresa neste mês
            const fatQuinzena = fatAno.filter((f) => {
              const [fAno, fMes, fDia] = f.data.split("-").map(Number);
              return f.empresaSlug === slug && fMes === mes && fAno === ano && fDia >= 1 && fDia <= 15;
            });

            const totalQ = fatQuinzena.reduce((acc, r) => {
              const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
              return acc + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
            }, 0);

            const pctQ = metaQ > 0 ? Math.round((totalQ / metaQ) * 100) : 0;

            resultado.push({
              empresaSlug: slug,
              mes,
              ano,
              metaQuinzenal: metaQ,
              totalQuinzenal: Math.round(totalQ * 100) / 100,
              pctQuinzenal: pctQ,
              atingiu: totalQ >= metaQ && metaQ > 0,
              diasUteisQuinzenal: diasUteisQ,
            });
          }
        }

        // Ordenar por ano desc, mês desc, empresa asc
        resultado.sort((a, b) => {
          if (a.ano !== b.ano) return b.ano - a.ano;
          if (a.mes !== b.mes) return b.mes - a.mes;
          return a.empresaSlug.localeCompare(b.empresaSlug);
        });

        return resultado;
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

    // ─── HISTÓRICO DE BONIFICAÇÕES PAGAS ─────────────────────────────────────
    listarHistorico: protectedProcedure
      .input(z.object({
        ano: z.number().optional(),
      }).optional())
      .query(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) return [];
        const { bonificacaoHistorico } = await import("../drizzle/schema.js");
        const { eq, and, desc } = await import("drizzle-orm");
        const ano = input?.ano ?? new Date().getFullYear();
        const rows = await db
          .select()
          .from(bonificacaoHistorico)
          .where(and(
            eq(bonificacaoHistorico.tenantId, tenantId),
            eq(bonificacaoHistorico.ano, ano),
          ))
          .orderBy(desc(bonificacaoHistorico.mes), bonificacaoHistorico.empresaSlug);
        return rows;
      }),

    salvarHistorico: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        empresaSlug: z.string().min(1),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
        faturamentoTotal: z.string(),
        metaMensal: z.string(),
        superMeta: z.string().default("0"),
        atingiuMeta: z.number().default(0),
        atingiuSuperMeta: z.number().default(0),
        valorQuinzenal: z.string().default("0"),
        valorMensal: z.string().default("0"),
        valorSuperMeta: z.string().default("0"),
        totalPago: z.string(),
        observacao: z.string().optional(),
        pagoEm: z.date().optional().nullable(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const { bonificacaoHistorico } = await import("../drizzle/schema.js");
        const { eq, and } = await import("drizzle-orm");
        const payload = {
          tenantId,
          empresaSlug: input.empresaSlug,
          mes: input.mes,
          ano: input.ano,
          faturamentoTotal: input.faturamentoTotal,
          metaMensal: input.metaMensal,
          superMeta: input.superMeta,
          atingiuMeta: input.atingiuMeta,
          atingiuSuperMeta: input.atingiuSuperMeta,
          valorQuinzenal: input.valorQuinzenal,
          valorMensal: input.valorMensal,
          valorSuperMeta: input.valorSuperMeta,
          totalPago: input.totalPago,
          observacao: input.observacao ?? null,
          pagoEm: input.pagoEm ?? null,
        };
        if (input.id) {
          await db.update(bonificacaoHistorico).set(payload).where(eq(bonificacaoHistorico.id, input.id));
        } else {
          // Upsert por tenant+empresa+mes+ano
          const existing = await db.select().from(bonificacaoHistorico).where(
            and(
              eq(bonificacaoHistorico.tenantId, tenantId),
              eq(bonificacaoHistorico.empresaSlug, input.empresaSlug),
              eq(bonificacaoHistorico.mes, input.mes),
              eq(bonificacaoHistorico.ano, input.ano),
            )
          ).limit(1);
          if (existing.length > 0) {
            await db.update(bonificacaoHistorico).set(payload).where(eq(bonificacaoHistorico.id, existing[0].id));
          } else {
            await db.insert(bonificacaoHistorico).values(payload);
          }
        }
        return { success: true };
      }),

    deletarHistorico: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem excluir registros." });
        }
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const { bonificacaoHistorico } = await import("../drizzle/schema.js");
        const { eq } = await import("drizzle-orm");
        await db.delete(bonificacaoHistorico).where(eq(bonificacaoHistorico.id, input.id));
        return { success: true };
      }),

    fecharMesAutomatico: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { fecharMesBonificacoes } = await import("./cashbarberJob.js");
        await fecharMesBonificacoes(tenantId, input.mes, input.ano);
        return { success: true };
      }),
  }),

  // ─── SNAPSHOT QUINZENAL ──────────────────────────────────────────────────────
  snapshotQuinzenal: router({
    /** Lista todos os snapshots quinzenais do tenant */
    listar: protectedProcedure
      .input(z.object({
        ano: z.number().min(2020).max(2100).optional(),
        mes: z.number().min(1).max(12).optional(),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const { snapshotQuinzenal } = await import("../drizzle/schema.js");
        const { eq, and, desc } = await import("drizzle-orm");
        const conditions = [eq(snapshotQuinzenal.tenantId, tenantId)];
        if (input?.ano) {
          conditions.push(eq(snapshotQuinzenal.ano, input.ano));
        }
        if (input?.mes) {
          conditions.push(eq(snapshotQuinzenal.mes, input.mes));
        }
        return db
          .select()
          .from(snapshotQuinzenal)
          .where(and(...conditions))
          .orderBy(desc(snapshotQuinzenal.ano), desc(snapshotQuinzenal.mes));
      }),

    /** Busca o snapshot de um mês/empresa específico */
    buscar: protectedProcedure
      .input(z.object({
        empresaSlug: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      }))
      .query(async ({ input, ctx }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const { snapshotQuinzenal } = await import("../drizzle/schema.js");
        const { eq, and } = await import("drizzle-orm");
        const result = await db
          .select()
          .from(snapshotQuinzenal)
          .where(
            and(
              eq(snapshotQuinzenal.tenantId, tenantId),
              eq(snapshotQuinzenal.empresaSlug, input.empresaSlug),
              eq(snapshotQuinzenal.mes, input.mes),
              eq(snapshotQuinzenal.ano, input.ano)
            )
          )
          .limit(1);
        return result[0] ?? null;
      }),

    /** Dispara o congelamento manual do snapshot quinzenal (gerente/admin) */
    congelarManual: protectedProcedure
      .input(z.object({
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.perfil !== "gerente" && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a gerentes e administradores." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { verificarMetaQuinzenalParaTenant } = await import("./cashbarberJob.js");
        await verificarMetaQuinzenalParaTenant(tenantId, input.mes, input.ano);
        return { success: true };
      }),

    /** Permite que admin sobrescreva o snapshot (correção manual) */
    sobrescrever: protectedProcedure
      .input(z.object({
        empresaSlug: z.string(),
        mes: z.number().min(1).max(12),
        ano: z.number().min(2020).max(2100),
        totalRealizado: z.string(),
        metaQuinzenal: z.string(),
        observacao: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores podem sobrescrever snapshots." });
        }
        const tenantId = await getTenantIdFromCtx(ctx);
        const { getDb } = await import("./db.js");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível." });
        const { snapshotQuinzenal } = await import("../drizzle/schema.js");
        const { eq, and } = await import("drizzle-orm");
        const total = parseFloat(input.totalRealizado);
        const meta = parseFloat(input.metaQuinzenal);
        const atingiu = total >= meta ? 1 : 0;
        const percentual = meta > 0 ? ((total / meta) * 100).toFixed(2) : "0";
        const payload = {
          tenantId,
          empresaSlug: input.empresaSlug,
          mes: input.mes,
          ano: input.ano,
          totalRealizado: total.toFixed(2),
          metaQuinzenal: meta.toFixed(2),
          atingiu,
          percentual,
          origem: "manual",
          congeladoEm: new Date(),
        };
        const existing = await db
          .select()
          .from(snapshotQuinzenal)
          .where(
            and(
              eq(snapshotQuinzenal.tenantId, tenantId),
              eq(snapshotQuinzenal.empresaSlug, input.empresaSlug),
              eq(snapshotQuinzenal.mes, input.mes),
              eq(snapshotQuinzenal.ano, input.ano)
            )
          )
          .limit(1);
        if (existing.length > 0) {
          await db.update(snapshotQuinzenal).set(payload).where(eq(snapshotQuinzenal.id, existing[0].id));
        } else {
          await db.insert(snapshotQuinzenal).values(payload);
        }
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

        // Notificação ao owner removida — notificações desativadas
        return {
          success: false,
          message: "Notificações desativadas.",
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
              // Notificação ao owner removida — notificações desativadas
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
              // Notificação ao owner removida — notificações desativadas
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

    /**
     * Dispara manualmente a verificação de meta diária para o tenant do usuário.
     * Útil para testar sem esperar o próximo ciclo do job horário.
     */
    testarMetaDiaria: protectedProcedure.mutation(async ({ ctx }) => {
      const tenantId = ctx.user.tenantId;
      if (!tenantId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const { verificarMetaDiariaParaTenant } = await import("./cashbarberJob");
      await verificarMetaDiariaParaTenant(tenantId);
      return { ok: true, mensagem: "Verificação de meta diária executada. Confira as notificações." };
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

        // Verificar se o mês selecionado é o mês vigente
        const agora = new Date();
        const esMesVigente = input.mes === (agora.getMonth() + 1) && input.ano === agora.getFullYear();
        // Para o mês vigente, aceita históricos parciais (mês em andamento)
        const resultado = await cashbarberCalcularDpoteViaHistorico(token, idInicial, esMesVigente);
        if (!resultado) return { filiais: [], totalAssinaturas: 0, totalFichas: 0, historicoId: null };
        // Salvar o ID do histórico ativo e o valor de assinaturas no banco para todas as empresas configuradas
        const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;;
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

         // Verificar se o mês selecionado é o mês vigente
        const agoraAplicar = new Date();
        const esMesVigenteAplicar = input.mes === (agoraAplicar.getMonth() + 1) && input.ano === agoraAplicar.getFullYear();
        // Para o mês vigente, aceita históricos parciais (mês em andamento)
        const resultado = await cashbarberCalcularDpoteViaHistorico(token, idInicial, esMesVigenteAplicar);
        if (!resultado) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum histórico Dpote com dados válidos encontrado." });
        }
        // Salvar o ID do histórico ativo e o valor de assinaturas no banco
        const mesSigla = `${input.ano}-${String(input.mes).padStart(2, "0")}`;
        for (const cfg of configs) {
          await saveDpoteHistoricoId(tenantId, cfg.empresaSlug, resultado.historicoId, mesSigla, resultado.valorAssinaturas);
        }

        // Para cada empresa configurada com dpoteFilialNome, encontrar o resultado correspondente
        const diasDoMes = new Date(input.ano, input.mes, 0).getDate();
        // Limitar a distribuição ao dia vigente quando for o mês atual
        const agoraDistrib = new Date();
        const ehMesAtual = input.mes === (agoraDistrib.getMonth() + 1) && input.ano === agoraDistrib.getFullYear();
        // Para o mês atual: distribui apenas até hoje. Para meses passados: distribui em todos os dias.
        const diaLimite = ehMesAtual ? agoraDistrib.getDate() : diasDoMes;
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

          // Distribuir o valor diário apenas até o diaLimite (dia vigente no mês atual)
          // O valor diário = valorDistribuido / diaLimite (distribuição uniforme pelos dias já passados)
          const valorDiario = diaLimite > 0 ? filial.valorDistribuido / diaLimite : 0;
          for (let dia = 1; dia <= diasDoMes; dia++) {
            const dataStr = `${input.ano}-${String(input.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const existente = await getFaturamentoByDataEmpresaTenant(dataStr, config.empresaSlug, tenantId);
            // Para dias futuros no mês atual: zerar o D-Pote se houver valor anterior
            if (ehMesAtual && dia > diaLimite) {
              if (existente && parseFloat(existente.cat9 ?? "0") > 0) {
                await upsertFaturamento({
                  tenantId,
                  empresaSlug: config.empresaSlug,
                  data: dataStr,
                  cat1: existente.cat1 ?? "0",
                  cat2: existente.cat2 ?? "0",
                  cat3: existente.cat3 ?? "0",
                  cat4: existente.cat4 ?? "0",
                  cat5: existente.cat5 ?? "0",
                  cat6: existente.cat6 ?? "0",
                  cat7: existente.cat7 ?? "0",
                  cat8: existente.cat8 ?? "0",
                  cat9: "0",
                  sincronizadoCB: existente.sincronizadoCB ?? 0,
                  observacao: existente.observacao ?? undefined,
                  lancadoPor: existente.lancadoPor ?? undefined,
                });
              }
              continue;
            }
            if (existente) {
              await upsertFaturamento({
                tenantId,
                empresaSlug: config.empresaSlug,
                data: dataStr,
                cat1: existente.cat1 ?? "0",
                cat2: existente.cat2 ?? "0",
                cat3: existente.cat3 ?? "0",
                cat4: existente.cat4 ?? "0",
                cat5: existente.cat5 ?? "0",
                cat6: existente.cat6 ?? "0",
                cat7: existente.cat7 ?? "0",
                cat8: existente.cat8 ?? "0",
                cat9: valorDiario.toFixed(2),
                sincronizadoCB: existente.sincronizadoCB ?? 0,
                observacao: existente.observacao ?? undefined,
                lancadoPor: existente.lancadoPor ?? undefined,
              });
            }
          }

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
        recorrenciaFonte: ((c as any).recorrenciaFonte ?? "cashbarber") as "cashbarber" | "manual",
        recorrenciaValorManual: (c as any).recorrenciaValorManual ? parseFloat(String((c as any).recorrenciaValorManual)) : null,
        recorrenciaManualAtualizadoEm: (c as any).recorrenciaManualAtualizadoEm ?? null,
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

    /** Retorna dados completos para o painel de status de sync */
    painelStatus: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const [ultimosPorEmpresa, logsRecentes, jobsAtivos] = await Promise.all([
        getUltimoSyncPorEmpresa(tenantId),
        listAllCashbarberSyncLogs(tenantId, 30),
        Promise.resolve(getStatusJobsCashbarber()),
      ]);

      // Calcular próximo sync: sempre às 09:00 UTC (06:00 BRT) do próximo dia
      const agora = new Date();
      const proximoSync = new Date(agora);
      proximoSync.setUTCHours(9, 0, 0, 0);
      if (proximoSync <= agora) proximoSync.setUTCDate(proximoSync.getUTCDate() + 1);

      // Calcular status geral: ok se todos ok, parcial se algum parcial, erro se algum erro
      const statusGeral = ultimosPorEmpresa.length === 0
        ? "sem_dados"
        : ultimosPorEmpresa.every((e) => e.status === "ok")
        ? "ok"
        : ultimosPorEmpresa.some((e) => e.status === "erro")
        ? "erro"
        : "parcial";

      return {
        statusGeral,
        ultimosPorEmpresa,
        logsRecentes,
        jobsAtivos,
        proximoSync,
        agora,
      };
    }),

    /** Dispara sync manual de todas as empresas do tenant */
    syncManual: protectedProcedure.mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const configs = await listCashbarberConfigs(tenantId);
      const configsAtivas = configs.filter((c) => c.ativo === 1);
      if (configsAtivas.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com integração CashBarber configurada" });
      }
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const resultados: Record<string, { ok: boolean; dias?: number; erro?: string }> = {};
      for (const config of configsAtivas) {
        try {
          const resultado = await sincronizarFaturamentoCashbarber(tenantId, config.empresaSlug, mes, ano, "manual");
          resultados[config.empresaSlug] = { ok: true, dias: resultado.diasSincronizados };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          resultados[config.empresaSlug] = { ok: false, erro: msg };
        }
      }
      // Aplicar Dpote após sync
      try {
        const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
        await aplicarDpoteParaTenant(tenantId, mes, ano);
      } catch (err) {
        console.warn("[SyncManual] Falha ao aplicar Dpote:", err);
      }
      return { ok: true, resultados, mes, ano };
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
    /**
     * Salva a escolha de fonte de Recorrência (cashbarber ou manual) para uma empresa.
     * Quando fonte = 'manual', também salva o valor manual informado e distribui nos dias do mês.
     */
    salvarRecorrenciaFonte: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string().min(1),
          fonte: z.enum(["cashbarber", "manual"]),
          valorManual: z.number().min(0).optional(),
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        await saveRecorrenciaFonte(
          tenantId,
          input.empresaSlug,
          input.fonte,
          input.valorManual
        );
        // Se mudou para 'cashbarber', sincronizar imediatamente com o CashBarber
        if (input.fonte === "cashbarber") {
          try {
            await sincronizarFaturamentoCashbarber(
              tenantId,
              input.empresaSlug,
              input.mes,
              input.ano,
              "manual"
            );
          } catch {
            // Falha na sync não impede salvar a preferência
          }
        }
        // Se mudou para 'manual' e tem valor, distribuir nos dias
        if (input.fonte === "manual" && input.valorManual !== undefined && input.valorManual > 0) {
          const diasDoMes = new Date(input.ano, input.mes, 0).getDate();
          const hoje = new Date();
          const diaHoje =
            hoje.getFullYear() === input.ano && hoje.getMonth() + 1 === input.mes
              ? hoje.getDate()
              : diasDoMes;
          const valorDiario = input.valorManual / diaHoje;
          for (let dia = 1; dia <= diasDoMes; dia++) {
            const dataStr = `${input.ano}-${String(input.mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
            const valorDia = dia <= diaHoje ? valorDiario : 0;
            const existing = await getFaturamentoByDataEmpresaTenant(dataStr, input.empresaSlug, tenantId);
            await upsertFaturamento({
              tenantId,
              empresaSlug: input.empresaSlug,
              data: dataStr,
              cat1: existing ? String(existing.cat1) : "0",
              cat2: existing ? String(existing.cat2) : "0",
              cat3: existing ? String(existing.cat3) : "0",
              cat4: existing ? String(existing.cat4) : "0",
              cat5: existing ? String(existing.cat5) : "0",
              cat6: existing ? String(existing.cat6) : "0",
              cat7: existing ? String(existing.cat7) : "0",
              cat8: existing ? String(existing.cat8) : "0",
              cat9: String(valorDia),
              observacao: existing?.observacao ?? null,
              lancadoPor: existing?.lancadoPor ?? "sistema",
            });
          }
        }
        return { ok: true, fonte: input.fonte };
      }),

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

    /**
     * Sync rápido de faturamento da unidade para um mês/ano.
     * Acessível para qualquer usuário autenticado (gerentes incluídos).
     * Sincroniza apenas o mês corrente da empresa informada.
     */
    syncRapidoFaturamento: protectedProcedure
      .input(
        z.object({
          empresaSlug: z.string().min(1),
          mes: z.number().int().min(1).max(12),
          ano: z.number().int().min(2020),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const tenantId = await getTenantIdFromCtx(ctx);
        // Mapear slug de colaborador para slug usado nos faturamentos
        const slugMap: Record<string, string> = {
          'barbiero-morumbi': 'MORUMBI',
          'barbiero-mascote': 'MASCOTE',
          'barbiero-seraphine': 'SERAPHINE',
          'barbiero-grupo': 'GRUPO',
        };
        const empresaSlugNorm = slugMap[input.empresaSlug] ?? input.empresaSlug;
        try {
          const resultado = await sincronizarFaturamentoCashbarber(
            tenantId,
            empresaSlugNorm,
            input.mes,
            input.ano,
            "manual"
          );
          return {
            ok: true,
            diasSincronizados: resultado.diasSincronizados,
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

  // ===== UPLOAD DE IMAGEM DO RANKING PARA S3 =====
  uploadRankingImagem: publicProcedure
    .input(z.object({
      imageBase64: z.string(), // data URL base64 (ex: "data:image/png;base64,...")
      nomeArquivo: z.string().max(128),
    }))
    .mutation(async ({ input }) => {
      // Converter base64 para Buffer
      const base64Data = input.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const { storagePut } = await import('./storage');
      const suffix = Date.now();
      const key = `rankings/${input.nomeArquivo}-${suffix}.png`;
      const { url } = await storagePut(key, buffer, 'image/png');
      return { url };
    }),

  // ===== RANKING DIÁRIO E SEMANAL =====
  rankingDiario: publicProcedure
    .input(z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada.' });
      }
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      const comId = colaboradoresList.filter((c) => c.cashbarberProfissionalId && c.ativo === 1 && c.exibirNoRanking === 1 && c.isGerencia !== 1);
      const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
      // Calcular início do mês para buscar total acumulado mensal
      const [anoStr, mesStr] = input.data.split('-');
      const inicioMes = `${anoStr}-${mesStr}-01`;
      const resultados = await Promise.all(
        comId.map(async (col) => {
          const metaMensal = col.metaMensal ? Number(col.metaMensal) : null;
          try {
            // Busca paralela: faturamento do dia E total acumulado do mês
            const [relatorio, relatorioMes] = await Promise.all([
              cashbarberRelatorio15(token, input.data, input.data, null, col.cashbarberProfissionalId),
              inicioMes !== input.data
                ? cashbarberRelatorio15(token, inicioMes, input.data, null, col.cashbarberProfissionalId)
                : null,
            ]);
            const servicosRanking = relatorio.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
            const produtosRanking = relatorio.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
            const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
            const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
            const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
            const totalGeral = totalServicos + totalProdutos;
            // Total acumulado do mês (para cálculo correto da meta)
            const relMes = relatorioMes ?? relatorio;
            const servicosMes = relMes.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
            const produtosMes = relMes.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
            const totalMes = servicosMes.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0)
                           + produtosMes.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const pctMeta = metaMensal && metaMensal > 0 ? Math.round((totalMes / metaMensal) * 100) : null;
            return {
              id: col.id,
              nome: col.nome,
              apelido: col.apelido,
              fotoUrl: col.fotoUrl,
              cargo: col.cargo,
              empresaSlug: col.empresaSlug ?? 'barbiero-grupo',
              categoriaRanking: (col.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
              totalServicos,
              totalProdutos,
              totalGeral,
              totalMes,
              qtdServicos,
              qtdProdutos,
              metaMensal,
              pctMeta,
            };
          } catch {
            return {
              id: col.id,
              nome: col.nome,
              apelido: col.apelido,
              fotoUrl: col.fotoUrl,
              cargo: col.cargo,
              empresaSlug: col.empresaSlug ?? 'barbiero-grupo',
              categoriaRanking: (col.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
              totalServicos: 0,
              totalProdutos: 0,
              totalGeral: 0,
              totalMes: 0,
              qtdServicos: 0,
              qtdProdutos: 0,
              metaMensal,
              pctMeta: null,
            };
          }
        })
      );
      return resultados.sort((a, b) => b.totalGeral - a.totalGeral);
    }),

  rankingSemanal: publicProcedure
    .input(z.object({ dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada.' });
      }
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      const comId = colaboradoresList.filter((c) => c.cashbarberProfissionalId && c.ativo === 1 && c.exibirNoRanking === 1 && c.isGerencia !== 1);
      const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
      // Calcular início do mês baseado na dataInicio da semana
      const [anoStrSem, mesStrSem] = input.dataInicio.split('-');
      const inicioMesSem = `${anoStrSem}-${mesStrSem}-01`;
      const resultados = await Promise.all(
        comId.map(async (col) => {
          const metaMensal = col.metaMensal ? Number(col.metaMensal) : null;
          try {
            // Busca paralela: faturamento da semana E total acumulado do mês
            const [relatorio, relatorioMes] = await Promise.all([
              cashbarberRelatorio15(token, input.dataInicio, input.dataFim, null, col.cashbarberProfissionalId),
              inicioMesSem !== input.dataInicio
                ? cashbarberRelatorio15(token, inicioMesSem, input.dataFim, null, col.cashbarberProfissionalId)
                : null,
            ]);
            const servicosRanking = relatorio.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
            const produtosRanking = relatorio.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
            const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
            const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
            const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
            const totalGeral = totalServicos + totalProdutos;
            // Total acumulado do mês (para cálculo correto da meta)
            const relMesSem = relatorioMes ?? relatorio;
            const servicosMesSem = relMesSem.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
            const produtosMesSem = relMesSem.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
            const totalMes = servicosMesSem.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0)
                           + produtosMesSem.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const pctMeta = metaMensal && metaMensal > 0 ? Math.round((totalMes / metaMensal) * 100) : null;
            return {
              id: col.id,
              nome: col.nome,
              apelido: col.apelido,
              fotoUrl: col.fotoUrl,
              cargo: col.cargo,
              empresaSlug: col.empresaSlug ?? 'barbiero-grupo',
              categoriaRanking: (col.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
              totalServicos,
              totalProdutos,
              totalGeral,
              totalMes,
              qtdServicos,
              qtdProdutos,
              metaMensal,
              pctMeta,
            };
          } catch {
            return {
              id: col.id,
              nome: col.nome,
              apelido: col.apelido,
              fotoUrl: col.fotoUrl,
              cargo: col.cargo,
              empresaSlug: col.empresaSlug ?? 'barbiero-grupo',
              categoriaRanking: (col.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
              totalServicos: 0,
              totalProdutos: 0,
              totalGeral: 0,
              totalMes: 0,
              qtdServicos: 0,
              qtdProdutos: 0,
              metaMensal,
              pctMeta: null,
            };
          }
        })
      );
      return resultados.sort((a, b) => b.totalGeral - a.totalGeral);
    }),

  // ===== RANKING MENSAL PÚBLICO (para tela de profissionais) =====
  rankingMensal: publicProcedure
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const [profissionais, { itens: faturamentos }] = await Promise.all([
        listarColaboradores(tenantId),
        listarRankingPorPeriodo(tenantId, input.mes, input.ano),
      ]);
      const EXCLUIDOS_RANKING = /^(corte de cabelo|barba$|barba completa|corte kids|raspar na m[áa]quina|pezinho)/i;
      const lista = profissionais
        .filter((p) => p.ativo === 1 && p.exibirNoRanking === 1 && p.isGerencia !== 1)
        .map((p) => {
          const fat = faturamentos.find((f) => f.colaboradorId === p.id);
          return {
            id: p.id,
            nome: p.nome,
            apelido: p.apelido,
            fotoUrl: p.fotoUrl,
            empresaSlug: p.empresaSlug ?? 'barbiero-grupo',
            categoriaRanking: (p.categoriaRanking ?? 'barbeiro') as 'barbeiro' | 'auxiliar' | 'recepcao',
            totalServicos: fat?.totalServicos ?? 0,
            totalProdutos: fat?.totalProdutos ?? 0,
            totalGeral: fat?.totalGeral ?? 0,
            qtdServicos: fat?.qtdServicos ?? 0,
            qtdProdutos: fat?.qtdProdutos ?? 0,
            temDados: !!fat,
            metaMensal: p.metaMensal ? parseFloat(String(p.metaMensal)) : null,
            pctMeta: (p.metaMensal && fat?.totalGeral)
              ? Math.round((fat.totalGeral / parseFloat(String(p.metaMensal))) * 100)
              : null,
          };
        })
        .sort((a, b) => b.totalGeral - a.totalGeral);
      return { lista };
    }),

  // ===== RANKING GERÊNCIA (para exibir seção separada na tela de profissionais) =====
  rankingDiarioGerencia: publicProcedure
    .input(z.object({ data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) return [];
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      // Incluir TODOS os gerentes (mesmo sem cashbarberProfissionalId)
      const todosGerentes = colaboradoresList.filter((c) => c.ativo === 1 && c.isGerencia === 1);
      const gerentesComCB = todosGerentes.filter((c) => c.cashbarberProfissionalId);
      const gerentesSemCB = todosGerentes.filter((c) => !c.cashbarberProfissionalId);
      const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
      const resultadosCB = await Promise.all(
        gerentesComCB.map(async (col) => {
          try {
            const relatorio = await cashbarberRelatorio15(token, input.data, input.data, null, col.cashbarberProfissionalId);
            const servicosRanking = relatorio.servicos.filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
            const produtosRanking = relatorio.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));
            const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
            const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
            const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
            return { id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo, empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos, totalProdutos, totalGeral: totalServicos + totalProdutos, qtdServicos, qtdProdutos };
          } catch {
            return { id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo, empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0 };
          }
        })
      );
      // Gerentes sem cashbarberProfissionalId aparecem com R$ 0
      const resultadosSemCB = gerentesSemCB.map((col) => ({
        id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo,
        empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0
      }));
      const resultados = [...resultadosCB, ...resultadosSemCB];
      return resultados.sort((a, b) => b.totalGeral - a.totalGeral);
    }),

  rankingSemanalGerencia: publicProcedure
    .input(z.object({ dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) return [];
      const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const colaboradoresList = await listarColaboradores(tenantId);
      // Incluir TODOS os gerentes (mesmo sem cashbarberProfissionalId)
      const todosGerentesSem = colaboradoresList.filter((c) => c.ativo === 1 && c.isGerencia === 1);
      const gerentesComCBSem = todosGerentesSem.filter((c) => c.cashbarberProfissionalId);
      const gerentesSemCBSem = todosGerentesSem.filter((c) => !c.cashbarberProfissionalId);
      const EXCLUIDOS_RANKING2 = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      const EXCLUIDOS_PRODUTOS2 = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
      const resultadosCBSem = await Promise.all(
        gerentesComCBSem.map(async (col) => {
          try {
            const relatorio = await cashbarberRelatorio15(token, input.dataInicio, input.dataFim, null, col.cashbarberProfissionalId);
            const servicosRanking = relatorio.servicos.filter((s: any) => !EXCLUIDOS_RANKING2.test(s.ser_nome ?? ''));
            const produtosRanking = relatorio.produtos.filter((p: any) => !EXCLUIDOS_PRODUTOS2.test(p.pro_nome ?? ''));
            const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
            const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
            const qtdServicos = servicosRanking.reduce((acc: number, s: any) => acc + (Number(s.count) || 0), 0);
            const qtdProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (Number(p.count) || 0), 0);
            return { id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo, empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos, totalProdutos, totalGeral: totalServicos + totalProdutos, qtdServicos, qtdProdutos };
          } catch {
            return { id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo, empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0 };
          }
        })
      );
      const resultadosSemCBSem = gerentesSemCBSem.map((col) => ({
        id: col.id, nome: col.nome, apelido: col.apelido, fotoUrl: col.fotoUrl, cargo: col.cargo,
        empresaSlug: col.empresaSlug ?? 'barbiero-grupo', totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0
      }));
      const resultadosSem = [...resultadosCBSem, ...resultadosSemCBSem];
      return resultadosSem.sort((a, b) => b.totalGeral - a.totalGeral);
    }),

  rankingMensalGerencia: publicProcedure
    .input(z.object({ mes: z.number().int().min(1).max(12), ano: z.number().int().min(2020) }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const [profissionais, { itens: faturamentos }] = await Promise.all([
        listarColaboradores(tenantId),
        listarRankingPorPeriodo(tenantId, input.mes, input.ano),
      ]);
      const lista = profissionais
        .filter((p) => p.ativo === 1 && p.isGerencia === 1)
        .map((p) => {
          const fat = faturamentos.find((f) => f.colaboradorId === p.id);
          return {
            id: p.id,
            nome: p.nome,
            apelido: p.apelido,
            fotoUrl: p.fotoUrl,
            empresaSlug: p.empresaSlug ?? 'barbiero-grupo',
            totalServicos: fat?.totalServicos ?? 0,
            totalProdutos: fat?.totalProdutos ?? 0,
            totalGeral: fat?.totalGeral ?? 0,
            qtdServicos: fat?.qtdServicos ?? 0,
            qtdProdutos: fat?.qtdProdutos ?? 0,
          };
        })
        .sort((a, b) => b.totalGeral - a.totalGeral);
      return { lista };
    }),

  // ===== LOGIN PROFISSIONAL (PIN) =====
  loginProfissional: publicProcedure
    .input(z.object({ pin: z.string().min(1).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const colaboradoresList = await listarColaboradores(tenantId);
      const profissional = colaboradoresList.find(
        (c) => c.ativo === 1 && c.pinAcesso === input.pin
      );
      if (!profissional) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'PIN inválido.' });
      }
      // Gerar token JWT para o profissional
      const token = await new SignJWT({
        profissionalId: profissional.id,
        nome: profissional.nome,
        empresaSlug: profissional.empresaSlug ?? 'barbiero-grupo',
        tenantId,
        type: 'profissional',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(JWT_SECRET);
      // Setar cookie
      const res = (ctx as any).res;
      if (res) {
        res.cookie('prof_session', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/',
        });
      }
      return { ok: true, nome: profissional.nome, id: profissional.id, empresaSlug: profissional.empresaSlug ?? 'barbiero-grupo', fotoUrl: profissional.fotoUrl ?? null, apelido: profissional.apelido ?? null, isGerencia: profissional.isGerencia === 1 };
    }),

  meProfissional: publicProcedure.query(async ({ ctx }) => {
    const req = (ctx as any).req;
    const cookieHeader = req?.headers?.cookie ?? '';
    const cookies = parseCookieHeader(cookieHeader);
    const token = cookies['prof_session'];
    if (!token) return null;
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      if (payload.type !== 'profissional') return null;
      const tenantId = payload.tenantId as number;
      const profissionalId = payload.profissionalId as number;
      // Buscar dados atualizados do colaborador (foto, apelido)
      const colaboradoresList = await listarColaboradores(tenantId);
      const col = colaboradoresList.find((c) => c.id === profissionalId);
      return {
        profissionalId,
        nome: payload.nome as string,
        apelido: col?.apelido ?? null,
        fotoUrl: col?.fotoUrl ?? null,
        empresaSlug: (payload.empresaSlug as string) ?? 'barbiero-grupo',
        tenantId,
        isGerencia: col?.isGerencia === 1,
      };
    } catch {
      return null;
    }
  }),

   logoutProfissional: publicProcedure.mutation(async ({ ctx }) => {
    const res = (ctx as any).res;
    if (res) {
      res.clearCookie('prof_session', { path: '/' });
    }
    return { ok: true };
  }),

  // ─── Meus Atendimentos ───
  meusAtendimentos: publicProcedure
    .input(z.object({
      dataInicio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dataFim: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }))
    .query(async ({ ctx, input }) => {
      const req = (ctx as any).req;
      const cookieHeader = req?.headers?.cookie ?? '';
      const cookies = parseCookieHeader(cookieHeader);
      const token = cookies['prof_session'];
      if (!token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Não autenticado.' });

      let profissionalId: number;
      let tenantId: number;
      try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.type !== 'profissional') throw new Error();
        profissionalId = payload.profissionalId as number;
        tenantId = payload.tenantId as number;
      } catch {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sessão inválida.' });
      }

      const colaboradoresList = await listarColaboradores(tenantId);
      const col = colaboradoresList.find((c) => c.id === profissionalId);
      if (!col || !col.cashbarberProfissionalId) {
        return { servicos: [], produtos: [], totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0 };
      }

      const empresas = await getEmpresasByTenant(tenantId);
      const empresaSlug = empresas[0]?.slug ?? 'barbiero-grupo';
      const config = await getCashbarberConfig(tenantId, empresaSlug);
      if (!config || !config.cbEmail || !config.cbSenha) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Configuração do CashBarber não encontrada.' });
      }

      const cbToken = await cashbarberLogin(config.cbEmail, config.cbSenha);
      const relatorio = await cashbarberRelatorio15(cbToken, input.dataInicio, input.dataFim, null, col.cashbarberProfissionalId);

      const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
      const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;

      const servicosFiltrados = (relatorio.servicos ?? []).filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ''));
      const produtosFiltrados = (relatorio.produtos ?? []).filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ''));

      const servicos = servicosFiltrados
        .filter((s: any) => (s.sum ?? 0) > 0)
        .map((s: any) => ({ nome: s.ser_nome ?? 'Serviço', valor: Number(s.sum) || 0, qtd: Number(s.count) || 0 }))
        .sort((a: any, b: any) => b.valor - a.valor);

      const produtos = produtosFiltrados
        .filter((p: any) => (p.total ?? 0) > 0)
        .map((p: any) => ({ nome: p.pro_nome ?? 'Produto', valor: Number(p.total) || 0, qtd: Number(p.count) || 0 }))
        .sort((a: any, b: any) => b.valor - a.valor);

      const totalServicos = servicos.reduce((acc: number, s: any) => acc + s.valor, 0);
      const totalProdutos = produtos.reduce((acc: number, p: any) => acc + p.valor, 0);
      const qtdServicos = servicos.reduce((acc: number, s: any) => acc + s.qtd, 0);
      const qtdProdutos = produtos.reduce((acc: number, p: any) => acc + p.qtd, 0);

      return {
        servicos,
        produtos,
        totalServicos,
        totalProdutos,
        totalGeral: totalServicos + totalProdutos,
        qtdServicos,
        qtdProdutos,
      };
    }),

  // ===== FATURAMENTO DA UNIDADE (para exibir no ranking dos profissionais) =====
  faturamentoUnidade: publicProcedure
    .input(z.object({
      empresaSlug: z.string(),
      tipo: z.enum(['diario', 'semanal', 'mensal']),
      data: z.string().optional(),        // YYYY-MM-DD para diário
      dataInicio: z.string().optional(),  // YYYY-MM-DD para semanal
      dataFim: z.string().optional(),     // YYYY-MM-DD para semanal
      mes: z.number().int().min(1).max(12).optional(),
      ano: z.number().int().min(2020).optional(),
    }))
     .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const db = await (await import('./db')).getDb();
      if (!db) return { total: 0, totalOperacional: 0, recorrencia: 0 };
      const { faturamentos: fatTable } = await import('../drizzle/schema.js');
      const { and: drizzleAnd, eq: drizzleEq } = await import('drizzle-orm');
      // Mapeamento: slug do colaborador → slug usado nos faturamentos
      const slugMap: Record<string, string> = {
        'barbiero-morumbi': 'MORUMBI',
        'barbiero-mascote': 'MASCOTE',
        'barbiero-seraphine': 'SERAPHINE',
        'barbiero-grupo': 'GRUPO',
      };
      const empresaSlugNorm = slugMap[input.empresaSlug] ?? input.empresaSlug;
      let rows: any[] = [];
      if (input.tipo === 'diario' && input.data) {
        rows = await db.select().from(fatTable).where(
          drizzleAnd(
            drizzleEq(fatTable.tenantId, tenantId),
            drizzleEq(fatTable.empresaSlug, empresaSlugNorm),
            drizzleEq(fatTable.data, input.data)
          )
        );
      } else if (input.tipo === 'semanal' && input.dataInicio && input.dataFim) {
        const allRows = await db.select().from(fatTable).where(
          drizzleAnd(
            drizzleEq(fatTable.tenantId, tenantId),
            drizzleEq(fatTable.empresaSlug, empresaSlugNorm)
          )
        );
        rows = allRows.filter((r: any) => r.data >= input.dataInicio! && r.data <= input.dataFim!);
      } else if (input.tipo === 'mensal' && input.mes && input.ano) {
        const allRows = await db.select().from(fatTable).where(
          drizzleAnd(
            drizzleEq(fatTable.tenantId, tenantId),
            drizzleEq(fatTable.empresaSlug, empresaSlugNorm)
          )
        );
        const mesStr = String(input.mes).padStart(2, '0');
        const prefix = `${input.ano}-${mesStr}`;
        const hoje = new Date().toISOString().slice(0, 10);
        rows = allRows.filter((r: any) => r.data.startsWith(prefix) && r.data <= hoje);
      }

      // Somar cat1..cat8 (operacional) e cat9 (recorrência) dos dias realizados
      const sumCatsSemCat9 = (r: any) =>
        [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8]
          .reduce((s: number, v: any) => s + parseFloat(v || '0'), 0);

      const totalOperacional = rows.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0);
      const cat9Acumulado = rows.reduce((s: number, r: any) => s + parseFloat(r.cat9 || '0'), 0);

      // Para o mensal: usar recorrenciaValorManual se fonte=manual
      let recorrencia = cat9Acumulado;
      if (input.tipo === 'mensal' && input.mes && input.ano) {
        const config = await getCashbarberConfig(tenantId, empresaSlugNorm);
        const hoje = new Date();
        const mesAtualNum = hoje.getMonth() + 1;
        const anoAtualNum = hoje.getFullYear();
        const ehMesVigente = input.mes === mesAtualNum && input.ano === anoAtualNum;
        if (
          config?.recorrenciaFonte === 'manual' &&
          config?.recorrenciaValorManual != null &&
          ehMesVigente
        ) {
          recorrencia = parseFloat(String(config.recorrenciaValorManual));
        }
      }

      // Buscar meta mensal da empresa (apenas para tipo mensal)
      let metaMensal: number | null = null;
      let superMeta: number | null = null;
      let pctMeta: number | null = null;
      let metaQuinzenal: number | null = null;
      let pctMetaQuinzenal: number | null = null;
      let diasUteisQuinzenal: number | null = null;
      // Projeção de faturamento ao final do mês
      let projecaoFinalMes: number | null = null;
      let mediaDiaria: number | null = null;
      let diasPassados: number | null = null;
      let diasNoMes: number | null = null;
      if (input.tipo === 'mensal' && input.mes && input.ano) {
        const metasLista = await getMetasByMesAndTenant(tenantId, input.mes, input.ano);
        const metaEmpresa = metasLista.find((m: any) => m.empresaSlug === empresaSlugNorm);
        if (metaEmpresa) {
          metaMensal = parseFloat(String(metaEmpresa.metaMensal)) || null;
          superMeta = parseFloat(String(metaEmpresa.superMeta)) || null;
          if (metaMensal && metaMensal > 0) {
            pctMeta = Math.round(((totalOperacional + recorrencia) / metaMensal) * 100);
          }
          // Meta quinzenal
          const mqVal = parseFloat(String(metaEmpresa.metaQuinzenal));
          if (mqVal > 0) {
            metaQuinzenal = mqVal;
            diasUteisQuinzenal = (metaEmpresa as any).diasUteisQuinzenal ?? 13;
            // Calcular faturamento acumulado até o dia 15 (ou hoje, o que for menor)
            const hoje = new Date();
            const mesAtualNum = hoje.getMonth() + 1;
            const anoAtualNum = hoje.getFullYear();
            const ehMesVigenteQ = input.mes === mesAtualNum && input.ano === anoAtualNum;
            const diaCorteQ = 15;
            const diasCorridosNoMesQ = new Date(input.ano, input.mes, 0).getDate();
            if (ehMesVigenteQ) {
              const diaAtualQ = hoje.getDate();
              if (diaAtualQ <= diaCorteQ) {
                // Estamos na primeira quinzena: calcular faturamento até hoje
                const prefixQ = `${input.ano}-${String(input.mes).padStart(2, '0')}`;
                const rowsQ = rows.filter((r: any) => {
                  const dia = parseInt(r.data.split('-')[2], 10);
                  return r.data.startsWith(prefixQ) && dia <= diaAtualQ;
                });
                const totalQ = rowsQ.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0)
                  + rowsQ.reduce((s: number, r: any) => s + parseFloat(r.cat9 || '0'), 0);
                pctMetaQuinzenal = Math.round((totalQ / mqVal) * 100);
              } else {
                // Estamos na segunda quinzena: calcular faturamento dos dias 1-15
                const prefixQ = `${input.ano}-${String(input.mes).padStart(2, '0')}`;
                const rowsQ = rows.filter((r: any) => {
                  const dia = parseInt(r.data.split('-')[2], 10);
                  return r.data.startsWith(prefixQ) && dia <= diaCorteQ;
                });
                const totalQ = rowsQ.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0)
                  + rowsQ.reduce((s: number, r: any) => s + parseFloat(r.cat9 || '0'), 0);
                pctMetaQuinzenal = Math.round((totalQ / mqVal) * 100);
              }
            } else {
              // Mês passado: calcular faturamento dos dias 1-15
              const prefixQ = `${input.ano}-${String(input.mes).padStart(2, '0')}`;
              const rowsQ = rows.filter((r: any) => {
                const dia = parseInt(r.data.split('-')[2], 10);
                return r.data.startsWith(prefixQ) && dia <= diaCorteQ;
              });
              const totalQ = rowsQ.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0)
                + rowsQ.reduce((s: number, r: any) => s + parseFloat(r.cat9 || '0'), 0);
              pctMetaQuinzenal = Math.round((totalQ / mqVal) * 100);
            }
          }
        }
        // Calcular projeção com base nos dias úteis da meta
        const hoje = new Date();
        const mesAtualNum = hoje.getMonth() + 1;
        const anoAtualNum = hoje.getFullYear();
        const ehMesVigente = input.mes === mesAtualNum && input.ano === anoAtualNum;
        // Total de dias corridos no mês (para referência)
        const diasCorridosNoMes = new Date(input.ano, input.mes, 0).getDate();
        // Usar diasUteis da meta se disponível, senão fallback para dias corridos
        const diasUteisTotal = (metaEmpresa && (metaEmpresa as any).diasUteis > 0)
          ? (metaEmpresa as any).diasUteis
          : diasCorridosNoMes;
        diasNoMes = diasUteisTotal;
        if (ehMesVigente) {
          // Calcular quantos dias úteis já passaram proporcionalmente
          // Proporção = (dia atual / dias corridos no mês) * dias úteis totais
          const diaAtual = hoje.getDate();
          diasPassados = Math.round((diaAtual / diasCorridosNoMes) * diasUteisTotal);
          diasPassados = Math.max(1, Math.min(diasPassados, diasUteisTotal));
        } else {
          // Mês passado: todos os dias úteis são passados
          diasPassados = diasUteisTotal;
        }
        // Projeção = média_diária_total (operacional + cat9 do dia) × dias_úteis_totais
        // O cat9 já é lançado proporcionalmente por dia, então a média diária do total
        // projetada para o mês inteiro dá o valor correto.
        const totalFaturado = totalOperacional + cat9Acumulado;
        if (diasPassados != null && diasPassados > 0 && totalFaturado > 0) {
          // Número real de dias com lançamentos
          const diasComDados = rows.length > 0 ? rows.filter((r: any) => {
            const op = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8]
              .reduce((s: number, v: any) => s + parseFloat(v || '0'), 0);
            const c9 = parseFloat(r.cat9 || '0');
            return op > 0 || c9 > 0;
          }).length : 0;
          const diasBase = diasComDados > 0 ? diasComDados : diasPassados;
          mediaDiaria = totalFaturado / diasBase;
          projecaoFinalMes = mediaDiaria * diasUteisTotal;
        }
      }

      // Calcular totalQuinzenal: usar snapshot definitivo após dia 15, ou cálculo em tempo real
      // REGRA: igual ao Dashboard principal (Home.tsx) - snapshot só após quinzena encerrar
      let totalQuinzenal: number | null = null;
      if (metaQuinzenal && metaQuinzenal > 0 && input.tipo === 'mensal' && input.mes && input.ano) {
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        const mesAtualNum = hoje.getMonth() + 1;
        const anoAtualNum = hoje.getFullYear();
        const ehMesVigenteQ2 = input.mes === mesAtualNum && input.ano === anoAtualNum;
        // Quinzena definitiva: após dia 15 no mês vigente, ou qualquer mês passado
        const quinzenaDefinitivaQ2 = ehMesVigenteQ2 ? diaAtual > 15 : (input.ano < anoAtualNum || (input.ano === anoAtualNum && input.mes < mesAtualNum));

        // Tentar usar snapshot congelado quando quinzena já encerrou
        let snapshotValor: number | null = null;
        if (quinzenaDefinitivaQ2) {
          const { snapshotQuinzenal: snapshotTable } = await import('../drizzle/schema.js');
          const snapRows = await db.select().from(snapshotTable).where(
            drizzleAnd(
              drizzleEq(snapshotTable.tenantId, tenantId),
              drizzleEq(snapshotTable.empresaSlug, empresaSlugNorm),
              drizzleEq(snapshotTable.mes, input.mes),
              drizzleEq(snapshotTable.ano, input.ano)
            )
          ).limit(1);
          if (snapRows.length > 0) {
            snapshotValor = parseFloat(snapRows[0].totalRealizado);
          }
        }

        if (snapshotValor !== null) {
          // Usar valor definitivo do snapshot (igual ao Dashboard principal)
          totalQuinzenal = Math.round(snapshotValor);
        } else {
          // Cálculo em tempo real: dias 1-15 (ou até hoje se < 15)
          const diaCorteQ2 = ehMesVigenteQ2 ? Math.min(diaAtual, 15) : 15;
          const prefixQ2 = `${input.ano}-${String(input.mes).padStart(2, '0')}`;
          const rowsQ2 = rows.filter((r: any) => {
            const dia = parseInt(r.data.split('-')[2], 10);
            return r.data.startsWith(prefixQ2) && dia <= diaCorteQ2;
          });
          const totalQ2 = rowsQ2.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0)
            + rowsQ2.reduce((s: number, r: any) => s + parseFloat(r.cat9 || '0'), 0);
          totalQuinzenal = Math.round(totalQ2);
        }
        // Recalcular pctMetaQuinzenal com base no valor final
        if (pctMetaQuinzenal == null) {
          pctMetaQuinzenal = Math.round((totalQuinzenal / metaQuinzenal) * 100);
        }
      }

      return {
        total: totalOperacional + recorrencia,
        totalOperacional,
        recorrencia,
        metaMensal,
        superMeta,
        pctMeta,
        projecaoFinalMes,
        mediaDiaria,
        diasPassados,
        diasNoMes,
        metaQuinzenal,
        pctMetaQuinzenal,
        totalQuinzenal,
        diasUteisQuinzenal,
      };
    }),

  // ===== ANÁLISE COMPARATIVA DO PROFISSIONAL =====
  analiseComparativa: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const now = new Date();
      const mesAtual = now.getMonth() + 1;
      const anoAtual = now.getFullYear();
      const dataMesAnt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const mesAnterior = dataMesAnt.getMonth() + 1;
      const anoAnterior = dataMesAnt.getFullYear();

      // Semana atual (seg–dom)
      const diaSemana = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const inicioSemAtual = new Date(now);
      inicioSemAtual.setDate(now.getDate() - diaSemana);
      inicioSemAtual.setHours(0, 0, 0, 0);
      const fimSemAtual = new Date(inicioSemAtual);
      fimSemAtual.setDate(inicioSemAtual.getDate() + 6);
      const inicioSemPassada = new Date(inicioSemAtual);
      inicioSemPassada.setDate(inicioSemAtual.getDate() - 7);
      const fimSemPassada = new Date(inicioSemPassada);
      fimSemPassada.setDate(inicioSemPassada.getDate() + 6);
      const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

      // Dados mensais
      const [{ itens: itensMesAtual }, { itens: itensMesAnt }] = await Promise.all([
        listarRankingPorPeriodo(tenantId, mesAtual, anoAtual),
        listarRankingPorPeriodo(tenantId, mesAnterior, anoAnterior),
      ]);

      const fatMesAtual = itensMesAtual.find((i) => i.colaboradorId === input.profissionalId);
      const fatMesAnt = itensMesAnt.find((i) => i.colaboradorId === input.profissionalId);

      const rankingMesAtual = [...itensMesAtual].sort((a, b) => b.totalGeral - a.totalGeral);
      const rankingMesAnt = [...itensMesAnt].sort((a, b) => b.totalGeral - a.totalGeral);
      const posicaoMesAtual = rankingMesAtual.findIndex((i) => i.colaboradorId === input.profissionalId) + 1 || null;
      const posicaoMesAnt = rankingMesAnt.findIndex((i) => i.colaboradorId === input.profissionalId) + 1 || null;

      // Dados semanais via CashBarber
      const colaboradoresList = await listarColaboradores(tenantId);
      const col = colaboradoresList.find((c) => c.id === input.profissionalId);
      let fatSemAtual = { totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0 };
      let fatSemPassada = { totalServicos: 0, totalProdutos: 0, totalGeral: 0, qtdServicos: 0, qtdProdutos: 0 };

      if (col?.cashbarberProfissionalId) {
        try {
          const empresas = await getEmpresasByTenant(tenantId);
          const empresaSlug = col.empresaSlug ?? empresas[0]?.slug ?? 'barbiero-grupo';
          const config = await getCashbarberConfig(tenantId, empresaSlug);
          if (config?.cbEmail && config?.cbSenha) {
            const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
            const EXCL_SVC = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*m[áa]quina|barba\s*(completa|simples|na\s*tesoura|na\s*m[áa]quina)?$|pezinho)/i;
            const EXCL_PRD = /^(caixinha|[áa]gua|heineken|refrigerante|corona)/i;
            const [relSemA, relSemP] = await Promise.all([
              cashbarberRelatorio15(token, toDateStr(inicioSemAtual), toDateStr(fimSemAtual), null, col.cashbarberProfissionalId),
              cashbarberRelatorio15(token, toDateStr(inicioSemPassada), toDateStr(fimSemPassada), null, col.cashbarberProfissionalId),
            ]);
            const calcFat = (rel: any) => {
              const svcs = rel.servicos.filter((s: any) => !EXCL_SVC.test(s.ser_nome ?? ''));
              const prds = rel.produtos.filter((p: any) => !EXCL_PRD.test(p.pro_nome ?? ''));
              const totalServicos = svcs.reduce((a: number, s: any) => a + (s.sum ?? 0), 0);
              const totalProdutos = prds.reduce((a: number, p: any) => a + (p.total ?? 0), 0);
              return { totalServicos, totalProdutos, totalGeral: totalServicos + totalProdutos,
                qtdServicos: svcs.reduce((a: number, s: any) => a + (Number(s.count) || 0), 0),
                qtdProdutos: prds.reduce((a: number, p: any) => a + (Number(p.count) || 0), 0) };
            };
            fatSemAtual = calcFat(relSemA);
            fatSemPassada = calcFat(relSemP);
          }
        } catch { /* silencia erros de API */ }
      }

      // Variações
      const varMensal = fatMesAnt?.totalGeral
        ? Math.round((((fatMesAtual?.totalGeral ?? 0) - fatMesAnt.totalGeral) / fatMesAnt.totalGeral) * 100)
        : null;
      const varSemanal = fatSemPassada.totalGeral
        ? Math.round(((fatSemAtual.totalGeral - fatSemPassada.totalGeral) / fatSemPassada.totalGeral) * 100)
        : null;
      const varPosicao = (posicaoMesAtual && posicaoMesAnt) ? posicaoMesAnt - posicaoMesAtual : null;

      // Insights
      const insights: Array<{ tipo: 'positivo' | 'atencao' | 'neutro'; titulo: string; descricao: string; estrategia: string }> = [];

      if (varMensal !== null) {
        if (varMensal >= 10) {
          insights.push({ tipo: 'positivo', titulo: `📈 Crescimento de ${varMensal}% vs mês passado`,
            descricao: `Você faturou R$ ${(fatMesAtual?.totalGeral ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês contra R$ ${fatMesAnt!.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no mês anterior.`,
            estrategia: 'Continue o ritmo! Foque em fidelizar os clientes que voltaram este mês e ofereça serviços complementares (barba + sobrancelha, por exemplo).' });
        } else if (varMensal >= 0) {
          insights.push({ tipo: 'neutro', titulo: `➡️ Estável: +${varMensal}% vs mês passado`,
            descricao: `Faturamento praticamente igual ao mês anterior. Variação de ${varMensal}%.`,
            estrategia: 'Para crescer, tente aumentar o ticket médio por cliente: ofereça um serviço adicional em cada atendimento (hidratação, depilação de nariz/orelha).' });
        } else {
          insights.push({ tipo: 'atencao', titulo: `📉 Queda de ${Math.abs(varMensal)}% vs mês passado`,
            descricao: `Faturamento caiu de R$ ${fatMesAnt!.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} para R$ ${(fatMesAtual?.totalGeral ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} este mês.`,
            estrategia: 'Revise sua agenda: há horários vagos que poderiam ser preenchidos? Ative clientes que não voltaram há mais de 30 dias via WhatsApp.' });
        }
      }

      if (varSemanal !== null) {
        if (varSemanal >= 15) {
          insights.push({ tipo: 'positivo', titulo: `🔥 Semana forte: +${varSemanal}% vs semana passada`,
            descricao: `Esta semana: R$ ${fatSemAtual.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Semana passada: R$ ${fatSemPassada.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            estrategia: 'Ótimo ritmo! Mantenha a consistência nos próximos dias para garantir um mês acima da meta.' });
        } else if (varSemanal < -10) {
          insights.push({ tipo: 'atencao', titulo: `⚠️ Semana fraca: ${varSemanal}% vs semana passada`,
            descricao: `Esta semana: R$ ${fatSemAtual.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Semana passada: R$ ${fatSemPassada.totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
            estrategia: 'Semana abaixo do esperado. Tente preencher os horários restantes e foque em serviços de maior valor agregado.' });
        }
      }

      if (fatMesAtual) {
        const pctProd = fatMesAtual.totalGeral > 0 ? Math.round((fatMesAtual.totalProdutos / fatMesAtual.totalGeral) * 100) : 0;
        if (pctProd < 15) {
          insights.push({ tipo: 'atencao', titulo: `🛒 Venda de produtos abaixo do potencial (${pctProd}%)`,
            descricao: `Apenas ${pctProd}% do seu faturamento vem de produtos. A média ideal é 20–25%.`,
            estrategia: 'Ao finalizar cada atendimento, apresente 1 produto relacionado ao serviço realizado. Ex: pós-barba para quem fez barba, pomada para quem fez corte.' });
        } else if (pctProd >= 25) {
          insights.push({ tipo: 'positivo', titulo: `🛒 Excelente venda de produtos (${pctProd}%)`,
            descricao: `${pctProd}% do seu faturamento vem de produtos — acima da média da equipe.`,
            estrategia: 'Mantenha o foco em produtos para sustentar esse diferencial competitivo.' });
        }
      }

      if (varPosicao !== null && posicaoMesAtual) {
        if (varPosicao > 0) {
          insights.push({ tipo: 'positivo', titulo: `🏆 Subiu ${varPosicao} posição(ões) no ranking`,
            descricao: `Você estava em ${posicaoMesAnt}º e agora está em ${posicaoMesAtual}º no ranking mensal.`,
            estrategia: 'Ótima evolução! Para continuar subindo, foque nos dias de menor movimento para não perder faturamento.' });
        } else if (varPosicao < 0) {
          insights.push({ tipo: 'atencao', titulo: `📊 Caiu ${Math.abs(varPosicao)} posição(ões) no ranking`,
            descricao: `Você estava em ${posicaoMesAnt}º e agora está em ${posicaoMesAtual}º no ranking mensal.`,
            estrategia: 'Analise quais colegas subiram à sua frente e identifique em quais serviços eles estão se destacando.' });
        }
      }

      const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
      const diaAtual = now.getDate();
      const diasRestantes = diasNoMes - diaAtual;
      const mediaDiaria = diaAtual > 0 ? (fatMesAtual?.totalGeral ?? 0) / diaAtual : 0;
      const projecaoFinal = (fatMesAtual?.totalGeral ?? 0) + mediaDiaria * diasRestantes;

      return {
        mesAtual: { mes: mesAtual, ano: anoAtual,
          totalServicos: fatMesAtual?.totalServicos ?? 0,
          totalProdutos: fatMesAtual?.totalProdutos ?? 0,
          totalGeral: fatMesAtual?.totalGeral ?? 0,
          qtdServicos: fatMesAtual?.qtdServicos ?? 0,
          posicao: posicaoMesAtual },
        mesAnterior: { mes: mesAnterior, ano: anoAnterior,
          totalServicos: fatMesAnt?.totalServicos ?? 0,
          totalProdutos: fatMesAnt?.totalProdutos ?? 0,
          totalGeral: fatMesAnt?.totalGeral ?? 0,
          qtdServicos: fatMesAnt?.qtdServicos ?? 0,
          posicao: posicaoMesAnt },
        semanaAtual: fatSemAtual,
        semanaPassada: fatSemPassada,
        variacaoMensal: varMensal,
        variacaoSemanal: varSemanal,
        variacaoPosicao: varPosicao,
        posicaoAtual: posicaoMesAtual,
        diasRestantes,
        mediaDiaria: Math.round(mediaDiaria * 100) / 100,
        projecaoFinal: Math.round(projecaoFinal * 100) / 100,
        insights,
        metaMensal: col?.metaMensal ? parseFloat(String(col.metaMensal)) : null,
      };
    }),

  // ─── Histórico de desempenho dos últimos 6 meses por profissional ────────────────
  desempenhoHistorico: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const now = new Date();
      // Gerar lista dos últimos 6 meses (incluindo o atual)
      const meses: Array<{ mes: number; ano: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }
      // Buscar dados de todos os meses em paralelo
      const resultados = await Promise.all(
        meses.map(({ mes, ano }) => listarRankingPorPeriodo(tenantId, mes, ano))
      );
      // Buscar dados do colaborador
      const colaboradoresList = await listarColaboradores(tenantId);
      const col = colaboradoresList.find((c) => c.id === input.profissionalId);
      // Montar histórico
      const historico = meses.map(({ mes, ano }, idx) => {
        const { itens } = resultados[idx];
        const meuFat = itens.find((i) => i.colaboradorId === input.profissionalId);
        // Ranking apenas da mesma empresa (para posicionamento correto)
        const mesmaEmpresa = col?.empresaSlug
          ? itens.filter((i) => i.empresaSlug === col.empresaSlug)
          : itens;
        const rankingOrdenado = [...mesmaEmpresa].sort((a, b) => b.totalGeral - a.totalGeral);
        const posicao = rankingOrdenado.findIndex((i) => i.colaboradorId === input.profissionalId) + 1 || null;
        return {
          mes,
          ano,
          totalGeral: meuFat?.totalGeral ?? 0,
          totalServicos: meuFat?.totalServicos ?? 0,
          totalProdutos: meuFat?.totalProdutos ?? 0,
          qtdServicos: meuFat?.qtdServicos ?? 0,
          qtdProdutos: meuFat?.qtdProdutos ?? 0,
          posicao,
          totalParticipantes: rankingOrdenado.length,
        };
      });
      // Calcular ticket médio e projeção do mês atual
      const mesAtualData = historico[historico.length - 1];
      const ticketMedio = mesAtualData.qtdServicos > 0
        ? Math.round((mesAtualData.totalServicos / mesAtualData.qtdServicos) * 100) / 100
        : 0;
      const diaAtual = now.getDate();
      const diasNoMes = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const diasRestantes = diasNoMes - diaAtual;
      const mediaDiaria = diaAtual > 0 ? mesAtualData.totalGeral / diaAtual : 0;
      const projecaoFinal = mesAtualData.totalGeral + mediaDiaria * diasRestantes;
      // Calcular falta para subir uma posição no ranking do mês atual
      const rankingMesAtual = resultados[resultados.length - 1];
      const mesmaEmpresaAtual = col?.empresaSlug
        ? rankingMesAtual.itens.filter((i) => i.empresaSlug === col!.empresaSlug)
        : rankingMesAtual.itens;
      const rankingOrdenadoAtual = [...mesmaEmpresaAtual].sort((a, b) => b.totalGeral - a.totalGeral);
      const minhaPosicaoIdx = rankingOrdenadoAtual.findIndex((i) => i.colaboradorId === input.profissionalId);
      const acimaDele = minhaPosicaoIdx > 0 ? rankingOrdenadoAtual[minhaPosicaoIdx - 1] : null;
      const faltaParaSubir = acimaDele
        ? Math.max(0, Math.round((acimaDele.totalGeral - mesAtualData.totalGeral + 0.01) * 100) / 100)
        : null;
      const nomeProximo = acimaDele?.nome ?? null;
      return {
        historico,
        metaMensal: col?.metaMensal ? parseFloat(String(col.metaMensal)) : null,
        empresaSlug: col?.empresaSlug ?? null,
        ticketMedio,
        projecaoFinal: Math.round(projecaoFinal * 100) / 100,
        diasRestantes,
        mediaDiaria: Math.round(mediaDiaria * 100) / 100,
        faltaParaSubir,
        nomeProximo,
      };
    }),
  avec: avecRouter,

  /** Painel de status unificado: CashBarber + Avec + D-Pote */
  syncPainel: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB n\u00e3o dispon\u00edvel" });
      const { desc, eq } = await import("drizzle-orm");
      const { cashbarberSyncLog, avecSyncLog, dpoteSyncLog } = await import("../drizzle/schema");

      const [cbLogs, avecLogs, dpoteLogs] = await Promise.all([
        db.select().from(cashbarberSyncLog).where(eq(cashbarberSyncLog.tenantId, tenantId)).orderBy(desc(cashbarberSyncLog.executadoEm)).limit(30),
        db.select().from(avecSyncLog).where(eq(avecSyncLog.tenantId, tenantId)).orderBy(desc(avecSyncLog.executadoEm)).limit(30),
        db.select().from(dpoteSyncLog).where(eq(dpoteSyncLog.tenantId, tenantId)).orderBy(desc(dpoteSyncLog.executadoEm)).limit(30),
      ]);

      const ultimoPorEmpresa = <T extends { empresaSlug: string }>(logs: T[]): T[] =>
        Object.values(logs.reduce((acc, log) => {
          const k = log.empresaSlug.toLowerCase();
          if (!acc[k]) acc[k] = log;
          return acc;
        }, {} as Record<string, T>));

      const jobsCashbarber = getStatusJobsCashbarber();
      const { getStatusJobAvec } = await import("./avecJob");
      const jobsAvec = getStatusJobAvec();

      return {
        cashbarber: { porEmpresa: ultimoPorEmpresa(cbLogs), recentes: cbLogs.slice(0, 15), jobs: jobsCashbarber },
        avec: { porEmpresa: ultimoPorEmpresa(avecLogs), recentes: avecLogs.slice(0, 15), jobs: jobsAvec },
        dpote: { porEmpresa: ultimoPorEmpresa(dpoteLogs), recentes: dpoteLogs.slice(0, 15) },
        agora: new Date(),
      };
    }),

    syncCashbarber: protectedProcedure.mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const configs = await listCashbarberConfigs(tenantId);
      const configsAtivas = configs.filter((c) => c.ativo === 1);
      if (configsAtivas.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com CashBarber configurado" });
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const resultados: Record<string, { ok: boolean; dias?: number; erro?: string }> = {};
      for (const config of configsAtivas) {
        try {
          const r = await sincronizarFaturamentoCashbarber(tenantId, config.empresaSlug, mes, ano, "manual");
          resultados[config.empresaSlug] = { ok: true, dias: r.diasSincronizados };
        } catch (err) {
          resultados[config.empresaSlug] = { ok: false, erro: err instanceof Error ? err.message : String(err) };
        }
      }
      try {
        const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
        await aplicarDpoteParaTenant(tenantId, mes, ano);
      } catch (err) {
        console.warn("[SyncPainel] Falha ao aplicar Dpote:", err);
      }
      return { ok: true, resultados };
    }),

    syncAvec: protectedProcedure.mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const { getDb } = await import("./db");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB n\u00e3o dispon\u00edvel" });
      const { avecConfig } = await import("../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const configs = await db.select().from(avecConfig).where(eq(avecConfig.tenantId, tenantId));
      if (configs.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma empresa com Avec configurado" });
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const { sincronizarFaturamentoAvec } = await import("./avecSincronizador");
      const resultados: Record<string, { ok: boolean; dias?: number; erro?: string }> = {};
      for (const config of configs) {
        try {
          const r = await sincronizarFaturamentoAvec(tenantId, config.empresaSlug, mes, ano, "manual");
          resultados[config.empresaSlug] = { ok: true, dias: r.diasSincronizados };
        } catch (err) {
          resultados[config.empresaSlug] = { ok: false, erro: err instanceof Error ? err.message : String(err) };
        }
      }
      return { ok: true, resultados };
    }),

    syncDpote: protectedProcedure.mutation(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtx(ctx);
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
      await aplicarDpoteParaTenant(tenantId, mes, ano);
      return { ok: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
