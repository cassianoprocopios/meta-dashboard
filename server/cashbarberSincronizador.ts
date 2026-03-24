/**
 * Módulo de sincronização do CashBarber
 *
 * Contém a lógica de sincronização reutilizável tanto pelo job automático
 * quanto pela procedure manual (trpc.cashbarber.sincronizar).
 */

import {
  getCashbarberConfig,
  listCashbarberMapeamento,
  upsertFaturamento,
  updateCashbarberSyncStatus,
  insertCashbarberSyncLog,
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
 * Sincroniza os dados de faturamento do CashBarber para uma empresa no mês/ano especificado.
 * Registra o resultado no log de sincronizações.
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
      // Buscar relatório do dia
      const relatorio = await cashbarberRelatorio15(
        token,
        dataStr,
        dataStr,
        config.cbFilialId || null
      );

      // Calcular faturamento por categoria
      const faturamento = calcularFaturamentoPorCategoriaComCatalogo(
        relatorio,
        mapeamento,
        catalogoServicos,
        catalogoProdutos
      );

      // Salvar no banco (upsert)
      // Os campos cat1-cat5 são decimal no schema, precisam ser string
      await upsertFaturamento({
        tenantId,
        empresaSlug,
        data: dataStr,
        cat1: String(faturamento.cat1),
        cat2: String(faturamento.cat2),
        cat3: String(faturamento.cat3),
        cat4: String(faturamento.cat4),
        cat5: String(faturamento.cat5),
      });

      diasSincronizados++;
      detalhes.push({
        data: dataStr,
        status: "sincronizado",
        totalGeral: faturamento.totalGeral,
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
