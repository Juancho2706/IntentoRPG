// ============================================================
// MECÁNICAS DE ESPECIALIZACIÓN: indicadores (módulo PURO, sin DOM) — Paso 2c.0
// ============================================================
// docs/paso2-diseno.md §2 (tabla «Mecánicas propias de cada especialización»),
// §9.1.2 (punto ⑩) y §9.1.3. El recurso de clase (Furia/Maná/Energía) es igual
// para todos; cada especialización añade UN indicador con su ritmo propio:
//   sed (Berserker) · bastion (Guardián) · fervor (Cruzado) · calor (Piromante) ·
//   escarcha (Crionte, POR ENEMIGO) · cargas (Arcanista) · concentracion
//   (Francotiradora) · coto (Montaraz: trampas armadas + Presa) · impulso (Tiradora)
// La mecánica BASE de llenado y descarga de cada uno vive en js/mech-<clase>.js (Paso 2,
// E0.3) y este núcleo la compone y la registra. Los talentos que
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
//   gaugeView(p, { target }?) → vista v2 | null   (HUD, 2d · 2d.2 §3.10; ver gaugeView abajo)
//   gaugeSeq(p, id) → { gain, full, spent, empty }  contadores MONÓTONOS de eventos (⑩)
//   gaugeTuning() → números de cada mecánica (ÚNICA fuente para el texto de la UI: explain(T))
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
// hojas puras (sin imports): los números de las activas de talento que cita la UI. Van
// ANTES de powers.js: en el ciclo powers.js ↔ este módulo, powers.js llama a gaugePowers()
// (→ gaugeTuning) al cargar y estas hojas tienen que estar ya evaluadas.
// (espacio de nombres: los tests que sustituyen los árboles por un fixture no exportan *_TALENT_SKILLS)
import * as TAL_G from './talents-guerrero.js';
import * as TAL_M from './talents-maga.js';
import * as TAL_A from './talents-arquera.js';
// Paso 2 (E0.3): números y definiciones de los indicadores por clase (hojas sin imports;
// también ANTES de powers.js por la misma razón)
import * as MECH_G from './mech-guerrero.js';
import * as MECH_M from './mech-maga.js';
import * as MECH_A from './mech-arquera.js';
import { STAGGER_CC } from './combat-math.js';
import { firePower, definePower, POWER_HOOKS, hasPower } from './powers.js';
import { gainResource } from './resources.js';

// eslint-disable-next-line no-var
var GAUGE_DEFS; // id → def congelada (perezoso: ver gaugeDefs)
// eslint-disable-next-line no-var
var GAUGE_POWERS_DONE; // true cuando powers.js ya registró los gauge_<id>

// (funciones, no constantes de módulo: se pueden llamar antes de evaluar este módulo)
function gaugeHooks() { return ['onHit', 'onDamaged', 'onKill', 'onCast', 'afterCast', 'condAdd', 'condCrit', 'condDr', 'modifyResolve']; }
function gaugeKeys() {
  return ['name', 'desc', 'color', 'max', 'perEnemy', 'integer', 'decay', 'state', 'value', 'view', 'viewX',
    'canGain', 'hold', 'onFull', 'procs', 'onTick', ...gaugeHooks()];
}

function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
// buff activo del héroe (los poderes de talento exponen sus ventanas como buffs)
function buffOf(p, id) { return (p?.buffs || []).find(b => b && b.id === id && b.t > 0) || null; }
// estado de un poder SIN crearlo (la vista no muta nada del héroe)
function peekPower(p, id) { return p?.powerState?.[id] || null; }
function r2(n) { return Math.round(n * 100) / 100; }
function talentSkill(id) {
  // (try: si un orden de carga raro llegara antes que las hojas, quedan los valores por defecto)
  for (const get of [() => TAL_G.GUERRERO_TALENT_SKILLS, () => TAL_M.MAGA_TALENT_SKILLS, () => TAL_A.ARQUERA_TALENT_SKILLS]) {
    let L = null;
    try { L = get(); } catch { L = null; }
    const s = (L || []).find(x => x.id === id);
    if (s) return s;
  }
  return {};
}
function now(p) { return p?.simT || 0; }
// golpe del básico (habilidad de categoría basic o el ataque de arma)
function isBasicHit(p, hit) {
  if (!hit) return false;
  if (hit.weapon || hit.basic) return true;
  const s = (p?.cls?.skills || []).find(x => x.id === hit.skill);
  return s?.cat === 'basic';
}
// el resolvedor cachea perfiles: un indicador que cambia coste/crítico/proyectiles
// (Ignición Total, Vendaval) los invalida
function invalidate(p) { if (p) p.resolved = {}; }

