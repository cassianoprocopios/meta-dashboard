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
  datasFechamentoExcepcional?: Iterable<string>;
}) {
  const { empresaSlug, ano, mes } = params;
  const totalDiasMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();
  const diaInicial = Math.max(1, Math.ceil(params.diaInicial));
  const diaFinal = Math.min(totalDiasMes, Math.floor(params.diaFinal));

  if (diaInicial > diaFinal) return 0;

  const diasFechados = obterDiasFechadosDaUnidade(empresaSlug);
  const excecoes = new Set(params.datasFechamentoExcepcional ?? []);
  let diasFuncionamento = 0;

  for (let dia = diaInicial; dia <= diaFinal; dia += 1) {
    const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
    const dataIso = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    if (!diasFechados.has(diaSemana) && !excecoes.has(dataIso)) diasFuncionamento += 1;
  }

  return diasFuncionamento;
}

export function obterDiaInicialDiasRestantes(params: {
  ehMesFuturo: boolean;
  ehMesVigente: boolean;
  diaHoje: number;
  totalDiasMes: number;
}) {
  if (params.ehMesFuturo) return 1;
  if (params.ehMesVigente) return params.diaHoje + 1;
  return params.totalDiasMes + 1;
}

export type ViabilidadeNecessidadeDiaria = "atingida" | "realista" | "atencao" | "critica" | "sem_dados";

export function classificarViabilidadeNecessidadeDiaria(params: {
  necessidadeDiaria: number;
  mediaDiaria: number;
}): { status: ViabilidadeNecessidadeDiaria; proporcao: number | null } {
  const { necessidadeDiaria, mediaDiaria } = params;
  if (necessidadeDiaria <= 0) return { status: "atingida", proporcao: 0 };
  if (mediaDiaria <= 0) return { status: "sem_dados", proporcao: null };

  const proporcao = necessidadeDiaria / mediaDiaria;
  if (proporcao <= 1) return { status: "realista", proporcao };
  if (proporcao <= 1.25) return { status: "atencao", proporcao };
  return { status: "critica", proporcao };
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
