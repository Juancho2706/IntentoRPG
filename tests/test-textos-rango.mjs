// ============================================================
// Paso 2 · E5 (X1) — TEXTOS AL RANGO (decisión del dueño 2026-10-21): los buffs, escudos y curas
// crecen con el rango (combat-math.RANK_BUFF_STEP, en el perfil: prof.buffMul) y los textos enseñan el
// VALOR REAL a tu rango actual (Agilidad a Nv60: «+37 %», no «+30 %"). Vocabulario: skill-defs
// (rankText, rankTextApply); valor: skill-resolve.rankedText.
//   R0  vocabulario: trozos, signo, una sola pasada, formato y validación
//   R1  catálogo: cada rankText (habilidades y piezas de forja) reproduce su texto a rango 1 (el número
//       del texto es el dato) y todo número que el juego escala está declarado (con sus excepciones)
//   R2  Maga, Guerrero y Arquera: buff, escudo y cura (lo que tenga cada clase) a DOS rangos: el número
//       del libro (forgeView) es el que aplica el juego al lanzarla
//   R4  las curas y escudos que no crecían (revisión X1): Corazón de Hielo, Acero Templado, Escolta de
//       Luz, la cura del Sendero, la cura final de Furia Inmortal y la Cortina, a dos rangos
//   R3  dónde se ve: libro y forja (línea, innata y variantes), panel de talentos (activa sin comprar)
//       y el aviso del buff en el HUD (el de Piel de Hierro con los talentos del Guardián y el aviso de
//       nivel van en R2, junto a su libro)
// Cada apartado falla sin su arreglo (uno roto no tapa a los demás; al final, exit 1 si alguno falla).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { CLASSES } from '../js/data.js';
import { rankTextApply, fmtRankNum, rankTextNum, validateRankText, forgeDef, RANK_TEXT_SRC } from '../js/skill-defs.js';
import { rankTextValue, rankedText, skillRank } from '../js/skill-resolve.js';
import { RANK_BUFF_STEP, rankBuff } from '../js/combat-math.js';
import { definePower, POWER_HOOKS } from '../js/powers.js';
import * as HM from '../js/hud-model.js';
import { skillTooltip } from '../js/talents-view.js';

const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.deepStrictEqual(a, b, m); };
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const CIDS = ['maga', 'guerrero', 'arquera'];
const skill = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);
const num = s => parseFloat(String(s).replace(',', '.'));
// número que cita el texto en el grupo 1 de `rx`
function textNum(text, rx) {
  const m = rx.exec(text);
  assert.ok(m, `el texto «${text}» casa con ${rx}`);
  return num(m[1]);
}
// héroe del arnés con las activas de talento concedidas, la forja dada y vida y recurso llenos
function hero(classId, level, { spec = null, grants = [], forge = null } = {}) {
  const h = makeHarness({ classId, level, spec });
  for (const id of grants) h.p.talentExtra.grants.add(id);
  if (forge) Object.assign(h.p.skillForge, forge);
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  return h;
}
const buffOf = (p, id) => (p.buffs || []).find(b => b.id === id && b.t > 0) || null;
const line = (h, id) => HM.forgeView(h.p, skill(h.p.classId, id)).line;
function cast(h, slot, id, { aim = [3, 0], sec = 0.6 } = {}) {
  h.setSlot(slot, id); h.aim(aim[0], aim[1]);
  h.p.cds[id] = 0; h.p.gcdT = 0; h.p.actionLockT = 0;
  const r = h.cast(slot);
  h.step(sec);
  return r;
}

