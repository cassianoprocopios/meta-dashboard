/**
 * Módulo de Retry para Sincronização do Avec
 *
 * Gerencia tentativas de sincronização que falharam (total = 0).
 * Permite retry automático após 5 minutos, máximo 3 tentativas.
 */

import { getDb } from "./db";

const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutos
const MAX_RETRIES = 3;

export interface RetryStatus {
  tentativas: number;
  proximaTentativaEm: number; // timestamp em ms
  podeRetentar: boolean;
  status: "pendente" | "sucesso" | "falhou";
}

/**
 * Registra uma tentativa de sincronização que falhou
 */
export async function registrarRetryFalha(params: {
  tenantId: number;
  empresaSlug: string;
  data: string; // YYYY-MM-DD
  erroMensagem?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { avecRetry } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  // Verificar se já existe um registro de retry para este dia
  const existente = await db
    .select()
    .from(avecRetry)
    .where(
      and(
        eq(avecRetry.tenantId, params.tenantId),
        eq(avecRetry.empresaSlug, params.empresaSlug),
        eq(avecRetry.data, params.data)
      )
    )
    .limit(1);

  if (existente.length > 0) {
    // Atualizar registro existente
    const tentativasAtuais = existente[0].tentativas + 1;
    const novoStatus =
      tentativasAtuais >= MAX_RETRIES ? "falhou" : "pendente";

    await db
      .update(avecRetry)
      .set({
        tentativas: tentativasAtuais,
        ultimaTentativa: new Date(),
        status: novoStatus,
        erroMensagem: params.erroMensagem || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(avecRetry.tenantId, params.tenantId),
          eq(avecRetry.empresaSlug, params.empresaSlug),
          eq(avecRetry.data, params.data)
        )
      );

    console.log(
      `[Avec Retry] ${params.data}: Tentativa ${tentativasAtuais}/${MAX_RETRIES} registrada`
    );
  } else {
    // Criar novo registro
    await db.insert(avecRetry).values({
      tenantId: params.tenantId,
      empresaSlug: params.empresaSlug,
      data: params.data,
      tentativas: 1,
      ultimaTentativa: new Date(),
      status: "pendente",
      erroMensagem: params.erroMensagem || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(
      `[Avec Retry] ${params.data}: Primeira tentativa registrada`
    );
  }
}

/**
 * Verifica se um dia pode ser retentado
 */
export async function verificarRetry(params: {
  tenantId: number;
  empresaSlug: string;
  data: string; // YYYY-MM-DD
}): Promise<RetryStatus | null> {
  const db = await getDb();
  if (!db) return null;

  const { avecRetry } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const registro = await db
    .select()
    .from(avecRetry)
    .where(
      and(
        eq(avecRetry.tenantId, params.tenantId),
        eq(avecRetry.empresaSlug, params.empresaSlug),
        eq(avecRetry.data, params.data)
      )
    )
    .limit(1);

  if (registro.length === 0) {
    return null;
  }

  const r = registro[0];
  const agora = Date.now();
  const ultimaTentativa = r.ultimaTentativa.getTime();
  const proximaTentativaEm = ultimaTentativa + RETRY_INTERVAL_MS;
  const podeRetentar =
    agora >= proximaTentativaEm && r.tentativas < MAX_RETRIES;

  return {
    tentativas: r.tentativas,
    proximaTentativaEm,
    podeRetentar,
    status: r.status as "pendente" | "sucesso" | "falhou",
  };
}

/**
 * Marca um dia como sincronizado com sucesso
 */
export async function marcarComSucesso(params: {
  tenantId: number;
  empresaSlug: string;
  data: string; // YYYY-MM-DD
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { avecRetry } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  await db
    .update(avecRetry)
    .set({
      status: "sucesso",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(avecRetry.tenantId, params.tenantId),
        eq(avecRetry.empresaSlug, params.empresaSlug),
        eq(avecRetry.data, params.data)
      )
    );

  console.log(
    `[Avec Retry] ${params.data}: Marcado como sucesso`
  );
}

/**
 * Obtém lista de dias pendentes de retry
 */
export async function listarRetrysPendentes(params: {
  tenantId: number;
  empresaSlug: string;
}): Promise<
  Array<{
    data: string;
    tentativas: number;
    proximaTentativaEm: number;
    podeRetentar: boolean;
  }>
> {
  const db = await getDb();
  if (!db) return [];

  const { avecRetry } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const registros = await db
    .select()
    .from(avecRetry)
    .where(
      and(
        eq(avecRetry.tenantId, params.tenantId),
        eq(avecRetry.empresaSlug, params.empresaSlug)
      )
    );

  const agora = Date.now();

  return registros
    .filter((r) => r.status === "pendente")
    .map((r) => {
      const ultimaTentativa = r.ultimaTentativa.getTime();
      const proximaTentativaEm = ultimaTentativa + RETRY_INTERVAL_MS;
      const podeRetentar =
        agora >= proximaTentativaEm && r.tentativas < MAX_RETRIES;

      return {
        data: r.data,
        tentativas: r.tentativas,
        proximaTentativaEm,
        podeRetentar,
      };
    });
}

/**
 * Limpa registros de retry que já foram sincronizados com sucesso
 * (mantém histórico dos últimos 30 dias)
 */
export async function limparRetrysSucesso(params: {
  tenantId: number;
  empresaSlug: string;
  diasRetencao?: number; // padrão: 30
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { avecRetry } = await import("../drizzle/schema");
  const { eq, and, lt } = await import("drizzle-orm");

  const diasRetencao = params.diasRetencao || 30;
  const dataLimite = new Date();
  dataLimite.setDate(dataLimite.getDate() - diasRetencao);

  await db
    .delete(avecRetry)
    .where(
      and(
        eq(avecRetry.tenantId, params.tenantId),
        eq(avecRetry.empresaSlug, params.empresaSlug),
        eq(avecRetry.status, "sucesso"),
        lt(avecRetry.createdAt, dataLimite)
      )
    );

  console.log(
    `[Avec Retry] Limpeza de registros com sucesso anterior a ${dataLimite.toISOString()}`
  );
}
