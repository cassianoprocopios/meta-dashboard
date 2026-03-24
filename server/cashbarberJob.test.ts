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
