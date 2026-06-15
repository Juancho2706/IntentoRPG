// Modificadores de habilidad (D4-lite): integridad de datos + agregación.
import { SKILL_MODS, aggregateSkillMods, CLASSES } from '../js/data.js';

// cada skill ACTIVA de cada clase tiene su set de modificadores
let activeCount = 0;
for (const cls of Object.values(CLASSES)) {
  for (const sk of cls.skills) {
    if (sk.type === 'passive') continue;
    activeCount++;
    const list = SKILL_MODS[sk.id];
    if (!list) throw new Error('skill activa sin modificadores: ' + sk.id);
  }
}
console.log(`Cobertura: ${activeCount} habilidades activas, todas con modificadores ✓`);

// estructura: 1 Mejora + 2 Aspectos excluyentes que requieren la Mejora
for (const [skId, list] of Object.entries(SKILL_MODS)) {
  const mejoras = list.filter(m => m.kind === 'mejora');
  const aspectos = list.filter(m => m.kind === 'aspecto');
  if (mejoras.length !== 1) throw new Error(`${skId}: debe tener exactamente 1 Mejora`);
  if (aspectos.length !== 2) throw new Error(`${skId}: debe tener 2 Aspectos`);
  const grp = aspectos[0].group;
  for (const a of aspectos) {
    if (a.group !== grp) throw new Error(`${skId}: los Aspectos deben compartir grupo (excluyentes)`);
    if (a.req !== mejoras[0].id) throw new Error(`${skId}: los Aspectos deben requerir la Mejora`);
    if (!a.name || !a.desc) throw new Error(`${skId}: Aspecto incompleto`);
  }
  if (mejoras[0].req) throw new Error(`${skId}: la Mejora no debe tener requisito`);
}
console.log(`Estructura: cada skill = 1 Mejora + 2 Aspectos excluyentes (req Mejora) ✓`);

// agregación: suma efectos de los modificadores ASIGNADOS
const empty = aggregateSkillMods('golpe_brutal', {});
if (empty.dmg !== 0 || empty.crit !== 0 || empty.dot !== null) throw new Error('agregado vacío debe ser neutro');
const gb = aggregateSkillMods('golpe_brutal', { gb_m: true, gb_a1: true });
if (gb.dmg !== 25) throw new Error('la Mejora debe sumar +25% daño: ' + gb.dmg);
if (gb.crit !== 30) throw new Error('Verdugo debe sumar +30 crítico: ' + gb.crit);
const gbBleed = aggregateSkillMods('golpe_brutal', { gb_m: true, gb_a2: true });
if (gbBleed.dot !== 'bleed') throw new Error('Sangrante debe aplicar bleed');
console.log('Agregación: Mejora + Aspecto suman sus efectos (dmg/crit/dot) ✓');

// proyectiles y radio se acumulan; pierce es booleano
const fm = aggregateSkillMods('flecha_multiple', { fm_m: true, fm_a1: true });
if (fm.proj !== 2) throw new Error('Enjambre debe dar +2 proyectiles');
const dc = aggregateSkillMods('disparo_certero', { dc_m: true, dc_a1: true });
if (dc.pierce !== true) throw new Error('Perforante debe activar pierce');
const nh = aggregateSkillMods('nova_hielo', { nh_m: true, nh_a1: true });
if (nh.radius !== 40) throw new Error('Glacial debe dar +40% radio');
console.log('Agregación: proj/pierce/radio correctos ✓');

// buff/dur para habilidades de tipo buff
const gg = aggregateSkillMods('grito_guerra', { gg_m: true, gg_a1: true });
if (gg.buff !== 30 || gg.dur !== 80) throw new Error('Grito: Mejora +30% potencia, Duradero +80% duración');
console.log('Agregación: buff/duración para habilidades de buff ✓');

console.log('\n✅ MODIFICADORES DE HABILIDAD OK');
