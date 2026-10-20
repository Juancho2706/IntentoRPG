// ============================================================
// TALENTOS del GUERRERO — árbol de clase + 3 especializaciones (Paso 2c.1, SOLO DATOS)
// ============================================================
// Transcripción LITERAL de los mockups aprobados (D:\Proyectos\IntentoRPG-assets\mockups\):
//   Spec-Berserker / Spec-Guardian / Spec-Cruzado.dc.html (el árbol de clase es idéntico en los 3)
// id, name, t, r, c, max, req, free, fx, opts y d de TREES.cls/spec, con los ajustes
// de forma de docs/paso2-diseno.md §5.1 (d → d(r) cuando el texto depende del rango;
// opts[].d → opts[].desc) y los de contenido de §5.2. El formato de NODO y de fx está en la
// cabecera de js/talents.js, que importa este archivo.
//  · Iconos: talents/<clase>-<spec|clase>-<id>.webp · retrato specs/<spec>.webp · emblema
//    emblems/<spec>.webp (rutas relativas a assets/; arte en IntentoRPG-assets/web/).
//  · preset = RECOMMENDED del mockup como lista ordenada [id, rangos] (filas de arriba abajo,
//    que es el orden que necesita presetRanks); en las elecciones, 3.er elemento = opción.
//    cls.preset es el de la 1.ª especialización; cada spec trae además clsPreset (el
//    RECOMMENDED.cls de su propio mockup) por si 2c.0 quiere usar el de la spec activa.
//  · spec.role ∈ dps|tank|support|control (Main.dc.html) · spec.mechanic = id del indicador
//    de §2 (spec-mechanics.js) · spec.innate = pasivas de línea base de §5.2.5 (no son nodos).
//  · `power` y `tv` son SOLO datos (nombres de §5.3); su efecto es de powers-<clase>.js (2c.1).
//
// AJUSTES Y DESVIACIONES respecto del mockup:
//  · s0 de cada especialización otorga la insignia (fx.grant) y su texto la describe; s4 pasa a
//    potenciarla (t:'p', 1 rango): Remolino Sediento / Desafío Firme / Devoción Ferviente (§5.2.1).
//  · Berserker s0: «+40 %» → «+25 %» y «o con la Sed Saciada» (m_berserk ×1,25, §5.2.2).
//  · elem.phys → elem.physical (c1, Berserker s1): vocabulario ELEMS de skill-defs.js (§3.0); talents.js
//    expande '@<elem>' contra sk.elem, que en el catálogo ya es 'physical'.
//  · g_t_ira_ciega lleva el tag 'utility' para poder ir en k2 además de k3 (§3.1 pide k3/k2 y
//    defaultSlots solo abre k2 a las de especialización con defense/utility).
//
// PENDIENTE_2C1: vacío. Los 29 poderes, los 11 comportamientos de las activas de talento
// (Martillo de Justicia usa el tipo genérico `proj`) y los campos de suelo están en
// js/powers-guerrero.js; los VFX/SFX de las activas, en js/fx-skills-guerrero.js.
//
// CAMBIOS DE DATOS del Paso 2c.1:
//  · Guardián s17 Muralla Viviente: fuera `tv.dmgReduc: 2` (era −2 %/rango SIEMPRE, sin
//    depender de las cargas); el −2 %/rango POR CARGA lo da su poder g_muralla_viva (condDr).
//
// PASO 2c.2 — sin portadores (ningún poder en dos nodos; lo vigila test65a):
//  · Berserker s5 → power 'g_instinto_asesino' · s8 → tv.bleedKillHeal · s15 → tv.bleedKillMana
//    · s9 → solo su activa (el buff de Temeridad lleva 'gaugeGain:sed' y dmgTakenPct)
//    · x1 → tv.executePct (núcleo) · x2 → 'g_carnicero' (único nodo con ese poder).
//  · Guardián s7 → 'g_martillo_pesado' · s8 → tv.killHeal (núcleo) · s4 → 'g_desafio_firme'.
//  · Cruzado s6A → 'g_consagracion' · s8 → tv.killHeal (a ti) + 'g_luz_sanadora' (aliados)
//    · s12 → tv.fervorChance (spec-mechanics).
// RECALIBRACIÓN 2c.2 (banco de balance, típico Nv50 con el preset del Berserker: jefe 34,9 →
// 39,6 s, élite 4,47 → 4,81 s; texto y valor cambian JUNTOS, ningún poder queda por debajo
// de su texto). Furia (lo que más DPS daba: c14 −11,6 %, c6 −7,2 % en la ablación) y Físico:
//  · c14 Maestro de Armas: +15 % de daño crítico y 3 de Furia por crítico → +10 % y 2.
//  · Berserker s1 Ira Creciente: +5 %/rango de daño Físico → +2 %/rango.
//  · Berserker s2 Frenesí: +5 %/rango de velocidad de ataque → +3 %/rango.
//  · Berserker x1 Ejecutar: +40 % contra élites y jefes bajo el umbral → +25 % (tv.executeDmg).
//  · Cataclismo (skills-guerrero.js) SIGUE SAGRADO: es el pilar del Cruzado (Fe Ardiente s1 e
//    Ira Divina s16 lo nombran) y pasarlo a Físico haría que el Berserker apilara sus +Físico
//    sobre la definitiva. Se compensa en la habilidad: 6 impactos de 3,6 en 3 s → 8 de 3,4 en
//    5 s (+26 % de daño total, golpe suelto MENOR para el tope del 25 % del jefe y el mismo
//    ritmo inicial, que es lo que infla al óptimo): parte de la definitiva 9 → 14 % (Nv50) y
//    11 → 16 % (Nv25).
// RECALIBRACIÓN 2e (banco de roles, §7.2: matriz 9 especializaciones × 5 escenarios; antes
// 46 objetivos fuera, después 0 con la semilla 1 + 3 pendientes documentados en
// PENDING_2E de tests/balance-bench.mjs). Texto y valor cambian JUNTOS:
//  · Remolino Sangriento (insignia Berserker): canal 3 → 2 s (mismos 10 golpes), 45 → 47 %
//    por golpe. Con 3 s de cada 6 girando era una TRAMPA de tiempo: sin él el Guerrero Nv10
//    mataba al jefe en 77 s y con él en 104 (élite 9,1 → 12,9 s, fuera del 1A).
//  · s4 Remolino Sediento: 4 de Sed por ENEMIGO → 2 por GOLPE (contra un jefe daba 4 por giro;
//    con 5 enemigos ya topaba). s6A Carnicería: +40 % de radio y salto a 2 → +10 % y 1 (el
//    área del Berserker ya era ×1,45 de la media). s16 Torbellino de Acero: además −10 %/rango
//    de coste y Vulnerable 4 s (la ranura 2 ofensiva daba −4 % de UNI: era una trampa), con
//    +5 %/rango de radio (era 15). s1 Ira Creciente 2 → 1 %/rango, c13 Cazador de Campeones
//    5 → 3 %/rango y s11 Umbral del Dolor −4 → −13 %/rango (TTD+ del Berserker 0,50 → 0,91·M
//    sin pasar del jefe ≥ 40 s que necesita la media de clases del 1A).
//  · x1 Ejecutar 20 → 6 % (rematar al 20 % hacía del Berserker el más rápido en comunes:
//    TTK 0,40 s < 0,48) · x2 Carnicero 10 → 5 de Furia por remate.
//  · Guardián: s1 Baluarte 25 → 10 de armadura/rango, s5 Guardia Alta −3 → −1 %/rango,
//    s11 Coloso +15 → +5 de armadura/rango y s17 Muralla Viviente −2 → −1 %/rango por carga:
//    su TTD+ estaba en el tope (180 s, inmortal) y ahora queda en 2,4·M y ≥ 1,8× el Cruzado.
//  · Cruzado: s6A Consagración: suelo 4 → 1 s y la cura NO se apila (bug: 4 suelos a la vez
//    curaban 8 %/s, powers-guerrero.js). Veredicto Final 300 → 120 % en cono de 90 → 60°
//    (s9 y su activa): con la cura del 25 % era el AoE más alto del juego (×2,67 de la media).
//    s7 Martillo Justiciero pierde el +12 %/rango de daño (queda el radio). s5 Celo 3 → 2 %
//    de crítico/rango. s12 Fervor Creciente 15 → 8 %/rango. Aura de Devoción (insignia y s0):
//    8 → 12 s y 2 → 3 %/s. s14 Luz del Alba: +10 % al grupo → +25 % a los aliados (+10 % a
//    ti): APOYO 18 → 60 % del DPS de un aliado (§7.2 pide ≥ 25 %). Bramido de Guerra (c12A):
//    enfriamiento 45 → 28 s y cura 15 → 21 % (TTD+ del Cruzado 0,53 → 1,31·M).
//  · skills-guerrero.js: Martillo de Guerra 2,4 → 1,8 (era el 57 % del área del Cruzado) y
//    Piel de Hierro 6 s/−30 % → 8 s/−40 % (la ranura 2 defensiva del Berserker y del Guardián).
//  · powers-common.js: Juicio 60 → 20 % del golpe medio al matar.
// Este archivo no importa nada (talents.js lo importa; evita ciclos con data/powers).

