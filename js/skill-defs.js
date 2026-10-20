// ============================================================
// Vocabulario y utilidades del CATÁLOGO de habilidades (módulo PURO, sin imports)
// ============================================================
// Paso 2b.0 (docs/paso2-diseno.md §1, §3.0, §3.4, §4.3). Lo importan:
//  - js/skills-<clase>.js (catálogo por clase): los constructores de ramas;
//  - js/data.js: normaliza las definiciones y fusiona SKILL_MODS;
//  - js/skill-resolve.js: re-exporta CAT_SLOTS/TAGS y usa supportFits;
//  - js/save-schema.js: supportFits/defaultSlots en la migración v3.
// No importa NADA del juego para que ninguno de esos módulos forme ciclos.
//
// FORMATO DE UNA HABILIDAD (lo que escribe cada skills-<clase>.js):
//   { id, name, icon, desc,
//     cat:  'basic'|'spender'|'movement'|'defense'|'utility'|'spec'|'ultimate',
//     slots:['rmb','k2'],            // ranuras válidas; deben coincidir con defaultSlots()
//     tags: ['spender','proj','fire'],// vocabulario cerrado (TAGS); incluye cat y elem
//     elem: 'physical'|'fire'|'frost'|'arcane'|'holy'|'nature',
//     type: tipo genérico (GENERIC_TYPES) — o `behavior:'id'` (defineSkillBehavior)
//     req:  nivel en que se aprende sola (las de talento: 10)
//     coef: WD por objetivo y uso a rango 1 (0 = sin daño) · cost · cd · gen (básicos)
//     …parámetros del tipo (radius, range, speed, count, spread, pierce, slow, stun,
//       root, dur, buff:{stat:valor}, shieldPct, at:'self'|'target', angle, width…)
//     windup (s, cancelable con la esquiva, no cobra coste), impactDelay (s, daño
//       sincronizado con el VFX), lockT (s de bloqueo), int:true (interrumpible) }
// ============================================================

// ---------- categorías, ranuras y tags ----------
export const CATS = ['basic', 'spender', 'movement', 'defense', 'utility', 'spec', 'ultimate'];
export const SLOT_KEYS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
// ranuras por categoría (§1.1). La ranura k2 es FLEXIBLE: defensa, utilidad o gastadora.
export const CAT_SLOTS = Object.freeze({
  basic: ['lmb'],
  spender: ['rmb', 'k2'],
  movement: ['k1'],
  defense: ['k2'],
  utility: ['k2'],
  spec: ['k3'],
  ultimate: ['k4'],
});
// nivel en que se abre cada ranura (§1.1, informativo para la UI)
export const SLOT_UNLOCK = { lmb: 1, rmb: 2, k1: 4, k2: 6, k3: 10, k4: 15 };
// categorías que comparten el GCD de 0,2 s (§4.4): ni el básico ni la movilidad
export const GCD_CATS = new Set(['spender', 'defense', 'utility', 'spec', 'ultimate']);
// huecos de engarce de soporte por categoría (§4.3): básico 1, definitiva 1, resto 2
export function supportSockets(sk) {
  const c = sk?.cat;
  return c === 'basic' || c === 'ultimate' ? 1 : 2;
}

export const ELEMS = ['physical', 'fire', 'frost', 'arcane', 'holy', 'nature'];
export const TAGS = new Set([
  // categoría
  ...CATS,
  // entrega
  'melee', 'proj', 'area', 'cone', 'line', 'channel', 'aura', 'zone', 'trap', 'mark',
  'summon', 'shout', 'buff', 'shield', 'heal',
  // alcance · control · extra
  'ally', 'cc', 'taunt', 'interrupt', 'dot',
  // elemento
  ...ELEMS,
]);

// tipos genéricos que implementa js/game-skills.js (si la habilidad no declara `behavior`)
export const GENERIC_TYPES = ['weapon', 'melee', 'proj', 'area', 'cone', 'line', 'leap', 'dash',
  'blink', 'shield', 'taunt', 'zone', 'trap', 'mark', 'channel', 'buff'];

