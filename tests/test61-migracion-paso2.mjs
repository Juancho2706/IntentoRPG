// Cadena de migraciones del guardado hasta v5 (docs/paso2-implementacion.md §3.11)
//  · MIGRATIONS[2] (v2→v3, Paso 2b) y [3] (v3→v4, Paso 2c.0) CONGELADAS (D16): su salida se
//    comprueba contra el catálogo v4 copiado (tests/fixtures/catalog-v4.json) y NO cambia
//    aunque cambie el catálogo vivo (se vacía CLASSES/SUPPORTS y se repite)
//    - puntos libres + ramas conservadas = puntos de Nv2–20; ramas de pasivas eliminadas fuera
//    - barra v3: rmb = 1.ª gastadora vieja · k1 = movilidad · k2 = utilidad o 2.ª gastadora ·
//      k4 = definitiva vieja; en v4, k3 = la insignia v4 de la especialización
//    - soportes incompatibles por tags (v4) se desengarzan (siguen en knownSupports)
//  · la cadena completa v0/v1/v2/Paso 0 → v5 y v3 → v5 (saves reales del Paso 2b): sin
//    puntos ni ramas, talentos v2 con la especialización, barra válida, idempotente, carga
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CLASSES, SUPPORTS } from '../js/data.js';
import { migrateSave, SAVE_VERSION, MIGRATIONS, REMOVED_SKILLS_V3, LOAD_NOTICES, PLAYER_SAVE_FIELDS, V4_INSIGNIA } from '../js/save-schema.js';
import { talentPointsLeft, aggregateTalents } from '../js/talents.js';
import { skillSlots, supportFits } from '../js/skill-defs.js';
import { fitsSlot, isKnown } from '../js/skill-resolve.js';
import { Player } from '../js/entities.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const mk = () => ({ ui: { spawnText() {}, message() {} }, sfx() {}, world: null, enemies: [], projectiles: [], input: { joyDir: null, keyDir: null } });
const json = o => JSON.parse(JSON.stringify(o));
const CAT4 = JSON.parse(readFileSync(new URL('./fixtures/catalog-v4.json', import.meta.url), 'utf8'));
assert.equal(SAVE_VERSION, 5);
// la cadena de migraciones hasta una versión concreta (para comprobar los intermedios)
function migrateTo(data, target) {
  let d = json(data), v = Number.isInteger(d.saveVersion) ? d.saveVersion : 0;
  while (v < target) { d = MIGRATIONS[v](d) || d; v++; d.saveVersion = v; }
  return d;
}
// el catálogo vivo vaciado: las migraciones congeladas deben dar lo mismo
function withoutLiveCatalog(fn) {
  const saved = Object.fromEntries(Object.entries(CLASSES).map(([k, c]) => [k, c.skills]));
  const sup = SUPPORTS.splice(0, SUPPORTS.length);
  try { for (const c of Object.values(CLASSES)) c.skills = []; return fn(); }
  finally { for (const [k, s] of Object.entries(saved)) CLASSES[k].skills = s; SUPPORTS.push(...sup); }
}

// ------------------------------------------------ catálogo v4 congelado
const skills4 = cid => CAT4.classes[cid].skills;
const skill4 = (cid, id) => skills4(cid).find(s => s.id === id);
const firstBranch = (cid, id) => CAT4.classes[cid].mods?.[id]?.[0]?.id;
for (const cid of ['guerrero', 'maga', 'arquera'])
  for (const [spec, s] of Object.entries(CAT4.classes[cid].specs)) assert.equal(V4_INSIGNIA[cid][spec], s.insignia, `V4_INSIGNIA ${cid}/${spec} = catalog-v4`);

