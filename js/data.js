// ============================================================
// Datos del juego: clases, habilidades, enemigos, constantes
// ============================================================

export const TIER_LEVELS = [1, 6, 12]; // nivel de personaje para desbloquear cada tier

export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.5));
}

export const CLASSES = {
  guerrero: {
    id: 'guerrero', name: 'Guerrero', icon: '⚔️', color: 0xb5452a,
    desc: 'Maestro del combate cuerpo a cuerpo. Fuerte, resistente y letal de cerca.',
    base: { fue: 18, des: 10, vit: 16, ene: 6 },
    mainStat: 'fue',
    baseHP: 45, baseMP: 12, hpPerVit: 4, mpPerEne: 1.5,
    atkRange: 2.1, atkTime: 1.0, ranged: false, atk: 'cleave',
    fists: [3, 6],
    skills: [
      { id: 'golpe_brutal', name: 'Golpe Brutal', icon: '🗡️', tier: 1, max: 5, type: 'melee',
        mana: [4, 0.5], cd: 1.4, mult: [1.6, 0.25], range: 2.2,
        desc: 'Un golpe devastador contra un enemigo.' },
      { id: 'grito_guerra', name: 'Grito de Guerra', icon: '📢', tier: 1, max: 5, type: 'buff',
        mana: [8, 1], cd: 15, dur: 12, buff: { dmgPct: [15, 8] },
        desc: 'Aumenta tu daño durante unos segundos.' },
      { id: 'torbellino', name: 'Torbellino', icon: '🌀', tier: 2, max: 5, type: 'aoe_self',
        mana: [10, 1], cd: 4, mult: [1.2, 0.2], radius: 2.9,
        synergies: [{ from: 'golpe_brutal', pct: 5 }],
        desc: 'Giras con tu arma dañando a todos los enemigos cercanos.' },
      { id: 'embestida', name: 'Embestida', icon: '💨', tier: 2, max: 5, type: 'dash',
        mana: [9, 1], cd: 6, mult: [1.3, 0.22], range: 7, radius: 1.9,
        synergies: [{ from: 'golpe_brutal', pct: 4 }],
        desc: 'Cargas hacia el objetivo dañando lo que encuentres al llegar.' },
      { id: 'terremoto', name: 'Terremoto', icon: '💥', tier: 3, max: 5, type: 'aoe_target',
        mana: [16, 2], cd: 8, mult: [2.0, 0.35], radius: 3.5, range: 8,
        synergies: [{ from: 'torbellino', pct: 6 }],
        desc: 'Golpeas el suelo creando una onda destructiva en la zona.' },
      { id: 'maestria_combate', name: 'Maestría de Combate', icon: '🏅', tier: 3, max: 5, type: 'passive',
        passive: { dmgPct: [10, 8], arm: [6, 6] },
        desc: 'Pasiva: aumenta tu daño y armadura permanentemente.' },
    ],
  },
  maga: {
    id: 'maga', name: 'Maga', icon: '🔮', color: 0x3a6bd6,
    desc: 'Domina los elementos a distancia. Frágil pero con un poder inmenso.',
    base: { fue: 8, des: 10, vit: 10, ene: 22 },
    mainStat: 'ene',
    baseHP: 32, baseMP: 28, hpPerVit: 3, mpPerEne: 2.2,
    atkRange: 7, atkTime: 1.1, ranged: true, atk: 'bolt',
    fists: [2, 5],
    skills: [
      { id: 'bola_fuego', name: 'Bola de Fuego', icon: '🔥', tier: 1, max: 5, type: 'proj',
        mana: [5, 0.8], cd: 0.9, mult: [1.5, 0.3], speed: 13, range: 12, color: 0xff6622,
        desc: 'Lanza una esfera ardiente que explota al impactar.' },
      { id: 'nova_hielo', name: 'Nova de Hielo', icon: '❄️', tier: 1, max: 5, type: 'aoe_self',
        mana: [11, 1.2], cd: 6, mult: [1.0, 0.18], radius: 3.3, slow: 3, color: 0x66ccff,
        synergies: [{ from: 'rayo', pct: 5 }],
        desc: 'Una onda gélida daña y ralentiza a los enemigos cercanos.' },
      { id: 'rayo', name: 'Rayo', icon: '⚡', tier: 2, max: 5, type: 'proj',
        mana: [9, 1], cd: 2.2, mult: [1.9, 0.3], speed: 18, range: 13, pierce: true, color: 0xffee66,
        synergies: [{ from: 'bola_fuego', pct: 5 }],
        desc: 'Un rayo que atraviesa a todos los enemigos en línea.' },
      { id: 'armadura_helada', name: 'Armadura Helada', icon: '🛡️', tier: 2, max: 5, type: 'buff',
        mana: [12, 1], cd: 20, dur: 20, buff: { arm: [25, 12] },
        desc: 'Te envuelves en hielo aumentando mucho tu armadura.' },
      { id: 'meteoro', name: 'Meteoro', icon: '☄️', tier: 3, max: 5, type: 'aoe_target',
        mana: [18, 2], cd: 7, mult: [2.6, 0.45], radius: 3, range: 11, color: 0xff4400,
        synergies: [{ from: 'bola_fuego', pct: 6 }],
        desc: 'Invoca un meteoro que arrasa la zona objetivo.' },
      { id: 'maestria_arcana', name: 'Maestría Arcana', icon: '✨', tier: 3, max: 5, type: 'passive',
        passive: { dmgPct: [12, 8], mp: [15, 10] },
        desc: 'Pasiva: aumenta tu daño y tu maná máximo.' },
    ],
  },
  arquera: {
    id: 'arquera', name: 'Arquera', icon: '🏹', color: 0x3d8c45,
    desc: 'Rápida y precisa. Acaba con sus enemigos antes de que se acerquen.',
    base: { fue: 10, des: 20, vit: 12, ene: 8 },
    mainStat: 'des',
    baseHP: 38, baseMP: 18, hpPerVit: 3.5, mpPerEne: 1.8,
    atkRange: 8.5, atkTime: 0.9, ranged: true, atk: 'arrow',
    fists: [2, 5],
    skills: [
      { id: 'disparo_certero', name: 'Disparo Certero', icon: '🎯', tier: 1, max: 5, type: 'proj',
        mana: [4, 0.6], cd: 1.2, mult: [1.7, 0.3], speed: 16, range: 12, critBonus: 20, color: 0xddffaa,
        desc: 'Una flecha precisa con alta probabilidad de crítico.' },
      { id: 'flecha_multiple', name: 'Flecha Múltiple', icon: '🔱', tier: 1, max: 5, type: 'proj',
        mana: [7, 1], cd: 2.5, mult: [0.9, 0.12], speed: 15, range: 10, count: [3, 0.5], spread: 0.5, color: 0xccddaa,
        synergies: [{ from: 'disparo_certero', pct: 5 }],
        desc: 'Disparas un abanico de flechas a la vez.' },
      { id: 'flecha_perforante', name: 'Flecha Perforante', icon: '➶', tier: 2, max: 5, type: 'proj',
        mana: [8, 1], cd: 3, mult: [1.6, 0.28], speed: 17, range: 13, pierce: true, color: 0xffffcc,
        synergies: [{ from: 'flecha_multiple', pct: 5 }],
        desc: 'Una flecha que atraviesa a todos los enemigos en su camino.' },
      { id: 'agilidad', name: 'Agilidad', icon: '🌪️', tier: 2, max: 5, type: 'buff',
        mana: [10, 1], cd: 18, dur: 10, buff: { spdPct: [15, 5], aspdPct: [15, 5] },
        desc: 'Aumenta tu velocidad de movimiento y de ataque.' },
      { id: 'lluvia_flechas', name: 'Lluvia de Flechas', icon: '🌧️', tier: 3, max: 5, type: 'aoe_target',
        mana: [15, 2], cd: 7, mult: [2.2, 0.4], radius: 3, range: 11, color: 0xaaffaa,
        synergies: [{ from: 'disparo_certero', pct: 6 }],
        desc: 'Una lluvia mortal de flechas cae sobre la zona objetivo.' },
      { id: 'punteria', name: 'Puntería', icon: '👁️', tier: 3, max: 5, type: 'passive',
        passive: { crit: [6, 4], dmgPct: [8, 6] },
        desc: 'Pasiva: aumenta tu probabilidad de crítico y tu daño.' },
    ],
  },
};

