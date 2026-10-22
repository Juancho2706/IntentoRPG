// ============================================================
// BARRAS DE MECÁNICA · Maga · Calor (Piromante), Escarcha (Crionte), Cargas Arcanas (Arcanista) (Paso 2d.2 · E1)
// ============================================================
// docs/paso2d2-hud-pc.md §3.4–§3.6 y el mockup docs/mockups/hud-pc.html (bloques 4–6). Tres
// figuras propias, ninguna es una barra que se rellena de izquierda a derecha:
//   calor    BRASERO: 10 llamas sobre un cuenco de hierro que crecen A LA VEZ en altura
//            (corona: las centrales más altas), color por tramos de temperatura, brasas en el
//            borde; al enfriarse, ceniza gris que baja («se enfría: −10/s»); a 100, Ignición
//            Total: llamas blancas al máximo y una COLUMNA central; Combustión: insignia «Crítico».
//   escarcha CINCO CRISTALES hexagonales del enemigo que se mira (cursor > jefe > el más
//            escarchado): etiqueta con su nombre (corona si es jefe), engastes, el último
//            cristal se escarcha según decayIn; a 5, estallido y «¡Congelado!»; jefe Aterido
//            con halo y anillo; contador de grupo («2 congelados» / «6 con capas»).
//            world.overhead → la tira de 5 rombos sobre élites, jefes y el enemigo del cursor.
//   cargas   CUATRO RUNAS en órbita sobre un anillo rúnico alrededor de un NÚCLEO que se
//            enciende con las Cargas; arco de caducidad (6 s y más con Memoria Arcana) que parpadea por
//            debajo de 2 s;
//            previsión del próximo Rayo; colapso de las runas al centro al descargar; RESONANCIA.
//
// Contrato (lo fija E0 en js/ui-gauges.js): { mount, update, model, demo, explain, nodes,
// sounds, world? }. update escribe SOLO con ctx.set* (memorizados → A7) y nunca lee layout.
// Los eventos (estallido, colapso) se leen por diferencia de view.seq y reinician su animación
// alternando el nombre del @keyframes (data-burst a/b), sin reflow. Arte pintado (R9): las
// formas y animaciones son CSS; los assets assets/gauges/gz_{calor,escarcha,cargas}_*.webp son
// la piel (ctx.art) y, si no cargan, queda la forma CSS del mockup (.no-art).
// Paso 2g (E2 · KT-maga): textos, nodos y demos con los nodos 2g; los números, de gaugeTuning() (y
// las capas de la Prisión, de su definición en el catálogo).
// Nivel superior PURO: nada de document/window al importar.
import { gaugeTuning } from './spec-mechanics.js';
import { MAGA_SKILLS } from './skills-maga.js';

// ------------------------------------------------------------
// utilidades puras
// ------------------------------------------------------------
const clamp01 = k => (k > 0 ? (k < 1 ? k : 1) : 0);
const r3 = n => Math.round(n * 1000) / 1000;
const fmtN = n => String(Math.round(n * 100) / 100).replace('.', ',');
const fmtS = t => `${(Math.round(Math.max(0, t) * 10) / 10).toFixed(1).replace('.', ',')} s`;
const x0 = v => (v && v.x) || {};
const WARN_S = 2;                     // §3.6: el arco de las Cargas parpadea por debajo de 2 s

// ============================================================
// 4 · CALOR — el brasero
// ============================================================
const FLAMES = 10;
// corona de hoguera: las centrales más altas (0,55 + 0,45·sin) y alturas desiguales fijas
const CROWN = Array.from({ length: FLAMES }, (_, i) => 0.55 + 0.45 * Math.sin(Math.PI * (i + 0.5) / FLAMES));
const JIT = [0.9, 1, 0.86, 0.97, 1, 0.93, 1, 0.88, 0.98, 0.91];

export function calorModel(v, T = gaugeTuning()) {
  const C = T.calor, x = x0(v);
  const max = v?.max || C.max;
  const value = Math.max(0, Math.min(max, v?.value || 0));
  const k = value / max;
  const ignition = v?.state === 'active';
  const ash = !ignition && !!(v?.decaying || x.cooling);
  const tier = ignition ? 4 : k <= 0 ? 0 : k < 0.34 ? 1 : k < 0.67 ? 2 : 3;
  const heights = CROWN.map((c, i) => r3(ignition ? c : k > 0 ? c * JIT[i] * (0.14 + 0.86 * k) : 0));
  const ember = ignition ? 1 : k > 0 ? r3(0.25 + 0.75 * k) : 0;
  const combT = x.combT > 0 ? x.combT : 0;
  const comb = combT > 0;
  let sub;
  if (ignition) sub = v.label || 'Ignición Total';
  else if (ash) sub = `se enfría: −${fmtN(C.decayRate)}/s`;
  else if (comb) sub = `${v.label || 'Combustión'} · ${fmtS(v.t != null ? v.t : combT)}`;
  else if (k <= 0) sub = 'golpea con Fuego para avivarlo';
  else if (v.decayIn != null && v.decayIn > 0 && v.decayIn <= 1.5) sub = `se enfría en ${fmtS(v.decayIn)}`;
  else sub = '';
  return { k: r3(k), tier, heights, ember, ash, ignition, column: ignition, comb, badge: comb ? 'Crítico' : '',
    num: String(Math.floor(value)), sub };
}

