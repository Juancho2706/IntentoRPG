// ============================================================
// Catálogo de habilidades de la MAGA (Maná) — dueño: KA-maga (Paso 2, E2)
// ============================================================
// Catálogo 2g (docs/paso2g-maga-coherencia.md §5 y Anexo A.7; datos congelados del mockup
// docs/mockups/data/talents-v2-maga.js; formato de docs/paso2-implementacion.md §3.5):
//  · kit BASE (toda Maga, Nv1–8): Dardo Arcano, Bola de Fuego, Parpadeo, Barrera de Maná y
//    Nova de Hielo;
//  · kit de cada ESPECIALIZACIÓN (`spec`, D7: solo con ella activa): insignia Nv10, movilidad o
//    utilidad Nv12, principal Nv14 y definitiva Nv15;
//  · las 6 activas de TALENTO (D29: kind 'talent', solo la ranura 2, req del catálogo); los
//    nodos de talentos-maga.js / hero-maga.js las conceden con `grant`.
// Fuera (A.6): Ascua, Toque Gélido, Armadura de Hielo, Onda Repulsora y las activas v1 de las
// especializaciones (las traduce save-legacy-maga.js).
// Comportamientos propios (MAGA_SKILL_BEHAVIORS) solo donde no basta un tipo genérico; cada uno
// declara en `params` las claves propias que lee y lee la definición FORJADA (cast.sk / prof.def).
// Las activas que ya existían (Bloque de Hielo, Inversión del Tiempo, Contrahechizo) usan el
// comportamiento de su mismo id en js/powers-maga.js (KT-maga: coordinación por ids). S-maga: también
// viven allí orbe_arcano (el Orbe, con malla THREE y Cargas), desgarro_canal (el haz ancho del
// Desgarro) y v_haz_concentrado (el tic del Haz sin fin), porque leen y gastan el indicador.
// Forja recomendada: MAGA_FORGE_RECO es la de cada especialización; cada build de la Arcanista
// declara la suya encima (builds[key].forge en talents-maga.js, M-11/T5).
// Solo importa datos puros: skill-defs.js y sus propios VFX (spec-mechanics y powers lo importan).
// FORJA (KA2, 2f §2 y A.7): MAGA_SKILL_FORGE (Mejora + 2 variantes de las 17 habilidades con
// forja), MAGA_FORGE_RECO y el comportamiento de forja v_parpadeo_onda; los poderes `v_*` de
// las variantes viven en js/powers-forge-maga.js y sus VFX en MAGA_FORGE_FX (fx-skills-maga.js).
import { projFanOffset, COLDBLOOD_CRIT } from './skill-defs.js';
import { MAGA_FX_PRESETS, MAGA_FORGE_FX } from './fx-skills-maga.js';

