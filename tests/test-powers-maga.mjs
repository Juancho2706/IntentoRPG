// ============================================================
// PODERES, COMPORTAMIENTOS y CAMPOS de la MAGA — Paso 2 (E2 · KT-maga, 2g)
// ============================================================
// docs/paso2-implementacion.md §2 E2 y docs/paso2g-maga-coherencia.md. Lo que es de cada nodo se
// prueba en tests/test-talentos-maga.mjs; aquí, lo del módulo js/powers-maga.js en sí:
//  (a) cobertura: todo `power` y `grant` de los árboles existe y se puede lanzar (talent-coverage),
//      un poder por nodo, los poderes v1 que 2g retira ya no están, campos y comportamientos propios
//  (b) reglas: definePower rechaza claves desconocidas; ningún poder declara `mult`; sin azar de
//      Math.random, sin setTimeout y sin escribir p.cds en el módulo
//  (c) las tres activas de talento con comportamiento propio (Bloque, Inversión, Contrahechizo)
//  (d) piezas comunes: quemaduras (huecos y relevo), congelaciones por sondeo, repeticiones «solas»
//      con su propia serie, la Barrera reconocida por su fuente y los campos nuevos
//  (e) el astillamiento común (m_shatter, powers-common) que test65 dejó fuera: sigue funcionando
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, SKILL_BEHAVIORS, definePower, firePower, powerState } from '../js/powers.js';
import { magaPowers, magaSkillBehaviors, magaFields, magaGauges } from '../js/powers-maga.js';
import { MAGA_SKILL_BEHAVIORS, magaStorm } from '../js/skills-maga.js';
import { FIELD_DEFS } from '../js/field-entities.js';
import { SKILL_FX } from '../js/fx-skills.js';
import { TALENT_TREES } from '../js/talents.js';
import { CLASSES } from '../js/data.js';

