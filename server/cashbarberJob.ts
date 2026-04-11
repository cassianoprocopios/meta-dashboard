/**
 * Job de sincronização automática do CashBarber
 *
 * Executa a cada hora para cada empresa com sincronização automática ativa.
 * Usa node-cron para agendar os jobs dinamicamente.
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoCashbarber, aplicarDpoteParaTenant } from "./cashbarberSincronizador";

// ─── Horários de sync: 7h, 9h, 12h, 15h, 16h, 18h, 20h BRT ─────────────────
// BRT = UTC-3
// 7h BRT  = 10h UTC
// 9h BRT  = 12h UTC
// 12h BRT = 15h UTC
// 15h BRT = 18h UTC
// 16h BRT = 19h UTC
// 18h BRT = 21h UTC
// 20h BRT = 23h UTC

/**
 * Expressões cron para execução múltiplas vezes por dia.
 * 7h, 9h, 12h, 15h, 16h, 18h e 20h BRT.
 */
const CRON_7H_BRT  = "0 0 10 * * *";
const CRON_9H_BRT  = "0 0 12 * * *";
const CRON_12H_BRT = "0 0 15 * * *";
const CRON_15H_BRT = "0 0 18 * * *";
const CRON_16H_BRT = "0 0 19 * * *";
const CRON_18H_BRT = "0 0 21 * * *";
const CRON_20H_BRT = "0 0 23 * * *";

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

/**
 * Chave única para identificar um job por empresa
 */
function jobKey(tenantId: number, empresaSlug: string): string {
  return `${tenantId}:${empresaSlug}`;
}

/**
 * Calcula a próxima execução (próximo horário fixo em BRT: 7h, 9h, 12h, 15h, 16h, 18h, 20h)
 */
