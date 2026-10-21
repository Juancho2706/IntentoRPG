// ============================================================
// Test 81 — NÚCLEO DE LA FORJA (Paso 2, docs/paso2-implementacion.md §3.5; 2f §2.3)
// ============================================================
//  1) forgeDef: rutas con punto (set/add/mul, '*', índices), set que fusiona, elemento y tags,
//     cambio de tipo (tag de entrega), sin forja = la misma definición, el original intacto
//  2) forgeMods / forgePowers · validateForge (ids, papeles, líneas ≤ 120 y aviso > 70,
//     poder/comportamiento registrado, elemento, tags, números)
//  3) forgeState: Mejora a req+3, variantes a req+6, undefined ≠ null (D3)
//  4) resolveSkill: orden rango → forja → mods de forja → talentos → soportes por tags FORJADOS
//  5) g.chooseForge: nivel, A6 (en combate no; fuera, gratis), null, desengarza los soportes
//     que dejan de encajar (vuelven a knownSupports), poder de la variante en p.powers
//  6) A1 / F7 GENÉRICOS sobre las clases con CATALOG_V = 2 (forja completa y sin no-ops); el
//     comprobador se valida con una entrada sintética que tiene un no-op
import assert from 'node:assert/strict';
import { forgeDef, forgeMods, forgePowers, validateForge, forgeLevels, setPath, normalizeSkillDef, validateSkillDef, FORGE_LINE_MAX, FORGE_LINE_WARN } from '../js/skill-defs.js';
import { resolveSkill, forgeState, forgedDef, validSupports } from '../js/skill-resolve.js';
import { CLASSES, CATALOG_V, SKILL_FORGE } from '../js/data.js';
import { definePower, POWER_HOOKS, SKILL_BEHAVIORS } from '../js/powers.js';
import { verbHarness, verbSkill } from './fixtures/skills-verbs-sample.mjs';

const line = 'Una línea corta de prueba';

