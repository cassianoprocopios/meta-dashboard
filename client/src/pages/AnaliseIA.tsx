import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, Building2, AlertCircle, Loader2 } from "lucide-react";
import { Streamdown } from "streamdown";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

interface EmpresaStats {
  emp: { slug: string; nome: string; cor: string; tipoCategorias?: string };
  total: number;
  mediaDiaria: number;
  diasLancados: number;
  diasUteis: number;
  metaMensal: number;
  progressoMensal: number;
  catTotals: number[];
}

interface ComparativoMesAnterior {
  totalAnteriorMesmosDias: number;
  variacaoTotal: number | null;
  porEmpresa: Record<string, { totalAtual: number; totalAnterior: number; diasAtual: number }>;
}

interface Props {
  mes: number;
  ano: number;
  mesAnterior: number;
  anoAnterior: number;
  statsPorEmpresa: EmpresaStats[];
  comparativoMesAnterior: ComparativoMesAnterior;
  totalGeral: number;
  metaTotalGeral: number;
  mesLabel: string;
  mesAnteriorLabel: string;
}

export default function AnaliseIA({
  mes, ano, mesAnterior, anoAnterior,
  statsPorEmpresa, comparativoMesAnterior,
  totalGeral, metaTotalGeral,
  mesLabel, mesAnteriorLabel,
}: Props) {
  const [analise, setAnalise] = useState<string | null>(null);
  const [geradoEm, setGeradoEm] = useState<Date | null>(null);

  const analisarMutation = trpc.ia.analisarDesempenho.useMutation({
    onSuccess: (data) => {
      setAnalise(typeof data.analise === "string" ? data.analise : String(data.analise));
      setGeradoEm(new Date());
    },
    onError: (err) => {
      console.error("Erro ao gerar análise:", err);
    },
  });

  const handleGerar = () => {
    const empresasPayload = statsPorEmpresa.map((s) => {
      const comp = comparativoMesAnterior.porEmpresa[s.emp.slug];
      const catLabels = s.emp.tipoCategorias === "seraphine"
        ? ["Cabelo", "Manicure e Pedicure", "Outros Serviços", "Pacote", "Recorrência"]
        : ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
      return {
        nome: s.emp.nome,
        slug: s.emp.slug,
        total: s.total,
        totalAnterior: comp?.totalAnterior ?? 0,
        metaMensal: s.metaMensal,
        mediaDiaria: s.mediaDiaria,
        diasLancados: s.diasLancados,
        diasUteis: s.diasUteis,
        progressoMensal: s.progressoMensal,
        catTotals: s.catTotals,
        catLabels,
      };
    });

    analisarMutation.mutate({
      mes,
      ano,
      mesAnterior,
      anoAnterior,
      empresas: empresasPayload,
      totalGeral,
      totalGeralAnterior: comparativoMesAnterior.totalAnteriorMesmosDias,
      metaTotalGeral,
      nomeMes: mesLabel,
      nomeMesAnterior: mesAnteriorLabel,
    });
  };

  const temDados = statsPorEmpresa.length > 0 && totalGeral > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Análise de IA — {mesLabel} {ano}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Diagnóstico inteligente do desempenho com estratégias de melhora personalizadas
          </p>
        </div>
        <Button
          onClick={handleGerar}
          disabled={analisarMutation.isPending || !temDados}
          className="gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-md"
          size="lg"
        >
          {analisarMutation.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</>
          ) : analise ? (
            <><RefreshCw className="w-4 h-4" /> Reanalisar</>
          ) : (
            <><Sparkles className="w-4 h-4" /> Gerar Análise</>
          )}
        </Button>
      </div>

      {/* Resumo dos dados que serão analisados */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Total Faturado</p>
          <p className="text-lg font-bold mt-1">{fmt(totalGeral)}</p>
          {comparativoMesAnterior.variacaoTotal !== null && (
            <p className={`text-xs mt-1 flex items-center gap-1 ${comparativoMesAnterior.variacaoTotal >= 0 ? "text-emerald-200" : "text-red-200"}`}>
              {comparativoMesAnterior.variacaoTotal >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(comparativoMesAnterior.variacaoTotal).toFixed(1)}% vs {mesAnteriorLabel}
            </p>
          )}
        </Card>
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Meta Mensal</p>
          <p className="text-lg font-bold mt-1 text-slate-900">{fmt(metaTotalGeral)}</p>
          <p className="text-xs text-slate-400 mt-1">
            {metaTotalGeral > 0 ? `${((totalGeral / metaTotalGeral) * 100).toFixed(1)}% atingido` : "Sem meta definida"}
          </p>
        </Card>
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unidades</p>
          <p className="text-lg font-bold mt-1 text-slate-900">{statsPorEmpresa.length}</p>
          <p className="text-xs text-slate-400 mt-1">empresas ativas</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mês Anterior</p>
          <p className="text-lg font-bold mt-1 text-slate-900">{fmt(comparativoMesAnterior.totalAnteriorMesmosDias)}</p>
          <p className="text-xs text-slate-400 mt-1">mesmos dias apurados</p>
        </Card>
      </div>

      {/* Cards de resumo por empresa */}
      {statsPorEmpresa.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {statsPorEmpresa.map((s) => {
            const comp = comparativoMesAnterior.porEmpresa[s.emp.slug];
            const variacao = comp && comp.totalAnterior > 0
              ? ((comp.totalAtual - comp.totalAnterior) / comp.totalAnterior) * 100
              : null;
            return (
              <Card key={s.emp.slug} className="p-4 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: s.emp.cor }} />
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.emp.cor + "20" }}>
                    <Building2 className="w-4 h-4" style={{ color: s.emp.cor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{s.emp.nome}</p>
                    <p className="text-xs text-slate-400">{s.diasLancados} dias lançados</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-900 text-sm">{fmt(s.total)}</p>
                    {variacao !== null && (
                      <p className={`text-xs font-semibold ${variacao >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                        {variacao >= 0 ? "↑" : "↓"}{Math.abs(variacao).toFixed(1)}%
                      </p>
                    )}
                  </div>
                </div>
                {s.metaMensal > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">Meta: {fmt(s.metaMensal)}</span>
                      <span className="font-bold" style={{ color: s.emp.cor }}>{s.progressoMensal.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(s.progressoMensal, 100)}%`, backgroundColor: s.emp.cor }} />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Aviso se não há dados */}
      {!temDados && (
        <Card className="p-8 border-0 shadow-sm rounded-2xl bg-amber-50 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="font-semibold text-amber-800">Sem dados para analisar</p>
          <p className="text-sm text-amber-600 mt-1">
            Lance faturamentos em {mesLabel} para gerar uma análise de IA.
          </p>
        </Card>
      )}

      {/* Loading */}
      {analisarMutation.isPending && (
        <Card className="p-10 border-0 shadow-sm rounded-2xl bg-white text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-600 animate-pulse" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Analisando seus dados...</p>
              <p className="text-sm text-slate-500 mt-1">A IA está processando o desempenho e elaborando estratégias. Isso pode levar alguns segundos.</p>
            </div>
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
          </div>
        </Card>
      )}

      {/* Resultado da análise */}
      {analise && !analisarMutation.isPending && (
        <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Análise Estratégica</p>
                {geradoEm && (
                  <p className="text-xs text-slate-400">
                    Gerada em {geradoEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerar}
              disabled={analisarMutation.isPending}
              className="gap-1.5 rounded-xl text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
          </div>
          <div className="p-6">
            <div className="prose prose-slate prose-sm max-w-none">
              <Streamdown>{analise}</Streamdown>
            </div>
          </div>
        </Card>
      )}

      {/* Erro */}
      {analisarMutation.isError && !analisarMutation.isPending && (
        <Card className="p-6 border-0 shadow-sm rounded-2xl bg-red-50">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-800">Erro ao gerar análise</p>
              <p className="text-sm text-red-600 mt-0.5">{analisarMutation.error?.message ?? "Tente novamente."}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
