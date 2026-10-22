// ============================================================
// Vocabulario y utilidades del CATÁLOGO de habilidades (módulo PURO, sin imports)
// ============================================================
// Paso 2b.0 (docs/paso2-diseno.md §1, §3.0, §3.4, §4.3) y Paso 2 · 2f + 2g
// (docs/paso2-implementacion.md §3.5 forja, §3.6 verbos). Lo importan:
//  - js/skills-<clase>.js (catálogo y forja por clase);
//  - js/data.js: normaliza las definiciones;
//  - js/skill-resolve.js: forja de la definición, soportes y ranuras;
//  - js/save-schema.js: supportFits/defaultSlots en las migraciones.
// No importa NADA del juego para que ninguno de esos módulos forme ciclos.
//
// FORMATO DE UNA HABILIDAD (lo que escribe cada skills-<clase>.js):
//   { id, name, icon, desc, line,
//     cat:  'basic'|'spender'|'movement'|'defense'|'utility'|'spec'|'ultimate',
//     slots:['rmb','k2'],            // ranuras válidas; deben coincidir con defaultSlots()
//     tags: ['spender','proj','fire'],// vocabulario cerrado (TAGS); incluye cat y elem
//     elem: 'physical'|'fire'|'frost'|'arcane'|'holy'|'nature',
//     type: tipo genérico (GENERIC_TYPES) — o `behavior:'id'` (defineSkillBehavior)
//     req:  nivel en que se aprende sola · spec: '<specId>' (kit de especialización, D7)
//     coef: WD por objetivo y uso a rango 1 (0 = sin daño) · cost · cd · gen (básicos)
//     …parámetros del tipo (radius, range, speed, count, spread, pierce, slow, stun,
//       root, dur, buff:{stat:valor}, shieldPct, at:'self'|'target'|'enemy', angle, width…)
//     windup (s, cancelable con la esquiva, no cobra coste), impactDelay (s, daño
//       sincronizado con el VFX), lockT (s de bloqueo), int:true (interrumpible)
//     Paso 2b.2 (núcleo): cadence, gen, genOnHit, splash, hitDot, bossStun:false,
//       unstoppable / slowImmune, allyDr / projMissPct, resPerSec
//     Paso 2 (§3.6): claves de VERBO (charge, recast, seq, steps, stance, wall, trap,
//       mark, detonate, follow, pull/knock/drag, charges, repeat, trail, pulse…; ver
//       VERB_DOC abajo y docs/paso2-claves-w2.md) }
// ============================================================

// ---------- categorías, ranuras y tags ----------
export const CATS = ['basic', 'spender', 'movement', 'defense', 'utility', 'spec', 'ultimate'];
// D14: etiquetas VISIBLES por categoría (las claves internas no cambian; G15: la categoría se llama «Principal»)
export const CAT_LABELS = Object.freeze({
  basic: 'Básica', spender: 'Principal', movement: 'Movilidad', defense: 'Defensa',
  utility: 'Utilidad', spec: 'Insignia', ultimate: 'Definitiva',
});
export const SLOT_KEYS = ['lmb', 'rmb', 'k1', 'k2', 'k3', 'k4'];
// ranuras por categoría (§1.1). La ranura k2 es FLEXIBLE: defensa, utilidad o principal.
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
// tags de VERBO (§3.6): se DERIVAN de la definición (normalizeSkillDef); no se escriben a mano
export const VERB_TAGS = new Set(['charge', 'combo', 'recast', 'stance']);
export const TAGS = new Set([
  // categoría
  ...CATS,
  // entrega
  'melee', 'proj', 'area', 'cone', 'line', 'channel', 'aura', 'zone', 'trap', 'mark', 'wall',
  'summon', 'shout', 'buff', 'shield', 'heal',
  // alcance · control · extra
  'ally', 'cc', 'taunt', 'interrupt', 'dot',
  // verbo (derivados)
  ...VERB_TAGS,
  // elemento
  ...ELEMS,
]);

// tipos genéricos que implementa js/game-skills.js (si la habilidad no declara `behavior`)
export const GENERIC_TYPES = ['weapon', 'melee', 'proj', 'area', 'cone', 'line', 'leap', 'dash',
  'blink', 'shield', 'taunt', 'zone', 'trap', 'mark', 'channel', 'buff', 'aura',
  // Paso 2 (§3.6): combo de 3, postura y muro
  'combo', 'stance', 'wall'];
// tag de ENTREGA de cada tipo: al forjar un cambio de tipo, el viejo sale y entra el nuevo
export const TYPE_TAG = Object.freeze({
  melee: 'melee', proj: 'proj', area: 'area', cone: 'cone', line: 'line', channel: 'channel',
  zone: 'zone', trap: 'trap', mark: 'mark', aura: 'aura', buff: 'buff', shield: 'shield',
  taunt: 'taunt', wall: 'wall',
});

// Constantes de combate que los catálogos necesitan (este módulo no importa nada:
// combat-math define las mismas cifras y test62 vigila que coincidan).
export const COLDBLOOD_CRIT = 100;   // Sangre Fría: +100 de prob. crítica contra ralentizados

// Valores por defecto de los verbos (§3.6.1 y decisiones del orquestador, 4: ventana de
// 0,25 s). Son DATOS: una habilidad los cambia con sus claves y los talentos con sus mods.
export const VERB_DEFAULTS = Object.freeze({
  perfectWin: 0.25,     // ancho de la ventana perfecta si la carga no declara `perfect`
  chargeMin: 0.15,      // carga mínima (un toque suelta aquí)
  comboWin: 2.5,        // s sin pulsar que devuelven el combo al 1.er paso
  recastGap: 0.35,      // separación mínima entre relanzamientos (tecla mantenida)
  plantedAfter: 1,      // s sin caminar ni usar movilidad para estar PLANTADO (D20)
  echoCap: 3,           // repeticiones por lanzamiento original (Maga §12)
  dragWidth: 1.5,       // m a cada lado del camino que arrastra un avance con `drag`
  trapArmT: 0.5,        // s hasta que una trampa queda armada
  trapLife: 20,         // s de vida de una trampa armada sin `dur`
});

