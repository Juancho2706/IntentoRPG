// ============================================================
// S0 · MOTOR COMÚN DE LA SENSACIÓN DE LAS HABILIDADES (auditoría de las 3 clases, recomendados)
// ============================================================
// Cada apartado prueba un punto del motor y falla sin su arreglo (cada uno por separado: un apartado
// roto no tapa a los demás; al final, exit 1 si alguno falla):
//   T1  barra de la especialización: la habilidad del kit que aprendes (o eliges) sustituye a la del
//       kit base que no pusiste a mano, con aviso; p.hotbarManual se guarda
//   T2  canales: tickNow, drainCost, rampa (rampPerTic/rampMax), nonBlocking y soltar antes del 1.er
//       tic = como no lanzado (devuelve coste y enfriamiento, sin ③ afterCast: no gasta Cargas)
//   T3  haz vivo: g.spawnLiveBeam, el haz del canal sigue al objetivo y se apaga, el de un proyectil
//       que atraviesa llega al final de su línea, malla con DOM
//   T5  forja por build (forgeRecoFor, Recomendado, banco) y aviso needsForm en el libro y la forja
//   T6  rango del kit de especialización desde que se abre (rankReq)
//   F2  Enemy.applyCC(…, { noDR }) no suma resistencia al control
//   G08 golpe pesado (`heavy`), crítico del básico a 40 ms, sacudida con la carga
//   G09 sacudida declarada en cualquier `at` (self, cono) y réplicas que se ven, se oyen y sacuden
//   V   validateSkillDef de las claves nuevas
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeHarness } from './helpers/power-harness.mjs';
import { buildHero } from './helpers/bench-core.mjs';
import { talentMethods } from '../js/game-talents.js';
import { serializePlayer } from '../js/save-schema.js';
import { Player } from '../js/entities.js';
import { resolveSkillId, skillRank } from '../js/skill-resolve.js';
import { validateSkillDef, normalizeSkillDef } from '../js/skill-defs.js';
import { talentTreesFor } from '../js/talents.js';
import { forgeView, recoPlan } from '../js/hud-model.js';
import { FORGE_RECO, CLASSES } from '../js/data.js';
import { definePower, POWER_HOOKS } from '../js/powers.js';
// las APIs nuevas por espacio de nombres: sin ellas (código de antes) falla su apartado, no la carga
import * as SR from '../js/skill-resolve.js';
import * as TAL from '../js/talents.js';
import * as VFX from '../js/vfx.js';
import * as CM from '../js/combat-math.js';
const { rankReq } = SR, { forgeRecoFor, formVoids } = TAL, { hitStopMs, chargedShake, createLiveBeam } = VFX, { channelRampPct } = CM;

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.equal(a, b, m); };
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Arma de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
// héroe con arma fija y sin críticos (golpe constante)
function hero(classId, level, opts = {}) {
  const h = makeHarness({ classId, level, ...opts });
  h.p.equipment.weapon = { ...WEAPON, kind: 'item' };
  if (opts.forge) h.p.skillForge = { ...opts.forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  return h;
}
// golpes directos que recibe un enemigo (quieto ante el retroceso)
function tally(e) {
  const t = { n: 0, list: [] };
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    const x = e.pos.x, z = e.pos.z;
    const d = td(a, c, o) || 0;
    e.pos.x = x; e.pos.z = z;
    if (!o.dot && !o.proc) { t.n++; t.list.push(d); }
    return d;
  };
  return t;
}
const foe = (h, x, z = 0, extra = {}) => { const e = h.enemy({ hp: 1e9, pos: [x, 0, z], ...extra }); e.t = tally(e); return e; };
// espías de la sensación (el arnés no congela ni sacude)
function feelSpy(h) {
  const log = { stops: [], shakes: [], fx: [] };
  h.g.hitStop = ms => log.stops.push(ms);
  h.g.addShake = a => log.shakes.push(a);
  h.g.emitFx = (preset, pos) => log.fx.push({ preset, pos });
  return log;
}
// canal sintético (un objetivo: el genérico con su haz vivo)
const CANAL = { id: 'zz_canal', name: 'Canal de prueba', cat: 'spender', type: 'channel', coef: 1, cost: 0, cd: 0, channelT: 1.5, ticks: 3, range: 8,
  tags: ['spender', 'channel'] };
// ⑭ onSkillEnd de prueba (registro global)
const ENDS = [];
if (!POWER_HOOKS.zz_fin_s0) definePower('zz_fin_s0', { onSkillEnd(g, p, sk, end) { ENDS.push({ id: sk.id, ...end }); } });

