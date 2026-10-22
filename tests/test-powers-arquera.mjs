// ============================================================
// Paso 2 (E2, KT-arquera) — PODERES, COMPORTAMIENTOS y CAMPOS de la ARQUERA (js/powers-arquera.js)
// ============================================================
// Los casos nodo a nodo viven en tests/test-talentos-arquera.mjs. Aquí:
// (a) cobertura: todo power/grant de los árboles existe y todo el kit se puede lanzar
// (b) registro: cada poder propio en un nodo (ninguno huérfano ni en dos nodos), con nombre y
//     descripción, sin `mult`; comportamientos con cast; campos registrados; VFX de las activas
// (c) retirados (docs/paso2g-arquera.md §11.1): ningún nodo ni poder propio los usa
// (d) reglas del código: sin powers.has, sin p.cds escrito, sin Math.random, sin setTimeout,
//     sin nodeRank/ownRank; mech-arquera.js sin imports
// (e) combate de prueba de las 12 builds (nivel 100, talentos reales): 25 s con la barra entera,
//     sin avisos de ganchos rotos, cada habilidad de la barra pega y la mecánica se usa
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { missingFor, talentRefs } from './helpers/talent-coverage.mjs';
import { POWER_HOOKS, SKILL_BEHAVIORS, definePower } from '../js/powers.js';
import { arqueraPowers, arqueraSkillBehaviors, arqueraFields } from '../js/powers-arquera.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import { CLASSES } from '../js/data.js';
import { ARQUERA_TALENTS, ARQUERA_TALENT_SKILLS } from '../js/talents-arquera.js';
import { FIELD_DEFS } from '../js/field-entities.js';
import { SKILL_FX } from '../js/fx-skills.js';

// los ganchos rotos se avisan con console.warn (firePower/canal): ninguno debe fallar
const warnings = [];
const warn0 = console.warn, err0 = console.error;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); };
console.error = (...a) => { warnings.push(a.map(String).join(' ')); };

let checks = 0;
const ok = (c, m) => { assert.ok(c, m); checks++; };
const eq = (a, b, m) => { assert.equal(a, b, m); checks++; };
const SK = id => CLASSES.arquera.skills.find(s => s.id === id);
const OWN = arqueraPowers();
const SRC = readFileSync(new URL('../js/powers-arquera.js', import.meta.url), 'utf8');
const MECH = readFileSync(new URL('../js/mech-arquera.js', import.meta.url), 'utf8');
// sin comentarios (también con finales de línea CRLF: el checkout de Windows con core.autocrlf)
const code = s => s.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n');

// ------------------------------------------------ (a) cobertura
assert.deepEqual(missingFor('arquera'), { powers: [], behaviors: [], skills: [] }); checks++;
for (const id of ARQUERA_TALENT_SKILLS) ok(SK(id)?.kind === 'talent' || SK(id), `activa de talento ${id} en el catálogo`);

// ------------------------------------------------ (b) registro
assert.throws(() => definePower('arq_mal', { onHitt() {} }), /clave desconocida/); checks++;
{
  // un poder por nodo (ni en dos nodos ni en dos opciones) y ninguno propio sin nodo
  const owner = new Map();
  const trees = [['cls', ARQUERA_TALENTS.cls.nodes], ...ARQUERA_TALENTS.specs.map(s => [s.id, s.nodes]), ...ARQUERA_TALENTS.hero.map(t => [t.id, t.nodes])];
  for (const [tree, nodes] of trees) for (const n of nodes) {
    const fxs = n.t === 'c' ? n.opts.map(o => [`${n.id}${o.k}`, o.fx || {}]) : [[n.id, n.fx || {}]];
    for (const [where, fx] of fxs) {
      if (!fx.power) continue;
      ok(!owner.has(fx.power), `${fx.power}: en ${owner.get(fx.power)} y en ${tree}/${where} (un poder por nodo)`);
      owner.set(fx.power, `${tree}/${where}`);
      ok(OWN[fx.power], `${fx.power} (${tree}/${where}) es de powers-arquera.js`);
    }
  }
  for (const id of Object.keys(OWN)) ok(owner.has(id), `${id}: lo lleva un nodo (sin poderes huérfanos)`);
  // prefijos: clase a_, especializaciones t_/f_/m_, héroe q_/w_/y_ (test65a)
  const PREFIX = { cls: 'a_', tiradora: 't_', francotiradora: 'f_', montaraz: 'm_', h1: 'q_', h2: 'w_', h3: 'y_' };
  for (const [id, where] of owner) ok(id.startsWith(PREFIX[where.split('/')[0]]), `${id}: prefijo de su árbol (${where})`);
}
for (const [id, d] of Object.entries(OWN)) {
  ok(!('mult' in d), `${id}: sin mult (los multiplicadores van por combat-math)`);
  eq(POWER_HOOKS[id]?.name, d.name, `${id} registrado`);
  ok(typeof d.name === 'string' && d.name.length >= 3 && d.name.length <= 32, `${id}: nombre corto`);
  ok(typeof d.desc === 'string' && d.desc.length >= 12 && d.desc.length <= 120 && /\.$/.test(d.desc), `${id}: descripción de una frase (${d.desc?.length})`);
  ok(!/\b(tv|proc|icd|coef|onHit|stack)\b/i.test(d.desc), `${id}: descripción sin jerga`);
}
for (const id of Object.keys(arqueraSkillBehaviors())) ok(SKILL_BEHAVIORS[id]?.cast, `${id}: comportamiento con cast`);
for (const kind of Object.keys(arqueraFields())) ok(FIELD_DEFS[kind], `campo ${kind} registrado`);
for (const s of CLASSES.arquera.skills.filter(x => x.kind === 'talent')) ok(SKILL_FX[s.id], `${s.id}: VFX/SFX`);

