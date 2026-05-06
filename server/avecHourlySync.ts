/**
 * Sincronização Horária do Avec
 *
 * Executa a cada 1 hora para sincronizar faturamento da unidade Seraphine
 * com dados do Avec via Relatório 0184.
 *
 * Usa node-cron para agendar a execução a cada 60 minutos.
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoAvec } from "./avecSincronizador";
import { getDb } from "./db";

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Expressão cron para executar a cada 1 hora
 * Formato: "minuto hora dia mês dia_semana"
 * "0 * * * *" = a cada hora, no minuto 0
 */
const CRON_HOURLY = "0 * * * *";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface HourlySyncStatus {
  ativo: boolean;
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
  task?: ReturnType<typeof cron.schedule>;
  erros: string[];
}

// ─── Estado global ────────────────────────────────────────────────────────────

let syncStatus: HourlySyncStatus = {
  ativo: false,
  erros: [],
};

// ─── Funções ──────────────────────────────────────────────────────────────────

/**
 * Busca configurações do Avec ativas para sincronização
 */
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

/**
 * Executa a sincronização para Seraphine
 */
async function executarSincronizacaoHoraria(): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  console.log(`[Avec Hourly Sync] Iniciando sincronização às ${agora.toLocaleString("pt-BR")}`);

  try {
    // Buscar todas as configurações de Avec ativas
    const configs = await listarConfigsAvecAtivas();

    if (!configs || configs.length === 0) {
      console.warn("[Avec Hourly Sync] Nenhuma configuração de Avec encontrada");
      return;
    }

    // Agrupar por tenant para evitar duplicação
    const configsPorTenant = new Map<number, typeof configs>();
    for (const config of configs) {
      const tenantId = config.tenantId;
      if (!configsPorTenant.has(tenantId)) {
        configsPorTenant.set(tenantId, []);
      }
      configsPorTenant.get(tenantId)!.push(config);
    }

    // Sincronizar para cada tenant
    for (const [tenantId, configsDoTenant] of configsPorTenant) {
      // Filtrar apenas Seraphine
      const unidadesParaSincronizar = configsDoTenant.filter(
        (c) => c.empresaSlug && c.empresaSlug.toLowerCase().includes("seraphine")
      );

      if (unidadesParaSincronizar.length === 0) {
        console.log(`[Avec Hourly Sync] Nenhuma unidade Seraphine encontrada para tenant ${tenantId}`);
        continue;
      }

      // Sincronizar cada unidade
      for (const config of unidadesParaSincronizar) {
        try {
          console.log(
            `[Avec Hourly Sync] Sincronizando ${config.empresaSlug} (tenant: ${tenantId}, mês: ${mes}/${ano})`
          );

          const resultado = await sincronizarFaturamentoAvec(
            tenantId,
            config.empresaSlug,
            mes,
            ano,
            "automatico"
          );

          console.log(
            `[Avec Hourly Sync] ✓ ${config.empresaSlug}: ${resultado.diasSincronizados} dias sincronizados, ` +
              `${resultado.diasFechados} fechados, ${resultado.diasIgnorados} ignorados`
          );

          if (resultado.erros) {
            console.warn(`[Avec Hourly Sync] ⚠ Erros em ${config.empresaSlug}: ${resultado.erros}`);
            syncStatus.erros.push(`${config.empresaSlug}: ${resultado.erros}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[Avec Hourly Sync] ✗ Erro ao sincronizar ${config.empresaSlug}:`, msg);
          syncStatus.erros.push(`${config.empresaSlug}: ${msg}`);
        }
      }
    }

    syncStatus.ultimaExecucao = agora;
    syncStatus.proximaExecucao = new Date(agora.getTime() + 60 * 60 * 1000); // +1 hora
    console.log(`[Avec Hourly Sync] Sincronização concluída às ${agora.toLocaleString("pt-BR")}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Avec Hourly Sync] Erro fatal:", msg);
    syncStatus.erros.push(`Erro fatal: ${msg}`);
  }
}

/**
 * Inicia o job de sincronização horária
 */
export function iniciarSincronizacaoHorariaAvec(): void {
  if (syncStatus.ativo) {
    console.log("[Avec Hourly Sync] Job já está ativo");
    return;
  }

  console.log("[Avec Hourly Sync] Iniciando job de sincronização horária...");

  syncStatus.task = cron.schedule(CRON_HOURLY, () => {
    executarSincronizacaoHoraria().catch((err) => {
      console.error("[Avec Hourly Sync] Erro não tratado:", err);
    });
  });

  syncStatus.ativo = true;
  syncStatus.erros = [];
  console.log("[Avec Hourly Sync] ✓ Job iniciado com sucesso");
}

/**
 * Para o job de sincronização horária
 */
export function pararSincronizacaoHorariaAvec(): void {
  if (!syncStatus.ativo || !syncStatus.task) {
    console.log("[Avec Hourly Sync] Job não está ativo");
    return;
  }

  syncStatus.task.stop();
  syncStatus.ativo = false;
  console.log("[Avec Hourly Sync] ✓ Job parado com sucesso");
}

/**
 * Retorna o status atual do job
 */
export function obterStatusSincronizacaoAvec(): HourlySyncStatus {
  return {
    ...syncStatus,
    erros: syncStatus.erros.slice(-10), // Últimos 10 erros
  };
}

/**
 * Executa uma sincronização manual imediatamente
 */
export async function executarSincronizacaoManualAvec(): Promise<void> {
  console.log("[Avec Hourly Sync] Executando sincronização manual...");
  await executarSincronizacaoHoraria();
}
