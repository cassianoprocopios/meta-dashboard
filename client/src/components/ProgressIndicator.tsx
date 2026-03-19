import { Card } from "@/components/ui/card";
import { CheckCircle2, AlertCircle } from "lucide-react";

interface ProgressIndicatorProps {
  title: string;
  current: number;
  target: number;
  percent: number;
}

export default function ProgressIndicator({
  title,
  current,
  target,
  percent,
}: ProgressIndicatorProps) {
  const isOnTrack = percent >= 80;
  const isExceeded = percent >= 100;

  return (
    <Card className="p-8 border-0 shadow-sm bg-gradient-to-r from-blue-50 to-slate-50">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isExceeded ? "Meta atingida!" : isOnTrack ? "No caminho certo" : "Precisa melhorar"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isOnTrack ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : (
            <AlertCircle className="w-8 h-8 text-orange-500" />
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">
            R$ {current.toFixed(2)}
          </span>
          <span className="text-sm font-semibold text-slate-700">
            R$ {target.toFixed(2)}
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExceeded
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                : isOnTrack
                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                : "bg-gradient-to-r from-orange-500 to-orange-600"
            }`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Percentual</p>
          <p className="text-2xl font-bold text-slate-900">
            {Math.min(percent, 100).toFixed(0)}%
          </p>
        </div>
        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Faltando</p>
          <p className="text-2xl font-bold text-slate-900">
            R$ {Math.max(0, target - current).toFixed(0)}
          </p>
        </div>
        <div className="bg-white/50 rounded-lg p-3">
          <p className="text-xs text-slate-500 mb-1">Status</p>
          <p className={`text-sm font-bold ${
            isExceeded
              ? "text-emerald-600"
              : isOnTrack
              ? "text-blue-600"
              : "text-orange-600"
          }`}>
            {isExceeded ? "✓ Atingida" : isOnTrack ? "✓ OK" : "✗ Baixa"}
          </p>
        </div>
      </div>
    </Card>
  );
}
