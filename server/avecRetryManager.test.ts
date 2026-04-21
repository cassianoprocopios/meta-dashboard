import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import {
  registrarRetryFalha,
  verificarRetry,
  marcarComSucesso,
  listarRetrysPendentes,
} from "./avecRetryManager";

describe.skip("Avec Retry Manager", () => {
  const testData = {
    tenantId: 1,
    empresaSlug: "SERAPHINE",
    data: "2026-04-21",
  };

  beforeAll(async () => {
    // Limpar dados de teste antes de começar
    const db = await getDb();
    if (!db) throw new Error("DB não disponível");

    const { avecRetry } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    await db
      .delete(avecRetry)
      .where(
        and(
          eq(avecRetry.tenantId, testData.tenantId),
          eq(avecRetry.empresaSlug, testData.empresaSlug)
        )
      );
  });

  afterAll(async () => {
    // Limpar dados de teste após terminar
    const db = await getDb();
    if (!db) return;

    const { avecRetry } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    await db
      .delete(avecRetry)
      .where(
        and(
          eq(avecRetry.tenantId, testData.tenantId),
          eq(avecRetry.empresaSlug, testData.empresaSlug)
        )
      );
  });

  it("deve registrar uma falha de retry", async () => {
    await registrarRetryFalha({
      ...testData,
      erroMensagem: "Nenhum dado encontrado",
    });

    const status = await verificarRetry(testData);
    expect(status).not.toBeNull();
    expect(status?.tentativas).toBe(1);
    expect(status?.status).toBe("pendente");
  });

  it("deve incrementar tentativas em falhas sucessivas", async () => {
    // Já registrou uma falha no teste anterior
    // Simular que 5 minutos passaram
    const db = await getDb();
    if (!db) throw new Error("DB não disponível");

    const { avecRetry } = await import("../drizzle/schema");
    const { eq, and } = await import("drizzle-orm");

    // Atualizar ultimaTentativa para 6 minutos atrás
    const agora = new Date();
    const seisMinutosAtras = new Date(agora.getTime() - 6 * 60 * 1000);

    await db
      .update(avecRetry)
      .set({ ultimaTentativa: seisMinutosAtras })
      .where(
        and(
          eq(avecRetry.tenantId, testData.tenantId),
          eq(avecRetry.empresaSlug, testData.empresaSlug),
          eq(avecRetry.data, testData.data)
        )
      );

    // Agora deve poder retentar
    const status = await verificarRetry(testData);
    expect(status?.podeRetentar).toBe(true);

    // Registrar segunda falha
    await registrarRetryFalha({
      ...testData,
      erroMensagem: "Erro na segunda tentativa",
    });

    const statusAtualizado = await verificarRetry(testData);
    expect(statusAtualizado?.tentativas).toBe(2);
  });

  it("deve marcar como sucesso", async () => {
    await marcarComSucesso(testData);

    const status = await verificarRetry(testData);
    expect(status?.status).toBe("sucesso");
  });

  it("deve listar retries pendentes", async () => {
    // Registrar novo retry
    const data2 = "2026-04-22";
    await registrarRetryFalha({
      tenantId: testData.tenantId,
      empresaSlug: testData.empresaSlug,
      data: data2,
      erroMensagem: "Teste de listagem",
    });

    const pendentes = await listarRetrysPendentes({
      tenantId: testData.tenantId,
      empresaSlug: testData.empresaSlug,
    });

    // Deve ter pelo menos 1 retry pendente (o do dia 22)
    expect(pendentes.length).toBeGreaterThanOrEqual(1);
    expect(pendentes.some((r) => r.data === data2)).toBe(true);
  });
});
