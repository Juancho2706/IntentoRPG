// ============================================================
// BARRAS DE MECÁNICA · Arquera · Concentración (Francotiradora), Coto de Caza (Montaraz), Impulso (Tiradora) (Paso 2d.2 · E1)
// ============================================================
// docs/paso2d2-hud-pc.md §3.7–§3.9 (formas), §3.0 (gramática común), §4 (demo) y el mockup
// docs/mockups/hud-pc.html (bloques 7, 8 y 9). Lo registra js/ui-gauges.js (defineGaugeView);
// la CSS vive en css/gauges-arquera.css y el arte pintado en assets/gauges/gz_{conc,coto,impulso}_*.webp.
//
//   concentracion  RETÍCULA QUE SE CIERRA: anillo de mira (gz_conc_anillo) con 4 esquineras
//                  (gz_conc_esquinera, rotadas por código) que convergen al centro con el valor;
//                  a 100 se enciende el punto rojo (Tiro Fijado) y aparece el ojo de halcón
//                  (gz_conc_fijado). Moviéndote la retícula tiembla, los hilos se vuelven
//                  discontinuos y sale «MOVIÉNDOTE −25/s» (se pierde: forma + texto, no solo color).
//                  Visión Certera: anillo de tiempo, sin temblor y «moverte no la vacía».
//   coto           CEPOS Y MEDALLÓN: 3 ranuras de cepo (4 con Coto Cerrado): armado (gz_coto_cepo),
//                  vacío (gz_coto_cepo_vacio) y recargando (barrido cónico en la primera ranura
//                  libre con la fracción de recarga de Trampa de Cepo). A la derecha el medallón de
//                  Presa (gz_coto_presa) con su nombre, un aro con su VIDA y «ATRAPADA»; en los 3
//                  últimos segundos el nombre se apaga y el medallón parpadea. `world.ground` da la
//                  marca de suelo bajo la Presa (gz_coto_marca_suelo, ADITIVO).
//   impulso        ROSA DE LOS VIENTOS: rosa de bronce (gz_impulso_rosa) con 5 plumas
//                  (gz_impulso_pluma) a 72°; cada 20 se llena una pluma (media en tramos
//                  parciales). Gira en movimiento (3 s · 1,6 s · 0,8 s por vuelta según el tramo) y se
//                  DETIENE quieta con «¡MUÉVETE!». Vendaval: 0,4 s por vuelta, plumas blancas y el
//                  remolino (gz_impulso_vendaval) girando al revés.
//
// Formas y animaciones: CSS/SVG (solo transform/opacity, A8); el arte es la PIEL (R9) y, si no
// carga, queda la reserva CSS (.no-art). Todos los números de texto salen de gaugeTuning() (A4)
// o de los nodos de TALENT_TREES (talents-arquera.js, hoja pura).
//
// CONTRATO (congelado en E0; detalle en la cabecera de js/ui-gauges.js):
//   { mount(body, ctx) → inst, update(inst, view, prev, ctx) → { num, sub?, now? },
//     model(view, T) → objeto puro, demo: Frame[], explain(T) → { text, cols[3], tip },
//     nodes: { nodeId: 'cómo la potencia' }, sounds: { full?, spent? }, world? }
//
// world.ground(e, p) de Coto (lo pinta ui.js; aquí solo los datos, puros):
//   → null si `e` no es la Presa viva del héroe; si lo es:
//     { asset: 'gz_coto_marca_suelo', blend: 'additive', color, radius (m), t, tMax, k (t/tMax),
//       expiring (t < 3 s: parpadeo), trapped (inmovilizada), spin (vueltas/s), opacity }
import { gaugeTuning } from './spec-mechanics.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

// ------------------------------------------------------------
// utilidades puras
// ------------------------------------------------------------
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const num = n => (Number.isFinite(+n) ? +n : 0);
// número en formato español sin ceros sobrantes: 0.15 → '0,15', 15.000000000000002 → '15'
export function fmtN(n, dec = 2) {
  const r = Math.round(num(n) * 10 ** dec) / 10 ** dec;
  return String(r).replace('.', ',');
}
const fmt1 = n => (Math.round(num(n) * 10) / 10).toFixed(1).replace('.', ',');
const fmtS = t => `${fmt1(t)} s`;
const plural = (n, one, many) => (n === 1 ? one : many);

// número de un nodo del árbol (fx.tv / fx.stats): una sola fuente para los subtítulos de la demo
function nodeFx(specId, nodeId, group, key, fallback) {
  try {
    const spec = ARQUERA_TALENTS.specs.find(s => s.id === specId);
    const n = spec?.nodes.find(x => x.id === nodeId);
    const v = n?.fx?.[group]?.[key];
    return Number.isFinite(v) ? v : fallback;
  } catch { return fallback; }
}

