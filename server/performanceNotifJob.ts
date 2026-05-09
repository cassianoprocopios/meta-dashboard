/**
 * performanceNotifJob.ts
 *
 * Job de notificação de performance às 12h (horário de Brasília).
 * Gera mensagens personalizadas de ranking para cada profissional com telefone cadastrado
 * e as armazena no banco para que a gerente possa enviar via WhatsApp com 1 clique.
 *
 * Também executa o ranking semanal toda segunda-feira às 09h.
 */
import * as cron from "node-cron";
import { getDb, listarColaboradores, listarRankingPorPeriodo, getEmpresasByTenant, getMetasByMesAndTenant, getAllFaturamentosByTenant } from "./db";

// ─── Estado ───────────────────────────────────────────────────────────────────
let _jobDiario: cron.ScheduledTask | null = null;
let _jobSemanal: cron.ScheduledTask | null = null;
let _ultimaGeracaoDiaria: Date | null = null;
let _ultimaGeracaoSemanal: Date | null = null;

export function getStatusPerformanceNotifJob() {
  return {
    jobDiarioAtivo: _jobDiario !== null,
    jobSemanalAtivo: _jobSemanal !== null,
    ultimaGeracaoDiaria: _ultimaGeracaoDiaria,
    ultimaGeracaoSemanal: _ultimaGeracaoSemanal,
  };
}

// ─── Formatação ───────────────────────────────────────────────────────────────
const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_PT = ["Domingo","Segunda","Terça","Quarta","Quinta","Sexta","Sábado"];

