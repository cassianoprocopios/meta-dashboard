import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Trophy,
  Medal,
  Scissors,
  TrendingUp,
  Users,
  Star,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

export default function RankingPublico() {
  const [, setLocation] = useLocation();
  const { data: profissionais, isLoading } = trpc.profissionais.listar.useQuery();

  const ativos = (profissionais ?? [])
    .filter((p) => p.ativo && p.exibirNoRanking)
    .sort((a, b) => (a.apelido ?? a.nome).localeCompare(b.apelido ?? b.nome));

  const total = ativos.length;

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
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
            <Badge variant="secondary" className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {total} profissional{total !== 1 ? "is" : ""}
            </Badge>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Carregando profissionais...</p>
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
              {ativos.length >= 3 && (
                <div className="mb-10">
                  <div className="flex items-end justify-center gap-4">
                    <PodiumCard posicao={2} profissional={ativos[1]} height="h-28" bgColor="bg-slate-400/20 border-slate-400/40" iconColor="text-slate-400" />
                    <PodiumCard posicao={1} profissional={ativos[0]} height="h-36" bgColor="bg-yellow-500/20 border-yellow-500/40" iconColor="text-yellow-500" />
                    <PodiumCard posicao={3} profissional={ativos[2]} height="h-20" bgColor="bg-amber-700/20 border-amber-700/40" iconColor="text-amber-700" />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Todos os profissionais
                </h2>
                {ativos.map((p, idx) => {
                  const nome = p.apelido ?? p.nome;
                  const iniciais = nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
                  const posicao = idx + 1;
                  const isPodium = posicao <= 3;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                        posicao === 1 ? "bg-yellow-500/5 border-yellow-500/20"
                        : posicao === 2 ? "bg-slate-400/5 border-slate-400/20"
                        : posicao === 3 ? "bg-amber-700/5 border-amber-700/20"
                        : "bg-card border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold shrink-0 ${
                        posicao === 1 ? "bg-yellow-500/20 text-yellow-600"
                        : posicao === 2 ? "bg-slate-400/20 text-slate-500"
                        : posicao === 3 ? "bg-amber-700/20 text-amber-700"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {isPodium ? (
                          posicao === 1 ? <Trophy className="h-4 w-4 text-yellow-500" />
                          : <Medal className={`h-4 w-4 ${posicao === 2 ? "text-slate-400" : "text-amber-700"}`} />
                        ) : posicao}
                      </div>

                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        {p.fotoUrl ? (
                          <img src={p.fotoUrl} alt={nome} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-primary">{iniciais}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">{nome}</p>
                        <p className="text-xs text-muted-foreground truncate">{p.cargo ?? "Profissional"}</p>
                      </div>

                      {isPodium && (
                        <Badge variant="secondary" className={`shrink-0 text-xs ${
                          posicao === 1 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                          : posicao === 2 ? "bg-slate-400/10 text-slate-500 border-slate-400/20"
                          : "bg-amber-700/10 text-amber-700 border-amber-700/20"
                        }`}>
                          {posicao === 1 ? <><Star className="h-3 w-3 mr-1 inline" /> 1º lugar</> : posicao === 2 ? "2º lugar" : "3º lugar"}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Exibindo {total} profissional{total !== 1 ? "is" : ""} ativos no ranking.
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
  profissional: { id: number; nome: string; apelido?: string | null; cargo?: string | null; fotoUrl?: string | null };
  height: string; bgColor: string; iconColor: string;
}) {
  const nome = profissional.apelido ?? profissional.nome;
  const iniciais = nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 w-28">
      <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
        {profissional.fotoUrl ? (
          <img src={profissional.fotoUrl} alt={nome} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{iniciais}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-center text-foreground leading-tight line-clamp-2">{nome}</p>
      <div className={`w-full ${height} rounded-t-lg border-2 ${bgColor} flex items-center justify-center`}>
        {posicao === 1 ? <Trophy className={`h-8 w-8 ${iconColor}`} /> : <Medal className={`h-6 w-6 ${iconColor}`} />}
      </div>
      <div className={`text-lg font-black ${iconColor}`}>{posicao}º</div>
    </div>
  );
}
