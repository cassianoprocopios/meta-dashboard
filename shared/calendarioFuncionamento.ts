const DIAS_FECHADOS_PADRAO = new Set([0]);
const DIAS_FECHADOS_SERAPHINE = new Set([0, 1]);

export function obterDiasFechadosDaUnidade(empresaSlug: string) {
  const slugNormalizado = empresaSlug.trim().toLowerCase();
  return slugNormalizado.includes("seraphine")
    ? DIAS_FECHADOS_SERAPHINE
    : DIAS_FECHADOS_PADRAO;
}

export function contarDiasFuncionamentoNoIntervalo(params: {
  empresaSlug: string;
  ano: number;
  mes: number;
  diaInicial: number;
  diaFinal: number;
}) {
  const { empresaSlug, ano, mes } = params;
  const totalDiasMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaInicial = Math.max(1, Math.ceil(params.diaInicial));
  const diaFinal = Math.min(totalDiasMes, Math.floor(params.diaFinal));

  if (diaInicial > diaFinal) return 0;

  const diasFechados = obterDiasFechadosDaUnidade(empresaSlug);
  let diasFuncionamento = 0;

  for (let dia = diaInicial; dia <= diaFinal; dia += 1) {
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
    if (!diasFechados.has(diaSemana)) diasFuncionamento += 1;
  }

  return diasFuncionamento;
}

export function calcularIndicadoresDiasRestantes(params: {
  totalRealizado: number;
  metaMensal: number;
  mediaDiaria: number;
  diasRestantes: number;
}) {
  const { totalRealizado, metaMensal, mediaDiaria } = params;
  const diasRestantes = Math.max(0, Math.floor(params.diasRestantes));
  const faltaMensal = Math.max(0, metaMensal - totalRealizado);

  return {
    faltaMensal,
    metaDiariaNecessaria: diasRestantes > 0 ? faltaMensal / diasRestantes : 0,
    projecaoFinal: totalRealizado + mediaDiaria * diasRestantes,
  };
}
