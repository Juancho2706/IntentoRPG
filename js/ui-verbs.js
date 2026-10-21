// ============================================================
// FEEDBACK DE LOS VERBOS en la barra y junto al cursor (Paso 2, U2)
// ============================================================
// docs/paso2-implementacion.md §3.12 «Feedback de los verbos» (manda: el mockup no dibuja
// ninguno, Guerrero §18.6), D26 y D27. Lo que dibuja cada verbo:
//   · cargar y soltar: barra que se llena DENTRO de la ranura y barra de 64 × 6 px a 24 px del
//     cursor (siempre en pantalla) con la ventana perfecta como tramo dorado CON MUESCAS; con
//     Calma Absoluta, dorada desde media carga; enganchada (holdMode 'toggle'): candado en la
//     ranura y junto al cursor; «¡Perfecto!» lo pone la simulación (spawnText) y aquí destella
//   · relanzar: aro que se vacía + usos que quedan; dorado en los últimos `perfectLast` s
//   · combo y secuencia: pips (brilla el siguiente) · trampas: pips de trampas armadas
//   · canal: aro que se consume (late si es sin fin) · postura: marco del color del modo y el
//     icono se da la vuelta · plantado: icono de estado · cargas: número de cargas
// Lo calcula hud-model.verbView(game) (PURO); este módulo solo pinta.
//
// createVerbHud(root, { game, slotEl? }) → { update(realDt), el, bar, slotLayer(slot), destroy() }
//   root   capa fija de la interfaz (U3): aquí vive la barra junto al cursor
//   slotEl (slot) → elemento de la ranura en la barra; por defecto
//          #skillbar .skill-btn[data-slot="<slot>"] (js/ui.js). Cada ranura recibe UNA capa
//          `.verb-slot` creada una vez; si la barra se rehace (refreshHotbar), se vuelve a colgar.
// update(realDt) lo llama ui.updateFloats CADA FRAME (D26): solo transform/opacity sobre nodos
// creados una vez, sin leer el layout; los textos y atributos cambian solo cuando cambia el valor.
//
// DOM estable (§3.12, humo): .verb-charge[data-in-window], .verb-pips[data-slot],
// .verb-ring[data-slot], .verb-stance[data-slot][data-mode].
// Convención (la misma que #skills-book[data-open] y #talents-panel[data-open]): los atributos
// de estado sí/no van por PRESENCIA: están (valor '') cuando es verdad y no están cuando no.
//   · .verb-charge[data-in-window]: soltar ahora sería perfecto (la ventana del motor el mismo
//     frame, G17; con Calma Absoluta, desde media carga). Igual .verb-slot[data-win].
//   · .verb-stance[data-mode="<modo>"]: solo con una postura activa.
// Se importa sin DOM (los tests corren en Node): nada usa `document` al cargar el módulo, y los
// nodos se crean con createElement (sin innerHTML que haya que releer), así que un DOM mínimo
// simulado basta para probarlo (tests/test73).
import { verbView, cursorBarPos, SLOT_ORDER } from './hud-model.js';

export const CURSOR_BAR = Object.freeze({ w: 64, h: 6, gap: 24 });
const PIPS_MAX = 5;
const RESULT_MS = 420;                 // la barra junto al cursor sigue visible tras soltar
const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
// estaca clavada en el suelo (plantado)
const PLANT_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 3h4v9l-2 5-2-5z"/><path d="M3 19h18"/><path d="M7 19l-2 3M17 19l2 3"/></svg>';

// memo por nodo: solo se escribe en el DOM cuando el valor cambia (0 mutaciones en reposo)
function setT(el, s) { if (el._vt !== s) { el._vt = s; el.style.transform = s; } }
function setO(el, o) { const s = o >= 1 ? '1' : o <= 0 ? '0' : o.toFixed(3); if (el._vo !== s) { el._vo = s; el.style.opacity = s; } }
function setA(el, k, v) { const s = v == null ? null : String(v); if (el['_va_' + k] !== s) { el['_va_' + k] = s; if (s == null) el.removeAttribute(k); else el.setAttribute(k, s); } }
// atributo sí/no por presencia
const setB = (el, k, on) => setA(el, k, on ? '' : null);
function setTxt(el, s) { if (el._vx !== s) { el._vx = s; el.textContent = s; } }
function setVar(el, k, v) { if (el['_vv' + k] !== v) { el['_vv' + k] = v; el.style.setProperty(k, v); } }
const deg = v => Math.round(v * 2) / 2;          // medio grado: nada de escrituras por ruido
const frac3 = v => Math.round(Math.max(0, Math.min(1, v)) * 1000) / 1000;

