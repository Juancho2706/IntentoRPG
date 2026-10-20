// Paso 2b.1 — catálogo BASE de la ARQUERA (docs/paso2-diseno.md §3.3)
//  1) formato: validateSkillDef, 3 ramas, ranuras por categoría (CAT_SLOTS), calendario §1.2
//  2) Energía (§2): básicos +5, gastadoras sin enfriamiento salvo la Lluvia, definitivas sin coste
//  3) resolveSkill en Nv1/Nv20/Nv50 (rango por nivel)
//  4) comportamientos con el arnés (canal de lanzamiento REAL), sin errores
//  5) VFX/SFX: cada habilidad tiene entrada y los presets citados existen
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CLASSES, SKILL_MODS } from '../js/data.js';
import { validateSkillDef, defaultSlots, SLOT_KEYS, TAGS, COLDBLOOD_CRIT as DEFS_COLDBLOOD } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill, fitsSlot, rankBase } from '../js/skill-resolve.js';
import { rankCoef, COLDBLOOD_CRIT } from '../js/combat-math.js';
import { Projectile } from '../js/entities.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { normalizePreset } from '../js/particles.js';
import { ARQUERA_SKILLS, ARQUERA_SKILL_BEHAVIORS } from '../js/skills-arquera.js';
import { ARQUERA_FX, ARQUERA_FX_PRESETS } from '../js/fx-skills-arquera.js';
import { makeHarness } from './helpers/power-harness.mjs';

// catálogo BASE (las activas de talento, kind 'talent', entran en CLASSES desde el
// Paso 2c.0 y las cubre tests/test-powers-arquera.mjs en 2c.1)
const skills = CLASSES.arquera.skills.filter(s => s.kind !== 'talent');
assert.equal(CLASSES.arquera.skills.filter(s => s.kind === 'talent').length, 14, 'las 14 activas de talento de la Arquera entran en CLASSES con kind talent');
const S = id => skills.find(s => s.id === id);

// ------------------------------------------------ 1) formato y catálogo
const EXPECT = {
  a_disparo: 1, flecha_perforante: 2, a_disperso: 3, a_paso: 4, a_red: 6, flecha_multiple: 8, a_cicuta: 8,
  agilidad: 12, a_humo: 12, lluvia_flechas: 14, a_u_diluvio: 15, a_u_celeste: 15, a_u_zarzas: 15,
};
assert.deepEqual(skills.map(s => s.id).sort(), Object.keys(EXPECT).sort(), 'catálogo base de §3.3 (sin las de talento)');
assert.ok(!S('a_p_punteria'), 'la pasiva eliminada no vuelve');
for (const s of skills) {
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS }), [], s.id);
  assert.equal(SKILL_MODS[s.id]?.length, 3, `${s.id}: 3 ramas`);
  for (const br of SKILL_MODS[s.id]) assert.equal(br.opts.length, 3, `${s.id}/${br.id}: 3 opciones`);
  assert.equal(s.req, EXPECT[s.id], `${s.id}: nivel del calendario §1.2`);
  assert.ok(s.desc.length > 30 && /\d/.test(s.desc), `${s.id}: descripción clara con números`);
  for (const t of s.tags) assert.ok(TAGS.has(t), `${s.id}: tag ${t}`);
  // ranuras: exactamente las de su categoría (k2 flexible para las gastadoras)
  const want = defaultSlots(s.cat, s.tags);
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), want.includes(slot), `${s.id} en ${slot}`);
  if (s.behavior) assert.ok(ARQUERA_SKILL_BEHAVIORS[s.behavior], `${s.id}: comportamiento propio de la clase`);
}
// ranuras por categoría y k2 flexible
assert.deepEqual(S('flecha_multiple').slots, ['rmb', 'k2']);
assert.deepEqual(S('a_humo').slots, ['k2']);
assert.deepEqual(S('a_paso').slots, ['k1']);
assert.deepEqual(S('a_u_zarzas').slots, ['k4']);
// ids de rama conservados (migración v3)
assert.deepEqual(SKILL_MODS.flecha_perforante.map(b => b.id), ['flecha_perforante_o', 'flecha_perforante_f', 'flecha_perforante_v']);
assert.deepEqual(SKILL_MODS.agilidad.map(b => b.id), ['agilidad_o', 'agilidad_d', 'agilidad_f']);
assert.deepEqual(SKILL_MODS.a_paso.map(b => b.id), ['a_paso_o', 'a_paso_r', 'a_paso_v'], 'utilMods en movilidad/defensa nuevas');
assert.equal(DEFS_COLDBLOOD, COLDBLOOD_CRIT, 'skill-defs exporta la misma Sangre Fría que combat-math (sin copias locales)');
assert.ok(ARQUERA_SKILLS.length === skills.length);
console.log('Formato: 13 habilidades válidas, 3 ramas, ranuras de su categoría y calendario §1.2 ✓');