const FLAME_PATH = "path('M12 0C16 10 24 17 24 29a12 11 0 0 1-24 0C0 17 8 10 12 0Z')";
const calor = {
  mount(body, ctx) {
    const brz = ctx.h('div', 'brz');
    brz.innerHTML =
      '<div class="brz-bowl"><svg viewBox="0 0 300 18" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M2 3H298L284 13Q150 19 16 13Z" fill="#1d1410" stroke="#5a3a22" stroke-width="1.5"/>' +
      '<path d="M40 14 30 18M260 14 270 18" stroke="#5a3a22" stroke-width="3"/></svg></div>' +
      '<div class="brz-col"><i class="brz-col-css"></i></div>' +
      `<div class="brz-fls">${'<div class="fl"><div class="fl-c"><i class="fl-sh"></i><i class="fl-ash"></i></div></div>'.repeat(FLAMES)}</div>` +
      `<div class="brz-emb">${'<b></b>'.repeat(FLAMES)}</div>`;
    const bowlArt = ctx.art('gz_calor_brasero', { cls: 'brz-bowl-art' });
    if (bowlArt) brz.insertBefore(bowlArt, brz.querySelector('.brz-fls'));
    const fls = [...brz.querySelectorAll('.fl')];
    fls.forEach((f, i) => {
      if (i % 2) f.classList.add('odd');
      const img = ctx.art('gz_calor_llama', { cls: 'fl-art' });
      if (img) f.firstChild.insertBefore(img, f.firstChild.querySelector('.fl-ash'));
    });
    const col = brz.querySelector('.brz-col');
    const colArt = ctx.art('gz_calor_llama_blanca', { cls: 'brz-col-art' });
    if (colArt) col.appendChild(colArt);
    const side = ctx.h('div', 'brz-side');
    side.innerHTML = '<span class="brz-ign"><i class="brz-ign-css">✹</i></span><span class="brz-x2 gz-tx"></span>';
    const ign = ctx.art('gz_calor_ignicion', { cls: 'brz-ign-art' });
    if (ign) side.firstChild.appendChild(ign);
    body.appendChild(brz);
    body.appendChild(side);
    return { brz, fls, ems: [...brz.querySelectorAll('.brz-emb b')], side, x2: side.querySelector('.brz-x2') };
  },
  update(inst, v, prev, ctx) {
    const m = calorModel(v, ctx.T);
    ctx.setAttr(inst.brz, 'data-tier', m.tier);
    ctx.setAttr(inst.brz, 'data-ash', m.ash ? 1 : 0);
    ctx.setAttr(inst.brz, 'data-ign', m.ignition ? 1 : 0);
    for (let i = 0; i < FLAMES; i++) {
      ctx.setStyle(inst.fls[i], 'transform', `scaleY(${m.heights[i]})`);
      ctx.setStyle(inst.ems[i], 'opacity', m.ember);
    }
    ctx.setAttr(inst.side, 'data-comb', m.comb ? 1 : 0);
    ctx.setText(inst.x2, m.badge);
    return { num: m.num, sub: m.sub, now: `${m.num} / ${v.max || ctx.T.calor.max}${m.sub ? ' · ' + m.sub : ''}` };
  },
  model: calorModel,
  explain(T) {
    const C = T.calor;
    const comb = fmtN(C.combustion.base + C.combustion.perRank);
    return {
      text: `Cada golpe de Fuego suma <b>${C.perFireHit} de Calor</b> (una vez por instante). A ${C.max}: <b>Ignición Total</b>, la siguiente Bola de Fuego o Meteoro es gratis y crítico seguro.`,
      cols: [
        ['Generar', `+${C.perFireHit} por golpe de Fuego · Llamarada Avivada +${C.llamarada} · Chispas +${C.chispas}`],
        ['Descargar', 'Se consume al lanzar Bola de Fuego o Meteoro'],
        ['Pérdida', `−${fmtN(C.decayRate)}/s tras ${fmtN(C.decayAfter)} s sin golpes de Fuego`],
      ],
      tip: [
        `<b>Qué es:</b> un brasero que se aviva con tus golpes de Fuego. A ${C.max}: <b>Ignición Total</b> (la siguiente Bola de Fuego o Meteoro es gratis y crítico seguro).`,
        `<b>Gana:</b> +${C.perFireHit} por golpe de Fuego, +${C.llamarada} con Llamarada Avivada, +${C.voraz} por enemigo con Llamarada Voraz. <b>Combustión:</b> al usar Ignición Total, ${comb} s con todo tu Fuego crítico.`,
        `<b>Pierde:</b> se enfría −${fmtN(C.decayRate)}/s tras ${fmtN(C.decayAfter)} s sin golpes de Fuego (las llamas se vuelven ceniza).`,
      ],
    };
  },
  sounds: { full: 'fire' },
};

