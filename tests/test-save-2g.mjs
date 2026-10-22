// Paso 2 · E5 (M1) — migración final de guardados v4 → v5 con los datos REALES: tablas legadas de
// save-legacy-<clase>.js, SPEC_BAR, FALLBACK_BAR, árboles y builds vivos (sin el fixture de talentos
// de test80, que prueba el ALGORITMO con datos inyectados). Lo esperado sale de esos datos y no se
// escribe a mano (E4 puede cambiar una build). docs/paso2-implementacion.md §3.11, E5 M1, riesgos 2 y 20.
//  1) los 57 saves v4 reales (E0.2) cargados como el juego (Player → migrateSave):
//     nivel, talentos = Recomendado al nivel ENTERO (clase, especialización, elecciones A/B y árbol
//     héroe) sin recorte ni puntos libres, barra esperada, forja (3.ª rama, absorciones y la
//     recomendada de la especialización en lo nunca elegido, D3), soportes reengarzados o devueltos
//     (y sembrados: que no encajan, de más, que solo encajan en la variante forjada), glifos a la
//     bolsa, avisos
//  2) idempotencia: MIGRATIONS[4] dos veces = una; cargar → guardar → cargar = igual; un save ya
//     migrado que vuelve a pasar por MIGRATIONS[4] no cambia
//  3) sintéticos Nv 10/40/69/70/80/100 de las 9 especializaciones (y el barrido Nv10–100): Paragon a
//     su nivel y barra de la especialización (SPEC_BAR completa desde el Nv15); Nv40 sin especialización
//  4) niveles > 100 recortados (nivel, XP, puntos de todos los sistemas)
//  5) glifos: a la bolsa aunque esté llena; si la migración no puede, SUELTOS con aviso y se recogen
//  6) recorte fino: saves v5 hechos con los árboles de ANTES del reorden del 22-oct pierden SOLO los
//     rangos que ya no valen, recuperan los puntos y avisan 'talentos-recortados'; las
//     especializaciones que no se reordenaron y los Nv ≥ 70 (con árbol héroe) no pierden nada
//  7) pestaña vieja (riesgo 20): un v5 que el código v4 vuelve a guardar se migra otra vez sin
//     romperse; vuelve la forja recomendada, las ranuras que v4 vació se rellenan como en un héroe
//     nuevo (insignia en la 3, definitiva en la 4) y queda registrado lo que se pierde
//  8) respaldo `.bak-v4` (main.js, sin DOM: el método se evalúa aparte; texto crudo, no re-serializado)
//     y avisos en pantalla
//  9) cadena v3 → v5 con los saves reales del Paso 2b
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as S from '../js/save-schema.js';
import * as T from '../js/talents.js';
import * as SR from '../js/skill-resolve.js';
import { CLASSES, SUPPORTS, SPEC_BAR, FALLBACK_BAR, FORGE_RECO, xpForLevel } from '../js/data.js';
import { supportFits, supportSockets, forgeVar } from '../js/skill-defs.js';
import { Player, MAX_MATERIALS, canAddMaterial } from '../js/entities.js';
import { economyMethods } from '../js/economy.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const json = o => JSON.parse(JSON.stringify(o));
const REAL = JSON.parse(readFileSync(new URL('./fixtures/saves-v4-paso2.json', import.meta.url), 'utf8'));
const V3 = JSON.parse(readFileSync(new URL('./fixtures/saves-v3-paso2b.json', import.meta.url), 'utf8'));
const MAIN = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const SLOTS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
const CLASS_IDS = ['guerrero', 'maga', 'arquera'];
const LEVELS = [10, 40, 69, 70, 80, 100];
const specsOf = cid => T.talentTreesFor(cid).specs.map(s => s.id);
const skillOf = (cid, id) => (id && CLASSES[cid].skills.find(s => s.id === id)) || null;
const game = () => ({ ui: { spawnText() {}, message() {}, flashDamage() {} }, sfx() {}, world: null, enemies: [], projectiles: [],
  input: { joyDir: null, keyDir: null }, save() {} });
// carga como el juego: Player migra (migrateSave) y normaliza los talentos con su nivel
const load = save => new Player(game(), save.classId, json(save));
// lo que el juego vuelve a guardar
const saved = p => json(S.serializePlayer(p));
// puntos libres de un árbol sin tocar al héroe (ranksOf crea objetos vacíos al preguntar)
const left = (p, which) => T.talentPointsLeft({ classId: p.classId, level: p.level, talents: json(p.talents) }, which);
// el Recomendado vigente de una especialización a un nivel (lo que §3.11 paso 3 aplica)
function recommended(cid, spec, L) {
  const b = T.talentTreesFor(cid).builds[T.defaultBuildKey(cid, spec)];
  return { b, r: T.buildRanks({ classId: cid, level: L, talents: { v: 2, spec, cls: {}, sp: {}, choice: {}, hero: {}, loadouts: {} } }, b, { level: L }) };
}
// los talentos ENTEROS que deja el Recomendado (§3.11 paso 3): clase, especialización, elecciones
// A/B de los nodos de elección y árbol héroe; sin especialización, todo vacío
function recoTalents(cid, spec, L) {
  const t = { v: 2, spec, cls: {}, sp: {}, choice: {}, hero: {}, loadouts: {} };
  if (spec) {
    const { r } = recommended(cid, spec, L);
    Object.assign(t, { cls: r.cls, sp: r.sp, choice: r.choice, hero: r.hero ? { [spec]: r.hero } : {} });
  }
  return T.normalizeTalents(t, cid, L);
}
// forja que deja la migración: la recomendada de la especialización (D3) en lo que nadie eligió;
// lo elegido (3.ª rama, absorciones) gana, y un null (decidido sin variante) no la recibe
const ownForge = s => S.migrateV4toV5(json(s), { forgeReco: {} }).skillForge;
const recoForge = (s, spec) => ({ ...(spec ? FORGE_RECO[spec] : {}), ...ownForge(s) });
assert.equal(S.SAVE_VERSION, 5);
assert.equal(Object.keys(REAL).length, 57, 'los 57 saves v4 de E0.2');

