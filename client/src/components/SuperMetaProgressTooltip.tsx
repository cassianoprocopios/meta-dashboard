import { useState, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { criarDetalhesTooltipSuperMeta } from "@shared/bonificacao";

interface SuperMetaProgressTooltipProps {
  nomeUnidade: string;
  totalRealizado: number;
  superMeta: number;
  children: ReactNode;
}

export function SuperMetaProgressTooltip({
  nomeUnidade,
  totalRealizado,
  superMeta,
  children,
}: SuperMetaProgressTooltipProps) {
  const [aberto, setAberto] = useState(false);
  const detalhes = criarDetalhesTooltipSuperMeta(nomeUnidade, totalRealizado, superMeta);
  const { progresso } = detalhes;

  return (
    <Tooltip open={aberto} onOpenChange={setAberto}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setAberto((valorAtual) => !valorAtual)}
          className="block w-full rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
          aria-label={detalhes.descricaoAcessivel}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={8}
        className="w-72 max-w-[calc(100vw-2rem)] border border-slate-700 bg-slate-950 p-3 text-left text-slate-100 shadow-xl"
      >
        <p className="text-xs font-bold text-white">{detalhes.titulo}</p>
        <div className="mt-2 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Faturamento exato</span>
            <strong className="text-white">{detalhes.faturamentoTexto}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Objetivo da Super Meta</span>
            <strong className="text-amber-300">{detalhes.objetivoTexto}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Percentual alcançado</span>
            <strong className={progresso.atingida ? "text-emerald-300" : "text-orange-300"}>
              {detalhes.percentualTexto}
            </strong>
          </div>
        </div>
        <div className="mt-2 border-t border-slate-800 pt-2">
          <div className="flex items-center justify-between gap-4 text-xs font-bold">
            <span className={progresso.atingida ? "text-emerald-300" : "text-orange-300"}>
              {detalhes.statusRotulo}
            </span>
            <span className={progresso.atingida ? "text-emerald-300" : "text-orange-300"}>
              {detalhes.statusValorTexto}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-500">Passe o mouse, use a tecla Tab ou toque na barra para consultar.</p>
      </TooltipContent>
    </Tooltip>
  );
}
