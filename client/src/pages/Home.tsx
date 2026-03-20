import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Target, Calendar, Plus, AlertCircle,
  CheckCircle2, Clock, Building2, Users, Loader2, LogIn, LogOut, Shield,
} from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import FaturamentoForm from "@/components/FaturamentoForm";
import MetaConfig from "@/components/MetaConfig";
import AdminUsers from "@/pages/AdminUsers";
import Empresas from "@/pages/Empresas";
import Auditoria from "@/pages/Auditoria";
import Bonificacao from "@/pages/Bonificacao";
import SuperAdmin from "@/pages/SuperAdmin";

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

type Tab = "dashboard" | "lancamentos" | "metas" | "bonificacao" | "usuarios" | "empresas" | "auditoria";

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
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano] = useState(hoje.getFullYear());
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [showFaturamentoForm, setShowFaturamentoForm] = useState(false);
  const [editingFaturamento, setEditingFaturamento] = useState<any>(null);
  const [showSuperAdmin, setShowSuperAdmin] = useState(false);

  const isAdmin = user?.role === "admin";
  const isGerente = user?.perfil === "gerente" || isAdmin;
  const empresaVinculada = user?.empresaVinculada ?? null;
  // Super-admin: utilizador sem tenantId é o owner do sistema
  const isSuperAdmin = isAdmin && !(user as any)?.tenantId;

  // Queries
  const { data: empresasData = [], isLoading: loadingEmpresas } = trpc.empresa.listar.useQuery();
  const { data: faturamentosData = [], isLoading: loadingFat, refetch: refetchFat } =
    trpc.faturamento.listar.useQuery({ mes, ano });
  const { data: metasData = [], isLoading: loadingMetas, refetch: refetchMetas } =
    trpc.meta.listar.useQuery({ mes, ano });
  // Empresas do utilizador (múltiplas unidades)
  const { data: userEmpresasSlugs = [] } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user && !isAdmin }
  );

  const deletarFat = trpc.faturamento.excluir.useMutation();

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

  // Calcular totais por empresa
  const statsPorEmpresa = useMemo(() => {
    return empresasVisiveis.map((emp) => {
      const rows = faturamentosData.filter((f: any) => f.empresaSlug === emp.slug);
      const total = rows.reduce((s: number, r: any) => {
        return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
          .reduce((acc: number, v: any) => acc + parseFloat(v || "0"), 0);
      }, 0);
      const diasLancados = rows.length;
      const mediaDiaria = diasLancados > 0 ? total / diasLancados : 0;

      const meta = metasData.find((m: any) => m.empresaSlug === emp.slug);
      const metaMensal = parseFloat(String(meta?.metaMensal || "0"));
      const metaQuinzenal = parseFloat(String(meta?.metaQuinzenal || "0"));
      const diasUteis = meta?.diasUteis ?? 26;
      const diasUteisQuinzenal = meta?.diasUteisQuinzenal ?? 13;
      const metaDiariaMensal = diasUteis > 0 ? metaMensal / diasUteis : 0;
      const metaDiariaQuinzenal = diasUteisQuinzenal > 0 ? metaQuinzenal / diasUteisQuinzenal : 0;

      // Dias úteis restantes no mês
      const rowsQuinzenal = rows.filter((r: any) => parseInt(r.data.split("-")[2]) <= 15);
      const diasLancadosQuinzenal = rowsQuinzenal.length;
      const totalQuinzenal = rowsQuinzenal.reduce((s: number, r: any) =>
        s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5].reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);

      const diasUteisRestantes = Math.max(0, diasUteis - diasLancados);
      const diasUteisRestantesQuinzenal = Math.max(0, diasUteisQuinzenal - diasLancadosQuinzenal);

      // Meta/dia dinâmica: quanto precisa fazer por dia útil restante para atingir a meta
      const faltaMensal = Math.max(0, metaMensal - total);
      const metaDiariaDinamicaMensal = diasUteisRestantes > 0 ? faltaMensal / diasUteisRestantes : 0;

      const faltaQuinzenal = Math.max(0, metaQuinzenal - totalQuinzenal);
      const metaDiariaDinamicaQuinzenal = diasUteisRestantesQuinzenal > 0 ? faltaQuinzenal / diasUteisRestantesQuinzenal : 0;

      // Projeção
      const projecaoFinal = diasLancados > 0 && diasUteis > 0
        ? (total / diasLancados) * diasUteis
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
        totalQuinzenal,
        diasLancados,
        diasLancadosQuinzenal,
        mediaDiaria,
        metaMensal,
        metaQuinzenal,
        metaDiariaMensal,
        metaDiariaQuinzenal,
        metaDiariaDinamicaMensal,
        metaDiariaDinamicaQuinzenal,
        diasUteis,
        diasUteisQuinzenal,
        diasUteisRestantes,
        diasUteisRestantesQuinzenal,
        projecaoFinal,
        progressoMensal: metaMensal > 0 ? Math.min((total / metaMensal) * 100, 100) : 0,
        progressoQuinzenal: metaQuinzenal > 0 ? Math.min((totalQuinzenal / metaQuinzenal) * 100, 100) : 0,
        catTotals,
        rows,
      };
    });
  }, [empresasVisiveis, faturamentosData, metasData]);

  const totalGeral = statsPorEmpresa.reduce((s, e) => s + e.total, 0);
  const metaTotalGeral = statsPorEmpresa.reduce((s, e) => s + e.metaMensal, 0);
  const metaQuinzenalTotal = statsPorEmpresa.reduce((s, e) => s + e.metaQuinzenal, 0);

  // Dados para gráfico de barras
  const barData = useMemo(() => {
    return empresasVisiveis.map((emp) => {
      const stats = statsPorEmpresa.find((s) => s.emp.slug === emp.slug)!;
      if (!stats) return null;
      const labels = emp.tipoCategorias === "seraphine"
        ? ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"]
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">Meta Dashboard</h1>
                <p className="text-xs text-slate-500">
                  {empresaVinculada
                    ? empresasData.find((e) => e.slug === empresaVinculada)?.nome ?? empresaVinculada
                    : "Todas as Unidades"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Seletor de mês */}
              <select
                value={mes}
                onChange={(e) => setMes(Number(e.target.value))}
                className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i + 1}>{m} {ano}</option>
                ))}
              </select>
              {isSuperAdmin && (
                <button
                  onClick={() => setShowSuperAdmin(true)}
                  className="flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors font-medium"
                >
                  <Shield className="w-4 h-4" /> Super Admin
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("usuarios")}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <Users className="w-4 h-4" /> Usuários
                </button>
              )}
              {(isAdmin || isGerente) && (
                <button
                  onClick={() => setActiveTab("empresas")}
                  className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-xl hover:bg-blue-50 transition-colors"
                >
                  <Building2 className="w-4 h-4" /> Empresas
                </button>
              )}
              {isGerente && (
                <Button
                  onClick={() => { setEditingFaturamento(null); setShowFaturamentoForm(true); }}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm"
                  size="sm"
                >
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              )}
              {/* Info do usuário e logout */}
              {user && (
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-xs font-semibold text-slate-700 leading-none">{user.name ?? user.email}</span>
                    <span className="text-xs text-slate-400 leading-none mt-0.5 capitalize">{(user as any).perfil ?? user.role}</span>
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
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 py-2">
            {(["dashboard", "lancamentos", "metas", ...(isGerente ? ["bonificacao"] : [])] as Tab[]).map((tab) => {              const labels: Record<Tab, string> = {
                dashboard: "Dashboard",
                lancamentos: "Lançamentos",
                metas: "Metas",
                bonificacao: "Bonificação",
                usuarios: "Usuários",
                empresas: "Empresas",
                auditoria: "Auditoria",
              };
              const icons: Record<Tab, React.ReactNode> = {
                dashboard: <TrendingUp className="w-4 h-4" />,
                lancamentos: <Calendar className="w-4 h-4" />,
                metas: <Target className="w-4 h-4" />,
                bonificacao: <CheckCircle2 className="w-4 h-4" />,
                usuarios: <Users className="w-4 h-4" />,
                empresas: <Building2 className="w-4 h-4" />,
                auditoria: <Shield className="w-4 h-4" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {icons[tab]} {labels[tab]}
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
            {/* KPIs Gerais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Faturado no Mês</p>
                <p className="text-2xl font-bold mt-1">{fmt(totalGeral)}</p>
                <p className="text-xs opacity-70 mt-1">{faturamentosData.length} dias lançados</p>
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white">
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Meta Mensal Total</p>
                <p className="text-2xl font-bold mt-1">{fmt(metaTotalGeral)}</p>
                {metaQuinzenalTotal > 0 && (
                  <p className="text-xs opacity-70 mt-1">Quinzenal: {fmt(metaQuinzenalTotal)}</p>
                )}
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Progresso Geral</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  {metaTotalGeral > 0 ? `${pct(totalGeral, metaTotalGeral)}%` : "—"}
                </p>
                {metaTotalGeral > 0 && (
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(pct(totalGeral, metaTotalGeral), 100)}%`,
                        backgroundColor: pct(totalGeral, metaTotalGeral) >= 100 ? "#10b981" : "#3b82f6",
                      }}
                    />
                  </div>
                )}
              </Card>
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Falta para Meta</p>
                <p className={`text-2xl font-bold mt-1 ${totalGeral >= metaTotalGeral ? "text-emerald-600" : "text-slate-900"}`}>
                  {metaTotalGeral > 0
                    ? totalGeral >= metaTotalGeral
                      ? "Atingida!"
                      : fmt(metaTotalGeral - totalGeral)
                    : "—"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {metaTotalGeral > 0 && totalGeral < metaTotalGeral ? "restante" : ""}
                </p>
              </Card>
            </div>

            {/* Cards por Empresa */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statsPorEmpresa.map((s) => {
                const metaDiaAtualMensal = s.diasUteisRestantes > 0 ? s.metaDiariaDinamicaMensal : s.metaDiariaMensal;
                const metaDiaAtualQuinzenal = s.diasUteisRestantesQuinzenal > 0 ? s.metaDiariaDinamicaQuinzenal : s.metaDiariaQuinzenal;
                const menorQueMeta = s.mediaDiaria > 0 && metaDiaAtualMensal > 0 && s.mediaDiaria < metaDiaAtualMensal;
                const menorQueMetaQ = s.diasLancadosQuinzenal > 0 && metaDiaAtualQuinzenal > 0 && (s.totalQuinzenal / Math.max(s.diasLancadosQuinzenal, 1)) < metaDiaAtualQuinzenal;

                return (
                <Card key={s.emp.slug} className="p-5 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative">
                  <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: s.emp.cor }} />

                  {/* Cabeçalho */}
                  <div className="flex items-center gap-2 mb-4 mt-1">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.emp.cor + "20" }}>
                      <Building2 className="w-4 h-4" style={{ color: s.emp.cor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{s.emp.nome}</h3>
                      <p className="text-xs text-slate-400">{s.diasLancados} dias lançados</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xl font-bold text-slate-900">{fmt(s.total)}</p>
                      <p className="text-xs text-slate-400">faturado no mês</p>
                    </div>
                  </div>

                  {/* Progresso Mensal */}
                  {s.metaMensal > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500 font-medium">Meta Mensal: {fmt(s.metaMensal)}</span>
                        <span className="font-bold" style={{ color: s.emp.cor }}>{s.progressoMensal.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${s.progressoMensal}%`, backgroundColor: s.emp.cor }} />
                      </div>
                    </div>
                  )}

                  {/* Progresso Quinzenal */}
                  {s.metaQuinzenal > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-purple-500 font-medium">Meta Quinzenal: {fmt(s.metaQuinzenal)}</span>
                        <span className="font-bold text-purple-600">{s.progressoQuinzenal.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all bg-purple-400" style={{ width: `${s.progressoQuinzenal}%` }} />
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{fmt(s.totalQuinzenal)} faturados até dia 15</p>
                    </div>
                  )}

                  {/* Grid de métricas */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Média diária real */}
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-500">Média Diária Real</p>
                      <p className="text-sm font-bold text-slate-900">{fmt(s.mediaDiaria)}</p>
                    </div>

                    {/* Meta/dia mensal dinâmica */}
                    <div className={`rounded-xl p-2.5 ${menorQueMeta ? "bg-orange-50" : "bg-emerald-50"}`}>
                      <p className={`text-xs font-medium ${menorQueMeta ? "text-orange-500" : "text-emerald-600"}`}>
                        Precisa/Dia (Mensal)
                      </p>
                      <p className={`text-sm font-bold ${menorQueMeta ? "text-orange-700" : "text-emerald-700"}`}>
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
                      <div className={`rounded-xl p-2.5 ${menorQueMetaQ ? "bg-orange-50" : "bg-purple-50"}`}>
                        <p className={`text-xs font-medium ${menorQueMetaQ ? "text-orange-500" : "text-purple-500"}`}>
                          Precisa/Dia (Quinz.)
                        </p>
                        <p className={`text-sm font-bold ${menorQueMetaQ ? "text-orange-700" : "text-purple-700"}`}>
                          {metaDiaAtualQuinzenal > 0 ? fmt(metaDiaAtualQuinzenal) : "—"}
                        </p>
                        {s.diasUteisRestantesQuinzenal > 0 && (
                          <p className={`text-xs mt-0.5 ${menorQueMetaQ ? "text-orange-600" : "text-purple-400"}`}>
                            {s.diasUteisRestantesQuinzenal}d até dia 15
                          </p>
                        )}
                      </div>
                    )}

                    {/* Projeção final */}
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-xs text-slate-500">Projeção Final</p>
                      <p className={`text-sm font-bold ${s.projecaoFinal >= s.metaMensal && s.metaMensal > 0 ? "text-emerald-600" : "text-slate-900"}`}>
                        {s.projecaoFinal > 0 ? fmt(s.projecaoFinal) : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Indicador de status mensal */}
                  {s.mediaDiaria > 0 && metaDiaAtualMensal > 0 && (
                    <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl ${
                      s.mediaDiaria >= metaDiaAtualMensal
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-orange-50 text-orange-700"
                    }`}>
                      {s.mediaDiaria >= metaDiaAtualMensal
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
              <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" /> Alertas
                </h3>
                <div className="space-y-2">
                  {alertas.map((a, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-2.5 p-3 rounded-xl text-sm ${
                        a.tipo === "warning" ? "bg-orange-50 text-orange-800" :
                        a.tipo === "success" ? "bg-emerald-50 text-emerald-800" :
                        "bg-blue-50 text-blue-800"
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

            {/* Gráficos */}
            {totalGeral > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Gráfico de barras por empresa */}
                <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                  <h3 className="font-semibold text-slate-900 mb-4">Faturamento vs Meta por Empresa</h3>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={barData as any[]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="empresa" tick={{ fontSize: 11, fill: "#64748b" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => fmtFull(v)} />
                      <Bar dataKey="total" name="Faturado" radius={[4, 4, 0, 0]}>
                        {(barData as any[]).map((entry: any, index: number) => (
                          <Cell key={index} fill={entry?.cor ?? "#3b82f6"} />
                        ))}
                      </Bar>
                      <Bar dataKey="meta" name="Meta" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Gráfico de pizza por empresa */}
                <Card className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                  <h3 className="font-semibold text-slate-900 mb-4">Composição do Faturamento</h3>
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
                    <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
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
                    ? ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"]
                    : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
                  const pieData = labels
                    .map((l, i) => ({ name: l, value: s.catTotals[i] }))
                    .filter((d) => d.value > 0);
                  const COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];
                  return (
                    <Card key={s.emp.slug} className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                      <h3 className="font-semibold text-slate-900 mb-3 text-sm">{s.emp.nome} — Categorias</h3>
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
                        <div className="flex items-center justify-center h-32 text-slate-400 text-xs">Sem dados</div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}

            {totalGeral === 0 && !loading && (
              <Card className="p-10 border-0 shadow-sm rounded-2xl bg-white text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 font-medium">Nenhum lançamento em {MESES[mes - 1]} {ano}</p>
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
              <h2 className="text-lg font-semibold text-slate-900">
                Lançamentos — {MESES[mes - 1]} {ano}
              </h2>
              {isGerente && (
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
              <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white text-center">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500">Nenhum lançamento neste mês.</p>
              </Card>
            ) : (
              empresasVisiveis.map((emp) => {
                const rows = faturamentosData
                  .filter((f: any) => f.empresaSlug === emp.slug)
                  .sort((a: any, b: any) => b.data.localeCompare(a.data));
                if (rows.length === 0) return null;
                const labels = emp.tipoCategorias === "seraphine"
                  ? ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"]
                  : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
                return (
                  <Card key={emp.slug} className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: emp.cor }} />
                      <h3 className="font-semibold text-slate-900">{emp.nome}</h3>
                      <span className="ml-auto text-xs text-slate-500">{rows.length} registros</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Data</th>
                            {labels.map((l) => (
                              <th key={l} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">{l}</th>
                            ))}
                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                            {isGerente && <th className="px-4 py-2.5" />}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((row: any) => {
                            const cats = [row.cat1, row.cat2, row.cat3, row.cat4, row.cat5].map((v: any) => parseFloat(v || "0"));
                            const total = cats.reduce((a: number, b: number) => a + b, 0);
                            const [, , dia] = row.data.split("-");
                            return (
                              <tr key={row.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {parseInt(dia)}/{mes.toString().padStart(2, "0")}
                                </td>
                                {cats.map((v: number, i: number) => (
                                  <td key={i} className="px-4 py-3 text-right text-slate-700">
                                    {v > 0 ? fmt(v) : <span className="text-slate-300">—</span>}
                                  </td>
                                ))}
                                <td className="px-4 py-3 text-right font-bold text-slate-900">{fmt(total)}</td>
                                {isGerente && (
                                  <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <button
                                        onClick={() => { setEditingFaturamento({ ...row, empresaSlug: emp.slug }); setShowFaturamentoForm(true); }}
                                        className="text-xs text-blue-600 hover:underline px-2 py-1 rounded-lg hover:bg-blue-50"
                                      >
                                        Editar
                                      </button>
                                      <button
                                        onClick={() => handleDeleteFat(row.id)}
                                        className="text-xs text-red-500 hover:underline px-2 py-1 rounded-lg hover:bg-red-50"
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
      </main>

      {/* Modal de lançamento */}
      {showFaturamentoForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
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
