// Paso 2 (2g, KA1) — catálogo 2g de la ARQUERA (docs/paso2g-arquera.md §5–§9, docs/paso2-implementacion.md §3.5–§3.6)
//  1) formato: 23 habilidades válidas (v2, sin avisos), kit base Nv1–8, kits por especialización
//     (10/12/14/15), 6 activas de talento solo en la ranura 2 (G2), retiradas fuera, CATALOG_V = 2
//  2) verbos por especialización (G17): ≥ 3 y el principal de cada una no lo comparte otra
//  3) Energía, recargas y suelo de las definitivas · resolveSkill por nivel
//  4) barras: SPEC_BAR y FALLBACK_BAR válidas; al elegir especialización a Nv15 se llenan 3 y 4
//  5) comportamientos con el arnés (canal de lanzamiento REAL), sin errores
//  6) migración v4 → v5 con las tablas legadas de la Arquera
//  7) VFX/SFX y D2 (nadie escribe p.cds en este catálogo)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, SPEC_BAR, FALLBACK_BAR, CATALOG_V } from '../js/data.js';
import { validateSkillDef, defaultSlots, skillVerbs, SLOT_KEYS, TAGS } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill, fitsSlot, rankBase, isKnown } from '../js/skill-resolve.js';
import { rankCoef } from '../js/combat-math.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { SFX_TONES } from '../js/sfx.js';
import { normalizePreset } from '../js/particles.js';
import { talentMethods } from '../js/game-talents.js';
import * as S from '../js/save-schema.js';
import { ARQUERA_SKILLS, ARQUERA_SKILL_BEHAVIORS, ARQUERA_SPEC_BAR, ARQUERA_FALLBACK_BAR,
  ARQUERA_CATALOG_V } from '../js/skills-arquera.js';
import { ARQUERA_FX, ARQUERA_FX_PRESETS } from '../js/fx-skills-arquera.js';
import { ARQUERA_TALENT_SKILLS } from '../js/talents-arquera.js';
import { makeHarness } from './helpers/power-harness.mjs';

const skills = CLASSES.arquera.skills;
const S_ = id => skills.find(s => s.id === id);

// ------------------------------------------------ 1) formato y catálogo
const BASE = { a_disparo: 1, flecha_perforante: 2, a_paso: 4, a_humo: 6, lluvia_flechas: 8 };
const KITS = {
  tiradora: { a_t_andanada: 10, a_v_carrera: 12, flecha_multiple: 14, a_u_diluvio: 15 },
  francotiradora: { a_t_apuntado: 10, a_f_rodilla: 12, a_f_rastreador: 14, a_u_celeste: 15 },
  montaraz: { a_t_cepo: 10, a_m_acecho: 12, a_m_detonante: 14, a_u_zarzas: 15 },
};
const ACTIVES = { a_t_camuflaje: 21, agilidad: 27, a_t_bengala: 31, a_h_torbellino: 72, a_h_puntas: 72, a_h_halcon: 72 };
const RETIRED = ['a_disperso', 'a_cicuta', 'a_red', 'a_t_voltereta', 'a_t_conmocion', 'a_t_silencio', 'a_t_vision',
  'a_t_disuasorio', 'a_t_arpon', 'a_t_senuelo', 'a_t_danza', 'a_t_salto'];
const ALL = { ...BASE, ...KITS.tiradora, ...KITS.francotiradora, ...KITS.montaraz, ...ACTIVES };

assert.equal(ARQUERA_CATALOG_V, 2, 'catálogo 2g');
assert.equal(CATALOG_V.arquera, 2, 'data.js lo ve en v2');
assert.equal(ARQUERA_SKILLS.length, 23, '23 habilidades: 5 de base, 12 de kits y 6 activas');
assert.deepEqual(skills.map(s => s.id), ARQUERA_SKILLS.map(s => s.id), 'CLASSES sale del catálogo, en su orden (D29: las activas al final)');
assert.deepEqual(skills.map(s => s.id).sort(), Object.keys(ALL).sort(), 'ids del catálogo 2g');
for (const id of RETIRED) assert.ok(!S_(id), `${id}: retirada (§11.1)`);
assert.deepEqual([...ARQUERA_TALENT_SKILLS].sort(), Object.keys(ACTIVES).sort(), 'las 6 activas de talento coinciden con la lista del árbol');
for (const s of skills) {
  const warnings = [];
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS, v2: true, warnings }), [], s.id);
  assert.deepEqual(warnings, [], `${s.id}: sin claves desconocidas`);
  assert.equal(s.req, ALL[s.id], `${s.id}: nivel del catálogo 2g`);
  assert.ok(typeof s.line === 'string' && s.line.length > 20 && s.line.length <= 120, `${s.id}: línea del libro (≤ 120)`);
  assert.ok(s.desc.length > 30 && /\d/.test(s.desc), `${s.id}: descripción con números`);
  for (const t of s.tags) assert.ok(TAGS.has(t), `${s.id}: tag ${t}`);
  // ranuras: exactamente las de su categoría
  const want = defaultSlots(s.cat, s.tags);
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), want.includes(slot), `${s.id} en ${slot}`);
  // comportamientos: los del catálogo son de este archivo; el único ajeno es el de Camuflaje (árbol)
  if (s.behavior) assert.ok(ARQUERA_SKILL_BEHAVIORS[s.behavior] || s.behavior === 'a_t_camuflaje', `${s.id}: comportamiento ${s.behavior}`);
}
// kit base: sin especialización y sin activas
for (const id of Object.keys(BASE)) assert.ok(!S_(id).spec && S_(id).kind !== 'talent', `${id}: kit base`);
// kits: insignia (3), movilidad o utilidad, principal y definitiva de su especialización
for (const [spec, kit] of Object.entries(KITS)) {
  const ids = Object.keys(kit);
  for (const id of ids) assert.equal(S_(id).spec, spec, `${id}: kit de ${spec}`);
  const [ins, mov, main, ult] = ids.map(S_);
  assert.ok(fitsSlot(ins, 'k3') && ins.cat === 'spec', `${spec}: insignia en la 3`);
  assert.ok(['movement', 'utility'].includes(mov.cat), `${spec}: movilidad o utilidad`);
  assert.equal(main.cat, 'spender', `${spec}: principal`);
  assert.equal(ult.cat, 'ultimate', `${spec}: definitiva`);
}
// G2: las 6 activas de talento solo en la ranura 2, defensa o utilidad, sin especialización
for (const id of Object.keys(ACTIVES)) {
  const s = S_(id);
  assert.equal(s.kind, 'talent', `${id}: activa de talento`);
  assert.deepEqual(SLOT_KEYS.filter(k => fitsSlot(s, k)), ['k2'], `${id}: solo la ranura 2 (G2)`);
  assert.ok(['defense', 'utility'].includes(s.cat) && !s.spec, `${id}: defensa o utilidad, sin kit`);
}
// D2: cargas y relanzamientos con las claves del motor (nada de window/shots/charges a mano)
assert.equal(S_('a_t_cepo').charges, 2, 'Trampa de Cepo: 2 cargas');
assert.deepEqual(S_('a_t_andanada').recast, { n: 2, win: 2, cdFrom: 'first' }, 'Andanada: relanzar en 2 s');
assert.deepEqual(S_('a_u_celeste').recast, { n: 3, win: 8, cdFrom: 'first' }, 'Tiro Celestial: 3 haces en 8 s');
for (const s of skills) for (const k of ['window', 'shots', 'recastGap', 'crossRoot', 'armT', 'maxArmed']) assert.ok(!(k in s), `${s.id}: clave v1 ${k}`);
console.log('Formato: 23 habilidades v2, kits 10/12/14/15, activas solo en la 2 (G2) y retiradas fuera ✓');

