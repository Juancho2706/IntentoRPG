// ============================================================
// BARRAS DE MECÁNICA · Arquera · Concentración (Francotiradora), Coto de Caza (Montaraz), Impulso (Tiradora) (Paso 2d.2 · E1)
// ============================================================
// docs/paso2d2-hud-pc.md §3.7–§3.9 (formas), §3.0 (gramática común), §4 (demo) y el mockup
// docs/mockups/hud-pc.html (bloques 7, 8 y 9). Lo registra js/ui-gauges.js (defineGaugeView);
// la CSS vive en css/gauges-arquera.css y el arte pintado en assets/gauges/gz_{conc,coto,impulso}_*.webp.
//
//   concentracion  RETÍCULA QUE SE CIERRA: anillo de mira (gz_conc_anillo) con 4 esquineras
//                  (gz_conc_esquinera, rotadas por código) que convergen al centro con el valor;
//                  a 100 empieza la CALMA ABSOLUTA: se enciende el punto rojo y el ojo de halcón
//                  (gz_conc_fijado) con su anillo de tiempo. Moviéndote la retícula tiembla, los hilos se
//                  vuelven discontinuos y sale «MOVIÉNDOTE −25/s» (se pierde: forma + texto); de rodillas
//                  sale «DE RODILLAS» y no tiembla. Tras la Calma, RESPIRO: retícula apagada y su tiempo.
//   coto           CEPOS Y MEDALLÓN: 3 ranuras de cepo: armado (gz_coto_cepo), vacío
//                  (gz_coto_cepo_vacio) y recargando (barrido cónico en la primera ranura libre con la
//                  fracción de recarga de Trampa de Cepo). A la derecha el medallón de Presa
//                  (gz_coto_presa) con su nombre, un aro con su VIDA y «ATRAPADA»; en los 3 últimos
//                  segundos el nombre se apaga y el medallón parpadea. BATIDA: «¡BATIDA!» y el aro del
//                  medallón con su tiempo. `world.ground` da la marca de suelo bajo cada Presa
//                  (gz_coto_marca_suelo, ADITIVO).
//   impulso        ROSA DE LOS VIENTOS: rosa de bronce (gz_impulso_rosa) con 5 plumas
//                  (gz_impulso_pluma) a 72°; cada 20 se llena una pluma (media en tramos
//                  parciales). Gira en movimiento (3 s · 1,6 s · 0,8 s por vuelta según el tramo) y se
//                  DETIENE quieta con «¡MUÉVETE!» (pasados 2 s quieta, pierde y lo dice). Vendaval: 0,4 s
//                  por vuelta, plumas blancas y el remolino (gz_impulso_vendaval) girando al revés.
//
// Formas y animaciones: CSS/SVG (solo transform/opacity, A8); el arte es la PIEL (R9) y, si no
// carga, queda la reserva CSS (.no-art). Todos los números de texto salen de gaugeTuning() (A4)
// (A4); los nodos citados son ids de TALENT_TREES (talents-arquera.js, hoja pura).
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
  const active = v?.state === 'active';                       // Calma Absoluta
  const rest = !active && num(x.lockT) > 0;                   // Respiro tras la Calma
  const kneeling = !!x.kneeling;
  const moving = !!x.moving && !active && !kneeling;
  const losing = moving && !!v?.decaying && value > 0;
  const locked = value >= max;
  const critPct = Math.round(value * C.critPerPoint * 100) / 100;
  const aimedReady = (v?.ready || []).includes('a_t_apuntado');
  let hint, sub;
  if (active) { hint = 'Todo tensado es perfecto'; sub = undefined; }       // núcleo: «Calma Absoluta · 3,2 s»
  else if (rest) { hint = 'Respiro: no sube'; sub = 'Respiro'; }
  else if (losing) { hint = `Moviéndote −${C.losePerSec}/s`; sub = 'Se pierde al moverte'; }
  else if (moving) { hint = 'Párate para apuntar'; sub = 'Moviéndote'; }
  else if (kneeling && x.moving) { hint = 'De rodillas no se pierde'; sub = 'De rodillas'; }
  else if (value > 0) { hint = `Quieta +${C.gainPerSec}/s`; sub = kneeling ? 'De rodillas' : 'Apuntando'; }
  else { hint = `Quieta +${C.gainPerSec}/s`; sub = 'Quédate quieta para apuntar'; }
  const rt = active ? ` · Calma Absoluta ${fmtS(v.t ?? 0)}` : rest ? ` · Respiro ${fmtS(x.lockT)}` : losing ? ' · moviéndote' : kneeling ? ' · de rodillas' : '';
  return {
    k: Math.round(k * 1000) / 1000,
    offset: Math.round((1 - k) * CONC_OPEN_PX * 10) / 10,     // px hacia fuera de cada esquinera
    locked, moving, losing, active, rest, kneeling, aimedReady,
    critPct, crit: `+${fmt1(critPct)} % crít`,
    hint, sub,
    eye: locked || active,
    num: String(Math.floor(value)),
    now: `${Math.floor(value)} / ${max} · +${fmt1(critPct)} % de crítico${rt}`,
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
    const txt = ctx.h('div', 'cz-txt', '<b class="cz-crit"></b><span class="cz-line"><span class="cz-hint"></span><span class="cz-mv">MOVIÉNDOTE</span><span class="cz-kn">DE RODILLAS</span></span>');
    const eye = ctx.h('span', 'cz-eye', '<i class="cz-eyef"></i>');
    const eyeArt = ctx.art('gz_conc_fijado', { cls: 'cz-eye-art', alt: 'Calma Absoluta' });
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
    ctx.toggle(ctx.el, 'cz-rest', m.rest);
    ctx.toggle(ctx.el, 'cz-kneel', m.kneeling && !m.active);
    ctx.setText(inst.crit, m.crit);
    ctx.setText(inst.hint, m.hint);
    return { num: m.num, sub: m.sub, now: m.now };
  },
};

