import {
  somarFaturamentoTotal,
  type LinhaFaturamentoCategorias,
} from "./faturamentoCategorias";

export type FaturamentoQuinzenal = LinhaFaturamentoCategorias & { data: string };

export function somarTotalDiario(faturamento: FaturamentoQuinzenal) {
  return somarFaturamentoTotal(faturamento);
}

/**
 * Regra do fechamento quinzenal:
 * - soma todas as categorias financeiras, inclusive Dpote, Pacote, Estética e Óleo,
 *   exclusivamente nos lançamentos dos dias 1 a 15.
 */
export function calcularTotalQuinzenal(faturamentosMes: FaturamentoQuinzenal[]) {
  return faturamentosMes
    .filter((faturamento) => {
      const dia = Number.parseInt(faturamento.data.split("-")[2] || "0", 10);
      return dia >= 1 && dia <= 15;
    })
    .reduce((total, faturamento) => total + somarTotalDiario(faturamento), 0);
}