// barra esperada (§3.11 paso 5): el destino de la tabla legada si el héroe CARGADO lo conoce, cabe en
// la ranura y no se repite; si no, SPEC_BAR de su especialización y luego FALLBACK_BAR. Una ranura que
// v4 dejó vacía recibe DESPUÉS de las elegidas (sin quitarles nada) la de SPEC_BAR o FALLBACK_BAR, como
// un héroe nuevo; la vaciada con to: null sigue vacía; lmb nunca. Y al cargar un guardado sin
// hotbarManual (S0), el kit de la especialización entra en su ranura de SPEC_BAR si la ocupa una del kit
// base o está libre. → la barra, con `swapped` (no enumerable): ranuras que cambió esa pasada
function expectedBar(v4bar, p) {
  const legacy = S.LEGACY_TABLES[p.classId];
  const spec = p.talents.spec;
  const out = {};
  const ok = (id, slot) => { const sk = skillOf(p.classId, id); return !!sk && SR.fitsSlot(sk, slot) && p.knows(id) && !Object.values(out).includes(id); };
  const reco = slot => [spec && SPEC_BAR[spec].bar[slot], FALLBACK_BAR[p.classId][slot]];
  const fill = [];
  for (const slot of SLOTS) {
    const old = v4bar?.[slot] || null;
    const to = old ? S.legacyTarget(legacy.bar[old], slot, spec, old) : null;
    if (slot !== 'lmb' && !old) { out[slot] = null; fill.push(slot); continue; }
    if (slot !== 'lmb' && to === null) { out[slot] = null; continue; }
    out[slot] = [to, ...reco(slot)].find(id => id && ok(id, slot)) || null;
  }
  for (const slot of fill) out[slot] = reco(slot).find(id => id && ok(id, slot)) || null;
  let swapped = 0;
  for (const slot of spec ? SLOTS : []) {
    const id = SPEC_BAR[spec].bar[slot], sk = skillOf(p.classId, id);
    if (!sk || sk.spec !== spec || !p.knows(id) || !SR.fitsSlot(sk, slot) || Object.values(out).includes(id)) continue;
    const cur = skillOf(p.classId, out[slot]);
    if (out[slot] && (!cur || cur.spec || cur.kind === 'talent')) continue;
    out[slot] = id; swapped++;
  }
  return Object.defineProperty(out, 'swapped', { value: swapped, enumerable: false });
}
// invariantes de la barra de un héroe cargado: cada habilidad existe, cabe, se conoce, tiene perfil
// (resolveSkill) y no se repite; lmb nunca vacía
function checkBar(p, what) {
  const ids = SLOTS.map(s => p.hotbar[s]).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `${what}: barra sin duplicados`);
  assert.ok(p.hotbar.lmb, `${what}: lmb nunca vacía`);
  for (const s of SLOTS) {
    const id = p.hotbar[s];
    if (!id) continue;
    const sk = skillOf(p.classId, id);
    assert.ok(sk && SR.fitsSlot(sk, s) && p.knows(id), `${what}: ${s}=${id} existe, cabe y se conoce`);
    assert.ok(SR.resolveSkill(p, sk), `${what}: ${id} tiene perfil`);
  }
}

