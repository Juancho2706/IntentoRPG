// Paso 2c.0 — núcleo de talentos (docs/paso2-diseno.md §5, §9.2 «2c.0»)
//  1) puntos por nivel y hazañas (spec pares 10–50 + ⌈h/2⌉, clase impares + ⌊h/2⌋)
//  2) puertas y requisitos con los datos reales; el nodo clave gratis nunca se guarda
//  3) presets: el de clase es el clsPreset de la especialización ACTIVA
//  4) agregación: '@spec', costRedBig (objeto), root/slowPct (máximo), durS, critCdr,
//     innatas (bloqueo solo con escudo, amenaza ×3, +10 % de vida, curación, stagger),
//     hpPct/mpPct/xpPct en recompute
//  5) grant: elegir especialización (Nv ≥ 10, fuera de combate) pone la insignia en 3;
//     comprar un nodo `grant` la mete en el libro y en la barra según fitsSlot; quitarlo
//     o cambiar de especialización la desengarza; una activa sin comportamiento no se lanza
//  6) indicadores de especialización (spec-mechanics.js): mecánica base de los 9 y ⑩ onGauge
import assert from 'node:assert/strict';
import { CLASSES } from '../js/data.js';
import * as T from '../js/talents.js';
import { talentMethods, TALENT_OPS } from '../js/game-talents.js';
import { resolveSkill, rankBase } from '../js/skill-resolve.js';
import { mergeMods } from '../js/skill-defs.js';
import { definePower, POWER_HOOKS, firePower } from '../js/powers.js';
import { multiplierProduct } from '../js/combat-math.js';
import { BASE_GAUGE_IDS, gaugeIds, gainGauge, spendGauge, gaugeValue, gaugeMax, gaugeView, defineGauge, activeMechanic } from '../js/spec-mechanics.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { skillCastable } from '../js/game-skills.js';

const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const sk = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);
// arnés con el mixin de talentos REAL sobre el juego falso
function mk(classId, level, opts = {}) {
  const h = makeHarness({ classId, level, ...opts });
  Object.assign(h.g, talentMethods);
  h.g.canRespecFree = () => !h.g._inCombat;
  return h;
}

// ------------------------------------------------ 1) puntos
{
  const p = { classId: 'guerrero', level: 9, talents: T.normalizeTalents(null, 'guerrero'), strongholdsCleared: [], records: {} };
  assert.equal(T.talentPointsEarned(p, 'spec'), 0); assert.equal(T.talentPointsEarned(p, 'cls'), 0);
  p.level = 10; assert.equal(T.talentPointsEarned(p, 'spec'), 1); assert.equal(T.talentPointsEarned(p, 'cls'), 0);
  p.level = 11; assert.equal(T.talentPointsEarned(p, 'cls'), 1);
  p.level = 50; assert.equal(T.talentPointsEarned(p, 'spec'), 21); assert.equal(T.talentPointsEarned(p, 'cls'), 20);
  p.level = 60; assert.equal(T.talentPointsEarned(p, 'spec') + T.talentPointsEarned(p, 'cls'), 41, '1 punto por nivel de Nv10 a Nv50 (41)');
  p.strongholdsCleared = ['a', 'b', 'c']; p.records.bossKills = 99;   // hazañas: 2 bastiones + 4 tandas = 6
  assert.equal(T.featCount(p), 6);
  assert.equal(T.talentPointsEarned(p, 'spec'), 24); assert.equal(T.talentPointsEarned(p, 'cls'), 23);
}
console.log('Puntos: spec 21 + clase 20 a Nv50, +6 por hazañas ✓');

