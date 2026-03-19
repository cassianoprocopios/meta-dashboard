import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Save, Building2, Lock } from "lucide-react";
import { toast } from "sonner";

type Empresa = "MORUMBI" | "MASCOTE" | "SERAPHINE";

// Categorias por empresa
const CAMPOS_MORUMBI_MASCOTE = [
  { key: "avulso", label: "Avulso" },
  { key: "produtos", label: "Produtos" },
  { key: "servExtra", label: "Serv. Extra" },
  { key: "lavatorio", label: "Lavatório" },
  { key: "recorrencia", label: "Recorrência" },
] as const;

const CAMPOS_SERAPHINE = [
  { key: "avulso", label: "Cabelo" },        // avulso = Cabelo
  { key: "servExtra", label: "Unha" },       // servExtra = Unha
  { key: "lavatorio", label: "Outros" },     // lavatorio = Outros
  { key: "produtos", label: "Produtos" },
  { key: "recorrencia", label: "Recorrência" },
] as const;

type CampoKey = "avulso" | "produtos" | "servExtra" | "lavatorio" | "recorrencia";

interface FaturamentoRow {
  id: number;
  empresa: string;
  data: unknown;
  avulso: unknown;
  produtos: unknown;
  servExtra: unknown;
  lavatorio: unknown;
  recorrencia: unknown;
  observacao: unknown;
}

interface Props {
  mes: number;
  ano: number;
  initialData: { empresa: Empresa; data: string } | null;
  existingData: FaturamentoRow[];
  onClose: () => void;
  onSaved: () => void;
}

const EMPRESAS: Empresa[] = ["MORUMBI", "MASCOTE", "SERAPHINE"];

const EMPRESA_COLORS: Record<Empresa, string> = {
  MORUMBI: "#3b82f6",
  MASCOTE: "#a855f7",
  SERAPHINE: "#10b981",
};

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface EmpresaValues {
  avulso: string;
  produtos: string;
  servExtra: string;
  lavatorio: string;
  recorrencia: string;
  observacao: string;
}

const emptyValues = (): EmpresaValues => ({
  avulso: "",
  produtos: "",
  servExtra: "",
  lavatorio: "",
  recorrencia: "",
  observacao: "",
});

