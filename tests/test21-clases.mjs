import * as THREE from 'three';
import { CLASSES } from '../js/data.js';
import { generateItem } from '../js/items.js';
import { Player, Enemy } from '../js/entities.js';
import { scaleEnemy, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// cada clase tiene un tipo de ataque básico distinto
const atks = Object.values(CLASSES).map(c => c.atk);
if (new Set(atks).size !== 3) throw new Error('los ataques básicos no son distintos: ' + atks.join(','));
console.log('Ataques por clase:', Object.values(CLASSES).map(c => `${c.name}=${c.atk}`).join(', '), '✓');

const world = buildDungeon(1);
const mk = () => ({ ui: { spawnText(){}, message(){}, flashDamage(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, spawnRing(){}, input: { joyDir: null, keyDir: null }, world, enemies: [], onEnemyKilled(){},
  projectiles: [], spawnProjectile(o){ this.projectiles.push(o); } });

// guerrero (cleave): golpea a varios enemigos pegados, sin proyectil
let g = mk();
const gp = new Player(g, 'guerrero'); g.player = gp; gp.pos.set(0,0,0);
const t1 = new Enemy(g, scaleEnemy(pickEnemyDef(1),1), new THREE.Vector3(1.5,0,0)); t1.maxHP=t1.hp=999;
const t2 = new Enemy(g, scaleEnemy(pickEnemyDef(1),1), new THREE.Vector3(2.2,0,0)); t2.maxHP=t2.hp=999;
g.enemies = [t1, t2];
gp.basicAttack(t1);
if (g.projectiles.length) throw new Error('el guerrero no debería lanzar proyectil');
if (t1.hp === 999 || t2.hp === 999) throw new Error('el tajo no golpeó a ambos enemigos pegados');
console.log('Guerrero: tajo golpea al objetivo y a los cercanos ✓');

// maga (bolt) y arquera (arrow): lanzan proyectil, sin daño melee directo
for (const [cid, label] of [['maga','arcano'],['arquera','flecha']]) {
  const gg = mk();
  const pp = new Player(gg, cid); gg.player = pp; pp.pos.set(0,0,0);
  const e = new Enemy(gg, scaleEnemy(pickEnemyDef(1),1), new THREE.Vector3(5,0,0)); e.maxHP=e.hp=999;
  gg.enemies = [e];
  pp.basicAttack(e);
  if (gg.projectiles.length !== 1) throw new Error(cid + ' no lanzó proyectil');
  if (e.hp !== 999) throw new Error(cid + ' no debería dañar al instante (es a distancia)');
  console.log(`${CLASSES[cid].name}: proyectil ${label} a distancia ✓`);
}

// off-hands apropiados por clase: con classHint solo cae el off-hand de esa clase
const offByClass = { guerrero: 'Escudo', maga: 'Orbe', arquera: 'Carcaj' };
for (const cid of ['guerrero','maga','arquera']) {
  const names = new Set();
  for (let i=0;i<200;i++) names.add(generateItem(5, 'magico', 'offhand', null, cid).baseName.split(' ')[0]);
  // todas las muestras deben empezar por el tipo de su clase
  const wrong = [...names].filter(n => !offByClass[cid].startsWith(n) && !n.startsWith(offByClass[cid]) && !offMatch(cid, n));
  function offMatch(c, n){ return (c==='guerrero'&&n==='Escudo')||(c==='maga'&&(n==='Orbe'||n==='Foco'||n==='Globo'))||(c==='arquera'&&(n==='Carcaj'||n==='Aljaba')); }
  if (wrong.length) throw new Error(`${cid} recibió off-hand ajeno: ${wrong.join(',')}`);
  console.log(`${CLASSES[cid].name}: off-hand propio (${[...names].join('/')}) ✓`);
}

// armas apropiadas: con classHint solo cae el arma de esa clase
for (const cid of ['guerrero','maga','arquera']) {
  const icons = new Set();
  for (let i=0;i<200;i++) icons.add(generateItem(5, 'magico', 'weapon', null, cid).icon);
  if (icons.size !== 1) throw new Error(`${cid} recibió armas mezcladas: ${[...icons].join('')}`);
}
console.log('Armas acordes a la clase ✓');
console.log('✅ ATAQUES Y OFF-HANDS POR CLASE OK');
