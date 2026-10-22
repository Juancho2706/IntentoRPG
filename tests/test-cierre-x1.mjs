// ============================================================
// Paso 2 · E5 (X1) — peticiones de motor de los workers de la sensación, verificadas en el juego:
//   W  cambio de mundo: worldResetProjectiles avisa a cada proyectil (onWorldReset) y Game.loadWorld
//      lo llama antes de vaciar g.projectiles
//   B  «Recomendado» guarda la build aplicada por especialización (talents.build), se conserva al
//      normalizar y al guardar, y el libro recomienda SU forja (hud-model.recoFor); sin ella, la de
//      por defecto
//   D  VERB_DOC documenta detonate.self (con MARK_SELF_AGE) y el targetR de fanSpread
//   M  el estado genérico «marca» del marco del objetivo con las marcas reales de las tres clases
//      (Juicio, Punto Débil, Marca del Tiempo y Marca del Halcón)
// Cada apartado falla sin su arreglo (uno roto no tapa a los demás; al final, exit 1 si alguno falla).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeHarness } from './helpers/power-harness.mjs';
import { talentMethods } from '../js/game-talents.js';
import { worldResetProjectiles, MARK_SELF_AGE } from '../js/game-skills.js';
import { serializePlayer } from '../js/save-schema.js';
import { Player } from '../js/entities.js';
import { normalizeTalents, forgeRecoFor } from '../js/talents.js';
import { FORGE_RECO, CLASSES } from '../js/data.js';
import { VERB_DOC } from '../js/skill-defs.js';
import * as HM from '../js/hud-model.js';

const MAIN = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const json = o => JSON.parse(JSON.stringify(o));
const fails = [];
let checks = 0;
const ok = (c, m) => { checks++; assert.ok(c, m); };
const eq = (a, b, m) => { checks++; assert.deepStrictEqual(a, b, m); };
function section(name, fn) {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { fails.push(name); console.error(`✗ ${name}\n    ${e.message.split('\n')[0]}`); }
}
const skill = (cid, id) => CLASSES[cid].skills.find(s => s.id === id);

// ------------------------------------------------ W · cambio de mundo
section('W · worldResetProjectiles avisa a cada proyectil con onWorldReset (el fallo de uno no corta a los demás)', () => {
  const log = [];
  const warn = console.warn; console.warn = () => {};
  try {
    const list = [{ onWorldReset() { log.push('a'); } }, { kind: 'flecha' }, { onWorldReset() { throw new Error('roto'); } }, { onWorldReset() { log.push('d'); } }];
    eq(worldResetProjectiles(list), 3, 'tres con aviso');
    eq(log, ['a', 'd'], 'los demás reciben el suyo aunque uno lance');
    eq(worldResetProjectiles(null), 0, 'sin lista, nada');
  } finally { console.warn = warn; }
});
section('W · Game.loadWorld avisa a los proyectiles ANTES de vaciar g.projectiles y los grupos', () => {
  const m = /\n {2}loadWorld\(spec\) \{/.exec(MAIN);
  ok(m, 'main.js define loadWorld');
  const body = MAIN.slice(m.index, MAIN.indexOf('\n  }\n', m.index));
  const iReset = body.indexOf('worldResetProjectiles(this.projectiles)');
  ok(iReset > 0, 'loadWorld llama a worldResetProjectiles(this.projectiles)');
  ok(iReset < body.indexOf('this.projectiles = []'), 'antes de vaciar la lista');
  ok(iReset < body.indexOf('clearGroup(this.fxGroup)'), 'y antes de vaciar los grupos de efectos');
  ok(/import \{[^}]*worldResetProjectiles[^}]*\} from '\.\/game-skills\.js'/.test(MAIN), 'main.js lo importa de game-skills');
});

