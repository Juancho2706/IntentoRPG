// ============================================================
// Mapa de acciones ↔ teclas (remapeable). Módulo PURO (testeable sin DOM).
// ============================================================
// El juego resuelve cada tecla física a una "acción" lógica vía este mapa, en
// vez de comparar `e.code` directamente. Las anulaciones del jugador viven en
// settings.bindings y se fusionan con los valores por defecto.

export const DEFAULT_BINDINGS = {
  moveUp:    ['KeyW', 'ArrowUp'],
  moveDown:  ['KeyS', 'ArrowDown'],
  moveLeft:  ['KeyA', 'ArrowLeft'],
  moveRight: ['KeyD', 'ArrowRight'],
  inventory: ['KeyI', 'KeyB'],
  skills:    ['KeyT'],
  character: ['KeyC'],
  potionHP:  ['KeyQ'],
  potionMP:  ['KeyE'],
  primary:   ['Space'],
  dodge:     ['ShiftLeft', 'ShiftRight'],
  grab:      ['KeyF'],
  map:       ['KeyM', 'Tab'],
  close:     ['Escape'],
  skill1:    ['Digit1'],
  skill2:    ['Digit2'],
  skill3:    ['Digit3'],
  skill4:    ['Digit4'],
};

// acciones de movimiento: se leen "mantenidas" (no disparan al pulsar)
export const MOVE_ACTIONS = new Set(['moveUp', 'moveDown', 'moveLeft', 'moveRight']);

// acciones remapeables para la UI, agrupadas y con etiqueta legible
export const BINDABLE_ACTIONS = [
  { id: 'moveUp',    label: 'Mover arriba',   group: 'Movimiento' },
  { id: 'moveDown',  label: 'Mover abajo',    group: 'Movimiento' },
  { id: 'moveLeft',  label: 'Mover izquierda',group: 'Movimiento' },
  { id: 'moveRight', label: 'Mover derecha',  group: 'Movimiento' },
  { id: 'primary',   label: 'Acción / Atacar',group: 'Combate' },
  { id: 'dodge',     label: 'Esquivar',       group: 'Combate' },
  { id: 'skill1',    label: 'Habilidad 1',    group: 'Combate' },
  { id: 'skill2',    label: 'Habilidad 2',    group: 'Combate' },
  { id: 'skill3',    label: 'Habilidad 3',    group: 'Combate' },
  { id: 'skill4',    label: 'Habilidad 4',    group: 'Combate' },
  { id: 'potionHP',  label: 'Poción de vida', group: 'Combate' },
  { id: 'potionMP',  label: 'Poción de maná', group: 'Combate' },
  { id: 'grab',      label: 'Recoger botín',  group: 'Mundo' },
  { id: 'map',       label: 'Mapa',           group: 'Mundo' },
  { id: 'inventory', label: 'Inventario',     group: 'Paneles' },
  { id: 'skills',    label: 'Habilidades',    group: 'Paneles' },
  { id: 'character', label: 'Personaje',      group: 'Paneles' },
  { id: 'close',     label: 'Cerrar panel',   group: 'Paneles' },
];

// fusiona defaults con anulaciones (solo acciones conocidas; copia defensiva)
export function mergeBindings(overrides = {}) {
  const b = {};
  for (const a of Object.keys(DEFAULT_BINDINGS))
    b[a] = Array.isArray(overrides?.[a]) && overrides[a].length ? overrides[a].slice() : DEFAULT_BINDINGS[a].slice();
  return b;
}

// mapa inverso code → action (para resolver una pulsación en O(1))
export function buildCodeMap(bindings) {
  const m = {};
  for (const [a, codes] of Object.entries(bindings)) for (const c of codes) m[c] = a;
  return m;
}

// asigna `code` a `action`, quitándolo de cualquier otra acción (sin duplicados)
export function assignBinding(bindings, action, code) {
  for (const a of Object.keys(bindings)) bindings[a] = bindings[a].filter(c => c !== code);
  bindings[action] = [code];
  return bindings;
}

// etiqueta legible de un código de tecla del navegador
export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const named = {
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Space: 'Espacio', ShiftLeft: 'Mayús izq', ShiftRight: 'Mayús der',
    ControlLeft: 'Ctrl izq', ControlRight: 'Ctrl der', AltLeft: 'Alt izq', AltRight: 'Alt der',
    Escape: 'Esc', Enter: 'Intro', Tab: 'Tab', Backquote: '`',
  };
  return named[code] || code;
}
