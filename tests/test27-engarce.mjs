import { Player } from '../js/entities.js';
import { generateItem, makeGem, maxSockets } from '../js/items.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const world = buildDungeon(1);
const fake = Object.assign({ ui: { message(){}, spawnText(){}, renderPanel(){}, updateHUD(){}, itemPopup(){} }, sfx(){}, vibrate(){}, save(){}, world }, economyMethods);
fake.player = new Player(fake, 'guerrero');
const p = fake.player;

// receta de engarce: 1 objeto + 2 gemas → +1 hueco (cuesta oro)
const arma = generateItem(10, 'raro', 'weapon'); arma.unidentified = false; delete arma.sockets; delete arma.gems;
p.gold = 100000;
p.cube = [arma, makeGem(5), makeGem(5)];
const pv = fake.cubePreview();
if (!pv.text.includes('Abrir engarce') || pv.cost <= 0) throw new Error('preview de engarce mal: ' + JSON.stringify(pv));
const before = p.gold;
fake.transmute();
if ((arma.sockets || 0) !== 1) throw new Error('no abrió el engarce: ' + arma.sockets);
if (p.gold >= before) throw new Error('no cobró el engarce');
if (p.cube.length !== 0) throw new Error('no consumió el contenido del cubo');
if (p.inventory[p.inventory.length - 1] !== arma) throw new Error('el objeto no volvió a la mochila');
console.log(`Abrir engarce: arma con ${arma.sockets} hueco, coste ${before - p.gold} 🪙, gemas consumidas ✓`);

// respeta el tope de huecos por tipo (arma = 3)
const max = maxSockets(arma);
let guard = 0;
while ((arma.sockets || 0) < max && guard++ < 10) {
  p.gold = 100000; p.cube = [arma, makeGem(5), makeGem(5)]; fake.transmute();
}
if (arma.sockets !== max) throw new Error('no alcanzó el tope: ' + arma.sockets);
p.gold = 100000; p.cube = [arma, makeGem(5), makeGem(5)];
const pvFull = fake.cubePreview();
if (pvFull.ready) throw new Error('debería rechazar al estar lleno de huecos');
console.log(`Tope de engarces respetado (${max} en arma) ✓`);
console.log('✅ RECETA DE ENGARCE OK');
