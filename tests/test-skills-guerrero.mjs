// Paso 2 (2g) — catálogo del GUERRERO (docs/paso2g-guerrero.md §3–§9 y §11.1; formato §3.5–§3.7
// de docs/paso2-implementacion.md)
//  1) las 23 habilidades: válidas con el validador v2 (0 errores y 0 avisos: `art` e `innate` ya
//     son claves del motor), arte del mockup en assets/, números de diseño,
//     ranuras por categoría, textos y VFX/SFX; fuera las retiradas
//  2) G2: las 6 activas de talento son kind 'talent', solo de la ranura 2 y las concede UN nodo
//  3) G17: ≥ 3 verbos por especialización y el principal de cada una es suyo
//  4) barras: SPEC_BAR y FALLBACK_BAR caben y se conocen; el kit, solo con su especialización
//  5) cada habilidad en el arnés con el canal REAL: kit base, Berserker, Guardián, Cruzado y
//     activas de talento (los comportamientos propios incluidos), SIN forja: a un nivel por
//     debajo de su Mejora (req+3); la forja la prueba tests/test-forge-guerrero.mjs
//  6) tablas legadas (save-legacy-guerrero.js) con la migración real: barra de §11.6.3, forja
//     desde la 3.ª rama de v4 y lista de retiradas
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { validateSkillDef, SLOT_KEYS, CAT_SLOTS, skillVerbs, SKILL_KEYS } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { resolveSkill, fitsSlot, rankBase, isKnown } from '../js/skill-resolve.js';
import { talentTreesFor } from '../js/talents.js';
import { staggerFromCC } from '../js/combat-math.js';
import { GUERRERO_SKILLS, GUERRERO_SKILL_BEHAVIORS, GUERRERO_SPEC_BAR, GUERRERO_FALLBACK_BAR, GUERRERO_CATALOG_V, GUERRERO_SKILL_FORGE } from '../js/skills-guerrero.js';
import { GUERRERO_FX } from '../js/fx-skills-guerrero.js';
import { GUERRERO_LEGACY } from '../js/save-legacy-guerrero.js';
import { migrateV4toV5, LEGACY_TABLES } from '../js/save-schema.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { SFX_TONES } from '../js/sfx.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { baseSkillIcon } from '../js/hud-model.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = id => CLASSES.guerrero.skills.find(s => s.id === id);

// ------------------------------------------------ 1) catálogo
// [cat, req, especialización | 'talent' | null, coef, coste, recarga] a rango 1 (§3.3, §4, §5, §7, §9)
const EXPECT = {
  g_tajo:           ['basic',    1,  null,        1.0,  0,  0],
  g_hendidura:      ['spender',  2,  null,        2.9,  27, 0],
  embestida:        ['movement', 4,  null,        1.2,  0,  8],
  g_piel:           ['defense',  6,  null,        0,    0,  20],
  g_lanza:          ['spender',  8,  null,        1.9,  20, 0],
  g_remolino:       ['spec',     10, 'berserker', 0.45, 30, 6],
  g_salto:          ['movement', 12, 'berserker', 1.5,  0,  12],
  g_rajar:          ['spender',  14, 'berserker', 1.4,  15, 0],
  g_u_furia:        ['ultimate', 15, 'berserker', 0,    0,  60],
  g_guardia:        ['spec',     10, 'guardian',  0,    0,  3],
  g_carga_escudo:   ['movement', 12, 'guardian',  1.3,  0,  10],
  terremoto:        ['spender',  14, 'guardian',  2.2,  30, 0],
  g_u_ciudadela:    ['ultimate', 15, 'guardian',  0,    0,  90],
  g_juicio:         ['spec',     10, 'cruzado',   1.2,  20, 8],
  g_sendero:        ['movement', 12, 'cruzado',   1.0,  0,  10],
  g_martillo:       ['spender',  14, 'cruzado',   1.4,  25, 0],
  g_u_cataclismo:   ['ultimate', 15, 'cruzado',   5,    0,  60],
  g_t_aliento:      ['defense',  21, 'talent',    0,    0,  30],
  grito_guerra:     ['utility',  27, 'talent',    0,    0,  20],
  g_t_intervencion: ['utility',  31, 'talent',    0,    0,  20],
  g_h_bramido:      ['utility',  72, 'talent',    0,    0,  30],
  g_h_desafio:      ['utility',  72, 'talent',    0,    0,  40],
  g_h_estandarte:   ['utility',  72, 'talent',    0,    0,  30],
};
assert.equal(GUERRERO_CATALOG_V, 2, 'catálogo 2g');
assert.equal(CLASSES.guerrero.catalogV, 2, 'data.js recibe el catálogo 2g');
assert.deepEqual(GUERRERO_SKILLS.map(s => s.id), Object.keys(EXPECT), '23 habilidades: kit base, tres kits y 6 activas, en ese orden');
assert.deepEqual(CLASSES.guerrero.skills.map(s => s.id), Object.keys(EXPECT), 'data.js usa este catálogo tal cual (D29: sin fusionar activas de talents-guerrero.js)');
for (const id of ['g_mandoble', 'g_embate', 'torbellino', 'g_provocacion', 'g_u_estandarte', 'g_t_bramido', 'g_t_remolino', 'g_t_temeridad',
  'g_t_ira_ciega', 'g_t_desafio', 'g_t_muro', 'g_t_carga', 'g_t_devocion', 'g_t_veredicto', 'g_t_justicia'])
  assert.ok(!SK(id), `${id}: fuera del libro (§11.1)`);
