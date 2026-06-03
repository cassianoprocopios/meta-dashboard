/**
 * Função para buscar TODOS os profissionais (com ou sem atendimentos)
 * com dados consolidados de atendimentos e metas
 */

import { getDb } from "./db";
import { and, eq } from "drizzle-orm";
import { cashbarberLogin, cashbarberListarBarbeirosAtivos } from "./cashbarber";
import { listCashbarberConfigs } from "./db";

export interface ProfissionalConsolidado {
  profissional: string;
  profissionalId?: number;
  totalAtendimentos: number;
  clientesUnicos: number;
  faturamentoTotal: number;
  duracaoTotal: number;
  ticketMedio: number;
  metaMensal?: number;
  fotoUrl?: string;
}

/**
 * Obtém TODOS os profissionais da unidade com dados consolidados
 * Inclui profissionais sem atendimentos
 */
export async function obterConsolidadoCompletoTodosProfissionais(
  tenantId: number,
  empresaSlug: string,
  dataInicio: string,
  dataFim: string
): Promise<ProfissionalConsolidado[]> {
  try {
    const db = await getDb();
    if (!db) return [];

    // 1. Buscar lista de TODOS os profissionais do CashBarber
    const configs = await listCashbarberConfigs(tenantId);
    const config = configs.find((c) => c.empresaSlug === empresaSlug);
    
    if (!config || !config.cbEmail || !config.cbSenha) {
      console.warn(`[Consolidado Completo] Configuração não encontrada para ${empresaSlug}`);
      return [];
    }

    const token = await cashbarberLogin(config.cbEmail, config.cbSenha);
    if (!token) {
      console.error(`[Consolidado Completo] Falha ao fazer login para ${empresaSlug}`);
      return [];
    }

    const profissionaisAtivos = await cashbarberListarBarbeirosAtivos(token);
    if (!profissionaisAtivos || profissionaisAtivos.length === 0) {
      console.warn(`[Consolidado Completo] Nenhum profissional ativo encontrado para ${empresaSlug}`);
      return [];
    }

    // 2. Buscar atendimentos do período
    const { cashbarberAtendimentos } = await import("../drizzle/schema");
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    fim.setDate(fim.getDate() + 1);

    const atendimentos = await db
      .select()
      .from(cashbarberAtendimentos)
      .where(
        and(
          eq(cashbarberAtendimentos.tenantId, tenantId),
          eq(cashbarberAtendimentos.empresaSlug, empresaSlug),
          // Filtro de data
          ...(new Array<any>()) // Placeholder para gte/lte
        )
      );

    // Agrupar atendimentos por profissional
    const porProfissional = new Map<
      string,
      {
        atendimentos: number;
        clientes: Set<string>;
        faturamento: number;
        duracao: number;
      }
    >();

    atendimentos.forEach((att: any) => {
      const profNome = att.profissionalNome;
      if (!porProfissional.has(profNome)) {
        porProfissional.set(profNome, {
          atendimentos: 0,
          clientes: new Set(),
          faturamento: 0,
          duracao: 0,
        });
      }

      const prof = porProfissional.get(profNome)!;
      prof.atendimentos++;
      prof.clientes.add(att.clienteNome);
      prof.faturamento += att.valor || 0;
      prof.duracao += att.duracao || 0;
    });

    // 3. Buscar metas dos profissionais
    const mes = new Date(dataInicio).getMonth() + 1;
    const ano = new Date(dataInicio).getFullYear();
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

    const metasMap = new Map<string, number>();
    metas.forEach((meta: any) => {
      metasMap.set(meta.profissionalNome, meta.metaMensal);
    });

    // 4. Montar resultado com TODOS os profissionais
    const resultado: ProfissionalConsolidado[] = profissionaisAtivos.map((prof) => {
      const dados = porProfissional.get(prof.usu_name) || {
        atendimentos: 0,
        clientes: new Set(),
        faturamento: 0,
        duracao: 0,
      };

      return {
        profissional: prof.usu_name,
        profissionalId: prof.id,
        totalAtendimentos: dados.atendimentos,
        clientesUnicos: dados.clientes.size,
        faturamentoTotal: parseFloat(dados.faturamento.toString()),
        duracaoTotal: dados.duracao,
        ticketMedio: dados.atendimentos > 0 ? parseFloat((dados.faturamento / dados.atendimentos).toString()) : 0,
        metaMensal: metasMap.get(prof.usu_name) || 0,
        fotoUrl: prof.fotoUrl || undefined,
      };
    });

    // Ordenar por faturamento (descendente)
    return resultado.sort((a, b) => b.faturamentoTotal - a.faturamentoTotal);
  } catch (erro) {
    console.error(`[Consolidado Completo] Erro ao obter dados consolidados:`, erro);
    return [];
  }
}
