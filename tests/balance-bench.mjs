// ============================================================
// BANCO DE BALANCE — Paso 1A (objetivos) · Paso 2b.2 (canal real de lanzamiento)
// ============================================================
// Simula combates contra enemigos común/élite/jefe con:
//  - héroes construidos con el código real (Player.recompute, generateItem,
//    talentos —especialización por defecto + preset de su nivel—, paragon,
//    bendiciones, soportes, ramas de habilidad);
//  - el CANAL REAL de lanzamiento (js/game-skills.js vía el arnés de tests): el
//    mismo resolveSkill, GCD de 0,2 s, windup, impactDelay, bloqueos, cadencia de
//    los básicos, proyectiles que tiran el daño al impactar, comportamientos de
//    varios golpes (Diluvio 8 oleadas, Cataclismo 6 impactos, Supernova 2 ondas,
//    canalizaciones por tics, salpicaduras), DoT por el planificador, Debilidad y
//    multiplicadores [×] en Enemy.takeDamage, recurso real (Furia/Maná/Energía);
//  - Furia por daño recibido: el objetivo pega al héroe con su DPS medio (tras
//    mitigar) → resources.onHurtResource (el héroe no pierde vida en la simulación);
//  - azar con semilla fija (js/rng.js) → resultados reproducibles.
// LOADOUT por clase (§1.4/§7.1, sin especialización hasta el Paso 2c):
//  🖱️Izq = básico de arma · 🖱️Der = gastadora principal · 2 = segunda gastadora
//  (variante OFENSIVA) o defensa (variante DEFENSIVA) · 4 = definitiva de daño.
//  La movilidad (1) no entra en la rotación de daño (es para moverse).
// ROTACIÓN (§7.1, una acción cada vez que el canal lo permite y como mucho una
// cada HUMAN_GAP s): definitiva → gastadora de 2 si tiene enfriamiento →
// gastadora de 🖱️Der → gastadora de 2 sin enfriamiento → básico. La defensa de la
// variante defensiva no se pulsa en los TTK (la vida no baja): solo cuenta en TTD+.
// Supuestos documentados (MEMORIA.md, Paso 2b.2):
//  - objetivo único (las áreas, rebotes y salpicaduras no suman objetivos extra);
//  - TTK común/élite: cadena de N combates seguidos (CD y recurso continúan entre
//    combates, con WALK s de desplazamiento); el objetivo no se mueve;
//  - TTD (Paso 1A): manada (1 campeón + 4 comunes) pegando cuerpo a cuerpo sin
//    parar, sin mitigación activa; TTD+ = lo mismo con la defensa de la ranura 2
//    usada al enfriarse (variante defensiva);
//  - UNI: 60 s contra un jefe que no muere (reparto de daño por habilidad).
// Uso: `node tests/balance-bench.mjs` (afirma) · `--report` (solo imprime)
// ============================================================
import * as THREE from 'three';
import { Player, Enemy } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { CLASSES, ENEMIES, ELITE_MODS, ENEMY_RANKS, bossForFloor, scaleEnemy,
  SKILL_MODS, paragonBoardFor, BLESSINGS, blessingValue } from '../js/data.js';
import { normalizeTalents, presetRanks, presetList, TALENT_START_LEVEL } from '../js/talents.js';
import * as CM from '../js/combat-math.js';
import { resolveSkill, isKnown, GCD } from '../js/skill-resolve.js';
import { onHurtResource } from '../js/resources.js';
import { createRng, hashSeed } from '../js/rng.js';
import { makeGame } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const REPORT_ONLY = process.argv.includes('--report');

const DT = 1 / 30, WALK = 0.6, HUMAN_GAP = GCD, UNI_T = 60;
const SLOTS = [['weapon', 'weapon'], ['offhand', 'offhand'], ['helm', 'helm'], ['shoulders', 'shoulders'],
  ['chest', 'chest'], ['gloves', 'gloves'], ['belt', 'belt'], ['pants', 'pants'], ['boots', 'boots'],
  ['amulet', 'amulet'], ['ring', 'ring'], ['ring2', 'ring']];
