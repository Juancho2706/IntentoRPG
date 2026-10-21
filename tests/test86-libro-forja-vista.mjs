// Paso 2 (U2) · libro con forja, feedback de los verbos y vínculos con los talentos: los modelos
// PUROS de js/hud-model.js que pintan js/ui-skills.js (tecla T) y js/ui-verbs.js (cada frame)
// (docs/paso2-implementacion.md §3.12 · docs/paso2f-habilidades-ux.md §3 y §7.1):
//  1) bookView por ORIGEN con los catálogos reales (y los borradores 2g si están): grupos,
//     orden por categoría, CAT_LABELS, conocidas, kit de cada especialización, arte que existe
//  2) forgeView + chooseForge: Mejora y variantes (bloqueada/abierta/elegida), tags tachados y
//     añadidos, elemento, papeles, bloqueo en combate; bookTile (sello, «por elegir»); recoPlan
//  3) engarces: supportOptions (ok/incompatible/unknown/used) y supportsAfter
//  4) nodeSkills y talentLinks («Talentos que la tocan») sin mutar al jugador
//  5) specSnapshot + specSwapSummary (la tira al cambiar de especialización)
//  6) levelUpNews (aprendidas, Mejora a req+3, variantes a req+6, ranuras, puntos; aviso agrupado)
//  7) slotVerbs / slotView / verbView con el MOTOR REAL: cargas, relanzar, combo, secuencia,
//     postura, plantado, trampas, canal y la carga con G17 (inWindow del mismo frame) y Calma
//  8) los módulos de UI se importan sin DOM y devuelven su API vacía sin raíz
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import * as HM from '../js/hud-model.js';
import { CLASSES, SUPPORTS } from '../js/data.js';
import { CAT_LABELS, SLOT_UNLOCK, normalizeSkillDef, supportFits } from '../js/skill-defs.js';
import { isKnown, forgedDef } from '../js/skill-resolve.js';
import { talentTreesFor, findSpec, pointKindAt, TALENT_RULES } from '../js/talents.js';
import { makeHarness } from './helpers/power-harness.mjs';
import { verbHarness, verbSkill } from './fixtures/skills-verbs-sample.mjs';
import { createSkillBook } from '../js/ui-skills.js';
import { createVerbHud } from '../js/ui-verbs.js';
import { verbMarksPlan } from '../js/world-marks.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const has = rel => existsSync(join(ROOT, 'assets', String(rel).replace(/^assets\//, '')));
const snap = p => JSON.stringify({ f: p.skillForge, t: p.talents, s: p.skState, c: p.skCharges, h: p.hotbar, sup: p.supports, lv: p.level });
const line = 'Una línea corta de prueba';