// ============================================================
// 5 · ESCARCHA — cinco cristales con nombre propio (por enemigo)
// ============================================================
const isBossDef = d => !!(d && (d.boss || d.uber || d.worldBoss));
export function escarchaModel(v, T = gaugeTuning()) {
  const E = T.escarcha, x = x0(v);
  const max = v?.max || E.max;
  const n = Math.max(0, Math.min(max, Math.floor(v?.value || 0)));
  const name = x.enemyName || v?.enemy?.def?.name || v?.enemy?.name || '';
  const boss = !!(x.boss || isBossDef(v?.enemy?.def));
  const numb = v?.state === 'active' || (boss && x.numbT > 0);
  const numbT = numb ? (v.t != null ? v.t : x.numbT || 0) : 0;
  const lit = Array.from({ length: max }, (_, i) => i < n);
  // el último cristal se escarcha y pierde brillo según decayIn / cada (2 s)
  const fade = n > 0 && !numb && v.decayIn != null ? r3(clamp01(v.decayIn / (x.every || E.decayEvery))) : 1;
  const frozen = x.frozen || 0, layered = x.layered || 0;
  const targetFrozen = !!x.targetFrozen;          // del núcleo (spec-mechanics viewX): la UI no lee el enemigo
  const full = n >= max;
  const counter = frozen ? `${frozen} congelado${frozen > 1 ? 's' : ''}` : layered ? `${layered} con capas` : '';
  let sub;
  if (numb) sub = `Aterido · ${fmtS(numbT)}`;
  else if (full || targetFrozen) sub = '¡Congelado!';
  else if (!name || n <= 0) sub = name ? 'sin capas' : 'golpea con Escarcha para sumar capas';
  else if (fade < 0.5) sub = 'pierde una capa';
  else sub = '';
  return { n, max, lit, last: n - 1, fade, rime: r3(1 - fade), name: name || '—', hasTarget: !!name, boss, numb, numbT: r3(numbT),
    frozen, layered, counter, targetFrozen, full, num: `${n}/${max}`, sub };
}

