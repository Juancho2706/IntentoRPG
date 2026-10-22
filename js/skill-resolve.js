// ============================================================
// RESOLVEDOR ÚNICO de habilidades (módulo PURO) — Paso 2b.0, docs/paso2-diseno.md §4
// ============================================================
// resolveSkill(p, sk) fusiona, en este orden y todo ADITIVO dentro de su clave
// (Paso 2, docs/paso2-implementacion.md §3.5):
//   1. rango (nivel + talentos + equipo)
//   2. FORJA de la DEFINICIÓN (forgedDef: set/add/mul/elem/tags de Mejora y variante;
//      tags recalculados → soportes y selectores de talento ven la forma nueva)
//   3. mods de la forja (Mejora si Nv ≥ req+3, variante si Nv ≥ req+6)
//   4. talentos (p.talentAgg.mods[sk.id]: los selectores se expanden sobre la definición forjada;
//      los '@windup' de los pasos de combo, aparte en prof.windupMods: comboWindupMods)
//   5. soportes engarzados compatibles con los tags FORJADOS → tabla SUPPORT_MOD
//   6. valores globales del héroe (stats.cdr, tv.costRed / costRedBig, stats.spenderCostPct /
//      costPct, stats.skillSpeedPct, talentos de DoT en hitDot)
//   7. poderes (② modifyResolve) y topes de combat-math (CDR 50; crítico al tirar)
// y devuelve el PERFIL COMPLETO del lanzamiento (con `prof.def`, la definición forjada,
// y las claves de verbo de §3.6 ya resueltas), cacheado en p.resolved[sk.id]
// (Player.recompute lo invalida). Lo usan el canal de lanzamiento (js/game-skills.js),
// Player.basicAttack, el banco de balance y la UI.
import { CAPS, rankCoef, rankBuff } from './combat-math.js';
import { CLASSES, SUPPORTS, SKILL_FORGE, SPEC_BAR } from './data.js';
import { CAT_SLOTS, SLOT_KEYS, GCD_CATS, RANK_MAX, TAGS, supportFits, supportSockets, skillSlots, mergeMods, defaultSlots,
  forgeDef, forgeMods, forgeLevels, forgeVar, VERB_DEFAULTS, rankTextApply } from './skill-defs.js';
import { firePower, SKILL_BEHAVIORS } from './powers.js';
import { talentTreesFor, activeSpec, activeHeroTree, nodeFx, scaleFx, TALENT_RULES } from './talents.js';

export { CAT_SLOTS, SLOT_KEYS, TAGS, RANK_MAX, supportFits, supportSockets, skillSlots, defaultSlots };

