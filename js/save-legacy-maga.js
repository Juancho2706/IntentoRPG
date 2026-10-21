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
  // misma insignia que V4_INSIGNIA.maga (la migración usa la congelada)
  insignia: { piromante: 'p_llamarada', crionte: 'k_prision', arcanista: 'a_orbe' },
  // habilidad vieja → destino en la barra:
  //   { to: '<id>' }                                 la misma en cualquier ranura
  //   { to: null }                                   la ranura se vacía
  //   { to: { k2: '<id>', <specId>: '<id>', '*': '<id>' } }   por ranura, luego por especialización y '*'
  //        (un null EXPLÍCITO en una clave vacía esa ranura; sin clave aplicable el destino es
  //         inválido y la ranura cae a SPEC_BAR y luego a FALLBACK_BAR)
  //   forge: 'i' | 'ii' | null                        variante que fija en la habilidad DESTINO (absorción)
  // Lo que no está aquí y ya no se conoce (kit de otra especialización, activas retiradas de las
  // especializaciones: Ventisca, Aliento Boreal, Misiles, Evocación) cae solo a SPEC_BAR/FALLBACK_BAR.
  bar: {
    // activas de clase v1 que pasan al kit base
    m_t_parpadeo: { to: 'm_parpadeo' },
    m_t_barrera: { to: 'm_barrera' },
    // defensa y utilidad retiradas (A.6): su ranura 2 pasa a la Barrera de Maná
    m_armadura: { to: 'm_barrera' },
    m_onda: { to: 'm_barrera' },
    // básicos absorbidos por el Dardo, con la variante de su elemento (Saeta Ígnea / Saeta Gélida)
    m_ascua: { to: 'm_dardo', forge: 'i' },
    m_toque: { to: 'm_dardo', forge: 'ii' },
    // activas del Piromante v1: la Combustión era su ranura 3; el Muro, ranura 2 o 3
    p_combustion: { to: 'p_llamarada' },
    p_muro_fuego: { to: { k2: 'm_barrera', k3: 'p_llamarada' } },
  },
  // LEGACY_FORGE_MAP: opción de la 3.ª rama de v4 (ids de catalog-v4.json) → variante
  //   misma habilidad:     { <optId>: 'i' | 'ii' | null }              (null = sin variante)
  //   habilidad absorbida: { to: '<skillId destino>', map: { <optId>: 'i' | 'ii' | null } }
  // Criterio de papel (2f §6.1): Calcinar/Estela/Rebote (DoT, rastro, cadena) → la variante de
  // ÁREA; Quebrantar/Decapitar (Vulnerable, ejecutar) → la de UN OBJETIVO; Tullir/Conmocionar
  // (ralentizar, aturdir) → la de CONTROL; Impulso → la de MOVILIDAD. Una opción sin variante de
  // su papel no se escribe: la habilidad queda «por elegir» y le llega la recomendada (D3).
  forge: {
    m_dardo: { m_dardo_v1: 'i', m_dardo_v3: 'ii' },                               // i Saeta Ígnea (área) · ii Saeta Gélida (control)
    m_ascua: { to: 'm_dardo', map: { m_ascua_v1: 'i', m_ascua_v3: 'i' } },
    m_toque: { to: 'm_dardo', map: { m_toque_v1: 'ii', m_toque_v3: 'ii' } },
    bola_fuego: { bola_fuego_v1: 'ii', bola_fuego_v2: 'i' },                      // i Pirodardo (uno) · ii Racimo (área)
    rayo: { rayo_v1: 'i', rayo_v2: 'ii' },                                        // i Rayo en Cadena (área) · ii Haz Concentrado (uno)
    nova_hielo: { nova_hielo_v2: 'ii' },                                          // ii Nova Fracturante (uno)
    meteoro: { meteoro_v1: 'i', meteoro_v2: 'ii' },                               // i Lluvia (área) · ii Ancestral (uno)
    m_paso_escarcha: { m_paso_escarcha_v2: 'i' },                                 // i Paso Doble (movilidad)
    m_estela_ignea: { m_estela_ignea_v1: 'i' },                                   // i Senda de Llamas (área)
    m_u_supernova: { m_u_supernova_v1: 'i', m_u_supernova_v2: 'ii' },             // i Sol Errante (área) · ii Colapso (uno)
    m_u_tormenta: { m_u_tormenta_v1: 'ii', m_u_tormenta_v3: 'i' },                // i Ventisca Anclada (área) · ii Granizo (uno)
    m_u_desgarro: { m_u_desgarro_v1: 'ii', m_u_desgarro_v3: 'ii' },               // ii Quiebre (uno)
  },
  // ids que desaparecen (sus soportes vuelven a knownSupports)
  removed: ['m_ascua', 'm_toque', 'm_armadura', 'm_onda', 'm_t_barrera', 'm_t_parpadeo',
    'p_combustion', 'p_muro_fuego', 'k_ventisca', 'k_aliento', 'a_misiles', 'a_evocacion'],
  // aviso de carga 'paso2-maga' (LOAD_NOTICES)
  notice: '🌿 Los talentos de la Maga se rehicieron hasta el nivel 100. Te aplicamos el Recomendado; revísalo con N',
};