export const RANK_MAX = 5; // rango base máximo por nivel (§4.1); talentos/equipo suman encima

// Ranuras por defecto de una habilidad (§1.1 CAT_SLOTS, incl. especialización):
//  gastadora de especialización → rmb/k2/k3 · defensa/utilidad de especialización → k2/k3
export function defaultSlots(cat, tags = []) {
  const t = new Set(tags);
  if (cat === 'spec') {
    if (t.has('spender')) return ['rmb', 'k2', 'k3'];
    if (t.has('defense') || t.has('utility')) return ['k2', 'k3'];
    return ['k3'];
  }
  if (t.has('spec')) {
    if (cat === 'spender') return ['rmb', 'k2', 'k3'];
    if (cat === 'defense' || cat === 'utility') return ['k2', 'k3'];
  }
  return (CAT_SLOTS[cat] || []).slice();
}

// ranuras efectivas de una habilidad (las declaradas o las de su categoría)
export function skillSlots(sk) {
  if (!sk) return [];
  return Array.isArray(sk.slots) && sk.slots.length ? sk.slots : defaultSlots(sk.cat, sk.tags);
}

// tipo "kind" de compatibilidad con la UI previa al Paso 2d (barra/árbol)
function compatKind(def) {
  if (def.kind === 'talent') return 'talent';
  if (def.cat === 'basic') return 'basic';
  if (def.cat === 'ultimate') return 'ultimate';
  return 'core';
}

// Normaliza una definición del catálogo: tags ⊇ {cat, elem}, slots, kind (compat) y max.
export function normalizeSkillDef(def) {
  const tags = [...new Set([...(def.tags || []), def.cat, def.elem].filter(Boolean))];
  return {
    ...def,
    tags,
    slots: skillSlots({ ...def, tags }),
    kind: compatKind(def),
    max: RANK_MAX,
    coef: def.coef || 0,
    cost: def.cost || 0,
    cd: def.cd || 0,
  };
}

// Valida una definición (devuelve la lista de errores; [] = válida). Lo usan los
// tests de catálogo (test62 y los test-skills-<clase> de 2b.1).
export function validateSkillDef(def, { behaviors = null } = {}) {
  const err = [];
  const id = def?.id || '?';
  for (const k of ['id', 'name', 'icon', 'desc', 'cat', 'elem']) if (!def?.[k]) err.push(`${id}: falta ${k}`);
  if (!CATS.includes(def.cat)) err.push(`${id}: cat inválida ${def.cat}`);
  if (!ELEMS.includes(def.elem)) err.push(`${id}: elem inválido ${def.elem}`);
  if (typeof def.req !== 'number' || def.req < 1) err.push(`${id}: req debe ser un nivel ≥ 1`);
  for (const t of def.tags || []) if (!TAGS.has(t)) err.push(`${id}: tag fuera del vocabulario: ${t}`);
  if (!(def.tags || []).includes(def.cat)) err.push(`${id}: tags debe incluir su categoría ${def.cat}`);
  if (!(def.tags || []).includes(def.elem)) err.push(`${id}: tags debe incluir su elemento ${def.elem}`);
  const want = defaultSlots(def.cat, def.tags || []);
  const slots = def.slots || [];
  if (!slots.length || slots.some(s => !want.includes(s))) err.push(`${id}: slots ${JSON.stringify(slots)} no encaja con CAT_SLOTS ${JSON.stringify(want)}`);
  if (def.behavior) { if (behaviors && !behaviors[def.behavior]) err.push(`${id}: comportamiento sin registrar ${def.behavior}`); }
  else if (!GENERIC_TYPES.includes(def.type)) err.push(`${id}: type genérico desconocido ${def.type}`);
  for (const k of ['coef', 'cost', 'cd']) if (def[k] != null && !(typeof def[k] === 'number' && def[k] >= 0)) err.push(`${id}: ${k} debe ser un número ≥ 0`);
  if (def.cat === 'basic' && !(def.gen > 0)) err.push(`${id}: un básico debe generar recurso (gen)`);
  if (def.cat === 'basic' && (def.cost || 0) > 0) err.push(`${id}: un básico no cuesta recurso`);
  if (def.cat === 'ultimate' && (def.cost || 0) > 0) err.push(`${id}: una definitiva no cuesta recurso (solo enfriamiento)`);
  if (def.windup != null && !(def.windup >= 0 && def.windup <= 1.2)) err.push(`${id}: windup fuera de rango`);
  return err;
}

