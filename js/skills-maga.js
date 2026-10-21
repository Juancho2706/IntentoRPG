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
// comportamiento de su mismo id en js/powers-maga.js (KT-maga: coordinación por ids).
// Solo importa datos puros: skill-defs.js y sus propios VFX (spec-mechanics y powers lo importan).
import { projFanOffset, COLDBLOOD_CRIT } from './skill-defs.js';
import { MAGA_FX_PRESETS } from './fx-skills-maga.js';

export const MAGA_SKILLS = [
  // ---------------- KIT BASE ----------------
  { id: 'm_dardo', name: 'Dardo Arcano', icon: '✨', cat: 'basic', slots: ['lmb'], tags: ['basic', 'proj', 'arcane'], elem: 'arcane',
    type: 'weapon', req: 1, coef: 1.05, gen: 3, color: 0xcc66ff,
    line: 'Dispara un dardo arcano a distancia. Cada impacto te devuelve 3 de maná.',
    desc: 'Lanza un dardo arcano a distancia (105 % del daño de arma) y recupera 3 de Maná al impactar.' },
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
    behavior: 'm_barrera', req: 6, cd: 20, dur: 8, shieldManaPct: 60, color: 0xb98cff,
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
  { id: 'a_orbe', name: 'Orbe Arcano', icon: '🔵', cat: 'spec', spec: 'arcanista', slots: ['k3'], tags: ['spec', 'proj', 'arcane'], elem: 'arcane',
    type: 'proj', behavior: 'orbe_arcano', req: 10, coef: 1.6, cost: 20, cd: 8, speed: 6, range: 14, size: 0.34, pierce: true, bounces: 2, color: 0xb388ff,
    line: 'Lanzas un orbe lento que atraviesa y rebota 2 veces entre enemigos.',
    desc: 'Un orbe arcano lento que atraviesa a los enemigos (160 % por impacto) y, al acabar su recorrido, rebota 2 veces hacia el enemigo más cercano. Cuesta 20 de Maná; enfriamiento 8 s.' },
  // Sello del Archimago: aura en el suelo que abarata tus principales mientras estás dentro.
  // La Carga cada 2 s la da el indicador de Cargas (mech-maga.js) al dueño dentro de su Sello
  { id: 'a_sello', name: 'Sello del Archimago', icon: '🔯', cat: 'utility', spec: 'arcanista', slots: ['k2'], tags: ['utility', 'aura', 'arcane'], elem: 'arcane',
    type: 'aura', at: 'self', req: 12, cd: 20, radius: 4, dur: 8, buff: { spenderCostPct: -30 }, color: 0xe0b0ff,
    line: 'Círculo de 4 m durante 8 s: dentro, tus principales cuestan un 30 % menos y ganas 1 Carga cada 2 s.',
    desc: 'Dibujas un círculo de 4 m a tus pies durante 8 s: mientras estás dentro, tus habilidades principales cuestan un 30 % menos y ganas 1 Carga Arcana cada 2 s. Enfriamiento 20 s.' },
  { id: 'rayo', name: 'Rayo', icon: '⚡', cat: 'spender', spec: 'arcanista', slots: ['rmb', 'k2'], tags: ['spender', 'line', 'arcane'], elem: 'arcane',
    type: 'line', req: 14, coef: 2.4, cost: 22, cd: 2, range: 15, width: 1.2, lockT: 0.3, color: 0xffee66,
    line: 'Rayo de 15 m que atraviesa en línea y gasta tus Cargas: +35 % de daño y 5 de maná por Carga.',
    desc: 'Un rayo arcano de 15 m que golpea a todos en línea (240 %). Gasta todas tus Cargas Arcanas: +35 % de daño y 5 de Maná por Carga. Cuesta 22 de Maná; enfriamiento 2 s.' },
  // canalizado y plantado (moveMul 0): la Mejora de la forja deja moverse despacio
  { id: 'm_u_desgarro', name: 'Desgarro Arcano', icon: '🌌', cat: 'ultimate', spec: 'arcanista', slots: ['k4'], tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', unstoppable: true, moveMul: 0, req: 15, coef: 1.2, channelT: 3, ticks: 6, cd: 50, range: 10, color: 0xd28cff,
    line: 'Canalizas 3 s un rayo gigante; te da 1 Carga cada medio segundo.',
    desc: 'Definitiva: mantén la tecla para canalizar 3 s un rayo arcano gigante contra un objetivo (120 % cada 0,5 s) sin moverte; cada golpe te da 1 Carga Arcana. Eres imparable mientras dura. Enfriamiento 50 s.' },

  // ---------------- ACTIVAS DE TALENTO (ranura 2; las concede su nodo) ----------------
  { id: 'm_t_bloque', name: 'Bloque de Hielo', icon: '🧊', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'frost'], elem: 'frost',
    behavior: 'm_t_bloque', req: 21, cd: 90, dur: 4, color: 0x9fe3ff,
    line: 'Te encierras en hielo 4 s: no recibes daño, pero no te mueves.',
    desc: 'Te encierras en hielo: eres inmune durante 4 s, pero no puedes moverte ni atacar (la esquiva lo rompe antes). Enfriamiento 90 s.' },
  { id: 'm_t_inversion', name: 'Inversión del Tiempo', icon: '⏳', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'arcane'], elem: 'arcane',
    behavior: 'm_t_inversion', req: 27, cd: 60, color: 0xd7c2ff,
    line: 'Vuelves a la vida y al lugar que tenías hace 5 s.',
    desc: 'Vuelves a la vida y a la posición que tenías hace 5 s (el tiempo se graba desde que conoces esta habilidad). Enfriamiento 60 s.' },
  { id: 'm_t_contrahechizo', name: 'Contrahechizo', icon: '🚫', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'interrupt', 'arcane'], elem: 'arcane',
    behavior: 'm_t_contrahechizo', req: 31, cd: 18, range: 12, color: 0xcc88ff,
    line: 'Corta el hechizo de un enemigo a 12 m y lo deja mudo 3 s.',
    desc: 'Cortas el hechizo de un enemigo a 12 m y lo dejas mudo 3 s; a los jefes les llenas la barra de Quebranto. Enfriamiento 18 s.' },
  { id: 'm_h_detener', name: 'Detener el Tiempo', icon: '⌛', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'area', 'cc', 'arcane'], elem: 'arcane',
    behavior: 'm_h_detener', req: 72, cd: 75, radius: 8, dur: 3, color: 0xd7c2ff,
    line: 'Paras el tiempo 3 s a 8 m: los enemigos quedan quietos.',
    desc: 'Paras el tiempo a tu alrededor: los enemigos a 8 m quedan quietos 3 s (los jefes, no: se les llena la barra de Quebranto). Enfriamiento 75 s.' },
  // las 3 runas las escribe el poder de las Runas (Escriba Rúnica, e0) en ③ afterCast, sobre
  // cast.runeSpots (lo deja este comportamiento)
  { id: 'm_h_palabra', name: 'Palabra de Poder', icon: '📜', kind: 'talent', cat: 'utility', slots: ['k2'], tags: ['utility', 'arcane'], elem: 'arcane',
    behavior: 'm_h_palabra', req: 72, cd: 40, runes: 3, radius: 1.8, color: 0xe0b0ff,
    line: 'Escribes al instante 3 runas a tu alrededor: formas un Sello donde estás.',
    desc: 'Escribes al instante 3 runas a 1,8 m de ti: forman un Sello donde estás. Enfriamiento 40 s.' },
  { id: 'm_h_constructo', name: 'Llamar Constructo', icon: '🗿', kind: 'talent', cat: 'defense', slots: ['k2'], tags: ['defense', 'summon', 'taunt', 'arcane'], elem: 'arcane',
    behavior: 'm_h_constructo', req: 74, cd: 45, dur: 10, radius: 8, range: 6, hpPct: 50, color: 0x9f8cff,
    line: 'Un Constructo aparece 10 s y los enemigos a 8 m lo atacan a él.',
    desc: 'Un Constructo de maná aparece hacia la mira (hasta 6 m) durante 10 s y obliga a los enemigos a 8 m de él a atacarlo; aguanta la mitad de tu vida máxima. Enfriamiento 45 s.' },
];

