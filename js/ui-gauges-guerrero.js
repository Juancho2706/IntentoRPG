// ============================================================
// BARRAS DE MECÁNICA · Guerrero · Sed (Berserker), Bastión (Guardián), Fervor (Cruzado)
// ============================================================
// Paso 2d.2 (formas y arte) y Paso 2g (Bastión y Fervor rehechos: docs/paso2g-guerrero.md §7 y
// §11.5). Contrato de defineGaugeView (js/ui-gauges.js): { mount, update, model, demo, explain,
// nodes, sounds }. Los textos y números de la mecánica salen SOLO de gaugeTuning().
//
//   sed      dos venas de carne y hierro que desembocan en un corazón central. La sangre avanza
//            por las venas desde los extremos hacia el corazón (máscara SVG con stroke-dashoffset);
//            el corazón se hincha, late con vida baja (Al borde) y en Sed Saciada se desborda y
//            gotea. Al drenarse fuera de combate la sangre se retira hacia el corazón. Con Sangre
//            Hirviente (b16) las venas se vuelven ámbar.
//   bastion  muralla de 5 escudos de cometa (7 con Inexpugnable 2). Cada carga encaja un escudo;
//            el color sigue a la postura (Muralla azul, Ariete rojo); plantado, la base se
//            ilumina; caminando, el último escudo se agrieta y cae. Con 5 cargas el icono de la
//            descarga se enciende; al descargar, onda de luz y 5 s en gris (sin llenarse).
//   fervor   arco de halo con 3 soles (izquierda, derecha y corona). A 3 giran los rayos y se
//            abren las alas: el siguiente Martillo es un Veredicto. Tres cuentas marcan los Tajos.
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
const NB = ' ';                                                       // espacio fino antes de «%»
let UID = 0;                                                               // ids únicos de <defs> SVG por widget

// T de módulo: solo para los textos fijos (nodes, cap de la demo). explain(T) usa SU T.
const TT = gaugeTuning();

