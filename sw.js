const STATIC_CACHE = "quranu-static-v3";
const RUNTIME_CACHE = "quranu-runtime-v3";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest?v=2",
  "/assets/styles/main.css",
  "/assets/icons/icon-192-v2.png",
  "/assets/icons/icon-512-v2.png",
  "/assets/icons/apple-touch-icon-v2.png",
  "/assets/icons/favicon-32-v2.png",
  "/assets/icons/favicon-16-v2.png",
  "/src/main.js",
  "/src/i18n.js",
  "/src/audioController.js",
  "/src/suraNames.js",
  "/src/surahDisplayMeta.js",
  "/data/processed/surah-catalog.json",
  "/data/study/introduction.json",
  "/data/study/proclamation.json",
  "/data/study/glossary.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
        .map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request, "/index.html"));
    return;
  }

  if (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/assets/styles/") ||
    url.pathname.startsWith("/assets/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname.startsWith("/data/processed/") ||
    url.pathname.startsWith("/data/study/") ||
    url.pathname.startsWith("/assets/fonts/")
  ) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  event.respondWith(cacheFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  const cache = await caches.open(RUNTIME_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || networkPromise;
}

async function networkFirst(request, fallbackPath) {
  const cache = await caches.open(RUNTIME_CACHE);

  try {
    const response = await fetch(request);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    return caches.match(fallbackPath);
  }
}
