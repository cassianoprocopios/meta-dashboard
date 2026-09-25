import { and, between, eq } from "drizzle-orm";
import {
  getDb,
  listCashbarberClientesMensaisPeriodo,
} from "./db";
import { normalizarSlugUnidadeCashbarber } from "../shared/clientesCashbarber";

function calcularVariacao(atual: number, anterior: number): number {
  const variacao = anterior === 0
    ? (atual > 0 ? 100 : 0)
    : ((atual - anterior) / anterior) * 100;
  return Math.round(variacao * 100) / 100;
}

function periodoAnterior(mes: number, ano: number) {
  return mes === 1
    ? { mes: 12, ano: ano - 1 }
    : { mes: mes - 1, ano };
}

export interface ClientesUnidadeResumo {
  atual: number;
  anterior: number;
  variacao: number;
  totalClientes: number;
  variacaoPercentual: number;
}

export interface ClientesConsolidadoResumo {
  totalClientesUnicos: number;
  clientesAnterior: number;
  porUnidade: Record<string, ClientesUnidadeResumo>;
  variacao: number;
  fonte?: "cashbarber_relatorio09" | "legado";
  sincronizadoEm?: Date | null;
}

/**
 * Obtém estatísticas de clientes atendidos para uma unidade e período.
 * Prioriza os totais oficiais do Relatório 09 do CashBarber.
 */
export async function obterClientesAtendidosStats(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number
) {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalClientesUnicos: 0,
        clientesPorProfissional: {},
        variacao: 0,
        clientesAnterior: 0,
      };
    }

    const anterior = periodoAnterior(mes, ano);
    const [resumosAtual, resumosAnterior] = await Promise.all([
      listCashbarberClientesMensaisPeriodo(tenantId, mes, ano),
      listCashbarberClientesMensaisPeriodo(tenantId, anterior.mes, anterior.ano),
    ]);
    const unidade = normalizarSlugUnidadeCashbarber(empresaSlug);
    const resumoAtual = resumosAtual.find(
      (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
    );
    const resumoAnterior = resumosAnterior.find(
      (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
    );

    if (resumoAtual || resumoAnterior) {
      const totalAtual = resumoAtual?.totalClientes ?? 0;
      const totalAnterior = resumoAnterior?.totalClientes ?? 0;
      return {
        totalClientesUnicos: totalAtual,
        clientesPorProfissional: {},
        variacao: calcularVariacao(totalAtual, totalAnterior),
        clientesAnterior: totalAnterior,
        fonte: "cashbarber_relatorio09" as const,
        sincronizadoEm: resumoAtual?.sincronizadoEm ?? null,
      };
    }

    // Fallback para períodos antigos que ainda não foram migrados ao Relatório 09.
    const { cashbarberAtendimentos } = await import("../drizzle/schema");
    const primeiroDiaAtual = new Date(ano, mes - 1, 1);
    const ultimoDiaAtual = new Date(ano, mes, 0);
    const primeiroDiaAnterior = new Date(anterior.ano, anterior.mes - 1, 1);
    const ultimoDiaAnterior = new Date(anterior.ano, anterior.mes, 0);

    const [atendimentosAtual, atendimentosAnterior] = await Promise.all([
      db.select().from(cashbarberAtendimentos).where(and(
        eq(cashbarberAtendimentos.tenantId, tenantId),
        eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAtual, ultimoDiaAtual)
      )),
      db.select().from(cashbarberAtendimentos).where(and(
        eq(cashbarberAtendimentos.tenantId, tenantId),
        eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAnterior, ultimoDiaAnterior)
      )),
    ]);

    const clientesUnicos = new Set<string>();
    const clientesPorProfissional = new Map<string, Set<string>>();
    for (const atendimento of atendimentosAtual as any[]) {
      clientesUnicos.add(atendimento.clienteId);
      const profissional = atendimento.profissionalNome || "Sem profissional";
      if (!clientesPorProfissional.has(profissional)) {
        clientesPorProfissional.set(profissional, new Set());
      }
      clientesPorProfissional.get(profissional)!.add(atendimento.clienteId);
    }
    const clientesUnicosAnterior = new Set(
      (atendimentosAnterior as any[]).map((atendimento) => atendimento.clienteId)
    );
    const clientesPorProfissionalObj: Record<string, number> = {};
    clientesPorProfissional.forEach((clientes, profissional) => {
      clientesPorProfissionalObj[profissional] = clientes.size;
    });

    return {
      totalClientesUnicos: clientesUnicos.size,
      clientesPorProfissional: clientesPorProfissionalObj,
      variacao: calcularVariacao(clientesUnicos.size, clientesUnicosAnterior.size),
      clientesAnterior: clientesUnicosAnterior.size,
      fonte: "legado" as const,
      sincronizadoEm: null,
    };
  } catch (erro) {
    console.error("[ClientesAtendidos] Erro ao obter estatísticas:", erro);
    return {
      totalClientesUnicos: 0,
      clientesPorProfissional: {},
      variacao: 0,
      clientesAnterior: 0,
    };
  }
}

/**
 * Obtém estatísticas consolidadas. O total do grupo vem de uma consulta sem
 * filtro de filial, evitando duplicidade de clientes que visitaram duas unidades.
 */