export const MAGA_SKILLS = [
  // ---------------- KIT BASE ----------------
  // speed = la del básico de la Maga (Player.basicAttack): la Mejora la multiplica
  { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', req: 1, coef: 1.05, gen: 3, speed: 13, color: 0xcc66ff,
    line: 'Dispara un dardo a 9 m. Cada impacto te devuelve 3 de maná.',
    desc: 'Lanza un dardo arcano que vuela 9 m (105 % del daño de arma) y recupera 3 de Maná al impactar.' },
  // la explosión del kit base es de 100 % (el Piromante la sube a 350 % con su pasiva, p_ignicion)
  { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'area', 'fire'], elem: 'fire',
    type: 'proj', req: 2, coef: 2.2, splash: 1.0, radius: 2, cost: 18, cd: 1.5, windup: 0.3, speed: 13, range: 12, size: 0.26, color: 0xff6622,
    line: 'Lanza una bola que golpea y explota a 2 m a su alrededor.',
    desc: 'Tras 0,3 s de lanzamiento, una esfera ardiente: 220 % de daño al objetivo y una explosión de 100 % a los enemigos a 2 m. Cuesta 18 de Maná; enfriamiento 1,5 s.' },
  { id: 'm_parpadeo', name: 'Parpadeo', icon: '💫', cat: 'movement', slots: ['k1'], tags: ['movement', 'arcane'], elem: 'arcane',
    type: 'blink', req: 4, cd: 12, range: 8, color: 0x99aaff,
    line: 'Te teletransportas 8 m hacia el cursor, atravesando enemigos.',
    desc: 'Te teletransportas al instante 8 m hacia el cursor (atraviesas enemigos, no muros). Enfriamiento 12 s.' },
  { id: 'm_barrera', name: 'Barrera de Maná', icon: '🔮', cat: 'defense', slots: ['k2'], tags: ['defense', 'shield', 'arcane'], elem: 'arcane',
    behavior: 'm_barrera', req: 6, cd: 20, dur: 8, shieldManaPct: 60, color: 0xb98cff, rankText: { '60 %': 'shieldManaPct' },
    line: 'Escudo que absorbe daño igual al 60 % de tu maná máximo; dura 8 s.',
    desc: 'Una burbuja de maná absorbe daño igual al 60 % de tu Maná máximo durante 8 s. Enfriamiento 20 s.' },
  { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', cat: 'spender', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'cc', 'frost'], elem: 'frost',
    type: 'area', at: 'self', req: 8, coef: 1.4, cost: 25, cd: 4, radius: 3.3, slow: 3, slowPct: 30, color: 0x66ccff,
    line: 'Onda de hielo a tu alrededor (3,3 m): daña y ralentiza un 30 % 3 s.',
    desc: 'Una onda gélida a tu alrededor (3,3 m): 140 % de daño y ralentiza un 30 % durante 3 s. Cuesta 25 de Maná; enfriamiento 4 s.' },

  // ---------------- KIT DEL PIROMANTE ----------------
  // Llamarada: cono que primero hace ESTALLAR las quemaduras (consume su daño restante) y luego golpea
  { id: 'p_llamarada', name: 'Llamarada', icon: '🔥', cat: 'spec', spec: 'piromante', slots: ['k3'], tags: ['spec', 'cone', 'fire'], elem: 'fire',
    type: 'cone', behavior: 'llamarada', req: 10, coef: 1.5, cost: 25, cd: 8, radius: 7, angle: 70, windup: 0.1, detonatePct: 60, color: 0xff7a22,
    line: 'Cono de fuego de 7 m; hace estallar las quemaduras (60 % de lo que les queda).',
    desc: 'Un cono de fuego de 7 m y 70° (preparación de 0,1 s): hace estallar las Quemaduras de los golpeados (el 60 % de su daño restante, al instante) y después golpea con un 150 %. Cuesta 25 de Maná; enfriamiento 8 s.' },
  { id: 'm_estela_ignea', name: 'Estela Ígnea', icon: '♨️', cat: 'movement', spec: 'piromante', slots: ['k1'], tags: ['movement', 'zone', 'fire'], elem: 'fire',
    behavior: 'm_estela_ignea', req: 12, coef: 0.4, cd: 10, range: 6, lockT: 0.2, radius: 0.75, dur: 3, color: 0xff7733,
    line: 'Te deslizas 6 m y dejas el suelo ardiendo 3 s.',
    desc: 'Te deslizas 6 m hacia la mira dejando un rastro de fuego de 1,5 m de ancho durante 3 s: 40 % de daño por segundo a quien lo pisa. Enfriamiento 10 s.' },
  { id: 'meteoro', name: 'Meteoro', icon: '☄️', cat: 'spender', spec: 'piromante', slots: ['rmb', 'k2'], tags: ['spender', 'area', 'fire'], elem: 'fire',
    type: 'area', at: 'target', req: 14, coef: 3.7, cost: 40, cd: 6, radius: 3, range: 11, impactDelay: 0.6, shake: 0.5, color: 0xff4400,
    line: 'Un meteoro cae donde apuntas a los 0,6 s y golpea en 3 m.',
    desc: 'Invoca un meteoro que se estrella 0,6 s después en la zona elegida (3 m): 370 % de daño. Cuesta 40 de Maná; enfriamiento 6 s.' },
  // tres ondas (ningún golpe suelto pasa del ~21 % de la vida de un jefe: banco 2b.2) y Quemadura al final
  { id: 'm_u_supernova', name: 'Supernova', icon: '🌟', cat: 'ultimate', spec: 'piromante', slots: ['k4'], tags: ['ultimate', 'area', 'fire'], elem: 'fire',
    behavior: 'm_u_supernova', at: 'self', req: 15, coef: 4.7, pulses: 3, pulseGap: 0.25, burn: 12, burnT: 6, cd: 50, radius: 5,
    windup: 0.15, impactDelay: 0.5, shake: 0.6, color: 0xffcc44,
    line: 'Creas una estrella que estalla 3 veces a tu alrededor y deja a todos quemándose.',
    desc: 'Definitiva: una estrella se forma sobre ti y, 0,5 s después, estalla en tres ondas de 470 % a 5 m (1410 % en total); deja una Quemadura de 1200 % en 6 s. Enfriamiento 50 s.' },

  // ---------------- KIT DEL CRIONTE ----------------
  // Prisión de Hielo: congela a su alrededor; las 2 capas las pone el indicador de Escarcha
  // (mech-maga.js lee `layers` de la definición forjada en cada golpe de Hielo)
  { id: 'k_prision', name: 'Prisión de Hielo', icon: '🏔️', cat: 'spec', spec: 'crionte', slots: ['k3'], tags: ['spec', 'area', 'cc', 'frost'], elem: 'frost',
    type: 'area', at: 'self', behavior: 'prision_hielo', req: 10, coef: 0.8, cost: 25, cd: 12, radius: 4, windup: 0.12, freeze: 2, layers: 2, color: 0x88ddff,
    line: 'Encierras en hielo 2 s a los enemigos a 4 m y les pones 2 capas de Escarcha.',
    desc: 'Encierras en hielo a los enemigos a 4 m de ti (preparación de 0,12 s): quedan Congelados 2 s, reciben un 80 % de daño y 2 capas de Escarcha. A los jefes, el hielo les llena la barra de Quebranto. Cuesta 25 de Maná; enfriamiento 12 s.' },
  // el hielo del camino GOLPEA cada segundo (30 %): son golpes de Hielo reales y el indicador pone 1 capa
  { id: 'm_paso_escarcha', name: 'Paso de Escarcha', icon: '🧊', cat: 'movement', spec: 'crionte', slots: ['k1'], tags: ['movement', 'zone', 'frost'], elem: 'frost',
    behavior: 'm_paso_escarcha', req: 12, coef: 0.3, cd: 10, range: 6, lockT: 0.2, radius: 0.75, dur: 3, slow: 0.6, slowPct: 40, color: 0x9fe3ff,
    line: 'Te deslizas 6 m dejando hielo 3 s que ralentiza un 40 % y pone 1 capa por segundo.',
    desc: 'Te deslizas 6 m hacia la mira dejando un camino de hielo de 1,5 m de ancho durante 3 s: ralentiza un 40 % a quien lo pisa y cada segundo le hace un 30 % de daño de Hielo (1 capa de Escarcha). Enfriamiento 10 s.' },
  { id: 'k_lanza', name: 'Lanza de Hielo', icon: '🔱', cat: 'spender', spec: 'crionte', slots: ['rmb', 'k2'], tags: ['spender', 'proj', 'frost'], elem: 'frost',
    type: 'proj', behavior: 'lanza_hielo', req: 14, coef: 2.6, cost: 30, cd: 4, speed: 20, range: 12, size: 0.22, pierce: true, frozenMult: 3, color: 0xaeeaff,
    line: 'Lanza que atraviesa en línea 12 m; a los Congelados les hace el triple.',
    desc: 'Una lanza cristalina que atraviesa a todos en línea (12 m): 260 % de daño, el triple a los enemigos Congelados. Cuesta 30 de Maná; enfriamiento 4 s.' },
  { id: 'm_u_tormenta', name: 'Tormenta Glacial', icon: '🌨️', cat: 'ultimate', spec: 'crionte', slots: ['k4'], tags: ['ultimate', 'zone', 'frost'], elem: 'frost',
    behavior: 'm_u_tormenta', follow: 'owner', req: 15, coef: 0.9, cd: 50, radius: 4, dur: 8, interval: 0.5, color: 0xbfe9ff,
    line: 'Una ventisca te sigue 8 s: daña cada 0,5 s a 4 m y pone 1 capa por golpe.',
    desc: 'Definitiva: una ventisca te sigue durante 8 s y golpea cada 0,5 s a los enemigos a 4 m (90 % por golpe, 1440 % en total); cada golpe pone 1 capa de Escarcha. Enfriamiento 50 s.' },

  // ---------------- KIT DEL ARCANISTA ----------------
  // Orbe Arcano (S-maga, auditoría M-01): no choca con nadie; DESCARGA a su alrededor mientras viaja,
  // se detiene al final y vuelve a ti. coef = cada descarga; back.coef = el golpe al cruzar de vuelta.
  // El comportamiento (orbe_arcano) vive en js/powers-maga.js: da la Carga al recogerlo
  { id: 'a_orbe', name: 'Orbe Arcano', icon: '🔵', cat: 'spec', spec: 'arcanista', slots: ['k3'], tags: ['spec', 'proj', 'arcane'], elem: 'arcane',
    type: 'proj', behavior: 'orbe_arcano', req: 10, coef: 0.45, cost: 20, cd: 8, speed: 6, range: 12, minRange: 5, size: 0.34,
    zap: { every: 0.25, n: 2, radius: 3.5 }, park: 2, back: { speed: 10, coef: 0.8, radius: 0.9, max: 3 }, color: 0xb388ff,
    line: 'Un orbe viaja hacia la mira descargando rayos a 2 enemigos cercanos; se detiene 2 s y vuelve a ti.',
    desc: 'Un orbe arcano viaja despacio hacia la mira (de 5 a 12 m; se para en los muros) sin chocar con nadie: cada 0,25 s descarga un rayo a 2 enemigos a 3,5 m, repartidos entre todos los que tiene cerca (45 % cada uno). Al final se detiene 2 s girando y descargando; después vuelve a ti, golpea al pasar (80 %) y al recogerlo te da 1 Carga Arcana. Cuesta 20 de Maná; enfriamiento 8 s.' },
  // Sello del Archimago: aura en el suelo que abarata tus hechizos mientras estás dentro (stat
  // costPct: todas las habilidades con coste, cola W2d). La Carga cada 2 s la da el indicador de
  // Cargas (mech-maga.js) al dueño dentro de su Sello
  { id: 'a_sello', name: 'Sello del Archimago', icon: '🔯', cat: 'utility', spec: 'arcanista', slots: ['k2'], tags: ['utility', 'aura', 'arcane'], elem: 'arcane',
    type: 'aura', at: 'self', req: 12, cd: 20, radius: 4, dur: 8, buff: { costPct: -30 }, color: 0xe0b0ff, rankText: { '30 %': 'buff.costPct' },
    line: 'Círculo de 4 m durante 8 s: dentro, tus hechizos cuestan un 30 % menos y ganas 1 Carga cada 2 s.',
    desc: 'Dibujas un círculo de 4 m a tus pies durante 8 s: mientras estás dentro, tus hechizos con coste cuestan un 30 % menos y ganas 1 Carga Arcana cada 2 s. Enfriamiento 20 s.' },
  // violeta (el de las Cargas, #b996ff): el Rayo es arcano, no eléctrico (M-08)
  { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', spec: 'arcanista', slots: ['rmb', 'k2'], tags: ['spender', 'line', 'arcane'], elem: 'arcane',
    type: 'line', req: 14, coef: 2.4, cost: 22, cd: 2, range: 15, width: 1.2, lockT: 0.3, color: 0xb996ff,
    line: 'Rayo de 15 m que atraviesa en línea y gasta tus Cargas: +35 % de daño y 5 de maná por Carga.',
    desc: 'Un rayo arcano de 15 m que golpea a todos en línea (240 %). Gasta todas tus Cargas Arcanas: +35 % de daño y 5 de Maná por Carga. Cuesta 22 de Maná; enfriamiento 2 s.' },
  // canalizado y plantado (moveMul 0): la Mejora de la forja deja moverse despacio. S-maga (M-12): un haz
  // ANCHO hacia la mira que atraviesa a todos (desgarro_canal, js/powers-maga.js), un golpe cada 0,25 s
  // con una rampa de +10 % por golpe hasta +100 % (Incinerar de D4). Sin tickNow: el 1.er golpe llega a los
  // 0,25 s y soltar antes devuelve los 50 s de enfriamiento (el motor). El halo del haz vivo mide lo que
  // golpea (2,5 m) y es el núcleo el que crece ×2 al tope; la grieta del suelo marca la franja
  { id: 'm_u_desgarro', name: 'Desgarro Arcano', icon: '🌌', cat: 'ultimate', spec: 'arcanista', slots: ['k4'], tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', behavior: 'desgarro_canal', unstoppable: true, moveMul: 0, req: 15, coef: 0.65, channelT: 3, ticks: 12,
    rampPerTic: 10, rampMax: 100, cd: 50, range: 10, width: 2.5, beam: { width: 2.5, core: 0.4, color: 0xa86cf5, coreColor: 0xead6ff, line: true }, color: 0xd28cff,
    line: 'Canalizas 3 s un haz gigante de 2,5 m que atraviesa a todos y crece hasta +100 %; te da Cargas.',
    desc: 'Definitiva: mantén la tecla para canalizar 3 s un rayo arcano gigante de 10 m y 2,5 m de ancho hacia la mira: cada 0,25 s golpea a todos los que atraviesa (65 %, +10 % por golpe hasta +100 %) y cada golpe te da 1 Carga Arcana. No te mueves y eres imparable mientras dura. Si lo sueltas antes del primer golpe, no gasta el enfriamiento. Enfriamiento 50 s.' },

  // ---------------- ACTIVAS DE TALENTO (ranura 2; las concede su nodo) ----------------
  { id: 'm_t_bloque', art: 'skills256/m_t_bloque.webp', name: 'Bloque de Hielo', icon: '🧊', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'frost'], elem: 'frost',
    behavior: 'm_t_bloque', req: 21, cd: 90, dur: 4, color: 0x9fe3ff,
    line: 'Te encierras en hielo 4 s: no recibes daño, pero no te mueves.',
    desc: 'Te encierras en hielo: eres inmune durante 4 s, pero no puedes moverte ni atacar (la esquiva lo rompe antes). Enfriamiento 90 s.' },
  { id: 'm_t_inversion', art: 'skills256/m_t_inversion.webp', name: 'Inversión del Tiempo', icon: '⏳', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane',
    behavior: 'm_t_inversion', req: 27, cd: 60, color: 0xd7c2ff,
    line: 'Vuelves a la vida y al lugar que tenías hace 5 s.',
    desc: 'Vuelves a la vida y a la posición que tenías hace 5 s (el tiempo se graba desde que conoces esta habilidad). Enfriamiento 60 s.' },
  { id: 'm_t_contrahechizo', art: 'skills256/m_t_contrahechizo.webp', name: 'Contrahechizo', icon: '🚫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'arcane'], elem: 'arcane',
    behavior: 'm_t_contrahechizo', req: 31, cd: 18, range: 12, color: 0xcc88ff,
    line: 'Corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s.',
    desc: 'Cortas el hechizo de un enemigo a 12 m y lo dejas mudo 3 s; a los jefes les llenas la barra de Quebranto. Enfriamiento 18 s.' },
  { id: 'm_h_detener', art: 'skills256/m_h_detener.webp', name: 'Detener el Tiempo', icon: '⌛', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'area', 'cc', 'arcane'], elem: 'arcane',
    behavior: 'm_h_detener', req: 72, cd: 75, radius: 8, dur: 3, color: 0xd7c2ff,
    line: 'Paras el tiempo 3 s a 8 m: los enemigos quedan quietos.',
    desc: 'Paras el tiempo a tu alrededor: los enemigos a 8 m quedan quietos 3 s (los jefes, no: se les llena la barra de Quebranto). Enfriamiento 75 s.' },
  // las 3 runas las escribe el poder de las Runas (Escriba Rúnica, e0) en ③ afterCast, sobre
  // cast.runeSpots (lo deja este comportamiento)
  { id: 'm_h_palabra', art: 'skills256/m_h_palabra.webp', name: 'Palabra de Poder', icon: '📜', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'arcane'], elem: 'arcane',
    behavior: 'm_h_palabra', req: 72, cd: 40, runes: 3, radius: 1.8, color: 0xe0b0ff,
    line: 'Escribes al instante 3 runas a tu alrededor: formas un Sello donde estás.',
    desc: 'Escribes al instante 3 runas a 1,8 m de ti: forman un Sello donde estás. Enfriamiento 40 s.' },
  { id: 'm_h_constructo', art: 'skills256/m_h_constructo.webp', name: 'Llamar Constructo', icon: '🗿', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'summon', 'taunt', 'arcane'], elem: 'arcane',
    behavior: 'm_h_constructo', req: 73, cd: 45, dur: 10, radius: 8, range: 6, hpPct: 50, color: 0x9f8cff, rankText: { '50 %': 'hpPct' },
    line: 'Un Constructo aparece 10 s y los enemigos a 8 m lo atacan a él.',
    desc: 'Un Constructo de maná aparece hacia la mira (hasta 6 m) durante 10 s y obliga a los enemigos a 8 m de él a atacarlo; aguanta un 50 % de tu vida máxima. Enfriamiento 45 s.' },
];

