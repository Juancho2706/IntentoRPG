// ============================================================
// Datos del juego: clases, habilidades, enemigos, constantes
// ============================================================

import { enemyHpScale, enemyDmgScale, enemyXpScale, RANK_HP, RANK_DMG, UBER_HP_MULT, bossHpMult, eliteHpMult } from './combat-math.js';
import { normalizeSkillDef, emptyMods, CAT_LABELS } from './skill-defs.js';
import { RESOURCE_DEFS } from './resources.js';
// catálogo por clase (cada archivo es de un trabajador; data.js solo lo fusiona)
import { GUERRERO_SKILLS, GUERRERO_SKILL_MODS, GUERRERO_SKILL_FORGE, GUERRERO_SPEC_BAR, GUERRERO_FORGE_RECO,
  GUERRERO_FALLBACK_BAR, GUERRERO_CATALOG_V } from './skills-guerrero.js';
import { MAGA_SKILLS, MAGA_SKILL_MODS, MAGA_SKILL_FORGE, MAGA_SPEC_BAR, MAGA_FORGE_RECO,
  MAGA_FALLBACK_BAR, MAGA_CATALOG_V } from './skills-maga.js';
import { ARQUERA_SKILLS, ARQUERA_SKILL_MODS, ARQUERA_SKILL_FORGE, ARQUERA_SPEC_BAR, ARQUERA_FORGE_RECO,
  ARQUERA_FALLBACK_BAR, ARQUERA_CATALOG_V } from './skills-arquera.js';
// activas `grant` de los talentos (kind 'talent'; dueños: trabajadores de 2c.1).
// Estos archivos no importan nada, así que no hay ciclo con talents.js.
import { GUERRERO_TALENTS } from './talents-guerrero.js';
import { MAGA_TALENTS } from './talents-maga.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

export const TIER_LEVELS = [1, 6, 12]; // nivel de personaje para desbloquear cada tier

export function xpForLevel(level) {
  return Math.floor(80 * Math.pow(level, 1.5));
}

// ------------------------------------------------------------
// CLASES (Paso 2b.0): el catálogo de habilidades de cada clase vive en su
// propio archivo js/skills-<clase>.js (dueño: el trabajador de esa clase) y aquí
// solo se normaliza (skill-defs.normalizeSkillDef: tags ⊇ {cat, elem}, slots,
// kind de compatibilidad y max). Las habilidades se APRENDEN SOLAS al llegar a
// su nivel (`req`) y su rango sale del nivel (skill-resolve.skillRank). El
// recurso de clase (Furia/Maná/Energía) se define en js/resources.js (§2).
// `tree` es una vista DERIVADA por categoría para la UI previa al Paso 2d.
// Paso 2 (D14, D7): grupos con las etiquetas nuevas (Principales, Insignia…) para el kit
// base y UN GRUPO POR ESPECIALIZACIÓN para las habilidades de su kit (`spec`).
// ------------------------------------------------------------
const CAT_NODES = [
  { cats: ['basic'],              kind: 'basic',    name: 'Básicas' },
  { cats: ['spender'],            kind: 'core',     name: 'Principales' },
  { cats: ['movement'],           kind: 'core',     name: CAT_LABELS.movement },
  { cats: ['defense', 'utility'], kind: 'core',     name: `${CAT_LABELS.defense} y ${CAT_LABELS.utility.toLowerCase()}` },
  { cats: ['spec'],               kind: 'core',     name: CAT_LABELS.spec },
  { cats: ['ultimate'],           kind: 'ultimate', name: 'Definitivas' },
];
function buildSkillTree(prefix, skills, specs = []) {
  const out = [];
  const base = skills.filter(s => s.kind !== 'talent' && !s.spec);
  for (const nd of CAT_NODES) {
    const list = base.filter(s => nd.cats.includes(s.cat)).sort((x, y) => x.req - y.req);
    if (!list.length) continue;
    out.push({ id: `${prefix}_${nd.cats[0]}`, kind: nd.kind, name: nd.name, req: Math.min(...list.map(s => s.req)), skills: list.map(s => s.id) });
  }
  // kit de cada especialización (D7): un grupo con su nombre
  for (const sp of specs) {
    const list = skills.filter(s => s.kind !== 'talent' && s.spec === sp.id).sort((x, y) => x.req - y.req);
    if (!list.length) continue;
    out.push({ id: `${prefix}_spec_${sp.id}`, kind: 'core', spec: sp.id, name: sp.name || sp.id, req: Math.min(...list.map(s => s.req)), skills: list.map(s => s.id) });
  }
  return out;
}
function classResource(id, skills) {
  const def = RESOURCE_DEFS[id];
  const basic = skills.find(s => s.cat === 'basic' && s.type === 'weapon') || skills.find(s => s.cat === 'basic');
  // `gen` = generación del básico de arma (la UI lo muestra en la barra)
  return { id: def.id, name: def.name, icon: def.icon, color: def.color, start: def.start, regen: def.regen, gen: basic?.gen || 0 };
}
// Paso 2c.0: las activas de talento (TALENTS.skills) entran en el catálogo de la
// clase NORMALIZADAS como las base (tags ⊇ {cat, elem}, slots, max) con kind
// 'talent'; se conocen solo si talentAgg.grants las concede (skill-resolve.isKnown).
// D29 (Paso 2): con el catálogo 2g (CATALOG_V = 2) las 6 activas de talento viven en el
// PROPIO catálogo (skills-<clase>.js, `kind:'talent'`) y <CLASE>_TALENT_SKILLS es solo una
// lista de ids: no se fusiona nada de los talentos. `forge` = forja de la clase (§3.5).
function makeClass(base, prefix, rawSkills, { talents = null, catalogV = 1, forge = {} } = {}) {
  let list = rawSkills;
  if (catalogV !== 2) {
    const ids = new Set(rawSkills.map(s => s.id));
    const extra = (talents?.skills || []).filter(s => s && typeof s === 'object' && !ids.has(s.id)).map(s => ({ ...s, kind: 'talent' }));
    list = [...rawSkills, ...extra];
  }
  const skills = list.map(s => normalizeSkillDef(s.talent && !s.kind ? { ...s, kind: 'talent' } : s));
  return { ...base, skills, forge: forge || {}, catalogV, tree: buildSkillTree(prefix, skills, talents?.specs || []), resource: classResource(base.resourceId, skills) };
}

