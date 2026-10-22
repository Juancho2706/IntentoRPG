// Paso 2g · E1 (W1) — guardado v5: el ALGORITMO de MIGRATIONS[4] (save-schema.migrateV4toV5,
// docs/paso2-implementacion.md §3.11) con tablas legadas, SPEC_BAR y FALLBACK_BAR de prueba
// inyectadas por contexto y los talentos del fixture v2. Los saves v4 REALES con las tablas de
// KA son de test-save-2g (M1, E5); aquí solo pasan como prueba de robustez.
//  0) formato de las tablas legadas (las reales de save-legacy-<clase>.js y las de prueba)
//  1) nivel ≤ 100 y XP acotada
//  2) talentos: v2 con la misma especialización y el Recomendado vigente al nivel del save
//     (héroe incluido si el Paragon se abre); sin especialización antes del Nv10; v2 → normaliza
//  3) forja: 3.ª rama → variante, absorciones de la barra, precedencia, null, sin skillMods
//  4) tablero: sin nodos ni puntos; glifos a la bolsa o SUELTOS (paragon.loose) si no caben
//  5) barra: destinos por id/ranura/especialización/'*', to:null (también por ranura), objeto sin
//     clave aplicable = inválido, fitsSlot (destino que no cabe ni se repite), sin duplicados,
//     conocidas (activas de talento y kit de otra especialización fuera), SPEC_BAR → FALLBACK,
//     lmb nunca vacía, ranuras vacías siguen vacías
//  6) soportes reencajados sobre la definición forjada; lo demás vuelve a knownSupports
//  7) avisos (ids) con su texto en LOAD_NOTICES
//  8) idempotencia (dos pasadas = una) y cadena v0 → v5 y v3 → v5
//  9) robustez: los 57 saves v4 reales migran con invariantes, idempotentes y cargan en Player
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import './helpers/use-talents-fixture.mjs';
const S = await import('../js/save-schema.js');
const T = await import('../js/talents.js');
const D = await import('../js/data.js');
const SR = await import('../js/skill-resolve.js');
const { normalizeSkillDef, supportFits, supportSockets } = await import('../js/skill-defs.js');
const { Player } = await import('../js/entities.js');

globalThis.performance = globalThis.performance || { now: () => Date.now() };
const json = o => JSON.parse(JSON.stringify(o));
const REAL = JSON.parse(readFileSync(new URL('./fixtures/saves-v4-paso2.json', import.meta.url), 'utf8'));
const V3 = JSON.parse(readFileSync(new URL('./fixtures/saves-v3-paso2b.json', import.meta.url), 'utf8'));
const CAT4 = JSON.parse(readFileSync(new URL('./fixtures/catalog-v4.json', import.meta.url), 'utf8'));
const SLOTS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
const XPMAX = D.xpForLevel(100);
assert.equal(S.SAVE_VERSION, 5);
assert.equal(typeof S.MIGRATIONS[4], 'function');
assert.equal(T.TALENT_TREES.maga.v, 2, 'el gancho carga el fixture v2');

// kit de especialización de prueba (ids propios, junto al kit 2g real). Catálogo 2g de la Maga para
// las tablas de prueba: base m_dardo, bola_fuego, m_parpadeo (k1), m_barrera (k2), nova_hielo; el kit
// de cada especialización solo lo conoce ella (m_estela_ignea y meteoro: Piromante; m_paso_escarcha: Crionte)
const KIT = [
  { id: 'fx_piromante_k3', cat: 'spec', elem: 'fire', spec: 'piromante', req: 10, slots: ['k3'] },
  { id: 'fx_crionte_k3', cat: 'spec', elem: 'frost', spec: 'crionte', req: 10, slots: ['k3'] },
  { id: 'fx_arcanista_k3', cat: 'spec', elem: 'arcane', spec: 'arcanista', req: 10, slots: ['k3'] },
  { id: 'fx_piromante_k2', cat: 'spender', elem: 'fire', spec: 'piromante', req: 12, slots: ['rmb', 'k2'], tags: ['proj'] },
];
for (const k of KIT) D.CLASSES.maga.skills.push(normalizeSkillDef({ name: k.id, icon: '·', desc: '·', type: 'nova', coef: 1, ...k }));
const skill = (cid, id) => D.CLASSES[cid].skills.find(s => s.id === id);

