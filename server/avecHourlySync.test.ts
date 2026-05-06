import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  iniciarSincronizacaoHorariaAvec,
  pararSincronizacaoHorariaAvec,
  obterStatusSincronizacaoAvec,
  executarSincronizacaoManualAvec,
} from "./avecHourlySync";

describe("Avec Hourly Sync", () => {
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
    expect(Array.isArray(status.erros)).toBe(true);
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

  it("deve manter histórico de erros", () => {
    const status = obterStatusSincronizacaoAvec();
    expect(Array.isArray(status.erros)).toBe(true);
    expect(status.erros.length).toBeLessThanOrEqual(10); // Máximo 10 erros
  });

  it("deve parar corretamente um job parado", () => {
    pararSincronizacaoHorariaAvec();
    const status = obterStatusSincronizacaoAvec();
    expect(status.ativo).toBe(false);
  });
});
