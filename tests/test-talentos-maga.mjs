// ============================================================
// Talentos 2g de la MAGA (Paso 2 · E2, KT-maga): cada nodo con `fx` produce un efecto observable
// ============================================================
// docs/paso2-implementacion.md §2 E2 (fila KT) y docs/paso2g-maga-coherencia.md §4 (clase) y §7
// (árboles héroe). Trabajo 1: árbol de CLASE y PARAGON; las especializaciones llegan en los
// trabajos 2 y 3 (este archivo crecerá con ellas).
//  1) cobertura: todo nodo u opción de clase y de héroe tiene efecto salvo los pendientes con causa
//     (c3/c18: sus mods apuntan al catálogo de KA1; t4A/e4A/f8A: su `grant` lo escribe KA1); cada
//     poder está registrado y cada clave tv propia (MAGA_TV_KEYS) la lee un poder de la clase
//  2) clase: cada nodo, contra el mismo héroe sin él (mismo nivel, misma semilla)
//  3) Paragon: cada nodo con el árbol héroe ABIERTO (31/31 de especialización a Nv70), contra el
//     mismo árbol sin él; los finales leen su rango; G13 (pausa y vuelta)
// Habilidades del kit base que crea KA1 (m_parpadeo, m_barrera): si aún no están en el catálogo,
// el arnés inyecta una versión mínima con el comportamiento de la Barrera (m_t_barrera).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { MAGA_TALENTS, MAGA_TV_KEYS } from '../js/talents-maga.js';
import { POWER_HOOKS, powerState, firePower } from '../js/powers.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';
import { gaugeValue } from '../js/spec-mechanics.js';