const escarcha = {
  mount(body, ctx) {
    const max = ctx.T.escarcha.max;
    const tag = ctx.h('span', 'fr-tag', '<span class="fr-crown"><i class="fr-crown-css">♛</i></span><span class="fr-nm gz-tx"></span>');
    const crown = ctx.art('gz_escarcha_aterido', { cls: 'fr-crown-art' });
    if (crown) tag.firstChild.appendChild(crown);
    const hexes = ctx.h('div', 'fr-hexes');
    hexes.innerHTML = Array.from({ length: max }, (_, i) =>
      `<i class="fr-hex" style="--sx:${[-14, -7, 0, 7, 14][i % 5]}px;--sy:${[-10, -16, -18, -16, -10][i % 5]}px;--sr:${[-40, -20, 10, 25, 45][i % 5]}deg">` +
      '<i class="fr-sock"></i><i class="fr-gem"><i class="fr-gem-css"></i></i><i class="fr-rime"></i></i>').join('');
    const hx = [...hexes.querySelectorAll('.fr-hex')];
    for (const h of hx) {
      const sock = ctx.art('gz_escarcha_engaste', { cls: 'fr-sock-art' });
      if (sock) h.insertBefore(sock, h.querySelector('.fr-gem'));
      const gem = ctx.art('gz_escarcha_cristal', { cls: 'fr-gem-art' });
      if (gem) h.querySelector('.fr-gem').appendChild(gem);
    }
    const cnt = ctx.h('span', 'fr-cnt', '<span class="fr-ice"><i class="fr-ice-css">❄</i></span><span class="fr-cnt-t gz-tx"></span>');
    const ice = ctx.art('gz_escarcha_congelado', { cls: 'fr-ice-art' });
    if (ice) cnt.firstChild.appendChild(ice);
    body.appendChild(tag); body.appendChild(hexes); body.appendChild(cnt);
    return { tag, nm: tag.querySelector('.fr-nm'), hexes, hx, rimes: hx.map(h => h.querySelector('.fr-rime')), gems: hx.map(h => h.querySelector('.fr-gem')),
      cnt, cntT: cnt.querySelector('.fr-cnt-t'), burst: 0 };
  },
  update(inst, v, prev, ctx) {
    const m = escarchaModel(v, ctx.T);
    ctx.setText(inst.nm, m.name);
    ctx.setAttr(inst.tag, 'data-boss', m.boss ? 1 : 0);
    ctx.setAttr(inst.tag, 'data-none', m.hasTarget ? 0 : 1);
    ctx.setAttr(inst.hexes, 'data-numb', m.numb ? 1 : 0);
    ctx.setAttr(inst.hexes, 'data-full', m.full ? 1 : 0);
    for (let i = 0; i < inst.hx.length; i++) {
      const on = !!m.lit[i];
      ctx.toggle(inst.hx[i], 'on', on);
      const isLast = on && i === m.last;
      ctx.setStyle(inst.gems[i], 'opacity', on ? (isLast ? r3(0.45 + 0.55 * m.fade) : 1) : '');
      ctx.setStyle(inst.rimes[i], 'opacity', isLast ? m.rime : '');
    }
    // ¡congelación! (seq.full: congelaciones de TODOS los enemigos) → estallido de los cristales
    if (prev && prev.seq && v.seq && (v.seq.full || 0) > (prev.seq.full || 0)) {
      inst.burst++;
      ctx.setAttr(inst.hexes, 'data-burst', inst.burst % 2 ? 'a' : 'b');
    }
    ctx.setText(inst.cntT, m.counter);
    ctx.setAttr(inst.cnt, 'data-frozen', m.frozen ? 1 : 0);
    ctx.setAttr(inst.cnt, 'data-empty', m.counter ? 0 : 1);
    return { num: m.num, sub: m.sub, now: `${m.name} · ${m.num}${m.sub ? ' · ' + m.sub : ''}${m.counter ? ' · ' + m.counter : ''}` };
  },
  model: escarchaModel,
  explain(T) {
    const E = T.escarcha, prision = prisionLayers();
    return {
      text: `Cada golpe de Hielo suma una capa al <b>enemigo</b>. A ${E.max} capas queda <b>Congelado</b> ${fmtN(E.freezeT)} s; un jefe queda <b>Aterido</b> ${fmtN(E.numbT)} s y recibe ${E.bossStagger} de aturdimiento.`,
      cols: [
        ['Generar', `+${E.perHit} por golpe de Hielo · Nova de Hielo +${E.nova} · Prisión de Hielo +${prision}`],
        ['Descargar', `Automática a ${E.max}: Congelado ${fmtN(E.freezeT)} s / jefe Aterido ${fmtN(E.numbT)} s`],
        ['Pérdida', `Una capa cada ${fmtN(E.decayEvery)} s`],
      ],
      tip: [
        `<b>Qué es:</b> las capas de hielo del enemigo bajo el cursor (o del jefe, o del más escarchado). A ${E.max}: <b>Congelado</b> ${fmtN(E.freezeT)} s.`,
        `<b>Gana:</b> +${E.perHit} por golpe de Hielo; la Nova, +${E.nova}, y la Prisión, +${prision}. Un jefe queda <b>Aterido</b> ${fmtN(E.numbT)} s (−${E.numbMovePct} % de movimiento, −${E.numbAspdPct} % de velocidad de ataque).`,
        `<b>Pierde:</b> una capa cada ${fmtN(E.decayEvery)} s; el último cristal se escarcha antes de caer.`,
      ],
    };
  },
  sounds: { full: 'ice' },
  world: {
    // tira de rombos sobre la barra de vida: SOLO élites, jefes y el enemigo bajo el cursor
    // (R1: 60 enemigos no llevan 60 tiras). Puro: lee e.gauges sin crear estado.
    overhead(e, p) {
      if (!e || e.alive === false) return null;
      const d = e.def || {};
      const notable = !!(d.rank || isBossDef(d) || e.prey);
      const hovered = !!p && (e === p.game?.ui?.hoverEnemy || e === p.game?.hoverEnemy);
      if (!notable && !hovered) return null;
      const max = gaugeTuning().escarcha.max;
      const n = Math.max(0, Math.min(max, Math.floor(e.gauges?.escarcha?.v || 0)));
      const numb = isBossDef(d) && e.numbT > 0;
      const frozen = (e.frozenT || 0) > 0;
      if (n <= 0 && !numb && !frozen) return null;
      return { n, max, numb, frozen };
    },
  },
};

