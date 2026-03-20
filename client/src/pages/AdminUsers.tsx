import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  UserPlus, Pencil, Trash2, Lock, Unlock, KeyRound,
  ChevronDown, ChevronUp, Building2, Check, Eye, EyeOff,
  Shield, User, Headset,
} from "lucide-react";

interface AdminUsersProps {
  empresasData: Array<{ slug: string; nome: string; cor: string }>;
  currentUser: { id: number; role: string; email?: string | null } | null;
}

type Perfil = "gerente" | "operador" | "recepcionista";
type Role = "user" | "admin";

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

const PERFIL_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  gerente:       { label: "Gerente",       color: "bg-blue-100 text-blue-700",   icon: <Shield className="w-3 h-3" /> },
  operador:      { label: "Operador",      color: "bg-slate-100 text-slate-600", icon: <User className="w-3 h-3" /> },
  recepcionista: { label: "Recepcionista", color: "bg-purple-100 text-purple-700", icon: <Headset className="w-3 h-3" /> },
};

function PerfilBadge({ perfil }: { perfil: string }) {
  const cfg = PERFIL_LABELS[perfil] ?? PERFIL_LABELS.operador;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export default function AdminUsers({ empresasData, currentUser }: AdminUsersProps) {
  const { data: users = [], refetch } = trpc.admin.listarUsuarios.useQuery();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [resetingId, setResetingId] = useState<number | null>(null);
  const [newSenha, setNewSenha] = useState("");
  const [showNewSenha, setShowNewSenha] = useState(false);
  const [showFormSenha, setShowFormSenha] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", senha: "",
    perfil: "gerente" as Perfil,
    role: "user" as Role,
    empresaVinculada: "",
  });
  const [formEmpresas, setFormEmpresas] = useState<string[]>([]);

  const [selectedEmpresas, setSelectedEmpresas] = useState<Record<number, string[]>>({});

  const criar = trpc.admin.criarUsuario.useMutation({
    onSuccess: () => {
      toast.success("Utilizador criado com sucesso!");
      refetch();
      setShowCreate(false);
      setFormEmpresas([]);
      setForm({ name: "", email: "", senha: "", perfil: "gerente", role: "user", empresaVinculada: "" });
    },
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

  const { data: empresasDoUsuario } = trpc.admin.listarEmpresasUsuario.useQuery(
    { userId: expandedId! },
    { enabled: expandedId !== null }
  );

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

  const getEmpresasForUser = (userId: number): string[] =>
    selectedEmpresas[userId] ?? empresasDoUsuario ?? [];

  const saveEmpresasForUser = (userId: number) => {
    definirEmpresas.mutate({ userId, slugs: getEmpresasForUser(userId) });
  };

  const [editForm, setEditForm] = useState<{
    name: string; email: string; perfil: Perfil; role: Role;
  }>({ name: "", email: "", perfil: "gerente", role: "user" });

  const startEdit = (user: UserRow) => {
    setEditingId(user.id);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      perfil: (user.perfil as Perfil) ?? "gerente",
      role: (user.role as Role) ?? "user",
    });
  };

  const handleCriar = async () => {
    if (formEmpresas.length === 0) {
      toast.error("Selecione pelo menos uma unidade para o utilizador.");
      return;
    }
    if (!form.name || !form.email || !form.senha) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const result = await criar.mutateAsync({
      ...form,
      empresaVinculada: formEmpresas[0] || null,
    });
    if (result?.userId && formEmpresas.length > 0) {
      try {
        await definirEmpresas.mutateAsync({ userId: result.userId, slugs: formEmpresas });
      } catch {}
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Gestão de Utilizadores</h2>
          <p className="text-sm text-slate-500 mt-0.5">Crie e gerencie os acessos da sua equipe</p>
        </div>
        <Button
          onClick={() => { setShowCreate(!showCreate); setFormEmpresas([]); }}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Novo Utilizador
        </Button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl border-2 border-blue-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-white" />
            </div>
            <h3 className="font-semibold text-slate-800">Criar Novo Utilizador</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: Ana Paula Silva"
              />
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Email de Acesso <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ana@suaempresa.com"
                type="email"
              />
              <p className="text-xs text-slate-400 mt-1">Pode ser um email genérico (ex: recep@salao)</p>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Senha Inicial <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Input
                  value={form.senha}
                  onChange={(e) => setForm({ ...form, senha: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  type={showFormSenha ? "text" : "password"}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowFormSenha(!showFormSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showFormSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Perfil */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block">
                Perfil de Acesso <span className="text-red-500">*</span>
              </label>
              <select
                value={form.perfil}
                onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}
                className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="gerente">Gerente — vê dashboard, metas, bonificação e lança faturamentos</option>
                <option value="recepcionista">Recepcionista — apenas dashboard e lança faturamentos</option>
                <option value="operador">Operador — acesso básico</option>
              </select>
            </div>
          </div>

          {/* Unidades de Acesso */}
          <div className="mt-5">
            <label className="text-xs font-semibold text-slate-600 mb-1 block uppercase tracking-wide">
              Unidades de Acesso <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-slate-400 mb-3">
              Selecione as unidades que este utilizador poderá visualizar e operar.
            </p>

            {empresasData.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <Building2 className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">Nenhuma empresa cadastrada. Crie empresas primeiro na aba Empresas.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {empresasData.map((emp) => {
                  const sel = formEmpresas.includes(emp.slug);
                  return (
                    <button
                      key={emp.slug}
                      type="button"
                      onClick={() => setFormEmpresas((prev) =>
                        sel ? prev.filter((s) => s !== emp.slug) : [...prev, emp.slug]
                      )}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                        sel
                          ? "text-white border-transparent shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                      }`}
                      style={sel ? { backgroundColor: emp.cor, borderColor: emp.cor } : {}}
                    >
                      {sel && <Check className="w-3.5 h-3.5" />}
                      <Building2 className="w-3.5 h-3.5" />
                      {emp.nome}
                    </button>
                  );
                })}
              </div>
            )}

            {formEmpresas.length === 0 && empresasData.length > 0 && (
              <p className="text-xs text-red-400 mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                Selecione pelo menos uma unidade.
              </p>
            )}
          </div>

          <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
            <Button
              onClick={handleCriar}
              disabled={criar.isPending || !form.name || !form.email || !form.senha || formEmpresas.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              {criar.isPending ? "Criando..." : "Criar Utilizador"}
            </Button>
            <Button variant="outline" onClick={() => { setShowCreate(false); setFormEmpresas([]); }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Users List */}
      <div className="space-y-3">
        {(users as UserRow[]).length === 0 && !showCreate && (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum utilizador cadastrado</p>
            <p className="text-sm text-slate-400 mt-1">Clique em "Novo Utilizador" para adicionar a sua equipe</p>
          </div>
        )}

        {(users as UserRow[]).map((user) => (
          <div
            key={user.id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              user.ativo === 0 ? "opacity-60 border-slate-200" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {/* User Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(user.name ?? user.email ?? "?")[0].toUpperCase()}
              </div>

              {/* Info */}
              {editingId === user.id ? (
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome"
                    className="h-8 text-sm"
                  />
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="Email"
                    className="h-8 text-sm"
                  />
                  <select
                    value={editForm.perfil}
                    onChange={(e) => setEditForm({ ...editForm, perfil: e.target.value as Perfil })}
                    className="h-8 rounded-md border border-slate-200 px-2 text-xs bg-white"
                  >
                    <option value="gerente">Gerente</option>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="operador">Operador</option>
                  </select>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as Role })}
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
                    {user.role === "admin" && (
                      <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                        Admin
                      </Badge>
                    )}
                    <PerfilBadge perfil={user.perfil} />
                    {user.ativo === 0 && (
                      <Badge variant="destructive" className="text-xs">Bloqueado</Badge>
                    )}
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
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                      onClick={() => startEdit(user)}
                      title="Editar utilizador"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600"
                      onClick={() => { setResetingId(resetingId === user.id ? null : user.id); setNewSenha(""); }}
                      title="Redefinir senha"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="sm" variant="ghost"
                      className={`h-8 w-8 p-0 ${user.ativo === 1 ? "text-slate-400 hover:text-red-500" : "text-slate-400 hover:text-green-600"}`}
                      onClick={() => toggleAtivo.mutate({ userId: user.id, ativo: user.ativo === 1 ? 0 : 1 })}
                      title={user.ativo === 1 ? "Bloquear acesso" : "Ativar acesso"}
                    >
                      {user.ativo === 1 ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                      onClick={() => handleExpand(user.id)}
                      title="Gerir unidades de acesso"
                    >
                      <Building2 className="w-3.5 h-3.5" />
                    </Button>
                    {user.id !== currentUser?.id && (
                      <Button
                        size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        onClick={() => {
                          if (confirm(`Excluir ${user.name ?? user.email}? Esta ação não pode ser desfeita.`)) {
                            excluir.mutate({ userId: user.id });
                          }
                        }}
                        title="Excluir utilizador"
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
              <div className="border-t border-slate-100 px-4 py-3 bg-amber-50 flex items-center gap-3 flex-wrap">
                <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-xs font-medium text-amber-700">Nova senha para {user.name ?? user.email}:</span>
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Input
                    type={showNewSenha ? "text" : "password"}
                    value={newSenha}
                    onChange={(e) => setNewSenha(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="h-8 text-sm pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewSenha(!showNewSenha)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
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
                {empresasData.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Nenhuma empresa cadastrada. Adicione empresas primeiro na aba Empresas.</p>
                ) : (
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
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Selecione as unidades e clique em "Salvar Unidades". Administradores têm acesso a todas as unidades automaticamente.
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
