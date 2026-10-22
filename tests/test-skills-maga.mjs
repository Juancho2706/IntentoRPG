// Paso 2 (2f + 2g) — catálogo de la MAGA (docs/paso2g-maga-coherencia.md §5, A.6, A.7;
// docs/paso2-implementacion.md §3.5, §3.6, §3.11, D7, D29)
//  1) catálogo 2g: 23 habilidades (kit base 5 · kit por especialización 4×3 · 6 activas de
//     talento), formato v2 sin errores ni avisos, VFX propios y nada de lo retirado
//  2) ranuras, activas solo en la 2 (G2), kits solo con su especialización (D7), concesión
//  3) barras por especialización y de reserva; chooseSpec llena las ranuras 3 y 4 a Nv15
//  4) tablas legadas (§3.11) contra catalog-v4.json y una migración v4 → v5 de muestra
//  5) comportamientos con el canal de lanzamiento REAL (arnés)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, SPEC_BAR, FALLBACK_BAR, CATALOG_V, specKitOf } from '../js/data.js';
import { validateSkillDef, CAT_SLOTS, SLOT_KEYS, skillVerbs, forgeDef } from '../js/skill-defs.js';
import { SKILL_BEHAVIORS, definePower, POWER_HOOKS } from '../js/powers.js';
import { resolveSkill, fitsSlot, isKnown } from '../js/skill-resolve.js';
import * as SK from '../js/skills-maga.js';
import { MAGA_FX, MAGA_FX_PRESETS, MAGA_FORGE_FX } from '../js/fx-skills-maga.js';
import { SKILL_FX, SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { TALENT_TREES } from '../js/talents.js';
import { talentMethods } from '../js/game-talents.js';
import * as S from '../js/save-schema.js';
import { MAGA_LEGACY } from '../js/save-legacy-maga.js';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import { makeHarness } from './helpers/power-harness.mjs';

const json = o => JSON.parse(JSON.stringify(o));
const SKILLS = CLASSES.maga.skills;
const byId = id => SKILLS.find(s => s.id === id);
const lost = e => e.maxHP - e.hp;
const noCrit = h => { h.p.stats.critRaw = -1000; h.p.stats.crit = -1000; };
// un fallo dentro de un comportamiento lo traga el canal con console.warn: aquí es un error
const warnings = [];
const warn0 = console.warn;
console.warn = (...a) => { warnings.push(a.map(String).join(' ')); warn0(...a); };
const noWarnings = what => { assert.deepEqual(warnings.filter(w => w.includes('[habilidad') || w.includes('[proyectil') || w.includes('[campo')), [], `${what}: sin errores en el canal`); warnings.length = 0; };

// ------------------------------------------------ 1) catálogo 2g
const EXPECTED = {
  // id: [cat, req, spec | null, elem, kind]
  m_dardo: ['basic', 1, null, 'arcane'], bola_fuego: ['spender', 2, null, 'fire'], m_parpadeo: ['movement', 4, null, 'arcane'],
  m_barrera: ['defense', 6, null, 'arcane'], nova_hielo: ['spender', 8, null, 'frost'],
  p_llamarada: ['spec', 10, 'piromante', 'fire'], m_estela_ignea: ['movement', 12, 'piromante', 'fire'],
  meteoro: ['spender', 14, 'piromante', 'fire'], m_u_supernova: ['ultimate', 15, 'piromante', 'fire'],
  k_prision: ['spec', 10, 'crionte', 'frost'], m_paso_escarcha: ['movement', 12, 'crionte', 'frost'],
  k_lanza: ['spender', 14, 'crionte', 'frost'], m_u_tormenta: ['ultimate', 15, 'crionte', 'frost'],
  a_orbe: ['spec', 10, 'arcanista', 'arcane'], a_sello: ['utility', 12, 'arcanista', 'arcane'],
  rayo: ['spender', 14, 'arcanista', 'arcane'], m_u_desgarro: ['ultimate', 15, 'arcanista', 'arcane'],
  m_t_bloque: ['defense', 21, null, 'frost', 'talent'], m_t_inversion: ['defense', 27, null, 'arcane', 'talent'],
  m_t_contrahechizo: ['utility', 31, null, 'arcane', 'talent'], m_h_detener: ['utility', 72, null, 'arcane', 'talent'],
  m_h_palabra: ['utility', 72, null, 'arcane', 'talent'], m_h_constructo: ['defense', 73, null, 'arcane', 'talent'],
};
const RETIRED = ['m_ascua', 'm_toque', 'm_armadura', 'm_onda', 'm_t_barrera', 'm_t_parpadeo', 'p_combustion', 'p_muro_fuego',
  'k_ventisca', 'k_aliento', 'a_misiles', 'a_evocacion'];
assert.equal(SK.MAGA_CATALOG_V, 2, 'catálogo 2g');
assert.equal(CATALOG_V.maga, 2);
assert.equal(CLASSES.maga.catalogV, 2);
assert.deepEqual(SKILLS.map(s => s.id).sort(), Object.keys(EXPECTED).sort(), 'las 23 habilidades del catálogo 2g y ninguna más');
assert.equal(SK.MAGA_SKILLS.length, 23);
for (const id of RETIRED) assert.ok(!byId(id) && !MAGA_FX[id], `${id}: retirada (A.6)`);
assert.deepEqual(SK.MAGA_SKILL_MODS, {}, 'sin ramas (D23)');
for (const s of SK.MAGA_SKILLS) {
  const w = [];
  assert.deepEqual(validateSkillDef(s, { behaviors: SKILL_BEHAVIORS, v2: true, warnings: w }), [], `${s.id}: formato v2`);
  assert.deepEqual(w, [], `${s.id}: sin claves desconocidas`);
  const [cat, req, spec, elem, kind] = EXPECTED[s.id];
  assert.equal(s.cat, cat, `${s.id}: categoría`);
  assert.equal(s.req, req, `${s.id}: nivel`);
  assert.equal(s.spec || null, spec, `${s.id}: especialización`);
  assert.equal(s.elem, elem, `${s.id}: elemento`);
  assert.equal(s.kind || null, kind || null, `${s.id}: kind`);
  assert.ok(/\d/.test(s.desc) && s.line && s.line.length <= 120, `${s.id}: línea corta y descripción con números`);
  if (s.behavior) {
    assert.ok(SKILL_BEHAVIORS[s.behavior], `${s.id}: comportamiento «${s.behavior}» registrado`);
    if (SK.MAGA_SKILL_BEHAVIORS[s.behavior]) assert.equal(SKILL_BEHAVIORS[s.behavior].cast, SK.MAGA_SKILL_BEHAVIORS[s.behavior].cast, `${s.behavior}: el de este catálogo`);
  }
  assert.equal(SKILL_FX[s.id], MAGA_FX[s.id], `${s.id}: VFX propio fusionado en SKILL_FX`);
}
// los comportamientos propios se usan todos, en el catálogo o en una variante de la forja (nada
// muerto), y no pisan ids de otro dueño
const forgeBeh = Object.values(SK.MAGA_SKILL_FORGE).flatMap(e => [e.mejora, ...e.vars]).map(x => x?.behavior).filter(Boolean);
const usedBeh = new Set([...SK.MAGA_SKILLS.map(s => s.behavior).filter(Boolean), ...forgeBeh]);
for (const id of Object.keys(SK.MAGA_SKILL_BEHAVIORS)) assert.ok(usedBeh.has(id), `comportamiento ${id} sin habilidad`);
// las gastadoras cuestan y se recargan; las definitivas no cuestan; el básico genera 3
for (const s of SK.MAGA_SKILLS.filter(x => x.cat === 'spender' || x.cat === 'spec')) assert.ok(s.cd > 0 && s.cost > 0, `${s.id}: coste y enfriamiento`);
for (const s of SK.MAGA_SKILLS.filter(x => x.cat === 'ultimate')) assert.ok(!s.cost && s.cd >= 45, `${s.id}: definitiva sin coste`);
assert.equal(byId('m_dardo').gen, 3);
// líneas del libro = las del mockup congelado (D18), salvo las divergencias declaradas en
// tools/convert-v2/divergencias.json con ruta catalogo.<id>.line (test-v2-paridad no compara líneas)
{
  const { C } = cargarMockup('maga');
  const divs = JSON.parse(readFileSync(new URL('../tools/convert-v2/divergencias.json', import.meta.url), 'utf8')).divergencias;
  const declared = new Set(divs.filter(d => d.clase === 'maga' && /^catalogo\.\w+\.line$/.test(d.ruta)).map(d => d.ruta.split('.')[1]));
  assert.equal(C.catalog.length, SK.MAGA_SKILLS.length);
  for (const m of C.catalog) {
    const line = SK.MAGA_SKILLS.find(s => s.id === m.id)?.line;
    if (declared.has(m.id)) assert.notEqual(line, m.s, `${m.id}: divergencia de línea declarada que ya no diverge`);
    else assert.equal(line, m.s, `${m.id}: la línea del mockup (o declara catalogo.${m.id}.line)`);
  }
}
// VFX: una entrada por habilidad y ninguna más; presets que existen y sonidos válidos
assert.deepEqual(Object.keys(MAGA_FX).sort(), Object.keys(EXPECTED).sort(), 'MAGA_FX = catálogo');
const usedPresets = new Set();
for (const [id, fx] of Object.entries(MAGA_FX)) {
  for (const k of ['trail', 'impact', 'aura', 'extra']) {
    if (typeof fx[k] !== 'string') continue;
    assert.ok(SKILL_FX_PRESETS[fx[k]], `${id}.${k}: preset ${fx[k]} inexistente`);
    usedPresets.add(fx[k]);
  }
  assert.ok(['fire', 'ice', 'bolt', 'dash', 'portal'].includes(fx.sfx), `${id}: sfx`);
}
// presets propios: todos en uso, por una habilidad o por una variante de la forja (MAGA_FORGE_FX,
// que comprueba test-forge-maga)
for (const fx of Object.values(MAGA_FORGE_FX)) for (const v of Object.values(fx)) usedPresets.add(v);
for (const k of Object.keys(MAGA_FX_PRESETS)) {
  assert.equal(SKILL_FX_PRESETS[k], MAGA_FX_PRESETS[k], `preset ${k} fusionado`);
  assert.ok(usedPresets.has(k), `preset ${k} sin uso`);
}
console.log('Catálogo 2g de la Maga: 23 habilidades, formato v2 limpio, retiradas fuera y VFX ✓');

// ------------------------------------------------ 2) ranuras, activas (G2), kits (D7) y concesión
for (const s of SKILLS) {
  const allowed = s.kind === 'talent' ? ['k2'] : s.slots;
  for (const slot of SLOT_KEYS) assert.equal(fitsSlot(s, slot), allowed.includes(slot), `${s.id} en ${slot}`);
  if (s.kind !== 'talent') for (const slot of s.slots) assert.ok((CAT_SLOTS[s.cat] || []).includes(slot) || s.cat === 'spec', `${s.id}: ${slot} de su categoría`);
}
for (const s of SKILLS.filter(x => x.kind === 'talent')) {
  assert.deepEqual(s.slots, ['k2'], `${s.id}: activa solo en la ranura 2 (G2)`);
  assert.ok(['defense', 'utility'].includes(s.cat) && !s.spec, `${s.id}: defensa/utilidad sin especialización`);
}
// cada especialización: insignia (ranura 3), movilidad o utilidad, principal y definitiva
for (const sp of ['piromante', 'crionte', 'arcanista']) {
  const kit = specKitOf('maga', sp).map(byId);
  assert.equal(kit.length, 4, `${sp}: kit de 4`);
  assert.deepEqual(kit.map(s => s.req).sort((a, b) => a - b), [10, 12, 14, 15], `${sp}: Nv 10/12/14/15`);
  assert.ok(kit.some(s => s.cat === 'spec') && kit.some(s => s.cat === 'ultimate'), `${sp}: insignia y definitiva`);
}
// cada activa la concede exactamente un nodo (clase o árbol héroe) con `grant`
const grants = new Map();
const walk = (o, path) => {
  if (!o || typeof o !== 'object') return;
  if (o.fx && typeof o.fx.grant === 'string') grants.set(o.fx.grant, [...(grants.get(o.fx.grant) || []), path]);
  for (const [k, v] of Object.entries(o)) if (k !== 'fx') walk(v, `${path}.${k}`);
};
walk(TALENT_TREES.maga, 'maga');
for (const s of SKILLS.filter(x => x.kind === 'talent')) assert.equal(grants.get(s.id)?.length, 1, `${s.id}: un nodo con grant (${grants.get(s.id)})`);
// conocidas: base por nivel; kit SOLO con su especialización; activas SOLO concedidas
{
  const none = makeHarness({ classId: 'maga', level: 15 });
  for (const s of SKILLS) assert.equal(isKnown(none.p, s), !s.spec && s.kind !== 'talent' && s.req <= 15, `${s.id} sin especialización a Nv15`);
  for (const sp of ['piromante', 'crionte', 'arcanista']) {
    const h = makeHarness({ classId: 'maga', level: 15, spec: sp });
    for (const s of SKILLS.filter(x => x.spec)) assert.equal(isKnown(h.p, s), s.spec === sp, `${s.id} con ${sp}`);
  }
  const h74 = makeHarness({ classId: 'maga', level: 74 });
  assert.equal(isKnown(h74.p, byId('m_h_constructo')), false, 'sin el nodo, la activa no se conoce');
  h74.p.talentExtra.grants.add('m_h_constructo'); h74.p.recompute();
  assert.equal(isKnown(h74.p, byId('m_h_constructo')), true, 'con el nodo, sí');
}
console.log('Ranuras por categoría, activas solo en la 2, kits solo con su especialización y concesión por nodo ✓');

// ------------------------------------------------ 3) barras
const SPECS = ['piromante', 'crionte', 'arcanista'];
assert.deepEqual(Object.keys(SK.MAGA_SPEC_BAR).sort(), [...SPECS].sort());
for (const sp of SPECS) {
  const b = SK.MAGA_SPEC_BAR[sp];
  assert.equal(SPEC_BAR[sp], b, `${sp}: fusionada en data.SPEC_BAR`);
  assert.deepEqual(Object.keys(b.bar).sort(), [...SLOT_KEYS].sort(), `${sp}: las 6 ranuras`);
  for (const [slot, id] of Object.entries(b.bar)) {
    const s = byId(id);
    assert.ok(s && fitsSlot(s, slot), `${sp}.${slot}: ${id} cabe`);
    assert.ok(!s.spec || s.spec === sp, `${sp}.${slot}: ${id} es de su kit o base`);
    assert.ok(s.req <= 15 && s.kind !== 'talent', `${sp}.${slot}: ${id} disponible a Nv15`);
  }
  assert.equal(new Set(Object.values(b.bar)).size, 6, `${sp}: sin repetidas`);
  assert.equal(b.bar.k3, specKitOf('maga', sp).find(id => byId(id).cat === 'spec'), `${sp}: la insignia en la ranura 3`);
  assert.ok(Object.values(b.bar).includes(b.sel), `${sp}: sel en la barra`);
  for (const [id, v] of Object.entries(b.forge || {})) assert.ok(byId(id) && ['i', 'ii'].includes(v), `${sp}: forja ${id}=${v}`);
}
assert.equal(FALLBACK_BAR.maga, SK.MAGA_FALLBACK_BAR);
for (const [slot, id] of Object.entries(SK.MAGA_FALLBACK_BAR)) {
  if (id === null) { assert.ok(slot === 'k3' || slot === 'k4', `reserva: ${slot} vacía`); continue; }
  const s = byId(id);
  assert.ok(s && fitsSlot(s, slot) && !s.spec && s.kind !== 'talent', `reserva: ${slot}=${id} del kit base`);
}
// chooseSpec a Nv15 llena las ranuras 3 y 4 (la comprobación del humo, aquí sin navegador)
for (const sp of SPECS) {
  const h = makeHarness({ classId: 'maga', level: 15 });
  Object.assign(h.g, talentMethods);
  h.p.hotbar = { ...SK.MAGA_FALLBACK_BAR };
  assert.equal(h.g.chooseSpec(sp).ok, true, `chooseSpec(${sp})`);
  assert.equal(h.p.hotbar.k3, SK.MAGA_SPEC_BAR[sp].bar.k3, `${sp}: ranura 3 con la insignia`);
  assert.equal(h.p.hotbar.k4, SK.MAGA_SPEC_BAR[sp].bar.k4, `${sp}: ranura 4 con la definitiva`);
}
console.log('Barras: SPEC_BAR de cada especialización y reserva válidas; ranuras 3 y 4 llenas a Nv15 ✓');

// ------------------------------------------------ G17 (plan §8, E2): verbos por especialización
// ≥ 3 verbos en su kit (skillVerbs de la definición base, con la Mejora y con cada variante) y al
// menos uno que no use otra especialización (su verbo principal). El diseño de la Maga (2g §13
// llega hasta G16) es anterior a los verbos y NO lo cumple: excepción APROBADA por el Orquestador
// (plan, punto 17) con lo medido. Si el kit cambia,
// la declaración cambia con él; si una especialización pasa a cumplir, se quita su excepción
const G17_EXCEPTION = { piromante: ['follow'], crionte: ['follow'], arcanista: ['hold'] };
{
  const verbsOf = sp => {
    const out = new Set();
    for (const id of specKitOf('maga', sp)) {
      const sk = byId(id), e = SK.MAGA_SKILL_FORGE[id];
      const defs = [sk, ...[null, 'i', 'ii'].map(variant => forgeDef(sk, e, { mejora: true, variant }))];
      for (const d of defs) for (const v of skillVerbs(d)) out.add(v);
    }
    return [...out].sort();
  };
  const V = Object.fromEntries(SPECS.map(sp => [sp, verbsOf(sp)]));
  for (const sp of SPECS) {
    const own = V[sp].filter(v => SPECS.every(o => o === sp || !V[o].includes(v)));
    if (V[sp].length >= 3 && own.length) { assert.ok(!G17_EXCEPTION[sp], `${sp}: ya cumple G17, quita su excepción`); continue; }
    assert.deepEqual(V[sp], G17_EXCEPTION[sp], `${sp}: no cumple G17 (verbos ${V[sp].join(', ') || 'ninguno'}) y la excepción declarada no coincide`);
    console.log(`G17 ${sp}: ${V[sp].length} verbo(s) (${V[sp].join(', ') || 'ninguno'})${own.length ? '' : ', ninguno propio'}: excepción aprobada (punto 17) ✓`);
  }
}

// ------------------------------------------------ 4) tablas legadas (§3.11)
const CAT4 = JSON.parse(readFileSync(new URL('./fixtures/catalog-v4.json', import.meta.url), 'utf8')).classes.maga;
const v4Ids = new Set([...CAT4.skills.map(s => s.id), ...(CAT4.classGrants || []), ...Object.values(CAT4.specs).flatMap(s => s.grants || [])]);
const thirdBranch = id => (CAT4.mods?.[id]?.[2]?.opts || []).map(o => o.id);
const L = S.LEGACY_TABLES.maga;
assert.equal(L, MAGA_LEGACY, 'save-schema usa la tabla de la Maga');
assert.deepEqual(L.insignia, S.V4_INSIGNIA.maga, 'insignia = la congelada');
assert.ok(typeof L.notice === 'string' && L.notice.includes('Maga'), 'aviso de la Maga');
for (const [id, e] of Object.entries(L.bar)) {
  assert.ok(v4Ids.has(id) && !byId(id), `bar.${id}: habilidad v4 que ya no existe`);
  const dests = e.to && typeof e.to === 'object' ? Object.entries(e.to) : [['*', e.to]];
  for (const [k, to] of dests) {
    assert.ok(SLOT_KEYS.includes(k) || SPECS.includes(k) || k === '*', `bar.${id}: clave ${k}`);
    assert.ok(to === null || !!byId(to), `bar.${id}.${k}: destino ${to} en el catálogo`);
    if (SLOT_KEYS.includes(k) && to) assert.ok(fitsSlot(byId(to), k), `bar.${id}.${k}: ${to} cabe en ${k}`);
  }
  if ('forge' in e) assert.ok(['i', 'ii', null].includes(e.forge), `bar.${id}.forge`);
}
for (const [id, e] of Object.entries(L.forge)) {
  assert.ok(v4Ids.has(id), `forge.${id}: habilidad v4`);
  const absorbed = typeof e.to === 'string';
  if (absorbed) assert.ok(byId(e.to), `forge.${id}.to`);
  else assert.ok(byId(id), `forge.${id}: sigue en el catálogo`);
  for (const [opt, v] of Object.entries(absorbed ? e.map : e)) {
    assert.ok(thirdBranch(id).includes(opt), `forge.${id}: ${opt} es de la 3.ª rama v4`);
    assert.ok(['i', 'ii'].includes(v), `forge.${id}.${opt}: variante`);
  }
}
const removedWant = [...v4Ids].filter(id => !byId(id)).sort();
assert.deepEqual([...L.removed].sort(), removedWant, 'removed = todo lo v4 que ya no existe');
// barra, entrada por entrada (2g A.6)
assert.deepEqual(json(L.bar), {
  m_t_parpadeo: { to: 'm_parpadeo' },
  m_t_barrera: { to: 'm_barrera' }, m_armadura: { to: 'm_barrera' }, m_onda: { to: 'm_barrera' },
  m_ascua: { to: 'm_dardo', forge: 'i' }, m_toque: { to: 'm_dardo', forge: 'ii' },
  p_combustion: { to: 'p_llamarada' }, p_muro_fuego: { to: { k2: 'm_barrera', k3: 'p_llamarada' } },
}, 'barra = A.6');
// forja, entrada por entrada: cada opción de la 3.ª rama v4 va a la variante de SU papel en la
// habilidad destino (criterio de 2f §6: DoT/zona/radio y cadena → ÁREA; Vulnerable/ejecutar → UNI;
// ralentizar/aturdir → CONTROL; velocidad → MOVILIDAD; Invierno Eterno, +3 s de zona → ÁREA;
// Purga, sin papel). Sin variante de su papel no se escribe (le llega la recomendada, D3)
{
  const ROLE_OF = { Calcinar: 'AREA', Estela: 'AREA', Rebote: 'AREA', 'Invierno Eterno': 'AREA', Quebrantar: 'UNI', Decapitar: 'UNI',
    Tullir: 'CTRL', Conmocionar: 'CTRL', Impulso: 'MOV', Purga: null };
  const want = {};
  for (const [id, mods] of Object.entries(CAT4.mods || {})) {
    const opts = mods?.[2]?.opts || [];
    const to = byId(id) ? id : L.bar[id]?.to;                 // absorbida: el destino de su barra (A.6)
    assert.ok(typeof to === 'string' && SK.MAGA_SKILL_FORGE[to], `${id}: destino con forja`);
    const map = {};
    for (const o of opts) {
      assert.ok(o.name in ROLE_OF, `${id}: opción v4 «${o.name}» sin papel decidido`);
      const k = SK.MAGA_SKILL_FORGE[to].vars.findIndex(v => v.role === ROLE_OF[o.name]);
      if (ROLE_OF[o.name] && k >= 0) map[o.id] = k === 0 ? 'i' : 'ii';
    }
    if (Object.keys(map).length) want[id] = to === id ? map : { to, map };
  }
  assert.deepEqual(json(L.forge), want, 'forja: cada opción v4, a la variante de su papel');
}
// migración de muestra con las tablas y barras reales
{
  const v4 = o => ({
    saveVersion: 4, classId: 'maga', level: 40, xp: 100, statPoints: 0, skillPoints: 3, skillSystemV: 5,
    skillBranches: {}, skillMods: {}, hotbar: { lmb: 'm_dardo', rmb: 'bola_fuego', k1: null, k2: null, k3: null, k4: null },
    talents: { v: 1, spec: 'piromante', cls: {}, sp: { piromante: {}, crionte: {}, arcanista: {} }, choice: {} },
    paragon: { points: 0, nodes: {}, glyphs: {} }, materials: [], supports: {}, knownSupports: [], ...o,
  });
  const m = S.migrateV4toV5(json(v4({
    hotbar: { lmb: 'm_ascua', rmb: 'bola_fuego', k1: 'm_t_parpadeo', k2: 'm_armadura', k3: 'p_combustion', k4: 'm_u_supernova' },
    skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v1' }, m_ascua: { m_ascua_v: 'm_ascua_v3' } },
  })));
  assert.deepEqual(m.hotbar, { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: 'm_barrera', k3: 'p_llamarada', k4: 'm_u_supernova' }, `barra migrada: ${JSON.stringify(m.hotbar)}`);
  assert.equal(m.skillForge.bola_fuego, 'ii', 'Calcinar → Racimo (área)');
  assert.equal(m.skillForge.m_dardo, 'i', 'Ascua absorbida → Saeta Ígnea');
  assert.ok(m.notices.includes('paso2-maga'), 'aviso de la Maga');
  // Crionte con lo retirado de su kit v1: cae a su SPEC_BAR
  const c = S.migrateV4toV5(json(v4({ talents: { v: 1, spec: 'crionte', cls: {}, sp: { piromante: {}, crionte: {}, arcanista: {} }, choice: {} },
    hotbar: { lmb: 'm_toque', rmb: 'nova_hielo', k1: 'm_paso_escarcha', k2: 'k_aliento', k3: 'k_ventisca', k4: 'm_u_tormenta' } })));
  assert.equal(c.hotbar.lmb, 'm_dardo');
  assert.equal(c.hotbar.k3, 'k_prision', 'Ventisca retirada → insignia del Crionte');
  assert.equal(c.hotbar.k4, 'm_u_tormenta');
  assert.equal(c.skillForge.m_dardo, 'ii', 'Toque absorbido → Saeta Gélida');
}
console.log('Tablas legadas: barra, forja (3.ª rama v4 → variante), insignia, retiradas y aviso ✓');

// ------------------------------------------------ 5) comportamientos (canal real)
// Cada habilidad del kit se prueba a Nv req+2: ya se conoce y aún no tiene la Mejora de la forja
// (Nv req+3), así que es su forma base. La forja la prueba test-forge-maga.
// Dardo Arcano: el básico de arma vuela 9 m (atkRange 7 + 2: sin alcance propio, propuesta de la
// tanda 2; la línea dice «a 9 m» y no «a 20 m» como el mockup, divergencia catalogo.m_dardo.line) y
// Dardo Veloz (Mejora, Nv4) lo alarga un 20 %: 10,8 m. Lo que mide es el impacto REAL (proyectil del canal)
{
  const shot = (level, z) => {
    const h = makeHarness({ classId: 'maga', level });
    const e = h.enemy({ hp: 1e7, pos: [0, 0, z] });
    h.aim(0, z); h.setSlot('lmb', 'm_dardo');
    assert.equal(h.cast('lmb'), true, `Nv${level}: el Dardo sale`);
    h.step(1.5);
    return { range: h.p.basicRange(), hit: lost(e) > 0 };
  };
  assert.ok(!(byId('m_dardo').range > 0), 'el Dardo no declara alcance propio');
  const n3 = shot(3, 8.5), n3far = shot(3, 9.9), n4 = shot(4, 10.3), n4far = shot(4, 11.7);
  assert.ok(Math.abs(n3.range - 9) < 1e-9 && Math.abs(n4.range - 10.8) < 1e-9, `alcance 9 → 10,8 m (${n3.range}, ${n4.range})`);
  assert.ok(n3.hit && !n3far.hit, 'Nv3: alcanza a 8,5 m, no a 9,9 m');
  assert.ok(n4.hit && !n4far.hit, 'Dardo Veloz: alcanza a 10,3 m, no a 11,7 m');
  const said = /a (\d+(?:,\d+)?) m\b/.exec(byId('m_dardo').line);
  assert.ok(said && Number(said[1].replace(',', '.')) === n3.range, `la línea dice el alcance real sin la Mejora (${said?.[1]} m frente a ${n3.range} m)`);
  noWarnings('Dardo');
  console.log('Dardo Arcano: vuela 9 m (10,8 m con Dardo Veloz) ✓');
}

// Barrera de Maná: 60 % del maná máximo × potencia; la potencia de talento (mod buff) la sube
{
  const h = makeHarness({ classId: 'maga', level: 6 });
  h.setSlot('k2', 'm_barrera');
  assert.equal(h.cast('k2'), true);
  const prof = resolveSkill(h.p, byId('m_barrera'));
  const want = Math.round(0.6 * h.p.stats.maxMP * prof.buffMul);
  assert.ok(Math.abs(h.p.shieldTotal() - want) <= 1, `escudo 60 % del maná (${h.p.shieldTotal()} vs ${want})`);
  assert.equal(h.p.shields[0].src, 'm_barrera');
  assert.equal(h.p.cdMax.m_barrera, 20);
  const hp0 = h.p.hp;
  h.p.takeDamage(Math.floor(want / 2), 1, { element: 'fire' });
  assert.equal(h.p.hp, hp0, 'absorbe antes que la vida');
  const r = makeHarness({ classId: 'maga', level: 6, tv: { barrierDr: 15 } });
  r.p.talentExtra.mods = { m_barrera: { buff: 50 } }; r.p.recompute();
  r.setSlot('k2', 'm_barrera'); r.cast('k2');
  assert.ok(Math.abs(r.p.shieldTotal() - Math.round(want * 1.5)) <= 1, `Barrera Reforzada: +50 % de potencia (${r.p.shieldTotal()})`);
  assert.equal(r.p.shields[0].dr, 15, 'Escudo Prismático: la reducción va con el escudo');
  noWarnings('Barrera');
  console.log('Barrera de Maná: 60 % del maná máximo × potencia; talentos por mod buff y tv.barrierDr ✓');
}

// Llamarada: hace estallar las quemaduras (60 %; Llamarada Avivada 100 %) y golpea el cono
{
  const run = (powers = []) => {
    const h = makeHarness({ classId: 'maga', level: 12, spec: 'piromante', powers }); noCrit(h);
    const burnt = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
    const plain = h.enemy({ hp: 1e7, pos: [0.6, 0, 4] });
    const back = h.enemy({ hp: 1e7, pos: [0, 0, -3] });
    h.g.applyDoT(burnt, 1000, 10, 1, undefined, 'test:burn');
    h.aim(0, 5); h.setSlot('k3', 'p_llamarada');
    assert.equal(h.cast('k3'), true);
    h.step(0.15);
    return { h, burnt, plain, back };
  };
  const a = run();
  // la quemadura de antes desaparece; la que queda es la Ignición (s0, gratis con el Piromante)
  // que pone el golpe del cono, la misma que al enemigo que no se quemaba
  assert.equal(a.h.g.dotRemaining(a.burnt, 'test:burn'), 0, 'consume la quemadura');
  assert.deepEqual(a.h.g.dotsOf(a.burnt).map(d => d.source), ['p_ignicion:burn'], 'solo la Ignición del golpe');
  assert.equal(a.h.g.dotRemaining(a.burnt, 'burn'), a.h.g.dotRemaining(a.plain, 'burn'), 'la misma Ignición que el que no se quemaba');
  assert.ok(lost(a.plain) > 0 && lost(a.back) === 0, 'golpea el cono delantero');
  const extra = lost(a.burnt) - lost(a.plain);
  assert.ok(extra > 600 * 0.85 && extra < 600 * 1.15, `estallido del 60 % de lo pendiente (${extra})`);
  assert.ok(POWER_HOOKS.p_llamarada_avivada, 'poder de Llamarada Avivada (KT) registrado');
  const b = run(['p_llamarada_avivada']);
  const extraB = lost(b.burnt) - lost(b.plain);
  assert.ok(extraB > 1000 * 0.85 && extraB < 1000 * 1.15, `Llamarada Avivada: estalla el 100 % (${extraB})`);
  noWarnings('Llamarada');
  console.log('Llamarada: cono de 7 m que hace estallar el 60 % de las quemaduras (100 % avivada) ✓');
}

// Estela Ígnea: desliz de 6 m y franja de fuego de 1,5 m de ancho 3 s
{
  const h = makeHarness({ classId: 'maga', level: 14, spec: 'piromante' });
  const on = h.enemy({ hp: 1e7, pos: [3, 0, 0.5] });
  const off = h.enemy({ hp: 1e7, pos: [3, 0, 1.6] });
  h.aim(10, 0); h.setSlot('k1', 'm_estela_ignea');
  assert.equal(h.cast('k1'), true);
  assert.ok(Math.abs(h.p.pos.x - 6) < 0.05, `se desliza 6 m (${h.p.pos.x.toFixed(2)})`);
  const f = h.g.fields.filter(x => x.data?.skill === 'm_estela_ignea');
  assert.ok(f.length === 1 && f[0].shape === 'line' && f[0].width === 1.5, 'una franja en línea de 1,5 m');
  h.step(1.05);
  const avg = h.p.avgHit(resolveSkill(h.p, byId('m_estela_ignea')).coef);
  assert.ok(lost(on) > avg * 0.6 && lost(on) < avg * 1.6, `quema ~40 % por segundo (${lost(on)} vs ${avg.toFixed(0)})`);
  assert.equal(lost(off), 0, 'fuera de la franja no quema');
  h.step(2.1);
  assert.equal(h.g.fields.filter(x => !x.dead && x.data?.skill === 'm_estela_ignea').length, 0, 'dura 3 s');
  noWarnings('Estela Ígnea');
  console.log('Estela Ígnea: desliz de 6 m y rastro de fuego de 3 s ✓');
}

// Meteoro (área genérica): cae a los 0,6 s donde apuntas
{
  const h = makeHarness({ classId: 'maga', level: 16, spec: 'piromante' });
  const m = h.enemy({ hp: 1e7, pos: [6, 0, 0] });
  h.aim(6, 0); h.setSlot('k2', 'meteoro');
  assert.equal(h.cast('k2'), true);
  h.step(0.5); assert.equal(lost(m), 0, 'aún cae');
  h.step(0.2); assert.ok(lost(m) > 0, 'impacta a 0,6 s');
  noWarnings('Meteoro');
}

// Supernova: se forma sobre ti; tres ondas a 5 m y Quemadura de 1200 % al final
{
  const h = makeHarness({ classId: 'maga', level: 17, spec: 'piromante' }); noCrit(h);
  const e = h.enemy({ hp: 1e8, pos: [3, 0, 0] });
  const far = h.enemy({ hp: 1e8, pos: [9, 0, 0] });
  // la Quemadura propia se mide por su fuente: las ondas de Fuego ponen además la Ignición (s0)
  let waves = 0, burnDealt = 0;
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    if (o.skill === 'm_u_supernova' && !o.dot) waves++;
    const r = orig(a, c, o);
    if (o.dot && o.source === 'dot:m_u_supernova:burn') burnDealt += r || 0;
    return r;
  };
  h.aim(9, 0); h.setSlot('k4', 'm_u_supernova');
  assert.equal(h.cast('k4'), true);
  h.step(0.6); assert.equal(waves, 0, 'telegrafía: aún no estalla');
  h.step(0.7);
  assert.equal(waves, 3, `tres ondas (${waves})`);
  assert.equal(lost(far), 0, 'a tu alrededor, no donde apuntas');
  assert.ok(h.g.dotRemaining(e, 'm_u_supernova:burn') > 0, 'deja Quemadura');
  h.step(6.5);
  const prof = resolveSkill(h.p, byId('m_u_supernova'));
  const want = h.p.avgHit(prof.coef * 12 / 4.7, prof.addPct);
  assert.ok(Math.abs(burnDealt - want) < want * 0.2, `Quemadura ≈ 1200 % (${burnDealt} vs ${want.toFixed(0)})`);
  assert.equal(h.g.dotRemaining(e, 'm_u_supernova:burn'), 0, 'en 6 s');
  assert.equal(h.p.cdMax.m_u_supernova, 50);
  noWarnings('Supernova');
  console.log('Supernova: tres ondas a tu alrededor (5 m) + Quemadura de 1200 % ✓');
}

