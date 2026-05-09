import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, TrendingUp, TrendingDown, Minus, Trophy, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo } from "react";

interface UnitDrilldownModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitSlug: string | null;
  unitName: string | null;
  unitColor?: string;
  mes: number;
  ano: number;
}

function formatarMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Avatar({ nome, fotoUrl, size = 32 }: { nome: string; fotoUrl?: string | null; size?: number }) {
  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 text-white font-semibold"
      style={{ width: size, height: size }}
    >
      {(nome || "?")[0].toUpperCase()}
    </div>
  );
}

export default function UnitDrilldownModal({
  open,
  onOpenChange,
  unitSlug,
  unitName,
  unitColor = "#3b82f6",
  mes,
  ano,
}: UnitDrilldownModalProps) {
  // Buscar ranking de profissionais da unidade
  const { data: rankingData, isLoading } = trpc.profissionais.getRankingByUnit.useQuery(
    {
      empresaSlug: unitSlug ?? "",
      mes,
      ano,
    },
    { enabled: open && !!unitSlug }
  );

  const profissionais = useMemo(() => {
    if (!rankingData?.profissionais) return [];
    return rankingData.profissionais.sort((a: any, b: any) => (b.totalGeral ?? 0) - (a.totalGeral ?? 0));
  }, [rankingData]);

  const unitStats = useMemo(() => {
    if (!rankingData) return null;
    const totalRealizado = rankingData.totalRealizado ?? 0;
    const metaMensal = rankingData.metaMensal ?? 0;
    const faltaMeta = Math.max(0, metaMensal - totalRealizado);
    const pctAtingimento = metaMensal > 0 ? Math.round((totalRealizado / metaMensal) * 100) : 0;
    return {
      totalRealizado,
      metaMensal,
      metaDiaria: rankingData.metaDiaria ?? 0,
      diasRestantes: rankingData.diasRestantes ?? 0,
      faltaMeta,
      pctAtingimento,
    };
  }, [rankingData]);

  const renderIndicadorPosicao = (posicaoAtual: number, posicaoAnterior?: number | null) => {
    if (posicaoAnterior === null || posicaoAnterior === undefined) {
      return (
        <span className="inline-flex items-center gap-0.5 text-white/30 text-xs">
          <Minus className="w-3 h-3" />
        </span>
      );
    }
    const variacaoPosicao = posicaoAnterior - posicaoAtual;
    if (variacaoPosicao > 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-emerald-400 text-xs font-semibold">
          <TrendingUp className="w-3 h-3" />
          +{variacaoPosicao}
        </span>
      );
    }
    if (variacaoPosicao < 0) {
      return (
        <span className="inline-flex items-center gap-0.5 text-red-400 text-xs font-semibold">
          <TrendingDown className="w-3 h-3" />
          {variacaoPosicao}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-white/30 text-xs">
        <Minus className="w-3 h-3" />
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-4 h-4 rounded-full flex-shrink-0"
              style={{ backgroundColor: unitColor }}
            />
            <DialogTitle className="text-white">Ranking - {unitName}</DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="ml-auto text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : profissionais.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            Nenhum profissional encontrado para esta unidade
          </div>
        ) : (
          <div className="space-y-4">
            {/* Resumo da unidade */}
            {unitStats && (
              <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700 space-y-3">
                {/* Linha 1: Realizado + Meta + Percentual */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Realizado</p>
                    <p className="text-lg font-bold text-white">{formatarMoeda(unitStats.totalRealizado)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Meta</p>
                    <p className="text-lg font-bold text-white">{formatarMoeda(unitStats.metaMensal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Atingimento</p>
                    <p className={`text-lg font-bold ${
                      unitStats.pctAtingimento >= 100
                        ? 'text-emerald-400'
                        : unitStats.pctAtingimento >= 75
                        ? 'text-blue-400'
                        : unitStats.pctAtingimento >= 50
                        ? 'text-amber-400'
                        : 'text-red-400'
                    }`}>{unitStats.pctAtingimento}%</p>
                  </div>
                </div>
                {/* Barra de progresso da meta da unidade */}
                <div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        unitStats.pctAtingimento >= 100
                          ? 'bg-emerald-400'
                          : unitStats.pctAtingimento >= 75
                          ? 'bg-blue-400'
                          : unitStats.pctAtingimento >= 50
                          ? 'bg-amber-400'
                          : 'bg-red-400'
                      }`}
                      style={{ width: `${Math.min(unitStats.pctAtingimento, 100)}%` }}
                    />
                  </div>
                </div>
                {/* Linha 2: Falta para meta + Meta/dia + Dias restantes */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Falta para meta</p>
                    <p className={`text-base font-semibold ${
                      unitStats.faltaMeta === 0 ? 'text-emerald-400' : 'text-amber-300'
                    }`}>
                      {unitStats.faltaMeta === 0 ? '✓ Meta atingida!' : formatarMoeda(unitStats.faltaMeta)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Meta/dia</p>
                    <p className="text-base font-semibold text-white">{formatarMoeda(unitStats.metaDiaria)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Dias restantes</p>
                    <p className="text-base font-semibold text-white">{unitStats.diasRestantes}d</p>
                  </div>
                </div>
              </div>
            )}

            {/* Lista de profissionais */}
            <div className="space-y-3">
              {profissionais.map((prof: any, idx: number) => {
                const pos = idx + 1;
                const medalha = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
                const pctMeta =
                  prof.metaMensal && prof.metaMensal > 0
                    ? Math.round((prof.totalGeral / prof.metaMensal) * 100)
                    : null;

                return (
                  <div
                    key={prof.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700 hover:border-slate-600 transition-all"
                  >
                    {/* Posição */}
                    <div className="w-8 flex flex-col items-center gap-0.5 flex-shrink-0 pt-0.5">
                      {medalha ? (
                        <span className="text-lg leading-none">{medalha}</span>
                      ) : (
                        <span className="text-slate-400 text-xs font-bold">{pos}º</span>
                      )}
                      {renderIndicadorPosicao(pos, prof.posicaoAnterior)}
                    </div>

                    {/* Avatar */}
                    <Avatar nome={prof.nome} fotoUrl={prof.fotoUrl} size={40} />

                    {/* Informações */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white truncate">{prof.apelido || prof.nome.split(" ")[0]}</div>

                      {/* Contagem de atendimentos */}
                      {(prof.qtdServicos > 0 || prof.qtdProdutos > 0) && (
                        <div className="text-xs text-slate-400 flex gap-1.5 flex-wrap mt-0.5">
                          {prof.qtdServicos > 0 && (
                            <span className="bg-slate-700/50 px-1.5 py-0.5 rounded-md">✂️ {prof.qtdServicos} serv</span>
                          )}
                          {prof.qtdProdutos > 0 && (
                            <span className="bg-slate-700/50 px-1.5 py-0.5 rounded-md">🛍️ {prof.qtdProdutos} prod</span>
                          )}
                        </div>
                      )}

                      {/* Valores */}
                      <div className="text-xs text-slate-500 flex gap-2 flex-wrap mt-0.5">
                        {prof.totalServicos > 0 && <span>{formatarMoeda(prof.totalServicos)}</span>}
                        {prof.totalProdutos > 0 && <span>· {formatarMoeda(prof.totalProdutos)}</span>}
                      </div>

                      {/* Barra de meta */}
                      {pctMeta !== null && prof.metaMensal && prof.metaMensal > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-slate-400">Meta: {formatarMoeda(prof.metaMensal)}</span>
                            <span
                              className={`text-xs font-bold ${
                                pctMeta >= 100
                                  ? "text-emerald-400"
                                  : pctMeta >= 75
                                  ? "text-blue-400"
                                  : pctMeta >= 50
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }`}
                            >
                              {pctMeta}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                pctMeta >= 100
                                  ? "bg-emerald-400"
                                  : pctMeta >= 75
                                  ? "bg-blue-400"
                                  : pctMeta >= 50
                                  ? "bg-amber-400"
                                  : "bg-red-400"
                              }`}
                              style={{ width: `${Math.min(pctMeta, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Total */}
                    <div className="text-right flex-shrink-0 font-bold text-white">
                      {formatarMoeda(prof.totalGeral)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
