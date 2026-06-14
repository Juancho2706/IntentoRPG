// ============================================================
// Economía e inventario: tienda, cubo, gemas, encantadora,
// re-spec y paragon. Se mezclan en Game.prototype.
// ============================================================
import { generateItem, makeGem, gambleItem, checkRuneword, rerollAffix, MAX_QUALITY, maxSockets } from './items.js';
import { SHOP_REFRESH_MS, PET_PRICE, PARAGON_BOARD } from './data.js';

export const economyMethods = {
  // ---------- tienda del mercader ----------
  // El stock rota cada 5 minutos y mejora con el nivel del jugador
  ensureShopStock() {
    if (this.shopStock && Date.now() < this.shopStock.until) return;
    const lvl = this.player?.level || 1;
    const ilvl = Math.max(1, Math.round(lvl * 0.8));
    const n = 4 + Math.min(3, Math.floor(lvl / 5));
    const items = [];
    for (let i = 0; i < n; i++) {
      const it = generateItem(ilvl, null, null, null, this.player?.classId);
      it.unidentified = false;
      it.price = Math.max(20, it.value * 4);
      items.push(it);
    }
    // ofertas de apuesta: objetos sin identificar
    const slots = ['weapon', 'helm', 'chest', 'boots', 'ring', 'amulet'];
    const gamble = [];
    for (let i = 0; i < 3; i++) {
      gamble.push({
        uid: 'g' + (this.gambleUid = (this.gambleUid || 0) + 1),
        slot: slots[Math.floor(Math.random() * slots.length)],
        price: 40 + lvl * 12,
      });
    }
    this.shopStock = { items, gamble, until: Date.now() + SHOP_REFRESH_MS };
  },
  
  buyShopItem(uid) {
    const p = this.player;
    this.ensureShopStock();
    const idx = this.shopStock.items.findIndex(i => i.uid === uid);
    if (idx < 0) return;
    const it = this.shopStock.items[idx];
    if (p.gold < it.price) { this.ui.message('Oro insuficiente'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.gold -= it.price;
    this.shopStock.items.splice(idx, 1);
    p.inventory.push(it);
    this.ui.message(`Compras: ${it.name}`, 1800);
    this.sfx('gold');
    this.save();
  },
  
  buyGambleItem(uid) {
    const p = this.player;
    this.ensureShopStock();
    const idx = this.shopStock.gamble.findIndex(o => o.uid === uid);
    if (idx < 0) return;
    const offer = this.shopStock.gamble[idx];
    if (p.gold < offer.price) { this.ui.message('Oro insuficiente'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.gold -= offer.price;
    this.shopStock.gamble.splice(idx, 1);
    const item = gambleItem(Math.max(1, Math.round(p.level * 0.8)), offer.slot, p.classId);
    item.unidentified = false;
    p.inventory.push(item);
    if (item.rarity === 'legendario') p.records.legendaries++;
    this.sfx(item.rarity === 'legendario' ? 'levelup' : 'gold');
    this.ui.renderShop();
    this.ui.itemPopup(item, { from: 'inv', index: p.inventory.length - 1 });
    this.save();
  },
  
  buyPet() {
    const p = this.player;
    if (p.pet || p.gold < PET_PRICE) return;
    p.gold -= PET_PRICE;
    p.pet = { level: 1 };
    this.spawnPet();
    this.ui.message('🐺 ¡El lobo de caza se une a ti!', 3000);
    this.sfx('levelup');
    this.save();
  },
  
  equipItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || !item.slot) return;
    if (item.unidentified) { this.ui.message('🔎 Identifícalo antes de equiparlo'); return; }
    // los anillos pueden ir en cualquiera de las dos ranuras
    let slot = item.slot;
    if (slot === 'ring' && p.equipment.ring && !p.equipment.ring2) slot = 'ring2';
    const old = p.equipment[slot];
    p.equipment[slot] = item;
    p.inventory.splice(index, 1);
    if (old) p.inventory.push(old);
    p.recompute();
    this.sfx('pickup');
    this.save();
  },
  
  unequipItem(slot) {
    const p = this.player;
    const item = p.equipment[slot];
    if (!item) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.equipment[slot] = null;
    p.inventory.push(item);
    p.recompute();
    this.save();
  },
  
  sellItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item) return;
    if (item.fav) { this.ui.message('⭐ Favorito protegido: quítale la estrella para venderlo'); return; }
    p.inventory.splice(index, 1);
    p.gold += item.value;
    this.ui.spawnText(p.pos, `+${item.value} 🪙`, 'txt-gold');
    this.sfx('gold');
    this.save();
  },
  
  dropItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item) return;
    p.inventory.splice(index, 1);
    this.spawnGroundItem(item, p.pos);
    this.save();
  },
  
  // ---------- cubo de transmutación ----------
  // 3 objetos de la misma rareza → 1 objeto de la rareza superior
  addToCube(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || p.cube.length >= 3) return;
    if (item.fav) { this.ui.message('⭐ Favorito protegido: no entra al cubo'); return; }
    p.inventory.splice(index, 1);
    p.cube.push(item);
    this.sfx('pickup');
    this.save();
  },
  
  cubeReturn(i) {
    const p = this.player;
    const item = p.cube[i];
    if (!item) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    p.cube.splice(i, 1);
    p.inventory.push(item);
    this.save();
  },
  
  // coste en oro del cubo: la transmutación cuesta (sumidero), y mucho más
  // cuanto mayor la rareza resultante; reforjar legendarios es lo más caro
  cubeCost(outRarity, ilvl, reforge = false) {
    const base = reforge ? 1500 : ({ magico: 40, raro: 150, legendario: 800 }[outRarity] || 0);
    return Math.round(base * (1 + ilvl * 0.04));
  },

  // receta de engarce: 1 objeto + 2 gemas → +1 hueco (cara). Devuelve {item, gems} o null
  cubeSocketParts() {
    const c = this.player.cube;
    if (c.length !== 3) return null;
    const items = c.filter(it => it.kind === 'item');
    const gems = c.filter(it => it.kind === 'gem');
    if (items.length === 1 && gems.length === 2) return { item: items[0], gems };
    return null;
  },

  socketCost(item) {
    return Math.round(400 * ((item.sockets || 0) + 1) * (1 + item.ilvl * 0.05));
  },

  // describe qué hará el cubo con su contenido actual (para la UI)
  cubePreview() {
    const c = this.player.cube;
    if (c.length !== 3) return { ready: false, cost: 0, text: '✨ Mete 3 objetos' };
    const sock = this.cubeSocketParts();
    if (sock) {
      const max = maxSockets(sock.item);
      if ((sock.item.sockets || 0) >= max) return { ready: false, cost: 0, text: 'Sin más huecos posibles' };
      const cost = this.socketCost(sock.item);
      return { ready: true, cost, text: `🔩 Abrir engarce (${cost} 🪙)` };
    }
    if (c.every(it => it.kind === 'gem')) return { ready: true, cost: 0, text: '✨ Fundir gemas' };
    if (c.every(it => it.kind === 'item') && c.every(it => it.rarity === c[0].rarity)) {
      const ilvl = Math.max(...c.map(it => it.ilvl));
      const r = c[0].rarity;
      if (r === 'legendario') { const cost = this.cubeCost(null, ilvl, true); return { ready: true, cost, text: `🔥 Reforjar (${cost} 🪙)` }; }
      const next = { normal: 'magico', magico: 'raro', raro: 'legendario' }[r];
      if (!next) return { ready: false, cost: 0, text: 'No combinable' };
      const cost = this.cubeCost(next, ilvl);
      return { ready: true, cost, text: `✨ Transmutar (${cost} 🪙)` };
    }
    return { ready: false, cost: 0, text: 'Combinación no válida' };
  },

  transmute() {
    const p = this.player;
    if (p.cube.length !== 3) { this.ui.message('El cubo necesita 3 objetos'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    const c = p.cube;
    let item = null;

    // receta de engarce: 1 objeto + 2 gemas → +1 hueco (cara, consume las gemas)
    const sock = this.cubeSocketParts();
    if (sock) {
      const target = sock.item;
      if ((target.sockets || 0) >= maxSockets(target)) { this.ui.message('Ese objeto no admite más engarces'); return; }
      const cost = this.socketCost(target);
      if (p.gold < cost) { this.ui.message(`Abrir un engarce cuesta ${cost} 🪙`); return; }
      p.gold -= cost;
      target.sockets = (target.sockets || 0) + 1;
      target.gems = target.gems || [];
      p.cube = [];
      p.inventory.push(target); // el objeto modificado vuelve a la mochila
      this.sfx('levelup');
      this.vibrate([30, 20, 50]);
      this.ui.message(`🔩 ¡Engarce abierto! ${target.name} ahora tiene ${target.sockets} hueco(s)`, 3000);
      this.ui.renderPanel();
      this.ui.itemPopup(target, { from: 'inv', index: p.inventory.length - 1 });
      this.save();
      return;
    }

    if (c.every(it => it.kind === 'gem')) {
      // recetas de gemas (sin coste)
      const ilvl = Math.max(...c.map(it => it.ilvl));
      if (c.every(it => it.gemId === c[0].gemId)) {
        item = makeGem(ilvl + 3, c[0].gemId);
        this.ui.message(`💎 ¡Las gemas se funden en un ${item.name} superior!`, 3000);
      } else {
        item = makeGem(ilvl + 1);
        this.ui.message(`💎 Las gemas se transforman en: ${item.name}`, 3000);
      }
    } else if (c.every(it => it.kind === 'item')) {
      const r = c[0].rarity;
      if (!c.every(it => it.rarity === r)) { this.ui.message('Los 3 objetos deben tener la misma rareza'); return; }
      const ilvl = Math.max(...c.map(it => it.ilvl));
      // crafteo dirigido: si los 3 comparten ranura, el resultado es de esa ranura
      const slot = c.every(it => it.slot === c[0].slot) ? c[0].slot : null;
      if (r === 'legendario') {
        // reforja: 3 legendarios → 1 legendario nuevo (caro)
        const cost = this.cubeCost(null, ilvl, true);
        if (p.gold < cost) { this.ui.message(`🔥 Reforjar cuesta ${cost} 🪙`); return; }
        p.gold -= cost;
        item = generateItem(ilvl, 'legendario', slot, null, p.classId);
        p.records.legendaries++;
        this.ui.message(`🔥 ¡Reforja! Nuevo legendario: ${item.name}`, 3000);
      } else {
        const next = { normal: 'magico', magico: 'raro', raro: 'legendario' }[r];
        const cost = this.cubeCost(next, ilvl);
        if (p.gold < cost) { this.ui.message(`Transmutar cuesta ${cost} 🪙`); return; }
        p.gold -= cost;
        item = generateItem(ilvl, next, slot, null, p.classId);
        if (item.rarity === 'legendario') p.records.legendaries++;
        this.ui.message(`🧪 ¡Transmutación! Obtienes: ${item.name}`, 3000);
      }
    } else {
      this.ui.message('No se pueden mezclar gemas y objetos en el cubo');
      return;
    }

    p.cube = [];
    item.unidentified = false;
    p.inventory.push(item);
    this.sfx('levelup');
    this.ui.renderPanel();
    this.ui.itemPopup(item, { from: 'inv', index: p.inventory.length - 1 });
    this.save();
  },
  
  // ---------- gemas y runas ----------
  // engarza la gema/runa del inventario (gemIndex) en un objeto con ranura libre
  socketGem(itemUid, gemIndex) {
    const p = this.player;
    const gem = p.inventory[gemIndex];
    if (!gem || (gem.kind !== 'gem' && gem.kind !== 'rune')) return;
    const target = p.inventory.find(i => i.uid === itemUid) ||
      Object.values(p.equipment).find(i => i && i.uid === itemUid);
    if (!target || !target.sockets) return;
    target.gems = target.gems || [];
    if (target.gems.length >= target.sockets) { this.ui.message('No quedan engarces libres'); return; }
    p.inventory.splice(gemIndex, 1);
    target.gems.push(gem);
    checkRuneword(target);
    p.recompute();
    if (target.runeword) {
      this.ui.message(`🔮 ¡Palabra rúnica completada: ${target.runeword.name}!`, 4000);
      this.sfx('levelup');
      this.vibrate([40, 30, 60]);
    } else {
      this.ui.message(`${gem.icon} ${gem.name} engarzado en ${target.name}`, 2500);
      this.sfx('levelup');
    }
    this.save();
  },
  
  // ---------- encantadora: reforjar un afijo por oro ----------
  enchantCost(item) {
    return Math.round(80 * item.ilvl * (1 + (item.rerolls || 0) * 0.5));
  },
  
  enchantItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || !Object.keys(item.affixes || {}).length) return;
    const cost = this.enchantCost(item);
    if (p.gold < cost) { this.ui.message('Oro insuficiente'); return; }
    p.gold -= cost;
    const nuevo = rerollAffix(item);
    p.recompute();
    this.ui.message(`🔮 Afijo reforjado: ${nuevo}`, 3000);
    this.sfx('levelup');
    this.save();
  },
  
  // ---------- mejora de objeto (masterworking) ----------
  // sube la calidad del objeto en rangos; cada rango da +6% a sus stats
  masterworkCost(item) {
    const q = item.quality || 0;
    return Math.round((120 + 180 * q) * (1 + item.ilvl * 0.05));
  },

  masterworkItem(index) {
    const p = this.player;
    const item = p.inventory[index];
    if (!item || item.kind !== 'item') return;
    if ((item.quality || 0) >= MAX_QUALITY) { this.ui.message('Ya está al máximo de calidad'); return; }
    const cost = this.masterworkCost(item);
    if (p.gold < cost) { this.ui.message(`Mejorar cuesta ${cost} 🪙`); return; }
    p.gold -= cost;
    item.quality = (item.quality || 0) + 1;
    p.recompute();
    this.ui.message(`🔨 ${item.name} mejorado a calidad ${item.quality}/${MAX_QUALITY}`, 3000);
    this.sfx('levelup');
    this.vibrate([30, 20, 40]);
    this.save();
  },

  // ---------- redistribución de puntos (sumidero de oro) ----------
  respecCost() { return 200 * this.player.level; },
  
  respecAttributes() {
    const p = this.player;
    const cost = this.respecCost();
    if (p.gold < cost) { this.ui.message('Oro insuficiente'); return; }
    p.gold -= cost;
    p.attributes = { ...p.cls.base };
    p.statPoints = 5 * (Math.min(p.level, 20) - 1);
    p.recompute();
    this.ui.message('🔄 Atributos redistribuidos: reparte tus puntos de nuevo', 3500);
    this.sfx('levelup');
    this.save();
  },
  
  respecSkills() {
    const p = this.player;
    const cost = this.respecCost();
    if (p.gold < cost) { this.ui.message('Oro insuficiente'); return; }
    p.gold -= cost;
    p.skills = {};
    p.skillPoints = Math.min(p.level, 20);
    p.buffs = [];
    p.cds = {};
    p.recompute();
    this.ui.refreshHotbar();
    this.ui.message('🔄 Habilidades redistribuidas: aprende tu nueva build', 3500);
    this.sfx('levelup');
    this.save();
  },
  
  // ---------- paragon: tablero de nodos (nivel 20+) ----------
  // un nodo es accesible si conecta ortogonalmente con el Inicio o un nodo activo
  paragonNodeReachable(nodeId) {
    const node = PARAGON_BOARD.find(n => n.id === nodeId);
    if (!node) return false;
    const alloc = this.player.paragon.nodes || {};
    return PARAGON_BOARD.some(o => o.id !== nodeId &&
      (o.type === 'start' || alloc[o.id]) &&
      Math.abs(o.x - node.x) + Math.abs(o.y - node.y) === 1);
  },

  allocateParagonNode(nodeId) {
    const p = this.player;
    const para = p.paragon;
    if (para.points <= 0) { this.ui.message('No tienes puntos Paragon'); return; }
    if (para.nodes[nodeId]) return;
    const node = PARAGON_BOARD.find(n => n.id === nodeId);
    if (!node || node.type === 'start') return;
    if (!this.paragonNodeReachable(nodeId)) { this.ui.message('Debe conectar con un nodo ya activado'); return; }
    para.nodes[nodeId] = true;
    para.points--;
    p.recompute();
    this.sfx('levelup');
    this.save();
  },

  // glifos: engarzar / quitar en un nodo de engarce activo del tablero
  socketGlyph(nodeId, invIndex) {
    const p = this.player;
    const node = PARAGON_BOARD.find(n => n.id === nodeId);
    if (!node || node.type !== 'socket' || !p.paragon.nodes[nodeId]) return;
    const gl = p.inventory[invIndex];
    if (!gl || gl.kind !== 'glyph') return;
    if (!p.paragon.glyphs) p.paragon.glyphs = {};
    if (p.paragon.glyphs[nodeId]) p.inventory.push(p.paragon.glyphs[nodeId]); // devuelve el anterior
    p.inventory.splice(invIndex, 1);
    p.paragon.glyphs[nodeId] = gl;
    p.recompute();
    this.sfx('levelup');
    this.ui.message(`🔷 ${gl.baseName} engarzado`, 2500);
    this.save();
  },

  unsocketGlyph(nodeId) {
    const p = this.player;
    const gl = p.paragon.glyphs?.[nodeId];
    if (!gl) return;
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    delete p.paragon.glyphs[nodeId];
    p.inventory.push(gl);
    p.recompute();
    this.save();
  },

  respecParagonCost() { return 500 + (this.player.level || 1) * 50; },

  respecParagon() {
    const p = this.player;
    const cost = this.respecParagonCost();
    if (p.gold < cost) { this.ui.message('🪙 No tienes oro suficiente'); return; }
    const spent = Object.keys(p.paragon.nodes || {}).length;
    if (!spent) { this.ui.message('El tablero ya está vacío'); return; }
    p.gold -= cost;
    p.paragon.points += spent;
    p.paragon.nodes = {};
    p.recompute();
    this.ui.message('🌟 Tablero de Paragon reespecializado', 3000);
    this.sfx('levelup');
    this.save();
  },

  // ---------- calidad de vida del inventario ----------
  // vende todo lo normal y mágico que no sea favorito ni material de artesanía
  sellJunk() {
    const p = this.player;
    const junk = p.inventory.filter(it =>
      it.kind === 'item' && !it.fav && (it.rarity === 'normal' || it.rarity === 'magico'));
    if (!junk.length) { this.ui.message('No hay morralla que vender (normales y mágicos sin ⭐)'); return; }
    const gold = junk.reduce((s, it) => s + (it.value || 0), 0);
    p.inventory = p.inventory.filter(it => !junk.includes(it));
    p.gold += gold;
    this.ui.message(`🧹 Vendidos ${junk.length} objetos por ${gold} 🪙`, 3000);
    this.sfx('gold');
    this.ui.renderPanel();
    this.ui.updateHUD();
    this.save();
  },

  sortInventory() {
    const p = this.player;
    const rRank = { legendario: 0, conjunto: 1, raro: 2, magico: 3, normal: 4 };
    const kRank = { item: 0, gem: 1, rune: 2 };
    p.inventory.sort((a, b) =>
      (kRank[a.kind] ?? 9) - (kRank[b.kind] ?? 9) ||
      (rRank[a.rarity] ?? 9) - (rRank[b.rarity] ?? 9) ||
      (a.slot || '').localeCompare(b.slot || '') ||
      (b.ilvl || 0) - (a.ilvl || 0));
    this.ui.renderPanel();
    this.save();
  },

  toggleFav(index) {
    const it = this.player.inventory[index];
    if (!it) return;
    it.fav = !it.fav;
    this.sfx('pickup');
    this.save();
  },

  // ---------- arrastrar y soltar ----------
  // resuelve un movimiento entre zonas (inv/equip/cube/stash)
  moveItem(src, dst) {
    const p = this.player;
    if (src.zone === dst.zone && src.key === dst.key) return;
    const at = (z, k) => z === 'inv' ? p.inventory[k] : z === 'equip' ? p.equipment[k]
      : z === 'cube' ? p.cube[k] : z === 'stash' ? this.stash[k] : null;
    const item = at(src.zone, src.key);
    if (!item) return;
    const dstItem = at(dst.zone, dst.key);

    // gema/runa del inventario sobre un objeto con engarce libre → engarzar
    if (src.zone === 'inv' && (item.kind === 'gem' || item.kind === 'rune') &&
        dstItem && dstItem.sockets && (dstItem.gems?.length || 0) < dstItem.sockets) {
      this.socketGem(dstItem.uid, src.key); return;
    }
    if (dst.zone === 'equip') { if (src.zone === 'inv') this.equipToSlot(src.key, dst.key); return; }
    if (src.zone === 'equip') { if (dst.zone === 'inv' || dst.zone === 'stash') this.unequipItem(src.key); return; }
    if (dst.zone === 'cube') { if (src.zone === 'inv') this.addToCube(src.key); return; }
    if (src.zone === 'cube') { if (dst.zone === 'inv') this.cubeReturn(src.key); return; }
    if (dst.zone === 'stash') { if (src.zone === 'inv') this.depositToStash(src.key); return; }
    if (src.zone === 'stash') { if (dst.zone === 'inv') this.takeFromStash(src.key); return; }
    if (src.zone === 'inv' && dst.zone === 'inv') this.swapInv(src.key, dst.key);
  },

  // equipar respetando la ranura (los anillos van a ring o ring2)
  equipToSlot(invIndex, slot) {
    const p = this.player;
    const item = p.inventory[invIndex];
    if (!item || item.kind !== 'item' || !item.slot) return;
    if (item.unidentified) { this.ui.message('🔎 Identifícalo antes de equiparlo'); return; }
    const ok = item.slot === slot || (item.slot === 'ring' && (slot === 'ring' || slot === 'ring2'));
    if (!ok) { this.ui.message('Esa pieza no va en esa ranura'); return; }
    const old = p.equipment[slot];
    p.equipment[slot] = item;
    p.inventory.splice(invIndex, 1);
    if (old) p.inventory.push(old);
    p.recompute();
    this.sfx('pickup');
    this.save();
  },

  // reordena la mochila: intercambia o mueve al final si el destino está vacío
  swapInv(a, b) {
    const inv = this.player.inventory;
    if (a >= inv.length) return;
    if (b >= inv.length) { inv.push(inv.splice(a, 1)[0]); }
    else { const t = inv[a]; inv[a] = inv[b]; inv[b] = t; }
    this.save();
  },

  // ---------- identificación ----------
  identifyItem(index) {
    const it = this.player.inventory[index];
    if (!it || !it.unidentified) return;
    it.unidentified = false;
    this.player.discover?.(it);            // registro de colección
    this.sfx('levelup');
    this.vibrate([30, 20, 50]);
    this.ui.message(`🔎 Identificado: ${it.name}`, 2500);
    this.ui.renderPanel();
    this.ui.itemPopup(it, { from: 'inv', index });
    this.save();
  },

  identifyAll() {
    const p = this.player;
    const n = p.inventory.filter(it => it.unidentified).length;
    if (!n) { this.ui.message('No hay objetos sin identificar'); return; }
    for (const it of p.inventory) if (it.unidentified) { it.unidentified = false; p.discover?.(it); }
    this.sfx('levelup');
    this.ui.message(`🔎 ${n} objeto(s) identificados`, 2500);
    this.ui.renderPanel();
    this.save();
  },
};