// Claves `tv` de talento que aplica el poder común `nucleo_tv` (js/powers-common.js): si el
// agregado de talentos trae alguna, recompute añade ese poder (usesCoreTv). FUENTE ÚNICA:
// talents.CORE_TV_KEYS las incluye y test78 exige que cada una se lea en un archivo común.
// Vive aquí (módulo sin imports) para que powers-common y talents.js la compartan sin ciclos.
export const NUCLEO_TV_KEYS = Object.freeze([
  'killHeal', 'manaOnKill', 'burnKillHeal', 'burnKillMana', 'bleedKillHeal', 'bleedKillMana',
  'executePct', 'critFireCdr', 'rootedWeak', 'drHighMana', 'drVsSlowed', 'drMoving', 'drFocus',
  // Paso 2 (docs/paso2-claves-w2.md §2; dartCritCdr = alias de basicCritCdr)
  'perfectCdrAll', 'critFrostCdr', 'critCdrAll', 'basicCritCdr', 'dartCritCdr', 'drLowHp', 'frozenKillHeal', 'frozenKillMana',
  // cola W2 (paso2-claves-w2.md §7): drStill (Quietud, condDr) y fieldDur (Ojo de Trampera)
  'drStill', 'fieldDur',
]);
// las de la lista que NO aplica nucleo_tv sino su punto natural: no activan el poder (usesCoreTv)
//   fieldDur → field-entities.spawnField (combat-math.fieldDurationWithTalents)
export const NUCLEO_TV_OUTSIDE = Object.freeze(['fieldDur']);

// Ángulo (rad, relativo a la mira) del proyectil i de n. Con abanico propio
// (sk.spread = semiapertura) se reparte en él. Sin él (1 proyectil + Multiproyectil,
// Doble, multidisparo) el PRIMERO va recto a la mira y los extras se alternan a
// ±0,18 rad: así el disparo apuntado acierta siempre a un objetivo pequeño (antes,
// con 2 proyectiles ninguno iba recto y ambos fallaban a 5 m a una rata).
export function projFanOffset(i, n, spread = 0) {
  if (n <= 1) return 0;
  if (spread > 0) return (i - (n - 1) / 2) * spread * 2 / (n - 1);
  return i === 0 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.18;
}

export const RANK_MAX = 5; // rango base máximo por nivel (§4.1); talentos/equipo suman encima

// Ranuras por defecto de una habilidad (§1.1 CAT_SLOTS, incl. especialización):
//  principal de especialización → rmb/k2/k3 · defensa/utilidad de especialización → k2/k3
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

// tags de verbo que corresponden a una definición
function verbTagsOf(def) {
  const out = [];
  if (def.charge) out.push('charge');
  if (def.recast) out.push('recast');
  if (def.type === 'combo') out.push('combo');
  if (def.type === 'stance' || def.stance) out.push('stance');
  return out;
}

