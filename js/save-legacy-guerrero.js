// ============================================================
// TABLAS LEGADAS DEL GUERRERO para la migración de guardados v4 → v5 — formato (W1, E1)
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.11, D1, D16 y D24). SOLO datos: las lee
// MIGRATIONS[4] (save-schema.migrateV4toV5), que las recibe INYECTADAS (LEGACY_TABLES).
// Contenido: KA-guerrero (E2), escrito desde tests/fixtures/catalog-v4.json (ids y ramas v4:
// opción de la 3.ª rama de v4 → variante 2g, con el criterio de papel de 2f §6.1).
// La insignia v4 de MIGRATIONS[3] NO va aquí: está congelada en save-schema.js (V4_INSIGNIA).
export const GUERRERO_LEGACY = {
  // habilidad vieja → destino en la barra:
  //   { to: '<id>' }                                 la misma en cualquier ranura
  //   { to: null }                                   la ranura se vacía
  //   { to: { k2: '<id>', <specId>: '<id>', '*': '<id>' } }   por ranura, luego por especialización y '*'
  //   forge: 'i' | 'ii' | null                        variante que fija en la habilidad DESTINO (absorción)
  // p. ej. terremoto: { to: { guardian: 'terremoto', '*': 'g_hendidura' } }
  bar: {},
  // LEGACY_FORGE_MAP: opción de la 3.ª rama de v4 (ids de catalog-v4.json) → variante
  //   misma habilidad:     { <optId>: 'i' | 'ii' | null }              (null = sin variante)
  //   habilidad absorbida: { to: '<skillId destino>', map: { <optId>: 'i' | 'ii' | null } }
  // p. ej. torbellino: { to: 'g_remolino', map: { torbellino_v1: 'ii' } }
  forge: {},
  // ids que desaparecen (sus soportes vuelven a knownSupports)
  removed: [],
  // aviso de carga 'paso2-guerrero' (LOAD_NOTICES; vacío = texto por defecto)
  notice: '',
};