// ------------------------------------------------ 1) bookView por origen
// catálogos 2g (borradores de KA en tools/convert-v2/out): si están, el libro se prueba también
// con ellos (lo que traerán KA1/KA2: kit de especialización, arte y forja)
const UP = { guerrero: 'GUERRERO', maga: 'MAGA', arquera: 'ARQUERA' };
const DRAFTS = {};
for (const cid of Object.keys(CLASSES)) {
  const f = join(ROOT, 'tools', 'convert-v2', 'out', cid, `skills-${cid}.draft.js`);
  if (!existsSync(f)) continue;
  const D = await import(pathToFileURL(f).href);
  DRAFTS[cid] = { skills: D[`${UP[cid]}_SKILLS`], forge: D[`${UP[cid]}_SKILL_FORGE`], reco: D[`${UP[cid]}_FORGE_RECO`] };
}
const withDraft = (p, cid) => {
  const D = DRAFTS[cid];
  p.cls = { ...CLASSES[cid], skills: D.skills.map(s => normalizeSkillDef(s.talent && !s.kind ? { ...s, kind: 'talent' } : s)), forge: D.forge, forgeReco: D.reco, catalogV: 2 };
  p.recompute();
  return p;
};
function checkBook(p, tag, { art = true } = {}) {
  const before = snap(p);
  const v = HM.bookView(p);
  assert.equal(snap(p), before, `${tag}: bookView no toca al jugador`);
  const spec = HM.specIdOf(p);
  const specs = talentTreesFor(p.classId).specs.map(s => s.id);
  assert.deepEqual(v.groups.map(g => g.id), spec ? ['base', 'spec', 'others'] : ['base', 'pre'], `${tag}: grupos por origen`);
  assert.equal(v.spec?.id || null, spec, `${tag}: especialización del libro`);
  const tiles = v.groups.flatMap(g => g.tiles || []);
  assert.equal(new Set(tiles.map(t => t.id)).size, tiles.length, `${tag}: cada habilidad una vez`);
  assert.deepEqual(v.order, tiles.map(t => t.id), `${tag}: ←/→ recorre las casillas en orden`);
  const skills = p.cls.skills;
  const by = new Map(skills.map(s => [s.id, s]));
  for (const g of v.groups.filter(x => x.tiles)) {
    for (let i = 1; i < g.tiles.length; i++) {
      const a = by.get(g.tiles[i - 1].id), b = by.get(g.tiles[i].id);
      const ka = [HM.CAT_ORDER[a.cat], a.req || 1], kb = [HM.CAT_ORDER[b.cat], b.req || 1];
      assert.ok(ka[0] < kb[0] || (ka[0] === kb[0] && ka[1] <= kb[1]), `${tag}/${g.id}: ${a.id} antes que ${b.id} (categoría, nivel)`);
    }
    assert.equal(g.known, g.tiles.filter(t => t.known).length, `${tag}/${g.id}: contador`);
  }
  for (const t of tiles) {
    const sk = by.get(t.id);
    assert.equal(t.catLabel, CAT_LABELS[sk.cat], `${tag}/${t.id}: etiqueta de CAT_LABELS`);
    assert.ok(t.catIcon && has(t.catIcon), `${tag}/${t.id}: icono de categoría ${t.catIcon}`);
    assert.equal(t.known, isKnown(p, sk), `${tag}/${t.id}: aprendida`);
    if (t.talent) assert.ok(t.known && ['TALENTO', 'PARAGON'].includes(t.tag), `${tag}/${t.id}: activa de talento solo si la tienes, con su etiqueta`);
    assert.equal(t.lockLv, !t.known && !sk.spec && sk.kind !== 'talent' ? (sk.req || 1) : null, `${tag}/${t.id}: candado con su nivel`);
    assert.equal(t.slotLabel, t.slot ? HM.SLOT_LABEL[t.slot] : null);
    if (t.todo) assert.ok(t.known && t.forge && !t.variant, `${tag}/${t.id}: «por elegir» solo con variantes abiertas sin elegir`);
    if (art) assert.ok(t.art && has(t.art), `${tag}/${t.id}: falta el arte assets/${t.art}`);
  }
  // completo: el kit base, el de tu especialización y el de las otras (en sus filas)
  const base = v.groups[0].tiles.map(t => t.id);
  for (const sk of skills) {
    if (!sk.spec && (sk.kind !== 'talent' || isKnown(p, sk))) assert.ok(base.includes(sk.id), `${tag}: ${sk.id} en el kit base`);
    else if (sk.spec && sk.spec === spec) assert.ok(v.groups[1].tiles.some(t => t.id === sk.id), `${tag}: ${sk.id} en el kit de ${spec}`);
    else if (sk.spec) assert.ok(v.groups.at(-1).rows.find(r => r.id === sk.spec)?.kit.some(k => k.id === sk.id), `${tag}: ${sk.id} en la fila de ${sk.spec}`);
  }
  const rows = v.groups.at(-1).rows;
  assert.deepEqual(rows.map(r => r.id), spec ? specs.filter(s => s !== spec) : specs, `${tag}: filas de especialización`);
  for (const r of rows) {
    assert.equal(r.lockLv, spec ? null : TALENT_RULES.specAt, `${tag}/${r.id}: candado al nivel ${TALENT_RULES.specAt} antes de elegir`);
    assert.ok(r.name && r.mechName, `${tag}/${r.id}: nombre y mecánica`);
    if (art) assert.ok(has(r.emblem), `${tag}/${r.id}: falta el emblema ${r.emblem}`);
    if (art) for (const k of r.kit) assert.ok(k.art && has(k.art), `${tag}/${r.id}/${k.id}: falta el arte ${k.art}`);
  }
  if (spec) {
    const sc = v.groups[1].spec;
    assert.ok(sc.mechanic && sc.mechName, `${tag}: la especialización trae su mecánica (barra en demo)`);
    if (art) assert.ok(has(sc.emblem), `${tag}: emblema ${sc.emblem}`);
  }
  assert.equal(v.known, tiles.filter(t => t.known).length);
  assert.equal(v.total, tiles.length);
  assert.equal(v.pending, tiles.filter(t => t.todo).length, `${tag}: «N variantes por elegir»`);
  return v;
}
let books = 0;
for (const cid of Object.keys(CLASSES)) {
  const specs = talentTreesFor(cid).specs.map(s => s.id);
  checkBook(makeHarness({ classId: cid, level: 5 }).p, `${cid} Nv 5`); books++;
  for (const spec of specs) { checkBook(makeHarness({ classId: cid, level: 30, spec }).p, `${cid} Nv 30 ${spec}`); books++; }
  if (DRAFTS[cid]) {
    const pre = checkBook(withDraft(makeHarness({ classId: cid, level: 5 }).p, cid), `${cid} 2g Nv 5`, { art: false });
    assert.ok(pre.groups.at(-1).rows.every(r => r.kit.length >= 3), `${cid} 2g: cada especialización enseña su kit antes del nivel 10`);
    for (const spec of specs) {
      const v = checkBook(withDraft(makeHarness({ classId: cid, level: 60, spec }).p, cid), `${cid} 2g Nv 60 ${spec}`, { art: false });
      assert.ok(v.groups[1].tiles.length >= 3, `${cid} 2g ${spec}: kit de especialización en el libro`);
      assert.ok(v.pending > 0 && v.groups[0].tiles.some(t => t.forge), `${cid} 2g ${spec}: forja con variantes por elegir (D3)`);
      books++;
    }
  }
}
assert.equal(HM.catLabel('spender'), CAT_LABELS.spender);
assert.ok(HM.K2_TABS.every(t => !/gastadora/i.test(t.label)), 'D14: sin «Gastadora» en lo que se lee');
console.log(`bookView: ${books} libros (${Object.keys(DRAFTS).length ? 'catálogos reales y 2g' : 'catálogos reales'}) por origen, por categoría, sin repetir, completos, con su arte ✓`);

