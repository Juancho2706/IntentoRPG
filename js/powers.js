// ============================================================
// Registro DATA-DRIVEN de poderes y comportamientos (módulo PURO, sin DOM)
// ============================================================
// Paso 2b.0 — docs/paso2-diseno.md §9.1. Cada poder es una entrada `PowerDef`
// con ganchos tipados que el juego invoca desde un número FIJO de puntos de
// despacho (§9.1.2). Prohibido escribir `powers.has(` fuera de js/powers*.js
// (lo vigila tests/test67-sin-powers-has.mjs).
//
// ---- tipos (JSDoc): firmas EXACTAS que reciben los ganchos ----
/** @typedef {{ dealt:number, raw:number, crit:boolean, skill:string|null, tags:Set<string>,
 *   elem:string|null, proc:boolean, dot:boolean, source:string, pos:{x:number,z:number} }} HitInfo
 *   (dot = tic de daño por tiempo o de campo: como los procs, no dispara onHit salvo `procs:true`) */
/** @typedef {{ skill:string|null, tags:Set<string>, crit:boolean, overkill:number, nested:boolean,
 *   loot:{goldMul:number},
 *   status:{ frozen:boolean, bleeding:boolean, burning:boolean, poisoned:boolean,
 *            slowed:boolean, rooted:boolean, prey:boolean, weakened:boolean } }} KillInfo
 *   (nested = la muerte ocurrió mientras se resolvía la de otro enemigo: las explosiones
 *    al matar NO deben volver a estallar; loot.goldMul es mutable) */
/** @typedef {{ amount:number, raw:number, element:string, melee:boolean, blocked:boolean,
 *   src:object|null }} DamageTaken      // `amount` es MUTABLE en onDamaged (redirección/absorción) */
/** @typedef {{ sk:object, prof:object, slot:string, target:{x:number,z:number}|null,
 *   enemy:object|null }} CastInfo */
/** @typedef {{ hits:number, dealt:number, killed:number }} CastResult */
//
// PUNTOS DE DESPACHO (los ÚNICOS que llaman a firePower):
//  ① Player.recompute ............ stats (+ buildHookIndex)          entities.js
//  ② resolveSkill ................ modifyResolve                     skill-resolve.js
//  ③ Player.rollDamage ........... condAdd, condCrit                 entities.js
//  ④ Enemy.takeDamage ............ (sin ganchos: Debilidad + Π[×] → llama a ⑤)
//  ⑤ Game.onPlayerHit ............ onHit                             game-skills.js
//  ⑥ Game.onEnemyKilled .......... onKill                            main.js
//  ⑦ canal de lanzamiento ........ onCast, afterCast                 game-skills.js
//  ⑧ Player.takeDamage ........... condDr → mitigar → escudos → onDamaged → onLethal
//  ⑨ Player.update ............... onTick (10 Hz)                    entities.js
//  ⑩ gainGauge / spendGauge ...... onGauge(g, p, id, ev, n, e)       spec-mechanics.js
//       ev: 'gain' | 'full' | 'spent' | 'empty' · e = enemigo (indicadores por enemigo)
// Paso 2c.2 (núcleo de la integración):
//  ⑪ resources.gainResource ...... onResource(g, p, n, src)          resources.js
//       n = recurso REALMENTE ganado (los poderes que dan recurso extra llaman a
//       gainResource(p, n, { silent: true }) y no vuelven a disparar ⑪)
//  ⑫ Game.damageAlly ............. onAllyDamaged(g, p, ally, dmg)   (dmg.amount MUTABLE)
//                                  onAllyLethal(g, p, ally, dmg) → true = el aliado sobrevive
//       (game-skills.js: los aliados del cooperativo —g.party— reciben daño por ahí)
//  ⑬ fin natural de un DoT ....... onDotEnd(g, p, e, dot)            timers.js → game-skills.js
//       dot = { source, kind, total, per, ticks } (solo si se agotó solo: no al
//       consumirlo, reemplazarlo ni al morir el objetivo)
//
// MÓDULOS POR CLASE (Paso 2c.1, §9.1.6): js/powers-<clase>.js exporta
// <clase>Powers(), <clase>SkillBehaviors() (activas de talento), <clase>Fields() y
// <clase>Gauges(); este archivo los registra al cargar (abajo). Los indicadores de
// especialización (spec-mechanics.js) se enganchan como poderes `gauge_<id>`.
import { registerMultiplier } from './combat-math.js';
import { commonPowers, commonBehaviors } from './powers-common.js';
// comportamientos a medida de cada clase (dueños: trabajadores de 2b.1; solo importan skill-defs.js)
import { GUERRERO_SKILL_BEHAVIORS } from './skills-guerrero.js';
import { MAGA_SKILL_BEHAVIORS } from './skills-maga.js';
import { ARQUERA_SKILL_BEHAVIORS } from './skills-arquera.js';
// poderes, comportamientos (activas de talento), campos e indicadores por clase (dueños: 2c.1)
// (funciones: el ciclo powers.js ↔ powers-<clase>.js no puede leer constantes aún sin evaluar)
import { guerreroPowers, guerreroSkillBehaviors, guerreroFields, guerreroGauges } from './powers-guerrero.js';
import { magaPowers, magaSkillBehaviors, magaFields, magaGauges } from './powers-maga.js';
import { arqueraPowers, arqueraSkillBehaviors, arqueraFields, arqueraGauges } from './powers-arquera.js';
import { defineField } from './field-entities.js';
import { gaugePowers, registerGauges } from './spec-mechanics.js';