// ------------------------------------------------ 1) los 57 saves v4 reales
let resocketed = 0, returned = 0, ownBranch = 0, withChoices = 0, recoIn = 0, recoBeaten = 0, swappedSaves = 0, emptyFilled = 0;
{
  for (const [name, s] of Object.entries(REAL)) {
    const cid = s.classId;
    const p = load(s);
    const L = p.level;
    const spec = s.talents?.spec && L >= T.TALENT_RULES.specAt ? s.talents.spec : null;
    assert.equal(L, s.level, `${name}: nivel`);
    // talentos: el Recomendado ENTERO de su especialización al nivel (elecciones A/B y árbol héroe
    // incluidos); cargan sin recorte y sin puntos libres
    assert.equal(p.talents.spec, spec, `${name}: especialización`);
    assert.deepEqual(p.talents, recoTalents(cid, spec, L), `${name}: talentos = Recomendado (clase, especialización, elecciones y héroe)`);
    if (spec) {
      for (const w of ['cls', 'spec', 'hero']) assert.equal(left(p, w), 0, `${name}: sin puntos libres de ${w}`);
      if (Object.keys(p.talents.choice).length) withChoices++;
    } else assert.deepEqual([p.talents.cls, p.talents.choice], [{}, {}], `${name}: sin especialización, sin talentos`);
    assert.deepEqual(T.talentsTrimmed(p.talents), [], `${name}: el Recomendado carga sin recorte`);
    // barra esperada y, por especialización: básico, insignia (3) y definitiva (4) de SPEC_BAR (también
    // si v4 las dejó vacías: las recibe como un héroe nuevo)
    const bar = expectedBar(s.hotbar, p);
    assert.deepEqual(p.hotbar, bar, `${name}: barra esperada`);
    checkBar(p, name);
    if (bar.swapped) swappedSaves++;
    if (spec) {
      const want = SPEC_BAR[spec].bar;
      assert.equal(p.hotbar.lmb, want.lmb, `${name}: el básico v4 → el de la clase`);
      if (L >= 10) assert.equal(p.hotbar.k3, want.k3, `${name}: la insignia v4 (${s.hotbar.k3 || 'vacía'}) → la de ${spec}`);
      if (p.knows(want.k4)) assert.equal(p.hotbar.k4, want.k4, `${name}: la definitiva v4 (${s.hotbar.k4 || 'vacía'}) → la de ${spec}`);
      if (!s.hotbar.k3 || !s.hotbar.k4) emptyFilled++;
    }
    // forja: solo habilidades forjables del catálogo 2g, con variantes que existen (ya en lo que deja la
    // migración: Player limpiaría después un id retirado)
    const migrated = S.migrateSave(s);
    assert.deepEqual(migrated.skillForge, p.skillForge, `${name}: Player no tiene que limpiar la forja migrada`);
    for (const [id, v] of Object.entries(migrated.skillForge)) {
      const sk = skillOf(cid, id);
      assert.ok(sk && SR.forgeEntry(p, sk), `${name}: forja de ${id} (habilidad forjable del catálogo)`);
      assert.ok(v === null || forgeVar(SR.forgeEntry(p, sk), v), `${name}: ${id} tiene la variante ${v}`);
    }
    // la recomendada de su especialización llega a lo que nadie eligió (como a un héroe nuevo que la
    // elige, D3); lo elegido en v4 gana
    assert.deepEqual(p.skillForge, recoForge(s, spec), `${name}: forja recomendada de ${spec} en lo nunca elegido`);
    const own = ownForge(s);
    for (const [id, v] of Object.entries(spec ? FORGE_RECO[spec] : {})) {
      if (own[id] === undefined) { assert.equal(p.skillForge[id], v, `${name}: ${id} recibe la ★ (${v})`); recoIn++; } else if (own[id] !== v) recoBeaten++;
    }
    // la 3.ª rama elegida de una habilidad que sigue (tabla `forge` sin `to`) llega a su forja cuando
    // ninguna habilidad absorbida compite por ella (esa precedencia la prueba test80)
    const table = S.LEGACY_TABLES[cid];
    const absorbedInto = new Set([
      ...SLOTS.map(sl => s.hotbar[sl]).filter(id => id && table.bar[id] && 'forge' in table.bar[id]).map(id => S.legacyTarget(table.bar[id], null, spec, id)),
      ...Object.keys(s.skillMods || {}).map(id => table.forge[id]?.to).filter(to => typeof to === 'string'),
    ]);
    for (const [skId, chosen] of Object.entries(s.skillMods || {})) {
      const map = table.forge[skId];
      if (!map || typeof map.to === 'string' || absorbedInto.has(skId)) continue;
      const mapped = Object.values(chosen).filter(o => Object.hasOwn(map, o)).map(o => map[o]);
      if (!mapped.length) continue;
      assert.equal(p.skillForge[skId], mapped[0], `${name}: forja de ${skId} desde su 3.ª rama`);
      ownBranch++;
    }
    // soportes: en la habilidad que sigue, los que encajan en su definición FORJADA (los mismos que
    // usa el juego: validSupports); los de habilidades retiradas o desconocidas, a knownSupports
    for (const [skId, ids] of Object.entries(s.supports || {})) {
      const sk = !table.removed.includes(skId) ? skillOf(cid, skId) : null;
      if (!sk) { assert.ok(!(skId in p.supports), `${name}: ${skId} retirada pierde sus soportes`); returned += ids.length; continue; }
      const def = SR.forgedDef(p, sk);
      const want = [];
      for (const id of ids) { const sup = SUPPORTS.find(x => x.id === id); if (sup && supportFits(sup, def) && !want.includes(id) && want.length < supportSockets(def)) want.push(id); }
      assert.deepEqual(p.supports[skId] || [], want, `${name}: soportes de ${skId}`);
      assert.deepEqual(SR.validSupports(p, sk), want, `${name}: el juego usa todos los de ${skId}`);
      resocketed += want.length; returned += ids.length - want.length;
    }
    for (const sk of Object.keys(p.supports)) assert.ok(s.supports?.[sk], `${name}: ningún soporte inventado (${sk})`);
    for (const id of [...(s.knownSupports || []), ...Object.values(s.supports || {}).flat()])
      assert.ok(p.knownSupports.includes(id), `${name}: ${id} sigue en knownSupports`);
    // tablero: sin nodos ni puntos; los glifos engarzados, a la bolsa (intactos, por uid)
    const glyphs = Object.values(s.paragon?.glyphs || {}).filter(Boolean);
    assert.deepEqual(p.paragon, { nodes: {}, glyphs: {} }, `${name}: tablero vacío y sin glifos sueltos`);
    for (const gl of glyphs) assert.deepEqual(p.materials.find(m => m.uid === gl.uid), gl, `${name}: glifo ${gl.uid} en la bolsa`);
    assert.equal(p.materials.length, (s.materials || []).length + glyphs.length, `${name}: bolsa = materiales + glifos`);
    // avisos: 'paso2' y, con especialización, el de la clase (Recomendado aplicado); si la pasada S0
    // cambió la barra al cargar, el de la barra de la especialización (una vez)
    assert.deepEqual(p.notices, ['paso2', ...(spec ? [`paso2-${cid}`] : []), ...(bar.swapped ? [S.SPEC_BAR_NOTICE] : [])], `${name}: avisos`);
    for (const n of p.notices) assert.ok(S.LOAD_NOTICES[n]?.length > 20, `${name}: texto del aviso ${n}`);
    // fuera los campos v4
    const out = saved(p);
    for (const k of ['skillMods', 'skillBranches', 'skillPoints', 'mastery']) assert.ok(!(k in out), `${name}: sin ${k}`);
    assert.equal(out.saveVersion, 5);
  }
  assert.ok(resocketed >= 40 && returned >= 40, `soportes: ${resocketed} reengarzados y ${returned} devueltos (los dos caminos)`);
  assert.ok(ownBranch >= 10, `forja desde la 3.ª rama en ${ownBranch} habilidades`);
  assert.ok(withChoices >= 50, `elecciones A/B del Recomendado en ${withChoices} saves`);
  assert.ok(recoIn >= 100 && recoBeaten >= 5, `forja recomendada: ${recoIn} variantes llegan y ${recoBeaten} pierden ante lo elegido en v4`);
  // los dos caminos de la barra con datos reales: insignia o definitiva vacías en v4 que se rellenan y
  // la pasada S0 al cargar (un v4 no trae hotbarManual)
  assert.ok(emptyFilled >= 1 && swappedSaves >= 1, `barra: ${emptyFilled} saves con la 3 o la 4 vacías rellenadas y ${swappedSaves} con la pasada S0`);
  // casos a mano (las tablas legadas están congeladas desde E2); el resto, la recomendada (D3)
  assert.deepEqual(load(REAL['maga-40-piromante']).skillForge, { ...FORGE_RECO.piromante, m_dardo: 'i' }, 'Ascua en lmb → Dardo I (Saeta Ígnea)');
  assert.deepEqual(load(REAL['guerrero-18-guardian']).skillForge, { ...FORGE_RECO.guardian, g_tajo: 'i', terremoto: 'ii', g_hendidura: 'ii', g_u_cataclismo: 'i' },
    'Mandoble → Tajo I (gana a la ★ II), Terremoto v2 → II, Torbellino → Hendidura II, Cataclismo v3 → I');
  assert.equal(load(REAL['arquera-75-montaraz']).skillForge.a_t_cepo, 'ii', 'Red de Caza v1 (fuera de la barra) → Trampa de Cepo II');
  // la insignia y la definitiva del Guardián llegan forjadas aunque el save v4 no las conociera
  const g75 = load(REAL['guerrero-75-guardian']).skillForge;
  for (const id of ['g_piel', 'g_guardia', 'g_carga_escudo', 'g_u_ciudadela']) assert.ok(g75[id] !== undefined, `guerrero-75-guardian: ${id} forjada`);
  // null (decidido sin variante en v4) no recibe la recomendada: Paso del Viento v1 → null; la ★ de
  // la Tiradora es I
  assert.equal(FORGE_RECO.tiradora.a_paso, 'i');
  for (const opt of ['a_paso_v1', 'a_paso_v3']) {
    const tir = json(REAL['arquera-60-tiradora']);
    tir.skillMods = { ...tir.skillMods, a_paso: { a_paso_v: opt } };
    assert.equal(load(tir).skillForge.a_paso, null, `a_paso ${opt} → null: decidido, sin la ★`);
  }
  // sin especialización (Nv < 10) no hay recomendada; y una segunda pasada no la vuelve a aplicar
  // aunque la del día cambie (los cambios de E4 no pisan una forja ya migrada)
  for (const cid of CLASS_IDS) assert.deepEqual(load(REAL[`${cid}-5-sin-spec`]).skillForge, ownForge(REAL[`${cid}-5-sin-spec`]), `${cid} Nv5: sin forja recomendada`);
  const once = S.migrateV4toV5(json(REAL['maga-40-piromante']));
  assert.deepEqual(S.migrateV4toV5(json(once), { forgeReco: { piromante: { rayo: 'i', meteoro: 'ii' } } }).skillForge, once.skillForge, 'segunda pasada: la forja no se toca');
}
// soportes sembrados sobre los saves reales (los de E0.2 no traen ninguno que no encaje en su habilidad
// 2g): en la ranura 2, primero los que no encajan y luego todos los que sí (sobran); en una habilidad
// con variante migrada, el soporte que solo encaja en la variante. Nada en knownSupports: vuelven igual
{
  const fits = (def, id) => supportFits(SUPPORTS.find(x => x.id === id), def);
  let dropped = 0, extra = 0, forgedOnly = 0;
  for (const [name, s0] of Object.entries(REAL)) {
    const p0 = load(s0);
    const k2 = skillOf(s0.classId, p0.hotbar.k2 || p0.hotbar.rmb);
    const def2 = SR.forgedDef(p0, k2);
    const no = SUPPORTS.filter(x => !fits(def2, x.id)).map(x => x.id).slice(0, 2);
    const yes = SUPPORTS.filter(x => fits(def2, x.id)).map(x => x.id);
    const supports = { [k2.id]: [...no, ...yes] };
    let only = null;
    for (const id of Object.keys(p0.skillForge)) {
      const sk = skillOf(s0.classId, id);
      const sup = sk && sk.id !== k2.id && SUPPORTS.find(x => fits(SR.forgedDef(p0, sk), x.id) && !fits(sk, x.id));
      if (sup) { only = [sk.id, sup.id]; supports[sk.id] = [sup.id]; break; }
    }
    const p = load({ ...json(s0), supports, knownSupports: [] });
    const want = yes.slice(0, supportSockets(def2));
    assert.deepEqual(p.supports[k2.id] || [], want, `${name}: ${k2.id} se queda con los que encajan, hasta sus huecos`);
    if (only) assert.deepEqual(p.supports[only[0]], [only[1]], `${name}: ${only[1]} solo encaja en ${only[0]} forjada (${p.skillForge[only[0]]}): se queda`);
    for (const id of Object.values(supports).flat()) assert.ok(p.knownSupports.includes(id), `${name}: ${id} en knownSupports`);
    assert.equal(new Set(p.knownSupports).size, p.knownSupports.length, `${name}: knownSupports sin repetidos`);
    for (const [id, list] of Object.entries(p.supports)) assert.deepEqual(SR.validSupports(p, skillOf(p.classId, id)), list, `${name}: el juego usa los de ${id}`);
    dropped += no.length; extra += yes.length - want.length; forgedOnly += only ? 1 : 0;
  }
  assert.ok(dropped >= 57 && extra >= 20 && forgedOnly >= 5, `soportes sembrados: ${dropped} que no encajan, ${extra} de más y ${forgedOnly} que solo encajan en la variante`);
  console.log(`✓ 57 saves v4 reales: Recomendado entero sin recorte (${withChoices} con elecciones A/B), barra esperada (${emptyFilled} con la 3 o la 4 rellenadas, ${swappedSaves} con la pasada S0), forja (${recoIn} variantes recomendadas, ${recoBeaten} vencidas por lo elegido), soportes (${resocketed} reengarzados, ${returned} devueltos), glifos y avisos`);
  console.log(`✓ soportes sembrados: fuera ${dropped} que no encajan y ${extra} de más; se quedan ${forgedOnly} que solo encajan en la variante forjada; todos en knownSupports`);
}

