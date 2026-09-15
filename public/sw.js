// Service worker for the podcast site.
//
// It makes the radio installable and shows a friendly screen when there is no
// connection. It deliberately never caches anything live: the audio stream
// (served by Zeno, another origin), the "now playing" status, and listener
// check-ins always come straight from the network, because a radio app that
// replays stale data is worse than one that says it is offline.

const VERSION = "v1";
const CACHE = `boc-podcast-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/logo.png", "/icon-192.png", "/icon-512.png"];
/** Old build files pile up across deploys; keep the cache from growing forever. */
const MAX_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => key.startsWith("boc-podcast-") && key !== CACHE).map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_ENTRIES;
  for (let i = 0; i < excess; i++) {
    const key = keys[i];
    if (!PRECACHE.includes(new URL(key.url).pathname)) await cache.delete(key);
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // The stream lives on another origin; never touch it.
  if (url.origin !== self.location.origin) return;
  // Live status, the stream address and check-ins: always the network.
  if (url.pathname.startsWith("/api/")) return;

  // Pages: always fresh from the network, with the offline screen as a fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Build files have content hashes in their names, so a cached copy is always
  // correct. Serving them from the cache also avoids an unstyled page while a
  // new version is being deployed.
  const cacheable = url.pathname.startsWith("/_next/static/") || PRECACHE.includes(url.pathname);
  if (!cacheable) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const fresh = await fetch(request);
      if (fresh.ok) {
        await cache.put(request, fresh.clone());
        trim(cache).catch(() => {});
      }
      return fresh;
    })(),
  );
});
