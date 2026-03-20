import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Trash2, AlertCircle, Loader2, Pencil, Save, X, Tag } from "lucide-react";
import { toast } from "sonner";

const CORES_SUGERIDAS = [
  "#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
];

interface EditState {
  nome: string;
  cor: string;
  tipoCategorias: "padrao" | "seraphine";
}

interface CategoriasPanelProps {
  empresaSlug: string;
  empresaCor: string;
  currentUser: { role: string; perfil: string } | null;
}

function CategoriasPanel({ empresaSlug, empresaCor, currentUser }: CategoriasPanelProps) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");

  const { data: cats = [], refetch } = trpc.categorias.listar.useQuery({ empresaSlug });
  const adicionar = trpc.categorias.adicionar.useMutation();
  const remover = trpc.categorias.remover.useMutation();
  const editar = trpc.categorias.editar.useMutation();

  const canManage = currentUser?.role === "admin" || currentUser?.perfil === "gerente";

  const handleAdicionar = async () => {
    if (!novaCategoria.trim()) return;
    try {
      await adicionar.mutateAsync({ empresaSlug, nome: novaCategoria.trim() });
      toast.success(`Categoria "${novaCategoria}" adicionada!`);
      setNovaCategoria("");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao adicionar categoria.");
    }
  };

  const handleRemover = async (id: number, nome: string) => {
    try {
      await remover.mutateAsync({ id });
      toast.success(`Categoria "${nome}" removida.`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover categoria.");
    }
  };

  const handleEditar = async (id: number) => {
    if (!editNome.trim()) return;
    try {
      await editar.mutateAsync({ id, nome: editNome.trim() });
      toast.success("Categoria atualizada!");
      setEditandoId(null);
      setEditNome("");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao editar categoria.");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Tag className="w-3.5 h-3.5" style={{ color: empresaCor }} />
        <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Categorias de Faturamento</span>
      </div>

      <div className="space-y-1.5">
        {cats.map((cat) => (
          <div key={cat.id} className="flex items-center gap-2 group">
            {editandoId === cat.id ? (
              <>
                <input
                  type="text"
                  value={editNome}
                  onChange={(e) => setEditNome(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEditar(cat.id)}
                  className="flex-1 px-2.5 py-1.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <button onClick={() => handleEditar(cat.id)} disabled={editar.isPending} className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50">
                  {editar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setEditandoId(null); setEditNome(""); }} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 px-2.5 py-1.5 rounded-lg text-sm bg-slate-50 text-slate-700 border border-slate-100">
                  {cat.nome}
                </span>
                {canManage && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { setEditandoId(cat.id); setEditNome(cat.nome); }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemover(cat.id, cat.nome)}
                      disabled={remover.isPending}
                      className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                      title="Remover"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {cats.length === 0 && (
          <p className="text-xs text-slate-400 italic py-1">Nenhuma categoria cadastrada.</p>
        )}
      </div>

      {canManage && (
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={novaCategoria}
            onChange={(e) => setNovaCategoria(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdicionar()}
            placeholder="Nome da nova categoria..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Button
            size="sm"
            onClick={handleAdicionar}
            disabled={adicionar.isPending || !novaCategoria.trim()}
            className="rounded-xl gap-1.5 text-white"
            style={{ backgroundColor: empresaCor }}
          >
            {adicionar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Adicionar
          </Button>
        </div>
      )}
    </div>
  );
}

interface EmpresasProps {
  currentUser: { role: string; perfil: string; id: number } | null;
}

export default function Empresas({ currentUser }: EmpresasProps) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const [form, setForm] = useState({
    slug: "",
    nome: "",
    cor: "#3b82f6",
    tipoCategorias: "padrao" as "padrao" | "seraphine",
  });

  const { data: empresas = [], refetch, isLoading } = trpc.empresa.listar.useQuery();
  const criar = trpc.empresa.criar.useMutation();
  const remover = trpc.empresa.remover.useMutation();
  const atualizar = trpc.empresa.atualizar.useMutation();

  const isAdmin = currentUser?.role === "admin";
  const isGerente = currentUser?.perfil === "gerente";
  const canManage = isAdmin || isGerente;

  const handleCreate = async () => {
    if (!form.slug.trim() || !form.nome.trim()) {
      toast.error("Preencha o código e o nome da empresa.");
      return;
    }
    try {
      await criar.mutateAsync({
        slug: form.slug.toUpperCase().replace(/\s+/g, "_"),
        nome: form.nome,
        cor: form.cor,
        tipoCategorias: form.tipoCategorias,
      });
      toast.success(`Empresa "${form.nome}" criada com sucesso!`);
      setForm({ slug: "", nome: "", cor: "#3b82f6", tipoCategorias: "padrao" });
      setShowForm(false);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar empresa.");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await remover.mutateAsync({ id });
      toast.success("Empresa removida.");
      setConfirmDelete(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao remover empresa.");
    }
  };

  const startEdit = (emp: typeof empresas[0]) => {
    setEditingId(emp.id);
    setEditState({
      nome: emp.nome,
      cor: emp.cor,
      tipoCategorias: emp.tipoCategorias,
    });
  };

  const handleSaveEdit = async (id: number) => {
    if (!editState) return;
    try {
      await atualizar.mutateAsync({ id, ...editState });
      toast.success("Empresa atualizada com sucesso!");
      setEditingId(null);
      setEditState(null);
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao atualizar empresa.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestão de Empresas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Adicione, edite ou remova unidades e gerencie as categorias de faturamento."
              : "Gerencie as categorias de faturamento das suas unidades."}
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Nova Empresa
          </Button>
        )}
      </div>

      {/* Formulário de criação (apenas admin) */}
      {isAdmin && showForm && (
        <Card className="p-6 border-0 shadow-sm rounded-2xl bg-white">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600" />
            Adicionar Nova Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Código (slug) *</label>
              <input
                type="text" placeholder="Ex: MORUMBI"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Identificador único, sem espaços.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Nome da Empresa *</label>
              <input
                type="text" placeholder="Ex: Unidade Morumbi"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Tipo de Categorias (padrão inicial)</label>
              <select
                value={form.tipoCategorias}
                onChange={(e) => setForm((p) => ({ ...p, tipoCategorias: e.target.value as "padrao" | "seraphine" }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="padrao">Padrão (Avulso / Produtos / Serv. Extra / Lavatório / Recorrência)</option>
                <option value="seraphine">Seraphine (Cabelo / Produtos / Unha / Outros / Recorrência)</option>
              </select>
              <p className="text-xs text-slate-400 mt-1">As categorias serão criadas automaticamente e podem ser editadas depois.</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Cor de Identificação</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.cor} onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
                <div className="flex gap-1.5 flex-wrap">
                  {CORES_SUGERIDAS.map((c) => (
                    <button key={c} onClick={() => setForm((p) => ({ ...p, cor: c }))} className="w-6 h-6 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: form.cor === c ? "#1e293b" : "transparent", transform: form.cor === c ? "scale(1.2)" : "scale(1)" }} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <Button onClick={handleCreate} disabled={criar.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2">
              {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Empresa
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)} className="rounded-xl">Cancelar</Button>
          </div>
        </Card>
      )}

      {/* Lista de empresas */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        </div>
      ) : empresas.length === 0 ? (
        <Card className="p-8 border-0 shadow-sm rounded-2xl bg-white text-center">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Nenhuma empresa cadastrada.</p>
          <p className="text-slate-400 text-sm mt-1">Clique em "Nova Empresa" para começar.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {empresas.map((emp) => {
            const isEditing = editingId === emp.id;
            const es = editState;

            return (
              <Card key={emp.id} className="p-5 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ backgroundColor: isEditing && es ? es.cor : emp.cor }} />

                {isEditing && es ? (
                  /* ── Modo edição (apenas admin) ── */
                  <div className="mt-1 space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-slate-400">{emp.slug}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleSaveEdit(emp.id)} disabled={atualizar.isPending} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors" title="Salvar">
                          {atualizar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </button>
                        <button onClick={() => { setEditingId(null); setEditState(null); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors" title="Cancelar">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Nome</label>
                      <input type="text" value={es.nome} onChange={(e) => setEditState((p) => p ? { ...p, nome: e.target.value } : null)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Cor</label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={es.cor} onChange={(e) => setEditState((p) => p ? { ...p, cor: e.target.value } : null)} className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer" />
                        <div className="flex gap-1 flex-wrap">
                          {CORES_SUGERIDAS.map((c) => (
                            <button key={c} onClick={() => setEditState((p) => p ? { ...p, cor: c } : null)} className="w-5 h-5 rounded-full border-2 transition-all" style={{ backgroundColor: c, borderColor: es.cor === c ? "#1e293b" : "transparent" }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── Modo visualização ── */
                  <>
                    <div className="flex items-start justify-between mt-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: emp.cor + "20" }}>
                          <Building2 className="w-5 h-5" style={{ color: emp.cor }} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-slate-900">{emp.nome}</h3>
                          <p className="text-xs text-slate-400 font-mono">{emp.slug}</p>
                        </div>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Editar empresa">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {confirmDelete === emp.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(emp.id)} disabled={remover.isPending} className="text-xs rounded-lg h-7 px-2">Confirmar</Button>
                              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} className="text-xs rounded-lg h-7 px-2">Cancelar</Button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(emp.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remover empresa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Painel de categorias dinâmicas — visível em ambos os modos */}
                {!isEditing && (
                  <CategoriasPanel
                    empresaSlug={emp.slug}
                    empresaCor={emp.cor}
                    currentUser={currentUser}
                  />
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
        <p className="text-xs text-amber-700">
          {isAdmin
            ? "Ao remover uma empresa, ela deixa de aparecer no sistema mas os dados históricos são preservados. Gerentes e administradores podem adicionar ou remover categorias de faturamento a qualquer momento."
            : "Como gerente, pode adicionar ou remover categorias de faturamento das suas unidades. As alterações afetam apenas a exibição — os dados lançados são mantidos."}
        </p>
      </div>
    </div>
  );
}
