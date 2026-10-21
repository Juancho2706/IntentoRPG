// Paso 2g · E1 (W1) — reglas GENÉRICAS de los datos de talentos v2 (docs/paso2-implementacion.md §3.1)
// Sustituye a test65a. Corre sobre TODA clase del juego con <CLASE>_TALENTS.v === 2 (en E1 ninguna:
// se saltan) y sobre el fixture v2 (tests/fixtures/talents-sample.mjs). Cada regla se prueba además
// con una mutación sembrada en una copia del fixture (debe fallar con su mensaje).
//  · ids únicos por clase; solo la clase usa c + número
//  · G16: mismo número = misma casilla en las tres especializaciones; forma = TV2.REJILLA
//  · G2: grant solo en la opción A, ≤ 3 en clase, ≤ 1 por árbol héroe, ninguno en especialización;
//    la activa existe en el catálogo y solo cabe en la ranura 2
//  · G7: textos ≤ 120 por rango (el ápice, por segmento), sin jerga; `win` en cada elección
//  · spec.elem y spec.mechanic válidos
//  · G1: la clase no usa @spec/@insignia ni ids del kit de especialización
//  · G8: 4 builds por especialización (una híbrida) legales punto a punto (34/31/1 + 10); defaultBuild
//  · G17: ≥ 3 nodos mecánicos que tocan cada habilidad del kit
//  · G18: 3 árboles héroe, cada especialización en 2, 10 nodos por build
//  · poderes registrados, con el prefijo de su clase, uno por nodo y sin repetirse entre clases (D28)
//  · claves tv del núcleo (CORE_TV_KEYS) o de la clase (<CLASE>_TV_KEYS); claves de fx conocidas
//  · vocabulario (lo que test65a miraba): claves de nodo y de opción; stats e innatas que suma
//    recompute (el saco `item` de js/entities.js y los atributos); claves de mod de mergeMods
//    (emptyMods + las nuevas de §3.5/§3.6); destinos de mod y skillLv = selector de §3.8 o una
//    habilidad del catálogo; listas por rango con `max` valores
//  · AVISOS (no fallan salvo en ctx.strict): G8b (los puntos de una build van a habilidades de su
//    barra: build.bar o SPEC_BAR[spec]) y `todo` (permitido en el esqueleto de E1.5, no al cerrar E2)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { cargarMockup } from '../tools/convert-v2/lib/cargar.mjs';
import * as T from '../js/talents.js';
import * as SD from '../js/skill-defs.js';
import { POWER_HOOKS } from '../js/powers.js';
import { CRIT_CDR_TV_KEYS, usesCoreTv } from '../js/powers-common.js';
import { CLASSES, SPEC_BAR, specKitOf } from '../js/data.js';
import * as TM from '../js/talents-maga.js';
import * as TG from '../js/talents-guerrero.js';
import * as TA from '../js/talents-arquera.js';
import * as FIX from './fixtures/talents-sample.mjs';

const { TV2 } = cargarMockup('maga');
const GRID = TV2.REJILLA, RULES = TV2.REGLAS, GAUGES = new Set(TV2.GAUGES);
// prefijos de poder por clase (decisión 9 del orquestador tras E0): árboles de clase, especialización y héroe
export const POWER_PREFIX = { maga: /^[mpka]_[a-z0-9_]+$/, guerrero: /^g_[a-z0-9_]+$/, arquera: /^[afmtqwy]_[a-z0-9_]+$/ };
const JARGON = /\bUNI\b|ÁREA×5|\bTTD\b|stagger|\bprocs?\b|astadora/i;
const FX_KEYS = new Set(['stats', 'elem', 'skillLv', 'mod', 'tv', 'power', 'grant']);
const { ELEMS, CATS } = SD;
const ELEM_KEYS = new Set([...ELEMS, 'phys']);
// claves de un nodo (§3.1) y de una opción de elección
const NODE_KEYS = new Set(['id', 'name', 't', 'tag', 'r', 'c', 'max', 'req', 'free', 'fx', 'opts', 'd', 'win', 'touch', 'icon', 'arch', 'final', 'hyb', 'todo']);
const OPT_KEYS = new Set(['k', 'name', 'desc', 'role', 'fx']);
// stats que SUMA recompute: el saco `item` de Player.recompute (js/entities.js) y los atributos.
// addStats descarta en silencio cualquier otra clave: un nodo con una errata no haría nada
const ENTITIES_SRC = readFileSync(new URL('../js/entities.js', import.meta.url), 'utf8');
const ITEM_BLOCK = ENTITIES_SRC.match(/const item = \{([\s\S]*?)\};/);
assert.ok(ITEM_BLOCK, 'test78: no encuentro el saco `const item = {…}` de recompute en js/entities.js');
const RECOMPUTE_STATS = new Set([...ITEM_BLOCK[1].replace(/\/\/.*$/gm, '').matchAll(/([A-Za-z_]\w*)\s*:/g)].map(m => m[1]));
for (const k of ['hp', 'mp', 'dmgPct', 'crit', 'arm', 'aspdPct', 'critDmg', 'dr', 'block', 'hpPct', 'staggerPct', 'threatMult', 'healPct'])
  assert.ok(RECOMPUTE_STATS.has(k), `test78: el saco de recompute leído de entities.js no tiene «${k}» (¿cambió su forma?)`);
