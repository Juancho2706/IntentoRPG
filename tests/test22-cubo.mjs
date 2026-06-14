import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = Object.assign({
  ui: { message(){}, spawnText(){}, renderPanel(){}, updateHUD(){}, itemPopup(){} },
  sfx(){}, vibrate(){}, save(){}, world,
}, economyMethods);
fake.player = new Player(fake, 'guerrero');
const p = fake.player;
const mk = (rar, slot) => { const it = generateItem(6, rar, slot); it.unidentified = false; return it; };

// 1) la transmutación ahora cuesta oro: sin oro no se hace
p.gold = 0;
p.cube = [mk('magico'), mk('magico'), mk('magico')];
fake.transmute();
if (p.cube.length !== 3) throw new Error('transmutó sin oro (debería bloquear)');
console.log('Sin oro no transmuta ✓');

// 2) con oro: magico→raro y cobra
p.gold = 10000;
const before = p.gold;
fake.transmute();
const out = p.inventory[p.inventory.length - 1];
if (out.rarity !== 'raro') throw new Error('no subió a raro');
if (p.gold >= before) throw new Error('no cobró el oro');
console.log(`Mágico→Raro cuesta oro (${before}→${p.gold}) ✓`);

// 3) crafteo dirigido: 3 del mismo slot → resultado de ese slot
p.gold = 10000; p.inventory = [];
p.cube = [mk('raro', 'helm'), mk('raro', 'helm'), mk('raro', 'helm')];
fake.transmute();
const leg = p.inventory[p.inventory.length - 1];
if (leg.rarity !== 'legendario') throw new Error('raro→legendario falló');
if (leg.slot !== 'helm') throw new Error('crafteo dirigido no respetó la ranura: ' + leg.slot);
console.log(`Raro→Legendario dirigido a la ranura (${leg.slot}) ✓`);

// 4) reforjar: 3 legendarios → 1 legendario nuevo, muy caro
p.gold = 10000; p.inventory = [];
const prev = fake.cubePreview.call({ ...fake, player: { cube: [mk('legendario'), mk('legendario'), mk('legendario')] }, cubeCost: economyMethods.cubeCost });
p.cube = [mk('legendario'), mk('legendario'), mk('legendario')];
const pv = fake.cubePreview();
if (!pv.text.includes('Reforjar') || pv.cost < 1000) throw new Error('reforja de legendarios mal descrita: ' + JSON.stringify(pv));
const g0 = p.gold;
fake.transmute();
const newLeg = p.inventory[p.inventory.length - 1];
if (newLeg.rarity !== 'legendario') throw new Error('reforja no dio legendario');
if (p.gold >= g0) throw new Error('reforja no cobró');
if (!newLeg.power) throw new Error('el legendario reforjado no tiene poder');
console.log(`Reforjar 3 legendarios → 1 nuevo con poder, coste ${g0 - p.gold} 🪙 ✓`);
void prev;
console.log('✅ CUBO COMPLEJO OK');
