// ============================================================
// Catálogo de habilidades de la ARQUERA (Energía) — catálogo 2g (Paso 2, KA1)
// ============================================================
// docs/paso2g-arquera.md §5 (kit base), §6–§8 (kits por especialización), §9 (activas de
// talento) y docs/paso2-implementacion.md §3.5–§3.6 (formato y verbos). 23 habilidades:
//   · kit base (Nv1–8): Disparo Rápido, Flecha Perforante, Paso Veloz, Bomba de Humo y
//     Lluvia de Flechas;
//   · kit de cada especialización (`spec`; insignia Nv10, movilidad o utilidad Nv12,
//     principal Nv14 y definitiva Nv15): Tiradora (relanzar, mantener, zona que te sigue),
//     Francotiradora (tensar con ventana dorada, postura, Punto Débil) y Montaraz
//     (trampas que atraen, saltar a tu trampa, detonar);
//   · 6 activas de talento (kind 'talent', solo la ranura 2; las conceden los nodos c11A,
//     c17A, c22A y los árboles héroe q4A, w4A, y4A).
// Retiradas (§11.1): Disparo Disperso y Flecha de Cicuta (variantes de Disparo Rápido), Red
// de Caza (variante de Trampa de Cepo) y las activas v1 de los árboles (Voltereta,
// Conmoción, Silenciadora, Visión Certera, Disuasorio, Arpón, Señuelo, Danza y Salto).
//
// Convención de `coef`: coeficiente POR IMPACTO (rollDamage/dealArea). Las de varios
// impactos declaran cuántos (`count` flechas, `waves` oleadas); las zonas, WD por segundo.
// Energía: pozo de 60, +6/s, los básicos +5 al ACERTAR; las principales no tienen
// enfriamiento salvo la Lluvia (4 s). Las definitivas no bajan del 70 % de su recarga
// (cdFloor, suelo común de la ronda 3).
//
// Este archivo solo importa js/skill-defs.js (sin ciclos). Los comportamientos usan los
// métodos de Game (dealArea, fireProjectile, spawnField, clampWalkable, timers…) y las
// primitivas de Player/Enemy (addBuff, applyCC, applyWeakness, weakenOutgoing,
// addStagger); nunca setTimeout ni p.cds (D2: las cargas y recargas son del motor).
import { projFanOffset } from './skill-defs.js';

