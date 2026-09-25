export interface CashbarberClienteRelatorio09 {
  id?: number | string | null;
  cli_name?: string | null;
}

export interface CashbarberRelatorio09 {
  cliente_com_clube?: string[];
  cliente_sem_clube?: string[];
  clientes_totais?: CashbarberClienteRelatorio09[];
}

export interface ResumoClientesCashbarber {
  totalClientes: number;
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

/**
 * Resume o Relatório 09 oficial do CashBarber sem persistir dados pessoais.
 * `clientes_totais` é a fonte principal porque já representa os clientes distintos
 * do período e evita somar duas vezes quem aparece com e sem clube.
 */
export function resumirClientesRelatorio09(
  relatorio: CashbarberRelatorio09
): ResumoClientesCashbarber {
  const chavesTotais = new Set(
    (relatorio.clientes_totais ?? [])
      .map((cliente) => {
        const id = cliente.id;
        if (id !== null && id !== undefined && String(id).trim()) return `id:${String(id)}`;
        const nome = chaveTexto(cliente.cli_name);
        return nome ? `nome:${nome}` : "";
      })
      .filter(Boolean)
  );

  const clientesComClube = contarTextosDistintos(relatorio.cliente_com_clube);
  const clientesSemClube = contarTextosDistintos(relatorio.cliente_sem_clube);

  // Compatibilidade defensiva caso a API deixe de enviar `clientes_totais`.
  const totalFallback = new Set([
    ...(relatorio.cliente_com_clube ?? []).map(chaveTexto),
    ...(relatorio.cliente_sem_clube ?? []).map(chaveTexto),
  ].filter(Boolean)).size;

  return {
    totalClientes: chavesTotais.size || totalFallback,
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
