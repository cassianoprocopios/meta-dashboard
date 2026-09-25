import {
  getCashbarberConfig,
  listCashbarberConfigs,
  upsertCashbarberClientesMensal,
} from "./db";
import {
  cashbarberInvalidarTokenCache,
  cashbarberLogin,
  cashbarberRelatorio09,
} from "./cashbarber";
import {
  normalizarSlugUnidadeCashbarber,
  resumirClientesRelatorio09,
} from "../shared/clientesCashbarber";

export interface ResultadoClientesUnidade {
  empresaSlug: string;
  unidade: string;
  totalClientesDistintos: number;
  clientesComClube: number;
  clientesSemClube: number;
  fonte: "cashbarber_relatorio09";
}

function periodoMensal(mes: number, ano: number) {
  const mesTexto = String(mes).padStart(2, "0");
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return {
    dataInicial: `${ano}-${mesTexto}-01`,
    dataFinal: `${ano}-${mesTexto}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

async function buscarRelatorioComRetry(
  email: string,
  senha: string,
  dataInicial: string,
  dataFinal: string,
  filialId: number | null
) {
  let token = await cashbarberLogin(email, senha);
  try {
    return await cashbarberRelatorio09(token, dataInicial, dataFinal, filialId);
  } catch (erro) {
    if (!String(erro).includes("401")) throw erro;
    cashbarberInvalidarTokenCache();
    token = await cashbarberLogin(email, senha);
    return cashbarberRelatorio09(token, dataInicial, dataFinal, filialId);
  }
}

/**
 * Sincroniza os totais de clientes distintos diretamente do Relatório 09.
 * Persiste somente números agregados; nomes, CPF, telefone e demais dados pessoais
 * recebidos da API não são gravados no Meta Dashboard.
 */
export async function sincronizarClientesCashbarberPeriodo(
  tenantId: number,
  mes: number,
  ano: number,
  empresaSlug?: string
): Promise<{ unidades: ResultadoClientesUnidade[]; totalGeral: number }> {
  if (mes < 1 || mes > 12) throw new Error("Mês inválido");
  if (ano < 2020 || ano > 2100) throw new Error("Ano inválido");

  const configs = empresaSlug
    ? [await getCashbarberConfig(tenantId, empresaSlug)].filter(Boolean)
    : await listCashbarberConfigs(tenantId);
  const configsAtivas = configs.filter((config) => {
    if (!config || !config.ativo || !config.cbEmail || !config.cbSenha || !config.cbFilialId) return false;
    return normalizarSlugUnidadeCashbarber(config.empresaSlug) !== "SERAPHINE";
  });

  if (configsAtivas.length === 0) {
    throw new Error("Nenhuma unidade CashBarber ativa e configurada foi encontrada");
  }

  const { dataInicial, dataFinal } = periodoMensal(mes, ano);
  const unidades: ResultadoClientesUnidade[] = [];

  for (const config of configsAtivas) {
    const relatorio = await buscarRelatorioComRetry(
      config!.cbEmail,
      config!.cbSenha,
      dataInicial,
      dataFinal,
      config!.cbFilialId
    );
    const resumo = resumirClientesRelatorio09(relatorio);

    await upsertCashbarberClientesMensal({
      tenantId,
      empresaSlug: config!.empresaSlug,
      mes,
      ano,
      totalClientes: resumo.totalClientes,
      clientesComClube: resumo.clientesComClube,
      clientesSemClube: resumo.clientesSemClube,
      fonte: "cashbarber_relatorio09",
      sincronizadoEm: new Date(),
    });

    unidades.push({
      empresaSlug: config!.empresaSlug,
      unidade: normalizarSlugUnidadeCashbarber(config!.empresaSlug),
      totalClientesDistintos: resumo.totalClientes,
      clientesComClube: resumo.clientesComClube,
      clientesSemClube: resumo.clientesSemClube,
      fonte: "cashbarber_relatorio09",
    });
  }

  // O consolidado é consultado sem filtro de filial para não contar duas vezes
  // o mesmo cliente que visitou Morumbi e Mascote no período.
  const configPrincipal = configsAtivas[0]!;
  const relatorioConsolidado = await buscarRelatorioComRetry(
    configPrincipal.cbEmail,
    configPrincipal.cbSenha,
    dataInicial,
    dataFinal,
    null
  );
  const resumoConsolidado = resumirClientesRelatorio09(relatorioConsolidado);
  await upsertCashbarberClientesMensal({
    tenantId,
    empresaSlug: "barbiero-grupo",
    mes,
    ano,
    totalClientes: resumoConsolidado.totalClientes,
    clientesComClube: resumoConsolidado.clientesComClube,
    clientesSemClube: resumoConsolidado.clientesSemClube,
    fonte: "cashbarber_relatorio09",
    sincronizadoEm: new Date(),
  });

  return {
    unidades,
    totalGeral: resumoConsolidado.totalClientes,
  };
}
