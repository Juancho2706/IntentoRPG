// Paso 2 (2f + 2g) — FORJA del GUERRERO (KA2): docs/paso2g-guerrero.md §4, §7 y §10; 2f §2 y §7.7;
// formato de docs/paso2-implementacion.md §3.5
//  1) A1: las 17 habilidades del libro (no las activas de talento) con Mejora + 2 variantes; ids
//     estables, papeles de §4/§7, líneas ≤ 70 (las acortadas, declaradas en divergencias.json)
//  2) A2/F7 estricto: cada definición forjada es válida (validateSkillDef v2: 0 errores y 0 avisos)
//     y cada pieza cambia el perfil o la definición que lee el motor, o declara un poder registrado
//  3) A9 y D28: poderes v_* registrados, todos usados, sin `mult` e ids únicos entre clases
//  4) cada Mejora y cada variante en el arnés con el canal REAL, comparada con la habilidad sin
//     esa pieza (la Mejora, contra el nivel anterior; la variante, contra solo la Mejora)
//  5) FORGE_RECO: la ★ del libro y nunca apaga la barra de su especialización (2f §7.7)
//  6) VFX de las variantes que cambian de forma: datos válidos y en uso (skillFxFor por variante)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, SKILL_FORGE, FORGE_RECO, SPEC_BAR } from '../js/data.js';
import { forgeDef, validateForge, validateSkillDef, FORGE_ROLES, FORGE_LINE_WARN } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { rankCoef, rankBuff } from '../js/combat-math.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../js/powers.js';
import { GUERRERO_SKILL_FORGE, GUERRERO_FORGE_RECO, GUERRERO_SPEC_BAR } from '../js/skills-guerrero.js';
import { guerreroForgePowers, guerreroForgeTuning } from '../js/powers-forge-guerrero.js';
import { magaForgePowers } from '../js/powers-forge-maga.js';
import { arqueraForgePowers } from '../js/powers-forge-arquera.js';
import { guerreroPowers } from '../js/powers-guerrero.js';
import { magaPowers } from '../js/powers-maga.js';
import { arqueraPowers } from '../js/powers-arquera.js';
import { GUERRERO_FX } from '../js/fx-skills-guerrero.js';
import { SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { SFX_TONES } from '../js/sfx.js';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import { makeHarness } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = id => CLASSES.guerrero.skills.find(s => s.id === id);
const BOOK = CLASSES.guerrero.skills.filter(s => s.kind !== 'talent');
const piecesOf = entry => [['m', entry.mejora], ['i', entry.vars[0]], ['ii', entry.vars[1]]];

// ------------------------------------------------ 1) A1: estructura
// papeles de §4 (kit base) y §7 (kits de especialización)
const ROLES = {
  g_tajo: ['UNI', 'AREA'], g_hendidura: ['UNI', 'AREA'], embestida: ['CTRL', 'MOV'], g_piel: ['AREA', 'AGU'], g_lanza: ['CTRL', 'AREA'],
  g_remolino: ['UNI', 'CTRL'], g_salto: ['CTRL', 'MOV'], g_rajar: ['UNI', 'AREA'], g_u_furia: ['AGU', 'UNI'],
  g_guardia: ['APO', 'CTRL'], g_carga_escudo: ['CTRL', 'MOV'], terremoto: ['UNI', 'AREA'], g_u_ciudadela: ['MOV', 'AREA'],
  g_juicio: ['UNI', 'AREA'], g_sendero: ['APO', 'MOV'], g_martillo: ['UNI', 'AREA'], g_u_cataclismo: ['UNI', 'APO'],
};
{
  assert.deepEqual(Object.keys(GUERRERO_SKILL_FORGE).sort(), BOOK.map(s => s.id).sort(), 'A1: forja para las 17 habilidades del libro (y ninguna más)');
  assert.ok(CLASSES.guerrero.skills.filter(s => s.kind === 'talent').every(s => !GUERRERO_SKILL_FORGE[s.id]), 'las activas de talento no tienen forja (2f §2.1)');
  assert.equal(CLASSES.guerrero.forge, GUERRERO_SKILL_FORGE, 'data.js da la forja a la clase');
  for (const id of Object.keys(GUERRERO_SKILL_FORGE)) assert.equal(SKILL_FORGE[id], GUERRERO_SKILL_FORGE[id], `${id}: en la fusión SKILL_FORGE`);
  const lines = new Map();
  for (const sk of BOOK) {
    const entry = GUERRERO_SKILL_FORGE[sk.id];
    const v = validateForge(entry, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
    assert.deepEqual(v.errors, [], `${sk.id}: ${v.errors.join(' · ')}`);
    assert.deepEqual(v.warnings, [], `A1 ${sk.id}: líneas ≤ ${FORGE_LINE_WARN}: ${v.warnings.join(' · ')}`);
    assert.equal(entry.mejora.id, `${sk.id}_m`, `${sk.id}: id estable de la Mejora`);
    assert.deepEqual(entry.vars.map(x => x.role), ROLES[sk.id], `${sk.id}: papeles de §4/§7`);
    for (const [k, piece] of piecesOf(entry)) {
      assert.ok(FORGE_ROLES.includes(piece.role) || k === 'm', `${piece.id}: papel válido`);
      assert.ok(piece.icon === (k === 'm' ? 'forge/mejora' : `forge/v_${sk.id}_${k}`), `${sk.id}·${k}: icono ${piece.icon}`);
      assert.ok(!/\b(UNI|TTD|proc|stagger|GCD|DoT|AoE|CC)\b|ÁREA×|astadora/.test(piece.line), `${sk.id}·${k}: línea sin jerga`);
      lines.set(`forja.${sk.id}.${k === 'm' ? 'mejora' : `vars.${k}`}.line`, piece.line);
    }
  }
  // las líneas que difieren del mockup (acortadas por A1) están declaradas, y solo esas
  const { C } = cargarMockup('guerrero');
  const div = JSON.parse(readFileSync(new URL('../tools/convert-v2/divergencias.json', import.meta.url), 'utf8')).divergencias
    .filter(d => d.clase === 'guerrero' && /^forja\./.test(d.ruta));
  const changed = [];
  for (const s of C.catalog.filter(x => x.M)) {
    for (const [k, mk] of [['mejora', 'M'], ['vars.i', 'A'], ['vars.ii', 'B']]) {
      const ruta = `forja.${s.id}.${k}.line`;
      if (lines.get(ruta) !== s[mk].s) changed.push(ruta);
    }
  }
  // 12 pasaban de 70 (plan, A1) y 1 cambia de efecto (S-guerrero, G10: la Mejora de la Carga de Escudo)
  assert.equal(changed.length, 13, `13 líneas de la forja difieren del mockup: ${changed.length}`);
  assert.deepEqual(div.map(d => d.ruta).sort(), changed.sort(), 'divergencias.json declara exactamente las líneas acortadas');
  for (const d of div) {
    assert.equal(d.aprobada, false, `${d.ruta}: pendiente del visto bueno del dueño`);
    if (d.motivo.startsWith('S-guerrero')) continue;          // cambia el efecto, no acorta
    const orig = C.catalog.find(s => d.ruta.startsWith(`forja.${s.id}.`));
    const mk = d.ruta.includes('.mejora.') ? 'M' : d.ruta.endsWith('.ii.line') ? 'B' : 'A';
    assert.ok(orig[mk].s.length > 70 && d.motivo.includes(orig[mk].s), `${d.ruta}: el motivo cita la línea original (> 70)`);
  }
}
console.log('A1: 17 habilidades con Mejora + 2 variantes, papeles de §4/§7, líneas ≤ 70 (12 acortadas y 1 cambiada, declaradas) ✓');

// ------------------------------------------------ 2) A2/F7: definiciones forjadas válidas y sin no-ops
// firma de lo que el motor lee: el perfil de resolveSkill y la definición forjada (sin la etiqueta
// `forged`): los tipos genéricos leen de ella cleave, steps, wave, heal, shield, airT, dashT…
function sigOf(h, sk, forge, variant, withMejora = true) {
  h.p.cls = { ...h.p.cls, forge: { ...SKILL_FORGE, [sk.id]: withMejora ? forge : { ...forge, mejora: null } } };
  h.p.skillForge = { [sk.id]: variant };
  h.p.forged = {};
  h.p.recompute();
  const pr = resolveSkill(h.p, sk);
  const { def, mods, sups, onHitPowers, variant: v, mejora, ...rest } = pr;
  void mods; void sups; void onHitPowers; void v; void mejora;
  const { forged, ...d } = def; void forged;
  return JSON.stringify({ rest, d }, (k, x) => (x instanceof Set ? [...x].sort() : x));
}
{
  const h = makeHarness({ classId: 'guerrero', level: 100 });
  const noops = [];
  for (const sk of BOOK) {
    const entry = GUERRERO_SKILL_FORGE[sk.id];
    for (const st of [{ mejora: true }, { mejora: true, variant: 'i' }, { mejora: true, variant: 'ii' }]) {
      // (`forged` es la etiqueta que pone forgeDef: no es una clave del catálogo)
      const { forged, ...d } = forgeDef(sk, entry, st);
      assert.ok(forged && forged.mejora && forged.variant === (st.variant || null), `${sk.id}: etiqueta de la forja`);
      const warnings = [];
      const errs = validateSkillDef(d, { behaviors: SKILL_BEHAVIORS, v2: true, warnings });
      assert.deepEqual(errs, [], `${sk.id} ${JSON.stringify(st)}: definición forjada válida`);
      assert.deepEqual(warnings, [], `${sk.id} ${JSON.stringify(st)}: sin claves desconocidas`);
      assert.equal(d.id, sk.id, 'la forja conserva el id');
    }
    const base = sigOf(h, sk, entry, null, false), m = sigOf(h, sk, entry, null, true);
    if (m === base && !entry.mejora.power) noops.push(`${sk.id}_m`);
    for (const [i, k] of [[0, 'i'], [1, 'ii']]) if (sigOf(h, sk, entry, k, true) === m && !entry.vars[i].power) noops.push(entry.vars[i].id);
  }
  assert.deepEqual(noops, [], `F7: piezas que no cambian nada: ${noops.join(' · ')}`);
  // el comprobador sí detecta un no-op (y una pieza que solo cambia la definición no lo es)
  const sk = SK('g_rajar'), e = GUERRERO_SKILL_FORGE.g_rajar;
  const fake = { ...e, vars: [{ ...e.vars[0], set: {}, mul: {}, tags: null }, { ...e.vars[1], set: { 'steps.2': { type: 'line', range: 5, width: 1 } }, mod: {}, tags: null }] };
  assert.equal(sigOf(h, sk, fake, 'i'), sigOf(h, sk, fake, null), 'F7: una variante vacía no cambia la firma');
  assert.notEqual(sigOf(h, sk, fake, 'ii'), sigOf(h, sk, fake, null), 'F7: cambiar solo los pasos del combo sí la cambia');
}
console.log('A2/F7: 51 definiciones forjadas válidas (v2, sin avisos); ninguna pieza es un no-op ✓');

// ------------------------------------------------ 3) A9 y D28: poderes de la forja
{
  const FP = guerreroForgePowers();
  const used = [];
  for (const entry of Object.values(GUERRERO_SKILL_FORGE)) for (const [, piece] of piecesOf(entry)) if (piece.power) used.push(piece.power);
  assert.deepEqual([...new Set(used)].sort(), Object.keys(FP).sort(), 'cada poder v_* lo usa una pieza de la forja, y viceversa');
  assert.equal(new Set(used).size, used.length, 'un poder por pieza');
  for (const [id, def] of Object.entries(FP)) {
    assert.ok(/^v_[a-z_]+$/.test(id), `${id}: prefijo v_`);
    assert.ok(POWER_HOOKS[id], `${id}: registrado por powers.js`);
    assert.ok(!def.mult, `${id}: sin multiplicador [×] (los «+X %» van al saco aditivo)`);
  }
  // D28: ningún id choca con otra clase (forja ni talentos), ni con el registro de power-ids.json
  const others = new Set([...Object.keys(magaForgePowers()), ...Object.keys(arqueraForgePowers()), ...Object.keys(magaPowers()),
    ...Object.keys(arqueraPowers()), ...Object.keys(guerreroPowers())]);
  const ids = JSON.parse(readFileSync(new URL('../tools/convert-v2/out/power-ids.json', import.meta.url), 'utf8'));
  for (const [cls, o] of Object.entries(ids.clases)) if (cls !== 'guerrero') for (const sec of Object.values(o)) for (const id of Object.keys(sec)) others.add(id);
  for (const id of Object.keys(FP)) assert.ok(!others.has(id), `D28: ${id} ya lo usa otra clase o los talentos`);
  // los 6 poderes de la forja del mockup que se usan son los de power-ids.json (v_carnero no hace falta: `drag`)
  const mock = Object.keys(ids.clases.guerrero.poderes).filter(id => id.startsWith('v_'));
  assert.deepEqual(mock.filter(id => !FP[id]), ['v_carnero'], 'del mockup solo falta v_carnero (Carnero = drag + aturdir)');
  // A9: sin powers.has( en los archivos de la forja
  for (const f of ['../js/powers-forge-guerrero.js', '../js/skills-guerrero.js']) assert.ok(!readFileSync(new URL(f, import.meta.url), 'utf8').includes('powers.has('), `${f}: sin powers.has(`);
  // el poder solo entra en p.powers con su pieza activa (Mejora a req+3, variante a req+6)
  const h = makeHarness({ classId: 'guerrero', level: 8 });
  assert.ok(!h.p.powers.has('v_temple'), 'Nv8: Piel de Hierro aún sin Mejora');
  h.p.level = 9; h.p.recompute();
  assert.ok(h.p.powers.has('v_temple') && !h.p.powers.has('v_espinas'), 'Nv9: Acero Templado; Espinas aún no');
  h.p.level = 12; h.p.skillForge = { g_piel: 'i' }; h.p.recompute();
  assert.ok(h.p.powers.has('v_espinas'), 'Nv12 con la variante I: Espinas');
  h.p.skillForge = { g_piel: 'ii' }; h.p.recompute();
  assert.ok(!h.p.powers.has('v_espinas'), 'con la II, Espinas sale');
  h.p.skillForge = { g_u_furia: 'i' }; h.p.level = 30; h.p.recompute();
  assert.ok(!h.p.powers.has('v_sed_voraz'), 'una variante de otro kit (sin la especialización) no aplica');
  const b = makeHarness({ classId: 'guerrero', level: 30, spec: 'berserker' });
  b.p.skillForge = { g_u_furia: 'i' }; b.p.recompute();
  assert.ok(b.p.powers.has('v_sed_voraz'), 'con la especialización, sí');
  // Giro Firme y el Ciclón son claves del canal genérico (slowImmune, pull), no poderes
  assert.ok(!POWER_HOOKS.v_giro_firme && !POWER_HOOKS.v_ciclon, 'v_giro_firme y v_ciclon retirados');
}
console.log(`A9 y D28: ${Object.keys(guerreroForgePowers()).length} poderes v_* registrados, usados y sin choques entre clases ✓`);

// ------------------------------------------------ 4) en el arnés (canal REAL)
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Maza de prueba', dmg: [100, 100], affixes: {}, quality: 0 };
// héroe con un arma fija y sin críticos (golpe medio constante): los daños se comparan
function hero(level, { spec = null, forge = {} } = {}) {
  const h = makeHarness({ classId: 'guerrero', level, spec });
  h.p.equipment.weapon = { ...WEAPON };
  h.p.skillForge = { ...forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  return h;
}
// daño DIRECTO recibido por un enemigo (sin tics de DoT ni procs)
function tally(e) {
  const t = { direct: 0, n: 0, dot: 0, proc: 0 };
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => { const d = td(a, c, o) || 0; if (o.dot) t.dot += d; else if (o.proc) t.proc += d; else { t.direct += d; t.n++; } return d; };
  return t;
}
const foe = (h, x, z = 0, extra = {}) => { const e = h.enemy({ hp: 1e7, pos: [x, 0, z], ...extra }); e.t = tally(e); return e; };
const hasBuff = (who, id) => (who.buffs || []).some(b => b.id === id && b.t > 0);
const buffOf = (who, id) => (who.buffs || []).find(b => b.id === id && b.t > 0) || null;
const TUN = guerreroForgeTuning();
let h, e, e2, e3;

// ———————— kit base ————————
{ // Tajo · Mejora (Filo Ancho): salpicadura 50 → 65 % y alcance 2 → 2,5 m
  const run = L => { const hh = hero(L); const t = foe(hh, 1.4), near = foe(hh, 2.6), far = foe(hh, 3.7); hh.p.basicAttack(t); return { t, near, far }; };
  const b = run(3), m = run(4);
  assert.ok(approx(b.near.t.direct / b.t.t.direct, 0.5, 0.01) && approx(m.near.t.direct / m.t.t.direct, 0.65, 0.01), 'Filo Ancho: salpicadura 50 → 65 %');
  assert.ok(b.far.t.n === 0 && m.far.t.n === 1, 'Filo Ancho: a 2,3 m del objetivo solo llega con la Mejora');
}
{ // Tajo · I (Desgarro): el objetivo sangra el 60 % del golpe en 3 s; salpicadura 30 %
  const run = forge => { const hh = hero(7, { forge }); const t = foe(hh, 1.4), near = foe(hh, 2.6); hh.p.basicAttack(t); return { hh, t, near }; };
  const m = run({}), d = run({ g_tajo: 'i' });
  assert.ok(approx(d.near.t.direct / d.t.t.direct, 0.3, 0.01), `Desgarro: salpicadura 30 % (${(d.near.t.direct / d.t.t.direct).toFixed(3)})`);
  assert.ok(!m.hh.g.hasDoT(m.t, 'bleed'), 'sin Desgarro, el Tajo no desangra');
  assert.ok(approx(d.hh.g.dotRemaining(d.t, 'bleed') / d.t.t.direct, 0.6, 0.02), 'Desgarro: sangra el 60 % del golpe');
  d.hh.tick(3.3);
  assert.ok(!d.hh.g.hasDoT(d.t, 'bleed') && d.t.t.dot > 0, 'Desgarro: en 3 s');
  // a rango 5 (Nv33) el golpe sube ×1,4 y el sangrado con él (resolveSkill escala hitDot.coef)
  const hi = hero(33, { forge: { g_tajo: 'i' } }), ht = foe(hi, 1.4);
  hi.p.basicAttack(ht);
  assert.ok(approx(ht.t.direct / d.t.t.direct, 1.4, 0.02) && approx(hi.g.dotRemaining(ht, 'bleed') / ht.t.direct, 0.6, 0.02),
    `Desgarro a rango 5: sigue sangrando el 60 % del golpe (${(hi.g.dotRemaining(ht, 'bleed') / ht.t.direct).toFixed(3)})`);
}
{ // Tajo · II (Siega): barrido de 3 m a todos al 75 %; el principal, al 85 %
  const run = forge => { const hh = hero(7, { forge }); const t = foe(hh, 1.4), near = foe(hh, 2.6), far = foe(hh, 4.2); hh.p.basicAttack(t); return { t, near, far }; };
  const m = run({}), s = run({ g_tajo: 'ii' });
  assert.ok(approx(s.t.t.direct / m.t.t.direct, 0.85, 0.01), 'Siega: el principal al 85 %');
  assert.ok(approx(s.near.t.direct / m.t.t.direct, 0.75, 0.01), 'Siega: el barrido al 75 %');
  assert.ok(m.far.t.n === 0 && s.far.t.n === 1, 'Siega: alcanza a 3 m del objetivo');
}
{ // Hendidura · Mejora (Arco Amplio): cono 120 → 150°
  const run = L => { const hh = hero(L); const side = foe(hh, 3 * Math.cos(70 * Math.PI / 180), 3 * Math.sin(70 * Math.PI / 180)); hh.aim(5, 0); hh.setSlot('rmb', 'g_hendidura'); hh.cast('rmb'); hh.step(0.35); return side; };
  assert.ok(run(4).t.n === 0 && run(5).t.n === 1, 'Arco Amplio: a 70° solo con el cono de 150°');
}
{ // Hendidura · I (Rompefilas): +45 % si golpea a uno solo
  const run = (forge, second) => { const hh = hero(8, { forge }); const a = foe(hh, 3); if (second) foe(hh, 3.5, 0.5); hh.aim(5, 0); hh.setSlot('rmb', 'g_hendidura'); hh.cast('rmb'); hh.step(0.35); return a.t.direct; };
  assert.ok(approx(run({ g_hendidura: 'i' }, false) / run({}, false), 1 + TUN.rompefilas.dmgPct / 100, 0.01), 'Rompefilas: +45 % contra uno solo');
  assert.ok(approx(run({ g_hendidura: 'i' }, true) / run({}, true), 1, 0.01), 'Rompefilas: con dos en el cono, nada');
}
{ // Hendidura · II (Grieta): deja una grieta 2 s que daña; solo una a la vez
  const run = forge => {
    const hh = hero(8, { forge }); const a = foe(hh, 3);
    hh.aim(5, 0); hh.setSlot('rmb', 'g_hendidura'); hh.cast('rmb'); hh.step(0.35); hh.tick(0.3); hh.cast('rmb'); hh.step(0.35);
    return { hh, a, f: hh.g.fieldsOf(hh.p, { kind: 'estela', skill: 'g_hendidura' }) };
  };
  const m = run({}), g = run({ g_hendidura: 'ii' });
  assert.ok(m.f.length === 0 && g.f.length === 1 && approx(g.f[0].dur, 2), 'Grieta: una grieta de 2 s (la segunda sustituye a la primera)');
  // el 40 % del ARMA por segundo con el rango y el saco aditivo (zonePct), no el 45 % del golpe
  const pr = resolveSkill(g.hh.p, SK('g_hendidura'));
  const want = g.hh.p.avgHit(0.4 * rankCoef(pr.rank), pr.addPct);
  assert.ok(pr.zonePct === 40 && approx(g.f[0].data.dps, want, 0.5) && g.f[0].data.dps < g.hh.p.avgHit(pr.coef, pr.addPct) * 0.2,
    `Grieta: el 40 % del arma por segundo (${g.f[0].data.dps.toFixed(1)} / ${want.toFixed(1)})`);
  const d0 = g.a.t.dot;
  g.hh.tick(1);
  assert.ok(g.a.t.dot - d0 > 0 && m.a.t.dot === 0, 'Grieta: daña cada segundo');
  g.hh.tick(1.5);
  assert.equal(g.hh.g.fieldsOf(g.hh.p, { kind: 'estela', skill: 'g_hendidura' }).length, 0, 'Grieta: dura 2 s');
}
{ // Embestida · Mejora (Carga Fiera): alcance 7 → 9 m y +4 de Furia si golpea (llega en 0,2 s: S-guerrero, G13)
  const run = L => { const hh = hero(L); hh.p.mp = 0; const a = foe(hh, 9.5); hh.aim(12, 0); hh.setSlot('k1', 'embestida'); hh.cast('k1'); hh.step(0.25); return { x: hh.p.pos.x, hit: a.t.n, mp: hh.p.mp }; };
  const b = run(6), m = run(7);
  assert.ok(approx(b.x, 7, 0.05) && approx(m.x, 9, 0.05), `Carga Fiera: 7 → 9 m (${b.x.toFixed(2)} → ${m.x.toFixed(2)})`);
  assert.ok(b.hit === 0 && m.hit === 1 && m.mp === 16, `Carga Fiera: golpea al llegar y da 12 + 4 de Furia (${m.mp})`);
}
{ // Embestida · I (Carnero): arrastras a los que encuentras y los aturdes 0,5 s
  const run = forge => { const hh = hero(10, { forge }); const a = foe(hh, 4, 0.5); hh.aim(12, 0); hh.setSlot('k1', 'embestida'); hh.cast('k1'); hh.step(0.25); return a; };
  const m = run({}), c = run({ embestida: 'i' });
  assert.ok(approx(m.pos.x, 4) && !(m.stunT > 0), 'sin Carnero: ni arrastra ni aturde');
  assert.ok(c.pos.x > 9 && c.stunT > 0.4 && c.stunT <= 0.5 + 1e-9, `Carnero: arrastra (x=${c.pos.x.toFixed(2)}) y aturde 0,5 s (${c.stunT?.toFixed(2)} al poco de llegar)`);
}
{ // Embestida · II (Doble Carga): 2 cargas
  const run = forge => { const hh = hero(10, { forge }); hh.aim(12, 0); hh.setSlot('k1', 'embestida'); const r = [hh.cast('k1')]; hh.step(0.3); r.push(hh.cast('k1')); hh.step(0.3); r.push(hh.cast('k1')); return { r, hh }; };
  assert.deepEqual(run({}).r, [true, false, false], 'sin Doble Carga: una');
  const d = run({ embestida: 'ii' });
  assert.deepEqual(d.r, [true, true, false], 'Doble Carga: dos seguidas');
  assert.ok(d.hh.p.skCharges.embestida?.n === 0 && d.hh.p.skCharges.embestida.max === 2, 'Doble Carga: 2 cargas gastadas');
  d.hh.tick(8.1);
  assert.equal(d.hh.cast('k1'), true, 'Doble Carga: cada carga vuelve en 8 s');
}
{ // Piel de Hierro · Mejora (Acero Templado): te curas el 8 % al activarla
  const run = L => { const hh = hero(L); hh.p.hp = hh.p.stats.maxHP / 2; hh.setSlot('k2', 'g_piel'); hh.cast('k2'); return (hh.p.hp - hh.p.stats.maxHP / 2) / hh.p.stats.maxHP; };
  assert.ok(approx(run(8), 0) && approx(run(9), TUN.temple.healPct / 100, 0.002), 'Acero Templado: +8 % de vida al activarla');
}
{ // Piel de Hierro · I (Espinas): mientras dura, devuelves el 40 % del daño cuerpo a cuerpo
  const run = forge => {
    const hh = hero(12, { forge }); const a = foe(hh, 1.5);
    const hurt = (melee) => { hh.p.hp = hh.p.stats.maxHP; const before = a.t.proc; hh.p.takeDamage(hh.p.stats.maxHP * 0.3, 1, { melee, source: a }); return { taken: hh.p.stats.maxHP - hh.p.hp, back: a.t.proc - before }; };
    const pre = hurt(true);
    hh.setSlot('k2', 'g_piel'); hh.cast('k2');
    const on = hurt(true), ranged = hurt(false);
    hh.tick(8.2);
    const post = hurt(true);
    return { pre, on, ranged, post };
  };
  const m = run({}), s = run({ g_piel: 'i' });
  assert.equal(m.on.back, 0, 'sin Espinas: nada vuelve');
  assert.ok(s.pre.back === 0 && s.post.back === 0, 'Espinas: solo mientras dura la Piel');
  assert.ok(s.on.taken > 0 && approx(s.on.back / s.on.taken, TUN.espinas.reflectPct / 100, 0.02), `Espinas: devuelve el 40 % (${s.on.back}/${s.on.taken})`);
  assert.equal(s.ranged.back, 0, 'Espinas: solo cuerpo a cuerpo');
}
{ // Piel de Hierro · II (Inamovible): 10 s e imparable; se recarga en 25 s (al acabar)
  const run = forge => { const hh = hero(12, { forge }); hh.setSlot('k2', 'g_piel'); hh.cast('k2'); return hh; };
  const m = run({}), s = run({ g_piel: 'ii' });
  assert.ok(approx(buffOf(m.p, 'g_piel').t, 8, 0.05) && !(m.p.unstoppableT > 0) && approx(m.p.cds.g_piel, 28), 'sin Inamovible: 8 s y 20 s de recarga');
  assert.ok(approx(buffOf(s.p, 'g_piel').t, 10, 0.05) && s.p.unstoppableT > 9.9 && approx(s.p.cds.g_piel, 35), 'Inamovible: 10 s imparable y 25 s de recarga al acabar');
}
{ // Lanza · Mejora (Punta de Arpón): ralentiza un 30 % durante 2 s
  const run = L => { const hh = hero(L); const a = foe(hh, 5); hh.aim(10, 0); hh.setSlot('rmb', 'g_lanza'); hh.cast('rmb'); hh.step(0.5); return a; };
  const b = run(10), m = run(11);
  assert.ok(!(b.slowT > 0) && m.slowT > 1.5 && m.slowPct === 30, 'Punta de Arpón: ralentiza un 30 % unos 2 s');
}
{ // Lanza · I (Arpón): el primero es arrastrado 4 m hacia ti (+30 %); ya no atraviesa
  const run = forge => { const hh = hero(14, { forge }); const a = foe(hh, 8), b = foe(hh, 10); hh.aim(10, 0); hh.setSlot('rmb', 'g_lanza'); hh.cast('rmb'); hh.step(1); return { a, b }; };
  const m = run({}), s = run({ g_lanza: 'i' });
  // (el golpe empuja un poco a ambos: se mide la diferencia entre los dos casos)
  assert.ok(m.b.t.n === 1 && m.a.pos.x > 7.5, 'sin Arpón: atraviesa y no arrastra');
  assert.ok(s.b.t.n === 0 && approx(m.a.pos.x - s.a.pos.x, 4, 0.1), `Arpón: arrastra al primero 4 m (x=${s.a.pos.x.toFixed(2)}) y se queda en él`);
  assert.ok(approx(s.a.t.direct / m.a.t.direct, 1.3, 0.01), 'Arpón: +30 %');
}
{ // Lanza · II (Jabalinas): 3 lanzas en abanico al 70 %
  const run = forge => { const hh = hero(14, { forge }); const mid = foe(hh, 8), side = foe(hh, 8 * Math.cos(0.25), 8 * Math.sin(0.25)); hh.aim(10, 0); hh.setSlot('rmb', 'g_lanza'); hh.cast('rmb'); hh.step(1); return { mid, side }; };
  const m = run({}), s = run({ g_lanza: 'ii' });
  assert.ok(m.side.t.n === 0 && s.side.t.n === 1, 'Jabalinas: la de un lado alcanza a quien está en el abanico');
  assert.ok(approx(s.mid.t.direct / m.mid.t.direct, 0.7, 0.01), 'Jabalinas: cada lanza al 70 %');
}

// ———————— kit del Berserker ————————
{ // Remolino · Mejora (Giro Firme): mientras giras no te pueden ralentizar
  const run = L => {
    const hh = hero(L, { spec: 'berserker' }); hh.setSlot('k3', 'g_remolino');
    hh.press('k3'); hh.step(0.3);
    const during = hh.p.applySlow(2); hh.p.slowT = 0;
    hh.release('k3'); hh.step(0.5);
    return { during, after: hh.p.applySlow(2) };
  };
  const b = run(12), m = run(13);
  assert.ok(b.during === true && m.during === false, 'Giro Firme: inmune a ralentizaciones al girar');
  assert.equal(m.after, true, 'Giro Firme: al dejar de girar, vuelven a ralentizarte');
}
{ // Remolino · I (Anclado): giras sin moverte; radio 2 m y +60 %
  const run = forge => {
    const hh = hero(16, { spec: 'berserker', forge }); const near = foe(hh, 1.6), mid = foe(hh, 2.6);
    hh.setSlot('k3', 'g_remolino'); hh.press('k3'); hh.walk({ x: 0, z: 1 }, 0.8);
    const z = hh.p.pos.z; hh.release('k3'); return { near, mid, z };
  };
  const m = run({}), a = run({ g_remolino: 'i' });
  assert.ok(m.z > 0.5 && approx(a.z, 0, 1e-6), 'Remolino Anclado: no te mueves');
  assert.ok(m.mid.t.n > 0 && a.mid.t.n === 0, 'Remolino Anclado: radio 2 m');
  assert.ok(approx((a.near.t.direct / a.near.t.n) / (m.near.t.direct / m.near.t.n), 1.6, 0.01), 'Remolino Anclado: +60 %');
}
{ // Remolino · II (Ciclón): cada giro atrae 1 m a los enemigos a 5 m; −15 %
  const run = forge => { const hh = hero(16, { spec: 'berserker', forge }); const near = foe(hh, 1.6), far = foe(hh, 4.5); hh.setSlot('k3', 'g_remolino'); hh.press('k3'); hh.stand(0.8); return { near, far }; };
  const m = run({}), c = run({ g_remolino: 'ii' });
  assert.ok(approx(m.far.pos.x, 4.5) && c.far.pos.x < 3.6, `Ciclón: atrae a 5 m (4,5 → ${c.far.pos.x.toFixed(2)})`);
  // un giro (el primer tic del canal: al pulsar, tickNow) = 1 m, fuera y dentro del radio del daño
  // (2,9 m): el golpe del giro no vuelve a atraer al que alcanza (serían 2 m). Al que golpea, el giro
  // ya lo mueve un poco sin la variante: se mide la diferencia entre los dos casos
  // Luego, tres giros (0 s, 0,25 s y 0,5 s): un tirón de 1 m por giro, también cuando ya entra en el
  // radio del daño
  const spin = forge => {
    const hh = hero(16, { spec: 'berserker', forge }); const out = foe(hh, 4.5), inR = foe(hh, 0, -2.5);
    const pulls = [], disp = out.displace.bind(out);
    out.displace = (from, d, o) => { pulls.push(d); return disp(from, d, o); };
    hh.setSlot('k3', 'g_remolino'); hh.press('k3'); hh.stand(0.1);
    const one = { out: out.pos.x, outN: out.t.n, inR: inR.pos.z, inN: inR.t.n };
    hh.stand(0.5);
    return { one, pulls };
  };
  const m1 = spin({}), c1 = spin({ g_remolino: 'ii' });
  assert.ok(approx(c1.one.out, 3.5, 0.01) && c1.one.outN === 0, `Ciclón: 1 m por giro (4,5 → ${c1.one.out.toFixed(2)})`);
  const pulled = c1.one.inR - m1.one.inR;
  assert.ok(m1.one.inN === 1 && c1.one.inN === 1 && approx(pulled, 1, 0.01), `Ciclón: 1 m por giro también a quien golpea (${pulled.toFixed(2)} m)`);
  assert.ok(m1.pulls.length === 0 && c1.pulls.length === 3 && c1.pulls.every(d => d === 1), `Ciclón: un tirón de 1 m por giro (${JSON.stringify(c1.pulls)})`);
  assert.ok(approx((c.near.t.direct / c.near.t.n) / (m.near.t.direct / m.near.t.n), 0.85, 0.01), 'Ciclón: −15 % de daño');
}
{ // Remolino · II (Ciclón) junto a un jefe: los tirones no le llenan Quebranto (solo el del daño, −15 %)
  const run = forge => {
    const hh = hero(16, { spec: 'berserker', forge }); const boss = foe(hh, 2, 0, { boss: true }), mob = foe(hh, 0, 4.5);
    hh.setSlot('k3', 'g_remolino'); hh.press('k3'); hh.stand(3.2);
    return { boss, mob, hits: boss.t.n };
  };
  const m = run({}), c = run({ g_remolino: 'ii' });
  assert.ok(c.hits >= 10 && c.mob.pos.z < 3.6, `Ciclón: gira todo el canal y atrae al normal (${c.hits} giros; z=${c.mob.pos.z.toFixed(2)})`);
  const extra = c.boss.stagger - m.boss.stagger * 0.85;
  assert.ok(approx(extra, 0, 0.05), `Ciclón: ningún Quebranto por tirones al jefe (${extra.toFixed(2)} de más)`);
}
{ // Salto · Mejora (Caída Pesada): radio de la caída 3 → 4 m
  const run = L => { const hh = hero(L, { spec: 'berserker' }); const a = foe(hh, 9.6); hh.aim(6, 0); hh.setSlot('k1', 'g_salto'); hh.cast('k1'); hh.step(0.6); return a.t.n; };
  assert.ok(run(14) === 0 && run(15) === 1, 'Caída Pesada: a 3,6 m de la caída solo con la Mejora');
}
{ // Salto · I (Caída Atronadora): un solo salto; al caer atraes 2 m y aturdes 0,75 s
  const run = forge => { const hh = hero(18, { spec: 'berserker', forge }); const a = foe(hh, 9); hh.aim(6, 0); hh.setSlot('k1', 'g_salto'); hh.cast('k1'); hh.step(0.6); return { hh, a }; };
  const m = run({}), c = run({ g_salto: 'i' });
  assert.ok(m.hh.p.skState.g_salto.recast?.left === 2 && m.a.pos.x > 8.9 && !(m.a.stunT > 0), 'sin la variante: relanzar y sin control');
  assert.ok(!c.hh.p.skState.g_salto?.recast?.left && c.hh.cast('k1') === false, 'Caída Atronadora: un solo salto (recarga)');
  // cae a ~0,47 s: a los 0,6 s le quedan ~0,6 s de los 0,75
  assert.ok(approx(m.a.pos.x - c.a.pos.x, 2, 0.05) && c.a.stunT > 0.55 && c.a.stunT <= 0.75, `Caída Atronadora: atrae 2 m (x=${c.a.pos.x.toFixed(2)}) y aturde 0,75 s`);
}
{ // Salto · II (Salto Rasante): 12 m, bajo y rápido (0,25 s en el aire); −20 %
  const run = forge => {
    const hh = hero(18, { spec: 'berserker', forge }); const a = foe(hh, 8);
    hh.aim(8, 0); hh.setSlot('k1', 'g_salto'); hh.cast('k1'); hh.step(0.3);
    const landed = !hh.p.leap; hh.step(0.3);
    const far = hero(18, { spec: 'berserker', forge }); far.aim(15, 0); far.setSlot('k1', 'g_salto'); far.cast('k1'); far.step(1);
    return { landed, a, x: far.p.pos.x };
  };
  const m = run({}), r = run({ g_salto: 'ii' });
  assert.ok(!m.landed && r.landed, 'Salto Rasante: cae en 0,25 s (el normal sigue en el aire)');
  // clampWalkable avanza en pasos de 0,3 m: el de 8 m cae a 7,8 (W2)
  assert.ok(approx(m.x, 8, 0.25) && approx(r.x, 12, 0.25) && r.x - m.x > 3.7, `Salto Rasante: 12 m (${m.x.toFixed(2)} → ${r.x.toFixed(2)})`);
  assert.ok(approx(r.a.t.direct / m.a.t.direct, 0.8, 0.01), 'Salto Rasante: −20 %');
}
{ // Rajar · Mejora (Filo Encadenado): el combo espera 4 s
  const run = L => { const hh = hero(L, { spec: 'berserker' }); foe(hh, 1.8); hh.aim(1.8, 0); hh.setSlot('rmb', 'g_rajar'); hh.cast('rmb'); hh.step(0.35); hh.tick(3); hh.cast('rmb'); hh.step(0.35); return hh.p.skState.g_rajar.combo.idx; };
  assert.ok(run(16) === 1 && run(17) === 2, 'Filo Encadenado: tras 3 s sin pulsar el combo sigue');
}
// los tres pasos de Rajar: el daño de cada paso en cada enemigo
function rajar(forge, spots) {
  const hh = hero(20, { spec: 'berserker', forge });
  const es = spots.map(([x, z]) => foe(hh, x, z));
  hh.aim(1.8, 0); hh.setSlot('rmb', 'g_rajar');
  const steps = [];
  for (let i = 0; i < 3; i++) {
    const before = es.map(x => x.t.direct);
    hh.cast('rmb'); hh.step(i === 2 ? 0.45 : 0.35);
    steps.push(es.map((x, j) => x.t.direct - before[j]));
  }
  return steps;
}
{ // Rajar · I (Estocada Final): el 3.er golpe es una estocada de 5 m en línea: +40 % y sin área
  const spots = [[1.8, 0], [4.8, 0], [1.8, 1.6]];
  const m = rajar({}, spots), s = rajar({ g_rajar: 'i' }, spots);
  assert.ok(m[2][1] === 0 && s[2][1] > 0, 'Estocada Final: el 3.º llega a 4,8 m en línea');
  assert.ok(m[2][2] > 0 && s[2][2] === 0, 'Estocada Final: sin área (el de al lado no)');
  assert.ok(approx(s[2][0] / m[2][0], 1.4, 0.01), 'Estocada Final: +40 %');
  assert.ok(approx(s[0][0] / m[0][0], 1, 0.01), 'los dos primeros golpes no cambian');
}
{ // Rajar · II (Molino): los tres golpes son giros de 2,5 m a tu alrededor; −20 %
  const spots = [[1.8, 0], [-1.5, 0]];
  const m = rajar({}, spots), s = rajar({ g_rajar: 'ii' }, spots);
  assert.ok(m[0][1] === 0 && s.every(st => st[1] > 0), 'Molino: los tres golpes dan también detrás');
  assert.ok(approx(s[0][0] / m[0][0], 0.8, 0.01), 'Molino: −20 %');
}
{ // Furia Inmortal · Mejora (Sin Freno): dura 10 → 12 s
  const run = L => { const hh = hero(L, { spec: 'berserker' }); hh.setSlot('k4', 'g_u_furia'); hh.cast('k4'); return buffOf(hh.p, 'g_u_furia').t; };
  assert.ok(approx(run(17), 10, 0.05) && approx(run(18), 12, 0.05), 'Sin Freno: 12 s');
}
{ // Furia Inmortal · I (Sed Voraz): robas el 8 % del daño como vida; al acabar no te curas
  const run = forge => {
    const hh = hero(21, { spec: 'berserker', forge }); const a = foe(hh, 2);
    hh.setSlot('k4', 'g_u_furia'); hh.cast('k4'); hh.p.hp = hh.p.stats.maxHP / 2;
    hh.aim(2, 0); hh.setSlot('rmb', 'g_hendidura'); hh.step(0.25); hh.cast('rmb'); hh.step(0.35);
    const sustained = hh.sustained(), dealt = a.t.direct;
    hh.tick(11); const hp0 = hh.p.hp; hh.tick(1);
    const endHeal = hh.p.hp - hp0;
    // ya sin la Furia Inmortal: otro golpe con la variante elegida
    const s0 = hh.sustained(), d0 = a.t.direct;
    hh.p.hp = hh.p.stats.maxHP / 2; hh.p.mp = hh.p.stats.maxMP; hh.cast('rmb'); hh.step(0.35);
    return { sustained, dealt, endHeal, hh, after: hh.sustained() - s0, dealtAfter: a.t.direct - d0 };
  };
  const m = run({}), s = run({ g_u_furia: 'i' });
  assert.equal(m.sustained, 0, 'sin Sed Voraz: no robas vida');
  assert.ok(s.sustained > 0 && s.sustained <= s.dealt * TUN.sedVoraz.leechPct / 100 + 1, `Sed Voraz: roba hasta el 8 % (${Math.round(s.sustained)} de ${s.dealt})`);
  assert.ok(m.endHeal >= m.hh.p.stats.maxHP * 0.19 && s.endHeal < s.hh.p.stats.maxHP * 0.02, `Sed Voraz: al acabar no te curas (sin ella, un 20 %): ${Math.round(m.endHeal)} / ${Math.round(s.endHeal)}`);
  assert.ok(s.dealtAfter > 0 && s.after === 0, `Sed Voraz: fuera de la Furia Inmortal no roba (${s.after} tras ${s.dealtAfter} de daño)`);
}
{ // Furia Inmortal · II (Frenesí): +40 % de velocidad de ataque, pero la vida sí baja del 1 %
  // el buff crece con el rango (rankBuff): S0 cuenta el rango del kit desde el Nv10, así que a Nv21 es el 2
  const run = forge => { const hh = hero(21, { spec: 'berserker', forge }); const as0 = hh.p.stats.aspdPct; hh.setSlot('k4', 'g_u_furia'); hh.cast('k4'); const as = hh.p.stats.aspdPct - as0; const rank = resolveSkill(hh.p, CLASSES.guerrero.skills.find(s => s.id === 'g_u_furia')).rank; hh.p.takeDamage(hh.p.stats.maxHP * 5, 1); return { as, rank, alive: hh.p.alive }; };
  const m = run({}), f = run({ g_u_furia: 'ii' });
  assert.ok(m.as === 0 && f.as === Math.round(40 * rankBuff(f.rank)), `Frenesí: +40 % de velocidad de ataque × rango ${f.rank} (${f.as})`);
  assert.ok(m.alive && !f.alive, 'Frenesí: sin la vida mínima del 1 %');
}

// ———————— kit del Guardián ————————
{ // Cambio de Guardia · Mejora (Guardia Ligera): cambiar se recarga en 1,5 s
  const run = L => { const hh = hero(L, { spec: 'guardian' }); hh.setSlot('k3', 'g_guardia'); hh.cast('k3'); hh.tick(1.6); const ok = hh.cast('k3'); return { ok, cd: hh.p.cds.g_guardia }; };
  const b = run(12), m = run(13);
  assert.ok(!b.ok && m.ok && approx(m.cd, 1.5, 0.01), 'Guardia Ligera: a los 1,6 s ya se cambia (antes 3 s)');
}
{ // Cambio de Guardia · I (Guardia Compartida): tus aliados a 6 m reciben la mitad de tu postura
  const run = forge => {
    const hh = hero(16, { spec: 'guardian', forge }); const near = hh.ally(4, 0), far = hh.ally(8, 0);
    hh.setSlot('k3', 'g_guardia'); hh.cast('k3'); hh.tick(0.5);
    const wall = { near: { ...buffOf(near, 'v_guardia_compartida')?.stats }, far: hasBuff(far, 'v_guardia_compartida') };
    hh.tick(3); hh.cast('k3'); hh.tick(0.5);
    return { wall, ram: { ...buffOf(near, 'v_guardia_compartida')?.stats }, self: hasBuff(hh.p, 'v_guardia_compartida') };
  };
  const m = run({}), c = run({ g_guardia: 'i' });
  assert.deepEqual(m.wall.near, {}, 'sin la variante: nada a los aliados');
  assert.deepEqual(c.wall.near, { dr: 8 }, 'Guardia Compartida: Muralla → −8 % de daño recibido');
  assert.deepEqual(c.ram, { dmgPct: 8 }, 'Guardia Compartida: Ariete → +8 % de daño');
  assert.ok(!c.wall.far && !c.self, 'Guardia Compartida: solo a 6 m y no a ti (ya tienes la tuya)');
}
{ // Cambio de Guardia · II (Guardia Opresiva): a 5 m, Muralla les quita un 10 % de daño; Ariete los frena un 20 %
  const run = forge => {
    const hh = hero(16, { spec: 'guardian', forge }); const near = foe(hh, 4), far = foe(hh, 7);
    hh.setSlot('k3', 'g_guardia'); hh.cast('k3'); hh.tick(0.3);
    const wall = { near: near.outDmgMul(), far: far.outDmgMul(), slow: near.slowT > 0 };
    hh.tick(3); hh.cast('k3'); hh.tick(0.5);
    return { wall, ram: { slow: near.slowT > 0 ? near.slowPct : 0, far: far.slowT > 0, mul: near.outDmgMul() } };
  };
  const m = run({}), o = run({ g_guardia: 'ii' });
  assert.ok(m.wall.near === 1 && m.ram.slow === 0, 'sin la variante: nada a los enemigos');
  assert.ok(approx(o.wall.near, 0.9) && o.wall.far === 1 && !o.wall.slow, 'Guardia Opresiva: en Muralla, −10 % de daño a 5 m');
  assert.ok(o.ram.slow === 20 && !o.ram.far && o.ram.mul === 1, 'Guardia Opresiva: en Ariete, frenados un 20 % (y ya sin debilitar)');
}
{ // Carga de Escudo · Mejora (Avance Largo): 10 m a la misma velocidad (8 m/s: S-guerrero, G10)
  const run = (L, sec) => { const hh = hero(L, { spec: 'guardian' }); hh.aim(14, 0); hh.setSlot('k1', 'g_carga_escudo'); hh.cast('k1'); hh.step(sec); return hh.p.pos.x; };
  assert.ok(approx(run(14, 1.4), 8, 0.1) && approx(run(15, 1.4), 10, 0.1), 'Avance Largo: 8 → 10 m');
  assert.ok(approx(run(15, 1.0), 8, 0.2), 'Avance Largo: a 8 m/s (en 1 s, 8 m de los 10)');
}
{ // Carga de Escudo · I (Arrollador): al llegar derribas 1 s a los arrastrados (jefes: 20 de Quebranto)
  const run = forge => {
    const hh = hero(18, { spec: 'guardian', forge }); const a = foe(hh, 3, 0.5), boss = foe(hh, 10.6, 0, { boss: true });
    hh.aim(14, 0); hh.setSlot('k1', 'g_carga_escudo'); hh.cast('k1'); hh.step(1.35);
    return { a, boss };
  };
  const m = run({}), r = run({ g_carga_escudo: 'i' });
  assert.ok(m.a.pos.x > 9 && !(m.a.stunT > 0), 'sin la variante: arrastra sin derribar');
  // 10 m (con la Mejora) a 8 m/s: llega a ~1,25 s; a los 1,35 s le quedan ~0,9 s del derribo de 1 s
  assert.ok(r.a.pos.x > 9 && r.a.stunT > 0.75 && r.a.stunT <= 1, `Arrollador: derriba 1 s a los arrastrados (${r.a.stunT.toFixed(2)})`);
  assert.ok(!(r.boss.stunT > 0) && approx(r.boss.stagger - m.boss.stagger, 20, 0.01), `Arrollador: al jefe, 20 de Quebranto y nada más (${(r.boss.stagger - m.boss.stagger).toFixed(2)})`);
}
{ // Carga de Escudo · II (Carga Veloz): 12 m en 0,3 s, sin arrastrar ni provocar
  const run = forge => { const hh = hero(18, { spec: 'guardian', forge }); const a = foe(hh, 3, 0.5), end = foe(hh, 12.4); hh.aim(14, 0); hh.setSlot('k1', 'g_carga_escudo'); hh.cast('k1'); hh.step(0.35); return { hh, a, end }; };
  const m = run({}), v = run({ g_carga_escudo: 'ii' });
  assert.ok(m.hh.p.dashMove && approx(v.hh.p.pos.x, 12, 0.1) && !v.hh.p.dashMove, `Carga Veloz: 12 m en 0,3 s (x=${v.hh.p.pos.x.toFixed(2)})`);
  assert.ok(approx(v.a.pos.x, 3) && v.end.t.n === 1 && !(v.end.tauntT > 0), 'Carga Veloz: ni arrastra ni provoca (pero golpea al llegar)');
}
// Terremoto en marcha (sin réplicas): daño de cada enemigo
function quake(level, forge, spots, aim = [5, 0]) {
  const hh = hero(level, { spec: 'guardian', forge });
  const es = spots.map(([x, z, extra]) => foe(hh, x, z, extra || {}));
  hh.walk({ x: 0, z: 1 }, 0.2); hh.p.pos.set(0, 0, 0);
  hh.aim(aim[0], aim[1]); hh.setSlot('rmb', 'terremoto'); hh.cast('rmb'); hh.step(0.5);
  return es;
}
{ // Terremoto · Mejora (Suelo Partido): radio 5 → 6 m
  assert.ok(quake(16, {}, [[5.8, 0]])[0].t.n === 0 && quake(17, {}, [[5.8, 0]])[0].t.n === 1, 'Suelo Partido: a 5,8 m solo con la Mejora');
}
{ // Terremoto · I (Martinete): un solo punto a 3 m: radio 2,5 m, +60 % y 20 de Quebranto a los jefes
  const spots = [[3, 0], [-3, 0], [3.5, 1, { boss: true }]];
  const m = quake(20, {}, spots, [3, 0]), t = quake(20, { terremoto: 'i' }, spots, [3, 0]);
  assert.ok(m[1].t.n === 1 && t[1].t.n === 0, 'Martinete: golpea donde apuntas (no a tu alrededor)');
  assert.ok(approx(t[0].t.direct / m[0].t.direct, 1.6, 0.01), 'Martinete: +60 %');
  const dmgStagger = t[2].stagger - m[2].stagger * 1.6;
  assert.ok(approx(dmgStagger, 20, 0.05), `Martinete: 20 de Quebranto al jefe (${dmgStagger.toFixed(2)})`);
}
{ // Terremoto · II (Falla): el suelo se abre en línea 10 m: −20 %; ralentiza un 40 % 2 s
  const spots = [[3, 0], [9, 0], [0, 4]];
  const m = quake(20, {}, spots, [10, 0]), f = quake(20, { terremoto: 'ii' }, spots, [10, 0]);
  assert.ok(m[1].t.n === 0 && f[1].t.n === 1 && m[2].t.n === 1 && f[2].t.n === 0, 'Falla: en línea de 10 m hacia la mira (no a tu alrededor)');
  assert.ok(approx(f[0].t.direct / m[0].t.direct, 0.8, 0.01), 'Falla: −20 %');
  assert.ok(f[0].slowT > 1.8 && f[0].slowPct === 40 && !(m[0].slowT > 0), 'Falla: ralentiza un 40 % 2 s');
}
{ // Ciudadela · Mejora (Muros Altos): dura 10 s
  const run = L => { const hh = hero(L, { spec: 'guardian' }); hh.setSlot('k4', 'g_u_ciudadela'); hh.cast('k4'); hh.tick(9); return hasBuff(hh.p, 'g_u_ciudadela'); };
  assert.ok(!run(17) && run(18), 'Muros Altos: a los 9 s sigue en pie');
}
{ // Ciudadela · I (Andante): te mueves al 50 % y te sigue; la reducción baja a −25 %
  const free = hero(21, { spec: 'guardian' }); free.walk({ x: 1, z: 0 }, 1); const spd = free.p.pos.x;
  const run = forge => { const hh = hero(21, { spec: 'guardian', forge }); hh.setSlot('k4', 'g_u_ciudadela'); hh.cast('k4'); hh.walk({ x: 1, z: 0 }, 1); const x1 = hh.p.pos.x; hh.walk({ x: 1, z: 0 }, 5); return { hh, x1, b: buffOf(hh.p, 'g_u_ciudadela') }; };
  const m = run({}), a = run({ g_u_ciudadela: 'i' });
  assert.ok(approx(m.x1, 0, 1e-6) && m.hh.p.planted, 'sin la variante: clavado y plantado');
  assert.ok(approx(a.x1 / spd, 0.5, 0.06), `Andante: caminas al 50 % (${(a.x1 / spd).toFixed(2)})`);
  // −25 % × rango (rankBuff; S0: a Nv21 el kit va en rango 2)
  const drWant = Math.round(25 * rankBuff(resolveSkill(a.hh.p, CLASSES.guerrero.skills.find(s => s.id === 'g_u_ciudadela')).rank));
  assert.ok(a.hh.p.pos.x > 7 && a.b && a.b.stats.dr === drWant && !a.hh.p.planted, `Andante: lejos del punto inicial sigues con ella (−25 % × rango: ${a.b?.stats.dr}) y no estás plantado`);
}
{ // Ciudadela · II (Empalizada): quien te golpea recibe el 60 % de tu arma (una vez por segundo)
  const run = forge => {
    const hh = hero(21, { spec: 'guardian', forge }); const a = foe(hh, 1.5);
    const hit = () => { const b = a.t.proc; hh.p.takeDamage(50, 1, { melee: true, source: a }); return a.t.proc - b; };
    const pre = hit();
    hh.setSlot('k4', 'g_u_ciudadela'); hh.cast('k4'); hh.step(0.05);   // el aura da su buff en el siguiente tick
    const r = [hit(), hit()]; hh.tick(1.1); r.push(hit());
    return { pre, r, wd: hh.p.avgHit(TUN.empalizada.coef) };
  };
  const m = run({}), p = run({ g_u_ciudadela: 'ii' });
  assert.deepEqual(m.r, [0, 0, 0], 'sin la variante: nada');
  assert.ok(p.pre === 0 && approx(p.r[0], p.wd, 1) && p.r[1] === 0 && approx(p.r[2], p.wd, 1), `Empalizada: 60 % del arma, una vez por segundo (${p.r})`);
}

// ———————— kit del Cruzado ————————
// Juicio a 6 m: enemigos y marcas
function judge(level, forge, spots, aim = [6, 0]) {
  const hh = hero(level, { spec: 'cruzado', forge });
  const es = spots.map(([x, z]) => foe(hh, x, z));
  hh.aim(aim[0], aim[1]); hh.setSlot('k3', 'g_juicio'); hh.cast('k3'); hh.step(1.2);
  return es;
}
{ // Juicio · Mejora (Juicio Amplio): radio 3 → 4 m
  assert.ok(judge(12, {}, [[6, 0], [6, 3.8]])[1].t.n === 0 && judge(13, {}, [[6, 0], [6, 3.8]])[1].t.n === 1, 'Juicio Amplio: a 3,8 m solo con la Mejora');
}
{ // Juicio · I (Sentencia): marca a un solo enemigo 12 s; recibe +15 % de daño de todo el grupo
  const m = judge(16, {}, [[6, 0], [7.5, 1]]), s = judge(16, { g_juicio: 'i' }, [[6, 0], [7.5, 1]]);
  assert.ok(m[1].marks?.juicio && !s[1].marks?.juicio && s[1].t.n === 0, 'Sentencia: solo el golpeado');
  assert.ok(s[0].marks.juicio.t > 10.5 && m[0].marks.juicio.t < 8, `Sentencia: la marca dura 12 s (antes 8 s): ${s[0].marks.juicio.t.toFixed(2)}`);
  assert.ok(s[0].weaknessPct() === 15 && m[0].weaknessPct() === 0, 'Sentencia: recibe un 15 % más de daño');
}
{ // Juicio · II (Tres Juicios): 3 martillos en abanico al 60 %; cada uno marca
  const side = [10 * Math.cos(0.3), 10 * Math.sin(0.3)];
  assert.ok(!judge(16, {}, [side], [10, 0])[0].marks?.juicio && judge(16, { g_juicio: 'ii' }, [side], [10, 0])[0].marks?.juicio, 'Tres Juicios: el del lado también queda marcado');
  const m = judge(16, {}, [[10, 0]], [10, 0]), t = judge(16, { g_juicio: 'ii' }, [[10, 0]], [10, 0]);
  assert.ok(approx(t[0].t.direct / m[0].t.direct, 0.6, 0.01), 'Tres Juicios: cada martillo al 60 %');
}
{ // Sendero · Mejora (Huella de Luz): el sendero dura 6 s
  const run = L => { const hh = hero(L, { spec: 'cruzado' }); hh.aim(10, 0); hh.setSlot('k1', 'g_sendero'); hh.cast('k1'); return hh.g.fieldsOf(hh.p, { kind: 'zona', skill: 'g_sendero' })[0].dur; };
  assert.ok(approx(run(14), 4) && approx(run(15), 6), 'Huella de Luz: 4 → 6 s');
}
{ // Sendero · I (Escolta de Luz): al atravesar a un aliado, escudo del 12 % de tu vida 6 s (una vez cada 6 s)
  const run = forge => {
    const hh = hero(18, { spec: 'cruzado', forge }); const on = hh.ally(4, 0.5), off = hh.ally(4, 4);
    hh.aim(10, 0); hh.setSlot('k1', 'g_sendero'); hh.cast('k1');
    const first = on.shields.length;
    hh.tick(1); hh.g.reduceCooldown(hh.p, 'g_sendero', Infinity); hh.aim(-2, 0); hh.cast('k1');
    return { hh, on, off, first };
  };
  const m = run({}), s = run({ g_sendero: 'i' });
  assert.ok(m.first === 0, 'sin la variante: ningún escudo');
  assert.ok(s.first === 1 && approx(s.on.shields[0].amt, s.hh.p.stats.maxHP * TUN.escolta.shieldPct / 100, 1) && s.on.shields[0].t === 6, 'Escolta de Luz: 12 % de tu vida, 6 s');
  assert.ok(s.off.shields.length === 0, 'Escolta de Luz: solo a quien atraviesas');
  assert.equal(s.on.shields.length, 1, 'Escolta de Luz: una vez cada 6 s por aliado');
}
{ // Sendero · II (Destello Doble): 2 cargas; el sendero dura 2 s
  const hh = hero(18, { spec: 'cruzado', forge: { g_sendero: 'ii' } }); hh.aim(10, 0); hh.setSlot('k1', 'g_sendero');
  const r = [hh.cast('k1')]; hh.step(0.1); hh.aim(0, 0); r.push(hh.cast('k1')); hh.step(0.1); r.push(hh.cast('k1'));
  assert.deepEqual(r, [true, true, false], 'Destello Doble: dos seguidos');
  assert.ok(hh.g.fieldsOf(hh.p, { kind: 'zona', skill: 'g_sendero' }).every(f => approx(f.dur, 2)), 'Destello Doble: el sendero dura 2 s');
}
// Martillo: carga `hold` s y suelta; daño de cada enemigo
function hammer(level, forge, spots, hold, aim = [2.5, 0]) {
  const hh = hero(level, { spec: 'cruzado', forge });
  const es = spots.map(([x, z]) => foe(hh, x, z));
  hh.aim(aim[0], aim[1]); hh.setSlot('rmb', 'g_martillo');
  hh.press('rmb'); hh.step(hold); hh.release('rmb'); hh.step(1);
  return { hh, es };
}
{ // Martillo · Mejora (Mano Ágil): carga completa en 0,9 s; la ventana (0,6–0,85 s) se adelanta igual
  assert.ok(hammer(16, {}, [[2.5, 0]], 0.75).hh.sfxCount('verb_perfect') === 0 && hammer(17, {}, [[2.5, 0]], 0.75).hh.sfxCount('verb_perfect') === 1, 'Mano Ágil: 0,75 s es perfecta');
  const full = hammer(17, {}, [[2.5, 0]], 1.2).hh;
  assert.equal(full.sfxCount('verb_perfect'), 0, 'Mano Ágil: a 0,9 s se suelta sola (fuera de la ventana)');
  assert.ok(full.g.sfxLog.some(x => x.name === 'verb_win'), 'Mano Ágil: la ventana se sigue avisando');
}
{ // Martillo · I (Martillo Arrojado): al soltar, lo lanzas a 12 m contra uno solo: +40 % y sin área
  const far = [[10, 0], [10, 1.5]];
  const m = hammer(20, {}, far, 0.3, [10, 0]).es, t = hammer(20, { g_martillo: 'i' }, far, 0.3, [10, 0]).es;
  assert.ok(m[0].t.n === 0 && t[0].t.n === 1 && t[1].t.n === 0, 'Martillo Arrojado: llega a 10 m y solo al primero');
  const near = [[2.5, 0]];
  assert.ok(approx(hammer(20, { g_martillo: 'i' }, near, 0.3).es[0].t.direct / hammer(20, {}, near, 0.3).es[0].t.direct, 1.4, 0.01), 'Martillo Arrojado: +40 % con la misma carga');
}
{ // Martillo · II (Onda Sagrada): al soltar, el golpe sigue en una onda de 8 m hacia delante (60 %)
  // (2,5; 0) = el del impacto · (5; 0) = dentro del golpe y en la línea · (9; 0) = solo la onda
  const spots = [[2.5, 0], [5, 0], [9, 0]];
  const m = hammer(20, {}, spots, 0.3).es, o = hammer(20, { g_martillo: 'ii' }, spots, 0.3).es;
  assert.ok(m[2].t.n === 0 && o[2].t.n === 1, 'Onda Sagrada: alcanza a 6,5 m del golpe, hacia la mira');
  assert.ok(approx(o[2].t.direct / m[0].t.direct, 0.6, 0.02), 'Onda Sagrada: al 60 % del golpe');
  // la onda sigue al golpe, no lo repite: los que recibieron el impacto, un solo golpe y el mismo daño
  for (const i of [0, 1]) assert.ok(o[i].t.n === 1 && approx(o[i].t.direct / m[i].t.direct, 1, 0.01), `Onda Sagrada: (${spots[i]}) recibe solo el golpe (${o[i].t.n} golpes, ×${(o[i].t.direct / m[i].t.direct).toFixed(2)})`);
  // F1/F2 (2f §2): contra uno solo, la variante de un objetivo gana a la de área
  const one = [[2.5, 0]];
  const base = hammer(20, {}, one, 0.3).es[0].t.direct, uni = hammer(20, { g_martillo: 'i' }, one, 0.3).es[0].t.direct, area = hammer(20, { g_martillo: 'ii' }, one, 0.3).es[0].t.direct;
  assert.ok(uni > area && approx(area / base, 1, 0.01), `contra uno solo: Arrojado ×${(uni / base).toFixed(2)} > Onda ×${(area / base).toFixed(2)}`);
}
// Cataclismo: carga `hold` s y suelta en (8, 0)
function cata(level, forge, spots, allies = []) {
  const hh = hero(level, { spec: 'cruzado', forge });
  const es = spots.map(([x, z, extra]) => foe(hh, x, z, extra || {}));
  // aliados heridos con sus curas por fuente (la clave gratis del Cruzado, z0, también cura)
  const as = allies.map(([x, z]) => {
    const a = hh.ally(x, z, 1000); a.hp = 300; a.by = {};
    const heal = a.healSkill.bind(a);
    a.healSkill = (n, src) => { const got = heal(n, src); a.by[src] = (a.by[src] || 0) + got; return got; };
    return a;
  });
  hh.aim(8, 0); hh.setSlot('k4', 'g_u_cataclismo'); hh.press('k4'); hh.step(0.5); hh.release('k4'); hh.step(0.5);
  return { hh, es, as };
}
{ // Cataclismo · Mejora (Columna Ancha): radio 6 → 7,5 m
  assert.ok(cata(17, {}, [[15, 0]]).es[0].t.n === 0 && cata(18, {}, [[15, 0]]).es[0].t.n === 1, 'Columna Ancha: a 7 m del impacto solo con la Mejora');
}
{ // Cataclismo · I (Rayo del Cielo): un rayo estrecho de 2 m: +80 % y 40 de Quebranto a los jefes
  const spots = [[8, 0], [8, 3], [8.5, 0.5, { boss: true }]];
  const m = cata(21, {}, spots).es, r = cata(21, { g_u_cataclismo: 'i' }, spots).es;
  assert.ok(m[1].t.n === 1 && r[1].t.n === 0, 'Rayo del Cielo: 2 m (a 3 m, no)');
  assert.ok(approx(r[0].t.direct / m[0].t.direct, 1.8, 0.01), 'Rayo del Cielo: +80 %');
  const extra = r[2].stagger - m[2].stagger * 1.8;
  assert.ok(approx(extra, 40, 0.1), `Rayo del Cielo: 40 de Quebranto al jefe (${extra.toFixed(2)})`);
}
{ // Cataclismo · II (Amanecer): −40 %; cura un 30 % y da un escudo del 10 % a los aliados a 8 m
  const run = forge => cata(21, forge, [[8, 0]], [[8, 5], [8, 10]]);
  // la base es la MISMA especialización y nivel sin la variante: el Cruzado ya cura con su clave gratis
  // (Martillo Piadoso, z0); se mide lo que AÑADE Amanecer
  const m = run({}), d = run({ g_u_cataclismo: 'ii' });
  assert.ok(!m.as[0].by.g_u_cataclismo && m.as[0].shields.length === 0, `sin la variante, la Cataclismo ni cura ni escuda (${JSON.stringify(m.as[0].by)})`);
  // 30 % × rango (buffMul; S0: a Nv21 el kit va en rango 2). La clave z0 cura además según el daño, que también sube
  const bm = resolveSkill(d.hh.p, CLASSES.guerrero.skills.find(s => s.id === 'g_u_cataclismo')).buffMul;
  assert.ok(approx(d.as[0].by.g_u_cataclismo, 300 * bm, 1e-6) && d.as[0].healed - m.as[0].healed >= 300 * bm - 1e-6,
    `Amanecer: cura un 30 % × rango más que sin ella (${m.as[0].healed} → ${d.as[0].healed}; Amanecer ${d.as[0].by.g_u_cataclismo})`);
  assert.ok(d.as[0].shields.length === 1 && approx(d.as[0].shields[0].amt, d.hh.p.stats.maxHP * 0.1 * bm, 1), 'Amanecer: y escuda un 10 % de tu vida × rango');
  assert.ok(d.as[1].healed === m.as[1].healed && !d.as[1].by.g_u_cataclismo && d.as[1].shields.length === 0, 'Amanecer: solo a 8 m del impacto');
  assert.ok(approx(d.es[0].t.direct / m.es[0].t.direct, 0.6, 0.01), 'Amanecer: −40 % de daño');
}
console.log('En el arnés: las 51 piezas (Mejoras y variantes) del kit base, Berserker, Guardián y Cruzado ✓');

// ------------------------------------------------ 5) FORGE_RECO (★ del libro) y la barra de su especialización
// lo que alimenta cada barra (docs/paso2g-guerrero.md §7): Sed ← sangrado · Bastión ← posturas y
// plantado · Fervor ← suelta perfecta y detonación de Juicio
const GAUGE_FEED = { berserker: ['bleed'], guardian: ['stance', 'planted'], cruzado: ['perfect:fervor', 'detonate'] };
function feeders(def) {
  const out = new Set();
  if ([def.hitDot?.kind, def.dot, ...(def.steps || []).map(s => s.dot)].includes('bleed')) out.add('bleed');
  if (def.type === 'stance' && def.stance?.modes?.length === 2) out.add('stance');
  if (def.plant || def.needPlanted || def.repeat?.needPlanted) out.add('planted');
  for (const id of Object.keys(def.charge?.perfectGauge || {})) out.add(`perfect:${id}`);
  if (def.mark?.detonate) out.add('detonate');
  return out;
}
// lo que la forja de una especialización le QUITA a su barra (vacío = la conserva)
function gaugeLoss(spec, reco, forge = GUERRERO_SKILL_FORGE) {
  const lost = [];
  const want = new Set(GAUGE_FEED[spec]);
  for (const id of Object.values(GUERRERO_SPEC_BAR[spec].bar)) {
    const sk = SK(id), entry = forge[id];
    if (!entry) continue;
    const before = feeders(forgeDef(sk, entry, { mejora: true })), after = feeders(forgeDef(sk, entry, { mejora: true, variant: reco[id] || null }));
    for (const f of before) if (want.has(f) && !after.has(f)) lost.push(`${id}:${f}`);
  }
  return lost;
}
{
  // la ★ del libro de §7 (la paridad con el mockup la vigila test-v2-paridad)
  assert.deepEqual(GUERRERO_FORGE_RECO, {
    berserker: { g_tajo: 'i', g_remolino: 'ii', g_u_furia: 'i' },
    guardian: { g_tajo: 'ii', g_piel: 'ii', g_guardia: 'i', g_carga_escudo: 'i', g_u_ciudadela: 'ii' },
    cruzado: { g_juicio: 'ii', g_sendero: 'i', g_martillo: 'ii', g_u_cataclismo: 'i' },
  }, 'FORGE_RECO: Tajo Desgarro, Ciclón, Sed Voraz · Siega, Inamovible, Compartida, Arrollador, Empalizada · Tres Juicios, Escolta, Onda, Rayo');
  for (const [sp, reco] of Object.entries(GUERRERO_FORGE_RECO)) {
    assert.equal(FORGE_RECO[sp], reco, `${sp}: en la fusión FORGE_RECO`);
    const bar = Object.values(SPEC_BAR[sp].bar);
    for (const [id, v] of Object.entries(reco)) assert.ok(GUERRERO_SKILL_FORGE[id] && ['i', 'ii'].includes(v) && bar.includes(id), `${sp}: ${id}=${v} es de su barra`);
    for (const [id, v] of Object.entries(GUERRERO_SPEC_BAR[sp].forge || {})) assert.equal(reco[id], v, `${sp}: la barra propone ${id}=${v} igual que la ★`);
    // 2f §7.7: la ★ nunca apaga la barra de su especialización
    const feed = new Set(Object.values(GUERRERO_SPEC_BAR[sp].bar).flatMap(id => [...feeders(forgeDef(SK(id), GUERRERO_SKILL_FORGE[id] || {}, { mejora: true, variant: reco[id] || null }))]));
    for (const f of GAUGE_FEED[sp]) assert.ok(feed.has(f), `${sp}: con la ★, su barra sigue recibiendo «${f}»`);
    assert.deepEqual(gaugeLoss(sp, reco), [], `${sp}: la ★ no le quita nada a su barra`);
  }
  // el comprobador muerde: Ciudadela Andante (deja de estar plantada) y una variante sintética sin carga
  assert.deepEqual(gaugeLoss('guardian', { ...GUERRERO_FORGE_RECO.guardian, g_u_ciudadela: 'i' }), ['g_u_ciudadela:planted'], 'Andante le quitaría el plantado al Bastión');
  const noCharge = { ...GUERRERO_SKILL_FORGE, g_martillo: { ...GUERRERO_SKILL_FORGE.g_martillo, vars: [{ ...GUERRERO_SKILL_FORGE.g_martillo.vars[0], set: { charge: null } }, GUERRERO_SKILL_FORGE.g_martillo.vars[1]] } };
  assert.deepEqual(gaugeLoss('cruzado', { g_martillo: 'i' }, noCharge), ['g_martillo:perfect:fervor'], 'una variante sin carga le quitaría el Fervor');
  // en vivo: con la ★, el Desgarro llena la Sed y la Onda Sagrada perfecta da Fervor
  h = hero(30, { spec: 'berserker', forge: GUERRERO_FORGE_RECO.berserker });
  e = foe(h, 1.4);
  h.p.basicAttack(e); h.tick(1.5);
  assert.ok(h.gaugeValue('sed') > 0, `berserker ★: el sangrado del Desgarro llena la Sed (${h.gaugeValue('sed')})`);
  const c = hammer(30, GUERRERO_FORGE_RECO.cruzado, [[2.5, 0]], 0.75);
  assert.ok(c.hh.sfxCount('verb_perfect') === 1 && c.hh.gaugeValue('fervor') === 1, 'cruzado ★: la Onda Sagrada perfecta da 1 de Fervor');
}
console.log('FORGE_RECO: la ★ de §7, dentro de la barra de su especialización, y nunca le apaga la barra (2f §7.7) ✓');

// ------------------------------------------------ 6) VFX de las variantes que cambian de forma
// Las entradas `<id>_i`/`<id>_ii` de GUERRERO_FX son datos válidos y el motor las usa (skillFxFor de
// fx-skills.js busca el VFX por variante): se mide el uso REAL con una sonda
{
  const varIds = new Map();
  for (const [id, entry] of Object.entries(GUERRERO_SKILL_FORGE)) for (const v of entry.vars) varIds.set(v.id, { id, v });
  const own = Object.keys(GUERRERO_FX).filter(k => varIds.has(k));
  assert.ok(own.length >= 10, `VFX propios para las variantes que cambian de forma (${own.length})`);
  for (const k of Object.keys(GUERRERO_FX)) assert.ok(SK(k) || varIds.has(k), `${k}: habilidad del catálogo o variante de su forja`);
  for (const k of own) {
    const fx = GUERRERO_FX[k], { id, v } = varIds.get(k);
    for (const f of ['trail', 'impact', 'aura', 'extra']) if (typeof fx[f] === 'string') assert.ok(SKILL_FX_PRESETS[fx[f]], `${k}: preset ${fx[f]}`);
    assert.ok(SFX_TONES[fx.sfx], `${k}: sonido ${fx.sfx}`);
    // una variante con VFX propios cambia la forma (tipo, pasos, centro, radio, número, recorrido o tirón)
    const keys = Object.keys({ ...(v.set || {}), ...(v.add || {}), ...(v.mul || {}) }).map(x => x.split('.')[0]);
    const FORM = ['type', 'steps', 'at', 'radius', 'count', 'range', 'dashT', 'heal', 'cleaveR', 'moveMul', 'recast', 'pull'];
    assert.ok(keys.some(x => FORM.includes(x)) || !!v.power, `${k}: cambia la forma de ${id}`);
  }
  // uso real: Martinete (terremoto_i) emite su golpe (brutalStrike) o el de Terremoto (quakeFissure)
  const hh = hero(20, { spec: 'guardian', forge: { terremoto: 'i' } });
  foe(hh, 3, 0);
  const seen = [];
  hh.g.emitFx = pr => { seen.push(pr); };
  hh.aim(3, 0); hh.setSlot('rmb', 'terremoto'); hh.cast('rmb'); hh.step(0.5);
  const mine = SKILL_FX_PRESETS[GUERRERO_FX.terremoto_i.impact], base = SKILL_FX_PRESETS[GUERRERO_FX.terremoto.impact];
  assert.ok(mine && base && mine !== base, 'la sonda distingue el VFX de la variante del de su habilidad');
  assert.ok(seen.includes(mine) && !seen.includes(base), 'el Martinete sale con su golpe, no con el del Terremoto');
}
console.log('VFX: entradas de las variantes válidas y en uso (el Martinete sale con su golpe) ✓');

assert.deepEqual(warns, [], `ningún poder ni comportamiento lanzó errores: ${warns.join(' · ')}`);
console.warn = origWarn;
console.log('\n✅ FORJA DEL GUERRERO (A1 · A2/F7 · A9 · 51 piezas en el arnés · ★ · VFX) OK');
