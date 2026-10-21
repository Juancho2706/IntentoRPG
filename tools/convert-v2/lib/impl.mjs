// Lectura de las notas `impl` (nodos y opciones) y `k` (forja) del mockup:
//  · ids de poder y de comportamiento (out/power-ids.json, D28),
//  · claves fuera del vocabulario §3.6 (out/claves-impl.md),
//  · estado de cada efecto (NUEVO · existe · vacío) para pendientes-<clase>.md.
// Son notas en texto libre: el análisis es heurístico y su salida es para revisión humana.
// Traducciones: tabla de §3.6 (ALIAS), tabla de W2 (../claves-w2.mjs) y vocabulario VIVO del juego
// (skill-defs: SKILL_KEYS y RETIRED_KEYS, que llegan en `voc`).
import { nodosMockup } from './cargar.mjs';
import { claveW2 } from '../claves-w2.mjs';

// ---------------------------------------------------------------- estado de una nota
export function estadoImpl(txt, { forja = false } = {}) {
  if (!txt || !String(txt).trim()) return 'vacío';
  if (forja) return /★/.test(txt) ? 'NUEVO' : 'existe';
  if (/\bNUEV[OA]S?\b/.test(txt)) return 'NUEVO';
  return 'existe';
}

// todas las notas de una clase: [{ en, texto, forja, nodo?, skill? }]
export function notasClase(C) {
  const out = [];
  for (const { n, arbol } of nodosMockup(C)) {
    if (n.t === 'c') for (const o of n.opts || []) out.push({ en: `${n.id}${o.k}`, arbol, texto: o.impl || '', forja: false, nodo: n, opt: o });
    else out.push({ en: n.id, arbol, texto: n.impl || '', forja: false, nodo: n });
  }
  for (const s of C.catalog || []) if (!s.talent) for (const v of ['M', 'A', 'B']) out.push({ en: `${s.id}.${v}`, arbol: 'forja', texto: s[v]?.k || '', forja: true, skill: s, v });
  return out;
}

// ---------------------------------------------------------------- ids de poder y de comportamiento
// → [{ id, tipo:'power'|'behavior', estado:'NUEVO'|'existe'|'ref', en, texto }]
export function extraerIds(C) {
  const out = [];
  for (const nota of notasClase(C)) {
    const txt = nota.texto;
    if (!txt) continue;
    const ms = [...txt.matchAll(/(★?)\b(power|behavior)\s+([a-z][a-z0-9_]*)/g)].map(m => ({ i: m.index, fin: m.index + m[0].length, id: m[3], tipo: m[2], estrella: !!m[1] }));
    for (const m of txt.matchAll(/\b(v_[a-z0-9_]+)/g)) if (!ms.some(x => x.id === m[1])) ms.push({ i: m.index, fin: m.index + m[0].length, id: m[1], tipo: 'power', estrella: false });
    ms.sort((a, b) => a.i - b.i);
    ms.forEach((m, k) => {
      const tras = txt.slice(m.fin, ms[k + 1]?.i ?? txt.length);
      let estado = /\bNUEV[OA]S?\b/.test(tras) ? 'NUEVO' : /\bexisten?\b/.test(tras) ? 'existe' : 'ref';
      if (nota.forja && m.estrella) estado = 'NUEVO';
      out.push({ id: m.id, tipo: m.tipo, estado, en: nota.en, texto: txt });
    });
  }
  return out;
}

// prefijos de poder por clase (test78 POWER_PREFIX / §3.1; la Arquera suma q_, w_ e y_ de sus árboles
// héroe, decisión 9 del orquestador); los de la forja son v_ (powers-forge-<clase>.js)
export const PREFIJOS_PODER = { maga: /^(m|p|k|a)_/, guerrero: /^g_/, arquera: /^(a|f|m|t|q|w|y)_/ };

