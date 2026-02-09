// Service Worker (Basis): cached App-Shell + cached Next.js-Assets (/_next/static)
// Ziel: Nach 1x Online-Besuch soll die App auch offline starten.

const CACHE_NAME = "tdw-cache-v2";
const PRECACHE_URLS = [
  "/",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/images/cover-01.jpg",
  "/images/logo.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNextStatic = url.pathname.startsWith("/_next/static/");
const isNextImage = url.pathname === "/_next/image";
  const isAsset =
  isNextStatic ||
  isNextImage ||
  url.pathname.endsWith(".js") ||
  url.pathname.endsWith(".css") ||
  url.pathname.endsWith(".png") ||
  url.pathname.endsWith(".jpg") ||
  url.pathname.endsWith(".jpeg") ||
  url.pathname.endsWith(".svg") ||
  url.pathname.endsWith(".webp") ||
  url.pathname.endsWith(".ico");

  // Navigation (Seitenaufrufe): Network zuerst, sonst Cache, sonst "/"
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // HTML kann man auch cachen, damit Offline-Reload besser klappt
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/version")) || (await caches.match("/")))
    );
    return;
  }

  // Assets (wichtig für Next): Cache-first, beim ersten Online-Laden wird alles gespeichert
  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        });
      })
    );
    return;
  }

  // Sonst: Network-first, fallback Cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
