import * as THREE from 'three';
import { Pet } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
const r0 = world.rooms[0];
const center = world.grid.center(r0.cx, r0.cz);

let picked = [];
const fake = {
  ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  input: { joyDir: null, keyDir: null }, world, enemies: [],
  groundItems: [],
  pickupGroundItem(gi) { picked.push(gi.item.kind); fake.groundItems.splice(fake.groundItems.indexOf(gi), 1); },
  player: { alive: true, pos: center.clone(), inventory: [], attackTarget: null, level: 5, stats: { dmgMin: 4, dmgMax: 8 } },
};

// oro y gema a unos pasos del dueño: el lobo va y los recoge
fake.groundItems.push(
  { item: { kind: 'gold' }, mesh: { position: center.clone().add(new THREE.Vector3(2.5, 0.35, 0)) } },
  { item: { kind: 'gem' }, mesh: { position: center.clone().add(new THREE.Vector3(0, 0.35, 2.5)) } },
);
const pet = new Pet(fake);
pet.pos.copy(center).add(new THREE.Vector3(-1, 0, 0));
for (let i = 0; i < 60 * 8 && fake.groundItems.length; i++) pet.update(1/60);
if (picked.length !== 2) throw new Error('el lobo no recogió todo: ' + picked.join(','));
console.log(`El lobo recolectó: ${picked.join(' y ')} ✓`);

// con el inventario lleno, ignora gemas (no spamea 'inventario lleno')
picked = [];
fake.player.inventory = new Array(32).fill({});
fake.groundItems.push({ item: { kind: 'gem' }, mesh: { position: center.clone().add(new THREE.Vector3(2, 0.35, 0)) } });
for (let i = 0; i < 120; i++) pet.update(1/60);
if (picked.length) throw new Error('recogió gema con inventario lleno');
console.log('Con la mochila llena ignora gemas ✓');

// pero el oro sí lo sigue recogiendo
fake.groundItems.length = 0;
fake.groundItems.push({ item: { kind: 'gold' }, mesh: { position: center.clone().add(new THREE.Vector3(2, 0.35, 0)) } });
for (let i = 0; i < 60 * 6 && fake.groundItems.length; i++) pet.update(1/60);
if (picked[0] !== 'gold') throw new Error('no recogió oro con mochila llena');
console.log('El oro se recoge aunque la mochila esté llena ✓');
console.log('✅ LOBO RECOLECTOR OK');