function calcularProximaExecucao(): Date {
  const agora = new Date();
  const horaBRT = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const hora = horaBRT.getHours();
  // Horários em UTC (BRT+3)
  const horariosUTC = [10, 12, 15, 18, 19, 21, 23]; // 7h, 9h, 12h, 15h, 16h, 18h, 20h BRT
  const horasBRT    = [ 7,  9, 12, 15, 16, 18, 20];
  const proxima = new Date(agora);
  const proximoIdx = horasBRT.findIndex((h) => h > hora);
  if (proximoIdx >= 0) {
    proxima.setUTCHours(horariosUTC[proximoIdx], 0, 0, 0);
  } else {
    // Próximo: 7h amanhã
    proxima.setDate(proxima.getDate() + 1);
    proxima.setUTCHours(10, 0, 0, 0);
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
 * Após sincronizar todas as empresas de um tenant, aplica a distribuição Dpote
 * atualizando cat9 (Recorrência) de cada unidade com a comissão bruta correta.
 * Isolado em try/catch para não interromper o ciclo do job em caso de falha.
 * Em caso de falha, envia notificação push imediata para o dono.
 */
async function executarAplicacaoDpote(tenantId: number, origem: "horario" | "diario" | "manual" = "horario"): Promise<void> {
  const agora = new Date();

  // Pular atualização automática do Dpote aos domingos (salão fechado = sem novas assinaturas)
  // Chamadas manuais (origem === "manual") sempre são executadas independente do dia
  if (origem !== "manual") {
    const diaSemana = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })).getDay();
    if (diaSemana === 0) {
      console.log(`[CashBarber Job] Dpote ignorado (domingo) para tenant ${tenantId}`);
      return;
    }
  }

  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const dataHora = agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  try {
    const resultado = await aplicarDpoteParaTenant(tenantId, mes, ano);
    const resumo = resultado.aplicados
      .map((a) => `${a.empresaSlug}: R$ ${a.valorDistribuido.toFixed(2)}`)
      .join(" | ");
    console.log(`[CashBarber Job] Dpote aplicado ao dashboard (${mes}/${ano}): ${resumo}`);

    // Avisar se alguma filial não foi encontrada no histórico do Dpote
    if (resultado.naoEncontrados.length > 0) {
      const filiais = resultado.naoEncontrados.join(", ");
      console.warn(`[CashBarber Job] Dpote não encontrado para: ${filiais}`);
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `⚠️ Dpote: filial(is) sem dados (${dataHora})`,
          content:
            `O Dpote foi calculado mas as seguintes filiais não foram encontradas no histórico:\n\n` +
            `• ${filiais}\n\n` +
            `Verifique se os nomes das filiais no painel correspondem aos cadastrados no CashBarber.\n` +
            `Acesse Configurações > CashBarber para corrigir.`,
        });
      } catch { /* silenciar erro de notificação */ }
    }
  } catch (err) {
    // Falha no Dpote não deve interromper o job
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CashBarber Job] Falha ao aplicar Dpote para tenant ${tenantId} (${origem}):`, msg);

    // Notificação push imediata para o dono
    try {
      const { notifyOwner } = await import("./_core/notification");
      const origemLabel = origem === "horario" ? "job horário" : origem === "diario" ? "sync diário das 6h10" : "sync manual";
      await notifyOwner({
        title: `🔴 Falha no Dpote — ${origemLabel} (${dataHora})`,
        content:
          `A distribuição do Dpote falhou durante o ${origemLabel}.\n\n` +
          `Erro: ${msg}\n\n` +
          `Os valores de Recorrência (cat9) do mês ${mes}/${ano} podem estar desatualizados.\n` +
          `Acesse o painel e clique em "Sincronizar Dpote" para corrigir manualmente.`,
      });
      console.log(`[CashBarber Job] Alerta de falha do Dpote enviado para tenant ${tenantId}`);
    } catch (notifErr) {
      console.error("[CashBarber Job] Falha ao enviar notificação de erro do Dpote:", notifErr);
    }
  }
}

/**
 * Verifica se alguma empresa do tenant atingiu 100% da meta diária esperada
 * e envia notificação push caso ainda não tenha sido notificado hoje.
 *
 * Lógica:
 *  - Meta esperada até hoje = (metaMensal / diasUteis) * diasPassadosNoMes
 *  - Se totalRealizado >= metaEsperadaHoje → notificar (1x por empresa por dia)
 *  - Chave anti-duplicata: "meta_diaria_atingida:{slug}:{YYYY-MM-DD}"
 */
export async function verificarMetaDiariaParaTenant(tenantId: number): Promise<void> {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const diaHoje = agora.getDate();
  const dataHoje = `${ano}-${String(mes).padStart(2, "0")}-${String(diaHoje).padStart(2, "0")}`;

  try {
    const {
      getEmpresasByTenant,
      getMetasByMesAndTenant,
      getAllFaturamentosByTenant,
      eventoJaNotificado,
      registrarEventoNotificado,
    } = await import("./db");
    const { notifyOwner } = await import("./_core/notification");

    const [empresas, metasMes, faturamentosMes] = await Promise.all([
      getEmpresasByTenant(tenantId),
      getMetasByMesAndTenant(tenantId, mes, ano),
      getAllFaturamentosByTenant(tenantId, mes, ano),
    ]);

    for (const empresa of empresas) {
      if (!empresa.ativo) continue;

      // Buscar meta desta empresa
      const meta = metasMes.find((m) => m.empresaSlug === empresa.slug);
      if (!meta || Number(meta.metaMensal) <= 0) continue;

      const metaMensal = Number(meta.metaMensal);
      const diasUteis = meta.diasUteis ?? 26;

      // Meta esperada até hoje: proporcional aos dias passados no mês
      // Usa dias corridos (diaHoje) como proxy para dias trabalhados
      const totalDiasMes = new Date(ano, mes, 0).getDate();
      const metaEsperadaHoje = (metaMensal / totalDiasMes) * diaHoje;

      // Somar faturamento realizado desta empresa no mês (apenas dias passados, excluindo previstos)
      const fatsEmpresa = faturamentosMes.filter(
        (f) => f.empresaSlug === empresa.slug && f.data <= dataHoje
      );
      const totalRealizado = fatsEmpresa.reduce((acc, f) => {
        return acc + [
          Number(f.cat1), Number(f.cat2), Number(f.cat3),
          Number(f.cat4), Number(f.cat5), Number(f.cat6),
          Number(f.cat7), Number(f.cat8), Number(f.cat9),
        ].reduce((a, b) => a + b, 0);
      }, 0);

      // Verificar se atingiu 100% da meta esperada até hoje
      if (totalRealizado < metaEsperadaHoje) continue;

      // Chave única por empresa por dia (evita duplicata no mesmo dia)
      const chave = `meta_diaria_atingida:${empresa.slug}:${dataHoje}`;
      const jaNotificado = await eventoJaNotificado(tenantId, chave);
      if (jaNotificado) continue;

      const pct = metaEsperadaHoje > 0 ? ((totalRealizado / metaEsperadaHoje) * 100).toFixed(1) : "100.0";
      const fmtBRL = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

      const mensagem =
        `🎯 ${empresa.nome} atingiu a meta diária! ` +
        `Realizado: ${fmtBRL(totalRealizado)} (${pct}% da meta esperada de ${fmtBRL(metaEsperadaHoje)} para o dia ${diaHoje}/${mes}).`;

      await notifyOwner({
        title: `🎯 Meta diária atingida: ${empresa.nome}`,
        content: mensagem,
      });

      await registrarEventoNotificado(tenantId, chave, "meta_diaria_atingida", empresa.slug, mensagem);

      console.log(`[CashBarber Job] Notificação enviada: ${empresa.nome} atingiu meta diária (${pct}%)`);
    }
  } catch (err) {
    // Falha na verificação não deve interromper o job
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CashBarber Job] Falha ao verificar meta diária para tenant ${tenantId}:`, msg);
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

  // Agendar nos dois horários fixos: 7h e 16h BRT
  const executarSync = async () => {
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
    const todasEmpresasTenant = Array.from(jobsAtivos.values() as Iterable<JobStatus>)
      .filter((j) => j.tenantId === tenantId);
    const ultimaEmpresa = todasEmpresasTenant
      .sort((a, b) => (a.empresaSlug > b.empresaSlug ? 1 : -1))
      .at(-1);
    if (ultimaEmpresa?.empresaSlug === empresaSlug) {
      await executarAplicacaoDpote(tenantId, "horario");
      await verificarMetaDiariaParaTenant(tenantId);
      try {
        const resultado = await executarRecalculoRanking(tenantId);
        console.log(`[CashBarber Job] Ranking recalculado: ${resultado.sincronizados} profissional(is)`);
      } catch (rankErr) {
        console.warn(`[CashBarber Job] Falha ao recalcular ranking:`, rankErr);
      }
    }
  };

  const criarTask = (cronExpr: string, label: string) =>
    cron.schedule(cronExpr, async () => {
      const status = jobsAtivos.get(key);
      if (status) {
        status.ultimaExecucao = new Date();
        status.proximaExecucao = calcularProximaExecucao();
      }
      console.log(`[CashBarber Job] Sync ${label} BRT para ${empresaSlug}`);
      await executarSync();
    });

  const task7h  = criarTask(CRON_7H_BRT,  "7h");
  const task9h  = criarTask(CRON_9H_BRT,  "9h");
  const task12h = criarTask(CRON_12H_BRT, "12h");
  const task15h = criarTask(CRON_15H_BRT, "15h");
  const task16h = criarTask(CRON_16H_BRT, "16h");
  const task18h = criarTask(CRON_18H_BRT, "18h");
  const task20h = criarTask(CRON_20H_BRT, "20h");

  jobsAtivos.set(key, {
    empresaSlug,
    tenantId,
    task: task7h, // referência principal
    proximaExecucao: calcularProximaExecucao(),
    _task9h: task9h,
    _task12h: task12h,
    _task15h: task15h,
    _task16h: task16h,
    _task18h: task18h,
    _task20h: task20h,
  } as any);

  console.log(`[CashBarber Job] Agendado (7h, 9h, 12h, 15h, 16h, 18h, 20h BRT): ${empresaSlug}`);
}

