/**
 * Módulo de sincronização do CashBarber
 *
 * Contém a lógica de sincronização reutilizável tanto pelo job automático
 * quanto pela procedure manual (trpc.cashbarber.sincronizar).
 *
 * IMPORTANTE:
 * - O CashBarber alimenta apenas as categorias mapeadas (ex: cat1, cat2).
 * - cat5 (Recorrência) é calculada automaticamente via Dpote (Assinaturas):
 *   Comissão Bruta da filial = valor_total × porcentagem_barbearia% × (fichas_filial / fichas_total)
 * - O valor de cat5 é único para o mês inteiro, mas atualizado a cada sync
 *   (pois as assinaturas entram no banco ao longo do mês).
 * - Um único histórico Dpote é criado por mês e reutilizado nas syncs seguintes
 *   (o ID é armazenado em cashbarberConfig.dpoteHistoricoId).
 */

import {
  getCashbarberConfig,
  listCashbarberMapeamento,
  listCashbarberConfigs,
  upsertFaturamento,
  updateCashbarberSyncStatus,
  insertCashbarberSyncLog,
  getFaturamentoByDataEmpresaTenant,
  saveDpoteHistoricoId,
  getDpoteHistoricoId,
} from "./db";
import {
  cashbarberLogin,
  cashbarberListarServicos,
  cashbarberListarProdutos,
  cashbarberRelatorio15,
  calcularFaturamentoPorCategoriaComCatalogo,
  cashbarberCalcularDpotePorFichas,
  cashbarberBuscarValorAssinaturas,
  cashbarberCriarHistoricoDpote,
} from "./cashbarber";

/**
 * Resultado de uma sincronização
 */