export const HOOK_NAMES = ['stats', 'modifyResolve', 'condAdd', 'condCrit', 'onCast', 'afterCast',
  'onHit', 'onKill', 'condDr', 'onDamaged', 'onLethal', 'onTick', 'onGauge',
  // Paso 2c.2: ⑪ recurso ganado · ⑫ daño / golpe letal a un ALIADO · ⑬ fin de un DoT
  'onResource', 'onAllyDamaged', 'onAllyLethal', 'onDotEnd'];
// claves admitidas en un PowerDef (cualquier otra → definePower lanza)
export const POWER_KEYS = new Set([...HOOK_NAMES, 'mult', 'icd', 'priority', 'procs', 'state', 'name', 'desc', 'tags']);

export const POWER_HOOKS = {};       // id → PowerDef (congelado tras definir)

// Define un poder. Lanza si el id está repetido o si trae una clave desconocida.
// `mult` registra un multiplicador [×] en combat-math (Π, tope ×1,3, máx. 3 activos).
export function definePower(id, def) {
  if (!id || typeof id !== 'string') throw new Error('definePower: id inválido');
  if (POWER_HOOKS[id]) throw new Error(`definePower: poder repetido "${id}"`);
  if (!def || typeof def !== 'object') throw new Error(`definePower: definición vacía para "${id}"`);
  for (const k of Object.keys(def)) if (!POWER_KEYS.has(k)) throw new Error(`definePower("${id}"): clave desconocida "${k}"`);
  for (const h of HOOK_NAMES) if (def[h] != null && typeof def[h] !== 'function') throw new Error(`definePower("${id}"): ${h} debe ser función`);
  if (def.mult) {
    const m = def.mult;
    if (!(m.mult > 1 && m.mult <= 1.3)) throw new Error(`definePower("${id}"): mult debe estar en (1, 1,3]`);
    registerMultiplier(id, { mult: m.mult, when: m.when || (() => true), name: def.name || id });
  }
  POWER_HOOKS[id] = Object.freeze({ id, priority: 0, ...def });
  return POWER_HOOKS[id];
}

// definePower para cada entrada de un módulo (`{ id: PowerDef }`)
export function registerPowers(map) {
  for (const [id, def] of Object.entries(map || {})) definePower(id, def);
}

// p.hookIndex[hook] = [defs activos con ese gancho], por prioridad (mayor = antes).
// Lo llama Player.recompute en cuanto conoce p.powers.
export function buildHookIndex(p) {
  const idx = {};
  for (const id of p?.powers || []) {
    const d = POWER_HOOKS[id];
    if (!d) continue;
    for (const h of HOOK_NAMES) if (d[h]) (idx[h] || (idx[h] = [])).push(d);
  }
  for (const list of Object.values(idx)) list.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  if (p) p.hookIndex = idx;
  return idx;
}

// estado volátil por héroe y poder (no se guarda)
export function powerState(p, id) {
  if (!p) return {};
  const all = p.powerState || (p.powerState = {});
  if (!all[id]) all[id] = { ...(POWER_HOOKS[id]?.state?.() || {}) };
  return all[id];
}

// ¿el héroe tiene el poder? (solo para el registro y los módulos js/powers*.js)
export function hasPower(p, id) { return !!p?.powers?.has(id); }

