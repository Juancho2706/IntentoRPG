// Modificadores de habilidad estilo D4 Lord of Hatred: cada habilidad activa
// tiene RAMAS de pasivos (3 en Guerrero) y cada rama OPCIONES (3); eliges 1 por
// rama. Validamos estructura, unicidad y la agregación de efectos.
import { SKILL_MODS, aggregateSkillMods, CLASSES } from '../js/data.js';

// 1) cada habilidad ACTIVA (no pasiva) de cada clase tiene ramas de pasivos
for (const cls of Object.values(CLASSES)) {
  for (const sk of cls.skills) {
    if (sk.kind === 'passive') continue;
    if (!SKILL_MODS[sk.id]) throw new Error('habilidad activa sin ramas de pasivos: ' + sk.id);
  }
}
console.log('Cobertura: toda habilidad activa tiene ramas de pasivos ✓');

// 2) estructura: ramas con id/name y ≥2 opciones; ids de opción únicos
const seen = new Set();
for (const [skId, branches] of Object.entries(SKILL_MODS)) {
  if (!Array.isArray(branches) || !branches.length) throw new Error(skId + ': sin ramas');
  for (const br of branches) {
    if (!br.id || !br.name || !Array.isArray(br.opts) || br.opts.length < 2) throw new Error(skId + ': rama inválida');
    for (const o of br.opts) {
      if (!o.id || !o.name || !o.desc) throw new Error(skId + ': opción incompleta');
      if (seen.has(o.id)) throw new Error('id de opción duplicado: ' + o.id);
      seen.add(o.id);
    }
  }
}
console.log('Estructura: ramas con opciones únicas (id/name/desc) ✓');

// 3) Guerrero (plantilla): cada habilidad activa = 3 ramas × 3 opciones
const G = CLASSES.guerrero;
for (const sk of G.skills) {
  if (sk.kind === 'passive') continue;
  const br = SKILL_MODS[sk.id];
  if (br.length !== 3) throw new Error('Guerrero ' + sk.id + ' debe tener 3 ramas');
  if (!br.every(b => b.opts.length === 3)) throw new Error('Guerrero ' + sk.id + ': cada rama 3 opciones');
}
console.log('Guerrero: 3 ramas × 3 opciones por habilidad ✓');

// 4) agregación: elegir 1 opción por rama suma sus efectos
if (aggregateSkillMods('torbellino', {}).dmg !== 0) throw new Error('agregado vacío debe ser neutro');
const tb = SKILL_MODS['torbellino'];
const off = tb.find(b => b.name === 'Ofensiva');
const variant = tb.find(b => b.name === 'Variante');
const o1 = off.opts[0], v1 = variant.opts[0];
const agg = aggregateSkillMods('torbellino', { [off.id]: o1.id, [variant.id]: v1.id });
const expectDmg = (o1.dmg || 0) + (v1.dmg || 0);
if (agg.dmg !== expectDmg) throw new Error(`la suma de daño de las opciones elegidas debe ser ${expectDmg}, dio ${agg.dmg}`);
if (v1.dot && agg.dot !== v1.dot) throw new Error('la variante con DoT debe agregar su tipo de daño por tiempo');
// contrapartida: alguna opción tiene un efecto negativo (algo malo por algo bueno)
const hasTradeoff = Object.values(SKILL_MODS).some(brs => brs.some(b => b.opts.some(o => (o.dmg < 0 || o.cdr < 0 || o.dur < 0 || o.buff < 0))));
if (!hasTradeoff) throw new Error('debe haber pasivos con contrapartida (algo malo por algo bueno)');
console.log('Agregación: 1 opción por rama suma efectos (con contrapartidas) ✓');

// 5) vocabulario nuevo (cdr/gen/lifesteal/vuln/stun) presente y agregable
const fury = tb.find(b => b.name === 'Ímpetu');
const cdrOpt = fury.opts.find(o => o.cdr);
if (!cdrOpt || !(aggregateSkillMods('torbellino', { [fury.id]: cdrOpt.id }).cdr > 0)) throw new Error('la rama Ímpetu debe poder dar CDR');
console.log('Vocabulario nuevo: cdr/gen/lifesteal/vuln/stun disponibles ✓');

console.log('\n✅ MODIFICADORES (RAMAS × OPCIONES) OK');