// ============================================================
// 1 · SED (Berserker)
// ============================================================
// Geometría de las venas en coordenadas de gz_sed_venas (1040×244, a 2×): la línea media del canal
// de sangre. La izquierda va del extremo al corazón; la derecha es su espejo. El viewBox recorta
// los márgenes verticales (espinas) para que la figura llene los 56 px del cuerpo.
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
  const boil = !!x.boil;
  const k = sated ? 1 : val / max;
  // pulso por tramos (<34 · <67 · ≥67); se para al drenarse y en Sed Saciada (late el corazón)
  const tier = sated || decaying || k <= 0 ? 0 : k < 0.34 ? 1 : k < 0.67 ? 2 : 3;
  // stroke-dasharray «100 200» sobre pathLength=100 (periodo 300; el hueco tapa todo el trazo):
  //   llenándose: la sangre nace en los EXTREMOS y avanza hacia el corazón → offset 100 − 100·k;
  //   drenándose: se retira de los extremos hacia el corazón → offset 200 + 100·k; vacío: 101.
  const dash = k <= 0 ? SED_EMPTY : r3(decaying ? 200 + 100 * k : 100 - 100 * k);
  let sub;
  if (sated) sub = `Sed Saciada${v.t != null ? ' · ' + fmtS(v.t) : ''}`;
  else if (decaying) sub = `se drena: −${S.decayRate}/s`;
  else if (x.low && k > 0) sub = `Al borde: +${S.satedDmgPct}${NB}% de daño`;
  else if (boil) sub = 'Sangre Hirviente';
  else if (k <= 0) sub = 'pierde vida o desangra para llenarla';
  else sub = '';
  return {
    k: r3(k), dash, anchor: decaying ? 'heart' : 'ends', hs: r3(0.78 + 0.3 * k), tier,
    lit: k > 0, low: !!x.low && !sated, boil, sated, drip: sated, decaying,
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
          `<pattern id="${id}v" patternUnits="userSpaceOnUse" x="0" y="0" width="1040" height="244"><image href="${venas}" width="1040" height="244" preserveAspectRatio="none"/></pattern>` : '') +
      '</defs>' +
      `<g class="sd-css">${paths.map(d => `<path class="vb" d="${d}"/><path class="vi" d="${d}"/><path class="vf" pathLength="100" stroke="url(#${id}g)" d="${d}"/>`).join('')}</g>` +
      (venas ? `<g class="sd-art"><rect class="sd-dim" x="0" y="30" width="1040" height="184" fill="url(#${id}v)"/>` +
        `<rect class="sd-live" x="0" y="30" width="1040" height="184" fill="url(#${id}v)" mask="url(#${id}m)"/>` +
        (sangre ? paths.map(d => `<path class="vt" pathLength="100" stroke="url(#${id}p)" d="${d}"/>`).join('') : '') + '</g>' : '') +
      paths.map(d => `<path class="vp" pathLength="100" d="${d}"/>`).join('') +
      '</svg>' +
      `<div class="sd-heart"><i class="sd-glow"></i><div class="sd-hw"><div class="sd-hb">${HEART_SVG}</div></div></div>` +
      '<i class="sd-drip d1"></i><i class="sd-drip d2"></i><i class="sd-drip d3"></i>';
    body.appendChild(root);
    const heart = root.querySelector('.sd-heart'), hw = root.querySelector('.sd-hw');
    const hImg = ctx.art('gz_sed_corazon', { cls: 'sd-himg' });
    if (hImg) hw.appendChild(hImg);
    const sImg = ctx.art('gz_sed_saciada', { cls: 'sd-simg' });
    if (sImg) hw.appendChild(sImg);
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
    ctx.toggle(el, 'boil', m.boil);
    ctx.toggle(el, 'sated', m.sated);
    ctx.toggle(el, 'drain', m.decaying);
    return { num: m.num, sub: m.sub, now: [`${m.num} / ${v.max || ctx.T.sed.max}`, m.sub].filter(Boolean).join(' · ') };
  },
  model: sedModel,
  demo: [
    { t: 0, value: 0, state: 'idle', x: { low: 0, boil: 0 }, cap: 'Fuera de combate la Sed está vacía.', tag: 'idle', nodes: [] },
    { t: 0.8, value: 0, state: 'building', ease: 1, cap: `Recibes golpes: +${TT.sed.perHpPct} de Sed por cada 1${NB}% de vida perdida.`, nodes: ['b0'] },
    { t: 2.4, value: 42, x: { low: 1 }, ease: 1, cap: `Con menos del ${TT.sed.lowHpPct}${NB}% de vida, Al borde: +${TT.sed.satedDmgPct}${NB}% de daño.`, nodes: ['b0'], tag: 'building' },
    { t: 3.4, value: 58, x: { low: 0, boil: 1 }, ease: 1, cap: `Reabrir: +${TT.sed.reabrir} por golpe de Rajar a un enemigo que sangra. Con más de ${TT.sed.boilAt}, Sangre Hirviente.`, nodes: ['b5', 'b16'] },
    { t: 4.6, value: 64, x: { boil: 1 }, decaying: true, decayIn: 0, ease: 1, cap: `Tras ${TT.sed.decayAfter} s fuera de combate se drena: −${TT.sed.decayRate}/s.`, nodes: [], tag: 'decay' },
    { t: 6, value: 52, x: { boil: 1 }, decaying: false, decayIn: TT.sed.decayAfter, ease: 1, cap: `Último Trago: el 3.er golpe de Rajar da ${TT.sed.ultimoTrago} por rango (el doble a élites y jefes).`, nodes: ['b19'] },
    { t: 7, value: 100, state: 'active', label: 'Sed Saciada', t2: TT.sed.satedT, tMax: TT.sed.satedT, decayIn: null, fire: 'full', ease: 1,
      cap: `¡Sed Saciada! ${TT.sed.satedT} s de +${TT.sed.satedDmgPct}${NB}% de daño (${TT.sed.apexSatedT} s con Corazón Indomable).`, nodes: ['b0', 'b28'], tag: 'active' },
    { t: 12.6, t2: TT.sed.satedT - 5.6 },
    { t: 12.8, value: 0, state: 'idle', label: '', t2: null, x: { boil: 0 }, fire: 'empty', cap: 'Al terminar vuelve a 0.', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const S = T.sed;
    return {
      text: `Perder vida y desangrar enemigos llena tu <b>Sed</b>. A ${S.max}: <b>Sed Saciada</b> ${S.satedT} s (+${S.satedDmgPct} % de daño aunque tengas la vida alta) y vuelve a 0.`,
      cols: [
        ['Generar', `+${S.perHpPct} por cada 1 % de vida perdida · +${S.perBleedTick} por golpe de Sangrado (máx. ${S.bleedPerSec}/s)`],
        ['Descargar', `Automática a ${S.max}: Sed Saciada ${S.satedT} s`],
        ['Pérdida', `−${S.decayRate}/s tras ${S.decayAfter} s fuera de combate`],
      ],
      tip: [
        `<b>Qué es:</b> con menos del ${S.lowHpPct} % de vida o con la Sed Saciada haces +${S.satedDmgPct} % de daño.`,
        `<b>Gana:</b> +${S.perHpPct} por cada 1 % de vida perdida y +${S.perBleedTick} por golpe de Sangrado (máx. ${S.bleedPerSec}/s).`,
        `<b>Descarga:</b> a ${S.max}, Sed Saciada ${S.satedT} s. Pierde −${S.decayRate}/s tras ${S.decayAfter} s fuera de combate.`,
      ],
    };
  },
  nodes: {
    b0: `Sed de Batalla (clave): la Sed existe; con menos del ${TT.sed.lowHpPct} % de vida o con la Sed Saciada, +${TT.sed.satedDmgPct} % de daño.`,
    b5: `Reabrir: cada golpe de Rajar a un enemigo que sangra te da ${TT.sed.reabrir} de Sed.`,
    b15: `Negación de la Muerte: un golpe letal te deja con 1 de vida y la Sed en ${TT.sed.negacion}.`,
    b16: `Sangre Hirviente: con más de ${TT.sed.boilAt} de Sed, tus golpes van más rápido (venas ámbar).`,
    b19: `Último Trago: el 3.er golpe de Rajar te da ${TT.sed.ultimoTrago} de Sed por rango (el doble a élites y jefes).`,
    b28: `Corazón Indomable: matar a un élite da ${TT.sed.eliteKill} de Sed y la Sed Saciada dura ${TT.sed.apexSatedT} s.`,
  },
  sounds: { full: 'hurt' },
};

