import { Card } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: number;
  average: number;
  max: number;
  min: number;
  color: string;
  highlight?: boolean;
}

export default function MetricCard({
  title,
  value,
  average,
  max,
  min,
  color,
  highlight = false,
}: MetricCardProps) {
  return (
    <Card className={`relative overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 ${highlight ? "ring-2 ring-blue-200" : ""}`}>
      {/* Gradient Background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-5`} />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-600">{title}</h3>
          <TrendingUp className={`w-4 h-4 text-${color.split("-")[1]}-500`} />
        </div>

        {/* Main Value */}
        <div className="mb-4">
          <p className="text-3xl font-bold text-slate-900">
            R$ {(value / 1000).toFixed(1)}k
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Total do mês
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200">
          <div>
            <p className="text-xs text-slate-500 mb-1">Média</p>
            <p className="text-sm font-semibold text-slate-900">
              R$ {(average / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Máx</p>
            <p className="text-sm font-semibold text-slate-900">
              R$ {(max / 1000).toFixed(1)}k
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500 mb-1">Mín</p>
            <p className="text-sm font-semibold text-slate-900">
              R$ {(min / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
