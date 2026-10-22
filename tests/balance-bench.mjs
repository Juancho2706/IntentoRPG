// ============================================================
// BANCO DE BALANCE — Paso 1A · 2b.2 · 2e · Paso 2 (2f + 2g, E4: B1)
// ============================================================
// Héroes REALES del catálogo 2g (tests/helpers/bench-core.mjs): equipo por perfil fijo de nivel,
// la BUILD de talents-<clase>.js llenada punto a punto (clase, especialización y árbol héroe con
// el Paragon abierto), la barra de <CLASE>_SPEC_BAR, la forja recomendada y el tablero de glifos;
// el canal REAL de lanzamiento con los verbos (cargar y soltar con 60 % de perfectos —90 % con Fe
// Serena o la Calma Absoluta—, relanzar, combos, posturas, canales mantenidos, plantado, trampas).
//
// QUÉ MIDE Y AFIRMA
//  1. FILAS DE CLASE (Paso 1A + 2b.2): Nv 1/5/10/25/50 T0 y Nv50 T10, típico y óptimo. Rangos de
//     TTK y TTD por clase y de la media; óptimo/típico en [1,3; 15]; T10 más lento y más letal;
//     en UNI «solo básico» ≤ 0,6×, la definitiva 12–22 % y ninguna principal trampa.
//  2. MATRIZ DE ROL (2e §7.2, Nv50 típico con la build por defecto de cada especialización):
//     métrica principal ×M y mejor de su clase por ≥ 10 % (p. ej., Berserker en UNI), suelos,
//     rangos 1A ±20 %, jefe ≤ 2× el más rápido, definitiva 12–22 %, «solo básico» ≤ 0,6×, golpe
//     óptimo ≤ 25 % del jefe. TTD+ con la «variante defensiva» (la ranura 2 con la defensa base
//     de la clase si la barra no la trae; §7.2: todos llevan una defensa). El intercambio de la
//     ranura 2 de 2e NO sigue vigente: la barra es la de SPEC_BAR (decisión 3 del orquestador).
//  3. G9 (cada arquetipo gana su escenario; la híbrida ≥ 0,85 de la mejor en la Maga y ≥ 0,90 en
//     el Guerrero; en la Arquera, §17.3: no es la mejor en nada, ≥ 0,90 en mixto y ≥ 0,80 en jefe
//     y en grupos) con las 12 builds de cada clase a Nv70 (especialización completa) y Nv100.
//  4. G18 (Paragon): aporte de los 10 nodos del árbol héroe = Nv80 frente al mismo héroe a Nv70
//     (Paragon ya abierto: solo su nodo clave) contra los mismos enemigos (mixto: media de UNI y
//     ÁREA×5); diferencia ≤ 5 puntos entre los dos árboles de cada especialización (media de sus builds).
// Lo que hoy NO se cumple está en PENDING_E4B (regla, valor medido, objetivo y dueño): el banco
// sale verde solo si los fallos de la semilla 1 coinciden EXACTAMENTE con esa lista (uno nuevo o
// uno ya arreglado lo hacen fallar y obligan a actualizarla). Nada se apaga ni se relaja.
//
// ESCENARIOS (2e §7.1): UNI (jefe de 90 s de vida, 60 s), ÁREA×5 (la manada llega caminando y se
// repone), CONTROL (5 comunes inmortales), TTD+ (hasta perder el 50 % contra 3 élites + 4
// comunes), APOYO (2 aliados fantasma a tu lado y siempre heridos). Curva de enemigos hasta el 100: areaLevelForHero
// (combat-math) estirada lo justo desde el 70; el ilvl no cambia.
//
// Uso: `node tests/balance-bench.mjs` (afirma; 1 semilla, < 60 s) · `--report` (todo, sin afirmar)
//      · `--seeds N` (medianas de N semillas; con --report) · `--json <ruta>` (resultados para el
//      informe de E4b) · `--levels 70,100` (niveles de G9).
// ============================================================
import { writeFileSync } from 'fs';
import { CLASSES } from '../js/data.js';
import { buildsFor, talentTreesFor } from '../js/talents.js';
import * as CM from '../js/combat-math.js';
import { resolveSkill } from '../js/skill-resolve.js';
import {
  buildHero, refEnemies, simulate, simulateUni, ttdPack, ttdPlus, ttdPlusSim, areaSim, controlSim, apoyoSim, ultKind,
  SPECS, SPEC_CLASS, ALL_SPECS, SPEC_PICK, UNI_T, UNI_LIFE, med, f1, pct, sgn,
} from './helpers/bench-core.mjs';
// los héroes de los bancos de E4 usan también la movilidad (1) de su barra
const hero = (c, L, gear, o = {}) => buildHero(c, L, gear, { move: true, ...o });

// la API de siempre (test69 importa buildHero, refEnemies y simulateUni de aquí)
export { buildHero, refEnemies, simulate, simulateUni, ttdPack, ttdPlus, ttdPlusSim, areaSim, controlSim, apoyoSim, SPECS, SPEC_CLASS, ALL_SPECS, SPEC_PICK };

const ARGV = process.argv.slice(2);
const REPORT = ARGV.includes('--report');
const argOf = k => { const i = ARGV.indexOf(k); return i >= 0 ? ARGV[i + 1] : null; };
const ULT_MIN_LEVEL = 15;
// defensa base de cada clase: la «variante defensiva» de TTD+ (2e §7.2) la pone en la ranura 2
export const CLASS_DEF = { guerrero: 'g_piel', maga: 'm_barrera', arquera: 'a_humo' };

// ---------------- OBJETIVOS ----------------
export const TARGETS = {
  // Paso 1A (sin cambios): media de las 3 clases y cada clase por separado
  mean: { ttkN: [0.6, 1.5], ttkE: [4.5, 10.5], ttkB: [45, 90], ttd: [6, 10] },
  cls: { ttkN: [0.45, 1.8], ttkE: [4.5, 10.5], ttkB: [35, 100], ttd: [6, 13] },
  bossNv1: [30, 60],
  bossRamp: [30, 90],      // Nv 2–9
  ratio: [1.3, 15],        // DPS óptimo / típico (Nv ≥ 10)
  classSpread: 2.5,
  maxHitBoss: 0.25,
  // Paso 2b.2 (UNI)
  basicOnly: 0.6,
  ultShare: [0.12, 0.22],
  spenderShare: 0.10,
  spenderPerUse: 1.8,
  spenderPerUseArea: 1.3,
  // Paso 2e (§7.2, Nv50): rangos 1A ±20 % por especialización y métrica de rol
  spec: { ttkN: [0.48, 1.8], ttkE: [3.6, 12.6], ttkB: [36, 108], ttd: [4.8, 12], guardianBoss: 130, bossSpread: 2.0 },
  role: {
    berserker:      { best: 'uni', min: { uni: 1.10, area: 1.0, ttdp: 0.9 } },
    guardian:       { best: 'ttdp', min: { ttdp: 2.0, uni: 0.70 }, ttdpVsClass: 1.8 },
    cruzado:        { best: 'apoyo', abs: { apoyoDps: 0.25, apoyoHeal: 1.5 }, min: { uni: 0.80, ttdp: 1.3 } },
    piromante:      { best: 'area', min: { area: 1.20, uni: 0.85 } },
    crionte:        { best: 'ctl', abs: { slow: 0.50, hard: 0.20, breaks: 2 }, min: { area: 0.90, uni: 0.85 } },
    arcanista:      { best: 'uni', min: { uni: 1.15, area: 0.75 } },
    francotiradora: { best: 'uni', min: { uni: 1.15, area: 0.70, ttdp: 0.85 } },
    montaraz:       { best: 'ctl', abs: { slow: 0.40, breaks: 2 }, min: { area: 0.90 } },
    tiradora:       { best: 'area', min: { area: 1.20, uni: 0.85 } },
  },
  bestBy: 1.10,
  // G18 (Arquera §13, plan §8): ≤ 5 puntos entre los dos árboles héroe de cada especialización;
  // el aporte de +10–15 % es del modelo de diseño (solo se informa)
  g18: { diff: 0.05, aporte: [0.10, 0.15] },
};

// G9: escenario que GANA cada arquetipo y regla de la híbrida (tablas de comparación de los docs:
// Maga §5.2, §5.3, §6.5; Guerrero §8.4; Arquera §8.5–§8.7, §13 y §17.3 decisión 1). «grieta» gana el
// aguante sostenido (TTD+) y «cataclismo» el CONTROL (las únicas columnas en que son las mejores)
export const G9 = {
  maga: { rule: 'min', hybridMin: 0.85, specs: {
    piromante: { win: { brasa: 'area', ignicion: 'uni', cataclismo: 'ctl' }, hybrid: 'hibrido', over: ['uni', 'area'] },
    crionte:   { win: { tormenta: 'area', fractura: 'uni', glaciar: 'ctl' }, hybrid: 'hibcrio', over: ['uni', 'area'] },
    arcanista: { win: { orbe: 'area', rayo: 'uni', grieta: 'ttdp' }, hybrid: 'hibarca', over: ['uni', 'area'] },
  } },
  guerrero: { rule: 'min', hybridMin: 0.90, specs: {
    berserker: { win: { estampida: 'area', gracia: 'uni', danza: 'ttdp' }, hybrid: 'hibrido', over: ['uni', 'area'] },
    guardian:  { win: { vanguardia: 'area', sismo: 'uni', guardia: 'ttdp' }, hybrid: 'hibguard', over: ['ttdp', 'uni', 'area'] },
    cruzado:   { win: { tribunal: 'area', celestial: 'uni', santa: 'apoyo' }, hybrid: 'hibcruz', over: ['uni', 'area'] },
  } },
  // Arquera §17.3 (decisión 1): la híbrida no es la mejor en jefe, grupos ni mixto; ≥ 0,90 de la
  // mejor en mixto y ≥ 0,80 en jefe y en grupos
  arquera: { rule: 'arquera', mixMin: 0.90, pureMin: 0.80, specs: {
    tiradora:       { win: { plumas: 'area', vaiven: 'uni' }, hybrid: 'cruzado' },
    francotiradora: { win: { perforacion: 'area', puntodebil: 'uni', vigia: 'mixto' }, hybrid: 'pulso' },
    montaraz:       { win: { campo: 'area', caceria: 'uni', zarzal: 'ctl' }, hybrid: 'espinas' },
  } },
};
export const G9_LEVELS = [70, 100];
// escenarios que necesita G9 en cada especialización (además de UNI y ÁREA×5)
function g9Needs(spec) {
  const c = SPEC_CLASS[spec], S = G9[c].specs[spec];
  return new Set([...Object.values(S.win), ...(S.over || [])].filter(s => s !== 'mixto'));
}

