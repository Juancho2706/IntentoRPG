// ============================================================
// S-maga · SENSACIÓN DE LA ARCANISTA (auditoría de la Maga, recomendados aprobados por el dueño)
// ============================================================
// Cada apartado prueba un hallazgo y falla sin su arreglo (cada uno por separado: un apartado roto no
// tapa a los demás; al final, exit 1 si alguno falla):
//   O   Orbe Arcano (M-01..M-04): viaja hacia la mira descargando a los que pasan a 1,5–3 m de su línea
//       (golpes de la habilidad, sin daño por contacto), se para 2 s, reparte las descargas entre
//       todos los que tiene cerca, vuelve a la maga y al recogerlo da 1 Carga; contra una pared se para
//       antes y vuelve igual; descarga con haz violeta y 'zap', zumba y suena al recogerlo. No retiene
//       el Dardo; las repeticiones (a23) no dan Carga; el Veloz descarga de vuelta; los dos cuerpos del
//       Gemelo van a enemigos distintos; un cambio de zona no lo deja colgado; con Satélite (a19) o
//       Constelación (a26) el que vuelve se queda 8 s en órbita y, al acabarla, se absorbe y da su
//       Carga (decisión del dueño M4: una sola con los dos; la build Orbe vuelve a sacar Cargas del Orbe)
//   R   Rayo y Haz Concentrado (M-06/M-07/M-08): un clic hace daño (el Haz pega al pulsar); el Haz es
//       un canal sin fin con rampa, gasta las Cargas al empezar (y devuelve su maná) y su haz vivo crece
//       con ellas (brillo ≤ ×1,3); 3 s de Haz rinden al menos lo que la Bola de Fuego del kit base
//   D   Desgarro canalizado (M-12): haz de 2,5 m que atraviesa a todos (5 en fila), un golpe cada 0,25 s
//       con rampa hasta +100 % y el halo del ancho que golpea; un toque no gasta la definitiva; 1 Carga
//       por golpe (no por enemigo); la grieta del suelo, donde apuntas y nunca colgada
//   F   forja por build (M-11, T5): ninguna build de la Arcanista recomienda el Haz para el Rayo; la de
//       cada build no deja sin efecto nodos que compra (needsForm); la build Rayo, el Rayo base, y su
//       UNI a Nv50 no baja de la referencia de la auditoría (banco)
//   T6  el kit de la Arcanista cuenta el rango desde el Nv10 y el libro lo dice
import assert from 'node:assert/strict';
import { makeHarness } from './helpers/power-harness.mjs';
import { buildHero, refEnemies, simulate, simulateUni, UNI_T, UNI_LIFE } from './helpers/bench-core.mjs';
// por espacio de nombres: con el código de antes (sin magaOrbs) falla su apartado, no la carga
import * as PM from '../js/powers-maga.js';
import { resolveSkillId, skillRank, rankReq } from '../js/skill-resolve.js';
import { talentTreesFor, forgeRecoFor, formVoids } from '../js/talents.js';
import { forgeView } from '../js/hud-model.js';
import { FORGE_RECO, CLASSES } from '../js/data.js';
import * as CM from '../js/combat-math.js';
import { powerState, firePower } from '../js/powers.js';
import { worldResetProjectiles } from '../js/game-skills.js';

const magaOrbs = p => (PM.magaOrbs ? PM.magaOrbs(p) : []);
const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Arma de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
// Arcanista con arma fija y sin críticos (golpe constante); build = la de los datos (o ninguna)
function hero(level, { forge = {}, build = undefined, talents = undefined } = {}) {
  const h = makeHarness({ classId: 'maga', level, spec: 'arcanista', ...(build ? { build } : {}), ...(talents ? { talents } : {}) });
  h.p.equipment.weapon = { ...WEAPON };
  h.p.skillForge = { ...forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  return h;
}
// golpes directos (sin DoT ni procs) de una habilidad que recibe un enemigo quieto
function tally(e, skill = null) {
  const t = { n: 0, sum: 0, list: [] };
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    const x = e.pos.x, z = e.pos.z;
    const d = td(a, c, o) || 0;
    e.pos.x = x; e.pos.z = z;
    if (!o.dot && !o.proc && (!skill || o.skill === skill)) { t.n++; t.sum += d; t.list.push(d); }
    return d;
  };
  return t;
}
const foe = (h, x, z = 0, skill = null) => { const e = h.enemy({ hp: 1e12, pos: [x, 0, z] }); e.t = tally(e, skill); return e; };
const near = (a, b, tol = 1e-6) => Math.abs(a - b) <= tol;
// lanza el Orbe hacia (ax, az) y avanza a 60 fps hasta que se recoge (o `max` s); traza de estados
function runOrb(h, ax, az, max = 9) {
  h.aim(ax, az); h.setSlot('k3', 'a_orbe');
  const cast = h.cast('k3');
  const o = magaOrbs(h.p)[0] || null;
  const states = new Set(), parkAt = [];
  let t = 0;
  for (; t < max; t += 1 / 60) {
    h.g.step(1 / 60);
    if (o) { states.add(o.state); if (o.state === 'quieto' && !parkAt.length) parkAt.push(o.c.x, o.c.z); }
    if (!magaOrbs(h.p).length && t > 0.1) break;
  }
  return { cast, o, states, parkAt, t };
}