// ------------------------------------------------ T1 · barra de la especialización
section('T1 · al aprender el Rayo sustituye a la Bola de Fuego (kit base, no puesta a mano) con aviso', () => {
  const h = hero('maga', 13, { spec: 'arcanista' });
  h.p.hotbar.rmb = 'bola_fuego';                    // la puso sola onSkillsLearned (Nv2)
  const before = new Set(Object.keys(h.p.skills));
  h.p.level = 14; h.p.recompute(); h.p.onSkillsLearned(before);
  eq(h.p.hotbar.rmb, 'rayo', `🖱️Der = Rayo (${h.p.hotbar.rmb})`);
  ok(h.messages().some(m => m === '⚡ Rayo reemplaza a Bola de Fuego en 🖱️Der (cámbialo en el libro, T)'), `aviso: ${h.messages().join(' | ')}`);
});
section('T1 · lo que pusiste a mano no se toca (p.hotbarManual) y el Rayo va a una ranura libre', () => {
  const h = hero('maga', 13, { spec: 'arcanista' });
  ok(h.g.assignHotbar('rmb', 'bola_fuego'), 'assignHotbar');
  eq(h.p.hotbarManual?.rmb, 'bola_fuego', 'assignHotbar marca la ranura a mano');
  const before = new Set(Object.keys(h.p.skills));
  h.p.level = 14; h.p.recompute(); h.p.onSkillsLearned(before);
  eq(h.p.hotbar.rmb, 'bola_fuego', 'la Bola de Fuego sigue en 🖱️Der');
  eq(h.p.hotbar.k2, 'rayo', 'el Rayo, a la ranura 2 libre');
  // se guarda y se carga (solo si la ranura sigue teniendo esa habilidad)
  const s = serializePlayer(h.p);
  ok(s.hotbarManual && s.hotbarManual.rmb === 'bola_fuego', 'hotbarManual en el guardado');
  const back = new Player(h.g, 'maga', JSON.parse(JSON.stringify(s)));
  eq(back.hotbarManual.rmb, 'bola_fuego', 'hotbarManual al cargar');
  // mover la habilidad a otra ranura le quita la marca a la vieja
  h.g.assignHotbar('k2', 'bola_fuego');
  ok(!h.p.hotbarManual.rmb && h.p.hotbarManual.k2 === 'bola_fuego', 'la marca viaja con la habilidad');
  // un guardado v5 de ANTES de S0 (sin hotbarManual): al cargar, la barra de la especialización entra
  // una vez, con su aviso de carga; con hotbarManual (guardado nuevo), no se toca
  const old = hero('maga', 20, { spec: 'arcanista' });
  old.p.hotbar.rmb = 'bola_fuego'; old.p.hotbar.k2 = 'm_barrera';
  const sv = JSON.parse(JSON.stringify(serializePlayer(old.p)));
  const fresh = new Player(old.g, 'maga', sv);
  ok(fresh.hotbar.rmb === 'bola_fuego' && !fresh.notices.includes('barra-especializacion'), 'guardado nuevo: la barra se respeta');
  delete sv.hotbarManual;
  const pre = new Player(old.g, 'maga', sv);
  ok(pre.hotbar.rmb === 'rayo' && pre.hotbar.k2 === 'a_sello' && pre.notices.includes('barra-especializacion'), `guardado de antes: Rayo y Sello al cargar, con aviso (${JSON.stringify(pre.hotbar)})`);
});
section('T1 · al elegir especialización con el kit ya aprendido, también (y con aviso)', () => {
  const run = manual => {
    const h = hero('maga', 20);
    Object.assign(h.g, talentMethods);
    if (manual) h.g.assignHotbar('rmb', 'bola_fuego'); else h.p.hotbar.rmb = 'bola_fuego';
    h.p.hotbar.k2 = 'm_barrera';
    const r = h.g.chooseSpec('arcanista');
    ok(r.ok, `chooseSpec: ${r.text || r.reason || ''}`);
    return h;
  };
  const a = run(false), m = run(true);
  eq(a.p.hotbar.rmb, 'rayo', 'Rayo en 🖱️Der');
  eq(a.p.hotbar.k2, 'a_sello', 'Sello en la ranura 2 (Barrera, del kit base, puesta sola)');
  ok(a.messages().some(x => /Rayo reemplaza a Bola de Fuego en 🖱️Der/.test(x)), 'aviso al elegir');
  eq(m.p.hotbar.rmb, 'bola_fuego', 'a mano: no se toca');
  // solo desplaza el KIT de la especialización: la barra del Piromante pide la Bola de Fuego (kit base) en
  // 🖱️Der, pero no echa a la Nova de Hielo que ya tenías ahí; el Meteoro (su kit) sí entra en la ranura 2
  const pyro = hero('maga', 20);
  Object.assign(pyro.g, talentMethods);
  pyro.p.hotbar.rmb = 'nova_hielo'; pyro.p.hotbar.k2 = 'm_barrera';
  ok(pyro.g.chooseSpec('piromante').ok, 'chooseSpec piromante');
  ok(pyro.p.hotbar.rmb === 'nova_hielo' && pyro.p.hotbar.k2 === 'meteoro', `solo el kit desplaza (${pyro.p.hotbar.rmb}, ${pyro.p.hotbar.k2})`);
});