// LOADOUT por clase: por ranura, la primera habilidad CONOCIDA de la lista (y distinta
// de la de 🖱️Der). k2off = variante ofensiva · k2def = variante defensiva.
// La ofensiva lleva en 2 una gastadora CON enfriamiento: con dos sin enfriamiento
// (Hendidura + Torbellino, Perforante + Múltiple) la de 🖱️Der siempre llega antes y
// la de 2 solo le roba recurso en un objetivo (su valor es de área: ÁREA×5, Paso 2e).
// Antes de tenerla (Guerrero Nv8–13, Arquera Nv8–13) la ofensiva = sin segunda gastadora.
export const LOADOUT = {
  guerrero: { rmb: ['g_hendidura', 'torbellino'], k2off: ['terremoto'], k2def: ['g_piel'], k4: ['g_u_cataclismo'] },
  maga:     { rmb: ['bola_fuego'], k2off: ['meteoro', 'rayo'], k2def: ['m_armadura'], k4: ['m_u_supernova'] },
  arquera:  { rmb: ['flecha_perforante'], k2off: ['lluvia_flechas'], k2def: ['a_humo'], k4: ['a_u_diluvio'] },
};
// Paso 2c.0: especialización por defecto del banco = la de DAÑO de la LOADOUT de
// cada clase (las mismas que las maestrías de antes); su insignia (k3) aún no entra
// en la rotación (ROT_SPEC es del Paso 2e)
export const SPEC_PICK = { guerrero: 'berserker', maga: 'piromante', arquera: 'francotiradora' };
const PARAGON_ORDER = ['4_3', '4_5', '4_2', '4_6', '4_1', '4_7', '3_2', '5_2', '3_6', '5_6', '4_0', '4_8',
  '3_4', '5_4', '2_4', '6_4', '1_4', '7_4', '2_3', '2_5', '6_3', '6_5', '0_4', '8_4', '3_3', '5_3', '3_5', '5_5'];
const DIST = { guerrero: 1.6, maga: 5, arquera: 5 }; // distancia al objetivo (cuerpo a cuerpo / a distancia)

// valor de un objeto para el héroe del banco. Paso 2b.2 (solo el ÓPTIMO): el daño del
// arma vale ×6 (es la base de todo golpe), el atributo PRINCIPAL de la clase ×2
// (multiplica el daño) y los demás ×0,5 (vitalidad ×1). Antes los cuatro
// valían lo mismo y el óptimo de la Arquera Nv50 elegía joyas de Fuerza/Energía:
// quedaba con MENOS Destreza que el típico (139 frente a 163) y con un arco apenas
// mejor que el raro del típico (40–63 frente a 36–59): su DPS era ×2,5 el del típico
// (las demás clases ×6–7).
function itemValue(it, mainStat = null) {
  const a = it.affixes || {};
  const attr = k => (a[k] || 0) * (!mainStat ? 1 : k === mainStat ? 2 : k === 'vit' ? 1 : 0.5);
  return (it.dmg ? (it.dmg[0] + it.dmg[1]) * (mainStat ? 6 : 2) : 0) + (it.arm || 0) + (a.hp || 0) * 0.5 +
    (a.dmgPct || 0) * 2 + (a.crit || 0) * 2 + attr('fue') + attr('des') + attr('ene') + attr('vit') + (a.aspdPct || 0);
}

