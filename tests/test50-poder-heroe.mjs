// "Poder del héroe": puntuación de build que sube al mejorar equipo/nivel.
import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = { ui: { message() {}, spawnText() {} }, sfx() {}, vibrate() {}, save() {}, world,
  spawnBurst() {}, tip() {}, enemies: [] };
fake.player = new Player(fake, 'guerrero');
const p = fake.player;

// existe y es un número positivo
if (typeof p.stats.power !== 'number' || !(p.stats.power > 0)) throw new Error('stats.power debe ser un número positivo');
const base = p.stats.power;
console.log(`Poder base del héroe nivel 1: ${base} ✓`);

// equipar un arma fuerte sube el poder
const arma = generateItem(10, 'legendario', 'weapon'); arma.unidentified = false;
arma.dmg = [40, 70]; arma.affixes = { fue: 20, crit: 10 };
p.equipment.weapon = arma; p.recompute();
if (!(p.stats.power > base)) throw new Error('equipar mejor arma debería subir el poder');
console.log(`Equipar arma legendaria sube el poder: ${base} → ${p.stats.power} ✓`);

// subir de nivel y repartir atributos también lo sube
const afterGear = p.stats.power;
p.level += 5; p.attributes.fue += 20; p.attributes.vit += 20; p.recompute();
if (!(p.stats.power > afterGear)) throw new Error('subir nivel/atributos debería subir el poder');
console.log(`Subir nivel y atributos sube el poder: ${afterGear} → ${p.stats.power} ✓`);

// quitar el equipo lo baja (monótono con la fuerza de la build)
const peak = p.stats.power;
p.equipment.weapon = null; p.recompute();
if (!(p.stats.power < peak)) throw new Error('desequipar el arma debería bajar el poder');
console.log('Desequipar baja el poder (coherente con la build) ✓');

console.log('\n✅ PODER DEL HÉROE OK');
