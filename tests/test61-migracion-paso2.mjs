// Paso 2b.0 — migración de guardado v2→v3 (MIGRATIONS[2], docs/paso2-diseno.md §8)
// Saves v0, v1 y v2 de las TRES clases con rangos, ramas, maestría y soportes:
//  - suma de puntos correcta (puntos libres + ramas conservadas = puntos de Nv2–20)
//  - las ramas de habilidades eliminadas (pasivas g_p_*/m_p_arcano/a_p_punteria) se descartan
//  - hotbar sin ids huérfanos, cada habilidad en una ranura de su categoría, sin duplicados
//  - reglas de la barra: rmb = 1.ª gastadora vieja · k1 = movilidad · k2 = utilidad o
//    2.ª gastadora vieja · k4 = definitiva vieja · k3 vacía
//  - soportes incompatibles por tags se desengarzan (siguen en knownSupports)
//  - migrar dos veces da lo mismo; un save del Paso 0 (v4 de habilidades) entra sin
//    reembolsos dobles
import assert from 'node:assert/strict';
import { CLASSES, SKILL_MODS } from '../js/data.js';
import { migrateSave, SAVE_VERSION, MIGRATIONS, REMOVED_SKILLS_V3 } from '../js/save-schema.js';
import { skillSlots, supportFits } from '../js/skill-defs.js';
import { SUPPORTS } from '../js/data.js';
import { Player } from '../js/entities.js';

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const mk = () => ({ ui: { spawnText() {}, message() {} }, sfx() {}, world: null, enemies: [], projectiles: [], input: { joyDir: null, keyDir: null } });
const json = o => JSON.parse(JSON.stringify(o));
assert.equal(SAVE_VERSION, 3);