const ATTR_KEYS = new Set(Object.values(CLASSES).flatMap(c => Object.keys(c.base || {})));
assert.ok(ATTR_KEYS.size >= 4, 'atributos de las clases (fue, des, vit, ene)');
export const STAT_KEYS = new Set([...RECOMPUTE_STATS, ...ATTR_KEYS]);
// claves de mod: las de mergeMods (emptyMods) + las nuevas de §3.5 y §3.6 (+ SD.MOD_KEYS si W2 lo exporta)
export const MOD_KEYS = new Set([...Object.keys(SD.emptyMods()),
  'windupAdd', 'windupMul', 'moveMulAdd', 'moveMulMin', 'charges', 'recastAdd', 'recastWin', 'comboWin', 'chargeSpeed',
  'perfectWin', 'perfectEarly', 'perfectPct', 'zoneMax', 'pull', 'knock', 'killReset', 'shieldGain', 'dmgDirect', 'splashPct',
  'repeatAdd', ...(SD.MOD_KEYS || [])]);
// valores válidos de '@cat:' y '@tag:' (tags del catálogo + los de verbo de §3.6; cat y elem también son tags)
const TAG_VALUES = new Set([...(SD.TAGS || []), 'charge', 'combo', 'recast', 'stance', ...CATS, ...ELEMS]);
const CAT_VALUES = new Set(CATS);
const num = id => +String(id).replace(/^\D+/, '');
const isFn = v => typeof v === 'function';

// ------------------------------------------------ claves tv del núcleo: cada una se lee en un archivo común
// Por nombre (tv.x / tv?.x), por el sufijo dinámico de dotProfile (tv?.[kind + 'Pct']) o POR TABLA:
// nucleo_tv recorre CRIT_CDR_KEYS y lee tv[clave] (las claves de esa tabla: CRIT_CDR_TV_KEYS).
{
  const dir = new URL('../js/', import.meta.url);
  const shared = readdirSync(dir).filter(f => f.endsWith('.js') && !/-(maga|guerrero|arquera)\.js$/.test(f) && f !== 'talents.js');
  const src = shared.map(f => readFileSync(new URL(f, dir), 'utf8')).join('\n');
  const read = new Set([...src.matchAll(/\btv\??\.([A-Za-z_]\w*)/g)].map(m => m[1]));
  const dynamicPct = /tv\?\.\[kind \+ 'Pct'\]/.test(src);
  const pcSrc = readFileSync(new URL('powers-common.js', dir), 'utf8');
  const tableLoop = /for \(const \[(\w+)[^\]]*\] of Object\.entries\(CRIT_CDR_KEYS\)\)[\s\S]{0,300}?\btv\[\1\]/.test(pcSrc);
  assert.ok(tableLoop, 'nucleo_tv debe leer su tabla CRIT_CDR_KEYS con tv[clave] (si no, sus claves no se leen en ningún sitio)');
  const byTable = new Set(CRIT_CDR_TV_KEYS);
  assert.ok(byTable.size >= 4 && byTable.has('critFireCdr'), `CRIT_CDR_TV_KEYS: ${[...byTable]}`);
  const isRead = k => read.has(k) || byTable.has(k) || (dynamicPct && /^(bleed|poison|burn)Pct$/.test(k));
  for (const k of T.CORE_TV_KEYS) assert.ok(isRead(k), `CORE_TV_KEYS: «${k}» no lo lee ningún archivo común de js/`);
  assert.ok(!isRead('tvInventadaXyz'), 'la comprobación de lectura rechaza una clave que nadie lee');
  // fuente única: NUCLEO_TV_KEYS ⊂ CORE_TV_KEYS, y toda clave de la tabla activa nucleo_tv (si no,
  // recompute no añadiría el poder y la clave no haría nada)
  for (const k of SD.NUCLEO_TV_KEYS) assert.ok(T.CORE_TV_KEYS.includes(k), `NUCLEO_TV_KEYS: «${k}» fuera de CORE_TV_KEYS`);
  for (const k of byTable) assert.ok(SD.NUCLEO_TV_KEYS.includes(k) && usesCoreTv({ [k]: 1 }), `«${k}» (tabla de nucleo_tv) debe activar el poder nucleo_tv`);
  assert.equal(new Set(T.CORE_TV_KEYS).size, T.CORE_TV_KEYS.length, 'CORE_TV_KEYS sin repetidos');
}

