/**
 * Sincronizador de Colaboradores (Barbeiros) via CashBarber Relatório 13
 *
 * O Relatório 13 retorna comissões de produtos por barbeiro.
 * Estrutura: [{ barbeiro: "Nome", produtos_comissoes: { Categoria: { valor_total, produtos: {...} } }, filial: "..." }]
 *
 * Estratégia:
 * 1. Buscar Relatório 13 do CashBarber para o mês vigente
 * 2. Upsert de colaboradores (criar se não existir, manter se já existir)
 * 3. Upsert de faturamentoColaboradores (totalProdutos acumulado no mês)
 */

import { getDb } from "./db";
import { colaboradores, faturamentoColaboradores } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { cashbarberLogin } from "./cashbarber";

/** Retorna a data atual no fuso horário do Brasil (UTC-3) */
function hojeNoBrasil(): Date {
  return new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
}

interface Rel13Barbeiro {
  barbeiro: string;
  filial: string;
  produtos_comissoes: Record<
    string,
    {
      id: number;
      valor_total: number;
      produtos: Record<string, { produto: string; quantidade: number; valor_un: string; valor_total: number }>;
      valor_comissao: number;
    }
  >;
}

/**
 * Busca o Relatório 13 do CashBarber para uma filial/período
 */
async function buscarRelatorio13(
  token: string,
  dataInicial: string,
  dataFinal: string,
  filialId?: number | null
): Promise<Rel13Barbeiro[]> {
  const body: Record<string, unknown> = { data_inicial: dataInicial, data_final: dataFinal };
  if (filialId) body.filial = filialId;

  const resp = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/13", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber relatorio13 falhou: ${resp.status}`);
  }

  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Sincroniza colaboradores e faturamento de produtos de uma empresa
 */
export async function sincronizarColaboradoresPorEmpresa(params: {
  tenantId: number;
  empresaSlug: string;
  cbEmail: string;
  cbSenha: string;
  cbFilialId?: number | null;
}): Promise<{
  colaboradoresSincronizados: number;
  faturamentosAtualizados: number;
  nomes: string[];
}> {
  const { tenantId, empresaSlug, cbEmail, cbSenha, cbFilialId } = params;

  const hoje = hojeNoBrasil();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const dataInicio = `${mesStr}-01`;
  const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;

  // Login no CashBarber
  const token = await cashbarberLogin(cbEmail, cbSenha);

  // Buscar Relatório 13
  const barbeiros = await buscarRelatorio13(token, dataInicio, dataFim, cbFilialId);

  if (barbeiros.length === 0) {
    return { colaboradoresSincronizados: 0, faturamentosAtualizados: 0, nomes: [] };
  }

  let colaboradoresSincronizados = 0;
  let faturamentosAtualizados = 0;
  const nomes: string[] = [];

  for (const barbeiro of barbeiros) {
    const nomeBarbeiro = barbeiro.barbeiro?.trim();
    if (!nomeBarbeiro) continue;

    // Calcular total de produtos (soma de todas as categorias)
    let totalProdutos = 0;
    let totalComissao = 0;
    for (const cat of Object.values(barbeiro.produtos_comissoes ?? {})) {
      totalProdutos += cat.valor_total ?? 0;
      totalComissao += cat.valor_comissao ?? 0;
    }

  const orm = await getDb();
  if (!orm) throw new Error("Database não disponível");

  // Upsert colaborador
  const [existente] = await orm
    .select({ id: colaboradores.id })
    .from(colaboradores)
    .where(and(eq(colaboradores.tenantId, tenantId), eq(colaboradores.empresaSlug, empresaSlug), eq(colaboradores.nome, nomeBarbeiro)))
    .limit(1);

  let colaboradorId: number;
  if (existente) {
    colaboradorId = existente.id;
  } else {
    const [inserted] = await orm.insert(colaboradores).values({
      tenantId,
      empresaSlug,
      nome: nomeBarbeiro,
      apelido: nomeBarbeiro.split(" ")[0],
      cargo: "barbeiro",
      exibirNoRanking: 1,
      ativo: 1,
    });
    colaboradorId = (inserted as { insertId: number }).insertId;
    colaboradoresSincronizados++;
  }

  // Upsert faturamento do mês
  const [fatExistente] = await orm
    .select({ id: faturamentoColaboradores.id })
    .from(faturamentoColaboradores)
    .where(
      and(
        eq(faturamentoColaboradores.tenantId, tenantId),
        eq(faturamentoColaboradores.colaboradorId, colaboradorId),
        eq(faturamentoColaboradores.mes, mes),
        eq(faturamentoColaboradores.ano, ano)
      )
    )
    .limit(1);

  const detalhesProdutos = JSON.stringify(barbeiro.produtos_comissoes ?? {});

  if (fatExistente) {
    await orm
      .update(faturamentoColaboradores)
      .set({
        totalProdutos: String(totalProdutos.toFixed(2)),
        totalComissaoProdutos: String(totalComissao.toFixed(2)),
        detalhesProdutos,
        ultimaSyncEm: new Date(),
      })
      .where(eq(faturamentoColaboradores.id, fatExistente.id));
  } else {
    await orm.insert(faturamentoColaboradores).values({
      tenantId,
      colaboradorId,
      empresaSlug,
      mes,
      ano,
      totalProdutos: String(totalProdutos.toFixed(2)),
      totalComissaoProdutos: String(totalComissao.toFixed(2)),
      detalhesProdutos,
      ultimaSyncEm: new Date(),
    });
  }

    faturamentosAtualizados++;
    nomes.push(nomeBarbeiro);
  }

  return { colaboradoresSincronizados, faturamentosAtualizados, nomes };
}
