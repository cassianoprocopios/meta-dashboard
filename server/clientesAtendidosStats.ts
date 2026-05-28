import { getDb } from "./db";
import { and, between, eq } from "drizzle-orm";

/**
 * Obtém estatísticas de clientes atendidos para um período
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

    const { cashbarberAtendimentos } = await import("../drizzle/schema");

    // Calcular datas do mês atual
    const primeiroDiaAtual = new Date(ano, mes - 1, 1);
    const ultimoDiaAtual = new Date(ano, mes, 0);

    // Calcular datas do mês anterior
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const primeiroDiaAnterior = new Date(anoAnterior, mesAnterior - 1, 1);
    const ultimoDiaAnterior = new Date(anoAnterior, mesAnterior, 0);

    // Buscar atendimentos do mês atual
    const atendimentosAtual = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAtual, ultimoDiaAtual)
        )
      );

    // Buscar atendimentos do mês anterior
    const atendimentosAnterior = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAnterior, ultimoDiaAnterior)
        )
      );

    // Contar clientes únicos do mês atual
    const clientesUnicos = new Set<string>();
    const clientesPorProfissional = new Map<string, Set<string>>();

    atendimentosAtual.forEach((att: any) => {
      clientesUnicos.add(att.clienteId);

      const profNome = att.profissionalNome || "Sem profissional";
      if (!clientesPorProfissional.has(profNome)) {
        clientesPorProfissional.set(profNome, new Set());
      }
      clientesPorProfissional.get(profNome)!.add(att.clienteId);
    });

    // Contar clientes únicos do mês anterior
    const clientesUnicosAnterior = new Set<string>();
    atendimentosAnterior.forEach((att: any) => {
      clientesUnicosAnterior.add(att.clienteId);
    });

    // Calcular variação percentual
    const totalAtual = clientesUnicos.size;
    const totalAnterior = clientesUnicosAnterior.size;
    const variacao =
      totalAnterior === 0
        ? totalAtual > 0
          ? 100
          : 0
        : ((totalAtual - totalAnterior) / totalAnterior) * 100;

    // Converter mapa para objeto
    const clientesPorProfissionalObj: Record<string, number> = {};
    clientesPorProfissional.forEach((clientes, profissional) => {
      clientesPorProfissionalObj[profissional] = clientes.size;
    });

    return {
      totalClientesUnicos: totalAtual,
      clientesPorProfissional: clientesPorProfissionalObj,
      variacao: Math.round(variacao * 100) / 100,
      clientesAnterior: totalAnterior,
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
 * Obtém estatísticas consolidadas de todas as unidades
 */
export async function obterClientesAtendidosConsolidado(
  tenantId: number,
  mes: number,
  ano: number
) {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalClientesUnicos: 0,
        porUnidade: {},
        variacao: 0,
      };
    }

    const { cashbarberAtendimentos } = await import("../drizzle/schema");

    // Calcular datas do mês atual
    const primeiroDiaAtual = new Date(ano, mes - 1, 1);
    const ultimoDiaAtual = new Date(ano, mes, 0);

    // Calcular datas do mês anterior
    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anoAnterior = mes === 1 ? ano - 1 : ano;
    const primeiroDiaAnterior = new Date(anoAnterior, mesAnterior - 1, 1);
    const ultimoDiaAnterior = new Date(anoAnterior, mesAnterior, 0);

    // Buscar atendimentos do mês atual
    const atendimentosAtual = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAtual, ultimoDiaAtual)
        )
      );

    // Buscar atendimentos do mês anterior
    const atendimentosAnterior = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          between(cashbarberAtendimentos.dataAtendimento, primeiroDiaAnterior, ultimoDiaAnterior)
        )
      );

    // Contar clientes únicos por unidade
    const clientesPorUnidade = new Map<string, Set<string>>();
    const clientesPorUnidadeAnterior = new Map<string, Set<string>>();

    atendimentosAtual.forEach((att: any) => {
      const empresa = att.empresaSlug;
      if (!clientesPorUnidade.has(empresa)) {
        clientesPorUnidade.set(empresa, new Set());
      }
      clientesPorUnidade.get(empresa)!.add(att.clienteId);
    });

    atendimentosAnterior.forEach((att: any) => {
      const empresa = att.empresaSlug;
      if (!clientesPorUnidadeAnterior.has(empresa)) {
        clientesPorUnidadeAnterior.set(empresa, new Set());
      }
      clientesPorUnidadeAnterior.get(empresa)!.add(att.clienteId);
    });

    // Calcular totais
    let totalAtual = 0;
    let totalAnterior = 0;

    const porUnidadeObj: Record<string, { atual: number; anterior: number; variacao: number }> =
      {};

    clientesPorUnidade.forEach((clientes, empresa) => {
      const atual = clientes.size;
      const anterior = clientesPorUnidadeAnterior.get(empresa)?.size || 0;
      const variacao =
        anterior === 0 ? (atual > 0 ? 100 : 0) : ((atual - anterior) / anterior) * 100;

      porUnidadeObj[empresa] = {
        atual,
        anterior,
        variacao: Math.round(variacao * 100) / 100,
      };

      totalAtual += atual;
      totalAnterior += anterior;
    });

    // Adicionar unidades que tinham clientes no mês anterior mas não têm agora
    clientesPorUnidadeAnterior.forEach((clientes, empresa) => {
      if (!porUnidadeObj[empresa]) {
        porUnidadeObj[empresa] = {
          atual: 0,
          anterior: clientes.size,
          variacao: -100,
        };
        totalAnterior += clientes.size;
      }
    });

    const variacaoTotal =
      totalAnterior === 0
        ? totalAtual > 0
          ? 100
          : 0
        : ((totalAtual - totalAnterior) / totalAnterior) * 100;

    return {
      totalClientesUnicos: totalAtual,
      porUnidade: porUnidadeObj,
      variacao: Math.round(variacaoTotal * 100) / 100,
    };
  } catch (erro) {
    console.error("[ClientesAtendidos] Erro ao obter consolidado:", erro);
    return {
      totalClientesUnicos: 0,
      porUnidade: {},
      variacao: 0,
    };
  }
}
