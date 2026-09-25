import { and, between, eq } from "drizzle-orm";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { normalizarSlugUnidadeCashbarber } from "../shared/clientesCashbarber";
import { getDb, listCashbarberClientesMensaisPeriodo } from "./db";

function obterTotalResumo(
  resumos: Awaited<ReturnType<typeof listCashbarberClientesMensaisPeriodo>>,
  empresaSlug?: string
): number | null {
  if (resumos.length === 0) return null;

  if (empresaSlug) {
    const unidade = normalizarSlugUnidadeCashbarber(empresaSlug);
    return resumos.find(
      (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
    )?.totalClientes ?? 0;
  }

  const consolidado = resumos.find((item) => item.empresaSlug === "barbiero-grupo");
  if (consolidado) return consolidado.totalClientes;
  return resumos
    .filter((item) => item.empresaSlug !== "barbiero-grupo")
    .reduce((total, item) => total + item.totalClientes, 0);
}

/**
 * Obtém evolução de clientes dos últimos 3 meses.
 * Prioriza o Relatório 09 oficial e usa o legado somente em períodos ainda não migrados.
 */
export async function obterClientesEvolucaoUltimos3Meses(
  tenantId: number,
  empresaSlug?: string
) {
  try {
    const db = await getDb();
    if (!db) return [];

    const hoje = new Date();
    const resultado = [];

    for (let i = 2; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mes = data.getMonth() + 1;
      const ano = data.getFullYear();
      const resumos = await listCashbarberClientesMensaisPeriodo(tenantId, mes, ano);
      const totalOficial = obterTotalResumo(resumos, empresaSlug);

      let totalClientes: number;
      let fonte: "cashbarber_relatorio09" | "legado";
      let sincronizadoEm: Date | null = null;

      if (totalOficial !== null) {
        totalClientes = totalOficial;
        fonte = "cashbarber_relatorio09";
        const unidade = empresaSlug ? normalizarSlugUnidadeCashbarber(empresaSlug) : null;
        const resumoFonte = unidade
          ? resumos.find((item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade)
          : resumos.find((item) => item.empresaSlug === "barbiero-grupo");
        sincronizadoEm = resumoFonte?.sincronizadoEm ?? null;
      } else {
        const primeiroDia = new Date(ano, mes - 1, 1);
        const ultimoDia = new Date(ano, mes, 0);
        const condicoes = [
          eq(cashbarberAtendimentos.tenantId, tenantId),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDia, ultimoDia),
        ];
        if (empresaSlug) condicoes.push(eq(cashbarberAtendimentos.empresaSlug, empresaSlug));
        const atendimentos = await db
          .select()
          .from(cashbarberAtendimentos)
          .where(and(...condicoes));
        totalClientes = new Set((atendimentos as any[]).map((item) => item.clienteId)).size;
        fonte = "legado";
      }

      resultado.push({
        mes,
        ano,
        mesLabel: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        totalClientes,
        porProfissional: {},
        fonte,
        sincronizadoEm,
      });
    }

    return resultado;
  } catch (erro) {
    console.error("[ClientesEvolucao] Erro ao obter evolução:", erro);
    return [];
  }
}

/** Obtém clientes por profissional para os relatórios detalhados legados. */
export async function obterClientesPorProfissional(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number,
  profissionalNome?: string
) {
  try {
    const db = await getDb();
    if (!db) return [];

    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);
    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(and(
        eq(cashbarberAtendimentos.tenantId, tenantId),
        eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDia, ultimoDia)
      ));

    const profissionais = new Map<
      string,
      { clientes: Set<string>; totalAtendimentos: number; faturamento: number }
    >();
    for (const atendimento of atendimentos as any[]) {
      const profissional = atendimento.profissionalNome || "Sem profissional";
      if (profissionalNome && profissional !== profissionalNome) continue;
      if (!profissionais.has(profissional)) {
        profissionais.set(profissional, {
          clientes: new Set(),
          totalAtendimentos: 0,
          faturamento: 0,
        });
      }
      const dados = profissionais.get(profissional)!;
      dados.clientes.add(atendimento.clienteId);
      dados.totalAtendimentos++;
      dados.faturamento += parseFloat(String(atendimento.valor || 0));
    }

    return Array.from(profissionais.entries())
      .map(([profissional, dados]) => ({
        profissional,
        clientesUnicos: dados.clientes.size,
        totalAtendimentos: dados.totalAtendimentos,
        faturamento: dados.faturamento,
      }))
      .sort((a, b) => b.clientesUnicos - a.clientesUnicos);
  } catch (erro) {
    console.error("[ClientesEvolucao] Erro ao obter clientes por profissional:", erro);
    return [];
  }
}
