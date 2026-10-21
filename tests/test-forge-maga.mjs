// Paso 2 (2f + 2g) — FORJA de la MAGA (KA2): docs/paso2f-habilidades-ux.md §2, docs/paso2g-maga-coherencia.md
// §5 y A.7, docs/paso2-implementacion.md §3.5 y §3.6
//  1) datos: 17 entradas (Mejora + 2 variantes), validateForge sin errores ni avisos (A1), definiciones
//     forjadas válidas en v2, poderes v_* registrados, sin uso muerto y únicos entre clases (A9, D28),
//     VFX de las variantes, sin escribir p.cds (test87)
//  2) forja recomendada: ids del catálogo, nunca apaga el indicador de su especialización (2f §7.7)
//  3) cada Mejora y cada variante con el canal de lanzamiento REAL (efecto observable, A2)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, FORGE_RECO, SKILL_FORGE } from '../js/data.js';
import { validateForge, validateSkillDef, forgeDef, FORGE_LINE_WARN } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS, POWER_HOOKS, firePower } from '../js/powers.js';
import { resolveSkill, isKnown } from '../js/skill-resolve.js';
import * as SK from '../js/skills-maga.js';
import { magaForgePowers } from '../js/powers-forge-maga.js';
import { guerreroForgePowers } from '../js/powers-forge-guerrero.js';
import { arqueraForgePowers } from '../js/powers-forge-arquera.js';
import { MAGA_FORGE_FX } from '../js/fx-skills-maga.js';
import { SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { FIELD_DEFS } from '../js/field-entities.js';
import { TALENT_TREES } from '../js/talents.js';
import { talentMethods } from '../js/game-talents.js';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import { varDe } from '../tools/convert-v2/lib/transformar.mjs';
import { makeHarness } from './helpers/power-harness.mjs';

const SKILLS = CLASSES.maga.skills;
const byId = id => SKILLS.find(s => s.id === id);
const FORGE = SK.MAGA_SKILL_FORGE;
const SPECS = ['piromante', 'crionte', 'arcanista'];
const lost = e => e.maxHP - e.hp;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
// un fallo dentro de un comportamiento o un poder lo traga el canal con console.warn: aquí es un error
const warnings = [];
const warn0 = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); warn0(...a); };
const noWarnings = what => { assert.deepEqual(warnings, [], `${what}: sin errores en el canal ni en los poderes`); warnings.length = 0; };
// golpes que recibe un enemigo: { amt, skill, elem, proc, dot, source }
function spy(e) {
  const log = [];
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { const r = orig(a, c, o); log.push({ amt: r || 0, skill: o.skill || null, elem: o.elem || null, proc: !!o.proc, dot: !!o.dot, source: o.source || null }); return r; };
  return log;
}
const hitsOf = (log, skill) => log.filter(x => x.skill === skill && !x.dot && !x.proc);
// héroe con la forja dada (Nv30: todas las piezas abiertas; Mejora a req+3, variantes a req+6)
function hz({ spec = null, level = 30, forge = {}, powers = [] } = {}) {
  const h = makeHarness({ classId: 'maga', level, spec, powers });
  h.p.skillForge = { ...forge };
  h.p.recompute();
  h.p.mp = h.p.stats.maxMP;
  h.p.stats.critRaw = -1000; h.p.stats.crit = -1000;   // sin críticos: daño comparable
  return h;
}
const profOf = (h, id) => resolveSkill(h.p, byId(id));
const pieces = e => [['m', e.mejora], ['i', e.vars[0]], ['ii', e.vars[1]]];
// arma fija y grande (sin variación ni redondeo apreciable): daños comparables golpe a golpe
const flat = h => { h.p.stats.wMin = h.p.stats.wMax = 1000; return h; };
// efectos que dependen de otro dueño (petición abierta): mientras no llegan, se avisa como
// PENDIENTE; en cuanto el efecto aparece, se exige su valor exacto (ni verde sin efecto ni otro valor)
const PENDING = [];
const pendingOr = (arrived, check, what) => { if (arrived) check(); else PENDING.push(what); };

// ------------------------------------------------ 1) datos (A1, A9, D28)
const withForge = SKILLS.filter(s => s.kind !== 'talent');
assert.equal(withForge.length, 17);
assert.deepEqual(Object.keys(FORGE).sort(), withForge.map(s => s.id).sort(), 'una entrada por habilidad con forja (las activas de talento no tienen)');
assert.equal(CLASSES.maga.forge, FORGE, 'data.js: la forja de la clase');
for (const id of Object.keys(FORGE)) assert.equal(SKILL_FORGE[id], FORGE[id], `${id}: fusionada en SKILL_FORGE`);
const forgePowers = new Set(), forgeBehaviors = new Set();
for (const sk of withForge) {
  const e = FORGE[sk.id];
  const v = validateForge(e, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
  assert.deepEqual(v.errors, [], `${sk.id}: ${v.errors.join(' · ')}`);
  assert.deepEqual(v.warnings, [], `${sk.id}: líneas de más de ${FORGE_LINE_WARN} caracteres`);
  assert.equal(e.mejora.icon, 'forge/mejora');
  for (const [k, piece] of pieces(e)) {
    if (k !== 'm') assert.equal(piece.icon, `forge/v_${piece.id}`, `${piece.id}: icono`);
    if (piece.power) forgePowers.add(piece.power);
    if (piece.behavior) forgeBehaviors.add(piece.behavior);
    // la definición forjada (Mejora + la pieza) sigue siendo una habilidad v2 válida y sin claves sueltas
    const def = forgeDef(sk, e, { mejora: true, variant: k === 'm' ? null : k });
    const { forged, ...plain } = def;          // forged: la marca que pone forgeDef
    assert.equal(forged.varId, k === 'm' ? null : piece.id);
    const w = [];
    assert.deepEqual(validateSkillDef(plain, { behaviors: SKILL_BEHAVIORS, v2: true, warnings: w }), [], `${sk.id}·${k}: definición forjada v2`);
    assert.deepEqual(w, [], `${sk.id}·${k}: claves desconocidas`);
    assert.ok(def.tags.includes(def.elem) && def.tags.includes(def.cat), `${sk.id}·${k}: tags de elemento y categoría`);
  }
}
// poderes: prefijo v_, registrados, los de este archivo y todos en uso; ninguno de otra clase (D28)
const own = magaForgePowers();
assert.deepEqual([...forgePowers].sort(), Object.keys(own).sort(), 'cada poder de powers-forge-maga.js lo usa una variante');
const others = new Set([...Object.keys(guerreroForgePowers()), ...Object.keys(arqueraForgePowers())]);
const ids = JSON.parse(readFileSync(new URL('../tools/convert-v2/out/power-ids.json', import.meta.url), 'utf8'));
for (const cls of ['guerrero', 'arquera']) for (const m of Object.values(ids.clases?.[cls] || {})) for (const id of Object.keys(m)) others.add(id);
for (const id of forgePowers) {
  assert.ok(/^v_[a-z_]+$/.test(id), `${id}: prefijo v_`);
  assert.ok(POWER_HOOKS[id], `${id}: registrado`);
  const hooks = d => Object.keys(d).filter(k => typeof d[k] === 'function').sort();
  assert.deepEqual(hooks(POWER_HOOKS[id]), hooks(own[id]), `${id}: el de powers-forge-maga.js`);
  for (const k of hooks(own[id])) assert.equal(String(POWER_HOOKS[id][k]), String(own[id][k]), `${id}.${k}: el de powers-forge-maga.js`);
  assert.ok(!others.has(id), `${id}: no lo usa otra clase (D28)`);
  assert.ok(!SK.MAGA_SKILL_BEHAVIORS[id], `${id}: ni es un comportamiento`);
}
// comportamientos nuevos de la forja: como mucho 3 por clase (2f §7.2), propios y con cast
assert.ok(forgeBehaviors.size <= 3, 'forja: ≤ 3 comportamientos nuevos');
for (const id of forgeBehaviors) assert.ok(/^v_/.test(id) && SK.MAGA_SKILL_BEHAVIORS[id]?.cast && SKILL_BEHAVIORS[id].cast === SK.MAGA_SKILL_BEHAVIORS[id].cast, `${id}: comportamiento de la forja`);
// VFX de las variantes: ids de variante y presets que existen
const varIds = new Set(Object.values(FORGE).flatMap(e => e.vars.map(v => v.id)));
for (const [id, fx] of Object.entries(MAGA_FORGE_FX)) {
  assert.ok(varIds.has(id), `MAGA_FORGE_FX.${id}: variante de la forja`);
  for (const [k, name] of Object.entries(fx)) assert.ok(['aura', 'impact', 'extra', 'trail'].includes(k) && SKILL_FX_PRESETS[name], `${id}.${k}: preset ${name}`);
}
// test87: ningún archivo de la forja de la Maga escribe p.cds (D2: g.reduceCooldown)
for (const f of ['js/skills-maga.js', 'js/powers-forge-maga.js', 'js/fx-skills-maga.js']) {
  const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  assert.ok(!/\bp\.cds\s*\[[^\]]*\]\s*=(?!=)/.test(src) && !/\bp\.cds\s*=(?!=)/.test(src), `${f}: escribe p.cds`);
  assert.ok(!src.includes('powers.has('), `${f}: powers.has( fuera de powers*.js`);
}
noWarnings('datos');
console.log('Forja de la Maga: 17 entradas válidas, definiciones forjadas v2, poderes v_* propios y únicos, VFX ✓');