// bookScale: el escenario de 1560 × 930 cabe en la pantalla
assert.equal(HM.bookScale(1920, 1080), 1);
assert.equal(HM.bookScale(1366, 768), 0.8);
for (const [w, h] of [[1920, 1080], [1600, 900], [1366, 768], [1280, 720], [2560, 1440], [3840, 2160], [1280, 1024]]) {
  const s = HM.bookScale(w, h);
  assert.ok(s >= 0.6 && s <= 1.25, `${w}×${h}: escala ${s}`);
  if (s > 0.6) assert.ok(HM.BOOK_SIZE.w * s <= w - 48 + 1 && HM.BOOK_SIZE.h * s <= h - 24 + 1, `${w}×${h}: el libro cabe (${s})`);
}
console.log('bookScale: 1 a 1920×1080, 0,8 a 1366×768 y el libro cabe en cada pantalla ✓');

// ------------------------------------------------ 2) forja: forgeView, chooseForge, bookTile, recoPlan
{
  const entry = {
    mejora: { name: 'Mango Largo', line, set: { 'charge.max': 1.6 } },
    vars: [
      { id: 'vx_martillo_i', name: 'Templado', role: 'UNI', line, set: { charge: { perfectPct: 80 } } },
      { id: 'vx_martillo_ii', name: 'Sacro', role: 'CTRL', line, elem: 'fire', tags: { add: ['zone'], remove: ['melee'] }, power: 'vx_v_sacro' },
    ],
  };
  const sk0 = verbSkill('vx_martillo');
  const at = lv => verbHarness('guerrero', { level: lv, spec: lv >= 10 ? 'berserker' : null, forge: { vx_martillo: entry } });
  // Nv 2: nada abierto
  let h = at(2), p = h.p, sk = HM.skillOf(p, 'vx_martillo');
  let fv = HM.forgeView(p, sk);
  assert.equal(fv.mejora.state, 'bloqueada'); assert.equal(fv.mejora.level, (sk0.req || 1) + 3);
  assert.ok(fv.vars.every(v => v.state === 'bloqueada' && v.level === (sk0.req || 1) + 6), 'variantes con candado a req+6');
  assert.equal(fv.pending, false);
  assert.deepEqual(fv.vars.map(v => [v.key, v.num, v.role, v.sisterRole]), [['i', 'I', 'UNI', 'CTRL'], ['ii', 'II', 'CTRL', 'UNI']]);
  assert.equal(fv.vars[1].roleLabel, HM.ROLE_INFO.CTRL.label); assert.equal(fv.vars[1].roleColor, HM.ROLE_INFO.CTRL.color);
  assert.match(fv.mejora.detail, /charge\.max/); assert.match(fv.vars[1].detail, /elemento Fuego/); assert.match(fv.vars[1].detail, /poder vx_v_sacro/);
  // la II tacha «Cuerpo a cuerpo» y «Sagrado», añade «Zona» y «Fuego» (cambia el elemento)
  assert.deepEqual(fv.vars[1].tagsAdd.map(t => t.label), ['Zona', 'Fuego']);
  assert.deepEqual(fv.vars[1].tagsDel.map(t => t.label), ['Cuerpo a cuerpo', 'Sagrado']);
  assert.deepEqual([fv.vars[0].tagsAdd, fv.vars[0].tagsDel], [[], []], 'la I no cambia tags');
  assert.deepEqual(fv.vars[1].elem, { from: 'holy', to: 'fire' });
  assert.equal(fv.vars[0].elem, null);
  assert.deepEqual(fv.verbs, ['charge']);
  assert.equal(fv.slots, 'DER o 2');
  // Nv 4: Mejora activa; Nv 7: variantes abiertas, nunca elegida → «por elegir»
  assert.equal(HM.forgeView(at(4).p, sk).mejora.state, 'abierta');
  h = at(30); p = h.p; sk = HM.skillOf(p, 'vx_martillo');
  const before = snap(p);
  fv = HM.forgeView(p, sk);
  assert.equal(snap(p), before, 'forgeView no toca al jugador');
  assert.ok(fv.vars.every(v => v.state === 'abierta') && fv.pending && fv.chosen === undefined, 'abiertas y por elegir (D3)');
  let tile = HM.bookTile(p, sk);
  assert.ok(tile.todo && !tile.variant && tile.forge, 'la casilla avisa «por elegir»');
  // recomendada de la especialización: estrella en la variante y en la casilla; «Recomendado» la elige
  p.cls.forgeReco = { berserker: { vx_martillo: 'i' } };
  fv = HM.forgeView(p, sk);
  assert.deepEqual(fv.vars.map(v => v.reco), [true, false]); assert.equal(fv.vars[0].recoSpec, findSpec('guerrero', 'berserker').name);
  assert.equal(HM.bookTile(p, sk, { reco: HM.recoFor(p, 'berserker') }).reco, 'i');
  assert.deepEqual(HM.recoPlan(p), [{ id: 'vx_martillo', v: 'i' }]);
  // elegir la II
  assert.equal(h.g.chooseForge('vx_martillo', 'ii').ok, true);
  fv = HM.forgeView(p, sk);
  assert.deepEqual(fv.vars.map(v => v.state), ['abierta', 'elegida']);
  assert.equal(fv.chosen, 'ii'); assert.equal(fv.variant, 'ii'); assert.equal(fv.pending, false);
  assert.equal(fv.elem, 'fire', 'la tarjeta enseña la forma forjada');
  tile = HM.bookTile(p, sk);
  assert.ok(tile.variant === 'ii' && !tile.todo, 'sello II en la casilla');
  assert.deepEqual(HM.recoPlan(p), [{ id: 'vx_martillo', v: 'i' }], 'la recomendada sigue pendiente si eliges otra');
  h.g.chooseForge('vx_martillo', 'i');
  assert.deepEqual(HM.recoPlan(p), [], 'con la recomendada elegida no hay nada que aplicar');
  // quitarla (null): ya no está «por elegir» (D3: se eligió no tener)
  h.g.chooseForge('vx_martillo', null);
  fv = HM.forgeView(p, sk);
  assert.ok(fv.vars.every(v => v.state === 'abierta') && !fv.pending && fv.chosen === null);
  // combate: bloqueada
  h.g.combatFree = false;
  assert.equal(HM.forgeView(p, sk, { combat: !h.g.canRespecFree() }).combat, true);
  assert.equal(h.g.chooseForge('vx_martillo', 'i').reason, 'combat');
  // rango y daño: el siguiente rango en verde mientras no sea el máximo
  const lo = HM.forgeView(at(2).p, sk);
  assert.ok(lo.dmg > 0 && lo.dmgNext > lo.dmg && lo.rank === 1 && lo.nextRankLv === (sk0.req || 1) + 8, 'daño y el del siguiente rango');
  // una habilidad sin forja y una activa de talento
  const plain = HM.forgeView(p, HM.skillOf(p, 'vx_tenso'));
  assert.ok(!plain.entry && !plain.mejora && plain.vars.length === 0);
  console.log('forgeView: Mejora/variantes bloqueada→abierta→elegida, tags tachados y añadidos, elemento, papeles, recomendada, combate ✓');
}

