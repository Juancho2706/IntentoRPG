// ============================================================
// Test 84 — MOVIMIENTO y CONTROL del Paso 2 (docs/paso2-implementacion.md §3.6, §3.7, D20)
// ============================================================
//  1) moveMul: preparación con movimiento, Π de multiplicadores, 0 = quieto, con duración
//  2) plantado: 1 s sin caminar; caminar o usar movilidad lo rompe; keepPlanted (Sin Pausa)
//  3) desplazar: atraer/empujar acotado, rendimientos decrecientes, élites ×0,6, jefes →
//     Quebranto (combat-math), no atraviesa muros
//  4) minHpPct / endHealPct (Furia Inmortal): suelo de vida salvo golpes unavoidable
//  5) rendimiento: recompute no rehace la definición forjada ni los stats de postura
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { DISPLACE_DR, staggerFromDisplace, STAGGER_PER_DISPLACE_M } from '../js/combat-math.js';
import { VERB_DEFAULTS } from '../js/skill-defs.js';
import { forgedDef, resolveSkillId } from '../js/skill-resolve.js';
import { dotProfile } from '../js/combat-math.js';
import { firePower } from '../js/powers.js';
import { resourceDefFor, resourceRegenRate, gainResource } from '../js/resources.js';
import { verbHarness } from './fixtures/skills-verbs-sample.mjs';
import * as T from '../js/talents.js';

const DT = 1 / 60;
const mk = (classId = 'guerrero', opts = {}) => verbHarness(classId, { level: 30, ...opts });
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;

// ------------------------------------------------ 1) moveMul
{
  const h = mk();
  h.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  h.aim(1.5, 0); h.setSlot('rmb', 'vx_mandoble');
  // referencia: 0,3 s caminando sin nada
  const x0 = h.p.pos.z;
  h.walk({ x: 0, z: 1 }, 0.3);
  const free = h.p.pos.z - x0;
  h.p.pos.set(0, 0, 0);
  assert.equal(h.press('rmb'), true); h.release('rmb');
  assert.ok(near(h.p.moveMulProduct(), 0.5), 'preparando: moveMul 0,5');
  h.walk({ x: 0, z: 1 }, 0.3);
  const slow = h.p.pos.z;
  assert.ok(near(slow / free, 0.5, 0.06), `te mueves al 50 % mientras preparas (${(slow / free).toFixed(3)})`);
  h.step(0.2);
  assert.ok(near(h.p.moveMulProduct(), 1), 'acaba la preparación: velocidad normal');
  // Π y quieto
  h.p.setMoveMul('a', 0.5); h.p.setMoveMul('b', 0.8);
  assert.ok(near(h.p.moveMulProduct(), 0.4), 'Π de multiplicadores');
  h.p.setMoveMul('c', 0);
  const z0 = h.p.pos.z;
  h.walk({ x: 0, z: 1 }, 0.2);
  assert.ok(near(h.p.pos.z, z0) && !h.p.moving, 'moveMul 0: quieto');
  h.p.clearMoveMul('a'); h.p.clearMoveMul('b'); h.p.clearMoveMul('c');
  h.p.setMoveMul('d', 0.5, 0.25);
  h.step(0.3);
  assert.ok(near(h.p.moveMulProduct(), 1), 'con duración: caduca solo');
  console.log('moveMul: preparación, Π, quieto, duración ✓');
}

