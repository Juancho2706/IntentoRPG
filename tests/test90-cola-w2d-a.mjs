// ============================================================
// Test 90 — COLA W2d, parte A (punto 17 de docs/paso2-implementacion.md): canal de lanzamiento
// y perfil de habilidad (js/game-skills.js, js/skill-resolve.js, js/skill-defs.js)
// ============================================================
// Habilidades SINTÉTICAS (vx_* del fixture y vx90_* de aquí) sobre el canal real, el héroe real
// y el despachador real de poderes. Una sección por punto de la cola:
//  0) vocabulario: zonePct, charge.markMin y pull.radius en validateSkillDef
//  1) spawnChainBounce: cada salto nace en el enemigo del que sale y golpea al SIGUIENTE (el
//     último recibe), con la habilidad del lanzamiento (HitInfo.source 'chain')
//  2) stat costPct: abarata TODAS las habilidades con coste (aparte de spenderCostPct)
//  3) cargar y soltar: soltar antes de un charge.min declarado cancela sin coste; charge.markMin
//  4) principal instantánea sobre el canal de una definitiva imparable (Doble Grieta)
//  5) g.castEcho(p, id, { mult, at, origin, series }): repetición con su propia serie (nunca una
//     canalización; anidada, hereda la serie y no pasa de echoCap niveles)
//  6) _makeCtx con skillFxFor (VFX de la variante forjada)
//  7) wave sin repetir al del impacto · zonePct · @windup en pasos de combo (también con el nodo
//     REAL c9 del Guerrero sobre Rajar) · hitDot con los talentos de DoT · trail.dur con zoneDur
//  8) los tics de startChannel no derivan (30, 60 y 144 fps)
//  9) un proyectil con detonate detona al final de su vuelo; detonate.coef × rankCoef
// 10) g.startCooldown, g.channelInfo, g.extendMark (con su Debilidad)
// 11) clampWalkable hasta el final · dragWidth de talento sin drag · arrastrados juntos al
//     llegar · slowImmune del canal · pull.radius y pull.boss (canal y golpe)
// 12) stat skillSpeedPct: preparación, tic de canal, avances y saltos (no enfriamientos)
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { definePower } from '../js/powers.js';
import { resolveSkill } from '../js/skill-resolve.js';
import { validateSkillDef, normalizeSkillDef, SKILL_KEYS } from '../js/skill-defs.js';
import { rankCoef } from '../js/combat-math.js';
import { SKILL_FX } from '../js/fx-skills.js';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';
import { makeHarness } from './helpers/power-harness.mjs';
import { findSpec, heroTreesFor } from '../js/talents.js';

const DT = 1 / 60;
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const v3 = (x, z) => new THREE.Vector3(x, 0, z);
const lost = e => e.maxHP - e.hp;

// espía de poderes: CastInfo (onCast/afterCast), HitInfo (onHit) y ⑭ onSkillEnd
const SPY = { cast: [], after: [], hit: [], end: [] };
definePower('vx90_spy', {
  name: 'espía de la cola W2d',
  onCast(g, p, cast) { SPY.cast.push({ ...cast }); },
  afterCast(g, p, cast, res) { SPY.after.push({ cast: { ...cast }, res: { ...res } }); },
  onHit(g, p, e, hit) { SPY.hit.push({ ...hit, e }); },
  onSkillEnd(g, p, sk, end) { SPY.end.push({ id: sk.id, ...end }); },
});

// un poder que repite la Nova desde CADA golpe suyo, sin mirar hit.echo (§5: tope de la cadena).
// fresh: cada llamada con una serie propia (solo la profundidad la frena)
const ECO = { on: false, fresh: false, n: 0 };
definePower('vx90_eco_loco', {
  name: 'repite sin mirar',
  onHit(g, p, e, hit) {
    if (!ECO.on || hit.skill !== 'vx90_nova') return;
    if (g.castEcho(p, 'vx90_nova', ECO.fresh ? { series: { n: 0 } } : {})) ECO.n++;
  },
});

