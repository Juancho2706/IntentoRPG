// ============================================================
// Sistema de objetos: generación de loot, rarezas y afijos
// ============================================================
import { SUPPORTS } from './data.js';

export const RARITIES = {
  normal:   { id: 'normal',   name: 'Normal',    color: '#e8e6e0', glow: 0xcccccc, affixes: [0, 0], statMult: 1.0,  weight: 82 },
  magico:   { id: 'magico',   name: 'Mágico',    color: '#6f8cff', glow: 0x4466ff, affixes: [1, 2], statMult: 1.1,  weight: 15 },
  raro:     { id: 'raro',     name: 'Raro',      color: '#ffd24a', glow: 0xffcc00, affixes: [3, 4], statMult: 1.25, weight: 2.2 },
  legendario:{ id: 'legendario', name: 'Legendario', color: '#ff8c2e', glow: 0xff6600, affixes: [4, 5], statMult: 1.5, weight: 0.3 },
  conjunto: { id: 'conjunto', name: 'Conjunto',  color: '#4ade80', glow: 0x33cc66, affixes: [0, 0], statMult: 1.3,  weight: 0 },
};

// Ranuras de equipo estilo Diablo (ring2 acepta cualquier anillo)
export const SLOT_NAMES = {
  weapon: 'Arma', offhand: 'Escudo', helm: 'Casco', shoulders: 'Hombreras',
  chest: 'Armadura', gloves: 'Guantes', belt: 'Cinturón', pants: 'Pantalones',
  boots: 'Botas', amulet: 'Amuleto', ring: 'Anillo', ring2: 'Anillo 2',
};

export const ARMOR_SLOTS = ['helm', 'chest', 'boots', 'shoulders', 'gloves', 'pants', 'belt', 'offhand'];

const BASES = [
  { slot: 'weapon', names: ['Espada Corta', 'Hacha de Guerra', 'Maza', 'Espada Larga', 'Daga'], icon: '🗡️', cls: 'guerrero' },
  { slot: 'weapon', names: ['Arco Corto', 'Arco de Caza', 'Arco Largo'], icon: '🏹', cls: 'arquera' },
  { slot: 'weapon', names: ['Bastón', 'Vara Arcana', 'Cetro'], icon: '🪄', cls: 'maga' },
  { slot: 'offhand', names: ['Escudo de Madera', 'Escudo de Hierro', 'Escudo de Torre'], icon: '🛡️', cls: 'guerrero' },
  { slot: 'offhand', names: ['Orbe Arcano', 'Foco Rúnico', 'Globo de Poder'], icon: '🔮', cls: 'maga' },
  { slot: 'offhand', names: ['Carcaj de Cuero', 'Aljaba Reforzada', 'Carcaj del Cazador'], icon: '🪶', cls: 'arquera' },
  { slot: 'helm', names: ['Capucha', 'Casco de Cuero', 'Yelmo', 'Casco de Hierro'], icon: '🪖' },
  { slot: 'shoulders', names: ['Hombreras de Cuero', 'Espaldares', 'Hombreras de Placas'], icon: '🎽' },
  { slot: 'chest', names: ['Túnica', 'Armadura de Cuero', 'Cota de Malla', 'Coraza'], icon: '🧥' },
  { slot: 'gloves', names: ['Guantes de Tela', 'Guantes de Cuero', 'Manoplas'], icon: '🧤' },
  { slot: 'belt', names: ['Faja', 'Cinturón de Cuero', 'Cinturón Tachonado'], icon: '🔗' },
  { slot: 'pants', names: ['Calzas', 'Pantalones de Cuero', 'Quijotes'], icon: '👖' },
  { slot: 'boots', names: ['Sandalias', 'Botas de Cuero', 'Grebas'], icon: '🥾' },
  { slot: 'ring', names: ['Anillo de Cobre', 'Anillo de Plata', 'Anillo de Oro'], icon: '💍' },
  { slot: 'amulet', names: ['Talismán', 'Amuleto', 'Colgante'], icon: '📿' },
];