// ------------------------------------------------ O · Orbe Arcano
section('O1 · el Orbe descarga a todos los que pasan a 1,5–3 m de su línea, se para 2 s y vuelve con 1 Carga', () => {
  const h = hero(30);
  const spots = [[2, 1.5], [4, -2], [6, 3], [8, 2], [9, -1.5]];
  const es = spots.map(([x, z]) => foe(h, x, z, 'a_orbe'));
  const r = runOrb(h, 8, 0);
  ok(r.cast && r.o, 'el Orbe sale');
  es.forEach((e, i) => ok(e.t.n > 0, `el enemigo en (${spots[i]}) recibe descargas (${e.t.n})`));
  // ninguno está a menos de 1,5 m de la línea: todos sus golpes son descargas (sin daño por contacto)
  es.forEach((e, i) => eq(e.t.n, r.o.zapped.get(e) || 0, `(${spots[i]}): golpes = descargas`));
  ok(r.states.has('quieto') && r.states.has('vuelta'), `se para y vuelve (${[...r.states]})`);
  ok(r.parkAt.length && near(Math.hypot(r.parkAt[0], r.parkAt[1]), 8, 0.35), `se para en la mira (${r.parkAt.map(v => v.toFixed(2))})`);
  ok(r.o.caught, 'vuelve a la maga y lo recoge');
  eq(h.gaugeValue('cargas'), 1, 'recogerlo da 1 Carga');
});
section('O2 · contra una pared, el Orbe se para antes y vuelve igual', () => {
  const h = hero(30);
  h.g.world.grid.walkable = x => x < 6;
  const a = foe(h, 4, 2, 'a_orbe'), b = foe(h, 5.5, -1.5, 'a_orbe');
  const r = runOrb(h, 12, 0);
  ok(r.parkAt.length && r.parkAt[0] < 6 && r.parkAt[0] > 4.5, `se para antes de la pared (x ${r.parkAt[0]?.toFixed(2)})`);
  ok(a.t.n > 0 && b.t.n > 0, `descarga a los dos de su lado (${a.t.n}, ${b.t.n})`);
  ok(r.o.caught && h.gaugeValue('cargas') === 1, 'vuelve y da su Carga');
});
section('O3 · quieto, reparte las descargas entre todos los que tiene a su alcance (no solo los 2 más cercanos)', () => {
  const h = hero(30);
  // cuatro alrededor del punto de parada (6, 0): dos pegados y dos a 3 m
  const es = [[6.4, 0.3], [5.7, -0.4], [6, 3], [8.8, -1]].map(([x, z]) => foe(h, x, z, 'a_orbe'));
  runOrb(h, 6, 0);
  const n = es.map(e => e.t.n);
  ok(n.every(v => v > 0), `los cuatro reciben (${n})`);
  ok(Math.max(...n) <= 2 * Math.min(...n), `repartidas (${n})`);
});
section('O4 · cada descarga: haz violeta y «zap»; zumba al volar y suena al recogerlo', () => {
  const h = hero(30);
  const beams = [];
  const sp = h.g.spawnLiveBeam.bind(h.g);
  h.g.spawnLiveBeam = o => { beams.push(o); return sp(o); };
  foe(h, 7, 1);
  const r = runOrb(h, 7, 0);
  const s = h.g.sfxLog.map(x => x.name);
  const zaps = s.filter(x => x === 'zap').length;
  ok(zaps > 0 && zaps === r.o.zapHits, `un «zap» por descarga (${zaps} de ${r.o.zapHits})`);
  ok(beams.filter(b => b.color === r.o.color && b.dur > 0).length >= r.o.zapHits, `un haz violeta por descarga (${beams.length})`);
  ok(s.includes('hum') && s.includes('absorb'), `zumbido y recogida (${[...new Set(s)]})`);
});

