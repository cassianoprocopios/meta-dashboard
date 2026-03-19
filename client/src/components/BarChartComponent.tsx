import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps {
  data: {
    morumbi: { total: number; average: number };
    mascote: { total: number; average: number };
    seraphine: { total: number; average: number };
  };
}

export default function BarChartComponent({ data }: BarChartProps) {
  const chartData = [
    {
      name: "Total",
      Morumbi: data.morumbi.total,
      Mascote: data.mascote.total,
      Seraphine: data.seraphine.total,
    },
    {
      name: "Média",
      Morumbi: data.morumbi.average,
      Mascote: data.mascote.average,
      Seraphine: data.seraphine.average,
    },
  ];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" stroke="#64748b" />
        <YAxis stroke="#64748b" />
        <Tooltip
          contentStyle={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
          formatter={(value: number) => `R$ ${(value / 1000).toFixed(1)}k`}
        />
        <Legend />
        <Bar dataKey="Morumbi" fill="#3b82f6" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Mascote" fill="#a855f7" radius={[8, 8, 0, 0]} />
        <Bar dataKey="Seraphine" fill="#10b981" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
