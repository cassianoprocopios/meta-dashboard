import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Clock,
  Activity,
  Database,
  Scissors,
  Repeat,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nomeEmpresa(slug: string) {
  const mapa: Record<string, string> = {
    morumbi: "Morumbi",
    mascote: "Mascote",
    seraphine: "Seraphine",
    "barbiero-morumbi": "Morumbi",
    "barbiero-mascote": "Mascote",
    "barbiero-grupo": "Grupo",
    MORUMBI: "Morumbi",
    MASCOTE: "Mascote",
    SERAPHINE: "Seraphine",
  };
  return mapa[slug] ?? slug;
}

function formatRelativo(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "agora mesmo";
  if (diff < 3600) return `há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  return `há ${Math.floor(diff / 86400)}d`;
}

function formatDataHora(date: Date | string | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValor(v: number | string | null | undefined) {
  if (v == null) return "—";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ─── Componentes de Status ────────────────────────────────────────────────────

function StatusDot({ ok, pulse = false }: { ok: boolean; pulse?: boolean }) {
  return (
    <span
      className={`inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 ${
        ok ? "bg-emerald-400" : "bg-red-400"
      } ${pulse ? "animate-pulse" : ""}`}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    sucesso: { label: "Sucesso", cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    sem_dados: { label: "Sem dados", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
    erro: { label: "Erro", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
    falha: { label: "Falha", cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const s = map[status] ?? { label: status, cls: "bg-slate-500/20 text-slate-300 border-slate-500/30" };
  return (
    <Badge variant="outline" className={`text-xs border ${s.cls}`}>
      {s.label}
    </Badge>
  );
}

function StatusIcon({ status }: { status: string }) {
  if (status === "ok" || status === "sucesso")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />;
  if (status === "sem_dados")
    return <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />;
  return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />;
}

// ─── Card de Último Sync por Empresa ─────────────────────────────────────────

function UltimoSyncCard({
  logs,
  sistema,
}: {
  logs: any[];
  sistema: "cashbarber" | "avec" | "dpote";
}) {
  if (!logs || logs.length === 0) {
    return (
      <div className="text-slate-500 text-sm text-center py-4">
        Nenhum registro encontrado.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const isOk = log.status === "ok" || log.status === "sucesso" || (!log.erro && log.diasAtualizados > 0);
        const slug = log.empresaSlug ?? log.empresaSlug;
        return (
          <div
            key={slug}
            className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-600/30"
          >
            <div className="flex items-center gap-2.5">
              <StatusDot ok={isOk} pulse={isOk} />
              <div>
                <p className="text-slate-200 text-sm font-medium">{nomeEmpresa(slug)}</p>
                <p className="text-slate-500 text-xs">{formatRelativo(log.executadoEm)}</p>
              </div>
            </div>
            <div className="text-right">
              {sistema !== "dpote" && (
                <p className="text-slate-400 text-xs">
                  {log.diasSincronizados ?? 0} dias · {log.diasIgnorados ?? 0} ignorados
                </p>
              )}
              {sistema === "dpote" && log.valorNovo != null && (
                <p className="text-slate-400 text-xs">{formatValor(log.valorNovo)}</p>
              )}
              {sistema !== "dpote" && <StatusBadge status={log.status ?? "ok"} />}
              {sistema === "dpote" && (
                <Badge
                  variant="outline"
                  className={`text-xs border ${
                    !log.erro
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : "bg-red-500/20 text-red-300 border-red-500/30"
                  }`}
                >
                  {!log.erro ? "OK" : "Erro"}
                </Badge>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Histórico de Logs ────────────────────────────────────────────────────────

function HistoricoLogs({ logs, sistema }: { logs: any[]; sistema: "cashbarber" | "avec" | "dpote" }) {
  const [expandedLog, setExpandedLog] = useState<number | null>(null);

  if (!logs || logs.length === 0) {
    return (
      <p className="text-slate-400 text-sm text-center py-4">Nenhum log disponível.</p>
    );
  }

  return (
    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
      {logs.map((log, idx) => {
        const status =
          sistema === "dpote"
            ? log.erro
              ? "erro"
              : "sucesso"
            : log.status ?? "ok";
        const isExpanded = expandedLog === idx;
        const erroMsg =
          sistema === "dpote" ? log.erro : log.erros;
        return (
          <div
            key={idx}
            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
            onClick={() => setExpandedLog(isExpanded ? null : idx)}
          >
            <StatusIcon status={status} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-slate-200 text-sm font-medium">
                  {nomeEmpresa(log.empresaSlug)}
                </span>
                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                  {(log.origem ?? log.tipoExecucao ?? "auto") === "auto" || (log.origem ?? log.tipoExecucao) === "automatico"
                    ? "Automático"
                    : "Manual"}
                </Badge>
                <span className="text-slate-500 text-xs">
                  {log.mes}/{log.ano}
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {formatDataHora(log.executadoEm)}
                {sistema !== "dpote" &&
                  ` · ${log.diasSincronizados ?? 0} dias${log.diasIgnorados > 0 ? ` · ${log.diasIgnorados} ignorados` : ""}`}
                {sistema === "dpote" &&
                  log.valorNovo != null &&
                  ` · ${formatValor(log.valorNovo)} · ${log.diasAtualizados ?? 0} dias`}
              </p>
              {isExpanded && erroMsg && (
                <p className="text-red-400 text-xs mt-1 p-2 bg-red-900/20 rounded border border-red-800/30">
                  {erroMsg}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              <StatusBadge status={status} />
              {erroMsg && (
                isExpanded ? (
                  <ChevronUp className="w-3 h-3 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-slate-500" />
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Painel de Sistema ────────────────────────────────────────────────────────

function PainelSistema({
  titulo,
  icone,
  cor,
  ultimoSync,
  historico,
  jobs,
  sistema,
  onSync,
  syncing,
}: {
  titulo: string;
  icone: React.ReactNode;
  cor: string;
  ultimoSync: any[];
  historico: any[];
  jobs?: any[];
  sistema: "cashbarber" | "avec" | "dpote";
  onSync: () => void;
  syncing: boolean;
}) {
  const totalEmpresas = ultimoSync.length;
  const totalOk = ultimoSync.filter(
    (l) => l.status === "ok" || l.status === "sucesso" || (!l.erro && (l.diasAtualizados ?? 0) > 0)
  ).length;
  const tudo_ok = totalOk === totalEmpresas && totalEmpresas > 0;

  return (
    <div className="space-y-3">
      {/* Header do sistema */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${cor}`}>{icone}</div>
          <div>
            <h3 className="text-slate-200 font-semibold text-sm">{titulo}</h3>
            <p className="text-slate-500 text-xs">
              {totalOk}/{totalEmpresas} empresa{totalEmpresas !== 1 ? "s" : ""} sincronizada{totalEmpresas !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              tudo_ok ? "bg-emerald-400 animate-pulse" : totalOk > 0 ? "bg-yellow-400" : "bg-red-400"
            }`}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={onSync}
            disabled={syncing}
            className="h-7 text-xs bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white"
          >
            <RefreshCw className={`w-3 h-3 mr-1.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sincronizando..." : "Sincronizar"}
          </Button>
        </div>
      </div>

      {/* Último sync por empresa */}
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
          Último sync por empresa
        </p>
        <UltimoSyncCard logs={ultimoSync} sistema={sistema} />
      </div>

      {/* Jobs ativos */}
      {jobs && jobs.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
            Jobs agendados
          </p>
          <div className="space-y-1.5">
            {jobs.map((job: any, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-700/20 border border-slate-600/20"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-300 text-xs">
                    {nomeEmpresa(job.empresaSlug ?? "")} — {job.cron ?? job.horario ?? ""}
                  </span>
                </div>
                {job.ultimaExecucao && (
                  <span className="text-slate-500 text-xs">{formatRelativo(job.ultimaExecucao)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico */}
      <div>
        <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">
          Histórico recente
        </p>
        <HistoricoLogs logs={historico} sistema={sistema} />
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function SyncStatus() {
  const [syncingCB, setSyncingCB] = useState(false);
  const [syncingAvec, setSyncingAvec] = useState(false);
  const [syncingDpote, setSyncingDpote] = useState(false);

  const { data, isLoading, refetch } = trpc.syncPainel.status.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const mutSyncCB = trpc.syncPainel.syncCashbarber.useMutation({
    onSuccess: (res) => {
      toast.success("CashBarber sincronizado! Dados atualizados com sucesso.");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar CashBarber: ${err.message}`);
    },
    onSettled: () => setSyncingCB(false),
  });

  const mutSyncAvec = trpc.syncPainel.syncAvec.useMutation({
    onSuccess: () => {
      toast.success("Avec sincronizado! Dados atualizados com sucesso.");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao sincronizar Avec: ${err.message}`);
    },
    onSettled: () => setSyncingAvec(false),
  });

  const mutSyncDpote = trpc.syncPainel.syncDpote.useMutation({
    onSuccess: () => {
      toast.success("D-Pote redistribuído! Recorrência atualizada com sucesso.");
      refetch();
    },
    onError: (err) => {
       toast.error(`Erro ao redistribuir D-Pote: ${err.message}`);
    },
    onSettled: () => setSyncingDpote(false),
  });

  const handleSyncCB = () => {
    setSyncingCB(true);
    mutSyncCB.mutate();
  };
  const handleSyncAvec = () => {
    setSyncingAvec(true);
    mutSyncAvec.mutate();
  };
  const handleSyncDpote = () => {
    setSyncingDpote(true);
    mutSyncDpote.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  const cbOk = (data?.cashbarber.porEmpresa ?? []).filter(
    (l: any) => l.status === "ok" || l.status === "sucesso"
  ).length;
  const avecOk = (data?.avec.porEmpresa ?? []).filter(
    (l: any) => l.status === "ok" || l.status === "sucesso"
  ).length;
  const dpoteOk = (data?.dpote.porEmpresa ?? []).filter((l: any) => !l.erro).length;
  const totalSistemas = 3;
  const sistemasOk = [cbOk > 0, avecOk > 0, dpoteOk > 0].filter(Boolean).length;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-400" />
            Status de Sincronização
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Monitoramento em tempo real dos sistemas de integração
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              sistemasOk === totalSistemas
                ? "bg-emerald-400 animate-pulse"
                : sistemasOk > 0
                ? "bg-yellow-400"
                : "bg-red-400"
            }`}
          />
          <span className="text-slate-400 text-xs">
            {sistemasOk}/{totalSistemas} sistemas OK
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-7 text-xs bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "CashBarber",
            ok: cbOk,
            total: data?.cashbarber.porEmpresa.length ?? 0,
            cor: "text-blue-400",
            bg: "bg-blue-500/10 border-blue-500/20",
          },
          {
            label: "Avec",
            ok: avecOk,
            total: data?.avec.porEmpresa.length ?? 0,
            cor: "text-purple-400",
            bg: "bg-purple-500/10 border-purple-500/20",
          },
          {
            label: "D-Pote",
            ok: dpoteOk,
            total: data?.dpote.porEmpresa.length ?? 0,
            cor: "text-orange-400",
            bg: "bg-orange-500/10 border-orange-500/20",
          },
        ].map((s) => (
          <div
            key={s.label}
            className={`rounded-xl border p-3 ${s.bg}`}
          >
            <p className={`text-xs font-semibold ${s.cor} uppercase tracking-wider`}>
              {s.label}
            </p>
            <p className="text-2xl font-bold text-slate-100 mt-1">
              {s.ok}
              <span className="text-slate-500 text-base font-normal">/{s.total}</span>
            </p>
            <p className="text-slate-400 text-xs">empresas sincronizadas</p>
          </div>
        ))}
      </div>

      {/* Tabs por sistema */}
      <Tabs defaultValue="cashbarber">
        <TabsList className="bg-slate-800/60 border border-slate-700 w-full">
          <TabsTrigger value="cashbarber" className="flex-1 data-[state=active]:bg-blue-600/30 data-[state=active]:text-blue-300">
            <Scissors className="w-3.5 h-3.5 mr-1.5" />
            CashBarber
          </TabsTrigger>
          <TabsTrigger value="avec" className="flex-1 data-[state=active]:bg-purple-600/30 data-[state=active]:text-purple-300">
            <Database className="w-3.5 h-3.5 mr-1.5" />
            Avec
          </TabsTrigger>
          <TabsTrigger value="dpote" className="flex-1 data-[state=active]:bg-orange-600/30 data-[state=active]:text-orange-300">
            <Repeat className="w-3.5 h-3.5 mr-1.5" />
            D-Pote
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cashbarber">
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="pt-5">
              <PainelSistema
                titulo="CashBarber"
                icone={<Scissors className="w-4 h-4 text-blue-300" />}
                cor="bg-blue-500/20"
                ultimoSync={data?.cashbarber.porEmpresa ?? []}
                historico={data?.cashbarber.recentes ?? []}
                jobs={data?.cashbarber.jobs ?? []}
                sistema="cashbarber"
                onSync={handleSyncCB}
                syncing={syncingCB}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="avec">
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="pt-5">
              <PainelSistema
                titulo="Avec (Seraphine)"
                icone={<Database className="w-4 h-4 text-purple-300" />}
                cor="bg-purple-500/20"
                ultimoSync={data?.avec.porEmpresa ?? []}
                historico={data?.avec.recentes ?? []}
                jobs={data?.avec.jobs ? [data.avec.jobs] : []}
                sistema="avec"
                onSync={handleSyncAvec}
                syncing={syncingAvec}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dpote">
          <Card className="bg-slate-800/60 border-slate-700">
            <CardContent className="pt-5">
              <PainelSistema
                titulo="D-Pote (Recorrência)"
                icone={<Repeat className="w-4 h-4 text-orange-300" />}
                cor="bg-orange-500/20"
                ultimoSync={data?.dpote.porEmpresa ?? []}
                historico={data?.dpote.recentes ?? []}
                sistema="dpote"
                onSync={handleSyncDpote}
                syncing={syncingDpote}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Última atualização */}
      {data?.agora && (
        <p className="text-slate-600 text-xs text-center">
          <Clock className="w-3 h-3 inline mr-1" />
          Última consulta: {formatDataHora(data.agora)}
        </p>
      )}
    </div>
  );
}
