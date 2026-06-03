import { Card } from "@/components/ui/card";
import { Users, TrendingUp, BarChart3, DollarSign, Calendar } from "lucide-react";

interface ProfissionalComMeta {
  profissional: string;
  totalAtendimentos: number;
  clientesUnicos: number;
  faturamentoTotal: number;
  ticketMedio: number;
  metaMensal?: number;
  fotoUrl?: string;
}

interface RankingProfissionaisPorClientesProps {
  dados: ProfissionalComMeta[];
  isLoading?: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(v);
}

function fmtFull(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

function getMedalColor(posicao: number) {
  switch (posicao) {
    case 0:
      return "text-yellow-500"; // Ouro
    case 1:
      return "text-gray-400"; // Prata
    case 2:
      return "text-orange-600"; // Bronze
    default:
      return "text-blue-500";
  }
}

function getMedalBg(posicao: number) {
  switch (posicao) {
    case 0:
      return "bg-yellow-500/20"; // Ouro
    case 1:
      return "bg-gray-500/20"; // Prata
    case 2:
      return "bg-orange-500/20"; // Bronze
    default:
      return "bg-blue-500/20";
  }
}

export default function RankingProfissionaisPorClientes({
  dados,
  isLoading,
}: RankingProfissionaisPorClientesProps) {
  if (isLoading) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </Card>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
        </div>
        <div className="h-32 flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </div>
      </Card>
    );
  }

  // Calcular totais consolidados
  const totalClientesUnicos = dados.reduce((sum, d) => sum + d.clientesUnicos, 0);
  const totalAtendimentos = dados.reduce((sum, d) => sum + d.totalAtendimentos, 0);
  const totalFaturamento = dados.reduce((sum, d) => sum + d.faturamentoTotal, 0);
  const ticketMedioGeral = totalAtendimentos > 0 ? totalFaturamento / totalAtendimentos : 0;

  // Calcular dias úteis do mês (aproximadamente 22 dias)
  const diasUteis = 22;

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Ranking de Profissionais</h3>
            <p className="text-xs text-muted-foreground">{dados.length} profissionais</p>
          </div>
        </div>
      </div>

      {/* Métricas consolidadas */}
      <div className="grid grid-cols-4 gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total de Clientes</p>
          <p className="text-lg font-bold text-foreground">{totalClientesUnicos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Atendimentos</p>
          <p className="text-lg font-bold text-foreground">{totalAtendimentos}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Faturamento</p>
          <p className="text-lg font-bold text-foreground">{fmt(totalFaturamento)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ticket Médio</p>
          <p className="text-lg font-bold text-foreground">{fmtFull(ticketMedioGeral)}</p>
        </div>
      </div>

      {/* Ranking */}
      <div className="space-y-3">
        {dados.map((prof, idx) => {
          const metaMensal = prof.metaMensal || 0;
          const percentualMeta = metaMensal > 0 ? (prof.faturamentoTotal / metaMensal) * 100 : 0;
          const mediaPerDia = prof.faturamentoTotal / diasUteis;
          const projecao = mediaPerDia * diasUteis;
          const falta = Math.max(0, metaMensal - prof.faturamentoTotal);
          const precisaPerDia = falta > 0 ? falta / diasUteis : 0;

          return (
            <div
              key={prof.profissional}
              className="p-4 rounded-xl bg-gradient-to-r from-slate-900/50 to-slate-800/50 border border-slate-700/50 hover:border-slate-600/50 transition-all"
            >
              {/* Header com posição e nome */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Posição com medalha */}
                  <div
                    className={`w-10 h-10 rounded-full ${getMedalBg(idx)} flex items-center justify-center flex-shrink-0`}
                  >
                    <span className={`text-sm font-bold ${getMedalColor(idx)}`}>
                      #{idx + 1}
                    </span>
                  </div>

                  {/* Foto do profissional */}
                  {prof.fotoUrl ? (
                    <img
                      src={prof.fotoUrl}
                      alt={prof.profissional}
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-white">
                        {prof.profissional.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Nome e info rápida */}
                  <div>
                    <h4 className="font-semibold text-foreground">{prof.profissional}</h4>
                    <p className="text-xs text-muted-foreground">
                      {prof.totalAtendimentos} atend. • {prof.clientesUnicos} clientes
                    </p>
                  </div>
                </div>

                {/* Faturamento total */}
                <div className="text-right">
                  <p className="text-lg font-bold text-primary">{fmt(prof.faturamentoTotal)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento</p>
                </div>
              </div>

              {/* Detalhes de serviços e produtos */}
              <div className="grid grid-cols-3 gap-2 mb-3 pb-3 border-b border-slate-700/30">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Serviços</p>
                  <p className="text-sm font-semibold text-foreground">
                    {prof.totalAtendimentos} serv
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Faturamento/serv</p>
                  <p className="text-sm font-semibold text-foreground">
                    {fmtFull(prof.faturamentoTotal / Math.max(prof.totalAtendimentos, 1))}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-sm font-semibold text-foreground">
                    {fmtFull(prof.ticketMedio)}
                  </p>
                </div>
              </div>

              {/* Meta e progresso */}
              {metaMensal > 0 && (
                <>
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        Meta: {fmt(metaMensal)}
                      </p>
                      <p
                        className={`text-sm font-bold ${
                          percentualMeta >= 100 ? "text-green-500" : "text-orange-500"
                        }`}
                      >
                        {percentualMeta.toFixed(0)}%
                      </p>
                    </div>

                    {/* Barra de progresso */}
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentualMeta >= 100
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-orange-500 to-red-500"
                        }`}
                        style={{
                          width: `${Math.min(percentualMeta, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Indicadores de meta */}
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Média/dia
                      </p>
                      <p className="font-semibold text-foreground">{fmtFull(mediaPerDia)}</p>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Projeção
                      </p>
                      <p className="font-semibold text-foreground">{fmt(projecao)}</p>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        Falta
                      </p>
                      <p
                        className={`font-semibold ${
                          falta > 0 ? "text-orange-500" : "text-green-500"
                        }`}
                      >
                        {fmt(falta)}
                      </p>
                    </div>

                    <div className="bg-slate-800/50 p-2 rounded">
                      <p className="text-muted-foreground flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        Precisa/dia
                      </p>
                      <p
                        className={`font-semibold ${
                          precisaPerDia > 0 ? "text-orange-500" : "text-green-500"
                        }`}
                      >
                        {fmtFull(precisaPerDia)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