export const ARQUERA_SKILLS = [
  // ---------------- KIT BASE ----------------
  { id: 'a_disparo', name: 'Disparo Rápido', icon: '🏹', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'physical'], elem: 'physical',
    type: 'weapon', req: 1, coef: 1.0, gen: 5,
    line: 'Dispara una flecha veloz (100 % del arma). Cada acierto te devuelve 5 de Energía.',
    desc: 'Dispara una flecha veloz con el 100 % del daño del arma. Cada acierto te devuelve 5 de Energía.' },
  { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 2, coef: 2.4, cost: 26, speed: 17, range: 13, pierce: true, lockT: 0.35, color: 0xffffcc,
    line: 'Una flecha pesada (240 %) que atraviesa a todos los enemigos en línea. Cuesta 26 de Energía.',
    desc: 'Una flecha pesada (240 % del arma) que atraviesa a todos los enemigos en línea. 26 de Energía, sin recarga.' },
  { id: 'a_paso', name: 'Paso Veloz', icon: '👣', cat: 'movement', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical',
    behavior: 'a_paso', req: 4, cd: 9, range: 6, rollT: 0.2, lockT: 0.2, dur: 3, buff: { aspdPct: 20 }, color: 0xe2d8bc,
    line: 'Ruedas 6 m hacia donde te mueves y ganas +20 % de velocidad de ataque durante 3 s.',
    desc: 'Ruedas 6 m hacia donde te mueves (o hacia el cursor) y ganas +20 % de velocidad de ataque 3 s. Se recarga en 9 s.' },
  { id: 'a_humo', name: 'Bomba de Humo', icon: '💨', cat: 'defense', slots: ['k2'], tags: ['defense', 'zone', 'physical'], elem: 'physical',
    type: 'zone', behavior: 'a_humo', at: 'self', req: 6, cd: 16, cdOnEnd: true, radius: 4, dur: 8, allyDr: 50, projMissPct: 50, blindPct: 30, color: 0x9aa0a8,
    line: 'Nube de 4 m durante 8 s: dentro recibes un 50 % menos de daño y los cegados pegan un 30 % menos. Recarga al disiparse.',
    desc: 'Una nube de 4 m a tus pies durante 8 s: dentro recibes un 50 % menos de daño, la mitad de los proyectiles enemigos se pierden y los enemigos, cegados, pegan un 30 % menos. Se recarga en 16 s desde que se disipa.' },
  { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'physical'], elem: 'physical',
    behavior: 'a_lluvia', at: 'target', req: 8, coef: 0.6, waves: 4, span: 1.2, cost: 30, cd: 4, radius: 3, range: 11, impactDelay: 0.3, color: 0xaaffaa,
    line: 'Tras 0,3 s de aviso, caen 4 oleadas de flechas en un círculo de 3 m (60 % cada una).',
    desc: 'Tras 0,3 s de aviso, 4 oleadas de flechas caen en 1,5 s sobre un círculo de 3 m (60 % del arma cada una). 30 de Energía, se recarga en 4 s.' },

  // ---------------- TIRADORA VELOZ (moverse disparando) ----------------
  // Andanada: salto hacia atrás disparando; en 2 s, otra pulsación salta adelante y repite
  { id: 'a_t_andanada', name: 'Andanada', icon: '🎇', cat: 'spec', spec: 'tiradora', slots: ['k3'], tags: ['spec', 'proj', 'area', 'physical'], elem: 'physical',
    behavior: 'a_andanada', req: 10, coef: 0.45, cost: 25, cd: 8, count: 10, spread: 1.047, speed: 18, range: 10, jump: 4, airT: 0.3, lockT: 0.35,
    recast: { n: 2, win: 2, cdFrom: 'first' }, color: 0x66d7c7,
    line: 'Saltas 4 m atrás y disparas 10 flechas en 120° (45 % cada una). En 2 s, pulsa otra vez: saltas adelante y repites.',
    desc: 'Saltas 4 m hacia atrás y disparas 10 flechas en un abanico de 120° (45 % del arma cada una). Durante 2 s puedes pulsar otra vez: saltas 4 m hacia delante y repites. 25 de Energía, se recarga en 8 s.' },
  // Carrera del Viento: mantener para correr más rápido mientras disparas sola
  { id: 'a_v_carrera', name: 'Carrera del Viento', icon: '🌬️', cat: 'movement', spec: 'tiradora', slots: ['k1'], tags: ['movement', 'channel', 'proj', 'physical'], elem: 'physical',
    type: 'channel', req: 12, coef: 0.45, cd: 10, dur: 4, ticks: 20, hold: true, moveMul: 1.4,
    autoShot: { every: 0.4, coef: 0.45, target: 'nearest', range: 10 }, color: 0x9fe8ff,
    line: 'Mantén pulsado: corres un 40 % más rápido hasta 4 s y disparas sola al enemigo más cercano cada 0,4 s (45 %).',
    desc: 'Mientras la mantienes (hasta 4 s) corres un 40 % más rápido y disparas sola al enemigo más cercano cada 0,4 s (45 % del arma). Esquivar la corta. Se recarga en 10 s.' },
  { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', cat: 'spender', spec: 'tiradora', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical',
    type: 'proj', req: 14, coef: 0.45, cost: 22, speed: 15, range: 10, count: 5, spread: 0.436, lockT: 0.35, color: 0xccddaa,
    line: 'Disparas 5 flechas en un abanico de 50° (45 % cada una). No te frena: úsala corriendo.',
    desc: 'Disparas 5 flechas en un abanico de 50° (45 % del arma cada una) sin frenarte. 22 de Energía, sin recarga.' },
  // Diluvio de Saetas: la nube te sigue (follow 'owner') y descarga cada 0,5 s
  { id: 'a_u_diluvio', name: 'Diluvio de Saetas', icon: '🌠', cat: 'ultimate', spec: 'tiradora', slots: ['k4'], tags: ['ultimate', 'area', 'physical'], elem: 'physical',
    behavior: 'a_diluvio', at: 'self', follow: 'owner', req: 15, coef: 1.7, waves: 12, span: 5.5, impactDelay: 0.5, radius: 4, cd: 50, cdFloor: 0.7, shake: 0.12, color: 0xbfffbf,
    line: 'Una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % por oleada).',
    desc: 'Definitiva: una nube de saetas te sigue 6 s y cada 0,5 s descarga en 4 m a tu alrededor (170 % del arma por oleada, 12 oleadas). Se recarga en 50 s.' },

  // ---------------- FRANCOTIRADORA (tensar y soltar con ventana dorada) ----------------
  { id: 'a_t_apuntado', name: 'Disparo Apuntado', icon: '🎯', cat: 'spec', spec: 'francotiradora', slots: ['k3'], tags: ['spec', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 10, coef: 2.5, cost: 30, cd: 4, speed: 30, range: 16, pierce: true, beam: true, size: 0.16, lockT: 0.2, color: 0xfff1a8,
    charge: { min: 0.3, max: 1.5, perfect: [1.15, 1.35], perfectPct: 50, perfectCrit: true, scale: { coef: [0.8, 2.5] }, moveMul: 0.6 },
    line: 'Mantén para tensar hasta 1,5 s y suelta: de 80 a 250 % y atraviesa. En la ventana dorada, +50 % y crítico.',
    desc: 'Mantén para tensar hasta 1,5 s y suelta: una saeta que atraviesa la línea con del 80 al 250 % del arma. Soltar en la ventana dorada (1,15–1,35 s) da +50 % y crítico seguro. Tensando vas al 60 % de velocidad; rodar cancela sin coste. 30 de Energía, se recarga en 4 s.' },
  // Rodilla en Tierra: postura de un modo (pulsa otra vez o rueda para levantarte)
  { id: 'a_f_rodilla', name: 'Rodilla en Tierra', icon: '🧎', cat: 'utility', spec: 'francotiradora', slots: ['k2'], tags: ['utility', 'physical'], elem: 'physical',
    type: 'stance', req: 12, cd: 14, dur: 8, color: 0xffd966,
    stance: { modes: [{ id: 'rodilla', name: 'De rodillas', stats: {}, moveMul: 0.5, chargeSpeed: 40, keepGauge: 'concentracion', color: 0xffd966 }], endOnDodge: true, recastEnds: true },
    line: 'Postura 8 s: Disparo Apuntado y los haces se tensan un 40 % más rápido y moverte no gasta Concentración (vas al 50 %).',
    desc: 'Postura durante 8 s: Disparo Apuntado y los haces de Tiro Celestial se tensan un 40 % más rápido y moverte no gasta Concentración, pero vas un 50 % más lenta. Pulsa otra vez o rueda para levantarte. Se recarga en 14 s.' },
  // Tiro Rastreador: abre el Punto Débil (mark.firstCharged: el primer tensado contra él es perfecto)
  { id: 'a_f_rastreador', name: 'Tiro Rastreador', icon: '🔍', cat: 'spender', spec: 'francotiradora', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'mark', 'physical'], elem: 'physical',
    type: 'proj', req: 14, coef: 1.4, cost: 20, speed: 22, range: 13, lockT: 0.3, color: 0xff9a4a,
    mark: { id: 'a_punto_debil', dur: 8, uses: 1, firstCharged: 30 },
    line: 'Una flecha (140 %) que abre un Punto Débil 8 s: tu primer tensado contra él es perfecto y +30 % (uno cada 8 s).',
    desc: 'Una flecha (140 % del arma) que abre un Punto Débil durante 8 s: tu primer disparo tensado contra él sale perfecto y con +30 %. 20 de Energía, sin recarga.' },
  // Tiro Celestial: hasta 3 haces en 8 s (relanzar) y cada uno se tensa (cargar)
  { id: 'a_u_celeste', name: 'Tiro Celestial', icon: '🌌', cat: 'ultimate', spec: 'francotiradora', slots: ['k4'], tags: ['ultimate', 'proj', 'physical'], elem: 'physical',
    type: 'proj', req: 15, coef: 4.0, cd: 50, cdFloor: 0.7, speed: 30, range: 16, pierce: true, beam: true, size: 0.18, color: 0x9fd8ff,
    recast: { n: 3, win: 8, cdFrom: 'first' },
    charge: { min: 0.3, max: 0.8, perfect: [0.5, 0.75], perfectPct: 50, perfectCrit: true, scale: { coef: [2.0, 4.0] }, moveMul: 0.6 },
    line: 'Durante 8 s tensas hasta 3 haces celestes (0,8 s cada uno): 400 % y atraviesan. Perfecto: +50 % y crítico.',
    desc: 'Definitiva: durante 8 s tensas y sueltas hasta 3 haces celestes (0,8 s cada uno) que atraviesan con hasta el 400 % del arma. Soltar en la ventana dorada da +50 % y crítico seguro. Se recarga en 50 s desde el primero.' },

  // ---------------- MONTARAZ (colocar trampas y detonarlas) ----------------
  // Trampa de Cepo: trampa genérica (se arma en 0,5 s, hasta 3, 30 s de vida) con 2 cargas
  { id: 'a_t_cepo', name: 'Trampa de Cepo', icon: '🪤', cat: 'spec', spec: 'montaraz', slots: ['k3'], tags: ['spec', 'trap', 'cc', 'dot', 'nature'], elem: 'nature',
    type: 'trap', req: 10, coef: 0.6, cost: 10, cd: 8, charges: 2, range: 9, dur: 30, root: 2, color: 0x86d47a,
    hitDot: { kind: 'poison', coef: 0.6, dur: 5 },
    trap: { armT: 0.5, maxArmed: 3, radius: 1.5, lure: { radius: 6, eliteRadius: 3, boss: false, speedMul: 0.8 } },
    line: 'Colocas un cepo (hasta 3; se arma en 0,5 s): inmoviliza 2 s y envenena (60 % en 5 s; se renueva, no se suma). 2 cargas.',
    desc: 'Colocas un cepo a hasta 9 m (hasta 3 a la vez; se arma en 0,5 s y dura 30 s): atrae a los enemigos cercanos y, al pisarlo, inmoviliza 2 s y envenena con el 60 % del arma. 2 cargas (8 s cada una); 10 de Energía.' },
  // Salto de Acecho: salto a tu trampa más cercana a la mira (at 'ownField') que la hace estallar al caer
  { id: 'a_m_acecho', name: 'Salto de Acecho', icon: '🐾', cat: 'movement', spec: 'montaraz', slots: ['k1'], tags: ['movement', 'physical'], elem: 'physical',
    type: 'leap', req: 12, cd: 10, cdFloor: 0.5, range: 15, at: 'ownField', fieldKind: 'trampa', fallbackRange: 6, radius: 2, airT: 0.45, shake: 0.2,
    detonate: { radius: 2, coef: 1, perTarget: 2 }, color: 0xb6e07a,
    line: 'Saltas a tu trampa más cercana al cursor (hasta 15 m) y la haces estallar al llegar (100 %). Sin trampas, 6 m.',
    desc: 'Saltas a tu trampa más cercana al cursor (hasta 15 m) y la haces estallar al caer (100 % del arma). Sin trampas a tu alcance, saltas 6 m. Se recarga en 10 s.' },
  // Flecha Detonante: estalla al impactar y hace estallar tus trampas que alcanza (detonate)
  { id: 'a_m_detonante', name: 'Flecha Detonante', icon: '💥', cat: 'spender', spec: 'montaraz', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'physical'], elem: 'physical',
    type: 'proj', req: 14, coef: 0.8, cost: 24, speed: 22, range: 12, splash: 0.8, radius: 3, lockT: 0.35,
    detonate: { radius: 3, coef: 1, perTarget: 2 }, color: 0xffa040,
    line: 'Estalla en 3 m (80 %) y hace estallar tus trampas que alcanza (100 % cada una; como mucho 2 por enemigo).',
    desc: 'Una flecha que estalla en 3 m al impactar (80 % del arma) y hace estallar las trampas tuyas que alcanza (100 % cada una; como mucho 2 estallidos por enemigo). 24 de Energía, sin recarga.' },
  // Cerco de Zarzas: anillo donde apuntas; cruzarlo inmoviliza, dentro veneno y al cerrarse estalla
  { id: 'a_u_zarzas', name: 'Cerco de Zarzas', icon: '🌵', cat: 'ultimate', spec: 'montaraz', slots: ['k4'], tags: ['ultimate', 'zone', 'cc', 'dot', 'nature'], elem: 'nature',
    behavior: 'a_zarzas', at: 'target', req: 15, coef: 1.0, cd: 45, cdFloor: 0.7, range: 12, radius: 7, dur: 8, root: 1.5, endMul: 3, shake: 0.3, color: 0x5a8a3a,
    line: 'Anillo de zarzas de 7 m, 8 s: cruzarlo inmoviliza 1,5 s; dentro, veneno (100 % por segundo); al cerrarse, 300 %.',
    desc: 'Definitiva: un anillo de zarzas de 7 m donde apuntas durante 8 s. Cruzarlo inmoviliza 1,5 s; dentro, veneno del 100 % del arma por segundo; al cerrarse estalla (300 %). Se recarga en 45 s.' },

  // ---------------- ACTIVAS DE TALENTO (solo la ranura 2) ----------------
  // Camuflaje (c11A): el comportamiento y el crítico al salir son del árbol (powers-arquera.js)
  { id: 'a_t_camuflaje', name: 'Camuflaje', icon: '🍃', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'physical'], elem: 'physical',
    behavior: 'a_t_camuflaje', req: 21, cd: 20, dur: 4, color: 0x8fbf7a,
    line: 'Te vuelves invisible 4 s, los enemigos te pierden y Paso Veloz se recarga; tu primer disparo al salir es crítico.',
    desc: 'Te vuelves invisible 4 s: los enemigos te pierden, Paso Veloz se recarga y tu primer disparo al salir es crítico seguro. Se recarga en 20 s.' },
  // Agilidad (c17A): deja la ranura 1 y pasa a activa de talento
  { id: 'agilidad', name: 'Agilidad', icon: '🌪️', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 27, cd: 16, dur: 6, buff: { spdPct: 30, aspdPct: 15 }, slowImmune: true, color: 0x9af06a,
    line: 'Durante 6 s: +30 % de velocidad, +15 % de velocidad de ataque e inmunidad a las ralentizaciones.',
    desc: 'Durante 6 s: +30 % de velocidad de movimiento, +15 % de velocidad de ataque e inmunidad a las ralentizaciones. Se recarga en 16 s.' },
  // Flecha Bengala (c22A): dentro, Debilidad (+15 % de daño recibido) y −15 % de daño de los enemigos
  { id: 'a_t_bengala', name: 'Flecha Bengala', icon: '🎆', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'zone', 'ally', 'physical'], elem: 'physical',
    behavior: 'a_bengala', at: 'target', req: 31, cd: 20, radius: 10, dur: 10, range: 12, weakPct: 15, weakenPct: 15, color: 0xffcc55,
    line: 'Una bengala de 10 m durante 10 s: dentro, los enemigos reciben un 15 % más de daño del grupo y pegan un 15 % menos.',
    desc: 'Lanzas una bengala a hasta 12 m que ilumina 10 m durante 10 s: los enemigos dentro reciben un 15 % más de daño de todo el grupo y pegan un 15 % menos. Se recarga en 20 s.' },
  // Torbellino (árbol héroe Errante del Viento, q4A): las 3 Ráfagas las da su poder de árbol
  { id: 'a_h_torbellino', name: 'Torbellino', icon: '🌀', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'area', 'cc', 'physical'], elem: 'physical',
    behavior: 'a_torbellino', req: 72, cd: 40, radius: 4, stun: 1.5, shake: 0.2, color: 0xbfe8ff,
    line: 'Un torbellino de 4 m levanta 1,5 s a los enemigos y te da 3 Ráfagas.',
    desc: 'Un torbellino de 4 m a tu alrededor levanta 1,5 s a los enemigos (a un jefe le llena Quebranto) y te da 3 Ráfagas. Se recarga en 40 s.' },
  // Desborde de Puntas (árbol héroe Carcaj Encantado, w4A): estado de 4 disparos que lee su poder de árbol
  { id: 'a_h_puntas', name: 'Desborde de Puntas', icon: '✴️', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'buff', 'physical'], elem: 'physical',
    type: 'buff', req: 72, cd: 20, dur: 10, count: 4, buff: {}, color: 0xffd27a,
    line: 'Tus 4 siguientes disparos llevan las tres puntas encantadas a la vez, al 50 % (sin Trenza ni Punta Repartida).',
    desc: 'Tus 4 siguientes disparos (en 10 s) llevan las tres puntas encantadas a la vez, al 50 %, sin Trenza de Puntas ni Punta Repartida. Se recarga en 20 s.' },
  // Llamada del Halcón (árbol héroe Halconera, y4A)
  { id: 'a_h_halcon', name: 'Llamada del Halcón', icon: '🦅', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'cc', 'physical'], elem: 'physical',
    behavior: 'a_halcon', req: 72, coef: 0.4, cd: 30, range: 15, dur: 6, every: 0.5, blindPct: 30, staggerOnce: 30, color: 0xd8b070,
    line: 'El halcón ataca a tu blanco 6 s sin parar (40 % cada 0,5 s), lo deja ciego y le llena 30 de Quebranto.',
    desc: 'Tu halcón ataca a tu blanco durante 6 s (40 % del arma cada 0,5 s): lo deja ciego (pega un 30 % menos) y a un jefe le llena 30 de Quebranto. Si muere, busca al enemigo más cercano. Se recarga en 30 s.' },
];

