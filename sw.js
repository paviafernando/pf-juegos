// PF Juegos sin internet: guarda el índice, sus librerías y la última lista de juegos.
const C = 'pfj-v1';
const CORE = ['/', '/hub.js', '/hub.css', '/games.js', '/manifest.webmanifest', '/icon.svg',
  'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(C).then((c) => Promise.all(CORE.map((u) => c.add(u).catch(() => {})))));
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== C) await caches.delete(k);
  await self.clients.claim();
})()));

const save = (key, r) => { if (r && (r.ok || r.type === 'opaque')) { const cp = r.clone(); caches.open(C).then((c) => c.put(key, cp)); } return r; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const sameOrigin = u.origin === location.origin;

  // Librerías y tipografías de otros sitios: primero lo guardado.
  if (!sameOrigin) {
    if (!/cdn\.jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(u.host)) return;
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => save(req, r))));
    return;
  }
  // Página, código y lista de juegos: primero internet (para tener lo último), si no hay, lo guardado.
  const key = req.mode === 'navigate' ? '/' : req;
  e.respondWith(fetch(req).then((r) => save(key, r))
    .catch(async () => (await caches.match(key, { ignoreSearch: true })) || Response.error()));
});
