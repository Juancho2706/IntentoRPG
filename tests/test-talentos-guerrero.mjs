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
import { TALENT_TREES, buildRanks, buildsFor, defaultBuildKey, skillLearnLevel } from '../js/talents.js';
import { levelTrees, buyLevel } from './helpers/talent-level.mjs';
import { GUERRERO_TV_KEYS } from '../js/talents-guerrero.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { firePower, powerState, POWER_HOOKS } from '../js/powers.js';
import { CLASSES } from '../js/data.js';
import * as THREE from 'three';
import { dotProfile, healScaled, multiplierProduct, blockReduction } from '../js/combat-math.js';
import { gaugeMax, gainGauge } from '../js/spec-mechanics.js';

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
  // y el 3.er golpe de Rajar (paso de combo con preparación: '<id>@windup' lo produce skill-resolve)
  const r = rajarStep3(true, 'A'), r0 = rajarStep3(false);
  // (+40 % al saco aditivo: con el resto del saco, algo menos de ×1,4)
  assert.ok(approx(r.windup - r0.windup, 0.3, 0.02) && r.wm?.dmg === 40 && r.dealt / r0.dealt > 1.3 && r.dealt / r0.dealt <= 1.41,
    `c9A: el 3.er golpe de Rajar se prepara 0,3 s más y hace +40 % (${JSON.stringify(r)} / ${JSON.stringify(r0)})`);
});
// 3.er golpe de Rajar con o sin c9 (opción `ch`): cuánto tarda desde el lanzamiento y cuánto hace
function rajarStep3(on, ch) {
  const h = on ? spec('berserker', {}, { c9: ch }, { cls: { c9: 1 } }) : spec('berserker');
  h.p.combatRng = () => 0.999;
  const e = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
  const t0 = h.p.simT;
  let at = null, dealt = 0;
  const orig = h.g.onPlayerHit.bind(h.g);
  h.g.onPlayerHit = (en, hit) => { if (en === e && hit.step === 3 && !hit.dot && !hit.proc && at == null) { at = h.p.simT; dealt = hit.dealt; } return orig(en, hit); };
  rajar3(h, [2, 0], 0.9);
  return { windup: at == null ? null : at - t0, dealt, wm: prof(h, 'g_rajar').windupMods };
}
// c9B Sin Pausa: la mitad de preparación, sin frenar, y prepararse no rompe el plantado
check('c9B', () => {
  const a = cls(), b = cls({ c9: 1 }, { c9: 'B' });
  assert.ok(approx(prof(b, 'g_hendidura').windup, prof(a, 'g_hendidura').windup * 0.5), 'c9B: la mitad de preparación');
  const r = rajarStep3(true, 'B'), r0 = rajarStep3(false);
  assert.ok(approx(r.windup - r0.windup, -0.15, 0.02), `c9B: el 3.er golpe de Rajar, también la mitad (${r.windup} / ${r0.windup})`);
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
  // su recarga REAL (g.startCooldown): la ranura la enseña si la pones
  const cdA = prof(off.h, 'g_t_aliento').cd;
  assert.ok(off.h.p.cdMax.g_t_aliento === cdA && approx(off.h.p.cds.g_t_aliento, cdA, 0.15), `c11A: pone la recarga de Segundo Aliento (${off.h.p.cds.g_t_aliento} / ${cdA})`);
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
  const cdG = prof(h, 'grito_guerra').cd;
  assert.ok(h.p.cdMax.grito_guerra === cdG && approx(h.p.cds.grito_guerra, cdG, 0.15), `c17A: pone la recarga del Grito (${h.p.cds.grito_guerra} / ${cdG})`);
  h.step(1); h.g.reduceCooldown(h.p, 'g_piel', Infinity); h.p.mp = 0;
  cast(h, 'k2', 'g_piel', { sec: 0.1 });
  assert.equal(h.p.mp, 0, 'c17A: respeta su recarga');
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
  const cdI = prof(h, 'g_t_intervencion').cd;
  assert.ok(h.p.cdMax.g_t_intervencion === cdI && approx(h.p.cds.g_t_intervencion, cdI, 0.15), `c22A: pone la recarga de Intervención (${h.p.cds.g_t_intervencion} / ${cdI})`);
  h.step(1); h.g.reduceCooldown(h.p, 'g_piel', Infinity);
  cast(h, 'k2', 'g_piel', { sec: 0.1 });
  assert.equal(ally.shields.length, 1, 'c22A: respeta su recarga');
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
    h.g._startCooldown(h.p, 'g_piel', prof(h, 'g_piel'));
    h.tick(prof(h, 'g_piel').dur + 0.2);                // la Piel se recarga al acabar su efecto
    for (const id of ['embestida', 'grito_guerra', 'g_t_aliento']) h.g._startCooldown(h.p, id, prof(h, id));
    assert.ok(h.p.cds.g_piel > 5 && h.p.cds.embestida > 1 && h.p.cds.g_t_aliento > 1, 'c23: las recargas corren');
    const before = { ...h.p.cds };
    hitWith(h, e, 'g_tajo', { crit: false });
    hitWith(h, e, 'g_lanza', { crit: true });
    const mid = { ...h.p.cds };
    hitWith(h, e, 'g_tajo', { crit: true });
    hitWith(h, e, 'g_tajo', { crit: true });                 // mismo instante: no cuenta dos veces
    const cut = id => before[id] - h.p.cds[id];
    assert.ok(approx(mid.embestida, before.embestida), 'c23: ni golpes normales ni críticos de otras habilidades');
    return { mov: cut('embestida'), piel: cut('g_piel'), otra: cut('grito_guerra'), aliento: cut('g_t_aliento') };
  };
  assert.deepEqual(run(0), { mov: 0, piel: 0, otra: 0, aliento: 0 }, 'sin c23 no recarga');
  const r2 = run(2);
  assert.ok(approx(r2.mov, 1) && approx(r2.piel, 1) && r2.otra === 0, `c23 r2: −1 s a la movilidad y a la Piel, una vez por instante (${JSON.stringify(r2)})`);
  assert.equal(r2.aliento, 0, 'c23: Segundo Aliento (otra defensa) no se recarga: solo la movilidad y la Piel');
  // el Sendero de Luz nunca baja de 4 s (Luz Veloz 3: 7 s; 6 críticos le quitarían 6 s)
  const h = spec('cruzado', { z3: 3 }, {}, { cls: { c23: 2 } });
  const e = h.enemy({ hp: 1e9, pos: [1.2, 0, 0] });
  cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.05 });
  const t0 = powerState(h.p, 'g_ult_suelo').start?.g_sendero;
  assert.ok(t0 != null && approx(h.p.cdMax.g_sendero, 7, 0.01), 'c23: el Sendero se recarga en 7 s y se anota su inicio');
  for (let i = 0; i < 6; i++) { hitWith(h, e, 'g_tajo', { crit: true }); h.tick(0.05); }
  const eff = h.p.simT - t0 + h.p.cds.g_sendero;
  assert.ok(h.p.cds.g_sendero > 0 && approx(eff, 4, 0.06), `c23: el Sendero nunca baja de 4 s (${eff.toFixed(2)} s)`);
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
  // g.startCooldown: la ranura enseña la recarga de 15 s entera (p.cds y p.cdMax)
  assert.ok(approx(h.p.cds.g_piel, 15, 0.01) && h.p.cdMax.g_piel === 15, `c28: la ranura enseña la recarga real de 15 s (${h.p.cds.g_piel} / ${h.p.cdMax.g_piel})`);
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
// t4A Bramido de Titán: aturde a 6 m (a los jefes, Quebranto) y arma el Golpe de Titán
check('t4A', () => {
  const h = hero('berserker', 'h1', { t4: 1 }, { t4: 'A' });
  assert.ok(!!h.p.skills.g_h_bramido, 't4A: concede el Bramido de Titán');
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), far = h.enemy({ hp: 1e6, pos: [9, 0, 0] }), boss = h.enemy({ hp: 1e9, boss: true, pos: [0, 0, 3] });
  assert.ok(!buff(h.p, 'g_ti_golpe_titan'), 't4A: sin Golpe de Titán armado');
  cast(h, 'k2', 'g_h_bramido', { sec: 0.2 });
  assert.ok(e.stunT > 1 && !(far.stunT > 0), `t4A: aturde 1,5 s a los de 6 m (${e.stunT})`);
  assert.ok(!(boss.stunT > 0) && boss.stagger > 0, 't4A: a los jefes, Quebranto');
  assert.ok(buff(h.p, 'g_ti_golpe_titan'), 't4A: tu siguiente principal es un Golpe de Titán');
  const n = hero('berserker', 'h1', { t4: 1 }, { t4: 'B' });
  assert.ok(!!!n.p.skills.g_h_bramido, 't4B no concede el Bramido');
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
    // (la build del Berserker agranda el cono un 30 %: el vecino, a 3 m pero fuera de su alcance)
    const victim = h.enemy({ hp: 1, pos: [4.8, 0, 0] }), nb = h.enemy({ hp: 1e6, pos: [7.8, 0, 0] });
    const hp0 = nb.hp;
    cast(h, 'rmb', 'g_hendidura', { aim: [4.8, 0], mp: 100, sec: 0.5 });
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
  // con Furia Inmortal las principales no cuestan: no cargan el Titán. Su duración, la del perfil
  // REAL (a Nv100 la Mejora Sin Freno la lleva de 10 a 12 s)
  h.tick(prof(h, ult.id).dur + 0.5);
  assert.ok(!buff(h.p, 'g_u_furia'), 'Furia Inmortal ya acabó');
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
// l4A Desafío de Arena: nombra Rival al de la mira, lo encierra contigo y le da Debilidad
check('l4A', () => {
  const h = hero('berserker', 'h2', { l4: 1 }, { l4: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] }), other = h.enemy({ hp: 1e6, pos: [-4, 0, 0] });
  cast(h, 'k2', 'g_h_desafio', { aim: [4, 0], sec: 0.2 });
  const z = (h.g.fields || []).find(f => !f.dead && f.kind === 'zona' && f.data?.skill === 'g_h_desafio');
  assert.ok(z && z.data.contain && z.radius === 6, 'l4A: un círculo de 6 m que encierra');
  assert.ok(e.marks?.g_h_desafio, 'l4A: le marca (Debilidad +20 %)');
  assert.equal(condAdd(h, e, hit('g_tajo')) - condAdd(h, other, hit('g_tajo')), 15, 'l4A: es tu Rival (+15 %); el +20 % es la Debilidad de su marca (no se suma dos veces)');
  const n = hero('berserker', 'h2', { l4: 1 }, { l4: 'B' });
  assert.ok(!!!n.p.skills.g_h_desafio, 'l4B no concede el Desafío');
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
// miedo real (Enemy.applyCC('fear')): asustado (`dur` s, si se da) desde `from`; en su IA
// (e.update) se aleja de ahí durante 1 s. → cuánto se alejó
function flees(e, from, dur = null) {
  assert.ok(e.fearT > 0 && (dur == null || approx(e.fearT, dur, 1e-6)) && approx(e.fearFrom?.x, from.x) && approx(e.fearFrom?.z, from.z),
    `asustado${dur == null ? '' : ` ${dur} s`} desde (${from.x}, ${from.z}): ${e.fearT}`);
  const d0 = Math.hypot(e.pos.x - from.x, e.pos.z - from.z);
  for (let t = 0; t < 1 - 1e-9; t += 1 / 60) e.update(1 / 60);
  return Math.hypot(e.pos.x - from.x, e.pos.z - from.z) - d0;
}
check('l8A', () => {
  const run = on => {
    const h = on ? hero('berserker', 'h2', { l8: 1 }, { l8: 'A' }) : hero('berserker', 'h2');
    const r = h.enemy({ hp: 1000, pos: [2, 0, 0] }), near = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [2, 0, 2] });
    // inmune al miedo por los rendimientos decrecientes del control duro (applyCC devuelve 0)
    const imm = h.enemy({ hp: 1e6, pos: [3, 0, -1] });
    imm.stunDR = 0.95;
    hitWith(h, r, 'g_tajo');
    const at = { x: r.pos.x, z: r.pos.z };
    r.takeDamage(1e6, false, {});
    return { h, near, boss, at, imm };
  };
  const a = run(false), b = run(true);
  assert.ok(!(a.near.fearT > 0) && !(a.boss.stagger > 0), 'sin l8A nadie huye');
  assert.ok(flees(b.near, b.at, 2) > 1, 'l8A: los cercanos huyen 2 s del Rival caído');
  assert.ok(!(b.boss.fearT > 0) && (b.boss.stagger || 0) >= 20, 'l8A: a los jefes no los asusta: 20 de Quebranto');
  assert.ok(!(b.imm.fearT > 0) && b.imm.pos.x === 3 && b.imm.pos.z === -1, `l8A: al inmune al miedo no se lo empuja en su lugar (${b.imm.pos.x}, ${b.imm.pos.z})`);
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
// u4A Estandarte de Guerra: clava al instante un Pendón en la mira (no un aura aparte)
check('u4A', () => {
  const h = hero('cruzado', 'h3', { u4: 1 }, { u4: 'A' });
  h.enemy({ hp: 1e6, pos: [40, 0, 0] });
  h.tick(0.3);
  assert.equal(pendons(h).length, 0, 'u4A: sin enemigos cerca no se clava el automático');
  cast(h, 'k2', 'g_h_estandarte', { aim: [6, 0], sec: 0.2 });
  const p = pendons(h);
  assert.ok(p.length === 1 && approx(p[0].pos.x, 6, 0.01) && approx(p[0].pos.z, 0, 0.01), 'u4A: un Pendón en la mira');
  assert.ok(!(h.g.fields || []).some(f => !f.dead && f.kind === 'aura' && f.data?.buffId === 'g_h_estandarte') && !buff(h.p, 'g_h_estandarte'), 'u4A: sin aura aparte');
  const n = hero('cruzado', 'h3', { u4: 1 }, { u4: 'B' });
  assert.ok(!!!n.p.skills.g_h_estandarte, 'u4B no concede el Estandarte');
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
  const run = on => {
    const h = on ? hero('cruzado', 'h3', { u8: 1 }, { u8: 'A' }) : hero('cruzado', 'h3');
    const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), far = h.enemy({ hp: 1e6, pos: [9.5, 0, 0] }), boss = h.enemy({ hp: 1e7, boss: true, pos: [0, 0, 3] });
    const imm = h.enemy({ hp: 1e6, pos: [0, 0, -3] });
    imm.stunDR = 0.95;                                     // inmune al miedo (rendimientos decrecientes)
    h.tick(0.3);
    return { h, e, far, boss, imm, f: pendons(h)[0] };
  };
  const a = run(false), b = run(true);
  assert.ok(a.f && b.f && !(a.e.fearT > 0) && !(a.boss.stagger > 0), 'sin u8A, el Pendón no asusta');
  assert.ok(!(b.far.fearT > 0), 'u8A: a más de 8 m, no');
  assert.ok(!(b.imm.fearT > 0) && b.imm.pos.x === 0 && b.imm.pos.z === -3, `u8A: al inmune al miedo no se lo empuja en su lugar (${b.imm.pos.x}, ${b.imm.pos.z})`);
  // el Pendón asusta al clavarse: lo que le queda de miedo + la edad del Pendón = 2 s
  assert.ok(approx(b.e.fearT + b.f.age, 2, 0.02), `u8A: huyen 2 s (${b.e.fearT} + ${b.f.age})`);
  assert.ok(flees(b.e, b.f.pos) > 1, 'u8A: los enemigos a 8 m huyen del Pendón');
  assert.ok(!(b.boss.fearT > 0) && (b.boss.stagger || 0) >= 20, 'u8A: a los jefes no los asusta: 20 de Quebranto');
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

// ================================================================ ESPECIALIZACIONES (trabajos 2 y 3)
// SOLO los nodos pedidos de la especialización (y su clave gratis), Nv100
function spec(sp, ranks = {}, choice = {}, opts = {}) {
  const h = makeHarness({ classId: 'guerrero', spec: sp, level: opts.level || 100, seed: opts.seed || 7, talents: { specRanks: ranks, choice, cls: opts.cls || {} } });
  assert.equal(h.p.talentAgg.spec, sp, `${sp}: especialización activa`);
  return h;
}
const hasPw = (h, id) => [...h.p.powers].includes(id);
// impacto por ⑤ con los campos de HitInfo que h.hit no pasa (step, perfect, repeat, echo, detonated)
function fire(h, e, extra = {}) {
  const hit = { dealt: 100, raw: 100, crit: false, skill: null, elem: 'physical', proc: false, dot: false, source: 'hit', pos: { x: e.pos.x, z: e.pos.z }, ...extra };
  hit.tags = new Set(extra.tags || CLASSES.guerrero.skills.find(s => s.id === hit.skill)?.tags || []);
  h.g.onPlayerHit(e, hit);
  return hit;
}
// registro de los impactos que pasan por ⑤ (copia de su HitInfo)
function spyHits(h) {
  const log = [];
  const orig = h.g.onPlayerHit.bind(h.g);
  h.g.onPlayerHit = (e, hit) => { log.push({ e, ...hit }); return orig(e, hit); };
  return log;
}
// suma de condAdd de los poderes EN EL MOMENTO de cada tirada de daño
function spyAdd(h) {
  const log = [];
  const orig = h.p.rollDamage.bind(h.p);
  h.p.rollDamage = (coef, cb, add, e, info) => {
    log.push({ e, skill: info?.skill, add: firePower('condAdd', h.p, h.p, e, info || {}), t: h.p.simT });
    return orig(coef, cb, add, e, info);
  };
  return log;
}
const v3t = (x, z) => new THREE.Vector3(x, 0, z);
// curas que recibe un aliado del arnés, por fuente
function healsBy(a) {
  const log = {}, orig = a.healSkill.bind(a);
  a.healSkill = (n, src) => { const got = orig(n, src); log[src] = (log[src] || 0) + got; return got; };
  return log;
}
const dotsOf = (h, e, k = 'bleed') => h.g.dotsOf(e, k);
// combo de Rajar en su 3.er golpe
function rajar3(h, aim = [2, 0], sec = 0.5) { h.g.setComboStep(h.p, 'g_rajar', 3); return cast(h, 'rmb', 'g_rajar', { aim, mp: 100, sec }); }
// salto (o relanzamiento) del Salto Devastador
const jump = (h, aim = [4, 0], sec = 0.9) => cast(h, 'k1', 'g_salto', { aim, sec });
// gasta los segundos de una recarga «al acabar» (Piel de Hierro): pasa su efecto y deja la recarga corriendo
function pielRecharging(h) {
  h.g._startCooldown(h.p, 'g_piel', prof(h, 'g_piel'));
  h.tick(prof(h, 'g_piel').dur + 0.2);
  assert.ok(h.p.cds.g_piel > 5, 'la Piel de Hierro se está recargando');
}

// el Sangrado que deja DE VERDAD un giro del Remolino (el primer tic del canal, a los 0,25 s). Con
// un arma fuerte: el tic de un DoT se redondea a un entero (con el puño, 1 por tic y no se ve el %)
function spinBleed(h) {
  h.p.equipment.weapon = { kind: 'item', slot: 'weapon', name: 'Hacha de prueba', dmg: [3000, 3000], affixes: {}, quality: 0 };
  h.p.recompute();
  const e = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
  h.setSlot('k3', 'g_remolino'); h.p.mp = 100;
  h.press('k3'); h.step(0.27);
  const d = h.g.dotsOf(e, 'g_remolino:bleed');
  assert.equal(d.length, 1, `un giro deja su Sangrado (${JSON.stringify(h.g.dotsOf(e))})`);
  return d[0];
}

// ---------------- BERSERKER (b*) ----------------
check('b0', () => {
  const b = spec('berserker'), d = spec('guardian');
  assert.ok(hasPw(b, 'm_berserk') && !hasPw(d, 'm_berserk'), 'b0: Al borde (m_berserk) es del Berserker');
  assert.equal(b.p.talentAgg.mechanic, 'sed', 'b0: la mecánica es la Sed');
  assert.ok(approx(multiplierProduct(b.p.powers, { hpFrac: 0.3, p: b.p }), 1.25), 'b0: ×1,25 con menos del 40 % de vida');
  assert.equal(multiplierProduct(b.p.powers, { hpFrac: 0.9, p: b.p }), 1, 'b0: con la vida alta, nada');
  b.gauge('sed', 100);
  assert.ok(b.gaugeState('sed').satedT > 5.9, 'b0: a 100, Sed Saciada 6 s');
  assert.ok(approx(multiplierProduct(b.p.powers, { hpFrac: 0.9, p: b.p }), 1.25), 'b0: con la Sed Saciada, ×1,25 aunque la vida esté alta');
  assert.equal(multiplierProduct(d.p.powers, { hpFrac: 0.3, p: d.p }), 1, 'b0: el Guardián no lo tiene');
});
check('b1', () => {
  const t = r => dotProfile('bleed', 100, { tv: (r ? spec('berserker', { b1: r }) : spec('berserker')).p.tv }).ticks;
  assert.equal(t(0), 3);
  assert.equal(t(3), 6, 'b1 r3: los Sangrados duran 6 s');
  // también el de los giros del Remolino (hitDot: mismo daño por segundo, el doble de largo)
  const hd = r => prof(r ? spec('berserker', { b1: r }) : spec('berserker'), 'g_remolino').hitDot;
  assert.ok(hd(3).dur === 6 && hd(0).dur === 3 && approx(hd(3).coef / hd(0).coef, 2), `b1 r3: el Sangrado del Remolino dura 6 s (${JSON.stringify(hd(3))})`);
  const a = spinBleed(spec('berserker')), b = spinBleed(spec('berserker', { b1: 3 }));
  assert.ok(a.ticks * a.interval === 3 && b.ticks * b.interval === 6 && a.per > 50 && approx(b.per / a.per, 1, 0.01),
    `b1 r3: el giro deja un Sangrado de 6 s con el mismo daño por segundo (${a.ticks}×${a.per.toFixed(2)} → ${b.ticks}×${b.per.toFixed(2)})`);
});
check('b2', () => {
  assert.equal(prof(spec('berserker', { b2: 3 }), 'g_rajar').critBonus - prof(spec('berserker'), 'g_rajar').critBonus, 15, 'b2 r3: Rajar +15 % de crítico');
  assert.equal(prof(spec('berserker', { b2: 3 }), 'g_salto').critBonus, prof(spec('berserker'), 'g_salto').critBonus, 'b2: solo Rajar');
});
check('b3', () => {
  assert.ok(approx(prof(spec('berserker', { b3: 3 }), 'g_salto').cd, 7.5), 'b3 r3: el Salto se recarga en 7,5 s');
  assert.ok(approx(prof(spec('berserker'), 'g_salto').cd, 12));
});
check('b4', () => {
  const a = dotProfile('bleed', 100, { tv: spec('berserker').p.tv }).total, b = dotProfile('bleed', 100, { tv: spec('berserker', { b4: 2 }).p.tv }).total;
  assert.ok(approx(b / a, 1.3), 'b4 r2: Sangrados +30 %');
  const hd = h => prof(h, 'g_remolino').hitDot;
  assert.ok(approx(hd(spec('berserker', { b4: 2 })).coef / hd(spec('berserker')).coef, 1.3), 'b4 r2: también el Sangrado de los giros del Remolino');
  const sa = spinBleed(spec('berserker')), sb = spinBleed(spec('berserker', { b4: 2 }));
  assert.ok(sa.ticks === sb.ticks && sa.per > 50 && approx(sb.total / sa.total, 1.3, 0.01), `b4 r2: el giro deja un Sangrado un 30 % mayor (${sa.total.toFixed(1)} → ${sb.total.toFixed(1)})`);
});
check('b5', () => {
  const run = on => {
    const h = on ? spec('berserker', { b5: 1 }) : spec('berserker');
    const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
    h.g.applyDoT(e, 300, 3, 1, undefined, 'g_tajo:bleed');
    h.tick(2.05);
    const sed0 = h.gaugeValue('sed');
    fire(h, e, { skill: 'g_rajar', step: 1 });
    fire(h, e, { skill: 'g_rajar', step: 1 });
    return { left: dotsOf(h, e)[0]?.left, sed: h.gaugeValue('sed') - sed0 };
  };
  const a = run(false), b = run(true);
  assert.ok(a.left === 1 && a.sed === 0, `sin b5 no reinicia (${JSON.stringify(a)})`);
  assert.ok(b.left === 3 && approx(b.sed, 3), `b5: reinicia el Sangrado y da 3 de Sed una vez por golpe (${JSON.stringify(b)})`);
});
check('b6', () => {
  const run = on => {
    const h = on ? spec('berserker', { b6: 1 }) : spec('berserker');
    h.enemy({ hp: 1e6, pos: [4, 0, 0] });
    jump(h);
    return h.p.skState?.g_rajar?.combo?.idx || 0;
  };
  assert.equal(run(false), 0, 'sin b6 el combo empieza por el 1.º');
  assert.equal(run(true), 2, 'b6: tras caer, el siguiente Rajar es el 3.er golpe');
});
check('b7', () => {
  const run = r => {
    const h = r ? spec('berserker', { b7: r }) : spec('berserker');
    const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
    jump(h, [4, 0], 0.5);
    return { t: e.slowT || 0, pct: e.slowPct || 0 };
  };
  assert.equal(run(0).t, 0, 'sin b7 la caída no ralentiza');
  const r1 = run(1), r2 = run(2);
  assert.ok(r1.pct === 25 && r2.pct === 50 && r2.t > 1.8 && r2.t <= 2, `b7: ralentiza 25/50 % durante 2 s (${JSON.stringify(r2)})`);
});
check('b8A', () => {
  const run = on => {
    const h = on ? spec('berserker', { b8: 1 }, { b8: 'A' }) : spec('berserker');
    const a = h.enemy({ hp: 1000, pos: [3, 0, 0] }), b = h.enemy({ hp: 1e6, pos: [4.5, 0, 0] }), c = h.enemy({ hp: 1e6, pos: [3, 0, 2] }), far = h.enemy({ hp: 1e6, pos: [8, 0, 0] });
    h.g.applyDoT(a, 300, 3, 1, undefined, 'g_tajo:bleed');
    a.takeDamage(1e6, false, {});
    return [b, c, far].map(e => h.g.dotRemaining(e, 'bleed'));
  };
  assert.deepEqual(run(false), [0, 0, 0], 'sin b8A no se contagia');
  const [b, c, far] = run(true);
  assert.ok(approx(b, 300, 1) && approx(c, 300, 1) && far === 0, `b8A: lo que le quedaba pasa a 2 enemigos a 3 m (${b}, ${c}, ${far})`);
});
check('b8B', () => {
  // la regla del Berserker (la Sed): el Sangrado de golpe SUSTITUYE al que esa habilidad ya había
  // dejado (⑤ lo quita y el núcleo pone el nuevo); las copias y los golpes que no desangran no lo
  // tocan, y el de los giros (Remolino) se acumula
  {
    const h = spec('berserker'), e = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    h.g.applyDoT(e, 300, 3, 1, undefined, 'g_rajar:bleed');
    h.g.applyDoT(e, 300, 6, 0.5, undefined, 'g_remolino:bleed');
    fire(h, e, { skill: 'g_rajar', step: 3, echo: true });
    fire(h, e, { skill: 'g_rajar', step: 1 });
    fire(h, e, { skill: 'g_remolino' });
    assert.ok(approx(h.g.dotRemaining(e, 'g_rajar:bleed'), 300, 3) && approx(h.g.dotRemaining(e, 'g_remolino:bleed'), 300, 3), 'copias, golpes sin Sangrado y giros no quitan nada');
    fire(h, e, { skill: 'g_rajar', step: 3 });
    assert.equal(h.g.dotRemaining(e, 'g_rajar:bleed'), 0, 'el 3.er golpe de Rajar quita el viejo: el núcleo pone el nuevo');
  }
  // contra un jefe, con Heridas Abiertas 3 (6 s): un 3.er golpe de Rajar cada 2,5 s durante 15 s
  const run = on => {
    const h = spec('berserker', { b1: 3, ...(on ? { b8: 1 } : {}) }, on ? { b8: 'B' } : {});
    const e = h.enemy({ hp: 1e9, boss: true, pos: [2, 0, 0] });
    const log = spyHits(h);
    let most = 0;
    for (let i = 0; i < 6; i++) { rajar3(h, [2, 0], 0.35); most = Math.max(most, dotsOf(h, e).length); h.step(2.15); }
    const bleed = log.filter(x => x.e === e && x.dot && /^dot:g_rajar[#:]/.test(x.source)).reduce((a, x) => a + x.dealt, 0);
    const per = log.find(x => x.e === e && x.dot && x.source === 'dot:g_rajar:bleed')?.dealt || 0;
    return { most, bleed, ticks: bleed / per };
  };
  const a = run(false), b = run(true);
  assert.equal(a.most, 1, 'sin b8B un solo Sangrado de Rajar');
  assert.equal(b.most, 3, 'b8B: hasta 3 Sangrados a la vez en el mismo enemigo');
  assert.ok(a.ticks > 10 && a.ticks < 14, `sin b8B cada Sangrado nuevo corta el anterior (${a.ticks.toFixed(1)} tics en 15 s)`);
  assert.ok(b.bleed / a.bleed > 2, `b8B: más del doble de daño de Sangrado contra el jefe (${a.bleed} → ${b.bleed})`);
});
check('b9A', () => {
  const run = on => {
    const h = on ? spec('berserker', { b9: 1 }, { b9: 'A' }) : spec('berserker');
    h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    const side = h.enemy({ hp: 1e7, pos: [2, 0, 3.4] });
    rajar3(h);
    return 1e7 - side.hp;
  };
  assert.equal(run(false), 0, 'sin b9A el 3.er golpe no alcanza a 3,4 m');
  assert.ok(run(true) > 0, 'b9A: la onda alcanza a todos a 4 m');
});
check('b9B', () => {
  const run = on => {
    const h = on ? spec('berserker', { b9: 1 }, { b9: 'B' }) : spec('berserker');
    const boss = h.enemy({ hp: 1e8, boss: true, pos: [2, 0, 0] });
    const log = spyHits(h);
    for (let i = 0; i < 4; i++) rajar3(h, [2, 0], 0.6);
    const s3 = log.filter(x => x.skill === 'g_rajar' && x.step === 3 && !x.proc && !x.dot);
    return { crits: s3.filter(x => x.crit).length, n: s3.length, stagger: boss.stagger || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(b.n === 4 && b.crits === 4, `b9B: el 3.er golpe es crítico seguro (${JSON.stringify(b)})`);
  assert.ok(a.crits < a.n && a.stagger < 1, `sin b9B ni crítico seguro ni Quebranto (${JSON.stringify(a)})`);
  assert.ok(b.stagger >= 4 * 15 - 1e-6, `b9B: 15 de Quebranto por golpe (${b.stagger})`);
});
check('b10A', () => {
  assert.equal(prof(spec('berserker', { b10: 1 }, { b10: 'A' }), 'g_salto').recast.n, 5, 'b10A: hasta 5 saltos');
  assert.equal(prof(spec('berserker'), 'g_salto').recast.n, 3);
});
check('b10B', () => {
  const h = spec('berserker', { b10: 1 }, { b10: 'B' });
  const boss = h.enemy({ hp: 1e9, boss: true, pos: [4, 0, 0] });
  const add = () => condAdd(h, boss, hit('g_salto'));
  assert.equal(add(), 0);
  jump(h); assert.equal(add(), 40, 'b10B: 2.º salto seguido +40 %');
  jump(h); assert.equal(add(), 80, 'b10B: 3.º +80 %');
  const n = spec('berserker');
  const b2 = n.enemy({ hp: 1e9, boss: true, pos: [4, 0, 0] });
  jump(n); assert.equal(condAdd(n, b2, hit('g_salto')), 0, 'sin b10B nada');
  // la cadena nueva empieza de cero
  h.tick(13);
  h.p.cds.g_salto > 0 || jump(h);
  assert.equal(powerState(h.p, 'g_b_salto_aplastante').chain.get(boss), 1, 'b10B: una cadena nueva empieza en el 1.er salto');
});
check('b11', () => {
  const run = on => {
    const h = on ? spec('berserker', { b11: 2 }) : spec('berserker');
    const e = h.enemy({ hp: 1000, pos: [2, 0, 0] });
    h.g.applyDoT(e, 300, 3, 1, undefined, 'g_tajo:bleed');
    h.p.hp = h.p.stats.maxHP * 0.5; h.p.mp = 0;
    e.takeDamage(1e6, false, {});
    return { hp: h.p.hp / h.p.stats.maxHP - 0.5, mp: h.p.mp };
  };
  const a = run(false), b = run(true);
  assert.ok(a.hp === 0 && a.mp === 0, 'sin b11 nada');
  assert.ok(approx(b.hp, 0.04, 1e-3) && approx(b.mp, 8), `b11 r2: matar a uno que sangra cura un 4 % y da 8 de Furia (${JSON.stringify(b)})`);
});
check('b12', () => {
  const run = on => {
    const h = on ? spec('berserker', { b12: 2 }) : spec('berserker');
    const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    pielRecharging(h);
    for (const id of ['g_salto', 'g_remolino', 'g_u_furia']) h.g._startCooldown(h.p, id, prof(h, id));
    const before = { ...h.p.cds };
    fire(h, e, { skill: 'g_rajar', crit: true });
    fire(h, e, { skill: 'g_rajar', crit: true });
    fire(h, e, { skill: 'g_hendidura', crit: true });
    return Object.fromEntries(['g_salto', 'g_remolino', 'g_u_furia', 'g_piel'].map(id => [id, Math.round((before[id] - h.p.cds[id]) * 100) / 100]));
  };
  assert.deepEqual(run(false), { g_salto: 0, g_remolino: 0, g_u_furia: 0, g_piel: 0 }, 'sin b12 nada');
  assert.deepEqual(run(true), { g_salto: 1, g_remolino: 1, g_u_furia: 0, g_piel: 0 }, 'b12 r2: −1 s salvo definitiva y Piel, una vez cada 1,5 s');
});
check('b13', () => { assert.equal(prof(spec('berserker', { b13: 2 }), 'g_salto').addPct - prof(spec('berserker'), 'g_salto').addPct, 40, 'b13 r2: Salto +40 %'); });
check('b14', () => {
  const run = on => {
    const h = on ? spec('berserker', { b14: 1 }) : spec('berserker');
    const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), boss = h.enemy({ hp: 1e9, boss: true, pos: [4, 0, 1] });
    jump(h, [4, 0], 0.5);
    const first = e.stunT || 0;
    h.tick(0.8);
    jump(h, [4, 0], 0.5);
    return { first, second: e.stunT || 0, stagger: boss.stagger || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(a.first === 0 && a.stagger < 1, `sin b14 la caída no aturde (${JSON.stringify(a)})`);
  assert.ok(b.first > 0.4 && !(b.second > 0), `b14: aturde 0,5 s; el mismo enemigo, una vez cada 4 s (${JSON.stringify(b)})`);
  assert.ok(approx(b.stagger - a.stagger, 15, 0.01), `b14: a los jefes, 15 de Quebranto (${b.stagger})`);
});
check('b15A', () => {
  const h = spec('berserker', { b15: 1 }, { b15: 'A' });
  h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  assert.ok(h.p.alive && h.p.hp === 1 && approx(h.gaugeValue('sed'), 50) && !(h.gaugeState('sed').satedT > 0), 'b15A: te deja con 1 de vida y la Sed en 50');
  h.tick(2); h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  assert.ok(!h.p.alive, 'b15A: una vez cada 2 min');
});
check('b15B', () => {
  const h = spec('berserker', { b15: 1 }, { b15: 'B' }), n = spec('berserker');
  for (const x of [h, n]) x.p.hp = x.p.stats.maxHP * 0.3;
  assert.equal(condDr(h) - condDr(n), 15, 'b15B: con menos del 40 % de vida, −15 % de daño recibido');
  h.p.hp = h.p.stats.maxHP;
  assert.equal(condDr(h), condDr(n), 'b15B: con la vida alta, nada');
});
check('b16', () => {
  const h = spec('berserker', { b16: 2 }), n = spec('berserker');
  const base = h.p.stats.aspdPct;
  h.gauge('sed', 40); h.tick(0.2);
  assert.equal(h.p.stats.aspdPct, base, 'b16: con 40 de Sed, nada');
  h.gauge('sed', 60); h.tick(0.2);
  assert.equal(h.p.stats.aspdPct - base, 16, 'b16 r2: con más de 50 de Sed, +16 % de velocidad');
  n.gauge('sed', 60); n.tick(0.2);
  assert.equal(n.p.stats.aspdPct, base, 'sin b16 nada');
  // giros y saltos: la stat skillSpeedPct del núcleo (tic del canal del Remolino y vuelo del Salto)
  assert.equal(h.p.stats.skillSpeedPct, 16, 'b16 r2: +16 % de velocidad de habilidades');
  assert.ok(approx(prof(h, 'g_remolino').skillSpeed, 1.16) && approx(prof(n, 'g_remolino').skillSpeed, 1), 'b16: el perfil la lleva');
  const spin = x => { x.setSlot('k3', 'g_remolino'); x.p.mp = 100; x.press('k3'); x.step(0.05); const i = x.g.channelInfo(); x.release('k3'); x.step(0.3); return i; };
  const si = spin(h), sn = spin(n);
  assert.ok(si && sn && approx(sn.interval / si.interval, 1.16, 1e-6), `b16: el Remolino gira un 16 % más rápido (${sn?.interval} → ${si?.interval} s por giro)`);
  h.gauge('sed', 30); h.tick(0.4);
  assert.ok(h.p.stats.aspdPct === base && !(h.p.stats.skillSpeedPct > 0), 'b16: al bajar de 50 se va');
});
check('b17', () => {
  const h = spec('berserker', { b17: 2 });
  assert.ok(prof(h, 'g_salto').cd > 0 && prof(h, 'g_salto').recast.n === 3);
  h.g._startCooldown(h.p, 'g_salto', prof(h, 'g_salto'));
  cast(h, 'k4', 'g_u_furia', { sec: 0.1 });
  assert.ok(buff(h.p, 'g_u_furia') && !(h.p.cds.g_salto > 0), 'b17: al lanzar Furia Inmortal el Salto queda listo');
  assert.ok(prof(h, 'g_salto').cd === 0 && prof(h, 'g_salto').recast.n === 5, 'b17 r2: no se recarga y encadena 2 saltos más');
  const n = spec('berserker');
  n.g._startCooldown(n.p, 'g_salto', prof(n, 'g_salto'));
  cast(n, 'k4', 'g_u_furia', { sec: 0.1 });
  assert.ok(n.p.cds.g_salto > 0 && prof(n, 'g_salto').cd > 0, 'sin b17 el Salto sigue su recarga');
});
check('b18', () => {
  const run = on => {
    const h = on ? spec('berserker', { b18: 2 }) : spec('berserker');
    const fresh = h.enemy({ hp: 1e6, pos: [1, 0, 0] }), bleeding = h.enemy({ hp: 1e6, pos: [0, 0, 1] });
    h.g.applyDoT(bleeding, 300, 3, 1, undefined, 'g_tajo:bleed');
    h.p.mp = 0;
    fire(h, fresh, { skill: 'g_remolino' });
    const a = h.p.mp;
    fire(h, bleeding, { skill: 'g_remolino' });
    return [a, h.p.mp - a];
  };
  assert.deepEqual(run(false), [0, 0], 'sin b18 nada');
  assert.deepEqual(run(true), [4, 0], 'b18 r2: +4 de Furia por enemigo que empiezas a desangrar (no si ya sangraba)');
});
check('b19', () => {
  const run = (on, elite) => {
    const h = on ? spec('berserker', { b19: 2 }) : spec('berserker');
    const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }), el = h.enemy({ hp: 1e6, pos: [2, 0, 1], rank: 'elite' });
    fire(h, e, { skill: 'g_rajar', step: 3 });
    if (elite) fire(h, el, { skill: 'g_rajar', step: 3 });
    fire(h, e, { skill: 'g_rajar', step: 2 });
    return h.gaugeValue('sed');
  };
  assert.equal(run(false, true), 0, 'sin b19 nada');
  assert.equal(run(true, false), 10, 'b19 r2: el 3.er golpe da 10 de Sed');
  assert.equal(run(true, true), 20, 'b19: el doble si alcanza a un élite (una vez por golpe)');
});
check('b20', () => {
  const a = spec('berserker'), b = spec('berserker', { b20: 2 });
  assert.ok(approx(prof(b, 'g_rajar').radiusMul / prof(a, 'g_rajar').radiusMul, 1.3) && approx(prof(b, 'g_remolino').radius / prof(a, 'g_remolino').radius, 1.3), 'b20 r2: área cuerpo a cuerpo +30 %');
  assert.equal(prof(b, 'g_salto').radiusMul, prof(a, 'g_salto').radiusMul, 'b20: el Salto (sin cuerpo a cuerpo) no');
});
check('b21', () => {
  const run = on => {
    const h = on ? spec('berserker', { b21: 1 }) : spec('berserker');
    const e = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
    const log = spyHits(h);
    jump(h);
    h.tick(2.3);                                       // la cadena caduca: ese salto fue el último
    const dealt = log.filter(x => x.skill === 'g_salto' && !x.dot && !x.proc).reduce((a, x) => a + x.dealt, 0);
    return { bleed: dotsOf(h, e).filter(d => d.source === 'g_salto:bleed'), dealt };
  };
  assert.equal(run(false).bleed.length, 0, 'sin b21 no desangra');
  const r = run(true);
  assert.ok(r.bleed.length === 1 && r.bleed[0].ticks === 3 && approx(r.bleed[0].total, r.dealt, 2), `b21: el último salto desangra el 100 % de su golpe en 3 s (${r.bleed[0]?.total} ≈ ${r.dealt})`);
});
check('b22', () => {
  const run = on => {
    const h = on ? spec('berserker', { b22: 3 }) : spec('berserker');
    // a 3 m: el giro (3,8 m) lo alcanza y, golpeado, se aparta ~0,7 m, aún dentro de los 4 m del estallido
    const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
    h.g.applyDoT(e, 300, 3, 1, undefined, 'g_tajo:bleed');
    h.setSlot('k3', 'g_remolino'); h.p.mp = 100;
    h.press('k3'); h.step(0.6);
    // (S-guerrero: su Sangrado también estalla, con el del Tajo)
    const hp0 = e.hp, left = h.g.dotRemaining(e, 'bleed');
    h.release('k3'); h.step(0.05);
    return { dmg: hp0 - e.hp, bleed: h.g.dotRemaining(e, 'bleed'), left };
  };
  const a = run(false), b = run(true);
  assert.ok(a.dmg === 0 && a.bleed > 0, 'sin b22 el Sangrado sigue');
  assert.ok(b.left > 300 && approx(b.dmg, 0.65 * b.left, 2) && b.bleed === 0, `b22 r3: al soltar, estalla el 65 % de lo que quedaba (${JSON.stringify(b)})`);
});
check('b23', () => {
  const h = spec('berserker', { b23: 3 }), n = spec('berserker');
  for (const x of [h, n]) {
    const e = x.enemy({ hp: 1000, pos: [2, 0, 0] });
    e.hp = 400;
    x.g.setComboStep(x.p, 'g_rajar', 3);
    x.setSlot('rmb', 'g_rajar'); x.aim(2, 0); x.p.mp = 100;
    assert.ok(x.cast('rmb'), 'b23: Rajar sale');        // en la preparación del 3.er golpe
    x.add = condAdd(x, e, hit('g_rajar'));
    x.step(0.5);
    x.after = condAdd(x, e, hit('g_rajar'));
  }
  assert.ok(h.add === 54 && h.after === 0, `b23 r3: +9 % por cada 10 % de vida que falta en el 3.er golpe (${h.add}, ${h.after})`);
  assert.equal(n.add, 0, 'sin b23 nada');
});
check('b24', () => {
  const h = spec('berserker', { b24: 3 });
  h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  jump(h); assert.equal(buff(h.p, 'g_b_impetu')?.stats.dmgPct, 9, 'b24 r3: +9 % por salto');
  jump(h); assert.equal(buff(h.p, 'g_b_impetu')?.stats.dmgPct, 18, 'b24: se suma');
  h.tick(8.2);
  assert.ok(!buff(h.p, 'g_b_impetu'), 'b24: 8 s');
  const n = spec('berserker'); n.enemy({ hp: 1e9, pos: [4, 0, 0] }); jump(n);
  assert.ok(!buff(n.p, 'g_b_impetu'), 'sin b24 nada');
});
check('b25', () => {
  const run = r => {
    const h = r ? spec('berserker', { b25: r }) : spec('berserker');
    const e = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
    const hold = s => { for (let t = 0; t < s - 1e-9; t += 0.1) { e.pos.set(1.5, 0, 0); h.step(0.1); } };   // quieto al alcance
    h.setSlot('k3', 'g_remolino'); h.p.mp = 100;
    h.press('k3');
    hold(4.5);
    const mid = { on: !!h.g._channel, mp: h.p.mp };
    hold(2.0);
    const late = !!h.g._channel;
    h.release('k3');
    return { ...mid, late, bleedPct: h.p.tv.bleedPct || 0 };
  };
  const a = run(0), b = run(1), c = run(2);
  assert.ok(!a.on, 'sin b25 el giro acaba a los 3 s');
  assert.ok(b.on && !b.late, `b25 r1: sigue mientras toques a alguien que sangra, hasta 6 s (${JSON.stringify(b)})`);
  // el coste del Remolino (60 desde S-guerrero, ronda 2) y 8/s durante 1,5 s de danza
  const remCost = CLASSES.guerrero.skills.find(s => s.id === 'g_remolino').cost;
  assert.ok(approx(b.mp, 100 - remCost - 12, 1.5), `b25: 8 de Furia por segundo tras 3 s (${b.mp})`);
  assert.ok(c.late && c.bleedPct === 15, `b25 r2: hasta 10 s y Sangrados +15 % (${JSON.stringify(c)})`);
});
check('b26', () => {
  const run = r => {
    const h = r ? spec('berserker', { b26: r }) : spec('berserker');
    const e = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    const log = spyHits(h);
    rajar3(h, [2, 0], 0.7);
    return { hits: log.filter(x => x.e === e && x.skill === 'g_rajar' && x.step === 3 && !x.dot).length, vuln: e.vulnT || 0, add: prof(h, 'g_rajar').addPct };
  };
  const a = run(0), b = run(1), c = run(3);
  assert.ok(a.hits === 1 && a.vuln === 0, 'sin b26 un solo golpe');
  assert.ok(b.hits === 2 && b.vuln > 0.7 && b.vuln <= 1, `b26 r1: golpea dos veces y deja Vulnerable 1 s (${JSON.stringify(b)})`);
  assert.ok(c.vuln > 3.7 && c.add - a.add === 30, `b26 r3: Vulnerable 4 s y Rajar +30 % (${JSON.stringify(c)})`);
});
check('b27', () => {
  const chain = (h, n = 3) => { for (let i = 0; i < n; i++) jump(h); return h.p.cds.g_salto || 0; };
  const pack = h => { for (const [x, z] of [[4, 0], [4, 1], [4.6, -0.6]]) h.enemy({ hp: 1e9, pos: [x, 0, z] }); };
  const a = spec('berserker'); pack(a);
  const b = spec('berserker', { b27: 1 }); pack(b);
  const la = chain(a), lb = chain(b);
  assert.ok(approx(la - lb, 4, 0.05), `b27 r1: el último salto golpea a 3: recupera 4 s (${la} → ${lb})`);
  const one = spec('berserker', { b27: 1 }); one.enemy({ hp: 1e9, pos: [4, 0, 0] });
  assert.ok(approx(chain(one), la, 0.05), 'b27: con un solo golpeado, nada');
  const c = spec('berserker', { b27: 3 }); pack(c);
  assert.equal(chain(c), 0, 'b27 r3: se recarga al instante');
  assert.equal(chain(c), 0, 'b27: 2.ª seguida');
  assert.ok(chain(c) > 9, 'b27: la 3.ª cadena espera la recarga normal');
  assert.equal(prof(c, 'g_salto').addPct - prof(a, 'g_salto').addPct, 30, 'b27 r3: Salto +30 %');
});
check('b28', () => {
  const h = spec('berserker', { b28: 4 });
  h.enemy({ hp: 1, pos: [3, 0, 0], rank: 'elite' }).takeDamage(1e6, false, {});
  assert.equal(h.gaugeValue('sed'), 30, 'b28 r1: matar a un élite da 30 de Sed');
  h.gauge('sed', 100);
  assert.ok(h.gaugeState('sed').satedT > 8.9, 'b28 r2: la Sed Saciada dura 9 s');
  h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  assert.ok(h.p.alive && h.p.hp === 1, 'b28 r3: con la Sed Saciada, el golpe letal te deja con 1');
  h.tick(9.2);
  h.gauge('sed', 100); h.tick(9.2);
  assert.ok(!buff(h.p, 'g_u_furia'), 'b28 r4: con 2 Sed Saciadas, aún no');
  h.gauge('sed', 100);
  const f = buff(h.p, 'g_u_furia');
  assert.ok(f && approx(f.t, 5) && !(h.p.cds.g_u_furia > 0), 'b28 r4: a la 3.ª, Furia Inmortal 5 s, gratis');
  // r4: como mucho cada 90 s (otras 3 Sed Saciadas en ~28 s no la lanzan; la de después de 90 s, sí)
  h.tick(9.2);
  for (let i = 0; i < 2; i++) { h.gauge('sed', 100); h.tick(9.2); }
  h.gauge('sed', 100);
  assert.ok(!buff(h.p, 'g_u_furia'), 'b28 r4: 3 Sed Saciadas más antes de 90 s: aún no');
  h.tick(9.2); h.tick(55);
  h.gauge('sed', 100);
  assert.ok(buff(h.p, 'g_u_furia'), 'b28 r4: pasados 90 s, la siguiente Sed Saciada la lanza');
  // r3: una salvación cada 60 s, aunque la Sed siga Saciada
  {
    const s = spec('berserker', { b28: 3 });
    s.gauge('sed', 100);
    s.p.hp = 5; s.p.takeDamage(1e7, 1, {});
    assert.ok(s.p.alive && s.p.hp === 1, 'b28 r3: la primera te salva');
    s.tick(1);
    assert.ok(s.gaugeState('sed').satedT > 0, 'la Sed sigue Saciada');
    s.p.takeDamage(1e7, 1, {});
    assert.ok(!s.p.alive, 'b28 r3: otro golpe letal dentro de 60 s, no');
    const t = spec('berserker', { b28: 3 });
    t.gauge('sed', 100); t.p.hp = 5; t.p.takeDamage(1e7, 1, {});
    t.tick(60.2);
    t.gauge('sed', 100); t.p.hp = 5; t.p.takeDamage(1e7, 1, {});
    assert.ok(t.p.alive && t.p.hp === 1, 'b28 r3: pasados 60 s, vuelve a salvarte');
  }
  const r2 = spec('berserker', { b28: 2 });
  r2.gauge('sed', 100); r2.p.hp = 5; r2.p.takeDamage(1e7, 1, {});
  assert.ok(!r2.p.alive, 'b28 r2: sin el rango 3 no salva');
  const n = spec('berserker'); n.gauge('sed', 100);
  assert.ok(n.gaugeState('sed').satedT < 6.01, 'sin b28, 6 s');
});

// ---------------- GUARDIÁN (d*) ----------------
// d0 es la clave gratis sin fx (su efecto es la mecánica): la Piel de Hierro de 12 s y −50 % es de la
// innata del Guardián (test-powers-guerrero (f)), y d0 no la repite
check('d0', () => {
  const d = spec('guardian'), b = spec('berserker');
  assert.equal(d.p.talentAgg.mechanic, 'bastion', 'd0: la mecánica es el Bastión');
  const d0 = TT.specs.find(s => s.id === 'guardian').nodes.find(n => n.id === 'd0');
  assert.ok(d0.free && !Object.keys(d0.fx || {}).length, 'd0: sin fx propio');
  assert.ok(approx(prof(d, 'g_piel').dur - prof(b, 'g_piel').dur, 4) && approx(prof(b, 'g_piel').dur, 8), 'Guardián: Piel de Hierro 12 s (antes 8 s), una sola vez');
  assert.ok(approx(prof(d, 'g_piel').buff.dr / prof(b, 'g_piel').buff.dr, 1.25, 0.02), 'Guardián: y quita un 50 % (antes 40 %)');
});
check('d1', () => {
  const h = spec('guardian', { d1: 3 }), n = spec('guardian');
  assert.ok(approx(blockReduction(h.p.stats), 0.8) && approx(blockReduction(n.p.stats), 0.5), 'd1 r3: los bloqueos paran un 80 %');
});
check('d2', () => { assert.equal(prof(spec('guardian', { d2: 3 }), 'terremoto').addPct - prof(spec('guardian'), 'terremoto').addPct, 30, 'd2 r3: Terremoto +30 %'); });
check('d3', () => { assert.ok(approx(prof(spec('guardian', { d3: 3 }), 'g_carga_escudo').cd, 7), 'd3 r3: la Carga se recarga en 7 s'); });
check('d4', () => {
  const run = on => {
    const h = on ? spec('guardian', { d4: 2 }) : spec('guardian');
    const e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
    firePower('onDamaged', h.p, h.g, h.p, { amount: 50, blocked: true, src: e });
    const a = 1e6 - e.hp;
    firePower('onDamaged', h.p, h.g, h.p, { amount: 50, blocked: true, src: e });
    const b = 1e6 - e.hp - a;
    h.tick(1.05);
    firePower('onDamaged', h.p, h.g, h.p, { amount: 50, blocked: false, src: e });
    return { a, b, unblocked: 1e6 - e.hp - a - b, avg: h.p.avgHit(0.8) };
  };
  const a = run(false), b = run(true);
  assert.ok(a.a === 0, 'sin d4 nada');
  assert.ok(approx(b.a, b.avg, 1) && b.b === 0 && b.unblocked === 0, `d4 r2: golpe de escudo del 80 % al bloquear, una vez por segundo (${JSON.stringify(b)})`);
});
check('d5', () => {
  const run = (on, stance, n) => {
    const h = on ? spec('guardian', { d5: 1 }) : spec('guardian');
    for (let i = 0; i < n; i++) h.enemy({ hp: 1e7, pos: [2, 0, i - 1] });
    cast(h, 'k3', 'g_guardia', { sec: 0.05 });
    if (stance === 'ariete') { h.tick(3.1); cast(h, 'k3', 'g_guardia', { sec: 0.05 }); }
    h.gauge('bastion', 0);
    cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: 0.5 });
    return h.gaugeValue('bastion');
  };
  assert.equal(run(false, 'muralla', 3), 0, 'sin d5 nada');
  assert.equal(run(true, 'muralla', 1), 1, 'd5: en Muralla, 1 carga por Terremoto');
  assert.equal(run(true, 'muralla', 3), 2, 'd5: 2 si golpea a 3 o más');
  assert.equal(run(true, 'ariete', 3), 0, 'd5: en Ariete, no');
});
check('d6', () => {
  const run = (on, c30) => {
    const h = on ? spec('guardian', { d6: 1 }, {}, { cls: c30 ? { c30: 1 } : {} }) : spec('guardian', {}, {}, { cls: c30 ? { c30: 1 } : {} });
    const e = h.enemy({ hp: 1e9, pos: [9, 0, 0] });
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
    const adds = spyAdd(h);
    const hp0 = e.hp;
    h.setSlot('rmb', 'terremoto'); h.aim(9, 0); h.p.mp = 100;
    h.cast('rmb');
    const now = hp0 - e.hp;
    h.step(1.1);
    return { now, total: hp0 - e.hp, mainAdd: adds.find(x => x.skill === 'terremoto')?.add, planted: h.p.planted };
  };
  const a = run(false), b = run(true);
  assert.ok(a.now === 0, 'sin d6 el Terremoto se prepara');
  assert.ok(b.now > 0, 'd6: tras la Carga, el Terremoto no se prepara');
  assert.ok(b.total > b.now * 1.4, `d6: cuenta como plantado (réplicas) (${b.now} → ${b.total})`);
  const c = run(true, true);
  assert.equal(c.mainAdd, 0, 'd6: con Asalto Total sale gratis pero sin su +%');
  const d = run(false, true);
  assert.equal(d.mainAdd, 15, 'sin d6, Asalto Total sí suma su +15 %');
});
check('d7', () => {
  assert.equal(prof(spec('guardian', { d7: 2 }), 'g_carga_escudo').taunt, 5, 'd7 r2: provoca 5 s');
  assert.equal(prof(spec('guardian'), 'g_carga_escudo').taunt, 3);
});
check('d8A', () => {
  const run = on => {
    const h = on ? spec('guardian', { d8: 1 }, { d8: 'A' }) : spec('guardian');
    const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }), far = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
    cast(h, 'k3', 'g_guardia', { sec: 0.05 });
    return { dmg: 1e6 - e.hp, taunt: e.tauntT || 0, far: 1e6 - far.hp };
  };
  const a = run(false), b = run(true);
  assert.ok(a.dmg === 0 && a.taunt === 0, 'sin d8A nada');
  assert.ok(b.dmg > 0 && b.taunt > 1.9 && b.far === 0, `d8A: golpe de escudo a 4 m y provoca 2 s (${JSON.stringify(b)})`);
  // una vez cada 3 s: otro cambio enseguida (con la recarga del cambio devuelta) no golpea
  const h = spec('guardian', { d8: 1 }, { d8: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  const hp1 = e.hp;
  h.tick(1); h.g.reduceCooldown(h.p, 'g_guardia', Infinity);
  const ok = cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  assert.ok(ok && h.p.cds.g_guardia > 0 && e.hp === hp1, 'd8A: un 2.º cambio dentro de 3 s no golpea');
  h.tick(2.1); h.g.reduceCooldown(h.p, 'g_guardia', Infinity);
  cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  assert.ok(e.hp < hp1, 'd8A: pasados 3 s, sí');
});
check('d8B', () => {
  const run = on => {
    const h = on ? spec('guardian', { d8: 1 }, { d8: 'B' }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [1.5, 0, 0] });
    const log = spyHits(h);
    cast(h, 'k3', 'g_guardia', { sec: 0.05 });
    for (let i = 0; i < 4; i++) cast(h, 'rmb', 'g_hendidura', { aim: [1.5, 0], mp: 100, sec: 0.5 });
    const boss = h.enemy({ hp: 1e9, boss: true, pos: [1.5, 0, 1] });
    h.tick(3.1);
    boss.staggerBrokenT = 3;
    cast(h, 'k3', 'g_guardia', { sec: 0.05 });
    h.setSlot('rmb', 'g_hendidura'); h.p.mp = 100; h.aim(1.5, 0); h.cast('rmb');
    const add = condAdd(h, boss, hit('g_hendidura'));
    return { crits: log.filter(x => x.e === e && x.skill === 'g_hendidura').map(x => x.crit), add };
  };
  const a = run(false), b = run(true);
  assert.ok(b.crits[0] === true, 'd8B: el siguiente golpe tras cambiar es crítico seguro');
  assert.ok(b.crits.slice(1).some(c => !c) || a.crits.some(c => !c), 'd8B: solo el siguiente');
  assert.ok(b.add === 30 && a.add === 0, `d8B: +30 % contra un jefe Quebrantado (${b.add})`);
});
check('d9A', () => {
  const run = on => {
    const h = on ? spec('guardian', { d9: 1 }, { d9: 'A' }) : spec('guardian');
    const out = h.enemy({ hp: 1e9, pos: [6.5, 0, 0] }), mid = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    h.tick(1.2);                                       // plantado
    const log = spyHits(h);
    cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: 2.6 });
    return { reps: log.filter(x => x.e === mid && x.repeat).length, out: 1e9 - out.hp, n: prof(h, 'terremoto').repeat.n };
  };
  const a = run(false), b = run(true);
  assert.ok(a.reps === 2 && a.out === 0, `sin d9A 2 réplicas a 5 m (${JSON.stringify(a)})`);
  assert.ok(b.n === 4 && b.reps === 4 && b.out > 0, `d9A: 4 réplicas que se abren hasta 8 m (${JSON.stringify(b)})`);
});
check('d9B', () => {
  const h = spec('guardian', { d9: 1 }, { d9: 'B' });
  const near = h.enemy({ hp: 1e9, pos: [1, 0, 0] }), far = h.enemy({ hp: 1e9, pos: [4, 0, 0] });
  assert.equal(condAdd(h, near, hit('terremoto')), 0, 'd9B: sin plantar, nada');
  h.tick(1.2);
  assert.ok(condAdd(h, near, hit('terremoto')) === 50 && condAdd(h, far, hit('terremoto')) === 0, 'd9B: plantado, +50 % en el centro (2 m)');
  const boss = h.enemy({ hp: 1e9, boss: true, pos: [0.5, 0, 0.5] });
  cast(h, 'rmb', 'terremoto', { aim: [1, 0], mp: 100, sec: 1.4 });
  assert.ok(approx(boss.stagger || 0, 20, 0.01), `d9B: 20 de Quebranto a los jefes del centro, una vez por Terremoto (${boss.stagger})`);
  const n = spec('guardian'); const e2 = n.enemy({ hp: 1e9, pos: [1, 0, 0] }); n.tick(1.2);
  assert.equal(condAdd(n, e2, hit('terremoto')), 0, 'sin d9B nada');
});
check('d10A', () => {
  const run = on => {
    const h = on ? spec('guardian', { d10: 1 }, { d10: 'A' }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [4, 0, 2.6] });
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.4 });
    return { w: prof(h, 'g_carga_escudo').dragWidth, d: Math.hypot(e.pos.x - h.p.pos.x, e.pos.z - h.p.pos.z), ex: e.pos.x };
  };
  const a = run(false), b = run(true);
  assert.ok(a.w === 1.5 && a.ex < 4.5, `sin d10A no arrastra a 2,6 m del camino (${JSON.stringify(a)})`);
  assert.ok(b.w === 3 && b.ex > 6 && b.d < 2.5, `d10A: arrastra a 3 m y lo junta delante (${JSON.stringify(b)})`);
});
check('d10B', () => {
  const run = on => {
    const h = on ? spec('guardian', { d10: 1 }, { d10: 'B' }) : spec('guardian');
    const boss = h.enemy({ hp: 1e9, boss: true, pos: [5, 0, 0] });
    const adds = spyAdd(h);
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.4 });
    return { x: h.p.pos.x, stagger: boss.stagger || 0, add: adds.find(x => x.e === boss)?.add || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(a.x > 7.5 && a.stagger === 0, `sin d10B la Carga sigue (${JSON.stringify(a)})`);
  assert.ok(b.x < 4.5 && approx(b.stagger, 25) && b.add === 60, `d10B: te paras, +60 % y 25 de Quebranto (${JSON.stringify(b)})`);
});
check('d11', () => { assert.equal(spec('guardian', { d11: 2 }).p.stats.hpPct - spec('guardian').p.stats.hpPct, 16, 'd11 r2: +16 % de vida'); });
check('d12', () => {
  const run = on => {
    const h = on ? spec('guardian', { d12: 2 }) : spec('guardian');
    for (let i = 0; i < 3; i++) h.enemy({ hp: 1e9, pos: [2, 0, i - 1] });
    pielRecharging(h);
    const before = h.p.cds.g_piel;
    cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: 0.42 });
    return before - h.p.cds.g_piel;
  };
  const a = run(false), b = run(true);
  assert.ok(approx(b - a, 2, 0.05), `d12 r2: 3 golpeados acortan la Piel 2 s (tope r s) (${a} → ${b})`);
});
check('d13', () => {
  const run = on => {
    const h = on ? spec('guardian', { d13: 2 }) : spec('guardian');
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
    h.p.stats.block = 0;                                 // sin bloqueos al azar: solo los seguros
    const losses = [];
    for (let i = 0; i < 5; i++) { const hp = h.p.hp = h.p.stats.maxHP; h.p.takeDamage(400, 1, {}); losses.push(hp - h.p.hp); }
    return losses;
  };
  const a = run(false), b = run(true);
  // cada bloqueo da 1 carga de Bastión (−4 % de daño): bloqueado = la mitad o menos
  for (let i = 0; i < 4; i++) assert.ok(b[i] / a[i] <= 0.51, `d13 r2: los 4 golpes siguientes, bloqueados (${b[i]} / ${a[i]})`);
  assert.ok(b[4] / a[4] > 0.8, `d13: el 5.º ya no (${b[4]} / ${a[4]})`);
});
check('d14', () => {
  const run = on => {
    const h = on ? spec('guardian', { d14: 1 }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [3, 0, 0.5] }), off = h.enemy({ hp: 1e9, pos: [3, 0, 5] });
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.4 });
    return [e.vulnT || 0, off.vulnT || 0];
  };
  assert.deepEqual(run(false), [0, 0], 'sin d14 nada');
  const [v, o] = run(true);
  assert.ok(v > 2.4 && v <= 3 && o === 0, `d14: los arrastrados quedan Vulnerables 3 s (${v}, ${o})`);
});
check('d15A', () => {
  const h = spec('guardian', { d15: 1 }, { d15: 'A' });
  h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  const f = (h.g.fields || []).find(x => !x.dead && x.kind === 'aura' && x.data?.buffId === 'g_u_ciudadela');
  assert.ok(h.p.alive && approx(h.p.hp / h.p.stats.maxHP, 0.1, 0.01), 'd15A: te deja con un 10 % de vida');
  assert.ok(f && f.data.free && approx(f.dur, 3) && !(h.p.cds.g_u_ciudadela > 0), 'd15A: lanza la Ciudadela 3 s, gratis');
  h.tick(0.6);
  assert.ok(buff(h.p, 'g_u_ciudadela'), 'd15A: con su reducción de daño');
  h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  assert.ok(!h.p.alive, 'd15A: una vez cada 2 min');
});
check('d15B', () => {
  const h = spec('guardian', { d15: 1 }, { d15: 'B' });
  const bp = h.p.stats.blockPower || 0;
  h.gauge('bastion', 4); h.tick(0.2);
  assert.ok(!buff(h.p, 'g_d_roca') && !(h.p.unstoppableT > 0), 'd15B: con 4 cargas, nada');
  h.gauge('bastion', 5); h.tick(0.2);
  assert.ok(h.p.stats.blockPower - bp === 10 && h.p.unstoppableT > 0, 'd15B: con 5, imparable y bloqueos +10 %');
  h.gauge('bastion', 3); h.tick(0.4);
  assert.ok((h.p.stats.blockPower || 0) === bp && !(h.p.unstoppableT > 0), 'd15B: al perder la 5.ª se va');
});
check('d16', () => {
  const h = spec('guardian', { d16: 2 }), n = spec('guardian');
  const e = h.enemy({ hp: 1e6 }), e2 = n.enemy({ hp: 1e6 });
  h.gauge('bastion', 3); n.gauge('bastion', 3);
  assert.ok(condAdd(h, e, hit('g_tajo')) === 12 && condAdd(n, e2, hit('g_tajo')) === 0, 'd16 r2: +4 % de daño por carga');
});
check('d17', () => {
  const run = (r, cls = {}, d3 = 0) => {
    const ranks = { ...(r ? { d17: r } : {}), ...(d3 ? { d3 } : {}) };
    const h = spec('guardian', ranks, {}, { cls });
    for (const z of [0.3, -0.3, 0.8]) h.enemy({ hp: 1e9, pos: [3, 0, z] });
    const killMe = h.enemy({ hp: 1, pos: [11.5, 0, 0] });          // fuera del golpe de la Carga
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
    const left = h.p.cds.g_carga_escudo;
    return { h, left, killMe };
  };
  const a = run(0), b = run(2);
  assert.ok(approx(a.left - b.left, 2, 0.05), `d17 r2: 3 arrastrados quitan 2 s (tope r s) (${a.left} → ${b.left})`);
  // suelo de 4 s: Paso Pesado 3 (7 s) + Avalancha 2 + la media recarga de Asalto Total
  const c = run(2, { c30: 1 }, 3);
  assert.ok(c.killMe.alive, 'd17: la Carga no lo alcanza');
  cast(c.h, 'rmb', 'g_hendidura', { aim: [11.5, 0], mp: 100, sec: 0.4 });
  const t0 = powerState(c.h.p, 'g_ult_suelo').start?.g_carga_escudo;
  assert.ok(!c.killMe.alive && t0 != null, 'd17: Asalto Total recorta tras matar');
  assert.ok(approx(c.h.p.simT - t0 + c.h.p.cds.g_carga_escudo, 4, 0.06), `d17: la recarga nunca baja de 4 s (${c.h.p.cds.g_carga_escudo})`);
});
check('d18', () => {
  const run = (on, stance) => {
    const h = on ? spec('guardian', { d18: 2 }) : spec('guardian');
    const ally = h.ally(5, 0, 1000);
    cast(h, 'k3', 'g_guardia', { sec: 0.05 });
    if (stance === 'ariete') { h.tick(3.1); cast(h, 'k3', 'g_guardia', { sec: 0.05 }); }
    const hp0 = h.p.hp;
    h.g.damageAlly(ally, 100);
    return { ally: 1000 - ally.hp, you: hp0 - h.p.hp };
  };
  const a = run(false, 'muralla'), b = run(true, 'muralla'), c = run(true, 'ariete');
  assert.ok(a.ally === 100 && a.you === 0, 'sin d18 nada');
  assert.ok(b.ally === 80 && b.you > 0, `d18 r2: en Muralla recibes tú el 20 % (${JSON.stringify(b)})`);
  assert.ok(c.ally === 100 && c.you === 0, 'd18: en Ariete, no');
});
check('d19', () => {
  const run = (on, walk) => {
    const h = on ? spec('guardian', { d19: 2 }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [4, 0, 0] }), far = h.enemy({ hp: 1e9, pos: [8, 0, 0] });
    h.p.sinceCombat = 0;
    for (let t = 0; t < 4.6; t += 0.1) {                 // se planta al segundo; 3 s después, la réplica
      e.pos.set(h.p.pos.x + 4, 0, h.p.pos.z); far.pos.set(h.p.pos.x + 8, 0, h.p.pos.z);
      if (walk) h.walk({ x: 0, z: 1 }, 0.1); else h.tick(0.1);
    }
    return [1e9 - e.hp, 1e9 - far.hp];
  };
  assert.deepEqual(run(false, false), [0, 0], 'sin d19 nada');
  const [n, f] = run(true, false);
  assert.ok(n > 0 && f === 0, 'd19: plantado, réplica gratis a 5 m');
  assert.deepEqual(run(true, true), [0, 0], 'd19: caminando, no');
});
check('d20', () => {
  const run = on => {
    const h = on ? spec('guardian', { d20: 2 }) : spec('guardian');
    const ally = h.ally(3, 0, 1000);
    h.p.sinceCombat = 0;
    cast(h, 'k4', 'g_u_ciudadela', { sec: 2.05 });
    return { bastion: h.gaugeValue('bastion'), allyDmg: ally.buffs.find(b => b.id === 'g_d_guarnicion')?.stats.dmgPct || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(b.allyDmg === 10 && a.allyDmg === 0, `d20 r2: tus aliados dentro hacen +10 % (${b.allyDmg})`);
  assert.equal(b.bastion - a.bastion, 2, `d20: 1 carga por segundo dentro (${a.bastion} → ${b.bastion})`);
  const free = spec('guardian', { d20: 2, d15: 1 }, { d15: 'A' });
  free.p.sinceCombat = 0; free.p.hp = 5; free.p.takeDamage(1e7, 1, {});
  const ref = spec('guardian', { d15: 1 }, { d15: 'A' });
  ref.p.sinceCombat = 0; ref.p.hp = 5; ref.p.takeDamage(1e7, 1, {});
  free.tick(2.05); ref.tick(2.05);
  assert.equal(free.gaugeValue('bastion'), ref.gaugeValue('bastion'), 'd20: en la Ciudadela gratis no da cargas');
});
check('d21', () => {
  const run = on => {
    const h = on ? spec('guardian', { d21: 1 }) : spec('guardian');
    const front = h.enemy({ hp: 1e9, boss: true, pos: [12, 0, 0] }), back = h.enemy({ hp: 1e9, boss: true, pos: [-12, 0, 0] });
    h.setSlot('k1', 'g_carga_escudo'); h.aim(8, 0); h.cast('k1'); h.step(0.3);
    h.p.stats.block = 0;                                 // sin bloqueos al azar: solo los seguros
    const hit = src => { const hp = h.p.hp = h.p.stats.maxHP; h.p.takeDamage(400, 1, { source: src }); return hp - h.p.hp; };
    const r = { front: hit(front), back: hit(back), bastion: h.gaugeValue('bastion') };
    h.step(1.0);
    r.after = hit(front);
    return r;
  };
  const a = run(false), b = run(true);
  assert.ok(approx(b.front / a.front, 0.5, 0.02) && b.bastion === 1 && a.bastion === 0, `d21: de frente durante la Carga, bloqueo seguro (+1 carga) (${JSON.stringify(b)})`);
  // (la carga ganada quita un 4 %: no es un bloqueo)
  assert.ok(b.back / a.back > 0.9 && b.after / a.after > 0.9, `d21: por detrás o tras la Carga, no (${JSON.stringify(a)} ${JSON.stringify(b)})`);
});
check('d22', () => {
  const h = spec('guardian', { d22: 3 }), n = spec('guardian');
  h.p.hp = n.p.hp = h.p.stats.maxHP * 0.5;
  cast(h, 'k3', 'g_guardia', { sec: 0.05 }); cast(n, 'k3', 'g_guardia', { sec: 0.05 });
  assert.ok(buff(h.p, 'g_d_guardia_viva')?.stats.dmgPct === 9 && !buff(n.p, 'g_d_guardia_viva'), 'd22 r3: +9 % de daño por cambio');
  assert.ok(approx(h.p.hp - n.p.hp, h.p.stats.maxHP * 0.03, 2), 'd22 r3: te cura un 3 %');
  h.tick(3.1); cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  assert.equal(buff(h.p, 'g_d_guardia_viva').stats.dmgPct, 18, 'd22: se suma');
});
check('d23', () => {
  const run = on => {
    const h = on ? spec('guardian', { d23: 3 }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [2, 0, 0] }), boss = h.enemy({ hp: 1e9, boss: true, pos: [2, 0, 1] });
    boss.staggerBrokenT = 5; boss.staggerLockT = 5;
    h.tick(1.2);
    const adds = spyAdd(h);
    cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: 1.6 });
    const t = adds.filter(x => x.skill === 'terremoto');
    return { main: t.filter(x => x.e === e)[0]?.add, reps: t.filter(x => x.e === e).slice(1).map(x => x.add), boss: t.filter(x => x.e === boss).slice(1).map(x => x.add) };
  };
  const a = run(false), b = run(true);
  assert.ok(a.reps.length === 2 && a.reps.every(x => x === 0), 'sin d23 nada');
  assert.ok(b.main === 0 && b.reps.length === 2 && b.reps.every(x => x === 30), `d23 r3: réplicas +30 % (${JSON.stringify(b)})`);
  assert.ok(b.boss.every(x => x === 60), 'd23: el doble contra jefes Quebrantados');
});
check('d24', () => {
  const run = on => {
    const h = on ? spec('guardian', { d24: 3 }) : spec('guardian');
    const near = h.ally(9, 1, 1000), far = h.ally(-6, 0, 1000);
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
    return { you: (h.p.shields || []).filter(s => s.src === 'g_d_escolta').length, near: near.shields.length, far: far.shields.length, h };
  };
  const a = run(false), b = run(true);
  assert.ok(a.you === 0 && a.near === 0, 'sin d24 nada');
  assert.ok(b.you === 1 && b.near === 1 && b.far === 0, 'd24: escudo a ti y a tus aliados a 6 m');
  assert.ok(approx(b.h.p.shields.find(s => s.src === 'g_d_escolta').amt, Math.round(healScaled(b.h.p.stats.maxHP * 0.12, b.h.p.stats.healPct)), 1), 'd24 r3: del 12 % de tu vida');
  // una vez cada 10 s (con Paso Pesado 3 la Carga vuelve a los 7 s)
  const c = spec('guardian', { d24: 3, d3: 3 }), al = c.ally(9, 1, 1000);
  cast(c, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
  assert.equal(al.shields.length, 1);
  c.tick(6); al.pos.set(1, 0, 1); al.shields.length = 0;
  assert.ok(cast(c, 'k1', 'g_carga_escudo', { aim: [0, 0], sec: 1.3 }), 'd24: la 2.ª Carga sale');
  assert.equal(al.shields.length, 0, 'd24: una vez cada 10 s');
});
check('d25', () => {
  const swaps = (h, n) => { for (let i = 0; i < n; i++) { cast(h, 'k3', 'g_guardia', { sec: 0.05 }); if (i < n - 1) h.tick(3.05); } };
  const h = spec('guardian', { d25: 1 }), n = spec('guardian');
  swaps(h, 3); swaps(n, 3);
  assert.ok(h.g.activeStanceModes(h.p).length === 2 && n.g.activeStanceModes(n.p).length === 1, 'd25: tras 3 cambios en 8 s, Muralla y Ariete a la vez');
  h.tick(3.1);
  assert.equal(h.g.activeStanceModes(h.p).length, 1, 'd25 r1: 3 s');
  const r3 = spec('guardian', { d25: 3 });
  cast(r3, 'k3', 'g_guardia', { sec: 0.05 }); r3.tick(0.2);
  assert.ok(approx(buff(r3.p, 'g_d_posturas')?.stats.dr || 0, 4.5), 'd25 r3: posturas +30 % (Muralla −15 → −19,5 %)');
});
check('d26', () => {
  const run = on => {
    const h = on ? spec('guardian', { d26: 1 }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    const log = spyHits(h);
    h.tick(1.2);
    for (let i = 0; i < 3; i++) cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: i < 2 ? 1.2 : 0.45 });
    // el aturdimiento más largo durante las réplicas (con el enfriamiento por enemigo de G4, solo la 1.ª aturde)
    let stun = e.stunT || 0;
    for (let k = 0; k < 24; k++) { h.step(0.05); stun = Math.max(stun, e.stunT || 0); }
    return { main: log.filter(x => x.e === e && x.skill === 'terremoto' && !x.repeat).length, stunAtRep: stun };
  };
  const a = run(false), b = run(true);
  assert.ok(a.main === 3 && b.main === 4, `d26: el 3.er Terremoto plantado se repite (${a.main} → ${b.main})`);
  assert.ok(b.stunAtRep > 0 && !(a.stunAtRep > 0), 'd26: sus réplicas aturden');
  // la repetición sale al 50/75/100 % según el rango (el multiplicador con el que se relanza)
  const muls = r => {
    const h = spec('guardian', { d26: r });
    h.enemy({ hp: 1e9, pos: [2, 0, 0] });
    const got = [], orig = h.g.castSkillSlot.bind(h.g);
    h.g.castSkillSlot = (slot, m) => { if (m != null) got.push(m); return orig(slot, m); };
    h.tick(1.2);
    for (let i = 0; i < 3; i++) cast(h, 'rmb', 'terremoto', { aim: [2, 0], mp: 100, sec: i < 2 ? 1.2 : 0.45 });
    h.step(0.5);
    return got;
  };
  assert.deepEqual([muls(1), muls(2), muls(3)], [[0.5], [0.75], [1]], 'd26: la repetición al 50/75/100 % por rango');
});
check('d27', () => {
  const run = on => {
    const h = on ? spec('guardian', { d27: 1 }) : spec('guardian');
    const e = h.enemy({ hp: 1e9, pos: [14, 0, 0] });
    cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
    return { planted: h.p.planted, bastion: h.gaugeValue('bastion'), taunt: e.tauntT || 0, h };
  };
  const a = run(false), b = run(true);
  assert.ok(b.planted && !a.planted, 'd27: al acabar la Carga te plantas');
  assert.ok(b.bastion === 2 && a.bastion === 0, 'd27 r1: +2 cargas de Bastión');
  assert.ok(b.taunt > 3.5 && a.taunt === 0, 'd27: los enemigos a 8 m te atacan 4 s');
  // las cargas, una vez cada 10 s: una 2.ª Carga a los 3 s (con la recarga devuelta) no las da
  const h = b.h;
  h.tick(3);
  h.g.reduceCooldown(h.p, 'g_carga_escudo', Infinity);
  const x0 = h.p.pos.x, bas0 = h.gaugeValue('bastion');
  cast(h, 'k1', 'g_carga_escudo', { aim: [0, 0], sec: 1.3 });
  assert.ok(x0 - h.p.pos.x > 5, `d27: la 2.ª Carga sale (${x0} → ${h.p.pos.x})`);
  assert.ok(h.gaugeValue('bastion') - bas0 < 2, `d27: dentro de 10 s no da cargas (${bas0} → ${h.gaugeValue('bastion')})`);
  h.tick(10);
  h.g.reduceCooldown(h.p, 'g_carga_escudo', Infinity);
  h.gauge('bastion', 0);
  cast(h, 'k1', 'g_carga_escudo', { aim: [8, 0], sec: 1.3 });
  assert.ok(h.gaugeValue('bastion') >= 2, 'd27: pasados 10 s, otra vez +2');
});
check('d28', () => {
  const h = spec('guardian', { d28: 4 });
  assert.equal(gaugeMax(h.p, 'bastion'), 7, 'd28 r2: el Bastión guarda 7 cargas');
  h.enemy({ hp: 1, pos: [3, 0, 0], rank: 'elite' }).takeDamage(1e6, false, {});
  assert.equal(h.gaugeValue('bastion'), 7, 'd28 r1: matar a un élite lo llena');
  pielRecharging(h);
  const piel = h.p.cds.g_piel;
  cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  assert.ok(h.gaugeValue('bastion') === 0 && approx(piel - h.p.cds.g_piel, 6, 0.1), 'd28 r3: descargar acorta 6 s la Piel de Hierro');
  for (let i = 0; i < 2; i++) { h.tick(5.1); h.gauge('bastion', 7); cast(h, 'k3', 'g_guardia', { sec: 0.05 }); }
  const f = (h.g.fields || []).find(x => !x.dead && x.kind === 'aura' && x.data?.buffId === 'g_u_ciudadela');
  assert.ok(f && f.data.free && approx(f.dur, 4), 'd28 r4: a la 3.ª descarga, la Ciudadela 4 s gratis');
  // r4: como mucho cada 45 s (otras 3 descargas en ~15 s no la lanzan; la de después de 45 s, sí)
  const free = () => (h.g.fields || []).filter(x => !x.dead && x.kind === 'aura' && x.data?.buffId === 'g_u_ciudadela' && x.data.free);
  for (let i = 0; i < 3; i++) { h.tick(5.1); h.gauge('bastion', 7); cast(h, 'k3', 'g_guardia', { sec: 0.05 }); }
  assert.ok(h.gaugeValue('bastion') === 0 && free().length === 0, 'd28 r4: 3 descargas más antes de 45 s: sin Ciudadela');
  h.tick(30);
  h.gauge('bastion', 7); cast(h, 'k3', 'g_guardia', { sec: 0.05 });
  assert.equal(free().length, 1, 'd28 r4: pasados 45 s, la siguiente descarga la lanza');
  const n = spec('guardian', { d28: 1 });
  assert.equal(gaugeMax(n.p, 'bastion'), 5, 'd28 r1: 5 cargas');
});