// ------------------------------------------------ 2) plantado (D20)
{
  const h = mk();
  h.stand(VERB_DEFAULTS.plantedAfter - 0.1);
  assert.ok(!h.p.planted, 'aún no');
  h.stand(0.15);
  assert.ok(h.p.planted, `plantado tras ${VERB_DEFAULTS.plantedAfter} s quieto`);
  h.walk({ x: 1, z: 0 }, DT * 2);
  assert.ok(!h.p.planted && h.p.plantedT < 0.05, 'caminar lo rompe');
  h.stand(1.1);
  assert.ok(h.p.planted);
  h.setSlot('k1', 'vx_paso'); h.aim(3, 0);
  h.press('k1'); h.release('k1');
  assert.ok(!h.p.planted, 'usar la movilidad lo rompe');
  // keepPlanted (Sin Pausa): una preparación con la clave deja caminar sin romperlo
  const k = mk('guerrero', { forge: { vx_mandoble: { mejora: { name: 'Sin Pausa', line: 'x', mod: { keepPlanted: true } } } } });
  k.enemy({ hp: 1e7, pos: [1.5, 0, 0] });
  k.aim(1.5, 0); k.setSlot('rmb', 'vx_mandoble');
  k.stand(1.1);
  assert.ok(k.p.planted);
  k.press('rmb'); k.release('rmb');
  k.walk({ x: 0, z: 1 }, 0.3);
  assert.ok(k.p.planted, 'keepPlanted: preparando y caminando sigue plantado');
  k.step(0.2);
  k.walk({ x: 0, z: 1 }, 0.1);
  assert.ok(!k.p.planted, 'sin preparación, caminar lo rompe');
  console.log('Plantado: 1 s, caminar/movilidad lo rompen, keepPlanted ✓');
}

// ------------------------------------------------ 3) desplazar
{
  const h = mk();
  const p = h.p;
  const e = h.enemy({ hp: 1e7, pos: [5, 0, 0] });
  const moved = e.displace(p.pos, 3, { toward: true, src: p });
  assert.ok(near(moved, 3, 1e-6) && near(e.pos.x, 2), `atraer 3 m (${e.pos.x})`);
  assert.ok(near(e.dispDR, DISPLACE_DR.add), 'suma resistencia');
  const m2 = e.displace(p.pos, 3, { toward: true, src: p });
  assert.ok(near(m2, Math.min(3 * (1 - DISPLACE_DR.add), 2 - 0.8), 1e-6), `atraer acota a 0,8 m de ti y decrece (${m2})`);
  e.pos.set(5, 0, 0);
  const k1 = e.displace(p.pos, 2, { src: p });
  assert.ok(near(k1, 2 * (1 - 2 * DISPLACE_DR.add), 1e-6), `empujar con rendimientos decrecientes (${k1})`);
  e.tickStun(10);
  assert.equal(e.dispDR, 0, 'la resistencia decae');
  e.dispDR = 0.95;
  assert.equal(e.displace(p.pos, 3, { src: p }), 0, 'inmune con ≥ 0,9');
  // élite ×0,6
  const el = h.enemy({ hp: 1e7, rank: 'elite', pos: [0, 0, 5] });
  assert.ok(near(el.displace(p.pos, 2, { src: p }), 1.2, 1e-6), 'élites: ×0,6');
  // jefe: no se mueve, llena Quebranto
  const b = h.enemy({ hp: 1e7, boss: true, pos: [0, 0, -5] });
  const bz = b.pos.z;
  assert.equal(b.displace(p.pos, 2, { src: p }), 0);
  assert.ok(near(b.pos.z, bz) && near(b.stagger, staggerFromDisplace(2)) && near(staggerFromDisplace(2), 2 * STAGGER_PER_DISPLACE_M), `jefe: Quebranto ${b.stagger}`);
  // no atraviesa paredes (casilla no transitable a x < 3)
  h.g.world.grid = { walkable: (x) => x >= 3, lineOfSight: () => true };
  const w = h.enemy({ hp: 1e7, pos: [6, 0, 3] });
  w.displace(new THREE.Vector3(10, 0, 3), 6, { src: p });
  assert.ok(w.pos.x >= 3 - 1e-9 && w.pos.x < 3.5, `se para contra la pared (${w.pos.x.toFixed(2)})`);
  h.g.world.grid = { walkable: () => true, lineOfSight: () => true };
  // por la habilidad: vx_tiron atrae a los del radio hacia ti, vx_empuje los aleja
  const t = mk();
  const a1 = t.enemy({ hp: 1e7, pos: [5, 0, 0] });
  t.setSlot('rmb', 'vx_tiron'); t.press('rmb'); t.release('rmb');
  // (el golpe además lo sacude unos centímetros: retroceso de impacto de Enemy.takeDamage)
  assert.ok(a1.pos.x > 1.8 && a1.pos.x < 2.4, `Tirón: atrae 3 m (${a1.pos.x.toFixed(2)})`);
  t.step(0.3);
  t.setSlot('rmb', 'vx_empuje'); a1.dispDR = 0;
  t.press('rmb'); t.release('rmb');
  assert.ok(a1.pos.x > 4.7 && a1.pos.x < 5.6, `Empuje: aleja 3 m (${a1.pos.x.toFixed(2)})`);
  console.log('Desplazar: acotado, DR, élites ×0,6, jefes → Quebranto, paredes ✓');
}

