import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  AlertCircle,
  CheckCircle2,
  Plus,
  BarChart3,
  PieChart,
  Calendar,
  Building2,
  Shield,
  Lock,
  CalendarDays,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";
import FaturamentoForm from "@/components/FaturamentoForm";
import MetaConfig from "@/components/MetaConfig";
import { Link } from "wouter";

const MESES = [
  { label: "Janeiro", value: 1 },
  { label: "Fevereiro", value: 2 },
  { label: "Março", value: 3 },
  { label: "Abril", value: 4 },
  { label: "Maio", value: 5 },
  { label: "Junho", value: 6 },
  { label: "Julho", value: 7 },
  { label: "Agosto", value: 8 },
  { label: "Setembro", value: 9 },
  { label: "Outubro", value: 10 },
  { label: "Novembro", value: 11 },
  { label: "Dezembro", value: 12 },
];

const EMPRESA_COLORS: Record<string, string> = {
  MORUMBI: "#3b82f6",
  MASCOTE: "#a855f7",
  SERAPHINE: "#10b981",
};

const CATEGORIA_COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444"];

// Rótulos de categorias por empresa
const LABELS_MORUMBI_MASCOTE: Record<string, string> = {
  avulso: "Avulso",
  produtos: "Produtos",
  servExtra: "Serv. Extra",
  lavatorio: "Lavatório",
  recorrencia: "Recorrência",
};

const LABELS_SERAPHINE: Record<string, string> = {
  avulso: "Cabelo",
  servExtra: "Unha",
  lavatorio: "Outros",
  produtos: "Produtos",
  recorrencia: "Recorrência",
};

function getLabels(empresa: string) {
  return empresa === "SERAPHINE" ? LABELS_SERAPHINE : LABELS_MORUMBI_MASCOTE;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 }).format(value);
}

function fmtK(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return fmt(value);
}