section('O5 · el Orbe no retiene el Dardo: con el básico mantenido, sale en el GCD (≤ 0,25 s), no al acabar su vuelo', () => {
  const h = hero(30);
  foe(h, 6, 0);
  h.aim(8, 0); h.setSlot('k3', 'a_orbe'); h.setSlot('lmb', 'm_dardo');
  h.press('k3'); h.release('k3');
  h.setHeld('lmb', true);
  let first = null;
  for (let t = 0; t < 1.5 && first == null; t += 1 / 60) {
    h.g.step(1 / 60);
    if (h.g.projectiles.some(pr => pr.skill === 'm_dardo')) first = t;
  }
  ok(first != null && first <= 0.25, `el Dardo sale a los ${first?.toFixed(2)} s del Orbe`);
});
section('O6 · las repeticiones de Orbe Múltiple (a23) descargan pero no dan Carga: solo tu Orbe', () => {
  const h = hero(30);
  h.addPowers('a_orbe_multiple');
  powerState(h.p, 'a_orbe_multiple').n = 2;   // el próximo es el 3.º
  // uno en la línea y uno a cada lado de su final: la repetición sale en abanico (±0,35 rad)
  for (const [x, z] of [[7, 0], [7.5, 2.7], [7.5, -2.7]]) foe(h, x, z, 'a_orbe');
  h.aim(8, 0); h.setSlot('k3', 'a_orbe');
  h.cast('k3');
  const seen = new Set();
  for (let t = 0; t < 9; t += 1 / 60) {
    h.g.step(1 / 60);
    for (const o of magaOrbs(h.p)) seen.add(o);
    if (t > 0.2 && !magaOrbs(h.p).length) break;
  }
  const units = [...seen];
  ok(units.length === 2 && units.some(o => o.echo) && units.every(o => o.caught), `tu Orbe y su repetición vuelven (${units.map(o => `${o.echo ? 'eco' : 'tuyo'}:${o.caught}`)})`);
  ok(units.find(o => o.echo)?.zapHits > 0, 'la repetición descarga');
  eq(h.gaugeValue('cargas'), 1, 'una sola Carga: la de tu Orbe');
});
// golpes del Orbe con la fase en que llegan (o.state) y el instante
function orbHits(h, e, getOrb) {
  const log = [];
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { const d = td(a, c, o); if (o.skill === 'a_orbe' && !o.dot && !o.proc) log.push({ state: getOrb()?.state, t: h.p.simT }); return d; };
  return log;
}
section('O7 · Orbe Veloz: no se detiene y también descarga de vuelta', () => {
  const run = forge => {
    const h = hero(30, { forge: { a_orbe: forge } });
    // a 2,5 m de la línea: fuera del golpe de vuelta (0,9 m), dentro de las descargas (4,5 m con la Mejora)
    const e = foe(h, 4, 2.5);
    let o = null;
    const log = orbHits(h, e, () => o);
    h.aim(8, 0); h.setSlot('k3', 'a_orbe');
    h.cast('k3');
    o = magaOrbs(h.p)[0];
    const states = new Set();
    for (let t = 0; t < 9; t += 1 / 60) { h.g.step(1 / 60); states.add(o.state); if (!o.alive) break; }
    return { log, states, o };
  };
  const v = run('i'), b = run(null);
  ok(!v.states.has('quieto') && v.o.caught, `el Veloz no se para y vuelve (${[...v.states]})`);
  const back = v.log.filter(x => x.state === 'vuelta').length;
  ok(back >= 1, `el Veloz descarga de vuelta (${back} de ${v.log.length})`);
  eq(b.log.filter(x => x.state === 'vuelta').length, 0, 'el Orbe base, de vuelta, solo golpea al cruzar (y este no está en su camino)');
});
section('O8 · Orbe Gemelo: contra un solo enemigo, una descarga por instante (cada cuerpo va a otro)', () => {
  const h = hero(30, { forge: { a_orbe: 'ii' } });
  const e = foe(h, 6, 0.5);
  let o = null;
  const log = orbHits(h, e, () => o);
  h.aim(6, 0); h.setSlot('k3', 'a_orbe');
  h.cast('k3');
  o = magaOrbs(h.p)[0];
  for (let t = 0; t < 9 && o.alive; t += 1 / 60) h.g.step(1 / 60);
  const zaps = log.filter(x => x.state !== 'vuelta');
  const at = new Set(zaps.map(x => x.t.toFixed(4)));
  ok(zaps.length >= 8, `descarga (${zaps.length})`);
  eq(at.size, zaps.length, `ninguna descarga doble al mismo enemigo (${zaps.length} descargas en ${at.size} instantes)`);
  // y con dos, a los dos en el mismo instante
  const h2 = hero(30, { forge: { a_orbe: 'ii' } });
  const a = foe(h2, 6, 0.5, 'a_orbe'), b2 = foe(h2, 6, -0.5, 'a_orbe');
  h2.aim(6, 0); h2.setSlot('k3', 'a_orbe');
  h2.cast('k3');
  h2.step(0.3);
  ok(a.t.n >= 1 && a.t.n === b2.t.n, `con dos, cada cuerpo a uno (${a.t.n}, ${b2.t.n})`);
});
// los apaga el siguiente Orbe (launchOrb) o el primer poder que mire magaOrbs (Inercia, Orbe Atrayente: 10 Hz)
section('O9 · cambio de zona (loadWorld vacía los proyectiles): el Orbe se apaga sin Carga, su lanzamiento termina y no se acumula', () => {
  const zone = () => {
    const h = hero(30);
    foe(h, 6, 0);
    h.aim(8, 0); h.setSlot('k3', 'a_orbe');
    h.cast('k3');
    const o = magaOrbs(h.p)[0];
    let done = 0;
    const od = o.onDone; o.onDone = x => { done++; od?.(x); };
    h.step(0.5);
    h.g.projectiles = [];   // como Game.loadWorld
    h.step(0.2);
    return { h, o, done: () => done };
  };
  const a = zone();
  a.h.p.cds.a_orbe = 0; a.h.p.gcdT = 0; a.h.p.actionLockT = 0;
  a.h.cast('k3');
  ok(!a.o.alive && a.o.state === 'fin' && !a.o.caught, `el siguiente Orbe apaga el de la zona anterior (${a.o.state})`);
  ok(a.done() === 1, 'y su lanzamiento termina (cast.done)');
  eq(magaOrbs(a.h.p).length, 1, 'solo queda el nuevo');
  eq(a.h.gaugeValue('cargas'), 0, 'sin Carga');
  const b = zone();
  eq(magaOrbs(b.h.p).length, 0, 'magaOrbs (los poderes) tampoco lo ve');
  ok(!b.o.alive && b.done() === 1, 'y también lo apaga');
  // con el aviso del motor (Game.loadWorld → worldResetProjectiles antes de vaciar, X1), en el acto
  const c = hero(30);
  c.aim(8, 0); c.setSlot('k3', 'a_orbe'); c.cast('k3');
  const oc = magaOrbs(c.p)[0];
  c.step(0.3);
  eq(worldResetProjectiles(c.g.projectiles), 1, 'worldResetProjectiles avisa al Orbe');
  ok(!oc.alive && !oc.caught && c.gaugeValue('cargas') === 0, 'onWorldReset lo apaga en el acto, sin Carga');
});
section('O10 · Satélite (a19) y Constelación (a26): el Orbe que vuelve no se absorbe aún (sin Carga) y se queda 8 s en órbita', () => {
  const run = (power, preset = null) => {
    const h = hero(30);
    h.addPowers(power);
    if (preset) Object.assign(powerState(h.p, power), preset);
    foe(h, 7, 1);
    const r = runOrb(h, 8, 0);
    return { h, r };
  };
  const c = run('a_constelacion');
  ok(c.r.o.caught && c.r.o.orbited, 'Constelación: vuelve y se queda');
  eq(c.h.gaugeValue('cargas'), 0, 'Constelación: no da su Carga');
  const co = powerState(c.h.p, 'a_constelacion').orbs;
  ok(co.length === 1 && near(co[0].until - c.h.p.simT, 8, 0.05), `Constelación: 1 orbe en órbita 8 s (${co.map(x => (x.until - c.h.p.simT).toFixed(2))})`);
  ok(!c.h.g.sfxLog.some(x => x.name === 'absorb'), 'Constelación: sin el sonido de recogerlo');
  const s = run('a_satelite', { n: 2 });
  ok(s.r.o.orbited, 'Satélite: el 3.er Orbe se queda');
  eq(s.h.gaugeValue('cargas'), 0, 'Satélite: no da su Carga');
  const sa = powerState(s.h.p, 'a_satelite').sats;
  ok(sa.length === 1 && near(sa[0].until - s.h.p.simT, 8, 0.05), `Satélite: en órbita 8 s (${sa.map(x => (x.until - s.h.p.simT).toFixed(2))})`);
  const s1 = run('a_satelite');
  ok(!s1.r.o.orbited && s1.h.gaugeValue('cargas') === 1 && !powerState(s1.h.p, 'a_satelite').sats.length, 'Satélite: el 1.º se absorbe (Carga) y no se queda');
});
section('O11 · decisión del dueño M4: al ACABAR la órbita, el Orbe se absorbe y da su Carga (una con los dos poderes); la build Orbe vuelve a sacar Cargas del Orbe', () => {
  const absorbs = h => h.g.sfxLog.filter(x => x.name === 'absorb').length;
  for (const [powers, preset] of [[['a_constelacion'], null], [['a_satelite'], { n: 2 }], [['a_satelite', 'a_constelacion'], { n: 2 }]]) {
    const h = hero(30);
    h.addPowers(...powers);
    if (preset) Object.assign(powerState(h.p, 'a_satelite'), preset);
    const r = runOrb(h, 8, 0);
    const tag = powers.join(' + ');
    ok(r.o.orbited && h.gaugeValue('cargas') === 0, `${tag}: vuelve y se queda en órbita, aún sin Carga`);
    h.step(7.7);
    ok(h.gaugeValue('cargas') === 0 && !r.o.absorbed, `${tag}: a los 7,7 s de órbita, todavía no`);
    h.step(0.5);
    eq(h.gaugeValue('cargas'), 1, `${tag}: al acabar la órbita, su Carga (una sola)`);
    ok(r.o.absorbed && absorbs(h) === 1, `${tag}: se absorbe con el sonido de recogerlo (${absorbs(h)})`);
  }
  // Constelación guarda hasta 3: el 4.º echa al más viejo, que se absorbe ya (su Carga no se pierde).
  // Cuatro Orbes que vuelven a la vez (⑦ marca el lanzamiento, ③ los pone en órbita)
  const c = hero(30);
  c.addPowers('a_constelacion');
  const back = [];
  for (let i = 0; i < 4; i++) {
    const cast = { sk: { id: 'a_orbe' } };
    firePower('onCast', c.p, c.g, c.p, cast);
    const o = { orbited: !!cast.orbit?.constelacion };
    cast.orbs = [o];
    back.push(o);
    firePower('afterCast', c.p, c.g, c.p, cast, {});
  }
  ok(back.every(o => o.orbited) && back[0].absorbed && !back.slice(1).some(o => o.absorbed), 'Constelación: el 4.º Orbe echa de la órbita al 1.º, que se absorbe');
  eq(c.gaugeValue('cargas'), 1, 'Constelación: y da su Carga');
  // con los dos poderes, el que echa Constelación sigue girando en Satélite: se absorbe al acabar esa órbita
  const d = hero(30);
  d.addPowers('a_satelite', 'a_constelacion');
  Object.assign(powerState(d.p, 'a_satelite'), { n: 2 });
  const both = [];
  for (let i = 0; i < 4; i++) {
    const cast = { sk: { id: 'a_orbe' } };
    firePower('onCast', d.p, d.g, d.p, cast);
    const o = { orbited: !!cast.orbit };
    cast.orbs = [o];
    both.push(o);
    firePower('afterCast', d.p, d.g, d.p, cast, {});
  }
  ok(!both[0].absorbed && d.gaugeValue('cargas') === 0, 'los dos: el 1.º sale de Constelación pero sigue en Satélite (aún sin Carga)');
  d.tick(8.2);
  ok(both.every(o => o.absorbed) && d.gaugeValue('cargas') === 4, `los dos: al acabar las órbitas, una Carga por Orbe (${d.gaugeValue('cargas')})`);
  // la build Orbe (Constelación, Nv70): 3 Orbes en órbita dan sus 3 Cargas al acabarla (antes, ninguna)
  // (seguidos, 0,3 s entre uno y otro, para que vuelvan antes de que acabe la primera órbita)
  const b = hero(70, { build: 'orbe' });
  b.aim(8, 0); b.setSlot('k3', 'a_orbe');
  const orbs = [];
  for (let i = 0; i < 3; i++) {
    b.p.cds.a_orbe = 0; b.p.gcdT = 0; b.p.actionLockT = 0; b.p.mp = b.p.stats.maxMP;
    b.cast('k3');
    orbs.push(magaOrbs(b.p).at(-1));
    b.step(0.3);
  }
  for (let t = 0; t < 9 && magaOrbs(b.p).length; t += 1 / 60) b.g.step(1 / 60);
  ok(orbs.every(o => o?.orbited) && b.gaugeValue('cargas') === 0, `build Orbe: sus 3 Orbes en órbita, sin Carga aún (${b.gaugeValue('cargas')})`);
  b.step(8.2);
  eq(b.gaugeValue('cargas'), 3, 'build Orbe: al acabar sus órbitas, las 3 Cargas de sus Orbes');
});