const COLORS = { concentracion: '#ead86e', coto: '#86d47a', impulso: '#66d7c7' };
const EXPIRING_S = 3;           // §3.8: la Presa «caduca» (anillo bajo 3 s y nombre en gris)
const FEATHERS = 5;             // §3.9: 5 plumas a 72°

// ============================================================
// 7 · CONCENTRACIÓN — retícula que se cierra
// ============================================================
const CONC_OPEN_PX = 9;         // desplazamiento de las esquineras a 0 (caja máxima 52 px)

export function concentracionModel(v, T = gaugeTuning()) {
  const C = T.concentracion;
  const x = v?.x || {};
  const max = Math.max(1, num(v?.max) || C.max);
  const value = clamp(num(v?.value), 0, max);
  const k = value / max;
  const active = v?.state === 'active';
  const moving = !!x.moving && !active;
  const losing = moving && !!v?.decaying && value > 0;
  const locked = value >= max;
  const critPct = Math.round(value * C.critPerPoint * 100) / 100;
  const aimedReady = (v?.ready || []).includes('a_t_apuntado');
  let hint, sub;
  if (active) { hint = 'Moverte no la vacía'; sub = undefined; }              // núcleo: «Visión Certera · 8,3 s»
  else if (losing) { hint = `Moviéndote −${C.losePerSec}/s`; sub = 'Se pierde al moverte'; }
  else if (locked) { hint = aimedReady ? 'Apuntado al instante' : 'Retícula cerrada'; sub = 'Tiro Fijado'; }
  else if (moving) { hint = 'Párate para apuntar'; sub = 'Moviéndote'; }
  else if (value > 0) { hint = `Quieta +${C.gainPerSec}/s`; sub = 'Apuntando'; }
  else { hint = `Quieta +${C.gainPerSec}/s`; sub = 'Quédate quieta para apuntar'; }
  return {
    k: Math.round(k * 1000) / 1000,
    offset: Math.round((1 - k) * CONC_OPEN_PX * 10) / 10,     // px hacia fuera de cada esquinera
    locked, moving, losing, active, aimedReady,
    critPct, crit: `+${fmt1(critPct)} % crít`,
    hint, sub,
    eye: locked || active,
    num: String(Math.floor(value)),
    now: `${Math.floor(value)} / ${max} · +${fmt1(critPct)} % de crítico${active ? ` · Visión Certera ${fmtS(v.t ?? 0)}` : losing ? ' · moviéndote' : locked ? ' · Tiro Fijado' : ''}`,
  };
}

const concentracion = {
  mount(body, ctx) {
    const rt = ctx.h('div', 'cz-rt');
    rt.innerHTML = '<i class="cz-ring"></i><i class="cz-cross"></i><i class="cz-dot"></i>';
    const ring = ctx.art('gz_conc_anillo', { cls: 'cz-ring-art' });
    if (ring) rt.insertBefore(ring, rt.children[1]);
    const br = [];
    for (let i = 0; i < 4; i++) {
      const b = ctx.h('span', `cz-br cz-b${i}`, '<i class="cz-brf"></i>');
      const a = ctx.art('gz_conc_esquinera', { cls: 'cz-br-art' });
      if (a) b.appendChild(a);
      rt.appendChild(b);
      br.push(b);
    }
    const wire = ctx.h('div', 'cz-wire', '<i class="cz-wl"></i><i class="cz-wr"></i><b class="cz-tick"></b>');
    const txt = ctx.h('div', 'cz-txt', '<b class="cz-crit"></b><span class="cz-line"><span class="cz-hint"></span><span class="cz-mv">MOVIÉNDOTE</span></span>');
    const eye = ctx.h('span', 'cz-eye', '<i class="cz-eyef"></i>');
    const eyeArt = ctx.art('gz_conc_fijado', { cls: 'cz-eye-art', alt: 'Tiro Fijado' });
    if (eyeArt) eye.appendChild(eyeArt);
    body.append(rt, wire, txt, eye);
    return { rt, br, wire, wl: wire.querySelector('.cz-wl'), wr: wire.querySelector('.cz-wr'),
      crit: txt.querySelector('.cz-crit'), hint: txt.querySelector('.cz-hint'), eye };
  },
  update(inst, v, prev, ctx) {
    const m = concentracionModel(v, ctx.T);
    ctx.setStyle(inst.rt, '--o', `${m.offset}px`);
    ctx.setStyle(inst.wl, 'transform', `scaleX(${m.k})`);
    ctx.setStyle(inst.wr, 'transform', `scaleX(${m.k})`);
    ctx.toggle(ctx.el, 'cz-moving', m.moving);
    ctx.toggle(ctx.el, 'cz-losing', m.losing);
    ctx.toggle(ctx.el, 'cz-locked', m.locked);
    ctx.toggle(ctx.el, 'cz-eyeon', m.eye);
    ctx.toggle(ctx.el, 'cz-aimed', m.aimedReady);
    ctx.setText(inst.crit, m.crit);
    ctx.setText(inst.hint, m.hint);
    return { num: m.num, sub: m.sub, now: m.now };
  },
};