// ============================================================
// 6 · CARGAS ARCANAS — cuatro runas en órbita alrededor de un núcleo
// ============================================================
export function cargasModel(v, T = gaugeTuning()) {
  const A = T.cargas, x = x0(v);
  const max = v?.max || A.max;
  const n = Math.max(0, Math.min(max, Math.floor(v?.value || 0)));
  const res = !!x.resonance;
  const loseAfter = x.loseAfter || A.loseAfter;
  const hold = res || !!v?.hold;
  const arc = n <= 0 ? 0 : hold ? 1 : v.decayIn != null ? r3(clamp01(v.decayIn / loseAfter)) : 1;
  const warn = n > 0 && !hold && v.decayIn != null && v.decayIn < WARN_S;
  const full = n >= max;
  const bonus = x.bonusPct != null ? x.bonusPct : A.dmgPerCharge * n;
  const mana = x.manaBack != null ? x.manaBack : A.manaPerCharge * n;
  const text = n ? `Rayo <b>+${bonus} %</b> · +${mana} maná` : `Dardo Arcano: +${A.perDart} Carga`;
  let sub;
  if (res) sub = 'Resonancia: no caducan';
  else if (warn) sub = `¡se desvanecen! ${fmtS(v.decayIn)}`;
  else if (n > 0 && v.decayIn != null) sub = `caducan en ${fmtS(v.decayIn)}`;
  else if (n <= 0) sub = '';
  else sub = '';
  return { n, max, lit: Array.from({ length: max }, (_, i) => i < n), core: r3(n / max), full, arc, warn, res, orbit: n > 0,
    bonus, mana, text, num: `${n}/${max}`, sub };
}

const RUNE_R = 18;                    // radio de la órbita (px) dentro del anillo de 48
const cargas = {
  mount(body, ctx) {
    const max = ctx.T.cargas.max;
    const pos = i => { const a = -Math.PI / 2 + i * 2 * Math.PI / max; return [Math.round(Math.cos(a) * RUNE_R), Math.round(Math.sin(a) * RUNE_R)]; };
    const runes = Array.from({ length: max }, (_, i) => { const [dx, dy] = pos(i); return `<i class="ac-rune" style="--dx:${dx}px;--dy:${dy}px"><i class="ac-rune-off"></i><i class="ac-rune-on"><i class="ac-rune-css"></i></i></i>`; }).join('');
    const ghosts = Array.from({ length: max }, (_, i) => { const [dx, dy] = pos(i); return `<i class="ac-ghost" style="--dx:${dx}px;--dy:${dy}px"><i class="ac-rune-css"></i></i>`; }).join('');
    const ac = ctx.h('div', 'ac');
    ac.innerHTML = '<i class="ac-arc"></i><div class="ac-orbit"><i class="ac-ring-css"></i>' + runes + '</div>' +
      '<div class="ac-core"><i class="ac-core-css"></i></div><div class="ac-ghosts">' + ghosts + '</div>';
    const orbit = ac.querySelector('.ac-orbit');
    const ring = ctx.art('gz_cargas_anillo', { cls: 'ac-ring-art' });
    if (ring) orbit.insertBefore(ring, orbit.querySelector('.ac-rune'));
    for (const on of [...ac.querySelectorAll('.ac-rune-on'), ...ac.querySelectorAll('.ac-ghost')]) {
      const img = ctx.art('gz_cargas_runa', { cls: 'ac-rune-art' });
      if (img) on.appendChild(img);
    }
    const coreArt = ctx.art('gz_cargas_nucleo', { cls: 'ac-core-art' });
    if (coreArt) ac.querySelector('.ac-core').appendChild(coreArt);
    const info = ctx.h('div', 'ac-info gz-tx', '<span class="ac-txt"></span><span class="ac-res">RESONANCIA</span>');
    body.appendChild(ac); body.appendChild(info);
    return { ac, arc: ac.querySelector('.ac-arc'), core: ac.querySelector('.ac-core'), runes: [...ac.querySelectorAll('.ac-rune')],
      ghosts: ac.querySelector('.ac-ghosts'), info, txt: info.querySelector('.ac-txt'), burst: 0 };
  },
  update(inst, v, prev, ctx) {
    const m = cargasModel(v, ctx.T);
    for (let i = 0; i < inst.runes.length; i++) ctx.toggle(inst.runes[i], 'on', !!m.lit[i]);
    ctx.setStyle(inst.arc, '--lp', m.arc);
    ctx.setStyle(inst.core, '--co', m.n ? r3(0.35 + 0.65 * m.core) : 0.3);
    ctx.setAttr(inst.ac, 'data-full', m.full ? 1 : 0);
    ctx.setAttr(inst.ac, 'data-warn', m.warn ? 1 : 0);
    ctx.setAttr(inst.ac, 'data-orbit', m.orbit ? 1 : 0);
    ctx.setAttr(inst.ac, 'data-res', m.res ? 1 : 0);
    ctx.setAttr(inst.info, 'data-res', m.res ? 1 : 0);
    // descarga (seq.spent: Rayo las consume) → las runas colapsan al centro (450 ms)
    if (prev && prev.seq && v.seq && (v.seq.spent || 0) > (prev.seq.spent || 0)) {
      inst.burst++;
      ctx.setAttr(inst.ghosts, 'data-n', Math.max(1, Math.floor(prev.value || 0)));
      ctx.setAttr(inst.ghosts, 'data-burst', inst.burst % 2 ? 'a' : 'b');
    }
    ctx.setHTML(inst.txt, m.text);
    return { num: m.num, sub: m.sub, now: `${m.num}${m.n ? ` · Rayo +${m.bonus} % · +${m.mana} maná` : ''}${m.sub ? ' · ' + m.sub : ''}` };
  },
  model: cargasModel,
  explain(T) {
    const A = T.cargas;
    return {
      text: `Dardo Arcano suma <b>Cargas Arcanas</b> (máx. ${A.max}). <b>Rayo</b> las gasta todas: +${A.dmgPerCharge} % de daño y +${A.manaPerCharge} de maná por Carga.`,
      cols: [
        ['Generar', `Dardo Arcano +${A.perDart} por impacto · Desgarro Arcano +${A.perRiftTic} por golpe del haz · Orbe Arcano +${A.perOrb} al recogerlo (no si se queda en órbita) · Sello del Archimago +1 cada ${fmtN(A.sealEvery)} s`],
        ['Descargar', `Rayo las gasta todas: hasta +${A.dmgPerCharge * A.max} % de daño y +${A.manaPerCharge * A.max} de maná · Haz Concentrado, en su 1.er tic, y el bono dura todo el canal`],
        ['Pérdida', `Todas a los ${fmtN(A.loseAfter)} s sin ganar (salvo Resonancia)`],
      ],
      tip: [
        `<b>Qué es:</b> hasta ${A.max} runas que orbitan tu núcleo arcano y potencian el próximo <b>Rayo</b>.`,
        `<b>Gana:</b> +${A.perDart} por impacto de Dardo Arcano, +${A.perRiftTic} por golpe del haz del Desgarro (aunque atraviese a varios) y +${A.perOrb} al recoger tu Orbe (no si se queda en órbita: Satélite, Constelación); dentro de tu Sello, +1 cada ${fmtN(A.sealEvery)} s. <b>Descarga:</b> Rayo las gasta todas: +${A.dmgPerCharge} % de daño y +${A.manaPerCharge} de maná por Carga. Con <b>Haz Concentrado</b> las gasta todas su 1.er tic (aunque lo sueltes enseguida) y su bono dura todo el canal.`,
        `<b>Pierde:</b> todas a los ${fmtN(A.loseAfter)} s sin ganar (el arco avisa); con Resonancia y ${A.max} Cargas no se pierden y tienes +${A.resonanceCrit} % de crítico por rango.`,
      ],
    };
  },
  sounds: { spent: 'bolt' },
};