const JERGA = /\b(UNI|TTD|proc|stagger|GCD|DoT|AoE|CC)\b|ÁREA×|astadora|vosotros/i;
// `art` (las 23) e `innate` (Piel de Hierro) son claves del motor desde la cola W2d (SKILL_KEYS)
assert.ok(SKILL_KEYS.has('art') && SKILL_KEYS.has('innate'), 'SKILL_KEYS declara art e innate');
for (const raw of GUERRERO_SKILLS) {
  const s = SK(raw.id);
  const [cat, req, owner, coef, cost, cd] = EXPECT[s.id];
  const warnings = [];
  const errs = validateSkillDef(raw, { behaviors: SKILL_BEHAVIORS, v2: true, warnings });
  assert.deepEqual(errs, [], `${s.id}: validateSkillDef v2 sin errores`);
  const all = [...new Set([...warnings, ...(errs.warnings || [])])];
  assert.deepEqual(all, [], `${s.id}: validateSkillDef v2 sin avisos`);
  // arte del mockup: existe en assets/ y el HUD lo prefiere a skills/<id>.webp (hud-model.baseSkillIcon:
  // el grande y su par pequeño de skills/; las activas de talento usan el sprite de su nodo)
  assert.ok(typeof s.art === 'string' && existsSync(new URL(`../assets/${s.art}`, import.meta.url)), `${s.id}: arte ${s.art} en assets/`);
  if (s.kind !== 'talent') for (const big of [false, true]) {
    const icon = baseSkillIcon(s, big);
    assert.ok(icon && existsSync(new URL(`../assets/${icon}`, import.meta.url)), `${s.id}: el HUD pide ${icon}, que existe`);
  }
  assert.equal(!!s.innate, s.id === 'g_piel', `${s.id}: solo Piel de Hierro trae chip de pasiva`);
  assert.equal(s.cat, cat, `${s.id}: categoría`);
  assert.equal(s.req, req, `${s.id}: req`);
  assert.equal(s.spec || (s.kind === 'talent' ? 'talent' : null), owner, `${s.id}: kit / activa de talento`);
  assert.ok(approx(s.coef || 0, coef) && (s.cost || 0) === cost && (s.cd || 0) === cd, `${s.id}: coef/coste/recarga = ${s.coef}/${s.cost}/${s.cd}`);
  if (cat === 'ultimate') assert.ok(!s.cost && s.cdFloor === 0.7, `${s.id}: definitiva sin coste y con suelo de recarga del 70 %`);
  // ranuras: las de su categoría (activas de talento: solo la 2)
  const want = s.kind === 'talent' ? ['k2'] : CAT_SLOTS[s.cat];
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), want.includes(slot), `${s.id}: fitsSlot(${slot})`);
  // textos: línea corta para el libro y descripción con números, sin jerga
  assert.ok(s.line && s.line.length <= 120, `${s.id}: línea ≤ 120 (${s.line?.length})`);
  assert.ok(s.desc.length > 40 && /\d/.test(s.desc) && s.desc.length <= 260, `${s.id}: descripción clara y con números`);
  assert.ok(!JERGA.test(s.line) && !JERGA.test(s.desc), `${s.id}: sin jerga`);
  // comportamiento: registrado (los de clase g_t_* los registra js/powers-guerrero.js)
  if (s.behavior) assert.ok(SKILL_BEHAVIORS[s.behavior], `${s.id}: comportamiento ${s.behavior} registrado`);
  // VFX/SFX: entrada propia, presets por nombre que existen y sonido conocido
  const fx = SKILL_FX[s.id];
  assert.ok(fx && fx === GUERRERO_FX[s.id], `${s.id}: VFX de fx-skills-guerrero.js`);
  assert.ok(SFX_TONES[fx.sfx], `${s.id}: sonido «${fx.sfx}»`);
  for (const k of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[k] === 'string') assert.ok(SKILL_FX_PRESETS[fx[k]] || ['basicCleave', 'meleeHit'].includes(fx[k]), `${s.id}: preset ${fx[k]}`);
}
// (aparte, las entradas de las variantes que cambian de forma: las prueba test-forge-guerrero)
const VAR_IDS = new Set(Object.values(GUERRERO_SKILL_FORGE).flatMap(f => f.vars.map(v => v.id)));
assert.deepEqual(Object.keys(GUERRERO_FX).filter(id => !VAR_IDS.has(id)).sort(), Object.keys(EXPECT).sort(), 'VFX: una entrada por habilidad del catálogo, ninguna retirada');
// cada comportamiento propio lo usa una habilidad del catálogo o una pieza de su forja (los de la
// forja, `v_*` y como mucho 3 por clase: plan §3.5), y nadie más lo define
const FORGE_BEH = Object.values(GUERRERO_SKILL_FORGE).flatMap(f => [f.mejora, ...f.vars]).filter(x => x.behavior).map(x => x.behavior);
assert.ok(FORGE_BEH.length <= 3 && FORGE_BEH.every(id => /^v_/.test(id)), `forja: ≤ 3 comportamientos v_* (${FORGE_BEH})`);
for (const id of Object.keys(GUERRERO_SKILL_BEHAVIORS)) {
  assert.ok(GUERRERO_SKILLS.some(s => s.behavior === id) || FORGE_BEH.includes(id), `${id}: lo usa una habilidad o su forja`);
  assert.equal(SKILL_BEHAVIORS[id]?.cast, GUERRERO_SKILL_BEHAVIORS[id].cast, `${id}: registrado desde skills-guerrero.js`);
}
// rango por nivel: coef ×(1+0,10·(rango−1)) y buffs ×(1+0,06·(rango−1)); minHpPct/endHealPct no escalan
for (const L of [15, 40, 72]) {
  const h = makeHarness({ classId: 'guerrero', level: L, spec: 'berserker' });
  for (const id of ['g_hendidura', 'g_remolino', 'g_rajar', 'terremoto', 'g_martillo', 'g_u_cataclismo']) {
    const s = SK(id), r = rankBase(L, s.req), prof = resolveSkill(h.p, s);
    assert.equal(prof.rank, r, `${id} Nv${L}: rango`);
    assert.ok(approx(prof.coef, s.coef * (1 + 0.1 * (r - 1))), `${id} Nv${L}: coef ${prof.coef}`);
  }
  const fu = resolveSkill(h.p, SK('g_u_furia')), r = rankBase(L, 15);
  assert.equal(fu.buff.spenderCostPct, Math.round(-100 * (1 + 0.06 * (r - 1))), 'Furia Inmortal: el coste cero escala (y se recorta a 0)');
}
console.log('Catálogo 2g del Guerrero: 23 habilidades válidas (v2, sin avisos), arte, números, ranuras, textos y VFX ✓');