// ------------------------------------------------ contexto de prueba
const LEG = {
  maga: {
    bar: {
      m_ascua: { to: 'm_dardo', forge: 'i' },
      m_toque: { to: 'm_dardo', forge: 'ii' },
      meteoro: { to: 'bola_fuego', forge: 'ii' },
      nova_hielo: { to: 'bola_fuego', forge: 'i' },
      m_onda: { to: null },
      rayo: { to: 'm_dardo' },                                                      // básico: no cabe en rmb
      m_estela_ignea: { to: { k2: 'bola_fuego', piromante: 'm_parpadeo', '*': 'm_paso_escarcha' } },
      p_llamarada: { to: { piromante: 'fx_piromante_k3', '*': 'fx_crionte_k3' } },
      m_t_barrera: { to: 'm_t_inversion' },
      m_u_tormenta: { to: 'bola_fuego' },                                           // gastadora: no cabe en k4
      m_u_desgarro: { to: { k4: null, '*': 'm_u_supernova' } },                     // null EXPLÍCITO en k4
      m_armadura: { to: { k1: 'm_paso_escarcha' } },                                // en k2: sin clave aplicable
    },
    forge: {
      bola_fuego: { bola_fuego_v1: 'i', bola_fuego_v2: 'ii', bola_fuego_v3: null },
      m_dardo: { m_dardo_v3: 'ii' },
      m_ascua: { to: 'm_dardo', map: { m_ascua_v3: 'i', m_ascua_v1: 'ii' } },
      m_armadura: { m_armadura_v1: 'zz' },                                          // variante inválida: se ignora
    },
    removed: ['m_ascua', 'm_toque', 'meteoro'],
    notice: '',
  },
  guerrero: { bar: {}, forge: {}, removed: [], notice: '' },
  arquera: { bar: {}, forge: {}, removed: [], notice: '' },
};
const SPEC_BAR = {
  piromante: { bar: { lmb: 'm_dardo', rmb: 'fx_piromante_k2', k1: 'm_estela_ignea', k2: 'm_barrera', k3: 'fx_piromante_k3', k4: 'm_u_supernova' } },
  crionte: { bar: { lmb: 'm_dardo', rmb: 'nova_hielo', k1: 'm_parpadeo', k2: 'bola_fuego', k3: 'fx_crionte_k3', k4: 'm_u_tormenta' } },
  arcanista: { bar: { lmb: 'm_dardo', rmb: 'rayo', k1: 'm_parpadeo', k2: 'm_t_inversion', k3: 'fx_arcanista_k3', k4: 'm_u_desgarro' } },
};
const FALLBACK = {
  maga: { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: 'm_barrera', k3: null, k4: 'm_u_supernova' },
  guerrero: { lmb: 'g_tajo', rmb: 'g_hendidura', k1: 'embestida', k2: 'g_piel', k3: null, k4: null },
  arquera: { lmb: 'a_disparo', rmb: 'flecha_perforante', k1: 'a_paso', k2: 'a_humo', k3: null, k4: null },
};
const CTX = { legacy: LEG, specBar: SPEC_BAR, fallbackBar: FALLBACK, forgeReco: {} };   // forja recomendada real: test-save-2g
const mig = (save, over = {}) => S.migrateV4toV5(json(save), { ...CTX, ...over });
const v4 = (o = {}) => ({
  saveVersion: 4, classId: 'maga', level: 30, xp: 100, statPoints: 0, skillPoints: 3, skillSystemV: 5,
  skillBranches: {}, skillMods: {}, hotbar: { lmb: 'm_dardo', rmb: 'bola_fuego', k1: null, k2: null, k3: null, k4: null },
  talents: { v: 1, spec: 'piromante', cls: { c1: 2 }, sp: { piromante: { s1: 3 }, crionte: {}, arcanista: {} }, choice: { c5: 'B' } },
  paragon: { points: 4, nodes: { '4_4': true }, glyphs: {} }, materials: [], supports: {}, knownSupports: [], ...o,
});

// ------------------------------------------------ 0) formato de las tablas legadas
const v4Ids = cid => {
  const c = CAT4.classes[cid];
  return new Set([...c.skills.map(s => s.id), ...(c.classGrants || []), ...Object.values(c.specs).flatMap(s => s.grants || [])]);
};
const thirdBranch = (cid, skId) => (CAT4.classes[cid].mods?.[skId]?.[2]?.opts || []).map(o => o.id);
export function checkLegacy(cid, t) {
  const E = [], err = m => E.push(`${cid}: ${m}`);
  const old = v4Ids(cid), specs = Object.keys(CAT4.classes[cid].specs);
  const exists = id => !!skill(cid, id);
  if (!t || typeof t !== 'object') return [`${cid}: sin tabla`];
  for (const k of ['bar', 'forge']) if (!t[k] || typeof t[k] !== 'object' || Array.isArray(t[k])) err(`${k} debe ser un objeto`);
  if (!Array.isArray(t.removed)) err('removed debe ser una lista');
  if (typeof t.notice !== 'string') err('notice debe ser un texto');
  // insignia: opcional y la migración la IGNORA (MIGRATIONS[3] usa V4_INSIGNIA congelada en
  // save-schema.js); si KA la escribe (§3.11), tiene que coincidir con la congelada
  if ('insignia' in t) {
    if (!t.insignia || typeof t.insignia !== 'object' || Array.isArray(t.insignia)) err('insignia debe ser un objeto { specId: id }');
    else for (const [sp, id] of Object.entries(t.insignia)) if (S.V4_INSIGNIA[cid]?.[sp] !== id) err(`insignia.${sp}: «${id}» ≠ V4_INSIGNIA (${S.V4_INSIGNIA[cid]?.[sp]})`);
  }
  const target = (id, at) => { if (id !== null && !(typeof id === 'string' && exists(id))) err(`${at}: destino «${id}» no está en el catálogo`); };
  for (const [id, e] of Object.entries(t.bar || {})) {
    if (!old.has(id)) err(`bar.${id}: no es una habilidad v4`);
    if (!e || typeof e !== 'object') { err(`bar.${id}: entrada no válida`); continue; }
    if (Object.hasOwn(e, 'forge') && !['i', 'ii', null].includes(e.forge)) err(`bar.${id}.forge: «${e.forge}»`);
    if (!('to' in e)) continue;
    if (e.to && typeof e.to === 'object') {
      for (const [k, v] of Object.entries(e.to)) {
        if (!SLOTS.includes(k) && !specs.includes(k) && k !== '*') err(`bar.${id}.to.${k}: ni ranura, ni especialización, ni '*'`);
        target(v, `bar.${id}.to.${k}`);
      }
    } else target(e.to, `bar.${id}.to`);
  }
  for (const [id, e] of Object.entries(t.forge || {})) {
    if (!old.has(id)) err(`forge.${id}: no es una habilidad v4`);
    const absorbed = e && typeof e.to === 'string';
    if (absorbed && !exists(e.to)) err(`forge.${id}.to: «${e.to}» no está en el catálogo`);
    const map = absorbed ? e.map : e;
    if (!map || typeof map !== 'object') { err(`forge.${id}: sin mapa`); continue; }
    const opts = thirdBranch(cid, id);
    for (const [opt, v] of Object.entries(map)) {
      if (!opts.includes(opt)) err(`forge.${id}: «${opt}» no es una opción de la 3.ª rama v4 (${opts})`);
      if (!['i', 'ii', null].includes(v) && !(t === LEG[cid] && v === 'zz')) err(`forge.${id}.${opt}: variante «${v}»`);
    }
  }
  for (const id of t.removed || []) if (!old.has(id)) err(`removed: «${id}» no es una habilidad v4`);
  return E;
}
for (const cid of ['maga', 'guerrero', 'arquera']) {
  assert.deepEqual(checkLegacy(cid, S.LEGACY_TABLES[cid]), [], `save-legacy-${cid}.js`);
  assert.deepEqual(checkLegacy(cid, LEG[cid]), [], `tabla de prueba ${cid}`);
}
{
  const bad = json(LEG.maga);
  bad.bar.zzz = { to: 'm_dardo' }; bad.bar.m_onda = { to: 'no_existe' }; bad.bar.rayo = { to: { k9: 'm_dardo' } };
  bad.forge.rayo = { rayo_o1: 'i' }; bad.bar.m_ascua.forge = 'iii'; bad.removed.push('zzz'); bad.insignia = { piromante: 'k_prision' };
  const E = checkLegacy('maga', bad);
  for (const frag of ['bar.zzz', 'bar.m_onda.to', 'bar.rayo.to.k9', 'forge.rayo', 'bar.m_ascua.forge', 'removed', 'insignia.piromante'])
    assert.ok(E.some(e => e.includes(frag)), `el comprobador de tablas detecta ${frag}:\n${E.join('\n')}`);
  // una tabla que sigue el ejemplo de §3.11 al pie de la letra (con su insignia) es válida, y la
  // migración la ignora: da lo mismo que sin ella
  const plain = json(LEG.maga); delete plain.forge.m_armadura;               // sin la variante «zz» de prueba
  const withIns = { ...json(plain), insignia: { ...S.V4_INSIGNIA.maga } };
  assert.deepEqual(checkLegacy('maga', withIns), [], 'insignia igual a V4_INSIGNIA: válida');
  const probe = v4({ level: 40, hotbar: { lmb: 'm_dardo', k3: 'p_llamarada' } });
  assert.deepEqual(mig(probe, { legacy: { ...LEG, maga: withIns } }), mig(probe, { legacy: { ...LEG, maga: plain } }), 'la insignia de la tabla no cambia la migración');
}
console.log('✓ tablas legadas: formato (reales y de prueba) y comprobador que detecta errores');