// Prisión de Hielo: congela 2 s a 4 m (a los jefes, Quebranto) y golpea
{
  const h = makeHarness({ classId: 'maga', level: 12, spec: 'crionte' });
  const near = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
  const far = h.enemy({ hp: 1e7, pos: [7, 0, 0] });
  const boss = h.enemy({ hp: 1e7, pos: [0, 0, 2.5], boss: true });
  h.setSlot('k3', 'k_prision');
  assert.equal(h.cast('k3'), true);
  h.step(0.15);
  assert.ok(near.frozenT > 1.8 && lost(near) > 0, `congela 2 s y golpea (${near.frozenT.toFixed(2)})`);
  assert.ok(!(far.frozenT > 0) && lost(far) === 0, 'fuera del radio, nada');
  assert.ok(!(boss.frozenT > 0) && boss.stagger > 0, 'al jefe le llena el Quebranto');
  assert.equal(resolveSkill(h.p, byId('k_prision')).def.layers, 2, 'capas en la definición forjada (las pone el indicador)');
  noWarnings('Prisión');
  console.log('Prisión de Hielo: congela 2 s a 4 m; jefes → Quebranto ✓');
}

// Paso de Escarcha: desliz y camino que ralentiza 40 % y golpea de Hielo cada segundo
{
  const h = makeHarness({ classId: 'maga', level: 14, spec: 'crionte' });
  const on = h.enemy({ hp: 1e7, pos: [3, 0, 0.4] });
  const off = h.enemy({ hp: 1e7, pos: [3, 0, 2] });
  let hits = 0;
  const orig = on.takeDamage.bind(on);
  on.takeDamage = (a, c, o = {}) => { if (o.skill === 'm_paso_escarcha' && !o.dot && o.elem === 'frost') hits++; return orig(a, c, o); };
  h.aim(10, 0); h.setSlot('k1', 'm_paso_escarcha');
  assert.equal(h.cast('k1'), true);
  assert.ok(Math.abs(h.p.pos.x - 6) < 0.05, 'se desliza 6 m');
  h.step(0.4);
  assert.ok(on.slowT > 0 && on.slowPct === 40, 'ralentiza 40 %');
  assert.equal(hits, 0, 'aún no golpea');
  h.step(0.7); assert.equal(hits, 1, 'primer golpe al segundo');
  h.step(2.1); assert.equal(hits, 3, `un golpe por segundo durante 3 s (${hits})`);
  assert.equal(lost(off), 0, 'fuera del camino, nada');
  h.step(1.2); assert.equal(hits, 3, 'se apaga a los 3 s');
  assert.equal(h.p.gcdT, 0, 'movilidad fuera del GCD');
  noWarnings('Paso de Escarcha');
  console.log('Paso de Escarcha: camino de 3 s que ralentiza 40 % y golpea de Hielo cada segundo ✓');
}