// ------------------------------------------------ 2) Energía (§2)
for (const s of skills) {
  if (s.cat === 'basic') { assert.equal(s.gen, 5, `${s.id}: +5 al acertar`); assert.equal(s.cost, 0); }
  if (s.cat === 'spender') {
    assert.ok(s.cost >= 20 && s.cost <= 30, `${s.id}: coste 20–30`);
    assert.equal(s.cd, s.id === 'lluvia_flechas' ? 4 : 0, `${s.id}: sin enfriamiento salvo la Lluvia (4 s)`);
  }
  if (s.cat === 'ultimate') { assert.equal(s.cost, 0, `${s.id}: sin coste`); assert.ok(s.cd >= 50, `${s.id}: enfriamiento ≥ 50 s`); }
}
// números de §3.3 recalibrados con el banco (Paso 2b.2): Disparo Rápido 1,0→1,15,
// Perforante 2,2/20→2,1/26, Lluvia 3,0→2,4 WD en total, Diluvio 20→17,6 WD;
// Paso 2c.2 (banco con talentos): Lluvia 2,4→2,08 WD, Diluvio 17,6→15,6 WD
// Paso 2e (roles, ÁREA×5 con la manada que camina): Perforante 2,1→2,4, Múltiple 0,35→0,39,
// Lluvia 2,8→2,4 WD, Diluvio 15,6→21,84 WD (la definitiva aportaba < 12 % del UNI)
assert.deepEqual([S('a_disparo').coef, S('flecha_perforante').coef, S('flecha_perforante').cost, S('flecha_multiple').coef, S('flecha_multiple').count], [1.0, 2.4, 26, 0.39, 5], 'números de §3.3 (2b.2 → 2e)');
assert.equal(+(S('lluvia_flechas').coef * S('lluvia_flechas').waves).toFixed(2), 2.4, 'Lluvia: 2,4 WD en total (2e)');
assert.equal(+(S('a_u_diluvio').coef * S('a_u_diluvio').waves).toFixed(2), 21.84, 'Diluvio: 21,84 WD por objetivo (2e)');
assert.equal(S('a_u_celeste').coef * S('a_u_celeste').shots, 21, 'Tiro Celestial: 3 × 7,0');
console.log('Energía: básicos +5, gastadoras sin enfriamiento (Lluvia 4 s), definitivas gratis ✓');

// ------------------------------------------------ 3) resolveSkill por nivel
for (const L of [1, 20, 50]) {
  const h = makeHarness({ classId: 'arquera', level: L });
  for (const s of skills) {
    const prof = resolveSkill(h.p, s);
    const rank = rankBase(L, s.req);
    assert.equal(prof.rank, rank, `${s.id} Nv${L}: rango`);
    assert.ok(Math.abs(prof.coef - (s.coef || 0) * rankCoef(rank)) < 1e-9, `${s.id} Nv${L}: coef × rango`);
    assert.equal(prof.cost, s.cost || 0, `${s.id} Nv${L}: coste`);
    assert.equal(prof.gcd, !['basic', 'movement'].includes(s.cat), `${s.id}: GCD según categoría`);
  }
  if (L === 50) {
    assert.equal(resolveSkill(h.p, S('flecha_perforante')).rank, 5);
    assert.equal(resolveSkill(h.p, S('agilidad')).buff.spdPct, Math.round(30 * (1 + 0.06 * 4)), 'buff escala con el rango');
  }
}
console.log('resolveSkill Nv1/Nv20/Nv50: rango por nivel, coef, coste y GCD ✓');