// power-ids.json: ids por clase, choques entre clases (error), doble declaración en una clase (error) y avisos
export function informePoderes(porClase, registro) {
  const res = { ok: true, nota: '', clases: {}, choques: [], dobleDeclaracion: [], avisos: [] };
  const todas = new Map(); // id → Map(cls → usos)
  for (const [cls, ids] of Object.entries(porClase)) {
    const poderes = {}, comportamientos = {};
    for (const u of ids) {
      const dst = u.tipo === 'behavior' ? comportamientos : poderes;
      (dst[u.id] ||= { usos: [] }).usos.push({ en: u.en, estado: u.estado });
      const clave = `${u.tipo}:${u.id}`;
      if (!todas.has(clave)) todas.set(clave, new Map());
      const m = todas.get(clave); if (!m.has(cls)) m.set(cls, []); m.get(cls).push(u.en);
    }
    for (const [tipo, mapa, reg] of [['power', poderes, registro?.poderes], ['behavior', comportamientos, registro?.comportamientos]]) {
      for (const [id, d] of Object.entries(mapa)) {
        const enJuego = reg?.get(id) ?? null;
        d.juego = enJuego;                                          // clase que lo registra hoy (null = no existe)
        const decl = d.usos.filter(u => u.estado === 'NUEVO').map(u => u.en);
        d.estado = decl.length ? 'NUEVO' : d.usos.some(u => u.estado === 'existe') ? 'existe' : (enJuego ? 'existe' : 'NUEVO (sin marca)');
        if (new Set(decl).size > 1) res.dobleDeclaracion.push({ clase: cls, tipo, id, en: [...new Set(decl)] });
        if (enJuego && enJuego !== cls && enJuego !== '?' && d.estado.startsWith('NUEVO'))
          res.avisos.push(`${cls}: ${tipo} ${id} es NUEVO pero hoy lo registra ${enJuego === 'comun' ? 'powers-common.js' : `la clase ${enJuego}`}: choca si no se retira`);
        if (d.estado === 'existe' && !enJuego) res.avisos.push(`${cls}: ${tipo} ${id} se marca «existe» pero el juego no lo registra (${d.usos.map(u => u.en).join(', ')})`);
        if (tipo === 'power' && !/^v_/.test(id) && PREFIJOS_PODER[cls] && !PREFIJOS_PODER[cls].test(id) && d.estado.startsWith('NUEVO'))
          res.avisos.push(`${cls}: poder ${id} sin el prefijo de su clase (${PREFIJOS_PODER[cls]}): test78 lo rechazaría`);
      }
      // salida compacta: { estado, juego, en: ['c5A NUEVO', 'c9 ref'] }
      for (const [id, d] of Object.entries(mapa)) mapa[id] = { estado: d.estado, juego: d.juego, en: d.usos.map(u => `${u.en} ${u.estado}`) };
    }
    res.clases[cls] = { poderes, comportamientos };
  }
  for (const [clave, m] of todas) if (m.size > 1) {
    const [tipo, id] = clave.split(':');
    res.choques.push({ tipo, id, clases: Object.fromEntries([...m].map(([c, en]) => [c, en])) });
  }
  res.ok = !res.choques.length && !res.dobleDeclaracion.length;
  res.nota = 'D28: un id de poder o de comportamiento no puede repetirse entre clases (definePower lanza con un id repetido). ' +
    '«choques» y «dobleDeclaracion» hacen fallar el conversor; «avisos» son para revisar (prefijos de test78, ids que hoy registra otra clase).';
  return res;
}

// ---------------------------------------------------------------- claves de impl/k frente al vocabulario §3.6
const CANON = new Set(['windup', 'moveMul', 'channelT', 'ticks', 'hold', 'autoShot', 'drainPerSec', 'endless', 'charge', 'recast', 'steps', 'comboWin',
  'seq', 'stance', 'needPlanted', 'plant', 'mark', 'trap', 'detonate', 'wall', 'follow', 'pull', 'knock', 'drag', 'charges', 'killReset', 'shieldGain',
  'minHpPct', 'endHealPct', 'taunt', 'repeat', 'trail', 'at', 'fieldKind', 'pulse', 'type']);
// subclaves de cada objeto de verbo (§3.6 y skill-defs.VERB_DOC tras E1)
const CANON_SUB = {
  autoShot: ['every', 'coef', 'target', 'range'],
  charge: ['min', 'max', 'perfect', 'perfectPct', 'perfectCrit', 'scale', 'scale.coef', 'scale.radius', 'scale.range', 'moveMul', 'autoRelease', 'instant', 'perfectGauge', 'repeat',
    'full', 'full.count', 'full.spread', 'full.coefMul'],
  recast: ['n', 'win', 'cond', 'perfectLast', 'cdFrom', 'free', 'gap'],
  steps: ['type', 'coef', 'radius', 'angle', 'range', 'width', 'at', 'windup', 'dot', 'moveMul'],
  seq: ['every', 'extra', 'extra.count', 'extra.spread', 'extra.coef', 'extra.pierce'],
  stance: ['modes', 'dur', 'swapCd', 'swapGcd', 'endOnDodge', 'recastEnds'],
  mark: ['id', 'dur', 'uses', 'firstCharged', 'weakPct', 'count', 'radius', 'detonate', 'detonate.by', 'detonate.pct'],
  trap: ['armT', 'maxArmed', 'radius', 'root', 'burst', 'burst.radius', 'burst.coef', 'consume', 'lure', 'lure.radius', 'lure.eliteRadius', 'lure.boss', 'lure.speedMul'],
  detonate: ['radius', 'coef', 'chain', 'perTarget', 'consume'],
  wall: ['len', 'width', 'blocks', 'contain'],
  repeat: ['n', 'every', 'coef', 'needPlanted'],
  trail: ['field', 'dur', 'width', 'coef', 'heal'],
  pulse: ['every', 'radius', 'taunt', 'coef'],
  pull: ['dist', 'to'],
  wave: ['range', 'coef', 'width'],
  heal: ['pct', 'radius'],
  shield: ['pct', 'radius', 'dur'],
  lure: ['radius', 'eliteRadius', 'boss', 'speedMul', 'dur'],
};
// subclaves sueltas que solo pueden ser de un objeto canónico (p. ej. «armT .2» = trap.armT)
const SUB_SUELTA = { armT: 'trap', maxArmed: 'trap', burst: 'trap', consume: 'trap', lure: 'trap', perfect: 'charge', perfectCrit: 'charge',
  autoRelease: 'charge', perfectGauge: 'charge', perfectLast: 'recast', cdFrom: 'recast', endOnDodge: 'stance', recastEnds: 'stance',
  swapCd: 'stance', swapGcd: 'stance', firstCharged: 'mark', uses: 'mark', len: 'wall', contain: 'wall' };
