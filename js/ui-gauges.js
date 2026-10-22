// ============================================================
// BARRAS DE MECÁNICA POR ESPECIALIZACIÓN (Paso 2d.2 · E0, núcleo UI) — docs/paso2d2-hud-pc.md §3.0, §4, §6.1
// ============================================================
// Un único widget de 520×72 que se monta en el HUD (modo 'live', alimentado con
// gaugeView(p, { target }) a 10 Hz) y en el panel de talentos (modo 'demo', con la línea
// de tiempo del renderizador). La FORMA de cada mecánica la pone su renderizador
// (js/ui-gauges-<clase>.js, registrado con defineGaugeView); este módulo pone lo COMÚN:
// andamiaje (etiqueta, subtítulo, número, anillo de tiempo), cambio de renderizador al
// cambiar view.id, eventos por diferencia de view.seq (destello + sonido con limitador),
// data-state con los 5 estados, desvanecimiento fuera de combate, tooltip (hover fuera de
// combate o con Alt), ranuras enlazadas (onReady), reloj de la demo a 10 Hz y un
// renderizador GENÉRICO de reserva para indicadores sin vista propia.
//
// PURO EN EL NIVEL SUPERIOR: nada de document/window al importar (los tests lo importan
// headless). El DOM solo se toca dentro de createGaugeHud.
//
// API (congelada en E0)
//   defineGaugeView(id, def)        registra el renderizador de un indicador (lanza si no valida)
//   gaugeViewDefs() → { id: def }   los registrados
//   gaugeViewErrors() → [string]    renderizadores de clase rechazados al cargar (deben ser [])
//   validateGaugeView(id, def) → [string]   errores de forma (vacío = válido)
//   genericGaugeView(id) → def      el renderizador de reserva (con su demo sintética)
//   gaugeViewFor(id) → def          el registrado o el genérico
//   createGaugeHud(host, { getView, mode = 'live', id, onEvent, onReady, onFrame, sfx, soundOn,
//                          specName, styles = true, art = true, oocAfter = 5, plain = false })
//     plain: solo la forma (sin nombre, números ni textos .gz-tx/.gz-hint): el HUD de juego y las
//     tarjetas del selector; el detalle queda en el tooltip y en los menús de Habilidades y Talentos
//     → { el, update(view?), play(id), seek(t), seekNode(nodeId), setMode(m), setAltHeld(b),
//         showTip(), hideTip(), view(), destroy() }
//   Puros (tests / arnés): demoFrameAt(frames, T, base), demoFrameByTag(frames, tag, base),
//     demoLength(frames), demoNodes(frames), gaugeDataState(view), seqEvents(prev, view),
//     gaugeModel(id, view), gaugeSpecOf(mechId), GAUGE_STATES, GAUGE_SEQ_EVENTS
//
// CONTRATO del renderizador (lo detalla la cabecera de js/ui-gauges-guerrero.js):
//   defineGaugeView(id, {
//     mount(body, ctx) → inst              crea el DOM del cuerpo UNA vez
//     update(inst, view, prev, ctx) → { num, sub?, now? }   escribe SOLO lo que cambió
//     model?(view, T) → object             lo que pinta update, en datos puros (tests sin DOM)
//     demo: Frame[]                        línea de tiempo (§4)
//     explain(T) → { text, cols, tip }     T = gaugeTuning(): única fuente de texto
//     nodes: { [nodeId]: 'cómo la potencia' }
//     sounds?: { full?, spent? }           nombres de tonos de sfx.js (§3.0: solo umbral y descarga)
//     world?: { overhead?(e, p) → { n, max } | null, ground?(e, p) → object | null }
//   })
import { gaugeBar } from './hud-model.js';
import { gaugeDefs, gaugeTuning } from './spec-mechanics.js';
// árboles de talento (hojas puras): mecánica → especialización (nombre en la etiqueta)
import * as TAL_G from './talents-guerrero.js';
import * as TAL_M from './talents-maga.js';
import * as TAL_A from './talents-arquera.js';
// renderizadores por clase (E1: un trabajador por archivo; el núcleo nunca los edita)
import { GUERRERO_GAUGE_VIEWS } from './ui-gauges-guerrero.js';
import { MAGA_GAUGE_VIEWS } from './ui-gauges-maga.js';
import { ARQUERA_GAUGE_VIEWS } from './ui-gauges-arquera.js';

