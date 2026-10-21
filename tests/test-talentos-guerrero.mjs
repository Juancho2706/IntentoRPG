// ============================================================
// Paso 2g · E2 (KT-guerrero) — cada nodo de talento del Guerrero con `fx` tiene un efecto
// OBSERVABLE (docs/paso2-implementacion.md §2.E2 fila KT; docs/paso2g-guerrero.md §6, §9, §11.3)
// ============================================================
// Trabajo 1: árbol de CLASE (c1…c30) y árboles HÉROE Titán (t*), Gladiador (l*) y Caudillo (u*).
// Cada nodo u opción se prueba CON y SIN él, sobre héroes reales del arnés (Player, canal de
// lanzamiento, poderes y campos reales). Las especializaciones entran en los trabajos 2 y 3.
//  · cobertura: todo nodo y opción de clase y héroe tiene su prueba aquí y su `fx` no está vacío
//    (salvo las 4 opciones cuya activa escribe KA1: siguen con `todo` hasta que exista)
//  · las claves tv propias (GUERRERO_TV_KEYS) las lee js/powers-guerrero.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { TALENT_TREES, buildRanks, defaultBuildKey } from '../js/talents.js';
import { GUERRERO_TV_KEYS } from '../js/talents-guerrero.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { firePower, powerState, POWER_HOOKS } from '../js/powers.js';
import { CLASSES } from '../js/data.js';
import { dotProfile, healScaled } from '../js/combat-math.js';

const TT = TALENT_TREES.guerrero;
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SRC = readFileSync(new URL('../js/powers-guerrero.js', import.meta.url), 'utf8');

// ------------------------------------------------ montaje
// árbol de clase: rangos y elecciones a mano (sin especialización); nivel 60
function cls(ranks = {}, choice = {}, opts = {}) {
  return makeHarness({ classId: 'guerrero', level: opts.level || 60, seed: opts.seed || 7, talents: { cls: ranks, choice } });
}
// árbol héroe: la especialización con sus 31 puntos de la build por defecto (Paragon abierto) y
// SOLO los nodos de héroe pedidos (más la clave gratis); nivel 100
function hero(spec, tree, nodes = {}, choice = {}, opts = {}) {
  const b = TT.builds[defaultBuildKey('guerrero', spec)];
  const r = buildRanks({ classId: 'guerrero', level: 100, talents: { v: 2, spec } }, b, { level: 100 });
  const ch = Object.fromEntries(Object.entries(r.choice).filter(([id]) => !/^c\d/.test(id)));
  const h = makeHarness({ classId: 'guerrero', spec, level: 100, seed: opts.seed || 7,
    talents: { sp: { [spec]: r.sp[spec] }, choice: ch, cls: opts.cls || {}, hero: { [spec]: { tree, nodes: { [tree]: nodes }, choice: { [tree]: choice } } } } });
  assert.ok(h.p.talentAgg.heroOpen && h.p.talentAgg.hero === tree, `${tree}: Paragon abierto con ${spec}`);
  return h;
}
const sk = (h, id) => h.p.cls.skills.find(s => s.id === id);
const prof = (h, id) => resolveSkill(h.p, sk(h, id));
// HitInfo mínimo de una habilidad del catálogo (para condAdd/condCrit)
const hit = (id, extra = {}) => ({ skill: id, tags: new Set(CLASSES.guerrero.skills.find(s => s.id === id)?.tags || []), elem: 'physical', ...extra });
const condAdd = (h, e, info) => firePower('condAdd', h.p, h.p, e, info);
const condCrit = (h, e, info) => firePower('condCrit', h.p, h.p, e, info);
const condDr = (h, info = { amount: 100, src: null }) => firePower('condDr', h.p, h.p, info);
const buff = (p, id) => (p.buffs || []).find(b => b.id === id && b.t > 0) || null;
// lanzar una habilidad de la ranura y dejar que termine (preparación, vuelo, impacto)
function cast(h, slot, id, { aim = null, mp = null, sec = 0.6 } = {}) {
  if (id) h.setSlot(slot, id);
  if (mp != null) h.p.mp = mp;
  if (aim) h.aim(aim[0], aim[1]);
  const ok = h.cast(slot);
  h.step(sec);
  return ok;
}
// golpe directo que pasa por ⑤ con la habilidad dada
const hitWith = (h, e, id, extra = {}) => h.hit(e, { skill: id, tags: [...(CLASSES.guerrero.skills.find(s => s.id === id)?.tags || [])], dealt: 50, ...extra });

// ------------------------------------------------ registro de pruebas por nodo
const CHECKS = {};
const check = (key, fn) => { assert.ok(!CHECKS[key], `prueba repetida ${key}`); CHECKS[key] = fn; };