// ------------------------------------------------ 4) comportamientos (arnés)
const warn = console.warn;
const warnings = [];
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
const mk = (level = 20) => {
  const h = makeHarness({ classId: 'arquera', level });
  h.p.mp = h.p.stats.maxMP;
  return h;
};
const countHits = (e, skill) => {
  const out = { n: 0 };
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { if (!skill || o.skill === skill) out.n++; return orig(a, c, o); };
  return out;
};

// Disparo Disperso: 3 flechas; +5 de Energía SOLO si acierta
{
  const run = (hit) => {
    const h = mk();
    const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
    h.aim(hit ? 0 : -4, hit ? 4 : -4);
    h.setSlot('lmb', 'a_disperso');
    h.p.mp = 0;
    assert.equal(h.cast('lmb'), true);
    assert.equal(h.g.projectiles.length, 3, 'tres flechas');
    h.step(1);
    return { mp: h.p.mp, dmg: 1e6 - e.hp, h };
  };
  const a = run(true), b = run(false);
  assert.ok(a.dmg > 0 && b.dmg === 0, 'la volea golpea solo si apuntas al enemigo');
  assert.ok(Math.abs((a.mp - b.mp) - 5) < 1e-6, `+5 de Energía al acertar (diferencia ${a.mp - b.mp})`);
  console.log('Disparo Disperso: abanico de 3 y Energía solo al acertar ✓');
}

// Flecha de Cicuta: impacto + Veneno que sigue pegando
{
  const h = mk();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.aim(0, 4); h.setSlot('lmb', 'a_cicuta');
  assert.equal(h.cast('lmb'), true);
  h.step(0.5);
  const after = e.hp;
  assert.ok(after < 1e6, 'la flecha impacta');
  assert.ok(e._dots?.['a_cicuta:poison'], 'aplica el Veneno (hitDot del núcleo)');
  h.step(4.2);
  assert.ok(e.hp < after, 'el Veneno sigue haciendo daño');
  assert.ok(!e._dots?.['a_cicuta:poison'], 'el Veneno dura 4 s');
  console.log('Flecha de Cicuta: impacto + Veneno 4 s ✓');
}

// Flecha Perforante: atraviesa, cuesta 26, sin enfriamiento (solo GCD/bloqueo)
{
  const h = mk();
  const e1 = h.enemy({ hp: 1e6, pos: [0, 0, 3] }), e2 = h.enemy({ hp: 1e6, pos: [0, 0, 6] });
  h.aim(0, 4); h.setSlot('rmb', 'flecha_perforante');
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(mp0 - h.p.mp, 26, 'cuesta 26 de Energía');
  assert.equal(h.p.cds.flecha_perforante, 0, 'sin enfriamiento');
  h.step(1);
  assert.ok(e1.hp < 1e6 && e2.hp < 1e6, 'atraviesa a los dos');
  assert.equal(h.cast('rmb'), true, 'se puede relanzar en cuanto pasa el bloqueo');
  console.log('Flecha Perforante: perfora, 26 de Energía, sin enfriamiento ✓');
}

// Flecha Múltiple: 5 flechas en 50°
{
  const h = mk();
  h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.aim(0, 4); h.setSlot('rmb', 'flecha_multiple');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.g.projectiles.length, 5, 'cinco flechas');
  const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
  assert.ok(Math.abs(Math.max(...ang) - Math.min(...ang) - 0.872) < 0.01, 'abanico de 50°');
  console.log('Flecha Múltiple: 5 flechas en abanico de 50° ✓');
}

