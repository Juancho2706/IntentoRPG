// Lo que el conversor necesita saber del JUEGO (solo lectura): catálogo de habilidades, datos de
// talentos, poderes y comportamientos registrados y vocabulario de claves (mods, parámetros, tv, stats).
// Dos fuentes:
//  · el juego VIVO (js/): import dinámico y try/catch, porque durante el Paso 2 los módulos cambian de forma;
//  · la FOTO del juego v1 (tools/convert-v2/juego-v1.json, de foto-v1.mjs): lo que había antes de la
//    conmutación de E1.5. La conversión (--draft y --write) parte de la foto, así sus salidas no cambian
//    cuando KA/KT reescriben js/; el vocabulario es la unión de los dos.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, PREFIJO } from './cargar.mjs';

const JS = join(ROOT, 'js');
export const FOTO_V1 = join(ROOT, 'tools', 'convert-v2', 'juego-v1.json');
const url = f => pathToFileURL(join(JS, f)).href;
async function importar(f) {
  if (!existsSync(join(JS, f))) return null;
  try { return await import(url(f)); } catch (e) { return { __error: e.message }; }
}

// ---------------------------------------------------------------- foto del juego v1
let fotoCache = null;
export function fotoV1(ruta = FOTO_V1) {
  if (ruta === FOTO_V1 && fotoCache) return fotoCache;
  if (!existsSync(ruta)) throw new Error(`no existe la foto del juego v1 (${ruta}): node tools/convert-v2/foto-v1.mjs --commit <sha>`);
  const j = JSON.parse(readFileSync(ruta, 'utf8'));
  if (ruta === FOTO_V1) fotoCache = j;
  return j;
}
const copia = v => JSON.parse(JSON.stringify(v));
// la clase tal como estaba en el juego v1, con la forma de juegoDeClase (cada llamada da objetos nuevos)
export function juegoV1(cls, foto = fotoV1()) {
  const c = foto.clases?.[cls];
  if (!c) throw new Error(`la foto del juego v1 no tiene la clase ${cls}`);
  const skills = copia(c.skills), talentSkills = copia(c.talentSkills);
  const catalogo = new Map();
  for (const s of [...skills, ...talentSkills]) if (!catalogo.has(s.id)) catalogo.set(s.id, s);
  const specs = new Map(copia(c.specs).map(s => [s.id, s]));
  return { talentsMod: null, skillsMod: null, talents: { v: 1, specs: [...specs.values()], skills: talentSkills }, skills, talentSkills,
    catalogo, specs, v: 1, catalogV: c.catalogV ?? null, errores: [], foto: foto._meta?.commit || true };
}

// { talentsMod, skillsMod, talents (objeto <CLASE>_TALENTS), skills (lista), talentSkills (lista),
//   catalogo: Map(id → def), specs: Map(id → spec), v (1 | 2), catalogV (número | null), errores }
export async function juegoDeClase(cls) {
  const P = PREFIJO[cls], errores = [];
  const talentsMod = await importar(`talents-${cls}.js`);
  const skillsMod = await importar(`skills-${cls}.js`);
  if (talentsMod?.__error) errores.push(`js/talents-${cls}.js no carga: ${talentsMod.__error}`);
  if (skillsMod?.__error) errores.push(`js/skills-${cls}.js no carga: ${skillsMod.__error}`);
  const talents = talentsMod?.[`${P}_TALENTS`] || null;
  const skills = skillsMod?.[`${P}_SKILLS`] || [];
  const talentSkills = talents?.skills || talentsMod?.[`${P}_TALENT_SKILLS`] || [];
  const catalogo = new Map();
  for (const s of [...skills, ...talentSkills]) if (s?.id && !catalogo.has(s.id)) catalogo.set(s.id, s);
  const specs = new Map((talents?.specs || []).map(s => [s.id, s]));
  return { talentsMod, skillsMod, talents, skills, talentSkills, catalogo, specs, v: talents?.v === 2 ? 2 : 1,
    catalogV: skillsMod?.[`${P}_CATALOG_V`] ?? null, errores };
}