// ============================================================
// 8 · COTO DE CAZA — cepos armados y medallón de Presa
// ============================================================
export function cotoModel(v, T = gaugeTuning()) {
  const C = T.coto, B = C.batida;
  const x = v?.x || {};
  const slotsMax = C.maxArmed;
  const max = clamp(Math.floor(num(v?.max) || C.maxArmed), 1, slotsMax);
  const n = clamp(Math.floor(num(v?.value)), 0, max);
  const chMax = Number.isFinite(x.trapChargesMax) ? x.trapChargesMax : C.trap.charges;
  const ch = Number.isFinite(x.trapCharges) ? clamp(x.trapCharges, 0, chMax) : chMax;
  const frac = clamp(num(x.trapCdFrac), 0, 1);
  const recharging = chMax > 0 && ch < chMax;
  const slots = [];
  for (let i = 0; i < slotsMax; i++) {
    let st = 'empty';
    if (i < n) st = 'armed';
    else if (i === n && recharging) st = 'cd';
    else if (i === n && ch > 0) st = 'ready';
    slots.push({ show: i < max, st, f: st === 'cd' ? Math.round(frac * 1000) / 1000 : 0 });
  }
  const batida = v?.state === 'active' && num(x.batidaT) > 0;
  const prey = v?.state === 'prey' || (batida && !!x.preyName);
  const t = Number.isFinite(v?.t) ? v.t : null;
  const hp = prey ? clamp(num(x.preyHpPct), 0, 100) : 0;
  const trapped = prey && (x.preyTrapped === true || num(x.preyTrapped) >= 0.5);
  const expiring = prey && !batida && t != null && t < EXPIRING_S;
  const name = prey ? (x.preyName || 'Presa') : 'sin Presa';
  const extra = num(x.preys) > 1 ? ` (+${num(x.preys) - 1})` : '';
  let sub;
  if (batida) sub = `¡Batida! +${B.pct} % de daño recibido`;
  else if (prey) sub = `Presa · ${name}${extra}${t != null ? ' · ' + fmtS(t) : ''}`;
  else if (n >= max) sub = 'Coto completo';
  else if (n > 0) sub = `${n} de ${max} ${plural(max, 'armada', 'armadas')}`;
  else sub = ch > 0 ? 'Arma Trampa de Cepo' : 'Trampa de Cepo en recarga';
  const wait = num(x.batidaIn);
  const info = batida ? `Batida ${fmtS(t ?? x.batidaT)}` : prey ? `Vida ${Math.round(hp)} %`
    : wait > 0 ? `Nueva Batida en ${fmtS(wait)}` : `Batida: ${B.n} estallidos en ${B.win} s`;
  return {
    n, max, slots, recharging, charges: ch, chargesMax: chMax, frac,
    prey, batida, name, hp: Math.round(hp) / 100, trapped, expiring, info,
    full: n >= max,
    num: `${n}/${max}`, sub,
    now: `${n}/${max} trampas armadas${batida ? ` · Batida ${fmtS(t ?? x.batidaT)}` : ''}${prey ? ` · Presa: ${name} (${Math.round(hp)} %)${!batida && t != null ? ' · ' + fmtS(t) : ''}${trapped ? ' · atrapada' : ''}` : ''}`,
  };
}

