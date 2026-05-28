import { getDb } from "./db";
import { cashbarberAtendimentos } from "../drizzle/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { notifyOwner } from "./_core/notification";

/**
 * Insere atendimentos do CashBarber no banco de dados
 */
export async function inserirAtendimentos(
  tenantId: number,
  empresaSlug: string,
  atendimentos: Array<{
    clienteId: string;
    clienteNome: string;
    profissionalId?: string;
    profissionalNome?: string;
    servicoTipo?: string;
    valor: number;
    dataAtendimento: string;
    horaAtendimento?: string;
  }>
): Promise<{ sucesso: boolean; inseridos: number; erro?: string }> {
  try {
    const db = await getDb();
    if (!db) return { sucesso: false, inseridos: 0, erro: "Database not available" };

    const hoje = new Date();
    const mes = hoje.getMonth() + 1;
    const ano = hoje.getFullYear();

    const dados = atendimentos.map((a) => ({
      tenantId,
      empresaSlug,
      clienteId: a.clienteId,
      clienteNome: a.clienteNome,
      profissionalId: a.profissionalId,
      profissionalNome: a.profissionalNome,
      servicoTipo: a.servicoTipo,
      valor: a.valor.toString(),
      dataAtendimento: a.dataAtendimento,
      horaAtendimento: a.horaAtendimento,
      status: "concluido",
      mes,
      ano,
    }));

    await db.insert(cashbarberAtendimentos).values(dados as any);

    return { sucesso: true, inseridos: dados.length };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[CashBarber Atendimentos] Erro ao inserir:`, msg);
    return { sucesso: false, inseridos: 0, erro: msg };
  }
}

/**
 * Gera relatório de clientes atendidos por período
 */
export async function gerarRelatorioClientesAtendidos(
  tenantId: number,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  totalClientes: number;
  totalAtendimentos: number;
  faturamentoTotal: number;
  clientesPorDia: Record<string, number>;
  atendimentosPorProfissional: Record<string, number>;
  faturamentoPorProfissional: Record<string, number>;
}> {
  try {
    const db = await getDb();
    if (!db) {
      return {
        totalClientes: 0,
        totalAtendimentos: 0,
        faturamentoTotal: 0,
        clientesPorDia: {},
        atendimentosPorProfissional: {},
        faturamentoPorProfissional: {},
      };
    }

    // Buscar atendimentos no período
    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
          gte(cashbarberAtendimentos.dataAtendimento, dataInicio as any),
          lte(cashbarberAtendimentos.dataAtendimento, dataFim as any)
        )
      );

    // Calcular métricas
    const clientesUnicos = new Set<string>();
    const clientesPorDia: Record<string, number> = {};
    const atendimentosPorProfissional: Record<string, number> = {};
    const faturamentoPorProfissional: Record<string, number> = {};
    let faturamentoTotal = 0;

    atendimentos.forEach((a: any) => {
      clientesUnicos.add(a.clienteId);

      // Clientes por dia
      const dia = a.dataAtendimento;
      clientesPorDia[dia] = (clientesPorDia[dia] || 0) + 1;

      // Atendimentos por profissional
      if (a.profissionalNome) {
        atendimentosPorProfissional[a.profissionalNome] = (atendimentosPorProfissional[a.profissionalNome] || 0) + 1;
        const valor = parseFloat(a.valor.toString());
        faturamentoPorProfissional[a.profissionalNome] = (faturamentoPorProfissional[a.profissionalNome] || 0) + valor;
      }

      // Faturamento total
      faturamentoTotal += parseFloat(a.valor.toString());
    });

    return {
      totalClientes: clientesUnicos.size,
      totalAtendimentos: atendimentos.length,
      faturamentoTotal,
      clientesPorDia,
      atendimentosPorProfissional,
      faturamentoPorProfissional,
    };
  } catch (error) {
    console.error("[CashBarber Atendimentos] Erro ao gerar relatório:", error);
    return {
      totalClientes: 0,
      totalAtendimentos: 0,
      faturamentoTotal: 0,
      clientesPorDia: {},
      atendimentosPorProfissional: {},
      faturamentoPorProfissional: {},
    };
  }
}

/**
 * Limpar atendimentos antigos (mais de 6 meses)
 */
export async function limparAtendimentosAntigos(tenantId: number): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;

    const dataLimite = new Date();
    dataLimite.setMonth(dataLimite.getMonth() - 6);
    const dataLimiteStr = dataLimite.toISOString().split("T")[0];

    const resultado = await db
      .delete(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          lte(cashbarberAtendimentos.createdAt, dataLimite as any)
        )
      );

    return 0; // Retorna 0 pois não temos rowsAffected
  } catch (error) {
    console.error("[CashBarber Atendimentos] Erro ao limpar atendimentos antigos:", error);
    return 0;
  }
}