// ─── Geração de mensagens de ranking diário ───────────────────────────────────
export async function gerarMensagensRankingDiario(tenantId: number, appUrl: string = "https://barbiero.manus.space") {
  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();
  const dataHoje = `${ano}-${String(mes).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
  const nomeMes = MESES_PT[mes - 1];
  const diaSemana = DIAS_PT[agora.getDay()];

  const [{ itens }, colaboradoresList, empresasList, metasList, faturamentosMes] = await Promise.all([
    listarRankingPorPeriodo(tenantId, mes, ano),
    listarColaboradores(tenantId),
    getEmpresasByTenant(tenantId),
    getMetasByMesAndTenant(tenantId, mes, ano),
    getAllFaturamentosByTenant(tenantId, mes, ano),
  ]);

  // Faturamento acumulado por empresa
  const fatPorEmpresa = new Map<string, number>();
  for (const f of faturamentosMes) {
    const slug = f.empresaSlug;
    const total = (Number(f.cat1)||0)+(Number(f.cat2)||0)+(Number(f.cat3)||0)+
      (Number(f.cat4)||0)+(Number(f.cat5)||0)+(Number(f.cat6)||0)+
      (Number(f.cat7)||0)+(Number(f.cat8)||0)+(Number(f.cat9)||0);
    fatPorEmpresa.set(slug, (fatPorEmpresa.get(slug) ?? 0) + total);
  }

  // Meta por empresa
  const metaPorEmpresa = new Map<string, number>();
  for (const m of metasList) {
    if (m.empresaSlug) metaPorEmpresa.set(m.empresaSlug, Number(m.metaMensal) || 0);
  }

  // Calcular dias restantes no mês
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diasRestantes = Math.max(0, diasNoMes - agora.getDate());

  const rankingOrdenado = itens
    .filter((i) => i.totalGeral > 0)
    .sort((a, b) => b.totalGeral - a.totalGeral);

  const mensagens: Array<{
    colaboradorId: number;
    nome: string;
    apelido: string | null;
    telefone: string | null;
    linkWhatsApp: string | null;
    posicao: number;
    totalGeral: number;
    mensagem: string;
    empresaSlug: string;
  }> = [];

  for (let i = 0; i < rankingOrdenado.length; i++) {
    const item = rankingOrdenado[i];
    const posicao = i + 1;
    const acimaDele = i > 0 ? rankingOrdenado[i - 1] : null;
    const faltaParaSubir = acimaDele ? Math.max(0, acimaDele.totalGeral - item.totalGeral + 0.01) : null;
    const col = colaboradoresList.find((c) => c.id === item.colaboradorId);
    if (!col || !col.telefone) continue; // Pular profissionais sem telefone

    const nomeExib = item.apelido || item.nome.split(" ")[0];
    const medalha = posicao === 1 ? "🥇" : posicao === 2 ? "🥈" : posicao === 3 ? "🥉" : `${posicao}º`;
    const empresaSlug = col.empresaSlug ?? item.empresaSlug ?? "";
    const empresa = empresasList.find((e) => e.slug === empresaSlug);
    const nomeEmpresa = empresa?.nome ?? empresaSlug;
    const fatUnidade = fatPorEmpresa.get(empresaSlug) ?? 0;
    const metaUnidade = metaPorEmpresa.get(empresaSlug) ?? 0;
    const pctMeta = metaUnidade > 0 ? Math.round((fatUnidade / metaUnidade) * 100) : null;
    const faltaMeta = metaUnidade > 0 ? Math.max(0, metaUnidade - fatUnidade) : null;

    // Meta individual
    const metaIndividual = col.metaMensal ? Number(col.metaMensal) : null;
    const pctMetaIndividual = metaIndividual && metaIndividual > 0
      ? Math.round((item.totalGeral / metaIndividual) * 100) : null;
    const faltaMetaIndividual = metaIndividual ? Math.max(0, metaIndividual - item.totalGeral) : null;
    const mediaDiaria = agora.getDate() > 0 ? item.totalGeral / agora.getDate() : 0;
    const metaDiariaNecessaria = faltaMetaIndividual && diasRestantes > 0
      ? Math.round((faltaMetaIndividual / diasRestantes) * 100) / 100 : null;

    // Montar mensagem
    let msg = `Olá ${nomeExib}! ✂️\n\n`;
    msg += `☀️ *${diaSemana}, ${agora.getDate()} de ${nomeMes}*\n\n`;

    // Posição no ranking
    msg += `🏆 *Ranking ${nomeMes}/${ano}*\n`;
    msg += `Posição: *${medalha} ${posicao}º lugar*\n`;
    msg += `Faturamento: *${fmtBRL(item.totalGeral)}*\n`;
    if (item.qtdServicos > 0) msg += `Atendimentos: *${item.qtdServicos}*\n`;

    // Meta individual
    if (metaIndividual && pctMetaIndividual != null) {
      const semaforoInd = pctMetaIndividual >= 100 ? "🟢" : pctMetaIndividual >= 70 ? "🟡" : "🔴";
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🎯 *Sua Meta Individual*\n`;
      msg += `${semaforoInd} ${pctMetaIndividual}% da meta (${fmtBRL(metaIndividual)})\n`;
      if (faltaMetaIndividual && faltaMetaIndividual > 0) {
        msg += `Falta: *${fmtBRL(faltaMetaIndividual)}*\n`;
        if (metaDiariaNecessaria && diasRestantes > 0) {
          msg += `Precisa: *${fmtBRL(metaDiariaNecessaria)}/dia* nos próximos ${diasRestantes}d\n`;
        }
      } else if (pctMetaIndividual >= 100) {
        msg += `🎉 *Meta batida! Parabéns!*\n`;
      }
    }

    // Falta para subir
    if (faltaParaSubir && faltaParaSubir > 0 && faltaParaSubir < 2000) {
      msg += `\n🔥 *${fmtBRL(faltaParaSubir)} para subir uma posição!*\n`;
    }

    // Unidade
    if (fatUnidade > 0) {
      msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
      msg += `🏢 *${nomeEmpresa} — ${nomeMes}/${ano}*\n`;
      msg += `Faturamento: *${fmtBRL(fatUnidade)}*`;
      if (metaUnidade > 0 && pctMeta != null) {
        const semaforo = pctMeta >= 100 ? "🟢" : pctMeta >= 70 ? "🟡" : "🔴";
        msg += ` ${semaforo} ${pctMeta}%`;
        if (faltaMeta && faltaMeta > 0) msg += `\nFalta para meta da unidade: *${fmtBRL(faltaMeta)}*`;
      }
      msg += `\n`;
    }

    msg += `\n📱 Ver ranking completo: ${appUrl}/pro`;

    const telefoneFormatado = col.telefone.replace(/\D/g, "");
    const numeroFinal = telefoneFormatado.startsWith("55") ? telefoneFormatado : `55${telefoneFormatado}`;
    const linkWa = `https://wa.me/${numeroFinal}?text=${encodeURIComponent(msg)}`;

    mensagens.push({
      colaboradorId: item.colaboradorId,
      nome: item.nome,
      apelido: item.apelido ?? null,
      telefone: col.telefone,
      linkWhatsApp: linkWa,
      posicao,
      totalGeral: item.totalGeral,
      mensagem: msg,
      empresaSlug,
    });
  }

  return { mensagens, dataHoje, mes, ano, nomeMes, totalComTelefone: mensagens.length };
}