// ================================================================ ÁRBOL DE CLASE
check('c1', () => {
  const a = cls(), b = cls({ c1: 2 });
  assert.equal(b.p.stats.hpPct - a.p.stats.hpPct, 12, 'c1 r2: +12 % de vida');
  assert.ok(b.p.stats.maxHP > a.p.stats.maxHP, 'c1: más vida máxima');
});
check('c2', () => {
  const a = cls(), b = cls({ c2: 2 });
  for (const id of ['g_tajo', 'g_hendidura', 'embestida']) assert.equal(prof(b, id).addPct - prof(a, id).addPct, 12, `c2 r2: +12 % a ${id}`);
});
check('c3', () => {
  const a = cls(), b = cls({ c3: 2 });
  assert.ok(approx(prof(b, 'embestida').cd, prof(a, 'embestida').cd * 0.76), `c3 r2: movilidad −24 % (${prof(b, 'embestida').cd})`);
  assert.ok(approx(prof(b, 'g_hendidura').cd, prof(a, 'g_hendidura').cd), 'c3 no toca otras categorías');
});
check('c4', () => {
  const a = cls(), b = cls({ c4: 3 });
  assert.ok(approx(prof(b, 'g_piel').dur - prof(a, 'g_piel').dur, 3), 'c4 r3: Piel de Hierro +3 s');
});
// c5A Tajo Firme: un Tajo contra un élite da 5 de Furia más; contra uno normal, igual
check('c5A', () => {
  const run = (talent, rank) => {
    const h = talent ? cls({ c5: 1 }, { c5: 'A' }) : cls();
    h.enemy({ hp: 1e6, rank, pos: [1.2, 0, 0] });
    h.p.mp = 0;
    cast(h, 'lmb', 'g_tajo', { sec: 0.05 });
    return h.p.mp;
  };
  assert.ok(approx(run(true, 'elite') - run(false, 'elite'), 5), 'c5A: +5 de Furia por Tajo contra élites');
  assert.ok(approx(run(true, null), run(false, null)), 'c5A: nada contra enemigos normales');
});
// c5B Tajo Voraz: matar con el Tajo abarata la siguiente principal a la mitad; la gasta
check('c5B', () => {
  const h = cls({ c5: 1 }, { c5: 'B' });
  const base = prof(h, 'g_hendidura').cost;
  const e = h.enemy({ hp: 1, pos: [1.2, 0, 0] });
  cast(h, 'lmb', 'g_tajo', { sec: 0.05 });
  assert.ok(!e.alive && buff(h.p, 'g_tajo_voraz'), 'c5B: el Tajo que mata deja la principal a mitad de coste');
  assert.equal(prof(h, 'g_hendidura').cost, Math.round(base * 0.5), 'c5B: Hendidura cuesta la mitad');
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100 });
  assert.ok(!buff(h.p, 'g_tajo_voraz') && prof(h, 'g_hendidura').cost === base, 'c5B: la principal se lo gasta');
});
// c6A Ensañamiento: +25 % al de más vida de los que alcanza la principal
check('c6A', () => {
  const h = cls({ c6: 1 }, { c6: 'A' });
  const big = h.enemy({ hp: 5000, pos: [1.5, 0, 0] }), small = h.enemy({ hp: 800, pos: [1.5, 0, 1] });
  prof(h, 'g_hendidura');
  assert.equal(condAdd(h, big, hit('g_hendidura')), 25, 'c6A: +25 % al de más vida');
  assert.equal(condAdd(h, small, hit('g_hendidura')), 0, 'c6A: nada al de menos vida');
  assert.equal(condAdd(h, big, hit('g_tajo')), 0, 'c6A: solo principales');
});
// c6B Sin Cuartel: +5 % por enemigo alcanzado, hasta +25 %
check('c6B', () => {
  const h = cls({ c6: 1 }, { c6: 'B' });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  assert.equal(condAdd(h, e, hit('g_hendidura')), 5, 'c6B: uno solo, +5 %');
  for (let i = 0; i < 2; i++) h.enemy({ hp: 1e6, pos: [2, 0, 0.6 + i * 0.6] });
  assert.equal(condAdd(h, e, hit('g_hendidura')), 15, 'c6B: tres, +15 %');
  for (let i = 0; i < 5; i++) h.enemy({ hp: 1e6, pos: [2.5, 0, -0.5 - i * 0.3] });
  assert.equal(condAdd(h, e, hit('g_hendidura')), 25, 'c6B: tope +25 %');
});
// c7 Marcha Imparable: imparable al usar tu movilidad y 1 s después
check('c7', () => {
  const run = r => { const h = r ? cls({ c7: 1 }) : cls(); cast(h, 'k1', 'embestida', { aim: [6, 0], sec: 0.4 }); return h; };
  const a = run(false), b = run(true);
  assert.ok(a.p.pos.x > 3 && b.p.pos.x > 3, 'la Embestida llega');
  assert.equal(a.p.unstoppableT || 0, 0, 'sin c7 no eres imparable');
  assert.ok(a.p.applySlow(2), 'sin c7 te ralentizan');
  assert.ok(b.p.unstoppableT > 0, 'c7: imparable después de llegar');
  assert.ok(!b.p.applySlow(2) && !(b.p.slowT > 0), 'c7: no te ralentizan');
  b.step(0.8);
  assert.ok(!(b.p.unstoppableT > 0), 'c7: se acaba 1 s después');
});
check('c8', () => {
  const h = cls({ c8: 2 });
  h.p.mp = 80;
  assert.equal(condDr(h), 16, 'c8 r2: −16 % con más de 50 de Furia');
  h.p.mp = 40;
  assert.equal(condDr(h), 0, 'c8: nada con poca Furia');
});
// c9A Golpe Pesado: +0,3 s y +40 % a lo preparado; +25 % a la suelta perfecta; Quebranto a jefes
check('c9A', () => {
  const a = cls(), b = cls({ c9: 1 }, { c9: 'A' });
  assert.ok(approx(prof(b, 'g_hendidura').windup - prof(a, 'g_hendidura').windup, 0.3), 'c9A: +0,3 s de preparación');
  assert.equal(prof(b, 'g_hendidura').addPct - prof(a, 'g_hendidura').addPct, 40, 'c9A: +40 %');
  assert.equal(prof(b, 'g_lanza').addPct, prof(a, 'g_lanza').addPct, 'c9A: nada a lo que no se prepara');
  const charged = CLASSES.guerrero.skills.filter(s => s.charge);
  for (const s of charged) assert.equal(resolveSkill(b.p, s).charge.perfectPct - resolveSkill(a.p, s).charge.perfectPct, 25, `c9A: suelta perfecta de ${s.id} +25 %`);
  const opt = TT.cls.nodes.find(n => n.id === 'c9').opts[0];
  assert.equal(opt.fx.mod['@charge'].perfectPct, 25, 'c9A: +25 % a las sueltas perfectas (en el catálogo 2g)');
  const boss = b.enemy({ hp: 1e6, boss: true, pos: [2, 0, 0] });
  hitWith(b, boss, 'g_hendidura');
  assert.equal(boss.stagger, 15, 'c9A: 15 de Quebranto con un golpe preparado');
  hitWith(b, boss, 'g_tajo');
  assert.equal(boss.stagger, 15, 'c9A: nada con un golpe sin preparar');
  b.step(0.05);
  b.g.onPlayerHit(boss, { dealt: 10, crit: false, skill: 'g_lanza', tags: new Set(['spender']), perfect: true, proc: false, dot: false });
  assert.equal(boss.stagger, 30, 'c9A: 15 más con una suelta perfecta');
  const nb = a.enemy({ hp: 1e6, boss: true, pos: [2, 0, 0] });
  prof(a, 'g_hendidura'); hitWith(a, nb, 'g_hendidura');
  assert.equal(nb.stagger || 0, 0, 'sin c9A no hay Quebranto');
});
// c9B Sin Pausa: la mitad de preparación, sin frenar, y prepararse no rompe el plantado
check('c9B', () => {
  const a = cls(), b = cls({ c9: 1 }, { c9: 'B' });
  assert.ok(approx(prof(b, 'g_hendidura').windup, prof(a, 'g_hendidura').windup * 0.5), 'c9B: la mitad de preparación');
  assert.ok(prof(b, 'g_hendidura').moveMul >= 1, 'c9B: te mueves a velocidad normal');
  assert.ok(prof(b, 'g_hendidura').keepPlanted && !prof(a, 'g_hendidura').keepPlanted, 'c9B: preparar no rompe el plantado');
  assert.ok(!prof(b, 'g_lanza').keepPlanted, 'c9B: solo lo que se prepara o se carga');
});
// c10A Derribo: cada 8 s, el siguiente golpe derriba 1 s (jefes: 20 de Quebranto)
check('c10A', () => {
  const h = cls({ c10: 1 }, { c10: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), boss = h.enemy({ hp: 1e6, boss: true, pos: [3, 0, 0] });
  const e2 = h.enemy({ hp: 1e6, pos: [2, 0, 1] });
  hitWith(h, e, 'g_tajo');
  assert.ok(approx(e.stunT, 1), `c10A: derriba 1 s (${e.stunT})`);
  hitWith(h, e2, 'g_tajo');
  assert.ok(!(e2.stunT > 0), 'c10A: uno cada 8 s');
  h.tick(8.1);
  hitWith(h, boss, 'g_tajo');
  assert.ok(boss.stagger === 20 && !(boss.stunT > 0), 'c10A: a los jefes, 20 de Quebranto');
  const n = cls(), ne = n.enemy({ hp: 1e6, pos: [2, 0, 0] });
  hitWith(n, ne, 'g_tajo');
  assert.ok(!(ne.stunT > 0), 'sin c10A no derriba');
});
// c10B Silenciar: la Lanza corta el hechizo y deja mudo 3 s, cada 10 s
check('c10B', () => {
  const h = cls({ c10: 1 }, { c10: 'B' });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  hitWith(h, e, 'g_tajo');
  assert.ok(!(e.silenceT > 0), 'c10B: otras habilidades no silencian');
  hitWith(h, e, 'g_lanza');
  assert.ok(approx(e.silenceT, 3), 'c10B: la Lanza deja mudo 3 s');
  const boss = h.enemy({ hp: 1e6, boss: true, pos: [4, 0, 0] });
  hitWith(h, boss, 'g_lanza');
  assert.equal(boss.stagger || 0, 0, 'c10B: una vez cada 10 s');
  h.tick(10.1);
  hitWith(h, boss, 'g_lanza');
  assert.ok(boss.stagger >= 20, 'c10B: a los jefes, el Quebranto de interrumpir');
});
// c11A Segundo Aliento: sin ella en la barra, la Piel la lanza al 50 % (con su recarga)
check('c11A', () => {
  const opt = TT.cls.nodes.find(n => n.id === 'c11').opts[0];
  assert.equal(opt.fx.grant, 'g_t_aliento', 'c11A concede Segundo Aliento');
  const run = (bar) => {
    const h = cls({ c11: 1 }, { c11: 'A' });
    if (bar) h.setSlot('k3', 'g_t_aliento');
    h.p.hp = h.p.stats.maxHP * 0.4;
    const hp0 = h.p.hp;
    cast(h, 'k2', 'g_piel', { mp: 60, sec: 0.1 });
    return { h, healed: h.p.hp - hp0 };
  };
  const off = run(false);
  assert.ok(approx(off.h.p.mp, 30, 1e-6), `c11A: gasta la mitad de la Furia (${off.h.p.mp})`);
  assert.ok(off.healed >= off.h.p.stats.maxHP * 0.1 - 1, `c11A: cura 1 % por cada 3 gastados (${off.healed})`);
  const on = run(true);
  assert.equal(on.h.p.mp, 60, 'c11A: en la barra no sale con la Piel');
  off.h.step(1); off.h.g.reduceCooldown(off.h.p, 'g_piel', Infinity); off.h.p.mp = 60;
  cast(off.h, 'k2', 'g_piel', { sec: 0.1 });
  assert.equal(off.h.p.mp, 60, 'c11A: respeta su recarga de 30 s');
});
check('c11B', () => {
  const run = r => { const h = r ? cls({ c11: 1 }, { c11: 'B' }) : cls(); h.p.hp = h.p.stats.maxHP * 0.35; h.p.takeDamage(h.p.stats.maxHP * 0.1, 1); return !!buff(h.p, 'g_coraza_hierro'); };
  assert.equal(run(false), false, 'sin c11B no hay Coraza');
  assert.equal(run(true), true, 'c11B: al bajar del 30 %, Coraza de Hierro');
});
check('c12', () => {
  const h = cls({ c12: 2 });
  h.p.mp = 0;
  h.g.gainResource(h.p, 10);
  assert.ok(approx(h.p.mp, 12), 'c12 r2: +20 % de Furia generada');
});
check('c13', () => {
  const a = cls(), b = cls({ c13: 2 });
  assert.equal(b.p.stats.crit - a.p.stats.crit, 10, 'c13 r2: +10 % de crítico');
});
// c14A Polvareda: al llegar, ralentizas a todos a 3 m (solo el primer uso de una cadena)
check('c14A', () => {
  const h = cls({ c14: 1 }, { c14: 'A' });
  const near = h.enemy({ hp: 1e6, pos: [6.5, 0, 0.5] }), far = h.enemy({ hp: 1e6, pos: [12, 0, 0] });
  cast(h, 'k1', 'embestida', { aim: [6, 0], sec: 1.0 });
  assert.ok(near.slowT > 0 && approx(near.slowPct, 50), 'c14A: ralentiza un 50 % a los cercanos');
  assert.ok(!(far.slowT > 0), 'c14A: no a los lejanos');
  // con movilidades que se relanzan, cuenta el primer uso de la cadena (el relanzamiento no)
  const e2 = h.enemy({ hp: 1e6, pos: [h.p.pos.x + 1, 0, 0] });
  const mv = { sk: sk(h, 'embestida'), slot: 'k1' };
  firePower('afterCast', h.p, h.g, h.p, { ...mv, recast: true }, {});
  assert.ok(!(e2.slowT > 0), 'c14A: el relanzamiento de una cadena no ralentiza');
  firePower('afterCast', h.p, h.g, h.p, mv, {});
  assert.ok(e2.slowT > 0, 'c14A: el primer uso sí');
});
// c14B Carga Reparadora: te quita la ralentización y te cura un 6 % (cada 6 s)
check('c14B', () => {
  const h = cls({ c14: 1 }, { c14: 'B' });
  h.p.hp = h.p.stats.maxHP * 0.5;
  h.p.applySlow(5);
  const hp0 = h.p.hp;
  cast(h, 'k1', 'embestida', { aim: [6, 0], sec: 1.0 });
  assert.ok(!(h.p.slowT > 0), 'c14B: quita las ralentizaciones');
  assert.ok(h.p.hp - hp0 >= h.p.stats.maxHP * 0.06 - 1, 'c14B: cura un 6 %');
  h.g.reduceCooldown(h.p, 'embestida', Infinity);
  const hp1 = h.p.hp;
  cast(h, 'k1', 'embestida', { aim: [0, 0], sec: 1.0 });
  assert.ok(h.p.hp - hp1 < h.p.stats.maxHP * 0.02, 'c14B: la cura, una vez cada 6 s');
});
// c15A Furia Protectora: el 20 % del daño lo pagas con Furia
check('c15A', () => {
  const run = r => { const h = r ? cls({ c15: 1 }, { c15: 'A' }) : cls(); h.p.stats.arm = 0; h.p.stats.dr = 0; h.p.stats.block = 0; h.p.mp = 100; const hp0 = h.p.hp; h.p.takeDamage(h.p.stats.maxHP * 0.2, 1); return { lost: hp0 - h.p.hp, h }; };
  const a = run(false), b = run(true);
  assert.ok(approx(b.lost, a.lost * 0.8, 2), `c15A: pierdes un 20 % menos de vida (${b.lost} / ${a.lost})`);
  assert.ok(b.h.p.mp < a.h.p.mp, 'c15A: lo pagas con Furia');
});
check('c15B', () => {
  const a = cls(), h = cls({ c15: 1 }, { c15: 'B' });
  assert.equal(h.p.stats.maxMP - a.p.stats.maxMP, 30, 'c15B: Furia máxima 130');
  const e = h.enemy({ hp: 1e6 });
  h.p.mp = 120;
  assert.equal(condAdd(h, e, hit('g_tajo')), 10, 'c15B: +10 % por encima de 100');
  h.p.mp = 90;
  assert.equal(condAdd(h, e, hit('g_tajo')), 0, 'c15B: nada por debajo');
});
check('c16A', () => {
  const a = cls(), b = cls({ c16: 1 }, { c16: 'A' });
  const pa = dotProfile('bleed', 100, { tv: a.p.tv }), pb = dotProfile('bleed', 100, { tv: b.p.tv });
  assert.ok(pb.total > pa.total * 1.25 - 1e-6, 'c16A: Sangrados +25 % y más largos');
  assert.ok(pb.ticks * pb.interval - pa.ticks * pa.interval >= 1 - 1e-6, 'c16A: +1 s de Sangrado');
});
check('c16B', () => {
  const a = cls(), b = cls({ c16: 1 }, { c16: 'B' });
  const ea = a.enemy({ hp: 1e6 }), eb = b.enemy({ hp: 1e6 });
  ea.applyCC('stun', 1, { src: a.p }); eb.applyCC('stun', 1, { src: b.p });
  assert.ok(approx(eb.stunT, ea.stunT * 1.5), 'c16B: aturdimientos un 50 % más largos');
  const ba = a.enemy({ hp: 1e6, boss: true }), bb = b.enemy({ hp: 1e6, boss: true });
  ba.addStagger(20, a.p); bb.addStagger(20, b.p);
  assert.ok(approx(bb.stagger, ba.stagger * 1.3), 'c16B: +30 % de Quebranto');
});
// c17A Grito de Guerra: sin él en la barra, la Piel lo lanza al 50 % (+15 de Furia, +5 % al grupo)
check('c17A', () => {
  const h = cls({ c17: 1 }, { c17: 'A' });
  h.p.mp = 0;
  cast(h, 'k2', 'g_piel', { sec: 0.1 });
  assert.ok(approx(h.p.mp, 15), `c17A: +15 de Furia (${h.p.mp})`);
  const full = prof(h, 'grito_guerra').buff.dmgPct;
  assert.ok(full >= 10 && buff(h.p, 'grito_guerra')?.stats?.dmgPct === Math.round(full * 0.5), `c17A: la mitad del daño del Grito (${full})`);
  const g2 = cls({ c17: 1 }, { c17: 'A' });
  g2.setSlot('k3', 'grito_guerra'); g2.p.mp = 0;
  cast(g2, 'k2', 'g_piel', { sec: 0.1 });
  assert.equal(g2.p.mp, 0, 'c17A: en la barra no sale con la Piel');
});
// c17B Ira Contenida: cada 20 s, la siguiente principal gratis y +20 %
check('c17B', () => {
  const h = cls({ c17: 1 }, { c17: 'B' });
  h.tick(0.2);
  assert.ok(buff(h.p, 'g_ira_contenida') && prof(h, 'g_hendidura').cost === 0, 'c17B: la principal no cuesta Furia');
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  assert.equal(condAdd(h, e, hit('g_hendidura')), 20, 'c17B: +20 %');
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 0 });
  assert.ok(!buff(h.p, 'g_ira_contenida') && prof(h, 'g_hendidura').cost > 0, 'c17B: se gasta');
  h.tick(19);
  assert.ok(!buff(h.p, 'g_ira_contenida'), 'c17B: aún no han pasado 20 s');
  h.tick(1.2);
  assert.ok(buff(h.p, 'g_ira_contenida'), 'c17B: vuelve a los 20 s');
});
check('c18', () => {
  const a = cls(), b = cls({ c18: 2 });
  assert.ok(approx(prof(b, 'g_piel').cd, prof(a, 'g_piel').cd * 0.7), 'c18 r2: Piel de Hierro 20 → 14 s');
});
// c19 Temple: con la Piel puesta, cada Tajo +3 de Furia y la alarga 0,25 s (hasta 3 s)
check('c19', () => {
  const run = (r, piel = true) => {
    const h = r ? cls({ c19: 1 }) : cls();
    h.enemy({ hp: 1e6, pos: [1.2, 0, 0] });
    if (piel) cast(h, 'k2', 'g_piel', { sec: 0.3 });
    const b = buff(h.p, 'g_piel'), t0 = b?.t;
    h.p.mp = 0;
    cast(h, 'lmb', 'g_tajo', { sec: 0.05 });
    return { h, b, t0, mp: h.p.mp };
  };
  const a = run(false), b = run(true), c = run(true, false);
  assert.ok(a.mp > 0 && approx(b.mp - a.mp, 3), `c19: cada Tajo da 3 de Furia más (${a.mp} → ${b.mp})`);
  assert.ok(approx(c.mp, a.mp), 'c19: sin la Piel puesta, nada');
  assert.ok(approx(b.b.t - (b.t0 - 0.05), 0.25, 0.02), 'c19: la Piel dura 0,25 s más');
  assert.ok(approx(a.b.t - (a.t0 - 0.05), 0, 0.02), 'sin c19 no se alarga');
  const h = b.h, e = h.g.enemies[0], t1 = h.p.simT, left1 = b.b.t;
  for (let i = 0; i < 20; i++) { hitWith(h, e, 'g_tajo'); h.tick(0.1); }
  const ext = b.b.t + (h.p.simT - t1) - left1;
  assert.ok(approx(ext, 2.75, 0.02), `c19: como mucho 3 s más en total (${ext + 0.25})`);
});
check('c20', () => {
  const h = cls({ c20: 1 });
  const e = h.enemy({ hp: 1e6 });
  hitWith(h, e, 'g_tajo', { crit: false });
  assert.ok(!(e.slowT > 0), 'c20: un golpe normal no ralentiza');
  assert.equal(condCrit(h, e, hit('g_hendidura')), 0, 'c20: sin ralentizar, sin crítico extra');
  hitWith(h, e, 'g_tajo', { crit: true });
  assert.ok(e.slowT > 0 && approx(e.slowPct, 30), 'c20: el crítico ralentiza un 30 %');
  assert.equal(condCrit(h, e, hit('g_hendidura')), 10, 'c20: +10 % de crítico a las principales contra ralentizados');
  assert.equal(condCrit(h, e, hit('g_tajo')), 0, 'c20: solo principales');
});
check('c21', () => {
  const h = cls({ c21: 1 });
  const e = h.enemy({ hp: 1e6 });
  assert.equal(condAdd(h, e, hit('embestida')), 0, 'c21: nada sin control');
  e.applyCC('slow', 2, { pct: 30, src: h.p });
  assert.equal(condAdd(h, e, hit('embestida')), 50, 'c21: +50 % de tu movilidad a ralentizados');
  assert.equal(condAdd(h, e, hit('g_tajo')), 0, 'c21: solo tu movilidad');
});
// c22A Intervención: sin ella en la barra, la Piel da un escudo del 8 % a ti y al aliado más cercano
check('c22A', () => {
  const h = cls({ c22: 1 }, { c22: 'A' });
  const ally = h.ally(4, 0, 1000);
  cast(h, 'k2', 'g_piel', { sec: 0.1 });
  const mine = (h.p.shields || []).find(s => s.src === 'g_piel_intervencion');
  const want = Math.round(healScaled(h.p.stats.maxHP * 0.08 * (prof(h, 'g_t_intervencion').buffMul || 1), h.p.stats.healPct));
  assert.ok(mine && approx(mine.amt, want, 1), `c22A: escudo del 8 % para ti (${mine?.amt} / ${want})`);
  assert.ok(ally.shields.length === 1 && ally.shields[0].src === 'g_piel_intervencion', 'c22A: y para el aliado más cercano');
  const n = cls(); const al2 = n.ally(4, 0, 1000);
  cast(n, 'k2', 'g_piel', { sec: 0.1 });
  assert.ok(!(n.p.shields || []).length && !al2.shields.length, 'sin c22A la Piel no escuda');
});
check('c22B', () => {
  const a = cls(), h = cls({ c22: 1 }, { c22: 'B' });
  assert.equal(h.p.stats.dmgPct - a.p.stats.dmgPct, 5, 'c22B: +5 % de daño');
  const ally = h.ally(5, 0, 1000);
  h.tick(0.6);
  assert.ok(ally.buffs.some(b => b.id === 'g_aura_hermandad'), 'c22B: y a tus aliados a 15 m');
});
// c23 Ritmo de Combate: cada crítico del Tajo recarga 1 s (r2) tu movilidad y la Piel
check('c23', () => {
  const run = r => {
    const h = r ? cls({ c23: r }) : cls();
    const e = h.enemy({ hp: 1e6 });
    for (const id of ['embestida', 'g_piel', 'grito_guerra']) h.g._startCooldown(h.p, id, prof(h, id));
    const before = { ...h.p.cds };
    hitWith(h, e, 'g_tajo', { crit: false });
    hitWith(h, e, 'g_lanza', { crit: true });
    const mid = { ...h.p.cds };
    hitWith(h, e, 'g_tajo', { crit: true });
    const cut = id => before[id] - h.p.cds[id];
    assert.ok(approx(mid.embestida, before.embestida), 'c23: ni golpes normales ni críticos de otras habilidades');
    return { mov: cut('embestida'), piel: cut('g_piel'), otra: cut('grito_guerra') };
  };
  assert.deepEqual(run(0), { mov: 0, piel: 0, otra: 0 }, 'sin c23 no recarga');
  const r2 = run(2);
  assert.ok(approx(r2.mov, 1) && approx(r2.piel, 1) && r2.otra === 0, `c23 r2: −1 s a la movilidad y a la Piel, nada al resto (${JSON.stringify(r2)})`);
});
check('c24', () => {
  const a = cls(), b = cls({ c24: 2 });
  assert.equal(b.p.stats.aspdPct - a.p.stats.aspdPct, 14, 'c24 r2: +14 % de velocidad de ataque');
});
// c25 Rencor: al acabar la Piel, devuelve el 10·r % de lo que evitó a los enemigos a 4 m
check('c25', () => {
  const run = r => {
    const h = r ? cls({ c25: r }) : cls();
    const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
    cast(h, 'k2', 'g_piel', { sec: 0.05 });
    for (let i = 0; i < 5; i++) h.p.takeDamage(h.p.stats.maxHP * 0.05, 1);
    h.p.hp = h.p.stats.maxHP;
    const hp0 = e.hp;
    h.tick(prof(h, 'g_piel').dur + 0.5);
    return hp0 - e.hp;
  };
  const r0 = run(0), r1 = run(1), r3 = run(3);
  assert.equal(r0, 0, 'sin c25 no devuelve nada');
  assert.ok(r1 > 0 && approx(r3, r1 * 3, Math.max(2, r1 * 0.05)), `c25: devuelve un 10 % por rango (${r1} · ${r3})`);
});
// c26 Desenfreno: pagar 80 de Furia en 4 s da +(4 + 8·r) % 4 s
check('c26', () => {
  const h = cls({ c26: 3 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  for (let i = 0; i < 2; i++) cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(!buff(h.p, 'g_ira_gasto'), 'c26: 54 de Furia no bastan');
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.equal(buff(h.p, 'g_ira_gasto')?.stats?.dmgPct, 28, 'c26 r3: +28 % tras pagar 81 de Furia');
  const g2 = cls({ c26: 1 });
  g2.p.mp = 100;
  g2.tick(0.1);
  g2.p.takeDamage(g2.p.stats.maxHP * 0.3, 1);
  assert.ok(!buff(g2.p, 'g_ira_gasto'), 'c26: la Furia que no paga una habilidad no cuenta');
});
check('c27', () => {
  const h = cls({ c27: 3 });
  const near = h.enemy({ hp: 1e6, pos: [7, 0, 1] });
  cast(h, 'k1', 'embestida', { aim: [6, 0], sec: 1.0 });
  assert.ok(approx(near.outDmgMul(), 0.76), `c27 r3: los cercanos hacen un 24 % menos (${near.outDmgMul()})`);
  const e2 = h.enemy({ hp: 1e6, pos: [h.p.pos.x + 1, 0, 0] }), mv = { sk: sk(h, 'embestida'), slot: 'k1' };
  firePower('afterCast', h.p, h.g, h.p, { ...mv, recast: true }, {});
  assert.equal(e2.outDmgMul(), 1, 'c27: el relanzamiento de una cadena no cuenta');
  const r1 = cls({ c27: 1 }), e1 = r1.enemy({ hp: 1e6, pos: [7, 0, 1] });
  cast(r1, 'k1', 'embestida', { aim: [6, 0], sec: 1.0 });
  assert.ok(approx(e1.outDmgMul(), 0.92), 'c27 r1: un 8 %');
});
// c28 Inquebrantable: la Piel no caduca por tiempo; se rompe al evitar un (25 + 15·r) % de tu vida
// y vuelve 15 s después; con ella, más Furia
check('c28', () => {
  const h = cls({ c28: 1 });
  h.p.stats.arm = 0; h.p.stats.block = 0;
  cast(h, 'k2', 'g_piel', { sec: 0.05 });
  h.tick(prof(h, 'g_piel').dur + 2);
  assert.ok(buff(h.p, 'g_piel'), 'c28: no caduca por tiempo');
  h.p.mp = 0; h.g.gainResource(h.p, 10);
  assert.ok(approx(h.p.mp, 11), `c28 r1: +10 % de Furia con la Piel (${h.p.mp})`);
  let n = 0;
  while (buff(h.p, 'g_piel') && n++ < 200) { h.p.hp = h.p.stats.maxHP; h.p.takeDamage(h.p.stats.maxHP * 0.05, 1); }
  assert.ok(!buff(h.p, 'g_piel') && n > 2, `c28: se rompe al evitar daño (${n} golpes)`);
  assert.equal(h.cast('k2'), false, 'c28: no vuelve enseguida');
  h.tick(15.2);
  assert.ok(h.cast('k2') && buff(h.p, 'g_piel'), 'c28: vuelve a los 15 s');
  // rango 3: hace falta evitar más daño
  const h3 = cls({ c28: 3 }); h3.p.stats.arm = 0; h3.p.stats.block = 0;
  cast(h3, 'k2', 'g_piel', { sec: 0.05 });
  let n3 = 0;
  while (buff(h3.p, 'g_piel') && n3++ < 400) { h3.p.hp = h3.p.stats.maxHP; h3.p.takeDamage(h3.p.stats.maxHP * 0.05, 1); }
  assert.ok(n3 > n * 1.4, `c28: el presupuesto crece con el rango (${n} → ${n3})`);
});
// c29 Señor de la Guerra: cada 100 de Furia pagada, la siguiente principal sale dos veces
check('c29', () => {
  const h = cls({ c29: 2 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  const echoes = [];
  const real = h.g.castSkillSlot.bind(h.g);
  h.g.castSkillSlot = (slot, mult = 0) => { if (mult > 0) echoes.push(mult); return real(slot, mult); };
  for (let i = 0; i < 4; i++) cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(buff(h.p, 'g_senor_guerra') && echoes.length === 0, 'c29: 108 de Furia pagada: lista');
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.6 });
  assert.deepEqual(echoes, [0.6], 'c29 r2: la copia sale al 60 %');
  assert.ok(!buff(h.p, 'g_senor_guerra'), 'c29: se gasta');
});
// c30 Asalto Total: tras tu movilidad, la principal gratis y +15·r %; si mata, media recarga
check('c30', () => {
  const h = cls({ c30: 2 });
  cast(h, 'k1', 'embestida', { aim: [4, 0], sec: 1.0 });
  assert.ok(buff(h.p, 'g_asalto_total') && prof(h, 'g_hendidura').cost === 0, 'c30: la principal es gratis');
  const e = h.enemy({ hp: 1, pos: [h.p.pos.x + 1.5, 0, 0] });
  assert.equal(condAdd(h, e, hit('g_hendidura')), 30, 'c30 r2: +30 %');
  const left = h.p.cds.embestida;
  cast(h, 'rmb', 'g_hendidura', { aim: [h.p.pos.x + 1.5, 0], mp: 0, sec: 0.5 });
  assert.ok(!e.alive && !buff(h.p, 'g_asalto_total'), 'c30: la principal lo gasta y mata');
  assert.ok(h.p.cds.embestida < left * 0.55, `c30: la movilidad recupera media recarga (${left} → ${h.p.cds.embestida})`);
});

// ================================================================ TITÁN (h1)
// gasta 81 de Furia con tres Hendiduras (Golpe de Titán listo a 60)
function chargeTitan(h, at = [1.5, 0]) { for (let i = 0; i < 3; i++) cast(h, 'rmb', 'g_hendidura', { aim: at, mp: 100, sec: 0.5 }); }
// Hendiduras hasta que el Golpe de Titán quede listo (lo que sobra de la Furia pagada se arrastra)
function armTitan(h, at = [1.5, 0]) {
  for (let i = 0; i < 6 && !buff(h.p, 'g_ti_golpe_titan'); i++) cast(h, 'rmb', 'g_hendidura', { aim: at, mp: 100, sec: 0.5 });
  assert.ok(buff(h.p, 'g_ti_golpe_titan'), 'Golpe de Titán listo');
}
check('t0', () => {
  const h = hero('berserker', 'h1');
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }), side = h.enemy({ hp: 1e6, pos: [-3, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [1.5, 0, 1] });
  chargeTitan(h);
  assert.ok(buff(h.p, 'g_ti_golpe_titan'), 't0: listo tras 60 de Furia pagada');
  const st = powerState(h.p, 'g_ti_golpe_titan');
  h.setSlot('rmb', 'g_hendidura'); h.p.mp = 100; h.aim(1.5, 0);
  const s0 = boss.stagger || 0, side0 = side.hp;
  h.cast('rmb');
  assert.equal(condAdd(h, e, hit('g_hendidura')), 40, 't0: la siguiente principal +40 %');
  h.step(0.5);
  assert.ok(!st.cast && st.strike, 't0: sale el Golpe de Titán');
  assert.ok(side.hp < side0, 't0: la sacudida alcanza a 4 m (detrás de ti)');
  assert.ok((boss.stagger || 0) - s0 >= 15, 't0: a los jefes, 15 de Quebranto');
  assert.ok(!buff(h.p, 'g_ti_golpe_titan'), 't0: se gasta');
});
check('t1', () => {
  const a = hero('berserker', 'h1'), b = hero('berserker', 'h1', { t1: 1 });
  assert.equal(b.p.stats.hpPct - a.p.stats.hpPct, 8, 't1: +8 % de vida');
  assert.ok(approx(prof(b, 'g_hendidura').rangeMul / prof(a, 'g_hendidura').rangeMul, 1.1), 't1: +10 % de alcance cuerpo a cuerpo');
});
check('t2A', () => {
  const run = ch => {
    const h = ch ? hero('berserker', 'h1', { t2: 1 }, { t2: 'A' }) : hero('berserker', 'h1');
    h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
    const far = h.enemy({ hp: 1e6, pos: [-6, 0, 0] });
    chargeTitan(h);
    const hp0 = far.hp;
    cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
    return { hit: far.hp < hp0, slow: far.slowT > 0 && approx(far.slowPct, 30) };
  };
  assert.deepEqual(run(false), { hit: false, slow: false }, 'sin t2A la sacudida no llega a 6 m');
  assert.deepEqual(run(true), { hit: true, slow: true }, 't2A: la sacudida llega a 7 m y ralentiza un 30 %');
});
check('t2B', () => {
  const h = hero('berserker', 'h1', { t2: 1 }, { t2: 'B' });
  const e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [1.5, 0, 1] });
  chargeTitan(h);
  const s0 = boss.stagger || 0;
  h.setSlot('rmb', 'g_hendidura'); h.p.mp = 100; h.aim(1.5, 0); h.cast('rmb');
  assert.equal(condAdd(h, e, hit('g_hendidura')), 80, 't2B: +80 %');
  h.step(0.5);
  assert.ok((boss.stagger || 0) - s0 >= 25, 't2B: 25 de Quebranto');
});
check('t3', () => {
  const h = hero('berserker', 'h1', { t3: 1 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  chargeTitan(h);
  h.p.unstoppableT = 0;
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(h.p.unstoppableT > 2.4, `t3: imparable 3 s tras el Golpe de Titán (${h.p.unstoppableT})`);
});
check('t4B', () => {
  const h = hero('berserker', 'h1', { t4: 1 }, { t4: 'B' });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  chargeTitan(h);
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  const s = (h.p.shields || []).find(x => x.src === 'g_ti_piel_montana');
  assert.ok(s && approx(s.amt, Math.round(healScaled(h.p.stats.maxHP * 0.08, h.p.stats.healPct)), 1), 't4B: escudo del 8 % de tu vida');
});
check('t5', () => {
  const run = r => { const h = r ? hero('berserker', 'h1', { t5: 1 }) : hero('berserker', 'h1'); h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }); for (let i = 0; i < 2; i++) cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 }); return !!buff(h.p, 'g_ti_golpe_titan'); };
  assert.equal(run(false), false, 'sin t5: 54 de Furia no bastan');
  assert.equal(run(true), true, 't5: llega cada 50 de Furia');
});
check('t6', () => {
  const h = hero('berserker', 'h1', { t6: 1 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  const side = h.enemy({ hp: 1e6, pos: [-3, 0, 0] });
  chargeTitan(h);
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  const after = side.hp;
  h.step(1.0);
  assert.ok(side.hp < after, 't6: la sacudida se repite 1 s después');
});
check('t7', () => {
  const h = hero('berserker', 'h1', { t7: 1 });
  const boss = h.enemy({ hp: 1e7, boss: true });
  assert.equal(condAdd(h, boss, hit('g_tajo')), 0, 't7: nada sin Quebranto');
  boss.addStagger(200, h.p);
  assert.equal(condAdd(h, boss, hit('g_tajo')), 15, 't7: +15 % al jefe Quebrantado');
});
check('t8A', () => {
  const run = ch => {
    const h = ch ? hero('berserker', 'h1', { t8: 1 }, { t8: 'A' }) : hero('berserker', 'h1');
    h.enemy({ hp: 1e6, pos: [3, 0, 3] });
    chargeTitan(h, [3, 3]);
    // la víctima dentro del cono y de la sacudida; el vecino fuera de ambos, a 3 m de ella
    const victim = h.enemy({ hp: 1, pos: [3, 0, 0] }), nb = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
    const hp0 = nb.hp;
    cast(h, 'rmb', 'g_hendidura', { aim: [3, 0], mp: 100, sec: 0.5 });
    return { dead: !victim.alive, boom: nb.hp < hp0 };
  };
  assert.deepEqual(run(false), { dead: true, boom: false }, 'sin t8A no estalla');
  assert.deepEqual(run(true), { dead: true, boom: true }, 't8A: el que muere estalla a 3 m');
});
check('t8B', () => {
  const h = hero('berserker', 'h1', { t8: 1 }, { t8: 'B' });
  const e = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
  const strike = () => { armTitan(h); h.setSlot('rmb', 'g_hendidura'); h.p.mp = 100; h.aim(1.5, 0); h.cast('rmb'); const add = condAdd(h, e, hit('g_hendidura')); h.step(0.5); return add; };
  assert.deepEqual([strike(), strike(), strike(), strike()], [40, 60, 80, 80], 't8B: +20 % por golpe seguido sobre el mismo (hasta +40 %)');
});
check('t9', () => {
  const h = hero('berserker', 'h1', { t9: 1 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  const side = h.enemy({ hp: 1e6, pos: [-3, 0, 0] });
  chargeTitan(h);
  assert.equal(side.outDmgMul(), 1);
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(approx(side.outDmgMul(), 0.9), 't9: los alcanzados hacen un 10 % menos');
});
check('t10', () => {
  const a = hero('berserker', 'h1'), b = hero('berserker', 'h1', { t10: 1 });
  assert.equal(prof(b, 'g_hendidura').addPct - prof(a, 'g_hendidura').addPct, 12, 't10: +12 % a las principales');
  assert.equal(prof(b, 'g_tajo').addPct, prof(a, 'g_tajo').addPct, 't10: solo principales');
});
// t11 Peso Acumulado: −1 s a la definitiva por Golpe de Titán, sin bajar del 70 % de su base
check('t11', () => {
  const h = hero('berserker', 'h1', { t11: 1 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  const ult = sk(h, 'g_u_furia');
  const t0 = h.p.simT;
  cast(h, 'k4', 'g_u_furia', { sec: 0.1 });
  assert.ok(h.p.cds[ult.id] > 0, 'la definitiva se recarga');
  h.tick(ult.dur + 0.5);        // con Furia Inmortal las principales no cuestan: no cargan el Titán
  chargeTitan(h);
  const left = h.p.cds[ult.id];
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(approx(left - h.p.cds[ult.id], 1 + 0.5, 0.05), `t11: −1 s (${left} → ${h.p.cds[ult.id]})`);
  // el suelo: a 0,4 s del 70 % de la base (otra fuente la recortó), el Golpe solo quita 0,4 s
  const floor = () => t0 + ult.cd * 0.7 - h.p.simT;
  armTitan(h);
  h.g.reduceCooldown(h.p, ult.id, h.p.cds[ult.id] - (floor() + 0.4));
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(approx(h.p.cds[ult.id], floor(), 0.05), `t11: sin bajar del 70 % de su base (${h.p.cds[ult.id]} / ${floor()})`);
});
check('t12', () => {
  const h = hero('berserker', 'h1', { t12: 1 });
  h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
  const side = h.enemy({ hp: 1e6, pos: [5, 0, 3] });
  chargeTitan(h);
  cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
  assert.ok(buff(h.p, 'g_ti_coloso'), 't12: el Golpe de Titán te hace gigante');
  // h.hit no quita vida: lo que baja es la sacudida
  const hp0 = side.hp;
  hitWith(h, side, 'g_tajo');
  assert.ok(side.hp < hp0, 't12: tus golpes sacuden el suelo');
  h.tick(8.2);
  const hp1 = side.hp;
  hitWith(h, side, 'g_tajo');
  assert.equal(side.hp, hp1, 't12: dura 8 s');
});

// ================================================================ GLADIADOR (h2)
check('l0', () => {
  const h = hero('berserker', 'h2');
  const a = h.enemy({ hp: 1000, pos: [2, 0, 0] }), b = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  assert.equal(condAdd(h, a, hit('g_tajo')), 0, 'l0: nadie es Rival aún');
  hitWith(h, a, 'g_tajo');
  assert.equal(condAdd(h, a, hit('g_tajo')), 15, 'l0: tu primer golpe lo nombra Rival (+15 %)');
  hitWith(h, b, 'g_tajo');
  assert.equal(condAdd(h, b, hit('g_tajo')), 0, 'l0: un Rival a la vez');
  h.p.mp = 0;
  a.takeDamage(1e6, false, {});
  assert.equal(h.p.mp, 20, 'l0: si muere, +20 de Furia');
  assert.equal(condAdd(h, b, hit('g_tajo')), 15, 'l0: el Rival pasa al más cercano');
  h.tick(10.2);
  assert.equal(condAdd(h, b, hit('g_tajo')), 0, 'l0: dura 10 s');
});
check('l1', () => {
  const run = (tv, rank) => {
    const h = tv ? hero('berserker', 'h2', { l1: 1 }) : hero('berserker', 'h2');
    const e = h.enemy({ hp: 1000, rank, pos: [2, 0, 0] });
    hitWith(h, e, 'g_tajo');
    h.p.hp = h.p.stats.maxHP * 0.5;
    const hp0 = h.p.hp;
    e.takeDamage(1e6, false, {});
    return (h.p.hp - hp0) / h.p.stats.maxHP;
  };
  assert.equal(run(false, 'elite'), 0, 'sin l1 no cura');
  // por la cubeta de sustento (6 %/s): el 10 % de un élite llega hasta lo que deja la cubeta
  assert.ok(approx(run(true, 'elite'), 0.06, 1e-3), 'l1: Rival élite muerto, 10 % (hasta la cubeta de sustento)');
  assert.ok(approx(run(true, null), 0.02, 1e-3), 'l1: Rival normal, 2 %');
});
check('l2A', () => {
  const h = hero('berserker', 'h2', { l2: 1 }, { l2: 'A' });
  const es = [0, 1, 2, 3].map(i => h.enemy({ hp: 1e6, pos: [2, 0, i] }));
  for (const e of es) hitWith(h, e, 'g_tajo');
  assert.deepEqual(es.map(e => condAdd(h, e, hit('g_tajo'))), [10, 10, 10, 0], 'l2A: 3 Rivales a +10 %');
});
check('l2B', () => {
  const h = hero('berserker', 'h2', { l2: 1 }, { l2: 'B' });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  hitWith(h, e, 'g_tajo');
  assert.equal(condAdd(h, e, hit('g_tajo')), 30, 'l2B: +30 %');
  h.tick(15);
  assert.equal(condAdd(h, e, hit('g_tajo')), 30, 'l2B: no caduca');
});
check('l3', () => {
  const h = hero('berserker', 'h2', { l3: 1 });
  const e = h.enemy({ hp: 1e6, pos: [6, 0, 0] }), behind = h.enemy({ hp: 1e6, pos: [9, 0, 0] }), off = h.enemy({ hp: 1e6, pos: [0, 0, 6] });
  hitWith(h, e, 'g_tajo');
  const hp0 = e.hp, b0 = behind.hp, o0 = off.hp;
  h.tick(0.2);
  assert.ok(e.hp < hp0 && approx(e.slowPct, 40) && e.slowT > 0, 'l3: Lanza gratis al Rival que lo ralentiza un 40 %');
  assert.ok(behind.hp < b0 && off.hp === o0, 'l3: atraviesa la línea, no da a los de al lado');
});
check('l4B', () => {
  const h = hero('berserker', 'h2', { l4: 1 }, { l4: 'B' });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
  assert.equal(condAdd(h, e, hit('g_tajo')), 0, 'l4B: nada sin esquivar');
  h.p.dodge(); h.tick(0.2);
  h.p.hp = h.p.stats.maxHP * 0.5;
  const hp0 = h.p.hp;
  assert.equal(condAdd(h, e, hit('g_tajo')), 60, 'l4B: tras esquivar, +60 %');
  hitWith(h, e, 'g_tajo');
  assert.ok(approx(h.p.hp - hp0, h.p.stats.maxHP * 0.05, 1), 'l4B: y te cura un 5 %');
  h.tick(0.1);
  assert.equal(condAdd(h, e, hit('g_tajo')), 15, 'l4B: solo el siguiente golpe (queda el +15 % del Rival)');
});
check('l5', () => {
  const h = hero('berserker', 'h2', { l5: 1 });
  const e = h.enemy({ hp: 1000, pos: [2, 0, 0] });
  hitWith(h, e, 'g_tajo');
  e.hp = 550; hitWith(h, e, 'g_tajo');
  assert.equal(powerState(h.p, 'g_gl_gloria').n, 2, 'l5: 2 de Gloria por perder el 40 % de la vida');
  e.takeDamage(1e6, false, {});
  assert.equal(powerState(h.p, 'g_gl_gloria').n, 3, 'l5: y 1 por matarlo');
  assert.equal(condAdd(h, h.enemy({ hp: 10 }), hit('g_tajo')), 12, 'l5: +4 % por Gloria');
  h.tick(9);
  assert.equal(powerState(h.p, 'g_gl_gloria').n, 0, 'l5: se borra fuera de combate');
});
check('l6', () => {
  const h = hero('berserker', 'h2', { l6: 1 });
  const e = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  hitWith(h, e, 'g_tajo');
  const hp0 = e.hp;
  h.p.dodge(); h.tick(0.2);
  assert.ok(e.hp < hp0, 'l6: al esquivar, Lanza gratis al Rival');
  const hp1 = e.hp;
  h.tick(3.5); h.p.dodge(); h.tick(0.2);
  assert.equal(e.hp, hp1, 'l6: una vez cada 6 s');
});
check('l7', () => {
  const a = hero('berserker', 'h2', { l5: 1 }), b = hero('berserker', 'h2', { l5: 1, l7: 1 });
  for (const h of [a, b]) { const e = h.enemy({ hp: 1000, pos: [2, 0, 0] }); hitWith(h, e, 'g_tajo'); e.hp = 350; hitWith(h, e, 'g_tajo'); }
  assert.equal(b.p.stats.critDmg - a.p.stats.critDmg, 15, 'l7: +5 % de daño de crítico por Gloria (3)');
});
check('l8A', () => {
  const h = hero('berserker', 'h2', { l8: 1 }, { l8: 'A' });
  const r = h.enemy({ hp: 1000, pos: [2, 0, 0] }), near = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [2, 0, 2] });
  hitWith(h, r, 'g_tajo');
  const d0 = near.pos.distanceTo(r.pos);
  r.takeDamage(1e6, false, {});
  assert.ok(near.pos.distanceTo(r.pos) > d0 + 1, 'l8A: los cercanos huyen');
  assert.ok((boss.stagger || 0) >= 20, 'l8A: a los jefes, 20 de Quebranto');
});
check('l8B', () => {
  const h = hero('berserker', 'h2', { l8: 1 }, { l8: 'B' });
  const e = h.enemy({ hp: 1000, pos: [2, 0, 0] });
  hitWith(h, e, 'g_tajo');
  assert.equal(condAdd(h, e, hit('g_tajo')), 15, 'l8B: nada con la vida alta');
  e.hp = 250;
  assert.equal(condAdd(h, e, hit('g_tajo')), 55, 'l8B: +40 % por debajo del 30 %');
});
check('l9', () => {
  const run = (r, dist) => {
    const h = r ? hero('berserker', 'h2', { l9: 1 }) : hero('berserker', 'h2');
    const e = h.enemy({ hp: 1e6, pos: [dist, 0, 0] });
    hitWith(h, e, 'g_tajo');
    h.setSlot('k1', 'embestida');
    h.g._startCooldown(h.p, 'embestida', prof(h, 'embestida'));
    const left = h.p.cds.embestida;
    h.p.dodge(); h.tick(0.1);
    return left - h.p.cds.embestida;
  };
  const base = run(false, 2);
  assert.ok(approx(run(true, 2) - base, 2, 0.01), 'l9: esquivar junto a tu Rival, −2 s a tu movilidad');
  assert.ok(approx(run(true, 6), base, 0.01), 'l9: lejos del Rival, nada');
});
check('l10', () => {
  const h = hero('berserker', 'h2', { l10: 1 });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), o = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  hitWith(h, e, 'g_tajo');
  assert.equal(condCrit(h, e, hit('g_tajo')), 10, 'l10: +10 % de crítico contra tu Rival');
  assert.equal(condCrit(h, o, hit('g_tajo')), 0, 'l10: no contra otros');
});
check('l11', () => {
  const h = hero('berserker', 'h2', { l11: 1 });
  const ult = sk(h, 'g_u_furia');
  h.g._startCooldown(h.p, ult.id, resolveSkill(h.p, ult));
  const e = h.enemy({ hp: 1000, rank: 'elite', pos: [2, 0, 0] });
  hitWith(h, e, 'g_tajo');
  const left = h.p.cds[ult.id];
  e.takeDamage(1e6, false, {});
  assert.ok(approx(left - h.p.cds[ult.id], 6), 'l11: Rival élite muerto, −6 s');
  const e2 = h.enemy({ hp: 1000, rank: 'elite', pos: [2, 0, 1] });
  hitWith(h, e2, 'g_tajo');
  const l2 = h.p.cds[ult.id];
  e2.takeDamage(1e6, false, {});
  assert.ok(approx(l2, h.p.cds[ult.id]), 'l11: como mucho cada 15 s');
});
check('l12', () => {
  const h = hero('berserker', 'h2', { l12: 1, l5: 1 });
  const e = h.enemy({ hp: 1000, pos: [2, 0, 0] });
  hitWith(h, e, 'g_tajo');
  e.hp = 1; hitWith(h, e, 'g_tajo');
  h.tick(0.2);
  assert.equal(powerState(h.p, 'g_gl_gloria').n, 4);
  assert.ok(!buff(h.p, 'g_gl_triunfo'), 'l12: con 4 de Gloria aún no');
  const base = prof(h, 'g_hendidura').cost;
  e.takeDamage(1e6, false, {});
  h.tick(0.2);
  const b = buff(h.p, 'g_gl_triunfo');
  assert.ok(b && b.stats.dmgPct === 25, 'l12: con 5 de Gloria, Triunfo (+25 %)');
  assert.equal(prof(h, 'g_hendidura').cost, Math.round(base * 0.5), 'l12: principales a media Furia');
  const t0 = b.t;
  h.enemy({ hp: 1, pos: [3, 0, 0] }).takeDamage(10, false, {});
  assert.ok(approx(b.t, t0 + 1), 'l12: matar, +1 s');
  for (let i = 0; i < 10; i++) h.enemy({ hp: 1, pos: [3, 0, 1] }).takeDamage(10, false, {});
  assert.ok(approx(b.t, t0 + 5), `l12: hasta 15 s en total (${b.t})`);
  h.tick(16);
  assert.ok(!buff(h.p, 'g_gl_triunfo'), 'l12: se acaba');
  const e2 = h.enemy({ hp: 1000, pos: [2, 0, 0] });
  for (const hp of [1000, 1]) { e2.hp = hp; hitWith(h, e2, 'g_tajo'); }
  e2.takeDamage(1e6, false, {});
  h.tick(0.2);
  assert.ok(!buff(h.p, 'g_gl_triunfo'), 'l12: como mucho cada 35 s');
});

// ================================================================ CAUDILLO (h3)
const pendons = h => (h.g.fields || []).filter(f => !f.dead && f.kind === 'g_pendon');
check('u0', () => {
  const h = hero('cruzado', 'h3');
  h.tick(0.3);
  assert.equal(pendons(h).length, 0, 'u0: sin enemigos cerca no clava');
  h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  h.tick(0.3);
  assert.equal(pendons(h).length, 1, 'u0: en combate clava un Pendón');
  const b = buff(h.p, 'g_cau_pendon');
  assert.ok(b && b.stats.dmgPct === 8 && b.stats.dr === 8, 'u0: +8 % de daño y −8 % de daño recibido dentro');
  h.tick(11.5);
  assert.equal(pendons(h).length, 1, 'u0: sigue a los 11,5 s');
  h.tick(1.1);
  assert.ok(pendons(h).length === 0 && !buff(h.p, 'g_cau_pendon'), 'u0: dura 12 s');
  h.tick(2.5);
  assert.equal(pendons(h).length, 1, 'u0: vuelve a los 15 s');
});
const planted = (h, extra = 0.3) => { h.enemy({ hp: 1e6, pos: [5, 0, 0] }); h.tick(extra); return pendons(h)[0]; };
check('u1', () => { const h = hero('cruzado', 'h3', { u1: 1 }); assert.equal(planted(h).radius, 12, 'u1: el Pendón alcanza 12 m'); });
check('u2A', () => { const h = hero('cruzado', 'h3', { u2: 1 }, { u2: 'A' }); planted(h); assert.equal(buff(h.p, 'g_cau_pendon').stats.dmgPct, 16, 'u2A: +16 % de daño'); });
check('u2B', () => { const h = hero('cruzado', 'h3', { u2: 1 }, { u2: 'B' }); planted(h); assert.equal(buff(h.p, 'g_cau_pendon').stats.dr, 16, 'u2B: −16 % de daño recibido'); });
check('u3', () => {
  const run = r => {
    const h = r ? hero('cruzado', 'h3', { u3: 1 }) : hero('cruzado', 'h3');
    const ally = h.ally(3, 0, 1000), far = h.ally(12, 0, 1000); ally.hp = 500; far.hp = 500;
    h.p.hp = h.p.stats.maxHP * 0.5;
    const hp0 = h.p.hp;
    planted(h);
    return { me: h.p.hp - hp0, ally: ally.hp - 500, far: far.hp - 500 };
  };
  const a = run(false), b = run(true);
  assert.ok(a.ally === 0 && b.ally > 0 && b.me > a.me, `u3: al clavarlo, curas a todos a 8 m (${JSON.stringify(b)})`);
  assert.equal(b.far, 0, 'u3: no a los que están lejos');
});
check('u4B', () => {
  const h = hero('cruzado', 'h3', { u4: 1 }, { u4: 'B' });
  const f = planted(h);
  h.walk({ x: 1, z: 0 }, 1.0);
  assert.ok(Math.hypot(f.pos.x - h.p.pos.x, f.pos.z - h.p.pos.z) < 1e-6 && h.p.pos.x > 1, 'u4B: el Pendón te sigue');
});
check('u5', () => { const h = hero('cruzado', 'h3', { u5: 1 }); h.p.mp = 0; planted(h); assert.equal(h.p.mp, 20, 'u5: +20 de Furia al clavarlo'); });
check('u6', () => { const h = hero('cruzado', 'h3', { u6: 1 }); planted(h); assert.equal(buff(h.p, 'g_cau_pendon').stats.spdPct, 15, 'u6: +15 % de velocidad dentro'); });
check('u7', () => {
  const h = hero('cruzado', 'h3', { u7: 1 });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  planted(h);
  assert.ok(approx(e.outDmgMul(), 0.9), 'u7: los enemigos dentro hacen un 10 % menos');
});
check('u8A', () => {
  const h = hero('cruzado', 'h3', { u8: 1 }, { u8: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [0, 0, 3] });
  h.tick(0.3);
  assert.ok(e.pos.distanceTo(h.p.pos) > 3.5, 'u8A: los enemigos a 8 m huyen');
  assert.ok((boss.stagger || 0) >= 20, 'u8A: a los jefes, 20 de Quebranto');
});
check('u8B', () => {
  const h = hero('cruzado', 'h3', { u8: 1 }, { u8: 'B' });
  const small = h.enemy({ hp: 1000, pos: [3, 0, 0] }), big = h.enemy({ hp: 9000, pos: [6, 0, 0] });
  h.tick(0.3);
  assert.ok(big.weaknessPct() >= 15 && !(small.weaknessPct() > 0), 'u8B: el de más vida recibe +15 %');
});
check('u9', () => {
  const h = hero('cruzado', 'h3', { u9: 1 });
  planted(h);
  h.tick(17);
  assert.equal(pendons(h).length, 2, 'u9: dura 20 s (dos clavados a la vez)');
  assert.equal(buff(h.p, 'g_cau_pendon').stats.dmgPct, 8, 'u9: dos a la vez no se suman');
});
check('u10', () => {
  const run = r => {
    const h = r ? hero('cruzado', 'h3', { u10: 1 }) : hero('cruzado', 'h3');
    h.setSlot('k1', 'embestida');
    planted(h);
    h.g._startCooldown(h.p, 'embestida', prof(h, 'embestida'));
    const left = h.p.cds.embestida;
    h.tick(1.0);
    return left - h.p.cds.embestida;
  };
  const a = run(false), b = run(true);
  assert.ok(approx(a, 1, 0.02) && approx(b, 1.12, 0.03), `u10: dentro, recargas un 12 % más rápidas (${a} → ${b})`);
});
check('u11', () => {
  const h = hero('cruzado', 'h3', { u11: 1 });
  const ally = h.ally(3, 0, 1000);
  planted(h);
  h.tick(12.1);
  assert.ok((h.p.shields || []).some(s => s.src === 'g_cau_relevo') && ally.shields.some(s => s.src === 'g_cau_relevo'), 'u11: al acabar, escudo a ti y a tus aliados');
  const s = h.p.shields.find(x => x.src === 'g_cau_relevo');
  assert.ok(approx(s.amt, Math.round(healScaled(h.p.stats.maxHP * 0.1, h.p.stats.healPct)), 1), 'u11: del 10 % de su vida');
});
check('u12', () => {
  const h = hero('cruzado', 'h3', { u12: 1 });
  const f = planted(h);
  assert.ok(f.data.gran && f.radius === 16 && buff(h.p, 'g_cau_pendon').stats.dmgPct === 16, 'u12: el doble de grande y de efecto');
  h.tick(15.2);
  const f2 = pendons(h).find(x => x !== f);
  assert.ok(f2 && !f2.data.gran && f2.radius === 8, 'u12: el siguiente es normal (cada 40 s)');
});

// ================================================================ cobertura
const keysOf = nodes => nodes.flatMap(n => (n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o]) : n.free && !Object.keys(n.fx || {}).length ? [] : [[n.id, n]]));
const ALL = [...keysOf(TT.cls.nodes), ...TT.hero.flatMap(h => keysOf(h.nodes))];
// opciones cuya activa (y su grant) escribe KA1 (punto 16 del plan): hasta entonces conservan `todo`
const PENDING_GRANT = { c17A: 'grito_guerra', t4A: 'g_h_bramido', l4A: 'g_h_desafio', u4A: 'g_h_estandarte' };
let pend = 0;
for (const [key, o] of ALL) {
  if (PENDING_GRANT[key]) {
    const id = PENDING_GRANT[key];
    const act = CLASSES.guerrero.skills.find(s => s.id === id && s.kind === 'talent');
    if (act) assert.equal(o.fx?.grant, id, `${key}: la activa ${id} ya existe: su opción la concede`);
    else { assert.ok(o.todo, `${key}: sin la activa ${id}, la opción sigue pendiente (todo)`); pend++; }
    continue;
  }
  assert.ok(!('todo' in o), `${key}: sin «todo»`);
  assert.ok(Object.keys(o.fx || {}).length, `${key}: fx con efecto`);
  assert.ok(CHECKS[key], `${key}: falta su prueba de efecto observable`);
}
for (const key of Object.keys(CHECKS)) assert.ok(ALL.some(([k]) => k === key), `prueba ${key} sin nodo`);
for (const [key, fn] of Object.entries(CHECKS)) {
  try { fn(); } catch (e) { e.message = `[${key}] ${e.message}`; throw e; }
}
console.log(`✓ ${Object.keys(CHECKS).length} nodos u opciones de clase y héroe con efecto observable (${pend} pendientes del grant de KA1)`);

// las claves tv propias las lee un poder del Guerrero
for (const k of GUERRERO_TV_KEYS) assert.ok(new RegExp(`\\btv\\??\\.${k}\\b`).test(SRC), `GUERRERO_TV_KEYS: «${k}» no la lee js/powers-guerrero.js`);
assert.ok(!new RegExp('\\btv\\??\\.titanInventada\\b').test(SRC), 'la comprobación de lectura rechaza una clave que nadie lee');
// los poderes de los nodos de clase y héroe usan el prefijo de la clase y están registrados
for (const [key, o] of ALL) if (o.fx?.power) assert.ok(/^g_/.test(o.fx.power) && POWER_HOOKS[o.fx.power], `${key}: poder ${o.fx.power} registrado`);
console.log(`✓ ${GUERRERO_TV_KEYS.length} claves tv propias leídas por sus poderes`);

console.log('\n✅ TALENTOS DEL GUERRERO (clase y héroe): cada nodo con su efecto');