// Lanza de Hielo: atraviesa; ×3 a los Congelados, contado ANTES del golpe
{
  definePower('t_ka_maga_deshiela', { name: 'prueba', onHit: (g, p, e, hit) => { if (hit.skill === 'k_lanza') e.frozenT = 0; } });
  const run = (powers = []) => {
    const h = makeHarness({ classId: 'maga', level: 16, spec: 'crionte', powers }); noCrit(h);
    const a = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
    const b = h.enemy({ hp: 1e7, pos: [0, 0, 6] });
    b.applyCC('freeze', 5);
    const seen = new Map([[a, { direct: 0, proc: 0 }], [b, { direct: 0, proc: 0 }]]);
    for (const e of [a, b]) {
      const orig = e.takeDamage.bind(e);
      e.takeDamage = (x, c, o = {}) => { const r = orig(x, c, o); if (o.skill === 'k_lanza') seen.get(e)[o.proc ? 'proc' : 'direct'] += r || 0; return r; };
    }
    h.aim(0, 6); h.setSlot('rmb', 'k_lanza');
    assert.equal(h.cast('rmb'), true);
    h.step(1);
    return { a: seen.get(a), b: seen.get(b) };
  };
  const r = run();
  assert.ok(r.a.direct > 0 && r.a.proc === 0, 'atraviesa; al no Congelado, golpe normal');
  assert.ok(r.b.direct > 0 && r.b.proc === r.b.direct * 2, `el triple al Congelado (${r.b.direct} + ${r.b.proc})`);
  const s2 = run(['t_ka_maga_deshiela']);
  assert.ok(s2.b.direct > 0 && s2.b.proc === s2.b.direct * 2, `aunque un poder lo descongele al golpear (${s2.b.direct} + ${s2.b.proc})`);
  noWarnings('Lanza de Hielo');
  console.log('Lanza de Hielo: atraviesa y hace el triple a los Congelados (estado de antes del golpe) ✓');
}

