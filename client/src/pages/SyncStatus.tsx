import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  CalendarClock,
  Activity,
  Database,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function formatRelativo(date: Date | string | null | undefined): string {
  if (!date) return "Nunca";
  const d = new Date(date);
  const agora = new Date();
  const diffMs = agora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "Agora mesmo";
  if (diffMin < 60) return `Há ${diffMin} min`;
  if (diffH < 24) return `Há ${diffH}h`;
  if (diffD === 1) return "Ontem";
  return `Há ${diffD} dias`;
}

function formatDataHora(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatProximoSync(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const agora = new Date();
  const diffMs = d.getTime() - agora.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  const diffMin = Math.floor((diffMs % 3600000) / 60000);

  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const dia = d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  if (diffH < 1) return `Em ${diffMin} min (${hora})`;
  if (diffH < 24) return `Em ${diffH}h${diffMin > 0 ? ` ${diffMin}min` : ""} (${hora})`;
  return `${dia} às ${hora}`;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
  if (status === "erro") return <XCircle className="w-5 h-5 text-red-400" />;
  if (status === "parcial") return <AlertTriangle className="w-5 h-5 text-amber-400" />;
  return <Clock className="w-5 h-5 text-slate-400" />;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") return <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">✓ OK</Badge>;
  if (status === "erro") return <Badge className="bg-red-500/20 text-red-300 border-red-500/30">✗ Erro</Badge>;
  if (status === "parcial") return <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30">⚠ Parcial</Badge>;
  if (status === "sem_dados") return <Badge className="bg-slate-500/20 text-slate-300 border-slate-500/30">Sem dados</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function nomeEmpresa(slug: string): string {
  const mapa: Record<string, string> = {
    morumbi: "Morumbi",
    mascote: "Mascote",
    seraphine: "Seraphine",
    "barbiero-grupo": "Barbiero Grupo",
  };
  return mapa[slug.toLowerCase()] ?? slug;
}

export default function SyncStatus() {
  const [, setLocation] = useLocation();
  const { data, isLoading, refetch } = trpc.cashbarber.painelStatus.useQuery(undefined, {
    refetchInterval: 30000, // Atualizar a cada 30s automaticamente
  });

  const syncManualMutation = trpc.cashbarber.syncManual.useMutation({
    onSuccess: (result) => {
      const empresas = Object.entries(result.resultados);
      const sucessos = empresas.filter(([, v]) => v.ok).length;
      const falhas = empresas.filter(([, v]) => !v.ok).length;
      if (falhas === 0) {
        toast.success(`Sync concluído com sucesso para ${sucessos} empresa(s)`);
      } else {
        toast.warning(`Sync: ${sucessos} ok, ${falhas} com erro`);
      }
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar: ${err.message}`);
    },
  });

  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      </div>
    );
  }

  const statusGeral = data?.statusGeral ?? "sem_dados";

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="mt-1 text-slate-400 hover:text-white hover:bg-slate-700 px-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="w-6 h-6 text-blue-400" />
              Status da Sincronização
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Monitoramento dos jobs automáticos do CashBarber
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={() => syncManualMutation.mutate()}
            disabled={syncManualMutation.isPending}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncManualMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sync Manual
          </Button>
        </div>
      </div>

      {/* Cards de Status Geral */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status Geral */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                statusGeral === "ok" ? "bg-emerald-500/20" :
                statusGeral === "erro" ? "bg-red-500/20" :
                statusGeral === "parcial" ? "bg-amber-500/20" :
                "bg-slate-600/40"
              }`}>
                <StatusIcon status={statusGeral} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Status Geral</p>
                <div className="mt-1">
                  <StatusBadge status={statusGeral} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Último Sync */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Último Sync</p>
                <p className="text-white font-semibold text-sm mt-1">
                  {data?.ultimosPorEmpresa?.[0]
                    ? formatRelativo(data.ultimosPorEmpresa[0].executadoEm)
                    : "Nunca"}
                </p>
                {data?.ultimosPorEmpresa?.[0] && (
                  <p className="text-slate-500 text-xs">
                    {formatDataHora(data.ultimosPorEmpresa[0].executadoEm)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Próximo Sync */}
        <Card className="bg-slate-800/60 border-slate-700">
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <CalendarClock className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wide">Próximo Sync Auto</p>
                <p className="text-white font-semibold text-sm mt-1">
                  {formatProximoSync(data?.proximoSync)}
                </p>
                <p className="text-slate-500 text-xs">Todo dia às 06:00 BRT</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status por Empresa */}
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            Status por Empresa
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.ultimosPorEmpresa || data.ultimosPorEmpresa.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              Nenhum sync registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {data.ultimosPorEmpresa.map((emp) => (
                <div
                  key={emp.empresaSlug}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/40 border border-slate-600/40"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon status={emp.status} />
                    <div>
                      <p className="text-white font-medium text-sm">
                        {nomeEmpresa(emp.empresaSlug)}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {formatDataHora(emp.executadoEm)} · {emp.diasSincronizados} dias sincronizados
                      </p>
                      {emp.erros && (
                        <p className="text-red-400 text-xs mt-1 max-w-xs truncate" title={emp.erros}>
                          {emp.erros}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={emp.status} />
                    <span className="text-slate-500 text-xs hidden sm:block">
                      {formatRelativo(emp.executadoEm)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Jobs Ativos */}
      {data?.jobsAtivos && data.jobsAtivos.length > 0 && (
        <Card className="bg-slate-800/60 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Jobs Ativos ({data.jobsAtivos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.jobsAtivos.map((job) => (
                <div
                  key={`${job.tenantId}-${job.empresaSlug}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-slate-200 text-sm font-medium">
                      {nomeEmpresa(job.empresaSlug)}
                    </span>
                    <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                      Tenant #{job.tenantId}
                    </Badge>
                  </div>
                  <div className="text-right">
                    {job.ultimaExecucao && (
                      <p className="text-slate-400 text-xs">
                        Último: {formatRelativo(job.ultimaExecucao)}
                      </p>
                    )}
                    {job.proximaExecucao && (
                      <p className="text-slate-500 text-xs">
                        Próximo: {formatRelativo(job.proximaExecucao)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de Logs */}
      <Card className="bg-slate-800/60 border-slate-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-slate-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            Histórico de Sincronizações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!data?.logsRecentes || data.logsRecentes.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-4">
              Nenhum log disponível.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {data.logsRecentes.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <StatusIcon status={log.status} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-200 text-sm font-medium">
                        {nomeEmpresa(log.empresaSlug)}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-slate-600 text-slate-400"
                      >
                        {log.origem === "auto" ? "Automático" : "Manual"}
                      </Badge>
                      <span className="text-slate-500 text-xs">
                        {log.mes}/{log.ano}
                      </span>
                    </div>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {formatDataHora(log.executadoEm)} · {log.diasSincronizados} dias
                      {log.diasIgnorados > 0 && ` · ${log.diasIgnorados} ignorados`}
                    </p>
                    {expandedLog === log.id && log.erros && (
                      <p className="text-red-400 text-xs mt-1 p-2 bg-red-900/20 rounded border border-red-800/30">
                        {log.erros}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={log.status} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
