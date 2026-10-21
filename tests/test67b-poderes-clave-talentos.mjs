// Paso 2 (E1.5) — partido de test67 §2 para no apagar el resto de esa guarda en la cuarentena:
// los poderes clave que venían de las maestrías (Paso 2c.0) siguen en un nodo de talento de su clase
// (clase, especialización o árbol héroe) y están registrados.
// Con los talentos v2 esqueleto (fx vacío + todo) ningún nodo los lleva: en E2 cada KT los pone en su nodo
// 2g o los retira según el documento de su clase, y el orquestador ajusta esta lista (tests/pending-2g.json).
import assert from 'node:assert/strict';
import { POWER_HOOKS } from '../js/powers.js';
import { TALENT_TREES } from '../js/talents.js';

// poder clave → clase que lo lleva
const KEY_POWERS = {
  m_berserk: 'guerrero', m_aegis: 'guerrero', m_judgment: 'guerrero',
  // Maga (KT-maga, E2): Conflagración, Sobrecarga y el astillamiento v1 salen en 2g (docs/paso2g-maga-coherencia.md:
  // Cero Absoluto es k_cero y la mecánica de Cargas, a_cargas); m_shatter sigue registrado (lo cubre test-powers-maga)
  m_deadeye: 'arquera', m_hunt: 'arquera', multidisparo: 'arquera',
};

const powersOf = cid => {
  const t = TALENT_TREES[cid], out = new Set();
  for (const tree of [t.cls, ...t.specs, ...(t.hero || [])]) for (const n of tree.nodes)
    for (const fx of n.t === 'c' ? n.opts.map(o => o.fx || {}) : [n.fx || {}]) if (fx.power) out.add(fx.power);
  return out;
};
const missing = [];
for (const [id, cid] of Object.entries(KEY_POWERS)) {
  assert.ok(POWER_HOOKS[id], `el poder clave ${id} está registrado`);
  if (!powersOf(cid).has(id)) missing.push(`${id} (${cid})`);
}
assert.deepEqual(missing, [], `poderes clave que ningún nodo de talento lleva: ${missing.join(', ')}`);
console.log(`✅ Los ${Object.keys(KEY_POWERS).length} poderes clave de las maestrías siguen en un nodo de talento de su clase`);