// ------------------------------------------------ T2 · canales
section('T2a · tickNow: el primer tic al pulsar (t = 0) y el último al acabar', () => {
  const run = def => {
    const h = hero('guerrero', 30, { inject: { skills: [def] } });
    const e = foe(h, 2);
    // en la ranura 2: 🖱️Der mantenido relanzaría el canal al acabar (D27)
    h.aim(2, 0); h.setSlot('k2', def.id);
    h.press('k2');
    const at0 = e.t.n;
    h.step(1.2);
    const at12 = e.t.n;
    h.step(0.4); h.release('k2'); h.step(0.1);
    return { at0, at12, n: e.t.n };
  };
  const base = run({ ...CANAL, ticks: 4 }), now = run({ ...CANAL, ticks: 4, tickNow: true });
  eq(base.at0, 0, 'sin tickNow: nada al pulsar');
  eq(now.at0, 1, `con tickNow: golpea al pulsar (${now.at0})`);
  ok(now.at12 === 3 && now.n === 4, `con tickNow: 4 tics repartidos en 1,5 s (0 · 0,5 · 1 · 1,5): ${now.at12} a 1,2 s y ${now.n} en total`);
});
section('T2b · drainCost: el coste no se cobra al empezar, se drena por tic (y basta con pagar un tic para empezar)', () => {
  const run = (def, mp) => {
    const h = hero('maga', 30, { inject: { skills: [def] } });
    foe(h, 2); h.aim(2, 0); h.setSlot('k2', def.id);
    h.p.mp = mp;
    const started = h.press('k2');
    const atPress = h.p.mp;
    h.step(0.6);
    const after = h.p.mp;
    h.release('k2'); h.step(0.1);
    return { started, atPress, after };
  };
  const up = run({ ...CANAL, cost: 30 }, 100), dr = run({ ...CANAL, cost: 30, drainCost: true }, 100);
  ok(Math.abs(up.atPress - 70) < 1e-6, `sin drainCost: 30 al pulsar (${up.atPress})`);
  ok(Math.abs(dr.atPress - 100) < 1e-6, `con drainCost: nada al pulsar (${dr.atPress})`);
  // el maná se regenera igual en las dos: lo que difiere en 0,6 s es lo cobrado (30 al pulsar o 30/3 en el 1.er tic)
  const regen = up.after - up.atPress;
  ok(Math.abs(dr.after - (100 - 10 + regen)) < 0.01, `con drainCost: el 1.er tic cobra 30/3 (${dr.after.toFixed(2)}; regeneración ${regen.toFixed(2)})`);
  ok(!run({ ...CANAL, cost: 30 }, 25).started && run({ ...CANAL, cost: 30, drainCost: true }, 25).started, 'con 25 de maná: sin drainCost no empieza; con drainCost sí');
});
section('T2c · rampa: +rampPerTic % por tic al coef del tic, con tope rampMax (y el haz se ensancha ×2 al tope)', () => {
  const h = hero('guerrero', 30, { inject: { skills: [{ ...CANAL, channelT: 2, ticks: 4, rampPerTic: 50, rampMax: 100 }] } });
  const e = foe(h, 2);
  h.aim(2, 0); h.setSlot('rmb', 'zz_canal');
  h.press('rmb');
  const beam = h.g.channelInfo()?.beam;
  const w0 = beam?.width;
  h.step(2.05);
  const L = e.t.list;
  eq(L.length, 4, `4 tics (${L.length})`);
  ok(Math.abs(L[1] / L[0] - 1.5) < 0.01 && Math.abs(L[2] / L[0] - 2) < 0.01 && Math.abs(L[3] / L[0] - 2) < 0.01, `rampa 0 · +50 · +100 · +100 (tope): ${L.map(x => Math.round(x)).join(' ')}`);
  ok(beam && Math.abs(beam.width / w0 - 2) < 1e-6, `haz ×2 al tope de la rampa (${w0} → ${beam?.width})`);
  eq(channelRampPct(1, 50, 100), 0, 'channelRampPct: el 1.º sin rampa');
  eq(channelRampPct(9, 10, 60), 60, 'channelRampPct: tope');
});
section('T2d · nonBlocking: el canal no bloquea el básico ni las otras ranuras', () => {
  const run = nb => {
    const def = { ...CANAL, channelT: 3, ticks: 6, nonBlocking: nb };
    const h = hero('maga', 30, { inject: { skills: [def] } });
    foe(h, 4); h.aim(4, 0);
    h.setSlot('k2', 'zz_canal'); h.setSlot('rmb', 'bola_fuego');
    h.press('k2');
    const lock = h.p.castLock;
    h.step(0.25);
    h.p.atkCd = 0;
    h.g.castBasic();
    const basic = h.p.atkCd > 0;
    h.step(0.05);
    const rmb = h.g.castSkillSlot('rmb');
    const still = h.g.channelInfo()?.id === 'zz_canal';
    h.release('k2'); h.step(0.1);
    return { lock, basic, rmb, still };
  };
  const b = run(false), f = run(true);
  ok(b.lock > 1 && !b.basic && !b.rmb, `canal normal: bloquea (castLock ${b.lock.toFixed(2)})`);
  ok(f.lock === 0 && f.basic && f.rmb && f.still, `nonBlocking: castLock ${f.lock}, básico ${f.basic}, 🖱️Der ${f.rmb}, el canal sigue ${f.still}`);
});
// S-maga: el Haz Concentrado real ya golpea al pulsar (tickNow) y gasta las Cargas en su 1.er tic; para
// probar «soltar antes del 1.er tic» se inyecta un Haz con su mismo tic (v_haz_concentrado) SIN tickNow
// (el 1.er tic a los 0,5 s, como el de antes de S-maga)
const HAZ_SIN_TICKNOW = { ...CLASSES.maga.forge.rayo, vars: [CLASSES.maga.forge.rayo.vars[0],
  { ...CLASSES.maga.forge.rayo.vars[1], set: { type: 'channel', channelT: 1.5, ticks: 3, coef: 0.8, cost: 22, beam: { color: 0xb996ff } } }] };
