/**
 * Módulo de sincronização do CashBarber
 *
 * Contém a lógica de sincronização reutilizável tanto pelo job automático
 * quanto pela procedure manual (trpc.cashbarber.sincronizar).
 *
 * IMPORTANTE:
 * - O CashBarber alimenta apenas as categorias mapeadas (ex: cat1, cat2).
 * - cat5 (Recorrência) representa planos mensais cobrados diariamente.
 *   O valor total mensal é distribuído igualmente por todos os dias do mês
 *   (ex: R$ 30.000 em 30 dias = R$ 1.000/dia), refletindo a cobrança diária.
 * - O total mensal de cat5 é calculado via Dpote (fichas ponderadas) e
 *   atualizado a cada sync (pois as assinaturas entram no banco ao longo do mês).
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
  insertDpoteSyncLog,
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
  cashbarberCalcularDpoteViaHistorico,
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
    if (m.metaCategoria && m.metaCategoria.match(/^cat[1-9]$/)) {
      cats.add(m.metaCategoria);
    }
  }
  return cats;
}

/**
 * Calcula o valor de Recorrência Dpote para uma filial específica usando fichas ponderadas.
 *
 * Distribui 100% do valor de assinaturas proporcionalmente às fichas de cada filial.
 *
 * @param token - Token JWT do CashBarber
 * @param dataInicial - Data inicial no formato YYYY-MM-DD
 * @param dataFinal - Data final no formato YYYY-MM-DD
 * @param dpoteFilialNome - Nome da filial no Dpote (busca parcial, case-insensitive)
 * @param valorAssinaturas - Valor total de assinaturas a distribuir (100%)
 * @param porcentagemBarbearia - Parâmetro mantido por compatibilidade (ignorado no cálculo)
 * @returns Valor distribuído para a filial em reais
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

  return filial?.valorDistribuido ?? 0;
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

      // Sempre criar novo histórico para obter o valor mais atualizado do Dpote
      // O Cash Barber atualiza o valor das assinaturas criando novos históricos diariamente
      let valorAssinaturasEfetivo = dpoteValorAssinaturas;
      let porcentagemBarbeariaEfetiva = dpotePorcentagemBarbearia;
      let valorFonteBusca = "manual";

      const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;
      let dadosApi = null;

      // Sempre criar novo histórico para garantir o valor mais recente
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
          // Fallback: tentar histórico salvo anteriormente
          console.warn(`[CashBarber] Dpote ${empresaSlug}: novo histórico #${novoHistoricoId} retornou null, tentando histórico anterior...`);
          const historicoIdSalvo = await getDpoteHistoricoId(tenantId, empresaSlug, mesSigla);
          if (historicoIdSalvo && historicoIdSalvo !== novoHistoricoId) {
            dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
            if (dadosApi) {
              valorAssinaturasEfetivo = dadosApi.valorAssinaturas;
              porcentagemBarbeariaEfetiva = dadosApi.porcentagemBarbearia;
              valorFonteBusca = `api (histórico anterior #${historicoIdSalvo})`;
              console.log(`[CashBarber] Dpote ${empresaSlug}: valor via histórico anterior = R$ ${valorAssinaturasEfetivo}`);
            }
          }
          if (!dadosApi) {
            console.warn(`[CashBarber] Dpote ${empresaSlug}: todos os históricos retornaram null, usando valor manual`);
          }
        }
      } catch (errHistorico) {
        // Fallback: tentar histórico salvo se falhar ao criar novo
        console.warn(`[CashBarber] Dpote ${empresaSlug}: falha ao criar novo histórico, tentando histórico salvo:`, errHistorico);
        try {
          const historicoIdSalvo = await getDpoteHistoricoId(tenantId, empresaSlug, mesSigla);
          if (historicoIdSalvo) {
            dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
            if (dadosApi) {
              valorAssinaturasEfetivo = dadosApi.valorAssinaturas;
              porcentagemBarbeariaEfetiva = dadosApi.porcentagemBarbearia;
              valorFonteBusca = `api (histórico salvo #${historicoIdSalvo})`;
              console.log(`[CashBarber] Dpote ${empresaSlug}: valor via histórico salvo = R$ ${valorAssinaturasEfetivo}`);
            }
          }
        } catch (errFallback) {
          console.warn(`[CashBarber] Dpote ${empresaSlug}: fallback também falhou:`, errFallback);
        }
      }

      if (valorAssinaturasEfetivo) {
        // porcentagemBarbearia não é mais usada no cálculo (distribuição é 100%)
        const pct = porcentagemBarbeariaEfetiva ?? 100;
        recorrenciaValor = await calcularRecorrenciaDpotePorFichas(
          token,
          dataInicialDpote,
          dataFinalDpote,
          dpoteFilialNome,
          valorAssinaturasEfetivo,
          pct
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
  //    IMPORTANTE: Usar horário de Brasília (BRT) para determinar o dia vigente
  const hoje = new Date();
  const hojeBRT = new Date(hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ehMesAtual = mes === hojeBRT.getMonth() + 1 && ano === hojeBRT.getFullYear();
  const ultimoDia = ehMesAtual
    ? hojeBRT.getDate()
    : new Date(ano, mes, 0).getDate();
  const totalDiasMesAtual = new Date(ano, mes, 0).getDate();


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
      const cat5 = categoriasMapeadas.has("cat5")
        ? String(faturamentoCB.cat5)
        : existente?.cat5 ?? "0";
      const cat6 = categoriasMapeadas.has("cat6")
        ? String(faturamentoCB.cat6)
        : existente?.cat6 ?? "0";
      const cat7 = categoriasMapeadas.has("cat7")
        ? String(faturamentoCB.cat7)
        : existente?.cat7 ?? "0";
      const cat8 = categoriasMapeadas.has("cat8")
        ? String(faturamentoCB.cat8)
        : existente?.cat8 ?? "0";

      // cat9 (Recorrência / Dpote):
      // Regra:
      //   - Dias 1 até hoje: valor diário = recorrenciaValor ÷ diasRealizados (ultimoDia)
      //     Isso garante que a soma total dos dias realizados = recorrenciaValor
      //     (mesmo cálculo usado pelo job de Dpote em aplicarDpoteParaTenant)
      //   - Dias futuros (após hoje): SEMPRE "0" no banco.
      //     A previsão baseada no mês passado é calculada dinamicamente no frontend.
      //   - Meses passados: valor diário calculado pelo Dpote do mês
      //   - PROTEÇÃO QUINZENAL: após dia 15, não alterar cat9 dos dias 1-15
      //     para preservar o valor definitivo da quinzena.
      let cat9: string;

      // Proteção quinzenal: se já passamos do dia 15 no mês atual,
      // não alterar cat9 dos dias 1-15 (valor da quinzena é definitivo)
      const quinzenaProtegidaSync = ehMesAtual && hojeBRT.getDate() > 15 && dia <= 15;
      if (quinzenaProtegidaSync) {
        // Preservar o cat9 existente sem alteração
        cat9 = existente?.cat9 ?? "0";
      } else if (recorrenciaAtualizada && recorrenciaValor > 0) {
        // Usar hojeBRT (já calculado acima) para determinar dia futuro
        const diaFuturo = ehMesAtual && dia > hojeBRT.getDate();
        if (diaFuturo) {
          // Dia futuro: gravar "0" no banco. Previsão é calculada no frontend.
          cat9 = "0";
        } else {
          // Dia realizado: dividir pelo número de dias JA REALIZADOS (ultimoDia)
          // para que a soma total bata com recorrenciaValor
          const diasRealizadosSync = ultimoDia; // = hojeBRT.getDate() para mês atual
          const valorDiario = Math.round((recorrenciaValor / diasRealizadosSync) * 100) / 100;
          cat9 = String(valorDiario);
        }
      } else {
        // Dpote falhou ou não configurado: preservar valor existente (ou "0")
        // Dias futuros sempre recebem "0" no banco (usando horário BRT)
        const diaFuturo = ehMesAtual && dia > hojeBRT.getDate();
        if (diaFuturo) {
          cat9 = "0";
        } else {
          cat9 = existente?.cat9 ?? "0";
        }
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
        cat6,
        cat7,
        cat8,
        cat9,
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

  // 9a. Registrar no log do Dpote (se a recorrência foi atualizada)
  if (recorrenciaAtualizada) {
    // Calcular valor anterior: soma do cat5 atual no banco antes da sync
    // (aproximação: buscar todos os registros do mês e somar cat5 antes do upsert)
    // Como já fizemos o upsert, usamos o valor anterior como: totalDias * valorDiarioAnterior
    // Para simplificar, buscamos o cat5 atual do banco (já atualizado) e registramos
    // Calcular valor diário real: dividido pelos dias realizados (não pelos 31 do mês)
    // Usar horário de Brasília para consistência com o cálculo acima
    const diasRealizadosLog = ehMesAtual ? hojeBRT.getDate() : new Date(ano, mes, 0).getDate();
    const valorDiarioNovo = recorrenciaValor / diasRealizadosLog;
    // Registrar o log de sincronização do Dpote
    try {
      await insertDpoteSyncLog({
        tenantId,
        empresaSlug,
        mes,
        ano,
        valorAnterior: 0, // será calculado na próxima iteração via histórico
        valorNovo: recorrenciaValor,
        diasAtualizados: diasSincronizados,
        fonte: "api",
        tipoExecucao: origem === "auto" ? "automatico" : "manual",
        erro: errosMsgs.length > 0 ? errosMsgs.slice(0, 3).join("; ") : null,
      });
      console.log(`[CashBarber Dpote] cat9 (Recorrência) distribuído diariamente para ${empresaSlug}: R$ ${valorDiarioNovo.toFixed(2)}/dia × ${diasRealizadosLog} dias = R$ ${recorrenciaValor.toFixed(2)} total`);
    } catch (errLog) {
      console.warn(`[CashBarber] Falha ao registrar DpoteSyncLog para ${empresaSlug}:`, errLog);
    }
  }

  // 9b. Registrar no log geral do CashBarber
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
  aplicados: Array<{ empresaSlug: string; filialNome: string; valorDistribuido: number }>;
  naoEncontrados: string[];
  totalAssinaturas: number;
}

/**
 * Calcula a distribuição Dpote por filial e aplica 100% do valor de assinaturas
 * como cat5 (Recorrência) distribuindo igualmente por todos os dias do mês.
 * Ex: R$ 30.000 em 30 dias = R$ 1.000/dia por empresa.
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
    (c) => c.dpoteFilialNome && c.dpoteValorAssinaturas
  );
  if (!configComDpote) {
    throw new Error(`Nenhuma empresa do tenant ${tenantId} com Dpote configurado encontrada.`);
  }

  let valorAssinaturas = parseFloat(String(configComDpote.dpoteValorAssinaturas));
  // porcentagemBarbearia não é mais usada no cálculo (distribuição é 100%)
  const porcentagemBarbearia = 100;

  // Sempre criar um novo histórico para obter o valor mais atualizado das assinaturas
  // Isso garante que o job automático sempre use o valor mais recente do CashBarber
  const token = await cashbarberLogin(configComDpote.cbEmail, configComDpote.cbSenha);
  const mesSigla = `${ano}-${String(mes).padStart(2, "0")}`;

  try {
    const novoHistoricoId = await cashbarberCriarHistoricoDpote(token);
    console.log(`[CashBarber Dpote] Histórico criado #${novoHistoricoId}, aguardando processamento...`);

    // O CashBarber precisa de alguns segundos para processar o histórico após a criação.
    // Tentamos até 3 vezes com delay de 4s entre cada tentativa.
    let dadosApi: { valorAssinaturas: number; porcentagemBarbearia: number } | null = null;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      await new Promise((r) => setTimeout(r, 4000));
      dadosApi = await cashbarberBuscarValorAssinaturas(token, novoHistoricoId);
      if (dadosApi && dadosApi.valorAssinaturas > 0) {
        console.log(`[CashBarber Dpote] Histórico #${novoHistoricoId} processado na tentativa ${tentativa}: R$ ${dadosApi.valorAssinaturas}`);
        break;
      }
      console.log(`[CashBarber Dpote] Histórico #${novoHistoricoId} ainda não processado (tentativa ${tentativa}/3)...`);
    }

    if (dadosApi && dadosApi.valorAssinaturas > 0) {
      valorAssinaturas = dadosApi.valorAssinaturas;
      // Salvar o novo histórico ID no banco para referência e para a aba Dpote
      await saveDpoteHistoricoId(tenantId, configComDpote.empresaSlug, novoHistoricoId, mesSigla, valorAssinaturas);
      console.log(`[CashBarber Dpote] Novo histórico #${novoHistoricoId}: R$ ${valorAssinaturas} assinaturas`);
    } else {
      // Histórico criado mas sem dados após 3 tentativas — buscar histórico mais recente válido
      console.warn(`[CashBarber Dpote] Histórico #${novoHistoricoId} sem dados após 3 tentativas, buscando histórico anterior...`);
      const historicoIdSalvo = await getDpoteHistoricoId(tenantId, configComDpote.empresaSlug, mesSigla);
      if (historicoIdSalvo && historicoIdSalvo !== novoHistoricoId) {
        const dadosFallback = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
        if (dadosFallback && dadosFallback.valorAssinaturas > 0) {
          valorAssinaturas = dadosFallback.valorAssinaturas;
          console.log(`[CashBarber Dpote] Usando histórico anterior #${historicoIdSalvo}: R$ ${valorAssinaturas} assinaturas`);
        }
      }
    }
  } catch (err) {
    // Fallback: usar histórico salvo se falhar ao criar novo
    const historicoIdSalvo = await getDpoteHistoricoId(tenantId, configComDpote.empresaSlug, mesSigla);
    if (historicoIdSalvo) {
      const dadosApi = await cashbarberBuscarValorAssinaturas(token, historicoIdSalvo);
      if (dadosApi && dadosApi.valorAssinaturas > 0) {
        valorAssinaturas = dadosApi.valorAssinaturas;
        console.log(`[CashBarber Dpote] Fallback histórico #${historicoIdSalvo}: R$ ${valorAssinaturas} assinaturas`);
      }
    }
    console.warn(`[CashBarber Dpote] Falha ao criar novo histórico, usando fallback:`, err);
  }

  // Calcular período
  const hoje = new Date();
  const hojeBRTInicial = new Date(hoje.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ehMesAtual = mes === hojeBRTInicial.getMonth() + 1 && ano === hojeBRTInicial.getFullYear();

  // Usar cashbarberCalcularDpoteViaHistorico — mesma lógica do botão 'Aplicar no Faturamento'
  // Isso garante que o job automático produza exatamente o mesmo resultado que o botão manual.
  // Busca o histórico mais recente válido a partir do ID criado/salvo.
  const historicoIdParaCalculo = await getDpoteHistoricoId(tenantId, configComDpote.empresaSlug, mesSigla);
  const idInicial = historicoIdParaCalculo ?? 68539;
  const esMesVigente = ehMesAtual;
  const resultadoHistorico = await cashbarberCalcularDpoteViaHistorico(token, idInicial, esMesVigente);

  // Converter o resultado para o formato esperado pelo restante da função
  const resultados: Array<{ filialNome: string; valorDistribuido: number }> = resultadoHistorico
    ? resultadoHistorico.filiais.map((f) => ({ filialNome: f.filialNome, valorDistribuido: f.valorDistribuido }))
    : [];

  // Atualizar valorAssinaturas com o valor real do histórico (se disponível)
  if (resultadoHistorico && resultadoHistorico.valorAssinaturas > 0) {
    valorAssinaturas = resultadoHistorico.valorAssinaturas;
    console.log(`[CashBarber Dpote] Histórico #${resultadoHistorico.historicoId} usado para distribuição: R$ ${valorAssinaturas} assinaturas`);
  }

  const totalDiasMes = new Date(ano, mes, 0).getDate();
  const aplicados: ResultadoAplicacaoDpote["aplicados"] = [];
  const naoEncontrados: string[] = [];
  // Determinar dia vigente para aplicar a regra: passados/hoje = valor diário; futuros = 0
  // IMPORTANTE: Usar horário de Brasília (BRT) para determinar o dia vigente,
  // pois o deploy pode estar em UTC e new Date().getDate() retornaria o dia seguinte após 21h BRT.
  const hojeAplic = new Date();
  const hojeBRT = new Date(hojeAplic.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const ehMesAtualAplic = mes === hojeBRT.getMonth() + 1 && ano === hojeBRT.getFullYear();
  const diaVigenteAplic = hojeBRT.getDate();
  // Dias realizados: para mês atual = dias até hoje (BRT); para meses passados = total do mês
  const diasRealizadosAplic = ehMesAtualAplic ? diaVigenteAplic : totalDiasMes;
  for (const config of configs) {
    if (!config.dpoteFilialNome) continue;
    const nomeBusca = config.dpoteFilialNome.trim().toLowerCase();
    const filial = resultados.find((r) => r.filialNome.toLowerCase().includes(nomeBusca));
    if (!filial) {
      naoEncontrados.push(config.empresaSlug);
      continue;
    }

    // O Dpote sempre sobrescreve o cat9, independente da fonte (manual ou automático).
    // O valor calculado por fichas ponderadas é sempre o mais preciso e atualizado.
    const recorrenciaFonteAtual = (config as any).recorrenciaFonte ?? "cashbarber";
    console.log(`[CashBarber Dpote] ${config.empresaSlug}: aplicando Dpote (fonte atual: ${recorrenciaFonteAtual})`);


    // Valor diário = total ÷ dias JA REALIZADOS (até hoje para mês atual)
    // Garante que a soma até hoje = valor total do Dpote
    const valorDiario = Math.round((filial.valorDistribuido / diasRealizadosAplic) * 100) / 100;

    // Verificar se a quinzena (dias 1-15) já foi fechada com snapshot para este mês/empresa
    // Se sim, não alterar o cat9 dos dias 1-15 para preservar o valor definitivo do fechamento
    let quinzenaFechada = false;
    try {
      const db = await import("../drizzle/schema.js").then(async (schema) => {
        const { getDb } = await import("./db.js");
        return { schema, db: await getDb() };
      });
      if (db.db) {
        const { and, eq } = await import("drizzle-orm");
        const snapshots = await db.db
          .select()
          .from(db.schema.snapshotQuinzenal)
          .where(
            and(
              eq(db.schema.snapshotQuinzenal.tenantId, tenantId),
              eq(db.schema.snapshotQuinzenal.empresaSlug, config.empresaSlug),
              eq(db.schema.snapshotQuinzenal.mes, mes),
              eq(db.schema.snapshotQuinzenal.ano, ano)
            )
          )
          .limit(1);
        quinzenaFechada = snapshots.length > 0;
        if (quinzenaFechada) {
          console.log(`[CashBarber Dpote] ${config.empresaSlug}: quinzena ${mes}/${ano} já fechada (snapshot existente) — dias 1-15 protegidos contra alteração de cat9`);
        }
      }
    } catch (snapCheckErr) {
      console.warn(`[CashBarber Dpote] ${config.empresaSlug}: erro ao verificar snapshot quinzenal, prosseguindo sem proteção:`, snapCheckErr);
    }

    for (let dia = 1; dia <= totalDiasMes; dia++) {
      const dataStr = `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const existente = await getFaturamentoByDataEmpresaTenant(dataStr, config.empresaSlug, tenantId);

      // Regra: dias passados e o dia vigente recebem valor diário; dias futuros recebem "0"
      const diaFuturoAplic = ehMesAtualAplic && dia > diaVigenteAplic;

      // Proteção: não alterar cat9 dos dias 1-15 quando:
      // 1. A quinzena já foi fechada (snapshot existe), OU
      // 2. Estamos no mês atual e já passamos do dia 15 (quinzena encerrada naturalmente)
      // Isso garante que o valor da quinzena não é retroativamente alterado pelo sync.
      const quinzenaProtegida = quinzenaFechada || (ehMesAtualAplic && diaVigenteAplic > 15);
      if (quinzenaProtegida && dia <= 15) {
        // Manter o cat9 existente sem alteração
        continue;
      }

      const cat9Valor = diaFuturoAplic ? "0" : String(valorDiario);

      await upsertFaturamento({
        tenantId,
        empresaSlug: config.empresaSlug,
        data: dataStr,
        cat1: existente?.cat1 ?? "0",
        cat2: existente?.cat2 ?? "0",
        cat3: existente?.cat3 ?? "0",
        cat4: existente?.cat4 ?? "0",
        cat6: existente?.cat6 ?? "0",
        cat7: existente?.cat7 ?? "0",
        cat8: existente?.cat8 ?? "0",
        cat9: cat9Valor,
        sincronizadoCB: existente?.sincronizadoCB ?? 0,
        observacao: existente?.observacao ?? undefined,
        lancadoPor: existente?.lancadoPor ?? undefined,
      });
    }

    // Previsão para o mês seguinte: distribuir o valor total do mês atual como estimativa
    // Cada dia do próximo mês recebe valorDiario como previsão
    // Quando chegar o dia vigente no mês seguinte, a sync sobrescreverá com o valor real
    const mesProximo = mes === 12 ? 1 : mes + 1;
    const anoProximo = mes === 12 ? ano + 1 : ano;
    const totalDiasMesProximo = new Date(anoProximo, mesProximo, 0).getDate();
    const valorDiarioPrevisao = Math.round((filial.valorDistribuido / totalDiasMesProximo) * 100) / 100;

    for (let dia = 1; dia <= totalDiasMesProximo; dia++) {
      const dataStr = `${anoProximo}-${String(mesProximo).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
      const existente = await getFaturamentoByDataEmpresaTenant(dataStr, config.empresaSlug, tenantId);

      // Só preencher previsão se não houver valor real já lançado (cat9 != "0" e sincronizadoCB=1)
      // Isso evita sobrescrever um valor apurado real com a previsão
      const jaTemValorReal = existente?.sincronizadoCB === 1 && existente?.cat9 && existente.cat9 !== "0";
      if (jaTemValorReal) continue;

      await upsertFaturamento({
        tenantId,
        empresaSlug: config.empresaSlug,
        data: dataStr,
        cat1: existente?.cat1 ?? "0",
        cat2: existente?.cat2 ?? "0",
        cat3: existente?.cat3 ?? "0",
        cat4: existente?.cat4 ?? "0",
        cat6: existente?.cat6 ?? "0",
        cat7: existente?.cat7 ?? "0",
        cat8: existente?.cat8 ?? "0",
        cat9: String(valorDiarioPrevisao),
        sincronizadoCB: 0, // marca como previsão (não sincronizado do CashBarber)
        observacao: existente?.observacao ?? undefined,
        lancadoPor: existente?.lancadoPor ?? undefined,
      });
    }

    aplicados.push({
      empresaSlug: config.empresaSlug,
      filialNome: filial.filialNome,
      valorDistribuido: filial.valorDistribuido,
    });

    console.log(`[CashBarber Dpote] cat9 (Recorrência) distribuído para ${config.empresaSlug}: R$ ${valorDiario.toFixed(2)}/dia × ${diasRealizadosAplic} dias = R$ ${filial.valorDistribuido.toFixed(2)} total | previsão ${mesProximo}/${anoProximo}: R$ ${valorDiarioPrevisao.toFixed(2)}/dia`);
  }

  return { aplicados, naoEncontrados, totalAssinaturas: valorAssinaturas };
}
