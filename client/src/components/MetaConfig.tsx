import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Save, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type Empresa = "MORUMBI" | "MASCOTE" | "SERAPHINE";

interface MetaRow {
  empresa: string;
  metaMensal: unknown;
}

interface Props {
  mes: number;
  ano: number;
  mesLabel: string;
  metasData: MetaRow[];
  onSaved: () => void;
}

const EMPRESAS: Empresa[] = ["MORUMBI", "MASCOTE", "SERAPHINE"];

const EMPRESA_COLORS: Record<Empresa, string> = {
  MORUMBI: "#3b82f6",
  MASCOTE: "#a855f7",
  SERAPHINE: "#10b981",
};

const EMPRESA_DESCRIPTIONS: Record<Empresa, string> = {
  MORUMBI: "Unidade Morumbi",
  MASCOTE: "Unidade Mascote",
  SERAPHINE: "Unidade Seraphine",
};

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export default function MetaConfig({ mes, ano, mesLabel, metasData, onSaved }: Props) {
  const [values, setValues] = useState<Record<Empresa, string>>({
    MORUMBI: "",
    MASCOTE: "",
    SERAPHINE: "",
  });

  const salvarMeta = trpc.meta.salvar.useMutation();

  // Preencher com dados existentes
  useEffect(() => {
    const newValues: Record<Empresa, string> = {
      MORUMBI: "",
      MASCOTE: "",
      SERAPHINE: "",
    };
    for (const m of metasData) {
      const emp = m.empresa as Empresa;
      const val = parseFloat(String(m.metaMensal || 0));
      if (val > 0) newValues[emp] = String(val);
    }
    setValues(newValues);
  }, [metasData]);

  const parseVal = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const totalMeta = EMPRESAS.reduce((s, e) => s + parseVal(values[e]), 0);

  const handleSave = async () => {
    let saved = 0;
    for (const emp of EMPRESAS) {
      const val = parseVal(values[emp]);
      if (val < 0) {
        toast.error(`Valor inválido para ${emp}`);
        return;
      }
      try {
        await salvarMeta.mutateAsync({
          empresa: emp,
          mes,
          ano,
          metaMensal: val,
        });
        saved++;
      } catch {
        toast.error(`Erro ao salvar meta de ${emp}`);
        return;
      }
    }
    if (saved > 0) {
      toast.success("Metas salvas com sucesso!");
      onSaved();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Metas de {mesLabel} {ano}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure os valores alvo para cada empresa neste mês.</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Meta Total</p>
          <p className="text-2xl font-bold text-slate-900">{fmt(totalMeta)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {EMPRESAS.map((emp) => {
          const val = parseVal(values[emp]);
          const metaDiaria = val > 0 ? val / new Date(ano, mes, 0).getDate() : 0;
          const existing = metasData.find((m) => m.empresa === emp);
          const existingVal = existing ? parseFloat(String(existing.metaMensal || 0)) : 0;

          return (
            <Card key={emp} className="p-5 border-0 shadow-sm rounded-2xl bg-white overflow-hidden relative">
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
                style={{ backgroundColor: EMPRESA_COLORS[emp] }}
              />
              <div className="flex items-center gap-2 mb-4 mt-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${EMPRESA_COLORS[emp]}20` }}
                >
                  <Target className="w-4 h-4" style={{ color: EMPRESA_COLORS[emp] }} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{emp.charAt(0) + emp.slice(1).toLowerCase()}</h3>
                  <p className="text-xs text-slate-500">{EMPRESA_DESCRIPTIONS[emp]}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs font-semibold text-slate-600 mb-1.5 block uppercase tracking-wide">
                  Meta Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    placeholder="0,00"
                    value={values[emp]}
                    onChange={(e) => setValues((prev) => ({ ...prev, [emp]: e.target.value }))}
                    className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent font-medium"
                    style={{ "--tw-ring-color": EMPRESA_COLORS[emp] } as React.CSSProperties}
                    onFocus={(e) => e.target.style.setProperty("--tw-ring-color", EMPRESA_COLORS[emp])}
                  />
                </div>
              </div>

              {val > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Meta diária</span>
                    <span className="font-semibold text-slate-700">{fmt(metaDiaria)}</span>
                  </div>
                  {existingVal > 0 && existingVal !== val && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Valor atual</span>
                      <span className="text-slate-500">{fmt(existingVal)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo */}
      {totalMeta > 0 && (
        <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex items-center gap-3 mb-3">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Resumo das Metas</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {EMPRESAS.map((emp) => {
              const val = parseVal(values[emp]);
              const pct = totalMeta > 0 ? (val / totalMeta) * 100 : 0;
              return (
                <div key={emp} className="text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: EMPRESA_COLORS[emp] }}>
                    {pct.toFixed(0)}%
                  </div>
                  <p className="text-xs text-slate-500">{emp.charAt(0) + emp.slice(1).toLowerCase()}</p>
                  <p className="text-sm font-semibold text-slate-900">{fmt(val)}</p>
                </div>
              );
            })}
            <div className="text-center">
              <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold text-white bg-slate-700">
                100%
              </div>
              <p className="text-xs text-slate-500">Total</p>
              <p className="text-sm font-semibold text-slate-900">{fmt(totalMeta)}</p>
            </div>
          </div>
        </Card>
      )}

      <Button
        onClick={handleSave}
        disabled={salvarMeta.isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 gap-2 text-base font-semibold"
      >
        <Save className="w-5 h-5" />
        {salvarMeta.isPending ? "Salvando..." : "Salvar Metas"}
      </Button>
    </div>
  );
}