// ------------------------------------------------ 2) verbos por especialización (G17)
// verbos derivados de la definición (skillVerbs) + los de la Arquera que no deriva el motor
const verbsOf = s => {
  const v = new Set(skillVerbs(s));
  if (s.type === 'channel' && (s.moveMul || 1) > 1 && s.autoShot) v.add('kite');     // moverse disparando
  if (s.mark) v.add('mark');
  if (s.trap?.lure) v.add('lure');
  if (s.at === 'ownField') v.add('ownField');
  return v;
};
const MAIN = { tiradora: 'kite', francotiradora: 'charge', montaraz: 'trap' };
const specVerbs = Object.fromEntries(Object.entries(KITS).map(([sp, kit]) => [sp, new Set(Object.keys(kit).flatMap(id => [...verbsOf(S_(id))]))]));
for (const [sp, verbs] of Object.entries(specVerbs)) {
  assert.ok(verbs.size >= 3, `${sp}: ≥ 3 verbos (${[...verbs]})`);
  assert.ok(verbs.has(MAIN[sp]), `${sp}: verbo principal ${MAIN[sp]}`);
  for (const [other, ov] of Object.entries(specVerbs)) if (other !== sp) assert.ok(!ov.has(MAIN[sp]), `${MAIN[sp]} es solo de ${sp} (lo tiene ${other})`);
}
assert.equal(new Set(Object.values(MAIN)).size, 3, 'verbo principal distinto en cada especialización');
assert.deepEqual([...specVerbs.tiradora].sort(), ['follow', 'hold', 'kite', 'recast'], 'Tiradora: relanzar, mantener, moverse disparando y zona que te sigue');
assert.deepEqual([...specVerbs.francotiradora].sort(), ['charge', 'mark', 'recast', 'stance'], 'Francotiradora: tensar, postura, Punto Débil (y Celestial se relanza)');
assert.deepEqual([...specVerbs.montaraz].sort(), ['detonate', 'lure', 'ownField', 'trap'], 'Montaraz: trampas que atraen, saltar a ellas y detonar');
console.log('Verbos (G17): ≥ 3 por especialización y principal distinto (kite · charge · trap) ✓');

// ------------------------------------------------ 3) Energía, recargas y resolveSkill
for (const s of skills) {
  if (s.cat === 'basic') { assert.equal(s.gen, 5, `${s.id}: +5 al acertar`); assert.equal(s.cost, 0); }
  if (s.cat === 'spender') {
    assert.ok(s.cost >= 20 && s.cost <= 30, `${s.id}: coste 20–30`);
    assert.equal(s.cd, s.id === 'lluvia_flechas' ? 4 : 0, `${s.id}: sin recarga salvo la Lluvia (4 s)`);
  }
  if (s.cat === 'ultimate') {
    assert.equal(s.cost, 0, `${s.id}: sin coste`);
    assert.ok(s.cd >= 45 && s.cdFloor === 0.7, `${s.id}: recarga ≥ 45 s con suelo del 70 %`);
  }
  if (s.kind === 'talent') assert.equal(s.cost, 0, `${s.id}: sin coste`);
}
assert.deepEqual([S_('a_disparo').coef, S_('flecha_perforante').coef, S_('flecha_perforante').cost, S_('flecha_multiple').coef, S_('flecha_multiple').count],
  [1.0, 2.4, 26, 0.45, 5], 'números del doc (§5, §6)');
assert.equal(+(S_('a_u_diluvio').coef * S_('a_u_diluvio').waves).toFixed(2), 20.4, 'Diluvio: 12 oleadas de 170 % = 2040 %');
assert.deepEqual([S_('a_t_cepo').cd, S_('a_m_acecho').cd, S_('a_u_zarzas').cd], [8, 10, 45], 'recargas del Montaraz');
for (const L of [1, 15, 50]) {
  const h = makeHarness({ classId: 'arquera', level: L });
  for (const s of skills) {
    const prof = resolveSkill(h.p, s);
    const rank = rankBase(L, s.req);
    assert.equal(prof.rank, rank, `${s.id} Nv${L}: rango`);
    assert.ok(Math.abs(prof.coef - (s.coef || 0) * rankCoef(rank)) < 1e-9, `${s.id} Nv${L}: coef × rango`);
    assert.equal(prof.cost, s.cost || 0, `${s.id} Nv${L}: coste`);
    assert.equal(prof.gcd, !['basic', 'movement'].includes(s.cat), `${s.id}: GCD según categoría`);
  }
}
{
  // el kit solo se conoce con su especialización y su nivel; las activas, con su nodo
  const h = makeHarness({ classId: 'arquera', level: 15, spec: 'montaraz' });
  assert.ok(isKnown(h.p, S_('a_t_cepo')) && isKnown(h.p, S_('a_u_zarzas')), 'Montaraz Nv15: su kit');
  assert.ok(!isKnown(h.p, S_('a_t_andanada')) && !isKnown(h.p, S_('a_t_apuntado')), 'sin el kit de las otras');
  assert.ok(!isKnown(h.p, S_('agilidad')), 'Agilidad: solo con su nodo (c17A)');
  h.p.talentExtra.grants.add('agilidad'); h.p.recompute();
  assert.ok(isKnown(h.p, S_('agilidad')), 'concedida por el árbol, se conoce');
  const lo = makeHarness({ classId: 'arquera', level: 13, spec: 'montaraz' });
  assert.ok(isKnown(lo.p, S_('a_m_acecho')) && !isKnown(lo.p, S_('a_m_detonante')), 'Nv13: el salto sí, la Detonante (Nv14) no');
}
console.log('Energía, recargas, suelo de definitivas, resolveSkill por nivel y kits por especialización ✓');

