// Endgame: Jefe Pináculo (uber), Fragmentos y objeto Mítico (doble poder)
import * as THREE from 'three';
import { makeFragment, makeMythic } from '../js/items.js';
import { UBER_BOSS } from '../js/data.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// 1) el fragmento es un consumible identificable
const f = makeFragment();
if (f.kind !== 'fragment') throw new Error('fragmento inválido');
console.log('Fragmento de Pináculo: consumible ✓');

// 2) el jefe pináculo existe y está marcado como uber
if (!UBER_BOSS.uber || !UBER_BOSS.boss) throw new Error('el jefe pináculo debe ser uber y boss');
console.log(`Jefe Pináculo: ${UBER_BOSS.name} (uber) ✓`);

// 3) el mítico trae DOS poderes distintos y stats reforzados
let m = null;
for (let i = 0; i < 40 && !m; i++) { const it = makeMythic(20); if (it.power && it.power2) m = it; }
if (!m) throw new Error('el mítico debería traer dos poderes');
if (m.power.id === m.power2.id) throw new Error('los dos poderes míticos deben ser distintos');
if (!m.mythic) throw new Error('el mítico debe estar marcado');
console.log(`Mítico: «${m.name}» con poderes ${m.power.id} + ${m.power2.id} ✓`);

// 4) equipado, el mítico activa AMBOS poderes (recompute real)
const world = buildDungeon(1);
const g = { ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world, enemies: [], input: { joyDir: null, keyDir: null } };
const p = new Player(g, 'maga'); g.player = p;
m.unidentified = false;
p.equipment.amulet = m;
p.recompute();
if (!p.powers.has(m.power.id) || !p.powers.has(m.power2.id)) throw new Error('el mítico no activó sus dos poderes');
console.log('Mítico equipado activa sus dos poderes ✓');

// 5) contar fragmentos en el inventario (gate de invocación = 3)
p.inventory = [makeFragment(), makeFragment()];
const count = p.inventory.filter(it => it.kind === 'fragment').length;
if (count !== 2) throw new Error('conteo de fragmentos incorrecto');
console.log(`Conteo de fragmentos: ${count}/3 (faltan para invocar) ✓`);

void THREE;
console.log('test36-pinaculo OK');
