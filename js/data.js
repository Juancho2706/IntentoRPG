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
    atkRange: 1.9, atkTime: 1.0, ranged: false,
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
    atkRange: 1.8, atkTime: 1.1, ranged: false,
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
    atkRange: 8, atkTime: 0.9, ranged: true,
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
  { id: 'rata', name: 'Rata Gigante', color: 0x7a6a55, shape: 'rat',
    hp: 16, dmg: 3, spd: 3.4, xp: 8, range: 1.3, atkTime: 1.0, scale: 0.65,
    minFloor: 1, weight: 30 },
  { id: 'zombi', name: 'Zombi', color: 0x6a8f4f, shape: 'humanoid',
    hp: 34, dmg: 6, spd: 1.7, xp: 14, range: 1.5, atkTime: 1.5, scale: 1.0,
    minFloor: 1, weight: 30 },
  { id: 'esqueleto', name: 'Esqueleto', color: 0xd8d3c0, shape: 'humanoid',
    hp: 26, dmg: 8, spd: 2.8, xp: 16, range: 1.5, atkTime: 1.1, scale: 0.95,
    minFloor: 1, weight: 25 },
  { id: 'brujo', name: 'Brujo Oscuro', color: 0x7a3da0, shape: 'humanoid', rangedAttack: true,
    hp: 22, dmg: 9, spd: 2.2, xp: 22, range: 7.5, atkTime: 2.0, scale: 1.0, projSpeed: 8, projColor: 0xaa44ff,
    minFloor: 2, weight: 18 },
  { id: 'demonio', name: 'Demonio', color: 0xa02020, shape: 'demon',
    hp: 60, dmg: 14, spd: 2.6, xp: 40, range: 1.7, atkTime: 1.2, scale: 1.25,
    minFloor: 3, weight: 14 },
  { id: 'golem', name: 'Gólem de Piedra', color: 0x8a8a95, shape: 'golem',
    hp: 110, dmg: 18, spd: 1.5, xp: 60, range: 1.8, atkTime: 1.8, scale: 1.4,
    minFloor: 4, weight: 8 },
  { id: 'yeti', name: 'Yeti', color: 0xcfe8f0, shape: 'golem',
    hp: 90, dmg: 15, spd: 2.2, xp: 50, range: 1.8, atkTime: 1.4, scale: 1.3,
    minFloor: 6, weight: 16 },
  { id: 'diablillo', name: 'Diablillo', color: 0xdd5522, shape: 'demon', rangedAttack: true,
    hp: 40, dmg: 14, spd: 3.0, xp: 45, range: 7, atkTime: 1.6, scale: 0.8, projSpeed: 10, projColor: 0xff6600,
    minFloor: 11, weight: 18 },
];

// Un jefe por bioma, cada uno con su mecánica especial
export const BOSSES = [
  { id: 'senor_abismo', name: 'Señor del Abismo', color: 0x661111, shape: 'demon', boss: true,
    hp: 220, dmg: 22, spd: 2.4, xp: 180, range: 2.2, atkTime: 1.3, scale: 2.0,
    rangedAttack: true, projSpeed: 9, projColor: 0xff3300, rangedChance: 0.35,
    minFloor: 1, mechanic: 'summon' },
  { id: 'rey_gelido', name: 'Rey Gélido', color: 0xa8d8f0, shape: 'golem', boss: true,
    hp: 280, dmg: 20, spd: 2.0, xp: 230, range: 2.0, atkTime: 1.4, scale: 2.0,
    minFloor: 6, mechanic: 'frost_nova' },
  { id: 'avatar_infierno', name: 'Avatar del Infierno', color: 0xff5522, shape: 'demon', boss: true,
    hp: 330, dmg: 26, spd: 2.6, xp: 280, range: 2.2, atkTime: 1.2, scale: 2.2,
    rangedAttack: true, projSpeed: 10, projColor: 0xff3300, rangedChance: 0.3,
    minFloor: 11, mechanic: 'fire_pool' },
];

export const BOSS = BOSSES[0];

export function bossForFloor(floor) {
  return BOSSES.filter(b => floor >= b.minFloor).pop();
}

// Cofre falso: muerde cuando intentas abrirlo
export const MIMIC = {
  id: 'mimico', name: 'Mímico', color: 0x7a5a2a, shape: 'mimic',
  hp: 50, dmg: 12, spd: 3.0, xp: 35, range: 1.5, atkTime: 1.0, scale: 1.0,
};

// Escalado de enemigos por piso de mazmorra
export function scaleEnemy(def, floor) {
  const f = floor - 1;
  return {
    ...def,
    hp: Math.round(def.hp * (1 + 0.45 * f)),
    dmg: Math.round(def.dmg * (1 + 0.30 * f)),
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

export const ELITE_MODS = [
  { id: 'veloz',    name: 'Veloz',    spd: 1.45 },
  { id: 'brutal',   name: 'Brutal',   dmg: 1.35 },
  { id: 'colosal',  name: 'Colosal',  hp: 1.6 },
  { id: 'ardiente', name: 'Ardiente', dmg: 1.2, spd: 1.15 },
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
    out.rankLabel = `${rank.icon} ${def.name} ${mod.name}`;
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

export const POTION_PRICES = { hp: 30, mp: 30 };
export const STAT_NAMES = { fue: 'Fuerza', des: 'Destreza', vit: 'Vitalidad', ene: 'Energía' };
export const STAT_DESC = {
  fue: 'Aumenta el daño físico',
  des: 'Aumenta el crítico y la armadura',
  vit: 'Aumenta la vida máxima',
  ene: 'Aumenta el maná máximo y el daño de hechizos',
};
