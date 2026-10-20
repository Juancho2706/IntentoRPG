// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN: indicadores (módulo PURO, sin DOM) — Paso 2c.0
// ============================================================
// docs/paso2-diseno.md §2 (tabla «Mecánicas propias de cada especialización»),
// §9.1.2 (punto ⑩) y §9.1.3. El recurso de clase (Furia/Maná/Energía) es igual
// para todos; cada especialización añade UN indicador con su ritmo propio:
//   sed (Berserker) · bastion (Guardián) · fervor (Cruzado) · calor (Piromante) ·
//   escarcha (Crionte, POR ENEMIGO) · cargas (Arcanista) · concentracion
//   (Francotiradora) · coto (Montaraz: trampas armadas + Presa) · impulso (Tiradora)
// Aquí vive la mecánica BASE de llenado y descarga de cada uno. Los talentos que
// la potencian (Remolino Sediento, Desafío Firme, Combustión…) son poderes de
// js/powers-<clase>.js (2c.1) que llaman a gainGauge/spendGauge o reaccionan con
// el gancho ⑩ `onGauge`.
//
// API (estable para los trabajadores de 2c.1):
//   defineGauge(id, def)                 registra un indicador NUEVO (los 9 base ya están)
//   gainGauge(p, id, n, e?) → n ganado   ⑩ onGauge('gain') y, al llegar al máximo, ('full')
//   spendGauge(p, id, n, e?) → bool      ⑩ onGauge('spent') y, si queda a 0, ('empty')
//   drainGauge(p, id, n, e?)             baja sin «gastar» (pérdida/caducidad; ⑩ 'empty' a 0)
//   setGauge(p, id, v, e?)               fija el valor (tests / arnés: h.gauge(id, n))
//   touchGauge(p, id, e?)                renueva el reloj de pérdida sin ganar nada
//   gaugeValue(p, id, e?) · gaugeMax(p, id) · gaugeState(p, id, e?) (estado extra del indicador)
//   Paso 2c.2 — modificadores por STAT (de poderes `stats` o de buffs, sin escribir st.v):
//     'gaugeMax:<id>'  +máximo (Coto Cerrado)
//     'gaugeGain:<id>' +% de lo que se GANA (Temeridad: Sed ×2 = +100; Combustión: Calor ×2)
//     'gaugeLoss:<id>' +% de lo que se PIERDE con el tiempo/al moverte (Paso del
//                      Acechador −15; Visión Certera −100 = moverte no vacía la Concentración)
//     gaugeStat(p, key) · gaugeGainMult(p, id) · gaugeLossMult(p, id)
//   claves tv que consume aquí el núcleo: frostLayers (Escarcha), focusRate y focusEnergy
//   (Concentración), galeHeal y galeEnergy (Impulso), fervorChance (Fervor)
//   activeMechanic(p) → id | null        el de la especialización ACTIVA (p.talentAgg.mechanic)
//   gaugeView(p) → { id, name, value, max, color, state, label?, t? } | null   (HUD, 2d)
//   gaugeDefs() · gaugeIds()
// Solo se llena el indicador de la especialización activa (gainGauge devuelve 0
// con cualquier otro). `e` es obligatorio en los indicadores por enemigo
// (perEnemy: escarcha). El estado es volátil (p.gauges / e.gauges; no se guarda).
//
// CÓMO SE ENGANCHA AL JUEGO (sin puntos de despacho nuevos): cada indicador es un
// poder del registro, `gauge_<id>` (gaugePowers(), lo registra js/powers.js), que
// Player.recompute añade a p.powers cuando su especialización está activa. Sus
// ganchos onHit/onDamaged/onKill/onTick/onCast/afterCast/condAdd/condCrit/
// modifyResolve reciben, como ÚLTIMO argumento extra, el estado del indicador.
// Máximo extra por poderes: `stats: () => ({ 'gaugeMax:<id>': n })` (p.powerStats).
//
// CICLO DE MÓDULOS: powers.js importa este archivo (para registrar gauge_<id>) y
// este importa powers.js (firePower para ⑩). Por eso nada del nivel superior lee
// bindings importados y el registro es un `var` perezoso (seguro en cualquier
// orden de evaluación).
import { firePower, definePower, POWER_HOOKS } from './powers.js';
import { gainResource } from './resources.js';

