// ============================================================
// Azar con semilla por subsistema (módulo puro, testeable headless)
// ============================================================
// PRNG sfc32 (128 bits de estado, rápido y de buena calidad) sembrado con
// splitmix32 para "esparcir" semillas pobres (p. ej. 1, 2, 3 → estados muy
// distintos). Cada SUBSISTEMA de la simulación tira de su propio stream,
// derivado de la semilla del mundo con hashSeed(semilla, nombre): así añadir una
// tirada en un sistema NO desplaza la secuencia de los demás (seed splitting).
//
// Streams:
//   'layout' → generación del mapa (mazmorra/zona). Por compatibilidad con las
//              semillas ya publicadas (diaria, zonas), buildDungeon/buildZone
//              siguen usando mulberry32(semilla) internamente: la semilla del
//              mundo ES la semilla de layout.
//   'spawn'  → elenco de enemigos (tipo, rango, afijos de élite, manadas).
//   'loot'   → rollDrops / generateItem / afijos de los objetos que caen.
//   'fx'     → Math.random (cosmético; no necesita reproducirse).
//
// Un rng es una FUNCIÓN () → [0,1) (drop-in de Math.random) con helpers
// colgados: float, int, pick, chance, shuffle, fork.

// mezcla final de murmur3 (avalancha de 32 bits)
function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// Hash estable de varias partes (números/strings) → semilla uint32.
// hashSeed('rift', 5, 2911) siempre da lo mismo en cualquier máquina.
export function hashSeed(...parts) {
  let h = 0x811c9dc5; // FNV-1a
  const s = parts.map(p => String(p)).join('␟');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return fmix32(h);
}

function splitmix32(a) {
  return function () {
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16); t = Math.imul(t, 0x21f0aaad);
    t ^= t >>> 15; t = Math.imul(t, 0x735a2d97);
    return (t ^ (t >>> 15)) >>> 0;
  };
}

// Crea un rng determinista. Misma semilla → misma secuencia.
export function createRng(seed) {
  const s0 = (typeof seed === 'number' ? seed : hashSeed(seed)) >>> 0;
  const sm = splitmix32(s0);
  let a = sm(), b = sm(), c = sm(), d = sm();
  const next = function () {
    // sfc32
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
  next.seed = s0;
  next.float = (min = 0, max = 1) => min + next() * (max - min);
  next.int = (min, max) => Math.floor(min + next() * (max - min + 1)); // inclusivo
  next.pick = arr => (arr && arr.length ? arr[Math.floor(next() * arr.length)] : undefined);
  next.chance = p => next() < p;
  next.shuffle = arr => { // Fisher-Yates en el sitio
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  next.fork = name => createRng(hashSeed(s0, name));
  return next;
}

// Semilla aleatoria (para mundos sin semilla explícita: se registra igual en
// world.seed y permite reproducir la partida si hiciera falta).
export function randomSeed() { return (Math.random() * 4294967296) >>> 0; }

export const SIM_STREAMS = ['layout', 'spawn', 'loot'];

// Streams de un mundo a partir de su semilla. `fx` queda en Math.random.
export function createWorldRng(seed) {
  const s = (seed == null ? randomSeed() : seed) >>> 0;
  return {
    seed: s,
    layout: createRng(hashSeed(s, 'layout')), // reservado (los builders usan mulberry32(s))
    spawn: createRng(hashSeed(s, 'spawn')),
    loot: createRng(hashSeed(s, 'loot')),
    fx: Math.random,
  };
}

// Semana absoluta (lunes UTC como inicio) → índice estable para semillas semanales
export function weekIndex(date = new Date()) {
  const DAY = 86400000;
  const days = Math.floor(date.getTime() / DAY); // 1970-01-01 fue jueves
  return Math.floor((days + 3) / 7);
}

// Semilla de una grieta: misma para todos los jugadores con ese nivel durante
// la semana (base del futuro ladder). Una llave puede traer su propia semilla.
export function riftSeed(level, week = weekIndex()) {
  return hashSeed('rift', level | 0, week | 0);
}
