import * as THREE from 'three';
import { SLOT_NAMES, ARMOR_SLOTS, generateItem, makeGem, GEMS, rollDrops, itemStatLines } from '../js/items.js';
import { Player } from '../js/entities.js';
import { buildTown, buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// 12 ranuras y bases que dropean para todas (menos ring2, que reusa anillos)
const slots = Object.keys(SLOT_NAMES);
if (slots.length !== 12) throw new Error('esperaba 12 ranuras, hay ' + slots.length);
const seen = new Set();
for (let i = 0; i < 4000; i++) seen.add(generateItem(3).slot);
for (const s of slots) if (s !== 'ring2' && !seen.has(s)) throw new Error('nunca dropea: ' + s);
console.log('Ranuras:', slots.join(', '));
console.log('Drops cubren todas las ranuras equipables ✓');

// armadura presente en las piezas nuevas
for (const s of ['shoulders', 'gloves', 'pants', 'belt', 'offhand']) {
  let it; for (let i = 0; i < 500 && (!it || it.slot !== s); i++) it = generateItem(5);
  for (let i = 0; i < 2000; i++) { const x = generateItem(5); if (x.slot === s) { it = x; break; } }
  if (!it.arm) throw new Error(s + ' sin armadura');
}
console.log('Hombreras/guantes/pantalones/cinturón/escudo con armadura ✓');

// gemas: stats válidos y aparece en drops
for (let i = 0; i < 300; i++) {
  const gm = makeGem(1 + i % 10);
  if (gm.kind !== 'gem' || !Object.values(gm.stats)[0]) throw new Error('gema inválida');
}
let gems = 0, sockets = 0, items = 0;
for (let i = 0; i < 20000; i++)
  for (const d of rollDrops(5)) {
    if (d.kind === 'gem') gems++;
    if (d.kind === 'item') { items++; if (d.sockets) sockets++; }
  }
console.log(`En 20k kills: ${gems} gemas, ${sockets}/${items} items con engarce (${(sockets/items*100).toFixed(0)}%)`);
if (!gems || !sockets) throw new Error('faltan gemas o engarces');

// jugador: equipar gemas suma stats; segundo anillo; guardado viejo migra
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'guerrero');
if (!('ring2' in p.equipment) || !('shoulders' in p.equipment)) throw new Error('faltan ranuras en equipment');
// guardado viejo sin ranuras nuevas
const old = new Player(fake, 'guerrero', { classId: 'guerrero', equipment: { weapon: null, helm: null, chest: null, boots: null, ring: null, amulet: null } });
if (!('gloves' in old.equipment)) throw new Error('guardado viejo no migró las ranuras');
// gema engarzada suma al recompute
let armaConRanura;
for (let i = 0; i < 5000 && !armaConRanura; i++) { const x = generateItem(5); if (x.slot === 'weapon' && x.sockets) armaConRanura = x; }
if (!armaConRanura) throw new Error('no se generó arma con engarce en 5000 intentos');
// recompute() ignora objetos sin identificar (no dan stats); identificamos el
// arma para probar la matemática de la gema, no el estado de identificación
armaConRanura.unidentified = false;
const rubi = { ...makeGem(5), stats: { hp: 20 } };
p.equipment.weapon = armaConRanura;
p.recompute();
const hpAntes = p.stats.maxHP;
armaConRanura.gems = [rubi];
p.recompute();
if (p.stats.maxHP !== hpAntes + 20) throw new Error('la gema no sumó vida: ' + hpAntes + ' → ' + p.stats.maxHP);
console.log(`Gema engarzada: vida ${hpAntes} → ${p.stats.maxHP} ✓ · ${itemStatLines(armaConRanura).find(l => l.includes('💎'))}`);
// pueblo tiene alijo
if (!buildTown().interactables.some(i => i.type === 'stash')) throw new Error('falta el alijo en el pueblo');
console.log('Alijo presente en el pueblo ✓ · Gemas:', GEMS.map(g => g.name).join(', '));
void ARMOR_SLOTS; void THREE;
console.log('✅ RANURAS/GEMAS/ALIJO OK');
