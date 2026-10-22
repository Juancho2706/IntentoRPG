#!/usr/bin/env node
// =====================================================================================================
// Conversor de talentos y catálogo v2 (Paso 2 · E0.4) · mockup (docs/mockups/data) → formato del juego
// -----------------------------------------------------------------------------------------------------
// CONGELADO (E5, C1): el conversor cumplió su papel en E1.5. NO regenerar js/talents-<clase>.js con --write: E2 ya los
// trabajó a mano (fx, textos, builds) y se perderían; tampoco emite ya el puente @deprecated <CLASE>_TALENT_SKILL_DEFS ni
// la línea `skills:` (borrados en C1, D29). --draft/--validate-game siguen valiendo como herramientas de consulta.
//
// Contrato: docs/paso2-implementacion.md §3.1 (talentos y héroe), §3.5 (catálogo y forja), §4 (este conversor),
// D18 (datos congelados), D28 (ids de poder únicos). Sin dependencias (Node ≥ 20).
//
//   node tools/convert-v2/convert.mjs --draft <clase>|--todas        borradores en tools/convert-v2/out/ (NO toca js/)
//   node tools/convert-v2/convert.mjs --write talents <clase>|--todas  SOLO E1.5: escribe js/talents-<clase>.js y
//                                                                    js/hero-<clase>.js (esqueleto; grant solo si la activa existe)
//   node tools/convert-v2/convert.mjs --validate-game <clase> [--from-draft] [--estructura] [--conservar]
//                                                                    pasa el validador del mockup a los datos del juego (o del borrador);
//                                                                    --conservar deja la carpeta temporal con lo que se validó
//   Opciones: --src <carpeta> (datos del mockup; por defecto docs/mockups/data) · --out <carpeta> (por defecto tools/convert-v2/out)
//             --dest <carpeta> (solo --write: escribe ahí en vez de js/, para probarlo) · --sin-avisos
//             --regenerar-pendientes (--draft: reescribe pendientes-<clase>.md aunque ya exista; ver abajo)
//
// Salida de --draft (en <out>/):
//   <clase>/talents-<clase>.js, <clase>/hero-<clase>.js   formato §3.1: estructura, textos, d(r), builds y defaultBuild exactos;
//                                                          fx: {} + todo = el `impl` del mockup
//   <clase>/skills-<clase>.draft.js                        catálogo, forja (k del mockup en comentario), SPEC_BAR (A/B → i/ii),
//                                                          FORGE_RECO, FALLBACK_BAR; la definición del juego v1 en comentario
//   <clase>/talent-text.js                                 reexporta js/talent-text.js (para importar el borrador desde out/)
//   <clase>/pendientes-<clase>.md                          lista de trabajo de KA/KT (NUEVO · existe · vacío). Solo se escribe si NO
//                                                          existe: desde E2 KA/KT lo editan a mano (marcan lo hecho y anotan peticiones)
//                                                          y regenerarlo borraría ese trabajo. --regenerar-pendientes lo pisa a conciencia
//   power-ids.json                                         ids de poder/comportamiento de las tres clases (FALLA si se repiten, D28) y,
//                                                          en `registrados`, los que ya registra el juego vivo (poderes, comportamientos,
//                                                          campos e indicadores, por clase); FALLA si un id NUEVO lo registra otra clase
//   claves-impl.md                                         claves de impl/k fuera de §3.6: alias → traducción o «SIN TRADUCCIÓN»
//   missing-icons.md                                       iconos citados que no están en assets/ (la UI pinta el marcador)
// Comprobaciones que hacen fallar (código 1): d(r) con identificadores libres que no exporta js/talent-text.js, d(r) que
// cambia de texto al copiarse, n1/pl distintos del mockup, choques de ids de poder (D28), claves SIN TRADUCCIÓN y la
// paridad del propio borrador.
// «El juego» de la conversión es la FOTO del juego v1 (tools/convert-v2/juego-v1.json, de foto-v1.mjs): activas de talento
// v1 (su definición va en comentario como referencia de KA1), catálogo base y especializaciones de antes de E1.5. Por eso
// --draft y --write dan lo mismo en cualquier commit del Paso 2 y --write se puede repetir. El vocabulario de claves es la
// foto ∪ el juego vivo, y los poderes registrados (power-ids.json) salen del juego vivo.
// =====================================================================================================
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { ROOT, MOCKUP_DIR, CLASES, PREFIJO, cargarMockup } from './lib/cargar.mjs';
import { convertirClase, verificarN1 } from './lib/transformar.mjs';
import { textoTalents, textoHero, textoSkillsDraft, textoShim } from './lib/emitir.mjs';
import { extraerIds, informePoderes, textoPowerIds, informeClaves, informePendientes, traduccionesNota } from './lib/impl.mjs';
import { juegoDeClase, juegoV1, fotoV1, registroJuego, vocabularioJuego } from './lib/juego.mjs';
import { compararClase } from './paridad.mjs';
import { claseMockupDesdeJuego, validarConMockup } from './lib/inverso.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const flag = f => argv.includes(f);
const valor = f => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
const SRC = valor('--src') ? resolve(valor('--src')) : MOCKUP_DIR;
const OUT = valor('--out') ? resolve(valor('--out')) : join(HERE, 'out');
const DEST = valor('--dest') ? resolve(valor('--dest')) : join(ROOT, 'js');   // --write: carpeta de destino (por defecto js/)
const relRoot = p => relative(ROOT, p).replace(/\\/g, '/') || '.';

