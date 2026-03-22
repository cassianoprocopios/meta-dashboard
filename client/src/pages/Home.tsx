import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Calendar, Plus, AlertCircle,
  CheckCircle2, Clock, Building2, Users, Loader2, LogIn, LogOut, Shield, Menu, X as XIcon, Sparkles,
  Crosshair, ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, ChevronRight, BellRing, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import FaturamentoForm from "@/components/FaturamentoForm";
import MetaConfig from "@/components/MetaConfig";
import AdminUsers from "@/pages/AdminUsers";
import Empresas from "@/pages/Empresas";
import Auditoria from "@/pages/Auditoria";
import AnaliseIA from "@/pages/AnaliseIA";
import Bonificacao from "@/pages/Bonificacao";
import SuperAdmin from "@/pages/SuperAdmin";
import TenantBloqueado from "@/pages/TenantBloqueado";
import { useTheme } from "@/contexts/ThemeContext";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function pct(v: number, total: number) {
  if (total === 0) return 0;
  return Math.round((v / total) * 100);
}

type Tab = "dashboard" | "lancamentos" | "metas" | "bonificacao" | "usuarios" | "empresas" | "auditoria" | "ia";

function LogoutButton() {
  const logoutMutation = trpc.auth.logoutApp.useMutation({
    onSuccess: () => { window.location.reload(); },
  });
  return (
    <button
      onClick={() => logoutMutation.mutate()}
      disabled={logoutMutation.isPending}
      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      title="Sair"
    >
      {logoutMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
    </button>
  );
}

export default function Home() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano] = useState(hoje.getFullYear());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  // Filtro de período: mensal ou semanal
  const [periodoFiltro, setPeriodoFiltro] = useState<"mensal" | "semanal">("mensal");
  const [semanaIdx, setSemanaIdx] = useState<number>(() => {
    // Inicializa na semana atual
    const diaHojeInit = new Date().getDate();
    return Math.floor((diaHojeInit - 1) / 7);
  });
  const [showFaturamentoForm, setShowFaturamentoForm] = useState(false);
  const [editingFaturamento, setEditingFaturamento] = useState<any>(null);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  const isAdmin = user?.role === "admin";
  const isGerente = user?.perfil === "gerente" || isAdmin;
  const isRecepcionista = user?.perfil === "recepcionista";
  const empresaVinculada = user?.empresaVinculada ?? null;
  // Super-admin: utilizador sem tenantId é o owner do sistema
  const isSuperAdmin = isAdmin && !(user as any)?.tenantId;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Verificar status do tenant (bloqueado/expirado)
  const { data: tenantStatus } = trpc.auth.tenantStatus.useQuery(
    undefined,
    { enabled: !!(user as any)?.tenantId, refetchInterval: 5 * 60 * 1000 }
  );

  // Se o tenant estiver bloqueado ou expirado, mostrar tela de bloqueio
  if (tenantStatus && tenantStatus.status !== "ok") {
    return (
      <TenantBloqueado
        status={tenantStatus.status as "blocked" | "expired" | "not_found"}
        message={(tenantStatus as any).message}
      />
    );
  }
  // Recepcionista pode lançar faturamentos mas NÃO pode ver metas, bonificação, usuários, empresas, auditoria, lançamentos histórico
  const podeLancarFaturamento = isGerente || isRecepcionista;
  // Tabs visíveis para recepcionista: apenas dashboard
  const tabsVisiveis: Tab[] = isRecepcionista
    ? ["dashboard"]
    : [
        "dashboard",
        "lancamentos",
        ...(isGerente ? ["metas"] as Tab[] : []),
        ...(isGerente ? ["bonificacao"] as Tab[] : []),
        ...(isGerente ? ["ia"] as Tab[] : []),
      ];

  // Queries
  const { data: empresasData = [], isLoading: loadingEmpresas } = trpc.empresa.listar.useQuery();
  const { data: faturamentosData = [], isLoading: loadingFat, refetch: refetchFat } =
    trpc.faturamento.listar.useQuery({ mes, ano });
  const { data: metasData = [], isLoading: loadingMetas, refetch: refetchMetas } =
    trpc.meta.listar.useQuery({ mes, ano });

  // Mês anterior para comparativo
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  const { data: faturamentosAnteriorData = [] } = trpc.faturamento.listar.useQuery(
    { mes: mesAnterior, ano: anoAnterior },
    { enabled: activeTab === "dashboard" }
  );
  // Empresas do utilizador (múltiplas unidades)
  const { data: userEmpresasSlugs = [] } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user && !isAdmin }
  );

  const deletarFat = trpc.faturamento.excluir.useMutation();

  // Mutation para notificar o gerente sobre projeção abaixo da meta
  const notificarAlerta = trpc.alertas.notificarProjecaoBaixaMeta.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: () => {
      toast.error("Erro ao enviar notificação. Tente novamente.");
    },
  });

  // Mutation para verificar e enviar notificações de meta atingida e mudança de ranking
  const verificarEventosNotificacao = trpc.notificacoes.verificarEventos.useMutation({
    onSuccess: (data) => {
      if (data.notificacoesEnviadas.length > 0) {
        toast.success(`${data.total} notificação(ões) enviada(s) ao gerente.`);
      }
    },
  });

  // Empresas visíveis para este usuário
  const empresasVisiveis = useMemo(() => {
    if (isAdmin) return empresasData;
    // Se tem userEmpresas definidas, usar essas
    if (userEmpresasSlugs.length > 0) {
      return empresasData.filter((e) => userEmpresasSlugs.includes(e.slug));
    }
    // Fallback: empresaVinculada legado
    if (empresaVinculada) return empresasData.filter((e) => e.slug === empresaVinculada);
    return empresasData;
  }, [empresasData, empresaVinculada, userEmpresasSlugs, isAdmin]);

  // Calcular semanas do mês selecionado
  const semanasMes = useMemo(() => {
    const totalDias = new Date(ano, mes, 0).getDate();
    const semanas: { label: string; inicio: number; fim: number }[] = [];
    let dia = 1;
    while (dia <= totalDias) {
      const inicio = dia;
      const fim = Math.min(dia + 6, totalDias);
      semanas.push({
        label: `Sem. ${semanas.length + 1} (${inicio}–${fim})`,
        inicio,
        fim,
      });
      dia += 7;
    }
    return semanas;
  }, [mes, ano]);

  // Semana selecionada (clampada ao total de semanas disponíveis)
  const semanaAtual = semanasMes[Math.min(semanaIdx, semanasMes.length - 1)];

  // Dados filtrados pelo período (mensal = todos; semanal = apenas dias da semana)
  const faturamentosFiltrados = useMemo(() => {
    if (periodoFiltro === "mensal" || !semanaAtual) return faturamentosData;
    return (faturamentosData as any[]).filter((f: any) => {
      const dia = parseInt(f.data.split("-")[2]);
      return dia >= semanaAtual.inicio && dia <= semanaAtual.fim;
    });
  }, [faturamentosData, periodoFiltro, semanaAtual]);

  const faturamentosAnteriorFiltrados = useMemo(() => {
    if (periodoFiltro === "mensal" || !semanaAtual) return faturamentosAnteriorData;
    return (faturamentosAnteriorData as any[]).filter((f: any) => {
      const dia = parseInt(f.data.split("-")[2]);
      return dia >= semanaAtual.inicio && dia <= semanaAtual.fim;
    });
  }, [faturamentosAnteriorData, periodoFiltro, semanaAtual]);

  // Calcular totais por empresa
  const statsPorEmpresa = useMemo(() => {
    // Dia atual do mês (para calcular dias decorridos até hoje)
    const hoje = new Date();
    const diaHoje = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
      ? hoje.getDate()
      : new Date(ano, mes, 0).getDate(); // se mês passado, usa último dia do mês
    const ehPrimeiraQuinzena = diaHoje <= 15;
    const diaHojeQuinzenal = Math.min(diaHoje, 15); // cap em 15 para quinzenal

    return empresasVisiveis.map((emp) => {
      const rows = faturamentosFiltrados.filter((f: any) => f.empresaSlug === emp.slug);

      // Separar lançamentos realizados (dia ≤ hoje) de previstos (dia > hoje)
      const rowsRealizados = rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= diaHoje);
      const rowsPrevistos = rows.filter((r: any) => parseInt(r.data.split("-")[2]) > diaHoje);

      // Total geral (realizados + previstos) para exibir no card
      const total = rows.reduce((s: number, r: any) => {
        return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
          .reduce((acc: number, v: any) => acc + parseFloat(v || "0"), 0);
      }, 0);
      // Total apenas realizados (para cálculos de média, máximo, mínimo)
      const totalRealizado = rowsRealizados.reduce((s: number, r: any) => {
        return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
          .reduce((acc: number, v: any) => acc + parseFloat(v || "0"), 0);
      }, 0);
      const totalPrevisto = total - totalRealizado;

      const diasLancados = rows.length;
      const diasRealizados = rowsRealizados.length;
      const diasPrevistos = rowsPrevistos.length;

      // Média diária apenas sobre dias realizados
      const mediaDiaria = diasRealizados > 0 ? totalRealizado / diasRealizados : 0;

      // Máximo e mínimo diário apenas sobre dias realizados
      const totaisDiariosRealizados = rowsRealizados.map((r: any) =>
        [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0)
      );
      const maiorDia = totaisDiariosRealizados.length > 0 ? Math.max(...totaisDiariosRealizados) : 0;
      const menorDia = totaisDiariosRealizados.length > 0 ? Math.min(...totaisDiariosRealizados) : 0;

      const meta = metasData.find((m: any) => m.empresaSlug === emp.slug);
      const metaMensal = parseFloat(String(meta?.metaMensal || "0"));
      const metaQuinzenal = parseFloat(String(meta?.metaQuinzenal || "0"));
      const diasUteis = meta?.diasUteis ?? 26;
      const diasUteisQuinzenal = meta?.diasUteisQuinzenal ?? 13;

      // Meta diária fixa: divide pelo total de dias úteis do mês
      const metaDiariaMensal = diasUteis > 0 ? metaMensal / diasUteis : 0;
      const metaDiariaQuinzenal = diasUteisQuinzenal > 0 ? metaQuinzenal / diasUteisQuinzenal : 0;

      // Dias úteis decorridos até hoje (proporcional ao dia atual do mês)
      // Usa a proporção: diasUteisDecorridos = diasUteis * (diaHoje / totalDiasMes)
      const totalDiasMes = new Date(ano, mes, 0).getDate();
      const diasUteisDecorridos = Math.round(diasUteis * (diaHoje / totalDiasMes));
      const diasUteisDecrridosQuinzenal = Math.round(diasUteisQuinzenal * (diaHojeQuinzenal / 15));

      // Meta acumulada esperada até hoje (apenas dias passados)
      const metaEsperadaAteHoje = metaDiariaMensal * diasUteisDecorridos;
      const metaEsperadaQuinzenalAteHoje = metaDiariaQuinzenal * diasUteisDecrridosQuinzenal;

      // Dias úteis restantes no mês
      // Quinzenal: apenas realizados até dia 15
      const rowsQuinzenal = rowsRealizados.filter((r: any) => parseInt(r.data.split("-")[2]) <= 15);
      const diasLancadosQuinzenal = rowsQuinzenal.length;
      const totalQuinzenal = rowsQuinzenal.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);

      const diasUteisRestantes = Math.max(0, diasUteis - diasUteisDecorridos);
      const diasUteisRestantesQuinzenal = Math.max(0, diasUteisQuinzenal - diasUteisDecrridosQuinzenal);

      // Meta/dia dinâmica: quanto precisa fazer por dia útil restante para atingir a meta
      // Usa totalRealizado para não contar previstos como já conquistados
      const faltaMensal = Math.max(0, metaMensal - totalRealizado);
      const metaDiariaDinamicaMensal = diasUteisRestantes > 0 ? faltaMensal / diasUteisRestantes : 0;

      const faltaQuinzenal = Math.max(0, metaQuinzenal - totalQuinzenal);
      const metaDiariaDinamicaQuinzenal = diasUteisRestantesQuinzenal > 0 ? faltaQuinzenal / diasUteisRestantesQuinzenal : 0;

      // Projeção: baseada apenas nos dias realizados
      const projecaoFinal = diasRealizados > 0 && diasUteis > 0
        ? (totalRealizado / diasRealizados) * diasUteis
        : 0;

      // Totais por categoria
      const catTotals = [0, 0, 0, 0, 0];
      rows.forEach((r: any) => {
        catTotals[0] += parseFloat(r.cat1 || "0");
        catTotals[1] += parseFloat(r.cat2 || "0");
        catTotals[2] += parseFloat(r.cat3 || "0");
        catTotals[3] += parseFloat(r.cat4 || "0");
        catTotals[4] += parseFloat(r.cat5 || "0");
      });

      return {
        emp,
        total,
        totalRealizado,
        totalPrevisto,
        totalQuinzenal,
        diasLancados,
        diasRealizados,
        diasPrevistos,
        diasLancadosQuinzenal,
        mediaDiaria,
        maiorDia,
        menorDia,
        metaMensal,
        metaQuinzenal,
        metaDiariaMensal,
        metaDiariaQuinzenal,
        metaDiariaDinamicaMensal,
        metaDiariaDinamicaQuinzenal,
        diasUteis,
        diasUteisQuinzenal,
        diasUteisDecorridos,
        diasUteisRestantes,
        diasUteisRestantesQuinzenal,
        metaEsperadaAteHoje,
        metaEsperadaQuinzenalAteHoje,
        projecaoFinal,
        // Progresso real vs meta esperada até hoje (baseado em realizados)
        progressoMensal: metaEsperadaAteHoje > 0 ? Math.min((totalRealizado / metaEsperadaAteHoje) * 100, 150) : (metaMensal > 0 ? Math.min((totalRealizado / metaMensal) * 100, 100) : 0),
        progressoQuinzenal: metaEsperadaQuinzenalAteHoje > 0 ? Math.min((totalQuinzenal / metaEsperadaQuinzenalAteHoje) * 100, 150) : (metaQuinzenal > 0 ? Math.min((totalQuinzenal / metaQuinzenal) * 100, 100) : 0),
        catTotals,
        rows,
        rowsRealizados,
        rowsPrevistos,
      };
    });
  }, [empresasVisiveis, faturamentosFiltrados, metasData]);

  const totalGeral = statsPorEmpresa.reduce((s, e) => s + e.total, 0);
  const totalGeralRealizado = statsPorEmpresa.reduce((s, e) => s + e.totalRealizado, 0);
  const totalGeralPrevisto = statsPorEmpresa.reduce((s, e) => s + e.totalPrevisto, 0);
  const metaTotalGeral = statsPorEmpresa.reduce((s, e) => s + e.metaMensal, 0);
  const metaQuinzenalTotal = statsPorEmpresa.reduce((s, e) => s + e.metaQuinzenal, 0);

  // Comparativo com mês anterior: usar apenas os mesmos dias já apurados no mês atual
  const comparativoMesAnterior = useMemo(() => {
    // Dias já lançados no mês atual (por empresa e global)
    const diasAtualPorEmpresa: Record<string, Set<number>> = {};
    const diasAtualGlobal = new Set<number>();
    faturamentosFiltrados.forEach((f: any) => {
      const dia = parseInt(f.data.split("-")[2]);
      if (!diasAtualPorEmpresa[f.empresaSlug]) diasAtualPorEmpresa[f.empresaSlug] = new Set();
      diasAtualPorEmpresa[f.empresaSlug].add(dia);
      diasAtualGlobal.add(dia);
    });

    // Período exato: dia mínimo e máximo lançados no mês atual
    const diasOrdenados = Array.from(diasAtualGlobal).sort((a, b) => a - b);
    const diaInicio = diasOrdenados.length > 0 ? diasOrdenados[0] : 1;
    const diaFim = diasOrdenados.length > 0 ? diasOrdenados[diasOrdenados.length - 1] : 0;
    const periodoLabel = diaFim > 0 ? `dias ${diaInicio}–${diaFim}` : "sem lançamentos";

    // Total do mês anterior nos mesmos dias
    let totalAnteriorMesmosDias = 0;
    const porEmpresa: Record<string, { totalAtual: number; totalAnterior: number; diasAtual: number; diasAnterior: number }> = {};
    empresasVisiveis.forEach((emp) => {
      const diasAtual = diasAtualPorEmpresa[emp.slug] ?? new Set<number>();
      const rowsAtual = faturamentosFiltrados.filter((f: any) => f.empresaSlug === emp.slug);
      const totalAtual = rowsAtual.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      const rowsAnterior = faturamentosAnteriorFiltrados.filter((f: any) => {
        if (f.empresaSlug !== emp.slug) return false;
        const dia = parseInt(f.data.split("-")[2]);
        return diasAtual.has(dia);
      });
      const totalAnterior = rowsAnterior.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      totalAnteriorMesmosDias += totalAnterior;
      porEmpresa[emp.slug] = { totalAtual, totalAnterior, diasAtual: diasAtual.size, diasAnterior: rowsAnterior.length };
    });
    const variacaoTotal = totalGeral > 0 && totalAnteriorMesmosDias > 0
      ? ((totalGeral - totalAnteriorMesmosDias) / totalAnteriorMesmosDias) * 100
      : null;
    return { totalAnteriorMesmosDias, variacaoTotal, porEmpresa, periodoLabel, diaInicio, diaFim };
  }, [faturamentosFiltrados, faturamentosAnteriorFiltrados, empresasVisiveis, totalGeral]);

  // ─── ACURÁCIA DAS PREVISÕES ────────────────────────────────────────────────
  // Para cada empresa, encontra dias que foram lançados como "previsto" (dia > hoje
  // no momento do lançamento) e que já têm um lançamento realizado posterior.
  // Como não temos flag no banco, usamos o seguinte critério:
  //   - Dias do mês atual que já passaram (dia <= diaHoje)
  //   - Que possuem DOIS registros: um lançado antes da data (previsto) e um após
  // Na prática, o sistema salva um único registro por (empresa, data) via upsert,
  // portanto comparamos: se um dia já passou e tinha sido previsto (dia > diaHoje
  // quando foi criado), o valor atual é o realizado. Para rastrear isso precisamos
  // de uma abordagem diferente: comparamos o valor do dia no mês atual com o valor
  // que estava previsto. Como o upsert substitui o previsto pelo realizado, a
  // acurácia é calculada com base nos dias do mês anterior que foram previstos
  // (usando faturamentosAnteriorData como proxy de "previsões do mês passado").
  //
  // Abordagem realísta:
  //   - Dias previstos do mês ANTERIOR (dia > diaFimAnterior quando foram lançados)
  //     não são acessíveis sem flag no banco.
  //   - Portanto, calculamos a acurácia do MÊS ATUAL: dias que já passaram e
  //     têm valor lançado vs. a média diária esperada (proxy de previsão implícita).
  //
  // Implementação definitiva:
  //   Para cada empresa, identificamos os dias que no mês atual foram lançados
  //   como previstos (dia > diaHoje quando foram criados) e que já passaram.
  //   Como o banco não tem flag, usamos createdAt vs data do lançamento:
  //   se createdAt.date < data.date => foi lançado antecipadamente (previsto).
  const acuraciaPrevisoes = useMemo(() => {
    const hoje = new Date();
    const diaHoje = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
      ? hoje.getDate()
      : new Date(ano, mes, 0).getDate();

    // Identifica dias que foram lançados como previstos e já passaram.
    // Prioridade 1: campo totalPrevisto (novo — valor exato na criação).
    // Prioridade 2: createdAt < data do lançamento (retrocompatibilidade).
    const porEmpresa: Record<string, {
      diasAnalisados: number;
      somaErroPct: number;
      detalhes: Array<{ dia: number; valorPrevisto: number; valorRealizado: number; erroPct: number; fonte: "campo" | "createdAt" }>;
      acuraciaMedia: number;
    }> = {};

    empresasVisiveis.forEach((emp) => {
      const rows = faturamentosData.filter((f: any) => f.empresaSlug === emp.slug);
      const detalhes: Array<{ dia: number; valorPrevisto: number; valorRealizado: number; erroPct: number; fonte: "campo" | "createdAt" }> = [];

      rows.forEach((row: any) => {
        const dia = parseInt(row.data.split("-")[2]);
        // Considerar apenas dias que já passaram
        if (dia > diaHoje) return;

        const valorRealizado = [row.cat1, row.cat2, row.cat3, row.cat4, row.cat5]
          .reduce((a: number, v: any) => a + parseFloat(v || "0"), 0);

        let valorPrevisto: number | null = null;
        let fonte: "campo" | "createdAt" = "campo";

        // Prioridade 1: campo totalPrevisto (preenchido automaticamente ao criar previsto)
        if (row.totalPrevisto !== null && row.totalPrevisto !== undefined) {
          valorPrevisto = parseFloat(row.totalPrevisto);
          fonte = "campo";
        } else {
          // Prioridade 2: createdAt < data do lançamento (retrocompatibilidade)
          const createdAtDate = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt);
          const dataLancamento = new Date(ano, mes - 1, dia);
          // Usar apenas a data (sem hora) para comparar
          const createdDay = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), createdAtDate.getDate());
          const lancDay = new Date(dataLancamento.getFullYear(), dataLancamento.getMonth(), dataLancamento.getDate());
          if (createdDay < lancDay) {
            // Foi lançado antes do dia — usa o valor atual como proxy do previsto
            // e compara com o mês anterior para estimar o erro
            const rowAnterior = faturamentosAnteriorData.find(
              (f: any) => f.empresaSlug === emp.slug && parseInt(f.data.split("-")[2]) === dia
            );
            if (rowAnterior) {
              // Usa mês anterior como referência de "o que seria esperado"
              valorPrevisto = [rowAnterior.cat1, rowAnterior.cat2, rowAnterior.cat3, rowAnterior.cat4, rowAnterior.cat5]
                .reduce((a: number, v: any) => a + parseFloat(v || "0"), 0);
            } else {
              // Sem referência: assume 0% de erro (não penaliza)
              valorPrevisto = valorRealizado;
            }
            fonte = "createdAt";
          }
        }

        if (valorPrevisto === null) return; // não foi previsto
        if (valorPrevisto === 0 && valorRealizado === 0) return;

        const erroPct = valorPrevisto > 0
          ? Math.abs((valorRealizado - valorPrevisto) / valorPrevisto) * 100
          : valorRealizado > 0 ? 100 : 0;

        detalhes.push({ dia, valorPrevisto, valorRealizado, erroPct, fonte });
      });

      const diasAnalisados = detalhes.length;
      const somaErroPct = detalhes.reduce((s, d) => s + d.erroPct, 0);
      const acuraciaMedia = diasAnalisados > 0
        ? Math.max(0, 100 - somaErroPct / diasAnalisados)
        : null as unknown as number;

      porEmpresa[emp.slug] = { diasAnalisados, somaErroPct, detalhes, acuraciaMedia };
    });

    // Acuácia global (média ponderada)
    const totalDias = Object.values(porEmpresa).reduce((s, e) => s + e.diasAnalisados, 0);
    const somaErroGlobal = Object.values(porEmpresa).reduce((s, e) => s + e.somaErroPct, 0);
    const acuraciaGlobal = totalDias > 0 ? Math.max(0, 100 - somaErroGlobal / totalDias) : null;

    return { porEmpresa, acuraciaGlobal, totalDias };
  }, [faturamentosData, faturamentosAnteriorData, empresasVisiveis, mes, ano]);

  // Empresas em risco: projeção de fechamento abaixo de 80% da meta mensal
  const LIMIAR_ALERTA = 80; // percentual
  const empresasEmRisco = useMemo(() => {
    return statsPorEmpresa
      .filter((s) => {
        if (s.metaMensal === 0 || s.projecaoFinal === 0) return false;
        if (s.totalRealizado >= s.metaMensal) return false; // já atingiu
        const pctProjecao = (s.projecaoFinal / s.metaMensal) * 100;
        return pctProjecao < LIMIAR_ALERTA;
      })
      .map((s) => ({
        nome: s.emp.nome,
        projecao: s.projecaoFinal,
        meta: s.metaMensal,
        percentualProjecao: (s.projecaoFinal / s.metaMensal) * 100,
        totalRealizado: s.totalRealizado,
        diasRealizados: s.diasRealizados,
      }));
  }, [statsPorEmpresa]);

  // Dados para gráfico de barras
  const barData = useMemo(() => {
    return empresasVisiveis.map((emp) => {
      const stats = statsPorEmpresa.find((s) => s.emp.slug === emp.slug)!;
      if (!stats) return null;
      const labels = emp.tipoCategorias === "seraphine"
        ? ["Cabelo", "Manicure e Pedicure", "Outros Serviços", "Pacote", "Recorrência"]
        : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
      return {
        empresa: emp.nome,
        cor: emp.cor,
        total: stats.total,
        meta: stats.metaMensal,
        mediaDiaria: stats.mediaDiaria,
        cat: labels.map((l, i) => ({ label: l, valor: stats.catTotals[i] })),
      };
    }).filter(Boolean);
  }, [empresasVisiveis, statsPorEmpresa]);

  // Dados para gráfico de linha diário (mês atual vs mês anterior)
  const lineDataDiario = useMemo(() => {
    const hoje = new Date();
    const diaHojeGlobal = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
      ? hoje.getDate()
      : new Date(ano, mes, 0).getDate();

    // Determinar todos os dias que aparecem em qualquer um dos dois meses
    const diasSet = new Set<number>();
    faturamentosFiltrados.forEach((f: any) => diasSet.add(parseInt(f.data.split("-")[2])));
    faturamentosAnteriorFiltrados.forEach((f: any) => diasSet.add(parseInt(f.data.split("-")[2])));
    const dias = Array.from(diasSet).sort((a, b) => a - b);

    // Somar faturamento total (todas as empresas visíveis) por dia
    const somaPorDia = (rows: any[]) => {
      const mapa: Record<number, number> = {};
      rows.forEach((f: any) => {
        if (!empresasVisiveis.find((e) => e.slug === f.empresaSlug)) return;
        const dia = parseInt(f.data.split("-")[2]);
        const total = [f.cat1, f.cat2, f.cat3, f.cat4, f.cat5]
          .reduce((s: number, v: any) => s + parseFloat(v || "0"), 0);
        mapa[dia] = (mapa[dia] ?? 0) + total;
      });
      return mapa;
    };

    const mapaAtual = somaPorDia(faturamentosFiltrados);
    const mapaAnterior = somaPorDia(faturamentosAnteriorFiltrados);

    // Acumulado dia a dia — linha realizada e linha prevista separadas
    let acumRealizado = 0;
    let acumPrevistoTotal = 0; // acumulado dos dias previstos somado ao realizado
    let acumAnterior = 0;
    return dias.map((dia) => {
      const valorAtual = mapaAtual[dia] ?? null;
      const valorAnterior = mapaAnterior[dia] ?? null;
      const isPrevisto = dia > diaHojeGlobal;

      if (valorAtual !== null && !isPrevisto) acumRealizado += valorAtual;
      if (valorAtual !== null && isPrevisto) acumPrevistoTotal += valorAtual;
      if (valorAnterior !== null) acumAnterior += valorAnterior;

      return {
        dia,
        diaLabel: `${dia}`,
        isPrevisto,
        // Faturamento diário
        fatAtual: valorAtual,
        fatAnterior: valorAnterior,
        // Acumulado realizado (apenas dias ≤ hoje) — null para dias futuros
        acumAtual: !isPrevisto && valorAtual !== null ? acumRealizado : null,
        // Acumulado previsto (dias > hoje) — continua a partir do último realizado
        acumPrevisto: isPrevisto && valorAtual !== null ? acumRealizado + acumPrevistoTotal : null,
        // Acumulado mês anterior
        acumAnterior: valorAnterior !== null ? acumAnterior : null,
      };
    });
  }, [faturamentosFiltrados, faturamentosAnteriorFiltrados, empresasVisiveis, mes, ano]);

  // Dados para gráfico de barras de categorias Seraphine
  const barDataCategoriasSeraphine = useMemo(() => {
    const LABELS_SERAPHINE = ["Cabelo", "Manicure e Pedicure", "Outros Serviços", "Pacote", "Recorrência"];
    const COLORS_CAT = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
    // Filtrar apenas empresas do tipo seraphine com dados
    const seraphineStats = statsPorEmpresa.filter(
      (s) => s.emp.tipoCategorias === "seraphine" && s.total > 0
    );
    if (seraphineStats.length === 0) return null;
    // Montar dados no formato: cada barra = uma empresa, cada grupo = uma categoria
    const data = LABELS_SERAPHINE.map((label, i) => {
      const entry: Record<string, any> = { categoria: label, cor: COLORS_CAT[i] };
      seraphineStats.forEach((s) => {
        entry[s.emp.nome] = s.catTotals[i] || 0;
      });
      return entry;
    }).filter((entry) => {
      // Mostrar apenas categorias com pelo menos um valor > 0
      return seraphineStats.some((s) => (entry[s.emp.nome] || 0) > 0);
    });
    return { data, empresas: seraphineStats.map((s) => ({ nome: s.emp.nome, cor: s.emp.cor })) };
  }, [statsPorEmpresa]);

  // Dados para gráfico de pizza (por empresa)
  const pieDataEmpresas = useMemo(() => {
    return statsPorEmpresa
      .filter((s) => s.total > 0)
      .map((s) => ({ name: s.emp.nome, value: s.total, color: s.emp.cor }));
  }, [statsPorEmpresa]);

  // Alertas
  const alertas = useMemo(() => {
    const list: { tipo: "warning" | "success" | "info"; msg: string }[] = [];
    statsPorEmpresa.forEach((s) => {
      if (s.metaMensal === 0) return;
      const progresso = s.total / s.metaMensal;
      const diasPassados = s.diasLancados;
      const esperado = s.diasLancados > 0 ? (s.diasLancados / s.diasUteis) : 0;
      if (progresso < esperado * 0.85 && diasPassados > 0) {
        const faltaDia = s.metaDiariaMensal - s.mediaDiaria;
        list.push({
          tipo: "warning",
          msg: `${s.emp.nome}: média diária R$ ${fmt(s.mediaDiaria)} — precisa de +${fmt(faltaDia)}/dia para atingir a meta.`,
        });
      } else if (progresso >= 1) {
        list.push({ tipo: "success", msg: `${s.emp.nome}: Meta mensal atingida!` });
      } else if (diasPassados > 0) {
        list.push({ tipo: "info", msg: `${s.emp.nome}: No caminho certo. Média ${fmt(s.mediaDiaria)}/dia.` });
      }
      // Quinzenal
      if (s.metaQuinzenal > 0 && mes === hoje.getMonth() + 1 && hoje.getDate() <= 15) {
        const totalQuinzenal = s.rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= 15)
          .reduce((acc: number, r: any) => acc + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
            .reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
        if (totalQuinzenal < s.metaQuinzenal * 0.8 && s.diasUteisRestantesQuinzenal === 0) {
          list.push({ tipo: "warning", msg: `${s.emp.nome}: Meta quinzenal não atingida (${fmt(totalQuinzenal)} de ${fmt(s.metaQuinzenal)}).` });
        }
      }
    });
    if (list.length === 0 && totalGeral > 0) {
      list.push({ tipo: "success", msg: "Todas as unidades estão no caminho certo!" });
    }
    return list;
  }, [statsPorEmpresa, totalGeral]);

  const handleDeleteFat = async (id: number) => {
    try {
      await deletarFat.mutateAsync({ id });
      toast.success("Lançamento removido.");
      refetchFat();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover.");
    }
  };

  const loading = loadingEmpresas || loadingFat || loadingMetas;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-foreground leading-tight">Meta Dashboard</h1>
                <p className="text-xs text-muted-foreground leading-tight hidden sm:block">
                  {empresaVinculada
                    ? empresasData.find((e) => e.slug === empresaVinculada)?.nome ?? empresaVinculada
                    : "Todas as Unidades"}
                </p>
              </div>
            </div>

            {/* Ações desktop */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={mes}
                onChange={(e) => { setMes(Number(e.target.value)); setSemanaIdx(0); }}
                className="text-sm border border-border rounded-xl px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m} {ano}</option>
                ))}
              </select>
              {/* Filtro de período: Mensal / Semanal */}
              {activeTab === "dashboard" && (
                <div className="flex items-center rounded-xl border border-border overflow-hidden text-sm">
                  <button
                    onClick={() => setPeriodoFiltro("mensal")}
                    className={`px-3 py-1.5 transition-colors ${
                      periodoFiltro === "mensal"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setPeriodoFiltro("semanal")}
                    className={`px-3 py-1.5 transition-colors ${
                      periodoFiltro === "semanal"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "bg-background text-muted-foreground hover:bg-accent"
                    }`}
                  >
                    Semanal
                  </button>
                </div>
              )}
              {/* Navegação de semanas */}
              {activeTab === "dashboard" && periodoFiltro === "semanal" && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setSemanaIdx((i) => Math.max(0, i - 1))}
                    disabled={semanaIdx === 0}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-medium text-foreground min-w-[110px] text-center">
                    {semanaAtual?.label ?? ""}
                  </span>
                  <button
                    onClick={() => setSemanaIdx((i) => Math.min(semanasMes.length - 1, i + 1))}
                    disabled={semanaIdx >= semanasMes.length - 1}
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              {isSuperAdmin && (
                <>
                  <button onClick={() => setShowSuperAdmin(true)} className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors font-medium">
                    <Shield className="w-4 h-4" /> Super Admin
                  </button>
                  <a href="/admin" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                    <Users className="w-4 h-4" /> Admin
                  </a>
                  <a href="/dev" className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 px-3 py-1.5 rounded-xl hover:bg-indigo-50 transition-colors font-medium">
                    <Building2 className="w-4 h-4" /> Dev Panel
                  </a>
                </>
              )}
              {isAdmin && !isSuperAdmin && (
                <a href="/admin-panel" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors font-medium">
                  <Shield className="w-4 h-4" /> Painel Admin
                </a>
              )}
              {podeLancarFaturamento && (
                <Button onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm" size="sm">
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              )}
              {/* Botão de alternância de tema */}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              {user && (
                <div className="flex items-center gap-2 ml-1 pl-2 border-l border-border">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground leading-none">{user.name ?? user.email}</span>
                    <span className="text-xs text-muted-foreground leading-none mt-0.5 capitalize">{(user as any).perfil ?? user.role}</span>
                  </div>
                  <LogoutButton />
                </div>
              )}
              {!user && (
                <a href={getLoginUrl()} className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <LogIn className="w-4 h-4" /> Entrar
                </a>
              )}
            </div>

            {/* Ações mobile */}
            <div className="flex md:hidden items-center gap-2">
              {podeLancarFaturamento && (
                <button
                  onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                  className="p-2 rounded-xl bg-blue-600 text-white"
                  title="Novo Lançamento"
                >
                  <Plus className="w-4 h-4" />
                </button>
              )}
              {toggleTheme && (
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
                  title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                >
                  {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>
              )}
              <LogoutButton />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors"
              >
                {mobileMenuOpen ? <XIcon className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Menu mobile expandido */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-border py-3 space-y-1">
              {/* Seletor de mês */}
              <div className="px-1 pb-2">
                <label className="text-xs text-muted-foreground font-medium mb-1 block">Mês de referência</label>
                <select
                  value={mes}
                  onChange={(e) => { setMes(Number(e.target.value)); setSemanaIdx(0); setMobileMenuOpen(false); }}
                  className="w-full text-sm border border-border rounded-xl px-3 py-2 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {MESES.map((m, i) => (
                    <option key={i} value={i + 1}>{m} {ano}</option>
                  ))}
                </select>
              </div>
              {/* Filtro de período mobile */}
              {activeTab === "dashboard" && (
                <div className="px-1 pb-2">
                  <label className="text-xs text-muted-foreground font-medium mb-1 block">Período</label>
                  <div className="flex items-center rounded-xl border border-border overflow-hidden text-sm">
                    <button
                      onClick={() => setPeriodoFiltro("mensal")}
                      className={`flex-1 py-2 transition-colors ${
                        periodoFiltro === "mensal"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      Mensal
                    </button>
                    <button
                      onClick={() => setPeriodoFiltro("semanal")}
                      className={`flex-1 py-2 transition-colors ${
                        periodoFiltro === "semanal"
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "bg-background text-muted-foreground"
                      }`}
                    >
                      Semanal
                    </button>
                  </div>
                  {periodoFiltro === "semanal" && (
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => setSemanaIdx((i) => Math.max(0, i - 1))}
                        disabled={semanaIdx === 0}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-medium text-foreground">{semanaAtual?.label ?? ""}</span>
                      <button
                        onClick={() => setSemanaIdx((i) => Math.min(semanasMes.length - 1, i + 1))}
                        disabled={semanaIdx >= semanasMes.length - 1}
                        className="p-1.5 rounded-lg text-muted-foreground hover:bg-accent disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
              {/* Info do usuário */}
              {user && (
                <div className="px-1 py-2 border-b border-border mb-1">
                  <p className="text-sm font-semibold text-foreground">{user.name ?? user.email}</p>
                  <p className="text-xs text-muted-foreground capitalize">{(user as any).perfil ?? user.role}</p>
                </div>
              )}
              {isSuperAdmin && (
                <>
                  <button onClick={() => { setShowSuperAdmin(true); setMobileMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-purple-600 hover:bg-purple-50 transition-colors font-medium">
                    <Shield className="w-4 h-4" /> Super Admin
                  </button>
                  <a href="/admin" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                    <Users className="w-4 h-4" /> Admin
                  </a>
                  <a href="/dev" className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-indigo-600 hover:bg-indigo-50 transition-colors font-medium">
                    <Building2 className="w-4 h-4" /> Dev Panel
                  </a>
                </>
              )}
              {isAdmin && !isSuperAdmin && (
                <a href="/admin-panel" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium">
                  <Shield className="w-4 h-4" /> Painel Admin
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Tabs com scroll horizontal em mobile */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            {tabsVisiveis.map((tab) => {
              const labels: Record<Tab, string> = {
                dashboard: "Dashboard",
                lancamentos: "Lançamentos",
                metas: "Metas",
                bonificacao: "Bonificação",
                usuarios: "Usuários",
                empresas: "Empresas",
                auditoria: "Auditoria",
                ia: "Análise IA",
              };
              const icons: Record<Tab, React.ReactNode> = {
                dashboard: <TrendingUp className="w-4 h-4" />,
                lancamentos: <Calendar className="w-4 h-4" />,
                metas: <Target className="w-4 h-4" />,
                bonificacao: <CheckCircle2 className="w-4 h-4" />,
                usuarios: <Users className="w-4 h-4" />,
                empresas: <Building2 className="w-4 h-4" />,
                auditoria: <Shield className="w-4 h-4" />,
                ia: <Sparkles className="w-4 h-4" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  {icons[tab]} <span className="hidden sm:inline">{labels[tab]}</span>
                  <span className="sm:hidden">{labels[tab].split(" ")[0]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && activeTab === "dashboard" && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        )}

        {/* ─── DASHBOARD ─────────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && !loading && (
          <div className="space-y-6">
            {/* Banner de acesso rápido para recepcionista */}
            {isRecepcionista && (
              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold">Olá, {user?.name ?? "Recepcionista"}!</h2>
                    <p className="text-sm text-blue-100 mt-1">Registre o faturamento do dia clicando no botão ao lado.</p>
                  </div>
                  <Button
                    onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                    className="gap-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-semibold shadow-md"
                    size="lg"
                  >
                    <Plus className="w-5 h-5" /> Lançar Faturamento
                  </Button>
                </div>
              </Card>
            )}
            {/* Banner de alerta: projeção abaixo da meta */}
            {isGerente && empresasEmRisco.length > 0 && periodoFiltro === "mensal" && (
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BellRing className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-amber-500">
                        {empresasEmRisco.length === 1
                          ? `1 empresa com projeção abaixo de ${LIMIAR_ALERTA}% da meta`
                          : `${empresasEmRisco.length} empresas com projeção abaixo de ${LIMIAR_ALERTA}% da meta`}
                      </p>
                      <div className="mt-1.5 space-y-1">
                        {empresasEmRisco.map((e) => (
                          <p key={e.nome} className="text-xs text-amber-400/80">
                            <span className="font-medium">{e.nome}</span>: projeção {fmt(e.projecao)} ({e.percentualProjecao.toFixed(1)}% da meta de {fmt(e.meta)})
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 gap-1.5 border-amber-500/40 text-amber-500 hover:bg-amber-500/10 rounded-xl text-xs"
                    disabled={notificarAlerta.isPending}
                    onClick={() => {
                      notificarAlerta.mutate({
                        mes,
                        ano,
                        nomeMes: MESES[mes - 1],
                        empresasEmRisco,
                        totalGeralRealizado,
                        totalGeralMeta: statsPorEmpresa.reduce((s, e) => s + e.metaMensal, 0),
                        limiarPercentual: LIMIAR_ALERTA,
                      });
                    }}
                  >
                    {notificarAlerta.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <BellRing className="w-3 h-3" />
                    )}
                    Notificar gerente
                  </Button>
                </div>
              </Card>
            )}

            {/* KPIs Gerais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  {periodoFiltro === "semanal" && semanaAtual
                    ? `Faturado — ${semanaAtual.label}`
                    : "Faturado no Mês"}
                </p>

                {/* Valor realizado em destaque */}
                <p className="text-2xl font-bold mt-1">{fmt(totalGeralRealizado)}</p>
                <p className="text-xs opacity-70 mt-0.5">realizado</p>

                {/* Soma realizado + previsto (só aparece quando há previstos) */}
                {totalGeralPrevisto > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <p className="text-xs opacity-70">Com previstos</p>
                    <p className="text-lg font-bold text-amber-200">{fmt(totalGeral)}</p>
                    <p className="text-xs text-amber-300/80">
                      +{fmt(totalGeralPrevisto)} em {statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0)} dia{statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0) !== 1 ? "s" : ""} previsto{statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}

                {/* Comparativo com mês anterior (baseado em realizados) */}
                {comparativoMesAnterior.variacaoTotal !== null && totalGeralPrevisto === 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    comparativoMesAnterior.variacaoTotal >= 0 ? "text-emerald-200" : "text-red-200"
                  }`}>
                    {comparativoMesAnterior.variacaoTotal >= 0 ? "↑" : "↓"}
                    {Math.abs(comparativoMesAnterior.variacaoTotal).toFixed(1)}% vs {MESES[mesAnterior - 1]} ({comparativoMesAnterior.periodoLabel})
                  </p>
                )}
                {comparativoMesAnterior.variacaoTotal !== null && totalGeralPrevisto > 0 && (
                  <p className={`text-xs mt-1 flex items-center gap-1 ${
                    comparativoMesAnterior.variacaoTotal >= 0 ? "text-emerald-200" : "text-red-200"
                  }`}>
                    {comparativoMesAnterior.variacaoTotal >= 0 ? "↑" : "↓"}
                    {Math.abs(comparativoMesAnterior.variacaoTotal).toFixed(1)}% vs {MESES[mesAnterior - 1]}
                  </p>
                )}
                {comparativoMesAnterior.variacaoTotal === null && totalGeralPrevisto === 0 && (
                  <p className="text-xs opacity-70 mt-1">{faturamentosFiltrados.length} dias lançados</p>
                )}
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Meta Mensal Total</p>
                <p className="text-2xl font-bold mt-1">{fmt(metaTotalGeral)}</p>
                {metaQuinzenalTotal > 0 && (
                  <p className="text-xs opacity-70 mt-1">Quinzenal: {fmt(metaQuinzenalTotal)}</p>
                )}
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Progresso Geral</p>
                <p className="text-2xl font-bold mt-1 text-foreground">
                  {metaTotalGeral > 0 ? `${pct(totalGeralRealizado, metaTotalGeral)}%` : "—"}
                </p>
                {metaTotalGeral > 0 && (
                  <>
                    {/* Barra de progresso: realizado (azul/verde) */}
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(pct(totalGeralRealizado, metaTotalGeral), 100)}%`,
                          backgroundColor: pct(totalGeralRealizado, metaTotalGeral) >= 100 ? "#10b981" : "#3b82f6",
                        }}
                      />
                    </div>
                    {/* Barra secundária: previsto (só aparece quando há previstos) */}
                    {totalGeralPrevisto > 0 && (
                      <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all bg-amber-300"
                          style={{ width: `${Math.min(pct(totalGeral, metaTotalGeral), 100)}%` }}
                        />
                      </div>
                    )}
                    {totalGeralPrevisto > 0 && (
                      <p className="text-xs text-amber-500 mt-1">
                        {pct(totalGeral, metaTotalGeral)}% com previstos
                      </p>
                    )}
                  </>
                )}
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Falta para Meta</p>
                <p className={`text-2xl font-bold mt-1 ${totalGeralRealizado >= metaTotalGeral ? "text-emerald-400" : "text-foreground"}`}>
                  {metaTotalGeral > 0
                    ? totalGeralRealizado >= metaTotalGeral
                      ? "Atingida!"
                      : fmt(metaTotalGeral - totalGeralRealizado)
                    : "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {metaTotalGeral > 0 && totalGeralRealizado < metaTotalGeral ? "restante (realizado)" : ""}
                </p>
              </Card>
            </div>

            {/* Card Comparativo com Mês Anterior */}
            {comparativoMesAnterior.totalAnteriorMesmosDias > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Comparativo com {MESES[mesAnterior - 1]}</h3>
                      <p className="text-xs text-slate-400">{comparativoMesAnterior.periodoLabel} — mesmos dias apurados</p>
                    </div>
                  </div>
                  {comparativoMesAnterior.variacaoTotal !== null && (
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      comparativoMesAnterior.variacaoTotal >= 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {comparativoMesAnterior.variacaoTotal >= 0 ? "↑" : "↓"}
                      {Math.abs(comparativoMesAnterior.variacaoTotal).toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Total consolidado */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">{MESES[mes - 1]} ({comparativoMesAnterior.periodoLabel})</p>
                    <p className="text-xl font-bold text-blue-700 mt-0.5">{fmt(totalGeral)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{MESES[mesAnterior - 1]} ({comparativoMesAnterior.periodoLabel})</p>
                    <p className="text-xl font-bold text-slate-700 mt-0.5">{fmt(comparativoMesAnterior.totalAnteriorMesmosDias)}</p>
                  </div>
                </div>

                {/* Por empresa */}
                <div className="space-y-2">
                  {empresasVisiveis.map((emp) => {
                    const comp = comparativoMesAnterior.porEmpresa[emp.slug];
                    if (!comp) return null;
                    const variacao = comp.totalAnterior > 0
                      ? ((comp.totalAtual - comp.totalAnterior) / comp.totalAnterior) * 100
                      : null;
                    return (
                      <div key={emp.slug} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.cor }} />
                        <span className="text-sm text-slate-700 flex-1 font-medium">{emp.nome}</span>
                        <div className="flex items-center gap-3 text-right">
                          <div>
                            <p className="text-xs text-slate-400">{MESES[mesAnterior - 1]}</p>
                            <p className="text-sm font-semibold text-slate-600">{comp.totalAnterior > 0 ? fmt(comp.totalAnterior) : "—"}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">{MESES[mes - 1]}</p>
                            <p className="text-sm font-semibold text-slate-900">{fmt(comp.totalAtual)}</p>
                          </div>
                          {variacao !== null ? (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                              variacao >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                            }`}>
                              {variacao >= 0 ? "↑" : "↓"}{Math.abs(variacao).toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 px-2">sem dados</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Card Acurácia das Previsões */}
            {acuraciaPrevisoes.totalDias > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <Crosshair className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-sm">Acurácia das Previsões</h3>
                      <p className="text-xs text-slate-400">{acuraciaPrevisoes.totalDias} dia{acuraciaPrevisoes.totalDias !== 1 ? "s" : ""} previsto{acuraciaPrevisoes.totalDias !== 1 ? "s" : ""} já realizados</p>
                    </div>
                  </div>
                  {acuraciaPrevisoes.acuraciaGlobal !== null && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${
                        acuraciaPrevisoes.acuraciaGlobal >= 85 ? "text-emerald-600"
                        : acuraciaPrevisoes.acuraciaGlobal >= 70 ? "text-amber-500"
                        : "text-red-500"
                      }`}>
                        {acuraciaPrevisoes.acuraciaGlobal.toFixed(1)}%
                      </p>
                      <p className="text-xs text-slate-400">precisão média</p>
                    </div>
                  )}
                </div>

                {/* Barra de precisão global */}
                {acuraciaPrevisoes.acuraciaGlobal !== null && (
                  <div className="mb-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(acuraciaPrevisoes.acuraciaGlobal, 100)}%`,
                          backgroundColor:
                            acuraciaPrevisoes.acuraciaGlobal >= 85 ? "#10b981"
                            : acuraciaPrevisoes.acuraciaGlobal >= 70 ? "#f59e0b"
                            : "#ef4444",
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>0%</span>
                      <span className={`font-medium ${
                        acuraciaPrevisoes.acuraciaGlobal >= 85 ? "text-emerald-600"
                        : acuraciaPrevisoes.acuraciaGlobal >= 70 ? "text-amber-500"
                        : "text-red-500"
                      }`}>
                        {acuraciaPrevisoes.acuraciaGlobal >= 85 ? "✓ Excelente"
                          : acuraciaPrevisoes.acuraciaGlobal >= 70 ? "⚠ Regular"
                          : "✕ Baixa"}
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                )}

                {/* Link para histórico completo */}
                <div className="flex justify-end mb-3">
                  <button
                    onClick={() => navigate("/historico-acuracia")}
                    className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1 transition-colors"
                  >
                    Ver histórico completo →
                  </button>
                </div>

                {/* Detalhe por empresa */}
                <div className="space-y-3">
                  {empresasVisiveis.map((emp) => {
                    const ac = acuraciaPrevisoes.porEmpresa[emp.slug];
                    if (!ac || ac.diasAnalisados === 0) return null;
                    return (
                      <div key={emp.slug}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.cor }} />
                          <span className="text-sm font-medium text-slate-700 flex-1">{emp.nome}</span>
                          <span className={`text-sm font-bold ${
                            ac.acuraciaMedia >= 85 ? "text-emerald-600"
                            : ac.acuraciaMedia >= 70 ? "text-amber-500"
                            : "text-red-500"
                          }`}>
                            {ac.acuraciaMedia.toFixed(1)}%
                          </span>
                          <span className="text-xs text-slate-400">{ac.diasAnalisados} dia{ac.diasAnalisados !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(ac.acuraciaMedia, 100)}%`,
                              backgroundColor: emp.cor,
                            }}
                          />
                        </div>
                        {/* Detalhes dos dias */}
                        <div className="mt-1.5 space-y-1">
                          {ac.detalhes.map((d) => (
                            <div key={d.dia} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="w-12 text-muted-foreground/70 flex-shrink-0">Dia {d.dia}</span>
                              <span className="flex-1 min-w-0">
                                Prev: <span className="font-medium text-foreground/80">{fmt(d.valorPrevisto)}</span>
                                {" → "}
                                Real: <span className="font-medium text-foreground">{fmt(d.valorRealizado)}</span>
                                {(d as any).fonte === "createdAt" && (
                                  <span className="ml-1 text-[10px] text-amber-500/80">(est.)</span>
                                )}
                              </span>
                              <span className={`font-semibold flex-shrink-0 ${
                                d.erroPct <= 10 ? "text-emerald-500"
                                : d.erroPct <= 25 ? "text-amber-500"
                                : "text-red-500"
                              }`}>
                                {d.erroPct <= 0.5 ? "✓ exato" : `${d.erroPct.toFixed(1)}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Gráfico de Progresso da Meta Mensal */}
            {metaTotalGeral > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Progresso da Meta Mensal</h3>
                      <p className="text-xs text-muted-foreground">
                        {periodoFiltro === "semanal" && semanaAtual
                          ? `Semana ${semanaAtual.label} · realizado vs meta mensal`
                          : `${MESES[mes - 1]} ${ano} · realizado vs meta`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total realizado</p>
                    <p className="text-lg font-bold text-foreground">{fmt(totalGeralRealizado)}</p>
                    <p className="text-xs text-muted-foreground">de {fmt(metaTotalGeral)}</p>
                  </div>
                </div>

                {/* Barra de progresso global */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Consolidado</span>
                    <span className={`text-sm font-bold ${
                      totalGeralRealizado >= metaTotalGeral ? "text-emerald-500"
                      : totalGeralRealizado >= metaTotalGeral * 0.7 ? "text-primary"
                      : "text-amber-500"
                    }`}>
                      {metaTotalGeral > 0 ? `${Math.min(Math.round((totalGeralRealizado / metaTotalGeral) * 100), 100)}%` : "—"}
                    </span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min((totalGeralRealizado / metaTotalGeral) * 100, 100)}%`,
                        background: totalGeralRealizado >= metaTotalGeral
                          ? "linear-gradient(90deg, #10b981, #059669)"
                          : totalGeralRealizado >= metaTotalGeral * 0.7
                          ? "linear-gradient(90deg, #3b82f6, #2563eb)"
                          : "linear-gradient(90deg, #f59e0b, #d97706)",
                      }}
                    />
                  </div>
                  {/* Marcador da meta esperada até hoje */}
                  {(() => {
                    const metaEsperadaTotal = statsPorEmpresa.reduce((s, e) => s + e.metaEsperadaAteHoje, 0);
                    if (metaEsperadaTotal <= 0 || metaEsperadaTotal >= metaTotalGeral) return null;
                    const pctEsperado = Math.min((metaEsperadaTotal / metaTotalGeral) * 100, 100);
                    return (
                      <div className="relative mt-1 h-3">
                        <div
                          className="absolute top-0 w-0.5 h-3 bg-muted-foreground/40 rounded-full"
                          style={{ left: `${pctEsperado}%` }}
                        />
                        <span
                          className="absolute top-4 text-[10px] text-muted-foreground -translate-x-1/2"
                          style={{ left: `${pctEsperado}%` }}
                        >
                          esperado
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Barras por empresa */}
                <div className="space-y-4 mt-6">
                  {statsPorEmpresa.map((s) => {
                    if (s.metaMensal === 0) return null;
                    const pctReal = Math.min((s.totalRealizado / s.metaMensal) * 100, 100);
                    const pctPrev = s.totalPrevisto > 0
                      ? Math.min(((s.totalRealizado + s.totalPrevisto) / s.metaMensal) * 100, 100)
                      : null;
                    const metaEsperada = s.metaEsperadaAteHoje;
                    const pctEsperado = metaEsperada > 0 && metaEsperada < s.metaMensal
                      ? Math.min((metaEsperada / s.metaMensal) * 100, 100)
                      : null;
                    const atingiu = s.totalRealizado >= s.metaMensal;
                    // Projeção de fechamento: já calculada em statsPorEmpresa como projecaoFinal
                    const projecao = s.projecaoFinal;
                    const pctProjecao = projecao > 0 && s.metaMensal > 0
                      ? Math.min((projecao / s.metaMensal) * 100, 120) // permite ultrapassar até 120% para visualização
                      : null;
                    const projecaoAtingeMeta = projecao >= s.metaMensal;
                    return (
                      <div key={s.emp.slug}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.emp.cor }} />
                            <span className="text-sm font-medium text-foreground">{s.emp.nome}</span>
                            {atingiu && (
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ Meta!</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <span className="text-xs text-muted-foreground">{fmt(s.totalRealizado)} / {fmt(s.metaMensal)}</span>
                            <span className={`text-sm font-bold ${
                              atingiu ? "text-emerald-500"
                              : pctReal >= 70 ? "text-primary"
                              : "text-amber-500"
                            }`}>
                              {Math.round(pctReal)}%
                            </span>
                          </div>
                        </div>
                        {/* Barra de progresso com camadas */}
                        <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
                          {/* Camada previsto (âmbar, mais larga) */}
                          {pctPrev !== null && (
                            <div
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{
                                width: `${pctPrev}%`,
                                backgroundColor: s.emp.cor + "40",
                              }}
                            />
                          )}
                          {/* Camada realizado (cor sólida) */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
                            style={{
                              width: `${pctReal}%`,
                              backgroundColor: s.emp.cor,
                            }}
                          />
                        </div>
                        {/* Linha de meta esperada até hoje + marcador de projeção */}
                        <div className="relative h-4 mt-0.5">
                          {/* Marcador: meta esperada até hoje */}
                          {pctEsperado !== null && (
                            <div
                              className="absolute top-0 w-px h-2.5 bg-muted-foreground/30"
                              style={{ left: `${pctEsperado}%` }}
                            />
                          )}
                          {/* Marcador: projeção de fechamento - sempre visível para análise */}
                          {pctProjecao !== null && (
                            <>
                              <div
                                className="absolute top-0 w-0.5 h-2.5 rounded-full"
                                style={{
                                  left: `${Math.min(pctProjecao, 100)}%`,
                                  backgroundColor: atingiu ? "#6ee7b7" : projecaoAtingeMeta ? "#10b981" : "#f59e0b",
                                  opacity: atingiu ? 0.5 : 0.8,
                                }}
                              />
                              <span
                                className={`absolute top-3 text-[9px] font-semibold -translate-x-1/2 whitespace-nowrap ${
                                  atingiu ? "text-emerald-300/70"
                                  : projecaoAtingeMeta ? "text-emerald-500" : "text-amber-500"
                                }`}
                                style={{ left: `${Math.min(pctProjecao, 100)}%` }}
                              >
                                {atingiu ? "" : projecaoAtingeMeta ? "↑" : "↓"} {fmt(projecao)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legenda */}
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded-sm bg-primary" />
                    <span>Realizado</span>
                  </div>
                  {statsPorEmpresa.some((s) => s.totalPrevisto > 0) && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-2 rounded-sm bg-amber-400/40" />
                      <span>Com previstos</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <div className="w-px h-3 bg-muted-foreground/40" />
                    <span>Meta esperada até hoje</span>
                  </div>
                  {statsPorEmpresa.some((s) => s.projecaoFinal > 0) && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-0.5 h-3 rounded-full bg-emerald-500/60" />
                      <span>Projeção de fechamento</span>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Ranking de Desempenho */}
            {statsPorEmpresa.some(s => s.metaMensal > 0) && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Ranking de Desempenho</h3>
                      <p className="text-xs text-muted-foreground">Ordenado por % da meta atingida</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted/40 px-2 py-1 rounded-lg">
                    {periodoFiltro === "semanal" && semanaAtual ? semanaAtual.label : MESES[mes - 1]}
                  </span>
                </div>

                <div className="space-y-3">
                  {[...statsPorEmpresa]
                    .filter(s => s.metaMensal > 0)
                    .sort((a, b) => (b.totalRealizado / b.metaMensal) - (a.totalRealizado / a.metaMensal))
                    .map((s, idx) => {
                      const pct = Math.min((s.totalRealizado / s.metaMensal) * 100, 999);
                      const pctProj = s.projecaoFinal > 0 ? Math.min((s.projecaoFinal / s.metaMensal) * 100, 150) : null;
                      const atingiu = s.totalRealizado >= s.metaMensal;
                      const medalhas = ["🥇", "🥈", "🥉"];
                      const barColor = atingiu ? "#10b981" : pct >= 75 ? "#3b82f6" : pct >= 50 ? "#f59e0b" : "#ef4444";
                      return (
                        <div key={s.emp.slug} className="flex items-center gap-3">
                          {/* Posição */}
                          <div className="w-7 text-center">
                            {idx < 3
                              ? <span className="text-base">{medalhas[idx]}</span>
                              : <span className="text-xs font-bold text-muted-foreground">{idx + 1}º</span>
                            }
                          </div>

                          {/* Info da empresa */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.emp.cor }} />
                                <span className="text-sm font-medium text-foreground truncate">{s.emp.nome}</span>
                                {atingiu && (
                                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">✓ Meta!</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-muted-foreground">{fmt(s.totalRealizado)}</span>
                                <span className={`text-xs font-bold ${
                                  atingiu ? "text-emerald-400" : pct >= 75 ? "text-blue-400" : pct >= 50 ? "text-amber-400" : "text-red-400"
                                }`}>{pct.toFixed(1)}%</span>
                              </div>
                            </div>

                            {/* Barra de progresso */}
                            <div className="relative h-2 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor, opacity: 0.85 }}
                              />
                              {/* Linha de projeção */}
                              {pctProj !== null && !atingiu && (
                                <div
                                  className="absolute top-0 w-0.5 h-full rounded-full bg-white/40"
                                  style={{ left: `${Math.min(pctProj, 100)}%` }}
                                />
                              )}
                            </div>

                            {/* Projeção de fechamento */}
                            {pctProj !== null && !atingiu && (
                              <p className={`text-[10px] mt-0.5 ${
                                pctProj >= 100 ? "text-emerald-400" : "text-amber-400"
                              }`}>
                                Projeção: {fmt(s.projecaoFinal)} ({pctProj.toFixed(1)}%)
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Rodapé: consolidado */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Total realizado: <span className="font-semibold text-foreground">{fmt(totalGeralRealizado)}</span></span>
                  <span>Meta total: <span className="font-semibold text-foreground">{fmt(metaTotalGeral)}</span></span>
                  <span className={`font-bold ${
                    totalGeralRealizado >= metaTotalGeral ? "text-emerald-400"
                    : (totalGeralRealizado / metaTotalGeral) >= 0.75 ? "text-blue-400"
                    : "text-amber-400"
                  }`}>
                    {metaTotalGeral > 0 ? ((totalGeralRealizado / metaTotalGeral) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </Card>
            )}

            {/* Cards por Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsPorEmpresa.map((s) => {
                const metaDiaAtualMensal = s.diasUteisRestantes > 0 ? s.metaDiariaDinamicaMensal : s.metaDiariaMensal;
                const metaDiaAtualQuinzenal = s.diasUteisRestantesQuinzenal > 0 ? s.metaDiariaDinamicaQuinzenal : s.metaDiariaQuinzenal;
                const menorQueMeta = s.mediaDiaria > 0 && metaDiaAtualMensal > 0 && s.mediaDiaria < metaDiaAtualMensal;
                const menorQueMetaQ = s.diasLancadosQuinzenal > 0 && metaDiaAtualQuinzenal > 0 && (s.totalQuinzenal / Math.max(s.diasLancadosQuinzenal, 1)) < metaDiaAtualQuinzenal;

                return (
                <Card key={s.emp.slug} className="p-5 border-0 shadow-sm rounded-2xl bg-card overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: s.emp.cor }} />

                  {/* Cabeçalho */}
                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.emp.cor + "20" }}>
                      <Building2 className="w-4 h-4" style={{ color: s.emp.cor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{s.emp.nome}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p className="text-xs text-muted-foreground">{s.diasRealizados} dias realizados</p>
                        {s.diasPrevistos > 0 && (
                          <span className="text-xs font-medium text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                            +{s.diasPrevistos} previsto{s.diasPrevistos > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="ml-auto text-right">
                      <div className="flex items-end gap-1 justify-end">
                        <p className="text-xl font-bold text-foreground">{fmt(s.totalRealizado)}</p>
                        {s.totalPrevisto > 0 && (
                          <p className="text-xs font-semibold text-amber-400 mb-0.5">+{fmt(s.totalPrevisto)} prev.</p>
                        )}
                      </div>
                      {(() => {
                        const comp = comparativoMesAnterior.porEmpresa[s.emp.slug];
                        if (!comp || comp.totalAnterior === 0) return <p className="text-xs text-muted-foreground">faturado no mês</p>;
                        const variacao = ((comp.totalAtual - comp.totalAnterior) / comp.totalAnterior) * 100;
                        return (
                          <p className={`text-xs font-semibold ${variacao >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {variacao >= 0 ? "↑" : "↓"}{Math.abs(variacao).toFixed(1)}% vs {MESES[mesAnterior - 1]}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Progresso Mensal */}
                  {s.metaMensal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground font-medium">
                          Meta Mensal: {fmt(s.metaMensal)}
                          {s.metaEsperadaAteHoje > 0 && s.metaEsperadaAteHoje < s.metaMensal && (
                            <span className="text-muted-foreground/60 ml-1">(esperado até hoje: {fmt(s.metaEsperadaAteHoje)})</span>
                          )}
                        </span>
                        <span className="font-bold" style={{ color: s.emp.cor }}>{s.progressoMensal.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(s.progressoMensal, 100)}%`, backgroundColor: s.emp.cor }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.diasUteisDecorridos} de {s.diasUteis} dias úteis decorridos
                      </p>
                    </div>
                  )}

                  {/* Progresso Quinzenal */}
                  {s.metaQuinzenal > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-purple-500 font-medium">Meta Quinzenal: {fmt(s.metaQuinzenal)}</span>
                        <span className="font-bold text-purple-600">{s.progressoQuinzenal.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-purple-500/20 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-purple-400" style={{ width: `${s.progressoQuinzenal}%` }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{fmt(s.totalQuinzenal)} faturados até dia 15</p>
                    </div>
                  )}

                  {/* Grid de métricas */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Média diária real */}
                    <div className="bg-muted rounded-xl p-2.5">
                      <p className="text-xs text-muted-foreground">Média Diária</p>
                      <p className="text-sm font-bold text-foreground">{fmt(s.mediaDiaria)}</p>
                      {s.diasPrevistos > 0 && <p className="text-xs text-amber-400 mt-0.5">só realizados</p>}
                    </div>

                    {/* Maior e menor dia (apenas realizados) */}
                    {s.maiorDia > 0 && (
                      <div className="bg-muted rounded-xl p-2.5">
                        <p className="text-xs text-muted-foreground">Maior / Menor Dia</p>
                        <p className="text-sm font-bold text-emerald-400">{fmt(s.maiorDia)}</p>
                        <p className="text-xs text-red-400">{fmt(s.menorDia)}</p>
                        {s.diasPrevistos > 0 && <p className="text-xs text-amber-400 mt-0.5">só realizados</p>}
                      </div>
                    )}

                    {/* Meta/dia mensal dinâmica */}
                    <div className={`rounded-xl p-2.5 ${menorQueMeta ? "bg-orange-500/15" : "bg-emerald-500/15"}`}>
                      <p className={`text-xs font-medium ${menorQueMeta ? "text-orange-400" : "text-emerald-400"}`}>
                        Precisa/Dia (Mensal)
                      </p>
                      <p className={`text-sm font-bold ${menorQueMeta ? "text-orange-300" : "text-emerald-300"}`}>
                        {metaDiaAtualMensal > 0 ? fmt(metaDiaAtualMensal) : "—"}
                      </p>
                      {s.diasUteisRestantes > 0 && s.metaMensal > 0 && (
                        <p className="text-xs mt-0.5" style={{ color: menorQueMeta ? "#c2410c" : "#059669" }}>
                          {s.diasUteisRestantes}d úteis restantes
                        </p>
                      )}
                    </div>

                    {/* Meta/dia quinzenal dinâmica */}
                    {s.metaQuinzenal > 0 && (
                      <div className={`rounded-xl p-2.5 ${menorQueMetaQ ? "bg-orange-500/15" : "bg-purple-500/15"}`}>
                        <p className={`text-xs font-medium ${menorQueMetaQ ? "text-orange-400" : "text-purple-400"}`}>
                          Precisa/Dia (Quinz.)
                        </p>
                        <p className={`text-sm font-bold ${menorQueMetaQ ? "text-orange-300" : "text-purple-300"}`}>
                          {metaDiaAtualQuinzenal > 0 ? fmt(metaDiaAtualQuinzenal) : "—"}
                        </p>
                        {s.diasUteisRestantesQuinzenal > 0 && (
                          <p className={`text-xs mt-0.5 ${menorQueMetaQ ? "text-orange-400" : "text-purple-400"}`}>
                            {s.diasUteisRestantesQuinzenal}d até dia 15
                          </p>
                        )}
                      </div>
                    )}

                    {/* Projeção final */}
                    <div className="bg-muted rounded-xl p-2.5">
                      <p className="text-xs text-muted-foreground">Projeção Final</p>
                      <p className={`text-sm font-bold ${s.projecaoFinal >= s.metaMensal && s.metaMensal > 0 ? "text-emerald-400" : "text-foreground"}`}>
                        {s.projecaoFinal > 0 ? fmt(s.projecaoFinal) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Indicador de status mensal - sempre visível para análise */}
                  {s.mediaDiaria > 0 && (
                    <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl ${
                      s.totalRealizado >= s.metaMensal && s.metaMensal > 0
                        ? "bg-emerald-500/20 text-emerald-300"
                        : s.mediaDiaria >= metaDiaAtualMensal
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-orange-500/15 text-orange-400"
                    }`}>
                      {s.totalRealizado >= s.metaMensal && s.metaMensal > 0
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> Meta mensal atingida! Projeção: {fmt(s.projecaoFinal)}</>
                        : s.mediaDiaria >= metaDiaAtualMensal
                        ? <><CheckCircle2 className="w-3.5 h-3.5" /> No caminho certo para a meta mensal</>
                        : <><TrendingDown className="w-3.5 h-3.5" /> Precisa de +{fmt(metaDiaAtualMensal - s.mediaDiaria)}/dia para atingir a meta</>
                      }
                    </div>
                  )}
                </Card>
                );
              })}
            </div>

            {/* Alertas */}
            {alertas.length > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Alertas
                </h3>
                <div className="space-y-2">
                  {alertas.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-3 rounded-xl text-sm ${
                        a.tipo === "warning" ? "bg-orange-500/15 text-orange-300" :
                        a.tipo === "success" ? "bg-emerald-500/15 text-emerald-300" :
                        "bg-blue-500/15 text-blue-300"
                      }`}
                    >
                      {a.tipo === "warning" ? <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                       a.tipo === "success" ? <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" /> :
                       <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                      {a.msg}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Gráfico de Linha: Faturamento Diário vs Mês Anterior */}
            {lineDataDiario.length > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center">
                      <TrendingUp className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Evolução Diária do Faturamento</h3>
                      <p className="text-xs text-muted-foreground">{MESES[mes - 1]} vs {MESES[mesAnterior - 1]} — acumulado por dia</p>
                    </div>
                  </div>
                  {/* Legenda manual */}
                  <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-6 h-0.5 bg-blue-500 rounded" />
                      {MESES[mes - 1]}
                    </span>
                    {lineDataDiario.some((d) => d.acumPrevisto !== null) && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-block w-6" style={{ borderTop: "2px dashed #f59e0b", height: 0 }} />
                        Previsto
                      </span>
                    )}
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-6" style={{ borderTop: "2px dashed #94a3b8", height: 0 }} />
                      {MESES[mesAnterior - 1]}
                    </span>
                  </div>
                </div>

                {/* Legenda mobile */}
                <div className="flex sm:hidden flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-blue-500 rounded" />
                    {MESES[mes - 1]}
                  </span>
                  {lineDataDiario.some((d) => d.acumPrevisto !== null) && (
                    <span className="flex items-center gap-1.5">
                      <span className="inline-block w-5 h-0.5 bg-amber-400 rounded" />
                      Previsto
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block w-5 h-0.5 bg-slate-300 rounded" />
                    {MESES[mesAnterior - 1]}
                  </span>
                </div>

                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={lineDataDiario} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="diaLabel"
                      tick={{ fontSize: 11, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#6b7280" }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const pAtual = payload.find((p: any) => p.dataKey === "acumAtual");
                        const pPrevisto = payload.find((p: any) => p.dataKey === "acumPrevisto");
                        const pAnterior = payload.find((p: any) => p.dataKey === "acumAnterior");
                        const entry = lineDataDiario.find((d) => d.diaLabel === label);
                        const valAtual = typeof pAtual?.value === "number" ? pAtual.value : null;
                        const valPrevisto = typeof pPrevisto?.value === "number" ? pPrevisto.value : null;
                        const valAnterior = typeof pAnterior?.value === "number" ? pAnterior.value : null;
                        const valRef = valAtual ?? valPrevisto;
                        return (
                          <div className="bg-popover border border-border shadow-lg rounded-xl p-3 text-xs min-w-[190px]">
                            <p className="font-semibold text-foreground mb-2">Dia {label}</p>
                            {valAtual != null && (
                              <div className="mb-1">
                                <p className="text-blue-400 font-semibold">{MESES[mes - 1]} — Realizado</p>
                                <p className="text-muted-foreground">Acumulado: <span className="font-bold text-foreground">{fmtFull(valAtual)}</span></p>
                                {entry?.fatAtual != null && <p className="text-muted-foreground">No dia: {fmtFull(entry.fatAtual)}</p>}
                              </div>
                            )}
                            {valPrevisto != null && (
                              <div className="mb-1">
                                <p className="text-amber-400 font-semibold">{MESES[mes - 1]} — Previsto</p>
                                <p className="text-muted-foreground">Acumulado: <span className="font-bold text-foreground">{fmtFull(valPrevisto)}</span></p>
                                {entry?.fatAtual != null && <p className="text-muted-foreground">No dia: {fmtFull(entry.fatAtual)}</p>}
                              </div>
                            )}
                            {valAnterior != null && (
                              <div>
                                <p className="text-muted-foreground font-semibold">{MESES[mesAnterior - 1]}</p>
                                <p className="text-muted-foreground">Acumulado: <span className="font-bold text-foreground">{fmtFull(valAnterior)}</span></p>
                                {entry?.fatAnterior != null && <p className="text-muted-foreground">No dia: {fmtFull(entry.fatAnterior)}</p>}
                              </div>
                            )}
                            {valRef != null && valAnterior != null && (() => {
                              const diff = valRef - valAnterior;
                              const pctDiff = valAnterior > 0 ? (diff / valAnterior) * 100 : null;
                              return (
                                <div className={`mt-2 pt-2 border-t border-border font-semibold ${
                                  diff >= 0 ? "text-emerald-400" : "text-red-400"
                                }`}>
                                  {diff >= 0 ? "↑" : "↓"} {fmtFull(Math.abs(diff))}
                                  {pctDiff !== null && <span className="ml-1 text-xs">({Math.abs(pctDiff).toFixed(1)}%)</span>}
                                  {valPrevisto != null && <span className="ml-1 text-amber-500">(previsto)</span>}
                                </div>
                              );
                            })()}
                          </div>
                        );
                      }}
                    />
                    {/* Linha do mês atual — realizado */}
                    <Line
                      type="monotone"
                      dataKey="acumAtual"
                      name={`${MESES[mes - 1]} (realizado)`}
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
                      connectNulls={false}
                    />
                    {/* Linha do mês atual — previsto (dias futuros) */}
                    <Line
                      type="monotone"
                      dataKey="acumPrevisto"
                      name={`${MESES[mes - 1]} (previsto)`}
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }}
                      activeDot={{ r: 4, fill: "#f59e0b", strokeWidth: 2, stroke: "#fff" }}
                      connectNulls={false}
                    />
                    {/* Linha do mês anterior */}
                    <Line
                      type="monotone"
                      dataKey="acumAnterior"
                      name={MESES[mesAnterior - 1]}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={false}
                      activeDot={{ r: 4, fill: "#94a3b8", strokeWidth: 2, stroke: "#fff" }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Gráficos */}
            {totalGeral > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de barras por empresa */}
                <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                  <h3 className="font-semibold text-foreground mb-4">Faturamento vs Meta por Empresa</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData as any[]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="empresa" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtFull(v)} contentStyle={{ backgroundColor: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.75rem", color: "var(--foreground)" }} />
                      <Bar dataKey="total" name="Faturado" radius={[4, 4, 0, 0]}>
                        {(barData as any[]).map((entry: any, index: number) => (
                          <Cell key={index} fill={entry?.cor ?? "#3b82f6"} />
                        ))}
                      </Bar>
                      <Bar dataKey="meta" name="Meta" fill="rgba(255,255,255,0.12)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Gráfico de pizza por empresa */}
                <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                  <h3 className="font-semibold text-foreground mb-4">Composição do Faturamento</h3>
                  {pieDataEmpresas.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={pieDataEmpresas}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {pieDataEmpresas.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: any) => fmtFull(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                      Sem dados para exibir
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Gráficos de categorias por empresa */}
            {totalGeral > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {statsPorEmpresa.filter((s) => s.total > 0).map((s) => {
                  const labels = s.emp.tipoCategorias === "seraphine"
                    ? ["Cabelo", "Manicure e Pedicure", "Outros Serviços", "Pacote", "Recorrência"]
                    : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
                  const pieData = labels
                    .map((l, i) => ({ name: l, value: s.catTotals[i] }))
                    .filter((d) => d.value > 0);
                  const COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
                  return (
                    <Card key={s.emp.slug} className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                      <h3 className="font-semibold text-foreground mb-3 text-sm">{s.emp.nome} — Categorias</h3>
                      {pieData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <PieChart>
                            <Pie data={pieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" paddingAngle={2}>
                              {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip formatter={(v: any) => fmtFull(v)} />
                            <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-32 text-muted-foreground text-xs">Sem dados</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Gráfico de barras de categorias Seraphine */}
            {barDataCategoriasSeraphine && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">
                      Categorias Seraphine — Comparativo
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Faturamento por categoria {comparativoMesAnterior.periodoLabel}
                    </p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart
                    data={barDataCategoriasSeraphine.data}
                    margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
                    barCategoryGap="20%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis
                      dataKey="categoria"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                      height={55}
                    />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                      width={55}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "hsl(var(--foreground))",
                      }}
                      formatter={(value: any, name: string) => [
                        fmtFull(value),
                        name,
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                      iconType="circle"
                      iconSize={8}
                    />
                    {barDataCategoriasSeraphine.empresas.map((emp) => (
                      <Bar
                        key={emp.nome}
                        dataKey={emp.nome}
                        fill={emp.cor}
                        radius={[4, 4, 0, 0]}
                        maxBarSize={48}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {totalGeral === 0 && !loading && (
              <Card className="p-10 border-0 shadow-sm rounded-2xl bg-card text-center">
                <Calendar className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Nenhum lançamento em {MESES[mes - 1]} {ano}</p>
                {isGerente && (
                  <Button
                    onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                    className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                  >
                    <Plus className="w-4 h-4" /> Primeiro Lançamento
                  </Button>
                )}
              </Card>
            )}
          </div>
        )}

        {/* ─── LANÇAMENTOS ───────────────────────────────────────────────────── */}
        {activeTab === "lancamentos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Lançamentos — {MESES[mes - 1]} {ano}
              </h2>
              {(isGerente || isRecepcionista) && (
                <Button
                  onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
                  size="sm"
                >
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              )}
            </div>

            {loadingFat ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
            ) : faturamentosData.length === 0 ? (
              <Card className="p-8 border-0 shadow-sm rounded-2xl bg-card text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum lançamento neste mês.</p>
              </Card>
            ) : (
              empresasVisiveis.map((emp) => {
                const rows = faturamentosData
                  .filter((f: any) => f.empresaSlug === emp.slug)
                  .sort((a: any, b: any) => b.data.localeCompare(a.data));
                if (rows.length === 0) return null;
                const labels = emp.tipoCategorias === "seraphine"
                  ? ["Cabelo", "Manicure e Pedicure", "Outros Serviços", "Pacote", "Recorrência"]
                  : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
                return (
                  <Card key={emp.slug} className="border-0 shadow-sm rounded-2xl bg-card overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.cor }} />
                      <h3 className="font-semibold text-foreground">{emp.nome}</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{rows.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                            {labels.map((l) => (
                              <th key={l} className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">{l}</th>
                            ))}
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total</th>
                            {isGerente && <th className="px-4 py-2.5" />}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any) => {
                            const cats = [row.cat1, row.cat2, row.cat3, row.cat4, row.cat5].map((v: any) => parseFloat(v || "0"));
                            const total = cats.reduce((a: number, b: number) => a + b, 0);
                            const [, , dia] = row.data.split("-");
                            return (
                              <tr key={row.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-medium text-foreground">
                                  {parseInt(dia)}/{mes.toString().padStart(2, "0")}
                                </td>
                                {cats.map((v: number, i: number) => (
                                  <td key={i} className="px-4 py-3 text-right text-foreground/80">
                                    {v > 0 ? fmt(v) : <span className="text-muted-foreground/40">—</span>}
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-right font-bold text-foreground">{fmt(total)}</td>
                {isGerente && !isRecepcionista && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setEditingFaturamento({ ...row, empresaSlug: emp.slug }); setShowFaturamentoForm(true); }}
                        className="text-xs text-blue-400 hover:underline px-2 py-1 rounded-lg hover:bg-blue-500/15"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteFat(row.id)}
                        className="text-xs text-red-400 hover:underline px-2 py-1 rounded-lg hover:bg-red-500/15"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        )}

        {/* ─── METAS ─────────────────────────────────────────────────────────── */}
        {activeTab === "metas" && (
          <MetaConfig
            mes={mes}
            ano={ano}
            mesLabel={MESES[mes - 1]}
            metasData={metasData as any[]}
            empresasData={empresasVisiveis}
            onSaved={refetchMetas}
            empresaVinculada={empresaVinculada}
            isGerente={isGerente}
          />
        )}

        {/* ─── BONIFICAÇÃO ─────────────────────────────────────────────────── */}
        {activeTab === "bonificacao" && isGerente && (
          <Bonificacao
            mes={mes}
            ano={ano}
            mesLabel={MESES[mes - 1]}
            empresasData={empresasVisiveis}
            metasData={metasData as any[]}
            faturamentosData={faturamentosData as any[]}
            isAdmin={isAdmin}
          />
        )}

        {/* ─── USUÁRIOS ────────────────────────────────────────────────────── */}
        {activeTab === "usuarios" && isAdmin && (
          <AdminUsers empresasData={empresasData} currentUser={user} />
        )}

        {/* ─── EMPRESAS ──────────────────────────────────────────────────────── */}
        {activeTab === "empresas" && (isAdmin || user?.perfil === "gerente") && <Empresas currentUser={user} />}

        {/* ─── AUDITORIA ─────────────────────────────────────────────────────── */}
        {activeTab === "auditoria" && isAdmin && <Auditoria />}

        {/* ─── ANÁLISE IA ───────────────────────────────────────────────────── */}
        {activeTab === "ia" && isGerente && (
          <AnaliseIA
            mes={mes}
            ano={ano}
            mesAnterior={mesAnterior}
            anoAnterior={anoAnterior}
            statsPorEmpresa={statsPorEmpresa}
            comparativoMesAnterior={comparativoMesAnterior}
            totalGeral={totalGeral}
            metaTotalGeral={metaTotalGeral}
            mesLabel={MESES[mes - 1]}
            mesAnteriorLabel={MESES[mesAnterior - 1]}
          />
        )}
      </main>

      {/* Modal de lançamento */}
      {showFaturamentoForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingFaturamento ? "Editar Lançamento" : "Novo Lançamento"}
              </h2>
              <FaturamentoForm
                mes={mes}
                ano={ano}
                empresas={empresasVisiveis}
                empresaVinculada={empresaVinculada}
                initialData={editingFaturamento}
                onSaved={() => {
                  setShowFaturamentoForm(false);
                  setEditingFaturamento(null);
                  refetchFat();
                }}
                onCancel={() => {
                  setShowFaturamentoForm(false);
                  setEditingFaturamento(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Painel Super Admin (overlay) */}
      {showSuperAdmin && isSuperAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-50 overflow-auto">
          <SuperAdmin onBack={() => setShowSuperAdmin(false)} />
        </div>
      )}
    </div>
  );
}
