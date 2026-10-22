// ============================================================
// Talentos 2g de la MAGA (Paso 2 · E2, KT-maga): cada nodo con `fx` produce un efecto observable
// ============================================================
// docs/paso2-implementacion.md §2 E2 (fila KT) y docs/paso2g-maga-coherencia.md §4 (clase), §5
// (especializaciones) y §7 (árboles héroe):
//  1) cobertura: todo nodo u opción (clase, Piromante, Crionte, Arcanista y Paragon) tiene efecto y
//     ningún `todo`; cada poder está registrado (talent-coverage) y cada clave tv propia
//     (MAGA_TV_KEYS) la lee un poder de la clase o su indicador (js/mech-maga.js)
//  2) clase: cada nodo, contra el mismo héroe sin él (mismo nivel, misma semilla)
//  3) Paragon: cada nodo con el árbol héroe ABIERTO (31/31 de especialización a Nv70), contra el
//     mismo árbol sin él; los finales leen su rango; G13 (pausa y vuelta)
//  4) especializaciones: cada nodo con la especialización activa (sus nodos clave gratis), contra
//     la misma especialización sin él; las elecciones, cada opción; los finales y ápices, por rango
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { MAGA_TALENTS, MAGA_TV_KEYS } from '../js/talents-maga.js';
import { POWER_HOOKS, powerState, firePower } from '../js/powers.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';
import { gaugeValue, gaugeTuning } from '../js/spec-mechanics.js';
import { missingFor } from './helpers/talent-coverage.mjs';
import { magaStorm } from '../js/skills-maga.js';
import { magaOrbs } from '../js/powers-maga.js';
import { learnAt, buildsFor, buildRanks, normalizeTalents, talentsTrimmed, skillLearnLevel, TALENT_RULES } from '../js/talents.js';
import { levelTrees, buyLevel } from './helpers/talent-level.mjs';

