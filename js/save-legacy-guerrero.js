// ============================================================
// TABLAS LEGADAS DEL GUERRERO para la migración de guardados v4 → v5
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.11, D1, D16 y D24). SOLO datos: las lee
// MIGRATIONS[4] (save-schema.migrateV4toV5), que las recibe INYECTADAS (LEGACY_TABLES).
// Escritas por KA1-guerrero (E2) desde tests/fixtures/catalog-v4.json (ids y ramas v4).
// `insignia` (la de §3.11) es OPCIONAL y la migración la ignora: MIGRATIONS[3] usa la congelada
// de save-schema.js (V4_INSIGNIA, D16). Se escribe para documentarla; test80 exige que coincida.
//
// Formato de `bar` (habilidad v4 → destino en la barra):
//   { to: '<id>' } · { to: null } · { to: { <ranura>|<specId>|'*': '<id>'|null } }
//   forge: 'i' | 'ii' | null  → variante que fija en la habilidad DESTINO (absorción)
// Una habilidad v4 que sigue existiendo con el mismo id no necesita entrada (conserva su id;
// si no cabe en la ranura o ya no se conoce —activas de talento que el Recomendado no concede,
// kit de otra especialización—, la ranura cae a SPEC_BAR y luego a FALLBACK_BAR).
//
// Formato de `forge` (LEGACY_FORGE_MAP, 3.ª rama de v4 → variante 2g):
//   misma habilidad:     { <optId>: 'i' | 'ii' | null }       (null = sin variante: «por elegir»)
//   habilidad absorbida: { to: '<skillId destino>', map: { <optId>: 'i' | 'ii' } }
// Criterio (2f §6.1): primero la mecánica igual (Desangrar → Desgarro, Onda → Onda Sagrada);
// si no, el papel: DoT/zona/radio/varios objetivos → ÁREA, vulnerable/ejecutar → UNI,
// aturdir/ralentizar → CONTROL. Sin correspondencia: null en la propia; en una absorbida la
// opción se omite para que valga la variante por defecto de `bar`. Las 3.as ramas de «Recurso»
// (provocación, grito, furia, estandarte) no son Transformación ni Variante: no se traducen.

// la definitiva de cada especialización (las tres v4 caen en la de la especialización activa)
const ULTIMATE = { berserker: 'g_u_furia', guardian: 'g_u_ciudadela', cruzado: 'g_u_cataclismo' };

export const GUERRERO_LEGACY = {
  bar: {
    // básicos v4 → Tajo con la variante que más se le parece
    g_mandoble: { to: 'g_tajo', forge: 'i' },                 // golpe pesado → Desgarro
    g_embate: { to: 'g_tajo', forge: 'ii' },                  // barrido → Siega
    // principales v4 (cat. spender) que pasan al kit: fuera de su especialización, Hendidura
    torbellino: { to: 'g_hendidura' },
    g_martillo: { to: { cruzado: 'g_martillo', '*': 'g_hendidura' } },
    terremoto: { to: { guardian: 'terremoto', '*': 'g_hendidura' } },
    // el salto pasa al kit Berserker: los demás reciben su movimiento de especialización
    g_salto: { to: { berserker: 'g_salto', guardian: 'g_carga_escudo', cruzado: 'g_sendero', '*': 'embestida' } },
    g_provocacion: { to: 'g_piel' },
    g_u_furia: { to: { ...ULTIMATE } },
    g_u_cataclismo: { to: { ...ULTIMATE } },
    g_u_estandarte: { to: { ...ULTIMATE } },
    // activas de talento v4 retiradas → la habilidad 2g que hereda su papel
    g_t_bramido: { to: 'g_h_bramido' },
    g_t_remolino: { to: 'g_remolino' },
    g_t_temeridad: { to: 'g_remolino' },
    g_t_ira_ciega: { to: { k2: 'g_piel', '*': 'g_remolino' } },
    g_t_desafio: { to: 'g_guardia' },
    g_t_muro: { to: { k3: 'g_guardia', '*': 'g_piel' } },
    g_t_carga: { to: 'g_carga_escudo' },
    g_t_devocion: { to: 'g_juicio' },
    g_t_veredicto: { to: { rmb: 'g_martillo', k3: 'g_juicio', '*': 'g_piel' } },
    g_t_justicia: { to: { k3: 'g_juicio', '*': 'g_piel' } },
  },
  forge: {
    // Tajo: i Desgarro (UNI, sangrado) · ii Siega (ÁREA)
    g_tajo: { g_tajo_v1: 'i', g_tajo_v2: 'i', g_tajo_v3: 'ii' },
    g_mandoble: { to: 'g_tajo', map: { g_mandoble_v1: 'i' } },
    g_embate: { to: 'g_tajo', map: { g_embate_v1: 'i', g_embate_v3: 'ii' } },
    // Hendidura: i Rompefilas (UNI) · ii Grieta (ÁREA)
    torbellino: { to: 'g_hendidura', map: { torbellino_v1: 'ii', torbellino_v2: 'ii', torbellino_v3: 'ii' } },
    g_hendidura: { g_hendidura_v1: 'ii', g_hendidura_v2: 'ii', g_hendidura_v3: 'ii' },
    // Martillo de Guerra: i Martillo Arrojado (UNI) · ii Onda Sagrada (ÁREA)
    g_martillo: { g_martillo_v1: 'ii', g_martillo_v2: 'ii', g_martillo_v3: 'ii' },
    // Terremoto: i Martinete (UNI) · ii Falla (ÁREA)
    terremoto: { terremoto_v1: 'ii', terremoto_v2: 'ii', terremoto_v3: 'i' },
    // Lanza: i Arpón (CONTROL) · ii Jabalinas (ÁREA)
    g_lanza: { g_lanza_v1: null, g_lanza_v2: 'ii', g_lanza_v3: null },
    // Embestida: i Carnero (CONTROL) · ii Doble Carga (MOV)
    embestida: { embestida_v1: null, embestida_v2: 'i', embestida_v3: null },
    // Salto: i Caída Atronadora (CONTROL) · ii Salto Rasante (MOV)
    g_salto: { g_salto_v1: 'i', g_salto_v2: null, g_salto_v3: null },
    // Piel de Hierro: i Espinas (ÁREA) · ii Inamovible (AGU, imparable)
    g_piel: { g_piel_v1: 'i', g_piel_v2: null, g_piel_v3: 'ii' },
    // Cataclismo: i Rayo del Cielo (UNI) · ii Amanecer (APO)
    g_u_cataclismo: { g_u_cataclismo_v1: null, g_u_cataclismo_v2: null, g_u_cataclismo_v3: 'i' },
  },
  // ids v4 que desaparecen (sus soportes vuelven a knownSupports)
  removed: [
    'g_mandoble', 'g_embate', 'torbellino', 'g_provocacion', 'g_u_estandarte',
    'g_t_bramido', 'g_t_remolino', 'g_t_temeridad', 'g_t_ira_ciega',
    'g_t_desafio', 'g_t_muro', 'g_t_carga', 'g_t_devocion', 'g_t_veredicto', 'g_t_justicia',
  ],
  insignia: { berserker: 'g_t_remolino', guardian: 'g_t_desafio', cruzado: 'g_t_devocion' },
  // aviso de carga 'paso2-guerrero' (LOAD_NOTICES; vacío = texto por defecto)
  notice: '',
};