// Tormenta Glacial: te sigue 8 s y golpea cada 0,5 s a 4 m
{
  const h = makeHarness({ classId: 'maga', level: 17, spec: 'crionte' });
  const a = h.enemy({ hp: 1e8, pos: [2, 0, 0] });
  h.setSlot('k4', 'm_u_tormenta');
  assert.equal(h.cast('k4'), true);
  assert.ok(lost(a) > 0, 'primer golpe al lanzarla');
  assert.ok(SK.magaStorm(h.p)?.alive, 'tormenta activa (magaStorm)');
  h.p.pos.set(30, 0, 0);
  const b = h.enemy({ hp: 1e8, pos: [31, 0, 0] });   // cada golpe lo aparta ~0,2 m
  let hits = 0;
  const orig = b.takeDamage.bind(b);
  b.takeDamage = (x, c, o = {}) => { if (o.skill === 'm_u_tormenta' && !o.dot) hits++; return orig(x, c, o); };
  const aLost = lost(a);
  h.step(8);
  assert.equal(lost(a), aLost, 'ya no golpea donde estaba');
  assert.equal(hits, 15, `te sigue: 16 golpes en 8 s, 15 tras moverte (${hits})`);
  assert.equal(SK.magaStorm(h.p), null, 'termina');
  noWarnings('Tormenta Glacial');
  console.log('Tormenta Glacial: te sigue 8 s y golpea cada 0,5 s a 4 m ✓');
}