/**
 * Cancela o job de uma empresa
 */
function cancelarJobEmpresa(tenantId: number, empresaSlug: string): void {
  const key = jobKey(tenantId, empresaSlug);
  const job = jobsAtivos.get(key) as any;
  if (job) {
    job.task.stop();
    if (job._task9h)  job._task9h.stop();
    if (job._task12h) job._task12h.stop();
    if (job._task15h) job._task15h.stop();
    if (job._task16h) job._task16h.stop();
    if (job._task18h) job._task18h.stop();
    if (job._task20h) job._task20h.stop();
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
  console.log("[CashBarber Job] Inicializando sistema de jobs (7h, 9h, 12h, 15h, 16h, 18h, 20h BRT)...");

  // Aguardar 5 segundos para o servidor estar completamente inicializado
  await new Promise((resolve) => setTimeout(resolve, 5000));

  await recarregarJobsCashbarber();

  // Job mestre: verifica a cada 10 minutos se há novas configurações
  // (cobre casos onde o servidor reinicia e novos tenants foram adicionados)
  jobMestre = cron.schedule("0 */10 * * * *", async () => {
    await recarregarJobsCashbarber();
  });

  console.log("[CashBarber Job] Sistema inicializado com sucesso");
}

// ─── Job de Ranking a cada 30 minutos (horário de funcionamento) ────────────────
// Seg–Sex: 09:30–21:00 | Sáb: 09:30–19:00 | Dom: não executa

/**
 * Verifica se o horário atual está dentro do horário de funcionamento
 * Seg–Sex: 09:30–21:00 | Sáb: 09:30–19:00 | Dom: nunca
 */
function dentroDoHorarioFuncionamento(): boolean {
  const agora = new Date();
  // Converter para horário de Brasília (UTC-3)
  const horaBRT = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const diaSemana = horaBRT.getDay(); // 0=Dom, 1=Seg, ..., 6=Sáb
  const hora = horaBRT.getHours();
  const minuto = horaBRT.getMinutes();
  const totalMinutos = hora * 60 + minuto;
  const abertura = 9 * 60 + 30; // 09:30
  const fechamentoSemana = 21 * 60; // 21:00
  const fechamentoSabado = 19 * 60; // 19:00

  if (diaSemana === 0) return false; // Domingo: nunca
  if (diaSemana >= 1 && diaSemana <= 5) {
    // Segunda a Sexta
    return totalMinutos >= abertura && totalMinutos < fechamentoSemana;
  }
  if (diaSemana === 6) {
    // Sábado
    return totalMinutos >= abertura && totalMinutos < fechamentoSabado;
  }
  return false;
}

// Job a cada 30 minutos — recalcula ranking apenas no horário de funcionamento
// Dispara nos minutos :20 e :50 (longe do job horário em :05 e do job diário em :10)
cron.schedule("0 20,50 * * * *", async () => {
  if (!dentroDoHorarioFuncionamento()) return;

  const configs = await listAllActiveCashbarberConfigs().catch(() => []);
  const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));

  for (const tenantId of tenantIds) {
    try {
      const resultado = await executarRecalculoRanking(tenantId);
      console.log(`[Ranking Job] Atualização 30min: tenant ${tenantId} — ${resultado.sincronizados} profissional(is)`);
    } catch (err) {
      console.warn(`[Ranking Job] Falha na atualização 30min para tenant ${tenantId}:`, err);
    }
  }
});

