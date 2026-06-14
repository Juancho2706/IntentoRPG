import * as THREE from 'three';
import { generateItem, AFFIX_POOL } from '../js/items.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// los stats secundarios existen y los raros+ los traen garantizados
const secs = AFFIX_POOL.filter(a => a.secondary).map(a => a.stat);
for (const s of ['lph', 'mph', 'cdr', 'thorns']) if (!secs.includes(s)) throw new Error('falta secundario ' + s);
let withSec = 0;
for (let i = 0; i < 300; i++) {
  const it = generateItem(8, 'raro');
  if (secs.some(s => s in it.affixes)) withSec++;
}
if (withSec < 290) throw new Error('los raros no traen secundario fiable: ' + withSec + '/300');
console.log(`Stats secundarios: ${secs.join(', ')} · raros con secundario ${withSec}/300 ✓`);

const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){}, flashDamage(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, spawnRing(){}, input: { joyDir: null, keyDir: null }, world, enemies: [], onPlayerDeath(){}, onEnemyKilled(){},
  nearestEnemy(maxDist = 10) { let best = null, bd = maxDist * maxDist; for (const e of this.enemies) { if (!e.alive) continue; const d = e.pos.distanceToSquared(this.player.pos); if (d < bd) { bd = d; best = e; } } return best; } };
const p = new Player(fake, 'guerrero');
fake.player = p;

// reducción de enfriamiento se agrega y se topa en 50
const cdrItem = generateItem(8, 'raro'); cdrItem.unidentified = false; cdrItem.affixes = { cdr: 80 };
p.equipment.helm = cdrItem; p.recompute();
if (p.stats.cdr !== 50) throw new Error('CDR no se topó en 50: ' + p.stats.cdr);
console.log('Reducción de enfriamiento agregada y topada en 50% ✓');

// vida al golpear cura al dañar
const lphItem = generateItem(8, 'raro'); lphItem.unidentified = false; lphItem.affixes = { lph: 10 };
p.equipment.helm = lphItem; p.recompute();
p.hp = p.stats.maxHP - 50;
const before = p.hp;
p.onDealHit();
if (p.hp !== before + 10) throw new Error('vida al golpear no curó: ' + before + '→' + p.hp);
console.log(`Vida al golpear: ${before} → ${p.hp} ✓`);

// espinas reflejan daño al atacante cercano
const thornItem = generateItem(8, 'raro'); thornItem.unidentified = false; thornItem.affixes = { thorns: 15 };
p.equipment.helm = thornItem; p.recompute();
p.pos.set(0, 0, 0);
const e = new Enemy(fake, scaleEnemy(pickEnemyDef(1), 1), new THREE.Vector3(1.5, 0, 0));
e.maxHP = 999; e.hp = 999;
fake.enemies = [e];
p.takeDamage(5, 1);
if (e.hp !== 999 - 15) throw new Error('espinas no reflejaron: ' + e.hp);
console.log(`Espinas: enemigo 999 → ${e.hp} (reflejó 15) ✓`);
console.log('✅ STATS SECUNDARIOS (D3/D4) OK');