// Valor de una propiedad escalable de habilidad: [base, porNivel]
export function skillVal(arr, lvl) {
  if (!Array.isArray(arr)) return arr;
  return arr[0] + arr[1] * (lvl - 1);
}

// Bonus de daño (%) que recibe una habilidad por puntos en sus sinergias
export function synergyBonus(sk, skills) {
  if (!sk.synergies) return 0;
  return sk.synergies.reduce((sum, sy) => sum + (skills[sy.from] || 0) * sy.pct, 0);
}

export const ENEMIES = [
  { id: 'rata', name: 'Rata Gigante', color: 0x7a6a55, shape: 'rat', coward: true,
    hp: 16, dmg: 3, spd: 3.4, xp: 8, range: 1.3, atkTime: 1.0, scale: 0.65,
    minFloor: 1, weight: 30 },
  { id: 'zombi', name: 'Zombi', color: 0x6a8f4f, shape: 'humanoid',
    hp: 34, dmg: 6, spd: 1.7, xp: 14, range: 1.5, atkTime: 1.5, scale: 1.0,
    minFloor: 1, weight: 30 },
  { id: 'esqueleto', name: 'Esqueleto', color: 0xd8d3c0, shape: 'humanoid',
    hp: 26, dmg: 8, spd: 2.8, xp: 16, range: 1.5, atkTime: 1.1, scale: 0.95,
    minFloor: 1, weight: 25 },
  { id: 'brujo', name: 'Brujo Oscuro', color: 0x7a3da0, shape: 'humanoid', rangedAttack: true, blink: true,
    hp: 22, dmg: 9, spd: 2.2, xp: 22, range: 7.5, atkTime: 2.0, scale: 1.0, projSpeed: 8, projColor: 0xaa44ff,
    minFloor: 2, weight: 18 },
  { id: 'demonio', name: 'Demonio', color: 0xa02020, shape: 'demon',
    hp: 60, dmg: 14, spd: 2.6, xp: 40, range: 1.7, atkTime: 1.2, scale: 1.25,
    minFloor: 3, weight: 14 },
  { id: 'golem', name: 'Gólem de Piedra', color: 0x8a8a95, shape: 'golem',
    hp: 110, dmg: 18, spd: 1.5, xp: 60, range: 1.8, atkTime: 1.8, scale: 1.4, slam: true,
    minFloor: 4, weight: 8 },
  { id: 'yeti', name: 'Yeti', color: 0xcfe8f0, shape: 'golem',
    hp: 90, dmg: 15, spd: 2.2, xp: 50, range: 1.8, atkTime: 1.4, scale: 1.3, slam: true,
    frostAura: true, aura: 0x88ccff,
    minFloor: 6, weight: 16 },
  { id: 'tejedora', name: 'Tejedora', color: 0x5a7a4a, shape: 'rat', rangedAttack: false,
    hp: 55, dmg: 10, spd: 2.6, xp: 38, range: 1.6, atkTime: 1.2, scale: 0.95,
    mechanic: 'web', minFloor: 5, weight: 14 },
  { id: 'heraldo', name: 'Heraldo Sombrío', color: 0x884466, shape: 'humanoid', coward: true,
    hp: 85, dmg: 12, spd: 2.4, xp: 55, range: 1.6, atkTime: 1.3, scale: 1.05,
    rallyAura: true, aura: 0xff8844, minFloor: 8, weight: 12 },
  { id: 'diablillo', name: 'Diablillo', color: 0xdd5522, shape: 'demon', rangedAttack: true,
    hp: 40, dmg: 14, spd: 3.0, xp: 45, range: 7, atkTime: 1.6, scale: 0.8, projSpeed: 10, projColor: 0xff6600,
    mechanic: 'fan', minFloor: 11, weight: 18 },
  { id: 'espectro', name: 'Espectro', color: 0xbb99ee, shape: 'humanoid',
    hp: 70, dmg: 20, spd: 3.6, xp: 70, range: 1.5, atkTime: 0.9, scale: 1.0,
    minFloor: 16, weight: 20 },
  { id: 'caballero_abismo', name: 'Caballero del Abismo', color: 0x443a66, shape: 'golem',
    hp: 160, dmg: 26, spd: 1.9, xp: 95, range: 1.9, atkTime: 1.6, scale: 1.45, slam: true,
    minFloor: 16, weight: 14 },

  // --- arquetipos nuevos (2026): cada uno con telegrafía clara y contrajuego ---
  // Nigromante: invocador común. Cada ~8s invoca 2 esqueletos (anillo visible).
  // Contrajuego: al morir, sus esbirros vivos se debilitan (pierden vida/daño).
  { id: 'nigromante', name: 'Nigromante', color: 0x4a6a4a, shape: 'humanoid', coward: true,
    hp: 60, dmg: 8, spd: 2.0, xp: 48, range: 6, atkTime: 1.8, scale: 1.05,
    rangedAttack: true, projSpeed: 8, projColor: 0x66ff88,
    mechanic: 'raise', minFloor: 4, weight: 14 },
  // Acólito Sanador: cura a aliados heridos cercanos con un haz visible.
  // Contrajuego: enfócalo (es frágil) para detener las curas.
  { id: 'acolito', name: 'Acólito Sanador', color: 0xeaeac0, shape: 'humanoid', coward: true,
    hp: 50, dmg: 6, spd: 2.3, xp: 46, range: 1.5, atkTime: 1.4, scale: 0.95,
    mechanic: 'heal', minFloor: 5, weight: 13 },
  // Portaestandarte: aura que da escudo/armadura temporal a aliados (no velocidad).
  // Contrajuego: matarlo retira el escudo; el aura se telegrafía con un anillo.
  { id: 'portaestandarte', name: 'Portaestandarte', color: 0x8a7a3a, shape: 'humanoid',
    hp: 95, dmg: 11, spd: 2.0, xp: 56, range: 1.6, atkTime: 1.3, scale: 1.1,
    wardAura: true, aura: 0xffdd66, minFloor: 7, weight: 11 },
  // Sembrador de Esporas (splitter): al morir deja un saco telegrafiado que tras
  // ~1.5s revienta en 3 crías. Contrajuego: alejarse del saco antes de que reviente.
  { id: 'sembrador', name: 'Sembrador de Esporas', color: 0x7aa84a, shape: 'slime',
    hp: 64, dmg: 9, spd: 1.8, xp: 44, range: 1.5, atkTime: 1.4, scale: 1.1,
    mechanic: 'split', minFloor: 5, weight: 13 },
  // Cría de espora: pequeña, rápida, débil (la deja el Sembrador al reventar).
  { id: 'cria_espora', name: 'Cría de Espora', color: 0x9ad86a, shape: 'slime',
    hp: 12, dmg: 5, spd: 3.2, xp: 6, range: 1.2, atkTime: 1.0, scale: 0.5,
    minFloor: 5, weight: 0 },
  // Embestidor: marca tu posición y embiste en línea recta tras ~1s aplicando
  // SLOW (no stun). Queda vulnerable ~1.5s tras la carga. Contrajuego: apartarse.
  { id: 'embestidor', name: 'Embestidor', color: 0xb04a30, shape: 'demon',
    hp: 80, dmg: 16, spd: 2.4, xp: 52, range: 1.7, atkTime: 1.3, scale: 1.15,
    mechanic: 'charge', minFloor: 6, weight: 13 },
  // Francotirador del Vacío: disparo cargado de largo alcance con línea de aviso.
  // Contrajuego: romper la visión o esquivar tras el telegrafiado.
  { id: 'francotirador', name: 'Francotirador del Vacío', color: 0x5a4a8a, shape: 'humanoid',
    hp: 58, dmg: 22, spd: 1.9, xp: 58, range: 14, atkTime: 3.2, scale: 1.0,
    rangedAttack: true, projSpeed: 22, projColor: 0xcc66ff,
    mechanic: 'snipe', minFloor: 9, weight: 11 },
];

