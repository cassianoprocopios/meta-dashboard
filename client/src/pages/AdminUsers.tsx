import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus, Pencil, Trash2, Lock, Unlock, KeyRound,
  ChevronDown, ChevronUp, Building2, Check
} from "lucide-react";

interface AdminUsersProps {
  empresasData: Array<{ slug: string; nome: string; cor: string }>;
  currentUser: { id: number; role: string; email?: string | null } | null;
}

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: string;
  perfil: string;
  empresaVinculada: string | null;
  ativo: number;
  lastSignedIn: Date;
};

export default function AdminUsers({ empresasData, currentUser }: AdminUsersProps) {
  const { data: users = [], refetch } = trpc.admin.listarUsuarios.useQuery();

  // Form state
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [newSenha, setNewSenha] = useState("");

  const [form, setForm] = useState({
    name: "", email: "", senha: "",
    perfil: "gerente" as "gerente" | "operador",
    role: "user" as "user" | "admin",
  });

  // Empresas selecionadas por userId (para edição)
  const [selectedEmpresas, setSelectedEmpresas] = useState<Record<number, string[]>>({});

  const criar = trpc.admin.criarUsuario.useMutation({
    onSuccess: () => { toast.success("Utilizador criado!"); refetch(); setShowCreate(false); setForm({ name: "", email: "", senha: "", perfil: "gerente", role: "user" }); },
    onError: (e) => toast.error(e.message),
  });

  const editar = trpc.admin.editarUsuario.useMutation({
    onSuccess: () => { toast.success("Utilizador atualizado!"); refetch(); setEditingId(null); },
    onError: (e) => toast.error(e.message),
  });

  const excluir = trpc.admin.excluirUsuario.useMutation({
    onSuccess: () => { toast.success("Utilizador excluído!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const toggleAtivo = trpc.admin.toggleAtivo.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const redefinirSenha = trpc.admin.redefinirSenha.useMutation({
    onSuccess: () => { toast.success("Senha redefinida!"); setResetingId(null); setNewSenha(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const definirEmpresas = trpc.admin.definirEmpresasUsuario.useMutation({
    onSuccess: () => { toast.success("Unidades atualizadas!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  // Buscar empresas do utilizador expandido
  const { data: empresasDoUsuario } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: expandedId! },
    { enabled: expandedId !== null }
  );

  // Quando expande, inicializa as empresas selecionadas
  const handleExpand = (userId: number) => {
    if (expandedId === userId) { setExpandedId(null); return; }
    setExpandedId(userId);
  };

  const toggleEmpresaForUser = (userId: number, slug: string) => {
    const current = selectedEmpresas[userId] ?? empresasDoUsuario ?? [];
    const updated = current.includes(slug)
      ? current.filter((s) => s !== slug)
      : [...current, slug];
    setSelectedEmpresas((prev) => ({ ...prev, [userId]: updated }));
  };

  const getEmpresasForUser = (userId: number): string[] => {
    return selectedEmpresas[userId] ?? empresasDoUsuario ?? [];
  };

  const saveEmpresasForUser = (userId: number) => {
    const slugs = getEmpresasForUser(userId);
    definirEmpresas.mutate({ userId, slugs });
  };

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string; email: string; perfil: "gerente" | "operador"; role: "user" | "admin";
  }>({ name: "", email: "", perfil: "gerente", role: "user" });

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      perfil: (user.perfil as "gerente" | "operador") ?? "gerente",
      role: (user.role as "user" | "admin") ?? "user",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Gestão de Utilizadores</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gerir acessos, perfis e unidades de cada utilizador</p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Novo Utilizador
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Criar Novo Utilizador</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nome</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Email</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" type="email" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Senha</label>
              <Input value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} placeholder="Mínimo 6 caracteres" type="password" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Perfil</label>
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as "gerente" | "operador" })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="gerente">Gerente</option>
                <option value="operador">Operador</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 block">Nível de Acesso</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as "user" | "admin" })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white"
              >
                <option value="user">Utilizador</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={() => criar.mutate({ ...form, empresaVinculada: null })}
              disabled={criar.isPending || !form.name || !form.email || !form.senha}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {criar.isPending ? "Criando..." : "Criar Utilizador"}
            </Button>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {(users as UserRow[]).map((user) => (
          <div key={user.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${user.ativo === 0 ? "opacity-60 border-slate-200" : "border-slate-200"}`}>
            {/* User Row */}
            <div className="flex items-center gap-4 p-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </div>

              {/* Info */}
              {editingId === user.id ? (
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome" className="h-8 text-sm" />
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" className="h-8 text-sm" />
                  <select
                    value={editForm.perfil}
                    onChange={(e) => setEditForm({ ...editForm, perfil: e.target.value as "gerente" | "operador" })}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="gerente">Gerente</option>
                    <option value="operador">Operador</option>
                  </select>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "user" | "admin" })}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="user">Utilizador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-slate-800 text-sm">{user.name ?? "Sem nome"}</span>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {user.role === "admin" ? "Admin" : "Utilizador"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {user.perfil === "gerente" ? "Gerente" : "Operador"}
                    </Badge>
                    {user.ativo === 0 && <Badge variant="destructive" className="text-xs">Bloqueado</Badge>}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{user.email}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {editingId === user.id ? (
                  <>
                    <Button
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-700 text-white text-xs"
                      onClick={() => editar.mutate({ userId: user.id, ...editForm })}
                      disabled={editar.isPending}
                    >
                      Salvar
                    </Button>
                    <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                      onClick={() => startEdit(user)}
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-amber-600"
                      onClick={() => { setResetingId(resetingId === user.id ? null : user.id); setNewSenha(""); }}
                      title="Redefinir senha"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-8 w-8 p-0 ${user.ativo === 1 ? "text-slate-500 hover:text-red-500" : "text-slate-500 hover:text-green-600"}`}
                      onClick={() => toggleAtivo.mutate({ userId: user.id, ativo: user.ativo === 1 ? 0 : 1 })}
                      title={user.ativo === 1 ? "Bloquear" : "Ativar"}
                    >
                      {user.ativo === 1 ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600"
                      onClick={() => handleExpand(user.id)}
                      title="Gerir unidades"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </Button>
                    {user.id !== currentUser?.id && (
                      <Button
                        size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                        onClick={() => {
                          if (confirm(`Excluir ${user.name ?? user.email}? Esta ação não pode ser desfeita.`)) {
                            excluir.mutate({ userId: user.id });
                          }
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400"
                      onClick={() => handleExpand(user.id)}
                    >
                      {expandedId === user.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Reset Password Panel */}
            {resetingId === user.id && (
              <div className="border-t border-slate-100 px-4 py-3 bg-amber-50 flex items-center gap-3">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <Input
                  type="password"
                  value={newSenha}
                  onChange={(e) => setNewSenha(e.target.value)}
                  placeholder="Nova senha (mín. 6 caracteres)"
                  className="h-8 text-sm max-w-xs"
                />
                <Button
                  size="sm"
                  className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs"
                  onClick={() => redefinirSenha.mutate({ userId: user.id, novaSenha: newSenha })}
                  disabled={newSenha.length < 6 || redefinirSenha.isPending}
                >
                  Confirmar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setResetingId(null)}>
                  Cancelar
                </Button>
              </div>
            )}

            {/* Empresas Panel */}
            {expandedId === user.id && (
              <div className="border-t border-slate-100 px-4 py-4 bg-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-slate-700">Unidades com Acesso</span>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1"
                    onClick={() => saveEmpresasForUser(user.id)}
                    disabled={definirEmpresas.isPending}
                  >
                    <Check className="w-3 h-3" />
                    Salvar Unidades
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {empresasData.map((emp) => {
                    const current = getEmpresasForUser(user.id);
                    const isSelected = current.includes(emp.slug);
                    return (
                      <button
                        key={emp.slug}
                        onClick={() => toggleEmpresaForUser(user.id, emp.slug)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                          isSelected
                            ? "text-white border-transparent shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                        style={isSelected ? { backgroundColor: emp.cor, borderColor: emp.cor } : {}}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {emp.nome}
                      </button>
                    );
                  })}
                </div>
                {empresasData.length === 0 && (
                  <p className="text-xs text-slate-400 italic">Nenhuma empresa cadastrada. Adicione empresas primeiro.</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Selecione as unidades e clique em "Salvar Unidades". Administradores veem todas as unidades automaticamente.
                </p>
              </div>
            )}
          </div>
        ))}

        {users.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <UserPlus className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum utilizador cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}