// ============================================================
// 8 · COTO DE CAZA — cepos armados y medallón de Presa
// ============================================================
export function cotoModel(v, T = gaugeTuning()) {
  const C = T.coto;
  const x = v?.x || {};
  const slotsMax = C.maxArmed + C.maxArmedExtra;
  const max = clamp(Math.floor(num(v?.max) || C.maxArmed), 1, slotsMax);
  const n = clamp(Math.floor(num(v?.value)), 0, max);
  const chMax = Number.isFinite(x.trapChargesMax) ? x.trapChargesMax : C.trap.charges;
  const ch = Number.isFinite(x.trapCharges) ? clamp(x.trapCharges, 0, chMax) : chMax;
  const frac = clamp(num(x.trapCdFrac), 0, 1);
  const recharging = chMax > 0 && ch < chMax;
  const slots = [];
  for (let i = 0; i < slotsMax; i++) {
    const show = i < max;
    let st = 'empty';
    if (i < n) st = 'armed';
    else if (i === n && recharging) st = 'cd';
    else if (i === n && ch > 0) st = 'ready';
    slots.push({ show, st, f: st === 'cd' ? Math.round(frac * 1000) / 1000 : 0 });
  }
  const prey = v?.state === 'prey';
  const t = Number.isFinite(v?.t) ? v.t : null;
  const hp = prey ? clamp(num(x.preyHpPct), 0, 100) : 0;
  const trapped = prey && (x.preyTrapped === true || num(x.preyTrapped) >= 0.5);
  const expiring = prey && t != null && t < EXPIRING_S;
  const name = prey ? (x.preyName || 'Presa') : 'sin Presa';
  let sub;
  if (prey) sub = `Presa · ${name}${t != null ? ' · ' + fmtS(t) : ''}`;
  else if (n >= max) sub = 'Coto completo';
  else if (n > 0) sub = `${n} de ${max} ${plural(max, 'armada', 'armadas')}`;
  else sub = ch > 0 ? 'Arma Trampa de Cepo' : 'Trampa de Cepo en recarga';
  const info = prey ? `Vida ${Math.round(hp)} %` : recharging ? `Cepo: recarga ${Math.round(frac * 100)} %` : ch > 0 ? `Cepo listo${ch > 1 ? ' ×' + ch : ''}` : 'Sin Trampa de Cepo';
  return {
    n, max, slots, recharging, charges: ch, chargesMax: chMax, frac,
    prey, name, hp: Math.round(hp) / 100, trapped, expiring, info,
    full: n >= max,
    num: `${n}/${max}`, sub,
    now: `${n}/${max} trampas armadas${prey ? ` · Presa: ${name} (${Math.round(hp)} %)${t != null ? ' · ' + fmtS(t) : ''}${trapped ? ' · atrapada' : ''}` : ''}`,
  };
}

const COTO_SVG = '<svg class="ct-svg" viewBox="0 0 24 20" aria-hidden="true"><path d="M2 12h20M4 12l2-8 2 8 2-8 2 8 2-8 2 8 2-8 2 8M4 12c0 4 4 6 8 6s8-2 8-6"/></svg>';