// ---------------- CRUZADO (z*) ----------------
// zona sagrada propia (como el sendero) para las pruebas de las zonas
const holy = (h, x, z, { dps = 100, heal = 0, r = 3, dur = 4, skill = 'g_sendero' } = {}) =>
  h.g.spawnField('zona', { pos: v3t(x, z), radius: r, dur, owner: h.p, data: { dps, healPct: heal, color: 1, skill, tags: new Set(['movement', 'zone', 'holy']) } });
// carga y suelta del Martillo. PERFECTA = el centro de la ventana del perfil REAL (catálogo y forja:
// a Nv100 la Mejora Mano Ágil la deja en 0,6–0,85 s y la carga completa en 0,9 s)
const PERFECTA = 'perfecta';
function hammer(h, at = [2.5, 0], hold = PERFECTA) {
  h.setSlot('rmb', 'g_martillo'); h.aim(at[0], at[1]); h.p.mp = 100;
  if (hold === PERFECTA) { const w = prof(h, 'g_martillo').charge.perfect; hold = (w[0] + w[1]) / 2; }
  h.press('rmb'); h.step(hold); h.release('rmb'); h.step(0.05);
}
const markJ = (h, e) => h.g.applyMark(e, prof(h, 'g_juicio'), h.p);
check('z0', () => {
  const z = spec('cruzado'), d = spec('guardian');
  assert.equal(z.p.talentAgg.mechanic, 'fervor', 'z0: la mecánica es el Fervor');
  const ally = z.ally(4, 0, 1000); ally.hp = 500;
  const e = z.enemy({ hp: 1e6 });
  fire(z, e, { skill: 'g_martillo', elem: 'holy', dealt: 1000 });
  assert.ok(approx(ally.hp, 510), `z0: el 10 % del daño sagrado cura al más herido, hasta un 1 %/s (${ally.hp})`);
  fire(z, e, { skill: 'g_martillo', elem: 'holy', dealt: 1000 });
  fire(z, e, { skill: 'g_tajo', elem: 'physical', dealt: 1000 });
  assert.ok(approx(ally.hp, 510), 'z0: el tope por segundo y solo daño sagrado');
  z.tick(1); fire(z, e, { skill: 'g_martillo', elem: 'holy', dealt: 1000 });
  assert.ok(approx(ally.hp, 520, 0.5), 'z0: al segundo, otro 1 %');
  // las zonas sagradas no se suman: cada enemigo recibe solo la más fuerte
  const run = h => { const t = h.enemy({ hp: 1e6, pos: [10, 0, 0] }); holy(h, 10, 0, { dps: 100 }); holy(h, 10, 0, { dps: 60, skill: 'g_martillo' }); h.tick(2.05); return 1e6 - t.hp; };
  const zz = run(spec('cruzado')), dd = run(d);
  assert.ok(approx(zz, 200, 2) && approx(dd, 320, 2), `z0: dos zonas sagradas no se suman (${zz} frente a ${dd})`);
  // cubeta de zona: 4 %/s por receptor (con 1 s de reserva al entrar), aunque la zona cure un 10 %/s
  const c = spec('cruzado'); const a2 = c.ally(10, 5, 1000); a2.hp = 100;
  holy(c, 10, 5, { dps: 0, heal: 10, dur: 6 });
  c.tick(2.05);
  assert.ok(a2.hp - 100 <= 40 * 3.05 + 1 && a2.hp - 100 >= 80, `z0: la cura de zona, como mucho un 4 %/s (${a2.hp - 100})`);
  c.tick(2);
  assert.ok(approx(a2.hp - 100, 180, 2), `z0: luego, 40 por segundo (${a2.hp - 100})`);
});
check('z1', () => { assert.equal(spec('cruzado', { z1: 3 }).p.tv.detonateDmg, 45, 'z1 r3: detonar +45 %'); });
check('z2', () => { assert.equal(prof(spec('cruzado', { z2: 3 }), 'g_martillo').addPct - prof(spec('cruzado'), 'g_martillo').addPct, 30, 'z2 r3: Martillo +30 %'); });
check('z3', () => { assert.ok(approx(prof(spec('cruzado', { z3: 3 }), 'g_sendero').cd, 7), 'z3 r3: el Sendero se recarga en 7 s'); });
check('z4', () => {
  assert.equal(prof(spec('cruzado', { z4: 2 }), 'g_juicio').mark.dur, 16, 'z4 r2: las marcas duran 16 s');
  assert.equal(prof(spec('cruzado'), 'g_juicio').mark.dur, 8);
});
check('z5', () => {
  const run = (on, hold) => { const h = on ? spec('cruzado', { z5: 1 }) : spec('cruzado'); const e = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] }); hammer(h, [2.5, 0], hold); return !!e.marks?.juicio; };
  assert.equal(run(false, PERFECTA), false, 'sin z5 no marca');
  assert.equal(run(true, PERFECTA), true, 'z5: la suelta perfecta marca con Juicio');
  assert.equal(run(true, 0.3), false, 'z5: fuera de la ventana, no');
});
check('z6', () => {
  const h = spec('cruzado', { z6: 1 });
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  hammer(h, [2.5, 0], 0.3);
  const floors = () => (h.g.fields || []).filter(f => !f.dead && f.kind === 'zona' && f.data.skill === 'g_martillo');
  assert.equal(floors().length, 0, 'z6: sin suelta perfecta, nada');
  for (let i = 0; i < 3; i++) { h.tick(0.3); hammer(h, [2.5, 0], PERFECTA); }
  const f = floors();
  assert.ok(f.length === 2 && f.every(x => x.data._holy && approx(x.dur, 4)), `z6: suelo consagrado 4 s, 2 a la vez (${f.length})`);
  const n = spec('cruzado'); n.enemy({ hp: 1e9, pos: [2.5, 0, 0] }); hammer(n, [2.5, 0], PERFECTA);
  assert.equal((n.g.fields || []).filter(f2 => !f2.dead && f2.data?.skill === 'g_martillo').length, 0, 'sin z6 nada');
});
check('z7', () => {
  const h = spec('cruzado', { z7: 2 }), n = spec('cruzado');
  assert.ok(prof(h, 'g_sendero').trail.heal === 3 && prof(n, 'g_sendero').trail.heal === 2, 'z7 r2: el sendero cura un 3 % por segundo');
  const ally = h.ally(4, 0, 1000);
  cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.3 });
  assert.equal(ally.buffs.find(b => b.id === 'g_z_sendero_veloz')?.stats.spdPct, 20, 'z7 r2: tus aliados en el sendero van un 20 % más rápido');
});
check('z8A', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z8: 1 }, { z8: 'A' }) : spec('cruzado');
    const a = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] }), b = h.enemy({ hp: 1e9, pos: [2.5, 0, 2.5] });
    markJ(h, a);
    const log = spyHits(h);
    hammer(h, [2.5, 0], 0.3);
    const det = log.find(x => x.e === a && x.detonated);
    const burst = log.filter(x => x.source === 'power:g_z_estallido_luz');
    return { det, burst };
  };
  const a = run(false), b = run(true);
  assert.ok(a.det && a.burst.length === 0, 'sin z8A no estalla');
  assert.ok(b.burst.length === 1 && b.burst[0].e !== b.det.e && approx(b.burst[0].dealt, b.det.dealt * 0.5, b.det.dealt * 0.05), `z8A: estalla el 50 % a los de 3 m, uno por enemigo (${b.burst.length})`);
  // con la manada marcada y junta, cada enemigo recibe UN estallido por lanzamiento (no uno por marca)
  const h = spec('cruzado', { z8: 1 }, { z8: 'A' });
  const pack = [[2.5, 0], [2.5, 1], [3.5, 0.5], [3, -0.8]].map(([x, z]) => h.enemy({ hp: 1e9, pos: [x, 0, z] }));
  for (const e of pack) markJ(h, e);
  const log = spyHits(h);
  hammer(h, [3, 0.2], 0.3);
  const dets = log.filter(x => x.detonated && pack.includes(x.e)).length;
  const per = pack.map(e => log.filter(x => x.e === e && x.source === 'power:g_z_estallido_luz').length);
  assert.ok(dets === 4 && per.every(n => n === 1), `z8A: 4 marcas detonadas y un estallido por enemigo (${dets}; ${per})`);
  // y ese estallido es el 50 % de la MAYOR detonación vecina, no la suma de todas
  const detOf = e => log.find(x => x.e === e && x.detonated)?.dealt || 0;
  const burstOf = e => log.find(x => x.e === e && x.source === 'power:g_z_estallido_luz')?.dealt || 0;
  for (const e of pack) {
    const best = Math.max(...pack.filter(o => o !== e).map(detOf));
    assert.ok(burstOf(e) > 0 && burstOf(e) <= best * 0.5 * 1.05 + 1, `z8A: no se suman (${burstOf(e)} frente al 50 % de ${best})`);
  }
});
check('z8B', () => {
  const h = spec('cruzado', { z8: 1 }, { z8: 'B' });
  const el = h.enemy({ hp: 1e9, rank: 'elite', pos: [3, 0, 0] }), nm = h.enemy({ hp: 1e9, pos: [3, 0, 2] }), boss = h.enemy({ hp: 1e9, boss: true, pos: [2.5, 0, -1] });
  for (const e of [el, nm, boss]) markJ(h, e);
  h.tick(0.15);
  assert.ok(el.marks.juicio.t > 15 && nm.marks.juicio.t < 8, 'z8B: las marcas en élites y jefes duran el doble');
  fire(h, boss, { skill: 'g_martillo', detonated: true });
  assert.ok(approx(boss.stagger || 0, 15), 'z8B: al detonar, 15 de Quebranto a los jefes');
  const n = spec('cruzado'); const el2 = n.enemy({ hp: 1e9, rank: 'elite' }); markJ(n, el2); n.tick(0.15);
  assert.ok(el2.marks.juicio.t < 8, 'sin z8B, 8 s');
  // g.extendMark: la Debilidad de la marca (Sentencia, forja I del Juicio: 12 s y +15 %) dura lo mismo que ella
  const s = spec('cruzado', { z8: 1 }, { z8: 'B' });
  s.p.skillForge = { g_juicio: 'i' }; s.p.recompute();
  const el3 = s.enemy({ hp: 1e9, rank: 'elite' });
  markJ(s, el3); s.tick(0.15);
  const wk = el3.debuffs['mark:juicio'];
  assert.ok(el3.marks.juicio.t > 23 && wk?.pct === 15 && approx(wk.t, el3.marks.juicio.t, 0.11), `z8B: con Sentencia, marca y Debilidad 24 s (${el3.marks.juicio.t}, ${wk?.t})`);
});
check('z9A', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z9: 1 }, { z9: 'A' }) : spec('cruzado');
    const far = h.enemy({ hp: 1e9, pos: [2.5, 0, 6.5] });
    h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    const low = h.ally(2, 1, 1000), other = h.ally(3, -1, 1000);
    low.hp = 200; other.hp = 800;
    const lh = healsBy(low), oh = healsBy(other);
    h.gauge('fervor', 3);
    hammer(h, [2.5, 0], 0.05);
    return { far: 1e9 - far.hp, low: lh.g_z_veredicto_generoso || 0, lowV: lh.veredicto || 0, other: oh.g_z_veredicto_generoso || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(a.far === 0 && b.far > 0, 'z9A: el Veredicto golpea a 8 m');
  assert.ok(approx(a.lowV, 60, 0.01) && approx(b.lowV, 60, 0.01) && b.low === 0 && a.other === 0 && approx(b.other, 30, 1), `z9A: cura un 3 % al resto del grupo a 8 m (${JSON.stringify(a)} ${JSON.stringify(b)})`);
  // la caché del resolvedor sigue al Fervor: el Martillo resuelto ANTES de llenarlo (por el camino
  // real, gainGauge) sale a 8 m como Veredicto y el siguiente, normal, vuelve a 5 m
  {
    const h = spec('cruzado', { z9: 1 }, { z9: 'A' });
    h.setSlot('rmb', 'g_martillo');
    const r0 = prof(h, 'g_martillo').radius;
    assert.ok(h.p.resolved.g_martillo, 'el perfil del Martillo está en la caché');
    const far = h.enemy({ hp: 1e9, pos: [2.5, 0, 6.5] });
    h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    gainGauge(h.p, 'fervor', 3);
    assert.ok(approx(prof(h, 'g_martillo').radius / r0, 8 / 5), 'a 3 de Fervor, el perfil del Veredicto (8 m)');
    hammer(h, [2.5, 0], 0.05);
    const v = 1e9 - far.hp;
    assert.ok(v > 0 && h.gaugeValue('fervor') === 0, `z9A: el Veredicto alcanza al de 6,5 m aunque el perfil estuviera en la caché (${v})`);
    assert.ok(approx(prof(h, 'g_martillo').radius, r0), 'gastado el Fervor, el perfil vuelve a 5 m');
    h.tick(0.3);
    hammer(h, [2.5, 0], 1.25);
    assert.equal(1e9 - far.hp, v, 'z9A: el Martillo normal siguiente (carga completa, 5 m) no lo alcanza');
    // perder el Fervor fuera de combate también lo devuelve a 5 m
    gainGauge(h.p, 'fervor', 3);
    assert.ok(approx(prof(h, 'g_martillo').radius / r0, 8 / 5), 'otra vez a 3: 8 m');
    for (let t = 0; t < 12; t += 0.5) { h.p.sinceCombat = 30; h.tick(0.5); }
    assert.ok(h.gaugeValue('fervor') < 3 && approx(prof(h, 'g_martillo').radius, r0), `al perder Fervor, 5 m (${h.gaugeValue('fervor')})`);
  }
});
check('z9B', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z9: 1 }, { z9: 'B' }) : spec('cruzado');
    const boss = h.enemy({ hp: 1e9, boss: true, pos: [2.5, 0, 0] }), side = h.enemy({ hp: 1e9, pos: [2.5, 0, 1.5] });
    h.gauge('fervor', 3);
    const adds = spyAdd(h);
    hammer(h, [2.5, 0], 0.05);
    return { main: adds.find(x => x.e === boss)?.add, side: adds.find(x => x.e === side)?.add, stagger: boss.stagger || 0 };
  };
  const a = run(false), b = run(true);
  assert.ok(b.main - a.main === 80 && b.side === a.side, `z9B: +80 % al objetivo principal (${JSON.stringify(b)})`);
  assert.ok(approx(b.stagger - a.stagger, 25, 0.01), `z9B: 25 de Quebranto a los jefes (${a.stagger} → ${b.stagger})`);
});
check('z10A', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z10: 1 }, { z10: 'A' }) : spec('cruzado');
    const e = h.enemy({ hp: 1e9, pos: [4, 0, 0.3] });
    cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.05 });
    const hp0 = e.hp;
    h.tick(2);
    return { dmg: hp0 - e.hp, slow: e.slowPct || 0, coef: prof(h, 'g_sendero').trail.coef };
  };
  const a = run(false), b = run(true);
  assert.ok(approx(b.coef, 0.6) && approx(b.dmg / a.dmg, 2, 0.1), `z10A: el sendero hace el 60 % por segundo (${a.dmg} → ${b.dmg})`);
  assert.ok(b.slow === 30 && !(a.slow > 0), 'z10A: y ralentiza un 30 %');
});
check('z10B', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z10: 1 }, { z10: 'B' }) : spec('cruzado');
    const low = h.ally(4, 0.2, 1000), hi = h.ally(5, -0.2, 1000);
    low.hp = 300; hi.hp = 900;
    cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.3 });
    h.tick(0.3);
    return { low: low.shields.filter(s => s.src === 'g_z_refugio'), hi: hi.shields.length, h };
  };
  const a = run(false), b = run(true);
  assert.ok(a.low.length === 0, 'sin z10B nada');
  assert.ok(b.low.length === 1 && b.hi === 0 && approx(b.low[0].amt, b.h.p.stats.maxHP * 0.1, 1), 'z10B: escudo del 10 % de tu vida al de menos vida en tu sendero');
  b.h.tick(3);
  assert.equal(b.low.length, 1, 'z10B: una vez cada 6 s');
});
check('z11', () => { assert.ok(approx(prof(spec('cruzado', { z11: 2 }), 'g_juicio').cd, 6), 'z11 r2: Juicio se recarga en 6 s'); });
check('z12', () => {
  // tres sueltas perfectas: la 1.ª recorta; la 2.ª (~1,2 s después, pasado el GCD) no, porque es
  // como mucho cada 2 s; la 3.ª (más de 2 s después de la 1.ª) recorta otra vez. Contra el Cruzado
  // sin el nodo: el tiempo que pasa es el mismo, así que la diferencia es solo el recorte
  const run = on => {
    const h = on ? spec('cruzado', { z12: 2 }) : spec('cruzado');
    h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    pielRecharging(h);
    for (const id of ['g_juicio', 'g_u_cataclismo']) h.g._startCooldown(h.p, id, prof(h, id));
    const cds = [{ ...h.p.cds }], at = [];
    for (const wait of [0, 0.4, 0.5]) {
      h.step(wait);
      hammer(h, [2.5, 0], PERFECTA);
      const end = h.g._chargeEnd;                          // la suelta que acaba de pasar (ui-verbs)
      assert.ok(end?.id === 'g_martillo' && end.perfect, `z12: la suelta es perfecta (${JSON.stringify(end)})`);
      at.push(end.t); cds.push({ ...h.p.cds });
    }
    assert.ok(h.p.cds.g_juicio > 0.5, `z12: el Juicio sigue recargándose (${h.p.cds.g_juicio})`);
    const cut = (i, id) => cds[i][id] - cds[i + 1][id];
    return { at, juicio: [0, 1, 2].map(i => cut(i, 'g_juicio')), piel: cut(0, 'g_piel'), ult: cut(0, 'g_u_cataclismo') };
  };
  const a = run(false), b = run(true);
  const gap1 = b.at[1] - b.at[0], gap2 = b.at[2] - b.at[0];
  assert.ok(gap1 > 1 && gap1 < 1.6 && gap2 > 2.2, `z12: perfectas a ${gap1.toFixed(2)} s y a ${gap2.toFixed(2)} s de la primera`);
  assert.ok(approx(b.juicio[0] - a.juicio[0], 1, 0.02), `z12 r2: cada suelta perfecta acorta 1 s tus recargas (${JSON.stringify(b)})`);
  assert.ok(approx(b.piel, a.piel, 0.02) && approx(b.ult, a.ult, 0.02), 'z12: ni Piel de Hierro ni la definitiva');
  assert.ok(approx(b.juicio[1], a.juicio[1], 0.02), `z12: como mucho cada 2 s: la de ${gap1.toFixed(2)} s no recorta (${b.juicio[1].toFixed(2)} frente a ${a.juicio[1].toFixed(2)})`);
  assert.ok(approx(b.juicio[2] - a.juicio[2], 1, 0.02), `z12: pasados 2 s de la que recortó, otra perfecta recorta 1 s (${b.juicio[2].toFixed(2)} frente a ${a.juicio[2].toFixed(2)})`);
  // el Sendero de Luz nunca baja de 4 s: Ritmo de Combate (c23) ya lo dejó en su suelo y la suelta
  // perfecta no lo baja más
  const h = spec('cruzado', { z12: 2, z3: 3 }, {}, { cls: { c23: 2 } });
  const e = h.enemy({ hp: 1e9, pos: [1.2, 0, 0] });
  cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.05 });
  for (let i = 0; i < 4; i++) { hitWith(h, e, 'g_tajo', { crit: true }); h.tick(0.05); }
  const t0 = powerState(h.p, 'g_ult_suelo').start?.g_sendero;
  const eff = () => h.p.simT - t0 + h.p.cds.g_sendero;
  assert.ok(approx(eff(), 4, 0.06), `el Sendero ya está en 4 s (${eff().toFixed(2)})`);
  const juicio0 = (h.g._startCooldown(h.p, 'g_juicio', prof(h, 'g_juicio')), h.p.cds.g_juicio), tj = h.p.simT;
  hammer(h, [h.p.pos.x + 2, h.p.pos.z], PERFECTA);
  const cut = juicio0 - h.p.cds.g_juicio - (h.p.simT - tj);   // lo recortado, aparte del tiempo que pasó
  assert.ok(approx(cut, 1, 0.02), `z12: la suelta perfecta recortó 1 s el Juicio (${cut.toFixed(2)})`);
  assert.ok(h.p.cds.g_sendero > 0 && approx(eff(), 4, 0.06), `z12: el Sendero nunca baja de 4 s (${eff().toFixed(2)} s)`);
});
check('z13', () => {
  const h = spec('cruzado', { z13: 2 }), n = spec('cruzado');
  for (const x of [h, n]) cast(x, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.2 });
  const t = x => (x.g.fields || []).find(f => !f.dead && f.data?.skill === 'g_sendero');
  assert.ok(approx(t(h).width / t(n).width, 1.3) && approx(t(h).dur - t(n).dur, 2), 'z13 r2: zonas sagradas un 30 % más grandes y 2 s más');
});
check('z14', () => {
  const h = spec('cruzado', { z14: 1 });
  const ally = h.ally(9, 1, 1000);
  cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.7 });
  const alt = (h.g.fields || []).filter(f => !f.dead && f.kind === 'aura' && f.data?.buffId === 'g_z_altar');
  assert.ok(alt.length === 1 && approx(alt[0].dur, 6), 'z14: altar 6 s al llegar');
  assert.equal(ally.buffs.find(b => b.id === 'g_z_altar')?.stats.dmgPct, 10, 'z14: +10 % a los aliados a 4 m');
  h.tick(10); cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.1 }); cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.7 });
  assert.equal(ally.buffs.filter(b => b.id === 'g_z_altar').length, 1, 'z14: los altares no se suman');
  const n = spec('cruzado'); cast(n, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.7 });
  assert.equal((n.g.fields || []).filter(f => !f.dead && f.kind === 'aura').length, 0, 'sin z14 nada');
});
check('z15A', () => {
  const h = spec('cruzado', { z15: 1 }, { z15: 'A' });
  const ally = h.ally(3, 0, 1000);
  h.g.damageAlly(ally, 5000);
  assert.ok(ally.alive && approx(ally.hp, 200), 'z15A: el aliado que iba a caer queda con un 20 %');
  h.p.hp = 5; h.p.takeDamage(1e7, 1, {});
  assert.ok(!h.p.alive, 'z15A: una vez cada 2 min entre todos');
  const s = spec('cruzado', { z15: 1 }, { z15: 'A' });
  s.p.hp = 5; s.p.takeDamage(1e7, 1, {});
  assert.ok(s.p.alive && approx(s.p.hp / s.p.stats.maxHP, 0.2, 0.01), 'z15A: también a ti');
});
check('z15B', () => {
  const h = spec('cruzado', { z15: 1 }, { z15: 'B' });
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  h.gauge('fervor', 3);
  hammer(h, [2.5, 0], 0.05);
  const s = (h.p.shields || []).find(x => x.src === 'g_z_luz_protectora');
  assert.ok(s && approx(s.amt, Math.round(healScaled(h.p.stats.maxHP * 0.1, h.p.stats.healPct)), 1), 'z15B: cada Veredicto, escudo del 10 % de tu vida');
});
check('z16', () => {
  const h = spec('cruzado', { z16: 2 }), e = h.enemy({ hp: 1e6 });
  h.gauge('fervor', 3);
  assert.equal(condAdd(h, e, { ...hit('g_martillo'), elem: 'holy' }), 24, 'z16 r2: golpes sagrados +8 % por Fervor');
  assert.equal(condAdd(h, e, hit('g_tajo')), 0, 'z16: los físicos no');
});
check('z17', () => {
  const h = spec('cruzado', { z17: 2 }), n = spec('cruzado');
  const ally = h.ally(0, 1, 1000);
  const out = condDr(h);
  holy(h, 0, 0); holy(n, 0, 0);
  assert.equal(condDr(h) - out, 10, 'z17 r2: dentro de tu zona sagrada, −10 % de daño recibido');
  assert.equal(condDr(n), out, 'sin z17 nada');
  h.g.damageAlly(ally, 100);
  assert.equal(1000 - ally.hp, 90, 'z17: también a tus aliados dentro');
});
check('z18', () => {
  const h = spec('cruzado', { z18: 2 });
  const ally = h.ally(3, 0, 1000); ally.hp = 300;
  const e = h.enemy({ hp: 1e9 });
  const log = healsBy(ally);
  fire(h, e, { skill: 'g_martillo', detonated: true });
  assert.equal(log.g_z_absolucion, 20, 'z18 r2: cada detonación cura un 2 % al de menos vida');
  fire(h, e, { skill: 'g_martillo', detonated: true });
  assert.equal(log.g_z_absolucion, 20, 'z18: una vez cada 2 s');
  h.tick(2.05); fire(h, e, { skill: 'g_martillo', detonated: true });
  assert.equal(log.g_z_absolucion, 40, 'z18: a los 2 s, otra');
});
check('z19', () => {
  const w = h => { const c = prof(h, 'g_martillo').charge; return c.perfect[1] - c.perfect[0]; };
  assert.ok(approx(w(spec('cruzado', { z19: 2 })), 0.45) && approx(w(spec('cruzado')), 0.25), 'z19 r2: la ventana perfecta dura 0,45 s');
});
check('z20', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z20: 2 }) : spec('cruzado');
    h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    h.g._startCooldown(h.p, 'g_u_cataclismo', prof(h, 'g_u_cataclismo'));
    const b = h.p.cds.g_u_cataclismo;
    h.gauge('fervor', 3); hammer(h, [2.5, 0], 0.05);
    return b - h.p.cds.g_u_cataclismo;
  };
  assert.ok(approx(run(true) - run(false), 4, 0.1), 'z20 r2: cada Veredicto acorta 4 s el Cataclismo');
});
check('z21', () => {
  const run = (on, inZone) => {
    const h = on ? spec('cruzado', { z21: 1 }) : spec('cruzado');
    cast(h, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.05 });
    // el propio sendero es zona sagrada: fuera de ella = a un lado del camino
    if (inZone) holy(h, h.p.pos.x, h.p.pos.z, { dps: 0, dur: 30, r: 3 }); else h.p.pos.z += 6;
    const b = h.p.cds.g_sendero;
    h.tick(1);
    return { cut: b - h.p.cds.g_sendero, h };
  };
  assert.ok(approx(run(false, true).cut, 1, 0.02) && approx(run(true, false).cut, 1, 0.02), 'sin z21 o fuera de la zona, al ritmo normal');
  const r = run(true, true);
  assert.ok(approx(r.cut, 2, 0.05), `z21: en tu zona sagrada, el doble de rápido (${r.cut})`);
  // con Luz Veloz 3 (7 s) al doble serían 3,5 s: el suelo la deja en 4 s
  const f = spec('cruzado', { z21: 1, z3: 3 });
  cast(f, 'k1', 'g_sendero', { aim: [8, 0], sec: 0.05 });
  holy(f, f.p.pos.x, f.p.pos.z, { dps: 0, dur: 30, r: 3 });
  f.tick(3.6);
  const t0 = powerState(f.p, 'g_ult_suelo').start?.g_sendero;
  assert.ok(t0 != null && f.p.cds.g_sendero > 0 && approx(f.p.simT - t0 + f.p.cds.g_sendero, 4, 0.06), `z21: nunca baja de 4 s (${f.p.cds.g_sendero})`);
  f.tick(0.6);
  assert.ok(!(f.p.cds.g_sendero > 0), 'z21: a los 4 s, lista');
});
check('z22', () => {
  const run = on => {
    const h = on ? spec('cruzado', { z22: 2 }) : spec('cruzado');
    const a = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    const n1 = h.enemy({ hp: 1e9, pos: [6, 0, 0] }), n2 = h.enemy({ hp: 1e9, pos: [6, 0, 1] }), n3 = h.enemy({ hp: 1e9, pos: [6.5, 0, 1.6] });
    markJ(h, a);
    hammer(h, [2.5, 0], 0.3);
    return [n1, n2, n3].filter(e => e.marks?.juicio).length;
  };
  assert.equal(run(false), 0, 'sin z22 nada');
  assert.equal(run(true), 2, 'z22 r2: al detonar, marcas a 2 enemigos a 5 m');
});
check('z23', () => {
  const h = spec('cruzado', { z23: 2 }), e = h.enemy({ hp: 1e6 });
  h.p.perfectStreak = 3;
  assert.equal(condAdd(h, e, hit('g_martillo')), 24, 'z23 r2: +8 % por suelta perfecta seguida');
  h.p.perfectStreak = 9;
  assert.equal(condAdd(h, e, hit('g_martillo')), 40, 'z23: hasta 5 veces');
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  hammer(h, [2.5, 0], 0.3);
  assert.equal(condAdd(h, e, hit('g_martillo')), 0, 'z23: fallar la ventana la reinicia');
});
check('z24', () => {
  const h = spec('cruzado', { z24: 3 }), e = h.enemy({ hp: 1e6 });
  const dr0 = condDr(h);
  assert.equal(condAdd(h, e, hit('g_tajo')), 0);
  holy(h, 0, 0);
  assert.ok(condAdd(h, e, hit('g_tajo')) === 12 && condDr(h) - dr0 === 9, 'z24 r3: en tu zona sagrada, +12 % de daño y −9 % de daño recibido');
});
check('z25', () => {
  const h = spec('cruzado', { z25: 1 });
  const a = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] }), b = h.enemy({ hp: 1e9, pos: [6, 0, 0] }), c = h.enemy({ hp: 1e9, pos: [6, 0, 1.5] });
  markJ(h, a);
  assert.equal(a.marks.juicio.uses, 2, 'z25 r1: la marca aguanta 2 detonaciones');
  const dets = [];
  const md = h.g.markDetonation.bind(h.g);
  h.g.markDetonation = (en, ht) => { const r = md(en, ht); if (r && en === a) dets.push(r); return r; };
  hammer(h, [2.5, 0], 0.3);
  assert.ok(a.marks.juicio && dets[0] === 150, 'z25: la 1.ª detonación no la gasta');
  const log = spyHits(h);
  h.tick(0.3); hammer(h, [2.5, 0], 0.3);
  assert.ok(dets[1] === 60 && !a.marks?.juicio, `z25 r1: la 2.ª al 40 % de los +150 % (${dets})`);
  assert.ok(b.marks?.juicio && c.marks?.juicio && b.marks.juicio.uses === 1, 'z25: la última salta a 2 enemigos');
  // con la carga de la Mejora (Mano Ágil), b está dentro de ese golpe: la marca que le salta no la
  // detona el mismo golpe (salta al acabarlo, sea cual sea el orden de los impactos)
  assert.ok(log.some(x => x.e === b && x.skill === 'g_martillo' && !x.detonated), 'z25: el golpe que la hace saltar no la detona en el nuevo');
  // dos marcas que se detonan por última vez en el MISMO golpe no saltan la una a la otra: van a los de fuera
  {
    const k = spec('cruzado', { z25: 1 });
    const pack = [k.enemy({ hp: 1e9, pos: [2.5, 0, 0] }), k.enemy({ hp: 1e9, pos: [2.5, 0, 1] })];
    const out = [k.enemy({ hp: 1e9, pos: [7.5, 0, 0] }), k.enemy({ hp: 1e9, pos: [7.5, 0, 1.5] })];
    for (const e of pack) markJ(k, e);
    hammer(k, [2.5, 0.5], 0.3); k.tick(0.3); hammer(k, [2.5, 0.5], 0.3);
    assert.ok(pack.every(e => !e.marks?.juicio) && out.every(e => e.marks?.juicio?.uses === 1), 'z25: las detonadas en el mismo golpe no se marcan entre sí');
  }
  // un salto que el planificador perdió (cambio de mundo: timers.clear) no se cuela en un golpe posterior
  {
    const k = spec('cruzado', { z25: 1 });
    const a2 = k.enemy({ hp: 1e9, pos: [2.5, 0, 0] }), near2 = k.enemy({ hp: 1e9, pos: [2.5, 0, 5] });
    markJ(k, a2);
    hammer(k, [2.5, 0], 0.3); k.tick(0.3);
    const sched = k.g.timers.schedule;                             // el planificador pierde el salto (solo ese)
    k.g.timers.schedule = (d, fn) => (String(fn).includes('tribunalJump') ? 0 : sched.call(k.g.timers, d, fn));
    hammer(k, [2.5, 0], 0.3);                                      // 2.ª detonación: el salto queda pendiente
    k.g.timers.schedule = sched;
    assert.ok(!a2.marks?.juicio && !near2.marks?.juicio, 'z25: sin planificador, el salto no se hizo');
    k.tick(1);
    const x = k.enemy({ hp: 1e9, pos: [20, 0, 0] }), xn = k.enemy({ hp: 1e9, pos: [20, 0, 3] });
    k.p.pos.set(18, 0, 0); markJ(k, x);
    k.gauge('fervor', 0);                                          // sin Veredicto (sale al pulsar: otro golpe)
    hammer(k, [20, 0], 0.3); k.tick(0.3); hammer(k, [20, 0], 0.3);
    assert.ok(xn.marks?.juicio && !near2.marks?.juicio, 'z25: el golpe nuevo salta lo suyo y no el salto viejo');
  }
  // las saltadas aguantan una sola detonación y no vuelven a saltar (sin cadena infinita)
  const d = h.enemy({ hp: 1e9, pos: [9.5, 0, 0] });
  h.p.pos.x = 4.5;                                           // al lado de las saltadas
  h.tick(0.3); hammer(h, [6, 0.5], 0.3);
  assert.ok(!b.marks?.juicio && !c.marks?.juicio, 'z25: la detonación gasta las saltadas');
  h.tick(0.3); hammer(h, [6, 0.5], 0.3);
  assert.ok(!d.marks?.juicio && !a.marks?.juicio, 'z25: y no saltan a nadie más');
});
check('z26', () => {
  const run = (r, hold) => {
    const h = r ? spec('cruzado', { z26: r }) : spec('cruzado');
    const e = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
    const log = spyHits(h);
    hammer(h, [2.5, 0], hold); h.step(0.4);
    const hs = log.filter(x => x.e === e && x.skill === 'g_martillo' && !x.proc && !x.dot);
    return { n: hs.length, echo: hs.find(x => x.echo), main: hs.find(x => !x.echo), add: prof(h, 'g_martillo').addPct };
  };
  const a = run(0, PERFECTA), b = run(1, PERFECTA), c = run(1, 0.3), d = run(3, PERFECTA);
  assert.ok(a.n === 1 && c.n === 1, 'z26: sin el nodo o sin suelta perfecta, un golpe');
  assert.ok(b.n === 2 && b.echo && approx(b.echo.dealt / b.main.dealt, 0.3, 0.12), `z26 r1: martillo del cielo al 30 % (${b.echo?.dealt} / ${b.main?.dealt})`);
  assert.equal(d.add - a.add, 30, 'z26 r3: Martillo +30 %');
});
check('z27', () => {
  const h = spec('cruzado', { z27: 1 });
  const ally = h.ally(0.5, 0, 1000); ally.hp = 400;
  const f = holy(h, 0, 0, { dps: 0, dur: 2 });
  h.tick(5);
  assert.ok(!f.dead, 'z27: la zona sigue mientras estás dentro');
  h.tick(3.5);
  assert.ok(f.dead, 'z27 r1: hasta 8 s');
  assert.ok(ally.hp > 400 && ally.hp <= 400 + 80 + 1, `z27: cura al más herido un 1 % por segundo (${ally.hp})`);
  const n = spec('cruzado'); const f2 = holy(n, 0, 0, { dps: 0, dur: 2 }); n.tick(2.5);
  assert.ok(f2.dead, 'sin z27 dura lo suyo');
});
check('z28', () => {
  const h = spec('cruzado', { z28: 4 });
  h.enemy({ hp: 1, rank: 'elite', pos: [3, 0, 0] }).takeDamage(1e6, false, {});
  assert.equal(h.gaugeValue('fervor'), 3, 'z28 r1: matar a un élite llena el Fervor');
  const ally = h.ally(2, 1, 1000); ally.hp = 100;
  const heals = healsBy(ally);
  h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  hammer(h, [2.5, 0], 0.05);
  assert.equal(heals.veredicto, 100, 'z28 r2: el Veredicto cura un 10 % al más herido');
  const w = x => prof(x, 'g_martillo').charge.perfect[0];
  assert.ok(approx(w(spec('cruzado')) - w(h), 0.15), 'z28 r3: la ventana perfecta empieza 0,15 s antes');
  h.setSlot('k4', 'g_u_cataclismo');
  const boss = h.enemy({ hp: 1e9, boss: true, pos: [2.5, 0, 0.5] });
  const log = spyHits(h);
  h.step(0.6);
  for (let i = 0; i < 7; i++) { h.gauge('fervor', 3); hammer(h, [2.5, 0], 0.05); h.step(0.6); }
  h.step(1.4);                                       // la columna arde 1,2 s tras el impacto
  const cat = log.filter(x => x.e === boss && x.skill === 'g_u_cataclismo' && !x.dot);
  // (S-guerrero: el impacto y los 4 golpes de la columna que arde, todos de la repetición)
  assert.ok(cat.length === 5 && cat.every(x => x.echo) && h.gaugeValue('fervor') === 0 && !(h.p.cds.g_u_cataclismo > 0), `z28 r4: al 8.º Veredicto, un Cataclismo gratis (no da Fervor) (${cat.length}, ${h.gaugeValue('fervor')}, ${h.p.cds.g_u_cataclismo})`);
  // r4: como mucho cada 30 s (otros 8 Veredictos en ~6 s no lo lanzan; el de después de 30 s, sí)
  // (cada Cataclismo: el impacto y los 4 golpes de la columna)
  const cats = () => log.filter(x => x.e === boss && x.skill === 'g_u_cataclismo' && !x.dot && x.echo).length / 5;
  for (let i = 0; i < 8; i++) { h.gauge('fervor', 3); hammer(h, [2.5, 0], 0.05); h.step(0.6); }
  h.step(0.6);
  assert.equal(cats(), 1, 'z28 r4: otros 8 Veredictos antes de 30 s: ningún Cataclismo más');
  h.tick(25);
  h.gauge('fervor', 3); hammer(h, [2.5, 0], 0.05); h.step(1.8);
  assert.equal(cats(), 2, 'z28 r4: pasados 30 s, el siguiente Veredicto lo lanza');
});

