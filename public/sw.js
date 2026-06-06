/* HΦSTO service worker — cache-first p/ funcionamento offline */
const CACHE = 'hfsto-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/favicon.png', './assets/logo-mark.png',
  './assets/icon-192.png', './assets/icon-512.png',
  './js/core/data.js', './js/core/i18n.js', './js/core/calc.js',
  './js/core/extras.js', './js/core/nfc.js',
  './js/store/store.jsx',
  './js/ui/ui.jsx', './js/ui/buildviz.jsx', './js/ui/tweaks-panel.jsx',
  './js/screens/detailed.jsx', './js/screens/calculator.jsx', './js/screens/manage.jsx',
  './js/screens/calendar.jsx', './js/screens/catalog.jsx', './js/screens/clients.jsx',
  './js/screens/compare.jsx', './js/screens/dashboard.jsx', './js/screens/screens.jsx',
  './js/app/app.jsx', './js/app/nfc-modal.jsx', './js/app/cmdk.jsx', './js/app/tweaks-app.jsx',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        // atualiza cache em background (stale-while-revalidate) p/ mesma origem
        if (res && res.status === 200 && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
