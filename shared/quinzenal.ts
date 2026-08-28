export type FaturamentoQuinzenal = {
  data: string;
  cat1?: string | number | null;
  cat2?: string | number | null;
  cat3?: string | number | null;
  cat4?: string | number | null;
  cat5?: string | number | null;
  cat6?: string | number | null;
  cat7?: string | number | null;
  cat8?: string | number | null;
  cat9?: string | number | null;
};

function valorNumerico(valor: string | number | null | undefined) {
  const numero = typeof valor === "number" ? valor : Number.parseFloat(valor || "0");
  return Number.isFinite(numero) ? numero : 0;
}

export function somarTotalDiario(faturamento: FaturamentoQuinzenal) {
  return [
    faturamento.cat1,
    faturamento.cat2,
    faturamento.cat3,
    faturamento.cat4,
    faturamento.cat5,
    faturamento.cat6,
    faturamento.cat7,
    faturamento.cat8,
    faturamento.cat9,
  ].reduce<number>((total, categoria) => total + valorNumerico(categoria), 0);
}

/**
 * Regra do fechamento quinzenal:
 * - soma todas as categorias, inclusive o Dpote distribuído (cat9),
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
