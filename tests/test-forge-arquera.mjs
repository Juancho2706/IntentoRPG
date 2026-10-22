// Paso 2 (2f + 2g) — FORJA de la ARQUERA (KA2): docs/paso2g-arquera.md §5–§7 y §10; 2f §2 y §7.7;
// formato de docs/paso2-implementacion.md §3.5
//  1) A1: las 17 habilidades del libro (no las activas de talento) con Mejora + 2 variantes; ids
//     estables, nombres y papeles del mockup, líneas ≤ 70 (las acortadas, declaradas en divergencias.json)
//  2) A2/F7 estricto: cada definición forjada es válida (validateSkillDef v2: 0 errores y 0 avisos),
//     cada pieza cambia el perfil o la definición que lee el motor (o declara un poder registrado)
//     y solo cambia lo suyo (lista de claves por pieza: nada de recargas, costes o alcances colados)
//  3) A9 y D28: poderes v_* registrados, todos usados, sin `mult` e ids únicos entre clases
//  4) cada Mejora y cada variante en el arnés con el canal REAL, comparada con la habilidad sin
//     esa pieza (la Mejora, contra el nivel anterior; la variante, contra solo la Mejora). Las tres
//     que esperaban al motor (Mano Rápida, Mina de Espinas, Acecho Enredador) ya son estrictas (cola W2d)
//  5) FORGE_RECO: la ★ del libro, la aplica chooseSpec (D3) y nunca apaga la barra de su
//     especialización (2f §7.7)
//  6) VFX de las variantes que cambian de forma (ARQUERA_FX[id].vars)
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, SKILL_FORGE, FORGE_RECO, SPEC_BAR, ENEMIES } from '../js/data.js';
import { forgeDef, validateForge, validateSkillDef, FORGE_ROLES, FORGE_LINE_WARN } from '../js/skill-defs.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { staggerFromCC } from '../js/combat-math.js';
import { POWER_HOOKS, SKILL_BEHAVIORS } from '../js/powers.js';
import { ARQUERA_SKILL_FORGE, ARQUERA_FORGE_RECO, ARQUERA_SPEC_BAR } from '../js/skills-arquera.js';
import { arqueraForgePowers } from '../js/powers-forge-arquera.js';
import { guerreroForgePowers } from '../js/powers-forge-guerrero.js';
import { magaForgePowers } from '../js/powers-forge-maga.js';
import { arqueraPowers } from '../js/powers-arquera.js';
import { guerreroPowers } from '../js/powers-guerrero.js';
import { magaPowers } from '../js/powers-maga.js';
import { ARQUERA_FX } from '../js/fx-skills-arquera.js';
import { SKILL_FX_PRESETS } from '../js/fx-skills.js';
import { talentMethods } from '../js/game-talents.js';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import { makeHarness } from './helpers/power-harness.mjs';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const warns = [];
const origWarn = console.warn;
console.warn = (...a) => { warns.push(a.map(String).join(' ')); };
const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const SK = id => CLASSES.arquera.skills.find(s => s.id === id);
const BOOK = CLASSES.arquera.skills.filter(s => s.kind !== 'talent');
const piecesOf = entry => [['m', entry.mejora], ['i', entry.vars[0]], ['ii', entry.vars[1]]];
const { C: MOCK } = cargarMockup('arquera');
const MK = id => MOCK.catalog.find(s => s.id === id);

