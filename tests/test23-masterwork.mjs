import { generateItem, itemStatLines, qualityMult, MAX_QUALITY } from '../js/items.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = Object.assign({ ui: { message(){}, spawnText(){}, renderPanel(){}, updateHUD(){}, itemPopup(){} }, sfx(){}, vibrate(){}, save(){}, world }, economyMethods);
fake.player = new Player(fake, 'guerrero');
const p = fake.player;

// afijos superiores: aparecen con marca ★ y en proporción razonable
let total = 0, greater = 0;
for (let i = 0; i < 3000; i++) {
  const it = generateItem(8, 'raro');
  total += Object.keys(it.affixes).length;
  greater += (it.greater || []).length;
}
const pct = greater / total * 100;
if (pct < 3 || pct > 16) throw new Error('proporción de superiores fuera de rango: ' + pct.toFixed(1) + '%');
const sup = generateItem(8, "legendario"); sup.unidentified = false; sup.greater = [Object.keys(sup.affixes)[0]];
if (!itemStatLines(sup).some(l => l.includes('★'))) throw new Error('no se muestra ★');
console.log(`Afijos superiores ★: ${pct.toFixed(1)}% de los afijos, marcados en la ficha ✓`);

// masterworking: sube calidad con coste y mejora los stats equipados
const arma = generateItem(10, 'raro', 'weapon'); arma.unidentified = false; arma.dmg = [10, 20]; arma.affixes = { fue: 10 };
p.gold = 100000; p.equipment.weapon = arma; p.recompute();
const dmg0 = p.stats.dmgMax, fue0 = p.stats.fue;
p.inventory = [arma]; // para masterworkItem por índice
p.equipment.weapon = arma;
// mejorar 5 veces
for (let i = 0; i < MAX_QUALITY; i++) { const before = p.gold; fake.masterworkItem(0); if (p.gold >= before) throw new Error('no cobró'); }
if (arma.quality !== MAX_QUALITY) throw new Error('no llegó a calidad máxima: ' + arma.quality);
p.equipment.weapon = arma; p.recompute();
if (p.stats.dmgMax <= dmg0) throw new Error('la calidad no mejoró el daño');
if (p.stats.fue <= fue0) throw new Error('la calidad no mejoró los afijos');
// no se puede pasar del tope
fake.masterworkItem(0);
if (arma.quality !== MAX_QUALITY) throw new Error('superó el tope de calidad');
console.log(`Masterworking: calidad ${MAX_QUALITY}/${MAX_QUALITY}, daño ${dmg0}→${p.stats.dmgMax}, fue ${fue0}→${p.stats.fue}, mult ${qualityMult(arma)} ✓`);
console.log('✅ MASTERWORKING + AFIJOS SUPERIORES OK');
