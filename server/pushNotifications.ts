/**
 * Helper para envio de notificações push PWA via web-push (VAPID)
 * Usado para notificar profissionais sobre posição no ranking e metas
 */
import webpush from "web-push";
import { getDb } from "./db";
import { pushSubscriptions } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

// Configurar VAPID com as chaves do ambiente
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@barbiero.com.br",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

/**
 * Salva ou atualiza uma subscription de push no banco
 */
export async function salvarPushSubscription(
  tenantId: number,
  colaboradorId: number,
  endpoint: string,
  p256dh: string,
  auth: string,
  userAgent?: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("DB não disponível");

  const existing = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.colaboradorId, colaboradorId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(pushSubscriptions)
      .set({ endpoint, p256dh, auth, userAgent: userAgent ?? null, ativo: 1, updatedAt: new Date() })
      .where(eq(pushSubscriptions.id, existing[0].id));
  } else {
    await db.insert(pushSubscriptions).values({
      tenantId,
      colaboradorId,
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      ativo: 1,
    });
  }
}

/**
 * Remove a subscription de push de um profissional
 */
export async function removerPushSubscription(
  tenantId: number,
  colaboradorId: number
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db
    .update(pushSubscriptions)
    .set({ ativo: 0, updatedAt: new Date() })
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.colaboradorId, colaboradorId)
      )
    );
}

/**
 * Verifica se um profissional tem subscription ativa
 */
export async function temPushSubscription(
  tenantId: number,
  colaboradorId: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const rows = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.colaboradorId, colaboradorId),
        eq(pushSubscriptions.ativo, 1)
      )
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Envia notificação push para um profissional específico
 * Retorna true se enviou com sucesso, false se falhou
 */
export async function enviarPushParaProfissional(
  tenantId: number,
  colaboradorId: number,
  payload: PushPayload
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.colaboradorId, colaboradorId),
        eq(pushSubscriptions.ativo, 1)
      )
    );

  if (subs.length === 0) return false;

  let enviou = false;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      enviou = true;
    } catch (err: any) {
      console.error(`[Push] Erro ao enviar para colaborador ${colaboradorId}:`, err?.message);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db
          .update(pushSubscriptions)
          .set({ ativo: 0, updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }
  return enviou;
}

/**
 * Envia notificação push para todos os profissionais com subscription ativa de um tenant
 */
export async function enviarPushParaTodos(
  tenantId: number,
  payload: PushPayload
): Promise<{ enviados: number; falhas: number }> {
  const db = await getDb();
  if (!db) return { enviados: 0, falhas: 0 };

  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.tenantId, tenantId),
        eq(pushSubscriptions.ativo, 1)
      )
    );

  let enviados = 0;
  let falhas = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
      enviados++;
    } catch (err: any) {
      falhas++;
      console.error(`[Push] Erro ao enviar para sub ${sub.id}:`, err?.message);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db
          .update(pushSubscriptions)
          .set({ ativo: 0, updatedAt: new Date() })
          .where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  return { enviados, falhas };
}
