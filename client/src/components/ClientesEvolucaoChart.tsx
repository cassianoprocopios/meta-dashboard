import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface ClientesEvolucaoChartProps {
  data: Array<{
    mes: number;
    ano: number;
    mesLabel: string;
    totalClientes: number;
    porProfissional: Record<string, number>;
  }>;
  isLoading?: boolean;
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

  // Preparar dados para o gráfico
  const chartData = data.map((item) => ({
    name: item.mesLabel,
    clientes: item.totalClientes,
  }));

  // Calcular tendência
  const primeiroMes = data[0].totalClientes;
  const ultimoMes = data[data.length - 1].totalClientes;
  const variacao = ultimoMes - primeiroMes;
  const percentualVariacao = primeiroMes > 0 ? ((variacao / primeiroMes) * 100).toFixed(1) : "0";
  const cresceu = variacao >= 0;

  return (
    <Card className="p-5 border-0 shadow-sm rounded-2xl bg-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Evolução de Clientes</h3>
            <p className="text-xs text-muted-foreground">Últimos 3 meses</p>
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
              contentStyle={{
                backgroundColor: "rgba(0,0,0,0.8)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.9)" }}
              formatter={(value: any) => [value, "Clientes"]}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="clientes"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", r: 4 }}
              activeDot={{ r: 6 }}
              name="Total de Clientes"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Resumo por mês */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.map((item) => (
          <div key={`${item.ano}-${item.mes}`} className="p-2 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">{item.mesLabel}</p>
            <p className="text-sm font-bold text-foreground">{item.totalClientes}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
