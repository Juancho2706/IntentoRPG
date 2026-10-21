// ============================================================
// Bolsa de materiales (módulo PURO, sin imports)
// ============================================================
// Lo reexporta js/entities.js (sus importadores no cambian). Vive aparte para que
// js/save-schema.js (glifos que vuelven a la bolsa en MIGRATIONS[4]) no importe
// entities.js, que a su vez importa save-schema.js: así no hay ciclo entre los dos.
//
// Tope de la bolsa de materiales, en HUECOS (no en objetos):
//  - las gemas/runas idénticas se APILAN (un hueco por pila, contador en la UI);
//  - los materiales de PROGRESO (llaves de grieta, fragmentos, glifos) no ocupan
//    hueco: nunca quedan bloqueados por el tope.
// El array p.materials sigue guardando un objeto por unidad (compatibilidad con
// cubo/engarce/consumo por índice); el apilado es lógico → saves viejos válidos.
export const MAX_MATERIALS = 60;
export const PROGRESS_MATERIAL_KINDS = ['riftkey', 'fragment', 'glyph'];

// clave de pila: dos gemas/runas con la misma clave son idénticas (null = no apila)
export function materialStackKey(it) {
  if (!it) return null;
  if (it.kind === 'gem') return `gem|${it.gemId}|${it.ilvl}|${JSON.stringify(it.stats || {})}`;
  if (it.kind === 'rune') return `rune|${it.runeId}|${JSON.stringify(it.stats || {})}`;
  return null;
}

// huecos ocupados de la bolsa (pilas de gemas/runas + otros; progreso no cuenta)
export function materialSlotsUsed(mats) {
  const keys = new Set();
  let n = 0;
  for (const it of mats || []) {
    if (it && PROGRESS_MATERIAL_KINDS.includes(it.kind)) continue;
    const k = materialStackKey(it);
    if (k) { if (!keys.has(k)) { keys.add(k); n++; } } else n++;
  }
  return n;
}

// ¿cabe este material en la bolsa? (sin item → ¿hay algún hueco libre?)
export function canAddMaterial(mats, item = null) {
  if (item && PROGRESS_MATERIAL_KINDS.includes(item.kind)) return true;
  const k = materialStackKey(item);
  if (k && (mats || []).some(m => materialStackKey(m) === k)) return true; // se apila
  return materialSlotsUsed(mats) < MAX_MATERIALS;
}