// ------------------------------------------------ 2) forja recomendada (2f §7.7)
const RETIRED = ['m_ascua', 'm_toque', 'm_armadura', 'm_onda'];
assert.deepEqual(Object.keys(SK.MAGA_FORGE_RECO).sort(), [...SPECS].sort());
// = la del mockup congelado (A → i, B → ii) con SOLO las 3 sustituciones de la divergencia «reco»
// (tools/convert-v2/divergencias.json): fuera crionte.m_toque; arcanista m_onda → m_parpadeo i y
// m_armadura → m_barrera ii (la forja que el mockup pone en la barra del Arcanista)
{
  const { C } = cargarMockup('maga');
  const want = Object.fromEntries(Object.entries(C.reco).map(([sp, r]) => [sp, Object.fromEntries(Object.entries(r).map(([id, v]) => [id, varDe(v)]))]));
  assert.equal(want.crionte.m_toque, 'i', 'el mockup recomienda Toque Gélido I');
  delete want.crionte.m_toque;
  const arc = want.arcanista;
  assert.deepEqual([arc.m_onda, arc.m_armadura], ['i', 'ii'], 'el mockup recomienda Onda I y Armadura II');
  delete arc.m_onda; delete arc.m_armadura;
  Object.assign(arc, SK.MAGA_SPEC_BAR.arcanista.forge);
  assert.deepEqual(SK.MAGA_SPEC_BAR.arcanista.forge, { m_parpadeo: 'i', m_barrera: 'ii' });
  assert.deepEqual(SK.MAGA_FORGE_RECO, want, 'la del mockup con las 3 sustituciones declaradas, nada más');
  // Piromante: la de A.7 (Dardo I, Bola II, Llamarada II, Meteoro I y Supernova I)
  assert.deepEqual(SK.MAGA_FORGE_RECO.piromante, { m_dardo: 'i', bola_fuego: 'ii', p_llamarada: 'ii', meteoro: 'i', m_u_supernova: 'i' });
}
const specOf = sp => TALENT_TREES.maga.specs.find(s => s.id === sp);
for (const sp of SPECS) {
  const reco = SK.MAGA_FORGE_RECO[sp];
  assert.equal(FORGE_RECO[sp], reco, `${sp}: fusionada en data.FORGE_RECO`);
  const h = hz({ spec: sp, level: 100 });
  for (const [id, v] of Object.entries(reco)) {
    assert.ok(!RETIRED.includes(id) && FORGE[id] && ['i', 'ii'].includes(v), `${sp}: ${id}=${v}`);
    assert.ok(isKnown(h.p, byId(id)), `${sp}: ${id} se conoce con la especialización`);
    // ninguna variante recomendada cambia el elemento a otro que no sea el de la especialización
    const def = forgeDef(byId(id), FORGE[id], { mejora: true, variant: v });
    assert.ok(def.elem === byId(id).elem || def.elem === specOf(sp).elem, `${sp}: ${id}=${v} pasa a ${def.elem}`);
  }
}
// el indicador de cada especialización sigue llenándose con su barra y su forja recomendada: el
// Dardo de Fuego da Calor, el de Hielo pone Escarcha y el Arcano (sin variante) da Cargas
const gaugeWith = (sp, forge) => {
  const h = hz({ spec: sp, forge });
  const e = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
  h.aim(0, 5); h.setSlot('lmb', 'm_dardo');
  assert.equal(h.cast('lmb'), true, `${sp}: el Dardo sale`);
  h.step(0.8);
  return { calor: h.gaugeValue('calor'), escarcha: h.gaugeValue('escarcha', e), cargas: h.gaugeValue('cargas') };
};
const GAUGE = { piromante: 'calor', crionte: 'escarcha', arcanista: 'cargas' };
for (const sp of SPECS) {
  const g = gaugeWith(sp, SK.MAGA_FORGE_RECO[sp]);
  assert.ok(g[GAUGE[sp]] > 0, `${sp}: con la forja recomendada, el Dardo llena ${GAUGE[sp]} (${JSON.stringify(g)})`);
}
// el control: con la Saeta Ígnea el Crionte NO pone Escarcha y con la Gélida el Piromante NO da Calor
assert.equal(gaugeWith('crionte', { m_dardo: 'i' }).escarcha, 0, 'Saeta Ígnea: sin Escarcha');
assert.equal(gaugeWith('piromante', { m_dardo: 'ii' }).calor, 0, 'Saeta Gélida: sin Calor');
// chooseSpec aplica la recomendada SOLO a lo que nunca se forjó (D3)
{
  const h = hz({ level: 30 });
  Object.assign(h.g, talentMethods);
  h.p.skillForge = { nova_hielo: null };
  assert.equal(h.g.chooseSpec('crionte').ok, true);
  assert.equal(h.p.skillForge.m_dardo, 'ii', 'recomendada en el Dardo (nunca forjado)');
  assert.equal(h.p.skillForge.nova_hielo, null, '«sin variante» elegido a propósito: no se toca');
  assert.equal(h.p.skillForge.m_u_tormenta, 'i');
}
noWarnings('recomendada');
console.log('Forja recomendada: ids del catálogo y ninguna apaga el Calor, la Escarcha ni las Cargas ✓');

// ------------------------------------------------ 3) efectos con el canal REAL
// ---- Dardo Arcano (Nv1: Mejora 4, variantes 7) ----
{
  const shoot = (level, forge = {}, spec = null) => {
    const h = hz({ level, forge, spec });
    const shots = [];
    const orig = h.g.spawnProjectile.bind(h.g);
    h.g.spawnProjectile = o => { shots.push(o); return orig(o); };
    const a = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
    const b = h.enemy({ hp: 1e7, pos: [1.2, 0, 5.4] });   // a 1,3 m del impacto
    const far = h.enemy({ hp: 1e7, pos: [3, 0, 5] });
    const la = spy(a), lb = spy(b), lf = spy(far);
    h.aim(0, 5); h.setSlot('lmb', 'm_dardo');
    assert.equal(h.cast('lmb'), true);
    h.step(0.5);
    return { h, shots, a, b, la, lb, lf };
  };
  // Mejora: +40 % de velocidad y +20 % de alcance (en el perfil; el básico de arma aún no lo lee)
  const m0 = shoot(3), m1 = shoot(4);
  assert.equal(m0.shots[0].speed, 13);
  assert.ok(near(m1.shots[0].speed, 13 * 1.4), `Dardo Veloz: ${m1.shots[0].speed}`);
  assert.ok(profOf(m0.h, 'm_dardo').rangeMul === 1 && near(profOf(m1.h, 'm_dardo').rangeMul, 1.2));
  pendingOr(m1.shots[0].range !== m0.shots[0].range,
    () => assert.ok(near(m1.shots[0].range / m0.shots[0].range, 1.2, 0.01), `Dardo Veloz: alcance ${m0.shots[0].range} → ${m1.shots[0].range}`),
    'W2 · Dardo Veloz: el básico de arma no lee prof.rangeMul (alcance del dardo sin el +20 %)');
  // I · Saeta Ígnea: de Fuego y estalla a 1,5 m (30 %); el objetivo no recibe su propio estallido
  const base = shoot(30, { m_dardo: null }), fire = shoot(30, { m_dardo: 'i' });
  assert.ok(base.la.length === 1 && base.lb.length === 0, 'sin variante no estalla');
  assert.equal(fire.la.length, 1, 'el objetivo: solo el impacto');
  assert.equal(fire.la[0].elem, 'fire', 'el Dardo es de Fuego');
  assert.equal(hitsOf(fire.lb, 'm_dardo').length, 1, 'el vecino a 1,3 m recibe un estallido (un golpe, no una cadena)');
  assert.equal(fire.lb[0].elem, 'fire');
  assert.ok(fire.lb[0].source === 'power:v_saeta_ignea' && fire.la[0].source === null, 'el estallido no es un impacto del Dardo (source del poder)');
  assert.equal(fire.lf.length, 0, 'a 3 m, nada');
  const ratio = fire.lb[0].amt / fire.la[0].amt;
  assert.ok(ratio > 0.15 && ratio < 0.5, `estallido ≈ 30/105 del impacto (${ratio.toFixed(2)})`);
  assert.ok(fire.h.p.powers.has('v_saeta_ignea') && !base.h.p.powers.has('v_saeta_ignea'), 'su poder solo con la variante');
  // II · Saeta Gélida: de Hielo, ralentiza 20 % 1,5 s y −10 % de daño
  const ice = shoot(30, { m_dardo: 'ii' });
  assert.equal(ice.la[0].elem, 'frost');
  assert.ok(ice.a.slowT > 1.0 && ice.a.slowT <= 1.5 + 1e-6 && ice.a.slowPct === 20, `ralentiza 20 % 1,5 s (${ice.a.slowT?.toFixed(2)} s, ${ice.a.slowPct} %)`);
  assert.ok(!(base.a.slowT > 0), 'sin variante no ralentiza');
  assert.equal(profOf(ice.h, 'm_dardo').addPct, profOf(base.h, 'm_dardo').addPct - 10);
  noWarnings('Dardo');
  console.log('Dardo Arcano: Dardo Veloz, Saeta Ígnea (Fuego, estallido) y Saeta Gélida (Hielo, ralentiza) ✓');
}