// ------------------------------------------------ R0 · vocabulario
section('R0 · rankTextApply: trozo con su número, signo, una sola pasada (el más largo primero) y formato', () => {
  eq(rankTextApply('Recibes un 40 % menos; reciben −40 %.', { '40 %': 'x' }, () => 49.6), 'Recibes un 50 % menos; reciben −50 %.', 'cambia el número y deja el signo');
  eq(rankTextApply('un 1 % por cada 3 (100: un 33 %)', { 'un 1 %': '*', 'un 33 %': '*' }, (s, n) => n * 1.24), 'un 1,2 % por cada 3 (100: un 41 %)', 'decimal con coma por debajo de 10');
  eq(rankTextApply('+8 % de daño y un 8 % menos', { '+8 %': 'a', 'un 8 %': 'b' }, (s) => (s === 'a' ? 10 : 9)), '+10 % de daño y un 9 % menos', 'cada trozo con su fuente');
  eq(rankTextApply('del 10 % y del 10 %', { 'del 10 %': 'x' }, () => 12), 'del 12 % y del 12 %', 'todas las apariciones');
  eq(rankTextApply('un 10 %', { 'un 10 %': 'x', '10 %': 'y' }, s => (s === 'x' ? 11 : 99)), 'un 11 %', 'el trozo más largo manda y no se vuelve a tocar');
  eq(rankTextApply('un 10 % más', { 'un 10 %': 'x', 'un 10 % más': 'y' }, s => (s === 'x' ? 11 : 12)), 'un 12 % más', 'con el mismo comienzo, el más largo');
  // el buff y la reducción de una zona, redondeados como los aplica el juego; el resto, tal cual
  eq(rankTextValue('buff.dmgPct', 8, { def: { buff: { dmgPct: 8 } }, buffMul: 1.18 }), 9, 'buff: Math.round(8 × 1,18)');
  eq(rankTextValue('allyDr', 50, { def: { allyDr: 50 }, buffMul: 1.07 }), 54, 'allyDr: Math.round');
  eq(rankTextValue('shieldPct', 15, { def: { shieldPct: 15 }, buffMul: 1.06 }), 15 * 1.06, 'escudo: sin redondear');
  eq(rankTextValue('heal.pct', 30, { def: { heal: { pct: 30 } }, buffMul: 1.1 }), 33, 'ruta con punto');
  eq(rankTextValue('hpPct', 50, { def: {}, buffMul: 2 }), null, 'sin el dato: null');
  eq(rankTextApply('un 30 % menos', { '30 %': 'x' }, () => null), 'un 30 % menos', 'sin valor: el trozo se queda');
  eq(rankTextApply('sin números', { '30 %': 'x' }, () => 1), 'sin números', 'trozo ausente: nada');
  eq([fmtRankNum(37.2), fmtRankNum(9.96), fmtRankNum(1.24), fmtRankNum(-2), fmtRankNum(10.5)], ['37', '10', '1,2', '2', '11'], 'formato');
  eq([rankTextNum('−40 %'), rankTextNum('1,5 s'), rankTextNum('nada')], [40, 1.5, null]);
  eq(validateRankText({ '30 %': 'buff.costPct' }, ['cuesta un 30 % menos'], 'x'), [], 'válido');
  eq(validateRankText({ '30 %': 'buff.costPct' }, ['otro texto'], 'x').length, 1, 'trozo que no está en el texto');
  eq(validateRankText({ 'sin número': 'buff.x' }, ['sin número'], 'x').length, 1, 'trozo sin número');
  eq(validateRankText({ '30 %': 'buff-mal' }, ['30 %'], 'x').length, 1, 'fuente fuera del vocabulario');
  ok(RANK_TEXT_SRC.test('heal.pct') && RANK_TEXT_SRC.test('*') && RANK_TEXT_SRC.test('rank') && !RANK_TEXT_SRC.test('a.b.c'), 'fuentes');
  eq(RANK_BUFF_STEP, 0.06, 'el escalón que usan los textos es el del juego');
});