// Un jefe por bioma, cada uno con su mecánica especial
export const BOSSES = [
  { id: 'senor_abismo', name: 'Señor del Abismo', color: 0x661111, shape: 'demon', boss: true,
    hp: 220, dmg: 22, spd: 2.4, xp: 180, range: 2.2, atkTime: 1.3, scale: 2.0,
    rangedAttack: true, projSpeed: 9, projColor: 0xff3300, rangedChance: 0.35, slam: true,
    minFloor: 1, mechanic: 'summon' },
  { id: 'rey_gelido', name: 'Rey Gélido', color: 0xa8d8f0, shape: 'golem', boss: true,
    hp: 280, dmg: 20, spd: 2.0, xp: 230, range: 2.0, atkTime: 1.4, scale: 2.0, slam: true,
    minFloor: 6, mechanic: 'frost_nova' },
  { id: 'avatar_infierno', name: 'Avatar del Infierno', color: 0xff5522, shape: 'demon', boss: true,
    hp: 330, dmg: 26, spd: 2.6, xp: 280, range: 2.2, atkTime: 1.2, scale: 2.2,
    rangedAttack: true, projSpeed: 10, projColor: 0xff3300, rangedChance: 0.3, slam: true,
    minFloor: 11, mechanic: 'fire_pool' },
  { id: 'corazon_vacio', name: 'Corazón del Vacío', color: 0x7744cc, shape: 'demon', boss: true,
    hp: 430, dmg: 30, spd: 2.6, xp: 420, range: 2.2, atkTime: 1.1, scale: 2.3, slam: true,
    rangedAttack: true, projSpeed: 11, projColor: 0xaa66ff, rangedChance: 0.3,
    minFloor: 16, mechanic: 'frost_nova' },
];

