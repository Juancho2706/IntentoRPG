// Paso 2b.1 — catálogo BASE del GUERRERO (docs/paso2-diseno.md §3.1, formato MEMORIA §7)
//  1) cada habilidad es válida (validateSkillDef), tiene 3 ramas y sus ranuras = su categoría
//  2) números de diseño (coef/coste/enfr./req) y resolveSkill en Nv1 / Nv20 / Nv50
//  3) cada comportamiento a medida y cada tipo genérico se ejecutan en el arnés sin errores
import assert from 'node:assert/strict';
import { CLASSES, SKILL_MODS } from '../js/data.js';
import { validateSkillDef, SLOT_KEYS, CAT_SLOTS } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill, fitsSlot, rankBase, isKnown } from '../js/skill-resolve.js';
import { GUERRERO_SKILLS, GUERRERO_SKILL_BEHAVIORS } from '../js/skills-guerrero.js';
import { GUERRERO_FX } from '../js/fx-skills-guerrero.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { Player } from '../js/entities.js';
import { makeHarness } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = id => CLASSES.guerrero.skills.find(s => s.id === id);

// ------------------------------------------------ 1) catálogo
// estado de §3.1 (C conserva · R rehace · N nueva) y números de diseño a rango 1
const EXPECT = {
  g_tajo:         { st: 'C', cat: 'basic',    req: 1,  coef: 1.0, cost: 0,  cd: 0,  gen: 10 },
  g_mandoble:     { st: 'R', cat: 'basic',    req: 3,  coef: 1.5, cost: 0,  cd: 0,  gen: 14 },   // básico B (Nv3)
  g_embate:       { st: 'R', cat: 'basic',    req: 8,  coef: 0.6, cost: 0,  cd: 0,  gen: 7 },    // básico C (Nv8)
  torbellino:     { st: 'R', cat: 'spender',  req: 2,  coef: 1.6, cost: 25, cd: 0 },
  g_hendidura:    { st: 'R', cat: 'spender',  req: 8,  coef: 2.9, cost: 27, cd: 0 },   // 2,6/30 → 2,9/27 (banco 2b.2)
  g_martillo:     { st: 'R', cat: 'spender',  req: 8,  coef: 2.4, cost: 30, cd: 0 },
  terremoto:      { st: 'R', cat: 'spender',  req: 14, coef: 3.1, cost: 26, cd: 4 },   // 3,0/35/6 → 3,1/26/4 (banco 2b.2)
  g_lanza:        { st: 'C', cat: 'spender',  req: 14, coef: 1.9, cost: 20, cd: 0 },
  embestida:      { st: 'C', cat: 'movement', req: 4,  coef: 1.2, cost: 0,  cd: 8 },
  g_salto:        { st: 'R', cat: 'movement', req: 12, coef: 1.8, cost: 0,  cd: 12 },
  g_piel:         { st: 'N', cat: 'defense',  req: 6,  coef: 0,   cost: 0,  cd: 25 },
  g_provocacion:  { st: 'R', cat: 'utility',  req: 16, coef: 0,   cost: 0,  cd: 8 },    // utilidad C (Nv16)
  grito_guerra:   { st: 'R', cat: 'utility',  req: 12, coef: 0,   cost: 0,  cd: 20 },   // sin coste, +30 al lanzar
  g_u_furia:      { st: 'R', cat: 'ultimate', req: 15, coef: 0,   cost: 0,  cd: 60 },
  g_u_cataclismo: { st: 'R', cat: 'ultimate', req: 15, coef: 3.4, cost: 0,  cd: 50 },   // 3,5 → 3,6 (2b.2) → 3,4 × 8 impactos en 5 s (2c.2)
  g_u_estandarte: { st: 'R', cat: 'ultimate', req: 15, coef: 0,   cost: 0,  cd: 55 },
};
assert.deepEqual(GUERRERO_SKILLS.map(s => s.id).sort(), Object.keys(EXPECT).sort(), 'catálogo base = §3.1 sin las de talento');
// catálogo BASE (las activas de talento, kind 'talent', entran en CLASSES desde el Paso 2c.0)
const BASE = CLASSES.guerrero.skills.filter(s => s.kind !== 'talent');
assert.equal(CLASSES.guerrero.skills.filter(s => s.kind === 'talent').length, 12, 'las 12 activas de talento del Guerrero entran en CLASSES con kind talent');
assert.deepEqual(BASE.filter(s => !s.id.startsWith('t_')).map(s => s.id), GUERRERO_SKILLS.map(s => s.id), 'data.js usa este catálogo');
for (const s of CLASSES.guerrero.skills.filter(x => EXPECT[x.id])) {
  const want = EXPECT[s.id];
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS }), [], s.id);
  assert.equal(SKILL_MODS[s.id]?.length, 3, `${s.id}: 3 ramas`);
  for (const br of SKILL_MODS[s.id]) {
    assert.ok(br.id.startsWith(`${s.id}_`) && br.opts.length === 3, `${s.id}: rama ${br.id} con 3 opciones`);
    for (const o of br.opts) assert.ok(o.id.startsWith(br.id) && o.name && o.desc, `${br.id}: opción ${o.id}`);
  }
  assert.equal(s.cat, want.cat, `${s.id}: categoría`);
  assert.equal(s.req, want.req, `${s.id}: req (calendario §1.2)`);
  assert.ok(approx(s.coef, want.coef) && s.cost === want.cost && s.cd === want.cd, `${s.id}: coef/coste/enfr. = ${s.coef}/${s.cost}/${s.cd}`);
  if (want.gen) assert.equal(s.gen, want.gen, `${s.id}: generación`);
  assert.ok(s.desc.length > 40 && /\d/.test(s.desc), `${s.id}: descripción clara y con números`);
  // ranuras = las de su categoría (k2 flexible para gastadoras), ninguna otra
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), CAT_SLOTS[s.cat].includes(slot), `${s.id}: fitsSlot(${slot})`);
  if (s.cat === 'spender') assert.ok(fitsSlot(s, 'rmb') && fitsSlot(s, 'k2'), `${s.id}: gastadora en rmb o k2`);
  if (s.behavior) assert.ok(GUERRERO_SKILL_BEHAVIORS[s.behavior] && SKILL_BEHAVIORS[s.behavior], `${s.id}: comportamiento registrado`);
  // VFX/SFX: cada habilidad tiene entrada y sus presets por nombre existen
  const fx = SKILL_FX[s.id];
  assert.ok(fx && GUERRERO_FX[s.id] && fx.sfx, `${s.id}: VFX/SFX`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]] || ['basicCleave', 'meleeHit'].includes(fx[k]), `${s.id}: preset ${fx[k]}`);
}
assert.ok(!BASE.some(s => /^g_p_|^g_t_/.test(s.id)), 'sin pasivas compradas ni activas de talento en el catálogo base');
assert.ok(CLASSES.guerrero.skills.filter(s => /^g_t_/.test(s.id)).every(s => s.kind === 'talent'), 'las g_t_ son de talento');
assert.ok(SK('g_piel').tags.includes('defense') && SK('g_provocacion').tags.includes('taunt') && SK('g_u_cataclismo').elem === 'holy');
assert.ok(GUERRERO_SKILLS.filter(s => s.cat === 'ultimate').every(s => !s.cost && s.cd >= 40), 'definitivas: sin coste, enfr. ≥ 40 s');
console.log('Catálogo del Guerrero: 16 habilidades base válidas, ramas 3×3, ranuras por categoría y VFX ✓');

