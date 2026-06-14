import * as THREE from 'three';
import { Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// LOS: una pared bloquea la visión
const d = buildDungeon(2);
const g = d.grid;
// busca dos puntos transitables con muro entre medias (separados por celda 0)
let blocked = null, open = null;
outer:
for (let z = 2; z < g.h - 2; z++)
  for (let x = 2; x < g.w - 2; x++) {
    if (g.cells[z][x] && !g.cells[z][x + 1] && g.cells[z][x + 2]) {
      blocked = [g.ox + x + 0.5, g.oz + z + 0.5, g.ox + x + 2.5, g.oz + z + 0.5];
      break outer;
    }
  }
outer2:
for (let z = 2; z < g.h - 2; z++)
  for (let x = 2; x < g.w - 2; x++)
    if (g.cells[z][x] && g.cells[z][x + 1] && g.cells[z][x + 2]) { open = [g.ox + x + 0.5, g.oz + z + 0.5, g.ox + x + 2.5, g.oz + z + 0.5]; break outer2; }
if (!blocked || !open) throw new Error('no encontré configuración de prueba');
if (g.lineOfSight(...blocked)) throw new Error('LOS atraviesa el muro');
if (!g.lineOfSight(...open)) throw new Error('LOS falla en campo abierto');
console.log('lineOfSight: muro bloquea ✓, campo abierto pasa ✓');

// enemigo sin LOS no toma aggro ni ataca; con LOS sí (y recuerda)
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, spawnTelegraph(){}, spawnProjectile(){}, spawnRing(){}, input: { joyDir: null, keyDir: null }, world: d, enemies: [], onEnemyKilled(){} };
let hits = 0;
fake.player = { alive: true, pos: new THREE.Vector3(blocked[2], 0, blocked[3]), takeDamage() { hits++; }, slowT: 0 };
const e = new Enemy(fake, scaleEnemy(pickEnemyDef(2), 2), new THREE.Vector3(blocked[0], 0, blocked[1]));
const start = e.pos.clone();
for (let i = 0; i < 240; i++) e.update(1/60); // 4s tras un muro
if (hits > 0) throw new Error('atacó sin verte a través del muro');
if (e.pos.distanceTo(start) > 0.01) throw new Error('persiguió sin verte');
if (e.aggroed) throw new Error('aggro sin línea de visión');
// ahora con visión directa
fake.player.pos.set(open[2], 0, open[3]);
e.pos.set(open[0], 0, open[1]);
e.losT = 0;
for (let i = 0; i < 240; i++) e.update(1/60);
if (!e.aggroed) throw new Error('no tomó aggro con visión directa');
console.log(`Aggro: ignora tras muros ✓, detecta con visión (${hits} ataques tras ver) ✓`);
console.log('✅ LÍNEA DE VISIÓN OK');
