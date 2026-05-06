/**
 * Sincronização Horária do CashBarber
 *
 * Executa a cada 1 hora para sincronizar faturamento das unidades Mascote e Morumbi
 * com dados do CashBarber.
 *
 * Usa node-cron para agendar a execução a cada 60 minutos.
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoCashbarber } from "./cashbarberSincronizador";
import { listCashbarberConfigs } from "./db";

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
 * Executa a sincronização para Mascote e Morumbi
 */
async function executarSincronizacaoHoraria(): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  console.log(`[CashBarber Hourly Sync] Iniciando sincronização às ${agora.toLocaleString("pt-BR")}`);

  try {
    // Buscar todas as configurações de CashBarber
    const configs = await listCashbarberConfigs();

    if (!configs || configs.length === 0) {
      console.warn("[CashBarber Hourly Sync] Nenhuma configuração de CashBarber encontrada");
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
      // Filtrar apenas Mascote e Morumbi
      const unidadesParaSincronizar = configsDoTenant.filter(
        (c) =>
          c.empresaSlug &&
          (c.empresaSlug.toLowerCase().includes("mascote") ||
            c.empresaSlug.toLowerCase().includes("morumbi"))
      );

      if (unidadesParaSincronizar.length === 0) {
        console.log(`[CashBarber Hourly Sync] Nenhuma unidade Mascote/Morumbi encontrada para tenant ${tenantId}`);
        continue;
      }

      // Sincronizar cada unidade
      for (const config of unidadesParaSincronizar) {
        try {
          console.log(
            `[CashBarber Hourly Sync] Sincronizando ${config.empresaSlug} (tenant: ${tenantId}, mês: ${mes}/${ano})`
          );

          const resultado = await sincronizarFaturamentoCashbarber(
            tenantId,
            config.empresaSlug,
            mes,
            ano,
            "auto"
          );

          console.log(
            `[CashBarber Hourly Sync] ✓ ${config.empresaSlug}: ${resultado.diasSincronizados} dias sincronizados, ${resultado.diasIgnorados} ignorados`
          );

          if (resultado.erros) {
            console.warn(`[CashBarber Hourly Sync] ⚠ Erros em ${config.empresaSlug}: ${resultado.erros}`);
            syncStatus.erros.push(`${config.empresaSlug}: ${resultado.erros}`);
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[CashBarber Hourly Sync] ✗ Erro ao sincronizar ${config.empresaSlug}:`, msg);
          syncStatus.erros.push(`${config.empresaSlug}: ${msg}`);
        }
      }
    }

    syncStatus.ultimaExecucao = agora;
    syncStatus.proximaExecucao = new Date(agora.getTime() + 60 * 60 * 1000); // +1 hora
    console.log(`[CashBarber Hourly Sync] Sincronização concluída às ${agora.toLocaleString("pt-BR")}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[CashBarber Hourly Sync] Erro fatal:", msg);
    syncStatus.erros.push(`Erro fatal: ${msg}`);
  }
}

/**
 * Inicia o job de sincronização horária
 */
export function iniciarSincronizacaoHoraria(): void {
  if (syncStatus.ativo) {
    console.log("[CashBarber Hourly Sync] Job já está ativo");
    return;
  }

  console.log("[CashBarber Hourly Sync] Iniciando job de sincronização horária...");

  syncStatus.task = cron.schedule(CRON_HOURLY, () => {
    executarSincronizacaoHoraria().catch((err) => {
      console.error("[CashBarber Hourly Sync] Erro não tratado:", err);
    });
  });

  syncStatus.ativo = true;
  syncStatus.erros = [];
  console.log("[CashBarber Hourly Sync] ✓ Job iniciado com sucesso");
}

/**
 * Para o job de sincronização horária
 */
export function pararSincronizacaoHoraria(): void {
  if (!syncStatus.ativo || !syncStatus.task) {
    console.log("[CashBarber Hourly Sync] Job não está ativo");
    return;
  }

  syncStatus.task.stop();
  syncStatus.ativo = false;
  console.log("[CashBarber Hourly Sync] ✓ Job parado com sucesso");
}

/**
 * Retorna o status atual do job
 */
export function obterStatusSincronizacao(): HourlySyncStatus {
  return {
    ...syncStatus,
    erros: syncStatus.erros.slice(-10), // Últimos 10 erros
  };
}

/**
 * Executa uma sincronização manual imediatamente
 */
export async function executarSincronizacaoManual(): Promise<void> {
  console.log("[CashBarber Hourly Sync] Executando sincronização manual...");
  await executarSincronizacaoHoraria();
}