// ------------------------------------------------ 2) puertas, requisitos y nodo gratis
{
  const h = mk('guerrero', 50);
  const g = h.g, p = h.p;
  assert.equal(g.chooseSpec('berserker').ok, true);
  assert.deepEqual(p.talents.sp.berserker, {}, 'el nodo clave gratis no se guarda');
  assert.equal(g.addTalentRank('spec', 's1').ok, true, 's1 (req s0 gratis) se aprende');
  assert.equal(g.addTalentRank('spec', 's0').ok, false, 's0 no se compra');
  assert.equal(g.addTalentRank('cls', 'c2').ok, false, 'c2 exige c1 al máximo');
  g.addTalentRank('cls', 'c1'); g.addTalentRank('cls', 'c1');
  assert.equal(g.addTalentRank('cls', 'c2').ok, true);
  const r = g.removeTalentRank('cls', 'c1');
  assert.equal(r.ok, false, 'no se puede quitar un padre del que cuelga otro'); assert.match(r.reason, /depende/);
  // fila 3 de la especialización: 6 puntos en filas superiores
  const s6 = g.addTalentRank('spec', 's6');
  assert.equal(s6.ok, false); assert.match(s6.reason, /Requiere|Gasta/);
  // un save viejo con s0 guardado: talentPointsLeft no lo cuenta y normalizeTalents lo purga
  const legacy = { classId: 'guerrero', level: 10, talents: { v: 1, spec: 'berserker', cls: {}, sp: { berserker: { s0: 1 } }, choice: {} }, strongholdsCleared: [], records: {} };
  assert.equal(T.talentPointsLeft(legacy, 'spec'), 1, 'los nodos gratis no cuestan');
  assert.deepEqual(T.normalizeTalents(legacy.talents, 'guerrero').sp.berserker, {}, 'normalizeTalents purga los gratis');
  // en combate: no se puede editar
  g._inCombat = true;
  const blocked = g.addTalentRank('spec', 's2');
  assert.equal(blocked.ok, false); assert.match(blocked.reason, /combate/);
  assert.equal(g.chooseSpec('guardian').ok, false, 'cambiar de especialización en combate: no');
  g._inCombat = false;
  // por debajo de Nv10 no hay especialización
  const lo = mk('maga', 9);
  assert.equal(lo.g.chooseSpec('piromante').ok, false);
}
console.log('Puertas, requisitos, nodo gratis y bloqueo en combate ✓');

// ------------------------------------------------ 3) presets (clsPreset de la especialización activa)
{
  const h = mk('guerrero', 50);
  const g = h.g, p = h.p;
  g.chooseSpec('guardian');
  assert.equal(g.applyTalentPreset('all').ok, true);
  const gd = T.findSpec('guerrero', 'guardian');
  assert.notDeepEqual(gd.clsPreset, T.TALENT_TREES.guerrero.cls.preset, 'el Guardián trae su propio preset de clase');
  const want = {};
  for (const [id, n] of gd.clsPreset) want[id] = (want[id] || 0) + n;
  assert.deepEqual(p.talents.cls, want, 'preset de clase = clsPreset del Guardián');
  for (const [id, , k] of gd.clsPreset) if (k) assert.equal(p.talents.choice[id], k, `elección ${id}=${k}`);
  assert.deepEqual(T.presetList(p, 'cls'), gd.clsPreset);
  assert.ok(T.spentIn(T.treeOf(p, 'spec'), p.talents.sp.guardian) <= T.talentPointsEarned(p, 'spec'));
  assert.ok(!('s0' in p.talents.sp.guardian), 'el preset tampoco guarda el nodo gratis');
  // al cambiar a Berserker, el preset de clase pasa a ser el suyo
  g.chooseSpec('berserker'); g.applyTalentPreset('cls');
  const want2 = {};
  for (const [id, n] of T.findSpec('guerrero', 'berserker').clsPreset) want2[id] = (want2[id] || 0) + n;
  assert.deepEqual(p.talents.cls, want2);
  // recortado por nivel: Nv14 no se pasa de puntos ni rompe reglas
  const q = mk('arquera', 14); q.g.chooseSpec('montaraz'); q.g.applyTalentPreset('all');
  for (const w of ['cls', 'spec']) {
    const tree = T.treeOf(q.p, w), ranks = T.ranksOf(q.p, w);
    assert.ok(T.spentIn(tree, ranks) <= T.talentPointsEarned(q.p, w));
    for (const n of tree.nodes) if ((ranks[n.id] | 0) > 0) assert.ok(!T.gateFail(tree, ranks, n, 14) && !T.reqFail(tree, ranks, n), n.id);
  }
}
console.log('Presets: el de clase es el clsPreset de la especialización activa, recortado por nivel ✓');

