import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Award, TrendingUp, TrendingDown, Settings, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Empresa {
  slug: string;
  nome: string;
  cor: string;
  tipoCategorias: string;
  cat1Nome?: string | null;
  cat2Nome?: string | null;
  cat3Nome?: string | null;
  cat4Nome?: string | null;
  cat5Nome?: string | null;
}

interface Meta {
  empresaSlug: string;
  metaMensal: string | number;
  metaQuinzenal: string | number;
  diasUteis?: number;
  diasUteisQuinzenal?: number;
}

interface Faturamento {
  empresaSlug: string;
  data: string;
  cat1: string | number;
  cat2: string | number;
  cat3: string | number;
  cat4: string | number;
  cat5: string | number;
}

interface Props {
  mes: number;
  ano: number;
  mesLabel: string;
  empresasData: Empresa[];
  metasData: Meta[];
  faturamentosData: Faturamento[];
  isAdmin: boolean;
}

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Bonificacao({ mes, ano, mesLabel, empresasData, metasData, faturamentosData, isAdmin }: Props) {
  const { data: bonificacoesData = [], refetch: refetchBon } = trpc.bonificacao.listar.useQuery();
  const salvarBon = trpc.bonificacao.salvar.useMutation();

  // Estado de edição de percentuais (apenas admin)
  const [editando, setEditando] = useState<string | null>(null);
  const [formPct, setFormPct] = useState({
    pctQuinzenalSemMeta: 0,
    pctQuinzenalComMeta: 0,
    pctMensalSemMeta: 0,
    pctMensalComMeta: 0,
  });

  const handleEditar = (slug: string) => {
    const bon = bonificacoesData.find((b: any) => b.empresaSlug === slug);
    setFormPct({
      pctQuinzenalSemMeta: parseFloat(String(bon?.pctQuinzenalSemMeta ?? 0)),
      pctQuinzenalComMeta: parseFloat(String(bon?.pctQuinzenalComMeta ?? 0)),
      pctMensalSemMeta: parseFloat(String(bon?.pctMensalSemMeta ?? 0)),
      pctMensalComMeta: parseFloat(String(bon?.pctMensalComMeta ?? 0)),
    });
    setEditando(slug);
  };

  const handleSalvar = async (slug: string) => {
    try {
      await salvarBon.mutateAsync({ empresaSlug: slug, ...formPct });
      toast.success("Bonificação salva com sucesso!");
      refetchBon();
      setEditando(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar bonificação.");
    }
  };

  // Calcular bonificações por empresa
  const calculos = empresasData.map((emp) => {
    const meta = metasData.find((m) => m.empresaSlug === emp.slug);
    const bon = bonificacoesData.find((b: any) => b.empresaSlug === emp.slug);

    const metaMensal = parseFloat(String(meta?.metaMensal ?? 0));
    const metaQuinzenal = parseFloat(String(meta?.metaQuinzenal ?? 0));

    const rows = faturamentosData.filter((f) => f.empresaSlug === emp.slug);

    // Total mensal
    const totalMensal = rows.reduce((s: number, r) => {
      return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
        .reduce((a: number, v) => a + parseFloat(String(v || 0)), 0);
    }, 0);

    // Total quinzenal (dias 1-15)
    const rowsQ = rows.filter((r) => {
      const dia = parseInt(r.data.split("-")[2]);
      return dia <= 15;
    });
    const totalQuinzenal = rowsQ.reduce((s: number, r) => {
      return s + [r.cat1, r.cat2, r.cat3, r.cat4, r.cat5]
        .reduce((a: number, v) => a + parseFloat(String(v || 0)), 0);
    }, 0);

    const atingiuQuinzenal = metaQuinzenal > 0 && totalQuinzenal >= metaQuinzenal;
    const atingiuMensal = metaMensal > 0 && totalMensal >= metaMensal;

    const pctQ = atingiuQuinzenal
      ? parseFloat(String(bon?.pctQuinzenalComMeta ?? 0))
      : parseFloat(String(bon?.pctQuinzenalSemMeta ?? 0));
    const pctM = atingiuMensal
      ? parseFloat(String(bon?.pctMensalComMeta ?? 0))
      : parseFloat(String(bon?.pctMensalSemMeta ?? 0));

    const bonQuinzenal = metaQuinzenal > 0 ? (totalQuinzenal * pctQ) / 100 : 0;
    const bonMensal = metaMensal > 0 ? (totalMensal * pctM) / 100 : 0;
    const bonTotal = bonQuinzenal + bonMensal;

    return {
      emp,
      meta,
      bon,
      metaMensal,
      metaQuinzenal,
      totalMensal,
      totalQuinzenal,
      atingiuQuinzenal,
      atingiuMensal,
      pctQ,
      pctM,
      bonQuinzenal,
      bonMensal,
      bonTotal,
    };
  });

  const totalBonificacoes = calculos.reduce((s, c) => s + c.bonTotal, 0);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            Bonificações — {mesLabel} {ano}
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Cálculo automático com base no faturamento e metas do mês
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Total Bonificações</p>
          <p className="text-2xl font-bold text-amber-600">{fmt(totalBonificacoes)}</p>
        </div>
      </div>

      {/* Cards por empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {calculos.map((c) => (
          <Card key={c.emp.slug} className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
            {/* Barra de cor */}
            <div className="h-1.5 w-full" style={{ backgroundColor: c.emp.cor }} />

            <div className="p-5">
              {/* Header empresa */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: c.emp.cor + "20" }}>
                  <Building2 className="w-4 h-4" style={{ color: c.emp.cor }} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{c.emp.nome}</h3>
                  <p className="text-xs text-slate-400">{mesLabel} {ano}</p>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => editando === c.emp.slug ? setEditando(null) : handleEditar(c.emp.slug)}
                    className="ml-auto p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Configurar percentuais"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Formulário de edição (apenas admin) */}
              {isAdmin && editando === c.emp.slug && (
                <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-3">
                  <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Configurar Percentuais</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">% Quinzenal s/ meta</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={formPct.pctQuinzenalSemMeta}
                          onChange={(e) => setFormPct((p) => ({ ...p, pctQuinzenalSemMeta: parseFloat(e.target.value) || 0 }))}
                          className="h-8 text-sm rounded-lg"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">% Quinzenal c/ meta</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={formPct.pctQuinzenalComMeta}
                          onChange={(e) => setFormPct((p) => ({ ...p, pctQuinzenalComMeta: parseFloat(e.target.value) || 0 }))}
                          className="h-8 text-sm rounded-lg"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">% Mensal s/ meta</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={formPct.pctMensalSemMeta}
                          onChange={(e) => setFormPct((p) => ({ ...p, pctMensalSemMeta: parseFloat(e.target.value) || 0 }))}
                          className="h-8 text-sm rounded-lg"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">% Mensal c/ meta</label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={formPct.pctMensalComMeta}
                          onChange={(e) => setFormPct((p) => ({ ...p, pctMensalComMeta: parseFloat(e.target.value) || 0 }))}
                          className="h-8 text-sm rounded-lg"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSalvar(c.emp.slug)}
                      disabled={salvarBon.isPending}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-8 text-xs"
                    >
                      {salvarBon.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditando(null)}
                      className="flex-1 rounded-lg h-8 text-xs"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Seção Quinzenal */}
              <div className={`rounded-xl p-3 mb-3 ${c.atingiuQuinzenal ? "bg-emerald-50" : "bg-orange-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${c.atingiuQuinzenal ? "text-emerald-600" : "text-orange-600"}`}>
                    Quinzenal
                  </span>
                  {c.atingiuQuinzenal
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
                  }
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {c.atingiuQuinzenal ? "Meta atingida" : "Abaixo da meta"} · {c.pctQ}% sobre {fmt(c.totalQuinzenal)}
                    </p>
                    {c.metaQuinzenal > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Meta: {fmt(c.metaQuinzenal)} · Realizado: {fmt(c.totalQuinzenal)}
                      </p>
                    )}
                  </div>
                  <p className={`text-lg font-bold ${c.atingiuQuinzenal ? "text-emerald-700" : "text-orange-700"}`}>
                    {c.metaQuinzenal > 0 ? fmt(c.bonQuinzenal) : "—"}
                  </p>
                </div>
              </div>

              {/* Seção Mensal */}
              <div className={`rounded-xl p-3 mb-3 ${c.atingiuMensal ? "bg-emerald-50" : "bg-orange-50"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${c.atingiuMensal ? "text-emerald-600" : "text-orange-600"}`}>
                    Mensal
                  </span>
                  {c.atingiuMensal
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <TrendingDown className="w-3.5 h-3.5 text-orange-500" />
                  }
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs text-slate-500">
                      {c.atingiuMensal ? "Meta atingida" : "Abaixo da meta"} · {c.pctM}% sobre {fmt(c.totalMensal)}
                    </p>
                    {c.metaMensal > 0 && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Meta: {fmt(c.metaMensal)} · Realizado: {fmt(c.totalMensal)}
                      </p>
                    )}
                  </div>
                  <p className={`text-lg font-bold ${c.atingiuMensal ? "text-emerald-700" : "text-orange-700"}`}>
                    {c.metaMensal > 0 ? fmt(c.bonMensal) : "—"}
                  </p>
                </div>
              </div>

              {/* Total da empresa */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold text-slate-700">Total Bonificação</span>
                </div>
                <p className="text-xl font-bold text-amber-600">{fmt(c.bonTotal)}</p>
              </div>

              {/* Percentuais configurados */}
              {!isAdmin && (
                <div className="mt-3 grid grid-cols-2 gap-1.5">
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Quinz. s/ meta</p>
                    <p className="text-sm font-bold text-slate-700">{parseFloat(String(c.bon?.pctQuinzenalSemMeta ?? 0)).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Quinz. c/ meta</p>
                    <p className="text-sm font-bold text-slate-700">{parseFloat(String(c.bon?.pctQuinzenalComMeta ?? 0)).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Mensal s/ meta</p>
                    <p className="text-sm font-bold text-slate-700">{parseFloat(String(c.bon?.pctMensalSemMeta ?? 0)).toFixed(1)}%</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-slate-400">Mensal c/ meta</p>
                    <p className="text-sm font-bold text-slate-700">{parseFloat(String(c.bon?.pctMensalComMeta ?? 0)).toFixed(1)}%</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Resumo total */}
      {calculos.length > 0 && (
        <Card className="border-0 shadow-sm rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Resumo de Bonificações — {mesLabel} {ano}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Soma de todas as bonificações quinzenais e mensais das unidades
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-amber-600">{fmt(totalBonificacoes)}</p>
              <p className="text-xs text-slate-500 mt-0.5">{calculos.length} unidade{calculos.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {calculos.map((c) => (
              <div key={c.emp.slug} className="bg-white/70 rounded-xl p-3 text-center">
                <div className="w-2 h-2 rounded-full mx-auto mb-1" style={{ backgroundColor: c.emp.cor }} />
                <p className="text-xs text-slate-500 font-medium">{c.emp.nome}</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{fmt(c.bonTotal)}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {calculos.length === 0 && (
        <Card className="p-10 border-0 shadow-sm rounded-2xl bg-white text-center">
          <Award className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma empresa disponível para bonificação.</p>
        </Card>
      )}
    </div>
  );
}