// ---------- soportes por tags (§4.3) ----------
// sup.requires: lista AND; cada elemento es un tag, varios tags con '|' (OR) o un
// pseudo-tag: '@dmg' (coef > 0), '@cost' (coste > 0), '@cd' (enfriamiento > 0).
// sup.forbids: si la habilidad tiene CUALQUIERA de esos tags, no es compatible.
function hasReq(sk, tags, token) {
  return token.split('|').some(t => {
    if (t === '@dmg') return (sk.coef || 0) > 0;
    if (t === '@cost') return (sk.cost || 0) > 0;
    if (t === '@cd') return (sk.cd || 0) > 0;
    return tags.has(t);
  });
}
export function supportFits(sup, sk) {
  if (!sup || !sk) return false;
  const tags = sk.tags instanceof Set ? sk.tags : new Set([...(sk.tags || []), sk.cat, sk.elem].filter(Boolean));
  for (const f of sup.forbids || []) if (tags.has(f)) return false;
  for (const r of sup.requires || []) if (!hasReq(sk, tags, r)) return false;
  return true;
}

// ---------- ramas (SKILL_MODS) ----------
// Vocabulario de efectos de una opción (se fusiona en resolveSkill):
//   dmg(+%) crit(+%) radius(+%) range(+%) proj(+n) pierce(bool) chain(n) slow(s) slowPct(%)
//   stun(s) root(s) vuln(s) dot('bleed|poison|burn') cdr(+% de CDR) cost(+% coste)
//   gen(+recurso) lifesteal(+% robo) buff(+% potencia) dur(+% duración) durS(+s)
//   execute(%) zone(1) zoneDur(+s) cdhit(n) echo(bool) coldblood(bool) haste(s) cleanse(bool)
//   critCdr(s por crítico)
const MOD_MAX = ['slow', 'vuln', 'stun', 'root', 'execute', 'chain', 'zone', 'cdhit', 'haste', 'slowPct'];
const MOD_BOOL = ['pierce', 'echo', 'coldblood', 'cleanse'];
export function emptyMods() {
  return { dmg: 0, proj: 0, pierce: false, radius: 0, range: 0, slow: 0, slowPct: 0, crit: 0, dot: null, buff: 0, dur: 0, durS: 0,
    cdr: 0, cost: 0, gen: 0, lifesteal: 0, vuln: 0, stun: 0, root: 0, execute: 0, chain: 0, zone: 0, zoneDur: 0,
    cdhit: 0, echo: false, coldblood: false, haste: 0, cleanse: false, critCdr: 0 };
}
// fusiona un objeto de efectos sobre `out` (mismas reglas que talents.mergeSkillMods)
export function mergeMods(out, add) {
  if (!add) return out;
  for (const [k, v] of Object.entries(add)) {
    if (k === 'id' || k === 'name' || k === 'desc') continue;
    if (MOD_BOOL.includes(k)) { if (v) out[k] = true; }
    else if (k === 'dot') { if (v && !out.dot) out.dot = v; }
    else if (MOD_MAX.includes(k)) out[k] = Math.max(out[k] || 0, v || 0);
    else if (typeof v === 'number') out[k] = (out[k] || 0) + v;
  }
  return out;
}
// agrega las OPCIONES elegidas (1 por rama). chosen = { ramaId: opcionId }
export function aggregateMods(branches, chosen) {
  const out = emptyMods();
  if (!branches || !chosen) return out;
  for (const br of branches) {
    const optId = chosen[br.id]; if (!optId) continue;
    const o = (br.opts || []).find(x => x.id === optId); if (!o) continue;
    mergeMods(out, o);
  }
  return out;
}