// ------------------------------------------------ 4) barras
assert.deepEqual(Object.keys(ARQUERA_SPEC_BAR).sort(), Object.keys(KITS).sort());
for (const [spec, sb] of Object.entries(ARQUERA_SPEC_BAR)) {
  assert.equal(SPEC_BAR[spec], sb, `${spec}: data.js fusiona la barra`);
  for (const slot of SLOT_KEYS) {
    const sk = S_(sb.bar[slot]);
    assert.ok(sk && fitsSlot(sk, slot), `${spec}.${slot}: ${sb.bar[slot]} cabe`);
    assert.ok(!sk.spec || sk.spec === spec, `${spec}.${slot}: del kit base o del suyo`);
    assert.notEqual(sk.kind, 'talent', `${spec}.${slot}: sin activas de talento`);
  }
  assert.equal(sb.bar.k3, Object.keys(KITS[spec])[0], `${spec}: insignia en la 3`);
  assert.equal(sb.bar.k4, Object.keys(KITS[spec])[3], `${spec}: su definitiva en la 4`);
  assert.ok(Object.values(sb.bar).includes(sb.sel), `${spec}: la seleccionada está en la barra`);
  for (const [id, v] of Object.entries(sb.forge || {})) assert.ok(S_(id) && ['i', 'ii'].includes(v), `${spec}: forja ${id}=${v}`);
}
assert.equal(FALLBACK_BAR.arquera, ARQUERA_FALLBACK_BAR);
for (const slot of SLOT_KEYS) {
  const id = ARQUERA_FALLBACK_BAR[slot];
  if (id == null) { assert.ok(['k3', 'k4'].includes(slot), `reserva: solo 3 y 4 vacías (${slot})`); continue; }
  assert.ok(BASE[id] && fitsSlot(S_(id), slot), `reserva.${slot}: ${id} del kit base`);
}
// elegir especialización a Nv15 llena las ranuras 3 y 4 (lo afirma también el humo boot)
for (const spec of Object.keys(KITS)) {
  const h = makeHarness({ classId: 'arquera', level: 15 });
  Object.assign(h.g, talentMethods);
  h.p.hotbar = { ...ARQUERA_FALLBACK_BAR };
  const r = h.g.chooseSpec(spec);
  assert.ok(r?.ok, `${spec}: se elige (${r?.reason || r?.text || ''})`);
  assert.equal(h.p.hotbar.k3, ARQUERA_SPEC_BAR[spec].bar.k3, `${spec}: insignia en la 3 a Nv15`);
  assert.equal(h.p.hotbar.k4, ARQUERA_SPEC_BAR[spec].bar.k4, `${spec}: definitiva en la 4 a Nv15`);
}
console.log('Barras: SPEC_BAR por especialización, reserva del kit base y 3/4 llenas al elegir a Nv15 ✓');

// ------------------------------------------------ 5) comportamientos (arnés)
const warn = console.warn;
const warnings = [];
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
// Estas pruebas miden la definición BASE del catálogo: sin la forja (una entrada vacía por
// habilidad: ni Mejora ni variantes, aunque el nivel las abra). La forja: test-forge-arquera.mjs
const mk = (spec = null, level = 20) => {
  const h = makeHarness({ classId: 'arquera', level, spec });
  h.p.cls = { ...h.p.cls, forge: Object.fromEntries(h.p.cls.skills.map(s => [s.id, { mejora: null, vars: [] }])) };
  h.p.recompute();
  h.p.mp = h.p.stats.maxMP;
  return h;
};
const grant = (h, ...ids) => { for (const id of ids) h.p.talentExtra.grants.add(id); h.p.recompute(); };
// golpes de una habilidad a un enemigo (n, daño total, críticos); `skill` = id o filtro de las opciones del golpe
const track = (e, skill = null) => {
  const out = { n: 0, sum: 0, crit: 0 };
  const match = typeof skill === 'function' ? skill : (o => !skill || o.skill === skill);
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { if (match(o)) { out.n++; out.sum += a; if (c) out.crit++; } return orig(a, c, o); };
  return out;
};
const alive = h => (h.g.fields || []).filter(f => !f.dead);

// Disparo Rápido: flecha del arma y +5 de Energía al acertar
{
  const h = mk();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.aim(0, 4); h.setSlot('lmb', 'a_disparo');
  h.p.mp = 0;
  assert.equal(h.cast('lmb'), true);
  h.step(0.6);
  assert.ok(e.hp < 1e6, 'la flecha impacta');
  assert.ok(h.p.mp >= 5 - 1e-6, `+5 de Energía al acertar (${h.p.mp.toFixed(2)})`);
  console.log('Disparo Rápido: flecha del arma y Energía al acertar ✓');
}

// Flecha Perforante: atraviesa, 26 de Energía, sin recarga
{
  const h = mk();
  const e1 = h.enemy({ hp: 1e6, pos: [0, 0, 3] }), e2 = h.enemy({ hp: 1e6, pos: [0, 0, 6] });
  h.aim(0, 4); h.setSlot('rmb', 'flecha_perforante');
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(mp0 - h.p.mp, 26, 'cuesta 26');
  assert.equal(h.p.cds.flecha_perforante, 0, 'sin recarga');
  h.step(1);
  assert.ok(e1.hp < 1e6 && e2.hp < 1e6, 'atraviesa a los dos');
  console.log('Flecha Perforante: atraviesa, 26 de Energía ✓');
}

// Paso Veloz: rueda 6 m (cursor o dirección de movimiento) y +20 % de velocidad de ataque
{
  const h = mk();
  h.aim(10, 0); h.setSlot('k1', 'a_paso');
  const t0 = h.p.stats.atkTime;
  assert.equal(h.cast('k1'), true);
  h.step(0.3);
  assert.ok(Math.abs(h.p.pos.x - 6) < 1e-6 && Math.abs(h.p.pos.z) < 1e-6, `rueda 6 m (x=${h.p.pos.x})`);
  assert.ok(h.p.stats.atkTime < t0, 'dispara más rápido');
  assert.equal(h.p.gcdT, 0, 'la movilidad no usa GCD');
  assert.equal(h.p.cds.a_paso > 8, true, 'recarga 9 s');
  h.g.reduceCooldown(h.p, 'a_paso', Infinity);
  h.g.input.keyDir = { x: 0, z: -1 };
  assert.equal(h.cast('k1'), true);
  h.g.input.keyDir = null;
  h.step(0.3);
  assert.ok(Math.abs(h.p.pos.z + 6) < 1e-6 && Math.abs(h.p.pos.x - 6) < 1e-6, `rueda hacia donde te mueves (${h.p.pos.x}, ${h.p.pos.z})`);
  console.log('Paso Veloz: 6 m hacia el movimiento o el cursor, +20 % de vel. de ataque ✓');
}

// Bomba de Humo: −50 % dentro, proyectiles que fallan, ceguera −30 % y recarga desde que se disipa
{
  const h = mk();
  h.setSlot('k2', 'a_humo');
  const ciego = h.enemy({ hp: 1e6, pos: [1.5, 0, 0] }), lejos = h.enemy({ hp: 1e6, pos: [9, 0, 0] });
  assert.equal(h.cast('k2'), true);
  h.step(0.15);
  assert.ok(Math.abs(ciego.outDmgMul() - 0.7) < 1e-9, `ceguera dentro (×${ciego.outDmgMul()})`);
  assert.equal(lejos.outDmgMul(), 1, 'fuera no ciega');
  assert.equal(h.p.zoneDefense().dr, Math.round(50 * resolveSkill(h.p, S_('a_humo')).buffMul), 'dentro: −50 % (× rango)');
  assert.equal(h.p.projMissChance(), 50, 'dentro: la mitad de los proyectiles enemigos fallan');
  assert.ok(Math.abs(h.p.cds.a_humo - (16 + 8 - 0.15)) < 0.05, `la recarga (16 s) cuenta desde que se disipa (${h.p.cds.a_humo})`);
  assert.equal(h.g.reduceCooldown(h.p, 'a_humo', 3), 0, 'mientras dura, no se acorta');
  h.step(8);
  assert.equal(alive(h).filter(f => f.data?.skill === 'a_humo').length, 0, 'dura 8 s');
  ciego.outWeak = {};
  h.step(0.5);
  assert.equal(ciego.outDmgMul(), 1, 'disipado, ya no ciega');
  console.log('Bomba de Humo: −50 % dentro, fallo de proyectiles, ceguera −30 % y recarga al disiparse ✓');
}

