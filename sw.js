// ============================================================
// Service worker: app instalable y jugable sin conexión
// ============================================================
const VERSION = 'v58';
const CACHE = 'intentorpg-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/ui.js',
  './js/world.js',
  './js/entities.js',
  './js/items.js',
  './js/data.js',
  './js/economy.js',
  './js/enemy-abilities.js',
  './js/game-endgame.js',
  './js/game-world-flow.js',
  './js/game-zone-life.js',
  './js/game-mastery.js',
  './js/game-eras.js',
  './js/input.js',
  './js/bindings.js',
  './js/sfx.js',
  './js/vfx.js',
  './js/zones.js',
  './js/music.js',
  './js/postfx.js',
  './js/particles.js',
  './js/fx-skills.js',
  './js/fx-enemies.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
];

// Addons de post-procesado (post-fx: bloom + viñeta + grading). Se precachean
// aparte y de forma NO atómica: si alguno falla, el post-procesado se degrada
// con elegancia (render directo) sin romper la instalación del núcleo offline.
// Incluye los módulos transitivos que importan EffectComposer/UnrealBloomPass.
const ADDON_BASE = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/';
const ADDONS = [
  // núcleo del composer + bloom + viñeta + output
  'postprocessing/EffectComposer.js',
  'postprocessing/RenderPass.js',
  'postprocessing/UnrealBloomPass.js',
  'postprocessing/ShaderPass.js',
  'postprocessing/OutputPass.js',
  'postprocessing/Pass.js',
  'postprocessing/MaskPass.js',
  'shaders/CopyShader.js',
  'shaders/LuminosityHighPassShader.js',
  'shaders/OutputShader.js',
  // oclusión ambiental de contacto (GTAO) + sus shaders/ruido
  'postprocessing/GTAOPass.js',
  'shaders/GTAOShader.js',
  'shaders/PoissonDenoiseShader.js',
  'math/SimplexNoise.js',
  // antialias SMAA + su shader
  'postprocessing/SMAAPass.js',
  'shaders/SMAAShader.js',
  // contorno estilizado (héroe/enemigos)
  'postprocessing/OutlinePass.js',
  // IBL gratis: entorno PMREM (RoomEnvironment) para realce PBR
  'environments/RoomEnvironment.js',
].map((p) => ADDON_BASE + p);

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS)
        // addons en paralelo, tolerante a fallos individuales (no aborta install)
        .then(() => Promise.all(ADDONS.map((u) => c.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  // CDN versionado (three.js): cache-first, no cambia nunca
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
      }))
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // Recursos propios: stale-while-revalidate (rápido + se actualiza solo)
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const refresh = fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || refresh;
    })
  );
});
