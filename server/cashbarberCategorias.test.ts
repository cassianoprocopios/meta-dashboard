import { describe, expect, it } from "vitest";
import {
  destinoCategoriaCashBarber,
  destinoServicoCashBarberPorNome,
  empresaUsaCashBarber,
} from "../shared/cashbarberCategorias";
import { calcularFaturamentoPorCategoriaComCatalogo } from "./cashbarber";
import { getCategoriasMapeadas } from "./cashbarberSincronizador";

describe("mapeamento completo CashBarber", () => {
  it("exclui Seraphine e mantém unidades padrão na integração", () => {
    expect(empresaUsaCashBarber("seraphine")).toBe(false);
    expect(empresaUsaCashBarber("padrao")).toBe(true);
  });

  it.each([
    ["Auxiliar", "servico", "cat3"],
    ["AVULSO/CLUBE", "servico", "cat1"],
    ["Estética", "servico", "cat11"],
    ["Pacote", "servico", "cat10"],
    ["SERVIÇO EXTRA", "servico", "cat2"],
    ["Bar", "produto", "cat8"],
    ["Barbiero", "produto", "cat7"],
    ["Caixinha", "produto", "cat6"],
    ["Keune", "produto", "cat4"],
    ["Óleo Essencial", "produto", "cat12"],
    ["Don Alcides", "produto", "cat5"],
  ] as const)("mapeia %s para %s", (nome, tipo, esperado) => {
    expect(destinoCategoriaCashBarber(nome, tipo)).toBe(esperado);
  });

  it("reconhece Pacote Corte pelo nome comercial", () => {
    expect(destinoServicoCashBarberPorNome("Pacote Corte")).toBe("cat10");
    expect(destinoServicoCashBarberPorNome("PACOTES PROMOCIONAIS")).toBe("cat10");
    expect(destinoServicoCashBarberPorNome("Corte Masculino")).toBeNull();
  });

  it("permite sincronizar cat10 a cat12 e mantém cat9 exclusivo do Dpote", () => {
    const categorias = getCategoriasMapeadas([
      { metaCategoria: "cat2" },
      { metaCategoria: "cat9" },
      { metaCategoria: "cat10" },
      { metaCategoria: "cat11" },
      { metaCategoria: "cat12" },
    ]);
    expect([...categorias]).toEqual(["cat2", "cat10", "cat11", "cat12"]);
  });

  it("separa Pacote mesmo quando o CashBarber o cadastra em Serviço Extra", () => {
    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      {
        servicos: [{ ags_id_servico: 89124, ser_nome: "Pacote Corte", sum: 1200 }],
        produtos: [],
      } as any,
      [
        { tipo: "servico_categoria", cbId: "605", cbNome: "SERVIÇO EXTRA", metaCategoria: "cat2" },
        { tipo: "servico_categoria", cbId: "28267", cbNome: "Pacote", metaCategoria: "cat10" },
      ],
      [{ id: 89124, ser_id_categoria: 605, ser_nome: "Pacote Corte" }] as any,
      []
    );

    expect(resultado.cat2).toBe(0);
    expect(resultado.cat10).toBe(1200);
    expect(resultado.totalGeral).toBe(1200);
  });

  it("mantém Estética, Pacote e Óleo Essencial em totais separados", () => {
    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      {
        servicos: [
          { ags_id_servico: 101, ser_nome: "Estética", sum: 120 },
          { ags_id_servico: 102, ser_nome: "Pacote", sum: 250 },
        ],
        produtos: [{ cop_id_produto: 201, pro_nome: "Óleo Essencial", total: 80 }],
      } as any,
      [
        { tipo: "servico_categoria", cbId: "28614", cbNome: "Estética", metaCategoria: "cat11" },
        { tipo: "servico_categoria", cbId: "28267", cbNome: "Pacote", metaCategoria: "cat10" },
        { tipo: "produto_categoria", cbId: "29283", cbNome: "Óleo Essencial", metaCategoria: "cat12" },
      ],
      [
        { id: 101, ser_id_categoria: 28614, ser_nome: "Estética" },
        { id: 102, ser_id_categoria: 28267, ser_nome: "Pacote" },
      ] as any,
      [{ id: 201, pro_id_categoria: 29283, pro_nome: "Óleo Essencial" }] as any
    );

    expect(resultado.cat11).toBe(120);
    expect(resultado.cat10).toBe(250);
    expect(resultado.cat12).toBe(80);
    expect(resultado.cat9).toBe(0);
    expect(resultado.totalGeral).toBe(450);
  });
});