// ------------------------------------------------ (c) retirados (§11.1)
{
  const RETIRED = ['a_tailwind', 't_viento_cola', 't_corona', 't_rebote', 't_slipstream', 't_infinite', 'm_deadeye', 'f_aliento_cazador',
    'f_herida_abierta', 'f_acechador', 'm_hunt', 'm_abrojos', 'm_cepo_doble', 'm_cepo_hierro', 'm_mina', 'm_lazo', 'm_ponzona', 'm_warden',
    'm_extratrap', 't_andanada_impulsiva', 't_galechain', 't_eyestorm', 'f_overpen', 'f_patience', 'f_impossible', 'f_weakspot',
    'm_greathunt', 'm_thornweb'];
  const refs = talentRefs('arquera').powers;
  for (const id of RETIRED) {
    ok(!OWN[id], `${id}: retirado de powers-arquera.js`);
    ok(!refs.has(id), `${id}: ningún nodo lo usa`);
  }
  // m_deadeye y m_hunt también salieron de powers-common.js (E5)
  ok(!POWER_HOOKS.m_deadeye && !POWER_HOOKS.m_hunt, 'm_deadeye y m_hunt ya no están registrados');
  ok(!['t_galechain', 'f_weakspot', 'm_thornweb'].some(id => SRC.includes(`'${id}'`)), 'sin ids viejos en el código');
}

// ------------------------------------------------ (d) reglas del código
{
  eq(code('a // powers.has(x)\r\nb /* p.cds = 1 */\r\n'), 'a \nb \n', 'code() quita los comentarios también con CRLF');
  const src = code(SRC), mech = code(MECH);
  ok(!/powers\.has\(/.test(src + mech), 'sin powers.has( (hasPower)');
  ok(!/\.cds\s*(\[[^\]]+\]|\.[A-Za-z_$][\w$]*)?\s*(?:[-+*/]?=)(?!=)/.test(src + mech), 'sin escribir p.cds (g.reduceCooldown)');
  ok(!/Math\.random/.test(src + mech), 'sin Math.random (azar con rng.js)');
  ok(!/setTimeout|setInterval/.test(src + mech), 'sin setTimeout (retardos con timers.js)');
  ok(!/\b(nodeRank|ownRank)\b/.test(src + mech), 'sin nodeRank/ownRank (powerRank del nodo)');
  ok(!/^\s*import\b/m.test(MECH), 'mech-arquera.js es hoja (sin imports)');
  ok(!/from '\.\/skill-resolve\.js'/.test(SRC), 'powers-arquera.js no importa skill-resolve.js (ciclo con data.js)');
}

// ------------------------------------------------ (e) combate de prueba de las 12 builds
// barra por especialización para las builds que no traen la suya
const BAR = {
  tiradora: { lmb: 'a_disparo', rmb: 'flecha_multiple', k1: 'a_v_carrera', k2: 'flecha_perforante', k3: 'a_t_andanada', k4: 'a_u_diluvio' },
  francotiradora: { lmb: 'a_disparo', rmb: 'a_f_rastreador', k1: 'a_paso', k2: 'a_f_rodilla', k3: 'a_t_apuntado', k4: 'a_u_celeste' },
  montaraz: { lmb: 'a_disparo', rmb: 'a_m_detonante', k1: 'a_m_acecho', k2: 'a_humo', k3: 'a_t_cepo', k4: 'a_u_zarzas' },
};
const MECHANIC = { tiradora: 'impulso', francotiradora: 'concentracion', montaraz: 'coto' };
// cuánto mantener: tensados en su ventana dorada, canal 2 s; el resto, un toque
const HOLD = { a_t_apuntado: 1.25, a_u_celeste: 0.65, a_disparo: 0.9, a_v_carrera: 2 };
definePower('test_arq_lanza', { priority: -9, onCast(g, p, c) { const s = p.__cast || (p.__cast = new Set()); s.add(c.sk?.id || (c.weapon ? 'a_disparo' : null)); } });

