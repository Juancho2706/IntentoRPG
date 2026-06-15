// Regresión: bolsa de materiales (gemas/runas/llaves/glifos), cubo y arrastre.
// Sistema relativamente nuevo; cubrimos las rutas de p.materials para que no
// se rompan en silencio al refactorizar.
import * as THREE from 'three';
import { makeGem, generateItem } from '../js/items.js';
import { Player, MAX_MATERIALS } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

const world = buildDungeon(1);
const g = { ui: { spawnText() {}, message() {}, flashDamage() {}, renderPanel() {}, itemPopup() {} },
  sfx() {}, vibrate() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {}, stash: [] };
Object.assign(g, economyMethods);
const p = new Player(g, 'guerrero'); g.player = p;

// la bolsa arranca vacía y como array
if (!Array.isArray(p.materials) || p.materials.length !== 0) throw new Error('p.materials debe iniciar vacío');
console.log('Bolsa de materiales inicia vacía ✓');

// --- addMaterialToCube: mueve gema de la bolsa al cubo ---
p.materials = [makeGem(3), makeGem(3), makeGem(3)];
p.cube = [];
g.addMaterialToCube(0);
if (p.cube.length !== 1 || p.materials.length !== 2) throw new Error('la gema no pasó al cubo');
if (p.cube[0].kind !== 'gem') throw new Error('lo movido al cubo no es una gema');
console.log('addMaterialToCube mueve gema bolsa→cubo ✓');

// rechaza no-gemas y cubo lleno
const armaIdx = 0; p.materials[armaIdx] = generateItem(3); // mete un objeto (no gema) al frente
g.addMaterialToCube(armaIdx);
if (p.cube.length !== 1) throw new Error('un objeto no-gema no debe entrar al cubo por esta vía');
p.cube = [makeGem(1), makeGem(1), makeGem(1)]; // cubo lleno (3)
p.materials = [makeGem(1)];
g.addMaterialToCube(0);
if (p.cube.length !== 3 || p.materials.length !== 1) throw new Error('no debe meter al cubo lleno');
console.log('addMaterialToCube respeta tipo y cubo lleno ✓');

// --- cubeReturn: gema vuelve a la bolsa ---
p.cube = [makeGem(2)]; p.materials = [];
g.cubeReturn(0);
if (p.materials.length !== 1 || p.cube.length !== 0) throw new Error('la gema no volvió a la bolsa');
console.log('cubeReturn devuelve gema cubo→bolsa ✓');

// tope MAX_MATERIALS: si la bolsa está llena, cubeReturn no la vacía
p.materials = Array.from({ length: MAX_MATERIALS }, () => makeGem(1));
p.cube = [makeGem(1)];
g.cubeReturn(0);
if (p.materials.length !== MAX_MATERIALS || p.cube.length !== 1) throw new Error('no debe exceder MAX_MATERIALS');
console.log(`cubeReturn respeta tope MAX_MATERIALS (${MAX_MATERIALS}) ✓`);

// --- swapMaterials: reordena (intercambio y mover-al-final) ---
const a = makeGem(1), b = makeGem(2), c = makeGem(3);
a.tag = 'A'; b.tag = 'B'; c.tag = 'C';
p.materials = [a, b, c];
g.swapMaterials(0, 2);
if (p.materials[0].tag !== 'C' || p.materials[2].tag !== 'A') throw new Error('swapMaterials no intercambió');
p.materials = [a, b, c];
g.swapMaterials(0, 9); // destino vacío → mover al final
if (p.materials[2].tag !== 'A' || p.materials.length !== 3) throw new Error('swapMaterials no movió al final');
console.log('swapMaterials reordena (swap y mover-al-final) ✓');

// --- moveItem enruta mat→cube y mat→objeto-con-engarce (engarzar) ---
p.materials = [makeGem(2)]; p.cube = [];
g.moveItem({ zone: 'mat', key: 0 }, { zone: 'cube', key: 0 });
if (p.cube.length !== 1) throw new Error('moveItem mat→cube no enrutó a addMaterialToCube');
console.log('moveItem mat→cube ✓');

// engarzar arrastrando una gema de la bolsa sobre un objeto con engarce libre
let socketed; for (let i = 0; i < 4000 && !socketed; i++) { const x = generateItem(5); if (x.sockets) socketed = x; }
if (!socketed) throw new Error('no se generó objeto con engarce');
socketed.unidentified = false; socketed.gems = [];
p.inventory.push(socketed);
const rubi = { ...makeGem(4), stats: { hp: 15 } };
p.materials = [rubi];
g.moveItem({ zone: 'mat', key: 0 }, { zone: 'inv', key: p.inventory.indexOf(socketed) });
if ((socketed.gems?.length || 0) !== 1) throw new Error('la gema no se engarzó al arrastrar sobre el objeto');
if (p.materials.length !== 0) throw new Error('la gema no salió de la bolsa al engarzar');
console.log('moveItem mat→objeto engarza y vacía la bolsa ✓');

console.log('\nBolsa de materiales: todas las rutas OK ✓');
