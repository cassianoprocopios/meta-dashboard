import { describe, expect, it } from "vitest";
import { calcularFaturamentoPorCategoriaComCatalogo } from "./cashbarber";

describe("Pacote — integração CashBarber", () => {
  it("direciona a categoria Pacote do CashBarber para cat10", () => {
    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      {
        servicos: [{ ags_id_servico: 101, ser_nome: "Pacote Corte + Barba", sum: 180 }],
        produtos: [],
      } as any,
      [{ tipo: "servico_categoria", cbId: "77", cbNome: "Pacote", metaCategoria: "cat10" }],
      [{ id: 101, ser_id_categoria: 77, ser_nome: "Pacote Corte + Barba" }] as any,
      []
    );

    expect(resultado.cat10).toBe(180);
    expect(resultado.cat9).toBe(0);
    expect(resultado.totalGeral).toBe(180);
  });

  it("mantém Recorrência separada de Pacote", () => {
    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      {
        servicos: [{ ags_id_servico: 102, ser_nome: "Pacote Mensal", sum: 250 }],
        produtos: [],
      } as any,
      [{ tipo: "servico_categoria", cbId: "78", cbNome: "Pacote", metaCategoria: "cat10" }],
      [{ id: 102, ser_id_categoria: 78, ser_nome: "Pacote Mensal" }] as any,
      []
    );

    expect(resultado.cat10).toBe(250);
    expect(resultado.cat9).toBe(0);
  });
});
