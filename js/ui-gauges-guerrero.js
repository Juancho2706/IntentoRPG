// ============================================================
// BARRAS DE MECÁNICA · Guerrero · Sed (Berserker), Bastión (Guardián), Fervor (Cruzado) (Paso 2d.2 · E1)
// ============================================================
// STUB de E0: exporta un objeto VACÍO (las 3 mecánicas usan el renderizador genérico de
// js/ui-gauges.js). El trabajador de E1 implementa aquí §3.1 Sed (venas y corazón), §3.2 Bastión (muralla de 5 escudos), §3.3 Fervor (halo con 3 soles)
// según docs/paso2d2-hud-pc.md y el mockup docs/mockups/hud-pc.html.
//
// ------------------------------------------------------------
// GUÍA PARA EL TRABAJADOR DE E1 (docs/paso2d2-hud-pc.md §3, §4, §6.1, §7; API congelada en E0)
// ------------------------------------------------------------
// ARCHIVOS (exclusivos; NO toques nada más: ni ui-gauges.js, ni css/gauges.css, ni
// spec-mechanics.js, ni ui.js/index.html/style.css, ni los de otra clase):
//   js/ui-gauges-guerrero.js          este archivo
//   css/gauges-guerrero.css            tus formas (lo enlaza solo ui-gauges.js cuando exportas vistas)
//   tests/test-gauges-guerrero.mjs     tu suite headless (la corre `npm test`)
//
// QUÉ EXPORTAS: `export const GUERRERO_GAUGE_VIEWS = { sed: {…}, bastion: {…}, fervor: {…} }` (objeto plano).
// ui-gauges.js lo importa y registra cada entrada con defineGaugeView(id, def). Si una entrada
// no valida, NO rompe el juego: queda en gaugeViewErrors() (test74 exige []) y esa mecánica
// cae al renderizador genérico. Nivel superior PURO: nada de document/window al importar.
// Si exportas UNA vista, test74 exige las 3 de tu clase.
//
// CONTRATO DE CADA VISTA  { mount, update, model, demo, explain, nodes, sounds, world? }
//   mount(body, ctx) → inst
//     body = .gz-body (≈414×56 px, flex en fila, centrado vertical). Crea el DOM UNA vez
//     (ctx.h(tag, cls, html) o innerHTML) y guarda las referencias en `inst`. Puedes poner
//     clases en ctx.el (la raíz `.gz.gz-<id>`), pero NO toques la etiqueta, el subtítulo,
//     el número ni el anillo (son del núcleo). Todo debe caber en el cuerpo (A2b).
//   update(inst, view, prev, ctx) → { num, sub?, now? }
//     Escribe SOLO con ctx.setText / setHTML / setStyle / toggle / setAttr (memorizados: si el
//     valor no cambió no tocan el DOM → A7: 0 mutaciones con la vista igual). Nunca leas
//     layout (offsetWidth, getBoundingClientRect) en update.
//     · num: texto del número (tabular, a la derecha): '3/5', '72', '×2'…; '' lo vacía.
//     · sub: subtítulo (por defecto el núcleo pone `label · 5,6 s` si hay label).
//     · now: línea «Ahora: …» del tooltip (por defecto valor · label · tiempo).
//     · prev: la vista anterior (null tras montar). Los EVENTOS se leen por diferencia de
//       contadores: `prev && view.seq.gain > prev.seq.gain` (encajar un escudo, encender
//       una runa). El núcleo ya pone `.flash` (600 ms) en full/spent y toca `sounds`.
//     · Estado visual: ctx.el[data-state] = idle | building | full | active | decay | prey
//       ('decay' = view.decaying sin estado activo). Úsalo en la CSS (.gz-<id>[data-state=…]).
//   model(view, T) → objeto PURO (sin DOM) con lo que pinta update (p. ej. { lit: 3,
//     crack: 0.4, wall: false }). Tu test lo comprueba con vistas reales del arnés.
//   demo: Frame[]  (formato §4; lo reproduce el panel de talentos a 10 Hz, 10–13 s)
//     { t, value?, max?, state?, label?, t2? (= view.t), tMax?, decayIn?, decaying?, hold?,
//       ready? ([skillId], NO ranuras), x?, fire? ('gain'|'full'|'spent'|'empty' → seq++),
//       ease? (interpola value, t2, decayIn y los x numéricos hasta el siguiente),
//       cap (subtítulo de la fase), nodes ([nodeId] que explica la fase), tag? }
//     Último fotograma: { t, end: 1 }. Tags obligatorios: 'idle', 'building' y 'full' o
//     'active' (+ 'decay' si la mecánica pierde). Los valores son sintéticos pero deben
//     respetar gaugeTuning() (máximos, tiempos). Pruébalo con demoFrameAt/demoFrameByTag.
//   explain(T) → { text, cols, tip }   T = gaugeTuning() (ÚNICA fuente de números: A4)
//     text: 2 líneas (HTML, solo <b>) · cols: [['Generar', …], ['Descargar', …], ['Pérdida'
//     o 'Ventana', …]] (exactamente 3) · tip: 2–3 líneas («Qué es», «Gana», «Descarga»).
//     Ningún número escrito a mano: cítalos de T y en formato español (0.15 → '0,15').
//   nodes: { [nodeId]: 'cómo la potencia' }  nodos de TU especialización (TALENT_TREES) que
//     la potencian; todo id que aparezca en demo[].nodes debe estar aquí.
//   sounds: { full?, spent? }  tonos de js/sfx.js (hit, crit, ice, fire, bolt, holy, trap,
//     chain, skill, uiclick, equip, hurt, dash…); el núcleo limita a 1 cada 400 ms.
//   world? (solo Escarcha y Coto): { overhead?(e, p) → { n, max } | null, ground?(e, p) → … }
//     para las marcas del mundo (las pinta ui.js; tú solo das los datos, puros).
//
// ctx (lo da el núcleo): { id, mode ('live'|'demo'), el (raíz .gz), body, doc, T (gaugeTuning()),
//   spec ({ classId, specId, specName, nodes }), color, reduceMotion, generic,
//   esc(s), setText, setHTML, setStyle(el, prop|'--var', val), toggle(el, cls, on), setAttr,
//   h(tag, cls, html), asset(name) → url | null, art(name, { cls, alt }) → <img> | null, hasArt(name) }
//
// ASSETS (R9: CSS primero, el arte es la PIEL). Llegarán a assets/gauges/<name>.webp (E2).
//   const img = ctx.art('gz_xxx'); if (img) nodo.appendChild(img);
//   · al cargar: <img class="gz-art gz-art-gz_xxx is-loaded"> y la raíz gana `.art-gz_xxx`
//     → tu CSS oculta la reserva: `.gz-<id>.art-gz_xxx .forma-css { opacity: 0 }`;
//   · si falla (o con ?art=0): la raíz gana `.no-art` y se queda la forma CSS del mockup.
//   Las formas que se ANIMAN (trazo, alturas, giros, anillos) son CSS/SVG siempre.
//   Assets de tu clase (docs §5 y §9):
//     gz_sed_corazon (96×96)
//     gz_sed_venas (828×112)
//     gz_sed_sangre (512×64, mosaico)
//     gz_sed_saciada (128)
//     gz_bastion_escudo (64×76)
//     gz_bastion_escudo_vacio (64×76)
//     gz_bastion_grieta (64×76)
//     gz_bastion_muro (128)
//     gz_fervor_halo (680×132)
//     gz_fervor_sol (64)
//     gz_fervor_rayos (256, aditivo)
//     gz_fervor_ascension (128)
//
// CSS (css/gauges-guerrero.css)
//   · Todo selector empieza por `.gz-<id>` (sin tocar selectores ajenos). Keyframes con
//     nombre `gz-<id>-…`. Copia formas y animaciones del mockup docs/mockups/hud-pc.html
//     (bloques «1 · SED»… y R.<id>.mount/update), cambiando `.sed` → `.gz-sed .sed`, etc.
//   · A8: @keyframes y transition SOLO de transform y opacity (nada de box-shadow, filter,
//     width/height, left/top, background). Única excepción: la transición de
//     stroke-dashoffset de las venas de la Sed. Rellenos con transform: scaleX/scaleY.
//   · El núcleo ya resuelve: huella 520×72, etiqueta, número, anillo (.has-t), idle al 55 %,
//     .flash, .ooc (40 % y bucles en pausa), movimiento reducido (sin animaciones) y tooltip.
//   · Formas distintas en gris (A5) y estados por forma + texto, no solo color (A6).
//
// TESTS QUE DEBES PASAR
//   · tests/test-gauges-guerrero.mjs (tuyo, headless): validateGaugeView = [] para tus 3 ids;
//     A3 (tags de la demo, ids de nodes en TALENT_TREES de tu especialización, demo ⊂ nodes);
//     A4 (explain(gaugeTuning()) cita los números de T, p. ej. Cargas: «35 %» y «6 s»);
//     model() con vistas REALES del arnés: makeHarness({ classId, spec, level }).gaugeView().
//   · tests/test74-gauges-registro.mjs (núcleo): registro sin errores, A3 y A8 sobre tu CSS.
//   · Arnés visual tests/visual/gauges.html (`npx http-server -p 8094` y, en TIEMPO REAL,
//     `node tests/visual/chrome.mjs "<url>" [--shot=x.png --size=W,H]`; con --virtual-time-budget A7 da 0):
//     ?spec=<especialización>&state=<idle|building|full|active|decay>&measure=1
//       → <pre id="measure"> con "solapesWidget":[] en los 5 estados (A2b),
//         "a7":{"mutations":0,"avgMs"<0.15} (A7) y "a10":{"animations":0} (A10);
//     &gray=1 (A5, siluetas en gris), &cb=1 (A6, deuteranopía), &all=1 (contacto 9×5),
//     &art=0 (sin assets), &tip=1 (tooltip).
//
// CAMPOS DE LA VISTA (gaugeView v2, js/spec-mechanics.js §3.10)
//   comunes: id, name, value, max, color, state, label?, t?, tMax?, decayIn (null si no
//   pierde), decaying, hold, seq { gain, full, spent, empty }, ready [skillId], x, sinceCombat
//   sed      x: { low, frenzyT, frenzyMax }  · tMax 6 (Sed Saciada) · decayIn = after − sinceCombat
//   bastion  x: { drPct, wallT, wallMax, wallDr, decayEvery } · active = Muro de Escudos (t/tMax)
//            decayIn = s hasta perder la siguiente carga (grieta: 1 − decayIn/decayEvery)
//   fervor   x: { hammerHits, hammerNeed, ascT, ascMax } · ready ['g_t_veredicto'] · active = Ascensión

// ------------------------------------------------------------
// Ejemplo mínimo (forma; NO es el diseño):
//   import { gaugeTuning } from './spec-mechanics.js';   // si necesitas T fuera de explain
//   export const GUERRERO_GAUGE_VIEWS = {
//     <id>: {
//       mount(body, ctx) { const el = ctx.h('div', 'forma'); body.appendChild(el); return { el }; },
//       update(inst, v, prev, ctx) { ctx.setStyle(inst.el, '--k', (v.value / v.max).toFixed(3)); return { num: String(Math.floor(v.value)) }; },
//       model: (v, T) => ({ k: v.value / v.max }),
//       demo: [{ t: 0, value: 0, state: 'idle', tag: 'idle', cap: '…', nodes: [] }, …, { t: 12, end: 1 }],
//       explain: T => ({ text: '…', cols: [['Generar', '…'], ['Descargar', '…'], ['Pérdida', '…']], tip: ['…', '…'] }),
//       nodes: { s0: '…' },
//       sounds: { full: 'skill' },
//     },
//   };
// ------------------------------------------------------------

export const GUERRERO_GAUGE_VIEWS = {};
