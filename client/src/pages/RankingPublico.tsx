import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronDown,
  Package,
  Wrench,
  Building2,
  Crown,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ─── Tipos ──────────────────────────────────────────────────────────────────
const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type CategoriaRanking = "barbeiro" | "auxiliar" | "recepcao";
type AbaRanking = "barbeiros" | "auxiliares" | "unidade" | "produtos" | "mascote" | "morumbi";

type Profissional = {
  id: number;
  nome: string;
  apelido?: string | null;
  fotoUrl?: string | null;
  cargo?: string | null;
  empresaSlug: string;
  categoriaRanking: CategoriaRanking;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  temDados: boolean;
  detalhesServicos?: string | null;
  detalhesProdutos?: string | null;
};

type ServicoDetalhe = { ser_nome: string; sum: number; count?: number };
type ProdutoDetalhe = { pro_nome: string; sum: number; count?: number };

function parseDetalhes(json: string | null | undefined): ServicoDetalhe[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => s && typeof s.ser_nome === "string" && typeof s.sum === "number");
  } catch { return []; }
}

function parseProdutos(json: string | null | undefined): ProdutoDetalhe[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p) => p && typeof p.pro_nome === "string" && typeof p.sum === "number");
  } catch { return []; }
}

function nomeUnidade(slug: string): string {
  if (slug.includes("morumbi")) return "Morumbi";
  if (slug.includes("mascote")) return "Mascote";
  if (slug.includes("seraphine")) return "Seraphine";
  return slug;
}

function corUnidadeBadge(slug: string): string {
  if (slug.includes("morumbi")) return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  if (slug.includes("mascote")) return "bg-purple-500/10 text-purple-500 border-purple-500/20";
  if (slug.includes("seraphine")) return "bg-rose-500/10 text-rose-500 border-rose-500/20";
  return "bg-muted text-muted-foreground";
}

