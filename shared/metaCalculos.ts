export function calcularVariacaoMetaDiaria(params: {
  metaDiariaOriginal: number;
  metaDiariaAtual: number;
  diasRestantes: number;
}) {
  const { metaDiariaOriginal, metaDiariaAtual } = params;
  if (metaDiariaOriginal <= 0 || params.diasRestantes <= 0) return 0;
  return ((metaDiariaAtual - metaDiariaOriginal) / metaDiariaOriginal) * 100;
}

export function obterDirecaoVariacaoMetaDiaria(variacaoPercentual: number) {
  if (variacaoPercentual > 0.1) return "subiu" as const;
  if (variacaoPercentual < -0.1) return "desceu" as const;
  return "estavel" as const;
}