// @deprecated catálogo v1: las ramas 3 × 3 desaparecen con la forja (2f). data.js aún lo
// importa (y no lo usa): queda vacío hasta que W2 retire la importación.
export const ARQUERA_SKILL_MODS = {};

// ------------------------------------------------------------
// utilidades de los comportamientos (solo métodos de Game / primitivas)
// ------------------------------------------------------------
const inCircle = (pos, c, r) => {
  const dx = pos.x - c.x, dz = pos.z - c.z;
  return dx * dx + dz * dz <= r * r;
};
// radio efectivo contra un enemigo (su tamaño cuenta, como dealArea)
const reach = (e, r) => r + 0.5 * (e.def?.scale || 1);
// dirección unitaria hacia la mira (encima del héroe: hacia donde mira)
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) { dx = Math.sin(p.group?.rotation?.y || 0); dz = Math.cos(p.group?.rotation?.y || 0); return { x: dx, z: dz }; }
  return { x: dx / l, z: dz / l };
}
// pulso cada `every` s mientras el campo viva (sigue su posición: un campo con follow se mueve)
function pulseField(g, f, every, fn) {
  if (!f) return;
  const step = () => {
    if (f.dead) return;
    fn(f);
    g.timers.schedule(every, step);
  };
  step();
}

// Lluvia por oleadas: aviso de impactDelay s y `waves` oleadas repartidas en `span` s, cada una
// con dealArea. El centro queda fijo (at self/target) o te sigue (follow 'owner') o sigue la
// mira (follow 'aim'). Un poder puede cambiar la cadencia con prof.waves / prof.span /
// prof.follow (modifyResolve): se leen antes que los de la definición.
function rain(g, p, prof, cast) {
  const { ctx, sk } = cast;
  const follow = prof.follow ?? sk.follow ?? null;
  const fixed = (sk.at === 'self' ? p.pos : (cast.target || p.pos)).clone(); fixed.y = 0;
  const centerNow = () => {
    if (follow === 'owner') return p.pos.clone().setY(0);
    if (follow === 'aim' && g.input?.mouseWorld) return g.input.mouseWorld.clone().setY(0);
    return fixed;
  };
  const rad = prof.radius || sk.radius || 3;
  const waves = Math.max(1, Math.round(prof.waves ?? sk.waves ?? 1));
  const span = Math.max(0, prof.span ?? sk.span ?? 1);
  const step = waves > 1 ? span / (waves - 1) : 0;
  const color = ctx.color || sk.color || 0xaaffaa;
  const c0 = centerNow();
  if (sk.at !== 'self') p.faceToward(c0);
  g.spawnRing?.(c0, rad, color);                                   // telegrafía
  if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, c0.clone().setY(4.5));
  ctx.zoneCenter = c0; ctx.zoneRad = rad;
  let left = waves;
  const wave = () => {
    if (follow === 'owner' && !p.alive) { cast.done(ctx.res); return; }
    const c = centerNow();
    g.dealArea(c, rad, ctx.coef, { ...ctx.areaOpts, from: c });
    if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, c.clone().setY(0.3));
    if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, c.clone().setY(0.3));
    if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, c.clone().setY(0.1));
    if (follow) g.spawnRing?.(c, rad, color);
    g.addShake?.(sk.shake || 0.1);
    ctx.zoneCenter = c;
    if (--left > 0) g.timers.schedule(step, wave);
    else cast.done(ctx.res);
  };
  g.timers.schedule(Math.max(0.01, prof.impactDelay || 0.01), wave);
  return undefined; // diferido: termina con la última oleada
}

