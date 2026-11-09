// Offline support: every same-origin GET is served from cache when present and refreshed in the background.
// Opened guides (and their models) keep working without a connection.
const CACHE = 'brick-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/build/', '/manifest.webmanifest', '/icon.svg'])));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return; // analytics and everything else go straight to the network
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const nav = req.mode === 'navigate';
      // every /build/<set> page is the same HTML shell
      const key = nav && url.pathname.startsWith('/build/') ? '/build/' : req;
      const hit = await cache.match(key, { ignoreSearch: nav });
      const fresh = fetch(req)
        .then((res) => { if (res.ok || res.type === 'opaque') cache.put(key, res.clone()); return res; })
        .catch(() => hit || Response.error());
      return hit || fresh;
    }),
  );
});