// ---- Bola de Fuego (Nv2: Mejora 5, variantes 8) ----
{
  const bola = (level, forge = {}) => {
    const h = hz({ level, forge });
    const t = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
    const n = h.enemy({ hp: 1e7, pos: [2.7, 0, 6] });
    const back = h.enemy({ hp: 1e7, pos: [0, 0, 9.2] });
    const lt = spy(t), ln = spy(n), lb = spy(back);
    h.aim(0, 6); h.setSlot('rmb', 'bola_fuego');
    assert.equal(h.cast('rmb'), true);
    return { h, t, lt, ln, lb };
  };
  // Mejora: explosión 2 → 2,6 m (el vecino a 2,7 m del impacto entra)
  const b4 = bola(4), b5 = bola(5);
  b4.h.step(1.2); b5.h.step(1.2);
  assert.ok(b4.lt.length === 1 && b4.ln.length === 0, 'Nv4: explosión de 2 m');
  assert.equal(b5.ln.length, 1, 'Núcleo Inestable: explosión de 2,6 m');
  // I · Pirodardo: sin preparación y rápida (22): a los 0,35 s ya impactó; explosión 40 %
  const slow = bola(30, { bola_fuego: null }), fast = bola(30, { bola_fuego: 'i' });
  slow.h.step(0.35); fast.h.step(0.35);
  assert.ok(slow.lt.length === 0 && fast.lt.length === 1, 'Pirodardo: sin los 0,3 s de preparación y más rápida');
  const ps = profOf(slow.h, 'bola_fuego'), pf = profOf(fast.h, 'bola_fuego');
  assert.ok(pf.windup === 0 && ps.windup > 0 && near(pf.splash / ps.splash, 0.4), 'explosión 100 → 40 %');
  // II · Racimo: 3 brasas a 2 m que estallan 0,3 s después (40 %); no al objetivo directo ni en cadena
  const rac = bola(30, { bola_fuego: 'ii' });
  slow.h.step(2); rac.h.step(0.85);
  assert.equal(rac.lb.length, 0, 'aún no estallan');
  rac.h.step(0.4);
  assert.equal(hitsOf(rac.lb, 'bola_fuego').length, 1, 'la brasa de detrás alcanza al que la explosión no llega');
  assert.equal(rac.lb[0].elem, 'fire');
  assert.equal(slow.lb.length, 0, 'sin variante, nada detrás');
  rac.h.step(2);
  assert.equal(rac.lb.length, 1, 'las brasas no sueltan más brasas');
  assert.equal(hitsOf(rac.lt, 'bola_fuego').length, 1, 'el objetivo: solo el impacto');
  const ember = rac.lb[0].amt, direct = rac.lt[0].amt;
  assert.ok(ember / direct > 0.1 && ember / direct < 0.35, `brasa ≈ 40/220 del impacto (${(ember / direct).toFixed(2)})`);
  // las 3 brasas caen en anillo a 2 m del impacto, cada 120° (la primera detrás): un enemigo junto
  // a cada una (a 3,2 m del impacto, fuera de la explosión) recibe UNA brasa
  {
    const h = hz({ forge: { bola_fuego: 'ii' } });
    h.enemy({ hp: 1e7, pos: [0, 0, 6] });
    const ring = [0, 1, 2].map(i => { const a = i * Math.PI * 2 / 3; return h.enemy({ hp: 1e7, pos: [3.2 * Math.sin(a), 0, 6 + 3.2 * Math.cos(a)] }); });
    const logs = ring.map(spy);
    h.aim(0, 6); h.setSlot('rmb', 'bola_fuego');
    assert.equal(h.cast('rmb'), true);
    h.step(2);
    assert.deepEqual(logs.map(l => hitsOf(l, 'bola_fuego').length), [1, 1, 1], 'tres brasas, una a cada uno');
    assert.ok(logs.every(l => l[0].source === 'power:v_racimo'), 'las brasas, con el source del poder');
  }
  noWarnings('Bola de Fuego');
  console.log('Bola de Fuego: Núcleo Inestable, Pirodardo (sin preparación, 40 %) y Racimo (3 brasas) ✓');
}

// ---- Parpadeo (Nv4: Mejora 7, variantes 10) ----
{
  const blink = (level, forge = {}) => {
    const h = hz({ level, forge });
    h.aim(0, 20); h.setSlot('k1', 'm_parpadeo');
    return h;
  };
  const p6 = blink(6), p7 = blink(7);
  p6.cast('k1'); p7.cast('k1');
  assert.ok(p6.p.pos.z > 7.5 && p6.p.pos.z <= 8 && p7.p.pos.z > 9.5 && p7.p.pos.z <= 10, `Salto Largo: 8 → 10 m (${p6.p.pos.z.toFixed(1)} → ${p7.p.pos.z.toFixed(1)})`);
  // I · Doble Parpadeo: 2 cargas de 12 s
  const one = blink(30, { m_parpadeo: null }), two = blink(30, { m_parpadeo: 'i' });
  assert.ok(one.cast('k1') && !one.cast('k1'), 'sin variante: una vez');
  assert.ok(two.cast('k1') && two.cast('k1') && !two.cast('k1'), 'Doble Parpadeo: dos seguidos');
  two.step(12.2, 0.1);
  assert.ok(two.cast('k1') && !two.cast('k1'), 'una carga vuelve a los 12 s');
  // II · Parpadeo Disruptor: al llegar, onda de 4 m (80 %) que empuja 3 m y aturde 0,5 s
  const run = forge => {
    const h = blink(30, forge);
    h.aim(0, 6);
    const e = h.enemy({ hp: 1e7, pos: [1, 0, 6.5] });
    const boss = h.enemy({ hp: 1e7, pos: [-1.5, 0, 6], boss: true });
    const far = h.enemy({ hp: 1e7, pos: [0, 0, 13] });
    // la llegada pasa por g._arrive (plantado, provocación, detonación y estela de talentos o forja)
    const arrivals = [];
    const arrive0 = h.g._arrive.bind(h.g);
    h.g._arrive = (ctx, from) => { arrivals.push({ skill: ctx.sk.id, from: from.clone(), at: h.p.pos.clone() }); return arrive0(ctx, from); };
    assert.equal(h.cast('k1'), true);
    return { h, e, boss, far, arrivals };
  };
  const plain = run({ m_parpadeo: null }), wave = run({ m_parpadeo: 'ii' });
  assert.ok(near(plain.h.p.pos.z, wave.h.p.pos.z, 0.01) && wave.h.p.pos.z > 5.5, 'se teletransporta igual');
  for (const x of [plain, wave]) {
    assert.equal(x.arrivals.length, 1, 'una llegada');
    const [a] = x.arrivals;
    assert.ok(a.skill === 'm_parpadeo' && a.from.length() < 1e-6 && near(a.at.z, x.h.p.pos.z), 'desde donde salió hasta donde llega');
  }
  assert.ok(lost(plain.e) === 0 && !(plain.e.stunT > 0), 'el Parpadeo no golpea');
  const arrive = wave.h.p.pos;
  assert.ok(lost(wave.e) > 0 && wave.e.stunT > 0.4, `golpea y aturde (${wave.e.stunT?.toFixed(2)} s)`);
  assert.ok(Math.hypot(wave.e.pos.x - arrive.x, wave.e.pos.z - arrive.z) > 3, 'lo empuja lejos de donde llegas');
  assert.ok(wave.boss.stagger > 0 && near(wave.boss.pos.x, -1.5) && lost(wave.boss) > 0, 'al jefe no lo mueve: Quebranto');
  assert.equal(lost(wave.far), 0, 'fuera de 4 m, nada');
  noWarnings('Parpadeo');
  console.log('Parpadeo: Salto Largo, Doble Parpadeo (2 cargas) y Parpadeo Disruptor (onda al llegar) ✓');
}

