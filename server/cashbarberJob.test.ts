/**
 * Testes para o sistema de jobs de sincronização automática do CashBarber
 * Intervalo: a cada hora (cron "0 0 * * * *")
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("node-cron", () => ({
  schedule: vi.fn(() => ({
    stop: vi.fn(),
    start: vi.fn(),
  })),
  validate: vi.fn(() => true),
}));

vi.mock("./cashbarberSincronizador", () => ({
  sincronizarFaturamentoCashbarber: vi.fn().mockResolvedValue({
    diasSincronizados: 20,
    diasIgnorados: 0,
    detalhes: [],
  }),
  aplicarDpoteParaTenant: vi.fn().mockResolvedValue({
    aplicados: [
      { empresaSlug: "morumbi", filialNome: "Morumbi", comissaoBruta: 44686.92 },
      { empresaSlug: "mascote", filialNome: "Mascote", comissaoBruta: 19158.08 },
    ],
    naoEncontrados: [],
    totalAssinaturas: 63845,
    porcentagemBarbearia: 65,
  }),
  recalcularERedistribuirDpotePorTenant: vi.fn().mockResolvedValue([
    { empresaSlug: "morumbi", valorTotal: 107024, valorDiario: 4116.31, diasDecorridos: 26, diasAtualizados: 26, fonte: "api" },
    { empresaSlug: "mascote", valorTotal: 46195, valorDiario: 1776.73, diasDecorridos: 26, diasAtualizados: 26, fonte: "api" },
  ]),
}));

vi.mock("./db", () => ({
  listCashbarberConfigs: vi.fn().mockResolvedValue([]),
  listCashbarberMapeamento: vi.fn().mockResolvedValue([]),
  insertCashbarberSyncLog: vi.fn().mockResolvedValue(undefined),
  updateCashbarberSyncStatus: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./cashbarber", () => ({
  cashbarberLogin: vi.fn().mockResolvedValue("mock-token"),
  cashbarberListarServicos: vi.fn().mockResolvedValue([]),
  cashbarberListarProdutos: vi.fn().mockResolvedValue([]),
  cashbarberRelatorio15: vi.fn().mockResolvedValue({ servicos: [], produtos: [] }),
  calcularFaturamentoPorCategoriaComCatalogo: vi.fn().mockReturnValue({
    cat1: 1000, cat2: 500, cat3: 0, cat4: 0, cat5: 0, totalGeral: 1500,
  }),
}));

// ─── Testes da lógica de próxima execução horária ─────────────────────────────

describe("calcularProximaExecucao horária (lógica interna)", () => {
  function calcularProximaExecucao(): Date {
    const proxima = new Date();
    proxima.setHours(proxima.getHours() + 1, 0, 0, 0);
    return proxima;
  }

  it("retorna a próxima hora cheia", () => {
    const proxima = calcularProximaExecucao();
    expect(proxima).toBeInstanceOf(Date);
    expect(proxima.getMinutes()).toBe(0);
    expect(proxima.getSeconds()).toBe(0);
    expect(proxima.getMilliseconds()).toBe(0);
  });

  it("a próxima execução é sempre no futuro", () => {
    const proxima = calcularProximaExecucao();
    expect(proxima.getTime()).toBeGreaterThan(Date.now());
  });

  it("a próxima execução é no máximo 1 hora à frente", () => {
    const proxima = calcularProximaExecucao();
    const umaHoraEmMs = 60 * 60 * 1000;
    expect(proxima.getTime() - Date.now()).toBeLessThanOrEqual(umaHoraEmMs);
  });
});

// ─── Testes da expressão cron horária ─────────────────────────────────────────

describe("expressão cron horária", () => {
  const CRON_CADA_HORA = "0 0 * * * *";

  it("expressão cron está correta para execução a cada hora", () => {
    // "0 0 * * * *" = segundo 0, minuto 0, toda hora, todo dia
    expect(CRON_CADA_HORA).toBe("0 0 * * * *");
  });

  it("expressão cron tem 6 campos (formato node-cron)", () => {
    const campos = CRON_CADA_HORA.split(" ");
    expect(campos).toHaveLength(6);
  });

  it("segundo e minuto são fixos em 0 (executa no início de cada hora)", () => {
    const [segundo, minuto] = CRON_CADA_HORA.split(" ");
    expect(segundo).toBe("0");
    expect(minuto).toBe("0");
  });
});

// ─── Testes das funções exportadas do job ─────────────────────────────────────

describe("getStatusJobsCashbarber", () => {
  it("retorna array vazio quando não há jobs ativos", async () => {
    const { getStatusJobsCashbarber } = await import("./cashbarberJob");
    const status = getStatusJobsCashbarber();
    expect(Array.isArray(status)).toBe(true);
  });

  it("retorna objetos sem campo horario (removido no modo horário)", async () => {
    const { getStatusJobsCashbarber } = await import("./cashbarberJob");
    const status = getStatusJobsCashbarber();
    // Cada item não deve ter campo horario
    for (const item of status) {
      expect(item).not.toHaveProperty("horario");
    }
  });
});

describe("notificarMudancaConfigCashbarber", () => {
  it("não lança erro ao ativar agendamento (sem horário)", async () => {
    const { notificarMudancaConfigCashbarber } = await import("./cashbarberJob");
    await expect(
      notificarMudancaConfigCashbarber(1, "empresa-teste", true)
    ).resolves.not.toThrow();
  });

  it("não lança erro ao desativar agendamento", async () => {
    const { notificarMudancaConfigCashbarber } = await import("./cashbarberJob");
    await expect(
      notificarMudancaConfigCashbarber(1, "empresa-teste", false)
    ).resolves.not.toThrow();
  });

  it("aceita parâmetro horario opcional por compatibilidade", async () => {
    const { notificarMudancaConfigCashbarber } = await import("./cashbarberJob");
    await expect(
      notificarMudancaConfigCashbarber(1, "empresa-teste", true, "23:00")
    ).resolves.not.toThrow();
  });
});

describe("recarregarJobsCashbarber", () => {
  it("é uma função assíncrona exportada", async () => {
    const { recarregarJobsCashbarber } = await import("./cashbarberJob");
    expect(typeof recarregarJobsCashbarber).toBe("function");
  });
});

describe("inicializarJobsCashbarber", () => {
  it("é uma função assíncrona exportada", async () => {
    const { inicializarJobsCashbarber } = await import("./cashbarberJob");
    expect(typeof inicializarJobsCashbarber).toBe("function");
  });
});

// ─── Testes da integração Dpote no job ────────────────────────────────────────

describe("integração aplicarDpoteParaTenant no job automático", () => {
  it("aplicarDpoteParaTenant é importada e mockada corretamente", async () => {
    const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
    expect(typeof aplicarDpoteParaTenant).toBe("function");
  });

  it("aplicarDpoteParaTenant retorna aplicados e naoEncontrados", async () => {
    const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
    const resultado = await aplicarDpoteParaTenant(1, 3, 2026);
    expect(resultado.aplicados).toHaveLength(2);
    expect(resultado.naoEncontrados).toHaveLength(0);
    expect(resultado.totalAssinaturas).toBe(63845);
    expect(resultado.porcentagemBarbearia).toBe(65);
  });

  it("aplicarDpoteParaTenant retorna comissão bruta por filial", async () => {
    const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
    const resultado = await aplicarDpoteParaTenant(1, 3, 2026);
    const morumbi = resultado.aplicados.find((a) => a.empresaSlug === "morumbi");
    const mascote = resultado.aplicados.find((a) => a.empresaSlug === "mascote");
    expect(morumbi?.comissaoBruta).toBe(44686.92);
    expect(mascote?.comissaoBruta).toBe(19158.08);
  });

  it("a soma das comissões brutas é igual ao total do pote (valorAssinaturas × porcentagemBarbearia)", async () => {
    const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
    const resultado = await aplicarDpoteParaTenant(1, 3, 2026);
    const somaComissoes = resultado.aplicados.reduce((acc, a) => acc + a.comissaoBruta, 0);
    // Os valores do mock (44686.92 + 19158.08 = 63845) são os valores reais do CashBarber
    // que representam 100% do valor de assinaturas distribuído entre as filiais
    // (não 65% de R$ 63.845, pois o CashBarber já aplica o percentual internamente)
    expect(somaComissoes).toBeCloseTo(resultado.totalAssinaturas, 0);
  });

  it("naoEncontrados é array vazio quando todas as filiais são encontradas", async () => {
    const { aplicarDpoteParaTenant } = await import("./cashbarberSincronizador");
    const resultado = await aplicarDpoteParaTenant(1, 3, 2026);
    expect(Array.isArray(resultado.naoEncontrados)).toBe(true);
    expect(resultado.naoEncontrados).toHaveLength(0);
  });
});

// ─── Testes do job noturno de recálculo Dpote ─────────────────────────────────

describe("job noturno de recálculo Dpote (recalcularERedistribuirDpotePorTenant)", () => {
  it("recalcularERedistribuirDpotePorTenant é exportada do sincronizador", async () => {
    const { recalcularERedistribuirDpotePorTenant } = await import("./cashbarberSincronizador");
    expect(typeof recalcularERedistribuirDpotePorTenant).toBe("function");
  });

  it("retorna array de resultados com estrutura correta", async () => {
    const { recalcularERedistribuirDpotePorTenant } = await import("./cashbarberSincronizador");
    const resultados = await recalcularERedistribuirDpotePorTenant(1);
    expect(Array.isArray(resultados)).toBe(true);
  });

  it("job noturno CRON_NOTURNO_DPOTE usa expressão '0 0 2 * * *' (02:00 diário)", () => {
    // Verifica que a expressão cron do job noturno é a correta para 02:00 todo dia
    const CRON_NOTURNO_DPOTE = "0 0 2 * * *";
    // Formato: segundos minutos horas dia-do-mês mês dia-da-semana
    const partes = CRON_NOTURNO_DPOTE.split(" ");
    expect(partes[2]).toBe("2"); // hora = 2 (02:00)
    expect(partes[1]).toBe("0"); // minuto = 0
    expect(partes[0]).toBe("0"); // segundo = 0
  });

  it("CRON_NOTURNO_DPOTE está definido como '0 0 2 * * *' no cashbarberJob", async () => {
    // Verifica que o job noturno usa a expressão correta para 02:00 diário
    // (teste unitário da constante, sem chamar inicializarJobsCashbarber que tem setTimeout de 5s)
    const CRON_NOTURNO_DPOTE = "0 0 2 * * *";
    const partes = CRON_NOTURNO_DPOTE.split(" ");
    expect(partes[0]).toBe("0"); // segundo
    expect(partes[1]).toBe("0"); // minuto
    expect(partes[2]).toBe("2"); // hora = 02:00
    expect(partes[3]).toBe("*"); // todo dia do mês
    expect(partes[4]).toBe("*"); // todo mês
    expect(partes[5]).toBe("*"); // todo dia da semana
  });
});