// Lluvia de Flechas: aviso 0,3 s y 4 oleadas en 1,5 s
{
  const h = mk();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 6] });
  const c = countHits(e, 'lluvia_flechas');
  h.aim(0, 6); h.setSlot('k2', 'lluvia_flechas');
  assert.equal(h.cast('k2'), true, 'gastadora en la ranura flexible 2');
  assert.equal(h.p.cds.lluvia_flechas, 4, 'enfriamiento 4 s');
  h.step(0.25);
  assert.equal(c.n, 0, 'aún es la telegrafía');
  h.step(1.4);
  assert.equal(c.n, 4, `4 oleadas (${c.n})`);
  console.log('Lluvia de Flechas: telegrafía y 4 oleadas sincronizadas ✓');
}

// Paso Veloz: rueda 6 m hacia el cursor y +20 % de velocidad de ataque
{
  const h = mk();
  h.aim(10, 0); h.setSlot('k1', 'a_paso');
  const t0 = h.p.stats.atkTime;
  assert.equal(h.cast('k1'), true);
  h.step(0.3);
  assert.ok(Math.abs(h.p.pos.x - 6) < 1e-6 && Math.abs(h.p.pos.z) < 1e-6, `rueda 6 m (x=${h.p.pos.x})`);
  assert.ok(h.p.buffs.some(b => b.id === 'a_paso'), 'buff de velocidad de ataque');
  assert.ok(h.p.stats.atkTime < t0, 'dispara más rápido');
  assert.equal(h.p.gcdT, 0, 'la movilidad no usa GCD');
  h.g.input.keyDir = { x: 0, z: -1 };
  h.p.cds.a_paso = 0;
  assert.equal(h.cast('k1'), true);
  h.g.input.keyDir = null;                       // (si no, el héroe además camina)
  h.step(0.3);
  assert.ok(Math.abs(h.p.pos.z + 6) < 1e-6 && Math.abs(h.p.pos.x - 6) < 1e-6, `con dirección de movimiento rueda hacia ella (${h.p.pos.x}, ${h.p.pos.z})`);
  console.log('Paso Veloz: 6 m en la dirección de movimiento y +20 % de vel. de ataque ✓');
}

// Agilidad: velocidad + inmune a ralentizaciones mientras dura
{
  const h = mk();
  h.setSlot('k1', 'agilidad');
  const spd0 = h.p.stats.spd;
  assert.equal(h.cast('k1'), true);
  assert.ok(h.p.stats.spd > spd0, 'más velocidad de movimiento');
  h.p.slowT = 3;
  h.step(0.2);
  assert.equal(h.p.slowT, 0, 'inmune a ralentizaciones');
  h.step(6.2);
  assert.ok(!h.p.buffs.some(b => b.id === 'agilidad'), 'dura 6 s');
  h.p.slowT = 3;
  h.step(0.3);
  assert.ok(h.p.slowT > 2, 'al terminar vuelve a poder ralentizarse');
  console.log('Agilidad: +30 % vel., +15 % vel. de ataque e inmunidad a ralentizaciones 6 s ✓');
}

// Red de Caza: inmoviliza 1,5 s en 2,5 m (2e; jefes, menos)
{
  const h = mk();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 7] });
  const far = h.enemy({ hp: 1e6, pos: [5, 0, 7] });
  const boss = h.enemy({ hp: 1e6, pos: [1, 0, 7], boss: true });
  h.aim(0, 7); h.setSlot('k2', 'a_red');
  const mp0 = h.p.mp;
  assert.equal(h.cast('k2'), true);
  assert.equal(mp0 - h.p.mp, 10, 'cuesta 10');
  h.step(0.4);
  assert.ok(e.rootT > 1.0, `inmoviliza (${e.rootT})`);
  // Paso 2c.0: a los jefes el control no los inmoviliza: suma stagger (15 por s)
  assert.ok(boss.rootT === 0 && boss.stagger > 0, 'al jefe no lo inmoviliza: suma stagger');
  assert.equal(far.rootT, 0, 'solo dentro de la red');
  assert.equal(e.hp, 1e6, 'no hace daño');
  console.log('Red de Caza: inmoviliza 1,5 s en área a distancia ✓');
}

