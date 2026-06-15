// ============================================================
// Endgame y meta-progresión (mixin de Game)
// ============================================================
// Contratos de zona (bounties), ladder de Tormento, Códice de Aspectos,
// Bendiciones y Jefe Pináculo. Extraído de main.js para aligerar el hub; se
// inyecta en Game.prototype con Object.assign (mismo patrón que economyMethods).
// Los métodos usan `this` (estado y otros métodos del juego); solo necesitan
// estos imports de módulo.
import { makeGold, generateItem, makeRiftKey } from './items.js';
import { BLESSINGS, blessingValue } from './data.js';

export const endgameMethods = {
  // ---------- contratos de zona (bounties, estilo susurros) ----------
  // Persisten por sesión (como la zona) hasta recargar la página.
  ensureZoneBounties(biome) {
    if (!this.zoneBounties) this.zoneBounties = {};
    if (!this.zoneBounties[biome]) {
      const pool = [
        { type: 'kill', goal: 30, desc: 'Da caza a 30 enemigos' },
        { type: 'elite', goal: 4, desc: 'Elimina 4 campeones o élites' },
        { type: 'chest', goal: 3, desc: 'Saquea 3 cofres' },
        { type: 'boss', goal: 1, desc: 'Derrota al Jefe de Mundo' },
        { type: 'goblin', goal: 1, desc: 'Caza al Goblin del Tesoro' },
      ];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const list = pool.slice(0, 3).map(b => ({ ...b, progress: 0, done: false }));
      this.zoneBounties[biome] = { list, rewardGiven: false };
    }
    return this.zoneBounties[biome];
  },

  bountyProgress(type, n = 1) {
    const w = this.world;
    if (w.type !== 'zone' || !w.bounties) return;
    const data = this.zoneBounties?.[w.biome];
    let changed = false;
    for (const b of w.bounties) {
      if (b.type !== type || b.done) continue;
      b.progress = Math.min(b.goal, b.progress + n);
      changed = true;
      if (b.progress >= b.goal) {
        b.done = true;
        this.ui.message(`📜 Contrato cumplido: ${b.desc}`, 3500);
        this.sfx('levelup');
      }
    }
    if (changed && data && !data.rewardGiven && w.bounties.every(b => b.done)) {
      data.rewardGiven = true;
      this.grantBountyReward();
    }
  },

  grantBountyReward() {
    const p = this.player, w = this.world;
    const floor = w.scaleFloor || 1;
    const at = p.pos;
    for (let i = 0; i < 8; i++) this.spawnGroundItem(makeGold(floor + 4), at);
    this.spawnGroundItem(generateItem(floor + 2, 'legendario', null, null, p.classId), at);
    this.spawnGroundItem(makeRiftKey(1), at);
    this.spawnRing(at.clone(), 2.2, 0xffd24a);
    this.ui.message('📜 ¡Todos los contratos de la zona cumplidos! Gran recompensa', 5000);
    this.music.sting();
  },

  // ---------- endgame: Tormento (dificultad) y Códice de Aspectos ----------
  // Nivel de Tormento desbloqueado, derivado del progreso (sin estado extra que
  // guardar): empuje de grietas o profundidad de mazmorra alcanzada.
  tormentUnlocked() {
    const r = this.player.records || {};
    return Math.min(10, Math.max(r.maxRift || 0, Math.floor((r.maxFloor || 1) / 6)));
  },

  setTorment(t) {
    const cap = this.tormentUnlocked();
    this.player.torment = Math.max(0, Math.min(cap, t | 0));
    this.ui.message(this.player.torment > 0
      ? `☠️ Dificultad fijada en Tormento ${this.player.torment}`
      : '☠️ Dificultad normal (sin Tormento)', 2500);
    this.save();
  },

  // avisa cuando el progreso desbloquea un nuevo nivel de Tormento
  checkTormentUnlock() {
    const cap = this.tormentUnlocked();
    if (this.player._tormentCap == null) { this.player._tormentCap = cap; return; }
    if (cap > this.player._tormentCap) {
      this.player._tormentCap = cap;
      this.ui.message(`☠️ ¡Nuevo nivel de dificultad: Tormento ${cap}! Ajústalo en la Estatua del Mundo (pueblo)`, 5000);
    }
  },

  // Códice: extrae el poder de un legendario al Códice permanente (consume el objeto)
  extractAspect(index) {
    const p = this.player;
    const it = p.inventory[index];
    if (!it || !it.power) return;
    if (!p.codex) p.codex = {};
    if (p.codex[it.power.id]) {
      this.ui.message('🔮 Ese aspecto ya está en tu Códice (no se duplica)', 3000);
    } else {
      p.codex[it.power.id] = { id: it.power.id, name: it.power.name, desc: it.power.desc };
      p.discovered.powers[it.power.id] = true;
      this.ui.message(`🔮 Aspecto «${it.power.name}» extraído al Códice`, 3500);
    }
    p.inventory.splice(index, 1); // el objeto se consume al extraer su poder
    this.sfx('levelup');
    this.ui.renderPanel();
    this.save();
  },

  imprintCost(item) {
    return Math.round((300 + (item.ilvl || 1) * 40) * (1 + (item.quality || 0) * 0.25));
  },

  // Códice: graba un aspecto conocido en un objeto sin poder (pasa a legendario)
  imprintAspect(index, powerId) {
    const p = this.player;
    const it = p.inventory[index];
    const power = p.codex?.[powerId];
    if (!it || !power || it.power || it.unidentified) return;
    const cost = this.imprintCost(it);
    if (p.gold < cost) { this.ui.message('🪙 No tienes oro suficiente'); return; }
    p.gold -= cost;
    it.power = { id: power.id, name: power.name, desc: power.desc };
    it.rarity = 'legendario';
    if (power.id === 'avaricia') it.affixes.mf = (it.affixes.mf || 0) + 30;
    this.sfx('levelup');
    this.ui.message(`🔮 Aspecto «${power.name}» grabado en ${it.name}`, 3000);
    this.ui.renderPanel();
    this.save();
  },

  // Bendiciones: al completar una grieta (corrupción `tier`) ofrece 3 opciones;
  // se equipa UNA por categoría (permanente). Estilo Last Epoch.
  offerBlessing(tier) {
    const pool = [...BLESSINGS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const offers = pool.slice(0, 3).map(b => ({
      id: b.id, cat: b.cat, stat: b.stat, name: b.name,
      value: blessingValue(b, tier),
      text: b.desc.replace('{v}', blessingValue(b, tier)),
      tier,
    }));
    this.pendingBlessings = offers;
    this.ui.openBlessing(offers);
  },

  chooseBlessing(index) {
    const offer = (this.pendingBlessings || [])[index];
    this.pendingBlessings = null;
    if (!offer) return;
    const p = this.player;
    if (!p.blessings) p.blessings = {};
    p.blessings[offer.cat] = { id: offer.id, cat: offer.cat, stat: offer.stat, value: offer.value, name: offer.name, text: offer.text };
    p.recompute();
    this.sfx('levelup');
    this.ui.message(`🌟 Bendición de ${offer.cat}: «${offer.name}» (${offer.text})`, 4500);
    this.ui.closePanel();
    this.ui.updateHUD();
    this.save();
  },

  // ---------- Jefe Pináculo (uber) ----------
  fragmentCount() {
    return (this.player.materials || []).filter(it => it.kind === 'fragment').length;
  },

  pinnacleFloor() {
    const r = this.player.records || {};
    return 18 + Math.max(r.maxRift || 0, Math.floor((r.maxFloor || 1) / 2)) * 2;
  },

  summonPinnacle() {
    const p = this.player;
    const NEED = 3;
    if (this.fragmentCount() < NEED) { this.ui.message(`✴️ Necesitas ${NEED} Fragmentos de Pináculo`, 3000); return; }
    // consume 3 fragmentos de la bolsa de materiales
    let removed = 0;
    for (let i = p.materials.length - 1; i >= 0 && removed < NEED; i--) {
      if (p.materials[i].kind === 'fragment') { p.materials.splice(i, 1); removed++; }
    }
    this.ui.closePanel();
    this.loadWorld({ type: 'dungeon', floor: this.pinnacleFloor(), pinnacle: true });
  },
};
