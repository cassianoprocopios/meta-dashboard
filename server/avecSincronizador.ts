/**
 * Módulo de sincronização do Avec (Seraphine Beauty)
 *
 * Contém a lógica de sincronização reutilizável tanto pelo job automático
 * quanto pela procedure manual (trpc.avec.sincronizar).
 *
 * O Avec alimenta as categorias mapeadas (ex: cat1=Serviços, cat2=Produtos, etc.)
 * com base no relatório 0184 (faturamento por categoria por dia).
 */

import {
  upsertFaturamento,
  getFaturamentoByDataEmpresaTenant,
  getAvecConfig,
  listAvecMapeamento,
  updateAvecSyncStatus,
  insertAvecSyncLog,
} from "./db";
import {
  avecLogin,
  avecBuscarFaturamentoDiaPorCategoria,
} from "./avec";
import {
  avecApiBuscarRelatorio0184,
  avecAgregarPorDataECategoria,
  AVEC_TIPO_VENDA_PADRAO,
} from "./avecApiClient";

export interface ResultadoSincronizacaoAvec {
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
 * Retorna o último dia do mês
 */
function ultimoDiaDoMes(mes: number, ano: number): number {
  return new Date(ano, mes, 0).getDate();
}

/**
 * Formata data para string ISO "YYYY-MM-DD"
 */
function formatarDataISO(dia: number, mes: number, ano: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/**
 * Sincroniza o faturamento do Avec para uma empresa específica.
 * Busca os dados do Avec dia a dia e salva no banco de dados.
 *
 * @param tenantId - ID do tenant
 * @param empresaSlug - Slug da empresa (ex: "seraphine")
 * @param mes - Mês (1-12)
 * @param ano - Ano (ex: 2026)
 * @param origem - "auto" (job) ou "manual" (usuário)
 */
export async function sincronizarFaturamentoAvec(
  tenantId: number,
  empresaSlug: string,
  mes: number,
  ano: number,
  origem: "auto" | "manual" = "manual"
): Promise<ResultadoSincronizacaoAvec> {
  const resultado: ResultadoSincronizacaoAvec = {
    diasSincronizados: 0,
    diasIgnorados: 0,
    detalhes: [],
  };

  // 1. Buscar configuração do Avec para esta empresa
  const config = await getAvecConfig(tenantId, empresaSlug);

  if (!config || !config.ativo) {
    throw new Error(`Avec: configuração não encontrada ou inativa para ${empresaSlug}`);
  }

  // 2. Buscar mapeamento de categorias
  const mapeamentos = await listAvecMapeamento(tenantId, empresaSlug);

  if (mapeamentos.length === 0) {
    throw new Error(`Avec: nenhum mapeamento de categorias configurado para ${empresaSlug}`);
  }

  // 3. Determinar o intervalo de dias a sincronizar
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const diaAtual = hoje.getDate();

  const ultimoDia = (mes === mesAtual && ano === anoAtual)
    ? diaAtual
    : ultimoDiaDoMes(mes, ano);

  // 4. Escolher método de sincronização: API Token Bearer (preferível) > Cookie Manual > Login Automático
  const apiToken = config.avecApiToken?.trim();
  const sessionCookieManual = config.avecSessionCookie?.trim();

  if (apiToken) {
    // ─── Método 1: API Token Bearer (api.avec.beauty) ───────────────────────────
    console.log(`[Avec] Usando API Token Bearer para ${empresaSlug}`);

    // Construir mapeamento a partir dos mapeamentos salvos no banco
    const mapeamentoCustom: Record<string, string> = {};
    for (const m of mapeamentos) {
      if (m.metaCategoria !== "ignorar") {
        mapeamentoCustom[m.avecCategoria] = m.metaCategoria;
      }
    }
    // Usar mapeamento padrão como fallback
    const mapeamentoFinal = Object.keys(mapeamentoCustom).length > 0
      ? { ...AVEC_TIPO_VENDA_PADRAO, ...mapeamentoCustom }
      : AVEC_TIPO_VENDA_PADRAO;

    // Buscar todos os dados do período de uma vez via API oficial
    const inicioData = new Date(ano, mes - 1, 1);
    const fimData = new Date(ano, mes - 1, ultimoDia);

    let itensApi;
    try {
      itensApi = await avecApiBuscarRelatorio0184(apiToken, inicioData, fimData);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await insertAvecSyncLog({
        tenantId, empresaSlug, mes, ano, origem,
        status: "erro", diasSincronizados: 0, diasIgnorados: 0, erros: msg,
      });
      await updateAvecSyncStatus(tenantId, empresaSlug, "erro");
      throw new Error(`Avec API: ${msg}`);
    }

    // Agregar por data e categoria
    const agregado = avecAgregarPorDataECategoria(itensApi, mapeamentoFinal);

    // Salvar cada dia
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = formatarDataISO(dia, mes, ano);
      const dadosDia = agregado[dataISO];

      if (!dadosDia || Object.values(dadosDia).every(v => v === 0)) {
        resultado.diasIgnorados++;
        resultado.detalhes.push({
          data: dataISO,
          status: "ignorado",
          totalGeral: 0,
          mensagem: "Sem faturamento",
        });
        continue;
      }

      const totalDia = Object.values(dadosDia).reduce((sum, v) => sum + v, 0);

      // Filtrar apenas categorias com valor > 0
      const faturamentoParcial: Record<string, number> = {};
      for (const [cat, val] of Object.entries(dadosDia)) {
        if (val > 0) faturamentoParcial[cat] = val;
      }

      try {
        const existente = await getFaturamentoByDataEmpresaTenant(dataISO, empresaSlug, tenantId);
        const dadosUpsert = existente
          ? {
              id: existente.id,
              tenantId,
              empresaSlug,
              data: dataISO,
              cat1: existente.cat1 ?? null,
              cat2: existente.cat2 ?? null,
              cat3: existente.cat3 ?? null,
              cat4: existente.cat4 ?? null,
              cat5: existente.cat5 ?? null,
              ...faturamentoParcial,
            }
          : { tenantId, empresaSlug, data: dataISO, ...faturamentoParcial };

        await upsertFaturamento(dadosUpsert as any);
        resultado.diasSincronizados++;
        resultado.detalhes.push({ data: dataISO, status: "sincronizado", totalGeral: totalDia });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        resultado.erros = resultado.erros ? `${resultado.erros}; ${msg}` : msg;
        resultado.detalhes.push({ data: dataISO, status: "erro", mensagem: msg });
      }
    }
  } else {
    // ─── Método 2: Cookie de Sessão (admin.avec.beauty) ────────────────────────
    let sessionCookie: string;
    if (sessionCookieManual) {
      sessionCookie = sessionCookieManual;
      console.log(`[Avec] Usando cookie de sessão manual para ${empresaSlug}`);
    } else {
      // Tentar login automático (pode ser bloqueado por WAF em ambientes de servidor)
      try {
        sessionCookie = await avecLogin(config.avecEmail, config.avecSenha);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await insertAvecSyncLog({
          tenantId, empresaSlug, mes, ano, origem,
          status: "erro", diasSincronizados: 0, diasIgnorados: 0, erros: msg,
        });
        await updateAvecSyncStatus(tenantId, empresaSlug, "erro");
        throw new Error(`Avec: falha no login — ${msg}. Dica: configure o API Token ou um cookie de sessão manual no painel Avec.`);
      }
    }

    // 5. Sincronizar dia a dia via cookie de sessão
    for (let dia = 1; dia <= ultimoDia; dia++) {
      const dataISO = formatarDataISO(dia, mes, ano);

      try {
        // Buscar faturamento por categoria do dia
        const categorias = await avecBuscarFaturamentoDiaPorCategoria(
          sessionCookie,
          config.avecSalaoId,
          dia,
          mes,
          ano
        );

        // Calcular total do dia
        const totalDia = categorias.reduce((sum, c) => sum + c.valor, 0);

        if (totalDia === 0) {
          resultado.diasIgnorados++;
          resultado.detalhes.push({
            data: dataISO,
            status: "ignorado",
            totalGeral: 0,
            mensagem: "Sem faturamento",
          });
          continue;
        }

        // Mapear categorias para cat1-cat5
        const faturamentoParcial: Record<string, number> = {};
        for (const mapeamento of mapeamentos) {
          if (mapeamento.metaCategoria === "ignorar") continue;

          // Encontrar a categoria correspondente no resultado do Avec
          const categoriaAvec = categorias.find(c =>
            c.categoria.toLowerCase().includes(mapeamento.avecCategoria.toLowerCase()) ||
            mapeamento.avecCategoria.toLowerCase().includes(c.categoria.toLowerCase())
          );

          if (categoriaAvec && categoriaAvec.valor > 0) {
            const catKey = mapeamento.metaCategoria; // ex: "cat1"
            faturamentoParcial[catKey] = (faturamentoParcial[catKey] || 0) + categoriaAvec.valor;
          }
        }

        // Verificar se há algo a salvar
        if (Object.keys(faturamentoParcial).length === 0) {
          resultado.diasIgnorados++;
          resultado.detalhes.push({
            data: dataISO,
            status: "ignorado",
            totalGeral: totalDia,
            mensagem: "Nenhuma categoria mapeada com valor",
          });
          continue;
        }

        // Buscar faturamento existente para este dia/empresa
        const existente = await getFaturamentoByDataEmpresaTenant(dataISO, empresaSlug, tenantId);

        // Montar o objeto de upsert preservando campos não gerenciados pelo Avec
        const dadosUpsert = existente
          ? {
              id: existente.id,
              tenantId,
              empresaSlug,
              data: dataISO,
              cat1: existente.cat1 ?? null,
              cat2: existente.cat2 ?? null,
              cat3: existente.cat3 ?? null,
              cat4: existente.cat4 ?? null,
              cat5: existente.cat5 ?? null,
              ...faturamentoParcial,
            }
          : {
              tenantId,
              empresaSlug,
              data: dataISO,
              ...faturamentoParcial,
            };

        await upsertFaturamento(dadosUpsert as any);

        resultado.diasSincronizados++;
        resultado.detalhes.push({
          data: dataISO,
          status: "sincronizado",
          totalGeral: totalDia,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        resultado.erros = resultado.erros ? `${resultado.erros}; ${msg}` : msg;
        resultado.detalhes.push({
          data: dataISO,
          status: "erro",
          mensagem: msg,
        });
      }
    }
  }

  // 6. Atualizar status da configuração
  const status = resultado.erros ? "erro" : "ok";
  await updateAvecSyncStatus(tenantId, empresaSlug, status);

  // 7. Registrar log
  await insertAvecSyncLog({
    tenantId,
    empresaSlug,
    mes,
    ano,
    origem,
    status: status as "ok" | "erro" | "parcial",
    diasSincronizados: resultado.diasSincronizados,
    diasIgnorados: resultado.diasIgnorados,
    erros: resultado.erros,
  });

  return resultado;
}
