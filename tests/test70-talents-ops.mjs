// Paso 2g · E1 (W1) — operaciones del panel de talentos v2 (js/talents-ops.js) sobre el fixture
//  · sumar/restar rango con puertas (8/24 en clase), requisitos, puntos y nodos gratis
//  · estados de nodo para la UI; motivo al no poder quitar
//  · elecciones A/B (también pulsando la otra mitad de un nodo comprado)
//  · árbol héroe (Paragon): cerrado hasta 31/31, elegir árbol, pausa al bajar de 31, clave gratis
//  · build recomendada (applyBuild) y reinicios; la especialización conserva sus rangos
//  · configuraciones (≤ 10 por especialización), deshacer (snapshot/restore), talentsRev
//  · habilidades concedidas (grantsOf) y ámbito de un nodo (whichOf)
//  · códigos `reason` del conjunto cerrado TALENT_REASONS (en cada fallo y en el código fuente)
// El código IRPG2 se prueba entero en test79.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers/use-talents-fixture.mjs';
const T = await import('../js/talents.js');
const { createTalentOps, CODE_VERSION, LOADOUTS_MAX, LOADOUT_NAME_MAX, TALENT_REASONS } = await import('../js/talents-ops.js');

const ops = createTalentOps(T);
const hero = (classId, level) => ({ classId, level, talentsRev: 0, talents: T.normalizeTalents(null, classId) });
const no = (r, reason, re) => { assert.equal(r.ok, false, `debía fallar (${reason})`); assert.equal(r.reason, reason, `${r.reason}: ${r.text}`); if (re) assert.match(r.text, re); assert.equal(r.error, r.text); assert.ok(TALENT_REASONS.includes(r.reason), `«${r.reason}» fuera de TALENT_REASONS`); };
// conjunto cerrado de códigos: la UI (U1, U3) traduce por código; ningún archivo devuelve otro
{
  const src = ['../js/talents-ops.js', '../js/game-talents.js'].map(f => readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/fail\('([a-z-]+)'/g), ...src.matchAll(/reason: '([a-z-]+)'/g)].map(m => m[1]));
  assert.ok(used.size >= 12, `códigos encontrados en el fuente: ${[...used]}`);
  for (const r of used) assert.ok(TALENT_REASONS.includes(r), `talents-ops/game-talents devuelven «${r}», que no está en TALENT_REASONS`);
  assert.ok(Object.isFrozen(TALENT_REASONS));
}
const st = (p, w, id) => ops.nodeState(p, w, T.nodeById(T.treeOf(p, w), id));
const add = (p, w, ...ids) => { for (const id of ids) { const r = ops.addRank(p, w, id); assert.equal(r.ok, true, `${w}/${id}: ${r.text}`); } };
assert.throws(() => createTalentOps({}), /falta la API/);

// ------------------------------------------------ nivel bajo y estado ausente
{
  const p = hero('guerrero', 10);
  assert.equal(T.talentPointsLeft(p, 'cls'), 0);
  no(ops.addRank(p, 'cls', 'c1'), 'points', /No te quedan puntos de clase/);
  no(ops.addRank(p, 'spec', 'b1'), 'no-spec', /especialización/);
  no(ops.chooseSpec(hero('guerrero', 9), 'berserker'), 'level', /nivel 10/);
  no(ops.chooseSpec(p, 'pirata'), 'unknown');
  no(ops.addRank(p, 'cls', 'zz'), 'unknown');
  const q = { classId: 'guerrero', level: 12 };             // sin p.talents: ensure() lo crea
  add(q, 'cls', 'c1');
  assert.equal(q.talents.v, 2); assert.equal(q.talents.cls.c1, 1); assert.equal(q.talentsRev, 1);
}
console.log('Nivel bajo, especialización y estado ausente ✓');

