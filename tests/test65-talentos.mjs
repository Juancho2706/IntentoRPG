// Paso 2g · E1 (W1) — el mixin de talentos v2 (js/game-talents.js) sobre el juego falso del arnés
// y los datos del fixture v2 (tests/fixtures/talents-sample.mjs)
//  1) contrato: los 20 métodos del mixin; talentPointsInfo por sistema y nivel
//  2) fuera de combate gratis; en combate 'combat' (salvo exportar y las configuraciones)
//  3) especialización: Nv10, conserva rangos, reinicia indicadores, forja recomendada solo en
//     lo nunca elegido (D3) y su barra (SPEC_BAR) solo en ranuras vacías, del kit anterior o
//     con habilidades que ya no se conocen
//  4) activas de talento: al libro y a la ranura 2 si está libre; fuera al dejar de concederse
//  5) recompute: stats, skillLv, tv, mecánica e indicador de la especialización
//  6) Paragon por el mixin: avisos de apertura y pausa (siempre, también desde el panel)
//  7) build recomendada, configuraciones, reinicio y código IRPG2 por el mixin
//  8) indicadores de especialización: cada especialización activa el suyo; ⑩ onGauge y la
//     mecánica base de los 9 (el detalle por clase vive en test-gauges-<clase>)
import assert from 'node:assert/strict';
import './helpers/use-talents-fixture.mjs';
const T = await import('../js/talents.js');
const { talentMethods, TALENT_OPS } = await import('../js/game-talents.js');
const { CLASSES, SPEC_BAR, FORGE_RECO } = await import('../js/data.js');
const { normalizeSkillDef } = await import('../js/skill-defs.js');
const { resolveSkill, rankBase } = await import('../js/skill-resolve.js');
const { definePower, POWER_HOOKS, firePower } = await import('../js/powers.js');
const { BASE_GAUGE_IDS, gaugeIds, gainGauge, spendGauge, gaugeMax, gaugeView, defineGauge, activeMechanic, gaugeTuning } = await import('../js/spec-mechanics.js');
const { makeHarness } = await import('./helpers/power-harness.mjs');

const approx = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const sk = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);
assert.equal(T.TALENT_TREES.guerrero.v, 2, 'el gancho carga el fixture v2');
// arnés con el mixin REAL sobre el juego falso; _inCombat simula canRespecFree
function mk(classId, level, opts = {}) {
  const h = makeHarness({ classId, level, ...opts });
  Object.assign(h.g, talentMethods);
  h.g.canRespecFree = () => !h.g._inCombat;
  return h;
}
const last = h => h.messages()[h.messages().length - 1] || '';

// D29: con el catálogo 2g (CATALOG_V = 2) data.js ya no fusiona las activas de TALENTS.skills; las
// del fixture que el catálogo real no trae (g_t_bramido, g_h_titan…) se añaden aquí, como las fusionaba
for (const [cid, t] of Object.entries(T.TALENT_TREES)) {
  const list = CLASSES[cid].skills;
  for (const s of t.skills || []) if (!list.some(x => x.id === s.id)) list.push(normalizeSkillDef({ ...s, kind: 'talent' }));
}
// kit de especialización de prueba (ids propios: la barra de prueba no depende del kit real)
for (const [id, spec] of [['fx_berserker_k3', 'berserker'], ['fx_guardian_k3', 'guardian'], ['fx_cruzado_k3', 'cruzado']])
  CLASSES.guerrero.skills.push(normalizeSkillDef({ id, name: id, icon: '·', desc: '·', cat: 'spec', elem: 'physical', spec, req: 10, slots: ['k3'], type: 'nova', coef: 1 }));
// un segundo básico (el Mandoble v1): el que el jugador eligió en 🖱️Izq se respeta
CLASSES.guerrero.skills.push(normalizeSkillDef({ id: 'fx_basico', name: 'fx_basico', icon: '·', desc: '·', cat: 'basic', elem: 'physical', req: 3, slots: ['lmb'], type: 'melee', coef: 1.5, range: 2.4 }));
SPEC_BAR.berserker = { bar: { lmb: 'g_tajo', rmb: 'g_lanza', k1: 'embestida', k2: 'g_piel', k3: 'fx_berserker_k3', k4: 'g_u_furia' } };
SPEC_BAR.guardian = { bar: { lmb: 'g_tajo', rmb: 'g_lanza', k1: 'embestida', k2: 'g_piel', k3: 'fx_guardian_k3', k4: 'g_u_ciudadela' } };
FORGE_RECO.berserker = { g_tajo: 'ii', g_remolino: 'ii' };
FORGE_RECO.guardian = { g_hendidura: 'ii', g_lanza: 'i', g_tajo: 'ii' };