// ------------------------------------------------ 2) G2: activas de talento
const TALENT_ACTIVES = { g_t_aliento: 'c11', grito_guerra: 'c17', g_t_intervencion: 'c22', g_h_bramido: 't4', g_h_desafio: 'l4', g_h_estandarte: 'u4' };
{
  const T = talentTreesFor('guerrero');
  const grants = [];
  const scan = (where, nodes) => { for (const n of nodes || []) for (const o of n.opts || []) if (o.fx?.grant) grants.push({ id: o.fx.grant, node: n.id, k: o.k, where }); };
  scan('clase', T.cls.nodes);
  for (const sp of T.specs) scan(sp.id, sp.nodes);
  for (const hr of T.hero) scan(hr.id, hr.nodes);
  assert.deepEqual(grants.map(g => g.id).sort(), Object.keys(TALENT_ACTIVES).sort(), 'G2: los nodos conceden exactamente las 6 activas, una vez cada una');
  for (const g of grants) {
    assert.equal(g.node, TALENT_ACTIVES[g.id], `${g.id}: la concede ${TALENT_ACTIVES[g.id]}`);
    assert.equal(g.k, 'A', `${g.id}: en la opción A`);
    assert.ok(!T.specs.some(sp => sp.id === g.where), `${g.id}: no la concede un árbol de especialización (el kit está en el catálogo)`);
  }
  const actives = CLASSES.guerrero.skills.filter(s => s.kind === 'talent');
  assert.deepEqual(actives.map(s => s.id), Object.keys(TALENT_ACTIVES), 'G2: 6 activas de talento en el catálogo');
  for (const s of actives) {
    assert.deepEqual(s.slots, ['k2'], `${s.id}: solo la ranura 2`);
    assert.deepEqual(SLOT_KEYS.filter(k => fitsSlot(s, k)), ['k2'], `${s.id}: fitsSlot solo en k2`);
    assert.ok(['defense', 'utility'].includes(s.cat) && !s.spec, `${s.id}: Defensa o Utilidad (D7), de toda la clase`);
  }
  // sin el nodo no se conocen; con el grant, sí (y nada más)
  const h = makeHarness({ classId: 'guerrero', level: 80, spec: 'guardian' });
  assert.ok(actives.every(s => !isKnown(h.p, s)), 'sin nodo, ninguna activa de talento');
  h.p.talentExtra.grants.add('grito_guerra'); h.p.recompute();
  assert.deepEqual(actives.filter(s => isKnown(h.p, s)).map(s => s.id), ['grito_guerra'], 'el grant da solo esa');
}
console.log('G2: 6 activas de talento (ranura 2), cada una concedida por la opción A de su nodo ✓');

// ------------------------------------------------ 3) G17: verbos por especialización
// verbos del motor (skillVerbs) + los de §5.2 que se leen de claves: preparación, avance lento,
// provocación, zona, ventana de riesgo y destello
const verbsOf = s => {
  const v = new Set(skillVerbs(s));
  if (s.windup > 0 || (s.steps || []).some(st => st.windup > 0)) v.add('windup');
  if (s.dashT >= 0.5) v.add('slowAdvance');
  if (s.taunt > 0 || s.pulse?.taunt > 0) v.add('taunt');
  if (s.trail || s.floor || s.type === 'zone') v.add('zone');
  if (s.buff?.minHpPct > 0) v.add('riskWindow');
  if (s.type === 'blink') v.add('blink');
  return v;
};
const MAIN = { berserker: ['recast', 'combo'], guardian: ['stance', 'planted'], cruzado: ['charge'] };
const kitOf = sp => GUERRERO_SKILLS.filter(s => s.spec === sp);
for (const [sp, main] of Object.entries(MAIN)) {
  const kit = kitOf(sp);
  assert.deepEqual(kit.map(s => s.req), [10, 12, 14, 15], `${sp}: kit en Nv10/12/14/15`);
  const verbs = new Set(kit.flatMap(s => [...verbsOf(s)]));
  assert.ok(verbs.size >= 3, `G17 ${sp}: ≥ 3 verbos (${[...verbs]})`);
  for (const v of main) {
    assert.ok(verbs.has(v), `G17 ${sp}: verbo principal «${v}»`);
    for (const other of Object.keys(MAIN).filter(o => o !== sp))
      assert.ok(!kitOf(other).some(s => skillVerbs(s).includes(v)), `G17: «${v}» es solo del ${sp} (no de ${other})`);
  }
}
assert.ok(GUERRERO_SKILLS.filter(s => !s.spec && s.kind !== 'talent').every(s => !['recast', 'combo', 'stance', 'charge'].some(v => skillVerbs(s).includes(v))),
  'el kit base no usa los verbos principales de las especializaciones');
console.log('G17: Berserker (relanzar, combo, canal en marcha…), Guardián (posturas, plantado, avance lento…), Cruzado (cargar y soltar, marca, zona…) ✓');

// ------------------------------------------------ 4) barras
{
  for (const [sp, b] of Object.entries(GUERRERO_SPEC_BAR)) {
    const h = makeHarness({ classId: 'guerrero', level: 15, spec: sp });
    const ids = Object.values(b.bar);
    assert.equal(new Set(ids).size, 6, `${sp}: barra sin huecos ni repetidas`);
    for (const [slot, id] of Object.entries(b.bar)) {
      assert.ok(fitsSlot(SK(id), slot), `${sp}: ${id} cabe en ${slot}`);
      assert.ok(isKnown(h.p, SK(id)), `${sp} Nv15: conoce ${id}`);
    }
    assert.deepEqual(kitOf(sp).map(s => s.id).sort(), ids.filter(id => SK(id).spec).sort(), `${sp}: la barra lleva su kit entero`);
    assert.ok(ids.includes(b.sel), `${sp}: la seleccionada (${b.sel}) está en la barra`);
    for (const [id, v] of Object.entries(b.forge || {})) assert.ok(ids.includes(id) && ['i', 'ii'].includes(v), `${sp}: forja propuesta ${id}=${v}`);
    for (const other of Object.keys(GUERRERO_SPEC_BAR).filter(o => o !== sp))
      for (const s of kitOf(other)) assert.ok(!isKnown(h.p, s), `${sp}: no conoce ${s.id} (kit de ${other}, D7)`);
  }
  const h = makeHarness({ classId: 'guerrero', level: 9 });
  for (const [slot, id] of Object.entries(GUERRERO_FALLBACK_BAR)) {
    if (!id) { assert.ok(['k3', 'k4'].includes(slot), 'reserva: solo k3/k4 vacías'); continue; }
    assert.ok(fitsSlot(SK(id), slot) && !SK(id).spec && SK(id).kind !== 'talent' && isKnown(h.p, SK(id)), `reserva: ${id} (kit base) en ${slot}`);
  }
}
console.log('Barras: SPEC_BAR con el kit de cada especialización y FALLBACK_BAR con el kit base ✓');

// ------------------------------------------------ 5) en el arnés (canal REAL)
const mk = (level, spec = null) => { const h = makeHarness({ classId: 'guerrero', level, spec }); h.p.mp = h.p.stats.maxMP; return h; };
const counter = e => { const n = { hits: 0, dots: 0 }; const td = e.takeDamage.bind(e); e.takeDamage = (a, c, o) => { if (o?.dot) n.dots++; else if (!o?.proc) n.hits++; return td(a, c, o); }; return n; };
const hasBuff = (who, id) => (who.buffs || []).some(b => b.id === id && b.t > 0);
let h, e, e2, e3;