const COTO_SVG = '<svg class="ct-svg" viewBox="0 0 24 20" aria-hidden="true"><path d="M2 12h20M4 12l2-8 2 8 2-8 2 8 2-8 2 8 2-8 2 8M4 12c0 4 4 6 8 6s8-2 8-6"/></svg>';

const coto = {
  mount(body, ctx) {
    const T = ctx.T.coto;
    const traps = ctx.h('div', 'ct-traps');
    const slots = [];
    for (let i = 0; i < T.maxArmed; i++) {
      const s = ctx.h('div', 'ct-trap', `${COTO_SVG}<i class="ct-cd"></i>`);
      const empty = ctx.art('gz_coto_cepo_vacio', { cls: 'ct-empty-art' });
      const armed = ctx.art('gz_coto_cepo', { cls: 'ct-armed-art' });
      if (empty) s.insertBefore(empty, s.firstChild);
      if (armed) s.insertBefore(armed, s.querySelector('.ct-cd'));
      traps.appendChild(s);
      slots.push(s);
    }
    const prey = ctx.h('div', 'ct-prey', '<span class="ct-med"><i class="ct-hp"></i><i class="ct-medf">♞</i></span>' +
      '<span class="ct-pinfo"><b class="ct-pn"></b><span class="ct-pl"><span class="ct-info"></span><em class="ct-tag">ATRAPADA</em><em class="ct-bt">¡BATIDA!</em></span></span>');
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
    ctx.toggle(ctx.el, 'ct-batida', m.batida);
    ctx.toggle(ctx.el, 'ct-hasprey', m.prey);
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
  const losing = still && !!v?.decaying && value > 0;
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
  const line2 = active ? `+${I.galeProj} ${plural(I.galeProj, 'proyectil', 'proyectiles')} a Flecha Múltiple` : `+${I.perShot} por acierto en movimiento`;
  const sub = active ? undefined : losing ? `Quieta: −${I.idleRate}/s` : still ? (value > 0 ? 'Quieta: no ganas' : 'Muévete y dispara') : 'En movimiento';
  const ext = num(x.galeExt);
  return {
    feathers, lit, speed, spinning: moving || active, still, losing, active, line1, line2, sub, galeExt: ext,
    stop: losing ? `¡MUÉVETE! −${I.idleRate}/s` : '¡MUÉVETE!',
    num: String(Math.floor(value)),
    now: active ? `Vendaval · ${fmtS(v.t ?? 0)}${ext > 0 ? ` (+${fmt1(ext)} s de Vendaval Encadenado)` : ''}`
      : `${Math.floor(value)} / ${max} · ${lit} de ${FEATHERS} plumas · ${losing ? `quieta, −${I.idleRate}/s` : still ? 'quieta' : 'en movimiento'}`,
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
    return { fe, svgFe: [...spin.querySelectorAll('.im-svg .fe')], b: txt.querySelector('b'), s: txt.querySelector('span'), stop };
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
    ctx.toggle(ctx.el, 'im-losing', m.losing);
    ctx.setText(inst.stop, m.stop);
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
  const g = C.gainPerSec, l = C.losePerSec;
  const crit = v => Math.round(v * C.critPerPoint * 100) / 100;
  const v2 = 2 * g, v3 = v2 + C.perfectGain, v5 = v3 - 1.4 * l, v6 = v5 + 0.4 * g, v7 = v6 + C.max / 2;
  const tFull = 6.6 + (C.max - v7) / g;
  const tCalm = tFull + 0.2, tRest = tCalm + 2.6;
  return [
    { t: 0, value: 0, max: C.max, state: 'idle', decaying: false, label: '', t2: null, tMax: null, ready: null,
      x: { moving: true, kneeling: false, critPct: 0, calmT: 0, calmMax: C.calmT, lockT: 0, lockMax: C.calmLock },
      cap: 'Moviéndote no ganas Concentración: la retícula está abierta.', tag: 'idle', nodes: [] },
    { t: 1, state: 'building', x: { moving: false }, ease: 1, cap: `Quieta: +${g}/s; las esquineras se cierran.`, nodes: ['f0'] },
    { t: 3, value: v2, x: { critPct: crit(v2) }, cap: `Cada punto: +${fmtN(C.critPerPoint)} % de crítico.`, tag: 'building', nodes: ['f0'] },
    { t: 3.5, value: v3, fire: 'gain', x: { critPct: crit(v3) },
      cap: `Soltado perfecto de Disparo Apuntado o de un haz: +${C.perfectGain} (el del básico, +${C.basicPerfectGain}).`, nodes: ['f0'] },
    { t: 4, decaying: true, x: { moving: true }, ease: 1, cap: `Moverte la vacía: −${l}/s (la retícula tiembla y se abre).`, tag: 'decay', nodes: [] },
    { t: 5.4, value: v5, decaying: false, x: { kneeling: true, critPct: crit(v5) }, cap: 'De rodillas, moverte no la vacía.', nodes: ['f7'] },
    { t: 6.2, x: { moving: false, kneeling: false }, ease: 1 },
    { t: 6.6, value: v6 },
    { t: 6.61, value: v7, fire: 'gain', x: { critPct: crit(v7) }, ease: 1, cap: 'Ojo Inmóvil: matar a un élite llena media barra.', nodes: ['f28'] },
    { t: tFull, value: C.max, state: 'full', fire: 'full', ready: ['a_t_apuntado'], x: { critPct: crit(C.max) },
      cap: `A ${C.max}: Calma Absoluta.`, tag: 'full', nodes: ['f0'] },
    { t: tCalm, state: 'active', label: 'Calma Absoluta', t2: C.calmT, tMax: C.calmT, x: { calmT: C.calmT }, ease: 1,
      cap: `Calma Absoluta ${C.calmT} s: todo tensado desde media carga es perfecto y Disparo Apuntado y los haces se tensan ×${fmtN(C.calmChargeMul)}.`,
      tag: 'active', nodes: ['f14', 'f28'] },
    { t: tRest - 0.1, t2: C.calmT - (tRest - 0.1 - tCalm), x: { calmT: C.calmT - (tRest - 0.1 - tCalm) } },
    { t: tRest, value: 0, state: 'idle', label: 'Respiro', t2: C.calmLock, tMax: C.calmLock, ready: null, ease: 1,
      x: { calmT: 0, lockT: C.calmLock, critPct: 0 }, cap: `Al acabar vuelve a 0: Respiro de ${C.calmLock} s sin ganar.`, nodes: [] },
    { t: tRest + 1.2, t2: C.calmLock - 1.2, x: { lockT: C.calmLock - 1.2 } },
    { t: tRest + 1.5, end: 1 },
  ];
}

function cotoDemo(T) {
  const C = T.coto, B = C.batida;
  const cd = C.trap.cd, preyT = C.preyT, ch = C.trap.charges;
  return [
    { t: 0, value: 0, max: C.maxArmed, state: 'idle', label: '', t2: null, tMax: null,
      x: { trapCharges: ch, trapChargesMax: ch, trapCdFrac: 0, preyName: '', preyHpPct: 0, preyTrapped: false, preys: 0, batidaT: 0, batidaMax: B.dur, batidaIn: 0 },
      cap: `Coto de Caza: el valor son tus trampas armadas (máx. ${C.maxArmed}).`, tag: 'idle', nodes: [] },
    { t: 1, value: 1, state: 'building', fire: 'gain', x: { trapCharges: ch - 1, trapCdFrac: 0 }, ease: 1,
      cap: `Trampa de Cepo arma un cepo que atrae a los enemigos cercanos; cada carga vuelve en ${cd} s.`, nodes: ['m0', 'm1'] },
    { t: 3, x: { trapCdFrac: 2 / cd }, tag: 'building', ease: 1, cap: 'La carga se recarga en la primera ranura libre.', nodes: ['m1'] },
    { t: 3.6, value: 2, fire: 'gain', x: { trapCharges: 0, trapCdFrac: 2.6 / cd }, ease: 1 },
    { t: 4.4, value: C.maxArmed, state: 'full', fire: 'full', x: { trapCdFrac: 3.4 / cd },
      cap: `${C.maxArmed} cepos armados: coto completo (Coto Cerrado: con 2 o más haces más daño).`, tag: 'full', nodes: ['m16'] },
    { t: 5.5, state: 'prey', label: 'Presa', t2: preyT, tMax: preyT, x: { preyName: 'Bestia Alfa', preyHpPct: 100, preys: 1, trapCdFrac: 4.5 / cd }, ease: 1,
      cap: `El primer élite o jefe que golpeas es tu Presa (${preyT} s sin golpearla).`, tag: 'prey', nodes: ['m2', 'm9'] },
    { t: 6.8, value: 2, fire: 'spent', t2: preyT - 1.3, x: { preyTrapped: true, preyHpPct: 85, trapCdFrac: 5.8 / cd },
      cap: `La Presa pisa un cepo: inmovilizada ${C.trap.root} s.`, nodes: ['m5', 'm12'] },
    { t: 7.4, value: 0, fire: 'spent', state: 'active', label: 'Batida', t2: B.dur, tMax: B.dur, ease: 1,
      x: { batidaT: B.dur, batidaIn: B.icd, preyHpPct: 70, trapCdFrac: 6.4 / cd },
      cap: `Batida: ${B.n} estallidos en ${B.win} s y los alcanzados y tu Presa reciben +${B.pct} % de daño ${B.dur} s (una cada ${B.icd} s).`,
      tag: 'active', nodes: ['m0', 'm23', 'm28'] },
    { t: 10.4, t2: B.dur - 3, x: { batidaT: B.dur - 3, batidaIn: B.icd - 3, preyHpPct: 45, preyTrapped: false, trapCdFrac: 1 } },
    { t: 10.5, state: 'prey', label: 'Presa', t2: EXPIRING_S - 0.4, tMax: preyT, ease: 1, x: { batidaT: 0, batidaIn: B.icd - 3.1, preyHpPct: 40, trapCharges: 1, trapCdFrac: 0 },
      cap: `Los últimos ${EXPIRING_S} s de la Presa: el nombre se apaga y el medallón parpadea.`, tag: 'decay', nodes: [] },
    { t: 12.5, t2: 0.6, x: { batidaIn: B.icd - 5.1, preyHpPct: 34 } },
    { t: 12.9, end: 1 },
  ];
}

function impulsoDemo(T) {
  const I = T.impulso;
  const v1 = 36, v2 = v1 - I.idleRate, v3 = v2 + 16, ext = 1;
  return [
    { t: 0, value: 0, max: I.max, state: 'idle', decaying: false, label: '', t2: null, tMax: null, ready: null, x: { moving: false, still: 0, galeExt: 0 },
      cap: 'Quieta no ganas Impulso: la rosa está detenida.', tag: 'idle', nodes: [] },
    { t: 1, state: 'building', x: { moving: true }, ease: 1,
      cap: `+${I.perShot} por acierto en movimiento: la rosa gira y se llenan las plumas.`, nodes: ['v0'] },
    { t: 3, value: v1, tag: 'building', cap: 'Cuanto más Impulso, más rápido gira.', nodes: ['v0'] },
    { t: 3.4, x: { moving: false }, cap: `Si te detienes, la rosa se para; quieta más de ${I.idleAfter} s, pierde.`, nodes: [] },
    { t: 3.4 + I.idleAfter, decaying: true, ease: 1, cap: `Quieta más de ${I.idleAfter} s: −${I.idleRate} por segundo.`, tag: 'decay', nodes: [] },
    { t: 4.4 + I.idleAfter, value: v2, decaying: false, x: { moving: true } },
    { t: 4.6 + I.idleAfter, value: v3, fire: 'gain', ease: 1, cap: 'Salto Impulsivo: cada salto de Andanada da Impulso.', nodes: ['v12'] },
    { t: 8, value: I.max, state: 'active', label: 'Vendaval', t2: I.galeT, tMax: I.galeT, ease: 1, fire: 'full', ready: ['flecha_multiple'],
      cap: `A ${I.max}: Vendaval ${I.galeT} s, +${I.galeAspd} % de velocidad de ataque y +${I.galeProj} proyectil a Flecha Múltiple.`, tag: 'active', nodes: ['v0', 'v2'] },
    { t: 9.5, t2: I.galeT - 1.5 },
    { t: 9.6, t2: I.galeT - 1.6 + ext, tMax: I.galeT + ext, x: { galeExt: ext }, ease: 1,
      cap: 'Vendaval Encadenado: cada relanzamiento de Andanada lo alarga.', nodes: ['v19'] },
    { t: 12.4, t2: I.galeT - 4.4 + ext },
    { t: 12.5, value: 0, state: 'idle', label: '', t2: null, tMax: null, ready: null, x: { moving: true, galeExt: 0 }, cap: 'Termina el Vendaval: vuelta a empezar.', nodes: [] },
    { t: 13, end: 1 },
  ];
}

// ============================================================
// explicación (tooltip y panel de talentos): SOLO números de T
// ============================================================
function concentracionExplain(T) {
  const C = T.concentracion;
  const g = C.gainPerSec, l = C.losePerSec, cpp = fmtN(C.critPerPoint), top = fmtN(C.critPerPoint * C.max), mul = fmtN(C.calmChargeMul);
  return {
    text: `Quieta ganas <b>Concentración</b> (+${g}/s) y moviéndote la pierdes (−${l}/s; de rodillas, no). Cada punto da +${cpp} % de crítico (+${top} % a ${C.max}). A ${C.max}: <b>Calma Absoluta</b> ${C.calmT} s.`,
    cols: [
      ['Generar', `Quieta: +${g}/s · soltado perfecto de Disparo Apuntado o de un haz: +${C.perfectGain} (del básico, +${C.basicPerfectGain}; uno por segundo)`],
      ['Descargar', `A ${C.max}: Calma Absoluta ${C.calmT} s: todo tensado desde media carga es perfecto y Apuntado y los haces se tensan ×${mul}`],
      ['Pérdida', `Moverte: −${l}/s (de rodillas, nada) · tras la Calma vuelve a 0 y Respiro de ${C.calmLock} s sin ganar`],
    ],
    tip: [
      `<b>Qué es:</b> tu puntería. La retícula se cierra mientras estás quieta; cada punto da +${cpp} % de crítico (+${top} % a ${C.max}).`,
      `<b>Gana:</b> +${g}/s quieta y +${C.perfectGain} por soltado perfecto (+${C.basicPerfectGain} el del básico). <b>Pierde:</b> −${l}/s al moverte (MOVIÉNDOTE), salvo de rodillas.`,
      `<b>Descarga:</b> a ${C.max}, Calma Absoluta ${C.calmT} s: todo tensado desde media carga es perfecto. Después, a 0 y Respiro de ${C.calmLock} s.`,
    ],
  };
}

function cotoExplain(T) {
  const C = T.coto, tr = C.trap, B = C.batida;
  const cargas = `${tr.charges} ${plural(tr.charges, 'carga', 'cargas')}`;
  return {
    text: `El valor son tus <b>trampas armadas</b> (máx. ${C.maxArmed}). El primer élite o jefe que golpeas es tu <b>Presa</b> (${C.preyT} s sin golpearla). Si estallan ${B.n} trampas en ${B.win} s: <b>Batida</b>.`,
    cols: [
      ['Generar', `Trampa de Cepo: ${cargas}, ${tr.cd} s por carga; tus trampas atraen a los enemigos cercanos`],
      ['Descargar', `Batida: los alcanzados y tu Presa reciben +${B.pct} % de daño ${B.dur} s (una cada ${B.icd} s)`],
      ['Ventana', `Presa: ${C.preyT} s sin golpearla · un cepo pisado inmoviliza ${tr.root} s`],
    ],
    tip: [
      `<b>Qué es:</b> tus cepos armados en el suelo (máx. ${C.maxArmed}) y tu Presa.`,
      `<b>Gana:</b> Trampa de Cepo arma uno (${cargas}, ${tr.cd} s por carga). <b>Presa:</b> el primer élite o jefe que golpeas; se pierde a los ${C.preyT} s sin golpearla.`,
      `<b>Descarga:</b> si estallan ${B.n} trampas en ${B.win} s, Batida: +${B.pct} % de daño recibido ${B.dur} s a los alcanzados y a tu Presa.`,
    ],
  };
}

function impulsoExplain(T) {
  const I = T.impulso;
  const proj = `+${I.galeProj} ${plural(I.galeProj, 'proyectil', 'proyectiles')}`;
  return {
    text: `Cada acierto <b>en movimiento</b> suma ${I.perShot} de Impulso; quieta más de ${I.idleAfter} s pierdes ${I.idleRate} por segundo. A ${I.max}: <b>Vendaval</b> ${I.galeT} s, +${I.galeAspd} % de velocidad de ataque y ${proj} a Flecha Múltiple.`,
    cols: [
      ['Generar', `+${I.perShot} por acierto en movimiento (uno cada ${fmtN(I.shotGap)} s) · quieta no ganas`],
      ['Descargar', `Automática a ${I.max}: Vendaval ${I.galeT} s`],
      ['Pérdida', `Quieta más de ${I.idleAfter} s: −${I.idleRate}/s · al acabar el Vendaval vuelve a 0`],
    ],
    tip: [
      `<b>Qué es:</b> tu inercia de tiradora: la rosa de los vientos gira mientras corres y disparas.`,
      `<b>Gana:</b> +${I.perShot} por acierto en movimiento. <b>Pierde:</b> quieta más de ${I.idleAfter} s, −${I.idleRate}/s (¡MUÉVETE!).`,
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
    f0: `Mira Serena: quieta +${C.gainPerSec}/s y cada soltado perfecto +${C.perfectGain}; a ${C.max}, Calma Absoluta.`,
    f7: 'Guardia Larga: más tiempo de rodillas, donde moverte no la vacía.',
    f11: 'Fila Rota: cada enemigo que mata Disparo Apuntado te devuelve Concentración.',
    f14: 'Estrella Fija: en la Calma Absoluta, cada perfecto de Disparo Apuntado recarga Tiro Celestial.',
    f16: 'Serenidad: con 50 o más, Disparo Apuntado y los haces se tensan más rápido y pegan más.',
    f28: `Ojo Inmóvil: la Calma dura ${C.calmLong} s, los élites llenan media barra y la Calma salta antes.`,
  };
}
function cotoNodes(T) {
  const C = T.coto, B = C.batida;
  return {
    m0: `Coto de Caza: cada trampa armada suma 1 (hasta ${C.maxArmed}); con ${B.n} estallidos en ${B.win} s, Batida.`,
    m1: 'Muelles Ligeros: Trampa de Cepo recupera sus cargas antes.',
    m2: 'Olfato de Presa: más daño a tu Presa.',
    m5: 'Presa Atrapada: la trampa que atrapa a tu Presa estalla y te devuelve una carga.',
    m9: 'Presas en Manada o Presa Herida: más Presas, o una que recibe más daño de todo el grupo.',
    m12: 'Acoso: cada trampa que pisa tu Presa le llena Quebranto.',
    m16: 'Coto Cerrado: con 2 o más trampas armadas haces más daño.',
    m23: 'Batida Mayor: la Batida dura más y llena Quebranto a tu Presa.',
    m28: 'Corazón del Bosque: tus trampas ralentizan y la Batida salta con 2 trampas.',
  };
}
function impulsoNodes(T) {
  const I = T.impulso;
  return {
    v0: `Impulso: +${I.perShot} por acierto en movimiento; a ${I.max}, Vendaval.`,
    v2: 'Vendaval Largo: el Vendaval dura más.',
    v12: 'Salto Impulsivo: cada salto de Andanada da Impulso.',
    v15: 'Piel de Brisa: durante el Vendaval recibes menos daño.',
    v16: 'Viento en las Plumas: con 50 o más, Múltiple y Andanada pegan más.',
    v19: 'Vendaval Encadenado: cada relanzamiento de Andanada alarga el Vendaval.',
    v23: 'Golpe de Apertura: al empezar el Vendaval, tus siguientes Andanadas o Múltiples son críticas.',
    v28: 'Ojo del Huracán: el Vendaval te acelera, salta antes y recarga el Diluvio.',
  };
}

// marca de suelo bajo cada Presa (puro: lee el estado del indicador sin crearlo)
function cotoGround(e, p) {
  const st = p?.gauges?.coto;
  if (!e || !st || e.alive === false) return null;
  const q = (st.preys || []).find(x => x.e === e && x.t > 0) || (st.prey === e && st.preyT > 0 ? { t: st.preyT } : null);
  if (!q) return null;
  const T = gaugeTuning().coto;
  const t = q.t, tMax = T.preyT;
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