// Opciones de "Variante" reutilizables (creativas, con contrapartida); el
// constructor les pone id único por habilidad.
export const V_BLEED  = { name: 'Desangrar', desc: 'Aplica un sangrado intenso, pero −10% de daño directo.', dot: 'bleed', dmg: -10 };
export const V_BURN   = { name: 'Calcinar',  desc: 'Incendia al objetivo, pero −10% de daño directo.', dot: 'burn', dmg: -10 };
export const V_POISON = { name: 'Emponzoñar', desc: 'Envenena al objetivo, pero −10% de daño directo.', dot: 'poison', dmg: -10 };
export const V_VULN   = { name: 'Quebrantar', desc: 'Vuelve a los golpeados vulnerables 4s (+20% de daño recibido).', vuln: 4 };
export const V_STUN   = { name: 'Conmocionar', desc: 'Aturde 1.5s al golpear, pero −12% de daño.', stun: 1.5, dmg: -12 };
export const V_SLOW   = { name: 'Tullir', desc: 'Ralentiza 3s a los enemigos golpeados.', slow: 3 };
export const V_PIERCE = { name: 'Atravesar', desc: 'Atraviesa a todos los enemigos en línea.', pierce: true };
export const V_EXEC   = { name: 'Decapitar', desc: 'Ejecuta a enemigos (no jefes) por debajo del 18% de vida, pero −10% de daño.', execute: 18, dmg: -10 };
export const V_CHAIN  = { name: 'Rebote', desc: 'El golpe rebota a 2 enemigos cercanos.', chain: 2 };
// TRANSFORMACIONES: cambian EN GRANDE cómo funciona la habilidad (rama 3)
export const T_ZONE   = { name: 'Estela', desc: 'Deja una ZONA DE DAÑO durante 4s donde golpea.', zone: 1 };
export const T_CDHIT  = { name: 'Masacre', desc: 'Si golpea a 4+ enemigos, su enfriamiento se reduce a la MITAD.', cdhit: 4 };
export const T_ECHO   = { name: 'Eco', desc: 'Se ejecuta una 2ª vez (al 60% de daño) tras un instante.', echo: 1 };
export const T_GIANT  = { name: 'Coloso', desc: '+90% de radio y +40% de daño, pero +50% de enfriamiento.', radius: 90, dmg: 40, cdr: -50 };
export const T_NOVA   = { name: 'Onda', desc: '+30% de radio y aturde 1s a los golpeados.', radius: 30, stun: 1 };
// terceras opciones de la rama Ofensiva (con contrapartida)
export const O_RAD   = { name: 'Vorágine', desc: '+55% de radio, pero −15% de daño.', radius: 55, dmg: -15 };
export const O_PROJ  = { name: 'Doble', desc: '+1 proyectil, pero −15% de daño.', proj: 1, dmg: -15 };
export const O_PROJ2 = { name: 'Enjambre', desc: '+2 proyectiles, pero −25% de daño.', proj: 2, dmg: -25 };
export const O_BIG   = { name: 'Aplastar', desc: '+60% de daño, pero +30% de enfriamiento.', dmg: 60, cdr: -30 };