function fight(key) {
  const b = ARQUERA_TALENTS.builds[key];
  const h = makeHarness({ classId: 'arquera', level: 100, seed: 5, spec: b.sp, build: key, powers: ['test_arq_lanza'] });
  const p = h.p, g = h.g;
  const bar = { ...(b.bar || BAR[b.sp]) };
  for (const [slot, id] of Object.entries(bar)) {
    ok(SK(id) && isKnown(p, SK(id)), `${key}: ${id} se conoce (barra)`);
    h.setSlot(slot, id);
  }
  const dealt = {};
  let rr = 0;
  const spawn = (rank = null, hp = 4e4) => {
    const a = (rr++ * 2.399) % (2 * Math.PI), r = 4 + (rr % 4);
    const e = h.enemy({ hp, rank, boss: rank === 'boss', pos: [p.pos.x + Math.sin(a) * r, 0, p.pos.z + Math.cos(a) * r] });
    if (rank === 'boss') e.def.rank = null;
    const td = e.takeDamage.bind(e);
    e.takeDamage = (n, crit = false, opts = {}) => { const k = opts.skill || '?'; dealt[k] = (dealt[k] || 0) + (Number.isFinite(n) ? n : NaN); return td(n, crit, opts); };
    return e;
  };
  for (let i = 0; i < 6; i++) spawn();
  spawn('elite', 3e5);
  spawn('boss', 2e6);
  h.control();
  let maxGauge = 0, t = 0;
  const order = ['k4', 'k3', 'k2', 'rmb', 'k1', 'lmb'];
  while (t < 25) {
    // la Tiradora corre en círculo; las demás, quietas (Concentración) o recolocándose
    g.input.keyDir = b.sp === 'tiradora' ? { x: Math.cos(t * 0.8), z: Math.sin(t * 0.8) } : null;
    const near = g.nearestEnemy(14);
    if (near) h.aim(near.pos.x, near.pos.z);
    // primero lo que aún no se lanzó; con coste, solo con Energía de sobra (el básico la genera)
    const fresh = order.filter(sl => !p.__cast?.has(bar[sl]));
    for (const slot of [...fresh, ...order.filter(sl => !fresh.includes(sl))]) {
      const id = bar[slot], pr = resolveSkill(p, SK(id));
      if ((p.cds?.[id] || 0) > 0 || p.mp < (pr?.cost || 0) || g._channel || g._charging) continue;
      if (pr?.cost > 0 && !fresh.includes(slot) && p.mp < p.stats.maxMP * 0.6) continue;
      // los cepos, uno sí y otro no, a 3 m detrás (para tenerlos armados, como en la partida)
      if (id === 'a_t_cepo' && (p.__cepos = (p.__cepos || 0) + 1) % 2) h.aim(p.pos.x - 3, p.pos.z + ((p.__cepos % 4) - 1.5));
      if (HOLD[id] || pr?.charge) { const s = HOLD[id] || 0.6; h.hold(slot, s); t += s; }
      else { h.press(slot); h.step(0.05); h.release(slot); t += 0.05; }
      break;
    }
    h.step(0.1); t += 0.1;
    maxGauge = Math.max(maxGauge, h.gaugeValue(MECHANIC[b.sp]) || 0);
    for (const e of g.enemies) if (!e.alive && !e.__re) { e.__re = true; spawn(); }
  }
  g.input.keyDir = null;
  for (const id of Object.values(bar)) ok(p.__cast?.has(id), `${key}: ${id} se lanza`);
  const own = new Set(Object.values(bar));
  for (const id of own) if (SK(id)?.coef > 0 || ['a_disparo', 'a_t_cepo'].includes(id)) ok((dealt[id] || 0) > 0, `${key}: ${id} hace daño (${Math.round(dealt[id] || 0)})`);
  ok(Object.values(dealt).every(Number.isFinite), `${key}: ningún golpe NaN`);
  ok(Number.isFinite(p.hp) && Number.isFinite(p.mp) && Object.values(p.stats).every(v => typeof v !== 'number' || Number.isFinite(v)), `${key}: stats finitos`);
  ok(maxGauge > 0, `${key}: la mecánica (${MECHANIC[b.sp]}) se usa (${maxGauge})`);
  return { dealt, maxGauge };
}
const res = {};
for (const key of Object.keys(ARQUERA_TALENTS.builds)) res[key] = fight(key);
// cada especialización llega a lo grande de su mecánica en alguna build
ok(Object.entries(res).some(([k, r]) => ARQUERA_TALENTS.builds[k].sp === 'tiradora' && r.maxGauge >= 80), 'Tiradora: el Impulso llega al Vendaval');
ok(Object.entries(res).some(([k, r]) => ARQUERA_TALENTS.builds[k].sp === 'francotiradora' && r.maxGauge >= 80), 'Francotiradora: la Concentración llega a la Calma');
ok(Object.entries(res).some(([k, r]) => ARQUERA_TALENTS.builds[k].sp === 'montaraz' && r.maxGauge >= 2), 'Montaraz: el Coto junta trampas');

console.warn = warn0; console.error = err0;
assert.deepEqual(warnings, [], 'ningún poder ni comportamiento lanzó errores: ' + warnings.join(' | '));
console.log(`\n✅ PODERES DE LA ARQUERA OK · ${Object.keys(OWN).length} poderes · ${Object.keys(res).length} builds en combate · ${checks} comprobaciones`);