// ---- Barrera de Maná (Nv6: Mejora 9, variantes 12) ----
{
  const bar = (level, forge = {}) => { const h = hz({ level, forge }); h.setSlot('k2', 'm_barrera'); assert.equal(h.cast('k2'), true); return h; };
  assert.ok(near(bar(8).p.shields[0].t, 8) && near(bar(9).p.shields[0].t, 10), 'Burbuja Estable: 8 → 10 s');
  // I · Barrera Gélida: de Hielo; al ROMPERSE congela 1,5 s a 3 m (caducar no cuenta)
  const gel = bar(30, { m_barrera: 'i' });
  assert.equal(profOf(gel, 'm_barrera').elem, 'frost');
  const close = gel.enemy({ hp: 1e7, pos: [2, 0, 0] });
  const away = gel.enemy({ hp: 1e7, pos: [5, 0, 0] });
  gel.p.takeDamage(Math.round(gel.p.shieldTotal() * 0.5), 1, { element: 'fire' });
  assert.ok(gel.p.shieldTotal() > 0 && !(close.frozenT > 0), 'mientras aguanta, nada');
  gel.p.takeDamage(Math.round(gel.p.shieldTotal() * 3), 1, { element: 'fire' });
  assert.ok(gel.p.alive && gel.p.shieldTotal() === 0, 'rota');
  assert.ok(close.frozenT > 1.2 && !(away.frozenT > 0), `congela a 3 m (${close.frozenT?.toFixed(2)} s)`);
  const exp = bar(30, { m_barrera: 'i' });
  const e2 = exp.enemy({ hp: 1e7, pos: [2, 0, 0] });
  exp.step(10.5, 0.1);
  assert.ok(exp.p.shieldTotal() === 0 && !(e2.frozenT > 0), 'si caduca, no congela');
  const plain = bar(30, { m_barrera: null });
  const e3 = plain.enemy({ hp: 1e7, pos: [2, 0, 0] });
  plain.p.takeDamage(Math.round(plain.p.shieldTotal() * 3), 1, { element: 'fire' });
  assert.ok(!(e3.frozenT > 0), 'sin variante, romperla no congela');
  // II · Coraza Arcana: +15 % de daño mientras aguanta
  const cor = bar(30, { m_barrera: 'ii' });
  const t = cor.enemy({ hp: 1e7, pos: [3, 0, 0] });
  assert.equal(firePower('condAdd', cor.p, cor.p, t, { skill: 'rayo' }), 15, 'con la Barrera: +15 %');
  assert.equal(firePower('condAdd', plain.p, plain.p, t, { skill: 'rayo' }), 0, 'sin la variante: nada');
  cor.p.takeDamage(Math.round(cor.p.shieldTotal() * 3), 1, { element: 'fire' });
  assert.equal(firePower('condAdd', cor.p, cor.p, t, { skill: 'rayo' }), 0, 'rota: se acaba');
  noWarnings('Barrera');
  console.log('Barrera de Maná: Burbuja Estable, Barrera Gélida (congela al romperse) y Coraza Arcana (+15 %) ✓');
}

// ---- Nova de Hielo (Nv8: Mejora 11, variantes 14) ----
{
  const nova = (level, forge = {}, n = 1) => {
    const h = hz({ level, forge });
    const list = [];
    for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; list.push(h.enemy({ hp: 1e7, pos: [Math.sin(a) * 2, 0, Math.cos(a) * 2] })); }
    h.setSlot('rmb', 'nova_hielo');
    assert.equal(h.cast('rmb'), true);
    return { h, list };
  };
  assert.ok(nova(10).list[0].slowPct === 30 && nova(11).list[0].slowPct === 40, 'Escarcha Profunda: 30 → 40 %');
  // I · Corazón de Hielo: escudo del 3 % de la vida por golpeado, tope 15 %
  const three = nova(30, { nova_hielo: 'i' }, 3), seven = nova(30, { nova_hielo: 'i' }, 7), none = nova(30, { nova_hielo: null }, 3);
  const pct = h => h.p.shieldTotal() / h.p.stats.maxHP * 100;
  assert.ok(Math.abs(pct(three.h) - 9) < 0.5, `3 golpeados: 9 % (${pct(three.h).toFixed(1)})`);
  assert.ok(Math.abs(pct(seven.h) - 15) < 0.5, `7 golpeados: tope 15 % (${pct(seven.h).toFixed(1)})`);
  assert.equal(none.h.p.shieldTotal(), 0, 'sin variante, sin escudo');
  // II · Nova Fracturante: +40 % a los que YA estaban ralentizados o congelados
  const fr = nova(30, { nova_hielo: 'ii' });
  const e = fr.h.enemy({ hp: 1e7, pos: [9, 0, 0] });
  const add = () => firePower('condAdd', fr.h.p, fr.h.p, e, { skill: 'nova_hielo' });
  assert.equal(add(), 0, 'sin ralentizar: nada');
  e.applyCC('slow', 3, { pct: 30 });
  assert.equal(add(), 40, 'ralentizado: +40 %');
  assert.equal(firePower('condAdd', fr.h.p, fr.h.p, e, { skill: 'rayo' }), 0, 'solo la Nova');
  assert.equal(firePower('condAdd', none.h.p, none.h.p, e, { skill: 'nova_hielo' }), 0, 'sin la variante: nada');
  noWarnings('Nova');
  console.log('Nova de Hielo: Escarcha Profunda, Corazón de Hielo (escudo por golpeado) y Nova Fracturante ✓');
}

// ---- Llamarada (Piromante, Nv10: Mejora 13, variantes 16) ----
{
  const cone = (level, forge, spots) => {
    const h = hz({ spec: 'piromante', level, forge });
    const es = spots.map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
    h.aim(0, 5); h.setSlot('k3', 'p_llamarada');
    assert.equal(h.cast('k3'), true);
    h.step(0.2);
    return { h, hit: es.map(e => lost(e) > 0) };
  };
  const at40 = [4 * Math.sin(40 * Math.PI / 180), 4 * Math.cos(40 * Math.PI / 180)];
  assert.deepEqual([cone(12, {}, [at40]).hit[0], cone(13, {}, [at40]).hit[0]], [false, true], 'Llama Ancha: cono 70 → 90°');
  // I · Lanza de Llamas: 25° y 10 m (+50 %) · II · Erupción: anillo de 5 m a tu alrededor (−15 %)
  const at20 = [4 * Math.sin(20 * Math.PI / 180), 4 * Math.cos(20 * Math.PI / 180)];
  const SP = [[0, 9.5], at20, [0, -3], [0, 6.2]];
  const b = cone(30, { p_llamarada: null }, SP), l = cone(30, { p_llamarada: 'i' }, SP), r = cone(30, { p_llamarada: 'ii' }, SP);
  assert.deepEqual(b.hit, [false, true, false, true], 'base (con la Mejora): cono de 7 m y 90°');
  assert.deepEqual(l.hit, [true, false, false, true], 'Lanza de Llamas: estrecha y hasta 10 m');
  assert.deepEqual(r.hit, [false, true, true, false], 'Erupción: alrededor, hasta 5 m');
  const pa = x => profOf(x.h, 'p_llamarada').addPct;
  assert.ok(pa(l) === pa(b) + 50 && pa(r) === pa(b) - 15);
  assert.equal(profOf(r.h, 'p_llamarada').def.type, 'area');
  noWarnings('Llamarada');
  console.log('Llamarada: Llama Ancha, Lanza de Llamas (25°, 10 m) y Erupción (anillo de 5 m) ✓');
}