const coto = {
  mount(body, ctx) {
    const T = ctx.T.coto;
    const traps = ctx.h('div', 'ct-traps');
    const slots = [];
    for (let i = 0; i < T.maxArmed + T.maxArmedExtra; i++) {
      const s = ctx.h('div', `ct-trap${i >= T.maxArmed ? ' ct-extra' : ''}`, `${COTO_SVG}<i class="ct-cd"></i>`);
      const empty = ctx.art('gz_coto_cepo_vacio', { cls: 'ct-empty-art' });
      const armed = ctx.art('gz_coto_cepo', { cls: 'ct-armed-art' });
      if (empty) s.insertBefore(empty, s.firstChild);
      if (armed) s.insertBefore(armed, s.querySelector('.ct-cd'));
      traps.appendChild(s);
      slots.push(s);
    }
    const prey = ctx.h('div', 'ct-prey', '<span class="ct-med"><i class="ct-hp"></i><i class="ct-medf">♞</i></span>' +
      '<span class="ct-pinfo"><b class="ct-pn"></b><span class="ct-pl"><span class="ct-info"></span><em class="ct-tag">ATRAPADA</em></span></span>');
    const med = prey.querySelector('.ct-med');
    const art = ctx.art('gz_coto_presa', { cls: 'ct-med-art', alt: 'Presa' });
    if (art) med.appendChild(art);
    body.append(traps, prey);
    return { traps, slots, med, hp: prey.querySelector('.ct-hp'), pn: prey.querySelector('.ct-pn'), info: prey.querySelector('.ct-info'), shk: 0 };
  },
  update(inst, v, prev, ctx) {
    const m = cotoModel(v, ctx.T);
    m.slots.forEach((s, i) => {
      const el = inst.slots[i];
      ctx.toggle(el, 'ct-hide', !s.show);
      ctx.toggle(el, 'on', s.st === 'armed');
      ctx.toggle(el, 'cd', s.st === 'cd');
      ctx.toggle(el, 'ready', s.st === 'ready');
      ctx.setStyle(el, '--f', s.f.toFixed(3));
    });
    // una trampa se dispara (seq.spent): sacudida de 150 ms (dos nombres alternos reinician la animación)
    if (prev && prev.id === v.id && (v.seq?.spent || 0) > (prev.seq?.spent || 0)) {
      inst.shk = inst.shk === 1 ? 2 : 1;
      ctx.toggle(inst.traps, 'ct-shk1', inst.shk === 1);
      ctx.toggle(inst.traps, 'ct-shk2', inst.shk === 2);
    }
    ctx.toggle(ctx.el, 'ct-full', m.full);
    ctx.toggle(ctx.el, 'ct-trapped', m.trapped);
    ctx.toggle(ctx.el, 'ct-expiring', m.expiring);
    ctx.setStyle(inst.hp, '--hp', m.hp.toFixed(3));
    ctx.setText(inst.pn, m.name);
    ctx.setText(inst.info, m.info);
    return { num: m.num, sub: m.sub, now: m.now };
  },
};

// ============================================================
// 9 · IMPULSO — rosa de los vientos que gira y se llena de plumas
// ============================================================
export function impulsoModel(v, T = gaugeTuning()) {
  const I = T.impulso;
  const x = v?.x || {};
  const max = Math.max(1, num(v?.max) || I.max);
  const value = clamp(num(v?.value), 0, max);
  const active = v?.state === 'active';
  const moving = !!x.moving;
  const still = !moving && !active;
  const step = max / FEATHERS;
  const feathers = Array.from({ length: FEATHERS }, (_, i) => {
    if (active) return 'on';
    const k = clamp((value - i * step) / step, 0, 1);
    return k >= 1 ? 'on' : k > 0 ? 'half' : 'off';
  });
  const lit = feathers.filter(f => f === 'on').length;
  // §3.9: 3 s · 1,6 s · 0,8 s por vuelta (<34 · <67 · ≥67) y 0,4 s en Vendaval
  const speed = active ? 4 : value >= max * 0.67 ? 3 : value >= max * 0.34 ? 2 : 1;
  const line1 = active ? `Vendaval: +${I.galeAspd} % vel. de ataque` : `${lit} de ${FEATHERS} plumas`;
  const line2 = active ? `+${I.galeProj} ${plural(I.galeProj, 'proyectil', 'proyectiles')} a Flecha Múltiple` : `+${I.perShot} por disparo en movimiento`;
  const sub = active ? undefined : still ? (value > 0 ? 'Quieta: no ganas' : 'Muévete y dispara') : 'En movimiento';
  const ext = num(x.galeExt);
  return {
    feathers, lit, speed, spinning: moving || active, still, active, line1, line2, sub, galeExt: ext,
    num: String(Math.floor(value)),
    now: active ? `Vendaval · ${fmtS(v.t ?? 0)}${ext > 0 ? ` (+${fmt1(ext)} s de Vendaval Perpetuo)` : ''}`
      : `${Math.floor(value)} / ${max} · ${lit} de ${FEATHERS} plumas · ${still ? 'quieta' : 'en movimiento'}`,
  };
}

// plumas de reserva (CSS/SVG) bajo la piel: misma geometría que el mockup (viewBox −28…28)
const ROSE_SVG = `<svg class="im-svg" viewBox="-28 -28 56 56" aria-hidden="true">${Array.from({ length: FEATHERS }, (_, i) =>
  `<path class="fe" transform="rotate(${i * 72})" d="M0-4C5-10 6-19 0-26C-6-19-5-10 0-4Z"/>`).join('')}` +
  '<path class="star" d="M0-12 3-3 12 0 3 3 0 12-3 3-12 0-3-3Z"/><circle class="gem" r="2.5"/></svg>';

