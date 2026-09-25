import { insertCashbarberSyncLog } from "./db";
import { sincronizarClientesCashbarberPeriodo } from "./clientesCashbarberService";

const TENANT_ID = 1;

/** Sincroniza o mês anterior usando exclusivamente a API oficial do CashBarber. */
export async function sincronizarClientesMensal(): Promise<void> {
  const agoraBRT = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const dataAnterior = new Date(agoraBRT.getFullYear(), agoraBRT.getMonth() - 1, 1);
  const mes = dataAnterior.getMonth() + 1;
  const ano = dataAnterior.getFullYear();

  try {
    const resultado = await sincronizarClientesCashbarberPeriodo(TENANT_ID, mes, ano);
    console.log(`[Sync Clientes] Relatório 09 concluído para ${mes}/${ano}: ${resultado.totalGeral}`);
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "barbiero-grupo",
      origem: "auto",
      status: "ok",
      mes,
      ano,
      diasSincronizados: 0,
      diasIgnorados: 0,
    }).catch(() => {});
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : String(erro);
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "barbiero-grupo",
      origem: "auto",
      status: "erro",
      mes,
      ano,
      diasSincronizados: 0,
      diasIgnorados: 0,
      erros: mensagem,
    }).catch(() => {});
    throw erro;
  }
}

/** Sincronização manual de um mês específico pela API oficial. */
export async function sincronizarClientesMensalManual(
  mes: number,
  ano: number
): Promise<{ sucesso: boolean; mensagem: string; totalClientes: number }> {
  try {
    const resultado = await sincronizarClientesCashbarberPeriodo(TENANT_ID, mes, ano);
    const mensagem = `CashBarber atualizado: ${resultado.totalGeral} clientes distintos`;
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "barbiero-grupo",
      origem: "manual",
      status: "ok",
      mes,
      ano,
      diasSincronizados: 0,
      diasIgnorados: 0,
    }).catch(() => {});
    return { sucesso: true, mensagem, totalClientes: resultado.totalGeral };
  } catch (erro) {
    const mensagemErro = erro instanceof Error ? erro.message : String(erro);
    await insertCashbarberSyncLog({
      tenantId: TENANT_ID,
      empresaSlug: "barbiero-grupo",
      origem: "manual",
      status: "erro",
      mes,
      ano,
      diasSincronizados: 0,
      diasIgnorados: 0,
      erros: mensagemErro,
    }).catch(() => {});
    return {
      sucesso: false,
      mensagem: `Erro na sincronização: ${mensagemErro}`,
      totalClientes: 0,
    };
  }
}
