// ============================================================
// PANEL DE TALENTOS v2 · #talents-panel · tecla N — Paso 2 · E3 (U1)
// ============================================================
// Port del mockup aprobado docs/mockups/skills-ux.html (renderTV2, drawTree3, drawHero, heroVeil,
// openChoice, fx*, demoReveal): tres columnas 2 : 1 : 2 (clase · Paragon · especialización),
// formas por tipo (círculo pasivo, hexágono de elección con su flotante ENCIMA, cuadrado activo),
// puertas, banda del ápice, velo/pausa/revelación del Paragon, selector de especialización y de
// árbol héroe, Configuración, Guardar, Código, Recomendado, ↶ (Ctrl+Z) y Reiniciar.
// Diseño: docs/paso2g-maga-coherencia.md §7.1, §9 y §10; contrato: docs/paso2-implementacion.md
// §3.4 (ops) y §3.12 (fábrica, modelo puro, DOM estable). Solo PC (ratón y teclado).
//
// API
//   const panel = createTalentPanel(host, { ops, getPlayer, getGame, onClose, onOpenBook, assetBase });
//   → { el, open(), close(), refresh(), check(), isOpen(), showSpecChoice() }   (+ render = refresh)
//   · host: el elemento donde se cuelga #talents-panel (o el propio #talents-panel si ya existe).
//   · ops: los métodos del mixin game-talents.js (§3.4) más snapshot(p) y restore(p, s):
//       addTalentRank(which, id, k?) · removeTalentRank(which, id) · chooseTalentOption(id, k) ·
//       chooseSpec(id) · chooseHeroTree(id) · applyTalentBuild(key?) · saveTalentLoadout(name) ·
//       applyTalentLoadout(i) · resetTalentTree('all') · exportTalentCode() · importTalentCode(code, opts?)
//     Cada mutación devuelve { ok, reason?, text?, heroOpened?, heroPaused? } y ya hizo recompute,
//     barra y guardado (el mixin). gameTalentOps(game) arma ese envoltorio desde un Game.
//   · El panel traduce `reason` por código (REASON_TEXT de talents-view.js, TALENT_REASONS).
//   · Si `ops` no trae addTalentRank (las del panel de 2d que aún pasa ui.js), usa gameTalentOps sobre
//     el juego del héroe (getGame, o p.game): el panel funciona antes de que U3 cambie la llamada.
//   · Guardar abre el gestor de configuraciones (guardar con nombre, aplicar, renombrar y borrar).
//
// RENDIMIENTO: el DOM de cada árbol se construye UNA vez (al abrir o al cambiar de clase,
// especialización o árbol héroe); cada punto solo toca los nodos, aristas y puertas que cambian
// (viewDiff). Nada por frame: el motion es CSS (transform/opacity/clip-path/stroke-dashoffset) y
// las posiciones salen del modelo (talents-view.js), sin leer el layout. ?talentscheck=1 vuelca
// solapes y elementos fuera de pantalla en window.__uicheck tras cada apertura.
//
// PURO EN EL NIVEL SUPERIOR: nada de document/window al importar (los tests lo importan headless).
import { createTalentOps } from './talents-ops.js';
import * as Talents from './talents.js';
import { gaugeDefs, gaugeTuning } from './spec-mechanics.js';
import { gaugeViewFor, demoNodes } from './ui-gauges.js';
import { talentsView, viewDiff, nodeTooltip, skillTooltip, gateTooltip, reasonText, panelScale, nodeTouches,
  TALENT_PANEL, matchBuild, loadoutOptions, loadoutsView, LOADOUTS_MAX, ROLE_TEXT } from './talents-view.js';

export { TALENT_PANEL };

// ---------- presentación por especialización (colores del mockup; SIN textos de mecánica) ----------
// Los textos de la mecánica salen de explain(gaugeTuning()) del renderizador (mechInfo).
// gaugeIcon: icono del chip «Mecánica» del selector (el del mockup).
export const SPEC_INFO = Object.freeze({
  berserker: { color: '#e8634a', gaugeIcon: 'ui/st_sangrado.webp' },
  guardian: { color: '#7fb0e8', gaugeIcon: 'emblems/guardian.webp' },
  cruzado: { color: '#ecc760', gaugeIcon: 'emblems/cruzado.webp' },
  piromante: { color: '#ff8a3d', gaugeIcon: 'ui/st_quemadura.webp' },
  crionte: { color: '#74cdf2', gaugeIcon: 'ui/st_escarcha.webp' },
  arcanista: { color: '#b996ff', gaugeIcon: 'ui/res_mana.webp' },
  francotiradora: { color: '#ead86e', gaugeIcon: 'emblems/francotiradora.webp' },
  montaraz: { color: '#86d47a', gaugeIcon: 'emblems/montaraz.webp' },
  tiradora: { color: '#66d7c7', gaugeIcon: 'emblems/tiradora.webp' },
});
// mecánica única de una especialización: nombre (spec-mechanics) y textos de explain(gaugeTuning())
export function mechInfo(spec) {
  const id = spec?.mechanic;
  if (!id) return null;
  const def = gaugeViewFor(id);
  let E = null;
  try { E = def.explain(gaugeTuning()); } catch { E = null; }
  return { id, name: gaugeDefs()[id]?.name || id, text: E?.text || '', cols: E?.cols || [],
    nodes: def.nodes || {}, demoNodes: demoNodes(def.demo) };
}

// envoltorio `ops` (§3.4) sobre un Game con el mixin game-talents.js: las llamadas del panel van
// con _talentQuiet (el panel enseña sus avisos, también la apertura y la pausa del Paragon: el mixin
// ya no los manda al banner) y restore pasa por _talentMutate (combate, recompute, barra y guardado)
export function gameTalentOps(g) {
  const LOCAL = createTalentOps(Talents);
  const quiet = fn => (...a) => {
    const was = g._talentQuiet;
    g._talentQuiet = true;
    try { return fn(...a) || { ok: false, reason: 'unknown' }; } finally { g._talentQuiet = was; }
  };
  return {
    addTalentRank: quiet((w, id, k) => g.addTalentRank(w, id, k)),
    removeTalentRank: quiet((w, id) => g.removeTalentRank(w, id)),
    chooseTalentOption: quiet((id, k) => g.chooseTalentOption(id, k)),
    toggleTalentChoice: quiet((w, id) => g.toggleTalentChoice(w, id)),
    chooseSpec: quiet(id => g.chooseSpec(id)),
    chooseHeroTree: quiet(id => g.chooseHeroTree(id)),
    applyTalentBuild: quiet(key => g.applyTalentBuild(key)),
    saveTalentLoadout: quiet(name => g.saveTalentLoadout(name)),
    applyTalentLoadout: quiet(i => g.applyTalentLoadout(i)),
    renameTalentLoadout: quiet((i, name) => g.renameTalentLoadout(i, name)),
    deleteTalentLoadout: quiet(i => g.deleteTalentLoadout(i)),
    resetTalentTree: quiet(w => g.resetTalentTree(w)),
    exportTalentCode: () => g.exportTalentCode(),
    importTalentCode: quiet((code, o) => g.importTalentCode(code, o)),
    talentPointsInfo: () => g.talentPointsInfo(),
    canEditTalents: () => g.canEditTalents?.() || null,
    snapshot: p => LOCAL.snapshot(p),
    restore: quiet((p, s) => g._talentMutate(q => LOCAL.restore(q, s))),
  };
}

// ---------- utilidades ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const UNDO_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>';
const ROLE_COLOR = { UNI: '#f0c45a', AREA: '#ff8a3d', CTRL: '#74cdf2', AGU: '#7fb0e8', APO: '#ecc760', MOV: '#86d47a' };
const TAG_COLOR = { mec: '#d6bdf5', num: '#c9d3dc' };
const UNDO_MAX = 40;
const TIP_DELAY = 120;
// flotante A/B: dos mitades de 76 px con 6 de hueco (css/talents.css), sin leer el layout
const POP_W = 2 * 76 + 6;
// margen con el borde del panel: lo flotante no pisa el marco pintado (9-slice de 30 px)
const POP_MARGIN = 20;
const ART = new Map();               // url → true (carga) | false (falta) | null (comprobando)
let UID = 0;