/** @deprecated Paso 2 (D23): las ramas desaparecen (las sustituye la forja). data.js aún lo importa; C1 lo borra en E5. */
export const MAGA_SKILL_MODS = {};

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
      if (e?.alive && !ctx._chained && prof.chain) { ctx._chained = true; g.spawnChainBounce(e, Math.round(ctx.avgHit), prof.chain, [], color, prof.chainPct); }
      ctx.hit(e, dealt);
      if (prof.lifesteal && dealt > 0) p.leech(dealt * prof.lifesteal / 100);
      if (e) { ctx.zoneCenter = ground(e.pos); ctx.zoneRad = 1.5; onHit?.(e, dealt, seen.get(e)); }
    },
  });
}
// segmento del Orbe (g.fireProjectile del núcleo): atraviesa y, al acabar su recorrido, rebota
// al enemigo vivo más cercano (o vuelve si no hay ninguno); `left` = rebotes que quedan
function orbSegment(g, ctx, from, toward, left, done, castHits = null) {
  const { p, prof, sk } = ctx;
  const speed = prof.speed || 6, range = prof.range || 14;
  const d = aimDir({ pos: from, group: p.group }, toward);
  g.fireProjectile(ctx, { from, to: toward, speed, range, pierce: true, castHits });
  const end = from.clone(); end.x += d.x * range; end.z += d.z * range; end.y = 0;
  const stop = g.clampWalkable ? g.clampWalkable(from, end, range) : end;
  g.timers.schedule(range / Math.max(1, speed), () => {
    if (left <= 0 || !p.alive || g.player !== p) { done(); return; }
    let tgt = null, bd = Infinity;
    for (const e of g.enemies || []) { if (!e.alive) continue; const q = dist2(e.pos, stop); if (q < bd) { bd = q; tgt = e; } }
    const back = tgt && bd > 0.25 ? ground(tgt.pos) : (() => { const v = stop.clone(); v.x -= d.x * range; v.z -= d.z * range; return v; })();
    g.spawnRing?.(stop, 0.9, ctx.color ?? sk.color);
    orbSegment(g, ctx, stop, back, left - 1, done);
  });
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
      g.spawnRing?.(p.pos, 1.4, ctx.color ?? sk.color);
      fxAt(g, ctx.fx?.aura, p.pos, 1.0);
      fxAt(g, ctx.fx?.extra, p.pos, 1.0);
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
      g.spawnRing?.(front, ctx.zoneRad, ctx.color ?? sk.color);
      fxAt(g, ctx.fx?.aura, p.pos, 1.0);
      fxAt(g, ctx.fx?.impact, front, 0.8);
      return ctx.res;
    },
  },

  // Estela Ígnea: desliz de 6 m y una franja de fuego del inicio al final (coef = WD por segundo)
  m_estela_ignea: {
    cast(g, p, prof, cast) {
      const { from, to } = slide(g, p, prof, cast);
      trailField(g, p, prof, cast, from, to, { dps: cast.ctx.avgHit, interval: 0.5 });
      fxAt(g, cast.ctx.fx?.impact, p.pos, 0.6);
      return cast.ctx.res;
    },
  },

  // Supernova: se forma a tu alrededor (at 'self') o en la mira; `pulses` ondas separadas
  // `pulseGap` s tras impactDelay; la última deja la Quemadura (burn WD en burnT s, escala
  // con el rango como el golpe). follow 'owner': cada onda estalla donde estás
  m_u_supernova: {
    params: ['pulses', 'pulseGap', 'burn', 'burnT'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const anchor = ground(sk.at === 'self' ? p.pos : (cast.target || p.pos));
      const follow = sk.follow === 'owner';
      const rad = prof.radius || 5;
      const color = ctx.color ?? sk.color;
      if (sk.at !== 'self') p.faceToward?.(anchor);
      g.spawnRing?.(anchor, rad, color);                       // telegrafía
      fxAt(g, ctx.fx?.trail, anchor, 4.5);
      const pulses = Math.max(1, Math.floor(sk.pulses || 1));
      const burnTotal = (sk.burn || 0) > 0 ? p.avgHit(ctx.coef * sk.burn / (sk.coef || 1), prof.addPct) : 0;
      const burnT = sk.burnT || 6;
      let n = 0;
      const pulse = () => {
        n++;
        const last = n >= pulses;
        const c = follow ? ground(p.pos) : anchor;
        g.dealArea(c, rad, ctx.coef, {
          ...ctx.areaOpts, from: c,
          onHit: (e, dealt) => {
            ctx.hit(e, dealt);
            if (last && e.alive && burnTotal > 0) g.applyDoT?.(e, burnTotal, burnT, 1, undefined, 'm_u_supernova:burn');
          },
        });
        fxAt(g, ctx.fx?.impact, c, 0.3);
        fxAt(g, ctx.fx?.aura, c, 0.3);
        if (last) fxAt(g, ctx.fx?.extra, c, 0.3);
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
  // la de 1 s del indicador (5 capas). A los jefes, Enemy.applyCC lo convierte en Quebranto
  prision_hielo: {
    params: ['freeze', 'layers'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const center = ground(sk.at === 'self' ? p.pos : (cast.target || p.pos));
      const rad = prof.radius || 4;
      if (sk.at !== 'self') p.faceToward?.(center);
      else p.swing = 1;
      const freeze = sk.freeze || 2;
      for (const e of g.enemies || []) if (e.alive && inRadius(e, center, rad)) e.applyCC('freeze', freeze, { src: p });
      g.dealArea(center, rad, ctx.coef, { ...ctx.areaOpts, from: center });
      ctx.zoneCenter = center; ctx.zoneRad = rad;
      g.spawnRing?.(center, rad, ctx.color ?? sk.color);
      fxAt(g, ctx.fx?.aura, center, 0.4);
      fxAt(g, ctx.fx?.extra, center, 0.2);
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
  // modifyResolve (prof.frozenMult)
  lanza_hielo: {
    params: ['frozenMult', 'layers'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      p.faceToward?.(cast.target);
      p.swing = 1;
      const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
      const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
      const castHits = n > 1 && (sk.count || 1) <= 1 ? new Set() : null;   // extra de soporte: un impacto por enemigo
      const mult = Math.max(1, prof.frozenMult ?? sk.frozenMult ?? 3);
      const from = ground(p.pos);
      fxAt(g, ctx.fx?.trail, p.pos, 1.0);
      for (let i = 0; i < n; i++) {
        const a = base + projFanOffset(i, n, prof.spread);
        const to = from.clone(); to.x += Math.sin(a) * 5; to.z += Math.cos(a) * 5;
        ownProjectile(g, ctx, { from, to, castHits, peek: e => (e.frozenT || 0) > 0 && !isBoss(e),
          onHit: (e, dealt, wasFrozen) => {
            if (!wasFrozen || !(dealt > 0) || mult <= 1 || !e.alive) return;
            g.dealProcDamage(e, dealt * (mult - 1), { source: `skill:${sk.id}`, skill: sk.id, elem: 'frost', tags: prof.tags });
            fxAt(g, ctx.fx?.extra, e.pos, 0.8);
          } });
      }
      g.timers.schedule((prof.range || 12) / Math.max(1, prof.speed || 20) + 0.05, () => cast.done(ctx.res));
      return undefined;   // diferido: termina al agotar el alcance
    },
  },

  // Tormenta Glacial: golpes cada `interval` s en `radius` m alrededor de ti (follow 'owner') o
  // fija donde la lanzas; cada golpe de Hielo pone su capa por el indicador. `pulses` (forja)
  // fija el número de golpes; si no, sale de la duración. Una sola a la vez (magaStorm)
  m_u_tormenta: {
    params: ['interval', 'pulses'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      const prev = STORMS.get(p); if (prev) prev.alive = false;
      const interval = sk.interval || 0.5;
      const anchor = ground(sk.at === 'target' ? (cast.target || p.pos) : p.pos);
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
        g.dealArea(c, inst.radius, ctx.coef, { ...ctx.areaOpts, from: c });
        fxAt(g, ctx.fx?.aura, c, 1.2);
        fxAt(g, ctx.fx?.extra, c, 0.3);
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

  // Orbe Arcano: `count` orbes (abanico con `spread`) lentos que atraviesan y rebotan `bounces` veces
  orbe_arcano: {
    params: ['bounces'],
    cast(g, p, prof, cast) {
      const { ctx, sk } = cast;
      p.faceToward?.(cast.target);
      p.swing = 1;
      const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
      const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
      const from = ground(p.pos);
      // orbes extra de soporte: un impacto por enemigo en el primer tramo (los rebotes, libres)
      const castHits = n > 1 && (sk.count || 1) <= 1 ? new Set() : null;
      let pending = n, finished = false;
      const done = () => { if (--pending <= 0 && !finished) { finished = true; cast.done(ctx.res); } };
      for (let i = 0; i < n; i++) {
        const a = base + projFanOffset(i, n, prof.spread);
        const to = from.clone(); to.x += Math.sin(a) * 5; to.z += Math.cos(a) * 5;
        orbSegment(g, ctx, from, to, Math.max(0, Math.floor(sk.bounces ?? 2)), done, castHits);
      }
      fxAt(g, ctx.fx?.aura, p.pos, 1.0);
      return undefined;   // diferido: termina con el último rebote
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
// skillId → { mejora, vars: [i, ii] } (2f §2.3): KA2
export const MAGA_SKILL_FORGE = {};
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
// specId → { skillId: 'i' | 'ii' } (forja recomendada en las habilidades nunca forjadas): KA2
export const MAGA_FORGE_RECO = {};
// barra de reserva (migración y especialización aún sin kit): el kit base de cada ranura
export const MAGA_FALLBACK_BAR = { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: 'm_barrera', k3: null, k4: null };
// 2 = catálogo 2g
export const MAGA_CATALOG_V = 2;
