import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Trophy, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProgressBar({ pct, atingiu, superMeta }: { pct: number; atingiu: boolean; superMeta: boolean }) {
  const width = Math.min(pct, 100);
  const color = superMeta
    ? "bg-gradient-to-r from-yellow-400 to-amber-500"
    : atingiu
    ? "bg-gradient-to-r from-green-400 to-emerald-500"
    : pct >= 80
    ? "bg-gradient-to-r from-blue-400 to-blue-500"
    : "bg-gradient-to-r from-slate-400 to-slate-500";

  return (
    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function PosicaoIcon({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-2xl">🥉</span>;
  return (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white/70">
      {pos}
    </div>
  );
}

interface Colaborador {
  id: number;
  nome: string;
  apelido: string | null;
  fotoUrl: string | null;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  metaProdutos: number;
  bonificacaoMeta: number;
  bonificacaoSuperMeta: number;
  superMetaPct: number;
  posicao: number;
  percentualMeta: number;
  atingiuMeta: boolean;
  atingiuSuperMeta: boolean;
  ultimaSyncEm: Date | null;
}

function ColaboradorCard({ col, pos }: { col: Colaborador; pos: number }) {
  const [expandido, setExpandido] = useState(false);
  const nome = col.apelido || col.nome;
  const iniciais = nome.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  const bgCard = col.atingiuSuperMeta
    ? "bg-gradient-to-br from-yellow-900/60 to-amber-900/40 border-yellow-500/40"
    : col.atingiuMeta
    ? "bg-gradient-to-br from-green-900/60 to-emerald-900/40 border-green-500/40"
    : "bg-white/5 border-white/10";

  const faltaMeta = col.metaProdutos > 0 ? col.metaProdutos - col.totalGeral : 0;
  const faltaSuperMeta = col.metaProdutos > 0 ? (col.metaProdutos * col.superMetaPct / 100) - col.totalGeral : 0;

  return (
    <div
      className={`rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${bgCard} ${pos <= 3 ? "shadow-lg" : ""}`}
      onClick={() => setExpandido(!expandido)}
    >
      <div className="flex items-center gap-3">
        <PosicaoIcon pos={pos} />

        {/* Avatar */}
        <div className="relative shrink-0">
          {col.fotoUrl ? (
            <img
              src={col.fotoUrl}
              alt={nome}
              className="w-11 h-11 rounded-full object-cover border-2 border-white/20"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-sm font-bold text-white border-2 border-white/20">
              {iniciais}
            </div>
          )}
          {col.atingiuSuperMeta && (
            <div className="absolute -top-1 -right-1 text-sm">⭐</div>
          )}
        </div>

        {/* Nome e progresso */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-white truncate">{nome}</p>
            <p className="text-sm font-bold text-white shrink-0">{fmtBRL(col.totalGeral)}</p>
          </div>
          {col.metaProdutos > 0 && (
            <>
              <ProgressBar pct={col.percentualMeta} atingiu={col.atingiuMeta} superMeta={col.atingiuSuperMeta} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-white/50">
                  Meta: {fmtBRL(col.metaProdutos)}
                </span>
                <span className={`text-xs font-medium ${col.atingiuSuperMeta ? "text-yellow-400" : col.atingiuMeta ? "text-green-400" : "text-white/70"}`}>
                  {col.percentualMeta.toFixed(0)}%
                </span>
              </div>
            </>
          )}
        </div>

        <div className="shrink-0 text-white/40">
          {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
          {/* Breakdown serviços + produtos */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-white/50 mb-0.5">Serviços</p>
              <p className="font-bold text-blue-300">{fmtBRL(col.totalServicos)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-white/50 mb-0.5">Produtos</p>
              <p className="font-bold text-purple-300">{fmtBRL(col.totalProdutos)}</p>
            </div>
            <div className="bg-white/5 rounded-lg p-2">
              <p className="text-white/50 mb-0.5">Total</p>
              <p className="font-bold text-white">{fmtBRL(col.totalGeral)}</p>
            </div>
          </div>

          {/* Bonificações */}
          {(col.bonificacaoMeta > 0 || col.bonificacaoSuperMeta > 0) && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              {col.bonificacaoMeta > 0 && (
                <div className="bg-green-900/30 rounded-lg p-2">
                  <p className="text-green-400/70 mb-0.5">Bonif. Meta</p>
                  <p className="font-bold text-green-400">{fmtBRL(col.bonificacaoMeta)}</p>
                </div>
              )}
              {col.bonificacaoSuperMeta > 0 && (
                <div className="bg-yellow-900/30 rounded-lg p-2">
                  <p className="text-yellow-400/70 mb-0.5">⭐ Super Meta ({col.superMetaPct}%)</p>
                  <p className="font-bold text-yellow-400">{fmtBRL(col.bonificacaoSuperMeta)}</p>
                </div>
              )}
            </div>
          )}

          {/* Status */}
          {col.atingiuSuperMeta && (
            <div className="bg-yellow-900/20 rounded-lg p-2 text-center text-xs">
              <p className="text-yellow-400 font-medium">⭐ Super Meta atingida!</p>
            </div>
          )}
          {col.atingiuMeta && !col.atingiuSuperMeta && (
            <div className="bg-green-900/20 rounded-lg p-2 text-center text-xs">
              <p className="text-green-400 font-medium">🎉 Meta atingida!</p>
              {faltaSuperMeta > 0 && (
                <p className="text-green-400/70 text-xs">Falta {fmtBRL(faltaSuperMeta)} para a Super Meta</p>
              )}
            </div>
          )}
          {!col.atingiuMeta && col.metaProdutos > 0 && (
            <div className="bg-white/5 rounded-lg p-2 text-center text-xs">
              <p className="text-white/60">Falta {fmtBRL(faltaMeta)} para a meta</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RankingPublico() {
  const hoje = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
  const [mes] = useState(hoje.getMonth() + 1);
  const [ano] = useState(hoje.getFullYear());
  const [empresaIdx, setEmpresaIdx] = useState(0);

  // Extrair tenant slug da URL: /ranking/:tenantSlug ou usar "barbiero-grupo" como padrão
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const tenantSlug = pathParts[1] || "barbiero-grupo";

  const rankingQuery = trpc.colaboradores.rankingPublico.useQuery(
    { tenantSlug, mes, ano },
    { refetchInterval: 5 * 60 * 1000 } // refetch a cada 5 min
  );

  const data = rankingQuery.data;
  const empresas = data?.empresas ?? [];
  const empresaAtual = empresas[empresaIdx];

  // Ordenar por totalGeral desc (serviços + produtos)
  const colaboradoresOrdenados = useMemo(() => {
    if (!empresaAtual) return [];
    return [...empresaAtual.colaboradores].sort((a, b) => b.totalGeral - a.totalGeral);
  }, [empresaAtual]);

  const totalFaturamento = colaboradoresOrdenados.reduce((s, c) => s + c.totalGeral, 0);
  const totalServicos = colaboradoresOrdenados.reduce((s, c) => s + c.totalServicos, 0);
  const totalProdutos = colaboradoresOrdenados.reduce((s, c) => s + c.totalProdutos, 0);
  const lider = colaboradoresOrdenados[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <span className="font-bold text-lg">Ranking</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/60">{MESES[mes - 1]} {ano}</span>
            <button
              onClick={() => rankingQuery.refetch()}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rankingQuery.isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">
        {rankingQuery.isLoading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-white/40" />
            <p className="text-white/50">Carregando ranking...</p>
          </div>
        )}

        {rankingQuery.isError && (
          <div className="text-center py-20">
            <p className="text-white/50">Não foi possível carregar o ranking.</p>
            <button onClick={() => rankingQuery.refetch()} className="mt-3 text-primary underline text-sm">
              Tentar novamente
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Seletor de empresa (se houver mais de uma) */}
            {empresas.length > 1 && (
              <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
                {empresas.map((e, i) => (
                  <button
                    key={e.empresaSlug}
                    onClick={() => setEmpresaIdx(i)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      i === empresaIdx
                        ? "bg-primary text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    }`}
                  >
                    {e.empresaNome}
                  </button>
                ))}
              </div>
            )}

            {empresaAtual && (
              <>
                {/* Stats do mês */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Serviços</p>
                    <p className="text-base font-bold text-blue-300">{fmtBRL(totalServicos)}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Produtos</p>
                    <p className="text-base font-bold text-purple-300">{fmtBRL(totalProdutos)}</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <p className="text-xs text-white/50 mb-1">Total</p>
                    <p className="text-base font-bold text-white">{fmtBRL(totalFaturamento)}</p>
                  </div>
                </div>

                {/* Pódio top 3 */}
                {colaboradoresOrdenados.length >= 3 && (
                  <div className="mt-5">
                    <div className="flex items-end justify-center gap-3 h-36">
                      {/* 2º lugar */}
                      {(() => {
                        const c = colaboradoresOrdenados[1];
                        const nome = c.apelido || c.nome;
                        return (
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-sm font-bold text-white border-2 border-slate-400/50">
                              {nome.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xs text-white/70 truncate max-w-[80px] text-center">{nome}</p>
                            <p className="text-xs font-bold text-white">{fmtBRL(c.totalGeral)}</p>
                            <div className="bg-slate-600/50 rounded-t-lg w-full h-16 flex items-center justify-center">
                              <span className="text-2xl">🥈</span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* 1º lugar */}
                      {(() => {
                        const c = colaboradoresOrdenados[0];
                        const nome = c.apelido || c.nome;
                        return (
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-base font-bold text-white border-2 border-yellow-400/70 shadow-lg shadow-yellow-500/20">
                              {nome.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xs text-yellow-300 truncate max-w-[80px] text-center font-medium">{nome}</p>
                            <p className="text-xs font-bold text-yellow-300">{fmtBRL(c.totalGeral)}</p>
                            <div className="bg-yellow-600/40 rounded-t-lg w-full h-24 flex items-center justify-center">
                              <span className="text-3xl">🥇</span>
                            </div>
                          </div>
                        );
                      })()}
                      {/* 3º lugar */}
                      {(() => {
                        const c = colaboradoresOrdenados[2];
                        const nome = c.apelido || c.nome;
                        return (
                          <div className="flex flex-col items-center gap-1 flex-1">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-700 to-amber-900 flex items-center justify-center text-sm font-bold text-white border-2 border-amber-700/50">
                              {nome.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xs text-white/70 truncate max-w-[80px] text-center">{nome}</p>
                            <p className="text-xs font-bold text-white">{fmtBRL(c.totalGeral)}</p>
                            <div className="bg-amber-800/40 rounded-t-lg w-full h-12 flex items-center justify-center">
                              <span className="text-2xl">🥉</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Lista completa */}
                <div className="mt-5 space-y-3">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-medium">
                    Classificação — {colaboradoresOrdenados.length} participantes
                  </p>
                  {colaboradoresOrdenados.map((col, idx) => (
                    <ColaboradorCard key={col.id} col={col} pos={idx + 1} />
                  ))}
                </div>

                {/* Última atualização */}
                {lider?.ultimaSyncEm && (
                  <p className="text-center text-xs text-white/30 mt-6">
                    Atualizado em {new Date(lider.ultimaSyncEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                  </p>
                )}
              </>
            )}

            {empresaAtual && colaboradoresOrdenados.length === 0 && (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 mx-auto mb-3 text-white/20" />
                <p className="text-white/40">Nenhum dado disponível para este mês.</p>
                <p className="text-white/30 text-xs mt-1">Aguarde a sincronização automática ou peça ao gerente para sincronizar.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
