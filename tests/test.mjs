import { buildTown, buildDungeon } from '../js/world.js';
import { generateItem, rollDrops, itemStatLines, makeGold } from '../js/items.js';
import { CLASSES, scaleEnemy, pickEnemyDef, BOSS, xpForLevel, skillVal } from '../js/data.js';

// mundo
const town = buildTown();
console.log('Pueblo:', town.grid.w + 'x' + town.grid.h, '| interactuables:', town.interactables.map(i=>i.type).join(','));
if (!town.grid.walkable(town.spawn.x, town.spawn.z)) throw new Error('spawn del pueblo no transitable');

for (let f = 1; f <= 12; f++) {
  const d = buildDungeon(f);
  if (!d.grid.walkable(d.spawn.x, d.spawn.z)) throw new Error('spawn mazmorra no transitable piso '+f);
  const types = d.interactables.map(i=>i.type);
  if (!types.includes('portal_town') || !types.includes('portal_next')) throw new Error('faltan portales piso '+f);
  const bosses = d.spawns.filter(s=>s.kind==='boss').length;
  if (bosses !== 1) throw new Error('jefes='+bosses+' en piso '+f);
  // todos los spawns en celdas transitables
  for (const s of d.spawns) {
    const positions = s.positions || [s.pos];
    for (const pos of positions) if (!d.grid.walkable(pos.x, pos.z, 0.1)) throw new Error('spawn enemigo en muro, piso '+f);
  }
  if (f<=3) console.log(`Piso ${f}: ${d.rooms.length} salas, ${d.spawns.length} spawns, ${types.filter(t=>t==='chest').length} cofres`);
}

// objetos
const counts = {};
for (let i = 0; i < 2000; i++) {
  const it = generateItem(1 + Math.floor(Math.random()*10));
  counts[it.rarity] = (counts[it.rarity]||0)+1;
  if (!it.name || !it.slot) throw new Error('item inválido');
  itemStatLines(it);
}
console.log('Rarezas (2000 items):', counts);
console.log('Ejemplo legendario:', JSON.stringify(generateItem(5, 'legendario')));
console.log('Drops jefe piso 3:', rollDrops(3, {boss:true}).map(d=>d.kind).join(','), '| oro:', makeGold(3).amount);

// enemigos y clases
for (let f = 1; f <= 8; f++) { pickEnemyDef(f); }
const z5 = scaleEnemy(pickEnemyDef(5), 5);
console.log('Enemigo piso 5:', z5.name, 'HP', z5.hp, 'DMG', z5.dmg);
const b = scaleEnemy(BOSS, 4); console.log('Jefe piso 4: HP', b.hp);
for (const c of Object.values(CLASSES)) {
  for (const sk of c.skills) {
    if (sk.type !== 'passive') { skillVal(sk.mana, 5); if (sk.mult) skillVal(sk.mult, 5); }
    if (![1,2,3].includes(sk.tier)) throw new Error('tier inválido');
  }
  console.log(`Clase ${c.name}: ${c.skills.length} habilidades OK`);
}
console.log('XP nivel 1→2:', xpForLevel(1), '| 9→10:', xpForLevel(9));
console.log('\n✅ TODO OK');
