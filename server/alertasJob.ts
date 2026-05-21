/**
 * alertasJob.ts
 *
 * Alertas Proativos Automáticos para o Meta Dashboard.
 *
 * Alerta 1 — Ritmo Insuficiente (08h, seg–sáb)
 *   Notifica quando a média dos últimos 3 dias de uma unidade está abaixo
 *   de 85% do ritmo necessário para bater a meta mensal.
 *
 * Alerta 2 — Dia Sem Lançamento (20h, seg–sáb)
 *   Notifica quando uma unidade não tem faturamento operacional lançado
 *   para o dia atual.
 *
 * Alerta 3 — Queda Brusca (chamado após cada sync do CashBarber)
 *   Notifica quando o faturamento de um dia cai mais de 30% em relação
 *   à média histórica do mesmo dia da semana (últimas 4 semanas).
 */

import * as cron from "node-cron";
import {
  getDb,
  getEmpresasByTenant,
  getMetasByMesAndTenant,
  getAllFaturamentosByTenant,
  getFaturamentoByDataEmpresaTenant,
  getAllTenants,
  eventoJaNotificado,
  registrarEventoNotificado,
} from "./db";
import { notifyOwner } from "./_core/notification";
import { faturamentos } from "../drizzle/schema";
import { and, eq, lt, gte } from "drizzle-orm";

// ─── Estado ───────────────────────────────────────────────────────────────────
let _jobRitmo: cron.ScheduledTask | null = null;
let _jobSemLancamento: cron.ScheduledTask | null = null;

// ─── Formatação ───────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const DIAS_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// ─── Helpers de soma de categorias ───────────────────────────────────────────

/** Soma todas as categorias (cat1..cat9) de um registro de faturamento */
function somarCats(f: {
  cat1: string | number | null;
  cat2: string | number | null;
  cat3: string | number | null;
  cat4: string | number | null;
  cat5: string | number | null;
  cat6: string | number | null;
  cat7: string | number | null;
  cat8: string | number | null;
  cat9: string | number | null;
}): number {
  return (
    (Number(f.cat1) || 0) +
    (Number(f.cat2) || 0) +
    (Number(f.cat3) || 0) +
    (Number(f.cat4) || 0) +
    (Number(f.cat5) || 0) +
    (Number(f.cat6) || 0) +
    (Number(f.cat7) || 0) +
    (Number(f.cat8) || 0) +
    (Number(f.cat9) || 0)
  );
}

/** Soma apenas categorias operacionais (cat1..cat8), excluindo recorrência (cat9) */
function somarCatsOperacionais(f: {
  cat1: string | number | null;
  cat2: string | number | null;
  cat3: string | number | null;
  cat4: string | number | null;
  cat5: string | number | null;
  cat6: string | number | null;
  cat7: string | number | null;
  cat8: string | number | null;
}): number {
  return (
    (Number(f.cat1) || 0) +
    (Number(f.cat2) || 0) +
    (Number(f.cat3) || 0) +
    (Number(f.cat4) || 0) +
    (Number(f.cat5) || 0) +
    (Number(f.cat6) || 0) +
    (Number(f.cat7) || 0) +
    (Number(f.cat8) || 0)
  );
}

// ─── Alerta 1: Ritmo Insuficiente ─────────────────────────────────────────────

/**
 * Verifica se o ritmo de faturamento dos últimos 3 dias de cada unidade
 * é suficiente para bater a meta mensal. Notifica se estiver abaixo de 85%.
 */