// ------------------------------------------------ el comprobador
// ctx = { isRegistered(id), tvKeys:Set, kitOf(specId) → ids, skillOf(id) → definición del catálogo | null }
//       specBar?(specId) → { lmb, rmb, k1, k2, k3, k4 } (G8b), warnings?: [] (avisos), strict?: Set(tags de aviso que fallan)
export function checkClassData(cid, data, ctx) {
  const E = [];
  const err = (tag, msg) => E.push(`[${tag}] ${cid}: ${msg}`);
  const warn = (tag, msg) => (ctx.strict?.has(tag) ? E : (ctx.warnings || [])).push(`[${tag}] ${cid}: ${msg}`);
  if (!data || data.v !== 2) { err('forma', 'no es v2'); return E; }
  const specs = data.specs || [], heroes = data.hero || [];
  const trees = [['cls', data.cls?.nodes || []], ...specs.map(s => [s.id, s.nodes || []]), ...heroes.map(h => [h.id, h.nodes || []])];
  // ids
  const seen = new Map();
  for (const [w, nodes] of trees) for (const n of nodes) {
    if (seen.has(n.id)) err('ids', `id ${n.id} repetido (${seen.get(n.id)} y ${w})`);
    seen.set(n.id, w);
    if (w === 'cls' && !/^c\d+$/.test(n.id)) err('ids', `${n.id}: los nodos de clase se llaman c1…c30`);
    if (w !== 'cls' && /^c\d/.test(n.id)) err('ids', `${n.id}: solo la clase usa c + número`);
  }
  // rejillas (G16): misma forma que TV2.REJILLA; con el número del id
  const grid = (nodes, G, w) => {
    if (nodes.length !== G.length) err('rejilla', `${w}: ${nodes.length} nodos (la rejilla tiene ${G.length})`);
    const pre = new Set(nodes.map(n => String(n.id).replace(/\d+$/, '')));
    if (pre.size > 1) err('rejilla', `${w}: prefijos distintos (${[...pre]})`);
    for (const g of G) {
      const n = nodes.find(x => num(x.id) === g.n);
      if (!n) { err('rejilla', `${w}: falta el nodo ${g.n}`); continue; }
      if (n.r !== g.r || n.c !== g.c || n.max !== g.max || n.t !== g.t) err('rejilla', `${w}/${n.id}: casilla ${n.r},${n.c} ×${n.max} ${n.t} (rejilla ${g.r},${g.c} ×${g.max} ${g.t})`);
      const rq = (n.req || []).map(num).sort((a, b) => a - b).join(), gq = [...g.req].sort((a, b) => a - b).join();
      if (rq !== gq) err('rejilla', `${w}/${n.id}: requisitos ${rq} (rejilla ${gq})`);
      if ((n.t === 'k') !== !!n.free) err('rejilla', `${w}/${n.id}: el nodo clave (y solo él) es gratis`);
    }
  };
  grid(data.cls?.nodes || [], GRID.cls, 'clase');
  for (const s of specs) grid(s.nodes || [], GRID.spec, s.id);
  for (const h of heroes) grid(h.nodes || [], GRID.hero, h.id);
  if (specs.length !== 3) err('forma', `${specs.length} especializaciones`);
  // especializaciones: elemento y mecánica
  for (const s of specs) {
    if (!ELEMS.includes(s.elem)) err('elem', `${s.id}: elem «${s.elem}» (${ELEMS})`);
    if (!GAUGES.has(s.mechanic)) err('mecánica', `${s.id}: mecánica «${s.mechanic}» no existe`);
    for (const k of Object.keys(s.innate || {})) if (!STAT_KEYS.has(k)) err('stats', `${s.id}: innata «${k}» (recompute no la suma)`);
  }
  // destino de un mod o un skillLv: selector de §3.8 o una habilidad del catálogo de la clase
  const target = (sel, at) => {
    if (typeof sel === 'string' && sel[0] === '@') {
      if (!T.isKnownSelector(sel)) return err('selector', `${at}: selector «${sel}» no existe (§3.8)`);
      if (sel.startsWith('@cat:') && !CAT_VALUES.has(sel.slice(5))) err('selector', `${at}: categoría «${sel.slice(5)}» no existe`);
      if (sel.startsWith('@tag:') && !TAG_VALUES.has(sel.slice(5))) err('selector', `${at}: tag «${sel.slice(5)}» no existe`);
    } else if (!ctx.skillOf(sel)) err('selector', `${at}: «${sel}» no es un selector ni una habilidad del catálogo`);
  };
  // un valor por rango: una lista debe tener exactamente `max` valores
  const perRank = (v, max, at) => { if (Array.isArray(v) && v.length !== max) err('rango', `${at}: lista de ${v.length} valores (el nodo tiene ${max} rangos)`); };
  // árboles héroe (G18): 3, cada especialización en 2
  if (heroes.length !== 3) err('héroe', `${heroes.length} árboles héroe (deben ser 3)`);
  for (const h of heroes) if (!Array.isArray(h.specs) || h.specs.length !== 2 || new Set(h.specs).size !== 2 || h.specs.some(x => !specs.some(s => s.id === x)))
    err('héroe', `${h.id}: specs = 2 especializaciones distintas de la clase`);
  for (const s of specs) { const k = heroes.filter(h => (h.specs || []).includes(s.id)).length; if (k !== 2) err('héroe', `${s.id} está en ${k} árboles héroe (deben ser 2)`); }
  // textos (G7), elecciones, grants (G2), fx, poderes, tv
  const kitIds = new Set(specs.flatMap(s => ctx.kitOf(s.id) || []));
  const powerAt = new Map();
  let clsGrants = 0;
  for (const [w, nodes] of trees) {
    const isCls = w === 'cls', isSpec = specs.some(s => s.id === w);
    let treeGrants = 0;
    const text = (where, t) => {
      if (typeof t !== 'string' || !t.trim()) { err('textos', `${where}: sin texto`); return; }
      if (/undefined|NaN/.test(t)) err('textos', `${where}: «undefined»/«NaN» en «${t}»`);
      if (t.length > RULES.textoMax) err('textos', `${where}: ${t.length} caracteres (máx. ${RULES.textoMax}) «${t}»`);
      if (JARGON.test(t)) err('jerga', `${where}: «${t.match(JARGON)[0]}» en «${t}»`);
    };
    for (const n of nodes) {
      const where = `${w}/${n.id}`;
      for (const k of Object.keys(n)) if (!NODE_KEYS.has(k)) err('nodo', `${where}: clave de nodo desconocida «${k}»`);
      if ('todo' in n) warn('todo', `${where}: aún tiene «todo» (${String(n.todo).slice(0, 60)})`);
      if (typeof n.name !== 'string' || !n.name) err('textos', `${where}: sin nombre`); else if (JARGON.test(n.name)) err('jerga', `${where}: nombre «${n.name}»`);
      const fxs = [];
      if (n.t === 'c') {
        if (!Array.isArray(n.opts) || n.opts.map(o => o.k).join() !== 'A,B') { err('elección', `${where}: opts A/B`); continue; }
        if (typeof n.win !== 'string' || !n.win.trim()) err('win', `${where}: falta win («cuál conviene»)`); else if (JARGON.test(n.win)) err('jerga', `${where}: win «${n.win}»`);
        for (const o of n.opts) {
          for (const k of Object.keys(o)) if (!OPT_KEYS.has(k)) err('nodo', `${where}${o.k}: clave de opción desconocida «${k}»`);
          text(`${where}${o.k}`, o.desc);
          if (JARGON.test(o.name || '')) err('jerga', `${where}${o.k}: nombre «${o.name}»`);
          fxs.push([o.fx || {}, `${where}${o.k}`, o.k]);
        }
      } else {
        if (!isFn(n.d)) err('textos', `${where}: d(r) debe ser una función`);
        else for (let r = 1; r <= n.max; r++) {
          let t; try { t = n.d(r); } catch (e) { err('textos', `${where}: d(${r}) lanza ${e.message}`); continue; }
          text(`${where}·r${r}`, n.t === 'x' && typeof t === 'string' ? t.split(/\s(?=\d\)\s)/).pop() : t);
        }
        fxs.push([n.fx || {}, where, null]);
      }
      for (const [fx, at, k] of fxs) {
        for (const key of Object.keys(fx)) if (!FX_KEYS.has(key)) err('fx', `${at}: clave de fx desconocida «${key}»`);
        for (const e of Object.keys(fx.elem || {})) if (!ELEM_KEYS.has(e)) err('fx', `${at}: elem «${e}»`);
        // vocabulario: stats que suma recompute, claves de mod, destinos y listas por rango
        const max = n.max | 0;
        for (const [st, v] of Object.entries(fx.stats || {})) { if (!STAT_KEYS.has(st)) err('stats', `${at}: stat «${st}» (recompute no la suma)`); perRank(v, max, `${at} stats.${st}`); }
        for (const [e, v] of Object.entries(fx.elem || {})) perRank(v, max, `${at} elem.${e}`);
        for (const [t, v] of Object.entries(fx.tv || {})) perRank(v, max, `${at} tv.${t}`);
        for (const [sel, v] of Object.entries(fx.skillLv || {})) { target(sel, `${at} skillLv`); perRank(v, max, `${at} skillLv.${sel}`); }
        for (const [sel, m] of Object.entries(fx.mod || {})) {
          target(sel, `${at} mod`);
          if (!m || typeof m !== 'object' || Array.isArray(m)) { err('mod', `${at}: mod.${sel} debe ser un objeto`); continue; }
          for (const [mk, v] of Object.entries(m)) {
            if (!MOD_KEYS.has(mk)) err('mod', `${at}: clave de mod desconocida «${sel}.${mk}»`);
            perRank(v, max, `${at} mod.${sel}.${mk}`);
          }
        }
        // G1: la clase no toca el kit de especialización
        if (isCls) {
          const sels = [...Object.keys(fx.mod || {}), ...Object.keys(fx.skillLv || {}), ...(n.touch || [])];
          for (const sel of sels) if (sel === '@spec' || sel === '@insignia' || sel === '@cat:spec' || kitIds.has(sel)) err('G1', `${at}: la clase toca «${sel}» (kit de especialización)`);
        }
        if (fx.grant) {
          if (k !== 'A') err('G2', `${at}: una activa de talento solo va en la opción A de una elección`);
          if (isSpec) err('G2', `${at}: activa en un árbol de especialización (el kit está en el catálogo)`);
          if (isCls) clsGrants++; else treeGrants++;
          const sk = ctx.skillOf(fx.grant);
          if (!sk) err('G2', `${at}: la activa «${fx.grant}» no está en el catálogo`);
          else if (sk.kind !== 'talent' || (sk.slots || []).join() !== 'k2') err('G2', `${at}: «${fx.grant}» debe ser kind 'talent' con slots ['k2']`);
        }
        if (fx.power) {
          if (!ctx.prefix.test(fx.power)) err('prefijo', `${at}: poder «${fx.power}» sin el prefijo de la clase`);
          if (!ctx.isRegistered(fx.power)) err('registro', `${at}: poder «${fx.power}» sin registrar`);
          if (powerAt.has(fx.power)) err('poder', `${at}: «${fx.power}» ya lo lleva ${powerAt.get(fx.power)} (un poder por nodo)`);
          powerAt.set(fx.power, at);
          const other = ctx.powerClass.get(fx.power);
          if (other && other !== cid) err('D28', `${at}: el poder «${fx.power}» también es de ${other}`);
          ctx.powerClass.set(fx.power, cid);
        }
        for (const t of Object.keys(fx.tv || {})) if (!ctx.tvKeys.has(t)) err('tv', `${at}: clave tv «${t}» sin declarar (núcleo o <CLASE>_TV_KEYS)`);
      }
    }
    if (!isCls && !isSpec && treeGrants > 1) err('G2', `${w}: ${treeGrants} activas (máx. 1 por árbol héroe)`);
  }
  if (clsGrants > 3) err('G2', `clase: ${clsGrants} activas (máx. 3)`);
  // G17: ≥ 3 nodos mecánicos que tocan cada habilidad del kit (si el catálogo ya tiene kits)
  for (const s of specs) {
    const kit = ctx.kitOf(s.id) || [];
    for (const id of kit) {
      const k = (s.nodes || []).filter(n => n.tag === 'mec' && (n.touch || []).includes(id)).length;
      if (k < 3) err('G17', `${s.id}: ${k} nodos mecánicos tocan «${id}» (mínimo 3)`);
    }
  }
  // builds (G8, G18)
  const builds = Object.entries(data.builds || {});
  for (const s of specs) {
    const bs = builds.filter(([, b]) => b.sp === s.id);
    if (bs.length < 4) err('builds', `${s.id}: ${bs.length} builds (deben ser 4, una híbrida)`);
    const def = data.defaultBuild?.[s.id];
    if (!def || data.builds?.[def]?.sp !== s.id) err('builds', `${s.id}: defaultBuild «${def}» no es una build suya`);
    let hybrids = 0;
    for (const [key, raw] of bs) {
      const b = T.normBuild(raw);
      for (const [id] of [...b.clsOrder, ...b.specOrder]) if (!seen.has(id)) err('builds', `${key}: id desconocido «${id}»`);
      const cls = T.fillByOrder(data.cls.nodes, T.CLASS_GATES, b.clsOrder, T.earnedAt('cls', 100));
      const sp = T.fillByOrder(s.nodes, T.SPEC_GATES, b.specOrder, T.earnedAt('spec', 100));
      const cs = T.spentIn({ nodes: data.cls.nodes }, cls), ss = T.spentIn({ nodes: s.nodes }, sp);
      if (cs !== RULES.pts.cls) err('builds', `${key}: clase gasta ${cs}/${RULES.pts.cls} punto a punto`);
      if (ss !== RULES.pts.spec) err('builds', `${key}: especialización gasta ${ss}/${RULES.pts.spec} punto a punto`);
      if (!s.nodes.some(n => n.t === 'f' && (sp[n.id] | 0) >= n.max)) hybrids++;
      for (const [id, k] of Object.entries({ ...b.clsCh, ...b.specCh })) {
        const n = [...data.cls.nodes, ...s.nodes].find(x => x.id === id);
        if (!n || n.t !== 'c' || !['A', 'B'].includes(k)) err('builds', `${key}: elección ${id}=${k} no válida`);
      }
      // G8b (aviso): cada nodo comprado que nombra habilidades en `touch` toca alguna de SU barra
      const bar = b.bar || ctx.specBar?.(s.id) || null;
      if (bar) {
        const onBar = new Set(Object.values(bar).filter(Boolean));
        const hb = heroes.find(x => x.id === b.hero);
        const bought = [...data.cls.nodes.filter(n => cls[n.id] > 0), ...s.nodes.filter(n => sp[n.id] > 0),
          ...(hb?.nodes || []).filter(n => b.heroNodes.includes(n.id))];
        for (const n of bought) {
          const ids = (n.touch || []).filter(x => typeof x === 'string' && x[0] !== '@');
          if (ids.length && !ids.some(id => onBar.has(id))) warn('G8b', `${key}: ${n.id} toca ${ids.join(', ')}, fuera de su barra`);
        }
      }
      const h = heroes.find(x => x.id === b.hero);
      if (!h || !h.specs.includes(s.id)) { err('héroe', `${key}: árbol héroe «${b.hero}» no es de ${s.id}`); continue; }
      if (b.heroNodes.length !== RULES.pts.hero || new Set(b.heroNodes).size !== b.heroNodes.length) err('héroe', `${key}: heroNodes = ${RULES.pts.hero} nodos distintos (sin la clave)`);
      const got = new Set(h.nodes.filter(n => n.free).map(n => n.id));
      for (const id of b.heroNodes) {
        const n = h.nodes.find(x => x.id === id);
        if (!n || n.free) { err('héroe', `${key}: «${id}» no es un nodo comprable de ${h.id}`); break; }
        if (n.req?.length && !n.req.some(q => got.has(q))) { err('héroe', `${key}: «${id}» antes que sus requisitos`); break; }
        got.add(id);
      }
      for (const [id, k] of Object.entries(b.heroCh)) if (!h.nodes.some(n => n.id === id && n.t === 'c') || !['A', 'B'].includes(k)) err('héroe', `${key}: elección de héroe ${id}=${k}`);
    }
    if (bs.length && !hybrids) err('builds', `${s.id}: ninguna build híbrida (sin final al máximo)`);
  }
  return E;
}