const MODS_35 = new Set(['windupAdd', 'windupMul', 'moveMulAdd', 'moveMulMin', 'charges', 'recastAdd', 'recastWin', 'comboWin', 'chargeSpeed', 'perfectWin',
  'perfectEarly', 'perfectPct', 'zoneMax', 'pull', 'knock', 'killReset', 'shieldGain', 'dmgDirect', 'splashPct', 'repeatAdd']);
const MERGE_2F = new Set(['dmg', 'crit', 'radius', 'range', 'proj', 'pierce', 'chain', 'slow', 'slowPct', 'stun', 'root', 'rootAdd', 'vuln', 'dot', 'zone',
  'zoneDur', 'cdr', 'cost', 'gen', 'lifesteal', 'buff', 'dur', 'durS', 'execute', 'haste', 'cleanse', 'coldblood']);
const PARAMS_2F = new Set(['type', 'at', 'angle', 'count', 'spread', 'windup', 'impactDelay', 'cadence', 'pierce', 'unstoppable', 'allyRadius', 'weakenPct',
  'waves', 'shots', 'pulses', 'cleave', 'impacts', 'genOnHit', 'hitDot', 'hitDot.coef', 'speed', 'splash', 'coef', 'elem', 'tags', 'power', 'behavior']);
const GANCHOS = new Set(['condAdd', 'condCrit', 'condDr', 'onHit', 'onCast', 'afterCast', 'onKill', 'onDamaged', 'onLethal', 'onTick', 'modifyResolve', 'onGauge',
  'onResource', 'onAllyDamaged', 'onAllyLethal', 'onDotEnd', 'onSkillEnd', 'icd', 'procs', 'state', 'mult', 'priority', 'stats']);
const TIPOS_NUEVOS = new Set(['channel', 'combo', 'stance', 'wall', 'mark', 'trap']);
// tabla de alias de §3.6 (columna «Alias que desaparecen» y párrafo «Alias del mockup que se traducen»)
export const ALIAS = {
  windupMult: 'windupMul (mod, %)', windupMove: 'moveMul (preparación: 1 = como hoy, 0 = plantado)', moveFree: 'moveMul (moveFree:false → moveMul: 0)',
  moveWhileChannel: 'moveMul', moveSpd: 'moveMul', stopIf: 'endReason del canal / hold', onRelease: '⑭ onSkillEnd (end.reason = release)',
  chargeT: 'charge.max', minT: 'charge.min', coefAt: 'charge.scale.coef', perfectMul: 'perfectPct (×1,5 → 50, saco aditivo)',
  'tv.perfectMul': 'perfectPct (×1,5 → 50, saco aditivo)', perfectBonus: 'perfectPct', moveWhileCharging: 'charge.moveMul', chargeMul: 'chargeSpeed (%)',
  window: 'recast.win', 'recast.max': 'recast.n (mod recastAdd)', onChainEnd: "⑭ onSkillEnd (kind 'recast')", comboStep: 'cast.step · g.setComboStep(p, id, n)',
  'stance.a': 'stance.modes[0]', 'stance.b': 'stance.modes[1]', stanceBoth: 'g.setStanceBoth(p, id, dur)', markUses: 'mark.uses', perfectDmg: 'perfectPct',
  detonatePct: 'mod sobre mark.detonate.pct', perfectCdrAll: 'clave tv nueva de la cola W2 (la lee ③ afterCast con cast.perfect)',
  'tv.perfectCdrAll': 'clave tv nueva de la cola W2 (la lee ③ afterCast con cast.perfect)', aftershocks: 'repeat { n, every, coef, needPlanted } (mod repeatAdd)',
  'type:charge': 'clave charge (se combina con cualquier tipo de entrega)', 'type:wall': "type:'wall' + wall: { len, width, blocks, contain }",
  'follow:true': "follow: 'owner'", cds: 'charges · p.skCharges (D2)',
};
// propuestas (NO son de la tabla de §3.6: las decide el orquestador)
const PROPUESTA = { markDur: 'mark.dur', 'charge.coefMax': 'charge.scale.coef [aMin, aMax]', keepPlanted: 'needPlanted / plant', tauntDur: 'taunt (duración)',
  endHeal: 'endHealPct', crossRoot: 'trap.root / root', decoy: 'trap.lure', markCount: 'mark (varias marcas: comportamiento)', heal: 'g.heal (comportamiento o poder)',
  shield: 'g.shield (comportamiento o poder)', bounce: 'bounces (parámetro que ya existe)', dmg3: "mul { 'steps.2.coef' } (3.er paso del combo)" };

const STOP = new Set(['por', 'contra', 'en', 'de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'y', 'o', 'a', 'al', 'si', 'se', 'que', 'su', 'sus', 'un', 'una',
  'r', 's', 'x', 'tic', 'jefes', 'tensados', 'zona', 'distancia', 'enemigos', 'enemigo', 'antes', 'sobre', 'todas', 'menos', 'cada', 'como']);