// Bomba de Humo (zona genérica del núcleo): −50 % de daño dentro (2e) (allyDr) y la
// mitad de los proyectiles enemigos que te alcanzan fallan (projMissPct en Projectile)
{
  const h = mk(20);
  h.setSlot('k2', 'a_humo');
  const ciego = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }), lejos = h.enemy({ hp: 1e6, pos: [9, 0, 0] });
  assert.equal(h.cast('k2'), true);
  h.step(0.15);
  // Paso 2e: CEGUERA — los enemigos dentro del humo hacen −blindPct (30 %) de daño
  assert.ok(Math.abs(ciego.outDmgMul() - (1 - S('a_humo').blindPct / 100)) < 1e-9, `ceguera dentro (×${ciego.outDmgMul()})`);
  assert.equal(lejos.outDmgMul(), 1, 'fuera del humo no ciega');
  const want = Math.round(50 * resolveSkill(h.p, S('a_humo')).buffMul);   // 50 a rango 1 (+6 %/rango)
  assert.equal(h.p.zoneDefense().dr, want, `dentro: −${want} % de daño recibido`);
  assert.equal(h.p.projMissChance(), 50, 'dentro: 50 % de fallo de proyectiles enemigos');
  // el −50 % se nota en el daño recibido (mitigación en capas)
  const hp0 = h.p.hp; h.p.takeDamage(100, 1); const inSmoke = hp0 - h.p.hp;
  // proyectiles enemigos que vienen hacia el héroe: ≈50 % fallan y siguen de largo
  let hits = 0;
  const orig = h.p.takeDamage.bind(h.p);
  h.p.takeDamage = (a, l, o) => { hits++; return orig(a, l, o); };
  const N = 60;
  for (let i = 0; i < N; i++) {
    const a = i / N * Math.PI * 2;
    h.g.projectiles.push(new Projectile(h.g, { from: new THREE.Vector3(Math.sin(a) * 2, 1, Math.cos(a) * 2),
      to: new THREE.Vector3(0, 1, 0), speed: 8, range: 6, dmg: 1, friendly: false }));
  }
  h.step(0.4);
  assert.ok(hits > N * 0.25 && hits < N * 0.75, `≈50 % fallan (${N - hits}/${N})`);
  h.p.takeDamage = orig;
  h.p.pos.set(10, 0, 0);
  h.step(0.1);
  assert.equal(h.p.zoneDefense().dr, 0, 'fuera del humo no protege');
  assert.equal(h.p.projMissChance(), 0);
  h.p.hp = h.p.stats.maxHP;
  const hp1 = h.p.hp; h.p.takeDamage(100, 1); const outSmoke = hp1 - h.p.hp;
  assert.ok(inSmoke < outSmoke * 0.75, `dentro se recibe menos daño (${inSmoke} vs ${outSmoke})`);
  console.log('Bomba de Humo: −50 % de daño dentro, ≈50 % de fallo de proyectiles enemigos y ceguera del 30 % ✓');
}

// Diluvio de Saetas: windup + telegrafía y 8 oleadas en 4 s
{
  const h = mk(20);
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  const c = countHits(e, 'a_u_diluvio');
  h.aim(0, 6); h.setSlot('k4', 'a_u_diluvio');
  assert.equal(h.cast('k4'), true);
  h.step(0.4);
  assert.equal(c.n, 0, 'windup + telegrafía');
  h.step(4.3);
  assert.equal(c.n, 8, `8 oleadas (${c.n})`);
  assert.equal(h.p.cds.a_u_diluvio > 45, true, 'enfriamiento 50 s');
  console.log('Diluvio de Saetas: 8 oleadas en 4 s ✓');
}