// valor de un efecto en el rango r (para los textos d(r)) y plural simple
const x = (v, r) => +(v * r).toFixed(2);
const pl = (r, one, many) => (r > 1 ? many : one);

// Activas `grant` del Guerrero (§3.1, estado T). Formato de MEMORIA.md §7; todas
// kind 'talent' y req 10 (TALENT_SKILL_REQ). `type` = tipo genérico de
// game-skills.js; `behavior` = comportamiento propio (js/powers-guerrero.js, Paso 2c.1:
// sustituye al `type` genérico, que queda como documentación de su forma).
export const GUERRERO_TALENT_SKILLS = [
  // — árbol de clase —
  { id: 'g_t_aliento', name: 'Segundo Aliento', icon: '❤️‍🩹', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'heal', 'physical'], elem: 'physical',
    behavior: 'g_t_aliento', req: 10, cd: 30, furyPerPct: 3, color: 0xff5a4a,
    desc: 'Consumes toda tu Furia y te curas un 1 % de vida por cada 3 de Furia gastada (100 de Furia → 33 %). Enfriamiento 30 s.' },
  { id: 'g_t_intervencion', name: 'Intervención', icon: '🛡️', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'ally', 'shield', 'physical'], elem: 'physical',
    type: 'leap', behavior: 'g_t_intervencion', req: 10, cd: 20, range: 8, airT: 0.4, lockT: 0.4, shieldPct: 15, dur: 6, color: 0x88bbff,
    desc: 'Saltas hasta un aliado (o 8 m hacia el cursor) y ambos ganan un escudo del 15 % de tu vida máxima durante 6 s. Enfriamiento 20 s.' },
  { id: 'g_t_bramido', name: 'Bramido de Guerra', icon: '📯', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'shout', 'buff', 'ally', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_t_bramido', req: 10, cd: 28, dur: 10, buff: { hpPct: 15 }, allyRadius: 15, healPct: 21, color: 0xff6644,
    desc: 'Tú y los aliados a 15 m ganan +15 % de vida máxima durante 10 s y se curan un 21 % al instante. Enfriamiento 28 s.' },
  // — Berserker —
  { id: 'g_t_remolino', name: 'Remolino Sangriento', icon: '🌪️', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'melee', 'area', 'dot', 'physical'], elem: 'physical',
    behavior: 'g_t_remolino', req: 10, coef: 0.47, cost: 30, cd: 6, channelT: 2, ticks: 10, radius: 2.9, dotKind: 'bleed', moveFree: true, color: 0xcc2222,
    desc: 'Insignia del Berserker: giras 2 s a velocidad normal golpeando 10 veces a todo lo que hay a 2,9 m (47 % del arma por golpe, 470 % en total) y lo desangras. Cuesta 30 de Furia; enfriamiento 6 s.' },
  { id: 'g_t_temeridad', name: 'Temeridad', icon: '💢', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'buff', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_t_temeridad', req: 10, cd: 90, dur: 10, buff: { crit: 25 }, gaugeMult: 2, dmgTakenPct: 10, color: 0xff3322,
    desc: 'Durante 10 s ganas +25 % de probabilidad de crítico y tu Sed se llena el doble de rápido, pero recibes +10 % de daño. Enfriamiento 90 s.' },
  // tag 'utility' para que admita la ranura 2 (k3/k2 en §3.1; defaultSlots lo exige)
  { id: 'g_t_ira_ciega', name: 'Ira Ciega', icon: '👁️', kind: 'talent', cat: 'spec', slots: ['k2', 'k3'], tags: ['spec', 'buff', 'utility', 'physical'], elem: 'physical',
    type: 'buff', behavior: 'g_t_ira_ciega', req: 10, cd: 60, dur: 6, buff: { dmgPct: 30 }, hpCostPct: 10, unstoppable: true, color: 0xff2200,
    desc: 'Pagas un 10 % de tu vida actual: durante 6 s haces +30 % de daño y eres imparable (inmune a control). Enfriamiento 60 s.' },
  // — Guardián —
  { id: 'g_t_desafio', name: 'Grito Desafiante', icon: '📢', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'shout', 'taunt', 'cc', 'area', 'physical'], elem: 'physical',
    type: 'taunt', behavior: 'g_t_desafio', req: 10, cd: 12, radius: 10, dur: 4, genOnUse: 20, color: 0x5599ff,
    desc: 'Insignia del Guardián: provocas a todos los enemigos a 10 m durante 4 s y ganas 20 de Furia. Enfriamiento 12 s.' },
  { id: 'g_t_muro', name: 'Muro de Escudos', icon: '🧱', kind: 'talent', cat: 'spec', slots: ['k2', 'k3'], tags: ['spec', 'defense', 'physical'], elem: 'physical',
    behavior: 'g_t_muro', req: 10, cd: 25, dur: 8, drPerCharge: 10, drMax: 50, color: 0x7fb0e8,
    desc: 'Gastas todas tus cargas de Bastión: −10 % de daño recibido por carga durante 8 s (máx. −50 %). Enfriamiento 25 s.' },
  { id: 'g_t_carga', name: 'Carga de Escudo', icon: '🐂', kind: 'talent', cat: 'movement', slots: ['k1'], tags: ['movement', 'melee', 'cc', 'physical'], elem: 'physical',
    type: 'dash', behavior: 'g_t_carga', req: 10, coef: 1.0, cd: 14, range: 8, radius: 1.9, stun: 1.5, lockT: 0.35, drag: true, color: 0x6699ff,
    desc: 'Cargas 8 m arrastrando a los enemigos que encuentras; al llegar haces 100 % del arma y los aturdes 1,5 s. Enfriamiento 14 s.' },
  // — Cruzado —
  { id: 'g_t_devocion', name: 'Aura de Devoción', icon: '✨', kind: 'talent', cat: 'spec', slots: ['k3'], tags: ['spec', 'aura', 'heal', 'ally', 'holy'], elem: 'holy',
    type: 'buff', behavior: 'g_t_devocion', req: 10, cd: 30, dur: 12, buff: { arm: 30 }, allyRadius: 15, healPctPerSec: 3, color: 0xffdd77,
    desc: 'Insignia del Cruzado: durante 12 s, tú y los aliados a 15 m recuperan un 3 % de vida por segundo y ganan +30 de armadura. Enfriamiento 30 s.' },
  { id: 'g_t_veredicto', name: 'Veredicto Final', icon: '⚖️', kind: 'talent', cat: 'spec', slots: ['rmb', 'k2', 'k3'], tags: ['spec', 'spender', 'cone', 'heal', 'holy'], elem: 'holy',
    type: 'cone', behavior: 'g_t_veredicto', req: 10, coef: 1.2, radius: 6, angle: 60, windup: 0.12, gaugeCost: 3, healDealtPct: 25, color: 0xffe08a,
    desc: 'Gastas 3 de Fervor en un golpe sagrado en cono de 60° y 6 m (preparación de 0,12 s): 120 % del arma; el grupo se cura el 25 % del daño hecho.' },
  { id: 'g_t_justicia', name: 'Martillo de Justicia', icon: '🔨', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'proj', 'cc', 'holy'], elem: 'holy',
    type: 'proj', req: 10, coef: 1.2, cd: 15, speed: 16, range: 12, stun: 3, bossStun: 1.5, stagger: 30, color: 0xffd36b,
    desc: 'Arrojas un martillo sagrado: 120 % del arma y aturde 3 s al objetivo (a los jefes, 1,5 s y +30 de stagger). Enfriamiento 15 s.' },
];

