import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Save, Building2 } from "lucide-react";
import { toast } from "sonner";

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
  mes: number;
  ano: number;
  empresas: EmpresaData[];
  empresaVinculada: string | null;
  initialData?: any;
  onSaved: () => void;
  onCancel: () => void;
}

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function FaturamentoForm({ mes, ano, empresas, empresaVinculada, initialData, onSaved, onCancel }: Props) {
  const hoje = new Date();
  const defaultEmpresa = empresaVinculada ?? (empresas[0]?.slug ?? "");
  const defaultData = toDateStr(ano, mes, hoje.getDate());

  const [empresaSlug, setEmpresaSlug] = useState<string>(
    initialData?.empresaSlug ?? defaultEmpresa
  );
  const [data, setData] = useState<string>(initialData?.data ?? defaultData);
  const [cats, setCats] = useState<[string, string, string, string, string]>(
    initialData
      ? [
          String(parseFloat(initialData.cat1 || "0")),
          String(parseFloat(initialData.cat2 || "0")),
          String(parseFloat(initialData.cat3 || "0")),
          String(parseFloat(initialData.cat4 || "0")),
          String(parseFloat(initialData.cat5 || "0")),
        ]
      : ["", "", "", "", ""]
  );
  const [observacao, setObservacao] = useState<string>(initialData?.observacao ?? "");

  const salvar = trpc.faturamento.salvar.useMutation();

  const empresaAtual = empresas.find((e) => e.slug === empresaSlug);

  // Buscar categorias dinâmicas do banco
  const { data: categoriasData = [] } = trpc.categorias.listar.useQuery(
    { empresaSlug: empresaSlug },
    { enabled: !!empresaSlug }
  );

  // Usar categorias do banco se disponíveis, senão fallback para padrão
  const LABELS_PADRAO = ["Avulso", "Produtos", "Serv. Extra", "Lavatório", "Recorrência"];
  const LABELS_SERAPHINE = ["Cabelo", "Produtos", "Unha", "Outros", "Recorrência"];
  const fallbackLabels = empresaAtual?.tipoCategorias === "seraphine" ? LABELS_SERAPHINE : LABELS_PADRAO;
  const labels = categoriasData.length > 0
    ? categoriasData.slice(0, 5).map((c) => c.nome)
    : fallbackLabels;

  // Reset cats when empresa changes (only for new entries)
  useEffect(() => {
    if (!initialData) {
      setCats(["", "", "", "", ""]);
    }
  }, [empresaSlug]);

  const parseValStr = (v: string): string => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? "0" : String(n);
  };
  const parseValNum = (v: string): number => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const total = cats.reduce((s, v) => s + parseValNum(v), 0);

  const handleSave = async () => {
    if (!empresaSlug) { toast.error("Selecione a empresa."); return; }
    if (!data) { toast.error("Informe a data."); return; }

    try {
      await salvar.mutateAsync({
        empresaSlug,
        data,
        cat1: parseValStr(cats[0]),
        cat2: parseValStr(cats[1]),
        cat3: parseValStr(cats[2]),
        cat4: parseValStr(cats[3]),
        cat5: parseValStr(cats[4]),
        observacao: observacao || undefined,
      });
      toast.success("Lançamento salvo com sucesso!");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar lançamento.");
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-5">
      {/* Empresa */}
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
          Empresa
        </label>
        <div className="grid grid-cols-1 gap-2">
          {empresas.map((emp) => {
            const isDisabled = empresaVinculada !== null && emp.slug !== empresaVinculada;
            return (
              <button
                key={emp.slug}
                disabled={isDisabled || !!initialData}
                onClick={() => setEmpresaSlug(emp.slug)}
                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                  empresaSlug === emp.slug
                    ? "border-current shadow-sm"
                    : "border-slate-100 hover:border-slate-200"
                } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                style={empresaSlug === emp.slug ? { borderColor: emp.cor } : {}}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: emp.cor + "20" }}
                >
                  <Building2 className="w-4 h-4" style={{ color: emp.cor }} />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{emp.nome}</p>
                  <p className="text-xs text-slate-500">
                    {categoriasData.length > 0
                    ? categoriasData.slice(0, 5).map((c) => c.nome).join(" / ")
                    : (emp.tipoCategorias === "seraphine" ? "Cabelo / Produtos / Unha / Outros / Recorrência" : "Avulso / Produtos / Serv. Extra / Lavatório / Recorrência")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Data */}
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
          Data
        </label>
        <input
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          min={toDateStr(ano, mes, 1)}
          max={toDateStr(ano, mes, new Date(ano, mes, 0).getDate())}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Categorias */}
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-2 block uppercase tracking-wide">
          Valores por Categoria
        </label>
        <div className="space-y-2.5">
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 flex-shrink-0">
                <span className="text-sm text-slate-700 font-medium">{label}</span>
              </div>
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={cats[i]}
                  onChange={(e) => {
                    const newCats = [...cats] as [string, string, string, string, string];
                    newCats[i] = e.target.value;
                    setCats(newCats);
                  }}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      {total > 0 && (
        <div
          className="flex items-center justify-between p-3 rounded-xl"
          style={{ backgroundColor: (empresaAtual?.cor ?? "#3b82f6") + "10" }}
        >
          <span className="text-sm font-semibold text-slate-700">Total do dia</span>
          <span className="text-lg font-bold" style={{ color: empresaAtual?.cor ?? "#3b82f6" }}>
            {fmt(total)}
          </span>
        </div>
      )}

      {/* Observação */}
      <div>
        <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
          Observação (opcional)
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Alguma observação sobre este dia..."
          rows={2}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={salvar.isPending}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
        >
          <Save className="w-4 h-4" />
          {salvar.isPending ? "Salvando..." : "Salvar Lançamento"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