// ------------------------------------------------ B · build del «Recomendado»
section('B · «Recomendado» guarda su build y el libro recomienda su forja (Arcanista: Grieta Eterna canaliza el Desgarro)', () => {
  const h = makeHarness({ classId: 'maga', level: 40, spec: 'arcanista' });
  Object.assign(h.g, talentMethods);
  const p = h.p;
  const def = forgeRecoFor('maga', 'arcanista');
  ok(def.m_u_desgarro === 'ii' && def.m_u_desgarro === FORGE_RECO.arcanista.m_u_desgarro, 'la de por defecto (build Rayo) recomienda Quiebre');
  eq(p.talents.build, undefined, 'sin Recomendado aplicado, sin build');
  eq(HM.recoFor(p, 'arcanista'), def, 'sin build: la de por defecto');
  const r = h.g.applyTalentBuild('grieta');
  ok(r.ok, `applyTalentBuild (${r.text || r.reason || ''})`);
  eq(p.talents.build, { arcanista: 'grieta' }, 'guarda la build aplicada');
  const grieta = forgeRecoFor('maga', 'arcanista', 'grieta');
  eq(HM.recoFor(p, 'arcanista'), grieta, 'el libro recomienda la forja de esa build');
  eq(grieta.m_u_desgarro, null, 'Grieta Eterna: el Desgarro sin variante (canalizado)');
  // el libro: con Quiebre elegido propone volver al canal (con la build por defecto, no)
  p.skillForge.m_u_desgarro = 'ii'; p.recompute();
  ok(HM.recoPlan(p).some(x => x.id === 'm_u_desgarro' && x.v === null), `«Recomendado» del libro propone quitar Quiebre (${JSON.stringify(HM.recoPlan(p))})`);
  const fv = HM.forgeView(p, skill('maga', 'm_u_desgarro'));
  ok(fv.vars.every(v => !v.reco), 'la forja no marca Quiebre como recomendada');
  // se guarda y se carga
  const back = new Player(h.g, 'maga', json(serializePlayer(p)));
  eq(back.talents.build, { arcanista: 'grieta' }, 'se guarda y se carga');
  eq(HM.recoFor(back, 'arcanista'), grieta, 'y al cargar el libro sigue con esa build');
  // otra especialización guarda la suya sin pisar la anterior
  ok(h.g.applyTalentBuild('brasa').ok, 'Recomendado de la Piromante');
  eq(p.talents.build, { arcanista: 'grieta', piromante: 'brasa' }, 'una build por especialización');
});
section('B · normalizeTalents conserva solo builds válidas de su especialización', () => {
  const t = normalizeTalents({ v: 2, spec: 'arcanista', build: { arcanista: 'brasa', crionte: 'no_existe', piromante: 'brasa', zz: 'grieta' } }, 'maga');
  eq(t.build, { piromante: 'brasa' }, 'fuera la de otra especialización, la desconocida y la de una especialización que no existe');
  ok(!('build' in normalizeTalents({ v: 2, spec: 'arcanista', build: { arcanista: 7 } }, 'maga')), 'sin ninguna válida, sin campo');
  ok(!('build' in normalizeTalents({ v: 2, spec: 'arcanista' }, 'maga')), 'un guardado sin build no lo gana');
  const n = normalizeTalents({ v: 2, spec: 'arcanista', build: { arcanista: 'grieta' } }, 'maga');
  eq(normalizeTalents(json(n), 'maga').build, { arcanista: 'grieta' }, 'idempotente');
});
section('B · también en otra clase: Francotiradora con la build Perforación (Disparo Apuntado sin variante)', () => {
  const h = makeHarness({ classId: 'arquera', level: 40, spec: 'francotiradora' });
  Object.assign(h.g, talentMethods);
  eq(HM.recoFor(h.p, 'francotiradora').a_t_apuntado, 'ii', 'por defecto (Punto Débil): II');
  ok(h.g.applyTalentBuild('perforacion').ok, 'Recomendado de Perforación');
  eq(HM.recoFor(h.p, 'francotiradora').a_t_apuntado, null, 'Perforación: sin variante');
  // la casilla del libro de una habilidad nunca forjada: sin ★ con Perforación, ★ II con la de por defecto
  delete h.p.skillForge.a_t_apuntado; h.p.recompute();
  const tile = () => HM.bookView(h.p).groups.find(g => g.id === 'spec').tiles.find(x => x.id === 'a_t_apuntado');
  ok(tile() && tile().todo && tile().reco === null, `la casilla no recomienda II con Perforación (${tile()?.reco})`);
  delete h.p.talents.build;
  eq(tile().reco, 'ii', 'sin build aplicada, la ★ de la de por defecto');
});

