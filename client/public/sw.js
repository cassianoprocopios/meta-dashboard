/**
 * Service Worker - Meta Dashboard PWA
 * Responsável por receber e exibir notificações push para os profissionais
 */

const CACHE_NAME = "meta-dashboard-v2";
const ICON_192 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663456579702/MANH2fxvkecBuwjELBL3u8/icon-192_a3de3eb2.png";
const ICON_512 = "https://d2xsxph8kpxj0f.cloudfront.net/310519663456579702/MANH2fxvkecBuwjELBL3u8/icon-512-E7z6di6WKn4jTJE4AhHca6.png";

// Instalar o service worker
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// Ativar o service worker
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => clients.claim())
  );
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
    icon: payload.icon || ICON_192,
    badge: payload.badge || ICON_192,
    image: payload.image || undefined,
    tag: payload.tag || "ranking",
    data: payload.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
    actions: payload.actions || [],
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
            client.navigate(urlToOpen);
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
