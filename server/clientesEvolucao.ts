import { getDb } from "./db";
import { and, between, eq } from "drizzle-orm";

export interface ClientesEvolucaoMes {
  mes: number;
  ano: number;
  mesLabel: string;
  totalClientes: number;
  porProfissional: Record<string, number>;
}

/**
 * Obtém evolução de clientes dos últimos 3 meses
 */
export async function obterClientesEvolucaoUltimos3Meses(
  tenantId: number,
  empresaSlug?: string
): Promise<ClientesEvolucaoMes[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    const { cashbarberAtendimentos } = await import("../drizzle/schema");

    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1;
    const anoAtual = hoje.getFullYear();

    // Calcular os 3 últimos meses
    const meses = [];
    for (let i = 2; i >= 0; i--) {
      let mes = mesAtual - i;
      let ano = anoAtual;

      if (mes <= 0) {
        mes += 12;
        ano -= 1;
      }

      meses.push({ mes, ano });
    }

    const resultado: ClientesEvolucaoMes[] = [];

    for (const { mes, ano } of meses) {
      // Calcular datas do mês
      const primeiroDia = new Date(ano, mes - 1, 1);
      const ultimoDia = new Date(ano, mes, 0);

      // Buscar atendimentos do mês
      const conditions = [
        eq(cashbarberAtendimentos.tenantId, tenantId),
        between(cashbarberAtendimentos.dataAtendimento, primeiroDia, ultimoDia),
      ];

      if (empresaSlug) {
        conditions.push(eq(cashbarberAtendimentos.empresaSlug, empresaSlug));
      }

      const atendimentos = await db
        .select()
        .from(cashbarberAtendimentos)
        .where(and(...conditions));

      // Contar clientes únicos
      const clientesUnicos = new Set<string>();
      const clientesPorProfissional = new Map<string, Set<string>>();

      atendimentos.forEach((att: any) => {
        clientesUnicos.add(att.clienteId);

        const profNome = att.profissionalNome || "Sem profissional";
        if (!clientesPorProfissional.has(profNome)) {
          clientesPorProfissional.set(profNome, new Set());
        }
        clientesPorProfissional.get(profNome)!.add(att.clienteId);
      });

      // Converter para objeto
      const porProfissionalObj: Record<string, number> = {};
      clientesPorProfissional.forEach((clientes, profissional) => {
        porProfissionalObj[profissional] = clientes.size;
      });

      const mesLabel = new Date(ano, mes - 1, 1).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric",
      });

      resultado.push({
        mes,
        ano,
        mesLabel,
        totalClientes: clientesUnicos.size,
        porProfissional: porProfissionalObj,
      });
    }

    return resultado;
  } catch (erro) {
    console.error("[ClientesEvolucao] Erro ao obter evolução:", erro);
    return [];
  }
}

/**
 * Obtém clientes atendidos por profissional em um período
 */
export async function obterClientesPorProfissional(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number,
  profissional?: string
): Promise<
  Array<{
    profissional: string;
    totalClientes: number;
    totalAtendimentos: number;
    faturamentoTotal: number;
  }>
> {
  try {
    const db = await getDb();
    if (!db) return [];

    const { cashbarberAtendimentos } = await import("../drizzle/schema");

    // Calcular datas do mês
    const primeiroDia = new Date(ano, mes - 1, 1);
    const ultimoDia = new Date(ano, mes, 0);

    // Construir condições
    const conditions = [
      eq(cashbarberAtendimentos.tenantId, tenantId),
      eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
      between(cashbarberAtendimentos.dataAtendimento, primeiroDia, ultimoDia),
    ];

    if (profissional) {
      conditions.push(eq(cashbarberAtendimentos.profissionalNome, profissional));
    }

    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(and(...conditions));

    // Agrupar por profissional
    const porProfissional = new Map<
      string,
      {
        clientes: Set<string>;
        atendimentos: number;
        faturamento: number;
      }
    >();

    atendimentos.forEach((att: any) => {
      const profNome = att.profissionalNome || "Sem profissional";

      if (!porProfissional.has(profNome)) {
        porProfissional.set(profNome, {
          clientes: new Set(),
          atendimentos: 0,
          faturamento: 0,
        });
      }

      const prof = porProfissional.get(profNome)!;
      prof.clientes.add(att.clienteId);
      prof.atendimentos++;
      prof.faturamento += parseFloat(att.valor.toString());
    });

    // Converter para array ordenado por clientes
    return Array.from(porProfissional.entries())
      .map(([nome, dados]) => ({
        profissional: nome,
        totalClientes: dados.clientes.size,
        totalAtendimentos: dados.atendimentos,
        faturamentoTotal: dados.faturamento,
      }))
      .sort((a, b) => b.totalClientes - a.totalClientes);
  } catch (erro) {
    console.error("[ClientesPorProfissional] Erro ao obter dados:", erro);
    return [];
  }
}
