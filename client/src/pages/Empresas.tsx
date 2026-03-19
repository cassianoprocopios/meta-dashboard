import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TIPO_LABELS: Record<string, string> = {
  padrao: "Avulso / Produtos / Serv. Extra / Lavatório / Recorrência",
  seraphine: "Cabelo / Produtos / Unha / Outros / Recorrência",
};

const CORES_SUGERIDAS = [
  "#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#84cc16", "#f97316", "#ec4899", "#6366f1",
];

export default function Empresas() {
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [form, setForm] = useState({
    slug: "",
    nome: "",
    cor: "#3b82f6",
    tipoCategorias: "padrao" as "padrao" | "seraphine",
  });

  const { data: empresas = [], refetch, isLoading } = trpc.empresa.listar.useQuery();
  const criar = trpc.empresa.criar.useMutation();
  const remover = trpc.empresa.remover.useMutation();

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Gestão de Empresas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Adicione ou remova unidades do sistema. Apenas administradores têm acesso.
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
            {/* Código */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Código (slug) *
              </label>
              <input
                type="text"
                placeholder="Ex: MORUMBI"
                value={form.slug}
                onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-xs text-slate-400 mt-1">Identificador único, sem espaços.</p>
            </div>
            {/* Nome */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Nome da Empresa *
              </label>
              <input
                type="text"
                placeholder="Ex: Unidade Morumbi"
                value={form.nome}
                onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Tipo de categorias */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Tipo de Categorias
              </label>
              <select
                value={form.tipoCategorias}
                onChange={(e) => setForm((p) => ({ ...p, tipoCategorias: e.target.value as "padrao" | "seraphine" }))}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="padrao">Padrão (Avulso / Produtos / Serv. Extra / Lavatório / Recorrência)</option>
                <option value="seraphine">Seraphine (Cabelo / Produtos / Unha / Outros / Recorrência)</option>
              </select>
            </div>
            {/* Cor */}
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Cor de Identificação
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.cor}
                  onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {CORES_SUGERIDAS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setForm((p) => ({ ...p, cor: c }))}
                      className="w-6 h-6 rounded-full border-2 transition-all"
                      style={{
                        backgroundColor: c,
                        borderColor: form.cor === c ? "#1e293b" : "transparent",
                        transform: form.cor === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Preview */}
          <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: form.cor + "20" }}
            >
              <Building2 className="w-5 h-5" style={{ color: form.cor }} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{form.nome || "Nome da empresa"}</p>
              <p className="text-xs text-slate-500 font-mono">{form.slug || "CODIGO"}</p>
            </div>
            <div
              className="ml-auto px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: form.cor }}
            >
              {form.tipoCategorias === "seraphine" ? "Seraphine" : "Padrão"}
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleCreate}
              disabled={criar.isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
            >
              {criar.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar Empresa
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowForm(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
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
          {empresas.map((emp) => (
            <Card key={emp.id} className="p-5 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative">
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ backgroundColor: emp.cor }}
              />
              <div className="flex items-start justify-between mt-1">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: emp.cor + "20" }}
                  >
                    <Building2 className="w-5 h-5" style={{ color: emp.cor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{emp.nome}</h3>
                    <p className="text-xs text-slate-400 font-mono">{emp.slug}</p>
                  </div>
                </div>
                {confirmDelete === emp.id ? (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(emp.id)}
                      disabled={remover.isPending}
                      className="text-xs rounded-lg h-7 px-2"
                    >
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmDelete(null)}
                      className="text-xs rounded-lg h-7 px-2"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(emp.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Remover empresa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                    style={{ backgroundColor: emp.cor }}
                  >
                    {emp.tipoCategorias === "seraphine" ? "Seraphine" : "Padrão"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{TIPO_LABELS[emp.tipoCategorias]}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Aviso */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-700">
          Ao remover uma empresa, ela deixa de aparecer no sistema mas os dados históricos são preservados.
          Para restaurar, entre em contato com o suporte técnico.
        </p>
      </div>
    </div>
  );
}