function limpiar(txt) {
  let out = '', d = 0;
  for (const ch of String(txt)) {
    if (ch === '(') { d++; continue; }
    if (ch === ')') { d = Math.max(0, d - 1); continue; }
    if (!d) out += ch;
  }
  return out.replace(/[−–]/g, '-');
}
// trozos de primer nivel de «a:1, b:{c:2}» → ['a:1', 'b:{c:2}']
function trozos(txt) {
  const out = []; let d = 0, cur = '';
  for (const ch of txt) {
    if ('{['.includes(ch)) d++;
    if ('}]'.includes(ch)) d--;
    if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}
const esId = t => /^[A-Za-z][A-Za-z0-9]*(\.[A-Za-z][A-Za-z0-9]*)*$/.test(t);

// claves de un {…} de set/add/mul: [{ k, valor }]
function clavesLlaves(dentro, pre = '') {
  const out = [];
  for (const tr of trozos(dentro)) {
    const m = tr.match(/^([A-Za-z][\w.]*)(\[[^\]]*\])?\s*:\s*\*?\s*(.*)$/s);
    if (!m) { const k = tr.match(/^([A-Za-z][\w.]*)/)?.[1]; if (k) out.push({ k: pre + k, valor: '' }); continue; }
    const k = pre + m[1], valor = m[3].trim();
    out.push({ k, valor });
    // subclaves solo de un objeto canónico (pull:{to, dist} se revisa; las de una clave desconocida ya cuentan con su padre)
    if (/^\{.*\}$/s.test(valor) && CANON.has(m[1]) && m[1] !== 'steps') out.push(...clavesLlaves(valor.slice(1, -1), k + '.'));
  }
  return out;
}