// ------------------------------------------------ R · Rayo y Haz Concentrado
section('R1 · un clic con el Rayo hace daño (base y Haz Concentrado)', () => {
  for (const v of [null, 'ii']) {
    const h = hero(50, { forge: { rayo: v } });
    const e = foe(h, 5, 0, 'rayo');
    h.aim(5, 0); h.setSlot('rmb', 'rayo');
    h.press('rmb'); h.step(0.05); h.release('rmb'); h.step(0.3);
    ok(e.t.n >= 1, `${v ? 'Haz' : 'Rayo base'}: ${e.t.n} golpe(s) con un clic de 0,05 s`);
  }
});
section('R2 · el Haz es un canal sin fin con rampa, gasta las Cargas al empezar y su haz crece con ellas', () => {
  const run = (cargas) => {
    const h = hero(50, { forge: { rayo: 'ii' } });
    const e = foe(h, 5, 0, 'rayo');
    h.aim(5, 0); h.setSlot('rmb', 'rayo'); h.gauge('cargas', cargas);
    h.p.mp = 100;
    h.press('rmb');
    const first = e.t.n, spent = h.gaugeValue('cargas'), mp = h.p.mp;
    const beam0 = h.g.channelInfo()?.beam;
    const w0 = beam0?.width || 0, glow0 = beam0?.intensity || 0;
    h.p.mp = h.p.stats.maxMP;
    h.step(2.5);
    const info = h.g.channelInfo();
    h.release('rmb'); h.step(0.05);
    return { first, spent, mp, w0, glow0, info, list: e.t.list };
  };
  const a = run(0), b = run(4);
  eq(a.first, 1, 'pega al pulsar');
  ok(a.info?.endless && a.info.id === 'rayo', 'canal sin fin del Rayo');
  ok(a.list.length >= 12, `un tic cada 0,2 s (${a.list.length} en 2,5 s)`);
  ok(near(a.list.at(-1) / a.list[0], 2, 0.02), `rampa hasta +100 % (${(a.list.at(-1) / a.list[0]).toFixed(2)})`);
  eq(b.spent, 0, 'las 4 Cargas se gastan al primer tic');
  ok(b.list[0] > a.list[0] * 2 && near(b.list.at(-1) / b.list[0], a.list.at(-1) / a.list[0], 0.02), 'su bono vale todo el canal');
  ok(b.w0 > a.w0 * 1.7, `el haz crece con las Cargas (${a.w0.toFixed(2)} → ${b.w0.toFixed(2)})`);
  ok(b.info?.beam && b.info.beam.width >= b.w0 * 1.9, `y ×2 al tope de la rampa (${b.info?.beam?.width?.toFixed(2)})`);
  // el maná de las Cargas (5 por Carga) vuelve en el 1.er tic, como con el Rayo de un golpe
  eq(b.mp - a.mp, 4 * 5, `devuelve 5 de maná por Carga en el 1.er tic (${a.mp.toFixed(1)} → ${b.mp.toFixed(1)})`);
  // brillo con tope (en aditivo, más lo satura a blanco): más con Cargas, nunca por encima de ×1,3
  ok(b.glow0 > a.glow0 && b.glow0 <= 1.3 + 1e-9, `brillo ${a.glow0.toFixed(2)} → ${b.glow0.toFixed(2)} (≤ 1,3)`);
});
section('R3 · 3 s de Haz rinden al menos lo que la Bola de Fuego del kit base al mismo nivel', () => {
  const haz = hero(50, { forge: { rayo: 'ii' } });
  const e = foe(haz, 5, 0);
  haz.aim(5, 0); haz.setSlot('rmb', 'rayo');
  haz.press('rmb'); haz.step(3); haz.release('rmb');
  const hazDps = e.t.sum / 3;
  const bola = hero(50);
  const f = foe(bola, 5, 0);
  bola.aim(5, 0); bola.setSlot('rmb', 'bola_fuego');
  bola.press('rmb'); bola.step(9); bola.release('rmb');
  const bolaDps = f.t.sum / 9;
  ok(bolaDps > 0 && hazDps >= bolaDps, `Haz ${hazDps.toFixed(0)}/s ≥ Bola de Fuego ${bolaDps.toFixed(0)}/s`);
});

