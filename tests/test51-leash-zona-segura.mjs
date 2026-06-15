// Zona segura (campamento): los enemigos no entran y, si el jugador está a
// salvo o ellos cruzan el borde, abandonan la caza y vuelven a su spawn.
import * as THREE from 'three';
import { Enemy } from '../js/entities.js';
import { buildZone } from '../js/zones.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildZone('Cripta', { seed: 777, townPocket: true });
if (!world.safeZone) throw new Error('el hogar debe tener safeZone');
const sz = world.safeZone;
const center = new THREE.Vector3((sz.minX + sz.maxX) / 2, 0, (sz.minZ + sz.maxZ) / 2);

let hit = 0;
const g = {
  ui: { spawnText() {}, message() {} }, sfx() {}, vibrate() {}, addShake() {}, world, enemies: [],
  // stubs de FX por si la IA de un enemigo dispara alguna habilidad
  spawnRing() {}, spawnBeam() {}, spawnBurst() {}, spawnTelegraph() {}, spawnFirePool() {},
  player: { alive: true, pos: center.clone(), takeDamage() { hit++; }, stats: { maxHP: 100 } },
};

// enemigo simple (sin habilidades especiales) para una prueba determinista
const def = { id: 'dummy', name: 'Dummy', hp: 60, dmg: 6, spd: 3.2, color: 0x886644, scale: 1, shape: 'humanoid', level: 3 };
const spawn = new THREE.Vector3(sz.maxX + 8, 0, center.z);
const e = new Enemy(g, def, spawn);
g.enemies = [e];
// lo metemos a perseguir cerca del borde del campamento, agresivo
e.pos.set(sz.maxX + 1.5, 0, center.z);
e.aggroed = true;
if (e.spawnPos.distanceTo(spawn) > 0.001) throw new Error('spawnPos debe fijarse al aparecer');

// el jugador está DENTRO de la zona segura → el enemigo no debe alcanzarlo
const dToSpawnBefore = e.pos.distanceTo(e.spawnPos);
for (let i = 0; i < 120; i++) e.update(1 / 60);
if (hit > 0) throw new Error('el enemigo no debería poder golpear al jugador en zona segura');
if (e.aggroed) throw new Error('el enemigo debería abandonar la caza con el jugador a salvo');
const dToSpawnAfter = e.pos.distanceTo(e.spawnPos);
if (!(dToSpawnAfter < dToSpawnBefore)) throw new Error('el enemigo debería regresar hacia su spawn');
// y nunca entró en la zona segura
const inSafe = e.pos.x >= sz.minX && e.pos.x <= sz.maxX && e.pos.z >= sz.minZ && e.pos.z <= sz.maxZ;
if (inSafe) throw new Error('el enemigo no debe entrar en la zona segura');
console.log(`Enemigo abandona la caza y vuelve al spawn (${dToSpawnBefore.toFixed(1)} → ${dToSpawnAfter.toFixed(1)}), sin golpear ✓`);

// con el jugador fuera de la zona segura y cerca, el enemigo SÍ puede perseguir
g.player.pos.set(sz.maxX + 3, 0, center.z);
e.pos.set(sz.maxX + 5, 0, center.z);
e.aggroed = true;
e.update(1 / 60);
if (!e.aggroed) throw new Error('fuera de la zona segura el enemigo debe poder perseguir');
console.log('Fuera de la zona segura la persecución funciona normal ✓');

console.log('\n✅ LEASH / ZONA SEGURA OK');