export const GAUGE_STATES = ['idle', 'building', 'full', 'active', 'decay', 'prey'];
export const GAUGE_SEQ_EVENTS = ['gain', 'full', 'spent', 'empty'];
const VIEW_KEYS = ['mount', 'update', 'model', 'demo', 'explain', 'nodes', 'sounds', 'world'];
const FRAME_KEYS = ['t', 't2', 'value', 'max', 'state', 'label', 'tMax', 'decayIn', 'decaying', 'hold', 'ready',
  'x', 'fire', 'ease', 'cap', 'nodes', 'tag', 'end', 'sinceCombat', 'name', 'color'];
const FRAME_META = new Set(['t', 't2', 'x', 'fire', 'ease', 'cap', 'nodes', 'tag', 'end']);
const SOUND_GAP_MS = 400;          // §3.0: como mucho 1 tono cada 400 ms (todas las barras)
const FLASH_MS = 600, FLASH_RM_MS = 300;

// ------------------------------------------------------------
// especialización de cada mecánica (de los árboles de talento)
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var SPEC_OF;
export function gaugeSpecOf(mech) {
  if (!SPEC_OF) {
    SPEC_OF = {};
    for (const [classId, tree] of [['guerrero', TAL_G.GUERRERO_TALENTS], ['maga', TAL_M.MAGA_TALENTS], ['arquera', TAL_A.ARQUERA_TALENTS]]) {
      for (const s of tree?.specs || []) if (s.mechanic) SPEC_OF[s.mechanic] = { classId, specId: s.id, specName: s.name, nodes: (s.nodes || []).map(n => n.id) };
    }
  }
  return SPEC_OF[mech] || null;
}

// ------------------------------------------------------------
// registro
// ------------------------------------------------------------
const REG = {};
const ERRORS = [];
const CLASS_WITH_VIEWS = new Set();

const isFn = f => typeof f === 'function';
const isObj = o => !!o && typeof o === 'object' && !Array.isArray(o);

export function validateGaugeView(id, def) {
  const err = [];
  if (!id || typeof id !== 'string') return ['id inválido'];
  if (!isObj(def)) return [`${id}: definición vacía`];
  for (const k of Object.keys(def)) if (!VIEW_KEYS.includes(k)) err.push(`${id}: clave desconocida "${k}"`);
  for (const k of ['mount', 'update', 'explain']) if (!isFn(def[k])) err.push(`${id}: falta ${k}()`);
  if (def.model != null && !isFn(def.model)) err.push(`${id}: model debe ser función`);
  if (!isObj(def.nodes)) err.push(`${id}: nodes debe ser { nodeId: 'cómo la potencia' }`);
  else for (const [n, s] of Object.entries(def.nodes)) if (typeof s !== 'string' || !s) err.push(`${id}: nodes.${n} sin texto`);
  if (def.sounds != null) {
    if (!isObj(def.sounds)) err.push(`${id}: sounds debe ser un objeto`);
    else for (const [k, v] of Object.entries(def.sounds)) {
      if (!['full', 'spent'].includes(k)) err.push(`${id}: sounds.${k}: solo suenan 'full' y 'spent' (§3.0)`);
      if (typeof v !== 'string') err.push(`${id}: sounds.${k} debe ser el nombre de un tono`);
    }
  }
  if (def.world != null) {
    if (!isObj(def.world)) err.push(`${id}: world debe ser un objeto`);
    else for (const [k, v] of Object.entries(def.world)) if (!['overhead', 'ground'].includes(k) || !isFn(v)) err.push(`${id}: world.${k} inválido`);
  }
  err.push(...validateDemo(id, def.demo));
  return err;
}

function validateDemo(id, demo) {
  const err = [];
  if (!Array.isArray(demo) || demo.length < 2) return [`${id}: demo debe ser un array de fotogramas (y terminar en { t, end: 1 })`];
  let last = -1;
  const tags = new Set();
  demo.forEach((f, i) => {
    if (!isObj(f)) { err.push(`${id}: demo[${i}] no es un objeto`); return; }
    for (const k of Object.keys(f)) if (!FRAME_KEYS.includes(k)) err.push(`${id}: demo[${i}] clave desconocida "${k}"`);
    if (!Number.isFinite(f.t) || f.t < last) err.push(`${id}: demo[${i}].t debe ser creciente`);
    last = f.t;
    if (f.end && i !== demo.length - 1) err.push(`${id}: demo[${i}] end solo en el último`);
    if (f.state != null && !GAUGE_STATES.includes(f.state)) err.push(`${id}: demo[${i}].state "${f.state}"`);
    if (f.fire != null && !GAUGE_SEQ_EVENTS.includes(f.fire)) err.push(`${id}: demo[${i}].fire "${f.fire}"`);
    if (f.tag != null) { if (!GAUGE_STATES.includes(f.tag)) err.push(`${id}: demo[${i}].tag "${f.tag}"`); else tags.add(f.tag); }
    if (f.nodes != null && !(Array.isArray(f.nodes) && f.nodes.every(n => typeof n === 'string'))) err.push(`${id}: demo[${i}].nodes debe ser [nodeId]`);
    if (f.x != null && !isObj(f.x)) err.push(`${id}: demo[${i}].x debe ser un objeto`);
    if (f.ready != null && !Array.isArray(f.ready)) err.push(`${id}: demo[${i}].ready debe ser [skillId] o null`);
  });
  if (!demo[demo.length - 1]?.end) err.push(`${id}: el último fotograma debe ser { t, end: 1 }`);
  if (!(demo[demo.length - 1]?.t > 0)) err.push(`${id}: la demo debe durar > 0 s`);
  for (const t of ['idle', 'building']) if (!tags.has(t)) err.push(`${id}: falta un fotograma con tag "${t}"`);
  if (!tags.has('full') && !tags.has('active')) err.push(`${id}: falta un fotograma con tag "full" o "active"`);
  return err;
}