// Orbe Arcano: lento, atraviesa y rebota 2 veces
{
  const h = makeHarness({ classId: 'maga', level: 12, spec: 'arcanista' });
  const a = h.enemy({ hp: 1e7, pos: [0, 0, 4] });
  const b = h.enemy({ hp: 1e7, pos: [0, 0, 8] });
  const segs = [];
  const orig = h.g.spawnProjectile.bind(h.g);
  h.g.spawnProjectile = o => { if (o.skill === 'a_orbe') segs.push(o); return orig(o); };
  h.aim(0, 4); h.setSlot('k3', 'a_orbe');
  assert.equal(h.cast('k3'), true);
  h.step(1.5);
  assert.ok(lost(a) > 0 && lost(b) > 0, 'atraviesa a los dos');
  h.step(6);
  assert.equal(segs.length, 3, `un tramo + 2 rebotes (${segs.length})`);
  assert.ok(segs.every(o => o.pierce), 'cada tramo atraviesa');
  noWarnings('Orbe Arcano');
  console.log('Orbe Arcano: atraviesa y rebota 2 veces ✓');
}

// Rayo (línea genérica): 15 m en línea
{
  const h = makeHarness({ classId: 'maga', level: 16, spec: 'arcanista' });
  const a = h.enemy({ hp: 1e7, pos: [0, 0, 5] });
  const b = h.enemy({ hp: 1e7, pos: [0, 0, 14] });
  const side = h.enemy({ hp: 1e7, pos: [3, 0, 5] });
  h.aim(0, 5); h.setSlot('rmb', 'rayo');
  assert.equal(h.cast('rmb'), true);
  assert.ok(lost(a) > 0 && lost(b) > 0 && lost(side) === 0, 'golpea la línea de 15 m');
  noWarnings('Rayo');
}

