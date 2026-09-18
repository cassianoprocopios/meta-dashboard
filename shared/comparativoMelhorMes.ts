export interface ResumoFaturamentoProfissional {
  mes: number;
  ano: number;
  totalServicos: number;
  totalProdutos: number;
  totalGeral: number;
}

export interface ComparativoMelhorMes extends ResumoFaturamentoProfissional {
  percentualDoRecorde: number;
  faltaParaRecorde: number;
  valorAcimaDoRecorde: number;
  novoRecorde: boolean;
  igualouRecorde: boolean;
}

export interface MelhorMesColaborador extends ResumoFaturamentoProfissional {
  colaboradorId: number;
}

function arredondarCentavos(valor: number): number {
  return Math.round((Number.isFinite(valor) ? valor : 0) * 100) / 100;
}

export function selecionarMelhoresMesesHistoricos(
  registros: MelhorMesColaborador[],
  mesReferencia: number,
  anoReferencia: number
): Map<number, MelhorMesColaborador> {
  const melhores = new Map<number, MelhorMesColaborador>();
  for (const registro of registros) {
    const anteriorAoPeriodo = registro.ano < anoReferencia
      || (registro.ano === anoReferencia && registro.mes < mesReferencia);
    if (!anteriorAoPeriodo || registro.totalGeral <= 0) continue;

    const atual = melhores.get(registro.colaboradorId);
    const registroMaisNovo = !atual
      || registro.ano > atual.ano
      || (registro.ano === atual.ano && registro.mes > atual.mes);
    if (!atual || registro.totalGeral > atual.totalGeral
      || (registro.totalGeral === atual.totalGeral && registroMaisNovo)) {
      melhores.set(registro.colaboradorId, registro);
    }
  }
  return melhores;
}

export function calcularComparativoMelhorMes(
  totalAtual: number,
  melhorMes: ResumoFaturamentoProfissional | null | undefined
): ComparativoMelhorMes | null {
  if (!melhorMes || melhorMes.totalGeral <= 0) return null;

  const atual = arredondarCentavos(totalAtual);
  const recorde = arredondarCentavos(melhorMes.totalGeral);
  const diferenca = arredondarCentavos(atual - recorde);

  return {
    ...melhorMes,
    totalServicos: arredondarCentavos(melhorMes.totalServicos),
    totalProdutos: arredondarCentavos(melhorMes.totalProdutos),
    totalGeral: recorde,
    percentualDoRecorde: Math.round((atual / recorde) * 100),
    faltaParaRecorde: Math.max(0, arredondarCentavos(-diferenca)),
    valorAcimaDoRecorde: Math.max(0, diferenca),
    novoRecorde: diferenca > 0,
    igualouRecorde: diferenca === 0,
  };
}
