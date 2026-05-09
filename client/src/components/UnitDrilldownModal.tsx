import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Loader2, TrendingUp, TrendingDown, Minus, X,
  Target, BarChart2, Zap, Calendar, ArrowUp, ArrowDown
} from "lucide-react";
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

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtShort(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return fmt(v);
}

function Avatar({ nome, fotoUrl, size = 36 }: { nome: string; fotoUrl?: string | null; size?: number }) {
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
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {(nome || "?")[0].toUpperCase()}
    </div>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getColor(pct: number) {
  if (pct >= 100) return "#34d399"; // emerald
  if (pct >= 75) return "#60a5fa";  // blue
  if (pct >= 50) return "#fbbf24";  // amber
  return "#f87171";                  // red
}

function getSemaforo(pct: number) {
  if (pct >= 100) return { emoji: "🟢", label: "Meta atingida!" };
  if (pct >= 75) return { emoji: "🔵", label: "No caminho certo" };
  if (pct >= 50) return { emoji: "🟡", label: "Atenção necessária" };
  return { emoji: "🔴", label: "Abaixo da meta" };
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
  const { data: rankingData, isLoading } = trpc.profissionais.getRankingByUnit.useQuery(
    { empresaSlug: unitSlug ?? "", mes, ano },
    { enabled: open && !!unitSlug }
  );

  const profissionais = useMemo(() => {
    if (!rankingData?.profissionais) return [];
    return [...rankingData.profissionais].sort((a: any, b: any) => (b.totalGeral ?? 0) - (a.totalGeral ?? 0));
  }, [rankingData]);

  const renderIndicadorPosicao = (posicaoAtual: number, posicaoAnterior?: number | null) => {
    if (posicaoAnterior === null || posicaoAnterior === undefined) {
      return <span className="text-white/20 text-xs"><Minus className="w-3 h-3 inline" /></span>;
    }
    const v = posicaoAnterior - posicaoAtual;
    if (v > 0) return <span className="text-emerald-400 text-xs font-semibold flex items-center gap-0.5"><TrendingUp className="w-3 h-3" />+{v}</span>;
    if (v < 0) return <span className="text-red-400 text-xs font-semibold flex items-center gap-0.5"><TrendingDown className="w-3 h-3" />{v}</span>;
    return <span className="text-white/20 text-xs"><Minus className="w-3 h-3 inline" /></span>;
  };

  const d = rankingData;
  const pctMeta = d?.pctMeta ?? 0;
  const semaforo = d ? getSemaforo(pctMeta) : null;
  const color = getColor(pctMeta);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 p-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: unitColor }} />
            <DialogTitle className="text-white text-lg font-bold">Ranking — {unitName}</DialogTitle>
            <button onClick={() => onOpenChange(false)} className="ml-auto text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : !d ? (
          <div className="text-center py-8 text-slate-400 px-5">Nenhum dado encontrado</div>
        ) : (
          <div className="px-5 pb-5 pt-4 space-y-4">

            {/* ── BLOCO 1: Faturamento principal ── */}
            <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 space-y-3">
              {/* Semáforo + Realizado */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Faturamento Realizado</p>
                  <p className="text-2xl font-black text-white">{fmt(d.totalRealizado)}</p>
                  {semaforo && (
                    <p className="text-xs mt-1" style={{ color }}>
                      {semaforo.emoji} {semaforo.label}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Meta Mensal</p>
                  <p className="text-xl font-bold text-slate-200">{fmt(d.metaMensal)}</p>
                  {d.pctMeta !== null && (
                    <p className="text-sm font-bold mt-0.5" style={{ color }}>{d.pctMeta}% atingido</p>
                  )}
                </div>
              </div>

              {/* Barra de progresso */}
              <ProgressBar pct={pctMeta} color={color} />

              {/* Linha: Falta meta + Projeção */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Falta para meta
                  </p>
                  {d.faltaMeta !== null && d.faltaMeta > 0 ? (
                    <p className="text-base font-bold text-amber-300">{fmt(d.faltaMeta)}</p>
                  ) : (
                    <p className="text-base font-bold text-emerald-400">✓ Meta atingida!</p>
                  )}
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3">
                  <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Projeção fim do mês
                  </p>
                  <p className={`text-base font-bold ${
                    d.projecaoFimMes >= d.metaMensal ? 'text-emerald-400' : 'text-amber-300'
                  }`}>{fmt(d.projecaoFimMes)}</p>
                </div>
              </div>
            </div>

            {/* ── BLOCO 2: Métricas de ritmo ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <BarChart2 className="w-3 h-3" /> Média/dia
                </p>
                <p className="text-sm font-bold text-white">{fmt(d.mediaDiaria)}</p>
              </div>
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Meta/dia necessária
                </p>
                <p className={`text-sm font-bold ${
                  d.metaDiariaNecessaria !== null && d.mediaDiaria >= d.metaDiariaNecessaria
                    ? 'text-emerald-400' : 'text-amber-300'
                }`}>
                  {d.metaDiariaNecessaria !== null ? fmt(d.metaDiariaNecessaria) : '—'}
                </p>
              </div>
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-3">
                <p className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Dias restantes
                </p>
                <p className="text-sm font-bold text-white">{d.diasRestantes}d de {d.diasNoMes}d</p>
              </div>
            </div>

            {/* ── BLOCO 3: Meta quinzenal ── */}
            {d.metaQuinzenal !== null && d.metaQuinzenal > 0 && (
              <div className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Meta Quinzenal</p>
                  <p className="text-xs text-slate-400">
                    {d.pctMetaQuinzenal !== null ? `${d.pctMetaQuinzenal}%` : '—'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-white">{fmt(d.totalQuinzena)}</p>
                  <p className="text-sm text-slate-400">de {fmt(d.metaQuinzenal)}</p>
                </div>
                <ProgressBar
                  pct={d.pctMetaQuinzenal ?? 0}
                  color={getColor(d.pctMetaQuinzenal ?? 0)}
                />
                {d.faltaMetaQuinzenal !== null && d.faltaMetaQuinzenal > 0 && (
                  <p className="text-xs text-amber-300">Falta {fmt(d.faltaMetaQuinzenal)} para a meta quinzenal</p>
                )}
                {d.faltaMetaQuinzenal === 0 && (
                  <p className="text-xs text-emerald-400">✓ Meta quinzenal atingida!</p>
                )}
              </div>
            )}

            {/* ── BLOCO 4: Melhor e pior dia ── */}
            {(d.melhorDia || d.piorDia) && (
              <div className="grid grid-cols-2 gap-3">
                {d.melhorDia && (
                  <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-xl p-3">
                    <p className="text-xs text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <ArrowUp className="w-3 h-3" /> Melhor dia
                    </p>
                    <p className="text-sm font-bold text-white">{fmt(d.melhorDia.total)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(d.melhorDia.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                )}
                {d.piorDia && (
                  <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3">
                    <p className="text-xs text-red-400 uppercase tracking-wide mb-1 flex items-center gap-1">
                      <ArrowDown className="w-3 h-3" /> Menor dia
                    </p>
                    <p className="text-sm font-bold text-white">{fmt(d.piorDia.total)}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(d.piorDia.data + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ── BLOCO 5: Super Meta (se existir) ── */}
            {d.superMeta !== null && d.superMeta > 0 && (
              <div className="bg-slate-800/60 rounded-xl border border-yellow-700/30 p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-yellow-400 uppercase tracking-wide mb-0.5">⭐ Super Meta</p>
                  <p className="text-sm font-bold text-white">{fmt(d.superMeta)}</p>
                </div>
                <div className="text-right">
                  {d.faltaSuperMeta !== null && d.faltaSuperMeta > 0 ? (
                    <>
                      <p className="text-xs text-slate-400">Falta</p>
                      <p className="text-sm font-bold text-yellow-300">{fmtShort(d.faltaSuperMeta)}</p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-yellow-400">⭐ Atingida!</p>
                  )}
                  {d.pctSuperMeta !== null && (
                    <p className="text-xs text-slate-400">{d.pctSuperMeta}%</p>
                  )}
                </div>
              </div>
            )}

            {/* ── BLOCO 6: Lista de profissionais ── */}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <span>👥</span> Profissionais ({profissionais.length})
              </p>
              <div className="space-y-2">
                {profissionais.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm">
                    Nenhum profissional com faturamento neste período
                  </div>
                ) : (
                  profissionais.map((prof: any, idx: number) => {
                    const pos = idx + 1;
                    const medalha = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
                    const pctProfMeta = prof.metaMensal && prof.metaMensal > 0
                      ? Math.round((prof.totalGeral / prof.metaMensal) * 100)
                      : null;
                    const profColor = pctProfMeta !== null ? getColor(pctProfMeta) : "#94a3b8";

                    return (
                      <div
                        key={prof.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/60 hover:border-slate-600 transition-all"
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
                        <Avatar nome={prof.nome} fotoUrl={prof.fotoUrl} size={38} />

                        {/* Informações */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-white truncate text-sm">
                            {prof.apelido || prof.nome.split(" ")[0]}
                          </div>

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

                          <div className="text-xs text-slate-500 flex gap-2 flex-wrap mt-0.5">
                            {prof.totalServicos > 0 && <span>{fmt(prof.totalServicos)}</span>}
                            {prof.totalProdutos > 0 && <span>· Prod: {fmt(prof.totalProdutos)}</span>}
                          </div>

                          {pctProfMeta !== null && prof.metaMensal > 0 && (
                            <div className="mt-1.5">
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-xs text-slate-500">Meta: {fmtShort(prof.metaMensal)}</span>
                                <span className="text-xs font-bold" style={{ color: profColor }}>{pctProfMeta}%</span>
                              </div>
                              <ProgressBar pct={pctProfMeta} color={profColor} />
                            </div>
                          )}
                        </div>

                        {/* Total */}
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-white text-sm">{fmt(prof.totalGeral)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