// Sello del Archimago: dentro, tus hechizos con coste cuestan un 30 % menos (stat costPct: todas
// las habilidades con coste, también el Orbe, que es la insignia y no una principal)
{
  const h = makeHarness({ classId: 'maga', level: 14, spec: 'arcanista' });
  const ids = ['rayo', 'a_orbe', 'nova_hielo', 'bola_fuego'];
  const c0 = Object.fromEntries(ids.map(id => [id, resolveSkill(h.p, byId(id)).cost]));
  assert.ok(ids.every(id => c0[id] > 0), 'cuatro hechizos con coste');
  h.setSlot('k2', 'a_sello');
  assert.equal(h.cast('k2'), true);
  const f = h.g.fields.find(x => x.kind === 'aura' && x.data?.buffId === 'a_sello');
  assert.ok(f && f.radius === 4 && Math.abs(f.t - 8) < 1e-6, 'círculo de 4 m durante 8 s');
  for (const id of ids) assert.equal(resolveSkill(h.p, byId(id)).cost, Math.round(c0[id] * 0.7), `${id}: −30 % dentro`);
  assert.equal(byId('a_orbe').cat, 'spec', 'el Orbe es la insignia (no una principal) y también se abarata');
  h.step(9);
  for (const id of ids) assert.equal(resolveSkill(h.p, byId(id)).cost, c0[id], `${id}: al terminar, coste normal`);
  noWarnings('Sello');
}