// ------------------------------------------------ requisitos, puertas, puntos, quitar
{
  const p = hero('guerrero', 50);
  assert.equal(ops.chooseSpec(p, 'berserker').ok, true);
  no(ops.addRank(p, 'cls', 'c4'), 'req', /Requiere Temple al máximo/);
  add(p, 'cls', 'c1');
  no(ops.addRank(p, 'cls', 'c4'), 'req');
  add(p, 'cls', 'c1', 'c4');
  no(ops.addRank(p, 'cls', 'c1'), 'max', /máximo/);
  // quitar Temple rompería Coraza → bloqueado con el nombre de quien depende
  const blocked = ops.removeRank(p, 'cls', 'c1');
  no(blocked, 'req', /Coraza/);
  assert.match(st(p, 'cls', 'c1').removeBlock, /No puedes quitarlo: Coraza depende de él/);
  add(p, 'cls', 'c5', 'c8', 'c8', 'c11');                    // 2 + 1 + 1 + 2 + 1 = 7 en filas 0–3
  assert.equal(T.spentIn(T.treeOf(p, 'cls'), p.talents.cls, 4), 7);
  no(ops.addRank(p, 'cls', 'c15'), 'gate', /Gasta 8 puntos en las filas de arriba \(llevas 7\)/);
  add(p, 'cls', 'c2');
  add(p, 'cls', 'c15');                                       // 8 arriba: la puerta de la fila 4 se abre
  no(ops.removeRank(p, 'cls', 'c2'), 'req', /Vigor o Festín/);
  // estados para la UI
  assert.equal(st(p, 'cls', 'c1').state, 'max');
  assert.equal(st(p, 'cls', 'c4').state, 'partial');
  assert.equal(st(p, 'cls', 'c3').state, 'available');
  assert.equal(st(p, 'cls', 'c16').state, 'locked', 'requisito sin cumplir');
  assert.equal(st(p, 'spec', 'b0').state, 'free');
  assert.equal(st(p, 'spec', 'b1').state, 'available', 'b1 cuelga del nodo clave gratis');
  assert.equal(st(p, 'cls', 'c15').choice, 'A', 'una elección nueva arranca en A');
  no(ops.addRank(p, 'spec', 'b0'), 'free'); no(ops.removeRank(p, 'spec', 'b0'), 'free');
  no(ops.removeRank(p, 'cls', 'c30'), 'empty', /No tiene rangos/);
  // quitar una hoja sí
  const rev = p.talentsRev;
  assert.equal(ops.removeRank(p, 'cls', 'c15').ok, true);
  assert.equal(p.talents.cls.c15, undefined, 'a 0 rangos se borra la clave');
  assert.equal(p.talentsRev, rev + 1);
  // sin puntos libres: abierto pero no disponible
  const q = hero('maga', 12); ops.chooseSpec(q, 'piromante');
  add(q, 'spec', 's1', 's1');
  assert.equal(T.talentPointsLeft(q, 'spec'), 0);
  no(ops.addRank(q, 'spec', 's2'), 'points', /No te quedan puntos de especialización/);
  assert.equal(st(q, 'spec', 's2').state, 'open');
  const rev2 = q.talentsRev;
  ops.addRank(q, 'spec', 's2');
  assert.equal(q.talentsRev, rev2, 'un fallo no sube la revisión');
}
console.log('Requisitos, puertas (8 en la fila 4), puntos, quitar con motivo y estados ✓');

// ------------------------------------------------ elecciones A/B
{
  const p = hero('guerrero', 50);
  assert.equal(ops.setChoice(p, 'cls', 'c5', 'B').ok, true);
  assert.equal(p.talents.choice.c5, 'B');
  no(ops.setChoice(p, 'cls', 'c5', 'Z'), 'choice');
  no(ops.setChoice(p, 'cls', 'c1', 'A'), 'choice');
  assert.equal(ops.toggleChoice(p, 'cls', 'c5').ok, true); assert.equal(p.talents.choice.c5, 'A');
  add(p, 'cls', 'c1', 'c1');
  assert.equal(ops.addRank(p, 'cls', 'c5', 'B').ok, true); assert.equal(p.talents.choice.c5, 'B', 'comprar con la opción B');
  const left = T.talentPointsLeft(p, 'cls');
  const sw = ops.addRank(p, 'cls', 'c5', 'A');
  assert.equal(sw.ok, true); assert.equal(sw.changed, true); assert.equal(p.talents.choice.c5, 'A');
  assert.equal(T.talentPointsLeft(p, 'cls'), left, 'cambiar de opción no cuesta puntos');
  no(ops.addRank(p, 'cls', 'c5', 'A'), 'max');
  no(ops.addRank(p, 'cls', 'c1', 'A'), 'choice', /Opción no válida/);
}
console.log('Elecciones A/B (también pulsando la otra mitad) ✓');