export function defineGaugeView(id, def) {
  const err = validateGaugeView(id, def);
  if (err.length) throw new Error(`defineGaugeView: ${err.join(' · ')}`);
  if (REG[id]) throw new Error(`defineGaugeView: renderizador repetido "${id}"`);
  REG[id] = Object.freeze({ id, ...def });
  return REG[id];
}
export function gaugeViewDefs() { return { ...REG }; }
export function gaugeViewErrors() { return [...ERRORS]; }

// un renderizador de clase roto NO tumba el juego (ui.js importa este módulo): se anota en
// gaugeViewErrors() (tests/test74 exige que esté vacío) y esa mecánica usa el genérico
function registerClassViews(classId, map) {
  if (!isObj(map)) { ERRORS.push(`${classId}: <CLASE>_GAUGE_VIEWS debe ser un objeto`); return; }
  for (const [id, def] of Object.entries(map)) {
    try { defineGaugeView(id, def); CLASS_WITH_VIEWS.add(classId); } catch (e) {
      ERRORS.push(`${classId}/${id}: ${e.message}`);
      try { console.warn(`[ui-gauges] ${classId}/${id} rechazado`, e.message); } catch { /* */ }
    }
  }
}
registerClassViews('guerrero', GUERRERO_GAUGE_VIEWS);
registerClassViews('maga', MAGA_GAUGE_VIEWS);
registerClassViews('arquera', ARQUERA_GAUGE_VIEWS);

// ------------------------------------------------------------
// demo (puro): fotogramas que se fusionan hacia delante
// ------------------------------------------------------------
// Frame: { t, value?, max?, state?, label?, t2? (→ view.t), tMax?, decayIn?, decaying?, hold?,
//          ready?, x?, fire? ('gain'|'full'|'spent'|'empty' → seq++), ease? (interpola value,
//          t2, decayIn y los x numéricos hasta el siguiente), cap?, nodes?, tag?, end? }
// `label: ''` y `t2: null` borran; `ready: null` vacía.
export function demoLength(frames) { return frames?.[frames.length - 1]?.t || 0; }
export function demoNodes(frames) { return [...new Set((frames || []).flatMap(f => f.nodes || []))]; }

function baseView(base = {}) {
  return { id: base.id || 'demo', name: base.name || base.id || 'Demo', value: 0, max: base.max || 100, color: base.color || '#e8c06a',
    state: 'idle', decayIn: null, decaying: false, hold: false, ready: [], x: {}, sinceCombat: 0,
    seq: { gain: 0, full: 0, spent: 0, empty: 0 }, ...(base.specName ? { specName: base.specName } : {}) };
}

