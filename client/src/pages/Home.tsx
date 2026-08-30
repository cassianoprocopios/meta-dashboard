import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Calendar, Plus, AlertCircle,
  CheckCircle2, Clock, Building2, Users, Loader2, LogIn, LogOut, Shield, Menu, X as XIcon, Sparkles,
  ChevronDown, ChevronUp, Sun, Moon, ChevronLeft, ChevronRight, BellRing, Trophy, Zap, RefreshCw, Repeat2,
  Info, Pencil,
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
import AppSidebar from "@/components/AppSidebar";
import BottomNav from "@/components/BottomNav";
import TabPanel from "@/components/TabPanel";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import LancamentosSkeleton from "@/components/LancamentosSkeleton";
import MetasSkeleton from "@/components/MetasSkeleton";
import { Tooltip as UITooltip, TooltipContent as UITooltipContent, TooltipTrigger as UITooltipTrigger } from "@/components/ui/tooltip";
import { useWebSocket } from "@/hooks/useWebSocket";
import AvecSyncModal from "@/components/AvecSyncModal";
import UnitDrilldownModal from "@/components/UnitDrilldownModal";
import { QuinzenalCelebration, QuinzenalCelebrationCompact } from "@/components/QuinzenalCelebration";
import { MensalCelebration, MensalCelebrationCompact } from "@/components/MensalCelebration";
import ClientesEvolucaoChart from "@/components/ClientesEvolucaoChart";

import ClientesPorUnidadeCard from "@/components/ClientesPorUnidadeCard";
import ClientesEvolucaoMensalChart from "@/components/ClientesEvolucaoMensalChart";
import RankingProfissionaisPorClientes from "@/components/RankingProfissionaisPorClientes";
import { calcularTotalQuinzenal } from "@shared/quinzenal";
import { calcularBonificacaoSubstitutiva, calcularProgressoSuperMeta } from "@shared/bonificacao";
import { SuperMetaProgressTooltip } from "@/components/SuperMetaProgressTooltip";
import {
  calcularIndicadoresDiasRestantes,
  classificarViabilidadeNecessidadeDiaria,
  contarDiasFuncionamentoNoIntervalo,
  obterDiaInicialDiasRestantes,
} from "@shared/calendarioFuncionamento";


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