// ------------------------------------------------ Paragon (árbol héroe)
{
  const p = hero('guerrero', 100);
  ops.chooseSpec(p, 'berserker');
  assert.equal(p.talents.hero.berserker.tree, T.heroTreesFor('guerrero', 'berserker')[0].id, 'árbol por defecto: el primero');
  no(ops.addRank(p, 'hero', 't1'), 'hero-closed', /31 puntos/);
  assert.equal(st(p, 'hero', 't1').state, 'locked');
  const b = ops.applyBuild(p, 'brasa');
  assert.equal(b.ok, true); assert.equal(b.heroOpened, true, 'aviso de apertura');
  const tree = T.talentTreesFor('guerrero').builds.brasa.hero;
  assert.equal(T.activeHeroTree(p).id, tree);
  assert.equal(Object.keys(p.talents.hero.berserker.nodes[tree]).length, 10);
  assert.equal(T.talentPointsLeft(p, 'hero'), 0);
  const key = T.findHero('guerrero', tree).nodes.find(n => n.free);
  assert.equal(st(p, 'hero', key.id).state, 'free');
  no(ops.addRank(p, 'hero', key.id), 'free');
  // otro árbol de la especialización: gratis, con sus propios nodos
  const other = T.heroTreesFor('guerrero', 'berserker').find(h => h.id !== tree);
  assert.equal(ops.chooseHeroTree(p, other.id).ok, true);
  assert.equal(T.activeHeroTree(p).id, other.id);
  assert.equal(T.talentPointsLeft(p, 'hero'), 10, 'el otro árbol empieza vacío');
  const k1 = other.nodes.find(n => !n.free && n.req?.includes(other.nodes.find(x => x.free).id));
  add(p, 'hero', k1.id);
  assert.equal(ops.whichOf(p, k1.id), 'hero');
  no(ops.chooseHeroTree(p, 'heraldo'), 'unknown', /no es de tu especialización/);
  assert.equal(ops.chooseHeroTree(p, tree).ok, true);
  assert.equal(Object.keys(p.talents.hero.berserker.nodes[tree]).length, 10, 'cada árbol conserva sus nodos');
  assert.equal(p.talents.hero.berserker.nodes[other.id][k1.id], 1);
  // pausa: bajar de 31/31 en la especialización
  const sp = T.treeOf(p, 'spec');
  const leaf = sp.nodes.find(n => !n.free && (p.talents.sp.berserker[n.id] | 0) > 0 && T.canRemoveRank(p, 'spec', n.id));
  const r = ops.removeRank(p, 'spec', leaf.id);
  assert.equal(r.ok, true); assert.equal(r.heroPaused, true); assert.equal(r.missing, 1);
  assert.equal(T.heroPaused(p), true);
  const someHero = Object.keys(p.talents.hero.berserker.nodes[tree])[0];
  assert.equal(st(p, 'hero', someHero).state, 'paused');
  assert.equal(st(p, 'hero', key.id).state, 'paused');
  no(ops.addRank(p, 'hero', someHero), 'hero-closed');
  assert.equal(ops.grantsOf(p, 'hero').every(g => !g.learned), true, 'en pausa no concede activas');
  const back = ops.addRank(p, 'spec', leaf.id);
  assert.equal(back.ok, true); assert.equal(back.heroOpened, true);
  assert.equal(T.heroPaused(p), false);
  // reiniciar el héroe vacía solo el árbol activo
  assert.equal(ops.resetTree(p, 'hero').ok, true);
  assert.deepEqual(p.talents.hero.berserker.nodes[tree], {});
  assert.equal(p.talents.hero.berserker.nodes[other.id][k1.id], 1);
  no(ops.chooseHeroTree(hero('guerrero', 100), tree), 'no-spec');
}
console.log('Paragon: cerrado hasta 31/31, árbol por especialización, pausa y reactivación ✓');