// ============================================================
// demostraciones (§4): valores sintéticos que respetan gaugeTuning()
// ============================================================
function calorDemo(T) {
  const C = T.calor, step = C.perFireHit;
  const v1 = step * 8, v2 = v1 + C.llamarada, v3 = Math.min(C.max - step * 3, v2 + step * 4);
  const coolEnd = v3 - C.decayRate;                                   // 1 s de enfriamiento
  const comb = C.combustion.base + C.combustion.perRank;              // Combustión (rango 1)
  return [
    { t: 0, value: 0, state: 'idle', label: '', t2: null, tMax: null, decayIn: null, decaying: false, hold: false, ready: null,
      x: { cooling: false, combT: 0, combMax: 0, mult: 1 }, cap: 'El brasero está frío.', tag: 'idle', nodes: [] },
    { t: 0.6, value: 0, state: 'building', decayIn: C.decayAfter, ease: 1, fire: 'gain', cap: `+${step} de Calor por golpe de Fuego (una vez por instante): todas las llamas crecen a la vez.`, nodes: ['s19'] },
    { t: 2.6, value: v1, decayIn: C.decayAfter, cap: `Llamarada Avivada: +${C.llamarada} de golpe.`, nodes: ['s9'], tag: 'building' },
    { t: 2.9, value: v2, fire: 'gain', ease: 1 },
    { t: 3.5, value: v3, decayIn: C.decayAfter, ease: 1, cap: 'Si dejas de golpear con Fuego…', nodes: [] },
    { t: 3.5 + C.decayAfter, decayIn: 0, decaying: true, x: { cooling: true }, ease: 1,
      cap: `…a los ${fmtN(C.decayAfter)} s se enfría: −${fmtN(C.decayRate)}/s y las llamas se vuelven ceniza.`, nodes: [], tag: 'decay' },
    { t: 4.5 + C.decayAfter, value: coolEnd, decaying: false, decayIn: C.decayAfter, x: { cooling: false }, fire: 'gain', ease: 1, cap: 'Un golpe de Fuego lo reaviva.', nodes: [] },
    { t: 5.3 + C.decayAfter, value: C.max, state: 'active', label: 'Ignición Total', decayIn: null, hold: true, fire: 'full', ready: [...C.skills],
      cap: `A ${C.max}: Ignición Total. La siguiente Bola de Fuego o Meteoro es gratis y crítico seguro (sus ranuras laten).`, nodes: [], tag: 'active' },
    { t: 7.6 + C.decayAfter, value: 0, state: 'idle', label: '', hold: false, ready: null, fire: 'spent', cap: 'Se consume al lanzarla.', nodes: [] },
    { t: 8.2 + C.decayAfter, value: step, state: 'building', label: 'Combustión', t2: comb, tMax: comb, decayIn: C.decayAfter,
      x: { combT: comb, combMax: comb, mult: 1 }, fire: 'gain', ease: 1,
      cap: `Combustión: al usar Ignición Total, ${fmtN(comb)} s con todo tu Fuego crítico.`, nodes: ['s23'] },
    { t: 8.2 + C.decayAfter + comb * 0.6, value: step * 4, t2: comb * 0.4, x: { combT: comb * 0.4 }, cap: `Combustión Perpetua: en Combustión, cada crítico da ${C.perpetua} de Calor.`, nodes: ['s26'] },
    { t: 10.2 + C.decayAfter, end: 1 },
  ];
}

