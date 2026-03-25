import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Loader2, Repeat2, Award, Hash, TrendingUp, ArrowDownToLine, CheckCircle2, PencilLine, AlertCircle } from "lucide-react";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

// Paleta de cores por filial
const CORES_FILIAL = [
  "#8b5cf6", // violeta
  "#06b6d4", // ciano
  "#f59e0b", // âmbar
  "#10b981", // esmeralda
  "#f43f5e", // rosa
  "#3b82f6", // azul
];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
}
function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function fmtNum(v: number) {
  return new Intl.NumberFormat("pt-BR").format(v);
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { valorDistribuido: number; fichas: number } }>;
}

function CustomPieTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-slate-900 border border-violet-500/30 rounded-xl px-3 py-2.5 shadow-xl text-xs">
      <p className="font-semibold text-violet-300 mb-1">{d.name}</p>
      <p className="text-white">Faturamento: <span className="font-bold">{fmtFull(d.payload.valorDistribuido)}</span></p>
      <p className="text-violet-200/70">Fichas: {fmtNum(d.payload.fichas)}</p>
      <p className="text-violet-200/70">Proporção: {d.value.toFixed(1)}%</p>
    </div>
  );
}

// Estado de ajuste manual por empresa
interface AjusteState {
  valor: string;
  operacao: "substituir" | "somar";
}