// ------------------------------------------------ build recomendada, reinicios y especialización
{
  const p = hero('guerrero', 30);
  no(ops.applyBuild(p), 'unknown', /no tiene build/);
  ops.chooseSpec(p, 'berserker');
  const a = ops.applyBuild(p);
  assert.equal(a.ok, true); assert.equal(a.key, T.defaultBuildKey('guerrero', 'berserker'));
  for (const w of ['cls', 'spec']) {
    const tree = T.treeOf(p, w);
    assert.ok(T.validRanks(tree, T.ranksOf(p, w), 30), `${w}: legal al Nv30`);
    assert.equal(T.spentIn(tree, T.ranksOf(p, w)), T.earnedAt(w, 30), `${w}: gasta lo que da el nivel`);
  }
  const bers = { ...p.talents.sp.berserker };
  // una build de otra especialización la elige y conserva la anterior
  const g = ops.applyBuild(p, 'glaciar');
  assert.equal(g.ok, true); assert.equal(g.spec, 'guardian'); assert.equal(p.talents.spec, 'guardian');
  assert.deepEqual(p.talents.sp.berserker, bers, 'Berserker conserva sus rangos');
  assert.equal(ops.chooseSpec(p, 'berserker').ok, true);
  assert.deepEqual(T.ranksOf(p, 'spec'), bers);
  no(ops.applyBuild(p, 'nada'), 'unknown');
  no(ops.applyBuild(hero('guerrero', 9), 'brasa'), 'level');
  assert.deepEqual([ops.applyPreset(p).ok, ops.applyPresetAll(p).ok], [true, true], 'alias del panel de 2d');
  // reinicio total: rangos y elecciones fuera; la especialización se queda
  assert.ok(Object.keys(p.talents.choice).length > 0);
  assert.equal(ops.resetAll(p).ok, true);
  assert.deepEqual(p.talents.cls, {}); assert.deepEqual(p.talents.sp.berserker, {});
  const ids = [...T.treeOf(p, 'cls').nodes, ...T.treeOf(p, 'spec').nodes].map(n => n.id);
  assert.ok(ids.every(id => !(id in p.talents.choice)), 'sin elecciones de esos árboles');
  assert.equal(p.talents.spec, 'berserker');
  assert.deepEqual(p.talents.sp.guardian, T.buildRanks(p, T.talentTreesFor('guerrero').builds.glaciar, { level: 30 }).sp.guardian, 'la otra especialización no se toca');
}
console.log('Build recomendada (y de otra especialización), reinicios y especialización por separado ✓');

// ------------------------------------------------ configuraciones
{
  const p = hero('maga', 100);
  no(ops.saveLoadout(p, 'x'), 'no-spec');
  ops.applyBuild(p, 'brasa');
  // lo que guarda una configuración: rangos y elecciones de la especialización activa y su árbol héroe
  const view = q => { const sp = q.talents.spec, h = T.activeHeroTree(q)?.id, st = q.talents.hero[sp];
    return { spec: sp, cls: q.talents.cls, sp: q.talents.sp[sp], choice: q.talents.choice, hero: h, nodes: st?.nodes?.[h] || {}, hch: st?.choice?.[h] || {} }; };
  const before = JSON.parse(JSON.stringify(view(p)));
  const s = ops.saveLoadout(p, '  Mi build de fuego con un nombre larguísimo  ');
  assert.equal(s.ok, true); assert.equal(s.index, 0);
  const l = p.talents.loadouts.piromante[0];
  assert.equal(l.name.length, LOADOUT_NAME_MAX); assert.ok(l.name.startsWith('Mi build de fuego'));
  assert.equal(l.hero.tree, T.activeHeroTree(p).id); assert.equal(Object.keys(l.hero.nodes).length, 10);
  assert.equal(ops.saveLoadout(p, '').ok, true); assert.equal(p.talents.loadouts.piromante[1].name, 'Configuración');
  // cambiar todo y volver con la configuración
  ops.applyBuild(p, 'cataclismo');
  assert.notDeepEqual(view(p), before);
  assert.notEqual(T.activeHeroTree(p).id, before.hero, 'cataclismo usa otro árbol héroe');
  const a = ops.applyLoadout(p, 0);
  assert.equal(a.ok, true); assert.equal(a.trimmed, false);
  assert.deepEqual(view(p), before, 'la configuración devuelve el mismo estado (rangos, elecciones y héroe)');
  // a menos nivel se recorta de forma legal
  p.level = 40;
  const t = ops.applyLoadout(p, 0);
  assert.equal(t.ok, true); assert.equal(t.trimmed, true);
  for (const w of ['cls', 'spec']) {
    assert.ok(T.validRanks(T.treeOf(p, w), T.ranksOf(p, w), 40));
    assert.ok(T.spentIn(T.treeOf(p, w), T.ranksOf(p, w)) <= T.earnedAt(w, 40));
  }
  assert.deepEqual(T.ranksOf(p, 'hero'), {}, 'sin Paragon al Nv40');
  p.level = 100;
  // renombrar, borrar, límites
  assert.equal(ops.renameLoadout(p, 1, 'Hielo').ok, true); assert.equal(p.talents.loadouts.piromante[1].name, 'Hielo');
  no(ops.renameLoadout(p, 1, '   '), 'unknown'); no(ops.renameLoadout(p, 7, 'x'), 'unknown');
  for (let i = 2; i < LOADOUTS_MAX; i++) assert.equal(ops.saveLoadout(p, `c${i}`).ok, true);
  no(ops.saveLoadout(p, 'once'), 'full', /10 configuraciones/);
  assert.equal(ops.deleteLoadout(p, 0).ok, true);
  assert.equal(p.talents.loadouts.piromante.length, LOADOUTS_MAX - 1); assert.equal(p.talents.loadouts.piromante[0].name, 'Hielo');
  no(ops.deleteLoadout(p, 50), 'unknown'); no(ops.applyLoadout(p, 50), 'unknown');
  // por especialización
  ops.chooseSpec(p, 'crionte');
  no(ops.applyLoadout(p, 0), 'unknown');
  assert.equal(ops.saveLoadout(p, 'cri').ok, true); assert.equal(p.talents.loadouts.crionte.length, 1);
  // sobreviven a normalizar (se guardan)
  const n = T.normalizeTalents(JSON.parse(JSON.stringify(p.talents)), 'maga');
  assert.equal(n.loadouts.piromante.length, LOADOUTS_MAX - 1); assert.equal(n.loadouts.crionte[0].name, 'cri');
}
console.log('Configuraciones: guardar, aplicar (con recorte), renombrar, borrar, 10 por especialización ✓');