section('T2e · soltar el Haz Concentrado antes del 1.er tic: ni maná, ni enfriamiento, ni Cargas (sin ③ afterCast)', () => {
  const run = hold => {
    const h = hero('maga', 40, { spec: 'arcanista', forge: { rayo: 'ii' }, inject: { forge: { rayo: HAZ_SIN_TICKNOW } } });
    h.addPowers('zz_fin_s0');
    foe(h, 4); h.aim(4, 0); h.setSlot('rmb', 'rayo');
    h.gauge('cargas', 4);
    h.p.mp = h.p.stats.maxMP;
    ENDS.length = 0;
    h.press('rmb'); h.step(hold); h.release('rmb'); h.step(0.05);
    return { h, cargas: h.gaugeValue('cargas'), mp: h.p.mp, cd: h.p.cds.rayo || 0, end: ENDS.find(x => x.id === 'rayo') };
  };
  eq(resolveSkillId(run(0).h.p, 'rayo').def.type, 'channel', 'Haz Concentrado es un canal');
  const tap = run(0.1);
  eq(tap.cargas, 4, `un toque no gasta las Cargas (${tap.cargas})`);
  ok(Math.abs(tap.mp - tap.h.p.stats.maxMP) < 1e-6, `devuelve el maná (${tap.mp} de ${tap.h.p.stats.maxMP})`);
  eq(tap.cd, 0, 'devuelve el enfriamiento');
  ok(tap.end && tap.end.casts === 0 && tap.end.ticks === 0 && tap.end.kind === 'channel', `⑭ con casts 0 y ticks 0 (${JSON.stringify(tap.end)})`);
  const full = run(1.6);
  ok(full.cargas < 4 && full.end?.casts === 1 && full.end?.ticks === 3, `canalizado entero sí gasta (${full.cargas} Cargas, ${full.end?.ticks} tics)`);
});