const firstBranch = id => SKILL_MODS[id]?.[0]?.id;
function checkHotbar(cid, hb, level) {
  const cls = CLASSES[cid];
  const seen = new Set();
  for (const [slot, id] of Object.entries(hb)) {
    if (!id) continue;
    const sk = cls.skills.find(s => s.id === id);
    assert.ok(sk, `${cid}: id huérfano en la barra ${slot}=${id}`);
    assert.ok(skillSlots(sk).includes(slot), `${cid}: ${id} no va en ${slot}`);
    assert.ok((sk.req || 1) <= level, `${cid}: ${id} aún no se conoce a Nv${level}`);
    assert.ok(!seen.has(id), `${cid}: ${id} repetido en la barra`);
    seen.add(id);
  }
  assert.ok(hb.lmb, `${cid}: 🖱️Izq nunca vacía`);
  assert.equal(hb.k3, null, 'k3 vacía hasta elegir especialización');
}

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
  const cls = CLASSES[cid];
  const weapon = cls.skills.find(s => s.cat === 'basic' && s.type === 'weapon').id;
  const earned = Math.min(f.level, 20) - 1;
  const oldBar = { lmb: weapon, rmb: f.sp1, k1: f.sp2, k2: f.mv || f.ult, k3: f.ut, k4: f.ult };
  const branches = { [f.sp1]: { [firstBranch(f.sp1)]: true }, [f.sp2]: { [firstBranch(f.sp2)]: true, [`${f.sp2}_v`]: true },
    [f.passive]: { [`${f.passive}_o`]: true } };           // rama de una pasiva eliminada
  const mods = { [f.sp1]: { [firstBranch(f.sp1)]: `${firstBranch(f.sp1)}1` } };
  const skills = { [weapon]: 1, [f.sp1]: 4, [f.sp2]: 3, [f.ult]: 1, [f.passive]: 2 };
  const base = { classId: cid, level: f.level, xp: 10, attributes: { ...cls.base }, gold: 100, hotbar: oldBar,
    skills, skillBranches: branches, skillMods: mods, supports: f.supports, knownSupports: ['multi', 'amplify', 'wide', 'pierce'],
    mastery: { id: f.mastery, nodes: {}, points: 2 } };
  const keptBranches = 3; // sp1 (1) + sp2 (2); la de la pasiva se devuelve

  // ---- v2 (Paso 1A) con el sistema de habilidades v4 ----
  const v2 = { ...json(base), saveVersion: 2, skillSystemV: 4, skillPoints: earned - (4 + 3 + 1 + 2 - 1) - 4 };
  const m2 = migrateSave(v2);
  assert.equal(m2.saveVersion, 3); assert.equal(m2.skillSystemV, 5);
  assert.equal(m2.skills, undefined, 'skills ya no se persiste');
  assert.equal(m2.skillPoints + keptBranches, earned, `${cid} v2: puntos libres + ramas = ${earned} (dio ${m2.skillPoints} + ${keptBranches})`);
  assert.ok(!m2.skillBranches[f.passive], `${cid}: la rama de ${f.passive} se descarta`);
  assert.ok(REMOVED_SKILLS_V3.includes(f.passive));
  assert.equal(Object.keys(m2.skillBranches[f.sp2]).length, 2, 'las ramas válidas se conservan');
  assert.deepEqual(m2.skillMods, mods, 'la opción elegida de una rama conservada se mantiene');
  checkHotbar(cid, m2.hotbar, f.level);
  assert.equal(m2.hotbar.rmb, f.sp1, 'rmb = primera gastadora de la barra vieja');
  assert.equal(m2.hotbar.k4, f.ult, 'k4 = la definitiva vieja');
  if (f.mv) assert.equal(m2.hotbar.k1, f.mv, 'k1 = la movilidad que había');
  if (f.ut) assert.equal(m2.hotbar.k2, f.ut, 'k2 = la utilidad que había');
  else assert.equal(m2.hotbar.k2, f.sp2, 'k2 = la SEGUNDA gastadora vieja (respeta a quien jugaba con dos)');
  // soportes por tags: los incompatibles se desengarzan; los de habilidades eliminadas también
  for (const [skId, list] of Object.entries(m2.supports)) {
    const sk = cls.skills.find(s => s.id === skId);
    assert.ok(sk, `${cid}: soporte en habilidad inexistente ${skId}`);
    for (const id of list) assert.ok(supportFits(SUPPORTS.find(s => s.id === id), sk), `${cid}: ${id} no encaja en ${skId}`);
    assert.ok(list.length <= (sk.cat === 'ultimate' || sk.cat === 'basic' ? 1 : 2));
  }
  assert.ok(!m2.supports[f.passive], 'soportes de habilidades eliminadas fuera');
  assert.deepEqual(m2.knownSupports, base.knownSupports, 'siguen aprendidos');
  // idempotencia: migrar dos veces da lo mismo (también aplicando la migración otra vez)
  assert.deepEqual(migrateSave(m2), m2, 'migrar dos veces da lo mismo');
  assert.deepEqual(MIGRATIONS[2](json(m2)), m2, 'MIGRATIONS[2] es idempotente');
  // el héroe carga y su barra es válida
  const hero = new Player(mk(), cid, json(m2));
  checkHotbar(cid, hero.hotbar, f.level);
  assert.equal(hero.skillPoints, m2.skillPoints);
  assert.ok(hero.skills[f.sp1] > 0 && hero.skills[weapon] > 0, 'habilidades conocidas por nivel');
  assert.equal(hero.mastery.id, f.mastery, 'la maestría se conserva (v4 es del Paso 2c)');

  // ---- v1 (Paso 1B): misma build, pasa por v1→v2→v3 ----
  const v1 = { ...json(base), saveVersion: 1, skillSystemV: 4, skillPoints: 0 };
  const m1 = migrateSave(v1);
  assert.equal(m1.skillPoints + keptBranches, earned, `${cid} v1: puntos coherentes`);
  checkHotbar(cid, m1.hotbar, f.level);

  // ---- v0 (sin versión, sistema de habilidades previo al v4): v0 reembolsa y v3 recalcula ----
  const v0 = { ...json(base), skillSystemV: 3, skillPoints: 2 };
  const m0 = migrateSave(v0);
  assert.equal(m0.skillPoints, earned, `${cid} v0: todas las ramas se reembolsaron en v0 → ${earned} puntos`);
  assert.deepEqual(m0.skillBranches, {});
  checkHotbar(cid, m0.hotbar, f.level);

  // ---- Paso 0 (habilidades v4 SIN saveVersion): sin reembolso doble ----
  const p0 = { ...json(base), skillSystemV: 4, skillPoints: 1 };
  const mp0 = migrateSave(p0);
  assert.equal(mp0.skillPoints + keptBranches, earned, `${cid} Paso 0: sin reembolso doble`);
  console.log(`${cls.name}: v0/v1/v2/Paso 0 → v3 (puntos, ramas, barra con categorías, soportes por tags) ✓`);
}

// hotbar a nivel bajo: sin movilidad/defensa antes de su nivel; sin gastadora vieja → la A
{
  const lowSave = { classId: 'guerrero', level: 3, saveVersion: 2, skillSystemV: 4, hotbar: { lmb: 'basic', rmb: null }, skills: { g_tajo: 1 } };
  const m = migrateSave(lowSave);
  assert.equal(m.hotbar.lmb, 'g_tajo', 'literal viejo basic → básico de arma');
  assert.equal(m.hotbar.rmb, 'torbellino', 'sin gastadora vieja: la gastadora A (Nv2)');
  assert.equal(m.hotbar.k1, null, 'movilidad solo desde Nv4');
  assert.equal(m.skillPoints, 2);
  console.log('Barra a nivel bajo: gastadora A, sin movilidad antes de Nv4 ✓');
}
console.log('\n✅ MIGRACIÓN DE GUARDADO v3 (Paso 2b) OK');
