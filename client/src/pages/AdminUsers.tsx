import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User, Building2, ChevronDown, Save } from "lucide-react";
import { toast } from "sonner";

type Perfil = "gerente" | "operador";

interface EmpresaData {
  id: number;
  slug: string;
  nome: string;
  cor: string;
  tipoCategorias: "padrao" | "seraphine";
  ativo: number;
  createdAt: Date;
}

interface Props {
  empresasData: EmpresaData[];
}

export default function AdminUsers({ empresasData }: Props) {
  const { user } = useAuth();
  const { data: usuarios = [], refetch } = trpc.admin.listarUsuarios.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const atualizarPerfil = trpc.admin.atualizarPerfil.useMutation();

  const [editando, setEditando] = useState<Record<number, { perfil: Perfil; empresa: string | null }>>({});

  if (user?.role !== "admin") {
    return (
      <Card className="p-8 border-0 shadow-sm rounded-2xl text-center max-w-sm mx-auto">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 text-sm">Esta página é exclusiva para administradores do sistema.</p>
      </Card>
    );
  }

  const getEdit = (userId: number, currentPerfil: Perfil, currentEmpresa: string | null) => {
    return editando[userId] ?? { perfil: currentPerfil, empresa: currentEmpresa };
  };

  const setEdit = (userId: number, field: "perfil" | "empresa", value: string | null) => {
    const current = editando[userId] ?? { perfil: "operador" as Perfil, empresa: null };
    setEditando((prev) => ({
      ...prev,
      [userId]: { ...current, [field]: value },
    }));
  };

  const handleSave = async (userId: number) => {
    const edit = editando[userId];
    if (!edit) return;
    try {
      await atualizarPerfil.mutateAsync({
        userId,
        perfil: edit.perfil,
        empresaVinculada: edit.empresa,
      });
      toast.success("Perfil atualizado com sucesso!");
      setEditando((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      refetch();
    } catch {
      toast.error("Erro ao atualizar perfil.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestão de Usuários</h2>
          <p className="text-sm text-slate-500 mt-0.5">Defina perfis e empresas vinculadas para cada utilizador.</p>
        </div>
        <Badge variant="outline" className="text-purple-700 border-purple-200 bg-purple-50">
          {usuarios.length} utilizadores
        </Badge>
      </div>

      {/* Legenda */}
      <Card className="p-4 border-0 shadow-sm rounded-2xl bg-blue-50">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-slate-700"><strong>Gerente</strong> — pode lançar e configurar metas</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span className="text-slate-700"><strong>Operador</strong> — apenas visualização</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-400" />
            <span className="text-slate-700"><strong>Sem empresa</strong> — acesso a todas as unidades</span>
          </div>
        </div>
      </Card>

      {/* Lista de usuários */}
      {usuarios.length === 0 ? (
        <Card className="p-12 border-0 shadow-sm rounded-2xl bg-white text-center">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Nenhum utilizador cadastrado ainda.</p>
          <p className="text-slate-400 text-sm mt-1">Os utilizadores aparecem aqui após o primeiro login.</p>
        </Card>
      ) : (
        usuarios.map((u) => {
          const currentPerfil = (u.perfil ?? "operador") as Perfil;
          const currentEmpresa = u.empresaVinculada ?? null;
          const edit = getEdit(u.id, currentPerfil, currentEmpresa);
          const hasChanges = editando[u.id] !== undefined;
          const empresaAtual = empresasData.find((e) => e.slug === currentEmpresa);

          return (
            <Card key={u.id} className="p-5 border-0 shadow-sm rounded-2xl bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info do usuário */}
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center font-bold text-slate-600 text-sm flex-shrink-0">
                    {(u.name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{u.name || "Sem nome"}</p>
                    <p className="text-xs text-slate-500">{u.email || u.openId}</p>
                    {u.role === "admin" && (
                      <Badge className="mt-1 text-xs bg-purple-100 text-purple-700 border-0">Admin</Badge>
                    )}
                  </div>
                </div>

                {/* Controles */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Perfil */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perfil</label>
                    <div className="relative">
                      <select
                        value={edit.perfil}
                        onChange={(e) => setEdit(u.id, "perfil", e.target.value)}
                        disabled={u.role === "admin"}
                        className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="gerente">Gerente</option>
                        <option value="operador">Operador</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Empresa */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Empresa</label>
                    <div className="relative">
                      <select
                        value={edit.empresa ?? ""}
                        onChange={(e) => setEdit(u.id, "empresa", e.target.value || null)}
                        disabled={u.role === "admin"}
                        className="appearance-none pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="">Todas (Admin)</option>
                        {empresasData.map((emp) => (
                          <option key={emp.slug} value={emp.slug}>{emp.nome}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Status atual */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status Atual</label>
                    <div className="flex items-center gap-1.5 py-2">
                      {empresaAtual ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5" style={{ color: empresaAtual.cor }} />
                          <span className="text-sm font-medium" style={{ color: empresaAtual.cor }}>
                            {empresaAtual.nome}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Todas</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        currentPerfil === "gerente" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {currentPerfil}
                      </span>
                    </div>
                  </div>

                  {/* Botão salvar */}
                  {hasChanges && u.role !== "admin" && (
                    <Button
                      size="sm"
                      onClick={() => handleSave(u.id)}
                      disabled={atualizarPerfil.isPending}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 mt-4 sm:mt-0 self-end"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Salvar
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