async function verificarRitmoInsuficiente(tenantId: number): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const diaHoje = agora.getDate();
  const diasNoMes = new Date(ano, mes, 0).getDate();

  const [empresas, metasList, faturamentosMes] = await Promise.all([
    getEmpresasByTenant(tenantId),
    getMetasByMesAndTenant(tenantId, mes, ano),
    getAllFaturamentosByTenant(tenantId, mes, ano),
  ]);

  for (const empresa of empresas) {
    try {
      const meta = metasList.find((m) => m.empresaSlug === empresa.slug);
      if (!meta || Number(meta.metaMensal) <= 0) continue;

      const metaMensal = Number(meta.metaMensal);
      const diasUteis = Number(meta.diasUteis) || 26;

      // Total acumulado no mês (cat1..cat9)
      const fatEmpresa = faturamentosMes.filter((f) => f.empresaSlug === empresa.slug);
      const totalAcumulado = fatEmpresa.reduce((acc, f) => acc + somarCats(f), 0);

      // Dias úteis decorridos (proporcional ao calendário)
      const diasUteisDecorridos = Math.min(
        diasUteis,
        Math.round((diaHoje / diasNoMes) * diasUteis)
      );
      const diasRestantes = Math.max(1, diasUteis - diasUteisDecorridos);

      // Ritmo necessário para bater a meta
      const faltaParaMeta = Math.max(0, metaMensal - totalAcumulado);
      const mediaNecessaria = faltaParaMeta / diasRestantes;

      // Se já bateu a meta, não precisa alertar
      if (totalAcumulado >= metaMensal) continue;

      // Média dos últimos 3 dias com faturamento operacional real (cat1..cat8 > 0)
      const diasComFat = fatEmpresa
        .filter((f) => somarCatsOperacionais(f) > 0)
        .sort((a, b) => b.data.localeCompare(a.data))
        .slice(0, 3);

      // Dados insuficientes para calcular tendência
      if (diasComFat.length < 2) continue;

      const mediaUltimos3 =
        diasComFat.reduce((acc, f) => acc + somarCats(f), 0) / diasComFat.length;

      // Alerta apenas se ritmo atual < 85% do necessário
      if (mediaUltimos3 >= mediaNecessaria * 0.85) continue;

      const chave = `ritmo_insuficiente:${empresa.slug}:${ano}-${String(mes).padStart(2, "0")}-${String(diaHoje).padStart(2, "0")}`;
      const jaNotificou = await eventoJaNotificado(tenantId, chave);
      if (jaNotificou) continue;

      const pctRitmo = Math.round((mediaUltimos3 / mediaNecessaria) * 100);
      const conteudo =
        `📊 Ritmo atual (média ${diasComFat.length}d): ${fmtBRL(mediaUltimos3)}/dia\n` +
        `🎯 Necessário para bater a meta: ${fmtBRL(mediaNecessaria)}/dia\n` +
        `📉 Ritmo atual é ${pctRitmo}% do necessário\n` +
        `💰 Falta para a meta: ${fmtBRL(faltaParaMeta)}\n` +
        `📅 Dias úteis restantes: ${diasRestantes}`;

      const enviado = await notifyOwner({
        title: `⚠️ Ritmo insuficiente — ${empresa.nome}`,
        content: conteudo,
      });

      if (enviado) {
        await registrarEventoNotificado(
          tenantId,
          chave,
          "meta_diaria_atingida",
          empresa.slug,
          conteudo
        );
        console.log(`[Alertas] Ritmo insuficiente notificado para ${empresa.slug} (${pctRitmo}% do necessário)`);
      }
    } catch (err) {
      console.warn(`[Alertas] Erro ao verificar ritmo de ${empresa.slug}:`, err);
    }
  }
}

// ─── Alerta 2: Dia Sem Lançamento ─────────────────────────────────────────────

/**
 * Verifica se cada unidade tem faturamento operacional lançado para o dia atual.
 * Notifica às 20h quando não há lançamento.
 */
async function verificarDiaSemLancamento(tenantId: number): Promise<void> {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = agora.getMonth() + 1;
  const dia = agora.getDate();
  const dataHoje = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

  // Não alertar aos domingos (unidades fechadas)
  const diaSemana = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay();
  if (diaSemana === 0) return;

  const empresas = await getEmpresasByTenant(tenantId);

  for (const empresa of empresas) {
    try {
      const fatHoje = await getFaturamentoByDataEmpresaTenant(dataHoje, empresa.slug, tenantId);
      const temLancamento = fatHoje && somarCatsOperacionais(fatHoje) > 0;

      if (temLancamento) continue;

      const chave = `sem_lancamento:${empresa.slug}:${dataHoje}`;
      const jaNotificou = await eventoJaNotificado(tenantId, chave);
      if (jaNotificou) continue;

      const nomeDia = DIAS_PT[diaSemana];
      const conteudo =
        `📋 A unidade ${empresa.nome} não tem faturamento lançado para hoje (${nomeDia}, ${dia}/${mes}/${ano}).\n` +
        `Verifique se o dia foi operacional e faça o lançamento no dashboard.`;

      const enviado = await notifyOwner({
        title: `📋 Sem lançamento hoje — ${empresa.nome}`,
        content: conteudo,
      });

      if (enviado) {
        await registrarEventoNotificado(
          tenantId,
          chave,
          "meta_diaria_atingida",
          empresa.slug,
          conteudo
        );
        console.log(`[Alertas] Sem lançamento notificado para ${empresa.slug} em ${dataHoje}`);
      }
    } catch (err) {
      console.warn(`[Alertas] Erro ao verificar lançamento de ${empresa.slug}:`, err);
    }
  }
}

// ─── Alerta 3: Queda Brusca ───────────────────────────────────────────────────

/**
 * Verifica se o faturamento de um dia específico caiu mais de 30% em relação
 * à média histórica do mesmo dia da semana (últimas 4 ocorrências).
 *
 * Chamado externamente após cada sincronização do CashBarber.
 */