// ------------------------------------------------------------
// Comportamientos a medida. Firma: cast(g, p, prof, cast) con cast = { sk (definición
// FORJADA), prof, slot, target, enemy, ctx, done } → ctx.res (instantáneo) o undefined +
// cast.done(ctx.res) al terminar (diferido, vía g.timers.schedule). Solo métodos de Game y
// primitivas documentadas; sin THREE: los vectores salen de .clone() de los que ya existen.
// ------------------------------------------------------------
const STORMS = new WeakMap();   // héroe → Tormenta Glacial activa (una a la vez)

const dist2 = (a, b) => { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; };
// enemigo dentro de un radio (mismo criterio que Game.dealArea: su tamaño cuenta)
const inRadius = (e, c, rad) => { const r = rad + 0.5 * (e.def?.scale || 1); return dist2(e.pos, c) <= r * r; };
const isBoss = e => !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss);
const ground = v => { const o = v.clone(); o.y = 0; return o; };
const fxAt = (g, preset, pos, y) => { if (preset && pos) { const at = pos.clone(); at.y = y; g.emitFx?.(preset, at); } };
// VFX del lanzamiento: los de la habilidad y, encima, los de su VARIANTE forjada (MAGA_FORGE_FX)
const fxOf = cast => {
  const v = MAGA_FORGE_FX[cast.sk?.forged?.varId];
  return v ? { ...(cast.ctx.fx || {}), ...v } : cast.ctx.fx;
};
// dirección horizontal de la mira (o del frente del héroe si la mira está encima)
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  let len = Math.hypot(dx, dz);
  if (len < 1e-3) { const ry = p.group?.rotation?.y || 0; dx = Math.sin(ry); dz = Math.cos(ry); len = 1; }
  const d = p.pos.clone(); d.x = dx / len; d.y = 0; d.z = dz / len;
  return d;
}
// golpe REAL de la habilidad a un enemigo (crítico, ⑤ onHit y efectos del perfil)
function strike(p, ctx, e, coef = ctx.coef) {
  const prof = ctx.prof;
  const { dmg, crit } = p.rollDamage(coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
  const dealt = e.takeDamage(dmg, crit, ctx.dmgOpts) || 0;
  ctx.hit(e, dealt);
  return dealt;
}

// desliz hacia la mira (sin daño): mueve al héroe y devuelve { from, to } (para la estela)
function slide(g, p, prof, cast) {
  const d = aimDir(p, cast.target);
  const dist = prof.range || 6;
  const from = ground(p.pos);
  const look = p.pos.clone(); look.x += d.x; look.z += d.z;
  p.faceToward?.(look);
  let traveled = 0;
  while (traveled < dist) {
    const step = Math.min(0.3, dist - traveled);
    const nx = p.pos.x + d.x * step, nz = p.pos.z + d.z * step;
    if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
    p.pos.x = nx; p.pos.z = nz;
    traveled += step;
    if (cast.ctx.fx?.trail && traveled % 0.9 < 0.3) fxAt(g, cast.ctx.fx.trail, p.pos, 0.4);
  }
  const to = ground(p.pos);
  cast.ctx.zoneCenter = to; cast.ctx.zoneRad = 2;
  return { from, to };
}
// estela en LÍNEA del inicio al final del desliz (campo genérico 'zona'); radius = medio ancho
const trailWidth = prof => Math.max(0.5, 2 * (prof.radius || 0.75));
// distancia² de un punto al segmento a–b (mismo criterio que los campos en línea)
function segDist2(q, a, b) {
  const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz;
  const t = l2 > 1e-9 ? Math.max(0, Math.min(1, ((q.x - a.x) * vx + (q.z - a.z) * vz) / l2)) : 0;
  const dx = q.x - (a.x + vx * t), dz = q.z - (a.z + vz * t);
  return dx * dx + dz * dz;
}
// Muralla de Hielo (forja de la Prisión, type 'wall'): muro en línea perpendicular a la mira,
// donde apuntas, que corta el paso `dur` s (campo genérico 'muro', uno por habilidad). El
// primer roce de cada enemigo es un golpe de Hielo de la habilidad: el indicador le pone su capa
function iceWall(g, p, prof, cast, fx) {
  const { ctx, sk } = cast;
  const w = sk.wall || {};
  const center = ground(cast.target || p.pos);
  const len = (w.len || 8) * (prof.radiusMul || 1), width = w.width || 1;
  const { a, b } = wallLine(p, center, len);
  const color = ctx.color ?? sk.color;
  p.faceToward?.(center);
  const f = g.spawnField?.('muro', { pos: center, radius: len / 2, dur: prof.dur || 3, owner: p, shape: 'line', a, b, width,
    maxPerSkill: 1, data: { blocks: w.blocks ?? true, contain: !!w.contain, color, skill: sk.id, tags: prof.tags } });
  const touched = new Set();
  const touch = () => {
    if (!f || f.dead || !p.alive || g.player !== p) return;
    let n = 0;
    for (const e of g.enemies || []) {
      if (!e.alive || touched.has(e)) continue;
      const r = width / 2 + 0.35 + 0.5 * (e.def?.scale || 1);
      if (segDist2(e.pos, f.a, f.b) <= r * r) { touched.add(e); strike(p, ctx, e); n++; }
    }
    if (n) p.onDealHit();
    g.timers.schedule(0.1, touch);
  };
  touch();
  ctx.zoneCenter = center; ctx.zoneRad = Math.max(1.5, len / 2);
  g.spawnRing?.(center, 1.2, color);
  for (const t of [0.15, 0.5, 0.85]) { const q = a.clone(); q.x += (b.x - a.x) * t; q.z += (b.z - a.z) * t; fxAt(g, fx?.aura, q, 0.4); }
  return ctx.res;
}
function trailField(g, p, prof, cast, from, to, data) {
  const mid = from.clone(); mid.x = (from.x + to.x) / 2; mid.z = (from.z + to.z) / 2;
  return g.spawnField?.('zona', { pos: mid, shape: 'line', a: from, b: to, width: trailWidth(prof), dur: prof.dur || 3, owner: p,
    data: { color: cast.ctx.color ?? cast.sk.color, skill: cast.sk.id, tags: prof.tags, ...data } }) || null;
}

// proyectil propio: el estado del enemigo se mira ANTES del golpe (rollAt), así un poder que
// cambie ese estado al golpear (⑤) no altera la cuenta. Tirada, encadenado, robo de vida y VFX
// como g.fireProjectile; onHit(e, dealt, before) recibe lo que devolvió `peek(e)` antes del golpe
function ownProjectile(g, ctx, { from, to, peek = null, onHit = null, castHits = null }) {
  const { p, prof, sk } = ctx;
  const color = ctx.color ?? sk.color;
  const seen = new Map();
  const at1 = v => { const o = v.clone(); o.y = 1.0; return o; };
  const impact = typeof ctx.fx?.impact === 'string' ? MAGA_FX_PRESETS[ctx.fx.impact] : ctx.fx?.impact;
  g.spawnProjectile({
    from: at1(from), to: at1(to),
    speed: prof.speed, range: prof.range || sk.range || 10, friendly: true, pierce: prof.pierce,
    color, size: sk.size ?? 0.2, castHits,
    rollAt: e => {
      if (peek && e) seen.set(e, peek(e));
      const cb = prof.critBonus + (prof.coldblood && e?.slowT > 0 ? COLDBLOOD_CRIT : 0);
      return p.rollDamage(ctx.coef, cb, prof.addPct + (prof.dmgDirect || 0), e, ctx.hitInfo);
    },
    ...ctx.dmgOpts, hitOpts: ctx.hitExtra || null,
    ...(impact ? { impactPreset: impact } : {}),
    onHit: (e, dealt) => {
      if (e?.alive && !ctx._chained && prof.chain) { ctx._chained = true; g.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], color, prof.chainPct, ctx); }
      ctx.hit(e, dealt);
      if (prof.lifesteal && dealt > 0) p.leech(dealt * prof.lifesteal / 100);
      if (e) { ctx.zoneCenter = ground(e.pos); ctx.zoneRad = 1.5; onHit?.(e, dealt, seen.get(e)); }
    },
  });
}
// segmento del Muro: centro, eje y extremos (perpendicular a la mira, como el tipo genérico wall)
function wallLine(p, center, len) {
  const d = aimDir(p, center);
  const a = center.clone(), b = center.clone();
  a.x += d.z * len / 2; a.z -= d.x * len / 2;
  b.x -= d.z * len / 2; b.z += d.x * len / 2;
  return { a, b, d };
}