// ---- Estela Ígnea (Piromante, Nv12: Mejora 15, variantes 18) ----
{
  const slide = (level, forge = {}) => {
    const h = hz({ spec: 'piromante', level, forge });
    h.aim(10, 0); h.setSlot('k1', 'm_estela_ignea');
    assert.equal(h.cast('k1'), true);
    const fs = h.g.fields.filter(f => !f.dead && f.data?.skill === 'm_estela_ignea');
    return { h, fs };
  };
  assert.ok(near(slide(14).fs[0].dur, 3) && near(slide(15).fs[0].dur, 4), 'Rastro Ardiente: 3 → 4 s');
  // I · Senda de Llamas: rastro de 3 m de ancho y +37 %
  const base = slide(30, { m_estela_ignea: null }), senda = slide(30, { m_estela_ignea: 'i' });
  assert.ok(near(base.fs[0].width, 1.5) && near(senda.fs[0].width, 3), 'el doble de ancho');
  assert.equal(profOf(senda.h, 'm_estela_ignea').addPct, profOf(base.h, 'm_estela_ignea').addPct + 37);
  // II · Muro de Llamas: el rastro es el campo p_muro_fuego, que corta el paso (no a jefes) y quema
  assert.ok(FIELD_DEFS.p_muro_fuego, 'campo p_muro_fuego (powers-maga.js) registrado');
  const muro = slide(30, { m_estela_ignea: 'ii' });
  assert.ok(muro.fs.length === 1 && muro.fs[0].kind === 'p_muro_fuego' && muro.fs[0].data.blocks === true, 'un muro de fuego que bloquea');
  const e = muro.h.enemy({ hp: 1e7, pos: [3, 0, 1.6] });
  const boss = muro.h.enemy({ hp: 1e7, pos: [4, 0, 1.6], boss: true });
  muro.h.step(0.1);
  e.pos.z = 0.2; boss.pos.z = 0.2;                       // intentan cruzar
  muro.h.step(0.1);
  assert.ok(e.pos.z > 1, `vuelve a su lado (${e.pos.z.toFixed(2)})`);
  assert.ok(near(boss.pos.z, 0.2), 'al jefe no lo para');
  muro.h.step(0.6);
  assert.ok(lost(boss) > 0, 'quema a quien está dentro');
  muro.h.step(3);                                         // 3,8 s de los 4 (Rastro Ardiente)
  assert.equal(muro.h.g.fields.filter(f => !f.dead && f.data?.skill === 'm_estela_ignea').length, 1, 'sigue en pie');
  muro.h.step(0.4);
  assert.equal(muro.h.g.fields.filter(f => !f.dead && f.data?.skill === 'm_estela_ignea').length, 0, 'dura su tiempo');
  noWarnings('Estela Ígnea');
  console.log('Estela Ígnea: Rastro Ardiente, Senda de Llamas (3 m) y Muro de Llamas (corta el paso) ✓');
}

// ---- Meteoro (Piromante, Nv14: Mejora 17, variantes 20) ----
{
  const met = (level, forge = {}) => {
    const h = hz({ spec: 'piromante', level, forge });
    const e = h.enemy({ hp: 1e8, pos: [6, 0, 0] });
    const log = spy(e);
    h.aim(6, 0); h.setSlot('rmb', 'meteoro');
    assert.equal(h.cast('rmb'), true);
    return { h, e, log };
  };
  const m16 = met(16), m17 = met(17);
  m16.h.step(0.5); m17.h.step(0.5);
  assert.ok(m16.log.length === 0 && m17.log.length === 1, 'Puntería Ígnea: cae a los 0,45 s');
  // I · Lluvia de Meteoritos: 3 impactos repartidos (al centro le caen los 3) · II · Ancestral: aturde 1 s, enfriamiento 9 s
  const base = met(30, { meteoro: null }), rain = met(30, { meteoro: 'i' }), old = met(30, { meteoro: 'ii' });
  for (const x of [base, rain, old]) x.h.step(0.6);
  assert.equal(hitsOf(base.log, 'meteoro').length, 1);
  assert.equal(hitsOf(rain.log, 'meteoro').length, 3, '3 meteoritos');
  assert.ok(near(profOf(rain.h, 'meteoro').radius, 2.2) && profOf(rain.h, 'meteoro').addPct === profOf(base.h, 'meteoro').addPct - 45, '2,2 m y 55 % cada uno');
  assert.ok(old.e.stunT > 0.5 && !(base.e.stunT > 0), `Ancestral aturde (${old.e.stunT?.toFixed(2)} s)`);
  assert.ok(near(old.h.p.cdMax.meteoro, 9) && near(base.h.p.cdMax.meteoro, 6), 'enfriamiento 6 → 9 s');
  assert.equal(profOf(old.h, 'meteoro').addPct, profOf(base.h, 'meteoro').addPct + 60);
  // la Lluvia reparte: los 3 caen en anillo a 1,5 m del centro (scatter 2,5 × 0,6), el primero más
  // allá del centro. Un enemigo a 3,7 m (fuera de los 3 m del Meteoro) recibe solo ese
  const edge = forge => {
    const h = hz({ spec: 'piromante', forge });
    const log = spy(h.enemy({ hp: 1e8, pos: [9.7, 0, 0] }));
    h.aim(6, 0); h.setSlot('rmb', 'meteoro');
    assert.equal(h.cast('rmb'), true);
    h.step(1);
    return hitsOf(log, 'meteoro').length;
  };
  assert.deepEqual([edge({ meteoro: null }), edge({ meteoro: 'i' })], [0, 1], 'Lluvia: al borde le cae un meteorito; al Meteoro solo, no llega');
  noWarnings('Meteoro');
  console.log('Meteoro: Puntería Ígnea, Lluvia de Meteoritos (3 impactos) y Meteoro Ancestral (aturde) ✓');
}

// ---- Supernova (Piromante, Nv15: Mejora 18, variantes 21) ----
{
  const nova = (level, forge = {}, at = [6.3, 0]) => {
    const h = hz({ spec: 'piromante', level, forge });
    const e = h.enemy({ hp: 1e8, pos: [at[0], 0, at[1]] });
    const log = spy(e);
    h.setSlot('k4', 'm_u_supernova');
    assert.equal(h.cast('k4'), true);
    return { h, e, log };
  };
  // Mejora: atrae 2 m justo antes de la primera onda (el de 6,3 m entra en los 5 m)
  const g17 = nova(17), g18 = nova(18);
  g17.h.step(1); g18.h.step(1);                           // 0,15 s de preparación + 0,5 s
  assert.ok(g17.log.length === 0 && near(g17.e.pos.x, 6.3), 'Nv17: fuera de la onda');
  assert.ok(g18.e.pos.x < 5 && hitsOf(g18.log, 'm_u_supernova').length >= 1, `Gravedad Solar: atraído y golpeado (${g18.e.pos.x.toFixed(2)})`);
  // I · Sol Errante: te sigue 4 s y estalla 4 veces (cada 1 s)
  const sol = nova(30, { m_u_supernova: 'i' }, [2, 0]);
  sol.h.step(1);
  assert.equal(sol.log.length, 0, 'aún no estalla');
  sol.h.step(0.3);
  assert.equal(hitsOf(sol.log, 'm_u_supernova').length, 1, 'primera a 1 s');
  sol.h.p.pos.set(30, 0, 0);
  const b = sol.h.enemy({ hp: 1e8, pos: [31, 0, 0] });
  const lb = spy(b);
  sol.h.step(3.2);
  assert.equal(hitsOf(sol.log, 'm_u_supernova').length, 1, 'ya no estalla donde estabas');
  assert.equal(hitsOf(lb, 'm_u_supernova').length, 3, 'te sigue: 3 ondas más donde estás');
  // II · Colapso: una sola onda de 1300 % en 3 m
  const col = nova(30, { m_u_supernova: 'ii' }, [2, 0]);
  const out = col.h.enemy({ hp: 1e8, pos: [6, 0, 0] });  // con 5 m (+2 de atracción) entraría
  col.h.step(2);
  assert.equal(hitsOf(col.log, 'm_u_supernova').length, 1, 'una onda');
  assert.equal(lost(out), 0, 'radio de 3 m');
  assert.ok(near(profOf(col.h, 'm_u_supernova').coef / profOf(sol.h, 'm_u_supernova').coef, 13 / 3.8), '1300 % frente a 380 %');
  noWarnings('Supernova');
  console.log('Supernova: Gravedad Solar (atrae), Sol Errante (te sigue, 4 ondas) y Colapso (1 onda) ✓');
}

