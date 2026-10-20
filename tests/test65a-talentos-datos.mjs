// Paso 2c.1 (adelanto, SOLO DATOS) — árboles de talentos de js/talents-<clase>.js
//  1) forma: 15 nodos de clase y 21 por especialización (§5.1), ids únicos, rejilla sin
//     choques, req hacia filas anteriores, max ≥ 1, elecciones A/B, d / d(r) legibles
//  2) metadatos de especialización (ids de las maestrías, rol, indicador, retrato/emblema)
//  3) vocabulario: power (§5.3 o id PROPIO del nodo con prefijo de clase/especialización,
//     registrado en POWER_HOOKS; un poder = un nodo: sin «portadores», Paso 2c.2) y claves
//     tv de §5.3 + las del núcleo de 2c.2, stats conocidas, elem de ELEMS, claves de mod
//     y skillLv que existen, ajustes de §5.2 (insignia en s0, s4 potenciador, correcciones)
//  4) grant ↔ skills: cada grant tiene su activa (42 en total, §3) y pasa validateSkillDef
//  5) presets válidos (puertas SPEC_GATES/CLASS_GATES, puntos de talents.js) y funciones de
//     talents.js (normalizeTalents / canAddRank / aggregateTalents) sobre un jugador falso
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CLASSES } from '../js/data.js';
import { validateSkillDef, ELEMS, TAGS, GENERIC_TYPES, emptyMods, defaultSlots } from '../js/skill-defs.js';
import { TALENT_TREES, SPEC_GATES, CLASS_GATES, TALENT_START_LEVEL, normalizeTalents, aggregateTalents, canAddRank,
  canRemoveRank, presetRanks, talentPointsEarned, talentPointsLeft, treeOf, nodeDesc, spentIn } from '../js/talents.js';
import { GUERRERO_TALENTS } from '../js/talents-guerrero.js';
import { MAGA_TALENTS } from '../js/talents-maga.js';
import { ARQUERA_TALENTS } from '../js/talents-arquera.js';
import { POWER_HOOKS } from '../js/powers.js';

const ASSETS = 'D:/Proyectos/IntentoRPG-assets/web/'; // arte crudo (fuera del repo): solo si existe
const SPECS = { guerrero: ['berserker', 'guardian', 'cruzado'], maga: ['piromante', 'crionte', 'arcanista'], arquera: ['francotiradora', 'montaraz', 'tiradora'] };
const INSIGNIA = { berserker: 'g_t_remolino', guardian: 'g_t_desafio', cruzado: 'g_t_devocion', piromante: 'p_llamarada', crionte: 'k_prision',
  arcanista: 'a_orbe', francotiradora: 'a_t_apuntado', montaraz: 'a_t_cepo', tiradora: 'a_t_andanada' };
const ROLES = new Set(['dps', 'tank', 'support', 'control']);
const MECHANICS = new Set(['sed', 'bastion', 'fervor', 'calor', 'escarcha', 'cargas', 'concentracion', 'coto', 'impulso']);
// §5.3 «Poderes» (lista exhaustiva del diseño)
const POWERS_53 = new Set(['m_berserk', 'm_deadeye', 'm_hunt', 'g_aura_hermandad', 'm_aura_intelecto', 'a_aura_halcon', 'k_frost_armor', 'k_numb',
  'f_perch', 'a_manaskin', 'g_muralla_viva', 'g_mano_sanadora', 'a_tailwind', 't_slipstream', 'm_warden', 'm_shatter', 'f_overpen',
  'a_singularity', 'g_sentencia', 'f_weakspot', 'a_sello', 'm_overload', 'a_chain_crit', 'a_arc_charge', 'a_overvolt', 'a_resonance',
  'a_clarity', 'k_icicle_dart', 'k_nova_push', 'p_ignicion', 'p_acumular', 'p_llamarada_avivada', 'g_crit_furia', 'f_patience',
  't_infinite', 't_eyestorm', 'm_aegis', 'g_juramento', 'g_coraza_hierro', 'g_negacion', 'p_fenix', 'g_vinculo', 'g_represalia',
  'g_intercesion', 'g_bastion_eterno', 'm_judgment', 'm_conflag', 'p_propagacion', 'p_corazon_sol', 'p_nova_solar', 'g_carnicero',
  'g_matanza_eterna', 't_galechain', 'k_shatter_chain', 'k_ice_tomb', 'k_ice_age', 'g_luz_sanadora', 'g_desenfreno', 'g_luz_alba',
  'g_ascension', 'g_estandarte_grupo', 'm_ralentizar', 'multidisparo', 'g_martillo_bendito', 'g_martillos_juicio', 'k_eternal_winter',
  'm_thornweb', 'm_extratrap', 'm_greathunt', 'g_venganza']);
