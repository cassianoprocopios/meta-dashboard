/**
 * Módulo de sincronização do CashBarber
 *
 * Contém a lógica de sincronização reutilizável tanto pelo job automático
 * quanto pela procedure manual (trpc.cashbarber.sincronizar).
 *
 * IMPORTANTE: O CashBarber alimenta apenas as categorias mapeadas (ex: cat1, cat2).
 * Os campos não mapeados (ex: cat5 = Recorrência) são preservados do lançamento manual.
 */

import {
  getCashbarberConfig,
  listCashbarberMapeamento,
  upsertFaturamento,
  updateCashbarberSyncStatus,
  insertCashbarberSyncLog,
  getFaturamentoByDataEmpresaTenant,
} from "./db";
import {
  cashbarberLogin,
  cashbarberListarServicos,
  cashbarberListarProdutos,
  cashbarberRelatorio15,
  calcularFaturamentoPorCategoriaComCatalogo,
} from "./cashbarber";

/**
 * Resultado de uma sincronização
 */
export interface ResultadoSincronizacao {
  diasSincronizados: number;
  diasIgnorados: number;
  erros?: string;
  detalhes: Array<{
    data: string;
    status: "sincronizado" | "ignorado" | "erro";
    totalGeral?: number;
    mensagem?: string;
  }>;
}

/**
 * Determina quais categorias (cat1–cat5) são alimentadas pelo CashBarber
 * com base no mapeamento configurado.
 *
 * Retorna um Set com as chaves que devem ser sobrescritas (ex: {"cat1", "cat2"}).
 */
function getCategoriasMapeadas(mapeamento: Array<{ metaCategoria: string }>): Set<string> {
  const cats = new Set<string>();
  for (const m of mapeamento) {
    if (m.metaCategoria && m.metaCategoria.match(/^cat[1-5]$/)) {
      cats.add(m.metaCategoria);
    }
  }
  return cats;
}

/**
 * Sincroniza os dados de faturamento do CashBarber para uma empresa no mês/ano especificado.
 * Registra o resultado no log de sincronizações.
 *
 * Comportamento de merge:
 * - Apenas as categorias presentes no mapeamento CashBarber são sobrescritas.
 * - Categorias não mapeadas (ex: Recorrência = cat5) são preservadas do valor manual.
 *
 * @param tenantId - ID do tenant (empresa no Meta Dashboard)
 * @param empresaSlug - Slug da empresa no Meta Dashboard
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2025)
 * @param origem - 'auto' para job agendado, 'manual' para ação do usuário
 */
export async function sincronizarFaturamentoCashbarber(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number,
  origem: "auto" | "manual" = "manual"
): Promise<ResultadoSincronizacao> {
  // 1. Buscar configuração CashBarber da empresa
  const config = await getCashbarberConfig(tenantId, empresaSlug);
  if (!config) {
    throw new Error(`Configuração CashBarber não encontrada para ${empresaSlug}`);
  }

  // 2. Buscar mapeamento de categorias
  const mapeamento = await listCashbarberMapeamento(tenantId, empresaSlug);
  if (mapeamento.length === 0) {
    throw new Error(`Nenhum mapeamento de categorias configurado para ${empresaSlug}`);
  }

  // Determinar quais categorias o CashBarber alimenta (ex: {"cat1", "cat2"})
  const categoriasMapeadas = getCategoriasMapeadas(mapeamento);

  // 3. Fazer login no CashBarber
  const token = await cashbarberLogin(config.cbEmail, config.cbSenha);

  // 4. Buscar catálogos de serviços e produtos
  const [catalogoServicos, catalogoProdutos] = await Promise.all([
    cashbarberListarServicos(token),
    cashbarberListarProdutos(token),
  ]);

  // 5. Determinar o período: do dia 1 ao último dia do mês
  //    Se for o mês atual, vai até hoje; se for mês passado, vai até o último dia
  const hoje = new Date();
  const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
  const ultimoDia = ehMesAtual
    ? hoje.getDate()
    : new Date(ano, mes, 0).getDate();

  const detalhes: ResultadoSincronizacao["detalhes"] = [];
  let diasSincronizados = 0;
  let diasIgnorados = 0;
  const errosMsgs: string[] = [];

  // 6. Sincronizar dia a dia
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;

    try {
      // Buscar relatório do dia no CashBarber
      const relatorio = await cashbarberRelatorio15(
        token,
        dataStr,
        dataStr,
        config.cbFilialId || null
      );

      // Calcular faturamento por categoria (apenas as mapeadas terão valor > 0)
      const faturamentoCB = calcularFaturamentoPorCategoriaComCatalogo(
        relatorio,
        mapeamento,
        catalogoServicos,
        catalogoProdutos
      );

      // Buscar registro existente para preservar campos manuais
      const existente = await getFaturamentoByDataEmpresaTenant(dataStr, empresaSlug, tenantId);

      // Montar o objeto de upsert:
      // - Para categorias mapeadas pelo CashBarber: usar valor do CashBarber
      // - Para categorias NÃO mapeadas: preservar valor existente (ou "0" se novo registro)
      const cat1 = categoriasMapeadas.has("cat1")
        ? String(faturamentoCB.cat1)
        : existente?.cat1 ?? "0";
      const cat2 = categoriasMapeadas.has("cat2")
        ? String(faturamentoCB.cat2)
        : existente?.cat2 ?? "0";
      const cat3 = categoriasMapeadas.has("cat3")
        ? String(faturamentoCB.cat3)
        : existente?.cat3 ?? "0";
      const cat4 = categoriasMapeadas.has("cat4")
        ? String(faturamentoCB.cat4)
        : existente?.cat4 ?? "0";
      const cat5 = categoriasMapeadas.has("cat5")
        ? String(faturamentoCB.cat5)
        : existente?.cat5 ?? "0";

      // Salvar no banco (upsert com merge seletivo)
      await upsertFaturamento({
        tenantId,
        empresaSlug,
        data: dataStr,
        cat1,
        cat2,
        cat3,
        cat4,
        cat5,
        // Preservar observacao e lancadoPor do registro existente
        observacao: existente?.observacao ?? undefined,
        lancadoPor: existente?.lancadoPor ?? undefined,
      });

      diasSincronizados++;
      detalhes.push({
        data: dataStr,
        status: "sincronizado",
        totalGeral: faturamentoCB.totalGeral,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errosMsgs.push(`${dataStr}: ${msg}`);
      diasIgnorados++;
      detalhes.push({
        data: dataStr,
        status: "erro",
        mensagem: msg,
      });
    }
  }

  // 7. Atualizar status de última sincronização na config
  const statusFinal = errosMsgs.length === 0 ? "ok" : diasSincronizados > 0 ? "parcial" : "erro";
  await updateCashbarberSyncStatus(tenantId, empresaSlug, statusFinal);

  // 8. Registrar no log
  await insertCashbarberSyncLog({
    tenantId,
    empresaSlug,
    origem,
    status: statusFinal,
    mes,
    ano,
    diasSincronizados,
    diasIgnorados,
    erros: errosMsgs.length > 0 ? errosMsgs.slice(0, 10).join("; ") : undefined,
  });

  return {
    diasSincronizados,
    diasIgnorados,
    erros: errosMsgs.length > 0 ? errosMsgs.slice(0, 10).join("; ") : undefined,
    detalhes,
  };
}