// ------------------------------------------------ 2) idempotencia
{
  for (const [name, s] of Object.entries(REAL)) {
    const once = S.migrateV4toV5(json(s));
    assert.deepEqual(S.migrateV4toV5(json(once)), once, `${name}: MIGRATIONS[4] dos veces = una`);
    assert.deepEqual(S.migrateSave(S.migrateSave(s)), S.migrateSave(s), `${name}: migrateSave dos veces = una`);
    // cargar → guardar → cargar → guardar: lo mismo
    const a = saved(load(s));
    const b = saved(load(a));
    assert.deepEqual(b, a, `${name}: cargar y guardar dos veces = una`);
    // un save ya migrado que vuelve a pasar por MIGRATIONS[4] (p. ej. saveVersion pisado) no cambia;
    // solo vuelven los avisos, que no se guardan
    const again = S.migrateV4toV5({ ...json(a), saveVersion: 4 });
    delete again.notices;
    assert.deepEqual({ ...again, saveVersion: 5 }, a, `${name}: un v5 por MIGRATIONS[4] queda igual`);
  }
}
console.log('✓ idempotencia: MIGRATIONS[4] dos veces, migrateSave dos veces, cargar/guardar dos veces y un v5 re-migrado');

// ------------------------------------------------ 3) sintéticos Nv 10/40/69/70/80/100 de las 9 especializaciones
{
  let n = 0;
  for (const cid of CLASS_IDS) for (const spec of specsOf(cid)) {
    const base = REAL[`${cid}-75-${spec}`];
    for (const L of LEVELS) {
      const what = `${cid}/${spec}/Nv${L}`;
      // a) el save real de esa especialización llevado a ese nivel
      const s = { ...json(base), level: L };
      const p = load(s);
      const { b } = recommended(cid, spec, L);
      assert.equal(p.talents.spec, spec, what);
      assert.deepEqual(p.talents, recoTalents(cid, spec, L), `${what}: Recomendado entero al nivel`);
      assert.deepEqual(p.skillForge, recoForge(s, spec), `${what}: forja recomendada en lo nunca elegido`);
      assert.deepEqual(T.talentsTrimmed(p.talents), [], `${what}: sin recorte`);
      for (const w of ['cls', 'spec', 'hero']) assert.equal(left(p, w), 0, `${what}: sin puntos libres de ${w}`);
      assert.equal(T.spentIn({ nodes: T.findSpec(cid, spec).nodes }, p.talents.sp[spec]), T.earnedAt('spec', L), `${what}: puntos de especialización del nivel`);
      // Paragon: se abre con los 31 puntos de especialización (Nv70) y da un punto por nivel desde el 71
      assert.equal(T.heroOpen(p), L >= 70, `${what}: Paragon ${L >= 70 ? 'abierto' : 'cerrado'}`);
      const heroNodes = p.talents.hero[spec]?.nodes?.[b.hero] || {};
      assert.equal(Object.values(heroNodes).reduce((a, k) => a + k, 0), T.earnedAt('hero', L), `${what}: rangos del árbol héroe`);
      if (L >= 71) assert.equal(p.talents.hero[spec].tree, b.hero, `${what}: árbol héroe del Recomendado`);
      assert.deepEqual(p.hotbar, expectedBar(s.hotbar, p), `${what}: barra esperada`);
      checkBar(p, what);
      // b) una barra v4 de habilidades retiradas: queda la de la especialización (SPEC_BAR completa
      //    desde el Nv15; antes, lo que se conoce de SPEC_BAR y FALLBACK_BAR)
      const z = load({ ...s, hotbar: Object.fromEntries(SLOTS.map(k => [k, 'zz_retirada'])) });
      if (L >= 15) assert.deepEqual(z.hotbar, SPEC_BAR[spec].bar, `${what}: barra de la especialización`);
      else assert.deepEqual(z.hotbar, expectedBar(Object.fromEntries(SLOTS.map(k => [k, 'zz_retirada'])), z), `${what}: barra de reserva`);
      checkBar(z, `${what} (retiradas)`);
      n++;
    }
  }
  // barrido Nv10–100: el Recomendado que deja la migración nunca se recorta al cargar y gasta los
  // puntos de todos los sistemas
  const lean = (cid, spec, L) => ({ saveVersion: 4, classId: cid, level: L, xp: 0, skillSystemV: 5, skillPoints: 0, skillBranches: {}, skillMods: {},
    hotbar: { lmb: null }, talents: { v: 1, spec, cls: {}, sp: {}, choice: {} }, paragon: { nodes: {}, glyphs: {} }, materials: [], supports: {}, knownSupports: [] });
  let sweep = 0;
  for (const cid of CLASS_IDS) for (const spec of specsOf(cid)) for (let L = 10; L <= 100; L++) {
    const d = S.migrateSave(lean(cid, spec, L));
    assert.deepEqual(d.skillForge, FORGE_RECO[spec], `${cid}/${spec}/Nv${L}: sin nada elegido, la forja recomendada entera`);
    const t = T.normalizeTalents(json(d.talents), cid, L);
    assert.deepEqual(T.talentsTrimmed(t), [], `${cid}/${spec}/Nv${L}: el Recomendado migrado no se recorta`);
    assert.deepEqual(t, T.normalizeTalents(json(d.talents), cid), `${cid}/${spec}/Nv${L}: igual con y sin nivel`);
    const hero = { classId: cid, level: L, talents: t };
    for (const w of ['cls', 'spec', 'hero']) assert.equal(T.talentPointsLeft(json(hero), w), 0, `${cid}/${spec}/Nv${L}: puntos de ${w} gastados`);
    sweep++;
  }
  assert.equal(sweep, 9 * 91);
  // Nv ≥ 10 sin especialización elegida en v4: sin Recomendado (no hay build que aplicar), todos los
  // puntos libres para elegir y la barra de reserva de la clase
  for (const cid of CLASS_IDS) {
    const s = { ...json(REAL[`${cid}-40-${specsOf(cid)[0]}`]), talents: { v: 1, spec: null, cls: {}, sp: {}, choice: {} } };
    const p = load(s);
    assert.equal(p.talents.spec, null, `${cid} Nv40 sin especialización`);
    assert.deepEqual([p.talents.cls, p.talents.choice, p.talents.hero], [{}, {}, {}], `${cid} Nv40 sin especialización: sin talentos`);
    assert.deepEqual(p.talents, recoTalents(cid, null, 40), `${cid} Nv40 sin especialización: talentos vacíos`);
    assert.deepEqual(p.skillForge, ownForge(s), `${cid} Nv40 sin especialización: sin forja recomendada`);
    assert.equal(left(p, 'cls'), T.earnedAt('cls', 40), `${cid} Nv40 sin especialización: puntos de clase libres`);
    assert.deepEqual(p.hotbar, expectedBar(s.hotbar, p), `${cid} Nv40 sin especialización: barra`);
    for (const k of SLOTS) assert.ok(!skillOf(cid, p.hotbar[k])?.spec, `${cid} Nv40 sin especialización: ${k} sin kit de especialización`);
    checkBar(p, `${cid} Nv40 sin especialización`);
    assert.deepEqual(p.notices, ['paso2'], `${cid} Nv40 sin especialización: sin aviso de Recomendado`);
  }
  console.log(`✓ sintéticos: ${n} héroes Nv 10/40/69/70/80/100 (Paragon, Recomendado y barra de su especialización) y barrido Nv10–100 de las 9 especializaciones`);
}

