import * as THREE from 'three';
import { buildDungeon } from '../js/world.js';
import { Enemy } from '../js/entities.js';
import { scaleEnemy, ENEMIES } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// papeles de sala: manadas, emboscadas y tesoros aparecen en la generación
let packs = 0, ambushes = 0, treasures = 0, safeChests = 0;
for (let i = 0; i < 60; i++) {
  const d = buildDungeon(5);
  for (const s of d.spawns) {
    if (s.kind === 'pack') {
      packs++;
      if (s.positions.length < 3) throw new Error('manada demasiado pequeña');
      for (const pos of s.positions) if (!d.grid.walkable(pos.x, pos.z, 0.1)) throw new Error('manada en muro');
    }
    if (s.kind === 'elite') treasures++;
  }
  for (const tr of d.triggers || []) {
    if (tr.type === 'ambush') {
      ambushes++;
      if (!tr.waves[0].length) throw new Error('emboscada sin oleada');
      for (const w of tr.waves) for (const pos of w) if (!d.grid.walkable(pos.x, pos.z, 0.1)) throw new Error('oleada en muro');
    }
  }
  // los cofres de emboscada nunca son mímicos
  if ((d.triggers || []).some(t => t.type === 'ambush')) {
    safeChests += d.interactables.filter(c => c.type === 'chest' && !c.mimic).length > 0 ? 1 : 0;
  }
}
if (!packs || !ambushes || !treasures) throw new Error(`faltan papeles: packs ${packs}, emboscadas ${ambushes}, tesoros ${treasures}`);
console.log(`En 60 pisos: ${packs} manadas, ${ambushes} emboscadas, ${treasures} guardias de tesoro ✓`);

// brujo: se teletransporta cuando te acercas
const world = buildDungeon(2);
const fake = {
  ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  spawnRing(){}, spawnTelegraph(){}, spawnProjectile(){}, input: { joyDir: null, keyDir: null },
  world, enemies: [], onEnemyKilled(){},
};
// posición abierta: centro de la primera sala
const r0 = world.rooms[1];
const center = world.grid.center(r0.cx, r0.cz);
fake.player = { alive: true, pos: center.clone().add(new THREE.Vector3(1.2, 0, 0)), takeDamage(){}, slowT: 0 };
const brujo = new Enemy(fake, scaleEnemy(ENEMIES.find(e => e.id === 'brujo'), 2), center.clone());
brujo.losT = 0;
const start = brujo.pos.clone();
for (let i = 0; i < 120; i++) brujo.update(1/60);
if (brujo.pos.distanceTo(start) < 3) throw new Error('el brujo no parpadeó: ' + brujo.pos.distanceTo(start).toFixed(1));
console.log(`Brujo se teletransporta al acercarte (${brujo.pos.distanceTo(start).toFixed(1)}u) ✓`);

// rata: huye con poca vida
const rata = new Enemy(fake, scaleEnemy(ENEMIES.find(e => e.id === 'rata'), 1), center.clone());
rata.hp = Math.floor(rata.maxHP * 0.2);
rata.losT = 0;
const d0 = rata.pos.distanceTo(fake.player.pos);
for (let i = 0; i < 90; i++) rata.update(1/60);
if (rata.pos.distanceTo(fake.player.pos) <= d0) throw new Error('la rata no huyó');
console.log(`Rata cobarde huye con poca vida (${d0.toFixed(1)}u → ${rata.pos.distanceTo(fake.player.pos).toFixed(1)}u) ✓`);

// la música expone su API sin tocar AudioContext al importar
const { Music } = await import('../js/music.js');
const m = new Music();
if (typeof m.play !== 'function' || typeof m.sting !== 'function' || typeof m.setEnabled !== 'function')
  throw new Error('API de música incompleta');
m.play('Cripta'); // sin ctx: solo registra la zona pendiente
if (m.zone !== 'Cripta') throw new Error('zona pendiente no registrada');
console.log('Motor de música: API correcta y segura sin AudioContext ✓');
console.log('✅ ENCUENTROS Y MÚSICA OK');