// Tiro Celestial: 3 disparos reutilizando la tecla; enfriamiento desde el primero
{
  const h = mk(20);
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  const c = countHits(e, 'a_u_celeste');
  h.aim(0, 6); h.setSlot('k4', 'a_u_celeste');
  for (let i = 0; i < 3; i++) {
    assert.equal(h.cast('k4'), true, `disparo ${i + 1}`);
    h.step(0.8);
  }
  assert.equal(c.n, 3, `3 haces (${c.n})`);
  assert.ok(h.p.cds.a_u_celeste > 45 && h.p.cds.a_u_celeste < 50, `enfriamiento restante desde el primero (${h.p.cds.a_u_celeste})`);
  assert.equal(h.cast('k4'), false, 'sin un cuarto disparo');
  // ventana: si no se usan los 3, a los 8 s entra en enfriamiento
  const h2 = mk(20);
  h2.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h2.aim(0, 6); h2.setSlot('k4', 'a_u_celeste');
  assert.equal(h2.cast('k4'), true);
  h2.step(1);
  assert.ok(h2.p.cds.a_u_celeste === 0, 'la tecla queda lista para el segundo');
  h2.step(7.5);
  assert.ok(h2.p.cds.a_u_celeste > 40, 'ventana de 8 s agotada → enfriamiento');
  console.log('Tiro Celestial: 3 disparos a voluntad en 8 s y enfriamiento desde el primero ✓');
}

// Cerco de Zarzas: cruzarlo inmoviliza; dentro, Veneno y Debilidad +15 %
{
  const h = mk(20);
  const inside = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  const runner = h.enemy({ hp: 1e6, pos: [9, 0, 0] });
  h.setSlot('k4', 'a_u_zarzas');
  assert.equal(h.cast('k4'), true);
  h.step(0.3);
  assert.equal(inside.rootT, 0, 'estar dentro no inmoviliza');
  assert.ok(inside.weaknessPct() >= 15, 'Debilidad +15 % dentro');
  assert.equal(runner.weaknessPct(), 0, 'fuera no');
  runner.pos.set(6, 0, 0);                         // cruza el anillo
  h.step(0.2);
  assert.ok(runner.rootT > 1, `cruzarlo inmoviliza 1,5 s (${runner.rootT})`);
  h.step(1.5);
  assert.ok(inside.hp < 1e6, 'Veneno dentro del cerco');
  h.step(7);
  assert.ok(!(h.g.fields || []).some(f => f.data.skill === 'a_u_zarzas'), 'dura 8 s');
  console.log('Cerco de Zarzas: cruzar inmoviliza, Veneno y Debilidad dentro ✓');
}
console.warn = warn;
assert.deepEqual(warnings, [], 'ningún comportamiento lanzó errores: ' + warnings.join(' | '));

// ------------------------------------------------ 5) VFX / SFX
const SFX_NAMES = new Set(['hit', 'shoot', 'skill', 'dash', 'crit', 'portal', 'trap', 'chain', 'fire', 'ice', 'bolt', 'holy', 'potion', 'equip', 'levelup']);
for (const s of skills) {
  if (s.type === 'weapon') continue;                // el básico de arma usa basicArrow
  const fx = ARQUERA_FX[s.id];
  assert.ok(fx, `${s.id}: tiene VFX`);
  assert.equal(SKILL_FX[s.id], fx, `${s.id}: fx-skills.js fusiona el mapa de la clase`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]], `${s.id}.${k}: preset ${fx[k]}`);
  if (fx.sfx) assert.ok(SFX_NAMES.has(fx.sfx), `${s.id}: sfx ${fx.sfx}`);
}
for (const [name, pr] of Object.entries(ARQUERA_FX_PRESETS)) {
  const n = normalizePreset(pr);
  assert.equal(n.texture, pr.texture, `${name}: textura válida`);
  assert.equal(n.shape, pr.shape, `${name}: forma válida`);
  assert.ok(SKILL_FX_PRESETS[name] === pr, `${name}: se fusiona en SKILL_FX_PRESETS`);
}
console.log('VFX/SFX: cada habilidad con su entrada y presets válidos ✓');

console.log('\n✅ HABILIDADES DE LA ARQUERA OK');