// ------------------------------------------------ 4) vida mínima y cura al acabar
{
  const h = mk();
  const p = h.p;
  h.setSlot('k2', 'vx_inmortal');
  assert.equal(h.press('k2'), true); h.release('k2');
  assert.equal(p.minHpFloor(), p.stats.maxHP * 0.2, 'minHpPct 20 (no escala con el rango)');
  p.hp = p.stats.maxHP * 0.5;
  p.takeDamage(p.stats.maxHP * 5, 1);
  assert.ok(near(p.hp, p.stats.maxHP * 0.2, 1) && p.alive, `no baja del 20 % (${p.hp})`);
  p.takeDamage(p.stats.maxHP * 5, 1, { unavoidable: true });
  assert.ok(p.hp < p.stats.maxHP * 0.2, 'un golpe unavoidable sí');
  // cura al acabar (endHealPct 10)
  const q = mk();
  q.setSlot('k2', 'vx_inmortal');
  q.press('k2'); q.release('k2');
  q.p.hp = q.p.stats.maxHP * 0.3;
  q.step(3.9);
  const before = q.p.hp;
  q.step(0.2);
  const gained = q.p.hp - before;
  assert.ok(gained >= q.p.stats.maxHP * 0.1 - 1, `al acabar cura un 10 % (${gained.toFixed(1)})`);
  console.log('minHpPct (unavoidable lo ignora) y endHealPct ✓');
}