// eslint-disable-next-line no-var
var GAUGE_DEFS; // id → def congelada (perezoso: ver gaugeDefs)
// eslint-disable-next-line no-var
var GAUGE_POWERS_DONE; // true cuando powers.js ya registró los gauge_<id>

// (funciones, no constantes de módulo: se pueden llamar antes de evaluar este módulo)
function gaugeHooks() { return ['onHit', 'onDamaged', 'onKill', 'onCast', 'afterCast', 'condAdd', 'condCrit', 'condDr', 'modifyResolve']; }
function gaugeKeys() {
  return ['name', 'desc', 'color', 'max', 'perEnemy', 'integer', 'decay', 'state', 'value', 'view',
    'canGain', 'hold', 'onFull', 'procs', 'onTick', ...gaugeHooks()];
}

function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function now(p) { return p?.simT || 0; }
// el resolvedor cachea perfiles: un indicador que cambia coste/crítico/proyectiles
// (Ignición Total, Vendaval) los invalida
function invalidate(p) { if (p) p.resolved = {}; }

// ------------------------------------------------------------
// Los 9 indicadores BASE (§2). Constantes en un solo sitio:
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNING;
export function gaugeTuning() { return TUNING || (TUNING = Object.freeze({
  sed:      { perHpPct: 1, perBleedTick: 2, bleedPerSec: 10, satedT: 6, decayAfter: 4, decayRate: 8 },
  bastion:  { max: 5, perBlock: 1, decayEvery: 6 },
  fervor:   { max: 3, perKill: 1, hammerHits: 3 },
  calor:    { perFireHit: 5, decayAfter: 3, decayRate: 10, skills: ['bola_fuego', 'meteoro'] },
  escarcha: { max: 5, perHit: 1, nova: 2, freezeT: 1.5, numbT: 4, decayEvery: 2 },
  cargas:   { max: 4, perDart: 1, dmgPerCharge: 35, manaPerCharge: 5, loseAfter: 6 },
  concentracion: { gainPerSec: 20, losePerSec: 25, critPerPoint: 0.15 },
  coto:     { maxArmed: 3, preyT: 15 },
  impulso:  { perShot: 3, shotGap: 0.15, galeT: 6, galeAspd: 25 },
})); }