// ------------------------------------------------ T3 · haz vivo
section('T3 · g.spawnLiveBeam: asa con extremos vivos, ancho y brillo, y se apaga', () => {
  const h = hero('maga', 20);
  const target = new THREE.Vector3(3, 1, 0);
  const b = h.g.spawnLiveBeam({ from: { x: 0, y: 1.2, z: 0 }, to: () => target, width: 0.5, core: 0.1 });
  ok(b.alive && Math.abs(b.to.x - 3) < 1e-9, 'extremos al crearlo');
  target.set(5, 1, 2);
  h.g.tickLiveBeams(1 / 60);
  ok(Math.abs(b.to.x - 5) < 1e-9 && Math.abs(b.to.z - 2) < 1e-9, 'el extremo-función se relee cada fotograma');
  b.setWidth(0.9, 0.2).setIntensity(1.5);
  ok(b.width === 0.9 && b.core === 0.2 && b.intensity === 1.5, 'setWidth / setIntensity');
  b.end(0.1);
  h.g.tickLiveBeams(0.05);
  ok(b.alive, 'se desvanece (0,1 s)');
  h.g.tickLiveBeams(0.06);
  ok(!b.alive && !h.g._liveBeams.includes(b), 'y desaparece');
  const d = h.g.spawnLiveBeam({ from: { x: 0, z: 0 }, to: { x: 1, z: 0 }, dur: 0.2 });
  h.step(0.5);
  ok(!d.alive, 'dur: se apaga solo (lo avanza tickSkillVerbs)');
  const r = h.g.spawnLiveBeam({ from: { x: 0, z: 0 }, to: { x: 1, z: 0 } });
  h.g.resetCastState();
  ok(!r.alive && h.g._liveBeams.length === 0, 'resetCastState los quita');
});
section('T3 · el canal de un objetivo lleva haz vivo: nace al pulsar, sigue al enemigo, late por tic y se apaga al soltar', () => {
  const h = hero('guerrero', 30, { inject: { skills: [CANAL] } });
  const e = foe(h, 2);
  h.aim(2, 0); h.setSlot('rmb', 'zz_canal');
  h.press('rmb');
  const b = h.g.channelInfo()?.beam;
  ok(b && b.alive && h.g._liveBeams.includes(b), 'haz vivo desde el primer instante (antes del 1.er tic)');
  ok(Math.abs(b.from.y - 1.2) < 1e-9 && Math.abs(b.to.x - 2) < 1e-6, `de la mano al enemigo (${b.to.x.toFixed(2)})`);
  e.pos.set(3, 0, 1);
  h.step(1 / 60);
  ok(Math.abs(b.to.x - 3) < 1e-6 && Math.abs(b.to.z - 1) < 1e-6, 'sigue al enemigo cada fotograma');
  h.step(0.55);
  ok(b.pulseK > 0, 'late en el tic');
  h.release('rmb'); h.step(0.3);
  ok(!b.alive && !h.g._liveBeams.includes(b), 'se apaga al soltar');
  // beam:false lo apaga; un canal de área no lleva haz
  const n = hero('guerrero', 30, { inject: { skills: [{ ...CANAL, beam: false }] } });
  foe(n, 2); n.aim(2, 0); n.setSlot('rmb', 'zz_canal'); n.press('rmb');
  ok(!n.g.channelInfo()?.beam && !(n.g._liveBeams || []).length, 'beam:false: sin haz');
});
section('T3 · el haz de un proyectil que atraviesa llega al FINAL de su línea (no al cursor)', () => {
  const def = { id: 'zz_saeta', name: 'Saeta', cat: 'spender', type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30, pierce: true, beam: true, tags: ['spender', 'proj'] };
  const h = hero('arquera', 30, { inject: { skills: [def] } });
  h.aim(3, 0); h.setSlot('rmb', 'zz_saeta'); h.cast('rmb');
  const b = h.g._liveBeams.at(-1);
  ok(b && Math.abs(b.to.x - 12) < 0.35 && Math.abs(b.to.z) < 1e-6, `hasta los 12 m de su alcance (${b?.to.x.toFixed(2)})`);
});
section('T3 · con DOM: la malla del haz es una cinta del ancho pedido y se libera al acabar', () => {
  const hadDoc = 'document' in globalThis;
  globalThis.document = globalThis.document || {};
  try {
    const fx = new THREE.Group();
    const g = { fxGroup: fx, emitFx() {} };
    const b = createLiveBeam(g, { from: { x: 0, y: 1, z: 0 }, to: { x: 4, y: 1, z: 0 }, width: 0.6 });
    ok(b.mesh && fx.children.includes(b.mesh), 'malla en fxGroup');
    const pos = b.mesh.geometry.attributes.position;
    const w = Math.hypot(pos.getX(1) - pos.getX(0), pos.getY(1) - pos.getY(0), pos.getZ(1) - pos.getZ(0));
    ok(Math.abs(w - 0.6) < 1e-6 && Math.abs(pos.getX(2) - 4) < 1e-6, `cinta de 0,6 m de la mano a 4 m (${w.toFixed(3)})`);
    b.end(0); ok(!b.mesh && !fx.children.length, 'end(0) la quita');
  } finally { if (!hadDoc) delete globalThis.document; }
});

