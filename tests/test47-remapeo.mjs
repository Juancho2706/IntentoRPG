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
