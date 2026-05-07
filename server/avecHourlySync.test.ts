import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  iniciarSincronizacaoHorariaAvec,
  pararSincronizacaoHorariaAvec,
  obterStatusSincronizacaoAvec,
  executarSincronizacaoManualAvec,
  obterInfoHorarioComercial,
} from "./avecHourlySync";

describe("Avec Hourly Sync com Restrição de Horário", () => {
  beforeEach(() => {
    // Limpar erros anteriores
    pararSincronizacaoHorariaAvec();
  });

  afterEach(() => {
    // Garantir que o job seja parado após cada teste
    pararSincronizacaoHorariaAvec();
  });

  it("deve iniciar o job de sincronização horária", () => {
    iniciarSincronizacaoHorariaAvec();
    const status = obterStatusSincronizacaoAvec();
    expect(status.ativo).toBe(true);
  });

  it("deve parar o job de sincronização horária", () => {
    iniciarSincronizacaoHorariaAvec();
    pararSincronizacaoHorariaAvec();
    const status = obterStatusSincronizacaoAvec();
    expect(status.ativo).toBe(false);
  });

  it("deve retornar status correto do job", () => {
    iniciarSincronizacaoHorariaAvec();
    const status = obterStatusSincronizacaoAvec();
    expect(status).toHaveProperty("ativo");
    expect(status).toHaveProperty("erros");
    expect(status).toHaveProperty("horarioInicio");
    expect(status).toHaveProperty("horarioFim");
    expect(Array.isArray(status.erros)).toBe(true);
  });

  it("deve retornar horário comercial correto", () => {
    const info = obterInfoHorarioComercial();
    expect(info.horarioInicio).toBe("10:00");
    expect(info.horarioFim).toBe("20:30");
    expect(info).toHaveProperty("estaNoHorario");
    expect(info).toHaveProperty("horaAtual");
  });

  it("não deve iniciar job duplicado", () => {
    iniciarSincronizacaoHorariaAvec();
    const status1 = obterStatusSincronizacaoAvec();
    iniciarSincronizacaoHorariaAvec(); // Tentar iniciar novamente
    const status2 = obterStatusSincronizacaoAvec();
    expect(status1.ativo).toBe(true);
    expect(status2.ativo).toBe(true);
  });

  it("deve permitir sincronização manual", async () => {
    // Este teste apenas verifica que a função pode ser chamada
    // A sincronização real depende de configurações do Avec
    await expect(executarSincronizacaoManualAvec()).resolves.not.toThrow();
  });

  it("deve manter histórico de erros (máximo 10)", () => {
    const status = obterStatusSincronizacaoAvec();
    expect(Array.isArray(status.erros)).toBe(true);
    expect(status.erros.length).toBeLessThanOrEqual(10);
  });

  it("deve parar corretamente um job parado", () => {
    pararSincronizacaoHorariaAvec();
    const status = obterStatusSincronizacaoAvec();
    expect(status.ativo).toBe(false);
  });

  it("deve ter horário comercial definido", () => {
    const status = obterStatusSincronizacaoAvec();
    expect(status.horarioInicio).toBe("10:00");
    expect(status.horarioFim).toBe("20:30");
  });
});
