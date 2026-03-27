/**
 * Job de sincronização automática do CashBarber
 *
 * Executa a cada hora para cada empresa com sincronização automática ativa.
 * Usa node-cron para agendar os jobs dinamicamente.
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoCashbarber, aplicarDpoteParaTenant, recalcularERedistribuirDpotePorTenant } from "./cashbarberSincronizador";

// ─── Intervalos de execução ─────────────────────────────────────────────────

/** Expressão cron para execução a cada hora (no minuto 0 de cada hora) */
const CRON_CADA_HORA = "0 0 * * * *";

/** Expressão cron para execução noturna às 02:00 (recalcula Dpote com dados do dia) */
const CRON_NOTURNO_DPOTE = "0 0 2 * * *";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface JobStatus {
  empresaSlug: string;
  tenantId: number;
  task: ReturnType<typeof cron.schedule>;
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
}

// ─── Estado global dos jobs ───────────────────────────────────────────────────

const jobsAtivos = new Map<string, JobStatus>();
let jobMestre: cron.ScheduledTask | null = null;
let jobNoturno: cron.ScheduledTask | null = null;

/**
 * Chave única para identificar um job por empresa
 */
function jobKey(tenantId: number, empresaSlug: string): string {
  return `${tenantId}:${empresaSlug}`;
}

/**
 * Calcula a próxima execução (início da próxima hora cheia)
 */