export const GCD = 0.2;                 // enfriamiento global entre principales (§4.4)
export const BIG_HIT_INTERRUPT = 0.10;  // un golpe > 10 % de la vida interrumpe (canalizaciones/Int./cargas)

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
// nivel desde el que CUENTA el rango (S0, M-10): el `req` del catálogo (también en las activas de
// talento) y, en el kit de una especialización (`spec`), desde que se abre la especialización
// (TALENT_RULES.specAt): lo nuevo no pega menos que el kit base que sustituye (con req 14–15 iba dos
// rangos por detrás de la Bola de Fuego entre el Nv14 y el 37)
export function rankReq(sk) {
  const req = sk?.req || 1;
  return sk?.spec ? Math.min(req, TALENT_RULES.specAt) : req;
}
// rango = base(nivel, rankReq) + talentos.skillLv[id] + stats.skillLv[id] (equipo, Paso 4)
export function skillRank(p, sk) {
  if (!p || !sk) return 0;
  const base = rankBase(p.level, rankReq(sk));
  const tal = p.talentAgg?.skillLv?.[sk.id] || 0;
  const eq = p.stats?.skillLv?.[sk.id] || 0;
  return base + tal + eq;
}
// especialización ACTIVA (la del agregado de talentos: solo cuenta a partir del Nv10)
function activeSpecId(p) {
  if (p?.talentAgg) return p.talentAgg.spec || null;
  return p?.talents?.spec || null;
}
// ¿la conoce? Base: nivel ≥ req. De talento: concedida por p.talentAgg.grants.
// D7: el kit de una especialización (`sk.spec`) solo con ESA especialización activa.
export function isKnown(p, sk) {
  if (!p || !sk) return false;
  if (sk.kind === 'talent') return !!p.talentAgg?.grants?.has?.(sk.id);
  if (sk.spec && sk.spec !== activeSpecId(p)) return false;
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

// ---------- forja (§3.5, D3) ----------
// entrada de forja de una habilidad: la de la clase del héroe (cls.forge) o la fusión global
export function forgeEntry(p, sk) {
  if (!sk || sk.kind === 'talent') return null;
  const cls = p?.cls || CLASSES[p?.classId];
  return cls?.forge?.[sk.id] || SKILL_FORGE[sk.id] || null;
}
// estado de la forja: Mejora activa (Nv ≥ req+3), variante elegida y abierta (Nv ≥ req+6).
// chosen = lo guardado ('i' | 'ii' | null; undefined = nunca elegida, D3)
export function forgeState(p, sk) {
  const entry = forgeEntry(p, sk);
  const levels = forgeLevels(sk);
  const chosen = p?.skillForge?.[sk?.id];
  if (!entry) return { entry: null, mejora: false, variant: null, chosen, levels };
  const L = p?.level || 1;
  const mejora = !!entry.mejora && L >= levels.mejora;
  const variant = (chosen === 'i' || chosen === 'ii') && L >= levels.vars && forgeVar(entry, chosen) ? chosen : null;
  return { entry, mejora, variant, chosen, levels };
}
// definición FORJADA (caché p.forged[id], la vacía Player.recompute cuando cambian nivel o forja)
export function forgedDef(p, sk) {
  if (!p || !sk) return sk;
  const st = forgeState(p, sk);
  if (!st.entry || (!st.mejora && !st.variant)) return sk;
  const key = `${st.mejora ? 1 : 0}:${st.variant || ''}`;
  const cache = p.forged || (p.forged = {});
  const c = cache[sk.id];
  if (c && c.src === sk && c.key === key) return c.def;
  const def = forgeDef(sk, st.entry, st);
  cache[sk.id] = { src: sk, key, def };
  return def;
}

// soportes engarzados válidos de una habilidad (compatibles con sus tags FORJADOS y
// dentro de sus huecos)
export function validSupports(p, sk) {
  const raw = p?.supports?.[sk.id];
  const list = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? [raw] : []);
  const def = p ? forgedDef(p, sk) : sk;
  const out = [];
  for (const id of list) {
    if (!id || out.includes(id)) continue;
    const sup = SUPPORTS.find(s => s.id === id);
    if (sup && supportFits(sup, def)) out.push(id);
    if (out.length >= supportSockets(def)) break;
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

// distancia de un `pull` (número o { dist, to, radius, boss })
const pullDist = v => (typeof v === 'number' ? v : (v?.dist || 0));
// DoT propio al golpear (hitDot) con los talentos de DoT del héroe, como el perfil central
// (combat-math.dotProfile): +% de dotPct y <tipo>Pct al total; +s de dotDur, bleedDur y burnDur
// alargan con el MISMO daño por segundo (el coef crece en proporción a la duración)
function resolveHitDot(hd, rank, dotMul, tv) {
  const kind = hd.kind || 'poison';
  const dur0 = hd.dur || 4;
  const pct = (tv.dotPct || 0) + (tv[`${kind}Pct`] || 0);
  const extra = (tv.dotDur || 0) + (kind === 'bleed' ? (tv.bleedDur || 0) : 0) + (kind === 'burn' ? (tv.burnDur || 0) : 0);
  const dur = Math.max(0.5, dur0 + extra);
  const coef = (hd.coef || 0) * rankCoef(rank) * dotMul * Math.max(0, 1 + pct / 100) * dur / dur0;
  return { kind, coef, dur };
}
// talentos '@windup' de los PASOS de combo con preparación (Golpe Pesado / Sin Pausa sobre el
// golpe descendente de Rajar). aggregateTalents expande el selector a las habilidades con
// preparación PROPIA (def.windup); un combo sin ella y con algún paso preparado recibe aquí,
// aparte, los mods '@windup' de los nodos activos, que _makeCtx aplica SOLO a esos pasos. Con las
// reglas del agregado: rango efectivo (agg.ranks; el árbol héroe, solo con el Paragon abierto),
// la opción escogida (o la A) y scaleFx. Fuente única: talents.js no escribe '<id>@windup'; esa
// clave de talentAgg.mods solo llega de p.talentExtra (tests) y se suma.
function comboWindupMods(p, id, def) {
  if (def.type !== 'combo' || (def.windup || 0) > 0 || !def.steps?.some(s => (s?.windup || 0) > 0)) return null;
  const agg = p.talentAgg;
  const out = mergeMods({}, agg?.mods?.[`${id}@windup`]);
  const trees = agg?.ranks ? talentTreesFor(p.classId) : null;
  if (trees) {
    const T = p.talents || {};
    const s = activeSpec(p);
    const h = s && agg.heroOpen ? activeHeroTree(p) : null;
    const groups = [[trees.cls?.nodes, T.choice], [s?.nodes, T.choice], [h?.nodes, T.hero?.[s?.id]?.choice?.[h?.id]]];
    for (const [nodes, choice] of groups) {
      for (const n of nodes || []) {
        const r = agg.ranks[n.id] | 0;
        const m = r > 0 ? nodeFx(n, choice?.[n.id])?.mod?.['@windup'] : null;
        if (!m) continue;
        const scaled = {};
        for (const [k, v] of Object.entries(m)) scaled[k] = scaleFx(v, r);
        mergeMods(out, scaled);
      }
    }
  }
  return Object.keys(out).length ? out : null;
}
// carga resuelta (§3.6): ventana con perfectWin/perfectEarly, velocidad con chargeSpeed
function resolveCharge(def, mods, moveMul, p) {
  const c = def.charge;
  if (!c) return null;
  const max = Math.max(0.05, c.max || 1);
  const min = Math.min(max * 0.95, Math.max(0, c.min ?? VERB_DEFAULTS.chargeMin));
  let [a, b] = Array.isArray(c.perfect) ? c.perfect : [max - 0.05 - VERB_DEFAULTS.perfectWin, max - 0.05];
  // Fe Serena: la ventana se ensancha por los dos lados (si choca con el tope, crece hacia atrás)
  const widen = mods.perfectWin || 0;
  if (widen) { a -= widen / 2; b += widen / 2; if (b > max) { a -= b - max; b = max; } }
  // Aureola: la ventana empieza antes
  const early = mods.perfectEarly || 0;
  if (early) { a -= early; b -= early; }
  a = Math.max(min, a); b = Math.max(a + 0.01, Math.min(max, b));
  const speedPct = (mods.chargeSpeed || 0) + (def.cat === 'basic' ? 0 : (p?.tv?.chargeSpeed || 0));
  return {
    min, max, perfect: [a, b],
    perfectPct: (c.perfectPct || 0) + (mods.perfectPct || 0),
    perfectCrit: !!c.perfectCrit,
    scale: c.scale || null,
    moveMul: Math.max(mods.moveMulMin || 0, (c.moveMul ?? moveMul) + (mods.moveMulAdd || 0) / 100),
    autoRelease: c.autoRelease !== false,
    instant: !!c.instant,
    // por debajo de markMin (s) la suelta no gasta las marcas firstCharged ni fuerza el perfecto
    markMin: Math.max(0, c.markMin || 0),
    // un `min` DECLARADO (> 0) es tensado mínimo: soltar antes no dispara (cancela sin coste). Sin
    // declararlo (el de VERB_DEFAULTS), un toque dispara al mínimo como siempre; con min 0, también
    minHold: (c.min || 0) > 0,
    repeat: c.repeat ?? def.cat === 'basic',
    perfectGauge: c.perfectGauge || null,
    full: c.full || null,
    speed: Math.max(0.1, 1 + speedPct / 100),
  };
}

// potencia de los buffs, escudos y curas de una habilidad: rango (combat-math.rankBuff, +6 %/rango)
// × mods.buff de la forja y los talentos
export function buffMulOf(rank, mods = null) {
  return rankBuff(rank) * Math.max(0, 1 + (mods?.buff || 0) / 100);
}

function computeProfile(p, sk) {
  // 2) forja de la definición · 3) mods de forja · 4) talentos
  const fst = forgeState(p, sk);
  const def = forgedDef(p, sk);
  const rank = skillRank(p, def);
  const mods = forgeMods(fst.entry, fst);
  if (p.talentAgg?.mods?.[sk.id]) mergeMods(mods, p.talentAgg.mods[sk.id]);
  // 5) soportes (por tags forjados) → mod
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
  const isBasic = def.cat === 'basic';
  const tags = new Set(def.tags || []);
  if (def.cat) tags.add(def.cat);
  if (def.elem) tags.add(def.elem);
  if (mods.dot) tags.add('dot');

  // coste: def.cost × Π soportes × (1 − costRed/100) × (1 + mod.cost/100); costRedBig si supera el umbral
  let cost = isBasic ? 0 : (def.cost || 0) * costMul;
  let costRed = tv.costRed || 0;
  if (tv.costRedBig && (def.cost || 0) > (tv.costRedBig.over || 0)) costRed += tv.costRedBig.pct || 0;
  cost *= Math.max(0, 1 - costRed / 100) * Math.max(0, 1 + (mods.cost || 0) / 100);
  // multiplicador de coste por BUFF (stat spenderCostPct, p. ej. Furia Inmortal −100 =
  // principales gratis): solo a las principales (incluidas las de especialización)
  if (tags.has('spender') && st.spenderCostPct) cost *= Math.max(0, 1 + st.spenderCostPct / 100);
  // stat costPct (negativo abarata): TODAS las habilidades con coste (Sello del Archimago: «tus
  // hechizos»), aparte de spenderCostPct y multiplicando con él
  if (st.costPct) cost *= Math.max(0, 1 + st.costPct / 100);
  cost = Math.max(0, Math.round(cost));

  // enfriamiento: UN número de CDR (stat + forja/talentos + soportes), tope CAPS.cdr
  const cdrPts = Math.max(-100, Math.min(CAPS.cdr, (st.cdr || 0) + (mods.cdr || 0)));
  const cd = Math.max(0, (def.cd || 0) * (1 - cdrPts / 100));

  const radiusMul = Math.max(0.2, 1 + (mods.radius || 0) / 100);
  const rangeMul = Math.max(0.2, 1 + (mods.range || 0) / 100);
  const buffMul = buffMulOf(rank, mods);
  const durMul = Math.max(0.1, 1 + (mods.dur || 0) / 100);
  const buff = {};
  for (const [k, v] of Object.entries(def.buff || {})) buff[k] = Math.round(v * buffMul);
  // DoT: prioridad veneno > sangrado > quemadura (como antes); soporte o forja/talento
  let dot = null;
  const dotCand = new Set([mods.dot, ...sups.map(s => SUPPORT_MOD[s]?.dot)].filter(Boolean));
  for (const k of DOT_PRIORITY) if (dotCand.has(k)) { dot = k; break; }

  // ---- verbos (§3.6) ----
  // velocidad de habilidades (stat skillSpeedPct, Sangre Hirviente): acorta la preparación, el tic
  // de los canales y la duración de avances y saltos; los enfriamientos no
  const skillSpeed = Math.max(0.1, 1 + (st.skillSpeedPct || 0) / 100);
  // preparación: (windup + windupAdd) × (1 + windupMul/100) / velocidad; moverse: moveMul (D8: 1 por defecto)
  const windup = Math.max(0, ((def.windup || 0) + (mods.windupAdd || 0)) * Math.max(0, 1 + (mods.windupMul || 0) / 100)) / skillSpeed;
  const moveMul = Math.max(mods.moveMulMin || 0, (def.moveMul ?? 1) + (mods.moveMulAdd || 0) / 100);
  // los comportamientos con cast propio gestionan sus desplazamientos de la DEFINICIÓN
  // (Onda Repulsora, Arpón…); los mods (forja/talentos) sí van por la vía genérica
  const ownCast = !!(def.behavior && SKILL_BEHAVIORS[def.behavior]?.cast);
  const recast = def.recast && def.recast.n ? {
    n: Math.max(1, Math.floor(def.recast.n + (mods.recastAdd || 0))),
    win: Math.max(0.1, (def.recast.win || 2) + (mods.recastWin || 0)),
    cond: def.recast.cond || null, perfectLast: def.recast.perfectLast || 0,
    cdFrom: def.recast.cdFrom || 'first', free: def.recast.free !== false, gap: def.recast.gap ?? VERB_DEFAULTS.recastGap,
  } : null;
  const repeat = def.repeat ? { ...def.repeat, n: Math.max(0, Math.floor((def.repeat.n || 0) + (mods.repeatAdd || 0))) } : null;
  // estela de un avance: zoneDur de los talentos SUMA segundos a la suya («duran r s más»)
  const trail = def.trail ? { ...def.trail, coef: (def.trail.coef || 0) + (mods.zoneCoef || 0), heal: (def.trail.heal || 0) + (mods.zoneHeal || 0),
    dur: Math.max(0.5, (def.trail.dur || 4) + (mods.zoneDur || 0)) } : null;
  // arrastre: solo si la DEFINICIÓN arrastra (drag o dragWidth propio; drag:false lo apaga). El
  // dragWidth de un talento ensancha el de la definición, no lo enciende (Gran Arrastre y Carga Veloz)
  const drags = def.drag !== false && (!!def.drag || (def.dragWidth || 0) > 0);
  const mark = def.mark ? { ...def.mark, dur: (def.mark.dur || 8) + (mods.markDur || 0) } : null;
  const shieldGain = def.shieldGain || mods.shieldGain
    ? [(def.shieldGain?.[0] || 0) + (mods.shieldGain?.[0] || 0), Math.max(def.shieldGain?.[1] || 0, mods.shieldGain?.[1] || 0)] : null;

  const prof = {
    id: sk.id, name: def.name, rank, tags, elem: def.elem || null, cat: def.cat, slots: skillSlots(def),
    type: def.type, behavior: def.behavior || null, kind: def.kind,
    // definición forjada y estado de la forja (UI, comportamientos y poderes leen la forma real)
    def, variant: fst.variant, mejora: fst.mejora,
    // daño
    coef: (def.coef || 0) * rankCoef(rank),
    addPct: (def.addPct || 0) + (mods.dmg || 0),
    critBonus: (def.critBonus || 0) + (mods.crit || 0),
    dmgDirect: (def.dmgDirect || 0) + (mods.dmgDirect || 0),   // +% al golpe DIRECTO (no salpicadura)
    // coste, tiempos
    cost, cd, cdBase: def.cd || 0, cdrPts,
    gcd: GCD_CATS.has(def.cat),
    windup, lockT: def.lockT || 0, impactDelay: def.impactDelay || 0, skillSpeed,
    // mods de talento '@windup' para los PASOS de combo con preparación (comboWindupMods)
    windupMods: comboWindupMods(p, sk.id, def),
    interruptible: !!def.int,
    moveMul,
    // geometría
    radiusMul, radius: (def.radius || 0) * radiusMul, range: (def.range || 0) * rangeMul, rangeMul,
    angle: def.angle || 90, width: def.width || 2, speed: def.speed || 14,
    count: Math.max(1, Math.floor(def.count || 1)), spread: def.spread || 0,   // 0 = sin abanico propio (extras a 0,18 rad)
    proj: mods.proj || 0, pierce: !!(def.pierce || mods.pierce), chain: Math.max(def.chain || 0, mods.chain || 0), chainPct: def.chainPct || 0,
    perTarget: Math.max(1, def.perTarget || 1),
    // control y efectos al golpear
    // root/slowPct = MÁXIMO entre la habilidad y los mods + los «+N» de talento (rootAdd/slowPctAdd)
    slow: Math.max(def.slow || 0, mods.slow || 0), slowPct: Math.max(def.slowPct || 0, mods.slowPct || 0) + (mods.slowPctAdd || 0),
    stun: Math.max(def.stun || 0, mods.stun || 0), root: Math.max(def.root || 0, mods.root || 0) + (mods.rootAdd || 0),
    vuln: mods.vuln || 0, dot, dotMul,
    // desplazar (§3.6): m de atracción / empuje y hacia dónde. pull.radius: radio de la atracción
    // por tic de un canal (por defecto, el del daño); pull.boss:false no atrae a los jefes
    pull: Math.max(ownCast ? 0 : pullDist(def.pull), mods.pull || 0), pullTo: (typeof def.pull === 'object' && def.pull?.to) || null,
    pullRadius: (typeof def.pull === 'object' && def.pull?.radius) || 0,
    pullBoss: !(typeof def.pull === 'object' && def.pull?.boss === false),
    knock: Math.max(ownCast ? 0 : (def.knock || 0), mods.knock || 0),
    dragWidth: drags ? Math.max(def.dragWidth || (def.drag ? VERB_DEFAULTS.dragWidth : 0), mods.dragWidth || 0) : 0,
    taunt: (def.taunt || 0) + (mods.taunt || 0),
    // zona (Estela): 4 s por defecto; zoneDur = duración EXPLÍCITA (s) cuando la da un
    // talento (Pira 1,5 s/rango, Abrojos 2 s/rango: «el texto del nodo manda», §9.3).
    // zonePct = daño por segundo de la Estela en % del ARMA (escala con el rango, como el coef);
    // sin él, el 45 % del golpe de siempre
    zone: mods.zone || 0, zoneDur: (mods.zoneDur || 0) > 0 ? mods.zoneDur : 4,
    zonePct: Math.max(0, (def.zonePct || 0) + (mods.zonePct || 0)),
    zoneMax: Math.max(def.zoneMax || 0, mods.zoneMax || 0),
    // detonar (§3.6): el coef de los estallidos escala con el rango de la habilidad (× rankCoef,
    // UNA vez: game-skills pasa este perfil a detonateAt y field-entities no lo reescala)
    detonate: def.detonate ? { ...def.detonate, coef: (def.detonate.coef ?? 1) * rankCoef(rank) } : null,
    echo: supEcho || (mods.echo ? 0.6 : 0), execute: mods.execute || 0, cdhit: mods.cdhit || 0,
    critCdr: mods.critCdr || 0, lifesteal: mods.lifesteal || 0, coldblood: !!mods.coldblood,
    haste: mods.haste || 0, cleanse: !!mods.cleanse,
    killReset: !!(def.killReset || mods.killReset), shieldGain,
    // recurso que genera: básicos al ACERTAR (+extra por objetivo); resto AL LANZAR
    // (def.gen + forja/talentos) y genOnHit si golpea
    gen: (def.gen || 0) + (mods.gen || 0),
    genPerExtra: isBasic ? (def.genPerExtra || 0) : 0, genMax: isBasic ? (def.genMax || 0) : 0,
    genOnHit: isBasic ? 0 : (def.genOnHit || 0) + (mods.genOnHit || 0),
    cadence: isBasic ? Math.max(0.2, def.cadence || 1) : 1,   // × cadencia del básico (Mandoble 1,5)
    // salpicadura de un proyectil (coef por objetivo en `radius` alrededor del impacto)
    splash: (def.splash || 0) * rankCoef(rank) * Math.max(0, 1 + (mods.splashPct || 0) / 100),
    splashPct: mods.splashPct || 0,
    // DoT propio al impactar (Cicuta): total = golpe medio × coef (escala con rango, saco aditivo
    // y los talentos de DoT: dotPct/<tipo>Pct y dotDur/bleedDur/burnDur)
    hitDot: def.hitDot ? resolveHitDot(def.hitDot, rank, dotMul, tv) : null,
    // jefes (Paso 2c.0): todo control suma STAGGER; bossStun numérico = duración
    // nominal contra jefes (Martillo de Justicia) · stagger = stagger propio por golpe
    bossStun: typeof def.bossStun === 'number' ? def.bossStun : def.bossStun !== false,
    stagger: (def.stagger || 0) + (mods.stagger || 0),
    forceCrit: false,                           // crítico seguro (Ignición Total: modifyResolve)
    unstoppable: !!def.unstoppable, slowImmune: !!def.slowImmune,
    // buffs / escudos / duraciones
    buff, buffMul, durMul, durS: mods.durS || 0,
    dur: Math.max(0, (def.dur || 0) * durMul + (mods.durS || 0)),
    // verbos (§3.6) resueltos con sus mods
    charge: resolveCharge(def, mods, moveMul, p),
    recast,
    comboWin: Math.max(0.2, (def.comboWin ?? VERB_DEFAULTS.comboWin) + (mods.comboWin || 0)),
    charges: Math.max(1, Math.floor((def.charges || 1) + (mods.charges || 0))),
    repeat, trail, mark,
    // canal (S0): 1.er tic al empezar, coste por drenaje, sin bloqueo y rampa por tic (% al coef
    // del tic, combat-math.channelRampPct; los mods rampPerTic/rampMax suman puntos)
    tickNow: !!def.tickNow, drainCost: !!def.drainCost, nonBlocking: !!def.nonBlocking,
    ramp: def.rampPerTic > 0 && def.rampMax > 0
      ? { perTic: def.rampPerTic + (mods.rampPerTic || 0), max: def.rampMax + (mods.rampMax || 0) } : null,
    keepPlanted: !!(def.keepPlanted || mods.keepPlanted),
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

// ---------- barra de la especialización (S0, T1 · M-05) ----------
// Al aprender una habilidad del kit de la especialización ACTIVA (o al elegirla), la habilidad entra
// en SU ranura de <CLASE>_SPEC_BAR si esa ranura está vacía o tiene una del KIT BASE que el jugador
// no colocó a mano (p.hotbarManual[ranura] === id: la puso él con assignHotbar). Lo que el jugador
// eligió no se toca; la sustituida vuelve al libro. ids: solo esas habilidades (las recién
// aprendidas; null = todas las del kit). → [{ slot, id, from }] (from: la que sale o null)
export function specBarUpgrade(p, ids = null) {
  const spec = activeSpecId(p);
  const want = spec ? SPEC_BAR?.[spec]?.bar : null;
  if (!p || !want) return [];
  const hb = p.hotbar || (p.hotbar = {});
  const skills = p.cls?.skills || CLASSES[p.classId]?.skills || [];
  const byId = id => (id && skills.find(s => s.id === id)) || null;
  const manual = p.hotbarManual || {};
  const out = [];
  for (const slot of SLOT_KEYS) {
    const id = want[slot];
    const sk = byId(id);
    if (!sk || sk.spec !== spec || (ids && !ids.has(id)) || !isKnown(p, sk) || !fitsSlot(sk, slot)) continue;
    if (Object.values(hb).includes(id)) continue;
    const cur = hb[slot] || null;
    const curSk = byId(cur);
    // ranura libre, o con una del kit base (ni de especialización ni activa de talento) puesta sola
    const auto = !cur || (curSk && !curSk.spec && curSk.kind !== 'talent' && manual[slot] !== cur);
    if (!auto) continue;
    hb[slot] = id;
    if (manual[slot]) delete manual[slot];
    out.push({ slot, id, from: cur });
  }
  return out;
}
// aviso de una sustitución de la barra: «⚡ Rayo reemplaza a Bola de Fuego en 🖱️Der (cámbialo en
// el libro, T)»; si la ranura estaba libre, «⚡ Rayo va a 🖱️Der (…)». key = tecla del libro de
// habilidades (la del jugador: ui.actionKey('skills', 'T'))
export const BAR_SLOT_NAME = Object.freeze({ lmb: '🖱️Izq', rmb: '🖱️Der', k1: 'la ranura 1', k2: 'la ranura 2', k3: 'la ranura 3', k4: 'la ranura 4' });
export function specBarSwapText(p, swap, key = 'T') {
  const skills = p?.cls?.skills || CLASSES[p?.classId]?.skills || [];
  const sk = skills.find(s => s.id === swap?.id);
  const old = swap?.from ? skills.find(s => s.id === swap.from) : null;
  if (!sk) return '';
  const where = BAR_SLOT_NAME[swap.slot] || swap.slot;
  const head = `${sk.icon ? `${sk.icon} ` : ''}${sk.name}`;
  const tail = `(cámbialo en el libro, ${key || 'T'})`;
  return old ? `${head} reemplaza a ${old.name} en ${where} ${tail}` : `${head} va a ${where} ${tail}`;
}

// ---------- textos al rango (E5, X1; vocabulario: skill-defs, TEXTOS AL RANGO) ----------
// valor REAL de una fuente de rankText para la definición `def` con la potencia de buffs `buffMul`
// (null si la definición no tiene ese número: el trozo se queda como está)
export function rankTextValue(src, num, { def = null, buffMul = 1, rank = 1 } = {}) {
  if (src === '*') return num * buffMul;
  if (src === 'rank') return num * rankBuff(rank);
  const v = String(src).split('.').reduce((o, k) => (o == null ? undefined : o[k]), def);
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  // el buff y la reducción de una zona los redondea el juego (resolveSkill, GENERIC.zone)
  return src.startsWith('buff.') || src === 'allyDr' ? Math.round(v * buffMul) : v * buffMul;
}
// rango y potencia de buffs de una habilidad para sus textos: los del perfil (`prof`) o, sin él, los
// que tiene (o tendría, si aún no la conoce) por nivel, talentos, equipo y forja; sin escribir en la
// caché de resolveSkill (el panel de talentos lee con una sombra del héroe)
export function rankTextCtx(p, sk, prof = null) {
  if (prof) return { rank: prof.rank || 1, buffMul: prof.buffMul ?? 1 };
  const fst = forgeState(p, sk);
  const mods = forgeMods(fst.entry, fst);
  if (p?.talentAgg?.mods?.[sk.id]) mergeMods(mods, p.talentAgg.mods[sk.id]);
  const rank = Math.max(1, skillRank(p, sk));
  return { rank, buffMul: buffMulOf(rank, mods) };
}
// `text` de la habilidad `sk` con sus números de buff, escudo y cura al rango del héroe (rankText de la
// habilidad). Describe la habilidad BASE (con la Mejora si está abierta): una variante trae su propia
// línea, que se pasa con { map: v.rankText, def: la definición con esa variante }. Sin héroe o sin
// rankText, el texto tal cual
export function rankedText(p, sk, text, { prof = null, def = null, map = null } = {}) {
  const s = String(text ?? '');
  if (!p || !sk || !s) return s;
  const base = (p.cls?.skills || CLASSES[p.classId]?.skills || []).find(x => x.id === sk.id) || sk;
  const m = map || base.rankText;
  if (!m) return s;
  let d = def;
  if (!d) {
    const fst = isKnown(p, base) ? forgeState(p, base) : null;
    d = fst?.entry && fst.mejora ? forgeDef(base, fst.entry, { mejora: true }) : base;
  }
  const ctx = { def: d, ...rankTextCtx(p, base, prof) };
  return rankTextApply(s, m, (src, num) => rankTextValue(src, num, ctx));
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