// Desgarro Arcano: canalización imparable y plantada, 6 golpes en 3 s
{
  const h = makeHarness({ classId: 'maga', level: 17, spec: 'arcanista' });
  const e = h.enemy({ hp: 1e8, pos: [0, 0, 4] });
  let ticks = 0;
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { if (o.skill === 'm_u_desgarro') ticks++; return orig(a, c, o); };
  assert.equal(resolveSkill(h.p, byId('m_u_desgarro')).moveMul, 0, 'sin moverte');
  h.aim(0, 4); h.setSlot('k4', 'm_u_desgarro');
  assert.equal(h.cast('k4'), true);
  assert.ok(h.p.unstoppableT > 0, 'imparable');
  h.step(3.2);
  assert.equal(ticks, 6, `6 golpes (${ticks})`);
  assert.equal(h.g._channel, null);
  noWarnings('Desgarro');
}
console.log('Meteoro, Rayo, Sello del Archimago y Desgarro Arcano (tipos genéricos) ✓');

// Detener el Tiempo: quietos 3 s a 8 m, sin daño; jefes → Quebranto
{
  const h = makeHarness({ classId: 'maga', level: 72 });
  h.p.talentExtra.grants.add('m_h_detener'); h.p.recompute();
  const a = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  const far = h.enemy({ hp: 1e6, pos: [12, 0, 0] });
  const boss = h.enemy({ hp: 1e6, pos: [0, 0, 5], boss: true });
  h.setSlot('k2', 'm_h_detener');
  assert.equal(h.cast('k2'), true);
  assert.ok(a.stunT > 2.9 && lost(a) === 0, 'quieto 3 s, sin daño');
  assert.ok(!(far.stunT > 0), 'fuera de 8 m, nada');
  assert.ok(boss.stagger > 0 && lost(boss) === 0, 'jefe: Quebranto');
  assert.equal(h.p.cdMax.m_h_detener, 75);
  noWarnings('Detener el Tiempo');
}

