// ============================================================
// Recursos de clase con identidad (módulo PURO) — Paso 2b.0, docs/paso2-diseno.md §2
// ============================================================
//  · FURIA (Guerrero): máx. 100 fijo (+planos de equipo), arranca a 0, SIN
//    regeneración; se gana golpeando y RECIBIENDO daño (+1 por cada 2 % de vida
//    máx. perdida tras mitigar, tope 12/s); tras 4 s sin golpear ni recibir daño
//    se pierde a 12/s.
//  · MANÁ (Maga): pozo grande 100 + 2·Energía + 3·(nivel−1) (+planos de equipo),
//    arranca lleno, regenera 2,5/s × (1 + Energía·0,02). Es el ÚNICO recurso que
//    lee el atributo Energía.
//  · ENERGÍA (Arquera): pozo fijo de 60 (+equipo, tope +20), arranca llena,
//    regeneración PLANA de 6/s + stat energyRegen (tope +4/s). No lee atributos.
// El recurso vive en p.mp / p.stats.maxMP (nombres históricos: la UI los usa).
import { resourceRegen } from './combat-math.js';
import { firePower } from './powers.js';   // ⑪ onResource (solo dentro de gainResource: ciclo seguro)

export const RESOURCE_DEFS = Object.freeze({
  furia: Object.freeze({
    id: 'furia', name: 'Furia', icon: '🔥', color: 0xff5a3c,
    maxBase: 100, start: 0, regen: 0,
    idleAfter: 4, decay: 12,          // pérdida fuera de combate (s sin golpear/recibir, por segundo)
    hurtPerPct: 0.5, hurtCapPerSec: 12, // +1 por cada 2 % de vida perdida, tope 12/s
    potion: { flat: 40 },
  }),
  mana: Object.freeze({
    id: 'mana', name: 'Maná', icon: '🔵', color: 0x4a8cff,
    maxBase: 100, perEne: 2, perLevel: 3, start: 1, regen: 2.5, usesEne: true,
    potion: { pct: 45 },
  }),
  energia: Object.freeze({
    id: 'energia', name: 'Energía', icon: '🟢', color: 0x6ad06a,
    maxBase: 60, itemCap: 20, start: 1, regen: 6, regenStatCap: 4,
    potion: { pct: 100 },
  }),
});

export function resourceDefFor(cls) { return RESOURCE_DEFS[cls?.resource?.id] || RESOURCE_DEFS.mana; }

// Máximo del recurso. `bonus` = planos de equipo/talentos (stat `mp`).
export function resourceMax(def, { ene = 0, level = 1, bonus = 0 } = {}) {
  if (def.id === 'mana') return Math.round(def.maxBase + def.perEne * Math.max(0, ene) + def.perLevel * Math.max(0, level - 1) + bonus);
  if (def.id === 'energia') return Math.round(def.maxBase + Math.min(def.itemCap, Math.max(0, bonus)));
  return Math.round(def.maxBase + Math.max(0, bonus));
}

// Regeneración pasiva por segundo. Solo el Maná lee el atributo Energía (§2).
// stats.regenPct (Paso 2): +% a esa regeneración (Mente Clara, Respiración Pausada).
export function resourceRegenRate(def, stats = {}) {
  const pct = Math.max(0, 1 + (stats.regenPct || 0) / 100);
  if (def.id === 'mana') return resourceRegen(def.regen, stats.ene || 0) * pct;
  if (def.id === 'energia') return (def.regen + Math.max(0, Math.min(def.regenStatCap, stats.energyRegen || 0))) * pct;
  return 0;
}

// recurso al empezar/cargar: Furia 0; Maná/Energía llenos
export function initialResource(def, max) { return def.start === 0 ? 0 : max; }

// avance por tiempo (Player.update): regeneración o pérdida de Furia fuera de combate
export function tickResource(p, dt) {
  const def = resourceDefFor(p.cls);
  const max = p.stats?.maxMP || 0;
  if (def.id === 'furia') {
    p.furiaIdle = (p.furiaIdle || 0) + dt;
    if (p.furiaIdle > def.idleAfter) p.mp = Math.max(0, p.mp - def.decay * dt);
    // cubeta de Furia por daño recibido (tope por segundo)
    p._furyHurt = Math.min(def.hurtCapPerSec, (p._furyHurt ?? def.hurtCapPerSec) + def.hurtCapPerSec * dt);
    return;
  }
  p.mp = Math.min(max, p.mp + resourceRegenRate(def, p.stats) * dt);
}

export function canAfford(p, cost) { return !(cost > 0) || p.mp >= cost - 1e-9; }
export function spendResource(p, cost) {
  if (!(cost > 0)) return true;
  if (p.mp < cost - 1e-9) return false;
  p.mp = Math.max(0, p.mp - cost);
  return true;
}
// DRENAJE continuo (Paso 2, §3.6: canal con drainPerSec, Danza Carmesí): resta perSec·dt.
// Devuelve false si no había bastante (queda a 0): el canal termina con endReason 'drain'.
export function drainResource(p, perSec, dt) {
  const n = Math.max(0, (perSec || 0) * (dt || 0));
  if (!(n > 0)) return true;
  if (p.mp < n - 1e-9) { p.mp = 0; return false; }
  p.mp -= n;
  return true;
}
// gana recurso (generadores, ramas Furibundo, poderes). Golpear "mantiene" la Furia.
// ⑪ (Paso 2c.2): lo REALMENTE ganado dispara onResource(g, p, n, src) — Hermandad de
// Armas (+5 % de la Furia generada por aliado). Un poder que da recurso EXTRA en
// respuesta pasa { silent: true } para no realimentarse.
// stats.resGainPct (Paso 2, Furia Creciente): +% a lo GENERADO; raw:true lo salta (pociones)
export function gainResource(p, n, { silent = false, src = null, raw = false } = {}) {
  if (!(n > 0)) return 0;
  if (!raw && p.stats?.resGainPct) n *= Math.max(0, 1 + p.stats.resGainPct / 100);
  const before = p.mp;
  p.mp = Math.min(p.stats?.maxMP || 0, p.mp + n);
  p.furiaIdle = 0;
  const got = p.mp - before;
  if (got > 0 && !silent && p.hookIndex?.onResource) firePower('onResource', p, p.game, p, got, src);
  return got;
}
// marca actividad de combate (golpear/recibir): reinicia la pérdida de Furia
export function touchCombat(p) { p.furiaIdle = 0; }

// Furia por daño recibido (tras mitigar): +hurtPerPct por cada 1 % de vida máx.
// perdida, tope hurtCapPerSec/s (cubeta). Devuelve lo ganado.
export function onHurtResource(p, lost) {
  const def = resourceDefFor(p.cls);
  p.furiaIdle = 0;
  if (def.id !== 'furia' || !(lost > 0) || !(p.stats?.maxHP > 0)) return 0;
  const want = lost / p.stats.maxHP * 100 * def.hurtPerPct;
  const bucket = p._furyHurt ?? def.hurtCapPerSec;
  const got = Math.max(0, Math.min(bucket, want));
  p._furyHurt = bucket - got;
  return gainResource(p, got);
}

// poción de recurso (E): Furia +40 · Maná +45 % · Energía +100 %
export function potionResourceAmount(def, max) {
  if (def.potion.flat) return def.potion.flat;
  return Math.round(max * def.potion.pct / 100);
}
