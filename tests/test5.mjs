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
// cálculo: meteoro con 5 puntos en bola_fuego = +30%
const meteoro = CLASSES.maga.skills.find(s => s.id === 'meteoro');
const b = synergyBonus(meteoro, { bola_fuego: 5 });
if (b !== 30) throw new Error('synergyBonus esperaba 30, dio ' + b);
console.log('Meteoro con 5 pts en Bola de Fuego: +' + b + '%');

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
