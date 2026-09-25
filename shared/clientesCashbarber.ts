export interface CashbarberClienteRelatorio09 {
  id?: number | string | null;
  cli_name?: string | null;
  created_at?: string | Date | null;
}

export interface CashbarberRelatorio09 {
  cliente_com_clube?: string[];
  cliente_sem_clube?: string[];
  clientes_totais?: CashbarberClienteRelatorio09[];
}

export interface PeriodoClientesCashbarber {
  dataInicial: string;
  dataFinal: string;
}

export interface ResumoClientesCashbarber {
  totalClientes: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  clientesComClube: number;
  clientesSemClube: number;
}

function chaveTexto(valor: unknown): string {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function contarTextosDistintos(valores: string[] | undefined): number {
  return new Set((valores ?? []).map(chaveTexto).filter(Boolean)).size;
}

function chaveCliente(cliente: CashbarberClienteRelatorio09): string {
  const id = cliente.id;
  if (id !== null && id !== undefined && String(id).trim()) {
    return `id:${String(id)}`;
  }
  const nome = chaveTexto(cliente.cli_name);
  return nome ? `nome:${nome}` : "";
}

function limitesPeriodoBrasil(periodo: PeriodoClientesCashbarber) {
  const inicio = new Date(`${periodo.dataInicial}T00:00:00-03:00`);
  const fimInclusivo = new Date(`${periodo.dataFinal}T00:00:00-03:00`);
  const fimExclusivo = new Date(fimInclusivo);
  fimExclusivo.setUTCDate(fimExclusivo.getUTCDate() + 1);
  return { inicio, fimExclusivo };
}

/**
 * Resume o Relatório 09 oficial do CashBarber sem persistir dados pessoais.
 *
 * Cliente novo: cadastro (`created_at`) criado dentro do período consultado.
 * Cliente recorrente: cliente distinto já cadastrado antes do início do período.
 * A classificação é feita após eliminar IDs duplicados.
 */
export function resumirClientesRelatorio09(
  relatorio: CashbarberRelatorio09,
  periodo?: PeriodoClientesCashbarber
): ResumoClientesCashbarber {
  const clientesUnicos = new Map<string, CashbarberClienteRelatorio09>();
  for (const cliente of relatorio.clientes_totais ?? []) {
    const chave = chaveCliente(cliente);
    if (chave && !clientesUnicos.has(chave)) clientesUnicos.set(chave, cliente);
  }

  const clientesComClube = contarTextosDistintos(relatorio.cliente_com_clube);
  const clientesSemClube = contarTextosDistintos(relatorio.cliente_sem_clube);

  // Compatibilidade defensiva caso a API deixe de enviar `clientes_totais`.
  const totalFallback = new Set([
    ...(relatorio.cliente_com_clube ?? []).map(chaveTexto),
    ...(relatorio.cliente_sem_clube ?? []).map(chaveTexto),
  ].filter(Boolean)).size;

  const totalClientes = clientesUnicos.size || totalFallback;
  let clientesNovos = 0;

  if (periodo && clientesUnicos.size > 0) {
    const { inicio, fimExclusivo } = limitesPeriodoBrasil(periodo);
    for (const cliente of Array.from(clientesUnicos.values())) {
      if (!cliente.created_at) continue;
      const dataCadastro = new Date(cliente.created_at);
      if (
        Number.isFinite(dataCadastro.getTime()) &&
        dataCadastro >= inicio &&
        dataCadastro < fimExclusivo
      ) {
        clientesNovos++;
      }
    }
  }

  return {
    totalClientes,
    clientesNovos,
    clientesRecorrentes: Math.max(0, totalClientes - clientesNovos),
    clientesComClube,
    clientesSemClube,
  };
}

export function normalizarSlugUnidadeCashbarber(slug: string): string {
  const valor = chaveTexto(slug);
  if (valor.includes("morumbi")) return "MORUMBI";
  if (valor.includes("mascote")) return "MASCOTE";
  if (valor.includes("seraphine") || valor.includes("serafine")) return "SERAPHINE";
  return slug.trim().toUpperCase();
}