function baseGauges() {
  const T = gaugeTuning();
  return {
    // Berserker: perder vida y desangrar llenan la Sed; a 100 → Sed Saciada 6 s
    // (activa m_berserk ×1,25 aunque tengas la vida alta) y vuelve a 0.
    sed: {
      name: 'Sed', color: '#e8634a', max: 100, procs: true,
      decay: { after: T.sed.decayAfter, rate: T.sed.decayRate, ooc: true },
      state: () => ({ satedT: 0, bleedT: -9, bleedN: 0 }),
      canGain: (p, st) => !(st.satedT > 0),
      hold: st => st.satedT > 0,
      onDamaged(g, p, dmg) {
        const max = p.stats?.maxHP || 0;
        if (dmg?.amount > 0 && max > 0) gainGauge(p, 'sed', dmg.amount / max * 100 * T.sed.perHpPct);
      },
      onHit(g, p, e, hit, st) {
        if (!hit?.dot || !/:bleed$/.test(hit.source || '')) return;
        if (now(p) - st.bleedT >= 1) { st.bleedT = now(p); st.bleedN = 0; }
        const n = Math.min(T.sed.perBleedTick, T.sed.bleedPerSec - st.bleedN);
        if (n > 0) { st.bleedN += n; gainGauge(p, 'sed', n); }
      },
      onFull(g, p, st) {
        st.satedT = T.sed.satedT;
        g?.ui?.spawnText?.(p.pos, '¡SED SACIADA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        if (st.satedT > 0) { st.satedT -= dt; if (st.satedT <= 0) { st.satedT = 0; drainGauge(p, 'sed', st.v); } }
      },
      view: st => (st.satedT > 0 ? { state: 'active', label: 'Sed Saciada', t: st.satedT } : null),
    },
    // Guardián: +1 carga por bloqueo (innata: 15 % de bloqueo con escudo); se pierde
    // 1 carga cada 6 s sin ganar ninguna. La gastan Muro de Escudos y los talentos.
    bastion: {
      name: 'Bastión', color: '#7fb0e8', max: T.bastion.max, integer: true,
      decay: { after: 0, every: T.bastion.decayEvery, n: 1 },          // 1 carga cada 6 s sin ganar
      onDamaged(g, p, dmg) { if (dmg?.blocked) gainGauge(p, 'bastion', T.bastion.perBlock); },
    },
    // Cruzado: +1 por muerte (Juicio, su nodo clave) y +1 cada 3 impactos de
    // Martillo de Guerra. Veredicto Final gasta 3.
    fervor: {
      name: 'Fervor', color: '#ecc760', max: T.fervor.max, integer: true,
      state: () => ({ hammerHits: 0 }),
      onKill(g, p) { gainGauge(p, 'fervor', T.fervor.perKill); },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || hit?.skill !== 'g_martillo') return;
        if (++st.hammerHits >= T.fervor.hammerHits) { st.hammerHits = 0; gainGauge(p, 'fervor', 1); }
      },
      // Fervor Creciente (tv.fervorChance, Paso 2c.2): un Martillo que golpea tiene X % de dar 1 más
      afterCast(g, p, cast, res) {
        const ch = p.tv?.fervorChance || 0;
        if (!(ch > 0) || cast?.sk?.id !== 'g_martillo' || !(res?.hits > 0)) return;
        const r = typeof p.combatRng === 'function' ? p.combatRng() : 0.5;
        if (r * 100 < ch) gainGauge(p, 'fervor', 1);
      },
    },
    // Piromante: +5 por golpe de Fuego (su nodo clave hace que todos quemen; una
    // vez por instante: un área no da +25); baja −10/s tras 3 s. A 100 → IGNICIÓN
    // TOTAL: la siguiente Bola de Fuego o Meteoro cuesta 0 y es crítico seguro.
    // Se consume al LANZARLA (⑦ onCast; si la esquiva cancela la preparación, se pierde).
    calor: {
      name: 'Calor', color: '#ff7a3a', max: 100,
      decay: { after: T.calor.decayAfter, rate: T.calor.decayRate },
      state: () => ({ ready: false, gainAt: -9 }),
      canGain: (p, st) => !st.ready,
      hold: st => st.ready,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'fire') return;
        if (now(p) - st.gainAt < 0.05) return;
        st.gainAt = now(p);
        gainGauge(p, 'calor', T.calor.perFireHit);
      },
      onFull(g, p, st) {
        st.ready = true;
        invalidate(p);
        g?.ui?.spawnText?.(p.pos, '¡IGNICIÓN TOTAL!', 'txt-crit');
      },
      modifyResolve(p, sk, prof, st) {
        if (!st.ready || !T.calor.skills.includes(sk.id)) return;
        prof.cost = 0;
        prof.forceCrit = true;
        prof.ignition = true;
      },
      onCast(g, p, cast, st) {
        if (!st.ready || !cast?.prof?.ignition) return;
        st.ready = false;
        spendGauge(p, 'calor', st.v);
        invalidate(p);
      },
      view: st => (st.ready ? { state: 'active', label: 'Ignición Total' } : null),
    },
    // Crionte (POR ENEMIGO): +1 capa por golpe de Escarcha (Nova +2, +tv.frostLayers);
    // a 5 capas → Congelado 1,5 s (control duro con rendimientos decrecientes); un
    // jefe queda ATERIDO 4 s (−30 % de movimiento, −15 % de velocidad de ataque) y
    // suma 25 de stagger. Las capas caen 1 cada 2 s.
    escarcha: {
      name: 'Escarcha', color: '#8fd3ff', max: T.escarcha.max, perEnemy: true, integer: true,
      decay: { after: 0, every: T.escarcha.decayEvery, n: 1 },         // 1 capa cada 2 s sin ganar
      onHit(g, p, e, hit) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'frost' || !e?.alive) return;
        const n = hit.skill === 'nova_hielo' ? T.escarcha.nova + (p.tv?.frostLayers || 0) : T.escarcha.perHit;
        gainGauge(p, 'escarcha', n, e);
      },
      onFull(g, p, st, e) {
        if (!e?.alive) return;
        if (isBoss(e)) e.numbT = Math.max(e.numbT || 0, T.escarcha.numbT);
        e.applyCC?.('freeze', T.escarcha.freezeT, { src: p });
        drainGauge(p, 'escarcha', st.v, e);
      },
    },
    // Arcanista: Dardo Arcano +1 Carga por impacto (máx. 4); Rayo las consume TODAS:
    // +35 % de daño aditivo por carga y devuelve 5 de maná por carga. Se pierden 6 s
    // después de la última ganancia (Resonancia: touchGauge).
    cargas: {
      name: 'Cargas Arcanas', color: '#b98cff', max: T.cargas.max, integer: true,
      decay: { after: T.cargas.loseAfter, all: true },
      onHit(g, p, e, hit) { if (!hit?.proc && !hit?.dot && hit?.skill === 'm_dardo') gainGauge(p, 'cargas', T.cargas.perDart); },
      condAdd(p, e, hit, st) { return hit?.skill === 'rayo' ? T.cargas.dmgPerCharge * Math.floor(st.v) : 0; },
      afterCast(g, p, cast, res, st) {
        if (cast?.sk?.id !== 'rayo' || st.v < 1) return;
        const n = Math.floor(st.v);
        if (spendGauge(p, 'cargas', n)) gainResource(p, T.cargas.manaPerCharge * n);
      },
    },
    // Francotiradora: +20/s quieta (× 1 + tv.focusRate/100), −25/s moviéndote;
    // +0,15 % de crítico por punto (+15 % a 100).
    concentracion: {
      name: 'Concentración', color: '#e9d27a', max: 100,
      onTick(g, p, dt) {
        if (p.moving) drainGauge(p, 'concentracion', T.concentracion.losePerSec * dt * gaugeLossMult(p, 'concentracion'));
        else gainGauge(p, 'concentracion', T.concentracion.gainPerSec * dt * Math.max(0, 1 + (p.tv?.focusRate || 0) / 100));
      },
      // Respiración Profunda (tv.focusEnergy): al llenarla, +X de Energía
      onFull(g, p) { const n = p.tv?.focusEnergy || 0; if (n > 0) gainResource(p, n); },
      condCrit(p, e, hit, st) { return st.v * T.concentracion.critPerPoint; },
    },
    // Montaraz: el valor son las TRAMPAS ARMADAS (campos 'trampa' del héroe o con
    // data.trap; máx. 3, +gaugeMax:coto). PRESA = el primer élite o jefe que golpeas
    // (15 s): cuenta como élite para eliteDmg y KillInfo.status.prey.
    coto: {
      name: 'Coto de Caza', color: '#86d47a', max: T.coto.maxArmed, integer: true,
      state: () => ({ prey: null, preyT: 0 }),
      value(p) {
        const g = p.game;
        return (g?.fields || []).filter(f => !f.dead && f.owner === p && (f.kind === 'trampa' || f.data?.trap)).length;
      },
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !e?.alive) return;
        if (st.prey?.alive && st.preyT > 0) return;
        if (!(e.def?.rank || isBoss(e))) return;
        st.prey = e; st.preyT = T.coto.preyT; e.prey = true;
        g?.ui?.spawnText?.(e.pos?.clone ? e.pos.clone().setY((e.def?.scale || 1) + 0.8) : e.pos, '¡PRESA!', 'txt-crit');
      },
      onTick(g, p, dt, st) {
        if (!st.prey) return;
        st.preyT -= dt;
        if (st.preyT <= 0 || !st.prey.alive) { st.prey.prey = false; st.prey = null; st.preyT = 0; }
      },
      view: st => (st.prey ? { state: 'prey', label: 'Presa', t: st.preyT } : null),
    },
    // Tiradora: +3 por disparo hecho EN MOVIMIENTO; a 100 → VENDAVAL 6 s (+25 % de
    // velocidad de ataque, +1 proyectil a Flecha Múltiple) y vuelve a 0.
    impulso: {
      name: 'Impulso', color: '#a8d88a', max: 100,
      state: () => ({ galeT: 0, shotAt: -9 }),
      canGain: (p, st) => !(st.galeT > 0),
      hold: st => st.galeT > 0,
      onHit(g, p, e, hit, st) {
        if (hit?.proc || hit?.dot || !p.moving || !hit?.tags?.has?.('proj')) return;
        if (now(p) - st.shotAt < T.impulso.shotGap) return;
        st.shotAt = now(p);
        gainGauge(p, 'impulso', T.impulso.perShot);
      },
      onFull(g, p, st) {
        st.galeT = T.impulso.galeT;
        p.addBuff?.('t_vendaval', { aspdPct: T.impulso.galeAspd }, T.impulso.galeT,
          { name: 'Vendaval', icon: '🌬️', desc: `+${T.impulso.galeAspd}% vel. de ataque y +1 proyectil a Flecha Múltiple` });
        invalidate(p);
        // Segundo Aliento (tv.galeHeal % de vida —curación de habilidad— y tv.galeEnergy de Energía)
        const heal = p.tv?.galeHeal || 0, en = p.tv?.galeEnergy || 0;
        if (heal > 0) { if (g?.heal) g.heal(p.stats.maxHP * heal / 100, { target: 'self', src: 'galeHeal' }); else p.healSkill?.(p.stats.maxHP * heal / 100, 'galeHeal'); }
        if (en > 0) gainResource(p, en);
      },
      modifyResolve(p, sk, prof, st) { if (st.galeT > 0 && sk.id === 'flecha_multiple') prof.proj = (prof.proj || 0) + 1; },
      onTick(g, p, dt, st) {
        if (st.galeT > 0) { st.galeT -= dt; if (st.galeT <= 0) { st.galeT = 0; drainGauge(p, 'impulso', st.v); invalidate(p); } }
      },
      view: st => (st.galeT > 0 ? { state: 'active', label: 'Vendaval', t: st.galeT } : null),
    },
  };
}