// Comportamientos a medida (solo cuando ningún tipo genérico sirve; se anotan en
// tools/convert-v2/out/pendientes-arquera.md). La habilidad declara `behavior: 'id'`;
// `params` = claves propias de la definición que lee. Los registra js/powers.js.
export const ARQUERA_SKILL_BEHAVIORS = {
  // Lluvia de Flechas: 4 oleadas en 1,2 s tras 0,3 s de aviso (VFX por oleada)
  a_lluvia: {
    name: 'Lluvia de Flechas', params: ['waves', 'span'],
    cast(g, p, prof, cast) { return rain(g, p, prof, cast); },
  },

  // Diluvio de Saetas: la misma lluvia, pero la nube te sigue (follow 'owner')
  a_diluvio: {
    name: 'Diluvio de Saetas', params: ['waves', 'span'],
    cast(g, p, prof, cast) { return rain(g, p, prof, cast); },
  },

  // Bomba de Humo: zona (−allyDr % de daño dentro, proyectiles enemigos que se pierden y,
  // con la forja, veneno) + CEGUERA: los enemigos dentro pegan −blindPct %. Con `follow`
  // (Manto de Niebla: prof.follow) la nube y la ceguera van contigo.
  a_humo: {
    name: 'Bomba de Humo', params: ['blindPct'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const pos = p.pos.clone(); pos.y = 0;
      const radius = prof.radius || sk.radius || 4, dur = prof.dur || sk.dur || 8;
      const follow = prof.follow ?? sk.follow ?? null;
      const color = ctx.color || sk.color || 0x9aa0a8;
      const f = g.spawnField?.('zona', { pos, radius, dur, owner: p, follow, maxPerSkill: prof.zoneMax || 0,
        data: { dps: ctx.coef > 0 ? ctx.avgHit : 0, color, skill: sk.id, tags: prof.tags,
          allyDr: sk.allyDr ? Math.round(sk.allyDr * (prof.buffMul || 1)) : 0, projMissPct: sk.projMissPct || 0 } });
      const blind = sk.blindPct || 0;
      if (blind > 0) pulseField(g, f, 0.25, (fl) => {
        for (const e of g.enemies || []) if (e.alive && inCircle(e.pos, fl.pos, reach(e, fl.radius))) e.weakenOutgoing?.('a_humo', blind, 0.4);
      });
      ctx.zoneCenter = pos; ctx.zoneRad = radius;
      g.spawnRing?.(pos, radius, color);
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, pos.clone().setY(0.6));
      if (ctx.fx?.extra) g.emitFx?.(ctx.fx.extra, pos.clone().setY(0.3));
      return ctx.res;
    },
  },

  // Paso Veloz: rueda `range` m en la dirección de movimiento (o hacia el cursor) en rollT s
  // y da el buff (+20 % de velocidad de ataque 3 s; sin buff, Doble Rodada)
  a_paso: {
    name: 'Paso Veloz', params: ['rollT'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const d = g.input?.keyDir;
      let dir;
      if (d && Math.hypot(d.x, d.z) > 1e-3) { const l = Math.hypot(d.x, d.z); dir = { x: d.x / l, z: d.z / l }; }
      else dir = aimDir(p, cast.target);
      const dist = prof.range || sk.range || 6;
      const want = p.pos.clone(); want.x += dir.x * dist; want.z += dir.z * dist; want.y = 0;
      const dest = g.clampWalkable(p.pos, want, dist);
      const from = p.pos.clone();
      p.faceToward(dest);
      if (Object.keys(prof.buff || {}).length) {
        const asp = prof.buff.aspdPct || 0;
        p.addBuff(sk.id, { ...prof.buff }, prof.dur || 3, { name: sk.name, icon: sk.icon, desc: asp ? `+${asp}% de velocidad de ataque` : sk.name });
      }
      const steps = 6, dt = Math.max(0.02, sk.rollT || 0.2) / steps;
      let i = 0;
      const step = () => {
        if (!p.alive) { cast.done(ctx.res); return; }
        i++;
        const k = i / steps;
        p.pos.x = from.x + (dest.x - from.x) * k;
        p.pos.z = from.z + (dest.z - from.z) * k;
        if (ctx.fx?.trail && i % 2) g.emitFx?.(ctx.fx.trail, p.pos.clone().setY(0.4));
        if (i < steps) { g.timers.schedule(dt, step); return; }
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = 2;
        if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, p.pos.clone().setY(0.3));
        cast.done(ctx.res);
      };
      g.timers.schedule(dt, step);
      return undefined;
    },
  },

  // Andanada: abanico de `count` flechas desde donde saltas y salto de `jump` m (intocable en
  // el aire). Los usos impares de la cadena (1.º y 3.º con Ida y Vuelta) saltan hacia atrás;
  // el relanzamiento, hacia delante. El relanzar (ventana, coste, recarga) es del motor.
  a_andanada: {
    name: 'Andanada', params: ['jump'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const dir = aimDir(p, cast.target);
      const back = ((cast.recast?.idx || 1) % 2) === 1;
      const dist = sk.jump || 4;
      const want = p.pos.clone(); want.y = 0;
      want.x += (back ? -dir.x : dir.x) * dist; want.z += (back ? -dir.z : dir.z) * dist;
      const to = g.clampWalkable(p.pos, want, dist);
      const base = Math.atan2(dir.x, dir.z);
      const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
      const castHits = prof.perTarget > 1 ? new Map() : null;     // Andanada Cerrada: hasta N por enemigo
      const muzzle = p.pos.clone().setY(1.0);
      muzzle.x += dir.x * 0.5; muzzle.z += dir.z * 0.5;
      p.faceToward(p.pos.clone().set(p.pos.x + dir.x, 0, p.pos.z + dir.z));
      p.swing = 1;
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, muzzle);
      for (let i = 0; i < n; i++)
        g.fireProjectile(ctx, { angle: base + projFanOffset(i, n, prof.spread), castHits, perTarget: prof.perTarget, size: sk.size || 0.1 });
      ctx.lifestealDone = true;                                     // el robo de vida va por impacto
      // una repetición (Eco) solo repite las flechas: no vuelve a saltar
      const airT = cast.echo ? 0 : (sk.airT || 0.3);
      if (!cast.echo) p.leap = { from: p.pos.clone(), to, t: 0, dur: airT, plant: false, onLand: () => {
        ctx.zoneCenter = p.pos.clone().setY(0); ctx.zoneRad = 2;
        if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, p.pos.clone().setY(0.3));
      } };
      const flight = (prof.range || sk.range || 10) / Math.max(1, prof.speed || 14) + 0.05;
      g.timers.schedule(Math.max(flight, airT), () => cast.done(ctx.res));
      return undefined;
    },
  },

  // Cerco de Zarzas: anillo donde apuntas (at 'enemy': sobre tu blanco). Cruzarlo en
  // cualquier sentido es un golpe sin daño que aplica prof.root (+ rootAdd) y la forja;
  // dentro, el veneno del campo `zona` (coef = WD/s); al cerrarse, estallido de endMul × coef.
  // Con `contain` (Jaula de Espinas) no se puede salir. El anillo dura lo que su campo.
  a_zarzas: {
    name: 'Cerco de Zarzas', params: ['endMul'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const src = sk.at === 'self' ? p.pos : (sk.at === 'enemy' && cast.enemy?.alive ? cast.enemy.pos : (cast.target || p.pos));
      const c = src.clone(); c.y = 0;
      const rad = prof.radius || sk.radius || 7;
      const dur = prof.dur || sk.dur || 8;
      const color = ctx.color || sk.color || 0x5a8a3a;
      const f = g.spawnField?.('zona', { pos: c, radius: rad, dur, owner: p, maxPerSkill: 1,
        data: { dps: ctx.avgHit, interval: 0.5, color, skill: sk.id, tags: prof.tags, contain: !!sk.contain } });
      if (sk.at !== 'self') p.faceToward(c);
      g.spawnRing?.(c, rad, color);
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, c.clone().setY(0.3));
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      const state = new Map();
      for (const e of g.enemies || []) if (e.alive) state.set(e, inCircle(e.pos, c, rad));
      const TICK = 0.1;
      let t = 0;
      const close = () => {
        const mul = sk.endMul || 0;
        if (!(mul > 0) || !p.alive) return;
        // el estallido no vuelve a inmovilizar (sin onHit: solo daño)
        g.dealArea(c, rad, ctx.coef * mul, { ...ctx.areaOpts, onHit: null, from: c });
        g.spawnRing?.(c, rad, color);
        if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, c.clone().setY(0.4));
        g.addShake?.(sk.shake || 0.3);
      };
      const tick = () => {
        if (f ? f.dead : t >= dur - 1e-6) { close(); return; }
        for (const e of g.enemies || []) {
          if (!e.alive) { state.delete(e); continue; }
          const now = inCircle(e.pos, c, rad);
          const was = state.get(e);
          if (was !== undefined && was !== now) {
            ctx.hit(e, 0, c);
            if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, e.pos.clone().setY(0.5));
          }
          state.set(e, now);
        }
        t += TICK;
        g.timers.schedule(TICK, tick);
      };
      g.timers.schedule(TICK, tick);
      return ctx.res;
    },
  },

  // Flecha Bengala: campo de luz donde apuntas; cada 0,25 s, Debilidad (weakPct: reciben más
  // daño de todo el grupo) y daño saliente reducido (weakenPct) a los enemigos dentro
  a_bengala: {
    name: 'Flecha Bengala',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const at = (cast.target || p.pos).clone(); at.y = 0;
      const rad = prof.radius || sk.radius || 10, dur = prof.dur || sk.dur || 10;
      const color = ctx.color || sk.color || 0xffcc55;
      const weak = sk.weakPct || 0, weaken = sk.weakenPct || 0;
      p.faceToward(at);
      p.swing = 1;
      g.spawnBeam?.(p.pos.clone().setY(1.0), at.clone().setY(2.5), color, 0.3);
      const f = g.spawnField?.('zona', { pos: at, radius: rad, dur, owner: p, maxPerSkill: 1, data: { dps: 0, color, skill: sk.id, tags: prof.tags } });
      pulseField(g, f, 0.25, (fl) => {
        for (const e of g.enemies || []) {
          if (!e.alive || !inCircle(e.pos, fl.pos, reach(e, fl.radius))) continue;
          if (weak > 0) e.applyWeakness?.(sk.id, weak, 0.4);
          if (weaken > 0) e.weakenOutgoing?.(sk.id, weaken, 0.4);
        }
      });
      ctx.zoneCenter = at; ctx.zoneRad = rad;
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(2.5));
      return ctx.res;
    },
  },

  // Torbellino: golpe SIN daño a los enemigos del radio (aplica prof.stun: a un jefe, Quebranto)
  a_torbellino: {
    name: 'Torbellino',
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const c = p.pos.clone(); c.y = 0;
      const rad = prof.radius || sk.radius || 4;
      for (const e of g.enemies || []) if (e.alive && inCircle(e.pos, c, reach(e, rad))) ctx.hit(e, 0, c);
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      g.spawnRing?.(c, rad, ctx.color || sk.color || 0xbfe8ff);
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, c.clone().setY(0.8));
      g.addShake?.(sk.shake || 0.2);
      return ctx.res;
    },
  },

  // Llamada del Halcón: un ataque cada `every` s durante `dur` s a tu blanco (si muere o se
  // aleja, al enemigo más cercano a ti); cada blanco nuevo queda ciego (pega −blindPct %) el
  // resto de la llamada y el primer jefe recibe `staggerOnce` de Quebranto
  a_halcon: {
    name: 'Llamada del Halcón', params: ['every', 'blindPct', 'staggerOnce'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const range = prof.range || sk.range || 15;
      const dur = prof.dur || sk.dur || 6, every = Math.max(0.1, sk.every || 0.5);
      const shots = Math.max(1, Math.round(dur / every));
      const color = ctx.color || sk.color || 0xd8b070;
      const inRange = e => !!e && e.alive && e.pos.distanceTo(p.pos) <= range + 2;
      const nearest = () => {
        let best = null;
        for (const e of g.enemies || []) if (inRange(e) && (!best || e.pos.distanceToSquared(p.pos) < best.pos.distanceToSquared(p.pos))) best = e;
        return best;
      };
      let prey = inRange(cast.enemy) ? cast.enemy : nearest();
      const blinded = new Set();
      let staggered = false, k = 0;
      const strike = () => {
        if (!p.alive) return;
        if (!inRange(prey)) prey = nearest();
        if (prey) {
          const e = prey;
          const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0, e.pos);
          if (e.alive && !blinded.has(e)) {
            blinded.add(e);
            if (sk.blindPct > 0) e.weakenOutgoing?.(sk.id, sk.blindPct, Math.max(every, dur - k * every));
          }
          if (e.alive && !staggered && sk.staggerOnce > 0 && (e.addStagger?.(sk.staggerOnce, p) || 0) > 0) staggered = true;
          g.spawnBeam?.(e.pos.clone().setY(4.0), e.pos.clone().setY(1.0), color, Math.min(0.2, every));
          if (ctx.fx?.impact) g.emitFx?.(ctx.fx.impact, e.pos.clone().setY(1.0));
        }
        if (++k < shots) g.timers.schedule(every, strike);
      };
      if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(2.0));
      g.timers.schedule(Math.min(0.15, every), strike);
      return ctx.res;
    },
  },
};