// ------------------------------------------------ D · vocabulario documentado
section('D · VERB_DOC: detonate.self con MARK_SELF_AGE y el targetR de fanSpread', () => {
  ok(/detonate\{[^}]*self/.test(VERB_DOC.mark), 'mark: detonate{…, self}');
  ok(VERB_DOC.mark.includes('MARK_SELF_AGE') && VERB_DOC.mark.includes(`${String(MARK_SELF_AGE).replace('.', ',')} s`), `mark: MARK_SELF_AGE con su valor (${MARK_SELF_AGE} s)`);
  ok(VERB_DOC.detonate.includes('mark.detonate.self') && VERB_DOC.detonate.includes('MARK_SELF_AGE'), 'detonate remite a mark.detonate.self');
  const other = VERB_DOC.other;
  ok(other.indexOf('targetR') > other.indexOf('fanW + spreadMin'), 'other: targetR junto a fanW + spreadMin');
  ok(/fanSpread\(def, dist, spread, targetR\)/.test(other), 'con la firma de fanSpread');
});

// ------------------------------------------------ M · marcas reales de las tres clases en el marco
const marks = e => HM.enemyStatuses(e).filter(s => s.id === 'marca');
section('M · Arquera: el Punto Débil de la Flecha Rastreadora sale como marca con su nombre y su arte', () => {
  const h = makeHarness({ classId: 'arquera', level: 40, spec: 'francotiradora' });
  const e = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  h.setSlot('rmb', 'a_f_rastreador'); h.aim(6, 0); h.p.mp = h.p.stats.maxMP;
  ok(h.cast('rmb'), 'lanza la Flecha Rastreadora');
  h.step(0.8);
  ok(e.marks?.a_punto_debil?.t > 0, 'el enemigo lleva el Punto Débil');
  const sk = skill('arquera', 'a_f_rastreador');
  const m = marks(e);
  ok(m.length === 1 && m[0].label === sk.name && m[0].icon === `assets/${HM.skillArtPath(sk)}` && m[0].t > 0, `chip de marca (${JSON.stringify(m)})`);
});
section('M · Guerrero: la marca de Juicio sale con el nombre de la habilidad', () => {
  const h = makeHarness({ classId: 'guerrero', level: 40, spec: 'cruzado' });
  const e = h.enemy({ hp: 1e6, pos: [6, 0, 0] });
  h.setSlot('k3', 'g_juicio'); h.aim(6, 0); h.p.mp = 100;
  ok(h.cast('k3'), 'lanza Juicio');
  h.step(1.0);
  const m = marks(e);
  ok(m.length === 1 && m[0].label.startsWith(skill('guerrero', 'g_juicio').name) && m[0].t > 0, `chip de Juicio (${JSON.stringify(m)})`);
});
section('M · Maga: la Marca del Tiempo (Cronomante) sale en el marco y se va al acabar', () => {
  const h = makeHarness({ classId: 'maga', level: 80, powers: ['m_marca_tiempo'] });
  const e = h.enemy({ hp: 1e6, pos: [4, 0, 0] });
  ok(marks(e).length === 0, 'sin marca antes del golpe');
  h.hit(e, { skill: 'm_dardo', dealt: 100, tags: ['basic', 'proj', 'arcane'], elem: 'arcane' });
  const m = marks(e);
  ok(m.length === 1 && m[0].label === 'Marca del Tiempo' && m[0].icon === 'assets/talents/maga-clase-c12.webp', `chip de la Marca del Tiempo (${JSON.stringify(m)})`);
  ok(m[0].t > 3 && m[0].t <= 4 + 1e-6, `con lo que le queda (${m[0].t})`);
  h.tick(2);
  ok(marks(e)[0]?.t > 1 && marks(e)[0].t < 2.2, `baja con el tiempo (${marks(e)[0]?.t})`);
  h.tick(2.5);
  eq(marks(e), [], 'al acabar la Marca, el chip se va');
});
section('M · Arquera (Halconera): la Marca del Halcón sale en el marco', () => {
  const h = makeHarness({ classId: 'arquera', level: 80, powers: ['y_halcon'] });
  const e = h.enemy({ hp: 1e6, pos: [5, 0, 0] });
  ok(marks(e).length === 0, 'sin marca antes del picado');
  h.tick(7);
  const m = marks(e);
  ok(m.length === 1 && m[0].label === 'Marca del Halcón' && m[0].icon === 'assets/talents/arquera-clase-c4.webp' && m[0].t > 0, `chip de la Marca del Halcón (${JSON.stringify(m)})`);
});

console.log(`\n${checks} comprobaciones`);
if (fails.length) { console.error(`\n❌ ${fails.length} apartado(s) fallan: ${fails.join(' · ')}`); process.exit(1); }
console.log('✅ CIERRE X1 (peticiones de motor): cambio de mundo, build del Recomendado, vocabulario y marcas OK');