// ------------------------------------------------ 2) resolveSkill en Nv1 / Nv20 / Nv50
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, input: { joyDir: null, keyDir: null }, enemies: [] });
const LITERAL = {   // coef final a mano: base × (1 + 0,10·(rango−1)), rango = clamp(1+⌊(Nv−req)/8⌋,1,5)
  1:  { torbellino: 1.6,  g_hendidura: 2.9,  terremoto: 3.1, g_tajo: 1.0, g_u_cataclismo: 3.4 },
  20: { torbellino: 1.92, g_hendidura: 3.19, terremoto: 3.1, g_tajo: 1.2, g_u_cataclismo: 3.4 },
  50: { torbellino: 2.24, g_hendidura: 4.06, terremoto: 4.34, g_tajo: 1.4, g_u_cataclismo: 4.76 },
};
for (const L of [1, 20, 50]) {
  const p = new Player(mk(), 'guerrero');
  p.level = L; p.recompute();
  for (const [id, want] of Object.entries(EXPECT)) {
    const s = SK(id);
    const prof = resolveSkill(p, s);
    const r = rankBase(L, want.req);
    assert.equal(prof.rank, r, `${id} Nv${L}: rango ${prof.rank}`);
    assert.ok(approx(prof.coef, want.coef * (1 + 0.1 * (r - 1))), `${id} Nv${L}: coef ${prof.coef}`);
    assert.equal(prof.cost, want.cost, `${id} Nv${L}: coste`);
    assert.ok(approx(prof.cd, want.cd), `${id} Nv${L}: enfriamiento`);
    for (const [k, v] of Object.entries(s.buff || {})) assert.equal(prof.buff[k], Math.round(v * (1 + 0.06 * (r - 1))), `${id} Nv${L}: buff ${k}`);
    assert.equal(isKnown(p, s), L >= want.req, `${id}: conocida desde Nv${want.req}`);
    if (s.cat === 'basic') assert.equal(prof.gen, want.gen, `${id}: genera ${want.gen}`);
    assert.equal(prof.gcd, !['basic', 'movement'].includes(s.cat), `${id}: GCD según categoría`);
  }
  for (const [id, c] of Object.entries(LITERAL[L])) assert.ok(approx(resolveSkill(p, SK(id)).coef, c), `${id} Nv${L}: coef literal ${c}`);
}
{ // números concretos de Nv50 (rango 5): buffs +24 %
  const p = new Player(mk(), 'guerrero'); p.level = 50; p.recompute();
  assert.deepEqual(resolveSkill(p, SK('g_piel')).buff, { dr: 37 });
  assert.deepEqual(resolveSkill(p, SK('grito_guerra')).buff, { dmgPct: 12 });
  assert.deepEqual(resolveSkill(p, SK('g_u_estandarte')).buff, { dmgPct: 25, dr: 19 });   // rango 5 (req 15: 1+⌊35/8⌋=5)
  assert.ok(approx(resolveSkill(p, SK('g_salto')).coef, 1.8 * 1.4) && resolveSkill(p, SK('g_salto')).slowPct === 40);
}
console.log('resolveSkill: rango por nivel, coef/coste/enfr./buffs esperados en Nv1, Nv20 y Nv50 ✓');