// Lluvia de Flechas: aviso de 0,3 s y 4 oleadas
{
  const h = mk();
  const e = h.enemy({ hp: 1e6, pos: [0, 0, 6] });
  const c = track(e, 'lluvia_flechas');
  h.aim(0, 6); h.setSlot('k2', 'lluvia_flechas');
  assert.equal(h.cast('k2'), true, 'principal en la ranura flexible 2');
  assert.equal(h.p.cds.lluvia_flechas, 4, 'recarga 4 s');
  h.step(0.25);
  assert.equal(c.n, 0, 'aún es el aviso');
  h.step(1.4);
  assert.equal(c.n, 4, `4 oleadas (${c.n})`);
  console.log('Lluvia de Flechas: aviso y 4 oleadas ✓');
}

// TIRADORA · Andanada: salto atrás disparando 9 flechas (abanico que se cierra con la distancia
// al cursor: 2,5 m a cada lado) y la gemela de la central; relanzar en 2 s salta adelante
{
  const h = mk('tiradora');
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 2] });
  const c = track(e, 'a_t_andanada');
  h.aim(0, 6); h.setSlot('k3', 'a_t_andanada');
  const mp0 = h.p.mp;
  assert.equal(h.cast('k3'), true);
  assert.equal(h.g.projectiles.length, 9, '9 flechas (impar: la central al cursor)');
  const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
  assert.ok(Math.abs(Math.max(...ang) - Math.min(...ang) - 2 * Math.atan(2.5 / 6)) < 0.01, 'cursor a 6 m: abanico de 2·atan(2,5/6) ≈ 45°');
  assert.ok(ang.some(a => Math.abs(a) < 1e-6), 'una flecha va justo al cursor');
  assert.equal(mp0 - h.p.mp, 25, 'cuesta 25');
  h.step(0.4);
  assert.ok(h.p.pos.z < -3.5 && Math.abs(h.p.pos.x) < 1e-6, `salta ~4 m hacia atrás (z=${h.p.pos.z.toFixed(2)})`);
  assert.ok(c.n >= 1 && c.n <= 2, `al enemigo pegado le dan 1–2 flechas (${c.n})`);
  assert.ok(h.p.cds.a_t_andanada > 7, 'la recarga (8 s) cuenta desde el primero');
  const mp1 = h.p.mp;
  assert.equal(h.cast('k3'), true, 'relanzar dentro de 2 s');
  assert.ok(h.p.mp >= mp1, 'el relanzamiento no cuesta');
  h.step(0.4);
  assert.ok(h.p.pos.z > -0.5, `el relanzamiento salta hacia delante (z=${h.p.pos.z.toFixed(2)})`);
  assert.equal(h.cast('k3'), false, 'dos usos por cadena; luego, la recarga');
  // sin relanzar, la ventana se cierra a los 2 s
  const h2 = mk('tiradora');
  h2.aim(0, 6); h2.setSlot('k3', 'a_t_andanada');
  h2.cast('k3'); h2.step(2.3);
  assert.equal(h2.cast('k3'), false, 'pasada la ventana, no se relanza');
  console.log('Andanada: 9 flechas en abanico al cursor (y la gemela), salto atrás y relanzar adelante en 2 s ✓');
}

// TIRADORA · Carrera del Viento: mantener = un 40 % más rápido y disparo solo cada 0,4 s
{
  const h = mk('tiradora');
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
  const c = track(e, 'a_v_carrera');
  h.setSlot('k1', 'a_v_carrera');
  assert.equal(h.press('k1'), true);
  assert.ok(Math.abs(h.p.moveMulProduct() - 1.4) < 1e-9, 'corres un 40 % más rápido');
  h.step(2.05);
  assert.ok(c.n >= 4 && c.n <= 5, `dispara sola cada 0,4 s (${c.n} en 2 s)`);
  h.release('k1');
  h.step(0.1);
  assert.ok(!h.g._channel, 'soltar la corta');
  assert.equal(h.p.moveMulProduct(), 1, 'vuelve a la velocidad normal');
  assert.ok(h.p.cds.a_v_carrera > 7, 'recarga 10 s');
  // sin soltar dura 4 s
  const h2 = mk('tiradora');
  h2.setSlot('k1', 'a_v_carrera'); h2.press('k1'); h2.step(3.9);
  assert.ok(h2.g._channel, 'sigue a los 3,9 s');
  h2.step(0.6);
  assert.ok(!h2.g._channel, 'acaba a los 4 s (los tics del canal caen en el fotograma siguiente)');
  console.log('Carrera del Viento: +40 % de velocidad y disparo automático mientras la mantienes ✓');
}

// TIRADORA · Flecha Múltiple: 5 flechas en 50°
{
  const h = mk('tiradora');
  h.enemy({ hp: 1e6, pos: [0, 0, 4] });
  h.aim(0, 4); h.setSlot('rmb', 'flecha_multiple');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.g.projectiles.length, 5, 'cinco flechas');
  const ang = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z));
  assert.ok(Math.abs(Math.max(...ang) - Math.min(...ang) - 0.872) < 0.01, 'abanico de 50°');
  console.log('Flecha Múltiple: 5 flechas en 50° ✓');
}

// TIRADORA · Diluvio de Saetas: la nube te sigue 6 s (12 oleadas) · suelo de la recarga
{
  const h = mk('tiradora');
  const near = h.enemy({ hp: 1e8, pos: [1, 0, 0] }), far = h.enemy({ hp: 1e8, pos: [12, 0, 0] });
  const a = track(near, 'a_u_diluvio'), b = track(far, 'a_u_diluvio');
  h.setSlot('k4', 'a_u_diluvio');
  assert.equal(h.cast('k4'), true);
  h.step(3.1);
  assert.deepEqual([a.n, b.n], [6, 0], 'cada 0,5 s sobre ti');
  h.p.pos.set(12, 0, 0);
  h.step(3.2);
  assert.deepEqual([a.n, b.n], [6, 6], 'te sigue: las 6 siguientes caen donde estás');
  const cd = h.p.cds.a_u_diluvio;
  assert.equal(h.g.reduceCooldown(h.p, 'a_u_diluvio', 100), 15, 'el suelo del 70 % deja reducir 15 s de 50');
  assert.ok(Math.abs(h.p.cds.a_u_diluvio - (cd - 15)) < 1e-6);
  assert.equal(h.g.reduceCooldown(h.p, 'a_u_diluvio', 5), 0, 'y ni un segundo más');
  console.log('Diluvio de Saetas: 12 oleadas que te siguen y recarga con suelo ✓');
}