// ============================================================
// 2 · BASTIÓN (Guardián)
// ============================================================
const SHIELD_SVG = id => `<svg viewBox="0 0 20 24" aria-hidden="true"><path fill="url(#${id})" d="M10 1.2 18.8 4.2v7.2c0 5.8-3.8 9.6-8.8 11.4C5 21 1.2 17.2 1.2 11.4V4.2z"/></svg>`;
const BS_SLOTS = 7;                                         // 5 (7 con Inexpugnable 2): los de más, ocultos

function bastionModel(v, T = TT) {
  const B = T.bastion, x = v?.x || {};
  const max = v?.max > 0 ? v.max : B.max;
  const n = clamp(Math.floor(+v?.value || 0), 0, max);
  const lockT = Math.max(0, +x.lockT || 0);
  const lock = v?.state === 'active' || lockT > 0;
  const stance = x.stance || null;
  const walkIn = x.walkIn;
  const losing = !lock && n > 0 && !!x.walking && walkIn != null;   // la carga que se perderá caminando
  const crack = losing ? r3(clamp(1 - walkIn / B.moveLossEvery, 0, 1)) : 0;
  const crackIdx = losing ? n - 1 : -1;
  const ready = !lock && n >= B.burstAt;
  const lit = Array.from({ length: BS_SLOTS }, (_, i) => i < n);
  const shown = Array.from({ length: BS_SLOTS }, (_, i) => i < Math.max(B.max, max));
  const dr = B.drPerCharge * n;
  // al descargar: Muralla (escudo) si vas a Muralla; Ariete (onda) si vas a Ariete
  const next = stance === 'muralla' ? 'ariete' : stance === 'ariete' ? 'muralla' : stance === 'both' ? null : 'muralla';
  let text;
  if (lock) text = 'Sin llenarse';
  else if (n <= 0) text = 'Bloquea o plántate';
  else text = `−${dr}${NB}% de daño`;
  let sub;
  if (lock) sub = `Descarga · ${fmtS(v?.t ?? lockT)}`;
  else if (ready) sub = next === 'ariete' ? 'cambia a Ariete: onda' : next === 'muralla' ? 'cambia a Muralla: escudo' : 'cambia de postura: descarga';
  else if (crack >= 0.5) sub = `caminando: pierdes una en ${fmtS(walkIn)}`;
  else if (n <= 0) sub = 'bloquea golpes o quédate quieto';
  else if (x.planted) sub = 'plantado';
  else sub = '';
  return { n, max, lock, lockT, crack, crackIdx, tremble: crack >= 0.75, lit, shown, ready, stance, next,
    planted: !!x.planted, dr, text, sub, num: `${n}/${max}` };
}

