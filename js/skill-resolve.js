// ============================================================
// RESOLVEDOR ÚNICO de habilidades (módulo PURO) — Paso 2b.0, docs/paso2-diseno.md §4
// ============================================================
// resolveSkill(p, sk) fusiona, en este orden y todo ADITIVO dentro de su clave:
//   1. definición base (sk, de js/skills-<clase>.js)
//   2. ramas elegidas (SKILL_MODS → aggregateSkillMods)
//   3. talentos (p.talentAgg.mods[sk.id] + skillLv) — los rellena el Paso 2c
//   4. soportes engarzados compatibles (por tags) → tabla SUPPORT_MOD
//   5. valores globales del héroe (stats.cdr, tv.costRed / costRedBig)
//   6. poderes (② modifyResolve) y topes de combat-math (CDR 50; crítico al tirar)
// y devuelve el PERFIL COMPLETO del lanzamiento, cacheado en p.resolved[sk.id]
// (Player.recompute lo invalida). Lo usan el canal de lanzamiento
// (js/game-skills.js), Player.basicAttack, el banco de balance y la UI.
import { CAPS, rankCoef, rankBuff } from './combat-math.js';
import { CLASSES, SKILL_MODS, SUPPORTS, aggregateSkillMods } from './data.js';
import { CAT_SLOTS, SLOT_KEYS, GCD_CATS, RANK_MAX, TAGS, supportFits, supportSockets, skillSlots, mergeMods, defaultSlots } from './skill-defs.js';
import { firePower } from './powers.js';

export { CAT_SLOTS, SLOT_KEYS, TAGS, RANK_MAX, supportFits, supportSockets, skillSlots, defaultSlots };

export const GCD = 0.2;                 // enfriamiento global entre gastadoras (§4.4)
export const TALENT_SKILL_REQ = 10;     // las activas de talento usan req = 10 (§4.1)
export const BIG_HIT_INTERRUPT = 0.10;  // un golpe > 10 % de la vida interrumpe (canalizaciones/Int.)

// Efecto de cada soporte como `mod` (sustituye a los has('x') dispersos del lanzamiento).
// Mismas cifras que el Paso 1A (combat-math SUPPORT_ADD/SUPPORT_COST/SUPPORT_CDR/SUPPORT_CRIT).
// costMul/radius son las únicas claves propias de los soportes.
export const SUPPORT_MOD = Object.freeze({
  amplify:      { dmg: 30 },
  overcharge:   { dmg: 50, costMul: 1.4 },
  concentrated: { dmg: 35, radius: -30 },
  focused:      { crit: 25 },
  freeze:       { slow: 3 },
  coldblood:    { coldblood: true },
  multi:        { proj: 2 },
  pierce:       { pierce: true },
  chain:        { chain: 2, pierce: true },
  wide:         { radius: 45 },
  echo:         { echo: 0.5, costMul: 1.6 },
  bleed:        { dot: 'bleed' },
  poison:       { dot: 'poison' },
  lasting:      { dur: 80, dotMul: 0.5 },
  efficient:    { costMul: 0.65 },
  swift:        { cdr: 30 },
});
const DOT_PRIORITY = ['poison', 'bleed', 'burn'];

// ---------- rangos y habilidades conocidas (§4.1) ----------
// rangoBase = clamp(1 + ⌊(nivel − req)/8⌋, 1, 5)
export function rankBase(level, req) {
  return Math.max(1, Math.min(RANK_MAX, 1 + Math.floor(((level || 1) - (req || 1)) / 8)));
}
function skillReq(sk) { return sk.kind === 'talent' ? TALENT_SKILL_REQ : (sk.req || 1); }
// rango = base(nivel, req) + talentos.skillLv[id] + stats.skillLv[id] (equipo, Paso 4)
export function skillRank(p, sk) {
  if (!p || !sk) return 0;
  const base = rankBase(p.level, skillReq(sk));
  const tal = p.talentAgg?.skillLv?.[sk.id] || 0;
  const eq = p.stats?.skillLv?.[sk.id] || 0;
  return base + tal + eq;
}
// ¿la conoce? Base: nivel ≥ req. De talento: concedida por p.talentAgg.grants.
export function isKnown(p, sk) {
  if (!p || !sk) return false;
  if (sk.kind === 'talent') return !!p.talentAgg?.grants?.has?.(sk.id);
  return (p.level || 1) >= (sk.req || 1);
}
export function knownSkills(p) {
  const cls = p?.cls || CLASSES[p?.classId];
  return (cls?.skills || []).filter(sk => isKnown(p, sk));
}
// mapa id → rango de las habilidades conocidas (lo deja Player.recompute en p.skills)
export function knownRankMap(p) {
  const out = {};
  for (const sk of knownSkills(p)) out[sk.id] = skillRank(p, sk);
  return out;
}