// ---- kit base ----
// Tajo: Furia al acertar 10, +2 por enemigo extra (máx. 16) y salpica a los pegados al objetivo
h = makeHarness({ classId: 'guerrero', level: 1 });
e = h.enemy({ hp: 1e6, pos: [1.4, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [2.6, 0, 0] }); e3 = h.enemy({ hp: 1e6, pos: [1.4, 0, 5] });
h.p.basicAttack(e);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && e3.hp === 1e6, 'Tajo: objetivo y pegado a él; el lejano no');
assert.ok(1e6 - e2.hp < 1e6 - e.hp, 'Tajo: la salpicadura hace menos que el golpe');
assert.equal(h.p.mp, 12, 'Tajo: +10 +2 por el extra');
h = makeHarness({ classId: 'guerrero', level: 1 });
const ring = [0, 1, 2, 3, 4, 5, 6].map(i => h.enemy({ hp: 1e6, pos: [1.4 + 0.6 * Math.cos(i), 0, 0.6 * Math.sin(i)] }));
h.p.basicAttack(ring[0]);
assert.equal(h.p.mp, 16, 'Tajo: la Furia por extra tiene tope 16');

// Hendidura: preparación 0,25 s; cono de 120° y 4,5 m; 27 de Furia
h = mk(4); e = h.enemy({ hp: 1e6, pos: [4, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [-2, 0, 0] });
h.aim(5, 0); h.setSlot('rmb', 'g_hendidura'); assert.equal(h.cast('rmb'), true);
h.step(0.2); assert.ok(e.hp === 1e6 && h.p.mp === 100, 'Hendidura: aún preparando (ni daño ni coste)');
h.step(0.1); assert.ok(e.hp < 1e6 && e2.hp === 1e6 && h.p.mp === 73, 'Hendidura: delante sí, detrás no; cuesta 27');

// Embestida: 7 m hacia la mira, golpe al llegar y +12 de Furia solo si golpea
h = makeHarness({ classId: 'guerrero', level: 6 });
e = h.enemy({ hp: 1e6, pos: [7.5, 0, 0] });
h.aim(10, 0); h.setSlot('k1', 'embestida'); assert.equal(h.cast('k1'), true);
assert.ok(approx(h.p.pos.x, 7, 0.05) && e.hp < 1e6 && h.p.mp === 12 && h.p.cds.embestida === 8, 'Embestida: 7 m, golpea y +12');

// Piel de Hierro: −40 % 8 s, inmune a ralentizaciones; la recarga empieza al acabar (cdOnEnd)
h = mk(6); h.setSlot('k2', 'g_piel');
const dr0 = h.p.stats.dr;
assert.equal(h.cast('k2'), true);
assert.ok(h.p.stats.dr === dr0 + 40 && hasBuff(h.p, 'g_piel'), 'Piel: −40 % de daño recibido');
assert.equal(h.p.applySlow(2), false, 'Piel: no te pueden ralentizar');
assert.ok(approx(h.p.cdMax.g_piel, 28) && approx(h.p.cds.g_piel, 28), 'Piel: 8 s puesta + 20 s de recarga');
h.tick(4);
assert.equal(h.g.reduceCooldown(h.p, 'g_piel', 5), 0, 'Piel: mientras dura, las reducciones de recarga no cuentan');
h.tick(5);
assert.ok(!hasBuff(h.p, 'g_piel') && approx(h.p.cds.g_piel, 19, 0.05), `Piel: al acabar (8 s) quedan los 20 s de recarga (${h.p.cds.g_piel})`);
assert.equal(h.g.reduceCooldown(h.p, 'g_piel', 5), 5, 'Piel: ya en recarga, las reducciones cuentan');

// Lanza: atraviesa a todos en línea; 20 de Furia
h = mk(10); e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [8, 0, 0] }); e3 = h.enemy({ hp: 1e6, pos: [14, 0, 0] });
h.aim(10, 0); h.setSlot('rmb', 'g_lanza'); assert.equal(h.cast('rmb'), true); h.step(1.2);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && e3.hp === 1e6 && h.p.mp === 80, 'Lanza: atraviesa a los dos de los 11 m; el de 14 m, no; cuesta 20');