const S = d => ({ icon: '🧪', desc: 'prueba de la cola W2d', req: 1, elem: 'physical', ...d });
const SKILLS = [
  S({ id: 'vx90_util', name: 'Utilidad con coste', cat: 'utility', tags: ['utility', 'buff'], type: 'buff', cost: 20, cd: 0, dur: 2, buff: { dr: 1 } }),
  S({ id: 'vx90_tenso', name: 'Tensado mínimo', cat: 'spender', tags: ['spender', 'proj'], type: 'proj', coef: 1, cost: 10, cd: 0, range: 12, speed: 30,
    charge: { min: 0.3, max: 1, perfect: [0.8, 1] } }),
  S({ id: 'vx90_toque', name: 'Carga sin mínimo', cat: 'spender', tags: ['spender', 'proj'], type: 'proj', coef: 1, cost: 10, cd: 0, range: 12, speed: 30,
    charge: { max: 1, perfect: [0.8, 1] } }),
  S({ id: 'vx90_cero', name: 'Tensado libre', cat: 'spender', tags: ['spender', 'proj'], type: 'proj', coef: 1, cost: 0, cd: 0, range: 12, speed: 30,
    charge: { min: 0, max: 1, perfect: [0.8, 1], markMin: 0.3 } }),
  S({ id: 'vx90_grieta', name: 'Grieta definitiva', cat: 'ultimate', tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', unstoppable: true, coef: 0.2, cd: 30, channelT: 3, ticks: 6, range: 10 }),
  S({ id: 'vx90_grieta_frágil', name: 'Grieta que se corta', cat: 'ultimate', tags: ['ultimate', 'channel', 'arcane'], elem: 'arcane',
    type: 'channel', coef: 0.2, cd: 30, channelT: 3, ticks: 6, range: 10 }),
  S({ id: 'vx90_giro', name: 'Giro imparable', cat: 'spender', tags: ['spender', 'channel'], type: 'channel', unstoppable: true,
    coef: 0.2, cost: 0, cd: 0, channelT: 3, ticks: 6, radius: 2, at: 'self' }),
  S({ id: 'vx90_rayo', name: 'Rayo instantáneo', cat: 'spender', tags: ['spender', 'line', 'arcane'], elem: 'arcane',
    type: 'line', coef: 1, cost: 5, cd: 1, range: 10, width: 1.5 }),
  S({ id: 'vx90_pesado', name: 'Golpe preparado', cat: 'spender', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 1, cost: 0, cd: 0, radius: 3, windup: 0.3 }),
  S({ id: 'vx90_canal', name: 'Canal principal', cat: 'spender', tags: ['spender', 'channel'], type: 'channel', coef: 0.2, cost: 0, cd: 0, channelT: 1, ticks: 4, range: 10 }),
  S({ id: 'vx90_nova', name: 'Nova', cat: 'spender', tags: ['spender', 'area', 'frost'], elem: 'frost', type: 'area', at: 'self', coef: 1, cost: 10, cd: 5, radius: 3 }),
  S({ id: 'vx90_bola', name: 'Bola', cat: 'spender', tags: ['spender', 'area', 'fire'], elem: 'fire', type: 'area', at: 'target', coef: 1, cost: 10, cd: 5, range: 12, radius: 1.5 }),
  S({ id: 'vx90_fx', name: 'Con VFX por variante', cat: 'spender', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 0.1, cost: 0, cd: 0, radius: 2 }),
  S({ id: 'vx90_fx2', name: 'Con VFX en vars', cat: 'spender', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 0.1, cost: 0, cd: 0, radius: 2 }),
  S({ id: 'vx90_onda', name: 'Martillo con onda', cat: 'spender', tags: ['spender', 'area', 'holy'], elem: 'holy', type: 'area', at: 'self',
    coef: 1, cost: 0, cd: 0, radius: 2, wave: { range: 8, width: 2, coef: 0.6 } }),
  S({ id: 'vx90_estela', name: 'Estela al 40 %', cat: 'spender', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 1, cost: 0, cd: 0, radius: 2, zonePct: 40 }),
  S({ id: 'vx90_estela0', name: 'Estela de siempre', cat: 'spender', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 1, cost: 0, cd: 0, radius: 2 }),
  S({ id: 'vx90_sangra', name: 'Corte sangrante', cat: 'spender', tags: ['spender', 'melee', 'dot'], type: 'melee', coef: 1, cost: 0, cd: 0, range: 2.5,
    hitDot: { kind: 'bleed', coef: 0.6, dur: 3 } }),
  S({ id: 'vx90_quema', name: 'Corte ardiente', cat: 'spender', tags: ['spender', 'melee', 'dot', 'fire'], elem: 'fire', type: 'melee', coef: 1, cost: 0, cd: 0, range: 2.5,
    hitDot: { kind: 'burn', coef: 0.5, dur: 4 } }),
  S({ id: 'vx90_veneno', name: 'Corte venenoso', cat: 'spender', tags: ['spender', 'melee', 'dot'], type: 'melee', coef: 1, cost: 0, cd: 0, range: 2.5,
    hitDot: { kind: 'poison', coef: 0.5, dur: 4 } }),
  S({ id: 'vx90_carrera', name: 'Carrera de 4 s', cat: 'spender', tags: ['spender', 'channel'], type: 'channel', coef: 0, cost: 0, cd: 0, channelT: 4, ticks: 20, hold: false, range: 10 }),
  S({ id: 'vx90_ciclon', name: 'Ciclón', cat: 'spender', tags: ['spender', 'channel', 'cc'], type: 'channel', at: 'self', coef: 0.05, cost: 0, cd: 0,
    channelT: 1, ticks: 4, radius: 2, hold: false, slowImmune: true, pull: { dist: 1, radius: 5, boss: false } }),
  S({ id: 'vx90_ciclon_jefes', name: 'Ciclón que atrae jefes', cat: 'spender', tags: ['spender', 'channel', 'cc'], type: 'channel', at: 'self', coef: 0.05, cost: 0, cd: 0,
    channelT: 1, ticks: 4, radius: 2, hold: false, pull: { dist: 1, radius: 5 } }),
  S({ id: 'vx90_ciclon0', name: 'Giro sin más', cat: 'spender', tags: ['spender', 'channel'], type: 'channel', at: 'self', coef: 0.05, cost: 0, cd: 0,
    channelT: 1, ticks: 4, radius: 2, hold: false, pull: 1 }),
  S({ id: 'vx90_arpon', name: 'Arpón sin jefes', cat: 'spender', tags: ['spender', 'area', 'cc'], type: 'area', at: 'self', coef: 0.1, cost: 0, cd: 0,
    radius: 6, pull: { dist: 2, boss: false } }),
  S({ id: 'vx90_det', name: 'Flecha que detona', cat: 'spender', tags: ['spender', 'proj', 'fire'], elem: 'fire', type: 'proj', coef: 0.5, cost: 0, cd: 0,
    range: 12, speed: 30, detonate: { radius: 3, coef: 1 } }),
  S({ id: 'vx90_piel', name: 'Piel', cat: 'defense', tags: ['defense', 'buff'], type: 'buff', cd: 10, dur: 4, buff: { dr: 10 }, cdOnEnd: true }),
  S({ id: 'vx90_salto', name: 'Salto', cat: 'movement', tags: ['movement'], type: 'leap', coef: 0, cd: 1, range: 8, airT: 0.5 }),
  S({ id: 'vx90_arrastre', name: 'Arrastre ancho', cat: 'movement', tags: ['movement'], type: 'dash', coef: 0.3, cd: 1, range: 6, radius: 1.9, drag: true, dragWidth: 3 }),
  S({ id: 'vx90_veloz', name: 'Carga veloz', cat: 'movement', tags: ['movement'], type: 'dash', coef: 0, cd: 1, range: 6, drag: false }),
  S({ id: 'vx90_ajeno', name: 'De otra especialización', cat: 'spender', spec: 'nadie', tags: ['spender', 'area'], type: 'area', at: 'self', coef: 1, radius: 2 }),
  S({ id: 'vx90_cadena', name: 'Rayo que decae', cat: 'spender', tags: ['spender', 'line', 'arcane'], elem: 'arcane', type: 'line', coef: 1, cost: 0, cd: 0,
    range: 8, width: 1.5, chain: 2 }),
];
const piece = (id, n) => ({ id, name: n, role: n === 'I' ? 'UNI' : 'AREA', line: 'prueba' });
const FORGE = {
  vx90_fx: { mejora: { name: 'Mejora', line: 'prueba' }, vars: [piece('vx90_fx_i', 'I'), piece('vx90_fx_ii', 'II')] },
  vx90_fx2: { mejora: { name: 'Mejora', line: 'prueba' }, vars: [piece('vx90_fx2_i', 'I'), piece('vx90_fx2_ii', 'II')] },
};

const mk = (classId = 'maga', opts = {}) => {
  SPY.cast = []; SPY.after = []; SPY.hit = []; SPY.end = [];
  const h = verbHarness(classId, { level: 30, powers: ['vx90_spy'], skills: SKILLS, forge: FORGE, ...opts });
  h.p.stats.critRaw = -1000;
  return h;
};
// arma sin varianza y sin críticos (golpe = golpe medio)
const flat = h => { h.p.stats.wMin = h.p.stats.wMax = 1000; h.p.stats.critRaw = -1000; h.p.resolved = {}; };
// stats que recompute aún no conoce (costPct y skillSpeedPct los deja pasar W2d-B): se fijan
// tras cada recompute de este héroe
const pin = (h, stats) => {
  const rc = h.p.recompute.bind(h.p);
  h.p.recompute = () => { rc(); Object.assign(h.p.stats, stats); h.p.resolved = {}; };
  h.p.recompute();
};
const prof = (h, id) => resolveSkill(h.p, h.p.cls.skills.find(s => s.id === id));
// golpes por enemigo (⑤ con el enemigo): el que lo dio y de dónde
const hitLog = h => {
  const log = [];
  const on = h.g.onPlayerHit;
  h.g.onPlayerHit = function (e, hit) { log.push({ e, skill: hit.skill, source: hit.source, dealt: hit.dealt, dot: hit.dot, echo: !!hit.echo }); return on.call(this, e, hit); };
  return log;
};
const hitsOn = (log, e, f = () => true) => log.filter(x => x.e === e && !x.dot && f(x));

// ------------------------------------------------ 0) vocabulario
{
  assert.ok(SKILL_KEYS.has('zonePct'), 'zonePct es clave del motor');
  const def = id => normalizeSkillDef(SKILLS.find(s => s.id === id));
  for (const id of ['vx90_estela', 'vx90_cero', 'vx90_ciclon']) {
    const errs = validateSkillDef(def(id), { v2: true });
    assert.deepEqual([...errs, ...errs.warnings], [], `${id} válida y sin avisos en v2`);
  }
  const bad = validateSkillDef(normalizeSkillDef({ ...SKILLS.find(s => s.id === 'vx90_cero'), charge: { min: 0, max: 1, markMin: 2 } }));
  assert.ok(bad.some(x => /markMin/.test(x)), 'markMin fuera de [0, max]: error');
  const badPull = validateSkillDef(normalizeSkillDef({ ...SKILLS.find(s => s.id === 'vx90_ciclon'), pull: { dist: 1, radius: 0 } }));
  assert.ok(badPull.some(x => /pull\.radius/.test(x)), 'pull.radius ≤ 0: error');
  const badZone = validateSkillDef(normalizeSkillDef({ ...SKILLS.find(s => s.id === 'vx90_estela'), zonePct: -5 }));
  assert.ok(badZone.some(x => /zonePct/.test(x)), 'zonePct < 0: error');
  console.log('Vocabulario: zonePct, charge.markMin y pull.radius validados ✓');
}

// ------------------------------------------------ 1) spawnChainBounce
{
  const h = mk('maga');
  flat(h);
  const log = hitLog(h);
  const first = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  const links = [2, 4, 6].map(z => h.enemy({ hp: 1e7, pos: [3, 0, z] }));
  h.aim(6, 0); h.setSlot('rmb', 'vx_rayo_cadena');
  assert.equal(h.cast('rmb'), true);
  assert.equal(h.g.projectiles.length, 3, 'tres saltos');
  const bolts = [...h.g.projectiles];
  // cada salto nace en el enemigo del que sale y va al siguiente
  const chainFrom = [first, ...links.slice(0, 2)];
  bolts.forEach((b, i) => {
    assert.ok(near(b.mesh.position.x, chainFrom[i].pos.x) && near(b.mesh.position.z, chainFrom[i].pos.z), `salto ${i + 1}: nace en su origen`);
    assert.ok(b.castHits?.has(chainFrom[i]) && !b.castHits?.has(links[i]), `salto ${i + 1}: no puede golpear a su origen, sí al siguiente`);
  });
  h.step(1);
  assert.equal(hitsOn(log, first).length, 1, 'el primero: solo el golpe de la línea (el salto no lo repite)');
  assert.equal(hitsOn(log, first)[0]?.source, 'hit');
  for (const [i, e] of links.entries()) {
    const hs = hitsOn(log, e);
    assert.equal(hs.length, 1, `eslabón ${i + 1}: un solo golpe`);
    assert.ok(hs[0]?.source === 'chain' && hs[0]?.skill === 'vx_rayo_cadena', `eslabón ${i + 1}: con la habilidad y source 'chain'`);
  }
  assert.ok(lost(links[2]) > 0, 'el ÚLTIMO de la cadena recibe daño');
  const r = lost(links[0]) / lost(first);
  assert.ok(Math.abs(r - 0.7) < 0.01, `cada salto al 70 % del golpe (${r.toFixed(3)})`);
  assert.ok(links.every(e => lost(e) === lost(links[0])), 'chainPct: no decae');
  // cuenta para los poderes (⑤ con la habilidad del lanzamiento)
  assert.equal(SPY.hit.filter(x => x.skill === 'vx_rayo_cadena' && x.source === 'chain').length, 3, 'los poderes ven los 3 saltos');
  // sin chainPct: −25 % compuesto por salto; `exclude` (los de la línea) no recibe saltos
  const d = mk('maga');
  flat(d);
  const dlog = hitLog(d);
  const a = d.enemy({ hp: 1e7, pos: [3, 0, 0] }), inLine = d.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const b = d.enemy({ hp: 1e7, pos: [3, 0, 2] }), c = d.enemy({ hp: 1e7, pos: [3, 0, 4] });
  d.aim(6, 0); d.setSlot('rmb', 'vx90_cadena');
  assert.equal(d.cast('rmb'), true);
  d.step(1);
  assert.equal(hitsOn(dlog, inLine).length, 1, 'el otro de la línea no recibe saltos');
  assert.ok(Math.abs(lost(b) / lost(a) - 0.75) < 0.01 && Math.abs(lost(c) / lost(a) - 0.5625) < 0.01,
    `sin chainPct: 75 % y 56 % (${(lost(b) / lost(a)).toFixed(3)}, ${(lost(c) / lost(a)).toFixed(3)})`);
  // los saltos heredan las marcas del lanzamiento (hitExtra): los de una repetición, echo
  const ec = mk('maga');
  flat(ec);
  const rlog = hitLog(ec);
  const r0 = ec.enemy({ hp: 1e7, pos: [3, 0, 0] }), r1 = ec.enemy({ hp: 1e7, pos: [3, 0, 2] });
  ec.aim(6, 0);
  assert.ok(ec.g.castEcho(ec.p, 'vx_rayo_cadena'));
  ec.step(1);
  assert.ok(hitsOn(rlog, r0)[0]?.echo && hitsOn(rlog, r1).length === 1, 'la repetición golpea y salta');
  assert.ok(hitsOn(rlog, r1)[0]?.source === 'chain' && hitsOn(rlog, r1)[0]?.echo === true, 'el salto de una repetición también es repetición (hit.echo)');
  console.log('Encadenado: nace en el origen, golpea al siguiente, el último recibe y cuenta para los poderes ✓');
}

// ------------------------------------------------ 2) stat costPct
{
  const h = mk('maga');
  const base = { util: prof(h, 'vx90_util').cost, spender: prof(h, 'vx_martillo').cost, basic: prof(h, 'm_dardo').cost };
  assert.deepEqual(base, { util: 20, spender: 20, basic: 0 });
  pin(h, { costPct: -50 });
  assert.equal(prof(h, 'vx90_util').cost, 10, 'costPct −50: una utilidad a la mitad');
  assert.equal(prof(h, 'vx_martillo').cost, 10, 'y una principal');
  assert.equal(prof(h, 'm_dardo').cost, 0, 'el básico sigue sin coste');
  // spenderCostPct sigue siendo solo de las principales; los dos se multiplican
  pin(h, { costPct: 0, spenderCostPct: -50 });
  assert.equal(prof(h, 'vx90_util').cost, 20, 'spenderCostPct no toca a una utilidad');
  assert.equal(prof(h, 'vx_martillo').cost, 10);
  pin(h, { costPct: -50, spenderCostPct: -50 });
  assert.equal(prof(h, 'vx_martillo').cost, 5, 'los dos: 20 × 0,5 × 0,5');
  pin(h, { costPct: -150, spenderCostPct: 0 });
  assert.equal(prof(h, 'vx90_util').cost, 0, 'nunca por debajo de 0');
  // al lanzar se cobra el coste rebajado
  const c = mk('maga');
  pin(c, { costPct: -25 });
  c.setSlot('k2', 'vx90_util');
  const mp = c.p.mp;
  assert.equal(c.cast('k2'), true);
  assert.equal(mp - c.p.mp, 15, 'se cobra 15 (20 − 25 %)');
  console.log('costPct: todas las habilidades con coste, aparte de spenderCostPct ✓');
}

// ------------------------------------------------ 3) cargar y soltar: min declarado y markMin
{
  const h = mk('maga');
  h.enemy({ hp: 1e7, pos: [0, 0, 6] });
  h.aim(0, 6); h.setSlot('rmb', 'vx90_tenso');
  const mp = h.p.mp;
  assert.equal(h.press('rmb'), true);
  h.step(0.1); h.release('rmb'); h.step(DT);
  assert.ok(!h.g._charging, 'soltar antes del mínimo termina la carga');
  assert.equal(h.g.projectiles.length, 0, '…sin disparar');
  assert.equal(h.p.mp, mp, '…sin coste');
  assert.ok(!(h.p.cds.vx90_tenso > 0) && !h.p.moveMuls?.charge, '…sin enfriamiento y sin frenarte');
  assert.ok(SPY.end.some(x => x.id === 'vx90_tenso' && x.kind === 'charge' && x.reason === 'early' && x.casts === 0), '⑭ charge/early');
  assert.ok(!SPY.after.some(x => x.cast.sk.id === 'vx90_tenso'), 'sin ③ afterCast');
  // pasado el mínimo, dispara
  assert.equal(h.press('rmb'), true, 'se puede volver a cargar sin soltar antes');
  h.step(0.4); h.release('rmb'); h.step(DT);
  assert.equal(h.g.projectiles.length, 1, 'pasado el mínimo dispara');
  assert.ok(near(mp - h.p.mp, 10, 0.5), `y cobra (${(mp - h.p.mp).toFixed(2)}; el resto es regeneración)`);
  // sin min declarado (el de VERB_DEFAULTS) y con min 0, un toque dispara al mínimo
  for (const id of ['vx90_toque', 'vx90_cero']) {
    const t = mk('maga');
    t.enemy({ hp: 1e7, pos: [0, 0, 6] });
    t.aim(0, 6); t.setSlot('rmb', id);
    t.press('rmb'); t.release('rmb'); t.step(DT);
    assert.equal(t.g.projectiles.length, 1, `${id}: un toque dispara`);
  }
  // markMin: por debajo, la suelta no gasta el Punto Débil ni fuerza el perfecto
  const m = mk('maga');
  const e = m.enemy({ hp: 1e7, pos: [0, 0, 6] });
  m.g.applyMark(e, { id: 'vx90_pd', mark: { id: 'vx90_pd', dur: 8, uses: 1, firstCharged: 30 } }, m.p);
  m.aim(0, 6); m.setSlot('rmb', 'vx90_cero');
  m.press('rmb'); m.step(0.1); m.release('rmb'); m.step(0.5);
  let last = SPY.after.filter(x => x.cast.sk.id === 'vx90_cero').at(-1);
  assert.ok(last && !last.cast.perfect, 'toque por debajo de markMin: no es perfecto');
  assert.ok(e.marks?.vx90_pd, '…y el Punto Débil sigue');
  m.press('rmb'); m.step(0.4); m.release('rmb'); m.step(0.5);
  last = SPY.after.filter(x => x.cast.sk.id === 'vx90_cero').at(-1);
  assert.ok(last.cast.perfect, 'tensado por encima de markMin: perfecto forzado');
  assert.ok(!e.marks?.vx90_pd, '…y gasta el Punto Débil');
  assert.equal(prof(m, 'vx90_cero').charge.markMin, 0.3, 'el perfil lleva markMin');
  console.log('Carga: soltar antes del mínimo declarado cancela sin coste; markMin protege el Punto Débil ✓');
}

// ------------------------------------------------ 4) principal instantánea sobre una definitiva
{
  const h = mk('maga');
  flat(h);
  const log = hitLog(h);
  const e = h.enemy({ hp: 1e7, pos: [4, 0, 0] });
  h.aim(4, 0);
  h.setSlot('k4', 'vx90_grieta'); h.setSlot('rmb', 'vx90_rayo');
  assert.equal(h.press('k4'), true);
  const inst = h.g._channel;
  assert.ok(inst && inst.unstoppable, 'canaliza la definitiva');
  h.step(0.3);
  const mp = h.p.mp;
  assert.equal(h.g.castSkillSlot('rmb'), true, 'la principal instantánea sale sobre el canal');
  assert.ok(h.g._channel === inst, 'sin cortar el canal');
  assert.equal(mp - h.p.mp, 5, 'con su coste');
  assert.ok(hitsOn(log, e, x => x.skill === 'vx90_rayo').length === 1, 'y su golpe');
  assert.ok(h.p.cds.vx90_rayo > 0 && h.g.castSkillSlot('rmb') === false, 'con su enfriamiento');
  h.step(1.1);
  assert.equal(h.g.castSkillSlot('rmb'), true, 'pasado el enfriamiento, otra vez');
  assert.ok(h.g._channel === inst, 'sigue el mismo canal');
  // lo demás sigue rechazándose con el canal en curso
  for (const id of ['vx90_pesado', 'vx90_tenso', 'vx90_canal', 'vx90_util']) {
    h.setSlot('k2', id); h.p.gcdT = 0;
    assert.equal(h.g.castSkillSlot('k2'), false, `${id}: no sale sobre el canal`);
    assert.ok(h.g._channel === inst, `${id}: el canal sigue`);
  }
  h.step(3);
  assert.ok(!h.g._channel && inst.tickN === 6, 'el canal acaba entero');
  // una definitiva que NO es imparable, o un canal imparable que no es definitiva: nada
  for (const id of ['vx90_grieta_frágil', 'vx90_giro']) {
    const t = mk('maga');
    t.enemy({ hp: 1e7, pos: [4, 0, 0] });
    t.aim(4, 0);
    const slot = id === 'vx90_giro' ? 'k2' : 'k4';
    t.setSlot(slot, id); t.setSlot('rmb', 'vx90_rayo');
    assert.equal(t.press(slot), true);
    t.step(0.3);
    assert.equal(t.g.castSkillSlot('rmb'), false, `${id}: la principal espera`);
  }
  // un combo: sus pasos instantáneos salen sobre la definitiva; el paso con preparación, no
  const k = mk('maga');
  k.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  k.aim(1.5, 0);
  k.setSlot('rmb', 'vx_combo'); k.setSlot('k4', 'vx90_grieta');
  assert.equal(k.press('k4'), true);
  k.step(0.3);
  const kch = k.g._channel;
  for (let i = 1; i <= 2; i++) {
    assert.equal(k.g.castSkillSlot('rmb'), true, `paso ${i} (instantáneo) sobre el canal`);
    k.step(0.3);
  }
  assert.equal(k.g.castSkillSlot('rmb'), false, 'el 3.er paso (con preparación) espera');
  assert.ok(k.g._channel === kch && !k.g._windup, 'sin empezar a prepararlo y sin cortar el canal');
  console.log('Doble Grieta: principal instantánea sobre el canal de una definitiva imparable, sin cortarlo ✓');
}

// ------------------------------------------------ 5) g.castEcho
{
  const h = mk('maga');
  flat(h);
  const log = hitLog(h);
  const far = h.enemy({ hp: 1e7, pos: [10, 0, 0] }), close = h.enemy({ hp: 1e7, pos: [1, 0, 0] });
  h.aim(-5, 0);
  const mw = h.g.input.mouseWorld, mw0 = mw.clone();
  const bar = JSON.stringify(h.p.hotbar);
  h.p.skState.vx90_nova = { echo: { seq: 4, n: 2 } };
  const mp = h.p.mp, casts = SPY.cast.length;
  const c = h.g.castEcho(h.p, 'vx90_nova', { origin: { x: 10, z: 0 }, mult: 0.5 });
  assert.ok(c && c.echo === 0.5 && c.sk.id === 'vx90_nova', 'devuelve el CastInfo de la repetición');
  assert.ok(lost(far) > 0 && lost(close) === 0, 'at:self sale del origen (no de tus pies)');
  assert.equal(h.p.mp, mp, 'gratis');
  assert.ok(!(h.p.cds.vx90_nova > 0), 'sin enfriamiento');
  assert.equal(JSON.stringify(h.p.hotbar), bar, 'no toca la barra');
  assert.ok(h.g.input.mouseWorld === mw && h.g.input.mouseWorld.equals(mw0), 'no toca la mira');
  assert.deepEqual(h.p.skState.vx90_nova.echo, { seq: 4, n: 2 }, 'no toca la serie de repeticiones del jugador');
  assert.equal(SPY.cast.length, casts, 'una repetición no dispara ⑦ onCast');
  // mult: la mitad del golpe completo
  const half = lost(far);
  h.g.castEcho(h.p, 'vx90_nova', { origin: { x: 10, z: 0 } });
  assert.ok(Math.abs((lost(far) - half) / half - 2) < 0.01, 'mult 0,5 = la mitad');
  // su propia serie: tope echoCap dentro de ella; sin serie, cada llamada abre la suya
  const series = { n: 0 };
  const okN = [0, 1, 2, 3].map(() => !!h.g.castEcho(h.p, 'vx90_nova', { series, origin: { x: 10, z: 0 } }));
  assert.deepEqual(okN, [true, true, true, false], 'en una serie, como mucho 3');
  assert.equal(series.n, 3);
  assert.ok([0, 1, 2, 3, 4].every(() => !!h.g.castEcho(h.p, 'vx90_nova', { origin: { x: 10, z: 0 } })), 'sin serie, cada una aparte');
  // at: mira propia (acotada al alcance de la habilidad)
  const t = h.enemy({ hp: 1e7, pos: [6, 0, 6] });
  assert.ok(h.g.castEcho(h.p, 'vx90_bola', { at: { x: 6, z: 6 } }) && lost(t) > 0, 'at: cae donde dice, no en la mira');
  const edge = h.enemy({ hp: 1e7, pos: [0, 0, 12] }), beyond = h.enemy({ hp: 1e7, pos: [0, 0, 30] });
  h.g.castEcho(h.p, 'vx90_bola', { at: { x: 0, z: 30 } });
  assert.ok(lost(edge) > 0 && lost(beyond) === 0, 'at acotado al alcance (12 m)');
  // una línea sale del origen
  const lane = h.enemy({ hp: 1e7, pos: [5, 0, -8] });
  h.g.castEcho(h.p, 'vx90_rayo', { origin: { x: 0, z: -8 }, at: { x: 9, z: -8 } });
  assert.ok(hitsOn(log, lane, x => x.skill === 'vx90_rayo').length === 1, 'origin: la línea sale de ahí');
  // la firma de castEchoOf (Arquera): (p, id, mult, { at })
  const t2 = h.enemy({ hp: 1e7, pos: [-6, 0, 6] });
  assert.ok(h.g.castEcho(h.p, 'vx90_bola', 1, { at: { x: -6, z: 6 } }) && lost(t2) > 0, 'firma (p, id, mult, { at })');
  // lo que no se repite
  assert.ok(h.g.castEcho(h.p, 'no_existe') === null, 'habilidad desconocida');
  assert.ok(h.g.castEcho(h.p, 'vx90_ajeno') === null, 'habilidad que no conoces');
  assert.ok(h.g.castEcho(h.p, 'vx90_nova', { mult: 0 }) === null, 'mult 0');
  h.setSlot('k2', 'vx90_canal'); h.aim(1, 0);
  assert.equal(h.cast('k2'), true);
  const ch = h.g._channel;
  assert.ok(h.g.castEcho(h.p, 'vx90_carrera') === null, 'un canal no se repite mientras canalizas');
  assert.ok(h.g._channel === ch, 'tu canal sigue');
  // una canalización no se repite NUNCA: el canal es del héroe (ranura, castLock, freno, drenaje)
  const q = mk('maga');
  q.enemy({ hp: 1e7, pos: [3, 0, 0] }); q.aim(3, 0);
  assert.ok(q.g.castEcho(q.p, 'vx90_canal') === null, 'sin canal en curso, tampoco');
  assert.ok(!q.g._channel && !(q.p.castLock > 0) && !q.p.moveMuls?.channel, 'no ocupa tu canal ni te bloquea');
  q.setSlot('rmb', 'vx90_rayo');
  assert.equal(q.cast('rmb'), true, 'y puedes lanzar al momento');
  // solo el héroe, vivo y en partida
  assert.ok(q.g.castEcho(mk('maga').p, 'vx90_nova') === null, 'otro héroe (el de otra partida): null');
  q.g.state = 'menu';
  assert.ok(q.g.castEcho(q.p, 'vx90_nova') === null, 'fuera de la partida: null');
  q.g.state = 'play';
  q.p.alive = false;
  assert.ok(q.g.castEcho(q.p, 'vx90_nova') === null, 'muerto: null');
  q.p.alive = true;
  assert.ok(q.g.castEcho(q.p, 'vx90_nova'), 'y en partida, sí');
  // un poder que repite desde CADA golpe de la repetición (sin mirar hit.echo) no se queda en
  // bucle: la anidada hereda la serie (3 por cadena aunque cada Nova toque a dos) y, con serie
  // propia en cada llamada, la profundidad la frena en echoCap niveles
  for (const [fresh, want] of [[false, 6], [true, 3]]) {
    const r = mk('maga');
    r.addPowers('vx90_eco_loco');
    r.enemy({ hp: 1e9, pos: [1, 0, 0] });
    if (!fresh) r.enemy({ hp: 1e9, pos: [1, 0, 1] });
    Object.assign(ECO, { on: true, fresh, n: 0 });
    r.setSlot('rmb', 'vx90_nova');
    assert.equal(r.cast('rmb'), true);
    ECO.on = false;
    assert.equal(ECO.n, want, `${fresh ? 'serie propia' : 'serie heredada'}: ${ECO.n} repeticiones`);
    assert.ok(!r.g._echoRun, 'la cadena se cierra');
  }
  console.log('castEcho: repetición gratis con su serie, origin y at, sin tocar barra, mira ni serie del jugador ✓');
}

// ------------------------------------------------ 6) VFX de la variante en _makeCtx
{
  SKILL_FX.vx90_fx = { sfx: 'vx90_base' };
  SKILL_FX.vx90_fx_i = { sfx: 'vx90_var_i' };
  SKILL_FX.vx90_fx2 = { sfx: 'vx90_base2', vars: { ii: { sfx: 'vx90_var_ii' } } };
  const sfxOf = (id, v) => {
    const h = mk('maga');
    if (v) { h.p.skillForge = { [id]: v }; h.p.recompute(); }
    h.setSlot('rmb', id);
    assert.equal(h.cast('rmb'), true);
    return h.g.sfxLog.map(x => x.name).filter(n => n.startsWith('vx90'));
  };
  assert.deepEqual(sfxOf('vx90_fx', null), ['vx90_base'], 'sin variante: el VFX base');
  assert.deepEqual(sfxOf('vx90_fx', 'i'), ['vx90_var_i'], 'variante por id (<id>_i)');
  assert.deepEqual(sfxOf('vx90_fx', 'ii'), ['vx90_base'], 'variante sin entrada propia: el base');
  assert.deepEqual(sfxOf('vx90_fx2', 'ii'), ['vx90_var_ii'], 'variante en vars.ii');
  console.log('VFX: _makeCtx usa skillFxFor (variante forjada) ✓');
}

// ------------------------------------------------ 7) onda, zonePct, @windup, hitDot y trail.dur
{
  // la onda no repite a los del impacto
  const h = mk('guerrero');
  flat(h);
  const log = hitLog(h);
  const a = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] }), b = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  h.aim(8, 0); h.setSlot('rmb', 'vx90_onda');
  assert.equal(h.cast('rmb'), true);
  assert.equal(hitsOn(log, a).length, 1, 'el del impacto: solo el impacto');
  assert.equal(hitsOn(log, b).length, 1, 'el de la línea: la onda');
  assert.ok(Math.abs(lost(b) / lost(a) - 0.6) < 0.01, `la onda al 60 % (${(lost(b) / lost(a)).toFixed(3)})`);
}
{
  // zonePct: % del ARMA por segundo con el rango (sin él, el 45 % del golpe)
  const h = mk('guerrero');
  h.p.talentExtra.mods = { vx90_estela: { zone: 1 }, vx90_estela0: { zone: 1 } };
  h.p.recompute(); flat(h);
  const est = id => { h.p.gcdT = 0; h.setSlot('rmb', id); assert.equal(h.cast('rmb'), true); return h.g.fieldsOf(h.p, { kind: 'estela', skill: id }).at(-1); };
  const pz = prof(h, 'vx90_estela'), p0 = prof(h, 'vx90_estela0');
  assert.equal(pz.zonePct, 40);
  assert.ok(near(est('vx90_estela').data.dps, h.p.avgHit(0.4 * rankCoef(pz.rank), pz.addPct)), 'zonePct 40: 40 % del arma × rango por segundo');
  assert.ok(near(est('vx90_estela0').data.dps, h.p.avgHit(p0.coef, p0.addPct) * 0.45), 'sin zonePct: el 45 % del golpe');
  h.p.talentExtra.mods = { vx90_estela: { zone: 1, zonePct: 10 } }; h.p.recompute(); flat(h);
  assert.equal(prof(h, 'vx90_estela').zonePct, 50, 'el mod zonePct suma');
}
{
  // @windup: los talentos del selector llegan al PASO de combo con preparación (y solo a él)
  const run = mods => {
    const h = mk('guerrero');
    if (mods) { h.p.talentExtra.mods = mods; h.p.recompute(); }
    flat(h);
    const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.aim(1.5, 0); h.setSlot('rmb', 'vx_combo');
    const out = { dmg: [], windup: 0 };
    for (let i = 0; i < 3; i++) {
      const before = lost(e);
      assert.equal(h.cast('rmb'), true);
      if (i === 2) out.windup = h.g._windup?.ctx?.windup || 0;
      h.step(0.7);
      out.dmg.push(lost(e) - before);
    }
    return out;
  };
  const base = run(null), tal = run({ 'vx_combo@windup': { dmg: 40, windupAdd: 0.3 } });
  assert.ok(near(base.windup, 0.3) && near(tal.windup, 0.6), `el 3.er paso tarda 0,3 s más (${base.windup} → ${tal.windup})`);
  assert.ok(tal.dmg[0] === base.dmg[0] && tal.dmg[1] === base.dmg[1], 'los pasos sin preparación no cambian');
  assert.ok(tal.dmg[2] > base.dmg[2] * 1.2, `el paso con preparación hace más (${base.dmg[2]} → ${tal.dmg[2]})`);
}
{
  // @windup con el nodo REAL c9 del Guerrero (Berserker) sobre Rajar: el selector llega al golpe
  // descendente (3.er paso, preparación 0,3 s) y solo a él; la Hendidura (preparación propia) lo
  // recibe por el agregado, como siempre
  const rajar = choice => {
    const h = makeHarness({ classId: 'guerrero', level: 30, spec: 'berserker', talents: choice ? { cls: { c9: 1 }, choice: { c9: choice } } : null });
    flat(h);
    h.p.mp = h.p.stats.maxMP;
    const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.aim(1.5, 0); h.setSlot('rmb', 'g_rajar');
    const out = { dmg: [], windup: 0, addPct: [], hend: prof(h, 'g_hendidura'), mods: prof(h, 'g_rajar').windupMods };
    for (let i = 0; i < 3; i++) {
      const before = lost(e);
      h.p.mp = h.p.stats.maxMP;
      assert.equal(h.cast('rmb'), true, `Rajar, paso ${i + 1}`);
      if (i === 2) { out.windup = h.g._windup?.ctx?.windup || 0; out.addPct = h.g._windup?.ctx?.prof?.addPct; }
      h.step(0.8);
      out.dmg.push(lost(e) - before);
    }
    return out;
  };
  const r0 = rajar(null), rA = rajar('A'), rB = rajar('B');
  assert.ok(r0.mods === null && near(r0.windup, 0.3), `sin c9: el descendente se prepara 0,3 s (${r0.windup})`);
  assert.deepEqual(rA.mods, { windupAdd: 0.3, dmg: 40 }, 'c9 A (Golpe Pesado) llega a Rajar como mods de sus pasos preparados');
  assert.ok(near(rA.windup, 0.6) && near(rA.addPct - r0.addPct, 40), `c9 A: 0,3 → 0,6 s y +40 % (${rA.windup}, +${rA.addPct - r0.addPct})`);
  assert.ok(rA.dmg[0] === r0.dmg[0] && rA.dmg[1] === r0.dmg[1] && rA.dmg[2] > r0.dmg[2] * 1.2, 'solo el paso preparado hace más');
  assert.ok(near(rB.windup, 0.15), `c9 B (Sin Pausa): la mitad (${rB.windup})`);
  assert.ok(near(r0.hend.windup, 0.25) && near(rA.hend.windup, 0.55) && near(rB.hend.windup, 0.125) && rA.hend.windupMods === null,
    'la Hendidura (preparación propia): por el agregado, sin windupMods');
}
{
  // también los árboles de especialización y héroe (nodos sintéticos gratis en los árboles reales,
  // quitados al acabar): el héroe solo con el Paragon abierto, con la opción escogida (o la A)
  const spec = findSpec('guerrero', 'berserker'), hero = heroTreesFor('guerrero', 'berserker')[0];
  const add = (level, extra = {}) => prof(makeHarness({ classId: 'guerrero', level, spec: 'berserker', ...extra }), 'g_rajar').windupMods?.windupAdd || 0;
  const heroB = { hero: { berserker: { choice: { [hero.id]: { vx90_hw: 'B' } } } } };
  const b30 = add(30), b100 = add(100, { build: true });
  const sNode = { id: 'vx90_bw', name: 'prueba', t: 'p', r: 0, c: 0, max: 1, free: true, fx: { mod: { '@windup': { windupAdd: 0.1 } } } };
  const hNode = { id: 'vx90_hw', name: 'prueba', t: 'c', r: 0, c: 0, max: 1, free: true, opts: [
    { k: 'A', name: 'A', desc: '', fx: { mod: { '@windup': { windupAdd: 0.02 } } } },
    { k: 'B', name: 'B', desc: '', fx: { mod: { '@windup': { windupAdd: 0.04 } } } }] };
  spec.nodes.push(sNode); hero.nodes.push(hNode);
  try {
    assert.ok(near(add(30) - b30, 0.1), 'nodo de la especialización; con el Paragon cerrado, el del héroe no cuenta');
    assert.ok(near(add(100, { build: true }) - b100, 0.12), 'con el Paragon abierto, también el del héroe (opción A)');
    assert.ok(near(add(100, { build: true, talents: heroB }) - b100, 0.14), 'la opción B del héroe');
  } finally {
    spec.nodes.splice(spec.nodes.indexOf(sNode), 1);
    hero.nodes.splice(hero.nodes.indexOf(hNode), 1);
  }
}
{
  // hitDot con los talentos de DoT (dotPct, <tipo>Pct, dotDur, bleedDur): más daño y más tics
  const dot = (id, tv) => {
    const h = mk('guerrero');
    if (tv) { h.p.talentExtra.tv = tv; h.p.recompute(); }
    flat(h);
    const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
    h.aim(1.5, 0); h.setSlot('rmb', id);
    assert.equal(h.cast('rmb'), true);
    return { prof: prof(h, id), dot: h.g.dotsOf(e)[0] };
  };
  const b0 = dot('vx90_sangra'), b1 = dot('vx90_sangra', { bleedDur: 1, bleedPct: 25 });
  assert.ok(near(b0.prof.hitDot.dur, 3) && b0.dot.ticks === 6, 'sin talentos: 3 s (6 tics)');
  assert.ok(near(b1.prof.hitDot.dur, 4) && b1.dot.ticks === 8, 'bleedDur +1: 4 s (8 tics)');
  assert.ok(near(b1.prof.hitDot.coef / b0.prof.hitDot.coef, 1.25 * 4 / 3), '+25 % y la misma potencia por segundo durante 1 s más');
  const p0 = dot('vx90_veneno'), p1 = dot('vx90_veneno', { dotPct: 20, dotDur: 2, bleedDur: 5 });
  assert.ok(near(p1.prof.hitDot.dur, 6) && near(p1.prof.hitDot.coef / p0.prof.hitDot.coef, 1.2 * 6 / 4), 'veneno: dotPct y dotDur (bleedDur no)');
  assert.ok(p1.dot.total > p0.dot.total * 1.7, 'y el DoT aplicado lo refleja');
  const q0 = dot('vx90_quema'), q1 = dot('vx90_quema', { burnDur: 2, burnPct: 10, bleedDur: 5, poisonPct: 50 });
  assert.ok(near(q1.prof.hitDot.dur, 6) && near(q1.prof.hitDot.coef / q0.prof.hitDot.coef, 1.1 * 6 / 4), 'quemadura: burnPct y burnDur (bleedDur y poisonPct no)');
  assert.ok(q1.dot.ticks === 12 && q0.dot.ticks === 8, 'y sus tics (8 → 12)');
}
{
  // trail.dur con zoneDur (suma segundos)
  const len = mods => {
    const h = mk('guerrero');
    if (mods) { h.p.talentExtra.mods = mods; h.p.recompute(); }
    h.aim(6, 0); h.setSlot('k1', 'vx_sendero');
    assert.equal(h.cast('k1'), true);
    return h.g.fieldsOf(h.p, { kind: 'zona', skill: 'vx_sendero' })[0].dur;
  };
  assert.ok(near(len(null), 3) && near(len({ vx_sendero: { zoneDur: 2 } }), 5), 'la estela del avance: 3 s → 5 s con zoneDur +2');
  console.log('Onda sin repetir, zonePct, @windup en pasos de combo (c9 real sobre Rajar), hitDot con talentos de DoT y trail.dur ✓');
}