const impulso = {
  mount(body, ctx) {
    const rose = ctx.h('div', 'im-rose', '<i class="im-gust"></i>');
    const gust = rose.querySelector('.im-gust');
    const gArt = ctx.art('gz_impulso_vendaval', { cls: 'im-gust-art' });
    if (gArt) gust.appendChild(gArt);
    const spin = ctx.h('div', 'im-spin', ROSE_SVG);
    const fe = [];
    for (let i = 0; i < FEATHERS; i++) {
      const f = ctx.h('span', `im-fe im-f${i}`);
      const a = ctx.art('gz_impulso_pluma', { cls: 'im-fe-art' });
      if (a) f.appendChild(a);
      spin.appendChild(f);
      fe.push(f);
    }
    const rArt = ctx.art('gz_impulso_rosa', { cls: 'im-rose-art' });
    if (rArt) spin.appendChild(rArt);
    rose.appendChild(spin);
    const txt = ctx.h('div', 'im-txt', '<b></b><span></span>');
    const stop = ctx.h('span', 'im-stop', '¡MUÉVETE!');
    body.append(rose, txt, stop);
    return { fe, svgFe: [...spin.querySelectorAll('.im-svg .fe')], b: txt.querySelector('b'), s: txt.querySelector('span') };
  },
  update(inst, v, prev, ctx) {
    const m = impulsoModel(v, ctx.T);
    m.feathers.forEach((st, i) => {
      for (const el of [inst.fe[i], inst.svgFe[i]]) {
        ctx.toggle(el, 'on', st === 'on');
        ctx.toggle(el, 'half', st === 'half');
      }
    });
    for (let s = 1; s <= 4; s++) ctx.toggle(ctx.el, `im-sp${s}`, m.speed === s);
    ctx.toggle(ctx.el, 'im-moving', m.spinning);
    ctx.toggle(ctx.el, 'im-still', m.still);
    ctx.setText(inst.b, m.line1);
    ctx.setText(inst.s, m.line2);
    return { num: m.num, sub: m.sub, now: m.now };
  },
};

// ============================================================
// demos (§4): fotogramas sintéticos que respetan gaugeTuning()
// ============================================================
function concentracionDemo(T) {
  const C = T.concentracion;
  const rate = nodeFx('francotiradora', 's2', 'tv', 'focusRate', 20);
  const crit = v => Math.round(v * C.critPerPoint * 100) / 100;
  const t3 = 40, tFull = 3 + (C.max - t3) / C.gainPerSec;               // 40 → 100 a +20/s: 3 s
  const afterSpend = C.max - C.alientoSpend;
  const decayEnd = Math.max(0, afterSpend - C.losePerSec * 1.4);
  const vis = C.vision.t;
  const tSpend = tFull + 0.9, tDecay = tSpend + 0.6, tVis = tDecay + 1.4, tEnd = tVis + 3.6;
  return [
    { t: 0, value: 0, max: C.max, state: 'idle', decaying: false, x: { moving: true, critPct: 0, visionT: 0, visionMax: 0 },
      cap: 'Moviéndote no ganas Concentración: la retícula está abierta.', tag: 'idle', nodes: [] },
    { t: 1, value: 0, state: 'building', x: { moving: false }, ease: 1,
      cap: `Quieta: +${C.gainPerSec}/s (+${rate} % más rápido por rango de Aliento Contenido); las esquineras se cierran.`, nodes: ['s0', 's2'] },
    { t: 3, value: t3, x: { critPct: crit(t3) }, ease: 1, cap: `Cada punto: +${fmtN(C.critPerPoint)} % de crítico.`, tag: 'building', nodes: ['s0'] },
    { t: tFull, value: C.max, state: 'full', fire: 'full', ready: ['a_t_apuntado'], x: { critPct: crit(C.max) },
      cap: `${C.max}: Tiro Fijado, +${fmtN(C.critPerPoint * C.max)} % de crítico; con Aliento del Cazador, Disparo Apuntado sale al instante.`, tag: 'full', nodes: ['s4', 's11'] },
    { t: tSpend, value: afterSpend, state: 'building', fire: 'spent', ready: null, x: { critPct: crit(afterSpend) },
      cap: `Aliento del Cazador: el disparo instantáneo gasta ${C.alientoSpend}.`, nodes: ['s4'] },
    { t: tDecay, value: afterSpend, decaying: true, x: { moving: true }, ease: 1,
      cap: `Moverte la vacía: −${C.losePerSec}/s (la retícula tiembla y se abre).`, tag: 'decay', nodes: ['s15'] },
    { t: tVis, value: decayEnd, state: 'active', decaying: false, label: 'Visión Certera', t2: vis, tMax: vis, ease: 1,
      x: { moving: true, critPct: crit(decayEnd), visionT: vis, visionMax: vis },
      cap: `Visión Certera: ${vis} s en los que moverte no la vacía.`, tag: 'active', nodes: ['s9'] },
    { t: tEnd, t2: vis - (tEnd - tVis), x: { visionT: vis - (tEnd - tVis) } },
    { t: tEnd + 0.4, end: 1 },
  ];
}