// ---- Berserker ----
// Remolino Sangriento: mantener = girar (4 golpes/s a 2,9 m) en marcha, desangra; soltar lo corta
h = mk(12, 'berserker'); e = h.enemy({ hp: 1e6, pos: [2, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
let n = counter(e);
h.setSlot('k3', 'g_remolino');
assert.equal(h.press('k3'), true);
h.walk({ x: 0, z: 1 }, 0.3);
assert.ok(h.p.pos.z > 0.5, `Remolino: giras sin dejar de moverte (z=${h.p.pos.z.toFixed(2)})`);
h.p.pos.set(0, 0, 0);
h.stand(0.75);
assert.ok(n.hits >= 3 && n.hits <= 5 && e2.hp === 1e6, `Remolino: ~4 golpes por segundo a 2,9 m (${n.hits})`);
assert.ok(h.g.hasDoT(e, 'bleed'), 'Remolino: desangra');
assert.equal(h.p.mp, 70, 'Remolino: 30 de Furia');
h.release('k3'); h.step(0.05);
const after = n.hits; h.stand(0.6);
assert.ok(!h.g._channel && n.hits === after, 'Remolino: soltar corta el giro');
assert.ok(h.p.cdMax.g_remolino === 6 && h.p.cds.g_remolino > 4, `Remolino: recarga 6 s (${h.p.cds.g_remolino?.toFixed(2)})`);

// Salto Devastador: si golpea, relanzar hasta 3 saltos (sin recarga entre ellos); al vacío cierra
h = mk(14, 'berserker'); e = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
h.aim(6, 0); h.setSlot('k1', 'g_salto');
assert.equal(h.cast('k1'), true); h.step(0.6);
assert.ok(approx(h.p.pos.x, 6, 0.1) && e.hp < 1e6, 'Salto: cae en la mira y golpea');
assert.equal(h.p.skState.g_salto.recast?.left, 2, 'Salto: quedan 2 relanzamientos');
const hp1 = e.hp;
h.aim(6.5, 0.5); h.step(0.4); assert.equal(h.cast('k1'), true, 'Salto: relanzar sin esperar la recarga'); h.step(0.6);
assert.ok(e.hp < hp1 && h.p.skState.g_salto.recast?.left === 1, 'Salto: 2.º salto');
h.aim(5.5, 0); h.step(0.4); assert.equal(h.cast('k1'), true); h.step(0.6);
assert.ok(!h.p.skState.g_salto.recast?.left && h.p.cds.g_salto > 9, 'Salto: tras el 3.º, recarga');
h = mk(14, 'berserker'); h.aim(6, 0); h.setSlot('k1', 'g_salto');
assert.equal(h.cast('k1'), true); h.step(0.6);
assert.ok(!h.p.skState.g_salto?.recast?.left, 'Salto al vacío: no hay relanzamiento');
h.step(0.4); assert.equal(h.cast('k1'), false, 'Salto al vacío: recargando');

// Rajar: combo de 3 (tajo, revés, descendente con preparación 0,3 s que desangra); 2,5 s sin pulsar → 1.º
h = mk(16, 'berserker'); e = h.enemy({ hp: 1e6, pos: [1.8, 0, 0] });
h.aim(1.8, 0); h.setSlot('rmb', 'g_rajar');
const hitsRajar = [];
for (let i = 0; i < 3; i++) {
  const before = e.hp;
  assert.equal(h.cast('rmb'), true, `Rajar: golpe ${i + 1}`);
  if (i === 2) { h.step(0.2); assert.equal(e.hp, before, 'Rajar: el 3.º se prepara'); }
  h.step(i === 2 ? 0.2 : 0.35);
  hitsRajar.push(before - e.hp);
}
assert.ok(hitsRajar.every(d => d > 0) && h.p.mp === 55, 'Rajar: tres golpes, 15 de Furia cada uno');
assert.ok(hitsRajar[2] > 1.5 * Math.max(hitsRajar[0], hitsRajar[1]), `Rajar: el descendente pega fuerte (${hitsRajar.map(Math.round)})`);
assert.ok(h.g.hasDoT(e, 'bleed'), 'Rajar: el descendente desangra');
assert.equal(h.p.skState.g_rajar.combo.idx, 0, 'Rajar: tras el 3.º vuelve al 1.º');
h.cast('rmb'); h.step(0.35);
assert.equal(h.p.skState.g_rajar.combo.idx, 1);
h.tick(2.7); h.cast('rmb'); h.step(0.35);
assert.equal(h.p.skState.g_rajar.combo.idx, 1, 'Rajar: 2,5 s sin pulsar → el combo empieza de nuevo');

// Furia Inmortal: imparable, vida mínima 1 %, principales gratis; al acabar te curas un 20 %
h = mk(17, 'berserker'); e = h.enemy({ hp: 1e6, pos: [1.8, 0, 0] });
h.setSlot('k4', 'g_u_furia'); assert.equal(h.cast('k4'), true);
assert.ok(h.p.unstoppableT > 9 && hasBuff(h.p, 'g_u_furia'), 'Furia Inmortal: imparable 10 s');
assert.equal(resolveSkill(h.p, SK('g_rajar')).cost, 0, 'Furia Inmortal: las principales no cuestan');
h.p.mp = 0; h.aim(1.8, 0); h.setSlot('rmb', 'g_rajar'); h.step(0.25);
assert.equal(h.cast('rmb'), true, 'Furia Inmortal: principal con 0 de Furia');
h.p.takeDamage(h.p.stats.maxHP * 5, 1);
assert.ok(h.p.alive && h.p.hp >= h.p.stats.maxHP * 0.01 - 1, `Furia Inmortal: la vida no baja del 1 % (${h.p.hp})`);
h.tick(9.5);
const hpEnd = h.p.hp;
h.tick(1);
assert.ok(!hasBuff(h.p, 'g_u_furia') && h.p.hp - hpEnd >= h.p.stats.maxHP * 0.19, `Furia Inmortal: al acabar te curas un 20 % (${Math.round(h.p.hp - hpEnd)})`);
assert.equal(resolveSkill(h.p, SK('g_rajar')).cost, 15, 'al terminar, el coste vuelve');

// ---- Guardián ----
// Cambio de Guardia: Muralla ↔ Ariete; sin tiempo global; cambiar se recarga en 3 s
h = mk(12, 'guardian'); h.setSlot('k3', 'g_guardia');
assert.equal(h.cast('k3'), true);
assert.equal(h.g.stanceOf(h.p, 'g_guardia'), 'muralla');
assert.deepEqual(h.p.verbStats(), { dr: 15, block: 10 }, 'Muralla: −15 % y +10 % de bloqueo');
assert.ok(!(h.p.gcdT > 0), 'Cambio de Guardia: no gasta el tiempo global');
h.step(0.5); assert.equal(h.cast('k3'), false, 'cambiar: recarga 3 s');
h.tick(2.6); assert.equal(h.cast('k3'), true);
assert.equal(h.g.stanceOf(h.p, 'g_guardia'), 'ariete');
assert.deepEqual(h.p.verbStats(), { dmgPct: 15 }, 'Ariete: +15 % de daño');
assert.ok(approx(h.p.cds.g_guardia, 3, 0.01), 'el cambio deja 3 s');

// Carga de Escudo: 8 m en 1 s, imparable; arrastra a los que encuentra y al llegar provoca 3 s
h = mk(14, 'guardian'); e = h.enemy({ hp: 1e6, pos: [3, 0, 0.5] }); e2 = h.enemy({ hp: 1e6, pos: [3, 0, 6] });
h.aim(10, 0); h.setSlot('k1', 'g_carga_escudo'); assert.equal(h.cast('k1'), true);
h.step(0.5);
assert.ok(h.p.dashMove && h.p.pos.x > 3 && h.p.pos.x < 5.5 && h.p.unstoppableT > 0, `Carga de Escudo: avance lento e imparable (x=${h.p.pos.x.toFixed(2)})`);
h.step(0.6);
assert.ok(approx(h.p.pos.x, 8, 0.1) && !h.p.dashMove, 'Carga de Escudo: 8 m en 1 s');
assert.ok(e.pos.x > 7 && e.hp < 1e6 && e.tauntT > 2.5, `Carga de Escudo: arrastra, golpea y provoca (x=${e.pos.x.toFixed(2)}, provocado ${e.tauntT?.toFixed(2)})`);
assert.ok(e2.pos.x === 3 && e2.hp === 1e6 && !(e2.tauntT > 0), 'Carga de Escudo: el apartado, ni arrastrado ni provocado');

// Terremoto: preparación 0,4 s; plantado (1 s quieto) suelta 2 réplicas al 50 %; en marcha, no
for (const planted of [true, false]) {
  h = mk(16, 'guardian'); e = h.enemy({ hp: 1e6, pos: [3, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  n = counter(e);
  if (planted) h.stand(1.1); else h.walk({ x: 0, z: 1 }, 0.3);
  assert.equal(h.p.planted, planted, `Terremoto: ${planted ? 'plantado' : 'en marcha'}`);
  h.setSlot('rmb', 'terremoto'); assert.equal(h.cast('rmb'), true);
  h.step(0.35); assert.equal(n.hits, 0, 'Terremoto: se prepara 0,4 s');
  h.step(1.3);
  assert.equal(n.hits, planted ? 3 : 1, `Terremoto ${planted ? 'plantado: golpe + 2 réplicas' : 'en marcha: un golpe'} (${n.hits})`);
  assert.ok(e2.hp === 1e6 && h.p.mp === 70, 'Terremoto: 5 m; cuesta 30');
}

// Ciudadela: te clavas 8 s (no te mueves), −40 % a ti y a tus aliados a 6 m, provocas a 10 m cada segundo
h = mk(17, 'guardian'); e = h.enemy({ hp: 1e6, pos: [8, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [14, 0, 0] });
const near = h.ally(4, 0), far = h.ally(12, 0);
h.setSlot('k4', 'g_u_ciudadela'); assert.equal(h.cast('k4'), true);
assert.ok(e.tauntT > 1 && !(e2.tauntT > 0), 'Ciudadela: provoca a 10 m al clavarte');
h.walk({ x: 1, z: 0 }, 1.0);
assert.ok(approx(h.p.pos.x, 0, 1e-6) && h.p.planted, 'Ciudadela: no te mueves y cuentas como plantado');
assert.ok(hasBuff(h.p, 'g_u_ciudadela') && hasBuff(near, 'g_u_ciudadela') && !hasBuff(far, 'g_u_ciudadela'), 'Ciudadela: −40 % a ti y a tus aliados a 6 m');
assert.equal(h.p.buffs.find(b => b.id === 'g_u_ciudadela').stats.dr, 40);
e.tauntT = 0; h.tick(1.1);
assert.ok(e.tauntT > 0, 'Ciudadela: la provocación se repite cada segundo');
h.tick(7.5); e.tauntT = 0; h.tick(1.2);
assert.ok(!(e.tauntT > 0) && !hasBuff(h.p, 'g_u_ciudadela'), 'Ciudadela: 8 s y se acaba');
h.walk({ x: 1, z: 0 }, 0.5);
assert.ok(h.p.pos.x > 0.5, 'Ciudadela: al acabar vuelves a moverte');
assert.ok(h.p.cdMax.g_u_ciudadela === 90, 'Ciudadela: recarga 90 s');

// ---- Cruzado ----
// Juicio: se prepara 0,3 s; martillo de luz que marca 8 s (también a los de 3 m); tu siguiente
// principal detona la marca (+100 % a ese enemigo) y la consume
h = mk(12, 'cruzado'); e = h.enemy({ hp: 1e6, pos: [6, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [7.5, 0, 1] }); e3 = h.enemy({ hp: 1e6, pos: [6, 0, 6] });
h.aim(6, 0); h.setSlot('k3', 'g_juicio'); assert.equal(h.cast('k3'), true);
h.step(0.25); assert.equal(e.hp, 1e6, 'Juicio: se prepara');
h.step(0.6);
assert.ok(e.hp < 1e6 && e2.hp < 1e6 && e3.hp === 1e6, 'Juicio: 120 % a 3 m del impacto');
assert.ok(e.marks?.juicio?.t > 7 && e2.marks?.juicio && !e3.marks?.juicio, 'Juicio: marca a los golpeados 8 s');
assert.equal(h.p.mp, 80, 'Juicio: 20 de Furia');
const dets = []; const md = h.g.markDetonation.bind(h.g);
h.g.markDetonation = (en, hit) => { const r = md(en, hit); if (r) dets.push({ en, skill: hit.skill, r }); return r; };
h.p.pos.set(4, 0, 0); h.aim(6, 0); h.setSlot('rmb', 'g_hendidura'); h.tick(0.3);
assert.equal(h.cast('rmb'), true); h.step(0.4);
assert.ok(dets.some(d => d.en === e && d.skill === 'g_hendidura' && d.r === 100), 'Juicio: la siguiente principal (Hendidura) la detona: +100 %');
assert.ok(!e.marks?.juicio, 'Juicio: la marca se consume');

// Sendero de Luz: destello de 8 m que deja 4 s un sendero: daña al enemigo y cura a tu aliado
h = mk(14, 'cruzado'); e = h.enemy({ hp: 1e6, pos: [4, 0, 0.5] });
const ally = h.ally(5, 0, 1000); ally.hp = 500;
h.aim(10, 0); h.setSlot('k1', 'g_sendero'); assert.equal(h.cast('k1'), true);
assert.ok(h.p.pos.x > 7.5 && h.p.pos.x <= 8, `Sendero: destello de 8 m (${h.p.pos.x.toFixed(2)})`);
const trail = h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_sendero' });
assert.ok(trail.length === 1 && trail[0].shape === 'line' && approx(trail[0].dur, 4), 'Sendero: deja una franja 4 s');
const hpE = e.hp; h.tick(2);
assert.ok(e.hp < hpE && ally.hp > 500, `Sendero: daña al enemigo dentro y cura al aliado (${ally.hp})`);
h.tick(2.2);
assert.equal(h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_sendero' }).length, 0, 'Sendero: dura 4 s');

// Martillo de Guerra: cargar y soltar; la carga sube daño y radio; la ventana perfecta da +25 % y 1 de Fervor
const hammer = hold => {
  const hh = mk(16, 'cruzado');
  const a = hh.enemy({ hp: 1e7, pos: [2.5, 0, 0] }), b = hh.enemy({ hp: 1e7, pos: [6.8, 0, 0] });
  hh.aim(10, 0); hh.setSlot('rmb', 'g_martillo');
  assert.equal(hh.press('rmb'), true);
  hh.step(hold);
  const mp = hh.p.mp;
  hh.release('rmb'); hh.step(0.1);
  return { hh, a: 1e7 - a.hp, b: 1e7 - b.hp, spent: mp - hh.p.mp };
};
const tap = hammer(0.05), perfect = hammer(1.0);
assert.ok(tap.a > 0 && tap.b === 0, 'Martillo: un toque golpea 3 m (el de 4,3 m, no)');
assert.ok(perfect.b > 0, 'Martillo cargado: el radio crece (hasta 5 m)');
assert.ok(perfect.a > 2.2 * tap.a, `Martillo: la carga sube el daño (${Math.round(tap.a)} → ${Math.round(perfect.a)})`);
assert.ok(tap.spent === 25 && perfect.spent === 25, 'Martillo: 25 de Furia al soltar');
assert.equal(perfect.hh.sfxCount('verb_perfect'), 1, 'Martillo: suelta en la ventana = perfecto');
assert.equal(tap.hh.sfxCount('verb_perfect'), 0);
assert.equal(perfect.hh.gaugeValue('fervor'), 1, 'Martillo perfecto: +1 de Fervor');
assert.equal(tap.hh.gaugeValue('fervor'), 0);
{ // caminas al 50 % mientras cargas
  const hh = mk(16, 'cruzado'); hh.aim(10, 0); hh.setSlot('rmb', 'g_martillo');
  hh.walk({ x: 0, z: 1 }, 0.5); const free = hh.p.pos.z; hh.p.pos.set(0, 0, 0);
  hh.press('rmb'); hh.walk({ x: 0, z: 1 }, 0.5);
  assert.ok(approx(hh.p.pos.z / free, 0.5, 0.06), `Martillo: caminas al 50 % mientras cargas (${(hh.p.pos.z / free).toFixed(2)})`);
}

// Cataclismo: carga hasta 2 s; cae DONDE APUNTAS AL SOLTAR 0,3 s después y consagra el suelo 6 s
h = mk(17, 'cruzado'); e = h.enemy({ hp: 1e7, pos: [-8, 0, 0] }); e2 = h.enemy({ hp: 1e7, pos: [8, 0, 0] });
n = counter(e2);
h.aim(8, 0); h.setSlot('k4', 'g_u_cataclismo');
assert.equal(h.press('k4'), true);
h.step(1.0); h.aim(-8, 0); h.step(0.8);
h.release('k4'); h.step(0.1);
assert.equal(e.hp, 1e7, 'Cataclismo: la luz tarda 0,3 s');
h.step(0.3);
assert.ok(e.hp < 1e7 && n.hits === 0, 'Cataclismo: cae donde apuntas al soltar (no donde empezaste)');
assert.equal(h.sfxCount('verb_perfect'), 1, 'Cataclismo: 1,8 s = ventana perfecta');
assert.equal(h.gaugeValue('fervor'), 3, 'Cataclismo perfecto: +3 de Fervor');
const floor = h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_u_cataclismo' });
assert.ok(floor.length === 1 && approx(floor[0].dur, 6) && approx(floor[0].pos.x, -8, 0.1), 'Cataclismo: consagra el suelo 6 s');
const hpF = e.hp; h.tick(2);
assert.ok(e.hp < hpF, 'Cataclismo: el suelo consagrado daña');
h.tick(4.5);
assert.equal(h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_u_cataclismo' }).length, 0, 'Cataclismo: el suelo dura 6 s');
assert.equal(h.p.cdMax.g_u_cataclismo, 60, 'Cataclismo: recarga 60 s');

// ---- activas de talento (con su nodo) ----
const withGrant = (id, level = 80, spec = 'guardian') => { const hh = mk(level, spec); hh.p.talentExtra.grants.add(id); hh.p.recompute(); hh.setSlot('k2', id); return hh; };
// Grito de Guerra: +30 de Furia y +10 % de daño a ti y a tu grupo a 15 m, 8 s
h = withGrant('grito_guerra'); h.p.mp = 0;
const mate = h.ally(10, 0), lone = h.ally(20, 0);
const dmg0 = h.p.stats.dmgPct;
assert.equal(h.cast('k2'), true, 'Grito: sin coste');
assert.ok(h.p.mp === 30 && h.p.stats.dmgPct === dmg0 + Math.round(10 * (1 + 0.06 * (rankBase(80, 27) - 1))), 'Grito: +30 de Furia y +10 % (por rango)');
assert.ok(hasBuff(mate, 'grito_guerra') && !hasBuff(lone, 'grito_guerra'), 'Grito: al grupo a 15 m');
assert.equal(h.p.cdMax.grito_guerra, 20);

// Bramido de Titán: aturde 1,5 s a 6 m SIN daño; a los jefes, 30 de Quebranto
h = withGrant('g_h_bramido');
e = h.enemy({ hp: 1e6, pos: [4, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [9, 0, 0] }); e3 = h.enemy({ hp: 1e6, pos: [0, 0, 5], boss: true });
assert.equal(h.cast('k2'), true);
assert.ok(approx(e.stunT, 1.5, 0.05) && e.hp === 1e6, 'Bramido: aturde 1,5 s sin dañar');
assert.ok(!(e2.stunT > 0), 'Bramido: a 9 m, no');
assert.ok(approx(e3.stagger, staggerFromCC('stun', 1)) && approx(e3.stagger, 30) && e3.hp === 1e6, 'Bramido: al jefe, 30 de Quebranto');
assert.equal(h.p.cdMax.g_h_bramido, 30);

// Desafío de Arena: encierra al enemigo de la mira contigo 8 s (no puede salir) y recibe +20 %
h = withGrant('g_h_desafio', 80, 'berserker');
e = h.enemy({ hp: 1e6, pos: [5, 0, 0] }); e2 = h.enemy({ hp: 1e6, pos: [0, 0, 8] });
h.aim(5, 0); assert.equal(h.cast('k2'), true);
const arena = h.g.fieldsOf(h.p, { kind: 'zona', skill: 'g_h_desafio' });
assert.ok(arena.length === 1 && arena[0].data.contain && approx(arena[0].dur, 8) && approx(arena[0].pos.x, 2.5, 0.05), 'Desafío: círculo de 6 m entre los dos, 8 s');
assert.ok(e.weaknessPct() >= 20 && e2.weaknessPct() === 0 && e.hp === 1e6, 'Desafío: el Rival recibe +20 % (Debilidad), sin daño');
const bx = e.pos.x; e.pos.x = 9; h.g.constrainMove(e, bx, e.pos.z);
assert.equal(e.pos.x, bx, 'Desafío: el Rival no puede salir del círculo');
h = withGrant('g_h_desafio', 80, 'berserker'); h.aim(5, 0);
assert.equal(h.cast('k2'), true);
assert.ok(!(h.p.cds.g_h_desafio > 0) && h.messages().some(m => /alcance/.test(m)), 'Desafío sin enemigo: no gasta la recarga');

// Estandarte de Guerra: clava un Pendón en la mira (a 15 m): +8 % de daño y −8 % recibido a 8 m, 12 s
h = withGrant('g_h_estandarte', 80, 'cruzado');
const inBanner = h.ally(12, 0), outBanner = h.ally(0, 0);
h.aim(12, 0); assert.equal(h.cast('k2'), true);
const banner = h.g.fieldsOf(h.p, { kind: 'aura', skill: undefined }).find(f => f.data.buffId === 'g_h_estandarte');
assert.ok(banner && approx(banner.pos.x, 12, 0.1) && approx(banner.dur, 12) && banner.radius === 8, 'Estandarte: Pendón en la mira, 8 m, 12 s');
h.tick(0.6);
assert.ok(hasBuff(inBanner, 'g_h_estandarte') && !hasBuff(outBanner, 'g_h_estandarte') && !hasBuff(h.p, 'g_h_estandarte'), 'Estandarte: solo a los que están dentro');
assert.equal(h.p.cdMax.g_h_estandarte, 30);

// las de clase (comportamientos de js/powers-guerrero.js): se lanzan con su nodo
for (const id of ['g_t_aliento', 'g_t_intervencion']) {
  h = withGrant(id); h.aim(5, 0);
  assert.equal(h.cast('k2'), true, `${id}: se lanza`);
  h.tick(1);
  assert.equal(h.p.cdMax[id], SK(id).cd, `${id}: recarga ${SK(id).cd} s`);
}

assert.deepEqual(warns, [], 'ningún comportamiento lanzó errores');
console.log('En el arnés: kit base, Berserker, Guardián, Cruzado y activas de talento ✓');

// ------------------------------------------------ 6) tablas legadas con la migración REAL
// js/save-legacy-guerrero.js pasado por migrateV4toV5 con saves v4 sintéticos: la barra de
// docs/paso2g-guerrero.md §11.6.3 y la forja desde la 3.ª rama de v4 (plan §3.11: se escribe
// desde v4 con el criterio de 2f §6.1; la mecánica igual primero)
{
  const CAT4 = JSON.parse(readFileSync(new URL('./fixtures/catalog-v4.json', import.meta.url), 'utf8')).classes.guerrero;
  const v4Ids = new Set([...CAT4.skills.map(s => s.id), ...(CAT4.classGrants || []), ...Object.values(CAT4.specs).flatMap(s => s.grants || [])]);
  // `removed` = exactamente los ids v4 que ya no están en el libro, y todos tienen destino en la barra
  const gone = [...v4Ids].filter(id => !SK(id)).sort();
  assert.deepEqual([...GUERRERO_LEGACY.removed].sort(), gone, 'removed: los ids v4 que desaparecen (sus soportes vuelven a la bolsa)');
  for (const id of gone) assert.ok(GUERRERO_LEGACY.bar[id], `bar.${id}: una habilidad retirada tiene destino`);
  assert.equal(LEGACY_TABLES.guerrero, GUERRERO_LEGACY, 'save-schema migra con esta tabla');
  const migrate = (spec, hotbar, skillMods = {}, level = 20) => migrateV4toV5({
    classId: 'guerrero', level, xp: 0, hotbar: { lmb: null, rmb: null, k1: null, k2: null, k3: null, k4: null, ...hotbar },
    skillMods, skillBranches: {}, skillPoints: 0, talents: { spec }, paragon: {}, materials: [], supports: {}, knownSupports: [] }, { forgeReco: {} });   // solo la tabla legada (la ★ de D3: test-save-2g)
  // §11.6.3 · barra: básicos → Tajo; gastadoras del kit solo con su especialización (si no,
  // Hendidura); movilidad, insignia y definitiva de su especialización; utilidades → Piel de Hierro
  const BAR_CASES = [
    ['berserker', { lmb: 'g_mandoble', rmb: 'torbellino', k1: 'g_salto', k2: 'g_t_ira_ciega', k3: 'g_t_remolino', k4: 'g_u_cataclismo' },
      { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'g_salto', k2: 'g_piel', k3: 'g_remolino', k4: 'g_u_furia' }, { g_tajo: 'i' }],
    ['guardian', { lmb: 'g_embate', rmb: 'terremoto', k1: 'g_salto', k2: 'g_t_muro', k3: 'g_t_desafio', k4: 'g_u_estandarte' },
      { lmb: 'g_tajo', rmb: 'terremoto', k1: 'g_carga_escudo', k2: 'g_piel', k3: 'g_guardia', k4: 'g_u_ciudadela' }, { g_tajo: 'ii' }],
    ['cruzado', { lmb: 'g_tajo', rmb: 'g_martillo', k1: 'g_salto', k2: 'g_provocacion', k3: 'g_t_devocion', k4: 'g_u_furia' },
      { lmb: 'g_tajo', rmb: 'g_martillo', k1: 'g_sendero', k2: 'g_piel', k3: 'g_juicio', k4: 'g_u_cataclismo' }, {}],
    ['berserker', { rmb: 'g_martillo', k3: 'g_t_veredicto' }, { lmb: 'g_tajo', rmb: 'g_hendidura', k1: null, k2: null, k3: 'g_remolino', k4: null }, {}],
    ['cruzado', { rmb: 'terremoto', k2: 'g_t_justicia', k4: 'g_u_estandarte' }, { lmb: 'g_tajo', rmb: 'g_hendidura', k1: null, k2: 'g_piel', k3: null, k4: 'g_u_cataclismo' }, {}],
  ];
  for (const [spec, bar, want, forge] of BAR_CASES) {
    const d = migrate(spec, bar);
    assert.deepEqual(d.hotbar, want, `${spec} ${JSON.stringify(bar)}: barra de §11.6.3`);
    assert.deepEqual(d.skillForge, forge, `${spec} ${JSON.stringify(bar)}: variante que fija la absorción`);
  }
  // forja: opción de la 3.ª rama de v4 → variante 2g
  const FORGE_CASES = [
    ['cruzado', { g_tajo: { v: 'g_tajo_v1' } }, { g_tajo: 'i' }],                            // Desangrar → Desgarro
    ['cruzado', { g_tajo: { v: 'g_tajo_v3' } }, { g_tajo: 'ii' }],                           // Rebote → Siega
    ['cruzado', { g_martillo: { v: 'g_martillo_v1' } }, { g_martillo: 'ii' }],               // Onda → Onda Sagrada
    ['guardian', { terremoto: { v: 'terremoto_v3' } }, { terremoto: 'i' }],                  // Decapitar → Martinete
    ['guardian', { terremoto: { v: 'terremoto_v1' } }, { terremoto: 'ii' }],                 // Estela → Falla
    ['cruzado', { g_u_cataclismo: { v: 'g_u_cataclismo_v3' } }, { g_u_cataclismo: 'i' }],    // Decapitar → Rayo del Cielo
    ['berserker', { torbellino: { v: 'torbellino_v1' } }, { g_hendidura: 'ii' }],            // Estela → Grieta (la barra lo lleva a Hendidura)
    ['berserker', { g_piel: { v: 'g_piel_v3' } }, { g_piel: 'ii' }],                         // Purga → Inamovible
    ['berserker', { g_lanza: { v: 'g_lanza_v1' } }, { g_lanza: null }],                      // Atravesar: sin variante («por elegir»)
  ];
  for (const [spec, mods, want] of FORGE_CASES) assert.deepEqual(migrate(spec, { lmb: 'g_tajo' }, mods).skillForge, want, `${spec} ${JSON.stringify(mods)}: forja legada`);
  // la rama elegida gana a la absorción por defecto de la barra (Embate → Siega, pero Desangrar → Desgarro)
  assert.deepEqual(migrate('guardian', { lmb: 'g_embate' }, { g_embate: { v: 'g_embate_v1' } }).skillForge, { g_tajo: 'i' }, 'Embate con Desangrar → Desgarro');
  // idempotente: una segunda pasada no cambia nada
  const once = migrate('cruzado', BAR_CASES[2][1], { g_martillo: { v: 'g_martillo_v1' } });
  assert.deepEqual(migrateV4toV5(JSON.parse(JSON.stringify(once))).hotbar, once.hotbar, 'segunda pasada: misma barra');
}
console.log('Tablas legadas: barra de §11.6.3, forja desde la 3.ª rama de v4 y retiradas, con la migración real ✓');
console.warn = origWarn;
console.log('\n✅ HABILIDADES DEL GUERRERO (2g) OK');
