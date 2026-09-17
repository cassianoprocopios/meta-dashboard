/**
 * Testes para o serviço de integração CashBarber
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calcularFaturamentoPorCategoriaComCatalogo,
} from "./cashbarber";

// ─── Dados de teste ───────────────────────────────────────────────────────────

const relatorioMock = {
  servicos: [
    { ags_id_servico: 1, ser_nome: "Corte Masculino", sum: 5000, count: 10 },
    { ags_id_servico: 2, ser_nome: "Barba", sum: 3000, count: 15 },
    { ags_id_servico: 3, ser_nome: "Pacote Clube", sum: 2000, count: 5 },
  ],
  produtos: [
    { cop_id_produto: 101, pro_nome: "Pomada Modeladora", count: "3", total: 1500 },
    { cop_id_produto: 102, pro_nome: "Shampoo", count: "2", total: 800 },
  ],
};

const catalogoServicos = [
  { id: 1, ser_id_categoria: 10, ser_nome: "Corte Masculino", ser_valor: 50 },
  { id: 2, ser_id_categoria: 10, ser_nome: "Barba", ser_valor: 30 },
  { id: 3, ser_id_categoria: 20, ser_nome: "Pacote Clube", ser_valor: 100 },
];

const catalogoProdutos = [
  { id: 101, pro_id_categoria: 30, pro_nome: "Pomada Modeladora", pro_valor: "50" },
  { id: 102, pro_id_categoria: 30, pro_nome: "Shampoo", pro_valor: "40" },
];

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("calcularFaturamentoPorCategoriaComCatalogo", () => {
  it("deve calcular corretamente com mapeamento por categoria de serviço", () => {
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços de Barbearia", metaCategoria: "cat1" },
      { tipo: "servico_categoria" as const, cbId: "20", cbNome: "Pacotes", metaCategoria: "cat3" },
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    // Serviços da categoria 10 (Corte + Barba) → cat1
    expect(resultado.cat1).toBe(8000); // 5000 + 3000
    // Produtos da categoria 30 → cat2
    expect(resultado.cat2).toBe(2300); // 1500 + 800
    // Serviços da categoria 20 (Pacote Clube) → cat3
    expect(resultado.cat3).toBe(2000);
    expect(resultado.cat4).toBe(0);
    expect(resultado.cat5).toBe(0);
    expect(resultado.totalServicos).toBe(10000); // 5000 + 3000 + 2000
    expect(resultado.totalProdutos).toBe(2300); // 1500 + 800
    expect(resultado.totalGeral).toBe(12300);
  });

  it("deve priorizar mapeamento por ID sobre categoria", () => {
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços de Barbearia", metaCategoria: "cat1" },
      { tipo: "servico_categoria" as const, cbId: "20", cbNome: "Pacotes", metaCategoria: "cat3" },
      // Sobrescrever serviço específico (Barba) para cat4
      { tipo: "servico_id" as const, cbId: "2", cbNome: "Barba", metaCategoria: "cat4" },
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    // Corte Masculino (cat1 via cat 10) = 5000
    // Barba (cat4 via ID 2, sobrescreve cat 10) = 3000
    // Pacote Clube (cat3 via cat 20) = 2000
    expect(resultado.cat1).toBe(5000);
    expect(resultado.cat3).toBe(2000);
    expect(resultado.cat4).toBe(3000);
  });

  it("deve ignorar itens com metaCategoria 'ignorar'", () => {
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços de Barbearia", metaCategoria: "cat1" },
      { tipo: "servico_categoria" as const, cbId: "20", cbNome: "Pacotes", metaCategoria: "ignorar" },
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    // Pacote Clube (2000) deve ser ignorado
    expect(resultado.cat3).toBe(0);
    expect(resultado.totalServicos).toBe(10000); // totalServicos ainda conta o valor bruto
    expect(resultado.cat1).toBe(8000); // Corte + Barba
  });

  it("deve retornar detalhes com tipo correto para cada item", () => {
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
      { tipo: "servico_categoria" as const, cbId: "20", cbNome: "Pacotes", metaCategoria: "cat3" },
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    expect(resultado.detalhes).toHaveLength(5); // 3 serviços + 2 produtos
    const servicos = resultado.detalhes.filter((d) => d.tipo === "servico");
    const produtos = resultado.detalhes.filter((d) => d.tipo === "produto");
    expect(servicos).toHaveLength(3);
    expect(produtos).toHaveLength(2);
  });

  it("deve usar fallback cat1 para serviços sem mapeamento de categoria", () => {
    const mapeamento = [
      // Sem mapeamento para categoria 10 (serviços de barbearia)
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    // Serviços comuns sem mapeamento vão para cat1; Pacote continua separado em cat10.
    expect(resultado.cat1).toBe(8000);
    expect(resultado.cat10).toBe(2000);
  });

  it("deve lidar com relatório vazio", () => {
    const relatorioVazio = { servicos: [], produtos: [] };
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioVazio,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    expect(resultado.cat1).toBe(0);
    expect(resultado.cat2).toBe(0);
    expect(resultado.totalGeral).toBe(0);
    expect(resultado.detalhes).toHaveLength(0);
  });

  it("deve calcular totalServicos e totalProdutos corretamente", () => {
    const mapeamento = [
      { tipo: "servico_categoria" as const, cbId: "10", cbNome: "Serviços", metaCategoria: "cat1" },
      { tipo: "servico_categoria" as const, cbId: "20", cbNome: "Pacotes", metaCategoria: "cat3" },
      { tipo: "produto_categoria" as const, cbId: "30", cbNome: "Produtos", metaCategoria: "cat2" },
    ];

    const resultado = calcularFaturamentoPorCategoriaComCatalogo(
      relatorioMock,
      mapeamento,
      catalogoServicos,
      catalogoProdutos
    );

    expect(resultado.totalServicos).toBe(10000); // 5000 + 3000 + 2000
    expect(resultado.totalProdutos).toBe(2300);  // 1500 + 800
    expect(resultado.totalGeral).toBe(12300);
  });
});

// ─── Testes: calcularComissaoBrutaFilial ─────────────────────────────────────

import { calcularComissaoBrutaFilial, calcularComissaoBrutaFilialPorNome } from "./cashbarber";
import type { CashbarberDpoteHistorico } from "./cashbarber";

describe("calcularComissaoBrutaFilial", () => {
  const historicoBase: CashbarberDpoteHistorico = {
    faturamento: {
      valor_ganho_assinaturas: 63035,
      porcentagem_comissao_barbearias: 65,
      porcentagem_comissao_barbeiros: 35,
    },
    filiais_servicos: [
      {
        filial: { id: 144, fil_bairro: "Morumbi" },
        servicos: [
          { fichas: 70 },
          { fichas: 30 },
        ],
      },
      {
        filial: { id: 3520, fil_bairro: "Mascote" },
        servicos: [
          { fichas: 40 },
          { fichas: 10 },
        ],
      },
    ],
  };

  it("deve calcular corretamente a comissão bruta da filial Morumbi (70% das fichas)", () => {
    // Total fichas: 70+30 (Morumbi) + 40+10 (Mascote) = 150
    // Fichas Morumbi: 100 → 100/150 = 66.67%
    // Distribui 100% do valor: 63035 × 66.67% ≈ 42023
    const resultado = calcularComissaoBrutaFilial(historicoBase, 144);
    expect(resultado).toBeGreaterThan(41000);
    expect(resultado).toBeLessThan(43000);
  });

  it("deve calcular corretamente a comissão bruta da filial Mascote (33% das fichas)", () => {
    // Fichas Mascote: 50 → 50/150 = 33.33%
    // Distribui 100% do valor: 63035 × 33.33% ≈ 21012
    const resultado = calcularComissaoBrutaFilial(historicoBase, 3520);
    expect(resultado).toBeGreaterThan(20000);
    expect(resultado).toBeLessThan(22000);
  });

  it("deve retornar 0 se a filial não tiver fichas", () => {
    const resultado = calcularComissaoBrutaFilial(historicoBase, 9999);
    expect(resultado).toBe(0);
  });

  it("deve retornar 0 se o total de fichas for 0", () => {
    const historicoSemFichas: CashbarberDpoteHistorico = {
      faturamento: {
        valor_ganho_assinaturas: 50000,
        porcentagem_comissao_barbearias: 65,
        porcentagem_comissao_barbeiros: 35,
      },
      filiais_servicos: [
        {
          filial: { id: 144, fil_bairro: "Morumbi" },
          servicos: [{ fichas: 0 }],
        },
      ],
    };
    const resultado = calcularComissaoBrutaFilial(historicoSemFichas, 144);
    expect(resultado).toBe(0);
  });

  it("deve retornar inteiro (arredondado)", () => {
    const resultado = calcularComissaoBrutaFilial(historicoBase, 144);
    expect(Number.isInteger(resultado)).toBe(true);
  });

  it("a soma das comissões de todas as filiais deve ser igual ao valor total de assinaturas", () => {
    const morumbi = calcularComissaoBrutaFilial(historicoBase, 144);
    const mascote = calcularComissaoBrutaFilial(historicoBase, 3520);
    // Distribui 100% do valor total — soma pode diferir em 1 real por arredondamento
    expect(Math.abs(morumbi + mascote - 63035)).toBeLessThanOrEqual(1);
  });
});

// ─── Testes: calcularComissaoBrutaFilialPorNome ───────────────────────────────

describe("calcularComissaoBrutaFilialPorNome", () => {
  const historicoBase: CashbarberDpoteHistorico = {
    faturamento: {
      valor_ganho_assinaturas: 63035,
      porcentagem_comissao_barbearias: 65,
      porcentagem_comissao_barbeiros: 35,
    },
    filiais_servicos: [
      {
        filial: { id: 144, fil_bairro: "Morumbi" },
        servicos: [
          { fichas: 70 },
          { fichas: 30 },
        ],
      },
      {
        filial: { id: 3520, fil_bairro: "Mascote" },
        servicos: [
          { fichas: 40 },
          { fichas: 10 },
        ],
      },
    ],
  };

  it("deve encontrar filial pelo nome exato", () => {
    // Distribui 100% do valor: 63035 × 66.67% ≈ 42023
    const resultado = calcularComissaoBrutaFilialPorNome(historicoBase, "Morumbi");
    expect(resultado).toBeGreaterThan(41000);
    expect(resultado).toBeLessThan(43000);
  });

  it("deve encontrar filial com busca case-insensitive", () => {
    const resultadoMinusculo = calcularComissaoBrutaFilialPorNome(historicoBase, "morumbi");
    const resultadoMaiusculo = calcularComissaoBrutaFilialPorNome(historicoBase, "MORUMBI");
    expect(resultadoMinusculo).toBe(resultadoMaiusculo);
    expect(resultadoMinusculo).toBeGreaterThan(41000);
  });

  it("deve encontrar filial com busca parcial", () => {
    // Distribui 100% do valor: 63035 × 33.33% ≈ 21012
    const resultado = calcularComissaoBrutaFilialPorNome(historicoBase, "Masc");
    expect(resultado).toBeGreaterThan(20000);
    expect(resultado).toBeLessThan(22000);
  });

  it("deve retornar 0 se o nome não for encontrado", () => {
    const resultado = calcularComissaoBrutaFilialPorNome(historicoBase, "Inexistente");
    expect(resultado).toBe(0);
  });

  it("deve retornar 0 se o nome for vazio", () => {
    const resultado = calcularComissaoBrutaFilialPorNome(historicoBase, "  ");
    expect(resultado).toBe(0);
  });

  it("deve retornar o mesmo valor que calcularComissaoBrutaFilial para Mascote", () => {
    const porNome = calcularComissaoBrutaFilialPorNome(historicoBase, "Mascote");
    const porId = calcularComissaoBrutaFilial(historicoBase, 3520);
    expect(porNome).toBe(porId);
  });
});