// Normaliza una definición del catálogo: tags ⊇ {cat, elem} + los de verbo, slots, kind y max.
// `prev` (forja, §3.5): la definición anterior; si el elemento o el tipo cambian, QUITA el
// elemento viejo y el tag de entrega del tipo viejo (y pone el del nuevo).
export function normalizeSkillDef(def, prev = null) {
  let tags = (def.tags || []).filter(t => !VERB_TAGS.has(t));
  if (prev) {
    if (prev.elem && prev.elem !== def.elem) tags = tags.filter(t => t !== prev.elem);
    if (prev.type !== def.type) {
      const old = TYPE_TAG[prev.type], now = TYPE_TAG[def.type];
      if (old) tags = tags.filter(t => t !== old);
      if (now) tags.push(now);
    }
  }
  tags = [...new Set([...tags, ...verbTagsOf(def), def.cat, def.elem].filter(Boolean))];
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

// Chip de verbo del libro (D22): se DERIVA de la definición (forjada), sin campo a mano
export function skillVerbs(def) {
  if (!def) return [];
  const out = [];
  if (def.type === 'channel' && def.hold !== false) out.push('hold');
  if (def.charge) out.push('charge');
  if (def.recast) out.push('recast');
  if (def.type === 'combo') out.push('combo');
  if (def.seq) out.push('seq');
  if (def.type === 'stance') out.push('stance');
  if (def.type === 'trap' || def.trap) out.push('trap');
  if (def.detonate || def.mark?.detonate) out.push('detonate');
  if (def.needPlanted || def.plant || def.repeat?.needPlanted) out.push('planted');
  if (def.follow === 'owner' || def.follow === 'aim') out.push('follow');
  return out;
}

// ------------------------------------------------------------
// Vocabulario de VERBOS (§3.6) — lo valida validateSkillDef
// ------------------------------------------------------------
// claves de la definición que estos tipos/verbos entienden (documentación viva; la
// tabla completa con sus traducciones del mockup está en docs/paso2-claves-w2.md)
export const VERB_DOC = Object.freeze({
  windup: 'Preparación (s) · moveMul durante ella (1 = como hoy, 0 = quieto)',
  channel: 'channelT, ticks, hold: true|false|"toggle", moveMul, autoShot{every,coef,target,range}, drainPerSec, endless'
    + ' · S0: tickNow (1.er tic al empezar, t = 0; los `ticks` repartidos en channelT, el último al acabar)'
    + ' · drainCost (el coste NO se cobra al empezar: se drena por tic, cost/ticks; endless: cost por cada channelT s)'
    + ' · rampPerTic + rampMax (% que suma cada tic al coef del tic, desde el 2.º, con tope)'
    + ' · nonBlocking (el canal no bloquea el básico ni las demás ranuras: castLock 0)'
    + ' · beam: false | { width, core, color, coreColor, intensity, line } (haz vivo de la mano al objetivo; line: al final de la línea)'
    + ' · soltar (o cortar) antes del 1.er tic devuelve coste y enfriamiento y no dispara ③ afterCast',
  feel: 'shake (sacudida; se aplica en cualquier `at`, también cono, línea y self; con carga × (0,6 + 0,4·fracción)) · heavy: ms | { ms, minFrac } (congelado propio por golpe; en la definición o en un paso de combo; minFrac: solo con la carga ≥ esa fracción)',
  charge: 'charge{min (declarado > 0: soltar antes no dispara, cancela sin coste; sin declarar o 0, un toque dispara al mínimo),max,perfect:[a,b],perfectPct,perfectCrit,scale{coef,radius,range,rangeAdd (m que suma el tensado al básico de arma; mismo formato que coef)},moveMul,autoRelease,instant,repeat,perfectGauge,full{count,spread,coefMul},markMin (en la unidad de min/max/perfect; por debajo, la suelta no gasta marcas firstCharged)}',
  recast: 'recast{n (usos totales),win,cond:null|"hit",perfectLast,cdFrom:"first"|"end",free,gap}',
  combo: 'type:"combo" · steps[{type,coef,radius,angle,range,width,at,windup,dot,moveMul}] · comboWin',
  seq: 'seq{every,extra{count,spread,coef,pierce}}',
  stance: 'type:"stance" · stance{modes[{id,name,stats,moveMul,chargeSpeed,keepGauge,color}],dur,swapCd,swapGcd,endOnDodge,recastEnds}',
  planted: 'needPlanted · plant:true (dash/salto)',
  mark: 'mark{id,dur,uses,firstCharged,weakPct,count,radius,detonate{by,pct}}',
  trap: 'trap{armT,maxArmed,radius,root,burst{radius,coef},consume,lure{radius,eliteRadius,boss,speedMul}}',
  detonate: 'detonate{radius,coef (× rankCoef),chain,perTarget,consume} · un proyectil detona al impactar y al final de su alcance',
  wall: 'type:"wall" · wall{len,width,blocks:true|"all",contain}',
  follow: 'follow:"owner"|"aim"',
  displace: 'pull: m | {dist,to:"self"|"center"|"trap",radius (atracción por tic de un canal),boss:false (no atrae a los jefes: tic del canal y golpe)} · knock: m · drag:true · dragWidth (solo si la definición arrastra) · dashT',
  other: 'charges · killReset · shieldGain:[pct,máx] · buff.minHpPct / buff.endHealPct · taunt · repeat{n,every,coef,needPlanted} · trail{field,dur,width,coef,heal} · at:"ownField"+fieldKind (+fallbackRange) · pulse{every,radius,taunt,coef} · wave{range,coef,width} (no repite a los del impacto) · zonePct (Estela: % del arma por segundo) · heal{pct,radius} · shield{pct,radius,dur} · lure{radius,dur,…} · perTarget · chainPct · impacts+scatter · cdOnEnd · cdFloor',
});
// stats que una postura (o un buff con estado) aplica SIN recompute (§3.6: rendimiento)
export const STANCE_STATS = new Set(['dmgPct', 'dr', 'block', 'blockPower', 'crit', 'critDmg', 'projMissPct', 'dmgTakenPct', 'spdPct']);
// alias de los documentos que DESAPARECEN (§3.6): en un catálogo v2 son error
export const RETIRED_KEYS = Object.freeze({
  windupMult: 'windupMul (mod)', windupMove: 'moveMul', moveFree: 'moveMul', moveWhileChannel: 'moveMul',
  moveSpd: 'moveMul', stopIf: 'endless + g.extendChannel', onRelease: '⑭ onSkillEnd', chargeT: 'charge.max',
  minT: 'charge.min', coefAt: 'charge.scale.coef', perfectMul: 'charge.perfectPct', perfectBonus: 'charge.perfectPct / perfectGauge',
  moveWhileCharging: 'charge.moveMul', chargeMul: 'chargeSpeed (%)', onChainEnd: '⑭ onSkillEnd', comboStep: 'g.setComboStep',
  stanceBoth: 'g.setStanceBoth', markUses: 'mark.uses', aftershocks: 'repeat', window: 'recast.win',
  // claves del mockup sin traducción directa (decisión 11 del orquestador; tabla en docs/paso2-claves-w2.md)
  dmg3: 'mul { "steps.2.coef": × }', trapIn: 'contain (campo)', decoy: 'lure { radius, dur }', single: 'radius 0 / splash 0',
  vulnPct: 'mark.weakPct', markCount: 'mark.count', markRadius: 'mark.radius', markDur: 'mark.dur (o mod markDur)',
  tauntDur: 'taunt (+s)', bounce: 'bounces', length: 'wall.len', target: 'at: "enemy"',
});
// Claves de una definición que el MOTOR entiende (campos base, parámetros de los tipos
// genéricos y verbos de §3.6). En un catálogo v2, otra clave es un AVISO (errata como
// 'chrage'); las propias de un comportamiento se declaran en su `params`
// (defineSkillBehavior(id, { cast, params: ['reach'] })).
export const SKILL_KEYS = new Set([
  // base y catálogo
  'id', 'name', 'icon', 'desc', 'line', 'cat', 'slots', 'tags', 'elem', 'type', 'behavior', 'req', 'spec', 'kind', 'max',
  'art', 'innate', 'forged', // 2g: arte existente, innata por especialización y marca de la definición forjada
  'color', 'shake', 'size', 'beam', 'airT',
  // perfil de daño y de recurso
  'coef', 'cost', 'cd', 'gen', 'genMax', 'genOnHit', 'genPerExtra', 'cadence', 'critBonus', 'addPct', 'dmgDirect',
  'splash', 'hitDot', 'bossStun', 'stagger', 'chain', 'chainPct', 'perTarget', 'pierce', 'count', 'spread', 'speed',
  'range', 'radius', 'angle', 'width', 'at', 'cleave', 'cleaveR', 'resPerSec',
  // control, tiempos y buffs
  'slow', 'slowPct', 'stun', 'root', 'int', 'unstoppable', 'slowImmune', 'weakenPct', 'weakPct', 'taunt', 'dur', 'windup',
  'impactDelay', 'lockT', 'channelT', 'ticks', 'endless', 'hold', 'moveMul', 'autoShot', 'drainPerSec', 'buff',
  'shieldPct', 'allyDr', 'projMissPct', 'allyRadius', 'healPct', 'heal', 'shield', 'detonate',
  // verbos (§3.6) y claves resueltas (docs/paso2-claves-w2.md)
  'charge', 'recast', 'steps', 'comboWin', 'seq', 'stance', 'needPlanted', 'plant', 'keepPlanted', 'mark', 'trap',
  'wall', 'follow', 'contain', 'zoneMax', 'pull', 'knock', 'drag', 'dragWidth', 'dashT', 'charges', 'killReset',
  'shieldGain', 'repeat', 'trail', 'fieldKind', 'fallbackRange', 'pulse', 'wave', 'lure', 'impacts', 'scatter',
  'cdOnEnd', 'cdFloor',
  // cola W2d: daño por segundo de la Estela en % del arma
  'zonePct',
  // S0 (sensación): canal con tic inmediato, coste por drenaje, rampa y sin bloqueo; golpe pesado
  'tickNow', 'drainCost', 'rampPerTic', 'rampMax', 'nonBlocking', 'heavy',
]);
const HOLD_VALUES = new Set([true, false, 'toggle']);
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

// valida las claves de verbo de una definición (errores en `err`)
function validateVerbs(def, id, err) {
  if (def.moveMul != null && !(isNum(def.moveMul) && def.moveMul >= 0)) err.push(`${id}: moveMul debe ser ≥ 0`);
  if (def.type === 'channel' && def.hold != null && !HOLD_VALUES.has(def.hold)) err.push(`${id}: hold debe ser true, false o "toggle"`);
  if (def.autoShot && !(def.autoShot.every > 0)) err.push(`${id}: autoShot.every > 0`);
  if (def.drainPerSec != null && !(def.drainPerSec >= 0)) err.push(`${id}: drainPerSec ≥ 0`);
  // S0: claves del canal y del golpe pesado
  for (const k of ['tickNow', 'drainCost', 'nonBlocking']) if (def[k] != null && typeof def[k] !== 'boolean') err.push(`${id}: ${k} es true o false`);
  if ((def.tickNow || def.drainCost || def.nonBlocking || def.rampPerTic != null || def.rampMax != null) && def.type !== 'channel')
    err.push(`${id}: tickNow, drainCost, rampPerTic, rampMax y nonBlocking son de un canal (type "channel")`);
  if (def.tickNow && !(Math.round(def.ticks || 0) >= 2) && !def.endless) err.push(`${id}: tickNow necesita ticks ≥ 2 (el 1.º al empezar, el último al acabar)`);
  if (def.rampPerTic != null && !(isNum(def.rampPerTic) && def.rampPerTic > 0)) err.push(`${id}: rampPerTic > 0 (% por tic)`);
  if (def.rampMax != null && !(isNum(def.rampMax) && def.rampMax > 0)) err.push(`${id}: rampMax > 0 (% de tope)`);
  if ((def.rampPerTic != null) !== (def.rampMax != null)) err.push(`${id}: rampPerTic y rampMax van juntas`);
  const hv = def.heavy;
  if (hv != null && !(isNum(hv) ? hv > 0 && hv <= 250 : isPlain(hv) && hv.ms > 0 && hv.ms <= 250 && (hv.minFrac == null || (hv.minFrac >= 0 && hv.minFrac <= 1))))
    err.push(`${id}: heavy = ms (1–250) o { ms, minFrac ∈ [0, 1] }`);
  if (def.shake != null && !(isNum(def.shake) && def.shake >= 0 && def.shake <= 2)) err.push(`${id}: shake en [0, 2]`);
  const bm = def.beam;
  if (bm != null && typeof bm !== 'boolean' && !(isPlain(bm) && ['width', 'core', 'intensity', 'dur'].every(k => bm[k] == null || (isNum(bm[k]) && bm[k] >= 0))))
    err.push(`${id}: beam = true | false | { width, core, color, coreColor, intensity, dur, line }`);
  for (const [i, s] of (Array.isArray(def.steps) ? def.steps : []).entries()) {
    const sh = s?.heavy;
    if (sh != null && !(isNum(sh) ? sh > 0 && sh <= 250 : isPlain(sh) && sh.ms > 0 && sh.ms <= 250)) err.push(`${id}: steps.${i}.heavy = ms (1–250) o { ms, minFrac }`);
  }
  const c = def.charge;
  if (c) {
    if (!isPlain(c)) err.push(`${id}: charge debe ser un objeto`);
    else {
      if (!(c.max > 0)) err.push(`${id}: charge.max > 0`);
      const min = c.min ?? VERB_DEFAULTS.chargeMin;
      if (!(min >= 0 && min < c.max)) err.push(`${id}: charge.min en [0, max)`);
      if (c.perfect && !(Array.isArray(c.perfect) && c.perfect.length === 2 && c.perfect[0] < c.perfect[1] && c.perfect[1] <= c.max + 1e-9)) err.push(`${id}: charge.perfect = [desde, hasta] dentro de [0, max]`);
      for (const k of ['coef', 'rangeAdd']) {
        const sc = c.scale?.[k];
        if (sc != null && !(Array.isArray(sc) && sc.length >= 2 && (sc.every(isNum) || sc.every(x => Array.isArray(x) && x.length === 2 && x.every(isNum))))) err.push(`${id}: charge.scale.${k} = [aMin, aMax] o [[t, v], …]`);
      }
      if (c.full && !(c.full.count >= 1)) err.push(`${id}: charge.full.count ≥ 1`);
      if (c.markMin != null && !(c.markMin >= 0 && c.markMin <= c.max)) err.push(`${id}: charge.markMin en [0, max]`);
    }
  }
  const r = def.recast;
  if (r) {
    if (!(Number.isInteger(r.n) && r.n >= 2)) err.push(`${id}: recast.n = usos totales de la cadena (≥ 2)`);
    if (!(r.win > 0)) err.push(`${id}: recast.win > 0`);
    if (r.cond != null && r.cond !== 'hit') err.push(`${id}: recast.cond null o "hit"`);
    if (r.cdFrom != null && r.cdFrom !== 'first' && r.cdFrom !== 'end') err.push(`${id}: recast.cdFrom "first" o "end"`);
  }
  if (def.type === 'combo') {
    const st = def.steps;
    if (!(Array.isArray(st) && st.length >= 2 && st.length <= 5)) err.push(`${id}: un combo tiene de 2 a 5 pasos (steps)`);
    else for (const [i, s] of st.entries()) {
      if (!['melee', 'area', 'cone', 'line', 'proj'].includes(s?.type)) err.push(`${id}: steps.${i}.type debe ser melee|area|cone|line|proj`);
    }
  }
  if (def.seq && !(def.seq.every >= 2 && isPlain(def.seq.extra))) err.push(`${id}: seq = { every ≥ 2, extra: {…} }`);
  if (def.type === 'stance') {
    const m = def.stance?.modes;
    if (!(Array.isArray(m) && (m.length === 1 || m.length === 2) && m.every(x => x?.id))) err.push(`${id}: stance.modes = 1 o 2 modos con id`);
    else for (const x of m) for (const k of Object.keys(x.stats || {})) if (!STANCE_STATS.has(k)) err.push(`${id}: stat de postura no soportada ${k}`);
  }
  if (def.type === 'wall' && !(def.wall?.len > 0)) err.push(`${id}: wall.len > 0`);
  if (def.mark && !(def.mark.dur > 0)) err.push(`${id}: mark.dur > 0`);
  if (def.mark?.detonate && !(def.mark.detonate.pct > 0 && def.mark.detonate.by)) err.push(`${id}: mark.detonate = { by, pct > 0 }`);
  if (def.trap && !isPlain(def.trap)) err.push(`${id}: trap debe ser un objeto`);
  if (def.detonate && !(def.detonate.radius > 0)) err.push(`${id}: detonate.radius > 0`);
  if (def.follow != null && def.follow !== false && def.follow !== 'owner' && def.follow !== 'aim') err.push(`${id}: follow "owner", "aim" o false`);
  if (def.charges != null && !(Number.isInteger(def.charges) && def.charges >= 1)) err.push(`${id}: charges entero ≥ 1`);
  if (def.repeat && !(def.repeat.n >= 1 && def.repeat.every > 0)) err.push(`${id}: repeat = { n ≥ 1, every > 0, coef }`);
  if (def.pull != null && !(isNum(def.pull) ? def.pull > 0 : def.pull?.dist > 0)) err.push(`${id}: pull = m o { dist, to, radius, boss }`);
  if (isPlain(def.pull) && def.pull.radius != null && !(def.pull.radius > 0)) err.push(`${id}: pull.radius > 0`);
  if (def.zonePct != null && !(isNum(def.zonePct) && def.zonePct >= 0)) err.push(`${id}: zonePct ≥ 0 (% del arma por segundo)`);
  if (def.at === 'ownField' && !def.fieldKind) err.push(`${id}: at "ownField" necesita fieldKind`);
  if (def.pulse && !(def.pulse.every > 0)) err.push(`${id}: pulse.every > 0`);
  if (def.shieldGain && !(Array.isArray(def.shieldGain) && def.shieldGain.length === 2)) err.push(`${id}: shieldGain = [pct, máx]`);
}

// Valida una definición (devuelve la lista de errores; [] = válida). Lo usan los
// tests de catálogo (test62, test81 y los test-skills-<clase>).
// opts.v2 (catálogo 2g, CATALOG_V = 2): además, alias retirados son error, las activas
// de talento solo van a la ranura 2 (kind 'talent' ⇒ defensa o utilidad, slots ['k2']) y
// una clave fuera de SKILL_KEYS (ni en `params` de su comportamiento) es un AVISO: la lista
// va en `errs.warnings` (no enumerable) y, si se pasa, en opts.warnings.
export function validateSkillDef(def, { behaviors = null, v2 = false, warnings = null } = {}) {
  const err = [];
  const warn = [];
  Object.defineProperty(err, 'warnings', { value: warn, enumerable: false });
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
  if (def.behavior) {
    const b = behaviors?.[def.behavior];
    if (behaviors && !b) err.push(`${id}: comportamiento sin registrar ${def.behavior}`);
    // un comportamiento SIN cast (solo tick/end) convive con su tipo genérico (p. ej. channel)
    if (b && !b.cast && !GENERIC_TYPES.includes(def.type)) err.push(`${id}: el comportamiento ${def.behavior} no tiene cast y el type genérico ${def.type} no existe`);
  }
  else if (!GENERIC_TYPES.includes(def.type)) err.push(`${id}: type genérico desconocido ${def.type}`);
  for (const k of ['coef', 'cost', 'cd']) if (def[k] != null && !(typeof def[k] === 'number' && def[k] >= 0)) err.push(`${id}: ${k} debe ser un número ≥ 0`);
  if (def.cat === 'basic' && !(def.gen > 0)) err.push(`${id}: un básico debe generar recurso (gen)`);
  if (def.cat === 'basic' && (def.cost || 0) > 0) err.push(`${id}: un básico no cuesta recurso`);
  if (def.cat === 'ultimate' && (def.cost || 0) > 0) err.push(`${id}: una definitiva no cuesta recurso (solo enfriamiento)`);
  if (def.windup != null && !(def.windup >= 0 && def.windup <= 1.2)) err.push(`${id}: windup fuera de rango`);
  validateVerbs(def, id, err);
  if (v2) {
    for (const [k, to] of Object.entries(RETIRED_KEYS)) if (def[k] !== undefined) err.push(`${id}: clave retirada ${k} → ${to}`);
    if (def.type === 'field') err.push(`${id}: type "field" → type "zone"`);
    if (def.kind === 'talent') {
      if (def.cat !== 'defense' && def.cat !== 'utility') err.push(`${id}: una activa de talento es de defensa o utilidad`);
      if (!(slots.length === 1 && slots[0] === 'k2')) err.push(`${id}: una activa de talento solo va a la ranura 2 (slots ['k2'])`);
      if (def.spec) err.push(`${id}: una activa de talento no pertenece a un kit (spec)`);
    }
    const own = new Set(behaviors?.[def.behavior]?.params || []);
    for (const k of Object.keys(def || {})) {
      if (SKILL_KEYS.has(k) || own.has(k) || RETIRED_KEYS[k] !== undefined) continue;
      warn.push(`${id}: clave desconocida ${k}${def.behavior ? ` (si la lee ${def.behavior}, decláralo en su params)` : ''}`);
    }
  }
  if (Array.isArray(warnings)) warnings.push(...warn);
  return err;
}

// ---------- dependencias de FORMA de un nodo de talento (S0, T5) ----------
// Un nodo (o una opción A/B) que solo funciona con una forma concreta de una habilidad lo declara:
//   needsForm: { <skillId>: '<cond>' | ['<cond>', …] }   (todas las condiciones a la vez)
// y el libro avisa cuando la forja elegida (Mejora + variante) la incumple: «Quiebre no se canaliza:
// Grieta Eterna… no hacen nada». Condiciones sobre la definición FORJADA: channel · pierce · charge ·
// proj · area · detonate · chain · recast · trap · 'type:<tipo>' · 'tag:<tag>'; '!<cond>' la niega.
export const FORM_NEEDS = Object.freeze({
  channel: { test: d => d.type === 'channel', yes: 'se canaliza', no: 'no se canaliza' },
  pierce: { test: d => !!d.pierce, yes: 'atraviesa', no: 'no atraviesa' },
  charge: { test: d => !!d.charge, yes: 'se carga', no: 'no se carga' },
  proj: { test: d => d.type === 'proj' || (d.tags || []).includes('proj'), yes: 'es un proyectil', no: 'no es un proyectil' },
  area: { test: d => (d.tags || []).includes('area') || ['area', 'zone', 'cone'].includes(d.type), yes: 'es de área', no: 'no es de área' },
  detonate: { test: d => !!(d.detonate || d.mark?.detonate), yes: 'detona', no: 'no detona' },
  chain: { test: d => (d.chain || 0) > 0, yes: 'encadena', no: 'no encadena' },
  recast: { test: d => !!d.recast, yes: 'se relanza', no: 'no se relanza' },
  trap: { test: d => d.type === 'trap' || !!d.trap, yes: 'es una trampa', no: 'no es una trampa' },
});
// ¿la condición es del vocabulario? ('!x', 'type:x', 'tag:x' y las de FORM_NEEDS)
export function formNeedValid(cond) {
  if (typeof cond !== 'string' || !cond) return false;
  const c = cond[0] === '!' ? cond.slice(1) : cond;
  return !!FORM_NEEDS[c] || /^type:\w+$/.test(c) || /^tag:\w+$/.test(c);
}
// ¿cumple la definición (forjada) la condición? Desconocida = no se exige (true)
export function formNeedMet(def, cond) {
  if (!def || !formNeedValid(cond)) return true;
  const neg = cond[0] === '!';
  const c = neg ? cond.slice(1) : cond;
  let ok;
  if (c.startsWith('type:')) ok = def.type === c.slice(5);
  else if (c.startsWith('tag:')) ok = (def.tags || []).includes(c.slice(4));
  else ok = FORM_NEEDS[c].test(def);
  return neg ? !ok : ok;
}
// texto de lo que le falta a la forma: «no se canaliza», «atraviesa»…
export function formNeedText(cond) {
  if (!formNeedValid(cond)) return '';
  const neg = cond[0] === '!';
  const c = neg ? cond.slice(1) : cond;
  const f = FORM_NEEDS[c];
  if (f) return neg ? f.yes : f.no;
  return c.startsWith('type:') ? `${neg ? 'es' : 'no es'} de tipo ${c.slice(5)}` : `${neg ? 'tiene' : 'no tiene'} «${c.slice(4)}»`;
}

// ---------- soportes por tags (§4.3) ----------
// sup.requires: lista AND; cada elemento es un tag, varios tags con '|' (OR) o un
// pseudo-tag: '@dmg' (coef > 0), '@cost' (coste > 0), '@cd' (enfriamiento > 0).
// sup.forbids: si la habilidad tiene CUALQUIERA de esos tags, no es compatible.
// Paso 2 (§3.5): `sk` es la definición FORJADA (tags nuevos tras cambiar de forma o elemento)
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

// ------------------------------------------------------------
// MODS (perfil de resolveSkill): forja, talentos y soportes los fusionan con mergeMods
// ------------------------------------------------------------
// Vocabulario: dmg(+%) crit(+%) radius(+%) range(+%) proj(+n) pierce(bool) chain(n) slow(s)
//   slowPct(%) stun(s) root(s) vuln(s) dot('bleed|poison|burn') cdr(+%) cost(+%) gen lifesteal
//   buff(+%) dur(+%) durS(+s) execute(%) zone(1) zoneDur(s) cdhit(n) echo coldblood haste(s)
//   cleanse critCdr(s) rootAdd(+s) slowPctAdd(+%) — rootAdd/slowPctAdd SUMAN; root/slowPct = máx.
// Paso 2 (§3.5, §3.6): windupAdd(s) windupMul(%) moveMulAdd(puntos) moveMulMin(máx.) charges(+n)
//   recastAdd(+usos) recastWin(+s) comboWin(+s) chargeSpeed(%) perfectWin(+s) perfectEarly(s)
//   perfectPct(%) zoneMax(máx.) pull/knock(máx., m) killReset(bool) shieldGain([pct, máx])
//   dmgDirect(%) splashPct(%) repeatAdd(+n) keepPlanted(bool) markDur(+s) taunt(+s)
//   dragWidth(máx., m) zoneCoef(+coef/s) zoneHeal(+%/s) zonePct(+% del arma/s de la Estela)
// Toda clave numérica nueva SUMA salvo las de MOD_MAX / MOD_BOOL.
const MOD_MAX = ['slow', 'vuln', 'stun', 'root', 'execute', 'chain', 'zone', 'cdhit', 'haste', 'slowPct',
  'zoneMax', 'pull', 'knock', 'moveMulMin', 'dragWidth'];
const MOD_BOOL = ['pierce', 'echo', 'coldblood', 'cleanse', 'killReset', 'keepPlanted'];
export function emptyMods() {
  return { dmg: 0, proj: 0, pierce: false, radius: 0, range: 0, slow: 0, slowPct: 0, crit: 0, dot: null, buff: 0, dur: 0, durS: 0,
    cdr: 0, cost: 0, gen: 0, lifesteal: 0, vuln: 0, stun: 0, root: 0, execute: 0, chain: 0, zone: 0, zoneDur: 0,
    cdhit: 0, echo: false, coldblood: false, haste: 0, cleanse: false, critCdr: 0, rootAdd: 0, slowPctAdd: 0 };
}
// fusiona un objeto de efectos sobre `out` (mismas reglas que talents.mergeSkillMods)
export function mergeMods(out, add) {
  if (!add) return out;
  for (const [k, v] of Object.entries(add)) {
    if (k === 'id' || k === 'name' || k === 'desc') continue;
    if (MOD_BOOL.includes(k)) { if (v) out[k] = true; }
    else if (k === 'dot') { if (v && !out.dot) out.dot = v; }
    else if (k === 'shieldGain') { if (Array.isArray(v)) out.shieldGain = [(out.shieldGain?.[0] || 0) + (v[0] || 0), Math.max(out.shieldGain?.[1] || 0, v[1] || 0)]; }
    else if (MOD_MAX.includes(k)) out[k] = Math.max(out[k] || 0, v || 0);
    else if (typeof v === 'number') out[k] = (out[k] || 0) + v;
  }
  return out;
}

// ------------------------------------------------------------
// FORJA (2f §2.3 · plan §3.5): Mejora (Nv req+3) y dos Variantes (Nv req+6)
// ------------------------------------------------------------
// entry = { mejora: { name, icon, line, mod?, set?, add?, mul?, elem?, tags?, power? },
//           vars: [ { id:'<id>_i', name, role, icon, line, mod?, set?, add?, mul?, elem?,
//                     tags:{add,remove}?, power?:'v_<id>', behavior?:'v_<id>' }, { id:'<id>_ii', … } ] }
// set/add/mul: rutas con punto sobre la DEFINICIÓN ('charge.max', 'steps.2.coef',
//   'steps.*.coef'). set con un objeto sobre otro objeto lo FUSIONA (no lo pisa entero).
export const FORGE_ROLES = ['UNI', 'AREA', 'CTRL', 'AGU', 'APO', 'MOV'];
export const FORGE_LEVELS = Object.freeze({ mejora: 3, vars: 6 });
export const FORGE_LINE_MAX = 120;   // decisión 5 del orquestador
export const FORGE_LINE_WARN = 70;   // 2f §3.7: aviso
export function forgeLevels(sk) {
  const req = sk?.req || 1;
  return { mejora: req + FORGE_LEVELS.mejora, vars: req + FORGE_LEVELS.vars };
}
// variante por clave: 'i' | 'ii'
export function forgeVar(entry, key) {
  if (!entry?.vars || !key) return null;
  return key === 'i' ? entry.vars[0] || null : key === 'ii' ? entry.vars[1] || null : null;
}

// copia profunda de objetos planos y arrays (funciones, Sets y demás, por referencia)
export function cloneDef(v) {
  if (Array.isArray(v)) return v.map(cloneDef);
  if (isPlain(v)) { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = cloneDef(x); return o; }
  return v;
}
function applyAt(o, k, val, op) {
  const cur = o[k];
  if (op === 'add') o[k] = (Number(cur) || 0) + (Number(val) || 0);
  else if (op === 'mul') { if (cur != null) o[k] = (Number(cur) || 0) * (Number(val) || 0); }
  else if (isPlain(val) && isPlain(cur)) o[k] = { ...cur, ...cloneDef(val) };
  else o[k] = cloneDef(val);
}
// escribe en una ruta con punto ('a.b.2.c', '*' = todos los elementos); op 'set'|'add'|'mul'.
// `set` y `add` crean los contenedores que falten; `mul` solo toca valores existentes.
export function setPath(obj, path, val, op = 'set') {
  const keys = String(path).split('.').filter(k => k !== '');
  if (!keys.length || obj == null) return obj;
  const go = (o, i) => {
    if (o == null || typeof o !== 'object') return;
    const k = keys[i];
    const targets = k === '*' ? (Array.isArray(o) ? o.map((_, j) => j) : Object.keys(o))
      : [Array.isArray(o) && /^\d+$/.test(k) ? +k : k];
    for (const t of targets) {
      if (i === keys.length - 1) { applyAt(o, t, val, op); continue; }
      if (o[t] == null || typeof o[t] !== 'object') {
        if (op === 'mul' || keys[i + 1] === '*') continue;
        o[t] = /^\d+$/.test(keys[i + 1]) ? [] : {};
      }
      go(o[t], i + 1);
    }
  };
  go(obj, 0);
  return obj;
}
// aplica UNA pieza de forja (Mejora o variante) a una definición ya copiada
function applyForgePiece(def, piece) {
  for (const [p, v] of Object.entries(piece.set || {})) setPath(def, p, v, 'set');
  for (const [p, v] of Object.entries(piece.add || {})) setPath(def, p, v, 'add');
  for (const [p, v] of Object.entries(piece.mul || {})) setPath(def, p, v, 'mul');
  if (piece.elem) def.elem = piece.elem;
  if (piece.tags) {
    const rm = new Set(piece.tags.remove || []);
    def.tags = [...new Set([...(def.tags || []).filter(t => !rm.has(t)), ...(piece.tags.add || [])])];
  }
  if (piece.behavior) def.behavior = piece.behavior;
}
// Forja de la DEFINICIÓN (§3.5): devuelve una definición nueva (normalizada, con tags
// recalculados) o la MISMA si no hay nada que forjar. state = { mejora:bool, variant:'i'|'ii'|null }
export function forgeDef(sk, entry, { mejora = false, variant = null } = {}) {
  if (!sk || !entry) return sk;
  const pieces = [];
  if (mejora && entry.mejora) pieces.push(entry.mejora);
  const v = forgeVar(entry, variant);
  if (v) pieces.push(v);
  if (!pieces.length) return sk;
  const def = cloneDef(sk);
  for (const piece of pieces) applyForgePiece(def, piece);
  const out = normalizeSkillDef(def, sk);
  out.forged = { mejora: !!(mejora && entry.mejora), variant: v ? variant : null, varId: v?.id || null };
  return out;
}
// mods de la forja (Mejora + variante) para resolveSkill
export function forgeMods(entry, { mejora = false, variant = null } = {}) {
  const out = emptyMods();
  if (!entry) return out;
  if (mejora && entry.mejora?.mod) mergeMods(out, entry.mejora.mod);
  const v = forgeVar(entry, variant);
  if (v?.mod) mergeMods(out, v.mod);
  return out;
}
// poderes que declara la forja activa (los suma Player.recompute a p.powers)
export function forgePowers(entry, { mejora = false, variant = null } = {}) {
  const out = [];
  if (!entry) return out;
  if (mejora && entry.mejora?.power) out.push(entry.mejora.power);
  const v = forgeVar(entry, variant);
  if (v?.power) out.push(v.power);
  return out;
}
// Valida una entrada de forja: ids estables, papel, líneas (≤ 120; aviso > 70) y que el
// poder o comportamiento esté registrado (registros opcionales). → { errors, warnings }
export function validateForge(entry, sk, { powers = null, behaviors = null } = {}) {
  const errors = [], warnings = [];
  const id = sk?.id || '?';
  if (!entry || typeof entry !== 'object') return { errors: [`${id}: forja vacía`], warnings };
  const line = (piece, tag) => {
    if (!piece.name) errors.push(`${tag}: falta name`);
    const l = piece.line || '';
    if (!l) errors.push(`${tag}: falta line`);
    else if (l.length > FORGE_LINE_MAX) errors.push(`${tag}: line de ${l.length} caracteres (máx. ${FORGE_LINE_MAX})`);
    else if (l.length > FORGE_LINE_WARN) warnings.push(`${tag}: line de ${l.length} caracteres (> ${FORGE_LINE_WARN})`);
  };
  const regs = (piece, tag) => {
    if (piece.power && powers && !powers[piece.power]) errors.push(`${tag}: poder sin registrar ${piece.power}`);
    if (piece.behavior && behaviors && !behaviors[piece.behavior]) errors.push(`${tag}: comportamiento sin registrar ${piece.behavior}`);
    if (piece.elem && !ELEMS.includes(piece.elem)) errors.push(`${tag}: elem inválido ${piece.elem}`);
    for (const t of piece.tags?.add || []) if (!TAGS.has(t)) errors.push(`${tag}: tag fuera del vocabulario ${t}`);
    for (const op of ['add', 'mul']) for (const [p, v] of Object.entries(piece[op] || {})) if (!isNum(v)) errors.push(`${tag}: ${op}.${p} debe ser un número`);
  };
  if (entry.mejora) {
    const m = entry.mejora, tag = `${id}·Mejora`;
    if (m.id && m.id !== `${id}_m`) errors.push(`${tag}: id ${m.id} (esperado ${id}_m)`);
    line(m, tag); regs(m, tag);
  } else errors.push(`${id}: falta la Mejora`);
  const vars = entry.vars;
  if (!Array.isArray(vars) || vars.length !== 2) errors.push(`${id}: la forja trae 2 variantes`);
  else {
    vars.forEach((v, i) => {
      const want = `${id}_${i ? 'ii' : 'i'}`, tag = `${id}·${i ? 'II' : 'I'}`;
      if (v.id !== want) errors.push(`${tag}: id ${v.id} (esperado ${want})`);
      if (!FORGE_ROLES.includes(v.role)) errors.push(`${tag}: papel inválido ${v.role}`);
      line(v, tag); regs(v, tag);
    });
    if (vars[0]?.role && vars[0].role === vars[1]?.role) errors.push(`${id}: las dos variantes tienen el mismo papel (${vars[0].role})`);
  }
  return { errors, warnings };
}
