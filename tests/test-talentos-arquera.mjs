// Paso 2 (E2, KT-arquera): talentos v2 de la Arquera — árbol de CLASE y árboles HÉROE.
// Cada nodo con fx tiene un efecto observable con el arnés real (Player, canal de lanzamiento,
// proyectiles, campos y despachador de poderes): se compara contra una arquera SIN el nodo.
// Las especializaciones (trabajos 2 y 3 de KT) añaden aquí sus casos.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { TALENT_TREES } from '../js/talents.js';
import { ARQUERA_TV_KEYS } from '../js/talents-arquera.js';
import { POWER_HOOKS, powerState, definePower } from '../js/powers.js';
import { arqueraPowers } from '../js/powers-arquera.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';

const TREES = TALENT_TREES.arquera;
const SRC = readFileSync(new URL('../js/powers-arquera.js', import.meta.url), 'utf8');
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

console.log('Talentos de la Arquera (clase y árboles héroe)');

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
  for (const t of TREES.hero) walk(`${t.id}.`, t.nodes);
  // solo quedan las activas que escribe KA1 (D29): Agilidad (c17A) y las de los árboles héroe
  assert.deepEqual(todos.sort(), ['c17A', 'h1.q4A', 'h2.w4A', 'h3.y4A']); checks++;
  assert.deepEqual(empty, [], 'nodos sin todo con fx vacío'); checks++;
  const own = arqueraPowers();
  for (const id of powers) {
    ok(POWER_HOOKS[id], `poder ${id} registrado`);
    ok(own[id], `poder ${id} es de powers-arquera.js`);
  }
  ok(Object.values(own).every(d => !('mult' in d)), 'ningún poder de la Arquera declara mult');
  // claves tv propias: las de los nodos están en ARQUERA_TV_KEYS y cada una la lee un poder propio
  const core = new Set(['drMoving', 'costRedBig']);
  for (const k of tvKeys) ok(core.has(k) || ARQUERA_TV_KEYS.includes(k), `clave tv ${k} declarada`);
  for (const k of ARQUERA_TV_KEYS) ok(new RegExp(`\\btv\\??\\.${k}\\b`).test(SRC), `clave tv ${k} leída en powers-arquera.js`);
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
    eq(resolveSkill(p, SK('a_red')).cost, 10, 'c22B: Red de Caza (10) no cambia');
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
      return h.p.cds;
    };
    const a = run({ c23: 2 }), b = run({});
    near(b.a_paso - a.a_paso, 0.6, 'c23 r2: −0,6 s a Paso Veloz', 0.001);
    near(b.a_humo - a.a_humo, 0.6, 'c23 r2: −0,6 s a la Bomba de Humo', 0.001);
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
const INSIGNIA = { id: 'a_x_insignia', name: 'Insignia', cat: 'spec', spec: 'tiradora', slots: ['k3'], tags: ['spec', 'physical'], type: 'buff', cd: 20, dur: 1, buff: { aspdPct: 1 } };
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
  // q6 Empuje del Aire: gastar 3 Ráfagas da +15 de tu mecánica (Impulso)
  {
    const run = nodes => { const h = hero('h1', nodes), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] }); h.tick(12.1); const g0 = h.gaugeValue('impulso'); volley(h, e); return h.gaugeValue('impulso') - g0; };
    near(run({ q6: 1 }) - run({}), 15, 'q6: +15 de Impulso', 0.01);
    const two = hero('h1', { q6: 1 }), e = two.enemy({ hp: 1e7, pos: [5, 0, 0] }), b2 = hero('h1'), f = b2.enemy({ hp: 1e7, pos: [5, 0, 0] });
    two.tick(8.1); b2.tick(8.1);
    const g0 = two.gaugeValue('impulso'), f0 = b2.gaugeValue('impulso');
    volley(two, e); volley(b2, f);
    near(two.gaugeValue('impulso') - g0, b2.gaugeValue('impulso') - f0, 'q6: con 2 Ráfagas, nada', 0.01);
  }
  // q7 Rachas: gastar 3 Ráfagas recarga 2 s la insignia
  {
    const run = nodes => {
      const h = hero('h1', nodes, {}, { inject: { skills: [INSIGNIA] } }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
      cast(h, 'k3', 'a_x_insignia', 5, 0, 0.1);
      h.tick(12.1);
      volley(h, e);
      return h.p.cds.a_x_insignia;
    };
    near(run({}) - run({ q7: 1 }), 2, 'q7: −2 s a la insignia', 0.001);
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

console.log(`✅ TALENTOS DE LA ARQUERA (clase y héroe) OK · ${checks} comprobaciones`);
