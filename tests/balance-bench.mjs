// ============================================================
// BANCO DE BALANCE (Paso 1A) — rotaciones REALES de las 3 clases
// ============================================================
// Simula combates contra enemigos común/élite/jefe con:
//  - héroes construidos con el código real (Player.recompute, generateItem,
//    maestría, paragon, bendiciones, soportes, modificadores de habilidad);
//  - las fórmulas de combat-math (las mismas que usan castSkillSlot,
//    Player.rollDamage y Enemy.takeDamage): perfil de habilidad, saco aditivo,
//    crítico topado, multiplicadores [×] (máx 3), Vulnerable, CDR con tope,
//    coste/recurso (Furia/Maná/Energía con su generación y regeneración);
//  - azar con semilla fija (js/rng.js) → resultados reproducibles.
// Supuestos documentados (MEMORIA.md, Paso 1A):
//  - objetivo único (las AoE/rebotes/multiproyectil no suman objetivos extra);
//  - "humano": como mucho 1 acción cada ACTION_LOCK s; prioridad = buffs que
//    no están activos → habilidad lista de mayor coeficiente → básico;
//  - TTK común/élite: cadena de N combates seguidos (los CD y el recurso
//    continúan entre combates, con WALK s de desplazamiento);
//  - TTD: manada (1 campeón + 4 comunes del nivel de área) pegando cuerpo a
//    cuerpo sin parar, el héroe sin mitigación activa (ni pociones, ni
//    esquiva, ni robo de vida): solo armadura/bloqueo/resistencias y regen.
// Uso: `node tests/balance-bench.mjs` (afirma) · `--report` (solo imprime)
// ============================================================
import { Player } from '../js/entities.js';
import { generateItem } from '../js/items.js';
import { CLASSES, ENEMIES, ELITE_MODS, ENEMY_RANKS, bossForFloor, scaleEnemy, skillVal, synergyBonus,
  aggregateSkillMods, SKILL_MODS, MASTERIES, paragonBoardFor, BLESSINGS, blessingValue } from '../js/data.js';
import * as CM from '../js/combat-math.js';
import { createRng, hashSeed } from '../js/rng.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const REPORT_ONLY = process.argv.includes('--report');
const fake = () => ({
  ui: { spawnText() {}, message() {}, flashDamage() {}, levelUpFlash() {} },
  sfx() {}, addShake() {}, vibrate() {}, tip() {}, spawnBurst() {}, onPlayerDeath() {},
  input: { joyDir: null, keyDir: null }, enemies: [], nearestEnemy() { return null; },
});

const DT = 0.05, ACTION_LOCK = 0.3, WALK = 0.6;
const SLOTS = [['weapon', 'weapon'], ['offhand', 'offhand'], ['helm', 'helm'], ['shoulders', 'shoulders'],
  ['chest', 'chest'], ['gloves', 'gloves'], ['belt', 'belt'], ['pants', 'pants'], ['boots', 'boots'],
  ['amulet', 'amulet'], ['ring', 'ring'], ['ring2', 'ring']];
// rotación (orden = prioridad de aprendizaje)
const ROT = {
  guerrero: ['torbellino', 'g_martillo', 'terremoto', 'grito_guerra', 'g_salto', 'g_u_cataclismo', 'g_p_fuerza'],
  maga: ['bola_fuego', 'rayo', 'nova_hielo', 'meteoro', 'm_u_supernova', 'm_p_arcano'],
  arquera: ['flecha_perforante', 'flecha_multiple', 'agilidad', 'lluvia_flechas', 'a_u_diluvio', 'a_p_punteria'],
};
const MASTERY_PICK = { guerrero: 'berserker', maga: 'piromante', arquera: 'francotiradora' };
const PARAGON_ORDER = ['4_3', '4_5', '4_2', '4_6', '4_1', '4_7', '3_2', '5_2', '3_6', '5_6', '4_0', '4_8',
  '3_4', '5_4', '2_4', '6_4', '1_4', '7_4', '2_3', '2_5', '6_3', '6_5', '0_4', '8_4', '3_3', '5_3', '3_5', '5_5'];

