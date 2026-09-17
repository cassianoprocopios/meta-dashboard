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

export function obterCategoriaKeys(quantidade: number): FaturamentoCategoriaKey[] {
  const limite = Math.max(0, Math.min(quantidade, FATURAMENTO_CATEGORIA_KEYS.length));
  return FATURAMENTO_CATEGORIA_KEYS.slice(0, limite);
}

export function obterValoresCategorias(
  linha: LinhaFaturamentoCategorias,
  keys: readonly FaturamentoCategoriaKey[] = FATURAMENTO_CATEGORIA_KEYS
): number[] {
  return keys.map((key) => Number(linha[key] ?? 0));
}

export function somarCategoriasPorColuna(
  linhas: LinhaFaturamentoCategorias[],
  keys: readonly FaturamentoCategoriaKey[] = FATURAMENTO_CATEGORIA_KEYS
): number[] {
  return keys.map((key) => linhas.reduce((soma, linha) => soma + Number(linha[key] ?? 0), 0));
}
