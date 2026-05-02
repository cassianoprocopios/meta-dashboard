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
  console.log(
    `[Avec Job] Iniciando sync automático às ${_ultimaExecucao.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}`
  );

  try {
    const configs = await listarConfigsAvecAtivas();
    if (configs.length === 0) {
      console.log("[Avec Job] Nenhuma empresa com sync automático ativo.");
      _statusJob = "idle";
      return;
    }

    // Usar horário de Brasília para determinar o mês/ano correto
    const agora = new Date();
    const agoraBRT = new Date(
      agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
    );
    const mes = agoraBRT.getMonth() + 1;
    const ano = agoraBRT.getFullYear();

    for (const config of configs) {
      try {
        console.log(
          `[Avec Job] Sincronizando ${config.empresaSlug} (tenant ${config.tenantId}) para ${mes}/${ano}...`
        );
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
        // Notificação ao owner removida — resultado registrado apenas no log
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Avec Job] Erro ao sincronizar ${config.empresaSlug}:`, msg);
        _ultimoErro = msg;
      }
    }

    _statusJob = "idle";
    _ultimoErro = null;

    // Calcular próxima execução (próxima hora cheia)
    const proxima = new Date(agoraBRT);
    proxima.setMinutes(0, 0, 0);
    proxima.setHours(proxima.getHours() + 1);
    _proximaExecucao = proxima;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Avec Job] Erro crítico no job:", msg);
    _statusJob = "error";
    _ultimoErro = msg;
    // Notificação ao owner removida — erro registrado apenas no log
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
 * Agenda execução a cada 1 hora (60 minutos).
 * Cron: "0 * * * *" = a cada hora, no minuto 0
 */
export function iniciarJobAvec() {
  if (_cronTask) {
    console.log("[Avec Job] Job já está ativo.");
    return;
  }

  // Cron: "0 * * * *" = a cada hora, no minuto 0
  const CRON_EXPR = "0 * * * *";
  console.log(
    `[Avec Job] Iniciando job de sync automático a cada 1 hora (cron: ${CRON_EXPR})`
  );

  // Calcular próxima execução (próxima hora cheia)
  const agora = new Date();
  const agoraBRT = new Date(
    agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })
  );
  const proxima = new Date(agoraBRT);
  proxima.setMinutes(0, 0, 0);
  proxima.setHours(proxima.getHours() + 1);

  _proximaExecucao = proxima;

  _cronTask = cron.schedule(CRON_EXPR, async () => {
    await executarSyncAvec();
  }, { timezone: "America/Sao_Paulo" });

  console.log(
    `[Avec Job] Job agendado. Próxima execução: ${_proximaExecucao.toLocaleString(
      "pt-BR",
      { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }
    )} BRT`
  );
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

// ─── Inicializar ao carregar o módulo ──────────────────────────────────────────
if (process.env.NODE_ENV !== "test") {
  iniciarJobAvec();
}