// ------------------------------------------------ 1) forgeDef
{
  assert.deepEqual(setPath({ a: [{ c: 1 }, { c: 2 }] }, 'a.*.c', 3, 'mul'), { a: [{ c: 3 }, { c: 6 }] }, "comodín '*'");
  assert.deepEqual(setPath({}, 'x.y', 2, 'add'), { x: { y: 2 } }, 'add crea los contenedores');
  assert.deepEqual(setPath({}, 'x.y', 2, 'mul'), {}, 'mul solo toca valores existentes');
  assert.deepEqual(setPath({ s: [1, 2] }, 's.1', 5, 'set'), { s: [1, 5] }, 'índice de array');

  const sk = normalizeSkillDef(verbSkill('vx_martillo'));
  const snap = JSON.stringify(sk);
  const entry = {
    mejora: { name: 'Mango Largo', line, set: { 'charge.max': 1.6 }, add: { 'charge.scale.coef.1': 0.5 } },
    vars: [
      { id: 'vx_martillo_i', name: 'Templado', role: 'UNI', line, set: { charge: { perfectPct: 80 } }, mul: { radius: 2 } },
      { id: 'vx_martillo_ii', name: 'Sacro', role: 'CTRL', line, elem: 'fire', tags: { add: ['zone'], remove: ['melee'] }, power: 'vx_v_sacro' },
    ],
  };
  assert.equal(forgeDef(sk, entry, {}), sk, 'sin Mejora ni variante: la misma definición');
  const m = forgeDef(sk, entry, { mejora: true });
  assert.ok(m !== sk && m.charge.max === 1.6 && m.charge.scale.coef[1] === 2.5, 'Mejora: rutas con punto (set y add)');
  assert.equal(m.charge.perfect[0], 0.9, 'el resto de la carga se conserva');
  assert.deepEqual(m.forged, { mejora: true, variant: null, varId: null });
  const i = forgeDef(sk, entry, { mejora: true, variant: 'i' });
  assert.ok(i.charge.perfectPct === 80 && i.charge.max === 1.6 && i.charge.min === 0.2, 'set con objeto FUSIONA (no pisa la carga)');
  assert.equal(i.radius, 6, 'mul');
  assert.equal(i.forged.varId, 'vx_martillo_i');
  const ii = forgeDef(sk, entry, { variant: 'ii' });
  assert.ok(ii.elem === 'fire' && ii.tags.includes('fire') && !ii.tags.includes('holy'), 'elemento forjado: cambia el tag de elemento');
  assert.ok(ii.tags.includes('zone') && !ii.tags.includes('melee') && ii.tags.includes('charge'), 'tags add/remove; los de verbo se derivan');
  assert.equal(JSON.stringify(sk), snap, 'la definición original no se toca');
  // cambio de tipo: el tag de entrega viejo sale y entra el nuevo
  const pr = normalizeSkillDef(verbSkill('vx_tercera'));
  const toArea = forgeDef(pr, { vars: [{ id: 'vx_tercera_i', name: 'Lluvia', role: 'AREA', line, set: { type: 'area', at: 'target', radius: 3 } }, { id: 'vx_tercera_ii', name: 'x', role: 'UNI', line }] }, { variant: 'i' });
  assert.ok(toArea.tags.includes('area') && !toArea.tags.includes('proj'), 'proj → area');
  console.log('forgeDef: rutas, fusión, elemento, tags, tipo, original intacto ✓');

  // ------------------------------------------------ 2) forgeMods · forgePowers · validateForge
  const e2 = { mejora: { name: 'm', line, mod: { dmg: 10, chain: 2, killReset: true } }, vars: [
    { id: 'x_i', name: 'a', role: 'UNI', line, mod: { dmg: 15, chain: 1, recastAdd: 1 } }, { id: 'x_ii', name: 'b', role: 'AREA', line, power: 'p2' }] };
  const fm = forgeMods(e2, { mejora: true, variant: 'i' });
  assert.ok(fm.dmg === 25 && fm.chain === 2 && fm.killReset === true && fm.recastAdd === 1, 'mods: suma, máximo (MOD_MAX), booleano y claves nuevas');
  assert.deepEqual(forgePowers(e2, { mejora: true, variant: 'ii' }), ['p2']);
  assert.deepEqual(forgePowers(e2, { mejora: true, variant: 'i' }), []);

  definePower('vx_v_sacro', { name: 'prueba de forja' });
  const ok = validateForge(entry, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
  assert.deepEqual(ok.errors, [], ok.errors.join(' · '));
  const bad = validateForge({
    mejora: { id: 'otra_m', name: 'm', line: 'x'.repeat(FORGE_LINE_MAX + 1) },
    vars: [
      { id: 'vx_martillo_ii', name: 'a', role: 'UNI', line, power: 'no_existe', elem: 'agua', tags: { add: ['inventado'] }, add: { coef: 'mucho' } },
      { id: 'vx_martillo_ii', name: 'b', role: 'UNI', line: 'y'.repeat(FORGE_LINE_WARN + 5), behavior: 'nadie' },
    ] }, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
  const has = re => bad.errors.some(x => re.test(x));
  assert.ok(has(/id otra_m/) && has(/esperado vx_martillo_i\)/), 'ids <id>_m / _i / _ii');
  assert.ok(has(/máx\. 120/), 'line > 120: error');
  assert.ok(bad.warnings.some(x => /> 70/.test(x)), 'line > 70: aviso');
  assert.ok(has(/poder sin registrar no_existe/) && has(/comportamiento sin registrar nadie/), 'poder y comportamiento registrados');
  assert.ok(has(/elem inválido agua/) && has(/tag fuera del vocabulario inventado/) && has(/add\.coef debe ser un número/), 'elemento, tags y números');
  assert.ok(has(/mismo papel/), 'papeles distintos');
  assert.ok(validateForge({ vars: [] }, sk).errors.some(x => /falta la Mejora/.test(x)) && validateForge({ vars: [] }, sk).errors.some(x => /2 variantes/.test(x)));
  console.log('forgeMods, forgePowers y validateForge ✓');

  // claves del mockup resueltas (docs/paso2-claves-w2.md): bounce → bounces (parámetro del
  // Orbe), dmg3 → mul 'steps.2.coef', type:field → type:'zone' (en un catálogo v2, error)
  const orb = forgeDef(normalizeSkillDef(verbSkill('vx_tercera')), { vars: [{ id: 'vx_tercera_i', name: 'Veloz', role: 'UNI', line, set: { bounces: 0 }, mul: { speed: 2 } }, { id: 'vx_tercera_ii', name: 'x', role: 'AREA', line }] }, { variant: 'i' });
  assert.ok(orb.bounces === 0 && orb.speed === 60, 'set bounces: 0 · mul speed ×2');
  const v2err = validateSkillDef(normalizeSkillDef({ ...verbSkill('vx_corona'), type: 'field' }), { v2: true });
  assert.ok(v2err.some(x => /field/.test(x)), "type:'field' no existe en v2 (se escribe type:'zone')");
  assert.ok(validateSkillDef(normalizeSkillDef({ ...verbSkill('vx_corona'), windupMult: 20 }), { v2: true }).some(x => /windupMult/.test(x)), 'alias retirado: error en v2');
  console.log('Claves resueltas en la forja: bounces, steps.2.coef, field → zone, alias retirados ✓');
}

// ------------------------------------------------ 3) forgeState (niveles, D3)
const FORGE = {
  vx_tercera: {
    mejora: { name: 'Punta Fina', line, mod: { dmg: 20 } },
    vars: [
      { id: 'vx_tercera_i', name: 'Lluvia', role: 'AREA', line, set: { type: 'area', at: 'target', radius: 3 } },
      { id: 'vx_tercera_ii', name: 'Garfio', role: 'CTRL', line, mod: { slow: 2 }, power: 'vx_v_garfio' },
    ],
  },
};
definePower('vx_v_garfio', { name: 'variante de prueba' });
{
  const h = verbHarness('arquera', { level: 1, forge: FORGE });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_tercera');
  const lv = forgeLevels(sk);
  assert.deepEqual(lv, { mejora: 4, vars: 7 }, 'req 1: Mejora Nv4, variantes Nv7');
  let st = forgeState(h.p, sk);
  assert.ok(st.entry && !st.mejora && st.variant === null && st.chosen === undefined, 'Nv1: nada; nunca elegida (undefined)');
  h.p.level = 4; h.p.skillForge = { vx_tercera: 'i' }; h.p.recompute();
  st = forgeState(h.p, sk);
  assert.ok(st.mejora && st.variant === null && st.chosen === 'i', 'Nv4: Mejora sí, la variante elegida aún no se abre');
  h.p.level = 7; h.p.recompute();
  assert.equal(forgeState(h.p, sk).variant, 'i', 'Nv7: variante activa');
  h.p.skillForge = { vx_tercera: null }; h.p.recompute();
  st = forgeState(h.p, sk);
  assert.ok(st.chosen === null && st.variant === null && st.mejora, 'null = «sin variante» elegido a propósito (D3)');
  console.log('forgeState: req+3 / req+6, undefined ≠ null ✓');
}

// ------------------------------------------------ 4) resolveSkill: orden y soportes por tags forjados
{
  const h = verbHarness('arquera', { level: 30, forge: FORGE });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_tercera');
  const base = resolveSkill(h.p, sk);
  assert.ok(base.mejora && base.variant === null && base.addPct === 20, 'Mejora: +20 % (mods de forja)');
  // talentos encima de la forja (suman en el mismo saco)
  h.p.talentExtra.mods = { vx_tercera: { dmg: 10 } };
  h.p.recompute();
  assert.equal(resolveSkill(h.p, sk).addPct, 30, 'talentos tras la forja: 20 + 10');
  // soportes por tags FORJADOS: Multiproyectil exige proj; la variante i convierte en área
  h.p.supports = { vx_tercera: ['multi', 'wide'] };
  h.p.recompute();
  assert.deepEqual(validSupports(h.p, sk), ['multi'], 'forma base (proj): Multiproyectil sí, Expansivo no');
  h.p.skillForge = { vx_tercera: 'i' }; h.p.recompute();
  const prof = resolveSkill(h.p, sk);
  assert.ok(prof.def.type === 'area' && prof.tags.has('area') && !prof.tags.has('proj') && prof.variant === 'i', 'prof.def = definición forjada');
  assert.deepEqual(validSupports(h.p, sk), ['wide'], 'forjada (área): Expansivo sí, Multiproyectil no');
  assert.ok(Math.abs(prof.radius - 3 * 1.45) < 1e-9, 'el soporte se aplica sobre la forma forjada (+45 % de radio)');
  console.log('resolveSkill: rango → forja → mods → talentos → soportes por tags forjados ✓');
}

// ------------------------------------------------ 5) g.chooseForge (A6)
{
  const h = verbHarness('arquera', { level: 5, forge: FORGE });
  const sk = h.p.cls.skills.find(s => s.id === 'vx_tercera');
  assert.equal(h.g.chooseForge('vx_tercera', 'ii').reason, 'level', 'variantes cerradas antes de req+6');
  assert.equal(h.p.skillForge.vx_tercera, undefined);
  h.p.level = 30; h.p.recompute();
  assert.equal(h.g.chooseForge('vx_tercera', 'iii').reason, 'variant');
  assert.equal(h.g.chooseForge('a_no_existe', 'i').reason, 'skill');
  // A6: en combate no se cambia; fuera de combate es gratis (sin oro, sin puntos)
  h.g.combatFree = false;
  const r0 = h.g.chooseForge('vx_tercera', 'ii');
  assert.ok(!r0.ok && r0.reason === 'combat' && h.p.skillForge.vx_tercera === undefined, 'A6: en combate, bloqueada');
  h.g.combatFree = true;
  const gold0 = h.p.gold;
  const r1 = h.g.chooseForge('vx_tercera', 'ii');
  assert.ok(r1.ok && h.p.skillForge.vx_tercera === 'ii' && h.p.gold === gold0, 'A6: fuera de combate, gratis');
  assert.ok(h.p.powers.has('vx_v_garfio'), 'el poder de la variante entra en p.powers');
  assert.equal(resolveSkill(h.p, sk).slow, 2, 'recompute: el perfil ya es el de la variante');
  // cambiar a la i desengarza Multiproyectil (exige proj) y lo devuelve a knownSupports
  h.p.supports = { vx_tercera: ['multi'] }; h.p.knownSupports = []; h.p.recompute();
  const r2 = h.g.chooseForge('vx_tercera', 'i');
  assert.ok(r2.ok && r2.unsocketed.includes('multi'), 'soporte incompatible desengarzado');
  assert.deepEqual(h.p.supports.vx_tercera, []);
  assert.ok(h.p.knownSupports.includes('multi'), 'vuelve al alijo');
  assert.ok(h.messages().some(m => /desengarzado/.test(m)), 'con aviso');
  assert.ok(!h.p.powers.has('vx_v_garfio'), 'el poder de la ii sale');
  const r3 = h.g.chooseForge('vx_tercera', null);
  assert.ok(r3.ok && h.p.skillForge.vx_tercera === null && forgedDef(h.p, sk).type === 'proj', 'null: sin variante (queda la Mejora)');
  assert.equal(h.g.chooseSkillMod('vx_tercera', 'a', 'b'), false, '@deprecated: chooseSkillMod no hace nada');
  console.log('chooseForge: niveles, A6 en combate/fuera, soportes desengarzados, poder de la variante ✓');
}

// ------------------------------------------------ 6) A1 / F7 genéricos (clases con CATALOG_V = 2)
// A1: cada habilidad base (no de talento) tiene Mejora + 2 variantes válidas.
// F7: ninguna pieza es un no-op: cambia el perfil de resolveSkill o declara poder/comportamiento.
function forgeAudit(classId, cls, forge) {
  const out = { errors: [], warnings: [], noops: [] };
  const h = verbHarness(classId, { level: 100, forge });
  h.p.cls = { ...h.p.cls, skills: cls.skills, forge };
  for (const sk of cls.skills.filter(s => s.kind !== 'talent')) {
    const entry = forge[sk.id];
    if (!entry) { out.errors.push(`${sk.id}: sin forja`); continue; }
    const v = validateForge(entry, sk, { powers: POWER_HOOKS, behaviors: SKILL_BEHAVIORS });
    out.errors.push(...v.errors); out.warnings.push(...v.warnings);
    // mismo nivel (100) para comparar: «sin Mejora» = la entrada sin su Mejora
    const sig = (state) => {
      h.p.cls = { ...h.p.cls, forge: { ...forge, [sk.id]: state.mejora ? entry : { ...entry, mejora: null } } };
      h.p.skillForge = { [sk.id]: state.variant };
      h.p.recompute();
      const pr = resolveSkill(h.p, sk);
      // el perfil EFECTIVO: sin la propia etiqueta de la forja (variant/mejora) ni la definición
      const { def, mods, sups, onHitPowers, variant, mejora, ...rest } = pr;
      void def; void mods; void sups; void onHitPowers; void variant; void mejora;
      return JSON.stringify(rest, (k, x) => (x instanceof Set ? [...x].sort() : x));
    };
    const plain = sig({ mejora: false, variant: null });
    const withM = sig({ mejora: true, variant: null });
    if (entry.mejora && withM === plain && !entry.mejora.power && !entry.mejora.behavior) out.noops.push(`${sk.id}_m`);
    for (const k of ['i', 'ii']) {
      const piece = entry.vars?.[k === 'i' ? 0 : 1];
      if (!piece || piece.power || piece.behavior) continue;
      if (sig({ mejora: true, variant: k }) === withM) out.noops.push(piece.id);
    }
  }
  return out;
}
{
  // el comprobador detecta un no-op (variante que no cambia nada) y una habilidad sin forja
  const cls = { ...CLASSES.guerrero, skills: [normalizeSkillDef(verbSkill('vx_verdugo')), normalizeSkillDef(verbSkill('vx_corazon'))] };
  const forge = { vx_verdugo: { mejora: { name: 'Filo', line, mod: { dmg: 10 } }, vars: [
    { id: 'vx_verdugo_i', name: 'Nada', role: 'UNI', line, mod: {} },
    { id: 'vx_verdugo_ii', name: 'Radio', role: 'AREA', line, add: { range: 1 } }] } };
  const a = forgeAudit('guerrero', cls, forge);
  assert.deepEqual(a.noops, ['vx_verdugo_i'], 'F7: detecta la variante que no hace nada');
  const b = forgeAudit('guerrero', { ...cls, skills: cls.skills.slice(0, 1) }, { vx_verdugo: { ...forge.vx_verdugo, mejora: { name: 'Vacía', line, mod: { dmg: 0 } } } });
  assert.deepEqual(b.noops, ['vx_verdugo_m', 'vx_verdugo_i'], 'F7: también una Mejora vacía');
  assert.ok(a.errors.includes('vx_corazon: sin forja'), 'A1: detecta la habilidad sin forja');
  // y sobre los catálogos reales con CATALOG_V = 2
  const v2 = Object.entries(CATALOG_V).filter(([, v]) => v === 2).map(([id]) => id);
  for (const cid of v2) {
    const r = forgeAudit(cid, CLASSES[cid], CLASSES[cid].forge || SKILL_FORGE);
    assert.deepEqual(r.errors, [], `${cid}: A1 ${r.errors.join(' · ')}`);
    assert.deepEqual(r.noops, [], `${cid}: F7 ${r.noops.join(' · ')}`);
    if (r.warnings.length) console.log(`  ${cid}: ${r.warnings.length} avisos de longitud (> ${FORGE_LINE_WARN})`);
  }
  console.log(`A1/F7 genéricos ✓ (clases con CATALOG_V = 2: ${v2.length ? v2.join(', ') : 'ninguna todavía; el comprobador se validó con datos sintéticos'})`);
}

console.log('\n✅ FORJA (forgeDef · validateForge · niveles · orden de resolveSkill · chooseForge · A1/F7) OK');