// stat: clave, name: texto con {v}, rango base en ilvl 1, escala por ilvl
export const AFFIX_POOL = [
  { stat: 'fue',     name: '+{v} Fuerza',                    min: 1, max: 3 },
  { stat: 'des',     name: '+{v} Destreza',                  min: 1, max: 3 },
  { stat: 'vit',     name: '+{v} Vitalidad',                 min: 1, max: 3 },
  { stat: 'ene',     name: '+{v} Energía',                   min: 1, max: 3 },
  { stat: 'hp',      name: '+{v} Vida máxima',               min: 5, max: 12 },
  { stat: 'mp',      name: '+{v} Maná máximo',               min: 4, max: 10 },
  { stat: 'dmgPct',  name: '+{v}% Daño',                     min: 4, max: 10, flat: true },
  { stat: 'crit',    name: '+{v}% Prob. de crítico',         min: 2, max: 5, flat: true },
  { stat: 'arm',     name: '+{v} Armadura',                  min: 3, max: 8 },
  { stat: 'spdPct',  name: '+{v}% Velocidad de movimiento',  min: 4, max: 8, flat: true },
  { stat: 'aspdPct', name: '+{v}% Velocidad de ataque',      min: 4, max: 9, flat: true },
  { stat: 'mf',      name: '+{v}% Hallazgo mágico',          min: 5, max: 12, flat: true },
  // stats secundarios estilo Diablo 3/4
  { stat: 'lph',     name: '+{v} Vida al golpear',           min: 1, max: 3, secondary: true },
  { stat: 'mph',     name: '+{v} Maná al golpear',           min: 1, max: 2, secondary: true },
  { stat: 'cdr',     name: '+{v}% Reducción de enfriamiento', min: 3, max: 7, flat: true, secondary: true },
  { stat: 'thorns',  name: '+{v} Espinas (daño reflejado)',  min: 2, max: 5, secondary: true },
];

// Conjuntos: piezas verdes con bonus por llevar 2 o 3 equipadas
export const SETS = [
  {
    id: 'lobo', name: 'Senda del Lobo', icon: '🐺',
    pieces: [
      { slot: 'weapon', name: 'Colmillo del Lobo', icon: '🗡️', affixes: { fue: 3, dmgPct: 6 } },
      { slot: 'helm', name: 'Yelmo del Lobo', icon: '🪖', affixes: { vit: 3, arm: 4 } },
      { slot: 'chest', name: 'Pelliza del Lobo', icon: '🧥', affixes: { hp: 10, arm: 5 } },
    ],
    bonuses: { 2: { dmgPct: 12 }, 3: { hp: 30, aspdPct: 12 } },
  },
  {
    id: 'hechicero', name: 'Legado del Hechicero', icon: '🔮',
    pieces: [
      { slot: 'weapon', name: 'Vara del Hechicero', icon: '🪄', affixes: { ene: 3, dmgPct: 6 } },
      { slot: 'ring', name: 'Sello del Hechicero', icon: '💍', affixes: { mp: 8, ene: 2 } },
      { slot: 'amulet', name: 'Ojo del Hechicero', icon: '📿', affixes: { mp: 6, crit: 3 } },
    ],
    bonuses: { 2: { mp: 25 }, 3: { dmgPct: 15, ene: 5 } },
  },
  {
    id: 'cazador', name: 'Paso del Cazador', icon: '🏹',
    pieces: [
      { slot: 'weapon', name: 'Arco del Cazador', icon: '🏹', affixes: { des: 3, crit: 3 } },
      { slot: 'boots', name: 'Pisadas del Cazador', icon: '🥾', affixes: { spdPct: 6, des: 2 } },
      { slot: 'helm', name: 'Visera del Cazador', icon: '🪖', affixes: { crit: 3, des: 2 } },
    ],
    bonuses: { 2: { crit: 6 }, 3: { spdPct: 12, dmgPct: 12 } },
  },
];

// Poderes únicos que cambian cómo juegas (solo en legendarios y reliquias)
export const LEGENDARY_POWERS = [
  { id: 'festin',      name: 'del Festín',   desc: 'Recuperas 6% de tu vida máxima al matar un enemigo.' },
  { id: 'volatil',     name: 'Volátil',      desc: 'Los enemigos explotan al morir y dañan a los cercanos.' },
  { id: 'multidisparo', name: 'del Vendaval', desc: 'Tus ataques y habilidades de proyectil lanzan +1 proyectil.' },
  { id: 'agil',        name: 'del Viento',   desc: 'Tu esquiva se recarga un 40% más rápido.' },
  { id: 'furia',       name: 'de la Furia',  desc: '+25% de daño mientras tu vida esté por encima del 80%.' },
  { id: 'avaricia',    name: 'de la Avaricia', desc: 'Los enemigos sueltan más oro y tienes +30% de hallazgo mágico.' },
];

