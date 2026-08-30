import { describe, expect, it } from "vitest";
import { calcularBonificacaoSubstitutiva, calcularProgressoSuperMeta } from "../shared/bonificacao";

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

describe("progresso visual da Super Meta", () => {
  it("calcula percentual e valor restante antes de atingir o objetivo", () => {
    const progresso = calcularProgressoSuperMeta(110_238.81, 115_000);

    expect(progresso.configurada).toBe(true);
    expect(progresso.atingida).toBe(false);
    expect(progresso.percentual).toBeCloseTo(95.86, 2);
    expect(progresso.percentualBarra).toBeCloseTo(95.86, 2);
    expect(progresso.falta).toBe(4_761.19);
    expect(progresso.excedente).toBe(0);
  });

  it("limita a barra em 100% e informa o excedente após atingir a Super Meta", () => {
    const progresso = calcularProgressoSuperMeta(120_500, 115_000);

    expect(progresso.atingida).toBe(true);
    expect(progresso.percentual).toBeCloseTo(104.78, 2);
    expect(progresso.percentualBarra).toBe(100);
    expect(progresso.falta).toBe(0);
    expect(progresso.excedente).toBe(5_500);
  });

  it("retorna estado neutro quando a Super Meta não está configurada", () => {
    const progresso = calcularProgressoSuperMeta(100_000, 0);

    expect(progresso.configurada).toBe(false);
    expect(progresso.atingida).toBe(false);
    expect(progresso.percentual).toBe(0);
    expect(progresso.percentualBarra).toBe(0);
    expect(progresso.falta).toBe(0);
    expect(progresso.excedente).toBe(0);
  });
});