function cotoDemo(T) {
  const C = T.coto;
  const cd = C.trap.cd, preyT = C.preyT;
  return [
    { t: 0, value: 0, max: C.maxArmed, state: 'idle', label: '', t2: null, tMax: null,
      x: { trapCharges: C.trap.charges, trapChargesMax: C.trap.charges, trapCdFrac: 0, preyName: '', preyHpPct: 0, preyTrapped: false },
      cap: `Coto de Caza: el valor son tus trampas armadas (máx. ${C.maxArmed}).`, tag: 'idle', nodes: [] },
    { t: 1, value: 1, state: 'building', fire: 'gain', x: { trapCharges: 0, trapCdFrac: 0 }, ease: 1,
      cap: `Trampa de Cepo arma un cepo; la carga vuelve en ${cd} s (barrido en la siguiente ranura).`, nodes: ['s0', 's12'] },
    { t: 3, x: { trapCdFrac: 2 / cd }, tag: 'building', ease: 1, cap: 'La siguiente carga se recarga en la primera ranura libre.', nodes: ['s12'] },
    { t: 4, x: { trapCdFrac: 3 / cd } },
    { t: 4.1, x: { trapCharges: 2, trapChargesMax: 2, trapCdFrac: 0 }, cap: 'Cepo Doble: Trampa de Cepo gana una 2.ª carga.', nodes: ['s4'] },
    { t: 4.7, value: 2, fire: 'gain', x: { trapCharges: 1 } },
    { t: 5.3, value: C.maxArmed, state: 'full', fire: 'full', x: { trapCharges: 0, trapCdFrac: 0.05 },
      cap: `${C.maxArmed} cepos armados: coto completo (${C.maxArmed + C.maxArmedExtra} con Coto Cerrado).`, tag: 'full', nodes: ['s14'] },
    { t: 6.5, state: 'prey', label: 'Presa', t2: preyT, tMax: preyT, ease: 1, x: { preyName: 'Bestia Alfa', preyHpPct: 100, trapCdFrac: 0.2 },
      cap: `El primer élite o jefe que golpeas es tu Presa ${preyT} s (Cazadora Paciente: más daño contra ella).`, tag: 'active', nodes: ['s0', 's15'] },
    { t: 8.2, t2: preyT - 1.7, x: { preyHpPct: 80, trapCdFrac: 0.41 } },
    { t: 8.3, value: 2, t2: preyT - 1.8, fire: 'spent', x: { preyHpPct: 78, preyTrapped: true, trapCdFrac: 0.42 }, ease: 1,
      cap: `La Presa pisa un cepo: inmovilizada ${C.trap.root} s.`, nodes: ['s16', 'x3'] },
    { t: 10.2, t2: preyT - 3.7, x: { preyHpPct: 52, preyTrapped: false, trapCdFrac: 0.66 } },
    { t: 10.3, t2: EXPIRING_S - 0.4, x: { preyHpPct: 40 }, ease: 1,
      cap: `Los últimos ${EXPIRING_S} s de la Presa: el nombre se apaga y el medallón parpadea.`, tag: 'decay', nodes: [] },
    { t: 12.5, t2: 0.4, x: { preyHpPct: 34 } },
    { t: 12.9, end: 1 },
  ];
}

function impulsoDemo(T) {
  const I = T.impulso;
  const gc = I.galechain;
  const v1 = 36, v2 = v1 + I.andanada;
  return [
    { t: 0, value: 0, max: I.max, state: 'idle', label: '', t2: null, tMax: null, ready: null, x: { moving: false, galeExt: 0 },
      cap: 'Quieta no ganas Impulso: la rosa está detenida.', tag: 'idle', nodes: [] },
    { t: 1, value: 0, state: 'building', x: { moving: true }, ease: 1,
      cap: `+${I.perShot} por disparo hecho en movimiento: la rosa gira y se llenan las plumas.`, nodes: ['s0', 's2'] },
    { t: 3, value: v1, ease: 0, tag: 'building', cap: 'Cuanto más Impulso, más rápido gira.', nodes: ['s0'] },
    { t: 4, value: v1, x: { moving: false }, cap: 'Si te detienes, la rosa se para y no ganas: ¡muévete!', tag: 'decay', nodes: [] },
    { t: 5, value: v2, x: { moving: true }, fire: 'gain', ease: 1, cap: `Andanada Impulsiva: +${I.andanada} de golpe.`, nodes: ['s4'] },
    { t: 6.2, value: I.max, state: 'active', label: 'Vendaval', t2: I.galeT, tMax: I.galeT, ease: 1, fire: 'full', ready: ['flecha_multiple'],
      cap: `A ${I.max}: Vendaval ${I.galeT} s, +${I.galeAspd} % de vel. de ataque y +${I.galeProj} proyectil a Flecha Múltiple.`, tag: 'active', nodes: ['s0', 's11'] },
    { t: 8.9, t2: I.galeT - 2.7 },
    // dos abatidos con Vendaval Perpetuo: +2 × perKill al anillo (y a su máximo)
    { t: 9, t2: I.galeT - 2.8 + 2 * gc.perKill, tMax: I.galeT + 2 * gc.perKill, x: { galeExt: 2 * gc.perKill }, ease: 1,
      cap: `Vendaval Perpetuo: cada abatido lo alarga ${fmtN(gc.perKill)} s (hasta +${gc.max} s).`, nodes: ['s14'] },
    { t: 12, t2: I.galeT - 5.8 + 2 * gc.perKill },
    { t: 12.2, value: 0, state: 'idle', label: '', t2: null, tMax: null, ready: null, x: { moving: true, galeExt: 0 }, cap: 'Termina el Vendaval: vuelta a empezar.', nodes: [] },
    { t: 12.8, end: 1 },
  ];
}

