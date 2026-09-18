export interface DistribuicaoRecorrencia {
  porDia: Map<number, number>;
  totalProtegido: number;
  saldoDistribuido: number;
  totalFinal: number;
}

function paraCentavos(valor: number): number {
  return Number.isFinite(valor) ? Math.round(valor * 100) : 0;
}

/**
 * Distribui somente o saldo ainda necessário da Recorrência.
 * Valores da quinzena fechada permanecem intactos e não são somados novamente.
 * O resto de centavos é distribuído entre os primeiros dias elegíveis para que
 * o total final feche exatamente no valor apurado pelo CashBarber.
 */
export function distribuirSaldoRecorrencia(params: {
  totalApurado: number;
  diasElegiveis: number[];
  valoresProtegidos?: Iterable<number>;
}): DistribuicaoRecorrencia {
  const totalCentavos = Math.max(0, paraCentavos(params.totalApurado));
  const protegidoCentavos = Array.from(params.valoresProtegidos ?? [])
    .reduce((soma, valor) => soma + Math.max(0, paraCentavos(valor)), 0);
  const saldoCentavos = Math.max(0, totalCentavos - protegidoCentavos);
  const dias = Array.from(new Set(params.diasElegiveis)).sort((a, b) => a - b);
  const porDia = new Map<number, number>();

  if (dias.length > 0) {
    const baseCentavos = Math.floor(saldoCentavos / dias.length);
    const restoCentavos = saldoCentavos % dias.length;
    dias.forEach((dia, indice) => {
      porDia.set(dia, (baseCentavos + (indice < restoCentavos ? 1 : 0)) / 100);
    });
  }

  const saldoDistribuidoCentavos = Array.from(porDia.values())
    .reduce((soma, valor) => soma + paraCentavos(valor), 0);

  return {
    porDia,
    totalProtegido: protegidoCentavos / 100,
    saldoDistribuido: saldoDistribuidoCentavos / 100,
    totalFinal: (protegidoCentavos + saldoDistribuidoCentavos) / 100,
  };
}
