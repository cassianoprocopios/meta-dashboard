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

/**
 * Envia notificação push de ranking às 12h para todos os profissionais
 * com subscription ativa em um tenant.
 * Mensagem personalizada: posição atual, faturamento do mês, falta para subir.
 */
export async function enviarPushRankingDiario(tenantId: number): Promise<{ enviados: number; falhas: number; semSubscription: number }> {
  const db = await getDb();
  if (!db) return { enviados: 0, falhas: 0, semSubscription: 0 };

  // Buscar todas as subscriptions ativas do tenant
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(and(eq(pushSubscriptions.tenantId, tenantId), eq(pushSubscriptions.ativo, 1)));

  if (subs.length === 0) return { enviados: 0, falhas: 0, semSubscription: 0 };

  // Importar funções necessárias
  const { listarRankingPorPeriodo, listarColaboradores } = await import("./db");

  const agora = new Date();
  const mes = agora.getMonth() + 1;
  const ano = agora.getFullYear();

  // Buscar ranking do mês atual
  const { itens: ranking } = await listarRankingPorPeriodo(tenantId, mes, ano);
  const todosColaboradores = await listarColaboradores(tenantId);

  // Ordenar ranking por totalGeral decrescente
  const rankingOrdenado = [...ranking].sort((a, b) => b.totalGeral - a.totalGeral);

  const fmtMoeda = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const ICON = "https://d2xsxph8kpxj0f.cloudfront.net/310519663456579702/MANH2fxvkecBuwjELBL3u8/icon-192_a3de3eb2.png";

  let enviados = 0;
  let falhas = 0;
  let semSubscription = 0;

  for (const sub of subs) {
    const posicaoIdx = rankingOrdenado.findIndex((r) => r.colaboradorId === sub.colaboradorId);
    if (posicaoIdx === -1) {
      semSubscription++;
      continue;
    }

    const profissional = rankingOrdenado[posicaoIdx];
    const posicao = posicaoIdx + 1;
    const totalGeral = profissional.totalGeral;

    // Calcular falta para subir (diferença para o profissional acima)
    let faltaParaSubir: number | null = null;
    let nomeProximo: string | null = null;
    if (posicao > 1) {
      const acima = rankingOrdenado[posicaoIdx - 1];
      faltaParaSubir = Math.max(0, acima.totalGeral - totalGeral + 1);
      nomeProximo = acima.apelido || acima.nome;
    }

    // Buscar meta mensal do colaborador
    const colData = todosColaboradores.find((c) => c.id === sub.colaboradorId);
    const metaMensal = colData?.metaMensal ? Number(colData.metaMensal) : null;
    const pctMeta = metaMensal && metaMensal > 0 ? Math.min(100, Math.round((totalGeral / metaMensal) * 100)) : null;

    // Montar mensagem personalizada
    const emoji = posicao === 1 ? "👑" : posicao <= 3 ? "🏆" : "💪";
    let body = `${emoji} Você está em ${posicao}º lugar com ${fmtMoeda(totalGeral)} este mês.`;
    if (faltaParaSubir !== null && faltaParaSubir > 0) {
      body += ` Faltam ${fmtMoeda(faltaParaSubir)} para superar ${nomeProximo?.split(" ")[0] ?? "o próximo"}!`;
    } else if (posicao === 1) {
      body += " Continue no topo! 🔥";
    }
    if (pctMeta !== null) {
      body += ` Meta: ${pctMeta}%.`;
    }

    const payload: PushPayload = {
      title: "🏆 Ranking do Dia",
      body,
      icon: ICON,
      badge: ICON,
      tag: "ranking-diario",
      data: { url: "/pro" },
    };

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload)
      );
      enviados++;
    } catch (err: any) {
      falhas++;
      console.error(`[Push Ranking] Erro ao enviar para colaborador ${sub.colaboradorId}:`, err?.message);
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await db.update(pushSubscriptions).set({ ativo: 0, updatedAt: new Date() }).where(eq(pushSubscriptions.id, sub.id));
      }
    }
  }

  console.log(`[Push Ranking] Tenant ${tenantId}: ${enviados} enviados, ${falhas} falhas, ${semSubscription} sem ranking`);
  return { enviados, falhas, semSubscription };
}
