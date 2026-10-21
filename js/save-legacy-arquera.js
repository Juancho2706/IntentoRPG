// ============================================================
// TABLAS LEGADAS DE LA ARQUERA para la migración de guardados v4 → v5 (KA1)
// ============================================================
// Paso 2 (docs/paso2-implementacion.md §3.11, D1, D16 y D24). SOLO datos: las lee
// MIGRATIONS[4] (save-schema.migrateV4toV5), que las recibe INYECTADAS (LEGACY_TABLES).
// Escritas desde tests/fixtures/catalog-v4.json (ids y ramas v4) y docs/paso2g-arquera.md
// §11.3. La opción de la 3.ª rama de v4 pasa a la variante 2g por su papel (2f §6):
// veneno/zona/radio → ÁREA · Quebrantar/Decapitar/Atravesar → UN OBJETIVO ·
// aturdir/ralentizar → CONTROL; sin variante de ese papel, null (por elegir).
export const ARQUERA_LEGACY = {
  // la insignia v4 de cada especialización (= V4_INSIGNIA de save-schema.js; la migración la ignora)
  insignia: { francotiradora: 'a_t_apuntado', montaraz: 'a_t_cepo', tiradora: 'a_t_andanada' },
  // habilidad vieja → destino en la barra (§3.11). Lo que no cabe en su ranura, no se conoce
  // (kit de otra especialización) o se repite cae a SPEC_BAR y luego a FALLBACK_BAR.
  bar: {
    // los básicos absorbidos: Disparo Rápido con su variante
    a_disperso: { to: 'a_disparo', forge: 'i' },
    a_cicuta: { to: 'a_disparo', forge: 'ii' },
    // movilidad de los árboles v1 → Paso Veloz (la Danza, a la Carrera del Viento de la Tiradora)
    a_t_voltereta: { to: 'a_paso' },
    a_t_salto: { to: 'a_paso' },
    a_t_disuasorio: { to: 'a_paso' },
    a_t_danza: { to: { tiradora: 'a_v_carrera', '*': 'a_paso' } },
    // Agilidad estaba en la 1 (movilidad v4); ahora es activa de talento de la ranura 2
    agilidad: { to: 'a_paso' },
    // utilidades v1 → Bomba de Humo (Visión Certera, a Rodilla en Tierra de la Francotiradora)
    a_t_conmocion: { to: 'a_humo' },
    a_t_silencio: { to: 'a_humo' },
    a_t_senuelo: { to: 'a_humo' },
    a_t_vision: { to: { francotiradora: 'a_f_rodilla', '*': 'a_humo' } },
    // Red de Caza es la variante II de Trampa de Cepo: la variante se fija siempre y la ranura 2
    // (el cepo es de la 3) cae a la barra de la especialización (Bomba de Humo; Rodilla en
    // Tierra en la Francotiradora)
    a_red: { to: 'a_t_cepo', forge: 'ii' },
    // el Arpón es Flecha de Garfio (variante II de Flecha Detonante) en el Montaraz; si no, se vacía
    a_t_arpon: { to: { montaraz: 'a_m_detonante', '*': null }, forge: 'ii' },
  },
  // opción de la 3.ª rama v4 → variante 2g (misma habilidad) o de la que la absorbe
  forge: {
    a_disparo: { a_disparo_v1: 'i', a_disparo_v2: 'ii', a_disparo_v3: 'ii' },
    // las absorbidas conservan su forma (Disperso = I, Cicuta = II) elija lo que eligiera
    a_disperso: { to: 'a_disparo', map: { a_disperso_v1: 'i', a_disperso_v2: 'i', a_disperso_v3: 'i' } },
    a_cicuta: { to: 'a_disparo', map: { a_cicuta_v1: 'ii', a_cicuta_v2: 'ii', a_cicuta_v3: 'ii' } },
    flecha_perforante: { flecha_perforante_v1: 'ii', flecha_perforante_v2: 'i', flecha_perforante_v3: 'ii' },
    flecha_multiple: { flecha_multiple_v1: 'i', flecha_multiple_v2: 'ii', flecha_multiple_v3: null },
    lluvia_flechas: { lluvia_flechas_v1: null, lluvia_flechas_v2: 'i', lluvia_flechas_v3: null },
    a_paso: { a_paso_v1: null, a_paso_v2: 'ii', a_paso_v3: null },
    a_red: { to: 'a_t_cepo', map: { a_red_v1: 'ii', a_red_v2: 'ii', a_red_v3: 'ii' } },
    a_humo: { a_humo_v1: 'i', a_humo_v2: null, a_humo_v3: null },
    a_u_diluvio: { a_u_diluvio_v1: 'i', a_u_diluvio_v2: 'ii', a_u_diluvio_v3: null },
    a_u_celeste: { a_u_celeste_v1: 'ii', a_u_celeste_v2: null, a_u_celeste_v3: 'ii' },
    a_u_zarzas: { a_u_zarzas_v1: 'i', a_u_zarzas_v2: null, a_u_zarzas_v3: 'i' },
  },
  // ids que desaparecen (sus soportes vuelven a knownSupports)
  removed: ['a_disperso', 'a_cicuta', 'a_red', 'a_t_voltereta', 'a_t_conmocion', 'a_t_silencio', 'a_t_vision',
    'a_t_disuasorio', 'a_t_arpon', 'a_t_senuelo', 'a_t_danza', 'a_t_salto'],
  // aviso de carga 'paso2-arquera': el texto por defecto (§11.3.5)
  notice: '',
};
