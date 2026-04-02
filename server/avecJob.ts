/**
 * Job automático de sincronização do Avec
 *
 * Executa a cada 1 hora para sincronizar o faturamento da Seraphine.
 * Só sincroniza empresas com sincAutoAtiva = 1.
 */

import { sincronizarFaturamentoAvec } from "./avecSincronizador";
import { getDb } from "./db";

// ─── Estado do job ────────────────────────────────────────────────────────────

let _jobInterval: ReturnType<typeof setInterval> | null = null;
let _ultimaExecucao: Date | null = null;
let _proximaExecucao: Date | null = null;
let _statusJob: "idle" | "running" | "error" = "idle";
let _ultimoErro: string | null = null;

export function getStatusJobAvec() {
  return {
    ativo: _jobInterval !== null,
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

    const agora = new Date();
    const mes = agora.getMonth() + 1;
    const ano = agora.getFullYear();

    for (const config of configs) {
      try {
        console.log(`[Avec Job] Sincronizando ${config.empresaSlug} (tenant ${config.tenantId})...`);
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
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[Avec Job] Erro ao sincronizar ${config.empresaSlug}:`, msg);
        _ultimoErro = msg;
      }
    }

    _statusJob = "idle";
    _ultimoErro = null;
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

const INTERVALO_MS = 60 * 60 * 1000; // 1 hora

export function iniciarJobAvec() {
  if (_jobInterval) {
    console.log("[Avec Job] Job já está ativo.");
    return;
  }

  console.log("[Avec Job] Iniciando job de sync automático (intervalo: 1 hora)");

  // Calcular próxima execução
  _proximaExecucao = new Date(Date.now() + INTERVALO_MS);

  _jobInterval = setInterval(async () => {
    _proximaExecucao = new Date(Date.now() + INTERVALO_MS);
    await executarSyncAvec();
  }, INTERVALO_MS);

  // Executar imediatamente na inicialização se houver configs ativas
  listarConfigsAtivas().then((configs) => {
    if (configs.length > 0) {
      console.log(`[Avec Job] ${configs.length} empresa(s) com sync ativo. Executando sync inicial...`);
      executarSyncAvec();
    } else {
      console.log("[Avec Job] Nenhuma empresa com sync ativo. Job aguardando ativação.");
    }
  });
}

export function pararJobAvec() {
  if (_jobInterval) {
    clearInterval(_jobInterval);
    _jobInterval = null;
    _proximaExecucao = null;
    console.log("[Avec Job] Job parado.");
  }
}

export function recarregarJobAvec() {
  pararJobAvec();
  iniciarJobAvec();
}
