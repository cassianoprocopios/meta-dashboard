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

export function somarOperacional(faturamento: FaturamentoQuinzenal) {
  return [
    faturamento.cat1,
    faturamento.cat2,
    faturamento.cat3,
    faturamento.cat4,
    faturamento.cat5,
    faturamento.cat6,
    faturamento.cat7,
    faturamento.cat8,
  ].reduce<number>((total, categoria) => total + valorNumerico(categoria), 0);
}

/**
 * Regra do fechamento quinzenal:
 * - faturamento operacional (cat1–cat8) somente dos dias 1 a 15;
 * - Dpote/recorrência (cat9) integral do mês, pois é uma receita mensal distribuída.
 */
export function calcularTotalQuinzenal(
  faturamentosMes: FaturamentoQuinzenal[],
  recorrenciaTotalOverride?: number
) {
  const operacionalPrimeiraQuinzena = faturamentosMes
    .filter((faturamento) => {
      const dia = Number.parseInt(faturamento.data.split("-")[2] || "0", 10);
      return dia >= 1 && dia <= 15;
    })
    .reduce((total, faturamento) => total + somarOperacional(faturamento), 0);

  const recorrenciaTotal = recorrenciaTotalOverride ?? faturamentosMes.reduce(
    (total, faturamento) => total + valorNumerico(faturamento.cat9),
    0
  );

  return operacionalPrimeiraQuinzena + recorrenciaTotal;
}