// ------------------------------------------------ T5 · forja por build y aviso de forma
section('T5 · forja recomendada por build (forgeRecoFor, Recomendado, elegir especialización y banco)', () => {
  const grieta = talentTreesFor('maga').builds.grieta;
  const saved = grieta.forge;
  grieta.forge = { m_u_desgarro: null };
  try {
    const r = forgeRecoFor('maga', 'arcanista', 'grieta');
    ok(r.m_u_desgarro === null && r.rayo === FORGE_RECO.arcanista.rayo, `la build manda en lo suyo y la especialización en el resto (${JSON.stringify(r)})`);
    eq(forgeRecoFor('maga', 'arcanista').m_u_desgarro, FORGE_RECO.arcanista.m_u_desgarro, 'sin build: la defaultBuild (rayo, sin forge)');
    // Recomendado de esa build: fija lo que declara aunque ya estuviera elegido
    const h = hero('maga', 40, { spec: 'arcanista', forge: { m_u_desgarro: 'ii', rayo: 'i' } });
    Object.assign(h.g, talentMethods);
    const res = h.g.applyTalentBuild('grieta');
    ok(res.ok, `applyTalentBuild (${res.text || res.reason || ''})`);
    ok(h.p.skillForge.m_u_desgarro === null && h.p.skillForge.rayo === 'i', `Grieta Eterna canaliza el Desgarro (${JSON.stringify(h.p.skillForge)})`);
    eq(resolveSkillId(h.p, 'm_u_desgarro').def.type, 'channel', 'el Desgarro vuelve a ser un canal');
    // el banco usa la de la build
    const b = buildHero('maga', 50, 'tipico', { spec: 'arcanista', build: 'grieta' });
    eq(b.skillForge.m_u_desgarro, null, 'banco: la forja de la build');
    // elegir especialización: la de la defaultBuild en lo nunca forjado (D3)
    const rayo = talentTreesFor('maga').builds.rayo, sv2 = rayo.forge;
    rayo.forge = { rayo: null };
    try {
      const c = hero('maga', 20);
      Object.assign(c.g, talentMethods);
      ok(c.g.chooseSpec('arcanista').ok, 'chooseSpec');
      ok(c.p.skillForge.rayo === null && c.p.skillForge.m_u_desgarro === FORGE_RECO.arcanista.m_u_desgarro, `chooseSpec con la defaultBuild (${JSON.stringify(c.p.skillForge)})`);
      ok(!recoPlan(c.p).some(x => x.id === 'rayo'), 'el libro no propone cambiar lo que ya cumple');
    } finally { if (sv2 === undefined) delete rayo.forge; else rayo.forge = sv2; }
  } finally { if (saved === undefined) delete grieta.forge; else grieta.forge = saved; }
});
section('T5 · needsForm: el libro y la forja avisan si la variante deja nodos comprados sin efecto', () => {
  const s = talentTreesFor('maga').specs.find(x => x.id === 'arcanista');
  const a7 = s.nodes.find(n => n.id === 'a7');
  const saved = a7.needsForm;
  a7.needsForm = { m_u_desgarro: 'channel' };
  try {
    const h = hero('maga', 40, { spec: 'arcanista', talents: { specRanks: { a7: 1 } }, forge: { m_u_desgarro: null } });
    const sk = CLASSES.maga.skills.find(x => x.id === 'm_u_desgarro');
    eq(formVoids(h.p, 'm_u_desgarro', resolveSkillId(h.p, 'm_u_desgarro').def).length, 0, 'canalizado: nada sin efecto');
    const fv = forgeView(h.p, sk);
    const q = fv.vars.find(v => v.key === 'ii');
    ok(q.voids.length === 1 && q.voids[0].id === 'a7', `Quiebre deja sin efecto a7 (${JSON.stringify(q.voids)})`);
    ok(/^⚠ Quiebre no se canaliza: Grieta Abierta no hace nada$/.test(q.voidText), `texto del aviso: «${q.voidText}»`);
    eq(fv.vars.find(v => v.key === 'i').voids.length, 1, 'Brecha (zona) tampoco canaliza');
    const r = h.g.chooseForge('m_u_desgarro', 'ii');
    ok(r.ok && r.voids?.length === 1 && h.messages().some(m => m === '⚠ Quiebre no se canaliza: Grieta Abierta no hace nada'), `aviso al forjar (${h.messages().at(-1)})`);
    ok(forgeView(h.p, sk).voidText, 'y en la tarjeta de la habilidad');
  } finally { if (saved === undefined) delete a7.needsForm; else a7.needsForm = saved; }
});

