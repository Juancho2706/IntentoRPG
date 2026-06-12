import * as THREE from 'three';
import { Player, Enemy, Projectile } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const texts = [];
const fakeGame = {
  ui: { spawnText: (p, t) => texts.push(t), message: m => texts.push(m), flashDamage(){}, },
  sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){},
  input: { joyDir: null, keyDir: null },
  enemies: [],
  projectiles: [],
  spawnProjectile(opts) { const pr = new Projectile(fakeGame, opts); fakeGame.projectiles.push(pr); },
  onEnemyKilled(e) { fakeGame.player.gainXP(e.def.xp); },
  onPlayerDeath() { texts.push('MUERTE'); },
  pickupGroundItem(){},
};

const world = buildDungeon(1);
fakeGame.world = world;

for (const cid of ['guerrero', 'maga', 'arquera']) {
  const p = new Player(fakeGame, cid);
  p.skills[p.cls.skills[0].id] = 1;
  fakeGame.player = p;
  p.pos.copy(world.spawn);
  console.log(`${cid}: HP ${p.stats.maxHP} MP ${p.stats.maxMP} DMG ${p.stats.dmgMin}-${p.stats.dmgMax} crit ${p.stats.crit.toFixed(1)}% arm ${p.stats.arm}`);

  // enemigo al lado, el jugador lo ataca hasta matarlo
  const e = new Enemy(fakeGame, scaleEnemy(pickEnemyDef(1), 1), world.spawn.clone().add(new THREE.Vector3(1.2, 0, 0)));
  fakeGame.enemies = [e];
  p.attackTarget = e;
  let steps = 0;
  while (e.alive && steps++ < 3000) {
    p.update(1/60);
    e.update(1/60);
    for (let i = fakeGame.projectiles.length-1; i>=0; i--)
      if (fakeGame.projectiles[i].update(1/60)) fakeGame.projectiles.splice(i,1);
  }
  if (!e.alive) console.log(`  mató a ${e.def.name} en ${steps} ticks; HP jugador ${Math.round(p.hp)}/${p.stats.maxHP}; XP ${p.xp}`);
  else throw new Error('no pudo matar al enemigo: '+cid);

  // buffs y daño recibido
  p.addBuff('test', { dmgPct: 50 }, 5);
  const d1 = p.stats.dmgMax;
  p.update(6); // expira
  if (p.stats.dmgMax >= d1) throw new Error('buff no expiró');
  p.takeDamage(10, 1);
  p.usePotion('hp');

  // subir de nivel
  p.gainXP(100);
  if (p.level < 2 || p.statPoints < 5) throw new Error('level up falló');
}
console.log('Textos de ejemplo:', texts.slice(0,5).join(' | '));
console.log('✅ COMBATE OK');
