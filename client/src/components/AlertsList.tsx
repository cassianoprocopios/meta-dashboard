import { Card } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

interface Alert {
  id: number;
  type: "warning" | "success" | "info";
  title: string;
  message: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export default function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card className="p-6 border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-slate-50">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-slate-900">Tudo em ordem!</h3>
            <p className="text-sm text-slate-600 mt-1">
              Nenhum alerta no momento. Todas as metas estão sendo monitoradas.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Alertas</h2>
      {alerts.map((alert) => (
        <Card
          key={alert.id}
          className={`p-4 border-0 shadow-sm transition-all ${
            alert.type === "warning"
              ? "bg-gradient-to-r from-orange-50 to-slate-50"
              : alert.type === "success"
              ? "bg-gradient-to-r from-emerald-50 to-slate-50"
              : "bg-gradient-to-r from-blue-50 to-slate-50"
          }`}
        >
          <div className="flex items-start gap-3">
            {alert.type === "warning" && (
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            )}
            {alert.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
            )}
            {alert.type === "info" && (
              <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <h3 className="font-semibold text-slate-900">{alert.title}</h3>
              <p className="text-sm text-slate-600 mt-1">{alert.message}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