export const CLASSES = {
  guerrero: makeClass({
    id: 'guerrero', name: 'Guerrero', icon: '⚔️', color: 0xb5452a,
    desc: 'Maestro del combate cuerpo a cuerpo. Fuerte, resistente y letal de cerca.',
    base: { fue: 18, des: 10, vit: 16, ene: 6 },
    mainStat: 'fue',
    baseHP: 45, hpPerVit: 4, hpPerLevel: 4,
    atkRange: 2.1, atkTime: 1.0, ranged: false, atk: 'cleave',
    fists: [3, 6],
    resourceId: 'furia',
    basicName: 'Tajo', basicDesc: 'Ataque básico: corta a los enemigos cercanos y genera Furia.',
  }, 'g', GUERRERO_SKILLS, { talents: GUERRERO_TALENTS, catalogV: GUERRERO_CATALOG_V, forge: GUERRERO_SKILL_FORGE }),
  maga: makeClass({
    id: 'maga', name: 'Maga', icon: '🔮', color: 0x3a6bd6,
    desc: 'Domina los elementos a distancia. Frágil pero con un poder inmenso.',
    base: { fue: 8, des: 10, vit: 10, ene: 22 },
    mainStat: 'ene',
    baseHP: 70, hpPerVit: 3, hpPerLevel: 6,
    atkRange: 7, atkTime: 1.1, ranged: true, atk: 'bolt',
    fists: [2, 5],
    resourceId: 'mana',
    basicName: 'Dardo Arcano', basicDesc: 'Ataque básico: lanza un dardo a distancia y recupera Maná.',
  }, 'm', MAGA_SKILLS, { talents: MAGA_TALENTS, catalogV: MAGA_CATALOG_V, forge: MAGA_SKILL_FORGE }),
  arquera: makeClass({
    id: 'arquera', name: 'Arquera', icon: '🏹', color: 0x3d8c45,
    desc: 'Rápida y precisa. Acaba con sus enemigos antes de que se acerquen.',
    base: { fue: 10, des: 20, vit: 12, ene: 8 },
    mainStat: 'des',
    baseHP: 65, hpPerVit: 3.5, hpPerLevel: 6,
    atkRange: 8.5, atkTime: 0.9, ranged: true, atk: 'arrow',
    fists: [2, 5],
    resourceId: 'energia',
    basicName: 'Disparo Rápido', basicDesc: 'Ataque básico: dispara una flecha veloz y recupera Energía.',
  }, 'a', ARQUERA_SKILLS, { talents: ARQUERA_TALENTS, catalogV: ARQUERA_CATALOG_V, forge: ARQUERA_SKILL_FORGE }),
};