function escarchaDemo(T) {
  const E = T.escarcha, every = E.decayEvery;
  const boss = 'Señor del Osario';
  return [
    { t: 0, value: 0, state: 'idle', label: '', t2: null, tMax: null, decayIn: null, ready: null,
      x: { enemyName: '', boss: false, layered: 0, frozen: 0, numbT: 0, targetFrozen: false, every }, cap: 'Ningún enemigo tiene capas.', tag: 'idle', nodes: [] },
    { t: 1, value: E.perHit, state: 'building', decayIn: every, fire: 'gain', x: { enemyName: 'Necrófago', layered: 3 },
      cap: `+${E.perHit} capa por golpe de Hielo. Se muestra el enemigo bajo el cursor (o el jefe, o el más escarchado).`, nodes: ['i0'] },
    { t: 2, value: E.perHit + E.nova, decayIn: every, fire: 'gain', x: { layered: 6 },
      cap: `Nova de Hielo: +${E.nova} capas a todos los que toca.`, nodes: ['i0'], tag: 'building' },
    { t: 2.8, value: E.max - 1, decayIn: every, fire: 'gain', cap: `Filo Helado: desde ${E.critLayers} capas, más probabilidad de crítico contra él.`, nodes: ['i2'] },
    { t: 3.4, value: E.max, state: 'full', decayIn: null, fire: 'full', x: { frozen: 1, targetFrozen: true },
      cap: `¡${E.max} capas: Congelado ${fmtN(E.freezeT)} s! (más con Frío Penetrante).`, nodes: ['i0', 'i1'], tag: 'full' },
    { t: 4.0, value: 0, state: 'idle', cap: '¡Congelado! Sus capas se gastan al congelarlo.', nodes: [] },
    { t: 3.4 + E.freezeT, value: 2, state: 'building', decayIn: every, fire: 'gain', x: { enemyName: 'Esqueleto', frozen: 0, targetFrozen: false, layered: 5 },
      cap: 'Glaciar: al congelar a uno, los de al lado ganan capas.', nodes: ['i22'] },
    { t: 5.8, value: 0, state: 'active', label: 'Aterido', t2: E.numbT, tMax: E.numbT, decayIn: null, ease: 1, fire: 'full',
      x: { enemyName: boss, boss: true, numbT: E.numbT, layered: 4 },
      cap: `Los jefes no se congelan: quedan Ateridos ${fmtN(E.numbT)} s y reciben ${E.bossStagger} de aturdimiento.`, nodes: ['i28'], tag: 'active' },
    { t: 7.8, value: 2, t2: E.numbT - 2, x: { numbT: E.numbT - 2 }, ease: 1, fire: 'gain' },
    { t: 5.8 + E.numbT, value: 3, state: 'building', label: '', t2: null, tMax: null, decayIn: every, ease: 1, x: { numbT: 0 },
      cap: `Las capas caen: una cada ${fmtN(every)} s (más despacio con Escarcha Densa).`, nodes: ['i4'] },
    { t: 5.8 + E.numbT + every - 0.6, value: 3, decayIn: 0.6, ease: 1, tag: 'decay' },
    { t: 5.8 + E.numbT + every - 0.05, value: 3, decayIn: 0.05 },
    { t: 5.8 + E.numbT + every, value: 2, decayIn: every },
    { t: 5.8 + E.numbT + every + 0.8, end: 1 },
  ];
}

