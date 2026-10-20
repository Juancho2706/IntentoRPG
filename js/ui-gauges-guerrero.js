// ============================================================
// BARRAS DE MECÁNICA · Guerrero · Sed (Berserker), Bastión (Guardián), Fervor (Cruzado) (Paso 2d.2 · E1)
// ============================================================
// docs/paso2d2-hud-pc.md §3.1–§3.3 y el mockup docs/mockups/hud-pc.html. Contrato de
// defineGaugeView (js/ui-gauges.js): { mount, update, model, demo, explain, nodes, sounds }.
//
//   sed      dos venas de carne y hierro que desembocan en un corazón central. La sangre
//            avanza por las dos venas desde los extremos hacia el corazón (máscara SVG con
//            stroke-dashoffset: la piel pintada gz_sed_venas pasa de apagada a viva); el
//            corazón se hincha (scale), late con vida baja y en Sed Saciada se desborda
//            (gz_sed_saciada) y gotea. Al drenarse fuera de combate la sangre se retira de los
//            extremos hacia el corazón. Desenfreno (s14) vuelve ámbar las venas.
//   bastion  muralla de 5 escudos de cometa (gz_bastion_escudo / _vacio). Cada bloqueo encaja
//            un escudo de golpe; la carga que se perderá se agrieta (gz_bastion_grieta, opacidad
//            = 1 − decayIn/decayEvery) y tiembla al final; Muro de Escudos junta los escudos
//            (translateX) en un muro con una onda de luz y el icono gz_bastion_muro.
//   fervor   arco de halo (gz_fervor_halo) con 3 soles (gz_fervor_sol) en sus engarces:
//            izquierda, derecha y corona. A 3 giran los rayos (gz_fervor_rayos, aditivo por
//            máscara de luminancia) tras la corona; en Ascensión se abren las alas
//            (gz_fervor_ascension). 3 cuentas marcan los impactos de Martillo.
//
// R9: la forma y la animación son CSS/SVG; el arte pintado es la piel. Si un asset no carga
// (o ?art=0) la raíz gana `.no-art` y queda la forma del mockup (css/gauges-guerrero.css).
// A8: solo transform/opacity (más la transición de stroke-dashoffset de las venas).
// Nivel superior PURO (sin document/window): solo datos y funciones.
import { gaugeTuning } from './spec-mechanics.js';

// ------------------------------------------------------------
// utilidades puras
// ------------------------------------------------------------
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r3 = n => Math.round(n * 1000) / 1000;
const es = n => String(n).replace('.', ',');                             // 0.15 → '0,15'
const fmtS = t => `${(Math.round(t * 10) / 10).toFixed(1).replace('.', ',')} s`;
const NB = ' ';                                                       // espacio fino antes de «%»
let UID = 0;                                                               // ids únicos de <defs> SVG por widget

// T de módulo: solo para los textos fijos (nodes, cap de la demo). explain(T) usa SU T.
const TT = gaugeTuning();

// ============================================================
// 1 · SED (Berserker)
// ============================================================
// Geometría de las venas en coordenadas de gz_sed_venas (1040×244, a 2×): la línea media
// del canal de sangre, medida sobre el arte (mediana de los píxeles de sangre por columna).
// La izquierda va del extremo al corazón; la derecha es su espejo. El viewBox recorta los
// márgenes verticales (espinas) para que la figura llene los 56 px del cuerpo.
const SED_VB = '0 30 1040 184';
const SED_EMPTY = 101;
const SED_L = 'M30 123C66 115 100 141 140 139C176 137 200 112 240 106C276 100 302 117 330 134C356 148 388 126 434 108';
const SED_R = 'M1010 123C974 115 940 141 900 139C864 137 840 112 800 106C764 100 738 117 710 134C684 148 652 126 606 108';
const HEART_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-8-5.4-8-11a4.6 4.6 0 0 1 8-3 4.6 4.6 0 0 1 8 3c0 5.6-8 11-8 11z"/></svg>';

