const CACHE_NAME = "ritmo-pwa-v1";
const PRECACHE_URLS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/pwa-icon-192.png",
  "/pwa-icon-512.png",
];
const EXCLUDED_PREFIXES = [
  "/api/",
  "/manus-oauth/",
  "/manus-storage/",
  "/__manus/",
  "/__system__/",
];
const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font", "worker"]);
const STATIC_FILE = /\.(?:css|js|mjs|woff2?|ttf|otf|png|jpe?g|svg|webp|ico)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const url of PRECACHE_URLS) {
      try {
        const response = await fetch(url, { cache: "reload" });
        if (response.ok && response.type === "basic") {
          await cache.put(url, response);
        }
      } catch {
        // A missing optional asset must not prevent the worker from installing.
      }
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("ritmo-pwa-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (EXCLUDED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) return;

  if (request.mode === "navigate") {
    event.respondWith((async () => {
      try {
        return await fetch(request);
      } catch {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request))
          || (await cache.match("/"))
          || (await cache.match("/offline.html"))
          || Response.error();
      }
    })());
    return;
  }

  if (!STATIC_DESTINATIONS.has(request.destination) && !STATIC_FILE.test(url.pathname)) return;
  if (url.pathname === "/service-worker.js" || url.pathname === "/register-service-worker.js") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      const cacheControl = response.headers.get("Cache-Control") || "";
      const vary = response.headers.get("Vary") || "";
      const isSafeStaticResponse = response.ok
        && response.type === "basic"
        && !/\b(?:private|no-store)\b/i.test(cacheControl)
        && !/\b(?:cookie|authorization)\b/i.test(vary);
      if (isSafeStaticResponse) await cache.put(request, response.clone());
      return response;
    } catch {
      return new Response("Recurso indisponível sem conexão.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  })());
});
