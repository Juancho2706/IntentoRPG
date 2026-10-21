// ============================================================
// Service worker: app instalable y jugable sin conexión
// ============================================================
const VERSION = 'v104';
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
  './js/game-talents.js',
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
  './js/rng.js',
  './js/timers.js',
  './js/save-schema.js',
  './js/materials.js',
  './js/combat-math.js',
  './js/skill-defs.js',
  './js/skill-resolve.js',
  './js/game-skills.js',
  './js/resources.js',
  './js/powers.js',
  './js/powers-common.js',
  './js/field-entities.js',
  './js/skills-guerrero.js',
  './js/skills-maga.js',
  './js/skills-arquera.js',
  './js/fx-skills-guerrero.js',
  './js/fx-skills-maga.js',
  './js/fx-skills-arquera.js',
  // Paso 2c.0: talentos, especializaciones, indicadores y poderes por clase
  './js/talents.js',
  './js/talents-guerrero.js',
  './js/talents-maga.js',
  './js/talents-arquera.js',
  './js/talents-ops.js',
  './js/ui-talents.js',
  './js/spec-mechanics.js',
  './js/powers-guerrero.js',
  './js/powers-maga.js',
  './js/powers-arquera.js',
  './css/talents.css',
  // Paso 2d: modelo puro del HUD + indicador de especialización
  './js/hud-model.js',
  './js/ui-gauges.js',
  // Paso 2d.2: barras de mecánica por clase, sus estilos y las marcas de mundo
  './js/ui-gauges-guerrero.js',
  './js/ui-gauges-maga.js',
  './js/ui-gauges-arquera.js',
  './js/world-marks.js',
  './css/gauges.css',
  './css/gauges-guerrero.css',
  './css/gauges-maga.css',
  './css/gauges-arquera.css',
  // Paso 2 (2f + 2g), E0.3: progresión, tablero de Paragon y mecánicas por clase (salen de entities/data/spec-mechanics)
  './js/progression.js',
  './js/paragon-board.js',
  './js/mech-guerrero.js',
  './js/mech-maga.js',
  './js/mech-arquera.js',
  // Paso 2, E0.6 (D24): TODAS las rutas nuevas de §2.1 nacen aquí (stubs con sus exports). talent-text.js
  // lo crea P3 (E0.4): cache.addAll falla entero con un 404, así que C1 comprueba en E5 que cada ruta existe.
  './js/talent-text.js',
  './js/hero-guerrero.js',
  './js/hero-maga.js',
  './js/hero-arquera.js',
  './js/save-legacy-guerrero.js',
  './js/save-legacy-maga.js',
  './js/save-legacy-arquera.js',
  './js/powers-forge-guerrero.js',
  './js/powers-forge-maga.js',
  './js/powers-forge-arquera.js',
  './js/talents-view.js',
  './js/ui-skills.js',
  './js/ui-verbs.js',
  './css/skills.css',
  './css/verbs.css',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
];

