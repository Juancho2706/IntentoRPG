// Goblin del tesoro: no ataca, huye del jugador y escapa si no lo cazas a tiempo
import * as THREE from 'three';
import { buildZone } from '../js/zones.js';
import { Enemy } from '../js/entities.js';
import { scaleEnemy, GOBLIN } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildZone('Cripta', { seed: 9 });
world.grid.walkable = () => true; // cinemática libre, aísla la lógica de huida
world.grid.lineOfSight = () => true;

let escaped = false;
const game = {
  world, enemies: [], entityGroup: { add() {} },
  player: { alive: true, pos: world.spawn.clone() },
  ui: { spawnText() {}, message() {} }, sfx() {},
  spawnRing() {}, spawnBurst() {},
  goblinEscape(e) { escaped = true; e.alive = false; e.fade = 2; },
};

const home = world.spawn.clone();
const def = scaleEnemy(GOBLIN, 3); def.goblin = true;
const gob = new Enemy(game, def, home.clone());
gob.escapeT = 5;
game.enemies.push(gob);

// 1) con el jugador encima, el goblin huye (se aleja del punto inicial)
game.player.pos.copy(home);
gob.pos.copy(home).add(new THREE.Vector3(0.5, 0, 0));
for (let i = 0; i < 60; i++) gob.update(1 / 30);
const fled = gob.pos.distanceTo(home);
if (fled <= 0.5) throw new Error(`el goblin no huyó del jugador (dist ${fled.toFixed(2)})`);
console.log(`Goblin: huye del jugador (se alejó ${fled.toFixed(1)}) ✓`);

// 2) el goblin no hace daño (dmg 0): no es una amenaza, es una presa
if (def.dmg !== 0) throw new Error('el goblin no debería hacer daño');
console.log('Goblin: no ataca (dmg 0) ✓');

// 3) si no lo cazas, escapa al agotarse su tiempo
gob.escapeT = 0.1;
for (let i = 0; i < 10 && !escaped; i++) gob.update(1 / 30);
if (!escaped) throw new Error('el goblin no escapó al agotar su tiempo');
if (gob.alive) throw new Error('el goblin debería salir de juego tras escapar');
console.log('Goblin: escapa si no lo cazas a tiempo ✓');

console.log('test32-goblin OK');
