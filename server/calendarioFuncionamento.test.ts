import { describe, expect, it } from "vitest";
import {
  calcularIndicadoresDiasRestantes,
  contarDiasFuncionamentoNoIntervalo,
  obterDiasFechadosDaUnidade,
  obterDiaInicialDiasRestantes,
} from "../shared/calendarioFuncionamento";

describe("calendário de funcionamento por unidade", () => {
  it("considera domingo e segunda-feira como fechados na Seraphine", () => {
    const diasFechados = obterDiasFechadosDaUnidade("barbiero-seraphine");

    expect(diasFechados.has(0)).toBe(true);
    expect(diasFechados.has(1)).toBe(true);
    expect(diasFechados.has(2)).toBe(false);
  });

  it("conta somente hoje e amanhã para a Seraphine entre 28 e 31 de agosto de 2026", () => {
    const diasRestantes = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "barbiero-seraphine",
      ano: 2026,
      mes: 8,
      diaInicial: 28,
      diaFinal: 31,
    });

    expect(diasRestantes).toBe(2);
  });

  it("mantém três dias para Morumbi e Mascote no mesmo período", () => {
    for (const empresaSlug of ["barbiero-morumbi", "barbiero-mascote"]) {
      expect(
        contarDiasFuncionamentoNoIntervalo({
          empresaSlug,
          ano: 2026,
          mes: 8,
          diaInicial: 28,
          diaFinal: 31,
        })
      ).toBe(3);
    }
  });

  it("retorna zero quando o intervalo restante da Seraphine contém apenas domingo e segunda", () => {
    const diasRestantes = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "barbiero-seraphine",
      ano: 2026,
      mes: 8,
      diaInicial: 30,
      diaFinal: 31,
    });

    expect(diasRestantes).toBe(0);
  });

  it("começa a contagem no dia seguinte para o mês vigente", () => {
    const diaInicial = obterDiaInicialDiasRestantes({
      ehMesFuturo: false,
      ehMesVigente: true,
      diaHoje: 29,
      totalDiasMes: 31,
    });

    const diasRestantes = contarDiasFuncionamentoNoIntervalo({
      empresaSlug: "barbiero-seraphine",
      ano: 2026,
      mes: 8,
      diaInicial,
      diaFinal: 31,
    });

    expect(diaInicial).toBe(30);
    expect(diasRestantes).toBe(0);
  });

  it("começa no primeiro dia para mês futuro e retorna intervalo vazio para mês passado", () => {
    expect(obterDiaInicialDiasRestantes({
      ehMesFuturo: true,
      ehMesVigente: false,
      diaHoje: 29,
      totalDiasMes: 31,
    })).toBe(1);

    expect(obterDiaInicialDiasRestantes({
      ehMesFuturo: false,
      ehMesVigente: false,
      diaHoje: 29,
      totalDiasMes: 31,
    })).toBe(32);
  });

  it("recalcula R$/dia e projeção da Seraphine com dois dias restantes", () => {
    const indicadores = calcularIndicadoresDiasRestantes({
      totalRealizado: 124_919,
      metaMensal: 140_000,
      mediaDiaria: 6_246,
      diasRestantes: 2,
    });

    expect(indicadores.faltaMensal).toBe(15_081);
    expect(indicadores.metaDiariaNecessaria).toBe(7_540.5);
    expect(indicadores.projecaoFinal).toBe(137_411);
  });

  it("não divide por zero quando não há dias de funcionamento restantes", () => {
    const indicadores = calcularIndicadoresDiasRestantes({
      totalRealizado: 124_919,
      metaMensal: 140_000,
      mediaDiaria: 6_246,
      diasRestantes: 0,
    });

    expect(indicadores.metaDiariaNecessaria).toBe(0);
    expect(indicadores.projecaoFinal).toBe(124_919);
  });
});