// Tormenta Glacial activa del héroe (para los poderes de KT: dónde está, alargarla, crecer).
// → { alive, center(), radius, left (pulsos que quedan), interval } o null
export function magaStorm(p) {
  const s = p ? STORMS.get(p) : null;
  return s?.alive ? s : null;
}

export const MAGA_SKILL_BEHAVIORS = {
  // Barrera de Maná: escudo del X % del maná máximo. Barrera Reforzada (c18) sube la potencia
  // (prof.buffMul) y Escudo Prismático (c4) reduce el daño mientras aguanta (tv.barrierDr)
  m_barrera: {
    params: ['shieldManaPct'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const amt = (sk.shieldManaPct || 60) / 100 * (p.stats.maxMP || 0) * (prof.buffMul || 1);
      g.shield(amt, { target: 'self', dur: prof.dur || 8, src: 'm_barrera', dr: p.tv?.barrierDr || 0 });
      const fx = fxOf(cast);
      g.spawnRing?.(p.pos, 1.4, ctx.color ?? sk.color);
      fxAt(g, fx?.aura, p.pos, 1.0);
      fxAt(g, fx?.extra, p.pos, 1.0);
      return ctx.res;
    },
  },

  // Llamarada: cono (o anillo a tu alrededor si la forja la cambia a type 'area' at 'self').
  // Primero CONSUME las quemaduras de los golpeados (detonatePct % de su daño restante, al
  // instante; Llamarada Avivada lo sube con modifyResolve → prof.detonatePct) y luego golpea
  llamarada: {
    params: ['detonatePct'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const rad = prof.radius || 7;
      const ring = sk.type === 'area' && sk.at === 'self';
      const d = aimDir(p, cast.target);
      p.swing = 1;
      let list;
      if (ring) list = (g.enemies || []).filter(e => e.alive && inRadius(e, p.pos, rad));
      else {
        const look = p.pos.clone(); look.x += d.x; look.z += d.z;
        p.faceToward?.(look);
        list = g.enemiesInCone(p.pos, d, rad, prof.angle || 70);
      }
      const pct = prof.detonatePct ?? sk.detonatePct ?? 60;
      for (const e of list) {
        const rem = g.consumeDoT?.(e, 'burn') || 0;
        if (rem > 0 && pct > 0) {
          g.dealProcDamage(e, rem * pct / 100, { source: `skill:${sk.id}`, skill: sk.id, elem: 'fire', tags: prof.tags });
          fxAt(g, 'fireballBlast', e.pos, 0.8);
        }
      }
      let n = 0;
      for (const e of list) if (e.alive) { strike(p, ctx, e); n++; }
      if (n) p.onDealHit();
      const front = ground(p.pos);
      if (!ring) { front.x += d.x * rad * 0.5; front.z += d.z * rad * 0.5; }
      ctx.zoneCenter = front; ctx.zoneRad = ring ? rad : rad * 0.5;
      const fx = fxOf(cast);
      g.spawnRing?.(front, ctx.zoneRad, ctx.color ?? sk.color);
      fxAt(g, fx?.aura, p.pos, 1.0);
      fxAt(g, fx?.impact, front, 0.8);
      return ctx.res;
    },
  },

  // Estela Ígnea: desliz de 6 m y una franja de fuego del inicio al final (coef = WD por segundo).
  // Muro de Llamas (forja, `blocks`): la franja es el campo p_muro_fuego (powers-maga.js) que
  // corta el paso a los que no son jefes; sin ese campo, el muro genérico (field-entities)
  m_estela_ignea: {
    params: ['blocks'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      const { from, to } = slide(g, p, prof, cast);
      if (sk.blocks) {
        const len = Math.max(0.5, Math.hypot(to.x - from.x, to.z - from.z));
        const ux = (to.x - from.x) / len, uz = (to.z - from.z) / len;
        const mid = from.clone(); mid.x = (from.x + to.x) / 2; mid.z = (from.z + to.z) / 2;
        const width = trailWidth(prof), dur = prof.dur || 3, color = ctx.color ?? sk.color;
        const f = g.spawnField?.('p_muro_fuego', { pos: mid, radius: len / 2, dur, owner: p,
          data: { ux, uz, nx: -uz, nz: ux, half: len / 2, width, blocks: true, dps: ctx.avgHit, skill: sk.id, tags: prof.tags, color, preset: fx?.trail || null } });
        if (!f) g.spawnField?.('muro', { pos: mid, radius: len / 2, dur, owner: p, shape: 'line', a: from, b: to, width, maxPerSkill: 1,
          data: { blocks: true, dps: ctx.avgHit, color, skill: sk.id, tags: prof.tags } });
      } else trailField(g, p, prof, cast, from, to, { dps: ctx.avgHit, interval: 0.5 });
      fxAt(g, fx?.impact, p.pos, 0.6);
      return ctx.res;
    },
  },

  // Supernova: se forma a tu alrededor (at 'self') o en la mira; `pulses` ondas separadas
  // `pulseGap` s tras impactDelay; la última deja la Quemadura (burn WD en burnT s, escala
  // con el rango como el golpe). follow 'owner': cada onda estalla donde estás. `pull`
  // (Gravedad Solar): justo antes de la primera onda atrae `pull` m hacia el centro a los
  // enemigos a radio + `pull` m (a los jefes, Quebranto)
  m_u_supernova: {
    params: ['pulses', 'pulseGap', 'burn', 'burnT'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      const anchor = ground(sk.at === 'self' ? p.pos : (cast.target || p.pos));
      const follow = sk.follow === 'owner';
      const rad = prof.radius || 5;
      const color = ctx.color ?? sk.color;
      const pull = sk.pull || 0;
      if (sk.at !== 'self') p.faceToward?.(anchor);
      g.spawnRing?.(anchor, rad, color);                       // telegrafía
      fxAt(g, fx?.trail, anchor, 4.5);
      const pulses = Math.max(1, Math.floor(sk.pulses || 1));
      const burnTotal = (sk.burn || 0) > 0 ? p.avgHit(ctx.coef * sk.burn / (sk.coef || 1), prof.addPct) : 0;
      const burnT = sk.burnT || 6;
      let n = 0;
      const pulse = () => {
        n++;
        const last = n >= pulses;
        const c = follow ? ground(p.pos) : anchor;
        if (n === 1 && pull > 0) for (const e of g.enemies || []) if (e.alive && inRadius(e, c, rad + pull)) e.displace?.(c, pull, { toward: true, src: p });
        g.dealArea(c, rad, ctx.coef, {
          ...ctx.areaOpts, from: c,
          onHit: (e, dealt) => {
            ctx.hit(e, dealt);
            if (last && e.alive && burnTotal > 0) g.applyDoT?.(e, burnTotal, burnT, 1, undefined, 'm_u_supernova:burn');
          },
        });
        fxAt(g, fx?.impact, c, 0.3);
        fxAt(g, fx?.aura, c, 0.3);
        if (last) fxAt(g, fx?.extra, c, 0.3);
        g.spawnRing?.(c, rad * (last ? 1 : 0.6), color);
        g.addShake?.(last ? (sk.shake || 0.6) : 0.3);
        if (!last) { g.timers.schedule(sk.pulseGap || 0.25, pulse); return; }
        ctx.zoneCenter = c; ctx.zoneRad = rad;
        cast.done(ctx.res);
      };
      g.timers.schedule(prof.impactDelay || 0.5, pulse);
      return undefined;   // diferido: termina con la última onda
    },
  },

  // Prisión de Hielo: congela `freeze` s a los enemigos del área (a tu alrededor o, si la forja
  // la lanza, en la mira) y después los golpea. Primero el hielo: la congelación larga gana a
  // la de 1 s del indicador (5 capas). A los jefes, Enemy.applyCC lo convierte en Quebranto.
  // Forja: at 'enemy' (Celda Lejana) = solo el enemigo de la mira; type 'wall' (Muralla de
  // Hielo) = muro en línea que corta el paso `dur` s y golpea una vez a cada enemigo que lo roza.
  // prof.single (Prisión Profunda, i8B, por modifyResolve): no atrapa en área ni golpea; el poder
  // atrapa a un solo enemigo en ③ afterCast (la Muralla, que es forma de la forja, sigue en pie)
  prision_hielo: {
    params: ['freeze', 'layers'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      if (sk.type === 'wall') return iceWall(g, p, prof, cast, fx);
      const one = sk.at === 'enemy' && cast.enemy?.alive ? cast.enemy : null;
      const center = ground(one ? one.pos : sk.at === 'self' ? p.pos : (cast.target || p.pos));
      const rad = prof.radius || 4;
      if (sk.at !== 'self') p.faceToward?.(center);
      else p.swing = 1;
      if (prof.single) {
        ctx.zoneCenter = center; ctx.zoneRad = 1.5;
        fxAt(g, fx?.aura, center, 0.4);
        return ctx.res;
      }
      const freeze = sk.freeze || 2;
      const list = one ? [one] : (g.enemies || []).filter(e => e.alive && inRadius(e, center, rad));
      for (const e of list) e.applyCC('freeze', freeze, { src: p });
      if (one) { strike(p, ctx, one); p.onDealHit(); }
      else g.dealArea(center, rad, ctx.coef, { ...ctx.areaOpts, from: center });
      ctx.zoneCenter = center; ctx.zoneRad = rad;
      g.spawnRing?.(center, rad, ctx.color ?? sk.color);
      fxAt(g, fx?.aura, center, 0.4);
      fxAt(g, fx?.extra, center, 0.2);
      g.addShake?.(0.25);
      return ctx.res;
    },
  },

  // Paso de Escarcha: desliz de 6 m y un camino de hielo que ralentiza (campo 'zona') y, cada
  // segundo, GOLPEA a quien lo pisa con el coef de la habilidad: golpes de Hielo reales, así el
  // indicador de Escarcha pone 1 capa por segundo
  m_paso_escarcha: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const { from, to } = slide(g, p, prof, cast);
      trailField(g, p, prof, cast, from, to, { dps: 0, interval: 0.25, slow: Math.max(0.5, prof.slow || 0.6), slowPct: prof.slowPct || 40 });
      // un golpe por segundo de vida del camino (el último, al apagarse), a quien esté sobre él
      const half = trailWidth(prof) / 2;
      const pulses = Math.floor((prof.dur || 3) + 1e-6);
      if (ctx.coef > 0) {
        for (let k = 1; k <= pulses; k++) g.timers.schedule(k, () => {
          if (!p.alive || g.player !== p) return;
          let n = 0;
          for (const e of g.enemies || []) if (e.alive && segDist2(e.pos, from, to) <= half * half) { strike(p, ctx, e); n++; }
          if (n) p.onDealHit();
        });
      }
      g.spawnRing?.(p.pos, 1.2, ctx.color ?? sk.color);
      fxAt(g, ctx.fx?.impact, p.pos, 0.6);
      return ctx.res;
    },
  },

  // Lanza de Hielo: `count` lanzas (abanico con `spread`) que atraviesan si `pierce`; a un
  // enemigo que estaba Congelado al llegar, el golpe vale `frozenMult` veces: lo que pasa de 1×
  // va como daño de poder (sin multiplicadores [×] nuevos). Lanza del Invierno lo sube con
  // modifyResolve (prof.frozenMult). Varias lanzas (Abanico Gélido o soporte): un impacto por enemigo
  lanza_hielo: {
    params: ['frozenMult', 'layers'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      p.faceToward?.(cast.target);
      p.swing = 1;
      const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
      const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
      const castHits = n > 1 ? new Set() : null;
      const mult = Math.max(1, prof.frozenMult ?? sk.frozenMult ?? 3);
      const from = ground(p.pos);
      fxAt(g, fx?.trail, p.pos, 1.0);
      for (let i = 0; i < n; i++) {
        const a = base + projFanOffset(i, n, prof.spread);
        const to = from.clone(); to.x += Math.sin(a) * 5; to.z += Math.cos(a) * 5;
        ownProjectile(g, ctx, { from, to, castHits, peek: e => (e.frozenT || 0) > 0 && !isBoss(e),
          onHit: (e, dealt, wasFrozen) => {
            if (!wasFrozen || !(dealt > 0) || mult <= 1 || !e.alive) return;
            g.dealProcDamage(e, dealt * (mult - 1), { source: `skill:${sk.id}`, skill: sk.id, elem: 'frost', tags: prof.tags });
            fxAt(g, fx?.extra, e.pos, 0.8);
          } });
      }
      g.timers.schedule((prof.range || 12) / Math.max(1, prof.speed || 20) + 0.05, () => cast.done(ctx.res));
      return undefined;   // diferido: termina al agotar el alcance
    },
  },

  // Tormenta Glacial: golpes cada `interval` s en `radius` m alrededor de ti (follow 'owner') o
  // fija donde la lanzas (at 'target'; at 'enemy' = sobre el enemigo de la mira); cada golpe de
  // Hielo pone su capa por el indicador. `pulses` (forja) fija el número de golpes; si no, sale
  // de la duración. `freeze` (Granizo): congela antes de cada golpe. Una sola a la vez (magaStorm)
  m_u_tormenta: {
    params: ['interval', 'pulses', 'freeze'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      const prev = STORMS.get(p); if (prev) prev.alive = false;
      const interval = sk.interval || 0.5;
      const on = sk.at === 'enemy' && cast.enemy?.alive ? cast.enemy.pos : null;
      const anchor = ground(on || (sk.at === 'target' || sk.at === 'enemy' ? (cast.target || p.pos) : p.pos));
      const follow = sk.follow === 'owner';
      const inst = { alive: true, interval, radius: prof.radius || 4,
        left: sk.pulses > 0 ? Math.floor(sk.pulses) : Math.max(1, Math.round((prof.dur || 8) / interval)),
        center: () => (follow ? ground(p.pos) : anchor) };
      STORMS.set(p, inst);
      const color = ctx.color ?? sk.color;
      // golpes anclados al lanzamiento (t0 + n·interval): el paso del frame no los retrasa
      const t0 = g.timers.now || 0;
      let n = 0;
      const pulse = () => {
        if (!inst.alive || !p.alive || g.player !== p || (g.state && g.state !== 'play')) { inst.alive = false; return; }
        const c = inst.center();
        if (sk.freeze > 0) for (const e of g.enemies || []) if (e.alive && inRadius(e, c, inst.radius)) e.applyCC('freeze', sk.freeze, { src: p });
        g.dealArea(c, inst.radius, ctx.coef, { ...ctx.areaOpts, from: c });
        fxAt(g, fx?.aura, c, 1.2);
        fxAt(g, fx?.extra, c, 0.3);
        if (inst.left % 2 === 0) g.spawnRing?.(c, inst.radius, color);
        n++;
        if (--inst.left > 0) g.timers.schedule(Math.max(0, t0 + n * inst.interval - (g.timers.now || 0)), pulse);
        else { inst.alive = false; if (STORMS.get(p) === inst) STORMS.delete(p); }
      };
      pulse();   // el primer golpe, al lanzarla
      ctx.zoneCenter = anchor; ctx.zoneRad = inst.radius;
      return ctx.res;
    },
  },

  // (el Orbe Arcano, orbe_arcano, vive en js/powers-maga.js: su malla necesita THREE y al recogerlo
  // da una Carga Arcana; S-maga, auditoría M-01)

  // ---- FORJA (≤ 3 comportamientos nuevos por clase, 2f §7.2): solo el Parpadeo Disruptor ----
  // Parpadeo Disruptor (variante II del Parpadeo, absorbe a la Onda Repulsora): te teletransporta
  // como el Parpadeo y, al llegar, una onda de `radius` m golpea (coef), empuja (mod knock, desde
  // donde llegas) y aturde (mod stun; a los jefes, Quebranto). Destino y llegada como el tipo
  // genérico blink: campo propio (fieldDest) o alcance, y g._arrive (plantado, provocación,
  // detonación y estela que un talento o la forja le pongan al Parpadeo)
  v_parpadeo_onda: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const fx = fxOf(cast);
      const color = ctx.color ?? sk.color;
      const aim = cast.target || p.pos;
      const from = p.pos.clone();
      const to = ctx.fieldDest ? ctx.fieldDest.clone()
        : g.clampWalkable ? g.clampWalkable(p.pos, aim, ctx.destRange || prof.range || 8) : ground(aim);
      g.spawnRing?.(p.pos, 1.0, color);
      fxAt(g, fx?.impact, p.pos, 1.0);
      p.faceToward?.(to);
      p.pos.x = to.x; p.pos.z = to.z;
      const c = ground(p.pos), rad = prof.radius || 4;
      if (ctx.coef > 0) g.dealArea(c, rad, ctx.coef, { ...ctx.areaOpts, from: c });
      ctx.zoneCenter = c; ctx.zoneRad = rad;
      g.spawnRing?.(c, rad, color);
      fxAt(g, fx?.impact, c, 1.0);
      fxAt(g, fx?.aura, c, 0.4);
      fxAt(g, fx?.extra, c, 0.8);
      g.addShake?.(0.2);
      g._arrive?.(ctx, from);
      return ctx.res;
    },
  },

  // Detener el Tiempo: aturde a todos los enemigos a `radius` m durante `dur` s (a los jefes,
  // Enemy.applyCC lo convierte en Quebranto). Las Marcas que guardan el doble: Cronomante (KT)
  m_h_detener: {
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const rad = prof.radius || 8, dur = prof.dur || 3;
      for (const e of g.enemies || []) {
        if (!e.alive || !inRadius(e, p.pos, rad)) continue;
        e.applyCC('stun', dur, { src: p });
        ctx.res.hits++;
      }
      ctx.zoneCenter = ground(p.pos); ctx.zoneRad = rad;
      g.spawnRing?.(p.pos, rad, ctx.color ?? sk.color);
      fxAt(g, ctx.fx?.aura, p.pos, 0.3);
      fxAt(g, ctx.fx?.extra, p.pos, 1.2);
      return ctx.res;
    },
  },

  // Palabra de Poder: marca dónde van las `runes` runas (a `radius` m, repartidas en círculo,
  // la primera hacia la mira) en cast.runeSpots; las escribe el poder de las Runas (e0)
  m_h_palabra: {
    params: ['runes'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const n = Math.max(1, Math.floor(sk.runes || 3));
      const r = prof.radius || 1.8;
      const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
      const spots = [];
      for (let i = 0; i < n; i++) {
        const a = base + i * Math.PI * 2 / n;
        const s = ground(p.pos); s.x += Math.sin(a) * r; s.z += Math.cos(a) * r;
        spots.push(s);
        g.spawnRing?.(s, 0.7, ctx.color ?? sk.color);
        fxAt(g, ctx.fx?.aura, s, 0.2);
      }
      ctx.cast.runeSpots = spots;
      ctx.zoneCenter = ground(p.pos); ctx.zoneRad = r + 1;
      fxAt(g, ctx.fx?.impact, p.pos, 0.6);
      return ctx.res;
    },
  },

  // Llamar Constructo: un señuelo con vida (hpPct % de tu vida máx. × potencia) aparece hacia la
  // mira (hasta `range` m) `dur` s; cada segundo provoca a los enemigos a `radius` m de él
  // (también a los jefes). Si lo destruyen, los enemigos vuelven contigo
  m_h_constructo: {
    params: ['hpPct'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      // donde apuntas si llegas y lo ves; si no, lo más lejos transitable en esa recta
      const aim = cast.target || p.pos, rng = prof.range || 6, grid = g.world?.grid;
      const reach = Math.hypot(aim.x - p.pos.x, aim.z - p.pos.z) <= rng
        && (!grid || (grid.walkable(aim.x, aim.z) && (grid.lineOfSight?.(p.pos.x, p.pos.z, aim.x, aim.z) ?? true)));
      const pos = ground(reach ? aim : (g.clampWalkable ? g.clampWalkable(p.pos, aim, rng) : p.pos));
      const dur = prof.dur || 10, rad = prof.radius || 8;
      const hp = Math.max(1, Math.round((p.stats.maxHP || 1) * (sk.hpPct || 50) / 100 * (prof.buffMul || 1)));
      const color = ctx.color ?? sk.color;
      const foot = g.spawnField?.('zona', { pos, radius: 1.1, dur, owner: p, data: { dps: 0, color, skill: sk.id, tags: prof.tags } }) || null;
      const C = {
        pos, alive: true, hp, maxHP: hp, construct: true, owner: p, skill: sk.id,
        takeDamage(n) {
          if (!this.alive || !(n > 0)) return 0;
          const d = Math.min(this.hp, n);
          this.hp -= n;
          if (this.hp <= 0) end(true);
          return d;
        },
        applySlow() {},
      };
      const t0 = g.timers.now || 0, until = t0 + dur;
      let k = 0;
      const end = (broken) => {
        if (!C.alive) return;
        C.alive = false;
        C.hp = Math.max(0, C.hp);
        if (foot && !foot.dead) foot.t = 0;
        if (broken) fxAt(g, ctx.fx?.impact, C.pos, 1.0);
      };
      const taunt = () => {
        if (!C.alive) return;
        if (!p.alive || g.player !== p || (g.timers.now || 0) >= until - 1e-9) { end(false); return; }
        for (const e of g.enemies || []) if (e.alive && inRadius(e, C.pos, rad)) e.applyCC('taunt', 1.2, { src: C });
        fxAt(g, ctx.fx?.extra, C.pos, 1.4);
        k++;
        g.timers.schedule(Math.max(0, t0 + k - (g.timers.now || 0)), taunt);   // cada segundo, sin deriva
      };
      taunt();
      ctx.res.hits = (g.enemies || []).filter(e => e.alive && e.tauntSrc === C).length;
      ctx.cast.construct = C;
      ctx.zoneCenter = pos; ctx.zoneRad = rad;
      g.spawnRing?.(pos, 1.4, color);
      fxAt(g, ctx.fx?.aura, pos, 1.0);
      return ctx.res;
    },
  },
};