// barra según el catálogo v4 (intermedios v3/v4)
function checkHotbarV4(cid, hb, level, k3 = null) {
  const seen = new Set();
  for (const [slot, id] of Object.entries(hb)) {
    if (!id) continue;
    const sk = skill4(cid, id) || Object.values(CAT4.classes[cid].specs).some(s => s.insignia === id) && { slots: ['k3'], req: 10 };
    assert.ok(sk, `${cid}: id huérfano en la barra ${slot}=${id}`);
    assert.ok(skillSlots(sk).includes(slot), `${cid}: ${id} no va en ${slot}`);
    assert.ok((sk.req || 1) <= level, `${cid}: ${id} aún no se conoce a Nv${level}`);
    assert.ok(!seen.has(id), `${cid}: ${id} repetido en la barra`);
    seen.add(id);
  }
  assert.ok(hb.lmb, `${cid}: 🖱️Izq nunca vacía`);
  assert.equal(hb.k3, k3, k3 ? 'k3 = la insignia de la especialización (v4)' : 'k3 vacía hasta elegir especialización');
}
// barra v5 según el catálogo VIVO y los talentos nuevos
function checkHotbarV5(d, what) {
  const cls = CLASSES[d.classId];
  const hero = { classId: d.classId, level: d.level, talents: d.talents, skillForge: d.skillForge };
  hero.talentAgg = aggregateTalents(hero);
  const ids = Object.values(d.hotbar).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `${what}: sin duplicados`);
  assert.ok(d.hotbar.lmb, `${what}: lmb`);
  for (const [slot, id] of Object.entries(d.hotbar)) {
    if (!id) continue;
    const sk = cls.skills.find(s => s.id === id);
    assert.ok(sk && fitsSlot(sk, slot) && isKnown(hero, sk), `${what}: ${slot}=${id} válida`);
  }
}
const checkV5 = (d, what) => {
  assert.equal(d.saveVersion, 5, what);
  for (const k of ['skillPoints', 'skillBranches', 'skillMods', 'mastery', 'skills']) assert.ok(!(k in d), `${what}: sin ${k}`);
  assert.equal(d.talents.v, 2, `${what}: talentos v2`);
  assert.equal(typeof d.skillForge, 'object');
  assert.ok(d.paragon && !('points' in d.paragon) && Object.keys(d.paragon.nodes).length === 0, `${what}: tablero sin nodos ni puntos`);
  checkHotbarV5(d, what);
  assert.deepEqual(migrateSave(d), d, `${what}: migrar dos veces da lo mismo`);
};

// fixtures por clase: la barra vieja "libre" con dos gastadoras, una movilidad/utilidad y la definitiva
const FIX = {
  guerrero: { level: 26, sp1: 'torbellino', sp2: 'g_lanza', mv: 'embestida', ut: 'grito_guerra', ult: 'g_u_cataclismo', passive: 'g_p_fuerza', mastery: 'berserker',
    supports: { torbellino: ['multi', 'amplify'], g_lanza: ['multi', 'wide'], g_p_fuerza: ['amplify'] } },
  maga: { level: 18, sp1: 'bola_fuego', sp2: 'meteoro', mv: null, ut: null, ult: 'm_u_supernova', passive: 'm_p_arcano', mastery: 'piromante',
    supports: { bola_fuego: ['multi', 'wide'], meteoro: ['wide', 'pierce'] } },
  arquera: { level: 33, sp1: 'flecha_perforante', sp2: 'flecha_multiple', mv: 'agilidad', ut: null, ult: 'a_u_diluvio', passive: 'a_p_punteria', mastery: 'francotiradora',
    supports: { flecha_perforante: ['pierce', 'amplify'], flecha_multiple: ['wide', 'multi'], a_u_diluvio: ['amplify', 'wide'] } },
};