// ------------------------------------------------ 1) A1: estructura
// papeles de §5 (kit base) y §6–§7 (kits de especialización)
const ROLES = {
  a_disparo: ['AREA', 'UNI'], flecha_perforante: ['AREA', 'UNI'], a_paso: ['UNI', 'MOV'], a_humo: ['AREA', 'CTRL'], lluvia_flechas: ['UNI', 'AGU'],
  a_t_andanada: ['UNI', 'CTRL'], a_v_carrera: ['UNI', 'AGU'], flecha_multiple: ['AREA', 'UNI'], a_u_diluvio: ['AREA', 'UNI'],
  a_t_apuntado: ['AREA', 'UNI'], a_f_rodilla: ['UNI', 'AGU'], a_f_rastreador: ['AREA', 'CTRL'], a_u_celeste: ['AREA', 'UNI'],
  a_t_cepo: ['AREA', 'CTRL'], a_m_acecho: ['CTRL', 'MOV'], a_m_detonante: ['AREA', 'CTRL'], a_u_zarzas: ['UNI', 'AGU'],
};
{
  assert.equal(BOOK.length, 17, 'el libro de la Arquera tiene 17 habilidades');
  assert.deepEqual(Object.keys(ARQUERA_SKILL_FORGE).sort(), BOOK.map(s => s.id).sort(), 'A1: forja para las 17 habilidades del libro (y ninguna más)');
  assert.ok(CLASSES.arquera.skills.filter(s => s.kind === 'talent').every(s => !ARQUERA_SKILL_FORGE[s.id]), 'las activas de talento no tienen forja (2f §2.1)');
  assert.equal(CLASSES.arquera.forge, ARQUERA_SKILL_FORGE, 'data.js da la forja a la clase');
  for (const id of Object.keys(ARQUERA_SKILL_FORGE)) assert.equal(SKILL_FORGE[id], ARQUERA_SKILL_FORGE[id], `${id}: en la fusión SKILL_FORGE`);
  const lines = new Map();
  for (const sk of BOOK) {
    const entry = ARQUERA_SKILL_FORGE[sk.id], mk = MK(sk.id);
    const v = validateForge(entry, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
    assert.deepEqual(v.errors, [], `${sk.id}: ${v.errors.join(' · ')}`);
    assert.deepEqual(v.warnings, [], `A1 ${sk.id}: líneas ≤ ${FORGE_LINE_WARN}: ${v.warnings.join(' · ')}`);
    assert.equal(entry.mejora.id, `${sk.id}_m`, `${sk.id}: id estable de la Mejora`);
    assert.deepEqual(entry.vars.map(x => x.role), ROLES[sk.id], `${sk.id}: papeles de §5–§7`);
    // nombres y papeles: los del mockup congelado (M / A = I / B = II)
    assert.deepEqual([entry.mejora.name, entry.vars[0].name, entry.vars[1].name], [mk.M.n, mk.A.n, mk.B.n], `${sk.id}: nombres del mockup`);
    assert.deepEqual(entry.vars.map(x => x.role), [mk.A.r, mk.B.r], `${sk.id}: papeles del mockup`);
    for (const [k, piece] of piecesOf(entry)) {
      assert.ok(k === 'm' || FORGE_ROLES.includes(piece.role), `${piece.id}: papel válido`);
      assert.equal(piece.icon, k === 'm' ? 'forge/mejora' : `forge/v_${sk.id}_${k}`, `${sk.id}·${k}: icono`);
      assert.ok(!/\b(UNI|TTD|proc|stagger|GCD|DoT|AoE|CC|AGU|CTRL)\b|ÁREA×/.test(piece.line), `${sk.id}·${k}: línea sin jerga («${piece.line}»)`);
      lines.set(`forja.${sk.id}.${k === 'm' ? 'mejora' : `vars.${k}`}.line`, piece.line);
    }
  }
  // las líneas que difieren del mockup (acortadas por A1) están declaradas, y solo esas
  const divAll = JSON.parse(readFileSync(new URL('../tools/convert-v2/divergencias.json', import.meta.url), 'utf8')).divergencias
    .filter(d => d.clase === 'arquera' && /^forja\./.test(d.ruta));
  // S-arquera (D18 levantado): rediseños aprobados por el dueño que cambian lo que hace la pieza,
  // y con ello su línea (A1 Arco Ancho, A-x1 Disparo Disperso); se comprueba que de verdad difieren
  const REDESIGN = new Set(['forja.a_disparo.vars.i.line', 'forja.a_t_andanada.mejora.line']);
  const changed = [], redesigned = [];
  for (const s of MOCK.catalog.filter(x => x.M)) {
    for (const [k, mk] of [['mejora', 'M'], ['vars.i', 'A'], ['vars.ii', 'B']]) {
      const ruta = `forja.${s.id}.${k}.line`;
      if (lines.get(ruta) !== s[mk].s) (REDESIGN.has(ruta) ? redesigned : changed).push(ruta);
    }
  }
  assert.deepEqual(redesigned.sort(), [...REDESIGN].sort(), 'los rediseños de S-arquera cambian su línea');
  // y están declarados (aprobados) en divergencias.json; las demás son las acortadas de A1
  const div = divAll.filter(d => !REDESIGN.has(d.ruta));
  assert.deepEqual(divAll.filter(d => REDESIGN.has(d.ruta) && d.aprobada === true).map(d => d.ruta).sort(), [...REDESIGN].sort(),
    'divergencias.json declara los rediseños de S-arquera, aprobados');
  // (el mockup vive en otro contexto de vm: sus arrays se copian a este antes de comparar)
  const long = [...MOCK.catalog].filter(x => x.M).flatMap(s => [['mejora', 'M'], ['vars.i', 'A'], ['vars.ii', 'B']]
    .filter(([, mk]) => s[mk].s.length > 70).map(([k]) => `forja.${s.id}.${k}.line`));
  assert.deepEqual(changed.sort(), long.sort(), 'solo cambian las líneas del mockup de más de 70 caracteres');
  assert.equal(changed.length, 9, `9 líneas del mockup pasaban de 70 (${changed.length})`);
  assert.deepEqual(div.map(d => d.ruta).sort(), changed.sort(), 'divergencias.json declara exactamente las líneas acortadas');
  for (const d of div) {
    assert.equal(d.aprobada, false, `${d.ruta}: pendiente del visto bueno del dueño`);
    const orig = MOCK.catalog.find(s => d.ruta.startsWith(`forja.${s.id}.`));
    const mk = d.ruta.includes('.mejora.') ? 'M' : d.ruta.endsWith('.ii.line') ? 'B' : 'A';
    assert.ok(d.motivo.includes(orig[mk].s) && d.motivo.includes(lines.get(d.ruta)), `${d.ruta}: el motivo cita la línea original y la del juego`);
  }
}
console.log('A1: 17 habilidades con Mejora + 2 variantes, nombres y papeles del mockup, líneas ≤ 70 (9 acortadas y declaradas) ✓');

// ------------------------------------------------ 2) A2/F7: definiciones forjadas válidas y sin no-ops
// firma de lo que el motor lee: el perfil de resolveSkill y la definición forjada (sin la etiqueta
// `forged`): los tipos genéricos leen de ella trap, stance, detonate, autoShot, lure…
function sigParts(h, sk, entry, variant, withMejora = true) {
  h.p.cls = { ...h.p.cls, forge: { ...SKILL_FORGE, [sk.id]: withMejora ? entry : { ...entry, mejora: null } } };
  h.p.skillForge = { [sk.id]: variant };
  h.p.recompute();
  const pr = resolveSkill(h.p, sk);
  const { def, mods, sups, onHitPowers, variant: v, mejora, ...rest } = pr;
  void mods; void sups; void onHitPowers; void v; void mejora;
  const { forged, ...d } = def; void forged;
  return JSON.parse(JSON.stringify({ prof: rest, def: d }, (k, x) => (x instanceof Set ? [...x].sort() : x)));
}
const sigOf = (...a) => JSON.stringify(sigParts(...a));
// rutas (sin «prof.» ni «def.») cuyo valor cambia entre dos firmas; listas y objetos, hoja a hoja
function changedPaths(a, b) {
  const flat = (o, pre, out) => {
    if (o && typeof o === 'object' && Object.keys(o).length) for (const [k, v] of Object.entries(o)) flat(v, pre ? `${pre}.${k}` : k, out);
    else out[pre] = JSON.stringify(o);
    return out;
  };
  const fa = flat(a, '', {}), fb = flat(b, '', {});
  const all = new Set([...Object.keys(fa), ...Object.keys(fb)].filter(k => fa[k] !== fb[k]).map(k => k.replace(/^(prof|def)\./, '')));
  return [...all].sort();
}
// lo que puede cambiar cada pieza (prefijos de ruta): su `k` y lo que el motor deriva de él
// (durS → dur, dmg → addPct, recast null → tags). Cualquier otra ruta es un cambio colado
const OWN_KEYS = {
  a_disparo_m: ['cadence'], a_disparo_i: ['count', 'spread', 'fanW', 'perTarget', 'coef'], a_disparo_ii: ['coef', 'elem', 'hitDot', 'color', 'tags'],
  flecha_perforante_m: ['range', 'speed'], flecha_perforante_i: ['pierce', 'splash', 'radius', 'tags'], flecha_perforante_ii: ['windup', 'addPct'],
  a_paso_m: ['dur', 'durS'], a_paso_i: ['rollShot'], a_paso_ii: ['charges', 'buff'],
  a_humo_m: ['radius'], a_humo_i: ['coef', 'tags'], a_humo_ii: ['knock', 'slow', 'slowPct'],
  lluvia_flechas_m: ['waves'], lluvia_flechas_i: ['radius', 'span', 'addPct'], lluvia_flechas_ii: ['allyDr', 'projMissPct'],
  a_t_andanada_m: ['count', 'fanW', 'spread'],a_t_andanada_i: ['spread', 'perTarget', 'range'], a_t_andanada_ii: ['knock', 'slow', 'slowPct', 'addPct'],
  a_v_carrera_m: ['moveMul'], a_v_carrera_i: ['autoShot.every', 'autoShot.target', 'addPct'], a_v_carrera_ii: ['projMissPct', 'addPct'],
  flecha_multiple_m: ['range'], flecha_multiple_i: ['count', 'spread', 'coef'], flecha_multiple_ii: ['count', 'spread', 'pierce', 'coef'],
  a_u_diluvio_m: ['radius'], a_u_diluvio_i: ['follow', 'at', 'radius', 'range'], a_u_diluvio_ii: ['follow', 'at', 'waves', 'span', 'radius', 'coef', 'range'],
  a_t_apuntado_m: ['charge.max', 'charge.perfect'], a_t_apuntado_i: ['charge.full'],
  a_t_apuntado_ii: ['charge.max', 'charge.perfect', 'charge.scale.coef', 'pierce'],
  a_f_rodilla_m: ['stance.modes.0.chargeSpeed'], a_f_rodilla_i: ['stance.modes.0.moveMul', 'stance.modes.0.chargeSpeed'], a_f_rodilla_ii: ['stance.modes.0.stats'],
  a_f_rastreador_m: ['mark.dur'], a_f_rastreador_i: ['mark.count', 'mark.radius', 'mark.dur'], a_f_rastreador_ii: ['slow', 'slowPct', 'stagger'],
  a_u_celeste_m: ['recast.win'], a_u_celeste_i: ['type', 'at', 'radius', 'coef', 'pierce', 'impactDelay', 'charge.scale.coef', 'tags'],
  a_u_celeste_ii: ['recast', 'charge.max', 'charge.perfect', 'charge.scale.coef', 'tags'],
  a_t_cepo_m: ['trap.armT'], a_t_cepo_i: ['root', 'trap.burst', 'color'], a_t_cepo_ii: ['root', 'radius', 'color'],
  a_m_acecho_m: ['range'], a_m_acecho_i: ['detonate.consume', 'root', 'radius'], a_m_acecho_ii: ['charges', 'detonate.coef'],
  a_m_detonante_m: ['radius', 'detonate.radius'], a_m_detonante_i: ['detonate.chain'], a_m_detonante_ii: ['splash', 'detonate', 'pull', 'pullTo', 'tags'],
  a_u_zarzas_m: ['dur', 'durS'], a_u_zarzas_i: ['at', 'radius', 'contain', 'venomPct'], a_u_zarzas_ii: ['lure'],
};
const stray = (id, paths) => paths.filter(k => !(OWN_KEYS[id] || []).some(a => k === a || k.startsWith(`${a}.`)));
{
  const h = makeHarness({ classId: 'arquera', level: 100 });
  const noops = [];
  for (const sk of BOOK) {
    const entry = ARQUERA_SKILL_FORGE[sk.id];
    for (const st of [{ mejora: true }, { mejora: true, variant: 'i' }, { mejora: true, variant: 'ii' }]) {
      const { forged, ...d } = forgeDef(sk, entry, st);
      assert.ok(forged, 'forgeDef marca la definición forjada');
      const r = validateSkillDef(d, { behaviors: SKILL_BEHAVIORS, v2: true });
      assert.deepEqual(r.errors || r, [], `${sk.id} ${JSON.stringify(st)}: definición forjada válida`);
      assert.deepEqual(r.warnings || [], [], `${sk.id} ${JSON.stringify(st)}: sin claves desconocidas`);
      assert.equal(d.id, sk.id, 'la forja conserva el id');
    }
    const base = sigOf(h, sk, entry, null, false), m = sigOf(h, sk, entry, null, true);
    if (m === base && !entry.mejora.power) noops.push(`${sk.id}_m`);
    for (const [i, k] of [[0, 'i'], [1, 'ii']]) if (sigOf(h, sk, entry, k, true) === m && !entry.vars[i].power) noops.push(entry.vars[i].id);
  }
  assert.deepEqual(noops, [], `F7: piezas que no cambian nada: ${noops.join(' · ')}`);
  // y solo lo suyo: la Mejora contra la habilidad sin ella; cada variante contra solo la Mejora
  const colados = [];
  for (const sk of BOOK) {
    const entry = ARQUERA_SKILL_FORGE[sk.id];
    const base = sigParts(h, sk, entry, null, false), m = sigParts(h, sk, entry, null, true);
    for (const [id, a, b] of [[`${sk.id}_m`, base, m], [entry.vars[0].id, m, sigParts(h, sk, entry, 'i')], [entry.vars[1].id, m, sigParts(h, sk, entry, 'ii')]]) {
      const extra = stray(id, changedPaths(a, b));
      if (extra.length) colados.push(`${id}: ${extra.join(', ')}`);
    }
  }
  assert.deepEqual(colados, [], `cada pieza cambia solo lo suyo: ${colados.join(' · ')}`);
  assert.equal(Object.keys(OWN_KEYS).length, 51, 'OWN_KEYS: las 51 piezas');
  for (const sk of BOOK) for (const [, piece] of piecesOf(ARQUERA_SKILL_FORGE[sk.id])) assert.ok(OWN_KEYS[piece.id || `${sk.id}_m`], `${sk.id}: OWN_KEYS de ${piece.name}`);
  // el comprobador muerde: Tiro Pesado con la recarga a 1 s, Cortina con 3 oleadas
  const tp = SK('a_t_apuntado'), te = ARQUERA_SKILL_FORGE.a_t_apuntado;
  const tpBad = { ...te, vars: [te.vars[0], { ...te.vars[1], set: { ...te.vars[1].set, cd: 1 } }] };
  assert.deepEqual(stray('a_t_apuntado_ii', changedPaths(sigParts(h, tp, tpBad, null), sigParts(h, tp, tpBad, 'ii'))), ['cd', 'cdBase'], 'una recarga colada en Tiro Pesado se ve');
  const lf = SK('lluvia_flechas'), le = ARQUERA_SKILL_FORGE.lluvia_flechas;
  const lfBad = { ...le, vars: [le.vars[0], { ...le.vars[1], set: { ...le.vars[1].set, waves: 3 } }] };
  assert.deepEqual(stray('lluvia_flechas_ii', changedPaths(sigParts(h, lf, lfBad, null), sigParts(h, lf, lfBad, 'ii'))), ['waves'], 'oleadas coladas en Cortina se ven');
  // el comprobador muerde: una variante vacía no cambia la firma; cambiar solo la postura, sí
  const sk = SK('a_f_rodilla'), e = ARQUERA_SKILL_FORGE.a_f_rodilla;
  const fake = { ...e, vars: [{ ...e.vars[0], set: {}, power: null }, { ...e.vars[1], set: { 'stance.modes.0.stats': { dr: 5 } } }] };
  assert.equal(sigOf(h, sk, fake, 'i'), sigOf(h, sk, fake, null), 'F7: una variante vacía no cambia la firma');
  assert.notEqual(sigOf(h, sk, fake, 'ii'), sigOf(h, sk, fake, null), 'F7: cambiar solo la postura sí la cambia');
}
console.log('A2/F7: 51 definiciones forjadas válidas (v2, sin avisos); ninguna pieza es un no-op ni cambia lo ajeno ✓');

// ------------------------------------------------ 3) A9 y D28: poderes de la forja
{
  const FP = arqueraForgePowers();
  const used = [];
  for (const entry of Object.values(ARQUERA_SKILL_FORGE)) for (const [, piece] of piecesOf(entry)) if (piece.power) used.push(piece.power);
  assert.deepEqual([...new Set(used)].sort(), Object.keys(FP).sort(), 'cada poder v_* lo usa una pieza de la forja, y viceversa');
  assert.equal(new Set(used).size, used.length, 'un poder por pieza');
  for (const [id, def] of Object.entries(FP)) {
    assert.ok(/^v_[a-z_]+$/.test(id), `${id}: prefijo v_`);
    assert.ok(POWER_HOOKS[id], `${id}: registrado por powers.js`);
    assert.ok(!def.mult, `${id}: sin multiplicador [×] (los «+X %» van al saco aditivo)`);
    assert.ok(def.name && def.desc, `${id}: nombre y descripción`);
  }
  // D28: ningún id choca con otra clase (forja ni talentos), ni con el registro de power-ids.json
  const others = new Set([...Object.keys(guerreroForgePowers()), ...Object.keys(magaForgePowers()), ...Object.keys(guerreroPowers()),
    ...Object.keys(magaPowers()), ...Object.keys(arqueraPowers()), ...Object.keys(SKILL_BEHAVIORS)]);
  const ids = JSON.parse(readFileSync(new URL('../tools/convert-v2/out/power-ids.json', import.meta.url), 'utf8'));
  for (const [cls, o] of Object.entries(ids.clases)) if (cls !== 'arquera') for (const sec of Object.values(o)) for (const id of Object.keys(sec)) others.add(id);
  for (const id of Object.keys(FP)) assert.ok(!others.has(id), `D28: ${id} ya lo usa otra clase, los talentos o un comportamiento`);
  // el único poder de forja que nombra el mockup (v_rodar) es el de power-ids.json
  const mock = Object.keys(ids.clases.arquera.poderes).filter(id => id.startsWith('v_'));
  assert.deepEqual(mock, ['v_rodar'], 'power-ids.json: v_rodar');
  assert.ok(mock.every(id => FP[id]), 'los v_* del mockup existen');
  // A9: sin powers.has( en los archivos de la forja
  for (const f of ['../js/powers-forge-arquera.js', '../js/skills-arquera.js', '../js/fx-skills-arquera.js'])
    assert.ok(!readFileSync(new URL(f, import.meta.url), 'utf8').includes('powers.has('), `${f}: sin powers.has(`);
  // el poder solo entra en p.powers con su pieza activa (variante a req+6) y su habilidad conocida
  const h = makeHarness({ classId: 'arquera', level: 9 });
  h.p.skillForge = { a_paso: 'i' }; h.p.recompute();
  assert.ok(!h.p.powers.has('v_rodar'), 'Nv9: Rodar y Disparar aún cerrada (Paso Veloz Nv4 + 6)');
  h.p.level = 10; h.p.recompute();
  assert.ok(h.p.powers.has('v_rodar'), 'Nv10 con la variante I: Rodar y Disparar');
  h.p.skillForge = { a_paso: 'ii' }; h.p.recompute();
  assert.ok(!h.p.powers.has('v_rodar'), 'con la II, sale');
  h.p.skillForge = { a_t_cepo: 'ii' }; h.p.level = 30; h.p.recompute();
  assert.ok(!h.p.powers.has('v_red_caza'), 'una variante de otro kit (sin la especialización) no aplica');
  const m = makeHarness({ classId: 'arquera', level: 30, spec: 'montaraz' });
  m.p.skillForge = { a_t_cepo: 'ii' }; m.p.recompute();
  assert.ok(m.p.powers.has('v_red_caza'), 'con el Montaraz, Red de Caza');
}
console.log('A9 y D28: 5 poderes v_* registrados, usados y sin choques entre clases ✓');

// ------------------------------------------------ 4) en el arnés (canal REAL)
// 1000 de arma (S0): las razones de daño se miden con enteros redondeados y, con el rango del kit desde el Nv10
// (rankReq), 100 dejaba errores de redondeo del 1–2 % en los golpes de ~60
const WEAPON = { kind: 'item', slot: 'weapon', name: 'Arco de prueba', dmg: [1000, 1000], affixes: {}, quality: 0 };
// heroína con un arco fijo y sin críticos (golpe medio constante): los daños se comparan
function hero(level, { spec = null, forge = {} } = {}) {
  const h = makeHarness({ classId: 'arquera', level, spec });
  h.p.equipment.weapon = { ...WEAPON };
  h.p.skillForge = { ...forge };
  h.p.recompute();
  h.p.hp = h.p.stats.maxHP; h.p.mp = h.p.stats.maxMP;
  h.p.combatRng = () => 0.999;
  return h;
}
// daño recibido por un enemigo: directo (n golpes), DoT (tics) y procs. El enemigo queda QUIETO
// ante el retroceso físico de cada golpe (Enemy.takeDamage lo aparta unos cm): las pruebas de
// alcance miden el radio de la forja, no ese tirón. Empujar y atraer (displace) sí lo mueven.
function tally(e) {
  const t = { direct: 0, n: 0, dot: 0, ticks: 0, proc: 0 };
  const td = e.takeDamage.bind(e);
  e.takeDamage = (a, c, o = {}) => {
    const x = e.pos.x, z = e.pos.z;
    const d = td(a, c, o) || 0;
    e.pos.x = x; e.pos.z = z;
    if (o.dot) { t.dot += d; t.ticks++; } else if (o.proc) t.proc += d; else { t.direct += d; t.n++; }
    return d;
  };
  return t;
}
const foe = (h, x, z = 0, extra = {}) => { const e = h.enemy({ hp: 1e8, pos: [x, 0, z], ...extra }); e.t = tally(e); return e; };
const hasBuff = (who, id) => (who.buffs || []).some(b => b.id === id && b.t > 0);
const fieldsOf = (h, kind, skill) => h.g.fieldsOf(h.p, { kind, skill });
const fanSpan = h => { const a = h.g.projectiles.map(pr => Math.atan2(pr.vel.x, pr.vel.z)); return Math.max(...a) - Math.min(...a); };
// lanzar con el botón (canal real) y avanzar
const shoot = (h, slot, id, [x, z], sec = 1) => { h.aim(x, z); h.setSlot(slot, id); const ok = h.cast(slot); h.step(sec); return ok; };
// tensar `hold` s y soltar (Disparo Apuntado, haces)
const tense = (h, slot, id, [x, z], hold, after = 0.6) => { h.aim(x, z); h.setSlot(slot, id); const ok = h.press(slot); h.step(hold); h.release(slot); h.step(after); return ok; };

// ———————— kit base ————————
{ // Disparo Rápido · Mejora (Mano Rápida): cadencia ×0,9 del básico
  const cad = L => resolveSkill(hero(L).p, SK('a_disparo')).cadence;
  assert.ok(approx(cad(3), 1) && approx(cad(4), 0.9), 'Mano Rápida: cadencia 1 → 0,9 en el perfil');
  // en juego: lo que espera el siguiente Disparo Rápido, en múltiplos de atkTime
  const gap = (L, spec = null) => {
    const h = hero(L, { spec }); foe(h, 0, 5); h.aim(0, 5); h.setSlot('lmb', 'a_disparo');
    h.cast('lmb');
    return h.p.atkCd / h.p.stats.atkTime;
  };
  assert.ok(approx(gap(3), 1, 1e-9), `sin Mano Rápida (Nv3): un disparo cada atkTime (${gap(3).toFixed(3)})`);
  for (const [L, spec] of [[4, null], [20, 'tiradora'], [20, 'montaraz']]) {
    const r = gap(L, spec);
    assert.ok(approx(r, 0.9, 1e-9), `Mano Rápida en juego (Nv${L}${spec ? ` ${spec}` : ''}): el siguiente disparo a 0,9 × atkTime (${r.toFixed(3)})`);
  }
}
{ // Disparo Rápido · I (Disparo Disperso): 3 flechas al 50 %, 2 al mismo enemigo, abanico que se
  // cierra con la distancia (S-arquera A-x1: 0,4 m a cada lado del blanco, hasta 25° a quemarropa)
  const run = (forge, z = 5) => { const h = hero(7, { forge }); const a = foe(h, 0, z, { def: ENEMIES.find(x => x.id === 'zombi') }); shoot(h, 'lmb', 'a_disparo', [0, z], 0); const n = h.g.projectiles.length, span = fanSpan(h); h.step(0.8); return { n, span, a }; };
  const m = run({}), d = run({ a_disparo: 'i' }), near = run({ a_disparo: 'i' }, 1);
  assert.ok(m.n === 1 && d.n === 3, `Disparo Disperso: 3 flechas (${d.n})`);
  assert.ok(approx(d.span, 2 * Math.atan(0.4 / 5), 0.002), `Disparo Disperso: a 5 m, 0,4 m a cada lado (${d.span.toFixed(3)} rad)`);
  assert.ok(approx(near.span, 0.436, 0.002), `Disparo Disperso: a quemarropa, 25° (${near.span.toFixed(3)} rad)`);
  assert.ok(d.a.t.n === 2 && approx(d.a.t.direct / m.a.t.direct, 2 * 0.5, 0.01), `Disparo Disperso: a un blanco lejano, 2 × 50 % = un básico (${d.a.t.n} flechas)`);
}
{ // Disparo Rápido · II (Flecha de Cicuta): Naturaleza, 70 % y veneno del 50 % en 4 s que se suma
  const run = forge => { const h = hero(7, { forge }); const a = foe(h, 0, 5); shoot(h, 'lmb', 'a_disparo', [0, 5], 0.5); return { h, a }; };
  const m = run({}), c = run({ a_disparo: 'ii' });
  assert.equal(resolveSkill(c.h.p, SK('a_disparo')).elem, 'nature', 'Cicuta: de Naturaleza');
  assert.ok(approx(c.a.t.direct / m.a.t.direct, 0.7, 0.01), 'Cicuta: 70 %');
  assert.ok(!m.h.g.hasDoT(m.a, 'poison') && c.h.g.hasDoT(c.a, 'poison'), 'Cicuta: envenena (sin ella, no)');
  // el veneno es golpe medio (con la esperanza de crítico) × 0,5 / 0,7 (el 50 % del arma) en 8 tics de 0,5 s
  const left = c.h.g.dotRemaining(c.a, 'poison'), pr = resolveSkill(c.h.p, SK('a_disparo'));
  const want = Math.round(c.h.p.avgHit(pr.coef, pr.addPct) * 0.5 / 0.7 / 8) * 8;
  assert.equal(left, want, `Cicuta: veneno del 50 % del arma en 4 s (${left} = ${want})`);
  c.h.p.atkCd = 0; c.h.cast('lmb'); c.h.step(0.5);
  assert.ok(c.h.g.dotRemaining(c.a, 'poison') > left * 1.5, 'Cicuta: el segundo veneno se suma al primero');
  c.h.tick(4.6);
  assert.ok(!c.h.g.hasDoT(c.a, 'poison') && c.a.t.dot > 0, 'Cicuta: en 4 s');
}
{ // Flecha Perforante · Mejora (Astil de Fresno): +2 m de alcance y +20 % de velocidad
  const run = L => { const h = hero(L); const a = foe(h, 0, 14.6); h.aim(0, 6); h.setSlot('rmb', 'flecha_perforante'); h.cast('rmb'); const v = h.g.projectiles[0].vel.length(); h.step(1.5); return { v, a }; };
  const b = run(4), m = run(5);
  assert.ok(b.a.t.n === 0 && m.a.t.n === 1, 'Astil de Fresno: a 14,6 m solo llega con la Mejora');
  assert.ok(approx(m.v / b.v, 1.2, 0.001), `Astil de Fresno: +20 % de velocidad (${(m.v / b.v).toFixed(3)})`);
}
{ // Flecha Perforante · I (Flecha Explosiva): no atraviesa; explota en 3 m al 80 %
  const run = forge => { const h = hero(8, { forge }); const a = foe(h, 0, 5), behind = foe(h, 0, 9), side = foe(h, 2.4, 5.6); shoot(h, 'rmb', 'flecha_perforante', [0, 5], 1.2); return { a, behind, side }; };
  const m = run({}), x = run({ flecha_perforante: 'i' });
  assert.ok(m.behind.t.n === 1 && x.behind.t.n === 0, 'Flecha Explosiva: ya no atraviesa');
  assert.ok(m.side.t.n === 0 && x.side.t.n === 1, 'Flecha Explosiva: explota en 3 m');
  assert.ok(approx(x.side.t.direct / m.a.t.direct, 0.8 / 2.4, 0.01), `Flecha Explosiva: la explosión al 80 % del arma (${(x.side.t.direct / m.a.t.direct).toFixed(3)})`);
}
{ // Flecha Perforante · II (Tiro de Precisión): prepara 0,35 s (la esquiva la cancela); +45 %
  const run = forge => { const h = hero(8, { forge }); const a = foe(h, 0, 5); h.aim(0, 5); h.setSlot('rmb', 'flecha_perforante'); h.cast('rmb'); h.step(0.2); const early = h.g.projectiles.length; h.step(1); return { early, a }; };
  const m = run({}), p = run({ flecha_perforante: 'ii' });
  assert.ok(m.early === 1 && p.early === 0, 'Tiro de Precisión: la flecha sale tras la preparación');
  assert.ok(approx(p.a.t.direct / m.a.t.direct, 1.45, 0.01), 'Tiro de Precisión: +45 %');
  const h = hero(8, { forge: { flecha_perforante: 'ii' } }); const a = foe(h, 0, 5);
  h.aim(0, 5); h.setSlot('rmb', 'flecha_perforante'); h.cast('rmb'); h.step(0.15);
  h.g.cancelCast('dodge'); h.step(1);
  assert.ok(a.t.n === 0 && h.g.projectiles.length === 0, 'Tiro de Precisión: rodar la cancela');
}
{ // Paso Veloz · Mejora (Ágil): el bonus dura 3 → 4 s
  const run = L => { const h = hero(L); h.aim(10, 0); h.setSlot('k1', 'a_paso'); h.cast('k1'); return h.p.buffs.find(b => b.id === 'a_paso')?.t; };
  assert.ok(approx(run(6), 3) && approx(run(7), 4), 'Ágil: 3 → 4 s');
}
{ // Paso Veloz · I (Rodar y Disparar): al rodar, un Disparo Rápido gratis al 150 % al enemigo de la mira
  const run = forge => { const h = hero(10, { forge }); const a = foe(h, 10, 0); h.aim(10, 0); h.setSlot('k1', 'a_paso'); h.cast('k1'); h.step(0.1); const mid = h.g.projectiles.length; h.step(0.6); return { h, a, mid }; };
  const m = run({}), r = run({ a_paso: 'i' });
  assert.ok(m.a.t.n === 0 && r.a.t.n === 1, 'Rodar y Disparar: dispara al terminar la rodada');
  assert.equal(r.mid, 0, 'Rodar y Disparar: no antes de acabar de rodar');
  assert.ok(approx(r.h.p.pos.x, 6, 1e-6), 'Rodar y Disparar: la rodada sigue siendo de 6 m');
  assert.equal(r.h.p.atkCd, 0, 'Rodar y Disparar: es gratis (no retrasa tu siguiente disparo)');
  // contra un Disparo Rápido normal desde el mismo sitio: 150 %
  const n = hero(10); const b = foe(n, 10, 0); n.p.pos.set(6, 0, 0); n.aim(10, 0); n.setSlot('lmb', 'a_disparo'); n.cast('lmb'); n.step(0.5);
  assert.ok(approx(r.a.t.direct / b.t.direct, 1.5, 0.01), `Rodar y Disparar: al 150 % (${(r.a.t.direct / b.t.direct).toFixed(3)})`);
  // sin enemigo a tiro, a la mira
  const e = hero(10, { forge: { a_paso: 'i' } }); e.aim(10, 0); e.setSlot('k1', 'a_paso'); e.cast('k1'); e.step(0.25);
  assert.equal(e.g.projectiles.length, 1, 'Rodar y Disparar: sin enemigos, dispara a la mira');
}
{ // Paso Veloz · II (Doble Rodada): 2 cargas, sin el bonus de ataque
  const run = forge => { const h = hero(10, { forge }); h.aim(10, 0); h.setSlot('k1', 'a_paso'); const r = [h.cast('k1')]; h.step(0.4); r.push(h.cast('k1')); h.step(0.4); r.push(h.cast('k1')); return { h, r }; };
  const m = run({}), d = run({ a_paso: 'ii' });
  assert.deepEqual(m.r, [true, false, false], 'sin Doble Rodada: una');
  assert.deepEqual(d.r, [true, true, false], 'Doble Rodada: dos seguidas');
  assert.ok(hasBuff(m.h.p, 'a_paso') && !hasBuff(d.h.p, 'a_paso'), 'Doble Rodada: sin el +20 % de velocidad de ataque');
  d.h.tick(9.1);
  assert.equal(d.h.cast('k1'), true, 'Doble Rodada: cada carga vuelve en 9 s');
}
{ // Bomba de Humo · Mejora (Humo Espeso): radio 4 → 5 m (la nube y la ceguera)
  const run = L => { const h = hero(L); h.setSlot('k2', 'a_humo'); h.cast('k2'); return [fieldsOf(h, 'zona', 'a_humo')[0]?.radius, h.g.fields.find(f => f.kind === 'a_humo_ciego' && !f.dead)?.radius]; };
  assert.deepEqual(run(8), [4, 4], 'Nv8: 4 m');
  assert.deepEqual(run(9), [5, 5], 'Humo Espeso: 5 m la nube y la ceguera');
}
{ // Bomba de Humo · I (Humo Venenoso): dentro, veneno del 40 % por segundo
  const run = forge => { const h = hero(12, { forge }); const a = foe(h, 2, 0), out = foe(h, 8, 0); h.setSlot('k2', 'a_humo'); h.cast('k2'); h.tick(3); return { h, a, out }; };
  const m = run({}), v = run({ a_humo: 'i' });
  assert.ok(m.a.t.dot === 0 && v.a.t.dot > 0 && v.out.t.dot === 0, 'Humo Venenoso: daña dentro (y solo dentro)');
  const perSec = v.h.p.avgHit(resolveSkill(v.h.p, SK('a_humo')).coef, resolveSkill(v.h.p, SK('a_humo')).addPct);
  assert.ok(approx(resolveSkill(v.h.p, SK('a_humo')).coef, 0.4) && approx(v.a.t.dot / 3, perSec, perSec * 0.12), `Humo Venenoso: 40 % por segundo (${(v.a.t.dot / 3).toFixed(1)} ≈ ${perSec.toFixed(1)})`);
  assert.ok(Math.abs(v.h.p.zoneDefense().dr - m.h.p.zoneDefense().dr) < 1e-9, 'Humo Venenoso: la nube sigue protegiéndote igual');
}
{ // Bomba de Humo · II (Estallido de Humo): empuja 3 m a los cercanos y los ralentiza un 40 % 2 s
  const run = forge => { const h = hero(12, { forge }); const a = foe(h, 2, 0), out = foe(h, 9, 0); h.setSlot('k2', 'a_humo'); h.cast('k2'); return { a, out }; };
  const m = run({}), s = run({ a_humo: 'ii' });
  assert.ok(approx(m.a.pos.x, 2) && !(m.a.slowT > 0), 'sin Estallido: ni empuja ni ralentiza');
  assert.ok(approx(s.a.pos.x, 5, 0.01), `Estallido de Humo: 3 m hacia fuera (x=${s.a.pos.x.toFixed(2)})`);
  assert.ok(approx(s.a.slowT, 2) && s.a.slowPct === 40, 'Estallido de Humo: −40 % 2 s');
  assert.ok(approx(s.out.pos.x, 9) && !(s.out.slowT > 0), 'Estallido de Humo: solo a los cercanos');
  assert.equal(s.a.t.n + s.a.t.dot, 0, 'Estallido de Humo: sin daño');
}
{ // Lluvia de Flechas · Mejora (Cielo Plomizo): 4 → 5 oleadas
  const run = L => { const h = hero(L); const a = foe(h, 0, 6); shoot(h, 'k2', 'lluvia_flechas', [0, 6], 2); return a.t.n; };
  assert.ok(run(10) === 4 && run(11) === 5, 'Cielo Plomizo: 5 oleadas');
}
{ // Lluvia de Flechas · I (Aguacero): radio 2 m, cae en 0,8 s, +40 %
  const run = forge => { const h = hero(14, { forge }); const a = foe(h, 0, 6), edge = foe(h, 2.7, 6); shoot(h, 'k2', 'lluvia_flechas', [0, 6], 1.15); const n = a.t.n; h.step(1); return { a, edge, n }; };
  const m = run({}), w = run({ lluvia_flechas: 'i' });
  assert.ok(m.edge.t.n === 5 && w.edge.t.n === 0, 'Aguacero: radio 2 m (a 2,7 m del centro ya no)');
  assert.ok(w.n === 5 && m.n < 5, `Aguacero: las 5 oleadas caen en 0,8 s (${w.n} en 1,15 s; sin él, ${m.n})`);
  assert.ok(approx(w.a.t.direct / m.a.t.direct, 1.4, 0.01), 'Aguacero: +40 %');
}
{ // Lluvia de Flechas · II (Cortina): mientras llueve, dentro recibes un 15 % menos y la mitad de los disparos te fallan
  const run = (forge, at) => { const h = hero(14, { forge }); h.aim(at[0], at[1]); h.setSlot('k2', 'lluvia_flechas'); h.cast('k2'); h.step(0.5); return h; };
  const m = run({}, [1, 0]), c = run({ lluvia_flechas: 'ii' }, [1, 0]), far = run({ lluvia_flechas: 'ii' }, [8, 0]);
  assert.deepEqual([m.p.zoneDefense().dr, m.p.projMissChance()], [0, 0], 'sin Cortina: nada');
  assert.deepEqual([c.p.zoneDefense().dr, c.p.projMissChance()], [15, 50], 'Cortina: −15 % y la mitad de los disparos fallan dentro');
  assert.deepEqual([far.p.zoneDefense().dr, far.p.projMissChance()], [0, 0], 'Cortina: solo dentro de la lluvia');
  c.step(1.3);
  assert.deepEqual([c.p.zoneDefense().dr, c.p.projMissChance()], [0, 0], 'Cortina: acaba con la lluvia');
}

// ———————— Tiradora ————————
{ // Andanada · Mejora (Arco Ancho, S-arquera A1): +2 flechas (9 → 11) y abanico un 20 % más ancho
  // (2 → 2,4 m a cada lado del cursor; a quemarropa, 120 → 150°)
  const run = (L, z) => { const h = hero(L, { spec: 'tiradora' }); h.aim(0, z); h.setSlot('k3', 'a_t_andanada'); h.cast('k3'); return { span: fanSpan(h), n: h.g.projectiles.length }; };
  const b6 = run(12, 6), w6 = run(13, 6);
  assert.deepEqual([b6.n, w6.n], [9, 11], 'Arco Ancho: 9 → 11 flechas');
  assert.ok(approx(b6.span, 2 * Math.atan(2 / 6), 0.002) && approx(w6.span, 2 * Math.atan(2.4 / 6), 0.002), `Arco Ancho: a 6 m, 2 → 2,4 m a cada lado (${b6.span.toFixed(3)} → ${w6.span.toFixed(3)})`);
  assert.ok(approx(run(12, 0.5).span, 2.094, 0.002) && approx(run(13, 0.5).span, 2.618, 0.002), 'Arco Ancho: a quemarropa, 120 → 150°');
}
{ // Andanada · I (Andanada Cerrada): 30°, +3 m y hasta 3 flechas por salto al mismo enemigo
  const run = forge => { const h = hero(16, { spec: 'tiradora', forge }); const a = foe(h, 0, 3), far = foe(h, 2.55, 12.25); h.aim(0, 6); h.setSlot('k3', 'a_t_andanada'); h.cast('k3'); const span = fanSpan(h); h.step(1); return { a, far, span }; };
  const m = run({}), c = run({ a_t_andanada: 'i' });
  assert.ok(approx(c.span, 0.5236, 0.002), `Andanada Cerrada: abanico de 30° (${c.span.toFixed(3)})`);
  assert.ok(m.a.t.n <= 2 && c.a.t.n === 3, `Andanada Cerrada: 3 flechas al mismo enemigo (${c.a.t.n}; sin ella, ${m.a.t.n})`);
  assert.ok(m.far.t.n === 0 && c.far.t.n >= 1, 'Andanada Cerrada: +3 m de alcance');
}
{ // Andanada · II (Andanada Repulsora): empujan 2 m y ralentizan un 30 % 2 s; −15 %
  // enemigo pegado (en 150° solo le llegan las flechas centrales); el empujón llega 0,15 s después del
  // impacto (S-arquera A1: así la flecha vecina del abanico aún lo encuentra)
  const run = forge => { const h = hero(16, { spec: 'tiradora', forge }); const a = foe(h, 0, 2); h.aim(0, 6); h.setSlot('k3', 'a_t_andanada'); h.cast('k3'); h.step(0.4); return { h, a }; };
  const m = run({}), r = run({ a_t_andanada: 'ii' });
  assert.ok(m.a.t.n >= 1 && r.a.t.n >= 1, 'las flechas centrales alcanzan al enemigo pegado');
  assert.ok(approx((r.a.t.direct / r.a.t.n) / (m.a.t.direct / m.a.t.n), 0.85, 0.01), 'Andanada Repulsora: −15 % por flecha');
  assert.ok(m.a.pos.z < 3 && r.a.pos.z > 3.9, `Andanada Repulsora: empuja 2 m (z=${m.a.pos.z.toFixed(2)} → ${r.a.pos.z.toFixed(2)})`);
  assert.ok(r.a.slowT > 1.6 && r.a.slowPct === 30 && !(m.a.slowT > 0), 'Andanada Repulsora: −30 % 2 s');
}
{ // Carrera del Viento · Mejora (Galope): 40 → 55 % más rápida
  const run = L => { const h = hero(L, { spec: 'tiradora' }); h.setSlot('k1', 'a_v_carrera'); h.press('k1'); return h.p.moveMulProduct(); };
  assert.ok(approx(run(14), 1.4) && approx(run(15), 1.55), 'Galope: ×1,4 → ×1,55');
}
// Carrera: mantener 2,2 s con dos enemigos (el cercano con poca vida, el lejano con mucha)
function gallop(forge) {
  const h = hero(18, { spec: 'tiradora', forge });
  const near = foe(h, 0, 4, { hp: 1e6 }), big = foe(h, 0, -8, { hp: 1e8 });
  h.setSlot('k1', 'a_v_carrera'); h.press('k1'); h.step(2.2);
  const during = h.p.projMissChance();
  h.release('k1'); h.step(0.2);
  const after = h.p.projMissChance();
  h.step(0.5);                                       // las flechas en vuelo llegan
  return { h, near, big, during, after };
}
{ // Carrera del Viento · I (Carrera Certera): cada 0,6 s al enemigo con más vida, +70 %
  const m = gallop({}), c = gallop({ a_v_carrera: 'i' });
  assert.ok(m.near.t.n === 5 && m.big.t.n === 0, `sin Certera: cada 0,4 s al más cercano (${m.near.t.n})`);
  assert.ok(c.near.t.n === 0 && c.big.t.n === 3, `Carrera Certera: cada 0,6 s al de más vida (${c.big.t.n})`);
  assert.ok(approx((c.big.t.direct / c.big.t.n) / (m.near.t.direct / m.near.t.n), 1.7, 0.01), 'Carrera Certera: +70 %');
}
{ // Carrera del Viento · II (Carrera Esquiva): corriendo, el 40 % de los disparos fallan; −30 %
  const m = gallop({}), e = gallop({ a_v_carrera: 'ii' });
  assert.ok(m.during === 0 && e.during === 40, `Carrera Esquiva: 40 % de fallo mientras corres (${e.during})`);
  assert.ok(e.after === 0 && !hasBuff(e.h.p, 'v_carrera_esquiva'), 'Carrera Esquiva: acaba al soltar');
  assert.ok(approx((e.near.t.direct / e.near.t.n) / (m.near.t.direct / m.near.t.n), 0.7, 0.01), 'Carrera Esquiva: −30 %');
  // si el canal desaparece sin terminar (cambio de mundo), la comprobación a 10 Hz lo retira
  const h = hero(18, { spec: 'tiradora', forge: { a_v_carrera: 'ii' } });
  h.setSlot('k1', 'a_v_carrera'); h.press('k1'); h.step(0.3);
  assert.ok(hasBuff(h.p, 'v_carrera_esquiva'), 'Carrera Esquiva: activa al correr');
  h.g._channel = null; h.tick(0.2);
  assert.ok(!hasBuff(h.p, 'v_carrera_esquiva'), 'Carrera Esquiva: sin canal, fuera');
}
{ // Flecha Múltiple · Mejora (Alcance Largo): 10 → 13 m
  const run = L => { const h = hero(L, { spec: 'tiradora' }); const a = foe(h, 0, 12); shoot(h, 'rmb', 'flecha_multiple', [0, 6], 1.2); return a.t.n; };
  assert.ok(run(16) === 0 && run(17) === 1, 'Alcance Largo: a 12 m solo con la Mejora');
}
{ // Flecha Múltiple · I (Abanico Abierto): 7 flechas en 90° (38 %)
  const run = forge => { const h = hero(20, { spec: 'tiradora', forge }); const a = foe(h, 0, 5); shoot(h, 'rmb', 'flecha_multiple', [0, 5], 0); const n = h.g.projectiles.length, span = fanSpan(h); h.step(0.8); return { n, span, a }; };
  const m = run({}), o = run({ flecha_multiple: 'i' });
  assert.ok(m.n === 5 && o.n === 7 && approx(o.span, 1.571, 0.002), `Abanico Abierto: 7 flechas en 90° (${o.n}, ${o.span.toFixed(3)})`);
  assert.ok(approx(o.a.t.direct / m.a.t.direct, 0.38 / 0.45, 0.01), 'Abanico Abierto: al 38 %');
}
{ // Flecha Múltiple · II (Haz Cerrado): 3 flechas juntas en 10° que atraviesan; 55 %
  const run = forge => { const h = hero(20, { spec: 'tiradora', forge }); const a = foe(h, 0, 4), b = foe(h, 0, 7); shoot(h, 'rmb', 'flecha_multiple', [0, 5], 0); const n = h.g.projectiles.length, span = fanSpan(h); h.step(0.9); return { n, span, a, b }; };
  const m = run({}), c = run({ flecha_multiple: 'ii' });
  assert.ok(c.n === 3 && approx(c.span, 0.1745, 0.002), `Haz Cerrado: 3 flechas en 10° (${c.span.toFixed(3)})`);
  assert.ok(m.b.t.n === 0 && c.b.t.n === 1, 'Haz Cerrado: atraviesan');
    // un objetivo: las 3 flechas juntas le dan las 3 (165 %), donde el abanico de 50° le da una
  assert.ok(m.a.t.n === 1 && c.a.t.n === 3, `Haz Cerrado: las 3 flechas al mismo enemigo (${c.a.t.n}; sin él, ${m.a.t.n})`);
  assert.ok(approx((c.a.t.direct / 3) / m.a.t.direct, 0.55 / 0.45, 0.01), 'Haz Cerrado: 55 % cada una');
}
{ // Diluvio de Saetas · Mejora (Nube Ancha): radio 4 → 5 m
  const run = L => { const h = hero(L, { spec: 'tiradora' }); const a = foe(h, 4.8, 0); h.setSlot('k4', 'a_u_diluvio'); h.cast('k4'); h.step(1.2); return a.t.n; };
  assert.ok(run(17) === 0 && run(18) > 0, 'Nube Ancha: a 4,8 m solo con la Mejora');
}
{ // Diluvio de Saetas · I (Diluvio Anclado): fijo donde apuntas, 6 m
  const run = forge => {
    const h = hero(21, { spec: 'tiradora', forge });
    const mine = foe(h, 1, 0), there = foe(h, 8, 6.2);
    h.aim(8, 0); h.setSlot('k4', 'a_u_diluvio'); h.cast('k4'); h.step(1.1);
    h.p.pos.set(-20, 0, 0); h.step(2);
    return { mine, there };
  };
  const m = run({}), a = run({ a_u_diluvio: 'i' });
  assert.ok(m.mine.t.n > 0 && a.mine.t.n === 0, 'Diluvio Anclado: ya no cae sobre ti');
  assert.ok(m.there.t.n === 0 && a.there.t.n >= 6, `Diluvio Anclado: cae donde apuntas, 6 m (${a.there.t.n})`);
  // a 12 m como mucho: apuntando a 20 m, la nube se queda a 12
  const h = hero(21, { spec: 'tiradora', forge: { a_u_diluvio: 'i' } });
  const at12 = foe(h, 12, 0), at19 = foe(h, 19, 0);
  h.aim(20, 0); h.setSlot('k4', 'a_u_diluvio'); h.cast('k4'); h.step(2);
  assert.ok(at12.t.n > 0 && at19.t.n === 0, `Diluvio Anclado: alcance de 12 m (${at12.t.n} a 12 m, ${at19.t.n} a 19 m)`);
}
{ // Diluvio de Saetas · II (Saetas Pesadas): 4 saetas de 700 % sobre tu objetivo en 2 s, aunque se mueva
  const h = hero(21, { spec: 'tiradora', forge: { a_u_diluvio: 'ii' } }), ref = hero(21, { spec: 'tiradora' });
  const t = foe(h, 6, 0), side = foe(h, 6, 1.7), r = foe(ref, 1, 0);
  h.aim(6, 0); h.setSlot('k4', 'a_u_diluvio'); h.cast('k4'); ref.setSlot('k4', 'a_u_diluvio'); ref.cast('k4');
  h.step(0.6); t.pos.set(3, 0, 6); h.step(2.2); ref.step(0.6);
  assert.equal(t.t.n, 4, `Saetas Pesadas: 4 saetas que siguen a tu objetivo aunque se mueva (${t.t.n})`);
  assert.equal(side.t.n, 1, 'Saetas Pesadas: 1,5 m de radio (al de al lado solo le cae la primera)');
  assert.ok(approx((t.t.direct / 4) / (r.t.direct / r.t.n), 7 / 1.7, 0.02), `Saetas Pesadas: 700 % frente al 170 % (${((t.t.direct / 4) / (r.t.direct / r.t.n)).toFixed(3)})`);
}

// ———————— Francotiradora ————————
{ // Disparo Apuntado · Mejora (Tensado Rápido): carga completa en 1,3 s (antes 1,5) y la ventana dorada antes
  const run = (L, hold) => { const h = hero(L, { spec: 'francotiradora' }); const a = foe(h, 0, 6); tense(h, 'k3', 'a_t_apuntado', [0, 6], hold); return { a, perfect: h.sfxCount('verb_perfect') }; };
  assert.ok(run(12, 1.05).perfect === 0 && run(13, 1.05).perfect === 1, 'Tensado Rápido: 1,05 s es perfecto');
  // sin perfecto (fuera de la ventana): a 1,3 s, el 250 % que antes pedía 1,5 s; a 1,2 s, aún no
  const full = run(13, 1.3), early = run(13, 1.2), old = run(12, 1.5);
  assert.ok(full.perfect === 0 && early.perfect === 0 && old.perfect === 0, 'Tensado Rápido: 1,2, 1,3 y 1,5 s quedan fuera de la ventana');
  assert.ok(approx(full.a.t.direct / old.a.t.direct, 1, 0.002), `Tensado Rápido: carga completa a 1,3 s (${(full.a.t.direct / old.a.t.direct).toFixed(3)})`);
  assert.ok(early.a.t.direct < full.a.t.direct * 0.97, `Tensado Rápido: a 1,2 s aún no está completa (${(early.a.t.direct / full.a.t.direct).toFixed(3)})`);
}
{ // Disparo Apuntado · I (Tres Saetas): a carga completa, 3 saetas en 20° que atraviesan, al 40 %
  const run = (forge, hold) => { const h = hero(16, { spec: 'francotiradora', forge }); const a = foe(h, 0, 6), b = foe(h, 0, 10); h.aim(0, 6); h.setSlot('k3', 'a_t_apuntado'); h.press('k3'); h.step(hold); h.release('k3'); h.step(0.02); const n = h.g.projectiles.length, span = n > 1 ? fanSpan(h) : 0; h.step(0.6); return { n, span, a, b }; };
  const m = run({}, 1.5), t = run({ a_t_apuntado: 'i' }, 1.5), half = run({ a_t_apuntado: 'i' }, 0.6);
  assert.ok(m.n === 1 && t.n === 3 && half.n === 1, `Tres Saetas: 3 saetas solo a carga completa (${t.n}; a media carga, ${half.n})`);
  assert.ok(approx(t.span, 0.349, 0.002), `Tres Saetas: en 20° (${t.span.toFixed(3)})`);
  assert.ok(t.b.t.n === 1, 'Tres Saetas: atraviesan');
  assert.ok(t.a.t.n === 1 && approx(t.a.t.direct / m.a.t.direct, 0.4, 0.01), 'Tres Saetas: al 40 % del disparo cargado (un impacto por enemigo)');
}
{ // Disparo Apuntado · II (Tiro Pesado): tensas hasta 2,5 s, hasta 300 %, no atraviesa
  const run = (forge, hold) => { const h = hero(16, { spec: 'francotiradora', forge }); const a = foe(h, 0, 6), b = foe(h, 0, 10); tense(h, 'k3', 'a_t_apuntado', [0, 6], hold); return { h, a, b }; };
  const m = run({}, 2.5), p = run({ a_t_apuntado: 'ii' }, 2.5);
  assert.ok(m.b.t.n === 1 && p.b.t.n === 0, 'Tiro Pesado: no atraviesa');
  assert.ok(m.h.sfxCount('verb_perfect') === 0 && p.h.sfxCount('verb_perfect') === 0, 'a 2,5 s, fuera de la ventana');
  assert.ok(approx(p.a.t.direct / m.a.t.direct, 3 / 2.5, 0.01), `Tiro Pesado: carga completa = 300 % (frente a 250 %: ${(p.a.t.direct / m.a.t.direct).toFixed(3)})`);
  // pisa el 1,3 s de Tensado Rápido: la carga sigue subiendo hasta los 2,5 s (a 2,4 s, ~290 %) y no más
  const early = run({ a_t_apuntado: 'ii' }, 2.4), late = run({ a_t_apuntado: 'ii' }, 2.8);
  assert.ok(early.a.t.direct < p.a.t.direct * 0.98, `Tiro Pesado: a 2,4 s aún no está completa (${(early.a.t.direct / p.a.t.direct).toFixed(3)})`);
  assert.ok(approx(late.a.t.direct / p.a.t.direct, 1, 0.002), 'Tiro Pesado: completa a 2,5 s (más tensado no suma)');
  // ventana dorada a 2,15–2,35 s de tensado
  const perfectAt = hold => run({ a_t_apuntado: 'ii' }, hold).h.sfxCount('verb_perfect');
  assert.deepEqual([1.05, 1.95, 2.25, 2.4].map(perfectAt), [0, 0, 1, 0], 'Tiro Pesado: perfecto solo a 2,15–2,35 s');
}
// tensado de Disparo Apuntado de rodillas: ¿perfecto? (y el daño)
function kneelShot(level, forge, hold) {
  const h = hero(level, { spec: 'francotiradora', forge });
  const a = foe(h, 0, 6);
  h.setSlot('k2', 'a_f_rodilla'); h.cast('k2'); h.step(0.3);
  tense(h, 'k3', 'a_t_apuntado', [0, 6], hold);
  return { h, a, perfect: h.sfxCount('verb_perfect') };
}
{ // Rodilla en Tierra · Mejora (Rodilla Firme): de rodillas, tensado un 50 % más rápido (antes 40 %)
  assert.ok(kneelShot(14, {}, 0.7).perfect === 0 && kneelShot(15, {}, 0.7).perfect === 1, 'Rodilla Firme: 0,7 s de rodillas ya es perfecto');
}
{ // Rodilla en Tierra · I (Puesto Fijo): no te mueves; tensado el doble de rápido y +15 %
  const m = kneelShot(18, {}, 0.55), p = kneelShot(18, { a_f_rodilla: 'i' }, 0.55);
  assert.ok(m.perfect === 0 && p.perfect === 1, 'Puesto Fijo: tensado el doble de rápido');
  const h = hero(18, { spec: 'francotiradora', forge: { a_f_rodilla: 'i' } });
  h.setSlot('k2', 'a_f_rodilla'); h.cast('k2');
  assert.equal(h.p.moveMulProduct(), 0, 'Puesto Fijo: no te mueves');
  const fm = kneelShot(18, {}, 2), fp = kneelShot(18, { a_f_rodilla: 'i' }, 2);
  assert.ok(approx(fp.a.t.direct / fm.a.t.direct, 1.15, 0.005), `Puesto Fijo: +15 % a carga completa (${(fp.a.t.direct / fm.a.t.direct).toFixed(4)})`);
  // de pie, nada
  const s = hero(18, { spec: 'francotiradora', forge: { a_f_rodilla: 'i' } }), s0 = hero(18, { spec: 'francotiradora' });
  const sa = foe(s, 0, 6), sb = foe(s0, 0, 6);
  tense(s, 'k3', 'a_t_apuntado', [0, 6], 2); tense(s0, 'k3', 'a_t_apuntado', [0, 6], 2);
  assert.ok(approx(sa.t.direct / sb.t.direct, 1, 0.001), 'Puesto Fijo: de pie no suma');
}
{ // Rodilla en Tierra · II (Parapeto): de rodillas recibes un 30 % menos y la mitad de disparos te fallan
  const run = forge => { const h = hero(18, { spec: 'francotiradora', forge }); h.setSlot('k2', 'a_f_rodilla'); h.cast('k2'); const on = [h.p.verbStats().dr || 0, h.p.projMissChance()]; h.cast('k2'); h.step(0.1); return { on, off: [h.p.verbStats().dr || 0, h.p.projMissChance()] }; };
  const m = run({}), p = run({ a_f_rodilla: 'ii' });
  assert.deepEqual(m.on, [0, 0], 'sin Parapeto: nada');
  assert.deepEqual(p.on, [30, 50], 'Parapeto: −30 % y la mitad de los disparos fallan');
  assert.deepEqual(p.off, [0, 0], 'Parapeto: al levantarte, nada');
  // y de verdad: el daño recibido
  const hit = forge => { const h = hero(18, { spec: 'francotiradora', forge }); h.setSlot('k2', 'a_f_rodilla'); h.cast('k2'); const hp = h.p.hp; h.p.takeDamage(200, 1); return hp - h.p.hp; };
  assert.ok(hit({ a_f_rodilla: 'ii' }) < hit({}) * 0.75, 'Parapeto: menos daño recibido');
}
{ // Tiro Rastreador · Mejora (Marca Duradera): Punto Débil 8 → 12 s
  const run = L => { const h = hero(L, { spec: 'francotiradora' }); const a = foe(h, 0, 6); shoot(h, 'rmb', 'a_f_rastreador', [0, 6], 0.6); return a.marks?.a_punto_debil?.t || 0; };
  const b = run(16), m = run(17);
  assert.ok(b > 7 && b <= 8 && m > 11 && m <= 12, `Marca Duradera: 12 s (${b.toFixed(2)} → ${m.toFixed(2)})`);
}
{ // Tiro Rastreador · I (Rastreo Múltiple): 3 enemigos a 4 m del blanco; dura 6 s
  const run = forge => { const h = hero(20, { spec: 'francotiradora', forge }); const es = [foe(h, 0, 6), foe(h, 2, 7), foe(h, -2, 7.5), foe(h, 1.5, 4.5), foe(h, 0, 12)]; shoot(h, 'rmb', 'a_f_rastreador', [0, 6], 0.6); return es.map(e => e.marks?.a_punto_debil?.t || 0); };
  const m = run({}), r = run({ a_f_rastreador: 'i' });
  assert.equal(m.filter(t => t > 0).length, 1, 'sin Rastreo Múltiple: solo el blanco');
  assert.equal(r.filter(t => t > 0).length, 3, `Rastreo Múltiple: 3 marcados (${r.map(t => t.toFixed(1)).join(' ')})`);
  assert.ok(r[0] > 0 && r[4] === 0, 'Rastreo Múltiple: el blanco y cercanos (a 6 m del blanco, no)');
  assert.ok(r.every(t => t <= 6), 'Rastreo Múltiple: 6 s');
}
{ // Tiro Rastreador · II (Grillete): el marcado va un 50 % más lento (8 s, el k); a un jefe, 20 de Quebranto
  const run = (forge, extra = {}, entry = null) => {
    const h = hero(20, { spec: 'francotiradora', forge });
    if (entry) { h.p.cls = { ...h.p.cls, forge: { ...SKILL_FORGE, a_f_rastreador: entry } }; h.p.forged = {}; h.p.resolved = {}; h.p.recompute(); }
    const a = foe(h, 0, 6, extra); shoot(h, 'rmb', 'a_f_rastreador', [0, 6], 0.6); return a;
  };
  const m = run({}), g = run({ a_f_rastreador: 'ii' });
  assert.ok(!(m.slowT > 0) && g.slowPct === 50 && g.slowT > 7 && g.slowT <= 8, `Grillete: −50 % durante 8 s (quedan ${g.slowT?.toFixed(2)} s)`);
  // Quebranto: el del mod (exactamente 20, frente a la misma ralentización sin él) y el total por impacto
  const e = ARQUERA_SKILL_FORGE.a_f_rastreador;
  const sinMod = { ...e, vars: [e.vars[0], { ...e.vars[1], mod: { ...e.vars[1].mod, stagger: 0 } }] };
  const bm = run({}, { boss: true }), bg = run({ a_f_rastreador: 'ii' }, { boss: true }), bs = run({ a_f_rastreador: 'ii' }, { boss: true }, sinMod);
  const st = x => x.stagger || 0;
  assert.ok(approx(st(bg) - st(bs), 20, 1e-6), `Grillete: el mod llena 20 de Quebranto (${st(bs).toFixed(2)} → ${st(bg).toFixed(2)})`);
  const want = 20 + staggerFromCC('slow', 8, { pct: 50 });
  assert.ok(approx(st(bg) - st(bm), want, 1e-6), `Grillete: ${want} de Quebranto por impacto (20 + la ralentización de 8 s; ${(st(bg) - st(bm)).toFixed(2)})`);
}
{ // Tiro Celestial · Mejora (Cielo Abierto): 10 s para los haces (antes 8 s)
  const run = L => { const h = hero(L, { spec: 'francotiradora' }); foe(h, 0, 6); tense(h, 'k4', 'a_u_celeste', [0, 6], 0.6, 8.8); return h.press('k4'); };
  assert.ok(run(17) === false && run(18) === true, 'Cielo Abierto: a los 9,4 s aún puedes tensar el segundo');
}
{ // Tiro Celestial · I (Lluvia Estelar): cada haz cae donde apuntas, en 4 m (150 %); no atraviesa
  const run = forge => {
    const h = hero(21, { spec: 'francotiradora', forge });
    const a = foe(h, 0, 6), side = foe(h, 3.2, 6), far = foe(h, 0, 14);
    tense(h, 'k4', 'a_u_celeste', [0, 6], 0.75, 0.6);
    return { h, a, side, far };
  };
  const m = run({}), l = run({ a_u_celeste: 'i' });
  assert.ok(m.side.t.n === 0 && l.side.t.n === 1, 'Lluvia Estelar: cae en 4 m alrededor de la mira');
  assert.ok(m.far.t.n === 1 && l.far.t.n === 0, 'Lluvia Estelar: no atraviesa');
  assert.ok(approx(l.a.t.direct / m.a.t.direct, 1.5 / 4, 0.01), `Lluvia Estelar: 150 % frente a 400 % a la misma carga (${(l.a.t.direct / m.a.t.direct).toFixed(3)})`);
  assert.equal(l.h.press('k4'), true, 'Lluvia Estelar: siguen siendo 3 haces');
}
{ // Tiro Celestial · II (Haz Único): un solo haz que tensas hasta 3 s: hasta 1000 %
  const run = (forge, hold) => { const h = hero(21, { spec: 'francotiradora', forge }); const a = foe(h, 0, 6); tense(h, 'k4', 'a_u_celeste', [0, 6], hold, 0.6); return { h, a }; };
  const m = run({}, 1), u = run({ a_u_celeste: 'ii' }, 3.2);
  assert.ok(approx(u.a.t.direct / m.a.t.direct, 10 / 4, 0.01), `Haz Único: 1000 % frente a 400 % (${(u.a.t.direct / m.a.t.direct).toFixed(3)})`);
  assert.equal(m.h.press('k4'), true, 'sin Haz Único: un segundo haz');
  assert.ok(u.h.press('k4') === false && u.h.p.cds.a_u_celeste > 40, 'Haz Único: uno solo y la recarga empieza');
  assert.equal(run({ a_u_celeste: 'ii' }, 2.8).h.sfxCount('verb_perfect'), 1, 'Haz Único: ventana dorada a 2,7–2,95 s');
}

// ———————— Montaraz ————————
{ // Trampa de Cepo · Mejora (Muelles Firmes): se arma en 0,2 s (antes 0,5 s)
  const run = L => { const h = hero(L, { spec: 'montaraz' }); const a = foe(h, 0, 6); shoot(h, 'k3', 'a_t_cepo', [0, 6], 0.3); return a.rootT || 0; };
  assert.ok(run(12) === 0 && run(13) > 1.5, 'Muelles Firmes: a los 0,3 s ya ha saltado');
}
{ // Trampa de Cepo · I (Mina de Espinas): no inmoviliza; al pisarla estalla en 3 m (100 %)
  const run = forge => { const h = hero(16, { spec: 'montaraz', forge }); const a = foe(h, 0, 6), b = foe(h, 2.6, 6); shoot(h, 'k3', 'a_t_cepo', [0, 6], 0.5); return { h, a, b }; };
  const m = run({}), x = run({ a_t_cepo: 'i' });
  assert.ok(m.a.rootT > 1.5 && !(x.a.rootT > 0), 'Mina de Espinas: no inmoviliza');
  assert.ok(m.b.t.n === 0 && x.b.t.n === 1, 'Mina de Espinas: estalla en 3 m');
  // el golpe sin crítico del 100 % del arma contra ese enemigo (el arnés no tira críticos)
  const wd = x.h.p.rollDamage(1, 0, resolveSkill(x.h.p, SK('a_t_cepo')).addPct, x.b, { skill: 'a_t_cepo' }).dmg;
  assert.ok(approx(x.b.t.direct, wd, wd * 0.02), `Mina de Espinas: al 100 % del arma (${x.b.t.direct} ≈ ${wd})`);
  assert.equal(fieldsOf(x.h, 'trampa').length, 0, 'Mina de Espinas: se gasta');
  // quien la pisa recibe solo el estallido (el veneno del cepo aparte, en tics): sin el golpe directo
  // del cepo (cola W2d-B)
  const pr = resolveSkill(x.h.p, SK('a_t_cepo'));
  const wdA = x.h.p.rollDamage(1, 0, pr.addPct, x.a, { skill: 'a_t_cepo' }).dmg;
  assert.ok(x.a.t.n === 1 && approx(x.a.t.direct, wdA, wdA * 0.02),
    `Mina de Espinas: quien la pisa, solo el estallido del 100 % (${x.a.t.n} golpes, ${x.a.t.direct} frente a ${wdA})`);
  assert.ok(x.h.g.hasDoT(x.a, 'poison'), 'Mina de Espinas: y el veneno del cepo');
  // a rango 3 (Nv26) el estallido escala como el resto de la habilidad (100 % × rango)
  const h3 = hero(26, { spec: 'montaraz', forge: { a_t_cepo: 'i' } });
  const s3 = foe(h3, 0, 6), n3 = foe(h3, 2.6, 6);
  shoot(h3, 'k3', 'a_t_cepo', [0, 6], 0.5);
  const p3 = resolveSkill(h3.p, SK('a_t_cepo')), rk = p3.coef / SK('a_t_cepo').coef;
  assert.ok(rk > 1.1, `Nv26: el cepo ya escala con el rango (×${rk.toFixed(2)})`);
  const atR = h3.p.rollDamage(rk, 0, p3.addPct, n3, { skill: 'a_t_cepo' }).dmg;
  assert.ok(n3.t.n === 1 && approx(n3.t.direct, atR, atR * 0.02),
    `Mina de Espinas a rango 3: el estallido al 100 % × ${rk.toFixed(2)}, una sola vez (${n3.t.direct} frente a ${atR})`);
  assert.ok(s3.t.n >= 1, 'Nv26: la mina salta al pisarla');
}
{ // Trampa de Cepo · II (Red de Caza): al pisarla, una red de 3 m inmoviliza 2,5 s a todos
  const run = forge => { const h = hero(16, { spec: 'montaraz', forge }); const a = foe(h, 0, 6), b = foe(h, 2.4, 6.5), c = foe(h, -4, 6); shoot(h, 'k3', 'a_t_cepo', [0, 6], 0.6); return { a, b, c }; };
  const m = run({}), r = run({ a_t_cepo: 'ii' });
  assert.ok(m.a.rootT > 1.4 && m.a.rootT <= 2 && !(m.b.rootT > 0), 'sin Red de Caza: solo al que la pisa, 2 s');
  assert.ok(r.a.rootT > 2 && r.a.rootT <= 2.5, `Red de Caza: el que la pisa, 2,5 s (${r.a.rootT.toFixed(2)})`);
  assert.ok(r.b.rootT > 2 && r.b.rootT <= 2.5, `Red de Caza: la red atrapa a los de 3 m (${(r.b.rootT || 0).toFixed(2)})`);
  assert.ok(!(r.c.rootT > 0), 'Red de Caza: a 4 m, no');
  // el radio sale de la definición forjada (con otro radio en la variante, la red llega a 4 m)
  const e = ARQUERA_SKILL_FORGE.a_t_cepo;
  const wide = { ...e, vars: [e.vars[0], { ...e.vars[1], set: { ...e.vars[1].set, radius: 4.5 } }] };
  const h = hero(16, { spec: 'montaraz', forge: { a_t_cepo: 'ii' } });
  h.p.cls = { ...h.p.cls, forge: { ...SKILL_FORGE, a_t_cepo: wide } }; h.p.forged = {}; h.p.resolved = {}; h.p.recompute();
  const a = foe(h, 0, 6), c = foe(h, -4, 6);
  shoot(h, 'k3', 'a_t_cepo', [0, 6], 0.6);
  assert.ok(a.rootT > 2 && c.rootT > 2, `Red de Caza: con 4,5 m en la variante, atrapa a 4 m (${(c.rootT || 0).toFixed(2)})`);
}
// trampa en (x, z) ya armada (Trampa de Cepo; para el salto y la flecha)
function trapAt(h, x, z) { h.aim(x, z); h.setSlot('k3', 'a_t_cepo'); h.g.reduceCooldown(h.p, 'a_t_cepo', Infinity); h.p.gcdT = 0; assert.equal(h.cast('k3'), true, `trampa en (${x}, ${z})`); h.step(0.6); }
{ // Salto de Acecho · Mejora (Acecho Lejano): llega a trampas a 20 m (antes 15 m)
  const run = L => { const h = hero(L, { spec: 'montaraz' }); trapAt(h, 9, 0); h.p.pos.set(-9, 0, 0); h.aim(9, 0); h.setSlot('k1', 'a_m_acecho'); h.cast('k1'); h.step(0.8); return h.p.pos.x; };
  const b = run(14), m = run(15);
  assert.ok(approx(b, -3, 1e-6) && approx(m, 9, 1e-6), `Acecho Lejano: a 18 m salta a la trampa (${b.toFixed(2)} → ${m.toFixed(2)})`);
}
{ // Salto de Acecho · I (Acecho Enredador): al caer, inmovilizas 1,5 s a todos a 3 m y no gastas la trampa
  const run = forge => { const h = hero(18, { spec: 'montaraz', forge }); trapAt(h, 8, 0); const a = foe(h, 8, 2.6), out = foe(h, 8, -3.8); h.aim(8, 0); h.setSlot('k1', 'a_m_acecho'); h.cast('k1'); h.step(0.6); return { h, a, out }; };
  const m = run({}), e = run({ a_m_acecho: 'i' });
  assert.ok(!(m.a.rootT > 0), 'sin Acecho Enredador: no inmoviliza');
  assert.ok(e.a.rootT > 1.2 && e.a.rootT <= 1.5, `Acecho Enredador: 1,5 s a 3 m (${(e.a.rootT || 0).toFixed(2)})`);
  assert.ok(!(e.out.rootT > 0), 'Acecho Enredador: a 3,8 m, no');
  assert.ok(approx(e.h.p.pos.x, 8, 1e-6), 'Acecho Enredador: saltas a tu trampa');
  assert.equal(fieldsOf(m.h, 'trampa').length, 0, 'sin Acecho Enredador: la trampa estalla y se gasta');
  // detonate.consume: false (cola W2d-B): la trampa estalla y se rearma
  const left = fieldsOf(e.h, 'trampa');
  assert.ok(left.length === 1 && e.h.p.trapBursts?.length === 1, `Acecho Enredador: la trampa estalla una vez y sigue puesta tras el salto (${left.length}, ${e.h.p.trapBursts?.length})`);
  assert.equal(m.h.p.trapBursts?.length, 1, 'sin Acecho Enredador: un estallido');
}
{ // Salto de Acecho · II (Doble Acecho): 2 cargas; el estallido, −30 %
  const run = forge => {
    const h = hero(18, { spec: 'montaraz', forge });
    trapAt(h, 6, 0);
    const a = foe(h, 6, 1.8);
    h.aim(6, 0); h.setSlot('k1', 'a_m_acecho');
    const r = [h.cast('k1')]; h.step(0.8);
    const burst = a.t.direct;
    r.push(h.cast('k1')); h.step(0.8); r.push(h.cast('k1'));
    return { r, burst };
  };
  const m = run({}), d = run({ a_m_acecho: 'ii' });
  assert.deepEqual(m.r, [true, false, false], 'sin Doble Acecho: un salto');
  assert.deepEqual(d.r, [true, true, false], 'Doble Acecho: dos saltos seguidos');
  assert.ok(m.burst > 0 && approx(d.burst / m.burst, 0.7, 0.01), `Doble Acecho: el estallido −30 % (${(d.burst / m.burst).toFixed(3)})`);
}
// Flecha Detonante hacia (0, 4): enemigo blanco en (0, 4)
function detonate(level, forge, traps, others = []) {
  const h = hero(level, { spec: 'montaraz', forge });
  for (const [x, z] of traps) trapAt(h, x, z);
  const t = foe(h, 0, 4);
  const es = others.map(([x, z]) => foe(h, x, z));
  h.aim(0, 4); h.setSlot('rmb', 'a_m_detonante'); h.p.mp = h.p.stats.maxMP; h.cast('rmb'); h.step(0.8);
  return { h, t, es, left: fieldsOf(h, 'trampa').length };
}
{ // Flecha Detonante · Mejora (Pólvora Fina): estalla en 4 m (antes 3 m), también para detonar
  const b = detonate(16, {}, [[0, 7.8]], [[3.7, 4]]), m = detonate(17, {}, [[0, 7.8]], [[3.7, 4]]);
  assert.ok(b.es[0].t.n === 0 && m.es[0].t.n >= 1, 'Pólvora Fina: a 3,7 m del impacto, estalla');
  assert.ok(b.left === 1 && m.left === 0, 'Pólvora Fina: detona la trampa a 3,8 m');
}
{ // Flecha Detonante · I (Detonación en Cadena): cada trampa que estalla detona las tuyas a 6 m
  const run = forge => detonate(20, forge, [[0, 6.5], [5, 7]]);
  const m = run({}), c = run({ a_m_detonante: 'i' });
  assert.ok(m.left === 1 && c.left === 0, `Detonación en Cadena: la segunda trampa (a 5 m de la primera) también estalla (${m.left} → ${c.left})`);
}
{ // Flecha Detonante · II (Flecha de Garfio): no estalla; arrastra 6 m hacia tu trampa más cercana
  const run = forge => {
    const h = hero(20, { spec: 'montaraz', forge });
    trapAt(h, 0, 2);
    const t = foe(h, 0, 9), side = foe(h, 1.5, 9);
    h.aim(0, 9); h.setSlot('rmb', 'a_m_detonante'); h.cast('rmb');
    let z = null;
    for (let i = 0; i < 60 && z == null; i++) { h.step(1 / 60); if (t.t.n) z = t.pos.z; }
    h.step(0.3);
    return { h, t, side, z };
  };
  const m = run({}), g = run({ a_m_detonante: 'ii' });
  assert.ok(m.side.t.n === 1 && g.side.t.n === 0, 'Flecha de Garfio: no estalla');
  assert.ok(approx(m.z, 9, 0.01) && approx(g.z, 3, 0.05), `Flecha de Garfio: arrastra 6 m hacia la trampa (z=${g.z?.toFixed(2)})`);
  assert.ok(g.t.rootT > 0, 'Flecha de Garfio: y la trampa lo atrapa');
}
// Cerco de Zarzas sobre (0, 8)
function briar(level, forge, spots = [[0, 8]]) {
  const h = hero(level, { spec: 'montaraz', forge });
  const es = spots.map(([x, z]) => foe(h, x, z));
  h.aim(0, 8); h.setSlot('k4', 'a_u_zarzas'); h.cast('k4');
  return { h, es, f: fieldsOf(h, 'zona', 'a_u_zarzas')[0] };
}
{ // Cerco de Zarzas · Mejora (Espinas Duraderas): 8 → 10 s
  assert.ok(approx(briar(17, {}).f.dur, 8) && approx(briar(18, {}).f.dur, 10), 'Espinas Duraderas: 10 s');
}
{ // Cerco de Zarzas · I (Jaula de Espinas): sobre un enemigo, 3 m, no sale y el veneno +30 %
  const m = briar(21, {}, [[1, 9]]), j = briar(21, { a_u_zarzas: 'i' }, [[1, 9]]);
  assert.ok(approx(m.f.pos.x, 0) && approx(j.f.pos.x, 1) && approx(j.f.pos.z, 9), 'Jaula de Espinas: se cierra sobre el enemigo');
  assert.ok(m.f.radius === 7 && j.f.radius === 3, 'Jaula de Espinas: 3 m');
  assert.ok(approx(j.f.data.dps / m.f.data.dps, 1.3, 1e-6), 'Jaula de Espinas: veneno +30 %');
  const e = j.es[0], bx = e.pos.x, bz = e.pos.z;
  e.pos.x += 4; j.h.g.constrainMove(e, bx, bz);
  assert.ok(approx(e.pos.x, bx), 'Jaula de Espinas: no sale');
  const e2 = m.es[0], cx = e2.pos.x;
  e2.pos.x += 9; m.h.g.constrainMove(e2, cx, e2.pos.z);
  assert.ok(approx(e2.pos.x, cx + 9), 'sin Jaula: sale');
  // el estallido al cerrarse NO lleva el +30 % (solo el veneno)
  const jb = briar(21, { a_u_zarzas: 'i' }, [[1, 9]]), mb = briar(21, {}, [[1, 9]]);
  jb.h.step(10.3); mb.h.step(10.3);
  assert.ok(jb.es[0].t.n === 1 && mb.es[0].t.n === 1, 'al cerrarse, un estallido');
  assert.ok(approx(jb.es[0].t.direct / mb.es[0].t.direct, 1, 0.005), `Jaula de Espinas: el estallido, igual (${(jb.es[0].t.direct / mb.es[0].t.direct).toFixed(3)})`);
  assert.ok(jb.es[0].t.dot / jb.es[0].t.ticks > mb.es[0].t.dot / mb.es[0].t.ticks * 1.25, 'Jaula de Espinas: cada tic de veneno, +30 %');
}
{ // Cerco de Zarzas · II (Señuelo de Zarzas): en el centro, un señuelo atrae 6 s a los enemigos a 10 m
  const m = briar(21, {}), s = briar(21, { a_u_zarzas: 'ii' });
  assert.equal(m.h.g.fields.filter(f => f.kind === 'senuelo' && !f.dead).length, 0, 'sin Señuelo: nada');
  const lure = s.h.g.fields.find(f => f.kind === 'senuelo' && !f.dead);
  assert.ok(lure && approx(lure.pos.x, 0) && approx(lure.pos.z, 8) && approx(lure.dur, 6) && lure.data.lure.radius === 10, 'Señuelo de Zarzas: en el centro, 6 s, 10 m');
  const near = foe(s.h, 0, 17.5), far = foe(s.h, 0, 19);
  for (let i = 0; i < 30; i++) { s.h.g.lureStep(near, 1 / 30); s.h.g.lureStep(far, 1 / 30); }
  assert.ok(near.pos.z < 17.4 && approx(far.pos.z, 19), `Señuelo de Zarzas: atrae a 10 m, no a 11 (z=${near.pos.z.toFixed(2)})`);
}
console.log('En el arnés: las 51 piezas (Mejoras y variantes) del kit base, Tiradora, Francotiradora y Montaraz ✓');

// ------------------------------------------------ 5) FORGE_RECO (★ del libro) y la barra de su especialización
// lo que alimenta cada barra (mockup C.mech[spec].feed y js/mech-arquera.js): Impulso ← disparos
// (tag proj) · Concentración ← tensados (carga), la postura que la conserva y el Punto Débil ·
// Coto ← trampas (tipo trap), detonaciones y saltos a tus trampas
const GAUGE_FEED = { tiradora: ['proj'], francotiradora: ['charge', 'keep', 'firstCharged'], montaraz: ['trap', 'detonate', 'ownField'] };
function feeders(def) {
  const out = new Set();
  if (def.tags?.includes?.('proj')) out.add('proj');
  if (def.charge) out.add('charge');
  if ((def.stance?.modes || []).some(m => m.keepGauge === 'concentracion')) out.add('keep');
  if (def.mark?.firstCharged) out.add('firstCharged');
  if (def.type === 'trap') out.add('trap');
  if (def.detonate) out.add('detonate');
  if (def.at === 'ownField') out.add('ownField');
  return out;
}
// lo que la forja de una especialización le QUITA a su barra (vacío = la conserva)
function gaugeLoss(sp, reco, forge = ARQUERA_SKILL_FORGE) {
  const lost = [];
  const want = new Set(GAUGE_FEED[sp]);
  for (const id of MOCK.mech[sp].feed) {
    const sk = SK(id), entry = forge[id];
    const before = feeders(forgeDef(sk, entry, { mejora: true })), after = feeders(forgeDef(sk, entry, { mejora: true, variant: reco[id] || null }));
    for (const f of before) if (want.has(f) && !after.has(f)) lost.push(`${id}:${f}`);
  }
  return lost;
}
{
  // la ★ del libro: la del mockup (A = I, B = II)
  const fromMock = Object.fromEntries(Object.entries(MOCK.reco).map(([sp, r]) => [sp, Object.fromEntries(Object.entries(r).map(([id, v]) => [id, v === 'A' ? 'i' : 'ii']))]));
  assert.deepEqual(ARQUERA_FORGE_RECO, fromMock, 'FORGE_RECO: la ★ del mockup');
  for (const [sp, reco] of Object.entries(ARQUERA_FORGE_RECO)) {
    assert.equal(FORGE_RECO[sp], reco, `${sp}: en la fusión FORGE_RECO`);
    for (const [id, v] of Object.entries(reco)) {
      const sk = SK(id);
      assert.ok(ARQUERA_SKILL_FORGE[id] && ['i', 'ii'].includes(v), `${sp}: ${id}=${v}`);
      assert.ok(!sk.spec || sk.spec === sp, `${sp}: ${id} es del kit base o del suyo`);
    }
    for (const [id, v] of Object.entries(ARQUERA_SPEC_BAR[sp].forge || {})) assert.equal(reco[id], v, `${sp}: la barra propone ${id}=${v} igual que la ★`);
    assert.equal(SPEC_BAR[sp], ARQUERA_SPEC_BAR[sp], `${sp}: SPEC_BAR fusionado`);
    // 2f §7.7: la ★ nunca apaga la barra de su especialización
    const feed = new Set([...MOCK.mech[sp].feed].flatMap(id => [...feeders(forgeDef(SK(id), ARQUERA_SKILL_FORGE[id], { mejora: true, variant: reco[id] || null }))]));
    for (const f of GAUGE_FEED[sp]) assert.ok(feed.has(f), `${sp}: con la ★, su barra sigue recibiendo «${f}»`);
    assert.deepEqual(gaugeLoss(sp, reco), [], `${sp}: la ★ no le quita nada a su barra`);
  }
  // el comprobador muerde: Flecha de Garfio deja de detonar; una variante sintética sin carga
  assert.deepEqual(gaugeLoss('montaraz', { ...ARQUERA_FORGE_RECO.montaraz, a_m_detonante: 'ii' }), ['a_m_detonante:detonate'], 'Garfio le quitaría la detonación al Coto');
  const noCharge = { ...ARQUERA_SKILL_FORGE, a_t_apuntado: { ...ARQUERA_SKILL_FORGE.a_t_apuntado, vars: [{ ...ARQUERA_SKILL_FORGE.a_t_apuntado.vars[0], set: { charge: null } }, ARQUERA_SKILL_FORGE.a_t_apuntado.vars[1]] } };
  assert.deepEqual(gaugeLoss('francotiradora', { a_t_apuntado: 'i' }, noCharge), ['a_t_apuntado:charge'], 'una variante sin carga le quitaría la Concentración');
}
{
  // D3: chooseSpec aplica la ★ solo a las habilidades nunca forjadas (null = «sin variante» elegido)
  const h = makeHarness({ classId: 'arquera', level: 30 });
  Object.assign(h.g, talentMethods);
  h.p.skillForge = { a_disparo: null, a_humo: 'ii' };
  const r = h.g.chooseSpec('tiradora');
  assert.ok(r?.ok, `se elige la Tiradora (${r?.reason || r?.text || ''})`);
  assert.equal(h.p.skillForge.a_disparo, null, 'D3: «sin variante» elegido a propósito se respeta');
  assert.equal(h.p.skillForge.a_humo, 'ii', 'D3: una variante ya elegida se respeta');
  for (const [id, v] of Object.entries(ARQUERA_FORGE_RECO.tiradora)) if (!['a_disparo', 'a_humo'].includes(id)) assert.equal(h.p.skillForge[id], v, `D3: ${id} recibe la ★ (${v})`);
  // cambiar luego al Montaraz: la ★ del Montaraz solo entra en las que siguen sin elegir
  h.g.chooseSpec('montaraz');
  assert.equal(h.p.skillForge.a_t_cepo, 'ii', 'Montaraz: Red de Caza');
  assert.equal(h.p.skillForge.a_humo, 'ii', 'Montaraz: la Bomba de Humo ya estaba elegida');
  assert.equal(h.p.skillForge.lluvia_flechas, 'ii', 'Montaraz: Cortina');
}
{
  // en vivo, con la ★ de cada especialización
  // Tiradora: Disparo Disperso corriendo llena el Impulso
  const t = hero(30, { spec: 'tiradora', forge: ARQUERA_FORGE_RECO.tiradora });
  foe(t, 0, 6);
  t.aim(0, 6); t.setSlot('lmb', 'a_disparo');
  for (let i = 0; i < 6; i++) { t.p.atkCd = 0; t.cast('lmb'); t.walk({ x: 1, z: 0 }, 0.25); }
  t.step(0.4);
  assert.ok(t.gaugeValue('impulso') > 0, `tiradora ★: Disparo Disperso en movimiento da Impulso (${t.gaugeValue('impulso')})`);
  // Francotiradora: Tiro Pesado perfecto; de rodillas (Puesto Fijo) la Concentración sigue subiendo
  const f = hero(30, { spec: 'francotiradora', forge: ARQUERA_FORGE_RECO.francotiradora });
  foe(f, 0, 6);
  tense(f, 'k3', 'a_t_apuntado', [0, 6], 2.25);
  assert.equal(f.sfxCount('verb_perfect'), 1, 'francotiradora ★: Tiro Pesado perfecto');
  f.setSlot('k2', 'a_f_rodilla'); f.cast('k2');
  const c0 = f.gaugeValue('concentracion');
  f.walk({ x: 1, z: 0 }, 1);
  assert.ok(f.gaugeValue('concentracion') > c0, 'francotiradora ★: de rodillas no la pierdes');
  // Montaraz: el cepo cuenta en el Coto y la red atrapa
  const m = hero(30, { spec: 'montaraz', forge: ARQUERA_FORGE_RECO.montaraz });
  trapAt(m, 0, 6);
  assert.equal(m.gaugeValue('coto'), 1, 'montaraz ★: la trampa armada cuenta en el Coto');
  const a = foe(m, 0, 6), b = foe(m, 2, 6);
  m.step(0.2);
  assert.ok(a.rootT > 0 && b.rootT > 0 && m.gaugeValue('coto') === 0, 'montaraz ★: Red de Caza atrapa a los dos y la trampa sale del Coto');
}
console.log('FORGE_RECO: la ★ del mockup, D3 al elegir especialización y nunca le apaga la barra (2f §7.7) ✓');

// ------------------------------------------------ 6) VFX de las variantes que cambian de forma
{
  const withVars = Object.entries(ARQUERA_FX).filter(([, fx]) => fx.vars);
  assert.ok(withVars.length >= 9, `VFX propios para las variantes que cambian de forma (${withVars.length})`);
  for (const [id, fx] of withVars) {
    const entry = ARQUERA_SKILL_FORGE[id];
    assert.ok(entry, `${id}: tiene forja`);
    for (const [k, over] of Object.entries(fx.vars)) {
      assert.ok(k === 'i' || k === 'ii', `${id}.vars.${k}: variante i o ii`);
      for (const f of ['trail', 'impact', 'aura', 'extra']) if (typeof over[f] === 'string') assert.ok(SKILL_FX_PRESETS[over[f]], `${id}.vars.${k}: preset ${over[f]}`);
      const v = entry.vars[k === 'i' ? 0 : 1];
      const keys = Object.keys({ ...(v.set || {}), ...(v.add || {}), ...(v.mul || {}), ...(v.mod || {}) }).map(x => x.split('.')[0]);
      assert.ok(keys.some(x => ['type', 'at', 'radius', 'count', 'spread', 'pierce', 'splash', 'knock', 'slow', 'hitDot', 'coef', 'detonate', 'pull', 'lure', 'contain', 'charge', 'allyDr', 'waves', 'windup'].includes(x)) || v.elem,
        `${id}.vars.${k}: ${v.name} cambia la forma`);
    }
  }
  // los comportamientos de la clase usan los VFX de la variante (Humo Venenoso: nube verde)
  const run = forge => { const h = hero(12, { forge }); const seen = []; h.g.emitFx = name => { seen.push(typeof name === 'string' ? name : '?'); }; h.setSlot('k2', 'a_humo'); h.cast('k2'); return seen; };
  assert.ok(!run({}).includes('arqVenomCloud') && run({ a_humo: 'i' }).includes('arqVenomCloud'), 'Humo Venenoso: su nube de veneno');
  const runR = forge => { const h = hero(21, { spec: 'tiradora', forge }); const seen = []; h.g.emitFx = name => { seen.push(name); }; foe(h, 6, 0); h.aim(6, 0); h.setSlot('k4', 'a_u_diluvio'); h.cast('k4'); h.step(1.5); return seen; };
  assert.ok(!runR({}).includes('arqAimedImpact') && runR({ a_u_diluvio: 'ii' }).includes('arqAimedImpact'), 'Saetas Pesadas: su impacto');
}
console.log('VFX: las variantes que cambian de forma tienen los suyos (presets que existen) y los comportamientos los usan ✓');

assert.deepEqual(warns, [], `ningún poder ni comportamiento lanzó errores: ${warns.join(' · ')}`);
console.warn = origWarn;
console.log('\n✅ FORJA DE LA ARQUERA (A1 · A2/F7 · A9 · 51 piezas en el arnés · ★ · VFX) OK');
