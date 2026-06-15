// ============================================================
// Eras (temporadas locales) — mixin de Game
// ============================================================
// Cada semana (bucket de 7 días) cambia, de forma determinista, un MUTADOR
// global y 3 OBJETIVOS con recompensa. El mutador reaprovecha recompute
// (stat/power) y xpMul/goldMul; los objetivos se miden como delta de p.records
// desde una instantánea tomada al empezar la era. Sin red ni servidor.
import { ERA_MUTATORS, ERA_OBJECTIVES, eraIdForTime } from './data.js';
import { mulberry32 } from './world.js';
import { makeFragment } from './items.js';

export const eraMethods = {
  currentEraId() { return eraIdForTime(); },

  // resuelve (determinista) el mutador y los 3 objetivos de una era por su id
  eraDef(id = this.currentEraId()) {
    const mut = ERA_MUTATORS[((id % ERA_MUTATORS.length) + ERA_MUTATORS.length) % ERA_MUTATORS.length];
    // baraja los objetivos con semilla = id y toma 3
    const pool = ERA_OBJECTIVES.slice();
    const rnd = mulberry32(id * 2654435761 >>> 0);
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    return { id, mutator: mut, objectives: pool.slice(0, 3) };
  },

  // bonus del mutador activo (puro; lo leen recompute/gainXP/gold). Barato.
  eraMutatorBonus() {
    const m = this.eraDef().mutator;
    return { stat: m.stat || null, power: m.power || null, xpMul: m.xpMul || 1, goldMul: m.goldMul || 1 };
  },

  // garantiza el estado de la era del jugador para la semana actual (resetea al
  // cambiar de semana: nueva instantánea de records, recompensas sin reclamar)
  ensureEra() {
    const p = this.player; if (!p) return null;
    const id = this.currentEraId();
    if (!p.era || p.era.id !== id) {
      const def = this.eraDef(id);
      const base = {};
      for (const o of def.objectives) base[o.metric] = p.records?.[o.metric] || 0;
      p.era = { id, base, claimed: {}, titleClaimed: false };
    }
    return p.era;
  },

  // progreso de un objetivo (delta de records desde la instantánea), clamp a goal
  eraObjProgress(obj) {
    const p = this.player;
    const cur = p.records?.[obj.metric] || 0;
    const base = this.player.era?.base?.[obj.metric] ?? cur;
    return Math.max(0, Math.min(obj.goal, cur - base));
  },

  // info completa para la UI
  eraInfo() {
    this.ensureEra();
    const def = this.eraDef();
    const era = this.player.era;
    const objectives = def.objectives.map(o => {
      const progress = this.eraObjProgress(o);
      return { ...o, progress, done: progress >= o.goal, claimed: !!era.claimed[o.id] };
    });
    const allDone = objectives.every(o => o.done);
    const next = (def.id + 1) * 7 * 24 * 60 * 60 * 1000;
    const daysLeft = Math.max(0, (next - Date.now()) / (24 * 60 * 60 * 1000));
    return { id: def.id, mutator: def.mutator, objectives, allDone, titleClaimed: era.titleClaimed, daysLeft };
  },

  // reclama la recompensa de un objetivo cumplido (una vez)
  claimEraReward(objId) {
    const p = this.player; this.ensureEra();
    const def = this.eraDef();
    const obj = def.objectives.find(o => o.id === objId);
    if (!obj || p.era.claimed[objId]) return;
    if (this.eraObjProgress(obj) < obj.goal) { this.ui.message('Aún no has completado ese objetivo'); return; }
    p.era.claimed[objId] = true;
    p.gold += obj.reward.gold || 0;
    if (obj.reward.frag) { p.materials.push(makeFragment()); }
    this.sfx('levelup');
    this.ui.message(`🏆 Recompensa de Era: +${obj.reward.gold} 🪙${obj.reward.frag ? ' y un Fragmento' : ''}`, 3500);
    // si están las 3 reclamadas → título cosmético de la era
    const info = this.eraInfo();
    if (info.objectives.every(o => o.claimed) && !p.era.titleClaimed) {
      p.era.titleClaimed = true;
      p.titles = Array.isArray(p.titles) ? p.titles : [];
      const title = `${def.mutator.icon} Campeón de la ${def.mutator.name}`;
      if (!p.titles.includes(title)) p.titles.push(title);
      p.title = title; // título activo mostrado en la ficha
      this.ui.message(`🏆 ¡Era completada! Título obtenido: «${title}»`, 5000);
      this.spawnBurst?.(p.pos, 0xffd24a, 18);
    }
    this.ui.renderPanel?.();
    this.ui.updateHUD?.();
    this.save();
  },
};