for (const [cid, f] of Object.entries(FIX)) {
  const weapon = CAT4.classes[cid].weaponBasic;
  const earned = Math.min(f.level, 20) - 1;
  const oldBar = { lmb: weapon, rmb: f.sp1, k1: f.sp2, k2: f.mv || f.ult, k3: f.ut, k4: f.ult };
  const branches = { [f.sp1]: { [firstBranch(cid, f.sp1)]: true }, [f.sp2]: { [firstBranch(cid, f.sp2)]: true, [`${f.sp2}_v`]: true },
    [f.passive]: { [`${f.passive}_o`]: true } };           // rama de una pasiva eliminada
  const mods = { [f.sp1]: { [firstBranch(cid, f.sp1)]: `${firstBranch(cid, f.sp1)}1` } };
  const skills = { [weapon]: 1, [f.sp1]: 4, [f.sp2]: 3, [f.ult]: 1, [f.passive]: 2 };
  const base = { classId: cid, level: f.level, xp: 10, attributes: { ...CLASSES[cid].base }, gold: 100, hotbar: oldBar,
    skills, skillBranches: branches, skillMods: mods, supports: f.supports, knownSupports: ['multi', 'amplify', 'wide', 'pierce'],
    mastery: { id: f.mastery, nodes: {}, points: 2 } };
  const keptBranches = 3; // sp1 (1) + sp2 (2); la de la pasiva se devuelve
  const ins = V4_INSIGNIA[cid][f.mastery];

  // ---- v2 (Paso 1A) con el sistema de habilidades v4 → v3 (Paso 2b) ----
  const v2 = { ...json(base), saveVersion: 2, skillSystemV: 4, skillPoints: earned - (4 + 3 + 1 + 2 - 1) - 4 };
  const m3 = migrateTo(v2, 3);
  assert.equal(m3.saveVersion, 3); assert.equal(m3.skillSystemV, 5);
  assert.equal(m3.skills, undefined, 'skills ya no se persiste');
  assert.equal(m3.skillPoints + keptBranches, earned, `${cid} v2: puntos libres + ramas = ${earned}`);
  assert.ok(!m3.skillBranches[f.passive], `${cid}: la rama de ${f.passive} se descarta`);
  assert.ok(REMOVED_SKILLS_V3.includes(f.passive));
  assert.equal(Object.keys(m3.skillBranches[f.sp2]).length, 2, 'las ramas válidas se conservan');
  assert.deepEqual(m3.skillMods, mods, 'la opción elegida de una rama conservada se mantiene (en bruto, para MIGRATIONS[4])');
  checkHotbarV4(cid, m3.hotbar, f.level);
  assert.equal(m3.hotbar.rmb, f.sp1, 'rmb = primera gastadora de la barra vieja');
  assert.equal(m3.hotbar.k4, f.ult, 'k4 = la definitiva vieja');
  if (f.mv) assert.equal(m3.hotbar.k1, f.mv, 'k1 = la movilidad que había');
  if (f.ut) assert.equal(m3.hotbar.k2, f.ut, 'k2 = la utilidad que había');
  else assert.equal(m3.hotbar.k2, f.sp2, 'k2 = la SEGUNDA gastadora vieja');
  const sups4 = CAT4.supports;
  for (const [skId, list] of Object.entries(m3.supports)) {
    const sk = skill4(cid, skId);
    assert.ok(sk, `${cid}: soporte en habilidad inexistente ${skId}`);
    for (const id of list) assert.ok(supportFits(sups4.find(s => s.id === id), sk), `${cid}: ${id} no encaja en ${skId} (v4)`);
    assert.ok(list.length <= (sk.cat === 'ultimate' || sk.cat === 'basic' ? 1 : 2));
  }
  assert.ok(!m3.supports[f.passive], 'soportes de habilidades eliminadas fuera');
  assert.deepEqual(m3.knownSupports, base.knownSupports, 'siguen aprendidos');
  assert.deepEqual(MIGRATIONS[2](json(m3)), m3, 'MIGRATIONS[2] es idempotente');
  assert.equal(m3.mastery.id, f.mastery, 'en v3 la maestría sigue ahí');

  // ---- v3 → v4 (Paso 2c.0): maestría → especialización; k3 = la insignia v4 ----
  const m4 = migrateTo(v2, 4);
  assert.equal(m4.mastery, undefined, 'mastery fuera del guardado');
  assert.deepEqual(m4.talents, { v: 1, spec: f.mastery, cls: {}, sp: Object.fromEntries(Object.keys(CAT4.classes[cid].specs).map(s => [s, {}])), choice: {} }, 'talentos v1 escritos tal cual');
  checkHotbarV4(cid, m4.hotbar, f.level, ins);
  assert.deepEqual(m4.notices, ['talentos']);

  // ---- congeladas: sin catálogo vivo, la misma salida (v0, v1, v2 y Paso 0) ----
  const v1 = { ...json(base), saveVersion: 1, skillSystemV: 4, skillPoints: 0 };
  const v0 = { ...json(base), skillSystemV: 3, skillPoints: 2 };
  const p0 = { ...json(base), skillSystemV: 4, skillPoints: 1 };
  const live = [v2, v1, v0, p0].map(s => migrateTo(s, 4));
  const frozen = withoutLiveCatalog(() => [v2, v1, v0, p0].map(s => migrateTo(s, 4)));
  assert.deepEqual(frozen, live, `${cid}: MIGRATIONS[0]–[3] no leen el catálogo vivo (D16)`);
  assert.equal(live[1].skillPoints + keptBranches, earned, `${cid} v1: puntos coherentes`);
  assert.equal(live[2].skillPoints, earned, `${cid} v0: todas las ramas se reembolsaron en v0`);
  assert.deepEqual(live[2].skillBranches, {});
  assert.equal(live[3].skillPoints + keptBranches, earned, `${cid} Paso 0: sin reembolso doble`);
  for (const m of live) checkHotbarV4(cid, m.hotbar, f.level, ins);

  // ---- toda la cadena hasta v5 ----
  for (const [name, s] of [['v2', v2], ['v1', v1], ['v0', v0], ['Paso 0', p0]]) {
    const m5 = migrateSave(s);
    checkV5(m5, `${cid} ${name}`);
    assert.equal(m5.talents.spec, f.mastery, `${cid} ${name}: la maestría sigue siendo la especialización`);
    assert.ok(m5.notices.includes('talentos') && m5.notices.includes('paso2') && m5.notices.includes(`paso2-${cid}`), `${cid} ${name}: avisos`);
  }
  // el héroe carga y guarda lo mismo dos veces
  const hero = new Player(mk(), cid, json(v2));
  assert.equal(hero.talents.spec, f.mastery, 'la especialización llega al héroe');
  assert.ok(hero.skills[f.sp1] > 0 && hero.skills[weapon] > 0, 'habilidades conocidas por nivel');
  const s1 = json(hero.toSaveData());
  assert.deepEqual(json(new Player(mk(), cid, json(s1)).toSaveData()), s1, `${cid}: recargar dos veces da el mismo guardado`);
  console.log(`${CLASSES[cid].name}: v0/v1/v2/Paso 0 → v3 → v4 congeladas (catálogo v4) → v5 ✓`);
}

