// Paso 2 (E2, KT-arquera): talentos v2 de la Arquera — árbol de CLASE, las tres ESPECIALIZACIONES
// (Tiradora, Francotiradora, Montaraz) y los árboles HÉROE.
// Cada nodo con fx tiene un efecto observable con el arnés real (Player, canal de lanzamiento,
// proyectiles, campos y despachador de poderes): se compara contra una arquera SIN el nodo.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { TALENT_TREES, CORE_TV_KEYS } from '../js/talents.js';
import { ARQUERA_TV_KEYS } from '../js/talents-arquera.js';
import { POWER_HOOKS, powerState, definePower } from '../js/powers.js';
import { arqueraPowers } from '../js/powers-arquera.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';

const TREES = TALENT_TREES.arquera;
const SRC = readFileSync(new URL('../js/powers-arquera.js', import.meta.url), 'utf8');
const MECH = readFileSync(new URL('../js/mech-arquera.js', import.meta.url), 'utf8');
const SK = id => CLASSES.arquera.skills.find(s => s.id === id);
let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const near = (a, b, m, tol = 0.02) => { assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${m}: ${a} ≠ ${b}`); checks++; };
const section = (name, fn) => { fn(); console.log(`  ✓ ${name}`); };

// ------------------------------------------------------------ arneses
// golpes deterministas: arma fija (1000) y sin crítico al azar (el crítico forzado sigue valiendo)
function steady(h) {
  const p = h.p, rc = p.recompute;
  p.recompute = function (...a) {
    const r = rc.apply(this, a);
    this.stats.wMin = this.stats.wMax = 1000;
    this.stats.crit = this.stats.critRaw = -1000;
    return r;
  };
  p.recompute();
  p.mp = p.stats.maxMP;
  return h;
}
// arquera de nivel 60 con nodos de CLASE (sin especialización)
function cls(ranks = {}, choice = {}, o = {}) {
  return steady(makeHarness({ classId: 'arquera', level: 60, seed: 11, talents: { cls: ranks, choice }, ...o }));
}
// 31 puntos en la especialización (abre el Paragon); 30 = cerrado
function specRanks(spec, pts = 31) {
  const s = TREES.specs.find(x => x.id === spec);
  const out = {};
  let left = pts;
  for (const n of [...s.nodes].sort((a, b) => a.r - b.r)) {
    if (n.free || left <= 0) continue;
    const k = Math.min(n.max, left);
    out[n.id] = k;
    left -= k;
  }
  return out;
}
const SPEC_OF = { h1: 'tiradora', h2: 'tiradora', h3: 'francotiradora' };
const KEY_OF = { h1: 'q0', h2: 'w0', h3: 'y0' };
// arquera de nivel 100 con el árbol héroe `tree` (su nodo clave es gratis) y `nodes`
function hero(tree, nodes = {}, choice = {}, { open = true, spec = SPEC_OF[tree], inject = null, powers = [] } = {}) {
  return steady(makeHarness({ classId: 'arquera', level: 100, seed: 11, spec, inject, powers,
    talents: { specRanks: specRanks(spec, open ? 31 : 30), hero: { [spec]: { tree, nodes: { [tree]: nodes }, choice: { [tree]: choice } } } } }));
}
// espía del daño recibido por un enemigo (lo que llega a takeDamage, antes de la Debilidad)
function spy(e) {
  const log = [];
  const td = e.takeDamage.bind(e);
  e.takeDamage = (n, crit = false, opts = {}) => {
    const dealt = td(n, crit, opts);
    log.push({ n, crit: !!crit, skill: opts.skill || null, proc: !!opts.proc, dot: !!opts.dot, echo: !!opts.echo });
    return dealt;
  };
  return log;
}
const by = (log, skill) => log.filter(x => x.skill === skill);
// espera (en pasos de 1/60 s) a que la cadencia, el GCD y los bloqueos dejen actuar
function ready(h) {
  const p = h.p;
  for (let i = 0; i < 300 && (p.atkCd > 0 || p.actionLockT > 0 || p.gcdT > 0 || p.castLock > 0 || h.g._windup || h.g._channel); i++) h.step(1 / 60);
}
// lanza la habilidad `id` desde `slot` hacia (x, z) y deja correr `sec`
function cast(h, slot, id, x, z, sec = 0.8) {
  ready(h);
  h.setSlot(slot, id);
  h.aim(x, z);
  const r = h.cast(slot);
  h.step(sec);
  return r;
}
// Disparo Rápido (básico de arma) al enemigo
function shoot(h, e, sec = 0.6) { return cast(h, 'lmb', 'a_disparo', e.pos.x, e.pos.z, sec); }
// golpe de flecha tirado por la vía real (③ condAdd/condCrit): daño sin Debilidad
function roll(h, e, skill = 'a_disparo') {
  return h.p.rollDamage(1, 0, 0, e, { skill, tags: new Set(['proj', 'physical']), elem: 'physical' }).dmg;
}
const addRatio = (p, pct) => (1 + ((p.stats.dmgPct || 0) + pct) / 100) / (1 + (p.stats.dmgPct || 0) / 100);
// poder de prueba: fuerza el crítico de los golpes de `skill` (el tope de crítico no lo permite)
definePower('test_arq_crit_viento', { condCrit(p, e, hit) { if (hit?.skill === 'q_rafagas') hit.forceCrit = true; return 0; } });

console.log('Talentos de la Arquera (clase, especializaciones y árboles héroe)');

// ============================================================ datos
section('datos: fx, poderes y claves tv', () => {
  const todos = [], empty = [], powers = [], tvKeys = new Set();
  const visit = (where, fx, todo) => {
    if (todo) { todos.push(where); return; }
    if (!fx || !Object.keys(fx).length) empty.push(where);
    if (fx?.power) powers.push(fx.power);
    for (const k of Object.keys(fx?.tv || {})) tvKeys.add(k);
  };
  const walk = (prefix, nodes) => {
    for (const n of nodes) {
      if (n.t === 'c') for (const o of n.opts) visit(`${prefix}${n.id}${o.k}`, o.fx, o.todo || n.todo);
      else visit(`${prefix}${n.id}`, n.fx, n.todo);
    }
  };
  walk('', TREES.cls.nodes);
  for (const s of TREES.specs) walk(`${s.id}.`, s.nodes);
  for (const t of TREES.hero) walk(`${t.id}.`, t.nodes);
  // E2 cerrado: ningún nodo, opción ni especialización con «todo»; la pasiva es el poder del nodo clave
  assert.deepEqual(todos, [], 'nodos con todo'); checks++;
  assert.deepEqual(empty, [], 'nodos con fx vacío'); checks++;
  for (const s of TREES.specs) {
    ok(!('todo' in s) && Object.keys(s.innate || {}).length === 0, `${s.id}: sin todo e innate vacío`);
    ok(s.nodes.find(n => n.free)?.fx?.power, `${s.id}: el nodo clave lleva la pasiva (poder)`);
  }
  const own = arqueraPowers();
  for (const id of powers) {
    ok(POWER_HOOKS[id], `poder ${id} registrado`);
    ok(own[id], `poder ${id} es de powers-arquera.js`);
  }
  ok(Object.values(own).every(d => !('mult' in d)), 'ningún poder de la Arquera declara mult');
  // claves tv propias: las de los nodos están en ARQUERA_TV_KEYS y cada una la lee un poder propio
  const core = new Set(CORE_TV_KEYS);
  for (const k of tvKeys) ok(core.has(k) || ARQUERA_TV_KEYS.includes(k), `clave tv ${k} declarada`);
  for (const k of ARQUERA_TV_KEYS) {
    ok(new RegExp(`\\btv\\??\\.${k}\\b`).test(SRC + MECH), `clave tv ${k} leída en powers-arquera.js o mech-arquera.js`);
    ok(tvKeys.has(k), `clave tv ${k}: la lleva algún nodo`);
  }
  eq(new Set(ARQUERA_TV_KEYS).size, ARQUERA_TV_KEYS.length, 'ARQUERA_TV_KEYS sin repetidos');
  // activas concedidas por la clase: del catálogo, de talento y lanzables
  for (const id of ['a_t_camuflaje', 'a_t_bengala']) {
    ok(SK(id)?.kind === 'talent', `${id} es activa de talento`);
    ok(!!SK(id)?.behavior, `${id} tiene comportamiento`);
  }
});

// ============================================================ árbol de clase: números
section('clase: nodos numéricos (stats, mods y tv)', () => {
  const b = cls();
  const B = b.p.stats;
  eq(cls({ c1: 2 }).p.stats.maxMP - B.maxMP, 20, 'c1 Carcaj Profundo: +10 de Energía por rango');
  eq(cls({ c2: 2 }).p.stats.dmgPct - B.dmgPct, 12, 'c2 Pulso Firme: +6 % por rango');
  near(resolveSkill(cls({ c3: 1 }).p, SK('a_paso')).cd, 7.5, 'c3 Paso de Gacela r1: 7,5 s');
  near(resolveSkill(cls({ c3: 2 }).p, SK('a_paso')).cd, 6, 'c3 Paso de Gacela r2: 6 s');
  near(resolveSkill(b.p, SK('a_paso')).cd, 9, 'Paso Veloz base: 9 s');
  near(resolveSkill(cls({ c4: 1 }).p, SK('a_humo')).cd, 14, 'c4 Bomba Rápida r1: 14 s');
  near(resolveSkill(cls({ c4: 3 }).p, SK('a_humo')).cd, 10, 'c4 Bomba Rápida r3: 10 s');
  eq(cls({ c12: 2 }).p.stats.regenPct - (B.regenPct || 0), 30, 'c12 Respiración Pausada: +15 % por rango');
  {
    const regen = ranks => { const h = cls(ranks); h.p.mp = 0; h.tick(1); return h.p.mp; };
    const base = regen({});
    ok(base > 0, 'la Energía se regenera');
    near(regen({ c12: 2 }) / base, 1.3, 'c12: recupera Energía un 30 % más rápido');
  }
  eq(cls({ c21: 1 }).p.stats.spdPct - B.spdPct, 10, 'c21 Piernas de Corredora: +10 % de velocidad');
  eq(cls({ c24: 2 }).p.stats.aspdPct - B.aspdPct, 14, 'c24 Cadencia: +7 % por rango');
  ok(cls({ c24: 2 }).p.stats.atkTime < B.atkTime, 'c24: dispara más rápido');
  // c13 Ojo de Halcón: +5 % de crítico por rango (sin el arnés que lo apaga)
  const raw = (ranks) => { const h = makeHarness({ classId: 'arquera', level: 60, talents: { cls: ranks } }); return h.p.stats.critRaw ?? h.p.stats.crit; };
  eq(raw({ c13: 2 }) - raw({}), 10, 'c13 Ojo de Halcón: +5 % de crítico por rango');
  // c18 Humo Denso: la Bomba de Humo dura 8 + r s (y el humo que suelta también)
  eq(resolveSkill(cls({ c18: 2 }).p, SK('a_humo')).dur, 10, 'c18 Humo Denso r2: 10 s');
  {
    const h = cls({ c18: 2 });
    cast(h, 'k2', 'a_humo', 0, 0, 0.1);
    const f = h.g.fields.find(x => x.data?.skill === 'a_humo');
    ok(f && Math.abs(f.dur - 10) < 1e-6, 'c18: la zona de humo dura 10 s');
  }
  // c22B Economía Letal: lo que cuesta más de 20 cuesta un 20 % menos
  {
    const p = cls({ c22: 1 }, { c22: 'B' }).p;
    near(resolveSkill(p, SK('flecha_perforante')).cost, 26 * 0.8, 'c22B: Flecha Perforante 26 → 20,8');
    near(resolveSkill(p, SK('lluvia_flechas')).cost, 30 * 0.8, 'c22B: Lluvia 30 → 24');
    eq(resolveSkill(p, SK('a_t_cepo')).cost, 10, 'c22B: Trampa de Cepo (10) no cambia');
    eq(resolveSkill(b.p, SK('flecha_perforante')).cost, 26, 'sin c22B: 26');
  }
  // c8 Difícil de Alcanzar: −6 % de daño recibido por rango mientras te mueves
  {
    const taken = (h, moving) => { const p = h.p; p.hp = p.stats.maxHP; p.moving = moving; p.takeDamage(400, 1); return p.stats.maxHP - p.hp; };
    const h = cls({ c8: 2 }), base = cls();
    const mv = taken(h, true), mvBase = taken(base, true);
    ok(mv < mvBase * 0.95, `c8: en movimiento recibe menos (${mv} < ${mvBase})`);
    eq(taken(cls({ c8: 2 }), false), taken(cls(), false), 'c8: quieta, igual');
  }
  // c7 Paso Limpio: Paso Veloz quita las ralentizaciones
  {
    const run = ranks => { const h = cls(ranks); h.p.applySlow(5); cast(h, 'k1', 'a_paso', -6, 0, 0.4); return h.p.slowT; };
    eq(run({ c3: 1, c7: 1 }), 0, 'c7: sin ralentización tras rodar');
    ok(run({}) > 3, 'sin c7: sigue ralentizada');
  }
  // c9A Flecha Lastrada: Flecha Perforante ralentiza 40 % 3 s a todos los que atraviesa
  {
    const h = cls({ c9: 1 }, { c9: 'A' });
    const e1 = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    cast(h, 'rmb', 'flecha_perforante', 6, 0, 0.6);
    ok(e1.slowT > 2 && e1.slowPct === 40 && e2.slowT > 2 && e2.slowPct === 40, 'c9A: los dos atravesados, ralentizados al 40 %');
    const b2 = cls(), f = b2.enemy({ hp: 1e7, pos: [3, 0, 0] });
    cast(b2, 'rmb', 'flecha_perforante', 6, 0, 0.6);
    ok(!(f.slowT > 0), 'sin c9A: no ralentiza');
  }
});

// ============================================================ árbol de clase: poderes de disparo
section('clase: Puntería Fija, Saqueo, Bocajarro, Tiro Lejano y Punta de Diamante', () => {
  // c5A Puntería Fija: el 4.º Disparo Rápido AL MISMO enemigo es crítico seguro
  {
    const h = cls({ c5: 1 }, { c5: 'A' });
    const e1 = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
    const l1 = spy(e1), l2 = spy(e2);
    for (let i = 0; i < 3; i++) shoot(h, e1);
    shoot(h, e2);
    shoot(h, e1);
    for (let i = 0; i < 3; i++) shoot(h, e1);
    assert.deepEqual(by(l1, 'a_disparo').map(x => x.crit), [false, false, false, true, false, false, false], 'c5A: 4.º disparo a e1 crítico'); checks++;
    assert.deepEqual(by(l2, 'a_disparo').map(x => x.crit), [false], 'c5A: la cuenta es por enemigo'); checks++;
    const b = cls(), f = b.enemy({ hp: 1e7, pos: [3, 0, 0] }), lf = spy(f);
    for (let i = 0; i < 4; i++) shoot(b, f);
    ok(by(lf, 'a_disparo').length === 4 && by(lf, 'a_disparo').every(x => !x.crit), 'sin c5A: ninguno crítico');
  }
  // c5B Flecha Saqueadora: si Disparo Rápido mata, +8 de Energía
  {
    const gain = (h, e) => { h.p.mp = 0; shoot(h, e); return h.p.mp; };
    const h = cls({ c5: 1 }, { c5: 'B' }), b = cls();
    const dh = gain(h, h.enemy({ hp: 1, pos: [3, 0, 0] })), db = gain(b, b.enemy({ hp: 1, pos: [3, 0, 0] }));
    near(dh - db, 8, 'c5B: +8 de Energía al matar', 0.001);
    const alive = gain(h, h.enemy({ hp: 1e7, pos: [3, 0, 0] })), aliveB = gain(b, b.enemy({ hp: 1e7, pos: [3, 0, 0] }));
    near(alive, aliveB, 'c5B: sin matar no da nada', 0.001);
  }
  // c6A A Bocajarro: a menos de 5 m, +15 % y empuja 1 m
  {
    const run = (ranks, choice, x) => {
      const h = cls(ranks, choice), e = h.enemy({ hp: 1e7, pos: [x, 0, 0] }), log = spy(e);
      shoot(h, e);
      return { n: by(log, 'a_disparo')[0].n, x: e.pos.x, p: h.p };
    };
    const a = run({ c6: 1 }, { c6: 'A' }, 3), b = run({}, {}, 3);
    near(a.n / b.n, addRatio(a.p, 15), 'c6A: +15 % a 3 m');
    ok(a.x - b.x > 0.7, `c6A: empujado ~1 m (${a.x.toFixed(2)} vs ${b.x.toFixed(2)})`);
    const fa = run({ c6: 1 }, { c6: 'A' }, 7), fb = run({}, {}, 7);
    eq(fa.n, fb.n, 'c6A: a 7 m, sin bono');
  }
  // c6B Tiro Lejano: a más de 10 m, +20 % (tus flechas; la Red no)
  {
    const h = cls({ c6: 1 }, { c6: 'B' }), b = cls();
    const far = [h.enemy({ hp: 1e7, pos: [12, 0, 0] }), b.enemy({ hp: 1e7, pos: [12, 0, 0] })];
    const close = [h.enemy({ hp: 1e7, pos: [8, 0, 0] }), b.enemy({ hp: 1e7, pos: [8, 0, 0] })];
    near(roll(h, far[0]) / roll(b, far[1]), addRatio(h.p, 20), 'c6B: +20 % a 12 m');
    eq(roll(h, close[0]), roll(b, close[1]), 'c6B: a 8 m, sin bono');
    eq(roll(h, far[0], 'a_red'), roll(b, far[1], 'a_red'), 'c6B: solo tus flechas');
    const e = h.enemy({ hp: 1e7, pos: [12, 0, 0] }), log = spy(e);
    cast(h, 'rmb', 'flecha_perforante', 12, 0, 1.0);
    const ef = b.enemy({ hp: 1e7, pos: [12, 0, 0] }), lf = spy(ef);
    cast(b, 'rmb', 'flecha_perforante', 12, 0, 1.0);
    near(by(log, 'flecha_perforante')[0].n / by(lf, 'flecha_perforante')[0].n, addRatio(h.p, 20), 'c6B: la Flecha Perforante real a 12 m');
  }
  // c9B Punta de Diamante: Flecha Perforante +40 % al PRIMER enemigo que toca
  {
    const run = (ranks, choice) => {
      const h = cls(ranks, choice);
      const e1 = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
      const l1 = spy(e1), l2 = spy(e2);
      cast(h, 'rmb', 'flecha_perforante', 6, 0, 0.8);
      return [by(l1, 'flecha_perforante')[0].n, by(l2, 'flecha_perforante')[0].n, h.p];
    };
    const [a1, a2, p] = run({ c9: 1 }, { c9: 'B' }), [b1, b2] = run({}, {});
    near(a1 / b1, addRatio(p, 40), 'c9B: +40 % al primero');
    eq(a2, b2, 'c9B: el segundo, sin bono');
  }
});

// ============================================================ árbol de clase: control y supervivencia
section('clase: Flecha Roma, Silbante, Camuflaje, Instinto, Paso de Abrojos y Paso Sanador', () => {
  // c10A Flecha Roma: cada 8 s, el siguiente disparo ralentiza 50 % 4 s
  {
    const h = cls({ c10: 1 }, { c10: 'A' });
    const e1 = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
    shoot(h, e1);
    ok(e1.slowT > 3 && e1.slowPct === 50, 'c10A: ralentiza 50 % ~4 s');
    shoot(h, e2);
    ok(!(e2.slowT > 0), 'c10A: el siguiente, no (8 s)');
    h.tick(8);
    shoot(h, e2);
    ok(e2.slowT > 3 && e2.slowPct === 50, 'c10A: a los 8 s, otra vez');
    const b = cls(), f = b.enemy({ hp: 1e7, pos: [3, 0, 0] });
    shoot(b, f);
    ok(!(f.slowT > 0), 'sin c10A: no ralentiza');
  }
  // c10B Flecha Silbante: cada 10 s, corta el hechizo y deja mudo 3 s
  {
    const h = cls({ c10: 1 }, { c10: 'B' });
    const e1 = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
    let cut = 0;
    e1.beginCast('prueba', 2, () => {}, { onInterrupt: () => { cut++; } });
    shoot(h, e1);
    ok(e1.silenceT > 2.3 && cut === 1 && !e1.casting, 'c10B: interrumpe y deja mudo ~3 s');
    shoot(h, e2);
    ok(!(e2.silenceT > 0), 'c10B: el siguiente, no (10 s)');
    const b = cls(), f = b.enemy({ hp: 1e7, pos: [3, 0, 0] });
    shoot(b, f);
    ok(!(f.silenceT > 0), 'sin c10B: no silencia');
  }
  // c11A Camuflaje: activa (invisible 4 s, recarga Paso Veloz) + primer ataque crítico
  {
    const h = cls({ c11: 1 }, { c11: 'A' });
    const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), log = spy(e);
    ok(isKnown(h.p, SK('a_t_camuflaje')), 'c11A concede Camuflaje');
    cast(h, 'k1', 'a_paso', -3, 0, 0.4);
    ok(h.p.cds.a_paso > 5, 'Paso Veloz en enfriamiento');
    ok(cast(h, 'k2', 'a_t_camuflaje', 0, 0, 0.1), 'Camuflaje se lanza');
    ok(h.p.isInvisible(), 'c11A: invisible');
    ok(!(h.p.cds.a_paso > 0), 'c11A: Paso Veloz recargado');
    shoot(h, e);
    ok(by(log, 'a_disparo')[0]?.crit === true && !h.p.isInvisible(), 'c11A: el disparo desde la invisibilidad es crítico y la rompe');
    shoot(h, e);
    ok(by(log, 'a_disparo')[1]?.crit === false, 'c11A: solo el primero');
    // al acabarse sola, queda cebado el crítico del siguiente disparo
    h.tick(20);
    cast(h, 'k2', 'a_t_camuflaje', 0, 0, 0.1);
    h.tick(4.5);
    ok(!h.p.isInvisible(), 'la invisibilidad acaba a los 4 s');
    shoot(h, e);
    ok(by(log, 'a_disparo')[2]?.crit === true, 'c11A: el primer disparo al salir, crítico');
    ok(!isKnown(cls({ c11: 1 }, { c11: 'B' }).p, SK('a_t_camuflaje')), 'c11B no concede Camuflaje');
  }
  // c11B Instinto de Supervivencia: el golpe letal te deja a 1 y suelta un humo gratis (cada 180 s)
  {
    const h = cls({ c11: 1 }, { c11: 'B' });
    const p = h.p;
    p.hp = 50;
    p.takeDamage(1e6, 1);
    ok(p.alive && p.hp === 1, 'c11B: queda con 1 de vida');
    h.step(0.1);
    const smoke = h.g.fields.filter(f => !f.dead && f.data?.skill === 'a_humo');
    ok(smoke.length === 1 && Math.hypot(smoke[0].pos.x - p.pos.x, smoke[0].pos.z - p.pos.z) < 0.5, 'c11B: Bomba de Humo gratis a sus pies');
    ok(!(p.cds.a_humo > 0), 'c11B: el humo gratis no pone la Bomba en enfriamiento');
    p.hp = 50;
    p.takeDamage(1e6, 1);
    ok(!p.alive, 'c11B: una vez cada 180 s');
    const b = cls();
    b.p.hp = 50; b.p.takeDamage(1e6, 1);
    ok(!b.p.alive, 'sin c11B: muere');
  }
  // c14A Paso de Abrojos: abrojos 3 s donde empieza el Paso (ralentizan 50 %)
  {
    const h = cls({ c14: 1 }, { c14: 'A' });
    const e = h.enemy({ hp: 1e7, pos: [1, 0, 0] });
    cast(h, 'k1', 'a_paso', -6, 0, 0.5);
    ok(h.p.pos.x < -4, 'rodó lejos');
    ok(e.slowT > 0 && e.slowPct === 50, 'c14A: el enemigo en los abrojos, ralentizado al 50 %');
    h.tick(3.2);
    ok(!h.g.fields.some(f => !f.dead && f.data?.skill === 'a_paso_abrojos'), 'c14A: los abrojos duran 3 s');
    const b = cls(), f = b.enemy({ hp: 1e7, pos: [1, 0, 0] });
    cast(b, 'k1', 'a_paso', -6, 0, 0.5);
    ok(!(f.slowT > 0), 'sin c14A: nada');
  }
  // c14B Paso Sanador: +6 % de vida al rodar (una vez cada 12 s)
  {
    const h = cls({ c14: 1 }, { c14: 'B' }), p = h.p, max = p.stats.maxHP;
    const roll1 = () => { p.hp = max / 2; const before = p.hp; cast(h, 'k1', 'a_paso', -6, 0, 0.4); return p.hp - before; };
    const healed = roll1();
    near(healed, max * 0.06 * (1 + (p.stats.healPct || 0) / 100), 'c14B: cura un 6 %', 0.05);
    h.g.reduceCooldown(p, 'a_paso', Infinity);
    ok(roll1() < max * 0.005, 'c14B: no otra vez antes de 12 s');
    h.tick(12);
    ok(roll1() > max * 0.05, 'c14B: a los 12 s, otra vez');
    const b = cls();
    b.p.hp = b.p.stats.maxHP / 2;
    cast(b, 'k1', 'a_paso', -6, 0, 0.4);
    ok(b.p.hp - b.p.stats.maxHP / 2 < b.p.stats.maxHP * 0.005, 'sin c14B: no cura');
  }
});

section('clase: Adrenalina, Calma Letal, Presión, Barrido y Huida', () => {
  // baja la vida de justo por encima de `frac` a justo por debajo (vivo)
  const cross = (h, frac) => {
    const p = h.p;
    p.hp = p.stats.maxHP * frac + 5; p.mp = 0;
    p.takeDamage(p.stats.maxHP * 0.1, 1);
    assert.ok(p.alive && p.hp < p.stats.maxHP * frac, 'cruza el umbral con vida');
    return p;
  };
  // c15A Adrenalina: al bajar del 50 %, +30 de Energía y −20 % de daño 4 s (cada 30 s)
  {
    const h = cls({ c15: 1 }, { c15: 'A' });
    const p = cross(h, 0.5);
    ok(p.mp >= 30 - 1e-6 && p.mp < 31, `c15A: +30 de Energía (${p.mp})`);
    ok(p.buffs.some(b => b.id === 'a_adrenalina' && b.stats.dr === 20), 'c15A: −20 % de daño recibido');
    h.tick(5);
    ok(!p.buffs.some(b => b.id === 'a_adrenalina'), 'c15A: 4 s');
    cross(h, 0.5);
    ok(p.mp < 1, 'c15A: una vez cada 30 s');
    const b = cross(cls(), 0.5);
    ok(b.mp < 1 && !b.buffs.some(x => x.id === 'a_adrenalina'), 'sin c15A: nada');
  }
  // c15B Calma Letal: con más de 40 de Energía, +10 %
  {
    const h = cls({ c15: 1 }, { c15: 'B' }), b = cls();
    const e = h.enemy({ hp: 1e7 }), f = b.enemy({ hp: 1e7 });
    h.p.mp = b.p.mp = 50;
    near(roll(h, e) / roll(b, f), addRatio(h.p, 10), 'c15B: +10 % con 50 de Energía');
    h.p.mp = b.p.mp = 40;
    eq(roll(h, e), roll(b, f), 'c15B: con 40, nada');
  }
  // c16A Presión Constante: +4 % por flecha al mismo enemigo (hasta +20 %); se pierde al cambiar
  {
    const h = cls({ c16: 1 }, { c16: 'A' }), b = cls();
    const e1 = h.enemy({ hp: 1e7 }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 3] }), f = b.enemy({ hp: 1e7 });
    const base = roll(b, f);
    eq(roll(h, e1), base, 'c16A: sin golpes previos, nada');
    for (let i = 0; i < 3; i++) h.hit(e1, { skill: 'a_disparo' });
    near(roll(h, e1) / base, addRatio(h.p, 12), 'c16A: 3 flechas → +12 %');
    for (let i = 0; i < 4; i++) h.hit(e1, { skill: 'flecha_perforante' });
    near(roll(h, e1) / base, addRatio(h.p, 20), 'c16A: tope +20 %');
    h.hit(e1, { skill: 'a_red' });
    near(roll(h, e1) / base, addRatio(h.p, 20), 'c16A: la Red no cuenta ni rompe');
    h.hit(e2, { skill: 'a_disparo' });
    eq(roll(h, e1), base, 'c16A: al cambiar de blanco, se pierde');
    near(roll(h, e2) / base, addRatio(h.p, 4), 'c16A: el nuevo blanco empieza en +4 %');
  }
  // c16B Barrido de Caza: +3 % de velocidad de ataque por enemigo distinto en 2 s (hasta +15 %)
  {
    const h = cls({ c16: 1 }, { c16: 'B' });
    const base = h.p.stats.aspdPct;
    const es = [0, 1, 2, 3, 4, 5, 6].map(i => h.enemy({ hp: 1e7, pos: [2 + i, 0, 0] }));
    h.hit(es[0], { skill: 'a_disparo' }); h.hit(es[0], { skill: 'a_disparo' });
    eq(h.p.stats.aspdPct - base, 3, 'c16B: el mismo enemigo cuenta una vez');
    h.hit(es[1], { skill: 'a_disparo' }); h.hit(es[2], { skill: 'lluvia_flechas' });
    eq(h.p.stats.aspdPct - base, 9, 'c16B: tres distintos → +9 %');
    for (const e of es) h.hit(e, { skill: 'a_disparo' });
    eq(h.p.stats.aspdPct - base, 15, 'c16B: tope +15 %');
    h.tick(2.3);
    eq(h.p.stats.aspdPct, base, 'c16B: se pierde a los 2 s');
  }
  // c17B Huida Desesperada: al bajar del 30 %, +40 % de velocidad y −20 % de daño 4 s
  {
    const h = cls({ c17: 1 }, { c17: 'B' });
    const spd = h.p.stats.spdPct;
    const p = cross(h, 0.3);
    ok(p.buffs.some(b => b.id === 'a_huida' && b.stats.dr === 20), 'c17B: −20 % de daño');
    ok(p.stats.spdPct > spd, 'c17B: más velocidad');
    h.tick(4.5);
    ok(!p.buffs.some(b => b.id === 'a_huida'), 'c17B: 4 s');
    p.hp = p.stats.maxHP;
    cross(h, 0.3);
    ok(!p.buffs.some(b => b.id === 'a_huida'), 'c17B: una vez cada 60 s');
    ok(!cross(cls(), 0.3).buffs.some(b => b.id === 'a_huida'), 'sin c17B: nada');
  }
});

section('clase: humo (Tiro desde la Niebla, Emboscada, Manto de Niebla) y Lluvia en Retirada', () => {
  // c19 Tiro desde la Niebla: dentro del humo, cada Disparo Rápido +3 de Energía y +0,3 s de humo
  {
    const run = (ranks, outside = false) => {
      const h = cls(ranks);
      const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
      cast(h, 'k2', 'a_humo', 0, 0, 0.1);
      const zone = h.g.fields.find(f => f.data?.skill === 'a_humo');
      const dur0 = zone.dur;
      if (outside) h.p.pos.set(-6, 0, 0);
      ready(h);
      h.p.mp = 0;
      shoot(h, e);
      return { mp: h.p.mp, ext: zone.dur - dur0, h, e, zone };
    };
    const a = run({ c19: 1 }), b = run({});
    near(a.mp - b.mp, 3, 'c19: +3 de Energía por disparo en el humo', 0.001);
    near(a.ext, 0.3, 'c19: el humo dura 0,3 s más', 0.001);
    eq(b.ext, 0, 'sin c19: el humo no se alarga');
    for (let i = 0; i < 10; i++) shoot(a.h, a.e, 0.3);
    near(a.zone.dur - 8, 2, 'c19: como mucho +2 s', 0.001);
    const o = run({ c19: 1 }, true), ob = run({}, true);
    near(o.mp, ob.mp, 'c19: fuera del humo, nada', 0.001);
    eq(o.ext, 0, 'c19: fuera del humo, no lo alarga');
  }
  // c25 Emboscada: al salir del humo, los r+1 siguientes disparos son críticos seguros
  {
    const h = cls({ c25: 1 }), e = h.enemy({ hp: 1e7, pos: [9, 0, 0] }), log = spy(e);
    cast(h, 'k2', 'a_humo', 0, 0, 0.1);
    shoot(h, e);
    ok(by(log, 'a_disparo')[0]?.crit === false, 'c25: dentro del humo, normal');
    h.p.pos.set(5, 0, 0);
    h.tick(0.2);
    for (let i = 0; i < 3; i++) shoot(h, e);
    assert.deepEqual(by(log, 'a_disparo').slice(1).map(x => x.crit), [true, true, false], 'c25 r1: 2 disparos críticos al salir'); checks++;
    // al acabarse el humo estando dentro, también
    const h2 = cls({ c25: 3 }), e2 = h2.enemy({ hp: 1e7, pos: [3, 0, 0] }), l2 = spy(e2);
    cast(h2, 'k2', 'a_humo', 0, 0, 0.1);
    h2.tick(8.2);
    for (let i = 0; i < 5; i++) shoot(h2, e2);
    assert.deepEqual(by(l2, 'a_disparo').map(x => x.crit), [true, true, true, true, false], 'c25 r3: 4 críticos al acabarse'); checks++;
  }
  // c28 Manto de Niebla: el humo te sigue, −25 % (antes −50 %) y cura a los aliados 0,25 %/s por rango
  {
    const h = cls({ c28: 2 }), ally = h.ally(1, 0, 1000);
    ally.hp = 500;
    cast(h, 'k2', 'a_humo', 0, 0, 0.2);
    const zone = h.g.fields.find(f => f.data?.skill === 'a_humo');
    eq(zone.data.allyDr, 25, 'c28: −25 % dentro');
    h.p.pos.set(3, 0, 0);
    h.tick(0.3);
    ok(Math.abs(zone.pos.x - 3) < 0.2, 'c28: el humo sigue a la arquera');
    ally.pos.set(3.5, 0, 0);
    const before = ally.hp;
    h.tick(2);
    near(ally.hp - before, 1000 * 0.005 * 2, 'c28 r2: el aliado se cura 0,5 %/s', 0.1);
    const b = cls(), al = b.ally(1, 0, 1000);
    al.hp = 500;
    cast(b, 'k2', 'a_humo', 0, 0, 0.2);
    const z = b.g.fields.find(f => f.data?.skill === 'a_humo');
    b.p.pos.set(3, 0, 0);
    b.tick(2);
    ok(z.data.allyDr >= 50, `sin c28: −50 % o más con el rango (${z.data.allyDr})`);
    ok(Math.abs(z.pos.x) < 1e-6, `sin c28: el humo se queda (${z.pos.x})`);
    eq(al.hp, 500, 'sin c28: sin cura');
  }
  // c20 Lluvia en Retirada: Paso Veloz suelta una Lluvia de Flechas gratis al 30 % donde empezó
  {
    const h = cls({ c20: 1 }), e = h.enemy({ hp: 1e7, pos: [0.5, 0, 0] }), log = spy(e);
    h.p.mp = 0;
    cast(h, 'k1', 'a_paso', -6, 0, 2.5);
    const rain = by(log, 'lluvia_flechas');
    ok(rain.length >= 3, `c20: la lluvia cae donde empezó (${rain.length} oleadas)`);
    ok(!(h.p.cds.lluvia_flechas > 0), 'c20: gratis (sin enfriamiento)');
    const b = cls(), f = b.enemy({ hp: 1e7, pos: [0.5, 0, 0] }), lf = spy(f);
    cast(b, 'rmb', 'lluvia_flechas', 0.5, 0, 2.5);
    near(rain[0].n / by(lf, 'lluvia_flechas')[0].n, 0.3, 'c20: al 30 %');
    const c = cls(), g2 = c.enemy({ hp: 1e7, pos: [0.5, 0, 0] }), lg = spy(g2);
    cast(c, 'k1', 'a_paso', -6, 0, 2.5);
    eq(by(lg, 'lluvia_flechas').length, 0, 'sin c20: no llueve');
  }
});

section('clase: Recarga en Marcha, Compás, Tras la Rodada, Danza del Arco y Sombra Gemela', () => {
  // c23 Recarga en Marcha: cada principal recarga 0,3 s/rango de Paso Veloz y de la Bomba de Humo
  {
    const run = ranks => {
      const h = cls(ranks), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
      cast(h, 'k1', 'a_paso', -3, 0, 0.4);
      cast(h, 'k2', 'a_humo', 0, 0, 0.4);
      cast(h, 'rmb', 'flecha_perforante', e.pos.x, e.pos.z, 1.2);
      const paso = h.p.cds.a_paso, humo = h.p.cds.a_humo;
      h.tick(8);                                   // la Bomba de Humo se recarga al disiparse
      return { paso, humo, after: h.p.cds.a_humo };
    };
    const a = run({ c23: 2 }), b = run({});
    near(b.paso - a.paso, 0.6, 'c23 r2: −0,6 s a Paso Veloz', 0.001);
    near(b.humo - a.humo, 0, 'c23: mientras dura el humo su recarga no corre', 0.001);
    near(b.after - a.after, 0.6, 'c23 r2: −0,6 s a la Bomba de Humo (al disiparse)', 0.001);
  }
  // c26 Compás: alternar básica y principal da Compases (+2 %/rango cada uno; se pierden a los 3 s)
  {
    const h = cls({ c26: 3 }), b = cls();
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), f = b.enemy({ hp: 1e7, pos: [4, 0, 0] });
    shoot(h, e, 0.8);
    cast(h, 'rmb', 'flecha_perforante', 4, 0, 0.8);
    shoot(h, e, 0.8);
    eq(powerState(h.p, 'a_compas').n, 2, 'c26: dos alternancias → 2 Compases');
    near(roll(h, e) / roll(b, f), addRatio(h.p, 12), 'c26 r3: 2 Compases → +12 %');
    shoot(h, e, 0.8);
    eq(powerState(h.p, 'a_compas').n, 2, 'c26: dos básicos seguidos no suman');
    h.tick(3.2);
    eq(roll(h, e), roll(b, f), 'c26: se pierden a los 3 s');
  }
  // c27 Tras la Rodada: tras Paso Veloz, la siguiente principal no cuesta y hace +10 %/rango
  {
    const h = cls({ c27: 2 }), b = cls();
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), f = b.enemy({ hp: 1e7, pos: [4, 0, 0] });
    const le = spy(e), lf = spy(f);
    for (const x of [h, b]) cast(x, 'k1', 'a_paso', 0, -3, 0.4);
    eq(resolveSkill(h.p, SK('flecha_perforante')).cost, 0, 'c27: la principal no cuesta');
    for (const [x, en] of [[h, e], [b, f]]) { x.p.mp = 50; cast(x, 'rmb', 'flecha_perforante', en.pos.x, en.pos.z, 0.8); }
    ok(h.p.mp > 45, `c27: no gastó Energía (${h.p.mp})`);
    ok(b.p.mp < 30, 'sin c27: sí gastó');
    near(by(le, 'flecha_perforante')[0].n / by(lf, 'flecha_perforante')[0].n, addRatio(h.p, 20), 'c27 r2: +20 %');
    eq(resolveSkill(h.p, SK('flecha_perforante')).cost, 26, 'c27: solo la siguiente');
  }
  // c29 Danza del Arco: con 5 Compases, la siguiente principal es gratis, crítica y +20 %/rango
  {
    const h = cls({ c26: 1, c29: 1 }), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), log = spy(e);
    for (let i = 0; i < 3; i++) { shoot(h, e, 0.8); cast(h, 'rmb', 'flecha_perforante', 4, 0, 0.8); }
    eq(powerState(h.p, 'a_compas').n, 5, '5 Compases');
    const prof = resolveSkill(h.p, SK('flecha_perforante'));
    ok(prof.cost === 0 && prof.forceCrit, 'c29: gratis y crítica');
    h.p.mp = 50;
    cast(h, 'rmb', 'flecha_perforante', 4, 0, 0.8);
    const hits = by(log, 'flecha_perforante');
    ok(hits[hits.length - 1].crit && hits.slice(0, -1).every(x => !x.crit), 'c29: solo esa sale crítica');
    ok(h.p.mp > 45, 'c29: no gastó Energía');
    eq(powerState(h.p, 'a_compas').n, 0, 'c29: los Compases vuelven a 0');
    const b = cls({ c26: 1 }), f = b.enemy({ hp: 1e7, pos: [4, 0, 0] });
    for (let i = 0; i < 3; i++) { shoot(b, f, 0.8); cast(b, 'rmb', 'flecha_perforante', 4, 0, 0.8); }
    ok(resolveSkill(b.p, SK('flecha_perforante')).cost === 26, 'sin c29: cuesta');
  }
  // c30 Sombra Gemela: la sombra repite tus principales al 15 + 15·r % durante 3 s
  {
    const h = cls({ c30: 2 }), e = h.enemy({ hp: 1e7, pos: [4, 0, 4] }), log = spy(e);
    cast(h, 'k1', 'a_paso', -3, 0, 0.4);
    h.p.mp = 100;
    cast(h, 'rmb', 'flecha_perforante', e.pos.x, e.pos.z, 1.2);
    const fp = by(log, 'flecha_perforante');
    eq(fp.length, 2, 'c30: la sombra repite la principal');
    near(fp[1].n / fp[0].n, 0.45, 'c30 r2: al 45 %');
    ok(fp[1].echo, 'c30: la repetición es un eco');
    h.tick(3);
    cast(h, 'rmb', 'flecha_perforante', e.pos.x, e.pos.z, 1.2);
    eq(by(log, 'flecha_perforante').length, 3, 'c30: a los 3 s ya no repite');
  }
  // c22A Flecha Bengala: bengala 10 s; dentro reciben +15 % y pegan un 15 % menos
  {
    const h = cls({ c22: 1 }, { c22: 'A' }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    ok(isKnown(h.p, SK('a_t_bengala')), 'c22A concede Flecha Bengala');
    ok(cast(h, 'k2', 'a_t_bengala', 6, 0, 0.3), 'Flecha Bengala se lanza');
    ok(e.debuffs.a_t_bengala?.pct === 15, 'c22A: Debilidad del 15 %');
    near(e.outDmgMul(), 0.85, 'c22A: pega un 15 % menos');
    h.tick(10.5);
    ok(!e.debuffs.a_t_bengala && !h.g.fields.some(f => !f.dead && f.kind === 'a_bengala'), 'c22A: dura 10 s');
    ok(!isKnown(cls({ c22: 1 }, { c22: 'B' }).p, SK('a_t_bengala')), 'c22B no concede la Bengala');
  }
});

// ============================================================ Errante del Viento (h1)
const TORBELLINO = { id: 'a_h_torbellino', name: 'Torbellino', cat: 'utility', slots: ['k2'], tags: ['utility', 'physical'], type: 'buff', cd: 20, dur: 1, buff: { aspdPct: 1 } };
const gusts = h => powerState(h.p, 'q_rafagas').n || 0;
// gasta las Ráfagas con una Flecha Perforante y devuelve los golpes de viento
function volley(h, e, at = e) {
  const log = e.__log || (e.__log = spy(e));
  const before = by(log, 'q_rafagas').length;
  h.p.mp = h.p.stats.maxMP;
  cast(h, 'rmb', 'flecha_perforante', at.pos.x, at.pos.z, 1.2);
  return by(log, 'q_rafagas').slice(before);
}

section('héroe Errante del Viento: Ráfagas y sus nodos', () => {
  // q0 Ráfagas: una cada 4 s (hasta 3); la siguiente principal suelta una flecha de viento por Ráfaga
  {
    const h = hero('h1');
    h.tick(3.9);
    eq(gusts(h), 0, 'q0: aún ninguna a 3,9 s');
    h.tick(0.2);
    eq(gusts(h), 1, 'q0: una a los 4 s');
    h.tick(12);
    eq(gusts(h), 3, 'q0: hasta 3');
    const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    const w = volley(h, e);
    eq(w.length, 3, 'q0: 3 flechas de viento');
    ok(w.every(x => x.echo && !x.proc), 'q0: golpes reales marcados como eco');
    eq(gusts(h), 0, 'q0: se gastan');
    const c = hero('h1', {}, {}, { open: false });
    c.tick(12);
    eq(gusts(c), 0, 'sin el Paragon abierto, el árbol héroe no aporta');
  }
  // q1 Brisa Constante: cada 3 s
  { const h = hero('h1', { q1: 1 }); h.tick(3.05); eq(gusts(h), 1, 'q1: una Ráfaga a los 3 s'); }
  // q2A Viento a Favor: +1 Ráfaga cada 15 m recorridos
  {
    const h = hero('h1', { q2: 1 }, { q2: 'A' }), b = hero('h1');
    for (const x of [h, b]) for (let i = 0; i < 16; i++) { x.p.pos.x += 1; x.tick(0.1); }
    eq(gusts(h), 1, 'q2A: 15 m → una Ráfaga');
    eq(gusts(b), 0, 'sin q2A: ninguna');
  }
  // q2B Aire Quieto: quieta, una cada 2 s
  {
    const h = hero('h1', { q2: 1 }, { q2: 'B' });
    h.tick(2.05);
    eq(gusts(h), 1, 'q2B: quieta, una a los 2 s');
    const m = hero('h1', { q2: 1 }, { q2: 'B' });
    for (let i = 0; i < 21; i++) { m.p.moving = true; m.g.step(0.1); m.p.pos.x += 0.3; }
    eq(gusts(m), 0, 'q2B: moviéndose, el ritmo normal');
  }
  // q3 Plumas de Aire: atraviesan a 2 enemigos (3 en total)
  {
    const run = nodes => {
      const h = hero('h1', nodes), es = [4, 6, 8].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] }));
      const logs = es.map(spy);
      h.tick(4.05);
      volley(h, es[0], es[0]);
      return logs.map(l => by(l, 'q_rafagas').length);
    };
    assert.deepEqual(run({ q3: 1 }), [1, 1, 1], 'q3: una flecha de viento atraviesa a los 3'); checks++;
    assert.deepEqual(run({}), [1, 0, 0], 'sin q3: solo al primero'); checks++;
  }
  // q4B Corriente Protectora: con 3 Ráfagas, −15 % de daño recibido
  {
    const taken = (nodes, t) => { const h = hero('h1', nodes, { q4: 'B' }); h.tick(t); h.p.hp = h.p.stats.maxHP; h.p.takeDamage(800, 1); return h.p.stats.maxHP - h.p.hp; };
    ok(taken({ q4: 1 }, 12.1) < taken({}, 12.1) * 0.95, 'q4B: con 3 Ráfagas recibe menos');
    eq(taken({ q4: 1 }, 8.1), taken({}, 8.1), 'q4B: con 2, igual');
  }
  // q5 Aire Afilado: +30 % a las flechas de viento
  {
    const run = nodes => { const h = hero('h1', nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); h.tick(4.05); return [volley(h, e)[0].n, h.p]; };
    const [a, p] = run({ q5: 1 }), [b] = run({});
    near(a / b, addRatio(p, 30), 'q5: +30 %');
  }
  // q6 Empuje del Aire: gastar 3 Ráfagas da +15 de tu mecánica (Impulso). Sin la pérdida quieta del
  // Impulso (stat gaugeLoss) para medir solo lo que da el nodo
  {
    const still = h => { h.p.addBuff('test_sin_perdida', { 'gaugeLoss:impulso': -100 }, 999); return h; };
    const run = nodes => { const h = still(hero('h1', nodes)), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); h.tick(12.1); const g0 = h.gaugeValue('impulso'); volley(h, e); return h.gaugeValue('impulso') - g0; };
    near(run({ q6: 1 }) - run({}), 15, 'q6: +15 de Impulso', 0.01);
    const two = still(hero('h1', { q6: 1 })), e = two.enemy({ hp: 1e7, pos: [5, 0, 0] }), b2 = still(hero('h1')), f = b2.enemy({ hp: 1e7, pos: [5, 0, 0] });
    two.tick(8.1); b2.tick(8.1);
    const g0 = two.gaugeValue('impulso'), f0 = b2.gaugeValue('impulso');
    volley(two, e); volley(b2, f);
    near(two.gaugeValue('impulso') - g0, b2.gaugeValue('impulso') - f0, 'q6: con 2 Ráfagas, nada', 0.01);
  }
  // q7 Rachas: gastar 3 Ráfagas recarga 2 s la insignia (Andanada, la de la Tiradora). El Torbellino
  // da las 3 Ráfagas sin esperar a que la insignia se recargue sola
  {
    const run = nodes => {
      const h = hero('h1', nodes, {}, { inject: { skills: [TORBELLINO] } }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
      cast(h, 'k3', 'a_t_andanada', 5, 0, 0.1);
      const cd0 = h.p.cds.a_t_andanada || 0;
      cast(h, 'k2', 'a_h_torbellino', 0, 0, 0.1);
      volley(h, e);
      return [h.p.cds.a_t_andanada || 0, cd0];
    };
    const [a, cd0] = run({ q7: 1 }), [b] = run({});
    ok(cd0 > 4, 'la Andanada queda en recarga');
    near(b - a, 2, 'q7: −2 s a la insignia', 0.001);
  }
  // q8A Ojo de la Racha: buscan al de más vida y +25 % a élites
  {
    const run = nodes => {
      const h = hero('h1', nodes, { q8: 'A' });
      const small = h.enemy({ hp: 1e5, pos: [4, 0, 0] }), big = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 6] });
      const ls = spy(small), lb = spy(big);
      h.tick(4.05);
      volley(h, small, small);
      return [by(ls, 'q_rafagas').length, by(lb, 'q_rafagas'), h.p];
    };
    const [s, bigHits, p] = run({ q8: 1 }), [s0, big0] = run({});
    ok(s === 0 && bigHits.length === 1, 'q8A: va al de más vida');
    ok(s0 === 1 && big0.length === 0, 'sin q8A: al más cercano a la mira');
    const h = hero('h1'), big = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] });
    h.tick(4.05);
    near(bigHits[0].n / volley(h, big)[0].n, addRatio(p, 25), 'q8A: +25 % al élite');
  }
  // q8B Abanico de Aire: en abanico hacia la mira y atraviesan a 3
  {
    const run = nodes => {
      const h = hero('h1', nodes, { q8: 'B' });
      const es = [3, 5, 7, 9].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] })), logs = es.map(spy);
      h.tick(4.05);
      volley(h, es[0], es[3]);
      return logs.map(l => by(l, 'q_rafagas').length);
    };
    assert.deepEqual(run({ q8: 1 }), [1, 1, 1, 1], 'q8B: la flecha atraviesa a 3 (4 en total)'); checks++;
    assert.deepEqual(run({}), [0, 0, 0, 1], 'sin q8B: una flecha al más cercano a la mira'); checks++;
    // con 3 Ráfagas, abanico hacia la mira: también alcanza a los de los lados
    const fan = nodes => {
      const h = hero('h1', nodes, { q8: 'B' });
      const side = [h.enemy({ hp: 1e7, pos: [6, 0, 1.6] }), h.enemy({ hp: 1e7, pos: [6, 0, -1.6] })], logs = side.map(spy);
      h.tick(12.1);
      volley(h, h.enemy({ hp: 1e7, pos: [12, 0, 0] }), { pos: { x: 12, z: 0 } });
      return logs.map(l => by(l, 'q_rafagas').length);
    };
    assert.deepEqual(fan({ q8: 1 }), [1, 1], 'q8B: el abanico alcanza a los dos lados'); checks++;
  }
  // q9 Aire Pesado: ralentizan un 30 % 2 s
  {
    const h = hero('h1', { q9: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    h.tick(4.05);
    volley(h, e);
    ok(e.slowT > 1 && e.slowPct === 30, 'q9: ralentiza al 30 %');
    const b = hero('h1'), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] });
    b.tick(4.05);
    volley(b, f);
    ok(!(f.slowT > 0), 'sin q9: no');
  }
  // q10 Tormenta Guardada: hasta 5
  { const h = hero('h1', { q10: 1 }); h.tick(20.1); eq(gusts(h), 5, 'q10: hasta 5 Ráfagas'); }
  // q11 Silbido: un crítico de viento devuelve una Ráfaga
  {
    const run = nodes => { const h = hero('h1', nodes, {}, { powers: ['test_arq_crit_viento'] }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); h.tick(12.1); const w = volley(h, e); return [w, gusts(h)]; };
    const [w, n] = run({ q11: 1 }), [, n0] = run({});
    ok(w.length === 3 && w.every(x => x.crit), 'las flechas de viento salen críticas (poder de prueba)');
    eq(n, 1, 'q11: devuelve una Ráfaga');
    eq(n0, 0, 'sin q11: ninguna');
  }
  // Torbellino (activa de KA1, sintética aquí): da 3 Ráfagas
  {
    const h = hero('h1', {}, {}, { inject: { skills: [TORBELLINO] } });
    eq(gusts(h), 0, 'sin Ráfagas al empezar');
    cast(h, 'k2', 'a_h_torbellino', 0, 0, 0.1);
    eq(gusts(h), 3, 'Torbellino: +3 Ráfagas');
    eq(volley(h, h.enemy({ hp: 1e7, pos: [5, 0, 0] })).length, 3, 'Torbellino: salen con la siguiente principal');
  }
  // q12 Rosa de los Vientos: cada 25 s, 6 s con una Ráfaga por segundo y +50 % de daño de viento
  {
    const h = hero('h1', { q12: 1 }), b = hero('h1');
    const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] });
    h.tick(25.05); b.tick(25.05);
    ok(powerState(h.p, 'q_rosa').storm > 5, 'q12: el viento ruge');
    const a = volley(h, e), z = volley(b, f);
    near(a[0].n / z[0].n, addRatio(h.p, 50), 'q12: +50 % durante la Rosa');
    h.tick(1.05); b.tick(1.05);
    ok(gusts(h) >= 1 && gusts(b) === 0, 'q12: una Ráfaga por segundo');
  }
});

// ============================================================ Carcaj Encantado (h2)
const tipHit = (h, e, skill = 'a_disparo') => h.hit(e, { skill, tags: ['proj'] });
const burnLeft = (h, e) => h.g.dotRemaining(e, 'burn');

section('héroe Carcaj Encantado: Puntas y sus nodos', () => {
  // w0: cada 6 s la siguiente flecha lleva punta: Fuego (quema) → Hielo (frena 40 %) → Rayo (80 %, salta a 3)
  {
    const h = hero('h2');
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    const others = [1, 2, 3, 4].map(i => h.enemy({ hp: 1e7, pos: [4, 0, i] }));
    const lo = others.map(spy), le = spy(e);
    tipHit(h, e);
    ok(burnLeft(h, e) > 0, 'w0: Fuego quema');
    tipHit(h, others[0]);
    ok(!(burnLeft(h, others[0]) > 0) && !(others[0].slowT > 0), 'w0: hasta 6 s, sin punta');
    h.tick(6);
    tipHit(h, e);
    ok(e.slowT > 2 && e.slowPct === 40, 'w0: Hielo frena un 40 %');
    h.tick(6);
    tipHit(h, e);
    const jumps = lo.map(l => by(l, 'w_puntas').filter(x => !x.dot).length);
    eq(by(le, 'w_puntas').filter(x => !x.dot).length, 1, 'w0: Rayo al blanco');
    eq(jumps.filter(n => n === 1).length, 3, 'w0: Rayo salta a 3');
    const c = hero('h2', {}, {}, { open: false }), f = c.enemy({ hp: 1e7 });
    tipHit(c, f);
    ok(!(burnLeft(c, f) > 0), 'sin el Paragon, sin puntas');
  }
  // w1 Encantamiento Rápido: cada 4 s
  {
    const run = nodes => { const h = hero('h2', nodes), e = h.enemy({ hp: 1e7 }); tipHit(h, e); h.tick(4.05); tipHit(h, e); return e.slowT > 0; };
    ok(run({ w1: 1 }), 'w1: la segunda punta a los 4 s');
    ok(!run({}), 'sin w1: aún no');
  }
  // w2A Punta Mayor: +40 % de efecto y dura el doble · w5 Fuego Prendido +50 % · w10 Encantamiento Hondo +25 %
  {
    const burn = (nodes, choice = {}) => { const h = hero('h2', nodes, choice), e = h.enemy({ hp: 1e7 }); tipHit(h, e); return burnLeft(h, e); };
    const b = burn({});
    near(burn({ w2: 1 }, { w2: 'A' }) / b, 1.4, 'w2A: quemadura +40 %');
    near(burn({ w5: 1 }) / b, 1.5, 'w5: quemadura +50 %');
    near(burn({ w10: 1 }) / b, 1.25, 'w10: +25 % a las puntas');
    const h = hero('h2', { w2: 1 }, { w2: 'A' }), e = h.enemy({ hp: 1e7 });
    tipHit(h, e); h.tick(6); tipHit(h, e);
    ok(e.slowT > 5, 'w2A: el Hielo dura el doble (6 s)');
  }
  // w2B Punta Repartida: las demás flechas de ese disparo llevan la punta al 30 %
  {
    const run = choice => {
      const h = hero('h2', { w2: 1 }, choice), e1 = h.enemy({ hp: 1e7 }), e2 = h.enemy({ hp: 1e7, pos: [2, 0, 1] });
      tipHit(h, e1, 'flecha_multiple'); tipHit(h, e2, 'flecha_multiple');
      return [burnLeft(h, e1), burnLeft(h, e2)];
    };
    const [m, s] = run({ w2: 'B' });
    near(s / m, 0.3, 'w2B: la segunda flecha, al 30 %');
    eq(run({ w2: 'A' })[1], 0, 'sin w2B: solo la primera');
  }
  // w3 Trampa Encantada: la lluvia toma la punta al colocarla y la lleva a todos los que golpea
  {
    const run = nodes => {
      const h = hero('h2', nodes), e1 = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [6.8, 0, 0.6] });
      cast(h, 'rmb', 'lluvia_flechas', 6.3, 0.3, 2.2);
      return [burnLeft(h, e1) > 0, burnLeft(h, e2) > 0];
    };
    assert.deepEqual(run({ w3: 1 }), [true, true], 'w3: los dos golpeados por la lluvia arden'); checks++;
    eq(run({}).filter(Boolean).length, 1, 'sin w3: solo uno');
  }
  // w4B Punta Curativa: cada punta cura un 2 % (cubeta; cada 6 s)
  {
    const run = nodes => { const h = hero('h2', nodes, { w4: 'B' }), e = h.enemy({ hp: 1e7 }); h.p.hp = h.p.stats.maxHP / 2; const b0 = h.p.hp; tipHit(h, e); return [h.p.hp - b0, h.p]; };
    const [healed, p] = run({ w4: 1 });
    near(healed, p.stats.maxHP * 0.02 * (1 + (p.stats.healPct || 0) / 100), 'w4B: cura un 2 %', 0.05);
    eq(run({})[0], 0, 'sin w4B: no cura');
  }
  // w6 Hielo Hondo: el Hielo inmoviliza 1 s (no a élites)
  {
    const h = hero('h2', { w6: 1 }), e = h.enemy({ hp: 1e7 }), el = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 4] });
    tipHit(h, e); h.tick(6); tipHit(h, e);
    ok(e.rootT > 0.8, 'w6: inmoviliza 1 s');
    tipHit(h, el); h.tick(6); tipHit(h, el);
    h.tick(6); tipHit(h, el);
    h.tick(6); tipHit(h, el);
    ok(el.slowT > 0 && !(el.rootT > 0), 'w6: al élite solo lo frena');
  }
  // w7 Trenza de Puntas: tras Fuego, Hielo y Rayo, la siguiente flecha estalla en 4 m (150 %)
  {
    const run = nodes => {
      const h = hero('h2', nodes), e = h.enemy({ hp: 1e7 }), side = h.enemy({ hp: 1e7, pos: [2, 0, 3] }), ls = spy(side);
      for (let i = 0; i < 3; i++) { tipHit(h, e); h.tick(6.05); }
      const before = by(ls, 'w_puntas').filter(x => !x.proc).length;
      tipHit(h, e);
      return by(ls, 'w_puntas').filter(x => !x.proc).length - before;
    };
    eq(run({ w7: 1 }), 1, 'w7: estalla y alcanza al de al lado');
    eq(run({}), 0, 'sin w7: no estalla');
  }
  // w8A Chispa Saltarina: el Rayo salta a 3 más · w11 Punta Viva: si una punta mata, la siguiente al instante
  {
    const jumps = nodes => {
      const h = hero('h2', nodes, { w8: 'A' }), e = h.enemy({ hp: 1e7 });
      const others = [1, 2, 3, 4, 5, 6, 7].map(i => h.enemy({ hp: 1e7, pos: [2 + i * 0.3, 0, 1] })), logs = others.map(spy);
      for (let i = 0; i < 2; i++) { tipHit(h, e); h.tick(6.05); }
      tipHit(h, e);
      return logs.filter(l => by(l, 'w_puntas').filter(x => !x.dot).length).length;
    };
    eq(jumps({ w8: 1 }), 6, 'w8A: salta a 6');
    eq(jumps({}), 3, 'sin w8A: a 3');
    const quick = nodes => {
      const h = hero('h2', nodes), e = h.enemy({ hp: 1e7 });
      h.enemy({ hp: 1, pos: [2, 0, 1] });
      for (let i = 0; i < 2; i++) { tipHit(h, e); h.tick(6.05); }
      tipHit(h, e);
      const f = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
      tipHit(h, f);
      return burnLeft(h, f) > 0;
    };
    ok(quick({ w11: 1 }), 'w11: el Rayo mata y la siguiente punta (Fuego) llega al instante');
    ok(!quick({}), 'sin w11: espera');
  }
  // w8B Hielo Mordiente: los que llevan Hielo reciben +15 % de tus flechas 4 s
  {
    const h = hero('h2', { w8: 1 }, { w8: 'B' }), b = hero('h2');
    const e = h.enemy({ hp: 1e7 }), f = b.enemy({ hp: 1e7 });
    for (const [x, en] of [[h, e], [b, f]]) { tipHit(x, en); x.tick(6.05); tipHit(x, en); }
    near(roll(h, e) / roll(b, f), addRatio(h.p, 15), 'w8B: +15 % con Hielo');
    h.tick(4.1); b.tick(4.1);
    eq(roll(h, e), roll(b, f), 'w8B: 4 s');
  }
  // w9 Puntas Afines: cada punta del ciclo da 8 de Impulso (Tiradora)
  {
    const run = nodes => { const h = hero('h2', nodes), e = h.enemy({ hp: 1e7 }); const g0 = h.gaugeValue('impulso'); tipHit(h, e); return h.gaugeValue('impulso') - g0; };
    near(run({ w9: 1 }) - run({}), 8, 'w9: +8 de Impulso', 0.01);
  }
  // Desborde de Puntas (activa de KA1, sintética aquí): 4 disparos con las tres puntas al 50 %
  {
    const DESBORDE = { ...TORBELLINO, id: 'a_h_puntas', name: 'Desborde de Puntas' };
    const run = (activa) => {
      const h = hero('h2', {}, {}, { inject: { skills: [DESBORDE] } }), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), log = spy(e);
      tipHit(h, h.enemy({ hp: 1e7, pos: [0, 0, 6] }));                 // gasta la punta del ciclo
      if (activa) cast(h, 'k2', 'a_h_puntas', 0, 0, 0.1);
      shoot(h, e, 1.2);
      return { burn: burnLeft(h, e), slow: e.slowT > 0, bolt: by(log, 'w_puntas').filter(x => x.proc && !x.dot).length };
    };
    const a = run(true), b = run(false);
    ok(a.burn > 0 && a.slow && a.bolt === 1, 'Desborde: Fuego, Hielo y Rayo en el mismo disparo');
    ok(!(b.burn > 0) && !b.slow && b.bolt === 0, 'sin Desborde: ninguna punta (la del ciclo estaba gastada)');
  }
  // w12 Lluvia Encantada: cada 30 s, 6 s en que tus flechas llevan punta al 30 %
  {
    const run = nodes => {
      const h = hero('h2', nodes), e1 = h.enemy({ hp: 1e7 }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 4] });
      h.tick(30.05);
      tipHit(h, e1); tipHit(h, e2);
      return [burnLeft(h, e1), burnLeft(h, e2)];
    };
    const [m, s] = run({ w12: 1 });
    near(s / m, 0.3, 'w12: la segunda flecha arde al 30 %');
    eq(run({})[1], 0, 'sin w12: nada');
  }
});

// ============================================================ Halconera (h3)
const dives = log => by(log, 'y_halcon');
const marked = (h, e) => (powerState(h.p, 'y_halcon').marks?.get(e) || 0) > h.p.simT;
section('héroe Halconera: Halcón Cazador y sus nodos', () => {
  // y0: cada 6 s cae en picado (100 %) y marca 6 s: +10 % de tus flechas
  {
    const h = hero('h3'), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), log = spy(e);
    h.tick(5.9);
    eq(dives(log).length, 0, 'y0: nada a 5,9 s');
    h.tick(0.2);
    eq(dives(log).length, 1, 'y0: picado a los 6 s');
    ok(marked(h, e), 'y0: marcado');
    const other = h.enemy({ hp: 1e7, pos: [0, 0, 20] });
    near(roll(h, e) / roll(h, other), addRatio(h.p, 10), 'y0: +10 % al marcado');
    eq(roll(h, e, 'a_red'), roll(h, other, 'a_red'), 'y0: solo a tus flechas');
    const b = hero('h3', {}, {}, { open: false }), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] }), lf = spy(f);
    b.tick(6.1);
    eq(dives(lf).length, 0, 'sin el Paragon abierto, sin halcón');
    h.p.pos.set(30, 0, 0);                                            // lejos: sin más picados
    h.tick(5.7);
    ok(marked(h, e), 'y0: sigue marcado a los 5,7 s');
    h.tick(0.4);
    ok(!marked(h, e) && dives(log).length === 1, 'y0: la marca dura 6 s');
  }
  // y1 Alas Rápidas: cada 5 s
  { const h = hero('h3', { y1: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), log = spy(e); h.tick(5.05); eq(dives(log).length, 1, 'y1: a los 5 s'); }
  // y2A Picado Hondo: +40 % y Quebranto · y5 Garras Afiladas +25 % · y8B Halcón Peregrino +40 % a élites
  {
    const dive = (nodes, choice = {}, rank = null) => { const h = hero('h3', nodes, choice), e = h.enemy({ hp: 1e7, rank, pos: [5, 0, 0] }), l = spy(e); h.tick(6.05); return [dives(l)[0].n, h.p]; };
    const [b, p] = dive({});
    near(dive({ y2: 1 }, { y2: 'A' })[0] / b, addRatio(p, 40), 'y2A: +40 %');
    near(dive({ y5: 1 })[0] / b, addRatio(p, 25), 'y5: +25 %');
    const [be] = dive({}, {}, 'elite');
    near(dive({ y8: 1 }, { y8: 'B' }, 'elite')[0] / be, addRatio(p, 40), 'y8B: +40 % al élite');
    const h = hero('h3', { y2: 1 }, { y2: 'A' }), boss = h.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
    const s0 = boss.stagger || 0;
    h.tick(6.05);
    const b2 = hero('h3'), boss2 = b2.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
    b2.tick(6.05);
    near((boss.stagger - s0) - (boss2.stagger || 0), 15, 'y2A: +15 de Quebranto al jefe', 0.01);
  }
  // y2B Vuelo Rasante: barre una línea de 8 m y golpea a todos (70 %)
  {
    const h = hero('h3', { y2: 1 }, { y2: 'B' });
    const es = [5, 7, 3].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] })), logs = es.map(spy);
    h.tick(6.05);
    ok(logs.every(l => dives(l).length === 1), 'y2B: los tres de la línea');
  }
  // y3 Presa Señalada (Montaraz): el marcado cuenta como tu Presa
  {
    const h = hero('h3', { y3: 1 }, {}, { spec: 'montaraz' }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    h.tick(6.05);
    ok(e.prey === true, 'y3: el marcado es tu Presa');
    const b = hero('h3', {}, {}, { spec: 'montaraz' }), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] });
    b.tick(6.05);
    ok(!f.prey, 'sin y3: no');
  }
  // y4B Alas Protectoras: al bajar del 40 %, −30 % de daño 4 s
  {
    const h = hero('h3', { y4: 1 }, { y4: 'B' }), p = h.p;
    p.hp = p.stats.maxHP * 0.45;
    p.takeDamage(p.stats.maxHP * 0.3, 1);
    ok(p.buffs.some(b => b.id === 'y_alas' && b.stats.dr === 30), 'y4B: −30 %');
    const b = hero('h3'), q = b.p;
    q.hp = q.stats.maxHP * 0.45;
    q.takeDamage(q.stats.maxHP * 0.3, 1);
    ok(!q.buffs.some(x => x.id === 'y_alas'), 'sin y4B: nada');
  }
  // y6 Grito del Halcón: el picado deja mudo 2 s
  {
    const h = hero('h3', { y6: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    h.tick(6.05);
    ok(e.silenceT > 1.5, 'y6: silencia');
  }
  // y7 Cetrería: tu principal sobre el marcado hace caer al halcón (cada 10 s)
  {
    const run = nodes => {
      const h = hero('h3', nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e);
      h.tick(6.05);
      h.hit(e, { skill: 'flecha_perforante' });
      h.hit(e, { skill: 'flecha_perforante' });
      return dives(l).length;
    };
    eq(run({ y7: 1 }), 2, 'y7: un picado extra (uno cada 10 s)');
    eq(run({}), 1, 'sin y7: solo el periódico');
  }
  // y8A Bandada: dos halcones pequeños sobre otros enemigos (60 %) · y9 Plumas Cortantes: 4 a 5 m (40 %)
  {
    const run = (nodes, choice = {}) => {
      const h = hero('h3', nodes, choice), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
      const others = [1, 2, 3, 4, 5].map(i => h.enemy({ hp: 1e7, pos: [5, 0, i * 0.8] })), logs = others.map(spy);
      h.tick(6.05);
      return logs.filter(l => dives(l).length).length;
    };
    eq(run({ y8: 1 }, { y8: 'A' }), 2, 'y8A: dos más');
    eq(run({ y9: 1 }), 4, 'y9: plumas a 4');
    eq(run({}), 0, 'sin ellos: solo el blanco');
  }
  // y10 Ojo Compartido: marcas de 12 s y varias a la vez
  {
    const run = nodes => {
      const h = hero('h3', nodes), e1 = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [0, 0, 8] });
      h.tick(9);
      h.hit(e2, { skill: 'a_disparo' });                               // tu blanco pasa a ser e2
      h.tick(3.1);
      return [marked(h, e1), marked(h, e2)];
    };
    assert.deepEqual(run({ y10: 1 }), [true, true], 'y10: los dos marcados'); checks++;
    assert.deepEqual(run({}), [false, true], 'sin y10: solo el último'); checks++;
  }
  // y11 Halcón Fiel: si el marcado muere, marca al siguiente y cae en picado gratis
  {
    const run = nodes => {
      const h = hero('h3', nodes), e1 = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), e2 = h.enemy({ hp: 1e7, pos: [7, 0, 0] }), l2 = spy(e2);
      h.tick(6.05);
      e1.takeDamage(2e7, false, { skill: 'a_disparo' });
      return [dives(l2).length, marked(h, e2)];
    };
    assert.deepEqual(run({ y11: 1 }), [1, true], 'y11: picado y marca al siguiente'); checks++;
    assert.deepEqual(run({}), [0, false], 'sin y11: nada'); checks++;
  }
  // Llamada del Halcón (activa de KA1, sintética aquí): 6 s de ataques al 40 % cada 0,5 s
  {
    const LLAMADA = { ...TORBELLINO, id: 'a_h_halcon', name: 'Llamada del Halcón' };
    const h = hero('h3', {}, {}, { inject: { skills: [LLAMADA] } }), boss = h.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] }), l = spy(boss);
    cast(h, 'k2', 'a_h_halcon', 5, 0, 0.3);
    near(boss.outDmgMul(), 0.7, 'Llamada: ciega (−30 %)');
    h.tick(6.1);
    ok(dives(l).length >= 12, `Llamada: ataques cada 0,5 s (${dives(l).length})`);
  }
  // y12 Cielo de Halcones: cada 30 s, 4 s de picados cada segundo sobre enemigos distintos
  {
    const run = nodes => {
      const h = hero('h3', nodes), es = [0, 1, 2, 3].map(i => h.enemy({ hp: 1e7, pos: [4, 0, i * 1.5] })), logs = es.map(spy);
      h.tick(29.95);
      const before = logs.map(l => dives(l).length);
      h.tick(4.1);
      return logs.filter((l, i) => dives(l).length > before[i]).length;
    };
    ok(run({ y12: 1 }) >= 3, 'y12: picados sobre varios enemigos');
    ok(run({}) <= 1, 'sin y12: uno como mucho');
  }
});

// ============================================================ especializaciones (trabajos 2 y 3)
// arquera de nivel 100 de la especialización `spec` con sus nodos (sin Paragon: sin árbol héroe)
function sp(spec, nodes = {}, choice = {}, o = {}) {
  return steady(makeHarness({ classId: 'arquera', level: 100, seed: 11, spec, talents: { specRanks: nodes, choice }, ...o }));
}
const tir = (n, c, o) => sp('tiradora', n, c, o);
const fra = (n, c, o) => sp('francotiradora', n, c, o);
const mon = (n, c, o) => sp('montaraz', n, c, o);
// proyectiles que salen (todos, o los de `skill`) mientras corre `fn`
function shots(h, fn, skill = null) {
  const g = h.g, orig = g.spawnProjectile, list = [];
  g.spawnProjectile = o => { list.push(o); return orig.call(g, o); };
  try { fn(); } finally { g.spawnProjectile = orig; }
  return skill ? list.filter(o => (o.skill || o.hitInfo?.skill) === skill) : list;
}
const rp = (h, id) => resolveSkill(h.p, SK(id));
// corre Carrera del Viento `sec` s (mantenida) y la suelta
function run(h, sec, x = 6, z = 0) {
  ready(h);
  h.setSlot('k1', 'a_v_carrera');
  h.aim(x, z);
  h.press('k1');
  h.step(sec);
  h.release('k1');
  h.step(0.05);
}
const taken = (h, n = 300) => { const p = h.p; p.hp = p.stats.maxHP; p.takeDamage(n, 100); return p.stats.maxHP - p.hp; };

section('Tiradora: Tercera Flecha, Impulso y nodos de números', () => {
  // v0 Tercera Flecha: el 3.er Disparo Rápido lanza 2 flechas más (60 %) en abanico
  {
    const h = tir(), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    const n = [0, 1, 2, 3].map(() => shots(h, () => shoot(h, e)).length);
    assert.deepEqual(n, [1, 1, 3, 1], 'v0: el 3.º sale triple'); checks++;
    const f = mon(), e2 = f.enemy({ hp: 1e7, pos: [6, 0, 0] });
    eq([0, 1, 2].map(() => shots(f, () => shoot(f, e2)).length).join(), '1,1,1', 'otra especialización: sin Tercera Flecha');
  }
  // v8A Triple Abierto: 4 flechas más (5 en total) en 60°
  {
    const h = tir({ v8: 1 }, { v8: 'A' }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    eq([0, 1, 2].map(() => shots(h, () => shoot(h, e)).length).join(), '1,1,5', 'v8A: el 3.º sale con 5 flechas');
  }
  // v4 Puntas Templadas: Flecha Múltiple +20 %/rango y el disparo triple +20 %/rango
  {
    eq(rp(tir({ v4: 2 }), 'flecha_multiple').addPct - rp(tir(), 'flecha_multiple').addPct, 40, 'v4 r2: Flecha Múltiple +40 %');
    const triple = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e); for (let i = 0; i < 3; i++) shoot(h, e); const d = by(l, 'a_disparo'); return [d[2].n / d[0].n, h.p]; };
    const [a, p] = triple({ v4: 2 }), [b] = triple({});
    near(b, 1, 'sin v4: el triple pega igual que uno normal');
    near(a, addRatio(p, 40), 'v4 r2: el triple +40 %');
  }
  // v8B Triple Clavado: el triple es crítico seguro y +20 %
  {
    const h = tir({ v8: 1 }, { v8: 'B' }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e);
    for (let i = 0; i < 3; i++) shoot(h, e);
    const d = by(l, 'a_disparo');
    ok(!d[0].crit && !d[1].crit && d[2].crit, 'v8B: el triple es crítico');
  }
  // números de nodo
  near(rp(tir({ v1: 3 }), 'flecha_multiple').cost, 16, 'v1 r3: Flecha Múltiple 22 → 16 de Energía');
  near(rp(tir({ v3: 3 }), 'a_v_carrera').cd, 7, 'v3 r3: Carrera del Viento 10 → 7 s');
  near(rp(tir({ v7: 2 }), 'a_v_carrera').dur, 6, 'v7 r2: Carrera del Viento 4 → 6 s');
  eq(rp(tir({ v11: 2 }), 'flecha_multiple').proj - rp(tir(), 'flecha_multiple').proj, 2, 'v11 r2: +2 flechas a Flecha Múltiple');
  eq(rp(tir({ v13: 2 }), 'a_v_carrera').addPct - rp(tir(), 'a_v_carrera').addPct, 30, 'v13 r2: Carrera +30 %');
  eq(rp(tir({ v13: 2 }), 'a_u_diluvio').addPct - rp(tir(), 'a_u_diluvio').addPct, 30, 'v13 r2: Diluvio +30 %');
  eq(tir({ v20: 2 }).p.stats.spdPct - tir().p.stats.spdPct, 16, 'v20 r2: +16 % de velocidad');
  eq(rp(tir({ v9: 1 }, { v9: 'B' }), 'a_t_andanada').recast.n, 3, 'v9B: Andanada se relanza dos veces (3 usos)');
  eq(rp(tir(), 'a_t_andanada').recast.n, 2, 'sin v9B: 2 usos');
  // v2 Viento Largo: el Vendaval dura 6 + rango s
  {
    const h = tir({ v2: 3 });
    h.gauge('impulso', 100);
    eq(h.gaugeState('impulso').galeT, 9, 'v2 r3: Vendaval de 9 s');
    const b = tir();
    b.gauge('impulso', 100);
    eq(b.gaugeState('impulso').galeT, 6, 'sin v2: 6 s');
  }
});

// muro de enemigos en x (de z = −3 a 3): recibe las flechas de la Andanada desde cualquier punto
const wall = (h, x = 2) => [-3, -2.4, -1.8, -1.2, -0.6, 0, 0.6, 1.2, 1.8, 2.4, 3].map(z => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
// espía común (en orden de llegada) de varios enemigos
function spyAll(es) {
  const log = [];
  for (const e of es) {
    const td = e.takeDamage.bind(e);
    e.takeDamage = (n, crit = false, opts = {}) => { log.push({ e, n, crit: !!crit, skill: opts.skill || null, echo: !!opts.echo, dot: !!opts.dot }); return td(n, crit, opts); };
  }
  return () => log;
}
// Andanada (k3) y su relanzamiento a los `gap` s: golpes de flecha de cada uso
function volleyChain(h, gaps = [1], aim = [6, 0]) {
  const all = spyAll(wall(h));
  const uses = [];
  ready(h);
  h.setSlot('k3', 'a_t_andanada');
  h.aim(...aim);
  let n0 = 0;
  const g0 = h.gaugeValue('impulso');
  h.cast('k3');
  for (const gap of [...gaps, null]) {
    h.step(gap ?? 1.2);
    const list = by(all(), 'a_t_andanada');
    uses.push(list.slice(n0));
    n0 = list.length;
    if (gap != null) { h.p.mp = h.p.stats.maxMP; h.cast('k3'); }
  }
  return { uses, gain: h.gaugeValue('impulso') - g0 };
}
const top = list => Math.max(...list.map(x => x.n));

section('Tiradora: Andanada (Remate Triple, Último Instante, Ida y Vuelta, Salto Impulsivo, Vendaval Encadenado, Vaivén)', () => {
  // v5 Remate Triple: tras una Andanada, el siguiente Disparo Rápido sale triple (una vez cada 4 s)
  {
    const run = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); cast(h, 'k3', 'a_t_andanada', 6, 0, 0.8); return shots(h, () => shoot(h, e)).length; };
    eq(run({ v5: 1 }), 3, 'v5: el Disparo Rápido tras la Andanada sale triple');
    eq(run({}), 1, 'sin v5: sencillo');
  }
  // v9A Último Instante: relanzar en el último medio segundo de la ventana (2 s): +40 % y 20 de Impulso
  {
    const late = tir({ v9: 1 }, { v9: 'A' }), base = tir();
    const a = volleyChain(late, [1.6]), b = volleyChain(base, [1.6]);
    ok(a.uses[1].length > 0 && b.uses[1].length > 0, 'el relanzamiento alcanza al muro');
    near(top(a.uses[1]) / top(b.uses[1]), addRatio(late.p, 40), 'v9A: relanzar al final +40 %');
    near(a.gain - b.gain, 20, 'v9A: +20 de Impulso', 0.01);
    const early = volleyChain(tir({ v9: 1 }, { v9: 'A' }), [0.8]), early0 = volleyChain(tir(), [0.8]);
    near(top(early.uses[1]) / top(early0.uses[1]), 1, 'v9A: relanzar antes, sin premio');
  }
  // v9B Ida y Vuelta: la tercera Andanada de la cadena sale al 70 %
  {
    const h = tir({ v9: 1 }, { v9: 'B' });
    const { uses } = volleyChain(h, [0.8, 0.8]);
    ok(uses[0].length > 0 && uses[2].length > 0, 'v9B: tres usos que alcanzan');
    near(top(uses[2]) / top(uses[0]), 0.7, 'v9B: la tercera al 70 %');
  }
  // v12 Salto Impulsivo: cada salto de Andanada da 8 de Impulso por rango
  {
    const a = volleyChain(tir({ v12: 2 }), [0.8]), b = volleyChain(tir(), [0.8]);
    near(a.gain - b.gain, 32, 'v12 r2: +16 de Impulso por salto (2 saltos)', 0.01);
  }
  // v19 Vendaval Encadenado: cada relanzamiento durante el Vendaval lo alarga 0,5 s por rango
  {
    const galeAfter = nodes => { const h = tir(nodes); h.gauge('impulso', 100); volleyChain(h, [0.5]); return h.gaugeState('impulso').galeT; };
    near(galeAfter({ v19: 2 }) - galeAfter({}), 1, 'v19 r2: +1 s de Vendaval por relanzamiento', 0.01);
    const h = tir({ v19: 2 });
    volleyChain(h, [0.5]);
    eq(h.gaugeState('impulso').galeT, 0, 'v19: sin Vendaval no alarga nada');
  }
  // v26 Vaivén Eterno: en el Vendaval, al cerrar su ventana Andanada vuelve sin recarga y a mitad de coste (r1: una vez)
  {
    const h = tir({ v26: 1 }), b = tir();
    for (const x of [h, b]) { x.gauge('impulso', 100); cast(x, 'k3', 'a_t_andanada', 6, 0, 2.3); }
    eq(h.p.cds.a_t_andanada || 0, 0, 'v26: al cerrarse la ventana, sin recarga');
    ok((b.p.cds.a_t_andanada || 0) > 4, 'sin v26: en recarga');
    eq(rp(h, 'a_t_andanada').cost, 13, 'v26: la siguiente cuesta la mitad (25 → 13)');
    ready(h);
    h.p.mp = 40;
    h.cast('k3');
    eq(40 - h.p.mp, 13, 'v26: gasta 13');
    h.step(2.3);
    ok((h.p.cds.a_t_andanada || 0) > 4, 'v26 r1: la segunda vez ya no vuelve');
    near(rp(h, 'a_t_andanada').cost, 25, 'v26: el coste vuelve a 25');
  }
});

section('Tiradora: Carrera del Viento (Soltar, Fondo, Rueda, Blanco Fijo, Vacío, Plumas, Nubes, Ciclones, Galerna)', () => {
  // v6 Soltar y Disparar: al soltar la Carrera, una Andanada gratis al 60 % (sin salto ni recarga)
  {
    const go = nodes => { const h = tir(nodes), log = spyAll(wall(h, 3)); run(h, 1); h.step(0.8); return [by(log(), 'a_t_andanada'), h]; };
    const [a, h] = go({ v6: 1 }), [b] = go({});
    ok(a.length > 0, 'v6: la Andanada sale al soltar');
    eq(b.length, 0, 'sin v6: nada');
    ok(!(h.p.cds.a_t_andanada > 0), 'v6: la Andanada gratis no entra en recarga');
    const ref = tir(), rl = spyAll(wall(ref, 3));
    cast(ref, 'k3', 'a_t_andanada', 6, 0, 0.8);
    near(top(a) / top(by(rl(), 'a_t_andanada')), 0.6, 'v6: al 60 %');
  }
  // v7 Fondo de Corredora: mientras corres con la Carrera, inmune a las ralentizaciones
  {
    const slowed = nodes => { const h = tir(nodes); ready(h); h.setSlot('k1', 'a_v_carrera'); h.aim(6, 0); h.press('k1'); h.step(0.5); h.p.applySlow(3); const s = h.p.slowT; h.release('k1'); return s; };
    eq(slowed({ v7: 1 }), 0, 'v7: sin ralentización corriendo');
    ok(slowed({}) > 2, 'sin v7: ralentizada');
  }
  // v10A Rueda de Flechas: cada segundo corriendo, un anillo de 8 flechas
  {
    const n = (nodes, choice) => { const h = tir(nodes, choice); return shots(h, () => run(h, 2.1)).length; };
    near(n({ v10: 1 }, { v10: 'A' }) - n({}), 16, 'v10A: 2 anillos de 8 flechas en 2 s', 0.01);
  }
  // v10B Blanco Fijo: cada disparo seguido de la Carrera al mismo enemigo +10 % (hasta +60 %)
  {
    const go = (nodes, choice) => { const h = tir(nodes, choice), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e); run(h, 3.9); return [by(l, 'a_v_carrera'), h.p]; };
    const [a, p] = go({ v10: 1 }, { v10: 'B' }), [b] = go({});
    ok(a.length >= 8, `la Carrera dispara seguido (${a.length})`);
    near(a[3].n / a[0].n, addRatio(p, 30), 'v10B: el 4.º seguido +30 %');
    near(a[7].n / a[0].n, addRatio(p, 60), 'v10B: tope +60 %');
    near(b[3].n / b[0].n, 1, 'sin v10B: igual');
  }
  // v14 Vacío de Aire: al soltar la Carrera, atraes 2 m a los de 5 m (a los jefes, Quebranto)
  {
    const go = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1e7, pos: [3, 0, 3] }); run(h, 0.6, -6, 0); return Math.hypot(e.pos.x - h.p.pos.x, e.pos.z - h.p.pos.z); };
    near(go({}) - go({ v14: 1 }), 2, 'v14: atrae 2 m', 0.05);
    const h = tir({ v14: 1 }), boss = h.enemy({ hp: 1e7, boss: true, pos: [3, 0, 0] });
    const s0 = boss.stagger || 0;
    run(h, 0.6, -6, 0);
    ok((boss.stagger || 0) > s0, 'v14: al jefe le llena Quebranto');
  }
  // v16 Viento en las Plumas: con 50+ de Impulso, Múltiple y Andanada +10 %/rango y la Carrera dispara más rápido
  {
    const h = tir({ v16: 2 }), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    h.gauge('impulso', 40); h.tick(0.1);
    const low = roll(h, e, 'flecha_multiple'), lowA = roll(h, e, 'a_t_andanada'), every0 = rp(h, 'a_v_carrera').def.autoShot.every;
    h.gauge('impulso', 60); h.tick(0.1);
    near(roll(h, e, 'flecha_multiple') / low, addRatio(h.p, 20), 'v16 r2: Flecha Múltiple +20 % con 50+');
    near(roll(h, e, 'a_t_andanada') / lowA, addRatio(h.p, 20), 'v16 r2: Andanada +20 % con 50+');
    near(roll(h, e, 'a_disparo') / roll(tir({ v16: 2 }), e, 'a_disparo'), 1, 'v16: el Disparo Rápido no cambia');
    near(every0, 0.4, 'v16: con menos de 50, cada 0,4 s');
    near(rp(h, 'a_v_carrera').def.autoShot.every, 0.4 / 1.3, 'v16 r2: la Carrera dispara un 30 % más rápido');
  }
  // v17 Nube de Paso: en los 6 primeros s de la Carrera, cada segundo recarga 0,4 s/rango del Diluvio
  {
    const cd = nodes => { const h = tir(nodes); cast(h, 'k4', 'a_u_diluvio', 0, 0, 0.1); run(h, 3.05); return h.p.cds.a_u_diluvio; };
    near(cd({}) - cd({ v17: 2 }), 2.4, 'v17 r2: 3 s corriendo = −2,4 s de Diluvio', 0.02);
  }
  // v21 Nube Fiel: en los 6 primeros s de la Carrera, el Diluvio descarga más a menudo
  {
    const waves = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1e7, pos: [1, 0, 0] }), l = spy(e); cast(h, 'k4', 'a_u_diluvio', 0, 0, 0.1); run(h, 3.9); return by(l, 'a_u_diluvio').length; };
    const a = waves({ v21: 1 }), b = waves({});
    ok(a >= b + 1, `v21: más oleadas corriendo (${a} > ${b})`);
  }
  // v24 Ciclones: corriendo, cada 2 s (r1) un ciclón que dispara al más cercano
  {
    const go = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e); run(h, 2.2); h.tick(1.5); return [(h.g.fields || []).filter(f => !f.dead && f.data?.skill === 't_ciclones').length, by(l, 't_ciclones').length]; };
    const [f, n] = go({ v24: 1 }), [f0, n0] = go({});
    ok(f === 1 && n >= 2, `v24: un ciclón que dispara (${f}, ${n})`);
    ok(f0 === 0 && n0 === 0, 'sin v24: ninguno');
  }
  // v27 Galerna Infinita: mantenida, la Carrera dura 2 s más (r1) gastando Energía
  {
    const h = tir({ v27: 1 }), b = tir();
    for (const x of [h, b]) { ready(x); x.setSlot('k1', 'a_v_carrera'); x.aim(6, 0); x.press('k1'); x.step(4.5); }
    ok(!!h.g._channel && !b.g._channel, 'v27: a los 4,5 s sigue corriendo');
    const mp = h.p.mp;
    h.step(0.5);
    ok(h.p.mp < mp, 'v27: el tiempo de más gasta Energía');
    h.step(1.3);
    ok(!h.g._channel, 'v27 r1: como mucho 2 s de más');
  }
});

section('Tiradora: Flecha Múltiple, defensa y ápice', () => {
  // v18 Flechas Perdidas: si Flecha Múltiple mata, suelta rango + 1 flechas al 50 % a los cercanos
  {
    const go = nodes => { const h = tir(nodes); h.enemy({ hp: 1, pos: [4, 0, 0] }); const far = h.enemy({ hp: 1e7, pos: [4, 0, 6] }), l = spy(far); cast(h, 'rmb', 'flecha_multiple', 4, 0, 1); return by(l, 't_flechas_perdidas').length; };
    eq(go({ v18: 1 }), 2, 'v18 r1: 2 flechas');
    eq(go({ v18: 2 }), 3, 'v18 r2: 3 flechas');
    eq(go({}), 0, 'sin v18: ninguna');
  }
  // v22 Ráfaga Creciente: cada Múltiple a menos de 3 s de otra, 1 flecha más (hasta rango + 1)
  {
    const seq = nodes => { const h = tir(nodes); return [0, 1, 2, 3].map(() => { h.p.mp = h.p.stats.maxMP; return shots(h, () => cast(h, 'rmb', 'flecha_multiple', 6, 0, 0.5)).length; }).join(); };
    eq(seq({ v22: 1 }), '5,6,7,7', 'v22 r1: hasta 2 flechas más');
    eq(seq({}), '5,5,5,5', 'sin v22: 5');
  }
  // v23 Golpe de Apertura: al empezar el Vendaval, las rango + 1 siguientes Andanadas o Múltiples son críticas
  {
    const h = tir({ v23: 1 }), e = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), l = spy(e);
    h.gauge('impulso', 100);
    const crits = [0, 1, 2].map(() => { const n0 = l.length; h.p.mp = h.p.stats.maxMP; cast(h, 'rmb', 'flecha_multiple', 3, 0, 0.6); const s = l.slice(n0); return s.length > 0 && s.every(x => x.crit); });
    assert.deepEqual(crits, [true, true, false], 'v23 r1: las 2 primeras críticas'); checks++;
  }
  // v25 Tormenta de Plumas: cada 3.ª Múltiple, además un círculo de 3 + 3·rango flechas
  {
    const h = tir({ v25: 1 }), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), l = spy(e);
    const n = [0, 1, 2].map(() => { h.p.mp = h.p.stats.maxMP; return shots(h, () => cast(h, 'rmb', 'flecha_multiple', 4, 0, 0.6), 't_tormenta_plumas').length; });
    assert.deepEqual(n, [0, 0, 6], 'v25 r1: 6 flechas en la 3.ª'); checks++;
    ok(by(l, 't_tormenta_plumas').length >= 1, 'v25: alcanzan al blanco');
  }
  // v15A Piel de Brisa: −20 % de daño recibido durante el Vendaval
  {
    const h = tir({ v15: 1 }, { v15: 'A' }), b = tir();
    eq(taken(h), taken(b), 'v15A: sin Vendaval, igual');
    h.gauge('impulso', 100); b.gauge('impulso', 100);
    near(taken(h) / taken(b), 0.8, 'v15A: −20 % en el Vendaval', 0.03);
  }
  // v15B Retirada Instintiva: un golpe cuerpo a cuerpo te hace saltar 4 m atrás y da 15 de Impulso (cada 8 s)
  {
    const h = tir({ v15: 1 }, { v15: 'B' }), e = h.enemy({ hp: 1e7, pos: [1, 0, 0] });
    h.p.takeDamage(50, 1, { melee: true, source: e });
    h.step(0.4);
    near(h.p.pos.x, -4, 'v15B: salta 4 m lejos del golpe', 0.05);
    eq(h.gaugeValue('impulso'), 15, 'v15B: +15 de Impulso');
    h.p.takeDamage(50, 1, { melee: true, source: e });
    h.step(0.4);
    near(h.p.pos.x, -4, 'v15B: una vez cada 8 s', 0.05);
    const b = tir(), f = b.enemy({ hp: 1e7, pos: [1, 0, 0] });
    b.p.takeDamage(50, 1, { melee: true, source: f });
    b.step(0.4);
    eq(b.p.pos.x, 0, 'sin v15B: no salta');
  }
  // v28 Ojo del Huracán: 1) +20 % de velocidad en el Vendaval · 2) élite muerto, +50 de Impulso ·
  // 3) el Vendaval salta a 80 · 4) cada Vendaval recarga 4 s del Diluvio
  {
    const spd = nodes => { const h = tir(nodes); h.gauge('impulso', 100); h.tick(0.2); return h.p.stats.spdPct; };
    eq(spd({ v28: 1 }) - spd({}), 20, 'v28 r1: +20 % de velocidad en el Vendaval');
    const kill = nodes => { const h = tir(nodes), e = h.enemy({ hp: 1, rank: 'elite', pos: [4, 0, 0] }); shoot(h, e); ok(!e.alive, 'el élite muere'); return h.gaugeValue('impulso'); };
    near(kill({ v28: 2 }) - kill({ v28: 1 }), 50, 'v28 r2: matar a un élite da 50 de Impulso', 0.01);
    const h3 = tir({ v28: 3 }), h2 = tir({ v28: 2 });
    h3.gauge('impulso', 80); h2.gauge('impulso', 80);
    ok(h3.gaugeState('impulso').galeT > 0 && !(h2.gaugeState('impulso').galeT > 0), 'v28 r3: el Vendaval salta a 80');
    const cd = nodes => { const h = tir(nodes); cast(h, 'k4', 'a_u_diluvio', 0, 0, 0.1); const c = h.p.cds.a_u_diluvio; h.gauge('impulso', 100); return c - h.p.cds.a_u_diluvio; };
    near(cd({ v28: 4 }) - cd({ v28: 3 }), 4, 'v28 r4: cada Vendaval recarga 4 s del Diluvio', 0.01);
  }
});

// tensa la ranura `slot` (`id`) `sec` s hacia (x, z), suelta y deja correr `after`
function tense(h, slot, id, sec, x, z, after = 0.8) {
  ready(h);
  h.setSlot(slot, id);
  h.aim(x, z);
  h.press(slot);
  h.step(sec);
  h.release(slot);
  h.step(after);
}
const PERFECT = 1.25, HALF = 0.6;                  // Disparo Apuntado: ventana dorada de 1,15 a 1,35 s
const aimed = (h, e, sec = PERFECT, after = 0.8) => tense(h, 'k3', 'a_t_apuntado', sec, e.pos.x, e.pos.z, after);
const kneel = h => cast(h, 'k2', 'a_f_rodilla', 0, 0, 0.1);
const cdReset = (h, id) => h.g.reduceCooldown(h.p, id, Infinity);
// Punto Débil propio (Tiro Rastreador, Línea de Mira, Marca Saltarina): segundos que le quedan
const weak = (h, e) => Math.max(0, (powerState(h.p, 'arq_debil').m?.get(e) || 0) - h.p.simT);
// marca con Tiro Rastreador (sin la marca del motor, que hace perfecto el primer tensado)
function track(h, e, keepEngine = false) {
  cast(h, 'rmb', 'a_f_rastreador', e.pos.x, e.pos.z, 0.8);
  if (!keepEngine && e.marks) delete e.marks.a_punto_debil;
  return weak(h, e);
}
// poder de prueba: anota el perfil de cada lanzamiento (después de los demás onCast)
definePower('test_arq_cast', { priority: -9, onCast(g, p, c) {
  (p.__casts || (p.__casts = [])).push({ id: c.sk?.id, instant: !!c.instant, addPct: c.prof?.addPct || 0,
    charge: c.prof?.charge ? { ...c.prof.charge, perfect: [...(c.prof.charge.perfect || [])] } : null });
} });
const casts = (h, id) => (h.p.__casts || []).filter(c => c.id === id);
const width = c => c.charge.perfect[1] - c.charge.perfect[0];
const spyF = (spec, n, c) => sp(spec, n, c, { powers: ['test_arq_cast'] });

section('Francotiradora: Cuerda Tensa y nodos de números', () => {
  // f0 Cuerda Tensa: Disparo Rápido se tensa hasta 1 s (+60 %); su último 0,2 s es perfecto (crítico)
  {
    const h = fra(), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e);
    tense(h, 'lmb', 'a_disparo', 0.05, 6, 0, 0.5);
    tense(h, 'lmb', 'a_disparo', 0.5, 6, 0, 0.5);
    tense(h, 'lmb', 'a_disparo', 0.9, 6, 0, 0.5);
    const d = by(l, 'a_disparo');
    eq(d.length, 3, 'f0: tres disparos');
    near(d[1].n / d[0].n, (1 + 0.6 * 0.5) / (1 + 0.6 * 0.05), 'f0: tensado 0,5 s, +30 %', 0.04);
    ok(!d[0].crit && !d[1].crit && d[2].crit, 'f0: el último 0,2 s es perfecto (crítico)');
    const t = tir(), f = t.enemy({ hp: 1e7, pos: [6, 0, 0] }), lt = spy(f);
    tense(t, 'lmb', 'a_disparo', 0.9, 6, 0, 0.5);
    ok(by(lt, 'a_disparo').every(x => !x.crit), 'sin f0 (Tiradora): mantener no tensa');
  }
  const ap = h => rp(h, 'a_t_apuntado'), ce = h => rp(h, 'a_u_celeste'), base = fra();
  eq(ap(fra({ f1: 3 })).addPct - ap(base).addPct, 30, 'f1 r3: Disparo Apuntado +30 %');
  near(ap(fra({ f1: 3 })).range, 22, 'f1 r3: alcance 16 → 22 m');
  eq(ap(fra({ f2: 3 })).charge.perfectPct - ap(base).charge.perfectPct, 15, 'f2 r3: el perfecto +15 % más (Apuntado)');
  eq(ce(fra({ f2: 3 })).charge.perfectPct - ce(base).charge.perfectPct, 15, 'f2 r3: y los haces');
  ok(ap(fra({ f3: 3 })).charge.speed > ap(base).charge.speed * 1.2 && ce(fra({ f3: 3 })).charge.speed > ce(base).charge.speed * 1.2, 'f3 r3: se tensan un 24 % más rápido');
  near(rp(fra({ f7: 2 }), 'a_f_rodilla').dur, 12, 'f7 r2: Rodilla en Tierra 8 → 12 s');
  near(ap(fra({ f20: 2 })).range, 20, 'f20 r2: Disparo Apuntado 16 → 20 m');
  near(ce(fra({ f20: 2 })).range, 20, 'f20 r2: Tiro Celestial 16 → 20 m');
  // f20 Vista Larga: los tensados a más de 10 m +6 %/rango
  {
    const h = fra({ f20: 2 }), near8 = h.enemy({ hp: 1e7, pos: [8, 0, 0] }), far12 = h.enemy({ hp: 1e7, pos: [12, 0, 0] });
    near(roll(h, far12, 'a_t_apuntado') / roll(h, near8, 'a_t_apuntado'), addRatio(h.p, 12), 'f20 r2: +12 % a más de 10 m');
    near(roll(h, far12, 'a_disparo') / roll(h, near8, 'a_disparo'), 1, 'f20: un básico sin tensar no cuenta');
  }
  // f15A Quietud: quieta más de 1 s, −15 % de daño recibido
  {
    const h = fra({ f15: 1 }, { f15: 'A' }), b = fra();
    h.stand(1.2); b.stand(1.2);
    near(taken(h) / taken(b), 0.85, 'f15A: −15 % quieta', 0.03);
  }
});

section('Francotiradora: Disparo Apuntado (Perforación y Punto Débil)', () => {
  // f4 Sobrepenetración: +10 %/rango por cada enemigo ya atravesado (hasta 4)
  {
    const h = fra({ f4: 2 }), es = [4, 6, 8].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] })), ls = es.map(spy);
    aimed(h, es[2], HALF);
    const n = ls.map(l => by(l, 'a_t_apuntado')[0].n);
    near(n[1] / n[0], addRatio(h.p, 20), 'f4 r2: el 2.º +20 %');
    near(n[2] / n[0], addRatio(h.p, 40), 'f4 r2: el 3.º +40 %');
  }
  // f5 Línea de Mira: un perfecto que atraviesa deja Punto Débil 4 s a todos los que toca
  {
    const h = fra({ f5: 1 }), es = [4, 6].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] }));
    aimed(h, es[1], PERFECT);
    ok(es.every(e => weak(h, e) > 3 && weak(h, e) <= 4), 'f5: perfecto → Punto Débil de 4 s a los dos');
    const m = fra({ f5: 1 }), fs = [4, 6].map(x => m.enemy({ hp: 1e7, pos: [x, 0, 0] }));
    aimed(m, fs[1], HALF);
    ok(fs.every(e => weak(m, e) === 0), 'f5: sin perfecto, nada');
  }
  // f8A Estela Explosiva: tras un perfecto, la línea estalla a los 0,5 s (30 %)
  {
    const go = sec => { const h = fra({ f8: 1 }, { f8: 'A' }), es = [4, 7].map(x => h.enemy({ hp: 1e7, pos: [x, 0, 0] })), ls = es.map(spy); aimed(h, es[1], sec, 1); return ls.map(l => by(l, 'f_estela').length); };
    assert.deepEqual(go(PERFECT), [1, 1], 'f8A: la estela alcanza a los dos'); checks++;
    assert.deepEqual(go(HALF), [0, 0], 'f8A: sin perfecto, nada'); checks++;
  }
  // f8B Doble Impacto: si no atraviesa a nadie más, golpea otra vez al blanco al 30 %
  {
    const h = fra({ f8: 1 }, { f8: 'B' }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e);
    aimed(h, e, HALF);
    const d = by(l, 'a_t_apuntado');
    ok(d.length === 2 && d[1].echo, 'f8B: segundo golpe');
    near(d[1].n / d[0].n, 0.3, 'f8B: al 30 %', 0.03);
    const m = fra({ f8: 1 }, { f8: 'B' }), es = [4, 6].map(x => m.enemy({ hp: 1e7, pos: [x, 0, 0] })), ls = es.map(spy);
    aimed(m, es[1], HALF);
    ok(ls.every(lg => by(lg, 'a_t_apuntado').length === 1), 'f8B: si atraviesa, no repite');
  }
  // f9A Marca Saltarina: si el marcado muere, el Punto Débil salta al más cercano con su tiempo
  {
    const go = (nodes, choice) => {
      const h = fra(nodes, choice), a = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), b = h.enemy({ hp: 1e7, pos: [5, 0, 4] });
      const left = track(h, a);
      a.takeDamage(1e9, false, { skill: 'a_disparo' });
      return [left, weak(h, b), a.alive];
    };
    const [left, jumped, alive] = go({ f9: 1 }, { f9: 'A' });
    ok(!alive && left > 6, 'el marcado muere');
    near(jumped, left, 'f9A: salta con el tiempo que le quedaba', 0.05);
    eq(go({})[1], 0, 'sin f9A: no salta');
  }
  // f9B Punto Vital: contra tu Punto Débil, el perfecto +35 % y 15 de Quebranto al jefe
  {
    const go = (nodes, choice) => {
      const h = spyF('francotiradora', nodes, choice), boss = h.enemy({ hp: 1e7, boss: true, pos: [6, 0, 0] });
      track(h, boss);
      const s0 = boss.stagger || 0;
      aimed(h, boss, PERFECT);
      return [casts(h, 'a_t_apuntado')[0].charge.perfectPct, (boss.stagger || 0) - s0];
    };
    const [pct, st] = go({ f9: 1 }, { f9: 'B' }), [pct0, st0] = go({});
    eq(pct - pct0, 35, 'f9B: el perfecto +35 %');
    near(st - st0, 15, 'f9B: +15 de Quebranto', 0.01);
  }
  // f12 Lectura del Blanco: contra tu Punto Débil, la ventana dorada un 25 %/rango más ancha
  {
    const go = (nodes, mark) => { const h = spyF('francotiradora', nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); if (mark) track(h, e); aimed(h, e, HALF); return width(casts(h, 'a_t_apuntado')[0]); };
    near(go({ f12: 2 }, true) / go({}, true), 1.5, 'f12 r2: ventana ×1,5 contra el Punto Débil');
    near(go({ f12: 2 }, false) / go({}, false), 1, 'f12: sin Punto Débil, igual');
  }
  // f19 Herida Expuesta: con tu Punto Débil, el enemigo recibe +6 %/rango de todo el grupo
  {
    const h = fra({ f19: 2 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    track(h, e);
    h.tick(0.2);
    eq(e.debuffs?.f_herida_expuesta?.pct, 12, 'f19 r2: Debilidad del 12 %');
    h.tick(8.5);
    ok(!(e.debuffs?.f_herida_expuesta?.t > 0), 'f19: se va con el Punto Débil');
  }
  // f23 Herida sobre Herida: cada perfecto a tu Punto Débil deja una Herida: tus tensados +2 %/rango por cada una
  {
    const h = fra({ f23: 3 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    track(h, e);
    const before = roll(h, e, 'a_t_apuntado');
    aimed(h, e, PERFECT);
    near(roll(h, e, 'a_t_apuntado') / before, addRatio(h.p, 6), 'f23 r3: una Herida, +6 %');
    near(roll(h, e, 'a_disparo') / roll(fra(), e, 'a_disparo'), 1, 'f23: el básico sin tensar no suma');
  }
  // f26 Disparo Imposible: un perfecto a tu Punto Débil sale dos veces (2.ª crítica al 5 + 10·rango %)
  {
    const go = r => { const h = fra({ f26: r }), e = h.enemy({ hp: 1e7, boss: true, pos: [6, 0, 0] }), l = spy(e); track(h, e); const s0 = e.stagger || 0; aimed(h, e, PERFECT); return [by(l, 'a_t_apuntado'), (e.stagger || 0) - s0]; };
    const [d1, s1] = go(1), [d3] = go(3);
    ok(d1.length === 2 && d1[1].echo && d1[1].crit, 'f26: segundo disparo crítico');
    near(d3[1].n / d1[1].n, 35 / 15, 'f26: 15 % (r1) → 35 % (r3)', 0.03);
    ok(s1 >= 20, 'f26: 20 de Quebranto');
    const h = fra({ f26: 1 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e);
    aimed(h, e, PERFECT);
    eq(by(l, 'a_t_apuntado').length, 1, 'f26: sin Punto Débil, una vez');
  }
  // f11 Fila Rota: cada enemigo que mata Disparo Apuntado devuelve 4 de Energía y 5 de Concentración por rango
  {
    const go = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1, pos: [6, 0, 0] }); h.p.mp = 40; aimed(h, e, HALF); return [h.p.mp, h.gaugeValue('concentracion'), e.alive]; };
    const [mp, foc, alive] = go({ f11: 2 }), [mp0, foc0] = go({});
    ok(!alive, 'Disparo Apuntado mata');
    near(mp - mp0, 8, 'f11 r2: +8 de Energía', 0.01);
    near(foc - foc0, 10, 'f11 r2: +10 de Concentración', 0.01);
  }
  // f18 Rebote Certero: rebota en el primer muro y vuelve por su línea (10 %/rango del disparo)
  {
    const go = (nodes, walled) => {
      const h = fra(nodes);
      if (walled) h.g.world.grid.walkable = x => x < 10;
      const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e);
      aimed(h, e, HALF, 1.5);
      return [by(l, 'f_rebote'), by(l, 'a_t_apuntado')];
    };
    const [r, a] = go({ f18: 2 }, true);
    eq(r.length, 1, 'f18: la flecha vuelve y lo alcanza');
    near(r[0].n / a[0].n, 0.2, 'f18 r2: al 20 % del disparo', 0.03);
    eq(go({ f18: 2 }, false)[0].length, 0, 'f18: sin muro, no rebota');
    eq(go({}, true)[0].length, 0, 'sin f18: no rebota');
  }
  // f22 Saetas Paralelas: cada perfecto suelta rango saetas en paralelo (20 %)
  {
    const n = (nodes, sec) => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); return shots(h, () => aimed(h, e, sec), 'f_paralelas').length; };
    eq(n({ f22: 2 }, PERFECT), 2, 'f22 r2: 2 saetas paralelas');
    eq(n({ f22: 2 }, HALF), 0, 'f22: sin perfecto, ninguna');
  }
  // f25 Línea Mortal: a carga completa, 30 m de alcance y la línea estalla (5 + 5·rango %)
  {
    const go = (nodes, sec) => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [25, 0, 0] }), l = spy(e); aimed(h, e, sec, 1.5); return [by(l, 'a_t_apuntado').length, by(l, 'f_linea_mortal').length]; };
    assert.deepEqual(go({ f25: 1 }, 1.6), [1, 1], 'f25: a carga completa llega a 25 m y estalla'); checks++;
    assert.deepEqual(go({ f25: 1 }, PERFECT), [0, 0], 'f25: sin carga completa, 16 m'); checks++;
    assert.deepEqual(go({}, 1.6), [0, 0], 'sin f25: 16 m'); checks++;
  }
});

const celeste = (h, e, sec = 0.65, after = 0.6) => tense(h, 'k4', 'a_u_celeste', sec, e.pos.x, e.pos.z, after);
const shieldOf = p => (p.shields || []).reduce((s, x) => s + (x.amt ?? x.n ?? x.hp ?? 0), 0);

section('Francotiradora: Vigía (Rodilla en Tierra), Tiro Celestial y ápice', () => {
  // f6 Pulso Quieto: de rodillas, la ventana dorada de los tensados un 50 % más ancha
  {
    const w = nodes => { const h = fra(nodes); const up = width({ charge: rp(h, 'a_t_apuntado').charge }); kneel(h); h.tick(0.1); return [width({ charge: rp(h, 'a_t_apuntado').charge }), up]; };
    const [k, up] = w({ f6: 1 }), [k0, up0] = w({});
    near(k / k0, 1.5, 'f6: de rodillas, ventana ×1,5');
    near(up / up0, 1, 'f6: de pie, igual');
  }
  // f10A Salva de Vigía: de rodillas, cada soltado a carga completa dispara 2 saetas más (25 %)
  {
    const go = (k, choice = { f10: 'A' }) => {
      const h = fra({ f10: 1 }, choice), es = [h.enemy({ hp: 1e7, pos: [6, 0, 0] }), h.enemy({ hp: 1e7, pos: [4, 0, 4] })], ls = es.map(spy);
      if (k) kneel(h);
      aimed(h, es[0], 1.6);
      return ls.reduce((s, l) => s + by(l, 'f_salva').length, 0);
    };
    eq(go(true), 2, 'f10A: dos saetas de rodillas');
    eq(go(false), 0, 'f10A: de pie, ninguna');
    eq(go(true, { f10: 'B' }), 0, 'f10B no las da');
  }
  // f10B Paciencia de Vigía: de rodillas, cada Disparo Apuntado seguido al mismo enemigo +15 % (hasta +45 %)
  {
    const go = nodes => {
      const h = spyF('francotiradora', { f7: 2, ...nodes }, { f10: 'B' }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
      kneel(h);
      for (let i = 0; i < 4; i++) { cdReset(h, 'a_t_apuntado'); h.p.mp = h.p.stats.maxMP; aimed(h, e, HALF, 0.6); }
      return casts(h, 'a_t_apuntado').map(c => c.addPct);
    };
    const a = go({ f10: 1 }), b = go({});
    assert.deepEqual(a.map((x, i) => x - b[i]), [15, 30, 45, 45], 'f10B: +15 % por disparo seguido, hasta +45 %'); checks++;
  }
  // f13 Puntería de Vigía: de rodillas, los tensados +15 %/rango
  {
    const h = fra({ f13: 2 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    const up = roll(h, e, 'a_t_apuntado');
    kneel(h);
    near(roll(h, e, 'a_t_apuntado') / up, addRatio(h.p, 30), 'f13 r2: de rodillas +30 %');
    near(roll(h, e, 'a_disparo') / roll(fra(), e, 'a_disparo'), 1, 'f13: el básico sin tensar no');
  }
  // f14 Estrella Fija: en la Calma Absoluta, cada perfecto de Disparo Apuntado recarga 1,5 s de Tiro Celestial
  {
    const go = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); celeste(h, e); h.gauge('concentracion', 100); const c = h.p.cds.a_u_celeste; aimed(h, e, 0.9); return c - h.p.cds.a_u_celeste; };
    near(go({ f14: 1 }) - go({}), 1.5, 'f14: −1,5 s de Tiro Celestial', 0.01);
    const h = fra({ f14: 1 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), b = fra(), f = b.enemy({ hp: 1e7, pos: [6, 0, 0] });
    celeste(h, e); celeste(b, f);
    const c = h.p.cds.a_u_celeste, c0 = b.p.cds.a_u_celeste;
    aimed(h, e, PERFECT); aimed(b, f, PERFECT);
    near((c - h.p.cds.a_u_celeste) - (c0 - b.p.cds.a_u_celeste), 0, 'f14: fuera de la Calma, nada', 0.01);
  }
  // f15B Nervios de Acero: un golpe mientras tensas da un escudo (8 %, por la cubeta de autocuración)
  {
    const go = charging => { const h = fra({ f15: 1 }, { f15: 'B' }); ready(h); h.setSlot('k3', 'a_t_apuntado'); h.aim(6, 0); if (charging) { h.press('k3'); h.step(0.3); } h.p.takeDamage(50, 100); return [shieldOf(h.p), h.p.stats.maxHP]; };
    const [s, max] = go(true);
    ok(s > 0 && s <= max * 0.08 + 1e-6, `f15B: escudo al tensar (${s.toFixed(1)})`);
    eq(go(false)[0], 0, 'f15B: sin tensar, nada');
  }
  // f16 Serenidad: con 50+ de Concentración, Apuntado y los haces se tensan un 10 %/rango más rápido y +10 %/rango
  {
    const h = fra({ f16: 2 }), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
    h.gauge('concentracion', 40); h.tick(0.1);
    const low = roll(h, e, 'a_t_apuntado'), sp0 = rp(h, 'a_t_apuntado').charge.speed, sc0 = rp(h, 'a_u_celeste').charge.speed;
    h.gauge('concentracion', 60); h.tick(0.1);
    near(roll(h, e, 'a_t_apuntado') / low, addRatio(h.p, 20), 'f16 r2: +20 % con 50+');
    near(rp(h, 'a_t_apuntado').charge.speed / sp0, 1.2, 'f16 r2: Apuntado se tensa un 20 % más rápido');
    near(rp(h, 'a_u_celeste').charge.speed / sc0, 1.2, 'f16 r2: y los haces');
  }
  // f17 Haces Gemelos: cada haz de Tiro Celestial dispara otro detrás al 35 %/rango
  {
    const go = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e); celeste(h, e, 0.4, 1); return by(l, 'a_u_celeste'); };
    const d = go({ f17: 2 });
    ok(d.length === 2 && d[1].echo, 'f17: el haz gemelo');
    near(d[1].n / d[0].n, 0.7, 'f17 r2: al 70 %', 0.03);
    eq(go({}).length, 1, 'sin f17: un haz');
  }
  // f21 Firmamento: de rodillas, Tiro Celestial se recarga un 20 % más rápido
  {
    const go = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); celeste(h, e); kneel(h); const c = h.p.cds.a_u_celeste; h.tick(2); return c - h.p.cds.a_u_celeste; };
    near(go({ f21: 1 }) - go({}), 0.4, 'f21: 2 s de rodillas = 0,4 s más de recarga', 0.03);
  }
  // f24 Ojo Entrenado: cada 7 − rango s de rodillas, el siguiente Disparo Apuntado sale al instante a carga completa
  {
    const go = (nodes, wait) => { const h = spyF('francotiradora', nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e); kneel(h); h.tick(wait); aimed(h, e, 0.05, 0.7); return [!!casts(h, 'a_t_apuntado')[0]?.instant, by(l, 'a_t_apuntado')[0]?.n || 0]; };
    const [inst, n] = go({ f24: 2 }, 5.1), [inst0, n0] = go({ f24: 2 }, 4.5);
    ok(inst && !inst0, 'f24 r2: a los 5 s de rodillas sale al instante; antes, no');
    near(n / n0, 2.5 / 0.8, 'f24: a carga completa (250 % frente al 80 % de soltar enseguida)', 0.03);
  }
  // f27 Atalaya Eterna: Rodilla en Tierra dura 20 s (r1) y cada 5 s de rodillas cae un haz celeste (200 %)
  {
    near(rp(fra({ f27: 1 }), 'a_f_rodilla').dur, 20, 'f27 r1: Rodilla 20 s');
    near(rp(fra({ f27: 2 }), 'a_f_rodilla').dur, 30, 'f27 r2: 30 s');
    eq(rp(fra({ f27: 3 }), 'a_f_rodilla').dur, Infinity, 'f27 r3: hasta que te levantes');
    const go = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }), l = spy(e); kneel(h); h.tick(5.1); return by(l, 'a_u_celeste').length; };
    eq(go({ f27: 1 }), 1, 'f27: un haz a los 5 s');
    eq(go({}), 0, 'sin f27: nada');
  }
  // f28 Ojo Inmóvil: 1) Calma de 8 s · 2) élite muerto, +50 de Concentración · 3) Calma a 80 · 4) cada Calma recarga 5 s de Tiro Celestial
  {
    const calm = nodes => { const h = fra(nodes); h.gauge('concentracion', 100); return h.gaugeState('concentracion').calmT; };
    eq(calm({ f28: 1 }), 8, 'f28 r1: Calma de 8 s');
    eq(calm({}), 5, 'sin f28: 5 s');
    const kill = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e5, rank: 'elite', pos: [6, 0, 0] }); e.takeDamage(1e9, false, { skill: 'a_disparo' }); ok(!e.alive, 'el élite muere'); return h.gaugeValue('concentracion'); };
    near(kill({ f28: 2 }) - kill({ f28: 1 }), 50, 'f28 r2: +50 al matar a un élite', 0.01);
    const h3 = fra({ f28: 3 }), h2 = fra({ f28: 2 });
    h3.gauge('concentracion', 80); h2.gauge('concentracion', 80);
    ok(h3.gaugeState('concentracion').calmT > 0 && !(h2.gaugeState('concentracion').calmT > 0), 'f28 r3: la Calma salta a 80');
    const cd = nodes => { const h = fra(nodes), e = h.enemy({ hp: 1e7, pos: [6, 0, 0] }); celeste(h, e); const c = h.p.cds.a_u_celeste; h.gauge('concentracion', 100); return c - h.p.cds.a_u_celeste; };
    near(cd({ f28: 4 }) - cd({ f28: 3 }), 5, 'f28 r4: cada Calma recarga 5 s de Tiro Celestial', 0.01);
  }
});

const traps = (h, skill = null) => (h.g.fields || []).filter(f => !f.dead && !f.sprung && f.kind === 'trampa' && (!skill || f.data?.skill === skill));
const zarzales = h => (h.g.fields || []).filter(f => !f.dead && f.kind === 'm_zarzal');
const cerco = h => (h.g.fields || []).find(f => !f.dead && f.kind === 'zona' && f.data?.skill === 'a_u_zarzas') || null;
// coloca un cepo en (x, z) (con carga: la repone si hace falta) y deja que se arme
function trap(h, x, z, sec = 0.7) {
  if (!(h.p.skCharges?.a_t_cepo?.n > 0) && h.p.skCharges?.a_t_cepo) cdReset(h, 'a_t_cepo');
  h.p.mp = h.p.stats.maxMP;
  return cast(h, 'k3', 'a_t_cepo', x, z, sec);
}
// Flecha Detonante al enemigo (estalla en 3 m y hace estallar tus trampas)
const det = (h, e, sec = 0.8) => { h.p.mp = h.p.stats.maxMP; return cast(h, 'rmb', 'a_m_detonante', e.pos.x, e.pos.z, sec); };
// golpe de trampa tirado por la vía real (③): sin Debilidad
const trapRoll = (h, e) => h.p.rollDamage(1, 0, 0, e, { skill: 'a_t_cepo', tags: new Set(['trap', 'nature']), elem: 'nature' }).dmg;
const makePrey = (h, e) => { h.hit(e, { skill: 'a_disparo', tags: ['proj'] }); return e.prey; };

section('Montaraz: Cebo de Caza y nodos de números', () => {
  // m0 Cebo de Caza: todas tus trampas armadas atraen, también las que no traen cebo
  {
    const h = mon();
    const f = h.g.spawnField('trampa', { pos: new THREE.Vector3(4, 0, 0), radius: 1.5, dur: 20, owner: h.p, data: { dmg: 1, skill: 'test_trampa' } });
    ok(!f.data.lure, 'una trampa sin cebo');
    h.tick(0.2);
    ok(f.data.lure?.radius === 6 && f.data.lure.eliteRadius === 3 && f.data.lure.boss === false, 'm0: ya atrae (6 m; élites 3 m; jefes no)');
    const t = tir(), f2 = t.g.spawnField('trampa', { pos: new THREE.Vector3(4, 0, 0), radius: 1.5, dur: 20, owner: t.p, data: { dmg: 1 } });
    t.tick(0.2);
    ok(!f2.data.lure, 'sin m0 (Tiradora): no');
  }
  const base = mon();
  near(rp(mon({ m1: 3 }), 'a_t_cepo').cd, 5, 'm1 r3: Trampa de Cepo 8 → 5 s');
  near(rp(mon({ m3: 3 }), 'a_u_zarzas').cd, 36, 'm3 r3: Cerco de Zarzas 45 → 36 s');
  near(rp(mon({ m7: 2 }), 'a_u_zarzas').root, 2.5, 'm7 r2: el Cerco inmoviliza 2,5 s');
  eq(rp(mon({ m4: 2 }), 'a_t_cepo').addPct - rp(base, 'a_t_cepo').addPct, 30, 'm4 r2: Trampa de Cepo +30 %');
  eq(rp(mon({ m4: 2 }), 'a_m_detonante').addPct - rp(base, 'a_m_detonante').addPct, 30, 'm4 r2: Flecha Detonante +30 %');
  // m4 Pólvora Negra: los golpes de trampa +15 %/rango
  {
    const h = mon({ m4: 2 }), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    near(trapRoll(h, e) / trapRoll(base, e), addRatio(h.p, 30), 'm4 r2: golpes de trampa +30 %');
    near(roll(h, e) / roll(base, e), 1, 'm4: las flechas, igual');
  }
  // m2 Marca de Presa: +4 %/rango a tu Presa
  {
    const h = mon({ m2: 3 }), b = mon();
    const e = h.enemy({ hp: 1e7, rank: 'elite', pos: [4, 0, 0] }), f = b.enemy({ hp: 1e7, rank: 'elite', pos: [4, 0, 0] });
    const r0 = roll(h, e) / roll(b, f);
    ok(makePrey(h, e) && makePrey(b, f), 'el élite golpeado es la Presa');
    near((roll(h, e) / roll(b, f)) / r0, addRatio(h.p, 12), 'm2 r3: +12 % a la Presa');
  }
  // m20 Ojo de Trampera: tus trampas y zarzales duran un 25 %/rango más
  {
    const dur = nodes => { const h = mon(nodes); trap(h, 4, 0, 0.1); return traps(h)[0].dur; };
    near(dur({ m20: 2 }) / dur({}), 1.5, 'm20 r2: los cepos duran un 50 % más');
    const z = nodes => { const h = mon({ m14: 1, ...nodes }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); det(h, e); return zarzales(h)[0]?.dur; };
    near(z({ m20: 2 }), 6, 'm20 r2: el zarzal de 4 s dura 6 s');
  }
  // m13 Espino Venenoso: el veneno del Cerco +15 %/rango
  {
    const go = nodes => { const h = mon(nodes), e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), l = spy(e); cast(h, 'k4', 'a_u_zarzas', 4, 0, 0.1); h.tick(2); return [by(l, 'm_cebo'), by(l, 'a_u_zarzas').filter(x => x.dot)]; };
    const [extra, dots] = go({ m13: 2 }), [extra0] = go({});
    ok(dots.length >= 3 && extra.length === dots.length, `m13: cada tic del Cerco suma veneno (${extra.length}/${dots.length})`);
    near(extra[0].n / dots[0].n, 0.3, 'm13 r2: +30 % del tic', 0.05);
    eq(extra0.length, 0, 'sin m13: nada');
  }
});

section('Montaraz: Campo Minado (cepos, detonaciones, Batida)', () => {
  // m8A Racimo de Cepos: 3 cepos en triángulo (35 % cada uno); el Coto los cuenta como uno
  {
    const h = mon({ m8: 1 }, { m8: 'A' });
    trap(h, 5, 0);
    const all = traps(h), main = all.find(f => f.data.skill === 'a_t_cepo');
    eq(all.length, 3, 'm8A: 3 cepos');
    ok(all.every(f => f.data.cluster === main.uid && f.data.lure), 'm8A: un racimo (y todos con cebo)');
    eq(h.gaugeValue('coto'), 1, 'm8A: el Coto cuenta 1');
    const b = mon();
    trap(b, 5, 0);
    near(main.data.dmg / traps(b)[0].data.dmg, 0.35, 'm8A: 35 % cada uno');
    ok(all.filter(f => f !== main).every(f => Math.hypot(f.pos.x - main.pos.x, f.pos.z - main.pos.z) > 1), 'm8A: en triángulo');
  }
  // m8B Cepo Reforzado: si atrapa a un élite, el cepo estalla 3 veces (20 %)
  {
    const go = rank => { const h = mon({ m8: 1 }, { m8: 'B' }), e = h.enemy({ hp: 1e7, rank, pos: [5, 0, 0] }), l = spy(e); trap(h, 5, 0, 1.5); return by(l, 'm_cepo_reforzado').length; };
    eq(go('elite'), 3, 'm8B: 3 estallidos al élite');
    eq(go(null), 0, 'm8B: a un común, nada');
  }
  // m11 Metralla: cada cepo que estalla suelta 2 púas/rango (20 %) a los cercanos
  {
    const go = nodes => {
      const h = mon(nodes), a = h.enemy({ hp: 1e7, pos: [5, 0, 2.4] }), b = h.enemy({ hp: 1e7, pos: [5, 0, 6] }), log = spyAll([a, b]);
      trap(h, 5, 0);
      det(h, a);
      return by(log(), 'm_metralla').length;
    };
    eq(go({ m11: 1 }), 2, 'm11 r1: 2 púas');
    eq(go({ m11: 2 }), 4, 'm11 r2: 4 púas');
    eq(go({}), 0, 'sin m11: ninguna');
  }
  // m18 Rearme Rápido: cada detonación que hace estallar un cepo tuyo recarga rango s del Cepo y del Salto
  {
    const go = nodes => {
      const h = mon(nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 2.4] });
      trap(h, 5, 0); trap(h, -6, 0);
      cast(h, 'k1', 'a_m_acecho', -6, 0, 0.8);
      cast(h, 'k1', 'a_m_acecho', 0, 0, 0.1);
      const before = [h.p.cds.a_t_cepo, h.p.cds.a_m_acecho];
      det(h, e);
      return [h.p.cds.a_t_cepo, h.p.cds.a_m_acecho, before];
    };
    const [c, a] = go({ m18: 2 }), [c0, a0] = go({});
    near(c0 - c, 2, 'm18 r2: −2 s a Trampa de Cepo', 0.02);
    near(a0 - a, 2, 'm18 r2: −2 s a Salto de Acecho', 0.02);
  }
  // m22 Campo Sembrado: Flecha Detonante deja rango cepos armados donde cae (35 %)
  {
    // sin blanco: donde acaba el vuelo (12 m)
    const h = mon({ m22: 2 });
    det(h, { pos: { x: 8, z: 0 } }, 0.9);
    const s = traps(h, 'm_campo_sembrado');
    eq(s.length, 2, 'm22 r2: 2 cepos');
    ok(s.every(f => Math.abs(Math.hypot(f.pos.x - 12, f.pos.z) - 1.1) < 0.05), 'm22: al final del vuelo');
    ok(s.every(f => (f.age || 0) >= (f.armAt || 0) && f.data.lure), 'm22: armados y con cebo');
    // con blanco: donde estalla, y atrapan al momento
    const w = mon({ m22: 2 }), e = w.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e);
    det(w, e);
    eq(by(l, 'm_campo_sembrado').length, 2, 'm22: los dos atrapan al que está encima');
    const b = mon();
    trap(b, 5, 0);
    near(s[0].data.dmg / traps(b)[0].data.dmg, 0.35, 'm22: al 35 %');
    eq(traps(mon({}), 'm_campo_sembrado').length, 0, 'sin m22: ninguno');
  }
  // m24 Siembra de Espinas: cada cepo que atrapa o estalla deja un zarzal 2 + 2·rango s
  {
    const h = mon({ m24: 2 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    trap(h, 5, 0, 1);
    const z = zarzales(h);
    ok(z.length === 1 && Math.abs(z[0].dur - 6) < 1e-6, 'm24 r2: un zarzal de 6 s');
    const b = mon(), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] });
    trap(b, 5, 0, 1);
    eq(zarzales(b).length, 0, 'sin m24: nada');
    h.tick(0.6);
    ok(f.slowT >= 0 && e.slowT > 0 && e.slowPct === 40, 'm24: el zarzal ralentiza un 40 %');
  }
  // m25 Tierra Arrasada: cada cepo que estalla siembra rango cepos pequeños a 3 m (30 %)
  {
    const h = mon({ m25: 2 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 2.4] });
    trap(h, 5, 0);
    det(h, e, 0.6);
    const s = traps(h, 'm_tierra_arrasada');
    eq(s.length, 2, 'm25 r2: 2 cepos pequeños');
    ok(s.every(f => Math.abs(Math.hypot(f.pos.x - 5, f.pos.z) - 3) < 0.05), 'm25: a 3 m');
    const b = mon();
    trap(b, 5, 0);
    near(s[0].data.dmg / traps(b)[0].data.dmg, 0.3, 'm25: al 30 %');
  }
  // Batida: 3 estallidos de trampa en 1 s → +15 % de daño recibido 6 s; m23 Batida Larga: +1 s y 10 de Quebranto a la Presa por rango
  {
    const go = nodes => {
      const h = mon(nodes), boss = h.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
      makePrey(h, boss);
      trap(h, 5, 2.4); trap(h, 5, -2.4); trap(h, 7.4, 0);
      const s0 = boss.stagger || 0;
      det(h, boss, 0.6);
      return [boss.debuffs?.coto_batida, (boss.stagger || 0) - s0, h.sfxCount('verb_hunt')];
    };
    const [w, st, sfx] = go({ m23: 3 }), [w0, st0, sfx0] = go({});
    ok(w0?.pct === 15 && w0.t > 5.5 && w0.t <= 6 && sfx0 === 1, 'Batida: +15 % 6 s y su sonido');
    near(w.t - w0.t, 3, 'm23 r3: +3 s de Batida', 0.02);
    ok(st - st0 >= 30 - 1e-6, 'm23 r3: +30 de Quebranto a la Presa');
  }
});

section('Montaraz: Presa (Presa Atrapada, Cerco a la Presa, Manada, Presa Herida, Acoso, Rastro, Gran Cacería)', () => {
  // m5 Presa Atrapada: una trampa que atrapa a tu Presa estalla (60 %) y devuelve una carga (cada 10 s)
  {
    const go = nodes => { const h = mon(nodes), e = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] }), l = spy(e); makePrey(h, e); trap(h, 5, 0, 1); return [by(l, 'm_presa_atrapada').length, h.p.skCharges.a_t_cepo.n]; };
    assert.deepEqual(go({ m5: 1 }), [1, 2], 'm5: estalla y devuelve la carga'); checks++;
    assert.deepEqual(go({}), [0, 1], 'sin m5: nada'); checks++;
    const h = mon({ m5: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }), l = spy(e);
    trap(h, 5, 0, 1);
    eq(by(l, 'm_presa_atrapada').length, 0, 'm5: un común (no Presa), nada');
  }
  // m6 Cerco a la Presa: Flecha Detonante sobre tu Presa le deja debajo un zarzal de 2 m 4 s
  {
    const go = (nodes, prey) => { const h = mon(nodes), e = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] }); if (prey) makePrey(h, e); else e.def.rank = null; det(h, e); return zarzales(h); };
    const z = go({ m6: 1 }, true);
    ok(z.length === 1 && Math.hypot(z[0].pos.x - 5, z[0].pos.z) < 0.5 && Math.abs(z[0].dur - 4) < 1e-6, 'm6: zarzal de 4 s bajo la Presa');
    eq(go({ m6: 1 }, false).length, 0, 'm6: sin Presa, nada');
  }
  // m9A Presas en Manada: hasta 3 Presas: tu primer élite y los 2 primeros que pisen una trampa
  {
    const h = mon({ m9: 1 }, { m9: 'A' }), el = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 6] });
    const cs = [[5, 0], [5, 4], [5, -4]].map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
    makePrey(h, el);
    for (const c of cs) trap(h, c.pos.x, c.pos.z, 0.8);
    ok(el.prey && cs[0].prey && cs[1].prey && !cs[2].prey, 'm9A: el élite y los 2 primeros atrapados');
    eq(h.gaugeView().x.preys, 3, 'm9A: 3 Presas en la barra');
    const b = mon(), f = b.enemy({ hp: 1e7, pos: [5, 0, 0] });
    trap(b, 5, 0, 0.8);
    ok(!f.prey, 'sin m9A: atrapar no da Presa');
  }
  // m9B Presa Herida: tu Presa recibe +10 % de todo el grupo y cada trampa que pisa le llena 25 de Quebranto
  {
    const h = mon({ m9: 1 }, { m9: 'B' }), boss = h.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
    makePrey(h, boss);
    h.tick(0.2);
    eq(boss.debuffs?.m_presa_herida?.pct, 10, 'm9B: Debilidad del 10 %');
    const s0 = boss.stagger || 0;
    trap(h, 5, 0, 1);
    const b = mon(), boss0 = b.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] });
    makePrey(b, boss0);
    const t0 = boss0.stagger || 0;
    trap(b, 5, 0, 1);
    near(((boss.stagger || 0) - s0) - ((boss0.stagger || 0) - t0), 25, 'm9B: +25 de Quebranto al pisar', 0.01);
  }
  // m12 Acoso: cada trampa que pisa tu Presa: al jefe, 15 de Quebranto/rango; al élite, ralentiza un 30 % 3 s
  {
    const go = (nodes, boss) => { const h = mon(nodes), e = h.enemy({ hp: 1e7, boss, rank: boss ? null : 'elite', pos: [5, 0, 0] }); makePrey(h, e); const s0 = e.stagger || 0; trap(h, 5, 0, 1); return [(e.stagger || 0) - s0, e]; };
    near(go({ m12: 2 }, true)[0] - go({}, true)[0], 30, 'm12 r2: +30 de Quebranto al jefe', 0.01);
    const [, el] = go({ m12: 1 }, false), [, el0] = go({}, false);
    ok(el.slowPct === 30 && el.slowT > 2, 'm12: el élite, ralentizado al 30 %');
    ok(!(el0.slowT > 0), 'sin m12: no');
  }
  // m19 Rastro Fresco: al morir tu Presa, el más fuerte a 10 m pasa a ser tu Presa y +10 de Energía/rango
  {
    const go = nodes => {
      const h = mon(nodes), a = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] });
      const weakling = h.enemy({ hp: 1e7, pos: [5, 0, 2] }), strong = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 6] });
      makePrey(h, a);
      h.p.mp = 10;
      a.takeDamage(1e9, false, { skill: 'a_disparo' });
      return [strong.prey, weakling.prey, h.p.mp];
    };
    const [s, w, mp] = go({ m19: 2 }), [s0, , mp0] = go({});
    ok(s && !w, 'm19: el más fuerte pasa a ser tu Presa');
    ok(!s0, 'sin m19: no');
    near(mp - mp0, 20, 'm19 r2: +20 de Energía', 0.01);
  }
  // m26 Gran Cacería: si tu Presa pisa una trampa, tus demás trampas saltan a su alrededor a mitad de daño
  {
    const h = mon({ m26: 1 }), e = h.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] });
    makePrey(h, e);
    trap(h, -6, 0, 0.6);
    const far = traps(h)[0], dmg = far.data.dmg;
    trap(h, 5, 0, 1);
    near(Math.hypot(far.pos.x - 5, far.pos.z), 2.2, 'm26: la trampa lejana salta junto a la Presa', 0.02);
    near(far.data.dmg / dmg, 0.5, 'm26: a mitad de daño');
    const b = mon(), f = b.enemy({ hp: 1e7, rank: 'elite', pos: [5, 0, 0] });
    makePrey(b, f);
    trap(b, -6, 0, 0.6);
    const far0 = traps(b)[0];
    trap(b, 5, 0, 1);
    eq(far0.pos.x, -6, 'sin m26: se queda');
  }
});

section('Montaraz: Zarzal (Semillas, Huida, Guarida, Coto Cerrado, Cerco y Bosque) y ápice', () => {
  // m14 Semillas de Zarza: Flecha Detonante deja un zarzal de 2 m 4 s donde estalla
  {
    const go = nodes => { const h = mon(nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); det(h, e); return zarzales(h); };
    const z = go({ m14: 1 });
    ok(z.length === 1 && Math.abs(z[0].dur - 4) < 1e-6 && z[0].radius === 2, 'm14: zarzal de 2 m 4 s');
    eq(go({}).length, 0, 'sin m14: nada');
  }
  // m15A Cepo de Huida: al bajar del 50 % de vida, inmovilizas 3 s a los de 4 m (cada 30 s)
  {
    const h = mon({ m15: 1 }, { m15: 'A' }), near1 = h.enemy({ hp: 1e7, pos: [2, 0, 0] }), far1 = h.enemy({ hp: 1e7, pos: [7, 0, 0] });
    const p = h.p;
    p.hp = p.stats.maxHP * 0.55;
    p.takeDamage(100, 100);
    ok(p.hp < p.stats.maxHP * 0.5 && near1.rootT > 2.5 && !(far1.rootT > 0), 'm15A: inmoviliza a los cercanos');
    const b = mon(), n0 = b.enemy({ hp: 1e7, pos: [2, 0, 0] });
    b.p.hp = b.p.stats.maxHP * 0.55;
    b.p.takeDamage(100, 100);
    ok(!(n0.rootT > 0), 'sin m15A: nada');
  }
  // m15B Guarida: a 4 m de tus trampas armadas recibes un 15 % menos
  {
    const go = (x) => { const h = mon({ m15: 1 }, { m15: 'B' }); trap(h, x, 0, 0.7); return taken(h); };
    near(go(3) / go(8), 0.85, 'm15B: −15 % cerca de tu trampa', 0.03);
  }
  // m16 Coto Cerrado: con 2+ trampas armadas, +6 %/rango de daño y los zarzales duran rango s más
  {
    const h = mon({ m16: 2, m14: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
    trap(h, -6, 0);
    const one = roll(h, e);
    trap(h, -6, 4);
    near(roll(h, e) / one, addRatio(h.p, 12), 'm16 r2: +12 % con 2 trampas armadas');
    det(h, e);
    near(zarzales(h)[0].dur, 6, 'm16 r2: el zarzal dura 4 + 2 s');
  }
  // m10A Zarzal Creciente: el Cerco crece 1 m/s (hasta 12 m) e inmoviliza a los que alcanza
  {
    const go = (nodes, choice) => { const h = mon(nodes, choice), e = h.enemy({ hp: 1e7, pos: [9, 0, 0] }); cast(h, 'k4', 'a_u_zarzas', 0, 0, 0.1); h.tick(2.5); return [cerco(h)?.radius, e.rootT]; };
    const [r, root] = go({ m10: 1 }, { m10: 'A' }), [r0, root0] = go({});
    ok(r > 9 && r < 10 && root > 0, `m10A: crece (${r?.toFixed(1)} m) y atrapa al que alcanza`);
    ok(r0 === 7 && !(root0 > 0), 'sin m10A: 7 m');
  }
  // m10B Zarzal Asfixiante: dentro del Cerco, el veneno al de más vida sube un 15 % cada segundo (hasta +90 %)
  {
    const h = mon({ m10: 1 }, { m10: 'B' }), big = h.enemy({ hp: 1e7, pos: [2, 0, 0] }), small = h.enemy({ hp: 1e5, pos: [0, 0, 2] });
    const lb = spy(big), ls = spy(small);
    cast(h, 'k4', 'a_u_zarzas', 0, 0, 0.1);
    h.tick(4);
    const extra = by(lb, 'm_asfixiante'), dots = by(lb, 'a_u_zarzas').filter(x => x.dot);
    ok(extra.length >= 4 && by(ls, 'm_asfixiante').length === 0, 'm10B: solo al de más vida');
    ok(extra[extra.length - 1].n > extra[0].n * 1.5, 'm10B: sube con el tiempo');
    near(extra[0].n / dots[0].n, 0.15, 'm10B: +15 % al primer segundo', 0.05);
  }
  // m17 Zarzas Trepadoras: cada enemigo que inmoviliza el Cerco lo alarga 0,5 s/rango
  {
    const go = nodes => {
      const h = mon(nodes), e = h.enemy({ hp: 1e7, pos: [8, 0, 0] });
      cast(h, 'k4', 'a_u_zarzas', 0, 0, 0.1);
      h.tick(0.3);
      const t0 = cerco(h).t;
      e.pos.x = 6;                                  // cruza el anillo
      h.tick(0.3);
      return [cerco(h).t - t0, e.rootT];
    };
    const [d, root] = go({ m17: 2 }), [d0] = go({});
    ok(root > 0, 'cruzar el Cerco inmoviliza');
    near(d - d0, 1, 'm17 r2: +1 s al Cerco', 0.02);
  }
  // m21 Rebrote: al acabarse, el Cerco deja 3 zarzales de 6 s
  {
    const go = nodes => { const h = mon(nodes); cast(h, 'k4', 'a_u_zarzas', 0, 0, 0.1); h.tick(8.3); return zarzales(h); };
    const z = go({ m21: 1 });
    ok(z.length === 3 && z.every(f => Math.abs(f.dur - 6) < 1e-6), 'm21: 3 zarzales de 6 s');
    eq(go({}).length, 0, 'sin m21: nada');
  }
  // m27 Bosque Vivo: 3 zarzales tuyos que se tocan forman un Cerco gratis de rango + 1 s que inmoviliza
  {
    const go = nodes => {
      const h = mon(nodes), e = h.enemy({ hp: 1e7, pos: [12, 0, 0] });
      for (const [x, z] of [[0, 0], [2, 0], [1, 1.6]]) h.g.spawnField('m_zarzal', { pos: new THREE.Vector3(x, 0, z), radius: 2, dur: 6, owner: h.p, data: { skill: 'm_zarzal', slowPct: 40 } });
      h.tick(0.2);
      const f = (h.g.fields || []).find(x => !x.dead && x.kind === 'm_cerco');
      if (f) { e.pos.x = f.pos.x + f.radius - 0.5; h.tick(0.2); }
      return [f, e.rootT];
    };
    const [f, root] = go({ m27: 2 }), [f0] = go({});
    ok(f && Math.abs(f.dur - 3) < 1e-6 && f.radius === 7, 'm27 r2: Cerco de 7 m y 3 s');
    ok(root > 0, 'm27: cruzarlo inmoviliza');
    ok(!f0, 'sin m27: nada');
  }
  // m28 Corazón del Bosque: 1) tus trampas ralentizan un 30 % a 3 m · 2) un élite muerto deja un cepo ·
  // 3) la Batida salta con 2 estallidos · 4) cada 12 cepos que estallan, un Cerco gratis
  {
    const h = mon({ m28: 1 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 2.5] });
    trap(h, 5, 0, 0.8);
    ok(e.slowPct === 30 && e.slowT > 0, 'm28 r1: la trampa armada ralentiza a 3 m');
    const b = mon(), f = b.enemy({ hp: 1e7, pos: [5, 0, 2.5] });
    trap(b, 5, 0, 0.8);
    ok(!(f.slowT > 0), 'sin m28: no');
    const k = mon({ m28: 2 }), el = k.enemy({ hp: 1e5, rank: 'elite', pos: [6, 0, 0] });
    el.takeDamage(1e9, false, { skill: 'a_disparo' });
    ok(traps(k, 'm_corazon_bosque').length === 1, 'm28 r2: el élite muerto deja un cepo');
    // r3: dos estallidos bastan para la Batida
    const bat = nodes => { const x = mon(nodes), boss = x.enemy({ hp: 1e7, boss: true, pos: [5, 0, 0] }); makePrey(x, boss); trap(x, 5, 2.4); trap(x, 5, -2.4); det(x, boss, 0.6); return !!boss.debuffs?.coto_batida; };
    ok(bat({ m28: 3 }) && !bat({ m28: 2 }), 'm28 r3: Batida con 2 estallidos');
    // r4: cada 12 cepos de Trampa de Cepo que estallan (golpes de estallido por el ⑤ real), un Cerco gratis
    const go = r => {
      const x = mon({ m28: r }), en = x.enemy({ hp: 1e7, pos: [5, 0, 0] });
      for (let i = 1; i <= 12; i++) x.g.onPlayerHit(en, { dealt: 10, raw: 10, skill: 'a_m_detonante', tags: new Set(['trap']), source: 'trap', trap: { uid: 1000 + i, skill: 'a_t_cepo' }, pos: { x: 5, z: 0 } });
      x.step(0.1);
      return !!cerco(x);
    };
    ok(go(4) && !go(3), 'm28 r4: 12 estallidos, Cerco de Zarzas gratis');
  }
});

console.log(`✅ TALENTOS DE LA ARQUERA (clase, especializaciones y héroe) OK · ${checks} comprobaciones`);