export function demoFrameAt(frames, T, base = {}) {
  const len = demoLength(frames);
  const v = baseView(base);
  if (!(len > 0)) return { view: v, frame: null, index: -1, cap: '', nodes: [], tag: null, T: 0, loop: 0 };
  const loop = Math.max(0, Math.floor(T / len));
  const t = ((T % len) + len) % len;
  // fuegos por vuelta completa (seq MONÓTONO entre vueltas: el destello se repite cada vuelta)
  const perLoop = { gain: 0, full: 0, spent: 0, empty: 0 };
  for (const f of frames) if (f.fire && !f.end) perLoop[f.fire]++;
  for (const k of GAUGE_SEQ_EVENTS) v.seq[k] = perLoop[k] * loop;
  let a = null, b = null, ai = -1;
  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    if (f.end || f.t > t) break;
    a = f; ai = i; b = frames[i + 1] || null;
    for (const k in f) if (!FRAME_META.has(k)) v[k] = f[k];
    if ('t2' in f) v.t = f.t2;
    if (f.x) v.x = { ...v.x, ...f.x };
    if (f.fire) v.seq[f.fire]++;
  }
  if (a && a.ease && b && !b.end && b.t > a.t) {
    const k = (t - a.t) / (b.t - a.t);
    const lerp = (from, to) => from + (to - from) * k;
    if (Number.isFinite(b.value)) v.value = lerp(v.value || 0, b.value);
    if (Number.isFinite(b.t2) && Number.isFinite(v.t)) v.t = lerp(v.t, b.t2);
    if (Number.isFinite(b.decayIn) && Number.isFinite(v.decayIn)) v.decayIn = lerp(v.decayIn, b.decayIn);
    if (b.x) for (const [key, to] of Object.entries(b.x)) if (Number.isFinite(to) && Number.isFinite(v.x[key])) v.x[key] = lerp(v.x[key], to);
  }
  if (v.ready == null) v.ready = [];
  if (v.label === '') delete v.label;
  if (v.t == null) delete v.t; else v.t = Math.max(0, v.t);
  if (v.decayIn != null) v.decayIn = Math.max(0, v.decayIn);
  return { view: v, frame: a, index: ai, cap: a?.cap ?? '', nodes: a?.nodes || [], tag: a?.tag || null, T: t, loop };
}

// fotograma representativo de un estado (capturas y tests); decay → building, full ↔ active, prey → active
export function demoFrameByTag(frames, tag, base = {}) {
  const FALL = { decay: ['building'], full: ['active'], active: ['full'], prey: ['active', 'full'], idle: [], building: [] };
  const find = tg => (frames || []).find(f => f.tag === tg);
  let f = find(tag);
  for (const alt of FALL[tag] || []) if (!f) f = find(alt);
  f = f || frames?.[0];
  if (!f) return demoFrameAt([], 0, base);
  const i = frames.indexOf(f), nx = frames[i + 1];
  const dt = nx && nx.t > f.t ? Math.min(0.35, (nx.t - f.t) / 2) : 0;
  return demoFrameAt(frames, f.t + dt, base);
}

// ------------------------------------------------------------
// estado visual y eventos (puro)
// ------------------------------------------------------------
// data-state: los 5 estados de §3.0 (+ prey). 'decay' cuando está perdiendo ahora y no hay
// un estado activo (la vista conserva su state v1; el patrón de pérdida lo pinta cada forma)
export function gaugeDataState(v) {
  if (!v) return 'idle';
  const s = GAUGE_STATES.includes(v.state) ? v.state : 'idle';
  if (s === 'decay') return 'decay';
  if (v.decaying && (s === 'building' || s === 'full')) return 'decay';
  return s;
}
// eventos por diferencia de seq (sin colas ni callbacks desde la simulación)
export function seqEvents(prev, v) {
  if (!prev || !v || prev.id !== v.id || !prev.seq || !v.seq) return [];
  return GAUGE_SEQ_EVENTS.filter(k => (v.seq[k] || 0) > (prev.seq[k] || 0));
}