// ------------------------------------------------ 3) comportamientos y tipos genéricos en el arnés
const hz = (level = 50) => { const h = makeHarness({ classId: 'guerrero', level }); h.p.mp = h.p.stats.maxMP; return h; };
let h, e, e2;

// Tajo (básico de arma): golpea y salpica; Furia +10 +2 por extra
h = makeHarness({ classId: 'guerrero', level: 1 });
e = h.enemy({ hp: 1e6, pos: [1.4, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [2.4, 0, 0] });
h.p.basicAttack(e);
assert.ok(e.hp < 1e6 && e2.hp < 1e6, 'Tajo: objetivo + adyacente');
assert.equal(h.p.mp, 12, 'Tajo: +10 +2 por el extra');

// Mandoble: windup 0,12 s, un solo objetivo, +14 de Furia, cadencia ×1,5
h = makeHarness({ classId: 'guerrero', level: 20 });
e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [2.2, 0, 0.4] });
h.aim(1.5, 0); h.setSlot('lmb', 'g_mandoble');
assert.equal(h.cast('lmb'), true);
assert.equal(e.hp, 1e6, 'Mandoble: aún en preparación');
h.step(0.13);
assert.ok(e.hp < 1e6 && e2.hp === 1e6, 'Mandoble: golpe único');
assert.equal(h.p.mp, 14, 'Mandoble: +14 al acertar');
// sk.cadence del núcleo: atkCd = atkTime × 1,5 − windup (ya esperado) − lo avanzado tras el golpe
assert.ok(approx(h.p.atkCd, h.p.stats.atkTime * 1.5 - 0.12 - 0.01, 0.02), `Mandoble: cadencia ×1,5 (${h.p.atkCd.toFixed(2)} vs ${h.p.stats.atkTime.toFixed(2)})`);
// al vacío: golpe sin objetivo (no se lanza, no genera)
h.p.mp = 0; e.alive = e2.alive = false; h.p.atkCd = 0;
assert.equal(h.cast('lmb'), false); h.step(0.2);
assert.equal(h.p.mp, 0, 'Mandoble al vacío: sin Furia');
assert.ok(h.p.atkCd > 0, 'Mandoble al vacío: igual consume el golpe');

