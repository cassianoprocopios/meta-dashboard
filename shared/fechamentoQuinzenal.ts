const HORA_FECHAMENTO_UTC = 2;
const MINUTO_FECHAMENTO_UTC = 50;

/**
 * O fechamento ocorre no dia 15 às 23:50 em Brasília (UTC-3),
 * equivalente ao dia 16 às 02:50 UTC.
 */
export function obterInstanteFechamentoQuinzenal(mes: number, ano: number): Date {
  return new Date(Date.UTC(ano, mes - 1, 16, HORA_FECHAMENTO_UTC, MINUTO_FECHAMENTO_UTC, 0));
}

export function podeCongelarQuinzena(params: {
  mes: number;
  ano: number;
  agora?: Date;
}): boolean {
  const agora = params.agora ?? new Date();
  return agora.getTime() >= obterInstanteFechamentoQuinzenal(params.mes, params.ano).getTime();
}

export function snapshotFoiCongeladoPrematuramente(params: {
  mes: number;
  ano: number;
  congeladoEm: Date | string;
}): boolean {
  const congeladoEm = params.congeladoEm instanceof Date
    ? params.congeladoEm
    : new Date(params.congeladoEm);
  return congeladoEm.getTime() < obterInstanteFechamentoQuinzenal(params.mes, params.ano).getTime();
}