// un nodo con su clase y sus hijos
function mk(doc, tag, cls, ...kids) {
  const el = doc.createElement(tag);
  if (cls) el.className = cls;
  for (const k of kids) el.appendChild(k);
  return el;
}

// aro de progreso SOLO con transform: dos mitades recortadas (clip-path fijo) y un arco
// que gira dentro de cada una (0–180° y 180–360°)
function ringNode(doc) {
  const arcR = mk(doc, 'i', 'vr-arc'), arcL = mk(doc, 'i', 'vr-arc');
  const ring = mk(doc, 'div', 'verb-ring', mk(doc, 'div', 'vr-h vr-r', arcR), mk(doc, 'div', 'vr-h vr-l', arcL));
  ring._arcR = arcR;
  ring._arcL = arcL;
  return ring;
}
function setRing(ring, f) {
  const a = 360 * Math.max(0, Math.min(1, f));
  setT(ring._arcR, `rotate(${deg(Math.min(180, a))}deg)`);
  setT(ring._arcL, `rotate(${deg(Math.max(0, a - 180))}deg)`);
}
// barra de carga (la de la ranura y la del cursor): relleno, ventana, muescas y mínimo
function chargeTrack(doc, cls) {
  const r = {
    calm: mk(doc, 'i', 'vb-calm'), win: mk(doc, 'i', 'vb-win'), fill: mk(doc, 'i', 'vb-fill'),
    min: mk(doc, 'i', 'vb-min'),
  };
  r.calmpos = mk(doc, 'div', 'vb-pos vb-calmpos', r.calm);
  r.winpos = mk(doc, 'div', 'vb-pos vb-winpos', r.win);
  r.minpos = mk(doc, 'div', 'vb-pos vb-minpos', r.min);
  r.npa = mk(doc, 'div', 'vb-pos vb-np vb-npa', mk(doc, 'i', 'vb-notch'));
  r.npb = mk(doc, 'div', 'vb-pos vb-np vb-npb', mk(doc, 'i', 'vb-notch'));
  const t = mk(doc, 'div', cls, mk(doc, 'div', 'vb-track', r.calmpos, r.winpos, r.fill, r.minpos), r.npa, r.npb);
  t._r = r;
  return t;
}
function setTrack(t, c) {
  const r = t._r;
  setT(r.fill, `scaleX(${frac3(c.frac)})`);
  // ventana: un contenedor del ancho de la pista se desplaza a `lo` (translateX en % de su
  // propio ancho = de la pista) y el tramo se escala a hi − lo; las muescas, igual. Con Calma
  // Absoluta la ventana es de media carga al final (las muescas marcan ese tramo)
  const lo = c.calm ? c.calmLo : c.lo, hi = c.calm ? 1 : c.hi;
  setT(r.winpos, `translateX(${(frac3(c.lo) * 100).toFixed(1)}%)`);
  setT(r.win, `scaleX(${frac3(c.hi - c.lo)})`);
  setT(r.npa, `translateX(${(frac3(lo) * 100).toFixed(1)}%)`);
  setT(r.npb, `translateX(${(frac3(hi) * 100).toFixed(1)}%)`);
  setT(r.minpos, `translateX(${(frac3(c.minFrac) * 100).toFixed(1)}%)`);
  setT(r.calmpos, `translateX(${(frac3(c.calmLo) * 100).toFixed(1)}%)`);
  setT(r.calm, `scaleX(${frac3(1 - c.calmLo)})`);
  setB(t, 'data-in-window', c.perfectNow);
  setB(t, 'data-calm', c.calm);
  setB(t, 'data-toggle', c.toggle);
}
// icono decorativo (SVG fijo: lo único que entra por innerHTML, y nunca se relee)
function icon(doc, cls, svg, title = '') {
  const el = mk(doc, 'span', cls);
  if (title) el.title = title;
  el.innerHTML = svg;
  return el;
}