// ------------------------------------------------ 4) agregación y recompute
{
  // fusión de mods: root/slowPct se quedan con el máximo; durS/critCdr suman
  const m = mergeMods({}, { root: 1, slowPct: 30, durS: 1, critCdr: 0.4 });
  T.mergeSkillMods(m, { root: 0.5, slowPct: 10, durS: 1, critCdr: 0.4 });
  assert.equal(m.root, 1); assert.equal(m.slowPct, 30); assert.equal(m.durS, 2); assert.ok(approx(m.critCdr, 0.8));
  // Maga: @spec (c9), costRedBig (c14) y mpPct (c6)
  const h = mk('maga', 50);
  const g = h.g, p = h.p;
  g.chooseSpec('piromante');
  const mp0 = p.stats.maxMP;
  p.talents.cls = { c1: 2, c2: 1, c3: 1, c4: 3, c6: 2, c7: 2, c9: 2, c10: 3, c12: 1, c13: 2, c14: 1 };
  p.talents.choice.c12 = 'A';
  p.recompute();
  const agg = p.talentAgg;
  assert.deepEqual(agg.tv.costRedBig, { pct: 15, over: 20 }, 'costRedBig queda como objeto');
  assert.ok(agg.skillLv.bola_fuego === 2 && agg.skillLv.meteoro === 2 && agg.skillLv.p_llamarada === 2, '@spec: habilidades de Fuego de la Piromante +2');
  assert.ok(!agg.skillLv.rayo, '@spec: no a las de otro elemento');
  assert.ok(p.stats.maxMP > mp0 * 1.1, `mpPct sube el maná máximo (${mp0} → ${p.stats.maxMP})`);
  assert.equal(p.stats.mpPct, 16);
  const met = resolveSkill(p, sk('maga', 'meteoro')), bf = resolveSkill(p, sk('maga', 'bola_fuego'));
  assert.equal(met.cost, Math.round(40 * (1 - 15 / 100)), 'Meteoro (40 > 20): −15 %');
  assert.equal(bf.cost, 18, 'Bola de Fuego (18 ≤ 20): sin rebaja');
  assert.equal(met.rank, rankBase(50, sk('maga', 'meteoro').req) + 2, '@spec: +2 rangos a Meteoro');
  // xpPct (Maga c13: +6 %/rango)
  assert.equal(p.stats.xpPct, 12);
  const xp0 = p.xp; p.gainXP(100); assert.equal(p.xp - xp0, 112, '+12 % de experiencia');
  // durS (Arquera c11) y critCdr (Francotiradora s10) llegan al perfil
  const a = mk('arquera', 50); a.g.chooseSpec('francotiradora');
  a.p.talents.cls = { c1: 2, c2: 1, c3: 1, c4: 3, c5: 1, c7: 2, c8: 2, c11: 2 }; a.p.talents.choice.c5 = 'A';
  a.p.talents.sp.francotiradora = { s1: 3, s2: 2, s4: 1, s5: 3, s6: 1, s7: 2, s10: 2 };
  a.p.recompute();
  assert.equal(resolveSkill(a.p, sk('arquera', 'agilidad')).durS, 2, 'durS: +2 s de Agilidad');
  assert.ok(approx(resolveSkill(a.p, sk('arquera', 'a_t_apuntado')).critCdr, 0.8), 'critCdr: 0,8 s por crítico');
}
console.log('Agregación: @spec, costRedBig, root/slowPct (máx.), durS, critCdr, mpPct, xpPct ✓');

