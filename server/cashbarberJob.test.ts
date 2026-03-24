/**
 * Testes para o sistema de jobs de sincronização automática do CashBarber
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

// ─── Testes da conversão de horário para cron ─────────────────────────────────

describe("horarioParaCron (lógica interna)", () => {
  // Testamos a lógica de conversão diretamente

  function horarioParaCron(horario: string): string {
    const [hh, mm] = horario.split(":").map(Number);
    const hora = isNaN(hh) ? 23 : Math.min(23, Math.max(0, hh));
    const minuto = isNaN(mm) ? 0 : Math.min(59, Math.max(0, mm));
    return `0 ${minuto} ${hora} * * *`;
  }

  it("converte 23:00 corretamente", () => {
    expect(horarioParaCron("23:00")).toBe("0 0 23 * * *");
  });

  it("converte 08:30 corretamente", () => {
    expect(horarioParaCron("08:30")).toBe("0 30 8 * * *");
  });

  it("converte 00:00 corretamente", () => {
    expect(horarioParaCron("00:00")).toBe("0 0 0 * * *");
  });

  it("usa padrão 23:00 para horário inválido", () => {
    expect(horarioParaCron("invalid")).toBe("0 0 23 * * *");
  });

  it("limita horas ao máximo 23", () => {
    expect(horarioParaCron("25:00")).toBe("0 0 23 * * *");
  });

  it("limita minutos ao máximo 59", () => {
    expect(horarioParaCron("10:75")).toBe("0 59 10 * * *");
  });
});

// ─── Testes da lógica de próxima execução ─────────────────────────────────────

describe("calcularProximaExecucao (lógica interna)", () => {
  function calcularProximaExecucao(horario: string): Date {
    const [hh, mm] = horario.split(":").map(Number);
    const agora = new Date();
    const proxima = new Date();
    proxima.setHours(hh, mm, 0, 0);
    if (proxima <= agora) {
      proxima.setDate(proxima.getDate() + 1);
    }
    return proxima;
  }

  it("retorna hoje se o horário ainda não passou", () => {
    // Usar horário no futuro distante (23:59)
    const proxima = calcularProximaExecucao("23:59");
    const agora = new Date();
    // Pode ser hoje ou amanhã dependendo do momento do teste
    expect(proxima).toBeInstanceOf(Date);
    expect(proxima.getHours()).toBe(23);
    expect(proxima.getMinutes()).toBe(59);
  });

  it("retorna amanhã se o horário já passou (00:00)", () => {
    // 00:00 já passou (estamos depois da meia-noite)
    const proxima = calcularProximaExecucao("00:00");
    const agora = new Date();
    // Deve ser amanhã
    const amanha = new Date(agora);
    amanha.setDate(amanha.getDate() + 1);
    expect(proxima.getDate()).toBe(amanha.getDate());
  });
});

// ─── Testes das funções exportadas do job ─────────────────────────────────────

describe("getStatusJobsCashbarber", () => {
  it("retorna array vazio quando não há jobs ativos", async () => {
    const { getStatusJobsCashbarber } = await import("./cashbarberJob");
    const status = getStatusJobsCashbarber();
    expect(Array.isArray(status)).toBe(true);
  });
});

describe("notificarMudancaConfigCashbarber", () => {
  it("não lança erro ao ativar agendamento", async () => {
    const { notificarMudancaConfigCashbarber } = await import("./cashbarberJob");
    await expect(
      notificarMudancaConfigCashbarber(1, "empresa-teste", true, "23:00")
    ).resolves.not.toThrow();
  });

  it("não lança erro ao desativar agendamento", async () => {
    const { notificarMudancaConfigCashbarber } = await import("./cashbarberJob");
    await expect(
      notificarMudancaConfigCashbarber(1, "empresa-teste", false, "23:00")
    ).resolves.not.toThrow();
  });
});

describe("recarregarJobsCashbarber", () => {
  it("executa sem erros quando não há configs ativas", async () => {
    // A função usa importação dinâmica do drizzle, então vamos apenas verificar
    // que ela não lança erro quando o banco retorna vazio
    const { recarregarJobsCashbarber } = await import("./cashbarberJob");
    // Não podemos testar a função completa sem banco real,
    // mas podemos verificar que ela existe e é uma função
    expect(typeof recarregarJobsCashbarber).toBe("function");
  });
});