// ------------------------------------------------ 8) los tics de startChannel no derivan
{
  const measure = (fps, stats = null) => {
    const h = mk('guerrero');
    if (stats) pin(h, stats);
    h.setSlot('rmb', 'vx90_carrera');
    const t0 = h.g.timers.now;
    assert.equal(h.cast('rmb'), true);
    const inst = h.g._channel;
    let t = 0;
    for (let i = 0; i < fps * 6 && h.g._channel; i++) { h.g.step(1 / fps); t = h.g.timers.now - t0; }
    return { t, ticks: inst.tickN, interval: inst.interval };
  };
  for (const fps of [30, 60, 144]) {
    const { t, ticks } = measure(fps);
    assert.equal(ticks, 20, `${fps} fps: 20 tics`);
    assert.ok(t >= 4 - 1e-6 && t <= 4 + 1 / fps + 1e-6, `${fps} fps: dura 4 s (${t.toFixed(4)})`);
  }
  console.log('Canal: 4 s y 20 tics a 30, 60 y 144 fps (sin deriva) ✓');
}

// ------------------------------------------------ 9) detonar al final del vuelo
{
  // trampas propias (vx_mina: se arma en 0,2 s) puestas a mano donde haga falta
  const trapAt = (h, x, z) => { h.p.gcdT = 0; h.setSlot('k2', 'vx_mina'); h.aim(x, z); assert.equal(h.cast('k2'), true); return h.g.fieldsOf(h.p, { kind: 'trampa' }).at(-1); };
  // un proyectil que perfora (vx_detonante, 14 m) sin nadie: detona donde acaba su vuelo
  const h = mk('arquera');
  const t = trapAt(h, 12, 0);
  assert.ok(t.data.rank === prof(h, 'vx_mina').rank && t.data.rank > 1, 'la trampa lleva el rango (para escalar su estallido)');
  h.step(0.3);
  h.aim(14, 0); h.setSlot('rmb', 'vx_detonante');
  assert.equal(h.cast('rmb'), true);
  h.step(0.8);
  assert.ok(t.dead && (h.p.trapBursts || []).length === 1, 'sin enemigos: detona tus trampas al final del alcance');
  // uno que no perfora y choca: detona en el impacto, no al final
  const n = mk('arquera');
  n.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const tNear = trapAt(n, 6.5, 0), tEnd = trapAt(n, 11.5, 0);
  n.step(0.3);
  n.aim(12, 0); n.setSlot('rmb', 'vx90_det');
  assert.equal(n.cast('rmb'), true);
  n.step(0.8);
  assert.ok(tNear.dead && !tEnd.dead, 'chocó: detona junto al enemigo, no al final del alcance');
  // contra una pared: detona donde la pared lo para
  const w = mk('arquera');
  const tWall = trapAt(w, 7.5, 0);
  w.step(0.3);
  w.g.world.grid.walkable = x => x < 8;
  w.aim(12, 0); w.setSlot('rmb', 'vx90_det');
  assert.equal(w.cast('rmb'), true);
  w.step(0.8);
  assert.ok(tWall.dead, 'la pared: detona donde acaba el vuelo');
  // detonate.coef × rankCoef del rango de la habilidad (una vez)
  const coefAt = level => {
    const c = mk('arquera', { level });
    const seen = [];
    const da = c.g.detonateAt;
    c.g.detonateAt = function (owner, pos, det, o) { seen.push(det.coef); return da.call(this, owner, pos, det, o); };
    c.aim(12, 0); c.setSlot('rmb', 'vx90_det');
    assert.equal(c.cast('rmb'), true);
    c.step(0.8);
    return { seen, rank: prof(c, 'vx90_det').rank, coef: prof(c, 'vx90_det').detonate?.coef };
  };
  const lo = coefAt(1), hi = coefAt(30);
  assert.ok(lo.coef === 1 && near(hi.coef, rankCoef(hi.rank)) && hi.rank > 1, `prof.detonate.coef escala con el rango (${hi.coef})`);
  assert.deepEqual(hi.seen, [hi.coef], 'detonateAt recibe el coef ya escalado');
  console.log('Detonar: al final del vuelo (alcance o pared), no si choca; coef × rankCoef ✓');
}

