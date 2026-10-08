const CACHE_NAME = "mrf-v1";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only GET requests to our own origin
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls, fall back to cache
  if (url.pathname.startsWith("/api")) return;

  event.respondWith(
    fetch(request)
      .then((res) => {
        // Cache successful responses
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request).then((c) => c || caches.match("/")))
  );
});