// ------------------------------------------------ D · Desgarro canalizado
section('D1 · el Desgarro es un haz ancho: los 5 en fila reciben todos los golpes; el de al lado, ninguno', () => {
  const h = hero(50, { forge: { m_u_desgarro: null } });
  // a 1,4 m de la línea a uno y otro lado: dentro de un haz de 2,5 m, fuera de uno de 1,2 m (el del Rayo)
  const row = [2, 4, 6, 8, 9.5].map((x, i) => foe(h, x, i % 2 ? 1.4 : -1.4, 'm_u_desgarro'));
  const side = foe(h, 5, 3, 'm_u_desgarro');
  h.aim(9, 0); h.setSlot('k4', 'm_u_desgarro');
  h.press('k4');
  eq(row[0].t.n, 0, 'nada al pulsar (soltar antes del 1.er golpe devuelve la definitiva: D2)');
  h.step(0.26);
  eq(row[0].t.n, 1, 'el 1.er golpe, a los 0,25 s');
  h.step(2.7);
  // al tope de la rampa: el halo sigue midiendo lo que golpea (2,5 m) y crecen el núcleo y el brillo
  const beam = h.g.channelInfo()?.beam;
  ok(beam && near(beam.width, 2.5) && near(beam.core, 0.8) && near(beam.intensity, 1.15), `haz vivo al tope: halo ${beam?.width} m (lo que golpea), núcleo ${beam?.core} m, brillo ${beam?.intensity}`);
  h.step(0.14); h.release('k4');
  const n = row.map(e => e.t.n);
  ok(n.every(v => v === 12), `12 golpes a cada uno de los 5 (${n})`);
  eq(side.t.n, 0, 'fuera del haz (a 3 m de la línea) no recibe');
  ok(near(row[0].t.list.at(-1) / row[0].t.list[0], 2, 0.02), `rampa hasta +100 % (${(row[0].t.list.at(-1) / row[0].t.list[0]).toFixed(2)})`);
  eq(h.gaugeValue('cargas'), 4, 'una Carga por golpe del haz (hasta 4)');
});
section('D2 · un toque del Desgarro (soltar antes del 1.er golpe) no gasta la definitiva', () => {
  const h = hero(50, { forge: { m_u_desgarro: null } });
  const e = foe(h, 5, 0, 'm_u_desgarro');
  h.aim(9, 0); h.setSlot('k4', 'm_u_desgarro');
  h.press('k4'); h.step(0.05); h.release('k4'); h.step(0.5);
  eq(e.t.n, 0, 'ningún golpe');
  ok(!((h.p.cds?.m_u_desgarro || 0) > 0), `enfriamiento devuelto (${(h.p.cds?.m_u_desgarro || 0).toFixed(1)} s pendientes)`);
  eq(h.gaugeValue('cargas'), 0, 'ninguna Carga');
  h.press('k4'); h.step(0.3);
  eq(e.t.n, 1, 'y se puede canalizar en el acto');
  h.release('k4');
});
section('D3 · el haz ancho da UNA Carga por golpe aunque atraviese a varios', () => {
  const h = hero(50, { forge: { m_u_desgarro: null } });
  const es = [3, 5, 7].map(x => foe(h, x, 0, 'm_u_desgarro'));
  h.aim(9, 0); h.setSlot('k4', 'm_u_desgarro');
  h.press('k4'); h.step(0.3);
  ok(es.every(e => e.t.n === 1), `el 1.er golpe alcanza a los 3 (${es.map(e => e.t.n)})`);
  eq(h.gaugeValue('cargas'), 1, '1 Carga (no 3)');
  h.step(0.25);
  eq(h.gaugeValue('cargas'), 2, '2 golpes, 2 Cargas');
  h.release('k4');
});
section('D4 · la grieta del haz: donde apuntas, alineada con él; se apaga al soltar y, si falta el fin del canal (al morir), sola', () => {
  const live = h => (h.g.fields || []).filter(f => !f.dead && f.kind === 'a_desgarro_grieta');
  const h = hero(50, { forge: { m_u_desgarro: null } });
  foe(h, 5, 0);
  h.aim(6, 6); h.setSlot('k4', 'm_u_desgarro');
  h.press('k4'); h.step(1);
  const [f] = live(h);
  ok(f && near(f.pos.x, 6, 1e-6) && near(f.pos.z, 6, 1e-6), `en la mira, sobre el haz (${f?.pos.x.toFixed(2)}, ${f?.pos.z.toFixed(2)})`);
  ok(f && near(f.data.ang, Math.PI / 4, 1e-6), `alineada con el haz (${f?.data.ang?.toFixed(3)} rad)`);
  // giras la mira: la grieta la sigue
  h.aim(6, -6); h.step(0.3);
  ok(f && !f.dead && near(f.pos.z, -6, 1e-6) && near(f.data.ang, -Math.PI / 4, 1e-6), `sigue la mira (${f?.pos.z.toFixed(2)}, ${f?.data.ang?.toFixed(3)} rad)`);
  h.release('k4'); h.step(0.05);
  eq(live(h).length, 0, 'al soltar, ninguna grieta viva');
  // al morir, resetCastState quita el canal sin su fin: la grieta dura 2 golpes y cada golpe la renovaba
  const d = hero(50, { forge: { m_u_desgarro: null } });
  foe(d, 5, 0);
  d.aim(9, 0); d.setSlot('k4', 'm_u_desgarro');
  d.press('k4'); d.step(1);
  d.p.alive = false; d.g.resetCastState();
  d.step(0.6);
  eq(live(d).length, 0, 'muerta, la grieta se apaga sola (≤ 0,5 s)');
});