const PREFIXES = ['Feroz', 'Sombrío', 'Brillante', 'Antiguo', 'Maldito', 'Sagrado', 'Veloz', 'Cruel', 'Glacial', 'Ígneo'];
const SUFFIXES = ['del Lobo', 'de la Víbora', 'del Águila', 'del Titán', 'de la Tormenta', 'del Abismo', 'de la Luna', 'del Rey', 'de Sangre', 'del Vacío'];
const LEGENDARY_NAMES = ['Perdición de Reyes', 'Aliento del Dragón', 'Lágrima Estelar', 'Corazón del Abismo', 'Juramento Roto', 'Última Aurora', 'Colmillo Eterno', 'Vendaval Negro'];

let itemUid = 1;

function ri(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function rollRarity(bonus = 0) {
  // el bonus por profundidad favorece las rarezas altas sin tocar el peso del normal
  const entries = Object.values(RARITIES).filter(r => r.weight > 0);
  let total = 0;
  const weights = entries.map(r => {
    const w = r.id === 'normal' ? r.weight : r.weight * (1 + bonus);
    total += w;
    return w;
  });
  let roll = Math.random() * total;
  for (let i = 0; i < entries.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return entries[i];
  }
  return entries[0];
}

export function generateItem(ilvl, forceRarityId = null, slot = null, rarityBonus = null, classHint = null) {
  let basePool = slot ? BASES.filter(b => b.slot === slot) : BASES;
  // armas y off-hands acordes a la clase del jugador (la armadura no tiene clase)
  if (classHint) {
    const clsd = basePool.filter(b => !b.cls || b.cls === classHint);
    if (clsd.length) basePool = clsd;
  }
  const base = pick(basePool.length ? basePool : BASES);
  // curva de profundidad más suave: el botín alto se gana bajando (y con hallazgo mágico)
  const bonus = rarityBonus != null ? rarityBonus : Math.min(2.0, (ilvl - 1) * 0.10);
  const rarity = forceRarityId ? RARITIES[forceRarityId] : rollRarity(bonus);
  const scale = 1 + 0.22 * (ilvl - 1);

  const item = {
    uid: itemUid++,
    kind: 'item',
    slot: base.slot,
    icon: base.icon,
    baseName: pick(base.names),
    ilvl,
    rarity: rarity.id,
    affixes: {},
  };

  if (base.slot === 'weapon') {
    const lo = Math.round((3 + 2.0 * (ilvl - 1)) * rarity.statMult * (0.85 + Math.random() * 0.3));
    item.dmg = [Math.max(1, lo), Math.max(2, lo + ri(2, 4 + ilvl))];
  } else if (ARMOR_SLOTS.includes(base.slot)) {
    item.arm = Math.max(1, Math.round((2 + 1.6 * (ilvl - 1)) * rarity.statMult * (0.85 + Math.random() * 0.3)));
    if (base.slot === 'chest') item.arm = Math.round(item.arm * 1.5);
    if (base.slot === 'offhand') item.arm = Math.round(item.arm * 1.3);
    if (base.slot === 'belt' || base.slot === 'gloves') item.arm = Math.max(1, Math.round(item.arm * 0.7));
  }

  // afijos: principales (estilo D4) + secundarios garantizados según rareza
  const nAffixes = ri(rarity.affixes[0], rarity.affixes[1]);
  const rollAffix = (af) => {
    let v = ri(af.min, af.max);
    if (!af.flat) v = Math.round(v * scale);
    v = Math.round(v * rarity.statMult);
    // afijo superior (★): ~8% de probabilidad, 1.5× más fuerte (estilo D4)
    if (rarity.id !== 'normal' && Math.random() < 0.08) {
      v = Math.round(v * 1.5);
      (item.greater || (item.greater = [])).push(af.stat);
    }
    item.affixes[af.stat] = (item.affixes[af.stat] || 0) + Math.max(1, v);
  };
  const primary = AFFIX_POOL.filter(a => !a.secondary);
  const secondary = AFFIX_POOL.filter(a => a.secondary);
  const pool = [...primary];
  for (let i = 0; i < nAffixes && pool.length; i++) {
    rollAffix(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  // los raros traen 1 stat secundario; los legendarios 1-2
  const nSecondary = rarity.id === 'legendario' ? ri(1, 2) : rarity.id === 'raro' ? 1 : 0;
  const secPool = [...secondary];
  for (let i = 0; i < nSecondary && secPool.length; i++) {
    rollAffix(secPool.splice(Math.floor(Math.random() * secPool.length), 1)[0]);
  }

  // nombre
  if (rarity.id === 'legendario') {
    item.name = pick(LEGENDARY_NAMES);
    item.subName = item.baseName;
    // poder único + afijo de avaricia coherente con su poder
    const power = pick(LEGENDARY_POWERS);
    item.power = { id: power.id, name: power.name, desc: power.desc };
    if (power.id === 'avaricia') item.affixes.mf = (item.affixes.mf || 0) + 30;
    item.unidentified = true; // se revela al identificarlo (momento de emoción)
  } else if (rarity.id === 'raro') {
    item.name = `${item.baseName} ${pick(PREFIXES)} ${pick(SUFFIXES)}`;
  } else if (rarity.id === 'magico') {
    item.name = Math.random() < 0.5 ? `${item.baseName} ${pick(PREFIXES)}` : `${item.baseName} ${pick(SUFFIXES)}`;
  } else {
    item.name = item.baseName;
  }

  // engarces para gemas y runas (más probables y numerosos a mayor rareza)
  const sockChance = { normal: 0.08, magico: 0.2, raro: 0.35, legendario: 0.5 }[rarity.id] || 0;
  if (Math.random() < sockChance) {
    item.sockets = rarity.id === 'legendario' ? 2 + (Math.random() < 0.5 ? 1 : 0)
      : rarity.id === 'raro' ? 1 + (Math.random() < 0.3 ? 1 : 0) : 1;
    item.gems = [];
  }

  item.value = Math.round((5 + ilvl * 4) * rarity.statMult * (1 + nAffixes * 0.5));
  return item;
}

// Gemas: se engarzan en objetos con ranuras
export const GEMS = [
  { id: 'rubi', name: 'Rubí', icon: '❤️', stat: 'hp', base: 8 },
  { id: 'zafiro', name: 'Zafiro', icon: '🔷', stat: 'mp', base: 6 },
  { id: 'amatista', name: 'Amatista', icon: '🟣', stat: 'fue', base: 2 },
  { id: 'esmeralda', name: 'Esmeralda', icon: '🟢', stat: 'des', base: 2 },
  { id: 'topacio', name: 'Topacio', icon: '🟡', stat: 'ene', base: 2 },
  { id: 'diamante', name: 'Diamante', icon: '💠', stat: 'arm', base: 4 },
];

export function makeGem(ilvl, gemId = null) {
  const g = (gemId && GEMS.find(x => x.id === gemId)) || GEMS[ri(0, GEMS.length - 1)];
  const v = Math.max(1, Math.round(g.base * (1 + 0.2 * (ilvl - 1))));
  return {
    uid: itemUid++, kind: 'gem', gemId: g.id, icon: g.icon,
    name: g.name, ilvl, rarity: 'magico', stats: { [g.stat]: v },
    value: 25 + 8 * ilvl,
  };
}

// Genera una pieza de conjunto aleatoria escalada al nivel de objeto
export function generateSetItem(ilvl) {
  const set = pick(SETS);
  const piece = pick(set.pieces);
  const scale = 1 + 0.2 * (ilvl - 1);
  const item = {
    uid: itemUid++, kind: 'item', slot: piece.slot, icon: piece.icon,
    baseName: piece.name, name: piece.name, ilvl,
    rarity: 'conjunto', setId: set.id, affixes: {},
  };
  for (const [stat, v] of Object.entries(piece.affixes)) {
    const af = AFFIX_POOL.find(a => a.stat === stat);
    item.affixes[stat] = af && !af.flat ? Math.max(1, Math.round(v * scale)) : v;
  }
  if (piece.slot === 'weapon') {
    const lo = Math.max(1, Math.round((3 + 2.0 * (ilvl - 1)) * 1.35 * (0.9 + Math.random() * 0.2)));
    item.dmg = [lo, lo + ri(2, 4 + ilvl)];
  } else if (piece.slot === 'helm' || piece.slot === 'chest' || piece.slot === 'boots') {
    item.arm = Math.max(1, Math.round((2 + 1.6 * (ilvl - 1)) * 1.35));
    if (piece.slot === 'chest') item.arm = Math.round(item.arm * 1.5);
  }
  item.value = Math.round((10 + ilvl * 5) * 3);
  item.unidentified = true;
  return item;
}

// Reliquia de jefe: amuleto temático con un poder único (baja probabilidad)
const RELICS = {
  senor_abismo:    { name: 'Corazón del Señor del Abismo', power: 'volatil', stats: { dmgPct: 12, vit: 4 } },
  rey_gelido:      { name: 'Núcleo del Rey Gélido', power: 'festin', stats: { hp: 25, arm: 10 } },
  avatar_infierno: { name: 'Brasa del Avatar', power: 'furia', stats: { dmgPct: 18, crit: 4 } },
  corazon_vacio:   { name: 'Esquirla del Vacío', power: 'multidisparo', stats: { ene: 6, mf: 20 } },
};

export function makeRelic(bossId, ilvl) {
  const r = RELICS[bossId] || RELICS.senor_abismo;
  const pw = LEGENDARY_POWERS.find(p => p.id === r.power);
  const scale = 1 + 0.2 * (ilvl - 1);
  const affixes = {};
  for (const [stat, v] of Object.entries(r.stats)) {
    const af = AFFIX_POOL.find(a => a.stat === stat);
    affixes[stat] = af && !af.flat ? Math.max(1, Math.round(v * scale)) : v;
  }
  return {
    uid: itemUid++, kind: 'item', slot: 'amulet', icon: '🏅', relic: true,
    baseName: 'Reliquia', name: r.name, ilvl, rarity: 'legendario', affixes,
    power: { id: pw.id, name: pw.name, desc: pw.desc },
    unidentified: true, value: 200 + ilvl * 10,
  };
}

// Runas: se engarzan como las gemas; en el orden correcto forman palabras rúnicas
export const RUNES = [
  { id: 'el',  name: 'Runa El',  stat: { arm: 3 }, weight: 30 },
  { id: 'tir', name: 'Runa Tir', stat: { mp: 4 },  weight: 25 },
  { id: 'ral', name: 'Runa Ral', stat: { fue: 2 }, weight: 20 },
  { id: 'ort', name: 'Runa Ort', stat: { ene: 2 }, weight: 12 },
  { id: 'tal', name: 'Runa Tal', stat: { des: 2 }, weight: 8 },
  { id: 'eth', name: 'Runa Eth', stat: { hp: 6 },  weight: 5 },
];

export const RUNEWORDS = [
  { id: 'filo',     name: 'Filo',     runes: ['tir', 'el'],         slots: ['weapon'],                    stats: { dmgPct: 15, crit: 5 } },
  { id: 'bastion',  name: 'Bastión',  runes: ['ral', 'ort'],        slots: ['chest', 'offhand', 'helm'],  stats: { arm: 20, hp: 25 } },
  { id: 'zancada',  name: 'Zancada',  runes: ['el', 'tal'],         slots: ['boots', 'pants'],            stats: { spdPct: 10, des: 4 } },
  { id: 'tormenta', name: 'Tormenta', runes: ['tal', 'eth', 'tir'], slots: ['weapon'],                    stats: { dmgPct: 25, aspdPct: 10 } },
  { id: 'coloso',   name: 'Coloso',   runes: ['eth', 'ort', 'ral'], slots: ['chest'],                     stats: { hp: 60, arm: 30 } },
];

export function makeRune() {
  const total = RUNES.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  let rune = RUNES[0];
  for (const r of RUNES) { roll -= r.weight; if (roll <= 0) { rune = r; break; } }
  return {
    uid: itemUid++, kind: 'rune', runeId: rune.id, icon: '🪬',
    name: rune.name, ilvl: 1, rarity: 'raro', stats: { ...rune.stat }, value: 75,
  };
}

// comprueba si las runas engarzadas (en orden) forman una palabra rúnica
export function checkRuneword(item) {
  item.runeword = null;
  if (!item.gems || !item.gems.length) return;
  const seq = item.gems.map(g => g.runeId);
  if (seq.some(x => !x)) return; // mezclar gemas y runas no forma palabra
  const rw = RUNEWORDS.find(r =>
    r.slots.includes(item.slot) &&
    r.runes.length === seq.length &&
    r.runes.every((id, i) => id === seq[i]));
  if (rw) item.runeword = { id: rw.id, name: rw.name, stats: rw.stats };
}

// Encantadora: sustituye un afijo aleatorio por otro nuevo
export function rerollAffix(item) {
  const keys = Object.keys(item.affixes || {});
  if (!keys.length) return null;
  delete item.affixes[keys[Math.floor(Math.random() * keys.length)]];
  const pool = AFFIX_POOL.filter(a => !(a.stat in item.affixes));
  const af = pool[Math.floor(Math.random() * pool.length)];
  const rarity = RARITIES[item.rarity] || RARITIES.normal;
  let v = ri(af.min, af.max);
  if (!af.flat) v = Math.round(v * (1 + 0.22 * (item.ilvl - 1)));
  v = Math.max(1, Math.round(v * rarity.statMult));
  item.affixes[af.stat] = v;
  item.rerolls = (item.rerolls || 0) + 1;
  return statText(af.stat, v);
}

// Apuesta del mercader: objeto sin identificar, nunca normal,
// con pequeña posibilidad de raro o legendario (estilo gambling de D2)
export function gambleItem(ilvl, slot, classHint = null) {
  const r = Math.random();
  const rarity = r < 0.70 ? 'magico' : r < 0.92 ? 'raro' : 'legendario';
  return generateItem(ilvl, rarity, slot, null, classHint);
}

// Amuletos de mochila (charms): otorgan stats mientras estén en la bolsa,
// usando espacio de inventario como coste (estilo charms de Diablo 2)
const CHARM_NAMES = ['Pequeño Amuleto', 'Amuleto Grande', 'Gran Talismán'];
export function makeCharm(ilvl) {
  const pool = AFFIX_POOL.filter(a => ['fue', 'des', 'vit', 'ene', 'hp', 'mp', 'crit', 'mf'].includes(a.stat));
  const n = 1 + (Math.random() < 0.4 ? 1 : 0);
  const affixes = {};
  const avail = [...pool];
  for (let i = 0; i < n && avail.length; i++) {
    const af = avail.splice(Math.floor(Math.random() * avail.length), 1)[0];
    let v = ri(af.min, af.max);
    if (!af.flat) v = Math.round(v * (1 + 0.15 * (ilvl - 1)));
    affixes[af.stat] = Math.max(1, v);
  }
  return {
    uid: itemUid++, kind: 'charm', icon: '🧿', rarity: 'raro',
    name: pick(CHARM_NAMES), ilvl, affixes, value: 40 + ilvl * 6,
  };
}

// Gema de Soporte: se aprende al recogerla y se asigna a una habilidad
export function makeSupport(supId) {
  const s = SUPPORTS.find(x => x.id === supId) || SUPPORTS[Math.floor(Math.random() * SUPPORTS.length)];
  return {
    uid: itemUid++, kind: 'support', supportId: s.id, icon: s.icon,
    name: `Soporte: ${s.name}`, rarity: 'raro', value: 60,
  };
}

// Glifos del Tablero de Paragon: se engarzan en nodos de engarce (socket).
// Su poder = rango × per + (nodos activos adyacentes al engarce) × adj.
// per/adj atenuados (auditoría): los glifos rango 10 eran la palanca más inflada
// del endgame (+90% sobre el resto). Bajarlos deja al Paragon+bendiciones como
// grueso del crecimiento y mantiene el equipo relevante.
// FASE 4 — GLIFOS DE FAMILIA: cada glifo tiene una `fam` (cuadrante del tablero:
// ofensiva/sustento/defensa/utilidad) y dos tasas de adyacencia: `adj` (bonus por
// CUALQUIER nodo activo contiguo) y `famAdj` (bonus MAYOR por nodo contiguo de su
// familia). Colocarlo en un engarce rodeado de su familia rinde mucho más → la
// posición del glifo pasa a ser una decisión de build (estilo D4 Season 13).
export const GLYPH_FAM_LABEL = { ofensiva: 'Ofensiva', sustento: 'Sustento', defensa: 'Defensa', utilidad: 'Utilidad' };
export const GLYPH_TYPES = [
  { id: 'g_dmg',  stat: 'dmgPct', name: 'Glifo de Cólera',    per: 1.5, adj: 0.5, fam: 'ofensiva', famAdj: 1.5 },
  { id: 'g_hp',   stat: 'hp',     name: 'Glifo de Vigor',     per: 7,   adj: 2,   fam: 'sustento', famAdj: 5 },
  { id: 'g_arm',  stat: 'arm',    name: 'Glifo de Égida',     per: 3.5, adj: 1,   fam: 'defensa',  famAdj: 2.5 },
  { id: 'g_crit', stat: 'crit',   name: 'Glifo de Precisión', per: 0.8, adj: 0.3, fam: 'ofensiva', famAdj: 0.7 },
  { id: 'g_mf',   stat: 'mf',     name: 'Glifo de Codicia',   per: 3,   adj: 1,   fam: 'utilidad', famAdj: 2.5 },
];

export function makeGlyph(rank = 1) {
  const t = pick(GLYPH_TYPES);
  rank = Math.max(1, rank | 0);
  return {
    uid: itemUid++, kind: 'glyph', glyphId: t.id, stat: t.stat,
    baseName: t.name, name: `${t.name} · rango ${rank}`, icon: '🔷',
    rarity: 'raro', rank, per: t.per, adj: t.adj, fam: t.fam, famAdj: t.famAdj, value: 40 + rank * 20,
  };
}

// valor = rango×per + (adyacentes activos)×adj + (adyacentes de su familia)×famAdj
export function glyphValue(glyph, adjAllocated = 0, adjFamily = 0) {
  return glyph.rank * glyph.per + adjAllocated * glyph.adj + adjFamily * (glyph.famAdj || 0);
}

// Fragmento de Pináculo: material para invocar al jefe pináculo (uber).
// Se reúnen varios y se ofrendan en la Estatua del Mundo.
export function makeFragment() {
  return {
    uid: itemUid++, kind: 'fragment', icon: '✴️', rarity: 'legendario',
    name: 'Fragmento de Pináculo', value: 0,
  };
}

// Objeto MÍTICO: legendario con DOS poderes únicos y stats reforzados.
// Solo lo suelta el jefe Pináculo (uber). Cae sin identificar.
export function makeMythic(ilvl, classHint = null) {
  const it = generateItem(ilvl, 'legendario', null, null, classHint);
  let pw2 = pick(LEGENDARY_POWERS);
  for (let i = 0; i < 12 && pw2.id === it.power.id; i++) pw2 = pick(LEGENDARY_POWERS);
  it.power2 = { id: pw2.id, name: pw2.name, desc: pw2.desc };
  it.mythic = true;
  it.name = '✦ ' + it.name;
  for (const k of Object.keys(it.affixes)) it.affixes[k] = Math.round(it.affixes[k] * 1.4);
  it.value = Math.round(it.value * 2.5);
  it.unidentified = true;
  return it;
}

// Llave de Grieta: consumible que abre una grieta de endgame de nivel N
export function makeRiftKey(level) {
  return {
    uid: itemUid++, kind: 'riftkey', icon: '🗝️', riftLevel: level,
    name: `Llave de Grieta · Nivel ${level}`, rarity: 'raro',
    value: 50 + level * 20,
  };
}

export function makePotion(pot) {
  return { uid: itemUid++, kind: 'potion', pot, icon: pot === 'hp' ? '🧪' : '🔷',
    name: pot === 'hp' ? 'Poción de Vida' : 'Poción de Maná', value: 12 };
}

export function makeGold(floor) {
  return { kind: 'gold', amount: ri(4, 14) + Math.round(floor * ri(2, 6)) };
}

// Tirada de loot al morir un enemigo / abrir un cofre.
// opts.mf = hallazgo mágico (%), opts.qty = cantidad extra (%) de los pactos.
export function rollDrops(floor, opts = {}) {
  const drops = [];
  const mf = (opts.mf || 0) / 100;
  const qty = 1 + (opts.qty || 0) / 100;
  // bonus de rareza por profundidad + hallazgo mágico (el MF empuja hacia lo alto)
  const rarBonus = Math.min(2.0, (floor - 1) * 0.10) + mf * 1.6;
  // los conjuntos escalan con el piso y el MF, pero arrancan escasos.
  // MF atenuado (×0.3) para que el Tormento no los convierta en rutina (auditoría)
  const setCh = (opts.setChance ?? (0.008 + floor * 0.0015)) * (1 + mf * 0.3);

  if (Math.random() < (opts.goldChance ?? 0.55)) drops.push(makeGold(floor));
  if (Math.random() < (opts.potionChance ?? 0.22)) drops.push(makePotion(Math.random() < 0.6 ? 'hp' : 'mp'));
  if (Math.random() < (opts.gemChance ?? 0.05) * (1 + mf)) drops.push(makeGem(floor));
  if (Math.random() < (opts.runeChance ?? 0.025) * (1 + mf)) drops.push(makeRune());
  if (Math.random() < (opts.charmChance ?? 0.012) * (1 + mf)) drops.push(makeCharm(floor));
  if (Math.random() < (opts.supportChance ?? 0.015) * (1 + mf)) drops.push(makeSupport());

  let count = opts.minItems || 0;
  if (Math.random() < (opts.itemChance ?? 0.18) * qty) count++;
  for (let i = 0; i < count; i++) {
    if (!opts.forceRarity && Math.random() < setCh) drops.push(generateSetItem(floor));
    else drops.push(generateItem(floor, opts.forceRarity || null, null, opts.forceRarity ? null : rarBonus, opts.cls));
  }
  if (opts.boss) {
    // el jefe siempre da un raro; la prob. de legendario/set sube con el piso.
    // El clamp va FUERA del (1+mf) para que el Tormento no garantice legendario 100%
    const legCh = Math.min(0.6, (0.06 + floor * 0.015) * (1 + mf * 0.5));
    drops.push(generateItem(floor, Math.random() < legCh ? 'legendario' : 'raro', null, null, opts.cls));
    if (Math.random() < Math.min(0.4, (0.05 + floor * 0.01) * (1 + mf * 0.4))) drops.push(generateSetItem(floor));
    drops.push(makeGold(floor), makeGold(floor));
  }
  return drops;
}

export function statText(stat, v, greater = false) {
  const af = AFFIX_POOL.find(a => a.stat === stat);
  const base = af ? af.name.replace('{v}', v) : `+${v} ${stat}`;
  return greater ? base + ' ★' : base;
}

// multiplicador de calidad (masterworking): cada rango +6% a los stats del objeto
export function qualityMult(item) {
  return 1 + (item.quality || 0) * 0.06;
}

export const MAX_QUALITY = 5;

// máximo de engarces que admite un objeto según su ranura
export function maxSockets(item) {
  if (item.slot === 'weapon' || item.slot === 'chest') return 3;
  if (item.slot === 'ring' || item.slot === 'amulet') return 1;
  return 2;
}

export function itemStatLines(item) {
  if (item.unidentified) return ['❓ Objeto sin identificar', 'Identifícalo para revelar sus poderes.'];
  const lines = [];
  if (item.kind === 'riftkey') return [`🌀 Abre una Grieta de Nivel ${item.riftLevel}`, 'Enemigos reforzados, botín y XP aumentados. Derrota al jefe para subir de nivel de grieta.'];
  if (item.kind === 'fragment') return ['✴️ Fragmento de Pináculo', 'Reúne 3 y ofréndalos en la Estatua del Mundo para invocar al jefe Pináculo y obtener botín mítico.'];
  if (item.kind === 'glyph') return [`🔷 ${item.baseName} · rango ${item.rank}`, `Engárzalo en un nodo de engarce (◇) del Tablero de Paragon.`, `Otorga ${statText(item.stat, Math.round(glyphValue(item, 0)))} + bonus por cada nodo activo adyacente${item.fam ? ` (×${(item.famAdj / (item.adj || 1)).toFixed(0)} si es de familia ${GLYPH_FAM_LABEL[item.fam] || item.fam})` : ''}.`];
  if (item.kind === 'support') {
    const s = SUPPORTS.find(x => x.id === item.supportId);
    return s ? [`${s.icon} ${s.desc}`, `Aplicable a: ${s.types.join(', ')}`, 'Recógelo para aprenderlo y asígnalo a una habilidad.'] : ['Soporte'];
  }
  if (item.kind === 'charm') lines.push('🧿 Activo mientras esté en la mochila');
  if (item.quality) lines.push(`🔨 Calidad ${item.quality}/${MAX_QUALITY} (+${item.quality * 6}% a sus stats)`);
  if (item.mythic) lines.push('✦✦ MÍTICO — doble poder');
  if (item.power) lines.push(`✦ ${item.power.name}: ${item.power.desc}`);
  if (item.power2) lines.push(`✦ ${item.power2.name}: ${item.power2.desc}`);
  const q = qualityMult(item);
  const gset = new Set(item.greater || []);
  if (item.dmg) lines.push(`Daño: ${Math.round(item.dmg[0] * q)} - ${Math.round(item.dmg[1] * q)}`);
  if (item.arm) lines.push(`Armadura: ${Math.round(item.arm * q)}`);
  for (const [stat, v] of Object.entries(item.affixes || {}))
    lines.push(statText(stat, Math.round(v * q), gset.has(stat)));
  for (const [stat, v] of Object.entries(item.stats || {}))
    lines.push(statText(stat, v));
  if (item.sockets) {
    lines.push(`Engarces: ${(item.gems || []).length}/${item.sockets}`);
    for (const gm of item.gems || [])
      for (const [stat, v] of Object.entries(gm.stats))
        lines.push(`${gm.icon || '💎'} ${gm.name}: ${statText(stat, v)}`);
  }
  if (item.runeword) {
    lines.push(`🔮 Palabra rúnica: ${item.runeword.name}`);
    for (const [stat, v] of Object.entries(item.runeword.stats))
      lines.push(`· ${statText(stat, v)}`);
  }
  return lines;
}