// Embate: todos a 2,5 m, +7 +2 por extra, cadencia ×1,1
h = makeHarness({ classId: 'guerrero', level: 20 });
e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [-1.5, 0, 0] });
const far = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
h.setSlot('lmb', 'g_embate');
assert.equal(h.cast('lmb'), true);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && far.hp === 1e6, 'Embate: área a tus pies');
assert.equal(h.p.mp, 9, 'Embate: +7 +2');
assert.ok(approx(h.p.atkCd, h.p.stats.atkTime * 1.1, 1e-6), 'Embate: cadencia ×1,1');

// Torbellino: área instantánea, cuesta 25
h = hz(20); e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [0, 0, -2.5] });
h.setSlot('rmb', 'torbellino'); assert.equal(h.cast('rmb'), true);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && h.p.mp === 75, 'Torbellino: golpea alrededor y cuesta 25');

// Hendidura: cono 120°/4,5 m tras 0,12 s; cuesta 30
h = hz(20); e = h.enemy({ hp: 1e6, pos: [4, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [-2, 0, 0] });
h.aim(5, 0); h.setSlot('rmb', 'g_hendidura'); assert.equal(h.cast('rmb'), true); h.step(0.2);
assert.ok(e.hp < 1e6 && e2.hp === 1e6 && h.p.mp === 73, 'Hendidura: delante a 4 m sí, detrás no; cuesta 27');

// Martillo: alcance 2,5 m, r 3, impacta a 0,15 + 0,23 s
h = hz(20); e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
h.aim(8, 0); h.setSlot('rmb', 'g_martillo'); assert.equal(h.cast('rmb'), true);
h.step(0.3); assert.equal(e.hp, 1e6, 'Martillo: el daño llega con el impacto');
h.step(0.2); assert.ok(e.hp < 1e6, 'Martillo: impacta 2,5 m delante con radio 3');

// Terremoto: línea 8 × 2 m, aturde 0,75 s, enfr. 6 s
h = hz(20); e = h.enemy({ hp: 1e6, pos: [6, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [4, 0, 3] });
h.aim(8, 0); h.setSlot('rmb', 'terremoto'); assert.equal(h.cast('rmb'), true); h.step(0.2);
assert.ok(e.hp < 1e6 && e.stunT > 0 && e2.hp === 1e6, 'Terremoto: daña y aturde en la línea');
assert.ok(approx(h.p.cds.terremoto, 4, 0.05) && h.p.mp === 74, 'Terremoto: 26 de Furia y 4 s');
// los jefes NO se aturden (bossStun:false; sumarán stagger en 2c)
h = hz(20); e = h.enemy({ hp: 1e6, pos: [6, 0, 0], boss: true });
h.aim(8, 0); h.setSlot('rmb', 'terremoto'); assert.equal(h.cast('rmb'), true); h.step(0.2);
assert.ok(e.hp < 1e6 && !(e.stunT > 0), 'Terremoto: al jefe le hace daño pero no lo aturde');

// Lanza: proyectil perforante
h = hz(20); e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [7, 0, 0] });
h.aim(10, 0); h.setSlot('rmb', 'g_lanza'); assert.equal(h.cast('rmb'), true); h.step(1);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && h.p.mp === 80, 'Lanza: atraviesa a los dos; cuesta 20');

// Embestida: te mueve 7 m, daña al llegar y da +12 de Furia SOLO si golpea
h = makeHarness({ classId: 'guerrero', level: 20 });
e = h.enemy({ hp: 1e6, pos: [5.5, 0, 0] });
h.aim(5, 0); h.setSlot('k1', 'embestida'); assert.equal(h.cast('k1'), true);
assert.ok(h.p.pos.x > 4.5 && e.hp < 1e6 && h.p.mp === 12 && h.p.cds.embestida === 8, 'Embestida: desplaza, daña y +12');
h.tick(0.3); h.p.cds = {}; e.alive = false; h.p.pos.set(0, 0, 0); h.p.mp = 0;
assert.equal(h.cast('k1'), true);
assert.equal(h.p.mp, 0, 'Embestida al vacío: sin Furia');