export const BOSS = BOSSES[0];

export function bossForFloor(floor) {
  return BOSSES.filter(b => floor >= b.minFloor).pop();
}

// Jefe Pináculo (uber): el reto final, invocado con Fragmentos de Pináculo.
// Muy fuerte; suelta botín mítico exclusivo.
export const UBER_BOSS = {
  id: 'pinaculo', name: 'Heraldo del Vacío', color: 0x9b30ff, shape: 'demon', boss: true, uber: true,
  hp: 900, dmg: 38, spd: 2.6, xp: 1500, range: 2.4, atkTime: 1.0, scale: 2.7,
  rangedAttack: true, projSpeed: 11, projColor: 0xcc66ff, rangedChance: 0.32, slam: true,
  mechanic: 'summon',
};

// Cofre falso: muerde cuando intentas abrirlo
export const MIMIC = {
  id: 'mimico', name: 'Mímico', color: 0x7a5a2a, shape: 'mimic',
  hp: 50, dmg: 12, spd: 3.0, xp: 35, range: 1.5, atkTime: 1.0, scale: 1.0,
};

// Goblin del tesoro: no ataca, huye y suelta un gran botín si lo cazas a tiempo
export const GOBLIN = {
  id: 'goblin_tesoro', name: 'Goblin del Tesoro', color: 0xffcc33, shape: 'humanoid',
  hp: 60, dmg: 0, spd: 3.7, xp: 30, range: 1.2, atkTime: 2, scale: 0.8, goblin: true,
};

