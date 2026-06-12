import { makeGem, GEMS } from '../js/items.js';

// receta: 3 gemas iguales → gema del mismo tipo más fuerte (ilvl+3)
for (const g of GEMS) {
  const base = makeGem(4, g.id);
  const up = makeGem(4 + 3, g.id);
  if (up.gemId !== g.id) throw new Error('makeGem ignoró el tipo');
  const v0 = Object.values(base.stats)[0], v1 = Object.values(up.stats)[0];
  if (v1 <= v0) throw new Error(`mejora sin efecto en ${g.id}: ${v0} → ${v1}`);
}
console.log('Receta de gemas: tipo conservado y stats superiores (ilvl+3) ✓');
const mixed = makeGem(6);
if (!GEMS.some(g => g.id === mixed.gemId)) throw new Error('gema aleatoria inválida');
console.log('✅ RECETAS DE GEMAS OK');
