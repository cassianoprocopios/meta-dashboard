import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { Loader2, Repeat2, Award, Hash, TrendingUp, ArrowDownToLine, CheckCircle2, PencilLine, AlertCircle, History, Clock, ChevronDown, ChevronUp, AlertTriangle, Zap } from "lucide-react";

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

// Tooltip customizado para o gráfico de linha
function CustomLineTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-violet-500/30 rounded-xl px-3 py-2.5 shadow-xl text-xs min-w-[160px]">
      <p className="font-semibold text-violet-300 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}</span>
          </div>
          <span className="font-bold text-white">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

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
  const [qtdMesesHistorico, setQtdMesesHistorico] = useState(12);
  const [syncLogAberto, setSyncLogAberto] = useState(false);
  const [syncLogLimit, setSyncLogLimit] = useState(20);
  const [confirmarAplicar, setConfirmarAplicar] = useState(false);

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
      setConfirmarAplicar(false);
      utils.faturamento.listar.invalidate();
      const linhas = resultado.aplicados.map(
        (a) => `${a.filialNome}: ${new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(a.valorDistribuido)}`
      ).join(" · ");
      const avisos = resultado.naoEncontrados.length > 0
        ? ` (não encontrado: ${resultado.naoEncontrados.join(", ")})`
        : "";
      toast.success("Dpote aplicado ao faturamento!", {
        description: linhas + avisos,
        duration: 6000,
      });
    },
    onError: (err) => {
      setConfirmarAplicar(false);
      toast.error("Erro ao aplicar Dpote", {
        description: err.message,
      });
    },
  });

  // Buscar histórico de sincronizações do Dpote
  const { data: syncLogs, isLoading: syncLogsLoading } = trpc.cashbarber.dpoteSyncLog.useQuery(
    { limit: syncLogLimit },
    { enabled: syncLogAberto, staleTime: 30 * 1000 }
  );

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

  // Query de histórico mensal
  const { data: historicoData, isLoading: historicoLoading } = trpc.cashbarber.dpoteHistoricoMensal.useQuery(
    { anoFim: mes >= 1 ? ano : ano - 1, mesFim: mes, qtdMeses: qtdMesesHistorico },
    { staleTime: 5 * 60 * 1000 }
  );

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
          {/* Botão principal: abre diálogo de confirmação antes de aplicar */}
          {data && data.filiais.length > 0 && (
            <Button
              onClick={() => setConfirmarAplicar(true)}
              disabled={aplicarMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg px-3 py-1.5 h-auto"
            >
              {aplicarMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <ArrowDownToLine className="w-3.5 h-3.5" />}
              Aplicar no Faturamento
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total Assinaturas</p>
              <p className="text-lg font-bold text-foreground">{fmt(data.totalAssinaturas)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">valor bruto do mês (100%)</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Pote Distribuído</p>
              <p className="text-lg font-bold text-emerald-400">{fmt(totalDistribuido)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">100% das assinaturas</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Total de Fichas</p>
              <p className="text-lg font-bold text-cyan-400">{fmtNum(data.totalFichas)}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">ponderadas no período</p>
            </Card>
            <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
              <p className="text-xs text-muted-foreground mb-1">Histórico CashBarber</p>
              <p className="text-lg font-bold text-violet-400">#{data.historicoId ?? '—'}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                {data.historicoId ? `${MESES[mes - 1]} ${ano} — histórico ativo` : 'ID do histórico Dpote ativo'}
              </p>
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

          {/* Histórico mensal — gráfico de linha */}
          <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-semibold text-foreground">Evolução Mensal do Faturamento de Recorrência</h3>
              </div>
              {/* Seletor de período */}
              <div className="flex items-center gap-1.5">
                {[6, 12, 18, 24].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQtdMesesHistorico(n)}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                      qtdMesesHistorico === n
                        ? "bg-violet-500/20 border-violet-500/40 text-violet-300 font-semibold"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {n}m
                  </button>
                ))}
              </div>
            </div>

            {historicoLoading && (
              <div className="flex items-center justify-center h-[260px]">
                <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              </div>
            )}

            {!historicoLoading && (!historicoData || historicoData.pontos.length === 0) && (
              <div className="flex flex-col items-center justify-center h-[260px] text-center">
                <History className="w-8 h-8 text-violet-400/30 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum dado de recorrência encontrado</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Lançamentos com cat5 &gt; 0 aparecerão aqui</p>
              </div>
            )}

            {!historicoLoading && historicoData && historicoData.pontos.length > 0 && (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={historicoData.pontos} margin={{ top: 5, right: 16, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="mesLabel"
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
                    <Tooltip content={<CustomLineTooltip />} />
                    <Legend
                      formatter={(value) => {
                        const emp = historicoData.empresas.find((e) => e.slug === value);
                        return <span className="text-xs text-muted-foreground">{emp?.nome ?? value}</span>;
                      }}
                    />
                    {historicoData.empresas.map((emp, i) => (
                      <Line
                        key={emp.slug}
                        type="monotone"
                        dataKey={emp.slug}
                        name={emp.slug}
                        stroke={CORES_FILIAL[i % CORES_FILIAL.length]}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: CORES_FILIAL[i % CORES_FILIAL.length], strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                {/* Tabela resumo do histórico */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-muted-foreground font-medium pb-1.5 pr-3">Mês</th>
                        {historicoData.empresas.map((emp, i) => (
                          <th key={emp.slug} className="text-right text-muted-foreground font-medium pb-1.5 pr-3">
                            <span style={{ color: CORES_FILIAL[i % CORES_FILIAL.length] }}>{emp.nome}</span>
                          </th>
                        ))}
                        <th className="text-right text-muted-foreground font-medium pb-1.5">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...historicoData.pontos].reverse().map((ponto) => {
                        const total = historicoData.empresas.reduce(
                          (acc, emp) => acc + (typeof ponto[emp.slug] === "number" ? (ponto[emp.slug] as number) : 0),
                          0
                        );
                        const isMesAtual = ponto.mesAno === `${ano}-${String(mes).padStart(2, "0")}`;
                        return (
                          <tr
                            key={ponto.mesAno as string}
                            className={`border-b border-border/40 ${
                              isMesAtual ? "bg-violet-500/5" : ""
                            }`}
                          >
                            <td className={`py-1.5 pr-3 font-medium ${
                              isMesAtual ? "text-violet-300" : "text-foreground"
                            }`}>
                              {ponto.mesLabel as string}
                              {isMesAtual && <span className="ml-1 text-[9px] text-violet-400 font-bold">atual</span>}
                            </td>
                            {historicoData.empresas.map((emp) => (
                              <td key={emp.slug} className="py-1.5 pr-3 text-right text-muted-foreground">
                                {(ponto[emp.slug] as number) > 0
                                  ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(ponto[emp.slug] as number)
                                  : <span className="text-muted-foreground/30">—</span>}
                              </td>
                            ))}
                            <td className="py-1.5 text-right font-bold text-foreground">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </Card>

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
                        <React.Fragment key={f.filialId}>
                          <tr className="border-b border-border/50">
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
                        </React.Fragment>
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

          {/* Histórico de Sincronizações */}
          <Card className="p-5 bg-card border-border/50">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => setSyncLogAberto((v) => !v)}
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-violet-400" />
                <span className="font-semibold text-foreground text-sm">Histórico de Sincronizações do Dpote</span>
              </div>
              {syncLogAberto ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {syncLogAberto && (
              <div className="mt-4">
                {syncLogsLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando histórico...
                  </div>
                ) : !syncLogs?.length ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma sincronização registrada ainda.</p>
                    <p className="text-xs mt-1 opacity-70">O histórico será preenchido automaticamente a cada sync do Dpote.</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/50 text-xs text-muted-foreground">
                            <th className="pb-2 pr-4 text-left font-medium">Data / Hora</th>
                            <th className="pb-2 pr-4 text-left font-medium">Empresa</th>
                            <th className="pb-2 pr-4 text-left font-medium">Mês/Ano</th>
                            <th className="pb-2 pr-4 text-right font-medium">Valor Anterior</th>
                            <th className="pb-2 pr-4 text-right font-medium">Novo Valor</th>
                            <th className="pb-2 pr-4 text-right font-medium">Variação</th>
                            <th className="pb-2 pr-4 text-center font-medium">Dias</th>
                            <th className="pb-2 pr-4 text-center font-medium">Fonte</th>
                            <th className="pb-2 text-center font-medium">Tipo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {syncLogs.map((log) => {
                            const variacao = log.variacao;
                            const variacaoPositiva = variacao > 0;
                            const variacaoNegativa = variacao < 0;
                            const mesLabel = MESES[log.mes - 1]?.slice(0, 3) ?? log.mes;
                            return (
                              <tr key={log.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                                <td className="py-2.5 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3 h-3 opacity-50" />
                                    {new Date(log.executadoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className="font-medium text-foreground">{log.empresaSlug}</span>
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground text-xs">
                                  {mesLabel}/{log.ano}
                                </td>
                                <td className="py-2.5 pr-4 text-right text-muted-foreground text-xs">
                                  {log.valorAnterior > 0 ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(log.valorAnterior) : <span className="opacity-40">—</span>}
                                </td>
                                <td className="py-2.5 pr-4 text-right font-semibold text-emerald-400">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(log.valorNovo)}
                                </td>
                                <td className="py-2.5 pr-4 text-right text-xs">
                                  {variacao === 0 ? (
                                    <span className="text-muted-foreground">—</span>
                                  ) : (
                                    <span className={variacaoPositiva ? "text-emerald-400" : variacaoNegativa ? "text-rose-400" : "text-muted-foreground"}>
                                      {variacaoPositiva ? "+" : ""}{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(variacao)}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 pr-4 text-center text-xs text-muted-foreground">
                                  {log.diasAtualizados}
                                </td>
                                <td className="py-2.5 pr-4 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    log.fonte === "api" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                                  }`}>
                                    {log.fonte === "api" ? "API" : "Manual"}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center">
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                    log.tipoExecucao === "automatico" ? "bg-violet-500/20 text-violet-400" : "bg-slate-500/20 text-slate-400"
                                  }`}>
                                    {log.tipoExecucao === "automatico" ? "Auto" : "Manual"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {syncLogs.length >= syncLogLimit && (
                      <div className="mt-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSyncLogLimit((v) => v + 20)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Carregar mais
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {/* Diálogo de confirmação para aplicar Dpote no faturamento */}
      <Dialog open={confirmarAplicar} onOpenChange={(open) => { if (!aplicarMutation.isPending) setConfirmarAplicar(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Aplicar Dpote no Faturamento
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Os valores abaixo serão lançados como <strong>Recorrência</strong> no dia 1 de {MESES[(mes ?? 1) - 1]} {ano} para cada unidade.
            </DialogDescription>
          </DialogHeader>

          {/* Tabela de valores por filial */}
          {data && data.filiais.filter((f) => f.fichas > 0).length > 0 && (
            <div className="rounded-xl border border-border/60 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">Unidade</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Fichas</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">%</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.filiais
                    .filter((f) => f.fichas > 0)
                    .sort((a, b) => b.valorDistribuido - a.valorDistribuido)
                    .map((f, i) => {
                      const cor = CORES_FILIAL[i % CORES_FILIAL.length];
                      return (
                        <tr key={f.filialId} className="border-b border-border/40 last:border-0">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cor }} />
                              <span className="font-medium text-foreground text-xs">{f.filialNome}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{fmtNum(f.fichas)}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold" style={{ color: cor }}>{f.percentual.toFixed(1)}%</td>
                          <td className="px-4 py-2.5 text-right text-xs font-bold text-foreground">{fmt(f.valorDistribuido)}</td>
                        </tr>
                      );
                    })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t border-border/60">
                    <td className="px-4 py-2.5 text-xs font-semibold text-muted-foreground" colSpan={3}>Total</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-400">{fmt(totalDistribuido)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Aviso de sobrescrita */}
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-300/90">
              Esta ação <strong>sobrescreve</strong> o valor de Recorrência existente no dia 1 de cada unidade. As demais categorias do dia não serão alteradas.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmarAplicar(false)}
              disabled={aplicarMutation.isPending}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => aplicarMutation.mutate({ mes, ano })}
              disabled={aplicarMutation.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {aplicarMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Aplicando...</>
              ) : (
                <><ArrowDownToLine className="w-4 h-4 mr-2" />Confirmar e Aplicar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
