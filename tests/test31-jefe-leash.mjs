// Jefe de mundo: ronda su zona y vuelve a su spawn si lo alejas demasiado
// (no persigue indefinidamente). Cinemática con rejilla libre para que el
// regreso sea determinista (no depende del trazado de obstáculos).
import * as THREE from 'three';
import { buildZone } from '../js/zones.js';
import { Enemy } from '../js/entities.js';
import { scaleEnemy, bossForFloor } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildZone('Cripta', { seed: 11 });
// rejilla libre: aísla la lógica de leash/roam de la colisión con muros
world.grid.walkable = () => true;
world.grid.lineOfSight = () => true;

const game = {
  world, enemies: [], entityGroup: { add() {} },
  player: { alive: true, pos: world.spawn.clone() },
  ui: { spawnText() {}, message() {} }, sfx() {},
};

const home = world.spawn.clone();
const def = scaleEnemy(bossForFloor(5), 5); def.worldBoss = true;
const boss = new Enemy(game, def, home.clone());
boss.home = home.clone();
boss.leash = 14;
boss.aggroed = true;
game.enemies.push(boss);

// 1) lo alejamos más allá del leash y ponemos al jugador lejísimos:
// el jefe debe regresar a su zona y calmarse
game.player.pos.copy(home).add(new THREE.Vector3(40, 0, 0));
boss.pos.copy(home).add(new THREE.Vector3(20, 0, 0));
let returned = false;
for (let i = 0; i < 1200; i++) {
  boss.update(1 / 30);
  if (!boss.aggroed && boss.pos.distanceTo(home) <= boss.leash * 0.5) { returned = true; break; }
}
if (!returned) throw new Error('el jefe no volvió a su spawn al alejarlo');
if (boss.aggroed) throw new Error('el jefe debería des-aggroarse al volver a casa');
console.log('Jefe de mundo: vuelve a su spawn y se calma al alejarlo ✓');

// 2) con el jugador lejos, patrulla SIN salir de su zona (leash)
let maxDist = 0;
for (let i = 0; i < 600; i++) {
  boss.update(1 / 30);
  maxDist = Math.max(maxDist, boss.pos.distanceTo(home));
}
if (maxDist > boss.leash) throw new Error(`el jefe se alejó de su zona (${maxDist.toFixed(1)} > ${boss.leash})`);
if (boss.aggroed) throw new Error('el jefe no debería aggroarse con el jugador lejos');
console.log(`Jefe de mundo: patrulla dentro de su zona (máx ${maxDist.toFixed(1)} ≤ ${boss.leash}) ✓`);

// 3) si el jugador entra en su área con visión, sí aggro
game.player.pos.copy(boss.pos).add(new THREE.Vector3(4, 0, 0));
boss.update(1 / 30);
if (!boss.aggroed) throw new Error('el jefe debería aggroarse si entras en su zona');
console.log('Jefe de mundo: aggro al entrar en su área ✓');

console.log('test31-jefe-leash OK');