// ------------------------------------------------------------
// renderizador GENÉRICO de reserva (la barra segmentada del Paso 2d)
// ------------------------------------------------------------
function genericModel(v) {
  const gb = gaugeBar(v, v?.specName || '');
  if (!gb) return null;
  const max = Math.max(1, v.max || 1);
  const val = Math.max(0, Math.min(max, v.value || 0));
  return { k: Math.round(val / max * 1000) / 1000, segs: gb.segs, num: max <= 6 ? `${Math.floor(val)}/${max}` : `${Math.floor(val)}`, hint: gb.right };
}
const GENERIC_CACHE = {};
export function genericGaugeView(id) {
  if (GENERIC_CACHE[id]) return GENERIC_CACHE[id];
  const gd = gaugeDefs()[id];
  const max = typeof gd?.max === 'number' ? gd.max : 100;
  const half = max <= 6 ? Math.ceil(max / 2) : Math.round(max / 2);
  return (GENERIC_CACHE[id] = Object.freeze({
    id, generic: true,
    mount(body, ctx) {
      const root = ctx.h('div', 'gz-gen', '<div class="gz-gen-track"><i class="gz-gen-fill"></i><span class="gz-gen-segs"></span></div><span class="gz-hint gz-gen-hint"></span>');
      body.appendChild(root);
      return { fill: root.querySelector('.gz-gen-fill'), segs: root.querySelector('.gz-gen-segs'), hint: root.querySelector('.gz-gen-hint'), nSegs: -1 };
    },
    update(inst, v, prev, ctx) {
      const m = genericModel(v);
      if (!m) return { num: '' };
      if (m.segs !== inst.nSegs) {
        inst.nSegs = m.segs;
        ctx.setHTML(inst.segs, Array.from({ length: Math.max(0, m.segs - 1) }, (_, i) => `<i style="left:${((i + 1) / m.segs * 100).toFixed(2)}%"></i>`).join(''));
      }
      ctx.setStyle(inst.fill, 'transform', `scaleX(${m.k})`);
      ctx.setText(inst.hint, m.hint);
      return { num: m.num };
    },
    model: genericModel,
    demo: [
      { t: 0, value: 0, state: 'idle', cap: 'Vacío.', tag: 'idle' },
      { t: 1, value: 0, state: 'building', ease: 1, cap: 'Se llena en combate.' },
      { t: 3, value: half, ease: 1, fire: 'gain', tag: 'building' },
      { t: 5, value: max, state: 'full', fire: 'full', cap: 'Lleno.', tag: 'full' },
      { t: 7, value: 0, state: 'idle', fire: 'spent', cap: 'Se descarga.' },
      { t: 8, end: 1 },
    ],
    explain() {
      const name = gd?.name || id;
      const text = gd?.desc || `Indicador de especialización: <b>${name}</b>.`;
      return { text, cols: [], tip: [text] };
    },
    nodes: {},
  }));
}
export function gaugeViewFor(id) { return REG[id] || genericGaugeView(id); }
export function gaugeModel(id, view) { const d = gaugeViewFor(id); return d.model ? d.model(view, gaugeTuning()) : null; }

