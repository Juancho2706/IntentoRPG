import * as THREE from 'three';
import { generateQuest, QUEST_TYPES, PET_PRICE } from '../js/data.js';
import { buildTown, buildDungeon } from '../js/world.js';
import { Player, Enemy, Pet } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// misiones: estructura válida para todos los tipos y niveles
for (let i = 0; i < 200; i++) {
  const q = generateQuest(1 + Math.floor(Math.random() * 20));
  if (!q.goal || q.goal < 1 || !q.desc || !q.reward.gold || !q.reward.xp) throw new Error('misión inválida');
  if (!QUEST_TYPES.some(t => t.type === q.type)) throw new Error('tipo desconocido');
}
console.log('Misiones: 200 generadas OK · tipos:', QUEST_TYPES.map(t => t.type).join(', '));

// pueblo: capitán y portal diario presentes
const town = buildTown();
for (const t of ['questgiver', 'portal_daily', 'waypoint', 'healer', 'vendor', 'gate_zone'])
  if (!town.interactables.some(i => i.type === t)) throw new Error('falta ' + t);
console.log('Pueblo: capitán, portal diario y resto de interactuables ✓');

// mazmorra diaria: misma semilla = mismo trazado; semillas distintas difieren
const layout = d => d.grid.cells.map(r => r.join('')).join('|') + '#' + d.interactables.filter(i => i.type === 'chest').map(i => i.mimic ? 1 : 0).join('');
const a = layout(buildDungeon(5, 20260612));
const b = layout(buildDungeon(5, 20260612));
const c = layout(buildDungeon(5, 20260613));
if (a !== b) throw new Error('la semilla no es determinista');
if (a === c) throw new Error('semillas distintas dan el mismo trazado');
console.log('Diaria: trazado determinista por semilla ✓');

// hardcore: flag respetado en jugador nuevo y guardado
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'maga');
p.hardcore = true;
const saved = JSON.parse(JSON.stringify({ classId: 'maga', hardcore: p.hardcore, level: 3 }));
const p2 = new Player(fake, 'maga', saved);
if (!p2.hardcore) throw new Error('hardcore no persiste');
console.log('Hardcore: flag persistente ✓ · precio del lobo:', PET_PRICE);

// mascota: sigue al dueño y mata a un enemigo cercano
fake.player = p;
p.pos.copy(world.spawn);
const enemy = new Enemy(fake, scaleEnemy(pickEnemyDef(1), 1), world.spawn.clone().add(new THREE.Vector3(1.5, 0, 0)));
fake.enemies = [enemy];
const pet = new Pet(fake);
pet.pos.copy(world.spawn).add(new THREE.Vector3(-1, 0, 0));
let ticks = 0;
while (enemy.alive && ticks++ < 1800) { fake.onEnemyKilled = () => {}; pet.update(1/60); }
if (enemy.alive) throw new Error('el lobo no mató al enemigo');
// y vuelve con el dueño
p.pos.set(world.spawn.x + 3, 0, world.spawn.z);
for (let i = 0; i < 600; i++) pet.update(1/60);
if (pet.pos.distanceTo(p.pos) > 3) throw new Error('el lobo no sigue al dueño');
console.log(`Mascota: mató al ${enemy.def.name} en ${ticks} ticks y sigue al dueño ✓`);
console.log('✅ MISIONES/DIARIA/HARDCORE/MASCOTA OK');