function freezeDef(id, def) {
  if (!id || typeof id !== 'string') throw new Error('defineGauge: id inválido');
  if (!def || typeof def !== 'object') throw new Error(`defineGauge("${id}"): definición vacía`);
  const keys = gaugeKeys();
  for (const k of Object.keys(def)) if (!keys.includes(k)) throw new Error(`defineGauge("${id}"): clave desconocida "${k}"`);
  if (!(typeof def.max === 'function' || def.max > 0)) throw new Error(`defineGauge("${id}"): max debe ser > 0 o función`);
  return Object.freeze({ id, ...def });
}

export function gaugeDefs() {
  if (!GAUGE_DEFS) {
    GAUGE_DEFS = {};
    for (const [id, d] of Object.entries(baseGauges())) GAUGE_DEFS[id] = freezeDef(id, d);
  }
  return GAUGE_DEFS;
}
export function gaugeIds() { return Object.keys(gaugeDefs()); }
export const BASE_GAUGE_IDS = ['sed', 'bastion', 'fervor', 'calor', 'escarcha', 'cargas', 'concentracion', 'coto', 'impulso'];
export function gaugePowerId(id) { return `gauge_${id}`; }

// indicador NUEVO (los <CLASE>_GAUGES de powers-<clase>.js pasan por aquí). Un id
// repetido lanza: para potenciar uno base usa gainGauge/onGauge desde un poder.
export function defineGauge(id, def) {
  const defs = gaugeDefs();
  if (defs[id]) throw new Error(`defineGauge: indicador repetido "${id}"`);
  defs[id] = freezeDef(id, def);
  if (GAUGE_POWERS_DONE && !POWER_HOOKS[gaugePowerId(id)]) definePower(gaugePowerId(id), gaugePowerOf(defs[id]));
  return defs[id];
}
export function registerGauges(map) { for (const [id, def] of Object.entries(map || {})) defineGauge(id, def); }

