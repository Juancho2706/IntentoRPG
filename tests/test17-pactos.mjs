import * as THREE from 'three';
import { PACTS } from '../js/data.js';
import { makeCharm, rollDrops } from '../js/items.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// pactos: estructura válida y altar presente en mazmorras
if (PACTS.length < 3 || !PACTS.every(p => p.mods && p.desc)) throw new Error('pactos inválidos');
const d = buildDungeon(3);
if (!d.interactables.some(i => i.type === 'altar')) throw new Error('falta el altar de pactos');
console.log('Pactos:', PACTS.map(p => p.id).join(', '), '· altar en mazmorra ✓');

// charms: dan stats desde la mochila sin equiparse
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'maga');
const baseHp = p.stats.maxHP, baseMf = p.stats.mf;
const charm = makeCharm(5);
charm.affixes = { hp: 20, mf: 10 };
p.inventory.push(charm);
p.recompute();
if (p.stats.maxHP !== baseHp + 20) throw new Error('el charm no dio vida desde la mochila');
if (p.stats.mf !== baseMf + 10) throw new Error('el charm no dio hallazgo mágico');
console.log(`Charm activo en mochila: vida ${baseHp}→${p.stats.maxHP}, MF ${baseMf}→${p.stats.mf} ✓`);
// los charms aparecen como botín
let charms = 0;
for (let i = 0; i < 50000; i++) for (const drop of rollDrops(5)) if (drop.kind === 'charm') charms++;
if (!charms) throw new Error('los charms no caen');
console.log(`Charms en 50k tiradas: ${charms} ✓`);

// colección/bestiario: discover registra sets y poderes; bestiary cuenta
p.discover({ setId: 'lobo', slot: 'helm' });
p.discover({ power: { id: 'furia', name: '', desc: '' } });
if (!p.discovered.sets.lobo?.helm || !p.discovered.powers.furia) throw new Error('discover no registró');
p.discovered.bestiary.rata = 5;
console.log('Colección: sets, poderes y bestiario registrados ✓');

// el pacto de sangre cambia el riesgo↔recompensa (más daño enemigo, más botín)
const pact = PACTS.find(x => x.id === 'sangre');
if (!(pact.mods.qty > 0 && pact.mods.edmg > 0)) throw new Error('pacto de sangre mal definido');
let base = 0, juiced = 0;
for (let i = 0; i < 20000; i++) {
  base += rollDrops(5, {}).filter(x => x.kind === 'item').length;
  juiced += rollDrops(5, { qty: 40 }).filter(x => x.kind === 'item').length;
}
if (juiced <= base) throw new Error('el pacto no aumentó la cantidad de botín');
console.log(`Pacto: botín base ${base} → con qty+40% ${juiced} (más objetos) ✓`);
console.log('✅ PACTOS / CHARMS / COLECCIÓN OK');