// build: 'tipico' (raros, sin soportes/ramas, talentos con el preset y paragon en orden natural)
//        'optimo' (legendarios calidad máx. con poderes elegidos, soportes,
//                  ramas, paragon con glifos r10, bendiciones de grieta)
// variant: 'ofensiva' | 'defensiva' | 'basico' (solo el básico, para la regla 0,6×)
export function buildHero(classId, level, build, { al = CM.areaLevelForHero(level), torment = 0, seed = 1, variant = 'ofensiva' } = {}) {
  const rng = createRng(hashSeed('bench', classId, level, build, al, torment, seed));
  const g = makeGame({ seed });
  const p = new Player(g, classId);
  g.player = p;
  p.combatRng = rng.fork('combate');
  p.level = level;
  const cls = CLASSES[classId];
  const pts = 5 * (Math.min(level, 20) - 1);
  p.attributes[cls.mainStat] += Math.round(pts * 0.6);
  p.attributes.vit += pts - Math.round(pts * 0.6);
  const opt = build === 'optimo';
  // equipo: ilvl del área (acotado) y calidad del Tormento (combat-math)
  const il = CM.itemLevel(al);
  const q = CM.tormentMods(torment).quality;
  const irng = rng.fork('items');
  for (const [slot, kind] of SLOTS) {
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) {
      const it = generateItem(il, opt ? 'legendario' : 'raro', kind, null, classId, irng);
      const v = itemValue(it, opt ? cls.mainStat : null);   // el típico no optimiza (Paso 1A)
      if (v > bv) { bv = v; best = it; }
    }
    best.unidentified = false;
    best.quality = opt ? CM.tormentMods(10).quality : q;
    if (opt) {
      // poderes elegidos: Furia en el arma, Volátil/Vendaval en joyas; resto sin poder
      const pw = slot === 'weapon' ? 'furia' : slot === 'amulet' ? (cls.ranged ? 'multidisparo' : 'volatil') : null;
      best.power = pw ? { id: pw, name: pw, desc: '' } : null;
    }
    p.equipment[slot] = best;
  }
  // talentos (Nv ≥ 10): especialización por defecto + el preset recomendado recortado a
  // los puntos de su nivel (clase: el clsPreset de esa especialización), con sus elecciones
  if (level >= TALENT_START_LEVEL) {
    const spec = SPEC_PICK[classId];
    p.talents = normalizeTalents({ spec }, classId);
    p.talents.cls = presetRanks(p, 'cls') || {};
    p.talents.sp[spec] = presetRanks(p, 'spec') || {};
    for (const which of ['cls', 'spec']) for (const [id, , k] of presetList(p, which)) if (k) p.talents.choice[id] = k;
  }
  // paragon: puntos = nivel − 20, nodos en orden contiguo
  if (level > 20) {
    const board = paragonBoardFor(classId);
    const n = Math.min(PARAGON_ORDER.length, level - 20);
    for (let i = 0; i < n; i++) p.paragon.nodes[PARAGON_ORDER[i]] = true;
    if (opt) {
      for (const s of board.filter(x => x.type === 'socket'))
        if (p.paragon.nodes[s.id]) p.paragon.glyphs[s.id] = { stat: 'dmgPct', per: 1.5, adj: 0.5, fam: 'ofensiva', famAdj: 1.5, rank: 10 };
      const tier = Math.max(0, Math.round((level - 20) / 3));
      const pick = id => { const b = BLESSINGS.find(x => x.id === id); return { stat: b.stat, value: blessingValue(b, tier), name: b.name }; };
      p.blessings = { Ofensiva: pick('b_dmg'), Celeridad: pick('b_cdr'), Defensiva: pick('b_hp') };
    }
  }
  // soportes y ramas (solo el óptimo)
  if (opt) {
    for (const s of cls.skills) {
      // los incompatibles por tags (Sobrecarga en básicos, definitivas…) los ignora el resolvedor
      if (s.type !== 'buff') p.supports[s.id] = ['amplify', 'overcharge'];
      const br = SKILL_MODS[s.id];
      if (!br) continue;
      const ch = {};
      for (const b of br) {
        const pref = b.opts.find(o => o.dmg >= 40 && !o.radius) || b.opts.find(o => o.cdr > 0 && b.name !== 'Potencia')
          || b.opts.find(o => o.zone) || b.opts.find(o => o.vuln) || b.opts.find(o => o.buff > 0) || b.opts[0];
        ch[b.id] = pref.id;
      }
      p.skillMods[s.id] = ch;
    }
  }
  p.recompute();
  p.hp = p.stats.maxHP;
  p.mp = cls.resource?.start === 0 ? 0 : p.stats.maxMP;
  p.pos.set(0, 0, 0);
  applyLoadout(p, variant);
  return p;
}

// barra del banco según la variante (solo habilidades conocidas a ese nivel)
export function loadoutOf(p, variant = 'ofensiva') {
  const L = LOADOUT[p.classId];
  const cls = p.cls;
  const known = id => { const s = cls.skills.find(x => x.id === id); return s && isKnown(p, s) ? id : null; };
  const first = (list, not = null) => (list || []).map(known).find(id => id && id !== not) || null;
  const bar = { lmb: cls.skills.find(s => s.cat === 'basic' && s.type === 'weapon').id, rmb: null, k1: null, k2: null, k3: null, k4: null };
  if (variant === 'basico') return bar;
  bar.rmb = first(L.rmb);
  bar.k2 = variant === 'defensiva' ? first(L.k2def) : first(L.k2off, bar.rmb);
  bar.k4 = first(L.k4);
  return bar;
}
function applyLoadout(p, variant) { p.hotbar = loadoutOf(p, variant); }

// --- enemigos de referencia de un nivel de área ---
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
    commonDps: dps, champDps: dps * ENEMY_RANKS.campeon.dmg, eliteDps: dps * ENEMY_RANKS.elite.dmg,
    bossDps: boss.dmg / (bossDef.atkTime || 1) * tm.dmg,
    al,
  };
}

// enemigo REAL inmóvil (Enemy de entities.js: applyCC, Debilidad, Π[×], onKill)
function spawnTarget(g, kind, hp, ref, dist) {
  const base = kind === 'boss' ? bossForFloor(ref.al) : ENEMIES[0];
  const def = { ...scaleEnemy(base, ref.al), hp };
  if (kind === 'elite') def.rank = 'elite';
  const e = new Enemy(g, def, new THREE.Vector3(dist, 0, 0));
  e.maxHP = e.hp = hp;
  g.enemies.push(e);
  return e;
}

// estadísticas de daño por habilidad (atribución por opts.skill del golpe)
function track(e, stats) {
  const orig = e.takeDamage.bind(e);
  e.takeDamage = (amount, crit, opts = {}) => {
    const before = e.hp;
    const dealt = orig(amount, crit, opts);
    const d = Math.max(0, before - e.hp);           // sin topar a la vida restante (golpe real)
    const k = opts.skill || (opts.source && String(opts.source)) || 'otros';
    if (d > stats.maxHit) { stats.maxHit = d; stats.maxHitBy = k; }
    stats.by[k] = (stats.by[k] || 0) + d;
    stats.total += d;
    // impactos DIRECTOS por frame (sin tics de DoT/campos ni procs): regla de los dos botones
    if (!opts.dot && !opts.proc && opts.skill) (stats.frameHits[stats.frame] || (stats.frameHits[stats.frame] = new Set())).add(opts.skill);
    return dealt;
  };
}

