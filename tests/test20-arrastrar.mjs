// Lógica de moveItem (la parte testeable del arrastrar y soltar)
import { Player } from '../js/entities.js';
import { generateItem, makeGem } from '../js/items.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = Object.assign({
  ui: { message(){}, spawnText(){}, renderShop(){}, renderPanel(){}, updateHUD(){}, refreshHotbar(){}, itemPopup(){} },
  sfx(){}, vibrate(){}, save(){}, world, stash: [],
  depositToStash(i) { const it = this.player.inventory[i]; if (!it) return; this.player.inventory.splice(i, 1); this.stash.push(it); },
  takeFromStash(i) { const it = this.stash[i]; if (!it) return; this.stash.splice(i, 1); this.player.inventory.push(it); },
}, economyMethods);
fake.player = new Player(fake, 'guerrero');
const p = fake.player;

// 1) arrastrar del inventario a una ranura de equipo válida → equipa
const casco = generateItem(5, 'magico', 'helm'); casco.unidentified = false;
p.inventory = [casco];
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'equip', key: 'helm' });
if (p.equipment.helm !== casco) throw new Error('no equipó al arrastrar a la ranura');
if (p.inventory.length !== 0) throw new Error('el objeto no salió del inventario');
console.log('Arrastrar inventario → ranura equipa ✓');

// 2) ranura incorrecta → no equipa
const bota = generateItem(5, 'magico', 'boots'); bota.unidentified = false;
p.inventory = [bota];
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'equip', key: 'helm' });
if (p.equipment.helm === bota) throw new Error('equipó en ranura equivocada');
console.log('Ranura incorrecta rechazada ✓');

// 3) arrastrar equipo → inventario desequipa
fake.moveItem({ zone: 'equip', key: 'helm' }, { zone: 'inv', key: 5 });
if (p.equipment.helm) throw new Error('no desequipó al arrastrar fuera');
console.log('Arrastrar equipo → inventario desequipa ✓');

// 4) anillo va a ring2 si ring está ocupado (arrastre explícito a ring2)
const r1 = generateItem(5, 'magico', 'ring'); r1.unidentified = false;
const r2 = generateItem(5, 'magico', 'ring'); r2.unidentified = false;
p.inventory = [r1, r2]; p.equipment.ring = null; p.equipment.ring2 = null;
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'equip', key: 'ring' });
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'equip', key: 'ring2' });
if (!p.equipment.ring || !p.equipment.ring2) throw new Error('los dos anillos no se equiparon');
console.log('Dos anillos en ring y ring2 ✓');

// 5) gema (bolsa de materiales) arrastrada sobre objeto con engarce → engarza
const arma = generateItem(8, 'raro', 'weapon'); arma.unidentified = false; arma.sockets = 1; arma.gems = [];
const gema = makeGem(5, 'rubi');
p.inventory = [arma];
p.materials = [gema];
fake.moveItem({ zone: 'mat', key: 0 }, { zone: 'inv', key: 0 });
if ((arma.gems || []).length !== 1) throw new Error('la gema no se engarzó al arrastrarla');
if (p.materials.length !== 0) throw new Error('la gema no salió de la bolsa de materiales');
console.log('Arrastrar gema (materiales) sobre objeto con engarce lo engarza ✓');

// 6) reordenar mochila: intercambia
const a = generateItem(3, 'magico'); const b = generateItem(3, 'magico');
p.inventory = [a, b];
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'inv', key: 1 });
if (p.inventory[0] !== b || p.inventory[1] !== a) throw new Error('no intercambió en la mochila');
console.log('Reordenar mochila (swap) ✓');

// 7) inventario → cubo, y de vuelta
p.inventory = [generateItem(3, 'magico')]; p.cube = [];
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'cube', key: 0 });
if (p.cube.length !== 1) throw new Error('no fue al cubo');
fake.moveItem({ zone: 'cube', key: 0 }, { zone: 'inv', key: 5 });
if (p.cube.length !== 0 || p.inventory.length !== 1) throw new Error('no volvió del cubo');
console.log('Arrastrar a cubo y de vuelta ✓');

// 8) inventario → alijo
p.inventory = [generateItem(3, 'magico')]; fake.stash = [];
fake.moveItem({ zone: 'inv', key: 0 }, { zone: 'stash', key: 0 });
if (fake.stash.length !== 1) throw new Error('no fue al alijo');
console.log('Arrastrar a alijo ✓');
console.log('✅ ARRASTRAR Y SOLTAR OK');