// copia profunda que conserva las funciones d(r)
const clone = v => (Array.isArray(v) ? v.map(clone) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)])) : v);
const CLASS_MODS = { maga: TM, guerrero: TG, arquera: TA };
const PREFIX = { maga: 'MAGA', guerrero: 'GUERRERO', arquera: 'ARQUERA' };

// ------------------------------------------------ 1) clases del juego en v2
// avisos que FALLAN en las clases del juego (E2: añadir 'G8b' a la Arquera, §8; y 'todo' a todas al cerrar E2)
const STRICT = { maga: new Set(), guerrero: new Set(), arquera: new Set() };
const realPowers = new Map();
let real = 0;
for (const [cid, data] of Object.entries(T.TALENT_TREES)) {
  if (data?.v !== 2) { console.log(`· ${cid}: los datos del juego siguen en v1 → se saltan (E1.5)`); continue; }
  const mod = CLASS_MODS[cid];
  const ctx = { prefix: POWER_PREFIX[cid], isRegistered: id => !!POWER_HOOKS[id], powerClass: realPowers,
    tvKeys: new Set([...T.CORE_TV_KEYS, ...(mod[`${PREFIX[cid]}_TV_KEYS`] || [])]), kitOf: spec => specKitOf(cid, spec),
    skillOf: id => CLASSES[cid].skills.find(s => s.id === id) || null, specBar: spec => SPEC_BAR?.[spec]?.bar || null,
    warnings: [], strict: STRICT[cid] };
  const errs = checkClassData(cid, data, ctx);
  assert.deepEqual(errs, [], `${cid}: datos v2 con errores:\n${errs.join('\n')}`);
  for (const w of ctx.warnings) console.warn(`  ⚠ ${w}`);
  real++;
  console.log(`✓ ${cid}: datos del juego v2 en regla`);
}

