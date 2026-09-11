// Deliberately conservative: this makes HANAEats installable and keeps the
// app shell reachable when a connection drops mid-navigation. It does NOT
// cache API responses or claim the whole dashboard works offline — the POS
// order queue (IndexedDB, see lib/offline-queue.ts) is what actually lets an
// order be taken with no signal. Caching live business data here would risk
// showing stale menu/orders/stock, which is worse than a clear "you're offline" page.

const CACHE_NAME = "hanaeats-shell-v1";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [OFFLINE_URL, "/icon.png", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never intercept API calls — always let those hit the network (or fail
  // visibly) so the app's own offline-queue logic is what handles them.
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: try the network, fall back to the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Static assets (Next's hashed build output, icons): cache-first.
  if (url.pathname.startsWith("/_next/static/") || SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return res;
      }))
    );
  }
});