// ------------------------------------------------------------
// Los 9 indicadores BASE (§2). Paso 2 (E0.3): los números y las definiciones de cada
// clase viven en js/mech-<clase>.js (dueño KT-<clase> desde E2); aquí se COMPONEN en el
// orden de siempre (guerrero → maga → arquera: sed, bastion, fervor, calor, escarcha,
// cargas, concentracion, coto, impulso) y se les INYECTAN los helpers del núcleo (H).
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNING;
// eslint-disable-next-line no-var
var MECH_H; // helpers inyectados a mech-<clase>.js (perezoso, como TUNING)
// Los números BASE los consume el núcleo (mech-<clase>.js). Los de los talentos que solo CITA la UI
// salen de la activa de talento (talents-<clase>.js) o, si viven en un poder
// (powers-<clase>.js), se copian en mech-<clase>.js y tests/test75-gaugeview-v2 comprueba que el texto
// del nodo dice lo mismo (sin desfase entre el juego y la explicación de la barra).
export function gaugeTuning() {
  if (TUNING) return TUNING;
  const H = mechHelpers();
  return (TUNING = Object.freeze({ ...MECH_G.gaugeTuning(H), ...MECH_M.gaugeTuning(H), ...MECH_A.gaugeTuning(H) }));
}

function baseGauges() {
  const T = gaugeTuning(), H = mechHelpers();
  return { ...MECH_G.baseGauges(T, H), ...MECH_M.baseGauges(T, H), ...MECH_A.baseGauges(T, H) };
}

