// Paso 2 (E1.5) — partido de test67 §2 para no apagar el resto de esa guarda en la cuarentena:
// los poderes clave que venían de las maestrías (Paso 2c.0) siguen en un nodo de talento de su clase
// (clase, especialización o árbol héroe) y están registrados.
// Con los talentos v2 esqueleto (fx vacío + todo) ningún nodo los lleva: en E2 cada KT los pone en su nodo
// 2g o los retira según el documento de su clase, y el orquestador ajusta esta lista (tests/pending-2g.json).
import assert from 'node:assert/strict';
import { POWER_HOOKS } from '../js/powers.js';
import { TALENT_TREES } from '../js/talents.js';

// poder clave → clase que lo lleva
// Arquera (E2, KT-arquera): ninguno sigue en un nodo 2g. m_deadeye (Tiro Mortal) y m_hunt (Cacería)
// salen con las maestrías (docs/paso2g-arquera.md §11.1, «Se retiran»); multidisparo solo queda como
// poder de legendario (items.js; lo vigilan test16 y loot-regression), no de talento.
const KEY_POWERS = {
  // Guerrero (docs/paso2g-guerrero.md §11.3): m_aegis y m_judgment salen; m_berserk sigue en b0
  m_berserk: 'guerrero',
  // Maga (KT-maga, E2): Conflagración, Sobrecarga y el astillamiento v1 salen en 2g (docs/paso2g-maga-coherencia.md:
  // Cero Absoluto es k_cero y la mecánica de Cargas, a_cargas); m_shatter sigue registrado (lo cubre test-powers-maga)
  // Arquera (KT-arquera, E2, docs/paso2g-arquera.md §11.1): m_deadeye, m_hunt y multidisparo salen en 2g
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
