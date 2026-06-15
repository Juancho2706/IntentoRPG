// Mascota de UTILIDAD (rework): recoge botín, respeta mejoras y NO hace daño.
import * as THREE from 'three';
import { Pet, MAX_MATERIALS } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
const r0 = world.rooms[0];
const center = world.grid.center(r0.cx, r0.cz);

let picked = [];
const makeFake = (petData) => ({
  ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  input: { joyDir: null, keyDir: null }, world, enemies: [],
  groundItems: [],
  pickupGroundItem(gi) { picked.push(gi.item.kind); this.groundItems.splice(this.groundItems.indexOf(gi), 1); },
  player: { alive: true, pos: center.clone(), inventory: [], materials: [], attackTarget: null, level: 5,
    stats: { dmgMin: 4, dmgMax: 8 }, pet: petData },
});

// --- por defecto (sin mejora de materiales): recoge oro y poción, NO gemas ---
let fake = makeFake({ kind: 'lobo', upgrades: {}, collar: 'none' });
fake.groundItems.push(
  { item: { kind: 'gold' }, mesh: { position: center.clone().add(new THREE.Vector3(2.5, 0.35, 0)) } },
  { item: { kind: 'potion', pot: 'hp' }, mesh: { position: center.clone().add(new THREE.Vector3(0, 0.35, 2.5)) } },
  { item: { kind: 'gem' }, mesh: { position: center.clone().add(new THREE.Vector3(-2, 0.35, 0)) } },
);
let pet = new Pet(fake);
pet.pos.copy(center).add(new THREE.Vector3(-1, 0, 0));
for (let i = 0; i < 60 * 10 && picked.length < 2; i++) pet.update(1/60);
if (!picked.includes('gold') || !picked.includes('potion')) throw new Error('no recogió oro+poción: ' + picked.join(','));
if (picked.includes('gem')) throw new Error('recogió gema SIN la mejora de materiales');
console.log(`Sin mejora: recoge oro+poción, ignora gema ✓ (${picked.join(',')})`);

// --- con mejora de materiales Nv.1: ahora SÍ recoge gemas/runas ---
picked = [];
fake = makeFake({ kind: 'lobo', upgrades: { materials: 1 }, collar: 'none' });
fake.groundItems.push({ item: { kind: 'gem' }, mesh: { position: center.clone().add(new THREE.Vector3(2, 0.35, 0)) } });
pet = new Pet(fake);
pet.pos.copy(center).add(new THREE.Vector3(-1, 0, 0));
for (let i = 0; i < 60 * 8 && fake.groundItems.length; i++) pet.update(1/60);
if (!picked.includes('gem')) throw new Error('con mejora materiales no recogió la gema');
console.log('Con mejora de materiales Nv.1 recoge gemas ✓');

// --- bolsa de materiales llena: ignora gemas aunque tenga la mejora ---
picked = [];
fake = makeFake({ kind: 'lobo', upgrades: { materials: 1 }, collar: 'none' });
fake.player.materials = new Array(MAX_MATERIALS).fill({});
fake.groundItems.push({ item: { kind: 'gem' }, mesh: { position: center.clone().add(new THREE.Vector3(2, 0.35, 0)) } });
pet = new Pet(fake);
pet.pos.copy(center).add(new THREE.Vector3(-1, 0, 0));
for (let i = 0; i < 120; i++) pet.update(1/60);
if (picked.length) throw new Error('recogió gema con la bolsa de materiales llena');
console.log('Con la bolsa llena ignora gemas ✓');

// pero el oro sí lo sigue recogiendo
fake.groundItems.length = 0;
fake.groundItems.push({ item: { kind: 'gold' }, mesh: { position: center.clone().add(new THREE.Vector3(2, 0.35, 0)) } });
for (let i = 0; i < 60 * 6 && fake.groundItems.length; i++) pet.update(1/60);
if (picked[0] !== 'gold') throw new Error('no recogió oro con mochila llena');
console.log('El oro se recoge aunque la mochila esté llena ✓');

// --- imán de tesoros: arrastra el oro hacia el jugador ---
fake = makeFake({ kind: 'lobo', upgrades: { magnet: 2 }, collar: 'none' });
const goldMesh = { position: center.clone().add(new THREE.Vector3(5, 0.35, 0)) };
fake.groundItems.push({ item: { kind: 'gold' }, mesh: goldMesh });
pet = new Pet(fake);
pet.pos.copy(center).add(new THREE.Vector3(-1, 0, 0));
const d0 = goldMesh.position.distanceTo(fake.player.pos);
pet.update(1/60); pet.update(1/60);
const d1 = goldMesh.position.distanceTo(fake.player.pos);
if (!(d1 < d0)) throw new Error('el imán no atrajo el oro hacia el jugador');
console.log('Imán de tesoros atrae el oro hacia el jugador ✓');

console.log('✅ MASCOTA DE UTILIDAD OK');