// claves de una nota → [{ ns, k, valor?, crudo }]; ns ∈ mod | tv | stats | tuning | aura | campo
export function clavesDeNota(texto, { forja = false, catalogo = new Set() } = {}) {
  const out = [];
  const segs = limpiar(texto).split(/\s+·\s+|\s+\+\s+|;\s+/).map(s => s.trim().replace(/^★/, '').trim()).filter(Boolean);
  let ns = forja ? 'mod' : 'texto';
  const esSelector = t => t.startsWith('@') || catalogo.has(t) || /_/.test(t) || (t.includes('/') && t.split('/').some(x => catalogo.has(x) || /_/.test(x)));
  for (const s of segs) {
    if (/^(NUEV[OA]S?|existen?|claves?(\s+(existentes?|NUEV[OA]S?))?|clave del tipo \w+|opción|tv|absorbe\b.*)$/i.test(s)) continue;
    if (/^(power|behavior|activa|pasiva)\b/.test(s)) { ns = 'otro'; continue; }
    let m;
    if ((m = s.match(/^campo\s+([a-z][a-z0-9_]*)/))) { out.push({ ns: 'campo', k: m[1], crudo: s }); ns = 'otro'; continue; }
    if (/^mecánica\b/.test(s)) { ns = 'otro'; continue; }
    if ((m = s.match(/^tuning\s+(.+)$/))) { out.push({ ns: 'tuning', k: m[1].replace(/\s+[-+.\d,%]+.*$/, '').trim(), crudo: s }); ns = 'tuning'; continue; }
    if ((m = s.match(/^aura\b\s*(.*)$/))) { for (const t of m[1].split(/[\s:|]+/)) if (esId(t) && !STOP.has(t) && /[A-Z]/.test(t)) out.push({ ns: 'aura', k: t, crudo: s }); ns = 'aura'; continue; }
    if ((m = s.match(/^tv\.([A-Za-z]\w*)/))) { out.push({ ns: 'tv', k: m[1], crudo: s }); ns = 'tv'; continue; }
    if ((m = s.match(/^stats?[.\s]+([A-Za-z]\w*)/))) { out.push({ ns: 'stats', k: m[1], crudo: s }); ns = 'stats'; continue; }
    if ((m = s.match(/^(set|add|mul)\{(.*)\}$/s))) { for (const c of clavesLlaves(m[2])) out.push({ ns: 'mod', k: c.k, valor: c.valor, crudo: s }); ns = 'mod'; continue; }
    if ((m = s.match(/^elem\s+\w+/))) { ns = 'mod'; continue; }
    if ((m = s.match(/^buff\s+([A-Za-z]\w*)/))) { out.push({ ns: 'mod', k: 'buff', crudo: s }, { ns: 'stats', k: m[1], crudo: s }); ns = 'mod'; continue; }
    if ((m = s.match(/^mod\s+(.*)$/))) {
      const toks = m[1].split(/\s+/);
      let i = 0; while (i < toks.length && esSelector(toks[i])) i++;
      const k = toks[i];
      if (k) for (const kk of k.split('/')) if (esId(kk) && !STOP.has(kk)) out.push({ ns: 'mod', k: kk, crudo: s });
      ns = 'mod'; continue;
    }
    if (ns === 'texto' || ns === 'otro') continue;
    // segmento suelto: hereda el espacio de nombres del anterior (o «mod» en la forja)
    const k = s.split(/[\s{[]/)[0].replace(/:$/, '');
    if (!esId(k) || STOP.has(k)) continue;
    out.push({ ns: GANCHOS.has(k) ? 'gancho' : ns, k, crudo: s });
  }
  return out;
}

// clasifica una clave → { cat, clave, trad?, fuente?, donde?, prueba?, dueño? }
//   cat: 'canonica' (§3.5/§3.6 o SKILL_KEYS del juego) · 'w2' (canónica nueva de W2) · 'alias' (traducir a `trad`) ·
//        'existente' · 'sin' (SIN TRADUCCIÓN) · 'tv-clase' (<CLASE>_TV_KEYS, KT) · 'tv-cola' / 'cola' (petición a la cola W2) ·
//        'tv-nueva' / 'stats-nueva' (sin decidir) · 'tuning' · 'aura' · 'campo' · 'gancho'
export function clasificar(c, voc) {
  const { ns, k } = c;
  const w2 = claveW2(c);
  const deW2 = cat => ({ cat, clave: w2.clave, trad: w2.a, fuente: 'W2', donde: w2.donde, prueba: w2.prueba, dueño: w2.dueño });
  if (ns === 'tv') {
    if (w2) return deW2({ alias: 'alias', clase: 'tv-clase', cola: 'tv-cola' }[w2.tipo] || 'w2');
    if (ALIAS[`tv.${k}`]) return { cat: 'alias', clave: `tv.${k}`, trad: ALIAS[`tv.${k}`], fuente: '§3.6' };
    return voc.tv.has(k) ? { cat: 'existente', clave: `tv.${k}` } : { cat: 'tv-nueva', clave: `tv.${k}` };
  }
  if (ns === 'stats') {
    if (w2) return deW2({ alias: 'alias', cola: 'stats-cola' }[w2.tipo] || 'w2');
    return voc.stats.has(k) ? { cat: 'existente', clave: `stats.${k}` } : { cat: 'stats-nueva', clave: `stats.${k}` };
  }
  if (ns === 'gancho') return { cat: 'gancho', clave: k };
  if (ns === 'tuning') return { cat: 'tuning', clave: k };
  if (ns === 'aura') return { cat: 'aura', clave: k };
  if (ns === 'campo') return { cat: 'campo', clave: k };
  // mod / parámetros de la definición
  if (w2) return deW2({ alias: 'alias', cola: 'cola' }[w2.tipo] || 'w2');
  const v = String(c.valor || '').trim();
  if (k === 'type' && v) {
    if (ALIAS[`type:${v}`]) return { cat: 'alias', clave: `type:${v}`, trad: ALIAS[`type:${v}`], fuente: '§3.6' };
    return TIPOS_NUEVOS.has(v) || voc.tipos?.has(v) ? { cat: 'canonica', clave: `type:${v}` } : { cat: 'sin', clave: `type:${v}` };
  }
  if (k === 'follow' && v === 'true') return { cat: 'alias', clave: 'follow:true', trad: ALIAS['follow:true'], fuente: '§3.6' };
  if (ALIAS[k]) return { cat: 'alias', clave: k, trad: ALIAS[k], fuente: '§3.6' };
  const [base, ...resto] = k.split('.'), sub = resto.join('.');
  if (!sub && voc.retirados?.has(k)) return { cat: 'alias', clave: k, trad: voc.retirados.get(k), fuente: 'juego (RETIRED_KEYS)' };
  if (CANON.has(base) && (!sub || CANON_SUB[base]?.includes(sub))) return { cat: 'canonica', clave: k };
  if (!sub && MODS_35.has(k)) return { cat: 'canonica', clave: k };
  if (!sub && SUB_SUELTA[k]) return { cat: 'canonica', clave: `${SUB_SUELTA[k]}.${k}` };
  if (!sub && (MERGE_2F.has(k) || PARAMS_2F.has(k))) return { cat: 'existente', clave: k };
  if (voc.mods.has(k) || voc.params.has(k)) return { cat: 'existente', clave: k };
  if (voc.skillKeys?.has(base) && (!sub || CANON_SUB[base]?.includes(sub))) return { cat: 'canonica', clave: k, fuente: 'juego (SKILL_KEYS)' };
  if (GANCHOS.has(k)) return { cat: 'gancho', clave: k };
  return { cat: 'sin', clave: k, prop: PROPUESTA[k] || PROPUESTA[base] || null };
}

// traducciones de una nota (alias y decisiones de W2 que KA/KT deben aplicar): ['tv.drHighFury → tv.drHighMana', …]
export function traduccionesNota(texto, { forja = false, catalogo = new Set(), voc } = {}) {
  if (!texto || !voc) return [];
  const out = [];
  for (const c of clavesDeNota(texto, { forja, catalogo })) {
    const r = clasificar(c, voc);
    let t = null;
    if (r.cat === 'alias') t = `${r.clave} → ${r.trad}`;
    else if (r.cat === 'tv-clase') t = `${r.clave}: clave de la clase (${r.dueño}, <CLASE>_TV_KEYS)`;
    else if (r.cat === 'tv-cola' || r.cat === 'stats-cola' || r.cat === 'cola') t = `${r.clave}: pendiente de la cola W2 (${r.donde})`;
    else if (r.cat === 'sin' || r.cat === 'tv-nueva' || r.cat === 'stats-nueva') t = `${r.clave}: SIN DECIDIR`;
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

// ---------------------------------------------------------------- informes en Markdown
const lista = (xs, max = 8) => (xs.length > max ? `${xs.slice(0, max).join(', ')} … (+${xs.length - max})` : xs.join(', '));
const celda = s => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ');

export function informeClaves(porClase, voc, fuentes) {
  const grupos = {}; // cat → clave → { trad, prop, donde:Set, ejemplo }
  for (const [cls, { C }] of Object.entries(porClase)) {
    const catalogo = new Set((C.catalog || []).map(s => s.id));
    for (const nota of notasClase(C)) {
      if (!nota.texto) continue;
      for (const c of clavesDeNota(nota.texto, { forja: nota.forja, catalogo })) {
        const r = clasificar(c, voc);
        const g = (grupos[r.cat] ||= {});
        const e = (g[r.clave] ||= { ...r, vive: r.donde || null, donde: [], ejemplo: c.crudo });
        e.donde.push(`${cls}:${nota.en}`);
      }
    }
  }
  const filas = (cats, cols) => [].concat(cats).flatMap(cat => Object.entries(grupos[cat] || {}).map(([k, e]) => [k, e, cat]))
    .sort(([a], [b]) => a.localeCompare(b)).map(([k, e, cat]) => cols(k, e, cat));
  const n = (...cats) => cats.reduce((s, cat) => s + Object.keys(grupos[cat] || {}).length, 0);
  const DECISION = { w2: 'núcleo (W2, CORE_TV_KEYS)', 'tv-clase': 'de la clase', 'tv-cola': '**cola W2** (pendiente)', 'stats-cola': '**cola W2** (pendiente)',
    'tv-nueva': '**SIN DECIDIR**', 'stats-nueva': '**SIN DECIDIR**' };
  const que = e => celda([e.trad, e.vive].filter(Boolean).join(' · ') || '—');
  const md = [
    '# Claves de `impl` y `k` fuera del vocabulario de verbos (§3.6)',
    '',
    `> Generado por \`tools/convert-v2/convert.mjs\` (E0.4; tabla de W2 volcada en E1.5). Fuentes: ${fuentes.map(f => `${f.cls} (\`${f.rel}\`, sha1 ${f.hash}, «${f.estado}»)`).join(' · ')}.`,
    '> Las notas `impl`/`k` son texto libre: la lectura es heurística. Traducciones: tabla de alias de §3.6, tabla de W2 (`tools/convert-v2/claves-w2.mjs`,',
    '> de `docs/paso2-claves-w2.md`) y vocabulario vivo del juego (`skill-defs.js`: `SKILL_KEYS`, `RETIRED_KEYS`). «SIN TRADUCCIÓN» para al orquestador antes de E2.',
    '',
    `**Resumen:** ${n('alias')} alias con traducción · **${n('sin')} SIN TRADUCCIÓN** · ${n('w2')} canónicas nuevas de W2 · ` +
      `claves tv: ${n('tv-clase')} de clase, ${n('tv-cola')} para la cola W2, **${n('tv-nueva')} sin decidir** · stats: ${n('stats-cola')} para la cola W2, **${n('stats-nueva')} sin decidir** · ` +
      `${n('cola')} claves de definición para la cola W2 · ${n('tuning', 'aura')} ajustes de mecánica o aura · ${n('campo')} campos nombrados · ` +
      `${n('canonica')} canónicas de §3.5/§3.6 · ${n('existente')} que ya existen en el juego.`,
    '',
    '## 1. Alias del mockup → clave canónica',
    '',
    '| Clave del mockup | Traducción | Fuente | Dónde |', '|---|---|---|---|',
    ...filas('alias', (k, e) => `| \`${k}\` | ${celda(e.trad)} | ${e.fuente || '—'} | ${lista(e.donde)} |`),
    '',
    '## 2. SIN TRADUCCIÓN (ni en §3.6, ni en la tabla de W2, ni en el juego)',
    '',
    'La «propuesta» NO sale de la tabla de §3.6: es una sugerencia para la decisión del orquestador.',
    '',
    '| Clave | Propuesta | Dónde | Ejemplo |', '|---|---|---|---|',
    ...filas('sin', (k, e) => `| \`${k}\` | ${e.prop ? `propuesta: \`${celda(e.prop)}\`` : '—'} | ${lista(e.donde)} | ${celda(e.ejemplo)} |`),
    '',
    '## 3. Claves `tv` nuevas y su decisión',
    '',
    'Núcleo = la lee `condAddPct`, `nucleo_tv`, `resolveSkill`, `dotProfile`… (`CORE_TV_KEYS`). De la clase = la consume un poder o la mecánica de esa',
    'clase: KT la declara en `<CLASE>_TV_KEYS` (`talents-<clase>.js`). Cola W2 = el motor aún no la lee: petición antes de usarla.',
    '',
    '| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |', '|---|---|---|---|---|',
    ...filas(['tv-cola', 'tv-nueva', 'tv-clase'], (k, e, cat) => `| \`${k}\` | ${DECISION[cat]}${e.dueño ? ` (${e.dueño})` : ''} | ${que(e)} | ${e.prueba || '—'} | ${lista(e.donde)} |`),
    ...filas('w2', (k, e) => (k.startsWith('tv.') ? `| \`${k}\` | ${DECISION.w2} | ${que(e)} | ${e.prueba || '—'} | ${lista(e.donde)} |` : null)).filter(Boolean),
    '',
    '## 4. Stats nuevas (`recompute`) y su decisión',
    '',
    '| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |', '|---|---|---|---|---|',
    ...filas(['stats-cola', 'stats-nueva'], (k, e, cat) => `| \`${k}\` | ${DECISION[cat]} | ${que(e)} | ${e.prueba || '—'} | ${lista(e.donde)} |`),
    ...filas('w2', (k, e) => (k.startsWith('stats.') ? `| \`${k}\` | canónica (W2) | ${que(e)} | ${e.prueba || '—'} | ${lista(e.donde)} |` : null)).filter(Boolean),
    '',
    '## 4b. Claves de definición nuevas de W2 y peticiones a la cola W2',
    '',
    '| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |', '|---|---|---|---|---|',
    ...filas(['w2', 'cola'], (k, e, cat) => (k.startsWith('tv.') || k.startsWith('stats.') ? null
      : `| \`${k}\` | ${cat === 'cola' ? '**cola W2** (pendiente)' : 'canónica (W2)'} | ${que(e)} | ${e.prueba || '—'} | ${lista(e.donde)} |`)).filter(Boolean),
    '',
    '## 5. Ajustes de mecánica (`tuning`) y auras (KT · `mech-<clase>.js`)',
    '',
    '| Clave | Tipo | Dónde |', '|---|---|---|',
    ...filas('tuning', (k, e) => `| \`${k}\` | tuning | ${lista(e.donde)} |`),
    ...filas('aura', (k, e) => `| \`${k}\` | aura | ${lista(e.donde)} |`),
    '',
    '## 6. Campos nombrados en las notas (KA/KT: `defineField`)',
    '',
    ...filas('campo', (k, e) => `- \`${k}\` · ${lista(e.donde)}`),
    '',
    '## 7. Ganchos y claves de poder citados (no son claves de datos)',
    '',
    ...filas('gancho', (k, e) => `- \`${k}\` · ${lista(e.donde, 5)}`),
    '',
    '## 8. Claves canónicas (§3.5/§3.6) y existentes del juego (sin traducción necesaria)',
    '',
    `- Canónicas: ${Object.keys(grupos.canonica || {}).sort().map(k => `\`${k}\``).join(', ') || '—'}`,
    `- Existentes: ${Object.keys(grupos.existente || {}).sort().map(k => `\`${k}\``).join(', ') || '—'}`,
    '',
  ];
  return { md: md.join('\n'), sin: n('sin'), alias: n('alias'), sinDecidir: n('tv-nueva', 'stats-nueva'), cola: n('tv-cola', 'stats-cola', 'cola') };
}

// pendientes-<clase>.md: lista de trabajo de KA/KT (E2 termina cuando está vacía)
export function informePendientes({ cls, C, conv, fuente, poderes, voc = null }) {
  const notas = notasClase(C);
  const catalogo = new Set((C.catalog || []).map(s => s.id));
  const cuenta = { NUEVO: 0, existe: 0, 'vacío': 0 }, cuentaForja = { NUEVO: 0, existe: 0, 'vacío': 0 };
  for (const nt of notas) (nt.forja ? cuentaForja : cuenta)[estadoImpl(nt.texto, { forja: nt.forja })]++;
  const linea = nt => {
    const est = estadoImpl(nt.texto, { forja: nt.forja });
    const nombre = nt.opt ? `${nt.nodo.id}·${nt.opt.k} ${nt.opt.n}${nt.opt.act ? ` (concede ${nt.opt.act})` : ''}` : `${nt.nodo.id} ${nt.nodo.n}${nt.nodo.t === 'f' ? ' (final)' : nt.nodo.t === 'x' ? ' (ápice)' : nt.nodo.t === 'k' ? ' (clave, gratis)' : ''}`;
    const tr = traduccionesNota(nt.texto, { forja: nt.forja, catalogo, voc });
    return `- [ ] **${nombre}** — ${est}${nt.texto ? ` · \`${celda(nt.texto)}\`` : ''}${tr.length ? ` · traducir: ${tr.map(t => `\`${celda(t)}\``).join('; ')}` : ''}`;
  };
  const sec = (titulo, arbol) => {
    const xs = notas.filter(nt => !nt.forja && nt.arbol === arbol);
    return [`## ${titulo}`, '', ...(xs.length ? xs.map(linea) : ['_(árbol vacío en esta versión de los datos)_']), ''];
  };
  const out = [
    `# Pendientes · ${C.name} (E2: KA y KT)`,
    '',
    `> Generado por \`tools/convert-v2/convert.mjs --draft ${cls}\` desde \`${fuente.rel}\` (sha1 ${fuente.hash}, estado «${C.estado}»).`,
    '> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.',
    '> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).',
    '',
    `**Talentos:** ${cuenta.NUEVO} NUEVO · ${cuenta.existe} existe · ${cuenta['vacío']} vacío (nodos y opciones). **Forja:** ${cuentaForja.NUEVO} NUEVO · ${cuentaForja.existe} existe · ${cuentaForja['vacío']} vacío.`,
    '',
    ...sec('Árbol de clase (c1…c30)', 'cls'),
  ];
  for (const sp of C.specOrder || []) out.push(...sec(`${C.specs?.[sp]?.name || sp} (${conv.talents.specs.find(s => s.id === sp)?.prefix || '?'}0…28)`, sp));
  for (const h of C.tree?.hero || []) out.push(...sec(`Héroe · ${h.n} (${h.specs?.join(' · ')})`, h.id));
  out.push('## Activas de talento (ranura 2, sin forja)', '');
  for (const s of (C.catalog || []).filter(x => x.talent)) out.push(`- [ ] **${s.id}** ${s.n} · ${s.cat} · Nv${s.req} · concede ${s.grantBy}${s.hero ? ' (héroe)' : ''} — ${conv.talentSkills.find(t => t.id === s.id)?.todo || ''}`);
  out.push('', '## Kit (KA1): habilidades base y de especialización', '');
  for (const s of conv.skills) out.push(`- [ ] **${s.id}** ${s.name} · ${s.cat} · Nv${s.req}${s.spec ? ` · ${s.spec}` : ''} · ${s.elem}`);
  out.push('', '## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)', '');
  for (const s of (C.catalog || []).filter(x => !x.talent)) {
    out.push(`### ${s.id} · ${s.n}`, '');
    for (const nt of notas.filter(x => x.forja && x.skill.id === s.id)) {
      const parte = s[nt.v] || {}, largo = (parte.s || '').length;
      const marca = largo > 120 ? ` · ⚠ línea de ${largo} > 120 (A1)` : largo > 70 ? ` · línea de ${largo} > 70 (aviso A1: acortar o divergencias.json)` : '';
      const tr = traduccionesNota(nt.texto, { forja: true, catalogo, voc });
      out.push(`- [ ] **${nt.v === 'M' ? 'Mejora' : nt.v === 'A' ? `I (${parte.r})` : `II (${parte.r})`} · ${parte.n || '—'}** — ${estadoImpl(nt.texto, { forja: true })}${nt.texto ? ` · \`${celda(nt.texto)}\`` : ''}` +
        `${tr.length ? ` · traducir: ${tr.map(t => `\`${celda(t)}\``).join('; ')}` : ''}${marca}`);
    }
    out.push('');
  }
  const catIds = new Set((C.catalog || []).map(s => s.id));
  const fuera = [];
  for (const [sp, r] of Object.entries(C.reco || {})) for (const id of Object.keys(r)) if (!catIds.has(id)) fuera.push(`reco.${sp}.${id}`);
  for (const [sp, sb] of Object.entries(C.specBar || {})) {
    for (const [slot, id] of Object.entries(sb.bar || {})) if (id && !catIds.has(id)) fuera.push(`specBar.${sp}.bar.${slot} = ${id}`);
    for (const id of Object.keys(sb.forge || {})) if (!catIds.has(id)) fuera.push(`specBar.${sp}.forge.${id}`);
  }
  for (const [slot, id] of Object.entries(C.fallbackBar || {})) if (id && !catIds.has(id)) fuera.push(`fallbackBar.${slot} = ${id}`);
  out.push('## Barra y recomendaciones', '', fuera.length ? `Referencias a ids que no están en el catálogo 2g (KA: corregir o declarar): ${fuera.map(x => `\`${x}\``).join(', ')}.` : 'Todas las referencias de barra y recomendaciones están en el catálogo.', '');
  const omit = conv.ctx.grantsOmitidos;
  if (omit.length) out.push(`Activas que aún no existen en el juego (en \`--write\` su nodo queda sin \`grant\`): ${omit.join(' · ')}.`, '');
  const nuevas = (C.catalog || []).filter(s => s.talent && /NUEVA/.test(conv.talentSkills.find(t => t.id === s.id)?.todo || '')).map(s => s.id);
  if (nuevas.length) out.push(`Activas de talento NUEVAS (en \`--write\` no entran en \`${cls.toUpperCase()}_TALENT_SKILLS\` hasta que existan): ${nuevas.map(x => `\`${x}\``).join(', ')}.`, '');
  const v1Fuera = conv.ctx.activasV1Fuera || [];
  if (v1Fuera.length) out.push(`Activas de talento del juego actual que dejan de serlo en 2g (pasan al kit de \`skills-${cls}.js\` o se retiran; lista de cada doc): ${v1Fuera.map(x => `\`${x}\``).join(', ')}.`, '');
  if (poderes) {
    const dec = Object.entries(poderes.poderes || {}).filter(([, d]) => d.estado.startsWith('NUEVO')).map(([id]) => id);
    out.push('## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)', '', dec.length ? dec.map(id => `\`${id}\``).join(', ') : '—', '');
  }
  out.push('## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)', '');
  for (const sp of C.specOrder || []) {
    const m = C.mech?.[sp];
    if (!m) continue;
    out.push(`- **${sp} · ${m.n}** (${m.range || ''}) — generar: ${celda(m.gen)} · descargar: ${celda(m.out)} · pérdida: ${celda(m.loss)}${m.alt ? ` · \`${celda(m.alt)}\`` : ''}`);
  }
  out.push('');
  return out.join('\n');
}