// constructor: ramas de una habilidad de DAÑO (Ofensiva / Ímpetu / Transformación)
export function dmgMods(id, third, v1, v2, v3) {
  return [
    { id: `${id}_o`, name: 'Ofensiva', opts: [
      { id: `${id}_o1`, name: 'Brutal', desc: '+45% de daño, pero +20% de enfriamiento.', dmg: 45, cdr: -20 },
      { id: `${id}_o2`, name: 'Quirúrgico', desc: '+30% de prob. crítica, pero −12% de daño base.', crit: 30, dmg: -12 },
      { id: `${id}_o3`, ...third },
    ] },
    { id: `${id}_f`, name: 'Ímpetu', opts: [
      { id: `${id}_f1`, name: 'Frenético', desc: '−30% de enfriamiento, pero −12% de daño.', cdr: 30, dmg: -12 },
      { id: `${id}_f2`, name: 'Sediento', desc: 'Roba un 14% del daño infligido como vida.', lifesteal: 14 },
      { id: `${id}_f3`, name: 'Furibundo', desc: 'Genera +16 de recurso al usarla.', gen: 16 },
    ] },
    { id: `${id}_v`, name: 'Transformación', opts: [
      { id: `${id}_v1`, ...v1 }, { id: `${id}_v2`, ...v2 }, { id: `${id}_v3`, ...v3 },
    ] },
  ];
}
// constructor: ramas de una habilidad de BUFF (Potencia / Duración / Recurso)
export function buffMods(id) {
  return [
    { id: `${id}_o`, name: 'Potencia', opts: [
      { id: `${id}_o1`, name: 'Reforzado', desc: '+35% de potencia, pero −20% de duración.', buff: 35, dur: -20 },
      { id: `${id}_o2`, name: 'Supremo', desc: '+60% de potencia, pero +25% de enfriamiento.', buff: 60, cdr: -25 },
      { id: `${id}_o3`, name: 'Equilibrado', desc: '+25% de potencia y +30% de duración.', buff: 25, dur: 30 },
    ] },
    { id: `${id}_d`, name: 'Duración', opts: [
      { id: `${id}_d1`, name: 'Duradero', desc: '+70% de duración.', dur: 70 },
      { id: `${id}_d2`, name: 'Eterno', desc: '+120% de duración, pero −15% de potencia.', dur: 120, buff: -15 },
      { id: `${id}_d3`, name: 'Sostenido', desc: '+40% de duración y −15% de enfriamiento.', dur: 40, cdr: 15 },
    ] },
    { id: `${id}_f`, name: 'Recurso', opts: [
      { id: `${id}_f1`, name: 'Rápido', desc: '−30% de enfriamiento, pero −15% de duración.', cdr: 30, dur: -15 },
      { id: `${id}_f2`, name: 'Iracundo', desc: 'Genera +22 de recurso al usarla.', gen: 22 },
      { id: `${id}_f3`, name: 'Eficiente', desc: '−15% de enfriamiento y +12 de recurso.', cdr: 15, gen: 12 },
    ] },
  ];
}
// constructor NUEVO (§3.4): movilidad y defensa — Potencia / Recarga / Variante
export function utilMods(id) {
  return [
    { id: `${id}_o`, name: 'Potencia', opts: [
      { id: `${id}_o1`, name: 'Reforzado', desc: '+35% de escudo, cura o distancia.', buff: 35, range: 35 },
      { id: `${id}_o2`, name: 'Amplio', desc: '+40% de radio de efecto.', radius: 40 },
      { id: `${id}_o3`, name: 'Persistente', desc: '+50% de duración.', dur: 50 },
    ] },
    { id: `${id}_r`, name: 'Recarga', opts: [
      { id: `${id}_r1`, name: 'Presto', desc: '−25% de enfriamiento.', cdr: 25 },
      { id: `${id}_r2`, name: 'Oportuno', desc: '−15% de enfriamiento y +10 de recurso al usarla.', cdr: 15, gen: 10 },
      { id: `${id}_r3`, name: 'Tenaz', desc: '−10% de enfriamiento y +20% de duración.', cdr: 10, dur: 20 },
    ] },
    { id: `${id}_v`, name: 'Variante', opts: [
      { id: `${id}_v1`, name: 'Estela', desc: 'Deja una ZONA DE DAÑO durante 4s donde termina.', zone: 1 },
      { id: `${id}_v2`, name: 'Impulso', desc: '+30% de velocidad de movimiento durante 3s al usarla.', haste: 3 },
      { id: `${id}_v3`, name: 'Purga', desc: 'Al usarla, te libra de ralentizaciones.', cleanse: true },
    ] },
  ];
}
