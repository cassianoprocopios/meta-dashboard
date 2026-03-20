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

const DEFAULT_CATS = {
  padrao: ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"],
  seraphine: ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"],
};

interface EditState {
  nome: string;
  cor: string;
  tipoCategorias: "padrao" | "seraphine";
  cat1Nome: string;
  cat2Nome: string;
  cat3Nome: string;
  cat4Nome: string;
  cat5Nome: string;
}

export default function Empresas() {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);

  const [form, setForm] = useState({
    slug: "",
    nome: "",
    cor: "#3b82f6",
    tipoCategorias: "padrao" as "padrao" | "seraphine",
    cat1Nome: "Avulso",
    cat2Nome: "Produtos",
    cat3Nome: "Serv. Extra",
    cat4Nome: "Lavatório",
    cat5Nome: "Recorrência",
  });

  const { data: empresas = [], refetch, isLoading } = trpc.empresa.listar.useQuery();
  const criar = trpc.empresa.criar.useMutation();
  const remover = trpc.empresa.remover.useMutation();
  const atualizar = trpc.empresa.atualizar.useMutation();

  // Quando o tipo muda no form de criação, preenche os nomes padrão
  const handleTipoChange = (tipo: "padrao" | "seraphine") => {
    const cats = DEFAULT_CATS[tipo];
    setForm((p) => ({
      ...p,
      tipoCategorias: tipo,
      cat1Nome: cats[0],
      cat2Nome: cats[1],
      cat3Nome: cats[2],
      cat4Nome: cats[3],
      cat5Nome: cats[4],
    }));
  };

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
      // Atualizar categorias personalizadas
      const allEmps = await refetch();
      const newEmp = allEmps.data?.find((e) => e.slug === form.slug.toUpperCase().replace(/\s+/g, "_"));
      if (newEmp) {
        await atualizar.mutateAsync({
          id: newEmp.id,
          cat1Nome: form.cat1Nome,
          cat2Nome: form.cat2Nome,
          cat3Nome: form.cat3Nome,
          cat4Nome: form.cat4Nome,
          cat5Nome: form.cat5Nome,
        });
      }
      toast.success(`Empresa "${form.nome}" criada com sucesso!`);
      setForm({ slug: "", nome: "", cor: "#3b82f6", tipoCategorias: "padrao", cat1Nome: "Avulso", cat2Nome: "Produtos", cat3Nome: "Serv. Extra", cat4Nome: "Lavatório", cat5Nome: "Recorrência" });
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

  const handleEditTipoChange = (tipo: "padrao" | "seraphine") => {
    if (!editState) return;
    const cats = DEFAULT_CATS[tipo];
    setEditState((p) => p ? ({
      ...p,
      tipoCategorias: tipo,
      cat1Nome: cats[0],
      cat2Nome: cats[1],
      cat3Nome: cats[2],
      cat4Nome: cats[3],
      cat5Nome: cats[4],
    }) : null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestão de Empresas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Adicione, edite ou remova unidades. Apenas administradores têm acesso.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </Button>
      </div>

      {/* Formulário de criação */}
      {showForm && (
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
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">Tipo de Categorias</label>
              <select
                value={form.tipoCategorias}
                onChange={(e) => handleTipoChange(e.target.value as "padrao" | "seraphine")}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="padrao">Padrão (Avulso / Produtos / Serv. Extra / Lavatório / Recorrência)</option>
                <option value="seraphine">Seraphine (Cabelo / Produtos / Unha / Outros / Recorrência)</option>
              </select>
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

          {/* Nomes das categorias */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-slate-700">Nomes das Categorias de Faturamento</h4>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {(["cat1Nome", "cat2Nome", "cat3Nome", "cat4Nome", "cat5Nome"] as const).map((field, i) => (
                <div key={field}>
                  <label className="text-xs text-slate-500 mb-1 block">Cat. {i + 1}</label>
                  <input
                    type="text"
                    value={form[field]}
                    onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={`Categoria ${i + 1}`}
                  />
                </div>
              ))}
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
                  /* ── Modo edição ── */
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
                      <label className="text-xs text-slate-500 mb-1 block">Tipo de Categorias</label>
                      <select value={es.tipoCategorias} onChange={(e) => handleEditTipoChange(e.target.value as "padrao" | "seraphine")} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                        <option value="padrao">Padrão</option>
                        <option value="seraphine">Seraphine</option>
                      </select>
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

                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Tag className="w-3.5 h-3.5 text-blue-500" />
                        <label className="text-xs font-semibold text-slate-600">Categorias de Faturamento</label>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {(["cat1Nome", "cat2Nome", "cat3Nome", "cat4Nome", "cat5Nome"] as const).map((field, i) => (
                          <div key={field} className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 w-12 shrink-0">Cat. {i + 1}</span>
                            <input
                              type="text"
                              value={es[field]}
                              onChange={(e) => setEditState((p) => p ? { ...p, [field]: e.target.value } : null)}
                              className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        ))}
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
                    </div>

                    {/* Categorias */}
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Categorias</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[emp.cat1Nome, emp.cat2Nome, emp.cat3Nome, emp.cat4Nome, emp.cat5Nome].map((cat, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
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
          Ao remover uma empresa, ela deixa de aparecer no sistema mas os dados históricos são preservados.
          Alterar os nomes das categorias afeta apenas a exibição — os dados lançados são mantidos.
        </p>
      </div>
    </div>
  );
}
