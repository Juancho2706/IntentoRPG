// Ronda 2 de refutación externa: modelo analítico [D] v4.2 (sin tocar el repo). node calc-r2.mjs
// Cambios frente a calc-r1*: el valor de una línea depende SOLO del ◆ (problema 1); Vida implícita
// en las armaduras (problema 5); pools v4 sin Principal en las armaduras; «% Daño de tus <cat>» en vez
// de «% elemento» (problema 8); Coste fundido en Recurso; paridad por clase (IT6) y por pool en g (IT6b).
// v4.2 (verificación de las objeciones altas, 22-oct-2026):
//  · tablero G 7 / M 9 / A 12 (paragon-board.js:24-38: legendario + raro + 3 nodos mágicos del brazo ofensivo);
//  · crítico condicional de cada especialización en su estado normal (SPEC, con citas al código);
//  · SOBRECRÍTICO: la probabilidad se topa en 60 (combat-math.js:45), pero lo que sobra no se pierde: el extra de
//    tus críticos se multiplica por crítico/60. El daño esperado queda lineal en el crítico (critFactor 'exact');
//  · IT6 por EJE (el método de la tabla de §4.4) y por especialización; IT3 (valor que retiene una línea de crítico);
//  · perfil «hoy» (items.js:7-61, 196-272; bench-core.mjs:68-119, 213-220) para la tabla «frente a hoy» de §10.
const G = n => Math.pow(1.065, Math.max(0, n - 1));
const P = n => Math.pow(1.035, n - 52);                     // curva de las líneas % y del Principal
const sFlat = n => G(n) / G(52), sPct = n => P(n);
const r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100, pc = x => (x * 100).toFixed(1) + ' %';
function AL(L) { if (L <= 20) return Math.max(1, L - 1); const mid = Math.round(19 + (Math.min(L, 70) - 20) * 0.55); return L <= 70 ? mid : Math.round(mid + (L - 70) * 0.1); }
const ilOf = L => Math.min(47, AL(L));
const CLS = {
  guerrero: { base: { fue: 18, des: 10, vit: 16, ene: 6 }, main: 'fue', baseHP: 45, hpPerVit: 4, hpPerLevel: 4, board: 7, shield: true },
  maga: { base: { fue: 8, des: 10, vit: 10, ene: 22 }, main: 'ene', baseHP: 70, hpPerVit: 3, hpPerLevel: 6, board: 9 },
  arquera: { base: { fue: 10, des: 20, vit: 12, ene: 8 }, main: 'des', baseHP: 65, hpPerVit: 3.5, hpPerLevel: 6, board: 12 },
};
function attrs(c, L) { const a = { ...CLS[c].base }; const pts = 5 * (Math.min(L, 20) - 1); a[CLS[c].main] += Math.round(pts * 0.6); a.vit += pts - Math.round(pts * 0.6); return a; }
const STEP = [0, 0.70, 0.775, 0.85, 0.925, 1.0, 1.5];
// v4.1 (R1-B-2): crítico de talentos = nodo de clase c13 (Golpes Precisos / Mente Afilada / Ojo de Halcón),
// 2 rangos × 5 en TODAS las builds recomendadas (talents-<clase>.js; scaleFx multiplica por rango).
// Con 20 puntos de clase (Nv50) ya está tomado; en el Nv20 (5 puntos) todavía no. La v4 usaba +5 fijo.
const TAL_CRIT = L => (L >= 50 ? 10 : 0);
// v4.2: crítico condicional por especialización (estado normal de juego). st = suma a todos sus golpes en ese
// estado; sk = suma a su habilidad principal; stMax/skMax = la build recomendada que más suma.
//  berserker  (estampida): Rajar b2 r3 +15 (talents-guerrero.js:133) y c20 Desequilibrio +10 a principales contra
//             ralentizados (:95; powers-guerrero.js:83, 1131). Sangre y Acero: Campeón l10 +10 contra tu Rival (:1643).
//  guardian   (guardia): nada; Sismo y Vanguardia llevan c20 (+10 a principales contra ralentizados).
//  cruzado    (celestial): Campeón l10 +10 contra tu Rival y c20 +10 a principales contra ralentizados.
//  piromante  (todas): Calor Abrasador s2 r3 +15 contra objetivos en llamas (talents-maga.js:145; combat-math.js:390).
//  crionte    (todas): Filo Helado i2 r3 +15 con ≥ 3 capas (talents-maga.js:211; powers-maga.js:195, 2134);
//             3 de 4 builds (no Glaciar): c20 Escarcha Arcana, Dardo +15 contra ralentizados (:107; powers-maga.js:1510).
//  arcanista  (rayo): Resonancia a16 r2 +12 con 4 Cargas (:311; powers-maga.js:2610) + Mente Brillante a2 r1 +5 con
//             ≥ 2 Cargas (:277; mech-maga.js:186) y Rayo +20 (a11 r2, :302). Orbe, Grieta y Rayo Orbital: a2 r3 (+15).
//  francotiradora: Concentración llena +15 (mech-arquera.js:28, 118). Tiradora y Montaraz: nada.
const SPEC = {
  berserker: { cls: 'guerrero', st: 0, sk: 25, stMax: 10, skMax: 25 },
  guardian: { cls: 'guerrero', st: 0, sk: 0, stMax: 0, skMax: 10 },
  cruzado: { cls: 'guerrero', st: 10, sk: 10, stMax: 10, skMax: 10 },
  piromante: { cls: 'maga', st: 15, sk: 0, stMax: 15, skMax: 0 },
  crionte: { cls: 'maga', st: 15, sk: 0, stMax: 15, skMax: 15 },
  arcanista: { cls: 'maga', st: 17, sk: 20, stMax: 27, skMax: 20 },
  tiradora: { cls: 'arquera', st: 0, sk: 0, stMax: 0, skMax: 0 },
  francotiradora: { cls: 'arquera', st: 15, sk: 0, stMax: 15, skMax: 0 },
  montaraz: { cls: 'arquera', st: 0, sk: 0, stMax: 0, skMax: 0 },
};
const SK_SHARE = 0.45; // parte del DPS de la habilidad principal (para el crítico medio de la paridad)
// TOPES v4 (◆52, paso 5, peso 1). Los % se escalan ×0,814 frente a la v3 para conservar la línea típica (◆47, paso 3).
export const TOP = { main: +(process.env.T_MAIN||10), dmgPct: +(process.env.T_DMG||12), catDmg: +(process.env.T_CAT||26), crit: +(process.env.T_CRIT||5.5), critDmg: +(process.env.T_CD||45), aspdPct: +(process.env.T_ASPD||18), hp: +(process.env.T_HP||120), arm: +(process.env.T_ARM||115), dr: +(process.env.T_DR||5.5), lph: +(process.env.T_LPH||15), cdr: +(process.env.T_CDR||9.5), res: +(process.env.T_RES||28), spdPct: 0, dodge: +(process.env.T_DODGE||0.6), block: 7.5 };
const FLAT = new Set(['hp', 'arm', 'lph']);
export const lineVal = (k, no, step, w) => TOP[k] * (FLAT.has(k) ? sFlat(no) : sPct(no)) * w * STEP[step];
// ranuras v4: peso, implícitos (armadura y vida) y pool
const SL = {
  weapon: { w: 0.75, arm: 0, hp: 0, pool: ['main', 'dmgPct', 'catDmg', 'critDmg', 'aspdPct', 'lph'], gem: 'dmgPct' },
  gloves: { w: 0.75, arm: 0.7, hp: 0.7, pool: ['main', 'dmgPct', 'catDmg', 'critDmg', 'aspdPct'], gem: 'critDmg' },
  amulet: { w: 0.70, arm: 0, hp: 0, pool: ['dmgPct', 'catDmg', 'critDmg', 'hp'], gem: 'dmgPct' },
  ring1: { w: 0.5625, arm: 0, hp: 0, pool: ['dmgPct', 'catDmg', 'crit', 'critDmg', 'hp', 'lph'], gem: 'critDmg' },
  ring2: { w: 0.5625, arm: 0, hp: 0, pool: ['dmgPct', 'catDmg', 'crit', 'critDmg', 'hp', 'lph'], gem: 'dmgPct' },
  offhand: { w: 0.75, arm: 0, hp: 0.7, pool: ['dr', 'cdr', 'lph', 'res', 'catDmg'], gem: 'cdr' },
  helm: { w: 1.0, arm: 1.0, hp: 1.0, pool: ['hp', 'arm', 'cdr', 'res', 'dodge'], gem: 'hp' },
  chest: { w: 1.0, arm: 1.5, hp: 1.5, pool: ['hp', 'arm', 'dr', 'res', 'lph'], gem: 'hp' },
  belt: { w: 0.75, arm: 0.7, hp: 0.7, pool: ['hp', 'arm', 'dr', 'res'], gem: 'hp' },
  boots: { w: 0.75, arm: 1.0, hp: 1.0, pool: ['hp', 'arm', 'dodge', 'res'], gem: 'hp' },
};
const K_HP = +(process.env.K_HP||5.5);   // vida implícita = K_HP × G(◆) × mult
const CAT_SHARE = 0.45; // parte del DPS de la categoría del «% daño de tus <cat>» (mediana; el banco lo mide por build)
const F = { basic: 0.30, cd: 0.40, resLimited: 0.20 };
// equipo típico = composición media del pool (3 de |pool| líneas) al paso 3 + gema grado 3 de su ranura
function gearTotals(no, { step = 3, gemGrade = 3, lines = true, shield = false, mult = 1 } = {}) {
  const t = { armI: 0, hpI: 0 }; for (const k of Object.keys(TOP)) t[k] = 0;
  for (const [id, s] of Object.entries(SL)) {
    t.armI += 2 * G(no) * 1.25 * (s.arm + (id === 'offhand' && shield ? 1.3 : 0));
    t.hpI += K_HP * G(no) * s.hp;
    if (!lines) continue;
    const pool = id === 'offhand' && shield ? ['dr', 'cdr', 'lph', 'arm', 'block'] : s.pool;
    for (const k of pool) t[k] += lineVal(k, no, step, s.w) * 3 / pool.length * mult;
    t[s.gem] += lineVal(s.gem, no, gemGrade, s.w) * mult;
  }
  return t;
}
// Factor de crítico esperado. B = extra de un crítico sobre un golpe normal (CRIT_MULT 1,5 y el daño crítico en el saco [+]).
//  'exact' (v4.2, sobrecrítico): probabilidad topada en 60 y el extra × (crítico/60) por encima ⇒ 1 + crítico·B (lineal).
//  'cap'   (hoy, combat-math.js:169): 1 + mín(60, crítico)·B; lo que sobra no da nada.
//  número k: lo que sobra pasa a daño crítico a k puntos por punto (la propuesta del verificador, k ≈ 2).
function critFactor(raw, sigma, cd, over = 'exact') {
  const B = x => 1.5 * (1 + (sigma + x) / 100) / (1 + sigma / 100) - 1;
  if (over === 'exact') return 1 + Math.max(0, raw) / 100 * B(cd);
  const c = Math.min(60, Math.max(0, raw));
  if (over === 'cap') return 1 + c / 100 * B(cd);
  return 1 + c / 100 * B(cd + over * Math.max(0, raw - 60));
}
export function hero(c, L, { no = ilOf(L), lines = true, step = 3, gemGrade = 3, extra = {}, S0 = 60, implicit = true, mult = 1, cb = 0, era = 0, over = 'exact' } = {}) {
  const al = AL(L), a = attrs(c, L), C = CLS[c];
  const g = gearTotals(no, { step, gemGrade, lines, shield: C.shield, mult });
  if (!implicit) { g.armI = 0; g.hpI = 0; }
  for (const [k, v] of Object.entries(extra)) g[k] = (g[k] || 0) + v;
  const critRaw = 5 + 0.15 * a.des + TAL_CRIT(L) + (L >= 81 ? C.board : 0) + g.crit + cb + era;
  const crit = Math.min(60, critRaw);
  const sigma = S0 + g.dmgPct + g.catDmg * CAT_SHARE;
  const critMult = critFactor(critRaw, sigma, g.critDmg, over);
  const W = implicit ? 3 * G(no) * 1.69 : 3 * G(1) * 1.69;
  const D = W * (1 + sigma / 100) * (1 + (a[C.main] + g.main) / 100) * critMult * (1 + F.basic * Math.min(100, g.aspdPct) / 100)
    * (1 + F.cd * (1 / (1 - Math.min(50, g.cdr) / 100) - 1)) * (1 + F.resLimited * g.res / 100);
  const HP = C.baseHP + a.vit * C.hpPerVit + (L - 1) * C.hpPerLevel + g.hp + g.hpI;
  const arm = g.armI + g.arm + 0.3 * a.des;
  const mit = (1 - Math.min(0.75, arm / (arm + 60 * G(al)))) * (1 - Math.min(50, g.dr) / 100) * (1 - 0.5 * Math.min(40, g.block + (C.shield ? 10 : 0)) / 100);
  const sus = Math.min(0.06 * HP, g.lph * 2);
  const dodgeCd = Math.max(0.6, 3 - g.dodge);
  const A = (HP + 5 * sus) / mit * (1 + 0.25 * (g.spdPct + (implicit ? 10 : 0)) / 100) * (1 + 0.5 / dodgeCd - 0.5 / 3);
  return { D, A, HP, crit, critRaw, g, a, W, mainMult: 1 + (a[C.main] + g.main) / 100, armRed: 1 - (1 - Math.min(0.75, arm / (arm + 60 * G(al)))), sus };
}
const gOf = (dD, dA, w) => Math.pow(1 + dD, w) * Math.pow(1 + dA, 1 - w) - 1;
const AX = { main: 'D', dmgPct: 'D', catDmg: 'D', crit: 'D', critDmg: 'D', aspdPct: 'D', cdr: 'D', res: 'D', hp: 'A', arm: 'A', dr: 'A', lph: 'A', dodge: 'A' };
const CAT = { '⚔': ['main', 'dmgPct', 'catDmg', 'crit', 'critDmg', 'aspdPct'], '🛡': ['hp', 'arm', 'dr', 'dodge'], '✚': ['cdr', 'res', 'lph'] };
function delta(c, L, k, w = 0.55, opts = {}) {
  const h0 = hero(c, L, opts), h1 = hero(c, L, { ...opts, extra: { ...(opts.extra || {}), [k]: lineVal(k, ilOf(L), 3, 1) } });
  const dD = h1.D / h0.D - 1, dA = h1.A / h0.A - 1;
  return { dD, dA, ax: AX[k] === 'D' ? dD : dA, g: gOf(dD, dA, w) };
}
// IT6 por EJE (el método de la tabla de §4.4): cada línea frente a la mediana de su eje (Daño u Aguante) en esa clase
const DK = ['main', 'dmgPct', 'catDmg', 'crit', 'critDmg', 'aspdPct', 'cdr', 'res'], AK = ['hp', 'arm', 'dr', 'dodge', 'lph'];
const med = v => { const s = [...v].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
function axisRatios(c, L, opts = {}) {
  const d = {}; for (const k of [...DK, ...AK]) d[k] = delta(c, L, k, 0.55, opts).ax;
  const mD = med(DK.map(k => d[k])), mA = med(AK.map(k => d[k])), r = {};
  for (const k of DK) r[k] = d[k] / mD; for (const k of AK) r[k] = d[k] / mA;
  return { d, r };
}

// ---------------- perfil «hoy» (paso2-impl 4095ab6) ----------------
// Réplica de items.js generateItem (raro ×1,25 con 3–4 principales + 1 secundario; legendario ×1,5 con 4–5 + 1–2;
// ★ 8 % ×1,5; los atributos crecen 1 + 0,12·(il−1), los planos con G, los «flat» no crecen) y del perfil del banco
// (bench-core.mjs gearProfile: el mejor de 3 raros por itemValue en el típico, de 12 legendarios con el principal ×2
// en el óptimo; mediana del daño y de la armadura, media de los afijos). 12 ranuras, il = mín(40, AL), sin gemas.
// Calidad: 0 en el típico (T0) y 5 en el óptimo (×1,30 al daño del arma, a la armadura y a los afijos: entities.js:798-800, 915).
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const hashStr = s => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const AFF = [
  { stat: 'fue', min: 1, max: 3 }, { stat: 'des', min: 1, max: 3 }, { stat: 'vit', min: 1, max: 3 }, { stat: 'ene', min: 1, max: 3 },
  { stat: 'hp', min: 5, max: 12 }, { stat: 'mp', min: 4, max: 10 }, { stat: 'dmgPct', min: 4, max: 10, flat: true },
  { stat: 'crit', min: 2, max: 5, flat: true }, { stat: 'arm', min: 3, max: 8 }, { stat: 'spdPct', min: 4, max: 8, flat: true },
  { stat: 'aspdPct', min: 4, max: 9, flat: true }, { stat: 'mf', min: 5, max: 12, flat: true },
  { stat: 'lph', min: 1, max: 3, sec: true }, { stat: 'mph', min: 1, max: 2, sec: true },
  { stat: 'cdr', min: 3, max: 7, flat: true, sec: true }, { stat: 'thorns', min: 2, max: 5, sec: true },
];
const PRIM = AFF.filter(x => !x.sec), SEC = AFF.filter(x => x.sec), ATTR = ['fue', 'des', 'vit', 'ene'];
const RAR = { raro: { sm: 1.25, n: [3, 4], s: [1, 1] }, legendario: { sm: 1.5, n: [4, 5], s: [1, 2] } };
const ARMOR_HOY = ['helm', 'chest', 'boots', 'shoulders', 'gloves', 'pants', 'belt', 'offhand'];
const SLOTS_HOY = ['weapon', 'offhand', 'helm', 'shoulders', 'chest', 'gloves', 'belt', 'pants', 'boots', 'amulet', 'ring', 'ring'];
const affScale = (stat, il) => ATTR.includes(stat) ? 1 + 0.12 * (Math.max(1, il) - 1) : G(il);
function genHoy(il, rar, slot, R) {
  const ri = (lo, hi) => lo + Math.floor(R() * (hi - lo + 1));
  const it = { aff: {}, dmg: 0, arm: 0 };
  if (slot === 'weapon') { const lo = Math.max(1, Math.round(3 * G(il) * rar.sm * (0.85 + R() * 0.3))); it.dmg = lo + Math.max(lo + 1, Math.round(lo * (1.5 + R() * 0.4))); }
  else if (ARMOR_HOY.includes(slot)) {
    let a = Math.max(1, Math.round(2 * G(il) * rar.sm * (0.85 + R() * 0.3)));
    if (slot === 'chest') a = Math.round(a * 1.5); if (slot === 'offhand') a = Math.round(a * 1.3); if (slot === 'belt' || slot === 'gloves') a = Math.max(1, Math.round(a * 0.7));
    it.arm = a;
  }
  const roll = af => { let v = ri(af.min, af.max); if (!af.flat) v = Math.round(v * affScale(af.stat, il)); v = Math.round(v * rar.sm); if (R() < 0.08) v = Math.round(v * 1.5); it.aff[af.stat] = (it.aff[af.stat] || 0) + Math.max(1, v); };
  const pool = [...PRIM]; const n = ri(rar.n[0], rar.n[1]); for (let i = 0; i < n && pool.length; i++) roll(pool.splice(Math.floor(R() * pool.length), 1)[0]);
  const sp = [...SEC]; const ns = ri(rar.s[0], rar.s[1]); for (let i = 0; i < ns && sp.length; i++) roll(sp.splice(Math.floor(R() * sp.length), 1)[0]);
  return it;
}
function itemValHoy(it, main) {
  const a = it.aff, at = k => (a[k] || 0) * (!main ? 1 : k === main ? 2 : k === 'vit' ? 1 : 0.5);
  return (it.dmg ? it.dmg * (main ? 6 : 2) : 0) + (it.arm || 0) + (a.hp || 0) * 0.5 + (a.dmgPct || 0) * 2 + (a.crit || 0) * 2 + at('fue') + at('des') + at('ene') + at('vit') + (a.aspdPct || 0);
}
const PROF = new Map();
function profHoy(c, slot, il, opt) {
  const key = [c, slot, il, opt].join('|'); if (PROF.has(key)) return PROF.get(key);
  const R = mulberry32(hashStr('hoy|' + key)), N = 60, dm = [], ar = [], sum = {};
  for (let s = 0; s < N; s++) {
    let best = null, bv = -1;
    for (let i = 0; i < (opt ? 12 : 3); i++) { const it = genHoy(il, opt ? RAR.legendario : RAR.raro, slot, R); const v = itemValHoy(it, opt ? CLS[c].main : null); if (v > bv) { bv = v; best = it; } }
    dm.push(best.dmg); ar.push(best.arm); for (const [k, v] of Object.entries(best.aff)) sum[k] = (sum[k] || 0) + v;
  }
  const out = { dmg: med(dm), arm: med(ar), aff: Object.fromEntries(Object.entries(sum).map(([k, v]) => [k, v / N])) };
  PROF.set(key, out); return out;
}
const tierOf = L => (L > 20 ? Math.max(0, Math.round((L - 20) / 3)) : -1);
const blessHoy = L => { const t = tierOf(L); return t < 0 ? { dmg: 0, hp: 0, cdr: 0 } : { dmg: 8 + 2 * t, hp: 30 + 12 * t, cdr: 5 + t }; };
const blessV4 = L => { const t = Math.min(10, tierOf(L)); return t < 0 ? { dmg: 0, hp: 0, cdr: 0 } : { dmg: 8 + 2 * t, hp: 30 + 12 * t, cdr: 5 + t }; };
export function heroHoy(c, L, { opt = false, S0 = 60, bless = null } = {}) {
  const al = AL(L), il = Math.min(40, al), C = CLS[c], a = attrs(c, L), q = opt ? 1.30 : 1, b = bless || { dmg: 0, hp: 0, cdr: 0 };
  const t = { dmg: 0, arm: 0 };
  for (const slot of SLOTS_HOY) { const p = profHoy(c, slot, il, opt); t.dmg += p.dmg; t.arm += p.arm * q; for (const [k, v] of Object.entries(p.aff)) t[k] = (t[k] || 0) + v * q; }
  for (const k of ATTR) a[k] += t[k] || 0;
  const critRaw = 5 + 0.15 * a.des + TAL_CRIT(L) + (L >= 81 ? C.board : 0) + (t.crit || 0);
  const sigma = S0 + (t.dmgPct || 0) + b.dmg;
  const W = t.dmg / 2 * q;
  const D = W * (1 + sigma / 100) * (1 + a[C.main] / 100) * critFactor(critRaw, sigma, 0, 'cap') * (1 + F.basic * Math.min(100, t.aspdPct || 0) / 100)
    * (1 + F.cd * (1 / (1 - Math.min(50, (t.cdr || 0) + b.cdr) / 100) - 1));
  const HP = C.baseHP + a.vit * C.hpPerVit + (L - 1) * C.hpPerLevel + (t.hp || 0) + b.hp;
  const arm = t.arm + 0.3 * a.des;           // implícita + afijo «armadura» (los dos van a t.arm)
  const mit = 1 - Math.min(0.75, arm / (arm + 60 * G(al)));
  const sus = Math.min(0.06 * HP, (t.lph || 0) * 2);
  const A = (HP + 5 * sus) / mit * (1 + 0.25 * Math.min(50, t.spdPct || 0) / 100);
  return { D, A, HP, W, critRaw, crit: Math.min(60, critRaw), mainMult: 1 + a[C.main] / 100, t, a };
}

if (process.argv[1] && process.argv[1].endsWith('calc-r2.mjs')) {
  console.log('== (1) ◆ ordena: el valor depende solo del ◆');
  console.log('% Daño típico: il42 r5 (◆47) =', r2(lineVal('dmgPct', 47, 3, 1)), '· il47 r0 (◆47) =', r2(lineVal('dmgPct', 47, 3, 1)), '→ iguales');
  console.log('r0→r5 (+5 ◆): % y Principal ×', r2(Math.pow(1.035, 5)), '· planos ×', r2(Math.pow(1.065, 5)), '· ◆6 vale del tope: %', pc(P(6)), 'planos', pc(sFlat(6)));
  console.log('típico ◆47 paso 3 / tope: %', r2(P(47) * 0.85), '· plano', r2(sFlat(47) * 0.85));
  console.log('\n== (2) IT6 por clase: Δ en su eje de 1 línea (paso 3, ◆ de su nivel, peso 1) / mediana de su categoría EN LA CLASE');
  for (const L of [50, 70, 100]) for (const c of Object.keys(CLS)) {
    const out = [];
    for (const [cat, ks] of Object.entries(CAT)) {
      const v = ks.map(k => [k, delta(c, L, k).ax]);
      const s = v.map(x => x[1]).sort((a, b) => a - b), md = s[Math.floor(s.length / 2)];
      out.push(`${cat} ` + v.map(([k, x]) => `${k} ${pc(x)} (${r2(x / md)})`).join(' · '));
    }
    console.log(`Nv${L} ${c}: ${out.join(' || ')}`);
  }
  console.log('\n== (2b) IT6 por EJE (método de la tabla de §4.4): línea / mediana de su eje (Daño: 8 líneas; Aguante: 5) en la clase');
  for (const L of [50, 70, 100]) for (const c of Object.keys(CLS)) {
    const { d, r } = axisRatios(c, L);
    console.log(`Nv${L} ${c}: D ` + DK.map(k => `${k} ${r2(r[k])}`).join(' ') + ' | A ' + AK.map(k => `${k} ${r2(r[k])}`).join(' ') + ` | Δ crit ${pc(d.crit)} critDmg ${pc(d.critDmg)} lph ${pc(d.lph)}`);
  }
  console.log('\n== (2c) IT6 por ESPECIALIZACIÓN (eje Daño), crítico medio = clase + st + 0,45·sk, sobrecrítico exacto');
  for (const L of [70, 100]) for (const [s, S] of Object.entries(SPEC)) {
    const cb = S.st + SK_SHARE * S.sk, h = hero(S.cls, L, { cb }), { r } = axisRatios(S.cls, L, { cb });
    const outBand = DK.filter(k => Math.abs(r[k] - 1) > 0.2).map(k => `${k} ${r2(r[k])}`);
    console.log(`Nv${L} ${s.padEnd(14)} crítico medio ${r1(h.critRaw)} · crit ${r2(r.crit)} · critDmg ${r2(r.critDmg)} · fuera de ±20 %: ${outBand.join(', ') || '—'}`);
  }
  console.log('\n   IT6b (pool en g, w = 0,55, Nv70) del daño crítico por especialización: g de la línea / mediana del pool');
  for (const [s, S] of Object.entries(SPEC)) {
    const cb = S.st + SK_SHARE * S.sk, row = [];
    for (const id of ['weapon', 'gloves', 'amulet', 'ring1']) {
      const v = SL[id].pool.map(k => [k, delta(S.cls, 70, k, 0.55, { cb }).g]);
      const md = med(v.map(x => x[1])); row.push(`${id} ${r2(v.find(x => x[0] === 'critDmg')[1] / md)}`);
    }
    console.log(`   ${s.padEnd(14)} critDmg: ${row.join(' · ')}`);
  }
  console.log('\n   g de una línea (w = 0,55, Nv70, peso 1), media de las 3 clases:');
  console.log('   ' + Object.keys(AX).map(k => { const m = Object.keys(CLS).reduce((a, c) => a + delta(c, 70, k).g, 0) / 3; return `${k} ${pc(m)}`; }).join(' · '));
  console.log('\n== (3) IT6b: paridad por pool en g (w = 0,55), Nv70, cada clase: g de la línea / mediana del pool');
  for (const c of Object.keys(CLS)) {
    const row = [];
    for (const [id, s] of Object.entries(SL)) {
      if (id === 'ring2') continue;
      const v = s.pool.map(k => [k, delta(c, 70, k).g * s.w]);
      const srt = v.map(x => x[1]).sort((a, b) => a - b), md = srt[Math.floor(srt.length / 2)];
      row.push(`${id}: ` + v.map(([k, x]) => `${k} ${r2(x / md)}`).join(' '));
    }
    console.log(`${c}: ${row.join(' | ')}`);
  }
  console.log('\n== (4) O6: cuotas. Líneas = 1 − valor(blancos con implícito)/valor(típico); equipo entero (aguante) = 1 − A(sin equipo)/A(típico)');
  for (const L of [20, 50, 70]) {
    const row = Object.keys(CLS).map(c => { const t = hero(c, L), z = hero(c, L, { lines: false }), n = hero(c, L, { lines: false, implicit: false }); return `${c} D ${pc(1 - z.D / t.D)} A ${pc(1 - z.A / t.A)} · equipo A ${pc(1 - n.A / t.A)} · vida ${Math.round(t.HP)} (implícita ${Math.round(t.g.hpI)})`; });
    console.log(`típico Nv${L}: ${row.join(' | ')}`);
  }
  const opt = Object.keys(CLS).map(c => { const t = hero(c, 100, { no: 52, step: 5, gemGrade: 5, S0: 140, mult: 1.1 }), z = hero(c, 100, { no: 52, lines: false, S0: 140 }), n = hero(c, 100, { no: 52, lines: false, implicit: false, S0: 140 }); return `${c} D ${pc(1 - z.D / t.D)} A ${pc(1 - z.A / t.A)} · equipo A ${pc(1 - n.A / t.A)} · crit ${r1(t.critRaw)} · vida ${Math.round(t.HP)}`; });
  console.log(`óptimo Nv100: ${opt.join(' | ')}`);
  console.log('\n== (5) Topes (todo ★, ◆52) por línea');
  const cap = (k, wsum) => r1(TOP[k] * 1.5 * wsum);
  console.log('cdr casco+mano izq', cap('cdr', 1.75), '· RD pecho+cinturón+mano izq', cap('dr', 2.5), '· vel. ataque arma+guantes', cap('aspdPct', 1.5), '· esquiva casco+botas', cap('dodge', 1.75), 's · crítico anillos', cap('crit', 1.125), '· vida al golpear arma+anillos+pecho+mano izq', cap('lph', 3.625), '/impacto · recurso (5 ranuras)', cap('res', 4.25));
  console.log('\n== (5b) Crítico por ESPECIALIZACIÓN, óptimo Nv100 (base 5 + Des del nivel + c13 10 + tablero + anillos 9,3; Era de hoy +12)');
  console.log('   esp. · global · estado normal · + habilidad principal · con Era +12 (estado / habilidad) · build que más suma (estado+habilidad / con Era)');
  const ring = TOP.crit * 1.5 * 1.125;
  for (const [s, S] of Object.entries(SPEC)) {
    const a = attrs(S.cls, 100), g0 = 5 + 0.15 * a.des + TAL_CRIT(100) + CLS[S.cls].board + ring;
    const st = g0 + S.st, sk = st + S.sk, mx = g0 + S.stMax + S.skMax;
    console.log(`   ${s.padEnd(14)} ${r1(g0)} · ${r1(st)} · ${r1(sk)} · ${r1(st + 12)} / ${r1(sk + 12)} · ${r1(mx)} / ${r1(mx + 12)}`);
  }
  console.log('\n== (6) Vida al golpear: 1 línea típica en el arma (Nv70) frente a la cubeta');
  for (const c of Object.keys(CLS)) { const t = hero(c, 70), per = lineVal('lph', 47, 3, 0.75); console.log(`${c}: ${r1(per)}/impacto · cubeta ${r1(0.06 * t.HP)}/s → en UNI (2/s) llena el ${pc(2 * per / (0.06 * t.HP))}`); }
  console.log('\n== (7) IT3: Δ de daño de una línea de crítico de anillo (★, ◆52: +' + r1(TOP.crit * 1.5 * 0.5625) + ') con el óptimo Nv100 en la build que más suma');
  console.log('   esp. · crítico total (sin Era / con Era +12) · valor retenido frente a sin tope: tope duro de hoy · sobrante a +2 de daño crítico por punto · sobrecrítico exacto');
  const dl = TOP.crit * 1.5 * 0.5625;
  for (const [s, S] of Object.entries(SPEC)) {
    const out = [];
    for (const era of [0, 12]) {
      const base = { no: 52, step: 5, gemGrade: 5, S0: 140, mult: 1.1, cb: S.stMax + S.skMax, era };
      const val = over => hero(S.cls, 100, { ...base, over, extra: { crit: dl } }).D / hero(S.cls, 100, { ...base, over }).D - 1;
      const ex = val('exact');
      out.push(`${r1(hero(S.cls, 100, base).critRaw)}: ${r2(val('cap') / ex)} · ${r2(val(2) / ex)} · ${r2(ex / ex)}`);
    }
    console.log(`   ${s.padEnd(14)} ${out.join('  ||  con Era ')}`);
  }
  console.log('\n== (8) Frente a hoy: DPS y Aguante del equipo v4 / perfil «hoy» del banco (mismo saco fuera del equipo; sin aspectos ni poderes)');
  console.log('   típico: S0 60, sin bendiciones · óptimo: S0 140 (60 + soportes 80) + bendiciones (hoy L = (Nv−20)/3; v4 L ≤ 10)');
  for (const L of [50, 58, 70, 100]) for (const c of Object.keys(CLS)) {
    const vt = hero(c, L), ht = heroHoy(c, L);
    const bv = blessV4(L), bh = blessHoy(L);
    const vo = hero(c, L, { no: Math.min(52, ilOf(L) + 5), step: 5, gemGrade: 5, S0: 140, mult: 1.1, extra: { dmgPct: bv.dmg, hp: bv.hp, cdr: bv.cdr } });
    const ho = heroHoy(c, L, { opt: true, S0: 140, bless: bh });
    const f = (v, h) => `D ×${r2(v.D / h.D)} A ×${r2(v.A / h.A)} (arma ×${r2(v.W / h.W)} · atributo ×${r2(v.mainMult / h.mainMult)} · crítico ${r1(v.critRaw)} frente a ${r1(h.critRaw)} · vida ${Math.round(v.HP)} frente a ${Math.round(h.HP)})`;
    console.log(`Nv${L} ${c.padEnd(8)} típico ${f(vt, ht)}`);
    console.log(`Nv${L} ${c.padEnd(8)} óptimo ${f(vo, ho)}`);
  }
  console.log('\n   IT2: DPS del típico Nv70 / Nv58 (mismo héroe, cambia el equipo y el AL)');
  for (const c of Object.keys(CLS)) console.log(`   ${c}: v4 ×${r2(hero(c, 70).D / hero(c, 58).D)} · hoy ×${r2(heroHoy(c, 70).D / heroHoy(c, 58).D)} · enemigos AL47/AL40: vida ×${r2(Math.pow(G(47) / G(40), 1.38))} (G^1,38) y daño ×${r2(Math.pow(G(47) / G(40), 0.85))} (G^0,85; combat-math.js:85-93)`);
  console.log('\n   perfil «hoy» típico Nv70 (12 ranuras, il40): ' + (() => { const h = heroHoy('guerrero', 70); return Object.entries(h.t).filter(([k]) => !['mf', 'thorns', 'mp', 'mph'].includes(k)).map(([k, v]) => `${k} ${r1(v)}`).join(' · '); })());
}
