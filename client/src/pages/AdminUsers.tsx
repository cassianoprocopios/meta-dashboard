import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Users, UserPlus, Lock, Unlock, Key, Building2, Loader2,
  CheckCircle2, Edit2, X, Eye, EyeOff, Shield, User, Trash2,
} from "lucide-react";

interface EmpresaData {
  id: number;
  slug: string;
  nome: string;
  cor: string;
}

interface Props {
  empresasData: EmpresaData[];
  currentUser: any;
}

export default function AdminUsers({ empresasData, currentUser }: Props) {
  const utils = trpc.useUtils();
  const { data: usuarios = [], isLoading } = trpc.admin.listarUsuarios.useQuery(undefined, {
    enabled: currentUser?.role === "admin",
  });

  // Estado do formulário de criação
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    senha: "",
    perfil: "gerente" as "gerente" | "operador",
    empresaVinculada: "" as string,
    role: "user" as "user" | "admin",
  });
  const [showSenha, setShowSenha] = useState(false);

  // Estado de edição inline
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    perfil: "gerente" as "gerente" | "operador",
    empresaVinculada: "" as string,
    role: "user" as "user" | "admin",
  });

  // Estado de confirmação de exclusão
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Estado de redefinição de senha
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [showNovaSenha, setShowNovaSenha] = useState(false);

  const criarMutation = trpc.admin.criarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Utilizador criado com sucesso!");
      utils.admin.listarUsuarios.invalidate();
      setShowCreate(false);
      setCreateForm({ name: "", email: "", senha: "", perfil: "gerente", empresaVinculada: "", role: "user" });
    },
    onError: (e) => toast.error(e.message),
  });

  const editarMutation = trpc.admin.atualizarPerfil.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      utils.admin.listarUsuarios.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const resetSenhaMutation = trpc.admin.redefinirSenha.useMutation({
    onSuccess: () => {
      toast.success("Senha redefinida com sucesso!");
      setResetingId(null);
      setNovaSenha("");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleAtivoMutation = trpc.admin.toggleAtivo.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.ativo === 1 ? "Utilizador ativado!" : "Utilizador bloqueado!");
      utils.admin.listarUsuarios.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const excluirMutation = trpc.admin.excluirUsuario.useMutation({
    onSuccess: () => {
      toast.success("Utilizador excluído.");
      utils.admin.listarUsuarios.invalidate();
      setDeleteConfirmId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const editarCompletoMutation = trpc.admin.editarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Utilizador atualizado!");
      utils.admin.listarUsuarios.invalidate();
      setEditingId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  if (currentUser?.role !== "admin") {
    return (
      <Card className="p-8 border-0 shadow-sm rounded-2xl text-center max-w-sm mx-auto">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-slate-900 mb-2">Acesso Restrito</h2>
        <p className="text-slate-500 text-sm">Esta página é exclusiva para administradores do sistema.</p>
      </Card>
    );
  }

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.senha) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    criarMutation.mutate({
      ...createForm,
      empresaVinculada: createForm.empresaVinculada || null,
    });
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      perfil: user.perfil ?? "operador",
      empresaVinculada: user.empresaVinculada ?? "",
      role: user.role ?? "user",
    });
  };

  const handleSaveEdit = (userId: number) => {
    editarCompletoMutation.mutate({
      userId,
      name: editForm.name || undefined,
      email: editForm.email || undefined,
      perfil: editForm.perfil,
      empresaVinculada: editForm.empresaVinculada || null,
      role: editForm.role,
    });
  };

  const handleResetSenha = (userId: number) => {
    if (!novaSenha || novaSenha.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    resetSenhaMutation.mutate({ userId, novaSenha });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Gestão de Utilizadores</h2>
            <p className="text-xs text-slate-500">{usuarios.length} utilizador{usuarios.length !== 1 ? "es" : ""} registado{usuarios.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Novo Utilizador
        </button>
      </div>

      {/* Formulário de criação */}
      {showCreate && (
        <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Criar Novo Utilizador</h3>
            <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nome Completo *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email *</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@exemplo.com"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Senha *</label>
              <div className="relative">
                <input
                  type={showSenha ? "text" : "password"}
                  value={createForm.senha}
                  onChange={(e) => setCreateForm({ ...createForm, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Perfil *</label>
              <select
                value={createForm.perfil}
                onChange={(e) => setCreateForm({ ...createForm, perfil: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gerente">Gerente (pode lançar)</option>
                <option value="operador">Operador (apenas visualiza)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Empresa Vinculada</label>
              <select
                value={createForm.empresaVinculada}
                onChange={(e) => setCreateForm({ ...createForm, empresaVinculada: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as empresas (admin)</option>
                {empresasData.map((emp) => (
                  <option key={emp.slug} value={emp.slug}>{emp.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Nível de Acesso</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="user">Utilizador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3 pt-2">
              <button
                type="submit"
                disabled={criarMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {criarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Criar Utilizador
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      )}

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

      {/* Lista de utilizadores */}
      <Card className="border-0 shadow-sm rounded-2xl bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : usuarios.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <User className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhum utilizador ainda.</p>
            <p className="text-sm mt-1">Clique em "Novo Utilizador" para criar o primeiro acesso.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {usuarios.map((user) => {
              const isEditing = editingId === user.id;
              const isReseting = resetingId === user.id;
              const empNome = empresasData.find((e) => e.slug === user.empresaVinculada)?.nome ?? user.empresaVinculada;

              return (
                <div key={user.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
                      (user as any).ativo === 0 ? "bg-slate-300" : user.role === "admin" ? "bg-purple-500" : "bg-blue-500"
                    }`}>
                      {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-900 text-sm">{user.name ?? "—"}</span>
                        {user.role === "admin" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Admin</span>
                        )}
                        {(user as any).ativo === 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Bloqueado</span>
                        )}
                        {user.loginMethod === "password" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">Login próprio</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{user.email}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {empNome ?? "Todas as unidades"}
                        </span>
                        <span>•</span>
                        <span>{user.perfil === "gerente" ? "Gerente" : "Operador"}</span>
                        <span>•</span>
                        <span>Último acesso: {user.lastSignedIn
                          ? new Date(user.lastSignedIn).toLocaleDateString("pt-BR")
                          : "—"}</span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => isEditing ? setEditingId(null) : handleEdit(user)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Editar utilizador"
                      >
                        {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => isReseting ? setResetingId(null) : setResetingId(user.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                        title="Redefinir senha"
                      >
                        <Key className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleAtivoMutation.mutate({ userId: user.id, ativo: (user as any).ativo === 1 ? 0 : 1 })}
                        disabled={toggleAtivoMutation.isPending}
                        className={`p-1.5 rounded-lg transition-colors ${
                          (user as any).ativo === 1
                            ? "text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                        }`}
                        title={(user as any).ativo === 1 ? "Bloquear utilizador" : "Ativar utilizador"}
                      >
                        {(user as any).ativo === 1 ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => setDeleteConfirmId(user.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir utilizador"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Painel de edição inline */}
                  {isEditing && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-xl space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Nome</label>
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Email</label>
                          <input
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Perfil</label>
                          <select
                            value={editForm.perfil}
                            onChange={(e) => setEditForm({ ...editForm, perfil: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="gerente">Gerente</option>
                            <option value="operador">Operador</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Nível de Acesso</label>
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="user">Utilizador</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-semibold text-blue-700 mb-1">Empresa Vinculada</label>
                          <select
                            value={editForm.empresaVinculada}
                            onChange={(e) => setEditForm({ ...editForm, empresaVinculada: e.target.value })}
                            className="w-full px-3 py-2 rounded-lg border border-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Todas as empresas</option>
                            {empresasData.map((emp) => (
                              <option key={emp.slug} value={emp.slug}>{emp.nome}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(user.id)}
                          disabled={editarCompletoMutation.isPending}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                        >
                          {editarCompletoMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          Guardar Alterações
                        </button>
                        <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-blue-200 text-blue-600 text-sm hover:bg-white transition-colors">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Painel de redefinição de senha */}
                  {isReseting && (
                    <div className="mt-3 p-3 bg-purple-50 rounded-xl flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-48">
                        <label className="block text-xs font-semibold text-purple-700 mb-1">Nova Senha</label>
                        <div className="relative">
                          <input
                            type={showNovaSenha ? "text" : "password"}
                            value={novaSenha}
                            onChange={(e) => setNovaSenha(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-3 py-2 pr-10 rounded-lg border border-purple-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                          />
                          <button type="button" onClick={() => setShowNovaSenha(!showNovaSenha)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                            {showNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => handleResetSenha(user.id)}
                        disabled={resetSenhaMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-60"
                      >
                        {resetSenhaMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                        Redefinir
                      </button>
                      <button onClick={() => { setResetingId(null); setNovaSenha(""); }} className="px-4 py-2 rounded-lg border border-purple-200 text-purple-600 text-sm hover:bg-white transition-colors">
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Confirmação de exclusão */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Excluir Utilizador</h3>
                <p className="text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-5">
              Tem a certeza que deseja excluir permanentemente o utilizador{" "}
              <strong>{usuarios.find((u) => u.id === deleteConfirmId)?.name ?? usuarios.find((u) => u.id === deleteConfirmId)?.email}</strong>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => excluirMutation.mutate({ userId: deleteConfirmId })}
                disabled={excluirMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {excluirMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir definitivamente
              </button>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
