import DashboardLayout from "@/components/DashboardLayout";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crosshair, TrendingUp, TrendingDown, Minus, ChevronLeft } from "lucide-react";
import { useLocation } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

const OPCOES_MESES = [3, 6, 12];

function badgeAcuracia(val: number | null) {
  if (val === null) return { label: "Sem dados", cor: "text-muted-foreground", bg: "bg-muted/30" };
  if (val >= 85) return { label: "Excelente", cor: "text-emerald-500", bg: "bg-emerald-500/10" };
  if (val >= 70) return { label: "Regular", cor: "text-amber-500", bg: "bg-amber-500/10" };
  return { label: "Baixa", cor: "text-red-500", bg: "bg-red-500/10" };
}

function tendencia(periodos: Array<{ acuraciaGlobal: number | null }>) {
  const vals = periodos.map((p) => p.acuraciaGlobal).filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const diff = vals[vals.length - 1] - vals[0];
  if (diff > 2) return "up";
  if (diff < -2) return "down";
  return "stable";
}

// Tooltip customizado para o gráfico de linha
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground flex-1">{entry.name}</span>
          <span className="font-bold" style={{ color: entry.color }}>
            {entry.value !== null && entry.value !== undefined
              ? `${(entry.value as number).toFixed(1)}%`
              : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function HistoricoAcuracia() {
  const [, navigate] = useLocation();
  const [qtdMeses, setQtdMeses] = useState(6);

  const { data, isLoading } = trpc.historicoAcuracia.listar.useQuery({ meses: qtdMeses });

  const periodos = data?.periodos ?? [];
  const empresas = data?.empresas ?? [];

  // Dados para o gráfico de linha
  const lineData = periodos.map((p) => {
    const ponto: Record<string, any> = { label: p.label };
    ponto["Global"] = p.acuraciaGlobal !== null ? parseFloat(p.acuraciaGlobal.toFixed(1)) : null;
    empresas.forEach((emp) => {
      const ac = p.porEmpresa[emp.slug];
      ponto[emp.nome] = ac?.acuraciaMedia !== null && ac?.acuraciaMedia !== undefined
        ? parseFloat(ac.acuraciaMedia.toFixed(1))
        : null;
    });
    return ponto;
  });

  const tend = tendencia(periodos);
  const ultimoMes = periodos[periodos.length - 1];
  const acuraciaAtual = ultimoMes?.acuraciaGlobal ?? null;
  const badge = badgeAcuracia(acuraciaAtual);

  // Média geral dos períodos com dados
  const periodosComDados = periodos.filter((p) => p.acuraciaGlobal !== null);
  const mediaGeral = periodosComDados.length > 0
    ? periodosComDados.reduce((s, p) => s + (p.acuraciaGlobal ?? 0), 0) / periodosComDados.length
    : null;

  // Melhor e pior mês
  const melhorMes = periodosComDados.reduce<typeof periodos[0] | null>((best, p) =>
    best === null || (p.acuraciaGlobal ?? 0) > (best.acuraciaGlobal ?? 0) ? p : best, null);
  const piorMes = periodosComDados.reduce<typeof periodos[0] | null>((worst, p) =>
    worst === null || (p.acuraciaGlobal ?? 0) < (worst.acuraciaGlobal ?? 0) ? p : worst, null);

  const CORES_EMPRESAS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

  return (
    <DashboardLayout>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
            Carregando histórico...
          </div>
        ) : periodosComDados.length === 0 ? (
          <Card className="p-8 text-center border-0 shadow-sm rounded-2xl bg-card">
            <Crosshair className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">Nenhuma previsão encontrada</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lance faturamentos com datas futuras para começar a registrar previsões e acompanhar a acurácia.
            </p>
          </Card>
        ) : (
          <>
            {/* KPIs de resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Acurácia atual */}
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs text-muted-foreground mb-1">Mês atual</p>
                <p className={`text-2xl font-bold ${badge.cor}`}>
                  {acuraciaAtual !== null ? `${acuraciaAtual.toFixed(1)}%` : "—"}
                </p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.cor}`}>
                  {badge.label}
                </span>
              </Card>

              {/* Média geral */}
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs text-muted-foreground mb-1">Média {qtdMeses}m</p>
                <p className="text-2xl font-bold text-foreground">
                  {mediaGeral !== null ? `${mediaGeral.toFixed(1)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{periodosComDados.length} meses com dados</p>
              </Card>

              {/* Melhor mês */}
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs text-muted-foreground mb-1">Melhor mês</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {melhorMes?.acuraciaGlobal !== null && melhorMes?.acuraciaGlobal !== undefined
                    ? `${melhorMes.acuraciaGlobal.toFixed(1)}%`
                    : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">{melhorMes?.label ?? "—"}</p>
              </Card>

              {/* Tendência */}
              <Card className="p-4 border-0 shadow-sm rounded-2xl bg-card">
                <p className="text-xs text-muted-foreground mb-1">Tendência</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {tend === "up" && <TrendingUp className="w-6 h-6 text-emerald-500" />}
                  {tend === "down" && <TrendingDown className="w-6 h-6 text-red-500" />}
                  {tend === "stable" && <Minus className="w-6 h-6 text-amber-500" />}
                  {tend === null && <Minus className="w-6 h-6 text-muted-foreground" />}
                  <span className={`text-sm font-semibold ${
                    tend === "up" ? "text-emerald-500"
                    : tend === "down" ? "text-red-500"
                    : "text-amber-500"
                  }`}>
                    {tend === "up" ? "Melhorando" : tend === "down" ? "Piorando" : "Estável"}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">vs. início do período</p>
              </Card>
            </div>

            {/* Gráfico de linha */}
            <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <Crosshair className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <h2 className="font-semibold text-foreground text-sm">Evolução da Acurácia</h2>
                  <p className="text-xs text-muted-foreground">Precisão das previsões por mês</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={lineData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                  />
                  {/* Linha de referência 85% (excelente) */}
                  <ReferenceLine
                    y={85}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{ value: "85%", position: "right", fontSize: 10, fill: "#10b981" }}
                  />
                  {/* Linha de referência 70% (regular) */}
                  <ReferenceLine
                    y={70}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeOpacity={0.4}
                    label={{ value: "70%", position: "right", fontSize: 10, fill: "#f59e0b" }}
                  />
                  {/* Linha global */}
                  <Line
                    type="monotone"
                    dataKey="Global"
                    name="Global"
                    stroke="#a78bfa"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#a78bfa", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                  {/* Linhas por empresa */}
                  {empresas.map((emp, i) => (
                    <Line
                      key={emp.slug}
                      type="monotone"
                      dataKey={emp.nome}
                      name={emp.nome}
                      stroke={emp.cor || CORES_EMPRESAS[i % CORES_EMPRESAS.length]}
                      strokeWidth={1.5}
                      strokeDasharray="5 3"
                      dot={{ r: 3, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Tabela detalhada por mês */}
            <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
              <h2 className="font-semibold text-foreground text-sm mb-4">Detalhamento por Mês</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="text-left text-xs text-muted-foreground font-medium pb-2 pr-4">Mês</th>
                      <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">Dias</th>
                      <th className="text-right text-xs text-muted-foreground font-medium pb-2 pr-4">Global</th>
                      {empresas.map((emp) => (
                        <th key={emp.slug} className="text-right text-xs font-medium pb-2 pr-4" style={{ color: emp.cor }}>
                          {emp.nome}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...periodos].reverse().map((p) => {
                      const b = badgeAcuracia(p.acuraciaGlobal);
                      return (
                        <tr key={p.label} className="border-b border-border/20 hover:bg-muted/10 transition-colors">
                          <td className="py-2.5 pr-4 font-medium text-foreground">{p.label}</td>
                          <td className="py-2.5 pr-4 text-right text-muted-foreground text-xs">
                            {p.totalDias > 0 ? `${p.totalDias} dia${p.totalDias !== 1 ? "s" : ""}` : "—"}
                          </td>
                          <td className="py-2.5 pr-4 text-right">
                            {p.acuraciaGlobal !== null ? (
                              <span className={`font-bold ${b.cor}`}>
                                {p.acuraciaGlobal.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                          {empresas.map((emp) => {
                            const ac = p.porEmpresa[emp.slug];
                            const bEmp = badgeAcuracia(ac?.acuraciaMedia ?? null);
                            return (
                              <td key={emp.slug} className="py-2.5 pr-4 text-right">
                                {ac?.acuraciaMedia !== null && ac?.acuraciaMedia !== undefined ? (
                                  <span className={`text-xs font-semibold ${bEmp.cor}`}>
                                    {ac.acuraciaMedia.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground text-xs">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {/* Legenda de classificação */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border/20">
                <span className="text-[10px] text-muted-foreground">Classificação:</span>
                <span className="text-[10px] text-emerald-500 font-medium">● Excelente ≥85%</span>
                <span className="text-[10px] text-amber-500 font-medium">● Regular ≥70%</span>
                <span className="text-[10px] text-red-500 font-medium">● Baixa &lt;70%</span>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