async function helpersTexto() {
  const m = await import(pathToFileURL(join(ROOT, 'js', 'talent-text.js')).href);
  return Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === 'function'));
}

function clasesPedidas(opt) {
  if (flag('--todas')) return [...CLASES];
  const c = valor(opt);
  if (!c || !CLASES.includes(c)) throw new Error(`clase desconocida «${c}» (${CLASES.join(' | ')} o --todas)`);
  return [c];
}

const escribir = (ruta, txt) => { mkdirSync(dirname(ruta), { recursive: true }); writeFileSync(ruta, txt); };

async function importarFresco(ruta) { return import(`${pathToFileURL(ruta).href}?t=${Date.now()}${Math.random()}`); }

// paridad del borrador recién escrito (sin divergencias: el conversor debe ser exacto)
async function autoParidad(cls, C, TV2, archivos) {
  const P = PREFIJO[cls];
  const tm = await importarFresco(archivos.talents);
  const sm = archivos.skills ? await importarFresco(archivos.skills) : null;
  const cat = sm ? { skills: sm[`${P}_SKILLS`], talentSkills: tm[`${P}_TALENT_SKILLS`], forge: sm[`${P}_SKILL_FORGE`], specBar: sm[`${P}_SPEC_BAR`],
    forgeReco: sm[`${P}_FORGE_RECO`], fallbackBar: sm[`${P}_FALLBACK_BAR`] } : null;
  const R = compararClase({ cls, C, TV2, talents: tm[`${P}_TALENTS`], cat });
  return R.difs.map(d => `${cls} · paridad del borrador · ${d.ruta}: mockup ${JSON.stringify(d.mockup)?.slice(0, 120)} · borrador ${JSON.stringify(d.juego)?.slice(0, 120)}`);
}