// ------------------------------------------------ 4) niveles > 100
{
  for (const cid of CLASS_IDS) {
    const spec = specsOf(cid)[0];
    for (const [lvl, xp] of [[101, 5], [130, 9e15], [250, '9e99']]) {
      const s = { ...json(REAL[`${cid}-75-${spec}`]), level: lvl, xp };
      const d = S.migrateSave(s);
      assert.equal(d.level, 100, `${cid} Nv${lvl} → 100`);
      assert.ok(d.xp >= 0 && d.xp <= xpForLevel(100), `${cid} Nv${lvl}: XP acotada (${d.xp})`);
      const p = load(s);
      assert.equal(p.level, 100);
      assert.deepEqual(p.talents, recoTalents(cid, spec, 100), `${cid} Nv${lvl}: Recomendado entero del Nv100`);
      assert.deepEqual(['cls', 'spec', 'hero'].map(w => T.talentPointsEarned(p, w)), [T.TALENT_RULES.pts.cls, T.TALENT_RULES.pts.spec, T.TALENT_RULES.pts.hero], `${cid} Nv${lvl}: puntos del Nv100`);
      for (const w of ['cls', 'spec', 'hero']) assert.equal(left(p, w), 0, `${cid} Nv${lvl}: ${w} gastados`);
      assert.equal(T.paragonPointsLeft(p), T.TALENT_RULES.pts.board, `${cid} Nv${lvl}: tablero de glifos con sus 16 puntos`);
      assert.deepEqual(T.talentsTrimmed(p.talents), []);
    }
  }
  // XP válida por debajo del tope: no se toca
  assert.equal(S.migrateSave({ ...json(REAL['maga-60-crionte']), xp: 4321 }).xp, 4321);
}
console.log('✓ niveles > 100: nivel 100, XP acotada y los puntos del Nv100 gastados');

// ------------------------------------------------ 5) glifos
{
  const s = json(REAL['maga-40-piromante']);
  const uids = Object.values(s.paragon.glyphs).map(g => g.uid);
  assert.ok(uids.length >= 2, 'el save trae glifos engarzados');
  // bolsa LLENA de gemas distintas: los glifos son material de progreso y entran igual
  const gem = i => ({ uid: 9000 + i, kind: 'gem', gemId: `zz_gema_${i}`, name: 'Gema', ilvl: 1, rarity: 'magico', stats: { arm: 1 } });
  s.materials = Array.from({ length: MAX_MATERIALS }, (_, i) => gem(i));
  assert.equal(canAddMaterial(s.materials, gem(999)), false, 'la bolsa está llena para una gema');
  const full = load(s);
  assert.deepEqual(full.paragon, { nodes: {}, glyphs: {} }, 'ningún glifo suelto');
  for (const u of uids) assert.ok(full.materials.some(m => m.uid === u), `glifo ${u} en la bolsa llena`);
  assert.ok(!full.notices.includes('glifos-sueltos'));
  // si la migración no pudiera meterlos (bolsa que no acepta nada): SUELTOS en el tablero, con aviso,
  // ninguno perdido; el héroe los conserva al guardar y los recoge a la bolsa (economy)
  const d = S.migrateV4toV5(json(REAL['maga-40-piromante']), { canAddMaterial: () => false });
  d.saveVersion = 5;
  assert.deepEqual(d.paragon.glyphs, {}, 'ninguno en un zócalo v4');
  assert.deepEqual((d.paragon.loose || []).map(g => g.uid).sort(), [...uids].sort(), 'glifos sueltos (paragon.loose)');
  assert.ok(d.notices.includes('glifos-sueltos') && S.LOAD_NOTICES['glifos-sueltos'].length > 20, 'aviso de glifos sueltos');
  const g = { ...game(), ...economyMethods };
  const p = new Player(g, 'maga', json(d)); g.player = p;
  assert.deepEqual(saved(p).paragon.loose.map(x => x.uid).sort(), [...uids].sort(), 'se guardan sueltos');
  assert.deepEqual(g.looseGlyphs().map(x => x.uid).sort(), [...uids].sort());
  assert.equal(g.reclaimLooseGlyphs(), uids.length, 'se recogen todos');
  assert.ok(!('loose' in p.paragon), 'sin sueltos tras recogerlos');
  for (const u of uids) assert.ok(p.materials.some(m => m.uid === u), `glifo ${u} recogido`);
}
console.log('✓ glifos: a la bolsa aunque esté llena; si no caben, sueltos con aviso y se recogen');