// Escalado de enemigos por piso de mazmorra
export function scaleEnemy(def, floor) {
  const f = floor - 1;
  return {
    ...def,
    hp: Math.round(def.hp * (1 + 0.45 * f)),
    dmg: Math.round(def.dmg * (1 + 0.42 * f)),
    xp: Math.round(def.xp * (1 + 0.35 * f)),
    level: floor,
  };
}

export function pickEnemyDef(floor, rng = Math.random) {
  const pool = ENEMIES.filter(e => e.minFloor <= floor);
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of pool) { r -= e.weight; if (r <= 0) return e; }
  return pool[pool.length - 1];
}

// Rarezas de monstruos estilo Diablo 2
export const ENEMY_RANKS = {
  campeon: { id: 'campeon', name: 'Campeón', icon: '⚔️', hp: 2.0, dmg: 1.35, xp: 2.5, scale: 1.12, glow: 0x182866, labelCls: 'lbl-champ' },
  elite:   { id: 'elite',   name: 'Élite',   icon: '☠️', hp: 3.2, dmg: 1.6,  xp: 4.0, scale: 1.28, glow: 0x5a3a00, labelCls: 'lbl-elite' },
};

// Afijos de élite. Cada uno es LEGIBLE (aura de color distinta) y tiene
// CONTRAJUEGO. Los efectos de CC al jugador usan SLOW breve (nunca stun
// encadenable ni pérdida total de control) y se telegrafían cuando aplican daño.
export const ELITE_MODS = [
  { id: 'veloz',     name: 'Veloz',     spd: 1.45,           aura: 0x44ddff },
  { id: 'brutal',    name: 'Brutal',    dmg: 1.35,           aura: 0xcc2222 },
  { id: 'colosal',   name: 'Colosal',   hp: 1.6,             aura: 0x99aabb },
  { id: 'ardiente',  name: 'Ardiente',  dmg: 1.2, spd: 1.15, aura: 0xff6622, burn: true },
  { id: 'explosivo', name: 'Explosivo', dmg: 1.1,            aura: 0xff3300, explode: true },
  { id: 'espinoso',  name: 'Espinoso',  hp: 1.3,             aura: 0xaa55ff, thorns: 0.2 },
  // Encarcelador: cada cierto tiempo telegrafía un anillo bajo tus pies; si no
  // sales a tiempo, te enraíza brevemente (SLOW fuerte y corto, con cooldown
  // largo para que no sea encadenable — DR efectiva).
  { id: 'encarcelador', name: 'Encarcelador', hp: 1.2,       aura: 0x66ffcc, jail: true },
  // Vórtice: una sola vez (cuando se acerca lo suficiente) te atrae hacia él con
  // un tirón telegrafiado. Contrajuego: posicionarte; solo ocurre una vez.
  { id: 'vortice',   name: 'Vórtice',   hp: 1.15,            aura: 0x9966ff, vortex: true },
  // Escudado: gana inmunidad temporal periódica (visible: brillo de escudo).
  // Contrajuego: esperar a que caiga el escudo o reventarlo con burst.
  { id: 'escudado',  name: 'Escudado',  hp: 1.25,            aura: 0xffee88, shielded: true },
  // Cadenas: en una manada, el daño se comparte entre los miembros encadenados.
  // Contrajuego: concentrar el daño igualmente baja a todos a la vez.
  { id: 'cadenas',   name: 'Cadenas',   hp: 1.3,             aura: 0xbbbbbb, chains: true },
];