// ================================================================ cobertura
const keysOf = nodes => nodes.flatMap(n => (n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o]) : [[n.id, n]]));
const ALL = [...keysOf(TT.cls.nodes), ...TT.specs.flatMap(sp => keysOf(sp.nodes)), ...TT.hero.flatMap(h => keysOf(h.nodes))];
for (const [key, o] of ALL) {
  assert.ok(!('todo' in o), `${key}: sin «todo»`);
  if (o.free && !Object.keys(o.fx || {}).length) continue;     // clave gratis sin fx: su efecto es la mecánica
  assert.ok(Object.keys(o.fx || {}).length, `${key}: fx con efecto`);
  assert.ok(CHECKS[key], `${key}: falta su prueba de efecto observable`);
}
for (const sp of TT.specs) assert.ok(!('todo' in sp), `${sp.id}: la especialización sin «todo»`);
for (const key of Object.keys(CHECKS)) assert.ok(ALL.some(([k]) => k === key), `prueba ${key} sin nodo`);
const failed = [], ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
let ran = 0;
for (const [key, fn] of Object.entries(CHECKS)) {
  if (ONLY.length && !ONLY.includes(key)) continue;
  ran++;
  try { fn(); } catch (e) {
    const got = /equal/i.test(e.operator || '') ? ` (sale ${JSON.stringify(e.actual)})` : e instanceof assert.AssertionError ? '' : ` ${e.stack.split('\n')[1].trim()}`;
    failed.push(`[${key}] ${e.message.split('\n')[0]}${got}`);
  }
}
if (failed.length) { console.error(failed.join('\n')); assert.fail(`${failed.length} nodos sin su efecto`); }
console.log(`✓ ${ran} de ${Object.keys(CHECKS).length} nodos u opciones (clase, especializaciones y héroe) con efecto observable: 0 sin efecto`);