// ------------------------------------------------ 2) el fixture v2 (las tres clases)
const FIX_TV = { maga: FIX.MAGA_TV_KEYS, guerrero: FIX.GUERRERO_TV_KEYS, arquera: FIX.ARQUERA_TV_KEYS };
// catálogo del fixture: sus activas de talento y el kit sintético de cada especialización
const KIT_CAT = ['spec', 'movement', 'spender', 'ultimate'];
const fixSkills = cid => new Map([...FIX.FIXTURE_TREES[cid].skills.map(s => [s.id, { ...s }]),
  ...FIX.FIXTURE_TREES[cid].specs.flatMap(s => FIX.FIXTURE_KITS[s.id].map((id, i) => [id, { id, cat: KIT_CAT[i], spec: s.id }]))]);
// barra de prueba de cada especialización: insignia en 3, movilidad en 1, principal en 🖱️Der, definitiva en 4
const fixBar = spec => { const [k1, k2, k3, k4] = FIX.FIXTURE_KITS[spec] || []; return { lmb: 'fx_basico', rmb: k3, k1: k2, k2: null, k3: k1, k4 }; };
function fixCtx(cid, powerClass = new Map()) {
  const skills = fixSkills(cid);
  return { prefix: POWER_PREFIX[cid], isRegistered: id => FIX.FIXTURE_POWERS.has(id), powerClass,
    tvKeys: new Set([...T.CORE_TV_KEYS, ...FIX_TV[cid]]), kitOf: spec => FIX.FIXTURE_KITS[spec] || [], skillOf: id => skills.get(id) || null,
    specBar: fixBar, warnings: [], strict: new Set() };
}
{
  const shared = new Map();
  for (const cid of ['maga', 'guerrero', 'arquera']) {
    const ctx = fixCtx(cid, shared);
    const errs = checkClassData(cid, FIX.FIXTURE_TREES[cid], ctx);
    assert.deepEqual(errs, [], `fixture ${cid}:\n${errs.join('\n')}`);
    assert.deepEqual(ctx.warnings, [], `fixture ${cid}: sin avisos (G8b contra la barra de prueba)`);
  }
  console.log('✓ fixture v2: las tres clases cumplen todas las reglas (y sin avisos)');
}