export default function FaturamentoForm({ mes, ano, initialData, existingData, onClose, onSaved }: Props) {
  const { user } = useAuth();
  const isGerente = user?.perfil === "gerente" || user?.role === "admin";
  const empresaVinculada = user?.empresaVinculada as Empresa | undefined;

  const diasNoMes = new Date(ano, mes, 0).getDate();
  const today = new Date();
  const defaultDay = mes === today.getMonth() + 1 && ano === today.getFullYear()
    ? today.getDate()
    : 1;

  const [selectedDay, setSelectedDay] = useState<number>(
    initialData ? parseInt(initialData.data.split("-")[2]) : defaultDay
  );

  const [values, setValues] = useState<Record<Empresa, EmpresaValues>>({
    MORUMBI: emptyValues(),
    MASCOTE: emptyValues(),
    SERAPHINE: emptyValues(),
  });

  // Empresas disponíveis para este usuário
  const empresasDisponiveis: Empresa[] = empresaVinculada
    ? [empresaVinculada]
    : EMPRESAS;

  const [activeEmpresa, setActiveEmpresa] = useState<Empresa>(
    initialData?.empresa || empresasDisponiveis[0] || "MORUMBI"
  );

  const salvarMutation = trpc.faturamento.salvar.useMutation();

  useEffect(() => {
    const dataStr = toDateStr(ano, mes, selectedDay);
    const newValues: Record<Empresa, EmpresaValues> = {
      MORUMBI: emptyValues(),
      MASCOTE: emptyValues(),
      SERAPHINE: emptyValues(),
    };

    for (const emp of EMPRESAS) {
      const existing = existingData.find(
        (f) => (f.data as unknown as string) === dataStr && f.empresa === emp
      );
      if (existing) {
        newValues[emp] = {
          avulso: String(parseFloat(String(existing.avulso || 0)) || ""),
          produtos: String(parseFloat(String(existing.produtos || 0)) || ""),
          servExtra: String(parseFloat(String(existing.servExtra || 0)) || ""),
          lavatorio: String(parseFloat(String(existing.lavatorio || 0)) || ""),
          recorrencia: String(parseFloat(String(existing.recorrencia || 0)) || ""),
          observacao: String(existing.observacao || ""),
        };
      }
    }
    setValues(newValues);
  }, [selectedDay, existingData, mes, ano]);

  const handleChange = (emp: Empresa, field: CampoKey | "observacao", val: string) => {
    setValues((prev) => ({
      ...prev,
      [emp]: { ...prev[emp], [field]: val },
    }));
  };

  const parseVal = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const totalEmpresa = (emp: Empresa) => {
    const v = values[emp];
    return parseVal(v.avulso) + parseVal(v.produtos) + parseVal(v.servExtra) + parseVal(v.lavatorio) + parseVal(v.recorrencia);
  };

  const handleSave = async () => {
    if (!isGerente) {
      toast.error("Apenas gerentes podem realizar lançamentos.");
      return;
    }

    const dataStr = toDateStr(ano, mes, selectedDay);
    let savedCount = 0;

    for (const emp of empresasDisponiveis) {
      const v = values[emp];
      const total = totalEmpresa(emp);
      if (total === 0 && !v.observacao) continue;

      try {
        await salvarMutation.mutateAsync({
          empresa: emp,
          data: dataStr,
          avulso: parseVal(v.avulso),
          produtos: parseVal(v.produtos),
          servExtra: parseVal(v.servExtra),
          lavatorio: parseVal(v.lavatorio),
          recorrencia: parseVal(v.recorrencia),
          observacao: v.observacao || undefined,
        });
        savedCount++;
      } catch (err: any) {
        toast.error(err?.message || `Erro ao salvar ${emp}`);
        return;
      }
    }

    if (savedCount > 0) {
      toast.success(`Lançamento de ${dataStr} salvo com sucesso!`);
      onSaved();
    } else {
      toast.info("Nenhum valor informado para salvar.");
    }
  };

  const dataStr = toDateStr(ano, mes, selectedDay);
  const dataFormatada = new Date(dataStr + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  });

  const getCampos = (emp: Empresa) =>
    emp === "SERAPHINE" ? CAMPOS_SERAPHINE : CAMPOS_MORUMBI_MASCOTE;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto border-0 shadow-2xl rounded-2xl bg-white">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lançamento Diário</h2>
            <p className="text-sm text-slate-500 capitalize">{dataFormatada}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Aviso se não for gerente */}
        {!isGerente && (
          <div className="mx-6 mt-4 p-3 bg-orange-50 rounded-xl flex items-center gap-2 text-sm text-orange-700">
            <Lock className="w-4 h-4 flex-shrink-0" />
            <span>Apenas gerentes podem realizar lançamentos. Contacte o administrador.</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Seletor de Dia */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Selecione o Dia</label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: diasNoMes }, (_, i) => i + 1).map((d) => {
                const dStr = toDateStr(ano, mes, d);
                const hasData = existingData.some((f) => (f.data as unknown as string) === dStr);
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDay(d)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-all relative ${
                      selectedDay === d
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {d}
                    {hasData && selectedDay !== d && (
                      <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Seletor de Empresa */}
          <div>
            <label className="text-sm font-semibold text-slate-700 mb-2 block">Empresa</label>
            <div className="flex gap-2">
              {empresasDisponiveis.map((emp) => {
                const total = totalEmpresa(emp);
                return (
                  <button
                    key={emp}
                    onClick={() => setActiveEmpresa(emp)}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-medium transition-all border-2 ${
                      activeEmpresa === emp
                        ? "border-transparent text-white shadow-md"
                        : "border-slate-200 text-slate-600 bg-white hover:border-slate-300"
                    }`}
                    style={activeEmpresa === emp ? { backgroundColor: EMPRESA_COLORS[emp] } : {}}
                  >
                    <div>{emp.charAt(0) + emp.slice(1).toLowerCase()}</div>
                    {total > 0 && <div className="text-xs opacity-80 mt-0.5">{fmt(total)}</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campos de valores */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4" style={{ color: EMPRESA_COLORS[activeEmpresa] }} />
              <h3 className="font-semibold text-slate-900">{activeEmpresa.charAt(0) + activeEmpresa.slice(1).toLowerCase()}</h3>
              {totalEmpresa(activeEmpresa) > 0 && (
                <span className="ml-auto text-sm font-bold text-slate-900">
                  Total: {fmt(totalEmpresa(activeEmpresa))}
                </span>
              )}
            </div>

            {getCampos(activeEmpresa).map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                  {label}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    disabled={!isGerente}
                    value={values[activeEmpresa][key as CampoKey]}
                    onChange={(e) => handleChange(activeEmpresa, key as CampoKey, e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                Observação (opcional)
              </label>
              <textarea
                rows={2}
                placeholder="Alguma observação sobre este dia..."
                disabled={!isGerente}
                value={values[activeEmpresa].observacao}
                onChange={(e) => handleChange(activeEmpresa, "observacao", e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Resumo do dia */}
          {empresasDisponiveis.some((e) => totalEmpresa(e) > 0) && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Resumo do Dia</h4>
              <div className="space-y-1">
                {empresasDisponiveis.filter((e) => totalEmpresa(e) > 0).map((emp) => (
                  <div key={emp} className="flex justify-between text-sm">
                    <span className="text-slate-600">{emp.charAt(0) + emp.slice(1).toLowerCase()}</span>
                    <span className="font-semibold text-slate-900">{fmt(totalEmpresa(emp))}</span>
                  </div>
                ))}
                <div className="border-t border-blue-200 pt-1 mt-1 flex justify-between text-sm font-bold">
                  <span className="text-blue-800">Total do Dia</span>
                  <span className="text-blue-800">{fmt(empresasDisponiveis.reduce((s, e) => s + totalEmpresa(e), 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-4 flex gap-3 rounded-b-2xl">
          <Button onClick={onClose} variant="outline" className="flex-1 rounded-xl">
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={salvarMutation.isPending || !isGerente}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {salvarMutation.isPending ? "Salvando..." : "Salvar Lançamento"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
