/**
 * Job de sincronização automática do CashBarber
 *
 * Executa diariamente para cada empresa com sincronização automática ativa.
 * O horário de execução é configurável por empresa (padrão: 23:00).
 * Usa node-cron para agendar os jobs dinamicamente.
 */

import * as cron from "node-cron";
import {
  listCashbarberConfigs,
  listCashbarberMapeamento,
  insertCashbarberSyncLog,
  updateCashbarberSyncStatus,
} from "./db";
import {
  cashbarberLogin,
  cashbarberListarServicos,
  cashbarberListarProdutos,
  cashbarberRelatorio15,
  calcularFaturamentoPorCategoriaComCatalogo,
} from "./cashbarber";
import { sincronizarFaturamentoCashbarber } from "./cashbarberSincronizador";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface JobStatus {
  empresaSlug: string;
  tenantId: number;
  horario: string;
  task: ReturnType<typeof cron.schedule>;
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
}

// ─── Estado global dos jobs ───────────────────────────────────────────────────

const jobsAtivos = new Map<string, JobStatus>();
let jobMestre: cron.ScheduledTask | null = null;

/**
 * Chave única para identificar um job por empresa
 */
function jobKey(tenantId: number, empresaSlug: string): string {
  return `${tenantId}:${empresaSlug}`;
}

/**
 * Converte horário "HH:MM" para expressão cron "0 MM HH * * *"
 */
function horarioParaCron(horario: string): string {
  const [hh, mm] = horario.split(":").map(Number);
  const hora = isNaN(hh) ? 23 : Math.min(23, Math.max(0, hh));
  const minuto = isNaN(mm) ? 0 : Math.min(59, Math.max(0, mm));
  return `0 ${minuto} ${hora} * * *`;
}

/**
 * Calcula a próxima execução com base no horário configurado
 */
function calcularProximaExecucao(horario: string): Date {
  const [hh, mm] = horario.split(":").map(Number);
  const agora = new Date();
  const proxima = new Date();
  proxima.setHours(hh, mm, 0, 0);
  if (proxima <= agora) {
    proxima.setDate(proxima.getDate() + 1);
  }
  return proxima;
}

/**
 * Executa a sincronização para uma empresa específica
 */