// barra a nivel bajo (v3 congelada): sin movilidad/defensa antes de su nivel; sin gastadora vieja → la A
{
  const lowSave = { classId: 'guerrero', level: 3, saveVersion: 2, skillSystemV: 4, hotbar: { lmb: 'basic', rmb: null }, skills: { g_tajo: 1 } };
  const m = migrateTo(lowSave, 4);
  assert.equal(m.hotbar.lmb, 'g_tajo', 'literal viejo basic → básico de arma');
  assert.equal(m.hotbar.rmb, 'torbellino', 'sin gastadora vieja: la gastadora A (Nv2)');
  assert.equal(m.hotbar.k1, null, 'movilidad solo desde Nv4');
  assert.equal(m.skillPoints, 2);
  checkV5(migrateSave(lowSave), 'Nv3');
  console.log('Barra a nivel bajo: gastadora A, sin movilidad antes de Nv4 ✓');
}

// ------------------------------------------------ v3 → v4 → v5 con saves REALES del Paso 2b
// tests/fixtures/saves-v3-paso2b.json: Player.toSaveData() del código de 1717389
{
  const FX = JSON.parse(readFileSync(new URL('./fixtures/saves-v3-paso2b.json', import.meta.url), 'utf8'));
  assert.ok(Object.keys(FX).length >= 6);
  for (const [name, save] of Object.entries(FX)) {
    assert.equal(save.saveVersion, 3, `${name}: fixture v3`);
    assert.ok(save.mastery && !('talents' in save), `${name}: fixture con el formato viejo`);
    const cid = save.classId, mid = save.mastery.id;
    const m4 = migrateTo(save, 4);
    assert.ok(!('mastery' in m4), `${name}: sin mastery`);
    assert.equal(m4.talents.spec, mid || null, `${name}: especialización = maestría vieja`);
    assert.deepEqual(m4.talents.cls, {}, `${name}: los puntos se calculan (no se convierten)`);
    if (mid && save.level >= 10) {
      assert.equal(m4.hotbar.k3, V4_INSIGNIA[cid][mid], `${name}: k3 = insignia`);
      assert.deepEqual(m4.notices, ['talentos'], `${name}: aviso de la migración`);
      assert.ok(LOAD_NOTICES.talentos.includes('talentos'));
    } else {
      assert.equal(m4.hotbar.k3, null, `${name}: sin especialización, k3 vacía`);
      assert.ok(!m4.notices?.length, `${name}: sin aviso si no tenía maestría`);
    }
    assert.deepEqual(MIGRATIONS[3](json(m4)), m4, `${name}: MIGRATIONS[3] es idempotente`);
    assert.deepEqual(withoutLiveCatalog(() => migrateTo(save, 4)), m4, `${name}: [3] congelada`);
    // hasta v5
    const m5 = migrateSave(save);
    checkV5(m5, name);
    assert.equal(m5.talents.spec, mid && save.level >= 10 ? mid : null, `${name}: especialización en v5`);
    const hero = new Player(mk(), cid, json(m5));
    assert.equal(hero.mastery, undefined);
    assert.ok(talentPointsLeft(hero, 'cls') >= 0 && talentPointsLeft(hero, 'spec') >= 0);
    assert.equal(hero.gold, save.gold, `${name}: el resto del héroe intacto`);
    assert.equal(hero.level, save.level);
    const s1 = json(hero.toSaveData());
    for (const k of PLAYER_SAVE_FIELDS) assert.ok(k in s1, `${name}: falta ${k}`);
    const again = json(new Player(mk(), cid, json(s1)).toSaveData());
    assert.deepEqual(again, s1, `${name}: recargar dos veces da el mismo guardado`);
    assert.deepEqual(aggregateTalents(hero).grants, hero.talentAgg.grants);
  }
  console.log(`v3 → v4 → v5 con ${Object.keys(FX).length} saves reales del Paso 2b: congeladas, especialización, aviso, idempotente ✓`);
}
console.log('\n✅ CADENA DE MIGRACIONES HASTA v5 (congeladas [0]–[3]) OK');