// ================================================================ reglas transversales
// suelos: el inicio de la recarga lo anota el PRIMER poder del lanzamiento (antes de recortar); otro
// poder del mismo lanzamiento que lo anota después de un recorte no lo mueve (Vigilia y Gracia del
// Cielo anotan los dos el Sendero: Luz Veloz 3, 7 s; el suelo de 4 s aguanta)
{
  const h = spec('cruzado', { z3: 3, z20: 1, z21: 1 });
  const sk = h.p.cls.skills.find(s => s.id === 'g_sendero');
  h.g._startCooldown(h.p, 'g_sendero', prof(h, 'g_sendero'));
  const c = { sk, prof: prof(h, 'g_sendero') };
  holy(h, h.p.pos.x, h.p.pos.z, { dps: 0, dur: 30, r: 3 });
  POWER_HOOKS.g_z_vigilia.afterCast(h.g, h.p, c);
  POWER_HOOKS.g_z_vigilia.onTick(h.g, h.p, 2);                // en la zona: 2 s más (el doble de rápido)
  assert.ok(approx(h.p.cds.g_sendero, 5, 0.01), 'Vigilia recorta 2 s');
  POWER_HOOKS.g_z_gracia.afterCast(h.g, h.p, c);               // el mismo lanzamiento: no vuelve a anotar
  POWER_HOOKS.g_z_vigilia.onTick(h.g, h.p, 10);
  assert.ok(approx(h.p.cds.g_sendero, 4, 0.01), `suelo de 4 s con dos poderes que anotan el mismo lanzamiento (${h.p.cds.g_sendero})`);
  // una recarga nueva (vuelve a subir) se anota de nuevo: el inicio de la anterior no vale
  h.tick(4.1);
  h.g._startCooldown(h.p, 'g_sendero', prof(h, 'g_sendero'));
  POWER_HOOKS.g_z_vigilia.onTick(h.g, h.p, 10);
  assert.ok(approx(h.p.cds.g_sendero, 4, 0.01), `recarga nueva sin anotar: el suelo también aguanta (${h.p.cds.g_sendero})`);
}
console.log('✓ suelos de recarga: el primer poder anota el inicio y una recarga nueva se anota de nuevo');