// ------------------------------------------------------------
// utilidades de DOM (solo dentro de createGaugeHud)
// ------------------------------------------------------------
const MEMO = new WeakMap();
function memo(el) { let m = MEMO.get(el); if (!m) MEMO.set(el, (m = {})); return m; }
function setText(el, s) { if (!el) return; s = s == null ? '' : String(s); const m = memo(el); if (m.text !== s) { m.text = s; el.textContent = s; } }
function setHTML(el, s) { if (!el) return; s = s == null ? '' : String(s); const m = memo(el); if (m.html !== s) { m.html = s; el.innerHTML = s; } }
function setStyle(el, prop, val) {
  if (!el) return;
  val = val == null ? '' : String(val);
  const m = memo(el), k = 's:' + prop;
  if (m[k] === val) return;
  m[k] = val;
  if (prop.startsWith('--')) el.style.setProperty(prop, val); else el.style[prop] = val;
}
function toggle(el, cls, on) { if (el && el.classList.contains(cls) !== !!on) el.classList.toggle(cls, !!on); }
function setAttr(el, name, val) { if (!el) return; val = String(val); if (el.getAttribute(name) !== val) el.setAttribute(name, val); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
const fmtS = t => `${(Math.round(t * 10) / 10).toFixed(1).replace('.', ',')} s`;

// estilos: css/gauges.css + css/gauges-<clase>.css de las clases con renderizadores
// (rutas relativas a ESTE módulo: valen en index.html y en tests/visual/)
function ensureStyles(doc) {
  const files = ['gauges.css', ...[...CLASS_WITH_VIEWS].map(c => `gauges-${c}.css`)];
  const have = new Set([...doc.querySelectorAll('link[rel="stylesheet"]')].map(l => l.href));
  for (const f of files) {
    const href = new URL(`../css/${f}`, import.meta.url).href;
    if (have.has(href)) continue;
    const l = doc.createElement('link');
    l.rel = 'stylesheet'; l.href = href; l.dataset.gauges = f;
    (doc.head || doc.documentElement).appendChild(l);
  }
}

let lastSoundAt = -1e9;      // limitador GLOBAL de tonos de mecánica (§3.0)
const nowMs = () => (globalThis.performance?.now ? globalThis.performance.now() : Date.now());

function viewSig(v, ooc) {
  return JSON.stringify([v.id, v.name, v.value, v.max, v.color, v.state, v.label, v.t, v.tMax, v.decayIn, v.decaying,
    v.hold, v.ready, v.seq, v.x, v.specName, ooc]);
}
function cloneView(v) {
  return { ...v, x: { ...(v.x || {}) }, seq: v.seq ? { ...v.seq } : undefined, ready: [...(v.ready || [])] };
}
function defaultNum(v) {
  const max = Math.max(1, v.max || 1), val = Math.max(0, Math.min(max, v.value || 0));
  return max <= 6 ? `${Math.floor(val)}/${max}` : `${Math.floor(val)}`;
}
function defaultSub(v) {
  const hasT = v.t != null && v.tMax > 0;
  return v.label ? `${v.label}${hasT ? ' · ' + fmtS(v.t) : ''}` : '';
}
function defaultNow(v) {
  const parts = [`${defaultNum(v)}${v.max > 6 ? ' / ' + v.max : ''}`];
  if (v.label) parts.push(v.label);
  if (v.t != null && v.tMax > 0) parts.push(fmtS(v.t));
  return parts.join(' · ');
}

// ------------------------------------------------------------
// el widget
// ------------------------------------------------------------
export function createGaugeHud(host, opts = {}) {
  if (!host) throw new Error('createGaugeHud: falta el contenedor');
  const { getView = null, onEvent = null, onReady = null, onFrame = null, sfx = null, soundOn = null,
    styles = true, art = true, oocAfter = 5, plain = false } = opts;
  let mode = opts.mode === 'demo' ? 'demo' : 'live';
  let demoId = opts.id || null;
  const doc = host.ownerDocument;
  const win = doc.defaultView || globalThis;
  if (styles) { try { ensureStyles(doc); } catch { /* sin estilos: el widget sigue funcionando */ } }

  host.innerHTML = '';
  host.classList.add('gz-host', 'hidden');
  if (plain) host.classList.add('gz-plain');
  setAttr(host, 'role', 'meter');
  setAttr(host, 'aria-valuemin', '0');
  const root = doc.createElement('div');
  root.className = 'gz';
  root.innerHTML = '<div class="gz-lbl"><span class="gz-name"></span><span class="sub"></span></div>' +
    '<div class="gz-body"></div><div class="gz-end"><span class="gz-num"></span><span class="gz-ring"></span></div>';
  host.appendChild(root);
  const R = { name: root.querySelector('.gz-name'), sub: root.querySelector('.sub'), body: root.querySelector('.gz-body'),
    num: root.querySelector('.gz-num'), ring: root.querySelector('.gz-ring') };

  const broken = new Set();
  let cur = { id: null, def: null, inst: null, ctx: null };
  let prev = null, last = null, lastSig = '', lastReady = null, lastNow = '', ooc = false, alt = false;
  let flashT = 0, clock = 0, t0 = 0, offset = 0, tip = null, destroyed = false;

  const reduceMotion = () => !!(doc.body?.classList.contains('reduce-motion') ||
    (win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches));

  function makeCtx(id, def) {
    const spec = gaugeSpecOf(id);
    const loaded = new Set();
    const ctx = {
      id, mode, el: root, body: R.body, doc, T: gaugeTuning(), spec, generic: !!def.generic,
      get color() { return last?.color || gaugeDefs()[id]?.color || '#e8c06a'; },
      get reduceMotion() { return reduceMotion(); },
      esc, setText, setHTML, setStyle, toggle, setAttr,
      h(tag, cls, html) { const n = doc.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; },
      // assets/gauges/<name>.webp (tandas A y B de §5); null con art:false (arnés ?art=0)
      asset(name) { return art ? new URL(`../assets/gauges/${name}.webp`, import.meta.url).href : null; },
      // <img class="gz-art gz-art-<name>">: al cargar añade .art-<name> al widget (la CSS del
      // renderizador oculta entonces su reserva CSS); si falla, .no-art (queda la CSS del mockup)
      art(name, { cls = '', alt = '' } = {}) {
        const url = ctx.asset(name);
        if (!url) { root.classList.add('no-art'); return null; }
        const img = doc.createElement('img');
        img.className = `gz-art gz-art-${name}${cls ? ' ' + cls : ''}`;
        img.alt = alt; img.decoding = 'async'; img.draggable = false;
        img.onload = () => { loaded.add(name); img.classList.add('is-loaded'); root.classList.add(`art-${name}`); };
        img.onerror = () => { img.classList.add('no-art'); root.classList.add('no-art'); };
        img.src = url;
        return img;
      },
      hasArt(name) { return loaded.has(name); },
    };
    return ctx;
  }

  function mountRenderer(id) {
    let def = broken.has(id) ? genericGaugeView(id) : gaugeViewFor(id);
    R.body.innerHTML = '';
    root.className = `gz gz-${id}${def.generic ? ' gz-generic' : ''}${plain ? ' gz-plain' : ''}`;
    MEMO.delete(R.body);
    let ctx = makeCtx(id, def), inst = null;
    try { inst = def.mount(R.body, ctx); } catch (e) {
      try { console.warn(`[ui-gauges] mount(${id})`, e); } catch { /* */ }
      broken.add(id);
      def = genericGaugeView(id);
      R.body.innerHTML = '';
      root.className = `gz gz-${id} gz-generic${plain ? ' gz-plain' : ''}`;
      ctx = makeCtx(id, def);
      inst = def.mount(R.body, ctx);
    }
    cur = { id, def, inst, ctx };
    prev = null; lastSig = ''; lastReady = null;
    hideTip();
  }

  function flash() {
    if (flashT) win.clearTimeout(flashT);
    root.classList.remove('flash');
    void root.offsetWidth;                      // reinicia la animación (solo en eventos)
    root.classList.add('flash');
    flashT = win.setTimeout(() => { root.classList.remove('flash'); flashT = 0; }, reduceMotion() ? FLASH_RM_MS : FLASH_MS);
  }
  function sound(name) {
    if (!name || !sfx || destroyed) return;
    if (mode === 'demo' && opts.demoSound !== true) return;
    if (soundOn && !soundOn()) return;
    const t = nowMs();
    if (t - lastSoundAt < SOUND_GAP_MS) return;
    lastSoundAt = t;
    try { sfx(name); } catch { /* sin audio */ }
  }

  function hoverAllowed() { return mode === 'demo' || ooc || alt; }
  function syncHover() {
    toggle(host, 'gz-hover', hoverAllowed());
    if (tip && !hoverAllowed()) hideTip();
  }

  function render(view) {
    if (destroyed) return;
    if (!view) {
      if (!host.classList.contains('hidden')) host.classList.add('hidden');
      last = null; hideTip();
      return;
    }
    const isOoc = mode === 'live' && (view.ooc != null ? !!view.ooc : (view.sinceCombat != null && view.sinceCombat >= oocAfter));
    const sig = viewSig(view, isOoc);
    if (sig === lastSig && view.id === cur.id) return;     // A7: misma vista → 0 trabajo, 0 mutaciones
    if (view.id !== cur.id) mountRenderer(view.id);
    lastSig = sig;
    last = view;
    toggle(host, 'hidden', false);
    setStyle(root, '--c', view.color || cur.ctx.color);
    const ds = gaugeDataState(view);
    setAttr(root, 'data-state', ds);
    // eventos por diferencia de seq → destello (umbral/descarga), sonido y onEvent
    const evs = seqEvents(prev, view);
    if (!view.seq && prev && prev.state !== view.state && ['full', 'active', 'prey'].includes(view.state)) evs.push('full');
    if (evs.includes('full') || evs.includes('spent')) flash();
    for (const ev of evs) {
      if (ev === 'full' || ev === 'spent') sound(cur.def.sounds?.[ev]);
      try { onEvent?.(ev, view); } catch { /* */ }
    }
    let res = null;
    try { res = cur.def.update(cur.inst, view, prev, cur.ctx) || {}; } catch (e) {
      try { console.warn(`[ui-gauges] update(${view.id})`, e); } catch { /* */ }
      if (!cur.def.generic) { broken.add(view.id); mountRenderer(view.id); lastSig = sig; res = cur.def.update(cur.inst, view, null, cur.ctx) || {}; }
      else res = {};
    }
    setText(R.num, res.num ?? defaultNum(view));
    const hasT = view.t != null && view.tMax > 0;
    toggle(root, 'has-t', hasT);
    if (hasT) setStyle(R.ring, '--p', Math.max(0, Math.min(1, view.t / view.tMax)).toFixed(3));
    setText(R.sub, res.sub ?? defaultSub(view));
    const sp = view.specName || opts.specName || cur.ctx.spec?.specName || '';
    setText(R.name, `${(view.name || view.id).toLocaleUpperCase('es')}${sp ? ' · ' + sp.toLocaleUpperCase('es') : ''}`);
    ooc = isOoc;
    toggle(root, 'ooc', ooc);
    syncHover();
    const rk = (view.ready || []).join(',');
    if (rk !== lastReady) { lastReady = rk; try { onReady?.([...(view.ready || [])]); } catch { /* */ } }
    setAttr(host, 'aria-valuemax', String(view.max || 1));
    setAttr(host, 'aria-valuenow', String(Math.floor(view.value || 0)));
    lastNow = res.now ?? defaultNow(view);
    setAttr(host, 'aria-label', `${view.name || view.id}: ${lastNow}`);
    if (tip) fillTip();
    prev = cloneView(view);
  }

  // ---------------- tooltip (marco ui_tooltip, 360 px): título, 2–3 líneas, Ahora, pie
  function fillTip() {
    if (!tip || !cur.def) return;
    let E = null;
    try { E = cur.def.explain(gaugeTuning()); } catch { E = null; }
    const lines = (E?.tip?.length ? E.tip : [E?.text, ...(E?.cols || []).slice(0, 2).map(([a, b]) => `<b>${a}:</b> ${b}`)]).filter(Boolean).slice(0, 3);
    const sp = last?.specName || cur.ctx?.spec?.specName || '';
    const title = `${esc(last?.name || cur.id)}${sp ? ' · ' + esc(sp) : ''}`;
    setStyle(tip, '--c', last?.color || cur.ctx.color);
    setHTML(tip, `<h4>${title}</h4>${lines.map(l => `<p>${l}</p>`).join('')}<p class="now">Ahora: ${esc(lastNow)}</p><p class="k">Más detalle en Talentos <kbd>N</kbd></p>`);
  }
  function showTip() {
    if (destroyed || !cur.def) return;
    if (!tip) {
      tip = doc.createElement('div');
      tip.className = 'gz-tip';
      (doc.body || doc.documentElement).appendChild(tip);
    }
    fillTip();
    const r = host.getBoundingClientRect();
    const h = tip.offsetHeight || 120;
    setStyle(tip, 'left', `${Math.round(Math.max(8, r.left + 24))}px`);
    setStyle(tip, 'top', `${Math.round(Math.max(8, r.top - h - 12))}px`);
  }
  function hideTip() { if (tip) { tip.remove(); tip = null; } }
  const onEnter = () => { if (hoverAllowed()) showTip(); };
  const onLeave = () => hideTip();
  host.addEventListener('mouseenter', onEnter);
  host.addEventListener('mouseleave', onLeave);

  // ---------------- demo: reloj propio a 10 Hz
  function demoDef() { return demoId ? gaugeViewFor(demoId) : null; }
  function demoBase() {
    const gd = gaugeDefs()[demoId];
    return { id: demoId, name: gd?.name || demoId, color: gd?.color, max: typeof gd?.max === 'number' ? gd.max : 100, specName: gaugeSpecOf(demoId)?.specName || '' };
  }
  function demoT() { return nowMs() / 1000 - t0 + offset; }
  function demoTick() {
    const def = demoDef();
    if (!def) return;
    const fr = demoFrameAt(def.demo, demoT(), demoBase());
    render(fr.view);
    try { onFrame?.({ cap: fr.cap, nodes: fr.nodes, tag: fr.tag, t: fr.T, index: fr.index, view: fr.view }); } catch { /* */ }
  }
  function startClock() { stopClock(); if (mode === 'demo' && demoId) { demoTick(); clock = win.setInterval(demoTick, 100); } }
  function stopClock() { if (clock) { win.clearInterval(clock); clock = 0; } }

  function update(view) {
    if (destroyed) return;
    if (view === undefined) {
      if (mode === 'demo') { demoTick(); return; }
      view = getView ? getView() : undefined;
      if (view === undefined) return;
    }
    render(view);
  }

  const api = {
    el: host,
    update,
    play(id) {
      if (id) demoId = id;
      t0 = nowMs() / 1000; offset = 0;
      if (mode !== 'demo') { mode = 'demo'; lastSig = ''; }
      startClock();
    },
    seek(t) { offset = (Number(t) || 0) - (nowMs() / 1000 - t0); if (mode === 'demo') demoTick(); },
    // salta a la fase de la demo que explica un nodo (píldora o nodo del árbol); false si ninguna
    seekNode(nodeId) {
      const f = (demoDef()?.demo || []).find(fr => (fr.nodes || []).includes(nodeId));
      if (!f) return false;
      api.seek(f.t + 0.3);
      return true;
    },
    setMode(m) {
      const nm = m === 'demo' ? 'demo' : 'live';
      if (nm === mode) return;
      mode = nm; lastSig = '';
      if (cur.ctx) cur.ctx.mode = mode;
      if (mode === 'demo') { if (!demoId) demoId = last?.id || cur.id; t0 = nowMs() / 1000; offset = 0; startClock(); } else { stopClock(); toggle(root, 'ooc', false); }
      syncHover();
    },
    // Alt mantenido (input.js → ui.altHeld): en combate deja pasar el hover del tooltip (R7)
    setAltHeld(b) { alt = !!b; syncHover(); },
    showTip, hideTip,
    view() { return last; },
    mode() { return mode; },
    destroy() {
      destroyed = true;
      stopClock();
      if (flashT) win.clearTimeout(flashT);
      hideTip();
      host.removeEventListener('mouseenter', onEnter);
      host.removeEventListener('mouseleave', onLeave);
      host.innerHTML = '';
      host.className = '';
    },
  };
  if (mode === 'demo' && demoId) { t0 = nowMs() / 1000; startClock(); }
  return api;
}