// ------------------------------------------------ 1) contrato
assert.deepEqual(Object.keys(talentMethods).sort(), ['_talentMutate', 'addTalentRank', 'applyTalentBuild', 'applyTalentLoadout', 'applyTalentPreset',
  'canEditTalents', 'chooseHeroTree', 'chooseSpec', 'chooseTalentOption', 'deleteTalentLoadout', 'exportTalentCode', 'importTalentCode',
  'onTalentsChanged', 'removeTalentRank', 'renameTalentLoadout', 'resetTalentTree', 'saveTalentLoadout', 'switchSpec', 'talentPointsInfo',
  'toggleTalentChoice'], 'métodos del mixin (test43 vigila las colisiones)');
assert.equal(typeof TALENT_OPS.addRank, 'function');
{
  const h = mk('guerrero', 9);
  const info = L => { h.p.level = L; return h.g.talentPointsInfo(); };
  assert.deepEqual(info(9), { cls: { earned: 0, spent: 0, left: 0 }, spec: { earned: 0, spent: 0, left: 0 }, hero: { earned: 0, spent: 0, left: 0 }, board: { earned: 0, spent: 0, left: 0 }, heroOpen: false, heroPaused: false });
  assert.equal(info(10).spec.earned, 1); assert.equal(info(11).cls.earned, 1);
  const i100 = info(100);
  assert.deepEqual([i100.cls.earned, i100.spec.earned, i100.hero.earned, i100.board.earned], [34, 31, 0, 16], 'el héroe da 0 mientras el Paragon está cerrado');
  assert.equal(i100.board.earned, T.paragonPointsEarned(h.p));
}
console.log('Contrato del mixin y puntos por sistema ✓');

// ------------------------------------------------ 2) combate, 3) especialización
{
  const h = mk('guerrero', 30);
  const g = h.g, p = h.p;
  assert.equal(g.chooseSpec('pirata').ok, false);
  const lo = mk('guerrero', 9);
  const r9 = lo.g.chooseSpec('berserker');
  assert.equal(r9.reason, 'level'); assert.match(last(lo), /nivel 10/);
  g._inCombat = true;
  const c = g.chooseSpec('berserker');
  assert.equal(c.ok, false); assert.equal(c.reason, 'combat'); assert.match(last(h), /fuera de combate/);
  assert.equal(p.talents.spec, null, 'en combate no cambia nada');
  assert.match(g.canEditTalents(), /fuera de combate/);
  g._inCombat = false;
  assert.equal(g.canEditTalents(), null);
  // barra: lmb propia, rmb vacía, k1 desconocida, k3 vacía
  p.hotbar = { lmb: 'fx_basico', rmb: null, k1: 'zzz', k2: null, k3: null, k4: null };
  p.skillForge = { g_lanza: null, g_tajo: 'i' };
  assert.equal(g.chooseSpec('berserker').ok, true);
  assert.match(last(h), /Especialización: Berserker/);
  assert.equal(g.chooseSpec('berserker').same, true);
  assert.equal(p.talents.spec, 'berserker');
  assert.deepEqual(p.hotbar, { lmb: 'fx_basico', rmb: 'g_lanza', k1: 'embestida', k2: 'g_piel', k3: 'fx_berserker_k3', k4: 'g_u_furia' },
    'SPEC_BAR solo en ranuras vacías o con habilidades desconocidas (lmb propia se queda)');
  assert.deepEqual(p.skillForge, { g_lanza: null, g_tajo: 'i', g_remolino: 'ii' }, 'la forja recomendada no pisa el Tajo ya elegido');
  assert.equal(activeMechanic(p), 'sed'); assert.ok(p.powers.has('gauge_sed'));
  h.gauge('sed', 40);
  // rangos de Berserker y cambio a Guardián
  g.addTalentRank('spec', 'b1'); g.addTalentRank('spec', 'b1');
  p.hotbar.rmb = 'g_hendidura';                                  // elección del jugador (la barra de prueba dice g_lanza)
  assert.equal(g.switchSpec('guardian').ok, true);
  assert.equal(p.hotbar.k3, 'fx_guardian_k3', 'la ranura del kit anterior pasa al kit nuevo');
  assert.equal(p.hotbar.k4, 'g_u_ciudadela', 'también la definitiva del kit anterior (Furia Inmortal)');
  assert.equal(p.hotbar.rmb, 'g_hendidura', 'una habilidad conocida que no es del kit se respeta');
  assert.equal(p.hotbar.lmb, 'fx_basico');
  assert.equal(h.gaugeValue('sed'), 0, 'cambiar de especialización reinicia los indicadores');
  assert.equal(activeMechanic(p), 'bastion');
  assert.deepEqual(p.skillForge, { g_lanza: null, g_tajo: 'i', g_remolino: 'ii', g_hendidura: 'ii' }, 'forja recomendada solo en lo nunca elegido (null = elegido sin variante)');
  assert.equal(g.chooseSpec('berserker').ok, true);
  assert.deepEqual(p.talents.sp.berserker, { b1: 2 }, 'cada especialización conserva sus rangos');
  assert.equal(p.hotbar.k3, 'fx_berserker_k3');
}
console.log('Combate, especialización, indicadores, forja recomendada y barra de la especialización ✓');

