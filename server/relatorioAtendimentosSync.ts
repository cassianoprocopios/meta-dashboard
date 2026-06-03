import { getDb } from "./db";
import { and, between, eq, gte, lte } from "drizzle-orm";

export interface AtendimentoExportacao {
  data: string;
  profissional: string;
  cliente: string;
  servico: string;
  valor: number;
  duracao: number;
}

/**
 * Obtém todos os atendimentos de um período para exportação
 */
export async function obterAtendimentosParaExportacao(
  tenantId: number,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string,
  profissional?: string
): Promise<AtendimentoExportacao[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const { cashbarberAtendimentos } = await import("../drizzle/schema");

    // Converter datas para Date
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    // Adicionar 1 dia ao fim para incluir todo o dia
    fim.setDate(fim.getDate() + 1);

    // Construir condições
    const conditions = [
      eq(cashbarberAtendimentos.tenantId, tenantId),
      eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
      gte(cashbarberAtendimentos.dataAtendimento, inicio),
      lte(cashbarberAtendimentos.dataAtendimento, fim),
    ];

    // Filtrar por profissional se fornecido
    if (profissional) {
      conditions.push(eq(cashbarberAtendimentos.profissionalNome, profissional));
    }



    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(and(...conditions));

    // Mapear para formato de exportação
    return atendimentos.map((att: any) => ({
      data: att.dataAtendimento instanceof Date 
        ? att.dataAtendimento.toLocaleDateString("pt-BR")
        : new Date(att.dataAtendimento).toLocaleDateString("pt-BR"),
      profissional: att.profissionalNome || "Sem profissional",
      cliente: att.clienteNome,
      servico: att.servicoTipo || "Sem descrição",
      valor: parseFloat(att.valor.toString()),
      duracao: att.duracao || 0,
    }));
  } catch (erro) {
    console.error("[RelatorioAtendimentos] Erro ao obter atendimentos:", erro);
    return [];
  }
}

/**
 * Gera relatório consolidado por profissional
 */
export async function obterConsolidadoPorProfissional(
  tenantId: number,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<
  Array<{
    profissional: string;
    totalAtendimentos: number;
    clientesUnicos: number;
    faturamentoTotal: number;
    duracaoTotal: number;
    ticketMedio: number;
    metaMensal?: number;
  }>
> {
  const atendimentos = await obterAtendimentosParaExportacao(
    tenantId,
    empresaSlug,
    dataInicio,
    dataFim
  );

  // Agrupar por profissional
  const porProfissional = new Map<
    string,
    {
      atendimentos: number;
      clientes: Set<string>;
      faturamento: number;
      duracao: number;
    }
  >();

  atendimentos.forEach((att) => {
    const profNome = att.profissional;
    if (!porProfissional.has(profNome)) {
      porProfissional.set(profNome, {
        atendimentos: 0,
        clientes: new Set(),
        faturamento: 0,
        duracao: 0,
      });
    }

    const prof = porProfissional.get(profNome)!
    prof.atendimentos++;
    prof.clientes.add(att.cliente);
    prof.faturamento += att.valor;
    prof.duracao += att.duracao;
  });

  // Buscar metas dos profissionais
  const db = await getDb();
  const mes = new Date(dataInicio).getMonth() + 1;
  const ano = new Date(dataInicio).getFullYear();
  const metasMap = new Map<string, number>();

  if (db) {
    try {
      const { metas: metasTable } = await import("../drizzle/schema");
      const metas = await db
        .select()
        .from(metasTable)
        .where(
          and(
            eq(metasTable.tenantId, tenantId),
            eq(metasTable.empresaSlug, empresaSlug),
            eq(metasTable.mes, mes),
            eq(metasTable.ano, ano)
          )
        );

      metas.forEach((meta: any) => {
        metasMap.set(meta.profissionalNome, meta.metaMensal);
      });
    } catch (err) {
      console.warn("[obterConsolidadoPorProfissional] Erro ao buscar metas:", err);
    }
  }

  // Converter para array ordenado
  return Array.from(porProfissional.entries())
    .map(([nome, dados]) => ({
      profissional: nome,
      totalAtendimentos: dados.atendimentos,
      clientesUnicos: dados.clientes.size,
      faturamentoTotal: parseFloat(dados.faturamento.toString()),
      duracaoTotal: dados.duracao,
      ticketMedio: parseFloat((dados.faturamento / dados.atendimentos).toString()),
      metaMensal: metasMap.get(nome) || 0,
    }))
    .sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
}

/**
 * Gera estatísticas gerais do período
 */
export async function obterEstatisticasPeriodo(
  tenantId: number,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<{
  totalAtendimentos: number;
  clientesUnicos: number;
  faturamentoTotal: number;
  duracaoTotal: number;
  ticketMedio: number;
  profissionaisAtivos: number;
}> {
  const atendimentos = await obterAtendimentosParaExportacao(
    tenantId,
    empresaSlug,
    dataInicio,
    dataFim
  );

  const clientes = new Set<string>();
  const profissionais = new Set<string>();
  let faturamento = 0;
  let duracao = 0;

  atendimentos.forEach((att) => {
    clientes.add(att.cliente);
    profissionais.add(att.profissional);
    faturamento += att.valor;
    duracao += att.duracao;
  });

  return {
    totalAtendimentos: atendimentos.length,
    clientesUnicos: clientes.size,
    faturamentoTotal: faturamento,
    duracaoTotal: duracao,
    ticketMedio: atendimentos.length > 0 ? faturamento / atendimentos.length : 0,
    profissionaisAtivos: profissionais.size,
  };
}
