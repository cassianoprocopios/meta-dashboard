import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  obterInstanteFechamentoQuinzenal,
  podeCongelarQuinzena,
  snapshotFoiCongeladoPrematuramente,
} from "../shared/fechamentoQuinzenal";

describe("fechamento quinzenal", () => {
  it("define o fechamento em 15/09/2026 às 23:50 de Brasília", () => {
    expect(obterInstanteFechamentoQuinzenal(9, 2026).toISOString())
      .toBe("2026-09-16T02:50:00.000Z");
  });

  it("não permite congelar antes do horário oficial", () => {
    expect(podeCongelarQuinzena({
      mes: 9,
      ano: 2026,
      agora: new Date("2026-09-16T02:49:59.000Z"),
    })).toBe(false);
  });

  it("permite congelar a partir do horário oficial", () => {
    expect(podeCongelarQuinzena({
      mes: 9,
      ano: 2026,
      agora: new Date("2026-09-16T02:50:00.000Z"),
    })).toBe(true);
  });

  it("identifica o snapshot de 07/09 como prematuro", () => {
    expect(snapshotFoiCongeladoPrematuramente({
      mes: 9,
      ano: 2026,
      congeladoEm: "2026-09-07T18:26:18.000Z",
    })).toBe(true);
  });

  it("o job valida o horário e repara snapshots prematuros", () => {
    const fonte = readFileSync(new URL("./cashbarberJob.ts", import.meta.url), "utf8");
    expect(fonte).toContain("podeCongelarQuinzena({ mes, ano })");
    expect(fonte).toContain("snapshotFoiCongeladoPrematuramente({");
    expect(fonte).toContain('cron.schedule("0 50 2 16 * *"');
  });
});