// Salto Devastador: te mueve, intocable en el aire, ralentiza 40 % 2 s
h = hz(20); e = h.enemy({ hp: 1e6, pos: [6.5, 0, 0] });
h.aim(6, 0); h.setSlot('k1', 'g_salto'); assert.equal(h.cast('k1'), true);
const hp0 = h.p.hp; h.p.takeDamage(50, 1); assert.equal(h.p.hp, hp0, 'Salto: intocable');
h.step(0.6);
assert.ok(Math.abs(h.p.pos.x - 6) < 0.05 && e.hp < 1e6 && e.slowT > 1 && e.slowPct === 40, 'Salto: aterriza, daña y ralentiza 40 %');

// Piel de Hierro: −30 % (+6 %/rango) de daño recibido 6 s, inmune a ralentizaciones
h = hz(6); h.setSlot('k2', 'g_piel'); h.p.slowT = 3;
assert.equal(h.cast('k2'), true);
assert.equal(h.p.stats.dr, 30, 'Piel: dr 30 a rango 1');
h.p.slowT = 2; h.step(0.15);
assert.equal(h.p.slowT, 0, 'Piel: inmune a ralentizaciones mientras dura (p.slowImmuneT)');
assert.equal(h.p.applySlow(2), false, 'Piel: applySlow no tiene efecto');
h.tick(6.2); h.p.slowT = 2; h.step(0.2);
assert.ok(h.p.slowT > 1 && h.p.stats.dr === 0, 'Piel: al terminar vuelve la ralentización y se va el dr');