// G13: el Paragon en pausa apaga el árbol héroe de verdad (Caudillo con Asta Alta)
{
  const h = hero('cruzado', 'h3', { u1: 1 });
  const sp = h.p.talents.sp.cruzado;
  const leaf = Object.keys(sp).find(id => sp[id] >= 2);
  assert.ok(leaf && hasPw(h, 'g_cau_pendon') && h.p.tv.pendonRadius === 4, 'Paragon abierto: el Pendón y Asta Alta');
  sp[leaf]--; h.p.recompute();
  assert.ok(h.p.talentAgg.heroPaused && !h.p.talentAgg.heroOpen, 'G13: con un punto menos en la especialización, en pausa');
  assert.ok(!hasPw(h, 'g_cau_pendon') && !(h.p.tv.pendonRadius > 0), 'G13: en pausa, ni sus poderes ni sus claves');
  h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  h.tick(0.5);
  assert.equal(pendons(h).length, 0, 'G13: en pausa no clava Pendones');
  sp[leaf]++; h.p.recompute();
  assert.ok(h.p.talentAgg.heroOpen && !h.p.talentAgg.heroPaused && hasPw(h, 'g_cau_pendon') && h.p.tv.pendonRadius === 4, 'G13: devuelto el punto, vuelve');
  h.tick(0.5);
  assert.ok(pendons(h).length === 1 && pendons(h)[0].radius === 12, 'G13: y clava su Pendón (12 m)');
}
console.log('✓ G13: el Paragon en pausa apaga el árbol héroe y vuelve al devolver el punto');