console.log("[Ranking Job] Job de 30min agendado (Seg–Sex 09:30–21:00 | Sáb 09:30–19:00)");

// ─── Job de Dpote a cada hora (’:30) durante horário de funcionamento ─────────────────
// Garante que o valor do Dpote seja sempre o mais recente ao longo do dia,
// sem depender do sync completo do faturamento.
cron.schedule("0 30 * * * *", async () => {
  if (!dentroDoHorarioFuncionamento()) return;

  const configs = await listAllActiveCashbarberConfigs().catch(() => []);
  const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));
  if (tenantIds.length === 0) return;

  const agora = new Date();
  const dataHora = agora.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[Dpote Job] Atualização horária do Dpote (${dataHora})...`);

  for (const tenantId of tenantIds) {
    await executarAplicacaoDpote(tenantId, "horario");
  }
});

console.log("[Dpote Job] Job horário do Dpote agendado (a cada hora no minuto :30, horário de funcionamento)");

// ─── Job de Notificação Diária do Ranking (21h) ───────────────────────────────

async function enviarNotificacaoRankingDiario(): Promise<void> {
  try {
    const { listarColaboradores } = await import("./db");
    const { notifyOwner } = await import("./_core/notification");
    const { cashbarberLogin, cashbarberRelatorio15 } = await import("./cashbarber");

    // Buscar todos os tenants com configs ativas
    const configs = await listAllActiveCashbarberConfigs();
    const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));

    for (const tenantId of tenantIds) {
      try {
        const hoje = new Date();
        const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
        const colaboradores = await listarColaboradores(tenantId);
        const configsTenant = configs.filter((c) => c.tenantId === tenantId);

        const EXCLUIDOS = /^(corte de cabelo|barba$|barba completa|corte kids|raspar na m[áa]quina|pezinho)/i;
        const resultados: Array<{ nome: string; total: number }> = [];

        for (const empresa of configsTenant) {
          if (!empresa.cbEmail || !empresa.cbSenha || !empresa.cbFilialId) continue;
          try {
            const token = await cashbarberLogin(empresa.cbEmail, empresa.cbSenha);
            if (!token) continue;
            // Buscar dados por profissional individualmente
            const colsEmpresa = colaboradores.filter(
              (c) => c.ativo === 1 && c.exibirNoRanking === 1 && c.cashbarberProfissionalId != null && c.isGerencia !== 1
            );
            for (const col of colsEmpresa) {
              try {
                const relatorio = await cashbarberRelatorio15(
                  token, dataStr, dataStr, empresa.cbFilialId, Number(col.cashbarberProfissionalId)
                );
                const totalServicos = (relatorio.servicos ?? [])
                  .filter((s: any) => !EXCLUIDOS.test(s.ser_nome ?? ""))
                  .reduce((acc: number, s: any) => acc + (parseFloat(String(s.sum ?? 0)) || 0), 0);
                const totalProdutos = (relatorio.produtos ?? [])
                  .reduce((acc: number, p: any) => acc + (parseFloat(String(p.total ?? p.sum ?? 0)) || 0), 0);
                const total = totalServicos + totalProdutos;
                if (total > 0) {
                  const nomeExib = col.apelido || col.nome;
                  const idx = resultados.findIndex((r) => r.nome === nomeExib);
                  if (idx >= 0) {
                    resultados[idx].total += total;
                  } else {
                    resultados.push({ nome: nomeExib, total });
                  }
                }
              } catch {
                // silenciar erro por profissional
              }
            }
          } catch {
            // silenciar erros por empresa
          }
        }

        if (resultados.length === 0) continue;
        resultados.sort((a, b) => b.total - a.total);
        const top3 = resultados.slice(0, 3);
        const ultimos3 = resultados.length > 3 ? resultados.slice(-3) : [];
        const fmtBRL = (v: number) =>
          v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const linhasTop = top3.map((r, i) => {
          const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
          return `${medalha} ${r.nome}: ${fmtBRL(r.total)}`;
        });

        const linhasUltimos = ultimos3.map((r, i) => {
          const posicao = resultados.length - (ultimos3.length - 1 - i);
          return `🔦 ${posicao}º ${r.nome}: ${fmtBRL(r.total)}`;
        });

        const conteudo = [
          ...linhasTop,
          ...(ultimos3.length > 0 ? ["\n⚠️ Zona de Lanterna:", ...linhasUltimos] : []),
          `\n${resultados.length} profissionais com dados hoje.`,
        ].join("\n");

        await notifyOwner({
          title: `🏆 Top 3 do Dia — ${hoje.toLocaleDateString("pt-BR")}`,
          content: conteudo,
        });

        console.log(`[Ranking Notif] Notificação enviada para tenant ${tenantId}: ${top3.map((r) => r.nome).join(", ")}`);
      } catch (e) {
        console.error(`[Ranking Notif] Erro para tenant ${tenantId}:`, e);
      }
    }
  } catch (e) {
    console.error("[Ranking Notif] Erro geral:", e);
  }
}

// Agendar notificação diária às 21h (horário do servidor)
cron.schedule("0 0 21 * * *", () => {
  console.log("[Ranking Notif] Enviando notificação do top 3 do dia...");
  enviarNotificacaoRankingDiario().catch((e) =>
    console.error("[Ranking Notif] Erro:", e)
  );
});

// ─── Job de fallback diário às 7h05 BRT (10:05 UTC) ────────────────────────
// Garante que o sync seja executado mesmo que o job das 7h falhe por hibernação.
// Dispara 5 minutos após o job das 7h para evitar conflito de login simultâneo.
cron.schedule("0 5 10 * * *", async () => {
  console.log("[CashBarber Job] Sync diário 7h05 BRT iniciado...");
  const errosPorEmpresa: Record<string, string> = {};
  try {
    const configs = await listAllActiveCashbarberConfigs();
    const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));
    for (const tenantId of tenantIds) {
      const configsTenant = configs.filter((c) => c.tenantId === tenantId && c.sincAutoAtiva);
      for (const config of configsTenant) {
        try {
          await executarSincronizacaoEmpresa(tenantId, config.empresaSlug, "auto");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[CashBarber Job] Erro no sync diário 6h para ${config.empresaSlug}:`, msg);
          errosPorEmpresa[config.empresaSlug] = msg;
        }
      }
      // Aplicar Dpote após sync de todas as empresas do tenant
      await executarAplicacaoDpote(tenantId, "diario");
      await verificarMetaDiariaParaTenant(tenantId);
    }
    const totalErros = Object.keys(errosPorEmpresa).length;
    if (totalErros > 0) {
      // Enviar alerta de falha para o dono do sistema
      try {
        const { notifyOwner } = await import("./_core/notification");
        const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const detalhes = Object.entries(errosPorEmpresa)
          .map(([emp, err]) => `\u2022 ${emp}: ${err}`)
          .join("\n");
        await notifyOwner({
          title: `\u26a0\ufe0f Falha no Sync Automático (${dataHora})`,
          content: `O sync das 7h falhou para ${totalErros} empresa(s):\n\n${detalhes}\n\nAcesse /sync-status para detalhes ou dispare um sync manual.`,
        });
        console.log(`[CashBarber Job] Alerta de falha enviado: ${totalErros} empresa(s) com erro`);
      } catch (notifErr) {
        console.error("[CashBarber Job] Falha ao enviar notificação de erro:", notifErr);
      }
    }
    // Recalcular ranking dos profissionais após o sync do faturamento
    try {
      const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));
      for (const tenantId of tenantIds) {
        const resultado = await executarRecalculoRanking(tenantId);
        console.log(`[CashBarber Job] Ranking recalculado para tenant ${tenantId}: ${resultado.sincronizados} profissional(is)`);
      }
    } catch (rankErr) {
      console.warn("[CashBarber Job] Falha ao recalcular ranking:", rankErr);
    }
    console.log(`[CashBarber Job] Sync diário 7h05 BRT concluído. Erros: ${totalErros}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log("[CashBarber Job] Erro crítico no sync diário 7h05 BRT:", msg);
    // Alerta crítico: o job inteiro falhou
    try {
      const { notifyOwner } = await import("./_core/notification");
      const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      await notifyOwner({
        title: `\ud83d\udd34 Falha Crítica no Job de Sync (${dataHora})`,
        content: `O job de sincronização das 7h falhou completamente:\n\n${msg}\n\nAcesse /sync-status para detalhes.`,
      });
    } catch { /* silenciar erro de notificação */ }
  }
});

// ─── Recalculo do Ranking dos Profissionais ────────────────────────────────────────────────
// Função exportada para ser usada tanto pelo job diário das 6h quanto pelo
// endpoint /api/internal/cron-sync, garantindo que o ranking seja sempre
// atualizado junto com o faturamento.
export async function executarRecalculoRanking(tenantId: number): Promise<{ sincronizados: number; erros: number }> {
  const { listarColaboradores, upsertFaturamentoColaborador } = await import("./db");
  const { cashbarberLogin, cashbarberRelatorio15, cashbarberRelatorio13 } = await import("./cashbarber");
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const configs = await listAllActiveCashbarberConfigs();
  const configsTenant = configs.filter((c) => c.tenantId === tenantId && c.sincAutoAtiva);
  if (configsTenant.length === 0) return { sincronizados: 0, erros: 0 };
  const configPrincipal = configsTenant[0];
  if (!configPrincipal.cbEmail || !configPrincipal.cbSenha) return { sincronizados: 0, erros: 0 };
  const token = await cashbarberLogin(configPrincipal.cbEmail, configPrincipal.cbSenha);
  if (!token) return { sincronizados: 0, erros: 0 };
  const colaboradoresList = await listarColaboradores(tenantId);
  const comId = colaboradoresList.filter((c) => c.cashbarberProfissionalId && c.ativo === 1);
  if (comId.length === 0) return { sincronizados: 0, erros: 0 };
  const dataInicial = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataFinal = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;
  let mapaFilial: Map<string, string> = new Map();
  try {
    const rel13 = await cashbarberRelatorio13(token, dataInicial, dataFinal);
    for (const item of rel13) {
      if (item.barbeiro && item.filial) {
        mapaFilial.set(item.barbeiro.toLowerCase().trim(), _filialParaEmpresaSlug(item.filial));
      }
    }
  } catch (e) {
    console.warn("[Ranking Job] Não foi possível buscar relatório 13:", e);
  }
  const EXCLUIDOS_RANKING = /^(corte\s*(de\s*)?cabelo|corte\s*kids|raspar\s*na\s*máquina|barba\s*(completa|simples|na\s*tesoura|na\s*máquina)?$|pezinho)/i;
  const EXCLUIDOS_PRODUTOS = /^(caixinha|água|agua|heineken|refrigerante|corona|pod\s*v?400|red\s*bull|brownie)/i;
  let sincronizados = 0;
  let erros = 0;
  for (const col of comId) {
    try {
      const relatorio = await cashbarberRelatorio15(token, dataInicial, dataFinal, null, col.cashbarberProfissionalId);
      const servicosRanking = (relatorio.servicos ?? []).filter((s: any) => !EXCLUIDOS_RANKING.test(s.ser_nome ?? ""));
      const produtosRanking = (relatorio.produtos ?? []).filter((p: any) => !EXCLUIDOS_PRODUTOS.test(p.pro_nome ?? ""));
      const totalServicos = servicosRanking.reduce((acc: number, s: any) => acc + (s.sum ?? 0), 0);
      const totalProdutos = produtosRanking.reduce((acc: number, p: any) => acc + (p.total ?? 0), 0);
      const totalGeral = totalServicos + totalProdutos;
      const nomeCB = (col.apelido ?? col.nome).toLowerCase().trim();
      const slugCorreto = mapaFilial.get(nomeCB) ?? col.empresaSlug ?? "barbiero-grupo";
      await upsertFaturamentoColaborador({
        tenantId,
        colaboradorId: col.id,
        empresaSlug: slugCorreto,
        mes,
        ano,
        totalServicos,
        totalProdutos,
        totalGeral,
        detalhesServicos: JSON.stringify(
          servicosRanking.slice(0, 20).map((s: any) => ({ ser_nome: s.ser_nome, sum: s.sum, count: s.count ?? 0 }))
        ),
        detalhesProdutos: JSON.stringify(
          produtosRanking.filter((p: any) => p.total > 0).slice(0, 30).map((p: any) => ({ pro_nome: p.pro_nome, sum: p.total, count: Number(p.count) || 0 }))
        ),
      });
      sincronizados++;
    } catch (e) {
      console.error(`[Ranking Job] Erro ao recalcular ${col.nome}:`, e);
      erros++;
    }
  }
  console.log(`[Ranking Job] Recalculo concluído para tenant ${tenantId}: ${sincronizados} profissional(is), ${erros} erro(s)`);
  return { sincronizados, erros };
}

function _filialParaEmpresaSlug(filial: string): string {
  const f = filial.toLowerCase().trim();
  if (f.includes("morumbi")) return "barbiero-morumbi";
  if (f.includes("mascote")) return "barbiero-mascote";
  return "barbiero-grupo";
}

// ─── Fechamento Mensal Automático de Bonificações ─────────────────────────────
// Roda no último dia de cada mês às 23h BRT (02:00 UTC do dia seguinte)
// Calcula e salva automaticamente o histórico de bonificações para cada empresa.

/**
 * Calcula e persiste o histórico de bonificações para todas as empresas de um tenant.
 * Usa os dados de faturamento, metas e configurações de bonificação já no banco.
 */
async function fecharMesBonificacoes(tenantId: number, mes: number, ano: number): Promise<void> {
  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
  console.log(`[Bonificação Job] Iniciando fechamento mensal ${mes}/${ano} para tenant ${tenantId} (${dataHora})`);

  try {
    const {
      getEmpresasByTenant,
      getMetasByMesAndTenant,
      getAllFaturamentosByTenant,
      getAllBonificacoesByTenant,
    } = await import("./db");
    const { getDb } = await import("./db");
    const { bonificacaoHistorico } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");
    const { notifyOwner } = await import("./_core/notification");

    const db = await getDb();
    if (!db) {
      console.error("[Bonificação Job] Banco de dados indisponível.");
      return;
    }

    const [empresas, metasMes, bonificacoesConfig] = await Promise.all([
      getEmpresasByTenant(tenantId),
      getMetasByMesAndTenant(tenantId, mes, ano),
      getAllBonificacoesByTenant(tenantId),
    ]);

    const resumo: string[] = [];

    for (const empresa of empresas) {
      try {
        const slug = empresa.slug;

        // Buscar faturamento do mês para esta empresa
        const faturamentosMes = await getAllFaturamentosByTenant(tenantId, mes, ano, slug);

        // Calcular totais do mês
        const diasRealizados = faturamentosMes.filter((r) => {
          const [, , dia] = r.data.split("-").map(Number);
          const dataRow = new Date(r.data + "T12:00:00");
          const hoje = new Date();
          return dataRow <= hoje;
        });

        if (diasRealizados.length === 0) {
          console.log(`[Bonificação Job] ${slug}: sem dados de faturamento para ${mes}/${ano}, pulando.`);
          continue;
        }

        const totalMes = diasRealizados.reduce((acc, r) => {
          const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
          return acc + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
        }, 0);

        // Calcular total quinzenal (dias 1-15)
        const diasQuinzena = diasRealizados.filter((r) => {
          const [, , dia] = r.data.split("-").map(Number);
          return dia <= 15;
        });
        const totalQuinzenal = diasQuinzena.reduce((acc, r) => {
          const cats = [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9];
          return acc + cats.reduce((s, c) => s + parseFloat(c || "0"), 0);
        }, 0);

        // Buscar meta da empresa para o mês
        const metaEmpresa = metasMes.find((m) => m.empresaSlug === slug);
        const metaMensal = parseFloat(metaEmpresa?.metaMensal || "0");
        const metaQuinzenal = parseFloat(metaEmpresa?.metaQuinzenal || "0");
        const superMetaValor = parseFloat(metaEmpresa?.superMeta || "0");

        // Buscar configuração de bonificação da empresa
        const bonifConfig = bonificacoesConfig.find((b) => b.empresaSlug === slug);
        const pctQSemMeta = parseFloat(bonifConfig?.pctQuinzenalSemMeta || "0") / 100;
        const pctQComMeta = parseFloat(bonifConfig?.pctQuinzenalComMeta || "0") / 100;
        const pctMSemMeta = parseFloat(bonifConfig?.pctMensalSemMeta || "0") / 100;
        const pctMComMeta = parseFloat(bonifConfig?.pctMensalComMeta || "0") / 100;
        const pctSuperMeta = parseFloat(bonifConfig?.pctSuperMeta || "0") / 100;

        // Determinar se atingiu metas
        const atingiuMetaQuinzenal = metaQuinzenal > 0 && totalQuinzenal >= metaQuinzenal;
        const atingiuMetaMensal = metaMensal > 0 && totalMes >= metaMensal;
        const atingiuSuperMeta = superMetaValor > 0 && totalMes >= superMetaValor;

        // Calcular valores de bonificação
        const pctQAplicado = atingiuMetaQuinzenal ? pctQComMeta : pctQSemMeta;
        const valorQuinzenal = Math.round(totalQuinzenal * pctQAplicado * 100) / 100;

        let valorMensal = 0;
        let valorSuperMetaCalc = 0;
        if (atingiuSuperMeta) {
          valorSuperMetaCalc = Math.round(totalMes * pctSuperMeta * 100) / 100;
        } else if (atingiuMetaMensal) {
          valorMensal = Math.round(totalMes * pctMComMeta * 100) / 100;
        } else {
          valorMensal = Math.round(totalMes * pctMSemMeta * 100) / 100;
        }

        const totalPago = valorQuinzenal + valorMensal + valorSuperMetaCalc;

        // Upsert no histórico de bonificações
        const payload = {
          tenantId,
          empresaSlug: slug,
          mes,
          ano,
          faturamentoTotal: totalMes.toFixed(2),
          metaMensal: metaMensal.toFixed(2),
          superMeta: superMetaValor.toFixed(2),
          atingiuMeta: atingiuMetaMensal ? 1 : 0,
          atingiuSuperMeta: atingiuSuperMeta ? 1 : 0,
          valorQuinzenal: valorQuinzenal.toFixed(2),
          valorMensal: valorMensal.toFixed(2),
          valorSuperMeta: valorSuperMetaCalc.toFixed(2),
          totalPago: totalPago.toFixed(2),
          observacao: `Fechamento automático em ${dataHora}`,
        };

        // Verificar se já existe registro para este mês/empresa
        const existing = await db.select().from(bonificacaoHistorico).where(
          and(
            eq(bonificacaoHistorico.tenantId, tenantId),
            eq(bonificacaoHistorico.empresaSlug, slug),
            eq(bonificacaoHistorico.mes, mes),
            eq(bonificacaoHistorico.ano, ano),
          )
        ).limit(1);

        if (existing.length > 0) {
          // Só atualiza se ainda não foi marcado como pago
          if (!existing[0].pagoEm) {
            await db.update(bonificacaoHistorico).set(payload).where(eq(bonificacaoHistorico.id, existing[0].id));
            console.log(`[Bonificação Job] ${slug}: histórico atualizado — R$ ${totalPago.toFixed(2)}`);
          } else {
            console.log(`[Bonificação Job] ${slug}: já pago em ${existing[0].pagoEm?.toLocaleDateString("pt-BR")}, pulando atualização.`);
          }
        } else {
          await db.insert(bonificacaoHistorico).values(payload);
          console.log(`[Bonificação Job] ${slug}: histórico criado — R$ ${totalPago.toFixed(2)}`);
        }

        const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        const statusMeta = atingiuSuperMeta ? "🏆 Super Meta" : atingiuMetaMensal ? "✅ Meta atingida" : "⏳ Sem meta";
        resumo.push(`• ${slug}: Fat. ${fmtBRL(totalMes)} | Bonif. ${fmtBRL(totalPago)} | ${statusMeta}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Bonificação Job] Erro ao fechar mês para ${empresa.slug}:`, msg);
        resumo.push(`• ${empresa.slug}: ❌ Erro — ${msg}`);
      }
    }

    // Notificar o gestor sobre o fechamento
    if (resumo.length > 0) {
      const mesesNomes = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      await notifyOwner({
        title: `📊 Fechamento de Bonificações — ${mesesNomes[mes - 1]}/${ano}`,
        content: `O histórico de bonificações de ${mesesNomes[mes - 1]}/${ano} foi calculado automaticamente:\n\n${resumo.join("\n")}\n\nAcesse Histórico de Bonificações para revisar e marcar como pago.`,
      }).catch(() => {});
    }

    console.log(`[Bonificação Job] Fechamento ${mes}/${ano} concluído para tenant ${tenantId}: ${resumo.length} empresa(s)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[Bonificação Job] Erro crítico no fechamento ${mes}/${ano} para tenant ${tenantId}:`, msg);
  }
}

// ─── Job de fechamento mensal: roda no último dia do mês às 23h BRT (02:00 UTC) ───
// Cron: "0 0 2 28-31 * *" — roda nos dias 28-31 às 02:00 UTC (23h BRT)
// A função verifica internamente se é o último dia do mês antes de executar.
cron.schedule("0 0 2 28-31 * *", async () => {
  const agora = new Date();
  const agora_brt = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dia = agora_brt.getDate();
  const mes = agora_brt.getMonth() + 1;
  const ano = agora_brt.getFullYear();
  const ultimoDiaDoMes = new Date(ano, mes, 0).getDate();

  // Só executa se for o último dia do mês
  if (dia !== ultimoDiaDoMes) return;

  console.log(`[Bonificação Job] Fechamento automático do mês ${mes}/${ano} iniciado...`);

  const configs = await listAllActiveCashbarberConfigs().catch(() => []);
  const tenantIds = Array.from(new Set(configs.map((c) => c.tenantId)));

  for (const tenantId of tenantIds) {
    await fecharMesBonificacoes(tenantId, mes, ano);
  }
});

console.log("[Bonificação Job] Job de fechamento mensal agendado (último dia do mês às 23h BRT)");

/**
 * Exporta a função para ser chamada manualmente via painel de administração.
 */
export { fecharMesBonificacoes };
