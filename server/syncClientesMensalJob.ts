/**
 * Job para sincronizar clientes do CashBarber mensalmente
 * Executa no primeiro dia de cada mês às 00:00
 */

import { extrairClientesTodosUnidades, fecharBrowser } from "./cashbarberClientesScraper";
import { insertCashbarberSyncLog, updateCashbarberSyncStatus } from "./db";

const TENANT_ID = 1; // ID do tenant padrão

/**
 * Sincroniza clientes do CashBarber para o mês anterior
 * (executado no primeiro dia do mês para pegar dados do mês anterior)
 */
export async function sincronizarClientesMensal(): Promise<void> {
  const agora = new Date();
  const mesAnterior = agora.getMonth(); // 0-11
  const anoAnterior = mesAnterior === 0 ? agora.getFullYear() - 1 : agora.getFullYear();
  const mesFormatado = mesAnterior === 0 ? 12 : mesAnterior;

  console.log(`[Sync Mensal] Iniciando sincronização para ${mesFormatado}/${anoAnterior}...`);

  const startTime = Date.now();
  let status: "ok" | "erro" | "parcial" = "ok";
  let erros = "";
  let totalClientes = 0;

  try {
    // Extrair dados do CashBarber
    const dados = await extrairClientesTodosUnidades(mesFormatado, anoAnterior);

    // Contar total de clientes
    Object.values(dados).forEach((unidade) => {
      totalClientes += unidade.totalClientesDistintos;
    });

    console.log(`[Sync Mensal] Sincronização concluída: ${totalClientes} clientes`);

    // Registrar log de sucesso
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "CONSOLIDADO",
      origem: "auto",
      status: "ok",
      mes: mesFormatado,
      ano: anoAnterior,
      diasSincronizados: 28,
      diasIgnorados: 0,
    }).catch(() => {});

    // Atualizar status para cada unidade
    const unidades = ["MASCOTE", "MORUMBI", "SERAPHINE"];
    for (const unidade of unidades) {
      await updateCashbarberSyncStatus(TENANT_ID, unidade, "ok").catch(() => {});
    }
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    console.error(`[Sync Mensal] Erro na sincronização:`, erroMsg);

    status = "erro";
    erros = erroMsg;

    // Registrar erro
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "CONSOLIDADO",
      origem: "auto",
      status: "erro",
      mes: mesFormatado,
      ano: anoAnterior,
      diasSincronizados: 0,
      diasIgnorados: 28,
      erros: erroMsg,
    }).catch(() => {});

    // Atualizar status
    const unidades = ["MASCOTE", "MORUMBI", "SERAPHINE"];
    for (const unidade of unidades) {
      await updateCashbarberSyncStatus(TENANT_ID, unidade, `erro: ${erroMsg}`).catch(() => {});
    }
  } finally {
    // Fechar browser
    await fecharBrowser();
  }
}

/**
 * Função para ser chamada via tRPC (manual)
 */
export async function sincronizarClientesMensalManual(
  mes: number,
  ano: number
): Promise<{ sucesso: boolean; mensagem: string; totalClientes: number }> {
  console.log(`[Sync Manual] Iniciando sincronização para ${mes}/${ano}...`);

  const startTime = Date.now();
  let totalClientes = 0;

  try {
    const dados = await extrairClientesTodosUnidades(mes, ano);

    Object.values(dados).forEach((unidade) => {
      totalClientes += unidade.totalClientesDistintos;
    });

    const mensagem = `Sincronização bem-sucedida: ${totalClientes} clientes distintos`;

    // Registrar log
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "CONSOLIDADO",
      origem: "manual",
      status: "ok",
      mes,
      ano,
      diasSincronizados: 28,
      diasIgnorados: 0,
    }).catch(() => {});

    // Atualizar status
    const unidades = ["MASCOTE", "MORUMBI", "SERAPHINE"];
    for (const unidade of unidades) {
      await updateCashbarberSyncStatus(TENANT_ID, unidade, "ok").catch(() => {});
    }

    return { sucesso: true, mensagem, totalClientes };
  } catch (erro) {
    const erroMsg = erro instanceof Error ? erro.message : String(erro);
    const mensagem = `Erro na sincronização: ${erroMsg}`;

    // Registrar erro
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "CONSOLIDADO",
      origem: "manual",
      status: "erro",
      mes,
      ano,
      diasSincronizados: 0,
      diasIgnorados: 28,
      erros: erroMsg,
    }).catch(() => {});

    // Atualizar status
    const unidades = ["MASCOTE", "MORUMBI", "SERAPHINE"];
    for (const unidade of unidades) {
      await updateCashbarberSyncStatus(TENANT_ID, unidade, `erro: ${erroMsg}`).catch(() => {});
    }

    return { sucesso: false, mensagem, totalClientes: 0 };
  } finally {
    await fecharBrowser();
  }
}
