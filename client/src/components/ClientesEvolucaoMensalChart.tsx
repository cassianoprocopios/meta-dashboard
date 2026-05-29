import React from "react";
import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp } from "lucide-react";

interface DadosMensal {
  mes: string;
  mesNumero: number;
  ano: number;
  morumbi: number;
  mascote: number;
  seraphine?: number;
}

interface ClientesEvolucaoMensalChartProps {
  dados: DadosMensal[];
  isLoading?: boolean;
}

const CORES = {
  morumbi: "#3b82f6", // Azul
  mascote: "#10b981", // Verde
  seraphine: "#f59e0b", // Laranja
};

export default function ClientesEvolucaoMensalChart({
  dados,
  isLoading,
}: ClientesEvolucaoMensalChartProps) {
  if (isLoading) {
    return (
      <Card className="p-6 bg-slate-900/50 border-slate-700">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3"></div>
          <div className="h-64 bg-slate-700 rounded"></div>
        </div>
      </Card>
    );
  }

  if (!dados || dados.length === 0) {
    return (
      <Card className="p-6 bg-slate-900/50 border-slate-700">
        <div className="text-center py-12">
          <p className="text-slate-400">Nenhum dado disponível para exibição</p>
        </div>
      </Card>
    );
  }

  // Calcular variações
  const calcularVariacao = (unidade: "morumbi" | "mascote" | "seraphine") => {
    if (dados.length < 2) return 0;
    const primeiro = dados[0][unidade] || 0;
    const ultimo = dados[dados.length - 1][unidade] || 0;
    return primeiro > 0 ? ((ultimo - primeiro) / primeiro) * 100 : 0;
  };

  const variacaoMorumbi = calcularVariacao("morumbi");
  const variacaoMascote = calcularVariacao("mascote");
  const variacaoSeraphine = dados.some((d) => d.seraphine)
    ? calcularVariacao("seraphine")
    : null;

  // Dados formatados para o gráfico
  const dadosGrafico = dados.map((d) => ({
    ...d,
    label: `${d.mes.substring(0, 3)}/${d.ano}`,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-semibold text-white mb-2">{data.label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString("pt-BR")}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 border-slate-700">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Evolução Mensal de Clientes</h3>
        </div>

        {/* Resumo de Variações */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Morumbi */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Morumbi</p>
            <p className="text-sm font-semibold text-blue-400">
              {dados[dados.length - 1]?.morumbi?.toLocaleString("pt-BR") || "—"}
            </p>
            <p
              className={`text-xs mt-1 ${
                variacaoMorumbi > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {variacaoMorumbi > 0 ? "+" : ""}
              {variacaoMorumbi.toFixed(1)}%
            </p>
          </div>

          {/* Mascote */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Mascote</p>
            <p className="text-sm font-semibold text-emerald-400">
              {dados[dados.length - 1]?.mascote?.toLocaleString("pt-BR") || "—"}
            </p>
            <p
              className={`text-xs mt-1 ${
                variacaoMascote > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {variacaoMascote > 0 ? "+" : ""}
              {variacaoMascote.toFixed(1)}%
            </p>
          </div>

          {/* Seraphine (se houver dados) */}
          {variacaoSeraphine !== null && (
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
              <p className="text-xs text-slate-400 mb-1">Seraphine</p>
              <p className="text-sm font-semibold text-amber-400">
                {dados[dados.length - 1]?.seraphine?.toLocaleString("pt-BR") || "—"}
              </p>
              <p
                className={`text-xs mt-1 ${
                  variacaoSeraphine > 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {variacaoSeraphine > 0 ? "+" : ""}
                {variacaoSeraphine.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {/* Gráfico */}
        <div className="w-full h-80 bg-slate-800/30 rounded-lg p-4 border border-slate-700">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                formatter={(value) => (
                  <span style={{ color: "#e2e8f0", fontSize: "12px" }}>
                    {value === "morumbi"
                      ? "Morumbi"
                      : value === "mascote"
                      ? "Mascote"
                      : "Seraphine"}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="morumbi"
                stroke={CORES.morumbi}
                strokeWidth={2}
                dot={{ fill: CORES.morumbi, r: 4 }}
                activeDot={{ r: 6 }}
                name="Morumbi"
              />
              <Line
                type="monotone"
                dataKey="mascote"
                stroke={CORES.mascote}
                strokeWidth={2}
                dot={{ fill: CORES.mascote, r: 4 }}
                activeDot={{ r: 6 }}
                name="Mascote"
              />
              {dados.some((d) => d.seraphine) && (
                <Line
                  type="monotone"
                  dataKey="seraphine"
                  stroke={CORES.seraphine}
                  strokeWidth={2}
                  dot={{ fill: CORES.seraphine, r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Seraphine"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legenda de Cores */}
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.morumbi }}></div>
            <span className="text-slate-300">Morumbi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.mascote }}></div>
            <span className="text-slate-300">Mascote</span>
          </div>
          {dados.some((d) => d.seraphine) && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CORES.seraphine }}></div>
              <span className="text-slate-300">Seraphine</span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