// Valor de una propiedad escalable [base, porNivel] (compat: el catálogo de
// habilidades ya no la usa; su rango escala con combat-math.rankCoef/rankBuff)
export function skillVal(arr, lvl) {
  if (!Array.isArray(arr)) return arr;
  return arr[0] + arr[1] * (lvl - 1);
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

// Escalado de enemigos por nivel de área (= piso). Fórmulas en combat-math:
// vida ∝ G(AL)^ENEMY_CURVE.hpExp, daño ∝ G(AL)^dmgExp, XP lineal. Los jefes multiplican su vida
// con una rampa por nivel de área (bossHpMult: ×4,5 en AL1 → ×11 en AL≥9) para
// combates de ~30–60 s al principio y ~1 min después (banco de balance).
export function scaleEnemy(def, floor) {
  const al = Math.max(1, floor || 1);
  const bossMul = (def.boss ? bossHpMult(al) : 1) * (def.uber ? UBER_HP_MULT : 1);
  return {
    ...def,
    hp: Math.max(1, Math.round(def.hp * enemyHpScale(al) * bossMul)),
    dmg: def.dmg > 0 ? Math.max(1, Math.round(def.dmg * enemyDmgScale(al))) : 0, // el goblin no pega
    xp: Math.round(def.xp * enemyXpScale(al)),
    level: al,
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
  campeon: { id: 'campeon', name: 'Campeón', icon: '⚔️', hp: RANK_HP.campeon, dmg: RANK_DMG.campeon, xp: 2.5, scale: 1.12, glow: 0x182866, labelCls: 'lbl-champ' },
  elite:   { id: 'elite',   name: 'Élite',   icon: '☠️', hp: RANK_HP.elite, dmg: RANK_DMG.elite, xp: 4.0, scale: 1.28, glow: 0x5a3a00, labelCls: 'lbl-elite' },
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
// rng (opcional): stream 'spawn' del mundo (js/rng.js); sin él, Math.random.
export function rollEnemyRank(def, floor, rng = Math.random) {
  const r = rng();
  let rank = null;
  if (r < 0.04 + Math.min(0.04, floor * 0.005)) rank = ENEMY_RANKS.elite;
  else if (r < 0.14) rank = ENEMY_RANKS.campeon;
  if (!rank) return def;

  const out = {
    ...def, rank: rank.id, glow: rank.glow, labelCls: rank.labelCls,
    // élite: vida según el nivel de área (combat-math.eliteHpMult); campeón fijo
    hp: Math.round(def.hp * (rank.id === 'elite' ? eliteHpMult(floor) : rank.hp)), dmg: Math.round(def.dmg * rank.dmg),
    xp: Math.round(def.xp * rank.xp), scale: (def.scale || 1) * rank.scale,
    rankLabel: `${rank.icon} ${def.name} ${rank.name}`,
  };
  if (rank.id === 'elite') {
    const mod = ELITE_MODS[Math.floor(rng() * ELITE_MODS.length)];
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

// Elenco de un spawn de mundo (sueltos/élites de tesoro): tipo escalado + rango.
// kind 'elite' reintenta hasta 25 veces para garantizar un élite. Pura: con el
// stream 'spawn' del mundo, misma semilla → mismo elenco (lo usa Game.loadWorld).
export function rollSpawnDef(kind, floor, rng = Math.random) {
  const roll = () => rollEnemyRank(scaleEnemy(pickEnemyDef(floor, rng), floor), floor, rng);
  let def = roll();
  if (kind === 'elite') for (let t = 0; t < 25 && def.rank !== 'elite'; t++) def = roll();
  return def;
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

export const PET_PRICE = 500; // (compat) precio base; ver PET_KINDS

// ------------------------------------------------------------
// MASCOTA DE UTILIDAD: compañero que NO hace daño. Se compra y mejora con el
// Domador de Bestias (NPC del pueblo). Tres modelos (cosmético + radio base de
// recolección distinto), mejoras por oro y un "collar" que da un aura de
// utilidad (no DPS). El estado vive en player.pet:
//   { kind, owned:{lobo:true}, level, xp, upgrades:{}, collar }
// ------------------------------------------------------------
export const PET_KINDS = {
  lobo:     { name: 'Lobo de caza',     icon: '🐺', price: 500,  color: 0x8a8d96, model: 'wolf', baseRadius: 5.5,
              desc: 'Veterano y fiel. Buen radio de recolección a ras de suelo.' },
  halcon:   { name: 'Halcón vigía',     icon: '🦅', price: 1400, color: 0xb98a55, model: 'hawk', baseRadius: 7.0,
              desc: 'Sobrevuela el campo: mayor radio de recolección.' },
  familiar: { name: 'Familiar arcano',  icon: '✨', price: 3200, color: 0x66ccff, model: 'wisp', baseRadius: 6.0,
              desc: 'Orbe etéreo. Imán de oro de serie y aura más intensa.' },
};

// Mejoras del pet (gold sink). `max` niveles; coste crece con el nivel actual.
export const PET_UPGRADES = {
  pickup:    { name: 'Radio de recolección', icon: '🧲', max: 5, costBase: 300, per: 1.1,
               desc: 'Auto-recoge oro y pociones desde más lejos.' },
  magnet:    { name: 'Imán de tesoros',      icon: '💰', max: 3, costBase: 450,
               desc: 'Atrae oro y orbes cercanos hacia ti.' },
  materials: { name: 'Recolección de materiales', icon: '💎', max: 2, costBase: 600,
               desc: 'Nv.1: recoge gemas y runas. Nv.2: también fragmentos, llaves y glifos.' },
  speed:     { name: 'Agilidad',             icon: '💨', max: 3, costBase: 250,
               desc: 'El compañero se mueve más rápido.' },
};

// Collares: aura de UTILIDAD (un stat de jugador, nunca daño). Se compran/cambian.
export const PET_COLLARS = {
  none:    { name: 'Sin collar',          icon: '⭕', price: 0,    stat: null,    value: 0,  desc: 'Sin aura.' },
  oro:     { name: 'Collar de Avaricia',  icon: '🪙', price: 800,  stat: 'goldPct', value: 20, desc: '+20% oro recogido.' },
  fortuna: { name: 'Collar de Fortuna',   icon: '🍀', price: 1100, stat: 'mf',     value: 25, desc: '+25 hallazgo mágico.' },
  vigor:   { name: 'Collar de Vigor',     icon: '❤️', price: 1100, stat: 'spdPct', value: 8,  desc: '+8% velocidad de movimiento.' },
};

// (Paso 2c.0) Las MAESTRÍAS DE CLASE se eliminaron: las sustituyen los talentos
// (js/talents.js + js/talents-<clase>.js). La migración v4 (save-schema) solo
// necesita el id de texto de la maestría, que es el de la especialización.

// ------------------------------------------------------------
// ERAS (temporadas locales): cada semana cambia un MUTADOR global (un giro al
// estilo "artefacto" de roguelite) y 3 OBJETIVOS semanales con recompensa. Todo
// se deriva de forma determinista del índice de semana, así que no necesita red.
// El mutador reaprovecha recompute (stat/power) + xpMul/goldMul; los objetivos
// se miden como deltas de p.records desde una instantánea al empezar la era.
// ------------------------------------------------------------
export const ERA_MUTATORS = [
  { id: 'fervor',    name: 'Era del Fervor',     icon: '⚔️', desc: '+15% de daño',                         stat: { dmgPct: 15 } },
  { id: 'fortuna',   name: 'Era de la Fortuna',  icon: '🍀', desc: '+40 hallazgo mágico y +25% de oro',     stat: { mf: 40 }, goldMul: 1.25 },
  { id: 'sabiduria', name: 'Era de la Sabiduría',icon: '📖', desc: '+50% de experiencia',                   xpMul: 1.5 },
  { id: 'celeridad', name: 'Era de la Celeridad', icon: '💨', desc: '+12% vel. de ataque y de movimiento',  stat: { aspdPct: 12, spdPct: 12 } },
  { id: 'furia',     name: 'Era de la Furia',    icon: '🔥', desc: '+10% crítico y poder de Furia',          stat: { crit: 10 }, power: 'furia' },
  { id: 'cazador',   name: 'Era del Cazador',    icon: '🏹', desc: '+12% crítico y +8% daño',               stat: { crit: 12, dmgPct: 8 } },
  { id: 'bastion',   name: 'Era del Bastión',    icon: '🛡️', desc: '+80 vida y +30 armadura',               stat: { hp: 80, arm: 30 } },
];

// objetivos semanales: se miden como CUENTA desde el inicio de la era (delta de
// p.records[metric]). reward: oro y, a veces, un Fragmento de Pináculo.
export const ERA_OBJECTIVES = [
  { id: 'o_kill',   metric: 'kills',       goal: 250, desc: 'Derrota 250 enemigos',          reward: { gold: 1500 } },
  { id: 'o_boss',   metric: 'bossKills',   goal: 6,   desc: 'Derrota 6 jefes',               reward: { gold: 2000, frag: true } },
  { id: 'o_elite',  metric: 'eliteKills',  goal: 20,  desc: 'Abate 20 élites o campeones',   reward: { gold: 1500 } },
  { id: 'o_chest',  metric: 'chests',      goal: 12,  desc: 'Saquea 12 cofres',              reward: { gold: 1200 } },
  { id: 'o_gold',   metric: 'goldEarned',  goal: 6000,desc: 'Consigue 6000 de oro',          reward: { gold: 1000 } },
  { id: 'o_legend', metric: 'legendaries', goal: 4,   desc: 'Encuentra 4 legendarios',       reward: { gold: 2000, frag: true } },
  { id: 'o_quest',  metric: 'quests',      goal: 5,   desc: 'Completa 5 misiones',           reward: { gold: 1500 } },
  { id: 'o_mimic',  metric: 'mimics',      goal: 3,   desc: 'Descubre 3 mímicos',            reward: { gold: 1800, frag: true } },
];

// índice de semana (bucket de 7 días desde epoch) → id de era determinista
export function eraIdForTime(now = Date.now()) {
  return Math.floor(now / (7 * 24 * 60 * 60 * 1000));
}

// ------------------------------------------------------------
// GUÍA DE SISTEMAS (códice de onboarding): lista TODO lo que ofrece el juego,
// para que un jugador nuevo descubra lo que existe (aunque aún no pueda usarlo).
// `req` = nivel de personaje necesario (0 = desde el inicio); `reqText` = cómo
// se accede cuando no es por nivel. La UI marca 🔒/✅ según el estado.
// ------------------------------------------------------------
export const SYSTEMS_GUIDE = [
  { icon: '⚔️', name: 'Atributos y daño', desc: 'Reparte puntos en Fuerza/Destreza/Vitalidad/Energía para moldear a tu héroe.', req: 1 },
  { icon: '📖', name: 'Habilidades (estilo D4)', desc: 'Se aprenden solas al subir de nivel: la Básica GENERA recurso (Furia/Maná/Energía) y las Principales lo GASTAN. Barra de 6 ranuras: 🖱️Izq Básica · 🖱️Der Principal · 1 movilidad · 2 defensa, utilidad o 2.ª Principal · 3 Insignia de tu especialización · 4 definitiva. Libro de habilidades (T): arrastra cada habilidad a su ranura; clic derecho en una ranura para cambiarla.', req: 1 },
  { icon: '⚒️', name: 'Forja de habilidades', desc: 'Cada habilidad gana una Mejora 3 niveles después de aprenderla y abre dos Variantes a los 6: elige una (o ninguna) en el libro (T). Cambiar es gratis fuera de combate.', req: 4 },
  { icon: '💎', name: 'Soportes de habilidad', desc: 'Engarza hasta 2 soportes por habilidad para modificar su comportamiento (estilo gemas de PoE).', reqText: 'Caen como botín' },
  { icon: '🌿', name: 'Talentos y especialización', desc: 'En el nivel 10 eliges 1 de 3 especializaciones (con su kit de habilidades y su indicador propio). Hasta el nivel 100 ganas 1 punto por nivel, cada uno para un solo sistema: árbol de clase, de especialización, Paragon o tablero. Cambiarla es gratis fuera de combate (tecla N).', req: 10 },
  { icon: '🌟', name: 'Paragon (árbol héroe)', desc: 'Al gastar los 31 puntos de tu especialización se abre su árbol héroe: un nodo clave gratis y 10 puntos más (Nv71–80).', req: 71 },
  { icon: '🔷', name: 'Tablero de glifos', desc: 'Desde el nivel 81, 16 puntos para el tablero de tu clase; sus nodos legendarios dan estadísticas y los glifos crecen con los nodos adyacentes.', req: 81 },
  { icon: '🏆', name: 'Eras (temporadas)', desc: 'Cada semana cambia un mutador global y trae 3 objetivos con recompensa y un título.', req: 1 },
  { icon: '☠️', name: 'Tormento', desc: 'Dificultad global seleccionable en la Estatua del Mundo: más reto = mejor botín.', reqText: 'Estatua del Mundo' },
  { icon: '🌀', name: 'Grietas', desc: 'Usa Llaves de Grieta para zonas corruptas de dificultad creciente y gran botín.', reqText: 'Consigue Llaves de Grieta' },
  { icon: '🌟', name: 'Bendiciones', desc: 'Cada grieta completada ofrece una bendición permanente (una por categoría).', reqText: 'Completa grietas' },
  { icon: '👁️', name: 'Pináculo', desc: 'Reúne 3 Fragmentos e invoca al jefe uber para conseguir objetos míticos.', reqText: 'Reúne 3 Fragmentos' },
  { icon: '🩸', name: 'Pactos', desc: 'En mazmorras, sella un pacto: enemigos más fuertes a cambio de más recompensa.', reqText: 'Altares en mazmorras' },
  { icon: '📜', name: 'Contratos de zona', desc: 'Objetivos por zona abierta; complétalos todos para una gran recompensa.', reqText: 'En zonas abiertas' },
  { icon: '🐾', name: 'Compañero', desc: 'Adopta y mejora una mascota de UTILIDAD (recoge botín, imán de oro, auras) con el Domador.', reqText: 'Domador de Bestias' },
  { icon: '🔨', name: 'Cubo, engarce y mejora', desc: 'Transmuta objetos, engarza gemas/runas, reforja afijos y mejora la calidad (masterworking).', req: 1 },
  { icon: '🗃️', name: 'Alijo compartido', desc: 'Almacén compartido entre todos tus héroes del mismo dispositivo.', req: 1 },
];

// Soportes de habilidad (estilo gemas de soporte de PoE): modifican UNA
// habilidad. Se encuentran como botín, se aprenden y se engarzan (van CON la
// habilidad, no con la ranura). Paso 2b.0 (§4.3): la compatibilidad va por TAGS
// — `requires` (AND; 'a|b' = OR; '@dmg' coef>0, '@cost' coste>0, '@cd' CD>0) y
// `forbids` (cualquiera excluye). Su efecto en combate es la tabla SUPPORT_MOD de
// js/skill-resolve.js. `tag`: 'pro' (beneficio neto) o 'tradeoff' (contrapartida).
export const SUPPORTS = [
  { id: 'amplify', name: 'Amplificado', icon: '🔆', desc: '+30% de daño de la habilidad',
    effect: '+30% daño', tag: 'pro', fits: 'habilidades de daño (no definitivas)',
    requires: ['@dmg'], forbids: ['ultimate'] },
  { id: 'multi',   name: 'Multiproyectil', icon: '🔱', desc: '+2 proyectiles',
    effect: '+2 proyectiles', tag: 'pro', fits: 'proyectiles (no canalizadas)',
    requires: ['proj'], forbids: ['channel'] },
  { id: 'pierce',  name: 'Perforante', icon: '➶', desc: 'Los proyectiles atraviesan a los enemigos',
    effect: 'atraviesa enemigos', tag: 'pro', fits: 'proyectiles (no canalizadas)',
    requires: ['proj'], forbids: ['channel'] },
  { id: 'wide',    name: 'Expansivo', icon: '⭕', desc: '+45% de radio de área',
    effect: '+45% radio', tag: 'pro', fits: 'áreas, conos y zonas',
    requires: ['area|cone|zone'] },
  { id: 'freeze',  name: 'Gélido', icon: '❄️', desc: 'Ralentiza a los enemigos golpeados',
    effect: 'ralentiza al golpear', tag: 'pro', fits: 'habilidades de daño (no definitivas)',
    requires: ['@dmg'], forbids: ['ultimate'] },

  // --- SOPORTES 2.0 ---
  { id: 'chain',   name: 'Encadenado', icon: '⚡', desc: 'El proyectil rebota a 2 enemigos cercanos; −25% de daño por salto',
    effect: 'rebota a 2 enemigos', trade: '−25% daño/salto', tag: 'tradeoff', fits: 'proyectiles (no canalizadas)',
    requires: ['proj'], forbids: ['channel'] },
  { id: 'concentrated', name: 'Concentrado', icon: '🎯', desc: '+35% de daño, pero −30% de radio de área',
    effect: '+35% daño', trade: '−30% radio', tag: 'tradeoff', fits: 'áreas, conos y zonas',
    requires: ['area|cone|zone'] },
  { id: 'echo',    name: 'Eco', icon: '🔁', desc: 'Repite la habilidad ~0.5s después al 50% de daño; +60% de coste de recurso',
    effect: 'repite al 50%', trade: '+60% coste', tag: 'tradeoff', fits: 'daño (no canalizadas, definitivas ni movilidad)',
    requires: ['@dmg'], forbids: ['channel', 'ultimate', 'movement'] },
  { id: 'bleed',   name: 'Sed de Sangre', icon: '🩸', desc: 'Aplica sangrado: daño por tiempo durante 3s tras el golpe',
    effect: 'DoT sangrado 3s', tag: 'pro', fits: 'daño cuerpo a cuerpo, proyectil o área',
    requires: ['@dmg', 'melee|proj|area'] },
  { id: 'poison',  name: 'Veneno', icon: '☠️', desc: 'Aplica veneno: daño por tiempo durante 5s tras el golpe',
    effect: 'DoT veneno 5s', tag: 'pro', fits: 'daño cuerpo a cuerpo, proyectil o área',
    requires: ['@dmg', 'melee|proj|area'] },
  { id: 'coldblood', name: 'Sangre Fría', icon: '🧊', desc: 'Crítico al tope (60%) contra enemigos ralentizados/congelados (combo con Gélido)',
    effect: '+crítico vs ralentizados', tag: 'pro', fits: 'habilidades de daño (no definitivas)',
    requires: ['@dmg'], forbids: ['ultimate'] },
  { id: 'overcharge', name: 'Sobrecarga', icon: '💥', desc: '+50% de daño, pero +40% de coste de recurso',
    effect: '+50% daño', trade: '+40% coste', tag: 'tradeoff', fits: 'daño (no básicos ni definitivas)',
    requires: ['@dmg'], forbids: ['ultimate', 'basic'] },

  // --- SOPORTES 3.0 (utilidad / meta): builds de sostenibilidad y uptime ---
  { id: 'efficient', name: 'Eficiente', icon: '💧', desc: '−35% de coste de recurso de la habilidad',
    effect: '−35% coste', tag: 'pro', fits: 'habilidades con coste',
    requires: ['@cost'] },
  { id: 'swift', name: 'Raudo', icon: '⏱️', desc: '−30% de enfriamiento de la habilidad',
    effect: '−30% enfriamiento', tag: 'pro', fits: 'habilidades con enfriamiento (no definitivas)',
    requires: ['@cd'], forbids: ['ultimate'] },
  { id: 'focused', name: 'Certero', icon: '🎯', desc: '+25% de prob. de crítico de la habilidad',
    effect: '+25% crítico', tag: 'pro', fits: 'habilidades de daño (no definitivas)',
    requires: ['@dmg'], forbids: ['ultimate'] },
  { id: 'lasting', name: 'Persistente', icon: '⌛', desc: '+80% de duración de buff y +50% de daño de los DoT',
    effect: '+duración buff / +DoT', tag: 'pro', fits: 'buffs, DoT, auras, zonas y escudos',
    requires: ['buff|dot|aura|zone|shield'] },
];

// ------------------------------------------------------------
// RAMAS (Paso 2b) — @deprecated (D23): la forja (Mejora + 2 Variantes, §3.5) las sustituye.
// Los exports quedan como stubs VACÍOS mientras algún módulo los importe (ui.js, la
// migración congelada de save-schema.js, el banco); C1 los borra en E5. Las ramas que los
// catálogos v1 aún declaran (<CLASE>_SKILL_MODS) ya no tienen efecto.
// ------------------------------------------------------------
/** @deprecated Paso 2: sin ramas (forja). Siempre vacío. */
export const SKILL_MODS = Object.freeze({});
void GUERRERO_SKILL_MODS; void MAGA_SKILL_MODS; void ARQUERA_SKILL_MODS;

/** @deprecated Paso 2: sin ramas. Devuelve mods neutros. */
export function aggregateSkillMods(skId, chosen) {
  void skId; void chosen;
  return emptyMods();
}

// ------------------------------------------------------------
// Paso 2 (2f + 2g) · FORJA Y BARRAS (E0.6, stubs de contrato: docs/paso2-implementacion.md
// §3.5, D3, D6 y D24). Cada clase los declara en js/skills-<clase>.js (vacíos hasta que KA los
// llene en E2) y aquí solo se fusionan, como SKILL_MODS. Los ids de habilidad y de
// especialización son únicos entre clases: SKILL_FORGE, SPEC_BAR y FORGE_RECO van planos.
// ------------------------------------------------------------
// skillId → { mejora, vars: [i, ii] }   (la forja de cada habilidad; §3.5)
export const SKILL_FORGE = { ...GUERRERO_SKILL_FORGE, ...MAGA_SKILL_FORGE, ...ARQUERA_SKILL_FORGE };
// specId → { bar: { lmb, rmb, k1, k2, k3, k4 }, sel }   (barra de la especialización; D6)
export const SPEC_BAR = { ...GUERRERO_SPEC_BAR, ...MAGA_SPEC_BAR, ...ARQUERA_SPEC_BAR };
// specId → { skillId: 'i' | 'ii' }   (forja recomendada al elegir especialización; D3)
export const FORGE_RECO = { ...GUERRERO_FORGE_RECO, ...MAGA_FORGE_RECO, ...ARQUERA_FORGE_RECO };
// classId → { lmb, rmb, k1, k2, k3, k4 } | null   (barra de reserva de la migración v4 → v5; §3.11)
export const FALLBACK_BAR = { guerrero: GUERRERO_FALLBACK_BAR, maga: MAGA_FALLBACK_BAR, arquera: ARQUERA_FALLBACK_BAR };
// classId → 1 (catálogo v4) | 2 (catálogo 2g; lo sube KA1 de cada clase)
export const CATALOG_V = { guerrero: GUERRERO_CATALOG_V, maga: MAGA_CATALOG_V, arquera: ARQUERA_CATALOG_V };
// kit de una especialización (D7: habilidades del catálogo con `spec: '<specId>'`) → [skillId].
// Con el catálogo v4 (ninguna habilidad trae `spec`) devuelve []. Firma fijada en §2 (W2).
export function specKitOf(classId, specId) {
  return (CLASSES[classId]?.skills || []).filter(s => specId && s.spec === specId).map(s => s.id);
}

// Zonas abiertas (regiones): bioma, nivel de desbloqueo y piso base de dificultad
export const ZONE_LIST = [
  // `home`: la zona tiene campamento (punto de reaparición elegible).
  // `links`: zonas adyacentes conectadas por un "camino" (mundo D4-lite).
  // `stronghold`: zona con un Bastión; al derrotar a su guardián se RECLAMA y
  // pasa a tener campamento (refugio) elegible como hogar (estilo D4).
  { biome: 'Cripta', minLevel: 1, floor: 3, home: true, links: ['Cavernas de Hielo'] },
  { biome: 'Cavernas de Hielo', minLevel: 6, floor: 8, stronghold: true, links: ['Cripta', 'Infierno'] },
  { biome: 'Infierno', minLevel: 11, floor: 13, stronghold: true, links: ['Cavernas de Hielo', 'Abismo Estelar'] },
  { biome: 'Abismo Estelar', minLevel: 16, floor: 18, links: ['Infierno'] },
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

// Tablero de Paragon (glifos): vive en js/paragon-board.js (Paso 2, E0.3; dueño W1 en E1).
// Aquí solo se reexporta: los importadores de data.js no cambian.
export { PARAGON_CATS, PG_CFG, buildParagonBoard, PARAGON_BOARDS, PARAGON_BOARD, paragonBoardFor, PARAGON_BOARD_SIZE } from './paragon-board.js';
export const STAT_NAMES = { fue: 'Fuerza', des: 'Destreza', vit: 'Vitalidad', ene: 'Energía' };
export const STAT_DESC = {
  fue: 'Aumenta el daño físico',
  des: 'Aumenta el crítico y la armadura',
  vit: 'Aumenta la vida máxima',
  ene: 'Aumenta el maná máximo y el daño de hechizos',
};