export const GUERRERO_TALENTS = {
  cls: {
    name: 'Guerrero',
    nodes: [
      { id: 'c1', name: 'Fuerza de Titán', icon: 'talents/guerrero-clase-c1.webp', t: 'p', r: 0, c: 1.5, max: 2, d: r => `+${x(4, r)}% de daño Físico.`, fx: { elem: { physical: 4 } } },
      { id: 'c2', name: 'Segundo Aliento', icon: 'talents/guerrero-clase-c2.webp', t: 'a', r: 1, c: 0.5, max: 1, req: ['c1'], d: 'Activa nueva: consumes toda tu Furia y te curas un 1% de vida por cada 3 de Furia gastada. Enfriamiento 30 s.', fx: { grant: 'g_t_aliento' } },
      { id: 'c3', name: 'Intervención', icon: 'talents/guerrero-clase-c3.webp', t: 'a', r: 1, c: 2.5, max: 1, req: ['c1'], d: 'Activa nueva: saltas hasta un aliado (o 8 m hacia el cursor) y ambos ganan un escudo del 15% de tu vida durante 6 s. Enfriamiento 20 s.', fx: { grant: 'g_t_intervencion' } },
      { id: 'c4', name: 'Piel Curtida', icon: 'talents/guerrero-clase-c4.webp', t: 'p', r: 2, c: 0, max: 3, req: ['c2'], d: r => `+${x(15, r)} de armadura.`, fx: { stats: { arm: 15 } } },
      { id: 'c5', name: 'Conmoción o Barrido', icon: 'talents/guerrero-clase-c5.webp', t: 'c', r: 2, c: 1.5, max: 1, req: ['c2', 'c3'], opts: [
        { k: 'A', name: 'Golpe Conmocionador', desc: 'Mandoble aturde 1 s y hace +20% de daño. Pensado para jefes y élites.', fx: { mod: { g_mandoble: { stun: 1, dmg: 20 } } } },
        { k: 'B', name: 'Barrido Amplio', desc: 'Embate gana +40% de radio y +15% de daño. Pensado para hordas.', fx: { mod: { g_embate: { radius: 40, dmg: 15 } } } } ] },
      { id: 'c6', name: 'Disciplina de Combate', icon: 'talents/guerrero-clase-c6.webp', t: 'p', r: 2, c: 3, max: 2, req: ['c3'], d: r => `Tus habilidades cuestan un ${x(6, r)}% menos de Furia.`, fx: { tv: { costRed: 6 } } },
      { id: 'c7', name: 'Desviar Golpes', icon: 'talents/guerrero-clase-c7.webp', t: 'p', r: 3, c: 0.5, max: 2, req: ['c4', 'c5'], d: r => `−${x(4, r)}% de daño recibido.`, fx: { tv: { dmgReduc: 4 } } },
      { id: 'c8', name: 'Golpes Rápidos', icon: 'talents/guerrero-clase-c8.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['c5', 'c6'], d: r => `+${x(5, r)}% de velocidad de ataque.`, fx: { stats: { aspdPct: 5 } } },
      { id: 'c9', name: 'Veterano', icon: 'talents/guerrero-clase-c9.webp', t: 'p', r: 4, c: 0, max: 2, req: ['c7'], d: r => `+${x(1, r)} ${pl(r, 'nivel', 'niveles')} a Torbellino, Martillo de Guerra y Hendidura.`, fx: { skillLv: { torbellino: 1, g_martillo: 1, g_hendidura: 1 } } },
      { id: 'c10', name: 'Sangre de Guerrero', icon: 'talents/guerrero-clase-c10.webp', t: 'p', r: 4, c: 1.5, max: 3, req: ['c7', 'c8'], d: r => `+${x(2, r)} de vida al golpear.`, fx: { stats: { lph: 2 } } },
      { id: 'c11', name: 'Avance Implacable', icon: 'talents/guerrero-clase-c11.webp', t: 'p', r: 4, c: 3, max: 2, req: ['c8'], d: r => `−${x(8, r)}% de enfriamiento de Embestida y Salto Devastador.`, fx: { mod: { embestida: { cdr: 8 }, g_salto: { cdr: 8 } } } },
      { id: 'c12', name: 'Bramido o Coraza', icon: 'talents/guerrero-clase-c12.webp', t: 'c', r: 5, c: 0.5, max: 1, req: ['c9', 'c10'], opts: [
        { k: 'A', name: 'Bramido de Guerra', desc: 'Activa: +15% de vida máxima para ti y tus aliados a 15 m durante 10 s.', active: true, fx: { grant: 'g_t_bramido' } },
        { k: 'B', name: 'Coraza de Hierro', desc: 'Al bajar del 30% de vida recibes −30% de daño durante 5 s. Una vez cada 60 s.', fx: { power: 'g_coraza_hierro' } } ] },
      { id: 'c13', name: 'Cazador de Campeones', icon: 'talents/guerrero-clase-c13.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['c10', 'c11'], d: r => `+${x(3, r)}% de daño contra élites y jefes.`, fx: { tv: { eliteDmg: 3 } } },
      { id: 'c14', name: 'Maestro de Armas', icon: 'talents/guerrero-clase-c14.webp', t: 'p', r: 6, c: 1.5, max: 1, req: ['c12', 'c13'], d: '+10% de daño crítico. Cada crítico te da 2 de Furia.', fx: { tv: { critDmg: 10 }, power: 'g_crit_furia' } },
      { id: 'c15', name: 'Hermandad de Armas', icon: 'talents/guerrero-clase-c15.webp', t: 'k', r: 7, c: 1.5, max: 1, req: ['c14'], d: 'Grupo: tú y los aliados a 15 m ganan +5% de daño y +8% de vida máxima. Generas un 5% más de Furia por cada aliado cerca (máx. 3).', fx: { power: 'g_aura_hermandad' } },
    ],
    preset: [['c1', 2], ['c2', 1], ['c3', 1], ['c5', 1, 'B'], ['c6', 2], ['c7', 2], ['c8', 2], ['c10', 3], ['c13', 2], ['c14', 1], ['c15', 1]],
  },
  specs: [
    {
      id: 'berserker', name: 'Berserker', role: 'dps', icon: 'specs/berserker.webp', emblem: 'emblems/berserker.webp',
      mechanic: 'sed', innate: {},
      desc: 'Furia desatada: cuanto menos vida te queda, más fuerte golpeas.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c5', 1, 'B'], ['c6', 2], ['c7', 2], ['c8', 2], ['c10', 3], ['c13', 2], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Sed de Batalla', icon: 'talents/guerrero-berserker-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): con menos del 40% de vida o con la Sed Saciada haces +25% de daño. Perder vida y desangrar enemigos llena tu Sed. Otorga la activa Remolino Sangriento: giras 2 s desangrando a todo lo que tocas (30 de Furia, enfriamiento 6 s).', fx: { power: 'm_berserk', grant: 'g_t_remolino' } },
        { id: 's1', name: 'Ira Creciente', icon: 'talents/guerrero-berserker-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(1, r)}% de daño Físico.`, fx: { elem: { physical: 1 } } },
        { id: 's2', name: 'Frenesí', icon: 'talents/guerrero-berserker-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `+${x(3, r)}% de velocidad de ataque.`, fx: { stats: { aspdPct: 3 } } },
        { id: 's3', name: 'Heridas Profundas', icon: 'talents/guerrero-berserker-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `Torbellino y Hendidura aplican Sangrado. +${x(15, r)}% de daño de Sangrado.`, fx: { mod: { torbellino: { dot: 'bleed' }, g_hendidura: { dot: 'bleed' } }, tv: { bleedPct: 15 } } },
        { id: 's4', name: 'Remolino Sediento', icon: 'talents/guerrero-berserker-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Cada golpe de Remolino Sangriento suma 2 de Sed (máx. 20 por uso).', fx: { power: 'g_remolino_sediento' } },
        { id: 's5', name: 'Instinto Asesino', icon: 'talents/guerrero-berserker-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(3, r)}% de probabilidad de crítico. Cada crítico suma 2 de Sed.`, fx: { stats: { crit: 3 }, power: 'g_instinto_asesino' } },
        { id: 's6', name: 'Carnicería o Duelista', icon: 'talents/guerrero-berserker-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Carnicería', desc: 'Remolino Sangriento: +10% de radio y el Sangrado salta a 1 cercano. Para hordas.', fx: { mod: { g_t_remolino: { radius: 10, chain: 1 } } } },
          { k: 'B', name: 'Duelista', desc: 'Mandoble deja al objetivo vulnerable 4 s (+20% de daño recibido). Para jefes.', fx: { mod: { g_mandoble: { vuln: 4 } } } } ] },
        { id: 's7', name: 'Golpe Salvaje', icon: 'talents/guerrero-berserker-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `+${x(12, r)}% de daño de Mandoble.`, fx: { mod: { g_mandoble: { dmg: 12 } } } },
        { id: 's8', name: 'Festín de Sangre', icon: 'talents/guerrero-berserker-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `Matar a un enemigo que sangra te cura un ${x(2, r)}% de vida.`, fx: { tv: { bleedKillHeal: 2 } } },
        { id: 's9', name: 'Temeridad', icon: 'talents/guerrero-berserker-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: durante 10 s ganas +25% de crítico y tu Sed se llena el doble de rápido, pero recibes +10% de daño. Enfriamiento 90 s.', fx: { grant: 'g_t_temeridad' } },
        { id: 's10', name: 'Arsenal Brutal', icon: 'talents/guerrero-berserker-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(10, r)}% de daño de Torbellino y Hendidura.`, fx: { mod: { torbellino: { dmg: 10 }, g_hendidura: { dmg: 10 } } } },
        { id: 's11', name: 'Umbral del Dolor', icon: 'talents/guerrero-berserker-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `−${x(13, r)}% de daño recibido. El dolor solo te enfurece más.`, fx: { tv: { dmgReduc: 13 } } },
        { id: 's12', name: 'Ritmo de Matanza', icon: 'talents/guerrero-berserker-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `−${x(12, r)}% de enfriamiento de Remolino Sangriento y Temeridad.`, fx: { mod: { g_t_remolino: { cdr: 12 }, g_t_temeridad: { cdr: 12 } } } },
        { id: 's13', name: 'Negación o Ira Ciega', icon: 'talents/guerrero-berserker-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Negación de la Muerte', desc: 'Una vez cada 2 minutos, un golpe letal te deja con 1 de vida y la Sed llena.', fx: { power: 'g_negacion' } },
          { k: 'B', name: 'Ira Ciega', desc: 'Activa: 6 s de +30% de daño e inmune a aturdimientos. Cuesta un 10% de vida.', active: true, fx: { grant: 'g_t_ira_ciega' } } ] },
        { id: 's14', name: 'Sangre Hirviente', icon: 'talents/guerrero-berserker-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Con la Sed llena entras en Desenfreno 8 s: +30% de velocidad de ataque y cada golpe te cura un 1% de vida.', fx: { power: 'g_desenfreno' } },
        { id: 's15', name: 'Sed Insaciable', icon: 'talents/guerrero-berserker-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(4, r)} de Furia cada vez que muere un enemigo que sangra.`, fx: { tv: { bleedKillMana: 4 } } },
        { id: 's16', name: 'Torbellino de Acero', icon: 'talents/guerrero-berserker-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `+${x(5, r)}% de radio y +${x(8, r)}% de daño de Torbellino; cuesta un ${x(10, r)}% menos de Furia y deja Vulnerables 4 s a los que golpea.`, fx: { mod: { torbellino: { radius: 5, dmg: 8, cost: -10, vuln: [4, 4] } } } },
        { id: 's17', name: 'Golpes Despiadados', icon: 'talents/guerrero-berserker-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `+${x(12, r)}% de daño crítico.`, fx: { tv: { critDmg: 12 } } },
        { id: 'x1', name: 'Ejecutar', icon: 'talents/guerrero-berserker-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: rematas al instante a los enemigos normales bajo el 6% de vida. Contra élites y jefes, +25% de daño bajo ese umbral.', fx: { tv: { executePct: 6, executeDmg: 25 } } },
        { id: 'x2', name: 'Carnicero', icon: 'talents/guerrero-berserker-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: cada remate suma ${x(15, r)} de Sed y te devuelve 5 de Furia.`, fx: { power: 'g_carnicero' } },
        { id: 'x3', name: 'Matanza Eterna', icon: 'talents/guerrero-berserker-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): rematar durante el Desenfreno lo alarga 2 s, sin límite.', fx: { power: 'g_matanza_eterna' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s6', 1, 'A'], ['s7', 2], ['s8', 2], ['s9', 1], ['s11', 2], ['s14', 1], ['s16', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'guardian', name: 'Guardián', role: 'tank', icon: 'specs/guardian.webp', emblem: 'emblems/guardian.webp',
      mechanic: 'bastion', innate: { block: 15, threatMult: 3, hpPct: 10 },
      desc: 'Muralla viviente: atrae a los enemigos y protege al grupo.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c4', 3], ['c5', 1, 'A'], ['c7', 2], ['c9', 2], ['c10', 3], ['c12', 1, 'A'], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Muro Inquebrantable', icon: 'talents/guerrero-guardian-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): un golpe letal te deja a 1 de vida e inmune 2 s (recarga 30 s). Bloquear golpes te da cargas de Bastión. Otorga la activa Grito Desafiante: provocas a todos los enemigos a 10 m durante 4 s (enfriamiento 12 s).', fx: { power: 'm_aegis', grant: 'g_t_desafio' } },
        { id: 's1', name: 'Baluarte', icon: 'talents/guerrero-guardian-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(10, r)} de armadura.`, fx: { stats: { arm: 10 } } },
        { id: 's2', name: 'Fortaleza', icon: 'talents/guerrero-guardian-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `+${x(40, r)} de vida máxima.`, fx: { stats: { hp: 40 } } },
        { id: 's3', name: 'Púas de Hierro', icon: 'talents/guerrero-guardian-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `+${x(10, r)} de daño de espinas.`, fx: { stats: { thorns: 10 } } },
        { id: 's4', name: 'Desafío Firme', icon: 'talents/guerrero-guardian-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Grito Desafiante te da 2 cargas de Bastión.', fx: { power: 'g_desafio_firme' } },
        { id: 's5', name: 'Guardia Alta', icon: 'talents/guerrero-guardian-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `−${x(1, r)}% de daño recibido.`, fx: { tv: { dmgReduc: 1 } } },
        { id: 's6', name: 'Cerco o Reto', icon: 'talents/guerrero-guardian-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Cerco', desc: 'Grito Desafiante: +50% de radio y ralentiza 3 s a los provocados. Para hordas.', fx: { mod: { g_t_desafio: { radius: 50, slow: 3 } } } },
          { k: 'B', name: 'Reto Singular', desc: 'Provocación marca a un enemigo: −20% de daño a tu grupo durante 8 s. Para jefes.', fx: { power: 'g_reto' } } ] },
        { id: 's7', name: 'Martillo Pesado', icon: 'talents/guerrero-guardian-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `+${x(15, r)}% de daño de Martillo de Guerra. Si golpea a 3 o más, suma 1 carga de Bastión.`, fx: { mod: { g_martillo: { dmg: 15 } }, power: 'g_martillo_pesado' } },
        { id: 's8', name: 'Recuperación', icon: 'talents/guerrero-guardian-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `Matar a un enemigo te cura un ${x(1.5, r)}% de vida.`, fx: { tv: { killHeal: 1.5 } } },
        { id: 's9', name: 'Muro de Escudos', icon: 'talents/guerrero-guardian-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: gastas todas tus cargas de Bastión y recibes −10% de daño por carga durante 8 s (máx. −50%). Enfriamiento 25 s.', fx: { grant: 'g_t_muro' } },
        { id: 's10', name: 'Sacudida', icon: 'talents/guerrero-guardian-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `+${x(10, r)}% de daño de Terremoto. Con 1 rango, aturde 1 s.`, fx: { mod: { terremoto: { dmg: 10, stun: [1, 1] } } } },
        { id: 's11', name: 'Coloso', icon: 'talents/guerrero-guardian-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `+${x(50, r)} de vida máxima y +${x(5, r)} de armadura.`, fx: { stats: { hp: 50, arm: 5 } } },
        { id: 's12', name: 'Réplica', icon: 'talents/guerrero-guardian-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `+${x(8, r)}% de daño de Tajo y Martillo de Guerra.`, fx: { mod: { g_tajo: { dmg: 8 }, g_martillo: { dmg: 8 } } } },
        { id: 's13', name: 'Juramento o Carga', icon: 'talents/guerrero-guardian-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Juramento del Escudo', desc: 'Muro Inquebrantable se recarga en 20 s en lugar de 30 s. Más seguro.', fx: { power: 'g_juramento' } },
          { k: 'B', name: 'Carga de Escudo', desc: 'Activa: cargas 8 m arrastrando enemigos y los aturdes 1.5 s. Enfriamiento 14 s.', active: true, fx: { grant: 'g_t_carga' } } ] },
        { id: 's14', name: 'Vínculo del Guardián', icon: 'talents/guerrero-guardian-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'Grupo: recibes tú el 20% del daño que sufren los aliados a 10 m, reducido por tu armadura.', fx: { power: 'g_vinculo' } },
        { id: 's15', name: 'Temple', icon: 'talents/guerrero-guardian-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `−${x(4, r)}% de enfriamiento de todas tus habilidades.`, fx: { stats: { cdr: 4 } } },
        { id: 's16', name: 'Erizo', icon: 'talents/guerrero-guardian-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `+${x(15, r)} de daño de espinas.`, fx: { stats: { thorns: 15 } } },
        { id: 's17', name: 'Muralla Viviente', icon: 'talents/guerrero-guardian-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `Cada carga de Bastión te da −${x(1, r)}% de daño recibido.`, fx: { power: 'g_muralla_viva' } },
        { id: 'x1', name: 'Represalia', icon: 'talents/guerrero-guardian-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: tus espinas reflejan además el 30% del daño que bloqueas o absorbes con Muro de Escudos.', fx: { power: 'g_represalia' } },
        { id: 'x2', name: 'Venganza Acumulada', icon: 'talents/guerrero-guardian-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: al terminar Muro de Escudos, una onda devuelve el ${x(20, r)}% del daño absorbido.`, fx: { power: 'g_venganza' } },
        { id: 'x3', name: 'Bastión Eterno', icon: 'talents/guerrero-guardian-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): con 5 cargas, Muro Inquebrantable protege también a los aliados a 10 m (una vez cada 60 s).', fx: { power: 'g_bastion_eterno' } },
      ],
      preset: [['s1', 3], ['s2', 2], ['s4', 1], ['s5', 1], ['s6', 1, 'A'], ['s8', 2], ['s9', 1], ['s11', 2], ['s13', 1, 'B'], ['s14', 1], ['s17', 2], ['x1', 1], ['x2', 1]],
    },
    {
      id: 'cruzado', name: 'Cruzado', role: 'support', icon: 'specs/cruzado.webp', emblem: 'emblems/cruzado.webp',
      mechanic: 'fervor', innate: { healPct: 15 },
      desc: 'Luz sagrada: castiga a los caídos y sostiene a tus aliados.',
      // preset de clase propio de esta especialización (RECOMMENDED.cls del mockup)
      clsPreset: [['c1', 2], ['c2', 1], ['c3', 1], ['c5', 1, 'A'], ['c6', 2], ['c7', 2], ['c8', 2], ['c10', 3], ['c11', 1], ['c12', 1, 'A'], ['c14', 1], ['c15', 1]],
      nodes: [
        { id: 's0', name: 'Juicio', icon: 'talents/guerrero-cruzado-s0.webp', t: 'k', r: 0, c: 1.5, max: 1, free: true, d: 'Nodo clave (gratis): al matar, una onda sagrada daña a los enemigos cercanos y te da 1 de Fervor. Otorga la activa Aura de Devoción: durante 12 s, tú y los aliados a 15 m recuperan un 3% de vida por segundo y ganan +30 de armadura (enfriamiento 30 s).', fx: { power: 'm_judgment', grant: 'g_t_devocion' } },
        { id: 's1', name: 'Fe Ardiente', icon: 'talents/guerrero-cruzado-s1.webp', t: 'p', r: 1, c: 0.5, max: 3, req: ['s0'], d: r => `+${x(5, r)}% de daño Sagrado (Juicio, Veredicto Final, Cataclismo y Martillos Benditos).`, fx: { elem: { holy: 5 } } },
        { id: 's2', name: 'Plegaria', icon: 'talents/guerrero-cruzado-s2.webp', t: 'p', r: 1, c: 2.5, max: 2, req: ['s0'], d: r => `−${x(4, r)}% de enfriamiento de todas tus habilidades.`, fx: { stats: { cdr: 4 } } },
        { id: 's3', name: 'Mano Sanadora', icon: 'talents/guerrero-cruzado-s3.webp', t: 'p', r: 2, c: 0, max: 2, req: ['s1'], d: r => `+${x(2, r)} de vida al golpear. Los aliados a 10 m reciben la mitad.`, fx: { stats: { lph: 2 }, power: 'g_mano_sanadora' } },
        { id: 's4', name: 'Devoción Ferviente', icon: 'talents/guerrero-cruzado-s4.webp', t: 'p', r: 2, c: 1.5, max: 1, req: ['s1', 's2'], d: 'Aura de Devoción te da 1 de Fervor al lanzarla y cura un 10% más.', fx: { power: 'g_devocion_ferviente' } },
        { id: 's5', name: 'Celo', icon: 'talents/guerrero-cruzado-s5.webp', t: 'p', r: 2, c: 3, max: 3, req: ['s2'], d: r => `+${x(2, r)}% de probabilidad de crítico.`, fx: { stats: { crit: 2 } } },
        { id: 's6', name: 'Consagración o Sentencia', icon: 'talents/guerrero-cruzado-s6.webp', t: 'c', r: 3, c: 0.5, max: 1, req: ['s3', 's4'], opts: [
          { k: 'A', name: 'Consagración', desc: 'Martillo de Guerra deja suelo sagrado 1 s: daña enemigos y cura aliados (la cura no se apila: cada Martillo la renueva).', fx: { mod: { g_martillo: { zone: 1, zoneDur: 1 } }, power: 'g_consagracion' } },
          { k: 'B', name: 'Sentencia', desc: 'Juicio marca a élites y jefes: reciben +20% de daño de todo el grupo durante 4 s.', fx: { power: 'g_sentencia' } } ] },
        { id: 's7', name: 'Martillo Justiciero', icon: 'talents/guerrero-cruzado-s7.webp', t: 'p', r: 3, c: 2.5, max: 2, req: ['s4', 's5'], d: r => `+${x(10, r)}% de radio de Martillo de Guerra.`, fx: { mod: { g_martillo: { radius: 10 } } } },
        { id: 's8', name: 'Luz Sanadora', icon: 'talents/guerrero-cruzado-s8.webp', t: 'p', r: 4, c: 0, max: 2, req: ['s6'], d: r => `Matar a un enemigo cura un ${x(1.5, r)}% de vida a ti y a los aliados a 10 m.`, fx: { tv: { killHeal: 1.5 }, power: 'g_luz_sanadora' } },
        { id: 's9', name: 'Veredicto Final', icon: 'talents/guerrero-cruzado-s9.webp', t: 'a', r: 4, c: 1.5, max: 1, req: ['s6', 's7'], d: 'Activa nueva: gastas 3 de Fervor en un golpe sagrado en cono del 120% que cura al grupo un 25% del daño hecho.', fx: { grant: 'g_t_veredicto' } },
        { id: 's10', name: 'Estandarte Sagrado', icon: 'talents/guerrero-cruzado-s10.webp', t: 'p', r: 4, c: 3, max: 2, req: ['s7'], d: r => `Estandarte de Guerra dura un ${x(20, r)}% más y su bonificación alcanza a los aliados a 15 m.`, fx: { mod: { g_u_estandarte: { dur: 20 } }, power: 'g_estandarte_grupo' } },
        { id: 's11', name: 'Égida Sagrada', icon: 'talents/guerrero-cruzado-s11.webp', t: 'p', r: 5, c: 0.5, max: 2, req: ['s8', 's9'], d: r => `+${x(25, r)} de armadura y +${x(6, r)} de espinas.`, fx: { stats: { arm: 25, thorns: 6 } } },
        { id: 's12', name: 'Fervor Creciente', icon: 'talents/guerrero-cruzado-s12.webp', t: 'p', r: 5, c: 2.5, max: 2, req: ['s9', 's10'], d: r => `Martillo de Guerra tiene un ${x(8, r)}% de probabilidad de darte 1 de Fervor extra.`, fx: { tv: { fervorChance: 8 } } },
        { id: 's13', name: 'Intercesión o Justicia', icon: 'talents/guerrero-cruzado-s13.webp', t: 'c', r: 6, c: 0, max: 1, req: ['s11'], opts: [
          { k: 'A', name: 'Intercesión', desc: 'Cada 90 s, un aliado que iba a morir queda a 1 de vida; tú pierdes un 20% de vida.', fx: { power: 'g_intercesion' } },
          { k: 'B', name: 'Martillo de Justicia', desc: 'Activa: arrojas un martillo que aturde 3 s a un enemigo (1.5 s a jefes).', active: true, fx: { grant: 'g_t_justicia' } } ] },
        { id: 's14', name: 'Luz del Alba', icon: 'talents/guerrero-cruzado-s14.webp', t: 'k', r: 6, c: 1.5, max: 1, req: ['s11', 's12'], d: 'El Aura de Devoción también da +25% de daño a tus aliados (+10% a ti), y cada Fervor gastado la alarga 1 s.', fx: { power: 'g_luz_alba' } },
        { id: 's15', name: 'Devoción', icon: 'talents/guerrero-cruzado-s15.webp', t: 'p', r: 6, c: 3, max: 2, req: ['s12'], d: r => `+${x(35, r)} de vida máxima.`, fx: { stats: { hp: 35 } } },
        { id: 's16', name: 'Ira Divina', icon: 'talents/guerrero-cruzado-s16.webp', t: 'p', r: 7, c: 1, max: 2, req: ['s13', 's14'], d: r => `+${x(15, r)}% de daño de Cataclismo y Veredicto Final.`, fx: { mod: { g_u_cataclismo: { dmg: 15 }, g_t_veredicto: { dmg: 15 } } } },
        { id: 's17', name: 'Gracia', icon: 'talents/guerrero-cruzado-s17.webp', t: 'p', r: 7, c: 2, max: 2, req: ['s14', 's15'], d: r => `Veredicto Final cura un ${x(10, r)}% más del daño hecho.`, fx: { tv: { verdictHeal: 10 } } },
        { id: 'x1', name: 'Martillo Bendito', icon: 'talents/guerrero-cruzado-x1.webp', t: 'x', r: 8, c: 0.5, max: 1, req: ['s16', 's17'], d: 'Apex I: 3 martillos sagrados orbitan a tu alrededor. Cada golpe cura un 1% de vida a los aliados a 15 m.', fx: { power: 'g_martillo_bendito' } },
        { id: 'x2', name: 'Martillos del Juicio', icon: 'talents/guerrero-cruzado-x2.webp', t: 'x', r: 8, c: 1.5, max: 2, req: ['x1'], d: r => `Apex II: +${r} ${pl(r, 'martillo', 'martillos')} y +${x(15, r)}% de daño de los Martillos Benditos.`, fx: { power: 'g_martillos_juicio' } },
        { id: 'x3', name: 'Ascensión', icon: 'talents/guerrero-cruzado-x3.webp', t: 'x', r: 8, c: 2.5, max: 1, req: ['x2'], d: 'Apex III (cúspide): tras 3 Veredictos seguidos, 10 s de alas de luz: el Fervor no se gasta y el Aura cubre 30 m.', fx: { power: 'g_ascension' } },
      ],
      preset: [['s1', 1], ['s2', 2], ['s4', 1], ['s5', 2], ['s6', 1, 'A'], ['s7', 2], ['s9', 1], ['s10', 2], ['s12', 2], ['s14', 1], ['s17', 2], ['x1', 1], ['x2', 1]],
    },
  ],
  skills: GUERRERO_TALENT_SKILLS,
};