export interface ResultadoSincronizacao {
  diasSincronizados: number;
  diasIgnorados: number;
  erros?: string;
  recorrenciaAtualizada?: boolean;
  recorrenciaValor?: number;
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
 * Calcula a Recorrência Dpote para uma empresa usando fichas ponderadas dos atendimentos.
 *
 * Usa o relatório 15 do CashBarber para obter atendimentos por serviço por filial,
 * multiplica pela fichas configuradas em cada serviço (ser_valor_fichas),
 * e distribui a comissão bruta proporcionalmente.
 *
 * @param token - Token JWT do CashBarber
 * @param dataInicial - Data inicial no formato YYYY-MM-DD
 * @param dataFinal - Data final no formato YYYY-MM-DD
 * @param dpoteFilialNome - Nome da filial no Dpote (busca parcial, case-insensitive)
 * @param valorAssinaturas - Valor total de assinaturas configurado
 * @param porcentagemBarbearia - Percentual da comissão para a barbearia (ex: 65)
 * @returns Valor da comissão bruta da filial em reais
 */
async function calcularRecorrenciaDpotePorFichas(
  token: string,
  dataInicial: string,
  dataFinal: string,
  dpoteFilialNome: string,
  valorAssinaturas: number,
  porcentagemBarbearia: number
): Promise<number> {
  const resultados = await cashbarberCalcularDpotePorFichas(
    token,
    dataInicial,
    dataFinal,
    valorAssinaturas,
    porcentagemBarbearia
  );

  // Encontrar a filial pelo nome (busca parcial, case-insensitive)
  const nomeBusca = dpoteFilialNome.trim().toLowerCase();
  const filial = resultados.find(
    (r) => r.filialNome && r.filialNome.toLowerCase().includes(nomeBusca)
  );

  return filial?.comissaoBruta ?? 0;
}

/**
 * Sincroniza os dados de faturamento do CashBarber para uma empresa no mês/ano especificado.
 * Registra o resultado no log de sincronizações.
 *
 * Comportamento de merge:
 * - As categorias presentes no mapeamento CashBarber são sobrescritas com dados do relatório 15.
 * - cat5 (Recorrência) é calculada via Dpote (Comissão Bruta da filial) e atualizada em TODOS os dias do mês.
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

  // 5. Calcular Recorrência via Dpote usando fichas ponderadas dos atendimentos do mês.
  //    O valor é recalculado a cada sync com os atendimentos acumulados até o dia atual.
  //    É lançado APENAS no dia 1 do mês para evitar duplicação.
  let recorrenciaValor = 0;
  let recorrenciaAtualizada = false;

  // Só calcular Dpote se a empresa tiver nome de filial configurado e parâmetros de assinaturas
  const dpoteFilialNome = config.dpoteFilialNome?.trim();
  const dpoteValorAssinaturas = config.dpoteValorAssinaturas ? parseFloat(String(config.dpoteValorAssinaturas)) : undefined;
  const dpotePorcentagemBarbearia = config.dpotePorcentagemBarbearia ? parseFloat(String(config.dpotePorcentagemBarbearia)) : undefined;

  if (dpoteFilialNome) {
    try {
      // Calcular com atendimentos do dia 1 ao dia atual (ou último dia do mês)
      const hoje = new Date();
      const ehMesAtualDpote = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
      const ultimoDiaDpote = ehMesAtualDpote ? hoje.getDate() : new Date(ano, mes, 0).getDate();
      const dataInicialDpote = `${ano}-${String(mes).padStart(2, "0")}-01`;
      const dataFinalDpote = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDiaDpote).padStart(2, "0")}`;

      // Tentar buscar valor de assinaturas automaticamente via API do CashBarber
      // usando o ID do histórico Dpote salvo no banco (dpoteHistoricoId)
      let valorAssinaturasEfetivo = dpoteValorAssinaturas;
      let porcentagemBarbeariaEfetiva = dpotePorcentagemBarbearia;
      let valorFonteBusca = "manual";

      const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
      const historicoIdSalvo = await getDpoteHistoricoId(tenantId, empresaSlug, mesSigla);

      // Tentar buscar via histórico salvo; se falhar, criar novo histórico automaticamente
      let dadosApi = null;

      if (historicoIdSalvo) {
        dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
        if (dadosApi) {
          valorAssinaturasEfetivo = dadosApi.valorAssinaturas;
          porcentagemBarbeariaEfetiva = dadosApi.porcentagemBarbearia;
          valorFonteBusca = `api (histórico #${historicoIdSalvo})`;
          console.log(`[CashBarber] Dpote ${empresaSlug}: valor assinaturas buscado automaticamente = R$ ${valorAssinaturasEfetivo} (${valorFonteBusca})`);
        } else {
          console.warn(`[CashBarber] Dpote ${empresaSlug}: API retornou null para histórico #${historicoIdSalvo}, tentando criar novo histórico...`);
        }
      } else {
        console.log(`[CashBarber] Dpote ${empresaSlug}: sem histórico Dpote salvo para ${mesSigla}, tentando criar novo histórico...`);
      }

      // Se não conseguiu dados via histórico salvo, criar novo histórico automaticamente
      if (!dadosApi) {
        try {
          const novoHistoricoId = await cashbarberCriarHistoricoDpote(token);
          await saveDpoteHistoricoId(tenantId, empresaSlug, novoHistoricoId, mesSigla);
          console.log(`[CashBarber] Dpote ${empresaSlug}: novo histórico criado #${novoHistoricoId}`);

          // Aguardar um momento para o CashBarber processar o histórico
          await new Promise(resolve => setTimeout(resolve, 2000));

          dadosApi = await cashbarberBuscarValorAssinaturas(token, novoHistoricoId);
          if (dadosApi) {
            valorAssinaturasEfetivo = dadosApi.valorAssinaturas;
            porcentagemBarbeariaEfetiva = dadosApi.porcentagemBarbearia;
            valorFonteBusca = `api (novo histórico #${novoHistoricoId})`;
            console.log(`[CashBarber] Dpote ${empresaSlug}: valor assinaturas via novo histórico = R$ ${valorAssinaturasEfetivo} (${valorFonteBusca})`);
          } else {
            console.warn(`[CashBarber] Dpote ${empresaSlug}: novo histórico #${novoHistoricoId} também retornou null, usando valor manual`);
          }
        } catch (errHistorico) {
          console.warn(`[CashBarber] Dpote ${empresaSlug}: falha ao criar novo histórico, usando valor manual:`, errHistorico);
        }
      }

      if (valorAssinaturasEfetivo && porcentagemBarbeariaEfetiva) {
        recorrenciaValor = await calcularRecorrenciaDpotePorFichas(
          token,
          dataInicialDpote,
          dataFinalDpote,
          dpoteFilialNome,
          valorAssinaturasEfetivo,
          porcentagemBarbeariaEfetiva
        );
        recorrenciaAtualizada = true;
        console.log(`[CashBarber] Dpote ${empresaSlug}: R$ ${recorrenciaValor} (fichas ponderadas, fonte: ${valorFonteBusca})`);
      } else {
        console.warn(`[CashBarber] Dpote ${empresaSlug}: sem valorAssinaturas disponível (nem API nem manual)`);
      }
    } catch (err) {
      // Falha no Dpote não deve interromper a sync do faturamento diário
      console.warn(`[CashBarber] Falha ao calcular Recorrência via Dpote para ${empresaSlug}:`, err);
    }
  }

  // 6. Determinar o período: do dia 1 ao último dia do mês
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

  // 7. Sincronizar dia a dia
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

      // cat5 (Recorrência / Dpote):
      // O valor Dpote é o total mensal da comissão da filial.
      // Para evitar duplicação, ele é lançado APENAS no dia 1 do mês.
      // Nos demais dias, cat5 é zerado (ou preservado se não vier do CashBarber).
      let cat5: string;
      if (recorrenciaAtualizada) {
        // Dia 1: recebe o valor total da Recorrência
        // Demais dias: cat5 = "0" (zerado pelo CashBarber)
        cat5 = dia === 1 ? String(recorrenciaValor) : "0";
      } else {
        // Dpote falhou: preservar valor existente (ou "0" se novo registro)
        cat5 = existente?.cat5 ?? "0";
      }

      // Salvar no banco (upsert com merge seletivo)
      // sincronizadoCB=1 marca que este dia foi importado pelo CashBarber
      await upsertFaturamento({
        tenantId,
        empresaSlug,
        data: dataStr,
        cat1,
        cat2,
        cat3,
        cat4,
        cat5,
        sincronizadoCB: 1,
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

  // 8. Atualizar status de última sincronização na config
  const statusFinal = errosMsgs.length === 0 ? "ok" : diasSincronizados > 0 ? "parcial" : "erro";
  await updateCashbarberSyncStatus(tenantId, empresaSlug, statusFinal);

  // 9. Registrar no log
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
    recorrenciaAtualizada,
    recorrenciaValor,
    detalhes,
  };
}

/**
 * Resultado da aplicação do Dpote para um tenant
 */
export interface ResultadoAplicacaoDpote {
  aplicados: Array<{ empresaSlug: string; filialNome: string; comissaoBruta: number }>;
  naoEncontrados: string[];
  totalAssinaturas: number;
  porcentagemBarbearia: number;
}

/**
 * Calcula a distribuição Dpote por filial e aplica o valor de comissão bruta
 * como cat5 (Recorrência) no faturamento do dia 1 de cada empresa para o mês/ano.
 *
 * Esta função é chamada automaticamente pelo job de sync após sincronizar todas as empresas,
 * e também pode ser chamada manualmente via procedure tRPC.
 *
 * @param tenantId - ID do tenant
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2026)
 */
export async function aplicarDpoteParaTenant(
  tenantId: number,
  mes: number,
  ano: number
): Promise<ResultadoAplicacaoDpote> {
  const configs = await listCashbarberConfigs(tenantId);

  // Encontrar config com Dpote configurado (usa a primeira com valorAssinaturas)
  const configComDpote = configs.find(
    (c) => c.dpoteFilialNome && c.dpoteValorAssinaturas && c.dpotePorcentagemBarbearia
  );
  if (!configComDpote) {
    throw new Error(`Nenhuma empresa do tenant ${tenantId} com Dpote configurado encontrada.`);
  }

  let valorAssinaturas = parseFloat(String(configComDpote.dpoteValorAssinaturas));
  let porcentagemBarbearia = parseFloat(String(configComDpote.dpotePorcentagemBarbearia));

  // Tentar buscar valor de assinaturas automaticamente via API do CashBarber
  const token = await cashbarberLogin(configComDpote.cbEmail, configComDpote.cbSenha);
  const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
  const historicoIdSalvo = await getDpoteHistoricoId(tenantId, configComDpote.empresaSlug, mesSigla);

  if (historicoIdSalvo) {
    const dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
    if (dadosApi) {
      valorAssinaturas = dadosApi.valorAssinaturas;
      porcentagemBarbearia = dadosApi.porcentagemBarbearia;
      console.log(`[CashBarber Dpote] Valor assinaturas buscado via API: R$ ${valorAssinaturas} (histórico #${historicoIdSalvo})`);
    }
  }

  // Calcular período
  const hoje = new Date();
  const ehMesAtual = mes === hoje.getMonth() + 1 && ano === hoje.getFullYear();
  const ultimoDia = ehMesAtual ? hoje.getDate() : new Date(ano, mes, 0).getDate();
  const dataInicial = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const dataFinal = `${ano}-${String(mes).padStart(2, "0")}-${String(ultimoDia).padStart(2, "0")}`;

  // Calcular distribuição por filial via fichas ponderadas
  const resultados = await cashbarberCalcularDpotePorFichas(
    token, dataInicial, dataFinal, valorAssinaturas, porcentagemBarbearia
  );

  const dia1 = dataInicial;
  const aplicados: ResultadoAplicacaoDpote["aplicados"] = [];
  const naoEncontrados: string[] = [];

  for (const config of configs) {
    if (!config.dpoteFilialNome) continue;
    const nomeBusca = config.dpoteFilialNome.trim().toLowerCase();
    const filial = resultados.find((r) => r.filialNome.toLowerCase().includes(nomeBusca));
    if (!filial) {
      naoEncontrados.push(config.empresaSlug);
      continue;
    }

    // Preservar outras categorias do dia 1
    const existente = await getFaturamentoByDataEmpresaTenant(dia1, config.empresaSlug, tenantId);

    await upsertFaturamento({
      tenantId,
      empresaSlug: config.empresaSlug,
      data: dia1,
      cat1: existente?.cat1 ?? "0",
      cat2: existente?.cat2 ?? "0",
      cat3: existente?.cat3 ?? "0",
      cat4: existente?.cat4 ?? "0",
      cat5: String(filial.comissaoBruta),
      sincronizadoCB: existente?.sincronizadoCB ?? 0,
      observacao: existente?.observacao ?? undefined,
      lancadoPor: existente?.lancadoPor ?? undefined,
    });

    aplicados.push({
      empresaSlug: config.empresaSlug,
      filialNome: filial.filialNome,
      comissaoBruta: filial.comissaoBruta,
    });

    console.log(`[CashBarber Dpote] cat5 atualizado para ${config.empresaSlug}: R$ ${filial.comissaoBruta.toFixed(2)}`);
  }

  return { aplicados, naoEncontrados, totalAssinaturas: valorAssinaturas, porcentagemBarbearia };
}