// FRANCOTIRADORA · Disparo Apuntado: tensar con ventana dorada (+50 % y crítico), atraviesa
{
  const shot = (T) => {
    const h = mk('francotiradora');
    h.p.stats.critRaw = 0;
    const e = h.enemy({ hp: 1e8, pos: [0, 0, 6] }), e2 = h.enemy({ hp: 1e8, pos: [0, 0, 9] });
    const c = track(e, 'a_t_apuntado'), c2 = track(e2, 'a_t_apuntado');
    h.aim(0, 6); h.setSlot('k3', 'a_t_apuntado');
    const mp0 = h.p.mp;
    assert.equal(h.press('k3'), true);
    assert.ok(h.g._charging, 'tensa mientras se mantiene');
    assert.ok(Math.abs(h.p.moveMulProduct() - 0.6) < 1e-9, 'tensando vas al 60 %');
    assert.equal(h.p.mp, mp0, 'el coste se cobra al soltar');
    h.step(T); h.release('k3'); h.step(0.6);
    return { c, c2, perfect: h.sfxCount('verb_perfect'), cost: mp0 - h.p.mp + 0 };
  };
  const gold = shot(1.25), early = shot(0.5);
  assert.equal(gold.perfect, 1, 'soltar en la ventana dorada es perfecto');
  assert.equal(gold.c.crit, 1, 'el perfecto es crítico seguro');
  assert.equal(early.perfect, 0, 'antes de la ventana, no');
  assert.ok(gold.c.sum > early.c.sum * 2.5, `tensar más pega más (${gold.c.sum} vs ${early.c.sum})`);
  assert.ok(gold.c2.n === 1 && early.c2.n === 1, 'atraviesa la línea');
  console.log('Disparo Apuntado: tensado de 80 a 250 %, ventana dorada con crítico y atraviesa ✓');
}

// FRANCOTIRADORA · Rodilla en Tierra: postura (−50 % de velocidad, tensado +40 %); rodar o pulsar la acaba
{
  const h = mk('francotiradora');
  h.setSlot('k2', 'a_f_rodilla');
  assert.equal(h.cast('k2'), true);
  assert.equal(h.g.stanceOf(h.p, 'a_f_rodilla'), 'rodilla');
  assert.ok(Math.abs(h.p.moveMulProduct() - 0.5) < 1e-9, 'vas un 50 % más lenta');
  assert.equal(h.p.cds.a_f_rodilla, 14, 'recarga 14 s');
  // con la postura, 0,85 s de tensado ya llega a la ventana (0,85 × 1,4 ≈ 1,19 s)
  h.enemy({ hp: 1e8, pos: [0, 0, 6] });
  h.aim(0, 6); h.setSlot('k3', 'a_t_apuntado');
  h.press('k3'); h.step(0.85); h.release('k3'); h.step(0.5);
  assert.equal(h.sfxCount('verb_perfect'), 1, 'de rodillas se tensa un 40 % más rápido');
  h.g.cancelCast('dodge');
  assert.equal(h.g.stanceOf(h.p, 'a_f_rodilla'), null, 'rodar te levanta');
  assert.equal(h.p.moveMulProduct(), 1);
  const h2 = mk('francotiradora');
  h2.setSlot('k2', 'a_f_rodilla'); h2.cast('k2'); h2.step(0.5);
  h2.cast('k2');
  assert.equal(h2.g.stanceOf(h2.p, 'a_f_rodilla'), null, 'pulsar otra vez te levanta');
  const h3 = mk('francotiradora');
  h3.setSlot('k2', 'a_f_rodilla'); h3.cast('k2'); h3.step(7.9);
  assert.equal(h3.g.stanceOf(h3.p, 'a_f_rodilla'), 'rodilla', 'sigue a los 7,9 s');
  h3.step(0.2);
  assert.equal(h3.g.stanceOf(h3.p, 'a_f_rodilla'), null, 'dura 8 s');
  console.log('Rodilla en Tierra: postura lenta que acelera el tensado; rodar o pulsar la acaba ✓');
}

// FRANCOTIRADORA · Tiro Rastreador: Punto Débil → el primer tensado contra él es perfecto
{
  const h = mk('francotiradora');
  const e = h.enemy({ hp: 1e8, pos: [0, 0, 6] });
  h.aim(0, 6); h.setSlot('rmb', 'a_f_rastreador'); h.setSlot('k3', 'a_t_apuntado');
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(mp0 - h.p.mp, 20, 'cuesta 20');
  h.step(0.6);
  assert.ok(e.marks?.a_punto_debil?.t > 7, 'abre el Punto Débil 8 s');
  h.press('k3'); h.step(0.35); h.release('k3'); h.step(0.6);
  assert.equal(h.sfxCount('verb_perfect'), 1, 'un tensado corto contra el Punto Débil sale perfecto');
  assert.ok(!e.marks?.a_punto_debil, 'y lo gasta');
  h.press('k3'); h.step(0.35); h.release('k3'); h.step(0.6);
  assert.equal(h.sfxCount('verb_perfect'), 1, 'el siguiente, ya no');
  console.log('Tiro Rastreador: Punto Débil que regala el primer perfecto ✓');
}

// FRANCOTIRADORA · Tiro Celestial: hasta 3 haces tensados en 8 s; recarga desde el primero
{
  const h = mk('francotiradora');
  const e = h.enemy({ hp: 1e9, pos: [0, 0, 6] });
  const c = track(e, 'a_u_celeste');
  h.aim(0, 6); h.setSlot('k4', 'a_u_celeste');
  for (let i = 0; i < 3; i++) {
    assert.equal(h.press('k4'), true, `haz ${i + 1}`);
    assert.ok(h.g._charging, `el haz ${i + 1} se tensa`);
    h.step(0.6); h.release('k4'); h.step(0.5);
  }
  assert.equal(c.n, 3, `3 haces (${c.n})`);
  assert.ok(h.p.cds.a_u_celeste > 45 && h.p.cds.a_u_celeste < 50, `recarga desde el primero (${h.p.cds.a_u_celeste.toFixed(1)})`);
  assert.equal(h.press('k4'), false, 'sin un cuarto');
  const h2 = mk('francotiradora');
  h2.aim(0, 6); h2.setSlot('k4', 'a_u_celeste');
  h2.press('k4'); h2.step(0.6); h2.release('k4'); h2.step(8.5);
  assert.equal(h2.press('k4'), false, 'pasados 8 s, la ventana se cierra');
  console.log('Tiro Celestial: 3 haces que se tensan en 8 s y recarga desde el primero ✓');
}