async function draft({ escribirJs = false } = {}) {
  const pedidas = clasesPedidas(escribirJs ? '--write' : '--draft');
  const helpers = await helpersTexto();
  const errores = [], avisos = [];
  const cargados = {};
  for (const cls of CLASES) {
    const m = cargarMockup(cls, SRC);
    if (!m.C) { avisos.push(`${cls}: sin datos en ${relRoot(m.archivo)} (se salta)`); continue; }
    cargados[cls] = m;
  }
  const algun = Object.values(cargados)[0];
  if (!algun) throw new Error(`no hay datos de ninguna clase en ${SRC}`);
  errores.push(...verificarN1(algun.TV2, helpers));
  const iconos = [], resumen = [];
  const ids = {};
  for (const [cls, m] of Object.entries(cargados)) ids[cls] = extraerIds(m.C);
  const registro = await registroJuego();
  if (registro.error) avisos.push(registro.error);
  const poderes = informePoderes(ids, registro);
  // la conversión parte de la FOTO del juego v1 (tools/convert-v2/juego-v1.json): activas de talento v1, catálogo
  // base y especializaciones de antes de E1.5. Así --draft y --write dan lo mismo en cada commit del Paso 2
  // (aunque KA/KT reescriban js/) y --write se puede repetir. Vocabulario = foto v1 ∪ juego vivo
  const foto = fotoV1();
  const voc = await vocabularioJuego({ foto });

  for (const cls of pedidas) {
    const m = cargados[cls];
    if (!m) { errores.push(`${cls}: no hay datos del mockup en ${relRoot(SRC)}`); continue; }
    const juego = juegoV1(cls, foto);
    const catalogo = new Set((m.C.catalog || []).map(s => s.id));
    const traducir = texto => traduccionesNota(texto, { catalogo, voc });
    const conv = convertirClase({ cls, C: m.C, TV2: m.TV2, helpers, juego, grantSoloSiExiste: escribirJs, traducir });
    errores.push(...conv.ctx.errores);
    avisos.push(...conv.ctx.avisos);
    iconos.push(...conv.ctx.iconos.map(x => ({ cls, ...x })));
    const fuente = { rel: m.rel, hash: m.hash, estado: m.C.estado, modo: escribirJs ? '--write talents, E1.5' : '--draft' };
    const dir = escribirJs ? DEST : join(OUT, cls);
    const archivos = { talents: join(dir, `talents-${cls}.js`), hero: join(dir, `hero-${cls}.js`), skills: escribirJs ? null : join(dir, `skills-${cls}.draft.js`) };
    escribir(archivos.hero, textoHero({ cls, conv, helpers, fuente }));
    escribir(archivos.talents, textoTalents({ cls, conv, helpers, fuente, escribirJs }));
    if (!escribirJs) {
      escribir(archivos.skills, textoSkillsDraft({ cls, conv, fuente }));
      escribir(join(dir, 'talent-text.js'), textoShim(dir, join(ROOT, 'js')));
      const rutaPend = join(dir, `pendientes-${cls}.md`);
      if (existsSync(rutaPend) && !flag('--regenerar-pendientes')) avisos.push(`${relRoot(rutaPend)} ya existe y se edita a mano (KA/KT): no se regenera (--regenerar-pendientes lo pisa)`);
      else escribir(rutaPend, informePendientes({ cls, C: m.C, conv, fuente, poderes: poderes.clases[cls], voc }));
    } else {
      if (resolve(DEST) !== resolve(ROOT, 'js')) escribir(join(dir, 'talent-text.js'), textoShim(dir, join(ROOT, 'js')));
      const salen = conv.ctx.activasV1Fuera || [];
      if (salen.length) avisos.push(`${cls}: activas v1 que salen de js/talents-${cls}.js (pasan al kit de skills-${cls}.js con KA1 o se retiran): ${salen.join(', ')}`);
      if (conv.ctx.activasPendientes?.length) avisos.push(`${cls}: activas 2g que aún no existen (fuera de ${PREFIJO[cls]}_TALENT_SKILLS hasta KA1): ${conv.ctx.activasPendientes.join(', ')}`);
      if (conv.ctx.grantsOmitidos.length) avisos.push(`${cls}: nodos sin grant porque la activa aún no existe: ${conv.ctx.grantsOmitidos.join(' · ')}`);
    }
    try { errores.push(...await autoParidad(cls, m.C, m.TV2, archivos)); } catch (e) { errores.push(`${cls}: el borrador no se puede importar: ${e.stack || e.message}`); }
    const t = conv.talents;
    resumen.push(`${cls}: clase ${t.cls.nodes.length} · ${t.specs.map(s => `${s.id} ${s.nodes.length}`).join(' · ')} · héroe ${t.hero.map(h => `${h.id} ${h.nodes.length}`).join(' · ')} · ` +
      `builds ${Object.keys(t.builds).length} · catálogo ${conv.skills.length}+${conv.talentSkills.length} · forja ${Object.keys(conv.forge).length} → ${relRoot(dir)}`);
  }

  if (!escribirJs) {
    mkdirSync(OUT, { recursive: true });
    const fuentes = Object.entries(cargados).map(([cls, m]) => ({ cls, rel: m.rel, hash: m.hash, estado: m.C.estado }));
    writeFileSync(join(OUT, 'power-ids.json'), textoPowerIds({ generado: 'tools/convert-v2/convert.mjs --draft', fuentes }, poderes));
    const claves = informeClaves(Object.fromEntries(Object.entries(cargados).map(([cls, m]) => [cls, { C: m.C }])), voc, fuentes);
    writeFileSync(join(OUT, 'claves-impl.md'), claves.md);
    const mi = ['# Iconos citados que no están en assets/', '', `> Generado por \`tools/convert-v2/convert.mjs --draft\` (${pedidas.join(', ')}). La UI pinta el marcador (§3.12); encargo de arte para Codex (§7).`, ''];
    for (const cls of pedidas) {
      const porRuta = new Map();
      for (const x of iconos.filter(y => y.cls === cls)) porRuta.set(x.ruta, [...(porRuta.get(x.ruta) || []), x.donde]);
      mi.push(`## ${cls} (${porRuta.size})`, '', ...(porRuta.size ? [...porRuta].map(([ruta, donde]) => `- \`${ruta}\` · ${donde.join(', ')}`) : ['—']), '');
    }
    writeFileSync(join(OUT, 'missing-icons.md'), mi.join('\n'));
    const reg = poderes.registrados;
    resumen.push(`power-ids.json: ${poderes.ok ? 'sin choques' : `${poderes.choques.length} choques entre clases, ${poderes.dobleDeclaracion.length} dobles declaraciones y ${poderes.choquesRegistro.length} choques con el registro del juego`} · ${poderes.avisos.length} avisos` +
      (reg ? ` · registrados: ${Object.entries(reg).map(([t, pc]) => `${Object.values(pc).reduce((n, l) => n + l.length, 0)} ${t}`).join(', ')}` : ''));
    resumen.push(`claves-impl.md: ${claves.alias} alias con traducción · ${claves.sin} SIN TRADUCCIÓN · ${claves.sinDecidir} claves tv/stats sin decidir · ${claves.cola} peticiones a la cola W2`);
    if (claves.sin) errores.push(`claves-impl.md: ${claves.sin} claves SIN TRADUCCIÓN (añádelas a tools/convert-v2/claves-w2.mjs o pídelas a la cola W2)`);
    resumen.push(`missing-icons.md: ${new Set(iconos.map(x => `${x.cls}:${x.ruta}`)).size} iconos sin archivo`);
    for (const c of poderes.choques) errores.push(`D28: ${c.tipo} «${c.id}» en varias clases: ${Object.entries(c.clases).map(([k, v]) => `${k} (${v.join(', ')})`).join(' · ')}`);
    for (const c of poderes.dobleDeclaracion) errores.push(`D28: ${c.tipo} «${c.id}» declarado NUEVO en dos sitios de ${c.clase}: ${c.en.join(', ')}`);
    for (const c of poderes.choquesRegistro) errores.push(`D28: ${c.tipo} «${c.id}» es NUEVO en ${c.clase} (${c.en.join(', ')}) pero el juego ya lo registra en ${c.juego}`);
  }
  return { errores, avisos, resumen };
}