// ------------------------------------------------ deshacer
{
  const p = hero('arquera', 80);
  ops.applyBuild(p, 'brasa');
  ops.saveLoadout(p, 'a');
  const snap = ops.snapshot(p), loads = JSON.stringify(p.talents.loadouts);
  ops.resetAll(p); ops.chooseSpec(p, 'montaraz'); ops.addRank(p, 'cls', 'c1');
  const rev = p.talentsRev;
  assert.notDeepEqual(JSON.parse(ops.snapshot(p)), JSON.parse(snap));
  assert.equal(ops.restore(p, snap).ok, true);
  assert.deepEqual(JSON.parse(ops.snapshot(p)), JSON.parse(snap), 'vuelve al estado guardado');
  assert.equal(JSON.stringify(p.talents.loadouts), loads, 'restore no toca las configuraciones');
  assert.equal(p.talentsRev, rev + 1);
  no(ops.restore(p, '{roto'), 'unknown');
  assert.deepEqual(JSON.parse(ops.snapshot(p)), JSON.parse(snap));
}
console.log('Deshacer (snapshot/restore) ✓');

// ------------------------------------------------ activas concedidas y ámbito de un nodo
{
  const p = hero('guerrero', 50);
  ops.chooseSpec(p, 'berserker');
  const list = ops.grantsOf(p, 'cls');
  assert.deepEqual(list.map(g => g.skill).sort(), ['g_t_aliento', 'g_t_bramido', 'g_t_intervencion']);
  assert.ok(list.every(g => g.choice && g.opt === 'A' && !g.learned));
  add(p, 'cls', 'c1', 'c1', 'c4', 'c5', 'c8', 'c8', 'c11');
  assert.equal(ops.grantsOf(p, 'cls').find(g => g.skill === 'g_t_aliento').learned, true, 'c11 con la opción A');
  ops.setChoice(p, 'cls', 'c11', 'B');
  assert.equal(ops.grantsOf(p, 'cls').find(g => g.skill === 'g_t_aliento').learned, false, 'con la B no');
  assert.deepEqual(ops.grantsOf(p, 'spec'), [], 'la especialización no concede activas (el kit está en el catálogo)');
  assert.equal(ops.whichOf(p, 'c11'), 'cls'); assert.equal(ops.whichOf(p, 'b3'), 'spec'); assert.equal(ops.whichOf(p, 'zz'), null);
  assert.ok(ops.exportCode(p).startsWith(`${CODE_VERSION}-guerrero-berserker-`));
}
console.log('Activas concedidas por elección y ámbito de cada nodo ✓');
console.log('\ntest70-talents-ops: OK');
