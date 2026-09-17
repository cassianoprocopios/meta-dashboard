import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Save, Building2, CalendarClock, Clock } from "lucide-react";
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

  // Detecta se a data selecionada é futura (posterior ao dia de hoje)
  const isDataFutura = (dateStr: string): boolean => {
    if (!dateStr) return false;
    const [y, m, d] = dateStr.split("-").map(Number);
    const selecionada = new Date(y, m - 1, d);
    const hojeNormalizado = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    return selecionada > hojeNormalizado;
  };

  const [empresaSlug, setEmpresaSlug] = useState<string>(
    initialData?.empresaSlug ?? defaultEmpresa
  );
  const [data, setData] = useState<string>(initialData?.data ?? defaultData);
  const [cats, setCats] = useState<[string, string, string, string, string, string, string, string, string, string, string, string]>(
    initialData
      ? [
          String(parseFloat(initialData.cat1 || "0")),
          String(parseFloat(initialData.cat2 || "0")),
          String(parseFloat(initialData.cat3 || "0")),
          String(parseFloat(initialData.cat4 || "0")),
          String(parseFloat(initialData.cat5 || "0")),
          String(parseFloat(initialData.cat6 || "0")),
          String(parseFloat(initialData.cat7 || "0")),
          String(parseFloat(initialData.cat8 || "0")),
          String(parseFloat(initialData.cat9 || "0")),
          String(parseFloat(initialData.cat10 || "0")),
          String(parseFloat(initialData.cat11 || "0")),
          String(parseFloat(initialData.cat12 || "0")),
        ]
      : ["", "", "", "", "", "", "", "", "", "", "", ""]
  );
  const [observacao, setObservacao] = useState<string>(initialData?.observacao ?? "");

  const utils = trpc.useUtils();
  const salvar = trpc.faturamento.salvar.useMutation({
    onSuccess: () => {
      // Invalidar todas as queries relacionadas ao faturamento
      utils.faturamento.listar.invalidate();
      utils.profissionais.ranking.invalidate();
    },
  });

  const empresaAtual = empresas.find((e) => e.slug === empresaSlug);
  const futuro = isDataFutura(data);

  // Buscar categorias dinâmicas do banco
  const { data: categoriasData = [] } = trpc.categorias.listar.useQuery(
    { empresaSlug: empresaSlug },
    { enabled: !!empresaSlug }
  );

  // Usar categorias do banco se disponíveis, senão fallback para padrão
  const LABELS_PADRAO = ["Avulso/Clube", "Serv. Extra", "Auxiliar", "Keune", "Don Alcides", "Caixinha", "Barbiero", "Bar", "Recorrência", "Pacote", "Estética", "Óleo Essencial"];
  const LABELS_SERAPHINE = ["Faturamento total"];
  const isSeraphine = empresaAtual?.tipoCategorias === "seraphine";
  const fallbackLabels = empresaAtual?.tipoCategorias === "seraphine" ? LABELS_SERAPHINE : LABELS_PADRAO;
  const labels = categoriasData.length > 0
    ? categoriasData.slice(0, isSeraphine ? 1 : 12).map((c) => c.nome)
    : fallbackLabels;

  // Reset cats when empresa changes (only for new entries)
  useEffect(() => {
    if (!initialData) {
      setCats(["", "", "", "", "", "", "", "", "", "", "", ""]);
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
        cat2: isSeraphine ? "0" : parseValStr(cats[1]),
        cat3: isSeraphine ? "0" : parseValStr(cats[2]),
        cat4: isSeraphine ? "0" : parseValStr(cats[3]),
        cat5: isSeraphine ? "0" : parseValStr(cats[4]),
        cat6: isSeraphine ? "0" : parseValStr(cats[5]),
        cat7: isSeraphine ? "0" : parseValStr(cats[6]),
        cat8: isSeraphine ? "0" : parseValStr(cats[7]),
        cat9: isSeraphine ? "0" : parseValStr(cats[8]),
        cat10: isSeraphine ? "0" : parseValStr(cats[9]),
        cat11: isSeraphine ? "0" : parseValStr(cats[10]),
        cat12: isSeraphine ? "0" : parseValStr(cats[11]),
        observacao: observacao || undefined,
      });
      toast.success(futuro ? "Lançamento previsto salvo!" : "Lançamento salvo com sucesso!");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar lançamento.");
    }
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-5">

      {/* Banner de modo Previsto — aparece quando a data é futura */}
      {futuro && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-400/40">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/20 flex-shrink-0">
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold uppercase tracking-wide">
                <Clock className="w-2.5 h-2.5" />
                Previsto
              </span>
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                Lançamento para data futura
              </span>
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">
              Valores previstos não afetam média, máximo e mínimo diário — apenas a projeção final.
            </p>
          </div>
        </div>
      )}

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
                    {/* Cada empresa mostra suas próprias categorias do banco */}
                    {emp.categorias && emp.categorias.length > 0
                      ? emp.categorias.slice(0, emp.tipoCategorias === "seraphine" ? 1 : 12).map((c) => c.nome).join(" / ")
                      : (emp.tipoCategorias === "seraphine"
                        ? "Faturamento total"
                        : "Avulso / Serv. Extra / Auxiliar / Keune / Don Alcides / Caixinha / Barbiero / Bar / Recorrência / Pacote / Estética / Óleo Essencial")}
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
        <div className="relative">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            min={toDateStr(ano, mes, 1)}
            max={toDateStr(ano, mes, new Date(ano, mes, 0).getDate())}
            className={`w-full px-4 py-2.5 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 transition-all ${
              futuro
                ? "border-amber-400 bg-amber-50 focus:ring-amber-400 text-amber-900 pr-24"
                : "border-slate-200 focus:ring-blue-500"
            }`}
          />
          {/* Badge inline na data */}
          {futuro && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide pointer-events-none">
              <Clock className="w-2.5 h-2.5" />
              Previsto
            </span>
          )}
        </div>
        {/* Dia da semana abaixo do campo de data */}
        {data && (() => {
          const DIAS_SEMANA_FULL = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
          const [y, m, d] = data.split("-").map(Number);
          const dt = new Date(y, m - 1, d);
          const nomeDia = DIAS_SEMANA_FULL[dt.getDay()];
          const fimDeSemana = dt.getDay() === 0 || dt.getDay() === 6;
          return (
            <p className={`mt-1 text-xs font-medium ${
              futuro ? "text-amber-600" : fimDeSemana ? "text-violet-500" : "text-slate-500"
            }`}>
              {nomeDia}
            </p>
          );
        })()}
      </div>

      {/* Categorias */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Valores por Categoria
          </label>
          {futuro && (
            <span className="text-[10px] text-amber-600 font-semibold uppercase tracking-wide">
              — valores previstos
            </span>
          )}
        </div>
        <div className={`space-y-2.5 rounded-xl transition-all ${futuro ? "p-3 bg-amber-50/60 border border-amber-200/60" : ""}`}>
          {labels.map((label, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-28 flex-shrink-0">
                <span className="text-sm text-slate-700 font-medium">{label}</span>
              </div>
              <div className="relative flex-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${futuro ? "text-amber-400" : "text-slate-400"}`}>
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  autoComplete="off"
                  value={cats[i]}
                  onChange={(e) => {
                    const newCats = [...cats] as [string, string, string, string, string, string, string, string, string, string, string, string];
                    newCats[i] = e.target.value;
                    setCats(newCats);
                  }}
                  className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 font-medium transition-all ${
                    futuro
                      ? "border-amber-300 bg-amber-50 focus:ring-amber-400 text-amber-900 placeholder:text-amber-300"
                      : "border-slate-200 focus:ring-blue-500"
                  }`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      {total > 0 && (
        <div
          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
            futuro
              ? "bg-amber-500/10 border-amber-300/50"
              : "border-transparent"
          }`}
          style={!futuro ? { backgroundColor: (empresaAtual?.cor ?? "#3b82f6") + "10" } : {}}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700">Total do dia</span>
            {futuro && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide">
                <Clock className="w-2.5 h-2.5" />
                Previsto
              </span>
            )}
          </div>
          <span
            className={`text-lg font-bold ${futuro ? "text-amber-600" : ""}`}
            style={!futuro ? { color: empresaAtual?.cor ?? "#3b82f6" } : {}}
          >
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
          placeholder={futuro ? "Observação sobre este lançamento previsto..." : "Alguma observação sobre este dia..."}
          rows={2}
          className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 resize-none transition-all ${
            futuro
              ? "border-amber-300 bg-amber-50 focus:ring-amber-400 placeholder:text-amber-400"
              : "border-slate-200 focus:ring-blue-500"
          }`}
        />
      </div>

      {/* Botões */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={salvar.isPending}
          className={`flex-1 text-white rounded-xl gap-2 transition-all ${
            futuro
              ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200 shadow-md"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {futuro ? <CalendarClock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {salvar.isPending
            ? "Salvando..."
            : futuro
            ? "Salvar como Previsto"
            : "Salvar Lançamento"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="rounded-xl">
          Cancelar
        </Button>
      </div>
    </div>
  );
}