function itemValue(it) {
  const a = it.affixes || {};
  return (it.dmg ? (it.dmg[0] + it.dmg[1]) * 2 : 0) + (it.arm || 0) + (a.hp || 0) * 0.5 +
    (a.dmgPct || 0) * 2 + (a.crit || 0) * 2 + (a.fue || 0) + (a.des || 0) + (a.ene || 0) + (a.vit || 0) + (a.aspdPct || 0);
}

// build: 'tipico' (raros, sin soportes/mods, maestría y paragon en orden natural)
//        'optimo' (legendarios calidad máx. con poderes elegidos, soportes,
//                  mods, paragon con glifos r10, bendiciones de grieta)
export function buildHero(classId, level, build, { al = CM.areaLevelForHero(level), torment = 0, seed = 1 } = {}) {
  const rng = createRng(hashSeed('bench', classId, level, build, al, torment, seed));
  const p = new Player(fake(), classId);
  p.combatRng = rng.fork('combate');
  p.level = level;
  const cls = CLASSES[classId];
  const pts = 5 * (Math.min(level, 20) - 1);
  p.attributes[cls.mainStat] += Math.round(pts * 0.6);
  p.attributes.vit += pts - Math.round(pts * 0.6);
  // habilidades: aprende la rotación en orden y luego sube rangos
  let sp = Math.min(level, 20) - 1;
  const avail = ROT[classId].map(id => cls.skills.find(s => s.id === id)).filter(s => s && s.req <= level);
  for (const s of avail) if (sp > 0) { p.skills[s.id] = 1; sp--; }
  for (const s of avail) while (sp > 0 && p.skills[s.id] < s.max) { p.skills[s.id]++; sp--; }
  const opt = build === 'optimo';
  // equipo: ilvl del área (acotado) y calidad del Tormento (combat-math)
  const il = CM.itemLevel(al);
  const q = CM.tormentMods(torment).quality;
  const irng = rng.fork('items');
  for (const [slot, kind] of SLOTS) {
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) {
      const it = generateItem(il, opt ? 'legendario' : 'raro', kind, null, classId, irng);
      const v = itemValue(it);
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
  // maestría (1 punto cada 2 niveles desde el 12): nodos en orden de la lista
  if (level >= 12) {
    const m = MASTERIES[classId].find(x => x.id === MASTERY_PICK[classId]);
    let mp = Math.floor((level - 12) / 2) + 1;
    p.mastery = { id: m.id, nodes: {}, points: 0 };
    for (const n of m.nodes) if (mp > 0 && Object.keys(p.mastery.nodes).length >= n.req) { p.mastery.nodes[n.id] = true; mp--; }
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
  // soportes y modificadores (solo el óptimo)
  if (opt) {
    for (const s of cls.skills) {
      if (s.kind === 'passive') continue;
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
  return p;
}

// --- enemigos de referencia de un nivel de área ---
export function refEnemies(al, torment = 0) {
  const pool = ENEMIES.filter(e => e.minFloor <= al && e.weight > 0);
  const W = pool.reduce((s, e) => s + e.weight, 0);
  const sc = pool.map(e => ({ e, s: scaleEnemy(e, al) }));
  const tm = CM.tormentMods(torment);
  const hp = sc.reduce((s, x) => s + x.s.hp * x.e.weight, 0) / W * tm.hp;
  const dps = sc.reduce((s, x) => s + x.s.dmg / x.e.atkTime * x.e.weight, 0) / W * tm.dmg;
  const eliteMod = ELITE_MODS.reduce((s, m) => s + (m.hp || 1), 0) / ELITE_MODS.length;
  const boss = scaleEnemy(bossForFloor(al), al);
  return {
    common: hp,
    elite: hp * ENEMY_RANKS.elite.hp * eliteMod,
    boss: boss.hp * tm.hp,
    commonDps: dps, champDps: dps * ENEMY_RANKS.campeon.dmg,
  };
}

// --- simulación de rotación contra una cadena de objetivos ---
export function simulate(p, hpEach, count, { boss = false } = {}) {
  const cls = p.cls, res = cls.resource || {};
  const wb = cls.skills.find(s => s.kind === 'basic' && s.type === 'weapon');
  const bm = aggregateSkillMods(wb.id, p.skillMods?.[wb.id]);
  const rot = ROT[p.classId].map(id => cls.skills.find(s => s.id === id))
    .filter(s => s && p.skills[s.id] > 0 && s.kind !== 'passive')
    .map(s => {
      const lvl = p.skills[s.id], sups = p.supports[s.id] || [], m = aggregateSkillMods(s.id, p.skillMods?.[s.id]);
      return { s, lvl, sups, m, cost: Math.round(skillVal(s.mana, lvl) * CM.skillCostMult(sups)),
        prof: CM.skillProfile({ mult: s.mult ? skillVal(s.mult, lvl) : 1, synergyPct: synergyBonus(s, p.skills), sups, mods: m, critBonus: s.critBonus || 0 }) };
    })
    .sort((a, b) => (b.s.type === 'buff') - (a.s.type === 'buff') || b.prof.coef * (1 + b.prof.addPct / 100) - a.prof.coef * (1 + a.prof.addPct / 100));
  const cds = {}; let atkCd = 0, lock = 0, t = 0, dealtAll = 0, maxHit = 0, idle = 0;
  const pending = []; // [{at, dmg}] golpes diferidos (Eco, tics de DoT/Estela)
  const kills = [];
  for (let k = 0; k < count; k++) {
    const tgt = { hp: hpEach, max: hpEach, vulnT: 0, slowT: 0 };
    const t0 = t;
    const hit = (dmg, crit, proc = false) => {
      let d = dmg;
      if (tgt.vulnT > 0) d *= CM.VULN_MULT;
      if (!proc) d *= CM.multiplierProduct(p.powers, { hpFrac: p.hp / p.stats.maxHP, targetFrac: tgt.hp / tgt.max, targetSlowed: tgt.slowT > 0, crit }, p.extraMultipliers);
      d = Math.max(1, Math.round(d));
      if (d > maxHit) maxHit = d;
      tgt.hp -= d; dealtAll += d;
    };
    const effects = (m, sups, s, avg) => {
      if (m.vuln) tgt.vulnT = Math.max(tgt.vulnT, m.vuln);
      const slow = sups.includes('freeze') ? 3 : Math.max(s?.slow || 0, m.slow || 0);
      if (slow) tgt.slowT = Math.max(tgt.slowT, slow);
      const dot = sups.includes('poison') || m.dot === 'poison' ? [0.9, 5, 1.0] : sups.includes('bleed') || m.dot === 'bleed' ? [0.6, 3, 1.0] : m.dot === 'burn' ? [0.8, 4, 0.8] : null;
      if (dot) { const tot = avg * dot[0] * (sups.includes('lasting') ? 1.5 : 1); for (let i = 1; i <= dot[1]; i++) pending.push({ at: t + i * dot[2], dmg: tot / dot[1] }); }
      if (m.zone) for (let i = 1; i <= 8; i++) pending.push({ at: t + i * 0.5, dmg: avg * 0.45 * 0.5 });
    };
    let guard = 0;
    while (tgt.hp > 0 && guard++ < 40000) {
      // regeneración / tiempos (réplica de Player.update)
      if (!(res.decay && !res.regen)) p.mp = Math.min(p.stats.maxMP, p.mp + CM.resourceRegen(res.regen ?? 1, p.stats.ene) * DT);
      let exp = false;
      for (const b of p.buffs) { b.t -= DT; if (b.t <= 0) exp = true; }
      if (exp) { p.buffs = p.buffs.filter(b => b.t > 0); p.recompute(); }
      for (const id in cds) cds[id] = Math.max(0, cds[id] - DT);
      atkCd = Math.max(0, atkCd - DT); lock = Math.max(0, lock - DT);
      tgt.vulnT = Math.max(0, tgt.vulnT - DT); tgt.slowT = Math.max(0, tgt.slowT - DT);
      for (let i = pending.length - 1; i >= 0; i--) if (pending[i].at <= t) { hit(pending[i].dmg, false); pending.splice(i, 1); }
      if (lock <= 0) {
        const r = rot.find(x => (cds[x.s.id] || 0) <= 0 && p.mp >= x.cost && !(x.s.type === 'buff' && p.buffs.some(b => b.id === x.s.id)));
        if (r) {
          const { s, lvl, sups, m, prof } = r;
          p.mp -= r.cost; if (m.gen) p.mp = Math.min(p.stats.maxMP, p.mp + m.gen);
          if (s.type === 'buff') {
            const stats = {}; const bmul = 1 + (m.buff || 0) / 100;
            for (const [kk, arr] of Object.entries(s.buff)) stats[kk] = Math.round(skillVal(arr, lvl) * bmul);
            p.addBuff(s.id, stats, s.dur * (1 + (m.dur || 0) / 100) * (sups.includes('lasting') ? 1.8 : 1));
          } else {
            const cb = prof.critBonus + (sups.includes('coldblood') && tgt.slowT > 0 ? CM.COLDBLOOD_CRIT : 0);
            const { dmg, crit } = p.rollDamage(prof.coef, cb, prof.addPct);
            hit(dmg, crit);
            effects(m, sups, s, p.avgHit(prof.coef, prof.addPct));
            if (sups.includes('echo') || m.echo) { const e = p.rollDamage(prof.coef * (m.echo ? 0.6 : 0.5), prof.critBonus, prof.addPct); pending.push({ at: t + 0.5, dmg: e.dmg }); }
          }
          cds[s.id] = CM.skillCooldown(s.cd, p.stats.cdr, m, sups, false);
          lock = ACTION_LOCK;
        } else if (atkCd <= 0) {
          const { dmg, crit } = p.rollDamage(1, bm.crit || 0, bm.dmg || 0);
          hit(dmg, crit);
          effects(bm, [], null, p.avgHit(1, bm.dmg || 0));
          p.mp = Math.min(p.stats.maxMP, p.mp + (res.gen || 0) + (bm.gen || 0));
          atkCd = p.stats.atkTime; lock = Math.min(ACTION_LOCK, p.stats.atkTime);
        } else idle += DT;
      }
      t += DT;
    }
    kills.push(t - t0);
    pending.length = 0; // los tics pendientes se pierden con el muerto
    t += WALK;
    for (const id in cds) cds[id] = Math.max(0, cds[id] - WALK);
    atkCd = 0;
    if (!(res.decay && !res.regen)) p.mp = Math.min(p.stats.maxMP, p.mp + CM.resourceRegen(res.regen ?? 1, p.stats.ene) * WALK);
  }
  const ttk = kills.reduce((a, b) => a + b, 0) / kills.length;
  return { ttk, dps: dealtAll / kills.reduce((a, b) => a + b, 0), maxHit };
}

// TTD contra manada (1 campeón + 4 comunes) sin mitigación activa
export function ttdPack(p, ref, al) {
  const incoming = (ref.commonDps * 4 + ref.champDps) * CM.expectedMitigation(p.stats, al);
  const regen = 0.4 + p.stats.vit * 0.02;
  return incoming <= regen ? Infinity : p.stats.maxHP / (incoming - regen);
}

// ---------------- ejecución ----------------
export function runBench({ classes = ['guerrero', 'maga', 'arquera'], levels = [1, 10, 25, 50], torment = [[50, 10]] } = {}) {
  const rows = [];
  const cases = [...levels.map(L => ({ L, T: 0 })), ...torment.map(([L, T]) => ({ L, T }))];
  for (const c of classes) for (const { L, T } of cases) {
    const al = CM.areaLevelForHero(L);
    const ref = refEnemies(al, T);
    const row = { cls: c, L, T, al };
    for (const b of ['tipico', 'optimo']) {
      const mk = () => buildHero(c, L, b, { al, torment: T });
      const n = simulate(mk(), ref.common, 24);
      const e = simulate(mk(), ref.elite, 6);
      const bo = simulate(mk(), ref.boss, 2, { boss: true });
      row[b] = { ttkN: n.ttk, ttkE: e.ttk, ttkB: bo.ttk, dps: bo.dps, maxHit: Math.max(n.maxHit, e.maxHit, bo.maxHit), ttd: ttdPack(mk(), ref, al) };
    }
    row.bossHp = ref.boss;
    row.ratio = row.optimo.dps / row.tipico.dps;
    rows.push(row);
  }
  return rows;
}

const f1 = v => (v === Infinity ? '∞' : v.toFixed(v < 10 ? 2 : 1));
export function printRows(rows) {
  console.log('clase    Nv  T  AL | TÍPICO TTK común/élite/jefe  TTD   | ÓPTIMO común/élite/jefe  TTD  | opt/típ  golpeMáx/vidaJefe');
  for (const r of rows) {
    const t = r.tipico, o = r.optimo;
    console.log(`${r.cls.padEnd(8)} ${String(r.L).padStart(2)} ${String(r.T).padStart(2)} ${String(r.al).padStart(3)} | ` +
      `${f1(t.ttkN).padStart(5)} ${f1(t.ttkE).padStart(5)} ${f1(t.ttkB).padStart(6)}  ${f1(t.ttd).padStart(5)} | ` +
      `${f1(o.ttkN).padStart(5)} ${f1(o.ttkE).padStart(5)} ${f1(o.ttkB).padStart(6)}  ${f1(o.ttd).padStart(5)} | ` +
      `×${r.ratio.toFixed(1).padStart(4)}   ${(o.maxHit / r.bossHp * 100).toFixed(1)}%`);
  }
}

// OBJETIVOS (héroe típico, T0). Dos niveles de exigencia:
//  - DISEÑO: la MEDIA de las 3 clases dentro del objetivo del Paso 1A
//    (común 0,6–1,5 s · élite 5–10 · jefe 45–90 · TTD 6–10), con un margen pequeño;
//  - CLASE: cada clase por separado con tolerancia (hasta el rework de clases
//    hay diferencias de rol: la Maga/Arquera revientan antes, el Guerrero aguanta).
// El Nv1 solo tiene el ataque básico (sin ráfaga): su jefe tiene tope propio.
export const TARGETS = {
  mean: { ttkN: [0.6, 1.5], ttkE: [4.5, 10.5], ttkB: [45, 90], ttd: [6, 10] },
  cls: { ttkN: [0.45, 1.8], ttkE: [3.5, 13], ttkB: [35, 100], ttd: [5, 12] },
  bossNv1: [35, 150],
  ratio: [1.3, 15],        // DPS óptimo / típico (Nv ≥ 10)
  classSpread: 2.5,        // jefe: clase más lenta / más rápida (Nv ≥ 10)
  maxHitBoss: 0.25,        // un golpe del óptimo ≤ 25 % de la vida del jefe
};

const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) {
  const rows = runBench();
  printRows(rows);
  const errs = [];
  const chk = (ok, msg) => { if (!ok) errs.push(msg); };
  const inR = (v, [lo, hi]) => v >= lo && v <= hi;
  for (const r of rows) {
    const id = `${r.cls} Nv${r.L}${r.T ? ' T' + r.T : ''}`;
    if (r.T === 0) {
      const t = r.tipico, C = TARGETS.cls;
      chk(inR(t.ttkN, C.ttkN), `${id}: TTK común ${f1(t.ttkN)}s fuera de ${C.ttkN}`);
      chk(inR(t.ttkE, C.ttkE), `${id}: TTK élite ${f1(t.ttkE)}s fuera de ${C.ttkE}`);
      const bw = r.L === 1 ? TARGETS.bossNv1 : C.ttkB;
      chk(inR(t.ttkB, bw), `${id}: TTK jefe ${f1(t.ttkB)}s fuera de ${bw}`);
      chk(inR(t.ttd, C.ttd), `${id}: TTD manada ${f1(t.ttd)}s fuera de ${C.ttd}`);
      if (r.L >= 10) chk(inR(r.ratio, TARGETS.ratio), `${id}: óptimo/típico ×${r.ratio.toFixed(1)} fuera de ${TARGETS.ratio}`);
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
  if (errs.length && !REPORT_ONLY) { console.error('❌ BANCO DE BALANCE FUERA DE RANGO\n - ' + errs.join('\n - ')); process.exit(1); }
  if (errs.length) console.log('(report) avisos:\n - ' + errs.join('\n - '));
  else console.log('✅ BANCO DE BALANCE DENTRO DE RANGO');
}
