/**
 * Sincronizador de Colaboradores (Barbeiros) via CashBarber Relatório 15
 *
 * O Relatório 15 (Vendas) com filtro por barbeiro retorna:
 *   servicos: [{ ags_id_servico, ser_nome, sum, count }]  — sum = valor em reais
 *   produtos: [{ cop_id_produto, pro_nome, count, total }] — total = valor em reais
 *
 * Estratégia:
 * 1. Para cada profissional conhecido, buscar Relatório 15 filtrado por barbeiro
 * 2. Calcular totalServicos (sum de servicos[].sum) e totalProdutos (sum de produtos[].total)
 * 3. Upsert de colaboradores (criar se não existir, manter se já existir)
 * 4. Upsert de faturamentoColaboradores (totais acumulados no mês)
 *
 * Profissionais são identificados pelo ID do CashBarber (campo cashbarberProfissionalId).
 * Na primeira sync, os profissionais são criados automaticamente a partir da lista hardcoded
 * ou buscada via API. Nas syncs seguintes, apenas os já cadastrados são atualizados.
 */

import { getDb } from "./db";
import { colaboradores, faturamentoColaboradores } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { cashbarberLogin } from "./cashbarber";

/** Retorna a data atual no fuso horário do Brasil (UTC-3) */
function hojeNoBrasil(): Date {
  return new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
}

interface Rel15Profissional {
  servicos: Array<{ ags_id_servico: number; ser_nome: string; sum: number; count: number }>;
  produtos: Array<{ cop_id_produto: number; pro_nome: string; count: string; total: number }>;
}

/**
 * Busca o Relatório 15 do CashBarber filtrado por profissional
 */
async function buscarRelatorio15PorProfissional(
  token: string,
  dataInicial: string,
  dataFinal: string,
  barbeiroId: number
): Promise<Rel15Profissional> {
  const resp = await fetch("https://api.cashbarber.com.br/api/painel/relatorios/15", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Context": "painel",
    },
    body: JSON.stringify({
      data_inicial: dataInicial,
      data_final: dataFinal,
      filial: null,
      barbeiro: barbeiroId,
      produtos: [],
      servicos: [],
      categorias: [],
      mostrar_inativos: false,
    }),
  });

  if (!resp.ok) {
    throw new Error(`CashBarber relatorio15 (barbeiro ${barbeiroId}) falhou: ${resp.status}`);
  }

  const data = await resp.json();
  return {
    servicos: Array.isArray(data.servicos) ? data.servicos : [],
    produtos: Array.isArray(data.produtos) ? data.produtos : [],
  };
}

/**
 * Sincroniza colaboradores e faturamento de uma empresa via Relatório 15 por profissional
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
  const { tenantId, empresaSlug, cbEmail, cbSenha } = params;

  const hoje = hojeNoBrasil();
  const mes = hoje.getMonth() + 1;
  const ano = hoje.getFullYear();
  const mesStr = `${ano}-${String(mes).padStart(2, "0")}`;
  const dataInicio = `${mesStr}-01`;
  const dataFim = `${mesStr}-${String(hoje.getDate()).padStart(2, "0")}`;

  // Login no CashBarber
  const token = await cashbarberLogin(cbEmail, cbSenha);

  const orm = await getDb();
  if (!orm) throw new Error("Database não disponível");

  // Buscar colaboradores já cadastrados para esta empresa
  const colaboradoresCadastrados = await orm
    .select()
    .from(colaboradores)
    .where(
      and(
        eq(colaboradores.tenantId, tenantId),
        eq(colaboradores.empresaSlug, empresaSlug),
        eq(colaboradores.ativo, 1)
      )
    );

  if (colaboradoresCadastrados.length === 0) {
    return { colaboradoresSincronizados: 0, faturamentosAtualizados: 0, nomes: [] };
  }

  let colaboradoresSincronizados = 0;
  let faturamentosAtualizados = 0;
  const nomes: string[] = [];

  for (const colaborador of colaboradoresCadastrados) {
    // Só sincronizar colaboradores com ID do CashBarber cadastrado
    if (!colaborador.cashbarberProfissionalId) continue;

    const barbeiroId = colaborador.cashbarberProfissionalId;

    let rel15: Rel15Profissional;
    try {
      rel15 = await buscarRelatorio15PorProfissional(token, dataInicio, dataFim, barbeiroId);
    } catch (err) {
      console.error(`[ColaboradoresSync] Erro ao buscar rel15 para ${colaborador.nome}:`, err);
      continue;
    }

    // Calcular totais
    const totalServicos = rel15.servicos.reduce((acc, s) => acc + (Number(s.sum) || 0), 0);
    const totalProdutos = rel15.produtos.reduce((acc, p) => acc + (Number(p.total) || 0), 0);
    const totalGeral = totalServicos + totalProdutos;

    const detalhesServicos = JSON.stringify(rel15.servicos);
    const detalhesProdutos = JSON.stringify(rel15.produtos);

    // Upsert faturamento do mês
    const [fatExistente] = await orm
      .select({ id: faturamentoColaboradores.id })
      .from(faturamentoColaboradores)
      .where(
        and(
          eq(faturamentoColaboradores.tenantId, tenantId),
          eq(faturamentoColaboradores.colaboradorId, colaborador.id),
          eq(faturamentoColaboradores.mes, mes),
          eq(faturamentoColaboradores.ano, ano)
        )
      )
      .limit(1);

    if (fatExistente) {
      await orm
        .update(faturamentoColaboradores)
        .set({
          totalServicos: String(totalServicos.toFixed(2)),
          totalProdutos: String(totalProdutos.toFixed(2)),
          totalGeral: String(totalGeral.toFixed(2)),
          detalhesServicos,
          detalhesProdutos,
          ultimaSyncEm: new Date(),
        })
        .where(eq(faturamentoColaboradores.id, fatExistente.id));
    } else {
      await orm.insert(faturamentoColaboradores).values({
        tenantId,
        colaboradorId: colaborador.id,
        empresaSlug,
        mes,
        ano,
        totalServicos: String(totalServicos.toFixed(2)),
        totalProdutos: String(totalProdutos.toFixed(2)),
        totalGeral: String(totalGeral.toFixed(2)),
        detalhesServicos,
        detalhesProdutos,
        ultimaSyncEm: new Date(),
      });
    }

    faturamentosAtualizados++;
    nomes.push(colaborador.nome);

    console.log(
      `[ColaboradoresSync] ${colaborador.nome}: serviços R$ ${totalServicos.toFixed(2)} + produtos R$ ${totalProdutos.toFixed(2)} = R$ ${totalGeral.toFixed(2)}`
    );
  }

  return { colaboradoresSincronizados, faturamentosAtualizados, nomes };
}
