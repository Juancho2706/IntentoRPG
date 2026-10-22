// ============================================================
// S-maga · SENSACIÓN DE LA ARCANISTA (auditoría de la Maga, recomendados aprobados por el dueño)
// ============================================================
// Cada apartado prueba un hallazgo y falla sin su arreglo (cada uno por separado: un apartado roto no
// tapa a los demás; al final, exit 1 si alguno falla):
//   O   Orbe Arcano (M-01..M-04): viaja hacia la mira descargando a los que pasan a 1,5–3 m de su línea
//       (golpes de la habilidad, sin daño por contacto), se para 2 s, reparte las descargas entre
//       todos los que tiene cerca, vuelve a la maga y al recogerlo da 1 Carga; contra una pared se para
//       antes y vuelve igual; descarga con haz violeta y 'zap', zumba y suena al recogerlo
//   R   Rayo y Haz Concentrado (M-06/M-07/M-08): un clic hace daño (el Haz pega al pulsar); el Haz es
//       un canal sin fin con rampa, gasta las Cargas al empezar y su haz vivo crece con ellas; 3 s de
//       Haz rinden al menos lo que la Bola de Fuego del kit base al mismo nivel
//   D   Desgarro canalizado (M-12): haz de 2,5 m que atraviesa a todos (5 en fila), 1.er golpe al
//       pulsar, rampa hasta +100 %, 1 Carga por golpe del haz
//   F   forja por build (M-11, T5): ninguna build de la Arcanista recomienda el Haz para el Rayo; la de
//       cada build no deja sin efecto nodos que compra (needsForm); con la de la build Rayo, la
//       Arcanista Nv50 no baja de su UNI con el Rayo base (banco)
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
section('O3 · quieto, reparte las descargas entre todos los que tiene a 3,5 m (no solo los 2 más cercanos)', () => {
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
    h.press('rmb');
    const first = e.t.n, spent = h.gaugeValue('cargas');
    const w0 = h.g.channelInfo()?.beam?.width || 0;
    h.step(2.5);
    const info = h.g.channelInfo();
    h.release('rmb'); h.step(0.05);
    return { first, spent, w0, info, list: e.t.list };
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
  eq(row[0].t.n, 1, 'el 1.er golpe, al pulsar');
  h.step(3.1); h.release('k4');
  const n = row.map(e => e.t.n);
  ok(n.every(v => v === 13), `13 golpes a cada uno de los 5 (${n})`);
  eq(side.t.n, 0, 'fuera del haz (a 3 m de la línea) no recibe');
  ok(near(row[0].t.list.at(-1) / row[0].t.list[0], 2, 0.02), `rampa hasta +100 % (${(row[0].t.list.at(-1) / row[0].t.list[0]).toFixed(2)})`);
  eq(h.gaugeValue('cargas'), 4, 'una Carga por golpe del haz (hasta 4)');
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
section('F2 · con la forja de la build Rayo, la Arcanista Nv50 no baja de su UNI con el Rayo base (banco)', () => {
  const al = CM.areaLevelForHero(50), ref = refEnemies(al);
  const mk = forge => buildHero('maga', 50, 'tipico', { al, seed: 1, spec: 'arcanista', move: true, build: 'rayo', forge });
  const base = { ...forgeRecoFor('maga', 'arcanista', 'rayo'), rayo: null };
  const b = simulate(mk(base), ref.boss, 2, { kind: 'boss', ref });
  const hp = ref.boss * UNI_LIFE / Math.max(1, b.ttk);
  const reco = mk('reco');
  ok(reco.skillForge.rayo !== 'ii', `la del banco es la de la build (${JSON.stringify(reco.skillForge)})`);
  const u = simulateUni(reco, ref, UNI_T, { hp }).dps, u0 = simulateUni(mk(base), ref, UNI_T, { hp }).dps;
  ok(u >= u0 - 1e-6, `UNI con la forja de la build ${u.toFixed(1)} ≥ con el Rayo base ${u0.toFixed(1)}`);
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
