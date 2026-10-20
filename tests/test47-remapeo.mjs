// Remapeo de controles: módulo puro de bindings (defaults, mapa inverso,
// reasignación sin duplicados, fusión de anulaciones, etiquetas).
import {
  DEFAULT_BINDINGS, BINDABLE_ACTIONS, MOVE_ACTIONS,
  mergeBindings, buildCodeMap, assignBinding, keyLabel,
} from '../js/bindings.js';

// toda acción remapeable de la UI tiene un binding por defecto
for (const a of BINDABLE_ACTIONS)
  if (!DEFAULT_BINDINGS[a.id]) throw new Error('acción sin binding por defecto: ' + a.id);
// y todo default es un array no vacío de códigos
for (const [a, codes] of Object.entries(DEFAULT_BINDINGS))
  if (!Array.isArray(codes) || !codes.length) throw new Error('binding por defecto inválido: ' + a);
console.log(`Defaults: ${Object.keys(DEFAULT_BINDINGS).length} acciones, todas con tecla; ${BINDABLE_ACTIONS.length} remapeables ✓`);

// movimiento marcado correctamente (se lee "mantenido", no dispara)
for (const m of ['moveUp', 'moveDown', 'moveLeft', 'moveRight'])
  if (!MOVE_ACTIONS.has(m)) throw new Error('falta acción de movimiento: ' + m);
console.log('Acciones de movimiento marcadas ✓');

// mapa inverso resuelve code → action
const b = mergeBindings();
const map = buildCodeMap(b);
if (map['KeyI'] !== 'inventory') throw new Error('KeyI debería resolver a inventory');
if (map['Space'] !== 'primary') throw new Error('Space debería resolver a primary');
if (map['ArrowUp'] !== 'moveUp') throw new Error('ArrowUp debería resolver a moveUp');
console.log('Mapa inverso code→action correcto ✓');

// Paso 2d (docs/paso2-diseno.md §1.1): talentos en N (convención de WoW) y la barra de
// 6 ranuras — 🖱️Izq/🖱️Der son el ratón; 1–4 las cuatro ranuras de teclado; esquiva en Mayús
if (map['KeyN'] !== 'talents') throw new Error('KeyN debería abrir los talentos');
if (!BINDABLE_ACTIONS.some(a => a.id === 'talents' && a.group === 'Paneles')) throw new Error('Talentos debe ser remapeable (grupo Paneles)');
for (const [i, code] of ['Digit1', 'Digit2', 'Digit3', 'Digit4'].entries())
  if (map[code] !== 'skill' + (i + 1)) throw new Error(`${code} debería ser la ranura ${i + 1}`);
if (map['ShiftLeft'] !== 'dodge' || map['ShiftRight'] !== 'dodge') throw new Error('la esquiva va en Mayús');
const skillActs = Object.keys(DEFAULT_BINDINGS).filter(a => /^skill\d$/.test(a));
if (skillActs.length !== 4) throw new Error('la barra tiene 4 ranuras de teclado (+ 2 de ratón = 6)');
// remapear la ranura 2 mueve la tecla y no deja duplicados
const b6 = mergeBindings();
assignBinding(b6, 'skill2', 'KeyN');
const m6 = buildCodeMap(b6);
if (m6['KeyN'] !== 'skill2' || b6.talents.includes('KeyN')) throw new Error('reasignar N a la ranura 2 debe quitarla de talentos');
console.log('Talentos en N, ranuras 1–4 + ratón (6), esquiva en Mayús; remapeo sin duplicados ✓');

// reasignar una tecla la quita de su acción anterior (sin duplicados)
assignBinding(b, 'skills', 'KeyI'); // KeyI estaba en inventory
if (!b.skills.includes('KeyI')) throw new Error('KeyI no se asignó a skills');
if (b.inventory.includes('KeyI')) throw new Error('KeyI debería haberse quitado de inventory');
const map2 = buildCodeMap(b);
let dup = 0; const seen = new Set();
for (const c of Object.keys(map2)) { if (seen.has(c)) dup++; seen.add(c); }
if (dup) throw new Error('hay códigos duplicados tras reasignar');
console.log('Reasignación sin duplicados (quita de la acción previa) ✓');

// fusión: anulaciones válidas sustituyen; claves desconocidas/ inválidas se ignoran
const merged = mergeBindings({ inventory: ['KeyM'], basura: ['KeyZ'], skills: [] });
if (merged.inventory[0] !== 'KeyM') throw new Error('no aplicó la anulación de inventory');
if ('basura' in merged) throw new Error('no debe incluir acciones desconocidas');
if (merged.skills[0] !== DEFAULT_BINDINGS.skills[0]) throw new Error('un override vacío debe caer al default');
console.log('Fusión de anulaciones robusta (ignora claves inválidas y vacías) ✓');

// etiquetas legibles
if (keyLabel('KeyW') !== 'W' || keyLabel('Digit1') !== '1' || keyLabel('Space') !== 'Espacio' || keyLabel('ArrowUp') !== '↑')
  throw new Error('keyLabel incorrecto');
console.log('Etiquetas de tecla legibles ✓');

console.log('\n✅ REMAPEO DE CONTROLES OK');
