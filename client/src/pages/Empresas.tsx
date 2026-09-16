import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2, Plus, Trash2, AlertCircle, Loader2, Pencil, Save, X, Tag,
  GripVertical, ChevronUp, ChevronDown, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const CORES_SUGERIDAS = [
  "#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
];

interface EditState {
  nome: string;
  cor: string;
  tipoCategorias: "padrao" | "seraphine";
  cat1Nome: string;
  cat2Nome: string;
  cat3Nome: string;
  cat4Nome: string;
  cat5Nome: string;
  whatsappGrupoLink: string | null;
}

interface CategoriaItem {
  id: number;
  nome: string;
  ordem: number;
  ativo: number;
}

interface CategoriasPanelProps {
  empresaSlug: string;
  empresaCor: string;
  tipoCategorias: "padrao" | "seraphine";
  currentUser: { role: string; perfil: string } | null;
}

function CategoriasPanel({ empresaSlug, empresaCor, tipoCategorias, currentUser }: CategoriasPanelProps) {
  const [novaCategoria, setNovaCategoria] = useState("");
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editNome, setEditNome] = useState("");

  const utils = trpc.useUtils();
  const { data: cats = [], refetch, isLoading } = trpc.categorias.listar.useQuery({ empresaSlug });
  const adicionar = trpc.categorias.adicionar.useMutation();
  const remover = trpc.categorias.remover.useMutation();
  const editar = trpc.categorias.editar.useMutation();
  const reordenar = trpc.categorias.reordenar.useMutation();
  const inicializar = trpc.categorias.inicializar.useMutation();

  const canManage = currentUser?.role === "admin" || currentUser?.perfil === "gerente";
  const isAdmin = currentUser?.role === "admin";

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

  const handleMover = async (index: number, direction: "up" | "down") => {
    const newCats = [...cats];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    try {
      await reordenar.mutateAsync({ ids: newCats.map((c) => c.id) });
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao reordenar.");
    }
  };

  const handleInicializar = async () => {
    try {
      await inicializar.mutateAsync({ empresaSlug, tipoCategorias });
      toast.success("Categorias inicializadas com o padrão!");
      refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao inicializar categorias.");
    }
  };

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" style={{ color: empresaCor }} />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Composição do Faturamento
          </span>
        </div>
        {isAdmin && cats.length === 0 && !isLoading && (
          <button
            onClick={handleInicializar}
            disabled={inicializar.isPending}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
            title="Inicializar com categorias padrão"
          >
            {inicializar.isPending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            Inicializar padrão
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
          <span className="text-xs text-slate-400">Carregando...</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {cats.map((cat, index) => (
            <div key={cat.id} className="flex items-center gap-2 group">
              {/* Indicador de ordem */}
              <span className="text-xs text-slate-300 w-4 text-right flex-shrink-0 font-mono">{index + 1}.</span>

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
                  <button
                    onClick={() => handleEditar(cat.id)}
                    disabled={editar.isPending}
                    className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50"
                    title="Salvar"
                  >
                    {editar.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => { setEditandoId(null); setEditNome(""); }}
                    className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                    title="Cancelar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className="flex-1 px-2.5 py-1.5 rounded-lg text-sm font-medium text-slate-700 border border-slate-100"
                    style={{ backgroundColor: empresaCor + "08" }}
                  >
                    {cat.nome}
                  </span>

                  {canManage && (
                    <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Reordenar */}
                      <button
                        onClick={() => handleMover(index, "up")}
                        disabled={index === 0 || reordenar.isPending}
                        className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Mover para cima"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMover(index, "down")}
                        disabled={index === cats.length - 1 || reordenar.isPending}
                        className="p-1 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        title="Mover para baixo"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      {/* Editar */}
                      <button
                        onClick={() => { setEditandoId(cat.id); setEditNome(cat.nome); }}
                        className="p-1 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50"
                        title="Editar nome"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {/* Remover */}
                      <button
                        onClick={() => handleRemover(cat.id, cat.nome)}
                        disabled={remover.isPending}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
                        title="Remover categoria"
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
            <p className="text-xs text-slate-400 italic py-1">
              Nenhuma categoria cadastrada.{" "}
              {isAdmin && (
                <button
                  onClick={handleInicializar}
                  disabled={inicializar.isPending}
                  className="text-blue-500 hover:underline"
                >
                  Inicializar padrão
                </button>
              )}
            </p>
          )}
        </div>
      )}

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

      {cats.length > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          Passe o mouse sobre uma categoria para editar, reordenar ou remover.
        </p>
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
      cat1Nome: emp.cat1Nome,
      cat2Nome: emp.cat2Nome,
      cat3Nome: emp.cat3Nome,
      cat4Nome: emp.cat4Nome,
      cat5Nome: emp.cat5Nome,
      whatsappGrupoLink: emp.whatsappGrupoLink ?? null,
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
    <div className="premium-admin-scope space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestão de Empresas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isAdmin
              ? "Adicione, edite ou remova unidades e gerencie a composição de faturamento de cada uma."
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
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Composição de Faturamento (padrão inicial)</label>
              <select
                value={form.tipoCategorias}
                onChange={(e) => setForm((p) => ({ ...p, tipoCategorias: e.target.value as "padrao" | "seraphine" }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="padrao">Padrão — Avulso / Produtos / Serv. Extra / Lavatório / Recorrência</option>
                <option value="seraphine">Seraphine — Serviços / Pacotes / Produtos / Caixinha / Recorrência</option>
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

                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-3.5 h-3.5 text-blue-600" />
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Categorias base</p>
                          <p className="text-[11px] text-slate-500">Esses nomes aparecem no lançamento de faturamento desta unidade.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {([
                          ["cat1Nome", "Categoria 1"],
                          ["cat2Nome", "Categoria 2"],
                          ["cat3Nome", "Categoria 3"],
                          ["cat4Nome", "Categoria 4"],
                          ["cat5Nome", "Categoria 5"],
                        ] as const).map(([field, label]) => (
                          <label key={field} className="text-[11px] font-semibold text-slate-600">
                            {label}
                            <input
                              type="text"
                              maxLength={64}
                              value={es[field]}
                              onChange={(e) => setEditState((p) => p ? { ...p, [field]: e.target.value } : null)}
                              className="mt-1 w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-sm font-normal text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-slate-500 mb-1 block flex items-center gap-1">
                        <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current text-[#25D366]" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Link do Grupo WhatsApp
                      </label>
                      <input
                        type="text"
                        value={es.whatsappGrupoLink ?? ""}
                        onChange={(e) => setEditState((p) => p ? { ...p, whatsappGrupoLink: e.target.value || null } : null)}
                        placeholder="https://chat.whatsapp.com/..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366]/50"
                      />
                      <p className="text-xs text-slate-400 mt-1">Cole aqui o link de convite do grupo WhatsApp desta unidade.</p>
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
                      {canManage && (
                        <div className="flex gap-1">
                          <button onClick={() => startEdit(emp)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Editar empresa e categorias">
                            <Pencil className="w-4 h-4" />
                          </button>
                          {isAdmin && (confirmDelete === emp.id ? (
                            <div className="flex gap-1">
                              <Button size="sm" variant="destructive" onClick={() => handleDelete(emp.id)} disabled={remover.isPending} className="text-xs rounded-lg h-7 px-2">Confirmar</Button>
                              <Button size="sm" variant="outline" onClick={() => setConfirmDelete(null)} className="text-xs rounded-lg h-7 px-2">Cancelar</Button>
                            </div>
                          ) : (
                            <button onClick={() => setConfirmDelete(emp.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Remover empresa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Painel de categorias — visível em ambos os modos */}
                <CategoriasPanel
                  empresaSlug={emp.slug}
                  empresaCor={isEditing && es ? es.cor : emp.cor}
                  tipoCategorias={emp.tipoCategorias}
                  currentUser={currentUser}
                />
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
            ? "A composição de faturamento define quais campos aparecem no formulário de lançamento e nos gráficos do dashboard. Alterações refletem imediatamente para todos os usuários da unidade. Os dados históricos são preservados."
            : "Como gerente, pode adicionar, renomear ou reordenar as categorias de faturamento das suas unidades. As alterações afetam a exibição no formulário de lançamento e nos gráficos."}
        </p>
      </div>
    </div>
  );
}