// ------------------------------------------------ 1) nivel y XP
{
  assert.deepEqual([mig(v4({ level: 130, xp: 9e12 })).level, mig(v4({ level: 130, xp: 9e12 })).xp], [100, XPMAX]);
  assert.equal(mig(v4({ level: 0 })).level, 1);
  assert.equal(mig(v4({ level: undefined })).level, 1);
  assert.equal(mig(v4({ xp: -50 })).xp, 0);
  assert.equal(mig(v4({ xp: 'abc' })).xp, 0);
  assert.equal(mig(v4({ level: 77, xp: 4321 })).xp, 4321, 'una XP válida no se toca');
}
console.log('✓ nivel ≤ 100 y XP acotada');

// ------------------------------------------------ 2) talentos
const expectTalents = (cid, spec, L) => {
  const b = T.talentTreesFor(cid).builds[T.defaultBuildKey(cid, spec)];
  return { b, r: T.buildRanks({ classId: cid, level: L, talents: { v: 2, spec, cls: {}, sp: {}, choice: {}, hero: {}, loadouts: {} } }, b, { level: L }) };
};
for (const cid of ['maga', 'guerrero', 'arquera']) for (const spec of T.talentTreesFor(cid).specs.map(s => s.id)) for (const L of [10, 40, 69, 70, 75, 100]) {
  const d = mig(v4({ classId: cid, level: L, hotbar: { lmb: null }, talents: { v: 1, spec, cls: { c1: 2, c99: 1 }, sp: { [spec]: { s1: 3 } }, choice: { c5: 'B' } } }));
  const t = d.talents;
  const { b, r } = expectTalents(cid, spec, L);
  assert.equal(t.v, 2); assert.equal(t.spec, spec, `${cid}/${spec}/${L}: conserva la especialización`);
  assert.deepEqual(t.cls, r.cls, `${cid}/${spec}/${L}: clase = Recomendado al nivel`);
  assert.deepEqual(t.sp[spec], r.sp[spec], `${cid}/${spec}/${L}: especialización = Recomendado`);
  assert.deepEqual(t.loadouts, {});
  const clsN = T.talentTreesFor(cid).cls.nodes, spN = T.findSpec(cid, spec).nodes;
  assert.equal(T.spentIn({ nodes: clsN }, t.cls), T.earnedAt('cls', L), `${cid}/${spec}/${L}: gasta los puntos de clase del nivel`);
  assert.equal(T.spentIn({ nodes: spN }, t.sp[spec]), T.earnedAt('spec', L), `${cid}/${spec}/${L}: gasta los de especialización`);
  assert.ok(T.validRanks({ nodes: clsN, gates: T.CLASS_GATES }, t.cls, L) && T.validRanks({ nodes: spN, gates: T.SPEC_GATES }, t.sp[spec], L));
  for (const [id, k] of Object.entries(t.choice)) assert.equal(k, r.choice[id], `${cid}/${spec}/${L}: elección ${id}`);
  const p = { classId: cid, level: L, talents: t };
  const heroN = Object.keys(t.hero[spec]?.nodes?.[b.hero] || {}).length;
  if (L >= 71) {
    assert.equal(T.heroOpen(p), true, `${cid}/${spec}/${L}: Paragon abierto`);
    assert.equal(t.hero[spec].tree, b.hero);
    assert.equal(heroN, T.earnedAt('hero', L), `${cid}/${spec}/${L}: nodos héroe del nivel`);
  } else assert.equal(heroN, 0, `${cid}/${spec}/${L}: sin nodos héroe`);
}
{
  const low = mig(v4({ level: 9 }));
  assert.equal(low.talents.spec, null, 'sin especialización antes del Nv10');
  assert.deepEqual([low.talents.cls, low.talents.choice, low.talents.hero], [{}, {}, {}]);
  assert.ok(Object.values(low.talents.sp).every(r => !Object.keys(r).length), 'sin rangos de especialización');
  assert.equal(mig(v4({ talents: { v: 1, spec: 'nigromante', cls: {}, sp: {}, choice: {} } })).talents.spec, null, 'especialización desconocida → ninguna');
  assert.equal(mig(v4({ talents: undefined })).talents.spec, null, 'sin talentos → vacío');
  // un save que ya trae v2 solo se normaliza (no se le aplica el Recomendado)
  const v2 = { v: 2, spec: 'crionte', cls: { c1: 1, c99: 4 }, sp: { crionte: { i1: 2 } }, choice: { c5: 'B', zz: 'A' }, hero: {}, loadouts: {} };
  const d = mig(v4({ talents: v2 }));
  assert.equal(d.talents.spec, 'crionte'); assert.deepEqual(d.talents.cls, { c1: 1 }); assert.deepEqual(d.talents.sp.crionte, { i1: 2 });
  assert.equal(d.talents.choice.zz, undefined, 'purga elecciones desconocidas');
}
console.log('✓ talentos: Recomendado vigente al nivel del save (108 combinaciones, héroe incluido)');