export default function DpoteDistribuicao() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano] = useState(hoje.getFullYear());
  const [ajustes, setAjustes] = useState<Record<string, AjusteState>>({});
  const [ajusteAberto, setAjusteAberto] = useState<string | null>(null);

  const { data, isLoading, error, refetch, isFetching } = trpc.cashbarber.dpoteDistribuicao.useQuery(
    { mes, ano },
    { enabled: true, staleTime: 5 * 60 * 1000 }
  );

  const utils = trpc.useUtils();

  // Mutation de ajuste manual por empresa
  const ajustarMutation = trpc.cashbarber.ajustarCat5Empresa.useMutation({
    onSuccess: (resultado) => {
      utils.faturamento.listar.invalidate();
      const op = resultado.operacao === "somar" ? "somado" : "substituído";
      toast.success(`Recorrência ${op} com sucesso!`, {
        description: `${resultado.empresaSlug}: ${fmtFull(resultado.cat5Anterior)} → ${fmtFull(resultado.cat5Novo)}`,
        duration: 5000,
      });
      setAjusteAberto(null);
    },
    onError: (err) => {
      toast.error("Erro ao ajustar Recorrência", { description: err.message });
    },
  });

  const aplicarMutation = trpc.cashbarber.aplicarDpoteNoFaturamento.useMutation({
    onSuccess: (resultado) => {
      utils.faturamento.listar.invalidate();
      const linhas = resultado.aplicados.map(
        (a) => `${a.filialNome}: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(a.valorDistribuido)}`
      ).join(" · ");
      const avisos = resultado.naoEncontrados.length > 0
        ? ` (não encontrado: ${resultado.naoEncontrados.join(", ")})`
        : "";
      toast.success("Dpote aplicado ao dashboard!", {
        description: linhas + avisos,
        duration: 6000,
      });
    },
    onError: (err) => {
      toast.error("Erro ao aplicar Dpote", {
        description: err.message,
      });
    },
  });

  const pieData = useMemo(() => {
    if (!data?.filiais?.length) return [];
    return data.filiais
      .filter((f) => f.fichas > 0)
      .map((f, i) => ({
        name: f.filialNome,
        value: f.percentual,
        valorDistribuido: f.valorDistribuido,
        fichas: f.fichas,
        cor: CORES_FILIAL[i % CORES_FILIAL.length],
      }));
  }, [data]);

  const barData = useMemo(() => {
    if (!data?.filiais?.length) return [];
    return data.filiais
      .filter((f) => f.fichas > 0)
      .map((f, i) => ({
        nome: f.filialNome,
        valorDistribuido: f.valorDistribuido,
        fichas: f.fichas,
        cor: CORES_FILIAL[i % CORES_FILIAL.length],
      }));
  }, [data]);

  const totalDistribuido = data?.filiais?.reduce((acc, f) => acc + f.valorDistribuido, 0) ?? 0;

  // Indicador de 100% distribuído: verifica se totalDistribuido ≈ totalAssinaturas (tolerância de R$ 1 por arredondamento)
  const pctDistribuido = data?.totalAssinaturas && data.totalAssinaturas > 0
    ? (totalDistribuido / data.totalAssinaturas) * 100
    : 0;
  const diferenca = data?.totalAssinaturas ? Math.abs(totalDistribuido - data.totalAssinaturas) : 0;
  const distribuicaoCompleta = diferenca <= 1; // tolerância de R$ 1 por arredondamentos

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Repeat2 className="w-5 h-5 text-violet-400" />
            Distribuição Dpote por Filial
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            100% das assinaturas distribuídas proporcionalmente pelas fichas de cada unidade
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Seletor de mês */}
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m} {ano}</option>
            ))}
          </select>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isFetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
            Atualizar
          </button>
          {/* Botão principal: aplica valor distribuído como faturamento de cada unidade */}
          {data && data.filiais.length > 0 && (
            <Button
              onClick={() => aplicarMutation.mutate({ mes, ano })}
              disabled={aplicarMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 h-auto"
            >
              {aplicarMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ArrowDownToLine className="w-3.5 h-3.5" />}
              Aplicar ao Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Estado de carregamento */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            <p className="text-sm text-muted-foreground">Buscando dados do CashBarber...</p>
            <p className="text-xs text-muted-foreground/60">Isso pode levar alguns segundos</p>
          </div>
        </div>
      )}

      {/* Estado de erro */}
      {error && !isLoading && (
        <Card className="p-6 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400 font-medium">Erro ao buscar dados do CashBarber</p>
          <p className="text-xs text-red-400/70 mt-1">{error.message}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Verifique se as credenciais CashBarber estão configuradas no AdminPanel e se o Dpote está ativado para pelo menos uma empresa.
          </p>
        </Card>
      )}

      {/* Sem dados configurados */}
      {!isLoading && !error && data && data.filiais.length === 0 && (
        <Card className="p-8 border-dashed border-violet-500/20 bg-violet-500/5 text-center">
          <Repeat2 className="w-10 h-10 text-violet-400/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-violet-300">Dpote não configurado</p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure as credenciais CashBarber e o nome da filial Dpote no AdminPanel para ver a distribuição.
          </p>
        </Card>
      )}

      {/* Conteúdo principal */}
      {!isLoading && !error && data && data.filiais.length > 0 && (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total Assinaturas</p>
              <p className="text-lg font-bold text-foreground">{fmt(data.totalAssinaturas)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">valor bruto do mês (100%)</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total Distribuído</p>
              <p className="text-lg font-bold text-emerald-400">{fmt(totalDistribuido)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">entre todas as filiais</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total de Fichas</p>
              <p className="text-lg font-bold text-cyan-400">{fmtNum(data.totalFichas)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">ponderadas no período</p>
            </Card>
          </div>

          {/* Indicador de 100% distribuído */}
          <Card className={`p-4 border-0 shadow-sm rounded-2xl overflow-hidden ${
            distribuicaoCompleta
              ? "bg-emerald-500/5 border border-emerald-500/20"
              : "bg-amber-500/5 border border-amber-500/20"
          }`}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                {distribuicaoCompleta ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-semibold ${
                    distribuicaoCompleta ? "text-emerald-400" : "text-amber-400"
                  }`}>
                    {distribuicaoCompleta
                      ? "100% distribuído com sucesso"
                      : `${pctDistribuido.toFixed(2)}% distribuído`}
                  </p>
                  <p className="text-[11px] text-muted-foreground/70">
                    {distribuicaoCompleta
                      ? `${fmtFull(totalDistribuido)} distribuídos de ${fmtFull(data.totalAssinaturas)} em assinaturas`
                      : `Diferença de ${fmtFull(diferenca)} — pode ser arredondamento ou filial sem fichas`}
                  </p>
                </div>
              </div>
              <span className={`text-2xl font-black tabular-nums ${
                distribuicaoCompleta ? "text-emerald-400" : "text-amber-400"
              }`}>
                {pctDistribuido.toFixed(1)}%
              </span>
            </div>
            {/* Barra de progresso */}
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  distribuicaoCompleta ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(pctDistribuido, 100)}%` }}
              />
            </div>
            {/* Detalhes por filial em linha */}
            {data.filiais.filter((f) => f.fichas > 0).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {data.filiais
                  .filter((f) => f.fichas > 0)
                  .sort((a, b) => b.valorDistribuido - a.valorDistribuido)
                  .map((f, i) => {
                    const cor = CORES_FILIAL[i % CORES_FILIAL.length];
                    return (
                      <div
                        key={f.filialId}
                        className="flex items-center gap-1.5 text-[11px] bg-muted/40 rounded-lg px-2.5 py-1"
                      >
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                        <span className="text-muted-foreground font-medium">{f.filialNome}</span>
                        <span className="font-bold" style={{ color: cor }}>{f.percentual.toFixed(1)}%</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </Card>

          {/* Cards por filial */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.filiais
              .filter((f) => f.fichas > 0)
              .sort((a, b) => b.valorDistribuido - a.valorDistribuido)
              .map((f, i) => {
                const cor = CORES_FILIAL[i % CORES_FILIAL.length];
                return (
                  <Card key={f.filialId} className="p-5 border-0 shadow-sm rounded-2xl bg-card overflow-hidden relative">
                    <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: cor }} />

                    {/* Cabeçalho da filial */}
                    <div className="flex items-start justify-between gap-2 mt-1 mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: cor + "20" }}>
                          <Award className="w-4 h-4" style={{ color: cor }} />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-sm">{f.filialNome}</p>
                          <p className="text-[10px] text-muted-foreground">Filial #{f.filialId}</p>
                        </div>
                      </div>
                      {/* Badge de posição */}
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cor + "20", color: cor }}
                      >
                        #{i + 1}
                      </span>
                    </div>

                    {/* Valor distribuído em destaque */}
                    <div className="mb-4">
                      <p className="text-xs text-muted-foreground mb-0.5">Faturamento Recorrência</p>
                      <p className="text-2xl font-bold" style={{ color: cor }}>{fmtFull(f.valorDistribuido)}</p>
                    </div>

                    {/* Barra de proporção */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Proporção do pote</span>
                        <span className="font-bold" style={{ color: cor }}>{f.percentual.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(f.percentual, 100)}%`, backgroundColor: cor }}
                        />
                      </div>
                    </div>

                    {/* Fichas */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Hash className="w-3 h-3" />
                      <span>{fmtNum(f.fichas)} fichas ponderadas</span>
                      <span className="text-muted-foreground/40">·</span>
                      <span>{f.percentual.toFixed(1)}% do total</span>
                    </div>
                  </Card>
                );
              })}
          </div>

          {/* Gráficos lado a lado */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico de pizza */}
            <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Proporção de Fichas</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs text-muted-foreground">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Gráfico de barras — valor distribuído por filial */}
            <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
              <h3 className="text-sm font-semibold text-foreground mb-4">Faturamento Recorrência por Filial (R$)</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="nome"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmtFull(value), "Faturamento"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="valorDistribuido" radius={[6, 6, 0, 0]}>
                    {barData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.cor} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Tabela resumo */}
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
            <h3 className="text-sm font-semibold text-foreground mb-4">Resumo — {MESES[mes - 1]} {ano}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4">Filial</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">Fichas</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">Proporção</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">Faturamento Recorrência</th>
                    <th className="text-right text-xs text-muted-foreground font-medium pb-2">Ajuste</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filiais
                    .filter((f) => f.fichas > 0)
                    .sort((a, b) => b.valorDistribuido - a.valorDistribuido)
                    .map((f, i) => {
                      const cor = CORES_FILIAL[i % CORES_FILIAL.length];
                      const slug = f.filialNome.toLowerCase().replace(/\s+/g, "-");
                      const ajuste = ajustes[slug] ?? { valor: "", operacao: "substituir" as const };
                      const isAberto = ajusteAberto === slug;
                      return (
                        <>
                          <tr key={f.filialId} className="border-b border-border/50">
                            <td className="py-2.5 pr-4">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                                <span className="font-medium text-foreground">{f.filialNome}</span>
                              </div>
                            </td>
                            <td className="py-2.5 pr-4 text-right text-muted-foreground">{fmtNum(f.fichas)}</td>
                            <td className="py-2.5 pr-4 text-right">
                              <span className="font-semibold" style={{ color: cor }}>{f.percentual.toFixed(1)}%</span>
                            </td>
                            <td className="py-2.5 pr-4 text-right font-bold text-foreground">{fmtFull(f.valorDistribuido)}</td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => setAjusteAberto(isAberto ? null : slug)}
                                className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${
                                  isAberto
                                    ? "bg-violet-500/20 border-violet-500/40 text-violet-300"
                                    : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:border-violet-500/30"
                                }`}
                              >
                                <PencilLine className="w-3 h-3" />
                                Ajustar
                              </button>
                            </td>
                          </tr>
                          {/* Painel de ajuste inline */}
                          {isAberto && (
                            <tr key={`${f.filialId}-ajuste`}>
                              <td colSpan={5} className="pb-3 pt-1">
                                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-3">
                                  <p className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                                    <PencilLine className="w-3.5 h-3.5" />
                                    Ajuste manual — {f.filialNome} ({MESES[mes - 1]} {ano})
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Faturamento calculado pelo CashBarber: <span className="font-semibold text-foreground">{fmtFull(f.valorDistribuido)}</span>
                                  </p>
                                  {/* Seletor de operação */}
                                  <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`op-${slug}`}
                                        value="substituir"
                                        checked={ajuste.operacao === "substituir"}
                                        onChange={() => setAjustes((prev) => ({ ...prev, [slug]: { ...ajuste, operacao: "substituir" } }))}
                                        className="accent-violet-500"
                                      />
                                      <span className="text-xs text-foreground">Substituir valor</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`op-${slug}`}
                                        value="somar"
                                        checked={ajuste.operacao === "somar"}
                                        onChange={() => setAjustes((prev) => ({ ...prev, [slug]: { ...ajuste, operacao: "somar" } }))}
                                        className="accent-violet-500"
                                      />
                                      <span className="text-xs text-foreground">Somar ao valor atual</span>
                                    </label>
                                  </div>
                                  {/* Campo de valor */}
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">R$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      step="0.01"
                                      placeholder="0,00"
                                      value={ajuste.valor}
                                      onChange={(e) => setAjustes((prev) => ({ ...prev, [slug]: { ...ajuste, valor: e.target.value } }))}
                                      className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                                    />
                                    <Button
                                      size="sm"
                                      disabled={!ajuste.valor || isNaN(parseFloat(ajuste.valor)) || ajustarMutation.isPending}
                                      onClick={() => {
                                        const valor = parseFloat(ajuste.valor);
                                        if (isNaN(valor)) return;
                                        ajustarMutation.mutate({
                                          dpoteFilialNome: f.filialNome,
                                          mes,
                                          ano,
                                          valor,
                                          operacao: ajuste.operacao,
                                        });
                                      }}
                                      className="bg-violet-600 hover:bg-violet-500 text-white text-xs"
                                    >
                                      {ajustarMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                      Aplicar
                                    </Button>
                                    <button
                                      onClick={() => setAjusteAberto(null)}
                                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                  {ajuste.operacao === "somar" && ajuste.valor && !isNaN(parseFloat(ajuste.valor)) && (
                                    <p className="text-xs text-violet-300/70">
                                      Resultado: {fmtFull(f.valorDistribuido)} + {fmtFull(parseFloat(ajuste.valor))} = <span className="font-semibold text-violet-300">{fmtFull(f.valorDistribuido + parseFloat(ajuste.valor))}</span>
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  {/* Linha de total */}
                  <tr className="border-t-2 border-border">
                    <td className="pt-3 pr-4 font-semibold text-foreground">Total</td>
                    <td className="pt-3 pr-4 text-right font-semibold text-muted-foreground">{fmtNum(data.totalFichas)}</td>
                    <td className="pt-3 pr-4 text-right font-semibold text-violet-400">100%</td>
                    <td className="pt-3 pr-4 text-right font-bold text-emerald-400">{fmtFull(totalDistribuido)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
            {/* Fórmula de cálculo */}
            <div className="mt-4 pt-3 border-t border-border/50 text-[11px] text-muted-foreground/60 space-y-0.5">
              <p>Fórmula: <span className="font-mono">Faturamento Filial = {fmtFull(data.totalAssinaturas)} × (fichas_filial / {fmtNum(data.totalFichas)})</span></p>
              <p>Fonte: CashBarber API — Relatório 15 (atendimentos por serviço) com fichas ponderadas por serviço</p>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
