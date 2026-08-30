export type FaixaMensalBonificacao = "mensal" | "super_meta";

export interface CalcularBonificacaoParams {
  totalQuinzenal: number;
  totalMensal: number;
  metaQuinzenal: number;
  metaMensal: number;
  superMeta: number;
  pctQuinzenalSemMeta: number;
  pctQuinzenalComMeta: number;
  pctMensalSemMeta: number;
  pctMensalComMeta: number;
  pctSuperMeta: number;
  atingiuMetaQuinzenalOverride?: boolean;
}

function arredondarCentavos(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Calcula a bonificação com faixas mensais mutuamente exclusivas.
 * A Super Meta substitui integralmente a bonificação Mensal quando atingida.
 */
export function calcularBonificacaoSubstitutiva(params: CalcularBonificacaoParams) {
  const atingiuMetaQuinzenal = params.atingiuMetaQuinzenalOverride
    ?? (params.metaQuinzenal > 0 && params.totalQuinzenal >= params.metaQuinzenal);
  const atingiuMetaMensal = params.metaMensal > 0 && params.totalMensal >= params.metaMensal;
  const atingiuSuperMeta = params.superMeta > 0 && params.totalMensal >= params.superMeta;

  const pctQuinzenalAplicado = atingiuMetaQuinzenal
    ? params.pctQuinzenalComMeta
    : params.pctQuinzenalSemMeta;
  const pctMensalAplicado = atingiuMetaMensal
    ? params.pctMensalComMeta
    : params.pctMensalSemMeta;

  const valorQuinzenal = params.metaQuinzenal > 0
    ? arredondarCentavos((params.totalQuinzenal * pctQuinzenalAplicado) / 100)
    : 0;
  const valorMensalPotencial = params.metaMensal > 0
    ? arredondarCentavos((params.totalMensal * pctMensalAplicado) / 100)
    : 0;
  const valorSuperMeta = atingiuSuperMeta
    ? arredondarCentavos((params.totalMensal * params.pctSuperMeta) / 100)
    : 0;

  const mensalSubstituida = atingiuSuperMeta;
  const valorMensal = mensalSubstituida ? 0 : valorMensalPotencial;
  const totalPago = arredondarCentavos(valorQuinzenal + valorMensal + valorSuperMeta);

  return {
    atingiuMetaQuinzenal,
    atingiuMetaMensal,
    atingiuSuperMeta,
    faixaMensalAtiva: (mensalSubstituida ? "super_meta" : "mensal") as FaixaMensalBonificacao,
    mensalSubstituida,
    pctQuinzenalAplicado,
    pctMensalAplicado,
    pctSuperMetaAplicado: atingiuSuperMeta ? params.pctSuperMeta : 0,
    valorQuinzenal,
    valorMensal,
    valorMensalPotencial,
    valorSuperMeta,
    totalPago,
  };
}