let checks = 0;
// mensajes de las comprobaciones que ya pasaron: la cobertura del final busca en ellos cada nodo
const PASSED = [];
const ok = (c, msg) => { assert.ok(c, msg); checks++; PASSED.push(msg); };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; PASSED.push(msg); };
const same = (a, b, msg) => { assert.deepEqual(a, b, msg); checks++; PASSED.push(msg); };
const near = (a, b, tol, msg) => { assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≉ ${b} (±${tol})`); checks++; PASSED.push(msg); };

// ------------------------------------------------------------ arnés
function H(opts = {}) {
  const h = makeHarness({ classId: 'maga', seed: 7, level: 70, ...opts });
  h.g.fields = h.g.fields || [];                    // campos de suelo (spawnField lo crea al primero)
  return h;
}
// clase: rangos y elecciones de clase (sin especialización: nada más aporta)
const cls = (ranks, choice = {}, opts = {}) => H({ talents: { cls: ranks, choice }, ...opts });
// Paragon: especialización al máximo (build recomendada a Nv70: 31/31, sin puntos de héroe ni de
// clase) y los nodos de héroe pedidos; la clave del árbol es gratis
const HERO_SPEC = { crono: 'arcanista', invoca: 'crionte', escriba: 'crionte' };
function hero(tree, nodes = {}, choice = {}, opts = {}) {
  const spec = opts.spec || HERO_SPEC[tree];
  const h = H({ spec, build: true, talents: { hero: { [spec]: { tree, nodes: { [tree]: nodes }, choice: { [tree]: choice } } } }, ...opts });
  h.p.talents.cls = {};
  // arma fija y grande: las proporciones de daño (× 1,2, × 1,8…) no se pierden al redondear
  h.p.equipment.weapon = { kind: 'item', slot: 'weapon', name: 'Bastón de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  assert.ok(h.p.talentAgg.heroOpen && h.p.talentAgg.hero === tree, `${tree}: el Paragon abre a Nv70 con 31/31`);
  return h;
}
// registro de impactos (⑤): fuente, habilidad y daño de cada golpe
function spy(h) {
  const log = [];
  const orig = h.g.onPlayerHit.bind(h.g);
  h.g.onPlayerHit = (e, hit) => { log.push({ e, ...hit }); return orig(e, hit); };
  return log;
}
const from = (log, skill, e = null) => log.filter(x => x.skill === skill && (!e || x.e === e));
const sum = list => list.reduce((a, x) => a + (x.dealt || 0), 0);
// repeticiones y lanzamientos «solos y gratis» (g.castEcho, cola W2d): id, potencia, mira, origen y
// si salió. Las copias de una canalización no pasan por aquí (echoChannel: golpes con echo)
function spyFree(h) {
  const out = [];
  const orig = h.g.castEcho.bind(h.g);
  h.g.castEcho = (p, id, opts = {}, legacy) => {
    const r = orig(p, id, opts, legacy);
    out.push({ id, mult: opts?.mult ?? 1, at: opts?.at || null, origin: opts?.origin || null, ok: !!r, t: h.p.simT });
    return r;
  };
  return out;
}
const sk = (h, id) => h.p.cls.skills.find(s => s.id === id);
const prof = (h, id) => { h.p.resolved = {}; return resolveSkill(h.p, sk(h, id)); };
// lanza la ranura (lista: sin enfriamiento ni bloqueo) y deja correr la simulación (proyectiles,
// preparación, eco). Si no sale, la prueba no vale: falla aquí
function cast(h, slot, id, sec = 0.6) {
  h.setSlot(slot, id);
  h.p.cds[id] = 0; h.p.atkCd = 0; h.p.gcdT = 0; h.p.castLock = 0; h.p.actionLockT = 0;
  const r = h.cast(slot);
  assert.ok(r, `${id}: se lanza`);
  h.step(sec);
  return r;
}
const fx = id => {
  const all = [...MAGA_TALENTS.cls.nodes, ...MAGA_TALENTS.hero.flatMap(t => t.nodes)];
  const [, nid, k] = id.match(/^([a-z]\d+)([AB]?)$/);
  const n = all.find(x => x.id === nid);
  return (k ? n.opts.find(o => o.k === k).fx : n.fx) || {};
};

// ------------------------------------------------------------ 1) cobertura
const ALL_NODES = [...MAGA_TALENTS.cls.nodes, ...MAGA_TALENTS.specs.flatMap(s => s.nodes), ...MAGA_TALENTS.hero.flatMap(t => t.nodes)];
{
  let parts = 0;
  for (const n of ALL_NODES) {
    for (const [id, o] of n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o]) : [[n.id, n]]) {
      parts++;
      ok(!('todo' in o), `${id}: sin todo`);
      // un nodo clave sin fx ES la mecánica de su especialización (se prueba en 4: llenarla y gastarla)
      const keyMech = n.t === 'k' && MAGA_TALENTS.specs.some(s => s.mechanic && s.nodes.includes(n));
      ok(Object.keys(o.fx || {}).length > 0 || keyMech, `${id}: con efecto`);
      if (o.fx?.power) ok(POWER_HOOKS[o.fx.power], `${id}: el poder ${o.fx.power} está registrado`);
    }
  }
  for (const s of MAGA_TALENTS.specs) ok(!('todo' in s) && s.mechanic && s.elem, `${s.id}: sin todo, con mecánica y elemento`);
  same(missingFor('maga'), { powers: [], behaviors: [], skills: [] }, 'talent-coverage: todo poder y activa existen');
  // cada clave tv propia la lee un poder de la Maga o su indicador (y ninguna sobra)
  const src = ['../js/powers-maga.js', '../js/mech-maga.js'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n').replace(/\/\/.*$/gm, '');
  for (const k of MAGA_TV_KEYS) ok(new RegExp(`\\.${k}\\b`).test(src), `MAGA_TV_KEYS: «${k}» la lee js/powers-maga.js o js/mech-maga.js`);
  const used = new Set(ALL_NODES.flatMap(n => (n.t === 'c' ? n.opts : [n]).flatMap(o => Object.keys(o.fx?.tv || {}))));
  for (const k of MAGA_TV_KEYS) ok(used.has(k), `MAGA_TV_KEYS: «${k}» la usa algún nodo`);
  console.log(`✓ datos: ${parts} nodos u opciones con efecto y sin todo (clase, 3 especializaciones y Paragon)`);
}
// la cobertura del final no cuenta estos mensajes: dicen que el dato existe, no que haga algo
const DATA_CHECKS = PASSED.length;

// ------------------------------------------------------------ 2) árbol de CLASE
// c1 Reservas Profundas · c12 Flujo de Maná · c13 Mente Afilada · c24 Celeridad (stats)
{
  const b = cls({});
  const r = cls({ c1: 2, c12: 1, c13: 2, c24: 2 });
  near(r.p.stats.maxMP / b.p.stats.maxMP, 1.3, 0.01, 'c1: +30 % de maná máximo');
  eq(r.p.stats.mph - b.p.stats.mph, 2, 'c12: +2 de maná por golpe');
  near(r.p.stats.critRaw - b.p.stats.critRaw, 10, 1e-9, 'c13: +10 de probabilidad de crítico');
  ok(r.p.stats.atkTime < b.p.stats.atkTime * 0.9, 'c24: lanzas un 14 % más rápido');
}
// c2 Intelecto Arcano (@all) · c6 Núcleo Denso / Onda Expansiva (@spender) · c9B · c21 · c22B
{
  const b = cls({});
  eq(prof(cls({ c2: 2 }), 'm_dardo').addPct - prof(b, 'm_dardo').addPct, 12, 'c2: +12 % a todos tus hechizos (también el Dardo)');
  eq(prof(cls({ c6: 1 }, { c6: 'A' }), 'bola_fuego').dmgDirect, 25, 'c6A: +25 % al golpe directo de las principales');
  eq(prof(cls({ c6: 1 }, { c6: 'A' }), 'm_dardo').dmgDirect, 0, 'c6A: el básico no es principal');
  near(prof(cls({ c6: 1 }, { c6: 'B' }), 'bola_fuego').splash / prof(b, 'bola_fuego').splash, 1.3, 1e-9, 'c6B: +30 % a la explosión');
  const cort = prof(cls({ c9: 1 }, { c9: 'B' }), 'nova_hielo'), nova = prof(b, 'nova_hielo');
  eq(cort.addPct - nova.addPct, 40, 'c9B: Nova +40 %');
  eq(cort.slow, nova.slow - 1, 'c9B: ralentiza 1 s menos');
  eq(prof(cls({ c21: 1 }), 'nova_hielo').slow, nova.slow + 2, 'c21: +2 s a la ralentización de la Nova');
  eq(prof(cls({ c21: 1, c9: 1 }, { c9: 'B' }), 'nova_hielo').slow, nova.slow + 1, 'c21 + c9B: +2 − 1');
  // también la del Sello de Contención (forja II del Sello del Archimago): quien sale del círculo
  // sigue ralentizado 0,6 + 2 s (sin el nodo, 0,6 s)
  for (const ranks of [{ c21: 1 }, {}]) {
    const h = H({ spec: 'arcanista', talents: { cls: ranks } });
    h.p.skillForge = { a_sello: 'ii' }; h.p.recompute();
    const e = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    cast(h, 'k2', 'a_sello', 0.6);
    ok(e.slowT > 0 && e.slowPct === 40, 'el Sello de Contención ralentiza un 40 % dentro');
    e.pos.set(20, 0, 0); h.tick(1.5);
    if (ranks.c21) ok(e.slowT > 0.5, `c21: alarga 2 s la ralentización del Sello de Contención (${e.slowT.toFixed(2)} s tras salir)`);
    else ok(!(e.slowT > 0), 'sin c21, al salir del Sello se acaba en 0,6 s');
  }
  eq(prof(cls({ c22: 1 }, { c22: 'B' }), 'nova_hielo').cost, Math.round(nova.cost * 0.8), 'c22B: −20 % a los hechizos de más de 20 de maná');
  eq(prof(cls({ c22: 1 }, { c22: 'B' }), 'bola_fuego').cost, prof(b, 'bola_fuego').cost, 'c22B: la Bola (18) no llega al umbral');
}
// c11A · c17A · c22A: activas de talento concedidas (las tres existen en el catálogo)
{
  for (const [id, act] of [['c11', 'm_t_bloque'], ['c17', 'm_t_inversion'], ['c22', 'm_t_contrahechizo']]) {
    const h = cls({ [id]: 1 }, { [id]: 'A' });
    ok(h.p.talentAgg.grants.has(act) && isKnown(h.p, sk(h, act)), `${id}A: conoces ${act}`);
    ok(!cls({ [id]: 1 }, { [id]: 'B' }).p.talentAgg.grants.has(act), `${id}B: no la concede`);
  }
}
// c4 Escudo Prismático (tv.barrierDr) · c19 Barrera Resonante · la Barrera del kit (m_barrera)
{
  const b = cls({});
  cast(b, 'k2', 'm_barrera', 0.1);
  const sh = b.p.shields.find(s => s.src === 'm_barrera');
  ok(sh && Math.abs(sh.amt - b.p.stats.maxMP * 0.6 * prof(b, 'm_barrera').buffMul) <= 1, 'la Barrera absorbe el 60 % del maná máximo (× potencia del rango)');
  eq(b.p.shieldDr(), 0, 'sin c4 la Barrera no reduce el daño');
  const r = cls({ c4: 3 });
  cast(r, 'k2', 'm_barrera', 0.1);
  eq(r.p.shieldDr(), 24, 'c4: −24 % de daño mientras aguanta la Barrera');
  // c19: con la Barrera puesta, cada Dardo da 2 de maná y la recarga un 2 % de tu vida
  const h = cls({ c19: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'm_dardo', dealt: 10 });
  const mp0 = h.p.mp = 10;
  h.hit(e, { skill: 'm_dardo', dealt: 10 });
  eq(h.p.mp, mp0, 'c19: sin Barrera no da maná');
  cast(h, 'k2', 'm_barrera', 0.1);
  const s = h.p.shields.find(x => x.src === 'm_barrera');
  s.amt -= 50;
  h.p.mp = 10;
  h.hit(e, { skill: 'm_dardo', dealt: 10 });
  eq(h.p.mp, 12, 'c19: +2 de maná por Dardo');
  near(s.amt, s.max - 50 + h.p.stats.maxHP * 0.02, 1e-6, 'c19: recarga un 2 % de la vida');
  for (let i = 0; i < 40; i++) h.hit(e, { skill: 'm_dardo', dealt: 10 });
  eq(s.amt, s.max, 'c19: no pasa de lo que absorbía al ponerla');
}
// c5A Dardo Certero: cada 4.º Dardo es crítico seguro (misma semilla: los demás, igual)
{
  const run = ranks => {
    const h = cls(ranks, { c5: 'A' });
    const log = spy(h);
    h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    h.aim(4, 0);
    for (let i = 0; i < 8; i++) cast(h, 'lmb', 'm_dardo', 1.2);
    return from(log, 'm_dardo').map(x => x.crit);
  };
  const base = run({}), cert = run({ c5: 1 });
  eq(base.length, 8, 'ocho Dardos impactan');
  same(cert, base.map((c, i) => c || i % 4 === 3), 'c5A: el 4.º y el 8.º son críticos; el resto como sin el nodo');
  ok(base.filter((c, i) => i % 4 === 3).some(c => !c), 'sin el nodo, algún 4.º Dardo no es crítico (la prueba distingue)');
}
// c5B Dardo Sifón: si el Dardo mata, +6 de maná y las principales −1 s
{
  const run = ranks => {
    const h = cls(ranks, { c5: 'B' });
    h.p.cds.nova_hielo = 4; h.p.cds.m_parpadeo = 4;
    const e = h.enemy({ hp: 1, pos: [4, 0, 0] });
    h.aim(4, 0);
    h.p.mp = 0;
    cast(h, 'lmb', 'm_dardo', 0.5);
    ok(!e.alive, 'el Dardo mata');
    return { mp: h.p.mp, nova: h.p.cds.nova_hielo, blink: h.p.cds.m_parpadeo };
  };
  const b = run({}), r = run({ c5: 1 });
  near(r.mp - b.mp, 6, 1e-6, 'c5B: +6 de maná');
  near(b.nova - r.nova, 1, 1e-6, 'c5B: la Nova (principal) se recarga 1 s antes');
  near(b.blink - r.blink, 0, 1e-9, 'c5B: Parpadeo (no principal) no');
}
// c7 Paso Fugaz · c14B Parpadeo Reparador · c14A Runa de Escarcha · c27 Imagen Arcana
{
  const b = cls({});
  b.aim(6, 0);
  cast(b, 'k1', 'm_parpadeo', 0.1);
  ok(b.p.pos.x > 3, 'Parpadeo te lleva hacia la mira');
  ok(!b.p.buffs.some(x => x.id === 'm_paso_fugaz') && !(b.g.fields || []).length, 'sin nodos, Parpadeo no deja nada');
  const f = cls({ c7: 1 });
  f.aim(6, 0);
  const spd0 = f.p.stats.spdPct;
  cast(f, 'k1', 'm_parpadeo', 0.1);
  eq(f.p.stats.spdPct - spd0, 30, 'c7: +30 % de velocidad tras Parpadeo');
  f.tick(3.1);
  eq(f.p.stats.spdPct, spd0, 'c7: dura 3 s');
  const c = cls({ c14: 1 }, { c14: 'B' });
  c.p.hp = c.p.stats.maxHP * 0.5; c.p.applySlow(3);
  c.aim(6, 0);
  const hp0 = c.p.hp;
  cast(c, 'k1', 'm_parpadeo', 0);
  near(c.p.hp - hp0, c.p.stats.maxHP * 0.08, 1, 'c14B: te cura un 8 %');
  eq(c.p.slowT, 0, 'c14B: te quita la ralentización');
  const r = cls({ c14: 1 }, { c14: 'A' });
  const e = r.enemy({ hp: 1e6, pos: [0.5, 0, 0] });
  r.aim(7, 0);
  cast(r, 'k1', 'm_parpadeo', 0.6);
  const rune = r.g.fields.find(x => x.kind === 'm_runa_escarcha');
  ok(rune && Math.hypot(rune.pos.x, rune.pos.z) < 0.01, 'c14A: la runa queda donde EMPIEZA el Parpadeo');
  ok(e.slowT > 0, 'c14A: ralentiza a quien la pisa');
  r.tick(3.2);
  ok(!r.g.fields.some(x => x.kind === 'm_runa_escarcha'), 'c14A: dura 3 s');
  for (const rank of [1, 3]) {
    const m = cls({ c27: rank });
    const foe = m.enemy({ hp: 1e6, pos: [-3, 0, 0] }), far = m.enemy({ hp: 1e6, pos: [-9, 0, 0] });
    m.aim(7, 0);
    cast(m, 'k1', 'm_parpadeo', 0.1);
    const img = m.g.fields.find(x => x.kind === 'm_imagen');
    ok(img && foe.tauntSrc === img.data.decoy && foe.combatTarget(m.p) === img.data.decoy, `c27 r${rank}: los enemigos a 6 m atacan a la copia`);
    ok(far.tauntSrc !== img.data.decoy, `c27 r${rank}: no los de más lejos`);
    m.tick(2 + rank - 0.3);
    ok(m.g.fields.some(x => x.kind === 'm_imagen'), `c27 r${rank}: la copia sigue antes de ${2 + rank} s`);
    m.tick(0.6);
    ok(!m.g.fields.some(x => x.kind === 'm_imagen') && !img.data.decoy.alive, `c27 r${rank}: dura ${2 + rank} s`);
  }
}
// c8 Piel de Maná (tv.drHighMana del núcleo) · c15A Escudo de Maná · c17B Anclaje Temporal
{
  const loss = (ranks, ch = {}, mpFrac = 1) => {
    const h = cls(ranks, ch);
    h.p.mp = h.p.stats.maxMP * mpFrac;
    const hp0 = h.p.hp;
    h.p.takeDamage(200, 1, { element: 'fire' });
    return { lost: hp0 - h.p.hp, mp: h.p.mp, h };
  };
  const b = loss({}), pm = loss({ c8: 2 }), pmLow = loss({ c8: 2 }, {}, 0.3);
  ok(pm.lost < b.lost * 0.9, 'c8: con más de la mitad del maná recibes menos daño');
  eq(pmLow.lost, b.lost, 'c8: con menos de la mitad, nada');
  const em = loss({ c15: 1 }, { c15: 'A' });
  near(em.lost, b.lost * 0.8, 1, 'c15A: pagas el 20 % con maná');
  near(b.mp - em.mp, b.lost * 0.2, 1, 'c15A: … y cuesta ese maná');
  const dry = loss({ c15: 1 }, { c15: 'A' }, 0);
  eq(dry.lost, b.lost, 'c15A: sin maná, todo a la vida');
  // c15B Mente Clara: +30 % de regeneración y +10 % con más del 70 % de maná (núcleo: highManaDmg;
  // texto del punto 17)
  const regen = ranks => { const h = cls(ranks, { c15: 'B' }); h.p.mp = 0; h.step(1, 0.1); return h.p.mp; };
  near(regen({ c15: 1 }) / regen({}), 1.3, 0.01, 'c15B: recuperas maná un 30 % más rápido');
  const roll = (ranks, mpFrac) => { const h = cls(ranks, { c15: 'B' }); h.p.mp = h.p.stats.maxMP * mpFrac; const e = h.enemy({ hp: 1e6 }); return h.p.rollDamage(100, -100, 0, e, {}).dmg; };
  ok(roll({ c15: 1 }, 0.8) > roll({ c15: 1 }, 0.6) && roll({ c15: 1 }, 0.8) === roll({ c15: 1 }, 1) && roll({}, 1) === roll({}, 0.2), 'c15B: +daño con más del 70 % de maná (al 80 %, igual que lleno; al 60 %, nada)');
  ok(/más del 70 % de maná/.test(MAGA_TALENTS.cls.nodes.find(n => n.id === 'c15').opts.find(o => o.k === 'B').desc), 'c15B: el texto dice el umbral que aplica (70 %)');
  const an = cls({ c17: 1 }, { c17: 'B' });
  an.p.takeDamage(an.p.stats.maxHP * 0.64, 1, { element: 'fire', unavoidable: true });
  ok(an.p.hp > an.p.stats.maxHP * 0.3 && an.p.hp < an.p.stats.maxHP * 0.4, 'el golpe deja entre el 30 y el 40 %');
  ok(!an.p.buffs.some(x => x.id === 'm_anclaje'), 'c17B: por encima del 30 %, nada');
  an.p.takeDamage(an.p.stats.maxHP * 0.1, 1, { element: 'fire', unavoidable: true });
  const buff = an.p.buffs.find(x => x.id === 'm_anclaje');
  ok(buff && buff.stats.dr === 30 && buff.stats.spdPct === 50 && buff.t === 4, 'c17B: al bajar del 30 %, −30 % de daño y +50 % de velocidad 4 s');
  an.p.hp = an.p.stats.maxHP; an.tick(5);
  an.p.takeDamage(an.p.stats.maxHP * 0.8, 1, { element: 'fire' });
  ok(!an.p.buffs.some(x => x.id === 'm_anclaje'), 'c17B: una vez cada 60 s');
  an.tick(56); an.p.hp = an.p.stats.maxHP;
  an.p.takeDamage(an.p.stats.maxHP * 0.8, 1, { element: 'fire' });
  ok(an.p.buffs.some(x => x.id === 'm_anclaje'), 'c17B: vuelve a los 60 s');
}
// c9A Nova Congelante (no a jefes; cada 8 s)
{
  const h = cls({ c9: 1 }, { c9: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }), boss = h.enemy({ hp: 1e6, pos: [-1.5, 0, 0], boss: true });
  cast(h, 'rmb', 'nova_hielo', 0.1);
  ok(e.frozenT > 0, 'c9A: la Nova congela');
  ok(!(boss.frozenT > 0), 'c9A: no a jefes');
  h.tick(4.5); e.frozenT = 0; e.stunT = 0; e.stunDR = 0;
  cast(h, 'rmb', 'nova_hielo', 0.1);
  ok(!(e.frozenT > 0), 'c9A: como mucho una vez cada 8 s');
  h.tick(4.5); e.stunDR = 0;
  cast(h, 'rmb', 'nova_hielo', 0.1);
  ok(e.frozenT > 0, 'c9A: a los 8 s vuelve a congelar');
  const b = cls({});
  const o = b.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  cast(b, 'rmb', 'nova_hielo', 0.1);
  ok(!(o.frozenT > 0), 'sin c9A la Nova no congela');
}
// c10A Ralentizar · c10B Disrupción
{
  const h = cls({ c10: 1 }, { c10: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  cast(h, 'rmb', 'nova_hielo', 0);
  ok(e.slowT >= 4 - 1e-6 && e.slowPct === 50, 'c10A: el siguiente hechizo ralentiza un 50 % 4 s');
  const t = cls({ c10: 1, c21: 1 }, { c10: 'A' });
  const o = t.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  cast(t, 'rmb', 'nova_hielo', 0);
  ok(o.slowT >= 6 - 1e-6, 'c21: también alarga la de Ralentizar (4 + 2 s)');
  const d = cls({ c10: 1 }, { c10: 'B' });
  const foe = d.enemy({ hp: 1e6, pos: [3, 0, 0] });
  d.hit(foe, { skill: 'm_dardo', dealt: 10 });
  eq(foe.silenceT, 3, 'c10B: el Dardo lo deja mudo 3 s');
  foe.silenceT = 0; foe.silenceImmuneT = 0;
  d.hit(foe, { skill: 'm_dardo', dealt: 10 });
  eq(foe.silenceT, 0, 'c10B: cada 10 s');
  d.tick(9.7); foe.silenceT = 0; foe.silenceImmuneT = 0;
  d.hit(foe, { skill: 'm_dardo', dealt: 10 });
  eq(foe.silenceT, 0, 'c10B: a los 9,7 s aún no');
  d.tick(0.4); foe.silenceT = 0; foe.silenceImmuneT = 0;
  d.hit(foe, { skill: 'm_dardo', dealt: 10 });
  eq(foe.silenceT, 3, 'c10B: a los 10 s, otra vez');
  const b = cls({});
  const x = b.enemy({ hp: 1e6, pos: [3, 0, 0] });
  b.hit(x, { skill: 'm_dardo', dealt: 10 });
  ok(!(x.silenceT > 0), 'sin c10B el Dardo no silencia');
}
// c11B Aguante Arcano (golpe letal: 1 de vida y Barrera gratis, cada 120 s)
{
  const h = cls({ c11: 1 }, { c11: 'B' });
  h.p.takeDamage(h.p.stats.maxHP * 5, 1, { element: 'fire' });
  ok(h.p.alive && h.p.hp === 1, 'c11B: sobrevives con 1 de vida');
  ok(h.p.shields.some(s => s.src === 'm_barrera' && Math.abs(s.amt - h.p.stats.maxMP * 0.6 * prof(h, 'm_barrera').buffMul) <= 1), 'c11B: con una Barrera gratis (la misma que lanzada)');
  h.p.shields = []; h.p.hp = h.p.stats.maxHP;
  h.p.takeDamage(h.p.stats.maxHP * 5, 1, { element: 'fire' });
  ok(!h.p.alive, 'c11B: una vez cada 120 s');
  for (const [wait, saved] of [[119.5, false], [120.5, true]]) {
    const a = cls({ c11: 1 }, { c11: 'B' });
    a.p.takeDamage(a.p.stats.maxHP * 5, 1, { element: 'fire' });
    a.tick(wait); a.p.shields = []; a.p.hp = a.p.stats.maxHP; a.p.invulnT = 0;
    a.p.takeDamage(a.p.stats.maxHP * 5, 1, { element: 'fire' });
    eq(a.p.alive, saved, `c11B: a los ${wait} s ${saved ? 'vuelve a salvarte' : 'aún no'}`);
  }
  const b = cls({});
  b.p.takeDamage(b.p.stats.maxHP * 5, 1, { element: 'fire' });
  ok(!b.p.alive, 'sin c11B el golpe mata');
}
// c16A Armonía Elemental · c16B Pureza Elemental (el Dardo cuenta como hechizo Arcano)
{
  const h = cls({ c16: 1 }, { c16: 'A' });
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.aim(4, 0);
  const add = () => firePower('condAdd', h.p, h.p, e, {});
  cast(h, 'rmb', 'bola_fuego', 1.2);
  eq(add(), 0, 'c16A: el primer hechizo no cambia nada');
  cast(h, 'lmb', 'm_dardo', 1.2);
  eq(add(), 8, 'c16A: Fuego → Arcano: +8 %');
  cast(h, 'rmb', 'nova_hielo', 0.1);
  eq(add(), 16, 'c16A: → Hielo: +16 %');
  cast(h, 'rmb', 'bola_fuego', 1.2); cast(h, 'lmb', 'm_dardo', 1.2);
  eq(add(), 24, 'c16A: hasta 3 veces');
  h.tick(5.2);
  eq(add(), 0, 'c16A: cada una dura 5 s');
  const p = cls({ c16: 1 }, { c16: 'B' });
  p.enemy({ hp: 1e7, pos: [4, 0, 0] });
  p.aim(4, 0);
  const pf = elem => firePower('condAdd', p.p, p.p, null, { elem });
  cast(p, 'rmb', 'bola_fuego', 1.6); cast(p, 'rmb', 'bola_fuego', 1.6);
  eq(pf('fire'), 0, 'c16B: dos de Fuego aún no');
  cast(p, 'rmb', 'bola_fuego', 0.4);           // preparación 0,3 s
  eq(pf('fire'), 15, 'c16B: tres de Fuego: +15 % al Fuego');
  eq(pf('arcane'), 0, 'c16B: solo a ese elemento');
  cast(p, 'lmb', 'm_dardo', 0.1);
  eq(pf('fire'), 15, 'c16B: cambiar de elemento no quita la que ya tienes');
  p.tick(6.1);
  eq(pf('fire'), 0, 'c16B: dura 6 s');
}
// c20 Escarcha Arcana (críticos que ralentizan; +15 % de crítico del Dardo contra ralentizados)
{
  const h = cls({ c20: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 10 });
  ok(!(e.slowT > 0), 'c20: sin crítico no ralentiza');
  eq(firePower('condCrit', h.p, h.p, e, { skill: 'm_dardo' }), 0, 'c20: sin ralentizar, sin crítico extra');
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(e.slowT >= 2 - 1e-6 && e.slowPct === 30, 'c20: un crítico ralentiza un 30 % 2 s');
  eq(firePower('condCrit', h.p, h.p, e, { skill: 'm_dardo' }), 15, 'c20: +15 % de crítico del Dardo contra ralentizados');
  eq(firePower('condCrit', h.p, h.p, e, { skill: 'bola_fuego' }), 0, 'c20: solo el Dardo');
  // decisión del dueño (M1): como mucho 1 vez cada 4 s POR ENEMIGO (otro enemigo, aparte)
  h.tick(2.5);
  ok(!(e.slowT > 0), 'c20: la ralentización acaba a los 2 s');
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(!(e.slowT > 0), 'c20: otro crítico antes de 4 s no lo vuelve a ralentizar (1 vez cada 4 s por enemigo)');
  const e2 = h.enemy({ hp: 1e6, pos: [3, 0, 1] });
  h.hit(e2, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(e2.slowT > 0, 'c20: el enfriamiento es por enemigo (otro sí se ralentiza)');
  h.tick(1.4);
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(!(e.slowT > 0), 'c20: a los 3,9 s, todavía no');
  h.tick(0.1);
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(e.slowT > 0 && e.slowPct === 30, 'c20: a los 4 s, otro crítico lo vuelve a ralentizar');
}
// c20 + c21 (revisión de M1): Escarcha Tenaz alarga la ralentización a 4 s y la espera lo mismo
// (1 vez cada 6 s por enemigo): si no, con 4 s de espera, quedaba puesta siempre
{
  const h = cls({ c20: 1, c21: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(e.slowT >= 4 - 1e-6, `c20 + c21: la ralentización dura 4 s (${e.slowT})`);
  h.tick(4.1);
  ok(!(e.slowT > 0), 'c20 + c21: acaba a los 4 s');
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(!(e.slowT > 0), 'c20 + c21: un crítico justo al acabar no la vuelve a poner');
  h.tick(1.8);
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(!(e.slowT > 0), 'c20 + c21: a los 5,9 s, todavía no');
  h.tick(0.1);
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  ok(e.slowT >= 4 - 1e-6, 'c20 + c21: a los 6 s, sí (4 s ralentizado de cada 6)');
}
// c23 Ritmo Arcano: crítico del Dardo → −0,5 × rango s a Parpadeo y a la Barrera (solo esas dos)
{
  const h = cls({ c23: 2 });
  h.p.cds.m_parpadeo = 5; h.p.cds.m_barrera = 5; h.p.cds.nova_hielo = 5;
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'm_dardo', dealt: 10, tags: ['basic', 'proj', 'arcane'] });
  eq(h.p.cds.m_parpadeo, 5, 'c23: sin crítico, nada');
  h.hit(e, { skill: 'm_dardo', dealt: 10, crit: true, tags: ['basic', 'proj', 'arcane'] });
  h.hit(e, { skill: 'm_dardo', dealt: 10, crit: true, tags: ['basic', 'proj', 'arcane'] });
  near(h.p.cds.m_parpadeo, 4, 1e-6, 'c23 r2: Parpadeo −1 s (una vez por instante)');
  near(h.p.cds.m_barrera, 4, 1e-6, 'c23 r2: Barrera −1 s');
  eq(h.p.cds.nova_hielo, 5, 'c23: no la Nova');
  h.p.simT += 0.1;
  h.hit(e, { skill: 'bola_fuego', dealt: 10, crit: true });
  near(h.p.cds.m_parpadeo, 4, 1e-6, 'c23: el crítico de otra habilidad no cuenta');
  const r1 = cls({ c23: 1 });
  r1.p.cds.m_parpadeo = 5;
  r1.hit(r1.enemy({ hp: 1e6, pos: [3, 0, 0] }), { skill: 'm_dardo', dealt: 10, crit: true });
  near(r1.p.cds.m_parpadeo, 4.5, 1e-6, 'c23 r1: −0,5 s');
  // con una especialización, la movilidad y las defensas del kit o de los talentos no se recargan
  const k = H({ spec: 'piromante', talents: { cls: { c23: 2, c11: 1 }, choice: { c11: 'A' } } });
  ok(isKnown(k.p, sk(k, 'm_t_bloque')) && isKnown(k.p, sk(k, 'm_estela_ignea')), 'c23: la Piromante conoce la Estela Ígnea y el Bloque de Hielo');
  k.p.cds.m_parpadeo = 5; k.p.cds.m_estela_ignea = 5; k.p.cds.m_t_bloque = 50;
  k.hit(k.enemy({ hp: 1e6, pos: [3, 0, 0] }), { skill: 'm_dardo', dealt: 10, crit: true, tags: ['basic', 'proj', 'arcane'] });
  near(k.p.cds.m_parpadeo, 4, 1e-6, 'c23: con la Piromante, Parpadeo sí');
  eq(k.p.cds.m_estela_ignea, 5, 'c23: la Estela Ígnea (kit de la Piromante) no se recarga');
  eq(k.p.cds.m_t_bloque, 50, 'c23: el Bloque de Hielo tampoco');
}
// c25 Cristal de Barrera: al ROMPERSE (no al caducar) estalla
{
  const h = cls({ c25: 3 });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  cast(h, 'k2', 'm_barrera', 0.2);
  h.p.mp = 0;
  h.p.takeDamage(h.p.shields[0].amt * 0.5, 1, { element: 'fire' });
  eq(h.p.mp, 0, 'c25: mientras aguanta, nada');
  const x0 = e.pos.x;
  h.p.takeDamage(h.p.stats.maxMP * 2, 1, { element: 'fire' });
  near(h.p.mp, h.p.stats.maxMP * 0.3, 1, 'c25 r3: devuelve el 30 % del maná');
  ok(e.pos.x > x0 + 1 && e.slowT > 0 && e.slowPct === 40, 'c25: empuja y ralentiza un 40 %');
  // si caduca no estalla: el maná es el mismo que sin el nodo (solo la regeneración). A Nv70 la
  // Barrera lleva su Mejora de la forja (Burbuja Estable, 8 → 10 s)
  const expire = ranks => {
    const c = cls(ranks);
    const dur = prof(c, 'm_barrera').dur;
    eq(dur, 10, 'la Barrera con Burbuja Estable dura 10 s');
    cast(c, 'k2', 'm_barrera', 0.1); c.p.mp = 0;
    c.tick(dur - 0.5);
    ok(c.p.shields.some(s => s.src === 'm_barrera'), 'la Barrera aguanta hasta su final');
    c.tick(1);
    ok(!c.p.shields.length, 'la Barrera caducó');
    return c.p.mp;
  };
  near(expire({ c25: 1 }), expire({}), 1e-6, 'c25: si caduca no estalla');
}
// c26 Torrente de Maná: 60 de maná en 3 s → Sobrecarga (+4 + 8 × rango %)
{
  for (const rank of [1, 3]) {
    const h = cls({ c26: rank });
    h.enemy({ hp: 1e7, pos: [4, 0, 0] }); h.aim(4, 0);
    cast(h, 'rmb', 'nova_hielo', 0.1);               // 25
    cast(h, 'rmb', 'bola_fuego', 0.5);               // 18 → 43
    ok(!h.p.buffs.some(b => b.id === 'm_torrente'), `c26 r${rank}: 43 de maná aún no`);
    h.p.cds.bola_fuego = 0;
    cast(h, 'rmb', 'bola_fuego', 0.4);               // 61
    const b = h.p.buffs.find(x => x.id === 'm_torrente');
    ok(b && b.stats.dmgPct === 4 + 8 * rank && b.t <= 4, `c26 r${rank}: Sobrecarga +${4 + 8 * rank} % 4 s`);
  }
  const s = cls({ c26: 1 });
  s.enemy({ hp: 1e7, pos: [4, 0, 0] }); s.aim(4, 0);
  cast(s, 'rmb', 'nova_hielo', 3.2); cast(s, 'rmb', 'bola_fuego', 0.5); s.p.cds.bola_fuego = 0; cast(s, 'rmb', 'bola_fuego', 0.1);
  ok(!s.p.buffs.some(b => b.id === 'm_torrente'), 'c26: en más de 3 s no cuenta');
}
// c28 Bastión Arcano (final): no caduca, vuelve sola a los 20 s de romperse y abarata con ella
{
  const h = cls({ c28: 3 });
  const nova0 = prof(h, 'nova_hielo').cost;
  cast(h, 'k2', 'm_barrera', 0.2);
  ok(h.p.shields[0].t > 1e5, 'c28: la Barrera ya no caduca');
  eq(prof(h, 'nova_hielo').cost, Math.round(nova0 * 0.7), 'c28 r3: con ella, −30 % de coste');
  h.p.takeDamage(h.p.shields[0].amt * 2, 1, { element: 'fire' });
  ok(h.p.alive, 'c28: el golpe rompe la Barrera sin matar');
  h.tick(0.2);
  ok(!h.p.shields.length && prof(h, 'nova_hielo').cost === nova0, 'c28: rota, sin rebaja');
  h.p.hp = h.p.stats.maxHP;
  h.tick(19.5);
  ok(!h.p.shields.length, 'c28: aún no vuelve');
  h.tick(0.7);
  ok(h.p.shields.some(s => s.src === 'm_barrera' && s.amt > 0), 'c28: vuelve sola a los 20 s');
  const r1 = cls({ c28: 1 });
  cast(r1, 'k2', 'm_barrera', 0.2);
  eq(prof(r1, 'nova_hielo').cost, Math.round(nova0 * 0.9), 'c28 r1: −10 %');
  const b = cls({});
  cast(b, 'k2', 'm_barrera', 0.2);
  ok(b.p.shields[0].t <= prof(b, 'm_barrera').dur, 'sin c28 la Barrera caduca (10 s con la Mejora)');
}
// c29 Archimaga (final): cada 4.ª principal se repite gratis al 20 + 20 × rango %
{
  for (const rank of [1, 3]) {
    const h = cls({ c29: rank });
    const echoes = spyFree(h);
    h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    for (let i = 0; i < 4; i++) { cast(h, 'rmb', 'nova_hielo', 0.1); h.p.cds.nova_hielo = 0; h.p.mp = h.p.stats.maxMP; }
    h.step(0.4);
    same(echoes.map(x => [x.id, x.mult, x.ok]), [['nova_hielo', (20 + 20 * rank) / 100, true]], `c29 r${rank}: una copia de la 4.ª al ${20 + 20 * rank} %`);
  }
  const b = cls({ c29: 1 });
  const echoes = spyFree(b);
  for (let i = 0; i < 4; i++) cast(b, 'k1', 'm_parpadeo', 0.1), b.p.cds.m_parpadeo = 0;
  b.step(0.4);
  eq(echoes.length, 0, 'c29: solo las habilidades principales');
}
// c30 Paso del Vacío (final): tras Parpadeo, la siguiente principal no se recarga y hace +15 % × rango
{
  const h = cls({ c30: 2 });
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  cast(h, 'rmb', 'nova_hielo', 0.1);
  ok(h.p.cds.nova_hielo > 3, 'c30: sin Parpadeo, la Nova se recarga');
  h.p.cds.nova_hielo = 0;
  h.aim(-4, 0);
  cast(h, 'k1', 'm_parpadeo', 0.1);
  e.pos.set(h.p.pos.x + 1.5, 0, 0);
  const log = spy(h);
  cast(h, 'rmb', 'nova_hielo', 0.1);
  eq(h.p.cds.nova_hielo || 0, 0, 'c30: tras Parpadeo, la siguiente principal no se recarga');
  ok(from(log, 'nova_hielo').length > 0, 'la Nova golpea');
  eq(firePower('condAdd', h.p, h.p, e, { skill: 'nova_hielo' }), 0, 'c30: el bono se gasta con ella');
  cast(h, 'rmb', 'nova_hielo', 0.1);
  ok(h.p.cds.nova_hielo > 3, 'c30: solo la siguiente');
  // el +30 % (rango 2) se aplica a los golpes de esa principal
  const v = cls({ c30: 2 });
  v.aim(-4, 0);
  cast(v, 'k1', 'm_parpadeo', 0.1);
  firePower('onCast', v.p, v.g, v.p, { sk: sk(v, 'nova_hielo'), prof: prof(v, 'nova_hielo'), slot: 'rmb' });
  eq(firePower('condAdd', v.p, v.p, null, { skill: 'nova_hielo' }), 30, 'c30 r2: +30 % a esa principal');
}
// c3 Reflejos Arcanos (Parpadeo 12 → 10 → 8 s) · c18 Barrera Reforzada (+25 % por rango)
{
  const b = cls({});
  near(prof(b, 'm_parpadeo').cd, 12, 1e-9, 'Parpadeo: 12 s');
  near(prof(cls({ c3: 1 }), 'm_parpadeo').cd, 10, 1e-9, 'c3 r1: 10 s');
  near(prof(cls({ c3: 2 }), 'm_parpadeo').cd, 8, 1e-9, 'c3 r2: 8 s');
  const r = cls({ c18: 2 });
  cast(b, 'k2', 'm_barrera', 0.1); cast(r, 'k2', 'm_barrera', 0.1);
  near(r.p.shields[0].amt / b.p.shields[0].amt, 1.5, 0.01, 'c18 r2: la Barrera absorbe un 50 % más');
}
console.log('✓ árbol de clase: cada nodo con efecto propio');

// ------------------------------------------------------------ 3) PARAGON
// Cronomante · t0 Marca del Tiempo y t1/t2/t8A/t7 (lo que repite)
{
  const mark = (nodes, choice, hits, wait) => {
    const h = hero('crono', nodes, choice);
    const log = spy(h);
    const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
    for (const d of hits) h.hit(e, { skill: 'bola_fuego', dealt: d });
    h.tick(wait);
    return { h, e, rep: from(log, null, e).filter(x => x.source === 'power:m_marca_tiempo').map(x => x.dealt) };
  };
  const base = mark({}, {}, [100, 100], 4.2);
  same(base.rep, [60], 't0: al acabar (4 s), repite el 30 % de lo que le hiciste');
  eq(mark({}, {}, [100, 100], 3.8).rep.length, 0, 't0: antes de 4 s, nada');
  eq(mark({ t1: 1 }, {}, [100, 100], 5.8).rep.length, 0, 't1: la Marca dura 6 s');
  same(mark({ t1: 1 }, {}, [100, 100], 6.2).rep, [60], 't1: … y repite a los 6 s');
  same(mark({ t2: 1 }, { t2: 'A' }, [100, 100], 4.2).rep, [90], 't2A: repite el 45 %');
  same(mark({ t8: 1 }, { t8: 'A' }, [100, 100], 4.2).rep, [90], 't8A: el golpe que la pone cuenta doble');
  // la Marca no cuenta el daño de otra Marca; sí procs y DoT de otros poderes
  const h = hero('crono');
  const log = spy(h);
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 100 });
  h.hit(e, { skill: null, dealt: 50, proc: true });
  h.tick(4.2);
  same(from(log, null, e).filter(x => x.source === 'power:m_marca_tiempo').map(x => x.dealt), [45], 't0: cuenta los procs (150 × 30 %)');
  h.hit(e, { skill: null, dealt: 80, proc: true });
  h.tick(4.2);
  eq(from(log, null, e).filter(x => x.source === 'power:m_marca_tiempo').length, 1, 't0: un proc no pone la Marca (la pone un golpe directo)');
  // t7 Bucle: cada 4.ª Marca que termina se repite dos veces (3 → 3; 4 → 5; 8 → 10)
  const loopRun = n => {
    const loop = hero('crono', { t7: 1 });
    const ll = spy(loop);
    const foes = Array.from({ length: n }, (_, i) => loop.enemy({ hp: 1e7, pos: [2 + (i % 4) * 3, 0, Math.floor(i / 4) * 3] }));
    for (const f of foes) { loop.hit(f, { skill: 'bola_fuego', dealt: 100 }); loop.tick(0.3); }
    loop.tick(4.5);
    return ll.filter(x => x.source === 'power:m_marca_tiempo').length;
  };
  eq(loopRun(3), 3, 't7: 3 Marcas, 3 repeticiones (aún no llega la 4.ª)');
  eq(loopRun(4), 5, 't7: 4 Marcas, 5 repeticiones');
  eq(loopRun(8), 10, 't7: 8 Marcas, 10 repeticiones (la 4.ª y la 8.ª)');
}
// t2B Marca Contagiosa · t6 Paradoja · t11 Momento Exacto · t10 Aceleración · t9 Grieta Temporal
{
  const c = hero('crono', { t2: 1 }, { t2: 'B' });
  const e = c.enemy({ hp: 1e7, pos: [3, 0, 0] }), a = c.enemy({ hp: 1e7, pos: [4, 0, 0] }), b = c.enemy({ hp: 1e7, pos: [5, 0, 0] }), z = c.enemy({ hp: 1e7, pos: [6, 0, 0] });
  c.hit(e, { skill: 'bola_fuego', dealt: 100 });
  c.tick(4.2);
  const marks = powerState(c.p, 'm_marca_tiempo').marks;
  ok(marks.has(a) && marks.has(b) && !marks.has(z) && !marks.has(e), 't2B: al terminar, la Marca pasa a 2 enemigos cercanos');
  const nb = hero('crono');
  const e2 = nb.enemy({ hp: 1e7, pos: [3, 0, 0] }), a2 = nb.enemy({ hp: 1e7, pos: [4, 0, 0] });
  nb.hit(e2, { skill: 'bola_fuego', dealt: 100 });
  nb.tick(4.2);
  ok(!powerState(nb.p, 'm_marca_tiempo').marks.has(a2), 'sin t2B no pasa');
  // t6 Paradoja: muere marcado → la Marca (con lo guardado) pasa al más cercano
  const px = hero('crono', { t6: 1 });
  const lg = spy(px);
  const v = px.enemy({ hp: 1e7, pos: [3, 0, 0] }), w = px.enemy({ hp: 1e7, pos: [5, 0, 0] });
  px.hit(v, { skill: 'bola_fuego', dealt: 200 });
  px.tick(1);
  v.takeDamage(1e8, false, {});
  px.tick(0.2);
  const m = powerState(px.p, 'm_marca_tiempo').marks.get(w);
  ok(m && m.stored >= 200, 't6: la Marca pasa al más cercano con lo que llevaba');
  px.tick(3.5);
  ok(from(lg, null, w).some(x => x.source === 'power:m_marca_tiempo' && x.dealt >= 60), 't6: … y repite sobre él');
  const np = hero('crono');
  const v2 = np.enemy({ hp: 1e7, pos: [3, 0, 0] }), w2 = np.enemy({ hp: 1e7, pos: [5, 0, 0] });
  np.hit(v2, { skill: 'bola_fuego', dealt: 200 }); v2.takeDamage(1e8, false, {}); np.tick(0.2);
  ok(!powerState(np.p, 'm_marca_tiempo').marks.has(w2), 'sin t6 se pierde');
  // t11 Momento Exacto: cada crítico alarga 1 s (hasta 3 s)
  const mx = hero('crono', { t11: 1 });
  const me = mx.enemy({ hp: 1e7, pos: [3, 0, 0] });
  mx.hit(me, { skill: 'bola_fuego', dealt: 10 });
  const u0 = powerState(mx.p, 'm_marca_tiempo').marks.get(me).until;
  for (let i = 0; i < 5; i++) mx.hit(me, { skill: 'bola_fuego', dealt: 10, crit: true });
  near(powerState(mx.p, 'm_marca_tiempo').marks.get(me).until - u0, 3, 1e-9, 't11: los críticos alargan la Marca hasta 3 s');
  // t10 Aceleración (3 o más Marcas) · t9 Grieta Temporal (3 terminan a la vez)
  const ac = hero('crono', { t10: 1, t9: 1 });
  const three = [0, 1, 2].map(i => ac.enemy({ hp: 1e7, pos: [2, 0, i - 1] }));
  const asp0 = ac.p.stats.aspdPct;
  ac.hit(three[0], { skill: 'bola_fuego', dealt: 10 }); ac.hit(three[1], { skill: 'bola_fuego', dealt: 10 });
  ac.tick(0.2);
  eq(ac.p.stats.aspdPct, asp0, 't10: con 2 Marcas, nada');
  ac.hit(three[2], { skill: 'bola_fuego', dealt: 10 });
  ac.tick(0.2);
  eq(ac.p.stats.aspdPct - asp0, 12, 't10: con 3 Marcas, +12 % de lanzamiento');
  ac.tick(4.4);
  ok(!(ac.g.fields || []).some(f => f.kind === 'm_grieta'), 't9: 3 Marcas que terminan en momentos distintos no abren grieta');
  const rift = n => {
    const h = hero('crono', n);
    const foes = [0, 1, 2].map(i => h.enemy({ hp: 1e7, pos: [2, 0, i - 1] }));
    for (const f of foes) h.hit(f, { skill: 'nova_hielo', dealt: 10 });      // un golpe de área: a la vez
    h.tick(4.1);
    return { h, foes, f: (h.g.fields || []).find(x => x.kind === 'm_grieta') };
  };
  const r = rift({ t9: 1 });
  ok(r.f && Math.abs(r.f.pos.x - 2) < 0.6, 't9: 3 Marcas que terminan a la vez abren una grieta entre ellas');
  for (const f of r.foes) f.slowT = 0;
  r.h.tick(0.6);
  ok(r.foes.every(f => f.slowT > 0 && f.slowPct === 30), 't9: la grieta ralentiza un 30 %');
  r.h.tick(2.6);
  ok(!r.h.g.fields.some(f => f.kind === 'm_grieta' && !f.dead), 't9: dura 3 s');
  ok(!rift({}).f, 'sin t9 no hay grieta');
}
// t3 Prisa Temporal · t5 Segundos Robados · t8B Memoria · t4B Retroceso · t12 Señora del Tiempo
{
  const h = hero('crono', { t3: 1, t5: 1, t8: 1 }, { t8: 'B' });
  const ult = h.p.cls.skills.find(s => s.cat === 'ultimate' && isKnown(h.p, s));
  h.p.cds[ult.id] = 10;
  h.p.hp = h.p.stats.maxHP * 0.5;
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 1000 });
  const hp0 = h.p.hp;
  h.tick(4.2);
  const pt = h.p.buffs.find(b => b.id === 'm_prisa_temporal');
  ok(pt && pt.stats.aspdPct === 10, 't3: +10 % de lanzamiento al terminar una Marca');
  near(h.p.cds[ult.id], 10 - 4.2 - 1, 0.15, `t5: la definitiva (${ult.id}) se recarga 1 s antes`);
  ok(h.p.hp - hp0 >= 300 * 0.03 - 1 && h.p.hp - hp0 <= 300 * 0.03 + 5, 't8B: te curas el 3 % de lo repetido');
  // t4B Retroceso
  const r = hero('crono', { t4: 1 }, { t4: 'B' });
  r.tick(3.5);
  r.p.takeDamage(r.p.stats.maxHP * 0.55, 1, { element: 'fire', unavoidable: true });
  ok(r.p.hp > r.p.stats.maxHP * 0.4 && r.p.hp < r.p.stats.maxHP * 0.5, 't4B: entre el 40 y el 50 %, nada');
  r.p.takeDamage(r.p.stats.maxHP * 0.1, 1, { element: 'fire', unavoidable: true });
  ok(r.p.hp > r.p.stats.maxHP * 0.95, 't4B: al bajar del 40 %, vuelves a la vida de hace 3 s');
  r.p.takeDamage(r.p.stats.maxHP * 0.7, 1, { element: 'fire', unavoidable: true });
  ok(r.p.hp < r.p.stats.maxHP * 0.4, 't4B: una vez cada 90 s');
  const nr = hero('crono');
  nr.tick(3.5);
  nr.p.takeDamage(nr.p.stats.maxHP * 0.7, 1, { element: 'fire', unavoidable: true });
  ok(nr.p.hp < nr.p.stats.maxHP * 0.4, 'sin t4B no vuelves');
  // t12 Señora del Tiempo: la principal para el reloj 5 s; luego, todas al 100 %
  const s = hero('crono', { t12: 1 });
  const ls = spy(s);
  const foe = s.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  s.hit(foe, { skill: 'bola_fuego', dealt: 100 });
  cast(s, 'rmb', 'nova_hielo', 0.1);
  const stored = powerState(s.p, 'm_marca_tiempo').marks.get(foe).stored;
  s.tick(4.5);
  eq(ls.filter(x => x.source === 'power:m_marca_tiempo').length, 0, 't12: con el reloj parado, la Marca no termina');
  s.tick(0.6);
  near(sum(ls.filter(x => x.source === 'power:m_marca_tiempo')), stored, 1, 't12: … y luego repite el 100 %');
  s.p.cds.nova_hielo = 0; s.hit(foe, { skill: 'bola_fuego', dealt: 100 }); cast(s, 'rmb', 'nova_hielo', 0.1);
  eq(powerState(s.p, 'm_marca_tiempo').stopUntil < s.p.simT + 1e-6, true, 't12: cada 30 s');
}
// t4A Detener el Tiempo (activa de KA1): las Marcas de los enemigos a 8 m guardan el doble 3 s
{
  const h = hero('crono');
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), far = h.enemy({ hp: 1e7, pos: [12, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 100 }); h.hit(far, { skill: 'bola_fuego', dealt: 100 });
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_detener' }, prof: { dur: 3 }, slot: 'k2' }, {});
  h.hit(e, { skill: 'bola_fuego', dealt: 100 }); h.hit(far, { skill: 'bola_fuego', dealt: 100 });
  const marks = powerState(h.p, 'm_marca_tiempo').marks;
  eq(marks.get(e).stored, 300, 't4A: dentro de 8 m guarda el doble');
  eq(marks.get(far).stored, 200, 't4A: fuera, normal');
  h.tick(3.1);
  h.hit(e, { skill: 'bola_fuego', dealt: 100 });
  ok(!marks.get(e) || marks.get(e).stored < 500, 't4A: dura 3 s');
}
// Invocadora · f0 Familiar Arcano: dispara cada 1,5 s al 50 % con tu último elemento
{
  const shots = (nodes = {}, choice = {}, opts = {}) => {
    const h = hero('invoca', nodes, choice, opts);
    const log = spy(h);
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    return { h, log, e, shots: () => from(log, 'm_familiar') };
  };
  const a = shots();
  a.h.tick(1.4);
  eq(a.shots().length, 0, 'f0: el primer disparo, a los 1,5 s');
  a.h.tick(0.2);
  eq(a.shots().length, 1, 'f0: dispara');
  ok(a.shots()[0].proc && a.shots()[0].elem === 'arcane', 'f0: daño de poder Arcano (sin hechizos: Arcano)');
  a.h.tick(4.5);
  eq(a.shots().length, 4, 'f0: cada 1,5 s');
  const fire = shots();
  fire.h.aim(4, 0);
  cast(fire.h, 'rmb', 'bola_fuego', 0.1);
  fire.h.tick(1.6);
  ok(fire.shots().some(x => x.elem === 'fire') && fire.h.g.dotsOf(fire.e, 'burn').some(d => d.source === 'm_familiar:burn'), 'f0: tras un hechizo de Fuego, dispara Fuego y quema');
  const frost = shots();
  cast(frost.h, 'rmb', 'nova_hielo', 0.1);
  frost.e.slowT = 0;
  frost.h.tick(1.6);
  ok(frost.shots().some(x => x.elem === 'frost') && frost.e.slowT > 0, 'f0: con Hielo, frena');
  // f1 Vínculo · f10 Constructo Templado · f2A Gran Constructo · f2B Enjambre
  const v = shots({ f1: 1 });
  v.h.tick(0.1);
  near(powerState(v.h.p, 'm_familiar').maxHp, v.h.p.stats.maxHP * 0.3 * 1.5, 1, 'f1: +50 % de vida');
  // maná del primer disparo: lo ganado en 1,6 s con un enemigo menos lo ganado sin blanco (regeneración)
  const shotMana = (nodes, foe = true) => {
    const h = hero('invoca', nodes);
    if (foe) h.enemy({ hp: 1e7, pos: [4, 0, 0] });
    h.p.mp = 0; h.tick(1.6);
    return h.p.mp;
  };
  near(shotMana({}) - shotMana({}, false), 3, 0.01, 'f0: el disparo Arcano da 3 de maná');
  near(shotMana({ f1: 1 }) - shotMana({ f1: 1 }, false), 5, 0.01, 'f1: cada disparo da 2 de maná más');
  const dmgOf = (nodes, choice) => { const s = shots(nodes, choice); s.h.tick(1.6); return s.shots()[0].dealt; };
  const d0 = dmgOf({}, {});
  near(dmgOf({ f10: 1 }, {}) / d0, 1.2, 0.03, 'f10: +20 % de daño');
  near(dmgOf({ f2: 1 }, { f2: 'A' }) / d0, 1.8, 0.03, 'f2A: +80 % de daño');
  const big = shots({ f2: 1 }, { f2: 'A' });
  big.h.tick(1.5 * 4 + 0.1);
  ok(!(big.e.stunT > 0), 'f2A: los 4 primeros no aturden');
  big.h.tick(1.5);
  ok(big.e.stunT > 0, 'f2A: el 5.º disparo aturde');
  const sw = shots({ f2: 1 }, { f2: 'B' });
  const others = [sw.h.enemy({ hp: 1e7, pos: [0, 0, 4] }), sw.h.enemy({ hp: 1e7, pos: [-4, 0, 0] })];
  sw.h.tick(1.6);
  eq(powerState(sw.h.p, 'm_familiar').fams.length, 3, 'f2B: tres Familiares');
  eq(new Set(sw.shots().map(x => x.e)).size, 3, 'f2B: cada uno a un enemigo distinto');
  near(sw.shots()[0].dealt / d0, 0.8, 0.1, 'f2B: cada uno hace el 40 % (frente al 50 %)');
  void others;
}
// f3 Imitación · f4A Guardián · f6 Detonar · f4B Cazador · f5 Sobrecarga · f8B Fragua · f9 Eco · f11 Hilo
{
  const im = hero('invoca', { f3: 1 });
  const echoes = spyFree(im);
  const ult = im.p.cls.skills.find(s => s.cat === 'ultimate' && isKnown(im.p, s));
  im.enemy({ hp: 1e7, pos: [3, 0, 0] }); im.aim(3, 0); im.tick(0.1);
  cast(im, 'k4', ult.id, 2);                         // la Supernova acaba al estallar (~1,2 s)
  ok(echoes.some(x => x.id === ult.id && x.mult === 0.25 && x.ok), 'f3: al usar la definitiva, el Familiar lanza una copia al 25 %');
  const gd = hero('invoca', { f4: 1, f6: 1 }, { f4: 'A' });
  const lg = spy(gd);
  gd.tick(0.1);
  const st = powerState(gd.p, 'm_familiar');
  const hp0 = gd.p.hp;
  gd.p.takeDamage(100, 1, { element: 'fire', unavoidable: true });
  const base = hero('invoca');
  base.tick(0.1);
  const bh0 = base.p.hp;
  base.p.takeDamage(100, 1, { element: 'fire', unavoidable: true });
  near((hp0 - gd.p.hp) / (bh0 - base.p.hp), 0.85, 0.02, 'f4A: el Familiar recibe el 15 % del daño');
  ok(st.hp < st.maxHp, 'f4A: … y lo pierde de su vida');
  // golpes hasta que el Familiar cae (la Maga se cura entre uno y otro: no muere)
  const knockOut = h => {
    const s = powerState(h.p, 'm_familiar');
    for (let i = 0; i < 60 && s.fams.length; i++) { h.p.takeDamage(h.p.stats.maxHP * 0.4, 1, { element: 'fire' }); h.p.hp = h.p.stats.maxHP; }
    return s;
  };
  const near1 = gd.enemy({ hp: 1e7, pos: [2.5, 0, 0] });
  knockOut(gd);
  ok(gd.p.alive && !st.fams.length, 'f4A: si su vida se agota, cae');
  ok(from(lg, 'm_familiar', near1).some(x => x.dealt > 0), 'f6: al caer, estalla');
  gd.tick(4.7);
  ok(!st.fams.length, 'f6: vuelve a los 5 s (aún no)');
  gd.tick(0.5);
  ok(st.fams.length === 1 && st.hp === st.maxHp, 'f6: vuelve a los 5 s con la vida llena');
  const g6 = hero('invoca', { f4: 1 }, { f4: 'A' });
  const l6 = spy(g6);
  g6.tick(0.1);
  const n6 = g6.enemy({ hp: 1e7, pos: [2.5, 0, 0] });
  const s6 = knockOut(g6);
  ok(!s6.fams.length && !from(l6, 'm_familiar', n6).length, 'sin f6 cae sin estallar');
  g6.tick(5.2);
  ok(!s6.fams.length, 'sin f6 tarda 10 s en volver');
  g6.tick(5);
  eq(s6.fams.length, 1, 'sin f6 vuelve a los 10 s');
  const hu = hero('invoca', { f4: 1 }, { f4: 'B' });
  const lh = spy(hu);
  const small = hu.enemy({ hp: 1000, pos: [2, 0, 0] }), fat = hu.enemy({ hp: 9e6, pos: [5, 0, 0] });
  hu.tick(1.6);
  ok(from(lh, 'm_familiar').every(x => x.e === fat) && fat.debuffs?.m_cazador?.pct === 10, 'f4B: persigue al de más vida y le pone +10 %');
  ok(!from(lh, 'm_familiar').some(x => x.e === small), 'f4B: no al más cercano');
  const so = hero('invoca', { f5: 1 });
  const ls = spy(so);
  so.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  so.tick(0.1);
  cast(so, 'rmb', 'nova_hielo', 0);
  so.tick(2.4);                                      // 1,5 s → 1,15 s: 2 disparos frente a 1
  const nso = hero('invoca');
  const ln = spy(nso);
  nso.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  nso.tick(0.1);
  cast(nso, 'rmb', 'nova_hielo', 0);
  nso.tick(2.4);
  same([from(ls, 'm_familiar').length, from(ln, 'm_familiar').length], [2, 1], 'f5: tras una principal, el Familiar dispara un 30 % más rápido');
  const fr = hero('invoca', { f8: 1 }, { f8: 'B' });
  const lf = spy(fr);
  fr.enemy({ hp: 1e7, pos: [4, 0, 0] }); fr.aim(4, 0);
  cast(fr, 'rmb', 'bola_fuego', 0.4); cast(fr, 'lmb', 'm_dardo', 0.1); cast(fr, 'rmb', 'nova_hielo', 0.1);
  fr.tick(1.4);
  const nfr = hero('invoca');
  const lnf = spy(nfr);
  nfr.enemy({ hp: 1e7, pos: [4, 0, 0] }); nfr.aim(4, 0);
  cast(nfr, 'rmb', 'bola_fuego', 0.4); cast(nfr, 'lmb', 'm_dardo', 0.1); cast(nfr, 'rmb', 'nova_hielo', 0.1);
  nfr.tick(1.4);
  near(from(lf, 'm_familiar')[0].dealt / from(lnf, 'm_familiar')[0].dealt, 1.15, 0.03, 'f8B: +5 % por habilidad distinta (3 → +15 %)');
  // tope: +25 % (5 habilidades distintas en 8 s); la 6.ª ya no suma. Lanzamientos sintéticos (⑦):
  // el enemigo al que dispara el Familiar está igual en todas las pruebas
  const forgeN = k => {
    const x = hero('invoca', { f8: 1 }, { f8: 'B' });
    const lx = spy(x);
    x.enemy({ hp: 1e7, pos: [4, 0, 0] });
    for (const id of ['bola_fuego', 'nova_hielo', 'k_lanza', 'k_prision', 'm_barrera', 'm_parpadeo'].slice(0, k))
      firePower('onCast', x.p, x.g, x.p, { sk: { id }, prof: { coef: 0 } });
    x.tick(1.6);
    const shot = from(lx, 'm_familiar')[0];
    ok(shot, `el Familiar dispara después de ${k} habilidades`);
    return shot.raw;
  };
  const f0 = forgeN(0), f4 = forgeN(4), f5 = forgeN(5), f6 = forgeN(6);
  near(f5 / f0 - 1, (f4 / f0 - 1) * 5 / 4, 0.005, `f8B: cada habilidad distinta suma lo mismo (${f0} → ${f4} → ${f5})`);
  eq(f6, f5, 'f8B: hasta +25 % (la 6.ª ya no suma)');
  // f8A Llamar Constructo (activa de KA1, Nv74): la concede el nodo y, lanzada por el canal real,
  // los enemigos a 8 m del Constructo lo atacan a él
  const co = hero('invoca', { f8: 1 }, { f8: 'A' }, { level: 74 });
  ok(co.p.talentAgg.grants.has('m_h_constructo') && isKnown(co.p, sk(co, 'm_h_constructo')), 'f8A: conoces Llamar Constructo');
  const cfoe = co.enemy({ hp: 1e7, pos: [6, 0, 0] });
  co.aim(4, 0);
  cast(co, 'k2', 'm_h_constructo', 0.1);
  ok(cfoe.tauntSrc?.construct && cfoe.combatTarget(co.p) === cfoe.tauntSrc, 'f8A: el Constructo atrae a los enemigos a 8 m');
  const nco = hero('invoca', { f8: 1 }, { f8: 'B' }, { level: 74 });
  ok(!nco.p.talentAgg.grants.has('m_h_constructo') && !isKnown(nco.p, sk(nco, 'm_h_constructo')), 'sin f8A (con Fragua) no conoces Llamar Constructo');
  const ec = hero('invoca', { f9: 1 });
  const ee = ec.enemy({ hp: 1e7, pos: [4, 0, 0] });
  ec.tick(1.6);
  eq(gaugeValue(ec.p, 'escarcha', ee), 1, 'f9: con el Crionte, cada disparo pone 1 capa de Escarcha');
  const ne = hero('invoca');
  const ee2 = ne.enemy({ hp: 1e7, pos: [4, 0, 0] });
  ne.tick(1.6);
  eq(gaugeValue(ne.p, 'escarcha', ee2), 0, 'sin f9 no');
  const ep = hero('invoca', { f9: 1 }, {}, { spec: 'piromante' });
  ep.enemy({ hp: 1e7, pos: [4, 0, 0] });
  ep.tick(1.6);
  eq(gaugeValue(ep.p, 'calor'), 3, 'f9: con el Piromante, 3 de Calor');
  const th = hero('invoca', { f11: 1 });
  const lt = spy(th);
  th.tick(0.1);
  const fam = powerState(th.p, 'm_familiar').fams[0];
  const mid = th.enemy({ hp: 1e7, pos: [fam.pos.x / 2, 0, fam.pos.z / 2] });
  th.tick(0.5);
  ok(from(lt, 'm_familiar_hilo', mid).length > 0, 'f11: el hilo daña a quien lo cruza');
}
// f7 Aprendiz: copia la variante forjada del Dardo (con salpicadura: los disparos explotan)
{
  const forge = { m_dardo: { mejora: { name: 'Prueba', icon: 'x', line: 'x' },
    vars: [{ id: 'm_dardo_i', name: 'Prueba I', role: 'AREA', icon: 'x', line: 'x', set: { splash: 0.3, radius: 1.5 } },
      { id: 'm_dardo_ii', name: 'Prueba II', role: 'CTRL', icon: 'x', line: 'x', set: { slow: 1.5, slowPct: 20 } }] } };
  const run = (nodes, v) => {
    const h = hero('invoca', nodes, {}, { inject: { forge } });
    h.p.skillForge = { m_dardo: v };
    h.p.recompute();
    resolveSkill(h.p, sk(h, 'm_dardo'));
    const log = spy(h);
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), side = h.enemy({ hp: 1e7, pos: [4.8, 0, 0.5] });
    h.tick(1.6);
    return { log, e, side };
  };
  const a = run({ f7: 1 }, 'i');
  ok(from(a.log, 'm_familiar', a.side).length > 0, 'f7: con la variante de salpicadura, los disparos explotan');
  const n = run({}, 'i');
  eq(from(n.log, 'm_familiar', n.side).length, 0, 'sin f7 no explotan');
  const s = run({ f7: 1 }, 'ii');
  ok(s.e.slowT > 0 && s.e.slowPct === 20, 'f7: con la variante de frío, ralentizan');
}
// f12 Legión (final): cada 25 s se divide en 3 durante 8 s y copian la siguiente principal al 50 %
{
  const h = hero('invoca', { f12: 1 });
  const echoes = spyFree(h);
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.tick(0.3);
  eq(powerState(h.p, 'm_familiar').fams.length, 3, 'f12: se divide en 3');
  cast(h, 'rmb', 'nova_hielo', 0.8);
  same(echoes.map(x => [x.id, x.mult, x.ok]), Array(3).fill(['nova_hielo', 0.5, true]), 'f12: todos copian la siguiente principal al 50 %');
  h.p.cds.nova_hielo = 0; cast(h, 'rmb', 'nova_hielo', 0.8);
  eq(echoes.length, 3, 'f12: solo la siguiente');
  h.tick(7.5);
  eq(powerState(h.p, 'm_familiar').fams.length, 1, 'f12: dura 8 s');
  h.tick(17);
  eq(powerState(h.p, 'm_familiar').fams.length, 3, 'f12: cada 25 s');
  // todas las copias de un lanzamiento van en SU serie: con Archimaga (c29) en la misma Nova, 3 de
  // Legión + 1 de Archimaga = 4 piden salir y el tope del motor (echoCap 3) deja 3
  const x = hero('invoca', { f12: 1 });
  x.p.talents.cls = { c29: 1 }; x.p.recompute(); x.p.mp = x.p.stats.maxMP;
  const xe = spyFree(x);
  x.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  x.tick(0.3);
  powerState(x.p, 'm_archimaga').n = 3;            // la siguiente principal es la 4.ª
  cast(x, 'rmb', 'nova_hielo', 0.8);
  ok(xe.length === 4 && xe.filter(y => y.ok).length === 3, `c29 + f12: como mucho 3 copias por lanzamiento (${xe.map(y => `${y.mult}${y.ok ? '' : '✗'}`)})`);
}
// Escriba Rúnica · e0 runas y Sello (+15 % dentro, −10 % de daño recibido)
{
  const h = hero('escriba');
  const e = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.aim(6, 0);
  const runes = () => h.g.fields.filter(f => f.kind === 'm_runa_escrita' && !f.data.spent);
  cast(h, 'lmb', 'm_dardo', 1.2); cast(h, 'lmb', 'm_dardo', 1.2);
  eq(runes().length, 0, 'e0: dos hechizos, ninguna runa');
  cast(h, 'lmb', 'm_dardo', 1.2);
  eq(runes().length, 1, 'e0: el 3.er hechizo escribe una runa');
  eq(firePower('condAdd', h.p, h.p, e, {}), 0, 'e0: sin Sello, sin bono');
  for (let i = 0; i < 6; i++) cast(h, 'lmb', 'm_dardo', 1.2);
  const seal = h.g.fields.find(f => f.kind === 'm_sello');
  ok(seal && runes().length === 0, 'e0: tres runas cerca forman un Sello');
  eq(firePower('condAdd', h.p, h.p, e, {}), 15, 'e0: dentro haces +15 %');
  eq(firePower('condDr', h.p, h.p, {}), 10, 'e0: y recibes −10 %');
  h.p.pos.set(10, 0, 0);
  eq(firePower('condAdd', h.p, h.p, e, {}), 0, 'e0: fuera del Sello, nada');
  h.p.pos.set(seal.pos.x, 0, seal.pos.z);
  h.tick(8.2);
  ok(!h.g.fields.some(f => f.kind === 'm_sello'), 'e0: el Sello dura 8 s');
}
// e1 · e2 · e4B · e5 · e7 · e8 · e9 · e10 · e11 (con runas escritas a mano: m_h_palabra)
{
  const palabra = h => firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra', elem: 'arcane' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  const seals = h => h.g.fields.filter(f => f.kind === 'm_sello' && !f.data.replaced && f.t > 0);
  // e4A Palabra de Poder (activa de KA1): 3 runas a tu alrededor → Sello donde estás
  const w = hero('escriba');
  palabra(w);
  ok(seals(w).length === 1 && Math.hypot(seals(w)[0].pos.x, seals(w)[0].pos.z) < 0.5, 'e4A: Palabra de Poder forma un Sello donde estás');
  const t = hero('escriba', { e2: 1, e4: 1, e10: 1 }, { e2: 'A', e4: 'B' });
  palabra(t);
  eq(firePower('condAdd', t.p, t.p, null, {}), 25, 'e2A: dentro haces +25 %');
  eq(firePower('condDr', t.p, t.p, {}), 20, 'e4B: dentro recibes −20 %');
  const asp0 = t.p.stats.aspdPct;
  t.tick(0.2);
  eq(t.p.stats.aspdPct - asp0, 10, 'e10: dentro lanzas un 10 % más rápido');
  const x = hero('escriba', { e2: 1, e7: 1 }, { e2: 'B' });
  const lx = spy(x);
  const inS = x.enemy({ hp: 1e7, pos: [1, 0, 0] }), outS = x.enemy({ hp: 1e7, pos: [8, 0, 0] });
  x.p.cds.nova_hielo = 5; x.p.cds.m_parpadeo = 5;
  palabra(x);
  ok(lx.some(h => h.e === inS && h.source === 'power:m_runas') && !lx.some(h => h.e === outS && h.source === 'power:m_runas'), 'e2B: al formarse, el Sello estalla en su área');
  ok(x.p.cds.nova_hielo === 3 && x.p.cds.m_parpadeo === 3, 'e7: al formarse un Sello, tus enfriamientos −2 s');
  // el mismo Sello sin esos nodos: ni estallido, ni enfriamientos, ni Glosa, ni prisa
  const o = hero('escriba');
  const lo = spy(o);
  const oe = o.enemy({ hp: 1e7, pos: [1, 0, 0] });
  o.p.cds.nova_hielo = 5;
  const oAsp = o.p.stats.aspdPct;
  palabra(o); o.tick(0.6);
  ok(!lo.some(h => h.source === 'power:m_runas'), 'sin e2B el Sello no estalla');
  near(o.p.cds.nova_hielo, 4.4, 1e-6, 'sin e7 los enfriamientos siguen su curso');
  ok(!oe.debuffs?.m_glosa, 'sin e8A no hay Glosa');
  eq(o.p.stats.aspdPct, oAsp, 'sin e10 no lanzas más rápido');
  const r = hero('escriba', { e1: 1, e5: 1 });
  r.aim(6, 0); r.enemy({ hp: 1e7, pos: [6, 0, 0] });
  cast(r, 'lmb', 'm_dardo', 1.2); cast(r, 'lmb', 'm_dardo', 0.1);
  const rn = r.g.fields.filter(f => f.kind === 'm_runa_escrita');
  ok(rn.length === 1 && rn[0].dur === 12, 'e5: una runa cada 2 hechizos · e1: dura 12 s');
  // e8A Glosa (enemigos dentro +10 %) · e8B Círculo Protector (1 % de vida por segundo)
  const gl = hero('escriba', { e8: 1 }, { e8: 'A' });
  const ge = gl.enemy({ hp: 1e7, pos: [1, 0, 0] });
  palabra(gl); gl.tick(0.6);
  eq(ge.debuffs?.m_glosa?.pct, 10, 'e8A: los enemigos dentro reciben +10 %');
  const ci = hero('escriba', { e8: 1 }, { e8: 'B' });
  ci.p.hp = ci.p.stats.maxHP * 0.5;
  const nci = hero('escriba');
  nci.p.hp = nci.p.stats.maxHP * 0.5;
  palabra(ci); palabra(nci);
  ci.tick(3.05); nci.tick(3.05);
  near((ci.p.hp - nci.p.hp) / ci.p.stats.maxHP, 0.03, 0.006, 'e8B: dentro recuperas un 1 % de vida por segundo');
  // e9 Doble Sello
  const two = hero('escriba', { e9: 1 }), one = hero('escriba');
  palabra(two); two.p.pos.set(9, 0, 0); palabra(two);
  palabra(one); one.p.pos.set(9, 0, 0); palabra(one);
  eq(seals(two).length, 2, 'e9: 2 Sellos a la vez');
  eq(seals(one).length, 1, 'sin e9, 1');
  // e11 Palimpsesto: al acabar deja 3 runas; si sigues dentro, vuelve a formarse
  const pal = hero('escriba', { e11: 1 });
  palabra(pal); pal.tick(8.2);
  ok(seals(pal).length === 1, 'e11: si sigues dentro, el Sello vuelve a formarse');
  const away = hero('escriba', { e11: 1 });
  palabra(away); away.p.pos.set(15, 0, 0); away.tick(8.2);
  ok(!seals(away).length && away.g.fields.filter(f => f.kind === 'm_runa_escrita' && !f.data.spent).length === 3, 'e11: si no, deja 3 runas');
  const nopal = hero('escriba');
  palabra(nopal); nopal.tick(8.2);
  ok(!seals(nopal).length && !nopal.g.fields.some(f => f.kind === 'm_runa_escrita'), 'sin e11 no deja nada');
}
// e3 Tinta de Maná · e6 Tinta Elemental
{
  const h = hero('escriba', { e3: 1 });
  h.aim(6, 0); h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  for (let i = 0; i < 3; i++) cast(h, 'lmb', 'm_dardo', 1.2);
  const rune = h.g.fields.find(f => f.kind === 'm_runa_escrita');
  h.p.mp = 0;
  h.p.pos.set(rune.pos.x, 0, rune.pos.z);
  h.tick(0.1);
  eq(Math.round(h.p.mp), 5, 'e3: pisar una runa tuya te da 5 de maná');
  h.p.mp = 0; h.tick(0.3);
  const onRune = h.p.mp;
  h.p.pos.set(30, 0, 0); h.p.mp = 0; h.tick(0.3);
  near(onRune, h.p.mp, 1e-6, 'e3: una vez por runa (luego, solo la regeneración)');
  const el = hero('escriba', { e6: 1 }, {}, { spec: 'arcanista' });
  el.p.cls.skills.find(s => s.id === 'nova_hielo');
  const foe = el.enemy({ hp: 1e7, pos: [1, 0, 0] });
  cast(el, 'rmb', 'nova_hielo', 0.1); el.p.cds.nova_hielo = 0; el.p.mp = el.p.stats.maxMP;
  cast(el, 'rmb', 'nova_hielo', 0.1); el.p.cds.nova_hielo = 0; el.p.mp = el.p.stats.maxMP;
  cast(el, 'rmb', 'nova_hielo', 0.1);
  const fr = el.g.fields.find(f => f.kind === 'm_runa_escrita');
  ok(fr && fr.data.elem === 'frost', 'e6: la runa toma el elemento del hechizo');
  foe.slowT = 0; foe.pos.set(fr.pos.x, 0, fr.pos.z);
  el.tick(0.6);
  ok(foe.slowT > 0 && foe.slowPct === 30, 'e6: la runa de Hielo ralentiza un 30 %');
  const ar = hero('escriba', { e6: 1 }, {}, { spec: 'arcanista' });
  ar.aim(6, 0); ar.enemy({ hp: 1e7, pos: [6, 0, 0] });
  const c0 = gaugeValue(ar.p, 'cargas');
  for (let i = 0; i < 3; i++) cast(ar, 'lmb', 'm_dardo', 0.05), ar.step(1.15);
  ok(ar.g.fields.some(f => f.kind === 'm_runa_escrita' && f.data.elem === 'arcane') && gaugeValue(ar.p, 'cargas') > c0, 'e6: la runa Arcana da 1 Carga');
}
// e12 Gran Grimorio (final): cada 30 s el siguiente Sello es un Grimorio de 10 s; dentro, copia al 40 %
{
  const h = hero('escriba', { e12: 1 });
  const echoes = spyFree(h);
  const t0 = h.p.simT;
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  const g1 = h.g.fields.find(f => f.kind === 'm_sello');
  ok(g1.data.grimoire && g1.dur === 10, 'e12: el Sello es un Grimorio de 10 s');
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  cast(h, 'rmb', 'nova_hielo', 0.4);
  same(echoes.map(x => [x.id, x.mult, x.ok]), [['nova_hielo', 0.4, true]], 'e12: dentro, cada hechizo se copia al 40 %');
  h.p.pos.set(20, 0, 0); h.p.cds.nova_hielo = 0; cast(h, 'rmb', 'nova_hielo', 0.4);
  eq(echoes.length, 1, 'e12: fuera, no');
  h.p.pos.set(0, 0, 0);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  ok(!h.g.fields.filter(f => f.kind === 'm_sello' && f.t > 0 && !f.data.replaced).some(f => f.data.grimoire), 'e12: cada 30 s');
  const newest = () => h.g.fields.filter(f => f.kind === 'm_sello').pop();
  h.tick(t0 + 29.5 - h.p.simT);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  ok(newest() && !newest().data.grimoire, 'e12: a los 29,5 s del primero, aún no');
  h.tick(t0 + 30.3 - h.p.simT);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  ok(newest()?.data.grimoire, 'e12: a los 30 s, el siguiente Sello vuelve a ser un Grimorio');
}
// G13: el Paragon en pausa no da efecto (conserva sus nodos) y vuelve al recuperar el 31/31
{
  const h = hero('crono', { t1: 1 });
  ok(h.p.powers.has('m_marca_tiempo') && h.p.tv.chronoDur === 2, 'G13: abierto, la clave y sus nodos aportan');
  const sp = h.p.talents.sp[h.p.talents.spec];
  const id = Object.keys(sp).find(k => sp[k] > 0);
  sp[id]--;
  h.p.recompute();
  ok(h.p.talentAgg.heroPaused && !h.p.powers.has('m_marca_tiempo') && !h.p.tv.chronoDur, 'G13: en pausa no aporta nada');
  eq(h.p.talents.hero[h.p.talents.spec].nodes.crono.t1, 1, 'G13: los nodos se conservan');
  sp[id]++;
  h.p.recompute();
  ok(h.p.talentAgg.heroOpen && h.p.powers.has('m_marca_tiempo') && h.p.tv.chronoDur === 2, 'G13: al recuperar el 31/31 vuelve a funcionar');
}
console.log('✓ Paragon: Cronomante, Invocadora y Escriba Rúnica con efecto en cada nodo; pausa (G13)');

// ------------------------------------------------------------ 4) ESPECIALIZACIONES
// sp(spec, rangos, elecciones): la especialización activa a Nv70 con esos nodos (los nodos clave,
// gratis) y un arma fija de 1000 (las proporciones no se pierden al redondear)
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Bastón de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
function sp(spec, ranks = {}, choice = {}, opts = {}) {
  const h = H({ spec, talents: { specRanks: ranks, choice }, ...opts });
  h.p.equipment.weapon = { ...WEAPON };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  ok(h.p.talentAgg.spec === spec, `${spec}: especialización activa`);
  return h;
}
const TT = gaugeTuning();
// texto de un nodo de especialización (con su rango) o de una opción (s6, i8A…)
function nodeText(id, r = 1) {
  const [, nid, k] = id.match(/^([a-z]\d+)([AB]?)$/);
  const n = MAGA_TALENTS.specs.flatMap(x => x.nodes).find(x => x.id === nid);
  return k ? n.opts.find(o => o.k === k).desc : n.d(r);
}
// B1 / dueño (pendientes-maga.md, «Abierto tras la tanda 2»): estos nodos dicen un número absoluto
// sin la Mejora de la forja, que a Nv70 ya está puesta y suma. Hasta que el orquestador decida (texto
// relativo o efecto sin la Mejora), lo MEDIDO a Nv70 y el número del texto quedan fijados aquí: si
// cambia uno sin cambiar esta tabla (es decir, sin decidirlo), la comprobación falla
const ABS_NV70 = {
  s6: { got: 5.2, text: /explota en 4 m \(antes 2 m\)/ },          // radio de la Bola con Ignición Total
  i8A: { got: 7, text: /a 6 m \(antes 4 m\)/ },                     // radio de la Prisión
  i9A: { got: 20.04, text: /a 18 m \(antes 12 m\)/ },                  // alcance de la Lanza
  a17: { got: 14, text: /dura 12 s \(antes 8 s\)/, r: 2 },          // duración del Sello (rango 2)
};
function absPending(id, measured) {
  const A = ABS_NV70[id];
  near(measured, A.got, 1e-6, `${id}: a Nv70 mide ${A.got} (con la Mejora; pendiente de B1, ABS_NV70)`);
  ok(A.text.test(nodeText(id, A.r || 1)), `${id}: el texto aún dice el número sin la Mejora (si cambia, decide y actualiza ABS_NV70)`);
}
const burnsOf = (h, e) => h.g.dotsOf(e, 'burn');
const burnLeft = (h, e) => h.g.dotRemaining(e, 'burn');
const procs = (log, source) => log.filter(x => x.proc && x.source === source);
const kill = e => e.takeDamage(1e12, false, { proc: true, source: 'test' });
// probabilidad de crítico medida (misma semilla: lo que cambia es el bono)
function critRate(h, e, info, n = 600) {
  let c = 0;
  for (let i = 0; i < n; i++) if (h.p.rollDamage(1, 0, 0, e, info).crit) c++;
  return c / n;
}
const FIRE = { skill: 'bola_fuego', elem: 'fire', tags: new Set(['fire']) };

// ---------------- PIROMANTE (calor · fire)
// s0 Ignición (clave): la Bola explota al 350 % y los golpes de Fuego queman (60 % en 4 s)
{
  const h = sp('piromante'), b = cls({});
  near(prof(h, 'bola_fuego').splash / prof(b, 'bola_fuego').splash, 3.5, 1e-9, 's0: explosión de la Bola 100 → 350 %');
  // también la explosión FORJADA: Pirodardo (forja I, 40 %) pasa a 140 %
  const pd = sp('piromante'), cd = cls({});
  for (const x of [pd, cd]) { x.p.skillForge = { bola_fuego: 'i' }; x.p.recompute(); }
  near(prof(pd, 'bola_fuego').splash / prof(cd, 'bola_fuego').splash, 3.5, 1e-9, 's0: también la explosión forjada (Pirodardo 40 → 140 %)');
  const e = h.enemy({ hp: 1e7 });
  h.hit(e, { elem: 'arcane', skill: 'm_dardo', dealt: 1000 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000, proc: true });
  eq(burnsOf(h, e).length, 0, 's0: ni otros elementos ni el daño de poder queman');
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  const d = burnsOf(h, e)[0];
  ok(d && d.ticks === 4 && Math.abs(d.total - 600) <= 1, `s0: quemadura del 60 % del golpe en 4 s (${d?.total}/${d?.ticks})`);
  h.tick(4.2);
  ok(e.hp < 1e7 - 590, 's0: la quemadura hace su daño');
  // el suelo de Fuego (Estela Ígnea) también quema; los tics de una quemadura, no
  const t = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.aim(6, 0);
  cast(h, 'k1', 'm_estela_ignea', 0.6);
  ok(burnsOf(h, t).length === 1, 's0: la Estela Ígnea (suelo de Fuego) quema a quien la pisa');
  const d0 = h.enemy({ hp: 1e7, pos: [-4, 0, 0] });
  h.hit(d0, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  const src = burnsOf(h, d0).map(x => x.source).join();
  h.tick(2.3);
  eq(burnsOf(h, d0).map(x => x.source).join(), src, 's0: los tics de la quemadura no la renuevan');
  ok(burnLeft(h, d0) < 600 - 250, `s0: se va gastando (${burnLeft(h, d0)})`);
  h.p.pos.set(0, 0, 0);
  // una quemadura más débil no pisa a una más fuerte (una por enemigo)
  h.hit(e, { elem: 'fire', skill: 'meteoro', dealt: 4000 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 100 });
  near(burnsOf(h, e)[0].total, 2400, 1, 's0: la débil no sustituye a la fuerte');
}
// s1 Brasas (+1 s por rango) · s4 Llama Persistente (+15 % por rango)
{
  const h = sp('piromante', { s1: 2, s4: 2 }), e = h.enemy({ hp: 1e7 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  const d = burnsOf(h, e)[0];
  eq(d.ticks, 6, 's1 r2: las quemaduras duran 6 s');
  near(d.total, 150 * 1.3 * 6, 1, 's4 r2: +30 % (y 6 tics del mismo daño por segundo)');
}
// s2 Calor Abrasador: +5 % de crítico por rango contra enemigos que se queman
{
  const b = sp('piromante'), h = sp('piromante', { s2: 3 });
  const eb = b.enemy({ hp: 1e7 }), eh = h.enemy({ hp: 1e7 });
  b.hit(eb, { elem: 'fire', skill: 'bola_fuego' }); h.hit(eh, { elem: 'fire', skill: 'bola_fuego' });
  const d = critRate(h, eh, FIRE) - critRate(b, eb, FIRE);
  ok(Math.abs(d - 0.15) <= 0.05, `s2 r3: +15 % de crítico contra quien se quema (${d.toFixed(3)})`);
  const cold = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), cb = b.enemy({ hp: 1e7, pos: [4, 0, 0] });
  ok(Math.abs(critRate(h, cold, FIRE) - critRate(b, cb, FIRE)) <= 0.05, 's2: sin quemadura, nada');
}
// s3 Mecha Corta (Bola: 1,5 × (1 − 0,1 × rango) s)
near(prof(sp('piromante', { s3: 3 }), 'bola_fuego').cd, 1.05, 1e-9, 's3 r3: la Bola se recarga en 1,05 s');
// s5 Chispas: un crítico sobre quien YA se quema reinicia su quemadura y da 5 de Calor
for (const on of [false, true]) {
  const h = sp('piromante', on ? { s5: 1 } : {}), e = h.enemy({ hp: 1e7 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  h.tick(2.05);
  const left = burnLeft(h, e), calor = h.gaugeValue('calor');
  h.hit(e, { elem: 'arcane', skill: 'm_dardo', crit: true });
  if (on) {
    near(burnLeft(h, e), 600, 1, 's5: el crítico reinicia la quemadura');
    eq(h.gaugeValue('calor') - calor, TT.calor.chispas, 's5: +5 de Calor');
  } else ok(burnLeft(h, e) === left && h.gaugeValue('calor') === calor, 'sin s5: el crítico no reinicia ni da Calor');
  const fresh = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.hit(fresh, { elem: 'fire', skill: 'bola_fuego', crit: true, dealt: 1000 });
  eq(h.gaugeValue('calor') - calor, (on ? TT.calor.chispas : 0) + TT.calor.perFireHit, 's5: un enemigo que aún no ardía no cuenta');
}
// s6 Combustible Volátil: con Ignición Total, Bola a 4 m y Meteoro al instante
{
  // a Nv70 la Bola lleva su Mejora de la forja (Núcleo Inestable: 2 → 2,6 m); el nodo dobla el radio
  // que tenga (2 → 4 m sin la Mejora, como dice el texto; 2,6 → 5,2 m con ella)
  const h = sp('piromante', { s6: 1 });
  near(prof(h, 'bola_fuego').radius, 2.6, 1e-9, 's6: sin Ignición, la Bola explota a 2,6 m (con la Mejora)');
  h.gauge('calor', 100);
  near(prof(h, 'bola_fuego').radius, 5.2, 1e-9, 's6: con Ignición, al doble');
  absPending('s6', prof(h, 'bola_fuego').radius);
  const n = sp('piromante');
  n.gauge('calor', 100);
  near(prof(n, 'bola_fuego').radius, 2.6, 1e-9, 'sin s6, la Ignición Total no agranda la explosión');
  eq(prof(h, 'meteoro').impactDelay, 0, 's6: y el Meteoro cae al instante');
  ok(prof(sp('piromante'), 'meteoro').impactDelay > 0, 'sin s6 el Meteoro tarda');
}
// s7 Pira: el Meteoro deja el suelo ardiendo 1 + rango s (40 % del arma por segundo)
{
  const h = sp('piromante', { s7: 2 }), e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(5, 0);
  cast(h, 'rmb', 'meteoro', 0.8);
  const f = h.g.fields.find(x => x.kind === 'zona' && x.data.skill === 'meteoro');
  ok(f && f.dur === 3 && Math.abs(f.data.dps - h.p.avgHit(0.4, prof(h, 'meteoro').addPct)) <= 1, 's7 r2: suelo ardiendo 3 s al 40 %/s');
  const hp = e.hp; h.tick(1.05);
  ok(e.hp < hp, 's7: daña a quien lo pisa');
}
// s8A Propagación (y s18 Brasa Errante) · s8B Brasa Profunda
{
  for (const err of [0, 2]) {
    const h = sp('piromante', err ? { s8: 1, s18: err } : { s8: 1 }, { s8: 'A' });
    const e = h.enemy({ hp: 1e9 });
    const near4 = [1, 2, 3, 4].map(i => h.enemy({ hp: 1e9, pos: [0, 0, i] }));
    h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
    const left = burnLeft(h, e);
    kill(e);
    const got = near4.filter(o => burnsOf(h, o).length);
    eq(got.length, 2 + err, `s8A${err ? ` + s18 r${err}` : ''}: la quemadura pasa a ${2 + err} cercanos`);
    near(burnLeft(h, got[0]), left * (err ? 1 : 0.5), 1, err ? 's18: sin perder daño' : 's8A: pasa con la mitad del daño');
    eq(burnsOf(h, got[0])[0].ticks, err ? 4 : 2, err ? 's18: ni tiempo' : 's8A: y la mitad del tiempo');
  }
  const b = sp('piromante', { s8: 1 }, { s8: 'B' }), e = b.enemy({ hp: 1e9 });
  for (const dealt of [1000, 2000, 3000]) b.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt });
  eq(burnsOf(b, e).length, 3, 's8B: tres quemaduras a la vez');
  b.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 4000 });
  near(burnLeft(b, e), (2000 + 3000 + 4000) * 0.6, 1, 's8B: la cuarta sustituye a la más débil');
  const s = sp('piromante'), e2 = s.enemy({ hp: 1e9 });
  s.hit(e2, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 }); s.hit(e2, { elem: 'fire', skill: 'bola_fuego', dealt: 2000 });
  eq(burnsOf(s, e2).length, 1, 'sin s8B: una sola');
}
// s9A Llamarada Avivada (100 % y 25 de Calor) · s9B Llamarada Voraz (≥ 3 estallidos: −4 s y 8 de Calor cada uno)
{
  const run = (choice) => {
    const h = sp('piromante', choice ? { s9: 1 } : {}, choice ? { s9: choice } : {});
    const foes = [2, 3, 4].map(x => h.enemy({ hp: 1e9, pos: [x, 0, 0] }));
    for (const o of foes) h.hit(o, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
    h.p.simT += 0.1;
    const log = spy(h);
    h.aim(6, 0);
    const c0 = h.gaugeValue('calor');
    cast(h, 'k3', 'p_llamarada', 0.2);
    return { h, log, calor: h.gaugeValue('calor') - c0, det: procs(log, 'skill:p_llamarada') };
  };
  const b = run(null), a = run('A'), v = run('B');
  ok(b.det.length === 3 && Math.abs(b.det[0].dealt - 360) <= 2, `Llamarada: estalla el 60 % de lo que queda (${b.det[0]?.dealt})`);
  ok(a.det.length === 3 && Math.abs(a.det[0].dealt - 600) <= 2, 's9A: el 100 %');
  eq(a.calor - b.calor, TT.calor.llamarada, 's9A: +25 de Calor');
  eq(v.calor - b.calor, TT.calor.voraz * 3, 's9B: +8 de Calor por enemigo');
  near(v.h.p.cds.p_llamarada, b.h.p.cds.p_llamarada - 4, 0.05, 's9B: se recarga 4 s antes');
  const two = sp('piromante', { s9: 1 }, { s9: 'B' });
  for (const x of [2, 3]) two.hit(two.enemy({ hp: 1e9, pos: [x, 0, 0] }), { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  two.aim(6, 0); cast(two, 'k3', 'p_llamarada', 0.2);
  ok(two.p.cds.p_llamarada > 7.5, 's9B: con 2 estallidos, nada');
}
// s10A Meteoro Gemelo (cada 3.º cae dos veces) · s10B Meteoro Concentrado (+50 % al del centro)
{
  const h = sp('piromante', { s10: 1 }, { s10: 'A' });
  h.enemy({ hp: 1e9, pos: [5, 0, 0] }); h.aim(5, 0);
  const ech = spyFree(h);
  for (let i = 0; i < 3; i++) cast(h, 'rmb', 'meteoro', 0.8);
  h.step(0.6);
  same(ech.map(x => x.mult), [1], 's10A: el 3.er Meteoro cae otra vez');
  // en el mismo sitio aunque muevas la mira, y aunque quites el Meteoro de la barra (g.castEcho)
  const m = sp('piromante', { s10: 1 }, { s10: 'A' });
  m.enemy({ hp: 1e9, pos: [5, 0, 0] }); m.aim(5, 0);
  const me = spyFree(m);
  for (let i = 0; i < 2; i++) cast(m, 'rmb', 'meteoro', 0.8);
  m.p.cds.meteoro = 0; m.p.gcdT = 0; m.p.castLock = 0; m.p.actionLockT = 0;
  ok(m.cast('rmb'), 's10A: el 3.er Meteoro sale');
  m.setSlot('rmb', 'bola_fuego'); m.aim(-6, 3);
  m.step(1);                                         // cae a los 0,6 s; la copia, 0,25 s después
  ok(me.length === 1 && me[0].id === 'meteoro' && me[0].ok && Math.hypot(me[0].at.x - 5, me[0].at.z) < 1e-6, `s10A: la copia cae donde el original (${me[0]?.at?.x}, ${me[0]?.at?.z}) aunque ya no esté en la barra`);
  const c = sp('piromante', { s10: 1 }, { s10: 'B' });
  const mid = c.enemy({ hp: 1e9, pos: [5, 0, 0] }), side = c.enemy({ hp: 1e9, pos: [6.5, 0, 0] });
  firePower('onCast', c.p, c.g, c.p, { sk: { id: 'meteoro' }, target: { x: 5, z: 0 } });
  eq(firePower('condAdd', c.p, c.p, mid, { skill: 'meteoro' }), 50, 's10B: +50 % al más cercano al centro');
  c.p.simT += 0.1;
  eq(firePower('condAdd', c.p, c.p, side, { skill: 'meteoro' }), 0, 's10B: al resto, nada');
}
// s11 Fuego Interior: matar a quien se quema cura 2 % y da 3 de maná por rango
{
  const h = sp('piromante', { s11: 2 }), e = h.enemy({ hp: 1e9 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  h.p.mp = 10;
  kill(e);
  eq(h.p.mp, 16, 's11 r2: +6 de maná al matar a quien se quema');
  const cold = h.enemy({ hp: 1e9 }); h.p.mp = 10; kill(cold);
  eq(h.p.mp, 10, 's11: sin quemadura, nada');
}
// s12 Pirotecnia: cada crítico de Fuego recarga 0,5 × rango s de tus habilidades de Fuego
{
  const h = sp('piromante', { s12: 2 }), e = h.enemy({ hp: 1e9 });
  h.p.cds.meteoro = 5; h.p.cds.p_llamarada = 5;
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', crit: true });
  ok(Math.abs(h.p.cds.meteoro - 4) <= 1e-6 && Math.abs(h.p.cds.p_llamarada - 4) <= 1e-6, 's12 r2: −1 s a Meteoro y Llamarada por crítico');
}
// s13 Ceniza Ardiente (+15 % por rango) · s14 Impacto Sísmico (ralentiza 50 % 3 s; 20 de Quebranto)
{
  const b = sp('piromante'), h = sp('piromante', { s13: 2, s14: 1 });
  eq(prof(h, 'meteoro').addPct - prof(b, 'meteoro').addPct, 30, 's13 r2: Meteoro +30 %');
  eq(prof(h, 'm_u_supernova').addPct - prof(b, 'm_u_supernova').addPct, 30, 's13 r2: Supernova +30 %');
  ok(prof(h, 'meteoro').slow === 3 && prof(h, 'meteoro').slowPct === 50, 's14: quien sobrevive queda ralentizado un 50 % 3 s');
  const boss = h.enemy({ hp: 1e9, boss: true }), bb = b.enemy({ hp: 1e9, boss: true });
  h.hit(boss, { elem: 'fire', skill: 'meteoro' }); b.hit(bb, { elem: 'fire', skill: 'meteoro' });
  eq(boss.stagger - (bb.stagger || 0), 20, 's14: +20 de Quebranto al jefe');
}
// s15A Fénix (renace a la mitad, una vez cada 2 min) · s15B Escudo de Llamas (−10 %; quema al que pega)
{
  const h = sp('piromante', { s15: 1 }, { s15: 'A' });
  h.p.takeDamage(1e9, 1, {});
  ok(h.p.alive && Math.abs(h.p.hp - h.p.stats.maxHP / 2) <= 1, 's15A: renace con la mitad de la vida');
  h.p.invulnT = 0; h.p.takeDamage(1e9, 1, {});
  ok(!h.p.alive || h.p.hp <= 0, 's15A: una vez cada 2 minutos');
  for (const [wait, back] of [[119.5, false], [120.5, true]]) {
    const f = sp('piromante', { s15: 1 }, { s15: 'A' });
    f.p.takeDamage(1e9, 1, {});
    f.tick(wait); f.p.invulnT = 0;
    f.p.takeDamage(1e9, 1, {});
    eq(f.p.alive, back, `s15A: a los ${wait} s ${back ? 'vuelve a renacer' : 'aún no'}`);
  }
  const b = sp('piromante'), s = sp('piromante', { s15: 1 }, { s15: 'B' });
  b.p.takeDamage(b.p.stats.maxHP * 0.3, 1, {}); s.p.takeDamage(s.p.stats.maxHP * 0.3, 1, {});
  const lb = b.p.stats.maxHP - b.p.hp, ls = s.p.stats.maxHP - s.p.hp;
  near(ls / lb, 0.9, 0.01, 's15B: recibes un 10 % menos de daño');
  const foe = s.enemy({ hp: 1e9 });
  s.p.takeDamage(10, 1, { melee: true, source: foe });
  ok(burnsOf(s, foe).length === 1, 's15B: quien te golpea cuerpo a cuerpo se quema');
  const archer = s.enemy({ hp: 1e9, pos: [6, 0, 0] });
  s.p.takeDamage(10, 1, { melee: false, source: archer });
  eq(burnsOf(s, archer).length, 0, 's15B: a distancia, no');
}
// s16 Brasero: con más de 50 de Calor, quemaduras +(15 + 10 × rango) % y Meteoro +(10 + 5 × rango) %
{
  const h = sp('piromante', { s16: 2 }), e = h.enemy({ hp: 1e9 });
  h.gauge('calor', 40);
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000, proc: false });
  const cold = burnLeft(h, e);
  eq(firePower('condAdd', h.p, h.p, e, { skill: 'meteoro' }), 0, 's16: con 40 de Calor, nada');
  h.gauge('calor', 60);
  const e2 = h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  h.hit(e2, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  near(burnLeft(h, e2) / cold, 1.35, 0.01, 's16 r2: con más de 50, quemaduras +35 %');
  eq(firePower('condAdd', h.p, h.p, e, { skill: 'meteoro' }), 20, 's16 r2: y Meteoro +20 %');
}
// s17 Estrellas Fugaces: Supernova suelta 1 + 2 × rango meteoros pequeños (40 %) en 3 s
for (const r of [1, 2]) {
  const h = sp('piromante', { s17: r }), e = h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  const log = spy(h);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_u_supernova' }, prof: { addPct: 0 } }, {});
  h.tick(3.2);
  const st = procs(log, 'power:p_estrellas_fugaces');
  eq(st.length, 1 + 2 * r, `s17 r${r}: ${1 + 2 * r} meteoros`);
  near(st[0].dealt, h.p.avgHit(0.4, 0), 2, 's17: al 40 %');
  void e;
}
// s19 Ignición Rápida: cada golpe de Fuego da 5 + 2 × rango de Calor
{
  const h = sp('piromante', { s19: 2 }), e = h.enemy({ hp: 1e9 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego' });
  eq(h.gaugeValue('calor'), 9, 's19 r2: 9 de Calor por golpe de Fuego');
}
// s20 Ola de Calor: tus áreas de Fuego un 15 % más grandes por rango
{
  const b = sp('piromante'), h = sp('piromante', { s20: 2 });
  near(prof(h, 'meteoro').radius / prof(b, 'meteoro').radius, 1.3, 1e-9, 's20 r2: Meteoro +30 % de radio');
  // la Bola ya lleva su Mejora (Núcleo Inestable, mod radius 30): los «+X %» del radio se suman
  near((prof(h, 'bola_fuego').radius - prof(b, 'bola_fuego').radius) / sk(h, 'bola_fuego').radius, 0.3, 1e-9, 's20 r2: Bola +30 % de radio (sobre los 2 m base, sumado a la Mejora)');
  eq(prof(h, 'm_dardo').radius, prof(b, 'm_dardo').radius, 's20: el Dardo (Arcano) no cambia');
}
// s21 Estela Meteórica: al terminar la Estela Ígnea, el siguiente Meteoro cae allí al instante
{
  const h = sp('piromante', { s21: 1 });
  const there = h.enemy({ hp: 1e9, pos: [6, 0, 0] }), aimed = h.enemy({ hp: 1e9, pos: [-6, 0, 0] });
  h.aim(6, 0);
  cast(h, 'k1', 'm_estela_ignea', 0.3);
  eq(prof(h, 'meteoro').impactDelay, 0, 's21: el siguiente Meteoro cae al instante');
  h.p.pos.set(0, 0, 0);
  const log = spy(h);
  h.aim(-6, 0);
  cast(h, 'rmb', 'meteoro', 0.05);
  ok(from(log, 'meteoro', there).length === 1 && !from(log, 'meteoro', aimed).length, 's21: cae al final de la Estela, no en la mira');
  ok(prof(h, 'meteoro').impactDelay > 0, 's21: solo el siguiente');
}
// s22 Brasa Viva: cada segundo, quien se quema copia el (10 + 10 × rango) % a otro a 2 m
{
  const h = sp('piromante', { s22: 1 }), e = h.enemy({ hp: 1e9 }), o = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
  const far = h.enemy({ hp: 1e9, pos: [8, 0, 0] });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  h.tick(1.05);
  ok(burnsOf(h, o).length === 1 && !burnsOf(h, far).length, 's22: contagia al de al lado, no al lejano');
  ok(Math.abs(burnLeft(h, o) - burnLeft(h, e) * 0.2 / 1) < burnLeft(h, e) * 0.08, `s22 r1: le pasa el 20 % (${burnLeft(h, o).toFixed(0)} de ${burnLeft(h, e).toFixed(0)})`);
  ok(burnsOf(h, e).length === 1, 's22: copia, no se lo quita');
  // lo que pasa es el % de lo que le queda en ese segundo (aún entera: 600)
  const r3 = sp('piromante', { s22: 3 }), a = r3.enemy({ hp: 1e9 }), n = r3.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
  r3.hit(a, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  const whole = burnLeft(r3, a);
  r3.tick(1.05);
  near(burnLeft(r3, n), whole * 0.4, 2, 's22 r3: le pasa el 40 %');
}
// s23 Combustión: al usar Ignición Total, 1,5 + rango s con todo el Fuego crítico
{
  const h = sp('piromante', { s23: 2 });
  h.enemy({ hp: 1e9, pos: [4, 0, 0] }); h.aim(4, 0);
  ok(!prof(h, 'meteoro').forceCrit, 's23: sin Ignición, nada');
  h.gauge('calor', 100);
  cast(h, 'rmb', 'bola_fuego', 0.1);
  const b = h.p.buffs.find(x => x.id === 'p_combustion');
  ok(b && Math.abs(b.t - 3.5 + 0.1) <= 0.05, `s23 r2: Combustión de 3,5 s (${b?.t})`);
  ok(prof(h, 'meteoro').forceCrit && prof(h, 'p_llamarada').forceCrit, 's23: todo tu Fuego es crítico');
  ok(!prof(h, 'm_dardo').forceCrit, 's23: el Arcano no');
  h.tick(3.6);
  ok(!prof(h, 'meteoro').forceCrit, 's23: al acabar, ya no');
}
// s24 Cráter: el Meteoro deja un cráter 4 s: +(10 + 5 × rango) % de Fuego dentro y la Bola explota dos veces
{
  const h = sp('piromante', { s24: 2 });
  const inside = h.enemy({ hp: 1e9, pos: [5, 0, 0] }), out = h.enemy({ hp: 1e9, pos: [-5, 0, 0] });
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'meteoro' }, prof: { radius: 3 }, target: { x: 5, z: 0 } }, {});
  const f = h.g.fields.find(x => x.kind === 'p_crater');
  ok(f && f.dur === 4 && f.radius === 3, 's24: cráter de 4 s');
  eq(firePower('condAdd', h.p, h.p, inside, { elem: 'fire', skill: 'bola_fuego' }), 20, 's24 r2: +20 % de Fuego dentro');
  eq(firePower('condAdd', h.p, h.p, out, { elem: 'fire', skill: 'bola_fuego' }), 0, 's24: fuera, nada');
  eq(firePower('condAdd', h.p, h.p, inside, { elem: 'arcane', skill: 'm_dardo' }), 0, 's24: otros elementos, nada');
  const log = spy(h);
  h.hit(inside, { elem: 'fire', skill: 'bola_fuego' });
  h.hit(inside, { elem: 'fire', skill: 'bola_fuego' });          // su explosión, mismo instante
  h.tick(0.3);
  eq(procs(log, 'power:p_crater').length, 1, 's24: dentro, la Bola explota otra vez (una por Bola)');
  h.p.simT += 0.1;
  h.hit(out, { elem: 'fire', skill: 'bola_fuego' }); h.tick(0.3);
  eq(procs(log, 'power:p_crater').length, 1, 's24: fuera, no');
  h.tick(4);
  ok(!h.g.fields.some(x => x.kind === 'p_crater'), 's24: el cráter se apaga');
}
// s25 Incendio Forestal (final): 5 quemaduras; al morir, todas pasan a cada uno a 4 m; r2–3 +20 %
{
  const h = sp('piromante', { s25: 3 }), e = h.enemy({ hp: 1e9, pos: [0, 0, 0] });
  for (let i = 1; i <= 6; i++) h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 * i });
  eq(burnsOf(h, e).length, 5, 's25: hasta 5 quemaduras');
  eq(h.p.tv.burnPct, 40, 's25 r3: quemaduras +40 %');
  const ring4 = [h.enemy({ hp: 1e9, pos: [3, 0, 0] }), h.enemy({ hp: 1e9, pos: [0, 0, -3.5] })], far = h.enemy({ hp: 1e9, pos: [9, 0, 0] });
  kill(e);
  ok(ring4.every(o => burnsOf(h, o).length === 5) && !burnsOf(h, far).length, 's25: al morir, todas pasan a cada uno a 4 m');
}
// s26 Combustión Perpetua (final): en Combustión, cada crítico da 4 de Calor; a tope, +3 s y una Bola gratis
{
  const h = sp('piromante', { s26: 3 }), b = sp('piromante');
  eq(h.p.stats.critDmg - b.p.stats.critDmg, 30, 's26 r3: críticos +30 %');
  const e = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  const group = [[-5, 6], [-6, 7], [-4.5, 7.5]].map(([x, z]) => h.enemy({ hp: 1e9, pos: [x, 0, z] }));
  h.hit(e, { elem: 'arcane', skill: 'm_dardo', crit: true });
  eq(h.gaugeValue('calor'), 0, 's26: fuera de Combustión, nada');
  h.p.addBuff('p_combustion', {}, 2.5, { name: 'Combustión' });
  h.hit(e, { elem: 'arcane', skill: 'm_dardo', crit: true });
  eq(h.gaugeValue('calor'), TT.calor.perpetua, 's26: +4 de Calor por crítico');
  // la Bola sale aunque no esté en la barra, sin coste ni enfriamiento (g.castEcho)
  const bar0 = { ...h.p.hotbar };
  ok(!Object.values(bar0).includes('bola_fuego'), 'la Bola no está en la barra');
  const ech = spyFree(h), shots = [];
  const sp0 = h.g.spawnProjectile.bind(h.g);
  h.g.spawnProjectile = o => { if (o.skill === 'bola_fuego') shots.push(o); return sp0(o); };
  h.gauge('calor', 99);
  h.p.simT += 0.1;
  h.hit(e, { elem: 'arcane', skill: 'm_dardo', crit: true });
  const bf = h.p.buffs.find(x => x.id === 'p_combustion');
  ok(bf && bf.t > 5, `s26: a tope, la Combustión dura 3 s más (${bf?.t})`);
  const mp0 = h.p.mp;
  h.step(0.2);
  ok(ech.length === 1 && ech[0].id === 'bola_fuego' && ech[0].mult === 1 && ech[0].ok && shots.length === 1, 's26: y lanza una Bola gratis');
  ok(group.some(o => Math.hypot(ech[0].at.x - o.pos.x, ech[0].at.z - o.pos.z) < 1e-6), `s26: la Bola gratis apunta al grupo más numeroso (${ech[0].at?.x}, ${ech[0].at?.z}), no al enemigo suelto`);
  ok(h.p.mp >= mp0 && !(h.p.cds.bola_fuego > 0), 's26: sin coste ni enfriamiento');
  same(h.p.hotbar, bar0, 's26: la barra queda como estaba');
}
// s27 Lluvia de Fuego (final): con Ignición, el Meteoro cae 3 veces (100/60/60 %); con 3+ golpeados, se recarga
{
  const h = sp('piromante', { s27: 3 }), b = sp('piromante');
  eq(prof(h, 'meteoro').addPct - prof(b, 'meteoro').addPct, 30, 's27 r3: Meteoro +30 %');
  for (const x of [5, 5.5, 6]) h.enemy({ hp: 1e9, pos: [x, 0, 0] });
  h.aim(5.5, 0);
  const ech = spyFree(h);
  cast(h, 'rmb', 'meteoro', 0.8);
  eq(ech.length, 0, 's27: sin Ignición, cae una vez');
  ok(h.p.cds.meteoro > 4, 's27: sin Ignición no se recarga');
  h.p.cds.meteoro = 0; h.gauge('calor', 100);
  cast(h, 'rmb', 'meteoro', 1.6);
  same(ech.map(x => [x.id, x.mult, x.ok]), [['meteoro', 0.6, true], ['meteoro', 0.6, true]], 's27: con Ignición cae dos veces más al 60 %');
  eq(h.p.cds.meteoro || 0, 0, 's27: golpeó a 3: se recarga al instante');
}
// s28 Corazón del Sol (ápice, 4 rangos)
{
  // 1) Ignición Total hace estallar las quemaduras a 8 m (50 % de lo que les queda, sin gastarlas)
  const h = sp('piromante', { s28: 1 });
  const e = h.enemy({ hp: 1e9, pos: [4, 0, 0] }), far = h.enemy({ hp: 1e9, pos: [12, 0, 0] });
  h.hit(e, { elem: 'fire', skill: 'meteoro', dealt: 1000 }); h.hit(far, { elem: 'fire', skill: 'meteoro', dealt: 1000 });
  h.p.simT += 0.1;
  const log = spy(h), left = burnLeft(h, e);
  h.gauge('calor', 100); h.aim(4, 0);
  cast(h, 'rmb', 'bola_fuego', 0.05);
  const burst = procs(log, 'power:p_corazon_sol');
  ok(burst.length === 1 && burst[0].e === e && Math.abs(burst[0].dealt - left / 2) <= 2, 's28.1: estalla el 50 % de lo que queda a 8 m');
  ok(burnsOf(h, e).length === 1, 's28.1: sin gastarla');
  // 2) matar a un élite da 25 de Calor
  const h2 = sp('piromante', { s28: 2 }), el = h2.enemy({ hp: 1e9, rank: 'elite' });
  kill(el);
  eq(h2.gaugeValue('calor'), TT.calor.eliteCalor, 's28.2: +25 de Calor por élite');
  const n1 = sp('piromante', { s28: 1 }); kill(n1.enemy({ hp: 1e9, rank: 'elite' }));
  eq(n1.gaugeValue('calor'), 0, 's28 r1: aún no');
  // 3) Ignición Total a 80
  const h3 = sp('piromante', { s28: 3 });
  h3.gauge('calor', 80);
  eq(h3.gaugeView().state, 'active', 's28.3: Ignición Total a 80 de Calor');
  // 4) cada 20 explosiones, Supernova sola y gratis
  const h4 = sp('piromante', { s28: 4 }), t = h4.enemy({ hp: 1e9, pos: [3, 0, 0] });
  const ech = spyFree(h4);
  for (let i = 0; i < 19; i++) { h4.hit(t, { elem: 'fire', skill: 'bola_fuego' }); h4.hit(t, { elem: 'fire', skill: 'bola_fuego' }); h4.p.simT += 0.1; }
  h4.step(0.2);
  eq(ech.length, 0, 's28.4: 19 explosiones, aún no');
  h4.hit(t, { elem: 'fire', skill: 'meteoro' });
  h4.step(0.2);
  ok(ech.length === 1 && ech[0].id === 'm_u_supernova' && ech[0].mult === 1 && ech[0].ok, 's28.4: la 20.ª lanza Supernova sola');
  const tl = spy(h4);
  h4.step(1.5);
  ok(from(tl, 'm_u_supernova', t).length >= 1, 's28.4: y la Supernova estalla');
}
console.log('✓ Piromante: cada nodo con su efecto (quemaduras, Calor, Meteoro y finales por rango)');

// ---------------- CRIONTE (escarcha · frost)
// repeticiones con el id de la habilidad que salió (la ranura prestada se devuelve después)
const FROST = (skill = 'k_test') => ({ elem: 'frost', skill });
const layers = (h, e) => h.gaugeValue('escarcha', e);
const freezeNow = (h, e, t = 1) => e.applyCC('freeze', t, { src: h.p });
// i0 Escarcha (clave): la mecánica: 1 capa por golpe de Hielo (la Nova 2, la Prisión las suyas, 2);
// a 5, Congelado 1 s; las capas caen cada 2 s
{
  const h = sp('crionte'), e = h.enemy({ hp: 1e9 });
  h.hit(e, FROST()); eq(layers(h, e), 1, 'i0: 1 capa por golpe de Hielo');
  h.hit(e, FROST('nova_hielo')); eq(layers(h, e), 3, 'i0: la Nova pone 2');
  h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); h.hit(e, { ...FROST(), proc: true });
  eq(layers(h, e), 3, 'i0: ni otros elementos ni el daño de poder');
  const p2 = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  h.hit(p2, FROST('k_prision')); eq(layers(h, p2), 2, 'i0: la Prisión de Hielo pone sus 2 capas (layers del catálogo)');
  h.hit(e, FROST('nova_hielo'));
  ok(e.frozenT > 0.9 && layers(h, e) === 0, 'i0: a 5 capas se congela 1 s y las gasta');
  h.tick(2.05);
  eq(layers(h, p2), 1, 'i0: cae 1 capa cada 2 s');
  eq(MAGA_TALENTS.specs[1].nodes[0].touch.includes('m_paso_escarcha'), true, 'i0 toca el Paso de Escarcha (su camino golpea con Hielo)');
  const pe = sp('crionte'), foe = pe.enemy({ hp: 1e9, pos: [3, 0, 0] });
  pe.aim(6, 0); cast(pe, 'k1', 'm_paso_escarcha', 1.1);
  ok(layers(pe, foe) >= 1, 'i0: el camino del Paso de Escarcha pone capas');
}
// i1 Frío Penetrante: Congelado +0,2 s por rango
{
  const h = sp('crionte', { i1: 3 }), e = h.enemy({ hp: 1e9 });
  for (let i = 0; i < 5; i++) h.hit(e, FROST());
  near(e.frozenT, 1.6, 1e-6, 'i1 r3: Congelado 1,6 s');
}
// i2 Filo Helado: +5 % de crítico por rango contra enemigos con 3 o más capas
{
  const h = sp('crionte', { i2: 3 }), b = sp('crionte');
  const e = h.enemy({ hp: 1e9 }), eb = b.enemy({ hp: 1e9 });
  for (let i = 0; i < 2; i++) { h.hit(e, FROST()); b.hit(eb, FROST()); }
  eq(firePower('condCrit', h.p, h.p, e, {}), 0, 'i2: con 2 capas, nada');
  h.hit(e, FROST()); b.hit(eb, FROST());
  eq(firePower('condCrit', h.p, h.p, e, {}), 15, 'i2 r3: +15 % con 3 capas');
  const d = critRate(h, e, FROST()) - critRate(b, eb, FROST());
  ok(Math.abs(d - 0.15) <= 0.05, `i2: se nota en la tirada (${d.toFixed(3)})`);
}
// i3 Viento Cortante (Nova: 4 − 0,5 × rango s) · i13 Frío Intenso (+15 % por rango) · i20 Expansión Glacial
{
  const b = sp('crionte'), h = sp('crionte', { i3: 3, i13: 2, i20: 2 });
  near(prof(h, 'nova_hielo').cd, 2.5, 1e-9, 'i3 r3: la Nova se recarga en 2,5 s');
  eq(prof(h, 'nova_hielo').addPct - prof(b, 'nova_hielo').addPct, 30, 'i13 r2: Nova +30 %');
  eq(prof(h, 'm_u_tormenta').addPct - prof(b, 'm_u_tormenta').addPct, 30, 'i13 r2: Tormenta +30 %');
  // +30 % del radio base, que se suma al de la Mejora de la forja (Celda Amplia de la Prisión: +25 %)
  for (const id of ['nova_hielo', 'k_prision', 'm_u_tormenta']) near((prof(h, id).radius - prof(b, id).radius) / sk(h, id).radius, 0.3, 1e-9, `i20 r2: ${id} +30 % de radio`);
}
// i4 Escarcha Densa: las capas caen cada 2 + rango s
{
  const h = sp('crionte', { i4: 2 }), e = h.enemy({ hp: 1e9 });
  h.hit(e, FROST('nova_hielo'));
  h.tick(3.9); eq(layers(h, e), 2, 'i4 r2: a los 3,9 s aún no cae');
  h.tick(0.2); eq(layers(h, e), 1, 'i4 r2: cae a los 4 s');
  h.tick(4.05); eq(layers(h, e), 0, 'i4: y la siguiente, otros 4 s después');
}
// i5 Hielo Quebradizo: los Congelados reciben +20 % de todo
{
  const h = sp('crionte', { i5: 1 }), e = h.enemy({ hp: 1e9 }), o = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  freezeNow(h, e, 2); h.tick(0.1);
  ok(e.weaknessPct() >= 20 && o.weaknessPct() === 0, 'i5: +20 % de daño recibido mientras está Congelado');
  h.tick(2.2);
  eq(e.weaknessPct(), 0, 'i5: al descongelarse, se acaba');
}
// i6 Polvo de Diamante: al congelar, la siguiente Lanza o Nova no cuesta
{
  const h = sp('crionte', { i6: 1 }), e = h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  ok(prof(h, 'k_lanza').cost > 0, 'i6: sin congelar, la Lanza cuesta');
  freezeNow(h, e); h.tick(0.1);
  ok(prof(h, 'k_lanza').cost === 0 && prof(h, 'nova_hielo').cost === 0, 'i6: tras congelar, Lanza y Nova gratis');
  const mp = h.p.mp; h.aim(3, 0);
  cast(h, 'rmb', 'k_lanza', 0.05);
  eq(h.p.mp, mp, 'i6: la Lanza no cobró');
  ok(prof(h, 'nova_hielo').cost > 0, 'i6: solo la siguiente');
  // una congelación de cuando ya la tenías gratis no vale para la próxima
  const q = sp('crionte', { i6: 1 }), q1 = q.enemy({ hp: 1e9, pos: [3, 0, 0] }), q2 = q.enemy({ hp: 1e9, pos: [3, 0, 2] });
  freezeNow(q, q1, 2); q.tick(0.1);
  freezeNow(q, q2, 2); q.tick(0.1);
  q.aim(3, 0); cast(q, 'rmb', 'k_lanza', 0.05); q.tick(0.2);
  ok(q2.frozenT > 0 && prof(q, 'k_lanza').cost > 0, 'i6: la gratis se gasta y no vuelve sin congelar a otro');
}
// i7 Tormenta Creciente: dura 8 + rango s y crece un 10 % cada segundo
{
  const h = sp('crionte', { i7: 2 });
  eq(prof(h, 'm_u_tormenta').dur, 10, 'i7 r2: la Tormenta dura 10 s');
  cast(h, 'k4', 'm_u_tormenta', 0.05);
  const r0 = magaStorm(h.p).radius;
  h.tick(2.25);
  near(magaStorm(h.p).radius / r0, 1.2, 1e-6, 'i7: a los 2 s, un 20 % más grande');
  const b = sp('crionte'); cast(b, 'k4', 'm_u_tormenta', 0.05); b.tick(2.05);
  eq(magaStorm(b.p).radius, prof(b, 'm_u_tormenta').radius, 'sin i7 no crece');
}
// i8A Prisión Amplia (6 m) · i8B Prisión Profunda (un solo enemigo, 3 s, +80 %)
{
  // 4 → 6 m sobre la Prisión base; a Nv70 se suma a la Mejora (Celda Amplia, +25 %): 5 → 7 m
  near(prof(sp('crionte', { i8: 1 }, { i8: 'A' }), 'k_prision').radius - prof(sp('crionte'), 'k_prision').radius, 2, 1e-9, 'i8A: la Prisión atrapa 2 m más lejos (4 → 6 m)');
  absPending('i8A', prof(sp('crionte', { i8: 1 }, { i8: 'A' }), 'k_prision').radius);
  const h = sp('crionte', { i8: 1 }, { i8: 'B' });
  h.p.stats.critRaw = -1000;                     // sin críticos: la proporción es la del +80 %
  const a = h.enemy({ hp: 1e9, pos: [2, 0, 0] }), o = h.enemy({ hp: 1e9, pos: [0, 0, 2.5] });
  const glued = h.enemy({ hp: 1e9, pos: [0, 0, -0.3] });   // pegado a ti: tampoco cae en un área
  const log = spy(h);
  h.aim(2, 0);
  cast(h, 'k3', 'k_prision', 0.2);
  ok(a.frozenT > 2.5 && !(o.frozenT > 0), `i8B: atrapa a uno solo 3 s (${a.frozenT}, ${o.frozenT})`);
  ok(!(glued.frozenT > 0) && !from(log, 'k_prision', glued).length, 'i8B: ni al que está pegado a ti (sin área)');
  eq(from(log, 'k_prision', a).length, 1, 'i8B: un solo golpe al atrapado (el del poder, no además el del área)');
  const b = sp('crionte'), ab = b.enemy({ hp: 1e9, pos: [2, 0, 0] });
  b.p.stats.critRaw = -1000;
  const lb = spy(b); b.aim(2, 0); cast(b, 'k3', 'k_prision', 0.2);
  const hit = from(log, 'k_prision', a)[0], hb = from(lb, 'k_prision', ab)[0];
  const add = prof(b, 'k_prision').addPct;
  ok(hit && hb && Math.abs(hit.raw / hb.raw - (100 + add + 80) / (100 + add)) <= 0.02, `i8B: +80 % al atrapado (${hit?.raw} frente a ${hb?.raw})`);
  eq(layers(h, a), 2, 'i8B: el golpe de la Prisión pone sus capas');
  // con Celda Lejana (la Prisión a 15 m sobre el enemigo de la mira) atrapa al de la mira aunque
  // pase de 8 m, no al más cercano
  const c = sp('crionte', { i8: 1 }, { i8: 'B' });
  c.p.skillForge = { k_prision: 'i' }; c.p.recompute(); c.p.mp = c.p.stats.maxMP;
  const far = c.enemy({ hp: 1e9, pos: [12, 0, 0] }), close = c.enemy({ hp: 1e9, pos: [0, 0, 5] });
  const lc = spy(c);
  c.aim(12, 0);
  cast(c, 'k3', 'k_prision', 0.2);
  ok(far.frozenT > 2.5 && from(lc, 'k_prision', far).length === 1, `i8B con Celda Lejana: atrapa y golpea al de la mira a 12 m (${far.frozenT})`);
  ok(!(close.frozenT > 0) && !from(lc, 'k_prision', close).length, 'i8B con Celda Lejana: no al más cercano');
}
// i9A Lanza Larga (18 m; ralentiza 30 %) · i9B Lanza del Invierno (×4 a Congelados y Ateridos)
{
  // 12 → 18 m sobre la Lanza base; a Nv70 se suma a la Mejora (Punta Afilada, +17 %): 14 → 20 m
  const a = prof(sp('crionte', { i9: 1 }, { i9: 'A' }), 'k_lanza'), a0 = prof(sp('crionte'), 'k_lanza');
  ok(Math.abs(a.range - a0.range - 6) < 1e-6 && a.slow > 0 && a.slowPct === 30 && !(a0.slowPct > 0), 'i9A: la Lanza llega 6 m más lejos (12 → 18 m) y ralentiza un 30 %');
  absPending('i9A', a.range);
  const h = sp('crionte', { i9: 1 }, { i9: 'B' });
  eq(prof(h, 'k_lanza').frozenMult, 4, 'i9B: ×4 a los Congelados (antes ×3)');
  const boss = h.enemy({ hp: 1e9, boss: true });
  const log = spy(h);
  h.hit(boss, { ...FROST('k_lanza'), dealt: 100 });
  eq(procs(log, 'power:k_lanza_invierno').length, 0, 'i9B: a un jefe que no está Aterido, nada');
  boss.numbT = 3;
  h.hit(boss, { ...FROST('k_lanza'), dealt: 100 });
  const pr = procs(log, 'power:k_lanza_invierno');
  ok(pr.length === 1 && pr[0].dealt === 300, 'i9B: a un jefe Aterido, el triple extra (×4)');
}
// i10A Ventisca Viva (una Nova cada 2 s) · i10B Frío Sostenido (+60 % al de más capas)
{
  const h = sp('crionte', { i10: 1 }, { i10: 'A' });
  const ech = spyFree(h);
  cast(h, 'k4', 'm_u_tormenta', 0.05);
  h.tick(8.5);
  const novas = ech.filter(x => x.id === 'nova_hielo');
  eq(novas.length, 3, 'i10A: una Nova cada 2 s mientras dura (a los 2, 4 y 6 s)');
  ok(novas.every(x => x.mult === 1 && x.ok), 'i10A: Novas enteras');
  // la Nova sale del CENTRO de la Tormenta (origin): con la Ventisca Anclada (forja I), donde la
  // anclaste, no a tus pies
  const an = sp('crionte', { i10: 1 }, { i10: 'A' });
  an.p.skillForge = { m_u_tormenta: 'i' }; an.p.recompute(); an.p.mp = an.p.stats.maxMP;
  const ea = spyFree(an), la = spy(an);
  const there = an.enemy({ hp: 1e9, pos: [10, 0, 0] }), here = an.enemy({ hp: 1e9, pos: [-1, 0, 0] });
  an.aim(10, 0);
  cast(an, 'k4', 'm_u_tormenta', 0.05);
  ok(Math.hypot(magaStorm(an.p).center().x - 10, magaStorm(an.p).center().z) < 1e-6, 'la Ventisca Anclada se queda a 10 m');
  an.tick(2.1);
  const nv = ea.filter(x => x.id === 'nova_hielo');
  ok(nv.length === 1 && nv[0].ok && nv[0].origin && Math.hypot(nv[0].origin.x - 10, nv[0].origin.z) < 1e-6, 'i10A: con la Ventisca Anclada, la Nova sale del centro de la Tormenta');
  ok(from(la, 'nova_hielo', there).length === 1 && !from(la, 'nova_hielo', here).length, 'i10A: la Nova golpea allí y no a tus pies');
  const c = sp('crionte', { i10: 1 }, { i10: 'B' });
  const a = c.enemy({ hp: 1e9, pos: [1, 0, 0] }), o = c.enemy({ hp: 1e9, pos: [-1, 0, 0] });
  for (let i = 0; i < 3; i++) c.hit(a, FROST()); c.hit(o, FROST());
  eq(firePower('condAdd', c.p, c.p, a, { skill: 'm_u_tormenta' }), 0, 'i10B: sin Tormenta, nada');
  cast(c, 'k4', 'm_u_tormenta', 0.05);
  c.p.simT += 0.01;
  eq(firePower('condAdd', c.p, c.p, a, { skill: 'm_u_tormenta' }), 60, 'i10B: +60 % al de más capas');
  eq(firePower('condAdd', c.p, c.p, o, { skill: 'm_u_tormenta' }), 0, 'i10B: al resto, nada');
}
// i11 Sangre Fría: matar a un Congelado cura 2 % y da 3 de maná por rango
{
  const h = sp('crionte', { i11: 2 }), e = h.enemy({ hp: 1e9 });
  freezeNow(h, e); h.p.mp = 10; kill(e);
  eq(h.p.mp, 16, 'i11 r2: +6 de maná');
  h.p.mp = 10; kill(h.enemy({ hp: 1e9 }));
  eq(h.p.mp, 10, 'i11: sin congelar, nada');
}
// i12 Astillas: cada crítico de Hielo recarga 0,5 × rango s de la Lanza y la Prisión (uno por instante)
{
  const h = sp('crionte', { i12: 2 }), e = h.enemy({ hp: 1e9 });
  h.p.cds.k_lanza = 4; h.p.cds.k_prision = 10; h.p.cds.nova_hielo = 3;
  h.hit(e, { ...FROST(), crit: true }); h.hit(e, { ...FROST(), crit: true });
  ok(Math.abs(h.p.cds.k_lanza - 3) < 1e-6 && Math.abs(h.p.cds.k_prision - 9) < 1e-6, 'i12 r2: −1 s a Lanza y Prisión (una vez por instante)');
  eq(h.p.cds.nova_hielo, 3, 'i12: la Nova no');
  h.p.simT += 0.1; h.hit(e, { elem: 'fire', skill: 'bola_fuego', crit: true });
  near(h.p.cds.k_lanza, 3, 1e-6, 'i12: un crítico de Fuego no cuenta');
}
// i14 Suelo Helado: la Prisión deja el suelo helado 4 s (ralentiza un 40 %, 1 capa por segundo)
{
  const h = sp('crionte', { i14: 1 });
  cast(h, 'k3', 'k_prision', 0.2);
  const f = h.g.fields.find(x => x.kind === 'k_suelo');
  ok(f && f.dur === 4, 'i14: suelo helado de 4 s');
  const late = h.enemy({ hp: 1e9, pos: [1, 0, 1] });
  h.tick(2.05);
  ok(late.slowT > 0 && late.slowPct === 40 && layers(h, late) === 2, `i14: ralentiza un 40 % y pone 1 capa por segundo (${layers(h, late)})`);
  h.tick(2.5);
  ok(!h.g.fields.some(x => x.kind === 'k_suelo'), 'i14: se apaga a los 4 s');
  // queda donde se cerró la Prisión: no te sigue; con una forma lanzada lejos, en la mira
  const m = sp('crionte', { i14: 1 });
  cast(m, 'k3', 'k_prision', 0.2);
  m.p.pos.set(6, 0, 0); m.tick(0.2);
  const f0 = m.g.fields.find(x => x.kind === 'k_suelo');
  ok(f0 && Math.hypot(f0.pos.x, f0.pos.z) < 1e-6, 'i14: el suelo se queda donde lo dejaste (no te sigue)');
  firePower('afterCast', m.p, m.g, m.p, { sk: { id: 'k_prision', at: 'target', radius: 4 }, prof: { radius: 4 }, target: { x: -10, z: 2 } }, {});
  const f1 = m.g.fields.filter(x => x.kind === 'k_suelo').pop();
  ok(f1 !== f0 && f1.pos.x === -10 && f1.pos.z === 2, 'i14: con una Prisión lanzada a la mira, el suelo queda allí');
}
// i15A Piel de Invierno (−15 % de daño de enemigos con capas) · i15B Cristal Protector (escudo al congelar cerca)
{
  const b = sp('crionte'), h = sp('crionte', { i15: 1 }, { i15: 'A' });
  const eb = b.enemy({ hp: 1e9 }), eh = h.enemy({ hp: 1e9 });
  b.hit(eb, FROST()); h.hit(eh, FROST());
  b.p.takeDamage(200, 1, { source: eb }); h.p.takeDamage(200, 1, { source: eh });
  const lb = b.p.stats.maxHP - b.p.hp, lh = h.p.stats.maxHP - h.p.hp;
  ok(Math.abs(lh / lb - 0.85) <= 0.02, `i15A: −15 % de daño de un enemigo con capas (${lh}/${lb})`);
  const clean = h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  const hp0 = h.p.hp; h.p.takeDamage(200, 1, { source: clean });
  eq(hp0 - h.p.hp, lb, 'i15A: sin capas, el daño entero');
  const c = sp('crionte', { i15: 1 }, { i15: 'B' });
  const near1 = c.enemy({ hp: 1e9, pos: [2, 0, 0] }), near2 = c.enemy({ hp: 1e9, pos: [0, 0, 2] }), far = c.enemy({ hp: 1e9, pos: [9, 0, 0] });
  freezeNow(c, far); c.tick(0.1);
  eq(c.p.shields.length, 0, 'i15B: congelar lejos no da escudo');
  freezeNow(c, near1); c.tick(0.1);
  ok(c.p.shields.length === 1 && Math.abs(c.p.shields[0].amt - c.p.stats.maxHP * 0.05) <= 1, 'i15B: escudo del 5 % al congelar a 4 m');
  freezeNow(c, near2); c.tick(0.1);
  eq(c.p.shields.length, 1, 'i15B: una vez cada 3 s');
  const full = c.p.shields[0].amt;
  c.p.shields[0].amt = 1;
  const near3 = c.enemy({ hp: 1e9, pos: [-2, 0, 0] }), near4 = c.enemy({ hp: 1e9, pos: [0, 0, -2] });
  c.tick(2.6); freezeNow(c, near3); c.tick(0.1);
  eq(c.p.shields[0].amt, 1, 'i15B: a los 2,8 s aún no');
  c.tick(0.3); freezeNow(c, near4); c.tick(0.1);
  eq(c.p.shields[0].amt, full, 'i15B: pasados 3 s, otro escudo');
}
// i16 Invierno Profundo: tu Hielo +5 % por rango y Congelado a 10 m (hasta 5)
{
  const h = sp('crionte', { i16: 2 });
  const foes = [1, 2, 3].map(x => h.enemy({ hp: 1e9, pos: [x, 0, 0] }));
  const t = h.enemy({ hp: 1e9, pos: [0, 0, 3] });
  freezeNow(h, foes[0]); freezeNow(h, foes[1]);
  h.p.simT += 0.01;
  eq(firePower('condAdd', h.p, h.p, t, FROST()), 20, 'i16 r2: 2 Congelados → +20 % de Hielo');
  eq(firePower('condAdd', h.p, h.p, t, { elem: 'fire' }), 0, 'i16: solo el Hielo');
  const m = sp('crionte', { i16: 2 });
  const six = Array.from({ length: 6 }, (_, i) => m.enemy({ hp: 1e9, pos: [1 + i, 0, 0] }));
  const far = m.enemy({ hp: 1e9, pos: [0, 0, 11] });
  for (const f of [...six, far]) freezeNow(m, f);
  m.p.simT += 0.01;
  eq(firePower('condAdd', m.p, m.p, six[0], FROST()), 50, 'i16 r2: hasta 5 Congelados (+50 %, no +60 %); el de 11 m no cuenta');
}
// i17 Remolino: al terminar el Paso de Escarcha, una Nova al 50 % por rango
{
  // la Nova sale donde acaba el desliz (6 m): golpea al de allí, no al del punto de partida
  const h = sp('crionte', { i17: 2 });
  const ech = spyFree(h), lg = spy(h);
  const end = h.enemy({ hp: 1e9, pos: [7, 0, 1.5] }), start = h.enemy({ hp: 1e9, pos: [-1.5, 0, 1.5] });
  h.aim(6, 0); cast(h, 'k1', 'm_paso_escarcha', 0.1);
  ok(ech.length === 1 && ech[0].id === 'nova_hielo' && ech[0].mult === 1 && ech[0].ok, 'i17 r2: una Nova al 100 %');
  ok(from(lg, 'nova_hielo', end).length === 1 && !from(lg, 'nova_hielo', start).length, 'i17: la Nova sale donde terminas el Paso');
  const r1 = sp('crionte', { i17: 1 }), e1 = spyFree(r1);
  r1.aim(6, 0); cast(r1, 'k1', 'm_paso_escarcha', 0.1);
  ok(e1.length === 1 && e1[0].mult === 0.5 && e1[0].ok, 'i17 r1: al 50 %');
}
// i18 Congelación en Cadena: muere un Congelado → se congelan 1 por rango a 4 m
{
  const h = sp('crionte', { i18: 2 });
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 0] });
  const ns = [1, 2, 3].map(x => h.enemy({ hp: 1e9, pos: [x, 0, 0] })), far = h.enemy({ hp: 1e9, pos: [0, 0, 6] });
  freezeNow(h, e); kill(e);
  ok(ns[0].frozenT > 0 && ns[1].frozenT > 0 && !(ns[2].frozenT > 0) && !(far.frozenT > 0), 'i18 r2: se congelan los 2 más cercanos');
  const k = h.enemy({ hp: 1e9, pos: [3, 0, 3] }); kill(k);
  ok(!(ns[2].frozenT > 0), 'i18: sin congelar, nada');
}
// i19 Ruptura · i23 Esquirlas · i26 Cero Absoluto (hacer añicos con la Lanza)
{
  const h = sp('crionte', { i19: 2, i23: 3, i26: 3 }), b = sp('crionte');
  eq(h.p.stats.critDmg - b.p.stats.critDmg, 30, 'i26 r3: críticos +30 %');
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 0] }), o1 = h.enemy({ hp: 1e9, pos: [2, 0, 0] }), o2 = h.enemy({ hp: 1e9, pos: [0, 0, 2] });
  const log = spy(h);
  // el perfil de la Lanza en la caché, como tras lanzarla (esquirlas y Cero Absoluto leen su +% de
  // daño: con la Mejora de la forja, Punta Afilada, +15 %)
  const lanza = prof(h, 'k_lanza');
  ok(lanza.addPct >= 15, 'la Lanza con su Mejora (+15 % de daño)');
  h.hit(e, { ...FROST('k_lanza'), dealt: 1000 });
  eq(procs(log, 'power:k_ruptura').length, 0, 'i19: si no está Congelado, no hay añicos');
  freezeNow(h, e, 2);
  h.p.cds.k_lanza = 4;
  h.p.simT += 0.1;
  h.hit(e, { ...FROST('k_lanza'), dealt: 1000 });
  const r = procs(log, 'power:k_ruptura');
  ok(r.length === 1 && r[0].dealt === 500, 'i19 r2: añicos +50 % del golpe');
  ok(!(e.frozenT > 0) && layers(h, e) === 3, 'i19: le quita la congelación y le deja 3 capas');
  const sh = procs(log, 'power:k_esquirlas');
  ok(sh.length === 2 && sh.every(x => x.e !== e) && Math.abs(sh[0].dealt - h.p.avgHit(0.5, lanza.addPct)) <= 2, 'i23 r3: esquirlas al 50 % a los cercanos');
  const z = procs(log, 'power:k_cero');
  ok(z.length === 1 && Math.abs(z[0].dealt - h.p.avgHit(3, lanza.addPct)) <= 2, 'i26: +300 % del arma');
  eq(h.p.cds.k_lanza || 0, 0, 'i26: y recarga la Lanza');
  const boss = h.enemy({ hp: 1e9, boss: true, pos: [5, 0, 5] });
  boss.frozenT = 0; h.p.simT += 0.1;
  h.hit(boss, { ...FROST('k_lanza'), dealt: 1000 });
  eq(procs(log, 'power:k_ruptura').length, 1, 'i19: a un jefe, no');
  // descongelar quita solo el hielo: un aturdimiento más largo de otra fuente sigue entero
  const st = h.enemy({ hp: 1e9, pos: [-6, 0, -6] });
  freezeNow(h, st, 2);
  ok(st.applyCC('stun', 6, { src: h.p }) > 2, 'otra fuente lo aturde más tiempo que el hielo');
  const stun0 = st.stunT;
  h.p.simT += 0.1;
  h.hit(st, { ...FROST('k_lanza'), dealt: 1000 });
  ok(!(st.frozenT > 0) && st.stunT === stun0, `i19: le quita la congelación, no el otro aturdimiento (${st.stunT} de ${stun0})`);
}
// i21 Ojo Frío: al acabar, la Tormenta estalla (200 %) y congela a los de 3 o más capas
{
  const h = sp('crionte', { i21: 1 });
  const a = h.enemy({ hp: 1e9, pos: [12, 0, 0] }), o = h.enemy({ hp: 1e9, pos: [-12, 0, 0] }), q = h.enemy({ hp: 1e9, pos: [0, 0, 12] });
  cast(h, 'k4', 'm_u_tormenta', 0.05);
  const log = spy(h);
  h.tick(7.3);
  eq(procs(log, 'power:k_ojo_frio').length, 0, 'i21: mientras dura, nada');
  a.pos.set(1, 0, 0); o.pos.set(-1, 0, 0); q.pos.set(0, 0, 1);
  h.hit(a, FROST()); h.hit(a, FROST()); h.hit(q, FROST());   // + el último golpe de la Tormenta: 3, 1 y 2
  h.tick(0.5);
  ok(!magaStorm(h.p), 'i21: la Tormenta acabó');
  eq(layers(h, q), 2, 'i21: uno se queda con 2 capas');
  const bursts = procs(log, 'power:k_ojo_frio');
  ok(bursts.length === 3 && Math.abs(bursts[0].dealt - h.p.avgHit(2, prof(h, 'm_u_tormenta').addPct)) <= 2, 'i21: estalla al 200 % sobre los de dentro');
  ok(a.frozenT > 0 && !(o.frozenT > 0) && !(q.frozenT > 0), 'i21: congela al de 3 capas, no a los de 1 ni 2');
}
// i22 Glaciar: al congelar a uno, los que están a 3 m ganan 1 capa por rango
{
  const h = sp('crionte', { i22: 2 });
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 0] }), n1 = h.enemy({ hp: 1e9, pos: [2, 0, 0] }), far = h.enemy({ hp: 1e9, pos: [6, 0, 0] });
  freezeNow(h, e); h.tick(0.1);
  ok(layers(h, n1) === 2 && layers(h, far) === 0, 'i22 r2: +2 capas a los de 3 m');
}
// i24 Tormenta Perpetua: congelar dentro de la Tormenta la alarga 0,5 × rango s (hasta +6 s)
{
  const h = sp('crionte', { i24: 2 }), e = h.enemy({ hp: 1e9, pos: [1, 0, 0] });
  cast(h, 'k4', 'm_u_tormenta', 0.05);
  const s = magaStorm(h.p), left = s.left;
  freezeNow(h, e); h.tick(0.1);
  eq(s.left - left, 2, 'i24 r2: +1 s (2 golpes más)');
  // tope +6 s: con rango 3 (1,5 s por congelado), el 5.º congelado ya no alarga
  const m = sp('crionte', { i24: 3 });
  const five = Array.from({ length: 5 }, (_, i) => m.enemy({ hp: 1e9, pos: [0.5 + i * 0.5, 0, 0] }));
  cast(m, 'k4', 'm_u_tormenta', 0.05);
  const ms = magaStorm(m.p), l0 = ms.left;
  for (const f of five) freezeNow(m, f);
  m.tick(0.1);
  eq(ms.left - l0, 12, 'i24 r3: 5 congelados alargan +6 s (12 golpes), no +7,5 s');
  // lo congelado antes de la Tormenta no la alarga
  const stale = sp('crionte', { i24: 3 }), plain = sp('crionte', { i24: 3 });
  const sf = stale.enemy({ hp: 1e9, pos: [1, 0, 0] });
  plain.enemy({ hp: 1e9, pos: [1, 0, 0] });
  freezeNow(stale, sf, 2); stale.tick(0.1); plain.tick(0.1);
  cast(stale, 'k4', 'm_u_tormenta', 0.3); cast(plain, 'k4', 'm_u_tormenta', 0.3);
  ok(sf.frozenT > 0 && magaStorm(stale.p).left === magaStorm(plain.p).left, 'i24: un enemigo congelado antes de la Tormenta no la alarga');
}
// i25 Era Glacial (final): al congelar, se congelan los que tengan capas a 5 m (cada 6 s); r2–3 +0,5 s
{
  const h = sp('crionte', { i25: 3 });
  eq(h.p.tv.freezeDur, 1, 'i25 r3: Congelado +1 s');
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 0] }), l = h.enemy({ hp: 1e9, pos: [3, 0, 0] }), n = h.enemy({ hp: 1e9, pos: [0, 0, 3] });
  h.hit(l, FROST());
  freezeNow(h, e); h.tick(0.1);
  ok(l.frozenT > 0 && !(n.frozenT > 0), 'i25: se congela el que tenía capas, no el otro');
  const l2 = h.enemy({ hp: 1e9, pos: [-3, 0, 0] }), e2 = h.enemy({ hp: 1e9, pos: [-2, 0, -2] });
  h.hit(l2, FROST());
  freezeNow(h, e2); h.tick(0.1);
  ok(!(l2.frozenT > 0), 'i25: una vez cada 6 s');
  const g6 = sp('crionte', { i25: 1 });
  const pair = (x, z) => { const c = g6.enemy({ hp: 1e9, pos: [x, 0, z] }), w = g6.enemy({ hp: 1e9, pos: [x + 2, 0, z] }); return [c, w]; };
  const [c1, w1] = pair(0, 0), [c2, w2] = pair(-12, 0), [c3, w3] = pair(12, 12);
  g6.hit(w1, FROST()); freezeNow(g6, c1); g6.tick(0.1);
  ok(w1.frozenT > 0, 'i25: la primera congelación se extiende');
  g6.tick(5.7); g6.hit(w2, FROST()); freezeNow(g6, c2); g6.tick(0.1);
  ok(!(w2.frozenT > 0), 'i25: a los 5,8 s aún no');
  g6.tick(0.3); g6.hit(w3, FROST()); freezeNow(g6, c3); g6.tick(0.1);
  ok(w3.frozenT > 0, 'i25: pasados 6 s, otra vez');
}
// i27 Invierno Eterno (final): la Tormenta no se acaba mientras haya un Congelado dentro (hasta 20 s)
{
  const h = sp('crionte', { i27: 3 }), b = sp('crionte');
  eq(prof(h, 'm_u_tormenta').addPct - prof(b, 'm_u_tormenta').addPct, 30, 'i27 r3: Tormenta +30 %');
  const e = h.enemy({ hp: 1e12, pos: [1, 0, 0] });
  cast(h, 'k4', 'm_u_tormenta', 0.05);
  for (let t = 0; t < 12; t += 0.5) { e.pos.set(1, 0, 0); e.stunDR = 0; freezeNow(h, e, 1); h.tick(0.5); }
  ok(magaStorm(h.p), 'i27: con un Congelado dentro, sigue a los 12 s');
  for (let t = 0; t < 10; t += 0.5) { e.pos.set(1, 0, 0); e.stunDR = 0; freezeNow(h, e, 1); h.tick(0.5); }
  ok(!magaStorm(h.p), 'i27: no pasa de 20 s');
  const s2 = sp('crionte', { i27: 1 }); cast(s2, 'k4', 'm_u_tormenta', 0.05); s2.tick(8.2);
  ok(!magaStorm(s2.p), 'i27: sin Congelados, acaba a los 8 s');
}
// i28 Corazón del Invierno (ápice, 4 rangos)
{
  // 1) congelar (llenar las capas) a un jefe le llena 20 de Quebranto
  const h = sp('crionte', { i28: 1 }), b = sp('crionte');
  const bh = h.enemy({ hp: 1e9, boss: true }), bb = b.enemy({ hp: 1e9, boss: true });
  for (let i = 0; i < 5; i++) { h.hit(bh, FROST()); b.hit(bb, FROST()); }
  near(bh.stagger - bb.stagger, 20 * 1.25, 1e-6, 'i28.1: +20 de Quebranto (×1,25 de la innata)');
  // 2) matar a un Congelado da 10 de maná
  const h2 = sp('crionte', { i28: 2 }), e2 = h2.enemy({ hp: 1e9 });
  freezeNow(h2, e2); h2.p.mp = 10; kill(e2);
  eq(h2.p.mp, 20, 'i28.2: +10 de maná');
  // 3) bastan 4 capas
  const h3 = sp('crionte', { i28: 3 }), e3 = h3.enemy({ hp: 1e9 });
  for (let i = 0; i < 4; i++) h3.hit(e3, FROST());
  ok(e3.frozenT > 0, 'i28.3: se congela con 4 capas');
  // 4) cada 15 congelaciones, la Tormenta sola
  const h4 = sp('crionte', { i28: 4 });
  const ech = spyFree(h4);
  for (let i = 0; i < 14; i++) { const o = h4.enemy({ hp: 1e9, pos: [i % 5, 0, Math.floor(i / 5)] }); freezeNow(h4, o); h4.tick(0.1); }
  h4.step(0.1);
  eq(ech.length, 0, 'i28.4: 14 congelaciones, aún no');
  freezeNow(h4, h4.enemy({ hp: 1e9, pos: [7, 0, 7] })); h4.tick(0.1); h4.step(0.1);
  ok(ech.length === 1 && ech[0].id === 'm_u_tormenta' && ech[0].ok, 'i28.4: la 15.ª lanza la Tormenta Glacial');
  ok(magaStorm(h4.p), 'i28.4: la Tormenta está activa');
}
console.log('✓ Crionte: cada nodo con su efecto (capas, congelación, Lanza, Tormenta y finales por rango)');

// ---------------- ARCANISTA (cargas · arcane)
const charges = h => h.gaugeValue('cargas');
const DART = { skill: 'm_dardo', elem: 'arcane' };
const RAYO = { skill: 'rayo', elem: 'arcane' };
// a0 Cargas Arcanas (clave): la mecánica (Dardo +1; Desgarro +1 por golpe; Sello +1 cada 2 s; el Rayo las gasta)
{
  const h = sp('arcanista'), e = h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  for (let i = 0; i < 6; i++) h.hit(e, DART);
  eq(charges(h), 4, 'a0: el Dardo da 1 Carga por impacto (máx. 4)');
  eq(firePower('condAdd', h.p, h.p, e, RAYO), 140, 'a0: el Rayo +35 % por Carga');
  h.p.mp = 50; h.aim(3, 0);
  cast(h, 'rmb', 'rayo', 0.05);
  eq(charges(h), 0, 'a0: el Rayo las gasta todas');
  near(h.p.mp, 50 - prof(h, 'rayo').cost + 20, 0.5, 'a0: y devuelve 5 de maná por Carga');
  h.hit(e, { skill: 'm_u_desgarro', elem: 'arcane' });
  eq(charges(h), 1, 'a0: cada golpe del Desgarro da 1 Carga');
  const s = sp('arcanista');
  cast(s, 'k2', 'a_sello', 0.05);
  s.tick(4.05);
  eq(charges(s), 2, 'a0: dentro de tu Sello, 1 Carga cada 2 s');
  s.p.pos.set(20, 0, 0); s.tick(4.05);
  eq(charges(s), 2, 'a0: fuera del Sello, no');
  eq(MAGA_TALENTS.specs[2].nodes[0].touch.includes('a_sello'), true, 'a0 toca el Sello del Archimago');
  // solo el impacto DIRECTO (HitInfo.source 'hit'): ni la salpicadura de la Saeta Ígnea ('splash',
  // con el canal real) ni un salto de cadena ('chain'), aunque lleven la habilidad del Dardo
  const sa = sp('arcanista');
  sa.p.skillForge = { m_dardo: 'i' }; sa.p.recompute(); sa.p.mp = sa.p.stats.maxMP;
  sa.enemy({ hp: 1e9, pos: [0, 0, 5] });
  const nb = sa.enemy({ hp: 1e9, pos: [1.2, 0, 5.4] });
  const ls = spy(sa);
  sa.aim(0, 5); cast(sa, 'lmb', 'm_dardo', 0.8);
  ok(ls.some(x => x.e === nb && x.skill === 'm_dardo' && x.source === 'splash'), 'la Saeta Ígnea salpica al vecino con un golpe del Dardo');
  eq(charges(sa), 1, 'a0: la salpicadura de la Saeta Ígnea no da Carga (solo el impacto)');
  const cj = sp('arcanista'), ce = cj.enemy({ hp: 1e9, pos: [3, 0, 0] });
  for (const source of ['chain', 'splash']) cj.g.onPlayerHit(ce, { dealt: 10, raw: 10, crit: false, skill: 'm_dardo', tags: new Set(['arcane']), elem: 'arcane', proc: false, dot: false, source, pos: { x: 3, z: 0 } });
  eq(charges(cj), 0, 'a0: un salto de cadena o una salpicadura del Dardo no dan Carga');
  cj.hit(ce, DART);
  eq(charges(cj), 1, 'a0: el impacto directo, sí');
}
// a1 Memoria Arcana (+2 s por rango) · a2 Mente Brillante (+5 % de crítico con 2+) · a4 Potencia Acumulada (+5 % por Carga y rango)
{
  const h = sp('arcanista', { a1: 2, a2: 3, a4: 2 }), e = h.enemy({ hp: 1e9 });
  h.hit(e, DART);
  eq(firePower('condCrit', h.p, h.p, e, {}), 0, 'a2: con 1 Carga, nada');
  h.hit(e, DART);
  eq(firePower('condCrit', h.p, h.p, e, {}), 15, 'a2 r3: +15 % de crítico con 2 Cargas');
  eq(firePower('condAdd', h.p, h.p, e, RAYO), 90, 'a4 r2: cada Carga da +45 % al Rayo');
  h.tick(9.8); eq(charges(h), 2, 'a1 r2: a los 9,8 s siguen');
  h.tick(0.4); eq(charges(h), 0, 'a1 r2: duran 10 s');
  eq(h.gaugeView().x.loseAfter, 10, 'a1: la barra lo sabe');
}
// a3 Flujo Constante (Desgarro 50 − 5 × rango s) · a11 Precisión Arcana (+10 % por rango) · a13 Torrente Arcano (+15 %)
{
  const b = sp('arcanista'), h = sp('arcanista', { a3: 3, a11: 2, a13: 2 });
  near(prof(h, 'm_u_desgarro').cd, 35, 1e-9, 'a3 r3: el Desgarro se recarga en 35 s');
  eq(prof(h, 'rayo').critBonus - prof(b, 'rayo').critBonus, 20, 'a11 r2: Rayo +20 % de crítico');
  eq(prof(h, 'm_u_desgarro').addPct - prof(b, 'm_u_desgarro').addPct, 30, 'a13 r2: Desgarro +30 %');
  eq(prof(h, 'a_orbe').addPct - prof(b, 'a_orbe').addPct, 30, 'a13 r2: Orbe +30 %');
}
// a5 Rebote Cargado: cada enemigo que alcanzan las descargas del Orbe da 1 Carga (una vez por enemigo y
// orbe). S-maga: el Orbe descarga a su alrededor y, al recogerlo, da 1 Carga más (la mecánica)
{
  const h = sp('arcanista', { a5: 1 });
  h.enemy({ hp: 1e9, pos: [3, 0, 0] }); h.enemy({ hp: 1e9, pos: [6, 0, 0] });
  h.aim(6, 0);
  cast(h, 'k3', 'a_orbe', 1.3);
  eq(charges(h), 2, 'a5: 2 enemigos alcanzados por las descargas → 2 Cargas');
  h.step(1.5);
  const orb = magaOrbs(h.p)[0];
  ok(orb?.state === 'quieto' && orb.zapHits > 4, `a5: quieto, sigue descargando sobre los dos (${orb?.zapHits} descargas)`);
  eq(charges(h), 2, 'a5: cada enemigo cuenta una vez por orbe');
  h.step(1.5);
  eq(charges(h), 3, 'a5: y al recoger el Orbe, la Carga de la mecánica');
  const b = sp('arcanista'); b.enemy({ hp: 1e9, pos: [3, 0, 0] }); b.aim(6, 0); cast(b, 'k3', 'a_orbe', 1.3);
  eq(charges(b), 0, 'sin a5 las descargas del Orbe no dan Cargas');
}
// a6 Sello Cargado: dentro de tu Sello, el Orbe y el Desgarro dan 1 Carga al golpear, como mucho 1
// cada 0,5 s (S-maga: el Orbe descarga cada 0,25 s y el Desgarro golpea cada 0,25 s)
{
  const h = sp('arcanista', { a6: 1 }), e = h.enemy({ hp: 1e9 });
  h.hit(e, { skill: 'a_orbe', elem: 'arcane' });
  eq(charges(h), 0, 'a6: fuera del Sello, nada');
  cast(h, 'k2', 'a_sello', 0.05);
  h.hit(e, { skill: 'a_orbe', elem: 'arcane' });
  eq(charges(h), 1, 'a6: dentro, el Orbe da 1 Carga al golpear');
  h.hit(e, { skill: 'm_u_desgarro', elem: 'arcane' });
  eq(charges(h), 2, 'a6: el Desgarro en el mismo instante, solo la de la mecánica (como mucho 1 cada 0,5 s)');
  h.tick(0.4); h.hit(e, { skill: 'a_orbe', elem: 'arcane' });
  eq(charges(h), 2, 'a6: a los 0,4 s, aún no');
  h.tick(0.1); h.hit(e, { skill: 'm_u_desgarro', elem: 'arcane' });
  eq(charges(h), 4, 'a6: a los 0,5 s, el Desgarro da 2 (la mecánica y a6)');
}
// a7 Grieta Abierta: al terminar el Desgarro, la grieta queda 1 + rango s (40 %/s) donde estaba la del
// haz (S-maga: en el haz, donde apuntas; ni en el enemigo golpeado el último ni al final de los 10 m)
{
  const h = sp('arcanista', { a7: 2 }), e = h.enemy({ hp: 1e9, pos: [5, 0, 0] });
  h.aim(5, 0.8);
  cast(h, 'k4', 'm_u_desgarro', 3.2);
  const f = h.g.fields.find(x => x.kind === 'a_grieta');
  const ax = 5, az = 0.8;   // la mira (a 5 m, dentro del haz de 10 m)
  ok(f && f.dur === 3 && Math.hypot(f.pos.x - ax, f.pos.z - az) < 0.05 && Math.abs(f.data.dps - h.p.avgHit(0.4, prof(h, 'm_u_desgarro').addPct)) <= 1, `a7 r2: grieta de 3 s al 40 %/s donde apuntaba el haz (${f?.pos.x.toFixed(2)}, ${f?.pos.z.toFixed(2)})`);
  e.pos.set(5, 0, 0);
  const log = spy(h); h.tick(1.05);
  ok(log.some(x => x.e === e && x.source === 'field:a_grieta' && x.dot), 'a7: la grieta daña');
}
// Rayo con Haz Concentrado (rayo_ii; S-maga: un canal SIN FIN con el 1.er tic al pulsar, uno cada 0,2 s,
// que gasta las Cargas en su 1.er tic): sus repeticiones (a8A, a25) no son otro canal (g.castEcho no repite
// canales y un canal es de la heroína) sino un haz propio con los tics de un segundo de canal (5), que no te
// ata y lleva las Cargas del original
function hazRun(ranks, choice = {}, hold = 1.0) {
  const h = sp('arcanista', ranks, choice);
  h.p.skillForge = { rayo: 'ii' }; h.p.recompute(); h.p.mp = h.p.stats.maxMP;
  h.p.stats.critRaw = -1000;
  const e = h.enemy({ hp: 1e12, pos: [4, 0, 0] });
  const log = spy(h);
  h.gauge('cargas', 4); h.aim(4, 0);
  h.setHeld('rmb', true);                           // el canal es mantenido: sin el botón, se suelta
  cast(h, 'rmb', 'rayo', hold);                     // 6 tics (0 · 0,2 · … · 1 s) con las 4 Cargas del 1.er tic
  const spentAt0 = charges(h);
  h.release('rmb');
  const own = from(log, 'rayo', e).filter(x => !x.echo);
  return { h, e, log, own, spentAt0 };
}
// a8A Rayo Doble (con 4 Cargas, se repite al 50 % con las mismas Cargas) · a8B Rayo Recargado (1 Carga por enemigo, hasta 2)
{
  const h = sp('arcanista', { a8: 1 }, { a8: 'A' });
  const e = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  h.p.stats.critRaw = -1000;                         // sin críticos: la copia vale la mitad exacta
  const ech = spyFree(h), log = spy(h);
  h.gauge('cargas', 3); h.aim(4, 0); cast(h, 'rmb', 'rayo', 0.5);
  eq(ech.length, 0, 'a8A: con 3 Cargas, una vez');
  h.gauge('cargas', 4); h.p.cds.rayo = 0;
  cast(h, 'rmb', 'rayo', 0.5);
  ok(ech.length === 1 && ech[0].id === 'rayo' && ech[0].mult === 0.5, 'a8A: con 4, se repite al 50 %');
  const hits = from(log, 'rayo', e);
  const echo = hits[hits.length - 1], orig = hits[hits.length - 2];
  ok(echo.echo && Math.abs(echo.raw / orig.raw - 0.5) <= 0.01, `a8A: la copia lleva las 4 Cargas (${echo.raw}/${orig.raw})`);
  const r = sp('arcanista', { a8: 1 }, { a8: 'B' });
  for (const x of [3, 4, 5]) r.enemy({ hp: 1e9, pos: [x, 0, 0] });
  r.gauge('cargas', 4); r.aim(5, 0); cast(r, 'rmb', 'rayo', 0.05);
  eq(charges(r), 2, 'a8B: atraviesa a 3 → te devuelve 2 (tras gastarlas)');
  // con Haz Concentrado: la copia sale a los 0,25 s de soltar el canal (1,25 s) y no te ata: a los
  // 1,3 s no canalizas ni estás bloqueada, vuelves a lanzar el Rayo y la copia no lo corta
  const z = hazRun({ a8: 1 }, { a8: 'A' });
  ok(z.own.length === 6 && z.spentAt0 === 0, `Haz Concentrado: 6 tics en 1 s con las 4 Cargas, gastadas en el 1.er tic (${z.own.length}, ${z.spentAt0})`);
  z.h.step(0.3);
  ok(!z.h.g.channelInfo() && !(z.h.p.castLock > 0), 'a8A con Haz Concentrado: la copia no es otro canal (no te ata)');
  z.h.p.cds.rayo = 0; z.h.p.gcdT = 0; z.h.p.actionLockT = 0;
  ok(z.h.press('rmb') && z.h.g.channelInfo()?.id === 'rayo', 'a8A con Haz Concentrado: vuelves a canalizar el Rayo mientras la copia golpea');
  z.h.step(1.6);
  const copy = from(z.log, 'rayo', z.e).filter(x => x.echo), mine = from(z.log, 'rayo', z.e).filter(x => !x.echo);
  ok(copy.length === 5 && copy.every(x => Math.abs(x.raw / z.own[0].raw - 0.5) <= 0.01), `a8A con Haz Concentrado: la copia da 5 tics al 50 % con las 4 Cargas (${copy.map(x => x.raw)} / ${z.own[0].raw})`);
  eq(mine.length, 6 + 9, 'a8A con Haz Concentrado: tu segundo canal da sus 9 tics en 1,6 s (la copia no lo corta ni lo sustituye)');
}
// a9A Orbe Cargado (+20 % por Carga) · a9B Orbe Atrayente (arrastra a su camino a los de 3 m)
{
  const h = sp('arcanista', { a9: 1 }, { a9: 'A' }), e = h.enemy({ hp: 1e9 });
  h.gauge('cargas', 3);
  eq(firePower('condAdd', h.p, h.p, e, { skill: 'a_orbe' }), 60, 'a9A: +60 % con 3 Cargas');
  eq(charges(h), 3, 'a9A: sin gastarlas');
  // a9B (S-maga): al detenerse el Orbe (a 8 m), un vórtice atrae hacia él a los de 4 m (los deja a 1 m);
  // al pasar no arrastra a nadie, ni al lejano
  const a = sp('arcanista', { a9: 1 }, { a9: 'B' });
  const path = a.enemy({ hp: 1e9, pos: [4, 0, 3.2] }), side = a.enemy({ hp: 1e9, pos: [8, 0, 3.5] }), far = a.enemy({ hp: 1e9, pos: [8, 0, 7] });
  a.aim(8, 0);
  cast(a, 'k3', 'a_orbe', 1.2);
  ok(Math.abs(side.pos.z - 3.5) < 0.6 && Math.abs(path.pos.z - 3.2) < 0.6, `a9B: mientras viaja, no arrastra (${path.pos.z.toFixed(2)}, ${side.pos.z.toFixed(2)})`);
  a.step(0.4);
  const d = Math.hypot(side.pos.x - 8, side.pos.z);
  ok(d < 1.5 && Math.abs(far.pos.z - 7) < 0.6, `a9B: al detenerse atrae al de 3,5 m hasta su lado (${d.toFixed(2)} m), no al de 7 m`);
  const b9 = sp('arcanista'), bs = b9.enemy({ hp: 1e9, pos: [8, 0, 3.5] });
  b9.aim(8, 0); cast(b9, 'k3', 'a_orbe', 1.6);
  ok(Math.hypot(bs.pos.x - 8, bs.pos.z) > 2.5, 'sin a9B el Orbe no atrae');
}
// a10A Desgarro Fijo (+8 % cada medio segundo quieta, hasta +48 %) · a10B Desgarro Voraz (3 de maná por golpe y 1 Carga por segundo)
{
  const h = sp('arcanista', { a10: 1 }, { a10: 'A' }), e = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  h.aim(4, 0);
  cast(h, 'k4', 'm_u_desgarro', 1.6);
  ok(firePower('condAdd', h.p, h.p, e, { skill: 'm_u_desgarro' }) >= 24, 'a10A: quieta, el Desgarro gana daño');
  h.p.pos.x += 1; h.tick(0.1);
  eq(firePower('condAdd', h.p, h.p, e, { skill: 'm_u_desgarro' }), 0, 'a10A: al moverte, vuelve a 0');
  // tope: +48 % (con Grieta Eterna el canal pasa de 3 s)
  const fx6 = sp('arcanista', { a10: 1, a27: 1 }, { a10: 'A' }), fe = fx6.enemy({ hp: 1e12, pos: [4, 0, 0] });
  fx6.aim(4, 0);
  cast(fx6, 'k4', 'm_u_desgarro', 4.6);
  ok(fx6.g._channel, 'a10A: con Grieta Eterna sigue canalizando a los 4,6 s');
  eq(firePower('condAdd', fx6.p, fx6.p, fe, { skill: 'm_u_desgarro' }), 48, 'a10A: hasta +48 % (no sigue subiendo)');
  fx6.g.cancelCast('dodge');
  const v = sp('arcanista', { a10: 1 }, { a10: 'B' }), b = sp('arcanista');
  for (const x of [v, b]) { x.enemy({ hp: 1e9, pos: [4, 0, 0] }); x.aim(4, 0); x.p.mp = 0; }
  cast(v, 'k4', 'm_u_desgarro', 3.2); cast(b, 'k4', 'm_u_desgarro', 3.2);
  ok(v.p.mp - b.p.mp >= 6 * 3 - 1e-6, `a10B: +3 de maná por golpe (${(v.p.mp - b.p.mp).toFixed(1)})`);
  const v2 = sp('arcanista', { a10: 1 }, { a10: 'B' }), b2 = sp('arcanista');
  for (const x of [v2, b2]) { x.enemy({ hp: 1e9, pos: [20, 0, 0] }); x.aim(20, 0); }
  cast(v2, 'k4', 'm_u_desgarro', 2.95); cast(b2, 'k4', 'm_u_desgarro', 2.95);
  eq(charges(v2) - charges(b2), 2, 'a10B: y 1 Carga por segundo de canal');
}
// a12 Inercia (S-maga): cada descarga del Orbe que golpea recarga 0,1 × rango s del Rayo, hasta rango s por orbe
{
  const h = sp('arcanista', { a12: 2 });
  h.enemy({ hp: 1e9, pos: [3, 0, 0] });
  h.aim(3, 0);
  cast(h, 'k3', 'a_orbe', 0.05);
  const orb = magaOrbs(h.p)[0];
  h.p.cds.rayo = 30;
  h.step(0.55);                                     // 2 descargas (0,25 y 0,5 s)
  near(30 - h.p.cds.rayo, 0.55 + 2 * 0.2, 0.06, `a12 r2: 2 descargas → −0,4 s al Rayo (${(30 - h.p.cds.rayo - 0.55).toFixed(2)})`);
  h.step(3);
  ok(orb.zapHits > 10, `a12: el orbe descarga más de 10 veces (${orb.zapHits})`);
  near(30 - h.p.cds.rayo, 3.55 + 2, 0.06, 'a12 r2: como mucho 2 s por orbe');
  const b = sp('arcanista'); b.enemy({ hp: 1e9, pos: [3, 0, 0] }); b.aim(3, 0); cast(b, 'k3', 'a_orbe', 0.05);
  b.p.cds.rayo = 30; b.step(0.55);
  near(30 - b.p.cds.rayo, 0.55, 0.02, 'sin a12 las descargas no recargan el Rayo');
}
// a14 Maná Inagotable: canalizando el Desgarro, +2 % de maná por segundo
{
  const h = sp('arcanista', { a14: 1 }), b = sp('arcanista');
  for (const x of [h, b]) { x.enemy({ hp: 1e9, pos: [4, 0, 0] }); x.aim(4, 0); x.p.mp = 0; }
  cast(h, 'k4', 'm_u_desgarro', 3.2); cast(b, 'k4', 'm_u_desgarro', 3.2);
  near(h.p.mp - b.p.mp, h.p.stats.maxMP * 0.02 * 3, h.p.stats.maxMP * 0.01, 'a14: +2 %/s mientras canaliza');
  // texto aprobado en el punto 17 (divergencia spec.arcanista.a14.d): el Desgarro no cuesta maná y
  // Grieta Eterna sigue gastando su 3 %/s, así que «no gastas maná» no describía nada
  ok(nodeText('a14') === 'Mientras canalizas el Desgarro recuperas un 2 % de maná por segundo', 'a14: el texto dice lo que hace (recuperas un 2 %/s; no «no gastas maná»)');
}
// a15A Desplazamiento (golpe > 20 %: te teletransporta 5 m sin daño; cada 30 s) · a15B Velo Arcano (−12 % con 3+)
{
  const h = sp('arcanista', { a15: 1 }, { a15: 'A' }), e = h.enemy({ hp: 1e9, pos: [-2, 0, 0] });
  const hp = h.p.hp;
  h.p.takeDamage(h.p.stats.maxHP * 0.3, 1, { source: e });
  ok(h.p.hp === hp && Math.abs(h.p.pos.x - 5) < 0.3, 's15A: sin daño y 5 m lejos del golpe');
  h.p.takeDamage(h.p.stats.maxHP * 0.3, 1, { source: e });
  ok(h.p.hp < hp, 'a15A: una vez cada 30 s');
  for (const [wait, safe] of [[29.5, false], [30.5, true]]) {
    const d = sp('arcanista', { a15: 1 }, { a15: 'A' }), de = d.enemy({ hp: 1e9, pos: [-2, 0, 0] });
    d.p.takeDamage(d.p.stats.maxHP * 0.3, 1, { source: de });
    d.tick(wait); d.p.hp = d.p.stats.maxHP; d.p.invulnT = 0;
    d.p.takeDamage(d.p.stats.maxHP * 0.3, 1, { source: de });
    eq(d.p.hp === d.p.stats.maxHP, safe, `a15A: a los ${wait} s ${safe ? 'vuelve a salvarte' : 'aún no'}`);
  }
  const small = sp('arcanista', { a15: 1 }, { a15: 'A' }), hp2 = small.p.hp;
  small.p.takeDamage(small.p.stats.maxHP * 0.1, 1, {});
  ok(small.p.hp < hp2 && small.p.pos.x === 0, 'a15A: un golpe pequeño, no');
  const v = sp('arcanista', { a15: 1 }, { a15: 'B' }), b = sp('arcanista');
  v.gauge('cargas', 3); b.gauge('cargas', 3);
  v.p.takeDamage(200, 1, {}); b.p.takeDamage(200, 1, {});
  near((v.p.stats.maxHP - v.p.hp) / (b.p.stats.maxHP - b.p.hp), 0.88, 0.02, 'a15B: −12 % con 3 Cargas');
}
// a16 Resonancia: con 4 Cargas no se pierden y +6 % de crítico por rango
{
  const h = sp('arcanista', { a16: 2 }), e = h.enemy({ hp: 1e9 });
  h.gauge('cargas', 3);
  eq(firePower('condCrit', h.p, h.p, e, {}), 0, 'a16: con 3, nada');
  h.gauge('cargas', 4);
  eq(firePower('condCrit', h.p, h.p, e, {}), 12, 'a16 r2: +12 % con 4');
  h.tick(8);
  eq(charges(h), 4, 'a16: con 4, no se pierden');
  ok(h.gaugeView().state === 'active', 'a16: la barra muestra Resonancia');
}
// a17 Sello Viviente: el Sello dura 8 + 2 × rango s y te sigue
{
  // 8 → 12 s sobre el Sello base; a Nv70 se suma a la Mejora (Sello Firme, +2 s): 10 → 14 s
  const h = sp('arcanista', { a17: 2 });
  eq(prof(h, 'a_sello').dur - prof(sp('arcanista'), 'a_sello').dur, 4, 'a17 r2: +4 s (8 → 12 s)');
  absPending('a17', prof(h, 'a_sello').dur);
  cast(h, 'k2', 'a_sello', 0.05);
  h.p.pos.set(6, 0, 0); h.tick(0.2);
  const f = h.g.fields.find(x => x.kind === 'aura' && x.data.buffId === 'a_sello');
  ok(f && Math.abs(f.pos.x - 6) < 1e-6, 'a17: el Sello te sigue');
  const b = sp('arcanista'); cast(b, 'k2', 'a_sello', 0.05); b.p.pos.set(6, 0, 0); b.tick(0.2);
  ok(b.g.fields.find(x => x.kind === 'aura').pos.x === 0, 'sin a17 se queda donde lo dibujaste');
}
// a18 Carga Final: un Rayo con 4 Cargas te devuelve 1 por rango
{
  const h = sp('arcanista', { a18: 2 });
  h.enemy({ hp: 1e9, pos: [4, 0, 0] }); h.aim(4, 0);
  h.gauge('cargas', 3); cast(h, 'rmb', 'rayo', 0.05);
  eq(charges(h), 0, 'a18: con 3, nada');
  h.gauge('cargas', 4); h.p.cds.rayo = 0; cast(h, 'rmb', 'rayo', 0.05);
  eq(charges(h), 2, 'a18 r2: con 4, te devuelve 2');
}
// a19 Satélite (S-maga, M-01: propuesta del dueño): cada 3.er Orbe LANZADO (⑦ onCast marca cast.orbit), al
// VOLVER (③ afterCast) no se absorbe aún y se queda girando 8 s (20 % por rango y golpe). Sin un orbe que haya
// vuelto (orbited: lo pone orbEnd), nada. El recorrido real y la Carga al acabar la órbita (decisión del
// dueño M4) los prueba test-sensacion-maga O10 y O11
{
  const h = sp('arcanista', { a19: 2 });
  const foe = h.enemy({ hp: 1e9, pos: [1.8, 0, 0] });
  const log = spy(h);
  const orbCast = (back = true) => { const c = { sk: { id: 'a_orbe' } }; firePower('onCast', h.p, h.g, h.p, c); c.orbs = [{ orbited: back && !!c.orbit }]; return c; };
  for (let i = 0; i < 2; i++) { const c = orbCast(); ok(!c.orbit?.satelite, `a19: el Orbe ${i + 1} no se queda`); firePower('afterCast', h.p, h.g, h.p, c, {}); }
  h.tick(2);
  eq(procs(log, 'power:a_satelite').length, 0, 'a19: con 2 Orbes de vuelta, nada');
  const lost = orbCast(false);
  ok(lost.orbit?.satelite, 'a19: el 3.er Orbe lanzado se marca para quedarse en órbita');
  firePower('afterCast', h.p, h.g, h.p, lost, {});
  h.tick(1);
  eq(procs(log, 'power:a_satelite').length, 0, 'a19: si ese Orbe no volvió (cambio de zona), no hay satélite');
  orbCast(); orbCast();
  const c3 = orbCast();
  firePower('afterCast', h.p, h.g, h.p, c3, {});
  h.tick(3);
  const hits = procs(log, 'power:a_satelite');
  ok(hits.length >= 2 && hits.every(x => x.e === foe) && Math.abs(hits[0].dealt - h.p.avgHit(0.4, 0)) <= 2, `a19 r2: el satélite golpea al 40 % (${hits.length})`);
  h.tick(3);
  const n1 = procs(log, 'power:a_satelite').length; h.tick(1.7);   // da una vuelta cada 1,5 s
  ok(procs(log, 'power:a_satelite').length > n1, 'a19: entre los 6 y los 7,7 s sigue golpeando (dura 8 s)');
  h.tick(0.6);
  const n = procs(log, 'power:a_satelite').length; h.tick(2);
  eq(procs(log, 'power:a_satelite').length, n, 'a19: dura 8 s');
}
// a20 Agudeza: con 3 o más Cargas, lanzas un 7 % más rápido por rango
{
  const h = sp('arcanista', { a20: 2 });
  const t0 = h.p.stats.atkTime;
  h.gauge('cargas', 3); h.tick(0.1);
  ok(h.p.buffs.some(b => b.id === 'a_agudeza' && b.stats.aspdPct === 14) && h.p.stats.atkTime < t0, 'a20 r2: +14 % de velocidad con 3 Cargas');
  h.gauge('cargas', 2); h.tick(0.6);
  ok(!h.p.buffs.some(b => b.id === 'a_agudeza') && Math.abs(h.p.stats.atkTime - t0) < 1e-9, 'a20: con 2, se va');
}
// a21 Doble Grieta: el Rayo lanzado DURANTE el Desgarro (una principal instantánea sale sobre el
// canal de una definitiva imparable sin cortarlo, cola W2d) abre otra grieta al 50 % donde apuntas
// el resto del canal. Con el canal real. El 50 % es del daño por segundo del canal: su golpe CON
// RANGO (Nv70: rango 5) entre su intervalo; a Nv20 (rango 1), el del catálogo
{
  const run = (ranks, level = 70) => {
    const h = sp('arcanista', ranks, {}, { level });
    const e = h.enemy({ hp: 1e9, pos: [6, 0, 0] });
    h.aim(6, 0);
    cast(h, 'rmb', 'rayo', 0.3);
    const before = h.g.fields.filter(f => f.kind === 'a_grieta').length;
    cast(h, 'k4', 'm_u_desgarro', 1.2);                // entre dos golpes: le quedan 1,8 s (4 golpes)
    const ch = h.g.channelInfo();
    ok(ch?.id === 'm_u_desgarro' && ch.unstoppable && ch.left > 1, 'canalizas el Desgarro (imparable)');
    h.p.cds.rayo = 0; h.p.gcdT = 0; h.p.atkCd = 0; h.p.mp = h.p.stats.maxMP;
    const log = spy(h);
    const at0 = { x: e.pos.x, z: e.pos.z };          // los golpes del Desgarro lo van apartando
    const fired = h.cast('rmb');
    return { h, e, at0, before, ch, fired, log, after: h.g.channelInfo(), rift: h.g.fields.find(x => x.kind === 'a_grieta' && !x.dead) };
  };
  const r = run({ a21: 1, a13: 2 });                // a13: el Desgarro +30 % (saco aditivo de la grieta)
  eq(r.before, 0, 'a21: el Rayo sin canalizar no abre grieta');
  ok(r.fired && from(r.log, 'rayo', r.e).length === 1, 'a21: el Rayo sale y golpea durante el Desgarro');
  ok(r.after?.id === 'm_u_desgarro' && Math.abs(r.after.left - r.ch.left) < 1e-6, 'a21: sin cortar el canal');
  ok(r.rift && Math.hypot(r.rift.pos.x - r.at0.x, r.rift.pos.z - r.at0.z) < 0.05, 'a21: la segunda grieta se abre sobre el enemigo de la mira');
  near(r.rift?.dur, r.ch.left, 1e-6, 'a21: dura lo que le queda al canal');
  const dp = prof(r.h, 'm_u_desgarro');
  ok(dp.rank === 5 && Math.abs(dp.coef - 0.65 * 1.4) < 1e-9 && dp.addPct === 30, `a21: a Nv70 el Desgarro está en rango 5 (${dp.coef} por golpe, +${dp.addPct} %)`);
  near(r.rift?.data.dps, r.h.p.avgHit(dp.coef / r.ch.interval * 0.5, dp.addPct), 2, 'a21: al 50 % del Desgarro (su golpe con rango cada 0,25 s)');
  // S0 (T6): el kit de la especialización cuenta el rango desde el Nv10, así que el rango 1 es hasta el 17
  const lo = run({ a21: 1 }, 17), dl = prof(lo.h, 'm_u_desgarro');
  ok(dl.rank === 1 && dl.coef === 0.65, 'a21: a Nv17 el Desgarro está en rango 1 (0,65 por golpe)');
  near(lo.rift?.data.dps, lo.h.p.avgHit(0.65 / 0.25 * 0.5, dl.addPct), 2, 'a21 a Nv17: al 50 % del Desgarro (0,65 cada 0,25 s)');
  const n = run({});
  ok(n.fired && !n.rift, 'sin a21, el Rayo sale durante el Desgarro pero no abre grieta');
}
// a22 Cargas Desbordadas: máximo 4 + rango; las que pasan de 4 dan el doble al Rayo
{
  const h = sp('arcanista', { a22: 2 }), e = h.enemy({ hp: 1e9 });
  for (let i = 0; i < 8; i++) h.hit(e, DART);
  eq(charges(h), 6, 'a22 r2: hasta 6 Cargas');
  eq(firePower('condAdd', h.p, h.p, e, RAYO), 35 * (4 + 2 * 2), 'a22: las 2 de más cuentan doble');
}
// a23 Orbe Múltiple: cada 3.er Orbe sale con 1 orbe más por rango (40 %)
{
  const h = sp('arcanista', { a23: 2 });
  h.enemy({ hp: 1e9, pos: [4, 0, 0] }); h.aim(4, 0);
  const ech = spyFree(h);
  for (let i = 0; i < 2; i++) cast(h, 'k3', 'a_orbe', 0.2);
  eq(ech.length, 0, 'a23: los dos primeros, solos');
  cast(h, 'k3', 'a_orbe', 0.3);
  ok(ech.length === 2 && ech.every(x => x.id === 'a_orbe' && x.mult === 0.4 && x.ok), 'a23 r2: el 3.º sale con 2 orbes al 40 %');
  // en abanico: a la misma distancia que la mira (4 m), uno a cada lado (±0,35 rad)
  const ang = ech.map(x => Math.atan2(x.at.x - h.p.pos.x, x.at.z - h.p.pos.z) - Math.atan2(4 - h.p.pos.x, -h.p.pos.z));
  ok(ech.every(x => Math.abs(Math.hypot(x.at.x - h.p.pos.x, x.at.z - h.p.pos.z) - 4) < 1e-6) && Math.abs(Math.abs(ang[0]) - 0.35) < 1e-6 && Math.abs(ang[0] + ang[1]) < 1e-6, `a23: los orbes extra salen en abanico, uno a cada lado (${ang.map(a => a.toFixed(2))} rad)`);
  // S-maga: son PEQUEÑOS (descargan a 2,5 m y la malla al 60 %); el tuyo, normal (4,5 m con Orbe Grande)
  const live = magaOrbs(h.p), small = live.filter(o => o.small), big = live.filter(o => !o.small);
  ok(small.length === 2 && small.every(o => o.P.radius === 2.5 && Math.abs(o.scale / big[big.length - 1].scale - 0.6) < 1e-9) && big[big.length - 1].P.radius === 4.5,
    `a23: los orbes extra descargan a 2,5 m (${small.map(o => o.P.radius)}; el tuyo ${big.at(-1)?.P.radius})`);
}
// a24 Fuente de Maná: canalizando, cada segundo 1 Carga y +5 % por rango (hasta 3 veces)
{
  const h = sp('arcanista', { a24: 2 }), b = sp('arcanista');
  for (const x of [h, b]) { x.enemy({ hp: 1e9, pos: [20, 0, 0] }); x.aim(20, 0); }
  cast(h, 'k4', 'm_u_desgarro', 2.95); cast(b, 'k4', 'm_u_desgarro', 2.95);
  eq(charges(h) - charges(b), 2, 'a24: 1 Carga por segundo canalizando (sin golpear a nadie)');
  ok(h.p.buffs.some(x => x.id === 'a_fuente' && x.stats.dmgPct === 20), 'a24 r2: +10 % por segundo (2 s → +20 %)');
  // tope: 3 veces (con Grieta Eterna el canal pasa de 3 s)
  const l = sp('arcanista', { a24: 2, a27: 1 });
  l.enemy({ hp: 1e12, pos: [20, 0, 0] }); l.aim(20, 0);
  cast(l, 'k4', 'm_u_desgarro', 5.1);
  ok(l.g._channel && l.p.buffs.some(x => x.id === 'a_fuente' && x.stats.dmgPct === 30), 'a24 r2: a los 5 s, +30 % (hasta 3 veces)');
  l.g.cancelCast('dodge');
}
// a25 Tormenta de Cargas (final): gastar 4+ → el Rayo se lanza 3 veces (100/50/50 %) en 1,5 s; r2–3 +15 %
{
  const h = sp('arcanista', { a25: 3 }), b = sp('arcanista');
  eq(prof(h, 'rayo').addPct - prof(b, 'rayo').addPct, 30, 'a25 r3: Rayo +30 %');
  h.enemy({ hp: 1e9, pos: [4, 0, 0] }); h.aim(4, 0);
  const ech = spyFree(h);
  h.gauge('cargas', 4); cast(h, 'rmb', 'rayo', 1.7);
  ok(ech.length === 2 && ech.every(x => x.id === 'rayo' && x.mult === 0.5 && x.ok) && Math.abs(ech[1].t - ech[0].t - 0.75) < 0.05, 'a25: dos repeticiones al 50 % (0,75 y 1,5 s)');
  // con Haz Concentrado: dos copias de 3 tics al 50 % con las 4 Cargas, sin canal (no te atan)
  const z = hazRun({ a25: 1 });
  z.h.step(1);
  ok(!z.h.g.channelInfo() && !(z.h.p.castLock > 0), 'a25 con Haz Concentrado: las copias no son otro canal');
  z.h.step(2.2);
  const copy = from(z.log, 'rayo', z.e).filter(x => x.echo);
  ok(copy.length === 10 && copy.every(x => Math.abs(x.raw / z.own[0].raw - 0.5) <= 0.01), `a25 con Haz Concentrado: 2 copias × 5 tics al 50 % con las 4 Cargas (${copy.length})`);
}
// a26 Constelación (final): tus Orbes se quedan 8 s girando (hasta 3) y disparan al más cercano (40 %)
{
  const h = sp('arcanista', { a26: 2 }), b = sp('arcanista');
  eq(prof(h, 'a_orbe').addPct - prof(b, 'a_orbe').addPct, 15, 'a26 r2: Orbe +15 %');
  const e = h.enemy({ hp: 1e9, pos: [5, 0, 0] });
  const log = spy(h);
  // S-maga (M-01): ⑦ marca el lanzamiento y ③ pone en órbita los orbes que volvieron (orbited)
  const orbCast = back => { const c = { sk: { id: 'a_orbe' } }; firePower('onCast', h.p, h.g, h.p, c); c.orbs = [{ orbited: back && !!c.orbit?.constelacion }]; firePower('afterCast', h.p, h.g, h.p, c, {}); };
  orbCast(false);
  h.tick(1.05);
  eq(procs(log, 'power:a_constelacion').length, 0, 'a26: un Orbe que no volvió no se queda');
  for (let i = 0; i < 4; i++) orbCast(true);
  h.tick(1.05);
  const shots = procs(log, 'power:a_constelacion');
  ok(shots.length === 3 && shots.every(x => x.e === e) && Math.abs(shots[0].dealt - h.p.avgHit(0.4, prof(h, 'a_orbe').addPct)) <= 2, 'a26: hasta 3 orbes; cada uno dispara al 40 % por segundo');
  h.tick(8);
  const n = procs(log, 'power:a_constelacion').length; h.tick(2);
  eq(procs(log, 'power:a_constelacion').length, n, 'a26: duran 8 s');
}
// a27 Grieta Eterna (final): el Desgarro dura mientras tengas maná (3 %/s, también con Maná Inagotable)
{
  const h = sp('arcanista', { a27: 2 }), b = sp('arcanista');
  eq(prof(h, 'm_u_desgarro').addPct - prof(b, 'm_u_desgarro').addPct, 15, 'a27 r2: Desgarro +15 %');
  for (const x of [h, b]) { x.enemy({ hp: 1e12, pos: [4, 0, 0] }); x.aim(4, 0); x.p.mp = x.p.stats.maxMP / 2; }
  cast(h, 'k4', 'm_u_desgarro', 2.9); cast(b, 'k4', 'm_u_desgarro', 2.9);
  near(b.p.mp - h.p.mp, h.p.stats.maxMP * 0.03 * 2.9, h.p.stats.maxMP * 0.01, 'a27: gasta un 3 % del maná por segundo');
  h.step(2.1); b.step(0.3);
  ok(h.g._channel && !b.g._channel, 'a27: a los 5 s sigue canalizando (sin él, acaba a los 3 s)');
  h.p.mp = 0; h.step(1.5);
  ok(!h.g._channel, 'a27: sin maná, se acaba');
  // la prórroga empieza con dos golpes o menos por delante (S-maga: un golpe cada 0,25 s): a 2,3 s (le
  // quedan 0,7 s, 3 golpes) el canal aún dura 3 s; a 2,6 s (pasó por 0,5 s: 2 golpes) ya dura uno más
  const u = sp('arcanista', { a27: 1 });
  u.enemy({ hp: 1e12, pos: [4, 0, 0] }); u.aim(4, 0);
  cast(u, 'k4', 'm_u_desgarro', 2.3);
  const c1 = u.g.channelInfo();
  u.step(0.3);
  const c2 = u.g.channelInfo();
  ok(c1 && Math.abs(c1.dur - 3) < 1e-6 && c2 && Math.abs(c2.dur - 3.25) < 1e-6, `a27: alarga un golpe cuando le quedan dos o menos (${c1?.dur} → ${c2?.dur} s)`);
  u.g.cancelCast('dodge');
  // con Maná Inagotable el 3 % se sigue gastando: a14 solo devuelve su 2 %/s (doc 2g §12)
  const f = sp('arcanista', { a27: 1, a14: 1 }), m = sp('arcanista', { a14: 1 });
  for (const x of [f, m]) { x.enemy({ hp: 1e12, pos: [4, 0, 0] }); x.aim(4, 0); x.p.mp = x.p.stats.maxMP / 2; }
  cast(f, 'k4', 'm_u_desgarro', 2.9); cast(m, 'k4', 'm_u_desgarro', 2.9);
  near(m.p.mp - f.p.mp, f.p.stats.maxMP * 0.03 * 2.9, f.p.stats.maxMP * 0.01, 'a27 + a14: Maná Inagotable no anula el gasto del 3 %');
  f.g.cancelCast('dodge');
  // sin la regeneración natural (que calibra B1), la combinación pierde un 1 %/s: el canal acaba
  const z = sp('arcanista', { a27: 1, a14: 1 });
  z.enemy({ hp: 1e12, pos: [4, 0, 0] }); z.aim(4, 0);
  z.p.stats.regenPct = -100; z.p.mp = z.p.stats.maxMP * 0.05;
  cast(z, 'k4', 'm_u_desgarro', 4.5);
  ok(z.g._channel, 'a27 + a14: a los 4,5 s sigue canalizando (alarga mientras queda maná)');
  z.step(4.5);
  ok(!z.g._channel && z.p.mp < 1, 'a27 + a14: sin maná, el canal acaba');
}
// a28 Singularidad (ápice, 4 rangos)
{
  // 1) un Rayo con 4 Cargas abre una grieta 3 s en el objetivo (50 %/s)
  const h = sp('arcanista', { a28: 1 }), e = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  h.aim(4, 0);
  h.gauge('cargas', 3); cast(h, 'rmb', 'rayo', 0.05);
  eq(h.g.fields.filter(f => f.kind === 'a_grieta').length, 0, 'a28.1: con 3, nada');
  h.gauge('cargas', 4); h.p.cds.rayo = 0; cast(h, 'rmb', 'rayo', 0.05);
  const f = h.g.fields.find(x => x.kind === 'a_grieta');
  ok(f && f.dur === 3 && Math.abs(f.pos.x - e.pos.x) < 1e-6 && Math.abs(f.data.dps - h.p.avgHit(0.5, prof(h, 'm_u_desgarro').addPct)) <= 2, 'a28.1: grieta de 3 s al 50 %/s');
  // 2) matar a un élite da 4 Cargas · 3) no se pierden
  const h3 = sp('arcanista', { a28: 3 });
  kill(h3.enemy({ hp: 1e9, rank: 'elite' }));
  eq(charges(h3), 4, 'a28.2: +4 Cargas por élite');
  h3.tick(20);
  eq(charges(h3), 4, 'a28.3: las Cargas ya no se pierden');
  // 4) cada 20 Cargas gastadas, un Desgarro propio de 2 s (S-maga: 8 golpes reales del haz ancho, cada 0,25 s,
  // con la rampa del canal: +10 % por golpe)
  const h4 = sp('arcanista', { a28: 4 }), t = h4.enemy({ hp: 1e12, pos: [4, 0, 0] });
  h4.aim(4, 0);
  const log = spy(h4);
  for (let i = 0; i < 5; i++) { h4.gauge('cargas', 4); h4.p.cds.rayo = 0; cast(h4, 'rmb', 'rayo', 0.1); }
  h4.step(2.2);
  const beams = from(log, 'm_u_desgarro', t).filter(x => !x.proc && !x.dot);
  eq(beams.length, 8, 'a28.4: 20 Cargas gastadas → 8 golpes de Desgarro en 2 s');
  // cada golpe, el del canal CON RANGO (Nv70: rango 5) y su rampa; con Quiebre (no canaliza: un pulso de
  // 900 %), el del catálogo con su rango (0,65 × 1,4), no el del pulso
  // cached: con el perfil en la caché de resolveSkill (como en partida, donde la barra lo resuelve)
  const strike = (forge = null, cached = false) => {
    const x = sp('arcanista', { a28: 4 }), e = x.enemy({ hp: 1e12, pos: [4, 0, 0] });
    if (forge) { x.p.skillForge = { m_u_desgarro: forge }; x.p.recompute(); x.p.mp = x.p.stats.maxMP; }
    x.p.stats.critRaw = -1000; x.aim(4, 0);
    const lx = spy(x);
    for (let i = 0; i < 5; i++) { if (cached) resolveSkill(x.p, sk(x, 'm_u_desgarro')); x.gauge('cargas', 4); x.p.cds.rayo = 0; cast(x, 'rmb', 'rayo', 0.1); }
    x.step(2.2);
    const got = from(lx, 'm_u_desgarro', e).filter(y => !y.proc && !y.dot);
    const dp = prof(x, 'm_u_desgarro');
    const want = got.map((_, i) => x.p.rollDamage(0.65 * 1.4 * (1 + 0.1 * i), 0, dp.addPct, e, { skill: 'm_u_desgarro', tags: new Set(['arcane']), elem: 'arcane' }).dmg);
    return { got, dp, want };
  };
  const base = strike(), qb = strike('ii', true);
  const same = r => r.got.length === 8 && r.got.every((y, i) => Math.abs(y.raw - r.want[i]) <= 1);
  ok(Math.abs(base.dp.coef - 0.65 * 1.4) < 1e-9 && same(base), `a28.4: cada golpe, el del Desgarro con rango y rampa (${base.got.map(y => y.raw)} ≈ ${base.want})`);
  ok(qb.dp.coef > 9 && same(qb), `a28.4 con Quiebre: el golpe del canal (0,65 × rango), no el del pulso (${qb.got.map(y => y.raw)} ≈ ${qb.want})`);
}
console.log('✓ Arcanista: cada nodo con su efecto (Cargas, Rayo, Orbe, Desgarro y finales por rango)');

// ------------------------------------------------------------ 5) cobertura
// cada nodo u opción (clase, especializaciones y Paragon) tiene al menos una comprobación que PASÓ y
// lo nombra por su id (no cuenta un «sin <id>»: esa es la de control). No valen el nombre del poder
// ni los mensajes de la sección de datos («con efecto», «poder registrado»): pasan aunque el efecto
// no exista
{
  const keysOf = nodes => nodes.flatMap(n => (n.t === 'c' ? n.opts.map(o => `${n.id}${o.k}`) : [n.id]));
  const ALL = [...keysOf(MAGA_TALENTS.cls.nodes), ...MAGA_TALENTS.specs.flatMap(s => keysOf(s.nodes)), ...MAGA_TALENTS.hero.flatMap(t => keysOf(t.nodes))];
  const BEHAVIOR = PASSED.slice(DATA_CHECKS).filter(m => typeof m === 'string');
  const named = key => BEHAVIOR.some(m => new RegExp(`(^|[^\\w])(?<!sin )${key}(?![\\w])`).test(m));
  const missing = ALL.filter(key => !named(key));
  same(missing, [], `nodos u opciones sin una comprobación de su efecto: ${missing.join(', ')}`);
  console.log(`✓ cobertura: ${ALL.length} nodos u opciones (clase, especializaciones y Paragon) con efecto comprobado: ${missing.length} sin efecto`);
}
// ------------------------------------------------------------ 6) nivel de aprendizaje (T-maga)
// Va DESPUÉS de la cobertura: estos mensajes nombran nodos, pero no prueban su efecto.
//  a) ningún nodo ni opción se aprende más tarde de lo que el árbol deja comprarlo (learnAt ≤ nivel
//     de compra: fila, padre al máximo y puertas). La suite de nivel da por bueno el bloqueo; aquí
//     se fija el reorden de la Maga, que lo dejó a cero
//  b) las builds de la Arcanista no gastan los puntos de antes del Rayo en alargar las Cargas
//     (Memoria Arcana) sin Mente Brillante, lo único que les da efecto hasta entonces
//  c) un guardado con la rejilla vieja (a3 y a7 en las filas 1 y 2) se recorta fino al cargarlo
{
  const late = [];
  for (const tree of levelTrees('maga')) for (const n of tree.nodes) {
    if (n.free) continue;
    const buy = buyLevel(tree, n);
    for (const k of n.t === 'c' ? n.opts.map(o => o.k) : [null]) {
      const at = learnAt(n, k);
      if (at != null && at > buy) late.push(`${tree.key}/${n.id}${k ?? ''} (se aprende al Nv${at}, se compra al Nv${buy})`);
    }
  }
  same(late, [], `nivel: nodos u opciones que se compran antes de aprender lo que tocan: ${late.join(', ')}`);

  const rayoAt = skillLearnLevel('maga', 'rayo', 'arcanista');
  const dead = [];
  for (const { key, build } of buildsFor('maga', 'arcanista'))
    for (let L = TALENT_RULES.specAt; L < rayoAt; L++) {
      const r = buildRanks({ classId: 'maga', level: L }, build, { level: L }).sp.arcanista || {};
      if (r.a1 && !r.a2) dead.push(`${key} Nv${L}`);
    }
  same(dead, [], `nivel: builds que alargan las Cargas antes del Rayo (Nv${rayoAt}) sin Mente Brillante: ${dead.join(', ')}`);
  const L0 = TALENT_RULES.specAt;
  const first = buildRanks({ classId: 'maga', level: L0 }, MAGA_TALENTS.builds[MAGA_TALENTS.defaultBuild.arcanista], { level: L0 });
  same(first.sp.arcanista, { a2: 1 }, 'nivel: la build por defecto de la Arcanista empieza por Mente Brillante');

  // la build grieta del árbol de antes del reorden (cc43ca4), con los rangos que tenía a ese nivel
  const load = (ranks, level) => normalizeTalents({ v: 2, spec: 'arcanista', cls: {}, sp: { arcanista: ranks }, choice: { a10: 'A' } }, 'maga', level);
  const v16 = load({ a3: 3, a7: 1 }, 16);
  same(v16.sp.arcanista, {}, 'rejilla vieja a Nv16: Flujo Constante y Grieta Abierta ya no caben y devuelven sus 4 puntos');
  ok(talentsTrimmed(v16).includes('sp.arcanista'), 'rejilla vieja a Nv16: el recorte se avisa');
  const v30 = load({ a3: 3, a7: 2, a6: 1, a10: 1, a2: 1, a13: 2, a14: 1 }, 30);
  same(v30.sp.arcanista, { a13: 2, a2: 1, a6: 1, a10: 1 }, 'rejilla vieja a Nv30: solo se quitan a3, a14 y a7 (6 puntos libres)');
  const old40 = { a3: 3, a7: 2, a6: 1, a10: 1, a2: 3, a13: 2, a14: 1, a17: 2, a21: 1 };
  const v40 = load(old40, 40);
  same(v40.sp.arcanista, old40, 'rejilla vieja a Nv40: cabe entera');
  same(talentsTrimmed(v40), [], 'rejilla vieja a Nv40: sin aviso de recorte');
  console.log(`✓ nivel de aprendizaje: 0 nodos u opciones bloqueados, builds de la Arcanista sin Cargas muertas antes del Rayo (Nv${rayoAt}) y recorte fino de la rejilla vieja`);
}
console.log(`\n✅ TALENTOS 2g DE LA MAGA (clase, especializaciones y Paragon): ${checks} comprobaciones`);
