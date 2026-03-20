import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Shield, LogIn, LogOut, AlertTriangle, UserPlus, Lock, Unlock, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

function getAcaoIcon(acao: string) {
  switch (acao) {
    case "login": return <LogIn className="w-4 h-4 text-emerald-500" />;
    case "logout": return <LogOut className="w-4 h-4 text-slate-400" />;
    case "login_falhou": return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case "criar_usuario": return <UserPlus className="w-4 h-4 text-blue-500" />;
    case "bloquear_usuario": return <Lock className="w-4 h-4 text-orange-500" />;
    case "ativar_usuario": return <Unlock className="w-4 h-4 text-emerald-500" />;
    case "redefinir_senha": return <Shield className="w-4 h-4 text-purple-500" />;
    default: return <Shield className="w-4 h-4 text-slate-400" />;
  }
}

function getAcaoBadge(acao: string) {
  const map: Record<string, string> = {
    login: "bg-emerald-50 text-emerald-700",
    logout: "bg-slate-100 text-slate-600",
    login_falhou: "bg-red-50 text-red-700",
    criar_usuario: "bg-blue-50 text-blue-700",
    bloquear_usuario: "bg-orange-50 text-orange-700",
    ativar_usuario: "bg-emerald-50 text-emerald-700",
    redefinir_senha: "bg-purple-50 text-purple-700",
  };
  return map[acao] ?? "bg-slate-100 text-slate-600";
}

function getAcaoLabel(acao: string) {
  const map: Record<string, string> = {
    login: "Login",
    logout: "Logout",
    login_falhou: "Falha de Login",
    criar_usuario: "Criou Utilizador",
    bloquear_usuario: "Bloqueou Utilizador",
    ativar_usuario: "Ativou Utilizador",
    redefinir_senha: "Redefiniu Senha",
  };
  return map[acao] ?? acao;
}

export default function Auditoria() {
  const [limit, setLimit] = useState(100);
  const { data: logs = [], isLoading, refetch } = trpc.admin.listarAcessos.useQuery({ limit });

  // Estatísticas rápidas
  const totalLogins = logs.filter((l) => l.acao === "login").length;
  const totalFalhas = logs.filter((l) => l.acao === "login_falhou").length;
  const usuariosUnicos = new Set(logs.filter((l) => l.userId).map((l) => l.userId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Auditoria de Acessos</h2>
            <p className="text-xs text-slate-500">Histórico de logins e ações administrativas</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-blue-600 px-3 py-2 rounded-xl hover:bg-blue-50 transition-colors border border-slate-200"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Logins com Sucesso</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{totalLogins}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Tentativas Falhadas</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{totalFalhas}</p>
        </Card>
        <Card className="p-4 border-0 shadow-sm rounded-2xl bg-white">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-semibold">Utilizadores Únicos</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{usuariosUnicos}</p>
        </Card>
      </div>

      {/* Tabela de logs */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Registo de Atividade</h3>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={50}>Últimos 50</option>
            <option value={100}>Últimos 100</option>
            <option value={200}>Últimos 200</option>
            <option value={500}>Últimos 500</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum registo de acesso ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-semibold">Ação</th>
                  <th className="px-4 py-3 text-left font-semibold">Utilizador</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">IP</th>
                  <th className="px-4 py-3 text-left font-semibold">Detalhes</th>
                  <th className="px-4 py-3 text-left font-semibold">Data/Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getAcaoBadge(log.acao)}`}>
                        {getAcaoIcon(log.acao)}
                        {getAcaoLabel(log.acao)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium">
                      {log.userName ?? <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {log.userEmail ?? <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {log.ip ?? "—"}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                      {log.detalhes ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