// ------------------------------------------------ 3) engarces
{
  const h = verbHarness('guerrero', { level: 30 });
  const p = h.p, sk = HM.skillOf(p, 'vx_martillo');
  const def = forgedDef(p, sk);
  const okSup = SUPPORTS.filter(s => supportFits(s, def));
  const bad = SUPPORTS.find(s => !supportFits(s, def));
  assert.ok(okSup.length >= 3 && bad, 'hay soportes que encajan y uno que no');
  p.knownSupports = [okSup[0].id, okSup[1].id, bad.id];
  p.supports = { vx_martillo: [okSup[0].id] };
  const st = Object.fromEntries(HM.supportOptions(p, sk, 1).map(o => [o.id, o.state]));
  assert.equal(st[okSup[0].id], 'used', 'en el otro engarce');
  assert.equal(st[okSup[1].id], 'ok');
  assert.equal(st[bad.id], 'incompatible');
  assert.equal(st[okSup[2].id], 'unknown', 'aún no lo tienes');
  assert.ok(HM.supportOptions(p, sk, 0).find(o => o.id === okSup[0].id).current);
  assert.deepEqual(HM.supportsAfter(p, sk, 1, okSup[1].id), [okSup[0].id, okSup[1].id]);
  assert.deepEqual(HM.supportsAfter(p, sk, 1, okSup[0].id), [okSup[0].id], 'sin repetidos');
  assert.deepEqual(HM.supportsAfter(p, sk, 0, null), [], 'quitar');
  assert.deepEqual(HM.supportsAfter(p, sk, 5, okSup[1].id), [okSup[0].id], 'fuera de los huecos no se escribe');
  const fv = HM.forgeView(p, sk);
  assert.equal(fv.sockets, 2); assert.equal(fv.supports[0].id, okSup[0].id); assert.equal(fv.supports[1], null);
  console.log('Engarces: ok / incompatible / unknown / used, sin repetidos y dentro de los huecos ✓');
}

