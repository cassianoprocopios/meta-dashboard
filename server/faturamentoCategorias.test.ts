import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  FATURAMENTO_CATEGORIA_KEYS,
  obterCategoriaKeys,
  obterValoresCategorias,
  somarCategoriasPorColuna,
  somarFaturamentoOperacional,
  somarFaturamentoTotal,
} from "../shared/faturamentoCategorias";

describe("alinhamento das categorias de faturamento", () => {
  it("mantém as doze categorias na mesma ordem das colunas do dashboard", () => {
    expect(FATURAMENTO_CATEGORIA_KEYS).toEqual([
      "cat1", "cat2", "cat3", "cat4", "cat5", "cat6",
      "cat7", "cat8", "cat9", "cat10", "cat11", "cat12",
    ]);
  });

  it("soma Pacote, Estética e Óleo Essencial em suas próprias colunas", () => {
    const linhas = [
      { cat2: "100", cat9: "200", cat10: "300", cat11: "40", cat12: "50" },
      { cat2: "10", cat9: "20", cat10: "30", cat11: "4", cat12: "5" },
    ];
    const totais = somarCategoriasPorColuna(linhas);

    expect(totais[1]).toBe(110);
    expect(totais[8]).toBe(220);
    expect(totais[9]).toBe(330);
    expect(totais[10]).toBe(44);
    expect(totais[11]).toBe(55);
  });

  it("inclui Pacote no total financeiro do CashBarber", () => {
    const linha = {
      cat1: "100",
      cat9: "200",
      cat10: "300",
      cat11: "40",
      cat12: "50",
    };

    expect(somarFaturamentoOperacional(linha)).toBe(490);
    expect(somarFaturamentoTotal(linha)).toBe(690);
    expect(obterValoresCategorias(linha)[9]).toBe(300);
  });

  it("inclui Óleo Essencial no total do Morumbi", () => {
    expect(somarFaturamentoTotal({ cat1: "1000", cat9: "2000", cat12: "43" })).toBe(3043);
  });

  it("usa somente cat1 para a tabela simplificada da Seraphine", () => {
    const keys = obterCategoriaKeys(1);
    expect(keys).toEqual(["cat1"]);
    expect(obterValoresCategorias({ cat1: "63814", cat10: "999" }, keys)).toEqual([63814]);
  });

  it("faz o rodapé da tela usar a mesma coleção de colunas das linhas", () => {
    const home = readFileSync("client/src/pages/Home.tsx", "utf8");
    expect(home).toContain("somarCategoriasPorColuna(realizados, categoriaKeys)");
    expect(home).toContain("somarCategoriasPorColuna(previstos, categoriaKeys)");
    expect(home).toContain("categoriaKeys.map((key)");
    expect(home).not.toContain("[0,1,2,3,4,5,6,7,8].map");
  });
});
