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

  // 3. Fazer login no Avec
  let sessionCookie: string;
  try {
    sessionCookie = await avecLogin(config.avecEmail, config.avecSenha);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await insertAvecSyncLog({
      tenantId, empresaSlug, mes, ano, origem,
      status: "erro", diasSincronizados: 0, diasIgnorados: 0, erros: msg,
    });
    await updateAvecSyncStatus(tenantId, empresaSlug, "erro");
    throw new Error(`Avec: falha no login — ${msg}`);
  }

  // 4. Determinar o intervalo de dias a sincronizar
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const diaAtual = hoje.getDate();

  const ultimoDia = (mes === mesAtual && ano === anoAtual)
    ? diaAtual
    : ultimoDiaDoMes(mes, ano);

  // 5. Sincronizar dia a dia
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
            // Preservar campos não gerenciados pelo Avec
            cat1: existente.cat1 ?? null,
            cat2: existente.cat2 ?? null,
            cat3: existente.cat3 ?? null,
            cat4: existente.cat4 ?? null,
            cat5: existente.cat5 ?? null,
            // Sobrescrever apenas os campos mapeados pelo Avec
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