async function validarJuego() {
  const cls = valor('--validate-game');
  if (!CLASES.includes(cls)) throw new Error(`clase desconocida «${cls}»`);
  const m = cargarMockup(cls, SRC);
  if (!m.C) throw new Error(`sin datos del mockup para ${cls}`);
  const helpers = await helpersTexto();
  const P = PREFIJO[cls];
  let talents, cat = null;
  if (flag('--from-draft')) {
    const dir = join(OUT, cls);
    if (!existsSync(join(dir, `talents-${cls}.js`))) throw new Error(`no hay borrador en ${relRoot(dir)}: corre antes --draft ${cls}`);
    const tm = await importarFresco(join(dir, `talents-${cls}.js`)), sm = await importarFresco(join(dir, `skills-${cls}.draft.js`));
    talents = tm[`${P}_TALENTS`];
    cat = { skills: sm[`${P}_SKILLS`], talentSkills: tm[`${P}_TALENT_SKILLS`], forge: sm[`${P}_SKILL_FORGE`], specBar: sm[`${P}_SPEC_BAR`], forgeReco: sm[`${P}_FORGE_RECO`], fallbackBar: sm[`${P}_FALLBACK_BAR`] };
  } else {
    const j = await juegoDeClase(cls);
    if (j.v !== 2) throw new Error(`js/talents-${cls}.js sigue en v1: usa --from-draft para validar el borrador`);
    talents = j.talents;
    if (j.catalogV === 2) cat = { skills: j.skills, talentSkills: j.talentSkills, forge: j.skillsMod[`${P}_SKILL_FORGE`], specBar: j.skillsMod[`${P}_SPEC_BAR`], forgeReco: j.skillsMod[`${P}_FORGE_RECO`], fallbackBar: j.skillsMod[`${P}_FALLBACK_BAR`] };
  }
  const obj = claseMockupDesdeJuego({ C: m.C, talents, cat });
  const r = validarConMockup({ cls, obj, helpers, mockupDir: SRC, estructura: flag('--estructura'), conservar: flag('--conservar') });
  console.log(r.salida.trimEnd());
  console.log(`\n(validador del mockup sobre ${flag('--from-draft') ? 'el borrador' : 'los datos del juego'}${r.dir ? `; archivos en ${r.dir}` : ''})`);
  return r.status || 0;
}

