import * as THREE from 'three';
import { ELITE_MODS, rollEnemyRank, scaleEnemy, pickEnemyDef, ENEMIES } from '../js/data.js';
import { Player, Enemy } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

let telegraphs = 0;
const world = buildDungeon(4);
const fake = {
  ui: { spawnText(){}, message(){}, flashDamage(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  input: { joyDir: null, keyDir: null }, world, enemies: [],
  spawnTelegraph() { telegraphs++; }, spawnRing() {}, spawnProjectile() {},
  onEnemyKilled() {}, onPlayerDeath() {},
};

// esquiva: i-frames, desplazamiento y cooldown
const p = new Player(fake, 'guerrero');
fake.player = p;
p.pos.copy(world.spawn);
const before = p.pos.clone();
fake.input.keyDir = { x: 0, z: -1 };
p.dodge();
fake.input.keyDir = null;
if (p.dodgeT <= 0) throw new Error('dodge no se activó');
const hp0 = p.hp;
p.takeDamage(50, 5);
if (p.hp !== hp0) throw new Error('recibió daño durante la esquiva');
for (let i = 0; i < 30; i++) p.update(1/60);
if (p.pos.distanceTo(before) < 1.5) throw new Error('la esquiva no desplazó: ' + p.pos.distanceTo(before).toFixed(2));
if (p.group.userData.body.rotation.x !== 0) throw new Error('voltereta sin resetear');
const cd = p.dodgeCd;
p.dodge();
if (p.dodgeCd !== cd) throw new Error('ignoró el cooldown');
p.takeDamage(50, 5);
if (p.hp === hp0) throw new Error('fuera de la esquiva debería recibir daño');
console.log(`Esquiva: ${p.pos.distanceTo(before).toFixed(1)}u recorridos, i-frames y cooldown ✓`);

// golpe telegrafiado del gólem
const golem = new Enemy(fake, scaleEnemy(ENEMIES.find(e => e.id === 'golem'), 4), p.pos.clone().add(new THREE.Vector3(1.2, 0, 0)));
golem.aggroed = true;
golem.atkCd = 0;
golem.update(1/60);
if (telegraphs < 1) throw new Error('el gólem no telegrafió');
console.log('Gólem telegrafia su golpe ✓');

// mods de élite: auras y mecánicas
if (ELITE_MODS.length !== 6 || !ELITE_MODS.every(m => m.aura)) throw new Error('mods sin aura');
let elite = null;
for (let i = 0; i < 2000 && !elite; i++) {
  const d = rollEnemyRank(scaleEnemy(pickEnemyDef(3), 3), 3);
  if (d.rank === 'elite') elite = d;
}
if (!elite.modId || !elite.aura) throw new Error('élite sin mod/aura');
const en = new Enemy(fake, elite, world.spawn.clone());
if (!en.aura) throw new Error('élite sin malla de aura');
console.log(`Élite ${elite.rankLabel} con aura ✓ · mods: ${ELITE_MODS.map(m => m.id).join(', ')}`);

// explosivo detona al morir
telegraphs = 0;
const bomber = new Enemy(fake, { ...scaleEnemy(pickEnemyDef(3), 3), explode: true, dmg: 10 }, world.spawn.clone());
bomber.die();
if (telegraphs !== 1) throw new Error('explosivo no detonó');
console.log('Explosivo detona con aviso al morir ✓');

// espinoso refleja daño cuerpo a cuerpo
const thorny = new Enemy(fake, { ...scaleEnemy(pickEnemyDef(3), 3), thorns: 0.2, hp: 9999, level: 3 }, p.pos.clone().add(new THREE.Vector3(1, 0, 0)));
thorny.maxHP = 9999; thorny.hp = 9999;
p.hp = p.stats.maxHP; p.dodgeT = 0; p.atkCd = 0;
p.basicAttack(thorny);
if (p.hp >= p.stats.maxHP) throw new Error('espinas sin efecto');
console.log('Espinoso refleja daño ✓');

// santuarios presentes y válidos
const kinds = new Set();
for (let i = 0; i < 30; i++)
  for (const it of buildDungeon(3).interactables)
    if (it.type === 'shrine') kinds.add(it.shrine);
if (!kinds.size) throw new Error('sin santuarios en 30 mazmorras');
console.log('Santuarios encontrados:', [...kinds].join(', '));
console.log('✅ RONDA DE COMBATE OK');