async function executarSincronizacaoEmpresa(
  tenantId: number,
  empresaSlug: string,
  origem: "auto" | "manual" = "auto"
): Promise<{ diasSincronizados: number; diasIgnorados: number; erros?: string }> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  console.log(`[CashBarber Job] Iniciando sync ${origem} para ${empresaSlug} (${mes}/${ano})`);

  try {
    const resultado = await sincronizarFaturamentoCashbarber(tenantId, empresaSlug, mes, ano, origem);
    console.log(`[CashBarber Job] Sync concluído para ${empresaSlug}: ${resultado.diasSincronizados} dias`);
    return resultado;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[CashBarber Job] Erro ao sincronizar ${empresaSlug}:`, msg);
    throw err;
  }
}

/**
 * Agenda ou re-agenda o job de uma empresa
 */
function agendarJobEmpresa(tenantId: number, empresaSlug: string, horario: string): void {
  const key = jobKey(tenantId, empresaSlug);

  // Cancelar job anterior se existir
  const jobExistente = jobsAtivos.get(key);
  if (jobExistente) {
    jobExistente.task.stop();
    jobsAtivos.delete(key);
  }

  const expressaoCron = horarioParaCron(horario);
  const proxima = calcularProximaExecucao(horario);

  const task = cron.schedule(expressaoCron, async () => {
    const status = jobsAtivos.get(key);
    if (status) {
      status.ultimaExecucao = new Date();
      status.proximaExecucao = calcularProximaExecucao(horario);
    }

    try {
      await executarSincronizacaoEmpresa(tenantId, empresaSlug, "auto");
    } catch (err) {
      console.error(`[CashBarber Job] Falha no job automático de ${empresaSlug}:`, err);
    }
  });

  jobsAtivos.set(key, {
    empresaSlug,
    tenantId,
    horario,
    task,
    proximaExecucao: proxima,
  });

  console.log(`[CashBarber Job] Agendado: ${empresaSlug} às ${horario} (cron: ${expressaoCron})`);
}

/**
 * Cancela o job de uma empresa
 */
function cancelarJobEmpresa(tenantId: number, empresaSlug: string): void {
  const key = jobKey(tenantId, empresaSlug);
  const job = jobsAtivos.get(key);
  if (job) {
    job.task.stop();
    jobsAtivos.delete(key);
    console.log(`[CashBarber Job] Cancelado: ${empresaSlug}`);
  }
}

/**
 * Recarrega todos os jobs a partir do banco de dados
 * Chamado na inicialização do servidor e quando configurações mudam
 */
export async function recarregarJobsCashbarber(): Promise<void> {
  console.log("[CashBarber Job] Recarregando jobs...");

  try {
    // Buscar todas as configs de todos os tenants (tenantId=0 = busca global)
    // Precisamos de uma função que busque todas as configs ativas
    const configs = await listAllActiveCashbarberConfigs();

    // Cancelar jobs que não estão mais ativos
    for (const [key, job] of Array.from(jobsAtivos.entries())) {
      const configAtiva = configs.find(
        (c) => c.tenantId === job.tenantId && c.empresaSlug === job.empresaSlug
      );
      if (!configAtiva || !configAtiva.sincAutoAtiva) {
        job.task.stop();
        jobsAtivos.delete(key);
        console.log(`[CashBarber Job] Removido job inativo: ${job.empresaSlug}`);
      }
    }

    // Agendar ou re-agendar jobs ativos
    for (const config of configs) {
      if (!config.sincAutoAtiva) continue;
      const horario = config.horarioSinc || "23:00";
      const key = jobKey(config.tenantId, config.empresaSlug);
      const jobAtual = jobsAtivos.get(key);

      // Re-agendar apenas se o horário mudou
      if (!jobAtual || jobAtual.horario !== horario) {
        agendarJobEmpresa(config.tenantId, config.empresaSlug, horario);
      }
    }

    console.log(`[CashBarber Job] ${jobsAtivos.size} job(s) ativo(s)`);
  } catch (err) {
    console.error("[CashBarber Job] Erro ao recarregar jobs:", err);
  }
}

/**
 * Retorna o status atual de todos os jobs
 */
export function getStatusJobsCashbarber(): Array<{
  tenantId: number;
  empresaSlug: string;
  horario: string;
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
}> {
  return Array.from(jobsAtivos.values() as Iterable<JobStatus>).map((j) => ({
    tenantId: j.tenantId,
    empresaSlug: j.empresaSlug,
    horario: j.horario,
    ultimaExecucao: j.ultimaExecucao,
    proximaExecucao: j.proximaExecucao,
  }));
}

/**
 * Notifica o gerenciador de jobs que a configuração de uma empresa mudou.
 * Deve ser chamado após salvar configurações de agendamento.
 */
export async function notificarMudancaConfigCashbarber(
  tenantId: number,
  empresaSlug: string,
  sincAutoAtiva: boolean,
  horario: string
): Promise<void> {
  if (sincAutoAtiva) {
    agendarJobEmpresa(tenantId, empresaSlug, horario);
  } else {
    cancelarJobEmpresa(tenantId, empresaSlug);
  }
}

// ─── Função auxiliar para buscar todas as configs ativas ──────────────────────

/**
 * Busca todas as configurações CashBarber ativas no banco (todos os tenants)
 * Usada apenas internamente pelo job mestre
 */
async function listAllActiveCashbarberConfigs() {
  // Importação dinâmica para evitar dependência circular
  const { drizzle } = await import("drizzle-orm/mysql2");
  const mysql = await import("mysql2/promise");
  const { cashbarberConfig } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  // Usar a conexão do banco diretamente
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return [];

  const conn = await mysql.createConnection(dbUrl);
  const db = drizzle(conn);

  const configs = await db
    .select()
    .from(cashbarberConfig)
    .where(eq(cashbarberConfig.ativo, 1));

  await conn.end();
  return configs;
}

/**
 * Inicializa o sistema de jobs do CashBarber.
 * Deve ser chamado uma vez na inicialização do servidor.
 */
export async function inicializarJobsCashbarber(): Promise<void> {
  console.log("[CashBarber Job] Inicializando sistema de jobs...");

  // Aguardar 5 segundos para o servidor estar completamente inicializado
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await recarregarJobsCashbarber();

  // Job mestre: verifica a cada hora se há novas configurações
  // (cobre casos onde o servidor reinicia e novos tenants foram adicionados)
  jobMestre = cron.schedule("0 0 * * * *", async () => {
    console.log("[CashBarber Job] Verificação horária de configurações...");
    await recarregarJobsCashbarber();
  });

  console.log("[CashBarber Job] Sistema inicializado com sucesso");
}
