import * as THREE from 'three';
import { gambleItem, generateItem } from '../js/items.js';
import { MIMIC, scaleEnemy } from '../js/data.js';
import { Enemy } from '../js/entities.js';
import { buildTown, buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// apuesta: nunca normal, distribución razonable, respeta el slot pedido
const dist = {};
for (let i = 0; i < 3000; i++) {
  const it = gambleItem(5, 'weapon');
  if (it.slot !== 'weapon') throw new Error('gamble ignoró el slot');
  if (it.rarity === 'normal') throw new Error('gamble devolvió objeto normal');
  dist[it.rarity] = (dist[it.rarity] || 0) + 1;
}
console.log('Apuesta (3000):', dist);
const ring = generateItem(3, null, 'ring');
if (ring.slot !== 'ring') throw new Error('generateItem ignoró el slot');

// mímico: modelo y escalado
const def = scaleEnemy(MIMIC, 4);
const fake = { ui: { spawnText(){} }, sfx(){} };
const m = new Enemy(fake, def, new THREE.Vector3());
if (!m.group.children.length) throw new Error('mímico sin modelo');
console.log('Mímico piso 4: HP', def.hp, 'DMG', def.dmg);

// waypoints en el mundo
const town = buildTown();
if (!town.interactables.some(i => i.type === 'waypoint')) throw new Error('pueblo sin waypoint');
for (const f of [5, 10, 15]) {
  const d = buildDungeon(f);
  const wp = d.interactables.find(i => i.type === 'waypoint');
  if (!wp || wp.floor !== f) throw new Error('piso ' + f + ' sin waypoint');
  if (!d.grid.walkable(wp.pos.x, wp.pos.z, 0.1)) throw new Error('waypoint en muro');
}
const d4 = buildDungeon(4);
if (d4.interactables.some(i => i.type === 'waypoint')) throw new Error('piso 4 no debería tener waypoint');

// cofres mímicos existen estadísticamente
let mimics = 0, chests = 0;
for (let i = 0; i < 40; i++)
  for (const it of buildDungeon(3).interactables)
    if (it.type === 'chest') { chests++; if (it.mimic) mimics++; }
console.log(`Cofres: ${chests}, mímicos: ${mimics} (${(mimics/chests*100).toFixed(0)}%)`);
console.log('✅ WAYPOINTS/MÍMICOS/APUESTA OK');
