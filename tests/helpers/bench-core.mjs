// ============================================================
// NÚCLEO DEL BANCO (Paso 2 · E4, B1): héroes 2g, rotación con verbos y escenarios de rol
// ============================================================
// Lo comparten tests/balance-bench.mjs (filas de clase, matriz de rol, G9, G18) y
// tests/forge-bench.mjs (matriz de la forja, F1–F9). No es una suite: vive en helpers/.
//
// HÉROE (buildHero): Player REAL con
//  - equipo por PERFIL FIJO de nivel (gearProfile, Paso 2e: igual para las tres clases);
//  - talentos de una BUILD de talents-<clase>.js llenada punto a punto al nivel (buildRanks:
//    clase, especialización y árbol héroe si el Paragon se abre), la build por defecto de la
//    especialización si no se pide otra;
//  - barra de <CLASE>_SPEC_BAR (solo lo que conoce a ese nivel; el resto, la barra de reserva)
//    y forja recomendada <CLASE>_FORGE_RECO (D3);
//  - tablero de glifos con sus puntos derivados (16 entre el Nv81 y el 100): el brazo ofensivo
//    entero (zócalo y legendario) y el resto por el brazo de utilidad;
//  - el ÓPTIMO suma legendarios con poder, soportes Amplificado + Sobrecarga, glifos r10 y
//    bendiciones (como en 2e; las ramas v1 ya no existen).
// ROTACIÓN (makeRotation, una acción cada GCD como mucho) con los VERBOS del Paso 2 (§3.6):
//  relanzar abierto (cadenas) → defensa → gasto del indicador → postura → definitiva →
//  insignia → 2 → movilidad → 🖱️Der → básico. CARGAR Y SOLTAR: acierto perfecto 60 % (90 % con
//  Fe Serena o en la Calma Absoluta); un fallo suelta antes de la ventana (en la Calma, antes
//  de media carga). CANALES mantenidos hasta su final (los «sin fin», hasta quedarse sin
//  recurso o 10 s). POSTURAS por escenario (Muralla en TTD+, Ariete en el resto; quien tiene
//  nodos de cambio, cambia en cada recarga). PLANTADO: el héroe no camina (la Tiradora, en
//  vaivén lateral). TRAMPAS en el camino de la manada (ÁREA×5).
// ESCENARIOS (2e §7.1 con los cambios de 2e): UNI · ÁREA×5 · CONTROL · TTD+ · APOYO.
// Azar: streams con semilla (js/rng.js); el perfecto, con su propio stream por héroe.
// ============================================================
import * as THREE from 'three';
import { Player, Enemy } from '../../js/entities.js';
import { generateItem } from '../../js/items.js';
import { CLASSES, ENEMIES, ELITE_MODS, ENEMY_RANKS, bossForFloor, scaleEnemy,
  paragonBoardFor, BLESSINGS, blessingValue, SPEC_BAR, FORGE_RECO, FALLBACK_BAR } from '../../js/data.js';
import { normalizeTalents, buildRanks, defaultBuildKey, talentTreesFor, TALENT_RULES, earnedAt } from '../../js/talents.js';
import * as CM from '../../js/combat-math.js';
import { resolveSkill, isKnown, GCD, fitsSlot } from '../../js/skill-resolve.js';
import { onHurtResource } from '../../js/resources.js';
import { gaugeValue, gaugeState } from '../../js/spec-mechanics.js';
import { createRng, hashSeed } from '../../js/rng.js';
import { makeGame } from './power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };

export const DT = 1 / 60, WALK = 0.6, HUMAN_GAP = GCD;
export const UNI_T = 60, UNI_LIFE = 90, AREA_T = 30, CTL_T = 30, TTD_MAX = 180, APOYO_T = 60;
// cargar y soltar (§3.6; decisión del plan, E4): acierto perfecto 60 %; 90 % con Fe Serena (z19) o
// en la Calma Absoluta (buff f_calma)
export const PERFECT_RATE = 0.6, PERFECT_RATE_EASY = 0.9;
// un fallo suelta antes de la ventana (s nominales de carga)
const MISS_EARLY = 0.12;
// canal «sin fin» (Grieta Eterna, Galerna Infinita): se suelta con menos de este % de recurso o a los N s
const ENDLESS_MIN_RES = 0.2, ENDLESS_MAX_T = 10;

export const SPECS = { guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] };
export const SPEC_CLASS = Object.fromEntries(Object.entries(SPECS).flatMap(([c, l]) => l.map(s => [s, c])));
export const ALL_SPECS = Object.values(SPECS).flat();
// especialización por defecto de las filas por CLASE (la de daño, como en 2c.0/2e)
export const SPEC_PICK = { guerrero: 'berserker', maga: 'piromante', arquera: 'francotiradora' };
// el Guardián se mide en todo con la defensa al enfriarse (es la que define su rol, 2e §7.1)
export const DEF_ALL = new Set(['guardian']);
// distancia al objetivo: cuerpo a cuerpo / a distancia; la Crionte a media distancia (su Nova
// es de 3,3 m a su alrededor)
const DIST = { guerrero: 1.6, maga: 5, arquera: 5 };
const SPEC_DIST = { crionte: 2.4 };
const SPEC_MOVING = new Set(['tiradora']);

// ---------------- equipo (Paso 2e: perfil fijo por nivel, igual para las tres clases) ----------------
const SLOTS = [['weapon', 'weapon'], ['offhand', 'offhand'], ['helm', 'helm'], ['shoulders', 'shoulders'],
  ['chest', 'chest'], ['gloves', 'gloves'], ['belt', 'belt'], ['pants', 'pants'], ['boots', 'boots'],
  ['amulet', 'amulet'], ['ring', 'ring'], ['ring2', 'ring']];
