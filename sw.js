// LaboratorIA — Service Worker (offline-first para los archivos propios).
// Sube el número de versión cuando cambies archivos para forzar actualización.
const CACHE = 'laboratoria-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/data.js',
  './js/icons.js',
  './js/app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Solo gestionamos archivos del mismo origen. Fuentes y enlaces externos
  // (a las herramientas de IA) pasan directo a la red.
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero, con respaldo al index cacheado (offline).
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }

  // Recursos propios: cache primero, y si no, red (y se guarda).
  e.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