// ------------------------------------------------ 3) cada regla puede fallar (mutaciones sembradas)
let mutations = 0;
function expectFail(name, mutate, tag, { cid = 'maga', ctxMut = null } = {}) {
  const data = clone(FIX.FIXTURE_TREES[cid]);
  const ctx = fixCtx(cid);
  mutate(data, ctx);
  if (ctxMut) ctxMut(ctx);
  const errs = checkClassData(cid, data, ctx);
  assert.ok(errs.some(e => e.startsWith(`[${tag}]`)), `la mutación «${name}» debía dar un error [${tag}]; dio:\n${errs.join('\n') || '(ninguno)'}`);
  mutations++;
}
// un AVISO: sin `strict` no es error (solo aviso); con strict de su etiqueta, sí
function expectWarn(name, mutate, tag, { cid = 'maga' } = {}) {
  const data = clone(FIX.FIXTURE_TREES[cid]);
  mutate(data);
  const soft = fixCtx(cid);
  const errs = checkClassData(cid, data, soft);
  assert.ok(!errs.some(e => e.startsWith(`[${tag}]`)), `«${name}»: [${tag}] es un aviso, no un error`);
  assert.ok(soft.warnings.some(w => w.startsWith(`[${tag}]`)), `«${name}» debía avisar [${tag}]; avisó:\n${soft.warnings.join('\n') || '(nada)'}`);
  const hard = { ...fixCtx(cid), strict: new Set([tag]) };
  assert.ok(checkClassData(cid, data, hard).some(e => e.startsWith(`[${tag}]`)), `«${name}»: con strict, [${tag}] es un error`);
  mutations++;
}
const spec0 = d => d.specs[0], node = (nodes, id) => nodes.find(n => n.id === id);
expectFail('id repetido entre árboles', d => { node(spec0(d).nodes, 's5').id = 'i5'; }, 'ids');
expectFail('nodo de especialización con c + número', d => { spec0(d).nodes.find(n => n.id === 's3').id = 'c3x'.replace('x', ''); }, 'ids');
expectFail('casilla distinta en una especialización (G16)', d => { node(d.specs[2].nodes, 'a12').c = 3; }, 'rejilla');
expectFail('requisito cambiado en el héroe', d => { node(d.hero[1].nodes, 'f7').req = ['f4']; }, 'rejilla');
expectFail('falta un nodo de clase', d => { d.cls.nodes.pop(); }, 'rejilla');
expectFail('activa en la opción B (G2)', d => { const n = node(d.cls.nodes, 'c11'); n.opts[1].fx = { grant: n.opts[0].fx.grant }; n.opts[0].fx = {}; }, 'G2');
expectFail('cuarta activa en la clase (G2)', d => { node(d.cls.nodes, 'c5').opts[0].fx = { grant: 'm_t_bloque' }; }, 'G2');
expectFail('dos activas en un árbol héroe (G2)', d => { node(d.hero[0].nodes, 't2').opts[0].fx = { grant: 'm_h_detener' }; }, 'G2');
expectFail('activa en un árbol de especialización (G2)', d => { node(spec0(d).nodes, 's8').opts[0].fx = { grant: 'm_t_bloque' }; }, 'G2');
expectFail('activa que no es solo de la ranura 2 (G2)', () => {}, 'G2', { ctxMut: ctx => { const sk = ctx.skillOf('m_t_bloque'); sk.slots = ['k2', 'k3']; } });
expectFail('texto de más de 120 caracteres (G7)', d => { node(d.cls.nodes, 'c1').d = r => 'x'.repeat(120 + r); }, 'textos');
expectFail('ápice con un segmento largo (G7)', d => { node(spec0(d).nodes, 's28').d = r => ['1) corto.', `2) ${'y'.repeat(130)}`].slice(0, r).join(' '); }, 'textos');
expectFail('d(r) con NaN', d => { node(d.cls.nodes, 'c2').d = r => `+${r * NaN} %`; }, 'textos');
expectFail('jerga en una opción (G7)', d => { node(d.cls.nodes, 'c6').opts[0].desc = 'Más daño en UNI'; }, 'jerga');
expectFail('«Gastadora» en un nombre (G15)', d => { node(spec0(d).nodes, 's12').name = 'Gastadora Feroz'; }, 'jerga');
expectFail('elección sin «cuál conviene»', d => { delete node(d.cls.nodes, 'c9').win; }, 'win');
expectFail('elemento inválido', d => { spec0(d).elem = 'phys'; }, 'elem');
expectFail('mecánica inexistente', d => { d.specs[1].mechanic = 'furia'; }, 'mecánica');
expectFail('@spec en la clase (G1)', d => { node(d.cls.nodes, 'c2').fx = { mod: { '@spec': { dmg: 5 } } }; }, 'G1');
expectFail('la clase nombra el kit (G1)', d => { node(d.cls.nodes, 'c7').touch = ['fx_crionte_k2']; }, 'G1');
expectFail('build ilegal punto a punto (G8)', d => { const b = d.builds.brasa; delete b.cls.c1; }, 'builds');
expectFail('elección de build inválida', d => { d.builds.rayo.specCh.a8 = 'C'; }, 'builds');
expectFail('tres builds en una especialización', d => { delete d.builds.hibcrio; }, 'builds');
expectFail('sin build híbrida', d => { delete d.builds.hibarca; d.builds.hibarca = clone(d.builds.rayo); }, 'builds');
expectFail('defaultBuild de otra especialización', d => { d.defaultBuild.crionte = 'brasa'; }, 'builds');
expectFail('Paragon en orden ilegal (G18)', d => { const h = d.builds.glaciar.heroNodes; h.unshift(h.splice(h.indexOf('e12'), 1)[0]); }, 'héroe');
expectFail('build con árbol héroe ajeno', d => { d.builds.brasa.hero = 'escriba'; }, 'héroe');
expectFail('especialización en un solo árbol héroe (G18)', d => { d.hero[0].specs = ['crionte', 'arcanista']; }, 'héroe');
expectFail('poder sin el prefijo de la clase', d => { node(d.cls.nodes, 'c7').fx = { power: 'g_fx_ajeno' }; }, 'prefijo');
expectFail('poder sin registrar', d => { node(d.cls.nodes, 'c7').fx = { power: 'm_fx_sin_registrar' }; }, 'registro');
expectFail('un poder en dos nodos', d => { node(d.cls.nodes, 'c19').fx = { power: node(d.cls.nodes, 'c20').fx.power }; }, 'poder');
expectFail('poder repetido entre clases (D28)', () => {}, 'D28', { cid: 'arquera', ctxMut: ctx => { const p = FIX.FIXTURE_TREES.arquera.cls.nodes.find(n => n.id === 'c7').fx.power; ctx.powerClass.set(p, 'maga'); } });
expectFail('clave tv sin declarar', d => { node(spec0(d).nodes, 's7').fx = { tv: { tvInventada: 3 } }; }, 'tv');
expectFail('clave de fx desconocida', d => { node(d.cls.nodes, 'c1').fx = { statz: { hp: 1 } }; }, 'fx');
expectFail('menos de 3 nodos mecánicos por habilidad del kit (G17)', d => { for (const n of spec0(d).nodes) if (n.touch) n.touch = n.touch.filter(id => id !== 'fx_piromante_k4'); }, 'G17');
// vocabulario (lo que miraba test65a): stats, innatas, claves de mod, destinos, listas por rango, claves de nodo
expectFail('stat con errata', d => { node(d.cls.nodes, 'c1').fx = { stats: { dmgPtc: 5 } }; }, 'stats');
expectFail('innata que recompute no suma', d => { spec0(d).innate = { fuerza: 3 }; }, 'stats');
expectFail('clave de mod con errata', d => { node(d.cls.nodes, 'c6').opts[0].fx = { mod: { '@spender': { dmgg: 15 } } }; }, 'mod');
expectFail('selector inexistente', d => { node(d.cls.nodes, 'c2').fx = { mod: { '@spendr': { dmg: 6 } } }; }, 'selector');
expectFail('mod a una habilidad que no existe', d => { node(spec0(d).nodes, 's12').fx = { mod: { bola_fuegoo: { dmg: 8 } } }; }, 'selector');
expectFail('skillLv con selector inexistente', d => { node(spec0(d).nodes, 's2').fx = { skillLv: { '@spek': 1 } }; }, 'selector');
expectFail('@cat: con categoría inexistente', d => { node(d.cls.nodes, 'c3').fx = { mod: { '@cat:movilidad': { cdr: 10 } } }; }, 'selector');
expectFail('@tag: con tag inexistente', d => { node(d.cls.nodes, 'c3').fx = { mod: { '@tag:rafaga': { cdr: 10 } } }; }, 'selector');
expectFail('lista de mod con más valores que rangos', d => { node(spec0(d).nodes, 's12').fx = { mod: { fx_piromante_k3: { dmg: [1, 2, 3, 4, 5, 6, 7] } } }; }, 'rango');
expectFail('lista de stats con menos valores que rangos', d => { node(spec0(d).nodes, 's1').fx = { stats: { hp: [10, 20] } }; }, 'rango');
expectFail('clave de nodo desconocida', d => { node(d.cls.nodes, 'c1').tuch = ['@all']; }, 'nodo');
expectFail('clave de opción desconocida', d => { node(d.cls.nodes, 'c6').opts[0].dsc = 'Más daño'; }, 'nodo');
// la errata combinada del revisor: tres efectos vacíos en silencio → errores de cada tipo
{
  const d = clone(FIX.FIXTURE_TREES.maga);
  node(d.cls.nodes, 'c1').fx = { stats: { dmgPtc: 5 } };
  node(d.cls.nodes, 'c2').fx = { mod: { '@spendr': { dmgg: 6 } } };
  node(spec0(d).nodes, 's12').fx = { mod: { bola_fuegoo: { dmg: [1, 2, 3, 4, 5, 6, 7] } } };
  const errs = checkClassData('maga', d, fixCtx('maga'));
  for (const tag of ['stats', 'selector', 'mod', 'rango']) assert.ok(errs.some(e => e.startsWith(`[${tag}]`)), `errata combinada: falta [${tag}]\n${errs.join('\n')}`);
}
// avisos: G8b (la build compra nodos de habilidades que no lleva en la barra) y `todo`
expectWarn('build.bar sin la principal (G8b)', d => { const [k1, k2, , k4] = FIX.FIXTURE_KITS.piromante; d.builds.brasa.bar = { lmb: 'fx_basico', rmb: null, k1: k2, k2: null, k3: k1, k4 }; }, 'G8b');
expectWarn('barra de la build sin la definitiva (G8b)', d => { for (const k of ['brasa', 'cataclismo', 'ignicion', 'hibrido']) d.builds[k].bar = { ...fixBar('piromante'), k4: null }; }, 'G8b');
expectWarn('nodo con «todo»', d => { node(spec0(d).nodes, 's7').todo = 'falta el efecto'; }, 'todo');
console.log(`✓ ${mutations} mutaciones sembradas: cada regla detecta su error (y los avisos solo fallan con strict)`);

console.log(`\n✅ DATOS DE TALENTOS v2 (test78): ${real} clase(s) del juego en v2 y el fixture en regla`);