// ============================================================
// explicación (tooltip y panel de talentos): SOLO números de T
// ============================================================
function concentracionExplain(T) {
  const C = T.concentracion;
  const g = C.gainPerSec, l = C.losePerSec, cpp = fmtN(C.critPerPoint), top = fmtN(C.critPerPoint * C.max);
  return {
    text: `Quieta ganas <b>Concentración</b> (+${g}/s) y moviéndote la pierdes (−${l}/s). Cada punto da +${cpp} % de crítico (+${top} % a ${C.max}).`,
    cols: [
      ['Generar', `Quieta: +${g}/s (Aliento Contenido la acelera)`],
      ['Descargar', `A ${C.max} con Aliento del Cazador: Disparo Apuntado instantáneo (gasta ${C.alientoSpend})`],
      ['Pérdida', `Moverte: −${l}/s · Visión Certera: ${C.vision.t} s sin pérdida`],
    ],
    tip: [
      `<b>Qué es:</b> tu puntería. La retícula se cierra mientras estás quieta; cada punto da +${cpp} % de crítico (+${top} % a ${C.max}).`,
      `<b>Gana:</b> +${g}/s quieta. <b>Pierde:</b> −${l}/s al moverte (MOVIÉNDOTE); Visión Certera la protege ${C.vision.t} s.`,
      `<b>Descarga:</b> con Aliento del Cazador, a ${C.max} Disparo Apuntado sale al instante y gasta ${C.alientoSpend}.`,
    ],
  };
}

function cotoExplain(T) {
  const C = T.coto, tr = C.trap;
  const cargas = `${tr.charges} ${plural(tr.charges, 'carga', 'cargas')}`;
  return {
    text: `El valor son tus <b>trampas armadas</b> (máx. ${C.maxArmed}; ${C.maxArmed + C.maxArmedExtra} con Coto Cerrado). El primer élite o jefe que golpeas es tu <b>Presa</b> ${C.preyT} s y cuenta como élite para tus bonificaciones.`,
    cols: [
      ['Generar', `Trampa de Cepo: ${cargas}, ${tr.cd} s por carga`],
      ['Descargar', `Un cepo pisado inmoviliza ${tr.root} s y se gasta`],
      ['Ventana', `Presa: primer élite o jefe golpeado, ${C.preyT} s`],
    ],
    tip: [
      `<b>Qué es:</b> tus cepos armados en el suelo (máx. ${C.maxArmed}; ${C.maxArmed + C.maxArmedExtra} con Coto Cerrado) y tu Presa.`,
      `<b>Gana:</b> Trampa de Cepo arma uno (${cargas}, ${tr.cd} s por carga). <b>Presa:</b> el primer élite o jefe que golpeas, ${C.preyT} s.`,
      `<b>Descarga:</b> el cepo que pisa un enemigo lo inmoviliza ${tr.root} s.`,
    ],
  };
}

function impulsoExplain(T) {
  const I = T.impulso, gc = I.galechain;
  const proj = `+${I.galeProj} ${plural(I.galeProj, 'proyectil', 'proyectiles')}`;
  return {
    text: `Cada disparo hecho <b>en movimiento</b> suma ${I.perShot} de Impulso. A ${I.max}: <b>Vendaval</b> ${I.galeT} s, +${I.galeAspd} % de velocidad de ataque y ${proj} a Flecha Múltiple.`,
    cols: [
      ['Generar', `+${I.perShot} por disparo en movimiento · Andanada Impulsiva +${I.andanada} · quieta no ganas`],
      ['Descargar', `Automática a ${I.max}: Vendaval ${I.galeT} s`],
      ['Ventana', `Vendaval ${I.galeT} s · Vendaval Perpetuo: +${fmtN(gc.perKill)} s por abatido (hasta +${gc.max} s)`],
    ],
    tip: [
      `<b>Qué es:</b> tu inercia de tiradora: la rosa de los vientos gira mientras corres y disparas.`,
      `<b>Gana:</b> +${I.perShot} por disparo hecho en movimiento; quieta, la rosa se para y no ganas (¡MUÉVETE!).`,
      `<b>Descarga:</b> a ${I.max}, Vendaval ${I.galeT} s: +${I.galeAspd} % de velocidad de ataque y ${proj} a Flecha Múltiple.`,
    ],
  };
}

