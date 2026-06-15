// Fase 4 — Paragon temático por clase + glifos de familia
import * as THREE from 'three';
import { PARAGON_BOARDS, PARAGON_BOARD, paragonBoardFor, PARAGON_CATS } from '../js/data.js';
import { makeGlyph, glyphValue } from '../js/items.js';
import { Player } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// --- 1) hay un tablero por clase y el alias por defecto = guerrero ---
for (const c of ['guerrero', 'maga', 'arquera']) {
  if (!Array.isArray(PARAGON_BOARDS[c])) throw new Error('falta tablero de ' + c);
}
if (paragonBoardFor('guerrero') !== PARAGON_BOARD) throw new Error('PARAGON_BOARD debe ser el de guerrero (compat tests)');
if (paragonBoardFor('clase_inexistente') !== PARAGON_BOARD) throw new Error('paragonBoardFor debe caer al tablero por defecto');
console.log('Tableros por clase: guerrero/maga/arquera + alias por defecto ✓');

// --- 2) geometría idéntica (mismos ids/posiciones) → saves y glifos estables ---
const ids = (b) => b.map(n => n.id).sort().join(',');
if (ids(PARAGON_BOARDS.guerrero) !== ids(PARAGON_BOARDS.maga) || ids(PARAGON_BOARDS.maga) !== ids(PARAGON_BOARDS.arquera))
  throw new Error('la geometría (ids) debe ser idéntica entre clases');
console.log('Geometría idéntica entre clases (ids estables para saves) ✓');

// --- 3) cada nodo no-inicio/no-engarce tiene categoría (familia); engarces no ---
for (const n of PARAGON_BOARDS.guerrero) {
  if (n.type === 'start' || n.type === 'socket') { if (n.cat) throw new Error('inicio/engarce no debe tener cat: ' + n.id); continue; }
  if (!n.cat || !PARAGON_CATS[n.cat]) throw new Error('nodo sin familia válida: ' + n.id + ' (' + n.cat + ')');
}
console.log('Cada nodo lleva familia (cuadrante) válida; engarces neutrales ✓');

// --- 4) los legendarios (build-defining) difieren por clase ---
const legPowers = (c) => paragonBoardFor(c).filter(n => n.type === 'legendary').map(n => (n.power || '∅')).join(',');
const gW = legPowers('guerrero'), mG = legPowers('maga'), aR = legPowers('arquera');
if (gW === mG && mG === aR) throw new Error('los legendarios deberían diferir entre clases');
// comprobación concreta del cuadrante de utilidad (8_4)
if (paragonBoardFor('guerrero').find(n => n.id === '8_4').power !== 'volatil') throw new Error('guerrero 8_4 debe ser volatil');
if (paragonBoardFor('maga').find(n => n.id === '8_4').power !== 'multidisparo') throw new Error('maga 8_4 debe ser multidisparo');
console.log(`Legendarios temáticos por clase (guerrero≠maga≠arquera) ✓`);

// --- 5) glifos de familia: el bonus por familia escala aparte del genérico ---
const gd = makeGlyph(1); gd.glyphId = 'g_dmg'; gd.stat = 'dmgPct'; gd.per = 2; gd.adj = 0.5; gd.fam = 'ofensiva'; gd.famAdj = 1.5; gd.rank = 2;
const baseV = glyphValue(gd, 1, 0);          // 1 adyacente, 0 de familia
const famV = glyphValue(gd, 1, 1);           // ese adyacente ES de su familia
if (!(famV > baseV)) throw new Error('el bonus de familia no aplica en glyphValue');
if (Math.abs((famV - baseV) - gd.famAdj) > 1e-9) throw new Error('el bonus de familia debe ser exactamente famAdj por nodo');
console.log(`Glifo de familia: ${baseV} → ${famV} con un adyacente de su cuadrante (+${gd.famAdj}) ✓`);

// --- 6) integración en recompute: el MISMO glifo ofensivo rinde más colocado
//        junto a un nodo de su familia (ofensiva) que junto a otra (defensa) ---
const world = buildDungeon(1);
const mkGame = () => { const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null }, save() {} }; Object.assign(g, economyMethods); return g; };
// famAdj grande para que la diferencia supere el redondeo de dmgMax
const mkGlyph = () => { const o = makeGlyph(2); o.glyphId = 'g_dmg'; o.stat = 'dmgPct'; o.per = 5; o.adj = 0.5; o.fam = 'ofensiva'; o.famAdj = 10; o.rank = 2; return o; };

// Escenario A: socket 3_3 con su único adyacente activo OFENSIVO (4_3)
const gA = mkGame(); const pA = new Player(gA, 'maga'); gA.player = pA; pA.paragon.points = 20;
gA.allocateParagonNode('4_3'); gA.allocateParagonNode('3_3');
if (!pA.paragon.nodes['3_3']) throw new Error('A: no se activó 3_3');
const aNo = pA.stats.dmgMax; pA.materials = [mkGlyph()]; gA.socketGlyph('3_3', 0);
const contribA = pA.stats.dmgMax - aNo; // adj=1, famAdj=1 (4_3 ofensiva)

// Escenario B: socket 3_3 con su único adyacente activo de DEFENSA (3_4)
const gB = mkGame(); const pB = new Player(gB, 'maga'); gB.player = pB; pB.paragon.points = 20;
gB.allocateParagonNode('3_4'); gB.allocateParagonNode('3_3');
if (!pB.paragon.nodes['3_3']) throw new Error('B: no se activó 3_3');
const bNo = pB.stats.dmgMax; pB.materials = [mkGlyph()]; gB.socketGlyph('3_3', 0);
const contribB = pB.stats.dmgMax - bNo; // adj=1, famAdj=0 (3_4 defensa)

if (!(contribA > contribB)) throw new Error(`el bonus de familia no se refleja en recompute (A=${contribA} debe > B=${contribB})`);
console.log(`Recompute: glifo ofensivo aporta +${contribA} dmgMax junto a familia vs +${contribB} junto a otra familia ✓`);

void THREE;
console.log('\n✅ PARAGON TEMÁTICO + GLIFOS DE FAMILIA OK');
