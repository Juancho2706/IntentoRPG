// Tabla de claves de W2 (docs/paso2-claves-w2.md, decisión 11 del orquestador) volcada para el conversor:
// clave del mockup → clave CANÓNICA del juego, dónde vive y qué suite la prueba. La usan
// lib/impl.mjs (claves-impl.md y pendientes-<clase>.md) y transformar.mjs (el `todo` de --write), para
// que KA y KT no traduzcan a mano. El resto del vocabulario sale VIVO del juego (skill-defs.js:
// SKILL_KEYS = claves que el motor entiende; RETIRED_KEYS = alias que desaparecen, con su traducción).
//
// Forma de la clave: '<clave>' (definición, mod o ruta 'a.b'), 'tv.<clave>', 'stats.<clave>', 'type:<valor>'.
// tipo:
//   'alias'    el mockup la llama de otra forma: se escribe `a`
//   'canonica' W2 la añadió al motor con ese mismo nombre
//   'clase'    clave tv de UNA clase: la consume un poder o la mecánica de esa clase y se declara en
//              <CLASE>_TV_KEYS (talents-<clase>.js); la escribe KT. En una clave de definición: parámetro
//              que lee el código de la clase (comportamiento, campo o mecánica), no el núcleo
//   'cola'     el motor aún no la lee: petición a la cola W2 (núcleo) antes de que KT/KA la usen
// Las filas «ronda 2–3» son claves que entraron en los datos con la congelación de D18 (commit 0fa03dc),
// después de la tabla de W2: su decisión es del integrador de E1.5 (siguen la regla de §2.0: lo que lee el
// núcleo va a la cola W2; lo que consume un poder de la clase va en <CLASE>_TV_KEYS).