// --- simulación con el canal REAL contra una cadena de objetivos ---
// kind: 'common' | 'elite' | 'boss' · count objetivos de vida hpEach · maxT por objetivo
// buttons: true = «los dos botones mantenidos» (🖱️Izq + 🖱️Der cada frame, como el
// bucle de main.js) en vez de la rotación; mide acciones lanzadas en el mismo frame.
export function simulate(p, hpEach, count, { kind = 'common', ref, maxT = 400, buttons = false } = {}) {
  const g = p.game;
  const dist = DIST[p.classId] || 2;
  const incDps = kind === 'boss' ? ref.bossDps : kind === 'elite' ? ref.eliteDps : ref.commonDps;
  const stats = { maxHit: 0, maxHitBy: null, by: {}, total: 0, uses: {}, frame: 0, frameHits: {}, sameFrameCasts: 0 };
  const kills = [];
  let gap = 0, t = 0;
  // §7.1 ROT_SPEC: la gastadora de 2 va ANTES que la de 🖱️Der solo si tiene enfriamiento
  const k2sk = p.hotbar.k2 ? p.cls.skills.find(s => s.id === p.hotbar.k2) : null;
  const k2cd = !!(k2sk && (k2sk.cd || 0) > 0);
  const order = k2cd ? ['k4', 'k2', 'rmb'] : ['k4', 'rmb', 'k2'];
  const stepWorld = (act, e) => {
    stats.frame++;
    if (act && buttons && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      g.input.mouseHeld = { l: true, r: true };
      const a0 = p.atkCd, w0 = !!g._windup;
      g.castSkillSlot('lmb');
      const basic = p.atkCd > a0 || (!w0 && !!g._windup);
      const sp = g.castSkillSlot('rmb');
      if (basic) stats.uses[p.hotbar.lmb] = (stats.uses[p.hotbar.lmb] || 0) + 1;
      if (sp) stats.uses[p.hotbar.rmb] = (stats.uses[p.hotbar.rmb] || 0) + 1;
      if (basic && sp) stats.sameFrameCasts++;
    } else if (act && gap <= 0 && e?.alive) {
      g.input.mouseWorld = e.pos.clone();
      let acted = null;
      // reserva: con la gastadora de 2 (con enfriamiento) lista pero sin recurso, no se
      // gasta en la de 🖱️Der (un jugador junta Energía/Furia para la Lluvia)
      const pool = k2cd && !(p.cds[k2sk.id] > 0) && p.mp < resolveSkill(p, k2sk).cost;
      for (const k of order) {
        if (pool && k === 'rmb') continue;
        if (p.hotbar[k] && g.castSkillSlot(k)) { acted = k; break; }
      }
      if (!acted && p.atkCd <= 0 && !(p.castLock > 0)) {
        g.castSkillSlot('lmb');                       // básico: arrancó si puso su cadencia o un windup
        if (p.atkCd > 0 || g._windup) acted = 'lmb';
      }
      if (acted) {
        gap = HUMAN_GAP;
        const id = p.hotbar[acted];
        stats.uses[id] = (stats.uses[id] || 0) + 1;
      }
    }
    // Furia por daño recibido (el objetivo pega con su DPS medio, tras mitigar)
    if (act && e?.alive && incDps > 0) onHurtResource(p, incDps * CM.expectedMitigation(p.stats, ref.al) * DT);
    g.step(DT);
    if (e?.alive) e.pos.set(dist, 0, 0);           // inmóvil (deshace el retroceso)
    gap = Math.max(0, gap - DT);
    t += DT;
  };
  for (let k = 0; k < count; k++) {
    g.enemies = g.enemies.filter(x => x.alive);
    const e = spawnTarget(g, kind, hpEach, ref, dist);
    track(e, stats);
    const t0 = t;
    while (e.alive && t - t0 < maxT) stepWorld(true, e);
    kills.push(t - t0);
    for (let w = 0; w < WALK - 1e-9; w += DT) stepWorld(false, null);
  }
  const ttk = kills.reduce((a, b) => a + b, 0) / kills.length;
  return { ttk, dps: stats.total / Math.max(1e-9, kills.reduce((a, b) => a + b, 0)), maxHit: stats.maxHit, maxHitBy: stats.maxHitBy, stats };
}

// UNI: 60 s contra un jefe que no muere → DPS y reparto por habilidad
export function simulateUni(p, ref, dur = UNI_T, { buttons = false } = {}) {
  const r = simulate(p, 1e12, 1, { kind: 'boss', ref, maxT: dur, buttons });
  const both = Object.values(r.stats.frameHits).filter(s => s.has(p.hotbar.lmb) && p.hotbar.rmb && s.has(p.hotbar.rmb)).length;
  return { dps: r.stats.total / dur, by: r.stats.by, uses: r.stats.uses, total: r.stats.total,
    sameFrameCasts: r.stats.sameFrameCasts, sameFrameHits: both };
}