// ------------------------------------------------ 10) startCooldown, channelInfo y extendMark
{
  const h = mk('guerrero');
  h.setSlot('k2', 'vx90_piel');
  assert.equal(h.cast('k2'), true);
  assert.ok(near(h.p.cds.vx90_piel, 14) && h.p._cdHold?.vx90_piel > 0, 'cdOnEnd: la recarga espera al efecto');
  assert.equal(h.g.startCooldown(h.p, 'vx90_piel', 15), true);
  assert.ok(near(h.p.cds.vx90_piel, 15) && near(h.p.cdMax.vx90_piel, 15), 'la ranura muestra la recarga real (15 s)');
  assert.ok(!h.p._cdHold?.vx90_piel, 'sustituye a la que esperaba al efecto');
  assert.ok(near(h.g.reduceCooldown(h.p, 'vx90_piel', 5), 5) && near(h.p.cds.vx90_piel, 10), 'y se puede reducir');
  // con cargas: gasta una y la siguiente llega en s
  h.setSlot('k1', 'vx_paso');
  assert.equal(h.g.startCooldown(h.p, 'vx_paso', 2), true);
  assert.equal(h.p.skCharges?.vx_paso?.n, 2, 'gasta una carga');
  h.step(1.9);
  assert.equal(h.g._syncCharges(h.p, 'vx_paso').n, 2);
  h.step(0.2);
  assert.equal(h.g._syncCharges(h.p, 'vx_paso').n, 3, 'la siguiente llega a los 2 s');
  assert.ok([[h.p, 'vx90_piel', 0], [h.p, 'vx90_piel', -1], [h.p, 'vx90_piel', Infinity], [h.p, 'no_existe', 3]].every(a => h.g.startCooldown(...a) === false), 'valores inválidos: false');
}
{
  const h = mk('guerrero');
  assert.equal(h.g.channelInfo(), null, 'sin canal: null');
  h.setSlot('rmb', 'vx90_carrera');
  assert.equal(h.cast('rmb'), true);
  h.step(1);
  let ci = h.g.channelInfo();
  assert.ok(ci && ci.id === 'vx90_carrera' && ci.key === 'rmb' && ci.p === h.p, 'id, ranura y quién canaliza');
  assert.ok(near(ci?.t, 1, 0.02) && near(ci?.dur, 4) && near(ci?.left, 3, 0.02) && ci?.ticks === 5, `t ${ci?.t}, dur ${ci?.dur}, left ${ci?.left}, tics ${ci?.ticks}`);
  assert.ok(ci && !ci.hold && !ci.toggle && !ci.endless, 'hold:false');
  h.g.extendChannel(h.p, 1);
  ci = h.g.channelInfo();
  assert.ok(near(ci?.dur, 5), 'extendChannel alarga dur');
  const tg = mk('maga');
  tg.setSlot('rmb', 'vx_rayo');
  tg.enemy({ hp: 1e7, pos: [3, 0, 0] }); tg.aim(3, 0);
  assert.equal(tg.cast('rmb'), true);
  assert.ok(tg.g.channelInfo()?.toggle && !tg.g.channelInfo()?.hold, 'toggle');
}
{
  const h = mk('guerrero');
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] });
  h.aim(3, 0); h.setSlot('k2', 'vx_sentencia');
  assert.equal(h.cast('k2'), true);
  h.step(2);
  const t0 = e.marks.vx_sentencia.t;
  const m = h.g.extendMark(e, 'vx_sentencia', { mul: 2 });
  assert.ok(m && near(m.t, 2 * t0) && near(e.debuffs['mark:vx_sentencia'].t, 2 * t0), 'mul 2: la marca y su Debilidad duran el doble');
  h.g.extendMark(e, 'vx_sentencia', { add: 1 });
  assert.ok(near(e.marks.vx_sentencia.t, 2 * t0 + 1), 'add +1 s');
  assert.ok(e.debuffs['mark:vx_sentencia']?.t > 0, 'con su Debilidad viva');
  assert.ok(h.g.extendMark(e, 'vx_sentencia', { add: -100 }) === null, 'llevarla a 0 la quita');
  assert.ok(!e.marks.vx_sentencia && !e.debuffs['mark:vx_sentencia'], '…y también su Debilidad');
  assert.ok(h.g.extendMark(e, 'no_hay') === null, 'sin marca: null');
  console.log('APIs: startCooldown (también con cargas y cdOnEnd), channelInfo y extendMark ✓');
}