// ------------------------------------------------ 5) recompute: cachés de forja y de postura
{
  const forge = { vx_corazon: { mejora: { name: 'x', line: 'x', add: { radius: 1 } } } };
  const h = mk('guerrero', { forge });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_corazon');
  // la definición forjada se calcula una vez y se reutiliza entre recompute (caché p.forged)
  const f1 = forgedDef(h.p, sk);
  for (let i = 0; i < 1000; i++) h.p.recompute();
  const f2 = forgedDef(h.p, sk);
  assert.equal(f1, f2, 'mil recompute sin cambios: la misma definición forjada (no se rehace)');
  assert.equal(f1.radius, 5, 'Mejora aplicada (radio 4 + 1)');
  h.p.level = 2; h.p.recompute();          // por debajo de req+3: sin Mejora
  assert.equal(forgedDef(h.p, sk), sk, 'bajo el nivel de la Mejora: la definición base');
  h.p.level = 30; h.p.recompute();
  assert.equal(forgedDef(h.p, sk).radius, 5);
  // stats de postura: caché hasta el cambio de modo (sin recompute)
  h.setSlot('k2', 'vx_guardia');
  h.press('k2'); h.release('k2');
  const vs = h.p.verbStats();
  assert.equal(h.p.verbStats(), vs, 'verbStats en caché');
  h.step(1.1); h.press('k2'); h.release('k2');
  assert.notEqual(h.p.verbStats(), vs, 'cambiar de modo invalida la caché');
  assert.equal(h.p.verbStats().dmgPct, 25);
  console.log('recompute: definición forjada y stats de postura en caché ✓');
}
{
  // riesgo 11: recompute corre en cada addBuff; con un héroe Nv100 con especialización, los
  // talentos de su build (clase, especialización y árbol héroe, datos v2 reales) y forja elegida,
  // la media de 1000 llamadas queda por debajo de 0,5 ms
  const forge = { vx_corazon: { mejora: { name: 'x', line: 'x', add: { radius: 1 } }, vars: [
    { id: 'vx_corazon_i', name: 'a', role: 'UNI', line: 'x', mul: { coef: 1.2 } }, { id: 'vx_corazon_ii', name: 'b', role: 'AREA', line: 'x', add: { radius: 1 } }] } };
  const key = T.defaultBuildKey('guerrero', 'berserker');
  const build = T.buildsFor('guerrero', 'berserker').find(b => b.key === key)?.build;
  assert.ok(build, `berserker: la build recomendada «${key}» está en los datos v2`);
  // el arnés monta la build punto a punto (makeHarness({ build })) igual que buildRanks
  const h = verbHarness('guerrero', { level: 100, spec: 'berserker', build: key, forge });
  const want = T.buildRanks(h.p, build, { level: 100 });
  assert.deepEqual(h.p.talents.cls, want.cls, 'build: rangos de clase');
  assert.deepEqual(h.p.talents.sp.berserker, want.sp.berserker, 'build: rangos de especialización');
  assert.equal(T.spentIn(T.findSpec('guerrero', 'berserker'), want.sp.berserker), T.TALENT_RULES.pts.spec, 'Nv100: 31/31 en la especialización');
  const tree = want.hero?.tree, heroRanks = want.hero?.nodes?.[tree] || {};
  assert.equal(Object.keys(heroRanks).length, T.TALENT_RULES.pts.hero, `Nv100: los ${T.TALENT_RULES.pts.hero} nodos del árbol héroe «${tree}»`);
  assert.deepEqual(h.p.talents.hero.berserker.nodes[tree], heroRanks, 'build: árbol héroe');
  // el arnés acepta el estado v2 tal cual (talents.spec = id de la especialización) y FUSIONA su árbol héroe
  // con el de la build (antes lo sustituía entero)
  const heroTree = T.findHero('guerrero', tree);
  const extra = heroTree.nodes.find(n => !n.free && !heroRanks[n.id] && !(n.req || []).some(q => !heroRanks[q] && !heroTree.nodes.find(x => x.id === q)?.free));
  assert.ok(extra, `${tree}: un nodo comprable fuera de la build`);
  const h2 = verbHarness('guerrero', { level: 100, build: key, talents: { spec: 'berserker', hero: { berserker: { nodes: { [tree]: { [extra.id]: 1 } } } } } });
  assert.equal(h2.p.talents.spec, 'berserker', 'talents.spec como cadena = la especialización');
  assert.deepEqual(h2.p.talents.hero.berserker.nodes[tree], { ...heroRanks, [extra.id]: 1 }, 'talents.hero se suma a la build');
  assert.throws(() => verbHarness('guerrero', { level: 100, spec: 'guardian', talents: { spec: 'berserker' } }), /no coinciden/);
  h.p.skillForge = { vx_corazon: 'i' };
  h.p.recompute();
  const agg = h.p.talentAgg;
  assert.equal(agg.spec, 'berserker');
  assert.ok(agg.heroOpen && agg.hero === tree, `Paragon abierto con el árbol héroe de la build (${agg.hero})`);
  // el agregado recorre los tres árboles: rangos comprados + nodos clave gratis (especialización y héroe)
  const free = [T.findSpec('guerrero', 'berserker'), T.findHero('guerrero', tree)].flatMap(t => t.nodes.filter(n => n.free)).length;
  assert.equal(Object.keys(agg.ranks).length, Object.keys(want.cls).length + Object.keys(want.sp.berserker).length + Object.keys(heroRanks).length + free,
    'agregado = clase + especialización + héroe + nodos clave');
  const t0 = performance.now();
  for (let i = 0; i < 1000; i++) h.p.recompute();
  const ms = (performance.now() - t0) / 1000;
  assert.ok(ms < 0.5, `recompute medio ${ms.toFixed(4)} ms (tope 0,5 ms)`);
  console.log(`recompute de un héroe Nv100 con talentos y forja: ${ms.toFixed(4)} ms de media ✓`);
}