try {
  let codigo = 0;
  if (flag('--validate-game')) codigo = await validarJuego();
  else if (flag('--draft') || (flag('--write') && valor('--write') === 'talents')) {
    const escribirJs = flag('--write');
    if (escribirJs && !flag('--todas')) argv.splice(argv.indexOf('--write') + 1, 1); // «--write talents <clase>»
    const { errores, avisos, resumen } = await draft({ escribirJs });
    console.log(`Conversor v2 · datos de ${relRoot(SRC)} · ${escribirJs ? `escribe en ${relRoot(DEST)} (E1.5)` : `borradores en ${relRoot(OUT)}`}`);
    for (const l of resumen) console.log('  · ' + l);
    if (!flag('--sin-avisos')) for (const a of avisos) console.log('  ⚠ ' + a);
    for (const e of errores) console.log('  ✗ ' + e);
    console.log(errores.length ? `\nFALLA: ${errores.length} errores` : '\nOK');
    codigo = errores.length ? 1 : 0;
  } else {
    console.log('uso: node tools/convert-v2/convert.mjs --draft <maga|guerrero|arquera>|--todas [--src <carpeta>] [--out <carpeta>] [--sin-avisos]\n' +
      '     node tools/convert-v2/convert.mjs --write talents <clase>|--todas      (solo E1.5)\n' +
      '     node tools/convert-v2/convert.mjs --validate-game <clase> [--from-draft] [--estructura]');
    codigo = 2;
  }
  process.exit(codigo);
} catch (e) {
  console.error('ERROR del conversor:', e.stack || e.message);
  process.exit(3);
}
