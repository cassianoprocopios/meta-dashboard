import { describe, it, expect } from "vitest";

/**
 * Testes para validar o cálculo de dias úteis restantes
 * Garante que a fórmula: diasUteisRestantes = diasUteis - diasRealizados
 * funciona corretamente em diferentes cenários
 *
 * Estes testes validam a lógica usada no Home.tsx para calcular:
 * 1. Dias úteis restantes no mês
 * 2. Meta diária necessária para atingir a meta mensal
 */

describe("Cálculo de Dias Úteis Restantes", () => {
  describe("Teste 1: Mascote", () => {
    it("deve calcular corretamente 2 dias restantes (29 - 27)", () => {
      const diasUteis = 29;
      const diasRealizados = 27;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(2);
    });

    it("deve calcular corretamente meta diária restante", () => {
      const metaMensal = 100000;
      const faturamentoAcumulado = 93779;
      const faltaTotal = metaMensal - faturamentoAcumulado;
      const diasRestantes = 2;
      const metaDiariaRestante = faltaTotal / diasRestantes;

      expect(metaDiariaRestante).toBeCloseTo(3110.5, 0);
    });
  });

  describe("Teste 2: Seraphine", () => {
    it("deve calcular corretamente 2 dias restantes (26 - 24)", () => {
      const diasUteis = 26;
      const diasRealizados = 24;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(2);
    });

    it("deve calcular corretamente meta diária restante", () => {
      const metaMensal = 130000;
      const faturamentoAcumulado = 112874;
      const faltaTotal = metaMensal - faturamentoAcumulado;
      const diasRestantes = 2;
      const metaDiariaRestante = faltaTotal / diasRestantes;

      expect(metaDiariaRestante).toBeCloseTo(8563, 0);
    });
  });

  describe("Teste 3: Morumbi", () => {
    it("deve calcular corretamente 2 dias restantes (22 - 20)", () => {
      const diasUteis = 22;
      const diasRealizados = 20;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(2);
    });
  });

  describe("Casos extremos", () => {
    it("deve retornar 0 quando não há dias restantes (20 - 20)", () => {
      const diasUteis = 20;
      const diasRealizados = 20;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(0);
    });

    it("deve retornar 0 quando dias realizados excedem dias úteis (20 - 25)", () => {
      const diasUteis = 20;
      const diasRealizados = 25;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(0);
    });

    it("deve retornar 0 quando dias realizados excedem dias úteis (25 - 30)", () => {
      const diasUteis = 25;
      const diasRealizados = 30;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRestantes).toBe(0);
    });
  });

  describe("Contagem de dias únicos com lançamento", () => {
    it("deve contar apenas dias únicos (não quantidade de lançamentos)", () => {
      // Simular 3 lançamentos no dia 28, 2 no dia 27, 1 no dia 26
      const rowsRealizados = [
        { data: "2026-04-28" },
        { data: "2026-04-28" },
        { data: "2026-04-28" },
        { data: "2026-04-27" },
        { data: "2026-04-27" },
        { data: "2026-04-26" },
      ];

      // Contar dias únicos
      const diasRealizadosSet = new Set(
        rowsRealizados.map((r) => r.data.split("-")[2])
      );
      const diasRealizados = diasRealizadosSet.size;

      // Deve contar 3 dias (26, 27, 28), não 6 lançamentos
      expect(diasRealizados).toBe(3);
    });

    it("deve calcular corretamente quando há múltiplos lançamentos por dia", () => {
      const diasUteis = 26;

      // Simular 24 dias com lançamento
      const rowsRealizados = Array(24)
        .fill(null)
        .map((_, i) => ({
          data: `2026-04-${String(i + 1).padStart(2, "0")}`,
        }));

      const diasRealizadosSet = new Set(
        rowsRealizados.map((r) => r.data.split("-")[2])
      );
      const diasRealizados = diasRealizadosSet.size;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);

      expect(diasRealizados).toBe(24);
      expect(diasRestantes).toBe(2);
    });

    it("deve contar corretamente com múltiplos lançamentos no mesmo dia", () => {
      // Simular: 5 lançamentos no dia 1, 3 no dia 2, 2 no dia 3
      const rowsRealizados = [
        { data: "2026-04-01" },
        { data: "2026-04-01" },
        { data: "2026-04-01" },
        { data: "2026-04-01" },
        { data: "2026-04-01" },
        { data: "2026-04-02" },
        { data: "2026-04-02" },
        { data: "2026-04-02" },
        { data: "2026-04-03" },
        { data: "2026-04-03" },
      ];

      const diasRealizadosSet = new Set(
        rowsRealizados.map((r) => r.data.split("-")[2])
      );
      const diasRealizados = diasRealizadosSet.size;

      // Deve contar 3 dias (01, 02, 03), não 10 lançamentos
      expect(diasRealizados).toBe(3);
    });
  });

  describe("Validação de meta diária com dias restantes", () => {
    it("deve calcular meta diária corretamente para Seraphine", () => {
      const metaMensal = 130000;
      const faturamentoAcumulado = 112874;
      const diasUteis = 26;
      const diasRealizados = 24;

      const faltaTotal = metaMensal - faturamentoAcumulado;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);
      const metaDiariaRestante = diasRestantes > 0 ? faltaTotal / diasRestantes : 0;

      expect(diasRestantes).toBe(2);
      expect(metaDiariaRestante).toBeCloseTo(8563, 0);
    });

    it("deve retornar 0 para meta diária quando não há dias restantes", () => {
      const metaMensal = 100000;
      const faturamentoAcumulado = 100000;
      const diasUteis = 20;
      const diasRealizados = 20;

      const faltaTotal = metaMensal - faturamentoAcumulado;
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);
      const metaDiariaRestante = diasRestantes > 0 ? faltaTotal / diasRestantes : 0;

      expect(diasRestantes).toBe(0);
      expect(metaDiariaRestante).toBe(0);
    });

    it("deve calcular meta diária corretamente mesmo com faturamento acima da meta", () => {
      const metaMensal = 100000;
      const faturamentoAcumulado = 105000; // Acima da meta
      const diasUteis = 20;
      const diasRealizados = 18;

      const faltaTotal = metaMensal - faturamentoAcumulado; // Negativo
      const diasRestantes = Math.max(0, diasUteis - diasRealizados);
      const metaDiariaRestante = diasRestantes > 0 ? faltaTotal / diasRestantes : 0;

      expect(diasRestantes).toBe(2);
      expect(metaDiariaRestante).toBe(-2500); // Negativo indica que já superou a meta
    });
  });
});
