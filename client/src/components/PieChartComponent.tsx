import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface PieChartProps {
  data: {
    morumbi: { total: number };
    mascote: { total: number };
    seraphine: { total: number };
  };
}

const COLORS = ["#3b82f6", "#a855f7", "#10b981"];

export default function PieChartComponent({ data }: PieChartProps) {
  const chartData = [
    {
      name: "Morumbi",
      value: data.morumbi.total,
    },
    {
      name: "Mascote",
      value: data.mascote.total,
    },
    {
      name: "Seraphine",
      value: data.seraphine.total,
    },
  ];

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [
            `R$ ${(value / 1000).toFixed(1)}k`,
            "Valor",
          ]}
          contentStyle={{
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