// Calcula dias úteis (seg-sáb) num intervalo
function diasUteis(inicio: Date, fim: Date): number {
  let count = 0;
  const cur = new Date(inicio);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(fim);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0) count++; // exclui apenas domingo
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function Home() {
  const { user } = useAuth();
  const isGerente = user?.perfil === "gerente" || user?.role === "admin";
  const isAdmin = user?.role === "admin";
  const empresaVinculada = user?.empresaVinculada as string | undefined;

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState<{ empresa: "MORUMBI" | "MASCOTE" | "SERAPHINE"; data: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "lancamentos" | "metas">("dashboard");

  const { data: faturamentos = [], refetch: refetchFat } = trpc.faturamento.listar.useQuery(
    { mes, ano },
    { staleTime: 30_000 }
  );

  const { data: metasData = [], refetch: refetchMetas } = trpc.meta.listar.useQuery(
    { mes, ano },
    { staleTime: 30_000 }
  );

  // ─── Cálculos derivados ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const empresas = ["MORUMBI", "MASCOTE", "SERAPHINE"] as const;
    const result: Record<string, {
      total: number; avulso: number; produtos: number; servExtra: number;
      lavatorio: number; recorrencia: number; dias: number;
    }> = {};

    for (const emp of empresas) {
      const rows = faturamentos.filter((f) => f.empresa === emp);
      const totals = rows.reduce(
        (acc, f) => ({
          avulso: acc.avulso + parseFloat(String(f.avulso || 0)),
          produtos: acc.produtos + parseFloat(String(f.produtos || 0)),
          servExtra: acc.servExtra + parseFloat(String(f.servExtra || 0)),
          lavatorio: acc.lavatorio + parseFloat(String(f.lavatorio || 0)),
          recorrencia: acc.recorrencia + parseFloat(String(f.recorrencia || 0)),
        }),
        { avulso: 0, produtos: 0, servExtra: 0, lavatorio: 0, recorrencia: 0 }
      );
      const total = totals.avulso + totals.produtos + totals.servExtra + totals.lavatorio + totals.recorrencia;
      result[emp] = { ...totals, total, dias: rows.length };
    }
    return result;
  }, [faturamentos]);

  const grandTotal = Object.values(stats).reduce((s, e) => s + e.total, 0);

  const metas = useMemo(() => {
    const map: Record<string, { mensal: number; quinzenal: number }> = {
      MORUMBI: { mensal: 0, quinzenal: 0 },
      MASCOTE: { mensal: 0, quinzenal: 0 },
      SERAPHINE: { mensal: 0, quinzenal: 0 },
    };
    for (const m of metasData) {
      map[m.empresa] = {
        mensal: parseFloat(String(m.metaMensal || 0)),
        quinzenal: parseFloat(String(m.metaQuinzenal || 0)),
      };
    }
    return map;
  }, [metasData]);

  const metaTotal = Object.values(metas).reduce((s, v) => s + v.mensal, 0);
  const metaQuinzenalTotal = Object.values(metas).reduce((s, v) => s + v.quinzenal, 0);

  // Dias no mês e dia atual
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diaAtual = mes === now.getMonth() + 1 && ano === now.getFullYear() ? now.getDate() : diasNoMes;

  // Dias úteis
  const inicioMes = new Date(ano, mes - 1, 1);
  const fimMes = new Date(ano, mes - 1, diasNoMes);
  const dia15 = new Date(ano, mes - 1, 15);
  const hoje = mes === now.getMonth() + 1 && ano === now.getFullYear() ? now : fimMes;

  const diasUteisTotal = diasUteis(inicioMes, fimMes);
  const diasUteisAte15 = diasUteis(inicioMes, dia15);
  const diasUteisRestantesMes = diasUteis(hoje, fimMes);
  const diasUteisRestantesQuinzena = hoje <= dia15 ? diasUteis(hoje, dia15) : 0;
  const diasUteisPassados = diasUteis(inicioMes, hoje);

  // Médias e projeções
  const metaDiaria = diasUteisTotal > 0 ? metaTotal / diasUteisTotal : 0;
  const metaDiariaQuinzenal = diasUteisAte15 > 0 ? metaQuinzenalTotal / diasUteisAte15 : 0;
  const mediaRealizada = diasUteisPassados > 0 ? grandTotal / diasUteisPassados : 0;
  const projecao = mediaRealizada * diasUteisTotal;
  const progressoPercent = metaTotal > 0 ? Math.min((grandTotal / metaTotal) * 100, 100) : 0;

  // Faturamento quinzenal (dias 1-15)
  const totalQuinzenal = faturamentos
    .filter((f) => {
      const dia = parseInt((f.data as unknown as string).split("-")[2]);
      return dia <= 15;
    })
    .reduce((s, f) => s + parseFloat(String(f.avulso || 0)) + parseFloat(String(f.produtos || 0)) + parseFloat(String(f.servExtra || 0)) + parseFloat(String(f.lavatorio || 0)) + parseFloat(String(f.recorrencia || 0)), 0);

  const progressoQuinzenal = metaQuinzenalTotal > 0 ? Math.min((totalQuinzenal / metaQuinzenalTotal) * 100, 100) : 0;

  // ─── Dados para gráficos ─────────────────────────────────────────────────
  const empresasVisiveis = empresaVinculada
    ? [empresaVinculada]
    : ["MORUMBI", "MASCOTE", "SERAPHINE"];

  const barDataEmpresas = empresasVisiveis.map((emp) => {
    const labels = getLabels(emp);
    return {
      empresa: emp.charAt(0) + emp.slice(1).toLowerCase(),
      [labels.avulso]: stats[emp]?.avulso || 0,
      [labels.produtos]: stats[emp]?.produtos || 0,
      [labels.servExtra]: stats[emp]?.servExtra || 0,
      [labels.lavatorio]: stats[emp]?.lavatorio || 0,
      [labels.recorrencia]: stats[emp]?.recorrencia || 0,
    };
  });

  const pieDataEmpresas = empresasVisiveis
    .filter((emp) => (stats[emp]?.total || 0) > 0)
    .map((emp) => ({
      name: emp.charAt(0) + emp.slice(1).toLowerCase(),
      value: stats[emp]?.total || 0,
      color: EMPRESA_COLORS[emp],
    }));

  // Categorias agregadas (usando labels da primeira empresa visível ou genérico)
  const catKeys = ["avulso", "produtos", "servExtra", "lavatorio", "recorrencia"] as const;
  const pieDataCategorias = catKeys.map((key) => ({
    name: key,
    value: empresasVisiveis.reduce((s, emp) => s + (stats[emp]?.[key] || 0), 0),
  })).filter((d) => d.value > 0);

  // ─── Alertas ─────────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const list: Array<{ type: "success" | "warning" | "info"; title: string; msg: string }> = [];

    if (metaTotal === 0) {
      list.push({ type: "info", title: "Configure suas metas", msg: "Acesse a aba Metas para definir os valores mensais e quinzenais por empresa." });
      return list;
    }

    // Progresso diário
    if (mediaRealizada >= metaDiaria) {
      list.push({ type: "success", title: "No caminho certo!", msg: `Média de ${fmt(mediaRealizada)}/dia útil está acima da meta de ${fmt(metaDiaria)}/dia.` });
    } else {
      const deficit = metaDiaria - mediaRealizada;
      const necessario = diasUteisRestantesMes > 0 ? (metaTotal - grandTotal) / diasUteisRestantesMes : 0;
      list.push({ type: "warning", title: "Abaixo da média diária", msg: `Precisa de ${fmt(necessario)}/dia nos ${diasUteisRestantesMes} dias úteis restantes para atingir a meta.` });
    }

    // Projeção mensal
    if (projecao >= metaTotal) {
      list.push({ type: "success", title: "Projeção mensal positiva", msg: `Projeção de ${fmt(projecao)} supera a meta de ${fmt(metaTotal)}.` });
    } else {
      list.push({ type: "warning", title: "Projeção abaixo da meta", msg: `Projeção de ${fmt(projecao)} está ${fmt(metaTotal - projecao)} abaixo da meta mensal.` });
    }

    // Quinzenal
    if (metaQuinzenalTotal > 0 && hoje <= dia15) {
      if (totalQuinzenal >= metaQuinzenalTotal) {
        list.push({ type: "success", title: "Meta quinzenal atingida!", msg: `${fmt(totalQuinzenal)} superou a meta de ${fmt(metaQuinzenalTotal)}.` });
      } else {
        const necQ = diasUteisRestantesQuinzena > 0 ? (metaQuinzenalTotal - totalQuinzenal) / diasUteisRestantesQuinzena : 0;
        list.push({ type: "warning", title: "Meta quinzenal em risco", msg: `Precisa de ${fmt(necQ)}/dia nos ${diasUteisRestantesQuinzena} dias úteis restantes até o dia 15.` });
      }
    }

    return list;
  }, [metaTotal, metaQuinzenalTotal, metaDiaria, mediaRealizada, projecao, grandTotal, totalQuinzenal, diasUteisRestantesMes, diasUteisRestantesQuinzena, hoje, dia15]);

  // ─── Datas com lançamentos ────────────────────────────────────────────────
  const datasComLancamentos = useMemo(() => {
    const set = new Set(faturamentos.map((f) => f.data as unknown as string));
    return Array.from(set).sort().reverse();
  }, [faturamentos]);

  const mesLabel = MESES.find((m) => m.value === mes)?.label || "";

  // Rótulos de categorias para o gráfico de pizza (usa labels da empresa visível ou genérico)
  const getCatLabel = (key: string) => {
    if (empresasVisiveis.length === 1) {
      return getLabels(empresasVisiveis[0])[key] || key;
    }
    return { avulso: "Avulso/Cabelo", produtos: "Produtos", servExtra: "Serv.Extra/Unha", lavatorio: "Lavatório/Outros", recorrencia: "Recorrência" }[key] || key;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-md">
                <Target className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Meta Dashboard</h1>
                <p className="text-xs text-slate-500">
                  {empresaVinculada
                    ? `${empresaVinculada.charAt(0) + empresaVinculada.slice(1).toLowerCase()} · ${user?.perfil || "operador"}`
                    : "Todas as Unidades"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{mesLabel} {ano}</span>
              </div>
              {isAdmin && (
                <Link href="/admin/usuarios">
                  <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-slate-200">
                    <Shield className="w-4 h-4" /> Usuários
                  </Button>
                </Link>
              )}
              {isGerente ? (
                <Button
                  onClick={() => { setShowForm(true); setEditingData(null); }}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl"
                  size="sm"
                >
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              ) : (
                <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <Lock className="w-3.5 h-3.5" /> Somente leitura
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Seletor de Mês */}
        <div className="mb-6 flex gap-2 flex-wrap">
          {MESES.map((m) => (
            <button
              key={m.value}
              onClick={() => setMes(m.value)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mes === m.value
                  ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                  : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mb-6">
          <TabsList className="bg-white border border-slate-200 rounded-xl p-1">
            <TabsTrigger value="dashboard" className="rounded-lg gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="lancamentos" className="rounded-lg gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Building2 className="w-4 h-4" /> Lançamentos
            </TabsTrigger>
            <TabsTrigger value="metas" className="rounded-lg gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              <Target className="w-4 h-4" /> Metas
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ─── DASHBOARD ─────────────────────────────────────────────────── */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            {/* KPIs principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Faturado no Mês</p>
                <p className="text-2xl font-bold mt-1">{fmtK(grandTotal)}</p>
                <p className="text-blue-200 text-xs mt-1">{datasComLancamentos.length} dias lançados</p>
              </Card>
              <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl">
                <p className="text-slate-300 text-xs font-medium uppercase tracking-wide">Meta Mensal</p>
                <p className="text-2xl font-bold mt-1">{fmtK(metaTotal)}</p>
                <p className="text-slate-400 text-xs mt-1">{diasUteisTotal} dias úteis</p>
              </Card>
              <Card className="p-5 border-0 shadow-sm bg-white rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Média/Dia Útil</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">{fmtK(mediaRealizada)}</p>
                <p className={`text-xs mt-1 font-medium ${mediaRealizada >= metaDiaria ? "text-emerald-600" : "text-orange-500"}`}>
                  Meta: {fmtK(metaDiaria)}/dia
                </p>
              </Card>
              <Card className="p-5 border-0 shadow-sm bg-white rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Projeção Final</p>
                <p className="text-2xl font-bold mt-1 text-slate-900">{fmtK(projecao)}</p>
                <p className={`text-xs mt-1 font-medium ${projecao >= metaTotal ? "text-emerald-600" : "text-orange-500"}`}>
                  {projecao >= metaTotal ? "Acima da meta" : `Falta ${fmtK(metaTotal - projecao)}`}
                </p>
              </Card>
            </div>

            {/* Dias Úteis */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dias úteis no mês</p>
                  <p className="text-xl font-bold text-slate-900">{diasUteisTotal}</p>
                </div>
              </Card>
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Dias úteis passados</p>
                  <p className="text-xl font-bold text-slate-900">{diasUteisPassados}</p>
                </div>
              </Card>
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Restantes no mês</p>
                  <p className="text-xl font-bold text-slate-900">{diasUteisRestantesMes}</p>
                </div>
              </Card>
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500">Restantes até dia 15</p>
                  <p className="text-xl font-bold text-slate-900">{diasUteisRestantesQuinzena}</p>
                </div>
              </Card>
            </div>

            {/* Barras de progresso */}
            {metaTotal > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Progresso Mensal */}
                <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">Meta Mensal</h3>
                      <p className="text-xs text-slate-500">{mesLabel} {ano}</p>
                    </div>
                    <span className={`text-2xl font-bold ${progressoPercent >= 100 ? "text-emerald-600" : progressoPercent >= 70 ? "text-blue-600" : "text-orange-500"}`}>
                      {progressoPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        progressoPercent >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" :
                        progressoPercent >= 70 ? "bg-gradient-to-r from-blue-400 to-blue-600" :
                        "bg-gradient-to-r from-orange-400 to-orange-600"
                      }`}
                      style={{ width: `${Math.min(progressoPercent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>{fmt(grandTotal)}</span>
                    <span>Meta: {fmt(metaTotal)}</span>
                  </div>
                </Card>

                {/* Progresso Quinzenal */}
                {metaQuinzenalTotal > 0 && (
                  <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">Meta Quinzenal</h3>
                        <p className="text-xs text-slate-500">Dias 1–15 de {mesLabel}</p>
                      </div>
                      <span className={`text-2xl font-bold ${progressoQuinzenal >= 100 ? "text-emerald-600" : progressoQuinzenal >= 70 ? "text-purple-600" : "text-orange-500"}`}>
                        {progressoQuinzenal.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          progressoQuinzenal >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" :
                          progressoQuinzenal >= 70 ? "bg-gradient-to-r from-purple-400 to-purple-600" :
                          "bg-gradient-to-r from-orange-400 to-orange-600"
                        }`}
                        style={{ width: `${Math.min(progressoQuinzenal, 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-2 text-xs text-slate-500">
                      <span>{fmt(totalQuinzenal)}</span>
                      <span>Meta: {fmt(metaQuinzenalTotal)}</span>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Alertas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertas.map((a, i) => (
                <Card
                  key={i}
                  className={`p-4 border-0 shadow-sm rounded-2xl flex items-start gap-3 ${
                    a.type === "success" ? "bg-emerald-50" : a.type === "warning" ? "bg-orange-50" : "bg-blue-50"
                  }`}
                >
                  {a.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${a.type === "warning" ? "text-orange-500" : "text-blue-500"}`} />
                  )}
                  <div>
                    <p className={`font-semibold text-sm ${a.type === "success" ? "text-emerald-800" : a.type === "warning" ? "text-orange-800" : "text-blue-800"}`}>
                      {a.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${a.type === "success" ? "text-emerald-700" : a.type === "warning" ? "text-orange-700" : "text-blue-700"}`}>
                      {a.msg}
                    </p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Cards por empresa */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {empresasVisiveis.map((emp) => {
                const s = stats[emp] || { total: 0, avulso: 0, produtos: 0, servExtra: 0, lavatorio: 0, recorrencia: 0, dias: 0 };
                const metaEmp = metas[emp]?.mensal || 0;
                const metaQEmp = metas[emp]?.quinzenal || 0;
                const pct = metaEmp > 0 ? Math.min((s.total / metaEmp) * 100, 100) : 0;
                const labels = getLabels(emp);

                return (
                  <Card key={emp} className="p-5 border-0 shadow-sm rounded-2xl bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: EMPRESA_COLORS[emp] }} />
                        <h3 className="font-semibold text-slate-900">{emp.charAt(0) + emp.slice(1).toLowerCase()}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">{s.dias} dias</Badge>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mb-1">{fmt(s.total)}</p>
                    {metaEmp > 0 && (
                      <>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: EMPRESA_COLORS[emp] }} />
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{pct.toFixed(1)}% da meta mensal {fmt(metaEmp)}</p>
                      </>
                    )}
                    {metaQEmp > 0 && (
                      <p className="text-xs text-purple-600 font-medium mb-2">Meta quinzenal: {fmt(metaQEmp)}</p>
                    )}
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between"><span>{labels.avulso}</span><span className="font-medium">{fmt(s.avulso)}</span></div>
                      <div className="flex justify-between"><span>{labels.produtos}</span><span className="font-medium">{fmt(s.produtos)}</span></div>
                      <div className="flex justify-between"><span>{labels.servExtra}</span><span className="font-medium">{fmt(s.servExtra)}</span></div>
                      <div className="flex justify-between"><span>{labels.lavatorio}</span><span className="font-medium">{fmt(s.lavatorio)}</span></div>
                      <div className="flex justify-between"><span>{labels.recorrencia}</span><span className="font-medium">{fmt(s.recorrencia)}</span></div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Faturamento por Empresa e Categoria
                </h3>
                {faturamentos.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Nenhum dado lançado para {mesLabel}</div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barDataEmpresas} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="empresa" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      {Object.keys(barDataEmpresas[0] || {}).filter(k => k !== "empresa").map((key, i) => (
                        <Bar key={key} dataKey={key} stackId="a" fill={CATEGORIA_COLORS[i % CATEGORIA_COLORS.length]}
                          radius={i === Object.keys(barDataEmpresas[0] || {}).filter(k => k !== "empresa").length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" /> Composição por Empresa
                </h3>
                {pieDataEmpresas.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPie>
                        <Pie data={pieDataEmpresas} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieDataEmpresas.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="space-y-2 mt-2">
                      {pieDataEmpresas.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                            <span className="text-slate-600">{d.name}</span>
                          </div>
                          <span className="font-semibold text-slate-900">{grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(1) : 0}%</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </div>

            {/* Pizza por categoria */}
            {pieDataCategorias.length > 0 && (
              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" /> Composição por Categoria de Receita
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={pieDataCategorias} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieDataCategorias.map((_, i) => <Cell key={i} fill={CATEGORIA_COLORS[i % CATEGORIA_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center space-y-3">
                    {pieDataCategorias.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORIA_COLORS[i % CATEGORIA_COLORS.length] }} />
                          <span className="text-sm text-slate-600">{getCatLabel(d.name)}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{fmt(d.value)}</p>
                          <p className="text-xs text-slate-400">{grandTotal > 0 ? ((d.value / grandTotal) * 100).toFixed(1) : 0}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ─── LANÇAMENTOS ──────────────────────────────────────────────── */}
        {activeTab === "lancamentos" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Lançamentos de {mesLabel} {ano}</h2>
              {isGerente && (
                <Button onClick={() => { setShowForm(true); setEditingData(null); }} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl" size="sm">
                  <Plus className="w-4 h-4" /> Novo Lançamento
                </Button>
              )}
            </div>

            {datasComLancamentos.length === 0 ? (
              <Card className="p-12 border-0 shadow-sm rounded-2xl bg-white text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Nenhum lançamento em {mesLabel}</h3>
                <p className="text-slate-500 text-sm mb-4">Comece adicionando os faturamentos diários das empresas.</p>
                {isGerente && (
                  <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                    <Plus className="w-4 h-4 mr-2" /> Primeiro Lançamento
                  </Button>
                )}
              </Card>
            ) : (
              datasComLancamentos.map((data) => {
                const rowsNaData = faturamentos.filter((f) => (f.data as unknown as string) === data);
                const [, , dia] = data.split("-");
                const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                const totalDia = rowsNaData.reduce((s, f) =>
                  s + parseFloat(String(f.avulso || 0)) + parseFloat(String(f.produtos || 0)) + parseFloat(String(f.servExtra || 0)) + parseFloat(String(f.lavatorio || 0)) + parseFloat(String(f.recorrencia || 0)), 0);

                return (
                  <Card key={data} className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-700">{dia}</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 capitalize">{dataFormatada}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">{fmt(totalDia)}</span>
                        {isGerente && (
                          <Button size="sm" variant="outline" className="text-xs rounded-lg"
                            onClick={() => { setEditingData({ empresa: rowsNaData[0]?.empresa as any, data }); setShowForm(true); }}>
                            Editar
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Avulso/Cabelo</th>
                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Produtos</th>
                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serv.Extra/Unha</th>
                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Lav./Outros</th>
                            <th className="text-right py-2.5 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recorrência</th>
                            <th className="text-right py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rowsNaData.map((row) => {
                            const total = parseFloat(String(row.avulso || 0)) + parseFloat(String(row.produtos || 0)) + parseFloat(String(row.servExtra || 0)) + parseFloat(String(row.lavatorio || 0)) + parseFloat(String(row.recorrencia || 0));
                            return (
                              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMPRESA_COLORS[row.empresa] }} />
                                    <span className="font-medium text-slate-800">{row.empresa.charAt(0) + row.empresa.slice(1).toLowerCase()}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right text-slate-700">{fmt(parseFloat(String(row.avulso || 0)))}</td>
                                <td className="py-3 px-3 text-right text-slate-700">{fmt(parseFloat(String(row.produtos || 0)))}</td>
                                <td className="py-3 px-3 text-right text-slate-700">{fmt(parseFloat(String(row.servExtra || 0)))}</td>
                                <td className="py-3 px-3 text-right text-slate-700">{fmt(parseFloat(String(row.lavatorio || 0)))}</td>
                                <td className="py-3 px-3 text-right text-slate-700">{fmt(parseFloat(String(row.recorrencia || 0)))}</td>
                                <td className="py-3 px-5 text-right font-bold text-slate-900">{fmt(total)}</td>
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

        {/* ─── METAS ────────────────────────────────────────────────────── */}
        {activeTab === "metas" && (
          <MetaConfig mes={mes} ano={ano} mesLabel={mesLabel} metasData={metasData} onSaved={refetchMetas} empresaVinculada={empresaVinculada} isGerente={isGerente} />
        )}
      </main>

      {/* Modal de Lançamento */}
      {showForm && (
        <FaturamentoForm
          mes={mes}
          ano={ano}
          initialData={editingData}
          existingData={faturamentos as any}
          onClose={() => setShowForm(false)}
          onSaved={() => { refetchFat(); setShowForm(false); }}
        />
      )}
    </div>
  );
}