// ---- Prisión de Hielo (Crionte, Nv10: Mejora 13, variantes 16) ----
{
  const pri = (level, forge = {}) => {
    const h = hz({ spec: 'crionte', level, forge });
    h.setSlot('k3', 'k_prision');
    return h;
  };
  const c12 = pri(12), c13 = pri(13);
  const a12 = c12.enemy({ hp: 1e7, pos: [4.6, 0, 0] }), a13 = c13.enemy({ hp: 1e7, pos: [4.6, 0, 0] });
  c12.cast('k3'); c13.cast('k3'); c12.step(0.2); c13.step(0.2);
  assert.ok(!(a12.frozenT > 0) && a13.frozenT > 1.5, 'Celda Amplia: 4 → 5 m');
  // la Prisión pone 2 capas de Escarcha (las pone el indicador con prof.def.layers: petición a KT)
  {
    const h = pri(12);
    const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    h.cast('k3'); h.step(0.2);
    const n = h.gaugeValue('escarcha', e);
    pendingOr(n !== 1, () => assert.equal(n, 2, 'Prisión: 2 capas'), 'KT · Prisión de Hielo: el indicador pone 1 capa, no las 2 de prof.def.layers');
  }
  // I · Celda Lejana: a 15 m sobre UN enemigo, 3 s
  const run = forge => {
    const h = pri(30, forge);
    const t = h.enemy({ hp: 1e7, pos: [0, 0, 12] });
    const n = h.enemy({ hp: 1e7, pos: [0.9, 0, 12.6] });
    const me = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    h.aim(0, 12);
    assert.equal(h.cast('k3'), true);
    h.step(0.2);
    return { h, t, n, me };
  };
  const far = run({ k_prision: 'i' }), base = run({ k_prision: null });
  assert.ok(far.t.frozenT > 2.5 && lost(far.t) > 0, `encierra al de la mira 3 s (${far.t.frozenT?.toFixed(2)})`);
  assert.ok(!(far.n.frozenT > 0) && lost(far.n) === 0 && !(far.me.frozenT > 0), 'a nadie más');
  assert.ok(!(base.t.frozenT > 0) && base.me.frozenT > 1.5, 'sin variante: a tu alrededor');
  // II · Muralla de Hielo: muro de 8 m (10 con la Mejora) que corta el paso 3 s; un golpe de Hielo al rozarlo
  const w = pri(30, { k_prision: 'ii' });
  const touch = w.enemy({ hp: 1e7, pos: [2, 0, 6.3] });
  const later = w.enemy({ hp: 1e7, pos: [2, 0, 9] });
  const lt = spy(touch), ll = spy(later);
  w.aim(0, 6);
  assert.equal(w.cast('k3'), true);
  w.step(0.2);                                             // tras la preparación
  const f = (w.g.fields || []).find(x => !x.dead && x.data?.skill === 'k_prision');
  assert.ok(f && f.kind === 'muro' && f.shape === 'line' && f.data.blocks === true, 'muro en línea que bloquea');
  assert.ok(near(Math.hypot(f.b.x - f.a.x, f.b.z - f.a.z), 10) && near(f.a.z, 6) && near(f.b.z, 6), 'perpendicular a la mira, 8 m × Celda Amplia');
  assert.ok(near(f.dur, 3));
  w.step(1);
  assert.equal(hitsOf(lt, 'k_prision').length, 1, 'el que lo roza: un golpe');
  assert.equal(lt[0].elem, 'frost');
  assert.equal(w.gaugeValue('escarcha', touch), 1, 'y 1 capa de Escarcha');
  assert.ok(!(touch.frozenT > 0), 'la muralla no congela');
  assert.equal(ll.length, 0, 'lejos del muro, nada');
  later.pos.z = 6.4;
  w.step(1);
  assert.ok(hitsOf(lt, 'k_prision').length === 1 && hitsOf(ll, 'k_prision').length === 1, 'cada uno una vez, al rozarlo');
  w.step(1.2);
  assert.ok(f.dead, 'se deshace a los 3 s');
  noWarnings('Prisión');
  console.log('Prisión de Hielo: Celda Amplia, Celda Lejana (un objetivo, 3 s) y Muralla de Hielo ✓');
}

// ---- Paso de Escarcha (Crionte, Nv12: Mejora 15, variantes 18) ----
{
  const step = (level, forge = {}) => {
    const h = hz({ spec: 'crionte', level, forge });
    h.aim(10, 0); h.setSlot('k1', 'm_paso_escarcha');
    return h;
  };
  const durOf = h => { h.cast('k1'); return h.g.fields.find(f => !f.dead && f.data?.skill === 'm_paso_escarcha')?.dur; };
  assert.ok(near(durOf(step(14)), 3) && near(durOf(step(15)), 4), 'Hielo Duradero: 3 → 4 s');
  const one = step(30, { m_paso_escarcha: null }), two = step(30, { m_paso_escarcha: 'i' });
  const again = h => { h.step(0.6); h.aim(h.p.pos.x + 10, h.p.pos.z); return h.cast('k1'); };   // tras el deslizamiento
  assert.ok(one.cast('k1') && !again(one), 'sin variante: una vez');
  assert.ok(two.cast('k1') && again(two) && !again(two), 'Paso Doble: 2 cargas');
  // II · Prisión Fugaz: al llegar, congela 1 s a 2 m
  const run = forge => {
    const h = step(30, forge);
    const n = h.enemy({ hp: 1e7, pos: [7, 0, 0.5] });
    const f = h.enemy({ hp: 1e7, pos: [6, 0, 3.5] });
    assert.equal(h.cast('k1'), true);
    return { h, n, f };
  };
  const fz = run({ m_paso_escarcha: 'ii' }), pl = run({ m_paso_escarcha: null });
  assert.ok(fz.n.frozenT > 0.8 && !(fz.f.frozenT > 0), `congela 1 s a los de 2 m (${fz.n.frozenT?.toFixed(2)})`);
  assert.ok(!(pl.n.frozenT > 0), 'sin variante no congela');
  noWarnings('Paso de Escarcha');
  console.log('Paso de Escarcha: Hielo Duradero, Paso Doble (2 cargas) y Prisión Fugaz ✓');
}