// ------------------------------------------------ 4) activas de talento, 5) recompute
{
  const h = mk('guerrero', 40);
  const g = h.g, p = h.p;
  g.chooseSpec('cruzado');
  p.hotbar.k2 = null;
  for (const id of ['c1', 'c1', 'c5', 'c8', 'c8']) assert.equal(g.addTalentRank('cls', id).ok, true, id);
  const hp0 = p.stats.maxHP;
  assert.equal(g.addTalentRank('cls', 'c11', 'A').ok, true);
  assert.ok(p.talentAgg.grants.has('g_t_aliento') && p.skills.g_t_aliento > 0, 'c11 A concede Aliento');
  assert.equal(p.hotbar.k2, 'g_t_aliento', 'a la ranura 2 libre');
  assert.match(h.messages().find(m => /Nueva habilidad de talento/.test(m)) || '', /\(ranura 2\)/);
  assert.equal(g.chooseTalentOption('c11', 'B').ok, true);
  assert.ok(!p.talentAgg.grants.has('g_t_aliento'));
  assert.equal(p.hotbar.k2, null, 'opción B: la activa sale de la barra');
  assert.equal(g.toggleTalentChoice('cls', 'c11').ok, true);
  assert.equal(p.hotbar.k2, 'g_t_aliento', 'vuelve a la A: vuelve a la ranura libre');
  p.hotbar.k2 = 'g_piel';
  g.chooseTalentOption('c11', 'B'); g.chooseTalentOption('c11', 'A');
  assert.equal(p.hotbar.k2, 'g_piel', 'con la ranura 2 ocupada la activa va solo al libro');
  assert.match(last(h), /\(en el libro\)/);
  assert.equal(g.chooseTalentOption('zz', 'A').reason, 'unknown');
  // c15 A: +60 de vida; c15 B: tv killHeal
  for (const id of ['c2', 'c2']) g.addTalentRank('cls', id);
  assert.equal(g.addTalentRank('cls', 'c15', 'A').ok, true);
  assert.equal(p.stats.maxHP, hp0 + 60, 'stats del nodo en recompute');
  g.chooseTalentOption('c15', 'B');
  assert.equal(p.stats.maxHP, hp0); assert.equal(p.talentAgg.tv.killHeal, 2, 'tv del nodo');
  // c16 B: +1 rango a las gastadoras
  for (const id of ['c12', 'c12']) assert.equal(g.addTalentRank('cls', id).ok, true, id);
  const r0 = resolveSkill(p, sk('guerrero', 'g_lanza')).rank;
  assert.equal(g.addTalentRank('cls', 'c16', 'B').ok, true);
  assert.equal(resolveSkill(p, sk('guerrero', 'g_lanza')).rank, r0 + 1, '@spender +1 rango (por encima del de nivel)');
  assert.equal(r0, rankBase(40, sk('guerrero', 'g_lanza').req));
  // quitar el nodo la olvida y la desengarza
  g.removeTalentRank('cls', 'c16'); g.removeTalentRank('cls', 'c15');
  p.hotbar.k2 = 'g_t_aliento';
  assert.equal(g.removeTalentRank('cls', 'c11').ok, true);
  assert.equal(p.hotbar.k2, null); assert.ok(!p.skills.g_t_aliento);
}
console.log('Activas de talento (libro y ranura 2), stats, tv y skillLv en recompute ✓');