// Poderes FUERA de §5.3, documentados en la cabecera de cada talents-<clase>.js:
//  · los 8 potenciadores de s4 que crea §5.2.1 (la tabla da nombre y efecto, no id; Piromante
//    sí tiene el suyo en §5.3: p_llamarada_avivada)
//  · dos que trae el mockup y §5.3 no recoge: g_reto (Guardián s6B) y f_impossible (Francotiradora x3)
const POWERS_EXTRA = new Set(['g_remolino_sediento', 'g_desafio_firme', 'g_devocion_ferviente', 'k_prision_profunda', 'a_orbe_resonante',
  'f_aliento_cazador', 'm_cepo_doble', 't_andanada_impulsiva', 'g_reto', 'f_impossible']);
// Paso 2c.2 (DECISIÓN del jefe): además, cada nodo con efecto propio puede llevar SU poder,
// con el prefijo de su clase o especialización (Guerrero g_ · Maga m_/p_/k_/a_ · Arquera
// a_/f_/m_/t_) y registrado en POWER_HOOKS. Se retiran los «portadores»: un mismo poder no
// lo comparten dos nodos (el efecto de cada nodo lo enciende su propio poder o su clave tv).
const OWN_PREFIX = { guerrero: /^g_[a-z0-9_]+$/, maga: /^[mpka]_[a-z0-9_]+$/, arquera: /^[afmt]_[a-z0-9_]+$/ };
const powerOwner = new Map();   // poder → `clase/árbol/nodo` (unicidad)
// §5.3 «Claves tv»
const TV_53 = new Set(['eliteDmg', 'slowedDmg', 'highHpDmg', 'lowHpDmg', 'highManaDmg', 'explodedDmg', 'infiniteDmg', 'critDmg', 'weakCritDmg',
  'burningCrit', 'dmgReduc', 'barrierDr', 'costRed', 'costRedBig', 'bleedPct', 'poisonPct', 'burnPct', 'dotPct', 'dotDur', 'burnDur',
  'killHeal', 'burnKillHeal', 'manaOnKill', 'burnKillMana', 'executePct', 'shatterPct', 'fervorChance', 'verdictHeal', 'frostLayers',
  'fieldVuln', 'rootedWeak', 'focusRate', 'focusEnergy', 'galeHeal', 'clarityPct', 'arcChargePct', 'webDmg', 'critFireCdr', 'supernovaBurn',
  // Paso 2c.2 (núcleo): curas/recurso al matar a un enemigo que SANGRA, daño contra la Presa,
  // reducción de daño CONDICIONAL (maná > 50 %, contra ralentizados, en movimiento,
  // Concentración > 50, tras la Voltereta) y Energía al llenar el Impulso
  'bleedKillHeal', 'bleedKillMana', 'preyDmg', 'drHighMana', 'drVsSlowed', 'drMoving', 'drFocus', 'drAfterRoll', 'galeEnergy',
  // Paso 2c.2 (recalibración): el +X % de Ejecutar contra élites y jefes sale del nodo
  'executeDmg']);
// stats que suma recompute hoy + las nuevas de §5.3
const STATS = new Set(['hp', 'mp', 'dmgPct', 'crit', 'arm', 'spdPct', 'aspdPct', 'mf', 'lph', 'mph', 'cdr', 'thorns', 'goldPct', 'critDmg',
  'dr', 'block', 'dodgeCdr', 'energyRegen', 'healPct', 'mpPct', 'xpPct', 'threatMult', 'staggerPct']);
