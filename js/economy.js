// ============================================================
// Economía e inventario: tienda, cubo, gemas, encantadora,
// re-spec y paragon. Se mezclan en Game.prototype.
// ============================================================
import { generateItem, makeGem, gambleItem, checkRuneword, rerollAffix } from './items.js';
import { SHOP_REFRESH_MS, PET_PRICE } from './data.js';

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
      const it = generateItem(ilvl);
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
    const item = gambleItem(Math.max(1, Math.round(p.level * 0.8)), offer.slot);
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
  
  transmute() {
    const p = this.player;
    if (p.cube.length !== 3) { this.ui.message('El cubo necesita 3 objetos'); return; }
    if (p.inventory.length >= 32) { this.ui.message('Inventario lleno'); return; }
    const c = p.cube;
    let item = null;
  
    if (c.every(it => it.kind === 'gem')) {
      // recetas de gemas
      const ilvl = Math.max(...c.map(it => it.ilvl));
      if (c.every(it => it.gemId === c[0].gemId)) {
        // 3 gemas iguales → la misma gema, más poderosa
        item = makeGem(ilvl + 3, c[0].gemId);
        this.ui.message(`💎 ¡Las gemas se funden en un ${item.name} superior!`, 3000);
      } else {
        // 3 gemas distintas → gema aleatoria algo mejor
        item = makeGem(ilvl + 1);
        this.ui.message(`💎 Las gemas se transforman en: ${item.name}`, 3000);
      }
    } else if (c.every(it => it.kind === 'item')) {
      const r = c[0].rarity;
      if (!c.every(it => it.rarity === r)) { this.ui.message('Los 3 objetos deben tener la misma rareza'); return; }
      const next = { normal: 'magico', magico: 'raro', raro: 'legendario' }[r];
      if (!next) { this.ui.message('Los legendarios no se pueden transmutar'); return; }
      const ilvl = Math.max(...c.map(it => it.ilvl));
      item = generateItem(ilvl, next);
      if (item.rarity === 'legendario') p.records.legendaries++;
      this.ui.message(`🧪 ¡Transmutación! Obtienes: ${item.name}`, 3000);
    } else {
      this.ui.message('No se pueden mezclar gemas y objetos en el cubo');
      return;
    }
  
    p.cube = [];
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
  
  // ---------- paragon (nivel 20+) ----------
  paragonAllocate(key) {
    const p = this.player;
    if (p.paragon.points <= 0 || !(key in p.paragon)) return;
    p.paragon.points--;
    p.paragon[key]++;
    p.recompute();
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
};