// Provocación: provoca a 1 enemigo a 15 m, −15 % de su daño 4 s, +15 de Furia
h = makeHarness({ classId: 'guerrero', level: 20 });
e = h.enemy({ hp: 1e6, pos: [10, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [11, 0, 0] });
const dmg0 = e.def.dmg;
h.aim(10, 0); h.setSlot('k2', 'g_provocacion'); assert.equal(h.cast('k2'), true);
assert.ok(e.tauntT > 0 && !(e2.tauntT > 0), 'Provocación: a uno solo');
assert.ok(approx(e.outDmgMul(), 0.85) && e.def.dmg === dmg0, 'Provocación: −15 % de daño saliente (e.outDmgMul, sin tocar e.def)');
assert.equal(h.p.mp, 15, 'Provocación: +15 de Furia');
assert.equal(h.p.cds.g_provocacion, 8);
h.tick(4.2);
assert.ok(approx(e.outDmgMul(), 1), 'Provocación: el debilitamiento caduca');
e.alive = e2.alive = false; h.p.cds = {}; h.p.gcdT = 0;
assert.equal(h.cast('k2'), true);
assert.equal(h.p.cds.g_provocacion, 0, 'Provocación sin objetivo: no gasta el enfriamiento');

// Grito de Guerra: +30 de Furia y +10 % de daño 8 s
h = makeHarness({ classId: 'guerrero', level: 12 });
h.setSlot('k2', 'grito_guerra');
const dmgPct0 = h.p.stats.dmgPct;
assert.equal(h.p.mp, 0);
assert.equal(h.cast('k2'), true, 'Grito: sin coste (se lanza con 0 de Furia)');
assert.ok(h.p.mp === 30 && h.p.stats.dmgPct === dmgPct0 + 10, 'Grito: +30 de Furia (sk.gen) y +10 % de daño');
assert.ok(h.p.buffs.some(b => b.id === 'grito_guerra' && approx(b.dur, 8)), 'Grito: 8 s');

// Furia Inmortal: imparable, +30 % de velocidad de ataque y gastadoras sin coste
h = makeHarness({ classId: 'guerrero', level: 20 });
e = h.enemy({ hp: 1e6, pos: [2, 0, 0] });
const aspd0 = h.p.stats.aspdPct;
h.setSlot('k4', 'g_u_furia'); assert.equal(h.cast('k4'), true);
assert.ok(h.p.unstoppableT > 9 && h.p.stats.aspdPct === aspd0 + 30, 'Furia Inmortal: imparable y +30 % vel. ataque');
h.tick(0.3);
assert.equal(resolveSkill(h.p, SK('torbellino')).cost, 0, 'Furia Inmortal: coste 0 en resolveSkill (spenderCostPct del buff)');
assert.ok(h.p.slowImmuneT > 9, 'Furia Inmortal: inmune a ralentizaciones');
const mpF = h.p.mp;
h.setSlot('rmb', 'torbellino'); assert.equal(h.cast('rmb'), true, 'gastadora lanzable con la Furia a 0');
h.step(0.15);
assert.ok(h.p.mp >= mpF, 'Furia Inmortal: la gastadora no consume Furia');
h.tick(10.5);
assert.ok(!h.p.buffs.some(b => b.id === 'g_u_furia'), 'Furia Inmortal: dura 10 s');
assert.equal(resolveSkill(h.p, SK('torbellino')).cost, 25, 'al terminar, el coste vuelve');

// Cataclismo: 8 impactos en 5 s (telegrafía 0,4 s), el centro recibe los 8 (2c.2: eran 6 en 3 s)
h = makeHarness({ classId: 'guerrero', level: 15 });
e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
let hits = 0; const td = e.takeDamage.bind(e); e.takeDamage = (a, c, o) => { if (!o?.proc) hits++; return td(a, c, o); };
h.aim(5, 0); h.setSlot('k4', 'g_u_cataclismo'); assert.equal(h.cast('k4'), true);
h.step(0.5); assert.equal(hits, 0, 'Cataclismo: windup + telegrafía antes del primer impacto');
h.step(5.0); assert.equal(hits, 8, `Cataclismo: 8 impactos en el centro (${hits})`);
assert.equal(h.p.cdMax.g_u_cataclismo, 50, 'Cataclismo: enfriamiento 50 s');

// Estandarte de Guerra: +20 % daño y −15 % daño recibido a 8 m, +5 Furia/s, 12 s
h = makeHarness({ classId: 'guerrero', level: 15 });
h.setSlot('k4', 'g_u_estandarte'); assert.equal(h.cast('k4'), true);
assert.ok(h.p.stats.dr === 15 && h.p.buffs.some(b => b.id === 'g_u_estandarte'), 'Estandarte: buff dentro del radio');
h.tick(4);
assert.ok(h.p.mp >= 18 && h.p.mp <= 25, `Estandarte: ~5 Furia/s (${h.p.mp})`);
h.p.pos.set(20, 0, 0); h.tick(1);
assert.ok(!h.p.buffs.some(b => b.id === 'g_u_estandarte'), 'Estandarte: fuera del radio se pierde');
h.p.pos.set(0, 0, 0); h.tick(1);
assert.ok(h.p.buffs.some(b => b.id === 'g_u_estandarte'), 'Estandarte: al volver se recupera');
h.tick(8);
assert.ok(!h.p.buffs.some(b => b.id === 'g_u_estandarte'), 'Estandarte: termina a los 12 s');

// Eco (rama Transformación) sobre un comportamiento: el Mandoble repite sin tocar la cadencia
h = makeHarness({ classId: 'guerrero', level: 20 });
h.p.skillMods = { g_mandoble: { g_mandoble_v: 'g_mandoble_v3' } }; h.p.recompute();
e = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] });
let mh = 0; const td2 = e.takeDamage.bind(e); e.takeDamage = (a, c, o) => { mh++; return td2(a, c, o); };
h.aim(1.5, 0); h.setSlot('lmb', 'g_mandoble'); h.cast('lmb'); h.step(0.8);
assert.equal(mh, 2, 'Mandoble con Eco: dos golpes');

assert.deepEqual(warns, [], 'ningún comportamiento lanzó errores');
console.warn = origWarn;
console.log('Tipos genéricos (Mandoble, Embate, Embestida, Piel, Provocación, Grito, Furia, Estandarte) y comportamiento (Cataclismo) ✓');
console.log('\n✅ HABILIDADES DEL GUERRERO OK');
