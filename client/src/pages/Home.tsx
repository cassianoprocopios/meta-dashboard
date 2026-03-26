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
  ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, ChevronRight, BellRing, Trophy, Zap, RefreshCw, Repeat2,
  Pencil,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { getLoginUrl } from "@/const";
import FaturamentoForm from "@/components/FaturamentoForm";
import MetaConfig from "@/components/MetaConfig";
import AdminUsers from "@/pages/AdminUsers";
import Empresas from "@/pages/Empresas";
import Auditoria from "@/pages/Auditoria";
import AnaliseIA from "@/pages/AnaliseIA";
import HistoricoAnual from "@/pages/HistoricoAnual";
import Bonificacao from "@/pages/Bonificacao";
import SuperAdmin from "@/pages/SuperAdmin";
import TenantBloqueado from "@/pages/TenantBloqueado";
import DpoteDistribuicao from "@/pages/DpoteDistribuicao";
import { useTheme } from "@/contexts/ThemeContext";
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from "@/components/ui/tooltip";

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

type Tab = "dashboard" | "lancamentos" | "metas" | "bonificacao" | "historico" | "usuarios" | "empresas" | "auditoria" | "ia" | "dpote";

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
  const [expandirPrevistos, setExpandirPrevistos] = useState(false);

  const isAdmin = user?.role === "admin";
  const isGerente = user?.perfil === "gerente" || isAdmin;
  const isRecepcionista = user?.perfil === "recepcionista";
  const empresaVinculada = user?.empresaVinculada ?? null;
  // Super-admin: utilizador sem tenantId é o owner do sistema
  const isSuperAdmin = isAdmin && !(user as any)?.tenantId;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncingCashbarber, setSyncingCashbarber] = useState(false);

  const sincronizarTodasMutation = trpc.cashbarber.sincronizarTodas.useMutation({
    onSuccess: (data) => {
      const total = data.resultados.reduce((acc, r) => acc + r.diasSincronizados, 0);
      const erros = data.resultados.filter((r) => r.erros.length > 0);
      if (erros.length > 0) {
        toast.warning(`Sync concluída com avisos: ${total} dias importados. Erros em: ${erros.map((e) => e.empresa).join(", ")}`);
      } else {
        toast.success(`⚡ Sync CashBarber concluída! ${total} dias importados (${data.resultados.map((r) => `${r.empresa}: ${r.diasSincronizados}`).join(", ")})`);
      }
      setSyncingCashbarber(false);
    },
    onError: (err) => {
      toast.error(`Erro na sync: ${err.message}`);
      setSyncingCashbarber(false);
    },
  });

  const [syncingDpote, setSyncingDpote] = useState(false);
  // Estado para o painel de entrada manual de Recorrência
  const [recorrenciaManualSlug, setRecorrenciaManualSlug] = useState<string | null>(null);
  const [recorrenciaManualValor, setRecorrenciaManualValor] = useState("");
  const [syncingRecorrenciaSlug, setSyncingRecorrenciaSlug] = useState<string | null>(null);
  const sincronizarDpotePorEmpresaMutation = trpc.cashbarber.sincronizarDpotePorEmpresa.useMutation({
    onSuccess: (data) => {
      setSyncingRecorrenciaSlug(null);
      if (data.erros.length > 0) {
        toast.warning(`Sincronização com avisos: ${data.erros.join(", ")}`);
      } else if (data.recorrenciaAtualizada) {
        toast.success(`↻ Recorrência sincronizada! ${data.empresa}: ${fmtFull(data.recorrenciaValor)}`);
      } else {
        toast.info("CashBarber sincronizado. Nenhuma alteração no valor de Recorrência.");
      }
      refetchFat();
    },
    onError: (err) => {
      setSyncingRecorrenciaSlug(null);
      toast.error(`Erro ao sincronizar com CashBarber: ${err.message}`);
    },
  });
  const { refetch: refetchConfigsDpote } = trpc.cashbarber.listarConfigsDpote.useQuery();
  const salvarRecorrenciaFonteMutation = trpc.cashbarber.salvarRecorrenciaFonte.useMutation({
    onSuccess: (data) => {
      if (data.fonte === "cashbarber") {
        toast.success("↻ Fonte alterada para CashBarber API. Sincronizando...");
      } else {
        toast.success("✏️ Fonte alterada para Manual.");
      }
      refetchConfigsDpote();
      refetchFat();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar fonte de Recorrência: ${err.message}`);
    },
  });
  const salvarRecorrenciaManualMutation = trpc.faturamento.salvarRecorrenciaManual.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Recorrência atualizada! Valor diário: ${fmtFull(data.valorDiario)} por dia (${data.diasAtualizados + data.diasInseridos} dias atualizados)`
      );
      setRecorrenciaManualSlug(null);
      setRecorrenciaManualValor("");
      refetchFat();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar Recorrência: ${err.message}`);
    },
  });

  const sincronizarDpoteMutation = trpc.cashbarber.sincronizarDpote.useMutation({
    onSuccess: (data) => {
      const atualizadas = data.resultados.filter((r) => r.recorrenciaAtualizada);
      const erros = data.resultados.filter((r) => r.erros.length > 0);
      if (erros.length > 0) {
        toast.warning(`Dpote sincronizado com avisos. Erros em: ${erros.map((e) => e.empresa).join(", ")}`);
      } else if (atualizadas.length > 0) {
        const resumo = atualizadas
          .map((r) => `${r.empresa}: R$ ${r.recorrenciaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`)
          .join(", ");
        toast.success(`↻ Recorrência atualizada! ${resumo}`);
      } else {
        toast.info("Dpote sincronizado. Nenhuma alteração no valor de Recorrência.");
      }
      setSyncingDpote(false);
      refetchFat();
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar Dpote: ${err.message}`);
      setSyncingDpote(false);
    },
  });

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
        ...(isGerente ? ["historico"] as Tab[] : []),
        ...(isGerente ? ["dpote"] as Tab[] : []),
        ...(isGerente ? ["ia"] as Tab[] : []),
      ];

  // Queries
  const { data: empresasData = [], isLoading: loadingEmpresas } = trpc.empresa.listar.useQuery();
  const { data: faturamentosData = [], isLoading: loadingFat, refetch: refetchFat } =
    trpc.faturamento.listar.useQuery({ mes, ano });
  const { data: metasData = [], isLoading: loadingMetas, refetch: refetchMetas } =
    trpc.meta.listar.useQuery({ mes, ano });

  // Configurações Dpote por empresa (valor bruto de assinaturas e percentual)
  const { data: configsDpote = [] } = trpc.cashbarber.listarConfigsDpote.useQuery();
  // Mapa slug → config Dpote para acesso rápido
  const dpoteConfigMap = useMemo(() => {
    const m: Record<string, {
      valorAssinaturas: number | null;
      temHistorico: boolean;
      recorrenciaFonte: "cashbarber" | "manual";
      recorrenciaValorManual: number | null;
      recorrenciaManualAtualizadoEm: Date | null;
    }> = {};
    for (const c of configsDpote) {
      m[c.empresaSlug] = {
        valorAssinaturas: c.dpoteValorAssinaturas,
        temHistorico: !!(c.dpoteHistoricoId),
        recorrenciaFonte: c.recorrenciaFonte ?? "cashbarber",
        recorrenciaValorManual: c.recorrenciaValorManual ?? null,
        recorrenciaManualAtualizadoEm: c.recorrenciaManualAtualizadoEm ?? null,
      };
    }
    return m;
  }, [configsDpote]);

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
        return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
          .reduce((acc: number, v: any) => acc + parseFloat(v || "0"), 0);
      }, 0);
      // Total apenas realizados (para cálculos de média, máximo, mínimo)
      const totalRealizado = rowsRealizados.reduce((s: number, r: any) => {
        return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
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
        [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0)
      );
      const maiorDia = totaisDiariosRealizados.length > 0 ? Math.max(...totaisDiariosRealizados) : 0;
      const menorDia = totaisDiariosRealizados.length > 0 ? Math.min(...totaisDiariosRealizados) : 0;

      const meta = metasData.find((m: any) => m.empresaSlug === emp.slug);
      const metaMensal = parseFloat(String(meta?.metaMensal || "0"));
      const metaQuinzenal = parseFloat(String(meta?.metaQuinzenal || "0"));
      const superMeta = parseFloat(String(meta?.superMeta || "0"));
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
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);

      const diasUteisRestantes = Math.max(0, diasUteis - diasUteisDecorridos);
      const diasUteisRestantesQuinzenal = Math.max(0, diasUteisQuinzenal - diasUteisDecrridosQuinzenal);

      // Meta/dia dinâmica: quanto precisa fazer por dia útil restante para atingir a meta
      // Usa totalRealizado para não contar previstos como já conquistados
      const faltaMensal = Math.max(0, metaMensal - totalRealizado);
      const metaDiariaDinamicaMensal = diasUteisRestantes > 0 ? faltaMensal / diasUteisRestantes : 0;

      const faltaQuinzenal = Math.max(0, metaQuinzenal - totalQuinzenal);
      const metaDiariaDinamicaQuinzenal = diasUteisRestantesQuinzenal > 0 ? faltaQuinzenal / diasUteisRestantesQuinzenal : 0;

      // Projeção: realizado + previsto já lançado + (média diária × dias úteis sem lançamento)
      // Dias úteis sem nenhum lançamento (nem realizado nem previsto)
      const diasComLancamento = new Set(rows.map((r: any) => r.data)).size;
      const diasUteisRestantesSemLancamento = Math.max(0, diasUteis - diasComLancamento);
      const projecaoFinal = diasRealizados > 0
        ? totalRealizado + totalPrevisto + (mediaDiaria * diasUteisRestantesSemLancamento)
        : totalPrevisto; // se ainda não há realizados, usa apenas os previstos

      // Totais por categoria (9 categorias)
      const catTotals = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      rows.forEach((r: any) => {
        catTotals[0] += parseFloat(r.cat1 || "0");
        catTotals[1] += parseFloat(r.cat2 || "0");
        catTotals[2] += parseFloat(r.cat3 || "0");
        catTotals[3] += parseFloat(r.cat4 || "0");
        catTotals[4] += parseFloat(r.cat5 || "0");
        catTotals[5] += parseFloat(r.cat6 || "0");
        catTotals[6] += parseFloat(r.cat7 || "0");
        catTotals[7] += parseFloat(r.cat8 || "0");
        catTotals[8] += parseFloat(r.cat9 || "0");
      });

      // Recorrência Dpote: soma de cat9 de todos os dias (distribuído diariamente, um valor por dia)
      const recorrenciaMes = rows.reduce(
        (acc: number, r: any) => acc + parseFloat(r.cat9 || "0"),
        0
      );

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
        superMeta,
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
        recorrenciaMes,
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
  const superMetaTotalGeral = statsPorEmpresa.reduce((s, e) => s + e.superMeta, 0);

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
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      const rowsAnterior = faturamentosAnteriorFiltrados.filter((f: any) => {
        if (f.empresaSlug !== emp.slug) return false;
        const dia = parseInt(f.data.split("-")[2]);
        return diasAtual.has(dia);
      });
      const totalAnterior = rowsAnterior.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      totalAnteriorMesmosDias += totalAnterior;
      porEmpresa[emp.slug] = { totalAtual, totalAnterior, diasAtual: diasAtual.size, diasAnterior: rowsAnterior.length };
    });
    const variacaoTotal = totalGeral > 0 && totalAnteriorMesmosDias > 0
      ? ((totalGeral - totalAnteriorMesmosDias) / totalAnteriorMesmosDias) * 100
      : null;
    return { totalAnteriorMesmosDias, variacaoTotal, porEmpresa, periodoLabel, diaInicio, diaFim };
  }, [faturamentosFiltrados, faturamentosAnteriorFiltrados, empresasVisiveis, totalGeral]);


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
      // Usar categorias do banco; fallback para padrão se não houver
      const cats = (emp as any).categorias as Array<{ id: number; nome: string; ordem: number }> | undefined;
      const labels = cats && cats.length > 0
        ? cats.map((c) => c.nome)
        : emp.tipoCategorias === "seraphine"
          ? ["Cabelo", "Manicure", "Outros", "Pacote", "Recorrência", "", "", "", ""]
          : ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência"];
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
        const total = [f.cat1, f.cat2, f.cat3, f.cat4, f.cat5, f.cat6, f.cat7, f.cat8, f.cat9]
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

  // Dados para gráfico de barras de categorias Seraphine (usa nomes do banco)
  const barDataCategoriasSeraphine = useMemo(() => {
    const COLORS_CAT = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
    // Filtrar apenas empresas do tipo seraphine com dados
    const seraphineStats = statsPorEmpresa.filter(
      (s) => s.emp.tipoCategorias === "seraphine" && s.total > 0
    );
    if (seraphineStats.length === 0) return null;
    // Usar categorias do banco da primeira empresa seraphine como referência de labels
    const refEmp = seraphineStats[0].emp;
    const refCats = (refEmp as any).categorias as Array<{ nome: string }> | undefined;
    const LABELS = refCats && refCats.length > 0
      ? refCats.map((c) => c.nome)
      : ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"];
    // Montar dados no formato: cada barra = uma empresa, cada grupo = uma categoria
    const data = LABELS.map((label, i) => {
      const entry: Record<string, any> = { categoria: label, cor: COLORS_CAT[i % COLORS_CAT.length] };
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
          msg: `${s.emp.nome}: média diária ${fmt(s.mediaDiaria)} — precisa de +${fmt(faltaDia)}/dia para atingir a meta.`,
        });
      } else if (progresso >= 1) {
        list.push({ tipo: "success", msg: `${s.emp.nome}: Meta mensal atingida!` });
      } else if (diasPassados > 0) {
        list.push({ tipo: "info", msg: `${s.emp.nome}: No caminho certo. Média ${fmt(s.mediaDiaria)}/dia.` });
      }
      // Quinzenal
      if (s.metaQuinzenal > 0 && mes === hoje.getMonth() + 1 && hoje.getDate() <= 15) {
        const totalQuinzenal = s.rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= 15)
          .reduce((acc: number, r: any) => acc + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9]
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
              {isAdmin && (
                <button
                  onClick={() => {
                    setSyncingCashbarber(true);
                    sincronizarTodasMutation.mutate({ mes, ano });
                  }}
                  disabled={syncingCashbarber}
                  title="Sincronizar dados do CashBarber agora"
                  className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl hover:bg-emerald-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncingCashbarber
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {syncingCashbarber ? "Sincronizando..." : "Sync CB"}
                </button>
              )}
              {isGerente && (
                <button
                  onClick={() => {
                    setSyncingDpote(true);
                    sincronizarDpoteMutation.mutate();
                  }}
                  disabled={syncingDpote}
                  title="Atualizar Recorrência (Dpote) agora"
                  className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 px-3 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncingDpote
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Repeat2 className="w-4 h-4" />}
                  {syncingDpote ? "Atualizando..." : "Sync Dpote"}
                </button>
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
              {isAdmin && (
                <button
                  onClick={() => {
                    setSyncingCashbarber(true);
                    sincronizarTodasMutation.mutate({ mes, ano });
                    setMobileMenuOpen(false);
                  }}
                  disabled={syncingCashbarber}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-emerald-600 hover:bg-emerald-50 transition-colors font-medium disabled:opacity-50"
                >
                  {syncingCashbarber
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {syncingCashbarber ? "Sincronizando CashBarber..." : "Sincronizar CashBarber"}
                </button>
              )}
              {isGerente && (
                <button
                  onClick={() => {
                    setSyncingDpote(true);
                    sincronizarDpoteMutation.mutate();
                    setMobileMenuOpen(false);
                  }}
                  disabled={syncingDpote}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors font-medium disabled:opacity-50"
                >
                  {syncingDpote
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Repeat2 className="w-4 h-4" />}
                  {syncingDpote ? "Atualizando Dpote..." : "Sincronizar Dpote"}
                </button>
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
                historico: "Histórico",
                usuarios: "Usuários",
                empresas: "Empresas",
                auditoria: "Auditoria",
                ia: "Análise IA",
                dpote: "Dpote",
              };
              const icons: Record<Tab, React.ReactNode> = {
                dashboard: <TrendingUp className="w-4 h-4" />,
                lancamentos: <Calendar className="w-4 h-4" />,
                metas: <Target className="w-4 h-4" />,
                bonificacao: <CheckCircle2 className="w-4 h-4" />,
                historico: <Trophy className="w-4 h-4" />,
                usuarios: <Users className="w-4 h-4" />,
                empresas: <Building2 className="w-4 h-4" />,
                auditoria: <Shield className="w-4 h-4" />,
                ia: <Sparkles className="w-4 h-4" />,
                dpote: <Repeat2 className="w-4 h-4" />,
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
                {/* Projeção consolidada com previstos */}
                {(() => {
                  const projecaoTotal = statsPorEmpresa.reduce((s, e) => s + e.projecaoFinal, 0);
                  if (projecaoTotal <= 0 || metaTotalGeral <= 0) return null;
                  const atingeMeta = projecaoTotal >= metaTotalGeral;
                  return (
                    <p className={`text-xs font-semibold mt-1 ${atingeMeta ? "text-emerald-400" : "text-amber-400"}`}>
                      Projeção: {fmt(projecaoTotal)} ({atingeMeta ? "✓ atinge meta" : `falta ${fmt(metaTotalGeral - projecaoTotal)}`})
                    </p>
                  );
                })()}
              </Card>
            </div>

            {/* Card Resumo de Previstos — aparece apenas quando há lançamentos futuros */}
            {totalGeralPrevisto > 0 && (
              <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
                {/* Cabeçalho clicável */}
                <button
                  onClick={() => setExpandirPrevistos((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-4 bg-amber-500/10 hover:bg-amber-500/15 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wide">
                          <Clock className="w-2.5 h-2.5" />
                          Previsto
                        </span>
                        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
                          {fmt(totalGeralPrevisto)}
                        </span>
                        <span className="text-xs text-amber-700 dark:text-amber-400">
                          em {statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0)} dia{statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0) !== 1 ? "s" : ""} futuro{statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0) !== 1 ? "s" : ""} lançado{statsPorEmpresa.reduce((s, e) => s + e.diasPrevistos, 0) !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-0.5">
                        Não afeta média, máximo e mínimo diário — apenas a projeção final
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      {expandirPrevistos ? "Ocultar" : "Ver detalhes"}
                    </span>
                    {expandirPrevistos
                      ? <ChevronUp className="w-4 h-4 text-amber-500" />
                      : <ChevronDown className="w-4 h-4 text-amber-500" />}
                  </div>
                </button>

                {/* Detalhes expandidos por unidade */}
                {expandirPrevistos && (
                  <div className="px-5 py-4 bg-amber-500/5 border-t border-amber-200/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {statsPorEmpresa
                        .filter((s) => s.totalPrevisto > 0)
                        .map((s) => {
                          // Usar rowsPrevistos já calculado no statsPorEmpresa
                          const diasDatas = s.rowsPrevistos
                            .map((f: any) => parseInt(f.data.split("-")[2]))
                            .sort((a: number, b: number) => a - b);
                          const projecaoAtingeMeta = s.projecaoFinal >= s.metaMensal && s.metaMensal > 0;
                          return (
                            <div
                              key={s.emp.slug}
                              className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/60 dark:bg-white/5 border border-amber-200/50"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: s.emp.cor }}
                                  />
                                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                    {s.emp.nome}
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                                  {fmt(s.totalPrevisto)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-500">
                                  {s.diasPrevistos} dia{s.diasPrevistos !== 1 ? "s" : ""}:{" "}
                                  {diasDatas.map((d: number) => `dia ${d}`).join(", ")}
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                  projecaoAtingeMeta ? "text-emerald-500" : "text-amber-500"
                                }`}>
                                  Proj. {fmt(s.projecaoFinal)}
                                </span>
                              </div>
                              {/* Mini barra de progresso da projeção */}
                              {s.metaMensal > 0 && (
                                <div className="h-1 bg-amber-100 dark:bg-amber-900/30 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all ${
                                      projecaoAtingeMeta ? "bg-emerald-400" : "bg-amber-400"
                                    }`}
                                    style={{ width: `${Math.min((s.projecaoFinal / s.metaMensal) * 100, 100)}%` }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>

                    {/* Linha de totais consolidados */}
                    <div className="mt-3 pt-3 border-t border-amber-200/40 flex flex-wrap items-center gap-4">
                      <div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wide font-semibold">Total Realizado</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(totalGeralRealizado)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wide font-semibold">Total Previsto</p>
                        <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{fmt(totalGeralPrevisto)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wide font-semibold">Realizado + Previsto</p>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(totalGeralRealizado + totalGeralPrevisto)}</p>
                      </div>
                      {metaTotalGeral > 0 && (
                        <div>
                          <p className="text-[10px] text-amber-600 dark:text-amber-500 uppercase tracking-wide font-semibold">Projeção Final</p>
                          <p className={`text-sm font-bold ${
                            statsPorEmpresa.reduce((s, e) => s + e.projecaoFinal, 0) >= metaTotalGeral
                              ? "text-emerald-500"
                              : "text-amber-700 dark:text-amber-300"
                          }`}>
                            {fmt(statsPorEmpresa.reduce((s, e) => s + e.projecaoFinal, 0))}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}

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
                                {s.superMeta > 0 && s.totalRealizado >= s.superMeta && (
                                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">★ Super!</span>
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

                  {/* Super Meta */}
                  {s.superMeta > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-amber-500 font-medium flex items-center gap-1">
                          ★ Super Meta: {fmt(s.superMeta)}
                        </span>
                        <span className={`font-bold ${s.totalRealizado >= s.superMeta ? "text-amber-400" : "text-amber-600"}`}>
                          {s.superMeta > 0 ? ((s.totalRealizado / s.superMeta) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                      <div className="h-2 bg-amber-500/20 rounded-full overflow-hidden border border-amber-500/30">
                        <div
                          className={`h-full rounded-full transition-all ${s.totalRealizado >= s.superMeta ? "bg-amber-400" : "bg-amber-300"}`}
                          style={{ width: `${Math.min((s.totalRealizado / s.superMeta) * 100, 100)}%` }}
                        />
                      </div>
                      {s.totalRealizado >= s.superMeta ? (
                        <p className="text-xs text-amber-400 mt-0.5 font-semibold">★ Super meta atingida! Parabéns!</p>
                      ) : (
                        <p className="text-xs text-amber-500/70 mt-0.5">Falta {fmt(s.superMeta - s.totalRealizado)} para a super meta</p>
                      )}
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
                      {/* Legenda: mostra composição da projeção quando há previstos */}
                      {s.totalPrevisto > 0 && s.projecaoFinal > 0 && (
                        <p className="text-[10px] text-amber-400 mt-0.5">
                          incl. {fmt(s.totalPrevisto)} previsto
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Linha de Recorrência Dpote */}
                  {(s.recorrenciaMes > 0 || isGerente) && (() => {
                    const dpoteCfg = dpoteConfigMap[s.emp.slug];
                    const valorBruto = dpoteCfg?.valorAssinaturas;
                    const fonteAtual = dpoteCfg?.recorrenciaFonte ?? "cashbarber";
                    const isEditandoEsta = recorrenciaManualSlug === s.emp.slug;
                    const diasDoMes = new Date(ano, mes, 0).getDate();
                    const diaHoje = (new Date().getFullYear() === ano && new Date().getMonth() + 1 === mes)
                      ? new Date().getDate() : diasDoMes;
                    const valorManualNum = parseFloat(recorrenciaManualValor.replace(",", ".")) || 0;
                    const previewDiario = valorManualNum > 0 && diaHoje > 0 ? valorManualNum / diaHoje : 0;
                    const previewProjecaoMensal = previewDiario * diasDoMes;
                    const isSavingFonte = salvarRecorrenciaFonteMutation.isPending;
                    return (
                      <div className="mt-3 rounded-xl bg-violet-500/10 border border-violet-500/20 overflow-hidden">
                        {/* Linha principal: ícone + rótulo + valor */}
                        <div className="flex items-center justify-between gap-2 px-3 py-2">
                          <div className="flex items-center gap-1.5">
                            <Repeat2 className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                            <span className="text-xs font-semibold text-violet-400">Recorrência (Dpote)</span>
                          </div>
                          {valorBruto ? (
                            <UITooltip>
                              <UITooltipTrigger asChild>
                                <span className="text-sm font-bold text-violet-300 cursor-help underline decoration-dotted decoration-violet-400/50 underline-offset-2">
                                  {fmt(s.recorrenciaMes)}
                                </span>
                              </UITooltipTrigger>
                              <UITooltipContent side="top" className="max-w-xs bg-slate-900 border border-violet-500/30 text-violet-100 px-3 py-2.5 rounded-xl shadow-xl">
                                <p className="text-[11px] font-semibold text-violet-300 mb-1.5">Fórmula do cálculo Dpote</p>
                                <div className="space-y-1 text-[11px] text-violet-200/80">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-violet-400 font-mono">Assinaturas (100%)</span>
                                    <span className="text-violet-500">=</span>
                                    <span className="font-semibold text-white">{fmtFull(valorBruto)}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-violet-400 font-mono">× Proporção fichas desta filial</span>
                                    <span className="text-violet-500">=</span>
                                    <span className="font-semibold text-white">{valorBruto > 0 ? `${((s.recorrenciaMes / valorBruto) * 100).toFixed(1)}%` : "—"}</span>
                                  </div>
                                  <div className="mt-1.5 pt-1.5 border-t border-violet-500/30 flex items-center gap-1.5">
                                    <span className="text-violet-300 font-mono font-semibold">= Faturamento Recorrência</span>
                                    <span className="text-violet-500">=</span>
                                    <span className="font-bold text-violet-200">{fmtFull(s.recorrenciaMes)}</span>
                                  </div>
                                </div>
                              </UITooltipContent>
                            </UITooltip>
                          ) : (
                            <span className="text-sm font-bold text-violet-300">{fmt(s.recorrenciaMes)}</span>
                          )}
                        </div>

                        {/* Seletor de fonte — visível para gerentes/admin quando há configuração Dpote */}
                        {isGerente && valorBruto && (
                          <div className="px-3 pb-2.5">
                            {/* Toggle CashBarber / Manual */}
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/60 border border-violet-500/20">
                              <button
                                onClick={() => {
                                  if (fonteAtual !== "cashbarber" && !isSavingFonte) {
                                    salvarRecorrenciaFonteMutation.mutate({ empresaSlug: s.emp.slug, fonte: "cashbarber", mes, ano });
                                  }
                                }}
                                disabled={isSavingFonte}
                                className={`flex-1 flex items-center justify-center gap-1.5 h-6 rounded-md text-[10px] font-semibold transition-all ${
                                  fonteAtual === "cashbarber"
                                    ? "bg-emerald-500/25 text-emerald-300 shadow-sm"
                                    : "text-slate-400 hover:text-slate-300"
                                }`}
                              >
                                {isSavingFonte && fonteAtual === "manual" ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-2.5 h-2.5" />
                                )}
                                CashBarber API
                              </button>
                              <button
                                onClick={() => {
                                  if (fonteAtual !== "manual" && !isSavingFonte) {
                                    // Ao mudar para manual, abrir painel de entrada
                                    setRecorrenciaManualSlug(s.emp.slug);
                                    setRecorrenciaManualValor("");
                                    salvarRecorrenciaFonteMutation.mutate({ empresaSlug: s.emp.slug, fonte: "manual", mes, ano });
                                  } else if (fonteAtual === "manual") {
                                    // Já está em manual: toggle do painel de edição
                                    if (isEditandoEsta) {
                                      setRecorrenciaManualSlug(null);
                                      setRecorrenciaManualValor("");
                                    } else {
                                      setRecorrenciaManualSlug(s.emp.slug);
                                      setRecorrenciaManualValor("");
                                    }
                                  }
                                }}
                                disabled={isSavingFonte}
                                className={`flex-1 flex items-center justify-center gap-1.5 h-6 rounded-md text-[10px] font-semibold transition-all ${
                                  fonteAtual === "manual"
                                    ? "bg-violet-500/30 text-violet-200 shadow-sm"
                                    : "text-slate-400 hover:text-slate-300"
                                }`}
                              >
                                {isSavingFonte && fonteAtual === "cashbarber" ? (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Pencil className="w-2.5 h-2.5" />
                                )}
                                Manual
                                {fonteAtual === "manual" && dpoteCfg?.recorrenciaValorManual && (
                                  <span className="ml-0.5 text-[9px] text-violet-300/70">({fmtFull(dpoteCfg.recorrenciaValorManual)})</span>
                                )}
                              </button>
                            </div>
                            {/* Data/hora da última atualização manual + informação de assinaturas */}
                            <div className="mt-1 flex items-center justify-between gap-1">
                              {fonteAtual === "manual" && dpoteCfg?.recorrenciaManualAtualizadoEm ? (
                                <span className="inline-flex items-center gap-1 text-[9px] text-violet-400/70">
                                  <Clock className="w-2.5 h-2.5 flex-shrink-0" />
                                  Atualizado em{" "}
                                  {new Date(dpoteCfg.recorrenciaManualAtualizadoEm).toLocaleString("pt-BR", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              ) : (
                                <span />
                              )}
                              <span className="text-[9px] text-violet-400/60">
                                {fmtFull(valorBruto)} assinaturas (100%)
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Badge de fonte para não-gerentes */}
                        {!isGerente && valorBruto && (
                          <div className="flex items-center gap-1.5 px-3 pb-2">
                            {fonteAtual === "cashbarber" ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                CashBarber API
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded-md">
                                <Pencil className="w-2.5 h-2.5" />
                                Manual
                              </span>
                            )}
                          </div>
                        )}

                        {/* Painel inline de entrada manual de Recorrência (apenas quando fonte = manual) */}
                        {isEditandoEsta && isGerente && fonteAtual === "manual" && (
                          <div className="border-t border-violet-500/20 px-3 py-3 bg-violet-500/5">
                            <p className="text-[11px] text-violet-300/80 mb-2 font-medium">
                              Informe o valor total de Recorrência apurado até hoje. O sistema distribui pelos dias já decorridos.
                            </p>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-violet-400 text-xs font-semibold">R$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={recorrenciaManualValor}
                                  onChange={(e) => setRecorrenciaManualValor(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" && valorManualNum > 0) {
                                      salvarRecorrenciaManualMutation.mutate({ empresaSlug: s.emp.slug, mes, ano, valorTotal: valorManualNum });
                                    }
                                    if (e.key === "Escape") { setRecorrenciaManualSlug(null); setRecorrenciaManualValor(""); }
                                  }}
                                  className="pl-8 h-8 text-sm bg-slate-800/60 border-violet-500/30 text-violet-100 placeholder:text-violet-400/40 focus:border-violet-400 focus:ring-violet-400/20"
                                  autoFocus
                                />
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (valorManualNum > 0) {
                                    salvarRecorrenciaManualMutation.mutate({ empresaSlug: s.emp.slug, mes, ano, valorTotal: valorManualNum });
                                  }
                                }}
                                disabled={valorManualNum <= 0 || salvarRecorrenciaManualMutation.isPending}
                                className="h-8 px-3 text-xs bg-violet-600 hover:bg-violet-500 text-white shrink-0"
                              >
                                {salvarRecorrenciaManualMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Aplicar"}
                              </Button>
                              <button
                                onClick={() => { setRecorrenciaManualSlug(null); setRecorrenciaManualValor(""); }}
                                className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors shrink-0"
                              >
                                <XIcon className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            {valorManualNum > 0 && (
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div className="rounded-lg bg-violet-500/10 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-violet-400/70 uppercase tracking-wide">Diário (média)</p>
                                  <p className="text-[11px] font-bold text-violet-300">{fmtFull(previewDiario)}</p>
                                </div>
                                <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-emerald-400/70 uppercase tracking-wide">Apurado até dia {diaHoje}</p>
                                  <p className="text-[11px] font-bold text-emerald-300">{fmtFull(valorManualNum)}</p>
                                </div>
                                <div className="rounded-lg bg-slate-500/10 px-2 py-1.5 text-center">
                                  <p className="text-[9px] text-slate-400/70 uppercase tracking-wide">Projeção Mensal</p>
                                  <p className="text-[11px] font-bold text-slate-300">{fmtFull(previewProjecaoMensal)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

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
                  // Usar categorias do banco; fallback para padrão
                  const empCats = (s.emp as any).categorias as Array<{ nome: string }> | undefined;
                  const labels = empCats && empCats.length > 0
                    ? empCats.map((c) => c.nome)
                    : s.emp.tipoCategorias === "seraphine"
                      ? ["Cabelo", "Manicure", "Outros", "Pacote", "Recorrência", "", "", "", ""]
                      : ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência"];
                  const pieData = labels
                    .map((l, i) => ({ name: l, value: s.catTotals[i] }))
                    .filter((d) => d.value > 0 && d.name);
                  const COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#f97316", "#84cc16", "#8b5cf6"];
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
                // Usar categorias do banco; fallback para padrão
                const empCats = (emp as any).categorias as Array<{ nome: string }> | undefined;
                const labels = empCats && empCats.length > 0
                  ? empCats.map((c) => c.nome)
                  : emp.tipoCategorias === "seraphine"
                    ? ["Cabelo", "Manicure", "Outros", "Pacote", "Recorrência", "", "", "", ""]
                    : ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência"];
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
                            const cats = [row.cat1, row.cat2, row.cat3, row.cat4, row.cat5, row.cat6, row.cat7, row.cat8, row.cat9].map((v: any) => parseFloat(v || "0"));
                            const total = cats.reduce((a: number, b: number) => a + b, 0);
                            const [, , dia] = row.data.split("-");
                            // Detectar se o dia é futuro (previsto)
                            const hojeRef = new Date();
                            const diaHojeRef = mes === hojeRef.getMonth() + 1 && ano === hojeRef.getFullYear()
                              ? hojeRef.getDate()
                              : new Date(ano, mes, 0).getDate();
                            const isFuturo = parseInt(dia) > diaHojeRef;
                            return (
                              <tr
                                key={row.id}
                                className={`border-t transition-colors ${
                                  isFuturo
                                    ? "border-amber-200/50 bg-amber-50/40 hover:bg-amber-50/70 dark:bg-amber-500/5 dark:border-amber-500/20 dark:hover:bg-amber-500/10"
                                    : "border-border hover:bg-muted/30"
                                }`}
                              >
                                <td className="px-4 py-3 font-medium">
                                  <div className="flex items-center gap-2">
                                    <span className={isFuturo ? "text-amber-700 dark:text-amber-300" : "text-foreground"}>
                                      {parseInt(dia)}/{mes.toString().padStart(2, "0")}
                                    </span>
                                    {isFuturo && (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
                                        <Clock className="w-2.5 h-2.5" />
                                        Previsto
                                      </span>
                                    )}
                                    {row.sincronizadoCB === 1 && (
                                      <span
                                        title="Dados importados automaticamente do CashBarber"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/20"
                                      >
                                        <Zap className="w-2.5 h-2.5" />
                                        CB
                                      </span>
                                    )}
                                  </div>
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
                        {/* Rodapé com subtotais realizados e previstos */}
                        {(() => {
                          const hoje2 = new Date();
                          const diaHoje2 = mes === hoje2.getMonth() + 1 && ano === hoje2.getFullYear()
                            ? hoje2.getDate()
                            : new Date(ano, mes, 0).getDate();
                          const realizados = rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= diaHoje2);
                          const previstos  = rows.filter((r: any) => parseInt(r.data.split("-")[2]) >  diaHoje2);
                          const sumCats = (list: any[]) =>
                            [0,1,2,3,4,5,6,7,8].map((i) =>
                              list.reduce((s: number, r: any) => s + parseFloat([r.cat1,r.cat2,r.cat3,r.cat4,r.cat5,r.cat6,r.cat7,r.cat8,r.cat9][i] || "0"), 0)
                            );
                          const catsReal = sumCats(realizados);
                          const catsPrev = sumCats(previstos);
                          const totalReal = catsReal.reduce((a, b) => a + b, 0);
                          const totalPrev = catsPrev.reduce((a, b) => a + b, 0);
                          const hasPrev = previstos.length > 0;
                          return (
                            <tfoot>
                              {/* Linha Realizado */}
                              <tr className="border-t-2 border-border bg-muted/30">
                                <td className="px-4 py-2.5 text-xs font-semibold text-foreground/70 uppercase tracking-wide">
                                  Realizado
                                </td>
                                {catsReal.map((v, i) => (
                                  <td key={i} className="px-4 py-2.5 text-right text-xs font-semibold text-foreground/80">
                                    {v > 0 ? fmt(v) : <span className="text-muted-foreground/30">—</span>}
                                  </td>
                                ))}
                                <td className="px-4 py-2.5 text-right text-sm font-bold text-foreground">{fmt(totalReal)}</td>
                                {isGerente && !isRecepcionista && <td />}
                              </tr>
                              {/* Linha Previsto — só aparece se houver lançamentos futuros */}
                              {hasPrev && (
                                <tr className="border-t border-amber-200/60 bg-amber-50/50 dark:bg-amber-500/5 dark:border-amber-500/20">
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                                      <Clock className="w-3 h-3" />
                                      Previsto
                                    </span>
                                  </td>
                                  {catsPrev.map((v, i) => (
                                    <td key={i} className="px-4 py-2.5 text-right text-xs font-semibold text-amber-700/80 dark:text-amber-400/80">
                                      {v > 0 ? fmt(v) : <span className="text-amber-400/30">—</span>}
                                    </td>
                                  ))}
                                  <td className="px-4 py-2.5 text-right text-sm font-bold text-amber-700 dark:text-amber-400">{fmt(totalPrev)}</td>
                                  {isGerente && !isRecepcionista && <td />}
                                </tr>
                              )}
                              {/* Linha Total Geral */}
                              <tr className="border-t border-border bg-muted/50">
                                <td className="px-4 py-2.5 text-xs font-bold text-foreground uppercase tracking-wide">
                                  Total Geral
                                </td>
                                {catsReal.map((v, i) => (
                                  <td key={i} className="px-4 py-2.5 text-right text-xs font-bold text-foreground">
                                    {(v + catsPrev[i]) > 0 ? fmt(v + catsPrev[i]) : <span className="text-muted-foreground/30">—</span>}
                                  </td>
                                ))}
                                <td className="px-4 py-2.5 text-right text-sm font-bold text-foreground">{fmt(totalReal + totalPrev)}</td>
                                {isGerente && !isRecepcionista && <td />}
                              </tr>
                            </tfoot>
                          );
                        })()}
                      </table>
                    </div>
                  </Card>
                );
              })
            )}
            {/* Legenda dos indicadores */}
            {faturamentosData.some((f: any) => f.sincronizadoCB === 1) && (
              <div className="flex items-center gap-4 px-1 pt-1 pb-2">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                    <Zap className="w-2.5 h-2.5" />
                    CB
                  </span>
                  <span>Dados importados automaticamente do CashBarber</span>
                </div>
              </div>
            )}
          </div>
        )}
        {/* METAS */}
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
            totaisRealizados={Object.fromEntries(statsPorEmpresa.map((s) => [s.emp.slug, s.totalRealizado]))}
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

        {/* ─── HISTÓRICO ANUAL ────────────────────────────────────────────────── */}
        {activeTab === "historico" && isGerente && (
          <HistoricoAnual
            empresasData={empresasVisiveis}
            empresaVinculada={empresaVinculada}
            isGerente={isGerente}
            isAdmin={isAdmin}
          />
        )}

             {/* ─── DPOTE DISTRIBUIÇÃO ────────────────────────────────────────── */}
        {activeTab === "dpote" && isGerente && <DpoteDistribuicao />}

        {/* ─── ANÁLISE IA ────────────────────────────────────────────────── */}
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
