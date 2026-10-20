// ============================================================
// Cobertura de talentos por clase (Paso 2c.0 → para los test-powers-<clase>.mjs de 2c.1)
// ============================================================
// docs/paso2-diseno.md §9.1.5 (a): todo `power` y todo `grant` de js/talents-<clase>.js
// debe existir en el registro (POWER_HOOKS) o como comportamiento / tipo genérico.
//
//   import { talentRefs, missingFor, KEY_NODE_MULTS } from './helpers/talent-coverage.mjs';
//   assert.deepEqual(missingFor('guerrero'), { powers: [], behaviors: [], skills: [] });
//
// talentRefs(classId) → { powers:Set, grants:Set, behaviors:Set } referenciados por los
// árboles (nodos y opciones de elección) y por las activas de talento de la clase.
// missingFor(classId) → lo que AÚN falta registrar:
//   powers    ids de `power` sin entrada en POWER_HOOKS
//   behaviors `behavior` de activas de talento sin defineSkillBehavior con cast (si la
//             activa no tiene además un tipo genérico que la lance)
//   skills    activas de talento que hoy NO se podrían lanzar (game-skills.skillCastable)
import { TALENT_TREES } from '../../js/talents.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../../js/powers.js';
import { CLASSES } from '../../js/data.js';
import { skillCastable } from '../../js/game-skills.js';
import { GENERIC_TYPES } from '../../js/skill-defs.js';

// los únicos poderes con `mult` (§5.2.2): los nodos clave que ya estaban registrados
export const KEY_NODE_MULTS = ['furia', 'm_berserk', 'm_deadeye', 'm_hunt'];

export function talentRefs(classId) {
  const t = TALENT_TREES[classId];
  const powers = new Set(), grants = new Set(), behaviors = new Set();
  if (!t) return { powers, grants, behaviors };
  for (const tree of [t.cls, ...t.specs]) {
    for (const n of tree.nodes) {
      for (const fx of n.t === 'c' ? (n.opts || []).map(o => o.fx || {}) : [n.fx || {}]) {
        if (fx.power) powers.add(fx.power);
        if (fx.grant) grants.add(fx.grant);
      }
    }
  }
  for (const sk of t.skills || []) if (sk.behavior) behaviors.add(sk.behavior);
  return { powers, grants, behaviors };
}

export function missingFor(classId) {
  const { powers, grants } = talentRefs(classId);
  const list = CLASSES[classId]?.skills || [];
  const talentSkills = list.filter(s => s.kind === 'talent');
  return {
    powers: [...powers].filter(id => !POWER_HOOKS[id]).sort(),
    behaviors: talentSkills.filter(s => s.behavior && !SKILL_BEHAVIORS[s.behavior]?.cast && !GENERIC_TYPES.includes(s.type)).map(s => s.behavior).sort(),
    skills: [...grants].filter(id => !skillCastable(list.find(s => s.id === id))).sort(),
  };
}
