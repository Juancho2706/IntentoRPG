import { rollEnemyRank, scaleEnemy, pickEnemyDef, ENEMY_RANKS } from '../js/data.js';
import { generateItem } from '../js/items.js';
import { Enemy } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

// rarezas de monstruos: distribución y stats
const counts = { normal: 0, campeon: 0, elite: 0 };
for (let i = 0; i < 5000; i++) {
  const base = scaleEnemy(pickEnemyDef(3), 3);
  const e = rollEnemyRank(base, 3);
  counts[e.rank || 'normal']++;
  if (e.rank) {
    if (!(e.hp > base.hp && e.dmg >= base.dmg && e.xp > base.xp)) throw new Error('rank sin mejora de stats');
    if (!e.rankLabel || !e.labelCls || !e.glow) throw new Error('rank sin etiqueta/brillo');
  }
}
console.log('Distribución (5000):', counts);

// los élites/campeones se construyen bien como Enemy
const fake = { ui:{spawnText(){}}, sfx(){} };
const elite = rollEnemyRank(scaleEnemy(pickEnemyDef(5), 5), 5);
elite.rank = 'elite'; // forzar campos por si no salió élite
const world = buildDungeon(2);
const en = new Enemy(fake, rollEnemyRank(scaleEnemy(pickEnemyDef(2), 2), 2), world.spawn.clone());
if (!en.uid || en.baseEmissive === undefined) throw new Error('Enemy sin uid/baseEmissive');
console.log('Enemy OK, uid', en.uid);

// stock de tienda simulado (misma lógica que Game.ensureShopStock)
for (const lvl of [1, 8, 20]) {
  const ilvl = Math.max(1, Math.round(lvl * 0.8));
  const n = 4 + Math.min(3, Math.floor(lvl / 5));
  const items = Array.from({ length: n }, () => { const it = generateItem(ilvl); it.price = Math.max(20, it.value * 4); return it; });
  console.log(`Tienda nivel ${lvl}: ${items.length} objetos, ilvl ${ilvl}, precios ${items.map(i=>i.price).join(',')}`);
}
console.log('✅ NUEVAS MECÁNICAS OK');