// valor de un objeto (Paso 2b.2, solo el ÓPTIMO): arma ×6, atributo principal ×2, los demás ×0,5
function itemValue(it, mainStat = null) {
  const a = it.affixes || {};
  const attr = k => (a[k] || 0) * (!mainStat ? 1 : k === mainStat ? 2 : k === 'vit' ? 1 : 0.5);
  return (it.dmg ? (it.dmg[0] + it.dmg[1]) * (mainStat ? 6 : 2) : 0) + (it.arm || 0) + (a.hp || 0) * 0.5 +
    (a.dmgPct || 0) * 2 + (a.crit || 0) * 2 + attr('fue') + attr('des') + attr('ene') + attr('vit') + (a.aspdPct || 0);
}
const GEAR_K = 15;
const GEAR_KEYS = ['hp', 'vit', 'dmgPct', 'crit', 'critDmg', 'aspdPct', 'lph', 'cdr', 'arm', 'thorns', 'spdPct', 'mp', 'mph'];
const GEAR_CACHE = new Map();
function gearProfile(classId, kind, il, opt) {
  const key = [kind, il, opt].join('|');
  if (GEAR_CACHE.has(key)) return withMain(GEAR_CACHE.get(key), classId);
  const keys = ['main', ...GEAR_KEYS];
  const rng = createRng(hashSeed('perfil-equipo', kind, il, opt));
  const S = { dmg: [], arm: [] };
  for (const k of keys) S[k] = [];
  for (const cid of Object.keys(CLASSES)) for (let n = 0; n < GEAR_K; n++) {
    const main = CLASSES[cid].mainStat;
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) {
      const it = generateItem(il, opt ? 'legendario' : 'raro', kind, null, cid, rng);
      const v = itemValue(it, opt ? main : null);
      if (v > bv) { bv = v; best = it; }
    }
    const a = best.affixes || {};
    S.dmg.push(best.dmg ? best.dmg[0] + best.dmg[1] : 0);
    S.arm.push(best.arm || 0);
    for (const k of keys) S[k].push(a[k === 'main' ? main : k] || 0);
  }
  const mid = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
  const avg = a => +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
  const prof = { dmg: mid(S.dmg), arm: mid(S.arm), aff: Object.fromEntries(keys.map(k => [k, avg(S[k])])) };
  GEAR_CACHE.set(key, prof);
  return withMain(prof, classId);
}
function withMain(P, classId) {
  const { main, ...aff } = P.aff;
  return { ...P, aff: { ...aff, [CLASSES[classId].mainStat]: main } };
}
function applyGearProfile(it, P) {
  if (it.dmg && P.dmg > 0) {
    const sum = it.dmg[0] + it.dmg[1] || 1;
    it.dmg = [Math.max(1, Math.round(P.dmg * it.dmg[0] / sum)), 0];
    it.dmg[1] = Math.max(it.dmg[0], P.dmg - it.dmg[0]);
  }
  if (it.arm != null || P.arm > 0) it.arm = P.arm;
  it.affixes = it.affixes || {};
  for (const [k, v] of Object.entries(P.aff)) { if (v > 0) it.affixes[k] = v; else delete it.affixes[k]; }
}

// ---------------- tablero de glifos (D12: puntos derivados, Nv81–100) ----------------
// orden de compra: el brazo OFENSIVO entero (camino de 9 con su zócalo y el legendario) y sus dos
// raros; después, el camino del brazo de UTILIDAD (con su zócalo). Con 16 puntos: un legendario.
const BOARD_ORDER = ['4_3', '4_2', '3_2', '4_1', '4_0', '5_0', '6_0', '6_1', '7_0', '8_0', '8_1',
  '5_4', '6_4', '7_4', '8_4', '8_5', '8_6', '8_7', '8_8', '7_8'];
function applyBoard(p, level, opt) {
  const pts = earnedAt('board', level);
  if (!(pts > 0)) return 0;
  const board = paragonBoardFor(p.classId);
  const ids = new Set(board.map(n => n.id));
  let n = 0;
  for (const id of BOARD_ORDER) { if (n >= pts) break; if (ids.has(id)) { p.paragon.nodes[id] = true; n++; } }
  if (opt) for (const s of board.filter(x => x.type === 'socket'))
    if (p.paragon.nodes[s.id]) p.paragon.glyphs[s.id] = { stat: 'dmgPct', per: 1.5, adj: 0.5, fam: 'ofensiva', famAdj: 1.5, rank: 10 };
  return n;
}

// ---------------- barra ----------------
// barra de la especialización (SPEC_BAR) con lo que conoce; ranura vacía o desconocida → la de
// reserva de la clase (FALLBACK_BAR) si la conoce. Sin especialización (Nv < 10), la de reserva.
// variant 'basico' = solo el básico (regla «solo básico»)
export function barFor(p, { spec = p._benchSpec, variant = 'ofensiva', override = null } = {}) {
  const skills = p.cls.skills;
  const known = id => { const s = id && skills.find(x => x.id === id); return s && isKnown(p, s) ? id : null; };
  const fb = FALLBACK_BAR[p.classId] || {};
  const want = { ...(spec ? SPEC_BAR[spec]?.bar : fb), ...(override || {}) };
  const bar = {};
  for (const slot of ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4']) {
    let id = known(want[slot]);
    if (!id && !(override && slot in override)) id = known(fb[slot]);
    if (id && Object.values(bar).includes(id)) id = null;
    bar[slot] = id;
  }
  if (!bar.lmb) bar.lmb = skills.find(s => s.cat === 'basic' && s.type === 'weapon')?.id || null;
  if (variant === 'basico') return { lmb: bar.lmb, rmb: null, k1: null, k2: null, k3: null, k4: null };
  return bar;
}

