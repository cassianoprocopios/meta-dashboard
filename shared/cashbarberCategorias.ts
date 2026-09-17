export type TipoCategoriaCashBarber = "servico" | "produto";

export function empresaUsaCashBarber(tipoCategorias: string | null | undefined): boolean {
  return tipoCategorias !== "seraphine";
}

function normalizar(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Destinos fixos das categorias conhecidas do CashBarber.
 * cat9 é reservado exclusivamente à Recorrência/Dpote.
 */
export function destinoCategoriaCashBarber(
  nome: string,
  tipo: TipoCategoriaCashBarber
): string | null {
  const categoria = normalizar(nome);

  if (tipo === "servico") {
    if (categoria === "auxiliar") return "cat3";
    if (categoria === "avulso/clube") return "cat1";
    if (categoria === "estetica") return "cat11";
    if (categoria === "pacote") return "cat10";
    if (categoria === "servico extra") return "cat2";
    return null;
  }

  if (categoria === "bar") return "cat8";
  if (categoria === "barbiero") return "cat7";
  if (categoria === "caixinha") return "cat6";
  if (categoria === "keune") return "cat4";
  if (categoria === "oleo essencial") return "cat12";
  if (categoria === "don alcides") return "cat5";
  return null;
}

export const CATEGORIAS_PADRAO_META = [
  "Avulso/Clube",
  "Serv. Extra",
  "Auxiliar",
  "Keune",
  "Don Alcides",
  "Caixinha",
  "Barbiero",
  "Bar",
  "Recorrência",
  "Pacote",
  "Estética",
  "Óleo Essencial",
] as const;