// ------------------------------------------------ 11) clampWalkable, arrastre, slowImmune y atracción
{
  const h = mk('guerrero');
  assert.ok(near(h.g.clampWalkable(v3(0, 0), v3(8, 0), 8).x, 8), 'clampWalkable llega a los 8 m');
  assert.ok(near(h.g.clampWalkable(v3(0, 0), v3(20, 0), 8).x, 8), 'acotado a maxD');
  assert.ok(near(h.g.clampWalkable(v3(0, 0), v3(8.1, 0), 8.1).x, 8.1), 'un tramo final que no es múltiplo de 0,3');
  const grid = h.g.world.grid.walkable;
  h.g.world.grid.walkable = x => x < 5;
  assert.ok(near(h.g.clampWalkable(v3(0, 0), v3(8, 0), 8).x, 4.8), 'se para antes de lo intransitable');
  h.g.world.grid.walkable = grid;
  h.aim(8, 0); h.setSlot('k1', 'vx90_salto');
  assert.equal(h.cast('k1'), true);
  h.step(1);
  assert.ok(near(h.p.pos.x, 8, 1e-3), `un salto de 8 m cae a 8 m (${h.p.pos.x})`);
}
{
  // un dragWidth de talento no enciende el arrastre de una definición que no arrastra
  const h = mk('guerrero');
  h.p.talentExtra.mods = { vx90_veloz: { dragWidth: 3 }, vx90_arrastre: { dragWidth: 4 }, vx_carga: { dragWidth: 2 } };
  h.p.recompute();
  assert.equal(prof(h, 'vx90_veloz').dragWidth, 0, 'drag:false + dragWidth de talento: no arrastra');
  assert.equal(prof(h, 'vx90_arrastre').dragWidth, 4, 'la que arrastra: el máximo');
  assert.equal(prof(h, 'vx_carga').dragWidth, 2, 'drag:true (1,5) + talento 2');
  // los arrastrados quedan dentro del golpe de llegada
  const d = mk('guerrero');
  flat(d);
  const e = d.enemy({ hp: 1e7, pos: [2, 0, 3] });
  d.aim(6, 0); d.setSlot('k1', 'vx90_arrastre');
  assert.equal(d.cast('k1'), true);
  assert.ok(e.pos.x > 5, 'lo arrastra');
  // (lo junta a 0,8 × el radio; el golpe de llegada lo empuja un poco)
  assert.ok(e.pos.distanceTo(d.p.pos) <= 1.9, `al llegar lo junta dentro del radio del golpe (${e.pos.distanceTo(d.p.pos).toFixed(2)} m)`);
  assert.ok(lost(e) > 0, 'y recibe el golpe de llegada');
}
{
  // slowImmune del canal: mientras gira no lo ralentizan; al acabar, sí
  const h = mk('guerrero');
  h.setSlot('rmb', 'vx90_ciclon');
  assert.equal(h.cast('rmb'), true);
  h.step(0.4);
  assert.equal(h.p.applySlow(2), false, 'girando: inmune a ralentizaciones');
  h.step(1);
  assert.ok(!h.g._channel);
  assert.equal(h.p.applySlow(2), true, 'acabado el giro, ya no');
  const n = mk('guerrero');
  n.setSlot('rmb', 'vx90_ciclon0');
  assert.equal(n.cast('rmb'), true);
  n.step(0.4);
  assert.equal(n.p.applySlow(2), true, 'sin slowImmune: lo ralentizan');
}
{
  // pull.radius: atrae a otro radio que el del daño · pull.boss:false deja a los jefes
  const h = mk('guerrero');
  const mob = h.enemy({ hp: 1e7, pos: [4, 0, 0] }), boss = h.enemy({ hp: 1e7, pos: [0, 0, 4], boss: true });
  h.setSlot('rmb', 'vx90_ciclon');
  assert.equal(h.cast('rmb'), true);
  h.step(1.2);
  assert.ok(mob.pos.x < 3.5, `atrae a 5 m aunque el daño sea a 2 m (${mob.pos.x.toFixed(2)})`);
  assert.ok(near(boss.pos.z, 4) && !(boss.stagger > 0), 'pull.boss:false: al jefe ni lo mueve ni le llena Quebranto');
  // sin boss:false, el tirón a un jefe le llena Quebranto (como cualquier desplazamiento)
  const j = mk('guerrero');
  const boss2 = j.enemy({ hp: 1e7, pos: [0, 0, 4], boss: true });
  j.setSlot('rmb', 'vx90_ciclon_jefes');
  assert.equal(j.cast('rmb'), true);
  j.step(1.2);
  assert.ok(boss2.stagger > 0, `sin boss:false, al jefe sí (${boss2.stagger})`);
  // sin radio propio: el del daño, como siempre (a 4 m no llega)
  const o = mk('guerrero');
  const far = o.enemy({ hp: 1e7, pos: [4, 0, 0] });
  o.setSlot('rmb', 'vx90_ciclon0');
  assert.equal(o.cast('rmb'), true);
  o.step(1.2);
  assert.ok(near(far.pos.x, 4, 1e-3), 'pull sin radius: solo dentro del radio del daño');
  // pull.boss:false también al GOLPEAR (no solo por tic de canal): atrae al resto, al jefe no
  const a = mk('guerrero');
  const amob = a.enemy({ hp: 1e7, pos: [4, 0, 0] }), aboss = a.enemy({ hp: 1e7, pos: [0, 0, 4], boss: true });
  a.setSlot('rmb', 'vx90_arpon');
  assert.equal(a.cast('rmb'), true);
  assert.ok(amob.pos.x < 3 && lost(aboss) > 0, `al golpear atrae al resto (${amob.pos.x.toFixed(2)}) y al jefe le pega`);
  // (el daño le llena una pizca de Quebranto; el tirón, 15)
  assert.ok(near(aboss.pos.z, 4) && aboss.stagger < 0.01, `al jefe ni lo mueve ni le llena Quebranto con el tirón (${aboss.stagger})`);
  const t = mk('guerrero');
  const tboss = t.enemy({ hp: 1e7, pos: [0, 0, 4], boss: true });
  t.setSlot('rmb', 'vx_tiron');
  assert.equal(t.cast('rmb'), true);
  assert.ok(tboss.stagger >= 10, `sin boss:false, el tirón le llena Quebranto (${tboss.stagger})`);
  console.log('clampWalkable entero, dragWidth sin drag, arrastre que junta, slowImmune, pull.radius del canal y pull.boss ✓');
}