// ─── Modal de Detalhamento ───────────────────────────────────────────────────
function ModalDetalhes({ profissional, open, onClose }: {
  profissional: Profissional | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!profissional) return null;
  const nome = profissional.apelido ?? profissional.nome;
  const servicos = parseDetalhes(profissional.detalhesServicos);
  const produtos = parseProdutos(profissional.detalhesProdutos);
  const totalServicosDetalhado = servicos.reduce((acc, s) => acc + s.sum, 0);
  const totalProdutosDetalhado = produtos.reduce((acc, p) => acc + p.sum, 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4 text-primary" />
            Detalhamento — {nome}
            <Badge variant="outline" className={`text-xs ml-auto ${corUnidadeBadge(profissional.empresaSlug)}`}>
              {nomeUnidade(profissional.empresaSlug)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Serviços</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(profissional.totalServicos)}</p>
          </div>
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Produtos</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(profissional.totalProdutos)}</p>
          </div>
          <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/10 p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total</p>
            <p className="text-sm font-bold text-foreground">{formatCurrency(profissional.totalGeral)}</p>
          </div>
        </div>

        {/* Serviços contabilizados */}
        {servicos.length > 0 ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Serviços contabilizados ({servicos.length})
              </p>
            </div>
            <div className="space-y-1">
              {servicos.sort((a, b) => b.sum - a.sum).map((s, i) => {
                const pct = totalServicosDetalhado > 0 ? (s.sum / totalServicosDetalhado) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/40">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground truncate">{s.ser_nome}</p>
                        {s.count != null && s.count > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{s.count}x</span>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div className="h-1 rounded-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-foreground shrink-0">{formatCurrency(s.sum)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <Wrench className="h-6 w-6 mx-auto mb-2 opacity-30" />
            <p className="text-xs">Detalhamento de serviços não disponível. Execute uma nova sincronização.</p>
          </div>
        )}

        {/* Produtos por item */}
        <div className="mt-3">
          <div className="flex items-center gap-2 mb-2">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Produtos ({produtos.length > 0 ? produtos.length : "—"})
            </p>
          </div>
          {produtos.length > 0 ? (
            <div className="space-y-1">
              {produtos.sort((a, b) => b.sum - a.sum).map((p, i) => {
                const pct = totalProdutosDetalhado > 0 ? (p.sum / totalProdutosDetalhado) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground truncate">{p.pro_nome}</p>
                        {p.count != null && p.count > 0 && (
                          <span className="text-[10px] text-muted-foreground ml-1 shrink-0">{p.count}x</span>
                        )}
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 mt-1">
                        <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                    <p className="text-xs font-semibold text-emerald-600 shrink-0">{formatCurrency(p.sum)}</p>
                  </div>
                );
              })}
            </div>
          ) : profissional.totalProdutos > 0 ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Package className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-foreground flex-1">Total em produtos</p>
              <p className="text-xs font-semibold text-emerald-600">{formatCurrency(profissional.totalProdutos)}</p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic px-2">Nenhum produto vendido neste período.</p>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-3 pt-3 border-t">
          Excluídos: Corte de Cabelo, Barba, Corte Kids, Raspar na Máquina (serviços) · Caixinha, Água, Heineken, Refrigerante, Corona (produtos)
        </p>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de Profissional (lista) ────────────────────────────────────────────
function CardProfissional({ p, idx, campo, temDadosNoMes, onDetalhar }: {
  p: Profissional;
  idx: number;
  campo: "totalGeral" | "totalProdutos";
  temDadosNoMes: boolean;
  onDetalhar: () => void;
}) {
  const nome = p.apelido ?? p.nome;
  const iniciais = nome.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase();
  const posicao = idx + 1;
  const isPodium = posicao <= 3 && temDadosNoMes;
  const listaRef = campo === "totalGeral" ? p.totalGeral : p.totalProdutos;
  const temDetalhes = p.temDados && (!!p.detalhesServicos || !!p.detalhesProdutos);

  return (
    <div
      onClick={() => p.temDados && onDetalhar()}
      className={`flex items-center gap-3 p-4 rounded-xl border transition-colors ${
        p.temDados ? "cursor-pointer" : ""
      } ${
        isPodium && posicao === 1 ? "bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10"
        : isPodium && posicao === 2 ? "bg-slate-400/5 border-slate-400/20 hover:bg-slate-400/10"
        : isPodium && posicao === 3 ? "bg-amber-700/5 border-amber-700/20 hover:bg-amber-700/10"
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="font-semibold text-foreground truncate">{nome}</p>
            {temDetalhes && <Wrench className="h-3 w-3 text-muted-foreground shrink-0" />}
          </div>
          <div className="text-right shrink-0">
            {p.temDados ? (
              <p className="text-sm font-bold text-foreground">{formatCurrency(listaRef)}</p>
            ) : (
              <p className="text-xs text-muted-foreground italic">sem dados</p>
            )}
          </div>
        </div>
        {p.temDados && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${corUnidadeBadge(p.empresaSlug)}`}>
              {nomeUnidade(p.empresaSlug)}
            </Badge>
            {campo === "totalGeral" ? (
              <span className="text-xs text-muted-foreground">
                Serv: {formatCurrency(p.totalServicos)} · Prod: {formatCurrency(p.totalProdutos)}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                Serv: {formatCurrency(p.totalServicos)} · Total: {formatCurrency(p.totalGeral)}
              </span>
            )}
          </div>
        )}
        {!p.temDados && <p className="text-xs text-muted-foreground">{p.cargo ?? "Profissional"}</p>}
      </div>

      {isPodium ? (
        <Badge variant="secondary" className={`shrink-0 text-xs hidden sm:flex items-center gap-1 ${
          posicao === 1 ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          : posicao === 2 ? "bg-slate-400/10 text-slate-500 border-slate-400/20"
          : "bg-amber-700/10 text-amber-700 border-amber-700/20"
        }`}>
          {posicao === 1 ? <><Star className="h-3 w-3" /> 1º lugar</> : posicao === 2 ? "2º lugar" : "3º lugar"}
        </Badge>
      ) : p.temDados ? (
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 -rotate-90" />
      ) : null}
    </div>
  );
}

// ─── Aba Por Unidade ─────────────────────────────────────────────────────────
function RankingUnidade({ lista }: { lista: Profissional[] }) {
  const unidades = useMemo(() => {
    const map: Record<string, { slug: string; totalServicos: number; totalProdutos: number; totalGeral: number; profissionais: number }> = {};
    for (const p of lista) {
      if (!p.temDados) continue;
      if (!map[p.empresaSlug]) {
        map[p.empresaSlug] = { slug: p.empresaSlug, totalServicos: 0, totalProdutos: 0, totalGeral: 0, profissionais: 0 };
      }
      map[p.empresaSlug].totalServicos += p.totalServicos;
      map[p.empresaSlug].totalProdutos += p.totalProdutos;
      map[p.empresaSlug].totalGeral += p.totalGeral;
      map[p.empresaSlug].profissionais++;
    }
    return Object.values(map).sort((a, b) => b.totalGeral - a.totalGeral);
  }, [lista]);

  const max = Math.max(...unidades.map(u => u.totalGeral), 1);

  if (unidades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground text-sm">Nenhum dado de unidade disponível para este período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unidades.map((u, i) => (
        <div key={u.slug} className={`rounded-xl border p-5 ${
          i === 0 ? "bg-yellow-500/5 border-yellow-500/20"
          : i === 1 ? "bg-slate-400/5 border-slate-400/20"
          : "bg-amber-700/5 border-amber-700/20"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-9 h-9 flex items-center justify-center rounded-full text-sm font-bold ${
              i === 0 ? "bg-yellow-500/20 text-yellow-600"
              : i === 1 ? "bg-slate-400/20 text-slate-500"
              : "bg-amber-700/20 text-amber-700"
            }`}>
              {i === 0 ? <Crown className="h-5 w-5 text-yellow-500" /> : <Medal className={`h-5 w-5 ${i === 1 ? "text-slate-400" : "text-amber-700"}`} />}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-bold text-foreground text-lg">{nomeUnidade(u.slug)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{u.profissionais} profissional(is) com dados</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-xl ${i === 0 ? "text-yellow-600" : "text-foreground"}`}>{formatCurrency(u.totalGeral)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-primary/5 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Serviços</p>
              <p className="text-sm font-semibold text-foreground">{formatCurrency(u.totalServicos)}</p>
            </div>
            <div className="bg-emerald-500/5 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Produtos</p>
              <p className="text-sm font-semibold text-emerald-600">{formatCurrency(u.totalProdutos)}</p>
            </div>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${i === 0 ? "bg-yellow-500" : i === 1 ? "bg-slate-400" : "bg-amber-600"}`}
              style={{ width: `${(u.totalGeral / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Pódio ───────────────────────────────────────────────────────────────────
function PodiumCard({ posicao, profissional, height, bgColor, iconColor, campo, onDetalhar }: {
  posicao: number;
  profissional: Profissional;
  height: string; bgColor: string; iconColor: string;
  campo: "totalGeral" | "totalProdutos";
  onDetalhar: () => void;
}) {
  const nome = profissional.apelido ?? profissional.nome;
  const iniciais = nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  const valor = campo === "totalGeral" ? profissional.totalGeral : profissional.totalProdutos;

  return (
    <div className="flex flex-col items-center gap-1 w-28 cursor-pointer" onClick={onDetalhar}>
      <div className="h-14 w-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
        {profissional.fotoUrl ? (
          <img src={profissional.fotoUrl} alt={nome} className="h-14 w-14 rounded-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-primary">{iniciais}</span>
        )}
      </div>
      <p className="text-xs font-semibold text-center text-foreground leading-tight line-clamp-2">{nome}</p>
      <p className="text-xs font-bold text-center text-primary">{formatCurrency(valor)}</p>
      <div className={`w-full ${height} rounded-t-lg border-2 ${bgColor} flex items-center justify-center`}>
        {posicao === 1 ? <Trophy className={`h-8 w-8 ${iconColor}`} /> : <Medal className={`h-6 w-6 ${iconColor}`} />}
      </div>
      <div className={`text-lg font-black ${iconColor}`}>{posicao}º</div>
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function RankingPublico() {
  const [, setLocation] = useLocation();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaRanking>("barbeiros");

  const { data: rankingData, isLoading } = trpc.profissionais.ranking.useQuery(
    { mes, ano },
    { staleTime: 60_000 }
  );
  const ranking = (rankingData?.lista ?? []) as Profissional[];
  const ultimaAtualizacao: Date | null = rankingData?.ultimaAtualizacao ?? null;
  const { data: periodos } = trpc.profissionais.periodos.useQuery();

  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    (periodos ?? []).forEach((p: { mes: number; ano: number }) => set.add(p.ano));
    [hoje.getFullYear(), hoje.getFullYear() - 1, hoje.getFullYear() - 2].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [periodos]);

  // Filtros por categoria
  const barbeiros = useMemo(() => ranking.filter(p => p.categoriaRanking === "barbeiro"), [ranking]);
  const auxiliares = useMemo(() => ranking.filter(p => p.categoriaRanking === "auxiliar"), [ranking]);
  // Ranking de produtos: todos (incluindo recepção), ordenado por totalProdutos
  const rankingProdutos = useMemo(() =>
    [...ranking].sort((a, b) => b.totalProdutos - a.totalProdutos),
    [ranking]
  );
  // Rankings por unidade (apenas barbeiros de cada unidade)
  const barbeirosMAscote = useMemo(() => ranking.filter(p => p.categoriaRanking === "barbeiro" && p.empresaSlug.includes("mascote")), [ranking]);
  const barbeirosMoreumbi = useMemo(() => ranking.filter(p => p.categoriaRanking === "barbeiro" && p.empresaSlug.includes("morumbi")), [ranking]);

  const temDadosNoMes = ranking.some(p => p.temDados);
  const isPeriodoAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
  const podeAvancar = !isPeriodoAtual;

  function navegarMes(direcao: -1 | 1) {
    let novoMes = mes + direcao;
    let novoAno = ano;
    if (novoMes < 1) { novoMes = 12; novoAno -= 1; }
    if (novoMes > 12) { novoMes = 1; novoAno += 1; }
    if (novoAno > hoje.getFullYear() || (novoAno === hoje.getFullYear() && novoMes > hoje.getMonth() + 1)) return;
    setMes(novoMes);
    setAno(novoAno);
  }

  // Lista e campo para a aba ativa
  const listaAtiva = abaAtiva === "barbeiros" ? barbeiros
    : abaAtiva === "auxiliares" ? auxiliares
    : abaAtiva === "produtos" ? rankingProdutos
    : abaAtiva === "mascote" ? barbeirosMAscote
    : abaAtiva === "morumbi" ? barbeirosMoreumbi
    : rankingProdutos;
  const campoAtivo: "totalGeral" | "totalProdutos" = abaAtiva === "produtos" ? "totalProdutos" : "totalGeral";

  const abas: { id: AbaRanking; label: string; icon: React.ReactNode; count: number }[] = [
    { id: "barbeiros", label: "Barbeiros", icon: <Scissors className="h-3.5 w-3.5" />, count: barbeiros.length },
    { id: "auxiliares", label: "Auxiliares", icon: <Star className="h-3.5 w-3.5" />, count: auxiliares.length },
    { id: "mascote", label: "Mascote", icon: <Building2 className="h-3.5 w-3.5" />, count: barbeirosMAscote.length },
    { id: "morumbi", label: "Morumbi", icon: <Building2 className="h-3.5 w-3.5" />, count: barbeirosMoreumbi.length },
    { id: "unidade", label: "Por Unidade", icon: <TrendingUp className="h-3.5 w-3.5" />, count: 0 },
    { id: "produtos", label: "Produtos", icon: <Package className="h-3.5 w-3.5" />, count: rankingProdutos.filter(p => p.totalProdutos > 0).length },
  ];

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
                  {new Date(ultimaAtualizacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {ranking.length} profissional{ranking.length !== 1 ? "is" : ""}
              </Badge>
            </div>
          </div>

          {/* Abas */}
          <div className="flex border-t border-border/50 px-4 max-w-5xl mx-auto overflow-x-auto">
            {abas.map((aba) => (
              <button
                key={aba.id}
                onClick={() => setAbaAtiva(aba.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-all ${
                  abaAtiva === aba.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {aba.icon}
                {aba.label}
                {aba.count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${abaAtiva === aba.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {aba.count}
                  </span>
                )}
              </button>
            ))}
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
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarMes(-1)}>
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
                      <SelectItem key={m} value={String(m)} disabled={futuro}>{nome}</SelectItem>
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
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarMes(1)} disabled={!podeAvancar}>
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
          {!isLoading && !temDadosNoMes && ranking.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-6">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600">Sem dados de faturamento para {MESES[mes - 1]} de {ano}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Execute a sincronização com o CashBarber para importar os dados deste período.</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Carregando ranking...</p>
            </div>
          ) : abaAtiva === "unidade" ? (
            <RankingUnidade lista={ranking} />
          ) : listaAtiva.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Nenhum profissional nesta categoria</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure a categoria dos profissionais no painel de gerenciamento.
                </p>
              </div>
              <Button variant="outline" onClick={() => setLocation("/profissionais")}>
                <Scissors className="h-4 w-4 mr-2" />
                Gerenciar Profissionais
              </Button>
            </div>
          ) : (
            <>
              {/* Pódio top 3 */}
              {temDadosNoMes && listaAtiva.length >= 3 && (
                <div className="mb-10">
                  <div className="flex items-end justify-center gap-4">
                    <PodiumCard posicao={2} profissional={listaAtiva[1]} height="h-28" bgColor="bg-slate-400/20 border-slate-400/40" iconColor="text-slate-400" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[1])} />
                    <PodiumCard posicao={1} profissional={listaAtiva[0]} height="h-36" bgColor="bg-yellow-500/20 border-yellow-500/40" iconColor="text-yellow-500" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[0])} />
                    <PodiumCard posicao={3} profissional={listaAtiva[2]} height="h-20" bgColor="bg-amber-700/20 border-amber-700/40" iconColor="text-amber-700" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[2])} />
                  </div>
                </div>
              )}

              {/* Dica */}
              {temDadosNoMes && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <ChevronDown className="h-3 w-3" />
                  Clique em qualquer profissional para ver o detalhamento
                </div>
              )}

              {/* Label da aba */}
              <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {abaAtiva === "barbeiros" && `Barbeiros — ${MESES[mes - 1]} ${ano}`}
                {abaAtiva === "auxiliares" && `Auxiliares — ${MESES[mes - 1]} ${ano}`}
                {abaAtiva === "produtos" && `Ranking de Produtos — ${MESES[mes - 1]} ${ano}`}
                {abaAtiva === "mascote" && `Barbeiros Mascote — ${MESES[mes - 1]} ${ano}`}
                {abaAtiva === "morumbi" && `Barbeiros Morumbi — ${MESES[mes - 1]} ${ano}`}
              </h2>

              {/* Lista */}
              <div className="space-y-2">
                {listaAtiva.map((p, idx) => (
                  <CardProfissional
                    key={p.id}
                    p={p}
                    idx={idx}
                    campo={campoAtivo}
                    temDadosNoMes={temDadosNoMes}
                    onDetalhar={() => setProfissionalSelecionado(p)}
                  />
                ))}
              </div>

              {/* Rodapé */}
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {temDadosNoMes
                    ? `Faturamento de ${MESES[mes - 1]} de ${ano}`
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

      {/* Modal de detalhamento */}
      <ModalDetalhes
        profissional={profissionalSelecionado}
        open={!!profissionalSelecionado}
        onClose={() => setProfissionalSelecionado(null)}
      />
    </DashboardLayout>
  );
}