function calcularProximaExecucao(): Date {
  const proxima = new Date();
  proxima.setHours(proxima.getHours() + 1, 0, 0, 0);
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
 * Após sincronizar todas as empresas de um tenant, aplica a distribuição Dpote
 * atualizando cat5 (Recorrência) de cada unidade com a comissão bruta correta.
 * Isolado em try/catch para não interromper o ciclo do job em caso de falha.
 */
async function executarAplicacaoDpote(tenantId: number): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  try {
    const resultado = await aplicarDpoteParaTenant(tenantId, mes, ano);
    const resumo = resultado.aplicados
      .map((a) => `${a.empresaSlug}: R$ ${a.valorDistribuido.toFixed(2)}`)
      .join(" | ");
    console.log(`[CashBarber Job] Dpote aplicado ao dashboard (${mes}/${ano}): ${resumo}`);
    if (resultado.naoEncontrados.length > 0) {
      console.warn(`[CashBarber Job] Dpote não encontrado para: ${resultado.naoEncontrados.join(", ")}`);
    }
  } catch (err) {
    // Falha no Dpote não deve interromper o job
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CashBarber Job] Falha ao aplicar Dpote para tenant ${tenantId}:`, msg);
  }
}

/**
 * Agenda o job horário de uma empresa
 */
function agendarJobEmpresa(tenantId: number, empresaSlug: string): void {
  const key = jobKey(tenantId, empresaSlug);

  // Cancelar job anterior se existir
  const jobExistente = jobsAtivos.get(key);
  if (jobExistente) {
    jobExistente.task.stop();
    jobsAtivos.delete(key);
  }

  const task = cron.schedule(CRON_CADA_HORA, async () => {
    const status = jobsAtivos.get(key);
    if (status) {
      status.ultimaExecucao = new Date();
      status.proximaExecucao = calcularProximaExecucao();
    }

    try {
      await executarSincronizacaoEmpresa(tenantId, empresaSlug, "auto");
    } catch (err) {
      console.error(`[CashBarber Job] Falha no job automático de ${empresaSlug}:`, err);
    }

    // Após o sync desta empresa, verificar se é a última empresa do tenant
    // e aplicar a distribuição Dpote para todas as unidades do tenant.
    // A verificação evita múltiplas chamadas quando várias empresas do mesmo tenant sincronizam.
    const todasEmpresasTenant = Array.from(jobsAtivos.values() as Iterable<JobStatus>)
      .filter((j) => j.tenantId === tenantId);
    const ultimaEmpresa = todasEmpresasTenant
      .sort((a, b) => (a.empresaSlug > b.empresaSlug ? 1 : -1))
      .at(-1);
    if (ultimaEmpresa?.empresaSlug === empresaSlug) {
      await executarAplicacaoDpote(tenantId);
    }
  });

  jobsAtivos.set(key, {
    empresaSlug,
    tenantId,
    task,
    proximaExecucao: calcularProximaExecucao(),
  });

  console.log(`[CashBarber Job] Agendado (a cada hora): ${empresaSlug}`);
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
 * Recarrega todos os jobs a partir do banco de dados.
 * Chamado na inicialização do servidor e periodicamente pelo job mestre.
 */
export async function recarregarJobsCashbarber(): Promise<void> {
  console.log("[CashBarber Job] Recarregando jobs...");

  try {
    const configs = await listAllActiveCashbarberConfigs();

    // Cancelar jobs de empresas que desativaram o sync
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

    // Agendar jobs para empresas com sync ativo que ainda não têm job
    for (const config of configs) {
      if (!config.sincAutoAtiva) continue;
      const key = jobKey(config.tenantId, config.empresaSlug);
      if (!jobsAtivos.has(key)) {
        agendarJobEmpresa(config.tenantId, config.empresaSlug);
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
  ultimaExecucao?: Date;
  proximaExecucao?: Date;
}> {
  return Array.from(jobsAtivos.values() as Iterable<JobStatus>).map((j) => ({
    tenantId: j.tenantId,
    empresaSlug: j.empresaSlug,
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
  _horario?: string // mantido por compatibilidade, ignorado
): Promise<void> {
  if (sincAutoAtiva) {
    agendarJobEmpresa(tenantId, empresaSlug);
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
  const { drizzle } = await import("drizzle-orm/mysql2");
  const mysql = await import("mysql2/promise");
  const { cashbarberConfig } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

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
  console.log("[CashBarber Job] Inicializando sistema de jobs (intervalo: 1 hora)...");

  // Aguardar 5 segundos para o servidor estar completamente inicializado
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await recarregarJobsCashbarber();

  // Job mestre: verifica a cada 10 minutos se há novas configurações
  // (cobre casos onde o servidor reinicia e novos tenants foram adicionados)
  jobMestre = cron.schedule("0 */10 * * * *", async () => {
    await recarregarJobsCashbarber();
  });

  // Job noturno: recalcula o valor total da Recorrência Dpote via CashBarber às 02:00
  // e redistribui pelos dias decorridos do mês vigente.
  // Garante que, ao final de cada dia, o valor de cat9 reflita exatamente o total apurado.
  jobNoturno = cron.schedule(CRON_NOTURNO_DPOTE, async () => {
    console.log("[CashBarber Dpote Noturno] Iniciando recalculo noturno da Recorrência Dpote...");
    try {
      // Coletar todos os tenants únicos com Dpote configurado
      const configs = await listAllActiveCashbarberConfigs();
      const tenants = Array.from(new Set(configs.filter((c) => c.dpoteFilialNome).map((c) => c.tenantId)));

      for (const tenantId of tenants) {
        try {
          const resultados = await recalcularERedistribuirDpotePorTenant(tenantId);
          const resumo = resultados
            .filter((r) => r.fonte === "api")
            .map((r) => `${r.empresaSlug}: R$ ${r.valorTotal.toFixed(2)} (÷${r.diasDecorridos} dias = R$ ${r.valorDiario.toFixed(2)}/dia)`)
            .join(" | ");
          if (resumo) {
            console.log(`[CashBarber Dpote Noturno] Tenant ${tenantId}: ${resumo}`);
          }
          const ignorados = resultados.filter((r) => r.fonte === "ignorado_manual").map((r) => r.empresaSlug);
          if (ignorados.length > 0) {
            console.log(`[CashBarber Dpote Noturno] Tenant ${tenantId}: ignorados (fonte=manual): ${ignorados.join(", ")}`);
          }
        } catch (errTenant) {
          const msg = errTenant instanceof Error ? errTenant.message : String(errTenant);
          console.error(`[CashBarber Dpote Noturno] Erro no tenant ${tenantId}:`, msg);
        }
      }
      console.log("[CashBarber Dpote Noturno] Recalculo noturno concluído.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[CashBarber Dpote Noturno] Erro geral:", msg);
    }
  });

  console.log("[CashBarber Job] Sistema inicializado com sucesso (job noturno Dpote: 02:00)");
}