// Aplica (o no) una rareza aleatoria a un enemigo ya escalado por piso
export function rollEnemyRank(def, floor) {
  const r = Math.random();
  let rank = null;
  if (r < 0.04 + Math.min(0.04, floor * 0.005)) rank = ENEMY_RANKS.elite;
  else if (r < 0.14) rank = ENEMY_RANKS.campeon;
  if (!rank) return def;

  const out = {
    ...def, rank: rank.id, glow: rank.glow, labelCls: rank.labelCls,
    hp: Math.round(def.hp * rank.hp), dmg: Math.round(def.dmg * rank.dmg),
    xp: Math.round(def.xp * rank.xp), scale: (def.scale || 1) * rank.scale,
    rankLabel: `${rank.icon} ${def.name} ${rank.name}`,
  };
  if (rank.id === 'elite') {
    const mod = ELITE_MODS[Math.floor(Math.random() * ELITE_MODS.length)];
    if (mod.spd) out.spd = def.spd * mod.spd;
    if (mod.dmg) out.dmg = Math.round(out.dmg * mod.dmg);
    if (mod.hp) out.hp = Math.round(out.hp * mod.hp);
    out.modId = mod.id;
    out.aura = mod.aura;
    if (mod.burn) out.burn = true;
    if (mod.explode) out.explode = true;
    if (mod.thorns) out.thorns = mod.thorns;
    // afijos de élite nuevos (efectos resueltos en entities/main)
    if (mod.jail) out.jail = true;
    if (mod.vortex) out.vortex = true;
    if (mod.shielded) out.shielded = true;
    if (mod.chains) out.chains = true;
    out.rankLabel = `${rank.icon} ${def.name} ${mod.name}`;
  } else {
    out.aura = 0x2244aa; // aura tenue de campeón
  }
  return out;
}

export const SHOP_REFRESH_MS = 5 * 60 * 1000; // la tienda rota cada 5 minutos

// Misiones del Capitán de la Guardia
export const QUEST_TYPES = [
  { type: 'kill', goal: l => 15 + Math.min(25, l * 2), desc: g => `Elimina ${g} monstruos en la mazmorra` },
  { type: 'elite', goal: () => 3, desc: g => `Derrota ${g} campeones o élites` },
  { type: 'boss', goal: () => 1, desc: () => 'Derrota al jefe de cualquier piso' },
  { type: 'chest', goal: () => 3, desc: g => `Abre ${g} cofres (¡cuidado con los mímicos!)` },
];

export function generateQuest(level) {
  const t = QUEST_TYPES[Math.floor(Math.random() * QUEST_TYPES.length)];
  const goal = t.goal(level);
  return {
    type: t.type, goal, progress: 0, desc: t.desc(goal),
    reward: {
      gold: 60 + 30 * level,
      xp: Math.round(xpForLevel(level) * 0.35),
      item: Math.random() < 0.35 ? 'raro' : null,
    },
  };
}

export const PET_PRICE = 500;