// ---------------- héroe ----------------
// gear: 'tipico' (raros) | 'optimo' (legendarios con poder, soportes, glifos, bendiciones).
// opts: spec (undefined = SPEC_PICK desde el Nv10; null = sin especialización) · build (clave de
// <CLASE>_TALENTS.builds; null = la por defecto de la especialización) · forge 'reco' | 'none' | {id: v}
// (sobre la recomendada) · bar (ranuras que sustituyen a las de SPEC_BAR) · variant 'ofensiva' |
// 'defensiva' | 'basico' · cls (copia de la clase: forge-bench apaga Mejoras) · board (tablero) ·
// move: la movilidad (1) de la barra entra en la rotación (los bancos de E4 la piden; sin ella,
// como en 2b.2–2e, la 1 queda vacía: test69 compara la rotación con los dos botones)
export function buildHero(classId, level, gear = 'tipico', { al = CM.areaLevelForHero(level), torment = 0, seed = 1, variant = 'ofensiva',
  spec, build = null, forge = 'reco', bar = null, cls = null, board = true, move = false } = {}) {
  const rng = createRng(hashSeed('bench', classId, level, gear, al, torment, seed));
  const g = makeGame({ seed });
  const p = new Player(g, classId);
  if (cls) p.cls = cls;
  g.player = p;
  p.combatRng = rng.fork('combate');
  p.level = level;
  const C = CLASSES[classId];
  const pts = 5 * (Math.min(level, 20) - 1);
  p.attributes[C.mainStat] += Math.round(pts * 0.6);
  p.attributes.vit += pts - Math.round(pts * 0.6);
  const opt = gear === 'optimo';
  const il = CM.itemLevel(al);
  const q = CM.tormentMods(torment).quality;
  const irng = rng.fork('items');
  for (const [slot, kind] of SLOTS) {
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) {
      const it = generateItem(il, opt ? 'legendario' : 'raro', kind, null, classId, irng);
      const v = itemValue(it, opt ? C.mainStat : null);
      if (v > bv) { bv = v; best = it; }
    }
    applyGearProfile(best, gearProfile(classId, kind, il, opt));
    best.unidentified = false;
    best.quality = opt ? CM.tormentMods(10).quality : q;
    if (opt) {
      const pw = slot === 'weapon' ? 'furia' : slot === 'amulet' ? (C.ranged ? 'multidisparo' : 'volatil') : null;
      best.power = pw ? { id: pw, name: pw, desc: '' } : null;
    }
    p.equipment[slot] = best;
  }
  // talentos: la build (punto a punto al nivel) de la especialización
  const sp = level >= TALENT_RULES.specAt ? (spec === undefined ? SPEC_PICK[classId] : spec) : null;
  let buildKey = null;
  if (sp) {
    buildKey = build || defaultBuildKey(classId, sp);
    const B = talentTreesFor(classId)?.builds?.[buildKey];
    if (!B || B.sp !== sp) throw new Error(`banco: la build «${buildKey}» no es de ${sp}`);
    const r = buildRanks({ classId, level, talents: { v: 2, spec: sp } }, B, { level });
    p.talents = normalizeTalents({ v: 2, spec: sp, cls: r.cls, sp: r.sp, choice: r.choice, hero: r.hero ? { [sp]: r.hero } : {} }, classId);
  }
  // forja: la recomendada de la especialización (D3) y, encima, lo que se pida
  p.skillForge = forge === 'none' ? {} : { ...(sp ? FORGE_RECO[sp] || {} : {}), ...(forge && typeof forge === 'object' ? forge : {}) };
  // tablero de glifos (Nv81+) y, en el óptimo, bendiciones
  if (board) applyBoard(p, level, opt);
  if (opt && level > 20) {
    const tier = Math.max(0, Math.round((level - 20) / 3));
    const pick = id => { const b = BLESSINGS.find(x => x.id === id); return { stat: b.stat, value: blessingValue(b, tier), name: b.name }; };
    p.blessings = { Ofensiva: pick('b_dmg'), Celeridad: pick('b_cdr'), Defensiva: pick('b_hp') };
  }
  if (opt) for (const s of p.cls.skills) if (s.type !== 'buff') p.supports[s.id] = ['amplify', 'overcharge'];
  p.recompute();
  p.hp = p.stats.maxHP;
  p.mp = p.cls.resource?.start === 0 ? 0 : p.stats.maxMP;
  p.pos.set(0, 0, 0);
  p._benchSpec = sp;
  p._benchBuild = buildKey;
  p._benchVariant = variant;
  p._benchSeed = seed;
  p.hotbar = barFor(p, { spec: sp, variant, override: bar });
  if (!move && !(bar && 'k1' in bar)) p.hotbar.k1 = null;
  p._benchVerbs = { charges: 0, perfects: 0, plantedT: 0, t: 0, gen: 0 };
  installBenchInput(p);
  trackGen(p);
  return p;
}
// recurso GANADO (F5 de la forja): cada subida de p.mp (generación, regeneración y Furia por daño)
function trackGen(p) {
  let mp = p.mp;
  const vb = p._benchVerbs;
  Object.defineProperty(p, 'mp', { configurable: true, enumerable: true,
    get() { return mp; }, set(v) { if (v > mp) vb.gen += v - mp; mp = v; } });
}
function distOf(p) { return SPEC_DIST[p._benchSpec] ?? DIST[p.classId] ?? 2; }

// ---------------- entrada del banco: botones mantenidos de las cargas y los canales ----------------
// slotHeld (game-skills) lee input.mouseHeld.l/.r y input.held('skillN'). El banco mantiene la
// ranura que carga hasta su suelta planificada y la que canaliza hasta el final del canal
const SLOT_OF_ACT = { skill1: 'k1', skill2: 'k2', skill3: 'k3', skill4: 'k4' };
function installBenchInput(p) {
  const g = p.game;
  const B = g._bench = { plan: null, buttons: false, chanT0: 0 };
  const heldSlot = slot => {
    const c = g._charging;
    if (c && c.key === slot) return !(B.plan && B.plan.key === slot && B.plan.release);
    const ch = g._channel;
    if (ch && ch.ctx?.key === slot) return !B.chanRelease;
    if (B.buttons && (slot === 'lmb' || slot === 'rmb')) return true;
    return slot === 'lmb' || slot[0] === 'k';
  };
  g.input.mouseHeld = { get l() { return heldSlot('lmb'); }, get r() { return heldSlot('rmb'); } };
  g.input.held = act => heldSlot(SLOT_OF_ACT[act] || act);
}
// ¿acierta el perfecto esta carga? (60 %; 90 % con Fe Serena o en la Calma Absoluta)
function perfectRate(p, c) {
  const calm = (p.buffs || []).some(b => b.id === 'f_calma' && b.t > 0);
  const fe = (p.talentAgg?.ranks?.z19 | 0) > 0 && ['g_martillo', 'g_u_cataclismo'].includes(c.id);
  return calm || fe ? PERFECT_RATE_EASY : PERFECT_RATE;
}
// plan de suelta de la carga que empieza: en mitad de la ventana (acierto) o antes de ella (fallo;
// en la Calma Absoluta, antes de media carga, que si no ya sería perfecta)
function planCharge(p, key) {
  const g = p.game, c = g._charging;
  if (!c || c.key !== key) return;
  const rng = p._perfRng || (p._perfRng = createRng(hashSeed('bench-perfecto', p.classId, p._benchSpec || '-', p._benchSeed || 1)));
  const hit = rng() < perfectRate(p, c);
  const [a, b] = c.window || [c.max, c.max];
  let u = hit ? (a + b) / 2 : Math.max(c.min + 0.01, a - MISS_EARLY);
  if (!hit && (p.stats?.perfectAlways || 0) > 0) u = Math.min(u, c.min + 0.45 * (c.max - c.min));
  g._bench.plan = { key, u: Math.min(c.max, u), hit, release: false };
  const st = p._benchVerbs || (p._benchVerbs = { charges: 0, perfects: 0, plantedT: 0, t: 0 });
  st.charges++; if (hit) st.perfects++;
}
// antes de cada paso: soltar la carga si llega a su plan en este tic; soltar el canal sin fin
function pumpVerbs(p) {
  const g = p.game, B = g._bench;
  const c = g._charging;
  if (c && B.plan && B.plan.key === c.key && !B.plan.release) {
    const sp = g._chargeSpeed ? g._chargeSpeed(c) : 1;
    if (c.u + DT * sp >= B.plan.u - 1e-9) B.plan.release = true;
  } else if (!c) B.plan = null;
  const ch = g._channel;
  if (ch) {
    if (!B.chanInst || B.chanInst !== ch) { B.chanInst = ch; B.chanT0 = p.simT || 0; B.chanRelease = false; }
    if (ch.endless) {
      const low = p.stats.maxMP > 0 && p.mp < ENDLESS_MIN_RES * p.stats.maxMP;
      if (low || (p.simT || 0) - B.chanT0 > ENDLESS_MAX_T) B.chanRelease = true;
    }
  } else { B.chanInst = null; B.chanRelease = false; }
}