// ─── Geração de ranking semanal ───────────────────────────────────────────────
export async function gerarRankingSemanal(tenantId: number) {
  const agora = new Date();
  // Semana anterior: de segunda a domingo
  const diaSemana = agora.getDay(); // 0=Dom, 1=Seg...
  const diasAteSegunda = diaSemana === 0 ? 6 : diaSemana - 1;
  const inicioSemanaAnterior = new Date(agora);
  inicioSemanaAnterior.setDate(agora.getDate() - diasAteSegunda - 7);
  const fimSemanaAnterior = new Date(inicioSemanaAnterior);
  fimSemanaAnterior.setDate(inicioSemanaAnterior.getDate() + 6);

  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  const [{ itens }, colaboradoresList] = await Promise.all([
    listarRankingPorPeriodo(tenantId, mes, ano),
    listarColaboradores(tenantId),
  ]);

  const rankingOrdenado = itens
    .filter((i) => i.totalGeral > 0)
    .sort((a, b) => b.totalGeral - a.totalGeral);

  const dataInicioStr = inicioSemanaAnterior.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const dataFimStr = fimSemanaAnterior.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  return {
    ranking: rankingOrdenado.slice(0, 10).map((item, i) => ({
      posicao: i + 1,
      colaboradorId: item.colaboradorId,
      nome: item.nome,
      apelido: item.apelido,
      totalGeral: item.totalGeral,
      qtdServicos: item.qtdServicos,
      empresaSlug: item.empresaSlug,
    })),
    periodo: `${dataInicioStr} a ${dataFimStr}`,
    mes,
    ano,
  };
}

// ─── Inicialização dos jobs ───────────────────────────────────────────────────
export function iniciarPerformanceNotifJob() {
  if (_jobDiario) {
    console.log("[Performance Notif] Jobs já estão ativos.");
    return;
  }

  // Job diário às 12h (horário de Brasília)
  _jobDiario = cron.schedule("0 12 * * 1-6", async () => {
    console.log("[Performance Notif] Gerando mensagens de ranking das 12h...");
    try {
      const resultado = await gerarMensagensRankingDiario(1);
      _ultimaGeracaoDiaria = new Date();
      console.log(`[Performance Notif] ${resultado.totalComTelefone} mensagens geradas para ${resultado.dataHoje}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Performance Notif] Erro ao gerar mensagens:", msg);
    }
  }, { timezone: "America/Sao_Paulo" });

  // Job semanal toda segunda-feira às 09h (horário de Brasília)
  _jobSemanal = cron.schedule("0 9 * * 1", async () => {
    console.log("[Performance Notif] Gerando ranking semanal...");
    try {
      const resultado = await gerarRankingSemanal(1);
      _ultimaGeracaoSemanal = new Date();
      console.log(`[Performance Notif] Ranking semanal gerado: ${resultado.ranking.length} profissionais`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Performance Notif] Erro ao gerar ranking semanal:", msg);
    }
  }, { timezone: "America/Sao_Paulo" });

  console.log("[Performance Notif] Jobs iniciados: diário às 12h (seg-sab) e semanal às 09h (segunda)");
}

export function pararPerformanceNotifJob() {
  if (_jobDiario) { _jobDiario.stop(); _jobDiario = null; }
  if (_jobSemanal) { _jobSemanal.stop(); _jobSemanal = null; }
  console.log("[Performance Notif] Jobs parados.");
}