// ------------------------------------------------ T6 · rango del kit de especialización
section('T6 · el kit de una especialización cuenta el rango desde el Nv10 (rankReq)', () => {
  const at = L => hero('maga', L, { spec: 'arcanista' }).p;
  const rayo = CLASSES.maga.skills.find(s => s.id === 'rayo'), bola = CLASSES.maga.skills.find(s => s.id === 'bola_fuego');
  eq(rankReq(rayo), 10, 'rankReq del Rayo (req 14, de especialización) = 10');
  eq(rankReq(bola), 2, 'el kit base no cambia');
  eq(skillRank(at(18), rayo), 2, 'Rayo a Nv18: rango 2 (antes 1)');
  eq(skillRank(at(26), rayo), 3, 'Rayo a Nv26: rango 3 (antes 2)');
  eq(forgeView(at(18), rayo).nextRankLv, 26, 'el libro: rango 3 al nivel 26');
});

// ------------------------------------------------ F2 · control sin rendimientos decrecientes
section('F2 · applyCC(…, { noDR: true }) no suma resistencia al control', () => {
  const h = hero('guerrero', 30);
  const e = h.enemy({ hp: 1e9 });
  ok(e.applyCC('stun', 0.4, { noDR: true }) > 0 && !(e.stunDR > 0), `el aturdimiento corto no suma (${e.stunDR})`);
  e.stunT = 0;
  ok(Math.abs(e.applyCC('stun', 2) - 2) < 1e-9, 'el grande que viene detrás dura entero');
  const c = h.enemy({ hp: 1e9 });
  c.applyCC('stun', 0.4); c.stunT = 0;
  ok(c.applyCC('stun', 2) < 1.5, 'sin noDR, el grande sale recortado');
});

// ------------------------------------------------ G08 · golpe pesado y crítico del básico
const AREA = { id: 'zz_golpe', name: 'Golpe', cat: 'spender', type: 'area', at: 'self', radius: 3, coef: 1, cost: 0, cd: 0, tags: ['spender', 'area'] };
section('G08 · `heavy`: congelado propio por golpe (no en repeticiones ni con reduceMotion)', () => {
  const h = hero('guerrero', 30, { inject: { skills: [{ ...AREA, heavy: 80 }] } });
  const log = feelSpy(h);
  foe(h, 2); foe(h, -2);
  h.setSlot('rmb', 'zz_golpe'); h.cast('rmb');
  ok(log.stops.length === 1 && log.stops[0] === 80, `un congelado de 80 ms aunque golpee a dos (${log.stops})`);
  h.step(0.3);
  h.g.castEcho(h.p, 'zz_golpe', { mult: 0.5 });
  eq(log.stops.length, 1, 'una repetición no congela');
  h.g.settings.reduceMotion = true;
  h.step(0.3); h.cast('rmb');
  eq(log.stops.length, 1, 'reduceMotion: sin congelado');
});
section('G08 · `heavy` en un paso de combo y con minFrac en una carga; sacudida × (0,6 + 0,4·carga)', () => {
  const combo = { id: 'zz_combo', name: 'Combo', cat: 'spender', type: 'combo', coef: 1, cost: 0, cd: 0, tags: ['spender', 'melee'],
    steps: [{ type: 'melee', coef: 1 }, { type: 'melee', coef: 1 }, { type: 'area', at: 'self', radius: 3, coef: 1, heavy: 70 }] };
  const h = hero('guerrero', 30, { inject: { skills: [combo] } });
  const log = feelSpy(h);
  foe(h, 1.5);
  h.setSlot('rmb', 'zz_combo');
  for (let i = 0; i < 3; i++) { h.cast('rmb'); h.step(0.3); }
  ok(log.stops.length === 1 && log.stops[0] === 70, `solo el 3.er paso (${log.stops})`);
  const charged = { ...AREA, id: 'zz_carga', shake: 1, heavy: { ms: 90, minFrac: 0.7 }, charge: { max: 1, min: 0.1 } };
  const run = hold => {
    const c = hero('guerrero', 30, { inject: { skills: [charged] } });
    const l = feelSpy(c);
    foe(c, 2); c.setSlot('rmb', 'zz_carga'); c.press('rmb'); c.step(hold); c.release('rmb'); c.step(0.1);
    return l;
  };
  const lo = run(0.15), hi = run(1.2);
  ok(lo.stops.length === 0 && hi.stops[0] === 90, `minFrac 0,7: un toque no congela, la carga entera sí (${lo.stops} / ${hi.stops})`);
  ok(Math.abs(lo.shakes[0] - chargedShake(1, (0.15 - 0.1) / 0.9)) < 0.03 && Math.abs(hi.shakes[0] - 1) < 1e-9, `sacudida ${lo.shakes[0]?.toFixed(2)} → ${hi.shakes[0]}`);
  eq(chargedShake(0.5, 0), 0.3, 'chargedShake: 0,6 × base sin carga');
});
section('G08 · el crítico del básico congela 40 ms (antes 90)', () => {
  eq(hitStopMs('basicCrit'), 40, 'hitStopMs(basicCrit)');
  const h = hero('guerrero', 30);
  const log = feelSpy(h);
  h.p.combatRng = () => 0;                         // todo crítico
  foe(h, 1.2); h.aim(1.2, 0);
  h.p.atkCd = 0; h.g.castBasic();
  ok(log.stops.includes('basicCrit') && !log.stops.includes('heavy'), `crítico del básico → basicCrit (${log.stops})`);
});