function sedModel(v, T = TT) {
  const S = T.sed, x = v?.x || {};
  const max = v?.max > 0 ? v.max : S.max;
  const val = clamp(+v?.value || 0, 0, max);
  const sated = v?.state === 'active';
  const decaying = !!v?.decaying && !sated;
  const frenzyT = +x.frenzyT || 0, frenzy = frenzyT > 0;
  const k = sated ? 1 : val / max;
  // pulso por tramos (<34 · <67 · ≥67); se para al drenarse y en Sed Saciada (late el corazón)
  const tier = sated || decaying || k <= 0 ? 0 : k < 0.34 ? 1 : k < 0.67 ? 2 : 3;
  // stroke-dasharray «100 200» sobre pathLength=100 (periodo 300; el hueco tapa todo el trazo):
  //   building: la sangre nace en los EXTREMOS y avanza hacia el corazón → offset 100 − 100·k;
  //   decay: se retira de los extremos hacia el corazón (anclada al final) → offset 200 + 100·k;
  //   vacío: 101 (ni un punto de remate redondo en los extremos).
  const dash = k <= 0 ? SED_EMPTY : r3(decaying ? 200 + 100 * k : 100 - 100 * k);
  let sub;
  if (sated) sub = `Sed Saciada${v.t != null ? ' · ' + fmtS(v.t) : ''}${frenzy ? ' · Desenfreno' : ''}`;
  else if (frenzy) sub = `Desenfreno · ${fmtS(frenzyT)}`;
  else if (decaying) sub = `se drena: −${S.decayRate}/s`;
  else if (x.low && k > 0) sub = `vida baja: +${S.satedDmgPct}${NB}% de daño`;
  else if (k <= 0) sub = 'pierde vida o desangra para llenarla';
  else sub = '';
  return {
    k: r3(k), dash, anchor: decaying ? 'heart' : 'ends', hs: r3(0.78 + 0.3 * k), tier,
    lit: k > 0, low: !!x.low && !sated, frenzy, sated, drip: sated, decaying,
    num: String(Math.floor(val)), sub,
  };
}

