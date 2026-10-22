// Paso 2b.0 — resolvedor único de habilidades (js/skill-resolve.js, §4)
//  1) catálogo válido en el formato nuevo (cat/slots/tags/coef) y CAT_SLOTS (k2 flexible)
//  2) rangos por nivel (rangoBase), conocidas por nivel y mapa derivado p.skills
//  3) fusión: rango → forja (Mejora + variante) → talentos → soportes (por tags) → CDR/costRed → poderes
//     (Paso 2: las ramas se sustituyen por la forja, §3.5)
//  4) compatibilidad de soportes por requires/forbids (§4.3) y huecos por categoría
//  5) caché p.resolved invalidada en recompute
import assert from 'node:assert/strict';
import { CLASSES, SUPPORTS } from '../js/data.js';
import { validateSkillDef, defaultSlots, CAT_SLOTS, GCD_CATS } from '../js/skill-defs.js';
import { resolveSkill, rankBase, skillRank, isKnown, knownRankMap, supportFits, supportSockets, validSupports,
  SUPPORT_MOD, fitsSlot, cooldownWithMassacre, GCD } from '../js/skill-resolve.js';
import { SKILL_BEHAVIORS } from '../js/powers.js';
import { Player } from '../js/entities.js';
import { skillMethods } from '../js/game-skills.js';
import { CAPS } from '../js/combat-math.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const mk = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, input: { joyDir: null, keyDir: null }, enemies: [] });
const approx = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const sk = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);

// ------------------------------------------------ 1) catálogo y ranuras
for (const c of Object.values(CLASSES)) {
  for (const s of c.skills) {
    // las activas de talento (kind 'talent') validan su forma; sus comportamientos los
    // registra 2c.1 (powers-<clase>.js) y los vigila test-powers-<clase>.mjs
    const errs = validateSkillDef(s, { behaviors: s.kind === 'talent' ? null : SKILL_BEHAVIORS });
    assert.deepEqual(errs, [], `${c.id}: ${errs.join('; ')}`);
    assert.ok(s.slots.every(sl => CAT_SLOTS[s.cat].includes(sl) || defaultSlots(s.cat, s.tags).includes(sl)), `${s.id}: ranura fuera de su categoría`);
  }
  assert.ok(c.skills.some(s => s.cat === 'basic' && s.type === 'weapon'), `${c.id}: falta el básico de arma`);
  assert.equal(c.skills.filter(s => s.cat === 'passive' || s.kind === 'passive').length, 0, `${c.id}: las pasivas compradas se eliminaron`);
}
assert.deepEqual(CAT_SLOTS.spender, ['rmb', 'k2'], 'gastadora: rmb o k2 (k2 flexible)');
assert.deepEqual(CAT_SLOTS.defense, ['k2']); assert.deepEqual(CAT_SLOTS.utility, ['k2']);
assert.deepEqual(CAT_SLOTS.movement, ['k1']); assert.deepEqual(CAT_SLOTS.ultimate, ['k4']); assert.deepEqual(CAT_SLOTS.basic, ['lmb']);
assert.deepEqual(defaultSlots('spec', ['spec', 'spender']), ['rmb', 'k2', 'k3'], 'gastadora de especialización');
assert.deepEqual(defaultSlots('spec', ['spec', 'utility']), ['k2', 'k3'], 'utilidad de especialización');
assert.deepEqual(defaultSlots('spec', ['spec']), ['k3']);
assert.ok(fitsSlot(sk('guerrero', 'g_hendidura'), 'k2') && fitsSlot(sk('guerrero', 'g_hendidura'), 'rmb') && !fitsSlot(sk('guerrero', 'g_hendidura'), 'k1'));
assert.ok(!fitsSlot(sk('guerrero', 'g_u_furia'), 'k1') && fitsSlot(sk('guerrero', 'g_u_furia'), 'k4'));
assert.ok(GCD === 0.2 && GCD_CATS.has('spender') && !GCD_CATS.has('movement') && !GCD_CATS.has('basic'));
console.log('Catálogo: formato nuevo válido, sin pasivas, CAT_SLOTS con k2 flexible ✓');