// Palabra de Poder: 3 runas a 1,8 m, en cast.runeSpots para el poder de las Runas
{
  let spots = null;
  definePower('t_ka_maga_runas', { name: 'prueba', afterCast: (g, p, cast) => { if (cast?.sk?.id === 'm_h_palabra') spots = cast.runeSpots; } });
  const h = makeHarness({ classId: 'maga', level: 72, powers: ['t_ka_maga_runas'] });
  h.p.talentExtra.grants.add('m_h_palabra'); h.p.recompute();
  h.aim(0, 5); h.setSlot('k2', 'm_h_palabra');
  assert.equal(h.cast('k2'), true);
  assert.ok(Array.isArray(spots) && spots.length === 3, 'tres runas');
  for (const s of spots) assert.ok(Math.abs(Math.hypot(s.x, s.z) - 1.8) < 1e-6, 'a 1,8 m');
  assert.ok(Math.abs(spots[0].x) < 1e-6 && spots[0].z > 0, 'la primera hacia la mira');
  noWarnings('Palabra de Poder');
}

// Llamar Constructo: los enemigos a 8 m lo atacan a él; al romperse, vuelven contigo
{
  let C = null;
  definePower('t_ka_maga_constructo', { name: 'prueba', afterCast: (g, p, cast) => { if (cast?.sk?.id === 'm_h_constructo') C = cast.construct; } });
  const h = makeHarness({ classId: 'maga', level: 74, powers: ['t_ka_maga_constructo'] });
  h.p.talentExtra.grants.add('m_h_constructo'); h.p.recompute();
  const a = h.enemy({ hp: 1e6, pos: [8, 0, 0] });
  const far = h.enemy({ hp: 1e6, pos: [20, 0, 0] });
  const boss = h.enemy({ hp: 1e6, pos: [4, 0, 6], boss: true });
  h.aim(4, 0); h.setSlot('k2', 'm_h_constructo');
  assert.equal(h.cast('k2'), true);
  assert.ok(C && C.alive && Math.abs(C.pos.x - 4) < 1e-6, 'aparece donde apuntas');
  assert.equal(C.hp, Math.round(h.p.stats.maxHP * 0.5 * resolveSkill(h.p, byId('m_h_constructo')).buffMul), 'aguanta la mitad de tu vida');
  assert.equal(a.combatTarget(h.p), C, 'el enemigo a 4 m lo ataca a él');
  assert.equal(boss.combatTarget(h.p), C, 'también el jefe');
  assert.equal(far.combatTarget(h.p), h.p, 'fuera de 8 m, no');
  h.step(3);
  assert.equal(a.combatTarget(h.p), C, 'renueva la provocación mientras dura');
  C.takeDamage(C.maxHP + 1);
  assert.equal(C.alive, false, 'se rompe');
  assert.equal(a.combatTarget(h.p), h.p, 'roto, vuelven contigo');
  h.step(0.2);
  assert.equal(h.g.fields.filter(f => !f.dead && f.data?.skill === 'm_h_constructo').length, 0, 'su huella desaparece');
  // si nadie lo rompe, dura 10 s
  let C2 = null;
  definePower('t_ka_maga_constructo2', { name: 'prueba', afterCast: (g, p, cast) => { if (cast?.sk?.id === 'm_h_constructo') C2 = cast.construct; } });
  const h2 = makeHarness({ classId: 'maga', level: 74, powers: ['t_ka_maga_constructo2'] });
  h2.p.talentExtra.grants.add('m_h_constructo'); h2.p.recompute();
  h2.enemy({ hp: 1e6, pos: [6, 0, 0] });
  h2.aim(4, 0); h2.setSlot('k2', 'm_h_constructo'); h2.cast('k2');
  h2.step(9.5); assert.equal(C2.alive, true);
  h2.step(1); assert.equal(C2.alive, false, 'desaparece a los 10 s');
  noWarnings('Llamar Constructo');
}
console.log('Activas de héroe: Detener el Tiempo, Palabra de Poder y Llamar Constructo ✓');

console.log('\n✅ HABILIDADES DE LA MAGA (catálogo 2g) OK');