export function createTalentPanel(host, opts = {}) {
  const getGame = opts.getGame || (() => opts.getPlayer?.()?.game || null);
  const getPlayer = opts.getPlayer || (() => getGame()?.player || null);
  const onClose = opts.onClose || (() => api.close());
  const onOpenBook = opts.onOpenBook || null;
  const base = opts.assetBase ?? 'assets/';
  const doc = host?.ownerDocument || globalThis.document;
  const win = doc.defaultView || globalThis.window;
  const uid = ++UID;
  let opsCache = null;
  // ops del contrato (§3.4); las del panel de 2d (addRank…) no sirven: entonces, las del mixin del juego
  const OPS_OK = typeof opts.ops?.addTalentRank === 'function';
  const O = () => (OPS_OK ? opts.ops : (opsCache ||= gameTalentOps(getGame())));
  const CHECK = /[?&]talentscheck=1(&|$)/.test(win.location?.search || '');
  const src = rel => (rel ? base + rel : '');
  const reduced = () => doc.body?.classList.contains('reduce-motion') || !!win.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // ---------- raíz y esqueleto (una vez) ----------
  let root = host?.id === 'talents-panel' ? host : null;
  if (!root) { root = doc.createElement('div'); root.id = 'talents-panel'; host.appendChild(root); }
  root.classList.add('tp-root', 'hidden');
  root.removeAttribute('data-open');
  root.innerHTML = `
    <div class="tp-panel" role="dialog" aria-label="Talentos">
      <header class="tp-head">
        <div class="tp-emb" data-ref="emb"></div>
        <div class="tp-titles"><h2 class="tp-title" data-ref="title"></h2><div class="tp-sub" data-ref="sub"></div></div>
        <div class="tp-spacer"></div>
        <button class="tp-hbtn" type="button" data-act="book" title="Libro de habilidades (T)"><img alt="" src="${esc(src('ui/menu_habilidades.webp'))}">Habilidades <kbd>T</kbd></button>
        <button class="tp-hbtn" type="button" data-act="spec" data-spec-only title="Cambiar de especialización (gratis fuera de combate)"><img alt="" data-ref="specEmb">Cambiar</button>
        <label class="tp-lo" data-spec-only><span>Configuración</span><select data-act="loadout" data-ref="lo" aria-label="Configuración"></select></label>
        <button class="tp-hbtn" type="button" data-act="save" data-spec-only data-ref="saveBtn" title="Guardar, renombrar o borrar configuraciones (hasta ${LOADOUTS_MAX} por especialización)">Guardar</button>
        <button class="tp-hbtn" type="button" data-act="code" data-spec-only title="Código para compartir o importar una build">Código</button>
        <button class="tp-hbtn" type="button" data-act="reco" data-spec-only title="Aplica la build recomendada de la configuración elegida">Recomendado</button>
        <button class="tp-hbtn" type="button" data-act="undo" data-spec-only data-ref="undo" title="Deshacer (Ctrl+Z)" aria-label="Deshacer">${UNDO_SVG}</button>
        <button class="tp-hbtn" type="button" data-act="reset" data-spec-only title="Quita todos los puntos (gratis; Ctrl+Z lo deshace)">Reiniciar</button>
        <button class="tp-hbtn tp-x" type="button" data-act="close" title="Cerrar (N / Esc)" aria-label="Cerrar">✕</button>
      </header>
      <div class="tp-body" data-view="trees" data-ref="body">
        ${['cls', 'hero', 'spec'].map(w => `
        <section class="tp-col tp-col-${w}${w === 'hero' ? ' tp-hero' : ''}" data-tree="${w}">
          ${w === 'spec' ? '<div class="tp-art-old"></div>' : ''}<div class="tp-art"></div>
          <header class="tp-colh"></header>
          <div class="tp-can"></div>
          ${w === 'hero' ? '<div class="tp-beam"></div>' : ''}
        </section>`).join('')}
        <div class="tp-choose" data-ref="choose"></div>
      </div>
      <footer class="tp-foot" data-ref="foot"></footer>
      <div class="tp-pop" data-ref="pop" hidden></div>
      <div class="tp-codepop" data-ref="code" hidden></div>
      <div class="tp-lopop" data-ref="lop" hidden></div>
      <div class="tp-tip" data-ref="tip" role="tooltip"></div>
      <div class="tp-toast" data-ref="toast" role="status" aria-live="polite"></div>
    </div>`;
  const $ = s => root.querySelector(s);
  const ref = name => $(`[data-ref="${name}"]`);
  const panel = $('.tp-panel');
  const R = { emb: ref('emb'), title: ref('title'), sub: ref('sub'), specEmb: ref('specEmb'), lo: ref('lo'), undo: ref('undo'),
    body: ref('body'), choose: ref('choose'), foot: ref('foot'), pop: ref('pop'), code: ref('code'), tip: ref('tip'), toast: ref('toast'),
    lop: ref('lop'), saveBtn: ref('saveBtn'), head: $('.tp-head') };
  const COL = {};
  for (const w of ['cls', 'hero', 'spec']) {
    const c = $(`.tp-col-${w}`);
    COL[w] = { el: c, art: c.querySelector('.tp-art'), artOld: c.querySelector('.tp-art-old'), head: c.querySelector('.tp-colh'), can: c.querySelector('.tp-can'), beam: c.querySelector('.tp-beam') };
  }

  const S = {
    open: false, chooser: false, alt: false, scale: 1, box: { left: 0, top: 0 },
    v: null,                                  // última vista pintada
    built: { cls: null, spec: null, hero: null },   // DOM de cada árbol { owner, tv, nodes, edges, gates, veil }
    headSig: '', loSig: '', kitSig: '', heroSig: '', chooserSig: '',
    undo: [], player: null, sel: new WeakMap(),
    hover: null, pop: null, tipFn: null, tipAnchor: null, tipT: 0, toastT: 0,
    code: { open: false, importing: false, err: '', trim: false, value: '' },
    // gestor de configuraciones: renombrando (edit) o confirmando el borrado (del) de la i-ésima
    lo: { open: false, edit: null, del: null, name: '', ren: '', err: '', msg: '', sig: '', at: null },
    hl: null, checkT: 0, fxTimers: new Set(),
  };

  // ---------- escala y coordenadas (sin leer el layout: ventana y geometría del modelo) ----------
  function applyScale() {
    const vw = win.innerWidth || TALENT_PANEL.refW, vh = win.innerHeight || TALENT_PANEL.refH;
    S.scale = panelScale(vw, vh);
    root.style.setProperty('--s', String(S.scale));
    S.box = { left: (vw - TALENT_PANEL.w * S.scale) / 2, top: (vh - TALENT_PANEL.h * S.scale) / 2 };
  }
  // rectángulo de pantalla → coordenadas del panel (una lectura por hover, nunca por frame)
  function toPanel(r) {
    return { x: (r.left - S.box.left) / S.scale, y: (r.top - S.box.top) / S.scale, w: r.width / S.scale, h: r.height / S.scale };
  }
  const nodeBox = (w, n) => { const t = S.built[w]?.tv; return { x: t.x0 + n.x - n.w / 2, y: t.y0 + n.y - n.h / 2, w: n.w, h: n.h }; };

  // ---------- iconos: marcador si la imagen no existe (§3.12) ----------
  function markMissing(el) {
    const hostEl = el.closest('.tn-face') || el;
    // sin la URL rota: el navegador no la vuelve a pedir en cada redibujado
    el.style.backgroundImage = 'none';
    if (hostEl.querySelector(':scope > .ico-missing')) return;
    const m = doc.createElement('span');
    m.className = 'ico-missing';
    m.dataset.id = el.dataset.ph || '';
    m.textContent = el.dataset.ph || '?';
    if (el.dataset.phc) m.style.setProperty('--ph', el.dataset.phc);
    hostEl.appendChild(m);
  }
  function probe(scope) {
    for (const el of scope.querySelectorAll('[data-art]')) {
      const u = el.dataset.art;
      if (!u) continue;
      const st = ART.get(u);
      if (st === false) { markMissing(el); continue; }
      if (st !== undefined) continue;
      ART.set(u, null);
      const im = new win.Image();
      im.onload = () => ART.set(u, true);
      im.onerror = () => { ART.set(u, false); for (const x of root.querySelectorAll('[data-art]')) if (x.dataset.art === u) markMissing(x); };
      im.src = u;
    }
  }
  const artAttr = (rel, id, color) => `style="background-image:url('${esc(src(rel))}')" data-art="${esc(src(rel))}" data-ph="${esc(id)}"${color ? ` data-phc="${color}"` : ''}`;

  // ---------- avisos ----------
  function toast(msg, kind = 'ok') {
    if (!msg) return;
    R.toast.textContent = msg;
    R.toast.className = `tp-toast on ${kind === 'err' || kind === 'warn' ? kind : ''}`;
    win.clearTimeout(S.toastT);
    S.toastT = win.setTimeout(() => R.toast.classList.remove('on'), 2400);
  }

  // ---------- efectos: añade una clase de motion y la quita al acabar ----------
  function fx(el, cls, ms) {
    if (!el) return;
    const add = () => {
      el.classList.add(cls);
      const t = win.setTimeout(() => { el.classList.remove(cls); S.fxTimers.delete(t); }, ms);
      S.fxTimers.add(t);
    };
    if (el.classList.contains(cls)) { el.classList.remove(cls); win.requestAnimationFrame(() => win.requestAnimationFrame(add)); }
    else add();
  }

  // ============================================================ construcción del DOM
  function nodeLabel(n) {
    const st = { locked: 'bloqueado', avail: 'disponible', partial: 'con rango', max: 'al máximo', paused: 'en pausa' }[n.state] || '';
    return `${n.name}${n.free ? '' : `, rango ${n.rank} de ${n.max}`}${st ? `, ${st}` : ''}`;
  }
  function nodeHTML(n) {
    const phc = n.t === 'c' ? ROLE_COLOR.UNI : TAG_COLOR[n.tag] || '';
    const cls = `tn t-${n.t}${n.free ? ' is-free' : ''}${n.hyb ? ' is-hyb' : ''}${n.hasAct ? ' has-act' : ''}${n.choice ? ' is-chosen' : ''}${n.inner === 'square' ? ' is-square' : ''}`;
    const face = n.t === 'c'
      ? `<div class="tn-face"><i class="tn-img${n.flip ? ' is-flip' : ''}" ${artAttr(n.icon, n.id, phc)}></i><i class="tn-half tn-ha" ${artAttr(n.iconA, n.id, phc)}></i><i class="tn-half tn-hb${n.flipB ? ' is-flip' : ''}" ${artAttr(n.iconB, n.id, phc)}></i></div>`
      : `<div class="tn-face"><i class="tn-img" ${artAttr(n.icon, n.id, phc)}></i></div>`;
    const marks = n.t === 'x' ? `<span class="tn-pips">${Array.from({ length: n.pips || 4 }, (_, i) => `<i class="${i < n.rank ? 'on' : ''}"></i>`).join('')}</span>`
      : n.free ? '' : `<span class="tn-rk">${n.rankText}</span>`;
    return `<div class="${cls}" data-node="${esc(n.id)}" data-state="${n.state}" data-tag="${n.tag}" style="left:${n.x}px;top:${n.y}px" role="button" aria-label="${esc(nodeLabel(n))}">${face}${marks}${n.t === 'c' ? `<span class="tn-ab">${n.choice || ''}</span>` : ''}<span class="tn-tg ${n.tag}">${n.tag === 'mec' ? 'M' : 'N'}</span><span class="tn-burst"></span></div>`;
  }
  function veilHTML(veil) {
    if (!veil) return '';
    return `<div class="tp-vbox"><div class="tp-vlock">${LOCK_SVG}</div><b>${esc(veil.title)}</b>
      <span class="tp-vgoal">${esc(veil.goal)} <em data-ref="vcount">(${esc(veil.count)})</em></span>
      <span class="tp-vbar"><i data-ref="vbar" style="transform:scaleX(${veil.frac})"></i></span>
      ${veil.kept ? `<small class="tp-vnote">${esc(veil.kept)}</small>` : ''}
      <small class="tp-vnote" data-ref="vwhen">${esc(veil.when)}</small>
      ${veil.previews.map(h => `<div class="tp-hprev"><i ${h.art ? `style="background-image:url('${esc(src(h.art))}')"` : ''}></i><div><b>${esc(h.name)}</b><small>${esc(h.key)}</small></div></div>`).join('')}
      <small class="tp-vnote">${esc(veil.note)}</small></div>`;
  }
  function tabsHTML(hero) {
    if (!hero) return '';
    return hero.trees.map(h => `<button class="tp-htab${h.on ? ' on' : ''}" type="button" data-ht="${esc(h.id)}" title="${esc(h.name)}${h.on ? ' (elegido)' : ': cambiar de árbol héroe (gratis fuera de combate)'}" aria-label="${esc(h.name)}" ${h.art ? `style="background-image:url('${esc(src(h.art))}')"` : ''}></button>`).join('')
      + (hero.other ? `<span class="tp-htab off" title="${esc(hero.other.title)}" ${hero.other.art ? `style="background-image:url('${esc(src(hero.other.art))}')"` : ''}></span>` : '');
  }
  function buildTree(w, tv, hero) {
    const C = COL[w];
    if (!tv) { C.can.innerHTML = ''; S.built[w] = null; return; }
    const mk = `tp-ar-${uid}-${w}`;
    let html = `<svg class="tp-edges" viewBox="0 0 ${tv.w} ${tv.h}" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="${mk}" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L8 4L0 8z" fill="currentColor"/></marker></defs>`;
    for (const e of tv.edges) html += `<line pathLength="1" data-edge="${esc(e.id)}" x1="${e.x1}" y1="${e.y1}" x2="${e.x2}" y2="${e.y2}" class="${e.state === 'off' ? '' : e.state}" marker-end="url(#${mk})"/>`;
    html += '</svg>';
    if (tv.apex) html += `<div class="tp-apexband" style="top:${tv.apex.y}px"></div>`;
    for (const g of tv.gates) html += `<div class="tp-gate${g.ok ? ' ok' : ''}${g.apex ? ' apx' : ''}" data-row="${g.row}" style="top:${g.y}px;--gx:${g.gx}px"><span class="tp-seal"><i></i><i></i></span><b>${esc(g.label)}</b></div>`;
    for (const n of tv.nodes) html += nodeHTML(n);
    if (w === 'hero') html += `<div class="tp-htabs">${tabsHTML(hero)}</div><div class="tp-veil">${veilHTML(hero?.veil)}</div>`;
    C.can.innerHTML = html;
    const nodes = new Map();
    for (const el of C.can.querySelectorAll('.tn')) {
      nodes.set(el.dataset.node, { el, face: el.querySelector('.tn-face'), img: el.querySelector('.tn-img'), rk: el.querySelector('.tn-rk'),
        ab: el.querySelector('.tn-ab'), pips: [...el.querySelectorAll('.tn-pips i')], burst: el.querySelector('.tn-burst') });
    }
    const edges = new Map();
    for (const el of C.can.querySelectorAll('line[data-edge]')) edges.set(el.dataset.edge, el);
    const gates = [...C.can.querySelectorAll('.tp-gate')].map(el => ({ el, b: el.querySelector('b') }));
    S.built[w] = { owner: tv.owner, tv, nodes, edges, gates, veil: C.can.querySelector('.tp-veil'), tabs: C.can.querySelector('.tp-htabs') };
    if (w === 'hero') S.heroSig = heroSig(hero);
    probe(C.can);
  }
  const heroSig = h => JSON.stringify([h?.trees, h?.other?.id, h?.veil]);

  function patchNode(w, n) {
    const B = S.built[w];
    const X = B?.nodes.get(n.id);
    if (!X) return;
    X.el.dataset.state = n.state;
    X.el.classList.toggle('is-chosen', !!n.choice);
    X.el.classList.toggle('is-square', n.inner === 'square');
    X.el.setAttribute('aria-label', nodeLabel(n));
    if (X.rk) X.rk.textContent = n.rankText;
    if (X.ab) X.ab.textContent = n.choice || '';
    X.pips.forEach((pi, i) => pi.classList.toggle('on', i < n.rank));
    if (X.img) {
      const u = src(n.icon);
      if (X.img.dataset.art !== u) {
        X.img.style.backgroundImage = `url('${u}')`;
        X.img.dataset.art = u;
        X.face.querySelector(':scope > .ico-missing')?.remove();
        probe(X.face);
      }
      X.img.classList.toggle('is-flip', !!n.flip);
    }
  }
  function patchTree(w, tv) {
    const B = S.built[w];
    const d = viewDiff({ trees: { [w]: B.tv } }, { trees: { [w]: tv } });
    for (const c of d.nodes) patchNode(w, c.to);
    for (const e of d.edges) { const el = B.edges.get(e.id); if (el) { el.classList.toggle('on', e.to === 'on'); el.classList.toggle('live', e.to === 'live'); } }
    for (const g of d.gates) {
      const i = tv.gates.findIndex(x => x.row === g.row);
      const G = B.gates[i];
      if (G) { G.el.classList.toggle('ok', g.to.ok); G.b.textContent = g.to.label; }
    }
    B.tv = tv;
  }
  function colHeadHTML(w, v) {
    const h = v.trees[w]?.head;
    if (!h) return '';
    const emb = w === 'spec' ? `<img class="tp-cemb" alt="" src="${esc(src(v.spec.emblem))}">`
      : w === 'hero' ? `<span class="tp-hring" ${v.hero?.art ? `style="background-image:url('${esc(src(v.hero.art))}')"` : ''}></span>`
        : `<img class="tp-cemb" alt="" src="${esc(src(v.cls.emblem || 'ui256/menu_talentos.webp'))}">`;
    const lf = h.left > 0 && !(w === 'hero' && !v.hero?.open) ? `<span class="tp-lf">${h.left} libre${h.left > 1 ? 's' : ''}</span>` : '';
    return `${emb}<div><h3>${esc(h.name)}${w === 'hero' && h.sub ? ` <small>· ${esc(h.sub)}</small>` : ''}</h3>
      <div class="tp-meta"><span>Gastados <b>${h.spent}</b> / ${h.total}</span>${lf}${h.meta.map(m => `<span class="tp-rq">${esc(m)}</span>`).join('')}</div></div>`;
  }

  // ---------- cabecera, columnas y pie ----------
  function patchHead(v) {
    const lock = editLock();
    const sig = JSON.stringify([v.head, lock]);
    if (sig !== S.headSig) {
      S.headSig = sig;
      R.emb.style.backgroundImage = `url('${src(v.head.emblem)}')`;
      R.title.textContent = v.head.title;
      R.sub.innerHTML = `Nivel <b>${v.level}</b> · ${lock ? `<span class="tp-lockt">${esc(lock)}</span>` : esc(v.head.sub)}`;
      for (const el of root.querySelectorAll('[data-spec-only]')) el.hidden = !v.head.hasSpec;
      if (v.spec) R.specEmb.src = src(v.spec.emblem);
      // título largo («Arquera Tiradora Veloz»): letra más pequeña (una medición al cambiar el texto)
      R.head.classList.remove('is-tight');
      const tt = R.title.parentElement;
      if (tt.scrollWidth > tt.clientWidth + 1) R.head.classList.add('is-tight');
    }
    const specBtn = root.querySelector('[data-act="spec"]');
    if (specBtn) specBtn.lastChild.textContent = S.chooser && v.head.hasSpec ? 'Volver' : 'Cambiar';
    specBtn?.classList.toggle('is-on', S.chooser);
    R.undo.disabled = !S.undo.length;
    patchLoadouts(v);
  }
  function selOf(p) { const m = S.sel.get(p); return m?.[p.talents?.spec] ?? null; }
  function setSel(p, key) { if (!p?.talents?.spec) return; const m = S.sel.get(p) || {}; m[p.talents.spec] = key; S.sel.set(p, m); }
  function patchLoadouts(v) {
    const p = getPlayer();
    if (!p || !v.spec) return;
    let sel = selOf(p);
    if (sel == null) { sel = matchBuild(p) || 'custom'; setSel(p, sel); }
    const list = loadoutOptions(p, sel);
    const sig = JSON.stringify(list);
    if (sig === S.loSig) return;
    S.loSig = sig;
    R.lo.innerHTML = list.map(o => `<option value="${esc(o.value)}" title="${esc(o.title)}"${o.selected ? ' selected' : ''}>${esc(o.label)}</option>`).join('')
      || '<option value="" selected disabled>Sin builds todavía</option>';
    const cur = list.find(o => o.selected);
    R.lo.title = cur ? cur.title : '';          // nombre completo (Guerrero §18.2)
  }
  function patchCols(v) {
    for (const w of ['cls', 'spec', 'hero']) {
      const C = COL[w];
      const html = colHeadHTML(w, v);
      if (C.head.dataset.sig !== html) { C.head.innerHTML = html; C.head.dataset.sig = html; }
      const art = w === 'spec' ? v.spec?.icon : w === 'hero' ? v.hero?.art : v.cls.art;
      const bg = art ? `url('${src(art)}')` : 'none';
      if (C.art.dataset.bg !== bg) { C.art.style.backgroundImage = bg; C.art.dataset.bg = bg; }
    }
    // §3.12: .tp-hero[data-paused] y [data-open] por PRESENCIA (como #talents-panel[data-open])
    const H = COL.hero.el;
    H.toggleAttribute('data-open', !!v.hero?.open);
    H.toggleAttribute('data-paused', !!v.hero?.paused);
    const B = S.built.hero;
    if (B && heroSig(v.hero) !== S.heroSig) {
      S.heroSig = heroSig(v.hero);
      if (B.tabs) B.tabs.innerHTML = tabsHTML(v.hero);
      if (B.veil && v.hero?.veil && !B.veil.classList.contains('is-out')) B.veil.innerHTML = veilHTML(v.hero.veil);
    }
  }
  function patchFoot(v) {
    const sig = JSON.stringify([v.view, v.head.hasSpec, v.kit.map(k => k.id + k.icon)]);
    if (sig === S.kitSig) return;
    S.kitSig = sig;
    if (!v.head.hasSpec) {
      R.foot.innerHTML = `<span class="tp-ftxt">Cada especialización trae <b>su kit al libro</b>, su mecánica y su árbol</span><span class="tp-keys"><kbd>T</kbd> habilidades · <kbd>N</kbd> / <kbd>Esc</kbd> cerrar</span>`;
      return;
    }
    const many = v.kit.length > 12;
    R.foot.innerHTML = `<span class="tp-kl">Tu kit</span><span class="tp-kit${many ? ' is-many' : ''}">${v.kit.map(k => `<span class="tp-skl" data-sk="${esc(k.id)}" ${artAttr(k.icon, k.id)}></span>`).join('')}</span>
      <span class="tp-sep"></span><span class="tp-lgd"><i class="lg p"></i>Pasiva <i class="lg a"></i>Activa <i class="lg c"></i>Elección A/B <i class="lg f"></i>Final <i class="lg x"></i>Ápice <i class="tg mec">M</i>mecánica <i class="tg num">N</i>número</span>
      <span class="tp-keys">Clic +1 · Clic der. −1 · <kbd>Ctrl</kbd>+<kbd>Z</kbd> · <kbd>Alt</kbd> detalle</span>`;
    probe(R.foot);
  }
  function buildChooser(v) {
    const p = getPlayer();
    const sig = JSON.stringify([v.chooser, v.level]);
    if (sig === S.chooserSig) return;
    S.chooserSig = sig;
    R.choose.innerHTML = (v.chooser || []).map(c => {
      const M = mechInfo({ mechanic: c.mechanic });
      const info = SPEC_INFO[c.id] || {};
      const btn = c.locked ? `<button class="tp-hbtn" type="button" disabled>${LOCK_SVG.replace('<svg', '<svg width="14" height="14"')} Disponible al nivel ${Talents.TALENT_RULES.specAt}</button>`
        : c.current ? '<button class="tp-hbtn" type="button" disabled>✓ Tu especialización</button>'
          : `<button class="tp-hbtn" type="button" data-act="pick" data-spec="${esc(c.id)}">Elegir ${esc(c.name)}</button>`;
      return `<article class="tp-card${c.current ? ' is-cur' : ''}" data-spec="${esc(c.id)}">
        <div class="tp-cart" style="background-image:url('${esc(src(c.icon))}')"><img class="tp-cemb2" alt="" src="${esc(src(c.emblem))}"></div>
        <div class="tp-cbody"><div class="tp-crole">${esc(c.role)}</div><h3>${esc(c.name)}</h3><div class="tp-cline">${esc(c.line)}</div>
          ${c.kit.length && c.kitFrom === 'touch' ? '<div class="tp-cklab">Mejora</div>' : ''}
          ${c.kit.length ? `<div class="tp-ckit">${c.kit.map(k => `<div class="tp-ck" data-ck="${esc(k.id)}" data-spec="${esc(c.id)}" data-from="${esc(c.kitFrom)}"><i ${artAttr(k.icon, k.id)}></i><span>${esc(k.name)}</span></div>`).join('')}</div>` : ''}
          ${M ? `<span class="tp-gchip" data-mech="${esc(c.id)}"><i style="background-image:url('${esc(src(info.gaugeIcon || c.emblem))}')"></i>Mecánica: <b>${esc(M.name)}</b></span>` : ''}
          ${c.innate ? `<span class="tp-gchip" data-innate="${esc(c.id)}">Pasiva: <b>${esc(c.innate)}</b></span>` : ''}
          <div class="tp-cfoot">${btn}</div></div></article>`;
    }).join('');
    void p;
    probe(R.choose);
  }

  // ============================================================ refresco (por diferencias)
  function editLock() {
    try { return (OPS_OK ? opts.ops.canEditTalents?.() : getGame()?.canEditTalents?.()) || null; } catch { return null; }
  }
  function refresh() {
    if (!S.open) return;
    const p = getPlayer();
    if (p !== S.player) { S.player = p; S.undo = []; for (const w of ['cls', 'spec', 'hero']) S.built[w] = null; S.v = null; closeLo(); }
    if (!p) { R.title.textContent = 'Talentos'; R.sub.textContent = 'Sin personaje'; R.body.dataset.view = 'choose'; R.choose.innerHTML = ''; return; }
    const v = talentsView(p, { chooser: S.chooser });
    if (!v) return;
    patchHead(v);
    R.body.dataset.view = v.view;
    if (v.view === 'choose') buildChooser(v);
    else {
      S.chooserSig = '';
      for (const w of ['cls', 'spec', 'hero']) {
        const tv = v.trees[w];
        const B = S.built[w];
        if (!tv) { if (B) buildTree(w, null); continue; }
        if (!B || B.owner !== tv.owner || B.tv.nodes.length !== tv.nodes.length) buildTree(w, tv, v.hero);
        else patchTree(w, tv);
      }
      patchCols(v);
      if (S.hl) highlight(S.hl);
    }
    patchFoot(v);
    S.v = v;
    if (S.lo.open) { if (v.view === 'trees') renderLo(); else closeLo(); }
    if (CHECK) scheduleCheck();
  }

  // ============================================================ mutaciones
  // silent: motivos que no se avisan con el toast (true = ninguno: el que llama lo enseña donde toque)
  function act(fn, { undo = true, ok = null, silent = [], fxMode = 'edit' } = {}) {
    const p = getPlayer();
    if (!p) return null;
    const before = S.v;
    let snap = null;
    if (undo) { try { snap = O().snapshot?.(p) ?? null; } catch { snap = null; } }
    let r;
    try { r = fn(O(), p) || { ok: false, reason: 'unknown' }; } catch (e) { console.error('[talentos]', e); r = { ok: false, reason: 'unknown' }; }
    if (!r.ok) {
      if (silent !== true && !silent.includes(r.reason)) toast(reasonText(r), 'err');
      refresh();
      return r;
    }
    if (snap != null && !r.same) { S.undo.push(snap); if (S.undo.length > UNDO_MAX) S.undo.shift(); }
    refresh();
    playFx(before, S.v, r, fxMode);
    // apertura y pausa del Paragon (2g §7.1 y §10): el aviso sale en el panel, no en el banner del HUD
    // que el panel tapa; si además hay un texto de éxito, van en dos líneas
    const okText = ok ? (typeof ok === 'function' ? ok(r) : ok) : '';
    const miss = Math.max(1, r.missing | 0);
    const heroText = r.heroOpened ? '¡Paragon abierto! Su nodo clave ya funciona'
      : r.heroPaused ? `Paragon en pausa: te falta gastar ${miss} punto${miss > 1 ? 's' : ''} de especialización. Tus nodos se guardan` : '';
    if (okText || heroText) toast([okText, heroText].filter(Boolean).join('\n'), r.heroPaused ? 'warn' : 'ok');
    return r;
  }
  // la build ya no es la de la lista: el desplegable pasa a «Personalizada» en el acto
  function custom() { const p = getPlayer(); if (p) { setSel(p, 'custom'); if (S.v?.spec) patchLoadouts(S.v); } }
  function spend(w, n, k = null) {
    if (n.t === 'c' && n.rank > 0) {
      if (!k || k === n.choice) return;
      if (act((o) => o.chooseTalentOption(n.id, k))?.ok) custom();
      return;
    }
    const r = act((o) => o.addTalentRank(w, n.id, k || undefined));
    if (r?.ok) custom();
    else if (r && S.built[w]) fx(S.built[w].nodes.get(n.id)?.el, 'fx-deny', 320);
  }
  function removeRank(w, n) {
    const r = act((o) => o.removeTalentRank(w, n.id), { silent: ['empty', 'free'] });
    if (r?.ok) custom();
    else if (r && r.reason !== 'empty' && r.reason !== 'free') fx(S.built[w]?.nodes.get(n.id)?.el, 'fx-deny', 320);
  }
  function undo() {
    const p = getPlayer();
    const s = S.undo.pop();
    if (!p || s == null) return;
    const r = act((o, q) => o.restore(q, s), { undo: false, fxMode: 'undo' });
    if (!r?.ok) S.undo.push(s);
    else custom();
    R.undo.disabled = !S.undo.length;
  }
  function applyBuild(key) {
    const p = getPlayer();
    const r = act((o) => o.applyTalentBuild(key || undefined), { ok: rr => { const b = Talents.talentTreesFor(p.classId)?.builds?.[rr.key || key]; return b ? `Recomendado aplicado: ${b.arch} · ${b.n}` : 'Recomendado aplicado'; } });
    if (r?.ok) setSel(p, r.key || key || 'custom');
  }
  function onLoadout(value) {
    const p = getPlayer();
    if (!p || !value || value === 'custom') return;
    if (value.startsWith('saved:')) {
      const i = +value.slice(6);
      const name = p.talents.loadouts?.[p.talents.spec]?.[i]?.name || '';
      const r = act((o) => o.applyTalentLoadout(i), { ok: rr => `Configuración «${name}» aplicada${rr.trimmed ? ' (recortada a tu nivel)' : ''}` });
      if (r?.ok) setSel(p, value);
    } else applyBuild(value);
    S.loSig = '';
    refresh();
  }
  // ---------- gestor de configuraciones (Guardar): guardar con nombre, aplicar, renombrar y borrar ----------
  let LO_NAME = 24;
  function openLo() {
    closeCode();
    // bajo el botón Guardar (una lectura del layout al abrir, nunca por frame)
    const b = toPanel(R.saveBtn.getBoundingClientRect()), W = 560;
    S.lo = { open: true, edit: null, del: null, name: '', ren: '', err: '', msg: '', sig: '',
      at: { x: Math.round(Math.min(Math.max(8, b.x + b.w - W), TALENT_PANEL.w - W - 8)), y: Math.round(b.y + b.h + 10) } };
    renderLo(true);
  }
  function closeLo() {
    if (!S.lo.open && R.lop.hidden) return;
    S.lo = { open: false, edit: null, del: null, name: '', ren: '', err: '', msg: '', sig: '', at: null };
    R.lop.hidden = true;
    R.lop.innerHTML = '';
  }
  function loRow(l, sel) {
    const L = S.lo, i = l.i, cur = sel === l.value;
    if (L.edit === i) return `<div class="tp-lrow is-edit" data-i="${i}"><input data-ref="lren" spellcheck="false" autocomplete="off" maxlength="${LO_NAME}" value="${esc(L.ren || l.name)}" aria-label="Nuevo nombre"><button class="tp-hbtn" type="button" data-act="lo-ren-ok" data-i="${i}">Aceptar</button><button class="tp-hbtn" type="button" data-act="lo-ren-no">Cancelar</button></div>`;
    if (L.del === i) return `<div class="tp-lrow is-del" data-i="${i}"><span class="tp-lname">¿Borrar «${esc(l.name)}»?</span><button class="tp-hbtn is-bad" type="button" data-act="lo-del-ok" data-i="${i}">Sí, borrar</button><button class="tp-hbtn" type="button" data-act="lo-del-no">No</button></div>`;
    return `<div class="tp-lrow${cur ? ' is-cur' : ''}" data-i="${i}"><span class="tp-lname" title="${esc(l.name)}">★ ${esc(l.name)}</span><button class="tp-hbtn" type="button" data-act="lo-apply" data-i="${i}"${cur ? ' disabled' : ''}>${cur ? 'Aplicada' : 'Aplicar'}</button><button class="tp-hbtn" type="button" data-act="lo-ren" data-i="${i}">Renombrar</button><button class="tp-hbtn" type="button" data-act="lo-del" data-i="${i}">Borrar</button></div>`;
  }
  function renderLo(force = false) {
    const L = S.lo;
    if (!L.open) { R.lop.hidden = true; return; }
    const p = getPlayer();
    const m = p && loadoutsView(p);
    if (!m) { closeLo(); return; }
    LO_NAME = m.nameMax;
    const sel = selOf(p);
    // sin cambios no se repinta (no se pierde lo que se está escribiendo ni el foco)
    const sig = JSON.stringify([m, sel, L.edit, L.del, L.err, L.msg]);
    if (!force && sig === L.sig) return;
    L.sig = sig;
    R.lop.hidden = false;
    R.lop.style.left = `${L.at.x}px`;
    R.lop.style.top = `${L.at.y}px`;
    R.lop.innerHTML = `<b>Configuraciones de ${esc(m.specName)} <small>${m.count}/${m.max}</small></b>
      <div class="tp-crow"><input data-ref="lname" spellcheck="false" autocomplete="off" maxlength="${m.nameMax}" value="${esc(L.name || m.nextName)}" aria-label="Nombre de la configuración"${m.full ? ' disabled' : ''}><button class="tp-hbtn" type="button" data-act="lo-save"${m.full ? ' disabled' : ''}>Guardar la actual</button><button class="tp-hbtn" type="button" data-act="lo-close">Cerrar</button></div>
      ${m.full ? `<small class="tp-lfull">Tienes ${m.max}: borra una para hacer sitio</small>` : ''}
      <div class="tp-llist">${m.list.length ? m.list.map(l => loRow(l, sel)).join('') : '<small>Aún no has guardado ninguna. Las guardadas salen en «Configuración».</small>'}</div>
      <div class="tp-cerr${L.msg ? ' is-ok' : ''}" role="status">${esc(L.err || L.msg)}</div>`;
    for (const inp of R.lop.querySelectorAll('input')) {
      inp.addEventListener('keydown', e => {
        e.stopPropagation();          // que el juego no lea las teclas mientras se escribe
        if (e.key === 'Enter') { e.preventDefault(); if (inp.dataset.ref === 'lren') loRename(+inp.closest('[data-i]').dataset.i); else loSave(); }
        else if (e.key === 'Escape') { e.preventDefault(); if (S.lo.edit != null) { S.lo.edit = null; renderLo(); } else closeLo(); }
      });
      inp.addEventListener('keyup', e => e.stopPropagation());
      inp.addEventListener('input', () => { if (inp.dataset.ref === 'lren') S.lo.ren = inp.value; else S.lo.name = inp.value; });
    }
    const ren = R.lop.querySelector('[data-ref="lren"]');
    if (ren) { ren.focus(); ren.select?.(); }
  }
  const loName = i => { const p = getPlayer(); return p?.talents?.loadouts?.[p.talents.spec]?.[i]?.name || ''; };
  function loSave() {
    const p = getPlayer();
    if (!p?.talents?.spec) return;
    const name = (R.lop.querySelector('[data-ref="lname"]')?.value || S.lo.name || loadoutsView(p)?.nextName || '').trim();
    const r = act((o) => o.saveTalentLoadout(name), { undo: false, silent: true });
    if (r?.ok) { setSel(p, `saved:${r.index ?? 0}`); S.lo.name = ''; S.lo.err = ''; S.lo.msg = `Guardada: «${loName(r.index ?? 0)}»`; }
    else { S.lo.err = reasonText(r) || ''; S.lo.msg = ''; }
    S.loSig = ''; refresh(); renderLo();
  }
  function loRename(i) {
    const name = (R.lop.querySelector('[data-ref="lren"]')?.value ?? S.lo.ren ?? '').trim();
    if (!name) { S.lo.err = 'Escribe un nombre'; S.lo.msg = ''; renderLo(); return; }
    const r = act((o) => o.renameTalentLoadout(i, name), { undo: false, silent: true });
    if (r?.ok) { S.lo.edit = null; S.lo.ren = ''; S.lo.err = ''; S.lo.msg = `Ahora se llama «${loName(i)}»`; }
    else { S.lo.err = reasonText(r) || ''; S.lo.msg = ''; }
    S.loSig = ''; refresh(); renderLo();
  }
  function loDelete(i) {
    const p = getPlayer();
    const name = loName(i);
    const r = act((o) => o.deleteTalentLoadout(i), { undo: false, silent: true });
    if (r?.ok) {
      // la elección del desplegable sigue a su configuración (las de detrás bajan un puesto)
      const sel = selOf(p);
      if (sel?.startsWith('saved:')) { const j = +sel.slice(6); if (j === i) setSel(p, matchBuild(p) || 'custom'); else if (j > i) setSel(p, `saved:${j - 1}`); }
      S.lo.del = null; S.lo.err = ''; S.lo.msg = `Borrada: «${name}»`;
    } else { S.lo.err = reasonText(r) || ''; S.lo.msg = ''; }
    S.loSig = ''; refresh(); renderLo();
  }

  // ============================================================ motion
  function sparks(X) {
    if (reduced() || !X?.burst) return;
    X.burst.textContent = '';
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * Math.PI * 2 + 0.3, d = 26 + (i % 3) * 7;
      const s = doc.createElement('i');
      s.style.setProperty('--dx', `${Math.round(Math.cos(a) * d)}px`);
      s.style.setProperty('--dy', `${Math.round(Math.sin(a) * d)}px`);
      s.style.animationDelay = `${(i % 4) * 18}ms`;
      X.burst.appendChild(s);
    }
    const t = win.setTimeout(() => { X.burst.textContent = ''; S.fxTimers.delete(t); }, 650);
    S.fxTimers.add(t);
  }
  // fxMode 'undo': deshacer solo encoge lo que baja (2g §10); lo que vuelve no estalla
  function playFx(a, b, r, fxMode = 'edit') {
    if (!a || !b || b.view !== 'trees') return;
    // otra especialización (desde el selector, que pinta los árboles dentro de act, o al deshacer)
    if (b.spec?.id && a.spec?.id !== b.spec.id) { fxSwap(a.spec); return; }
    if (a.view !== 'trees') return;
    if (a.hero && b.hero && a.hero.tree !== b.hero.tree && b.hero.open) fxReveal(false);
    const d = viewDiff(a, b);
    const up = new Set();
    for (const c of d.nodes) {
      const X = S.built[c.which]?.nodes.get(c.id);
      if (!X) continue;
      if (c.to.rank > c.from.rank && !c.to.free && fxMode !== 'undo') {
        up.add(`${c.which}:${c.id}`);
        fx(X.el, 'fx-spend', 520); sparks(X);
        if (c.to.state === 'max' && c.from.state !== 'max') fx(X.el, 'fx-max', 1100);
      } else if (c.to.rank < c.from.rank) fx(X.el, 'fx-remove', 260);
      else if (c.to.choice && c.from.choice && c.to.choice !== c.from.choice) fx(X.el, 'fx-flip', 400);
    }
    // hijos que se acaban de abrir: línea que se enciende y el nodo que se desbloquea
    let k = 0;
    for (const c of d.nodes) {
      if (c.from.state !== 'locked' || c.to.state !== 'avail') continue;
      const par = c.to.req.find(pid => up.has(`${c.which}:${pid}`));
      if (!par) continue;
      const B = S.built[c.which];
      const ln = B.edges.get(`${par}>${c.id}`);
      if (ln) { ln.style.animationDelay = `${120 + k * 70}ms`; fx(ln, 'fx-lit', 700 + k * 70); }
      const X = B.nodes.get(c.id);
      if (X) { X.el.style.setProperty('--d', `${320 + k * 70}ms`); fx(X.el, 'fx-unlock', 700 + k * 70); }
      k++;
    }
    for (const g of d.gates) if (!g.from.ok && g.to.ok) {
      const B = S.built[g.which];
      const G = B?.gates[B.tv.gates.findIndex(x => x.row === g.row)];
      if (G) fx(G.el, 'fx-open', 700);
    }
    if (!a.hero?.open && b.hero?.open && (r?.heroOpened || a.hero)) fxReveal(fxMode !== 'undo');
  }
  // revelación del Paragon (2g §10): contador, barrido de luz, candado, velo, iris y nodos
  function fxReveal(full) {
    const H = COL.hero.el, B = S.built.hero;
    if (!B) return;
    let i = 0;
    for (const X of B.nodes.values()) X.el.style.setProperty('--d', `${(full ? 700 : 380) + (i++) * 30}ms`);
    if (full && B.veil) {
      const N = Talents.TALENT_RULES.pts.spec;
      const cnt = B.veil.querySelector('[data-ref="vcount"]'), bar = B.veil.querySelector('[data-ref="vbar"]');
      if (cnt) cnt.textContent = `(${N}/${N})`;
      if (bar) bar.style.transform = 'scaleX(1)';
      // el velo que se va ya no dice «te queda 1 punto»
      const when = B.veil.querySelector('[data-ref="vwhen"]');
      if (when) when.textContent = '¡Paragon abierto!';
      B.veil.classList.add('is-out');
      const t = win.setTimeout(() => { B.veil.classList.remove('is-out'); S.fxTimers.delete(t); refresh(); }, 1700);
      S.fxTimers.add(t);
      fx(H, 'fx-unveil', 1700);
      fx(COL.spec.head.querySelector('.tp-meta'), 'fx-maxspec', 480);
    }
    fx(H, 'fx-reveal', full ? 1600 : 900);
  }
  function fxSwap(prev) {
    const C = COL.spec;
    if (C.artOld) C.artOld.style.backgroundImage = prev?.icon ? `url('${src(prev.icon)}')` : 'none';
    const B = S.built.spec;
    if (B) for (const X of B.nodes.values()) X.el.style.setProperty('--d', `${Math.round(200 + parseFloat(X.el.style.left) * 0.6)}ms`);
    fx(C.el, 'fx-swap', 1000);
  }

  // ============================================================ tooltips y flotante A/B
  function tipHTML(m) {
    if (!m) return '';
    if (m.kind === 'node') {
      const t = m.t;
      let body;
      if (t.opts) {
        body = t.opts.map(o => `<div class="opt${o.on ? ' on' : ''}${m.hovK === o.k ? ' hov' : ''}">${o.k} · <i class="shp ${o.act ? 'sq' : 'ci'}"></i>${esc(o.name)}${o.act ? ' <span class="actb">HABILIDAD</span>' : ''} <span class="rl">${esc(o.role)}</span>${o.on ? ' <b class="ok">✓</b>' : ''}<small>${esc(o.desc)}</small></div>`).join('')
          + (t.win ? `<div class="win">${esc(t.win)}</div>` : '');
      } else body = `<div class="tl">${esc(t.now)}</div>${t.next ? `<div class="tnx">→ ${esc(t.next)}</div>` : ''}`;
      return `<div class="th"><div class="ti ${t.shape === 'hex' ? 'hex' : 'ci'}" ${artAttr(t.icon, t.id)}></div><div><div class="tn1t">${esc(t.name)}</div>
        <div class="tk">${esc(t.kind)} · ${esc(t.tree)} · ${esc(t.rank)} <span class="tp-tagc ${t.tagKey}">${esc(t.tag)}</span></div></div></div>
        ${t.final ? `<div class="fin">${esc(t.final)}</div>` : ''}${t.hyb ? `<div class="hy">${esc(t.hyb)}</div>` : ''}${body}
        ${t.touches.length ? `<div class="tnodes"><span class="lb">${esc(t.touchLabel)}</span>${t.touches.slice(0, 8).map(s => `<span class="tn1"><i ${artAttr(s.icon, s.id)}></i>${esc(s.name)}</span>`).join('')}</div>` : ''}
        <div class="st ${t.statusKind}">${esc(t.status)}</div>${t.alt ? `<div class="adv">${esc(t.alt)}</div>` : ''}`;
    }
    if (m.kind === 'skill') {
      const s = m.t;
      return `<div class="th"><div class="ti" ${artAttr(s.icon, s.id)}></div><div><div class="tn1t">${esc(s.name)}</div><div class="tk">${esc(s.kind)}</div></div></div>
        <div class="tl">${esc(s.line)}</div>
        ${s.links.length ? `<div class="tnodes"><span class="lb">${esc(m.linksLabel || 'Talentos que la tocan')}</span>${s.links.slice(0, 8).map(x => `<span class="tn1${x.rank ? '' : ' off'}"><i ${artAttr(x.icon, x.id)}></i>${esc(x.name)}${x.rank ? ' <b>✓</b>' : ''}</span>`).join('')}</div>` : ''}
        ${m.lockText ? `<div class="st lk">${esc(m.lockText)}</div>` : ''}`;
    }
    if (m.kind === 'gate') return `<div class="tn1t">${esc(m.t.title)}</div><div class="tl">${esc(m.t.line)}</div><div class="st ${m.t.ok ? 'ok' : 'lk'}">${esc(m.t.status)}</div>`;
    if (m.kind === 'mech') {
      const M = m.t;
      return `<div class="tn1t">${esc(M.name)}</div><div class="tl">${M.text}</div>${M.cols.length ? `<div class="mcols">${M.cols.map(([a, b]) => `<div><b>${esc(String(a).toLocaleUpperCase('es'))}</b>${esc(b)}</div>`).join('')}</div>` : ''}`;
    }
    if (m.kind === 'text') return `<div class="tn1t">${esc(m.title)}</div><div class="tl">${esc(m.line)}</div>`;
    return '';
  }
  // tooltip anclado: a la izquierda del ancla (o a la derecha si no cabe), alineado arriba
  function showTip(fn, anchor) {
    S.tipFn = fn; S.tipAnchor = anchor;
    win.clearTimeout(S.tipT);
    const go = () => {
      if (S.tipFn !== fn) return;
      const html = tipHTML(fn());
      if (!html) { hideTip(); return; }
      R.tip.innerHTML = html;
      probe(R.tip);
      placeTip();
      R.tip.classList.add('on');
    };
    if (CHECK || opts.tipDelay === 0) go(); else S.tipT = win.setTimeout(go, TIP_DELAY);
  }
  function placeTip() {
    const a = S.tipAnchor;
    if (!a) return;
    const W = TALENT_PANEL.w, H = TALENT_PANEL.h, w = 380;
    const h = R.tip.offsetHeight || 160;
    let x = a.x - w - 14;
    if (x < 8) x = a.x + a.w + 14;
    if (x + w > W - 8) x = Math.max(8, W - 8 - w);
    let y = Math.min(a.y, H - h - 8);
    y = Math.max(8, y);
    R.tip.style.left = `${Math.round(x)}px`;
    R.tip.style.top = `${Math.round(y)}px`;
  }
  function hideTip() { win.clearTimeout(S.tipT); S.tipFn = null; R.tip.classList.remove('on'); }
  function refreshTip() { if (S.tipFn && R.tip.classList.contains('on')) { R.tip.innerHTML = tipHTML(S.tipFn()); probe(R.tip); placeTip(); } }

  function nodeOf(w, id) { return S.built[w]?.tv.nodes.find(n => n.id === id) || null; }
  function openChoice(w, n) {
    const p = getPlayer();
    const t = S.built[w].tv;
    const tt = nodeTooltip(p, w, n.id);
    R.pop.innerHTML = (tt?.opts || []).map((o, i) => {
      const icon = i === 0 ? n.iconA : n.iconB;
      const flip = i === 1 && n.flipB;
      return `<button class="tn-choice${o.act ? ' act' : ''}${o.on ? ' on' : ''}${n.rank <= 0 && n.state !== 'avail' ? ' dis' : ''}" type="button" data-k="${esc(o.k)}" aria-label="${esc(`${o.k}: ${o.name}`)}"><i class="${flip ? 'is-flip' : ''}" ${artAttr(icon, n.id, ROLE_COLOR.UNI)}></i><b>${esc(o.k)}</b><span>${esc(o.name)}</span></button>`;
    }).join('');
    R.pop.hidden = false;
    R.pop.dataset.which = w;
    R.pop.dataset.node = n.id;
    // encima del nodo, sin taparlo: el borde inferior del flotante es el borde superior del nodo y su
    // puente (::before, 2g §9.3) baja a la franja de arriba de la caja para que el ratón pase sin
    // cerrarlo. Dentro del panel: la flecha y el puente siguen al nodo (--ax)
    const cx = t.x0 + n.x, x = Math.min(Math.max(cx, POP_W / 2 + POP_MARGIN), TALENT_PANEL.w - POP_W / 2 - POP_MARGIN);
    R.pop.style.left = `${x}px`;
    R.pop.style.top = `${t.y0 + n.y - n.h / 2}px`;
    R.pop.style.setProperty('--ax', `${Math.round((cx - x) * 10) / 10}px`);
    R.pop.classList.remove('is-open');
    win.requestAnimationFrame(() => R.pop.classList.add('is-open'));
    S.pop = { which: w, id: n.id };
    probe(R.pop);
  }
  function closeChoice() { R.pop.hidden = true; R.pop.classList.remove('is-open'); S.pop = null; }
  function popBox() {
    const w = S.pop?.which, n = S.pop && nodeOf(w, S.pop.id);
    if (!n) return null;
    const h = R.pop.offsetHeight || 100;
    return { x: parseFloat(R.pop.style.left) - POP_W / 2, y: parseFloat(R.pop.style.top) - h, w: POP_W, h };
  }
  function enterNode(w, id) {
    const p = getPlayer();
    const n = nodeOf(w, id);
    if (!p || !n) return;
    if (S.hover?.which === w && S.hover?.id === id) return;
    S.hover = { which: w, id };
    litKit(p, n);
    const choosable = n.t === 'c' && (n.state === 'avail' || n.rank > 0) && n.state !== 'paused' && n.state !== 'locked';
    const tip = () => ({ kind: 'node', t: nodeTooltip(p, w, id, { alt: S.alt }) });
    if (choosable || (n.t === 'c' && n.rank > 0 && n.state !== 'paused')) {
      openChoice(w, n);
      showTip(tip, popBox());
    } else {
      closeChoice();
      showTip(tip, nodeBox(w, n));
    }
  }
  function leaveNode() { S.hover = null; litKit(null, null); hideTip(); closeChoice(); }

  // «Tu kit»: los iconos que toca el nodo bajo el ratón; al revés, iluminar los nodos de una habilidad
  function litKit(p, n) {
    const ids = n && p ? new Set(nodeTouches(p.classId, Talents.nodeById(Talents.treeOf(p, n.which), n.id)).ids) : null;
    for (const el of R.foot.querySelectorAll('.tp-skl')) el.classList.toggle('is-lit', !!ids?.has(el.dataset.sk));
  }
  function highlight(skillId) {
    S.hl = skillId;
    const p = getPlayer();
    R.body.classList.toggle('is-dim', !!skillId);
    for (const w of ['cls', 'spec', 'hero']) {
      const B = S.built[w];
      if (!B) continue;
      const tree = p && Talents.treeOf(p, w);
      for (const [id, X] of B.nodes) {
        const node = tree && Talents.nodeById(tree, id);
        X.el.classList.toggle('is-hl', !!skillId && !!node && nodeTouches(p.classId, node).ids.includes(skillId));
      }
    }
    for (const el of R.foot.querySelectorAll('.tp-skl')) el.classList.toggle('is-on', el.dataset.sk === skillId);
  }

  // ============================================================ código de build
  function renderCode() {
    const c = S.code;
    if (!c.open) { R.code.hidden = true; return; }
    const p = getPlayer();
    let code = '';
    try { code = O().exportTalentCode?.() || ''; } catch { code = ''; }
    R.code.hidden = false;
    R.code.innerHTML = c.importing
      ? `<b>Importar una build</b><input data-ref="cin" spellcheck="false" autocomplete="off" placeholder="Pega aquí un código IRPG2-…" value="${esc(c.value)}">
         <div class="tp-crow"><button class="tp-hbtn" type="button" data-act="code-apply">Aplicar</button>${c.trim ? '<button class="tp-hbtn" type="button" data-act="code-trim">Recortar a mi nivel y aplicar</button>' : ''}<button class="tp-hbtn" type="button" data-act="code-cancel">Cancelar</button></div>
         <div class="tp-cerr" role="alert">${esc(c.err)}</div>`
      : `<b>Código para compartir</b><input data-ref="cin" readonly spellcheck="false" value="${esc(code)}">
         <div class="tp-crow"><button class="tp-hbtn" type="button" data-act="code-copy">Copiar</button><button class="tp-hbtn" type="button" data-act="code-import">Importar…</button><button class="tp-hbtn" type="button" data-act="code-close">Cerrar</button></div>
         <small>Pégalo en el juego de otro jugador de ${esc(p ? (Talents.talentTreesFor(p.classId)?.cls?.name || '') : '')}; avisa si la build es de otra versión.</small>`;
    const inp = R.code.querySelector('input');
    inp.addEventListener('keydown', e => {
      e.stopPropagation();          // que el juego no lea las teclas mientras se escribe
      if (e.key === 'Enter' && S.code.importing) { e.preventDefault(); doImport(false); }
      else if (e.key === 'Escape') { e.preventDefault(); closeCode(); }
    });
    inp.addEventListener('keyup', e => e.stopPropagation());
    inp.addEventListener('input', () => { S.code.value = inp.value; });
    if (c.importing) inp.focus(); else inp.select?.();
  }
  function closeCode() { S.code = { open: false, importing: false, err: '', trim: false, value: '' }; renderCode(); }
  function doImport(trim) {
    const value = (R.code.querySelector('input')?.value || S.code.value || '').trim();
    S.code.value = value;
    const r = act((o) => o.importTalentCode(value, trim ? { trim: true } : undefined), { silent: ['code-version', 'code-class', 'code-check', 'code-illegal', 'combat'] });
    if (r?.ok) { closeCode(); custom(); toast(r.trimmed ? 'Build importada (recortada a tu nivel)' : 'Build importada'); return; }
    S.code.err = reasonText(r);
    S.code.trim = r?.reason === 'code-illegal' && !trim;
    renderCode();
  }
  function copyCode() {
    const inp = R.code.querySelector('input');
    const txt = inp?.value || '';
    const done = () => toast('Código copiado');
    try { if (win.navigator?.clipboard?.writeText) { win.navigator.clipboard.writeText(txt).then(done, () => { inp.select(); doc.execCommand?.('copy'); done(); }); return; } } catch { /* sin portapapeles */ }
    inp?.select(); try { doc.execCommand('copy'); } catch { /* selección manual */ }
    done();
  }

  // ============================================================ eventos (delegados; ninguno por frame)
  const nodeFrom = el => { const t = el?.closest?.('.tn'); const col = t?.closest('[data-tree]'); return t && col && root.contains(t) ? { w: col.dataset.tree, id: t.dataset.node, el: t } : null; };
  // el puente del flotante tapa la franja de arriba del nodo: ahí un clic (o clic derecho) es del nodo
  const bridgeNode = e => {
    if (e.target !== R.pop || !S.pop) return null;
    const n = nodeOf(S.pop.which, S.pop.id);
    if (!n) return null;
    const b = nodeBox(S.pop.which, n), x = (e.clientX - S.box.left) / S.scale, y = (e.clientY - S.box.top) / S.scale;
    return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h ? { w: S.pop.which, id: n.id } : null;
  };
  root.addEventListener('mouseover', e => {
    const nd = nodeFrom(e.target);
    if (nd) { enterNode(nd.w, nd.id); return; }
    const half = e.target.closest?.('.tn-choice');
    if (half && S.pop) {
      const p = getPlayer(), { which, id } = S.pop;
      showTip(() => ({ kind: 'node', t: nodeTooltip(p, which, id, { alt: S.alt }), hovK: half.dataset.k }), popBox());
      return;
    }
    const sk = e.target.closest?.('.tp-skl');
    if (sk) { const p = getPlayer(); highlight(sk.dataset.sk); showTip(() => ({ kind: 'skill', t: skillTooltip(p, sk.dataset.sk) }), toPanel(sk.getBoundingClientRect())); return; }
    const ck = e.target.closest?.('.tp-ck');
    if (ck) {
      // tarjeta del selector: el kit propio se aprende con la especialización; el de respaldo
      // («Mejora») son habilidades base que su árbol mejora. Los talentos, los de ESA especialización
      const p = getPlayer(), sid = ck.dataset.spec, t = skillTooltip(p, ck.dataset.ck, { spec: sid });
      const sp = Talents.findSpec(p.classId, sid), nm = sp?.name || 'esa especialización';
      const req = (p?.cls?.skills || []).find(s => s.id === ck.dataset.ck)?.req || 1;
      const lockText = ck.dataset.from === 'spec' ? `Kit de ${nm}: se aprende al nivel ${req} con esa especialización` : `El árbol de ${nm} mejora esta habilidad`;
      showTip(() => ({ kind: 'skill', t, lockText, linksLabel: `Talentos de ${nm} que la tocan` }), toPanel(ck.getBoundingClientRect()));
      return;
    }
    const mc = e.target.closest?.('[data-mech]');
    if (mc) { const s = Talents.findSpec(getPlayer()?.classId, mc.dataset.mech); showTip(() => ({ kind: 'mech', t: mechInfo(s) }), toPanel(mc.getBoundingClientRect())); return; }
    const inn = e.target.closest?.('[data-innate]');
    if (inn) { const s = Talents.findSpec(getPlayer()?.classId, inn.dataset.innate); showTip(() => ({ kind: 'text', title: s?.innateName || 'Pasiva', line: s?.innateDesc || s?.innateText || '' }), toPanel(inn.getBoundingClientRect())); return; }
    const gb = e.target.closest?.('.tp-gate b, .tp-gate .tp-seal');
    if (gb) {
      const col = gb.closest('[data-tree]').dataset.tree, row = +gb.closest('.tp-gate').dataset.row;
      const g = S.built[col]?.tv.gates.find(x => x.row === row);
      showTip(() => ({ kind: 'gate', t: gateTooltip(g) }), toPanel(gb.getBoundingClientRect()));
    }
  });
  root.addEventListener('mouseout', e => {
    const to = e.relatedTarget;
    const from = e.target;
    if (from.closest?.('.tn')) {
      if (to && (to.closest?.('.tp-pop') || (to.closest?.('.tn') === from.closest('.tn')))) return;
      leaveNode();
      return;
    }
    if (from.closest?.('.tp-pop')) {
      if (to && (to.closest?.('.tp-pop') || to.closest?.('.tn'))) {
        // de la mitad al nodo: vuelve su tooltip
        if (to.closest?.('.tn') && S.pop) { const p = getPlayer(), { which, id } = S.pop; showTip(() => ({ kind: 'node', t: nodeTooltip(p, which, id, { alt: S.alt }) }), popBox()); }
        return;
      }
      leaveNode();
      return;
    }
    if (from.closest?.('.tp-skl')) { if (!to?.closest?.('.tp-skl')) { highlight(null); hideTip(); } return; }
    if (from.closest?.('.tp-ck, [data-mech], [data-innate], .tp-gate b, .tp-gate .tp-seal')) hideTip();
  });
  root.addEventListener('click', e => {
    if (e.target === root) { onClose(); return; }              // clic en el fondo oscuro
    const half = e.target.closest?.('.tn-choice');
    if (half && S.pop) {
      const { which, id } = S.pop;
      const n = nodeOf(which, id);
      const k = half.dataset.k;
      closeChoice(); hideTip(); S.hover = null;
      if (n) spend(which, n, k);
      return;
    }
    const nd = nodeFrom(e.target) || bridgeNode(e);
    if (nd) {
      const n = nodeOf(nd.w, nd.id);
      if (!n) return;
      // el icono del hexágono también compra (con la última opción, o A); ya comprado, el flotante elige
      if (n.t === 'c' && n.rank > 0) return;
      spend(nd.w, n, n.t === 'c' ? (n.choice || null) : null);
      S.hover = null;
      enterNode(nd.w, nd.id);
      return;
    }
    const tab = e.target.closest?.('.tp-htab[data-ht]');
    if (tab) {
      if (tab.classList.contains('on')) return;
      const r = act((o) => o.chooseHeroTree(tab.dataset.ht));
      if (r?.ok) custom();
      return;
    }
    const b = e.target.closest?.('[data-act]');
    if (!b || b.disabled || b.tagName === 'SELECT') return;
    const a = b.dataset.act;
    if (a === 'close') onClose();
    else if (a === 'book') { if (onOpenBook) onOpenBook(); else onClose(); }
    else if (a === 'spec') { S.chooser = !S.chooser; hideTip(); closeLo(); refresh(); }
    else if (a === 'pick') {
      const id = b.dataset.spec;
      // los árboles se pintan DENTRO de act(): así playFx ve el cambio y anima el relevo (2g §10)
      S.chooser = false;
      const r = act((o) => o.chooseSpec(id), { ok: () => `Especialización: ${Talents.findSpec(getPlayer().classId, id)?.name || id} · kit, barra y árbol cambiados (gratis fuera de combate)` });
      if (r?.ok) { S.loSig = ''; refresh(); }
      else { S.chooser = true; refresh(); }
    }
    else if (a === 'reco') applyBuild(selKeyForReco());
    else if (a === 'save') { if (S.lo.open) closeLo(); else openLo(); }
    else if (a === 'lo-close') closeLo();
    else if (a === 'lo-save') loSave();
    else if (a === 'lo-apply') { onLoadout(`saved:${b.dataset.i}`); S.lo.err = ''; S.lo.msg = ''; renderLo(); }
    else if (a === 'lo-ren') { S.lo.edit = +b.dataset.i; S.lo.del = null; S.lo.ren = loName(+b.dataset.i); S.lo.err = ''; S.lo.msg = ''; renderLo(); }
    else if (a === 'lo-ren-ok') loRename(+b.dataset.i);
    else if (a === 'lo-ren-no') { S.lo.edit = null; S.lo.err = ''; renderLo(); }
    else if (a === 'lo-del') { S.lo.del = +b.dataset.i; S.lo.edit = null; S.lo.err = ''; S.lo.msg = ''; renderLo(); }
    else if (a === 'lo-del-ok') loDelete(+b.dataset.i);
    else if (a === 'lo-del-no') { S.lo.del = null; renderLo(); }
    else if (a === 'undo') undo();
    else if (a === 'reset') { const r = act((o) => o.resetTalentTree('all'), { ok: 'Talentos reiniciados (gratis) · Ctrl+Z para deshacer' }); if (r?.ok) custom(); }
    else if (a === 'code') { if (S.code.open) closeCode(); else { closeLo(); S.code = { open: true, importing: false, err: '', trim: false, value: '' }; renderCode(); } }
    else if (a === 'code-copy') copyCode();
    else if (a === 'code-import') { S.code.importing = true; S.code.err = ''; S.code.value = ''; renderCode(); }
    else if (a === 'code-apply') doImport(false);
    else if (a === 'code-trim') doImport(true);
    else if (a === 'code-cancel' || a === 'code-close') closeCode();
  });
  function selKeyForReco() {
    const p = getPlayer();
    const s = p && selOf(p);
    const builds = p ? Talents.talentTreesFor(p.classId)?.builds || {} : {};
    return s && builds[s]?.sp === p?.talents?.spec ? s : null;
  }
  root.addEventListener('contextmenu', e => {
    e.preventDefault();
    const nd = nodeFrom(e.target) || bridgeNode(e);
    if (!nd) return;
    const n = nodeOf(nd.w, nd.id);
    if (!n) return;
    removeRank(nd.w, n);
    // el tooltip sigue al nodo (con su estado nuevo)
    S.hover = null;
    enterNode(nd.w, nd.id);
  });
  R.lo.addEventListener('change', () => onLoadout(R.lo.value));
  const onKey = e => {
    if (!S.open) return;
    if (e.key === 'Alt') { if (!S.alt) { S.alt = true; root.classList.add('is-alt'); refreshTip(); } e.preventDefault(); return; }
    const typing = e.target?.closest?.('input, textarea, select');
    if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyZ' || e.key === 'z' || e.key === 'Z') && !typing) { e.preventDefault(); undo(); return; }
    if (e.key === 'Escape' && (S.code.open || S.lo.open || S.pop)) {
      // primero se cierra lo flotante; el juego no lo ve (no cierra el panel)
      e.stopPropagation(); e.preventDefault();
      if (S.code.open) closeCode(); else if (S.lo.open) closeLo(); else leaveNode();
    }
  };
  const onKeyUp = e => { if (e.key === 'Alt' && S.alt) { S.alt = false; root.classList.remove('is-alt'); refreshTip(); } };
  const onBlur = () => { if (S.alt) { S.alt = false; root.classList.remove('is-alt'); } };
  let resizeRaf = 0;
  const onResize = () => { if (resizeRaf) return; resizeRaf = win.requestAnimationFrame(() => { resizeRaf = 0; if (S.open) { applyScale(); if (CHECK) scheduleCheck(); } }); };
  // el título largo se mide con la letra real: al terminar de cargar las fuentes se vuelve a medir
  doc.fonts?.ready?.then(() => { S.headSig = ''; if (S.open) refresh(); }).catch(() => {});

  // ============================================================ comprobación (?talentscheck=1, §3.12)
  function scheduleCheck() { win.clearTimeout(S.checkT); S.checkT = win.setTimeout(() => { try { check(); } catch (e) { console.error('[talentos] check', e); } }, 450); }
  function check() {
    const vw = win.innerWidth, vh = win.innerHeight;
    const shown = el => !!el && el.getClientRects().length > 0 && win.getComputedStyle(el).visibility !== 'hidden';
    const box = el => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
    const name = el => el.dataset?.node ? `${el.closest('[data-tree]')?.dataset.tree}:${el.dataset.node}` : el.dataset?.act || el.dataset?.sk || el.className?.baseVal || String(el.className || el.tagName).split(' ')[0];
    const overlaps = [], offscreen = [], clipped = [];
    const hit = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1;
    const pairs = (list, label) => {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        if (A.owner && A.owner === B.owner) continue;
        if (hit(A.r, B.r)) overlaps.push(`${label}: ${A.n} × ${B.n}`);
      }
    };
    const items = sel => [...root.querySelectorAll(sel)].filter(shown).map(el => ({ el, r: box(el), n: name(el), owner: el.closest('.tn') }));
    const P = box(panel);
    // cabecera, pie y, por árbol, nodos + pastillas + letras + etiquetas de puerta + pestañas
    pairs(items('.tp-head > .tp-emb, .tp-head .tp-title, .tp-head .tp-sub, .tp-head > .tp-hbtn, .tp-head > .tp-lo'), 'cabecera');
    pairs(items('.tp-foot > :not(.tp-kit), .tp-foot .tp-skl'), 'pie');
    for (const w of ['cls', 'spec', 'hero']) {
      if (R.body.dataset.view === 'choose') break;
      const scope = `.tp-col-${w} .tp-can`;
      pairs([...items(`${scope} .tn`), ...items(`${scope} .tn-rk, ${scope} .tn-ab, ${scope} .tn-pips`), ...items(`${scope} .tp-gate b`), ...items(`${scope} .tp-htab`)], `árbol ${w}`);
    }
    // fuera de la ventana o del panel
    if (P.l < -1 || P.t < -1 || P.r > vw + 1 || P.b > vh + 1) offscreen.push('panel');
    for (const it of items('.tn, .tn-rk, .tp-hbtn, .tp-lo, .tp-skl, .tp-gate b, .tp-htab, .tp-card, .tp-colh h3, .tp-meta, .tp-title, .tp-sub')) {
      const r = it.r;
      if (r.l < P.l - 1 || r.t < P.t - 1 || r.r > P.r + 1 || r.b > P.b + 1 || r.l < -1 || r.t < -1 || r.r > vw + 1 || r.b > vh + 1) offscreen.push(it.n);
    }
    // lo flotante (flotante A/B, tooltip, código, configuraciones y aviso), dentro del panel sin pisar el marco
    const M = 6 * S.scale;
    for (const it of items('.tp-pop:not([hidden]), .tp-tip.on, .tp-codepop:not([hidden]), .tp-lopop:not([hidden]), .tp-toast.on')) {
      const r = it.r;
      if (r.l < P.l + M || r.t < P.t + M || r.r > P.r - M || r.b > P.b - M) offscreen.push(`flotante ${it.n}`);
    }
    // selector: lo de cada tarjeta, dentro de la tarjeta y sin pisarse
    for (const card of root.querySelectorAll('.tp-card')) {
      if (!shown(card)) continue;
      const C = box(card);
      const parts = [...card.querySelectorAll('.tp-crole, h3, .tp-cline, .tp-cklab, .tp-ck, .tp-gchip, .tp-cfoot .tp-hbtn')].filter(shown).map(el => ({ el, r: box(el), n: name(el) }));
      for (const it of parts) if (it.r.l < C.l - 1 || it.r.r > C.r + 1 || it.r.b > C.b + 1) clipped.push(`${card.dataset.spec}: ${it.n}`);
      pairs(parts, `tarjeta ${card.dataset.spec}`);
    }
    // textos cortados (una línea que no cabe en su caja)
    for (const el of root.querySelectorAll('.tp-toast.on, .tp-lname')) if (shown(el) && el.scrollWidth > el.clientWidth + 1) clipped.push(name(el));
    for (const el of root.querySelectorAll('.tp-title, .tp-sub, .tp-colh h3, .tp-meta, .tp-card h3, .tp-crole, .tp-keys, .tp-lgd')) {
      if (!shown(el)) continue;
      // la caja que recorta: la cabecera de la columna (su texto crece sin límite dentro), o el padre
      const box2 = (el.closest('.tp-colh') || el.parentElement).getBoundingClientRect(), r = el.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 1 || r.right > box2.right + 1) clipped.push(name(el));
    }
    const out = { panel: 'talents', overlaps, offscreen, clipped, res: `${vw}x${vh}`, scale: S.scale, view: R.body.dataset.view };
    win.__uicheck = out;
    if (CHECK) console.log('[talentscheck]', JSON.stringify(out));
    return out;
  }

  // ============================================================ API
  const api = {
    el: root,
    isOpen: () => S.open,
    open() {
      if (!S.open) {
        S.open = true;
        win.addEventListener('resize', onResize);
        doc.addEventListener('keydown', onKey, true);
        doc.addEventListener('keyup', onKeyUp, true);
        win.addEventListener('blur', onBlur);
      }
      root.classList.remove('hidden');
      root.dataset.open = '';
      S.undo = []; S.chooser = false; S.hover = null; S.hl = null;
      applyScale();
      refresh();
    },
    close() {
      if (S.open) {
        S.open = false;
        win.removeEventListener('resize', onResize);
        doc.removeEventListener('keydown', onKey, true);
        doc.removeEventListener('keyup', onKeyUp, true);
        win.removeEventListener('blur', onBlur);
      }
      root.classList.add('hidden');
      root.removeAttribute('data-open');
      hideTip(); closeChoice(); closeCode(); closeLo();
      for (const t of S.fxTimers) win.clearTimeout(t);
      S.fxTimers.clear();
      win.clearTimeout(S.checkT);
      S.alt = false; root.classList.remove('is-alt');
    },
    refresh,
    render: () => refresh(),
    showSpecChoice() { api.open(); S.chooser = true; refresh(); },
    check,
    // arnés y pruebas: estado interno de solo lectura
    debug: () => ({ view: S.v, undo: S.undo.length, built: Object.fromEntries(Object.entries(S.built).map(([w, b]) => [w, b ? { owner: b.owner, nodes: b.nodes.size } : null])), scale: S.scale }),
    hover: (w, id) => { S.hover = null; enterNode(w, id); },
    // arnés (&t=<ms>): las clases de motion se quedan puestas (sin los temporizadores que las quitan)
    freezeFx: () => { for (const t of S.fxTimers) win.clearTimeout(t); S.fxTimers.clear(); },
    unhover: () => leaveNode(),
  };
  return api;
}
