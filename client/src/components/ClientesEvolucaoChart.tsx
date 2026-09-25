import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface ClientesEvolucaoChartProps {
  data: Array<{
    mes: number;
    ano: number;
    mesLabel: string;
    totalClientes: number;
    porProfissional: Record<string, number>;
    fonte?: "cashbarber_relatorio09" | "legado";
    sincronizadoEm?: Date | string | null;
  }>;
  isLoading?: boolean;
}

// Componente customizado para tooltip detalhado
function CustomTooltip({ active, payload, label, data }: any) {
  if (!active || !payload || !payload.length) return null;

  const dataIndex = payload[0].payload.dataIndex;
  const mesData = data[dataIndex];

  if (!mesData) return null;

  // Calcular variação em relação ao mês anterior
  let variacao = 0;
  let variacaoPercentual: string | number = 0;
  if (dataIndex > 0) {
    variacao = mesData.totalClientes - data[dataIndex - 1].totalClientes;
    variacaoPercentual =
      data[dataIndex - 1].totalClientes > 0
        ? ((variacao / data[dataIndex - 1].totalClientes) * 100).toFixed(1)
        : "0";
  }

  // Obter top 3 profissionais do mês
  const profissionaisOrdenados = Object.entries(mesData.porProfissional)
    .map(([nome, clientes]) => ({ nome, clientes: clientes as number }))
    .sort((a, b) => (b.clientes as number) - (a.clientes as number))
    .slice(0, 3);

  const cresceu = variacao >= 0;

  return (
    <div className="bg-slate-900/95 border border-slate-700/50 rounded-lg p-3 shadow-lg">
      {/* Cabeçalho */}
      <div className="mb-2 pb-2 border-b border-slate-700/30">
        <p className="text-sm font-bold text-white">{mesData.mesLabel}</p>
      </div>

      {/* Total de Clientes */}
      <div className="mb-2">
        <p className="text-xs text-slate-400">Total de Clientes</p>
        <p className="text-lg font-bold text-blue-400">{mesData.totalClientes}</p>
      </div>

      {/* Variação */}
      {dataIndex > 0 && (
        <div className="mb-2 pb-2 border-b border-slate-700/30">
          <p className="text-xs text-slate-400">Variação vs Mês Anterior</p>
          <div className="flex items-center gap-1">
            {cresceu ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-400" />
            )}
            <span className={`text-sm font-bold ${cresceu ? "text-emerald-400" : "text-red-400"}`}>
              {cresceu ? "+" : ""}{variacao} ({variacaoPercentual}%)
            </span>
          </div>
        </div>
      )}

      {/* Top 3 Profissionais */}
      {profissionaisOrdenados.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-1">Top Profissionais</p>
          <div className="space-y-1">
            {profissionaisOrdenados.map((prof, idx) => (
              <div key={prof.nome} className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-300">#{idx + 1}</span>                  <span className="text-xs text-slate-300 truncate max-w-[150px]">
                    {prof.nome}
                  </span>
                </div>
                <span className="text-xs font-bold text-purple-400">{prof.clientes}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientesEvolucaoChart({ data, isLoading }: ClientesEvolucaoChartProps) {
  if (isLoading) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
        </div>
        <div className="h-64 flex items-center justify-center text-muted-foreground">
          Sem dados disponíveis
        </div>
      </Card>
    );
  }

  // Preparar dados para o gráfico com índice para referência no tooltip
  const chartData = data.map((item, idx) => ({
    name: item.mesLabel,
    clientes: item.totalClientes,
    dataIndex: idx as number,
  }));

  // Calcular tendência geral
  const primeiroMes = data[0].totalClientes;
  const ultimoMes = data[data.length - 1].totalClientes;
  const variacao = ultimoMes - primeiroMes;
  const percentualVariacao = primeiroMes > 0 ? ((variacao / primeiroMes) * 100).toFixed(1) : "0";
  const cresceu = variacao >= 0;

  // Calcular estatísticas adicionais
  const totalClientesGeral = data.reduce((sum, item) => sum + item.totalClientes, 0);
  const mediaClientes = (totalClientesGeral / data.length).toFixed(0);
  const maxClientes = Math.max(...data.map((item) => item.totalClientes));
  const minClientes = Math.min(...data.map((item) => item.totalClientes));

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
            <p className="text-xs text-muted-foreground">
              Relatório 09 do CashBarber • Passe o mouse para detalhes
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-sm font-bold ${cresceu ? "text-emerald-400" : "text-amber-400"}`}>
            {cresceu ? "+" : ""}{variacao}
          </p>
          <p className={`text-xs ${cresceu ? "text-emerald-400" : "text-amber-400"}`}>
            {cresceu ? "+" : ""}{percentualVariacao}%
          </p>
        </div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="name"
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "12px" }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.5)"
              style={{ fontSize: "12px" }}
            />
            <Tooltip
              content={<CustomTooltip data={data} />}
              cursor={{ stroke: "rgba(59, 130, 246, 0.3)", strokeWidth: 2 }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="clientes"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6, fill: "#60a5fa" }}
              name="Total de Clientes"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumo por mês com mais detalhes */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.map((item, idx) => {
          const variacaoMes = idx > 0 ? item.totalClientes - data[idx - 1].totalClientes : 0;
          const cresceuMes = variacaoMes >= 0;

          return (
            <div
              key={`${item.ano}-${item.mes}`}
              className="p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
            >
              <p className="text-xs text-muted-foreground">{item.mesLabel}</p>
              <p className="text-sm font-bold text-foreground">{item.totalClientes}</p>
              {idx > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  {cresceuMes ? (
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-400" />
                  )}
                  <span
                    className={`text-xs font-medium ${
                      cresceuMes ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {cresceuMes ? "+" : ""}{variacaoMes}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Estatísticas adicionais */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Média</p>
            <p className="text-sm font-bold text-foreground">{mediaClientes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Máximo</p>
            <p className="text-sm font-bold text-emerald-400">{maxClientes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Mínimo</p>
            <p className="text-sm font-bold text-amber-400">{minClientes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-sm font-bold text-blue-400">{totalClientesGeral}</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