// ---------------- enemigos de referencia ----------------
export function refEnemies(al, torment = 0) {
  const pool = ENEMIES.filter(e => e.minFloor <= al && e.weight > 0);
  const W = pool.reduce((s, e) => s + e.weight, 0);
  const sc = pool.map(e => ({ e, s: scaleEnemy(e, al) }));
  const tm = CM.tormentMods(torment);
  const hp = sc.reduce((s, x) => s + x.s.hp * x.e.weight, 0) / W * tm.hp;
  const dps = sc.reduce((s, x) => s + x.s.dmg / x.e.atkTime * x.e.weight, 0) / W * tm.dmg;
  const eliteMod = ELITE_MODS.reduce((s, m) => s + (m.hp || 1), 0) / ELITE_MODS.length;
  const bossDef = bossForFloor(al);
  const boss = scaleEnemy(bossDef, al);
  return {
    common: hp,
    elite: hp * CM.eliteHpMult(al) * eliteMod,
    boss: boss.hp * tm.hp,
    commonSpd: sc.reduce((s, x) => s + (x.s.spd || x.e.spd || 3) * x.e.weight, 0) / W,
    commonDps: dps, champDps: dps * ENEMY_RANKS.campeon.dmg, eliteDps: dps * ENEMY_RANKS.elite.dmg,
    bossDps: boss.dmg / (bossDef.atkTime || 1) * tm.dmg,
    al,
  };
}
function spawnAt(g, ref, kind, hp, x, z = 0) {
  const base = kind === 'boss' ? bossForFloor(ref.al) : ENEMIES[0];
  const def = { ...scaleEnemy(base, ref.al), hp };
  if (kind === 'elite') def.rank = 'elite';
  if (kind === 'champ') def.rank = 'campeon';
  const e = new Enemy(g, def, new THREE.Vector3(x, 0, z));
  e.maxHP = e.hp = hp;
  e._home = new THREE.Vector3(x, 0, z);
  g.enemies.push(e);
  return e;
}

// estadísticas de daño por habilidad (atribución por opts.skill del golpe)
function newStats() { return { maxHit: 0, maxHitBy: null, by: {}, total: 0, uses: {}, frame: 0, frameHits: {}, sameFrameCasts: 0 }; }
function track(e, stats) {
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (amount, crit, opts = {}) => {
    const before = e.hp;
    const dealt = orig(amount, crit, opts);
    const d = Math.max(0, before - Math.max(0, e.hp));
    const raw = Math.max(0, before - e.hp);
    const k = opts.skill || (opts.source && String(opts.source)) || 'otros';
    if (raw > stats.maxHit) { stats.maxHit = raw; stats.maxHitBy = k; }
    stats.by[k] = (stats.by[k] || 0) + d;
    stats.total += d;
    if (!opts.dot && !opts.proc && opts.skill) (stats.frameHits[stats.frame] || (stats.frameHits[stats.frame] = new Set())).add(opts.skill);
    return dealt;
  };
}

// ---------------- ROTACIÓN 2g ----------------
const slotOf = (p, id) => ['rmb', 'k1', 'k2', 'k3', 'k4'].find(s => p.hotbar[s] === id) || null;
const skOf = (p, id) => (id ? p.cls.skills.find(s => s.id === id) : null);
const defOf = (p, id) => { const s = skOf(p, id); return s ? (resolveSkill(p, s)?.def || s) : null; };
// nodos de talento comprados que tocan una habilidad (touch): una defensa así se usa al enfriarse
function touchedBy(p, id) {
  const t = talentTreesFor(p.classId);
  const ranks = p.talentAgg?.ranks || {};
  const nodes = [...(t?.cls?.nodes || []), ...((t?.specs || []).find(s => s.id === p._benchSpec)?.nodes || []), ...((t?.hero || []).flatMap(h => h.nodes || []))];
  return nodes.some(n => (ranks[n.id] | 0) > 0 && (n.touch || []).includes(id));
}
// «gasto del indicador lleno» (2g) → ranura a pulsar primero (o null)
export const GAUGE_SPEND = {
  guardian: p => (gaugeValue(p, 'bastion') >= 5 ? slotOf(p, 'g_guardia') : null),
  cruzado: p => (gaugeValue(p, 'fervor') >= 3 ? slotOf(p, 'g_martillo') : null),
  piromante: p => (gaugeState(p, 'calor')?.ready ? (slotOf(p, 'meteoro') || slotOf(p, 'bola_fuego')) : null),
  crionte: (p, g, e) => (e?.frozenT > 0 ? slotOf(p, 'k_lanza') : null),
  arcanista: p => (gaugeValue(p, 'cargas') >= 4 ? slotOf(p, 'rayo') : null),
  francotiradora: p => ((p.buffs || []).some(b => b.id === 'f_calma' && b.t > 0) ? slotOf(p, 'a_t_apuntado') : null),
  // en el Vendaval, Flecha Múltiple; con Vaivén Eterno (v26), Andanada, que vuelve sin recarga al
  // cerrar su ventana (rotación de la build Vaivén Eterno, Arquera §8.3; E4b-bugs: antes el banco
  // gastaba el Vendaval solo en la Múltiple y el final no se activaba nunca)
  tiradora: p => (gaugeState(p, 'impulso')?.galeT > 0 ? ((p.talentAgg?.ranks?.v26 | 0) > 0 && slotOf(p, 'a_t_andanada')) || slotOf(p, 'flecha_multiple') : null),
};
// nodos que premian CAMBIAR de postura (Guardia: Cambio d8, Guardia Viva d22, Guardia Total d25)
const STANCE_SWAP_NODES = { g_guardia: ['d8', 'd22', 'd25'] };
// modo de postura que quiere el escenario (el primero del catálogo si no hay preferencia)
const STANCE_WANT = { g_guardia: sc => (sc === 'ttd' ? 'muralla' : 'ariete') };