const SUM_HOOKS = new Set(['condAdd', 'condCrit', 'condDr']);
// Recorre p.hookIndex[hook] con try/catch por poder (un poder roto no tumba el
// juego). `args` se pasan TAL CUAL al gancho (el punto de despacho construye la
// firma exacta de la tabla §9.1.1). Agregación del resultado:
//   condAdd/condCrit/condDr → suma de números · stats → objeto con las sumas
//   onCast → false si algún poder cancela · onLethal / onAllyLethal → true si alguno salva
//   resto → undefined.  `icd` (s): el gancho no se llama mientras dure; un gancho
//   que devuelve `false` no consume el icd (no aplicó).
export function firePower(hook, p, ...args) {
  const list = p?.hookIndex?.[hook];
  const sum = SUM_HOOKS.has(hook);
  let total = 0;
  const stats = hook === 'stats' ? {} : null;
  const lethal = hook === 'onLethal' || hook === 'onAllyLethal';
  if (!list || !list.length) return sum ? 0 : hook === 'stats' ? stats : hook === 'onCast' ? true : lethal ? false : undefined;
  let cast = true, saved = false;
  for (const d of list) {
    if (hook === 'onHit') {
      const hit = args[3];
      if (hit && (hit.proc || hit.dot) && !d.procs) continue;
    }
    let st = null;
    const now = p.simT || 0;
    if (d.icd) { st = powerState(p, d.id); if ((st._icdUntil || 0) > now + 1e-9) continue; }
    let r;
    try { r = d[hook](...args); }
    catch (err) { try { console.warn(`[poder ${d.id}] ${hook}:`, err); } catch { /* sin consola */ } continue; }
    if (st && r !== false) st._icdUntil = now + d.icd;
    if (sum) total += Number.isFinite(r) ? r : 0;
    else if (stats && r && typeof r === 'object') { for (const [k, v] of Object.entries(r)) if (Number.isFinite(v)) stats[k] = (stats[k] || 0) + v; }
    else if (hook === 'onCast' && r === false) { cast = false; break; }
    else if (lethal && r === true) { saved = true; break; }
  }
  if (sum) return total;
  if (stats) return stats;
  if (hook === 'onCast') return cast;
  if (lethal) return saved;
  return undefined;
}

// Daño originado por un PODER: proc (sin Π[×], no dispara onHit salvo `procs:true`).
export function dealProcDamage(g, e, amount, opts = {}) {
  if (!e || !e.alive || !(amount > 0)) return 0;
  return e.takeDamage(Math.max(1, Math.round(amount)), false, { ...opts, proc: true, source: opts.source || 'power' }) || 0;
}

// ------------------------------------------------------------
// Comportamientos de habilidad (§9.1.3): las activas que no encajan en un tipo
// genérico. def = { cast?(g, p, prof, cast) → CastResult, tick?(g, p, inst, dt), end?(g, p, inst),
//   passiveTick?(g, p, dt) }
// Sin cast, el canal usa el TIPO GENÉRICO de la habilidad y llama a tick/end (canalización).
// passiveTick (Paso 2c.2): a 10 Hz mientras el héroe CONOCE la activa (concedida por un
// nodo de talento o aprendida), esté o no en la barra (Inversión del Tiempo graba su
// historial desde que la tienes, no desde la primera activa).
// ------------------------------------------------------------
export const SKILL_BEHAVIORS = {};
const BEHAVIOR_KEYS = new Set(['cast', 'tick', 'end', 'passiveTick', 'name', 'desc']);
export function defineSkillBehavior(id, def) {
  if (!id || SKILL_BEHAVIORS[id]) throw new Error(`defineSkillBehavior: id inválido o repetido "${id}"`);
  // cast() es lo normal; un comportamiento SOLO con tick/end convive con el tipo
  // genérico de la habilidad (p. ej. type:'channel' + behavior con tick por tic)
  if (!def || (typeof def.cast !== 'function' && typeof def.tick !== 'function' && typeof def.passiveTick !== 'function')) throw new Error(`defineSkillBehavior("${id}"): falta cast() o tick()`);
  for (const k of Object.keys(def)) if (!BEHAVIOR_KEYS.has(k)) throw new Error(`defineSkillBehavior("${id}"): clave desconocida "${k}"`);
  SKILL_BEHAVIORS[id] = Object.freeze({ id, ...def });
  return SKILL_BEHAVIORS[id];
}
export function registerSkillBehaviors(map) {
  for (const [id, def] of Object.entries(map || {})) defineSkillBehavior(id, def);
}

// poderes y comportamientos actuales (migrados de los `powers.has` dispersos)
registerPowers(commonPowers());
registerSkillBehaviors(commonBehaviors());
registerSkillBehaviors(GUERRERO_SKILL_BEHAVIORS);
registerSkillBehaviors(MAGA_SKILL_BEHAVIORS);
registerSkillBehaviors(ARQUERA_SKILL_BEHAVIORS);
// Paso 2c (módulos por clase): poderes de talento, comportamientos de sus activas,
// campos de suelo e indicadores nuevos; después, los poderes gauge_<id> de TODOS
// los indicadores (los 9 base de spec-mechanics + los nuevos de cada clase)
for (const [powers, behaviors, fields, gauges] of [
  [guerreroPowers, guerreroSkillBehaviors, guerreroFields, guerreroGauges],
  [magaPowers, magaSkillBehaviors, magaFields, magaGauges],
  [arqueraPowers, arqueraSkillBehaviors, arqueraFields, arqueraGauges],
]) {
  registerPowers(powers());
  registerSkillBehaviors(behaviors());
  for (const [kind, def] of Object.entries(fields() || {})) defineField(kind, def);
  registerGauges(gauges());
}
registerPowers(gaugePowers());