export async function obterClientesAtendidosConsolidado(
  tenantId: number,
  mes: number,
  ano: number
): Promise<ClientesConsolidadoResumo> {
  try {
    const db = await getDb();
    if (!db) return { totalClientesUnicos: 0, clientesAnterior: 0, porUnidade: {}, variacao: 0 };

    const anterior = periodoAnterior(mes, ano);
    const [resumosAtual, resumosAnterior] = await Promise.all([
      listCashbarberClientesMensaisPeriodo(tenantId, mes, ano),
      listCashbarberClientesMensaisPeriodo(tenantId, anterior.mes, anterior.ano),
    ]);

    if (resumosAtual.length > 0 || resumosAnterior.length > 0) {
      const atuais = resumosAtual.filter((item) => item.empresaSlug !== "barbiero-grupo");
      const anteriores = resumosAnterior.filter((item) => item.empresaSlug !== "barbiero-grupo");
      const unidades = new Set([
        ...atuais.map((item) => normalizarSlugUnidadeCashbarber(item.empresaSlug)),
        ...anteriores.map((item) => normalizarSlugUnidadeCashbarber(item.empresaSlug)),
      ]);
      const porUnidade: Record<string, ClientesUnidadeResumo> = {};

      for (const unidade of Array.from(unidades)) {
        const atual = atuais.find(
          (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
        )?.totalClientes ?? 0;
        const valorAnterior = anteriores.find(
          (item) => normalizarSlugUnidadeCashbarber(item.empresaSlug) === unidade
        )?.totalClientes ?? 0;
        const variacao = calcularVariacao(atual, valorAnterior);
        porUnidade[unidade] = {
          atual,
          anterior: valorAnterior,
          variacao,
          totalClientes: atual,
          variacaoPercentual: variacao,
        };
      }

      const consolidadoAtual = resumosAtual.find((item) => item.empresaSlug === "barbiero-grupo");
      const consolidadoAnterior = resumosAnterior.find((item) => item.empresaSlug === "barbiero-grupo");
      const totalAtual = consolidadoAtual?.totalClientes
        ?? atuais.reduce((total, item) => total + item.totalClientes, 0);
      const totalAnterior = consolidadoAnterior?.totalClientes
        ?? anteriores.reduce((total, item) => total + item.totalClientes, 0);

      return {
        totalClientesUnicos: totalAtual,
        clientesAnterior: totalAnterior,
        porUnidade,
        variacao: calcularVariacao(totalAtual, totalAnterior),
        fonte: "cashbarber_relatorio09" as const,
        sincronizadoEm: consolidadoAtual?.sincronizadoEm ?? null,
      };
    }

    // Fallback legado para períodos não sincronizados.
    const { cashbarberAtendimentos } = await import("../drizzle/schema");
    const primeiroDiaAtual = new Date(ano, mes - 1, 1);
    const ultimoDiaAtual = new Date(ano, mes, 0);
    const primeiroDiaAnterior = new Date(anterior.ano, anterior.mes - 1, 1);
    const ultimoDiaAnterior = new Date(anterior.ano, anterior.mes, 0);
    const [atendimentosAtual, atendimentosAnterior] = await Promise.all([
      db.select().from(cashbarberAtendimentos).where(and(
        eq(cashbarberAtendimentos.tenantId, tenantId),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAtual, ultimoDiaAtual)
      )),
      db.select().from(cashbarberAtendimentos).where(and(
        eq(cashbarberAtendimentos.tenantId, tenantId),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAnterior, ultimoDiaAnterior)
      )),
    ]);

    const atuais = new Map<string, Set<string>>();
    const anteriores = new Map<string, Set<string>>();
    for (const atendimento of atendimentosAtual as any[]) {
      const unidade = normalizarSlugUnidadeCashbarber(atendimento.empresaSlug);
      if (!atuais.has(unidade)) atuais.set(unidade, new Set());
      atuais.get(unidade)!.add(atendimento.clienteId);
    }
    for (const atendimento of atendimentosAnterior as any[]) {
      const unidade = normalizarSlugUnidadeCashbarber(atendimento.empresaSlug);
      if (!anteriores.has(unidade)) anteriores.set(unidade, new Set());
      anteriores.get(unidade)!.add(atendimento.clienteId);
    }

    const porUnidade: Record<string, ClientesUnidadeResumo> = {};
    const unidades = new Set([
      ...Array.from(atuais.keys()),
      ...Array.from(anteriores.keys()),
    ]);
    for (const unidade of Array.from(unidades)) {
      const atual = atuais.get(unidade)?.size ?? 0;
      const valorAnterior = anteriores.get(unidade)?.size ?? 0;
      const variacao = calcularVariacao(atual, valorAnterior);
      porUnidade[unidade] = {
        atual,
        anterior: valorAnterior,
        variacao,
        totalClientes: atual,
        variacaoPercentual: variacao,
      };
    }

    const idsAtual = new Set((atendimentosAtual as any[]).map((item) => item.clienteId));
    const idsAnterior = new Set((atendimentosAnterior as any[]).map((item) => item.clienteId));
    return {
      totalClientesUnicos: idsAtual.size,
      clientesAnterior: idsAnterior.size,
      porUnidade,
      variacao: calcularVariacao(idsAtual.size, idsAnterior.size),
      fonte: "legado" as const,
      sincronizadoEm: null,
    };
  } catch (erro) {
    console.error("[ClientesAtendidos] Erro ao obter consolidado:", erro);
    return { totalClientesUnicos: 0, clientesAnterior: 0, porUnidade: {}, variacao: 0 };
  }
}