// las claves tv propias las lee un poder del Guerrero
for (const k of GUERRERO_TV_KEYS) assert.ok(new RegExp(`\\btv\\??\\.${k}\\b`).test(SRC), `GUERRERO_TV_KEYS: «${k}» no la lee js/powers-guerrero.js`);
assert.ok(!new RegExp('\\btv\\??\\.titanInventada\\b').test(SRC), 'la comprobación de lectura rechaza una clave que nadie lee');
// los poderes de los nodos de clase y héroe usan el prefijo de la clase y están registrados
for (const [key, o] of ALL) if (o.fx?.power) assert.ok((/^g_/.test(o.fx.power) || o.fx.power === 'm_berserk') && POWER_HOOKS[o.fx.power], `${key}: poder ${o.fx.power} registrado`);
console.log(`✓ ${GUERRERO_TV_KEYS.length} claves tv propias leídas por sus poderes`);

// T-guerrero (reorden por nivel): el learnAt de estos nodos sale de un touch secundario (Cambio de
// Guardia, Piel de Hierro, Juicio), pero su efecto solo actúa con la principal de Nv14: su nivel de
// compra (fila, padres y puertas) no puede llegar antes. Y ninguna build del Guardián compra Tambor de
// Guerra antes del Nv26 (como en el mockup): con el Terremoto acorta Piel de Hierro y el TTD+ de
// Montaña Viva salta de 24 s a 256 s (pendiente de KA-guerrero; un reorden no debe adelantarlo)
{
  const NEEDS = { berserker: { b5: 'g_rajar' }, guardian: { d5: 'terremoto', d12: 'terremoto' }, cruzado: { z5: 'g_martillo' } };
  for (const [spec, nodes] of Object.entries(NEEDS)) {
    const tree = levelTrees('guerrero').find(t => t.spec === spec);
    for (const [id, skill] of Object.entries(nodes)) {
      const at = skillLearnLevel('guerrero', skill, spec), buy = buyLevel(tree, tree.nodes.find(n => n.id === id));
      assert.ok(buy >= at, `${id}: se compra al Nv${buy}, antes de conocer ${skill} (Nv${at}), con la que actúa`);
    }
  }
  for (const { key, build } of buildsFor('guerrero', 'guardian'))
    for (let L = 10; L < 26; L++) {
      const r = buildRanks({ classId: 'guerrero', level: L, talents: { v: 2, spec: 'guardian' } }, build, { level: L }).sp.guardian;
      assert.ok(!(r.d12 > 0), `${key}: compra Tambor de Guerra al Nv${L} (antes del Nv26)`);
    }
}
console.log('✓ reorden por nivel: Reabrir, Echar Raíces, Tambor de Guerra y Sello del Martillo se compran con su principal; Tambor de Guerra no antes del Nv26');

console.log('\n✅ TALENTOS DEL GUERRERO (clase, especializaciones y héroe): cada nodo con su efecto');