// ------------------------------------------------ 12) stat skillSpeedPct
{
  const h = mk('guerrero');
  pin(h, { skillSpeedPct: 25 });
  assert.ok(near(prof(h, 'vx_mandoble').windup, 0.4 / 1.25), 'preparación ÷ 1,25');
  assert.equal(prof(h, 'vx_verdugo').cd, prof(mk('guerrero'), 'vx_verdugo').cd, 'el enfriamiento no cambia');
  // paso de combo con preparación
  const e = h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_combo');
  for (let i = 0; i < 2; i++) { h.cast('rmb'); h.step(0.4); }
  h.cast('rmb');
  assert.ok(near(h.g._windup?.ctx?.windup, 0.3 / 1.25), 'el paso con preparación, también');
  h.step(1);
  void e;
  // salto y avance lento, más cortos
  const j = mk('guerrero');
  pin(j, { skillSpeedPct: 25 });
  j.aim(8, 0); j.setSlot('k1', 'vx90_salto');
  assert.equal(j.cast('k1'), true);
  assert.ok(near(j.p.leap.dur, 0.5 / 1.25), 'vuelo del salto ÷ 1,25');
  const c = mk('guerrero');
  pin(c, { skillSpeedPct: 25 });
  c.aim(8, 0); c.setSlot('k1', 'vx_carga');
  assert.equal(c.cast('k1'), true);
  assert.ok(near(c.p.dashMove.dur, 1 / 1.25), 'avance lento ÷ 1,25');
  // canal: tic más corto y más tics en la misma duración (también sin deriva)
  const f = mk('guerrero');
  pin(f, { skillSpeedPct: 25 });
  f.setSlot('rmb', 'vx90_carrera');
  const t0 = f.g.timers.now;
  assert.equal(f.cast('rmb'), true);
  const inst = f.g._channel;
  assert.ok(near(inst.interval, 0.2 / 1.25), 'tic ÷ 1,25');
  while (f.g._channel) f.g.step(DT);
  assert.ok(inst.tickN === 25 && Math.abs(f.g.timers.now - t0 - 4) <= DT + 1e-6, `25 tics en 4 s (${inst.tickN}, ${(f.g.timers.now - t0).toFixed(3)})`);
  // sin la stat, todo como siempre
  const z = mk('guerrero');
  assert.ok(near(prof(z, 'vx_mandoble').windup, 0.4) && prof(z, 'vx_mandoble').skillSpeed === 1, 'sin skillSpeedPct: ×1');
  console.log('skillSpeedPct: preparación, pasos de combo, saltos, avances y tics de canal (no enfriamientos) ✓');
}

console.log('\n✅ COLA W2d-A (canal de lanzamiento y perfil de habilidad) OK');
