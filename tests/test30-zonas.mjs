import { buildZone } from '../js/zones.js';
import { ZONE_LIST } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// las 4 regiones existen con desbloqueo creciente por nivel
if (ZONE_LIST.length !== 4) throw new Error('deberían ser 4 zonas');
let prev = 0;
for (const z of ZONE_LIST) {
  if (z.minLevel < prev) throw new Error('los niveles de desbloqueo no son crecientes');
  prev = z.minLevel;
  if (!z.floor) throw new Error('zona sin piso base: ' + z.biome);
}
console.log('Zonas:', ZONE_LIST.map(z => `${z.biome}(nv${z.minLevel}/piso${z.floor})`).join(', '), '✓');

// cada bioma genera una zona válida y transitable
for (const z of ZONE_LIST) {
  const w = buildZone(z.biome, { seed: 5 });
  if (w.type !== 'zone' || w.biome !== z.biome) throw new Error('zona inválida: ' + z.biome);
  if (!w.grid.walkable(w.spawn.x, w.spawn.z)) throw new Error('spawn no transitable en ' + z.biome);
  const dgs = w.interactables.filter(i => i.type === 'zone_dungeon');
  if (dgs.length < 2) throw new Error('pocas mazmorras en ' + z.biome);
  // simula el escalado de pisos que hace loadWorld
  const bf = z.floor;
  dgs.forEach((d, i) => { d.floor = Math.max(1, bf + (i - Math.floor(dgs.length / 2)) * 2); });
  const floors = dgs.map(d => d.floor);
  if (Math.max(...floors) <= 0) throw new Error('pisos de mazmorra inválidos');
  console.log(`  ${z.biome}: ${dgs.length} mazmorras (pisos ${floors.join('/')}) ✓`);
}
console.log('✅ FASE 2 (multi-zona) OK');