// ------------------------------------------------------------
// estado y valor
// ------------------------------------------------------------
export function activeMechanic(p) { return p?.talentAgg?.mechanic || null; }

// estado del indicador: { v, last, ...def.state() } en p.gauges[id] (o e.gauges[id])
export function gaugeState(p, id, e = null) {
  const def = gaugeDefs()[id];
  if (!def || !p) return null;
  const host = def.perEnemy ? e : p;
  if (!host) return null;
  const all = host.gauges || (host.gauges = {});
  return all[id] || (all[id] = { v: 0, last: -99, _acc: 0, ...(def.state ? def.state() : {}) });
}
// stat propia de los indicadores: la suma de p.powerStats[key] (poderes `stats`) y de
// los buffs activos que la declaran (addBuff(id, { 'gaugeGain:sed': 100 }, …))
export function gaugeStat(p, key) {
  let v = p?.powerStats?.[key] || 0;
  for (const b of p?.buffs || []) if (b && b.t > 0 && Number.isFinite(b.stats?.[key])) v += b.stats[key];
  return v;
}
export function gaugeGainMult(p, id) { return Math.max(0, 1 + gaugeStat(p, `gaugeGain:${id}`) / 100); }
export function gaugeLossMult(p, id) { return Math.max(0, 1 + gaugeStat(p, `gaugeLoss:${id}`) / 100); }
export function gaugeMax(p, id) {
  const def = gaugeDefs()[id];
  if (!def) return 0;
  const base = typeof def.max === 'function' ? def.max(p) : def.max;
  return Math.max(1, base + gaugeStat(p, `gaugeMax:${id}`));
}
export function gaugeValue(p, id, e = null) {
  const def = gaugeDefs()[id];
  if (!def) return 0;
  if (def.value) { try { return def.value(p, e) || 0; } catch { return 0; } }
  return gaugeState(p, id, e)?.v || 0;
}

