// ============================================================
// Cobertura de talentos por clase (para los test-powers-<clase>.mjs) — v2 (Paso 2g)
// ============================================================
// docs/paso2-diseno.md §9.1.5 (a): todo `power` y todo `grant` de js/talents-<clase>.js
// (árbol de clase, especializaciones y árboles héroe) debe existir en el registro
// (POWER_HOOKS) o como comportamiento / tipo genérico; y toda habilidad del kit de una
// especialización (catálogo, `spec`) debe poder lanzarse.
//
//   import { talentRefs, missingFor } from './helpers/talent-coverage.mjs';
//   assert.deepEqual(missingFor('guerrero'), { powers: [], behaviors: [], skills: [] });
//
// talentRefs(classId) → { powers:Set, grants:Set, behaviors:Set } referenciados por los
// árboles (nodos y opciones de elección) y por las activas de talento de la clase (D29: en el
// catálogo con kind 'talent'; en datos v1, también en TALENTS.skills).
// missingFor(classId) → lo que AÚN falta registrar:
//   powers    ids de `power` sin entrada en POWER_HOOKS
//   behaviors `behavior` de activas de talento sin defineSkillBehavior con cast (si la
//             activa no tiene además un tipo genérico que la lance)
//   skills    activas de talento y habilidades del kit que hoy NO se podrían lanzar
//             (game-skills.skillCastable)
import { TALENT_TREES } from '../../js/talents.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../../js/powers.js';
import { CLASSES, specKitOf } from '../../js/data.js';
import { skillCastable } from '../../js/game-skills.js';
import { GENERIC_TYPES } from '../../js/skill-defs.js';

/** @deprecated D23: nodos clave con `mult` de los árboles v1 (2c.0). Los árboles v2 no tienen
 *  nodos clave con efecto propio; se conserva para los test-powers-<clase> hasta E2. */
export const KEY_NODE_MULTS = ['furia', 'm_berserk', 'm_deadeye', 'm_hunt'];

const talentSkills = classId => {
  const t = TALENT_TREES[classId];
  const byId = new Map();
  for (const sk of [...(t?.skills || []), ...(CLASSES[classId]?.skills || []).filter(s => s.kind === 'talent')]) byId.set(sk.id, sk);
  return [...byId.values()];
};

export function talentRefs(classId) {
  const t = TALENT_TREES[classId];
  const powers = new Set(), grants = new Set(), behaviors = new Set();
  if (!t) return { powers, grants, behaviors };
  for (const tree of [t.cls, ...(t.specs || []), ...(t.hero || [])]) {
    for (const n of tree.nodes) {
      for (const fx of n.t === 'c' ? (n.opts || []).map(o => o.fx || {}) : [n.fx || {}]) {
        if (fx.power) powers.add(fx.power);
        if (fx.grant) grants.add(fx.grant);
      }
    }
  }
  for (const sk of talentSkills(classId)) if (sk.behavior) behaviors.add(sk.behavior);
  return { powers, grants, behaviors };
}

export function missingFor(classId) {
  const { powers, grants } = talentRefs(classId);
  const list = CLASSES[classId]?.skills || [];
  const kit = (TALENT_TREES[classId]?.specs || []).flatMap(s => specKitOf(classId, s.id));
  return {
    powers: [...powers].filter(id => !POWER_HOOKS[id]).sort(),
    behaviors: talentSkills(classId).filter(s => s.behavior && !SKILL_BEHAVIORS[s.behavior]?.cast && !GENERIC_TYPES.includes(s.type)).map(s => s.behavior).sort(),
    skills: [...new Set([...grants, ...kit])].filter(id => !skillCastable(list.find(s => s.id === id))).sort(),
  };
}