const SED = {
  mount(body, ctx) {
    const id = `gzsed${++UID}`;
    const venas = ctx.asset('gz_sed_venas'), sangre = ctx.asset('gz_sed_sangre');
    const paths = [SED_L, SED_R];
    const root = ctx.h('div', 'sd');
    root.innerHTML =
      `<svg class="sd-veins" viewBox="${SED_VB}" preserveAspectRatio="none" aria-hidden="true"><defs>` +
        `<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff6a4f"/><stop offset=".55" stop-color="#b3180e"/><stop offset="1" stop-color="#5e0904"/></linearGradient>` +
        (sangre ? `<pattern id="${id}p" patternUnits="userSpaceOnUse" width="384" height="128"><image href="${sangre}" width="384" height="128" preserveAspectRatio="none"/></pattern>` : '') +
        (venas ? `<mask id="${id}m" maskUnits="userSpaceOnUse" x="0" y="0" width="1040" height="244">${paths.map(d => `<path class="sd-m" pathLength="100" d="${d}"/>`).join('')}</mask>` +
          // la piel como patrón de un rect del tamaño del viewBox (el recorte de las espinas no se sale de la caja)
          `<pattern id="${id}v" patternUnits="userSpaceOnUse" x="0" y="0" width="1040" height="244"><image href="${venas}" width="1040" height="244" preserveAspectRatio="none"/></pattern>` : '') +
      '</defs>' +
      // reserva CSS (forma del mockup) sobre la misma línea media que el arte
      `<g class="sd-css">${paths.map(d => `<path class="vb" d="${d}"/><path class="vi" d="${d}"/><path class="vf" pathLength="100" stroke="url(#${id}g)" d="${d}"/>`).join('')}</g>` +
      // piel pintada: apagada debajo, viva enmascarada por el trazo de la sangre
      (venas ? `<g class="sd-art"><rect class="sd-dim" x="0" y="30" width="1040" height="184" fill="url(#${id}v)"/>` +
        `<rect class="sd-live" x="0" y="30" width="1040" height="184" fill="url(#${id}v)" mask="url(#${id}m)"/>` +
        (sangre ? paths.map(d => `<path class="vt" pathLength="100" stroke="url(#${id}p)" d="${d}"/>`).join('') : '') + '</g>' : '') +
      paths.map(d => `<path class="vp" pathLength="100" d="${d}"/>`).join('') +
      '</svg>' +
      `<div class="sd-heart"><i class="sd-glow"></i><div class="sd-hw"><div class="sd-hb">${HEART_SVG}</div></div></div>` +
      '<i class="sd-drip d1"></i><i class="sd-drip d2"></i><i class="sd-drip d3"></i>';
    body.appendChild(root);
    const heart = root.querySelector('.sd-heart'), hw = root.querySelector('.sd-hw');
    // piel del corazón (y del desborde): <img> con reserva CSS; laten con .sd-hw
    const hImg = ctx.art('gz_sed_corazon', { cls: 'sd-himg' });
    if (hImg) hw.appendChild(hImg);
    const sImg = ctx.art('gz_sed_saciada', { cls: 'sd-simg' });
    if (sImg) hw.appendChild(sImg);
    // precarga oculta: da `.art-gz_sed_venas` / `.art-gz_sed_sangre` a la raíz (la CSS cambia la reserva por la piel)
    for (const n of ['gz_sed_venas', 'gz_sed_sangre']) { const im = ctx.art(n, { cls: 'gz-pre' }); if (im) root.appendChild(im); }
    return { root, heart, dash: [...root.querySelectorAll('.vf, .vp, .vt, .sd-m')] };
  },
  update(inst, v, prev, ctx) {
    const m = sedModel(v, ctx.T);
    for (const p of inst.dash) ctx.setStyle(p, 'strokeDashoffset', String(m.dash));
    ctx.setStyle(inst.heart, '--hs', String(m.hs));
    const el = ctx.el;
    for (const b of [1, 2, 3]) ctx.toggle(el, 'b' + b, m.tier === b);
    ctx.toggle(el, 'lit', m.lit);
    ctx.toggle(el, 'low', m.low);
    ctx.toggle(el, 'frenzy', m.frenzy);
    ctx.toggle(el, 'sated', m.sated);
    ctx.toggle(el, 'drain', m.decaying);
    return { num: m.num, sub: m.sub, now: [`${m.num} / ${v.max || ctx.T.sed.max}`, m.sub].filter(Boolean).join(' · ') };
  },
  model: sedModel,
  demo: [
    { t: 0, value: 0, state: 'idle', x: { low: 0, frenzyT: 0, frenzyMax: 0 }, cap: 'Fuera de combate la Sed está vacía.', tag: 'idle', nodes: [] },
    { t: 0.8, value: 0, state: 'building', ease: 1, cap: `Recibes golpes: +${TT.sed.perHpPct} de Sed por cada 1${NB}% de vida perdida.`, nodes: ['s0'] },
    { t: 2.6, value: 42, x: { low: 1 }, ease: 1, cap: `Con menos del ${TT.sed.lowHpPct}${NB}% de vida el corazón se enciende: +${TT.sed.satedDmgPct}${NB}% de daño.`, nodes: ['s0'], tag: 'building' },
    { t: 3.6, value: 55, x: { low: 0 }, decaying: true, decayIn: 0, ease: 1, cap: `Tras ${TT.sed.decayAfter} s fuera de combate se drena: −${TT.sed.decayRate}/s.`, nodes: [], tag: 'decay' },
    { t: 5.2, value: 42, decaying: false, decayIn: TT.sed.decayAfter, ease: 1, cap: `Remolino Sediento: +${TT.sed.remolino.perHit} por golpe del giro (máx. ${TT.sed.remolino.max} por uso).`, nodes: ['s4'] },
    { t: 6.4, value: 84, ease: 1, cap: 'Temeridad: la Sed se llena el doble de rápido.', nodes: ['s9'] },
    { t: 7.2, value: 100, state: 'active', label: 'Sed Saciada', t2: TT.sed.satedT, tMax: TT.sed.satedT, decayIn: null, fire: 'full', ease: 1,
      x: { frenzyT: TT.sed.frenzy.t, frenzyMax: TT.sed.frenzy.t },
      cap: `¡Sed Saciada! ${TT.sed.satedT} s de +${TT.sed.satedDmgPct}${NB}% de daño; con Sangre Hirviente, Desenfreno ${TT.sed.frenzy.t} s.`, nodes: ['s0', 's14'], tag: 'active' },
    { t: 12.4, t2: TT.sed.satedT - 5.2, x: { frenzyT: TT.sed.frenzy.t - 5.2 } },
    { t: 12.6, value: 0, state: 'idle', label: '', t2: null, x: { frenzyT: 0, frenzyMax: 0 }, fire: 'empty', cap: 'Al terminar vuelve a 0.', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const S = T.sed;
    return {
      text: `Perder vida y desangrar enemigos llena tu <b>Sed</b>. A ${S.max}: <b>Sed Saciada</b> ${S.satedT} s (+${S.satedDmgPct} % de daño aunque tengas la vida alta) y vuelve a 0.`,
      cols: [
        ['Generar', `+${S.perHpPct} por cada 1 % de vida perdida · +${S.perBleedTick} por tic de Sangrado (máx. ${S.bleedPerSec}/s)`],
        ['Descargar', `Automática a ${S.max}: Sed Saciada ${S.satedT} s`],
        ['Pérdida', `−${S.decayRate}/s tras ${S.decayAfter} s fuera de combate`],
      ],
      tip: [
        `<b>Qué es:</b> con menos del ${S.lowHpPct} % de vida o con la Sed Saciada haces +${S.satedDmgPct} % de daño.`,
        `<b>Gana:</b> +${S.perHpPct} por cada 1 % de vida perdida y +${S.perBleedTick} por tic de Sangrado (máx. ${S.bleedPerSec}/s).`,
        `<b>Descarga:</b> a ${S.max}, Sed Saciada ${S.satedT} s. Pierde −${S.decayRate}/s tras ${S.decayAfter} s fuera de combate.`,
      ],
    };
  },
  nodes: {
    s0: `Sed de Batalla (clave): la Sed existe; con menos del ${TT.sed.lowHpPct} % de vida o con la Sed Saciada, +${TT.sed.satedDmgPct} % de daño.`,
    s4: `Remolino Sediento: cada golpe de Remolino Sangriento suma ${TT.sed.remolino.perHit} de Sed (máx. ${TT.sed.remolino.max} por uso).`,
    s5: 'Instinto Asesino: cada crítico suma Sed.',
    s9: 'Temeridad: mientras dura, la Sed se llena el doble de rápido.',
    s13: 'Negación de la Muerte: un golpe letal te deja con la Sed llena.',
    s14: `Sangre Hirviente: con la Sed llena entras en Desenfreno ${TT.sed.frenzy.t} s (+${TT.sed.frenzy.aspdPct} % de velocidad de ataque).`,
    x2: 'Carnicero: cada remate suma Sed.',
    x3: 'Matanza Eterna: rematar durante el Desenfreno lo alarga.',
  },
  sounds: { full: 'hurt' },
};

// ============================================================
// 2 · BASTIÓN (Guardián)
// ============================================================
const SHIELD_SVG = id => `<svg viewBox="0 0 20 24" aria-hidden="true"><path fill="url(#${id})" d="M10 1.2 18.8 4.2v7.2c0 5.8-3.8 9.6-8.8 11.4C5 21 1.2 17.2 1.2 11.4V4.2z"/></svg>`;
const BS_SLOTS = 5;

function bastionModel(v, T = TT) {
  const B = T.bastion, x = v?.x || {};
  const max = v?.max > 0 ? v.max : B.max;
  const n = clamp(Math.floor(+v?.value || 0), 0, max);
  const wall = v?.state === 'active' || (+x.wallT || 0) > 0;
  const every = +x.decayEvery || B.decayEvery;
  const dr = Math.round(+x.wallDr || 0);
  const drPct = Math.round(+x.drPct || 0);
  const loses = !wall && n > 0 && v?.decayIn != null;                     // la carga que se perderá a continuación
  const crack = loses ? r3(clamp(1 - v.decayIn / every, 0, 1)) : 0;
  const crackIdx = loses ? n - 1 : -1;
  const slots = Math.max(BS_SLOTS, max);
  const lit = Array.from({ length: slots }, (_, i) => wall || i < n);
  let text;
  if (wall) text = `−${dr}${NB}% de daño`;
  else if (n <= 0) text = 'Bloquea para ganar cargas';
  else if (drPct > 0) text = `−${drPct}${NB}% de daño (Muralla)`;
  else text = `Muro: −${Math.min(n * B.wall.drPerCharge, B.wall.drMax)}${NB}%`;
  let sub;
  if (wall) sub = `Muro de Escudos${v.t != null ? ' · ' + fmtS(v.t) : ''}`;
  else if (crack >= 0.5) sub = `se agrieta: pierdes una en ${fmtS(v.decayIn)}`;
  else if (n >= max) sub = 'muralla completa';
  else if (n <= 0) sub = 'bloquea golpes con escudo';
  else sub = '';
  return { n, max, wall, dr, drPct, crack, crackIdx, tremble: crack >= 0.75, lit, text, sub,
    num: wall ? `−${dr}${NB}%` : `${n}/${max}` };
}

const BASTION = {
  mount(body, ctx) {
    const id = `gzbs${++UID}`;
    const row = ctx.h('div', 'bs-row');
    row.innerHTML = `<svg class="gz-defs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      '<stop offset="0" stop-color="#cfe3ff"/><stop offset=".5" stop-color="#7fb0e8"/><stop offset="1" stop-color="#2b4566"/></linearGradient></defs></svg>' +
      '<i class="bs-wave"></i>';
    const shs = [];
    for (let i = 0; i < BS_SLOTS; i++) {
      const sh = ctx.h('div', 'sh', `<div class="sh-in"><div class="sh-css">${SHIELD_SVG(id)}</div><i class="sh-crk"></i></div>`);
      sh.style.setProperty('--i', String(i));
      const inn = sh.firstChild;
      for (const [name, cls] of [['gz_bastion_escudo_vacio', 'sh-empty'], ['gz_bastion_escudo', 'sh-on'], ['gz_bastion_grieta', 'sh-grieta']]) {
        const img = ctx.art(name, { cls });
        if (img) inn.insertBefore(img, inn.querySelector('.sh-crk'));
      }
      row.appendChild(sh);
      shs.push({ el: sh, inn, crk: [inn.querySelector('.sh-crk'), inn.querySelector('.sh-grieta')].filter(Boolean), slam: 0 });
    }
    const side = ctx.h('div', 'bs-side');
    const muro = ctx.art('gz_bastion_muro', { cls: 'bs-muro' });
    if (muro) side.appendChild(muro);
    const txt = ctx.h('span', 'bs-dr');
    side.appendChild(txt);
    body.appendChild(row);
    body.appendChild(side);
    return { shs, txt };
  },
  update(inst, v, prev, ctx) {
    const m = bastionModel(v, ctx.T);
    const pn = prev ? bastionModel(prev, ctx.T) : null;
    const gained = !!prev && (v.seq?.gain || 0) > (prev.seq?.gain || 0);
    inst.shs.forEach((s, i) => {
      ctx.toggle(s.el, 'on', !!m.lit[i]);
      // encaje de golpe: alterna dos animaciones idénticas para reiniciarla sin leer layout
      if (pn && !m.wall && i < m.n && i >= pn.n && (gained || m.n > pn.n)) {
        s.slam = s.slam === 1 ? 2 : 1;
        ctx.toggle(s.inn, 'in-a', s.slam === 1);
        ctx.toggle(s.inn, 'in-b', s.slam === 2);
      }
      // escudo que se pierde (la grieta se cumplió): cae y se apaga (la clase dura hasta que se vuelve a encender)
      if (m.lit[i]) ctx.toggle(s.el, 'lost', false);
      else if (pn && !pn.wall && i >= m.n && i < pn.n) ctx.toggle(s.el, 'lost', true);
      const c = i === m.crackIdx ? m.crack : 0;
      for (const ce of s.crk) ctx.setStyle(ce, 'opacity', c ? String(c) : '0');
      ctx.toggle(s.el, 'trem', i === m.crackIdx && m.tremble);
    });
    ctx.toggle(ctx.el, 'wall', m.wall);
    ctx.toggle(ctx.el, 'crit', m.tremble);
    ctx.setText(inst.txt, m.text);
    return { num: m.num, sub: m.sub, now: [`${m.n}/${m.max}`, m.text, m.sub].filter(Boolean).join(' · ') };
  },
  model: bastionModel,
  demo: [
    { t: 0, value: 0, state: 'idle', decayIn: null, x: { drPct: 0, wallT: 0, wallMax: 0, wallDr: 0, decayEvery: TT.bastion.decayEvery }, cap: 'Sin cargas de Bastión.', tag: 'idle', nodes: [] },
    { t: 1, value: 1, state: 'building', decayIn: TT.bastion.decayEvery, fire: 'gain', cap: `Bloqueas un golpe: +${TT.bastion.perBlock} carga (${TT.bastion.blockPct}${NB}% de bloqueo innato con escudo).`, nodes: ['s0'] },
    { t: 2, value: 2, fire: 'gain', decayIn: TT.bastion.decayEvery, cap: 'Otro bloqueo: el escudo encaja de golpe.', nodes: ['s0'], tag: 'building' },
    { t: 3, value: 4, fire: 'gain', decayIn: TT.bastion.decayEvery, cap: `Grito Desafiante con Desafío Firme: +${TT.bastion.shout} cargas.`, nodes: ['s4'] },
    { t: 4, value: 5, state: 'full', fire: 'full', decayIn: TT.bastion.decayEvery, ease: 1, x: { drPct: TT.bastion.murallaPerRank * 5 },
      cap: `Muralla completa. Con Muralla Viviente, −${TT.bastion.murallaPerRank}${NB}% de daño recibido por carga.`, nodes: ['s17'], tag: 'full' },
    { t: 7, decayIn: 0.6, cap: `Sin ganar cargas en ${TT.bastion.decayEvery} s se pierde una: la grieta avisa.`, nodes: [], tag: 'decay' },
    { t: 7.6, value: 4, state: 'building', decayIn: TT.bastion.decayEvery, x: { drPct: TT.bastion.murallaPerRank * 4 }, cap: 'Se pierde una carga.', nodes: [] },
    { t: 8.6, value: 0, state: 'active', label: 'Muro de Escudos', t2: TT.bastion.wall.t, tMax: TT.bastion.wall.t, decayIn: null, fire: 'spent', ease: 1,
      x: { drPct: 0, wallT: TT.bastion.wall.t, wallMax: TT.bastion.wall.t, wallDr: 4 * TT.bastion.wall.drPerCharge },
      cap: `Muro de Escudos gasta las 4: −${4 * TT.bastion.wall.drPerCharge}${NB}% de daño recibido ${TT.bastion.wall.t} s.`, nodes: ['s9'], tag: 'active' },
    { t: 12.4, t2: TT.bastion.wall.t - 3.8, x: { wallT: TT.bastion.wall.t - 3.8 }, cap: 'Al terminar, Venganza Acumulada devuelve el daño absorbido.', nodes: ['x2'] },
    { t: 12.6, value: 0, state: 'idle', label: '', t2: null, x: { wallT: 0, wallMax: 0, wallDr: 0 }, cap: '', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const B = T.bastion;
    return {
      text: `Cada bloqueo te da una carga de <b>Bastión</b> (máx. ${B.max}). <b>Muro de Escudos</b> las gasta todas: −${B.wall.drPerCharge} % de daño recibido por carga durante ${B.wall.t} s (máx. −${B.wall.drMax} %).`,
      cols: [
        ['Generar', `Bloqueo +${B.perBlock} (${B.blockPct} % de bloqueo innato con escudo) · Grito Desafiante +${B.shout} (Desafío Firme)`],
        ['Descargar', `Muro de Escudos: −${B.wall.drPerCharge} % por carga, ${B.wall.t} s`],
        ['Pérdida', `Una carga cada ${B.decayEvery} s sin ganar ninguna (la grieta avisa)`],
      ],
      tip: [
        `<b>Qué es:</b> una muralla de ${B.max} escudos; con Muralla Viviente cada carga te da −${B.murallaPerRank} % de daño recibido por rango.`,
        `<b>Gana:</b> bloqueo +${B.perBlock} (${B.blockPct} % de bloqueo innato con escudo); Grito Desafiante +${B.shout} con Desafío Firme.`,
        `<b>Descarga:</b> Muro de Escudos, −${B.wall.drPerCharge} % por carga durante ${B.wall.t} s. Pierdes una carga cada ${B.decayEvery} s sin ganar.`,
      ],
    };
  },
  nodes: {
    s0: `Muro Inquebrantable (clave): cada bloqueo te da ${TT.bastion.perBlock} carga de Bastión (${TT.bastion.blockPct} % de bloqueo innato con escudo).`,
    s4: `Desafío Firme: Grito Desafiante te da ${TT.bastion.shout} cargas.`,
    s7: 'Martillo Pesado: un Martillo de Guerra que golpea a un grupo suma una carga.',
    s9: `Muro de Escudos: gasta las cargas, −${TT.bastion.wall.drPerCharge} % de daño recibido por carga durante ${TT.bastion.wall.t} s.`,
    s17: `Muralla Viviente: cada carga te da −${TT.bastion.murallaPerRank} % de daño recibido por rango.`,
    x1: 'Represalia: tus espinas reflejan también el daño que absorbe el Muro.',
    x2: 'Venganza Acumulada: al terminar el Muro, una onda devuelve el daño absorbido.',
    x3: `Bastión Eterno: con ${TT.bastion.max} cargas, Muro Inquebrantable protege también a los aliados.`,
  },
  sounds: { full: 'equip', spent: 'hit' },
};

// ============================================================
// 3 · FERVOR (Cruzado)
// ============================================================
// engarces del arte gz_fervor_halo (1040×373): extremo izquierdo, extremo derecho y corona.
// El orden de encendido es izquierda → derecha → corona (el 3.º corona el halo: Veredicto).
const FV_JEWELS = ['j0', 'j1', 'j2'];

function fervorModel(v, T = TT) {
  const F = T.fervor, x = v?.x || {};
  const max = v?.max > 0 ? v.max : F.max;
  const n = clamp(Math.floor(+v?.value || 0), 0, max);
  const asc = v?.state === 'active' || (+x.ascT || 0) > 0;
  const need = +x.hammerNeed || F.hammerHits;
  const hits = clamp(Math.floor(+x.hammerHits || 0), 0, need);
  const cost = F.verdict.cost;
  const ready = asc || n >= cost || (v?.ready || []).length > 0;
  const suns = Array.from({ length: Math.max(3, max) }, (_, i) => i < n);
  const beads = Array.from({ length: need }, (_, i) => i < hits);
  let text, text2;
  if (asc) { text = 'Ascensión'; text2 = 'el Fervor no se gasta'; }
  else if (n >= cost) { text = 'Veredicto Final listo'; text2 = `gasta ${cost} de Fervor`; }
  else { text = 'Martillo · Juicio'; text2 = `${hits}/${need} impactos de Martillo`; }
  let sub;
  if (asc) sub = `Ascensión${v.t != null ? ' · ' + fmtS(v.t) : ''}`;
  else if (n >= cost) sub = 'Veredicto Final listo';
  else if (n <= 0 && hits <= 0) sub = 'mata o golpea con Martillo';
  else sub = '';
  return { n, max, asc, hits, need, beads, suns, ready, rays: n >= max || asc, wings: asc, text, text2, sub, num: `${n}/${max}` };
}

const FERVOR = {
  mount(body, ctx) {
    const fv = ctx.h('div', 'fv');
    // .fv-fx: sus ::before (rayos) y ::after (alas) son mayores que el halo y .fv los recorta
    fv.innerHTML = '<i class="fv-fx"></i>' +
      '<svg class="fv-arc" viewBox="0 0 168 56" preserveAspectRatio="none" aria-hidden="true"><path d="M10 44 Q84 -14 158 44"/></svg>' +
      FV_JEWELS.map(j => `<i class="jw ${j}"><b class="jw-css"></b></i>`).join('');
    const halo = ctx.art('gz_fervor_halo', { cls: 'fv-halo' });
    if (halo) fv.insertBefore(halo, fv.querySelector('.jw'));
    const jws = [...fv.querySelectorAll('.jw')].map(j => {
      const img = ctx.art('gz_fervor_sol', { cls: 'jw-sol' });
      if (img) j.appendChild(img);
      return j;
    });
    // rayos y alas: capas recortadas por .fv (::before con la imagen como fondo + máscara de
    // luminancia para el aditivo); la <img> oculta solo precarga y da `.art-<name>` a la raíz
    for (const [name, varName] of [['gz_fervor_rayos', '--fv-rays'], ['gz_fervor_ascension', '--fv-wings']]) {
      const url = ctx.asset(name);
      if (!url) continue;
      fv.style.setProperty(varName, `url("${url}")`);
      const im = ctx.art(name, { cls: 'gz-pre' });
      if (im) fv.appendChild(im);
    }
    const side = ctx.h('div', 'fv-side');
    side.innerHTML = '<span class="fv-hm"></span><span class="fv-txt"><b></b><small></small></span>';
    body.appendChild(fv);
    body.appendChild(side);
    return { jws, hm: side.querySelector('.fv-hm'), t1: side.querySelector('.fv-txt b'), t2: side.querySelector('.fv-txt small'), beads: [], nBeads: -1 };
  },
  update(inst, v, prev, ctx) {
    const m = fervorModel(v, ctx.T);
    if (m.need !== inst.nBeads) {                    // las cuentas se crean una vez (cambian solo si cambia hammerNeed)
      inst.nBeads = m.need;
      ctx.setHTML(inst.hm, '<i></i>'.repeat(m.need));
      inst.beads = [...inst.hm.children];
    }
    inst.beads.forEach((b, i) => ctx.toggle(b, 'on', !!m.beads[i]));
    inst.jws.forEach((j, i) => ctx.toggle(j, 'on', !!m.suns[i]));
    const spent = !!prev && (v.seq?.spent || 0) > (prev.seq?.spent || 0);
    const gained = !!prev && (v.seq?.gain || 0) > (prev.seq?.gain || 0);
    if (spent) ctx.toggle(ctx.el, 'cascade', true);          // los soles se apagan en cascada (80 ms)
    else if (gained || m.n > 0) ctx.toggle(ctx.el, 'cascade', false);
    ctx.toggle(ctx.el, 'rays', m.rays);
    ctx.toggle(ctx.el, 'wings', m.wings);
    ctx.toggle(ctx.el, 'ready', m.ready);
    ctx.setText(inst.t1, m.text);
    ctx.setText(inst.t2, m.text2);
    return { num: m.num, sub: m.sub, now: [m.num, m.text, m.text2].filter(Boolean).join(' · ') };
  },
  model: fervorModel,
  demo: [
    { t: 0, value: 0, state: 'idle', x: { hammerHits: 0, hammerNeed: TT.fervor.hammerHits, ascT: 0, ascMax: 0 }, cap: 'Sin Fervor.', tag: 'idle', nodes: [] },
    { t: 0.8, state: 'building', x: { hammerHits: 1 }, cap: `Martillo de Guerra: cada ${TT.fervor.hammerHits} impactos, una cuenta se llena.`, nodes: [] },
    { t: 1.4, x: { hammerHits: 2 } },
    { t: 2, value: 1, x: { hammerHits: 0 }, fire: 'gain', cap: `${TT.fervor.hammerHits}.er impacto: se enciende un sol.`, nodes: [], tag: 'building' },
    { t: 3.2, value: 2, fire: 'gain', cap: `Juicio: cada muerte da ${TT.fervor.perKill} de Fervor.`, nodes: ['s0'] },
    { t: 4.4, value: 3, state: 'full', fire: 'full', ready: ['g_t_veredicto'], cap: 'La corona se enciende: Veredicto Final listo (su ranura late).', nodes: ['s9'], tag: 'full' },
    { t: 7, value: 0, state: 'idle', ready: null, fire: 'spent',
      cap: `Veredicto Final gasta ${TT.fervor.verdict.cost}: ${TT.fervor.verdict.coefPct}${NB}% del arma en cono y cura al grupo.`, nodes: ['s9', 's14'] },
    { t: 8.4, value: 3, state: 'active', label: 'Ascensión', t2: TT.fervor.ascension.t, tMax: TT.fervor.ascension.t, ease: 1, ready: ['g_t_veredicto'],
      x: { ascT: TT.fervor.ascension.t, ascMax: TT.fervor.ascension.t },
      cap: `Ascensión (Apex III): ${TT.fervor.ascension.t} s de alas de luz en los que el Fervor no se gasta.`, nodes: ['x3'], tag: 'active' },
    { t: 12.4, t2: TT.fervor.ascension.t - 4, x: { ascT: TT.fervor.ascension.t - 4 } },
    { t: 12.5, value: 0, state: 'idle', label: '', t2: null, ready: null, x: { ascT: 0, ascMax: 0 }, cap: '', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const F = T.fervor;
    return {
      text: `Cada muerte (Juicio) te da ${F.perKill} de <b>Fervor</b>; cada ${F.hammerHits} impactos de Martillo de Guerra, otro, y cada ${F.basicHits} golpes de tu básico, otro (máx. ${F.max}). <b>Veredicto Final</b> gasta ${F.verdict.cost}: ${F.verdict.coefPct} % del arma en cono y cura al grupo un ${F.verdict.healPct} % del daño.`,
      cols: [
        ['Generar', `Muerte +${F.perKill} · uno por cada ${F.hammerHits} impactos de Martillo · uno por cada ${F.basicHits} golpes del básico`],
        ['Descargar', `Veredicto Final (${F.verdict.cost}): ${F.verdict.coefPct} % del arma y cura al grupo`],
        ['Ventana', `Ascensión: ${F.ascension.t} s sin gastar Fervor (tras ${F.ascension.need} Veredictos)`],
      ],
      tip: [
        `<b>Qué es:</b> un halo de ${F.max} soles; con los ${F.verdict.cost} encendidos, Veredicto Final está listo.`,
        `<b>Gana:</b> ${F.perKill} por muerte (Juicio), uno por cada ${F.hammerHits} impactos de Martillo de Guerra (las cuentas) y uno por cada ${F.basicHits} golpes del básico que acierten.`,
        `<b>Descarga:</b> Veredicto Final, ${F.verdict.coefPct} % del arma en cono. No se pierde con el tiempo; Ascensión: ${F.ascension.t} s sin gastarlo.`,
      ],
    };
  },
  nodes: {
    s0: `Juicio (clave): cada muerte te da ${TT.fervor.perKill} de Fervor (y cada ${TT.fervor.basicHits} golpes del básico, otro).`,
    s4: 'Devoción Ferviente: Aura de Devoción te da Fervor al lanzarla.',
    s9: `Veredicto Final: gasta ${TT.fervor.verdict.cost} de Fervor en un golpe del ${TT.fervor.verdict.coefPct} % que cura al grupo.`,
    s12: 'Fervor Creciente: cada golpe de tu básico que acierta puede dar Fervor extra.',
    s14: 'Luz del Alba: cada Fervor gastado alarga el Aura de Devoción.',
    s17: 'Gracia: el Veredicto Final cura más.',
    x3: `Ascensión: tras ${TT.fervor.ascension.need} Veredictos seguidos, ${TT.fervor.ascension.t} s en los que el Fervor no se gasta.`,
  },
  sounds: { full: 'holy', spent: 'holy' },
};

export const GUERRERO_GAUGE_VIEWS = { sed: SED, bastion: BASTION, fervor: FERVOR };
// modelos puros (tests y arnés)
export { sedModel, bastionModel, fervorModel };
// el formateo de números en español que usan los textos (tests)
export const _fmt = { es, fmtS };