// ------------------------------------------------ 6) recorte fino de saves v5 de ANTES del reorden
// Talentos que guardó el motor de antes del reorden por nivel del 22-oct (commit ee26ce1: la
// defaultBuild o la build indicada, comprada por buildRanks a ese nivel). Los árboles de clase no se
// reordenaron; en las especializaciones cambiaron de casilla, entre otros, a3↔a13 y a7↔a17
// (Arcanista), v20↔v3 (Tiradora) y m13↔m3, m14↔m7 (Montaraz) (MEMORIA.md, Paso 2f/2g punto 11).
// Controles: Piromante, Crionte y Francotiradora no se reordenaron (ee26ce1..33efa8b no toca sus
// nodos), así que no pierden nada; a Nv ≥ 70 (árbol héroe incluido) todo lo movido ya cabe
const NOT_REORDERED = ['piromante', 'crionte', 'francotiradora'];
const FITS = ['berserker/55', 'arcanista/75', 'montaraz/75'];
const PRE_REORDER = [
  ['guerrero', 'berserker', 'estampida', 40, { cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c20: 1, c24: 2, c1: 2, c5: 1 }, sp: { b3: 3, b7: 2, b6: 1, b10: 1, b2: 3, b13: 2, b14: 1, b17: 2, b21: 1 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c14: 'A', c16: 'A', c17: 'B', b9: 'A', b10: 'A' } }],
  ['guerrero', 'berserker', 'estampida', 55, { cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c20: 1, c24: 2, c1: 2, c5: 1, c9: 1, c12: 2, c13: 2, c16: 1, c21: 1, c23: 1 }, sp: { b3: 3, b7: 2, b6: 1, b10: 1, b2: 3, b13: 2, b14: 1, b17: 2, b21: 1, b9: 1, b16: 2, b20: 1, b24: 3 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c14: 'A', c16: 'A', c17: 'B', b9: 'A', b10: 'A' } }],
  ['guerrero', 'guardian', 'sismo', 20, { cls: { c1: 2, c2: 2, c5: 1 }, sp: { d2: 3, d5: 1, d9: 1, d1: 1 }, choice: { c5: 'A', c6: 'A', c9: 'A', c10: 'B', c15: 'A', c16: 'B', c17: 'B', d8: 'B', d9: 'B', d15: 'A' } }],
  ['guerrero', 'cruzado', 'celestial', 16, { cls: { c1: 2, c2: 1 }, sp: { z2: 3, z5: 1 }, choice: { c5: 'A', c6: 'A', c9: 'A', c10: 'B', c15: 'B', c16: 'B', c17: 'B', z8: 'B', z9: 'B', z15: 'B' } }],
  ['maga', 'arcanista', 'grieta', 24, { cls: { c1: 2, c4: 3, c5: 1, c8: 1 }, sp: { a3: 3, a7: 2, a6: 1, a10: 1, a2: 1 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B', a9: 'A', a10: 'A' } }],
  ['arquera', 'tiradora', 'galerna', 30, { cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1 }, sp: { v3: 3, v7: 2, v6: 1, v10: 1, v2: 1, v13: 2, v14: 1 }, choice: { c5: 'B', c6: 'A', c10: 'A', c11: 'B', c15: 'A', c16: 'B', c17: 'B', c22: 'B', v9: 'B', v10: 'A' } }],
  ['arquera', 'montaraz', 'zarzal', 20, { cls: { c1: 2, c4: 3 }, sp: { m3: 3, m7: 2, m6: 1 }, choice: { c5: 'B', c6: 'A', c10: 'A', c11: 'B', c15: 'A', c16: 'A', c17: 'B', c22: 'B', m9: 'A', m10: 'A' } }],
  // controles (mismo generador, ee26ce1)
  ['maga', 'piromante', 'brasa', 30, { cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1 }, sp: { s1: 3, s4: 2, s5: 1, s8: 1, s2: 1, s11: 2, s15: 1 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B', s8: 'A', s9: 'B', s15: 'B' } }],
  ['maga', 'crionte', 'glaciar', 45, { cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c9: 1, c16: 1 }, sp: { i1: 3, i4: 2, i5: 1, i8: 1, i2: 3, i11: 2, i15: 1, i18: 2, i9: 1, i12: 2 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B', i8: 'A', i9: 'A', i15: 'A' } }],
  ['arquera', 'francotiradora', 'puntodebil', 35, { cls: { c2: 2, c3: 2, c6: 1, c7: 1, c10: 1, c14: 1, c17: 1, c21: 1, c24: 2, c1: 1 }, sp: { f2: 3, f5: 1, f9: 1, f1: 3, f12: 2, f16: 2, f19: 1 }, choice: { c5: 'A', c6: 'B', c10: 'B', c11: 'B', c14: 'B', c15: 'B', c16: 'A', c17: 'B', f8: 'B', f9: 'B', f15: 'B' } }],
  ['maga', 'arcanista', 'grieta', 75, { cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c9: 1, c16: 1, c18: 2, c13: 2, c6: 1, c10: 1, c25: 3, c28: 3 }, sp: { a3: 3, a7: 2, a6: 1, a10: 1, a2: 3, a13: 2, a14: 1, a17: 2, a21: 1, a9: 1, a16: 2, a20: 2, a24: 3, a27: 3, a28: 4 }, choice: { c5: 'B', c6: 'B', c9: 'B', c10: 'A', c11: 'B', c14: 'A', c15: 'A', c16: 'B', c22: 'B', a9: 'A', a10: 'A' }, hero: { tree: 'crono', nodes: { crono: { t2: 1, t3: 1, t6: 1, t5: 1, t9: 1 } }, choice: { crono: { t2: 'A', t4: 'A', t8: 'A' } } } }],
  ['arquera', 'montaraz', 'zarzal', 75, { cls: { c1: 2, c4: 3, c5: 1, c8: 2, c11: 1, c15: 1, c19: 1, c22: 1, c2: 2, c12: 2, c6: 1, c10: 1, c16: 1, c18: 2, c13: 2, c17: 1, c25: 3, c28: 3 }, sp: { m3: 3, m7: 2, m6: 1, m10: 1, m2: 3, m13: 2, m14: 1, m17: 2, m21: 1, m9: 1, m16: 2, m20: 2, m24: 3, m27: 3, m28: 4 }, choice: { c5: 'B', c6: 'A', c10: 'A', c11: 'B', c15: 'A', c16: 'A', c17: 'B', c22: 'B', m9: 'A', m10: 'A' }, hero: { tree: 'h2', nodes: { h2: { w2: 1, w1: 1, w3: 1, w5: 1, w8: 1 } }, choice: { h2: { w2: 'A', w4: 'B', w8: 'B' } } } }],
];
// lo que el panel dejaría volver a comprar (un rango más del nodo, con los puntos libres del árbol)
const canBuyBack = (p, id) => T.canAddRank({ classId: p.classId, level: p.level, talents: json(p.talents) }, 'spec', id);
{
  let trims = 0, kept = 0;
  for (const [cid, spec, build, L, old] of PRE_REORDER) {
    const what = `${cid}/${spec}/${build}/Nv${L}`;
    const v5 = saved(load({ ...json(REAL[`${cid}-75-${spec}`]), level: L }));
    const oldHero = old.hero ? { [spec]: old.hero } : {};
    v5.talents = { v: 2, spec, cls: old.cls, sp: { [spec]: old.sp }, choice: old.choice, hero: oldHero, loadouts: {} };
    const tree = T.findSpec(cid, spec);
    const spentOld = T.spentIn({ nodes: tree.nodes }, old.sp);
    assert.equal(spentOld, T.earnedAt('spec', L), `${what}: el save viejo gastaba todos sus puntos`);
    const p = load(v5);
    const now = p.talents.sp[spec];
    const lost = Object.keys(old.sp).filter(id => (now[id] | 0) < old.sp[id]);
    // la clase no se reordenó: intacta; las elecciones A/B y el árbol héroe, también; la
    // especialización, solo baja (nada nuevo, nada que suba)
    assert.deepEqual(p.talents.cls, old.cls, `${what}: árbol de clase intacto`);
    assert.deepEqual(p.talents.choice, old.choice, `${what}: elecciones A/B intactas`);
    assert.deepEqual(p.talents.hero, oldHero, `${what}: árbol héroe intacto`);
    for (const [id, k] of Object.entries(now)) assert.ok(k <= (old.sp[id] | 0), `${what}: ${id} no sube`);
    // lo que queda es legal a su nivel y recupera los puntos de lo quitado
    assert.ok(T.validRanks({ nodes: tree.nodes, gates: T.SPEC_GATES }, now, L), `${what}: lo que queda vale`);
    assert.equal(left(p, 'spec'), spentOld - T.spentIn({ nodes: tree.nodes }, now), `${what}: puntos devueltos`);
    // SOLO lo que no vale: ningún rango quitado se puede volver a comprar con los puntos devueltos
    for (const id of lost) assert.equal(canBuyBack(p, id), false, `${what}: ${id} quitado porque ya no vale`);
    // recorta SOLO lo reordenado: los controles no pierden nada ni avisan
    const reordered = !NOT_REORDERED.includes(spec) && !FITS.includes(`${spec}/${L}`);
    assert.equal(lost.length > 0, reordered, `${what}: ${reordered ? 'recorta' : 'no recorta'} (${lost.join(', ') || 'nada'})`);
    if (!reordered) { assert.deepEqual(now, old.sp, `${what}: especialización intacta`); kept++; }
    // aviso al cargar, con texto, y una vez recortado ya no se recorta más
    assert.equal(p.notices.includes(T.TALENTS_TRIMMED_NOTICE), lost.length > 0, `${what}: aviso talentos-recortados`);
    assert.deepEqual(T.talentsTrimmed(load(saved(p)).talents), [], `${what}: recortado una vez`);
    if (lost.length) trims++;
    // los nodos que cambiaron de casilla (ejemplos de MEMORIA.md) se quitan; los de arriba que no se
    // movieron, se quedan
    if (spec === 'arcanista' && L < 70) assert.deepEqual([lost.includes('a3'), lost.includes('a7'), now.a2], [true, true, 1], `${what}: a3 y a7 bajaron de fila; a2 sigue`);
    if (spec === 'montaraz' && L < 70) assert.ok(lost.includes('m3') && lost.includes('m7'), `${what}: m3 y m7 bajaron de fila`);
    if (spec === 'tiradora') assert.ok(lost.includes('v3') && now.v2 === 1, `${what}: v3 bajó de fila; v2 sigue`);
  }
  assert.deepEqual([trims, kept], [6, 6], 'recortan los 6 reordenados de Nv < 70 salvo el Berserker Nv55 (lo movido ya cabe); los 6 controles, nada');
  assert.ok(S.LOAD_NOTICES[T.TALENTS_TRIMMED_NOTICE].length > 20);
}
console.log('✓ recorte fino: los saves v5 de antes del reorden pierden solo lo que no vale, recuperan los puntos y avisan; los controles (sin reorden o Nv ≥ 70 con árbol héroe) no pierden nada');

// ------------------------------------------------ 7) pestaña vieja abierta (riesgo 20)
// El código v4 (163dded) que abre un save ya migrado lo lee como «versión futura» y, al guardar,
// escribe su formato: saveVersion 4, talentos v1, skillMods/skillBranches/skillPoints, `points` en
// el tablero, sin skillForge y sin las habilidades de la barra que v4 no conocía o no cabían en su
// ranura (V4_SKILLS). Esos campos y ese filtro siguen al código v4; el CONTENIDO de los talentos v1
// es aproximado (la re-migración solo lee su `spec`), así que se prueban dos formas: 'cut' (todo a
// rango 1, sp solo con la especialización) y 'empty' (aproxima la que deja el código v4 en 8 de las
// 9 especializaciones: los rangos de clase se conservan —v4 los topa a su máximo v1— y sp queda
// vacío en las tres)
const V4_ROWS = Object.fromEntries(CLASS_IDS.map(cid => [cid, Object.fromEntries(S.V4_SKILLS[cid].map(r => { const [id, , , , slots] = r.split(' '); return [id, slots.split('/')]; }))]));
const v1Cut = ranks => Object.fromEntries(Object.keys(ranks || {}).map(id => [id, 1]));
function staleV4(v5, shape = 'cut') {
  const t = v5.talents;
  const cls = shape === 'cut' ? v1Cut(t.cls) : { ...t.cls };
  const sp = shape === 'cut' ? { [t.spec]: v1Cut(t.sp[t.spec]) } : Object.fromEntries(specsOf(v5.classId).map(s => [s, {}]));
  const o = { ...json(v5), saveVersion: 4, skillPoints: 0, skillBranches: {}, skillMods: {},
    talents: { v: 1, spec: t.spec, cls, sp, choice: { ...t.choice } }, paragon: { ...json(v5.paragon), points: 0 } };
  delete o.skillForge;
  delete o.hotbarManual;              // campo de S0: el código v4 no lo guarda
  for (const k of SLOTS) if (o.hotbar[k] && !V4_ROWS[o.classId][o.hotbar[k]]?.includes(k)) o.hotbar[k] = null;
  return o;
}
{
  let lostForge = 0, lostSlots = 0, refilled = 0;
  for (const cid of CLASS_IDS) for (const spec of specsOf(cid)) {
    const first = load(REAL[`${cid}-60-${spec}`]);
    const v5 = saved(first);
    let prev = null;
    for (const shape of ['cut', 'empty']) {
      const what = `${cid}/${spec} (${shape})`;
      const stale = staleV4(v5, shape);
      const p = load(stale);
      // vuelve a ser un v5 válido: los ids v1 no se leen como v2 (se aplica otra vez el Recomendado)
      assert.equal(p.talents.v, 2);
      assert.deepEqual(p.talents, first.talents, `${what}: Recomendado entero otra vez`);
      assert.deepEqual(T.talentsTrimmed(p.talents), [], `${what}: sin recorte`);
      checkBar(p, `${what} re-migrado`);
      // lo que la pestaña vieja dejó en la barra sigue en su ranura (las tablas legadas no mueven ids 2g)
      for (const k of SLOTS) if (stale.hotbar[k]) assert.equal(p.hotbar[k], stale.hotbar[k], `${what}: ${k} = ${stale.hotbar[k]}`);
      // la forja vuelve a ser la recomendada de la especialización (D3)
      assert.deepEqual(p.skillForge, FORGE_RECO[spec], `${what}: forja recomendada`);
      assert.deepEqual(p.paragon, { nodes: {}, glyphs: {} });
      assert.ok(p.notices.includes('paso2'), `${what}: avisa otra vez`);
      // y una vez re-migrado, estable; la forma de los talentos v1 no cambia nada
      assert.deepEqual(saved(load(saved(p))), saved(p), `${what}: estable tras re-migrar`);
      if (prev) assert.deepEqual(saved(p), prev, `${what}: igual con las dos formas de talentos v1`);
      prev = saved(p);
      // las ranuras que v4 vació (habilidades 2g que no conocía) se rellenan como en un héroe nuevo
      // (test80 §5): la insignia vuelve a la 3 y la definitiva a la 4
      const want = SPEC_BAR[spec].bar;
      assert.equal(p.hotbar.k3, want.k3, `${what}: la insignia vuelve a la 3`);
      assert.equal(p.hotbar.k4, want.k4, `${what}: la definitiva vuelve a la 4`);
      assert.deepEqual(p.hotbar, expectedBar(stale.hotbar, p), `${what}: barra esperada al re-migrar`);
      if (shape !== 'cut') continue;
      // REGISTRO DE LA PÉRDIDA (riesgo 20; qué hacer con ella lo decide el dueño): las variantes
      // elegidas que no son la recomendada y lo que la barra no recupera (lo que v4 vació y no viene
      // de SPEC_BAR)
      lostForge += Object.keys(first.skillForge).filter(id => first.skillForge[id] !== p.skillForge[id]).length;
      for (const k of SLOTS) if (k !== 'lmb' && first.hotbar[k] && !stale.hotbar[k]) {
        refilled++;
        if (p.hotbar[k] !== first.hotbar[k]) lostSlots++;
      }
    }
  }
  assert.ok(refilled > 0 && lostForge > 0, 'la pérdida queda medida');
  console.log(`✓ pestaña vieja: un v5 que el código v4 vuelve a guardar se migra otra vez, válido, estable y con la forja recomendada; pierde ${lostForge} variantes elegidas; de ${refilled} ranuras que v4 vació, ${refilled - lostSlots} vuelven a su habilidad (insignia y definitiva) y ${lostSlots} reciben otra (riesgo 20)`);
}

// ------------------------------------------------ 8) respaldo .bak-v4 y avisos en pantalla (main.js)
// main.js no se importa headless (window, DOM): se evalúan aparte sus métodos slotKey y backupBeforeV5
function mainMethod(name) {
  const m = new RegExp(`\\n  ${name}\\([^)]*\\) \\{`).exec(MAIN);
  assert.ok(m, `main.js define ${name}()`);
  let depth = 0;
  for (let k = m.index + m[0].length - 1; k < MAIN.length; k++) {
    if (MAIN[k] === '{') depth++;
    else if (MAIN[k] === '}' && --depth === 0) return MAIN.slice(m.index + 1, k + 1);
  }
  throw new Error(`main.js: ${name} sin cerrar`);
}
function fakeStorage({ full = false } = {}) {
  const m = new Map();
  return { m, getItem: k => (m.has(k) ? m.get(k) : null), setItem(k, v) { if (full) throw new Error('QuotaExceededError'); m.set(k, String(v)); } };
}
const backupGame = (ls, warns) => new Function('localStorage', 'console', `return { ${mainMethod('slotKey')}, ${mainMethod('backupBeforeV5')} };`)(ls, { warn: (...a) => warns.push(a) });
{
  const ls = fakeStorage(), warns = [];
  const G = backupGame(ls, warns);
  // texto NO canónico (sangrado): distingue el texto crudo de un JSON re-serializado
  const raw = JSON.stringify(REAL['maga-40-piromante'], null, 2);
  assert.notEqual(raw, JSON.stringify(JSON.parse(raw)));
  const bak = slot => ls.getItem(`${G.slotKey(slot)}.bak-v4`);
  // un v4: copia única del texto crudo en <clave del hueco>.bak-v4
  assert.equal(G.backupBeforeV5(0, raw, JSON.parse(raw)), true, 'un v4 se respalda');
  assert.equal(bak(0), raw, 'el respaldo es el texto crudo del save v4 (byte a byte, no re-serializado)');
  assert.equal(G.slotKey(0), 'intentorpg_save_slot0');
  // la pestaña vieja vuelve a guardar un v4 en el hueco: el respaldo NO se pisa (sigue el original)
  const staleRaw = JSON.stringify(staleV4(saved(load(REAL['maga-40-piromante']))));
  assert.equal(G.backupBeforeV5(0, staleRaw, JSON.parse(staleRaw)), false, 'con respaldo, no se vuelve a escribir');
  assert.equal(bak(0), raw, 'el respaldo no se pisa');
  // un v5 no se respalda; un v0 (sin saveVersion) sí; cada hueco tiene el suyo
  const v5raw = JSON.stringify(saved(load(REAL['arquera-50-montaraz'])));
  assert.equal(G.backupBeforeV5(1, v5raw, JSON.parse(v5raw)), false, 'un v5 no se respalda');
  assert.equal(bak(1), null, 'sin respaldo de un v5');
  const v0raw = JSON.stringify({ classId: 'guerrero', level: 12, xp: 5 });
  assert.equal(G.backupBeforeV5(2, v0raw, JSON.parse(v0raw)), true, 'un v0 se respalda');
  assert.equal(bak(2), v0raw, 'respaldo del hueco 2');
  assert.equal(G.backupBeforeV5(1, null, null), false, 'sin texto no hay respaldo');
  assert.equal(bak(1), null, 'sin texto no se escribe nada');
  assert.equal(warns.length, 0, 'sin avisos de consola con espacio');
  // localStorage lleno: no lanza, avisa por consola y se migra igual
  const fullWarns = [];
  const F = backupGame(fakeStorage({ full: true }), fullWarns);
  assert.equal(F.backupBeforeV5(0, raw, JSON.parse(raw)), false, 'con la cuota llena no hay respaldo (y no lanza)');
  assert.equal(fullWarns.length, 1, 'avisa por consola');
  // el respaldo va ANTES de que Player migre, y Player no toca el objeto que recibe
  const start = mainMethod('startGame');
  const iBak = start.indexOf('this.backupBeforeV5(slot, raw, saved)'), iPlayer = start.indexOf('new Player(this, classId, saved');
  assert.ok(iBak > 0 && iPlayer > iBak, 'startGame respalda antes de crear el Player');
  const parsed = JSON.parse(raw);
  new Player(game(), parsed.classId, parsed);
  assert.deepEqual(parsed, JSON.parse(raw), 'Player migra una copia: el save leído queda intacto');
  // los avisos de la migración se enseñan al entrar (texto de LOAD_NOTICES) y se vacían
  assert.ok(/for \(const n of this\.player\.notices \|\| \[\]\) if \(LOAD_NOTICES\[n\]\) this\.ui\.message\(LOAD_NOTICES\[n\]/.test(start), 'startGame enseña los avisos');
  assert.ok(start.includes('this.player.notices = [];'), 'y los vacía');
  for (const id of ['talentos', 'paso2', 'paso2-guerrero', 'paso2-maga', 'paso2-arquera', T.TALENTS_TRIMMED_NOTICE, 'glifos-sueltos'])
    assert.ok(typeof S.LOAD_NOTICES[id] === 'string' && S.LOAD_NOTICES[id].length > 20, `LOAD_NOTICES['${id}']`);
  assert.ok(!S.PLAYER_SAVE_FIELDS.includes('notices'), 'los avisos no se guardan: salen una vez');
}
console.log('✓ respaldo .bak-v4: copia única del texto crudo, no se pisa, sin v5, hueco a hueco, con la cuota llena; avisos al entrar');

// ------------------------------------------------ 9) cadena v3 → v5 (saves reales del Paso 2b)
{
  let n = 0, v3Swapped = 0;
  for (const [name, s3] of Object.entries(V3)) {
    if (!s3 || typeof s3 !== 'object' || s3.saveVersion !== 3) continue;
    const p = load(s3);
    const spec = s3.mastery?.id && s3.level >= T.TALENT_RULES.specAt ? s3.mastery.id : null;
    assert.equal(p.talents.spec, spec, `${name}: la maestría es la especialización`);
    assert.deepEqual(T.talentsTrimmed(p.talents), [], `${name}: sin recorte`);
    for (const w of ['cls', 'spec', 'hero']) if (spec) assert.equal(left(p, w), 0, `${name}: ${w} gastados`);
    checkBar(p, name);
    // MIGRATIONS[3] puso la insignia v4 en la 3; MIGRATIONS[4] la cambia por la de 2g
    if (spec) assert.equal(p.hotbar.k3, SPEC_BAR[spec].bar.k3, `${name}: insignia de ${spec} en la 3`);
    // la pasada S0 al cargar (un v3 no trae hotbarManual) avisa si cambió la barra que dejó la migración
    const swapped = SLOTS.some(k => (S.migrateSave(s3).hotbar[k] || null) !== (p.hotbar[k] || null));
    if (swapped) v3Swapped++;
    assert.deepEqual(p.notices, [...(spec ? ['talentos'] : []), 'paso2', ...(spec ? [`paso2-${p.classId}`] : []), ...(swapped ? [S.SPEC_BAR_NOTICE] : [])], `${name}: avisos`);
    assert.deepEqual(saved(load(saved(p))), saved(p), `${name}: estable`);
    n++;
  }
  assert.ok(n >= 6, `saves v3: ${n} (${v3Swapped} con la pasada S0 de la barra)`);
}
console.log('✓ cadena v3 → v5: maestría → especialización, insignia 2g en la 3, avisos y estable');

console.log('\n✅ GUARDADO v5 con los saves reales (test-save-2g): migración final OK');