// ---- Lanza de Hielo (Crionte, Nv14: Mejora 17, variantes 20) ----
{
  const lance = (level, forge, spots) => {
    const h = hz({ spec: 'crionte', level, forge });
    const shots = [];
    const orig = h.g.spawnProjectile.bind(h.g);
    h.g.spawnProjectile = o => { if (o.skill === 'k_lanza') shots.push(o); return orig(o); };
    const es = spots.map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
    const logs = es.map(spy);
    h.aim(0, 6); h.setSlot('rmb', 'k_lanza');
    assert.equal(h.cast('rmb'), true);
    h.step(1);
    return { h, es, shots, hits: logs.map(l => hitsOf(l, 'k_lanza').length) };
  };
  assert.deepEqual([lance(16, {}, [[0, 13.4]]).hits[0], lance(17, {}, [[0, 13.4]]).hits[0]], [0, 1], 'Punta Afilada: +2 m');
  // I · Lanza Pesada: no atraviesa, +60 % y 2 capas · II · Abanico Gélido: 3 lanzas (50 %), una por enemigo
  const side = [5 * Math.sin(0.26), 5 * Math.cos(0.26)];
  const SP = [[0, 4], [0, 8], side, [0, 1]];
  const b = lance(30, { k_lanza: null }, SP), heavy = lance(30, { k_lanza: 'i' }, SP), fan = lance(30, { k_lanza: 'ii' }, SP);
  assert.deepEqual(b.hits, [1, 1, 0, 1], 'base: atraviesa en línea');
  assert.deepEqual(heavy.hits, [0, 0, 0, 1], 'Pesada: se queda en el primero');
  assert.deepEqual(fan.hits, [1, 1, 1, 1], 'Abanico: también al de 15°, y cada enemigo una vez');
  assert.equal(fan.shots.length, 3, '3 lanzas');
  const pa = x => profOf(x.h, 'k_lanza').addPct;
  assert.ok(pa(heavy) === pa(b) + 60 && pa(fan) === pa(b) - 50);
  assert.ok(profOf(heavy.h, 'k_lanza').def.layers === 2 && !profOf(heavy.h, 'k_lanza').pierce, '2 capas (las pone el indicador con prof.def.layers)');
  // efecto: capas de Escarcha en el primero (el de 1 m; la base pone 1 por golpe de Hielo)
  const nb = b.h.gaugeValue('escarcha', b.es[3]), nh = heavy.h.gaugeValue('escarcha', heavy.es[3]);
  assert.equal(nb, 1, 'Lanza: 1 capa al golpear');
  pendingOr(nh !== 1, () => assert.equal(nh, 2, 'Lanza Pesada: 2 capas'), 'KT · Lanza Pesada: el indicador pone 1 capa, no las 2 de prof.def.layers');
  noWarnings('Lanza de Hielo');
  console.log('Lanza de Hielo: Punta Afilada, Lanza Pesada (no atraviesa) y Abanico Gélido (3 lanzas) ✓');
}

// ---- Tormenta Glacial (Crionte, Nv15: Mejora 18, variantes 21) ----
{
  const storm = (level, forge = {}) => {
    const h = hz({ spec: 'crionte', level, forge });
    h.setSlot('k4', 'm_u_tormenta');
    return h;
  };
  const dr = h => firePower('condDr', h.p, h.p, { amount: 100, raw: 100, element: 'fire', melee: false });
  const s17 = storm(17), s18 = storm(18);
  s17.cast('k4'); s18.cast('k4');
  assert.ok(dr(s17) === 0 && dr(s18) === 10, 'Ojo Tranquilo: −10 % dentro');
  s18.step(8.5, 0.1);
  assert.equal(dr(s18), 0, 'sin tormenta, nada');
  // I · Ventisca Anclada: fija donde la lanzas, 6 m
  const anc = storm(30, { m_u_tormenta: 'i' });
  const a = anc.enemy({ hp: 1e8, pos: [8, 0, 0] });
  const la = spy(a);
  anc.aim(8, 0);
  assert.equal(anc.cast('k4'), true);
  const s = SK.magaStorm(anc.p);
  assert.ok(s && near(s.center().x, 8) && near(s.radius, 6), 'centrada en la mira, radio 6');
  // Ojo Tranquilo (la Mejora va con la variante): solo DENTRO de la tormenta
  assert.equal(dr(anc), 0, 'a 8 m de la Ventisca Anclada: sin reducción');
  anc.p.pos.set(7, 0, 1);
  assert.equal(dr(anc), 10, 'dentro: −10 %');
  anc.p.pos.set(30, 0, 0);
  assert.equal(dr(anc), 0, 'fuera otra vez: nada');
  const b = anc.enemy({ hp: 1e8, pos: [31, 0, 0] });
  const lb = spy(b);
  anc.step(2);
  assert.ok(hitsOf(la, 'm_u_tormenta').length >= 4 && lb.length === 0, 'no te sigue');
  // II · Granizo: un golpe (1100 %) sobre el enemigo de la mira que congela 2 s
  const hail = storm(30, { m_u_tormenta: 'ii' });
  const t = hail.enemy({ hp: 1e8, pos: [6, 0, 0] });
  const f = hail.enemy({ hp: 1e8, pos: [6, 0, 4] });
  const lt = spy(t), lf = spy(f);
  hail.aim(6, 0.5);
  assert.equal(hail.cast('k4'), true);
  assert.ok(t.frozenT > 1.5, 'congela 2 s');
  hail.step(3);
  assert.ok(hitsOf(lt, 'm_u_tormenta').length === 1 && lf.length === 0, 'un solo pedrisco, 2,5 m');
  assert.equal(SK.magaStorm(hail.p), null, 'no queda tormenta');
  assert.ok(near(profOf(hail, 'm_u_tormenta').coef / profOf(anc, 'm_u_tormenta').coef, 11 / 0.9));
  noWarnings('Tormenta Glacial');
  console.log('Tormenta Glacial: Ojo Tranquilo (−10 %), Ventisca Anclada (fija) y Granizo (1 golpe que congela) ✓');
}

// ---- Orbe Arcano (Arcanista, Nv10: Mejora 13, variantes 16) ----
{
  const orb = (level, forge, spots) => {
    const h = hz({ spec: 'arcanista', level, forge });
    const segs = [];
    const orig = h.g.spawnProjectile.bind(h.g);
    h.g.spawnProjectile = o => { if (o.skill === 'a_orbe' && o.size > 0.1) segs.push(o); return orig(o); };
    const es = spots.map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
    const logs = es.map(spy);
    h.aim(0, 4); h.setSlot('k3', 'a_orbe');
    assert.equal(h.cast('k3'), true);
    h.step(1);
    return { h, segs, hits: () => logs.map(l => hitsOf(l, 'a_orbe').length) };
  };
  // Mejora: +30 % de tamaño = el radio de choque (0,55 m a escala 1) crece un 30 %: choca hasta
  // 0,165 m más a cada lado. Uno que pasaba rozando entra; uno algo más allá, no
  const r = 0.55 * (makeHarness({ classId: 'maga' }).enemy().def.scale || 1), lane = 0.3 * 0.55;
  const SPOTS = [[r + 0.03, 3], [r + lane - 0.03, 5], [r + lane + 0.03, 7]];
  const o12 = orb(12, {}, SPOTS), o13 = orb(13, {}, SPOTS);
  assert.deepEqual(o12.hits(), [0, 0, 0], 'Nv12: el orbe pasa de largo');
  assert.deepEqual(o13.hits(), [1, 1, 0], 'Orbe Grande: choca hasta +0,165 m');
  assert.ok(near(o13.segs[0].size, 0.34 * 1.3), 'y más grande');
  // I · Orbe Veloz: el doble de rápido, sin rebotes (+40 %) · II · Orbe Gemelo: 2 en V (60 %), una vez por enemigo
  const v = [5 * Math.sin(0.22), 5 * Math.cos(0.22)];
  const SP = [[0, 1], v];
  const b = orb(30, { a_orbe: null }, SP), fast = orb(30, { a_orbe: 'i' }, SP), twin = orb(30, { a_orbe: 'ii' }, SP);
  assert.ok(near(fast.segs[0].speed, 2 * b.segs[0].speed), 'el doble de rápido');
  assert.deepEqual([b.segs.length, twin.segs.length], [1, 2], 'Gemelo: 2 orbes');
  assert.deepEqual(b.hits(), [1, 0]);
  assert.deepEqual(twin.hits(), [1, 1], 'Gemelo: el de la V también, y el cercano una vez');
  for (const x of [b, fast]) x.h.step(8);
  assert.ok(b.segs.length === 3 && fast.segs.length === 1, 'Veloz: sin rebotes');
  const pa = x => profOf(x.h, 'a_orbe').addPct;
  assert.ok(pa(fast) === pa(b) + 40 && pa(twin) === pa(b) - 40);
  noWarnings('Orbe Arcano');
  console.log('Orbe Arcano: Orbe Grande (roza más ancho), Orbe Veloz (sin rebotes) y Orbe Gemelo (2 en V) ✓');
}

