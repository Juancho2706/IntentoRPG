import * as THREE from 'three';
import { Enemy, Player } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(2);
const fake = {
  ui: { spawnText(){}, message(){}, flashDamage(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  spawnTelegraph(){}, spawnProjectile(){}, spawnRing(){}, spawnDashGhost(){}, input: { joyDir: null, keyDir: null },
  world, enemies: [], onEnemyKilled(){},
};
const r0 = world.rooms[1];
const center = world.grid.center(r0.cx, r0.cz);

// LOD: un enemigo lejano y sin aggro razona a intervalos (cuenta sus raycasts de LOS)
let losCalls = 0;
const realLOS = world.grid.lineOfSight.bind(world.grid);
world.grid.lineOfSight = (...a) => { losCalls++; return realLOS(...a); };
fake.player = { alive: true, pos: center.clone().add(new THREE.Vector3(30, 0, 0)), takeDamage(){}, slowT: 0 };
const sleeper = new Enemy(fake, scaleEnemy(pickEnemyDef(2), 2), center.clone());
for (let i = 0; i < 300; i++) sleeper.update(1/60); // 5s a 60fps = 300 frames
// dormido y lejos: a lo sumo ~unas pocas comprobaciones (no 300)
if (losCalls > 20) throw new Error('un enemigo dormido razona demasiado: ' + losCalls + ' LOS en 300 frames');
if (sleeper.aggroed) throw new Error('no debería aggro a 30u');
console.log(`LOD: enemigo dormido lejano = ${losCalls} raycasts en 300 frames (antes ~300) ✓`);

// al acercar el jugador con visión directa, despierta (pegado = LOS garantizada)
fake.player.pos.copy(sleeper.pos).add(new THREE.Vector3(0.6, 0, 0));
for (let i = 0; i < 120; i++) sleeper.update(1/60);
if (!sleeper.aggroed) throw new Error('no despertó al acercarse');
console.log('Despierta al entrar en rango con visión ✓');

// ser golpeado despierta al instante
const s2 = new Enemy(fake, scaleEnemy(pickEnemyDef(2), 2), center.clone().add(new THREE.Vector3(8,0,0)));
s2.takeDamage(1);
if (!s2.aggroed) throw new Error('un golpe debería despertar al enemigo');
console.log('Un golpe despierta al enemigo ✓');

// dash: ease-out recorre una distancia razonable y deja estela
let ghosts = 0;
fake.spawnDashGhost = () => ghosts++;
const p = new Player(fake, 'guerrero');
fake.player = p;
p.pos.copy(center);
// medir la cinemática pura del dash con la rejilla despejada (sin muros que lo frenen)
const realWalk = world.grid.walkable.bind(world.grid);
world.grid.walkable = () => true;
fake.input.keyDir = { x: 0, z: -1 };
const start = p.pos.clone();
p.dodge();
fake.input.keyDir = null;
for (let i = 0; i < 30; i++) p.update(1/60);
world.grid.walkable = realWalk;
const dist = p.pos.distanceTo(start);
if (dist < 2.5 || dist > 5) throw new Error('distancia de dash fuera de rango: ' + dist.toFixed(2));
if (ghosts < 3) throw new Error('el dash no dejó estela: ' + ghosts);
console.log(`Dash ease-out: ${dist.toFixed(1)}u recorridos, ${ghosts} imágenes de estela ✓`);
console.log('✅ OPTIMIZACIÓN IA / DASH OK');