// ------------------------------------------------ 2) rangos y conocidas por nivel
assert.equal(rankBase(1, 1), 1);
assert.equal(rankBase(8, 1), 1); assert.equal(rankBase(9, 1), 2);
assert.equal(rankBase(33, 1), 5); assert.equal(rankBase(50, 2), 5, 'tope 5 de base');
assert.equal(rankBase(1, 9), 1, 'nunca por debajo de 1');
const p = new Player(mk(), 'guerrero');
assert.deepEqual(Object.keys(p.skills).sort(), ['g_tajo'], 'Nv1: solo el básico A (B en Nv3, C en Nv8)');
assert.ok(!isKnown(p, sk('guerrero', 'g_hendidura')));
p.level = 9; p.recompute();
assert.ok(isKnown(p, sk('guerrero', 'g_hendidura')) && isKnown(p, sk('guerrero', 'g_lanza')) && !isKnown(p, sk('guerrero', 'g_u_furia')));
assert.equal(p.skills.g_hendidura, rankBase(9, 2));
assert.deepEqual(knownRankMap(p), p.skills, 'p.skills = mapa derivado de rangos');
p.talentExtra = { powers: new Set(), mods: {}, skillLv: { g_hendidura: 2 }, grants: new Set(), tv: {} };
p.recompute();
assert.equal(skillRank(p, sk('guerrero', 'g_hendidura')), rankBase(9, 2) + 2, 'talentos.skillLv suma rangos');
console.log('Rangos: clamp(1+⌊(Nv−req)/8⌋,1,5) + talentos; se aprenden solas por nivel ✓');

// ------------------------------------------------ 3) fusión del perfil
const g = new Player(mk(), 'guerrero');
g.level = 20; g.recompute();
const tb = sk('guerrero', 'g_hendidura');
const tbCd = tb.cd || 0;   // sin enfriamiento, como el Torbellino v1 (cd 0)
let prof = resolveSkill(g, tb);
const r = rankBase(20, 2);
assert.equal(prof.rank, r);
assert.ok(approx(prof.coef, tb.coef * (1 + 0.1 * (r - 1))), 'coef × (1 + 0,10·(rango−1))');
assert.equal(prof.cost, tb.cost); assert.ok(approx(prof.cd, tbCd)); assert.equal(prof.gcd, true);
assert.ok(prof.tags.has('spender') && prof.tags.has('physical') && prof.tags.has('cone'));
assert.equal(resolveSkill(g, tb), prof, 'cacheado en p.resolved');
// forja: Mejora (+45 daño, +20 % CD) y variante i (gen 16) sobre una copia de la clase
const line = 'prueba';
const FORGE_TB = { g_hendidura: { mejora: { name: 'Brutal', line, mod: { dmg: 45, cdr: -20 } }, vars: [
  { id: 'g_hendidura_i', name: 'Furibundo', role: 'UNI', line, mod: { gen: 16 } },
  { id: 'g_hendidura_ii', name: 'Amplio', role: 'AREA', line, mul: { radius: 1.5 } }] } };