export async function verificarQuedaBrusca(
  tenantId: number,
  empresaSlug: string,
  dataSync: string // formato "YYYY-MM-DD"
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const fatHoje = await getFaturamentoByDataEmpresaTenant(dataSync, empresaSlug, tenantId);
    if (!fatHoje) return;

    const totalHoje = somarCats(fatHoje);
    // Só verificar se há faturamento operacional real no dia
    if (somarCatsOperacionais(fatHoje) <= 0) return;

    const dataObj = new Date(dataSync + "T12:00:00");
    const diaSemana = dataObj.getDay();

    // Buscar os últimos 4 registros do mesmo dia da semana (excluindo o dia atual)
    // Janela de busca: 28 dias para trás (4 semanas)
    const dataLimite = new Date(dataObj);
    dataLimite.setDate(dataLimite.getDate() - 35); // 5 semanas de margem
    const dataLimiteStr = dataLimite.toISOString().split("T")[0];

    const historico = await db
      .select()
      .from(faturamentos)
      .where(
        and(
          eq(faturamentos.tenantId, tenantId),
          eq(faturamentos.empresaSlug, empresaSlug),
          lt(faturamentos.data, dataSync),
          gte(faturamentos.data, dataLimiteStr)
        )
      );

    // Filtrar apenas os dias do mesmo dia da semana com faturamento operacional real
    const diasMesmoDiaSemana = historico
      .filter((f) => {
        const d = new Date(f.data + "T12:00:00");
        return d.getDay() === diaSemana && somarCatsOperacionais(f) > 0;
      })
      .sort((a, b) => b.data.localeCompare(a.data))
      .slice(0, 4);

    // Dados insuficientes para comparar
    if (diasMesmoDiaSemana.length < 2) return;

    const mediaHistorica =
      diasMesmoDiaSemana.reduce((acc, f) => acc + somarCats(f), 0) /
      diasMesmoDiaSemana.length;

    // Alerta se hoje < 70% da média histórica do mesmo dia da semana
    if (totalHoje >= mediaHistorica * 0.70) return;

    const chave = `queda_brusca:${empresaSlug}:${dataSync}`;
    const jaNotificou = await eventoJaNotificado(tenantId, chave);
    if (jaNotificou) return;

    const nomeDia = DIAS_PT[diaSemana];
    const pctQueda = Math.round((1 - totalHoje / mediaHistorica) * 100);
    const [ano, mes, dia] = dataSync.split("-");

    // Buscar nome da empresa
    const empresas = await getEmpresasByTenant(tenantId);
    const empresa = empresas.find((e) => e.slug === empresaSlug);
    const nomeEmpresa = empresa?.nome ?? empresaSlug;

    const conteudo =
      `📉 Faturamento de hoje (${nomeDia} ${dia}/${mes}/${ano}): ${fmtBRL(totalHoje)}\n` +
      `📊 Média das últimas ${diasMesmoDiaSemana.length} ${nomeDia}s: ${fmtBRL(mediaHistorica)}\n` +
      `⬇️ Queda de ${pctQueda}% abaixo do esperado para ${nomeDia}\n` +
      `🔍 Verifique se houve problema operacional ou baixo movimento.`;

    const enviado = await notifyOwner({
      title: `📉 Queda brusca — ${nomeEmpresa}`,
      content: conteudo,
    });

    if (enviado) {
      await registrarEventoNotificado(
        tenantId,
        chave,
        "meta_diaria_atingida",
        empresaSlug,
        conteudo
      );
      console.log(`[Alertas] Queda brusca notificada para ${empresaSlug} em ${dataSync} (${pctQueda}% abaixo da média)`);
    }
  } catch (err) {
    console.warn(`[Alertas] Erro ao verificar queda brusca de ${empresaSlug}:`, err);
  }
}

// ─── Inicialização dos jobs ───────────────────────────────────────────────────

/**
 * Inicia os jobs de alerta automático.
 * - Alerta de ritmo insuficiente: 08h, seg–sáb (horário de Brasília)
 * - Alerta de dia sem lançamento: 20h, seg–sáb (horário de Brasília)
 */
export function iniciarAlertasJob(): void {
  if (_jobRitmo || _jobSemLancamento) {
    console.log("[Alertas Job] Jobs já estão ativos.");
    return;
  }

  // Job de ritmo insuficiente: 08h, seg–sáb
  _jobRitmo = cron.schedule(
    "0 8 * * 1-6",
    async () => {
      console.log("[Alertas Job] Verificando ritmo de faturamento...");
      try {
        const tenants = await getAllTenants();
        for (const tenant of tenants) {
          await verificarRitmoInsuficiente(tenant.id);
        }
      } catch (err) {
        console.error("[Alertas Job] Erro no job de ritmo:", err);
      }
    },
    { timezone: "America/Sao_Paulo" }
  );

  // Job de dia sem lançamento: 20h, seg–sáb
  _jobSemLancamento = cron.schedule(
    "0 20 * * 1-6",
    async () => {
      console.log("[Alertas Job] Verificando lançamentos do dia...");
      try {
        const tenants = await getAllTenants();
        for (const tenant of tenants) {
          await verificarDiaSemLancamento(tenant.id);
        }
      } catch (err) {
        console.error("[Alertas Job] Erro no job de lançamento:", err);
      }
    },
    { timezone: "America/Sao_Paulo" }
  );

  console.log("[Alertas Job] Jobs iniciados: ritmo (08h) e sem lançamento (20h), seg–sáb BRT");
}

export function pararAlertasJob(): void {
  if (_jobRitmo) { _jobRitmo.stop(); _jobRitmo = null; }
  if (_jobSemLancamento) { _jobSemLancamento.stop(); _jobSemLancamento = null; }
  console.log("[Alertas Job] Jobs parados.");
}