// MONTARAZ · Trampa de Cepo: se arma en 0,5 s, inmoviliza 2 s (+ rootAdd), se cierra y queda
// pegada 3,5 s (S-arquera A3), 2 cargas de 8 s, hasta 3
{
  const h = mk('montaraz');
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h.setSlot('k3', 'a_t_cepo'); h.aim(0, 6);
  const mp0 = h.p.mp;
  assert.equal(h.cast('k3'), true);
  assert.equal(mp0 - h.p.mp, 10, 'cuesta 10');
  assert.deepEqual(h.p.skCharges.a_t_cepo, { n: 1, max: 2, nextAt: 8 }, '2 cargas: gasta una');
  h.step(0.3);
  assert.equal(e.rootT || 0, 0, 'antes de 0,5 s no está armada');
  h.step(0.4);
  assert.ok(e.rootT > 1.7 && e.rootT <= 2, `al armarse salta: inmoviliza 2 s (${e.rootT.toFixed(2)})`);
  // cola W2d-B: el Cepo no golpea directo, aplica su hitDot (veneno)
  const cepoDot = h.g.dotsOf(e, 'poison').find(d => d.source === 'a_t_cepo:poison');
  assert.ok(cepoDot && cepoDot.ticks > 0, `y lo envenena (hitDot del Cepo: ${JSON.stringify(cepoDot)})`);
  const shut = alive(h).filter(f => f.kind === 'trampa');
  assert.ok(shut.length === 1 && shut[0].closed?.e === e, 'no se consume: se cierra sobre él');
  const left = shut[0].closed.until - shut[0].age;   // saltó entre los 0,5 y los 0,7 s
  assert.ok(left > 3.25 && left <= 3.5 + 1e-9, `cerrada 3,5 s desde que salta (quedan ${left.toFixed(2)})`);
  e.pos.set(1, 0, 6); h.step(0.1);
  assert.ok(Math.abs(shut[0].pos.x - 1) < 1e-6, 'y va pegada a él');
  h.aim(12, 6);
  assert.equal(h.cast('k3'), true, 'segunda carga');
  h.p.gcdT = 0;
  assert.equal(h.cast('k3'), false, 'sin cargas');
  h.step(shut[0].closed.until - shut[0].age - 0.15);
  assert.ok(!shut[0].dead && shut[0].closed, 'cerrada sigue ahí antes de 3,5 s');
  h.step(0.3);
  assert.ok(shut[0].dead, 'sin detonarla, a los 3,5 s se gasta');
  h.step(7.8 - h.p.simT); h.p.gcdT = 0;
  assert.equal(h.cast('k3'), false, 'antes de 8 s, aún sin cargas');
  h.step(0.3); h.p.gcdT = 0;
  assert.equal(h.cast('k3'), true, 'la carga vuelve en 8 s');
  // rootAdd de los talentos suma sobre los 2 s de la trampa (test72 §2 → aquí)
  const h2 = mk('montaraz');
  h2.p.talentExtra.mods = { a_t_cepo: { rootAdd: 1.5 } }; h2.p.recompute();
  assert.equal(resolveSkill(h2.p, S_('a_t_cepo')).root, 3.5, 'rootAdd suma: 2 + 1,5');
  const e2 = h2.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h2.setSlot('k3', 'a_t_cepo'); h2.aim(0, 6); h2.cast('k3'); h2.step(0.7);
  assert.ok(e2.rootT > 3.2, `inmoviliza 3,5 s (${e2.rootT.toFixed(2)})`);
  // hasta 3 armadas: la cuarta retira la más vieja
  const h3 = mk('montaraz', 40);
  h3.setSlot('k3', 'a_t_cepo');
  for (const x of [0, 3, 6, 9]) {
    h3.aim(x, 6);
    h3.g.reduceCooldown(h3.p, 'a_t_cepo', Infinity);
    h3.p.gcdT = 0;
    assert.equal(h3.cast('k3'), true, `trampa en x=${x}`);
  }
  const traps = alive(h3).filter(f => f.kind === 'trampa');
  assert.equal(traps.length, 3, 'como mucho 3');
  assert.ok(!traps.some(f => Math.abs(f.pos.x) < 0.1), 'cae la más vieja');
  assert.ok(traps.every(f => f.data.lure?.radius === 6), 'atraen a 6 m (Cebo de Caza)');
  console.log('Trampa de Cepo: armado 0,5 s, 2 s (+ rootAdd), cerrada 3,5 s, 2 cargas y 3 armadas ✓');
}

// MONTARAZ · Salto de Acecho: a tu trampa más cercana al cursor y la hace estallar; sin trampas, 6 m
{
  const h = mk('montaraz');
  const e = h.enemy({ hp: 1e7, pos: [30, 0, 0] });
  h.setSlot('k3', 'a_t_cepo'); h.setSlot('k1', 'a_m_acecho');
  h.aim(9, 0); h.cast('k3'); h.step(0.8);
  e.pos.set(9, 0, 1.8);                              // cerca, sin pisarla
  const c = track(e);
  assert.equal(h.cast('k1'), true);
  h.step(0.5);
  assert.ok(Math.abs(h.p.pos.x - 9) < 1e-6, `salta a la trampa (x=${h.p.pos.x.toFixed(2)})`);
  h.step(0.5);
  assert.ok(c.n >= 1, 'al caer la trampa estalla');
  assert.equal(alive(h).filter(f => f.kind === 'trampa').length, 0, 'y se gasta');
  h.g.reduceCooldown(h.p, 'a_m_acecho', Infinity);
  h.aim(-20, 0);
  const x0 = h.p.pos.x;
  assert.equal(h.cast('k1'), true, 'sin trampas también salta');
  h.step(0.6);
  assert.ok(Math.abs(x0 - h.p.pos.x - 6) < 1e-6, `6 m (${(x0 - h.p.pos.x).toFixed(2)})`);
  console.log('Salto de Acecho: salta a tu trampa y la hace estallar; sin trampas, 6 m ✓');
}

// MONTARAZ · Flecha Detonante: estalla en 3 m y hace estallar las trampas que alcanza
{
  const h = mk('montaraz');
  const target = h.enemy({ hp: 1e7, pos: [30, 0, 0] }), side = h.enemy({ hp: 1e7, pos: [30, 0, 5] });
  h.setSlot('k3', 'a_t_cepo'); h.setSlot('rmb', 'a_m_detonante');
  h.aim(0, 8); h.cast('k3'); h.step(0.8);
  target.pos.set(0, 0, 6);                           // a 2 m de la trampa: no la pisa
  side.pos.set(1.6, 0, 7);                           // salpicadura
  const arrow = o => o.skill === 'a_m_detonante' && !o.trap;
  const ct = track(target, arrow), cb = track(target, o => !!o.trap), cs = track(side, arrow);
  h.aim(0, 6);
  const mp0 = h.p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(mp0 - h.p.mp, 24, 'cuesta 24');
  h.step(1.2);
  assert.equal(ct.n, 1, 'impacto directo');
  assert.equal(cs.n, 1, 'estalla en 3 m');
  assert.equal(cb.n, 1, 'y la trampa alcanzada estalla (un estallido por trampa)');
  assert.equal(alive(h).filter(f => f.kind === 'trampa').length, 0, 'la trampa se gasta');
  console.log('Flecha Detonante: estallido de 3 m que detona tus trampas ✓');
}
// MONTARAZ · Flecha Detonante sin blanco: detona también al FINAL de su vuelo (12 m; cola W2d-A) las
// trampas de su radio (3 m), no las de más allá
{
  const h = mk('montaraz');
  const e = h.enemy({ hp: 1e7, pos: [1.9, 0, 13] });  // a 2,15 m de la trampa: no la pisa, el estallido sí le llega
  h.setSlot('k3', 'a_t_cepo'); h.setSlot('rmb', 'a_m_detonante');
  for (const x of [0, 4.5]) {                        // una al final del vuelo y otra a 4,5 m de él
    h.p.pos.set(x, 0, 4); h.aim(x, 12);
    h.g.reduceCooldown(h.p, 'a_t_cepo', Infinity); h.p.gcdT = 0; h.p.mp = h.p.stats.maxMP;
    assert.equal(h.cast('k3'), true, `cepo en (${x}, 12)`);
    h.step(0.8);
  }
  h.p.pos.set(0, 0, 0);
  const [end, beyond] = alive(h).filter(f => f.kind === 'trampa').sort((a, b) => a.pos.x - b.pos.x);
  assert.ok(Math.abs(end.pos.z - 12) < 1e-6 && Math.abs(beyond.pos.x - 4.5) < 1e-6, 'las dos trampas armadas');
  const burst = track(e, o => !!o.trap), arrow = track(e, o => o.skill === 'a_m_detonante' && !o.trap);
  h.aim(0, 12); h.p.gcdT = 0;
  assert.equal(h.cast('rmb'), true);
  h.step(0.4);
  assert.ok(!end.dead && burst.n === 0, 'durante el vuelo, nada');
  h.step(0.8);
  assert.ok(end.dead && burst.n === 1 && arrow.n === 0, `al acabar su vuelo, sin tocar a nadie, la trampa de su radio estalla (${burst.n})`);
  assert.ok(!beyond.dead, 'la de fuera del radio, no');
  console.log('Flecha Detonante: sin blanco, detona al final de su vuelo ✓');
}