// Soportes de habilidad (estilo gemas de soporte de PoE): modifican UNA
// habilidad activa. Se encuentran como botín, se aprenden y se asignan.
// Cada soporte declara su efecto y, cuando procede, su CONTRAPARTIDA (trade-off).
// Campo `tag`: 'pro' (beneficio neto) o 'tradeoff' (mejora algo a costa de otra cosa),
// usado por la UI para resaltar el coste. `effect` resume el efecto en combate.
export const SUPPORTS = [
  { id: 'amplify', name: 'Amplificado', icon: '🔆', desc: '+30% de daño de la habilidad',
    effect: '+30% daño', tag: 'pro',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
  { id: 'multi',   name: 'Multiproyectil', icon: '🔱', desc: '+2 proyectiles',
    effect: '+2 proyectiles', tag: 'pro',
    types: ['proj'] },
  { id: 'pierce',  name: 'Perforante', icon: '➶', desc: 'Los proyectiles atraviesan a los enemigos',
    effect: 'atraviesa enemigos', tag: 'pro',
    types: ['proj'] },
  { id: 'wide',    name: 'Expansivo', icon: '⭕', desc: '+45% de radio de área',
    effect: '+45% radio', tag: 'pro',
    types: ['aoe_self', 'aoe_target', 'dash'] },
  { id: 'freeze',  name: 'Gélido', icon: '❄️', desc: 'Ralentiza a los enemigos golpeados',
    effect: 'ralentiza al golpear', tag: 'pro',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },

  // --- SOPORTES 2.0 ---
  { id: 'chain',   name: 'Encadenado', icon: '⚡', desc: 'El proyectil rebota a 2 enemigos cercanos; −25% de daño por salto',
    effect: 'rebota a 2 enemigos', trade: '−25% daño/salto', tag: 'tradeoff',
    types: ['proj'] },
  { id: 'concentrated', name: 'Concentrado', icon: '🎯', desc: '+35% de daño, pero −30% de radio de área',
    effect: '+35% daño', trade: '−30% radio', tag: 'tradeoff',
    types: ['aoe_self', 'aoe_target', 'dash'] },
  { id: 'echo',    name: 'Eco', icon: '🔁', desc: 'Repite la habilidad ~0.5s después al 50% de daño; +60% de coste de maná',
    effect: 'repite al 50%', trade: '+60% maná', tag: 'tradeoff',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
  { id: 'bleed',   name: 'Sed de Sangre', icon: '🩸', desc: 'Aplica sangrado: daño por tiempo durante 3s tras el golpe',
    effect: 'DoT sangrado 3s', tag: 'pro',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
  { id: 'poison',  name: 'Veneno', icon: '☠️', desc: 'Aplica veneno: daño por tiempo durante 5s tras el golpe',
    effect: 'DoT veneno 5s', tag: 'pro',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
  { id: 'coldblood', name: 'Sangre Fría', icon: '🧊', desc: '+100% de prob. de crítico contra enemigos ralentizados/congelados (combo con Gélido)',
    effect: '+crítico vs ralentizados', tag: 'pro',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
  { id: 'overcharge', name: 'Sobrecarga', icon: '💥', desc: '+50% de daño, pero +40% de coste de maná',
    effect: '+50% daño', trade: '+40% maná', tag: 'tradeoff',
    types: ['melee', 'aoe_self', 'aoe_target', 'dash', 'proj'] },
];

// Zonas abiertas (regiones): bioma, nivel de desbloqueo y piso base de dificultad
export const ZONE_LIST = [
  { biome: 'Cripta', minLevel: 1, floor: 3 },
  { biome: 'Cavernas de Hielo', minLevel: 6, floor: 8 },
  { biome: 'Infierno', minLevel: 11, floor: 13 },
  { biome: 'Abismo Estelar', minLevel: 16, floor: 18 },
];

// Pactos: riesgo↔recompensa opcional por piso (estilo modificadores de mapa)
export const PACTS = [
  { id: 'sangre',    name: 'Pacto de Sangre',     icon: '🩸', desc: 'Enemigos +45% daño · botín +40%',
    mods: { edmg: 0.45, qty: 40 } },
  { id: 'horda',     name: 'Pacto de la Horda',   icon: '💀', desc: 'Enemigos +60% vida · +40% hallazgo mágico',
    mods: { ehp: 0.6, mf: 40 } },
  { id: 'celeridad', name: 'Pacto de Celeridad',  icon: '⚡', desc: 'Enemigos +35% velocidad · +30% experiencia',
    mods: { espd: 0.35, xp: 30 } },
];

export const POTION_PRICES = { hp: 30, mp: 30 };

// Bendiciones permanentes (endgame, estilo Last Epoch): se ganan completando
// grietas y se equipa UNA por categoría. Su valor escala con el nivel de grieta
// (corrupción) en el que se obtienen. desc usa {v}.
export const BLESSINGS = [
  { id: 'b_dmg',  cat: 'Ofensiva',  name: 'Furia Persistente', stat: 'dmgPct',  base: 8,  per: 2,  desc: '+{v}% daño' },
  { id: 'b_crit', cat: 'Ofensiva',  name: 'Ojo Certero',       stat: 'crit',    base: 4,  per: 1,  desc: '+{v}% prob. de crítico' },
  { id: 'b_hp',   cat: 'Defensiva', name: 'Vigor Eterno',      stat: 'hp',      base: 30, per: 12, desc: '+{v} vida máxima' },
  { id: 'b_arm',  cat: 'Defensiva', name: 'Piel de Hierro',    stat: 'arm',     base: 15, per: 6,  desc: '+{v} armadura' },
  { id: 'b_aspd', cat: 'Celeridad', name: 'Frenesí',           stat: 'aspdPct', base: 6,  per: 2,  desc: '+{v}% vel. de ataque' },
  { id: 'b_cdr',  cat: 'Celeridad', name: 'Mente Clara',       stat: 'cdr',     base: 5,  per: 1,  desc: '+{v}% reducción de enfriamiento' },
  { id: 'b_mf',   cat: 'Fortuna',   name: 'Codicia Bendita',   stat: 'mf',      base: 15, per: 6,  desc: '+{v}% hallazgo mágico' },
  { id: 'b_lph',  cat: 'Fortuna',   name: 'Sed de Sangre',     stat: 'lph',     base: 2,  per: 1,  desc: '+{v} vida al golpear' },
];

// valor de una bendición obtenida en una grieta de nivel `tier` (corrupción)
export function blessingValue(b, tier) {
  return b.base + b.per * Math.max(0, tier | 0);
}

// Tablero de Paragon (estilo Diablo 4): nodos conectados en una rejilla 9×9.
// Se activan gastando puntos Paragon, solo si conectan (ortogonalmente) con un
// nodo ya activo o con el Inicio. Tipos: start, minor, magic, rare, legendary.
// Los nodos legendarios (★) otorgan poderes únicos además de stats.
export const PARAGON_BOARD = (() => {
  const nodes = [];
  const add = (x, y, type, stats, extra = {}) => nodes.push({ id: `${x}_${y}`, x, y, type, stats, ...extra });
  add(4, 4, 'start', {}, { name: 'Inicio' });
  // brazo SUPERIOR — ofensiva
  add(4, 3, 'minor', { dmgPct: 1 });
  add(4, 2, 'magic', { dmgPct: 2, crit: 1 });
  add(4, 1, 'minor', { dmgPct: 1 });
  add(4, 0, 'legendary', { dmgPct: 8 }, { name: 'Sed de Batalla', power: 'furia', desc: 'poder de la Furia: +25% daño con vida alta' });
  add(3, 2, 'rare', { crit: 2 });
  add(5, 2, 'rare', { dmgPct: 3 });
  // brazo INFERIOR — sustento
  add(4, 5, 'minor', { hp: 6 });
  add(4, 6, 'magic', { hp: 14 });
  add(4, 7, 'minor', { hp: 6 });
  add(4, 8, 'legendary', { hp: 40 }, { name: 'Corazón Voraz', power: 'festin', desc: 'poder del Festín: cura al matar' });
  add(3, 6, 'rare', { hp: 18 });
  add(5, 6, 'rare', { vit: 4 });
  // brazo IZQUIERDO — defensa
  add(3, 4, 'minor', { arm: 4 });
  add(2, 4, 'magic', { arm: 10 });
  add(1, 4, 'minor', { arm: 4 });
  add(0, 4, 'legendary', { arm: 30, thorns: 12 }, { name: 'Muralla', desc: '+30 armadura y +12 espinas' });
  add(2, 3, 'rare', { arm: 8 });
  add(2, 5, 'rare', { hp: 14 });
  // brazo DERECHO — velocidad / utilidad
  add(5, 4, 'minor', { aspdPct: 1 });
  add(6, 4, 'magic', { aspdPct: 3 });
  add(7, 4, 'minor', { aspdPct: 1 });
  add(8, 4, 'legendary', { aspdPct: 8 }, { name: 'Vendaval', power: 'multidisparo', desc: 'poder del Vendaval: +1 proyectil' });
  add(6, 3, 'rare', { cdr: 4 });
  add(6, 5, 'rare', { mf: 10 });
  // nodos de ENGARCE (sockets) para glifos — uno por cuadrante, junto a un brazo
  add(3, 3, 'socket', {});
  add(5, 3, 'socket', {});
  add(3, 5, 'socket', {});
  add(5, 5, 'socket', {});
  return nodes;
})();
export const PARAGON_BOARD_SIZE = 9;
export const STAT_NAMES = { fue: 'Fuerza', des: 'Destreza', vit: 'Vitalidad', ene: 'Energía' };
export const STAT_DESC = {
  fue: 'Aumenta el daño físico',
  des: 'Aumenta el crítico y la armadura',
  vit: 'Aumenta la vida máxima',
  ene: 'Aumenta el maná máximo y el daño de hechizos',
};
