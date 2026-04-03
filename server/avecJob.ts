/**
 * Job automático de sincronização do Avec
 *
 * Executa diariamente às 23h (horário de Brasília = 02:00 UTC do dia seguinte)
 * para sincronizar o faturamento da Seraphine via Relatório 0184.
 * Só sincroniza empresas com sincAutoAtiva = 1.
 */

import { sincronizarFaturamentoAvec } from "./avecSincronizador";
import { getDb } from "./db";
import * as cron from "node-cron";

// ─── Estado do job ────────────────────────────────────────────────────────────

let _cronTask: cron.ScheduledTask | null = null;
let _ultimaExecucao: Date | null = null;
let _proximaExecucao: Date | null = null;
let _statusJob: "idle" | "running" | "error" = "idle";
let _ultimoErro: string | null = null;

export function getStatusJobAvec() {
  return {
    ativo: _cronTask !== null,
    ultimaExecucao: _ultimaExecucao,
    proximaExecucao: _proximaExecucao,
    status: _statusJob,
    ultimoErro: _ultimoErro,
  };
}

// ─── Buscar configs ativas ────────────────────────────────────────────────────

async function listarConfigsAvecAtivas() {
  const db = await getDb();
  if (!db) return [];
  const { avecConfig } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  return db
    .select()
    .from(avecConfig)
    .where(eq(avecConfig.sincAutoAtiva, 1));
}

// ─── Execução do job ──────────────────────────────────────────────────────────

async function executarSyncAvec() {
  if (_statusJob === "running") {
    console.log("[Avec Job] Sync já em andamento, pulando execução.");
    return;
  }

  _statusJob = "running";
  _ultimaExecucao = new Date();
  console.log(`[Avec Job] Iniciando sync automático às ${_ultimaExecucao.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}`);

  try {
    const configs = await listarConfigsAtivas();
    if (configs.length === 0) {
      console.log("[Avec Job] Nenhuma empresa com sync automático ativo.");
      _statusJob = "idle";
      return;
    }

    // Usar horário de Brasília para determinar o mês/ano correto
    const agora = new Date();
    const agoraBRT = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const mes = agoraBRT.getMonth() + 1;
    const ano = agoraBRT.getFullYear();

    for (const config of configs) {
      try {
        console.log(`[Avec Job] Sincronizando ${config.empresaSlug} (tenant ${config.tenantId}) para ${mes}/${ano}...`);
        const resultado = await sincronizarFaturamentoAvec(
          config.tenantId,
          config.empresaSlug,
          mes,
          ano,
          "automatico"
        );
        console.log(
          `[Avec Job] ${config.empresaSlug}: ${resultado.diasSincronizados} dias sincronizados, ` +
          `${resultado.diasFechados} fechados, ${resultado.diasIgnorados} ignorados`
        );

        // Notificar owner sobre sincronização bem-sucedida (apenas se sincronizou algo)
        if (resultado.diasSincronizados > 0) {
          try {
            const { notifyOwner } = await import("./_core/notification");
            await notifyOwner({
              title: `✅ Sync Avec - ${config.empresaSlug}`,
              content: `Sincronização automática concluída para ${mes}/${ano}:\n` +
                `• ${resultado.diasSincronizados} dia(s) sincronizado(s)\n` +
                `• ${resultado.diasFechados} dia(s) sem movimento\n` +
                `• ${resultado.diasIgnorados} dia(s) ignorado(s)`,
            });
          } catch { /* silenciar notificação */ }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Avec Job] Erro ao sincronizar ${config.empresaSlug}:`, msg);
        _ultimoErro = msg;
      }
    }

    _statusJob = "idle";
    _ultimoErro = null;

    // Calcular próxima execução (amanhã às 23h BRT)
    const amanha = new Date(agoraBRT);
    amanha.setDate(amanha.getDate() + 1);
    amanha.setHours(23, 0, 0, 0);
    _proximaExecucao = amanha;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Avec Job] Erro crítico no job:", msg);
    _statusJob = "error";
    _ultimoErro = msg;

    // Notificar owner em caso de erro crítico
    try {
      const { notifyOwner } = await import("./_core/notification");
      await notifyOwner({
        title: "🔴 Falha no Sync Avec",
        content: `O job automático de sincronização do Avec falhou:\n\n${msg}`,
      });
    } catch { /* silenciar */ }
  }
}

async function listarConfigsAtivas() {
  try {
    return await listarConfigsAvecAtivas();
  } catch {
    return [];
  }
}

// ─── Inicialização do job ─────────────────────────────────────────────────────

/**
 * Inicializa o job de sincronização do Avec.
 * Agenda execução diária às 23h (horário de Brasília = 02:00 UTC).
 * Cron: "0 0 2 * * *" = todo dia às 02:00 UTC = 23:00 BRT
 */
export function iniciarJobAvec() {
  if (_cronTask) {
    console.log("[Avec Job] Job já está ativo.");
    return;
  }

  // Cron: segundos minutos horas dia mês dia-semana
  // 0 0 2 * * * = todo dia às 02:00 UTC = 23:00 BRT (UTC-3)
  const CRON_EXPR = "0 0 2 * * *";

  console.log(`[Avec Job] Iniciando job de sync automático (cron: ${CRON_EXPR} UTC = 23:00 BRT)`);

  // Calcular próxima execução
  const agora = new Date();
  const proxima = new Date(agora);
  proxima.setUTCHours(2, 0, 0, 0);
  if (proxima <= agora) {
    proxima.setUTCDate(proxima.getUTCDate() + 1);
  }
  _proximaExecucao = proxima;

  _cronTask = cron.schedule(CRON_EXPR, async () => {
    await executarSyncAvec();
  }, { timezone: "UTC" });

  console.log(`[Avec Job] Job agendado. Próxima execução: ${_proximaExecucao.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} BRT`);
}

export function pararJobAvec() {
  if (_cronTask) {
    _cronTask.stop();
    _cronTask = null;
    _proximaExecucao = null;
    console.log("[Avec Job] Job parado.");
  }
}

export function recarregarJobAvec() {
  pararJobAvec();
  iniciarJobAvec();
}

/**
 * Executa o sync manualmente (para testes ou sincronização sob demanda).
 */
export async function executarSyncAvecManual() {
  return executarSyncAvec();
}
