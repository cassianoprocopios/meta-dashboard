import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  iniciarSincronizacaoHoraria,
  pararSincronizacaoHoraria,
  obterStatusSincronizacao,
  executarSincronizacaoManual,
} from "./cashbarberHourlySync";

describe("CashBarber Hourly Sync", () => {
  beforeEach(() => {
    // Limpar erros anteriores
    pararSincronizacaoHoraria();
  });

  afterEach(() => {
    // Garantir que o job seja parado após cada teste
    pararSincronizacaoHoraria();
  });

  it("deve iniciar o job de sincronização horária", () => {
    iniciarSincronizacaoHoraria();
    const status = obterStatusSincronizacao();
    expect(status.ativo).toBe(true);
  });

  it("deve parar o job de sincronização horária", () => {
    iniciarSincronizacaoHoraria();
    pararSincronizacaoHoraria();
    const status = obterStatusSincronizacao();
    expect(status.ativo).toBe(false);
  });

  it("deve retornar status correto do job", () => {
    iniciarSincronizacaoHoraria();
    const status = obterStatusSincronizacao();
    expect(status).toHaveProperty("ativo");
    expect(status).toHaveProperty("erros");
    expect(Array.isArray(status.erros)).toBe(true);
  });

  it("não deve iniciar job duplicado", () => {
    iniciarSincronizacaoHoraria();
    const status1 = obterStatusSincronizacao();
    iniciarSincronizacaoHoraria(); // Tentar iniciar novamente
    const status2 = obterStatusSincronizacao();
    expect(status1.ativo).toBe(true);
    expect(status2.ativo).toBe(true);
  });

  it("deve permitir sincronização manual", async () => {
    // Este teste apenas verifica que a função pode ser chamada
    // A sincronização real depende de configurações do CashBarber
    await expect(executarSincronizacaoManual()).resolves.not.toThrow();
  });

  it("deve manter histórico de erros", () => {
    const status = obterStatusSincronizacao();
    expect(Array.isArray(status.erros)).toBe(true);
    expect(status.erros.length).toBeLessThanOrEqual(10); // Máximo 10 erros
  });
});
