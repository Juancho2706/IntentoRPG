import { SETS, generateSetItem, rollDrops, generateItem, RARITIES } from '../js/items.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// validez de los sets: slots únicos por set, affixes conocidos
for (const s of SETS) {
  const slots = s.pieces.map(p => p.slot);
  if (new Set(slots).size !== slots.length) throw new Error('slots duplicados en ' + s.id);
}
for (let i = 0; i < 500; i++) {
  const it = generateSetItem(1 + Math.floor(Math.random() * 12));
  if (it.rarity !== 'conjunto' || !it.setId || !RARITIES[it.rarity]) throw new Error('pieza inválida');
}
console.log('Sets válidos:', SETS.map(s => `${s.name} (${s.pieces.length} piezas)`).join(', '));

// bonus de conjunto aplicado al equipar
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'guerrero');
const base = p.stats.dmgMax;
// equipa 2 piezas del Lobo (bonus 2p: +12% daño)
p.equipment.helm = generateSetItemOf('lobo', 'helm'); p.equipment.helm.unidentified = false;
p.equipment.chest = generateSetItemOf('lobo', 'chest'); p.equipment.chest.unidentified = false;
function generateSetItemOf(setId, slot) {
  for (let i = 0; i < 500; i++) { const it = generateSetItem(1); if (it.setId === setId && it.slot === slot) return it; }
  throw new Error('no generó la pieza');
}
p.recompute();
const with2 = p.stats.dmgMax;
if (with2 <= base) throw new Error('bonus de 2 piezas no aplicado');
p.equipment.helm = null;
p.recompute();
if (p.stats.dmgMax >= with2) throw new Error('bonus no se retiró al desequipar');
console.log(`Bonus de conjunto: daño ${base} → ${with2} con 2 piezas del Lobo ✓`);

// nueva distribución de rarezas
for (const floor of [1, 5, 10]) {
  const c = { items: 0, normal: 0, magico: 0, raro: 0, legendario: 0, conjunto: 0 };
  const N = 40000;
  for (let i = 0; i < N; i++)
    for (const d of rollDrops(floor))
      if (d.kind === 'item') { c.items++; c[d.rarity]++; }
  const per100 = k => (c[k] / N * 100).toFixed(2);
  console.log(`Piso ${floor}: por 100 kills → ${per100('items')} items | ${per100('magico')} mág, ${per100('raro')} raros, ${per100('legendario')} leg, ${per100('conjunto')} set`);
}
// la tienda y la apuesta no venden sets
for (let i = 0; i < 300; i++) if (generateItem(5).setId) throw new Error('generateItem devolvió set');
console.log('✅ SETS Y REBALANCE OK');