// MONTARAZ · Cerco de Zarzas: donde apuntas; cruzarlo inmoviliza, dentro veneno y al cerrarse estalla
{
  const h = mk('montaraz');
  const inside = h.enemy({ hp: 1e7, pos: [0, 0, 8] }), runner = h.enemy({ hp: 1e7, pos: [0, 0, 16] });
  const c = track(inside, 'a_u_zarzas');
  h.aim(0, 8); h.setSlot('k4', 'a_u_zarzas');
  assert.equal(h.cast('k4'), true);
  assert.equal(h.p.cds.a_u_zarzas, 45, 'recarga 45 s');
  const f = alive(h).find(x => x.data?.skill === 'a_u_zarzas');
  assert.ok(f && Math.abs(f.pos.z - 8) < 1e-6 && f.radius === 7, 'anillo de 7 m donde apuntas');
  h.step(0.3);
  assert.equal(inside.rootT || 0, 0, 'estar dentro no inmoviliza');
  runner.pos.set(0, 0, 14);                          // cruza el anillo
  h.step(0.2);
  assert.ok(runner.rootT > 1.2 && runner.rootT <= 1.5, `cruzarlo inmoviliza 1,5 s (${runner.rootT.toFixed(2)})`);
  h.step(2);
  const tick = c.sum / Math.max(1, c.n);
  assert.ok(c.n >= 4, `veneno dentro (${c.n} tics)`);
  const before = c.n, sum0 = c.sum;
  h.step(6);
  assert.equal(alive(h).filter(x => x.data?.skill === 'a_u_zarzas').length, 0, 'dura 8 s');
  const big = c.sum - sum0 - (c.n - before - 1) * tick;
  assert.ok(big > tick * 4, `al cerrarse estalla (≈ 300 %: ${big.toFixed(0)} frente a ${tick.toFixed(0)} por tic)`);
  console.log('Cerco de Zarzas: cruzar inmoviliza, veneno dentro y estallido al cerrarse ✓');
}

// ACTIVAS DE TALENTO (ranura 2)
{
  const h = mk(null, 80);
  for (const id of Object.keys(ACTIVES)) assert.equal(isKnown(h.p, S_(id)), false, `${id}: sin su nodo no se conoce`);
  grant(h, ...Object.keys(ACTIVES));
  for (const id of Object.keys(ACTIVES)) assert.equal(isKnown(h.p, S_(id)), true, `${id}: con su nodo se conoce`);
  // Agilidad: velocidad e inmunidad a ralentizaciones 6 s
  h.setSlot('k2', 'agilidad');
  const spd0 = h.p.stats.spd;
  assert.equal(h.cast('k2'), true);
  assert.ok(h.p.stats.spd > spd0 && h.p.slowImmuneT > 5.9, 'Agilidad: +velocidad e inmune 6 s');
  // Flecha Bengala: dentro, +15 % de daño recibido y −15 % de daño hecho
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 6] }), out = h.enemy({ hp: 1e7, pos: [25, 0, 0] });
  h.aim(0, 6); h.setSlot('k2', 'a_t_bengala'); h.p.gcdT = 0;
  assert.equal(h.cast('k2'), true);
  h.step(0.3);
  assert.equal(e.weaknessPct(), 15, 'dentro reciben +15 %');
  assert.ok(Math.abs(e.outDmgMul() - 0.85) < 1e-9, 'y pegan −15 %');
  assert.deepEqual([out.weaknessPct(), out.outDmgMul()], [0, 1], 'fuera, nada');
  h.step(10);
  assert.equal(alive(h).filter(f => f.data?.skill === 'a_t_bengala').length, 0, 'dura 10 s');
  e.debuffs = {}; e.outWeak = {};
  h.step(0.6);
  assert.deepEqual([e.weaknessPct(), e.outDmgMul()], [0, 1], 'apagada, ya no marca');
  // Torbellino: levanta 1,5 s en 4 m sin daño (a un jefe, Quebranto)
  const m = h.enemy({ hp: 1e7, pos: [0, 0, 3] }), b = h.enemy({ hp: 1e7, pos: [3, 0, 0], boss: true }), lejos = h.enemy({ hp: 1e7, pos: [0, 0, -7] });
  h.setSlot('k2', 'a_h_torbellino'); h.p.gcdT = 0;
  assert.equal(h.cast('k2'), true);
  assert.equal(m.stunT, 1.5, 'levanta 1,5 s');
  assert.ok(b.stagger > 0 && !(b.stunT > 0), 'al jefe le llena Quebranto');
  assert.ok(!(lejos.stunT > 0), 'solo en 4 m');
  assert.equal(m.hp, 1e7, 'sin daño');
  // Desborde de Puntas: estado de 10 s (sus 4 disparos los cuenta el árbol)
  h.setSlot('k2', 'a_h_puntas'); h.p.gcdT = 0;
  assert.equal(h.cast('k2'), true);
  assert.equal(h.p.buffs.find(x => x.id === 'a_h_puntas')?.t, 10, 'Desborde de Puntas 10 s');
  assert.equal(S_('a_h_puntas').count, 4, '4 disparos');
  // Llamada del Halcón: 12 ataques en 6 s, ceguera y 30 de Quebranto a un jefe
  const hb = h.enemy({ hp: 1e7, pos: [0, 0, -12], boss: true });
  const ch = track(hb, 'a_h_halcon');
  h.aim(0, -12); h.setSlot('k2', 'a_h_halcon'); h.p.gcdT = 0;
  const st0 = hb.stagger || 0;
  assert.equal(h.cast('k2'), true);
  h.step(0.3);
  assert.ok(Math.abs(hb.outDmgMul() - 0.7) < 1e-9, 'lo deja ciego (−30 %)');
  assert.ok(Math.abs((hb.stagger - st0) - 30) < 0.5, `30 de Quebranto (${(hb.stagger - st0).toFixed(1)})`);
  h.step(6.2);
  assert.equal(ch.n, 12, `12 ataques (${ch.n})`);
  // si el blanco muere, busca al más cercano
  const h2 = mk(null, 80); grant(h2, 'a_h_halcon');
  const v1 = h2.enemy({ hp: 1, pos: [0, 0, 5] }), v2 = h2.enemy({ hp: 1e7, pos: [2, 0, 0] });
  const c2 = track(v2, 'a_h_halcon');
  h2.aim(0, 5); h2.setSlot('k2', 'a_h_halcon'); h2.cast('k2'); h2.step(2);
  assert.ok(!v1.alive && c2.n >= 2, `muerto el blanco, ataca al más cercano (${c2.n})`);
  // Camuflaje: invisible (comportamiento y crítico, del árbol)
  h.setSlot('k2', 'a_t_camuflaje'); h.p.gcdT = 0;
  assert.equal(h.cast('k2'), true);
  assert.equal(h.p.isInvisible(), true, 'Camuflaje: invisible');
  console.log('Activas de talento: Agilidad, Bengala, Torbellino, Desborde de Puntas, Halcón y Camuflaje ✓');
}
console.warn = warn;
assert.deepEqual(warnings, [], 'ningún comportamiento lanzó errores: ' + warnings.join(' | '));