export const CLAVES_W2 = Object.freeze({
  // ---- §1 · «SIN TRADUCCIÓN» de la primera ronda
  bounce: { tipo: 'alias', a: 'set: { bounces: n } (el Orbe lee prof.def.bounces)', donde: 'powers-maga.js', prueba: 'test81' },
  chainPct: { tipo: 'canonica', a: 'chainPct (cada salto hace ese % del golpe base)', donde: 'skill-resolve (prof.chainPct), game-skills.spawnChainBounce', prueba: 'test82 §9' },
  dmg3: { tipo: 'alias', a: "mul: { 'steps.2.coef': × } (3.er paso del combo)", donde: 'skill-defs.setPath', prueba: 'test82 §9, test81' },
  scatter: { tipo: 'canonica', a: 'impacts: n, scatter: m en un type:"area"', donde: 'tipo genérico area', prueba: 'test82 §9' },
  'type:field': { tipo: 'alias', a: "type: 'zone' (+ at, dur, radius, follow); type:'field' es error en v2", donde: 'tipo genérico zone', prueba: 'test83 §9, test81' },
  // ---- §2 · claves tv
  'tv.bleedDur': { tipo: 'canonica', a: 'tv.bleedDur (s extra del Sangrado)', donde: 'combat-math.dotProfile', prueba: 'test84 §6' },
  'tv.ccDurPct': { tipo: 'canonica', a: 'tv.ccDurPct (+% a tus aturdimientos)', donde: 'combat-math.ccDurationWithTalents', prueba: 'test84 §6' },
  'tv.freezeDur': { tipo: 'canonica', a: 'tv.freezeDur (+s al Congelado)', donde: 'combat-math.ccDurationWithTalents', prueba: 'test84 §6' },
  'tv.staggerPct': { tipo: 'alias', a: 'stats.staggerPct (fx.stats)', donde: 'recompute / Enemy.applyCC', prueba: 'test84 §6' },
  'tv.critCdrAll': { tipo: 'canonica', a: 'tv.critCdrAll', donde: 'nucleo_tv.onHit (tabla CRIT_CDR_KEYS)', prueba: 'test84 §6' },
  'tv.critFrostCdr': { tipo: 'canonica', a: 'tv.critFrostCdr', donde: 'nucleo_tv.onHit (tabla CRIT_CDR_KEYS)', prueba: 'test84 §6' },
  'tv.basicCritCdr': { tipo: 'canonica', a: 'tv.basicCritCdr', donde: 'nucleo_tv.onHit (tabla CRIT_CDR_KEYS)', prueba: 'test84 §6' },
  'tv.dartCritCdr': { tipo: 'alias', a: 'tv.basicCritCdr (el núcleo acepta los dos nombres)', donde: 'nucleo_tv', prueba: 'test84 §6' },
  'tv.drHighFury': { tipo: 'alias', a: 'tv.drHighMana (recurso > 50 %: Furia, Maná o Energía)', donde: 'nucleo_tv.condDr', prueba: 'test84 §6' },
  'tv.drLowHp': { tipo: 'canonica', a: 'tv.drLowHp (vida < 40 %)', donde: 'nucleo_tv.condDr', prueba: 'test84 §6' },
  'tv.frozenKillHeal': { tipo: 'canonica', a: 'tv.frozenKillHeal', donde: 'nucleo_tv.onKill', prueba: 'test84 §6' },
  'tv.frozenKillMana': { tipo: 'canonica', a: 'tv.frozenKillMana', donde: 'nucleo_tv.onKill', prueba: 'test84 §6' },
  'tv.perfectCdrAll': { tipo: 'canonica', a: 'tv.perfectCdrAll (suelta perfecta, cada 2 s como mucho)', donde: 'nucleo_tv.afterCast', prueba: 'test84 §6' },
  'tv.frostCrit': { tipo: 'clase', dueño: 'KT-maga', a: 'tv.frostCrit (MAGA_TV_KEYS)', donde: 'mech-maga.js (condCrit con gaugeState)', prueba: 'test-gauges-maga' },
  'tv.drVsLayered': { tipo: 'clase', dueño: 'KT-maga', a: 'tv.drVsLayered (MAGA_TV_KEYS)', donde: 'mech-maga.js (condDr con gaugeState)', prueba: 'test-gauges-maga' },
  'tv.aspdCharges': { tipo: 'clase', dueño: 'KT-maga', a: 'tv.aspdCharges (MAGA_TV_KEYS)', donde: 'mech-maga.js', prueba: 'test-gauges-maga' },
  'tv.chargeCrit': { tipo: 'clase', dueño: 'KT-maga', a: 'tv.chargeCrit (MAGA_TV_KEYS)', donde: 'mech-maga.js', prueba: 'test-gauges-maga' },
  'tv.drCharges': { tipo: 'clase', dueño: 'KT-maga', a: 'tv.drCharges (MAGA_TV_KEYS)', donde: 'mech-maga.js', prueba: 'test-gauges-maga' },
  'tv.galeT': { tipo: 'clase', dueño: 'KT-arquera', a: 'tv.galeT (ARQUERA_TV_KEYS)', donde: 'mech-arquera.js (impulso.galeT + tv)', prueba: 'test-gauges-arquera' },
  // ---- §3 · stats
  'stats.regenPct': { tipo: 'canonica', a: 'stats.regenPct (+% regeneración de Maná y Energía)', donde: 'resources.resourceRegenRate', prueba: 'test84 §6' },
  'stats.regen': { tipo: 'alias', a: 'stats.regenPct', donde: 'resources.resourceRegenRate', prueba: 'test84 §6' },
  'stats.resGainPct': { tipo: 'canonica', a: 'stats.resGainPct (+% al recurso generado)', donde: 'resources.gainResource', prueba: 'test84 §6' },
  'stats.resMaxAdd': { tipo: 'alias', a: 'stats.mp (recurso máximo plano)', donde: 'recompute', prueba: 'test84 §6' },
  // ---- §4 y §5 · verbos que el detector del conversor no reconoce solo
  'charge.fullCount': { tipo: 'alias', a: 'charge.full.count (+ full.spread, full.coefMul)', donde: 'game-skills (carga completa)', prueba: 'test82' },
  'charge.coefMax': { tipo: 'alias', a: "set: { 'charge.scale.coef.1': v } (coeficiente a carga completa de scale.coef [aMin, aMax])", donde: 'skill-defs.setPath', prueba: 'test81, test82' },
  'pull.dist': { tipo: 'canonica', a: "pull: { dist, to: 'self'|'center'|'trap' }", donde: 'Enemy.displace', prueba: 'test84 §3' },
  'pull.to': { tipo: 'canonica', a: "pull: { dist, to: 'self'|'center'|'trap' }", donde: 'Enemy.displace', prueba: 'test84 §3' },
  zoneCoef: { tipo: 'canonica', a: 'mod zoneCoef (daño de la estela trail)', donde: 'game-skills (trail)', prueba: 'test83 §7' },
  zoneHeal: { tipo: 'canonica', a: 'mod zoneHeal (cura de la estela trail)', donde: 'game-skills (trail)', prueba: 'test83 §7' },
  dr: { tipo: 'alias', a: "set: { 'buff.dr': v } (DR del buff; en una postura, stance.modes[i].stats.dr)", donde: 'buff / postura (STANCE_STATS)', prueba: 'test82' },
  // ---- ronda 2–3 de los datos (después de la tabla de W2; decisión del integrador de E1.5)
  'tv.batidaDur': { tipo: 'clase', dueño: 'KT-arquera', a: 'tv.batidaDur (ARQUERA_TV_KEYS)', donde: 'mech-arquera.js (coto: Batida)', prueba: 'test-gauges-arquera' },
  'tv.batidaPreyStagger': { tipo: 'clase', dueño: 'KT-arquera', a: 'tv.batidaPreyStagger (ARQUERA_TV_KEYS)', donde: 'mech-arquera.js (coto: Batida)', prueba: 'test-gauges-arquera' },
  'tv.titanPct': { tipo: 'clase', dueño: 'KT-guerrero', a: 'tv.titanPct (GUERRERO_TV_KEYS)', donde: 'powers-guerrero.js (árbol héroe: Golpe de Titán)', prueba: 'test-powers-guerrero' },
  'tv.titanStagger': { tipo: 'clase', dueño: 'KT-guerrero', a: 'tv.titanStagger (GUERRERO_TV_KEYS)', donde: 'powers-guerrero.js (árbol héroe: Golpe de Titán)', prueba: 'test-powers-guerrero' },
  'tv.rivalKillHeal': { tipo: 'clase', dueño: 'KT-guerrero', a: 'tv.rivalKillHeal (GUERRERO_TV_KEYS)', donde: 'powers-guerrero.js (árbol héroe: Rival, por p.sustain)', prueba: 'test-powers-guerrero' },
  // cola W2 resuelta (punto 16, W2b): docs/paso2-claves-w2.md §7
  'tv.drStill': { tipo: 'canonica', a: 'tv.drStill (% de DR quieta ≥ 1 s: p.stillT, sin desplazarte por ningún medio; espejo de drMoving)', donde: 'nucleo_tv.condDr (+ Player.stillT)', prueba: 'test88 §1' },
  'tv.fieldDur': { tipo: 'canonica', a: 'tv.fieldDur (+% de duración de tus trampas y zarzales: las trampas y los campos con data.fieldDur: true; el comportamiento termina con f.dur)', donde: 'field-entities.spawnField (combat-math.fieldDurationWithTalents)', prueba: 'test88 §2 y §2b' },
  'stats.blockPower': { tipo: 'canonica', a: 'stats.blockPower (un bloqueo para 50 + blockPower %, tope 90; fx.stats, buff o postura)', donde: 'combat-math.blockReduction (mitigate, expectedMitigation) + recompute (+ STANCE_STATS)', prueba: 'test88 §3' },
  // ---- parámetros de una definición que leía una activa v1 de la Maga (salen de js/ con E1.5; revisión de E1.5)
  //      tipo 'clase' en una clave de definición = la lee el código de la clase (comportamiento, campo o mecánica), no el núcleo
  shieldManaPct: { tipo: 'alias', a: "mod buff (+% de escudo: el comportamiento de la Barrera multiplica shieldManaPct por prof.buffMul)", donde: 'powers-maga.js (comportamiento m_t_barrera → m_barrera)', prueba: 'test-powers-maga' },
  layers: { tipo: 'clase', dueño: 'KA-maga · KT-maga', a: "set: { layers: n } (capas de Escarcha que deja cada golpe; hoy lo leen k_prision y k_aliento)", donde: 'powers-maga.js; para k_lanza, la Escarcha de mech-maga.js (prof.def.layers en el golpe)', prueba: 'test-skills-maga · test-gauges-maga' },
  blocks: { tipo: 'clase', dueño: 'KA-maga', a: "blocks del campo p_muro_fuego (true = corta el paso, no a jefes; como wall.blocks de §3.6)", donde: 'powers-maga.js (p_muro_fuego lee sk.blocks); la estela de m_estela_ignea_ii deja ese campo con un comportamiento', prueba: 'test-skills-maga' },
});

// entrada de la tabla para una clave leída de una nota (ns ∈ tv | stats | mod | …; k; valor)
export function claveW2({ ns, k, valor }) {
  if (ns === 'tv') return CLAVES_W2[`tv.${k}`] ? { clave: `tv.${k}`, ...CLAVES_W2[`tv.${k}`] } : null;
  if (ns === 'stats') return CLAVES_W2[`stats.${k}`] ? { clave: `stats.${k}`, ...CLAVES_W2[`stats.${k}`] } : null;
  const v = String(valor ?? '').trim();
  if (k === 'type' && v && CLAVES_W2[`type:${v}`]) return { clave: `type:${v}`, ...CLAVES_W2[`type:${v}`] };
  return CLAVES_W2[k] ? { clave: k, ...CLAVES_W2[k] } : null;
}