// innatas de especialización (§5.2.5)
{
  const h = mk('guerrero', 20);
  const p = h.p;
  const hp0 = p.stats.maxHP, block0 = p.stats.block;
  h.g.chooseSpec('guardian');
  assert.equal(p.stats.block, block0, 'sin escudo, la innata de bloqueo no cuenta');
  assert.equal(p.stats.threatMult, 3, 'Guardián: amenaza ×3');
  assert.ok(approx(p.stats.maxHP, Math.round(hp0 * 1.10), 1), `Guardián: +10 % de vida (${hp0} → ${p.stats.maxHP})`);
  p.equipment.offhand = { kind: 'item', slot: 'offhand', icon: '🛡️', baseName: 'Escudo de Hierro', affixes: {}, arm: 5, quality: 0 };
  p.recompute();
  assert.equal(p.stats.block, block0 + 15, 'con escudo: +15 de bloqueo');
  p.equipment.offhand.icon = '🔮'; p.equipment.offhand.baseName = 'Orbe Arcano'; p.recompute();
  assert.equal(p.stats.block, block0, 'un orbe no es escudo');
  h.g.chooseSpec('cruzado');
  assert.equal(p.stats.healPct, 15, 'Cruzado: +15 % de curación');
  assert.equal(p.stats.threatMult, 1);
  const c = mk('maga', 20); c.g.chooseSpec('crionte');
  assert.equal(c.p.stats.staggerPct, 25, 'Crionte: +25 % de stagger');
  const mt = mk('arquera', 20); mt.g.chooseSpec('montaraz');
  assert.equal(mt.p.stats.staggerPct, 25, 'Montaraz: +25 % de stagger');
}
console.log('Innatas: bloqueo solo con escudo, amenaza ×3, +10 % de vida, curación +15, stagger +25 ✓');

// ------------------------------------------------ 5) grant: libro y barra
{
  const h = mk('guerrero', 30);
  const g = h.g, p = h.p;
  p.hotbar = { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: null, k3: null, k4: null };
  assert.ok(!p.skills.g_t_remolino, 'sin especialización no conoce la insignia');
  g.chooseSpec('berserker');
  assert.ok(p.skills.g_t_remolino > 0, 'la insignia se aprende con el nodo clave');
  assert.equal(p.hotbar.k3, 'g_t_remolino', 'y entra en la ranura 3');
  // Segundo Aliento (c2, defensa → k2) al comprar su nodo
  g.addTalentRank('cls', 'c1'); g.addTalentRank('cls', 'c1');
  g.addTalentRank('cls', 'c2');
  assert.ok(p.skills.g_t_aliento > 0, 'grant: entra en el libro');
  assert.equal(p.hotbar.k2, 'g_t_aliento', 'grant: entra en su ranura libre según fitsSlot');
  assert.ok(h.messages().some(m => /Nueva habilidad de talento/.test(m)));
  g.removeTalentRank('cls', 'c2');
  assert.ok(!p.skills.g_t_aliento, 'quitar el nodo la olvida');
  assert.equal(p.hotbar.k2, null, 'y la desengarza de la barra');
  // cambiar de especialización cambia la insignia (los rangos de cada una se conservan)
  g.addTalentRank('spec', 's1');
  g.chooseSpec('guardian');
  assert.equal(p.hotbar.k3, 'g_t_desafio', 'nueva insignia en 3');
  assert.ok(!p.skills.g_t_remolino && p.skills.g_t_desafio > 0);
  g.switchSpec('berserker');
  assert.equal(p.talents.sp.berserker.s1, 1, 'la build de Berserker sigue ahí');
  // Paso 2c.2: la insignia del Berserker YA tiene comportamiento (2c.1): se lanza, cobra
  // sus 30 de Furia y pone el enfriamiento; la esquiva corta el giro
  const ins = sk('guerrero', 'g_t_remolino');
  assert.ok(ins.behavior && !ins.type, 'la insignia del Berserker depende de su comportamiento');
  p.mp = 100;
  assert.equal(h.cast('k3'), true, 'con comportamiento registrado: se lanza');
  assert.equal(p.mp, 70, 'y cobra 30 de Furia');
  assert.ok(p.cds.g_t_remolino > 0, 'y pone el enfriamiento');
  assert.equal(g.cancelCast('dodge'), true, 'la esquiva corta la canalización del Remolino');
  // una activa de talento cuyo comportamiento NO existe (ni tipo genérico) no se lanza ni cobra
  assert.equal(skillCastable({ kind: 'talent', behavior: 't_x' }), false, 'sin comportamiento registrado: no se lanza');
  // código de build por el mixin
  g.applyTalentPreset('all');
  const code = g.exportTalentCode();
  const q = mk('guerrero', 30);
  assert.equal(q.g.importTalentCode(code).ok, true);
  assert.deepEqual(q.p.talents.sp.berserker, p.talents.sp.berserker);
  assert.ok(q.p.hotbar.k3 === 'g_t_remolino', 'importar con especialización también coloca la insignia');
}
console.log('Grant: insignia en 3, nodos grant al libro y a su ranura, desengarce al retirarlos, cambio de especialización ✓');

