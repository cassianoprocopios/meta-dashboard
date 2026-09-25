import { readFileSync } from "node:fs";
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
      clientesNovos: 0,
      clientesRecorrentes: 2,
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
    expect(resumo.clientesRecorrentes).toBe(3);
  });

  it("separa clientes novos dos recorrentes pela data de cadastro sem duplicar IDs", () => {
    const resumo = resumirClientesRelatorio09(
      {
        clientes_totais: [
          { id: 10, cli_name: "Novo", created_at: "2026-09-05T14:00:00.000000Z" },
          { id: 10, cli_name: "Novo", created_at: "2026-09-05T14:00:00.000000Z" },
          { id: 20, cli_name: "Recorrente", created_at: "2026-08-10T14:00:00.000000Z" },
          { id: 30, cli_name: "Novo 2", created_at: "2026-09-30T23:00:00.000000Z" },
        ],
      },
      { dataInicial: "2026-09-01", dataFinal: "2026-09-30" }
    );

    expect(resumo.totalClientes).toBe(3);
    expect(resumo.clientesNovos).toBe(2);
    expect(resumo.clientesRecorrentes).toBe(1);
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

  it("expõe filtro por unidade, tooltip detalhado e variação percentual no gráfico", () => {
    const pagina = readFileSync(
      new URL("../client/src/components/ClientesEvolucaoChart.tsx", import.meta.url),
      "utf8"
    );
    const paginaMensal = readFileSync(
      new URL("../client/src/components/ClientesEvolucaoMensalChart.tsx", import.meta.url),
      "utf8"
    );

    expect(pagina).toContain('rotulo: "Consolidado"');
    expect(pagina).toContain('rotulo: "Morumbi"');
    expect(pagina).toContain('rotulo: "Mascote"');
    expect(pagina).toContain("Clientes novos");
    expect(pagina).toContain("Clientes recorrentes");
    expect(pagina).toContain("variacaoPercentual");
    expect(pagina).toContain("LabelList");
    expect(paginaMensal).toContain("dados[dados.length - 2]");
  });
});
