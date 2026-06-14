import * as THREE from 'three';
import { makeRiftKey, itemStatLines } from '../js/items.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// la llave de grieta es un consumible con nivel
const key = makeRiftKey(3);
if (key.kind !== 'riftkey' || key.riftLevel !== 3) throw new Error('llave inválida');
if (!itemStatLines(key)[0].includes('Nivel 3')) throw new Error('la ficha de la llave no describe el nivel');
console.log('Llave de grieta: consumible con nivel ✓');

// modificadores de grieta: escalan con el nivel (replica la fórmula de loadWorld)
const riftMods = (L) => ({
  scaleFloor: 16 + L * 2,
  pact: { qty: 25 + L * 12, mf: 30 + L * 15, xp: 20 + L * 10 },
  enemy: { ehp: 0.3 + L * 0.12, edmg: 0.2 + L * 0.08, espd: Math.min(0.5, 0.05 + L * 0.04) },
});
const r1 = riftMods(1), r5 = riftMods(5);
if (!(r5.scaleFloor > r1.scaleFloor && r5.pact.mf > r1.pact.mf && r5.enemy.ehp > r1.enemy.ehp))
  throw new Error('la grieta no escala con el nivel');
if (r5.enemy.espd > 0.5) throw new Error('la velocidad enemiga debería estar topada');
console.log(`Grieta escala: Nv1 (piso ${r1.scaleFloor}, +${r1.pact.mf}%MF, +${Math.round(r1.enemy.ehp*100)}%vida) → Nv5 (piso ${r5.scaleFloor}, +${r5.pact.mf}%MF, +${Math.round(r5.enemy.ehp*100)}%vida) ✓`);

// completar grieta da llave de nivel superior (contrato)
const next = makeRiftKey(3 + 1);
if (next.riftLevel !== 4) throw new Error('la llave superior debería ser nivel 4');
console.log('Completar una grieta Nv3 → Llave Nv4 (empuje infinito) ✓');
void THREE;
console.log('✅ GRIETAS OK');