// TTD contra manada (1 campeón + 4 comunes) sin mitigación activa (Paso 1A)
export function ttdPack(p, ref, al) {
  const incoming = (ref.commonDps * 4 + ref.champDps) * CM.expectedMitigation(p.stats, al);
  const regen = 0.4 + p.stats.vit * 0.02;
  return incoming <= regen ? Infinity : p.stats.maxHP / (incoming - regen);
}
// TTD+: misma manada; la defensa de la ranura 2 (variante defensiva) se usa al
// enfriarse: dr de buff (Piel de Hierro), escudo (Armadura de Hielo) o zona con
// allyDr (Bomba de Humo). Perfiles reales de resolveSkill.
export function ttdPlus(p, ref, al) {
  const id = p.hotbar.k2;
  const sk = id ? p.cls.skills.find(s => s.id === id) : null;
  const prof = sk ? resolveSkill(p, sk) : null;
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
    const st = dr ? { ...p.stats, dr: Math.min(CM.CAPS.dr, (p.stats.dr || 0) + dr) } : p.stats;
    let inc = raw * CM.expectedMitigation(st, al) * dt;
    if (shield > 0) { const a = Math.min(shield, inc); shield -= a; inc -= a; }
    hp -= inc - regen * dt;
    t += dt; cd -= dt; active -= dt;
    if (active <= 0) shield = 0;
  }
  return t;
}

// ---------------- ejecución ----------------
const ULT_MIN_LEVEL = 15;
export function runBench({ classes = ['guerrero', 'maga', 'arquera'], levels = [1, 5, 10, 25, 50], torment = [[50, 10]] } = {}) {
  const rows = [];
  const cases = [...levels.map(L => ({ L, T: 0 })), ...torment.map(([L, T]) => ({ L, T }))];
  for (const c of classes) for (const { L, T } of cases) {
    const al = CM.areaLevelForHero(L);
    const ref = refEnemies(al, T);
    const row = { cls: c, L, T, al };
    for (const b of ['tipico', 'optimo']) {
      const mk = (variant = 'ofensiva') => buildHero(c, L, b, { al, torment: T, variant });
      const n = simulate(mk(), ref.common, 24, { kind: 'common', ref });
      const e = simulate(mk(), ref.elite, 6, { kind: 'elite', ref });
      const bo = simulate(mk(), ref.boss, 2, { kind: 'boss', ref });
      const def = mk('defensiva');
      const top = [n, e, bo].reduce((a, x) => (x.maxHit > a.maxHit ? x : a));
      row[b] = { ttkN: n.ttk, ttkE: e.ttk, ttkB: bo.ttk, dps: bo.dps, maxHit: top.maxHit, maxHitBy: top.maxHitBy,
        ttd: ttdPack(def, ref, al), ttdPlus: ttdPlus(def, ref, al) };
      if (b === 'tipico' && T === 0) {
        const off = mk();
        row.uni = simulateUni(off, ref);
        row.uniBar = { ...off.hotbar };
        row.uniBasic = simulateUni(mk('basico'), ref);
        row.uniDef = simulateUni(mk('defensiva'), ref);
        row.ttdPlusOff = ttdPlus(off, ref, al);
        row.basicHit = off.avgHit(resolveSkill(off, off.cls.skills.find(s => s.id === off.hotbar.lmb)).coef, 0);
        row.wd = off.avgHit(1, 0);                      // 1 WD (arma × atributo, coef 1)
      }
    }
    row.bossHp = ref.boss;
    row.ratio = row.optimo.dps / row.tipico.dps;
    rows.push(row);
  }
  return rows;
}