// Lo que registra el juego VIVO hoy, con la clase que lo define (D28: ids únicos entre clases). Se lee del registro, no a mano:
// powers.js (POWER_HOOKS, SKILL_BEHAVIORS), field-entities.js (FIELD_DEFS) y spec-mechanics.js (indicadores). La clase sale de
// las funciones que alimentan cada registro: commonPowers/commonBehaviors, <clase>Powers/SkillBehaviors/Fields/Gauges
// (powers-<clase>.js), <clase>ForgePowers (powers-forge-<clase>.js) y <CLASE>_SKILL_BEHAVIORS (skills-<clase>.js).
// 'comun' = no es de ninguna clase: powers-common.js, los 9 indicadores base (y su poder gauge_<id>) y los campos que define
// field-entities.js. Lo que ninguna fuente reclama queda como '?' (informePoderes lo avisa).
// → { poderes, comportamientos, campos, indicadores: Map(id → 'maga'|'guerrero'|'arquera'|'comun'|'?'), error }
export async function registroJuego() {
  const poderes = new Map(), comportamientos = new Map(), campos = new Map(), indicadores = new Map();
  const errores = [];
  const leer = async (f, fn) => { try { await fn(await import(url(f))); } catch (e) { errores.push(`js/${f} no carga: ${e.message}`); } };
  await leer('powers.js', pw => {
    for (const id of Object.keys(pw.POWER_HOOKS || {})) poderes.set(id, '?');
    for (const id of Object.keys(pw.SKILL_BEHAVIORS || {})) comportamientos.set(id, '?');
  });
  await leer('field-entities.js', fe => { for (const kind of Object.keys(fe.FIELD_DEFS || {})) campos.set(kind, '?'); });
  let indicadoresBase = [];
  await leer('spec-mechanics.js', sm => { indicadoresBase = sm.BASE_GAUGE_IDS || []; for (const id of sm.gaugeIds?.() || []) indicadores.set(id, '?'); });
  // fábrica de un módulo → ids que registra (una fábrica que cambia de firma no tumba el conversor)
  const ids = (m, fn) => { try { return Object.keys(m?.[fn]?.() || {}); } catch { return []; } };
  const reclamar = (mapa, lista, cls) => { for (const id of lista) if (mapa.has(id)) mapa.set(id, cls); };
  const comun = await importar('powers-common.js');
  reclamar(poderes, ids(comun, 'commonPowers'), 'comun');
  reclamar(comportamientos, ids(comun, 'commonBehaviors'), 'comun');
  for (const cls of Object.keys(PREFIJO)) {
    const m = await importar(`powers-${cls}.js`), forja = await importar(`powers-forge-${cls}.js`), sk = await importar(`skills-${cls}.js`);
    reclamar(poderes, ids(m, `${cls}Powers`), cls);
    reclamar(poderes, ids(forja, `${cls}ForgePowers`), cls);
    reclamar(comportamientos, ids(m, `${cls}SkillBehaviors`), cls);
    reclamar(comportamientos, Object.keys(sk?.[`${PREFIJO[cls]}_SKILL_BEHAVIORS`] || {}), cls);
    reclamar(campos, ids(m, `${cls}Fields`), cls);
    reclamar(indicadores, ids(m, `${cls}Gauges`), cls);
  }
  // lo que sigue sin clase: los campos de field-entities.js y los indicadores base son 'comun'; cada indicador tiene su poder gauge_<id>
  for (const [k, v] of campos) if (v === '?') campos.set(k, 'comun');
  for (const id of indicadoresBase) if (indicadores.get(id) === '?') indicadores.set(id, 'comun');
  for (const [id, cls] of indicadores) if (cls !== '?') reclamar(poderes, [`gauge_${id}`], cls);
  return { poderes, comportamientos, campos, indicadores, error: errores.join(' · ') || null };
}

