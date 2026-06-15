// ============================================================
// Flujo de mundo/sesión (mixin de Game)
// ============================================================
// Misiones, Desafío Diario, viajes rápidos y Pactos (riesgo↔recompensa).
// Acciones periféricas al combate que mutan el estado de sesión/mundo.
// Se inyecta en Game.prototype con Object.assign (igual que economyMethods /
// enemyAbilities / endgameMethods). Todo `this` resuelve vía instancia.
import { PACTS, generateQuest, ZONE_LIST } from './data.js';
import { makeGold, generateItem } from './items.js';

export const worldFlowMethods = {
  // ---------- misiones ----------
  ensureQuestOffer() {
    if (!this.questOffer) this.questOffer = generateQuest(this.player.level);
    return this.questOffer;
  },

  acceptQuest() {
    const p = this.player;
    if (p.quest) return;
    p.quest = this.ensureQuestOffer();
    this.questOffer = null;
    this.ui.message(`🎯 Misión aceptada: ${p.quest.desc}`, 3000);
    this.save();
  },

  questProgress(type) {
    const q = this.player.quest;
    if (!q || q.type !== type || q.progress >= q.goal) return;
    q.progress++;
    if (q.progress >= q.goal)
      this.ui.message('🎯 ¡Misión completada! Vuelve con el Capitán de la Guardia', 4000);
  },

  claimQuest() {
    const p = this.player;
    const q = p.quest;
    if (!q || q.progress < q.goal) return;
    p.gold += q.reward.gold;
    p.gainXP(q.reward.xp);
    if (q.reward.item) {
      const item = generateItem(Math.max(1, Math.round(p.level * 0.8)), q.reward.item, null, null, p.classId);
      item.unidentified = false;
      if (p.inventory.length < 32) p.inventory.push(item);
      else this.spawnGroundItem(item, p.pos);
      this.ui.message(`Recompensa: ${item.name}`, 2500);
    }
    p.records.quests = (p.records.quests || 0) + 1;
    p.quest = null;
    this.sfx('levelup');
    this.ui.renderPanel();
    this.save();
  },

  // ---------- desafío diario ----------
  checkDailyReward(boss) {
    if (!this.world.daily) return;
    const p = this.player;
    const today = new Date().toISOString().slice(0, 10);
    if (p.dailyDone === today) return;
    p.dailyDone = today;
    p.records.dailies = (p.records.dailies || 0) + 1;
    this.spawnGroundItem(generateItem(this.world.scaleFloor || this.world.floor, 'legendario'), boss.pos);
    for (let i = 0; i < 3; i++) this.spawnGroundItem(makeGold((this.world.scaleFloor || this.world.floor) + 3), boss.pos);
    // registro en la tabla local del desafío diario
    const time = Math.round((Date.now() - (this.dailyStart || Date.now())) / 1000);
    this.dailyLog.unshift({ date: today, cls: p.classId, level: p.level, floor: this.world.floor, time, hc: p.hardcore });
    this.dailyLog = this.dailyLog.slice(0, 14);
    try { localStorage.setItem('intentorpg_dailylog', JSON.stringify(this.dailyLog)); } catch { /* sin almacenamiento */ }
    const mm = Math.floor(time / 60), ss = String(time % 60).padStart(2, '0');
    this.ui.message(`🌟 ¡Desafío Diario completado en ${mm}:${ss}! Botín extra. Vuelve mañana.`, 5000);
    this.sfx('levelup');
    this.save();
  },

  // viaje rápido desde un waypoint
  travelTo(dest) {
    this.ui.closePanel();
    if (dest === 'town') this.loadWorld({ type: 'zone', biome: 'Cripta' }); // hogar seamless
    else if (dest === 'refuge') this.loadWorld({ type: 'refuge' });
    else {
      this.player.lastFloor = dest;
      this.loadWorld({ type: 'dungeon', floor: dest });
    }
  },

  // viaje a una zona abierta (regiones desbloqueadas por nivel)
  travelToZone(biome) {
    this.ui.closePanel();
    this.fromZone = null;
    this.loadWorld({ type: 'zone', biome });
  },

  // fija el pueblo favorito (reaparición) — solo refugios descubiertos (Cripta o
  // bastiones reclamados)
  setHomeZone(biome) {
    const p = this.player;
    const z = ZONE_LIST.find(x => x.biome === biome);
    const isRefuge = z && (z.home || p.strongholdsCleared?.includes(biome));
    if (!isRefuge) return;
    if (!p.discoveredZones?.includes(biome)) return;
    p.homeZone = biome;
    this.ui.message(`⭐ Hogar fijado: ${biome}. Reaparecerás aquí.`, 3000);
    this.sfx('levelup');
    this.save();
  },

  // ---------- pactos: riesgo↔recompensa por piso ----------
  applyPact(pactId) {
    const pact = PACTS.find(p => p.id === pactId);
    if (!pact || this.world.pact) return;
    const m = pact.mods;
    this.world.pact = { id: pact.id, qty: m.qty || 0, mf: m.mf || 0, xp: m.xp || 0 };
    // potencia a los enemigos ya presentes
    for (const e of this.enemies) {
      if (!e.alive) continue;
      if (m.ehp) { const add = Math.round(e.maxHP * m.ehp); e.maxHP += add; e.hp += add; }
      if (m.edmg) e.def = { ...e.def, dmg: Math.round(e.def.dmg * (1 + m.edmg)) };
      if (m.espd) e.def = { ...e.def, spd: e.def.spd * (1 + m.espd) };
    }
    this.world.pactEnemyMods = { ehp: m.ehp || 0, edmg: m.edmg || 0, espd: m.espd || 0 };
    const altar = this.world.interactables.find(it => it.type === 'altar');
    if (altar) {
      altar.label = `${pact.icon} ${pact.name} (sellado)`;
      if (altar.mesh?.userData.crystal) altar.mesh.userData.crystal.material.emissiveIntensity = 0.2;
    }
    this.ui.message(`${pact.icon} ${pact.name} sellado — ${pact.desc}`, 4000);
    this.addShake(0.3, 0.3);
    this.sfx('eshoot');
    this.save();
  },
};
