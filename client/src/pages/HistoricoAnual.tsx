import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  Legend,
} from "recharts";
import { Trophy, Star, CheckCircle2, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

const MESES_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtPct(v: number) {
  return `${v.toFixed(1)}%`;
}

interface Props {
  empresasData: any[];
  empresaVinculada?: string | null;
  isGerente: boolean;
  isAdmin: boolean;
}

export default function HistoricoAnual({ empresasData, empresaVinculada, isGerente, isAdmin }: Props) {
  const anoAtual = new Date().getFullYear();
  const [ano, setAno] = useState(anoAtual);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>("todas");

  const { data, isLoading } = trpc.meta.historicoAnual.useQuery({ ano });

  // Empresas visíveis para o usuário
  const empresasVisiveis = useMemo(() => {
    if (isAdmin) return empresasData;
    if (empresaVinculada) return empresasData.filter((e: any) => e.slug === empresaVinculada);
    return empresasData;
  }, [empresasData, empresaVinculada, isAdmin]);

  // Calcular totais realizados por empresa por mês
  const historicoCalculado = useMemo(() => {
    if (!data) return [];

    return empresasVisiveis.map((emp: any) => {
      const mesesData = MESES.map((_, idx) => {
        const mesNum = idx + 1;
        const meta = data.metas.find((m: any) => m.empresaSlug === emp.slug && m.mes === mesNum);
        const fatsMes = data.faturamentos.filter((f: any) => {
          const [fAno, fMes] = f.data.split("-").map(Number);
          return f.empresaSlug === emp.slug && fMes === mesNum && fAno === ano;
        });

        // Apenas lançamentos realizados (não futuros)
        const hoje = new Date();
        const fatsRealizados = fatsMes.filter((f: any) => {
          const [fAno, fMes, fDia] = f.data.split("-").map(Number);
          return new Date(fAno, fMes - 1, fDia) <= hoje;
        });

        const totalRealizado = fatsRealizados.reduce((s: number, f: any) =>
          s + [f.cat1, f.cat2, f.cat3, f.cat4, f.cat5]
            .reduce((a: number, v: any) => a + parseFloat(v || "0"), 0), 0);

        const metaMensal = parseFloat(String(meta?.metaMensal || "0"));
        const superMeta = parseFloat(String(meta?.superMeta || "0"));
        const pctMeta = metaMensal > 0 ? (totalRealizado / metaMensal) * 100 : null;
        const pctSuperMeta = superMeta > 0 ? (totalRealizado / superMeta) * 100 : null;
        const atingiuMeta = metaMensal > 0 && totalRealizado >= metaMensal;
        const atingiuSuperMeta = superMeta > 0 && totalRealizado >= superMeta;

        // Mês ainda não iniciado: sem dados
        const primeiroDiaMes = new Date(ano, idx, 1);
        const mesNoFuturo = primeiroDiaMes > hoje;

        return {
          mes: mesNum,
          mesLabel: MESES[idx],
          mesLabelFull: MESES_FULL[idx],
          totalRealizado,
          metaMensal,
          superMeta,
          pctMeta,
          pctSuperMeta,
          atingiuMeta,
          atingiuSuperMeta,
          temDados: fatsRealizados.length > 0,
          mesNoFuturo,
        };
      });

      const mesesComMeta = mesesData.filter(m => m.metaMensal > 0 && m.temDados);
      const mesesAtingidos = mesesComMeta.filter(m => m.atingiuMeta).length;
      const mesesSuperAtingidos = mesesData.filter(m => m.atingiuSuperMeta).length;
      const totalAnual = mesesData.reduce((s, m) => s + m.totalRealizado, 0);
      const metaAnual = mesesData.reduce((s, m) => s + m.metaMensal, 0);

      return { emp, mesesData, mesesAtingidos, mesesSuperAtingidos, totalAnual, metaAnual, mesesComMeta: mesesComMeta.length };
    });
  }, [data, empresasVisiveis, ano]);

  // Dados para o gráfico consolidado ou por empresa
  const chartData = useMemo(() => {
    if (!historicoCalculado.length) return [];

    const empsFiltradas = empresaSelecionada === "todas"
      ? historicoCalculado
      : historicoCalculado.filter(h => h.emp.slug === empresaSelecionada);

    return MESES.map((mesLabel, idx) => {
      const mesNum = idx + 1;
      const entry: any = { mes: mesLabel };

      empsFiltradas.forEach(h => {
        const m = h.mesesData[idx];
        entry[`realizado_${h.emp.slug}`] = m.temDados ? m.totalRealizado : null;
        entry[`meta_${h.emp.slug}`] = m.metaMensal || null;
        entry[`superMeta_${h.emp.slug}`] = m.superMeta || null;
      });

      // Totais consolidados
      entry.totalRealizado = empsFiltradas.reduce((s, h) => s + (h.mesesData[idx].temDados ? h.mesesData[idx].totalRealizado : 0), 0);
      entry.totalMeta = empsFiltradas.reduce((s, h) => s + h.mesesData[idx].metaMensal, 0);
      entry.totalSuperMeta = empsFiltradas.reduce((s, h) => s + h.mesesData[idx].superMeta, 0);
      entry.mesNum = mesNum;

      return entry;
    });
  }, [historicoCalculado, empresaSelecionada]);

  const empsFiltradas = empresaSelecionada === "todas"
    ? historicoCalculado
    : historicoCalculado.filter(h => h.emp.slug === empresaSelecionada);

  const mesAtual = new Date().getMonth() + 1;
  const anoAtualCheck = new Date().getFullYear();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Histórico Anual de Metas
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evolução mensal de faturamento vs metas e super metas
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Seletor de ano */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <button
              onClick={() => setAno(a => a - 1)}
              className="px-2 py-1 rounded-lg text-sm text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
            >
              ‹
            </button>
            <span className="px-3 py-1 text-sm font-semibold text-foreground">{ano}</span>
            <button
              onClick={() => setAno(a => Math.min(a + 1, anoAtualCheck))}
              disabled={ano >= anoAtualCheck}
              className="px-2 py-1 rounded-lg text-sm text-muted-foreground hover:bg-background hover:text-foreground transition-colors disabled:opacity-30"
            >
              ›
            </button>
          </div>

          {/* Filtro de empresa */}
          {empresasVisiveis.length > 1 && (
            <select
              value={empresaSelecionada}
              onChange={e => setEmpresaSelecionada(e.target.value)}
              className="text-sm bg-muted border-0 rounded-xl px-3 py-2 text-foreground focus:ring-2 focus:ring-primary"
            >
              <option value="todas">Todas as unidades</option>
              {empresasVisiveis.map((emp: any) => (
                <option key={emp.slug} value={emp.slug}>{emp.nome}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Cards de resumo anual por empresa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {empsFiltradas.map(h => (
          <Card key={h.emp.slug} className="p-4 border-0 shadow-sm rounded-2xl bg-card">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.emp.cor }} />
              <span className="font-semibold text-sm text-foreground">{h.emp.nome}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Faturamento Anual</p>
                <p className="text-base font-bold text-foreground">{fmt(h.totalAnual)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meta Anual</p>
                <p className="text-base font-bold text-foreground">{h.metaAnual > 0 ? fmt(h.metaAnual) : "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Meses c/ Meta ✓</p>
                <p className="text-base font-bold text-emerald-400">
                  {h.mesesAtingidos}/{h.mesesComMeta}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Super Metas ★</p>
                <p className="text-base font-bold text-amber-400">
                  {h.mesesSuperAtingidos > 0 ? `${h.mesesSuperAtingidos} meses` : "—"}
                </p>
              </div>
            </div>

            {/* Barra de progresso anual */}
            {h.metaAnual > 0 && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Progresso anual</span>
                  <span className="font-bold" style={{ color: h.emp.cor }}>
                    {fmtPct((h.totalAnual / h.metaAnual) * 100)}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((h.totalAnual / h.metaAnual) * 100, 100)}%`,
                      backgroundColor: h.emp.cor,
                    }}
                  />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Gráfico de barras mensal */}
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Faturamento Mensal vs Meta
        </h3>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
              width={45}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: any, name: string) => {
                if (name === "Realizado") return [fmt(value), "Realizado"];
                if (name === "Meta") return [fmt(value), "Meta"];
                if (name === "Super Meta") return [fmt(value), "Super Meta"];
                return [fmt(value), name];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
              formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
            />
            <Bar dataKey="totalRealizado" name="Realizado" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((entry, idx) => {
                const atingiu = entry.totalMeta > 0 && entry.totalRealizado >= entry.totalMeta;
                const atingiuSuper = entry.totalSuperMeta > 0 && entry.totalRealizado >= entry.totalSuperMeta;
                const color = atingiuSuper ? "#f59e0b" : atingiu ? "#10b981" : entry.totalRealizado > 0 ? "#3b82f6" : "#6b7280";
                return <Cell key={idx} fill={color} fillOpacity={entry.mesNum > mesAtual && ano === anoAtualCheck ? 0.3 : 0.85} />;
              })}
            </Bar>
            <ReferenceLine
              y={chartData.reduce((s, e) => s + (e.totalMeta || 0), 0) / chartData.filter(e => e.totalMeta > 0).length || 0}
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>

        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-amber-400 inline-block" /> Super meta atingida</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> Meta atingida</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> Em andamento</span>
        </div>
      </Card>

      {/* Tabela de evolução mensal por empresa */}
      {empsFiltradas.map(h => (
        <Card key={h.emp.slug} className="border-0 shadow-sm rounded-2xl bg-card overflow-hidden">
          <div className="p-4 pb-0 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.emp.cor }} />
            <h3 className="font-semibold text-sm text-foreground">{h.emp.nome}</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {h.mesesAtingidos}/{h.mesesComMeta} meses com meta atingida
              {h.mesesSuperAtingidos > 0 && (
                <span className="ml-2 text-amber-400">★ {h.mesesSuperAtingidos} super meta{h.mesesSuperAtingidos > 1 ? "s" : ""}</span>
              )}
            </span>
          </div>

          <div className="overflow-x-auto mt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-muted-foreground font-medium">Mês</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Realizado</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Meta</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">% Meta</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Super Meta</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">% Super</th>
                  <th className="text-center px-3 py-2 text-muted-foreground font-medium">Status</th>
                  <th className="text-right px-3 py-2 text-muted-foreground font-medium">Var. Mês</th>
                </tr>
              </thead>
              <tbody>
                {h.mesesData.map((m, idx) => {
                  const mesAnteriorData = idx > 0 ? h.mesesData[idx - 1] : null;
                  const variacao = mesAnteriorData && mesAnteriorData.temDados && m.temDados
                    ? m.totalRealizado - mesAnteriorData.totalRealizado
                    : null;
                  const variacaoPct = variacao !== null && mesAnteriorData && mesAnteriorData.totalRealizado > 0
                    ? (variacao / mesAnteriorData.totalRealizado) * 100
                    : null;

                  const isMesAtual = m.mes === mesAtual && ano === anoAtualCheck;
                  const rowBg = m.atingiuSuperMeta
                    ? "bg-amber-500/5"
                    : m.atingiuMeta
                    ? "bg-emerald-500/5"
                    : isMesAtual
                    ? "bg-primary/5"
                    : "";

                  return (
                    <tr
                      key={m.mes}
                      className={`border-b border-border/50 last:border-0 transition-colors ${rowBg} ${m.mesNoFuturo ? "opacity-40" : ""}`}
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground">
                        <span className="flex items-center gap-1">
                          {m.mesLabelFull}
                          {isMesAtual && <span className="text-[9px] bg-primary/20 text-primary px-1 py-0.5 rounded-md font-bold">ATUAL</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                        {m.temDados ? fmt(m.totalRealizado) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {m.metaMensal > 0 ? fmt(m.metaMensal) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.pctMeta !== null ? (
                          <span className={`font-bold ${m.atingiuMeta ? "text-emerald-400" : m.pctMeta >= 75 ? "text-blue-400" : m.pctMeta >= 50 ? "text-amber-400" : "text-red-400"}`}>
                            {fmtPct(m.pctMeta)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {m.superMeta > 0 ? fmt(m.superMeta) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {m.pctSuperMeta !== null ? (
                          <span className={`font-bold ${m.atingiuSuperMeta ? "text-amber-400" : "text-muted-foreground"}`}>
                            {fmtPct(m.pctSuperMeta)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {m.mesNoFuturo ? (
                          <span className="text-muted-foreground text-[10px]">futuro</span>
                        ) : !m.temDados ? (
                          <span className="text-muted-foreground text-[10px]">sem dados</span>
                        ) : m.atingiuSuperMeta ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded-md">
                            <Star className="w-2.5 h-2.5" /> Super!
                          </span>
                        ) : m.atingiuMeta ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-1.5 py-0.5 rounded-md">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Meta!
                          </span>
                        ) : m.metaMensal > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-md">
                            Abaixo
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">sem meta</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {variacaoPct !== null ? (
                          <span className={`flex items-center justify-end gap-0.5 font-medium ${variacao! > 0 ? "text-emerald-400" : variacao! < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                            {variacao! > 0 ? <TrendingUp className="w-3 h-3" /> : variacao! < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                            {variacaoPct > 0 ? "+" : ""}{fmtPct(variacaoPct)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Rodapé com totais */}
              <tfoot>
                <tr className="bg-muted/30 border-t-2 border-border">
                  <td className="px-4 py-2.5 font-bold text-foreground text-xs">Total {ano}</td>
                  <td className="px-3 py-2.5 text-right font-bold text-foreground">{fmt(h.totalAnual)}</td>
                  <td className="px-3 py-2.5 text-right font-semibold text-muted-foreground">{h.metaAnual > 0 ? fmt(h.metaAnual) : "—"}</td>
                  <td className="px-3 py-2.5 text-right">
                    {h.metaAnual > 0 && (
                      <span className={`font-bold ${h.totalAnual >= h.metaAnual ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {fmtPct((h.totalAnual / h.metaAnual) * 100)}
                      </span>
                    )}
                  </td>
                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs text-muted-foreground">
                    {h.mesesAtingidos} de {h.mesesComMeta} meses com meta atingida
                    {h.mesesSuperAtingidos > 0 && <span className="ml-2 text-amber-400">· ★ {h.mesesSuperAtingidos} super meta{h.mesesSuperAtingidos > 1 ? "s" : ""}</span>}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      ))}

      {empsFiltradas.length === 0 && (
        <Card className="p-12 border-0 shadow-sm rounded-2xl bg-card text-center">
          <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Nenhuma empresa encontrada para exibir o histórico.</p>
        </Card>
      )}
    </div>
  );
}