const MOD_KEYS = new Set(Object.keys(emptyMods()));
const FX_KEYS = new Set(['stats', 'elem', 'skillLv', 'mod', 'tv', 'power', 'grant']);
const NODE_KEYS = new Set(['id', 'name', 'icon', 't', 'r', 'c', 'max', 'req', 'free', 'fx', 'opts', 'd']);

const mkP = (classId, level, talents) => ({ classId, level, talents, strongholdsCleared: [], records: {} });
const fxOf = n => (n.t === 'c' ? n.opts.map(o => o.fx || {}) : [n.fx || {}]);

assert.equal(TALENT_TREES.guerrero, GUERRERO_TALENTS);
assert.equal(TALENT_TREES.maga, MAGA_TALENTS);
assert.equal(TALENT_TREES.arquera, ARQUERA_TALENTS);

let totalSkills = 0, totalNodes = 0;
for (const [cid, T] of Object.entries(TALENT_TREES)) {
  const skillIds = new Set(T.skills.map(s => s.id));
  const knownSkill = id => CLASSES[cid].skills.some(s => s.id === id) || skillIds.has(id);
  const granted = new Set();

  // ------------------------------------------------ 1) forma de cada árbol
  const checkTree = (label, nodes, treeName, gates) => {
    const ids = new Set();
    const cells = new Set();
    for (const n of nodes) {
      const tag = `${cid}/${label}/${n.id}`;
      for (const k of Object.keys(n)) assert.ok(NODE_KEYS.has(k), `${tag}: clave de nodo desconocida ${k}`);
      assert.ok(!ids.has(n.id), `${tag}: id repetido`); ids.add(n.id);
      assert.ok(n.name && typeof n.name === 'string', `${tag}: falta name`);
      assert.ok(['p', 'a', 'c', 'k', 'x'].includes(n.t), `${tag}: t inválido ${n.t}`);
      assert.ok(Number.isInteger(n.r) && n.r >= 0 && n.r <= 8, `${tag}: fila fuera de 0..8`);
      assert.ok(n.c >= 0 && n.c <= 3 && Number.isInteger(n.c * 2), `${tag}: columna fuera de 0..3 (paso 0,5)`);
      assert.ok(!cells.has(`${n.r}:${n.c}`), `${tag}: dos nodos en la celda ${n.r}:${n.c}`); cells.add(`${n.r}:${n.c}`);
      assert.ok(Number.isInteger(n.max) && n.max >= 1, `${tag}: max ≥ 1`);
      assert.equal(n.icon, `talents/${cid}-${treeName}-${n.id}.webp`, `${tag}: ruta de icono`);
      if (existsSync(ASSETS)) assert.ok(existsSync(ASSETS + n.icon), `${tag}: falta el icono ${n.icon}`);
      if (n.t === 'x') assert.equal(n.r, 8, `${tag}: el apex va en la fila 8`);
      if (n.t === 'c') {
        assert.equal(n.max, 1, `${tag}: una elección tiene 1 rango`);
        assert.deepEqual(n.opts.map(o => o.k), ['A', 'B'], `${tag}: opciones A/B`);
        for (const o of n.opts) {
          assert.ok(o.name && typeof o.desc === 'string' && o.desc.length > 10, `${tag}/${o.k}: name/desc`);
          assert.ok(o.fx && typeof o.fx === 'object', `${tag}/${o.k}: fx`);
          assert.ok(!('d' in o), `${tag}/${o.k}: opts[].d debe ser opts[].desc (§5.1)`);
          assert.ok(nodeDesc(n, 1, o.k).includes(o.name), `${tag}: nodeDesc de la opción ${o.k}`);
        }
      } else {
        assert.ok(n.fx && typeof n.fx === 'object', `${tag}: falta fx`);
        assert.ok(typeof n.d === 'string' || typeof n.d === 'function', `${tag}: falta d`);
        for (let r = 1; r <= n.max; r++) {
          const txt = nodeDesc(n, r);
          assert.ok(typeof txt === 'string' && txt.length > 10 && !/undefined|NaN|\$\{/.test(txt), `${tag}: d(${r}) = ${txt}`);
        }
        if (typeof n.d === 'function' && n.max > 1) assert.notEqual(n.d(1), n.d(n.max), `${tag}: d(r) no cambia con el rango`);
      }
      // fx: claves y vocabulario
      for (const fx of fxOf(n)) {
        for (const k of Object.keys(fx)) assert.ok(FX_KEYS.has(k), `${tag}: clave fx desconocida ${k}`);
        for (const k of Object.keys(fx.stats || {})) assert.ok(STATS.has(k), `${tag}: stat desconocida ${k}`);
        for (const k of Object.keys(fx.tv || {})) assert.ok(TV_53.has(k), `${tag}: clave tv fuera de §5.3: ${k}`);
        for (const k of Object.keys(fx.elem || {})) assert.ok(ELEMS.includes(k), `${tag}: elem fuera de ELEMS: ${k}`);
        for (const k of Object.keys(fx.skillLv || {})) assert.ok(k === '@spec' || k === '@all' || knownSkill(k), `${tag}: skillLv a habilidad inexistente ${k}`);
        for (const [k, m] of Object.entries(fx.mod || {})) {
          assert.ok(k === '@all' || (k[0] === '@' && ELEMS.includes(k.slice(1))) || knownSkill(k), `${tag}: mod a habilidad inexistente ${k}`);
          for (const mk of Object.keys(m)) assert.ok(MOD_KEYS.has(mk), `${tag}: clave de mod desconocida ${k}.${mk}`);
          for (const v of Object.values(m)) if (Array.isArray(v)) assert.equal(v.length, n.max, `${tag}: array de ${k} con un valor por rango`);
        }
        if (fx.power) {
          assert.ok(POWERS_53.has(fx.power) || POWERS_EXTRA.has(fx.power) || OWN_PREFIX[cid].test(fx.power), `${tag}: power fuera de §5.3 y sin prefijo de ${cid}: ${fx.power}`);
          assert.ok(POWER_HOOKS[fx.power], `${tag}: power sin registrar en POWER_HOOKS: ${fx.power}`);
          const prev = powerOwner.get(fx.power);
          assert.ok(!prev || prev === `${cid}/${label}/${n.id}`, `${tag}: el poder ${fx.power} ya lo lleva ${prev} (sin portadores: un poder por nodo)`);
          powerOwner.set(fx.power, `${cid}/${label}/${n.id}`);
        }
        if (fx.grant) { assert.ok(skillIds.has(fx.grant), `${tag}: grant sin activa ${fx.grant}`); granted.add(fx.grant); }
      }
    }
    // req: nodos existentes de filas anteriores (el apex encadena x1→x2→x3 dentro de la fila 8)
    for (const n of nodes) {
      for (const id of n.req || []) {
        const p = nodes.find(o => o.id === id);
        assert.ok(p, `${cid}/${label}/${n.id}: req a nodo inexistente ${id}`);
        assert.ok(p.r < n.r || (n.t === 'x' && p.t === 'x' && p.c < n.c), `${cid}/${label}/${n.id}: req ${id} no está en una fila anterior`);
      }
      if (n.r > 0 && !n.free) assert.ok(n.req?.length, `${cid}/${label}/${n.id}: sin req fuera de la fila 0`);
    }
    // las puertas se pueden pasar: con todo lo de arriba al máximo hay puntos de sobra
    for (const g of gates) {
      const above = nodes.filter(n => !n.free && n.r < g.row).reduce((a, n) => a + n.max, 0);
      assert.ok(above >= g.need, `${cid}/${label}: la puerta de la fila ${g.row} pide ${g.need} y arriba solo hay ${above}`);
    }
    totalNodes += nodes.length;
  };

  assert.equal(T.cls.name, CLASSES[cid].name, `${cid}: nombre del árbol de clase`);
  assert.equal(T.cls.nodes.length, 15, `${cid}: 15 nodos de clase`);
  assert.ok(!T.cls.nodes.some(n => n.free), `${cid}: el árbol de clase no tiene nodo gratis`);
  checkTree('clase', T.cls.nodes, 'clase', CLASS_GATES);
  assert.equal(T.cls.nodes.filter(n => !n.free).reduce((a, n) => a + n.max, 0), 26, `${cid}: 26 puntos gastables en clase (§5.4)`);

  // ------------------------------------------------ 2) especializaciones
  assert.deepEqual(T.specs.map(s => s.id), SPECS[cid], `${cid}: ids de especialización = los de las maestrías`);
  for (const s of T.specs) {
    const tag = `${cid}/${s.id}`;
    assert.ok(s.name && ROLES.has(s.role) && MECHANICS.has(s.mechanic), `${tag}: name/role/mechanic`);
    assert.equal(s.icon, `specs/${s.id}.webp`); assert.equal(s.emblem, `emblems/${s.id}.webp`);
    if (existsSync(ASSETS)) for (const f of [s.icon, s.emblem]) assert.ok(existsSync(ASSETS + f), `${tag}: falta ${f}`);
    assert.ok(s.innate && typeof s.innate === 'object', `${tag}: innate`);
    for (const k of Object.keys(s.innate)) assert.ok(STATS.has(k) || k === 'hpPct', `${tag}: innate desconocida ${k}`);
    assert.equal(s.nodes.length, 21, `${tag}: 21 nodos (s0..s17 + x1..x3)`);
    assert.deepEqual(s.nodes.map(n => n.id), [...Array.from({ length: 18 }, (_, i) => `s${i}`), 'x1', 'x2', 'x3'], `${tag}: ids`);
    checkTree(s.id, s.nodes, s.id, SPEC_GATES);
    assert.equal(s.nodes.filter(n => !n.free).reduce((a, n) => a + n.max, 0), 35, `${tag}: 35 puntos gastables (§5.4)`);
    // §5.2.1: s0 gratis otorga la insignia; s4 la potencia (1 rango, pasiva)
    const s0 = s.nodes[0], s4 = s.nodes[4];
    assert.ok(s0.free && s0.t === 'k' && s0.r === 0, `${tag}: s0 es el nodo clave gratis`);
    assert.equal(s.nodes.filter(n => n.free).length, 1, `${tag}: un solo nodo gratis`);
    assert.equal(s0.fx.grant, INSIGNIA[s.id], `${tag}: s0 otorga la insignia`);
    assert.ok(s0.fx.power, `${tag}: s0 conserva su poder`);
    assert.ok(s4.t === 'p' && s4.max === 1 && !s4.fx.grant, `${tag}: s4 potencia la insignia (no la otorga)`);
    const sk0 = T.skills.find(k => k.id === INSIGNIA[s.id]);
    assert.ok(sk0.cat === 'spec' && sk0.slots.includes('k3'), `${tag}: la insignia va en la ranura 3`);
  }

  // ------------------------------------------------ 4) activas `grant`
  assert.deepEqual([...skillIds].sort(), [...granted].sort(), `${cid}: cada activa la otorga algún nodo y viceversa`);
  for (const sk of T.skills) {
    assert.deepEqual(validateSkillDef(sk), [], `${sk.id}: ${validateSkillDef(sk).join('; ')}`);
    assert.equal(sk.kind, 'talent', `${sk.id}: kind talent`);
    assert.equal(sk.req, TALENT_START_LEVEL, `${sk.id}: req 10`);
    assert.deepEqual(sk.slots, defaultSlots(sk.cat, sk.tags), `${sk.id}: slots = defaultSlots`);
    assert.ok(sk.tags.every(t => TAGS.has(t)));
    assert.ok(sk.behavior || GENERIC_TYPES.includes(sk.type), `${sk.id}: tipo genérico o comportamiento`);
    assert.ok(!CLASSES[cid].skills.some(b => b.id === sk.id && b.kind !== 'talent'), `${sk.id}: no pisa una habilidad base`);
    // data.js las añade (normalizadas) al catálogo de la clase con kind 'talent'
    assert.equal(CLASSES[cid].skills.filter(b => b.id === sk.id).length, 1, `${sk.id}: registrada una vez en CLASSES.${cid}`);
  }
  totalSkills += T.skills.length;

  // ------------------------------------------------ 5) presets y funciones de talents.js
  for (const s of T.specs) {
    const raw = { spec: s.id, cls: {}, sp: {}, choice: {} };
    const p = mkP(cid, 50, normalizeTalents(raw, cid));
    assert.equal(p.talents.spec, s.id);
    for (const [which, list] of [['cls', T.cls.preset], ['cls', s.clsPreset], ['spec', s.preset]]) {
      const tree = treeOf(p, which);
      let sum = 0;
      const want = {};
      for (const [id, n, ch] of list) {
        const node = tree.nodes.find(x => x.id === id);
        assert.ok(node && !node.free && n >= 1 && n <= node.max, `${cid}/${s.id}/${which}: preset ${id}×${n}`);
        if (node.t === 'c') assert.ok(['A', 'B'].includes(ch), `${cid}/${s.id}: preset de elección ${id} sin opción`);
        else assert.equal(ch, undefined, `${cid}/${s.id}: ${id} no es una elección`);
        want[id] = n; sum += n;
      }
      assert.ok(sum <= talentPointsEarned(p, which), `${cid}/${s.id}/${which}: el preset (${sum}) cabe en los puntos de Nv50 sin hazañas`);
      // en orden, el preset respeta puertas y requisitos: presetRanks lo aplica entero
      const saved = which === 'cls' ? p.talents.cls : p.talents.sp[s.id];
      const ranks = which === 'cls' ? (p.talents.cls = {}) : (p.talents.sp[s.id] = {});
      for (const [id, n] of list) for (let i = 0; i < n; i++) {
        assert.ok(canAddRank(p, which, id), `${cid}/${s.id}/${which}: el preset no puede añadir ${id} (rango ${i + 1})`);
        ranks[id] = (ranks[id] | 0) + 1;
      }
      assert.deepEqual(ranks, want);
      if (which === 'cls') p.talents.cls = saved; else p.talents.sp[s.id] = saved;
      // Paso 2c.0: el preset de CLASE es el clsPreset de la especialización elegida
      if (which === 'spec' || list === s.clsPreset) assert.deepEqual(presetRanks(p, which), want, `${cid}/${s.id}/${which}: presetRanks`);
      for (const [id, , ch] of list) if (ch) p.talents.choice[id] = ch;
    }
    // jugador con los dos presets aplicados → aggregateTalents
    p.talents.cls = presetRanks(p, 'cls');
    p.talents.sp[s.id] = presetRanks(p, 'spec');
    assert.ok(talentPointsLeft(p, 'cls') >= 0 && talentPointsLeft(p, 'spec') >= 0);
    const agg = aggregateTalents(p);
    assert.ok(agg.grants.has(INSIGNIA[s.id]), `${cid}/${s.id}: la insignia llega por s0`);
    assert.ok(agg.powers.has(s.nodes[0].fx.power), `${cid}/${s.id}: el poder del nodo clave`);
    for (const g of agg.grants) assert.ok(skillIds.has(g));
    for (const [k, v] of Object.entries(agg.stats)) assert.ok(Number.isFinite(v), `${cid}/${s.id}: stat ${k} = ${v}`);
    // costRedBig es un objeto {pct, over} (Paso 2c.0: se fusiona aparte, ya no "0[object Object]")
    for (const [k, v] of Object.entries(agg.tv)) {
      if (k === 'costRedBig') assert.ok(Number.isFinite(v.pct) && Number.isFinite(v.over), `${cid}/${s.id}: costRedBig ${JSON.stringify(v)}`);
      else assert.ok(Number.isFinite(v), `${cid}/${s.id}: tv ${k} = ${v}`);
    }
    for (const [id, m] of Object.entries(agg.mods)) assert.ok(knownSkill(id) && typeof m === 'object', `${cid}/${s.id}: mod a ${id}`);
    // por debajo de Nv10 la especialización no aporta nada
    const low = aggregateTalents({ ...p, level: TALENT_START_LEVEL - 1 });
    assert.ok(!low.grants.has(INSIGNIA[s.id]), `${cid}/${s.id}: sin especialización antes de Nv10`);
  }

  // normalizeTalents: migración desde la maestría, purga de ids y rangos fuera de rango
  const spec0 = T.specs[0];
  const mig = normalizeTalents(null, cid, spec0.id);
  assert.equal(mig.spec, spec0.id, `${cid}: la maestría antigua pasa a ser la especialización`);
  assert.deepEqual(Object.keys(mig.sp).sort(), SPECS[cid].slice().sort());
  const dirty = normalizeTalents({ spec: 'nope', cls: { c1: 99, zz: 3, c2: 0 }, sp: { [spec0.id]: { s1: 7, x9: 1 } }, choice: { c5: 'B' } }, cid);
  assert.equal(dirty.spec, null, `${cid}: especialización inválida → null`);
  assert.deepEqual(dirty.cls, { c1: T.cls.nodes.find(n => n.id === 'c1').max }, `${cid}: purga y tope de rangos (clase)`);
  assert.deepEqual(dirty.sp[spec0.id], { s1: spec0.nodes.find(n => n.id === 's1').max }, `${cid}: purga y tope de rangos (spec)`);

  // canAddRank / canRemoveRank: requisitos, puertas, puntos y nodo gratis
  const p = mkP(cid, 50, normalizeTalents({ spec: spec0.id }, cid));
  assert.equal(canAddRank(p, 'spec', 's0'), false, `${cid}: el nodo clave gratis no se compra`);
  assert.equal(canAddRank(p, 'cls', 'c1'), true, `${cid}: c1 sin requisitos`);
  assert.equal(canAddRank(p, 'cls', 'c2'), false, `${cid}: c2 exige c1 al máximo`);
  p.talents.cls.c1 = T.cls.nodes[0].max;
  assert.equal(canAddRank(p, 'cls', 'c2'), true, `${cid}: con c1 al máximo se abre c2`);
  assert.equal(canRemoveRank(p, 'cls', 'c1'), true);
  p.talents.cls.c2 = 1;
  assert.equal(canRemoveRank(p, 'cls', 'c1'), false, `${cid}: no se puede quitar un padre del que cuelga otro nodo`);
  const row3 = spec0.nodes.find(n => n.r === 3 && n.req.every(id => spec0.nodes.find(o => o.id === id).r < 3));
  for (const id of row3.req) p.talents.sp[spec0.id][id] = spec0.nodes.find(o => o.id === id).max;
  if (spentIn(treeOf(p, 'spec'), p.talents.sp[spec0.id], 3) < SPEC_GATES[0].need)
    assert.equal(canAddRank(p, 'spec', row3.id), false, `${cid}: la puerta de la fila 3 (6 puntos) bloquea`);
  // 6 hazañas (+3 puntos de spec): en Nv39 sobran puntos y solo bloquea el nivel del apex
  const apex = { ...mkP(cid, 39, normalizeTalents({ spec: spec0.id }, cid)), strongholdsCleared: ['a', 'b'], records: { bossKills: 12 } };
  apex.talents.sp[spec0.id] = presetRanks({ ...apex, level: 50 }, 'spec');
  delete apex.talents.sp[spec0.id].x2; delete apex.talents.sp[spec0.id].x1;
  assert.equal(spentIn(treeOf(apex, 'spec'), apex.talents.sp[spec0.id]), SPEC_GATES[2].need, `${cid}: el preset llega justo a la puerta del apex`);
  assert.ok(talentPointsLeft(apex, 'spec') > 0);
  assert.equal(canAddRank(apex, 'spec', 'x1'), false, `${cid}: el apex pide Nv40`);
  assert.equal(canAddRank({ ...apex, level: 40 }, 'spec', 'x1'), true, `${cid}: en Nv40 con 17 puntos se abre el apex`);
  // sin puntos no se compra nada
  const poor = mkP(cid, TALENT_START_LEVEL, normalizeTalents({ spec: spec0.id }, cid));
  assert.equal(talentPointsEarned(poor, 'cls'), 0);
  assert.equal(canAddRank(poor, 'cls', 'c1'), false, `${cid}: en Nv10 aún no hay punto de clase`);
}
assert.equal(totalSkills, 42, '42 activas de talento (§3, estado T)');
assert.equal(totalNodes, 3 * (15 + 3 * 21), '234 nodos (= 234 iconos de talents/)');

// ------------------------------------------------ 3) ajustes concretos de §5.2
const node = (cid, spec, id) => (spec ? TALENT_TREES[cid].specs.find(s => s.id === spec).nodes : TALENT_TREES[cid].cls.nodes).find(n => n.id === id);
const optFx = (n, k) => n.opts.find(o => o.k === k).fx;
assert.deepEqual(node('arquera', 'francotiradora', 's10').fx.mod.a_t_apuntado, { critCdr: 0.4 }, 'Francotiradora s10: cdhit → critCdr');
assert.ok(node('arquera', 'francotiradora', 's12').fx.skillLv.a_t_apuntado && !('a_p_punteria' in node('arquera', 'francotiradora', 's12').fx.skillLv));
assert.ok(!node('arquera', 'montaraz', 's0').fx.tv, 'Montaraz s0: fuera tv.slowedDmg');
assert.deepEqual(node('arquera', 'montaraz', 's3').fx.mod.lluvia_flechas, { zone: 1, zoneDur: 2, slowPct: [30, 30] });
// Paso 2c.2: los «+N s» de inmovilización van en rootAdd (se SUMAN); la Mina ya no lleva mod.dmg
assert.deepEqual(optFx(node('arquera', 'montaraz', 's6'), 'A').mod.a_t_cepo, { rootAdd: 1 });
assert.deepEqual(optFx(node('arquera', 'montaraz', 's6'), 'B').mod.a_t_cepo, { radius: 100 });
assert.deepEqual(node('arquera', 'montaraz', 's16').fx.mod.a_t_cepo, { rootAdd: 0.5 });
assert.deepEqual(node('arquera', 'montaraz', 's17').fx, { tv: { rootedWeak: 10 } });
assert.deepEqual(node('arquera', null, 'c11').fx.mod.agilidad, { durS: 1 });
assert.deepEqual(node('arquera', 'tiradora', 's5').fx.mod.agilidad, { durS: 1 }, 'Tiradora s5: fuera el +5 % relativo del buff (Paso 2c.2)');
assert.deepEqual(node('arquera', null, 'c14').fx.tv, { costRedBig: { pct: 5, over: 15 } });   // 2c.2: 15 → 10 · 2e: 10 → 5 (recalibración)
assert.deepEqual(node('maga', null, 'c14').fx.tv, { costRedBig: { pct: 15, over: 20 } });
assert.deepEqual(node('maga', 'crionte', 's0').fx.tv, { shatterPct: 15 });
assert.deepEqual(node('maga', null, 'c9').fx, { skillLv: { '@spec': 1 } });
assert.deepEqual(optFx(node('maga', null, 'c5'), 'A'), { grant: 'm_t_contrahechizo' });
assert.deepEqual(optFx(node('maga', null, 'c5'), 'B'), { power: 'm_ralentizar' });
assert.deepEqual(node('maga', 'piromante', 's0').fx, { power: 'p_ignicion', grant: 'p_llamarada' });
assert.deepEqual(node('maga', 'piromante', 's4').fx, { power: 'p_llamarada_avivada' });
assert.ok(/\+25% de daño/.test(node('guerrero', 'berserker', 's0').d), 'Sed de Batalla ×1,25');
assert.ok(/\+20% de daño/.test(node('arquera', 'francotiradora', 's0').d), 'Tiro Mortal ×1,20 (2e)');
assert.ok(/\+10% de daño/.test(node('arquera', 'montaraz', 's0').d), 'Cacería ×1,10 (2e)');
assert.deepEqual(node('guerrero', null, 'c1').fx.elem, { physical: 4 }, "elem 'phys' → 'physical'");
// todos los nodos de Maga/Piromante tienen fx no vacío (tabla de §5.2.4)
for (const n of [...TALENT_TREES.maga.cls.nodes, ...TALENT_TREES.maga.specs[0].nodes])
  for (const fx of fxOf(n)) assert.ok(Object.keys(fx).length, `maga/${n.id}: fx vacío`);
// d(r) muestra el valor del rango
assert.equal(node('guerrero', null, 'c1').d(2), '+8% de daño Físico.');
assert.equal(node('maga', 'crionte', 's3').d(2), 'Tus hechizos de Escarcha ralentizan durante 5 s.');

console.log('\n✅ DATOS DE TALENTOS (talents-guerrero/maga/arquera) OK');