let checks = 0;
const ok = (c, msg) => { assert.ok(c, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const near = (a, b, tol, msg) => { assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≉ ${b} (±${tol})`); checks++; };

// ------------------------------------------------------------ arnés
const STANDINS = [
  { id: 'm_parpadeo', name: 'Parpadeo', cat: 'movement', type: 'blink', slots: ['k1'], tags: ['movement', 'arcane'], elem: 'arcane', cd: 12, range: 8, req: 4 },
  { id: 'm_barrera', name: 'Barrera de Maná', cat: 'defense', type: 'shield', behavior: 'm_t_barrera', slots: ['k2'], tags: ['defense', 'shield', 'arcane'],
    elem: 'arcane', cd: 20, dur: 8, shieldManaPct: 60, req: 6 },
].filter(d => !CLASSES.maga.skills.some(s => s.id === d.id));
const baseInject = STANDINS.length ? { skills: STANDINS } : null;
function H(opts = {}) {
  const inject = opts.inject || baseInject ? { skills: [...(baseInject?.skills || []), ...(opts.inject?.skills || [])], forge: opts.inject?.forge || {} } : null;
  const h = makeHarness({ classId: 'maga', seed: 7, level: 70, ...opts, inject });
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
// lanzamientos que repiten (ecos): castSkillSlot(slot, mult) con mult > 0
function spyEchoes(h) {
  const out = [];
  const orig = h.g.castSkillSlot.bind(h.g);
  h.g.castSkillSlot = (slot, mult = 0) => { if (mult > 0) out.push({ slot, mult, t: h.p.simT }); return orig(slot, mult); };
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
{
  const PENDING = { c3: 'm_parpadeo (KA1)', c18: 'm_barrera (KA1)', t4A: 'grant m_h_detener (KA1)', e4A: 'grant m_h_palabra (KA1)', f8A: 'grant m_h_constructo (KA1)' };
  const left = [];
  for (const n of [...MAGA_TALENTS.cls.nodes, ...MAGA_TALENTS.hero.flatMap(t => t.nodes)]) {
    const parts = n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o]) : [[n.id, n]];
    for (const [id, o] of parts) {
      const empty = !Object.keys(o.fx || {}).length;
      if ('todo' in o || empty) left.push(id);
      if (!('todo' in o)) ok(!empty, `${id}: sin todo, con efecto`);
      if (o.fx?.power) ok(POWER_HOOKS[o.fx.power], `${id}: el poder ${o.fx.power} está registrado`);
    }
  }
  assert.deepEqual(left.sort(), Object.keys(PENDING).sort(), 'solo quedan los pendientes de KA1');
  // cada clave tv propia la lee un poder de la Maga (y ninguna sobra)
  const src = readFileSync(new URL('../js/powers-maga.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  for (const k of MAGA_TV_KEYS) ok(new RegExp(`\\.${k}\\b`).test(src), `MAGA_TV_KEYS: «${k}» la lee js/powers-maga.js`);
  const used = new Set([...MAGA_TALENTS.cls.nodes, ...MAGA_TALENTS.hero.flatMap(t => t.nodes)].flatMap(n => (n.t === 'c' ? n.opts : [n]).flatMap(o => Object.keys(o.fx?.tv || {}))));
  for (const k of MAGA_TV_KEYS) ok(used.has(k), `MAGA_TV_KEYS: «${k}» la usa algún nodo`);
  console.log(`✓ cobertura: clase y Paragon con efecto (pendientes de KA1: ${Object.keys(PENDING).join(', ')})`);
}

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
// c4 Escudo Prismático (tv.barrierDr) · c19 Barrera Resonante · la Barrera del kit (m_t_barrera)
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
  assert.deepEqual(cert, base.map((c, i) => c || i % 4 === 3), 'c5A: el 4.º y el 8.º son críticos; el resto como sin el nodo');
  checks++;
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
  // c15B Mente Clara: +30 % de regeneración y +10 % con el maná lleno (núcleo: highManaDmg)
  const regen = ranks => { const h = cls(ranks, { c15: 'B' }); h.p.mp = 0; h.step(1, 0.1); return h.p.mp; };
  near(regen({ c15: 1 }) / regen({}), 1.3, 0.01, 'c15B: recuperas maná un 30 % más rápido');
  const roll = (ranks, mpFrac) => { const h = cls(ranks, { c15: 'B' }); h.p.mp = h.p.stats.maxMP * mpFrac; const e = h.enemy({ hp: 1e6 }); return h.p.rollDamage(100, -100, 0, e, {}).dmg; };
  ok(roll({ c15: 1 }, 1) > roll({ c15: 1 }, 0.2) && roll({}, 1) === roll({}, 0.2), 'c15B: +daño solo con el maná lleno');
  const an = cls({ c17: 1 }, { c17: 'B' });
  an.p.takeDamage(an.p.stats.maxHP * 0.5, 1, { element: 'fire', unavoidable: true });
  ok(!an.p.buffs.some(x => x.id === 'm_anclaje'), 'c17B: por encima del 30 %, nada');
  an.p.takeDamage(an.p.stats.maxHP * 0.3, 1, { element: 'fire' });
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
  d.tick(10.1);
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
}
// c23 Ritmo Arcano (tv.basicCritCdr): crítico del Dardo → −1 s a Parpadeo y a la Barrera
{
  const h = cls({ c23: 2 });
  h.p.cds.m_parpadeo = 5; h.p.cds.m_barrera = 5; h.p.cds.nova_hielo = 5;
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  h.hit(e, { skill: 'm_dardo', dealt: 10, crit: true, tags: ['basic', 'proj', 'arcane'] });
  near(h.p.cds.m_parpadeo, 4, 1e-6, 'c23: Parpadeo −1 s');
  near(h.p.cds.m_barrera, 4, 1e-6, 'c23: Barrera −1 s');
  eq(h.p.cds.nova_hielo, 5, 'c23: no la Nova');
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
  // si caduca (8 s) no estalla: el maná es el mismo que sin el nodo (solo la regeneración)
  const expire = ranks => { const c = cls(ranks); cast(c, 'k2', 'm_barrera', 0.1); c.p.mp = 0; c.tick(9); ok(!c.p.shields.length, 'la Barrera caducó'); return c.p.mp; };
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
  ok(b.p.shields[0].t <= 8, 'sin c28 la Barrera caduca');
}
// c29 Archimaga (final): cada 4.ª principal se repite gratis al 20 + 20 × rango %
{
  for (const rank of [1, 3]) {
    const h = cls({ c29: rank });
    const echoes = spyEchoes(h);
    h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    for (let i = 0; i < 4; i++) { cast(h, 'rmb', 'nova_hielo', 0.1); h.p.cds.nova_hielo = 0; h.p.mp = h.p.stats.maxMP; }
    h.step(0.4);
    assert.deepEqual(echoes.map(x => [x.slot, x.mult]), [['rmb', (20 + 20 * rank) / 100]], `c29 r${rank}: una copia de la 4.ª al ${20 + 20 * rank} %`);
    checks++;
  }
  const b = cls({ c29: 1 });
  const echoes = spyEchoes(b);
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
console.log('✓ árbol de clase: cada nodo con efecto propio (c3 y c18 esperan a KA1)');

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
  assert.deepEqual(base.rep, [60], 't0: al acabar (4 s), repite el 30 % de lo que le hiciste'); checks++;
  eq(mark({}, {}, [100, 100], 3.8).rep.length, 0, 't0: antes de 4 s, nada');
  eq(mark({ t1: 1 }, {}, [100, 100], 5.8).rep.length, 0, 't1: la Marca dura 6 s');
  assert.deepEqual(mark({ t1: 1 }, {}, [100, 100], 6.2).rep, [60], 't1: … y repite a los 6 s'); checks++;
  assert.deepEqual(mark({ t2: 1 }, { t2: 'A' }, [100, 100], 4.2).rep, [90], 't2A: repite el 45 %'); checks++;
  assert.deepEqual(mark({ t8: 1 }, { t8: 'A' }, [100, 100], 4.2).rep, [90], 't8A: el golpe que la pone cuenta doble'); checks++;
  // la Marca no cuenta el daño de otra Marca; sí procs y DoT de otros poderes
  const h = hero('crono');
  const log = spy(h);
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.hit(e, { skill: 'bola_fuego', dealt: 100 });
  h.hit(e, { skill: null, dealt: 50, proc: true });
  h.tick(4.2);
  assert.deepEqual(from(log, null, e).filter(x => x.source === 'power:m_marca_tiempo').map(x => x.dealt), [45], 't0: cuenta los procs (150 × 30 %)'); checks++;
  h.hit(e, { skill: null, dealt: 80, proc: true });
  h.tick(4.2);
  eq(from(log, null, e).filter(x => x.source === 'power:m_marca_tiempo').length, 1, 't0: un proc no pone la Marca (la pone un golpe directo)');
  // t7 Bucle: la 4.ª que termina se repite dos veces
  const loop = hero('crono', { t7: 1 });
  const ll = spy(loop);
  const foes = [0, 1, 2, 3].map(i => loop.enemy({ hp: 1e7, pos: [2 + i * 3, 0, 0] }));
  for (const f of foes) { loop.hit(f, { skill: 'bola_fuego', dealt: 100 }); loop.tick(0.3); }
  loop.tick(4.5);
  eq(ll.filter(x => x.source === 'power:m_marca_tiempo').length, 5, 't7: 4 Marcas, 5 repeticiones');
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
  r.p.takeDamage(r.p.stats.maxHP * 0.7, 1, { element: 'fire', unavoidable: true });
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
  const echoes = spyEchoes(im);
  const ult = im.p.cls.skills.find(s => s.cat === 'ultimate' && isKnown(im.p, s));
  im.enemy({ hp: 1e7, pos: [3, 0, 0] }); im.aim(3, 0); im.tick(0.1);
  cast(im, 'k4', ult.id, 2);                         // la Supernova acaba al estallar (~1,2 s)
  ok(echoes.some(x => x.slot === 'k4' && x.mult === 0.25), 'f3: al usar la definitiva, el Familiar lanza una copia al 25 %');
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
  assert.deepEqual([from(ls, 'm_familiar').length, from(ln, 'm_familiar').length], [2, 1], 'f5: tras una principal, el Familiar dispara un 30 % más rápido'); checks++;
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
  const echoes = spyEchoes(h);
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.tick(0.3);
  eq(powerState(h.p, 'm_familiar').fams.length, 3, 'f12: se divide en 3');
  cast(h, 'rmb', 'nova_hielo', 0.8);
  assert.deepEqual(echoes.map(x => x.mult), [0.5, 0.5, 0.5], 'f12: todos copian la siguiente principal al 50 %'); checks++;
  h.p.cds.nova_hielo = 0; cast(h, 'rmb', 'nova_hielo', 0.8);
  eq(echoes.length, 3, 'f12: solo la siguiente');
  h.tick(7.5);
  eq(powerState(h.p, 'm_familiar').fams.length, 1, 'f12: dura 8 s');
  h.tick(17);
  eq(powerState(h.p, 'm_familiar').fams.length, 3, 'f12: cada 25 s');
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
  const echoes = spyEchoes(h);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  const g1 = h.g.fields.find(f => f.kind === 'm_sello');
  ok(g1.data.grimoire && g1.dur === 10, 'e12: el Sello es un Grimorio de 10 s');
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  cast(h, 'rmb', 'nova_hielo', 0.4);
  assert.deepEqual(echoes.map(x => x.mult), [0.4], 'e12: dentro, cada hechizo se copia al 40 %'); checks++;
  h.p.pos.set(20, 0, 0); h.p.cds.nova_hielo = 0; cast(h, 'rmb', 'nova_hielo', 0.4);
  eq(echoes.length, 1, 'e12: fuera, no');
  h.p.pos.set(0, 0, 0);
  firePower('afterCast', h.p, h.g, h.p, { sk: { id: 'm_h_palabra' }, prof: { elem: 'arcane' }, slot: 'k2' }, {});
  ok(!h.g.fields.filter(f => f.kind === 'm_sello' && f.t > 0 && !f.data.replaced).some(f => f.data.grimoire), 'e12: cada 30 s');
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
console.log(`\n✅ TALENTOS 2g DE LA MAGA (clase y Paragon): ${checks} comprobaciones`);