// ---- Sello del Archimago (Arcanista, Nv12: Mejora 15, variantes 18) ----
{
  const seal = (level, forge = {}) => {
    const h = hz({ spec: 'arcanista', level, forge });
    h.setSlot('k2', 'a_sello');
    const c0 = profOf(h, 'rayo').cost;
    assert.equal(h.cast('k2'), true);
    const f = h.g.fields.find(x => !x.dead && x.kind === 'aura' && x.data?.buffId === 'a_sello');
    return { h, f, c0 };
  };
  assert.ok(near(seal(14).f.t, 8) && near(seal(15).f.t, 10), 'Sello Firme: 8 → 10 s');
  // I · Sello Ofensivo: dentro, +25 % al daño de los críticos y ya no abarata
  const base = seal(30, { a_sello: null }), off = seal(30, { a_sello: 'i' });
  const buff = x => x.h.p.buffs.find(b => b.id === 'a_sello');
  assert.ok(profOf(base.h, 'rayo').cost < base.c0 && !(buff(base).stats.critDmg > 0), 'base: abarata');
  assert.ok(profOf(off.h, 'rayo').cost === off.c0 && buff(off).stats.critDmg >= 25, `Ofensivo: críticos +${buff(off).stats.critDmg} % y coste normal`);
  // II · Sello de Contención: ralentiza un 40 % a los enemigos dentro
  const con = seal(30, { a_sello: 'ii' });
  const inE = con.h.enemy({ hp: 1e7, pos: [2, 0, 0] }), outE = con.h.enemy({ hp: 1e7, pos: [8, 0, 0] });
  const bIn = base.h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  con.h.step(0.7, 0.1); base.h.step(0.7, 0.1);
  assert.ok(inE.slowT > 0 && inE.slowPct === 40, 'dentro: −40 %');
  assert.ok(!(outE.slowT > 0) && !(bIn.slowT > 0), 'fuera, o sin la variante, no');
  con.h.step(10, 0.1);
  const late = con.h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  con.h.step(0.7, 0.1);
  assert.ok(!(late.slowT > 0), 'acabado el Sello, nada');
  noWarnings('Sello');
  console.log('Sello del Archimago: Sello Firme, Sello Ofensivo (críticos) y Sello de Contención (ralentiza) ✓');
}

// ---- Rayo (Arcanista, Nv14: Mejora 17, variantes 20) ----
{
  const bolt = (level, forge, spots) => {
    const h = hz({ spec: 'arcanista', level, forge });
    const es = spots.map(([x, z]) => h.enemy({ hp: 1e7, pos: [x, 0, z] }));
    h.aim(0, 5); h.setSlot('rmb', 'rayo');
    return { h, es };
  };
  const r16 = bolt(16, {}, [[0, 17]]), r17 = bolt(17, {}, [[0, 17]]);
  r16.h.cast('rmb'); r17.h.cast('rmb');
  assert.ok(lost(r16.es[0]) === 0 && lost(r17.es[0]) > 0, 'Rayo Largo: 15 → 18 m');
  // I · Rayo en Cadena: salta a 3 enemigos fuera de la línea, cada salto al 70 % (no decae). Se
  // miran los saltos que lanza el motor (spawnChainBounce): hoy cada uno choca primero con el
  // enemigo del que sale (petición a W2), así que el daño por enemigo aún no sirve de prueba
  const SP = [[0, 5], [3, 5], [5, 6], [7, 6]];
  const base = bolt(30, { rayo: null }, SP), chain = bolt(30, { rayo: 'i' }, SP);
  const bounces = x => { const out = []; const o = x.h.g.spawnProjectile.bind(x.h.g); x.h.g.spawnProjectile = q => { if (q.size === 0.12) out.push(q); return o(q); }; return out; };
  const bb = bounces(base), cb = bounces(chain);
  const lc = spy(chain.es[0]);
  base.h.cast('rmb'); chain.h.cast('rmb');
  base.h.step(1.5); chain.h.step(1.5);
  assert.deepEqual(base.es.map(e => lost(e) > 0), [true, false, false, false], 'base: solo la línea');
  assert.equal(bb.length, 0, 'base: no salta');
  assert.deepEqual(cb.map(q => [Math.round(q.to.x), Math.round(q.to.z)]), [[3, 5], [5, 6], [7, 6]], 'salta a los 3, del más cercano al siguiente');
  assert.ok(cb.every(q => q.dmg === cb[0].dmg), 'cada salto el mismo daño (no decae)');
  const r = cb[0].dmg / hitsOf(lc, 'rayo')[0].amt;
  assert.ok(r > 0.5 && r < 0.95, `cada salto ≈ 70 % del golpe (${r.toFixed(2)})`);
  // II · Haz Concentrado: canalizado 1,5 s (3 pulsos de 80 %) al primero que toca, +80 %: en total,
  // 3 × 0,8 × 1,8 = 1,8 veces el Rayo (240 %)
  const beam = bolt(30, { rayo: 'ii' }, [[0, 5], [0, 9]]);
  const one = bolt(30, { rayo: null }, [[0, 5]]);
  flat(beam.h); flat(one.h);
  const l0 = spy(beam.es[0]), l1 = spy(beam.es[1]), lo = spy(one.es[0]);
  assert.equal(beam.h.press('rmb'), true);
  assert.ok(beam.h.g._channel, 'canaliza');
  beam.h.step(1.7);
  beam.h.release('rmb');
  assert.ok(hitsOf(l0, 'rayo').length === 3 && l1.length === 0, `3 pulsos al primero (${hitsOf(l0, 'rayo').length})`);
  assert.equal(profOf(beam.h, 'rayo').addPct, profOf(base.h, 'rayo').addPct + 80);
  assert.ok(!beam.h.g._channel, 'al soltar, termina');
  assert.equal(one.h.cast('rmb'), true);
  const sum = l => hitsOf(l, 'rayo').reduce((a, x) => a + x.amt, 0);
  assert.equal(hitsOf(lo, 'rayo').length, 1);
  const k = sum(l0) / sum(lo);
  assert.ok(Math.abs(k - 1.8) < 0.03, `Haz: ${k.toFixed(3)} veces el Rayo`);
  noWarnings('Rayo');
  console.log('Rayo: Rayo Largo, Rayo en Cadena (3 saltos al 70 %) y Haz Concentrado (canalizado) ✓');
}

// ---- Desgarro Arcano (Arcanista, Nv15: Mejora 18, variantes 21) ----
{
  const rift = (level, forge = {}) => {
    const h = hz({ spec: 'arcanista', level, forge });
    h.setSlot('k4', 'm_u_desgarro');
    return h;
  };
  const moveWhile = level => {
    const h = rift(level);
    h.enemy({ hp: 1e8, pos: [0, 0, 4] });
    h.aim(0, 4);
    assert.equal(h.press('k4'), true);
    h.step(0.5);
    const m = h.p.moveMulProduct();
    h.release('k4');
    return m;
  };
  assert.ok(moveWhile(17) === 0 && near(moveWhile(18), 0.4), 'Desgarro Estable: te mueves despacio');
  // I · Brecha: grieta en el suelo 5 s (3 m) que daña a todos; no se canaliza
  const br = rift(30, { m_u_desgarro: 'i' });
  const inE = br.enemy({ hp: 1e8, pos: [6, 0, 0] }), side = br.enemy({ hp: 1e8, pos: [7.5, 0, 1.5] });
  br.aim(6, 0);
  assert.equal(br.cast('k4'), true);
  assert.ok(!br.g._channel, 'no se canaliza');
  const f = br.g.fields.find(x => !x.dead && x.data?.skill === 'm_u_desgarro');
  assert.ok(f && f.kind === 'zona' && near(f.radius, 3) && near(f.dur, 5), 'grieta de 3 m durante 5 s');
  br.step(2);
  assert.ok(lost(inE) > 0 && lost(side) > 0, 'daña a todos dentro');
  // II · Quiebre: tras 0,5 s, un solo golpe de 900 % al de la mira
  const q = rift(30, { m_u_desgarro: 'ii' });
  const t = q.enemy({ hp: 1e8, pos: [0, 0, 6] }), n = q.enemy({ hp: 1e8, pos: [0, 0, 8] });
  const lt = spy(t), ln = spy(n);
  q.aim(0, 6);
  assert.equal(q.cast('k4'), true);
  q.step(0.4);
  assert.equal(lt.length, 0, 'prepara');
  q.step(2.5);
  assert.ok(hitsOf(lt, 'm_u_desgarro').length === 1 && ln.length === 0, 'un golpe, solo a él');
  assert.ok(near(profOf(q, 'm_u_desgarro').coef / profOf(br, 'm_u_desgarro').coef, 9 / 1.2));
  noWarnings('Desgarro');
  console.log('Desgarro Arcano: Desgarro Estable (moverse), Brecha (grieta 5 s) y Quiebre (un golpe) ✓');
}

for (const w of PENDING) console.log(`⚠ PENDIENTE ${w}`);
console.log('\n✅ FORJA DE LA MAGA (17 habilidades × Mejora y 2 variantes) OK');