// soportes engarzados válidos de una habilidad (compatibles por tags y dentro de sus huecos)
export function validSupports(p, sk) {
  const raw = p?.supports?.[sk.id];
  const list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? [raw] : []);
  const out = [];
  for (const id of list) {
    if (!id || out.includes(id)) continue;
    const sup = SUPPORTS.find(s => s.id === id);
    if (sup && supportFits(sup, sk)) out.push(id);
    if (out.length >= supportSockets(sk)) break;
  }
  return out;
}

// ---------- resolveSkill ----------
export function resolveSkill(p, sk) {
  if (!p || !sk) return null;
  const cache = p.resolved || (p.resolved = {});
  if (cache[sk.id]) return cache[sk.id];
  const prof = computeProfile(p, sk);
  cache[sk.id] = prof;
  return prof;
}
// mismo perfil para un id de la clase del héroe
export function resolveSkillId(p, id) {
  const sk = (p?.cls?.skills || []).find(s => s.id === id);
  return sk ? resolveSkill(p, sk) : null;
}

function computeProfile(p, sk) {
  const rank = skillRank(p, sk);
  // 2) ramas  3) talentos
  const mods = aggregateSkillMods(sk.id, p.skillMods?.[sk.id]);
  if (p.talentAgg?.mods?.[sk.id]) mergeMods(mods, p.talentAgg.mods[sk.id]);
  // 4) soportes (por tags) → mod
  const sups = validSupports(p, sk);
  let costMul = 1, dotMul = 1;
  for (const id of sups) {
    const m = SUPPORT_MOD[id]; if (!m) continue;
    if (m.costMul) costMul *= m.costMul;
    if (m.dotMul) dotMul += m.dotMul;
    const rest = { ...m }; delete rest.costMul; delete rest.dotMul; delete rest.echo;
    mergeMods(mods, rest);
  }
  const supEcho = sups.includes('echo') ? SUPPORT_MOD.echo.echo : 0;
  const tv = p.tv || p.talentAgg?.tv || {};
  const st = p.stats || {};
  const isBasic = sk.cat === 'basic';
  const tags = new Set(sk.tags || []);
  if (sk.cat) tags.add(sk.cat);
  if (sk.elem) tags.add(sk.elem);
  if (mods.dot) tags.add('dot');

  // coste: sk.cost × Π soportes × (1 − costRed/100) × (1 + mod.cost/100); costRedBig si supera el umbral
  let cost = isBasic ? 0 : (sk.cost || 0) * costMul;
  let costRed = tv.costRed || 0;
  if (tv.costRedBig && (sk.cost || 0) > (tv.costRedBig.over || 0)) costRed += tv.costRedBig.pct || 0;
  cost *= Math.max(0, 1 - costRed / 100) * Math.max(0, 1 + (mods.cost || 0) / 100);
  // multiplicador de coste por BUFF (stat spenderCostPct, p. ej. Furia Inmortal −100 =
  // gastadoras gratis): solo a las gastadoras (incluidas las de especialización)
  if (tags.has('spender') && st.spenderCostPct) cost *= Math.max(0, 1 + st.spenderCostPct / 100);
  cost = Math.max(0, Math.round(cost));

  // enfriamiento: UN número de CDR (stat + ramas + soportes), tope CAPS.cdr
  const cdrPts = Math.max(-100, Math.min(CAPS.cdr, (st.cdr || 0) + (mods.cdr || 0)));
  const cd = Math.max(0, (sk.cd || 0) * (1 - cdrPts / 100));

  const radiusMul = Math.max(0.2, 1 + (mods.radius || 0) / 100);
  const rangeMul = Math.max(0.2, 1 + (mods.range || 0) / 100);
  const buffMul = rankBuff(rank) * Math.max(0, 1 + (mods.buff || 0) / 100);
  const durMul = Math.max(0.1, 1 + (mods.dur || 0) / 100);
  const buff = {};
  for (const [k, v] of Object.entries(sk.buff || {})) buff[k] = Math.round(v * buffMul);
  // DoT: prioridad veneno > sangrado > quemadura (como antes); soporte o rama
  let dot = null;
  const dotCand = new Set([mods.dot, ...sups.map(s => SUPPORT_MOD[s]?.dot)].filter(Boolean));
  for (const k of DOT_PRIORITY) if (dotCand.has(k)) { dot = k; break; }

  const prof = {
    id: sk.id, name: sk.name, rank, tags, elem: sk.elem || null, cat: sk.cat, slots: skillSlots(sk),
    type: sk.type, behavior: sk.behavior || null, kind: sk.kind,
    // daño
    coef: (sk.coef || 0) * rankCoef(rank),
    addPct: (sk.addPct || 0) + (mods.dmg || 0),
    critBonus: (sk.critBonus || 0) + (mods.crit || 0),
    // coste, tiempos
    cost, cd, cdBase: sk.cd || 0, cdrPts,
    gcd: GCD_CATS.has(sk.cat),
    windup: sk.windup || 0, lockT: sk.lockT || 0, impactDelay: sk.impactDelay || 0,
    interruptible: !!sk.int,
    // geometría
    radiusMul, radius: (sk.radius || 0) * radiusMul, range: (sk.range || 0) * rangeMul, rangeMul,
    angle: sk.angle || 90, width: sk.width || 2, speed: sk.speed || 14,
    count: Math.max(1, Math.floor(sk.count || 1)), spread: sk.spread || 0,   // 0 = sin abanico propio (extras a 0,18 rad)
    proj: mods.proj || 0, pierce: !!(sk.pierce || mods.pierce), chain: mods.chain || 0,
    // control y efectos al golpear
    slow: Math.max(sk.slow || 0, mods.slow || 0), slowPct: Math.max(sk.slowPct || 0, mods.slowPct || 0),
    stun: Math.max(sk.stun || 0, mods.stun || 0), root: Math.max(sk.root || 0, mods.root || 0),
    vuln: mods.vuln || 0, dot, dotMul,
    zone: mods.zone || 0, zoneDur: 4 + (mods.zoneDur || 0),
    echo: supEcho || (mods.echo ? 0.6 : 0), execute: mods.execute || 0, cdhit: mods.cdhit || 0,
    critCdr: mods.critCdr || 0, lifesteal: mods.lifesteal || 0, coldblood: !!mods.coldblood,
    haste: mods.haste || 0, cleanse: !!mods.cleanse,
    // recurso que genera: básicos al ACERTAR (+extra por objetivo); resto AL LANZAR
    // (sk.gen de la habilidad + ramas Furibundo/Iracundo) y genOnHit si golpea
    gen: (sk.gen || 0) + (mods.gen || 0),
    genPerExtra: isBasic ? (sk.genPerExtra || 0) : 0, genMax: isBasic ? (sk.genMax || 0) : 0,
    genOnHit: isBasic ? 0 : (sk.genOnHit || 0),
    cadence: isBasic ? Math.max(0.2, sk.cadence || 1) : 1,   // × cadencia del básico (Mandoble 1,5)
    // salpicadura de un proyectil (coef por objetivo en `radius` alrededor del impacto)
    splash: (sk.splash || 0) * rankCoef(rank),
    // DoT propio al impactar (Cicuta): total = golpe medio × coef (escala con rango y saco aditivo)
    hitDot: sk.hitDot ? { kind: sk.hitDot.kind || 'poison', coef: (sk.hitDot.coef || 0) * rankCoef(rank) * dotMul, dur: sk.hitDot.dur || 4 } : null,
    bossStun: sk.bossStun !== false,            // false: el aturdimiento no afecta a jefes (stagger en 2c)
    unstoppable: !!sk.unstoppable, slowImmune: !!sk.slowImmune,
    // buffs / escudos / duraciones
    buff, buffMul, durMul, durS: mods.durS || 0,
    dur: Math.max(0, (sk.dur || 0) * durMul + (mods.durS || 0)),
    // poderes que reaccionan al golpe de esta habilidad (los rellenan modifyResolve)
    onHitPowers: [],
    sups, mods,
  };
  // ② poderes que modifican el perfil (multidisparo, talentos de 2c…)
  firePower('modifyResolve', p, p, sk, prof);
  prof.cost = Math.max(0, Math.round(prof.cost));
  prof.cd = Math.max(0, prof.cd);
  return prof;
}