let checks = 0;
const ok = (c, msg) => { assert.ok(c, msg); checks++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); checks++; };
const near = (a, b, tol, msg) => { assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} ≉ ${b} (±${tol})`); checks++; };

// ------------------------------------------------ (a) cobertura
assert.deepEqual(missingFor('maga'), { powers: [], behaviors: [], skills: [] }); checks++;
for (const sk of CLASSES.maga.skills.filter(s => s.kind === 'talent')) ok(SKILL_FX[sk.id], `${sk.id}: VFX/SFX de la activa`);
const P = magaPowers();
// todo poder propio lo lleva un nodo (no hay poderes sueltos) y cada nodo lleva el suyo
{
  const refs = talentRefs('maga').powers;
  for (const id of Object.keys(P)) ok(refs.has(id), `${id}: lo lleva un nodo de talento`);
  const owner = new Map();
  const t = TALENT_TREES.maga;
  for (const tree of [t.cls, ...t.specs, ...t.hero]) {
    for (const n of tree.nodes) {
      for (const fx of n.t === 'c' ? n.opts.map(o => o.fx || {}) : [n.fx || {}]) {
        if (!fx.power) continue;
        const at = `${tree.id || 'clase'}/${n.id}`;
        ok(!owner.has(fx.power), `${fx.power} en dos nodos: ${owner.get(fx.power)} y ${at}`);
        owner.set(fx.power, at);
      }
    }
  }
}
// los poderes v1 que 2g retira (docs/paso2g-maga-coherencia.md §5) ya no existen
for (const id of ['p_nova_solar', 'k_nova_push', 'k_icicle_dart', 'k_frost_armor', 'k_ice_tomb', 'k_shatter_chain', 'k_numb',
  'k_eternal_winter', 'k_ice_age', 'a_orbe_resonante', 'a_clarity', 'a_overvolt', 'a_chain_crit', 'a_arc_charge', 'a_singularity', 'a_manaskin'])
  ok(!POWER_HOOKS[id], `${id}: retirado en 2g`);
// comportamientos: las activas de talento de la clase y (S-maga) los de la Arcanista que tocan sus Cargas o
// necesitan THREE: el Orbe Arcano (con cast), el tic del Haz Concentrado (forja) y el del Desgarro; el resto
// del kit es del catálogo (KA)
const B = magaSkillBehaviors();
assert.deepEqual(Object.keys(B).sort(), ['desgarro_canal', 'm_t_bloque', 'm_t_contrahechizo', 'm_t_inversion', 'orbe_arcano', 'v_haz_concentrado']); checks++;
const TICK_ONLY = new Set(['desgarro_canal', 'v_haz_concentrado']);
for (const id of Object.keys(B)) ok(SKILL_BEHAVIORS[id] && (TICK_ONLY.has(id) ? !B[id].cast && typeof B[id].tick === 'function' : typeof B[id].cast === 'function') && !MAGA_SKILL_BEHAVIORS[id],
  `${id}: registrado, con cast (o solo el tic de un canal), sin chocar con el catálogo`);
const F = magaFields();
assert.deepEqual(Object.keys(F).sort(), ['a_desgarro_grieta', 'a_grieta', 'k_suelo', 'm_grieta', 'm_imagen', 'm_runa_escarcha', 'm_runa_escrita', 'm_sello', 'p_crater', 'p_muro_fuego'].sort()); checks++;
for (const k of Object.keys(F)) ok(FIELD_DEFS[k], `campo ${k} registrado`);
assert.deepEqual(magaGauges(), {}, 'ningún indicador nuevo: los tres son de js/mech-maga.js'); checks++;
console.log(`✓ cobertura: ${Object.keys(P).length} poderes (uno por nodo), ${Object.keys(B).length} comportamientos y ${Object.keys(F).length} campos; los v1 retirados`);

// ------------------------------------------------ (b) reglas
assert.throws(() => definePower('t_maga_mal', { onHitt() {} }), /clave desconocida/); checks++;
for (const [id, d] of Object.entries(P)) ok(!d.mult, `${id}: sin mult`);
{
  const src = readFileSync(new URL('../js/powers-maga.js', import.meta.url), 'utf8').replace(/\/\/.*$/gm, '');
  ok(!/Math\.random\s*\(/.test(src), 'sin Math.random (la simulación usa p.combatRng)');
  ok(!/setTimeout\s*\(/.test(src), 'sin setTimeout (planificador por ticks)');
  ok(!/\.cds\s*(\[[^\]]+\]|\.\w+)\s*(=(?!=)|\+=|-=)/.test(src), 'sin escribir p.cds (g.reduceCooldown)');
  ok(!/powers\.has\(/.test(src), 'sin powers.has (hasPower)');
  // cola W2d: el control solo por Enemy.applyCC/clearCC (Ruptura ya no escribe stunT/frozenT) y el
  // canal en curso solo por g.channelInfo (no por el estado interno g._channel)
  ok(!/\.(stunT|frozenT|rootT|slowT|fearT)\s*(=(?!=)|\+=|-=)/.test(src), 'sin escribir controles a mano (applyCC / clearCC)');
  ok(!/\._channel\b/.test(src), 'sin leer g._channel (g.channelInfo)');
  // las repeticiones van por g.castEcho (o, las de un canal, por un haz propio): ni la ranura del
  // jugador (castSkillSlot con potencia) ni su mira (g.input.mouseWorld) prestadas
  ok(!/castSkillSlot\s*\(/.test(src), 'sin castSkillSlot (repeticiones por g.castEcho)');
  ok(!/mouseWorld\s*=(?!=)/.test(src), 'sin escribir la mira del jugador (castEcho con at)');
}
console.log('✓ reglas: claves, sin mult, sin Math.random, setTimeout, p.cds, controles a mano, g._channel ni la ranura o la mira prestadas');

// ------------------------------------------------ utilidades
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Bastón de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
function H(opts = {}) {
  const h = makeHarness({ classId: 'maga', seed: 7, level: 70, ...opts });
  h.g.fields = h.g.fields || [];
  h.p.equipment.weapon = { ...WEAPON };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  return h;
}
const cls = (ranks, choice = {}) => H({ talents: { cls: ranks, choice } });
const castAt = (h, slot, id, x, z, sec = 0.5) => { h.setSlot(slot, id); h.aim(x, z); h.p.cds[id] = 0; const r = h.cast(slot); h.step(sec); return r; };

// ------------------------------------------------ (c) activas de talento (c11A, c17A, c22A)
{ // Contrahechizo: interrumpe y silencia 3 s; a los jefes, Quebranto; sin objetivo no gasta el enfriamiento
  const h = cls({ c22: 1 }, { c22: 'A' });
  const e = h.enemy({ hp: 1e5, pos: [6, 0, 0] });
  let ran = false;
  e.beginCast('invocar', 2, () => { ran = true; });
  ok(castAt(h, 'k2', 'm_t_contrahechizo', 6, 0, 0.1), 'Contrahechizo: se lanza');
  ok(!e.casting && e.silenceT > 2.5, 'Contrahechizo: interrumpe y silencia 3 s');
  h.step(2.5); ok(!ran, 'Contrahechizo: el lanzamiento interrumpido no sale');
  const b = cls({ c22: 1 }, { c22: 'A' });
  const boss = b.enemy({ hp: 1e6, boss: true, pos: [5, 0, 0] });
  castAt(b, 'k2', 'm_t_contrahechizo', 5, 0, 0.1);
  ok(boss.stagger > 0, 'Contrahechizo: al jefe le llena Quebranto');
  const n = cls({ c22: 1 }, { c22: 'A' });
  castAt(n, 'k2', 'm_t_contrahechizo', 5, 0, 0.1);
  eq(n.p.cds.m_t_contrahechizo || 0, 0, 'Contrahechizo: sin objetivo no gasta el enfriamiento');
}
{ // Inversión del Tiempo: vuelves a la vida y al lugar de hace 5 s (graba desde que la conoces)
  const h = cls({ c17: 1 }, { c17: 'A' });
  castAt(h, 'k2', 'm_t_inversion', 2, 0, 0.1);
  eq(h.p.cds.m_t_inversion || 0, 0, 'Inversión: sin historial no gasta el enfriamiento');
  h.tick(2);
  h.p.pos.set(6, 0, 0); h.p.hp = h.p.stats.maxHP * 0.3;
  h.tick(4.5);
  ok(castAt(h, 'k2', 'm_t_inversion', 2, 0, 0.1), 'Inversión: se lanza');
  ok(h.p.pos.x < 0.5 && h.p.hp > h.p.stats.maxHP * 0.9, 'Inversión: vuelve a la posición y la vida de hace 5 s');
  ok(h.p.cds.m_t_inversion > 50, 'Inversión: enfriamiento de 60 s');
  ok(h.p._mgRewind.hist.length <= 40, 'Inversión: historial acotado (10 s)');
}
{ // Bloque de Hielo: inmune 4 s sin moverte ni atacar; la esquiva lo rompe antes
  const h = cls({ c11: 1 }, { c11: 'A' });
  const e = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  ok(castAt(h, 'k2', 'm_t_bloque', 2, 0, 0.1), 'Bloque: se lanza');
  ok(h.p.invulnT > 3.5, 'Bloque: inmune 4 s');
  const hp = h.p.hp;
  h.p.takeDamage(500, 1, { source: e });
  eq(h.p.hp, hp, 'Bloque: no recibe daño');
  const x0 = h.p.pos.x;
  h.p.moveTarget = h.p.pos.clone().setX(x0 + 5); h.step(0.5);
  ok(Math.abs(h.p.pos.x - x0) < 1e-6 && h.p.moveMulProduct() === 0, 'Bloque: no puede moverse (multiplicador de movimiento 0)');
  h.setSlot('rmb', 'bola_fuego'); h.aim(3, 0);
  eq(h.cast('rmb'), false, 'Bloque: no puede atacar');
  h.step(3.6);
  ok(!(h.p.castLock > 0) && h.p.moveMulProduct() === 1, 'Bloque: al terminar vuelve a actuar y a moverse');
  h.p.moveTarget = h.p.pos.clone().setX(h.p.pos.x + 5); h.step(0.3);
  ok(h.p.pos.x > x0 + 0.5, 'Bloque: después, camina');
  castAt(h, 'k2', 'm_t_bloque', 2, 0, 0.1);
  h.p.dodge(); h.step(0.1);
  ok(!h.p._mgBlock && !(h.p.invulnT > 0) && h.p.moveMulProduct() === 1, 'Bloque: la esquiva rompe el hielo antes (y te deja moverte)');
}
console.log('✓ activas de talento: Contrahechizo, Inversión del Tiempo y Bloque de Hielo');

// ------------------------------------------------ (d) piezas comunes
{ // quemaduras: una por enemigo; la nueva sustituye a la anterior si es más fuerte
  const h = H({ spec: 'piromante' });
  const e = h.enemy({ hp: 1e9 });
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  h.tick(2.05);
  h.hit(e, { elem: 'fire', skill: 'bola_fuego', dealt: 1000 });
  eq(h.g.dotsOf(e, 'burn').length, 1, 'quemadura: una por enemigo (no se apila)');
  near(h.g.dotRemaining(e, 'burn'), 600, 1, 'quemadura: la nueva sustituye a la que se apagaba');
  ok(h.g.dotsOf(e, 'burn')[0].source === 'p_ignicion:burn', 'quemadura: fuente p_ignicion:burn (API de DoT)');
}
{ // congelaciones: cada poder que reacciona «al congelar» ve UNA vez cada congelación (10 Hz)
  const h = H({ spec: 'crionte', talents: { specRanks: { i15: 1, i22: 1 }, choice: { i15: 'B' } } });
  const e = h.enemy({ hp: 1e9, pos: [1, 0, 0] }), n = h.enemy({ hp: 1e9, pos: [2.5, 0, 0] });
  e.applyCC('freeze', 2, { src: h.p });
  h.tick(0.5);
  eq(h.gaugeValue('escarcha', n), 1, 'congelar: Glaciar lo ve una vez (no en cada sondeo)');
  eq(h.p.shields.length, 1, 'congelar: el Cristal Protector, una vez');
}
{ // repetición «sola» (Ventisca Viva, g.castEcho de la cola W2d): va en su propia serie; la de tu
  // último lanzamiento queda igual, sin tocar la barra ni pasar por una ranura
  const h = H({ spec: 'crionte', talents: { specRanks: { i10: 1, i7: 2 }, choice: { i10: 'A' } } });   // Tormenta de 10 s
  const out = [], slots = [];
  const orig = h.g.castEcho.bind(h.g), origSlot = h.g.castSkillSlot.bind(h.g);
  h.g.castEcho = (p, id, opts, legacy) => { const r = orig(p, id, opts, legacy); out.push({ id, r, origin: opts?.origin || null }); return r; };
  h.g.castSkillSlot = (slot, mult = 0) => { if (mult > 0) slots.push(slot); return origSlot(slot, mult); };
  // tu última Nova ya gastó 2 de sus 3 repeticiones (Archimaga, Gran Grimorio…)
  h.p.skState.nova_hielo = { ...(h.p.skState.nova_hielo || {}), echo: { seq: 7, n: 2 } };
  // sin la Nova en la barra
  for (const k of Object.keys(h.p.hotbar)) if (h.p.hotbar[k] === 'nova_hielo') h.p.hotbar[k] = null;
  const bar = { ...h.p.hotbar };
  castAt(h, 'k4', 'm_u_tormenta', 0, 0, 0.05);
  h.p.cds.m_u_tormenta = 0;
  h.tick(10.5);
  ok(out.filter(x => x.id === 'nova_hielo' && x.r).length === 4, 'Ventisca Viva: salen las 4 Novas (más que el tope de 3 repeticiones de un lanzamiento)');
  ok(out.every(x => x.origin), 'Ventisca Viva: cada Nova con su origen (el centro de la Tormenta)');
  eq(slots.length, 0, 'Ventisca Viva: sin repeticiones por ranura (castEcho, no castSkillSlot)');
  ok(!magaStorm(h.p), 'la Tormenta acabó');
  assert.deepEqual(h.p.skState.nova_hielo.echo, { seq: 7, n: 2 }, 'Ventisca Viva: no reinicia ni gasta la serie de tu última Nova (el tope sigue valiendo)'); checks++;
  assert.deepEqual(h.p.hotbar, { ...bar, k4: 'm_u_tormenta' }, 'Ventisca Viva: la barra queda como estaba'); checks++;
}
{ // la Barrera se reconoce por la fuente de su escudo (m_barrera); Barrera Resonante anota su máximo
  const h = cls({ c19: 1 });
  castAt(h, 'k2', 'm_barrera', 0, 0, 0.1);
  const s = h.p.shields.find(x => x.src === 'm_barrera');
  ok(s && s.max === s.amt, 'Barrera Resonante: guarda lo que absorbía al ponerla');
  h.p.addShield(50, 5, 'otro');
  const e = h.enemy({ hp: 1e9 });
  s.amt -= 10; h.p.mp = 0;
  h.hit(e, { skill: 'm_dardo' });
  ok(h.p.mp === 2 && s.amt === s.max, 'Barrera Resonante: recarga la Barrera (no otro escudo)');
}
{ // campos nuevos: Cráter (sin daño propio), Suelo Helado (capas) y grieta arcana (daño de campo)
  const h = H({ spec: 'crionte' });
  const e = h.enemy({ hp: 1e9, pos: [1, 0, 0] });
  h.g.spawnField('k_suelo', { pos: { x: 0, z: 0 }, radius: 3, dur: 2, owner: h.p, data: {} });
  h.tick(2.1);
  ok(h.gaugeValue('escarcha', e) === 2 && !h.g.fields.some(f => f.kind === 'k_suelo' && !f.dead), 'Suelo Helado: 1 capa por segundo y se apaga');
  const a = H({ spec: 'arcanista' }), t = a.enemy({ hp: 1e9, pos: [1, 0, 0] });
  const hp = t.hp;
  a.g.spawnField('a_grieta', { pos: { x: 1, z: 0 }, radius: 1.6, dur: 1, owner: a.p, data: { dps: 100, skill: 'm_u_desgarro' } });
  a.tick(1.05);
  eq(hp - t.hp, 100, 'grieta arcana: 100 por segundo, como daño de campo');
  const c = H({ spec: 'piromante' }), ce = c.enemy({ hp: 1e9, pos: [1, 0, 0] });
  c.g.spawnField('p_crater', { pos: { x: 1, z: 0 }, radius: 3, dur: 1, owner: c.p, data: {} });
  c.tick(1.05);
  eq(ce.hp, 1e9, 'Cráter: no daña por sí mismo (lo usa el poder p_crater)');
}
console.log('✓ piezas comunes: quemaduras, congelaciones, repeticiones solas, Barrera y campos nuevos');

// ------------------------------------------------ (e) astillamiento común (m_shatter, powers-common)
{
  const h = H({ spec: 'crionte' });
  h.addPowers('m_shatter');
  const low = h.enemy({ hp: 1000, pos: [2, 0, 0] }), boss = h.enemy({ hp: 1000, boss: true, pos: [3, 0, 0] });
  const warm = h.enemy({ hp: 1000, pos: [4, 0, 0] });
  for (const e of [low, boss, warm]) e.hp = 100;                     // por debajo del 15 %
  low.applyCC('freeze', 2, { src: h.p });
  for (const e of [low, boss, warm]) e.takeDamage(1, false, { skill: 'k_lanza', elem: 'frost' });
  ok(!low.alive, 'm_shatter: un Congelado por debajo del 15 % se hace añicos');
  ok(boss.alive && warm.alive, 'm_shatter: ni a un jefe ni a uno sin congelar');
}
console.log(`\n✅ PODERES DE LA MAGA (2g): ${checks} comprobaciones`);
