import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Scissors,
  TrendingUp,
  Users,
  Star,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Clock,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function RankingPublico() {
  const [, setLocation] = useLocation();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());

  const { data: rankingData, isLoading } = trpc.profissionais.ranking.useQuery(
    { mes, ano },
    { staleTime: 60_000 }
  );
  const ranking = rankingData?.lista;
  const ultimaAtualizacao: Date | null = rankingData?.ultimaAtualizacao ?? null;
  const { data: periodos } = trpc.profissionais.periodos.useQuery();

  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    (periodos ?? []).forEach((p: { mes: number; ano: number }) => set.add(p.ano));
    // Sempre inclui o ano atual e os 2 anteriores
    [hoje.getFullYear(), hoje.getFullYear() - 1, hoje.getFullYear() - 2].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [periodos]);

  const total = ranking?.length ?? 0;
  const temDadosNoMes = (ranking ?? []).some((p: { temDados: boolean }) => p.temDados);
  const isPeriodoAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();

  function navegarMes(direcao: -1 | 1) {
    let novoMes = mes + direcao;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
    if (novoMes > 12) { novoMes = 1; novoAno += 1; }
    if (novoAno > hoje.getFullYear() || (novoAno === hoje.getFullYear() && novoMes > hoje.getMonth() + 1)) return;
    setMes(novoMes);
    setAno(novoAno);
  }

  const podeAvancar = !(mes === hoje.getMonth() + 1 && ano === hoje.getFullYear());

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        {/* Header fixo */}
        <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3 max-w-5xl mx-auto">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLocation("/")}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar ao Dashboard</span>
                <span className="sm:hidden">Voltar</span>
              </Button>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <h1 className="text-base font-semibold">Ranking de Profissionais</h1>
              </div>
            </div>
              <div className="flex items-center gap-3">
              {ultimaAtualizacao && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Atualizado em {new Date(ultimaAtualizacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {total} profissional{total !== 1 ? "is" : ""}
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-6">
          {/* Filtros de período */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-4 rounded-xl border bg-card">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Calendar className="h-4 w-4 text-primary" />
              Período de referência
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navegarMes(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <Select value={String(mes)} onValueChange={(v) => setMes(Number(v))}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((nome, idx) => {
                    const m = idx + 1;
                    const futuro = ano === hoje.getFullYear() && m > hoje.getMonth() + 1;
                    return (
                      <SelectItem key={m} value={String(m)} disabled={futuro}>
                        {nome}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select value={String(ano)} onValueChange={(v) => setAno(Number(v))}>
                <SelectTrigger className="w-24 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => navegarMes(1)}
                disabled={!podeAvancar}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>

              {!isPeriodoAtual && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-primary"
                  onClick={() => { setMes(hoje.getMonth() + 1); setAno(hoje.getFullYear()); }}
                >
                  Mês atual
                </Button>
              )}
            </div>
          </div>

          {/* Aviso sem dados */}
          {!isLoading && !temDadosNoMes && total > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-6">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600">Sem dados de faturamento para {MESES[mes - 1]} de {ano}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Execute a sincronização com o CashBarber para importar os dados deste período. Os profissionais são exibidos em ordem alfabética.
                </p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Carregando ranking...</p>
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Scissors className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Nenhum profissional no ranking</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Cadastre profissionais e ative a opção "Exibir no Ranking" para que apareçam aqui.
                </p>
              </div>
              <Button variant="outline" onClick={() => setLocation("/profissionais")}>
                <Scissors className="h-4 w-4 mr-2" />
                Gerenciar Profissionais
              </Button>
            </div>
          ) : (
            <>
              {/* Pódio top 3 (só quando tem dados reais) */}
              {temDadosNoMes && ranking && ranking.length >= 3 && (
                <div className="mb-10">
                  <div className="flex items-end justify-center gap-4">
                    <PodiumCard posicao={2} profissional={ranking[1]} height="h-28" bgColor="bg-slate-400/20 border-slate-400/40" iconColor="text-slate-400" />
                    <PodiumCard posicao={1} profissional={ranking[0]} height="h-36" bgColor="bg-yellow-500/20 border-yellow-500/40" iconColor="text-yellow-500" />
                    <PodiumCard posicao={3} profissional={ranking[2]} height="h-20" bgColor="bg-amber-700/20 border-amber-700/40" iconColor="text-amber-700" />
                  </div>
                </div>
              )}

              {/* Lista completa */}
              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {temDadosNoMes ? `Ranking — ${MESES[mes - 1]} ${ano}` : `Profissionais — ${MESES[mes - 1]} ${ano} (sem dados)`}
                </h2>

                  {(ranking ?? []).map((p: { id: number; nome: string; apelido?: string | null; fotoUrl?: string | null; cargo?: string | null; totalServicos: number; totalProdutos: number; totalGeral: number; temDados: boolean }, idx: number) => {
                  const nome = p.apelido ?? p.nome;
                  const iniciais = nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
                  const posicao = idx + 1;
                  const isPodium = posicao <= 3 && temDadosNoMes;
                  const maxGeral = ranking?.[0]?.totalGeral ?? 1;
                  const pct = maxGeral > 0 ? Math.round((p.totalGeral / maxGeral) * 100) : 0;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
                        isPodium && posicao === 1 ? "bg-yellow-500/5 border-yellow-500/20"
                        : isPodium && posicao === 2 ? "bg-slate-400/5 border-slate-400/20"
                        : isPodium && posicao === 3 ? "bg-amber-700/5 border-amber-700/20"
                        : "bg-card border-border hover:bg-accent/30"
                      }`}
                    >
                      {/* Posição */}
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                        isPodium && posicao === 1 ? "bg-yellow-500/20 text-yellow-600"
                        : isPodium && posicao === 2 ? "bg-slate-400/20 text-slate-500"
                        : isPodium && posicao === 3 ? "bg-amber-700/20 text-amber-700"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {isPodium ? (
                          posicao === 1 ? <Trophy className="h-4 w-4 text-yellow-500" />
                          : <Medal className={`h-4 w-4 ${posicao === 2 ? "text-slate-400" : "text-amber-700"}`} />
                        ) : posicao}
                      </div>

                      {/* Avatar */}
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt={nome} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-primary">{iniciais}</span>
                        )}
                      </div>

                      {/* Info + barra de progresso */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-semibold text-foreground truncate">{nome}</p>
                          <div className="text-right shrink-0">
                            {p.temDados ? (
                              <p className="text-sm font-bold text-foreground">{formatCurrency(p.totalGeral)}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">sem dados</p>
                            )}
                          </div>
                        </div>
                        {p.temDados && (
                          <>
                            <div className="w-full bg-muted rounded-full h-1.5 mb-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  posicao === 1 ? "bg-yellow-500"
                                  : posicao === 2 ? "bg-slate-400"
                                  : posicao === 3 ? "bg-amber-600"
                                  : "bg-primary"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span>Serv: {formatCurrency(p.totalServicos)}</span>
                              <span>Prod: {formatCurrency(p.totalProdutos)}</span>
                            </div>
                          </>
                        )}
                        {!p.temDados && (
                          <p className="text-xs text-muted-foreground">{p.cargo ?? "Profissional"}</p>
                        )}
                      </div>

                      {/* Badge top 3 */}
                      {isPodium && (
                        <Badge variant="secondary" className={`shrink-0 text-xs hidden sm:flex items-center gap-1 ${
                          posicao === 1 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          : posicao === 2 ? "bg-slate-400/10 text-slate-500 border-slate-400/20"
                          : "bg-amber-700/10 text-amber-700 border-amber-700/20"
                        }`}>
                          {posicao === 1 ? <><Star className="h-3 w-3" /> 1º lugar</> : posicao === 2 ? "2º lugar" : "3º lugar"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rodapé */}
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {temDadosNoMes
                    ? `Faturamento de ${MESES[mes - 1]} de ${ano} — ${total} profissional${total !== 1 ? "is" : ""}`
                    : `Sem dados de faturamento para ${MESES[mes - 1]} de ${ano}`}
                </p>
                <Button variant="outline" size="sm" onClick={() => setLocation("/profissionais")} className="flex items-center gap-2">
                  <Scissors className="h-3.5 w-3.5" />
                  Gerenciar Profissionais
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function PodiumCard({
  posicao, profissional, height, bgColor, iconColor,
}: {
  posicao: number;
  profissional: { id: number; nome: string; apelido?: string | null; cargo?: string | null; fotoUrl?: string | null; totalGeral: number };
  height: string; bgColor: string; iconColor: string;
}) {
  const nome = profissional.apelido ?? profissional.nome;
  const iniciais = nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col items-center gap-1 w-28">
      <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
        {profissional.fotoUrl ? (
          <img src={profissional.fotoUrl} alt={nome} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{iniciais}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-center text-foreground leading-tight line-clamp-2">{nome}</p>
      <p className="text-xs font-bold text-center text-primary">{formatCurrency(profissional.totalGeral)}</p>
      <div className={`w-full ${height} rounded-t-lg border-2 ${bgColor} flex items-center justify-center`}>
        {posicao === 1 ? <Trophy className={`h-8 w-8 ${iconColor}`} /> : <Medal className={`h-6 w-6 ${iconColor}`} />}
      </div>
      <div className={`text-lg font-black ${iconColor}`}>{posicao}º</div>
    </div>
  );
}