// ============================================================
// nodos de cada especialización que potencian la mecánica (ids de TALENT_TREES)
// ============================================================
function concentracionNodes(T) {
  const C = T.concentracion;
  return {
    s0: 'Tiro Mortal: quedarte quieta genera Concentración y otorga Disparo Apuntado.',
    s2: 'Aliento Contenido: la Concentración sube más rápido.',
    s4: `Aliento del Cazador: a ${C.max}, Disparo Apuntado sale al instante y gasta ${C.alientoSpend}.`,
    s8: 'Posición Elevada: el doble de reducción de daño con la Concentración alta.',
    s9: `Visión Certera: ${C.vision.t} s en los que moverte no la vacía.`,
    s11: 'Respiración Profunda: al llenarla recuperas Energía.',
    s15: 'Paso del Acechador: moverte la vacía menos.',
    x3: `Disparo Imposible: a ${C.max}, Disparo Apuntado se dispara dos veces.`,
  };
}
function cotoNodes(T) {
  const C = T.coto;
  return {
    s0: `Cacería: otorga Trampa de Cepo y marca tu Presa (${C.preyT} s).`,
    s4: 'Cepo Doble: Trampa de Cepo gana una 2.ª carga.',
    s12: 'Rearme Rápido: la carga del cepo se recarga antes.',
    s14: `Coto Cerrado: hasta ${C.maxArmed + C.maxArmedExtra} trampas armadas (la 4.ª ranura).`,
    s15: 'Cazadora Paciente: más daño contra tu Presa.',
    s16: 'Raíces Profundas: el cepo inmoviliza más tiempo.',
    x1: 'Red de Espinas: los cepos armados se unen con una red de espinas.',
    x3: 'Gran Cacería: si tu Presa queda atrapada, todas las trampas se rearman.',
  };
}
function impulsoNodes(T) {
  const I = T.impulso, gc = I.galechain;
  return {
    s0: `Tormenta de Flechas: disparar en movimiento genera Impulso (+${I.perShot}).`,
    s2: 'Correr y Disparar: disparar ya no te frena; más disparos en movimiento.',
    s4: `Andanada Impulsiva: Andanada da +${I.andanada} de Impulso.`,
    s11: 'Segundo Aliento: al llenar el Impulso recuperas vida y Energía.',
    s13: 'Salto de Retirada da Impulso; Estela de Viento acelera al grupo durante el Vendaval.',
    s14: `Vendaval Perpetuo: cada abatido alarga el Vendaval ${fmtN(gc.perKill)} s (hasta +${gc.max} s).`,
    x2: 'Huracán: los disparos de Ráfaga Infinita dan Impulso.',
    x3: 'Ojo del Huracán: durante el Vendaval, Ráfaga Infinita se activa el doble de seguido.',
  };
}

// marca de suelo bajo la Presa (puro: lee el estado del indicador sin crearlo)
function cotoGround(e, p) {
  const st = p?.gauges?.coto;
  if (!e || !st || st.prey !== e || !(st.preyT > 0) || e.alive === false) return null;
  const T = gaugeTuning().coto;
  const t = st.preyT, tMax = T.preyT;
  const expiring = t < EXPIRING_S;
  return {
    asset: 'gz_coto_marca_suelo', blend: 'additive', color: COLORS.coto,
    radius: Math.round(1.1 * Math.max(0.6, num(e.def?.scale) || 1) * 100) / 100,
    t: Math.round(t * 100) / 100, tMax, k: Math.round(clamp(t / tMax, 0, 1) * 1000) / 1000,
    expiring, trapped: (num(e.rootT) > 0), spin: 0.12, opacity: expiring ? 0.55 : 0.9,
  };
}

// ============================================================
// registro
// ============================================================
const T0 = gaugeTuning();
export const ARQUERA_GAUGE_VIEWS = {
  concentracion: {
    ...concentracion,
    model: concentracionModel,
    demo: concentracionDemo(T0),
    explain: concentracionExplain,
    nodes: concentracionNodes(T0),
    sounds: { full: 'uiclick' },
  },
  coto: {
    ...coto,
    model: cotoModel,
    demo: cotoDemo(T0),
    explain: cotoExplain,
    nodes: cotoNodes(T0),
    sounds: { full: 'trap', spent: 'trap' },
    world: { ground: cotoGround },
  },
  impulso: {
    ...impulso,
    model: impulsoModel,
    demo: impulsoDemo(T0),
    explain: impulsoExplain,
    nodes: impulsoNodes(T0),
    sounds: { full: 'dash' },
  },
};
