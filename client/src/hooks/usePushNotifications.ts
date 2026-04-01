/**
 * Hook para gerenciar notificações push PWA
 * Registra o service worker, solicita permissão e salva a subscription no servidor
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushStatus = "loading" | "unsupported" | "denied" | "inactive" | "active";

export function usePushNotifications(profissionalId: number | null) {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [isRegistering, setIsRegistering] = useState(false);

  const { data: subData } = trpc.profissionais.temPushSubscription.useQuery(
    { profissionalId: profissionalId! },
    { enabled: !!profissionalId, staleTime: 1000 * 60 * 5 }
  );

  const salvarMutation = trpc.profissionais.salvarPushSubscription.useMutation();
  const removerMutation = trpc.profissionais.removerPushSubscription.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!profissionalId) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    if (subData !== undefined) {
      setStatus(subData.ativo ? "active" : "inactive");
    }
  }, [profissionalId, subData]);

  const ativar = useCallback(async () => {
    if (!profissionalId || !VAPID_PUBLIC_KEY) return;
    setIsRegistering(true);
    try {
      // Registrar service worker
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Solicitar permissão
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // Criar subscription
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const subJson = sub.toJSON();
      if (!subJson.keys?.p256dh || !subJson.keys?.auth) {
        throw new Error("Subscription inválida");
      }

      await salvarMutation.mutateAsync({
        profissionalId,
        endpoint: sub.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
        userAgent: navigator.userAgent.substring(0, 256),
      });

      setStatus("active");
      utils.profissionais.temPushSubscription.invalidate({ profissionalId });
    } catch (err) {
      console.error("[Push] Erro ao ativar:", err);
    } finally {
      setIsRegistering(false);
    }
  }, [profissionalId, salvarMutation, utils]);

  const desativar = useCallback(async () => {
    if (!profissionalId) return;
    setIsRegistering(true);
    try {
      // Remover subscription do browser
      if ("serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        }
      }
      // Remover do servidor
      await removerMutation.mutateAsync({ profissionalId });
      setStatus("inactive");
      utils.profissionais.temPushSubscription.invalidate({ profissionalId });
    } catch (err) {
      console.error("[Push] Erro ao desativar:", err);
    } finally {
      setIsRegistering(false);
    }
  }, [profissionalId, removerMutation, utils]);

  return { status, isRegistering, ativar, desativar };
}