const BASTION = {
  mount(body, ctx) {
    const id = `gzbs${++UID}`;
    const row = ctx.h('div', 'bs-row');
    row.innerHTML = `<svg class="gz-defs" width="0" height="0" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
      '<stop offset="0" stop-color="#cfe3ff"/><stop offset=".5" stop-color="#7fb0e8"/><stop offset="1" stop-color="#2b4566"/></linearGradient></defs></svg>' +
      '<i class="bs-wave"></i><i class="bs-base"></i>';
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
    const txt = ctx.h('span', 'bs-dr gz-tx');
    side.appendChild(txt);
    body.appendChild(row);
    body.appendChild(side);
    return { shs, txt };
  },
  update(inst, v, prev, ctx) {
    const m = bastionModel(v, ctx.T);
    const pn = prev ? bastionModel(prev, ctx.T) : null;
    const gained = !!prev && (v.seq?.gain || 0) > (prev.seq?.gain || 0);
    const spent = !!prev && (v.seq?.spent || 0) > (prev.seq?.spent || 0);
    inst.shs.forEach((s, i) => {
      ctx.toggle(s.el, 'off', !m.shown[i]);
      ctx.toggle(s.el, 'on', !!m.lit[i]);
      // encaje de golpe: alterna dos animaciones idénticas para reiniciarla sin leer layout
      if (pn && i < m.n && i >= pn.n && (gained || m.n > pn.n)) {
        s.slam = s.slam === 1 ? 2 : 1;
        ctx.toggle(s.inn, 'in-a', s.slam === 1);
        ctx.toggle(s.inn, 'in-b', s.slam === 2);
      }
      // escudo perdido caminando: cae y se apaga (no al descargar: entonces se apagan todos con la onda)
      if (m.lit[i]) ctx.toggle(s.el, 'lost', false);
      else if (pn && !spent && i >= m.n && i < pn.n) ctx.toggle(s.el, 'lost', true);
      const c = i === m.crackIdx ? m.crack : 0;
      for (const ce of s.crk) ctx.setStyle(ce, 'opacity', c ? String(c) : '0');
      ctx.toggle(s.el, 'trem', i === m.crackIdx && m.tremble);
    });
    const el = ctx.el;
    ctx.toggle(el, 'muralla', m.stance === 'muralla' || m.stance === 'both');
    ctx.toggle(el, 'ariete', m.stance === 'ariete' || m.stance === 'both');
    ctx.toggle(el, 'planted', m.planted && !m.lock);
    ctx.toggle(el, 'lock', m.lock);
    ctx.toggle(el, 'ready', m.ready);
    if (spent) ctx.toggle(el, 'burst', true);
    else if (!m.lock) ctx.toggle(el, 'burst', false);
    ctx.toggle(el, 'crit', m.tremble);
    ctx.setText(inst.txt, m.text);
    return { num: m.num, sub: m.sub, now: [`${m.n}/${m.max}`, m.text, m.sub].filter(Boolean).join(' · ') };
  },
  model: bastionModel,
  demo: [
    { t: 0, value: 0, state: 'idle', decayIn: null, x: { stance: 'muralla', planted: 0, drPct: 0, lockT: 0, walking: 0, walkIn: null }, cap: 'Sin cargas de Bastión.', tag: 'idle', nodes: [] },
    { t: 1, value: 1, state: 'building', fire: 'gain', x: { drPct: TT.bastion.drPerCharge },
      cap: `Bloqueas un golpe: +${TT.bastion.perBlock} carga. Cada carga: −${TT.bastion.drPerCharge}${NB}% de daño recibido.`, nodes: ['d0'] },
    { t: 2, value: 2, fire: 'gain', x: { planted: 1, drPct: 2 * TT.bastion.drPerCharge }, cap: `Plantado en combate: +1 cada ${TT.bastion.plantedEvery} s.`, nodes: ['d0'], tag: 'building' },
    { t: 3, x: { planted: 0, walking: 1, walkIn: TT.bastion.moveLossEvery }, ease: 1,
      cap: `Caminando pierdes 1 carga cada ${TT.bastion.moveLossEvery} s: la grieta avisa.`, nodes: [], tag: 'decay' },
    { t: 5, value: 1, x: { walking: 0, walkIn: null, drPct: TT.bastion.drPerCharge }, cap: 'Se pierde una carga.', nodes: [] },
    { t: 5.6, value: 3, fire: 'gain', x: { planted: 1, drPct: 3 * TT.bastion.drPerCharge }, cap: 'En Muralla, Echar Raíces: cada Terremoto te da cargas.', nodes: ['d5'] },
    { t: 6.6, value: 5, state: 'full', fire: 'full', ready: ['g_guardia'], x: { drPct: 5 * TT.bastion.drPerCharge },
      cap: `Con ${TT.bastion.burstAt}, cambiar de postura descarga el Bastión. Fuerza del Bastión: más daño por carga.`, nodes: ['d0', 'd16'], tag: 'full' },
    { t: 8.4, value: 0, state: 'active', label: 'Descarga', t2: TT.bastion.lockAfterBurst, tMax: TT.bastion.lockAfterBurst, ready: null, fire: 'spent', ease: 1,
      x: { stance: 'ariete', planted: 0, drPct: 0, lockT: TT.bastion.lockAfterBurst },
      cap: `A Ariete: onda del ${TT.bastion.burst.coef * 100}${NB}% a ${TT.bastion.burst.radius} m (a Muralla, escudo del ${TT.bastion.burst.shieldPct}${NB}%). ${TT.bastion.lockAfterBurst} s sin llenarse.`, nodes: ['d0', 'd28'], tag: 'active' },
    { t: 12.4, t2: TT.bastion.lockAfterBurst - 4, x: { lockT: TT.bastion.lockAfterBurst - 4 } },
    { t: 12.8, value: 0, state: 'idle', label: '', t2: null, x: { lockT: 0 }, cap: '', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const B = T.bastion;
    return {
      text: `Bloquear y quedarte plantado llenan tu <b>Bastión</b> (máx. ${B.max} cargas): cada carga te quita un ${B.drPerCharge} % del daño que recibes. Con ${B.burstAt}, <b>cambiar de postura las descarga</b>.`,
      cols: [
        ['Generar', `Bloqueo +${B.perBlock} · plantado en combate +1 cada ${B.plantedEvery} s`],
        ['Descargar', `Con ${B.burstAt}, al cambiar de postura: a Muralla, escudo del ${B.burst.shieldPct} % a ti y al más herido; a Ariete, onda del ${B.burst.coef * 100} % a ${B.burst.radius} m`],
        ['Pérdida', `Caminando, 1 carga cada ${B.moveLossEvery} s (la Carga de Escudo no). Tras descargar, ${B.lockAfterBurst} s sin llenarse`],
      ],
      tip: [
        `<b>Qué es:</b> una muralla de ${B.max} escudos; cada carga, −${B.drPerCharge} % de daño recibido.`,
        `<b>Gana:</b> +${B.perBlock} por bloqueo y +1 cada ${B.plantedEvery} s plantado en combate.`,
        `<b>Descarga:</b> con ${B.burstAt}, el cambio de postura (escudo del ${B.burst.shieldPct} % o onda del ${B.burst.coef * 100} %); luego ${B.lockAfterBurst} s sin llenarse.`,
      ],
    };
  },
  nodes: {
    d0: `Pie Firme (clave): bloquear y quedarte plantado llenan el Bastión; cada carga, −${TT.bastion.drPerCharge} % de daño recibido.`,
    d5: `Echar Raíces: en Muralla, cada Terremoto te da ${TT.bastion.raices} carga (${TT.bastion.raicesBigN} si golpea a ${TT.bastion.raicesBig} o más).`,
    d15: `Aguante de Roca: con ${TT.bastion.burstAt} cargas, nada te derriba y tus bloqueos paran más.`,
    d16: 'Fuerza del Bastión: cada carga te da más daño.',
    d20: `Guarnición: dentro de tu Ciudadela ganas 1 carga cada ${TT.bastion.guarnicion} s.`,
    d27: 'Cabeza de Puente: al acabar la Carga te plantas y ganas cargas.',
    d28: `Inexpugnable: matar a un élite llena el Bastión; guarda ${TT.bastion.apexMax} cargas; descargar recarga la Piel de Hierro.`,
  },
  sounds: { full: 'equip', spent: 'hit' },
};

// ============================================================
// 3 · FERVOR (Cruzado)
// ============================================================
// engarces del arte gz_fervor_halo (1040×373): extremo izquierdo, extremo derecho y corona.
const FV_JEWELS = ['j0', 'j1', 'j2'];

function fervorModel(v, T = TT) {
  const F = T.fervor, x = v?.x || {};
  const max = v?.max > 0 ? v.max : F.max;
  const n = clamp(Math.floor(+v?.value || 0), 0, max);
  const need = +x.basicNeed || F.basicHits;
  const hits = clamp(Math.floor(+x.basicHits || 0), 0, need);
  const ready = n >= F.verdict.cost || (v?.ready || []).length > 0;
  const suns = Array.from({ length: Math.max(3, max) }, (_, i) => i < n);
  const beads = Array.from({ length: need }, (_, i) => i < hits);
  let text, text2;
  if (ready) { text = 'Veredicto listo'; text2 = `Martillo: +${F.verdict.dmgPct} % y cura`; }
  else { text = 'Suelta perfecta · Juicio'; text2 = `${hits}/${need} Tajos`; }
  let sub;
  if (ready) sub = 'tu siguiente Martillo es un Veredicto';
  else if (n <= 0 && hits <= 0) sub = 'suelta en el destello o detona marcas';
  else if (v?.decaying || (v?.decayIn != null && v.decayIn < F.decayOOC)) sub = `fuera de combate: −1 en ${fmtS(v.decayIn || 0)}`;
  else sub = '';
  return { n, max, hits, need, beads, suns, ready, rays: n >= max, wings: ready, text, text2, sub, num: `${n}/${max}` };
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
    side.innerHTML = '<span class="fv-hm"></span><span class="fv-txt gz-tx"><b></b><small></small></span>';
    body.appendChild(fv);
    body.appendChild(side);
    return { jws, hm: side.querySelector('.fv-hm'), t1: side.querySelector('.fv-txt b'), t2: side.querySelector('.fv-txt small'), beads: [], nBeads: -1 };
  },
  update(inst, v, prev, ctx) {
    const m = fervorModel(v, ctx.T);
    if (m.need !== inst.nBeads) {                    // las cuentas se crean una vez (cambian solo si cambia basicNeed)
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
    { t: 0, value: 0, state: 'idle', x: { basicHits: 0, basicNeed: TT.fervor.basicHits }, cap: 'Sin Fervor.', tag: 'idle', nodes: [] },
    { t: 0.8, state: 'building', x: { basicHits: 1 }, cap: `Cada ${TT.fervor.basicHits} Tajos, una cuenta se llena.`, nodes: [] },
    { t: 1.4, x: { basicHits: 2 } },
    { t: 2, value: 1, x: { basicHits: 0 }, fire: 'gain', cap: `${TT.fervor.basicHits}.er Tajo: se enciende un sol.`, nodes: [], tag: 'building' },
    { t: 3.2, value: 2, fire: 'gain', cap: `Suelta perfecta del Martillo o detonar una marca: +${TT.fervor.perPerfect} (como mucho ${TT.fervor.perCastMax} por lanzamiento).`, nodes: ['z0', 'z5'] },
    { t: 3.8, cap: `El Juicio que golpea: +${TT.fervor.juicioHit}; detonar la marca del propio Juicio: +${TT.fervor.ownDetonate} más, siempre.`, nodes: ['z0'] },
    { t: 4.4, value: 3, state: 'full', fire: 'full', ready: ['g_martillo'], label: 'Veredicto',
      cap: 'La corona se enciende: tu siguiente Martillo sale al instante como Veredicto.', nodes: ['z0', 'z9'], tag: 'full' },
    { t: 7, value: 0, state: 'idle', label: '', ready: null, fire: 'spent',
      cap: `Veredicto: +${TT.fervor.verdict.dmgPct}${NB}% y cura un ${TT.fervor.verdict.healPct}${NB}% al más herido (${TT.fervor.verdict.apexHealPct}${NB}% con Aureola).`, nodes: ['z9', 'z15', 'z28'] },
    { t: 8.4, value: 1, state: 'building', fire: 'gain', decayIn: TT.fervor.decayOOC * 2, cap: 'Ardor: tus golpes sagrados hacen más daño por cada punto de Fervor.', nodes: ['z16'] },
    { t: 9, value: 0, state: 'idle', fire: 'spent', decayIn: null, cap: `Cataclismo: gasta tu Fervor, +${TT.fervor.cataclysmPct}${NB}% por punto; cargado del todo te deja en ${TT.fervor.perfectCataclysm}.`, nodes: [] },
    { t: 9.3, value: 1, state: 'building', fire: 'gain', decayIn: TT.fervor.decayOOC * 2 },
    { t: 9.6, decayIn: TT.fervor.decayOOC, ease: 1, cap: `Fuera de combate, −1 cada ${TT.fervor.decayOOC} s.`, nodes: [], tag: 'decay' },
    { t: 12, decayIn: 0.4 },
    { t: 12.4, value: 0, state: 'idle', decayIn: null, fire: 'empty', cap: '', nodes: [] },
    { t: 13, end: 1 },
  ],
  explain: T => {
    const F = T.fervor;
    return {
      text: `Una suelta perfecta o detonar marcas de Juicio te da <b>Fervor</b> (como mucho ${F.perCastMax} por lanzamiento; el Cataclismo perfecto, ${F.perfectCataclysm}); el Juicio que golpea, ${F.juicioHit}, y detonar la marca del propio Juicio, ${F.ownDetonate} más. A ${F.max}, tu siguiente Martillo sale al instante como <b>Veredicto</b>: +${F.verdict.dmgPct} % y cura un ${F.verdict.healPct} % al aliado más herido. El <b>Cataclismo</b> gasta el que tengas: +${F.cataclysmPct} % por punto.`,
      cols: [
        ['Generar', `Suelta perfecta o detonación +${F.perPerfect} (máx. ${F.perCastMax} por lanzamiento) · Juicio que golpea +${F.juicioHit} · marca del Juicio detonada +${F.ownDetonate} · uno cada ${F.basicHits} Tajos`],
        ['Descargar', `Veredicto (gasta ${F.verdict.cost}): Martillo al instante, +${F.verdict.dmgPct} % y cura un ${F.verdict.healPct} %; no da Fervor · Cataclismo: lo gasta todo, +${F.cataclysmPct} % por punto (cargado del todo te deja en ${F.perfectCataclysm})`],
        ['Pérdida', `No se pierde con el tiempo; fuera de combate, −1 cada ${F.decayOOC} s`],
      ],
      tip: [
        `<b>Qué es:</b> un halo de ${F.max} soles; con los ${F.verdict.cost} encendidos, tu siguiente Martillo es un Veredicto.`,
        `<b>Gana:</b> ${F.perPerfect} por suelta perfecta o detonación (como mucho ${F.perCastMax} por lanzamiento), ${F.juicioHit} si el Juicio golpea, ${F.ownDetonate} más al detonar la marca del propio Juicio y uno cada ${F.basicHits} Tajos.`,
        `<b>Descarga:</b> Veredicto, +${F.verdict.dmgPct} % y cura un ${F.verdict.healPct} % al más herido; el Cataclismo lo gasta todo (+${F.cataclysmPct} % por punto). Fuera de combate, −1 cada ${F.decayOOC} s.`,
      ],
    };
  },
  nodes: {
    z0: `Voto Sagrado (clave): suelta perfecta o detonar marcas, +${TT.fervor.perPerfect} de Fervor por lanzamiento; a ${TT.fervor.max}, Veredicto.`,
    z5: 'Sello del Martillo: la suelta perfecta marca con Juicio a los que golpea (más detonaciones).',
    z9: 'Veredicto Generoso o Pesado: el Veredicto llega más lejos y cura a todos, o pega más al objetivo.',
    z15: 'Luz Protectora: cada Veredicto te da un escudo.',
    z16: 'Ardor: tus golpes sagrados hacen más daño por cada punto de Fervor.',
    z28: `Aureola: matar a un élite llena el Fervor y el Veredicto cura un ${TT.fervor.verdict.apexHealPct} %.`,
  },
  sounds: { full: 'holy', spent: 'holy' },
  world: {
    // S-guerrero (G06): SELLO de Juicio sobre la barra de vida de cada enemigo con una marca tuya: un
    // rombo dorado por uso que le queda (Tribunal: 2 o 3) que parpadea los últimos 2 s. Puro: lee e.marks
    overhead(e, p) {
      const m = e && e.alive !== false ? e.marks?.juicio : null;
      if (!m || !(m.t > 0) || (p && m.by && m.by !== p)) return null;
      const n = Math.max(1, m.uses | 0);
      return { n, max: n, tone: 'gold', blink: m.t <= JUICIO_BLINK_T };
    },
  },
};
// el sello de Juicio parpadea cuando a la marca le quedan estos segundos
export const JUICIO_BLINK_T = 2;

export const GUERRERO_GAUGE_VIEWS = { sed: SED, bastion: BASTION, fervor: FERVOR };
// modelos puros (tests y arnés)
export { sedModel, bastionModel, fervorModel };
// el formateo de números en español que usan los textos (tests)
export const _fmt = { es, fmtS };
