// Paso 2 · E0.4 — PARIDAD datos del juego ↔ datos del mockup (docs/paso2-implementacion.md §4, D18)
//  0) tools/convert-v2/divergencias.json bien formado (divergencias deliberadas, con motivo)
//  1) js/talent-text.js da el mismo texto que los helpers del mockup (n1, pl)
//  2) reglas comunes: TALENT_RULES / LEVEL_MAX / earnedAt / puertas = TV2.REGLAS (cuando js/talents.js exporte TALENT_RULES)
//  3) por clase, lo que el juego ya tenga en v2: talentos (<CLASE>_TALENTS.v === 2) y catálogo (<CLASE>_CATALOG_V === 2)
//     contra docs/mockups/data/talents-v2-<clase>.js; las clases que siguen en v1 se saltan
//  4) autocomprobación (corre siempre): el conversor en memoria da 0 diferencias y la paridad detecta una diferencia
//     sembrada en cada parte (nombre, d(r), opción, build, forja, barra), y una divergencia declarada la cubre
//  5) identificadores libres de d(r) e ids de poder repetidos entre clases (D28) sobre datos sintéticos
// Si cambian los datos del mockup de Guerrero o Arquera (D18), este test se pone en rojo en cuanto su clase esté en v2:
// se sincroniza con `node tools/convert-v2/convert.mjs --draft <clase>` + diff, o se declara la divergencia.
import assert from 'node:assert/strict';
import { CLASES, PREFIJO, cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import { juegoDeClase } from '../tools/convert-v2/lib/juego.mjs';
import { convertirClase, verificarN1 } from '../tools/convert-v2/lib/transformar.mjs';
import { identificadoresLibres, verificarD } from '../tools/convert-v2/lib/funciones.mjs';
import { informePoderes } from '../tools/convert-v2/lib/impl.mjs';
import { compararClase, compararReglas, aplicarDivergencias, cargarDivergencias } from '../tools/convert-v2/paridad.mjs';
import * as TT from '../js/talent-text.js';
import * as CORE from '../js/talents.js';

const helpers = Object.fromEntries(Object.entries(TT).filter(([, v]) => typeof v === 'function'));
const log = [];

// ---------- 0) divergencias declaradas
const divs = cargarDivergencias();
for (const d of divs) {
  assert.ok(CLASES.includes(d.clase) || d.clase === '*', `divergencias.json: clase «${d.clase}»`);
  assert.ok(typeof d.ruta === 'string' && d.ruta, 'divergencias.json: cada divergencia lleva ruta');
  assert.ok(typeof d.motivo === 'string' && d.motivo.trim(), `divergencias.json: ${d.ruta} sin motivo`);
}

// ---------- 1) helpers de texto
const { TV2 } = cargarMockup('maga');
assert.deepEqual(verificarN1(TV2, helpers), [], 'js/talent-text.js debe dar el mismo texto que el mockup');

// ---------- 2) reglas comunes
const R0 = compararReglas(TV2, CORE);
const e0 = aplicarDivergencias({ ...R0, cls: '*' }, divs);
assert.deepEqual(e0.errores, [], `reglas comunes distintas del mockup:\n${e0.errores.join('\n')}`);
log.push(R0.info.length ? `reglas: ${R0.info.join('; ')}` : 'reglas: TALENT_RULES = TV2.REGLAS ✓');

// ---------- 3) datos del juego
for (const cls of CLASES) {
  const m = cargarMockup(cls);
  if (!m.C) { log.push(`${cls}: sin datos del mockup → se salta`); continue; }
  const j = await juegoDeClase(cls);
  assert.deepEqual(j.errores, [], `${cls}: los módulos del juego no cargan`);
  const P = PREFIJO[cls];
  const cat = j.catalogV === 2 ? { skills: j.skills, talentSkills: j.talentSkills, forge: j.skillsMod[`${P}_SKILL_FORGE`], specBar: j.skillsMod[`${P}_SPEC_BAR`],
    forgeReco: j.skillsMod[`${P}_FORGE_RECO`], fallbackBar: j.skillsMod[`${P}_FALLBACK_BAR`] } : null;
  if (j.v !== 2 && !cat) { log.push(`${cls}: el juego sigue en v1 (talentos y catálogo) → se salta`); continue; }
  const R = compararClase({ cls, C: m.C, TV2: m.TV2, talents: j.v === 2 ? j.talents : null, cat });
  const { errores, cubiertas, obsoletas } = aplicarDivergencias(R, divs);
  assert.deepEqual(errores, [], `${cls}: el juego no coincide con el mockup (${m.rel}, sha1 ${m.hash}); sincroniza con ` +
    `\`node tools/convert-v2/convert.mjs --draft ${cls}\` o declara la divergencia en tools/convert-v2/divergencias.json:\n${errores.join('\n')}`);
  log.push(`${cls}: ${j.v === 2 ? 'talentos v2' : 'talentos v1 (se saltan)'} · ${cat ? 'catálogo v2' : 'catálogo v1 (se salta)'} · paridad ✓` +
    `${cubiertas.length ? ` · ${cubiertas.length} divergencias declaradas` : ''}${R.pendientes.length ? ` · ${R.pendientes.length} grants pendientes` : ''}` +
    `${obsoletas.length ? ` · ⚠ ${obsoletas.length} divergencias declaradas que ya no divergen` : ''}`);
}

// ---------- 4) autocomprobación del conversor y de la paridad
for (const cls of CLASES) {
  const m = cargarMockup(cls);
  if (!m.C) continue;
  const conv = convertirClase({ cls, C: m.C, TV2: m.TV2, helpers, juego: null });
  assert.deepEqual(conv.ctx.errores, [], `${cls}: el conversor encuentra errores en los datos del mockup`);
  const cat = { skills: conv.skills, talentSkills: conv.talentSkills, forge: conv.forge, specBar: conv.specBar, forgeReco: conv.forgeReco, fallbackBar: conv.fallbackBar };
  const difs = () => compararClase({ cls, C: m.C, TV2: m.TV2, talents: conv.talents, cat }).difs.map(d => d.ruta);
  assert.deepEqual(difs(), [], `${cls}: el borrador en memoria difiere del mockup`);
  // siembra una diferencia, comprueba que se detecta en la ruta esperada y la deshace
  const siembra = (nombre, hacer, ruta) => {
    const deshacer = hacer();
    if (!deshacer) return;
    const d = difs();
    assert.ok(d.includes(ruta), `${cls}: la paridad no detecta ${nombre} (esperaba «${ruta}», obtuvo ${JSON.stringify(d)})`);
    deshacer();
  };
  const n0 = conv.talents.cls.nodes[0];
  siembra('un nombre cambiado', () => { const v = n0.name; n0.name += '·'; return () => { n0.name = v; }; }, `clase.${n0.id}.name`);
  siembra('un texto d(r) cambiado', () => { const v = n0.d; n0.d = () => 'otro'; return () => { n0.d = v; }; }, `clase.${n0.id}.d(1)`);
  const elec = conv.talents.cls.nodes.find(n => n.t === 'c');
  if (elec) siembra('un papel de opción cambiado', () => { const o = elec.opts[1], v = o.role; o.role = 'XX'; return () => { o.role = v; }; }, `clase.${elec.id}.opts.B.role`);
  const sp = conv.talents.specs.find(s => s.nodes.length);
  if (sp) siembra('un requisito cambiado', () => { const n = sp.nodes[1], v = n.req; n.req = ['zz']; return () => { n.req = v; }; }, `spec.${sp.id}.${sp.nodes[1].id}.req`);
  const [bk, b] = Object.entries(conv.talents.builds)[0] || [];
  if (b && Object.keys(b.spec || {}).length > 1) siembra('el orden de compra de una build', () => {
    const v = b.spec, ks = Object.keys(v); b.spec = Object.fromEntries([ks[1], ks[0], ...ks.slice(2)].map(k => [k, v[k]])); return () => { b.spec = v; };
  }, `builds.${bk}.spec`);
  const [fk, f] = Object.entries(conv.forge)[0] || [];
  if (f) siembra('una línea de forja cambiada', () => { const v = f.vars[0].line; f.vars[0].line += '!'; return () => { f.vars[0].line = v; }; }, `forja.${fk}.vars.i.line`);
  const [bsp, bar] = Object.entries(conv.specBar)[0] || [];
  if (bar) siembra('la selección de la barra', () => { const v = bar.sel; bar.sel = 'zz'; return () => { bar.sel = v; }; }, `barra.${bsp}.sel`);
  // una divergencia declarada cubre su ruta
  const v0 = n0.name; n0.name += '·';
  const R = compararClase({ cls, C: m.C, TV2: m.TV2, talents: conv.talents, cat });
  const ap = aplicarDivergencias(R, [{ clase: cls, ruta: `clase.${n0.id}.name`, motivo: 'prueba' }]);
  assert.deepEqual(ap.errores, [], `${cls}: una divergencia declarada debe cubrir su ruta`);
  assert.equal(ap.cubiertas.length, 1);
  n0.name = v0;
  log.push(`${cls}: autocomprobación ✓ (${conv.talents.cls.nodes.length}+${conv.talents.specs.map(s => s.nodes.length).join('+')}+${conv.talents.hero.map(h => h.nodes.length).join('+')} nodos, ${Object.keys(conv.talents.builds).length} builds, ${conv.skills.length + conv.talentSkills.length} habilidades)`);
}

// ---------- 5) reglas del conversor sobre datos sintéticos
assert.deepEqual(identificadoresLibres('r=>`${foo(r)} y ${n1(0.5*r)} ${r > 1 ? pl(r, "a", "b") : Math.max(r, 2)}`'), ['foo', 'n1', 'pl']);
assert.deepEqual(identificadoresLibres("(r, x = 2) => ['1) a', '2) b'].slice(0, r).map(s => s + x).join(' ')"), []);
assert.equal(verificarD(r => `+${r}`, 3, helpers, 't').errores.length, 0);
const ajena = 7; // identificador libre que no exporta talent-text.js → error
assert.ok(verificarD(r => `+${ajena * r}`, 2, helpers, 't').errores.some(e => /ajena/.test(e)), 'd(r) con un identificador ajeno debe fallar');
const inf = informePoderes({
  maga: [{ id: 'a_rebote', tipo: 'power', estado: 'NUEVO', en: 'a5' }, { id: 'm_x', tipo: 'power', estado: 'NUEVO', en: 'c5A' }, { id: 'm_x', tipo: 'power', estado: 'ref', en: 'c9' }],
  arquera: [{ id: 'a_rebote', tipo: 'power', estado: 'NUEVO', en: 'c3' }, { id: 'm_y', tipo: 'power', estado: 'NUEVO', en: 'm1' }, { id: 'm_y', tipo: 'power', estado: 'NUEVO', en: 'm2' }],
}, null);
assert.equal(inf.ok, false);
assert.deepEqual(inf.choques.map(c => c.id), ['a_rebote'], 'D28: un id en dos clases es un choque');
assert.deepEqual(inf.dobleDeclaracion.map(c => c.id), ['m_y'], 'D28: un id declarado NUEVO en dos nodos de una clase');

console.log(`test-v2-paridad ✓\n  · ${log.join('\n  · ')}`);
