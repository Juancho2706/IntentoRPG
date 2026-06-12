// ============================================================
// Sistema de objetos: generación de loot, rarezas y afijos
// ============================================================

export const RARITIES = {
  normal:   { id: 'normal',   name: 'Normal',    color: '#e8e6e0', glow: 0xcccccc, affixes: [0, 0], statMult: 1.0,  weight: 80 },
  magico:   { id: 'magico',   name: 'Mágico',    color: '#6f8cff', glow: 0x4466ff, affixes: [1, 2], statMult: 1.1,  weight: 15 },
  raro:     { id: 'raro',     name: 'Raro',      color: '#ffd24a', glow: 0xffcc00, affixes: [3, 4], statMult: 1.25, weight: 4.2 },
  legendario:{ id: 'legendario', name: 'Legendario', color: '#ff8c2e', glow: 0xff6600, affixes: [4, 5], statMult: 1.5, weight: 0.8 },
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
  { slot: 'weapon', names: ['Espada Corta', 'Hacha de Guerra', 'Maza', 'Espada Larga', 'Daga'], icon: '🗡️' },
  { slot: 'weapon', names: ['Arco Corto', 'Arco de Caza', 'Arco Largo'], icon: '🏹' },
  { slot: 'weapon', names: ['Bastón', 'Vara Arcana', 'Cetro'], icon: '🪄' },
  { slot: 'offhand', names: ['Escudo de Madera', 'Escudo de Hierro', 'Escudo de Torre'], icon: '🛡️' },
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

export function generateItem(ilvl, forceRarityId = null, slot = null) {
  const basePool = slot ? BASES.filter(b => b.slot === slot) : BASES;
  const base = pick(basePool.length ? basePool : BASES);
  const rarity = forceRarityId ? RARITIES[forceRarityId] : rollRarity(Math.min(2.2, (ilvl - 1) * 0.13));
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

  // afijos
  const nAffixes = ri(rarity.affixes[0], rarity.affixes[1]);
  const pool = [...AFFIX_POOL];
  for (let i = 0; i < nAffixes && pool.length; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const af = pool.splice(idx, 1)[0];
    let v = ri(af.min, af.max);
    if (!af.flat) v = Math.round(v * scale);
    v = Math.round(v * rarity.statMult);
    item.affixes[af.stat] = (item.affixes[af.stat] || 0) + Math.max(1, v);
  }

  // nombre
  if (rarity.id === 'legendario') {
    item.name = pick(LEGENDARY_NAMES);
    item.subName = item.baseName;
  } else if (rarity.id === 'raro') {
    item.name = `${item.baseName} ${pick(PREFIXES)} ${pick(SUFFIXES)}`;
  } else if (rarity.id === 'magico') {
    item.name = Math.random() < 0.5 ? `${item.baseName} ${pick(PREFIXES)}` : `${item.baseName} ${pick(SUFFIXES)}`;
  } else {
    item.name = item.baseName;
  }

  // engarces para gemas (más probables cuanto mayor la rareza)
  const sockChance = { normal: 0.08, magico: 0.2, raro: 0.35, legendario: 0.5 }[rarity.id] || 0;
  if (Math.random() < sockChance) {
    item.sockets = 1 + (rarity.id === 'legendario' && Math.random() < 0.4 ? 1 : 0);
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
  return item;
}

// Apuesta del mercader: objeto sin identificar, nunca normal,
// con pequeña posibilidad de raro o legendario (estilo gambling de D2)
export function gambleItem(ilvl, slot) {
  const r = Math.random();
  const rarity = r < 0.70 ? 'magico' : r < 0.92 ? 'raro' : 'legendario';
  return generateItem(ilvl, rarity, slot);
}

export function makePotion(pot) {
  return { uid: itemUid++, kind: 'potion', pot, icon: pot === 'hp' ? '🧪' : '🔷',
    name: pot === 'hp' ? 'Poción de Vida' : 'Poción de Maná', value: 12 };
}

export function makeGold(floor) {
  return { kind: 'gold', amount: ri(4, 14) + Math.round(floor * ri(2, 6)) };
}

// Tirada de loot al morir un enemigo / abrir un cofre
export function rollDrops(floor, opts = {}) {
  const drops = [];
  if (Math.random() < (opts.goldChance ?? 0.55)) drops.push(makeGold(floor));
  if (Math.random() < (opts.potionChance ?? 0.22)) drops.push(makePotion(Math.random() < 0.6 ? 'hp' : 'mp'));
  if (Math.random() < (opts.gemChance ?? 0.05)) drops.push(makeGem(floor));
  const itemChance = opts.itemChance ?? 0.18;
  const nItems = opts.minItems || 0;
  let count = nItems;
  if (Math.random() < itemChance) count++;
  for (let i = 0; i < count; i++) {
    if (!opts.forceRarity && Math.random() < (opts.setChance ?? 0.04)) drops.push(generateSetItem(floor));
    else drops.push(generateItem(floor, opts.forceRarity || null));
  }
  if (opts.boss) {
    drops.push(generateItem(floor, Math.random() < 0.25 ? 'legendario' : 'raro'));
    if (Math.random() < 0.2) drops.push(generateSetItem(floor));
    drops.push(makeGold(floor), makeGold(floor));
  }
  return drops;
}

export function statText(stat, v) {
  const af = AFFIX_POOL.find(a => a.stat === stat);
  return af ? af.name.replace('{v}', v) : `+${v} ${stat}`;
}

export function itemStatLines(item) {
  const lines = [];
  if (item.dmg) lines.push(`Daño: ${item.dmg[0]} - ${item.dmg[1]}`);
  if (item.arm) lines.push(`Armadura: ${item.arm}`);
  for (const [stat, v] of Object.entries(item.affixes || {}))
    lines.push(statText(stat, v));
  for (const [stat, v] of Object.entries(item.stats || {}))
    lines.push(statText(stat, v));
  if (item.sockets) {
    lines.push(`Engarces: ${(item.gems || []).length}/${item.sockets}`);
    for (const gm of item.gems || [])
      for (const [stat, v] of Object.entries(gm.stats))
        lines.push(`💎 ${gm.name}: ${statText(stat, v)}`);
  }
  return lines;
}