// ⑩ punto de despacho de los indicadores: onGauge(g, p, id, ev, n, e)
function fireGauge(p, id, ev, n, e) {
  if (p?.hookIndex?.onGauge) firePower('onGauge', p, p.game, p, id, ev, n, e || null);
}

// opts.raw: sin el multiplicador 'gaugeGain:<id>' (setGauge / arnés)
export function gainGauge(p, id, n, e = null, opts = null) {
  if (!(n > 0) || !p) return 0;
  const def = gaugeDefs()[id];
  if (!def || activeMechanic(p) !== id) return 0;
  if (def.perEnemy && !e?.alive) return 0;
  const st = gaugeState(p, id, e);
  if (!st || (def.canGain && !def.canGain(p, st, e))) return 0;
  if (!opts?.raw) n *= gaugeGainMult(p, id);
  if (!(n > 0)) return 0;
  const max = gaugeMax(p, id);
  const before = st.v;
  st.v = Math.min(max, st.v + n);
  st.last = now(p);
  st._acc = 0;
  const got = st.v - before;
  if (got > 0) fireGauge(p, id, 'gain', got, e);
  if (before < max && st.v >= max) {
    fireGauge(p, id, 'full', st.v, e);
    try { def.onFull?.(p.game, p, st, e); } catch (err) { try { console.warn(`[indicador ${id}] onFull`, err); } catch { /* */ } }
  }
  return got;
}
export function spendGauge(p, id, n, e = null) {
  const def = gaugeDefs()[id];
  const st = def && gaugeState(p, id, e);
  if (!st || !(n > 0) || st.v + 1e-9 < n) return false;
  st.v = Math.max(0, st.v - n);
  fireGauge(p, id, 'spent', n, e);
  if (st.v <= 1e-9) { st.v = 0; fireGauge(p, id, 'empty', 0, e); }
  return true;
}
export function drainGauge(p, id, n, e = null) {
  const def = gaugeDefs()[id];
  const st = def && gaugeState(p, id, e);
  if (!st || !(n > 0) || st.v <= 0) return 0;
  const before = st.v;
  st.v = Math.max(0, st.v - n);
  if (st.v <= 1e-9) { st.v = 0; fireGauge(p, id, 'empty', 0, e); }
  return before - st.v;
}
export function setGauge(p, id, v, e = null) {
  const st = gaugeState(p, id, e);
  if (!st) return 0;
  if (v > st.v) gainGauge(p, id, v - st.v, e, { raw: true });
  else if (v < st.v) drainGauge(p, id, st.v - v, e);
  return st.v;
}
export function touchGauge(p, id, e = null) { const st = gaugeState(p, id, e); if (st) { st.last = now(p); st._acc = 0; } }
// vacía los indicadores del héroe (cambio de especialización)
export function resetGauges(p) { if (p) p.gauges = {}; }

