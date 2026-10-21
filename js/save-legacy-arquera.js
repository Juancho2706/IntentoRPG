// ============================================================
// TABLAS LEGADAS DE LA ARQUERA para la migración de guardados v4 → v5 — stub de contrato
// ============================================================
// Paso 2 (E0.6; docs/paso2-implementacion.md §3.11, D1, D16 y D24). SOLO datos: las lee
// MIGRATIONS[4] (y MIGRATIONS[3] congelada, la insignia) de js/save-schema.js, que las recibe
// INYECTADAS. Formato: W1 (E1). Contenido: KA-arquera (E2), escrito desde
// tests/fixtures/catalog-v4.json (opciones de la 3.ª rama de v4 → variante 2g).
export const ARQUERA_LEGACY = {
  // specId → id de la insignia v4 (k3 de MIGRATIONS[3] congelada, D16)
  insignia: {},
  // habilidad vieja → { to: id | null | { <ranura | specId | '*'>: id }, forge?: 'i' | 'ii' }
  bar: {},
  // LEGACY_FORGE_MAP: skillId → { <optId de la 3.ª rama v4>: 'i' | 'ii' | null }
  //                   o, si la habilidad se absorbe, { to: <skillId destino>, map: { <optId>: 'i' | 'ii' } }
  forge: {},
  // ids que desaparecen (sus soportes vuelven a knownSupports)
  removed: [],
  // aviso de carga 'paso2-arquera' (LOAD_NOTICES)
  notice: '',
};
