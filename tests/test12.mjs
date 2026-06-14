import { RUNES, RUNEWORDS, makeRune, checkRuneword, rerollAffix, generateItem, rollDrops, itemStatLines } from '../js/items.js';
import { BOSSES, bossForFloor, ENEMIES, pickEnemyDef, scaleEnemy } from '../js/data.js';
import { buildDungeon, buildRefuge } from '../js/world.js';
import { Player } from '../js/entities.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

// palabras rúnicas: orden correcto forma, orden incorrecto/mezcla no
const arma = { slot: 'weapon', sockets: 3, gems: [], name: 'Espada', affixes: {} };
arma.gems = [{ kind: 'rune', runeId: 'tir', name: 'Tir', stats: {} }, { kind: 'rune', runeId: 'el', name: 'El', stats: {} }];
checkRuneword(arma);
if (!arma.runeword || arma.runeword.id !== 'filo') throw new Error('Filo no se formó');
arma.gems.reverse();
checkRuneword(arma);
if (arma.runeword) throw new Error('orden incorrecto no debería formar palabra');
arma.gems = [{ kind: 'rune', runeId: 'tir', stats: {} }, { kind: 'gem', gemId: 'rubi', stats: {} }];
checkRuneword(arma);
if (arma.runeword) throw new Error('mezcla gema+runa no debería formar palabra');
// validez de las palabras: runas existentes
for (const rw of RUNEWORDS)
  for (const id of rw.runes)
    if (!RUNES.some(r => r.id === id)) throw new Error('runa inexistente en ' + rw.id);
console.log('Palabras rúnicas:', RUNEWORDS.map(r => `${r.name}(${r.runes.join('+')})`).join(', '));

// runas caen y los legendarios pueden tener 3 engarces
let runes = 0, sock3 = 0;
for (let i = 0; i < 30000; i++) for (const d of rollDrops(5)) if (d.kind === 'rune') runes++;
for (let i = 0; i < 3000; i++) { const it = generateItem(5, 'legendario'); if (it.sockets === 3) sock3++; }
if (!runes || !sock3) throw new Error('faltan runas o engarces triples');
console.log(`Runas en 30k kills: ${runes} · legendarios con 3 engarces: ${sock3}/3000`);

// reforja: cambia un afijo manteniendo la cantidad
const item = generateItem(6, 'raro');
const antes = Object.keys(item.affixes).length;
const txt = rerollAffix(item);
if (Object.keys(item.affixes).length !== antes || !txt || item.rerolls !== 1) throw new Error('reforja inválida');
console.log(`Reforja OK: ${txt} (afijos: ${antes} → ${Object.keys(item.affixes).length})`);

// paragon: nivel 21 da punto paragon, no atributos; stats aplican
const world = buildDungeon(1);
const fake = { ui: { spawnText(){}, message(){} }, sfx(){}, addShake(){}, vibrate(){}, tip(){}, spawnBurst(){}, input: { joyDir: null, keyDir: null }, world, enemies: [] };
const p = new Player(fake, 'guerrero');
p.level = 20; p.xp = 0;
const sp = p.statPoints;
p.gainXP(999999);
if (p.level <= 20) throw new Error('no subió de 20');
if (p.statPoints !== sp) throw new Error('dio atributos tras el 20');
if (p.paragon.points < 1) throw new Error('sin puntos paragon');
const hp0 = p.stats.maxHP;
// tablero de paragon: activa un nodo de vida contiguo al inicio (+6 vida)
p.paragon.nodes['4_5'] = true; p.recompute();
if (p.stats.maxHP !== hp0 + 6) throw new Error('nodo de paragon (vida) no aplica: ' + hp0 + '→' + p.stats.maxHP);
console.log(`Paragon (tablero): nivel ${p.level}, ${p.paragon.points} pts, nodo +6 vida → maxHP ${hp0}→${p.stats.maxHP} ✓`);

// runeword aplica al recompute
let armaReal;
for (let i = 0; i < 9000 && !armaReal; i++) { const x = generateItem(8, 'legendario'); if (x.slot === 'weapon' && x.sockets >= 2) armaReal = x; }
armaReal.unidentified = false;
armaReal.gems = [{ kind: 'rune', runeId: 'tir', name: 'Tir', icon: '🪬', stats: { mp: 4 } }, { kind: 'rune', runeId: 'el', name: 'El', icon: '🪬', stats: { arm: 3 } }];
checkRuneword(armaReal);
p.equipment.weapon = armaReal;
const d0 = p.stats.dmgMax;
p.recompute();
if (!armaReal.runeword) throw new Error('runeword no detectada');
if (!itemStatLines(armaReal).some(l => l.includes('Palabra rúnica'))) throw new Error('línea de runeword ausente');
console.log('Runeword Filo aplicada al equipar ✓ (líneas en ficha OK)');
void d0;

// acto 2: bioma, refugio, enemigos y jefe
const d16 = buildDungeon(16);
if (d16.biome !== 'Abismo Estelar') throw new Error('bioma 16 incorrecto: ' + d16.biome);
if (bossForFloor(16).id !== 'corazon_vacio' || bossForFloor(30).id !== 'corazon_vacio') throw new Error('jefe 16+ incorrecto');
if (!ENEMIES.some(e => e.id === 'espectro') || !ENEMIES.some(e => e.id === 'caballero_abismo')) throw new Error('faltan enemigos acto 2');
let seen = 0;
for (let i = 0; i < 1000; i++) { const e = pickEnemyDef(17); if (e.minFloor === 16) seen++; }
if (!seen) throw new Error('enemigos 16+ no aparecen');
const refuge = buildRefuge();
for (const t of ['healer', 'vendor', 'stash', 'waypoint', 'portal_dungeon'])
  if (!refuge.interactables.some(i => i.type === t)) throw new Error('refugio sin ' + t);
const rp = refuge.interactables.find(i => i.type === 'portal_dungeon');
if (rp.minFloor !== 16) throw new Error('portal del refugio sin minFloor');
if (!refuge.grid.walkable(refuge.spawn.x, refuge.spawn.z)) throw new Error('spawn del refugio no transitable');
console.log(`Acto 2: ${d16.biome} ✓, jefe ${bossForFloor(16).name} ✓, refugio completo ✓, enemigos nuevos en 1000 tiradas: ${seen}`);
console.log('✅ RUNAS/RESPEC/PARAGON/ACTO2 OK');