// pérdida con el tiempo: { after (s sin ganar; ooc = s fuera de combate), rate/s |
// every+n (escalones) | all (todo de golpe) }
function tickDecay(p, def, st, dt, e = null) {
  const d = def.decay;
  if (!d || !st || st.v <= 0 || (def.hold && def.hold(st))) { if (st) st._acc = 0; return; }
  const idle = d.ooc ? (p.sinceCombat || 0) : now(p) - st.last;
  if (idle < (d.after || 0)) { st._acc = 0; return; }
  if (d.all) { drainGauge(p, def.id, st.v, e); return; }
  if (d.every) {
    st._acc += dt;
    while (st._acc >= d.every && st.v > 0) { st._acc -= d.every; drainGauge(p, def.id, d.n || 1, e); }
    return;
  }
  drainGauge(p, def.id, (d.rate || 0) * dt * gaugeLossMult(p, def.id), e);
}

// el poder gauge_<id> que engancha el indicador a los puntos de despacho
function gaugePowerOf(def) {
  const id = def.id;
  const pw = { name: def.name || id, desc: `Indicador de especialización: ${def.name || id}`, tags: ['gauge'] };
  if (def.procs) pw.procs = true;
  for (const h of gaugeHooks()) {
    if (!def[h]) continue;
    if (h === 'modifyResolve') pw[h] = (p, sk, prof) => def[h](p, sk, prof, gaugeState(p, id));
    else if (h === 'condAdd' || h === 'condCrit' || h === 'condDr') pw[h] = (p, a, b) => (def.perEnemy ? 0 : def[h](p, a, b, gaugeState(p, id)) || 0);
    else if (h === 'onHit') pw[h] = (g, p, e, hit) => def[h](g, p, e, hit, def.perEnemy ? gaugeState(p, id, e) : gaugeState(p, id));
    else if (h === 'onKill') pw[h] = (g, p, e, kill) => def[h](g, p, e, kill, def.perEnemy ? gaugeState(p, id, e) : gaugeState(p, id));
    else if (h === 'afterCast') pw[h] = (g, p, cast, res) => def[h](g, p, cast, res, gaugeState(p, id));
    else pw[h] = (g, p, x) => def[h](g, p, x, gaugeState(p, id));      // onDamaged, onCast
  }
  // ⑨ a 10 Hz: pérdida + onTick propio (los por enemigo recorren los enemigos con capas)
  pw.onTick = (g, p, dt) => {
    if (def.perEnemy) {
      for (const e of g?.enemies || []) {
        const st = e.alive && e.gauges?.[id];
        if (st && st.v > 0) tickDecay(p, def, st, dt, e);
      }
    } else tickDecay(p, def, gaugeState(p, id), dt);
    if (def.onTick) def.onTick(g, p, dt, def.perEnemy ? null : gaugeState(p, id));
  };
  return pw;
}
// mapa { gauge_<id>: PowerDef } (lo registra js/powers.js al final de su carga)
export function gaugePowers() {
  GAUGE_POWERS_DONE = true;
  const out = {};
  for (const def of Object.values(gaugeDefs())) out[gaugePowerId(def.id)] = gaugePowerOf(def);
  return out;
}

// ------------------------------------------------------------
// lectura para el HUD (2d): indicador sobre la barra de habilidades
// ------------------------------------------------------------
// state: 'idle' (vacío) · 'building' · 'full' · 'active' (Sed Saciada, Ignición
// Total, Vendaval) · 'prey' (Presa marcada). label/t: estado activo y su tiempo.
// Por enemigo (escarcha): el enemigo con más capas (el que el jugador ve cargándose).
export function gaugeView(p) {
  const id = activeMechanic(p);
  const def = id && gaugeDefs()[id];
  if (!def) return null;
  let st = null, e = null;
  if (def.perEnemy) {
    for (const o of p.game?.enemies || []) {
      const s = o.alive && o.gauges?.[id];
      if (s && (!st || s.v > st.v)) { st = s; e = o; }
    }
  } else st = gaugeState(p, id);
  const max = gaugeMax(p, id);
  const value = def.value ? gaugeValue(p, id, e) : (st?.v || 0);
  const extra = (st && def.view && def.view(st)) || null;
  const state = extra?.state || (value >= max ? 'full' : value > 0 ? 'building' : 'idle');
  const out = { id, name: def.name || id, value: def.integer ? Math.floor(value) : Math.round(value * 10) / 10, max, color: def.color || '#ffffff', state };
  if (extra?.label) out.label = extra.label;
  if (extra?.t != null) out.t = Math.max(0, extra.t);
  if (e) out.enemy = e;
  return out;
}