function slotLayer(doc, slot) {
  const stance = mk(doc, 'div', 'verb-stance');
  stance.dataset.slot = slot;
  const ring = ringNode(doc);
  ring.dataset.slot = slot;
  const bar = chargeTrack(doc, 'verb-slotbar');
  const pipEls = Array.from({ length: PIPS_MAX }, () => mk(doc, 'i', ''));
  const pips = mk(doc, 'div', 'verb-pips', ...pipEls);
  pips.dataset.slot = slot;
  pips.dataset.n = '0';
  const count = mk(doc, 'span', 'verb-count');
  const latch = icon(doc, 'verb-latch', LOCK_SVG, 'Enganchada: vuelve a pulsar para soltar');
  const plant = icon(doc, 'verb-plant', PLANT_SVG, 'Plantado: 1 s quieto');
  const flash = mk(doc, 'i', 'verb-flash');
  const L = mk(doc, 'div', 'verb-slot', stance, ring, bar, pips, count, latch, plant, flash);
  L.dataset.slot = slot;
  L.setAttribute('aria-hidden', 'true');
  return { L, stance, ring, bar, pips, pipEls, count, latch, plant, flash, host: null, flip: null, chOff: null, chShown: 1 };
}

export function createVerbHud(root, opts = {}) {
  const game = opts.game || null;
  const doc = root?.ownerDocument || null;
  if (!root || !doc) return { el: root || null, bar: null, update() {}, slotLayer: () => null, destroy() {} };
  const win = doc.defaultView || globalThis;
  const findSlot = typeof opts.slotEl === 'function' ? opts.slotEl
    : (slot => doc.querySelector(`#skillbar .skill-btn[data-slot="${slot}"]`));

  // barra junto al cursor (una, en la capa raíz)
  const bar = chargeTrack(doc, 'verb-charge');
  const latch = icon(doc, 'vc-latch', LOCK_SVG);
  const glow = mk(doc, 'i', 'vc-glow');
  bar.append(latch, glow);
  const cur = mk(doc, 'div', 'verb-cursor', bar);
  cur.setAttribute('aria-hidden', 'true');
  root.appendChild(cur);
  setO(cur, 0);

  const slots = {};
  for (const s of SLOT_ORDER) slots[s] = slotLayer(doc, s);
  let vw = win.innerWidth || 1920, vh = win.innerHeight || 1080;
  const onResize = () => { vw = win.innerWidth || vw; vh = win.innerHeight || vh; };
  win.addEventListener?.('resize', onResize);
  const missAt = {};                   // último intento de buscar una ranura que no está
  let clock = 0;
  let curT = 0;                        // s que la barra del cursor sigue viva tras soltar
  let charge = null;                   // la carga que se ve: { slot, ref, id, t0, streak }
  let lastPos = { x: -1, y: -1 };
  let destroyed = false;
  const p = () => game?.player || null;

  // cuelga la capa en su ranura (y la vuelve a colgar si la barra se rehízo)
  function attach(slot, st) {
    let host = st.host;
    if (host && host.isConnected && st.L.parentNode === host) return host;
    if (!host || !host.isConnected) {
      if (clock - (missAt[slot] ?? -1) < 0.25) return null;
      host = findSlot(slot) || null;
      if (!host) { missAt[slot] = clock; st.host = null; return null; }
      st.host = host; st.flip = null;
    }
    host.appendChild(st.L);
    return host;
  }

  // destello de un instante: alterna dos animaciones iguales (a/b) para reiniciarla sin
  // forzar un reflow
  function pulse(el, kind) {
    el._vn = (el._vn || 0) + 1;
    setA(el, 'data-flash', `${kind}-${el._vn % 2 ? 'a' : 'b'}`);
  }

  function paintSlot(slot, v, dt) {
    const st = slots[slot];
    const host = attach(slot, st);
    if (!host) return;
    if (!v) {
      setO(st.L, 0);
      if (st.flip !== null) { st.flip = null; setA(host, 'data-verb-flip', null); }
      return;
    }
    setO(st.L, 1);
    // ---- carga dentro de la ranura
    const c = v.charge;
    setO(st.bar, c ? 1 : 0);
    if (c) setTrack(st.bar, c);
    setB(st.L, 'data-win', !!c?.perfectNow);
    // ---- aro: canal > relanzar > postura con duración
    let ring = null, kind = '';
    if (v.channel) {
      kind = 'channel';
      // los tics bajan a saltos de ~0,33 s: el aro baja suave hacia el valor del motor
      const target = v.channel.frac;
      if (st.chOff == null || v.channel.endless) st.chShown = target;
      else st.chShown = Math.max(target, Math.min(st.chShown, target + 0.25) - dt / Math.max(0.3, v.channel.t + 0.33));
      st.chOff = 1;
      ring = v.channel.endless ? 1 : st.chShown;
    } else st.chOff = null;
    if (ring == null && v.recast) { kind = 'recast'; ring = v.recast.frac; }
    if (ring == null && v.stance?.timed) { kind = 'stance'; ring = v.stance.frac; }
    setO(st.ring, ring == null ? 0 : 1);
    setA(st.ring, 'data-kind', kind || null);
    setB(st.ring, 'data-gold', kind === 'recast' && !!v.recast?.perfect);
    setB(st.ring, 'data-endless', !!v.channel?.endless);
    if (kind === 'stance') setVar(st.ring, '--vr-c', v.stance.color);
    if (ring != null) setRing(st.ring, ring);
    // ---- pips: combo, secuencia o trampas armadas
    let n = 0, lit = -1, done = 0, pk = '';
    if (v.combo) { n = v.combo.n; done = v.combo.idx; lit = v.combo.idx; pk = v.combo.last ? 'combo-last' : 'combo'; }
    else if (v.seq) { n = Math.min(PIPS_MAX, v.seq.every); done = v.seq.count; lit = v.seq.ready ? n - 1 : -1; pk = 'seq'; }
    else if (v.traps?.max) { n = Math.min(PIPS_MAX, v.traps.max); done = v.traps.n; pk = 'trap'; }
    setA(st.pips, 'data-n', n);
    setA(st.pips, 'data-kind', pk || null);
    // el pip del paso siguiente solo late con el combo en marcha o el especial listo (en reposo, quieto)
    setB(st.pips, 'data-live', (v.combo && v.combo.idx > 0) || !!v.seq?.ready);
    setB(st.pips, 'data-up', !!c && n > 0);
    const special = pk === 'seq' || pk.startsWith('combo');      // el último es el golpe especial
    for (let i = 0; i < PIPS_MAX; i++) {
      setA(st.pipEls[i], 'data-s', i >= n ? 'off' : i === lit ? 'next' : i < done ? 'done' : 'todo');
      setB(st.pipEls[i], 'data-last', special && i === n - 1);
    }
    // ---- número: usos de relanzar > trampas sin tope > cargas
    let txt = '', ck = '';
    if (v.recast) { txt = String(v.recast.left); ck = 'recast'; }
    else if (v.traps && !v.traps.max) { txt = String(v.traps.n); ck = 'trap'; }
    else if (v.charges) { txt = String(v.charges.n); ck = v.charges.n > 0 ? 'charges' : 'charges-0'; }
    setTxt(st.count, txt);
    setA(st.count, 'data-kind', ck || null);
    setO(st.count, txt ? 1 : 0);
    // ---- enganchada (holdMode 'toggle'), plantado y postura
    setO(st.latch, (c?.toggle || v.channel?.toggle) ? 1 : 0);
    setO(st.plant, v.planted == null ? 0 : v.planted ? 1 : 0.38);
    setB(st.plant, 'data-on', !!v.planted);
    setA(st.stance, 'data-mode', v.stance?.mode || null);
    setB(st.stance, 'data-both', !!v.stance?.both);
    if (v.stance) setVar(st.stance, '--vs-c', v.stance.color);
    setO(st.stance, v.stance ? 1 : 0);
    // el icono se da la vuelta en el 2.º modo de una postura de dos
    const flip = !!(v.stance && v.stance.n > 1 && v.stance.idx % 2 === 1);
    if (st.flip !== flip) { st.flip = flip; setB(host, 'data-verb-flip', flip); }
  }

  // la carga que se veía terminó: ¿perfecta, fallida o cancelada? Manda g._chargeEnd
  // ({ key, id, reason, perfect, frac, t, instant }: una suelta instantánea no es un fallo; lo escribe el motor al terminar CADA carga, cola W2) si es
  // de ESTA carga (misma ranura y escrito después de empezarla); si no, la racha de perfectos:
  // sube → perfecta, baja a 0 → fallo (la esquiva, un panel o un golpe cancelan sin tocarla)
  function finishCharge(pl) {
    const st = slots[charge.slot];
    const end = game?._chargeEnd || null;
    const fresh = !!end && end.key === charge.slot && (end.id == null || charge.id == null || end.id === charge.id)
      && Number.isFinite(end.t) && end.t >= charge.t0 - 1e-9;
    const streak = pl?.perfectStreak || 0;
    const perfect = fresh ? !!end.perfect : streak > charge.streak;
    const missed = fresh ? !end.perfect && !end.instant && (end.reason === 'release' || end.reason === 'auto') : charge.streak > 0 && streak === 0;
    if (perfect) { if (st) pulse(st.flash, 'perfect'); pulse(glow, 'perfect'); }
    else if (missed) pulse(glow, 'miss');
    setA(cur, 'data-state', perfect ? 'perfect' : missed ? 'miss' : 'end');
    charge = null;
  }

  function paintCursor(v, dt) {
    const pl = p();
    const c = v.charge;
    const ref = game?._charging || null;
    // terminó (o la sustituyó otra en el mismo frame: se resuelve la vieja antes de pintar la nueva)
    if (charge && (!c || charge.ref !== ref)) finishCharge(pl);
    if (c) {
      if (!charge) charge = { slot: c.slot, ref, id: ref?.id ?? null, t0: Number.isFinite(ref?.t0) ? ref.t0 : (pl?.simT || 0), streak: pl?.perfectStreak || 0 };
      curT = RESULT_MS / 1000;
      setTrack(bar, c);
      setO(latch, c.toggle ? 1 : 0);
      setO(cur, 1);
      setA(cur, 'data-state', 'on');
    } else {
      curT = Math.max(0, curT - dt);
      setO(cur, curT > 0 ? Math.min(1, curT / (RESULT_MS / 1000) * 1.6) : 0);
      if (curT <= 0) return;
    }
    // posición: junto al cursor y dentro de la pantalla (transform; sin leer el layout)
    const m = game?.input?.mouseScreen;
    if (m) {
      const pos = cursorBarPos(m.x, m.y, vw, vh, CURSOR_BAR);
      if (pos.x !== lastPos.x || pos.y !== lastPos.y) { lastPos = pos; setT(cur, `translate3d(${pos.x}px, ${pos.y}px, 0)`); }
    }
  }

  return {
    el: root,
    bar,
    update(realDt = 0) {
      if (destroyed) return;
      const dt = Math.max(0, Math.min(0.25, +realDt || 0));
      clock += dt;
      let v;
      try { v = verbView(game); } catch (e) { try { console.warn('[ui-verbs]', e); } catch { /* */ } return; }
      for (const s of SLOT_ORDER) paintSlot(s, v.slots[s] || null, dt);
      paintCursor(v, dt);
    },
    // la capa de una ranura (arnés y humo)
    slotLayer(slot) { return slots[slot]?.L || null; },
    destroy() {
      destroyed = true;
      win.removeEventListener?.('resize', onResize);
      cur.remove();
      for (const s of SLOT_ORDER) { slots[s].L.remove(); if (slots[s].host) slots[s].host.removeAttribute('data-verb-flip'); }
    },
  };
}
