import * as DATA from '../js/data.js';
import { CLASSES, ENEMIES, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

// Paso 2b.0 (§4.1): las SINERGIAS se eliminaron (dependían de comprar rangos de
// otras habilidades; ese papel lo cumplen los talentos `mod`/`elem`).
for (const c of Object.values(CLASSES)) {
  const withSyn = c.skills.filter(s => s.synergies);
  if (withSyn.length) throw new Error(c.name + ' aún declara sinergias: ' + withSyn.map(s => s.id).join(', '));
}
if ('synergyBonus' in DATA) throw new Error('synergyBonus debía eliminarse de data.js');
console.log('Sinergias eliminadas en las 3 clases ✓');

// biomas por profundidad
const expect = { 1: 'Cripta', 5: 'Cripta', 6: 'Cavernas de Hielo', 10: 'Cavernas de Hielo', 11: 'Infierno', 15: 'Infierno', 16: 'Abismo Estelar', 20: 'Abismo Estelar' };
for (const [f, name] of Object.entries(expect)) {
  const d = buildDungeon(Number(f));
  if (d.biome !== name) throw new Error(`piso ${f}: esperaba ${name}, dio ${d.biome}`);
  if (!d.grid.walkable(d.spawn.x, d.spawn.z)) throw new Error('spawn no transitable');
}
console.log('Biomas correctos: 1-5 Cripta, 6-10 Hielo, 11-15 Infierno, 16+ Abismo');

// nuevos enemigos en sus pisos
if (!ENEMIES.some(e => e.id === 'yeti') || !ENEMIES.some(e => e.id === 'diablillo')) throw new Error('faltan enemigos nuevos');
let yeti = 0, diablillo = 0;
for (let i = 0; i < 2000; i++) {
  if (pickEnemyDef(7).id === 'yeti') yeti++;
  if (pickEnemyDef(12).id === 'diablillo') diablillo++;
}
if (!yeti || !diablillo) throw new Error('nuevos enemigos no aparecen');
console.log(`En 2000 tiradas: yeti ${yeti} (piso 7), diablillo ${diablillo} (piso 12)`);
console.log('✅ SIN SINERGIAS + BIOMAS OK');
