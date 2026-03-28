/**
 * Job de sincronização automática do CashBarber
 *
 * Executa a cada hora para cada empresa com sincronização automática ativa.
 * Usa node-cron para agendar os jobs dinamicamente.
 */

import * as cron from "node-cron";
import { sincronizarFaturamentoCashbarber, aplicarDpoteParaTenant } from "./cashbarberSincronizador";

// ─── Intervalo fixo: a cada hora ─────────────────────────────────────────────

/** Expressão cron para execução a cada hora (no minuto 0 de cada hora) */
const CRON_CADA_HORA = "0 0 * * * *";

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
      // Após atualizar os dados, verificar se alguma empresa atingiu a meta diária
      await verificarMetaDiariaParaTenant(tenantId);
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

  console.log("[CashBarber Job] Sistema inicializado com sucesso");
}

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
              (c) => c.ativo === 1 && c.exibirNoRanking === 1 && c.cashbarberProfissionalId != null
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
        const fmtBRL = (v: number) =>
          v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

        const linhas = top3.map((r, i) => {
          const medalha = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
          return `${medalha} ${r.nome}: ${fmtBRL(r.total)}`;
        });

        await notifyOwner({
          title: `🏆 Top 3 do Dia — ${hoje.toLocaleDateString("pt-BR")}`,
          content: linhas.join("\n") + `\n\n${resultados.length} profissionais com dados hoje.`,
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
