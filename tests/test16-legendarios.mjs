import * as THREE from 'three';
import { generateItem, makeRelic, LEGENDARY_POWERS, itemStatLines } from '../js/items.js';
import { Player } from '../js/entities.js';
import { buildDungeon } from '../js/world.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// todo legendario trae poder único y arranca sin identificar
for (let i = 0; i < 300; i++) {
  const it = generateItem(8, 'legendario');
  if (!it.power || !LEGENDARY_POWERS.some(p => p.id === it.power.id)) throw new Error('legendario sin poder');
  if (!it.unidentified) throw new Error('legendario debería caer sin identificar');
}
console.log('Legendarios: poder único + sin identificar ✓ ·', LEGENDARY_POWERS.map(p => p.id).join(', '));

// sin identificar oculta los stats; identificar los revela
const leg = generateItem(8, 'legendario');
if (!itemStatLines(leg)[0].includes('sin identificar')) throw new Error('debería ocultar stats');
leg.unidentified = false;
if (!itemStatLines(leg).some(l => l.includes('✦'))) throw new Error('debería mostrar el poder al identificar');
console.log('Identificación oculta/revela stats ✓');

// reliquias de jefe: una por jefe, con poder
for (const boss of ['senor_abismo', 'rey_gelido', 'avatar_infierno', 'corazon_vacio']) {
  const rel = makeRelic(boss, 10);
  if (rel.slot !== 'amulet' || !rel.relic || !rel.power) throw new Error('reliquia inválida: ' + boss);
}
console.log('Reliquias de jefe: 4 temáticas con poder ✓');

// los poderes se agregan al equipar (y solo si identificado)
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'guerrero');
const furia = generateItem(8, 'legendario');
furia.power = { id: 'furia', name: 'de la Furia', desc: '' };
furia.unidentified = true;
p.equipment.helm = furia;
p.recompute();
if (p.powers.has('furia')) throw new Error('un objeto sin identificar no debería dar poder');
furia.unidentified = false;
p.recompute();
if (!p.powers.has('furia')) throw new Error('debería dar el poder tras identificar');
// furia: +25% daño con vida alta
p.hp = p.stats.maxHP;
const hi = []; for (let i=0;i<400;i++) hi.push(p.rollDamage(1).dmg);
p.hp = p.stats.maxHP * 0.5;
const lo = []; for (let i=0;i<400;i++) lo.push(p.rollDamage(1).dmg);
const avg = a => a.reduce((s,x)=>s+x,0)/a.length;
if (avg(hi) <= avg(lo) * 1.1) throw new Error('furia no aumentó el daño con vida alta');
console.log(`Poder Furia: daño ${avg(lo).toFixed(0)} (vida baja) → ${avg(hi).toFixed(0)} (vida alta) ✓`);

// agil: esquiva con menos enfriamiento
const agil = generateItem(8,'legendario'); agil.power={id:'agil',name:'',desc:''}; agil.unidentified=false;
p.equipment.helm = agil; p.recompute();
fake.input.keyDir = { x:0, z:-1 };
p.dodge();
if (p.dodgeCdMax >= 3) throw new Error('agil no redujo el cooldown de esquiva');
console.log(`Poder Ágil: cooldown de esquiva ${p.dodgeCdMax}s (<3) ✓`);
console.log('✅ LEGENDARIOS ÚNICOS / IDENTIFICACIÓN / RELIQUIAS OK');