// ------------------------------------------------ 6) Paragon, 7) build, configuraciones, código
{
  const h = mk('guerrero', 100);
  const g = h.g, p = h.p;
  g.chooseSpec('berserker');
  g._talentQuiet = true;                                          // el panel muestra sus avisos…
  const n0 = h.messages().length;
  const b = g.applyTalentBuild('brasa');
  assert.equal(b.ok, true); assert.equal(b.heroOpened, true);
  const opened = h.messages().slice(n0);
  assert.ok(opened.some(m => /Paragon abierto/.test(m)), '…pero la apertura del Paragon se avisa siempre');
  assert.ok(!opened.some(m => /Recomendado aplicado/.test(m)), 'el resto no');
  g._talentQuiet = false;
  const tree = T.talentTreesFor('guerrero').builds.brasa.hero;
  assert.equal(T.activeHeroTree(p).id, tree);
  const heroGrant = [...p.talentAgg.grants].find(id => /^g_h_/.test(id));
  assert.ok(heroGrant && p.skills[heroGrant] > 0, 'la activa del árbol héroe se conoce');
  const info = g.talentPointsInfo();
  assert.deepEqual([info.cls.left, info.spec.left, info.hero.left, info.hero.earned, info.heroOpen], [0, 0, 0, 10, true]);
  // pausa
  const leaf = T.treeOf(p, 'spec').nodes.find(n => !n.free && (p.talents.sp.berserker[n.id] | 0) > 0 && T.canRemoveRank(p, 'spec', n.id));
  p.hotbar.k2 = heroGrant;
  g._talentQuiet = true;
  const r = g.removeTalentRank('spec', leaf.id);
  g._talentQuiet = false;
  assert.equal(r.heroPaused, true);
  assert.match(last(h), /Paragon en pausa: te falta gastar 1 punto de especialización/);
  assert.equal(p.hotbar.k2, null, 'en pausa la activa del héroe sale de la barra');
  assert.equal(g.talentPointsInfo().heroPaused, true);
  assert.equal(g.addTalentRank('spec', leaf.id).heroOpened, true);
  // árbol héroe por el mixin
  const other = T.heroTreesFor('guerrero', 'berserker').find(x => x.id !== tree).id;
  assert.equal(g.chooseHeroTree(other).ok, true); assert.equal(T.activeHeroTree(p).id, other);
  assert.ok(!p.talentAgg.grants.has(heroGrant), 'otro árbol: otra activa');
  g.chooseHeroTree(tree);
  // configuraciones: guardar/renombrar/borrar también en combate; aplicar no
  g._inCombat = true;
  assert.equal(g.saveTalentLoadout('Mía').ok, true);
  assert.equal(g.renameTalentLoadout(0, 'Mía 2').ok, true);
  assert.equal(g.applyTalentLoadout(0).reason, 'combat');
  assert.equal(g.resetTalentTree('all').reason, 'combat');
  const code = g.exportTalentCode();
  assert.ok(code.startsWith('IRPG2-guerrero-berserker-'), 'exportar no exige estar fuera de combate');
  assert.equal(g.importTalentCode(code).reason, 'combat');
  g._inCombat = false;
  // reinicio y vuelta por la configuración
  assert.equal(g.resetTalentTree('cls').ok, true); assert.deepEqual(p.talents.cls, {});
  assert.equal(g.resetTalentTree('all').ok, true); assert.deepEqual(p.talents.sp.berserker, {});
  assert.match(last(h), /Talentos reiniciados/);
  assert.equal(g.applyTalentLoadout(0).ok, true);
  assert.equal(g.exportTalentCode(), code, 'la configuración devuelve la build');
  assert.equal(g.deleteTalentLoadout(0).ok, true); assert.deepEqual(p.talents.loadouts.berserker, []);
  // código en otro héroe
  const q = mk('guerrero', 100);
  const imp = q.g.importTalentCode(code);
  assert.equal(imp.ok, true); assert.equal(imp.heroOpened, true);
  assert.equal(q.p.talents.spec, 'berserker'); assert.equal(q.g.exportTalentCode(), code);
  assert.ok(q.p.talentAgg.grants.has(heroGrant));
  const old = q.g.importTalentCode('IRPG1-guerrero-berserker-0011-22');
  assert.equal(old.reason, 'code-version'); assert.match(last(q), /versión anterior/);
  // alias del panel de 2d
  assert.equal(q.g.applyTalentPreset().ok, true);
  assert.equal(q.g.exportTalentCode(), (() => { const z = mk('guerrero', 100); z.g.chooseSpec('berserker'); z.g.applyTalentBuild(); return z.g.exportTalentCode(); })(), 'applyTalentPreset = Recomendado de la especialización activa');
}
console.log('Paragon (avisos de apertura y pausa), build, configuraciones, reinicio y código por el mixin ✓');

