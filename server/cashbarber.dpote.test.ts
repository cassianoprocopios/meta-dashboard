/**
 * Testes unitários para cashbarberBuscarValorAssinaturas
 *
 * Usa injeção de dependência (_buscarHistorico) para isolar a função
 * sem depender de vi.mock ou vi.spyOn em chamadas internas do mesmo módulo.
 *
 * Cobre os cenários:
 * 1. Retorna valorAssinaturas e porcentagemBarbearia quando API responde com dados válidos
 * 2. Retorna null quando API retorna valor_ganho_assinaturas = 0
 * 3. Retorna null quando API retorna valor_ganho_assinaturas não numérico (null)
 * 4. Retorna null quando _buscarHistorico lança exceção (falha de rede)
 * 5. Retorna null quando API retorna HTTP 404 (histórico não encontrado)
 */

import { describe, it, expect, vi } from "vitest";
import { cashbarberBuscarValorAssinaturas } from "./cashbarber";
import type { CashbarberDpoteHistorico } from "./cashbarber";

const TOKEN = "fake-jwt-token";
const HISTORICO_ID = 68346;

function makeHistorico(overrides: Partial<CashbarberDpoteHistorico["faturamento"]> = {}): CashbarberDpoteHistorico {
  return {
    faturamento: {
      valor_ganho_assinaturas: 63845,
      porcentagem_comissao_barbearias: 65,
      porcentagem_comissao_barbeiros: 35,
      ...overrides,
    },
    filiais_servicos: [],
  };
}

describe("cashbarberBuscarValorAssinaturas", () => {
  it("retorna valorAssinaturas e porcentagemBarbearia quando API responde com dados válidos", async () => {
    const mockBuscar = vi.fn().mockResolvedValueOnce(makeHistorico());

    const resultado = await cashbarberBuscarValorAssinaturas(TOKEN, HISTORICO_ID, mockBuscar);

    expect(resultado).not.toBeNull();
    expect(resultado?.valorAssinaturas).toBe(63845);
    expect(resultado?.porcentagemBarbearia).toBe(65);
    expect(mockBuscar).toHaveBeenCalledWith(TOKEN, HISTORICO_ID);
  });

  it("retorna null quando valor_ganho_assinaturas é zero", async () => {
    const mockBuscar = vi.fn().mockResolvedValueOnce(
      makeHistorico({ valor_ganho_assinaturas: 0 })
    );

    const resultado = await cashbarberBuscarValorAssinaturas(TOKEN, HISTORICO_ID, mockBuscar);

    expect(resultado).toBeNull();
  });

  it("retorna null quando valor_ganho_assinaturas não é número (null)", async () => {
    const mockBuscar = vi.fn().mockResolvedValueOnce(
      makeHistorico({ valor_ganho_assinaturas: null as unknown as number })
    );

    const resultado = await cashbarberBuscarValorAssinaturas(TOKEN, HISTORICO_ID, mockBuscar);

    expect(resultado).toBeNull();
  });

  it("retorna null quando _buscarHistorico lança exceção (falha de rede)", async () => {
    const mockBuscar = vi.fn().mockRejectedValueOnce(
      new Error("Network error: fetch failed")
    );

    const resultado = await cashbarberBuscarValorAssinaturas(TOKEN, HISTORICO_ID, mockBuscar);

    expect(resultado).toBeNull();
  });

  it("retorna null quando API retorna HTTP 404 (histórico não encontrado)", async () => {
    const mockBuscar = vi.fn().mockRejectedValueOnce(
      new Error("CashBarber buscarHistoricoDpote falhou: 404 Not Found")
    );

    const resultado = await cashbarberBuscarValorAssinaturas(TOKEN, HISTORICO_ID, mockBuscar);

    expect(resultado).toBeNull();
  });
});
