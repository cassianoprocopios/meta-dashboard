import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target, Save, TrendingUp, Lock, Loader2, Star, Trophy } from "lucide-react";
import { toast } from "sonner";

interface EmpresaData {
  id: number;
  slug: string;
  nome: string;
  cor: string;
  tipoCategorias: "padrao" | "seraphine";
  ativo: number;
  createdAt: Date;
  categorias?: Array<{ nome: string }>;
}

interface MetaRow {
  empresaSlug: string;
  metaMensal: unknown;
  metaQuinzenal: unknown;
  superMeta?: unknown;
  diasUteis?: number;
  diasUteisQuinzenal?: number;
}

interface Props {
  mes: number;
  ano: number;
  mesLabel: string;
  metasData: MetaRow[];
  empresasData: EmpresaData[];
  onSaved: () => void;
  empresaVinculada: string | null;
  isGerente?: boolean;
  /** Totais realizados por empresa para exibir percentual de atingimento */
  totaisRealizados?: Record<string, number>;
}

interface EmpresaMeta {
  mensal: string;
  quinzenal: string;
  superMeta: string;
  diasUteis: string;
  diasUteisQuinzenal: string;
}

function fmt(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function fmtPct(value: number) {
  return value.toFixed(1) + "%";
}

export default function MetaConfig({
  mes, ano, mesLabel, metasData, empresasData, onSaved, empresaVinculada, isGerente = false, totaisRealizados = {},
}: Props) {
  const salvarMeta = trpc.meta.salvar.useMutation();

  const defaultMeta = (): EmpresaMeta => ({
    mensal: "", quinzenal: "", superMeta: "", diasUteis: "26", diasUteisQuinzenal: "13",
  });

  const [values, setValues] = useState<Record<string, EmpresaMeta>>(() => {
    const init: Record<string, EmpresaMeta> = {};
    empresasData.forEach((e) => { init[e.slug] = defaultMeta(); });
    return init;
  });

  // Empresas visíveis para este usuário
  const empresasVisiveis = empresaVinculada
    ? empresasData.filter((e) => e.slug === empresaVinculada)
    : empresasData;

  // Preencher com dados existentes
  useEffect(() => {
    const newValues: Record<string, EmpresaMeta> = {};
    empresasData.forEach((e) => { newValues[e.slug] = defaultMeta(); });
    for (const m of metasData) {
      const mensal = parseFloat(String(m.metaMensal || 0));
      const quinzenal = parseFloat(String(m.metaQuinzenal || 0));
      const superMetaVal = parseFloat(String(m.superMeta || 0));
      newValues[m.empresaSlug] = {
        mensal: mensal > 0 ? String(mensal) : "",
        quinzenal: quinzenal > 0 ? String(quinzenal) : "",
        superMeta: superMetaVal > 0 ? String(superMetaVal) : "",
        diasUteis: String(m.diasUteis ?? 26),
        diasUteisQuinzenal: String(m.diasUteisQuinzenal ?? 13),
      };
    }
    setValues(newValues);
  }, [metasData, empresasData]);

  const parseVal = (v: string) => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const setField = (slug: string, field: keyof EmpresaMeta, value: string) => {
    setValues((prev) => ({ ...prev, [slug]: { ...(prev[slug] ?? defaultMeta()), [field]: value } }));
  };

  const totalMetaMensal = empresasVisiveis.reduce((s, e) => s + parseVal(values[e.slug]?.mensal ?? ""), 0);
  const totalMetaQuinzenal = empresasVisiveis.reduce((s, e) => s + parseVal(values[e.slug]?.quinzenal ?? ""), 0);
  const totalSuperMeta = empresasVisiveis.reduce((s, e) => s + parseVal(values[e.slug]?.superMeta ?? ""), 0);

  const handleSave = async () => {
    if (!isGerente) {
      toast.error("Apenas gerentes podem configurar metas.");
      return;
    }
    let saved = 0;
    for (const emp of empresasVisiveis) {
      const v = values[emp.slug] ?? defaultMeta();
      const mensal = parseVal(v.mensal);
      const quinzenal = parseVal(v.quinzenal);
      const superMetaVal = parseVal(v.superMeta);
      const diasUteis = parseInt(v.diasUteis) || 26;
      const diasUteisQuinzenal = parseInt(v.diasUteisQuinzenal) || 13;
      try {
        await salvarMeta.mutateAsync({
          empresaSlug: emp.slug,
          mes,
          ano,
          metaMensal: String(mensal),
          metaQuinzenal: String(quinzenal),
          superMeta: String(superMetaVal),
          diasUteis,
          diasUteisQuinzenal,
        });
        saved++;
      } catch (e: any) {
        toast.error(`Erro ao salvar meta de ${emp.nome}: ${e?.message ?? ""}`);
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
      {/* Header */}
      <div className="flex items-center justify-between bg-black rounded-2xl p-6 border border-gray-800">
        <div>
          <h2 className="text-2xl font-bold text-white">Metas de {mesLabel} {ano}</h2>
          <p className="text-sm text-gray-300 mt-2">
            Configure os valores alvo, super meta e os dias úteis de cada empresa para o mês.
          </p>
        </div>
        {!isGerente && (
          <div className="flex items-center gap-1.5 bg-gray-900 text-gray-200 px-4 py-2 rounded-lg text-xs font-medium border border-gray-700">
            <Lock className="w-3.5 h-3.5" /> Somente leitura
          </div>
        )}
      </div>

      {/* Cards de metas por empresa */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {empresasVisiveis.map((emp) => {
          const v = values[emp.slug] ?? defaultMeta();
          const mensal = parseVal(v.mensal);
          const quinzenal = parseVal(v.quinzenal);
          const superMetaVal = parseVal(v.superMeta);
          const diasUteis = parseInt(v.diasUteis) || 26;
          const diasUteisQuinzenal = parseInt(v.diasUteisQuinzenal) || 13;
          const metaDiariaMensal = mensal > 0 && diasUteis > 0 ? mensal / diasUteis : 0;
          const metaDiariaQuinzenal = quinzenal > 0 && diasUteisQuinzenal > 0 ? quinzenal / diasUteisQuinzenal : 0;

          // Percentuais de atingimento
          const realizado = totaisRealizados[emp.slug] ?? 0;
          const pctMeta = mensal > 0 ? Math.min((realizado / mensal) * 100, 999) : 0;
          const pctSuperMeta = superMetaVal > 0 ? Math.min((realizado / superMetaVal) * 100, 999) : 0;
          const atingiuMeta = realizado >= mensal && mensal > 0;
          const atingiuSuperMeta = realizado >= superMetaVal && superMetaVal > 0;

          return (
            <Card key={emp.slug} className="p-6 border border-gray-700 shadow-lg rounded-2xl bg-gray-950 overflow-hidden relative">
              {/* Barra de cor no topo */}
              <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-2xl" style={{ backgroundColor: emp.cor }} />

              {/* Header da empresa */}
              <div className="flex items-center gap-3 mb-5 mt-1">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-800 border border-gray-700">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-white text-lg">{emp.nome}</h3>
                  <p className="text-xs text-gray-400 truncate">
                    {emp.categorias && emp.categorias.length > 0
                      ? emp.categorias.slice(0, 4).map((c) => c.nome).join(" / ")
                      : emp.tipoCategorias === "seraphine" ? "Serviços / Pacotes / Produtos / Caixinha" : "Avulso / Produtos / Serv. Extra / Lavatório"}
                  </p>
                </div>
              </div>

              {/* Percentuais de atingimento */}
              {realizado > 0 && mensal > 0 && (
                <div className="mb-5 space-y-3 pb-5 border-b border-gray-800">
                  {/* Barra de meta mensal */}
                  <div>
                      <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-gray-400" />
                        <span className="text-xs font-semibold text-white">Meta Mensal</span>
                        {atingiuMeta && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold border border-white">
                            <Trophy className="w-2.5 h-2.5" /> Atingida!
                          </span>
                        )}
                      </div>
                      <span className={`text-xs font-bold ${atingiuMeta ? "text-white" : pctMeta >= 80 ? "text-white" : "text-gray-300"}`}>
                        {fmtPct(pctMeta)}
                      </span>
                    </div>
                    <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div
                        className={`h-full rounded-full transition-all ${atingiuMeta ? "bg-white" : pctMeta >= 80 ? "bg-gray-400" : "bg-gray-600"}`}
                        style={{ width: `${Math.min(pctMeta, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">{fmt(realizado)} de {fmt(mensal)}</p>
                  </div>

                  {/* Barra de super meta */}
                  {superMetaVal > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-semibold text-white">Super Meta</span>
                          {atingiuSuperMeta && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white text-black text-[10px] font-bold border border-white">
                              <Star className="w-2.5 h-2.5" /> Superada!
                            </span>
                          )}
                        </div>
                        <span className={`text-xs font-bold ${atingiuSuperMeta ? "text-white" : "text-gray-300"}`}>
                          {fmtPct(pctSuperMeta)}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                        <div
                          className={`h-full rounded-full transition-all ${atingiuSuperMeta ? "bg-white" : "bg-gray-400"}`}
                          style={{ width: `${Math.min(pctSuperMeta, 100)}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{fmt(realizado)} de {fmt(superMetaVal)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Meta Mensal */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">
                  Meta Mensal (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                  <input
                    type="number" step="100" min="0" placeholder="0,00"
                    disabled={!isGerente}
                    value={v.mensal}
                    onChange={(e) => setField(emp.slug, "mensal", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white placeholder-gray-500"
                  />
                </div>
                {metaDiariaMensal > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">≈ {fmt(metaDiariaMensal)}/dia útil</p>
                )}
              </div>

              {/* Super Meta */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide flex items-center gap-1">
                  <Star className="w-3 h-3" /> Super Meta (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                  <input
                    type="number" step="100" min="0" placeholder="0,00 (opcional)"
                    disabled={!isGerente}
                    value={v.superMeta}
                    onChange={(e) => setField(emp.slug, "superMeta", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white placeholder-gray-500"
                  />
                </div>
                {superMetaVal > 0 && mensal > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    +{fmt(superMetaVal - mensal)} acima da meta ({fmtPct(((superMetaVal - mensal) / mensal) * 100)} a mais)
                  </p>
                )}
              </div>

              {/* Dias úteis mensais */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">
                  Dias Úteis no Mês
                </label>
                <input
                  type="number" step="1" min="1" max="31" placeholder="26"
                  disabled={!isGerente}
                  value={v.diasUteis}
                  onChange={(e) => setField(emp.slug, "diasUteis", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1.5">Informe os dias úteis reais desta unidade.</p>
              </div>

              {/* Meta Quinzenal */}
              <div className="mb-4">
                <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">
                  Meta Quinzenal (R$) — Dias 1–15
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">R$</span>
                  <input
                    type="number" step="100" min="0" placeholder="0,00"
                    disabled={!isGerente}
                    value={v.quinzenal}
                    onChange={(e) => setField(emp.slug, "quinzenal", e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white placeholder-gray-500"
                  />
                </div>
                {metaDiariaQuinzenal > 0 && (
                  <p className="text-xs text-gray-400 mt-1.5">≈ {fmt(metaDiariaQuinzenal)}/dia útil</p>
                )}
              </div>

              {/* Dias úteis quinzenais */}
              <div className="mb-5">
                <label className="text-xs font-semibold text-white mb-2 block uppercase tracking-wide">
                  Dias Úteis Quinzenal (1–15)
                </label>
                <input
                  type="number" step="1" min="1" max="15" placeholder="13"
                  disabled={!isGerente}
                  value={v.diasUteisQuinzenal}
                  onChange={(e) => setField(emp.slug, "diasUteisQuinzenal", e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-white font-medium disabled:opacity-50 disabled:cursor-not-allowed bg-gray-900 text-white placeholder-gray-500"
                />
              </div>

              {/* Resumo */}
              {(mensal > 0 || quinzenal > 0 || superMetaVal > 0) && (
                <div className="bg-gray-900 rounded-lg p-4 space-y-2 border border-gray-700">
                  {mensal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Meta mensal ({diasUteis}d úteis)</span>
                      <span className="font-semibold text-white">{fmt(mensal)}</span>
                    </div>
                  )}
                  {superMetaVal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 flex items-center gap-1"><Star className="w-2.5 h-2.5" /> Super meta</span>
                      <span className="font-semibold text-white">{fmt(superMetaVal)}</span>
                    </div>
                  )}
                  {quinzenal > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Meta quinzenal ({diasUteisQuinzenal}d úteis)</span>
                      <span className="font-semibold text-white">{fmt(quinzenal)}</span>
                    </div>
                  )}
                  {mensal > 0 && quinzenal > 0 && (
                    <div className="flex justify-between text-xs border-t border-gray-700 pt-2">
                      <span className="text-gray-400">2ª quinzena implícita</span>
                      <span className="font-semibold text-white">{fmt(Math.max(0, mensal - quinzenal))}</span>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Resumo total */}
      {(totalMetaMensal > 0 || totalMetaQuinzenal > 0 || totalSuperMeta > 0) && (
        <Card className="p-6 border border-gray-700 shadow-lg rounded-2xl bg-black">
          <div className="flex items-center gap-3 mb-5">
            <TrendingUp className="w-5 h-5 text-white" />
            <h3 className="font-bold text-white text-lg">Resumo das Metas</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {empresasVisiveis.map((emp) => {
              const v = values[emp.slug] ?? defaultMeta();
              const mensal = parseVal(v.mensal);
              const quinzenal = parseVal(v.quinzenal);
              const superMetaVal = parseVal(v.superMeta);
              const pct = totalMetaMensal > 0 ? (mensal / totalMetaMensal) * 100 : 0;
              return (
                <div key={emp.slug} className="text-center p-3 bg-gray-900 rounded-lg border border-gray-700">
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold text-white border-2"
                    style={{ borderColor: emp.cor, backgroundColor: emp.cor + "30" }}
                  >
                    {pct.toFixed(0)}%
                  </div>
                  <p className="text-xs text-gray-400">{emp.nome}</p>
                  <p className="text-sm font-semibold text-white">{fmt(mensal)}</p>
                  {superMetaVal > 0 && (
                    <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5">
                      <Star className="w-2.5 h-2.5" />{fmt(superMetaVal)}
                    </p>
                  )}
                  {quinzenal > 0 && <p className="text-xs text-gray-400">{fmt(quinzenal)} quinz.</p>}
                </div>
              );
            })}
            {empresasVisiveis.length > 1 && (
              <div className="text-center p-3 bg-gray-900 rounded-lg border border-gray-700">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-xs font-bold text-white bg-gray-800 border-2 border-white">Σ</div>
                <p className="text-xs text-gray-400">Total</p>
                <p className="text-sm font-semibold text-white">{fmt(totalMetaMensal)}</p>
                {totalSuperMeta > 0 && (
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-0.5">
                    <Star className="w-2.5 h-2.5" />{fmt(totalSuperMeta)}
                  </p>
                )}
                {totalMetaQuinzenal > 0 && <p className="text-xs text-gray-400">{fmt(totalMetaQuinzenal)} quinz.</p>}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Botão salvar */}
      {isGerente && (
        <Button
          onClick={handleSave}
          disabled={salvarMeta.isPending}
          className="w-full bg-white hover:bg-gray-200 text-black rounded-lg gap-2 py-3 font-semibold border border-gray-300"
        >
          {salvarMeta.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Metas de {mesLabel}
        </Button>
      )}
    </div>
  );
}
