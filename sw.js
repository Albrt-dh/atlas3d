// Service worker: guarda la app para usarla sin internet y la actualiza sola.
// IMPORTANTE: incrementa VERSION en cada entrega para que los dispositivos reciban los cambios.
const VERSION = 'atlas3d-v0.11.0';
const NUCLEO = [
  './', './index.html', './manifest.webmanifest', './css/estilos.css',
  './js/main.js', './js/herramientas.js', './js/motor.js', './js/modulos.js', './js/recursos.js', './js/ui.js',
  './js/store.js', './js/catalogo.js', './js/animacion.js', './js/modulos/celula.js', './js/modulos/membrana.js', './js/modulos/metabolismo.js', './js/modulos/genetica.js', './js/modulos/biomoleculas.js', './js/modulos/micro.js', './js/modulos/neurona.js', './js/modulos/sarcomero.js', './js/modulos/nefrona.js', './js/modulos/alveolo.js', './js/modulos/tegumentario.js', './js/modulos/sangre_inmune.js', './js/modulos/eje_hipofisis.js', './js/punnett.js', './js/iconos.js', './js/examen.js',
  './datos/celula.json', './datos/membrana.json', './datos/metabolismo.json', './datos/genetica.json', './datos/biomoleculas.json', './datos/micro.json', './datos/neurona.json', './datos/sarcomero.json', './datos/nefrona.json', './datos/alveolo.json', './datos/tegumentario.json', './datos/sangre_inmune.json', './datos/eje_hipofisis.json', './iconos/icono-192.png', './iconos/icono-512.png',
];
const EXTERNOS = [
  'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(NUCLEO);
    await Promise.all(EXTERNOS.map((u) => c.add(u).catch(() => {})));
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Primero la caché; si no está, red y se guarda (incluye modelos, librerías y fuentes).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then((guardado) => guardado || fetch(e.request).then((r) => {
    if (r.ok || r.type === 'opaque') {
      const copia = r.clone();
      caches.open(VERSION).then((c) => c.put(e.request, copia));
    }
    return r;
  }).catch(() => (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error()))));
});