// ---------------- PENDIENTES DE CALIBRACIÓN (E4b) ----------------
// Lo que la semilla 1 mide HOY fuera de objetivo. Cada entrada: la regla (clave estable), lo
// medido, el objetivo y el dueño del arreglo (KA = catálogo y forja; KT = talentos, poderes y
// mecánica; B1 = el propio banco). El banco falla si un fallo nuevo no está aquí o si algo de aquí
// ya se cumple (hay que sacarlo). Las propuestas, en docs/paso2-e4-informe.md. El banco solo
// compara las claves; `medido` y el texto se refrescaron con la semilla 1 tras E4b-bugs (revisión,
// 2026-10-22: los DoT al ritmo y la carga completa desde la ventana dorada movieron las cifras).
export const PENDING_E4B = [
  { key: '1A:guerrero:5:ttkB', medido: 26.425, objetivo: [30, 90], dueño: 'KA-guerrero', regla: 'guerrero Nv5: TTK jefe 26.4s fuera de 30,90' },
  { key: '1A:guerrero:25:ult', medido: 0.037, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'guerrero Nv25: la definitiva g_u_furia aporta 4% del daño UNI (sin ella baja eso) (objetivo 12–22 %)' },
  { key: '1A:guerrero:50:ult', medido: 0, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'guerrero Nv50: la definitiva g_u_furia aporta 0% del daño UNI (sin ella baja eso) (objetivo 12–22 %)' },
  { key: '1A:maga:25:ult', medido: 0.105, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'maga Nv25: la definitiva m_u_supernova aporta 10% del daño UNI (objetivo 12–22 %)' },
  { key: '1A:maga:50:ttkE', medido: 3.942, objetivo: [4.5, 10.5], dueño: 'KA-maga', regla: 'maga Nv50: TTK élite 3.94s fuera de 4.5,10.5' },
  { key: '1A:maga:50:ttd', medido: 5.831, objetivo: [6, 13], dueño: 'KA-maga', regla: 'maga Nv50: TTD manada 5.83s fuera de 6,13' },
  { key: '1A:maga:50:ult', medido: 0.061, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'maga Nv50: la definitiva m_u_supernova aporta 6% del daño UNI (objetivo 12–22 %)' },
  { key: 'ROL:berserker:50:min:ttdp', medido: 0.221, objetivo: 0.9, dueño: 'KA-guerrero', regla: 'berserker Nv50: TTDP ×0.22 de la media (< ×0.9)' },
  { key: 'ROL:berserker:50:best:uni', medido: 0.687, objetivo: 1.1, dueño: 'KA-guerrero', regla: 'berserker Nv50: UNI no es la mejor de su clase por ×1.1 (3193.1 frente a 4649.4)' },
  { key: '1A:arquera:25:maxHit', medido: 0.283, objetivo: 0.25, dueño: 'KA-arquera', regla: 'arquera Nv25: un golpe óptimo (a_u_celeste) quita 28% de la vida del jefe' },
  { key: 'ROL:berserker:50:ult', medido: 0, objetivo: [0.12, 0.22], dueño: 'KA-guerrero', regla: 'berserker Nv50: la definitiva g_u_furia aporta 0% del daño UNI (sin ella baja eso) (objetivo 12–22 %)' },
  { key: 'ROL:cruzado:50:min:ttdp', medido: 0.365, objetivo: 1.3, dueño: 'KA-guerrero', regla: 'cruzado Nv50: TTDP ×0.36 de la media (< ×1.3)' },
  { key: 'ROL:cruzado:50:apoyoDps', medido: 0.08, objetivo: 0.25, dueño: 'KT-guerrero', regla: 'cruzado Nv50: APOYO 8% del DPS de un aliado (< 25%)' },
  { key: 'ROL:cruzado:50:best:apoyo', medido: 0.302, objetivo: 1.1, dueño: 'KT-guerrero', regla: 'cruzado Nv50: APOYO no es la mejor de su clase por ×1.1 (0.08 frente a 0.27)' },
  { key: 'ROL:cruzado:50:ttkB', medido: 19.75, objetivo: [36, 108], dueño: 'KA-guerrero', regla: 'cruzado Nv50: TTK jefe 19.7s fuera de 36,108' },
  { key: 'ROL:cruzado:50:maxHit', medido: 0.251, objetivo: 0.25, dueño: 'KA-guerrero', regla: 'cruzado Nv50: un golpe óptimo (g_martillo) quita 25% de la vida del jefe' },
  { key: 'ROL:piromante:50:ult', medido: 0.061, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'piromante Nv50: la definitiva m_u_supernova aporta 6% del daño UNI (objetivo 12–22 %)' },
  // E4b-bugs (B2): con las quemaduras haciendo sus tics al ritmo (js/timers.js), la manada del ÁREA×5
  // muere escalonada y la Bola y el Meteoro dan a menos enemigos por lanzamiento (9054 → 7507)
  { key: 'ROL:piromante:50:best:area', medido: 1.067, objetivo: 1.1, dueño: 'KT-maga', regla: 'piromante Nv50: AREA no es la mejor de su clase por ×1.1 (7506.8 frente a 7036.3)' },
  { key: 'ROL:crionte:50:min:uni', medido: 0.543, objetivo: 0.85, dueño: 'KA-maga', regla: 'crionte Nv50: UNI ×0.54 de la media (< ×0.85)' },
  // DEC (M1, decisión del dueño): Escarcha Arcana (c20) ralentiza como mucho 1 vez cada 4 s por enemigo. El
  // control de la Arcanista baja de 0,63 a 0,36 y sale ROL:crionte:50:best:ctl (la Crionte, 0,63: ×1,73); salen
  // también G9:piromante:70 y 100:cataclismo:ctl (Combustión Perpetua sacaba su control de c20). De rebote, con
  // menos enemigos ralentizados, el +15 % de crítico del Dardo pesa menos: la Arcanista Nv50 pasa de 2172 a
  // 1946 de UNI (−10 %) y de 4105 a 3884 de ÁREA×5 (−5 %); entradas de abajo refrescadas. Revisión: con Escarcha
  // Tenaz (c21, +2 s) la ralentización duraba 4 s, lo mismo que la espera, y la build Orbe (la que lleva c21) volvía
  // a tenerla siempre: control 0,95 → 0,83 a Nv70 y 0,94 → 0,80 a Nv100, como la Crionte (Era Glacial 0,72 y 0,69;
  // Fractura 0,83). Ahora c21 alarga también la espera (4 s de cada 6): 0,68 y 0,69. A Nv50 nadie lleva c21
  { key: 'ROL:crionte:50:ult', medido: 0.119, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'crionte Nv50: la definitiva m_u_tormenta aporta 12% del daño UNI (objetivo 12–22 %)' },
  { key: 'ROL:arcanista:50:min:uni', medido: 0.79, objetivo: 1.15, dueño: 'KA-maga', regla: 'arcanista Nv50: UNI ×0.79 de la media (< ×1.15)' },
  { key: 'ROL:arcanista:50:best:uni', medido: 0.649, objetivo: 1.1, dueño: 'KA-maga', regla: 'arcanista Nv50: UNI no es la mejor de su clase por ×1.1 (1945.7 frente a 2997.7)' },
  { key: 'ROL:arcanista:50:ult', medido: 0.032, objetivo: [0.12, 0.22], dueño: 'KA-maga', regla: 'arcanista Nv50: la definitiva m_u_desgarro aporta 3% del daño UNI (objetivo 12–22 %)' },
  { key: 'ROL:francotiradora:50:min:uni', medido: 0.646, objetivo: 1.15, dueño: 'KA-arquera', regla: 'francotiradora Nv50: UNI ×0.65 de la media (< ×1.15)' },
  { key: 'ROL:francotiradora:50:min:area', medido: 0.378, objetivo: 0.7, dueño: 'KA-arquera', regla: 'francotiradora Nv50: AREA ×0.38 de la media (< ×0.7)' },
  { key: 'ROL:francotiradora:50:min:ttdp', medido: 0.227, objetivo: 0.85, dueño: 'KA-arquera', regla: 'francotiradora Nv50: TTDP ×0.23 de la media (< ×0.85)' },
  // S-arquera (sensación): la Andanada acierta a un blanco (A1: la central y su gemela), el Disparo
  // Disperso pega como un básico (A-x1) y la Carrera no bloquea (A2): la Tiradora pasa de 1102 a 1841 de
  // UNI y supera a la Francotiradora (1590, con Punto Débil rehecho en A7); su definitiva pesa menos
  // (10 %). Salen ROL:tiradora:50:min:uni, :ttkN y :ttkE; con el cepo cerrado detonable (A3),
  // ROL:montaraz:50:ttkE; con Tiro Celestial al 12 % de la Francotiradora, ROL:francotiradora:50:ult y
  // 1A:arquera:50:ult. Calibración del papel UNI (propuesta en el informe de S-arquera): E4b. Tiradora frente a
  // Francotiradora (A5 de «Decisiones de sensación»): subir el tensado de la Francotiradora, en la calibración
  { key: 'ROL:francotiradora:50:best:uni', medido: 0.864, objetivo: 1.1, dueño: 'KA-arquera', nota: 'decisión del dueño: E4b', regla: 'francotiradora Nv50: UNI no es la mejor de su clase por ×1.1 (1589.9 frente a 1840.6)' },
  { key: 'ROL:montaraz:50:min:area', medido: 0.532, objetivo: 0.9, dueño: 'KA-arquera', regla: 'montaraz Nv50: AREA ×0.53 de la media (< ×0.9)' },
  { key: 'ROL:tiradora:50:min:area', medido: 0.493, objetivo: 1.2, dueño: 'KA-arquera', regla: 'tiradora Nv50: AREA ×0.49 de la media (< ×1.2)' },
  { key: 'ROL:tiradora:50:best:area', medido: 0.927, objetivo: 1.1, dueño: 'KA-arquera', regla: 'tiradora Nv50: AREA no es la mejor de su clase por ×1.1 (2689.7 frente a 2902.3)' },
  { key: 'ROL:tiradora:50:ult', medido: 0.102, objetivo: [0.12, 0.22], dueño: 'KA-arquera', regla: 'tiradora Nv50: la definitiva a_u_diluvio aporta 10% del daño UNI (objetivo 12–22 %)' },
  { key: 'ROL:spread:50', medido: 4.422, objetivo: 2, dueño: 'E4b', regla: 'Nv50: jefe más lento ×4.42 el más rápido (> ×2)' },
  { key: 'G9:piromante:70:brasa:area', medido: 0.461, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv70 piromante: Incendio no gana ÁREA×5 (×0.46 de Combustión Perpetua)' },
  { key: 'G9:piromante:70:hibrido:hibrida', medido: 0.317, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv70 piromante: la híbrida Brasa Ardiente queda a ×0.32 de la mejor en UNI (≥ ×0.85)' },
  { key: 'G9:crionte:70:tormenta:area', medido: 0.363, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv70 crionte: Invierno Eterno no gana ÁREA×5 (×0.36 de Cero Absoluto)' },
  { key: 'G9:crionte:70:glaciar:ctl', medido: 0.732, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv70 crionte: Era Glacial no gana CONTROL (×0.73 de Invierno Eterno)' },
  { key: 'G9:crionte:70:hibcrio:hibrida', medido: 0.601, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv70 crionte: la híbrida Escarcha Quebradiza queda a ×0.60 de la mejor en ÁREA×5 (≥ ×0.85)' },
  { key: 'G9:arcanista:70:hibarca:hibrida', medido: 0.389, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv70 arcanista: la híbrida Rayo Orbital queda a ×0.39 de la mejor en UNI (≥ ×0.85)' },
  // S-maga (M-11): sin el Haz de un solo objetivo, las builds Rayo y Grieta Eterna lanzan un Rayo que
  // atraviesa y le ganan el ÁREA×5 a Constelación (la de Grieta, con Rayo en Cadena y el Desgarro ancho:
  // 13 483 frente a 8363 a Nv70). La build Rayo ya no lleva Cadena (revisión: era la variante de ÁREA en una
  // build de UNI) y deja de ser la mejor en ÁREA. Constelación necesita sus talentos (a19/a23/a26): KT-maga.
  // DEC (M4): el Orbe en órbita se absorbe al acabarla y da su Carga; solo, no mueve el ÁREA×5 de Constelación
  // (llega 8 s tarde). Con M1 y la espera que alarga c21, 8363 → 8882 a Nv70 y 11 215 → 12 048 a Nv100 (×0,68 de
  // Rayo Orbital): con la manada menos ralentizada, llega antes y más junta a las descargas
  { key: 'G9:arcanista:70:orbe:area', medido: 0.659, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv70 arcanista: Constelación no gana ÁREA×5 (×0.66 de Grieta Eterna)' },
  { key: 'G9:berserker:70:danza:ttdp', medido: 0.614, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv70 berserker: Danza Carmesí no gana TTD+ (×0.61 de Estampida Sin Fin)' },
  { key: 'G9:berserker:70:hibrido:hibrida', medido: 0.762, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv70 berserker: la híbrida Sangre y Acero queda a ×0.76 de la mejor en UNI (≥ ×0.9)' },
  // DEC (G4, decisión del dueño): Montaña Viva aturde entero, pero como mucho 1 vez cada 3 s por enemigo. No cambian
  // estas G9 ni ROL:guardian:50:ttkB (a Nv50 la build aún no tiene d26): el TTD+ de Sismo sigue en el tope (1800 s) y
  // sin NINGÚN aturdimiento de Montaña Viva daría 1029 s a Nv70 y 1800 a Nv100; Vanguardia, sin d26, también llega
  // a 1800. El aguante del Guardián en TTD+ no sale de esa cadena: E4b
  { key: 'G9:guardian:70:guardia:ttdp', medido: 0.024, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv70 guardian: Guardia Total no gana TTD+ (×0.02 de Montaña Viva)' },
  { key: 'G9:guardian:70:hibguard:hibrida', medido: 0.012, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv70 guardian: la híbrida Roca y Escudo queda a ×0.01 de la mejor en TTD+ (≥ ×0.9)' },
  { key: 'G9:cruzado:70:tribunal:area', medido: 0.643, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv70 cruzado: Tribunal no gana ÁREA×5 (×0.64 de Martillo Celestial)' },
  { key: 'G9:cruzado:70:hibcruz:hibrida', medido: 0.8, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv70 cruzado: la híbrida Luz y Martillo queda a ×0.80 de la mejor en UNI (≥ ×0.9)' },
  { key: 'G9:tiradora:70:vaiven:uni', medido: 0.631, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 tiradora: Vaivén Eterno no gana UNI (×0.63 de Tormenta de Plumas)' },
  // S-arquera: con la Carrera que no bloquea y atraviesa, Viento Cruzado sube (sale su :min:uni y su
  // :min:mixto pasa de ×0,85 a ×0,89) y Galerna Infinita alcanza a Tormenta de Plumas en ÁREA×5
  { key: 'G9:tiradora:70:cruzado:min:mixto', medido: 0.89, objetivo: 0.9, dueño: 'KT-arquera', regla: 'G9 Nv70 tiradora: la híbrida Viento Cruzado queda a ×0.89 de la mejor en mixto (≥ ×0.9)' },
  { key: 'G9:tiradora:70:plumas:area', medido: 0.991, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 tiradora: Tormenta de Plumas no gana ÁREA×5 (×0.99 de Galerna Infinita)' },
  { key: 'G9:francotiradora:70:perforacion:area', medido: 0.729, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 francotiradora: Línea Mortal no gana ÁREA×5 (×0.73 de Atalaya Eterna)' },
  { key: 'G9:francotiradora:70:puntodebil:uni', medido: 0.939, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 francotiradora: Disparo Imposible no gana UNI (×0.94 de Atalaya Eterna)' },
  { key: 'G9:francotiradora:70:pulso:min:area', medido: 0.697, objetivo: 0.8, dueño: 'KT-arquera', regla: 'G9 Nv70 francotiradora: la híbrida Pulso de Hierro queda a ×0.70 de la mejor en ÁREA×5 (≥ ×0.8)' },
  { key: 'G9:francotiradora:70:pulso:min:mixto', medido: 0.814, objetivo: 0.9, dueño: 'KT-arquera', regla: 'G9 Nv70 francotiradora: la híbrida Pulso de Hierro queda a ×0.81 de la mejor en mixto (≥ ×0.9)' },
  // Ojo (revisión de DEC): Tierra Arrasada reparte sus campos con un ángulo que sale del contador GLOBAL de campos
  // (powers-arquera.js, m_tierra_arrasada: `hit.trap.uid % 7`), así que su ÁREA×5 cambia con lo que el banco simuló
  // antes aunque no se toque la Arquera (Nv70: 0,78 sola, 0,92 si se repite, 0,845 en el banco; Nv100: 0,76–0,87).
  // Arreglo (un contador por héroe, no el global): KT-arquera
  { key: 'G9:montaraz:70:campo:area', medido: 0.845, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 montaraz: Tierra Arrasada no gana ÁREA×5 (×0.85 de Bosque Vivo)' },
  { key: 'G9:montaraz:70:caceria:uni', medido: 0.815, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 montaraz: Gran Cacería no gana UNI (×0.81 de Espinas de Caza)' },
  { key: 'G9:montaraz:70:zarzal:ctl', medido: 0.948, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv70 montaraz: Bosque Vivo no gana CONTROL (×0.95 de Espinas de Caza)' },
  { key: 'G9:montaraz:70:espinas:noBest:uni', medido: 1.086, objetivo: "< 1", dueño: 'KT-arquera', regla: 'G9 Nv70 montaraz: la híbrida Espinas de Caza es la mejor en UNI (×1.09)' },
  // S-arquera (A3): con el cepo cerrado detonable (y los cerrados fuera del tope de 3), las builds de
  // trampas de Bosque Vivo y Tierra Arrasada sacan más en ÁREA×5 y la híbrida queda por debajo (también
  // a Nv100); salen sus :noBest:mixto (Nv70 y Nv100) y la CONTROL de Bosque Vivo a Nv100
  { key: 'G9:montaraz:70:espinas:min:area', medido: 0.733, objetivo: 0.8, dueño: 'KT-arquera', regla: 'G9 Nv70 montaraz: la híbrida Espinas de Caza queda a ×0.73 de la mejor en ÁREA×5 (≥ ×0.8)' },
  { key: 'G9:piromante:100:brasa:area', medido: 0.603, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv100 piromante: Incendio no gana ÁREA×5 (×0.60 de Combustión Perpetua)' },
  { key: 'G9:piromante:100:hibrido:hibrida', medido: 0.343, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv100 piromante: la híbrida Brasa Ardiente queda a ×0.34 de la mejor en UNI (≥ ×0.85)' },
  { key: 'G9:crionte:100:tormenta:area', medido: 0.318, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv100 crionte: Invierno Eterno no gana ÁREA×5 (×0.32 de Cero Absoluto)' },
  { key: 'G9:crionte:100:glaciar:ctl', medido: 0.702, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv100 crionte: Era Glacial no gana CONTROL (×0.70 de Invierno Eterno)' },
  { key: 'G9:crionte:100:hibcrio:hibrida', medido: 0.623, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv100 crionte: la híbrida Escarcha Quebradiza queda a ×0.62 de la mejor en ÁREA×5 (≥ ×0.85)' },
  { key: 'G9:arcanista:100:hibarca:hibrida', medido: 0.489, objetivo: 0.85, dueño: 'KT-maga', regla: 'G9 Nv100 arcanista: la híbrida Rayo Orbital queda a ×0.49 de la mejor en UNI (≥ ×0.85)' },
  { key: 'G9:arcanista:100:orbe:area', medido: 0.677, objetivo: 1, dueño: 'KT-maga', regla: 'G9 Nv100 arcanista: Constelación no gana ÁREA×5 (×0.68 de Rayo Orbital)' },
  { key: 'G9:berserker:100:danza:ttdp', medido: 0.465, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv100 berserker: Danza Carmesí no gana TTD+ (×0.47 de Estampida Sin Fin)' },
  { key: 'G9:berserker:100:hibrido:hibrida', medido: 0.761, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv100 berserker: la híbrida Sangre y Acero queda a ×0.76 de la mejor en UNI (≥ ×0.9)' },
  { key: 'G9:guardian:100:hibguard:hibrida', medido: 0.283, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv100 guardian: la híbrida Roca y Escudo queda a ×0.28 de la mejor en TTD+ (≥ ×0.9)' },
  { key: 'G9:cruzado:100:tribunal:area', medido: 0.759, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv100 cruzado: Tribunal no gana ÁREA×5 (×0.76 de Martillo Celestial)' },
  { key: 'G9:cruzado:100:hibcruz:hibrida', medido: 0.737, objetivo: 0.9, dueño: 'KT-guerrero', regla: 'G9 Nv100 cruzado: la híbrida Luz y Martillo queda a ×0.74 de la mejor en UNI (≥ ×0.9)' },
  { key: 'G9:tiradora:100:vaiven:uni', medido: 0.732, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv100 tiradora: Vaivén Eterno no gana UNI (×0.73 de Viento Cruzado)' },
  { key: 'G9:tiradora:100:cruzado:noBest:uni', medido: 1.032, objetivo: "< 1", dueño: 'KT-arquera', regla: 'G9 Nv100 tiradora: la híbrida Viento Cruzado es la mejor en UNI (×1.03)' },
  { key: 'G9:francotiradora:100:perforacion:area', medido: 0.809, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv100 francotiradora: Línea Mortal no gana ÁREA×5 (×0.81 de Atalaya Eterna)' },
  // E4b-bugs (revisión): con la carga completa desde la ventana dorada, Salva de Vigía sale en los
  // soltados perfectos (del 0,8 al 1,2 % del UNI de Atalaya Eterna). En la mediana de 5 semillas,
  // Atalaya Eterna no cambia (UNI ×1,003, ÁREA×5 ×1,000); con la semilla 1 baja un 5 % de UNI (los
  // tiros de más mueven el azar del combate) y su mixto pasa a ×0,99 de Disparo Imposible. Por lo
  // mismo, Pulso de Hierro (`G9:francotiradora:100:pulso:min:mixto`, ×0,89) pasa a ×0,91 y sale
  { key: 'G18:berserker', medido: 0.129, objetivo: 0.05, dueño: 'KT-guerrero', regla: 'G18 berserker: Titán +3.8 % frente a Gladiador +16.6 % (diferencia 12.9 puntos > 5)' },
  { key: 'G18:piromante', medido: 0.112, objetivo: 0.05, dueño: 'KT-maga', regla: 'G18 piromante: Invocadora +22.1 % frente a Cronomante +10.9 % (diferencia 11.2 puntos > 5)' },
  { key: 'G18:crionte', medido: 0.094, objetivo: 0.05, dueño: 'KT-maga', regla: 'G18 crionte: Escriba Rúnica +27.6 % frente a Invocadora +18.2 % (diferencia 9.4 puntos > 5)' },
  // S-maga (revisión: la build Rayo con el Rayo base, sin Cadena): su Rayo en línea pierde un 17 % de ÁREA×5 de
  // Nv70 a Nv80 contra los mismos enemigos (con Cadena ganaba un 11 %; ningún nodo del Cronomante solo lo
  // explica: la manada muere antes y llega desalineada). Con Cadena se cumplía (Cronomante +17 %, Escriba +20 %). KT-maga
  { key: 'G18:arcanista', medido: 0.089, objetivo: 0.05, dueño: 'KT-maga', regla: 'G18 arcanista: Cronomante +15.1 % frente a Escriba Rúnica +24.0 % (diferencia 8.9 puntos > 5)' },
  // S-guerrero (sensación, hallazgos recomendados; ronda 2). Sin la trampa del Remolino (antes ×0,58 con él), el Berserker
  // rinde lo que su rotación: el criterio (a) (con el Remolino ≥ ×0,9 en UNI a Nv50) deja su TTK de jefe en ~32 s (sin
  // Remolino, ~30 s) y la media de Nv50 en 44,8 s (tras fusionar las 3 clases vuelve a la banda). A Nv10 el giro aún pesa
  // ×1,29 (sin Rajar ni Salto, el kit sin él es Tajo y Hendidura). La Carga de Escudo a 8 m/s (G10) le quita al Guardián
  // el segundo de avance de las cargas cortas (más Terremotos: jefe en 30,9 s). G9/G18: dueño KT-guerrero
  // Remolino a Nv10 (G3 de «Decisiones de sensación»): el dueño lo deja para la calibración de después de los ítems
  { key: '1A:guerrero:10:ttkE', medido: 4.069, objetivo: [4.5, 10.5], dueño: 'KA-guerrero', nota: 'decisión del dueño: E4b', regla: 'guerrero Nv10: TTK élite 4.07s fuera de 4.5,10.5' },
  { key: '1A:guerrero:10:ttkB', medido: 31.183, objetivo: [35, 100], dueño: 'KA-guerrero', nota: 'decisión del dueño: E4b', regla: 'guerrero Nv10: TTK jefe 31.2s fuera de 35,100' },
  { key: '1A:guerrero:50:ttkB', medido: 31.683, objetivo: [35, 100], dueño: 'KA-guerrero', regla: 'guerrero Nv50: TTK jefe 31.7s fuera de 35,100' },
  // Fusión de la sensación de las 3 clases (S-maga + S-guerrero + S-arquera): con Guerrero y Arquera más fuertes sube la
  // media de Nv50. La Tiradora (×0,74 en UNI) y la Arcanista (×0,748 en ÁREA, al filo) quedan bajo su suelo de papel;
  // la media de TTK de jefe de Nv50 vuelve a la banda (sale 1A:media:50:ttkB). Calibración entre clases: E4b
  { key: 'ROL:tiradora:50:min:uni', medido: 0.747, objetivo: 0.85, dueño: 'E4b', regla: 'tiradora Nv50: UNI ×0.75 de la media (< ×0.85)' },
  { key: 'ROL:arcanista:50:min:area', medido: 0.711, objetivo: 0.75, dueño: 'E4b', regla: 'arcanista Nv50: AREA ×0.71 de la media (< ×0.75)' },
  { key: 'ROL:berserker:50:ttkB', medido: 31.683, objetivo: [36, 108], dueño: 'KA-guerrero', regla: 'berserker Nv50: TTK jefe 31.7s fuera de 36,108' },
  { key: 'ROL:guardian:50:ttkB', medido: 30.925, objetivo: [36, 130], dueño: 'KA-guerrero', regla: 'guardian Nv50: TTK jefe 30.9s fuera de 36,130' },
  { key: 'ROL:cruzado:50:ttkE', medido: 3.458, objetivo: [3.6, 12.6], dueño: 'KA-guerrero', regla: 'cruzado Nv50: TTK élite 3.46s fuera de 3.6,12.6' },
  { key: 'G9:berserker:100:estampida:area', medido: 0.824, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv100 berserker: Estampida Sin Fin no gana ÁREA×5 (×0.82 de Danza Carmesí)' },
  { key: 'G9:guardian:100:guardia:ttdp', medido: 0.266, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv100 guardian: Guardia Total no gana TTD+ (×0.27 de Montaña Viva)' },
  { key: 'G9:cruzado:100:santa:apoyo', medido: 0.958, objetivo: 1, dueño: 'KT-guerrero', regla: 'G9 Nv100 cruzado: Tierra Santa no gana APOYO (×0.96 de Tribunal)' },
  { key: 'G9:francotiradora:100:vigia:mixto', medido: 0.976, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv100 francotiradora: Atalaya Eterna no gana mixto (×0.98 de Pulso de Hierro)' },
  // S-arquera (A7, forja por build): Pulso de Hierro compra Sobrepenetración y Línea de Mira, que piden
  // que la saeta atraviese (needsForm), así que deja Tiro Pesado por el Disparo Apuntado base; con eso
  // es la mejor en mixto a Nv100 por un 2 % (una híbrida no debe ganar). Calibración de la híbrida: E4b
  { key: 'G9:francotiradora:100:pulso:noBest:mixto', medido: 1.025, objetivo: "< 1", dueño: 'KT-arquera', regla: 'G9 Nv100 francotiradora: la híbrida Pulso de Hierro es la mejor en mixto (×1.02)' },
  { key: 'G9:montaraz:100:campo:area', medido: 0.871, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv100 montaraz: Tierra Arrasada no gana ÁREA×5 (×0.87 de Bosque Vivo)' },
  { key: 'G9:montaraz:100:caceria:uni', medido: 0.893, objetivo: 1, dueño: 'KT-arquera', regla: 'G9 Nv100 montaraz: Gran Cacería no gana UNI (×0.89 de Espinas de Caza)' },
  { key: 'G9:montaraz:100:espinas:noBest:uni', medido: 1.103, objetivo: "< 1", dueño: 'KT-arquera', regla: 'G9 Nv100 montaraz: la híbrida Espinas de Caza es la mejor en UNI (×1.10)' },
  { key: 'G9:montaraz:100:espinas:min:area', medido: 0.741, objetivo: 0.8, dueño: 'KT-arquera', regla: 'G9 Nv100 montaraz: la híbrida Espinas de Caza queda a ×0.74 de la mejor en ÁREA×5 (≥ ×0.8)' },
  { key: 'G18:tiradora', medido: 0.08, objetivo: 0.05, dueño: 'KT-arquera', regla: 'G18 tiradora: Carcaj Encantado +8.1 % frente a Errante del Viento +16.1 % (diferencia 8.0 puntos > 5)' },
  // S-arquera (A7): con la forja por build (Línea Mortal y Pulso de Hierro sin Tiro Pesado) y Punto Débil y
  // Vigía rehechos, la diferencia entre héroes pasa de 5
  { key: 'G18:francotiradora', medido: 0.064, objetivo: 0.05, dueño: 'KT-arquera', regla: 'G18 francotiradora: Errante del Viento +12.5 % frente a Halconera +6.1 % (diferencia 6.4 puntos > 5)' },
];

// ---------------- comprobaciones ----------------
// cada regla deja { key, msg, value?, target?, owner? }; la clave no lleva números (estable)
function checker() {
  const fails = [];
  const chk = (key, ok, msg, extra = {}) => { if (!ok) fails.push({ key, msg, ...extra }); return ok; };
  return { fails, chk };
}
const inR = (v, [lo, hi]) => v >= lo && v <= hi;
// parte de la definitiva en UNI: la de daño, por atribución; la que refuerza (Furia Inmortal),
// por lo que baja el UNI sin ella en la barra; la defensiva (Ciudadela) no entra (null)
function ultShareOf(kind, uni, k4, noUlt) {
  if (!k4 || !kind || kind === 'def') return null;
  if (kind === 'dmg') return uni.total > 0 ? (uni.by[k4] || 0) / uni.total : 0;
  const u0 = noUlt();
  return uni.dps > 0 ? Math.max(0, 1 - u0.dps / uni.dps) : 0;
}

// ---------------- 1. filas de clase (1A + 2b.2) ----------------
export function runBench({ classes = ['guerrero', 'maga', 'arquera'], levels = [1, 5, 10, 25, 50], torment = [[50, 10]], seed = 1 } = {}) {
  const rows = [];
  const cases = [...levels.map(L => ({ L, T: 0 })), ...torment.map(([L, T]) => ({ L, T }))];
  for (const c of classes) for (const { L, T } of cases) {
    const al = CM.areaLevelForHero(L);
    const ref = refEnemies(al, T);
    const row = { cls: c, L, T, al };
    for (const b of ['tipico', 'optimo']) {
      const mk = (variant = 'ofensiva') => hero(c, L, b, { al, torment: T, variant, seed });
      const n = simulate(mk(), ref.common, 24, { kind: 'common', ref });
      const e = simulate(mk(), ref.elite, 6, { kind: 'elite', ref });
      const bo = simulate(mk(), ref.boss, 2, { kind: 'boss', ref });
      const def = mk('defensiva');
      const top = [n, e, bo].reduce((a, x) => (x.maxHit > a.maxHit ? x : a));
      row[b] = { ttkN: n.ttk, ttkE: e.ttk, ttkB: bo.ttk, dps: bo.dps, maxHit: top.maxHit, maxHitBy: top.maxHitBy,
        ttd: ttdPack(def, ref, al), ttdPlus: ttdPlus(def, ref, al) };
      if (b === 'tipico' && T === 0) {
        const off = mk();
        const hp = ref.boss * UNI_LIFE / Math.max(1, bo.ttk);
        row.uni = simulateUni(off, ref, UNI_T, { hp });
        row.uniBar = { ...off.hotbar };
        row.uniBasic = simulateUni(mk('basico'), ref, UNI_T, { hp });
        const wb = off.cls.skills.find(s => s.id === off.hotbar.lmb);
        row.basicHit = off.avgHit(resolveSkill(off, wb).coef, 0);
        row.wd = off.avgHit(1, 0);
        row.spec = off._benchSpec; row.build = off._benchBuild;
        row.ultKind = ultKind(off);
        row.ult = ultShareOf(row.ultKind, row.uni, off.hotbar.k4, () => simulateUni(hero(c, L, b, { al, seed, bar: { k4: null } }), ref, UNI_T, { hp }));
      }
    }
    row.bossHp = ref.boss;
    row.ratio = row.optimo.dps / row.tipico.dps;
    rows.push(row);
  }
  return rows;
}
export function checkRows(rows, C = checker()) {
  const { chk } = C;
  for (const r of rows) {
    const id = `${r.cls} Nv${r.L}${r.T ? ' T' + r.T : ''}`, K = `1A:${r.cls}:${r.L}${r.T ? 'T' + r.T : ''}`;
    if (r.T === 0) {
      const t = r.tipico, R = TARGETS.cls;
      chk(`${K}:ttkN`, inR(t.ttkN, R.ttkN), `${id}: TTK común ${f1(t.ttkN)}s fuera de ${R.ttkN}`, { value: t.ttkN, target: R.ttkN });
      chk(`${K}:ttkE`, inR(t.ttkE, R.ttkE), `${id}: TTK élite ${f1(t.ttkE)}s fuera de ${R.ttkE}`, { value: t.ttkE, target: R.ttkE });
      const bw = r.L === 1 ? TARGETS.bossNv1 : r.L < 10 ? TARGETS.bossRamp : R.ttkB;
      chk(`${K}:ttkB`, inR(t.ttkB, bw), `${id}: TTK jefe ${f1(t.ttkB)}s fuera de ${bw}`, { value: t.ttkB, target: bw });
      chk(`${K}:ttd`, inR(t.ttd, R.ttd), `${id}: TTD manada ${f1(t.ttd)}s fuera de ${R.ttd}`, { value: t.ttd, target: R.ttd });
      chk(`${K}:ttdPlus`, t.ttdPlus >= t.ttd - 1e-6, `${id}: TTD+ con defensa (${f1(t.ttdPlus)}) < TTD sin ella (${f1(t.ttd)})`);
      if (r.L >= 10) chk(`${K}:ratio`, inR(r.ratio, TARGETS.ratio), `${id}: óptimo/típico ×${r.ratio.toFixed(1)} fuera de ${TARGETS.ratio}`, { value: r.ratio, target: TARGETS.ratio });
      const u = r.uni, bar = r.uniBar;
      if (r.L >= 5 && bar.rmb) chk(`${K}:basicOnly`, r.uniBasic.dps <= TARGETS.basicOnly * u.dps, `${id}: «solo básico» ×${(r.uniBasic.dps / u.dps).toFixed(2)} de la rotación (> ${TARGETS.basicOnly})`, { value: r.uniBasic.dps / u.dps, target: TARGETS.basicOnly });
      if (r.L >= ULT_MIN_LEVEL && bar.k4 && r.ult != null) {
        const sh = r.ult;
        chk(`${K}:ult`, inR(sh, TARGETS.ultShare), `${id}: la definitiva ${bar.k4} aporta ${pct(sh)} del daño UNI${r.ultKind === 'buff' ? ' (sin ella baja eso)' : ''} (objetivo 12–22 %)`, { value: sh, target: TARGETS.ultShare });
      }
      // ninguna principal trampa: la de 🖱️Der y la de 2 con enfriamiento
      for (const slot of ['rmb', 'k2']) {
        const sid = bar[slot]; if (!sid) continue;
        const sk = CLASSES[r.cls].skills.find(s => s.id === sid);
        if (sk.cat !== 'spender') continue;
        if (slot === 'k2' && !((sk.cd || 0) > 0)) continue;
        const sh = (u.by[sid] || 0) / u.total;
        const per = u.uses[sid] ? (u.by[sid] || 0) / u.uses[sid] : 0;
        chk(`${K}:trap:${sid}:share`, sh >= TARGETS.spenderShare, `${id}: principal trampa ${sid} (${slot}) aporta ${pct(sh)} del daño UNI (< ${pct(TARGETS.spenderShare)})`, { value: sh, target: TARGETS.spenderShare });
        const area = (sk.tags || []).some(t => t === 'area' || t === 'cone' || t === 'line');
        const need = (area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse) * r.basicHit;
        chk(`${K}:trap:${sid}:perUse`, per >= need, `${id}: principal trampa ${sid}: ${f1(per)} por uso < ${area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse}× el básico (${f1(r.basicHit)})`, { value: per / r.basicHit, target: area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse });
      }
    }
    chk(`${K}:maxHit`, r.optimo.maxHit <= r.bossHp * TARGETS.maxHitBoss, `${id}: un golpe óptimo (${r.optimo.maxHitBy}) quita ${(r.optimo.maxHit / r.bossHp * 100).toFixed(0)}% de la vida del jefe`, { value: r.optimo.maxHit / r.bossHp, target: TARGETS.maxHitBoss });
  }
  for (const L of [...new Set(rows.map(r => r.L))]) {
    const rs = rows.filter(r => r.L === L && r.T === 0);
    if (rs.length < 2) continue;
    const mean = k => rs.reduce((a, r) => a + r.tipico[k], 0) / rs.length;
    const M = TARGETS.mean;
    for (const k of ['ttkN', 'ttkE', 'ttd']) chk(`1A:media:${L}:${k}`, inR(mean(k), M[k]), `Nv${L}: media ${k} ${f1(mean(k))} fuera de ${M[k]}`, { value: mean(k), target: M[k] });
    if (L >= 10) {
      chk(`1A:media:${L}:ttkB`, inR(mean('ttkB'), M.ttkB), `Nv${L}: media TTK jefe ${f1(mean('ttkB'))}s fuera de ${M.ttkB}`, { value: mean('ttkB'), target: M.ttkB });
      const bs = rs.map(r => r.tipico.ttkB);
      chk(`1A:media:${L}:spread`, Math.max(...bs) / Math.min(...bs) <= TARGETS.classSpread, `Nv${L}: dispersión de TTK de jefe entre clases ×${(Math.max(...bs) / Math.min(...bs)).toFixed(1)}`, { value: Math.max(...bs) / Math.min(...bs), target: TARGETS.classSpread });
    }
  }
  for (const c of ['guerrero', 'maga', 'arquera']) {
    const t0 = rows.find(r => r.cls === c && r.L === 50 && r.T === 0);
    const t10 = rows.find(r => r.cls === c && r.L === 50 && r.T === 10);
    if (!t0 || !t10) continue;
    chk(`1A:${c}:T10:slower`, t10.tipico.ttkB > t0.tipico.ttkB * 1.5, `${c}: T10 no es más lento de matar (${f1(t10.tipico.ttkB)}s vs ${f1(t0.tipico.ttkB)}s)`);
    chk(`1A:${c}:T10:deadlier`, t10.tipico.ttd < t0.tipico.ttd * 0.8, `${c}: T10 no es más peligroso (TTD ${f1(t10.tipico.ttd)}s vs ${f1(t0.tipico.ttd)}s)`);
  }
  return C;
}

// ---------------- 2. matriz de rol (2e §7.2) ----------------
// variante defensiva: la ranura 2 con la defensa base de la clase si la barra no trae una defensa
export function defBarOf(spec) {
  const c = SPEC_CLASS[spec];
  return { k2: CLASS_DEF[c] };
}
function hasDefK2(p) { const s = p.cls.skills.find(x => x.id === p.hotbar.k2); return s?.cat === 'defense'; }
export function runSpecs({ level = 50, seed = 1, specs = ALL_SPECS } = {}) {
  const al = CM.areaLevelForHero(level);
  const ref = refEnemies(al);
  const mk = (spec, variant = 'ofensiva', gear = 'tipico') => {
    const p = hero(SPEC_CLASS[spec], level, gear, { al, seed, spec, variant });
    if (variant === 'defensiva' && !hasDefK2(p)) return hero(SPEC_CLASS[spec], level, gear, { al, seed, spec, variant, bar: defBarOf(spec) });
    return p;
  };
  const allyHp = specs.reduce((s, sp) => s + mk(sp).stats.maxHP, 0) / specs.length;
  const rows = [];
  for (const spec of specs) {
    const row = { spec, cls: SPEC_CLASS[spec], L: level };
    const n = simulate(mk(spec), ref.common, 24, { kind: 'common', ref });
    const e = simulate(mk(spec), ref.elite, 6, { kind: 'elite', ref });
    const b = simulate(mk(spec), ref.boss, 2, { kind: 'boss', ref });
    Object.assign(row, { ttkN: n.ttk, ttkE: e.ttk, ttkB: b.ttk, bossHp: ref.boss });
    const hp = ref.boss * UNI_LIFE / Math.max(1, b.ttk);
    const h0 = mk(spec);
    row.bar = { ...h0.hotbar };
    row.build = h0._benchBuild;
    row.uni = simulateUni(h0, ref, UNI_T, { hp });
    row.uniBasic = simulateUni(mk(spec, 'basico'), ref, UNI_T, { hp });
    row.area = areaSim(mk(spec), ref);
    row.ctl = controlSim(mk(spec), ref);
    row.breaks = row.uni.breaks / (row.uni.t / 60);
    const dp = mk(spec, 'defensiva');
    row.defK2 = dp.hotbar.k2;
    // TTD (analítico, sin mitigación activa) ANTES de simular: la simulación deja posturas, buffs y
    // escudos puestos en el héroe (el Guardián acababa en Muralla y daba un TTD de 26 s en vez de 10)
    row.ttd = ttdPack(dp, ref, al);
    row.ttdp = ttdPlusSim(dp, ref, { defAtCd: true });
    row.apoyo = apoyoSim(mk(spec), ref, { hp, allyHp });
    const ob = simulate(mk(spec, 'ofensiva', 'optimo'), ref.boss, 2, { kind: 'boss', ref });
    row.optMaxHit = ob.maxHit; row.optMaxHitBy = ob.maxHitBy;
    row.ultKind = ultKind(h0);
    row.ult = ultShareOf(row.ultKind, row.uni, row.bar.k4, () => simulateUni(hero(SPEC_CLASS[spec], level, 'tipico', { al, seed, spec, bar: { k4: null } }), ref, UNI_T, { hp }));
    rows.push(row);
  }
  return rows;
}
function roleMetric(r, k) {
  if (k === 'uni') return r.uni.dps;
  if (k === 'area') return r.area.dps;
  if (k === 'ttdp') return r.ttdp;
  if (k === 'apoyo') return r.apoyo.dpsShare;
  if (k === 'ctl') return r.ctl.slow;
  return 0;
}
const meanOf = (rows, f) => rows.reduce((s, r) => s + f(r), 0) / rows.length;
export function checkSpecs(rows, C = checker()) {
  const { chk } = C;
  const M = { uni: meanOf(rows, r => r.uni.dps), area: meanOf(rows, r => r.area.dps), ttdp: meanOf(rows, r => r.ttdp) };
  const S = TARGETS.spec;
  for (const r of rows) {
    const id = `${r.spec} Nv${r.L}`, K = `ROL:${r.spec}:${r.L}`;
    const R = TARGETS.role[r.spec];
    for (const [k, v] of Object.entries(R?.min || {})) {
      const x = roleMetric(r, k) / M[k];
      chk(`${K}:min:${k}`, x >= v - 1e-9, `${id}: ${k.toUpperCase()} ×${x.toFixed(2)} de la media (< ×${v})`, { value: x, target: v });
    }
    const A = R?.abs || {};
    if (A.apoyoDps != null) chk(`${K}:apoyoDps`, r.apoyo.dpsShare >= A.apoyoDps, `${id}: APOYO ${pct(r.apoyo.dpsShare)} del DPS de un aliado (< ${pct(A.apoyoDps)})`, { value: r.apoyo.dpsShare, target: A.apoyoDps });
    if (A.apoyoHeal != null) chk(`${K}:apoyoHeal`, r.apoyo.heal >= A.apoyoHeal, `${id}: APOYO cura ${r.apoyo.heal.toFixed(2)} %/s al grupo (< ${A.apoyoHeal})`, { value: r.apoyo.heal, target: A.apoyoHeal });
    if (A.slow != null) chk(`${K}:slow`, r.ctl.slow >= A.slow, `${id}: CONTROL ${pct(r.ctl.slow)} del tiempo ralentizados/inmovilizados (< ${pct(A.slow)})`, { value: r.ctl.slow, target: A.slow });
    if (A.hard != null) chk(`${K}:hard`, r.ctl.hard >= A.hard, `${id}: CONTROL ${pct(r.ctl.hard)} del tiempo con control duro (< ${pct(A.hard)})`, { value: r.ctl.hard, target: A.hard });
    if (A.breaks != null) chk(`${K}:breaks`, r.breaks >= A.breaks, `${id}: ${r.breaks.toFixed(1)} Quebrantados/min contra el jefe (< ${A.breaks})`, { value: r.breaks, target: A.breaks });
    if (R?.best) {
      const mine = roleMetric(r, R.best);
      const others = rows.filter(o => o.cls === r.cls && o.spec !== r.spec);
      const top = Math.max(0, ...others.map(o => roleMetric(o, R.best)));
      const need = r.spec === 'guardian' ? R.ttdpVsClass : TARGETS.bestBy;
      chk(`${K}:best:${R.best}`, mine >= top * need - 1e-9, `${id}: ${R.best.toUpperCase()} no es la mejor de su clase por ×${need} (${f1(mine)} frente a ${f1(top)})`, { value: top > 0 ? mine / top : Infinity, target: need });
    }
    chk(`${K}:ttkN`, inR(r.ttkN, S.ttkN), `${id}: TTK común ${f1(r.ttkN)}s fuera de ${S.ttkN}`, { value: r.ttkN, target: S.ttkN });
    chk(`${K}:ttkE`, inR(r.ttkE, S.ttkE), `${id}: TTK élite ${f1(r.ttkE)}s fuera de ${S.ttkE}`, { value: r.ttkE, target: S.ttkE });
    const bw = r.spec === 'guardian' ? [S.ttkB[0], S.guardianBoss] : S.ttkB;
    chk(`${K}:ttkB`, inR(r.ttkB, bw), `${id}: TTK jefe ${f1(r.ttkB)}s fuera de ${bw}`, { value: r.ttkB, target: bw });
    chk(`${K}:ttd`, inR(r.ttd, S.ttd), `${id}: TTD manada ${f1(r.ttd)}s fuera de ${S.ttd}`, { value: r.ttd, target: S.ttd });
    if (r.bar.k4 && r.ult != null) chk(`${K}:ult`, inR(r.ult, TARGETS.ultShare), `${id}: la definitiva ${r.bar.k4} aporta ${pct(r.ult)} del daño UNI${r.ultKind === 'buff' ? ' (sin ella baja eso)' : ''} (objetivo 12–22 %)`, { value: r.ult, target: TARGETS.ultShare });
    chk(`${K}:basicOnly`, r.uniBasic.dps <= TARGETS.basicOnly * r.uni.dps, `${id}: «solo básico» ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} de la rotación (> ${TARGETS.basicOnly})`, { value: r.uniBasic.dps / r.uni.dps, target: TARGETS.basicOnly });
    chk(`${K}:maxHit`, r.optMaxHit <= r.bossHp * TARGETS.maxHitBoss, `${id}: un golpe óptimo (${r.optMaxHitBy}) quita ${(r.optMaxHit / r.bossHp * 100).toFixed(0)}% de la vida del jefe`, { value: r.optMaxHit / r.bossHp, target: TARGETS.maxHitBoss });
  }
  const bs = rows.map(r => r.ttkB);
  if (rows.length > 1) chk(`ROL:spread:${rows[0].L}`, Math.max(...bs) / Math.min(...bs) <= S.bossSpread, `Nv${rows[0].L}: jefe más lento ×${(Math.max(...bs) / Math.min(...bs)).toFixed(2)} el más rápido (> ×${S.bossSpread})`, { value: Math.max(...bs) / Math.min(...bs), target: S.bossSpread });
  return C;
}

// ---------------- 3. G9: las 12 builds de cada clase ----------------
// full: los cinco escenarios para todas (informe); si no, UNI, ÁREA×5 y lo que pida G9 en su
// especialización. UNI contra un jefe de 1,5× la vida de referencia (90 s a 60 s de TTK de 1A)
export function runBuilds({ level, seed = 1, specs = ALL_SPECS, full = false } = {}) {
  const al = CM.areaLevelForHero(level), ref = refEnemies(al);
  const hp = ref.boss * UNI_LIFE / 60;
  const allyHp = specs.reduce((s, sp) => s + hero(SPEC_CLASS[sp], level, 'tipico', { al, seed, spec: sp }).stats.maxHP, 0) / specs.length;
  const rows = [];
  for (const spec of specs) {
    const c = SPEC_CLASS[spec];
    const need = full ? new Set(['ctl', 'ttdp', 'apoyo']) : g9Needs(spec);
    for (const { key, name, arch, build } of buildsFor(c, spec)) {
      const mk = (variant = 'ofensiva') => {
        const p = hero(c, level, 'tipico', { al, seed, spec, build: key, variant });
        return variant === 'defensiva' && !hasDefK2(p) ? hero(c, level, 'tipico', { al, seed, spec, build: key, variant, bar: defBarOf(spec) }) : p;
      };
      const row = { spec, cls: c, build: key, name, arch, hero: build.hero, L: level };
      const h0 = mk();
      const u = simulateUni(h0, ref, UNI_T, { hp });
      row.uni = u.dps;
      row.breaks = u.breaks / (u.t / 60);
      row.perfect = u.perfect; row.planted = u.planted;
      row.ultKind = ultKind(h0);
      row.ult = row.ultKind === 'dmg' && u.total > 0 ? (u.by[h0.hotbar.k4] || 0) / u.total : null;
      row.by = Object.fromEntries(Object.entries(u.by).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => [k, v / u.total]));
      row.area = areaSim(mk(), ref).dps;
      if (need.has('ctl')) { const ct = controlSim(mk(), ref); row.ctl = ct.slow; row.hard = ct.hard; row.hardRoot = ct.hardRoot; }
      if (need.has('ttdp')) row.ttdp = ttdPlusSim(mk('defensiva'), ref, { defAtCd: true, extrapolate: true });
      if (need.has('apoyo')) { const a = apoyoSim(mk(), ref, { hp, allyHp }); row.apoyo = a.heal; row.apoyoDps = a.dpsShare; }
      rows.push(row);
    }
  }
  // mixto (Arquera §12.1): media de UNI y ÁREA×5, cada uno frente a la mejor de su especialización
  for (const spec of specs) {
    const rs = rows.filter(r => r.spec === spec);
    const bu = Math.max(...rs.map(r => r.uni)), ba = Math.max(...rs.map(r => r.area));
    for (const r of rs) r.mixto = (r.uni / bu + r.area / ba) / 2;
  }
  return rows;
}
const SC_NAME = { uni: 'UNI', area: 'ÁREA×5', ctl: 'CONTROL', ttdp: 'TTD+', apoyo: 'APOYO', mixto: 'mixto' };
export function checkG9(rows, C = checker()) {
  const { chk } = C;
  const L = rows[0]?.L;
  for (const [c, G] of Object.entries(G9)) for (const [spec, S] of Object.entries(G.specs)) {
    const rs = rows.filter(r => r.spec === spec);
    if (!rs.length) continue;
    const best = s => Math.max(...rs.map(r => r[s] ?? -Infinity));
    const by = k => rs.find(r => r.build === k);
    // cada arquetipo gana su escenario
    for (const [bk, s] of Object.entries(S.win)) {
      const r = by(bk); if (!r) continue;
      const top = rs.filter(o => o !== r).reduce((a, o) => ((o[s] ?? -Infinity) > (a?.[s] ?? -Infinity) ? o : a), null);
      const ratio = top && top[s] > 0 ? r[s] / top[s] : Infinity;
      chk(`G9:${spec}:${L}:${bk}:${s}`, ratio >= 1 - 1e-9, `G9 Nv${L} ${spec}: ${r.name} no gana ${SC_NAME[s]} (×${ratio.toFixed(2)} de ${top?.name})`,
        { value: ratio, target: 1, cls: c, spec, build: bk, scenario: s });
    }
    const h = by(S.hybrid); if (!h) continue;
    if (G.rule === 'min') {
      const ratios = S.over.map(s => [s, h[s] / best(s)]);
      const [ws, worst] = ratios.reduce((a, x) => (x[1] < a[1] ? x : a));
      chk(`G9:${spec}:${L}:${S.hybrid}:hibrida`, worst >= G.hybridMin - 1e-9, `G9 Nv${L} ${spec}: la híbrida ${h.name} queda a ×${worst.toFixed(2)} de la mejor en ${SC_NAME[ws]} (≥ ×${G.hybridMin})`,
        { value: worst, target: G.hybridMin, cls: c, spec, build: S.hybrid, scenario: ws });
    } else {
      for (const s of ['uni', 'area', 'mixto']) {
        const others = Math.max(...rs.filter(r => r !== h).map(r => r[s]));
        chk(`G9:${spec}:${L}:${S.hybrid}:noBest:${s}`, h[s] < others, `G9 Nv${L} ${spec}: la híbrida ${h.name} es la mejor en ${SC_NAME[s]} (×${(h[s] / others).toFixed(2)})`,
          { value: h[s] / others, target: '< 1', cls: c, spec, build: S.hybrid, scenario: s });
        const need = s === 'mixto' ? G.mixMin : G.pureMin;
        const ratio = h[s] / best(s);
        chk(`G9:${spec}:${L}:${S.hybrid}:min:${s}`, ratio >= need - 1e-9, `G9 Nv${L} ${spec}: la híbrida ${h.name} queda a ×${ratio.toFixed(2)} de la mejor en ${SC_NAME[s]} (≥ ×${need})`,
          { value: ratio, target: need, cls: c, spec, build: S.hybrid, scenario: s });
      }
    }
  }
  return C;
}

// ---------------- 4. G18: aporte del árbol héroe ----------------
// el mismo héroe a Nv80 (10 nodos del árbol héroe) y a Nv70 (el Paragon ya abierto: solo su nodo
// clave, gratis) contra los enemigos del Nv80;
// aporte = media del +% de UNI y de ÁREA×5. Por especialización, la media de las builds de cada árbol
export function runHero({ seed = 1, specs = ALL_SPECS, lo = 70, hi = 80 } = {}) {
  const al = CM.areaLevelForHero(hi), ref = refEnemies(al);
  const hp = ref.boss * UNI_LIFE / 60;
  const rows = [];
  for (const spec of specs) {
    const c = SPEC_CLASS[spec];
    for (const { key, name, build } of buildsFor(c, spec)) {
      const m = L => {
        const mk = () => hero(c, L, 'tipico', { al, seed, spec, build: key });
        return { uni: simulateUni(mk(), ref, UNI_T, { hp }).dps, area: areaSim(mk(), ref).dps };
      };
      const a = m(hi), b = m(lo);
      rows.push({ spec, cls: c, build: key, name, tree: build.hero, uniUp: a.uni / b.uni - 1, areaUp: a.area / b.area - 1,
        aporte: (a.uni / b.uni + a.area / b.area) / 2 - 1 });
    }
  }
  return rows;
}
export function heroTrees(rows) {
  const out = [];
  for (const spec of [...new Set(rows.map(r => r.spec))]) {
    const rs = rows.filter(r => r.spec === spec);
    const trees = [...new Set(rs.map(r => r.tree))];
    const t = trees.map(id => {
      const xs = rs.filter(r => r.tree === id);
      const name = talentTreesFor(SPEC_CLASS[spec]).hero.find(h => h.id === id)?.name || id;
      return { id, name, aporte: xs.reduce((s, r) => s + r.aporte, 0) / xs.length, builds: xs.map(r => r.build) };
    });
    out.push({ spec, cls: SPEC_CLASS[spec], trees: t, diff: t.length === 2 ? Math.abs(t[0].aporte - t[1].aporte) : 0 });
  }
  return out;
}
export function checkG18(trees, C = checker()) {
  const { chk } = C;
  for (const s of trees) {
    const [a, b] = s.trees;
    chk(`G18:${s.spec}`, s.diff <= TARGETS.g18.diff + 1e-9, `G18 ${s.spec}: ${a.name} +${(a.aporte * 100).toFixed(1)} % frente a ${b.name} +${(b.aporte * 100).toFixed(1)} % (diferencia ${(s.diff * 100).toFixed(1)} puntos > 5)`,
      { value: s.diff, target: TARGETS.g18.diff, cls: s.cls, spec: s.spec });
  }
  return C;
}

// ---------------- impresión ----------------
export function printRows(rows) {
  console.log('clase    Nv  T  AL | TÍPICO TTK común/élite/jefe  TTD  TTD+ | ÓPTIMO común/élite/jefe  TTD  | opt/típ  golpeMáx/vidaJefe');
  for (const r of rows) {
    const t = r.tipico, o = r.optimo;
    console.log(`${r.cls.padEnd(8)} ${String(r.L).padStart(3)} ${String(r.T).padStart(2)} ${String(r.al).padStart(3)} | ` +
      `${f1(t.ttkN).padStart(5)} ${f1(t.ttkE).padStart(5)} ${f1(t.ttkB).padStart(6)}  ${f1(t.ttd).padStart(5)} ${f1(t.ttdPlus).padStart(5)} | ` +
      `${f1(o.ttkN).padStart(5)} ${f1(o.ttkE).padStart(5)} ${f1(o.ttkB).padStart(6)}  ${f1(o.ttd).padStart(5)} | ` +
      `×${r.ratio.toFixed(1).padStart(4)}   ${(o.maxHit / r.bossHp * 100).toFixed(1)}% ${o.maxHitBy || ''}`);
  }
  console.log('\nUNI (típico, 60 s a un jefe de 90 s de vida) — reparto del daño por habilidad');
  for (const r of rows.filter(x => x.uni)) {
    const parts = Object.entries(r.uni.by).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([k, v]) => `${k} ${pct(v / r.uni.total)}${r.uni.uses[k] ? `·${r.uni.uses[k]}u` : ''}`).join(' · ');
    console.log(`${r.cls.padEnd(8)} Nv${String(r.L).padStart(3)} ${String(r.spec || '—').padEnd(14)} | DPS ${f1(r.uni.dps).padStart(7)} (${(r.uni.dps / r.wd).toFixed(2)} WD/s) · solo básico ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} | ${parts}`);
  }
}
export function printSpecs(rows) {
  const M = { uni: meanOf(rows, r => r.uni.dps), area: meanOf(rows, r => r.area.dps), ttdp: meanOf(rows, r => r.ttdp) };
  console.log(`\nMATRIZ DE ROL (típico Nv${rows[0]?.L} T0, build por defecto; ×M = frente a la media de las 9 · TTD+ con la defensa en 2)`);
  console.log('spec            build       |  UNI         |  ÁREA×5      |  TTD+  (2)              | APOYO dps/cura | CONTROL duro/d+inm/lento Q/min | jefe  élite común TTD | ult  básico perf plant');
  for (const r of rows) {
    console.log(`${r.spec.padEnd(15)} ${String(r.build).padEnd(11)} | ${f1(r.uni.dps).padStart(7)} ×${(r.uni.dps / M.uni).toFixed(2)} | ` +
      `${f1(r.area.dps).padStart(7)} ×${(r.area.dps / M.area).toFixed(2)} | ${f1(r.ttdp).padStart(5)} ×${(r.ttdp / M.ttdp).toFixed(2)} ${String(r.defK2).padEnd(10)} | ` +
      `${pct(r.apoyo.dpsShare).padStart(4)} ${r.apoyo.heal.toFixed(2).padStart(5)}%/s | ${pct(r.ctl.hard).padStart(4)} ${pct(r.ctl.hardRoot).padStart(4)} ${pct(r.ctl.slow).padStart(4)} ${r.breaks.toFixed(1).padStart(4)} | ` +
      `${f1(r.ttkB).padStart(5)} ${f1(r.ttkE).padStart(5)} ${f1(r.ttkN).padStart(4)} ${f1(r.ttd).padStart(5)} | ${pct(r.ult).padStart(4)} ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} ${r.uni.perfect == null ? '  —' : pct(r.uni.perfect).padStart(4)} ${pct(r.uni.planted).padStart(4)}`);
  }
  console.log(`M: UNI ${f1(M.uni)} · ÁREA×5 ${f1(M.area)} · TTD+ ${f1(M.ttdp)}`);
  console.log('Reparto UNI por especialización:');
  for (const r of rows) {
    const parts = Object.entries(r.uni.by).sort((a, b) => b[1] - a[1]).slice(0, 7)
      .map(([k, v]) => `${k} ${pct(v / r.uni.total)}${r.uni.uses?.[k] ? `·${r.uni.uses[k]}u` : ''}`).join(' · ');
    console.log(`  ${r.spec.padEnd(15)} [${['rmb', 'k1', 'k2', 'k3', 'k4'].map(s => r.bar[s] || '—').join(' ')}] ${parts}`);
  }
}
export function printBuilds(rows) {
  const L = rows[0]?.L;
  console.log(`\nG9 · BUILDS Nv${L} (típico; ×1,00 = la mejor de su especialización en ese escenario)`);
  console.log('spec            build        arquetipo                     héroe   |   UNI         ÁREA×5       CONTROL  TTD+       APOYO  mixto | ult  perf');
  for (const spec of [...new Set(rows.map(r => r.spec))]) {
    const rs = rows.filter(r => r.spec === spec);
    const best = s => Math.max(...rs.map(r => r[s] ?? -Infinity));
    const rel = (r, s) => (best(s) > 0 ? (r[s] / best(s)).toFixed(2) : ' —  ');
    const cell = (r, s, w = 6) => (r[s] == null ? '—'.padStart(w + 6) : `${f1(r[s]).padStart(w)} ×${rel(r, s)}`);
    for (const r of rs) {
      console.log(`${spec.padEnd(15)} ${r.build.padEnd(12)} ${String(r.arch).slice(0, 29).padEnd(29)} ${String(r.hero).padEnd(7)} | ${cell(r, 'uni', 7)} ${cell(r, 'area', 7)} ${r.ctl == null ? '     —  ' : `${pct(r.ctl).padStart(4)} ×${rel(r, 'ctl')}`} ${cell(r, 'ttdp', 5)} ${r.apoyo == null ? '      —' : `${r.apoyo.toFixed(2)} ×${rel(r, 'apoyo')}`} ${(r.mixto ?? 0).toFixed(2)} | ${pct(r.ult).padStart(4)} ${r.perfect == null ? '  —' : pct(r.perfect)}`);
    }
  }
}
export function printHero(rows, trees) {
  console.log('\nG18 · APORTE DEL ÁRBOL HÉROE (Nv80 frente a Nv70 contra los enemigos del Nv80; mixto = media de UNI y ÁREA×5)');
  for (const s of trees) {
    const t = s.trees.map(x => `${x.name} ${sgn(x.aporte)} (${x.builds.map(b => { const r = rows.find(y => y.spec === s.spec && y.build === b); return `${b} ${sgn(r.aporte)}`; }).join(', ')})`).join(' · ');
    console.log(`  ${s.spec.padEnd(15)} ${t} · diferencia ${(s.diff * 100).toFixed(1)} puntos`);
  }
}

// ---------------- medianas de N semillas ----------------
function medRows(runs, keyOf, fields) {
  return runs[0].map(base => {
    const same = runs.map(rs => rs.find(r => keyOf(r) === keyOf(base)));
    const out = { ...base };
    for (const f of fields) {
      const vals = same.map(r => f.get(r)).filter(v => v != null && !Number.isNaN(v));
      if (vals.length) f.set(out, med(vals));
    }
    return out;
  });
}
const num = k => ({ get: r => r[k], set: (o, v) => { o[k] = v; } });
const sub = (a, b) => ({ get: r => r[a]?.[b], set: (o, v) => { o[a] = { ...o[a], [b]: v }; } });
const SPEC_FIELDS = [num('ttkN'), num('ttkE'), num('ttkB'), num('ttd'), num('ttdp'), num('ult'), num('breaks'), num('optMaxHit'),
  sub('uni', 'dps'), sub('uni', 'perfect'), sub('uni', 'planted'), sub('area', 'dps'), sub('apoyo', 'dpsShare'), sub('apoyo', 'heal'),
  sub('ctl', 'hard'), sub('ctl', 'hardRoot'), sub('ctl', 'slow'),
  { get: r => r.uniBasic.dps / r.uni.dps, set: (o, v) => { o.uniBasic = { ...o.uniBasic, dps: v * o.uni.dps }; } }];
const BUILD_FIELDS = ['uni', 'area', 'ctl', 'hard', 'hardRoot', 'ttdp', 'apoyo', 'apoyoDps', 'ult', 'perfect', 'planted', 'breaks'].map(num);
export function seedRuns(n, { specLevels = [50, 70], buildLevels = G9_LEVELS, full = true } = {}) {
  const seeds = Array.from({ length: n }, (_, i) => i + 1);
  const out = { n, specs: {}, builds: {}, hero: null, perSeed: {} };
  for (const L of specLevels) {
    const runs = seeds.map(seed => runSpecs({ level: L, seed }));
    out.specs[L] = medRows(runs, r => r.spec, SPEC_FIELDS);
    out.perSeed[`ROL${L}`] = runs.map(rs => checkSpecs(rs).fails.map(f => f.key));
  }
  for (const L of buildLevels) {
    const runs = seeds.map(seed => runBuilds({ level: L, seed, full }));
    const rows = medRows(runs, r => `${r.spec}:${r.build}`, BUILD_FIELDS);
    for (const spec of ALL_SPECS) {
      const rs = rows.filter(r => r.spec === spec);
      const bu = Math.max(...rs.map(r => r.uni)), ba = Math.max(...rs.map(r => r.area));
      for (const r of rs) r.mixto = (r.uni / bu + r.area / ba) / 2;
    }
    out.builds[L] = rows;
    out.perSeed[`G9:${L}`] = runs.map(rs => checkG9(rs).fails.map(f => f.key));
  }
  const hr = seeds.map(seed => runHero({ seed }));
  const hrow = medRows(hr, r => `${r.spec}:${r.build}`, ['uniUp', 'areaUp', 'aporte'].map(num));
  out.hero = { rows: hrow, trees: heroTrees(hrow) };
  out.perSeed.G18 = hr.map(rs => checkG18(heroTrees(rs)).fails.map(f => f.key));
  return out;
}

// ---------------- ejecución ----------------
// modo rápido (afirma, semilla 1): filas de clase, matriz de rol Nv50, G9 a Nv70 y Nv100 y G18
export function quickRun({ seed = 1, levels = G9_LEVELS } = {}) {
  const C = checker();
  const rows = runBench({ seed });
  checkRows(rows, C);
  const specs = runSpecs({ level: 50, seed });
  checkSpecs(specs, C);
  const builds = {};
  for (const L of levels) { builds[L] = runBuilds({ level: L, seed }); checkG9(builds[L], C); }
  const heroRows = runHero({ seed });
  const trees = heroTrees(heroRows);
  checkG18(trees, C);
  return { rows, specs, builds, heroRows, trees, fails: C.fails };
}
// compara los fallos con PENDING_E4B: { nuevos, arreglados }
export function diffPending(fails, pending = PENDING_E4B) {
  const got = new Set(fails.map(f => f.key)), want = new Set(pending.map(p => p.key));
  return { nuevos: fails.filter(f => !want.has(f.key)), arreglados: pending.filter(p => !got.has(p.key)) };
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const t0 = Date.now();
  const levels = (argOf('--levels') || '').split(',').map(Number).filter(x => x > 0);
  const Q = quickRun({ levels: levels.length ? levels : G9_LEVELS });
  const nSeeds = argOf('--seeds') ? Math.max(1, parseInt(argOf('--seeds'), 10) || 5) : 0;
  if (REPORT || nSeeds) {
    printRows(Q.rows);
    printSpecs(Q.specs);
    for (const L of Object.keys(Q.builds)) printBuilds(Q.builds[L]);
    printHero(Q.heroRows, Q.trees);
  }
  let S = null;
  if (nSeeds) {
    S = seedRuns(nSeeds);
    console.log(`\n================ MEDIANAS DE ${nSeeds} SEMILLAS ================`);
    for (const L of Object.keys(S.specs)) printSpecs(S.specs[L]);
    for (const L of Object.keys(S.builds)) printBuilds(S.builds[L]);
    printHero(S.hero.rows, S.hero.trees);
    const C = checker();
    if (S.specs[50]) checkSpecs(S.specs[50], C);
    for (const L of Object.keys(S.builds)) checkG9(S.builds[L], C);
    checkG18(S.hero.trees, C);
    console.log(`\nMedianas fuera de objetivo (${C.fails.length}):\n - ` + C.fails.map(f => f.msg).join('\n - '));
    S.fails = C.fails;
  }
  const jsonPath = argOf('--json');
  if (jsonPath) {
    writeFileSync(jsonPath, JSON.stringify({ fecha: new Date().toISOString(), semilla1: { fails: Q.fails, specs: Q.specs, builds: Q.builds, hero: Q.trees, heroRows: Q.heroRows,
      rows: Q.rows.map(r => ({ cls: r.cls, L: r.L, T: r.T, al: r.al, tipico: r.tipico, optimo: r.optimo, ratio: r.ratio, spec: r.spec, build: r.build })) }, medianas: S }, null, 1));
    console.log(`(JSON en ${jsonPath})`);
  }
  const { nuevos, arreglados } = diffPending(Q.fails);
  console.log(`\nSemilla 1: ${Q.fails.length} reglas fuera de objetivo · ${PENDING_E4B.length} pendientes de calibración (E4b)`);
  if (nuevos.length) console.log('FUERA DE OBJETIVO Y NO PENDIENTES:\n - ' + nuevos.map(f => `${f.key} · ${f.msg}`).join('\n - '));
  if (arreglados.length) console.log('PENDIENTES QUE YA SE CUMPLEN (sácalos de PENDING_E4B):\n - ' + arreglados.map(p => `${p.key} · ${p.regla}`).join('\n - '));
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  if ((nuevos.length || arreglados.length) && !REPORT && !nSeeds) { console.error('❌ BANCO DE BALANCE: los fallos no coinciden con PENDING_E4B'); process.exit(1); }
  if (!nuevos.length && !arreglados.length) console.log('✅ BANCO DE BALANCE: fuera de objetivo solo lo pendiente de calibración (E4b)');
}