// ------------------------------------------------ F · forja por build (M-11, T5)
section('F1 · ninguna build de la Arcanista recomienda el Haz; la de cada build no deja nodos comprados sin efecto', () => {
  const builds = Object.entries(talentTreesFor('maga').builds).filter(([, b]) => b.sp === 'arcanista');
  ok(builds.length === 4, `cuatro builds (${builds.map(([k]) => k)})`);
  ok(forgeRecoFor('maga', 'arcanista').rayo !== 'ii', 'sin build (la por defecto): no el Haz');
  for (const [key] of builds) {
    const reco = forgeRecoFor('maga', 'arcanista', key);
    ok(reco.rayo !== 'ii', `${key}: el Rayo no es el Haz (${reco.rayo})`);
    const h = makeHarness({ classId: 'maga', level: 100, spec: 'arcanista', build: key });
    const voids = sk => { h.p.skillForge = { ...sk }; h.p.recompute(); return ['rayo', 'm_u_desgarro', 'a_orbe'].flatMap(id => formVoids(h.p, id, resolveSkillId(h.p, id).def).map(v => v.id)); };
    eq(voids(reco).join(','), '', `${key}: su forja no deja nodos sin efecto`);
    if (key === 'grieta') ok(voids(FORGE_RECO.arcanista).length >= 4, `grieta con la de la especialización (Quiebre) sí: ${voids(FORGE_RECO.arcanista)}`);
  }
  const s = talentTreesFor('maga').specs.find(x => x.id === 'arcanista');
  for (const id of ['a7', 'a10', 'a14', 'a21', 'a27']) eq(s.nodes.find(n => n.id === id)?.needsForm?.m_u_desgarro, 'channel', `${id} pide el Desgarro canalizado`);
});
// la build Rayo (UNI) lanza el Rayo base: ni el Haz (lo que pide T5) ni Rayo en Cadena, la variante de ÁREA (en
// UNI rinde lo mismo y solo le regalaba área). Su UNI a Nv50 no baja del de la auditoría con el Rayo base (1682)
section('F2 · la build Rayo recomienda el Rayo base y la Arcanista Nv50 no baja de su UNI de referencia (banco)', () => {
  const al = CM.areaLevelForHero(50), ref = refEnemies(al);
  const mk = forge => buildHero('maga', 50, 'tipico', { al, seed: 1, spec: 'arcanista', move: true, build: 'rayo', forge });
  eq(forgeRecoFor('maga', 'arcanista', 'rayo').rayo, null, 'la build Rayo: el Rayo sin variante');
  const reco = mk('reco');
  ok(!reco.skillForge.rayo, `la del banco es la de la build (${JSON.stringify(reco.skillForge)})`);
  const b = simulate(mk('reco'), ref.boss, 2, { kind: 'boss', ref });
  const hp = ref.boss * UNI_LIFE / Math.max(1, b.ttk);
  const u = simulateUni(reco, ref, UNI_T, { hp }).dps;
  ok(u >= 1682, `UNI con la forja de la build ${u.toFixed(1)} ≥ 1682 (auditoría, Rayo base)`);
});

// ------------------------------------------------ T6 · rango del kit de la Arcanista
section('T6 · el kit de la Arcanista cuenta el rango desde el Nv10 y el libro lo dice', () => {
  const kit = CLASSES.maga.skills.filter(s => s.spec === 'arcanista');
  ok(['a_orbe', 'rayo', 'm_u_desgarro'].every(id => kit.some(s => s.id === id)), 'Orbe, Rayo y Desgarro en el kit');
  const p18 = hero(18).p, p26 = hero(26).p;
  for (const sk of kit) {
    eq(rankReq(sk), 10, `${sk.id}: rankReq 10`);
    eq(skillRank(p18, sk), 2, `${sk.id}: rango 2 a Nv18`);
    eq(skillRank(p26, sk), 3, `${sk.id}: rango 3 a Nv26`);
    eq(forgeView(p18, sk).nextRankLv, 26, `${sk.id}: el libro anuncia el rango 3 al Nv26`);
  }
});

if (fails.length) { console.error(`\n❌ SENSACIÓN · ARCANISTA (S-maga): ${fails.length} apartado(s) fallan: ${fails.join(' · ')}`); process.exit(1); }
console.log(`\n✅ SENSACIÓN · ARCANISTA (S-maga): ${checks} comprobaciones`);