function cargasDemo(T) {
  const A = T.cargas, la = A.loseAfter;
  const X = n => ({ bonusPct: A.dmgPerCharge * n, manaBack: A.manaPerCharge * n });
  const tFull = 3.6, tWarn = tFull + la - WARN_S, tLost = tFull + la;
  return [
    { t: 0, value: 0, state: 'idle', decayIn: null, hold: false, ready: null, x: { loseAfter: la, resonance: false, ...X(0) },
      cap: 'Sin Cargas Arcanas.', tag: 'idle', nodes: [] },
    { t: 1, value: 1, state: 'building', decayIn: la, fire: 'gain', ready: ['rayo'], x: X(1), cap: `Dardo Arcano: +${A.perDart} Carga por impacto (una runa se enciende).`, nodes: ['a0'] },
    { t: 2, value: 2, decayIn: la, fire: 'gain', x: X(2), tag: 'building' },
    { t: 2.8, value: 3, decayIn: la, fire: 'gain', x: X(3), cap: 'Rebote Cargado: cada enemigo que alcanzan las descargas del Orbe te da 1 Carga.', nodes: ['a5'] },
    { t: tFull, value: A.max, state: 'full', decayIn: la, fire: 'full', ease: 1, x: X(A.max),
      cap: `${A.max} Cargas: tu próximo Rayo hace +${A.dmgPerCharge * A.max} % de daño y devuelve ${A.manaPerCharge * A.max} de maná.`, nodes: ['a0'], tag: 'full' },
    { t: tWarn, decayIn: WARN_S, ease: 1, cap: `Se pierden todas ${fmtN(la)} s después de la última ganancia (más con Memoria Arcana): el arco avisa.`, nodes: ['a1'], tag: 'decay' },
    { t: tLost - 0.6, decayIn: 0.6 },
    { t: tLost - 0.5, value: 0, state: 'idle', decayIn: null, ready: null, fire: 'spent', x: X(0),
      cap: `Rayo las gasta: +${A.dmgPerCharge} % de daño y +${A.manaPerCharge} de maná por Carga.`, nodes: [] },
    { t: tLost + 0.6, value: A.max, state: 'active', label: 'Resonancia', decayIn: null, hold: true, ready: ['rayo'], fire: 'full', x: { ...X(A.max), resonance: true },
      cap: `Resonancia: con ${A.max} Cargas no se pierden y tienes +${A.resonanceCrit} % de crítico por rango.`, nodes: ['a16'], tag: 'active' },
    { t: tLost + 3, end: 1 },
  ];
}

// nodos que potencian cada barra (A3: existen en el árbol de su especialización); los números, de T
function calorNodes(T) {
  const C = T.calor;
  return {
    s5: 'Chispas: un crítico sobre un enemigo que arde te da Calor',
    s9: `Llamarada: Avivada te da ${C.llamarada} de Calor; Voraz, ${C.voraz} por enemigo`,
    s16: `Brasero: con más de ${C.brasero} de Calor, más daño`,
    s19: 'Ignición Rápida: más Calor por golpe de Fuego',
    s23: 'Combustión: al usar Ignición Total, todo tu Fuego es crítico',
    s26: 'Combustión Perpetua: en Combustión, tus críticos dan Calor',
    s28: `Corazón del Sol: Ignición Total a ${C.ignitionAt} y Calor por élite`,
  };
}
function escarchaNodes(T) {
  const E = T.escarcha;
  return {
    i0: `Escarcha: tus golpes de Hielo ponen capas; a ${E.max}, Congelado`,
    i1: 'Frío Penetrante: el Congelado dura más',
    i2: `Filo Helado: más crítico contra enemigos con ${E.critLayers} capas`,
    i4: 'Escarcha Densa: las capas caen más despacio',
    i14: 'Suelo Helado: la Prisión deja suelo que pone capas',
    i22: 'Glaciar: congelar da capas a los que están cerca',
    i28: `Corazón del Invierno: bastan ${E.max - 1} capas; congelar a un jefe lo quiebra`,
  };
}
function cargasNodes(T) {
  const A = T.cargas;
  return {
    a0: 'Cargas Arcanas: el Dardo las da y el Rayo las gasta',
    a1: 'Memoria Arcana: las Cargas duran más',
    a4: 'Potencia Acumulada: cada Carga da más al Rayo',
    a5: 'Rebote Cargado: el Orbe te da Cargas',
    a16: `Resonancia: con ${A.max} Cargas no se pierden`,
    a22: 'Cargas Desbordadas: guardas más Cargas',
    a28: 'Singularidad: las Cargas ya no se pierden',
  };
}
// capas que pone la Prisión de Hielo: las de su definición (`layers`, catálogo); si no, las de la Nova
function prisionLayers() {
  const L = MAGA_SKILLS.find(s => s.id === 'k_prision')?.layers;
  return L > 0 ? L : gaugeTuning().escarcha.nova;
}

const TT = gaugeTuning();
calor.nodes = calorNodes(TT);
escarcha.nodes = escarchaNodes(TT);
cargas.nodes = cargasNodes(TT);
calor.demo = calorDemo(TT);
escarcha.demo = escarchaDemo(TT);
cargas.demo = cargasDemo(TT);

export const MAGA_GAUGE_VIEWS = { calor, escarcha, cargas };