// ------------------------------------------------ 4) nodeSkills y talentLinks
{
  const node = { touch: ['a', '@fire'], fx: { mod: { b: {}, '@spec': {} }, skillLv: { c: 1 }, grant: 'd' }, opts: [{ touch: ['e'], fx: { grant: 'f' } }] };
  assert.deepEqual(HM.nodeSkills(node), ['a', 'b', 'c', 'd', 'e', 'f'], 'touch, mod, skillLv, grant y las opciones; sin selectores @');
  assert.deepEqual(HM.nodeSkills(node, [{ id: 'c' }, { id: 'f' }, { id: 'z' }]).map(s => s.id), ['c', 'f'], 'con catálogo: solo las que existen');
  assert.deepEqual(HM.nodeSkills(null), []);
  let links = 0;
  for (const cid of Object.keys(CLASSES)) {
    const T = talentTreesFor(cid);
    const node = T.cls.nodes.find(n => !n.free && HM.nodeSkills(n).some(id => HM.skillOf({ classId: cid }, id)));
    assert.ok(node, `${cid}: algún nodo de clase nombra una habilidad del catálogo`);
    const skillId = HM.nodeSkills(node).find(id => HM.skillOf({ classId: cid }, id));
    const off = makeHarness({ classId: cid, level: 30, spec: T.specs[0].id }).p;
    const on = makeHarness({ classId: cid, level: 30, spec: T.specs[0].id, talents: { cls: { [node.id]: 1 } } }).p;
    const b = snap(on);
    const L1 = HM.talentLinks(on, skillId), L0 = HM.talentLinks(off, skillId);
    assert.equal(snap(on), b, 'talentLinks no toca al jugador');
    const a1 = L1.find(l => l.id === node.id), a0 = L0.find(l => l.id === node.id);
    assert.ok(a1 && a1.which === 'cls' && a1.bought && a1.rank === 1, `${cid}/${node.id}: comprado (✓) con su rango`);
    assert.ok(a0 && !a0.bought && a0.rank === 0, `${cid}/${node.id}: sin comprar`);
    for (const l of L1) {
      const tree = l.which === 'cls' ? T.cls.nodes : l.which === 'spec' ? findSpec(cid, T.specs[0].id).nodes : null;
      if (tree) assert.ok(HM.nodeSkills(tree.find(n => n.id === l.id)).includes(skillId), `${l.id} nombra ${skillId}`);
      assert.equal(l.bought, l.rank > 0);
    }
    links += L1.length;
  }
  console.log(`nodeSkills y talentLinks: ${links} vínculos, comprados con ✓ y su rango, sin mutar ✓`);
}