// ------------------------------------------------------------
// Paso 2 (2f + 2g) · forja, barras y versión del catálogo (docs/paso2-implementacion.md §3.5,
// D3, D6 y D24). data.js los fusiona.
// ------------------------------------------------------------
// skillId → { mejora, vars: [<id>_i, <id>_ii] } · KA2 (las 17 entradas del borrador)
export const ARQUERA_SKILL_FORGE = {};
// barra, forja del mockup ('i'/'ii') y habilidad seleccionada al elegir la especialización (D6)
export const ARQUERA_SPEC_BAR = {
  tiradora: { bar: { lmb: 'a_disparo', rmb: 'flecha_multiple', k1: 'a_v_carrera', k2: 'a_humo', k3: 'a_t_andanada', k4: 'a_u_diluvio' },
    forge: { a_disparo: 'i', flecha_multiple: 'i' }, sel: 'flecha_multiple' },
  francotiradora: { bar: { lmb: 'a_disparo', rmb: 'a_f_rastreador', k1: 'a_paso', k2: 'a_f_rodilla', k3: 'a_t_apuntado', k4: 'a_u_celeste' },
    forge: { a_disparo: 'ii', a_t_apuntado: 'ii', a_f_rastreador: 'ii' }, sel: 'a_t_apuntado' },
  montaraz: { bar: { lmb: 'a_disparo', rmb: 'a_m_detonante', k1: 'a_m_acecho', k2: 'a_humo', k3: 'a_t_cepo', k4: 'a_u_zarzas' },
    forge: { a_disparo: 'ii', a_t_cepo: 'ii' }, sel: 'a_t_cepo' },
};
// specId → { skillId: 'i' | 'ii' } (forja recomendada, D3) · KA2
export const ARQUERA_FORGE_RECO = {};
// barra de reserva de la migración (§3.11): el kit base
export const ARQUERA_FALLBACK_BAR = { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null };
// 1 = catálogo v4 · 2 = catálogo 2g
export const ARQUERA_CATALOG_V = 2;