// `H`: lo que las mecánicas por clase usan del núcleo y de otros módulos. Inyectado, así
// mech-<clase>.js no importa nada y no entra en el ciclo powers.js ↔ este módulo. Las
// funciones son declaraciones (enlazadas antes de evaluar cualquier módulo); POWER_HOOKS y
// STAGGER_CC son constantes y van como getters (se leen al usarlas, no al construir H).
function mechHelpers() {
  return MECH_H || (MECH_H = Object.freeze({
    gainGauge, spendGauge, drainGauge, gaugeGainMult, gaugeLossMult,
    isBoss, buffOf, peekPower, r2, now, isBasicHit, invalidate, talentSkill,
    hasPower, gainResource,
    get POWER_HOOKS() { return POWER_HOOKS; },
    get STAGGER_CC() { return STAGGER_CC; },
  }));
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

// contadores MONÓTONOS de eventos por indicador (2d.2 §3.10: `seq` de la vista). Viven
// aparte de p.gauges para que resetGauges (cambio de especialización) no los rebobine; por
// enemigo (Escarcha) suman TODOS los enemigos. La UI compara con la vista anterior.
const SEQ_EVENTS = ['gain', 'full', 'spent', 'empty'];
export function gaugeSeq(p, id) {
  if (!p) return { gain: 0, full: 0, spent: 0, empty: 0 };
  const all = p._gaugeSeq || (p._gaugeSeq = {});
  return all[id] || (all[id] = { gain: 0, full: 0, spent: 0, empty: 0 });
}
function bumpSeq(p, id, ev) { if (p && SEQ_EVENTS.includes(ev)) gaugeSeq(p, id)[ev]++; }

// ⑩ punto de despacho de los indicadores: onGauge(g, p, id, ev, n, e)
function fireGauge(p, id, ev, n, e) {
  bumpSeq(p, id, ev);
  if (p?.hookIndex?.onGauge) firePower('onGauge', p, p.game, p, id, ev, n, e || null);
}

// indicadores DERIVADOS (def.value: Coto = trampas armadas) no pasan por gainGauge: sus
// eventos se cuentan comparando el valor con el anterior (onTick a 10 Hz y gaugeView).
// Solo `seq` (no dispara ⑩: ningún poder escucha esos eventos y así no cambia el juego).
function trackDerived(p, def) {
  if (!def?.value || def.perEnemy || !p) return;
  const st = gaugeState(p, def.id);
  if (!st) return;
  const v = gaugeValue(p, def.id), was = st._dv;
  st._dv = v;
  if (was == null || v === was) return;
  const max = gaugeMax(p, def.id);
  if (v > was) { bumpSeq(p, def.id, 'gain'); if (v >= max && was < max) bumpSeq(p, def.id, 'full'); }
  else { bumpSeq(p, def.id, 'spent'); if (v <= 0) bumpSeq(p, def.id, 'empty'); }
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
    trackDerived(p, def);
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
// lectura para el HUD (2d · v2 de 2d.2 §3.10): indicador sobre la barra de habilidades
// ------------------------------------------------------------
// gaugeView(p, opts = {}) → null | {
//   id, name, value, max, color, state, label?, t?, enemy?     (v1, igual que antes)
//   tMax?      duración total del estado activo o de la ventana (anillo: t / tMax)
//   decayIn    s hasta la próxima pérdida: escalón (every), inicio (after) o caducidad
//              total (all); null si no pierde, está vacío o en hold
//   decaying   true si está perdiendo AHORA (Calor/Sed tras su espera, Concentración al moverte)
//   hold       true si un estado activo congela la pérdida (def.hold; Resonancia)
//   seq        { gain, full, spent, empty } contadores MONÓTONOS (gaugeSeq; copia)
//   ready      [skillId] habilidades que la mecánica deja listas o potenciadas AHORA
//   x          extra por indicador (siempre un objeto; tabla en docs/paso2d2-hud-pc.md §3.10)
//   sinceCombat  s desde el último golpe dado o recibido (la UI desvanece a los 5 s)
// }
// state: 'idle' (vacío) · 'building' · 'full' · 'active' (Sed Saciada, Ignición Total,
// Vendaval, Muro de Escudos, Ascensión, Visión Certera, jefe Aterido) · 'prey' (Presa).
// La vista NO muta al héroe ni a los enemigos (salvo los contadores de los derivados).
// opts.target: enemigo que la UI quiere ver (solo indicadores por enemigo: Escarcha).
// Regla de objetivo (R1): el enemigo bajo el cursor (opts.target vivo) → el jefe en combate
// (con capas o Aterido) → el más escarchado.
export function pickGaugeEnemy(p, id, target = null) {
  if (target?.alive) return target;
  let boss = null, best = null, bv = -1;
  for (const o of p?.game?.enemies || []) {
    if (!o?.alive) continue;
    const s = o.gauges?.[id];
    const v = s?.v || 0;
    if (!boss && isBoss(o) && (v > 0 || (o.numbT || 0) > 0)) boss = o;
    if (s && v > bv) { bv = v; best = o; }
  }
  return boss || best;
}

// pérdida con el tiempo, en lectura (misma regla que tickDecay)
function decayInfo(p, def, st, value) {
  const d = def.decay;
  if (!d || !st || !(value > 0) || (def.hold && def.hold(st))) return { decayIn: null, decaying: false };
  const idle = d.ooc ? (p.sinceCombat || 0) : now(p) - st.last;
  const wait = d.after || 0;
  if (d.every) {
    if (idle < wait) return { decayIn: wait - idle + d.every, decaying: false };
    return { decayIn: Math.max(0, d.every - (st._acc || 0)), decaying: false };
  }
  if (d.all) return { decayIn: Math.max(0, wait - idle), decaying: false };
  if (idle < wait) return { decayIn: wait - idle, decaying: false };
  return { decayIn: 0, decaying: (d.rate || 0) * gaugeLossMult(p, def.id) > 0 };
}

export function gaugeView(p, opts = {}) {
  const id = activeMechanic(p);
  const def = id && gaugeDefs()[id];
  if (!def) return null;
  let st = null, e = null;
  if (def.perEnemy) {
    e = pickGaugeEnemy(p, id, opts?.target || null);
    st = e?.gauges?.[id] || null;            // lectura: no crea estado en el enemigo
  } else st = gaugeState(p, id);
  trackDerived(p, def);
  const max = gaugeMax(p, id);
  const value = def.value ? gaugeValue(p, id, e) : (st?.v || 0);
  const extra = (st && def.view && def.view(st)) || null;
  const state = extra?.state || (value >= max ? 'full' : value > 0 ? 'building' : 'idle');
  const out = { id, name: def.name || id, value: def.integer ? Math.floor(value) : Math.round(value * 10) / 10, max, color: def.color || '#ffffff', state };
  if (extra?.label) out.label = extra.label;
  if (extra?.t != null) out.t = Math.max(0, extra.t);
  if (e) out.enemy = e;
  // v2 (solo AÑADE campos)
  const dec = decayInfo(p, def, st, value);
  out.decayIn = dec.decayIn == null ? null : Math.round(dec.decayIn * 100) / 100;
  out.decaying = dec.decaying;
  out.hold = !!(st && def.hold && def.hold(st));
  out.seq = { ...gaugeSeq(p, id) };
  out.ready = [];
  out.x = {};
  out.sinceCombat = p.sinceCombat ?? null;
  if (def.viewX) {
    try { def.viewX(p, st || {}, e, out); } catch (err) { try { console.warn(`[indicador ${id}] viewX`, err); } catch { /* */ } }
    if (!out.x || typeof out.x !== 'object') out.x = {};
    if (!Array.isArray(out.ready)) out.ready = [];
  }
  if (out.t != null) out.t = Math.max(0, Math.round(out.t * 100) / 100);
  return out;
}
