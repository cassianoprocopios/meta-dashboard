import { describe, expect, it } from "vitest";
import { calcularBonificacaoSubstitutiva } from "../shared/bonificacao";

const percentuais = {
  pctQuinzenalSemMeta: 0.2,
  pctQuinzenalComMeta: 0.3,
  pctMensalSemMeta: 0.2,
  pctMensalComMeta: 0.3,
  pctSuperMeta: 0.4,
};

describe("bonificação substitutiva da Super Meta", () => {
  it("soma Quinzenal e Mensal quando a Super Meta ainda não foi atingida", () => {
    const resultado = calcularBonificacaoSubstitutiva({
      totalQuinzenal: 57_773.75,
      totalMensal: 110_238.81,
      metaQuinzenal: 56_000,
      metaMensal: 110_000,
      superMeta: 115_000,
      ...percentuais,
    });

    expect(resultado.atingiuMetaQuinzenal).toBe(true);
    expect(resultado.atingiuMetaMensal).toBe(true);
    expect(resultado.atingiuSuperMeta).toBe(false);
    expect(resultado.valorQuinzenal).toBe(173.32);
    expect(resultado.valorMensal).toBe(330.72);
    expect(resultado.valorSuperMeta).toBe(0);
    expect(resultado.totalPago).toBe(504.04);
  });

  it("usa os percentuais sem meta quando as metas não foram atingidas", () => {
    const resultado = calcularBonificacaoSubstitutiva({
      totalQuinzenal: 40_000,
      totalMensal: 90_000,
      metaQuinzenal: 56_000,
      metaMensal: 110_000,
      superMeta: 115_000,
      ...percentuais,
    });

    expect(resultado.valorQuinzenal).toBe(80);
    expect(resultado.valorMensal).toBe(180);
    expect(resultado.valorSuperMeta).toBe(0);
    expect(resultado.totalPago).toBe(260);
  });

  it("substitui integralmente a Mensal pela Super Meta quando atingida", () => {
    const resultado = calcularBonificacaoSubstitutiva({
      totalQuinzenal: 57_773.75,
      totalMensal: 120_000,
      metaQuinzenal: 56_000,
      metaMensal: 110_000,
      superMeta: 115_000,
      ...percentuais,
    });

    expect(resultado.mensalSubstituida).toBe(true);
    expect(resultado.faixaMensalAtiva).toBe("super_meta");
    expect(resultado.valorMensalPotencial).toBe(360);
    expect(resultado.valorMensal).toBe(0);
    expect(resultado.valorSuperMeta).toBe(480);
    expect(resultado.totalPago).toBe(653.32);
  });

  it("não reativa a Mensal quando a Super Meta foi atingida mas seu percentual é zero", () => {
    const resultado = calcularBonificacaoSubstitutiva({
      totalQuinzenal: 57_773.75,
      totalMensal: 115_000,
      metaQuinzenal: 56_000,
      metaMensal: 110_000,
      superMeta: 115_000,
      ...percentuais,
      pctSuperMeta: 0,
    });

    expect(resultado.mensalSubstituida).toBe(true);
    expect(resultado.valorMensal).toBe(0);
    expect(resultado.valorSuperMeta).toBe(0);
    expect(resultado.totalPago).toBe(resultado.valorQuinzenal);
  });

  it("respeita o status definitivo da meta quinzenal salvo no snapshot", () => {
    const resultado = calcularBonificacaoSubstitutiva({
      totalQuinzenal: 57_773.75,
      totalMensal: 110_238.81,
      metaQuinzenal: 56_000,
      metaMensal: 110_000,
      superMeta: 115_000,
      ...percentuais,
      atingiuMetaQuinzenalOverride: false,
    });

    expect(resultado.atingiuMetaQuinzenal).toBe(false);
    expect(resultado.pctQuinzenalAplicado).toBe(0.2);
    expect(resultado.valorQuinzenal).toBe(115.55);
  });
});
