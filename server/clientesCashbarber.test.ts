import { afterEach, describe, expect, it, vi } from "vitest";
import { cashbarberRelatorio09 } from "./cashbarber";
import {
  normalizarSlugUnidadeCashbarber,
  resumirClientesRelatorio09,
} from "../shared/clientesCashbarber";

describe("Relatório 09 de clientes CashBarber", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("conta clientes_totais sem duplicar IDs e preserva recortes de clube", () => {
    const resumo = resumirClientesRelatorio09({
      clientes_totais: [
        { id: 10, cli_name: "Cliente A" },
        { id: 10, cli_name: "Cliente A" },
        { id: 20, cli_name: "Cliente B" },
      ],
      cliente_com_clube: ["Cliente A", "Cliente A"],
      cliente_sem_clube: ["Cliente B"],
    });

    expect(resumo).toEqual({
      totalClientes: 2,
      clientesComClube: 1,
      clientesSemClube: 1,
    });
  });

  it("usa a união dos nomes como fallback sem contar o mesmo cliente duas vezes", () => {
    const resumo = resumirClientesRelatorio09({
      cliente_com_clube: ["João", "Maria"],
      cliente_sem_clube: ["Joao", "Carlos"],
    });

    expect(resumo.totalClientes).toBe(3);
  });

  it("normaliza os slugs configurados para os nomes usados pelo dashboard", () => {
    expect(normalizarSlugUnidadeCashbarber("barbiero-morumbi")).toBe("MORUMBI");
    expect(normalizarSlugUnidadeCashbarber("barbiero-mascote")).toBe("MASCOTE");
    expect(normalizarSlugUnidadeCashbarber("barbiero-seraphine")).toBe("SERAPHINE");
  });

  it("consulta a rota oficial com zero à esquerda e o filtro da filial", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ clientes_totais: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await cashbarberRelatorio09("token-seguro", "2026-09-01", "2026-09-30", 144);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.cashbarber.com.br/api/painel/relatorios/09",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          data_inicial: "2026-09-01",
          data_final: "2026-09-30",
          filial: 144,
        }),
      })
    );
  });
});
