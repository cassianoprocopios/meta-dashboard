/**
 * performanceRouter.ts
 * Ferramentas de performance para gerentes e profissionais:
 * - metaDiariaDinamica: meta diária necessária + projeção do mês
 * - alertasPerformance: semáforo verde/amarelo/vermelho por profissional para gerentes
 * - padraoSemanal: análise de faturamento médio por dia da semana (baseado em dados mensais)
 */
import { z } from "zod";
import { router, publicProcedure } from "./_core/trpc";
import { getDb, listarColaboradores, listarRankingPorPeriodo } from "./db";
import { gerarMensagensRankingDiario, gerarRankingSemanal } from "./performanceNotifJob";

// Tenant fixo para uso público (igual ao padrão do routers.ts)
async function getTenantIdFromCtxPublic(_ctx: unknown): Promise<number> {
  return 1;
}

export const performanceRouter = router({
  // ─── Ferramenta 1: Meta diária dinâmica por profissional ─────────────────────
  metaDiariaDinamica: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const db = await getDb();
      if (!db) return null;
      const { faturamentoColaboradores: fatCol, colaboradores: colTable } = await import(
        "../drizzle/schema.js"
      );
      const { and: drAnd, eq: drEq } = await import("drizzle-orm");
      const now = new Date();
      const mes = now.getMonth() + 1;
      const ano = now.getFullYear();
      const diaAtual = now.getDate();
      const diasNoMes = new Date(ano, mes, 0).getDate();

      // Buscar dados do colaborador
      const [col] = await db
        .select()
        .from(colTable)
        .where(drAnd(drEq(colTable.id, input.profissionalId), drEq(colTable.tenantId, tenantId)))
        .limit(1);
      if (!col) return null;

      const metaMensal = col.metaMensal ? parseFloat(String(col.metaMensal)) : null;

      // Buscar faturamento acumulado do mês atual
      const [fatMes] = await db
        .select()
        .from(fatCol)
        .where(
          drAnd(
            drEq(fatCol.tenantId, tenantId),
            drEq(fatCol.colaboradorId, input.profissionalId),
            drEq(fatCol.mes, mes),
            drEq(fatCol.ano, ano)
          )
        )
        .limit(1);

      const totalAcumulado = fatMes ? parseFloat(String(fatMes.totalGeral)) : 0;
      const totalServicos = fatMes ? parseFloat(String(fatMes.totalServicos)) : 0;
      const totalProdutos = fatMes ? parseFloat(String(fatMes.totalProdutos)) : 0;
      const qtdServicos = fatMes?.qtdServicos ?? 0;

      // Buscar histórico dos últimos 3 meses para tendência
      const mesesHistorico: Array<{ mes: number; ano: number }> = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(ano, mes - 1 - i, 1);
        mesesHistorico.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }
      const historico = await Promise.all(
        mesesHistorico.map(async ({ mes: m, ano: a }) => {
          const [fat] = await db
            .select()
            .from(fatCol)
            .where(
              drAnd(
                drEq(fatCol.tenantId, tenantId),
                drEq(fatCol.colaboradorId, input.profissionalId),
                drEq(fatCol.mes, m),
                drEq(fatCol.ano, a)
              )
            )
            .limit(1);
          return {
            mes: m,
            ano: a,
            total: fat ? parseFloat(String(fat.totalGeral)) : 0,
          };
        })
      );

      // Calcular métricas
      const diasRestantes = Math.max(0, diasNoMes - diaAtual);
      const faltaMeta = metaMensal != null ? Math.max(0, metaMensal - totalAcumulado) : null;
      const metaDiariaNecessaria =
        faltaMeta != null && diasRestantes > 0
          ? Math.round((faltaMeta / diasRestantes) * 100) / 100
          : null;
      const metaDiariaOriginal =
        metaMensal != null ? Math.round((metaMensal / diasNoMes) * 100) / 100 : null;
      const mediaDiariaAtual =
        diaAtual > 0 ? Math.round((totalAcumulado / diaAtual) * 100) / 100 : 0;
      const projecaoFinal = Math.round(
        (totalAcumulado + mediaDiariaAtual * diasRestantes) * 100
      ) / 100;
      const pctMeta =
        metaMensal && metaMensal > 0
          ? Math.round((totalAcumulado / metaMensal) * 100)
          : null;
      const pctProjecao =
        metaMensal && metaMensal > 0
          ? Math.round((projecaoFinal / metaMensal) * 100)
          : null;

      // Ticket médio
      const ticketMedio = qtdServicos > 0 ? Math.round((totalServicos / qtdServicos) * 100) / 100 : 0;

      return {
        profissionalId: input.profissionalId,
        nome: col.nome,
        apelido: col.apelido,
        metaMensal,
        totalAcumulado,
        totalServicos,
        totalProdutos,
        qtdServicos,
        faltaMeta,
        pctMeta,
        pctProjecao,
        diasRestantes,
        diasNoMes,
        diaAtual,
        metaDiariaNecessaria,
        metaDiariaOriginal,
        mediaDiariaAtual,
        projecaoFinal,
        ticketMedio,
        historico,
        empresaSlug: col.empresaSlug,
      };
    }),

  // ─── Ferramenta 2: Alertas de performance para gerentes (semáforo) ───────────
  alertasPerformance: publicProcedure
    .input(
      z.object({
        empresaSlug: z.string(),
        mes: z.number().int().optional(),
        ano: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const db = await getDb();
      if (!db) return { profissionais: [] };
      const { faturamentoColaboradores: fatCol, colaboradores: colTable } = await import(
        "../drizzle/schema.js"
      );
      const { and: drAnd, eq: drEq } = await import("drizzle-orm");
      const now = new Date();
      const mes = input.mes ?? now.getMonth() + 1;
      const ano = input.ano ?? now.getFullYear();
      const diaAtual = now.getDate();
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const diasRestantes = Math.max(0, diasNoMes - diaAtual);

      // Buscar colaboradores ativos da empresa
      const cols = await db
        .select()
        .from(colTable)
        .where(
          drAnd(
            drEq(colTable.tenantId, tenantId),
            drEq(colTable.empresaSlug, input.empresaSlug),
            drEq(colTable.ativo, 1),
            drEq(colTable.exibirNoRanking, 1)
          )
        );

      // Buscar faturamentos do mês para todos os colaboradores da empresa
      const faturamentos = await db
        .select()
        .from(fatCol)
        .where(
          drAnd(
            drEq(fatCol.tenantId, tenantId),
            drEq(fatCol.mes, mes),
            drEq(fatCol.ano, ano)
          )
        );

      const profissionais = cols
        .filter((c: any) => !c.isGerencia)
        .map((c: any) => {
          const fat = faturamentos.find((f: any) => f.colaboradorId === c.id);
          const totalAcumulado = fat ? parseFloat(String(fat.totalGeral)) : 0;
          const metaMensal = c.metaMensal ? parseFloat(String(c.metaMensal)) : null;
          const faltaMeta =
            metaMensal != null ? Math.max(0, metaMensal - totalAcumulado) : null;
          const mediaDiaria = diaAtual > 0 ? totalAcumulado / diaAtual : 0;
          const projecaoFinal = totalAcumulado + mediaDiaria * diasRestantes;
          const pctMeta =
            metaMensal && metaMensal > 0
              ? Math.round((totalAcumulado / metaMensal) * 100)
              : null;
          const pctProjecao =
            metaMensal && metaMensal > 0
              ? Math.round((projecaoFinal / metaMensal) * 100)
              : null;

          // Semáforo: verde >= 90% projeção, amarelo 70-89%, vermelho < 70%
          const semaforo: "verde" | "amarelo" | "vermelho" =
            pctProjecao == null
              ? "amarelo"
              : pctProjecao >= 90
              ? "verde"
              : pctProjecao >= 70
              ? "amarelo"
              : "vermelho";

          const metaDiariaNecessaria =
            faltaMeta != null && diasRestantes > 0
              ? Math.round((faltaMeta / diasRestantes) * 100) / 100
              : null;

          return {
            id: c.id,
            nome: c.nome,
            apelido: c.apelido,
            cargo: c.cargo,
            categoriaRanking: c.categoriaRanking,
            metaMensal,
            totalAcumulado,
            faltaMeta,
            pctMeta,
            pctProjecao,
            projecaoFinal: Math.round(projecaoFinal * 100) / 100,
            mediaDiaria: Math.round(mediaDiaria * 100) / 100,
            metaDiariaNecessaria,
            semaforo,
            diasRestantes,
          };
        })
        .sort((a: any, b: any) => {
          const ordem: Record<string, number> = { vermelho: 0, amarelo: 1, verde: 2 };
          return (
            ordem[a.semaforo] - ordem[b.semaforo] ||
            b.totalAcumulado - a.totalAcumulado
          );
        });

      return { profissionais, mes, ano, diaAtual, diasNoMes, diasRestantes };
    }),

  // ─── Ferramenta 3: Mensagens de ranking para WhatsApp (geradas às 12h) ─────────
  mensagensRankingWhatsApp: publicProcedure
    .input(z.object({
      appUrl: z.string().url().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const appUrl = input.appUrl ?? "https://barbiero.manus.space";
      const resultado = await gerarMensagensRankingDiario(tenantId, appUrl);
      return resultado;
    }),

  // ─── Ferramenta 4: Ranking semanal ───────────────────────────────────────────
  rankingSemanal: publicProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const resultado = await gerarRankingSemanal(tenantId);
      return resultado;
    }),

  // ─── Ferramenta 5: Análise de padrão por dia da semana ───────────────────────
  // Usa dados mensais dos últimos 6 meses para calcular médias por dia da semana
  padraoSemanal: publicProcedure
    .input(z.object({ profissionalId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const tenantId = await getTenantIdFromCtxPublic(ctx);
      const db = await getDb();
      if (!db) return null;
      const { faturamentoColaboradores: fatCol, colaboradores: colTable } = await import(
        "../drizzle/schema.js"
      );
      const { and: drAnd, eq: drEq } = await import("drizzle-orm");
      const now = new Date();

      // Buscar colaborador
      const [col] = await db
        .select()
        .from(colTable)
        .where(drAnd(drEq(colTable.id, input.profissionalId), drEq(colTable.tenantId, tenantId)))
        .limit(1);
      if (!col) return null;

      // Buscar últimos 6 meses de dados
      const meses: Array<{ mes: number; ano: number }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear() });
      }

      const dadosMensais = await Promise.all(
        meses.map(async ({ mes, ano }) => {
          const [fat] = await db
            .select()
            .from(fatCol)
            .where(
              drAnd(
                drEq(fatCol.tenantId, tenantId),
                drEq(fatCol.colaboradorId, input.profissionalId),
                drEq(fatCol.mes, mes),
                drEq(fatCol.ano, ano)
              )
            )
            .limit(1);
          return { mes, ano, total: fat ? parseFloat(String(fat.totalGeral)) : 0 };
        })
      );

      // Para o padrão semanal, usamos o ranking por período para obter dados semanais reais
      // Calculamos as últimas 12 semanas
      const semanas: Array<{ inicio: string; fim: string; diaSemana: number }> = [];
      for (let i = 11; i >= 0; i--) {
        const fimSemana = new Date(now);
        fimSemana.setDate(now.getDate() - i * 7);
        const inicioSemana = new Date(fimSemana);
        inicioSemana.setDate(fimSemana.getDate() - 6);
        semanas.push({
          inicio: inicioSemana.toISOString().slice(0, 10),
          fim: fimSemana.toISOString().slice(0, 10),
          diaSemana: fimSemana.getDay(),
        });
      }

      // Calcular média diária por mês e distribuir pelos dias da semana
      // Como não temos dados diários por profissional, estimamos com base na média mensal
      // e nos dias úteis de cada dia da semana no período
      const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
      const porDia: Record<number, { totalEstimado: number; meses: number }> = {};
      for (let i = 0; i < 7; i++) porDia[i] = { totalEstimado: 0, meses: 0 };

      for (const { mes, ano, total } of dadosMensais) {
        if (total === 0) continue;
        const diasNoMes = new Date(ano, mes, 0).getDate();
        const mediaDiaria = total / diasNoMes;

        // Contar quantas vezes cada dia da semana aparece neste mês
        const contadorDias: Record<number, number> = {};
        for (let i = 0; i < 7; i++) contadorDias[i] = 0;
        for (let d = 1; d <= diasNoMes; d++) {
          const dow = new Date(ano, mes - 1, d).getDay();
          contadorDias[dow]++;
        }

        for (let i = 0; i < 7; i++) {
          if (contadorDias[i] > 0) {
            porDia[i].totalEstimado += mediaDiaria * contadorDias[i];
            porDia[i].meses += contadorDias[i];
          }
        }
      }

      const resultado = diasSemana.map((nome, idx) => ({
        diaSemana: idx,
        nome,
        media:
          porDia[idx].meses > 0
            ? Math.round((porDia[idx].totalEstimado / porDia[idx].meses) * 100) / 100
            : 0,
        ocorrencias: porDia[idx].meses,
      }));

      const diasComDados = resultado.filter((d) => d.ocorrencias > 0);
      const mediaGeral =
        diasComDados.length > 0
          ? Math.round(
              (diasComDados.reduce((s, d) => s + d.media, 0) / diasComDados.length) * 100
            ) / 100
          : 0;

      const melhorDia =
        diasComDados.length > 0
          ? diasComDados.reduce((a, b) => (a.media > b.media ? a : b))
          : null;
      const piorDia =
        diasComDados.length > 0
          ? diasComDados.reduce((a, b) => (a.media < b.media ? a : b))
          : null;

      return {
        resultado,
        mediaGeral,
        melhorDia,
        piorDia,
        dadosMensais,
        nome: col.nome,
        apelido: col.apelido,
      };
    }),
});
