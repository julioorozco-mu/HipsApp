const CACHE_PREFIX = "hipsapp-static-";
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const STATIC_ASSETS = [
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon.svg",
  "/icons/icon-maskable.svg",
];
const STATIC_PATHS = new Set(STATIC_ASSETS);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== CACHE_NAME &&
                (key.startsWith(CACHE_PREFIX) || key.startsWith("hipsapp-cache-"))
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (!request.url.startsWith(self.location.origin)) return;

  const url = new URL(request.url);

  // Las pantallas autenticadas, navegaciones y respuestas RSC siempre deben
  // venir de la red. Cachearlas mezcla fechas, sesiones y usuarios anteriores.
  if (!STATIC_PATHS.has(url.pathname)) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;

      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
  );
});
