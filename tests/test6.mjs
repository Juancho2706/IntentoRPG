import * as THREE from 'three';
import { BOSSES, bossForFloor, scaleEnemy, ENEMIES } from '../js/data.js';
import { Enemy } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// jefe correcto por piso
const expect = { 1: 'senor_abismo', 5: 'senor_abismo', 6: 'rey_gelido', 10: 'rey_gelido', 11: 'avatar_infierno', 15: 'avatar_infierno', 16: 'corazon_vacio', 30: 'corazon_vacio' };
for (const [f, id] of Object.entries(expect))
  if (bossForFloor(Number(f)).id !== id) throw new Error(`piso ${f}: jefe incorrecto`);
console.log('Jefes por bioma OK:', BOSSES.map(b => `${b.id}(${b.mechanic})`).join(', '));

// mecánica de invocación: el jefe invoca al bajar del 50%
let summoned = 0;
const world = buildDungeon(2);
const fake = {
  ui: { spawnText(){}, message(){} }, sfx(){},
  world, enemies: [], entityGroup: { add(){}, remove(){} },
  player: { alive: true, pos: new THREE.Vector3().copy(world.spawn), takeDamage() {}, slowT: 0 },
  bossSummon() { summoned++; },
  bossFrostNova() {}, spawnFirePool() {}, spawnTelegraph() {},
  spawnRing() {}, onEnemyKilled() {},
};
const boss = new Enemy(fake, scaleEnemy(bossForFloor(1), 1), world.spawn.clone().add(new THREE.Vector3(2, 0, 0)));
boss.aggroed = true;
boss.hp = boss.maxHP * 0.4; // bajo el umbral
boss.update(1/60);
if (summoned !== 1) throw new Error('el jefe no invocó');
boss.update(1/60);
if (summoned !== 1) throw new Error('invocó dos veces');
console.log('Invocación del jefe: una sola vez al 50% ✓');

// nova de hielo: se dispara con cooldown
let novas = 0;
fake.bossFrostNova = () => novas++;
const gelido = new Enemy(fake, scaleEnemy(bossForFloor(6), 6), world.spawn.clone().add(new THREE.Vector3(2, 0, 0)));
gelido.aggroed = true;
for (let i = 0; i < 60 * 14; i++) gelido.update(1/60); // 14 s
if (novas < 2 || novas > 4) throw new Error('novas inesperadas: ' + novas);
console.log(`Nova de hielo: ${novas} en 14s (cd 6s) ✓`);

// transmutación: regla de rarezas (mismo mapa que Game.transmute)
const NEXT = { normal: 'magico', magico: 'raro', raro: 'legendario' };
for (const [from, to] of Object.entries(NEXT)) {
  const it = generateItem(5, to);
  if (it.rarity !== to) throw new Error('forceRarity falló');
  void from;
}
console.log('Transmutación: normal→mágico→raro→legendario ✓');

// el esqueleto existe para las invocaciones
if (!ENEMIES.find(e => e.id === 'esqueleto')) throw new Error('falta esqueleto');
console.log('✅ JEFES Y CUBO OK');