// ------------------------------------------------ 6) migración v4 → v5 (tablas legadas)
{
  const json = o => JSON.parse(JSON.stringify(o));
  const v4 = (spec, level, hotbar, o = {}) => json({
    saveVersion: 4, classId: 'arquera', level, xp: 100, statPoints: 0, skillPoints: 3, skillSystemV: 5, skillBranches: {}, skillMods: {},
    hotbar: { lmb: null, rmb: null, k1: null, k2: null, k3: null, k4: null, ...hotbar },
    talents: { v: 1, spec, cls: {}, sp: {}, choice: {} }, paragon: { points: 0, nodes: {}, glyphs: {} }, materials: [], supports: {}, knownSupports: [], ...o,
  });
  const mig = d => S.migrateV4toV5(d, { forgeReco: {} });   // solo la tabla legada (la ★ de D3: test-save-2g)
  assert.equal(S.LEGACY_TABLES.arquera.insignia.montaraz, S.V4_INSIGNIA.arquera.montaraz, 'insignia v4');
  // Montaraz: Disperso → Disparo Rápido I; Red de Caza → variante II del cepo (la 2 cae al humo)
  const m = mig(v4('montaraz', 30, { lmb: 'a_disperso', rmb: 'flecha_multiple', k1: 'agilidad', k2: 'a_red', k3: 'a_t_cepo', k4: 'a_u_zarzas' }));
  assert.deepEqual(m.hotbar, { lmb: 'a_disparo', rmb: 'a_m_detonante', k1: 'a_paso', k2: 'a_humo', k3: 'a_t_cepo', k4: 'a_u_zarzas' }, 'barra del Montaraz');
  assert.deepEqual(m.skillForge, { a_disparo: 'i', a_t_cepo: 'ii' }, 'Disperso = I · Red de Caza = Cepo II');
  // Francotiradora: Cicuta → II; Visión Certera → Rodilla en Tierra (no cabe en la 3: la insignia)
  const f = mig(v4('francotiradora', 30, { lmb: 'a_cicuta', rmb: 'flecha_perforante', k1: 'a_t_disuasorio', k2: 'a_t_vision', k3: 'a_t_apuntado', k4: 'a_u_celeste' }));
  assert.deepEqual(f.hotbar, { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_f_rodilla', k3: 'a_t_apuntado', k4: 'a_u_celeste' }, 'barra de la Francotiradora');
  assert.equal(f.skillForge.a_disparo, 'ii', 'Cicuta = II');
  // el Arpón: Flecha de Garfio en el Montaraz; en otra especialización la ranura se vacía
  const a = mig(v4('montaraz', 30, { lmb: 'a_disparo', k2: 'a_t_arpon' }));
  assert.equal(a.hotbar.k2, 'a_m_detonante'); assert.equal(a.skillForge.a_m_detonante, 'ii');
  const a2 = mig(v4('tiradora', 30, { lmb: 'a_disparo', k2: 'a_t_arpon' }));
  assert.equal(a2.hotbar.k2, null); assert.equal(a2.skillForge.a_m_detonante, undefined);
  // la 3.ª rama de v4 → variante por papel; las absorbidas conservan su forma
  const r = mig(v4('tiradora', 30, { lmb: 'a_disparo' }, { skillMods: {
    flecha_perforante: { flecha_perforante_v: 'flecha_perforante_v2' }, a_u_zarzas: { a_u_zarzas_v: 'a_u_zarzas_v2' }, a_cicuta: { a_cicuta_v: 'a_cicuta_v1' } } }));
  assert.equal(r.skillForge.flecha_perforante, 'i', 'Emponzoñar (veneno) → Flecha Explosiva (ÁREA)');
  assert.ok(Object.hasOwn(r.skillForge, 'a_u_zarzas') && r.skillForge.a_u_zarzas === null, 'Tullir: sin variante de control → por elegir');
  assert.equal(r.skillForge.a_disparo, 'ii', 'una rama de Cicuta fija Cicuta (II)');
  // sin especialización (Nv8): todo al kit base
  const lo = mig(v4(null, 8, { lmb: 'a_cicuta', rmb: 'lluvia_flechas', k1: 'agilidad', k2: 'a_red' }));
  assert.deepEqual(lo.hotbar, { lmb: 'a_disparo', rmb: 'lluvia_flechas', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null }, 'Nv8: kit base');
  // idempotente
  assert.deepEqual(mig(json(m)), m, 'dos pasadas = una');
  for (const id of S.LEGACY_TABLES.arquera.removed) assert.ok(!S_(id), `${id}: retirada de verdad`);
  console.log('Migración v4 → v5: barra, absorciones, variantes por papel e idempotencia ✓');
}

// ------------------------------------------------ 7) VFX/SFX y D2
const SFX_NAMES = new Set(Object.keys(SFX_TONES));
for (const s of skills) {
  if (s.type === 'weapon') continue;                // el básico de arma usa basicArrow
  const fx = ARQUERA_FX[s.id];
  assert.ok(fx, `${s.id}: tiene VFX`);
  assert.equal(SKILL_FX[s.id], fx, `${s.id}: fx-skills.js fusiona el mapa de la clase`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]], `${s.id}.${k}: preset ${fx[k]}`);
  assert.ok(SFX_NAMES.has(fx.sfx), `${s.id}: sfx ${fx.sfx}`);
}
for (const id of Object.keys(ARQUERA_FX)) assert.ok(S_(id), `${id}: entrada de VFX de una habilidad que existe`);
for (const [name, pr] of Object.entries(ARQUERA_FX_PRESETS)) {
  const n = normalizePreset(pr);
  assert.equal(n.texture, pr.texture, `${name}: textura válida`);
  assert.equal(n.shape, pr.shape, `${name}: forma válida`);
  assert.ok(SKILL_FX_PRESETS[name] === pr, `${name}: se fusiona en SKILL_FX_PRESETS`);
}
// D2: el catálogo no escribe enfriamientos (las cargas y los relanzamientos son del motor)
const src = readFileSync(new URL('../js/skills-arquera.js', import.meta.url), 'utf8');
assert.ok(!/\.cds\s*(\[[^\]]+\]|\.\w+)\s*(=|\+=|-=)(?!=)/.test(src), 'skills-arquera.js no escribe p.cds');
console.log('VFX/SFX de las 22 habilidades con efecto, presets válidos y sin p.cds ✓');

console.log('\n✅ HABILIDADES DE LA ARQUERA (catálogo 2g) OK');