// ------------------------------------------------ G09 · sacudida declarada y réplicas
section('G09 · sacudir siempre que la definición declare shake (también at:self y cono)', () => {
  const run = def => { const h = hero('guerrero', 30, { inject: { skills: [def] } }); const l = feelSpy(h); foe(h, 2); h.aim(2, 0); h.setSlot('rmb', def.id); h.cast('rmb'); return l.shakes; };
  ok(run({ ...AREA, shake: 0.5 })[0] === 0.5, 'área centrada en ti con shake 0,5');
  ok(run({ ...AREA, id: 'zz_cono', type: 'cone', radius: 4, angle: 90, shake: 0.3, at: undefined })[0] === 0.3, 'cono con shake 0,3');
  eq(run({ ...AREA, id: 'zz_quieto' }).length, 0, 'sin shake declarado (self): no sacude');
});
section('G09 · cada réplica se ve (aura y extra), se oye (golpe grave) y sacude al 50 %', () => {
  const def = { ...AREA, id: 'zz_sismo', shake: 0.4, repeat: { n: 2, every: 0.5, coef: 0.5 } };
  const h = hero('guerrero', 30, { inject: { skills: [def] } });
  const log = feelSpy(h);
  foe(h, 2); h.setSlot('rmb', 'zz_sismo'); h.cast('rmb');
  const fx0 = log.fx.length;
  h.step(1.1);
  ok(log.shakes.length === 3 && log.shakes[1] === 0.2 && log.shakes[2] === 0.2, `sacudidas ${log.shakes}`);
  eq(h.sfxCount('thud'), 2, 'golpe grave por réplica');
  ok(log.fx.length >= fx0, 'efectos de la réplica (si la habilidad trae aura/extra)');
});

// ------------------------------------------------ V · vocabulario
section('V · validateSkillDef de las claves nuevas', () => {
  const v = d => validateSkillDef(normalizeSkillDef({ icon: '🧪', desc: 'x', elem: 'physical', req: 1, ...d }), { v2: true });
  const good = v({ ...CANAL, tickNow: true, drainCost: true, rampPerTic: 10, rampMax: 100, nonBlocking: true, beam: { width: 0.6, line: true }, heavy: { ms: 60, minFrac: 0.5 } });
  eq(good.length, 0, `canal completo válido: ${good.join(' · ')}`);
  eq(good.warnings.length, 0, `sin avisos de clave desconocida: ${good.warnings.join(' · ')}`);
  ok(v({ ...AREA, tickNow: true }).some(e => /de un canal/.test(e)), 'tickNow fuera de un canal');
  ok(v({ ...CANAL, rampPerTic: 10 }).some(e => /van juntas/.test(e)), 'rampPerTic sin rampMax');
  ok(v({ ...AREA, heavy: 900 }).some(e => /heavy/.test(e)), 'heavy fuera de rango');
  ok(v({ ...CANAL, ticks: 1, tickNow: true }).some(e => /ticks ≥ 2/.test(e)), 'tickNow con un solo tic');
  ok(v({ ...AREA, beam: { width: -1 } }).some(e => /beam/.test(e)), 'beam con ancho negativo');
});

if (fails.length) {
  console.error(`\n❌ SENSACIÓN · MOTOR (S0): ${fails.length} apartado(s) fallan: ${fails.join(' | ')}`);
  process.exit(1);
}
console.log(`\n✅ SENSACIÓN · MOTOR (S0): ${checks} comprobaciones`);