// vocabulario de claves que ya existen en el juego (vivo) o existían en el juego v1 (foto)
// → { mods:Set, params:Set (claves de las definiciones, también 'a.b'), tv:Set, stats:Set, tipos:Set (GENERIC_TYPES),
//     skillKeys:Set (SKILL_KEYS: claves que entiende el motor), retirados:Map (RETIRED_KEYS: alias → traducción) }
export async function vocabularioJuego({ foto = fotoV1() } = {}) {
  const mods = new Set(), params = new Set(), tv = new Set(), stats = new Set(), tipos = new Set(), skillKeys = new Set(), retirados = new Map();
  try {
    const sd = await import(url('skill-defs.js'));
    for (const k of Object.keys(sd.emptyMods?.() || {})) mods.add(k);
    for (const t of sd.GENERIC_TYPES || []) tipos.add(t);
    for (const k of sd.SKILL_KEYS || []) skillKeys.add(k);
    for (const [k, v] of Object.entries(sd.RETIRED_KEYS || {})) retirados.set(k, v);
    // claves tv del núcleo que se leen por TABLA (nucleo_tv): no aparecen como tv.x en el código
    for (const k of sd.NUCLEO_TV_KEYS || []) tv.add(k);
  } catch { /* sin skill-defs */ }
  const recorrer = (o, pre = '') => {
    for (const [k, v] of Object.entries(o || {})) {
      params.add(pre + k);
      if (v && typeof v === 'object' && !Array.isArray(v) && !pre) recorrer(v, k + '.');
    }
  };
  for (const cls of Object.keys(PREFIJO)) {
    const j = await juegoDeClase(cls);
    for (const s of j.catalogo.values()) recorrer(s);
    // claves tv y stats de los datos de talentos actuales (v1 o v2)
    const nodos = [...(j.talents?.cls?.nodes || []), ...(j.talents?.specs || []).flatMap(s => s.nodes || [])];
    for (const n of nodos) for (const fx of [n.fx, ...(n.opts || []).map(o => o.fx)]) {
      for (const k of Object.keys(fx?.tv || {})) tv.add(k);
      for (const k of Object.keys(fx?.stats || {})) stats.add(k);
    }
    for (const s of j.talents?.specs || []) for (const k of Object.keys(s.innate || {})) stats.add(k);
  }
  // lo que había en el juego v1: parámetros de sus definiciones (las activas v1 salen de js/ en E1.5) y claves de sus talentos
  for (const c of Object.values(foto?.clases || {})) {
    for (const s of [...(c.skills || []), ...(c.talentSkills || [])]) recorrer(s);
    for (const k of c.tv || []) tv.add(k);
    for (const k of c.stats || []) stats.add(k);
  }
  // claves tv que lee el CÓDIGO (tv.x). Los datos de talentos y héroe no cuentan: desde E1.5 llevan las
  // notas `todo` del mockup («tv.barrierDr · existe»…), que nombran claves que nadie lee todavía
  for (const f of readdirSync(JS).filter(f => f.endsWith('.js') && !/^(talents|hero)-(maga|guerrero|arquera)\.js$/.test(f))) {
    const txt = readFileSync(join(JS, f), 'utf8');
    for (const [, k] of txt.matchAll(/\btv\??\.([A-Za-z_]\w*)/g)) tv.add(k);
  }
  // stats del saco de recompute() (entities.js: const item = { … }) y atributos
  try {
    const txt = readFileSync(join(JS, 'entities.js'), 'utf8');
    const i = txt.indexOf('const item = {');
    if (i >= 0) { const bloque = txt.slice(i, txt.indexOf('};', i)); for (const [, k] of bloque.matchAll(/([A-Za-z_]\w*):\s*0/g)) stats.add(k); }
  } catch { /* sin entities */ }
  for (const k of ['fue', 'des', 'vit', 'ene', 'gaugeGain', 'gaugeLoss']) stats.add(k);
  return { mods, params, tv, stats, tipos, skillKeys, retirados };
}
