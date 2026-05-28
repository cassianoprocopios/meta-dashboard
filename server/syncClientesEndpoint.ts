/**
 * Endpoint para sincronizar clientes do CashBarber
 * Pode ser chamado manualmente ou via agendamento
 */

import { Request, Response } from "express";
import { sincronizarClientesMensal, sincronizarClientesMensalManual } from "./syncClientesMensalJob";

/**
 * POST /api/sync/clientes-mensal
 * Sincroniza clientes do CashBarber
 */
export async function syncClientesMensalEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const { action, mes, ano } = req.body;

    if (action === "sincronizar-clientes-mensal") {
      // Sincronização automática (mês anterior)
      await sincronizarClientesMensal();
      res.json({ sucesso: true, mensagem: "Sincronização iniciada" });
    } else if (action === "sincronizar-manual" && mes && ano) {
      // Sincronização manual (mês específico)
      const resultado = await sincronizarClientesMensalManual(mes, ano);
      res.json(resultado);
    } else {
      res.status(400).json({ sucesso: false, mensagem: "Ação ou parâmetros inválidos" });
    }
  } catch (erro) {
    console.error("[Sync Endpoint] Erro:", erro);
    res.status(500).json({
      sucesso: false,
      mensagem: erro instanceof Error ? erro.message : "Erro desconhecido",
    });
  }
}
