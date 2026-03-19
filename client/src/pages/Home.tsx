import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Target,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Plus,
  BarChart3,
  PieChart,
  Calendar,
  Building2,
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

const CATEGORIA_COLORS = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b"];

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function fmtK(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return fmt(value);
}

export default function Home() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano] = useState(now.getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingData, setEditingData] = useState<{
    empresa: "MORUMBI" | "MASCOTE" | "SERAPHINE";
    data: string;
  } | null>(null);
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
    const result: Record<
      string,
      { total: number; servicos: number; vendaProdutos: number; novasAssinaturas: number; recorrencia: number; dias: number }
    > = {};

    for (const emp of empresas) {
      const rows = faturamentos.filter((f) => f.empresa === emp);
      const totals = rows.reduce(
        (acc, f) => ({
          servicos: acc.servicos + parseFloat(String(f.servicos || 0)),
          vendaProdutos: acc.vendaProdutos + parseFloat(String(f.vendaProdutos || 0)),
          novasAssinaturas: acc.novasAssinaturas + parseFloat(String(f.novasAssinaturas || 0)),
          recorrencia: acc.recorrencia + parseFloat(String(f.recorrencia || 0)),
        }),
        { servicos: 0, vendaProdutos: 0, novasAssinaturas: 0, recorrencia: 0 }
      );
      const total = totals.servicos + totals.vendaProdutos + totals.novasAssinaturas + totals.recorrencia;
      result[emp] = { ...totals, total, dias: rows.length };
    }
    return result;
  }, [faturamentos]);

  const grandTotal = Object.values(stats).reduce((s, e) => s + e.total, 0);

  const metas = useMemo(() => {
    const map: Record<string, number> = {
      MORUMBI: 0,
      MASCOTE: 0,
      SERAPHINE: 0,
    };
    for (const m of metasData) {
      map[m.empresa] = parseFloat(String(m.metaMensal || 0));
    }
    return map;
  }, [metasData]);

  const metaTotal = Object.values(metas).reduce((s, v) => s + v, 0);

  // Dias no mês e dias úteis passados
  const diasNoMes = new Date(ano, mes, 0).getDate();
  const diaAtual = mes === now.getMonth() + 1 && ano === now.getFullYear() ? now.getDate() : diasNoMes;
  const metaDiaria = metaTotal > 0 ? metaTotal / diasNoMes : 0;
  const mediaRealizada = diaAtual > 0 ? grandTotal / diaAtual : 0;

  // Projeção para o fim do mês
  const projecao = mediaRealizada * diasNoMes;
  const progressoPercent = metaTotal > 0 ? Math.min((grandTotal / metaTotal) * 100, 100) : 0;

  // ─── Dados para gráficos ─────────────────────────────────────────────────
  const barDataEmpresas = ["MORUMBI", "MASCOTE", "SERAPHINE"].map((emp) => ({
    empresa: emp.charAt(0) + emp.slice(1).toLowerCase(),
    Serviços: stats[emp]?.servicos || 0,
    Produtos: stats[emp]?.vendaProdutos || 0,
    "N. Assinaturas": stats[emp]?.novasAssinaturas || 0,
    Recorrência: stats[emp]?.recorrencia || 0,
  }));

  const pieDataEmpresas = ["MORUMBI", "MASCOTE", "SERAPHINE"]
    .filter((emp) => (stats[emp]?.total || 0) > 0)
    .map((emp) => ({
      name: emp.charAt(0) + emp.slice(1).toLowerCase(),
      value: stats[emp]?.total || 0,
      color: EMPRESA_COLORS[emp],
    }));

  const pieDataCategorias = [
    { name: "Serviços", value: Object.values(stats).reduce((s, e) => s + e.servicos, 0) },
    { name: "Produtos", value: Object.values(stats).reduce((s, e) => s + e.vendaProdutos, 0) },
    { name: "N. Assinaturas", value: Object.values(stats).reduce((s, e) => s + e.novasAssinaturas, 0) },
    { name: "Recorrência", value: Object.values(stats).reduce((s, e) => s + e.recorrencia, 0) },
  ].filter((d) => d.value > 0);

  // ─── Alertas ─────────────────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const list: Array<{ type: "success" | "warning" | "info"; title: string; msg: string }> = [];

    if (metaTotal === 0) {
      list.push({ type: "info", title: "Configure suas metas", msg: "Acesse a aba Metas para definir os valores mensais por empresa." });
      return list;
    }

    if (mediaRealizada >= metaDiaria) {
      list.push({ type: "success", title: "No caminho certo!", msg: `Média diária de ${fmt(mediaRealizada)} está acima da meta de ${fmt(metaDiaria)}/dia.` });
    } else {
      const deficit = metaDiaria - mediaRealizada;
      list.push({ type: "warning", title: "Abaixo da meta diária", msg: `Precisa melhorar ${fmt(deficit)}/dia para atingir a meta mensal.` });
    }

    if (projecao >= metaTotal) {
      list.push({ type: "success", title: "Projeção positiva", msg: `Projeção de ${fmt(projecao)} para o mês supera a meta de ${fmt(metaTotal)}.` });
    } else {
      list.push({ type: "warning", title: "Projeção abaixo da meta", msg: `Projeção de ${fmt(projecao)} está ${fmt(metaTotal - projecao)} abaixo da meta.` });
    }

    for (const emp of ["MORUMBI", "MASCOTE", "SERAPHINE"] as const) {
      const metaEmp = metas[emp];
      const realEmp = stats[emp]?.total || 0;
      if (metaEmp > 0 && realEmp >= metaEmp) {
        list.push({ type: "success", title: `${emp}: Meta atingida!`, msg: `Faturamento de ${fmt(realEmp)} superou a meta de ${fmt(metaEmp)}.` });
      }
    }

    return list;
  }, [metaTotal, metaDiaria, mediaRealizada, projecao, metas, stats]);

  // ─── Datas únicas com lançamentos ────────────────────────────────────────
  const datasComLancamentos = useMemo(() => {
    const set = new Set(faturamentos.map((f) => f.data as unknown as string));
    return Array.from(set).sort().reverse();
  }, [faturamentos]);

  const mesLabel = MESES.find((m) => m.value === mes)?.label || "";

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
                <p className="text-xs text-slate-500">Gestão de Metas Mensais</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm font-medium text-slate-700">{mesLabel} {ano}</span>
              </div>
              <Button
                onClick={() => { setShowForm(true); setEditingData(null); }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl"
                size="sm"
              >
                <Plus className="w-4 h-4" />
                Novo Lançamento
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Seletor de Mês */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
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
        </div>

        {/* Tabs de navegação */}
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
            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-blue-500 to-blue-700 text-white rounded-2xl">
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wide">Faturado no Mês</p>
                <p className="text-2xl font-bold mt-1">{fmtK(grandTotal)}</p>
                <p className="text-blue-200 text-xs mt-1">{diaAtual} dias lançados</p>
              </Card>
              <Card className="p-5 border-0 shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 text-white rounded-2xl">
                <p className="text-slate-300 text-xs font-medium uppercase tracking-wide">Meta Mensal</p>
                <p className="text-2xl font-bold mt-1">{fmtK(metaTotal)}</p>
                <p className="text-slate-400 text-xs mt-1">{diasNoMes} dias no mês</p>
              </Card>
              <Card className="p-5 border-0 shadow-sm bg-white rounded-2xl border border-slate-100">
                <p className="text-slate-500 text-xs font-medium uppercase tracking-wide">Média Diária Real</p>
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

            {/* Barra de Progresso */}
            {metaTotal > 0 && (
              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Progresso da Meta Mensal</h3>
                    <p className="text-sm text-slate-500">{mesLabel} {ano}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${progressoPercent >= 100 ? "text-emerald-600" : progressoPercent >= 70 ? "text-blue-600" : "text-orange-500"}`}>
                      {progressoPercent.toFixed(1)}%
                    </span>
                    <p className="text-xs text-slate-500">{fmt(grandTotal)} / {fmt(metaTotal)}</p>
                  </div>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      progressoPercent >= 100 ? "bg-gradient-to-r from-emerald-400 to-emerald-600" :
                      progressoPercent >= 70 ? "bg-gradient-to-r from-blue-400 to-blue-600" :
                      "bg-gradient-to-r from-orange-400 to-orange-600"
                    }`}
                    style={{ width: `${Math.min(progressoPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-400">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </Card>
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
                  ) : a.type === "warning" ? (
                    <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
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
              {(["MORUMBI", "MASCOTE", "SERAPHINE"] as const).map((emp) => {
                const s = stats[emp] || { total: 0, servicos: 0, vendaProdutos: 0, novasAssinaturas: 0, recorrencia: 0, dias: 0 };
                const metaEmp = metas[emp] || 0;
                const pct = metaEmp > 0 ? Math.min((s.total / metaEmp) * 100, 100) : 0;
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
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: EMPRESA_COLORS[emp] }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{pct.toFixed(1)}% da meta de {fmt(metaEmp)}</p>
                      </>
                    )}
                    <div className="mt-3 space-y-1 text-xs text-slate-600">
                      <div className="flex justify-between"><span>Serviços</span><span className="font-medium">{fmt(s.servicos)}</span></div>
                      <div className="flex justify-between"><span>Produtos</span><span className="font-medium">{fmt(s.vendaProdutos)}</span></div>
                      <div className="flex justify-between"><span>N. Assinaturas</span><span className="font-medium">{fmt(s.novasAssinaturas)}</span></div>
                      <div className="flex justify-between"><span>Recorrência</span><span className="font-medium">{fmt(s.recorrencia)}</span></div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Gráfico de Barras */}
              <Card className="lg:col-span-2 p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" /> Faturamento por Empresa e Categoria
                </h3>
                {faturamentos.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    Nenhum dado lançado para {mesLabel}
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={barDataEmpresas} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="empresa" tick={{ fontSize: 12, fill: "#64748b" }} />
                      <YAxis tickFormatter={(v) => fmtK(v)} tick={{ fontSize: 11, fill: "#94a3b8" }} />
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="Serviços" stackId="a" fill={CATEGORIA_COLORS[0]} radius={[0, 0, 0, 0]} />
                      <Bar dataKey="Produtos" stackId="a" fill={CATEGORIA_COLORS[1]} />
                      <Bar dataKey="N. Assinaturas" stackId="a" fill={CATEGORIA_COLORS[2]} />
                      <Bar dataKey="Recorrência" stackId="a" fill={CATEGORIA_COLORS[3]} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              {/* Gráfico de Pizza */}
              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-blue-600" /> Composição por Empresa
                </h3>
                {pieDataEmpresas.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                    Sem dados para exibir
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPie>
                        <Pie data={pieDataEmpresas} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieDataEmpresas.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
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

            {/* Gráfico de Pizza por Categoria */}
            {pieDataCategorias.length > 0 && (
              <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-600" /> Composição por Categoria de Receita
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={pieDataCategorias} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                        {pieDataCategorias.map((_, i) => (
                          <Cell key={i} fill={CATEGORIA_COLORS[i % CATEGORIA_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center space-y-3">
                    {pieDataCategorias.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: CATEGORIA_COLORS[i % CATEGORIA_COLORS.length] }} />
                          <span className="text-sm text-slate-600">{d.name}</span>
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
              <Button
                onClick={() => { setShowForm(true); setEditingData(null); }}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl"
                size="sm"
              >
                <Plus className="w-4 h-4" /> Novo Lançamento
              </Button>
            </div>

            {datasComLancamentos.length === 0 ? (
              <Card className="p-12 border-0 shadow-sm rounded-2xl bg-white text-center">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Nenhum lançamento em {mesLabel}</h3>
                <p className="text-slate-500 text-sm mb-4">Comece adicionando os faturamentos diários das empresas.</p>
                <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  <Plus className="w-4 h-4 mr-2" /> Primeiro Lançamento
                </Button>
              </Card>
            ) : (
              datasComLancamentos.map((data) => {
                const rowsNaData = faturamentos.filter((f) => (f.data as unknown as string) === data);
                const [, , dia] = data.split("-");
                const dataFormatada = new Date(data + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
                const totalDia = rowsNaData.reduce((s, f) => s + parseFloat(String(f.servicos || 0)) + parseFloat(String(f.vendaProdutos || 0)) + parseFloat(String(f.novasAssinaturas || 0)) + parseFloat(String(f.recorrencia || 0)), 0);

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
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs rounded-lg"
                          onClick={() => {
                            setEditingData({ empresa: "MORUMBI", data });
                            setShowForm(true);
                          }}
                        >
                          Editar
                        </Button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serviços</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Produtos</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">N. Assin.</th>
                            <th className="text-right py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Recorrência</th>
                            <th className="text-right py-2.5 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rowsNaData.map((row) => {
                            const total = parseFloat(String(row.servicos || 0)) + parseFloat(String(row.vendaProdutos || 0)) + parseFloat(String(row.novasAssinaturas || 0)) + parseFloat(String(row.recorrencia || 0));
                            return (
                              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                <td className="py-3 px-5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: EMPRESA_COLORS[row.empresa] }} />
                                    <span className="font-medium text-slate-800">{row.empresa.charAt(0) + row.empresa.slice(1).toLowerCase()}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right text-slate-700">{fmt(parseFloat(String(row.servicos || 0)))}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{fmt(parseFloat(String(row.vendaProdutos || 0)))}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{fmt(parseFloat(String(row.novasAssinaturas || 0)))}</td>
                                <td className="py-3 px-4 text-right text-slate-700">{fmt(parseFloat(String(row.recorrencia || 0)))}</td>
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
          <MetaConfig mes={mes} ano={ano} mesLabel={mesLabel} metasData={metasData} onSaved={refetchMetas} />
        )}
      </main>

      {/* Modal de Lançamento */}
      {showForm && (
        <FaturamentoForm
          mes={mes}
          ano={ano}
          initialData={editingData}
          existingData={faturamentos}
          onClose={() => setShowForm(false)}
          onSaved={() => { refetchFat(); setShowForm(false); }}
        />
      )}
    </div>
  );
}