const TAB_TITLES: Record<Tab, { title: string; subtitle: string }> = {
  dashboard: { title: "Visão geral", subtitle: "Faturamento, metas e performance das unidades" },
  lancamentos: { title: "Lançamentos", subtitle: "Faturamento diário e movimentações" },
  metas: { title: "Metas", subtitle: "Objetivos mensais, quinzenais e calendário" },
  bonificacao: { title: "Bonificações", subtitle: "Resultados e valores por unidade" },
  historico: { title: "Histórico anual", subtitle: "Evolução e comparativos do ano" },
  usuarios: { title: "Usuários", subtitle: "Acessos, perfis e permissões" },
  empresas: { title: "Empresas", subtitle: "Configuração das unidades" },
  auditoria: { title: "Auditoria", subtitle: "Rastreabilidade das ações" },
  ia: { title: "Análise inteligente", subtitle: "Insights orientados pelos dados do negócio" },
  dpote: { title: "Dpote", subtitle: "Distribuição e recorrência por unidade" },
};

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
  const { user, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
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
  const [selectedUnitForDrilldown, setSelectedUnitForDrilldown] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";
  const isGerente = user?.perfil === "gerente" || isAdmin;
  const isRecepcionista = user?.perfil === "recepcionista";
  const empresaVinculada = user?.empresaVinculada ?? null;
  // Super-admin: utilizador sem tenantId é o owner do sistema
  const isSuperAdmin = isAdmin && !(user as any)?.tenantId;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [syncingCashbarber, setSyncingCashbarber] = useState(false);
  const utils = trpc.useUtils();
  const { isConnected: wsConnected, totalConnected } = useWebSocket();

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

  // ─── Sync Avec (Seraphine) ────────────────────────────────────────────────
  const [syncingAvec, setSyncingAvec] = useState(false);
  const [avecSyncModalOpen, setAvecSyncModalOpen] = useState(false);
  // Polling do status do job automático do Avec (a cada 10s)
  const { data: avecJobStatus } = trpc.avec.statusJob.useQuery(undefined, {
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  });
  const avecJobRodando = avecJobStatus?.status === "running";
  const sincronizarAvecMutation = trpc.avec.sincronizar.useMutation({
    onSuccess: (data) => {
      setSyncingAvec(false);
      if (data.erros) {
        toast.error(`Erro no Sync Avec: ${data.erros}`);
      } else {
        toast.success(`\u26A1 Sync Avec conclu\u00eddo! ${data.diasSincronizados} dias importados, ${data.diasFechados} fechados.`);
        refetchFat();
      }
    },
    onError: (err) => {
      setSyncingAvec(false);
      toast.error(`Erro no Sync Avec: ${err.message}`);
    },
  });

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
      refetchConfigsDpote(); // atualiza timestamp e valor manual no card
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
    trpc.faturamento.listar.useQuery({ mes, ano }, {
      // Atualiza automaticamente a cada 2 minutos para refletir o Dpote distribuído pelo job automático
      refetchInterval: 2 * 60 * 1000,
      refetchIntervalInBackground: false, // só atualiza quando a aba está ativa
      staleTime: 0, // sempre busca dados frescos ao montar (sem cache antigo)
      gcTime: 0, // não mantém dados em cache entre sessões/navegações
      refetchOnWindowFocus: true, // atualiza ao voltar para a aba
      refetchOnMount: 'always', // sempre busca ao montar o componente
    });
  const { data: metasData = [], isLoading: loadingMetas, refetch: refetchMetas } =
    trpc.meta.listar.useQuery({ mes, ano });
  const { data: fechamentosData = [] } = trpc.fechamentos.listar.useQuery(
    { mes, ano },
    { enabled: isAuthenticated }
  );

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

  // Configurações de bonificação por empresa
  const { data: bonificacoesConfig = [] } = trpc.bonificacao.listar.useQuery(
    undefined,
    { enabled: isGerente || isAdmin, staleTime: 5 * 60_000 }
  );
  const bonificacaoMap = useMemo(() => {
    const m: Record<string, {
      pctQuinzenalSemMeta: number;
      pctQuinzenalComMeta: number;
      pctMensalSemMeta: number;
      pctMensalComMeta: number;
      pctSuperMeta: number;
    }> = {};
    for (const b of bonificacoesConfig) {
      m[b.empresaSlug] = {
        pctQuinzenalSemMeta: parseFloat(String(b.pctQuinzenalSemMeta || "0")),
        pctQuinzenalComMeta: parseFloat(String(b.pctQuinzenalComMeta || "0")),
        pctMensalSemMeta: parseFloat(String(b.pctMensalSemMeta || "0")),
        pctMensalComMeta: parseFloat(String(b.pctMensalComMeta || "0")),
        pctSuperMeta: parseFloat(String(b.pctSuperMeta || "0")),
      };
    }
    return m;
  }, [bonificacoesConfig]);

  // Mês anterior para comparativo
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anoAnterior = mes === 1 ? ano - 1 : ano;
  // Query para clientes atendidos
  const { data: clientesAtendidosData = { totalClientesUnicos: 0, porUnidade: {}, variacao: 0 } } = trpc.clientesAtendidos.consolidado.useQuery(
    { mes, ano },
    { enabled: !!user }
  );

   // Query para evolução de clientes
  const { data: evolucaoClientesData = [] } = trpc.clientesAtendidos.evolucaoUltimos3Meses.useQuery(
    { empresaSlug: undefined },
    { enabled: activeTab === "dashboard" }
  );
  // Query para evolução mensal de clientes por unidade
  const { data: evolucaoMensalData = [] } = trpc.clientesAtendidos.evolucaoMensalPorUnidade.useQuery(
    { meses: 12 },
    { enabled: activeTab === "dashboard" }
  );


  const { data: faturamentosAnteriorData = [] } = trpc.faturamento.listar.useQuery(
    { mes: mesAnterior, ano: anoAnterior },
    { enabled: activeTab === "dashboard" }
  );
  // Query para histórico anual (usado no comparativo com melhor mês do ano)
  const { data: historicoAnualData } = trpc.meta.historicoAnual.useQuery(
    { ano },
    { enabled: activeTab === "dashboard", staleTime: 5 * 60_000 }
  );
  // Ranking de profissionais do mês atual
  const { data: rankingData, isLoading: loadingRanking } = trpc.profissionais.ranking.useQuery(
    { mes, ano },
    { enabled: activeTab === "dashboard", staleTime: 60_000 }
  );
  const rankingProfissionais = rankingData?.lista ?? [];
  const rankingUltimaAtualizacao: Date | null = rankingData?.ultimaAtualizacao ?? null;

  // Empresas do utilizador (múltiplas unidades)
  const { data: userEmpresasSlugs = [] } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user && !isAdmin }
  );

  // Snapshots quinzenais congelados (valores definitivos para bonificação)
  const { data: snapshotsQuinzenais = [], refetch: refetchSnapshots } = trpc.snapshotQuinzenal.listar.useQuery(
    { ano },
    { staleTime: 5 * 60 * 1000, enabled: activeTab === "dashboard" }
  );

  const congelarQuinzenalMutation = trpc.snapshotQuinzenal.congelarManual.useMutation({
    onSuccess: () => {
      toast.success('Snapshot quinzenal congelado com sucesso! Valores definitivos salvos para bonificação.');
      refetchSnapshots();
    },
    onError: (err) => {
      toast.error(`Erro ao congelar snapshot: ${err.message}`);
    },
  });

  const deletarFat = trpc.faturamento.excluir.useMutation({
    onSuccess: () => {
      // Invalidar queries após deletar
      utils.faturamento.listar.invalidate();
      utils.profissionais.ranking.invalidate();
    },
  });

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
  // Mutation para verificar meta diária e notificar gerente
  const testarMetaDiariaMutation = trpc.notificacoes.testarMetaDiaria.useMutation({
    onSuccess: (data) => {
      toast.success(data.mensagem);
    },
    onError: () => {
      toast.error("Erro ao verificar meta diária. Tente novamente.");
    },
  });
  // Mutation para recalcular ranking do mês atual com critérios de exclusão atualizados
  const recalcularRankingMutation = trpc.profissionais.recalcularRankingMes.useMutation({
    onSuccess: (data) => {
      toast.success(data.mensagem);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao recalcular ranking. Tente novamente.");
    },
  });
  // Empresas visíveis para este usuárioo
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

  // Query para ranking de profissionais por clientes atendidos
  const [empresaSelecionadaRanking, setEmpresaSelecionadaRanking] = useState<string>("");
  useEffect(() => {
    if (empresasVisiveis.length > 0 && !empresaSelecionadaRanking) {
      setEmpresaSelecionadaRanking(empresasVisiveis[0].slug);
    }
  }, [empresasVisiveis]);

  const dataInicio = new Date(ano, mes - 1, 1).toISOString().split('T')[0];
  const dataFim = new Date(ano, mes, 0).toISOString().split('T')[0];

  const { data: rankingClientesData = [], isLoading: loadingRankingClientes } = trpc.relatorios.consolidadoPorProfissional.useQuery(
    {
      empresaSlug: empresaSelecionadaRanking,
      dataInicio,
      dataFim,
    },
    { enabled: activeTab === "dashboard" && !!empresaSelecionadaRanking }
  );

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
    const mesHoje = hoje.getMonth() + 1;
    const anoHoje = hoje.getFullYear();
    // Identifica o tipo do mês selecionado em relação ao mês real
    const ehMesVigente = mes === mesHoje && ano === anoHoje;
    const ehMesFuturo = ano > anoHoje || (ano === anoHoje && mes > mesHoje);
    // const ehMesPassado = !ehMesVigente && !ehMesFuturo; // implicitamente
    const diaHoje = ehMesVigente
      ? hoje.getDate()
      : new Date(ano, mes, 0).getDate(); // se mês passado/futuro, usa último dia do mês
    const ehPrimeiraQuinzena = diaHoje <= 15;
    const diaHojeQuinzenal = Math.min(diaHoje, 15); // cap em 15 para quinzenal

    return empresasVisiveis.map((emp) => {
      const rows = faturamentosFiltrados.filter((f: any) => f.empresaSlug === emp.slug);

      // Separar lançamentos realizados (dia ≤ hoje) de previstos (dia > hoje)
      const rowsRealizados = rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= diaHoje);
      const rowsPrevistos = rows.filter((r: any) => parseInt(r.data.split("-")[2]) > diaHoje);

      // =====================================================================
      // REGRA DE FATURAMENTO E RECORRÊNCIA DPOTE:
      //
      // MÊS PASSADO: cat9 já totalmente apurado → entra no faturamento
      // MÊS VIGENTE: apenas cat9 REAL do Dpote (já distribuído) entra no faturamento
      //              cat9 do mês anterior = PREVISÃO informativa (NÃO entra no faturamento)
      // MÊS FUTURO:  cat9 ainda não apurado → aparece como previsão informativa
      // =====================================================================
      const dpoteCfgEmp = dpoteConfigMap[emp.slug];
      const usaRecorrenciaManual = dpoteCfgEmp?.recorrenciaFonte === "manual" && dpoteCfgEmp?.recorrenciaValorManual != null;

      // Helper: soma apenas cat1..cat8 (faturamento operacional)
      const sumCatsSemCat9 = (r: any) =>
        [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8]
          .reduce((acc: number, v: any) => acc + parseFloat(v || "0"), 0);
      // Helper: soma cat1..cat9 (faturamento completo incluindo recorrência)
      const sumCats = (r: any) => sumCatsSemCat9(r) + parseFloat(r.cat9 || "0");

      // Cat9 acumulado de TODOS os dias do mês (Dpote REAL distribuído)
      // O Dpote distribuído pelo sync é sempre valor real (não previsão), portanto
      // deve ser contabilizado integralmente, independente de ser dia passado ou futuro.
      const cat9Realizados = rows.reduce((acc: number, r: any) => acc + parseFloat(r.cat9 || "0"), 0);
      // Cat9 total do mês (todos os dias lançados)
      const cat9Total = rows.reduce((acc: number, r: any) => acc + parseFloat(r.cat9 || "0"), 0);

      // Cat9 do mês anterior = base de PREVISÃO informativa (não entra no faturamento)
      const rowsAnterioresEmp = faturamentosAnteriorData.filter((f: any) => f.empresaSlug === emp.slug);
      const cat9MesAnterior = rowsAnterioresEmp.reduce((acc: number, r: any) => acc + parseFloat(r.cat9 || "0"), 0);
      // Valor diário previsto de recorrência = cat9 do mês anterior ÷ dias do mês anterior
      const diasMesAnterior = rowsAnterioresEmp.length || new Date(ano, mes - 1, 0).getDate();
      const cat9DiarioPrevisto = ehMesVigente && cat9MesAnterior > 0
        ? cat9MesAnterior / diasMesAnterior
        : 0;
      // Previsão de recorrência para os dias que ainda não têm Dpote distribuído:
      //   = cat9 do mês anterior × (dias sem Dpote / total de dias do mês)
      //   APENAS INFORMATIVA — não entra no faturamento
      const totalDiasMesCalc = new Date(ano, mes, 0).getDate();;
      const diasComDpote = rows.filter((r: any) => parseFloat(r.cat9 || "0") > 0).length;
      const diasSemDpote = Math.max(0, totalDiasMesCalc - diasComDpote);
      const recorrenciaPrevisaoDiasRestantes = ehMesVigente && cat9MesAnterior > 0
        ? cat9MesAnterior * (diasSemDpote / totalDiasMesCalc)
        : 0;

      // Recorrência que ENTRA no faturamento:
      //   - Mês passado: cat9 total do mês (já totalmente apurado)
      //   - Mês vigente: cat9 TOTAL distribuído (todos os dias com Dpote real)
      //   - Mês futuro: 0 (não entra)
      // Quando fonte=manual no mês vigente, usa o valor manual confirmado
      // NOTA: cat9Realizados agora soma TODOS os dias do mês (não apenas até diaHoje),
      // pois o Dpote distribuído pelo sync é sempre valor real, nunca previsão.
      const recorrenciaNoFaturamento = ehMesFuturo
        ? 0
        : (ehMesVigente && usaRecorrenciaManual)
          ? (dpoteCfgEmp!.recorrenciaValorManual as number)
          : ehMesVigente
            ? cat9Realizados   // mês vigente: Dpote TOTAL distribuído no mês
            : cat9Total;       // mês passado: cat9 total do mês

      // Recorrência INFORMATIVA (previsão) — exibida no card mas NÃO entra no faturamento:
      //   - Mês vigente: previsão dos dias restantes (cat9 anterior proporcional)
      //   - Mês futuro: cat9 total do mês anterior
      const recorrenciaPrevisao = ehMesFuturo
        ? cat9MesAnterior
        : ehMesVigente
          ? recorrenciaPrevisaoDiasRestantes
          : 0;

      // Valores informativos para exibição no card:
      //   recorrenciaRealizada: Dpote TOTAL distribuído no mês (todos os dias com cat9 real)
      //   recorrenciaPrevisaoRestante: estimativa dos dias que ainda não têm Dpote (só informativo)
      const recorrenciaRealizada = ehMesVigente ? cat9Realizados : (ehMesFuturo ? 0 : cat9Total);
      const recorrenciaPrevisaoRestante = ehMesVigente ? recorrenciaPrevisaoDiasRestantes : (ehMesFuturo ? cat9MesAnterior : 0);

      // recorrenciaMes: valor exibido no card (o que já entrou no faturamento)
      const recorrenciaMes = recorrenciaNoFaturamento;

      // Faturamento total = cat1..cat8 + recorrência REAL que entra no faturamento (sem previsão)
      const totalSemRec = rows.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0);
      const total = totalSemRec + recorrenciaNoFaturamento;

      // Faturamento realizado = cat1..cat8 dos dias ≤ hoje + recorrência REAL (sem previsão)
      const totalRealizadoSemRec = rowsRealizados.reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0);
      const totalRealizado = totalRealizadoSemRec + recorrenciaNoFaturamento;

      // Faturamento previsto = cat1..cat8 dos dias > hoje (sem recorrência)
      const totalPrevisto = rows
        .filter((r: any) => parseInt(r.data.split("-")[2]) > diaHoje)
        .reduce((s: number, r: any) => s + sumCatsSemCat9(r), 0);

      // diasLancados: quantidade total de lançamentos (pode ter múltiplos por dia)
      // diasRealizados: quantidade de DIAS ÚNICOS com faturamento operacional REAL (cat1..cat8 > 0)
      // IMPORTANTE: dias com apenas cat9 (recorrência pré-lançada) NÃO contam como realizados
      // para não distorcer a média diária e o cálculo de dias restantes para projeção
      const diasLancados = rows.length;
      const rowsComFatReal = rowsRealizados.filter((r: any) => sumCatsSemCat9(r) > 0);
      const diasRealizadosSet = new Set(rowsComFatReal.map((r: any) => r.data.split("-")[2]));
      const diasRealizados = diasRealizadosSet.size;
      const diasPrevistos = rowsPrevistos.length;

      // Média diária = total do dia (cat1..cat9) dos dias com faturamento real / dias realizados
      // Usa apenas dias com faturamento operacional para refletir o ritmo real
      const totaisDiariosRealizados = rowsComFatReal.map((r: any) => sumCats(r));
      const totalRealizadoComCat9 = totaisDiariosRealizados.reduce((s: number, v: number) => s + v, 0);
      const mediaDiaria = diasRealizados > 0 ? totalRealizadoComCat9 / diasRealizados : 0;

      // Máximo e mínimo diário (cat1..cat9 por dia — total completo)
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

      // Quinzenal: soma cat1..cat9 exclusivamente dos dias 1-15.
      // O Dpote já está distribuído diariamente e, portanto, entra apenas pela parcela
      // registrada nos quinze dias do período.
      const rowsQuinzenal = (faturamentosData as any[])
        .filter((r: any) => r.empresaSlug === emp.slug && parseInt(r.data.split("-")[2]) <= 15);
      const diasLancadosQuinzenal = rowsQuinzenal.length;
      const rowsMesEmpresa = (faturamentosData as any[]).filter(
        (r: any) => r.empresaSlug === emp.slug
      );
      const totalQuinzenalCalculado = calcularTotalQuinzenal(rowsMesEmpresa);

      // Se existe snapshot congelado para esta empresa/mês/ano, usar o valor definitivo
      // O snapshot é gerado automaticamente no dia 15 às 23h BRT e garante o valor correto para bonificações
      // REGRA: só usar o snapshot após o dia 15 ter encerrado completamente.
      // Durante o dia 15 (diaHoje === 15 no mês vigente), o valor ainda está sendo atualizado
      // e deve continuar usando o cálculo em tempo real (totalQuinzenalCalculado).
      // O snapshot só deve ser usado a partir do dia 16 em diante (ou em meses passados).
      const quinzenaDefinitiva = ehMesVigente ? diaHoje > 15 : !ehMesFuturo;
      const snapshotEmpresa = quinzenaDefinitiva
        ? (snapshotsQuinzenais as any[]).find(
            (s: any) => s.empresaSlug === emp.slug && s.mes === mes && s.ano === ano
          )
        : undefined;
      const totalQuinzenal = snapshotEmpresa
        ? parseFloat(snapshotEmpresa.totalRealizado)
        : totalQuinzenalCalculado;

      // Dias restantes seguem o calendário real de funcionamento de cada unidade.
      // Conta somente os dias posteriores a hoje; o faturamento do dia atual já está
      // contemplado no total realizado e não deve ser contado novamente na projeção.
      // Seraphine fecha aos domingos e às segundas; as demais unidades fecham aos domingos.
      const diaInicialRestante = obterDiaInicialDiasRestantes({
        ehMesFuturo,
        ehMesVigente,
        diaHoje,
        totalDiasMes,
      });
      const fechamentosEmpresa = (fechamentosData as any[]).filter(
        (fechamento: any) => fechamento.empresaSlug === emp.slug
      );
      const datasFechamentoExcepcional = fechamentosEmpresa.map((fechamento: any) => fechamento.data);
      const diasUteisRestantes = contarDiasFuncionamentoNoIntervalo({
        empresaSlug: emp.slug,
        ano,
        mes,
        diaInicial: diaInicialRestante,
        diaFinal: totalDiasMes,
        datasFechamentoExcepcional,
      });
      const diasUteisRestantesQuinzenal = contarDiasFuncionamentoNoIntervalo({
        empresaSlug: emp.slug,
        ano,
        mes,
        diaInicial: ehMesFuturo ? 1 : ehMesVigente && diaHoje < 15 ? diaHoje + 1 : 16,
        diaFinal: 15,
        datasFechamentoExcepcional,
      });

      // Meta/dia dinâmica e projeção usam os mesmos dias de funcionamento restantes.
      const indicadoresDiasRestantes = calcularIndicadoresDiasRestantes({
        totalRealizado,
        metaMensal,
        mediaDiaria,
        diasRestantes: diasUteisRestantes,
      });
      const faltaMensal = indicadoresDiasRestantes.faltaMensal;
      const metaDiariaDinamicaMensal = indicadoresDiasRestantes.metaDiariaNecessaria;
      const viabilidadeMetaDiaria = classificarViabilidadeNecessidadeDiaria({
        necessidadeDiaria: metaDiariaDinamicaMensal,
        mediaDiaria,
      });

      const faltaQuinzenal = Math.max(0, metaQuinzenal - totalQuinzenal);
      const metaDiariaDinamicaQuinzenal = diasUteisRestantesQuinzenal > 0 ? faltaQuinzenal / diasUteisRestantesQuinzenal : 0;

      // Faturamento do dia atual (para o semáforo) — total completo (cat1..cat9)
      const dataHojeStr = `${ano}-${String(mes).padStart(2, '0')}-${String(diaHoje).padStart(2, '0')}`;
      const rowHoje = rows.find((r: any) => r.data === dataHojeStr);
      const fatHoje = rowHoje ? sumCats(rowHoje) : 0;
      // Meta diária proporcional: metaMensal / diasUteis
      const metaDiariaHoje = metaDiariaMensal;
      // Semáforo: verde ≥ 100%, amarelo 70–99%, vermelho < 70%
      const pctMetaDiaria = metaDiariaHoje > 0 ? (fatHoje / metaDiariaHoje) * 100 : null;
      const semaforo: 'verde' | 'amarelo' | 'vermelho' | null =
        !ehMesVigente || metaDiariaHoje === 0 ? null
        : pctMetaDiaria! >= 100 ? 'verde'
        : pctMetaDiaria! >= 70 ? 'amarelo'
        : 'vermelho';

      // Projeção final:
      // Fórmula: totalRealizado + (médiaDiária × diasRestantes)
      // Onde:
      //   - totalRealizado = faturamento já realizado até hoje (cat1..cat8 + recorrência real)
      //   - médiaDiária = faturamento dos dias com dados reais ÷ quantidade de dias com dados
      //   - diasRestantes = dias de funcionamento posteriores ao dia atual
      // Isso representa: "o que já faturou + quanto vai faturar nos dias restantes mantendo o ritmo"
      // IMPORTANTE: usa APENAS dias com dados reais (cat1..cat9 > 0) para não diluir a média
      
      // Projeção = realizado + (média diária dos dias apurados × dias de funcionamento restantes)
      const projecaoFinal = diasRealizados > 0
        ? indicadoresDiasRestantes.projecaoFinal
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
        viabilidadeMetaDiaria,
        metaDiariaDinamicaQuinzenal,
        diasUteis,
        diasUteisQuinzenal,
        diasUteisDecorridos,
        diasUteisRestantes,
        fechamentosEmpresa,
        diasUteisRestantesQuinzenal,
        metaEsperadaAteHoje,
        metaEsperadaQuinzenalAteHoje,
        projecaoFinal,
        // Progresso real vs meta esperada até hoje (baseado em realizados)
        progressoMensal: metaEsperadaAteHoje > 0 ? Math.min((totalRealizado / metaEsperadaAteHoje) * 100, 150) : (metaMensal > 0 ? Math.min((totalRealizado / metaMensal) * 100, 100) : 0),
        progressoQuinzenal: metaEsperadaQuinzenalAteHoje > 0 ? Math.min((totalQuinzenal / metaEsperadaQuinzenalAteHoje) * 100, 150) : (metaQuinzenal > 0 ? Math.min((totalQuinzenal / metaQuinzenal) * 100, 100) : 0),
        fatHoje,
        metaDiariaHoje,
        pctMetaDiaria,
        semaforo,
        catTotals,
        recorrenciaMes,
        recorrenciaPrevisao,
        recorrenciaRealizada,
        recorrenciaPrevisaoRestante,
        cat9DiarioPrevisto,
        cat9MesAnterior,
        ehMesFuturo,
        rows,
        rowsRealizados,
        rowsPrevistos,
      };
    });
  }, [empresasVisiveis, faturamentosData, faturamentosFiltrados, faturamentosAnteriorData, metasData, fechamentosData, dpoteConfigMap, mes, ano, snapshotsQuinzenais]);

  const totalGeral = statsPorEmpresa.reduce((s, e) => s + e.total, 0);
  const totalGeralRealizado = statsPorEmpresa.reduce((s, e) => s + e.totalRealizado, 0);
  const totalGeralPrevisto = statsPorEmpresa.reduce((s, e) => s + e.totalPrevisto, 0);
  const metaTotalGeral = statsPorEmpresa.reduce((s, e) => s + e.metaMensal, 0);
  const metaQuinzenalTotal = statsPorEmpresa.reduce((s, e) => s + e.metaQuinzenal, 0);
  const superMetaTotalGeral = statsPorEmpresa.reduce((s, e) => s + e.superMeta, 0);

  // Comparativo com mês anterior: usar apenas os mesmos dias já realizados no mês atual
  const comparativoMesAnterior = useMemo(() => {
    // No mês vigente, considera apenas dias ≤ hoje (ignora lançamentos futuros pré-lançados)
    const hojeComp = new Date();
    const mesHojeComp = hojeComp.getMonth() + 1;
    const anoHojeComp = hojeComp.getFullYear();
    const ehMesVigenteComp = mes === mesHojeComp && ano === anoHojeComp;
    const diaLimiteComp = ehMesVigenteComp ? hojeComp.getDate() : new Date(ano, mes, 0).getDate();

    // Dias já realizados no mês atual (por empresa e global) — excluindo dias futuros no mês vigente
    const diasAtualPorEmpresa: Record<string, Set<number>> = {};
    const diasAtualGlobal = new Set<number>();
    faturamentosFiltrados.forEach((f: any) => {
      const dia = parseInt(f.data.split("-")[2]);
      // No mês vigente, ignora dias futuros para o comparativo
      if (ehMesVigenteComp && dia > diaLimiteComp) return;
      if (!diasAtualPorEmpresa[f.empresaSlug]) diasAtualPorEmpresa[f.empresaSlug] = new Set();
      diasAtualPorEmpresa[f.empresaSlug].add(dia);
      diasAtualGlobal.add(dia);
    });

    // Período exato: dia mínimo e máximo realizados no mês atual
    const diasOrdenados = Array.from(diasAtualGlobal).sort((a, b) => a - b);
    const diaInicio = diasOrdenados.length > 0 ? diasOrdenados[0] : 1;
    const diaFim = diasOrdenados.length > 0 ? diasOrdenados[diasOrdenados.length - 1] : 0;
    const periodoLabel = diaFim > 0 ? `dias ${diaInicio}–${diaFim}` : "sem lançamentos";

    // Total realizado no mês atual (apenas dias realizados) por empresa
    let totalAtualRealizado = 0;
    let totalAnteriorMesmosDias = 0;
    const porEmpresa: Record<string, { totalAtual: number; totalAnterior: number; diasAtual: number; diasAnterior: number }> = {};
    empresasVisiveis.forEach((emp) => {
      const diasAtual = diasAtualPorEmpresa[emp.slug] ?? new Set<number>();
      // Total atual: apenas dias realizados (sem futuros)
      const rowsAtual = faturamentosFiltrados.filter((f: any) => {
        if (f.empresaSlug !== emp.slug) return false;
        const dia = parseInt(f.data.split("-")[2]);
        return !ehMesVigenteComp || dia <= diaLimiteComp;
      });
      const totalAtual = rowsAtual.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      totalAtualRealizado += totalAtual;
      // Usa o período global (dias 1 até diaFim) para comparar com o mês anterior.
      // Isso garante que empresas com dias diferentes (ex: Seraphine não abre dom/seg)
      // sejam comparadas com todos os dias do mesmo período no mês anterior.
      const rowsAnterior = faturamentosAnteriorFiltrados.filter((f: any) => {
        if (f.empresaSlug !== emp.slug) return false;
        const dia = parseInt(f.data.split("-")[2]);
        return dia >= diaInicio && dia <= diaFim;
      });
      const totalAnterior = rowsAnterior.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
      totalAnteriorMesmosDias += totalAnterior;
      porEmpresa[emp.slug] = { totalAtual, totalAnterior, diasAtual: diasAtual.size, diasAnterior: rowsAnterior.length };
    });
    // Variação usa totalAtualRealizado (sem futuros) vs mês anterior nos mesmos dias
    const variacaoTotal = totalAtualRealizado > 0 && totalAnteriorMesmosDias > 0
      ? ((totalAtualRealizado - totalAnteriorMesmosDias) / totalAnteriorMesmosDias) * 100
      : null;
    return { totalAnteriorMesmosDias, totalAtualRealizado, variacaoTotal, porEmpresa, periodoLabel, diaInicio, diaFim };
  }, [faturamentosFiltrados, faturamentosAnteriorFiltrados, empresasVisiveis, mes, ano]);


  // Comparativo com o melhor mês do ano (excluindo mês atual)
  const comparativoMelhorMes = useMemo(() => {
    if (!historicoAnualData?.faturamentos || empresasVisiveis.length === 0) {
      return null;
    }
    const { diaInicio, diaFim } = comparativoMesAnterior;
    if (diaFim === 0) return null;

    // Para cada empresa, calcular o total de cada mês do ano (excluindo mês atual) nos mesmos dias apurados
    // e encontrar o melhor mês INDIVIDUALMENTE para cada unidade
    const porEmpresaComp: Record<string, { mesNome: string; mesNumero: number; totalAtual: number; totalMelhor: number; variacao: number | null }> = {};

    empresasVisiveis.forEach((emp) => {
      const mesesEmpresa: { mes: number; total: number }[] = [];
      for (let m = 1; m <= 12; m++) {
        if (m === mes) continue; // excluir mês atual
        const fatsMes = historicoAnualData.faturamentos.filter((f: any) => {
          const [fAno, fMes, fDia] = f.data.split("-").map(Number);
          return fMes === m && fAno === ano && fDia >= diaInicio && fDia <= diaFim && f.empresaSlug === emp.slug;
        });
        if (fatsMes.length === 0) continue;
        const totalEmp = fatsMes.reduce((s: number, r: any) =>
          s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5, r.cat6, r.cat7, r.cat8, r.cat9].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);
        mesesEmpresa.push({ mes: m, total: totalEmp });
      }
      if (mesesEmpresa.length === 0) {
        porEmpresaComp[emp.slug] = { mesNome: "—", mesNumero: 0, totalAtual: 0, totalMelhor: 0, variacao: null };
        return;
      }
      const melhorEmpresa = mesesEmpresa.reduce((best, curr) => curr.total > best.total ? curr : best, mesesEmpresa[0]);
      const compAtual = comparativoMesAnterior.porEmpresa[emp.slug];
      const totalAtual = compAtual?.totalAtual ?? 0;
      const variacao = melhorEmpresa.total > 0 ? ((totalAtual - melhorEmpresa.total) / melhorEmpresa.total) * 100 : null;
      porEmpresaComp[emp.slug] = {
        mesNome: MESES[melhorEmpresa.mes - 1],
        mesNumero: melhorEmpresa.mes,
        totalAtual,
        totalMelhor: melhorEmpresa.total,
        variacao,
      };
    });

    // Verificar se há pelo menos uma empresa com dados
    const temDados = Object.values(porEmpresaComp).some(v => v.totalMelhor > 0);
    if (!temDados) return null;

    return {
      porEmpresa: porEmpresaComp,
      periodoLabel: comparativoMesAnterior.periodoLabel,
    };
  }, [historicoAnualData, empresasVisiveis, mes, ano, comparativoMesAnterior]);

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
          ? ["Serviços", "Pacotes", "Produtos", "Caixinha", "Recorrência", "", "", "", ""]
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

  // Dados para gráfico de barras diário (faturamento por dia — realizados vs previstos)
  const barDataDiario = useMemo(() => {
    const hoje = new Date();
    const diaHojeGlobal = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear()
      ? hoje.getDate()
      : new Date(ano, mes, 0).getDate();

    // Todos os dias do mês
    const totalDiasMes = new Date(ano, mes, 0).getDate();
    const dias = Array.from({ length: totalDiasMes }, (_, i) => i + 1);

    // Somar faturamento total (todas as empresas visíveis) por dia
    const mapaAtual: Record<number, number> = {};
    faturamentosFiltrados.forEach((f: any) => {
      if (!empresasVisiveis.find((e) => e.slug === f.empresaSlug)) return;
      const dia = parseInt(f.data.split("-")[2]);
      const total = [f.cat1, f.cat2, f.cat3, f.cat4, f.cat5, f.cat6, f.cat7, f.cat8, f.cat9]
        .reduce((s: number, v: any) => s + parseFloat(v || "0"), 0);
      mapaAtual[dia] = (mapaAtual[dia] ?? 0) + total;
    });

    // Previsão: cat1..cat8 dos dias futuros já lançados (sem cat9 — cat9 futuro é 0 no banco)
    // + cat9 previsto baseado no mês anterior (calculado no frontend)
    const totalCat9MesAnterior = faturamentosAnteriorFiltrados
      .filter((f: any) => empresasVisiveis.find((e) => e.slug === f.empresaSlug))
      .reduce((s: number, f: any) => s + parseFloat(f.cat9 || "0"), 0);
    const cat9DiariopPrevisto = totalCat9MesAnterior > 0
      ? Math.round((totalCat9MesAnterior / totalDiasMes) * 100) / 100
      : 0;

    return dias.map((dia) => {
      const isPrevisto = dia > diaHojeGlobal;
      const valorBanco = mapaAtual[dia] ?? 0;
      // Para dias futuros: adicionar cat9 previsto ao valor do banco (que tem cat9=0)
      const valor = isPrevisto ? valorBanco + cat9DiariopPrevisto : valorBanco;
      return {
        dia,
        diaLabel: `${dia}`,
        isPrevisto,
        realizado: !isPrevisto ? valor : 0,
        previsto: isPrevisto ? valor : 0,
      };
    }).filter((d) => d.realizado > 0 || d.previsto > 0);
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
      : ["Serviços", "Pacotes", "Produtos", "Caixinha", "Recorrência"];
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
      // Usar apenas dados realizados (dias já passados) para evitar inflação por previstos
      const progressoReal = s.metaMensal > 0 ? s.totalRealizado / s.metaMensal : 0;
      const diasRealizados = s.diasRealizados;
      // Esperado: proporção de dias realizados em relação ao total de dias úteis
      const esperado = diasRealizados > 0 ? (diasRealizados / s.diasUteis) : 0;
      if (progressoReal < esperado * 0.85 && diasRealizados > 0) {
        // Abaixo do ritmo esperado: alerta de atenção
        const faltaDia = s.metaDiariaMensal - s.mediaDiaria;
        list.push({
          tipo: "warning",
          msg: `${s.emp.nome}: média diária ${fmt(s.mediaDiaria)} — precisa de +${fmt(faltaDia)}/dia para atingir a meta.`,
        });
      } else if (s.totalRealizado >= s.metaMensal) {
        // Meta já atingida com valores realizados
        list.push({ tipo: "success", msg: `${s.emp.nome}: Meta mensal atingida!` });
      } else if (s.projecaoFinal >= s.metaMensal && diasRealizados > 0) {
        // No ritmo: projeção indica que vai atingir a meta
        list.push({ tipo: "info", msg: `${s.emp.nome}: No caminho certo. Média ${fmt(s.mediaDiaria)}/dia — projeção ${fmt(s.projecaoFinal)}.` });
      } else if (diasRealizados > 0) {
        // Projeção abaixo da meta mas ainda no ritmo aceitável
        const faltaDia = s.metaDiariaDinamicaMensal;
        list.push({ tipo: "warning", msg: `${s.emp.nome}: projeção ${fmt(s.projecaoFinal)} — precisa de ${fmt(faltaDia)}/dia nos ${s.diasUteisRestantes} dias restantes.` });
      }
      // Quinzenal (usa s.totalQuinzenal que já inclui recorrência total)
      if (s.metaQuinzenal > 0 && mes === hoje.getMonth() + 1 && hoje.getDate() <= 15) {
        if (s.totalQuinzenal < s.metaQuinzenal * 0.8 && s.diasUteisRestantesQuinzenal === 0) {
          list.push({ tipo: "warning", msg: `${s.emp.nome}: Meta quinzenal não atingida (${fmt(s.totalQuinzenal)} de ${fmt(s.metaQuinzenal)}).` });
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

  const handleLogout = () => {
    trpc.auth.logoutApp.useMutation;
    window.location.href = "/api/oauth/logout";
  };

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900 flex">
      {/* Sidebar lateral */}
      {isAuthenticated && (
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsVisiveis={tabsVisiveis}
          isAdmin={isAdmin}
          isGerente={isGerente}
          isRecepcionista={isRecepcionista}
          userName={user?.name ?? user?.email ?? undefined}
          userRole={(user as any)?.perfil ?? user?.role}
          onLogout={() => { window.location.href = "/api/oauth/logout"; }}
          onSyncCB={() => { setSyncingCashbarber(true); sincronizarTodasMutation.mutate({ mes, ano }); }}
          onSyncDpote={() => { setSyncingDpote(true); sincronizarDpoteMutation.mutate(); }}
          onSyncAvec={() => {
            const seraphineEmp = empresasData.find((e) => e.tipoCategorias === "seraphine");
            if (seraphineEmp) {
              setSyncingAvec(true);
              sincronizarAvecMutation.mutate({ empresaSlug: seraphineEmp.slug, mes, ano });
            }
          }}
          syncingCB={syncingCashbarber}
          syncingDpote={syncingDpote}
          syncingAvec={syncingAvec}
          avecJobRodando={avecJobRodando}
          hasAvec={empresasData.some((e) => e.tipoCategorias === "seraphine")}
          onTestarMetaDiaria={() => testarMetaDiariaMutation.mutate()}
          testingMetaDiaria={testarMetaDiariaMutation.isPending}
          onRecalcularRanking={() => recalcularRankingMutation.mutate()}
          recalculandoRanking={recalcularRankingMutation.isPending}
        />
      )}
      {/* Conteúdo principal */}
      <div className="flex-1 min-w-0 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-[0_1px_2px_rgba(15,23,42,0.025)] backdrop-blur-xl">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between pl-10 md:h-[72px] md:pl-0">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[11px] bg-[#12233f] shadow-[0_6px_16px_rgba(18,35,63,0.16)] flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-300" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-blue-600 leading-tight hidden sm:block">Meta Dashboard</p>
                <h1 className="text-sm sm:text-base font-semibold tracking-[-0.025em] text-[#12233f] leading-tight">{TAB_TITLES[activeTab].title}</h1>
                <p className="text-[11px] text-slate-400 leading-tight hidden lg:block">
                  {TAB_TITLES[activeTab].subtitle}
                </p>
              </div>
            </div>

            {/* Ações desktop */}
            <div className="hidden md:flex items-center gap-2">
              <select
                value={mes}
                onChange={(e) => { setMes(Number(e.target.value)); setSemanaIdx(0); }}
                className="h-9 text-sm border border-slate-200 rounded-[10px] px-3 bg-white text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m} {ano}</option>
                ))}
              </select>
              {/* Filtro de período: Mensal / Semanal */}
              {activeTab === "dashboard" && (
                <div className="flex items-center rounded-[10px] border border-slate-200 bg-slate-50 p-0.5 text-sm">
                  <button
                    onClick={() => setPeriodoFiltro("mensal")}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      periodoFiltro === "mensal"
                        ? "bg-white text-[#12233f] font-semibold shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    Mensal
                  </button>
                  <button
                    onClick={() => setPeriodoFiltro("semanal")}
                    className={`rounded-lg px-3 py-1.5 transition-colors ${
                      periodoFiltro === "semanal"
                        ? "bg-white text-[#12233f] font-semibold shadow-sm"
                        : "text-slate-500 hover:text-slate-800"
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
                <a
                  href="/profissionais"
                  className="flex items-center gap-1.5 text-sm text-yellow-600 hover:text-yellow-700 px-3 py-1.5 rounded-xl hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors font-medium"
                  title="Gerenciar Profissionais e Ranking"
                >
                  <Users className="w-4 h-4" /> Profissionais
                </a>
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
              {isGerente && empresasData.some((e) => e.tipoCategorias === "seraphine") && (
                <button
                  onClick={() => setAvecSyncModalOpen(true)}
                  disabled={syncingAvec || avecJobRodando}
                  title={avecJobRodando ? "Sync Avec em andamento (job automático)" : "Sincronizar faturamento da Seraphine via Avec agora"}
                  className="flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-700 px-3 py-1.5 rounded-xl hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(syncingAvec || avecJobRodando)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {syncingAvec ? "Sincronizando..." : avecJobRodando ? "Sync em andamento..." : "Sync Avec"}
                </button>
              )}

              {podeLancarFaturamento && (
                <Button onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm" size="sm">
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              )}
              {/* Indicador de conexão WebSocket */}
              <UITooltip>
                <UITooltipTrigger asChild>
                  <div className={`w-3 h-3 rounded-full ${
                    wsConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                  }`} />
                </UITooltipTrigger>
                <UITooltipContent>
                  {wsConnected ? `Conectado (${totalConnected} usuário(s) online)` : 'Desconectado'}
                </UITooltipContent>
              </UITooltip>

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
                  <div className="flex items-center gap-2 ml-1 pl-3 border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-[#12233f] leading-none">{user.name ?? user.email}</span>
                    <span className="text-[10px] text-slate-400 leading-none mt-1 capitalize">{(user as any).perfil ?? user.role}</span>
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
            <div className="md:hidden border-t border-slate-200 py-3 space-y-1 bg-white">
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
                <a
                  href="/profissionais"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-colors font-medium"
                >
                  <Users className="w-4 h-4" /> Profissionais
                </a>
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
              {isGerente && empresasData.some((e) => e.tipoCategorias === "seraphine") && (
                <button
                  onClick={() => {
                    setSyncingAvec(true);
                    const seraphineEmp = empresasData.find((e) => e.tipoCategorias === "seraphine");
                    if (seraphineEmp) {
                      sincronizarAvecMutation.mutate({ empresaSlug: seraphineEmp.slug, mes, ano });
                    }
                    setMobileMenuOpen(false);
                  }}
                  disabled={syncingAvec || avecJobRodando}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors font-medium disabled:opacity-50"
                >
                  {(syncingAvec || avecJobRodando)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <RefreshCw className="w-4 h-4" />}
                  {syncingAvec ? "Sincronizando Avec..." : avecJobRodando ? "Sync Avec em andamento..." : "Sincronizar Avec"}
                </button>
              )}
            </div>
          )}
        </div>
      </header>



      <main className="mx-auto w-full max-w-[1600px] flex-1 overflow-x-hidden px-3 py-4 pb-20 sm:px-6 sm:py-6 md:pb-8 lg:px-8">
        {loading && activeTab === "dashboard" && (
          <DashboardSkeleton />
        )}
        <TabPanel tabKey={activeTab}>
        {/* ─── DASHBOARD ─────────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && !loading && (
          <div className="space-y-6">
            {/* Banner de acesso rápido para recepcionista */}
            {isRecepcionista && (
              <Card className="p-4 sm:p-6 border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold">Olá, {user?.name ?? "Recepcionista"}!</h2>
                    <p className="text-sm text-blue-100 mt-1">Registre o faturamento do dia.</p>
                  </div>
                  <Button
                    onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                    className="gap-2 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-semibold shadow-md w-full sm:w-auto"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" /> Lançar Faturamento
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

            {/* ===== KPIs EXECUTIVOS — NOVA HIERARQUIA VISUAL ===== */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
              {/* KPI 1: Faturamento Total — card hero principal */}
              <div className="col-span-2 xl:col-span-2 relative overflow-hidden rounded-2xl p-4 sm:p-6"
                style={{ background: 'linear-gradient(135deg, #3730a3 0%, #4c1d95 100%)' }}>
                {/* Glow decorativo */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
                  style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label text-white/60 tracking-widest text-[11px]">FATURAMENTO {periodoFiltro === "semanal" && semanaAtual ? semanaAtual.label.toUpperCase() : "DO MÊS"}</span>
                    {comparativoMesAnterior.variacaoTotal !== null && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        comparativoMesAnterior.variacaoTotal >= 0
                          ? 'bg-emerald-400/20 text-emerald-300'
                          : 'bg-red-400/20 text-red-300'
                      }`}>
                        {comparativoMesAnterior.variacaoTotal >= 0 ? '↑' : '↓'}
                        {Math.abs(comparativoMesAnterior.variacaoTotal).toFixed(1)}% vs {MESES[mesAnterior - 1]}
                      </span>
                    )}
                  </div>
                  <p className="font-display text-3xl sm:text-4xl lg:text-5xl text-white leading-none tracking-tight">
                    {fmt(totalGeralRealizado)}
                  </p>
                  <p className="text-white/50 text-sm mt-1">
                    {totalGeralPrevisto > 0
                      ? <span className="text-amber-300/80">+ {fmt(totalGeralPrevisto)} previsto → {fmt(totalGeral)}</span>
                      : `${faturamentosFiltrados.length} dias lançados`
                    }
                  </p>
                  {/* Mini barras por unidade */}
                  {statsPorEmpresa.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      {statsPorEmpresa.map((e: any) => (
                        <div key={e.emp?.slug ?? e.nome} className="flex items-center gap-2">
                          <span className="text-white/60 text-xs w-20 truncate">{e.emp?.nome ?? e.nome}</span>
                          <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-white/40"
                              style={{ width: `${totalGeralRealizado > 0 ? Math.min((e.totalRealizado / totalGeralRealizado) * 100, 100) : 0}%` }} />
                          </div>
                          <span className="text-white/70 text-xs font-medium">{fmt(e.totalRealizado)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* KPI 2: Progresso da Meta */}
              {metaTotalGeral > 0 && (() => {
                const pctMeta = pct(totalGeralRealizado, metaTotalGeral);
                const atingiu = totalGeralRealizado >= metaTotalGeral;
                const projecaoTotal = statsPorEmpresa.reduce((s, e) => s + e.projecaoFinal, 0);
                const projecaoAtinge = projecaoTotal >= metaTotalGeral;
                return (
                  <div className="rounded-2xl p-3 sm:p-5 bg-card border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-label text-muted-foreground tracking-widest text-[10px] sm:text-[11px]">META DO MÊS</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        atingiu ? 'bg-emerald-500/15 text-emerald-400'
                        : pctMeta >= 80 ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                      }`}>{pctMeta}%</span>
                    </div>
                    <p className="font-display text-xl sm:text-3xl text-foreground leading-none">{fmt(metaTotalGeral)}</p>
                    <p className="text-muted-foreground text-xs mt-1">meta mensal total</p>
                    {/* Barra de progresso premium */}
                    <div className="mt-4">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(pctMeta, 100)}%`,
                            background: atingiu ? '#10b981' : pctMeta >= 80 ? '#f59e0b' : '#6366f1'
                          }} />
                      </div>
                      {projecaoTotal > 0 && (
                        <p className={`text-xs mt-2 font-medium ${
                          projecaoAtinge ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          Projeção: {fmt(projecaoTotal)} {projecaoAtinge ? '✓' : `(−${fmt(metaTotalGeral - projecaoTotal)})`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* KPI 3: Falta para Meta / Atingida */}
              <div className="rounded-2xl p-3 sm:p-5 bg-card border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-label text-muted-foreground tracking-widest text-[10px] sm:text-[11px]">
                    {totalGeralRealizado >= metaTotalGeral && metaTotalGeral > 0 ? 'META' : 'FALTA PARA META'}
                  </span>
                  {totalGeralRealizado >= metaTotalGeral && metaTotalGeral > 0
                    ? <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">✓ Atingida</span>
                    : null
                  }
                </div>
                {metaTotalGeral > 0 ? (
                  totalGeralRealizado >= metaTotalGeral ? (
                    <>
                      <p className="font-display text-xl sm:text-3xl text-emerald-400 leading-none">Meta!</p>
                      <p className="text-emerald-400/70 text-xs mt-1">parabéns pela conquista</p>
                      <div className="mt-2">
                        <MensalCelebrationCompact
                          atingiu={true}
                          percentual={metaTotalGeral > 0 ? (totalGeralRealizado / metaTotalGeral) * 100 : 100}
                          superou={Math.max(0, totalGeralRealizado - metaTotalGeral)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-xl sm:text-3xl text-foreground leading-none">{fmt(metaTotalGeral - totalGeralRealizado)}</p>
                      <p className="text-muted-foreground text-xs mt-1">restante para atingir</p>
                      {metaQuinzenalTotal > 0 && (() => {
                        const totalQuinzenalGeral = statsPorEmpresa.reduce((s, e) => s + e.totalQuinzenal, 0);
                        const atingiuQ = totalQuinzenalGeral >= metaQuinzenalTotal;
                        const superouQ = totalQuinzenalGeral > metaQuinzenalTotal ? totalQuinzenalGeral - metaQuinzenalTotal : 0;
                        const faltaQ = Math.max(0, metaQuinzenalTotal - totalQuinzenalGeral);
                        const pctQ = metaQuinzenalTotal > 0 ? Math.round((totalQuinzenalGeral / metaQuinzenalTotal) * 100) : 0;
                        // Dias de calendário restantes até o dia 15 (inclusive o dia de hoje)
                        const diaAtual = hoje.getDate();
                        const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
                        const ehMesFuturoQ = ano > hoje.getFullYear() || (ano === hoje.getFullYear() && mes > hoje.getMonth() + 1);
                        const diasRestQ = ehMesFuturoQ ? 15 : (ehMesAtual && diaAtual <= 15) ? Math.max(0, 15 - diaAtual + 1) : 0;
                        const metaDiariaQ = diasRestQ > 0 ? faltaQ / diasRestQ : 0;
                        // Quinzena encerrada: após dia 15 do mês vigente, ou em meses passados
                        const quinzenaEncerradaGeral = !ehMesFuturoQ && (ehMesAtual ? diaAtual > 15 : true);
                        // Resultado por unidade para o resumo pós-quinzena
                        const resultadosPorUnidade = statsPorEmpresa.map(e => ({
                          nome: e.emp.nome,
                          atingiu: e.totalQuinzenal >= e.metaQuinzenal,
                          pct: e.metaQuinzenal > 0 ? Math.round((e.totalQuinzenal / e.metaQuinzenal) * 100) : 0,
                          total: e.totalQuinzenal,
                          meta: e.metaQuinzenal,
                        })).filter(e => e.meta > 0);
                        // Verificar se todos os snapshots já estão congelados
                        const snapshotsDoMes = (snapshotsQuinzenais as any[]).filter(
                          (snap: any) => snap.mes === mes && snap.ano === ano
                        );
                        const empresasComMeta = resultadosPorUnidade.filter(e => e.meta > 0);
                        // Só considerar congelado se a quinzena já encerrou (dia > 15 ou mês passado)
                        const todosCongelados = quinzenaEncerradaGeral && empresasComMeta.length > 0 && snapshotsDoMes.length >= empresasComMeta.length;
                        // Indicador de tempo real: durante a quinzena ativa (dias 1-15 do mês vigente)
                        const exibindoTempoReal = !quinzenaEncerradaGeral && ehMesAtual;
                        return (
                          <div className={`mt-3 p-2.5 rounded-xl border ${
                            quinzenaEncerradaGeral
                              ? atingiuQ ? 'bg-emerald-500/10 border-emerald-500/30' : pctQ >= 80 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30'
                              : 'bg-purple-500/10 border-purple-500/20'
                          }`}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {quinzenaEncerradaGeral ? (
                                  <span className="text-base leading-none">{atingiuQ ? '✅' : pctQ >= 80 ? '⚠️' : '❌'}</span>
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                )}
                                <span className={`text-xs font-semibold ${
                                  quinzenaEncerradaGeral
                                    ? atingiuQ ? 'text-emerald-300' : pctQ >= 80 ? 'text-yellow-300' : 'text-red-300'
                                    : 'text-purple-300'
                                }`}>
                                  {quinzenaEncerradaGeral
                                    ? (atingiuQ ? 'QUINZENAL ATINGIDA!' : 'QUINZENAL NÃO ATINGIDA')
                                    : 'Meta Quinzenal'}
                                </span>
                                {todosCongelados && (
                                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    DEFINITIVO
                                  </span>
                                )}
                                {exibindoTempoReal && (
                                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                    TEMPO REAL
                                  </span>
                                )}
                              </div>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                atingiuQ ? 'bg-emerald-500/20 text-emerald-300' :
                                pctQ >= 80 ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-red-500/20 text-red-300'
                              }`}>{pctQ}%</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-white/60">{fmt(totalQuinzenalGeral)}</span>
                              <span className="text-white/40">/ {fmt(metaQuinzenalTotal)}</span>
                            </div>
                            {/* Resultado pós-quinzena: superou ou faltou */}
                            {quinzenaEncerradaGeral && atingiuQ && superouQ > 0 && (
                              <p className="text-xs font-semibold text-emerald-400 mt-1">+{fmt(superouQ)} acima da meta 🎉</p>
                            )}
                            {quinzenaEncerradaGeral && !atingiuQ && (
                              <p className={`text-xs font-semibold mt-1 ${pctQ >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>Faltou {fmt(faltaQ)}</p>
                            )}
                            {/* Resultado por unidade (apenas pós-quinzena) */}
                            {quinzenaEncerradaGeral && resultadosPorUnidade.length > 1 && (
                              <div className="mt-1.5 pt-1.5 border-t border-white/10 flex flex-col gap-0.5">
                                {resultadosPorUnidade.map(u => (
                                  <div key={u.nome} className="flex items-center justify-between text-[10px]">
                                    <span className="flex items-center gap-1">
                                      <span>{u.atingiu ? '✅' : u.pct >= 80 ? '⚠️' : '❌'}</span>
                                      <span className="text-white/60">{u.nome}</span>
                                    </span>
                                    <span className={`font-semibold ${u.atingiu ? 'text-emerald-400' : u.pct >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{u.pct}%</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Botão de congelar manual (apenas gerentes, quando quinzena encerrada = dia 16+ e não congelado) */}
                            {quinzenaEncerradaGeral && !todosCongelados && isGerente && (
                              <button
                                onClick={() => congelarQuinzenalMutation.mutate({ mes, ano })}
                                disabled={congelarQuinzenalMutation.isPending}
                                className="mt-2 w-full text-[10px] font-bold py-1.5 px-2 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 transition-colors disabled:opacity-50"
                              >
                                {congelarQuinzenalMutation.isPending ? 'Congelando...' : 'Congelar Valores Agora'}
                              </button>
                            )}
                            {/* Durante a quinzena: falta e meta/dia */}
                            {!quinzenaEncerradaGeral && !atingiuQ && faltaQ > 0 && (
                              <div className="mt-1.5 text-xs">
                                <span className="text-amber-400 font-semibold">Falta: {fmt(faltaQ)}</span>
                                {metaDiariaQ > 0 && diasRestQ > 0 && (
                                  <span className="text-purple-300/60 ml-1">· {fmt(metaDiariaQ)}/dia ({diasRestQ}d)</span>
                                )}
                              </div>
                            )}
                            {!quinzenaEncerradaGeral && atingiuQ && (
                              <div className="mt-1.5">
                                <QuinzenalCelebrationCompact
                                  atingiu={atingiuQ}
                                  percentual={pctQ}
                                  superou={superouQ}
                                />
                              </div>
                            )}
                            <div className="mt-1.5 h-1 rounded-full bg-white/10 overflow-hidden">
                              <div className={`h-full rounded-full ${
                                atingiuQ ? 'bg-emerald-400' : pctQ >= 80 ? 'bg-yellow-400' : 'bg-purple-400'
                              }`} style={{ width: `${Math.min(pctQ, 100)}%` }} />
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )
                ) : (
                  <p className="font-display text-xl sm:text-3xl text-muted-foreground leading-none">—</p>
                )}
              </div>

            </div>

            {/* KPI 4: Clientes Atendidos */}
            {clientesAtendidosData.totalClientesUnicos > 0 && (() => {
              const clientesAnterior = clientesAtendidosData.porUnidade ? 
                Object.values(clientesAtendidosData.porUnidade).reduce((sum: number, u: any) => sum + (u.anterior || 0), 0) : 0;
              const variacao = clientesAtendidosData.variacao || 0;
              const cresceu = variacao > 0;
              return (
                <div className="rounded-2xl p-3 sm:p-5 bg-card border border-border/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-label text-muted-foreground tracking-widest text-[10px] sm:text-[11px]">CLIENTES ATENDIDOS</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      cresceu ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                    }`}>
                      {cresceu ? '+' : ''}{variacao.toFixed(1)}%
                    </span>
                  </div>
                  <p className="font-display text-xl sm:text-3xl text-foreground leading-none">{clientesAtendidosData.totalClientesUnicos}</p>
                  <p className="text-muted-foreground text-xs mt-1">clientes únicos este mês</p>
                  {clientesAnterior > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Mês anterior:</span>
                        <span className="text-xs font-medium text-foreground">{clientesAnterior} clientes</span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-muted-foreground">Diferença:</span>
                        <span className={`text-xs font-bold ${
                          cresceu ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                          {cresceu ? '+' : ''}{clientesAtendidosData.totalClientesUnicos - clientesAnterior} clientes
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

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
                        Não afeta média, máximo e mínimo diário
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

            {/* Card Comparativo Unificado: Mês Anterior + Melhor Mês do Ano */}
            {comparativoMesAnterior.totalAnteriorMesmosDias > 0 && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Análise Comparativa</h3>
                    <p className="text-xs text-muted-foreground">{comparativoMesAnterior.periodoLabel} — mesmos dias apurados</p>
                  </div>
                </div>

                {/* Tabela comparativa por unidade */}
                <div className="space-y-3">
                  {empresasVisiveis.map((emp) => {
                    const compAnterior = comparativoMesAnterior.porEmpresa[emp.slug];
                    const compMelhor = comparativoMelhorMes?.porEmpresa[emp.slug];
                    if (!compAnterior) return null;
                    const varAnterior = compAnterior.totalAnterior > 0
                      ? ((compAnterior.totalAtual - compAnterior.totalAnterior) / compAnterior.totalAnterior) * 100
                      : null;
                    const varMelhor = compMelhor?.variacao ?? null;
                    return (
                      <div key={emp.slug} className="rounded-xl border border-border/50 overflow-hidden">
                        {/* Header da unidade */}
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.cor }} />
                          <span className="text-sm font-semibold text-foreground">{emp.nome}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{MESES[mes - 1]}: <span className="font-bold text-foreground">{fmt(compAnterior.totalAtual)}</span></span>
                        </div>
                        {/* Linhas de comparação */}
                        <div className="divide-y divide-border/30">
                          {/* Mês anterior */}
                          <div className="flex items-center justify-between px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                              <span className="text-xs text-muted-foreground">{MESES[mesAnterior - 1]}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{compAnterior.totalAnterior > 0 ? fmt(compAnterior.totalAnterior) : "—"}</span>
                              {varAnterior !== null ? (
                                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                  varAnterior >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {varAnterior >= 0 ? "+" : ""}{varAnterior.toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                          {/* Melhor mês */}
                          {compMelhor && compMelhor.totalMelhor > 0 && (
                            <div className="flex items-center justify-between px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-3 h-3 text-amber-500" />
                                <span className="text-xs text-muted-foreground">{compMelhor.mesNome} <span className="text-amber-600 font-medium">(melhor)</span></span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">{fmt(compMelhor.totalMelhor)}</span>
                                {varMelhor !== null ? (
                                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                                    varMelhor >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                  }`}>
                                    {varMelhor >= 0 ? "+" : ""}{varMelhor.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
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
              <Card className="p-4 sm:p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-4">
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
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Total realizado</p>
                    <p className="text-base sm:text-lg font-bold text-foreground">{fmt(totalGeralRealizado)}</p>
                    <p className="text-xs text-muted-foreground hidden sm:block">de {fmt(metaTotalGeral)}</p>
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
                      <div
                        key={s.emp.slug}
                        onClick={() => setSelectedUnitForDrilldown(s.emp.slug)}
                        className="cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.emp.cor }} />
                            <span className="text-sm font-medium text-foreground">{s.emp.nome}</span>
                            {atingiu && (
                              <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">✓ Meta!</span>
                            )}
                            {/* Semáforo de meta diária — exibido apenas no mês vigente */}
                            {s.semaforo !== null && (
                              <span
                                title={`Hoje: ${fmt(s.fatHoje)} / meta diária ${fmt(s.metaDiariaHoje)} (${s.pctMetaDiaria !== null ? Math.round(s.pctMetaDiaria) : 0}%)`}
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                  s.semaforo === 'verde' ? 'bg-emerald-500/15 text-emerald-400'
                                  : s.semaforo === 'amarelo' ? 'bg-amber-500/15 text-amber-400'
                                  : 'bg-red-500/15 text-red-400'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  s.semaforo === 'verde' ? 'bg-emerald-400'
                                  : s.semaforo === 'amarelo' ? 'bg-amber-400'
                                  : 'bg-red-400'
                                }`} />
                                {s.semaforo === 'verde' ? 'Dia OK' : s.semaforo === 'amarelo' ? 'Dia parcial' : 'Dia baixo'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-xs text-muted-foreground">{fmt(s.totalRealizado)} / {fmt(s.metaMensal)}</span>
                              {clientesAtendidosData.porUnidade[s.emp.slug] && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Users className="w-3 h-3" />
                                  {clientesAtendidosData.porUnidade[s.emp.slug].atual} clientes
                                </span>
                              )}
                            </div>
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
                        {/* Linha de falta/atingida por unidade */}
                        <div className="flex items-center justify-between mt-1 mb-0.5">
                          {atingiu ? (
                            <span className="text-[10px] font-semibold text-emerald-500">
                              ✓ Meta atingida!
                            </span>
                          ) : (
                            <span className="text-[10px] text-amber-400 font-medium">
                              Falta <span className="font-bold">{fmt(s.metaMensal - s.totalRealizado)}</span>
                            </span>
                          )}
                          {!atingiu && projecao > 0 && (
                            <span className={`text-[10px] font-medium ${
                              projecaoAtingeMeta ? 'text-emerald-500' : 'text-muted-foreground'
                            }`}>
                              Proj: {fmt(projecao)}
                            </span>
                          )}
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
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
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



            {/* Gráfico de Evolução de Clientes */}
            {evolucaoClientesData.length > 0 && (
              <ClientesEvolucaoChart data={evolucaoClientesData} />
            )}

            {/* Clientes por Unidade */}
            {Object.keys(clientesAtendidosData.porUnidade || {}).length > 0 && (
              <ClientesPorUnidadeCard
                dados={Object.entries(clientesAtendidosData.porUnidade || {}).map(([unidade, dados]: [string, any]) => ({
                  unidade,
                  totalClientes: dados.totalClientes || 0,
                  variacaoPercentual: dados.variacaoPercentual || 0,
                }))}
                mes={mes}
                ano={ano}
                onMesChange={(novoMes, novoAno) => {
                  setMes(novoMes);
                  setAno(novoAno);
                }}
                mesesDisponiveis={[
                  { mes: 3, ano: 2026, label: "Marco 2026" },
                  { mes: 4, ano: 2026, label: "Abril 2026" },
                  { mes: 5, ano: 2026, label: "Maio 2026" },
                ]}
              />
            )}
            {/* Gráfico de Evolução Mensal de Clientes */}
            {evolucaoMensalData && evolucaoMensalData.length > 0 && (
              <ClientesEvolucaoMensalChart dados={evolucaoMensalData} />
            )}
            
            {/* Ranking de Profissionais por Clientes Atendidos */}
            {rankingClientesData.length > 0 && (
              <RankingProfissionaisPorClientes
                dados={rankingClientesData}
                isLoading={loadingRankingClientes}
              />
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
                <div className="mt-4 pt-3 border-t border-border flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Realizado: <span className="font-semibold text-foreground">{fmt(totalGeralRealizado)}</span></span>
                  <span>Meta: <span className="font-semibold text-foreground">{fmt(metaTotalGeral)}</span></span>
                  <span className={`font-bold ml-auto ${
                    totalGeralRealizado >= metaTotalGeral ? "text-emerald-400"
                    : (totalGeralRealizado / metaTotalGeral) >= 0.75 ? "text-blue-400"
                    : "text-amber-400"
                  }`}>
                    {metaTotalGeral > 0 ? ((totalGeralRealizado / metaTotalGeral) * 100).toFixed(1) : "0.0"}%
                  </span>
                </div>
              </Card>
            )}

            {/* ===== CARDS POR UNIDADE — DESIGN PREMIUM ===== */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {statsPorEmpresa.map((s) => {
                const metaDiaAtualMensal = s.diasUteisRestantes > 0 ? s.metaDiariaDinamicaMensal : s.metaDiariaMensal;
                const menorQueMeta = s.mediaDiaria > 0 && metaDiaAtualMensal > 0 && s.mediaDiaria < metaDiaAtualMensal;
                const atingiuMeta = s.totalRealizado >= s.metaMensal && s.metaMensal > 0;
                const pctMensal = s.metaMensal > 0 ? Math.min(Math.round((s.totalRealizado / s.metaMensal) * 100), 100) : 0;
                const superouMensal = atingiuMeta ? Math.max(0, s.totalRealizado - s.metaMensal) : 0;
                const percentualMensalReal = s.metaMensal > 0 ? (s.totalRealizado / s.metaMensal) * 100 : 0;
                const comp = comparativoMesAnterior.porEmpresa[s.emp.slug];
                const variacaoMes = comp && comp.totalAnterior > 0
                  ? ((comp.totalAtual - comp.totalAnterior) / comp.totalAnterior) * 100
                  : null;
                const dpoteCfg = dpoteConfigMap[s.emp.slug];
                const valorBruto = dpoteCfg?.valorAssinaturas;
                const fonteAtual = dpoteCfg?.recorrenciaFonte ?? "cashbarber";
                const isEditandoEsta = recorrenciaManualSlug === s.emp.slug;
                const valorManualNum = parseFloat(recorrenciaManualValor.replace(',', '.')) || 0;
                const isSavingFonte = salvarRecorrenciaFonteMutation.isPending;
                const diasDoMes = new Date(ano, mes, 0).getDate();
                const diaHoje = (new Date().getFullYear() === ano && new Date().getMonth() + 1 === mes)
                  ? new Date().getDate() : diasDoMes;
                 const previewDiario = valorManualNum > 0 ? valorManualNum / Math.max(diaHoje, 1) : 0;
                const previewProjecaoMensal = valorManualNum > 0 ? (valorManualNum / Math.max(diaHoje, 1)) * diasDoMes : 0;
                // Alerta: Dpote não distribuído hoje (cat9 = 0 no dia atual, mas há previsão do mês anterior)
                const ehMesVigenteCard = new Date().getFullYear() === ano && new Date().getMonth() + 1 === mes;
                const rowHoje = s.rows.find((r: any) => parseInt(r.data.split("-")[2]) === diaHoje);
                const cat9Hoje = rowHoje ? parseFloat(rowHoje.cat9 || "0") : 0;
                const dpoteNaoDistribuidoHoje = ehMesVigenteCard && s.cat9DiarioPrevisto > 0 && cat9Hoje === 0 && rowHoje;
                // Semáforo: compara média diária com meta diária necessária
                const semaforoStatus = (() => {
                  if (atingiuMeta) return 'meta';
                  if (!metaDiaAtualMensal || metaDiaAtualMensal === 0) return 'neutro';
                  const ratio = s.mediaDiaria / metaDiaAtualMensal;
                  if (ratio >= 1.0) return 'verde';
                  if (ratio >= 0.8) return 'amarelo';
                  return 'vermelho';
                })();
                const semaforoCor = semaforoStatus === 'meta' ? '#10b981'
                  : semaforoStatus === 'verde' ? '#22c55e'
                  : semaforoStatus === 'amarelo' ? '#f59e0b'
                  : semaforoStatus === 'neutro' ? '#6b7280'
                  : '#ef4444';
                const semaforoEmoji = semaforoStatus === 'meta' ? '🟢'
                  : semaforoStatus === 'verde' ? '🟢'
                  : semaforoStatus === 'amarelo' ? '🟡'
                  : semaforoStatus === 'neutro' ? '⚪'
                  : '🔴';
                const semaforoLabel = semaforoStatus === 'meta' ? 'Meta atingida'
                  : semaforoStatus === 'verde' ? 'No ritmo'
                  : semaforoStatus === 'amarelo' ? 'Quase no ritmo'
                  : semaforoStatus === 'neutro' ? 'Sem dados'
                  : 'Precisa acelerar';
                const viabilidadeConfig = (() => {
                  const status = s.viabilidadeMetaDiaria?.status;
                  if (atingiuMeta || status === 'atingida') {
                    return { label: 'Meta atingida', cor: 'text-emerald-400', fundo: 'bg-emerald-500/10', borda: 'border-emerald-500/25', ponto: 'bg-emerald-400' };
                  }
                  if (status === 'realista') {
                    return { label: 'Dentro do ritmo atual', cor: 'text-emerald-400', fundo: 'bg-emerald-500/10', borda: 'border-emerald-500/25', ponto: 'bg-emerald-400' };
                  }
                  if (status === 'atencao') {
                    return { label: 'Exige até 25% mais', cor: 'text-amber-400', fundo: 'bg-amber-500/10', borda: 'border-amber-500/25', ponto: 'bg-amber-400' };
                  }
                  if (status === 'critica') {
                    return { label: 'Acima do ritmo atual', cor: 'text-red-400', fundo: 'bg-red-500/10', borda: 'border-red-500/25', ponto: 'bg-red-400' };
                  }
                  return { label: 'Sem média para comparar', cor: 'text-slate-400', fundo: 'bg-slate-500/10', borda: 'border-slate-500/25', ponto: 'bg-slate-400' };
                })();
                const fechamentoSemanal = s.emp.slug.toLowerCase().includes('seraphine')
                  ? 'Domingo e segunda-feira'
                  : 'Domingo';
                return (
                  <div key={s.emp.slug} className="rounded-2xl overflow-hidden shadow-xl flex flex-col" style={{ border: `1px solid ${s.emp.cor}40` }}>

                    {/* ── CABEÇALHO: gradiente com cor da empresa ── */}
                    <div className="relative px-5 pt-5 pb-4"
                      style={{ background: `linear-gradient(135deg, ${s.emp.cor}22 0%, ${s.emp.cor}08 100%)`, borderBottom: `1px solid ${s.emp.cor}30` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ backgroundColor: s.emp.cor + '25', border: `1.5px solid ${s.emp.cor}80` }}>
                            <Building2 className="w-5 h-5" style={{ color: s.emp.cor }} />
                          </div>
                          <div>
                            <h3 className="font-display font-bold text-white text-base leading-tight">{s.emp.nome}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-300">{s.diasRealizados} dias</span>
                              {s.diasPrevistos > 0 && (
                                <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                                  +{s.diasPrevistos} prev.
                                </span>
                              )}
                              {variacaoMes !== null && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                  variacaoMes >= 0
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-red-500/15 text-red-400'
                                }`}>
                                  {variacaoMes >= 0 ? '↑' : '↓'}{Math.abs(variacaoMes).toFixed(1)}%
                                </span>
                              )}
                              {dpoteNaoDistribuidoHoje && (
                                <span
                                  title={`Recorrência do dia ${diaHoje}/${mes.toString().padStart(2,'0')} ainda não foi distribuída pelo Dpote. Execute o Sync CB para atualizar.`}
                                  className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 cursor-help"
                                >
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  Dpote pendente
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {/* Semáforo de ritmo */}
                          <div className="flex items-center justify-end gap-1.5 mb-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: semaforoCor + '22', color: semaforoCor, border: `1px solid ${semaforoCor}60` }}>{semaforoEmoji} {semaforoLabel}</span>
                          </div>
                          <p className="font-display text-2xl font-bold leading-none" style={{ color: 'var(--meta-card-value)' }}>{fmt(s.totalRealizado)}</p>
                          {s.totalPrevisto > 0 && (
                            <p className="text-[11px] text-amber-400 mt-0.5">+{fmt(s.totalPrevisto)} previsto</p>
                          )}
                          {s.recorrenciaMes > 0 && (
                            <p className="text-[10px] text-violet-400/80 mt-0.5">
                              {s.ehMesFuturo
                                ? `prev. Dpote: + ${fmt(s.recorrenciaPrevisao)}`
                                : `+ ${fmt(s.recorrenciaMes)} Dpote`
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Barra de progresso meta mensal */}
                      {s.metaMensal > 0 && (
                        <div className="mt-4">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-[11px] font-label text-slate-400 tracking-wide">META MENSAL</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-300">{fmt(s.metaMensal)}</span>
                              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                                atingiuMeta ? 'bg-emerald-500/20 text-emerald-400'
                                : pctMensal >= 80 ? 'bg-amber-500/15 text-amber-400'
                                : 'bg-red-500/15 text-red-400'
                              }`}>{pctMensal}%</span>
                            </div>
                          </div>
                          <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--meta-card-bar-bg)' }}>
                            <div className="h-full rounded-full"
                              style={{
                                width: `${pctMensal}%`,
                                animation: 'progressFill 1s ease-out',
                                backgroundColor: atingiuMeta ? '#10b981' : pctMensal >= 80 ? '#f59e0b' : s.emp.cor
                              }} />
                          </div>
                          {/* Linha de falta/atingida */}
                          <div className="flex items-center justify-between mt-2">
                            {atingiuMeta ? (
                              <span className="text-xs font-bold text-emerald-400">✓ Meta atingida!</span>
                            ) : (
                              <span className="text-xs font-semibold text-amber-400">
                                Falta: <span className="font-bold">{fmt(s.metaMensal - s.totalRealizado)}</span>
                              </span>
                            )}
                            {!atingiuMeta && (s.metaMensal - s.totalRealizado) > 0 && s.diasUteisRestantes > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                {fmt((s.metaMensal - s.totalRealizado) / s.diasUteisRestantes)}/dia
                              </span>
                            )}
                          </div>
                          {/* Badge de celebração mensal */}
                          {atingiuMeta && (
                            <div className="mt-2">
                              <MensalCelebration
                                atingiu={atingiuMeta}
                                percentual={percentualMensalReal}
                                superou={superouMensal}
                                nomeUnidade={s.emp.nome}
                                cor={s.emp.cor}
                              />
                            </div>
                          )}
                          {/* Meta esperada hoje */}
                          {s.metaMensal > 0 && (() => {
                            const diasUteisTotal = s.diasUteis ?? 26;
                            const diasDecorridos = Math.min(s.diasRealizados, diasUteisTotal);
                            const metaEsperadaHoje = diasUteisTotal > 0 ? (s.metaMensal / diasUteisTotal) * diasDecorridos : 0;
                            const pctEsperado = s.metaMensal > 0 ? Math.min((metaEsperadaHoje / s.metaMensal) * 100, 100) : 0;
                            return (
                              <div className="flex justify-between mt-1">
                                <span className="text-[10px] text-slate-400">
                                  Esperado hoje: {fmt(metaEsperadaHoje)} ({pctEsperado.toFixed(0)}%)
                                </span>

                                {s.projecaoFinal > 0 && (
                                  <span className={`text-[10px] font-medium ${
                                    s.projecaoFinal >= s.metaMensal ? 'text-emerald-400' : 'text-amber-400'
                                  }`}>
                                    Proj: {fmt(s.projecaoFinal)}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>

                    {/* ── MÉTRICAS OPERACIONAIS ── */}
                    <div className="px-5 py-3 grid grid-cols-3 gap-3" style={{ backgroundColor: 'var(--meta-card-section-bg)', borderTop: `1px solid var(--meta-card-section-border)` }}>
                      {/* Média diária */}
                      <div className="text-center">
                        <p className="font-label text-[10px] tracking-widest mb-1" style={{ color: 'var(--meta-card-label)' }}>MÉDIA/DIA</p>
                        <p className={`font-display text-base font-bold ${menorQueMeta ? 'text-orange-400' : ''}`} style={menorQueMeta ? {} : { color: 'var(--meta-card-value)' }}>
                          {fmt(s.mediaDiaria)}
                        </p>
                        {menorQueMeta && metaDiaAtualMensal > 0 && (
                          <p className="text-[10px] text-orange-400/70 mt-0.5">
                            precisa {fmt(metaDiaAtualMensal)}
                          </p>
                        )}
                      </div>
                      {/* Maior dia */}
                      <div className="text-center border-x" style={{ borderColor: 'var(--meta-card-section-border)' }}>
                        <p className="font-label text-[10px] tracking-widest mb-1" style={{ color: 'var(--meta-card-label)' }}>MAIOR DIA</p>
                        <p className="font-display text-base font-bold text-emerald-400">{s.maiorDia > 0 ? fmt(s.maiorDia) : '—'}</p>
                        {s.menorDia > 0 && (
                          <p className="text-[10px] text-red-400/80 mt-0.5">mín {fmt(s.menorDia)}</p>
                        )}
                      </div>
                      {/* Dias úteis restantes */}
                      <div className="text-center">
                        <div className="mb-1 flex items-center justify-center gap-1">
                          <p className="font-label text-[10px] tracking-widest" style={{ color: 'var(--meta-card-label)' }}>DIAS REST.</p>
                          <UITooltip>
                            <UITooltipTrigger asChild>
                              <button
                                type="button"
                                className="rounded-full text-slate-500 outline-none transition-colors hover:text-slate-300 focus-visible:ring-2 focus-visible:ring-blue-400"
                                aria-label={`Ver calendário de funcionamento da unidade ${s.emp.nome}`}
                              >
                                <Info className="h-3 w-3" />
                              </button>
                            </UITooltipTrigger>
                            <UITooltipContent side="top" className="max-w-xs border-slate-700 bg-slate-950 p-3 text-left text-xs text-slate-200">
                              <p className="font-semibold text-white">Calendário de {s.emp.nome}</p>
                              <p className="mt-1"><span className="text-slate-400">Fechamento semanal:</span> {fechamentoSemanal}.</p>
                              <p className="mt-1 text-slate-400">A contagem considera somente os dias de funcionamento posteriores a hoje e exclui os fechamentos excepcionais cadastrados.</p>
                              {s.fechamentosEmpresa.length > 0 ? (
                                <div className="mt-2 border-t border-slate-800 pt-2">
                                  <p className="font-medium text-amber-300">Exceções deste mês:</p>
                                  {s.fechamentosEmpresa.map((fechamento: any) => (
                                    <p key={fechamento.id} className="mt-1">
                                      {fechamento.data.split('-').reverse().join('/')} — {fechamento.motivo}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-2 border-t border-slate-800 pt-2 text-slate-500">Nenhum feriado ou fechamento excepcional cadastrado neste mês.</p>
                              )}
                            </UITooltipContent>
                          </UITooltip>
                        </div>
                        <p className="font-display text-base font-bold" style={{ color: 'var(--meta-card-value)' }}>
                          {s.diasUteisRestantes}
                        </p>
                        {s.diasUteisRestantes > 0 && metaDiaAtualMensal > 0 && (
                          <div className="mt-1 flex flex-col items-center gap-1">
                            <p className={`text-[10px] font-semibold ${viabilidadeConfig.cor}`}>
                              {fmt(metaDiaAtualMensal)}/dia
                            </p>
                            <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${viabilidadeConfig.cor} ${viabilidadeConfig.fundo} ${viabilidadeConfig.borda}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${viabilidadeConfig.ponto}`} />
                              {viabilidadeConfig.label}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── METAS ADICIONAIS (Quinzenal + Super Meta) ── */}
                    {(s.metaQuinzenal > 0 || s.superMeta > 0) && (
                      <div className="px-5 py-3 flex gap-3" style={{ backgroundColor: 'var(--meta-card-section-bg)', borderTop: `1px solid var(--meta-card-section-border)` }}>
                        {s.metaQuinzenal > 0 && (() => {
                          const atingiuQ = s.totalQuinzenal >= s.metaQuinzenal;
                          const faltaQ = Math.max(0, s.metaQuinzenal - s.totalQuinzenal);
                          const superouQ = s.totalQuinzenal > s.metaQuinzenal ? s.totalQuinzenal - s.metaQuinzenal : 0;
                          const pctQ = Math.round(s.progressoQuinzenal);
                          const diaAtualQ = new Date().getDate();
                          const mesAtualQ = new Date().getMonth() + 1;
                          const anoAtualQ = new Date().getFullYear();
                          const ehMesVigenteQ = mes === mesAtualQ && ano === anoAtualQ;
                          const naSegundaQ = ehMesVigenteQ ? diaAtualQ > 15 : !ehMesVigenteQ;
                          const quinzenaEncerrada = naSegundaQ || !ehMesVigenteQ;
                          // Semáforo de ritmo quinzenal: compara média diária atual vs meta diária necessária
                          const ritmoQ = (() => {
                            if (quinzenaEncerrada) return null; // pós-quinzena usa indicador próprio
                            if (atingiuQ) return { emoji: '🟢', label: 'Quinzenal atingida!', cor: '#10b981' };
                            if (s.metaDiariaDinamicaQuinzenal <= 0) return null;
                            const ratio = s.mediaDiaria > 0 ? s.mediaDiaria / s.metaDiariaDinamicaQuinzenal : 0;
                            if (ratio >= 1.0) return { emoji: '🟢', label: 'No ritmo certo!', cor: '#10b981' };
                            if (ratio >= 0.8) return { emoji: '🟡', label: 'Quase no ritmo', cor: '#f59e0b' };
                            return { emoji: '🔴', label: 'Precisa acelerar!', cor: '#ef4444' };
                          })();
                          const snapshotQ = quinzenaEncerrada
                            ? (snapshotsQuinzenais as any[]).find(
                                (snap: any) => snap.empresaSlug === s.emp.slug && snap.mes === mes && snap.ano === ano
                              )
                            : undefined;
                          // Indicador de tempo real: durante a quinzena ativa (dias 1-15 do mês vigente)
                          const exibindoTempoRealQ = !quinzenaEncerrada && ehMesVigenteQ;
                          return (
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1">
                                <span className="font-label text-[10px] tracking-widest" style={{ color: 'var(--meta-card-label)' }}>QUINZENAL</span>
                                {snapshotQ && (
                                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30" title={`Valor congelado em ${new Date(snapshotQ.congeladoEm).toLocaleDateString('pt-BR')}`}>
                                    DEFINITIVO
                                  </span>
                                )}
                                {exibindoTempoRealQ && (
                                  <span className="text-[8px] px-1 py-0.5 rounded font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                    TEMPO REAL
                                  </span>
                                )}
                              </div>
                              <span className={`text-[10px] font-bold ${atingiuQ ? 'text-emerald-400' : pctQ >= 80 ? 'text-yellow-400' : 'text-purple-400'}`}>
                                {pctQ}%
                              </span>
                            </div>
                            {/* Indicador pós-quinzena: resultado final destacado */}
                            {quinzenaEncerrada ? (
                              atingiuQ ? (
                                <div className="mb-1">
                                  <QuinzenalCelebration
                                    atingiu={atingiuQ}
                                    percentual={pctQ}
                                    superou={superouQ}
                                    nomeUnidade={s.emp.nome}
                                    cor={s.emp.cor}
                                    compact={true}
                                  />
                                  <p className="text-[10px] mt-1" style={{ color: 'var(--meta-card-label)' }}>
                                    {fmt(s.totalQuinzenal)} / {fmt(s.metaQuinzenal)}
                                  </p>
                                </div>
                              ) : (
                              <div className={`rounded-lg p-2 mb-1 border ${pctQ >= 80 ? 'border-yellow-500/40 bg-yellow-500/10' : 'border-red-500/40 bg-red-500/10'}`}>
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-sm">{pctQ >= 80 ? '⚠️' : '❌'}</span>
                                  <span className={`text-[11px] font-bold ${pctQ >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                    META NÃO ATINGIDA
                                  </span>
                                </div>
                                <p className="text-[10px]" style={{ color: 'var(--meta-card-label)' }}>
                                  {fmt(s.totalQuinzenal)} / {fmt(s.metaQuinzenal)}
                                </p>
                                <p className={`text-[10px] font-semibold ${pctQ >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>Faltou {fmt(faltaQ)}</p>
                              </div>
                              )
                            ) : (
                              <>
                                {ritmoQ && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: ritmoQ.cor + '22', color: ritmoQ.cor, border: `1px solid ${ritmoQ.cor}55` }}>
                                      {ritmoQ.emoji} {ritmoQ.label}
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--meta-card-bar-bg)' }}>
                              <div className={`h-full rounded-full ${atingiuQ ? 'bg-emerald-500' : pctQ >= 80 ? 'bg-yellow-500' : 'bg-purple-500'}`}
                                style={{ width: `${Math.min(pctQ, 100)}%`, animation: 'progressFill 0.8s ease-out' }} />
                            </div>
                            {!quinzenaEncerrada && (
                              <>
                                <p className="text-[10px] mt-0.5" style={{ color: 'var(--meta-card-label)' }}>{fmt(s.totalQuinzenal)} / {fmt(s.metaQuinzenal)}</p>
                                {!atingiuQ && faltaQ > 0 && (
                                  <p className="text-[10px] font-semibold text-amber-400 mt-0.5">
                                    Falta: {fmt(faltaQ)}
                                    {s.metaDiariaDinamicaQuinzenal > 0 && s.diasUteisRestantesQuinzenal > 0 && (
                                      <span className="text-purple-300/70 font-normal"> · {fmt(s.metaDiariaDinamicaQuinzenal)}/dia ({s.diasUteisRestantesQuinzenal}d)</span>
                                    )}
                                  </p>
                                )}
                                {atingiuQ && (
                                  <div className="mt-1.5">
                                    <QuinzenalCelebration
                                      atingiu={atingiuQ}
                                      percentual={pctQ}
                                      superou={superouQ}
                                      nomeUnidade={s.emp.nome}
                                      cor={s.emp.cor}
                                    />
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          );
                        })()}
                        {s.superMeta > 0 && (() => {
                          const progressoSuper = calcularProgressoSuperMeta(s.totalRealizado, s.superMeta);
                          return (
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-label text-[10px] text-amber-400/80 tracking-widest">★ SUPER META</span>
                                <span className={`text-[10px] font-bold ${progressoSuper.atingida ? 'text-emerald-400' : 'text-amber-400'}`}>
                                  {progressoSuper.percentual.toFixed(1)}%
                                </span>
                              </div>
                              <SuperMetaProgressTooltip
                                nomeUnidade={s.emp.nome}
                                totalRealizado={s.totalRealizado}
                                superMeta={s.superMeta}
                              >
                                <div
                                  className="h-2 rounded-full overflow-hidden"
                                  style={{ backgroundColor: 'var(--meta-card-bar-bg)' }}
                                  role="progressbar"
                                  aria-label={`Progresso da Super Meta de ${s.emp.nome}`}
                                  aria-valuemin={0}
                                  aria-valuemax={100}
                                  aria-valuenow={Math.round(progressoSuper.percentualBarra)}
                                >
                                  <div
                                    className={`h-full rounded-full ${progressoSuper.atingida ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}
                                    style={{ width: `${progressoSuper.percentualBarra}%`, animation: 'progressFill 0.9s ease-out' }}
                                  />
                                </div>
                              </SuperMetaProgressTooltip>
                              <p className="text-[10px] mt-1" style={{ color: 'var(--meta-card-label)' }}>{fmt(s.totalRealizado)} de {fmt(s.superMeta)}</p>
                              <p className={`text-[10px] font-semibold mt-0.5 ${progressoSuper.atingida ? 'text-emerald-400' : 'text-orange-400'}`}>
                                {progressoSuper.atingida
                                  ? `Superou ${fmt(progressoSuper.excedente)}`
                                  : `Falta ${fmt(progressoSuper.falta)}`}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {/* ── RECORRÊNCIA DPOTE ── */}
                    {(s.recorrenciaMes > 0 || isGerente) && (() => {
                      return (
                        <div className="px-5 py-3" style={{ backgroundColor: 'rgba(109,40,217,0.12)', borderTop: `1px solid rgba(139,92,246,0.2)` }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                                <RefreshCw className="w-3 h-3 text-violet-400" />
                              </div>
                              <div>
                                <p className="font-label text-[10px] text-violet-400/70 tracking-widest">RECORRÊNCIA</p>
                                <div className="flex items-center gap-1.5">
                                  {valorBruto && fonteAtual === "cashbarber" ? (
                                    <UITooltip>
                                      <UITooltipTrigger asChild>
                                        <span className="font-display text-sm font-bold text-violet-300 cursor-help border-b border-dotted border-violet-400/40">
                                          {fmt(s.recorrenciaMes)}
                                        </span>
                                      </UITooltipTrigger>
                                      <UITooltipContent side="top" className="bg-slate-900 border-violet-500/30 text-xs max-w-xs">
                                        <div className="space-y-1 font-mono text-[11px]">
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-violet-400">Total assinaturas:</span>
                                            <span className="font-semibold text-white">{fmtFull(valorBruto)}</span>
                                          </div>
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-violet-400">Proporção fichas:</span>
                                            <span className="font-semibold text-white">{valorBruto > 0 ? `${((s.recorrenciaMes / valorBruto) * 100).toFixed(1)}%` : "—"}</span>
                                          </div>
                                          <div className="pt-1 border-t border-violet-500/30 flex items-center gap-1.5">
                                            <span className="text-violet-300 font-semibold">= Recorrência filial:</span>
                                            <span className="font-bold text-violet-200">{fmtFull(s.recorrenciaMes)}</span>
                                          </div>
                                        </div>
                                      </UITooltipContent>
                                    </UITooltip>
                                  ) : (
                                    <span className="font-display text-sm font-bold text-violet-300">{fmt(s.recorrenciaMes)}</span>
                                  )}
                                  {fonteAtual === "cashbarber" ? (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                                      <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                                      API
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-violet-400 bg-violet-500/15 px-1.5 py-0.5 rounded-md">
                                      <Pencil className="w-2 h-2" />
                                      Manual
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            {/* Botões de fonte — apenas gerente */}
                            {isGerente && valorBruto && (
                              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/60 border border-violet-500/20">
                                <button
                                  onClick={() => {
                                    if (fonteAtual !== "cashbarber" && !isSavingFonte) {
                                      salvarRecorrenciaFonteMutation.mutate({ empresaSlug: s.emp.slug, fonte: "cashbarber", mes, ano });
                                    }
                                  }}
                                  disabled={isSavingFonte}
                                  className={`flex items-center justify-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold transition-all ${
                                    fonteAtual === "cashbarber"
                                      ? "bg-emerald-500/25 text-emerald-300 shadow-sm"
                                      : "text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <RefreshCw className="w-2.5 h-2.5" />
                                  CB
                                </button>
                                <button
                                  onClick={() => {
                                    if (fonteAtual !== "manual" && !isSavingFonte) {
                                      setRecorrenciaManualSlug(s.emp.slug);
                                      setRecorrenciaManualValor("");
                                      salvarRecorrenciaFonteMutation.mutate({ empresaSlug: s.emp.slug, fonte: "manual", mes, ano });
                                    } else if (fonteAtual === "manual") {
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
                                  className={`flex items-center justify-center gap-1 h-6 px-2 rounded-md text-[10px] font-semibold transition-all ${
                                    fonteAtual === "manual"
                                      ? "bg-violet-500/30 text-violet-200 shadow-sm"
                                      : "text-slate-400 hover:text-slate-300"
                                  }`}
                                >
                                  <Pencil className="w-2.5 h-2.5" />
                                  Man.
                                </button>
                              </div>
                            )}
                          </div>
                          {/* Detalhe: Dpote real vs previsão dos dias restantes (mês vigente) */}
                          {s.recorrenciaPrevisaoRestante > 0 && !s.ehMesFuturo && (
                            <div className="mt-2 pt-2 border-t border-violet-500/20 grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5">
                                <p className="text-[9px] text-emerald-400/70 uppercase tracking-wide">✅ Dpote realizado</p>
                                <p className="text-[11px] font-bold text-emerald-300">{fmtFull(s.recorrenciaRealizada)}</p>
                              </div>
                              <div className="rounded-lg bg-violet-500/10 px-2 py-1.5">
                                <p className="text-[9px] text-violet-400/70 uppercase tracking-wide">🔮 Previsão restante</p>
                                <p className="text-[11px] font-bold text-violet-300">{fmtFull(s.recorrenciaPrevisaoRestante)}</p>
                              </div>
                            </div>
                          )}

                          {/* Painel de entrada manual */}
                          {isEditandoEsta && isGerente && fonteAtual === "manual" && (
                            <div className="mt-3 pt-3 border-t border-violet-500/20">
                              <p className="text-[11px] text-violet-300/80 mb-2">
                                Informe o valor total de Recorrência apurado até hoje.
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
                                    className="pl-8 h-8 text-sm bg-slate-800/60 border-violet-500/30 text-violet-100 placeholder:text-violet-400/40 focus:border-violet-400"
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
                                  className="h-8 w-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-200 shrink-0"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              {valorManualNum > 0 && (
                                <div className="mt-2 grid grid-cols-3 gap-2">
                                  <div className="rounded-lg bg-violet-500/10 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-violet-400/70 uppercase tracking-wide">Diário</p>
                                    <p className="text-[11px] font-bold text-violet-300">{fmtFull(previewDiario)}</p>
                                  </div>
                                  <div className="rounded-lg bg-emerald-500/10 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-emerald-400/70 uppercase tracking-wide">Até dia {diaHoje}</p>
                                    <p className="text-[11px] font-bold text-emerald-300">{fmtFull(valorManualNum)}</p>
                                  </div>
                                  <div className="rounded-lg bg-slate-500/10 px-2 py-1.5 text-center">
                                    <p className="text-[9px] text-slate-400/70 uppercase tracking-wide">Projeção</p>
                                    <p className="text-[11px] font-bold text-slate-300">{fmtFull(previewProjecaoMensal)}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* ── VALOR A PAGAR (BONIFICAÇÃO) ── */}
                    {(isGerente || isAdmin) && (() => {
                      const bonif = bonificacaoMap[s.emp.slug];
                      if (!bonif) return null;
                      const resultadoAtual = calcularBonificacaoSubstitutiva({
                        totalQuinzenal: s.totalQuinzenal,
                        totalMensal: s.totalRealizado,
                        metaQuinzenal: s.metaQuinzenal,
                        metaMensal: s.metaMensal,
                        superMeta: s.superMeta,
                        pctQuinzenalSemMeta: bonif.pctQuinzenalSemMeta,
                        pctQuinzenalComMeta: bonif.pctQuinzenalComMeta,
                        pctMensalSemMeta: bonif.pctMensalSemMeta,
                        pctMensalComMeta: bonif.pctMensalComMeta,
                        pctSuperMeta: bonif.pctSuperMeta,
                      });
                      const atingiuMensal = resultadoAtual.atingiuMetaMensal;
                      const atingiuQuinzenal = resultadoAtual.atingiuMetaQuinzenal;
                      const atingiuSuperMeta = resultadoAtual.atingiuSuperMeta;
                      const pctQz = resultadoAtual.pctQuinzenalAplicado;
                      const pctMensal = resultadoAtual.pctMensalAplicado;
                      const valorQz = resultadoAtual.valorQuinzenal;
                      const valorMensal = resultadoAtual.valorMensal;
                      const valorSuper = resultadoAtual.valorSuperMeta;
                      const totalPagar = resultadoAtual.totalPago;

                      // Projeção: quanto será pago se mantiver o ritmo atual
                      const projecao = s.projecaoFinal;
                      const resultadoProjetado = calcularBonificacaoSubstitutiva({
                        totalQuinzenal: s.totalQuinzenal,
                        totalMensal: projecao,
                        metaQuinzenal: s.metaQuinzenal,
                        metaMensal: s.metaMensal,
                        superMeta: s.superMeta,
                        pctQuinzenalSemMeta: bonif.pctQuinzenalSemMeta,
                        pctQuinzenalComMeta: bonif.pctQuinzenalComMeta,
                        pctMensalSemMeta: bonif.pctMensalSemMeta,
                        pctMensalComMeta: bonif.pctMensalComMeta,
                        pctSuperMeta: bonif.pctSuperMeta,
                      });
                      const totalPagarProj = resultadoProjetado.totalPago;
                      const projecaoMaior = totalPagarProj > totalPagar;

                      if (totalPagar === 0 && valorQz === 0 && valorMensal === 0) return null;

                      return (
                        <div className="px-5 py-3" style={{ backgroundColor: 'rgba(16,185,129,0.08)', borderTop: '1px solid rgba(16,185,129,0.2)' }}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-emerald-400 text-xs font-bold">R$</span>
                              </div>
                              <p className="font-label text-[10px] text-emerald-400/70 tracking-widest">VALOR A PAGAR</p>
                            </div>
                            <div className="text-right">
                              <p className="font-display text-lg font-bold text-emerald-300">{fmt(totalPagar)}</p>
                              {projecao > 0 && s.diasUteisRestantes > 0 && (
                                <p className={`text-[10px] font-medium mt-0.5 ${
                                  projecaoMaior ? 'text-amber-400' : 'text-slate-400'
                                }`}>
                                  Proj: {fmt(totalPagarProj)} {projecaoMaior ? '↑' : ''}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {s.metaQuinzenal > 0 && (
                              <div className={`rounded-lg px-2 py-1.5 ${atingiuQuinzenal ? 'bg-emerald-500/15' : 'bg-slate-500/10'}`}>
                                <p className="text-[9px] uppercase tracking-wide" style={{ color: atingiuQuinzenal ? '#6ee7b7' : '#94a3b8' }}>
                                  {atingiuQuinzenal ? '✅' : '⏳'} Quinzenal ({pctQz.toFixed(1)}%)
                                </p>
                                <p className={`text-[11px] font-bold ${atingiuQuinzenal ? 'text-emerald-300' : 'text-slate-300'}`}>{fmt(valorQz)}</p>
                                <p className="text-[9px] text-slate-400">{fmt(s.totalQuinzenal)}</p>
                              </div>
                            )}
                            {s.metaMensal > 0 && (
                              <div className={`rounded-lg px-2 py-1.5 ${resultadoAtual.mensalSubstituida ? 'bg-slate-500/10 border border-slate-500/20' : atingiuMensal ? 'bg-emerald-500/15' : 'bg-slate-500/10'}`}>
                                <p className="text-[9px] uppercase tracking-wide" style={{ color: resultadoAtual.mensalSubstituida ? '#94a3b8' : atingiuMensal ? '#6ee7b7' : '#94a3b8' }}>
                                  {resultadoAtual.mensalSubstituida ? '⭐ Mensal substituída' : `${atingiuMensal ? '✅' : '⏳'} Mensal (${pctMensal.toFixed(1)}%)`}
                                </p>
                                <p className={`text-[11px] font-bold ${resultadoAtual.mensalSubstituida ? 'text-slate-500 line-through' : atingiuMensal ? 'text-emerald-300' : 'text-slate-300'}`}>{fmt(valorMensal)}</p>
                                <p className="text-[9px] text-slate-400">{resultadoAtual.mensalSubstituida ? 'Super Meta ativa' : fmt(s.totalRealizado)}</p>
                              </div>
                            )}
                            {atingiuSuperMeta && bonif.pctSuperMeta > 0 && (
                              <div className="rounded-lg px-2 py-1.5 bg-amber-500/15 col-span-2">
                                <p className="text-[9px] text-amber-400/80 uppercase tracking-wide">⭐ Super Meta ({bonif.pctSuperMeta.toFixed(1)}%)</p>
                                <p className="text-[11px] font-bold text-amber-300">{fmt(valorSuper)}</p>
                                <p className="text-[9px] text-amber-400/70">Substitui a bonificação Mensal</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* ── STATUS FINAL ── */}
                    {s.mediaDiaria > 0 && (
                      <div className={`px-5 py-2.5 flex items-center gap-2 text-xs font-semibold ${
                        atingiuMeta
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : s.mediaDiaria >= metaDiaAtualMensal
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-orange-500/10 text-orange-400'
                      }`}>
                        {atingiuMeta
                          ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Meta mensal atingida! Projeção: {fmt(s.projecaoFinal)}</>
                          : s.mediaDiaria >= metaDiaAtualMensal
                          ? <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> No caminho certo para a meta</>
                          : <><TrendingDown className="w-3.5 h-3.5 shrink-0" /> Precisa +{fmt(metaDiaAtualMensal - s.mediaDiaria)}/dia para a meta</>
                        }
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* ─── RANKING DE PROFISSIONAIS ─────────────────────────────── */}
            {(rankingProfissionais.length > 0 || loadingRanking) && (
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-500/15 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Ranking de Profissionais</h3>
                      <p className="text-xs text-muted-foreground">
                        {MESES[mes - 1]} {ano} — por faturamento total
                        {rankingUltimaAtualizacao && (
                          <span className="ml-1.5 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 inline" />
                            {new Date(rankingUltimaAtualizacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-primary h-7 px-2"
                    onClick={() => navigate("/ranking")}
                  >
                    Ver completo →
                  </Button>
                </div>
                {loadingRanking ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : rankingProfissionais.some((p: any) => p.temDados) ? (
                  <div className="space-y-2.5">
                    {rankingProfissionais.slice(0, 5).map((p: any, idx: number) => {
                      const nome = p.apelido ?? p.nome;
                      const iniciais = nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                      const maxGeral = rankingProfissionais[0]?.totalGeral ?? 1;
                      const pctBar = maxGeral > 0 ? Math.round((p.totalGeral / maxGeral) * 100) : 0;
                      const medalhas = ["\uD83E\uDD47", "\uD83E\uDD48", "\uD83E\uDD49"];
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="w-6 text-center shrink-0">
                            {idx < 3
                              ? <span className="text-base">{medalhas[idx]}</span>
                              : <span className="text-xs font-bold text-muted-foreground">{idx + 1}º</span>
                            }
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-[10px] font-bold text-primary">{iniciais}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground truncate">{nome}</span>
                              <span className="text-xs font-semibold text-foreground shrink-0 ml-2">{fmt(p.totalGeral)}</span>
                            </div>
                            <div className="relative h-1.5 bg-muted/40 rounded-full overflow-hidden">
                              <div
                                className="absolute top-0 left-0 h-full rounded-full"
                                style={{
                                  width: `${pctBar}%`,
                                  background: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : '#3b82f6',
                                  opacity: 0.8,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {rankingProfissionais.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center pt-1">
                        +{rankingProfissionais.length - 5} profissionais —{" "}
                        <button className="text-primary underline" onClick={() => navigate("/ranking")}>ver todos</button>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Sem dados de faturamento para {MESES[mes - 1]} {ano}.</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá em <button className="text-primary underline" onClick={() => navigate("/profissionais")}>Profissionais</button> e clique em "Sincronizar CashBarber".
                    </p>
                  </div>
                )}
              </Card>
            )}
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

                <div className="h-[200px] sm:h-[280px] min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineDataDiario} margin={{ top: 10, right: 5, left: -10, bottom: 0 }}>
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
                      stroke="#a1a1aa"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 4, fill: "#a1a1aa", strokeWidth: 2, stroke: "#fff" }}
                      connectNulls={false}
                    />
                   </LineChart>
                </ResponsiveContainer>
                </div>
              </Card>
            )}
            {/* Gráfico de barras diário — realizados (azul) vs previstos (âmbar) */}
            {barDataDiario.length > 0 && (
              <Card className="p-4 sm:p-5 border-0 shadow-sm rounded-2xl bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground text-sm">Faturamento Diário</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-blue-500"></span> Realizado
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="inline-block w-3 h-3 rounded-sm bg-amber-400/60"></span> Previsto
                    </span>
                  </div>
                </div>
                <div className="h-[180px] sm:h-[240px] min-h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barDataDiario} margin={{ top: 5, right: 5, left: -10, bottom: 0 }} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis
                      dataKey="diaLabel"
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      interval={barDataDiario.length > 20 ? 4 : barDataDiario.length > 10 ? 1 : 0}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#6b7280" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                      width={38}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const entry = barDataDiario.find((d) => d.diaLabel === label);
                        const val = (payload[0]?.value as number) ?? 0;
                        return (
                          <div className="bg-popover border border-border shadow-lg rounded-xl p-3 text-xs min-w-[150px]">
                            <p className="font-semibold text-foreground mb-1">Dia {label}</p>
                            <p className={entry?.isPrevisto ? "text-amber-400" : "text-blue-400"}>
                              {entry?.isPrevisto ? "Previsto" : "Realizado"}: <span className="font-bold text-foreground">{fmtFull(val)}</span>
                            </p>
                            {entry?.isPrevisto && (
                              <p className="text-muted-foreground mt-1">Estimativa baseada em {MESES[mesAnterior - 1]}</p>
                            )}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="realizado" name="Realizado" radius={[3, 3, 0, 0]} maxBarSize={24}>
                      {barDataDiario.map((_, index) => (
                        <Cell key={index} fill="#3b82f6" />
                      ))}
                    </Bar>
                    <Bar dataKey="previsto" name="Previsto" radius={[3, 3, 0, 0]} maxBarSize={24}>
                      {barDataDiario.map((_, index) => (
                        <Cell key={index} fill="rgba(245,158,11,0.55)" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Gráficos */}
            {totalGeral > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de barras por empresa */}
                <Card className="p-4 sm:p-5 border-0 shadow-sm rounded-2xl bg-card">
                  <h3 className="font-semibold text-foreground mb-3 text-sm">Faturamento vs Meta por Empresa</h3>
                  <div className="h-[180px] sm:h-[240px] min-h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
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
                  </div>
                </Card>

                {/* Gráfico de pizza por empresa */}
                <Card className="p-4 sm:p-5 border-0 shadow-sm rounded-2xl bg-card">
                  <h3 className="font-semibold text-foreground mb-3 text-sm">Composição do Faturamento</h3>
                  {pieDataEmpresas.length > 0 ? (
                    <div className="h-[180px] sm:h-[240px] min-h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
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
                        <Legend wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-36 text-muted-foreground text-sm">
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
                      ? ["Serviços", "Pacotes", "Produtos", "Caixinha", "Recorrência", "", "", "", ""]
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
                <div className="h-[220px] sm:h-[300px] min-h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={barDataCategoriasSeraphine.data}
                    margin={{ top: 5, right: 5, left: -10, bottom: 40 }}
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
                </div>
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
              <LancamentosSkeleton />
            ) : faturamentosData.length === 0 ? (
              <Card className="p-8 border-0 shadow-sm rounded-2xl bg-card text-center">
                <Calendar className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum lançamento neste mês.</p>
              </Card>
            ) : (
              statsPorEmpresa.map(({ emp, rows, cat9DiarioPrevisto, ehMesFuturo: ehMesFuturoEmp }) => {
                const rowsSorted = [...rows].sort((a: any, b: any) => b.data.localeCompare(a.data));
                if (rowsSorted.length === 0) return null;
                // Usar categorias do banco; fallback para padrão
                const empCats = (emp as any).categorias as Array<{ nome: string }> | undefined;
                const labels = empCats && empCats.length > 0
                  ? empCats.map((c) => c.nome)
                  : emp.tipoCategorias === "seraphine"
                    ? ["Serviços", "Pacotes", "Produtos", "Caixinha", "Recorrência", "", "", "", ""]
                    : ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência"];
                return (
                  <Card key={emp.slug} className="border-0 shadow-sm rounded-2xl bg-card overflow-hidden">
                    <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.cor }} />
                      <h3 className="font-semibold text-foreground">{emp.nome}</h3>
                      <span className="ml-auto text-xs text-muted-foreground">{rowsSorted.length} registros</span>
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
                          {rowsSorted.map((row: any) => {
                            const cats = [row.cat1, row.cat2, row.cat3, row.cat4, row.cat5, row.cat6, row.cat7, row.cat8, row.cat9].map((v: any) => parseFloat(v || "0"));
                            const total = cats.reduce((a: number, b: number) => a + b, 0);
                            const [, , dia] = row.data.split("-");
                            // Detectar se o dia é futuro (previsto)
                            const hojeRef = new Date();
                            const diaHojeRef = mes === hojeRef.getMonth() + 1 && ano === hojeRef.getFullYear()
                              ? hojeRef.getDate()
                              : new Date(ano, mes, 0).getDate();
                            const isFuturo = parseInt(dia) > diaHojeRef;
                            // Previsão de recorrência diária: mostrar quando cat9 = 0 e há previsão do mês anterior
                            const cat9Real = cats[8]; // índice 8 = cat9
                            const temPrevisaoRecorrencia = cat9DiarioPrevisto > 0 && cat9Real === 0 && !ehMesFuturoEmp;
                            // Calcular o dia da semana para a data do lançamento
                            const dataLancamento = new Date(ano, mes - 1, parseInt(dia));
                            const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
                            const diaSemana = DIAS_SEMANA[dataLancamento.getDay()];
                            const isFimDeSemana = dataLancamento.getDay() === 0 || dataLancamento.getDay() === 6;
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
                                    <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                      isFuturo
                                        ? "text-amber-600/70 dark:text-amber-400/70"
                                        : isFimDeSemana
                                          ? "text-violet-500 dark:text-violet-400 bg-violet-500/10"
                                          : "text-muted-foreground"
                                    }`}>
                                      {diaSemana}
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
                                {cats.map((v: number, i: number) => {
                                  // Índice 8 = cat9 (Recorrência)
                                  const isCat9 = i === 8;
                                  const mostrarPrevisao = isCat9 && temPrevisaoRecorrencia;
                                  return (
                                    <td key={i} className="px-4 py-3 text-right text-foreground/80">
                                      {v > 0 ? (
                                        fmt(v)
                                      ) : mostrarPrevisao ? (
                                        <span
                                          title={`Previsão baseada na recorrência do mês anterior`}
                                          className="italic text-violet-400/80 dark:text-violet-300/70 text-xs"
                                        >
                                          ~{fmt(cat9DiarioPrevisto)}
                                        </span>
                                      ) : (
                                        <span className="text-muted-foreground/40">—</span>
                                      )}
                                    </td>
                                  );
                                })}
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
                          const realizados = rowsSorted.filter((r: any) => parseInt(r.data.split("-")[2]) <= diaHoje2);
                          const previstos  = rowsSorted.filter((r: any) => parseInt(r.data.split("-")[2]) >  diaHoje2);
                          const sumCats = (list: any[]) =>
                            [0,1,2,3,4,5,6,7,8].map((i) =>
                              list.reduce((s: number, r: any) => s + parseFloat([r.cat1,r.cat2,r.cat3,r.cat4,r.cat5,r.cat6,r.cat7,r.cat8,r.cat9][i] || "0"), 0)
                            );
                          const catsReal = sumCats(realizados);
                          const catsPrev = sumCats(previstos);
                          const totalReal = catsReal.reduce((a, b) => a + b, 0);
                          const totalPrev = catsPrev.reduce((a, b) => a + b, 0);
                          const hasPrev = previstos.length > 0;
                          // Recorrência prevista: dias realizados sem cat9 × valor diário previsto
                          const diasRealizadosSemDpote = realizados.filter((r: any) => parseFloat(r.cat9 || "0") === 0).length;
                          const totalRecorrenciaPrevista = cat9DiarioPrevisto * diasRealizadosSemDpote;
                          const hasRecorrenciaPrevista = totalRecorrenciaPrevista > 0;
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
                              {/* Linha Recorrência Prevista — só aparece para unidades com previsão do mês anterior */}
                              {hasRecorrenciaPrevista && (
                                <tr className="border-t border-violet-200/60 bg-violet-50/30 dark:bg-violet-500/5 dark:border-violet-500/20">
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">
                                      <span className="text-[10px]">~</span>
                                      Recorr. Prevista
                                    </span>
                                  </td>
                                  {[0,1,2,3,4,5,6,7,8].map((i) => (
                                    <td key={i} className="px-4 py-2.5 text-right text-xs italic text-violet-500/80 dark:text-violet-300/70">
                                      {i === 8 ? fmt(totalRecorrenciaPrevista) : <span className="text-muted-foreground/20">—</span>}
                                    </td>
                                  ))}
                                  <td className="px-4 py-2.5 text-right text-xs italic font-semibold text-violet-500/80 dark:text-violet-300/70">{fmt(totalRecorrenciaPrevista)}</td>
                                  {isGerente && !isRecepcionista && <td />}
                                </tr>
                              )}
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
            <div className="flex flex-wrap items-center gap-4 px-1 pt-1 pb-2">
              {faturamentosData.some((f: any) => f.sincronizadoCB === 1) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-[10px] font-semibold border border-blue-500/20">
                    <Zap className="w-2.5 h-2.5" />
                    CB
                  </span>
                  <span>Dados importados automaticamente do CashBarber</span>
                </div>
              )}
              {statsPorEmpresa.some((s) => s.cat9DiarioPrevisto > 0) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="italic text-violet-400/80 dark:text-violet-300/70 text-xs font-semibold">~R$ X.XXX</span>
                  <span>Previsão de recorrência baseada no mês anterior (não entra no faturamento)</span>
                </div>
              )}
            </div>
          </div>
        )}
        {/* METAS */}
        {activeTab === "metas" && loadingMetas && (
          <MetasSkeleton cardCount={empresasVisiveis.length || 3} />
        )}
        {activeTab === "metas" && !loadingMetas && (
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
        </TabPanel>
       </main>
      {/* Barra de navegação inferior — mobile */}
      {isAuthenticated && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabsVisiveis={tabsVisiveis}
          showFab={podeLancarFaturamento}
          onFabClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
        />
      )}
      </div>{/* end flex-1 content */}
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

      {/* Modal de Sincronização Avec */}
      {empresasData && (
        <AvecSyncModal
          open={avecSyncModalOpen}
          onOpenChange={setAvecSyncModalOpen}
          empresaSlug={empresasData.find((e) => e.tipoCategorias === "seraphine")?.slug || ""}
          mes={mes}
          ano={ano}
        />
      )}

      {/* Modal de Drill-down de Ranking por Unidade */}
      {selectedUnitForDrilldown && empresasData && (
        <UnitDrilldownModal
          open={!!selectedUnitForDrilldown}
          onOpenChange={(open) => {
            if (!open) setSelectedUnitForDrilldown(null);
          }}
          unitSlug={selectedUnitForDrilldown}
          unitName={empresasData.find((e) => e.slug === selectedUnitForDrilldown)?.nome || ""}
          unitColor={empresasData.find((e) => e.slug === selectedUnitForDrilldown)?.cor}
          mes={mes}
          ano={ano}
        />
      )}
    </div>
  );
}