// ------------------------------------------------ R1 · catálogo
// lo que el juego escala con buffMul en la definición (GENERIC.buff/aura/shield/zone, Barrera, Constructo,
// Intervención, verbos heal/shield de llegada, escudo por golpeado, cura del sendero, la Cortina de la
// lluvia); minHpPct del buff (un suelo de vida, no una cura) NO escala
const NO_SCALE_BUFF = new Set(['minHpPct']);
function scaledPaths(o) {
  const out = [];
  for (const [k, v] of Object.entries(o?.buff || {})) if (!NO_SCALE_BUFF.has(k) && typeof v === 'number' && v !== 0) out.push(`buff.${k}`);
  for (const k of ['shieldPct', 'shieldManaPct', 'hpPct', 'allyDr']) if (typeof o?.[k] === 'number' && o[k] > 0) out.push(k);
  for (const k of ['heal', 'shield']) if (o?.[k]?.pct > 0) out.push(`${k}.pct`);
  if (o?.trail?.heal > 0) out.push('trail.heal');
  if (Array.isArray(o?.shieldGain)) out.push('shieldGain.0', 'shieldGain.1');
  return out;
}
// números que el juego escala y el texto NO cita (con su motivo)
const NOT_CITED = {
  'g_u_furia:buff.spenderCostPct': 'el texto dice «no cuestan Furia» (−100 %, ya el tope)',
};
section('R1 · cada rankText del catálogo reproduce su texto a rango 1 y cubre lo que el juego escala', () => {
  let n = 0, pieces = 0;
  for (const cid of CIDS) {
    const forge = CLASSES[cid].forge || {};
    for (const sk of CLASSES[cid].skills) {
      eq(validateRankText(sk.rankText, [sk.line, sk.desc, ...Object.values(sk.innate || {})], sk.id), [], `${sk.id}: rankText válido`);
      const at1 = t => rankTextApply(t, sk.rankText, (src, x) => rankTextValue(src, x, { def: sk, buffMul: 1, rank: 1 }));
      for (const t of [sk.line, sk.desc, ...Object.values(sk.innate || {})].filter(Boolean)) eq(at1(t), t, `${sk.id}: a rango 1 el texto no cambia («${t}»)`);
      const cited = new Set(Object.values(sk.rankText || {}));
      for (const path of scaledPaths(sk)) ok(cited.has(path) || NOT_CITED[`${sk.id}:${path}`], `${sk.id}: ${path} escala con el rango y su texto no lo declara (rankText)`);
      if (sk.rankText) n++;
      const entry = forge[sk.id];
      for (const [key, piece] of [['M', entry?.mejora], ['I', entry?.vars?.[0]], ['II', entry?.vars?.[1]]]) {
        if (!piece) continue;
        const tag = `${sk.id}·${key}`;
        eq(validateRankText(piece.rankText, [piece.line], tag), [], `${tag}: rankText válido`);
        const def = forgeDef(sk, entry, key === 'M' ? { mejora: true } : { variant: key === 'I' ? 'i' : 'ii' });
        eq(rankTextApply(piece.line, piece.rankText, (src, x) => rankTextValue(src, x, { def, buffMul: 1, rank: 1 })), piece.line, `${tag}: a rango 1 la línea no cambia`);
        // lo que la pieza fija o suma y el juego escala
        const touched = scaledPaths({ ...Object.fromEntries(Object.entries({ ...piece.set, ...piece.add }).filter(([k]) => !k.includes('.'))),
          buff: Object.fromEntries(Object.entries({ ...piece.set?.buff, ...Object.fromEntries(Object.entries({ ...piece.set, ...piece.add }).filter(([k]) => k.startsWith('buff.')).map(([k, v]) => [k.slice(5), v])) })) });
        const pc = new Set(Object.values(piece.rankText || {}));
        for (const path of touched) ok(pc.has(path) || NOT_CITED[`${tag}:${path}`], `${tag}: ${path} escala con el rango y su línea no lo declara`);
        if (piece.rankText) pieces++;
      }
    }
  }
  ok(n >= 12 && pieces >= 4, `rankText en ${n} habilidades y ${pieces} piezas de forja`);
});

