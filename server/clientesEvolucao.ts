import { and, between, eq } from "drizzle-orm";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { normalizarSlugUnidadeCashbarber } from "../shared/clientesCashbarber";
import { getDb, listCashbarberClientesMensaisPeriodo } from "./db";

type ResumosPeriodo = Awaited<ReturnType<typeof listCashbarberClientesMensaisPeriodo>>;
type ResumoPeriodo = ResumosPeriodo[number];

interface ComposicaoClientes {
  totalClientes: number;
  clientesNovos: number;
  clientesRecorrentes: number;
  composicaoDisponivel: boolean;
}

function composicaoResumo(item?: ResumoPeriodo): ComposicaoClientes {
  if (!item) {
    return {
      totalClientes: 0,
      clientesNovos: 0,
      clientesRecorrentes: 0,
      composicaoDisponivel: false,
    };
  }

  const clientesNovos = item.clientesNovos ?? 0;
  const clientesRecorrentes = item.clientesRecorrentes ?? 0;
  return {
    totalClientes: item.totalClientes,
    clientesNovos,
    clientesRecorrentes,
    composicaoDisponivel:
      item.totalClientes === 0 || clientesNovos + clientesRecorrentes === item.totalClientes,
  };
}

function buscarResumoUnidade(resumos: ResumosPeriodo, unidade: "MORUMBI" | "MASCOTE") {
  return resumos.find(
    (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
  );
}

function composicaoConsolidada(resumos: ResumosPeriodo): ComposicaoClientes | null {
  if (resumos.length === 0) return null;
  const consolidado = resumos.find((item) => item.empresaSlug === "barbiero-grupo");
  if (consolidado) return composicaoResumo(consolidado);

  const unidades = resumos.filter((item) => item.empresaSlug !== "barbiero-grupo");
  return {
    totalClientes: unidades.reduce((total, item) => total + item.totalClientes, 0),
    clientesNovos: unidades.reduce((total, item) => total + (item.clientesNovos ?? 0), 0),
    clientesRecorrentes: unidades.reduce(
      (total, item) => total + (item.clientesRecorrentes ?? 0),
      0
    ),
    composicaoDisponivel: unidades.every(
      (item) =>
        item.totalClientes === 0 ||
        (item.clientesNovos ?? 0) + (item.clientesRecorrentes ?? 0) === item.totalClientes
    ),
  };
}

/**
 * Obtém evolução de clientes dos últimos 3 meses.
 * Retorna o consolidado e Morumbi/Mascote na mesma consulta para permitir filtros
 * instantâneos no gráfico, sempre priorizando o Relatório 09 oficial.
 */
export async function obterClientesEvolucaoUltimos3Meses(tenantId: number) {
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
      const oficial = composicaoConsolidada(resumos);

      if (oficial) {
        const morumbi = composicaoResumo(buscarResumoUnidade(resumos, "MORUMBI"));
        const mascote = composicaoResumo(buscarResumoUnidade(resumos, "MASCOTE"));
        const resumoFonte = resumos.find((item) => item.empresaSlug === "barbiero-grupo");

        resultado.push({
          mes,
          ano,
          mesLabel: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
          ...oficial,
          porUnidade: { MORUMBI: morumbi, MASCOTE: mascote },
          porProfissional: {},
          fonte: "cashbarber_relatorio09" as const,
          sincronizadoEm: resumoFonte?.sincronizadoEm ?? null,
        });
        continue;
      }

      // Fallback somente para períodos antigos ainda não migrados ao Relatório 09.
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);
      const atendimentos = await db
        .select()
        .from(cashbarberAtendimentos)
        .where(and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDia, ultimoDia)
        ));
      const idsConsolidados = new Set<string>();
      const idsPorUnidade = {
        MORUMBI: new Set<string>(),
        MASCOTE: new Set<string>(),
      };
      for (const atendimento of atendimentos as any[]) {
        idsConsolidados.add(atendimento.clienteId);
        const unidade = normalizarSlugUnidadeCashbarber(atendimento.empresaSlug);
        if (unidade === "MORUMBI" || unidade === "MASCOTE") {
          idsPorUnidade[unidade].add(atendimento.clienteId);
        }
      }
      const semComposicao = (totalClientes: number): ComposicaoClientes => ({
        totalClientes,
        clientesNovos: 0,
        clientesRecorrentes: 0,
        composicaoDisponivel: false,
      });

      resultado.push({
        mes,
        ano,
        mesLabel: data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }),
        ...semComposicao(idsConsolidados.size),
        porUnidade: {
          MORUMBI: semComposicao(idsPorUnidade.MORUMBI.size),
          MASCOTE: semComposicao(idsPorUnidade.MASCOTE.size),
        },
        porProfissional: {},
        fonte: "legado" as const,
        sincronizadoEm: null,
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