// ------------------------------------------------ 6) indicadores de especialización
assert.deepEqual([...BASE_GAUGE_IDS].sort(), ['bastion', 'calor', 'cargas', 'concentracion', 'coto', 'escarcha', 'fervor', 'impulso', 'sed']);
for (const id of BASE_GAUGE_IDS) assert.ok(POWER_HOOKS[`gauge_${id}`] && gaugeIds().includes(id), `gauge_${id} registrado`);
// cada especialización activa SU indicador
for (const [cid, list] of Object.entries({ guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] })) {
  for (const s of list) {
    const h = mk(cid, 12, { spec: s });
    const mech = T.findSpec(cid, s).mechanic;
    assert.equal(activeMechanic(h.p), mech, `${s} → ${mech}`);
    assert.ok(h.p.powers.has(`gauge_${mech}`));
    const v = gaugeView(h.p);
    assert.ok(v && v.id === mech && v.max > 0 && typeof v.name === 'string' && /^#/.test(v.color) && v.state === 'idle', `${s}: gaugeView`);
  }
}
assert.equal(gaugeView(mk('guerrero', 9).p), null, 'sin especialización no hay indicador');
assert.throws(() => defineGauge('sed', { max: 1 }), /repetido/);
assert.throws(() => defineGauge('t_raro', { max: 1, foo: 1 }), /clave desconocida/);

// ⑩ onGauge: gain / full / spent / empty
const EV = [];
definePower('t_oye_indicador', { name: 'prueba', onGauge(g, p, id, ev, n) { EV.push(`${id}:${ev}`); } });

// Sed (Berserker)
{
  const h = mk('guerrero', 20, { spec: 'berserker' });
  const p = h.p;
  h.addPowers('t_oye_indicador');
  assert.equal(gainGauge(p, 'calor', 50), 0, 'solo se llena el indicador de TU especialización');
  p.takeDamage(p.stats.maxHP * 0.5, 1, {});
  const lost = (p.stats.maxHP - p.hp) / p.stats.maxHP * 100;
  assert.ok(approx(h.gaugeValue('sed'), lost, 1.2), `Sed: +1 por 1 % de vida perdida (${h.gaugeValue('sed').toFixed(1)} vs ${lost.toFixed(1)})`);
  // tics de Sangrado: +2 cada uno, máx. 10/s
  const e = h.enemy({ hp: 1e6 });
  const before = h.gaugeValue('sed');
  // un tic real de Sangrado llega como dot:<habilidad>:bleed (timers.applyDoTInstance)
  for (let i = 0; i < 8; i++) h.g.onPlayerHit(e, { dealt: 5, raw: 5, crit: false, skill: 'torbellino', tags: new Set(), elem: null, proc: false, dot: true, source: 'dot:torbellino:bleed' });
  assert.ok(approx(h.gaugeValue('sed') - before, 10), 'Sangrado: +2 por tic, tope 10 por segundo');
  h.gauge('sed', 100);
  assert.ok(EV.includes('sed:full'), '⑩ onGauge(full)');
  assert.ok(p.gauges.sed.satedT > 0, 'Sed Saciada');
  p.hp = p.stats.maxHP;
  assert.ok(approx(multiplierProduct(p.powers, { hpFrac: 1, p }), 1.25), 'Sed Saciada activa Sed de Batalla ×1,25 con la vida llena');
  assert.equal(gaugeView(p).state, 'active');
  h.tick(6.2);
  assert.equal(h.gaugeValue('sed'), 0, 'al terminar la Sed Saciada vuelve a 0');
  assert.ok(EV.includes('sed:empty'));
  assert.ok(approx(multiplierProduct(p.powers, { hpFrac: 1, p }), 1));
  // pérdida: −8/s tras 4 s fuera de combate
  h.gauge('sed', 50); p.sinceCombat = 0;
  h.tick(4); const at4 = h.gaugeValue('sed');
  h.tick(1); assert.ok(approx(at4 - h.gaugeValue('sed'), 8, 1.2), `−8/s fuera de combate (${at4} → ${h.gaugeValue('sed')})`);
}
// Bastión (Guardián): +1 por bloqueo, −1 cada 6 s sin ganar
{
  const h = mk('guerrero', 20, { spec: 'guardian' });
  const p = h.p;
  p.equipment.offhand = { kind: 'item', slot: 'offhand', icon: '🛡️', baseName: 'Escudo', affixes: {}, arm: 5, quality: 0 };
  p.recompute();
  p.combatRng = () => 0;                         // todo golpe se bloquea
  for (let i = 0; i < 7; i++) p.takeDamage(10, 1, { melee: true });
  assert.equal(h.gaugeValue('bastion'), 5, 'Bastión: +1 por bloqueo, tope 5');
  h.tick(6.05); assert.equal(h.gaugeValue('bastion'), 4, 'pierde 1 cada 6 s sin ganar');
  assert.ok(spendGauge(p, 'bastion', 3)); assert.equal(h.gaugeValue('bastion'), 1);
  assert.equal(spendGauge(p, 'bastion', 2), false, 'no gasta lo que no tiene');
}
// Fervor (Cruzado): +1 por muerte (Juicio) y +1 cada 3 impactos de Martillo
{
  const h = mk('guerrero', 20, { spec: 'cruzado' });
  const e = h.enemy({ hp: 10 });
  e.takeDamage(999, false, {});
  assert.equal(h.gaugeValue('fervor'), 1, '+1 por muerte');
  const f = h.enemy({ hp: 1e6 });
  for (let i = 0; i < 6; i++) h.hit(f, { skill: 'g_martillo' });
  assert.equal(h.gaugeValue('fervor'), 3, '+1 cada 3 impactos de Martillo, tope 3');
}
// Calor (Piromante): +5 por golpe de Fuego; a 100 Ignición Total (siguiente Bola/Meteoro gratis y crítica)
{
  const h = mk('maga', 20, { spec: 'piromante' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  for (let i = 0; i < 4; i++) { h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); p.simT += 0.1; }
  h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); h.hit(e, { elem: 'fire', skill: 'bola_fuego' });   // mismo instante: una vez
  assert.equal(h.gaugeValue('calor'), 25, '+5 por golpe de Fuego (un área cuenta una vez por instante)');
  h.hit(e, { elem: 'arcane', skill: 'rayo' }); p.simT += 0.1;
  assert.equal(h.gaugeValue('calor'), 25, 'otros elementos no dan Calor');
  h.gauge('calor', 100);
  const bf = resolveSkill(p, sk('maga', 'bola_fuego'));
  assert.ok(bf.cost === 0 && bf.forceCrit, 'Ignición Total: Bola de Fuego gratis y crítica');
  assert.equal(gaugeView(p).state, 'active');
  h.aim(4, 0); h.setSlot('rmb', 'bola_fuego');
  const mp = p.mp;
  assert.equal(h.cast('rmb'), true);
  assert.equal(p.mp, mp, 'no cobró maná');
  assert.equal(h.gaugeValue('calor'), 0, 'se consume al lanzarla');
  assert.equal(resolveSkill(p, sk('maga', 'bola_fuego')).cost, 18, 'la siguiente vuelve a costar');
  const r = p.rollDamage(1, 0, 0, e, { forceCrit: true });
  assert.equal(r.crit, true, 'forceCrit = crítico seguro');
  h.gauge('calor', 40); p.sinceCombat = 0;
  h.tick(3.0); const c3 = h.gaugeValue('calor'); h.tick(1);
  assert.ok(approx(c3 - h.gaugeValue('calor'), 10, 1.1), 'baja −10/s tras 3 s');
}
// Escarcha (Crionte, POR ENEMIGO): 5 capas → Congelado; jefe → Aterido + stagger
{
  const h = mk('maga', 20, { spec: 'crionte' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 }), o = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  for (let i = 0; i < 4; i++) h.hit(e, { elem: 'frost', skill: 'm_toque' });
  assert.equal(h.gaugeValue('escarcha', e), 4); assert.equal(h.gaugeValue('escarcha', o), 0, 'las capas son por enemigo');
  assert.equal(gaugeView(p).value, 4);
  h.hit(e, { elem: 'frost', skill: 'm_toque' });
  assert.ok(e.frozenT > 1.4 && e.stunT > 1.4, 'a 5 capas: Congelado 1,5 s');
  assert.equal(h.gaugeValue('escarcha', e), 0, 'y las capas vuelven a 0');
  h.hit(o, { elem: 'frost', skill: 'nova_hielo' });
  assert.equal(h.gaugeValue('escarcha', o), 2, 'Nova de Hielo +2');
  h.tick(2.05); assert.equal(h.gaugeValue('escarcha', o), 1, 'cae 1 capa cada 2 s');
  const b = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 3] });
  for (let i = 0; i < 5; i++) h.hit(b, { elem: 'frost', skill: 'm_toque' });
  assert.ok(b.numbT > 3.9 && b.stunT === 0, 'jefe: Aterido 4 s (no se congela)');
  assert.ok(approx(b.stagger, 25 * 1.25), `jefe: +25 de stagger × innata +25 % (${b.stagger})`);
  // Cero Absoluto (m_shatter): astilla a los Congelados por debajo del 15 %
  const w = h.enemy({ hp: 100, pos: [0, 0, -3] });
  w.hp = 14; w.frozenT = 1;
  h.hit(w, { elem: 'frost', skill: 'm_toque', dealt: 1 });
  assert.ok(!w.alive, 'Congelado < 15 %: astillado');
}
// Cargas Arcanas (Arcanista): Dardo +1 (máx. 4); Rayo las descarga (+35 %/carga, +5 de maná/carga)
{
  const h = mk('maga', 20, { spec: 'arcanista' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  for (let i = 0; i < 6; i++) h.hit(e, { skill: 'm_dardo', elem: 'arcane' });
  assert.equal(h.gaugeValue('cargas'), 4, 'Dardo +1 por impacto, tope 4');
  assert.equal(firePower('condAdd', p, p, e, { skill: 'rayo' }), 140, 'Rayo: +35 % aditivo por carga');
  assert.equal(firePower('condAdd', p, p, e, { skill: 'm_dardo' }), 0);
  p.mp = 10;
  firePower('afterCast', p, h.g, p, { sk: sk('maga', 'rayo') }, { hits: 1 });
  assert.equal(h.gaugeValue('cargas'), 0, 'Rayo las consume todas');
  assert.equal(p.mp, 30, '+5 de maná por carga');
  h.gauge('cargas', 3); h.tick(6.1);
  assert.equal(h.gaugeValue('cargas'), 0, 'se pierden 6 s después de la última ganancia');
}
// Concentración (Francotiradora): +20/s quieta, −25/s moviéndote; +0,15 % de crítico por punto
{
  const h = mk('arquera', 20, { spec: 'francotiradora' });
  const p = h.p;
  h.tick(1.0);
  assert.ok(approx(h.gaugeValue('concentracion'), 20, 1e-6), '+20/s quieta');
  h.gauge('concentracion', 100);
  assert.ok(approx(firePower('condCrit', p, p, null, {}), 15), '+15 % de crítico a 100');
  p.moving = true;
  firePower('onTick', p, h.g, p, 1.0);
  assert.ok(approx(h.gaugeValue('concentracion'), 75), '−25/s en movimiento');
}
// Coto de Caza (Montaraz): trampas armadas + Presa
{
  const h = mk('arquera', 20, { spec: 'montaraz' });
  const p = h.p;
  h.g.spawnField('trampa', { pos: { x: 3, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  h.g.spawnField('trampa', { pos: { x: 5, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  assert.equal(h.gaugeValue('coto'), 2, 'valor = trampas armadas');
  assert.equal(gaugeMax(p, 'coto'), 3);
  const c = h.enemy({ hp: 1e6 }), el = h.enemy({ hp: 1e6, rank: 'elite', pos: [0, 0, 4] }), el2 = h.enemy({ hp: 1e6, rank: 'elite', pos: [0, 0, -4] });
  h.hit(c, {}); assert.ok(!c.prey, 'un común no es Presa');
  h.hit(el, {}); assert.ok(el.prey, 'el primer élite golpeado es la Presa');
  h.hit(el2, {}); assert.ok(!el2.prey, 'solo una Presa a la vez');
  assert.equal(gaugeView(p).state, 'prey');
  h.tick(15.1); assert.ok(!el.prey, 'la Presa dura 15 s');
}
// Impulso (Tiradora): +3 por disparo en movimiento; a 100 Vendaval 6 s
{
  const h = mk('arquera', 20, { spec: 'tiradora' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 });
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  assert.equal(h.gaugeValue('impulso'), 0, 'quieta no genera');
  for (let i = 0; i < 3; i++) { p.moving = true; h.hit(e, { tags: ['proj'], skill: 'a_disparo' }); p.simT += 0.2; }
  assert.equal(h.gaugeValue('impulso'), 9, '+3 por disparo en movimiento');
  const proj0 = resolveSkill(p, sk('arquera', 'flecha_multiple')).proj;
  const aspd0 = p.stats.aspdPct;
  h.gauge('impulso', 100);
  assert.ok(p.buffs.some(b => b.id === 't_vendaval') && p.stats.aspdPct === aspd0 + 25, 'Vendaval: +25 % de vel. de ataque');
  assert.equal(resolveSkill(p, sk('arquera', 'flecha_multiple')).proj, proj0 + 1, '+1 proyectil a Flecha Múltiple');
  h.tick(6.1);
  assert.equal(h.gaugeValue('impulso'), 0, 'después vuelve a 0');
  assert.equal(resolveSkill(p, sk('arquera', 'flecha_multiple')).proj, proj0);
}
assert.ok(EV.includes('sed:gain') && EV.includes('sed:full') && EV.includes('sed:empty'), '⑩ onGauge recibe gain/full/empty');
{
  const h = mk('guerrero', 20, { spec: 'guardian' });
  h.addPowers('t_oye_indicador');
  EV.length = 0; gainGauge(h.p, 'bastion', 2); spendGauge(h.p, 'bastion', 2);
  assert.deepEqual(EV, ['bastion:gain', 'bastion:spent', 'bastion:empty'], '⑩ gain → spent → empty');
}
console.log('Indicadores: los 9 de §2 con su llenado/descarga base, por enemigo (Escarcha), HUD y ⑩ onGauge ✓');

console.log('\n✅ NÚCLEO DE TALENTOS (Paso 2c.0) OK');
void TALENT_OPS; void gaugeValue;