// Paso 2d: interfaz pintada PEQUEÑA (iconos 128 px, habilidades base 128 px, marcadores 64 px, marcos): se
// precarga (no atómico). Los 234 iconos de talentos, retratos, emblemas y ui256 NO:
// van a la caché de arte en tiempo de ejecución (ART_CACHE, ver fetch).
const UI_ASSETS = [
  './assets/ui/cat_basico.webp',
  './assets/ui/cat_defensa.webp',
  './assets/ui/cat_definitiva.webp',
  './assets/ui/cat_especializacion.webp',
  './assets/ui/cat_principal.webp',
  './assets/ui/cat_movilidad.webp',
  './assets/ui/eq_amuleto.webp',
  './assets/ui/eq_anillo.webp',
  './assets/ui/eq_arma.webp',
  './assets/ui/eq_botas.webp',
  './assets/ui/eq_casco.webp',
  './assets/ui/eq_cinturon.webp',
  './assets/ui/eq_guantes.webp',
  './assets/ui/eq_mano_izq.webp',
  './assets/ui/eq_pecho.webp',
  './assets/ui/mat_fragmento.webp',
  './assets/ui/mat_gema.webp',
  './assets/ui/mat_glifo.webp',
  './assets/ui/mat_llave_grieta.webp',
  './assets/ui/mat_oro.webp',
  './assets/ui/mat_runa.webp',
  './assets/ui/menu_ajustes.webp',
  './assets/ui/menu_alijo.webp',
  './assets/ui/menu_bendiciones.webp',
  './assets/ui/menu_codice.webp',
  './assets/ui/menu_coleccion.webp',
  './assets/ui/menu_cubo.webp',
  './assets/ui/menu_estadisticas.webp',
  './assets/ui/menu_guia.webp',
  './assets/ui/menu_habilidades.webp',
  './assets/ui/menu_inventario.webp',
  './assets/ui/menu_maestria.webp',
  './assets/ui/menu_mapa.webp',
  './assets/ui/menu_mascota.webp',
  './assets/ui/menu_misiones.webp',
  './assets/ui/menu_pactos.webp',
  './assets/ui/menu_paragon.webp',
  './assets/ui/menu_talentos.webp',
  './assets/ui/menu_tienda.webp',
  './assets/ui/menu_tormento.webp',
  './assets/ui/menu_viajes.webp',
  './assets/ui/res_energia.webp',
  './assets/ui/res_furia.webp',
  './assets/ui/res_mana.webp',
  './assets/ui/st_aturdido.webp',
  './assets/ui/st_debilidad.webp',
  './assets/ui/st_escarcha.webp',
  './assets/ui/st_escudo.webp',
  './assets/ui/st_provocado.webp',
  './assets/ui/st_quebrantado.webp',
  './assets/ui/st_quemadura.webp',
  './assets/ui/st_ralentizado.webp',
  './assets/ui/st_sangrado.webp',
  './assets/ui/st_veneno.webp',
  './assets/map/mk_alijo.webp',
  './assets/map/mk_cofre.webp',
  './assets/map/mk_elite.webp',
  './assets/map/mk_encantador.webp',
  './assets/map/mk_entregar.webp',
  './assets/map/mk_evento.webp',
  './assets/map/mk_goblin.webp',
  './assets/map/mk_grieta.webp',
  './assets/map/mk_herrero.webp',
  './assets/map/mk_jefe.webp',
  './assets/map/mk_jugador.webp',
  './assets/map/mk_mascotas.webp',
  './assets/map/mk_mazmorra.webp',
  './assets/map/mk_mercader.webp',
  './assets/map/mk_mision.webp',
  './assets/map/mk_muerte.webp',
  './assets/map/mk_portal.webp',
  './assets/map/mk_portal_siguiente.webp',
  './assets/map/mk_salida.webp',
  './assets/map/mk_sanador.webp',
  './assets/map/mk_waypoint.webp',
  './assets/chrome/tx_panel.webp',
  './assets/chrome/tx_pergamino.webp',
  './assets/chrome/ui_boton.webp',
  './assets/chrome/ui_boton_hover.webp',
  './assets/chrome/ui_cabecera.webp',
  './assets/chrome/ui_cerrar.webp',
  './assets/chrome/ui_marco_minimapa.webp',
  './assets/chrome/ui_marco_panel.webp',
  './assets/chrome/ui_pestana.webp',
  './assets/chrome/ui_ranura.webp',
  './assets/chrome/ui_separador.webp',
  './assets/chrome/ui_tooltip.webp',
  // Paso 2d.2: piezas del HUD de PC (13) y pieles de las 9 barras de mecánica (33): pequeñas, se precargan
  './assets/hud/hud_anillo_tiempo.webp',
  './assets/hud/hud_destello.webp',
  './assets/hud/hud_dock.webp',
  './assets/hud/hud_dock_fino.webp',
  './assets/hud/hud_liquido_energia.webp',
  './assets/hud/hud_liquido_furia.webp',
  './assets/hud/hud_liquido_mana.webp',
  './assets/hud/hud_liquido_vida.webp',
  './assets/hud/hud_objetivo_elite.webp',
  './assets/hud/hud_objetivo_marco.webp',
  './assets/hud/hud_orbe_marco_recurso.webp',
  './assets/hud/hud_orbe_marco_vida.webp',
  './assets/hud/hud_stagger.webp',
  './assets/gauges/gz_bastion_escudo.webp',
  './assets/gauges/gz_bastion_escudo_vacio.webp',
  './assets/gauges/gz_bastion_grieta.webp',
  './assets/gauges/gz_bastion_muro.webp',
  './assets/gauges/gz_calor_brasero.webp',
  './assets/gauges/gz_calor_ignicion.webp',
  './assets/gauges/gz_calor_llama.webp',
  './assets/gauges/gz_calor_llama_blanca.webp',
  './assets/gauges/gz_cargas_anillo.webp',
  './assets/gauges/gz_cargas_nucleo.webp',
  './assets/gauges/gz_cargas_runa.webp',
  './assets/gauges/gz_conc_anillo.webp',
  './assets/gauges/gz_conc_esquinera.webp',
  './assets/gauges/gz_conc_fijado.webp',
  './assets/gauges/gz_coto_cepo.webp',
  './assets/gauges/gz_coto_cepo_vacio.webp',
  './assets/gauges/gz_coto_marca_suelo.webp',
  './assets/gauges/gz_coto_presa.webp',
  './assets/gauges/gz_escarcha_aterido.webp',
  './assets/gauges/gz_escarcha_congelado.webp',
  './assets/gauges/gz_escarcha_cristal.webp',
  './assets/gauges/gz_escarcha_engaste.webp',
  './assets/gauges/gz_fervor_ascension.webp',
  './assets/gauges/gz_fervor_halo.webp',
  './assets/gauges/gz_fervor_rayos.webp',
  './assets/gauges/gz_fervor_sol.webp',
  './assets/gauges/gz_impulso_pluma.webp',
  './assets/gauges/gz_impulso_rosa.webp',
  './assets/gauges/gz_impulso_vendaval.webp',
  './assets/gauges/gz_sed_corazon.webp',
  './assets/gauges/gz_sed_saciada.webp',
  './assets/gauges/gz_sed_sangre.webp',
  './assets/gauges/gz_sed_venas.webp',
  // Paso 2d (revisión): iconos pintados de las 43 habilidades base (128 px)
  './assets/skills/a_cicuta.webp',
  './assets/skills/a_disparo.webp',
  './assets/skills/a_disperso.webp',
  './assets/skills/a_humo.webp',
  './assets/skills/a_orbe.webp',
  './assets/skills/a_paso.webp',
  './assets/skills/a_red.webp',
  './assets/skills/a_sello.webp',
  './assets/skills/a_u_celeste.webp',
  './assets/skills/a_u_diluvio.webp',
  './assets/skills/a_u_zarzas.webp',
  './assets/skills/agilidad.webp',
  './assets/skills/bola_fuego.webp',
  './assets/skills/embestida.webp',
  './assets/skills/flecha_multiple.webp',
  './assets/skills/flecha_perforante.webp',
  './assets/skills/g_embate.webp',
  './assets/skills/g_hendidura.webp',
  './assets/skills/g_lanza.webp',
  './assets/skills/g_mandoble.webp',
  './assets/skills/g_martillo.webp',
  './assets/skills/g_piel.webp',
  './assets/skills/g_provocacion.webp',
  './assets/skills/g_salto.webp',
  './assets/skills/g_tajo.webp',
  './assets/skills/g_u_cataclismo.webp',
  './assets/skills/g_u_estandarte.webp',
  './assets/skills/g_u_furia.webp',
  './assets/skills/grito_guerra.webp',
  './assets/skills/k_lanza.webp',
  './assets/skills/k_prision.webp',
  './assets/skills/lluvia_flechas.webp',
  './assets/skills/m_armadura.webp',
  './assets/skills/m_ascua.webp',
  './assets/skills/m_barrera.webp',
  './assets/skills/m_dardo.webp',
  './assets/skills/m_estela_ignea.webp',
  './assets/skills/m_onda.webp',
  './assets/skills/m_parpadeo.webp',
  './assets/skills/m_paso_escarcha.webp',
  './assets/skills/m_toque.webp',
  './assets/skills/m_u_desgarro.webp',
  './assets/skills/m_u_supernova.webp',
  './assets/skills/m_u_tormenta.webp',
  './assets/skills/meteoro.webp',
  './assets/skills/nova_hielo.webp',
  './assets/skills/p_llamarada.webp',
  './assets/skills/rayo.webp',
  './assets/skills/terremoto.webp',
  './assets/skills/torbellino.webp',
];
const ART_CACHE = 'intentorpg-art-v1';
const ART_RE = /\/assets\/(talents|specs|emblems|ui256|skills256|vfx)\//;

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
        .then(() => Promise.all(ADDONS.map((u) => c.add(u).catch(() => {}))))
        .then(() => Promise.all(UI_ASSETS.map((u) => c.add(u).catch(() => {})))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== ART_CACHE).map((k) => caches.delete(k))))
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

  // Arte grande (talentos, retratos, emblemas, iconos 256): caché propia en tiempo
  // de ejecución (sobrevive a las subidas de VERSION), stale-while-revalidate
  if (ART_RE.test(url.pathname)) {
    e.respondWith(
      caches.open(ART_CACHE).then((c) => c.match(e.request).then((hit) => {
        const refresh = fetch(e.request).then((res) => { if (res.ok) c.put(e.request, res.clone()); return res; }).catch(() => hit);
        return hit || refresh;
      }))
    );
    return;
  }

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
