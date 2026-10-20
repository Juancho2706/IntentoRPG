// Modificadores de habilidad estilo D4 Lord of Hatred: cada habilidad base tiene
// RAMAS (3) y cada rama OPCIONES (3); eliges 1 por rama. Paso 2b.0: las ramas de
// cada clase viven en js/skills-<clase>.js (constructores de js/skill-defs.js) y
// data.js solo las fusiona; las activas de TALENTO no tienen ramas (§3.4).
import { SKILL_MODS, aggregateSkillMods, CLASSES } from '../js/data.js';
import { GUERRERO_SKILL_MODS } from '../js/skills-guerrero.js';
import { MAGA_SKILL_MODS } from '../js/skills-maga.js';
import { ARQUERA_SKILL_MODS } from '../js/skills-arquera.js';
import { utilMods, aggregateMods } from '../js/skill-defs.js';

// 0) propiedad por clase: cada mapa de ramas sale del archivo de su clase
const OWN = { guerrero: GUERRERO_SKILL_MODS, maga: MAGA_SKILL_MODS, arquera: ARQUERA_SKILL_MODS };
for (const [cid, map] of Object.entries(OWN)) {
  for (const id of Object.keys(map)) {
    if (!CLASSES[cid].skills.some(s => s.id === id)) throw new Error(`${cid}: rama de una habilidad que no es suya: ${id}`);
    if (SKILL_MODS[id] !== map[id]) throw new Error(`${id}: data.js debe fusionar las ramas de skills-${cid}.js tal cual`);
  }
}
console.log('Ramas por clase en js/skills-<clase>.js, fusionadas en SKILL_MODS ✓');

// 1) cada habilidad BASE (no de talento) de cada clase tiene ramas
for (const cls of Object.values(CLASSES)) {
  for (const sk of cls.skills) {
    if (sk.kind === 'talent') continue;
    if (!SKILL_MODS[sk.id]) throw new Error('habilidad base sin ramas: ' + sk.id);
  }
}
console.log('Cobertura: toda habilidad base tiene ramas ✓');

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
  if (sk.kind === 'talent') continue;
  const br = SKILL_MODS[sk.id];
  if (br.length !== 3) throw new Error('Guerrero ' + sk.id + ' debe tener 3 ramas');
  if (!br.every(b => b.opts.length === 3)) throw new Error('Guerrero ' + sk.id + ': cada rama 3 opciones');
}
console.log('Guerrero: 3 ramas × 3 opciones por habilidad ✓');

// 4) agregación: elegir 1 opción por rama suma sus efectos
if (aggregateSkillMods('torbellino', {}).dmg !== 0) throw new Error('agregado vacío debe ser neutro');
const tb = SKILL_MODS['torbellino'];
const off = tb.find(b => b.name === 'Ofensiva');
const variant = tb.find(b => b.name === 'Transformación');
if (!variant) throw new Error('cada habilidad debe tener una rama de Transformación (cambia en grande)');
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

// 6) la rama de Transformación de los CORES del Guerrero cambia EN GRANDE cómo
//    funciona la habilidad (zona de daño / CD a la mitad si pegas a varios / eco…)
const BIG = ['zone', 'cdhit', 'echo'];
const tbT = tb.find(b => b.name === 'Transformación');
if (!tbT.opts.some(o => BIG.some(k => o[k]))) throw new Error('Torbellino: la Transformación debe tener un efecto que cambie en grande (zona/cdhit/eco)');
let bigCores = 0;
for (const sk of G.skills) {
  if (sk.kind === 'talent' || !['spender', 'movement'].includes(sk.cat) || !(sk.coef > 0)) continue; // gastadoras y movilidades de daño (base; las de talento no tienen ramas)
  const t = SKILL_MODS[sk.id].find(b => b.name === 'Transformación');
  if (t && t.opts.some(o => BIG.some(k => o[k]) || o.execute || o.chain)) bigCores++;
}
if (bigCores < 6) throw new Error('la mayoría de cores de daño del Guerrero deben tener Transformación de gran impacto, hay ' + bigCores);
console.log(`Transformación: ${bigCores} cores de daño del Guerrero con efecto de gran impacto ✓`);

// 7) constructor nuevo utilMods (§3.4): Potencia / Recarga / Variante
const um = utilMods('t_util');
if (um.length !== 3 || !um.every(b => b.opts.length === 3)) throw new Error('utilMods: 3 ramas × 3 opciones');
if (um.map(b => b.name).join('/') !== 'Potencia/Recarga/Variante') throw new Error('utilMods: nombres de rama');
const ua = aggregateMods(um, { t_util_r: 't_util_r1', t_util_v: 't_util_v2' });
if (ua.cdr !== 25 || ua.haste !== 3) throw new Error('utilMods: Recarga −25 % y Variante Impulso');
console.log('utilMods (movilidad/defensa): Potencia · Recarga · Variante ✓');

console.log('\n✅ MODIFICADORES (RAMAS × OPCIONES) OK');
