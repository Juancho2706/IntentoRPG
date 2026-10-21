// ============================================================
// TABLAS LEGADAS DE LA MAGA para la migración de guardados v4 → v5 — formato (W1, E1)
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.11, D1, D16 y D24). SOLO datos: las lee
// MIGRATIONS[4] (save-schema.migrateV4toV5), que las recibe INYECTADAS (LEGACY_TABLES).
// Contenido: KA-maga (E2), escrito desde tests/fixtures/catalog-v4.json (ids y ramas v4:
// opción de la 3.ª rama de v4 → variante 2g, con el criterio de papel de 2f §6.1).
// `insignia` (la de §3.11) es OPCIONAL y la migración la ignora: MIGRATIONS[3] usa la congelada
// de save-schema.js (V4_INSIGNIA, D16). Si se escribe, test80 exige que coincida con ella.
export const MAGA_LEGACY = {
  // habilidad vieja → destino en la barra:
  //   { to: '<id>' }                                 la misma en cualquier ranura
  //   { to: null }                                   la ranura se vacía
  //   { to: { k2: '<id>', <specId>: '<id>', '*': '<id>' } }   por ranura, luego por especialización y '*'
  //        (un null EXPLÍCITO en una clave vacía esa ranura; sin clave aplicable el destino es
  //         inválido y la ranura cae a SPEC_BAR y luego a FALLBACK_BAR)
  //   forge: 'i' | 'ii' | null                        variante que fija en la habilidad DESTINO (absorción)
  // p. ej. m_ascua: { to: 'm_dardo', forge: 'i' }
  bar: {},
  // LEGACY_FORGE_MAP: opción de la 3.ª rama de v4 (ids de catalog-v4.json) → variante
  //   misma habilidad:     { <optId>: 'i' | 'ii' | null }              (null = sin variante)
  //   habilidad absorbida: { to: '<skillId destino>', map: { <optId>: 'i' | 'ii' | null } }
  // p. ej. bola_fuego: { bola_fuego_v1: 'i', bola_fuego_v2: 'ii', bola_fuego_v3: null }
  forge: {},
  // ids que desaparecen (sus soportes vuelven a knownSupports)
  removed: [],
  // aviso de carga 'paso2-maga' (LOAD_NOTICES; vacío = texto por defecto)
  notice: '',
};