// rotación de un héroe: (g, e) → ranura lanzada o null. scenario: 'uni' | 'area' | 'ctl' | 'ttd' | 'apoyo'
export function makeRotation(p, { defAtCd = false, scenario = 'uni' } = {}) {
  const bar = p.hotbar;
  const spec = p._benchSpec;
  const cat = k => defOf(p, bar[k])?.cat || null;
  const isDef = k => ['defense', 'utility'].includes(cat(k));
  const k2 = defOf(p, bar.k2);
  const k2def = !!k2 && k2.cat === 'defense';
  const k2util = !!k2 && k2.cat === 'utility';
  const k2heal = k2def && (k2.healPct > 0 || (k2.tags || []).includes('heal'));
  // la defensa de 2 al enfriarse: si la build tiene nodos que la tocan o si se mide su forja
  const defOnCd = k2def && (touchedBy(p, bar.k2) || !!p._benchDefOnCd);
  const k2cd = !!k2 && !k2def && !k2util && (resolveSkill(p, skOf(p, bar.k2))?.cd || 0) > 0;
  // movilidad (1): al enfriarse si golpea o deja algo por sí sola (salto, avance, estela, detonar,
  // buff) o si la build tiene nodos que la tocan; un canal de movilidad (Carrera del Viento) ata a la
  // heroína y solo entra con sus nodos (Galerna)
  const k1 = defOf(p, bar.k1);
  const useK1 = !!k1 && (touchedBy(p, bar.k1) || (k1.type !== 'channel' && ((k1.coef || 0) > 0 || !!k1.behavior || !!k1.trail || !!k1.detonate || !!k1.buff)));
  const tail = ['k4', 'k3', ...(k2cd || k2util ? ['k2'] : []), ...(useK1 ? ['k1'] : []), 'rmb', ...(!k2def && !k2util && !k2cd && k2 ? ['k2'] : [])];
  const stanceOk = k => {
    const d = defOf(p, bar[k]);
    if (d?.type !== 'stance') return true;
    const id = bar[k], cur = p.game.stanceOf(p, id);
    const modes = d.stance?.modes || [];
    if (modes.length < 2) return cur == null;                       // una sola: ponerla, nunca quitarla
    const swapper = (STANCE_SWAP_NODES[id] || []).some(n => (p.talentAgg?.ranks?.[n] | 0) > 0);
    const want = STANCE_WANT[id]?.(scenario) || modes[0]?.id;
    return cur == null || swapper || cur !== want;
  };
  return (g, e) => {
    // mientras carga, el jugador solo mantiene el botón: pulsar la movilidad cancelaría la carga
    if (g._charging) return null;
    const order = [];
    // cadenas: un relanzar abierto se usa antes que nada (dentro de su ventana)
    for (const k of ['k1', 'k2', 'k3', 'k4', 'rmb']) if (bar[k] && p.skState?.[bar[k]]?.recast?.left > 0) order.push(k);
    // en TTD+ (defAtCd) también la utilidad de 2 sale primero (Rodilla en Tierra, Sello)
    if ((k2def || (k2util && defAtCd)) && (defOnCd || (defAtCd && (!k2heal || p.hp < 0.75 * p.stats.maxHP)) || p.hp < 0.5 * p.stats.maxHP)) order.push('k2');
    const gs = GAUGE_SPEND[spec]?.(p, g, e);
    if (gs) order.push(gs);
    for (const k of tail) if (!order.includes(k)) order.push(k);
    // reserva: una con enfriamiento lista sin recurso → no se gasta en las principales sin enfriamiento
    const reserve = ['k3', 'k4', ...(k2cd ? ['k2'] : [])].some(k => {
      const s = skOf(p, bar[k]);
      if (!s || !isKnown(p, s)) return false;
      const pr = resolveSkill(p, s);
      if (!(pr.cd > 0) || (p.cds[s.id] || 0) > 0) return false;
      return pr.cost > 0 && p.mp < pr.cost;
    });
    for (const k of order) {
      const id = bar[k];
      if (!id || !stanceOk(k)) continue;
      if (reserve && (k === 'rmb' || (k === 'k2' && !k2cd && !isDef(k)))) {
        const pr = resolveSkill(p, skOf(p, id));
        if (!(pr?.cd > 0)) continue;
      }
      // trampas en ÁREA×5: en el CAMINO de la manada (g._benchTrapSpots, por turnos)
      const tk = defOf(p, id);
      const spots = tk?.type === 'trap' ? g._benchTrapSpots : null;
      const aim = g.input.mouseWorld;
      if (spots?.length) { const [x, z] = spots[(g._benchTrapI || 0) % spots.length]; g.input.mouseWorld = new THREE.Vector3(x, 0, z); }
      // un golpe centrado en la heroína se lanza desde más cerca (stepIn)
      const si = stepIn(p, tk, e), px = p.pos.x;
      if (si) p.pos.x = si.x;
      const done = g.castSkillSlot(k);
      if (spots?.length) { g.input.mouseWorld = aim; if (done) g._benchTrapI = (g._benchTrapI || 0) + 1; }
      if (done) { if (g._charging?.key === k) planCharge(p, k); if (si) p._benchStepIn = si; return k; }
      if (si) p.pos.x = px;
    }
    if (p.atkCd <= 0 && !(p.castLock > 0) && !g._charging) {
      const a0 = p.atkCd, w0 = !!g._windup;
      const done = g.castSkillSlot('lmb');
      if (g._charging?.key === 'lmb') { planCharge(p, 'lmb'); return 'lmb'; }
      if (done && (p.atkCd > a0 || (!w0 && !!g._windup) || p.basicAt === p.simT)) return 'lmb';
    }
    return null;
  };
}

// ACERCARSE: un golpe de daño centrado en la heroína (`at:'self'`) con un radio menor que la distancia
// al objetivo se lanza dando un paso hacia él (Colapso, Erupción) y se queda ahí lo que dura; luego
// vuelve a su sitio. → { until, x } o null
function stepIn(p, def, e) {
  if (!def || !e || def.at !== 'self' || !((def.coef || 0) > 0) || !((def.radius || 0) > 0)) return null;
  const sk = skOf(p, def.id);
  const r = (sk && resolveSkill(p, sk)?.radius) || def.radius;
  const d = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
  if (d <= r * 0.9) return null;
  const dur = Math.min(3, (def.windup || 0) + (def.impactDelay || 0) + Math.max(0, (def.pulses || 1) - 1) * (def.pulseGap || 0.3) + 0.5);
  return { until: (p.simT || 0) + dur, x: Math.max(0, e.pos.x - r * 0.7) };
}

// un paso: la rotación (cada HUMAN_GAP), la Tiradora en vaivén, los verbos y el mundo
function stepper(p, { rot, buttons = false, stats }) {
  const g = p.game;
  const moving = SPEC_MOVING.has(p._benchSpec);
  const st = { t: 0, gap: 0 };
  g._bench.buttons = buttons;
  const vb = p._benchVerbs || (p._benchVerbs = { charges: 0, perfects: 0, plantedT: 0, t: 0 });
  return (act, e) => {
    if (stats) stats.frame++;
    if (moving) g.input.keyDir = { x: 0, z: Math.floor(st.t / 0.3) % 2 ? 1 : -1 };
    let basicPre = false, sp = false;
    if (act && buttons && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      const a0 = p.atkCd, w0 = !!g._windup;
      g.castSkillSlot('lmb');
      basicPre = p.atkCd > a0 || (!w0 && !!g._windup);
      if (g._charging?.key === 'lmb' && !g._bench.plan) planCharge(p, 'lmb');
      sp = !!g.castSkillSlot('rmb');
      if (sp && g._charging?.key === 'rmb') planCharge(p, 'rmb');
    } else if (act && st.gap <= 0 && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      const acted = rot(g, e);
      if (acted) {
        st.gap = HUMAN_GAP;
        const id = p.hotbar[acted];
        if (stats) stats.uses[id] = (stats.uses[id] || 0) + 1;
      }
    }
    pumpVerbs(p);
    g.step(DT);
    if (act && buttons && e?.alive) {
      // el básico a distancia puede salir DENTRO del paso (p.update): cuenta por p.basicAt
      const basic = basicPre || p.basicAt === p.simT;
      if (basic) stats.uses[p.hotbar.lmb] = (stats.uses[p.hotbar.lmb] || 0) + 1;
      if (sp) stats.uses[p.hotbar.rmb] = (stats.uses[p.hotbar.rmb] || 0) + 1;
      if (basic && sp) stats.sameFrameCasts++;
    }
    // el héroe no se desplaza (como el objetivo): se deshacen los saltos, avances y retrocesos al
    // terminar; la Tiradora oscila ±0,8 m en el eje lateral
    if (!p.leap && !p.dashMove) {
      const si = p._benchStepIn && (p.simT || 0) < p._benchStepIn.until ? p._benchStepIn.x : 0;
      p.pos.x = si; p.pos.z = moving ? Math.max(-0.8, Math.min(0.8, p.pos.z)) : 0;
    }
    vb.t += DT; if (p.planted) vb.plantedT += DT;
    st.gap = Math.max(0, st.gap - DT);
    st.t += DT;
    return st.t;
  };
}

