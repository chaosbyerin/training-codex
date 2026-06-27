// The Training Codex — Service Worker
// Handles offline caching and local notification scheduling.

const CACHE_NAME = "training-codex-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Offline-first: serve from cache, fall back to network, cache new responses.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});

// ── Local notification scheduling ──────────────────────────────────────────
// The page posts a message here with a delay + text; this worker fires a
// Notification after that delay using setTimeout. This only works while the
// service worker stays alive, which browsers don't guarantee for long delays
// — it's a best-effort local reminder, not a guaranteed push notification.
self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "SCHEDULE_NOTIFICATION") {
    const { title, body, delayMs, tag } = data;
    setTimeout(() => {
      self.registration.showNotification(title || "The Training Codex", {
        body: body || "Time for today's quest.",
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: tag || "codex-reminder",
        renotify: true,
      });
    }, Math.max(0, delayMs || 0));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      if (clients.length > 0) {
        clients[0].focus();
      } else {
        self.clients.openWindow("./index.html");
      }
    })
  );
});
