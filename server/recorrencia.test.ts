import { describe, expect, it } from "vitest";
import { distribuirSaldoRecorrencia } from "../shared/recorrencia";

describe("distribuirSaldoRecorrencia", () => {
  it("distribui o total exato quando não há quinzena protegida", () => {
    const resultado = distribuirSaldoRecorrencia({
      totalApurado: 100,
      diasElegiveis: [1, 2, 3],
    });

    expect(Array.from(resultado.porDia.values())).toEqual([33.34, 33.33, 33.33]);
    expect(resultado.totalFinal).toBe(100);
  });

  it("preserva a quinzena e distribui somente o saldo nos dias restantes", () => {
    const resultado = distribuirSaldoRecorrencia({
      totalApurado: 74_866,
      diasElegiveis: [16, 17],
      valoresProtegidos: Array(15).fill(4_406.59),
    });

    expect(resultado.totalProtegido).toBe(66_098.85);
    expect(resultado.saldoDistribuido).toBe(8_767.15);
    expect(Array.from(resultado.porDia.values())).toEqual([4_383.58, 4_383.57]);
    expect(resultado.totalFinal).toBe(74_866);
  });

  it("não distribui valor negativo quando o protegido já supera o apurado", () => {
    const resultado = distribuirSaldoRecorrencia({
      totalApurado: 100,
      diasElegiveis: [16, 17],
      valoresProtegidos: [60, 60],
    });

    expect(Array.from(resultado.porDia.values())).toEqual([0, 0]);
    expect(resultado.totalFinal).toBe(120);
  });
});