// ------------------------------------------------ 5) cambio de especialización
{
  const S = d => ({ icon: '🧪', desc: 'prueba', req: 10, elem: 'physical', ...d });
  const skills = [
    S({ id: 'vx_ins_ber', name: 'Insignia Berserker', cat: 'spec', spec: 'berserker', tags: ['spec', 'buff', 'physical'], type: 'buff', cd: 10, dur: 3, buff: { dr: 5 } }),
    S({ id: 'vx_ins_gua', name: 'Insignia Guardián', cat: 'spec', spec: 'guardian', tags: ['spec', 'buff', 'physical'], type: 'buff', cd: 10, dur: 3, buff: { dr: 5 } }),
    S({ id: 'vx_t_viejo', name: 'Activa Vieja', kind: 'talent', cat: 'defense', tags: ['defense', 'buff', 'physical'], type: 'buff', cd: 10, dur: 3, buff: { dr: 5 } }),
    S({ id: 'vx_t_nueva', name: 'Activa Nueva', kind: 'talent', cat: 'utility', tags: ['utility', 'buff', 'physical'], type: 'buff', cd: 10, dur: 3, buff: { dr: 5 } }),
  ];
  const h = verbHarness('guerrero', { level: 30, spec: 'berserker', skills });
  const p = h.p;
  p.cls.forgeReco = { guardian: { vx_martillo: 'ii' } };
  p.talentExtra.grants.add('vx_t_viejo'); p.recompute();
  p.hotbar.k3 = 'vx_ins_ber';
  const prev = HM.specSnapshot(p);
  assert.equal(prev.spec, 'berserker'); assert.ok(prev.grants.includes('vx_t_viejo'));
  p.talents = { ...p.talents, spec: 'guardian' };
  p.talentExtra.grants.delete('vx_t_viejo'); p.talentExtra.grants.add('vx_t_nueva');
  p.recompute();
  p.hotbar.k3 = 'vx_ins_gua';
  const sum = HM.specSwapSummary(prev, p);
  assert.equal(sum.spec.id, 'guardian'); assert.equal(sum.from.id, 'berserker');
  assert.equal(sum.insignia.from.id, 'vx_ins_ber'); assert.equal(sum.insignia.to.id, 'vx_ins_gua');
  assert.deepEqual(sum.grantsIn.map(g => g.id), ['vx_t_nueva']); assert.deepEqual(sum.grantsOut.map(g => g.id), ['vx_t_viejo']);
  assert.deepEqual(sum.reco.map(r => [r.id, r.variant]), [['vx_martillo', 'ii']]);
  assert.equal(sum.mechanic.id, findSpec('guerrero', 'guardian').mechanic);
  assert.equal(sum.bar.k3, 'vx_ins_gua');
  console.log('specSwapSummary: insignia vieja → nueva, activas que entran y salen, recomendadas, mecánica y barra ✓');
}

// ------------------------------------------------ 6) levelUpNews
{
  const entry = { mejora: { name: 'Mango Largo', line, set: { 'charge.max': 1.6 } },
    vars: [{ id: 'vx_martillo_i', name: 'Templado', role: 'UNI', line }, { id: 'vx_martillo_ii', name: 'Sacro', role: 'CTRL', line }] };
  const p = verbHarness('guerrero', { level: 30, forge: { vx_martillo: entry } }).p;
  const req = verbSkill('vx_martillo').req || 1;
  const n1 = HM.levelUpNews(p, req + 2, req + 3);
  assert.ok(n1.items.some(i => i.kind === 'mejora' && i.id === 'vx_martillo'), 'Mejora a req+3');
  const n2 = HM.levelUpNews(p, req + 5, req + 6);
  assert.ok(n2.items.some(i => i.kind === 'vars' && i.id === 'vx_martillo' && /Templado o Sacro/.test(i.line)), 'variantes a req+6');
  // todo lo de un salto de nivel: aprendidas (base, sin especialización), ranuras y puntos
  for (const [a, b] of [[0, 1], [5, 8], [9, 12], [1, 20]]) {
    const n = HM.levelUpNews(p, a, b);
    for (let L = a + 1; L <= b; L++) {
      for (const sk of p.cls.skills.filter(s => !s.spec && s.kind !== 'talent' && (s.req || 1) === L))
        assert.ok(n.items.some(i => i.kind === 'learn' && i.id === sk.id), `Nv ${L}: aprendes ${sk.id}`);
      for (const [slot, lv] of Object.entries(SLOT_UNLOCK)) if (lv === L && lv > 1) assert.ok(n.items.some(i => i.kind === 'slot' && i.slot === slot), `Nv ${L}: ranura ${slot}`);
      if (pointKindAt(L)) assert.ok(n.items.some(i => i.kind === 'points' && i.system === pointKindAt(L)), `Nv ${L}: punto ${pointKindAt(L)}`);
    }
    assert.equal(n.count, n.items.length); assert.equal(n.level, b);
    assert.equal(n.first, n.items.find(i => i.id)?.id || null, 'el aviso abre el libro en la primera');
    if (n.count > 1) assert.equal(n.title, `Nivel ${b}: ${n.count} novedades`, 'varias → UNA tarjeta agrupada');
    if (n.count === 1) assert.ok(n.title.startsWith(`Nivel ${b} · `));
  }
  assert.equal(HM.levelUpNews(p, 7, 7).count, 0, 'sin subir, nada');
  console.log('levelUpNews: aprendidas, Mejora (req+3), variantes (req+6), ranuras y puntos; aviso agrupado ✓');
}