g.cls = { ...g.cls, forge: FORGE_TB };
g.skillForge = { g_hendidura: 'i' };
g.recompute();
prof = resolveSkill(g, tb);
assert.equal(prof.addPct, 45); assert.ok(approx(prof.cd, tbCd * 1.2)); assert.equal(prof.gen, 16);
assert.ok(prof.mejora && prof.variant === 'i', 'perfil con el estado de la forja');
// soportes por tags: Amplificado (+30 aditivo), Sobrecarga (+50, coste ×1,4); Multiproyectil NO encaja (no es proj)
g.supports = { g_hendidura: ['multi', 'amplify', 'overcharge'] };
g.recompute();
prof = resolveSkill(g, tb);
assert.deepEqual(prof.sups, ['amplify', 'overcharge'], 'los incompatibles se ignoran; máx. 2 huecos');
assert.equal(prof.addPct, 45 + 30 + 50, 'saco ADITIVO: forja + soportes');
assert.equal(prof.cost, Math.round(tb.cost * 1.4));
g.supports = { g_hendidura: ['efficient', 'swift'] }; g.recompute();
prof = resolveSkill(g, tb);
assert.equal(prof.cost, Math.round(tb.cost * 0.65)); assert.ok(approx(prof.cd, tbCd * (1 - (30 - 20) / 100)), 'Raudo suma CDR al número único');
// CDR del héroe topada a 50 (stat + forja + soportes)
g.equipment.helm = { kind: 'item', slot: 'helm', affixes: { cdr: 90 }, quality: 0 }; g.recompute();
prof = resolveSkill(g, tb);
assert.ok(approx(prof.cd, tbCd * (1 - CAPS.cdr / 100)), 'CDR tope 50');
assert.ok(approx(cooldownWithMassacre({ ...prof, cdrPts: 20 }), tbCd * (1 - 45 / 100)), 'Masacre suma 25 puntos de CDR');
g.equipment.helm = null;
// la Hendidura no tiene enfriamiento: los números del CDR, con la Embestida (8 s)
{
  const q = new Player(mk(), 'guerrero'); q.level = 20; q.recompute();
  const emb = sk('guerrero', 'embestida');
  assert.ok(emb.cd > 0, 'la Embestida tiene enfriamiento');
  q.supports = { embestida: ['swift'] }; q.recompute();
  let pe = resolveSkill(q, emb);
  assert.deepEqual(pe.sups, ['swift']);
  assert.ok(approx(pe.cd, emb.cd * 0.7), `Raudo: −30 % de enfriamiento (${pe.cd})`);
  q.equipment.helm = { kind: 'item', slot: 'helm', affixes: { cdr: 90 }, quality: 0 }; q.recompute();
  pe = resolveSkill(q, emb);
  assert.ok(approx(pe.cd, emb.cd * (1 - CAPS.cdr / 100)), 'CDR tope 50 (stat + soportes)');
  assert.ok(approx(cooldownWithMassacre({ ...pe, cdrPts: 20 }), emb.cd * (1 - 45 / 100)), 'Masacre suma 25 puntos de CDR');
  // forja: una Mejora de prueba con +20 % de enfriamiento (cdr −20) y, con Raudo, un solo número de CDR
  q.equipment.helm = null; q.supports = {};
  q.cls = { ...q.cls, forge: { embestida: { mejora: { name: 'Lenta', line, mod: { cdr: -20 } }, vars: [
    { id: 'embestida_i', name: 'a', role: 'UNI', line, mod: { gen: 5 } },
    { id: 'embestida_ii', name: 'b', role: 'AREA', line, mod: { dmg: 10 } }] } } };
  q.skillForge = {}; q.recompute();
  pe = resolveSkill(q, emb);
  assert.ok(pe.mejora && approx(pe.cd, emb.cd * 1.2), `Mejora: +20 % de enfriamiento (${pe.cd})`);
  q.supports = { embestida: ['swift'] }; q.recompute();
  assert.ok(approx(resolveSkill(q, emb).cd, emb.cd * (1 - (30 - 20) / 100)), 'Raudo y la forja suman al mismo número');
}
// talentos: mod de la habilidad + costRed / costRedBig
g.supports = {}; g.skillForge = {}; g.cls = CLASSES.guerrero;
g.talentExtra = { powers: new Set(), mods: { g_hendidura: { dmg: 10, radius: 20 } }, skillLv: {}, grants: new Set(), tv: { costRed: 10, costRedBig: { pct: 15, over: 9 } } };
g.recompute();
prof = resolveSkill(g, tb);
assert.equal(prof.addPct, 10); assert.ok(approx(prof.radius, tb.radius * 1.2));
assert.equal(prof.cost, Math.round(tb.cost * (1 - 25 / 100)), 'costRed + costRedBig (coste > umbral)');
// Eco (soporte) y DoT por soporte (veneno gana a sangrado)
g.talentExtra = null; g.supports = { g_hendidura: ['echo', 'bleed'] }; g.recompute();
prof = resolveSkill(g, tb);
assert.equal(prof.echo, 0.5); assert.equal(prof.dot, 'bleed'); assert.equal(prof.cost, Math.round(tb.cost * 1.6));
console.log('Fusión: rango → forja → talentos → soportes → CDR/costRed (aditivo por clave, topes) ✓');

// ② poderes: multidisparo solo suma proyectil a habilidades con tag proj
const a = new Player(mk(), 'arquera'); a.level = 20;
a.talentExtra = { powers: new Set(['multidisparo']), mods: {}, skillLv: {}, grants: new Set(), tv: {} };
a.recompute();
assert.equal(resolveSkill(a, sk('arquera', 'flecha_multiple')).proj, 1, 'multidisparo +1 proyectil (modifyResolve)');
assert.equal(resolveSkill(a, sk('arquera', 'lluvia_flechas')).proj, 0, 'no afecta a áreas');
assert.equal(resolveSkill(a, sk('arquera', 'a_disparo')).proj, 1, 'también al básico de proyectil');
console.log('Poderes en el resolvedor (② modifyResolve) ✓');

