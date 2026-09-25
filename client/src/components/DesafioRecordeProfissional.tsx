import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import RecordCelebration from "@/components/RecordCelebration";
import RecordeDetalhes from "@/components/RecordeDetalhes";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface MelhorMesProfissional {
  mes: number;
  ano: number;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
  percentualDoRecorde: number;
  faltaParaRecorde: number;
  valorAcimaDoRecorde: number;
  novoRecorde: boolean;
  igualouRecorde: boolean;
  detalhesServicos?: string | null;
  detalhesProdutos?: string | null;
}

function formatarMoeda(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function DesafioRecordeProfissional({
  melhorMes,
  totalAtual,
  detalhesAtuaisServicos,
  detalhesAtuaisProdutos,
  carregando = false,
  origem = "meu",
}: {
  melhorMes?: MelhorMesProfissional | null;
  totalAtual: number;
  detalhesAtuaisServicos?: string | null;
  detalhesAtuaisProdutos?: string | null;
  carregando?: boolean;
  origem?: "ranking" | "meu";
}) {
  const [mostrarDetalhes, setMostrarDetalhes] = useState(false);

  if (carregando) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 h-4 w-40 rounded bg-slate-200" />
        <div className="mb-3 h-8 rounded bg-slate-100" />
        <div className="h-3 rounded-full bg-slate-200" />
      </div>
    );
  }

  if (!melhorMes) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <Award className="h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <p className="text-sm font-bold text-slate-900">Seu recorde começa agora</p>
          <p className="mt-0.5 text-xs text-slate-600">
            Este é seu primeiro mês registrado. Continue vendendo para criar sua marca pessoal.
          </p>
        </div>
      </div>
    );
  }

  const recordeAlcancado = melhorMes.novoRecorde || melhorMes.igualouRecorde;
  const temDetalhes = Boolean(melhorMes.detalhesServicos || melhorMes.detalhesProdutos);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-4 shadow-sm ${
        melhorMes.novoRecorde
          ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50"
          : melhorMes.igualouRecorde
            ? "border-blue-300 bg-gradient-to-br from-blue-50 to-white"
            : "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50"
      }`}
      data-recorde-origem={origem}
    >
      {melhorMes.novoRecorde && <RecordCelebration />}

      <div className="relative z-[1] mb-2 flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
          {origem === "ranking" ? "Seu desafio no ranking" : "Seu recorde pessoal"}
        </p>
        {recordeAlcancado && (
          <span
            className={`record-achievement-badge inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black tracking-[0.1em] ${
              melhorMes.novoRecorde
                ? "bg-emerald-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            <Trophy className="h-3 w-3" />
            {melhorMes.novoRecorde ? "NOVO RECORDE" : "RECORDE IGUALADO"}
          </span>
        )}
      </div>

      <div className="relative z-[1] mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              recordeAlcancado
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            <Award className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">
              Melhor mês: {MESES[melhorMes.mes - 1]}/{String(melhorMes.ano).slice(-2)}
            </p>
            <p className="text-xs text-slate-500">
              Serviços {formatarMoeda(melhorMes.totalServicos)} · Produtos {formatarMoeda(melhorMes.totalProdutos)}
            </p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-base font-black ${
            recordeAlcancado
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {melhorMes.percentualDoRecorde}%
        </span>
      </div>

      <div className="relative z-[1] mb-1.5 flex items-center justify-between text-xs">
        <span className="text-slate-600">Atual: {formatarMoeda(totalAtual)}</span>
        <span className="font-semibold text-slate-900">
          Recorde: {formatarMoeda(melhorMes.totalGeral)}
        </span>
      </div>

      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="relative z-[1] h-3 cursor-help overflow-hidden rounded-full bg-slate-200 ring-1 ring-inset ring-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            role="progressbar"
            tabIndex={0}
            aria-label={`Progresso para superar seu recorde histórico. ${
              melhorMes.faltaParaRecorde > 0
                ? `Faltam ${formatarMoeda(melhorMes.faltaParaRecorde)}`
                : "Recorde alcançado"
            }`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.min(melhorMes.percentualDoRecorde, 100)}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-300 ${
                recordeAlcancado
                  ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                  : "bg-gradient-to-r from-amber-500 to-yellow-400"
              }`}
              style={{
                width: `${Math.min(Math.max(melhorMes.percentualDoRecorde, 0), 100)}%`,
              }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={6}
          className="border border-slate-700 bg-slate-950 px-3 py-2 text-white shadow-xl"
        >
          <p className="font-bold">
            {melhorMes.novoRecorde
              ? `Recorde superado em ${formatarMoeda(melhorMes.valorAcimaDoRecorde)}`
              : melhorMes.igualouRecorde
                ? "Recorde alcançado — faltam R$ 0,00"
                : `Faltam exatamente ${formatarMoeda(melhorMes.faltaParaRecorde)}`}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-300">
            Atual {formatarMoeda(totalAtual)} · Recorde {formatarMoeda(melhorMes.totalGeral)}
          </p>
        </TooltipContent>
      </Tooltip>

      <p
        className={`relative z-[1] mt-2 text-xs font-bold ${
          recordeAlcancado ? "text-emerald-700" : "text-amber-700"
        }`}
      >
        {melhorMes.novoRecorde
          ? `Novo recorde! Você superou em ${formatarMoeda(melhorMes.valorAcimaDoRecorde)}.`
          : melhorMes.igualouRecorde
            ? "Você igualou seu melhor resultado. Mais uma venda cria um novo recorde!"
            : `Faltam ${formatarMoeda(melhorMes.faltaParaRecorde)} para superar seu melhor mês.`}
      </p>

      {temDetalhes && (
        <>
          <button
            type="button"
            onClick={() => setMostrarDetalhes((atual) => !atual)}
            aria-expanded={mostrarDetalhes}
            className="relative z-[1] mt-3 flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white/80 px-3 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <span>{mostrarDetalhes ? "Ocultar composição do recorde" : "Ver serviços e produtos do recorde"}</span>
            {mostrarDetalhes ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {mostrarDetalhes && (
            <div className="relative z-[1]">
              <RecordeDetalhes
                detalhesServicos={melhorMes.detalhesServicos}
                detalhesProdutos={melhorMes.detalhesProdutos}
                detalhesAtuaisServicos={detalhesAtuaisServicos}
                detalhesAtuaisProdutos={detalhesAtuaisProdutos}
                modo="claro"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