// ------------------------------------------------ 7) verbos con el motor real
{
  const h = verbHarness('guerrero', { level: 40 });
  const { p, g } = h;
  const sv = slot => HM.slotView(p, HM.skillOf(p, p.hotbar[slot]), p.resolved?.[p.hotbar[slot]] || null, 0.2, { g, slot });
  const vv = slot => HM.verbView(g).slots[slot];
  p.hotbar = { lmb: p.hotbar.lmb, rmb: 'vx_martillo', k1: 'vx_paso', k2: 'vx_guardia', k3: null, k4: null };
  p.recompute();
  // cargas de enfriamiento (3): con una carga la ranura está lista aunque recargue
  assert.deepEqual([vv('k1').charges.n, vv('k1').charges.max], [3, 3]);
  h.cast('k1'); h.step(0.05);
  let c = vv('k1').charges;
  assert.equal(c.n, 2); assert.ok(c.nextSec > 5 && c.nextSec <= 6 && c.nextFrac > 0.8, 'la siguiente recarga en ~6 s');
  assert.equal(sv('k1').cdFrac, 0, 'con cargas, sin enfriamiento en la ranura');
  for (let i = 0; i < 2; i++) { g.resetGcd?.(p); p.gcdT = 0; h.step(0.3); h.cast('k1'); }
  h.step(0.05);
  c = vv('k1').charges;
  assert.equal(c.n, 0, 'sin cargas'); assert.ok(sv('k1').cdSec > 0, 'sin cargas, la ranura espera a la siguiente');
  h.tick(6);
  assert.ok(vv('k1').charges.n >= 1, 'recarga perezosa calculada sin tocar el estado');
  // postura: el modo activo con su color; la segunda pulsación cambia de modo
  h.cast('k2'); h.step(0.1);
  let s = vv('k2').stance;
  assert.ok(s && s.mode === 'escudo' && s.idx === 0 && s.n === 2 && s.color === HM.STANCE_COLORS[0], 'postura: modo 1 con su color');
  h.tick(1.2); h.cast('k2'); h.step(0.1);
  s = vv('k2').stance;
  assert.equal(s.mode, 'espada'); assert.equal(s.color, HM.STANCE_COLORS[1]);
  const mp = verbMarksPlan(g);
  assert.ok(mp.stance && mp.stance.color === s.color, 'marca de mundo: aro a los pies del color del modo');

  // relanzar: usos y tiempo; «justo» en los últimos perfectLast s
  p.hotbar.rmb = 'vx_andanada'; p.recompute(); p.mp = 999;
  h.cast('rmb'); h.step(0.1);
  let r = vv('rmb').recast;
  assert.ok(r && r.left >= 1 && r.n === 3 && !r.perfect && r.frac > 0.8, 'ventana abierta');
  assert.equal(sv('rmb').cdFrac, 0, 'con la ventana abierta se relanza sin esperar');
  h.tick(1.6);
  r = vv('rmb').recast;
  assert.ok(r && r.perfect && r.t <= 0.5, 'tiempo justo en los últimos 0,5 s');
  h.tick(1);
  assert.equal(vv('rmb').recast, null, 'ventana cerrada');

  // combo de 3: el paso que toca y vuelta al primero
  p.hotbar.rmb = 'vx_combo'; p.recompute();
  assert.equal(vv('rmb').combo.idx, 0);
  h.cast('rmb'); h.step(0.6);
  assert.equal(vv('rmb').combo.idx, 1, 'tras el 1.º, toca el 2.º');
  h.tick(4);
  assert.equal(vv('rmb').combo.idx, 0, 'pasado el tiempo, vuelve al 1.º');

  // secuencia: el 3.º es el especial
  p.hotbar.rmb = 'vx_tercera'; p.recompute();
  assert.deepEqual([vv('rmb').seq.count, vv('rmb').seq.ready], [0, false]);
  h.aim(6, 0);
  for (let i = 0; i < 2; i++) { h.cast('rmb'); h.tick(0.6); }
  assert.deepEqual([vv('rmb').seq.count, vv('rmb').seq.ready], [2, true], 'el siguiente es el especial');

  // plantado: solo si la habilidad lo usa; 1 s quieto
  p.hotbar.rmb = 'vx_terremoto'; p.recompute();
  p.unplant();
  assert.equal(vv('rmb').planted, false);
  assert.equal(verbMarksPlan(g).planted, null);
  h.tick(1.3);
  assert.equal(vv('rmb').planted, true, 'plantado tras 1 s quieto');
  assert.ok(verbMarksPlan(g).planted, 'marca de mundo: anillo bajo los pies');
  p.hotbar.rmb = 'vx_martillo'; p.recompute();
  assert.equal(vv('rmb').planted, null, 'sin habilidad que lo use, no se enseña');

  // trampas armadas de la habilidad (contador de la ranura) y su tope
  p.hotbar.k2 = 'vx_cepo'; p.recompute();
  h.aim(5, 0); h.cast('k2'); h.tick(0.8);
  const tr = vv('k2').traps;
  assert.ok(tr && tr.n === 1 && tr.max === 2, 'una trampa armada de 2');

  // canal enganchable y sin fin
  p.hotbar.rmb = 'vx_rayo'; p.recompute();
  h.cast('rmb'); h.step(0.3);
  let ch = vv('rmb').channel;
  assert.ok(ch && ch.toggle && !ch.endless && ch.frac < 1 && ch.frac > 0.5, 'canal enganchado que se consume');
  h.tick(3);
  assert.equal(vv('rmb').channel, null);
  p.hotbar.rmb = 'vx_carrera'; p.recompute(); p.mp = p.stats.maxMP;
  h.press('rmb'); h.step(0.5);
  ch = vv('rmb').channel;
  assert.ok(ch && ch.endless && ch.frac === 1, 'canal sin fin: aro lleno que late');
  h.release('rmb'); h.step(0.3);
}
// G17: la marca de la ventana en el MISMO frame en que el motor entra (verbView lee inWindow)
{
  for (const dt of [1 / 60, 1 / 144, 1 / 30]) {
    const h = verbHarness('guerrero', { level: 40 });
    const { p, g } = h;
    p.hotbar.rmb = 'vx_martillo'; p.recompute(); p.mp = 999;
    h.press('rmb');
    let frames = 0, inside = 0, first = -1;
    for (let i = 0; i < Math.ceil(1.15 / dt); i++) {
      h.step(dt, dt);
      const ch = g._charging;
      if (!ch) break;
      const v = HM.verbView(g);
      frames++;
      assert.equal(v.charge.inWindow, !!ch.inWindow, `dt ${dt.toFixed(4)} · frame ${i}: misma ventana que el motor`);
      assert.equal(v.slots.rmb.charge.inWindow, !!ch.inWindow);
      assert.equal(v.charge.slot, 'rmb');
      assert.ok(Math.abs(v.charge.frac - ch.u / v.charge.max) < 1e-9, 'relleno = u / máximo');
      assert.ok(v.charge.lo < v.charge.hi && v.charge.lo > v.charge.minFrac, 'ventana dorada dentro de la barra');
      if (ch.inWindow) { inside++; if (first < 0) first = i; }
    }
    assert.ok(frames > 10 && inside > 0 && first > 0, `dt ${dt.toFixed(4)}: la carga pasa por la ventana (${inside} frames)`);
    h.release('rmb'); h.step(0.3);
  }
  // Calma Absoluta: perfecta desde media carga (toda la barra dorada)
  const h = verbHarness('guerrero', { level: 40 });
  h.p.hotbar.rmb = 'vx_martillo'; h.p.talentExtra.stats = { perfectAlways: 1 }; h.p.recompute(); h.p.mp = 999;
  h.press('rmb'); h.step(0.75, 1 / 60);
  const cv = HM.verbView(h.g).charge;
  assert.ok(cv.calm && cv.perfectNow && !cv.inWindow, 'Calma: soltar a media carga es perfecto');
  assert.ok(Math.abs(cv.calmLo - (cv.min + 0.5 * (cv.max - cv.min)) / cv.max) < 1e-9);
  h.release('rmb');
  // la barra junto al cursor: encima, debajo si no cabe y siempre dentro
  assert.deepEqual(HM.cursorBarPos(500, 400, 1920, 1080), { x: 468, y: 370 });
  assert.deepEqual(HM.cursorBarPos(500, 10, 1920, 1080), { x: 468, y: 34 }, 'arriba del todo → debajo del cursor');
  assert.deepEqual(HM.cursorBarPos(1918, 1079, 1920, 1080), { x: 1848, y: 1049 }, 'esquina: dentro de la pantalla');
  assert.deepEqual(HM.cursorBarPos(0, 0, 1366, 768), { x: 8, y: 24 });
  console.log('Verbos (motor real): cargas, postura, relanzar y tiempo justo, combo, secuencia, plantado, trampas, canal; G17 a 60/144/30 Hz y Calma ✓');
}

// ------------------------------------------------ 8) módulos de UI sin DOM
{
  const book = createSkillBook(null, { game: null });
  assert.deepEqual(book.check(), { panel: 'skills', overlaps: [], offscreen: [] });
  for (const k of ['open', 'close', 'refresh', 'check']) assert.equal(typeof book[k], 'function');
  const hud = createVerbHud(null, { game: null });
  assert.equal(typeof hud.update, 'function');
  hud.update(0.016);
  console.log('ui-skills y ui-verbs se importan sin DOM y sin raíz devuelven su API vacía ✓');
}

console.log('\n✅ LIBRO CON FORJA, VERBOS Y VÍNCULOS (Paso 2 · U2) OK');
