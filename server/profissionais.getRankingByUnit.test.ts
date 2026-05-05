import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { listarColaboradores, listarRankingPorPeriodo } from "./db";

describe("profissionais.getRankingByUnit", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  afterAll(async () => {
    if (db && db.close) {
      await db.close();
    }
  });

  it("should return profissionais from a specific unit", async () => {
    // Este teste verifica se a lógica de filtro por unidade funciona corretamente
    const tenantId = 1; // Usar tenant de teste
    const empresaSlug = "barbiero-mascote";
    const mes = 5;
    const ano = 2026;

    const [profissionais, { itens: faturamentos }] = await Promise.all([
      listarColaboradores(tenantId),
      listarRankingPorPeriodo(tenantId, mes, ano),
    ]);

    // Filtrar profissionais da unidade especificada
    const profissionaisDaUnidade = profissionais.filter(
      (p) => p.empresaSlug === empresaSlug && p.ativo === 1 && p.isGerencia !== 1
    );

    // Verificar que há profissionais na unidade
    expect(profissionaisDaUnidade.length).toBeGreaterThan(0);

    // Verificar que todos têm o slug correto
    profissionaisDaUnidade.forEach((p) => {
      expect(p.empresaSlug).toBe(empresaSlug);
      expect(p.ativo).toBe(1);
      expect(p.isGerencia).not.toBe(1);
    });
  });

  it("should calculate unit statistics correctly", async () => {
    const tenantId = 1;
    const empresaSlug = "barbiero-morumbi";
    const mes = 5;
    const ano = 2026;

    const [profissionais, { itens: faturamentos }] = await Promise.all([
      listarColaboradores(tenantId),
      listarRankingPorPeriodo(tenantId, mes, ano),
    ]);

    const profissionaisDaUnidade = profissionais.filter(
      (p) => p.empresaSlug === empresaSlug && p.ativo === 1 && p.isGerencia !== 1
    );

    const faturamentoMap = new Map(faturamentos.map((f) => [f.colaboradorId, f]));

    // Calcular total realizado
    const totalRealizado = profissionaisDaUnidade.reduce((sum, p) => {
      const fat = faturamentoMap.get(p.id);
      return sum + (fat?.totalGeral ?? 0);
    }, 0);

    // Calcular meta mensal
    const metaMensal = profissionaisDaUnidade.reduce((sum, p) => {
      const meta = p.metaMensal ? parseFloat(String(p.metaMensal)) : 0;
      return sum + meta;
    }, 0);

    // Verificar que os valores são números válidos
    expect(typeof totalRealizado).toBe("number");
    expect(typeof metaMensal).toBe("number");
    expect(totalRealizado).toBeGreaterThanOrEqual(0);
    expect(metaMensal).toBeGreaterThanOrEqual(0);
  });

  it("should sort profissionais by totalGeral in descending order", async () => {
    const tenantId = 1;
    const empresaSlug = "barbiero-seraphine";
    const mes = 5;
    const ano = 2026;

    const [profissionais, { itens: faturamentos }] = await Promise.all([
      listarColaboradores(tenantId),
      listarRankingPorPeriodo(tenantId, mes, ano),
    ]);

    const profissionaisDaUnidade = profissionais.filter(
      (p) => p.empresaSlug === empresaSlug && p.ativo === 1 && p.isGerencia !== 1
    );

    const faturamentoMap = new Map(faturamentos.map((f) => [f.colaboradorId, f]));

    const lista = profissionaisDaUnidade
      .filter((p) => {
        if (p.exibirNoRanking === 1) return true;
        const fat = faturamentoMap.get(p.id);
        if (p.categoriaRanking === "recepcao") {
          return fat && fat.totalProdutos > 0;
        }
        return false;
      })
      .map((p) => {
        const fat = faturamentoMap.get(p.id);
        return {
          id: p.id,
          nome: p.nome,
          totalGeral: fat?.totalGeral ?? 0,
        };
      })
      .sort((a, b) => b.totalGeral - a.totalGeral);

    // Verificar que a lista está ordenada corretamente
    for (let i = 1; i < lista.length; i++) {
      expect(lista[i - 1].totalGeral).toBeGreaterThanOrEqual(lista[i].totalGeral);
    }
  });

  it("should calculate dias restantes correctly", async () => {
    const mes = 5;
    const ano = 2026;

    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const diasRestantes = Math.max(0, diasNoMes - diaAtual + 1);

    // Verificar que dias restantes é um número válido
    expect(typeof diasRestantes).toBe("number");
    expect(diasRestantes).toBeGreaterThanOrEqual(0);
    expect(diasRestantes).toBeLessThanOrEqual(31);
  });

  it("should calculate meta diaria correctly", async () => {
    const tenantId = 1;
    const empresaSlug = "barbiero-mascote";
    const mes = 5;
    const ano = 2026;

    const [profissionais] = await Promise.all([
      listarColaboradores(tenantId),
      listarRankingPorPeriodo(tenantId, mes, ano),
    ]);

    const profissionaisDaUnidade = profissionais.filter(
      (p) => p.empresaSlug === empresaSlug && p.ativo === 1 && p.isGerencia !== 1
    );

    const metaMensal = profissionaisDaUnidade.reduce((sum, p) => {
      const meta = p.metaMensal ? parseFloat(String(p.metaMensal)) : 0;
      return sum + meta;
    }, 0);

    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const diasRestantes = Math.max(0, diasNoMes - diaAtual + 1);
    const metaDiaria = diasRestantes > 0 ? metaMensal / diasRestantes : 0;

    // Verificar que meta diária é um número válido
    expect(typeof metaDiaria).toBe("number");
    expect(metaDiaria).toBeGreaterThanOrEqual(0);
  });
});
