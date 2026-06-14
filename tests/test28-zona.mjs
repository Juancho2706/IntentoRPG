import * as THREE from 'three';
import { buildZone } from '../js/zones.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// genera la zona de la Cripta y valida el contrato que main.js espera
const z = buildZone('Cripta', { seed: 1 });
if (z.type !== 'zone' || z.biome !== 'Cripta') throw new Error('tipo/bioma incorrecto');
for (const k of ['group', 'grid', 'spawn', 'interactables', 'spawns', 'fog', 'ambient', 'sun', 'clearColor']) {
  if (z[k] == null) throw new Error('falta campo del contrato: ' + k);
}
// el spawn debe ser transitable
if (!z.grid.walkable(z.spawn.x, z.spawn.z)) throw new Error('spawn no transitable');
// la rejilla es grande (zona abierta)
if (z.grid.w < 100) throw new Error('la zona debería ser amplia: ' + z.grid.w);
// hay entradas de mazmorra, portal al pueblo y waypoint
const types = z.interactables.map(i => i.type);
for (const t of ['portal_town', 'waypoint', 'zone_dungeon']) if (!types.includes(t)) throw new Error('falta interactable ' + t);
const dungeons = z.interactables.filter(i => i.type === 'zone_dungeon');
if (dungeons.length < 2) throw new Error('pocas entradas de mazmorra');
for (const d of dungeons) {
  if (!d.floor) throw new Error('entrada de mazmorra sin floor');
  if (!z.grid.walkable(d.pos.x, d.pos.z)) throw new Error('entrada de mazmorra en muro');
}
// spawns de enemigos repartidos y transitables (packs o sueltos)
let enemyCount = 0;
for (const s of z.spawns) {
  const positions = s.positions || [s.pos];
  for (const pos of positions) { if (!z.grid.walkable(pos.x, pos.z, 0.1)) throw new Error('spawn en muro'); enemyCount++; }
}
if (enemyCount < 20) throw new Error('pocos enemigos en la zona: ' + enemyCount);
// determinismo por semilla: mismo seed → mismo terreno
const a = buildZone('Cripta', { seed: 42 }).grid.cells.map(r => r.join('')).join('|');
const b = buildZone('Cripta', { seed: 42 }).grid.cells.map(r => r.join('')).join('|');
const c = buildZone('Cripta', { seed: 43 }).grid.cells.map(r => r.join('')).join('|');
if (a !== b) throw new Error('la semilla no es determinista');
if (a === c) throw new Error('semillas distintas dan el mismo terreno');
console.log(`Zona Cripta: ${z.grid.w}×${z.grid.h}, ${dungeons.length} mazmorras, ${enemyCount} enemigos, POIs: ${[...new Set(types)].join(',')} ✓`);
console.log('Determinismo por semilla ✓');
void THREE;
console.log('✅ ZONA ABIERTA OK');
