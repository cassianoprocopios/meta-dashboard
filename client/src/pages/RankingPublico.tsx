import { useState, useMemo, useCallback, useRef } from "react";
import html2canvas from "html2canvas";
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
  Sun,
  CalendarDays,
  CalendarRange,
  RefreshCw,
  Share2,
  Download,
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
type ModoVisualizacao = "mensal" | "diario" | "semanal";

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
  qtdServicos?: number;
  qtdProdutos?: number;
  temDados: boolean;
  detalhesServicos?: string | null;
  detalhesProdutos?: string | null;
  metaMensal?: number | null;
  pctMeta?: number | null;
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
                {p.pctMeta != null && (
                  <span className={`ml-1.5 font-semibold ${
                    p.pctMeta >= 100 ? 'text-emerald-500' : p.pctMeta >= 80 ? 'text-yellow-500' : 'text-red-400'
                  }`}>· {p.pctMeta}% da meta</span>
                )}
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
type HistoricoUnidade = {
  mes: number;
  ano: number;
  empresaSlug: string;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  profissionais: number;
};

function RankingUnidade({ lista, historico }: { lista: Profissional[]; historico: HistoricoUnidade[] }) {
  const unidades = useMemo(() => {
    const map: Record<string, {
      slug: string;
      totalServicos: number;
      totalProdutos: number;
      totalGeral: number;
      profissionais: number;
      top: Profissional[];
    }> = {};
    for (const p of lista) {
      if (!p.temDados) continue;
      if (!map[p.empresaSlug]) {
        map[p.empresaSlug] = { slug: p.empresaSlug, totalServicos: 0, totalProdutos: 0, totalGeral: 0, profissionais: 0, top: [] };
      }
      map[p.empresaSlug].totalServicos += p.totalServicos;
      map[p.empresaSlug].totalProdutos += p.totalProdutos;
      map[p.empresaSlug].totalGeral += p.totalGeral;
      map[p.empresaSlug].profissionais++;
      map[p.empresaSlug].top.push(p);
    }
    // Ordenar top por totalGeral desc
    for (const u of Object.values(map)) {
      u.top.sort((a, b) => b.totalGeral - a.totalGeral);
    }
    return Object.values(map).sort((a, b) => b.totalGeral - a.totalGeral);
  }, [lista]);

  const max = Math.max(...unidades.map(u => u.totalGeral), 1);

  // Comparativo direto Mascote vs Morumbi
  const mascote = unidades.find(u => u.slug.includes("mascote"));
  const morumbi = unidades.find(u => u.slug.includes("morumbi"));

  if (unidades.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground text-sm">Nenhum dado de unidade disponível para este período.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Comparativo lado a lado */}
      {mascote && morumbi && (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Comparativo de Unidades
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Mascote */}
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-purple-500" />
                <span className="font-bold text-purple-600">Mascote</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(mascote.totalGeral)}</p>
              <p className="text-xs text-muted-foreground mt-1">{mascote.profissionais} profissionais</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Serviços</span>
                  <span className="font-medium">{formatCurrency(mascote.totalServicos)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Produtos</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(mascote.totalProdutos)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Média/prof.</span>
                  <span className="font-medium">{formatCurrency(mascote.totalGeral / mascote.profissionais)}</span>
                </div>
              </div>
            </div>
            {/* Morumbi */}
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-blue-500" />
                <span className="font-bold text-blue-600">Morumbi</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(morumbi.totalGeral)}</p>
              <p className="text-xs text-muted-foreground mt-1">{morumbi.profissionais} profissionais</p>
              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Serviços</span>
                  <span className="font-medium">{formatCurrency(morumbi.totalServicos)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Produtos</span>
                  <span className="font-medium text-emerald-600">{formatCurrency(morumbi.totalProdutos)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Média/prof.</span>
                  <span className="font-medium">{formatCurrency(morumbi.totalGeral / morumbi.profissionais)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Barra comparativa */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-600 w-16 text-right">Mascote</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{ width: `${(mascote.totalGeral / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-24 text-right">{formatCurrency(mascote.totalGeral)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 w-16 text-right">Morumbi</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{ width: `${(morumbi.totalGeral / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium w-24 text-right">{formatCurrency(morumbi.totalGeral)}</span>
            </div>
          </div>
          {/* Vencedor */}
          {mascote.totalGeral !== morumbi.totalGeral && (
            <div className={`mt-4 rounded-lg p-3 text-center text-sm font-semibold ${
              mascote.totalGeral > morumbi.totalGeral
                ? "bg-purple-500/10 text-purple-600 border border-purple-500/20"
                : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
            }`}>
              <Crown className="h-4 w-4 inline mr-1.5" />
              {mascote.totalGeral > morumbi.totalGeral ? "Mascote" : "Morumbi"} lidera este mês
              {" — "}
              {formatCurrency(Math.abs(mascote.totalGeral - morumbi.totalGeral))} de diferença
            </div>
          )}
        </div>
      )}

      {/* Top profissionais por unidade */}
      {unidades.map((u) => (
        <div key={u.slug} className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className={`h-4 w-4 ${u.slug.includes("mascote") ? "text-purple-500" : u.slug.includes("morumbi") ? "text-blue-500" : "text-muted-foreground"}`} />
              <span className="font-bold text-foreground">{nomeUnidade(u.slug)}</span>
              <Badge variant="outline" className="text-xs">{u.profissionais} profissionais</Badge>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-foreground">{formatCurrency(u.totalGeral)}</p>
              <p className="text-xs text-muted-foreground">Méd. {formatCurrency(u.totalGeral / u.profissionais)}/prof.</p>
            </div>
          </div>
          {/* Top 5 profissionais */}
          <div className="space-y-2">
            {u.top.slice(0, 5).map((p, idx) => {
              const nome = p.apelido ?? p.nome;
              const iniciais = nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
              const pct = u.totalGeral > 0 ? (p.totalGeral / u.totalGeral) * 100 : 0;
              return (
                <div key={p.id} className="flex items-center gap-3">
                  <span className={`text-xs font-bold w-5 text-center ${
                    idx === 0 ? "text-yellow-500" : "text-muted-foreground"
                  }`}>{idx + 1}º</span>
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    {p.fotoUrl
                      ? <img src={p.fotoUrl} alt={nome} className="h-7 w-7 rounded-full object-cover" />
                      : <span className="text-[10px] font-bold text-primary">{iniciais}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">{nome}</span>
                      <span className="text-xs font-semibold text-foreground ml-2 shrink-0">{formatCurrency(p.totalGeral)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          u.slug.includes("mascote") ? "bg-purple-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {/* Evolução histórica */}
      {historico.length > 0 && (() => {
        // Agrupar por mês/ano e ordenar cronologicamente
        const mesesMap = new Map<string, { label: string; mascote: number; morumbi: number }>();
        for (const h of historico) {
          const key = `${h.ano}-${String(h.mes).padStart(2,'0')}`;
          if (!mesesMap.has(key)) {
            mesesMap.set(key, { label: `${MESES[h.mes-1].slice(0,3)}/${String(h.ano).slice(2)}`, mascote: 0, morumbi: 0 });
          }
          const entry = mesesMap.get(key)!;
          if (h.empresaSlug.includes('mascote')) entry.mascote = h.totalGeral;
          if (h.empresaSlug.includes('morumbi')) entry.morumbi = h.totalGeral;
        }
        const meses = Array.from(mesesMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v);
        const maxVal = Math.max(...meses.flatMap(m => [m.mascote, m.morumbi]), 1);
        return (
          <div className="rounded-xl border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Evolução Histórica — Últimos {meses.length} meses
            </h3>
            {/* Legenda */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-purple-500" />
                <span className="text-xs text-muted-foreground">Mascote</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-blue-500" />
                <span className="text-xs text-muted-foreground">Morumbi</span>
              </div>
            </div>
            {/* Gráfico de barras agrupadas */}
            <div className="flex items-end gap-3 h-40">
              {meses.map((m, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5 w-full justify-center" style={{ height: '120px' }}>
                    {/* Barra Mascote */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div
                        className="bg-purple-500 rounded-t-sm w-full"
                        style={{ height: `${Math.max((m.mascote / maxVal) * 100, m.mascote > 0 ? 2 : 0)}%` }}
                        title={`Mascote: ${formatCurrency(m.mascote)}`}
                      />
                    </div>
                    {/* Barra Morumbi */}
                    <div className="flex-1 flex flex-col justify-end">
                      <div
                        className="bg-blue-500 rounded-t-sm w-full"
                        style={{ height: `${Math.max((m.morumbi / maxVal) * 100, m.morumbi > 0 ? 2 : 0)}%` }}
                        title={`Morumbi: ${formatCurrency(m.morumbi)}`}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground text-center">{m.label}</span>
                </div>
              ))}
            </div>
            {/* Tabela de valores */}
            <div className="mt-4 border-t pt-4 space-y-2">
              {meses.map((m, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground w-16">{m.label}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-purple-600 font-medium">{formatCurrency(m.mascote)}</span>
                    <span className="text-blue-600 font-medium">{formatCurrency(m.morumbi)}</span>
                    <span className={`font-semibold ${
                      m.mascote > m.morumbi ? 'text-purple-600' : m.morumbi > m.mascote ? 'text-blue-600' : 'text-muted-foreground'
                    }`}>
                      {m.mascote > m.morumbi ? '🟣' : m.morumbi > m.mascote ? '🔵' : '='}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── Pódio ─────────────────────────────────────────────────────────
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

// ─── Helpers de data ─────────────────────────────────────────────────────────
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function inicioSemana(d: Date): Date {
  const dia = new Date(d);
  const dow = dia.getDay(); // 0=dom
  dia.setDate(dia.getDate() - (dow === 0 ? 6 : dow - 1)); // segunda-feira
  return dia;
}
function fimSemana(d: Date): Date {
  const dia = inicioSemana(d);
  dia.setDate(dia.getDate() + 6);
  return dia;
}
function labelSemana(inicio: Date, fim: Date): string {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit' };
  return `${inicio.toLocaleDateString('pt-BR', opts)} – ${fim.toLocaleDateString('pt-BR', opts)}`;
}

// ─── Página Principal ────────────────────────────────────────────────────────
export default function RankingPublico() {
  const [, setLocation] = useLocation();
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [profissionalSelecionado, setProfissionalSelecionado] = useState<Profissional | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<AbaRanking>("barbeiros");
  const [modo, setModo] = useState<ModoVisualizacao>("mensal");

  // Estado para data (modo diário)
  const [dataDiaria, setDataDiaria] = useState<Date>(() => hoje);
  const dataDiariaStr = useMemo(() => toDateStr(dataDiaria), [dataDiaria]);

  // Estado para semana (modo semanal)
  const [semanaRef, setSemanaRef] = useState<Date>(() => inicioSemana(hoje));
  const semanaInicio = useMemo(() => semanaRef, [semanaRef]);
  const semanaFim = useMemo(() => fimSemana(semanaRef), [semanaRef]);
  const semanaInicioStr = useMemo(() => toDateStr(semanaInicio), [semanaInicio]);
  const semanaFimStr = useMemo(() => toDateStr(semanaFim), [semanaFim]);

  // Queries
  const { data: rankingData, isLoading } = trpc.profissionais.ranking.useQuery(
    { mes, ano },
    { staleTime: 60_000, enabled: modo === "mensal" }
  );
  const ranking = (rankingData?.lista ?? []) as Profissional[];
  const ultimaAtualizacao: Date | null = rankingData?.ultimaAtualizacao ?? null;

  const { data: rankingDiarioData, isLoading: isLoadingDiario, refetch: refetchDiario } = trpc.rankingDiario.useQuery(
    { data: dataDiariaStr },
    { staleTime: 120_000, enabled: modo === "diario" }
  );
  const rankingDiario = useMemo(() => (rankingDiarioData ?? []).map((p) => ({ ...p, temDados: p.totalGeral > 0 })) as Profissional[], [rankingDiarioData]);

  const { data: rankingSemanalData, isLoading: isLoadingSemanal, refetch: refetchSemanal } = trpc.rankingSemanal.useQuery(
    { dataInicio: semanaInicioStr, dataFim: semanaFimStr },
    { staleTime: 120_000, enabled: modo === "semanal" }
  );
  const rankingSemanal = useMemo(() => (rankingSemanalData ?? []).map((p) => ({ ...p, temDados: p.totalGeral > 0 })) as Profissional[], [rankingSemanalData]);

  // Ranking ativo conforme modo
  const rankingAtivo: Profissional[] = modo === "diario" ? rankingDiario
    : modo === "semanal" ? rankingSemanal
    : ranking;
  const isLoadingAtivo = modo === "diario" ? isLoadingDiario
    : modo === "semanal" ? isLoadingSemanal
    : isLoading;

  const { data: periodos } = trpc.profissionais.periodos.useQuery();
  const { data: historicoUnidades } = trpc.profissionais.historicoUnidades.useQuery(
    { ultimos: 6 },
    { staleTime: 300_000, enabled: abaAtiva === "unidade" && modo === "mensal" }
  );

  const anosDisponiveis = useMemo(() => {
    const set = new Set<number>();
    (periodos ?? []).forEach((p: { mes: number; ano: number }) => set.add(p.ano));
    [hoje.getFullYear(), hoje.getFullYear() - 1, hoje.getFullYear() - 2].forEach((y) => set.add(y));
    return Array.from(set).sort((a, b) => b - a);
  }, [periodos]);

  // Filtros por categoria
  const barbeiros = useMemo(() => rankingAtivo.filter(p => p.categoriaRanking === "barbeiro"), [rankingAtivo]);
  const auxiliares = useMemo(() => rankingAtivo.filter(p => p.categoriaRanking === "auxiliar"), [rankingAtivo]);
  const rankingProdutos = useMemo(() =>
    [...rankingAtivo].sort((a, b) => b.totalProdutos - a.totalProdutos),
    [rankingAtivo]
  );
  const barbeirosMAscote = useMemo(() => rankingAtivo.filter(p => p.empresaSlug === "barbiero-mascote"), [rankingAtivo]);
  const barbeirosMoreumbi = useMemo(() => rankingAtivo.filter(p => p.empresaSlug === "barbiero-morumbi"), [rankingAtivo]);

  const temDadosNoMes = modo === "mensal" ? ranking.some(p => p.temDados) : rankingAtivo.some(p => p.totalGeral > 0);
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

  const navegarDia = useCallback((direcao: -1 | 1) => {
    setDataDiaria(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direcao);
      if (d > hoje) return prev;
      return d;
    });
  }, [hoje]);

  const navegarSemana = useCallback((direcao: -1 | 1) => {
    setSemanaRef(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + direcao * 7);
      if (d > hoje) return prev;
      return d;
    });
  }, [hoje]);

  // ─── Exportar ranking como imagem ───────────────────────────────────────────
  const exportRef = useRef<HTMLDivElement>(null);
  const [exportando, setExportando] = useState(false);

  const exportarImagem = useCallback(async () => {
    if (!exportRef.current || exportando) return;
    setExportando(true);
    try {
      const canvas = await html2canvas(exportRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      const periodo = modo === "diario"
        ? dataDiaria.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")
        : modo === "semanal"
        ? `semana-${toDateStr(semanaInicio)}`
        : `${MESES[mes - 1]}-${ano}`;
      link.download = `ranking-${periodo}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (e) {
      console.error("Erro ao exportar imagem:", e);
    } finally {
      setExportando(false);
    }
  }, [exportando, modo, dataDiaria, semanaInicio, mes, ano]);

  // Lista e campo para a aba ativaa
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
    { id: "mascote", label: "Mascote", icon: <Building2 className="h-3.5 w-3.5" />, count: barbeirosMAscote.filter(p => p.totalGeral > 0).length },
    { id: "morumbi", label: "Morumbi", icon: <Building2 className="h-3.5 w-3.5" />, count: barbeirosMoreumbi.filter(p => p.totalGeral > 0).length },
    { id: "unidade", label: "Por Unidade", icon: <TrendingUp className="h-3.5 w-3.5" />, count: 0 },
    { id: "produtos", label: "Produtos", icon: <Package className="h-3.5 w-3.5" />, count: rankingProdutos.filter(p => p.totalProdutos > 0).length },
  ];

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-transparent">
        {/* Header fixo */}
        <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
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
              {/* Seletor de modo de visualização */}
              <div className="flex items-center rounded-lg border bg-muted/50 p-0.5 gap-0.5">
                <button
                  onClick={() => setModo("diario")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    modo === "diario" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sun className="h-3 w-3" />
                  Diário
                </button>
                <button
                  onClick={() => setModo("semanal")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    modo === "semanal" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarDays className="h-3 w-3" />
                  Semanal
                </button>
                <button
                  onClick={() => setModo("mensal")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    modo === "mensal" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <CalendarRange className="h-3 w-3" />
                  Mensal
                </button>
              </div>
              {modo === "mensal" && ultimaAtualizacao && (
                <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(ultimaAtualizacao).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <Badge variant="secondary" className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {rankingAtivo.length} profissional{rankingAtivo.length !== 1 ? "is" : ""}
              </Badge>
              {/* Botão exportar imagem */}
              {listaAtiva.length > 0 && (temDadosNoMes || modo !== "mensal") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportarImagem}
                  disabled={exportando || isLoadingAtivo}
                  className="flex items-center gap-1.5 text-xs"
                  title="Exportar ranking como imagem"
                >
                  {exportando ? (
                    <div className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{exportando ? "Gerando..." : "Exportar"}</span>
                </Button>
              )}
            </div>
          </div>

          {/* Abas */}
          <div className="flex border-t border-border/50 px-4 max-w-7xl mx-auto overflow-x-auto">
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
              {modo === "diario" ? "Data" : modo === "semanal" ? "Semana" : "Período de referência"}
            </div>

            {/* Seletor Mensal */}
            {modo === "mensal" && (
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
            )}

            {/* Seletor Diário */}
            {modo === "diario" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarDia(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <input
                  type="date"
                  value={dataDiariaStr}
                  max={toDateStr(hoje)}
                  onChange={(e) => { if (e.target.value) setDataDiaria(new Date(e.target.value + 'T12:00:00')); }}
                  className="h-8 px-3 text-sm rounded-md border bg-background text-foreground"
                />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarDia(1)} disabled={dataDiariaStr >= toDateStr(hoje)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {dataDiariaStr !== toDateStr(hoje) && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setDataDiaria(hoje)}>
                    Hoje
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchDiario()} title="Atualizar">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Seletor Semanal */}
            {modo === "semanal" && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarSemana(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium px-2">{labelSemana(semanaInicio, semanaFim)}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navegarSemana(1)} disabled={semanaInicioStr >= toDateStr(inicioSemana(hoje))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {semanaInicioStr !== toDateStr(inicioSemana(hoje)) && (
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-primary" onClick={() => setSemanaRef(inicioSemana(hoje))}>
                    Semana atual
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetchSemanal()} title="Atualizar">
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* Aviso sem dados mensal */}
          {modo === "mensal" && !isLoading && !temDadosNoMes && ranking.length > 0 && (
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 mb-6">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-600">Sem dados de faturamento para {MESES[mes - 1]} de {ano}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Execute a sincronização com o CashBarber para importar os dados deste período.</p>
              </div>
            </div>
          )}

          {/* Banner informativo diário/semanal */}
          {(modo === "diario" || modo === "semanal") && !isLoadingAtivo && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 mb-6">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-muted-foreground">
                {modo === "diario"
                  ? `Dados em tempo real do CashBarber para ${dataDiaria.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}`
                  : `Dados em tempo real do CashBarber para a semana de ${labelSemana(semanaInicio, semanaFim)}`
                }
              </p>
            </div>
          )}

          {isLoadingAtivo ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">
                {modo === "diario" ? "Buscando dados do dia..." : modo === "semanal" ? "Buscando dados da semana..." : "Carregando ranking..."}
              </p>
            </div>
          ) : abaAtiva === "unidade" && modo === "mensal" ? (
            <RankingUnidade lista={ranking} historico={historicoUnidades ?? []} />
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
              {(temDadosNoMes || modo !== "mensal") && listaAtiva.length >= 3 && (
                <div className="mb-10">
                  <div className="flex items-end justify-center gap-4">
                    <PodiumCard posicao={2} profissional={listaAtiva[1]} height="h-28" bgColor="bg-slate-400/20 border-slate-400/40" iconColor="text-slate-400" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[1])} />
                    <PodiumCard posicao={1} profissional={listaAtiva[0]} height="h-36" bgColor="bg-yellow-500/20 border-yellow-500/40" iconColor="text-yellow-500" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[0])} />
                    <PodiumCard posicao={3} profissional={listaAtiva[2]} height="h-20" bgColor="bg-amber-700/20 border-amber-700/40" iconColor="text-amber-700" campo={campoAtivo} onDetalhar={() => setProfissionalSelecionado(listaAtiva[2])} />
                  </div>
                </div>
              )}

              {/* Dica */}
              {(temDadosNoMes || modo !== "mensal") && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                  <ChevronDown className="h-3 w-3" />
                  Clique em qualquer profissional para ver o detalhamento
                </div>
              )}

              {/* Label da aba */}
              <h2 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {(() => {
                  const periodo = modo === "diario"
                    ? dataDiaria.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                    : modo === "semanal"
                    ? labelSemana(semanaInicio, semanaFim)
                    : `${MESES[mes - 1]} ${ano}`;
                  if (abaAtiva === "barbeiros") return `Barbeiros — ${periodo}`;
                  if (abaAtiva === "auxiliares") return `Auxiliares — ${periodo}`;
                  if (abaAtiva === "produtos") return `Ranking de Produtos — ${periodo}`;
                  if (abaAtiva === "mascote") return `Mascote — ${periodo}`;
                  if (abaAtiva === "morumbi") return `Morumbi — ${periodo}`;
                  return periodo;
                })()}
              </h2>

              {/* Lista */}
              <div className="space-y-2">
                {listaAtiva.map((p, idx) => (
                  <CardProfissional
                    key={p.id}
                    p={p}
                    idx={idx}
                    campo={campoAtivo}
                    temDadosNoMes={temDadosNoMes || modo !== "mensal"}
                    onDetalhar={() => setProfissionalSelecionado(p)}
                  />
                ))}
              </div>

              {/* Rodapé */}
              <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  {modo === "diario"
                    ? `Faturamento de ${dataDiaria.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}`
                    : modo === "semanal"
                    ? `Semana de ${labelSemana(semanaInicio, semanaFim)}`
                    : temDadosNoMes
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

      {/* Elemento oculto para exportar como imagem */}
      <div
        ref={exportRef}
        style={{
          position: "fixed",
          top: "-9999px",
          left: "-9999px",
          width: "600px",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)",
          padding: "32px",
          borderRadius: "16px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: "#ffffff",
        }}
      >
        {/* Header do card */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: "700", color: "#fbbf24", letterSpacing: "-0.5px" }}>🏆 Ranking</div>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "2px" }}>
              {modo === "diario"
                ? dataDiaria.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                : modo === "semanal"
                ? `Semana ${labelSemana(semanaInicio, semanaFim)}`
                : `${MESES[mes - 1]} de ${ano}`}
            </div>
          </div>
          <div style={{ fontSize: "12px", color: "#64748b", textAlign: "right" }}>
            <div style={{ fontWeight: "600", color: "#94a3b8" }}>
              {abaAtiva === "mascote" ? "Barbiero Mascote" : abaAtiva === "morumbi" ? "Barbiero Morumbi" : "Barbiero"}
            </div>
            <div>performancemeta.sbs</div>
          </div>
        </div>

        {/* Linha divisória */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.1)", marginBottom: "24px" }} />

        {/* Top 5 */}
        {listaAtiva.slice(0, 5).map((p, idx) => {
          const medals = ["🥇", "🥈", "🥉", "4º", "5º"];
          const bgColors = [
            "rgba(251,191,36,0.15)",
            "rgba(148,163,184,0.12)",
            "rgba(180,83,9,0.12)",
            "rgba(255,255,255,0.05)",
            "rgba(255,255,255,0.05)",
          ];
          const borderColors = [
            "rgba(251,191,36,0.4)",
            "rgba(148,163,184,0.3)",
            "rgba(180,83,9,0.3)",
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0.08)",
          ];
          const valor = campoAtivo === "totalProdutos" ? p.totalProdutos : p.totalGeral;
          return (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "12px 16px",
                borderRadius: "10px",
                background: bgColors[idx],
                border: `1px solid ${borderColors[idx]}`,
                marginBottom: idx < 4 ? "8px" : "0",
              }}
            >
              <div style={{ fontSize: idx < 3 ? "22px" : "14px", fontWeight: "700", minWidth: "28px", textAlign: "center", color: idx >= 3 ? "#64748b" : undefined }}>
                {medals[idx]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "15px", fontWeight: "600", color: idx === 0 ? "#fbbf24" : "#f1f5f9" }}>
                  {p.apelido || p.nome}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", marginTop: "1px" }}>{p.cargo || "Profissional"}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "700", color: idx === 0 ? "#fbbf24" : "#e2e8f0" }}>
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor)}
                </div>
                {p.metaMensal && p.metaMensal > 0 && modo === "mensal" && (
                  <div style={{ fontSize: "10px", color: p.pctMeta && p.pctMeta >= 100 ? "#4ade80" : "#94a3b8", marginTop: "2px" }}>
                    {p.pctMeta?.toFixed(0)}% da meta
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Rodapé */}
        <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "11px", color: "#475569" }}>
            {abaAtiva === "barbeiros" ? "Barbeiros" : abaAtiva === "auxiliares" ? "Auxiliares" : abaAtiva === "produtos" ? "Produtos" : abaAtiva === "mascote" ? "Mascote" : abaAtiva === "morumbi" ? "Morumbi" : "Geral"}
          </div>
          <div style={{ fontSize: "11px", color: "#475569" }}>
            Gerado em {new Date().toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
