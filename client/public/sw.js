/**
 * Service Worker - Meta Dashboard PWA
 * Responsável por receber e exibir notificações push para os profissionais
 */

const CACHE_NAME = "meta-dashboard-v1";

// Instalar o service worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Ativar o service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

// Receber notificação push
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {
      title: "Meta Dashboard",
      body: event.data.text(),
    };
  }

  const title = payload.title || "Meta Dashboard";
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon-192.png",
    badge: payload.badge || "/icon-192.png",
    tag: payload.tag || "ranking",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clicar na notificação
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/pro";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Se já há uma janela aberta, focar nela
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            return;
          }
        }
        // Caso contrário, abrir nova janela
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
