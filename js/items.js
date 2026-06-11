// ============================================================
// Sistema de objetos: generación de loot, rarezas y afijos
// ============================================================

export const RARITIES = {
  normal:   { id: 'normal',   name: 'Normal',    color: '#e8e6e0', glow: 0xcccccc, affixes: [0, 0], statMult: 1.0,  weight: 55 },
  magico:   { id: 'magico',   name: 'Mágico',    color: '#6f8cff', glow: 0x4466ff, affixes: [1, 2], statMult: 1.1,  weight: 27 },
  raro:     { id: 'raro',     name: 'Raro',      color: '#ffd24a', glow: 0xffcc00, affixes: [3, 4], statMult: 1.25, weight: 14 },
  legendario:{ id: 'legendario', name: 'Legendario', color: '#ff8c2e', glow: 0xff6600, affixes: [4, 5], statMult: 1.5, weight: 4 },
};

export const SLOT_NAMES = {
  weapon: 'Arma', helm: 'Casco', chest: 'Armadura', boots: 'Botas', ring: 'Anillo', amulet: 'Amuleto',
};

const BASES = [
  { slot: 'weapon', names: ['Espada Corta', 'Hacha de Guerra', 'Maza', 'Espada Larga', 'Daga'], icon: '🗡️' },
  { slot: 'weapon', names: ['Arco Corto', 'Arco de Caza', 'Arco Largo'], icon: '🏹' },
  { slot: 'weapon', names: ['Bastón', 'Vara Arcana', 'Cetro'], icon: '🪄' },
  { slot: 'helm', names: ['Capucha', 'Casco de Cuero', 'Yelmo', 'Casco de Hierro'], icon: '🪖' },
  { slot: 'chest', names: ['Túnica', 'Armadura de Cuero', 'Cota de Malla', 'Coraza'], icon: '🧥' },
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

const PREFIXES = ['Feroz', 'Sombrío', 'Brillante', 'Antiguo', 'Maldito', 'Sagrado', 'Veloz', 'Cruel', 'Glacial', 'Ígneo'];
const SUFFIXES = ['del Lobo', 'de la Víbora', 'del Águila', 'del Titán', 'de la Tormenta', 'del Abismo', 'de la Luna', 'del Rey', 'de Sangre', 'del Vacío'];
const LEGENDARY_NAMES = ['Perdición de Reyes', 'Aliento del Dragón', 'Lágrima Estelar', 'Corazón del Abismo', 'Juramento Roto', 'Última Aurora', 'Colmillo Eterno', 'Vendaval Negro'];

let itemUid = 1;

function ri(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function rollRarity(bonus = 0) {
  const entries = Object.values(RARITIES);
  let total = 0;
  const weights = entries.map(r => {
    // bonus desplaza peso hacia rarezas altas
    let w = r.weight;
    if (r.id !== 'normal') w *= (1 + bonus);
    else w = Math.max(5, w - bonus * 20);
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
  const rarity = forceRarityId ? RARITIES[forceRarityId] : rollRarity(Math.min(1.5, (ilvl - 1) * 0.08));
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
  } else if (base.slot === 'helm' || base.slot === 'chest' || base.slot === 'boots') {
    item.arm = Math.max(1, Math.round((2 + 1.6 * (ilvl - 1)) * rarity.statMult * (0.85 + Math.random() * 0.3)));
    if (base.slot === 'chest') item.arm = Math.round(item.arm * 1.5);
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

  item.value = Math.round((5 + ilvl * 4) * rarity.statMult * (1 + nAffixes * 0.5));
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
  const luck = opts.luck || 0;
  if (Math.random() < (opts.goldChance ?? 0.55)) drops.push(makeGold(floor));
  if (Math.random() < (opts.potionChance ?? 0.22)) drops.push(makePotion(Math.random() < 0.6 ? 'hp' : 'mp'));
  const itemChance = opts.itemChance ?? 0.26;
  const nItems = opts.minItems || 0;
  let count = nItems;
  if (Math.random() < itemChance) count++;
  for (let i = 0; i < count; i++) {
    drops.push(generateItem(floor, opts.forceRarity || null));
  }
  if (opts.boss) {
    drops.push(generateItem(floor, Math.random() < 0.4 ? 'legendario' : 'raro'));
    drops.push(makeGold(floor), makeGold(floor));
  }
  void luck;
  return drops;
}

export function itemStatLines(item) {
  const lines = [];
  if (item.dmg) lines.push(`Daño: ${item.dmg[0]} - ${item.dmg[1]}`);
  if (item.arm) lines.push(`Armadura: ${item.arm}`);
  for (const [stat, v] of Object.entries(item.affixes || {})) {
    const af = AFFIX_POOL.find(a => a.stat === stat);
    if (af) lines.push(af.name.replace('{v}', v));
  }
  return lines;
}