// ------------------------------------------------ 6) claves de talento del núcleo (docs/paso2-claves-w2.md)
{
  // tv.ccDurPct (+% aturdimientos) y tv.freezeDur (+s Congelado) en Enemy.applyCC
  const h = mk();
  const e = h.enemy({ hp: 1e7, pos: [3, 0, 0] }), f = h.enemy({ hp: 1e7, pos: [-3, 0, 0] });
  h.p.tv = { ccDurPct: 50, freezeDur: 0.4 };
  e.applyCC('stun', 1, { src: h.p });
  assert.ok(near(e.stunT, 1.5), `ccDurPct 50: aturdir 1 s → 1,5 s (${e.stunT})`);
  f.applyCC('freeze', 1, { src: h.p });
  assert.ok(near(f.frozenT, 1.4), `freezeDur +0,4 s (${f.frozenT})`);
  const g2 = h.enemy({ hp: 1e7, pos: [0, 0, 3] });
  g2.applyCC('stun', 1, { src: null });
  assert.ok(near(g2.stunT, 1), 'sin héroe de origen, sin bonificación');
  // stats.staggerPct (la clave tv.staggerPct del mockup se traduce a esta stat)
  const b = h.enemy({ hp: 1e7, boss: true, pos: [0, 0, -5] });
  h.p.stats.staggerPct = 30;
  b.displace(h.p.pos, 2, { src: h.p });
  assert.ok(near(b.stagger, staggerFromDisplace(2, 30)) && near(b.stagger, 13), `staggerPct 30: Quebranto ×1,3 (${b.stagger})`);
}
{
  // tv.bleedDur (+s Sangrado, como burnDur)
  const base = dotProfile('bleed', 100, {}), longer = dotProfile('bleed', 100, { tv: { bleedDur: 1 } });
  assert.ok(longer.ticks > base.ticks && near(longer.total / base.total, longer.ticks / base.ticks), 'bleedDur alarga el Sangrado (mismo daño por tic)');
  assert.equal(dotProfile('burn', 100, { tv: { bleedDur: 1 } }).ticks, dotProfile('burn', 100, {}).ticks, 'solo al Sangrado');
}
{
  // críticos que acortan enfriamientos: critCdrAll, critFrostCdr, basicCritCdr (alias dartCritCdr)
  const run = (tv, hit) => {
    const h = mk('maga');
    h.p.talentExtra.tv = tv; h.p.recompute();
    const e = h.enemy({ hp: 1e7, pos: [2, 0, 0] });
    const ult = h.p.cls.skills.find(s => s.cat === 'ultimate');
    const ids = ['nova_hielo', 'vx_sendero', 'vx_guardia', 'vx_martillo', ult.id];   // (vx_paso tiene cargas: aparte)
    for (const id of ids) { h.p.cds[id] = 10; resolveSkillId(h.p, id); }
    h.hit(e, { crit: true, ...hit });
    h.hit(e, { crit: true, ...hit });             // mismo instante: una sola vez
    const red = id => 10 - h.p.cds[id];
    return { frost: red('nova_hielo'), move: red('vx_sendero'), def: red('vx_guardia'), spender: red('vx_martillo'), ult: red(ult.id) };
  };
  let r = run({ critCdrAll: 1 }, { skill: 'vx_corazon' });
  assert.ok(near(r.spender, 1) && near(r.move, 1) && near(r.frost, 1) && r.ult === 0, `critCdrAll: todas −1 s salvo la definitiva ${JSON.stringify(r)}`);
  r = run({ critFrostCdr: 2 }, { skill: 'nova_hielo', elem: 'frost' });
  assert.ok(near(r.frost, 2) && r.spender === 0 && r.move === 0, `critFrostCdr: solo las de Hielo ${JSON.stringify(r)}`);
  r = run({ critFrostCdr: 2 }, { skill: 'vx_corazon', elem: 'fire' });
  assert.equal(r.frost, 0, 'critFrostCdr: un crítico de Fuego no cuenta');
  r = run({ basicCritCdr: 0.5 }, { skill: 'm_dardo', tags: ['basic', 'proj'] });
  assert.ok(near(r.move, 0.5) && near(r.def, 0.5) && r.spender === 0 && r.frost === 0, `basicCritCdr: movilidad y defensa ${JSON.stringify(r)}`);
  r = run({ dartCritCdr: 0.5 }, { skill: 'm_dardo', tags: ['basic', 'proj'] });
  assert.ok(near(r.move, 0.5), 'dartCritCdr = alias de basicCritCdr');
  r = run({ basicCritCdr: 0.5 }, { skill: 'vx_corazon', tags: ['spender'] });
  assert.equal(r.move, 0, 'basicCritCdr: solo con el básico');
}
{
  // ⑧ drLowHp (< 40 % de vida) y drHighMana con Furia (Determinación = drHighFury)
  const h = mk();
  h.p.talentExtra.tv = { drLowHp: 15, drHighMana: 8 }; h.p.recompute();
  const cond = () => firePower('condDr', h.p, h.p, { amount: 100, src: null });
  h.p.hp = h.p.stats.maxHP * 0.3; h.p.mp = 40;
  assert.equal(cond(), 15, 'vida < 40 %: drLowHp');
  h.p.hp = h.p.stats.maxHP * 0.6; h.p.mp = 60;
  assert.equal(cond(), 8, 'Furia > 50 (de 100): drHighMana vale para la Furia');
  h.p.mp = 50;
  assert.equal(cond(), 0);
}
{
  // ⑥ frozenKillHeal / frozenKillMana: matar a un Congelado
  const h = mk('maga');
  h.p.talentExtra.tv = { frozenKillHeal: 4, frozenKillMana: 6 }; h.p.recompute();
  h.p.hp = h.p.stats.maxHP * 0.5; h.p.mp = 10;
  const e = h.enemy({ hp: 10, pos: [2, 0, 0] });
  e.frozenT = 2;
  const hp0 = h.p.hp;
  e.takeDamage(100, false, { skill: 'vx_corazon' });
  assert.ok(near(h.p.hp - hp0, h.p.stats.maxHP * 0.04, 1) && near(h.p.mp, 16, 1e-6), `cura 4 % y +6 de maná (${(h.p.hp - hp0).toFixed(1)}, ${h.p.mp})`);
  const o = h.enemy({ hp: 10, pos: [2, 0, 0] });
  const hp1 = h.p.hp;
  o.takeDamage(100, false, { skill: 'vx_corazon' });
  assert.equal(h.p.hp, hp1, 'sin congelar, nada');
}
{
  // stats.regenPct (Mente Clara · Respiración Pausada), stats.resGainPct (Furia Creciente),
  // stat mp (Furia Desbordante: resMaxAdd 30)
  const m = mk('maga');
  const def = resourceDefFor(m.p.cls);
  const r0 = resourceRegenRate(def, m.p.stats);
  m.p.talentExtra.stats = { regenPct: 30 }; m.p.recompute();
  assert.ok(near(resourceRegenRate(def, m.p.stats), r0 * 1.3), 'regenPct +30 %');
  const a = mk('arquera');
  const ea = resourceRegenRate(resourceDefFor(a.p.cls), a.p.stats);
  a.p.talentExtra.stats = { regenPct: 15 }; a.p.recompute();
  assert.ok(near(resourceRegenRate(resourceDefFor(a.p.cls), a.p.stats), ea * 1.15), 'también la Energía');
  const w = mk();
  w.p.talentExtra.stats = { resGainPct: 20, mp: 30 }; w.p.recompute();
  w.p.mp = 0;
  assert.ok(near(gainResource(w.p, 10), 12), 'resGainPct +20 % a lo generado');
  assert.ok(near(gainResource(w.p, 10, { raw: true }), 10), 'raw (pociones, reembolsos) no');
  assert.equal(w.p.stats.maxMP, 130, 'resMaxAdd 30 = stat mp: Furia hasta 130');
  console.log('Claves de talento del núcleo: ccDurPct, freezeDur, staggerPct, bleedDur, crit→CDR, drLowHp, drHighMana, frozenKill*, regenPct, resGainPct, mp ✓');
}

console.log('\n✅ MOVIMIENTO Y CONTROL (moveMul · plantado · desplazar · minHpPct · cachés · claves de talento) OK');