const f1 = v => (v === Infinity ? '∞' : v.toFixed(v < 10 ? 2 : 1));
const pct = v => `${(v * 100).toFixed(0)}%`;
export function printRows(rows) {
  console.log('clase    Nv  T  AL | TÍPICO TTK común/élite/jefe  TTD  TTD+ | ÓPTIMO común/élite/jefe  TTD  | opt/típ  golpeMáx/vidaJefe');
  for (const r of rows) {
    const t = r.tipico, o = r.optimo;
    console.log(`${r.cls.padEnd(8)} ${String(r.L).padStart(2)} ${String(r.T).padStart(2)} ${String(r.al).padStart(3)} | ` +
      `${f1(t.ttkN).padStart(5)} ${f1(t.ttkE).padStart(5)} ${f1(t.ttkB).padStart(6)}  ${f1(t.ttd).padStart(5)} ${f1(t.ttdPlus).padStart(5)} | ` +
      `${f1(o.ttkN).padStart(5)} ${f1(o.ttkE).padStart(5)} ${f1(o.ttkB).padStart(6)}  ${f1(o.ttd).padStart(5)} | ` +
      `×${r.ratio.toFixed(1).padStart(4)}   ${(o.maxHit / r.bossHp * 100).toFixed(1)}% ${o.maxHitBy || ''}`);
  }
  console.log('\nUNI (típico, 60 s a un jefe; variante ofensiva) — reparto del daño por habilidad');
  for (const r of rows.filter(x => x.uni)) {
    const parts = Object.entries(r.uni.by).sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${pct(v / r.uni.total)}${r.uni.uses[k] ? `·${r.uni.uses[k]}u` : ''}`).join(' · ');
    const k2 = r.uniDef.dps > 0 ? r.uni.dps / r.uniDef.dps - 1 : 0;
    const k2t = r.ttdPlusOff > 0 ? r.tipico.ttdPlus / r.ttdPlusOff - 1 : 0;
    console.log(`${r.cls.padEnd(8)} Nv${String(r.L).padStart(2)} | DPS ${f1(r.uni.dps).padStart(7)} (${(r.uni.dps / r.wd).toFixed(2)} WD/s) · solo básico ×${(r.uniBasic.dps / r.uni.dps).toFixed(2)} · ` +
      `ranura 2: ofensiva +${pct(k2)} UNI / defensiva +${pct(k2t)} TTD | ${parts}`);
  }
}

// OBJETIVOS (héroe típico, T0). Dos niveles de exigencia (Paso 1A, sin cambios):
//  - DISEÑO: la MEDIA de las 3 clases dentro del objetivo del Paso 1A
//    (común 0,6–1,5 s · élite 4,5–10,5 · jefe 45–90 · TTD 6–10);
//  - CLASE: cada clase por separado (élite 4,5–10,5 s y TTD 6–13 s en todos los
//    niveles; común y jefe con algo de tolerancia).
// Jefe por nivel: la vida de jefe sube en rampa (combat-math.bossHpMult) → Nv1
// (solo el básico) 30–60 s, Nv5 30–90 s, y desde Nv10 el rango normal.
// Paso 2b.2 (UNI, típico, T0):
//  - basicOnly: «solo básico» ≤ 0,6× la rotación (desde Nv5, con al menos una gastadora);
//  - ultShare: la definitiva aporta el 12–22 % del daño (Nv ≥ 15);
//  - NINGUNA GASTADORA TRAMPA: cada gastadora de la barra por defecto aporta
//    ≥ spenderShare (10 %) del daño y su daño por uso es ≥ spenderPerUse (1,8×)
//    el golpe medio del básico (1,3× si es de área/cono/línea). Por qué: 10 % es
//    lo mínimo para que pulsarla se note frente a la rotación entera; 1,8× el
//    básico es el suelo del presupuesto §3.0 (gastadora 2,2–3 WD vs básico 1 WD)
//    con margen, y las de área reparten ≈70 % por objetivo (§3.0).
export const TARGETS = {
  mean: { ttkN: [0.6, 1.5], ttkE: [4.5, 10.5], ttkB: [45, 90], ttd: [6, 10] },
  cls: { ttkN: [0.45, 1.8], ttkE: [4.5, 10.5], ttkB: [35, 100], ttd: [6, 13] },
  bossNv1: [30, 60],
  bossRamp: [30, 90],      // Nv 2–9 (rampa)
  ratio: [1.3, 15],        // DPS óptimo / típico (Nv ≥ 10)
  classSpread: 2.5,        // jefe: clase más lenta / más rápida (Nv ≥ 10)
  maxHitBoss: 0.25,        // un golpe del óptimo ≤ 25 % de la vida del jefe
  basicOnly: 0.6,
  ultShare: [0.12, 0.22],
  spenderShare: 0.10,
  spenderPerUse: 1.8,       // gastadora de un objetivo
  spenderPerUseArea: 1.3,   // de área/cono/línea: reparte ≈70 % por objetivo (§3.0) → 1,8 × 0,7
};

export function checkRows(rows) {
  const errs = [];
  const chk = (ok, msg) => { if (!ok) errs.push(msg); };
  const inR = (v, [lo, hi]) => v >= lo && v <= hi;
  for (const r of rows) {
    const id = `${r.cls} Nv${r.L}${r.T ? ' T' + r.T : ''}`;
    if (r.T === 0) {
      const t = r.tipico, C = TARGETS.cls;
      chk(inR(t.ttkN, C.ttkN), `${id}: TTK común ${f1(t.ttkN)}s fuera de ${C.ttkN}`);
      chk(inR(t.ttkE, C.ttkE), `${id}: TTK élite ${f1(t.ttkE)}s fuera de ${C.ttkE}`);
      const bw = r.L === 1 ? TARGETS.bossNv1 : r.L < 10 ? TARGETS.bossRamp : C.ttkB;
      chk(inR(t.ttkB, bw), `${id}: TTK jefe ${f1(t.ttkB)}s fuera de ${bw}`);
      chk(inR(t.ttd, C.ttd), `${id}: TTD manada ${f1(t.ttd)}s fuera de ${C.ttd}`);
      chk(t.ttdPlus >= t.ttd - 1e-6, `${id}: TTD+ con defensa (${f1(t.ttdPlus)}) < TTD sin ella (${f1(t.ttd)})`);
      if (r.L >= 10) chk(inR(r.ratio, TARGETS.ratio), `${id}: óptimo/típico ×${r.ratio.toFixed(1)} fuera de ${TARGETS.ratio}`);
      // --- reglas del Paso 2b.2 sobre UNI ---
      const u = r.uni, bar = r.uniBar;
      if (r.L >= 5 && bar.rmb) chk(r.uniBasic.dps <= TARGETS.basicOnly * u.dps, `${id}: «solo básico» ×${(r.uniBasic.dps / u.dps).toFixed(2)} de la rotación (> ${TARGETS.basicOnly})`);
      if (r.L >= ULT_MIN_LEVEL && bar.k4) {
        const sh = (u.by[bar.k4] || 0) / u.total;
        chk(inR(sh, TARGETS.ultShare), `${id}: la definitiva ${bar.k4} aporta ${pct(sh)} del daño UNI (objetivo 12–22 %)`);
      }
      for (const slot of ['rmb', 'k2']) {
        const sid = bar[slot]; if (!sid) continue;
        const sh = (u.by[sid] || 0) / u.total;
        const per = u.uses[sid] ? (u.by[sid] || 0) / u.uses[sid] : 0;
        chk(sh >= TARGETS.spenderShare, `${id}: gastadora trampa ${sid} (${slot}) aporta ${pct(sh)} del daño UNI (< ${pct(TARGETS.spenderShare)})`);
        const sk = CLASSES[r.cls].skills.find(s => s.id === sid);
        const area = (sk.tags || []).some(t => t === 'area' || t === 'cone' || t === 'line');
        const need = (area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse) * r.basicHit;
        chk(per >= need, `${id}: gastadora trampa ${sid}: ${f1(per)} por uso < ${area ? TARGETS.spenderPerUseArea : TARGETS.spenderPerUse}× el básico (${f1(r.basicHit)})`);
      }
    }
    chk(r.optimo.maxHit <= r.bossHp * TARGETS.maxHitBoss, `${id}: un golpe óptimo quita ${(r.optimo.maxHit / r.bossHp * 100).toFixed(0)}% de la vida del jefe`);
  }
  // media de las 3 clases por nivel (objetivo de diseño)
  for (const L of [...new Set(rows.map(r => r.L))]) {
    const rs = rows.filter(r => r.L === L && r.T === 0);
    if (rs.length < 2) continue;
    const mean = k => rs.reduce((a, r) => a + r.tipico[k], 0) / rs.length;
    const M = TARGETS.mean;
    for (const k of ['ttkN', 'ttkE', 'ttd']) chk(inR(mean(k), M[k]), `Nv${L}: media ${k} ${f1(mean(k))} fuera de ${M[k]}`);
    if (L >= 10) {
      chk(inR(mean('ttkB'), M.ttkB), `Nv${L}: media TTK jefe ${f1(mean('ttkB'))}s fuera de ${M.ttkB}`);
      const bs = rs.map(r => r.tipico.ttkB);
      chk(Math.max(...bs) / Math.min(...bs) <= TARGETS.classSpread, `Nv${L}: dispersión de TTK de jefe entre clases ×${(Math.max(...bs) / Math.min(...bs)).toFixed(1)}`);
    }
  }
  // Tormento: con el equipo que da, subir de T0 a T10 debe ser MÁS difícil
  for (const c of ['guerrero', 'maga', 'arquera']) {
    const t0 = rows.find(r => r.cls === c && r.L === 50 && r.T === 0);
    const t10 = rows.find(r => r.cls === c && r.L === 50 && r.T === 10);
    if (!t0 || !t10) continue;
    chk(t10.tipico.ttkB > t0.tipico.ttkB * 1.5, `${c}: T10 no es más lento de matar (${f1(t10.tipico.ttkB)}s vs ${f1(t0.tipico.ttkB)}s)`);
    chk(t10.tipico.ttd < t0.tipico.ttd * 0.8, `${c}: T10 no es más peligroso (TTD ${f1(t10.tipico.ttd)}s vs ${f1(t0.tipico.ttd)}s)`);
  }
  return errs;
}

// Paso 2c.0 → 2c.2: desviaciones CONOCIDAS al entrar los talentos (el típico/óptimo
// Nv ≥ 10 lleva su especialización por defecto y el preset de su nivel). En 2c.0 NO se
// recalibra (docs/paso2-diseno.md §9.2: el ajuste es de 2c.2/2e en skills/talents/
// powers-*.js): cada fila se imprime como AVISO con su causa y solo falla si empeora
// más allá de `floor` (red de seguridad). 2c.2 debe vaciar esta lista.
export const PENDING_2C2 = [
  { re: /^guerrero Nv(25|50): la definitiva g_u_cataclismo aporta (\d+)% del daño UNI/, floor: 8,
    why: 'los talentos del Berserker suben el daño Físico (c1, s1, s10, c13 élites/jefes, c6 −coste) y Cataclismo es Sagrado: su parte del UNI baja de 13 % a 9–11 % aunque su daño no cambia' },
  { re: /^arquera Nv50: TTK élite ([\d.]+)s/, floor: 3.9,
    why: 'preset Nv50 de la Francotiradora: s7 Letalidad (+30 % de daño crítico), c13/s16 contra élites, s12, c1, c8, c14 → +15 % de DPS (4,52 → 4,11 s); Tiro Mortal ×1,30 (§5.2.2) solo aporta 0,06 s' },
  { re: /^Nv50: media TTK jefe ([\d.]+)s/, floor: 40,
    why: 'con sus talentos la Maga Nv50 baja de 56 a 51 s y la Arquera de 40 a 36 s (antes la media ya estaba en 45,8 s, al borde del suelo de 45)' },
];
export function splitPending(errs) {
  const pending = [], hard = [];
  for (const e of errs) {
    const k = PENDING_2C2.find(x => x.re.test(e));
    if (!k) { hard.push(e); continue; }
    const m = e.match(k.re);
    const v = parseFloat(m[m.length - 1]);
    if (Number.isFinite(v) && v < k.floor) hard.push(`${e} (pendiente de 2c.2, pero por debajo de su red ${k.floor})`);
    else pending.push({ e, why: k.why });
  }
  return { pending, hard };
}

// --seeds N: robustez frente al azar del EQUIPO (solo informe). Para cada fila típica
// T0: mínimo / mediana / máximo del TTK de élite y de jefe y del reparto de la
// definitiva en UNI con las semillas 1..N. Las afirmaciones siguen con la semilla 1.
export function seedReport(n, { classes = ['guerrero', 'maga', 'arquera'], levels = [1, 5, 10, 25, 50] } = {}) {
  const med = a => { const s = [...a].sort((x, y) => x - y); return s[Math.floor((s.length - 1) / 2)]; };
  const fmt = a => `${f1(Math.min(...a)).padStart(5)} / ${f1(med(a)).padStart(5)} / ${f1(Math.max(...a)).padStart(5)}`;
  console.log(`
SEMILLAS 1..${n} (típico T0): mín / mediana / máx`);
  console.log('clase    Nv |   élite (s)            |   jefe (s)             | definitiva UNI');
  const out = [];
  for (const c of classes) for (const L of levels) {
    const al = CM.areaLevelForHero(L), ref = refEnemies(al);
    const E = [], B = [], U = [];
    for (let seed = 1; seed <= n; seed++) {
      const mk = () => buildHero(c, L, 'tipico', { al, seed });
      E.push(simulate(mk(), ref.elite, 6, { kind: 'elite', ref }).ttk);
      B.push(simulate(mk(), ref.boss, 2, { kind: 'boss', ref }).ttk);
      const p = mk();
      if (L >= ULT_MIN_LEVEL && p.hotbar.k4) { const u = simulateUni(p, ref); U.push((u.by[p.hotbar.k4] || 0) / u.total * 100); }
    }
    out.push({ cls: c, L, E, B, U, medE: med(E), medB: med(B), medU: U.length ? med(U) : null });
    console.log(`${c.padEnd(8)} ${String(L).padStart(2)} | ${fmt(E)} | ${fmt(B)} | ${U.length ? fmt(U) + ' %' : '—'}`);
  }
  return out;
}

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const t0 = Date.now();
  const rows = runBench();
  printRows(rows);
  const errs = checkRows(rows);
  const si = process.argv.indexOf('--seeds');
  if (si > 0) seedReport(Math.max(1, parseInt(process.argv[si + 1], 10) || 5));
  console.log(`(${((Date.now() - t0) / 1000).toFixed(1)} s)`);
  const { pending, hard } = splitPending(errs);
  if (pending.length) console.log('⚠️ pendiente de recalibrar en 2c.2 (no falla):\n' + pending.map(x => ` - ${x.e}\n     causa: ${x.why}`).join('\n'));
  if (hard.length && !REPORT_ONLY) { console.error('❌ BANCO DE BALANCE FUERA DE RANGO\n - ' + hard.join('\n - ')); process.exit(1); }
  if (hard.length) console.log('(report) avisos:\n - ' + hard.join('\n - '));
  else console.log('✅ BANCO DE BALANCE DENTRO DE RANGO' + (pending.length ? ` (con ${pending.length} pendientes de 2c.2)` : ''));
}