// Enfriamiento con Masacre (golpear a cdhit o más): +25 puntos de CDR, tope CAPS.cdr
export const MASSACRE_CDR = 25;
export function cooldownWithMassacre(prof) {
  const c = Math.max(-100, Math.min(CAPS.cdr, prof.cdrPts + MASSACRE_CDR));
  return Math.max(0, prof.cdBase * (1 - c / 100));
}

// ¿puede ir esta habilidad en esta ranura? (assignHotbar, migración, UI)
export function fitsSlot(sk, slot) {
  return !!sk && SLOT_KEYS.includes(slot) && skillSlots(sk).includes(slot);
}

// texto corto de lo que hace el perfil (UI/tooltips): número FINAL, no el base
export function profileSummary(prof) {
  if (!prof) return '';
  const parts = [];
  if (prof.coef > 0) parts.push(`Daño ${Math.round(prof.coef * (1 + prof.addPct / 100) * 100)}%`);
  if (Object.keys(prof.buff).length) parts.push(Object.entries(prof.buff).map(([k, v]) => `+${v} ${k}`).join(', ') + (prof.dur ? ` (${prof.dur.toFixed(1)}s)` : ''));
  if (prof.cost) parts.push(`Coste ${prof.cost}`);
  if (prof.cd) parts.push(`Enfr. ${prof.cd.toFixed(1)}s`);
  if (prof.radius) parts.push(`Radio ${prof.radius.toFixed(1)}m`);
  const n = prof.count + prof.proj;
  if (prof.tags.has('proj') && n > 1) parts.push(`${n} proyectiles`);
  return parts.join(' · ');
}
