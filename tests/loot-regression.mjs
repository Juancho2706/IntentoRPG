// Regresión de economía de loot: protege la sensación de "el legendario es un evento".
// Simula un piso completo (normales + manadas + tesoro + cofres + jefe) y comprueba
// que la rareza esté en rango y que profundizar (o usar hallazgo mágico) rente.
import { rollDrops } from '../js/items.js';

function simulateFloor(floor, mf = 0) {
  const out = { items: 0, magico: 0, raro: 0, legendario: 0, conjunto: 0 };
  const o = { mf };
  const tally = (drops) => { for (const d of drops) if (d.kind === 'item') { out.items++; out[d.rarity]++; } };
  for (let i = 0; i < 24; i++) tally(rollDrops(floor, o));
  for (let p = 0; p < 2; p++) {
    tally(rollDrops(floor, { ...o, minItems: 1, itemChance: 0.3, setChance: 0.03 }));
    for (let m = 0; m < 4; m++) tally(rollDrops(floor, o));
  }
  tally(rollDrops(floor, { ...o, minItems: 1, itemChance: 0.3, setChance: 0.03 }));
  for (let ch = 0; ch < 4; ch++) tally(rollDrops(floor, { ...o, minItems: 1, itemChance: 0.3, setChance: 0.02 }));
  tally(rollDrops(floor, { ...o, boss: true }));
  return out;
}

function avg(floor, mf = 0, runs = 2000) {
  const acc = { items: 0, magico: 0, raro: 0, legendario: 0, conjunto: 0 };
  for (let r = 0; r < runs; r++) { const o = simulateFloor(floor, mf); for (const k in acc) acc[k] += o[k]; }
  for (const k in acc) acc[k] /= runs;
  return acc;
}

const f1 = avg(1), f20 = avg(20), f1mf = avg(1, 200);
const fmt = (o) => `items ${o.items.toFixed(1)} | raro ${o.raro.toFixed(2)} | LEG ${o.legendario.toFixed(2)} | set ${o.conjunto.toFixed(2)}`;
console.log(`Piso  1        : ${fmt(f1)}`);
console.log(`Piso 20        : ${fmt(f20)}`);
console.log(`Piso  1 +200%MF: ${fmt(f1mf)}`);

const checks = [
  ['piso 1: legendarios escasos (<0.18/piso)', f1.legendario < 0.18],
  ['piso 1: sets escasos (<0.45/piso)', f1.conjunto < 0.45],
  ['piso 1: raros moderados (<1.6/piso)', f1.raro < 1.6],
  ['profundizar rinde: piso 20 da >=2.5x legendarios que piso 1', f20.legendario >= f1.legendario * 2.5],
  ['hallazgo mágico funciona: +200% MF da >=1.8x legendarios', f1mf.legendario >= f1.legendario * 1.8],
];
let fail = false;
for (const [label, ok] of checks) { console.log(`${ok ? '✓' : '❌'} ${label}`); if (!ok) fail = true; }
if (fail) { console.error('❌ ECONOMÍA DE LOOT FUERA DE RANGO'); process.exit(1); }
console.log('✅ ECONOMÍA DE LOOT OK');
