/**
 * Sincronização Horária do Avec - Versão com Restrição de Horário
 *
 * Executa a cada 1 hora APENAS entre 10:00 e 20:30 para sincronizar 
 * faturamento da unidade Seraphine com dados do Avec via Relatório 0184.
 *
 * Horários de execução: 10:00, 11:00, 12:00, ..., 19:00, 20:00
 * (não executa às 21:00 ou depois)
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoAvec } from "./avecSincronizador";
import { getDb } from "./db";

// ─── Configuração ─────────────────────────────────────────────────────────────

/**
 * Expressão cron para executar a cada 1 hora entre 10:00 e 20:30
 * Formato: "minuto hora dia mês dia_semana"
 * "0 10-20 * * *" = minuto 0, horas 10-20 (10:00 até 20:00)
 * 
 * Nota: Cron executa no minuto 0 de cada hora, então:
 * - 10:00 ✓ (dentro do intervalo)
 * - 11:00 ✓ (dentro do intervalo)
 * - ...
 * - 20:00 ✓ (dentro do intervalo)
 * - 21:00 ✗ (fora do intervalo)
 */
const CRON_HORARIO_COMERCIAL = "0 10-20 * * *";

// ─── Tipos ────────────────────────────────────────────────────────────────

interface HourlySyncStatus {
  ativo: boolean;
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
  horarioInicio: string;
  horarioFim: string;
  task?: ReturnType<typeof cron.schedule>;
  erros: string[];
}

// ─── Estado global ────────────────────────────────────────────────────────────

let syncStatus: HourlySyncStatus = {
  ativo: false,
  horarioInicio: "10:00",
  horarioFim: "20:30",
  erros: [],
};

// ─── Funções ──────────────────────────────────────────────────────────────────

/**
 * Verifica se a hora atual está dentro do horário comercial (10:00 a 20:30)
 */
function estaNoHorarioComercial(): boolean {
  const agora = new Date();
  const hora = agora.getHours();
  const minuto = agora.getMinutes();
  
  // Horário comercial: 10:00 até 20:30
  const horaInicio = 10;
  const minutoInicio = 0;
  const horaFim = 20;
  const minutoFim = 30;
  
  const tempoAtual = hora * 60 + minuto;
  const tempoInicio = horaInicio * 60 + minutoInicio;
  const tempoFim = horaFim * 60 + minutoFim;
  
  return tempoAtual >= tempoInicio && tempoAtual <= tempoFim;
}

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
  
  // Verificar se está no horário comercial
  if (!estaNoHorarioComercial()) {
    console.log(
      `[Avec Hourly Sync] Fora do horário comercial (${agora.getHours()}:${String(agora.getMinutes()).padStart(2, "0")}). Sincronização não será executada.`
    );
    return;
  }

  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  console.log(
    `[Avec Hourly Sync] Iniciando sincronização às ${agora.toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })}`
  );

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
    for (const [tenantId, configsDoTenant] of Array.from(configsPorTenant.entries())) {
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
    // Próxima execução será no minuto 0 da próxima hora dentro do horário comercial
    const proximaHora = new Date(agora);
    proximaHora.setHours(proximaHora.getHours() + 1);
    proximaHora.setMinutes(0);
    proximaHora.setSeconds(0);
    syncStatus.proximaExecucao = proximaHora;

    console.log(
      `[Avec Hourly Sync] Sincronização concluída às ${agora.toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })}`
    );
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

  console.log(
    "[Avec Hourly Sync] Iniciando job de sincronização horária (10:00 - 20:30)..."
  );

  syncStatus.task = cron.schedule(CRON_HORARIO_COMERCIAL, () => {
    executarSincronizacaoHoraria().catch((err) => {
      console.error("[Avec Hourly Sync] Erro não tratado:", err);
    });
  });

  syncStatus.ativo = true;
  syncStatus.erros = [];
  console.log("[Avec Hourly Sync] ✓ Job iniciado com sucesso (executará entre 10:00 e 20:30)");
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
 * Executa uma sincronização manual imediatamente (independente do horário)
 */
export async function executarSincronizacaoManualAvec(): Promise<void> {
  console.log("[Avec Hourly Sync] Executando sincronização manual (fora do horário comercial)...");
  await executarSincronizacaoHoraria();
}

/**
 * Retorna informações sobre o horário comercial
 */
export function obterInfoHorarioComercial() {
  return {
    horarioInicio: "10:00",
    horarioFim: "20:30",
    estaNoHorario: estaNoHorarioComercial(),
    horaAtual: new Date().toLocaleString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}
