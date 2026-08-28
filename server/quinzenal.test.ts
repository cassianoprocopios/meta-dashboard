import { describe, expect, it } from "vitest";
import { calcularTotalQuinzenal } from "../shared/quinzenal";

describe("calcularTotalQuinzenal", () => {
  it("soma cat1 a cat9 exclusivamente dos dias 1 a 15", () => {
    const total = calcularTotalQuinzenal([
      { data: "2026-08-01", cat1: "100", cat2: "20", cat9: "50" },
      { data: "2026-08-15", cat1: "200", cat3: "30", cat9: "50" },
      { data: "2026-08-16", cat1: "900", cat9: "50" },
      { data: "2026-08-31", cat2: "700", cat9: "50" },
    ]);

    expect(total).toBe(450);
  });

  it("não inclui faturamento operacional dos dias 16 em diante", () => {
    const total = calcularTotalQuinzenal([
      { data: "2026-08-15", cat1: "100", cat9: "10" },
      { data: "2026-08-16", cat1: "10000", cat9: "10" },
    ]);

    expect(total).toBe(110);
  });

  it("trata campos vazios ou inválidos como zero", () => {
    const total = calcularTotalQuinzenal([
      { data: "2026-08-01", cat1: null, cat2: "inválido", cat9: "25.50" },
      { data: "2026-08-02", cat1: "74.50", cat9: null },
    ]);

    expect(total).toBe(100);
  });
});
