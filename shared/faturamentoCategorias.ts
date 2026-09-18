export const FATURAMENTO_CATEGORIA_KEYS = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "cat6",
  "cat7",
  "cat8",
  "cat9",
  "cat10",
  "cat11",
  "cat12",
] as const;

export type FaturamentoCategoriaKey = (typeof FATURAMENTO_CATEGORIA_KEYS)[number];
export type LinhaFaturamentoCategorias = Partial<Record<FaturamentoCategoriaKey, string | number | null>>;

function valorNumerico(valor: string | number | null | undefined): number {
  const numero = Number(valor ?? 0);
  return Number.isFinite(numero) ? numero : 0;
}

/**
 * Categorias operacionais que compõem o faturamento da unidade.
 * Inclui os destinos adicionados depois da estrutura original: Pacote,
 * Estética e Óleo Essencial.
 */
export const FATURAMENTO_OPERACIONAL_KEYS = [
  "cat1",
  "cat2",
  "cat3",
  "cat4",
  "cat5",
  "cat6",
  "cat7",
  "cat8",
  "cat10",
  "cat11",
  "cat12",
] as const satisfies readonly FaturamentoCategoriaKey[];

/** Faturamento completo: categorias operacionais mais Recorrência. */
export const FATURAMENTO_TOTAL_KEYS = [
  ...FATURAMENTO_OPERACIONAL_KEYS,
  "cat9",
] as const satisfies readonly FaturamentoCategoriaKey[];

export function obterCategoriaKeys(quantidade: number): FaturamentoCategoriaKey[] {
  const limite = Math.max(0, Math.min(quantidade, FATURAMENTO_CATEGORIA_KEYS.length));
  return FATURAMENTO_CATEGORIA_KEYS.slice(0, limite);
}

export function obterValoresCategorias(
  linha: LinhaFaturamentoCategorias,
  keys: readonly FaturamentoCategoriaKey[] = FATURAMENTO_CATEGORIA_KEYS
): number[] {
  return keys.map((key) => valorNumerico(linha[key]));
}

export function somarCategoriasPorColuna(
  linhas: LinhaFaturamentoCategorias[],
  keys: readonly FaturamentoCategoriaKey[] = FATURAMENTO_CATEGORIA_KEYS
): number[] {
  return keys.map((key) => linhas.reduce((soma, linha) => soma + valorNumerico(linha[key]), 0));
}

export function somarFaturamentoOperacional(linha: LinhaFaturamentoCategorias): number {
  return obterValoresCategorias(linha, FATURAMENTO_OPERACIONAL_KEYS)
    .reduce((soma, valor) => soma + valor, 0);
}

export function somarFaturamentoTotal(linha: LinhaFaturamentoCategorias): number {
  return obterValoresCategorias(linha, FATURAMENTO_TOTAL_KEYS)
    .reduce((soma, valor) => soma + valor, 0);
}