// ------------------------------------------------ 3) forja
{
  const own = mig(v4({ skillMods: { bola_fuego: { bola_fuego_o: 'bola_fuego_o1', bola_fuego_v: 'bola_fuego_v2' } } }));
  assert.equal(own.skillForge.bola_fuego, 'ii', '3.ª rama → variante');
  const nul = mig(v4({ skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v3' } } }));
  assert.ok(Object.hasOwn(nul.skillForge, 'bola_fuego') && nul.skillForge.bola_fuego === null, 'null = decidido sin variante (no recibe la recomendada)');
  assert.deepEqual(mig(v4({ skillMods: { m_armadura: { m_armadura_v: 'm_armadura_v1' } } })).skillForge, {}, 'variante inválida en la tabla: se ignora');
  assert.deepEqual(mig(v4({ skillMods: { rayo: { rayo_v: 'rayo_v1' } } })).skillForge, {}, 'sin entrada en la tabla: sin variante');
  assert.deepEqual(mig(v4({ skillMods: { bola_fuego: { bola_fuego_o: 'bola_fuego_o1' } } })).skillForge, {}, 'otra rama: no fija variante');
  // absorción por la barra (legacy.bar[*].forge)
  assert.equal(mig(v4({ hotbar: { lmb: 'm_toque' } })).skillForge.m_dardo, 'ii');
  assert.equal(mig(v4({ hotbar: { lmb: 'm_ascua' } })).skillForge.m_dardo, 'i');
  // precedencia: la ranura con más prioridad (rmb antes que k2) …
  const pre = (rmb, k2) => mig(v4({ hotbar: { lmb: 'm_dardo', rmb, k2 }, skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v1' } } })).skillForge.bola_fuego;
  assert.equal(pre('nova_hielo', 'meteoro'), 'i', 'rmb (nova_hielo → I) gana a k2 (meteoro → II)');
  assert.equal(pre('meteoro', 'nova_hielo'), 'ii', 'rmb (meteoro → II) gana a k2 (nova_hielo → I)');
  // … la barra gana a la habilidad propia fuera de la barra …
  assert.equal(mig(v4({ hotbar: { lmb: 'm_dardo', k2: 'meteoro' }, skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v1' } } })).skillForge.bola_fuego, 'ii');
  // … y fuera de la barra la propia gana a la absorbida, en cualquier orden
  for (const mods of [{ m_dardo: { m_dardo_v: 'm_dardo_v3' }, m_ascua: { m_ascua_v: 'm_ascua_v3' } }, { m_ascua: { m_ascua_v: 'm_ascua_v3' }, m_dardo: { m_dardo_v: 'm_dardo_v3' } }])
    assert.equal(mig(v4({ hotbar: { lmb: 'm_paso_escarcha' }, skillMods: mods })).skillForge.m_dardo, 'ii', 'propia (II) antes que absorbida (I)');
  // la propia en la barra gana a una absorbida de fuera de la barra
  assert.equal(mig(v4({ hotbar: { lmb: 'm_dardo' }, skillMods: { m_ascua: { m_ascua_v: 'm_ascua_v1' }, m_dardo: { m_dardo_v: 'm_dardo_v3' } } })).skillForge.m_dardo, 'ii');
  // misma ranura: la rama que eligió el jugador (m_ascua v1 → II) antes que la absorción por defecto (m_ascua → I)
  assert.equal(mig(v4({ hotbar: { lmb: 'm_ascua' }, skillMods: { m_ascua: { m_ascua_v: 'm_ascua_v1' } } })).skillForge.m_dardo, 'ii');
  assert.equal(mig(v4({ hotbar: { lmb: 'm_ascua' }, skillMods: { m_ascua: { m_ascua_o: 'm_ascua_o1' } } })).skillForge.m_dardo, 'i', 'sin rama mapeada, la absorción por defecto');
  // solo absorbida: fija la variante de la habilidad DESTINO
  const abs = mig(v4({ hotbar: { lmb: 'm_dardo' }, skillMods: { m_ascua: { m_ascua_v: 'm_ascua_v1' } } }));
  assert.equal(abs.skillForge.m_dardo, 'ii'); assert.equal(abs.skillForge.m_ascua, undefined);
  // lo que ya había en skillForge se conserva si nadie lo pisa
  assert.deepEqual(mig(v4({ skillForge: { rayo: 'i' }, skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v1' } } })).skillForge, { rayo: 'i', bola_fuego: 'i' });
  // fuera los campos viejos
  const d = mig(v4({ skillBranches: { bola_fuego: { bola_fuego_v: true } }, skillMods: {} }));
  for (const k of ['skillMods', 'skillBranches', 'skillPoints']) assert.ok(!(k in d), `${k} se borra`);
  // segunda pasada (sin skillMods): la forja no se toca aunque la barra tenga absorciones
  assert.deepEqual(S.migrateV4toV5({ ...json(d), hotbar: { lmb: 'm_toque' }, skillForge: { m_dardo: 'i' } }, CTX).skillForge, { m_dardo: 'i' });
}
console.log('✓ forja: 3.ª rama → variante, absorciones, precedencia (ranura → propia → absorbida), null');

// ------------------------------------------------ 4) tablero de glifos
{
  const gl = n => ({ uid: 900 + n, kind: 'glyph', glyphId: `g${n}`, rank: n, name: `Glifo ${n}` });
  const save = v4({ paragon: { points: 9, nodes: { '4_4': true, '4_3': true }, glyphs: { '4_3': gl(1), '2_2': gl(2), '0_0': null } }, materials: [{ uid: 1, kind: 'gem', gemId: 'rubi' }] });
  const d = mig(save);
  assert.deepEqual(d.paragon, { nodes: {}, glyphs: {} }, 'sin nodos, sin puntos y sin glifos engarzados');
  assert.deepEqual(d.materials.map(m => m.uid), [1, 901, 902], 'los glifos vuelven a la bolsa intactos');
  assert.ok(!d.notices.includes('glifos-sueltos'), 'sin glifos sueltos, sin aviso');
  // si no caben, quedan SUELTOS en paragon.loose: nunca en `glyphs` con un id de zócalo v4 (el
  // tablero nuevo no tiene esas casillas y nadie los vería)
  const full = mig(save, { canAddMaterial: () => false });
  assert.deepEqual(full.paragon.glyphs, {}, 'ningún glifo queda en un zócalo v4');
  assert.deepEqual(full.paragon.loose.map(g => g.uid).sort(), [901, 902]);
  assert.deepEqual(full.paragon.nodes, {}); assert.ok(!('points' in full.paragon));
  assert.deepEqual(full.materials.map(m => m.uid), [1]);
  assert.ok(full.notices.includes('glifos-sueltos'), 'aviso de glifos sueltos');
  assert.match(S.LOAD_NOTICES['glifos-sueltos'], /glifos/);
  let room = 1;
  const half = mig(save, { canAddMaterial: () => room-- > 0 });
  assert.deepEqual([half.materials.length, half.paragon.loose.length], [2, 1], 'uno a la bolsa y otro suelto: ningún glifo se pierde');
  // otra pasada CON hueco (canAddMaterial real: un glifo es material de progreso y siempre cabe)
  const back = S.migrateV4toV5(json(full), CTX);
  assert.deepEqual(back.paragon, { nodes: {}, glyphs: {} }, 'los sueltos vuelven a la bolsa');
  assert.deepEqual(back.materials.map(m => m.uid).sort(), [1, 901, 902]);
  // el héroe cargado conserva los sueltos y los vuelve a guardar
  const pl = new Player({ ui: { spawnText() {}, message() {} }, sfx() {}, world: null, enemies: [], projectiles: [] }, 'maga', { ...full, saveVersion: 5 });
  assert.deepEqual(pl.paragon.loose.map(g => g.uid).sort(), [901, 902], 'Player conserva paragon.loose');
  assert.deepEqual(json(S.serializePlayer(pl)).paragon.loose.map(g => g.uid).sort(), [901, 902], 'y se guarda');
  assert.deepEqual(mig(v4({ paragon: undefined, materials: undefined })).paragon, { nodes: {}, glyphs: {} });
}
console.log('✓ tablero: nodos y puntos fuera; glifos a la bolsa o sueltos (paragon.loose) si no caben');

// ------------------------------------------------ 5) barra
const isValidBar = (d, what) => {
  const ids = SLOTS.map(s => d.hotbar[s]).filter(Boolean);
  assert.equal(new Set(ids).size, ids.length, `${what}: sin duplicados`);
  assert.ok(d.hotbar.lmb, `${what}: lmb nunca vacía`);
  const hero = { classId: d.classId, level: d.level, talents: d.talents, skillForge: d.skillForge };
  hero.talentAgg = T.aggregateTalents(hero);
  for (const s of SLOTS) {
    const id = d.hotbar[s];
    if (!id) continue;
    const sk = skill(d.classId, id);
    assert.ok(sk, `${what}: ${s}=${id} existe`);
    assert.ok(SR.fitsSlot(sk, s), `${what}: ${id} cabe en ${s}`);
    assert.ok(SR.isKnown(hero, sk), `${what}: ${id} se conoce`);
    assert.ok(!sk.spec || sk.spec === d.talents.spec, `${what}: ${id} es de su especialización`);
  }
  assert.deepEqual(Object.keys(d.hotbar).sort(), [...SLOTS].sort());
};
{
  const bar = (hotbar, o = {}) => { const d = mig(v4({ hotbar, ...o })); isValidBar(d, JSON.stringify(hotbar)); return d.hotbar; };
  // id directo; vacía sigue vacía; lo que vale se queda
  assert.deepEqual(bar({ lmb: 'm_toque', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: null, k3: null, k4: null }),
    { lmb: 'm_dardo', rmb: 'bola_fuego', k1: 'm_parpadeo', k2: null, k3: null, k4: null });
  // un id v4 que sigue en el catálogo pero es del kit de OTRA especialización → SPEC_BAR
  assert.equal(bar({ lmb: 'm_dardo', k1: 'm_paso_escarcha' }).k1, 'm_estela_ignea', 'kit de la Crionte en una Piromante → SPEC_BAR');
  // to: null vacía la ranura (sin reserva)
  assert.equal(bar({ lmb: 'm_dardo', k2: 'm_onda' }).k2, null);
  // en lmb, to: null no la deja vacía
  assert.equal(bar({ lmb: 'm_onda' }).lmb, 'm_dardo');
  // destino que no cabe (básico en rmb, que además ya está en lmb) → SPEC_BAR de la especialización
  assert.equal(bar({ lmb: 'm_dardo', rmb: 'rayo' }, { level: 30 }).rmb, 'fx_piromante_k2');
  // destino que NO cabe y NO está repetido: m_u_tormenta → bola_fuego (gastadora) en k4
  assert.ok(!SR.fitsSlot(skill('maga', 'bola_fuego'), 'k4') && SR.fitsSlot(skill('maga', 'bola_fuego'), 'rmb'));
  assert.equal(bar({ lmb: 'm_dardo', rmb: null, k4: 'm_u_tormenta' }).k4, 'm_u_supernova', 'no cabe en k4 → SPEC_BAR (Piromante)');
  assert.equal(mig({ ...v4({ level: 60, talents: { v: 1, spec: 'arcanista', cls: {}, sp: {}, choice: {} } }), hotbar: { lmb: 'm_dardo', k4: 'm_u_tormenta' } }).hotbar.k4,
    'm_u_desgarro', 'la reserva es la de SU especialización');
  assert.equal(mig(v4({ hotbar: { lmb: 'm_dardo', k4: 'm_u_tormenta' } }), { specBar: {} }).hotbar.k4, 'm_u_supernova', 'sin SPEC_BAR → FALLBACK_BAR');
  // null EXPLÍCITO por ranura: vacía (no cae a '*')
  assert.equal(bar({ lmb: 'm_dardo', k4: 'm_u_desgarro' }).k4, null, "{ k4: null, '*': … } en k4 → vacía");
  // objeto sin clave aplicable = inválido → SPEC_BAR (ni se conserva ni se vacía)
  const crio2 = v4({ talents: { v: 1, spec: 'crionte', cls: {}, sp: {}, choice: {} } });
  assert.equal(mig({ ...crio2, hotbar: { lmb: 'm_dardo', k2: 'm_armadura' } }).hotbar.k2, 'bola_fuego', 'sin clave para k2 → SPEC_BAR de la Crionte');
  // por ranura, luego por especialización, luego '*' (cada destino distinto de la SPEC_BAR de reserva)
  assert.equal(bar({ lmb: 'm_dardo', k2: 'm_estela_ignea' }).k2, 'bola_fuego', 'por ranura');
  assert.equal(bar({ lmb: 'm_dardo', k1: 'm_estela_ignea' }).k1, 'm_parpadeo', 'por especialización');
  const crio = v4({ talents: { v: 1, spec: 'crionte', cls: {}, sp: {}, choice: {} } });
  assert.equal(mig({ ...crio, hotbar: { lmb: 'm_dardo', k1: 'm_estela_ignea' } }).hotbar.k1, 'm_paso_escarcha', "'*' de reserva");
  // la insignia v4 → kit de SU especialización; otra especialización → SPEC_BAR
  assert.equal(bar({ lmb: 'm_dardo', k3: 'p_llamarada' }).k3, 'fx_piromante_k3');
  assert.equal(mig({ ...crio, hotbar: { lmb: 'm_dardo', k3: 'p_llamarada' } }).hotbar.k3, 'fx_crionte_k3');
  const arca = v4({ level: 60, talents: { v: 1, spec: 'arcanista', cls: {}, sp: {}, choice: {} } });
  assert.equal(mig({ ...arca, hotbar: { lmb: 'm_dardo', k3: 'p_llamarada' } }).hotbar.k3, 'fx_arcanista_k3', 'kit de otra especialización → SPEC_BAR');
  // duplicados: la primera ranura se lo queda; la otra cae a SPEC_BAR
  const dup = bar({ lmb: 'm_dardo', rmb: 'nova_hielo', k2: 'meteoro' });
  assert.equal(dup.rmb, 'bola_fuego'); assert.equal(dup.k2, 'm_barrera');
  // id desconocido → SPEC_BAR; nivel bajo para SPEC_BAR → FALLBACK_BAR; ninguno → vacía
  assert.equal(bar({ lmb: 'm_dardo', rmb: 'zzz_vieja' }).rmb, 'fx_piromante_k2');
  assert.equal(bar({ lmb: 'm_dardo', rmb: 'zzz_vieja' }, { level: 11 }).rmb, 'bola_fuego', 'fx_piromante_k2 pide Nv12 → FALLBACK_BAR');
  assert.equal(bar({ lmb: 'm_dardo', k4: 'zzz_vieja' }, { level: 12 }).k4, null, 'ninguna definitiva conocida al Nv12');
  // sin especialización (Nv5): FALLBACK_BAR
  const low = mig(v4({ level: 5, hotbar: { lmb: 'zzz', rmb: 'zzz', k1: 'zzz' } }));
  assert.deepEqual([low.hotbar.lmb, low.hotbar.rmb, low.hotbar.k1], ['m_dardo', 'bola_fuego', 'm_parpadeo']);
  // activas de talento: salen salvo que el Recomendado las conceda
  const grants = d => { const h = { classId: d.classId, level: d.level, talents: d.talents }; return T.aggregateTalents(h).grants; };
  const piro60 = mig(v4({ level: 60, hotbar: { lmb: 'm_dardo', k2: 'm_t_barrera' } }));
  assert.ok(!grants(piro60).has('m_t_inversion')); assert.equal(piro60.hotbar.k2, 'm_barrera', 'no concedida → SPEC_BAR');
  const arca60 = mig({ ...arca, hotbar: { lmb: 'm_dardo', k2: 'm_t_barrera' } });
  assert.ok(grants(arca60).has('m_t_inversion'), 'el Recomendado de la Arcanista concede m_t_inversion al Nv60');
  assert.equal(arca60.hotbar.k2, 'm_t_inversion', 'concedida → se queda');
  // lmb nunca vacía: sin SPEC_BAR ni FALLBACK, el primer básico conocido
  const none = mig(v4({ hotbar: { lmb: 'zzz', rmb: null } }), { specBar: {}, fallbackBar: {} });
  assert.equal(none.hotbar.lmb, 'm_dardo');
  const noBar = mig(v4({ hotbar: undefined }));
  assert.equal(noBar.hotbar.lmb, 'm_dardo'); assert.equal(noBar.hotbar.rmb, null);
}
// legacyTarget: precedencia ranura → especialización → '*', null explícito y lo inválido
{
  const LT = S.legacyTarget;
  assert.equal(LT({ to: { k3: 'a', piromante: 'b', '*': 'x' } }, 'k3', 'piromante', 'old'), 'a', 'la ranura primero');
  assert.equal(LT({ to: { piromante: 'b', '*': 'x' } }, 'k3', 'piromante', 'old'), 'b', 'luego la especialización');
  assert.equal(LT({ to: { k2: 'a', '*': 'x' } }, 'k3', 'piromante', 'old'), 'x', "luego '*'");
  assert.equal(LT({ to: { k3: null, '*': 'x' } }, 'k3', 'piromante', 'old'), null, 'null explícito por ranura: vaciar');
  assert.equal(LT({ to: { piromante: null, '*': 'x' } }, 'k3', 'piromante', 'old'), null, 'null explícito por especialización');
  assert.equal(LT({ to: { k2: 'a' } }, 'k3', 'piromante', 'old'), undefined, 'sin clave aplicable: inválido');
  assert.equal(LT({ to: { piromante: 'b' } }, 'k3', null, 'old'), undefined, 'sin especialización no aplica la suya');
  assert.equal(LT({ to: 7 }, 'k3', null, 'old'), undefined, 'un `to` de otro tipo: inválido');
  assert.equal(LT({ to: 'y' }, 'k3', null, 'old'), 'y'); assert.equal(LT({ to: null }, 'k3', null, 'old'), null);
  assert.equal(LT({ forge: 'i' }, 'k3', null, 'old'), 'old', 'sin `to` conserva el id');
  assert.equal(LT(undefined, 'k3', null, 'old'), 'old');
}
console.log('✓ barra: destinos, to:null, fitsSlot, duplicados, conocidas, especialización, reservas y lmb');

// ------------------------------------------------ 6) soportes
{
  const fits = (sk, ids) => { const out = []; for (const id of ids) { const sup = D.SUPPORTS.find(s => s.id === id); if (sup && supportFits(sup, sk) && !out.includes(id) && out.length < supportSockets(sk)) out.push(id); } return out; };
  const bola = skill('maga', 'bola_fuego'), arm = skill('maga', 'm_barrera'), dardo = skill('maga', 'm_dardo');
  const fitB = D.SUPPORTS.filter(s => supportFits(s, bola)).map(s => s.id);
  const notArm = D.SUPPORTS.filter(s => !supportFits(s, arm)).map(s => s.id);
  const fitD = D.SUPPORTS.filter(s => supportFits(s, dardo)).map(s => s.id);
  assert.ok(fitB.length >= 3 && notArm.length >= 1 && fitD.length >= 2, 'el catálogo de soportes da casos de prueba');
  const supports = {
    bola_fuego: [fitB[0], fitB[0], fitB[1], fitB[2]],   // duplicado y uno de más (2 engarces)
    m_barrera: [notArm[0]],                              // no encaja
    m_dardo: [fitD[0], fitD[1]],                         // básico: 1 engarce
    m_ascua: ['amplify'],                                // habilidad retirada
    zzz_vieja: ['wide'],                                 // habilidad desconocida
  };
  const d = mig(v4({ supports, knownSupports: ['echo', fitB[0]] }));
  assert.deepEqual(d.supports.bola_fuego, fits(bola, supports.bola_fuego));
  assert.deepEqual(d.supports.bola_fuego, [fitB[0], fitB[1]]);
  assert.ok(!('m_barrera' in d.supports), 'lo que no encaja sale');
  assert.deepEqual(d.supports.m_dardo, [fitD[0]], 'un básico tiene un engarce');
  assert.ok(!('m_ascua' in d.supports) && !('zzz_vieja' in d.supports), 'habilidades retiradas o desconocidas pierden sus soportes');
  for (const id of ['echo', ...Object.values(supports).flat()]) assert.ok(d.knownSupports.includes(id), `${id} sigue en knownSupports`);
  assert.equal(new Set(d.knownSupports).size, d.knownSupports.length, 'knownSupports sin duplicados');
  // se reencajan sobre la definición FORJADA (forgedDef recibe el héroe con su forja)
  let seen = null;
  const forgedDef = (h, sk) => { if (sk.id !== 'm_barrera') return null; seen = h.skillForge; return { ...sk, tags: [...sk.tags, 'proj', 'area'], cat: 'spender' }; };
  const forged = mig(v4({ supports: { m_barrera: ['multi', 'wide'] }, skillMods: { bola_fuego: { bola_fuego_v: 'bola_fuego_v2' } } }), { forgedDef });
  assert.ok(!fits(arm, ['multi']).length, 'sin forja, multi no encaja en la Barrera');
  assert.deepEqual(forged.supports.m_barrera, ['multi', 'wide'], 'con la definición forjada, sí');
  assert.deepEqual(seen, { bola_fuego: 'ii' }, 'forgedDef ve la forja ya migrada');
}
console.log('✓ soportes: reencaje sobre la definición forjada; el resto vuelve a knownSupports');

// ------------------------------------------------ 7) avisos
{
  assert.deepEqual(mig(v4({ level: 1 })).notices, []);
  assert.deepEqual(mig(v4({ level: 5 })).notices, ['paso2']);
  assert.deepEqual(mig(v4({ level: 10 })).notices, ['paso2', 'paso2-maga']);
  assert.deepEqual(mig(v4({ level: 40, talents: { v: 1, spec: null, cls: {}, sp: {}, choice: {} } })).notices, ['paso2'], 'sin especialización no se aplicó Recomendado: sin aviso de clase');
  assert.deepEqual(mig(v4({ classId: 'guerrero', level: 40, hotbar: {}, talents: { v: 1, spec: 'guardian', cls: {}, sp: {}, choice: {} }, notices: ['talentos', 'paso2'] })).notices, ['talentos', 'paso2', 'paso2-guerrero']);
  for (const id of ['talentos', 'paso2', 'paso2-maga', 'paso2-guerrero', 'paso2-arquera', T.TALENTS_TRIMMED_NOTICE])
    assert.ok(typeof S.LOAD_NOTICES[id] === 'string' && S.LOAD_NOTICES[id].length > 20, `LOAD_NOTICES['${id}']`);
  assert.match(S.LOAD_NOTICES['paso2-guerrero'], /del Guerrero/); assert.match(S.LOAD_NOTICES['paso2-maga'], /de la Maga/);
}
console.log('✓ avisos de carga (ids) con su texto');

// ------------------------------------------------ 8) idempotencia y cadena
const synth = [
  v4(), v4({ level: 75, hotbar: { lmb: 'm_toque', rmb: 'meteoro', k1: 'm_estela_ignea', k2: 'm_onda', k3: 'p_llamarada', k4: 'zzz' } }),
  v4({ level: 60, talents: { v: 1, spec: 'arcanista', cls: {}, sp: {}, choice: {} }, hotbar: { lmb: null, k2: 'm_t_barrera' }, skillMods: { m_ascua: { m_ascua_v: 'm_ascua_v1' } } }),
  v4({ level: 100, paragon: { points: 1, nodes: {}, glyphs: { a: { uid: 5, kind: 'glyph' } } }, supports: { bola_fuego: ['chain', 'multi', 'amplify'] } }),
  v4({ level: 3, talents: undefined, hotbar: { lmb: 'm_ascua' } }),
];
for (const [i, s] of synth.entries()) {
  const once = mig(s);
  assert.deepEqual(mig(once), once, `sintético ${i}: dos pasadas = una`);
  const glyphsOnce = mig(s, { canAddMaterial: () => false });
  assert.deepEqual(mig(glyphsOnce, { canAddMaterial: () => false }), glyphsOnce, `sintético ${i}: idempotente con la bolsa llena`);
}
{
  // segunda pasada (sin los campos v4): legacy.bar no se vuelve a aplicar a los ids nuevos
  // (nova_hielo: id v4 con entrada en la tabla de prueba que sigue en el catálogo 2g)
  const first = mig(v4({ hotbar: { lmb: 'm_dardo', k2: 'nova_hielo' } }));
  assert.equal(first.hotbar.k2, 'bola_fuego', 'primera pasada: nova_hielo → bola_fuego');
  assert.equal(S.migrateV4toV5({ ...json(first), hotbar: { ...first.hotbar, k2: 'nova_hielo' } }, CTX).hotbar.k2, 'nova_hielo', 'segunda pasada: nova_hielo es un id nuevo válido');
  // migrateSave no muta la entrada
  const copy = json(v4({ level: 60 })), before = json(copy);
  S.migrateSave(copy);
  assert.deepEqual(copy, before);
  // cadena v0 → v5 (contexto por defecto: tablas de save-legacy-<clase>.js, SPEC_BAR y FALLBACK_BAR del juego)
  const v0 = S.migrateSave({ classId: 'maga', level: 12, xp: 50, hotbar: ['m_dardo', 'bola_fuego'], skills: { m_dardo: 1 } });
  assert.equal(v0.saveVersion, 5); assert.equal(v0.talents.v, 2); assert.ok(v0.hotbar.lmb);
  for (const k of ['skillPoints', 'skillMods', 'skillBranches', 'mastery']) assert.ok(!(k in v0), `v0 → v5 sin ${k}`);
  // cadena v3 → v5 con los saves v3 reales de 2b
  let n3 = 0;
  for (const [name, s3] of Object.entries(V3)) {
    if (!s3 || typeof s3 !== 'object' || s3.saveVersion !== 3) continue;
    const d = S.migrateSave(s3);
    assert.equal(d.saveVersion, 5, name); assert.equal(d.talents.v, 2, name);
    assert.ok(!('mastery' in d) && !('skillMods' in d), name);
    assert.ok(d.hotbar.lmb, `${name}: lmb`);
    const L = d.level;
    assert.equal(d.talents.spec ? L >= 10 : true, true, name);
    n3++;
  }
  assert.ok(n3 >= 3, `saves v3 probados: ${n3}`);
  // un save ya en v5 no cambia; uno de una versión futura se devuelve tal cual
  const v5 = S.migrateSave(REAL['maga-40-piromante']);
  assert.deepEqual(S.migrateSave(v5), v5);
  assert.deepEqual(S.migrateSave({ ...v5, saveVersion: 9 }), { ...v5, saveVersion: 9 });
}
console.log('✓ idempotencia (dos pasadas = una), entrada sin mutar y cadenas v0 → v5 y v3 → v5');

// ------------------------------------------------ 9) robustez: los 57 saves v4 reales
{
  const game = () => ({ ui: { spawnText() {}, message() {} }, sfx() {}, world: null, enemies: [], projectiles: [] });
  let n = 0;
  for (const [name, s] of Object.entries(REAL)) {
    const d = mig(s);
    const L = d.level;
    assert.equal(L, Math.min(100, s.level), name);
    for (const k of ['skillPoints', 'skillMods', 'skillBranches']) assert.ok(!(k in d), `${name}: sin ${k}`);
    for (const v of Object.values(d.skillForge)) assert.ok(['i', 'ii', null].includes(v), `${name}: forja ${v}`);
    // talentos v2 = Recomendado de su especialización al nivel del save
    assert.equal(d.talents.v, 2);
    const spec = s.talents?.spec && L >= 10 ? s.talents.spec : null;
    assert.equal(d.talents.spec, spec, `${name}: especialización`);
    if (spec) assert.deepEqual(d.talents.cls, expectTalents(d.classId, spec, L).r.cls, `${name}: clase = Recomendado`);
    else assert.deepEqual(d.talents.cls, {}, `${name}: sin especialización, sin talentos`);
    // tablero: glifos devueltos
    const glyphs = Object.values(s.paragon?.glyphs || {}).filter(Boolean).length;
    assert.deepEqual(d.paragon, { nodes: {}, glyphs: {} }, `${name}: tablero`);
    assert.equal(d.materials.length, (s.materials || []).length + glyphs, `${name}: ${glyphs} glifos a la bolsa`);
    // barra válida
    isValidBar(d, name);
    // soportes: subconjunto de lo que encaja; nada se pierde
    for (const [skId, ids] of Object.entries(d.supports)) {
      const sk = skill(d.classId, skId);
      assert.ok(sk && ids.length <= supportSockets(sk) && ids.every(id => supportFits(D.SUPPORTS.find(x => x.id === id), sk)), `${name}: soportes de ${skId}`);
    }
    for (const id of [...(s.knownSupports || []), ...Object.values(s.supports || {}).flat()]) assert.ok(d.knownSupports.includes(id), `${name}: ${id} en knownSupports`);
    assert.ok(d.notices.includes('paso2'), `${name}: aviso paso2`);
    assert.equal(d.notices.includes(`paso2-${d.classId}`), !!spec, `${name}: aviso de clase`);
    // idempotente y serializable
    assert.deepEqual(mig(d), d, `${name}: dos pasadas = una`);
    assert.deepEqual(json(d), d, `${name}: JSON puro`);
    // carga en Player y recompute no lanza
    const p = new Player(game(), d.classId, { ...d, saveVersion: 5 });
    p.recompute();
    assert.ok(p.stats.maxHP > 0 && Number.isFinite(p.stats.maxHP), `${name}: stats tras cargar (maxHP ${p.stats?.maxHP})`);
    n++;
  }
  assert.equal(n, 57);
}
console.log('✓ robustez: los 57 saves v4 reales migran, son idempotentes y cargan en Player');

console.log('\n✅ GUARDADO v5 (test80): algoritmo de MIGRATIONS[4] OK');