// ---------------- simulación contra una cadena de objetivos ----------------
export function simulate(p, hpEach, count, { kind = 'common', ref, maxT = 400, buttons = false, onFrame = null, scenario = 'uni' } = {}) {
  const g = p.game;
  const dist = distOf(p);
  const incDps = kind === 'boss' ? ref.bossDps : kind === 'elite' ? ref.eliteDps : ref.commonDps;
  const stats = newStats();
  const kills = [];
  const step = stepper(p, { rot: makeRotation(p, { scenario }), buttons, stats });
  let t = 0, last = null;
  const run = (act, e) => {
    if (act && e?.alive && incDps > 0) onHurtResource(p, incDps * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(act, e);
    if (e?.alive) e.pos.copy(e._home);
    if (onFrame && e) onFrame(e);
  };
  for (let k = 0; k < count; k++) {
    g.enemies = g.enemies.filter(x => x.alive);
    const e = spawnAt(g, ref, kind, hpEach, dist, 0);
    last = e;
    track(e, stats);
    const t0 = t;
    while (e.alive && t - t0 < maxT) run(true, e);
    kills.push(t - t0);
    for (let w = 0; w < WALK - 1e-9; w += DT) run(false, null);
  }
  const fight = kills.reduce((a, b) => a + b, 0);
  return { ttk: fight / kills.length, dps: stats.total / Math.max(1e-9, fight), fight, maxHit: stats.maxHit, maxHitBy: stats.maxHitBy, stats, last };
}

// UNI: `dur` s contra un jefe de vida `hp` (por defecto inmortal) → DPS, reparto, Quebrantados
export function simulateUni(p, ref, dur = UNI_T, { buttons = false, hp = 1e12, onFrame = null, scenario = 'uni' } = {}) {
  const r = simulate(p, hp, 1, { kind: 'boss', ref, maxT: dur, buttons, onFrame, scenario });
  const both = Object.values(r.stats.frameHits).filter(s => s.has(p.hotbar.lmb) && p.hotbar.rmb && s.has(p.hotbar.rmb)).length;
  const T = Math.max(1e-9, r.fight);
  const vb = p._benchVerbs || {};
  return { dps: r.stats.total / T, by: r.stats.by, uses: r.stats.uses, total: r.stats.total, maxHit: r.maxHit, maxHitBy: r.maxHitBy,
    sameFrameCasts: r.stats.sameFrameCasts, sameFrameHits: both, breaks: r.last?.staggerBreaks || 0, t: T,
    perfect: vb.charges ? vb.perfects / vb.charges : null, planted: vb.t ? vb.plantedT / vb.t : 0, mp: p.mp, gen: (vb.gen || 0) / T };
}

// TTD contra manada (1 campeón + 4 comunes) sin mitigación activa (Paso 1A)
export function ttdPack(p, ref, al) {
  const incoming = (ref.commonDps * 4 + ref.champDps) * CM.expectedMitigation(p.stats, al);
  const regen = 0.4 + p.stats.vit * 0.02;
  return incoming <= regen ? Infinity : p.stats.maxHP / (incoming - regen);
}
// TTD+ analítico (Paso 2b.2; filas por clase): la defensa de la ranura 2 al enfriarse (dr de buff,
// escudo, zona con allyDr). El tope de reducción es el del héroe (drCapOf: la innata del Guardián)
export function ttdPlus(p, ref, al) {
  const id = p.hotbar.k2;
  const sk = id ? skOf(p, id) : null;
  const prof = sk && (sk.cat === 'defense' || sk.cat === 'utility') ? resolveSkill(p, sk) : null;
  const regen = 0.4 + p.stats.vit * 0.02;
  const raw = ref.commonDps * 4 + ref.champDps;
  let hp = p.stats.maxHP, t = 0, cd = 0, active = 0, shield = 0;
  const dt = 0.05;
  while (hp > 0 && t < 600) {
    if (prof && cd <= 0) {
      cd = prof.cd || 20;
      active = prof.dur || sk.dur || 0;
      if (sk.type === 'shield') shield = (sk.shieldPct || 20) / 100 * p.stats.maxHP * prof.buffMul;
    }
    let dr = 0;
    if (active > 0 && prof) dr = (prof.buff?.dr || 0) + (sk.allyDr ? sk.allyDr * prof.buffMul : 0);
    const st = dr ? { ...p.stats, dr: Math.min(CM.drCapOf(p.stats), (p.stats.dr || 0) + dr) } : p.stats;
    let inc = raw * CM.expectedMitigation(st, al) * dt;
    if (shield > 0) { const a = Math.min(shield, inc); shield -= a; inc -= a; }
    hp -= inc - regen * dt;
    t += dt; cd -= dt; active -= dt;
    if (active <= 0) shield = 0;
  }
  return t;
}

function ring(n, r, cx = 0, cz = 0, center = false, off = 0.3) {
  const out = [];
  if (center) out.push([cx, cz]);
  const m = n - (center ? 1 : 0);
  for (let i = 0; i < m; i++) { const a = i * 2 * Math.PI / m + off; out.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
  return out;
}
// ¿el enemigo no puede atacar? (aturdido, congelado o con miedo; a los de distancia, inmovilizado)
const stopped = (e, ranged) => e.stunT > 0 || e.frozenT > 0 || e.fearT > 0 || (ranged && e.rootT > 0);

// TTD+ (2e): TIEMPO HASTA PERDER EL 50 % DE LA VIDA contra 3 élites + 4 comunes inmortales que pegan
// sin pausa (bloqueo, armadura, dr, escudos, curas, Bastión, Furia y el debilitamiento enemigo)
export const TTDP_PACK = { elites: 3, commons: 4, lose: 0.5 };
// extrapolate (comparar builds de un tanque, G9): si llega al tope sin perder el 50 %, el tiempo que
// tardaría al ritmo medio de pérdida (tope × 10; sin pérdida neta, ese tope)
export function ttdPlusSim(p, ref, { defAtCd = true, maxT = TTD_MAX, extrapolate = false } = {}) {
  const g = p.game;
  const step = stepper(p, { rot: makeRotation(p, { defAtCd, scenario: 'ttd' }) });
  const n = TTDP_PACK.elites + TTDP_PACK.commons;
  const pack = ring(n, 1.4).map(([x, z], i) => {
    const elite = i < TTDP_PACK.elites;
    const e = spawnAt(g, ref, elite ? 'elite' : 'common', 1e12, x, z);
    return { e, dps: elite ? ref.eliteDps : ref.commonDps, atk: 0.13 * i + 0.1 };
  });
  const ranged = !!p.cls.ranged;
  const ATK = 1.0;
  const floor = p.stats.maxHP * (1 - TTDP_PACK.lose);
  let t = 0;
  while (p.alive && p.hp > floor && t < maxT) {
    t = step(true, pack[0].e);
    for (const s of pack) {
      const e = s.e;
      e.pos.copy(e._home);
      s.atk -= DT;
      if (s.atk > 0) continue;
      s.atk += ATK * (e.numbT > 0 ? 1 / 0.85 : 1);
      if (!stopped(e, ranged) && p.alive) p.takeDamage(s.dps * ATK * (e.outDmgMul?.() ?? 1), ref.al, { melee: true, source: e });
    }
  }
  if (extrapolate && p.alive && p.hp > floor && t >= maxT - 1e-9) {
    const lost = Math.max(0, 1 - p.hp / p.stats.maxHP);
    return Math.min(maxT * 10, lost > 1e-3 ? maxT * TTDP_PACK.lose / lost : maxT * 10);
  }
  return t;
}

// ÁREA×5 (2e): 5 comunes con vida de campeón que LLEGAN CAMINANDO desde 8 m y vuelven al morir
const AREA_R = 2.0;
function packCenter(p) { return p.cls.ranged || SPEC_DIST[p._benchSpec] ? distOf(p) + 0.5 : 2.2; }
export const AREA_WALK = { from: 8 };
export function areaSim(p, ref, { dur = AREA_T } = {}) {
  const g = p.game;
  const stats = newStats();
  const step = stepper(p, { rot: makeRotation(p, { scenario: 'area' }), stats });
  const CX = 2.2, FROM = AREA_WALK.from + AREA_R;
  const offs = [ring(5, AREA_R, 0, 0, true, 0), ring(5, AREA_R, 0, 0, true, Math.PI / 4)];
  const hp = ref.common * ENEMY_RANKS.campeon.hp;
  const mk = ([ox, oz]) => {
    const e = spawnAt(g, ref, 'common', hp, FROM + ox, oz);
    e._home.set(CX + ox, 0, oz);
    track(e, stats);
    return e;
  };
  // trampas EN EL CAMINO de la manada (2e §7.1): donde llega y por donde pasa (en 2e iban a 4,9 m a
  // los lados para la Red de Espinas v1, que ya no existe; un cepo fuera del camino no salta nunca)
  g._benchTrapSpots = [[CX + 3, 0], [CX + 5, 1.2], [CX + 5, -1.2], [CX + 1.5, 0]];
  g._benchTrapI = 0;
  let off = offs[0];
  let live = off.map(mk);
  let t = 0, kills = 0;
  const inc = 5 * ref.commonDps;
  const run = p.cls.ranged || SPEC_DIST[p._benchSpec] ? 0 : (p.stats.spd || 0);
  const walk = e => {
    if (e.stunT > 0 || e.rootT > 0 || e.frozenT > 0) return;
    const f = e.slowT > 0 ? Math.max(0, 1 - (e.slowPct || 0) / 100) : 1;
    const dx = e._home.x - e.pos.x, dz = e._home.z - e.pos.z, d = Math.hypot(dx, dz);
    if (d < 1e-6) return;
    const m = Math.min(d, (ref.commonSpd * f + run) * DT);
    e.pos.x += dx / d * m; e.pos.z += dz / d * m;
  };
  while (t < dur) {
    if (off === offs[0] && t >= dur / 2) {
      for (const e of live) { e.alive = false; }
      g.enemies = g.enemies.filter(x => !live.includes(x));
      off = offs[1];
      live = off.map(mk);
    }
    const arrived = e => e.alive && Math.hypot(e.pos.x - e._home.x, e.pos.z - e._home.z) < 0.5;
    const focus = arrived(live[0]) ? live[0]
      : (live.filter(arrived).sort((a, b) => Math.hypot(a.pos.x - CX, a.pos.z) - Math.hypot(b.pos.x - CX, b.pos.z))[0]
        || live.reduce((b, e) => (e.alive && (!b || e.pos.x < b.pos.x) ? e : b), null) || live[0]);
    onHurtResource(p, inc * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(true, focus);
    for (let i = 0; i < live.length; i++) {
      if (!live[i].alive) { kills++; g.enemies = g.enemies.filter(x => x !== live[i]); live[i] = mk(off[i]); }
      else walk(live[i]);
    }
  }
  g._benchTrapSpots = null;
  return { dps: stats.total / dur, by: stats.by, total: stats.total, kills, uses: stats.uses };
}

// CONTROL (2e): 5 comunes inmortales agrupados; % del tiempo con control (el miedo es control duro)
export function controlSim(p, ref, { dur = CTL_T } = {}) {
  const g = p.game;
  const step = stepper(p, { rot: makeRotation(p, { scenario: 'ctl' }) });
  const live = ring(5, AREA_R, packCenter(p), 0, true, Math.PI / 4).map(([x, z]) => spawnAt(g, ref, 'common', 1e12, x, z));
  let t = 0, n = 0, hard = 0, hardRoot = 0, slow = 0;
  while (t < dur) {
    onHurtResource(p, 5 * ref.commonDps * CM.expectedMitigation(p.stats, ref.al) * DT);
    t = step(true, live[0]);
    for (const e of live) {
      e.pos.copy(e._home);
      const h = e.stunT > 0 || e.frozenT > 0 || e.fearT > 0, r = e.rootT > 0, s = e.slowT > 0 && (e.slowPct || 0) >= 30;
      n++; if (h) hard++; if (h || r) hardRoot++; if (h || r || s) slow++;
    }
  }
  return { hard: hard / n, hardRoot: hardRoot / n, slow: slow / n };
}

// aliado fantasma del cooperativo (contrato de g.allies, §6) con la contabilidad de la curación EFECTIVA
function ghostAlly(g, x, z, maxHP) {
  const a = {
    pos: new THREE.Vector3(x, 0, z), alive: true, hp: maxHP * 0.6, stats: { maxHP, healPct: 0 }, buffs: [], shields: [],
    healed: 0, absorbed: 0, _leech: null,
    addBuff(id, stats, dur) { this.buffs = this.buffs.filter(b => b.id !== id); this.buffs.push({ id, stats: { ...stats }, t: dur, dur }); },
    healSkill(n) { const b = this.hp; this.hp = Math.min(this.stats.maxHP, this.hp + Math.max(0, n || 0)); this.healed += this.hp - b; return this.hp - b; },
    sustain(n) {
      const r = CM.sustainTake(this._leech, this.stats.maxHP, n);
      this._leech = r.bucket;
      return this.healSkill(r.heal);
    },
    addShield(n, dur, src) { this.shields = this.shields.filter(s => s.src !== src); if (n > 0 && dur > 0) this.shields.push({ amt: n, t: dur, src }); return n; },
    setHp(v) { this.hp = Math.max(0, Math.min(this.stats.maxHP, v)); return this.hp; },
    grantInvuln(s) { this.invulnT = s; },
    takeDamage(n, al, opts) { return g.damageAlly(this, n, opts); },
    tick(dt) {
      for (const b of this.buffs) b.t -= dt;
      this.buffs = this.buffs.filter(b => b.t > 0);
      for (const s of this.shields) s.t -= dt;
      this.shields = this.shields.filter(s => s.t > 0 && s.amt > 0);
      if (this.invulnT > 0) this.invulnT -= dt;
      this._leech = CM.sustainRefill(this._leech, this.stats.maxHP, dt);
    },
    hurt(n, src) {
      let left = n;
      for (const s of this.shields) { const take = Math.min(s.amt, left); s.amt -= take; left -= take; this.absorbed += take; if (left <= 0) break; }
      if (left > 0) g.damageAlly(this, left, { source: src });
      if (!this.alive || this.hp < 0.2 * this.stats.maxHP) { this.alive = true; this.hp = 0.5 * this.stats.maxHP; }
    },
    dmgMult(e) {
      let add = 0, crit = 0, aspd = 0;
      for (const b of this.buffs) { add += b.stats.dmgPct || 0; crit += b.stats.crit || 0; aspd += b.stats.aspdPct || 0; }
      const weak = e ? CM.weaknessMult(e.vulnT > 0 ? CM.VULN_PCT : 0, CM.sumWeakness(e.debuffs)) : 1;
      return (1 + add / 100) * (1 + (CM.CRIT_MULT - 1) * crit / 100) * (1 + aspd / 100) * weak;
    },
  };
  return a;
}
// APOYO (2e): UNI con 2 aliados en g.party → DPS extra que les dan tus buffs y la Debilidad del jefe
// (en «DPS de un aliado») y curación + escudos efectivos (% de su vida por segundo).
// E4b-bugs (Tierra Santa): los aliados pelean a tu lado, en el camino hacia el objetivo, donde caen
// tus zonas (el sendero, los suelos sagrados, el Cataclismo); antes, a 1,9 m detrás, ninguna zona
// los tocaba. Y están siempre heridos (como mucho a media vida) para que la cura efectiva no se
// sature: con 2 %/s de daño, todas las builds del Cruzado curaban todo lo que perdían y la cura de
// Tierra Santa no se veía (2,45 %/s con ella y 2,44 sin ella)
export const APOYO_ALLIES = [[0.8, 0.3], [0.8, -0.3]], APOYO_KEEP = 0.5, APOYO_HURT = 0.02;
export function apoyoSim(p, ref, { hp = 1e12, allyHp = 1000, dur = APOYO_T, allyAt = APOYO_ALLIES, keep = APOYO_KEEP } = {}) {
  const g = p.game;
  const allies = allyAt.map(([x, z]) => ghostAlly(g, x, z, allyHp));
  for (const a of allies) a.hp = Math.min(a.hp, keep * allyHp);
  g.party = allies;
  let extra = 0, frames = 0, acc = 0;
  const r = simulateUni(p, ref, dur, { hp, scenario: 'apoyo', onFrame: e => {
    for (const a of allies) { a.tick(DT); extra += a.dmgMult(e) - 1; a.hp = Math.min(a.hp, keep * a.stats.maxHP); }
    frames++;
    acc += DT;
    if (acc >= 0.5) { acc -= 0.5; for (const a of allies) a.hurt(APOYO_HURT * a.stats.maxHP * 0.5, e); }
  } });
  g.party = [];
  const healed = allies.reduce((s, a) => s + a.healed + a.absorbed, 0);
  return { dpsShare: extra / Math.max(1, frames), heal: healed / allies.reduce((s, a) => s + a.stats.maxHP, 0) / r.t * 100, uni: r };
}

// tipo de definitiva para la regla del 12–22 % de UNI: 'dmg' (golpea: su parte del daño), 'buff'
// (refuerza el daño: Furia Inmortal; se mide por lo que baja el UNI sin ella) o 'def' (defensiva:
// la Ciudadela; la regla no aplica y se informa su TTD+)
const OFF_BUFF = ['dmgPct', 'aspdPct', 'crit', 'critDmg', 'spenderCostPct', 'costPct', 'skillSpeedPct'];
export function ultKind(p) {
  const d = defOf(p, p.hotbar.k4);
  if (!d) return null;
  if ((d.coef || 0) > 0) return 'dmg';
  return Object.keys(d.buff || {}).some(k => OFF_BUFF.includes(k)) ? 'buff' : 'def';
}

// ABLACIÓN JUSTA de un nodo de especialización (sondas y pruebas de E4b): mientras corre `fn`, el
// nodo conserva sus rangos pero no hace nada (fx vacío). Ponerle los rangos a 0 deja la
// especialización por debajo de sus 31 puntos y CIERRA el Paragon (heroOpen) a Nv70+: el «sin»
// pierde también el árbol héroe (a Nv70, el nodo clave; a Nv100, el árbol entero) y la diferencia
// mide eso (E4b-bugs, revisión: Montaña Viva a Nv100 daba un TTD+ de 1800 frente a 111 por eso)
export function withoutNode(classId, spec, id, fn) {
  const n = (talentTreesFor(classId)?.specs?.find(s => s.id === spec)?.nodes || []).find(x => x.id === id);
  if (!n) throw new Error(`banco: el nodo ${id} no existe en ${classId}/${spec}`);
  const fx = n.fx;
  n.fx = {};
  try { return fn(); } finally { n.fx = fx; }
}

// utilidades de informe
export const med =a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
export const f1 = v => (v === Infinity ? '∞' : v == null || Number.isNaN(v) ? '—' : v.toFixed(Math.abs(v) < 10 ? 2 : 1));
export const pct = v => (v == null ? '—' : `${(v * 100).toFixed(0)}%`);
export const sgn = v => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(0)}%`;
export { fitsSlot };