// ------------------------------------------------ 8) indicadores de especialización
assert.deepEqual([...BASE_GAUGE_IDS].sort(), ['bastion', 'calor', 'cargas', 'concentracion', 'coto', 'escarcha', 'fervor', 'impulso', 'sed']);
for (const id of BASE_GAUGE_IDS) assert.ok(POWER_HOOKS[`gauge_${id}`] && gaugeIds().includes(id), `gauge_${id} registrado`);
for (const [cid, t] of Object.entries(T.TALENT_TREES)) for (const s of t.specs) {
  const h = mk(cid, 12, { spec: s.id });
  assert.equal(activeMechanic(h.p), s.mechanic, `${s.id} → ${s.mechanic}`);
  assert.ok(h.p.powers.has(`gauge_${s.mechanic}`));
  const v = gaugeView(h.p);
  assert.ok(v && v.id === s.mechanic && v.max > 0 && typeof v.name === 'string' && /^#/.test(v.color) && v.state === 'idle', `${s.id}: gaugeView`);
}
assert.equal(gaugeView(mk('guerrero', 9).p), null, 'sin especialización no hay indicador');
assert.throws(() => defineGauge('sed', { max: 1 }), /repetido/);
assert.throws(() => defineGauge('t_raro', { max: 1, foo: 1 }), /clave desconocida/);
const EV = [];
definePower('t_oye_indicador', { name: 'prueba', onGauge(g, p, id, ev) { EV.push(`${id}:${ev}`); } });
// Sed (Berserker)
{
  const h = mk('guerrero', 20, { spec: 'berserker' });
  const p = h.p;
  h.addPowers('t_oye_indicador');
  assert.equal(gainGauge(p, 'calor', 50), 0, 'solo se llena el indicador de TU especialización');
  p.takeDamage(p.stats.maxHP * 0.5, 1, {});
  const lost = (p.stats.maxHP - p.hp) / p.stats.maxHP * 100;
  assert.ok(approx(h.gaugeValue('sed'), lost, 1.2), `Sed: +1 por 1 % de vida perdida (${h.gaugeValue('sed').toFixed(1)} vs ${lost.toFixed(1)})`);
  const e = h.enemy({ hp: 1e6 });
  const before = h.gaugeValue('sed');
  for (let i = 0; i < 8; i++) h.g.onPlayerHit(e, { dealt: 5, raw: 5, crit: false, skill: 'g_rajar', tags: new Set(), elem: null, proc: false, dot: true, source: 'dot:g_rajar:bleed' });
  assert.ok(approx(h.gaugeValue('sed') - before, 10), 'Sangrado: +2 por tic, tope 10 por segundo');
  h.gauge('sed', 100);
  assert.ok(EV.includes('sed:full'), '⑩ onGauge(full)');
  assert.ok(p.gauges.sed.satedT > 0, 'Sed Saciada');
  assert.equal(gaugeView(p).state, 'active');
  h.tick(6.2);
  assert.equal(h.gaugeValue('sed'), 0); assert.ok(EV.includes('sed:empty'));
  h.gauge('sed', 50); p.sinceCombat = 0;
  h.tick(4); const at4 = h.gaugeValue('sed');
  h.tick(1); assert.ok(approx(at4 - h.gaugeValue('sed'), 8, 1.2), '−8/s fuera de combate');
}
// Bastión (Guardián, 2g): +1 por bloqueo (tope 5), −1 cada 2 s caminando y +1 cada 2 s plantado en combate
{
  const h = mk('guerrero', 20, { spec: 'guardian' });
  const p = h.p, B = gaugeTuning().bastion;
  p.equipment.offhand = { kind: 'item', slot: 'offhand', icon: '🛡️', baseName: 'Escudo', affixes: { block: 30 }, arm: 5, quality: 0 };
  p.recompute();
  assert.ok(p.stats.block > 0, 'con escudo hay bloqueo');
  p.combatRng = () => 0;                         // todo golpe se bloquea
  for (let i = 0; i < 7; i++) p.takeDamage(10, 1, { melee: true });
  assert.equal(h.gaugeValue('bastion'), 5, 'Bastión: +1 por bloqueo, tope 5');
  p.moving = true; p.planted = false;            // caminando (sin pasar por Player.update)
  firePower('onTick', p, h.g, p, B.moveLossEvery - 0.1);
  assert.equal(h.gaugeValue('bastion'), 5, 'caminando: aún no');
  firePower('onTick', p, h.g, p, 0.1);
  assert.equal(h.gaugeValue('bastion'), 4, `caminando pierde 1 cada ${B.moveLossEvery} s`);
  p.moving = false;
  assert.ok(spendGauge(p, 'bastion', 3)); assert.equal(h.gaugeValue('bastion'), 1);
  assert.equal(spendGauge(p, 'bastion', 2), false, 'no gasta lo que no tiene');
  // quieta: plantado a 1 s; en combate (el último golpe fue hace < 5 s), +1 cada 2 s plantado
  h.tick(1 + B.plantedEvery + 0.2);
  assert.ok(p.planted, 'plantado');
  assert.equal(h.gaugeValue('bastion'), 2, `plantado en combate: +1 cada ${B.plantedEvery} s`);
}
// Fervor (Cruzado, 2g): +1 cada 3 Tajos que aciertan (uno por golpe aunque alcance a varios), tope 3;
// la suelta perfecta y la detonación del Juicio las prueba test-gauges-guerrero
{
  const h = mk('guerrero', 20, { spec: 'cruzado' });
  const p = h.p, F = gaugeTuning().fervor;
  const f = h.enemy({ hp: 1e6 }), o = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  for (let i = 0; i < 3; i++) { h.hit(f, { skill: 'g_hendidura' }); p.simT += 0.1; }
  assert.equal(h.gaugeValue('fervor'), 0, 'otros golpes no cuentan');
  h.hit(f, { skill: 'g_tajo' }); h.hit(o, { skill: 'g_tajo' }); p.simT += 0.1;   // un Tajo que alcanza a dos
  h.hit(f, { skill: 'g_tajo' }); p.simT += 0.1;
  assert.equal(h.gaugeValue('fervor'), 0, 'un Tajo a dos enemigos cuenta una vez');
  h.hit(f, { skill: 'g_tajo' }); p.simT += 0.1;
  assert.equal(h.gaugeValue('fervor'), 1, `+1 cada ${F.basicHits} Tajos`);
  for (let i = 0; i < 9; i++) { h.hit(f, { skill: 'g_tajo' }); p.simT += 0.1; }
  assert.equal(h.gaugeValue('fervor'), F.max, `tope ${F.max}`);
}
// Calor (Piromante)
{
  const h = mk('maga', 20, { spec: 'piromante' });
  const p = h.p, e = h.enemy({ hp: 1e6 });
  for (let i = 0; i < 4; i++) { h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); p.simT += 0.1; }
  h.hit(e, { elem: 'fire', skill: 'bola_fuego' }); h.hit(e, { elem: 'fire', skill: 'bola_fuego' });
  assert.equal(h.gaugeValue('calor'), 25, '+5 por golpe de Fuego (un área cuenta una vez por instante)');
  h.hit(e, { elem: 'arcane', skill: 'rayo' }); p.simT += 0.1;
  assert.equal(h.gaugeValue('calor'), 25, 'otros elementos no dan Calor');
  h.gauge('calor', 100);
  const bf = resolveSkill(p, sk('maga', 'bola_fuego'));
  assert.ok(bf.cost === 0 && bf.forceCrit, 'Ignición Total: Bola de Fuego gratis y crítica');
  h.aim(4, 0); h.setSlot('rmb', 'bola_fuego');
  const mp = p.mp;
  assert.equal(h.cast('rmb'), true); assert.equal(p.mp, mp, 'no cobró maná');
  assert.equal(h.gaugeValue('calor'), 0, 'se consume al lanzarla');
  h.gauge('calor', 40); p.sinceCombat = 0;
  h.tick(3.0); const c3 = h.gaugeValue('calor'); h.tick(1);
  assert.ok(approx(c3 - h.gaugeValue('calor'), 10, 1.1), 'baja −10/s tras 3 s');
}
// Escarcha (Crionte, POR ENEMIGO)
{
  const h = mk('maga', 20, { spec: 'crionte' });
  const p = h.p;
  const e = h.enemy({ hp: 1e6 }), o = h.enemy({ hp: 1e6, pos: [3, 0, 0] });
  for (let i = 0; i < 4; i++) h.hit(e, { elem: 'frost', skill: 'm_toque' });
  assert.equal(h.gaugeValue('escarcha', e), 4); assert.equal(h.gaugeValue('escarcha', o), 0, 'las capas son por enemigo');
  assert.equal(gaugeView(p).value, 4);
  h.hit(e, { elem: 'frost', skill: 'm_toque' });
  assert.ok(e.frozenT > 0.9 && e.stunT > 0.9 && e.frozenT <= 1.0 + 1e-9, 'a 5 capas: Congelado 1 s');
  assert.equal(h.gaugeValue('escarcha', e), 0);
  h.hit(o, { elem: 'frost', skill: 'nova_hielo' });
  assert.equal(h.gaugeValue('escarcha', o), 2, 'Nova de Hielo +2');
  h.tick(2.05); assert.equal(h.gaugeValue('escarcha', o), 1, 'cae 1 capa cada 2 s');
  const b = h.enemy({ hp: 1e6, boss: true, pos: [0, 0, 3] });
  for (let i = 0; i < 5; i++) h.hit(b, { elem: 'frost', skill: 'm_toque' });
  assert.ok(b.numbT > 3.9 && b.stunT === 0, 'jefe: Aterido 4 s (no se congela)');
  assert.ok(b.stagger >= 25, `jefe: +25 de stagger (${b.stagger})`);
}
// Cargas Arcanas (Arcanista)
{
  const h = mk('maga', 20, { spec: 'arcanista' });
  const p = h.p, e = h.enemy({ hp: 1e6 });
  for (let i = 0; i < 6; i++) h.hit(e, { skill: 'm_dardo', elem: 'arcane' });
  assert.equal(h.gaugeValue('cargas'), 4, 'Dardo +1 por impacto, tope 4');
  assert.equal(firePower('condAdd', p, p, e, { skill: 'rayo' }), 140, 'Rayo: +35 % aditivo por carga');
  p.mp = 10;
  firePower('afterCast', p, h.g, p, { sk: sk('maga', 'rayo') }, { hits: 1 });
  assert.equal(h.gaugeValue('cargas'), 0, 'Rayo las consume todas'); assert.equal(p.mp, 30, '+5 de maná por carga');
  h.gauge('cargas', 3); h.tick(6.1);
  assert.equal(h.gaugeValue('cargas'), 0, 'se pierden 6 s después de la última ganancia');
}
// Concentración (Francotiradora, 2g): +15/s quieta, −25/s moviéndote, +0,15 % de crítico por punto;
// a 100 salta la Calma Absoluta (y ya no baja hasta que acaba), así que la pérdida se mira por debajo
{
  const h = mk('arquera', 20, { spec: 'francotiradora' });
  const p = h.p, C = gaugeTuning().concentracion;
  // los números del diseño 2g (docs/paso2g-arquera.md §7): fijados aquí mientras test-gauges-arquera
  // siga en cuarentena
  assert.ok(C.gainPerSec === 15 && C.losePerSec === 25 && C.critPerPoint === 0.15, 'Concentración: +15/s, −25/s, +0,15 % por punto');
  h.tick(1.0);
  assert.ok(approx(h.gaugeValue('concentracion'), C.gainPerSec), `+${C.gainPerSec}/s quieta`);
  h.gauge('concentracion', 80);
  assert.ok(approx(firePower('condCrit', p, p, null, {}), 80 * C.critPerPoint), `+${C.critPerPoint} % de crítico por punto`);
  p.moving = true; firePower('onTick', p, h.g, p, 1.0);
  assert.ok(approx(h.gaugeValue('concentracion'), 80 - C.losePerSec), `−${C.losePerSec}/s en movimiento`);
  p.moving = false;
  h.gauge('concentracion', 100);
  assert.ok(p.buffs.some(b => b.id === 'f_calma') && gaugeView(p).state === 'active', 'a 100: Calma Absoluta');
}
// Coto de Caza (Montaraz)
{
  const h = mk('arquera', 20, { spec: 'montaraz' });
  const p = h.p;
  h.g.spawnField('trampa', { pos: { x: 3, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  h.g.spawnField('trampa', { pos: { x: 5, z: 0 }, radius: 1.5, dur: 20, owner: p, data: { dmg: 1 } });
  assert.equal(h.gaugeValue('coto'), 2, 'valor = trampas armadas'); assert.equal(gaugeMax(p, 'coto'), 3);
  const c = h.enemy({ hp: 1e6 }), el = h.enemy({ hp: 1e6, rank: 'elite', pos: [0, 0, 4] }), el2 = h.enemy({ hp: 1e6, rank: 'elite', pos: [0, 0, -4] });
  h.hit(c, {}); assert.ok(!c.prey, 'un común no es Presa');
  h.hit(el, {}); assert.ok(el.prey, 'el primer élite golpeado es la Presa');
  h.hit(el2, {}); assert.ok(!el2.prey, 'solo una Presa a la vez');
  assert.equal(gaugeView(p).state, 'prey');
  h.tick(15.1); assert.ok(!el.prey, 'la Presa dura 15 s');
}
// Impulso (Tiradora)
{
  const h = mk('arquera', 20, { spec: 'tiradora' });
  const p = h.p, e = h.enemy({ hp: 1e6 });
  h.hit(e, { tags: ['proj'], skill: 'a_disparo' });
  assert.equal(h.gaugeValue('impulso'), 0, 'quieta no genera');
  for (let i = 0; i < 3; i++) { p.moving = true; h.hit(e, { tags: ['proj'], skill: 'a_disparo' }); p.simT += 0.2; }
  assert.equal(h.gaugeValue('impulso'), 9, '+3 por disparo en movimiento');
  const proj0 = resolveSkill(p, sk('arquera', 'flecha_multiple')).proj, aspd0 = p.stats.aspdPct;
  h.gauge('impulso', 100);
  assert.ok(p.buffs.some(b => b.id === 't_vendaval') && p.stats.aspdPct === aspd0 + 25, 'Vendaval: +25 % de vel. de ataque');
  assert.equal(resolveSkill(p, sk('arquera', 'flecha_multiple')).proj, proj0 + 1, '+1 proyectil a Flecha Múltiple');
  h.tick(6.1);
  assert.equal(h.gaugeValue('impulso'), 0);
}
{
  const h = mk('guerrero', 20, { spec: 'guardian' });
  h.addPowers('t_oye_indicador');
  EV.length = 0; gainGauge(h.p, 'bastion', 2); spendGauge(h.p, 'bastion', 2);
  assert.deepEqual(EV, ['bastion:gain', 'bastion:spent', 'bastion:empty'], '⑩ gain → spent → empty');
}
console.log('Indicadores: cada especialización activa el suyo; mecánica base de los 9 y ⑩ onGauge ✓');

console.log('\n✅ MIXIN DE TALENTOS v2 + INDICADORES (test65) OK');