// ------------------------------------------------ R2 · el número del libro = el que aplica el juego
// a DOS rangos por habilidad (el segundo, distinto del primero)
function twoRanks(name, levels, run) {
  const got = levels.map(L => run(L));
  ok(got[0].rank !== got[1].rank, `${name}: dos rangos distintos (${got.map(g => g.rank).join(' y ')})`);
  ok(got[0].text !== got[1].text, `${name}: el texto cambia con el rango (${got.map(g => g.text).join(' → ')})`);
  return got;
}
section('R2 · Maga: Sello del Archimago (buff), Barrera de Maná (escudo) y Constructo (vida) a dos rangos', () => {
  twoRanks('a_sello', [12, 34], L => {
    const h = hero('maga', L, { spec: 'arcanista' });
    const t = textNum(line(h, 'a_sello'), /cuestan un (\d+) % menos/);
    ok(cast(h, 'k2', 'a_sello', { sec: 0.1 }), 'lanza el Sello');
    const b = buffOf(h.p, 'a_sello');
    ok(b, 'dentro del Sello');
    eq(-b.stats.costPct, t, `Nv${L}: el Sello abarata lo que dice el libro`);
    return { rank: skillRank(h.p, skill('maga', 'a_sello')), text: t };
  });
  twoRanks('m_barrera', [6, 30], L => {
    const h = hero('maga', L);
    eq(h.p.stats.healPct || 0, 0, 'sin bonus de curación del equipo');
    const t = textNum(line(h, 'm_barrera'), /igual al (\d+) % de tu maná/);
    ok(cast(h, 'k2', 'm_barrera', { sec: 0.1 }), 'lanza la Barrera');
    const pct = h.p.shieldTotal() / h.p.stats.maxMP * 100;
    ok(Math.abs(pct - t) <= 0.5, `Nv${L}: la Barrera absorbe el ${pct.toFixed(2)} % del maná y el libro dice ${t} %`);
    return { rank: skillRank(h.p, skill('maga', 'm_barrera')), text: t };
  });
  let C = null;
  if (!POWER_HOOKS.zz_x1_constructo) definePower('zz_x1_constructo', { afterCast(g, p, c) { if (c?.sk?.id === 'm_h_constructo') C = c.construct; } });
  twoRanks('m_h_constructo', [73, 100], L => {
    const h = hero('maga', L, { grants: ['m_h_constructo'] });
    h.addPowers('zz_x1_constructo');
    const fv = HM.forgeView(h.p, skill('maga', 'm_h_constructo'));
    const t = textNum(rankedText(h.p, skill('maga', 'm_h_constructo'), skill('maga', 'm_h_constructo').desc), /aguanta un (\d+) % de tu vida/);
    C = null;
    ok(cast(h, 'k2', 'm_h_constructo', { sec: 0.1 }) && C, 'llama al Constructo');
    const pct = C.maxHP / h.p.stats.maxHP * 100;
    ok(Math.abs(pct - t) <= 0.5, `Nv${L}: el Constructo aguanta el ${pct.toFixed(2)} % y el texto dice ${t} %`);
    return { rank: fv.rank, text: t };
  });
});
section('R2 · Guerrero: Grito de Guerra (buff), Intervención (escudo) y Segundo Aliento (cura) a dos rangos', () => {
  twoRanks('grito_guerra', [27, 51], L => {
    const h = hero('guerrero', L, { grants: ['grito_guerra'] });
    const t = textNum(line(h, 'grito_guerra'), /hace \+(\d+) % de daño/);
    ok(cast(h, 'k2', 'grito_guerra', { sec: 0.1 }), 'grita');
    eq(buffOf(h.p, 'grito_guerra')?.stats.dmgPct, t, `Nv${L}: el Grito da lo que dice el libro`);
    return { rank: skillRank(h.p, skill('guerrero', 'grito_guerra')), text: t };
  });
  // Estandarte de Guerra (activa del árbol héroe): dos buffs por debajo de 10, redondeados como el juego
  twoRanks('g_h_estandarte', [72, 100], L => {
    const h = hero('guerrero', L, { grants: ['g_h_estandarte'] });
    const txt = HM.forgeView(h.p, skill('guerrero', 'g_h_estandarte')).line + ' ' + rankedText(h.p, skill('guerrero', 'g_h_estandarte'), skill('guerrero', 'g_h_estandarte').desc);
    const dmg = textNum(txt, /hacen \+(\d+(?:,\d+)?) % de daño/), dr = textNum(txt, /reciben un (\d+(?:,\d+)?) % menos/);
    ok(cast(h, 'k2', 'g_h_estandarte', { aim: [1, 0], sec: 0.1 }), 'clava el Pendón');
    const b = buffOf(h.p, 'g_h_estandarte');
    eq([b?.stats.dmgPct, b?.stats.dr], [dmg, dr], `Nv${L}: el Pendón da lo que dice el texto`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_h_estandarte')), text: `${dmg}/${dr}` };
  });
  twoRanks('g_t_intervencion', [31, 55], L => {
    const h = hero('guerrero', L, { grants: ['g_t_intervencion'] });
    eq(h.p.stats.healPct || 0, 0, 'sin bonus de curación del equipo');
    const t = textNum(line(h, 'g_t_intervencion'), /escudo del (\d+) % de tu vida/);
    ok(cast(h, 'k2', 'g_t_intervencion', { aim: [5, 0], sec: 0.8 }), 'interviene');
    const pct = h.p.shieldTotal() / h.p.stats.maxHP * 100;
    ok(Math.abs(pct - t) <= 0.5, `Nv${L}: el escudo es del ${pct.toFixed(2)} % y el libro dice ${t} %`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_t_intervencion')), text: t };
  });
  twoRanks('g_t_aliento', [21, 53], L => {
    const h = hero('guerrero', L, { grants: ['g_t_aliento'] });
    eq(h.p.stats.healPct || 0, 0, 'sin bonus de curación del equipo');
    const txt = line(h, 'g_t_aliento');
    const per = textNum(txt, /te curas un (\d+(?:,\d+)?) % de la vida por cada 3/);
    const full = textNum(txt, /100 de Furia: un (\d+) %/);
    h.p.hp = 1; h.p.mp = 99;
    ok(cast(h, 'k2', 'g_t_aliento', { sec: 0.1 }), 'Segundo Aliento');
    const healed = (h.p.hp - 1) / h.p.stats.maxHP * 100;
    ok(Math.abs(healed / 33 - per) <= 0.05, `Nv${L}: cura el ${(healed / 33).toFixed(3)} % por cada 3 de Furia y el libro dice ${per} %`);
    ok(Math.abs(healed * 100 / 99 - full) <= 0.5, `Nv${L}: con 100 de Furia, el ${(healed * 100 / 99).toFixed(2)} %, y el libro dice ${full} %`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_t_aliento')), text: `${per}/${full}` };
  });
});
section('R2 · Arquera: Agilidad y Paso Veloz (buffs) y Bomba de Humo (reducción) a dos rangos (no tiene escudo ni cura)', () => {
  const ag = twoRanks('agilidad', [27, 60], L => {
    const h = hero('arquera', L, { grants: ['agilidad'] });
    const txt = line(h, 'agilidad');
    const spd = textNum(txt, /\+(\d+) % de velocidad,/), asp = textNum(txt, /\+(\d+) % de velocidad de ataque/);
    ok(cast(h, 'k2', 'agilidad', { sec: 0.1 }), 'Agilidad');
    const b = buffOf(h.p, 'agilidad');
    eq([b?.stats.spdPct, b?.stats.aspdPct], [spd, asp], `Nv${L}: la Agilidad da lo que dice el libro`);
    return { rank: skillRank(h.p, skill('arquera', 'agilidad')), text: `${spd}/${asp}` };
  });
  eq(ag[1].text, '37/19', 'el ejemplo del dueño: Agilidad a Nv60 = +37 % (y +19 %)');
  twoRanks('a_paso', [4, 28], L => {
    const h = hero('arquera', L);
    const t = textNum(line(h, 'a_paso'), /ganas \+(\d+) % de velocidad de ataque/);
    ok(cast(h, 'k1', 'a_paso', { sec: 0.4 }), 'rueda');
    eq(buffOf(h.p, 'a_paso')?.stats.aspdPct, t, `Nv${L}: el Paso Veloz da lo que dice el libro`);
    return { rank: skillRank(h.p, skill('arquera', 'a_paso')), text: t };
  });
  twoRanks('a_humo', [6, 38], L => {
    const h = hero('arquera', L);
    const t = textNum(line(h, 'a_humo'), /recibes un (\d+) % menos/);
    ok(cast(h, 'k2', 'a_humo', { sec: 0.1 }), 'humo');
    const f = (h.g.fields || []).find(x => !x.dead && x.data?.skill === 'a_humo' && x.kind === 'zona');
    eq(f?.data.allyDr, t, `Nv${L}: la nube reduce lo que dice el libro`);
    return { rank: skillRank(h.p, skill('arquera', 'a_humo')), text: t };
  });
});
section('R2 · variantes y otra especialización: Sello Ofensivo, Ciudadela Andante y la Piel de Hierro del Guardián', () => {
  // Sello Ofensivo (I): «tus críticos hacen +X %» = el buff que da
  const s = hero('maga', 34, { spec: 'arcanista', forge: { a_sello: 'i' } });
  const v = HM.forgeView(s.p, skill('maga', 'a_sello')).vars.find(x => x.key === 'i');
  const crit = textNum(v.line, /críticos hacen \+(\d+) %/);
  ok(crit > 25, `la variante crece con el rango (${crit})`);
  ok(cast(s, 'k2', 'a_sello', { sec: 0.1 }), 'lanza el Sello Ofensivo');
  eq(buffOf(s.p, 'a_sello')?.stats.critDmg, crit, 'Sello Ofensivo: lo que dice su línea');
  // Ciudadela Andante (I): «baja de −X % a −Y %»: X la base a tu rango, Y la que aplica
  const c = hero('guerrero', 40, { spec: 'guardian', forge: { g_u_ciudadela: 'i' } });
  const fc = HM.forgeView(c.p, skill('guerrero', 'g_u_ciudadela'));
  const [from, to] = /de −(\d+) % a −(\d+) %/.exec(fc.vars.find(x => x.key === 'i').line).slice(1).map(Number);
  eq(from, textNum(fc.line, /reciben −(\d+) %/), 'la variante cita el valor de la base a tu rango');
  c.p.cds.g_u_ciudadela = 0;
  ok(cast(c, 'k4', 'g_u_ciudadela', { sec: 0.6 }), 'Ciudadela');
  eq(buffOf(c.p, 'g_u_ciudadela')?.stats.dr, to, 'Ciudadela Andante: la reducción que dice su línea');
  // Piel de Hierro: con el Guardián (+25 % de potencia) y sin especialización; la cláusula del Guardián, al rango
  const g = hero('guerrero', 40, { spec: 'guardian' }), n = hero('guerrero', 40);
  for (const h of [g, n]) {
    const t = textNum(line(h, 'g_piel'), /recibes un (\d+) % menos/);
    ok(cast(h, 'k2', 'g_piel', { sec: 0.1 }), 'Piel de Hierro');
    eq(buffOf(h.p, 'g_piel')?.stats.dr, t, `Piel de Hierro (${h.p.talents.spec || 'sin especialización'}): la reducción que dice el libro`);
    // el aviso del buff (sin perfil: rango y mods de talento como los lee rankTextCtx) dice lo mismo
    const b = buffOf(h.p, 'g_piel');
    eq(textNum(b.desc, /recibes un (\d+) % menos/), b.stats.dr, `Piel de Hierro (${h.p.talents.spec || 'sin especialización'}): el aviso del HUD`);
  }
  const rk = skillRank(g.p, skill('guerrero', 'g_piel'));
  eq(HM.forgeView(g.p, skill('guerrero', 'g_piel')).innate, `Guardián: 12 s y −${Math.round(50 * rankBuff(rk))} %`, 'la innata del Guardián, al rango');
  eq(textNum(line(g, 'g_piel'), /recibes un (\d+) % menos/), Math.round(50 * rankBuff(rk)), 'y coincide con la del Guardián');
  // el aviso de nivel («Aprendes Piel de Hierro») también cita el valor de tu héroe, no el del catálogo
  const news = HM.levelUpNews(g.p, 5, 6).items.find(i => i.kind === 'learn' && i.id === 'g_piel');
  eq(news?.line, line(g, 'g_piel'), 'el aviso de nivel = la línea del libro');
  ok(news.line !== skill('guerrero', 'g_piel').line, `y no el texto del catálogo («${news.line}»)`);
});

// ------------------------------------------------ R4 · las curas y escudos que no crecían (revisión X1)
section('R4 · Corazón de Hielo, Acero Templado, Escolta de Luz, cura del Sendero, cura final de Furia Inmortal y Cortina, a dos rangos', () => {
  const varLine = (h, id, key) => HM.forgeView(h.p, skill(h.p.classId, id)).vars.find(v => v.key === key).line;
  // Corazón de Hielo (Nova de Hielo I): escudo por golpeado; un golpeado = el % de la línea
  twoRanks('nova_hielo·I', [14, 40], L => {
    const h = hero('maga', L, { forge: { nova_hielo: 'i' } });
    h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    const t = textNum(varLine(h, 'nova_hielo', 'i'), /Escudo del (\d+(?:,\d+)?) % de vida/);
    ok(cast(h, 'rmb', 'nova_hielo', { aim: [2, 0], sec: 0.3 }), 'Nova de Hielo');
    // el escudo se redondea a puntos de vida enteros (addShield)
    const amt = h.p.shieldTotal(), want = h.p.stats.maxHP * t / 100;
    ok(Math.abs(amt - want) <= 1, `Nv${L}: escudo de ${amt} (vida ${h.p.stats.maxHP}) y la línea dice ${t} % = ${want.toFixed(2)}`);
    return { rank: skillRank(h.p, skill('maga', 'nova_hielo')), text: t };
  });
  // Acero Templado (Mejora de Piel de Hierro): la cura al activarla
  twoRanks('g_piel·M', [9, 38], L => {
    const h = hero('guerrero', L);
    eq(h.p.stats.healPct || 0, 0, 'sin bonus de curación del equipo');
    const t = textNum(HM.forgeView(h.p, skill('guerrero', 'g_piel')).mejora.line, /te curas el (\d+(?:,\d+)?) %/);
    h.p.hp = h.p.stats.maxHP / 2;
    ok(cast(h, 'k2', 'g_piel', { sec: 0.05 }), 'Piel de Hierro');
    const healed = (h.p.hp - h.p.stats.maxHP / 2) / h.p.stats.maxHP * 100;
    ok(Math.abs(healed - t) <= 0.1, `Nv${L}: cura el ${healed.toFixed(2)} % y la Mejora dice ${t} %`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_piel')), text: t };
  });
  // Sendero de Luz (Cruzado): la cura de la estela y, con Escolta de Luz (I), el escudo al aliado atravesado
  twoRanks('g_sendero', [18, 44], L => {
    const h = hero('guerrero', L, { spec: 'cruzado', forge: { g_sendero: 'i' } });
    const ally = h.ally(4, 0.5);
    const heal = textNum(line(h, 'g_sendero'), /cura a tus aliados un (\d+(?:,\d+)?) %/);
    const sh = textNum(varLine(h, 'g_sendero', 'i'), /escudo del (\d+(?:,\d+)?) % de tu vida/);
    ok(cast(h, 'k1', 'g_sendero', { aim: [10, 0], sec: 0.1 }), 'Sendero de Luz');
    const f = (h.g.fields || []).find(x => !x.dead && x.data?.skill === 'g_sendero' && x.kind === 'zona');
    // el Cruzado pasa la cura de sus zonas sagradas a data._holy (no se suman: powers-guerrero.holyZones)
    const fh = f ? (f.data._holy ? f.data._holy.heal : f.data.healPct) : null;
    ok(fh > 0 && Math.abs(fh - heal) <= 0.05, `Nv${L}: la estela cura ${fh} %/s y el libro dice ${heal} %`);
    const amt = ally.shields.find(s => s.src === 'v_escolta_luz')?.amt || 0;
    ok(Math.abs(amt / h.p.stats.maxHP * 100 - sh) <= 0.5, `Nv${L}: Escolta de Luz (desde 10, el texto da enteros) da el ${(amt / h.p.stats.maxHP * 100).toFixed(2)} % y la variante dice ${sh} %`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_sendero')), text: `${heal}/${sh}` };
  });
  // Furia Inmortal (Berserker): la cura al acabar (el suelo de vida del 1 % no cambia)
  twoRanks('g_u_furia', [15, 47], L => {
    const h = hero('guerrero', L, { spec: 'berserker' });
    const t = textNum(line(h, 'g_u_furia'), /te curas un (\d+) %/);
    ok(/no baja del 1 %/.test(line(h, 'g_u_furia')), 'el suelo de vida sigue en el 1 %');
    ok(cast(h, 'k4', 'g_u_furia', { sec: 0.1 }), 'Furia Inmortal');
    const b = buffOf(h.p, 'g_u_furia');
    eq([b?.stats.endHealPct, b?.stats.minHpPct], [t, 1], `Nv${L}: cura al acabar lo que dice el libro`);
    return { rank: skillRank(h.p, skill('guerrero', 'g_u_furia')), text: t };
  });
  // y la Furia gratis de Corazón Indomable 4 (cada 3 Sed Saciadas) lleva la misma cura
  {
    const h = makeHarness({ classId: 'guerrero', spec: 'berserker', level: 100, talents: { specRanks: { b28: 4 } } });
    const t = textNum(line(h, 'g_u_furia'), /te curas un (\d+) %/);
    let b = null;
    for (let n = 0; n < 4 && !b; n++) { h.p.sinceCombat = 0; h.gauge('sed', 100); h.tick(0.1); b = buffOf(h.p, 'g_u_furia'); if (!b) h.tick(10); }
    ok(b && b.t <= 5, 'Corazón Indomable 4: Furia Inmortal gratis (5 s)');
    eq(b.stats.endHealPct, t, `Nv100: la Furia gratis cura al acabar lo que dice el libro (${t} %)`);
  }
  // Cortina (Lluvia de Flechas II): la reducción de daño dentro de la lluvia
  twoRanks('lluvia_flechas·II', [14, 46], L => {
    const h = hero('arquera', L, { forge: { lluvia_flechas: 'ii' } });
    const t = textNum(varLine(h, 'lluvia_flechas', 'ii'), /recibes un (\d+) % menos/);
    ok(cast(h, 'rmb', 'lluvia_flechas', { aim: [5, 0], sec: 0.1 }), 'Lluvia de Flechas');
    const f = (h.g.fields || []).find(x => !x.dead && x.data?.skill === 'lluvia_flechas' && x.kind === 'zona');
    eq(f?.data.allyDr, t, `Nv${L}: la Cortina reduce lo que dice su línea`);
    return { rank: skillRank(h.p, skill('arquera', 'lluvia_flechas')), text: t };
  });
});

// ------------------------------------------------ R3 · dónde se ve
section('R3 · panel de talentos (la activa sin comprar, al rango que tendría), aviso del buff en el HUD y libro', () => {
  const h = hero('arquera', 60);
  const tip = skillTooltip(h.p, 'agilidad');
  ok(/\+37 % de velocidad, \+19 %/.test(tip.line), `panel de talentos: «${tip.line}»`);
  const a = hero('arquera', 60, { grants: ['agilidad'] });
  ok(cast(a, 'k2', 'agilidad', { sec: 0.1 }), 'Agilidad');
  const hud = a.p.activeBuffs().find(b => b.id === 'agilidad');
  ok(/\+37 % de velocidad de movimiento, \+19 % de velocidad de ataque/.test(hud?.desc || ''), `aviso del HUD: «${hud?.desc}»`);
  // un buff con su propio aviso (no el desc del catálogo) no se toca
  a.p.addBuff('agilidad', { spdPct: 1 }, 2, { name: 'x', desc: 'otro aviso: +30 %' });
  eq(a.p.activeBuffs().find(b => b.id === 'agilidad').desc, 'otro aviso: +30 %', 'un aviso propio se respeta');
  // el libro a rango 1 y sin héroe: el texto del catálogo tal cual
  const low = hero('arquera', 27, { grants: ['agilidad'] });
  eq(line(low, 'agilidad'), skill('arquera', 'agilidad').line, 'rango 1: la línea del catálogo');
  eq(rankedText(null, skill('arquera', 'agilidad'), 'Durante 6 s: +30 %'), 'Durante 6 s: +30 %', 'sin héroe, tal cual');
  // el tooltip del kit de otra especialización (ui-skills.js usa el DOM: no se importa headless, se
  // comprueba en su código que pasa la línea por rankedText)
  const UI_SKILLS = readFileSync(new URL('../js/ui-skills.js', import.meta.url), 'utf8');
  ok(/<div class="tl">\$\{esc\(rankedText\(p, sk, sk\.line \|\| sk\.desc \|\| ''\)\)\}<\/div>/.test(UI_SKILLS), 'ui-skills: el tooltip del kit de otra especialización, al rango');
});

console.log(`\n${checks} comprobaciones`);
if (fails.length) { console.error(`\n❌ ${fails.length} apartado(s) fallan: ${fails.join(' · ')}`); process.exit(1); }
console.log('✅ TEXTOS AL RANGO: libro, forja, tooltips y activas de talento con el valor real de buffs, escudos y curas');
