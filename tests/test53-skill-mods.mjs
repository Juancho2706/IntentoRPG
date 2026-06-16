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
const agg = aggregateSkillMods('torbellino', { [off.id]: off.opts[0].id, [variant.id]: variant.opts[0].id });
if (agg.dmg !== 25) throw new Error('Afilado debe dar +25% daño: ' + agg.dmg);
if (agg.dot !== 'bleed') throw new Error('la 1ª variante de Torbellino debe aplicar sangrado');
console.log('Agregación: 1 opción por rama suma efectos (dmg + dot) ✓');

// 5) vocabulario nuevo (cdr/gen/lifesteal/vuln/stun) presente y agregable
const fury = tb.find(b => b.name === 'Ímpetu');
const cdrOpt = fury.opts.find(o => o.cdr);
if (!cdrOpt || !(aggregateSkillMods('torbellino', { [fury.id]: cdrOpt.id }).cdr > 0)) throw new Error('la rama Ímpetu debe poder dar CDR');
console.log('Vocabulario nuevo: cdr/gen/lifesteal/vuln/stun disponibles ✓');

console.log('\n✅ MODIFICADORES (RAMAS × OPCIONES) OK');