// ------------------------------------------------ 4) soportes por tags
const S = id => SUPPORTS.find(s => s.id === id);
for (const s of SUPPORTS) {
  assert.ok(Array.isArray(s.requires) && s.requires.length, `${s.id}: requires`);
  assert.ok(SUPPORT_MOD[s.id], `${s.id}: falta en SUPPORT_MOD`);
  assert.ok(!('types' in s), `${s.id}: el formato viejo types[] se eliminó`);
}
const ult = sk('guerrero', 'g_u_cataclismo'), tajo = sk('guerrero', 'g_tajo'), grito = sk('guerrero', 'grito_guerra');
const lanza = sk('guerrero', 'g_lanza'), emb = sk('guerrero', 'embestida');
assert.ok(!supportFits(S('amplify'), ult) && supportFits(S('amplify'), tb), 'Amplificado excluye definitivas');
assert.ok(!supportFits(S('overcharge'), tajo) && supportFits(S('amplify'), tajo), 'Sobrecarga excluye básicos');
assert.ok(supportFits(S('wide'), tb) && !supportFits(S('wide'), lanza), 'Expansivo: área/cono/zona');
assert.ok(supportFits(S('multi'), lanza) && !supportFits(S('multi'), tb), 'Multiproyectil: proj');
assert.ok(!supportFits(S('echo'), emb) && supportFits(S('echo'), tb), 'Eco excluye movilidad');
assert.ok(supportFits(S('lasting'), grito) && !supportFits(S('lasting'), lanza), 'Persistente: buff/dot/aura/zona/escudo');
// Grito de Guerra no cuesta Furia (+30 al lanzarlo): Eficiente NO encaja en habilidades sin coste
assert.ok(!supportFits(S('efficient'), ult) && !supportFits(S('efficient'), grito) && supportFits(S('efficient'), tb), 'Eficiente exige coste');
assert.equal(grito.cost, 0, 'Grito de Guerra: sin coste');
assert.ok(!supportFits(S('swift'), tajo), 'Raudo exige enfriamiento');
assert.ok(supportFits(S('bleed'), tajo) && !supportFits(S('bleed'), grito), 'Sed de Sangre: daño y melee|proj|area');
assert.equal(supportSockets(tajo), 1); assert.equal(supportSockets(ult), 1); assert.equal(supportSockets(tb), 2);
const q = new Player(mk(), 'guerrero'); q.supports = { g_tajo: ['amplify', 'focused'] };
assert.deepEqual(validSupports(q, tajo), ['amplify'], 'el básico tiene 1 hueco');
console.log('Soportes por tags (requires/forbids) y huecos por categoría ✓');

// ------------------------------------------------ 5) caché e invalidación
const c = new Player(mk(), 'maga'); c.level = 10; c.recompute();
const bf = sk('maga', 'bola_fuego');
c.cls = { ...c.cls, forge: { bola_fuego: { mejora: null, vars: [
  { id: 'bola_fuego_i', name: 'Ígnea', role: 'UNI', line, mod: { dmg: 45 } }, { id: 'bola_fuego_ii', name: 'x', role: 'AREA', line, mul: { radius: 2 } }] } } };
c.recompute();
const p1 = resolveSkill(c, bf);
c.skillForge = { bola_fuego: 'i' };
assert.equal(resolveSkill(c, bf), p1, 'sin recompute sigue cacheado');
c.recompute();
assert.equal(resolveSkill(c, bf).addPct, 45, 'recompute invalida p.resolved (cambio de forja)');
console.log('Caché de p.resolved invalidada por recompute ✓');

// ------------------------------------------------ 6) g.skillProfile(p, id): el perfil, público para los poderes
{
  const gm = { ...skillMethods };               // el mixin de Game (los poderes lo piden como g.skillProfile)
  const h = new Player(mk(), 'guerrero'); h.level = 20; h.recompute();
  const tbs = sk('guerrero', 'g_hendidura');
  const viaG = gm.skillProfile(h, 'g_hendidura');
  assert.equal(viaG, resolveSkill(h, tbs), 'el mismo perfil (y la misma caché) que resolveSkill');
  assert.equal(viaG.rank, rankBase(20, 2), 'con el rango del héroe');
  assert.equal(viaG.addPct, 0, 'sin soportes');
  h.supports = { g_hendidura: ['amplify'] }; h.recompute();
  assert.equal(gm.skillProfile(h, 'g_hendidura').addPct, 30, 'sigue a recompute: Amplificado suma +30');
  assert.equal(gm.skillProfile(h, 'bola_fuego'), null, 'una habilidad de otra clase: null');
  assert.equal(gm.skillProfile(h, 'no_existe'), null);
  assert.equal(gm.skillProfile(null, 'g_hendidura'), null, 'sin héroe: null');
}
console.log('g.skillProfile(p, id): perfil público para los poderes ✓');

console.log('\n✅ RESOLVEDOR DE HABILIDADES (resolveSkill) OK');
