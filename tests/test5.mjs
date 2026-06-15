import { CLASSES, synergyBonus, ENEMIES, pickEnemyDef } from '../js/data.js';
import { buildDungeon } from '../js/world.js';

// sinergias: cada clase tiene al menos 2 habilidades con sinergia válida
for (const c of Object.values(CLASSES)) {
  const withSyn = c.skills.filter(s => s.synergies);
  if (withSyn.length < 2) throw new Error(c.name + ' sin sinergias suficientes');
  for (const sk of withSyn)
    for (const sy of sk.synergies)
      if (!c.skills.some(s => s.id === sy.from)) throw new Error('sinergia rota: ' + sk.id + ' ← ' + sy.from);
  console.log(`${c.name}: ${withSyn.map(s => s.id).join(', ')} con sinergia`);
}
// cálculo: meteoro con 5 puntos en bola_fuego = +25% (5% por punto)
const meteoro = CLASSES.maga.skills.find(s => s.id === 'meteoro');
const b = synergyBonus(meteoro, { bola_fuego: 5 });
if (b !== 25) throw new Error('synergyBonus esperaba 25, dio ' + b);
// sinergias 2.0: varias fuentes se SUMAN (familia de habilidades)
const b2 = synergyBonus(meteoro, { bola_fuego: 5, rayo: 5 });
if (b2 !== 40) throw new Error('synergyBonus multi-fuente esperaba 40 (25+15), dio ' + b2);
console.log(`Meteoro: +${b}% con Bola de Fuego, +${b2}% sumando Rayo (sinergias 2.0)`);
// cada skill de daño tiene al menos una sinergia (variedad de builds de familia)
for (const c of Object.values(CLASSES)) {
  for (const sk of c.skills) {
    if (sk.mult && !sk.synergies) throw new Error(`${sk.id} (daño) debería tener sinergias`);
  }
}
console.log('Todas las habilidades de daño tienen sinergias de familia ✓');

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
console.log('✅ SINERGIAS Y BIOMAS OK');