// ------------------------------------------------------------
// Barras y forja por especialización (docs/paso2-implementacion.md §3.5, D3, D6)
// ------------------------------------------------------------
// FORJA (2f §2, A.7; plan §3.5): skillId → { mejora (Nv req+3), vars: [i, ii] (Nv req+6) }.
// Nombres, líneas y papeles = mockup congelado; el efecto sale de su `k` y del doc:
//  · mod: claves de mergeMods (se suman; slow, stun, knock… son máximos) · set/add/mul: rutas
//    sobre la DEFINICIÓN (forma, ritmo, parámetros que leen los comportamientos) · elem: el
//    elemento y sus tags · power: poder `v_*` (js/powers-forge-maga.js) · behavior: `v_*` aquí.
//  · «−X % de daño» y «X % cada uno» van al saco aditivo (mod dmg), como en el resto de la forja.
//  · color: el de la forma nueva (anillos, haces y campos lo toman de la definición forjada).
// Desviaciones del `k` del mockup (anotadas en tools/convert-v2/out/maga/pendientes-maga.md):
// Lluvia de Meteoritos, Sello Ofensivo y Saeta Ígnea sin código propio (área genérica con
// impactos, buff del aura y salpicadura nativa del básico de arma); Muralla de Hielo con el campo
// genérico 'muro'; Sello de Contención con un poder v_* (el aura genérica no ralentiza).
export const MAGA_SKILL_FORGE = {
  // ---------------- kit base ----------------
  m_dardo: {
    // +20 % de alcance: el básico de arma lo lee del perfil (Player.basicRange × prof.rangeMul): 9 → 10,8 m
    mejora: { name: 'Dardo Veloz', icon: 'forge/mejora', line: '+40 % de velocidad del proyectil y +2 m de alcance.',
      mul: { speed: 1.4 }, mod: { range: 20 } },
    vars: [
      // salpicadura nativa del básico de arma (prof.splash en prof.radius): golpes del Dardo con source 'splash'
      { id: 'm_dardo_i', name: 'Saeta Ígnea', role: 'AREA', icon: 'forge/v_m_dardo_i', line: 'Se vuelve de Fuego y estalla a 1,5 m (30 %).',
        elem: 'fire', set: { splash: 0.3, radius: 1.5, color: 0xff7a22 } },
      { id: 'm_dardo_ii', name: 'Saeta Gélida', role: 'CTRL', icon: 'forge/v_m_dardo_ii', line: 'Se vuelve de Hielo: ralentiza 20 % 1,5 s; −10 % daño.',
        elem: 'frost', set: { color: 0x9fe3ff }, mod: { slow: 1.5, slowPct: 20, dmg: -10 } },
    ],
  },
  bola_fuego: {
    mejora: { name: 'Núcleo Inestable', icon: 'forge/mejora', line: 'Explosión 2 → 2,6 m.', mod: { radius: 30 } },
    vars: [
      { id: 'bola_fuego_i', name: 'Pirodardo', role: 'UNI', icon: 'forge/v_bola_fuego_i', line: 'Sin preparación y muy rápida; explosión 40 %.',
        set: { windup: 0, speed: 22 }, add: { splash: -0.6 } },
      { id: 'bola_fuego_ii', name: 'Racimo', role: 'AREA', icon: 'forge/v_bola_fuego_ii', line: 'Al explotar suelta 3 brasas que estallan (40 % c/u).',
        power: 'v_racimo' },
    ],
  },
  m_parpadeo: {
    mejora: { name: 'Salto Largo', icon: 'forge/mejora', line: 'Alcance 8 → 10 m.', mod: { range: 25 } },
    vars: [
      { id: 'm_parpadeo_i', name: 'Doble Parpadeo', role: 'MOV', icon: 'forge/v_m_parpadeo_i', line: '2 cargas (12 s cada una).',
        set: { charges: 2 } },
      { id: 'm_parpadeo_ii', name: 'Parpadeo Disruptor', role: 'CTRL', icon: 'forge/v_m_parpadeo_ii', line: 'Al llegar empujas 3 m y aturdes 0,5 s (80 %).',
        behavior: 'v_parpadeo_onda', set: { coef: 0.8, radius: 4 }, mod: { knock: 3, stun: 0.5 } },
    ],
  },
  m_barrera: {
    mejora: { name: 'Burbuja Estable', icon: 'forge/mejora', line: 'Dura 8 → 10 s.', mod: { durS: 2 } },
    vars: [
      { id: 'm_barrera_i', name: 'Barrera Gélida', role: 'CTRL', icon: 'forge/v_m_barrera_i', line: 'Se vuelve de Hielo: al romperse congela 1,5 s a 3 m.',
        elem: 'frost', set: { color: 0x9fe3ff }, power: 'v_reactiva' },
      { id: 'm_barrera_ii', name: 'Coraza Arcana', role: 'UNI', icon: 'forge/v_m_barrera_ii', line: 'Mientras aguanta, +15 % de daño de hechizos.',
        power: 'v_coraza_arcana' },
    ],
  },
  nova_hielo: {
    mejora: { name: 'Escarcha Profunda', icon: 'forge/mejora', line: 'Ralentiza 30 → 40 %.', mod: { slowPct: 40 } },
    vars: [
      { id: 'nova_hielo_i', name: 'Corazón de Hielo', role: 'AGU', icon: 'forge/v_nova_hielo_i', line: 'Escudo del 3 % de vida por golpeado (máx. 15 %).',
        set: { shieldGain: [3, 15] }, rankText: { 'del 3 %': 'shieldGain.0', 'máx. 15 %': 'shieldGain.1' } },
      { id: 'nova_hielo_ii', name: 'Nova Fracturante', role: 'UNI', icon: 'forge/v_nova_hielo_ii', line: '+40 % de daño a enemigos ya ralentizados.',
        power: 'v_fractura' },
    ],
  },
  // ---------------- Piromante ----------------
  p_llamarada: {
    mejora: { name: 'Llama Ancha', icon: 'forge/mejora', line: 'Cono 70 → 90°.', set: { angle: 90 } },
    vars: [
      { id: 'p_llamarada_i', name: 'Lanza de Llamas', role: 'UNI', icon: 'forge/v_p_llamarada_i', line: 'Cono de 25° y 10 m; +50 % de daño.',
        set: { angle: 25, radius: 10 }, mod: { dmg: 50 } },
      { id: 'p_llamarada_ii', name: 'Erupción', role: 'AREA', icon: 'forge/v_p_llamarada_ii', line: 'Anillo de 5 m a tu alrededor; −15 % de daño.',
        set: { type: 'area', at: 'self', radius: 5 }, mod: { dmg: -15 } },
    ],
  },
  m_estela_ignea: {
    mejora: { name: 'Rastro Ardiente', icon: 'forge/mejora', line: 'El fuego dura 3 → 4 s.', mod: { durS: 1 } },
    vars: [
      { id: 'm_estela_ignea_i', name: 'Senda de Llamas', role: 'AREA', icon: 'forge/v_m_estela_ignea_i', line: 'Rastro el doble de ancho (3 m) y 55 %/s.',
        mod: { radius: 100, dmg: 37 } },
      // blocks: el rastro es el campo p_muro_fuego, que corta el paso (no a jefes)
      { id: 'm_estela_ignea_ii', name: 'Muro de Llamas', role: 'CTRL', icon: 'forge/v_m_estela_ignea_ii', line: 'El rastro corta el paso 3 s (no a jefes); −50 % daño.',
        set: { blocks: true }, mod: { dmg: -50 } },
    ],
  },
  meteoro: {
    mejora: { name: 'Puntería Ígnea', icon: 'forge/mejora', line: 'Cae a los 0,45 s.', set: { impactDelay: 0.45 } },
    vars: [
      // impactos repartidos en anillo por el área genérica (impacts + scatter)
      { id: 'meteoro_i', name: 'Lluvia de Meteoritos', role: 'AREA', icon: 'forge/v_meteoro_i', line: '3 meteoritos (55 % c/u, 2,2 m) en un área de 5 m.',
        set: { impacts: 3, scatter: 2.5, radius: 2.2 }, mod: { dmg: -45 } },
      { id: 'meteoro_ii', name: 'Meteoro Ancestral', role: 'UNI', icon: 'forge/v_meteoro_ii', line: '+60 % de daño y aturde 1 s; enfriamiento 6 → 9 s.',
        mod: { dmg: 60, stun: 1, cdr: -50 } },
    ],
  },
  m_u_supernova: {
    mejora: { name: 'Gravedad Solar', icon: 'forge/mejora', line: 'Atrae 2 m antes de estallar.', set: { pull: 2 } },
    vars: [
      { id: 'm_u_supernova_i', name: 'Sol Errante', role: 'AREA', icon: 'forge/v_m_u_supernova_i', line: 'La estrella te sigue 4 s y estalla 4 veces (380 %).',
        set: { follow: 'owner', pulses: 4, pulseGap: 1, impactDelay: 1, coef: 3.8 } },
      { id: 'm_u_supernova_ii', name: 'Colapso', role: 'UNI', icon: 'forge/v_m_u_supernova_ii', line: 'Una sola onda de 1300 % en 3 m.',
        set: { pulses: 1, radius: 3, coef: 13 } },
    ],
  },
  // ---------------- Crionte ----------------
  k_prision: {
    mejora: { name: 'Celda Amplia', icon: 'forge/mejora', line: 'Radio 4 → 5 m.', mod: { radius: 25 } },
    vars: [
      { id: 'k_prision_i', name: 'Celda Lejana', role: 'UNI', icon: 'forge/v_k_prision_i', line: 'La lanzas a 15 m sobre un solo enemigo: lo encierra 3 s.',
        set: { at: 'enemy', range: 15, radius: 1.5, freeze: 3 } },
      // muro genérico (field-entities 'muro'); el roce es un golpe de Hielo con 1 capa
      { id: 'k_prision_ii', name: 'Muralla de Hielo', role: 'CTRL', icon: 'forge/v_k_prision_ii', line: 'Un muro de hielo de 8 m corta el paso 3 s y da 1 capa al tocarlo.',
        set: { type: 'wall', at: 'target', range: 10, dur: 3, layers: 1, wall: { len: 8, width: 1, blocks: true } } },
    ],
  },
  m_paso_escarcha: {
    mejora: { name: 'Hielo Duradero', icon: 'forge/mejora', line: 'El hielo dura 3 → 4 s.', mod: { durS: 1 } },
    vars: [
      { id: 'm_paso_escarcha_i', name: 'Paso Doble', role: 'MOV', icon: 'forge/v_m_paso_escarcha_i', line: '2 cargas (10 s cada una).',
        set: { charges: 2 } },
      { id: 'm_paso_escarcha_ii', name: 'Prisión Fugaz', role: 'CTRL', icon: 'forge/v_m_paso_escarcha_ii', line: 'Al llegar, congelas 1 s a los que están a 2 m.',
        power: 'v_prision_fugaz' },
    ],
  },
  k_lanza: {
    mejora: { name: 'Punta Afilada', icon: 'forge/mejora', line: '+2 m de alcance y +15 % de daño.', mod: { range: 17, dmg: 15 } },
    vars: [
      { id: 'k_lanza_i', name: 'Lanza Pesada', role: 'UNI', icon: 'forge/v_k_lanza_i', line: 'No atraviesa; +60 % de daño y deja 2 capas.',
        set: { pierce: false, layers: 2 }, mod: { dmg: 60 } },
      { id: 'k_lanza_ii', name: 'Abanico Gélido', role: 'AREA', icon: 'forge/v_k_lanza_ii', line: '3 lanzas en abanico; 50 % cada una.',
        set: { count: 3, spread: 0.26 }, mod: { dmg: -50 } },
    ],
  },
  m_u_tormenta: {
    mejora: { name: 'Ojo Tranquilo', icon: 'forge/mejora', line: 'Dentro, tú recibes un 10 % menos de daño.', power: 'v_ojo' },
    vars: [
      { id: 'm_u_tormenta_i', name: 'Ventisca Anclada', role: 'AREA', icon: 'forge/v_m_u_tormenta_i', line: 'Se queda fija donde la lanzas, 6 m de radio.',
        set: { follow: false, at: 'target', range: 12, radius: 6 } },
      { id: 'm_u_tormenta_ii', name: 'Granizo', role: 'UNI', icon: 'forge/v_m_u_tormenta_ii', line: 'Un solo pedrisco de 1100 % sobre el objetivo; congela 2 s.',
        set: { follow: false, at: 'enemy', range: 12, pulses: 1, radius: 2.5, coef: 11, freeze: 2 } },
    ],
  },
  // ---------------- Arcanista ----------------
  // S-maga (M-01): las tres piezas sobre el Orbe que descarga (orbe_arcano, js/powers-maga.js)
  a_orbe: {
    mejora: { name: 'Orbe Grande', icon: 'forge/mejora', line: 'Descarga a 4,5 m (antes 3,5 m) y es un 30 % más grande.',
      set: { 'zap.radius': 4.5 }, mul: { size: 1.3 } },
    vars: [
      // no se detiene: llega y vuelve al instante, y también descarga de vuelta
      { id: 'a_orbe_i', name: 'Orbe Veloz', role: 'UNI', icon: 'forge/v_a_orbe_i', line: 'Doble de rápido, sin pararse: descarga a 1 cada 0,15 s (+100 %).',
        mul: { speed: 2 }, set: { park: 0, 'zap.every': 0.15, 'zap.n': 1, 'back.speed': 12, 'back.zap': true }, mod: { dmg: 100 } },
      // dos orbes que giran uno alrededor del otro (0,8 m) por la misma línea; cada descarga, a otro enemigo
      { id: 'a_orbe_ii', name: 'Orbe Gemelo', role: 'AREA', icon: 'forge/v_a_orbe_ii', line: '2 orbes giran juntos a enemigos distintos (60 % del Orbe cada uno).',
        set: { twin: 0.8 }, mod: { dmg: -40 } },
    ],
  },
  a_sello: {
    mejora: { name: 'Sello Firme', icon: 'forge/mejora', line: 'Dura 8 → 10 s.', mod: { durS: 2 } },
    vars: [
      // el buff del aura (set lo FUSIONA con el de la base): daño de los críticos y coste a 0
      { id: 'a_sello_i', name: 'Sello Ofensivo', role: 'UNI', icon: 'forge/v_a_sello_i', line: 'Dentro, tus críticos hacen +25 %; ya no abarata.',
        set: { buff: { costPct: 0, critDmg: 25 }, color: 0xff8ad8 }, rankText: { '+25 %': 'buff.critDmg' } },
      // slow: lo que dura cada ralentización (se renueva cada 0,5 s dentro; Escarcha Tenaz la alarga)
      { id: 'a_sello_ii', name: 'Sello de Contención', role: 'CTRL', icon: 'forge/v_a_sello_ii', line: 'Los enemigos que entran quedan ralentizados un 40 %.',
        set: { slowPct: 40, slow: 0.6, color: 0x9fd8ff }, power: 'v_sello_contencion' },
    ],
  },
  rayo: {
    mejora: { name: 'Rayo Largo', icon: 'forge/mejora', line: 'Alcance 15 → 18 m.', mod: { range: 20 } },
    vars: [
      { id: 'rayo_i', name: 'Rayo en Cadena', role: 'AREA', icon: 'forge/v_rayo_i', line: 'Salta a 3 enemigos cercanos (70 % cada salto).',
        set: { chain: 3, chainPct: 70 } },
      // S-maga (M-06/M-07/M-08): canal SIN FIN mantenido (Incinerar de D4: rampa con tope; Desintegrar de
      // Last Epoch: maná por segundo). El 1.er tic al pulsar (un clic ya pega) y el coste se drena (12/s);
      // un tic cada 0,2 s y +10 % por tic hasta +100 %. Gasta TODAS las Cargas en el 1.er tic y su bono dura
      // todo el canal (v_haz_concentrado, js/powers-maga.js). Haz vivo violeta saturado (en aditivo, el lavanda de
      // las Cargas se veía blanco) con núcleo lila: más ancho con las Cargas (brillo con tope ×1,3), ×2 al tope.
      // Lo de las Cargas (todas en el 1.er tic, bono todo el canal) lo cuenta la barra (ui-gauges-maga, explain)
      { id: 'rayo_ii', name: 'Haz Concentrado', role: 'UNI', icon: 'forge/v_rayo_ii', line: 'Haz sin fin (30 % cada 0,2 s, +10 % por tic hasta +100 %); 12 maná/s.',
        behavior: 'v_haz_concentrado',
        set: { type: 'channel', endless: true, channelT: 1, ticks: 5, tickNow: true, drainCost: true, cost: 12, cd: 1, lockT: 0, coef: 0.3,
          rampPerTic: 10, rampMax: 100, beam: { width: 0.36, core: 0.11, color: 0x8a5cf0, coreColor: 0xe2d4ff } } },
    ],
  },
  m_u_desgarro: {
    mejora: { name: 'Desgarro Estable', icon: 'forge/mejora', line: 'Puedes moverte despacio mientras lo canalizas.', set: { moveMul: 0.4 } },
    vars: [
      // grieta = zona genérica (coef = daño por segundo a todos dentro); sin las claves del canal
      { id: 'm_u_desgarro_i', name: 'Brecha', role: 'AREA', icon: 'forge/v_m_u_desgarro_i', line: 'Abre una grieta en el suelo 5 s: 120 % por segundo a todos a 3 m.',
        set: { type: 'zone', at: 'target', dur: 5, radius: 3, coef: 1.2, rampPerTic: null, rampMax: null, beam: null } },
      // un golpe tras 0,5 s de preparación sobre el enemigo de la mira
      { id: 'm_u_desgarro_ii', name: 'Quiebre', role: 'UNI', icon: 'forge/v_m_u_desgarro_ii', line: 'Un solo pulso de 900 % al final; no se canaliza.',
        set: { type: 'area', at: 'enemy', radius: 1.2, windup: 0.5, coef: 9, rampPerTic: null, rampMax: null, beam: null } },
    ],
  },
};
// specId → { bar, forge (variantes que muestra el mockup con la barra), sel }: la aplica
// chooseSpec en las ranuras del kit anterior, vacías o con habilidades que ya no conoces
export const MAGA_SPEC_BAR = {
  piromante: { bar: { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_estela_ignea', k2: 'meteoro', k3: 'p_llamarada', k4: 'm_u_supernova' },
    forge: { m_dardo: 'i', bola_fuego: 'ii', m_parpadeo: 'i' }, sel: 'bola_fuego' },
  crionte: { bar: { lmb: 'm_dardo', rmb: 'k_lanza', k1: 'm_paso_escarcha', k2: 'nova_hielo', k3: 'k_prision', k4: 'm_u_tormenta' },
    forge: { m_dardo: 'ii', nova_hielo: 'ii' }, sel: 'k_lanza' },
  arcanista: { bar: { lmb: 'm_dardo', rmb: 'rayo', k1: 'm_parpadeo', k2: 'a_sello', k3: 'a_orbe', k4: 'm_u_desgarro' },
    forge: { m_parpadeo: 'i', m_barrera: 'ii' }, sel: 'rayo' },
};
// specId → { skillId: 'i' | 'ii' }: forja recomendada (★ del libro y «Recomendado»; chooseSpec la
// aplica a las habilidades nunca forjadas, D3). La del mockup salvo sus ids retirados (A.6):
// Toque Gélido ya es la Saeta Gélida del Crionte; Onda Repulsora y Armadura de Hielo pasan a la
// forja que el mockup pone en la barra del Arcanista (Parpadeo I, Barrera II). Ninguna apaga el
// indicador de su especialización (2f §7.7): el Dardo es de Fuego con Calor, de Hielo con Escarcha
// y Arcano (sin variante) con las Cargas
export const MAGA_FORGE_RECO = {
  piromante: { m_dardo: 'i', bola_fuego: 'ii', meteoro: 'i', m_u_supernova: 'i', p_llamarada: 'ii' },
  crionte: { m_dardo: 'ii', nova_hielo: 'ii', m_u_tormenta: 'i', m_paso_escarcha: 'ii' },
  arcanista: { rayo: 'ii', m_u_desgarro: 'ii', m_parpadeo: 'i', m_barrera: 'ii' },
};
// barra de reserva (migración y especialización aún sin kit): el kit base de cada ranura
export const MAGA_FALLBACK_BAR = { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: 'm_barrera', k3: null, k4: null };
// 2 = catálogo 2g
export const MAGA_CATALOG_V = 2;
