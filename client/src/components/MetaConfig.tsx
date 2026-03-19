import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Save, TrendingUp, Lock } from "lucide-react";
import { toast } from "sonner";

type Empresa = "MORUMBI" | "MASCOTE" | "SERAPHINE";

interface MetaRow {
  empresa: string;
  metaMensal: unknown;
  metaQuinzenal: unknown;
}

interface Props {
  mes: number;
  ano: number;
  mesLabel: string;
  metasData: MetaRow[];
  onSaved: () => void;
  empresaVinculada?: string;
  isGerente?: boolean;
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

interface EmpresaMeta {
  mensal: string;
  quinzenal: string;
}

export default function MetaConfig({ mes, ano, mesLabel, metasData, onSaved, empresaVinculada, isGerente = false }: Props) {
  const [values, setValues] = useState<Record<Empresa, EmpresaMeta>>({
    MORUMBI: { mensal: "", quinzenal: "" },
    MASCOTE: { mensal: "", quinzenal: "" },
    SERAPHINE: { mensal: "", quinzenal: "" },
  });

  const salvarMeta = trpc.meta.salvar.useMutation();

  // Empresas disponíveis para este usuário
  const empresasDisponiveis: Empresa[] = empresaVinculada
    ? [empresaVinculada as Empresa]
    : EMPRESAS;

  // Preencher com dados existentes
  useEffect(() => {
    const newValues: Record<Empresa, EmpresaMeta> = {
      MORUMBI: { mensal: "", quinzenal: "" },
      MASCOTE: { mensal: "", quinzenal: "" },
      SERAPHINE: { mensal: "", quinzenal: "" },
    };
    for (const m of metasData) {
      const emp = m.empresa as Empresa;
      const mensal = parseFloat(String(m.metaMensal || 0));
      const quinzenal = parseFloat(String(m.metaQuinzenal || 0));
      newValues[emp] = {
        mensal: mensal > 0 ? String(mensal) : "",
        quinzenal: quinzenal > 0 ? String(quinzenal) : "",
      };
    }
    setValues(newValues);
  }, [metasData]);

  const parseVal = (v: string) => {
    const n = parseFloat(v.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const totalMetaMensal = empresasDisponiveis.reduce((s, e) => s + parseVal(values[e].mensal), 0);
  const totalMetaQuinzenal = empresasDisponiveis.reduce((s, e) => s + parseVal(values[e].quinzenal), 0);

  const handleSave = async () => {
    if (!isGerente) {
      toast.error("Apenas gerentes podem configurar metas.");
      return;
    }

    let saved = 0;
    for (const emp of empresasDisponiveis) {
      const mensal = parseVal(values[emp].mensal);
      const quinzenal = parseVal(values[emp].quinzenal);

      if (mensal < 0 || quinzenal < 0) {
        toast.error(`Valor inválido para ${emp}`);
        return;
      }
      try {
        await salvarMeta.mutateAsync({
          empresa: emp,
          mes,
          ano,
          metaMensal: mensal,
          metaQuinzenal: quinzenal,
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

  const diasNoMes = new Date(ano, mes, 0).getDate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Metas de {mesLabel} {ano}</h2>
          <p className="text-sm text-slate-500 mt-0.5">Configure os valores alvo mensal e quinzenal para cada empresa.</p>
        </div>
        {!isGerente && (
          <div className="flex items-center gap-1.5 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-lg text-xs font-medium">
            <Lock className="w-3.5 h-3.5" /> Somente leitura
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {empresasDisponiveis.map((emp) => {
          const mensal = parseVal(values[emp].mensal);
          const quinzenal = parseVal(values[emp].quinzenal);
          const metaDiariaMensal = mensal > 0 ? mensal / diasNoMes : 0;
          const metaDiariaQuinzenal = quinzenal > 0 ? quinzenal / 15 : 0;

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

              {/* Meta Mensal */}
              <div className="mb-3">
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
                    disabled={!isGerente}
                    value={values[emp].mensal}
                    onChange={(e) => setValues((prev) => ({
                      ...prev,
                      [emp]: { ...prev[emp], mensal: e.target.value }
                    }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                {mensal > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    ≈ {fmt(metaDiariaMensal)}/dia ({diasNoMes} dias)
                  </p>
                )}
              </div>

              {/* Meta Quinzenal */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-purple-600 mb-1.5 block uppercase tracking-wide">
                  Meta Quinzenal (R$) — Dias 1–15
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">R$</span>
                  <input
                    type="number"
                    step="100"
                    min="0"
                    placeholder="0,00"
                    disabled={!isGerente}
                    value={values[emp].quinzenal}
                    onChange={(e) => setValues((prev) => ({
                      ...prev,
                      [emp]: { ...prev[emp], quinzenal: e.target.value }
                    }))}
                    className="w-full pl-9 pr-4 py-2.5 border border-purple-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                {quinzenal > 0 && (
                  <p className="text-xs text-purple-500 mt-1">
                    ≈ {fmt(metaDiariaQuinzenal)}/dia (15 dias)
                  </p>
                )}
              </div>

              {/* Resumo */}
              {(mensal > 0 || quinzenal > 0) && (
                <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                  {mensal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Meta mensal</span>
                      <span className="font-semibold text-slate-700">{fmt(mensal)}</span>
                    </div>
                  )}
                  {quinzenal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-purple-500">Meta quinzenal</span>
                      <span className="font-semibold text-purple-700">{fmt(quinzenal)}</span>
                    </div>
                  )}
                  {mensal > 0 && quinzenal > 0 && (
                    <div className="flex justify-between text-xs border-t border-slate-200 pt-1.5">
                      <span className="text-slate-500">2ª quinzena implícita</span>
                      <span className="font-semibold text-slate-700">{fmt(mensal - quinzenal)}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo total */}
      {(totalMetaMensal > 0 || totalMetaQuinzenal > 0) && (
        <Card className="p-5 border-0 shadow-sm rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-900">Resumo das Metas</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {empresasDisponiveis.map((emp) => {
              const mensal = parseVal(values[emp].mensal);
              const quinzenal = parseVal(values[emp].quinzenal);
              const pct = totalMetaMensal > 0 ? (mensal / totalMetaMensal) * 100 : 0;
              return (
                <div key={emp} className="text-center">
                  <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: EMPRESA_COLORS[emp] }}>
                    {pct.toFixed(0)}%
                  </div>
                  <p className="text-xs text-slate-500">{emp.charAt(0) + emp.slice(1).toLowerCase()}</p>
                  <p className="text-sm font-semibold text-slate-900">{fmt(mensal)}</p>
                  {quinzenal > 0 && <p className="text-xs text-purple-600">{fmt(quinzenal)} quinz.</p>}
                </div>
              );
            })}
            {empresasDisponiveis.length > 1 && (
              <div className="text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center text-xs font-bold text-white bg-slate-700">
                  Σ
                </div>
                <p className="text-xs text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">{fmt(totalMetaMensal)}</p>
                {totalMetaQuinzenal > 0 && <p className="text-xs text-purple-600">{fmt(totalMetaQuinzenal)} quinz.</p>}
              </div>
            )}
          </div>
        </Card>
      )}

      {isGerente && (
        <Button
          onClick={handleSave}
          disabled={salvarMeta.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3 gap-2 text-base font-semibold"
        >
          <Save className="w-5 h-5" />
          {salvarMeta.isPending ? "Salvando..." : "Salvar Metas"}
        </Button>
      )}
    </div>
  );
}
