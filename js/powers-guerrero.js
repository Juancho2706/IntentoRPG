// ============================================================
// PODERES del GUERRERO (Berserker · Guardián · Cruzado) — Paso 2g
// ============================================================
// Dueño: KT-guerrero (docs/paso2-implementacion.md §2 E2; diseño en docs/paso2g-guerrero.md).
// js/powers.js importa y registra al cargar los cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-guerrero.js forman un ciclo de
// módulos y una función declarada se puede llamar aunque este módulo aún no se haya evaluado. Los
// helpers son declaraciones de función (o const usadas solo dentro de ganchos); los valores de
// diseño viven en tun() (función, no constante de módulo).
//
//  guerreroPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js).
//                        `mult` SOLO en los nodos clave ya registrados (m_berserk, en b0).
//  guerreroSkillBehaviors() { skillId: { cast?(g,p,prof,cast), … } } → defineSkillBehavior: el
//                        `behavior` de Segundo Aliento e Intervención (las demás activas del
//                        catálogo tienen el suyo en js/skills-guerrero.js).
//  guerreroFields()          { kind: FieldDef } → defineField (el Pendón del Caudillo).
//  guerreroGauges()          {} (Sed, Bastión y Fervor viven en js/mech-guerrero.js).
//
// REGLAS: nada importado en el nivel superior del módulo (solo dentro de los ganchos). Nada de
// `powers.has(` fuera de js/powers*.js (aquí, hasPower(p, id)), ni setTimeout (g.timers.schedule),
// ni Math.random en la simulación. Daño de un poder: dealProcDamage(g, e, n, { source }). Control:
// e.applyCC(kind, dur, { src: p }). Curas: p.sustain (golpe/muerte) o g.heal / g.shield. Recargas:
// SOLO g.reduceCooldown, y aquí siempre por cutCd (suelos de la clase). Aliados: g.allies(pos, r);
// su daño entra por g.damageAlly (⑫).
//
// ------------------------------------------------------------
// PASO 2g (docs/paso2g-guerrero.md §6, §7, §9, §11.3)
// ------------------------------------------------------------
// · Cada nodo lleva SU poder (`g_*` de clase, `g_b_*` Berserker, `g_d_*` Guardián, `g_z_*` Cruzado,
//   `g_ti_*`, `g_gl_*`, `g_cau_*` héroe) o claves tv/stats/mod. Los de varios rangos leen el suyo
//   con rankOf (= talents.powerRank). Las claves tv propias (GUERRERO_TV_KEYS) las lee el poder
//   de su mecánica (Golpe de Titán, Rival, Pendón).
// · Furia GASTADA (Desenfreno, Señor de la Guerra, Golpe de Titán): solo el coste que cobra una
//   habilidad (③ afterCast, furyPaid). No cuentan Furia Protectora, Segundo Aliento ni drenajes.
// · «Tu movilidad» (c14, c27, c30): la cadena de un relanzamiento cuenta solo su primer uso.
// · Suelos (rejuicio §20, ronda 3 §21): ninguna reducción de talento deja la recarga efectiva de
//   una definitiva por debajo del 70 % de su base, ni la del Sendero de Luz (o la de la Carga de
//   Escudo con Avalancha) por debajo de 4 s; los recortes del Salto cuentan como «seguidas» de
//   Estampida Sin Fin (cutCd).
// · Copias y repeticiones (echo): no cuentan como lanzamiento ni como suelta perfecta.
// · Las pasivas de especialización que no son stats van en su nodo clave (gratis): Al borde
//   (m_berserk, b0) y Martillo Piadoso (g_z_martillo_piadoso, z0, con la regla de las zonas sagradas
//   del Cruzado: no se suman). La Piel de Hierro de 12 s y −50 % del Guardián es su innate.mod.
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower, POWER_HOOKS } from './powers.js';
import { gainGauge, gaugeValue, gaugeMax, gaugeState, gaugeTuning, setGauge } from './spec-mechanics.js';
import { dotProfile, damageReduction, takenMult, chargeRelease, rankCoef, rankBuff, blockReduction, DOT_PROFILES, CAPS } from './combat-math.js';
import { spendResource, drainResource } from './resources.js';
import { wasExecuted } from './powers-common.js';
import { insideField } from './field-entities.js';
import { strikeBleedSource } from './mech-guerrero.js';
import { verbFx } from './fx-skills.js';
// (importados: úsalos solo dentro de los ganchos). Sin talents.js ni skill-resolve.js: los dos
// llegan a data.js y, si el primer módulo cargado es resources.js, el ciclo resources → powers →
// aquí → data dejaría RESOURCE_DEFS sin iniciar (la misma razón que en powers-common.js)

// ------------------------------------------------------------
// valores de diseño (texto de los nodos) — función: ver la nota del ciclo de módulos
// ------------------------------------------------------------
function tun() {
  return {
    brother: { dmgPct: 5, hpPct: 8, radius: 15, furyPct: 5, maxAllies: 3 },   // c22B
    coraza: { below: 0.3, dr: 30, dur: 5, icd: 60 },                        // c11B
    negacion: { icd: 120 },                                                  // b15A

    // ---- Paso 2g · árbol de clase (§6) ----
    tajoFirme: 5,                                         // c5A: 10 → 15 de Furia por Tajo contra élites y jefes
    tajoVoraz: { costPct: -50, dur: 8 },                  // c5B: la siguiente principal a media Furia
    ensanamiento: { pct: 25, reach: 1.5 },                // c6A: al de más vida de los que alcanza la principal
    sinCuartel: { per: 5, max: 5, radius: 2.5 },          // c6B: +5 % por enemigo (hasta +25 %)
    marcha: 1,                                            // c7: s de imparable tras tu movilidad
    golpePesado: 15,                                      // c9A: Quebranto a jefes por golpe preparado o suelta perfecta
    golpePesadoAdd: 0.3,                                  // c9A: s que suma a la preparación (el mod del nodo; el Juicio no la suma)
    derribo: { stun: 1, stagger: 20, icd: 8 },            // c10A
    silenciar: { dur: 3, icd: 10 },                       // c10B
    pielHalf: 0.5,                                        // c11A/c17A/c22A: fuera de la barra salen con Piel de Hierro al 50 %
    polvareda: { radius: 3, pct: 50, dur: 3 },            // c14A
    reparadora: { healPct: 6, icd: 6 },                   // c14B (cura por p.sustain)
    protectora: { share: 20, hpPctPerFury: 0.5 },         // c15A: el 20 % del daño, 1 de Furia por 0,5 % de la vida
    desbordante: { over: 100, dmgPct: 10 },               // c15B
    iraContenida: { every: 20, dmgPct: 20 },              // c17B
    temple: { fury: 3, ext: 0.25, maxExt: 3 },            // c19
    desequilibrio: { slowPct: 30, dur: 2, crit: 10 },     // c20
    persecucion: 50,                                      // c21
    ritmoCombate: 0.5,                                    // c23: s por crítico del Tajo, × rango
    rencor: { radius: 4, pctPerRank: 10 },                // c25
    desenfreno: { need: 80, window: 4, dur: 4, base: 4, perRank: 8 },   // c26
    rugido: { radius: 5, pctPerRank: 8, dur: 4 },         // c27
    inquebrantable: { base: 25, perRank: 15, cd: 15, furyPerRank: 10 }, // c28: presupuesto 40/55/70 % de la vida
    senorGuerra: { every: 100, base: 20, perRank: 20, delay: 0.25 },   // c29: copia al 40/60/80 %
    asalto: { perRank: 15, dur: 6, refund: 0.5, icd: 6 }, // c30
    ultFloor: 0.7,                                        // suelo de las definitivas: 70 % de su base

    // ---- Paso 2g · especializaciones (§7) ----
    movFloor: 4,                                          // suelo de 4 s de la Carga (d17) y del Sendero de Luz
    // Berserker
    contagio: { radius: 3, n: 2 },                        // b8A
    desangrar: 3,                                         // b8B: Sangrados a la vez en el mismo enemigo
    onda: { radius: 4, pct: 60 },                         // b9A
    remate: 15,                                           // b9B: Quebranto a los jefes
    aplastante: { per: 40, max: 120 },                    // b10B
    ritmo: { perRank: 0.5, icd: 1.5 },                    // b12
    impacto: { stun: 0.5, stagger: 15, icd: 4 },          // b14
    hirviente: { perRank: 8 },                            // b16 (el umbral, en gaugeTuning().sed.boilAt)
    avidez: 2,                                            // b18: Furia por enemigo, × rango
    caidaSangrienta: 100,                                 // b21: % del golpe en Sangrado
    estallido: { radius: 4, base: 20, perRank: 15 },      // b22
    verdugo: 3,                                           // b23: % por cada 10 % de vida que falta, × rango
    impetu: { perRank: 3, max: 5, dur: 8 },               // b24
    danza: { after: 3, cap: [6, 10, 20], furyPerSec: 8, step: 0.25, rampAdd: [15, 30, 45] },   // b25 (rampAdd: +% al tope de la rampa del giro)
    gracia: { pct: [30, 45, 60], vuln: [1, 2.5, 4], delay: 0.15 },     // b26
    estampida: { need: 3, refund: [4, 8, Infinity], row: 2, vuln: 3 }, // b27 (vuln: s de Vulnerable del Salto recargado)
    corazon: { icd3: 60, every: 3, dur: 5, icd4: 90 },                // b28 (Sed por élite y 9 s: la mecánica)
    // Guardián
    contragolpe: { perRank: 40, icd: 1, reach: 3 },       // d4
    mirada: 1,                                            // d7: +s de provocación por rango
    barrido: { radius: 4, coef: 1.2, taunt: 2, icd: 3 },  // d8A
    certero: { pct: 30, win: 1.5 },                       // d8B
    replicas: { reach: 8 },                               // d9A
    epicentro: { radius: 2, pct: 50, stagger: 20 },       // d9B
    arrastre: { width: 3, front: 1.2 },                   // d10A
    choque: { reach: 2.2, pct: 60, stagger: 25 },         // d10B
    tambor: 0.5,                                          // d12: s por enemigo × rango (tope r s)
    delante: { perRank: 2, dur: 4 },                      // d13
    guardiaRota: 3,                                       // d14
    ultimaLinea: { hpPct: 10, dur: 3, icd: 120 },         // d15A
    roca: { need: 5, blockPower: 10 },                    // d15B
    fuerzaBastion: 2,                                     // d16: % por carga × rango
    avalancha: 1,                                         // d17: s por arrastrado (tope r s)
    vinculo: { pct: 10, radius: 8 },                      // d18: % por rango
    tierraViva: { every: 3, radius: 5, coef: 0.3 },       // d19: coef × rango
    guarnicion: { perRank: 5 },                           // d20 (1 carga cada gaugeTuning().bastion.guarnicion s)
    guardiaViva: { perRank: 3, max: 3, dur: 8, heal: 1 }, // d22
    replicaHonda: 10,                                     // d23: % por rango (×2 contra Quebrantados)
    escolta: { perRank: 4, radius: 6, dur: 6, icd: 10 },  // d24
    guardiaTotal: { need: 3, win: 8, dur: [3, 4.5, 6], icd: 15, bonus: 15 },   // d25
    montana: { every: 3, mul: [0.5, 0.75, 1], stun: 0.5, delay: 0.3, icd: 3 }, // d26 (icd: s por enemigo)
    cabeza: { charges: [2, 3, 5], icd: 10, radius: 8, taunt: 4 },             // d27
    inexpugnable: { maxAdd: 2, piel: 6, every: 3, dur: 4, icd: 45 },          // d28
    // Cruzado
    piadoso: { pct: 10, radius: 15, cap: 1 },             // z0: 10 % del daño sagrado, ≤ 1 %/s por receptor
    zonaCap: 4, zonaTick: 0.5,                            // cubeta de zona (sendero + Tierra Santa): %/s por receptor
    marcaIndeleble: 4,                                    // z4: +s por rango
    consagrado: { coef: 0.4, dur: 4, max: 2 },            // z6
    senderoBendito: { heal: 0.5, spd: 10 },               // z7: por rango
    estallidoLuz: { pct: 50, radius: 3 },                 // z8A
    condena: 15, condenaMul: 2,                           // z8B: Quebranto al detonar y × la duración de la marca
    generoso: { radius: 8, heal: 3, mainRadius: 5 },      // z9A
    pesado: { pct: 80, stagger: 25 },                     // z9B
    sendaArdiente: { coef: 0.3, slow: 1, slowPct: 30 },   // z10A
    refugio: { pct: 10, dur: 6, icd: 6 },                 // z10B
    liturgia: { perRank: 0.5, icd: 2 },                   // z12: s por suelta perfecta, × rango
    tierraBendita: { radiusPerRank: 15, durPerRank: 1 },  // z13
    altar: { radius: 4, dur: 6, dmgPct: 10 },             // z14
    milagro: { hpPct: 20, icd: 120 },                     // z15A
    luzProtectora: { pct: 10, dur: 6 },                   // z15B
    ardor: 4,                                             // z16: % por Fervor × rango
    velo: 5,                                              // z17: % por rango
    absolucion: 2,                                        // z18: s entre curas (cura r %)
    graciaCielo: 2,                                       // z20: s por rango
    vigilia: 2,                                           // z21: recarga ×2 dentro de tu zona
    edicto: 5,                                            // z22: radio
    marcaAjena: 100,                                      // z5/z22: % de las marcas que no pone el Juicio
    racha: { perRank: 4, max: 5 },                        // z23
    peregrino: { dmg: 4, dr: 3 },                         // z24: por rango
    tribunal: { uses: [2, 2, 3], pct: [40, 60, 80], jump: 2, radius: 6 },  // z25
    celestial: { pct: [30, 45, 60], delay: 0.3 },         // z26
    tierraSanta: { cap: [8, 14, 20], heal: 1 },           // z27
    aureola: { every: 8, mul: 0.5, icd: 30 },             // z28 (rango 2: la cura del Veredicto, en la mecánica)

    // ---- Paso 2g · árboles héroe (§9) ----
    // Titán: cada 60 de Furia pagada, la siguiente principal +40 % y sacude el suelo a 4 m (50 %);
    // `pending` = s sin afterCast tras los que un Golpe de Titán anulado (esquiva) vuelve a estar listo
    titan: { every: 60, pct: 40, radius: 4, coef: 0.5, stagger: 15, slowDur: 2, pending: 3 },
    aplomo: 3, pielMontana: { pct: 8, dur: 5 }, eco: { delay: 1, mul: 0.5 }, quiebrahuesos: 15,
    derrumbe: { radius: 3, coef: 1 }, mole: { per: 20, max: 2 }, temblor: { pct: 10, dur: 4 },
    peso: 1, coloso: { icd: 30, dur: 8, mul: 0.5 },
    // Gladiador: Rival 10 s (+15 %); Muchos Rivales 3 a +10 %; Duelo a Muerte 1 a +30 % sin caducar;
    // al morir, +20 de Furia y pasa al más cercano a `pass` m; Desafío de Arena +20 % 8 s
    rival: { dur: 10, pct: 15, fury: 20, pass: 12, many: 3, manyPct: 10, duelPct: 30, arenaReach: 6 },
    ovacion: { normalDiv: 5, icd: 2 },                    // tv.rivalKillHeal 10 → 2 % con un Rival normal
    tiroArena: { slowPct: 40, dur: 3, icd: 4 },
    contraataque: { win: 2, pct: 60, healPct: 5 },
    gloria: { max: 5, step: 0.2, pct: 4, idle: 8 },
    retirada: { pct: 30, icd: 6 },
    sangreArena: 5, clamor: { radius: 6, dur: 2, stagger: 20 }, pulgar: { below: 0.3, pct: 40 },
    finta: { radius: 3, s: 2 }, campeon: 10, vitores: { s: 6, icd: 15 },
    triunfo: { dur: 10, max: 15, dmgPct: 25, costPct: -50, icd: 35, perKill: 1 },
    // Caudillo: un Pendón cada 15 s donde estás (si hay enemigos a `combat` m), 12 s, 8 m, +8 % / −8 %
    pendon: { every: 15, dur: 12, radius: 8, dmgPct: 8, dr: 8, interval: 0.5, combat: 12 },
    arenga: { pct: 5, radius: 8 }, clarin: 20, desbandada: { radius: 8, dur: 2, stagger: 20 },
    orden: { radius: 15, pct: 15, dur: 10 }, relevo: { pct: 10, radius: 8, dur: 6 },
    granEstandarte: { icd: 40, dur: 15, mul: 2 }, estandarteRange: 15,
  };
}

// ------------------------------------------------------------
// helpers (declaraciones de función: se elevan con el módulo)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isEliteOrBoss(e) { return !!e?.def?.rank || isBoss(e); }
function buffOf(a, id) { return (a?.buffs || []).find(b => b.id === id && b.t > 0) || null; }
// renueva (sin recompute) o crea un buff de duración corta (auras)
function keepBuff(a, id, stats, dur, meta) {
  const b = buffOf(a, id);
  if (b) { b.t = Math.max(b.t, dur); b.dur = Math.max(b.dur || 0, dur); return b; }
  a?.addBuff?.(id, { ...stats }, dur, meta || {});
  return null;
}
function others(g, p, r) { return (g?.allies ? g.allies(p.pos, r) : []).filter(a => a !== p); }
// curación de HABILIDAD a un aliado (tú: g.heal, que suma la amenaza de curar)
function skillHeal(g, p, a, amt, src) {
  if (!(amt > 0) || !a) return 0;
  if (a === p) return g.heal ? g.heal(amt, { target: 'self', src }) : p.healSkill(amt, src);
  return a.healSkill?.(amt, src) || 0;
}
function fxAt(g, name, pos, y = 1) {
  if (!name || !pos || !g?.emitFx) return;
  g.emitFx(name, pos.clone ? pos.clone().setY(y) : { x: pos.x, y, z: pos.z });
}
function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
function nearAL(g, p) {
  let al = 0;
  for (const e of g?.enemies || []) if (e.alive && e.pos.distanceTo(p.pos) <= 20) al = Math.max(al, e.def?.level || 0);
  return al || p.level || 1;
}
// ¿el aliado (de g.party, no tú) está a ≤ r m?
function allyNear(p, a, r) { return !!a && a !== p && !!a.pos?.distanceTo && a.pos.distanceTo(p.pos) <= r; }
// sin objetivo o sin recurso propio: el enfriamiento no se gasta (D2: g.reduceCooldown, Infinity = lista)
function refundCd(g, p, sk, msg) {
  g.reduceCooldown?.(p, sk.id, Infinity);
  if (msg) g.ui?.message?.(msg);
}

// ------------------------------------------------------------ helpers del Paso 2g
const now = p => p?.simT || 0;
// rango del nodo que concede el poder (finales y ápice): el mismo dato que talents.powerRank,
// leído del agregado de talentos que deja recompute (mínimo 1: el poder solo existe con el nodo)
const rankOf = (p, powerId) => Math.max(1, p?.talentAgg?.powerRank?.[powerId] | 0);
// perfil de una habilidad de la clase: el del núcleo (g.skillProfile, cola W2) o el de la caché de
// resolveSkill; si no está (recompute la vacía), uno básico del catálogo forjado con el rango del
// héroe y los mods de talento (sin soportes)
function profOf(g, p, id) {
  if (typeof g?.skillProfile === 'function') return g.skillProfile(p, id);
  if (p?.resolved?.[id]) return p.resolved[id];
  const sk = skillOf(p, id);
  if (!sk) return null;
  const def = p.forged?.[id]?.def || sk;
  const rank = p.skills?.[id] || 1;
  const m = p.talentAgg?.mods?.[id] || {};
  const cdr = Math.max(-100, Math.min(CAPS.cdr, (p.stats?.cdr || 0) + (m.cdr || 0)));
  const buffMul = rankBuff(rank) * Math.max(0, 1 + (m.buff || 0) / 100);
  const buff = {};
  for (const [k, v] of Object.entries(def.buff || {})) buff[k] = Math.round(v * buffMul);
  return {
    id, def, cat: def.cat, coef: (def.coef || 0) * rankCoef(rank), addPct: (def.addPct || 0) + (m.dmg || 0),
    range: (def.range || 0) * Math.max(0.2, 1 + (m.range || 0) / 100), tags: new Set([...(def.tags || []), def.cat, def.elem].filter(Boolean)),
    cd: Math.max(0, (def.cd || 0) * (1 - cdr / 100)), buffMul, buff, gen: (def.gen || 0) + (m.gen || 0),
    dur: Math.max(0, (def.dur || 0) * Math.max(0.1, 1 + (m.dur || 0) / 100) + (m.durS || 0)),
  };
}
// quita un buff YA (sin esperar a que caduque) y recalcula; true si estaba
function dropBuff(p, id) {
  const n = p?.buffs?.length || 0;
  if (!n) return false;
  p.buffs = p.buffs.filter(b => b.id !== id);
  if (p.buffs.length === n) return false;
  p.recompute?.();
  return true;
}
// buff de aura que no se suma: si ya está, se queda con el mayor de cada stat y renueva
function auraBuff(a, id, stats, dur, meta) {
  const b = buffOf(a, id);
  if (!b) { a?.addBuff?.(id, { ...stats }, dur, meta || {}); return; }
  b.t = Math.max(b.t, dur); b.dur = Math.max(b.dur || 0, dur);
  let up = false;
  for (const [k, v] of Object.entries(stats)) if (v > (b.stats[k] || 0)) { b.stats = { ...b.stats, [k]: v }; up = true; }
  if (up) a.recompute?.();
}
const isSpenderCast = cast => (cast?.sk?.cat || cast?.prof?.cat) === 'spender';
const isMoveCast = cast => (cast?.sk?.cat || cast?.prof?.cat) === 'movement';
const tagsHave = (hit, t) => !!(hit?.tags && (hit.tags instanceof Set ? hit.tags.has(t) : Array.isArray(hit.tags) && hit.tags.includes(t)));
const direct = hit => !!hit && !hit.proc && !hit.dot;
// Furia PAGADA por una habilidad (rejuicio §20): el coste cobrado. Ni repeticiones, ni el
// básico, ni los relanzamientos gratis; lo que cuesta 0 (Ira Contenida, Furia Inmortal) no cuenta
function furyPaid(cast) {
  if (!cast || cast.echo || cast.weapon || !cast.prof) return 0;
  if (cast.recast && cast.prof.recast?.free !== false) return 0;
  return Math.max(0, cast.prof.cost || 0);
}
// ¿la habilidad está en la barra? (las activas de talento de clase salen con la Piel si no)
const onBar = (p, id) => Object.values(p?.hotbar || {}).includes(id);
const skillOf = (p, id) => (p?.cls?.skills || []).find(s => s.id === id) || null;
const enemiesNear = (g, pos, r) => (g?.enemies || []).filter(e => e.alive && e.pos.distanceTo(pos) <= r + 0.5 * (e.def?.scale || 1));
// «tu movilidad»: la de la ranura 1 (o, sin ella, cualquier movilidad que se esté recargando)
function myMovement(p) {
  const k1 = skillOf(p, p?.hotbar?.k1);
  if (k1?.cat === 'movement') return k1;
  return (p?.cls?.skills || []).find(s => s.cat === 'movement' && (p.cds?.[s.id] || 0) > 0) || null;
}
// recarga de tu movilidad recortada por un poder (Finta, Asalto Total): pasa por cutCd (el suelo
// de 4 s de la Carga con Avalancha y del Sendero, y la cuenta de «seguidas» del Salto)
function moveCut(g, p, s) {
  const sk = myMovement(p);
  return sk ? cutCd(g, p, sk.id, s) : 0;
}
// ---- suelo de las definitivas (rejuicio §20; nota 13 del plan: absoluto, 70 % de sk.cd) ----
// Entre todos los talentos, la recarga EFECTIVA de una definitiva (lo que ya pasó desde que
// empezó + lo que le falta) no baja del 70 % de su base del catálogo; la de la movilidad con
// suelo, de 4 s. Lo recortado por otros cuenta porque se mide lo que falta de verdad. El inicio de
// cada recarga lo anota noteStart (③ afterCast de los poderes que recortan) o, si nadie lo hizo, el
// primer recorte que la ve (suponiendo que nadie la recortó antes). Una recarga que SUBE es otra
// nueva: su inicio se vuelve a anotar (así no vale el de la recarga anterior)
const ULT_STATE = 'g_ult_suelo';
function cdTrack(p) {
  const st = powerState(p, ULT_STATE);
  if (!st.start) st.start = {};
  if (!st.seen) st.seen = {};
  return st;
}
// anota el inicio de la recarga en curso de `id`: lo que ya corrió (cdMax − lo que falta)
function markStart(p, id) {
  const st = cdTrack(p), left = p.cds?.[id] || 0;
  st.start[id] = now(p) - (left > 0 ? Math.max(0, (p.cdMax?.[id] || left) - left) : 0);
  st.seen[id] = { left, at: now(p) };
}
function noteStart(p, cast) {
  const cat = cast?.sk?.cat || cast?.prof?.cat;
  if (!cast || cast.echo || cast.recast || (cat !== 'ultimate' && cat !== 'movement')) return;
  const id = cast.sk.id;
  const st = cdTrack(p);
  // una vez por lanzamiento: el primer poder que lo anota (antes de recortar nada) manda
  const by = st.by || (st.by = {});
  if (by[id] === cast) return;
  by[id] = cast;
  markStart(p, id);
}
// lo que ya corrió de la recarga en curso de `id` (los recortes no cuentan como tiempo pasado)
function cdElapsed(p, id) {
  const st = cdTrack(p), t = now(p), left = p.cds?.[id] || 0, s = st.seen[id];
  // sin inicio, o la recarga subió desde la última vez que se vio (empezó otra): se anota ahora
  if (st.start[id] == null || st.start[id] > t || !s || left > s.left - (t - s.at) + 1e-6) markStart(p, id);
  return t - st.start[id];
}
// tras un recorte: lo que falta ahora (la referencia para ver si la recarga vuelve a subir)
function cdSeen(p, id) { cdTrack(p).seen[id] = { left: p.cds?.[id] || 0, at: now(p) }; }
function ultCutOne(g, p, sk, s) {
  const left = p.cds?.[sk.id] || 0;
  if (!(s > 0) || !(left > 0)) return 0;
  const elapsed = cdElapsed(p, sk.id);
  const room = Math.max(0, left - Math.max(0, (sk.cd || 0) * tun().ultFloor - elapsed));
  const cut = Math.min(s, room);
  const got = cut > 1e-9 ? (g.reduceCooldown?.(p, sk.id, cut) || 0) : 0;
  cdSeen(p, sk.id);
  return got;
}
function ultCut(g, p, s) {
  let total = 0;
  for (const sk of p?.cls?.skills || []) if (sk.cat === 'ultimate') total += ultCutOne(g, p, sk, s);
  return total;
}
// recorta TODAS tus recargas en `s` (con sus suelos): Disciplina del Pendón
function cutAll(g, p, s) {
  for (const sk of p?.cls?.skills || []) if ((p.cds?.[sk.id] || 0) > 0) cutCd(g, p, sk.id, s);
}
// daño que EVITÓ la Piel de Hierro en un golpe que ya dejó pasar `amount` (su reducción y su
// daño recibido extra, si lo trae, frente a los mismos stats sin ella)
function pielPrevented(p, amount) {
  const b = buffOf(p, 'g_piel');
  if (!b || !(amount > 0)) return 0;
  const dr = b.stats?.dr || 0, taken = b.stats?.dmgTakenPct || 0;
  if (!dr && !taken) return 0;
  const st = p.stats || {};
  const mult = s => (1 - damageReduction(s)) * takenMult(s);
  const withB = mult(st), without = mult({ ...st, dr: (st.dr || 0) - dr, dmgTakenPct: (st.dmgTakenPct || 0) - taken });
  return withB > 1e-6 ? Math.max(0, amount * (without / withB - 1)) : 0;
}
// miedo (Clamor del Público, Desbandada): «huyen 2 s». Control real del núcleo (applyCC('fear'),
// cola W2d): huyen de `center` en su IA, con los rendimientos decrecientes del control duro. A los
// jefes no los asusta: les llena `stagger` de Quebranto. → cuántos huyen o se quiebran
function scare(g, p, center, radius, { dur, stagger }) {
  let n = 0;
  for (const e of enemiesNear(g, center, radius)) {
    if (isBoss(e)) { if (e.addStagger?.(stagger, p) > 0) n++; continue; }
    if ((e.applyCC?.('fear', dur, { src: p, from: center }) || 0) > 0) n++;
  }
  return n;
}
// Lanza Arrojadiza GRATIS del Gladiador (Tiro de Arena, Retirada Táctica): no hace falta tenerla
// en la barra. Atraviesa la línea hasta el Rival con el golpe de la Lanza (efecto de poder:
// no activa otros efectos)
function freeLance(g, p, target, { addPct = 0, slowPct = 0, slowDur = 0, src = 'g_gl_tiro_arena' } = {}) {
  if (!target?.alive || !g?.enemiesInLine) return 0;
  const sk = skillOf(p, 'g_lanza');
  const prof = sk ? profOf(g, p, sk.id) : null;
  const dir = target.pos.clone().sub(p.pos).setY(0);
  const dist = dir.length();
  if (dist < 1e-6) dir.set(0, 0, 1); else dir.normalize();
  const coef = prof?.coef || 1.9, add = (prof?.addPct || 0) + addPct;
  const tags = prof?.tags || new Set(['spender', 'proj', 'physical']);
  const list = g.enemiesInLine(p.pos, dir, Math.max(prof?.range || 11, dist + 0.5), 1.2);
  if (!list.includes(target)) list.push(target);
  let n = 0;
  for (const e of list) if (dealProcDamage(g, e, p.avgHit(coef, add), { source: `power:${src}`, skill: 'g_lanza', tags }) > 0) n++;
  if (slowPct > 0 && target.alive) target.applyCC?.('slow', slowDur, { pct: slowPct, src: p });
  g.spawnBeam?.(p.pos, target.pos, 0xd8c49a, 0.25);
  return n;
}

// ---- Titán (h1) ----
// SACUDIDA del Golpe de Titán alrededor de `center`: 50 % del arma × mul (efecto de poder),
// ralentiza con Sacudida Amplia (tv.titanSlow) y debilita con Temblor (t9). Devuelve los golpeados
function titanShake(g, p, center, mul = 1, skill = null) {
  const T = tun();
  const tv = p.tv || {};
  const rad = T.titan.radius + (tv.titanRadius || 0);
  const dmg = p.avgHit(T.titan.coef * mul);
  const tags = new Set(['area', 'physical']);
  const hit = [];
  for (const e of enemiesNear(g, center, rad)) {
    hit.push(e);
    dealProcDamage(g, e, dmg, { source: 'power:g_ti_golpe_titan', skill, tags });
    if (!e.alive) continue;
    if (tv.titanSlow > 0) e.applyCC?.('slow', T.titan.slowDur, { pct: tv.titanSlow, src: p });
    if (hasPower(p, 'g_ti_temblor')) e.weakenOutgoing?.('g_ti_temblor', T.temblor.pct, T.temblor.dur);
  }
  g.spawnRing?.(v3(center.x, 0.05, center.z), rad, 0xc8a070);
  g.addShake?.(0.25 * mul, 0.25);
  return hit;
}
// el Golpe de Titán que acaba de salir con ESTE lanzamiento (③ afterCast de los nodos del Titán;
// el poder de la mecánica corre antes por prioridad)
function titanStrike(p, cast) {
  const s = powerState(p, 'g_ti_golpe_titan').strike;
  return s && s.cast === cast ? s : null;
}
// ¿este golpe pertenece a un Golpe de Titán en curso? (lanzado y aún sin su afterCast)
function titanPending(p, skill) {
  const st = powerState(p, 'g_ti_golpe_titan');
  return !!st.cast && !!skill && st.skill === skill;
}

// ---- Gladiador (h2) ----
function rivalState(p) { return powerState(p, 'g_gl_rival'); }
function rivalOf(p, e) { return e ? (rivalState(p).rivals || []).find(r => r.e === e) || null : null; }
const isRival = (p, e) => !!rivalOf(p, e);
// ¿murió AHORA mismo un Rival? (lo anota g_gl_rival en ⑥ antes que los demás, por prioridad)
function rivalDeath(p, e) {
  const d = rivalState(p).death;
  return d && d.e === e && d.t === now(p) ? d : null;
}
// eventos del Rival por número de serie (nombrar, Quebrantar): cada poder recuerda el último que vio
function rivalEvents(p, mine, kind) {
  const list = rivalState(p).events || [];
  const seen = mine.seen?.[kind] ?? 0;
  const out = list.filter(ev => ev.kind === kind && ev.seq > seen);
  if (list.length) (mine.seen || (mine.seen = {}))[kind] = list[list.length - 1].seq;
  return out;
}
// ¿acabas de esquivar? (flanco de subida de la esquiva, sondeado a 10 Hz en ⑨)
function dodgedNow(p, st) {
  const on = (p.dodgeT || 0) > 0;
  const edge = on && !st.dodging;
  st.dodging = on;
  return edge;
}
// Rivales a la vez y su bonificación (Muchos Rivales: 3 a +10 %; Duelo a Muerte: 1 a +30 %)
const rivalCap = p => (hasPower(p, 'g_gl_rivales') ? tun().rival.many : 1);
function rivalPct(p) {
  const R = tun().rival;
  return hasPower(p, 'g_gl_rivales') ? R.manyPct : hasPower(p, 'g_gl_duelo') ? R.duelPct : R.pct;
}
function pushRivalEvent(st, ev) {
  ev.seq = ++st.seq;
  st.events.push(ev);
  if (st.events.length > 16) st.events.shift();
}
// quita los Rivales muertos o caducados (con Duelo a Muerte no caducan)
function pruneRivals(p, st) {
  if (st.rivals.length) st.rivals = st.rivals.filter(r => r.e.alive && now(p) < r.until);
}
function nameRival(g, p, st, e) {
  const R = tun().rival;
  const r = { e, until: hasPower(p, 'g_gl_duelo') ? Infinity : now(p) + R.dur, frac0: e.maxHP > 0 ? Math.max(0, e.hp) / e.maxHP : 1, breaks: e.staggerBreaks || 0 };
  st.rivals.push(r);
  pushRivalEvent(st, { kind: 'named', e, t: now(p) });
  g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.9), 'RIVAL', 'txt-crit');
  return r;
}
// Ovación (tv.rivalKillHeal): sustento del 10 % por un Rival élite o jefe muerto o Quebrantado;
// un Rival normal, la quinta parte (2 %) y como mucho cada 2 s
function rivalHeal(g, p, st, big) {
  const pct = p.tv?.rivalKillHeal || 0;
  if (!(pct > 0) || !p.alive) return;
  const O = tun().ovacion;
  if (!big) {
    if (now(p) - st.healAt < O.icd - 1e-9) return;
    st.healAt = now(p);
  }
  if (p.sustain(p.stats.maxHP * (big ? pct : pct / O.normalDiv) / 100, 'g_gl_ovacion') > 0) g.ui?.spawnText?.(p.pos, '+❤️', 'txt-heal');
}
function nearestRival(p) {
  let best = null, bd = Infinity;
  for (const r of rivalState(p).rivals || []) {
    if (!r.e.alive) continue;
    const d = r.e.pos.distanceToSquared(p.pos);
    if (d < bd) { bd = d; best = r; }
  }
  return best;
}
// Gloria (0–5): Sangre en la Arena convierte cada punto en daño de crítico (stats: recompute)
function setGloria(p, st, v) {
  v = Math.max(0, Math.min(tun().gloria.max, v));
  if (v === st.n) return;
  st.n = v;
  if (hasPower(p, 'g_gl_sangre_arena')) p.recompute();
}
const addGloria = (p, st, n) => setGloria(p, st, st.n + n);
// Vítores: −6 s a tu definitiva (con su suelo), como mucho cada 15 s (solo si recortó algo)
function vitores(g, p) {
  const V = tun().vitores;
  const st = powerState(p, 'g_gl_vitores');
  if (now(p) - st.at < V.icd - 1e-9) return;
  if (ultCut(g, p, V.s) > 0) st.at = now(p);
}
// Golpe de Titán listo (indicador en la barra de buffs)
function arm(p, st) {
  st.ready = true;
  if (!buffOf(p, 'g_ti_golpe_titan')) p.addBuff('g_ti_golpe_titan', {}, 3600, { name: 'Golpe de Titán', icon: '⛰️', desc: 'Tu siguiente principal hace más daño y sacude el suelo' });
}

// ---- Caudillo (h3) ----
// CLAVA un Pendón en `pos` (el automático o el del Estandarte de Guerra) y dispara las
// reacciones de sus nodos (Arenga, Clarín, Desbandada, Orden de Ataque); Gran Estandarte: cada
// 40 s, el siguiente es el doble de grande y de efecto
function plantPendon(g, p, pos, { auto = true } = {}) {
  if (!g?.spawnField || !p?.alive || !pos) return null;
  const T = tun();
  const tv = p.tv || {};
  const st = powerState(p, 'g_cau_pendon');
  const gran = hasPower(p, 'g_cau_gran_estandarte') && now(p) >= (st.granAt || 0) - 1e-9;
  if (gran) st.granAt = now(p) + T.granEstandarte.icd;
  const mul = gran ? T.granEstandarte.mul : 1;
  const f = g.spawnField('g_pendon', {
    pos: v3(pos.x, 0, pos.z), radius: (T.pendon.radius + (tv.pendonRadius || 0)) * mul,
    dur: gran ? T.granEstandarte.dur : T.pendon.dur + (tv.pendonDur || 0), owner: p,
    follow: auto && hasPower(p, 'g_cau_abanderado') ? 'owner' : null,
    data: { gran, dmgPct: (T.pendon.dmgPct + (tv.pendonDmg || 0)) * mul, dr: (T.pendon.dr + (tv.pendonDr || 0)) * mul,
      spdPct: (tv.pendonSpd || 0) * mul, weak: (tv.pendonWeak || 0) * mul, cdr: (tv.pendonCdr || 0) * mul, interval: T.pendon.interval },
  });
  if (!f) return null;
  st.plants = (st.plants || 0) + 1;
  const at = v3(f.pos.x, 0, f.pos.z);
  if (hasPower(p, 'g_cau_arenga')) g.heal?.(a => (a.stats?.maxHP || 0) * T.arenga.pct / 100, { target: 'all', radius: T.arenga.radius, pos: at, src: 'g_cau_arenga' });
  if (hasPower(p, 'g_cau_clarin')) g.gainResource?.(p, T.clarin);
  if (hasPower(p, 'g_cau_desbandada')) scare(g, p, at, T.desbandada.radius, T.desbandada);
  if (hasPower(p, 'g_cau_orden')) {
    let best = null;
    for (const e of enemiesNear(g, at, T.orden.radius)) if (!best || e.hp > best.hp) best = e;
    best?.applyWeakness?.('g_cau_orden', T.orden.pct, T.orden.dur);
  }
  g.spawnRing?.(at, f.radius, gran ? 0xffd27a : 0xd8a040);
  g.sfx?.('equip');
  return f;
}
// un pulso del Pendón: aura a los aliados dentro (no se suma con otro Pendón), Línea de Batalla
// a los enemigos dentro y Disciplina (recargas más rápidas) si el dueño está dentro
function pendonPulse(g, f, step) {
  const o = f.owner;
  if (!o?.alive) return;
  const d = f.data;
  const pos = v3(f.pos.x, 0, f.pos.z);
  const stats = { dmgPct: d.dmgPct, dr: d.dr };
  if (d.spdPct > 0) stats.spdPct = d.spdPct;
  const meta = { name: d.gran ? 'Gran Estandarte' : 'Pendón', icon: '🚩', desc: `+${d.dmgPct}% de daño y −${d.dr}% de daño recibido` };
  for (const a of g.allies ? g.allies(pos, f.radius) : [o]) auraBuff(a, 'g_cau_pendon', stats, d.interval + 0.15, meta);
  if (d.weak > 0) for (const e of enemiesNear(g, pos, f.radius)) e.weakenOutgoing?.('g_cau_linea', d.weak, d.interval + 0.15);
  if (d.cdr > 0 && step > 0 && o.pos.distanceTo(pos) <= f.radius) cutAll(g, o, step * d.cdr / 100);
}

// ------------------------------------------------------------ helpers de las especializaciones
// (Paso 2g, §7; KT-guerrero, trabajos 2 y 3)
const isHitOf = (hit, id) => hit?.skill === id && direct(hit);
const isHolyHit = hit => hit?.elem === 'holy' || tagsHave(hit, 'holy');
const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
// los `n` enemigos vivos más cercanos a `pos` a ≤ r m (sin `skip`)
function nearestEnemies(g, pos, r, n, skip = null) {
  return enemiesNear(g, pos, r).filter(e => e !== skip).sort((a, b) => dist2D(a.pos, pos) - dist2D(b.pos, pos)).slice(0, n);
}
function nearestEnemy(g, pos, r) { return nearestEnemies(g, pos, r, 1)[0] || null; }
// el aliado (o tú) con menos vida a ≤ r m de `pos`
function lowestAlly(g, p, pos = p.pos, r = 15, skip = null) {
  let best = null;
  for (const a of g?.allies ? g.allies(pos, r) : [p]) {
    if (a === skip || !(a.stats?.maxHP > 0)) continue;
    if (!best || a.hp / a.stats.maxHP < best.hp / best.stats.maxHP) best = a;
  }
  return best;
}
// definición forjada de una habilidad de la clase (sin el resolvedor: ver la nota del ciclo)
const defOf = (p, id) => p?.forged?.[id]?.def || skillOf(p, id);
// ¿la postura activa es Muralla (o Guardia Total, las dos)?
const inMuralla = (g, p) => !!g?.activeStanceModes?.(p).some(m => m.id === 'muralla');

// ---- recortes de recarga con los suelos de la clase ----
// suelo de 4 s de la movilidad (rejuicio §20, ronda 3 §21): el Sendero de Luz siempre; la Carga de
// Escudo con Avalancha (d17). La recarga EFECTIVA (lo que ya pasó + lo que falta) no baja de 4 s
function moveFloor(p, id) {
  if (id === 'g_sendero') return tun().movFloor;
  if (id === 'g_carga_escudo' && hasPower(p, 'g_d_avalancha')) return tun().movFloor;
  return 0;
}
// «seguidas» del Salto Devastador (Estampida Sin Fin, b27): recargas seguidas que algún poder
// recortó o reinició. row = cuántas; cut = la recarga en curso ya se recortó
const saltoRow = p => powerState(p, 'g_b_estampida_fila');
// ÚNICO recorte de recarga de este archivo: definitivas con su suelo del 70 %, movilidad con su
// suelo de 4 s y la cuenta de «seguidas» del Salto. s = Infinity: lista ya (o hasta su suelo)
function cutCd(g, p, id, s) {
  const left = p?.cds?.[id] || 0;
  if (!(s > 0) || !(left > 0)) return 0;
  const sk = skillOf(p, id);
  if (sk?.cat === 'ultimate') return ultCutOne(g, p, sk, s);
  let cut = s;
  const fl = moveFloor(p, id);
  if (fl > 0) {
    cut = Math.min(s, Math.max(0, cdElapsed(p, id) + left - fl));
    if (!(cut > 1e-9)) return 0;
  }
  const got = g?.reduceCooldown?.(p, id, cut) || 0;
  if (fl > 0) cdSeen(p, id);
  if (got > 0 && id === 'g_salto') {
    const r = saltoRow(p);
    if (!r.cut) { r.row = (r.row || 0) + 1; r.cut = true; }
  }
  return got;
}

// ---- Berserker ----
// (la fuente del Sangrado de golpe, strikeBleedSource, vive en js/mech-guerrero.js: la Sed la usa
// para que el nuevo sustituya al viejo y Desangrar para apartarlo)
// intervalo de los tics de un Sangrado de la clase: el hitDot va a 0,5 s; el perfil central, a 1 s
function bleedInterval(p, source) {
  const id = String(source || '').split(/[#:]/)[0];
  if (p?.resolved?.[id]?.hitDot || skillOf(p, id)?.hitDot) return 0.5;
  return DOT_PROFILES.bleed.interval;
}
// registro de la cadena del Salto de UN poder: cada salto anota a quién golpeó y con cuánto
function jumpOpen(p, id, cast) {
  const st = powerState(p, id);
  if (!cast.recast) st.jumps = 0;
  st.jumps = (st.jumps || 0) + 1;
  st.last = { hits: [] };
}
function jumpHit(p, id, e, dealt) { const l = powerState(p, id).last; if (l && !l.hits.some(h => h.e === e)) l.hits.push({ e, dealt: dealt || 0 }); }
// ¿este salto cierra la cadena sin ⑭? (un solo salto: ni es relanzamiento ni abrió cadena)
const soloJump = (p, cast) => !cast.recast && !p.skState?.g_salto?.recast;
// fin de la cadena del Salto para Caída Sangrienta (b21): el último salto desangra a los que golpeó
// (el 100 % de su golpe en 3 s; Heridas Abiertas y Sangre Espesa cuentan, como en todo Sangrado)
function caidaSangrienta(g, p) {
  const st = powerState(p, 'g_b_caida_sangrienta');
  const last = st.last;
  st.last = null;
  const frac = tun().caidaSangrienta / 100 / DOT_PROFILES.bleed.frac;
  for (const { e, dealt } of last?.hits || []) {
    if (!e.alive || !(dealt > 0)) continue;
    const d = dotProfile('bleed', dealt, { dotMul: frac, tv: p.tv });
    if (d) g.applyDoT(e, d.total, d.ticks, d.interval, undefined, 'g_salto:bleed');
  }
}
// fin de la cadena del Salto para Estampida Sin Fin (b27): con 3 o más golpeados en el último
// salto, recorte (o reinicio) si no van ya 2 recargas seguidas recortadas
function estampida(g, p) {
  const st = powerState(p, 'g_b_estampida');
  const last = st.last;
  st.last = null;
  st.boost = false;                        // acabó la cadena (la recargada también)
  const E = tun().estampida;
  if (!last || last.hits.length < E.need || (saltoRow(p).row || 0) >= E.row) return;
  const s = E.refund[Math.min(E.refund.length, rankOf(p, 'g_b_estampida')) - 1];
  if (cutCd(g, p, 'g_salto', s) > 0) {
    st.armed = true;                       // la cadena siguiente deja Vulnerable (S-guerrero, F3)
    g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡ESTAMPIDA!', 'txt-crit');
  }
}
// Furia Inmortal GRATIS (Corazón Indomable 4): el buff del catálogo `dur` s, sin coste ni recarga
function freeFury(g, p, dur) {
  const sk = skillOf(p, 'g_u_furia');
  if (!sk || buffOf(p, 'g_u_furia')) return false;
  const def = defOf(p, sk.id);
  const stats = { ...(profOf(g, p, sk.id)?.buff || def.buff || {}) };
  for (const k of ['minHpPct', 'endHealPct']) if (def.buff?.[k] != null) stats[k] = def.buff[k];
  p.addBuff('g_u_furia', stats, dur, { name: def.name, icon: def.icon, desc: def.desc });
  if (def.unstoppable) p.unstoppableT = Math.max(p.unstoppableT || 0, dur);
  if (def.slowImmune) p.grantSlowImmune?.(dur);
  if (hasPower(p, 'g_b_sin_suelo')) cutCd(g, p, 'g_salto', Infinity);
  g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡FURIA INMORTAL!', 'txt-crit');
  return true;
}

// ---- Guardián ----
// bloqueo SEGURO (Escudo por Delante, Proa Blindada): el golpe pierde lo que para un bloqueo
// (blockReduction con el blockPower de la postura); fuera de CAPS.block. Cola W2: forcedBlocks
function forceBlock(g, p, dmg) {
  if (!dmg || dmg.blocked || !(dmg.amount > 0)) return false;
  const vs = p.verbStats?.() || {};
  dmg.amount *= 1 - blockReduction({ ...p.stats, blockPower: (p.stats?.blockPower || 0) + (vs.blockPower || 0) });
  dmg.blocked = true;
  g.ui?.spawnText?.(p.pos, '¡Bloqueo!', 'txt-heal');
  return true;
}
// arrastrados por la Carga de Escudo: los enemigos (no jefes) que el avance pegó a ti (la misma
// regla que el núcleo: a ≤ dragWidth + 0,6 m del héroe en algún paso), muestreados a 10 Hz
const DRAG = 'g_d_arrastre';
function dragStart(p, cast) {
  if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
  const st = powerState(p, DRAG);
  if (st.cast === cast) return;
  st.cast = cast; st.set = new Set(); st.at = -1;
  st.w = cast.prof?.dragWidth || 0;
  st.from = p.pos.clone().setY(0);
}
function dragSample(g, p) {
  const st = powerState(p, DRAG);
  if (!st.set) st.set = new Set();
  if (!(st.w > 0) || !st.cast || st.at === now(p)) return st.set;
  st.at = now(p);
  for (const e of g?.enemies || []) if (e.alive && !isBoss(e) && dist2D(e.pos, p.pos) <= st.w + 0.75) st.set.add(e);
  return st.set;
}
// arrastrados del lanzamiento que acaba de llegar (③ afterCast)
function dragged(g, p, cast) {
  const st = powerState(p, DRAG);
  if (st.cast !== cast) return new Set();
  st.at = -1;
  return dragSample(g, p);
}
// ventana de las réplicas del Terremoto (Réplica Honda): el núcleo las programa en el mismo
// instante; este contador abre su ventana justo antes y la cierra justo después (timers.js
// ordena por instante). Cola W2: pasar hitExtra (repeat) al golpe de condAdd
const REPL = 'g_d_replicas_ventana';
const replicaOpen = p => (powerState(p, REPL).open || 0) > 0;
function replicaBracket(g, p, times) {
  const st = powerState(p, REPL);
  for (const t of times) {
    g.timers?.schedule(Math.max(0, t - 1e-6), () => { st.open = (st.open || 0) + 1; });
    g.timers?.schedule(t + 1e-6, () => { st.open = Math.max(0, (st.open || 0) - 1); });
  }
}
// réplica PROPIA (Tierra Viva, el anillo de Réplicas): golpe de Terremoto marcado como réplica
function replicaHit(g, p, center, radius, mult, extra = {}) {
  const prof = p.resolved?.terremoto || null;
  const def = defOf(p, 'terremoto');
  const st = powerState(p, REPL);
  st.open = (st.open || 0) + 1;
  try {
    return g.dealArea(center, radius, mult, { addPct: prof?.addPct || 0, critBonus: prof?.critBonus || 0, from: center,
      hitInfo: { skill: 'terremoto', tags: prof?.tags || new Set(def?.tags || ['spender', 'area', 'physical']), elem: 'physical' },
      hitExtra: { repeat: 1, echo: true }, ...extra });
  } finally { st.open = Math.max(0, st.open - 1); }
}
// Ciudadela GRATIS (Última Línea, Inexpugnable 4): la de la definitiva `dur` s, sin coste ni
// recarga y marcada `free` (Guarnición no da cargas en ella)
function freeCitadel(g, p, dur) {
  const sk = skillOf(p, 'g_u_ciudadela');
  if (!sk || !g?.spawnField) return null;
  const def = defOf(p, sk.id);
  const buff = { ...(profOf(g, p, sk.id)?.buff || def.buff || {}) };
  const meta = { name: def.name, icon: def.icon, desc: def.desc };
  const rad = p.resolved?.[sk.id]?.radius || def.radius || 6;
  const pos = p.pos.clone().setY(0);
  const f = g.spawnField('aura', { pos, radius: rad, dur, owner: p, data: { buff, buffId: def.id, meta, color: 0x7fb0e8, free: true } });
  for (const a of g.allies ? g.allies(pos, rad) : [p]) a.addBuff?.(def.id, { ...buff }, 0.65, meta);
  if ((def.moveMul ?? 1) !== 1) p.setMoveMul?.(def.id, def.moveMul, dur);
  if (def.plant) p.plantNow?.();
  const pl = def.pulse;
  if (pl?.taunt > 0) {
    const pulse = () => {
      if (!f || f.dead || !p.alive) return;
      for (const e of enemiesNear(g, p.pos, pl.radius || 10)) e.applyCC?.('taunt', pl.taunt, { src: p });
      g.timers?.schedule(pl.every || 1, pulse);
    };
    pulse();
  }
  g.spawnRing?.(pos, rad, 0x7fb0e8);
  g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡CIUDADELA!', 'txt-crit');
  return f;
}

// ---- Cruzado ----
// zonas sagradas PROPIAS (sendero, suelos de Golpe Consagrado y del Cataclismo: campos 'zona'
// con la etiqueta holy). El poder de z0 las ADOPTA: su daño y su cura pasan a la regla de la
// clase (no se suman: vale la más fuerte; cubeta de zona de 4 %/s por receptor)
const isHolyField = f => !!f && !f.dead && f.kind === 'zona' && (!!f.data?._holy || tagsHave({ tags: f.data?.tags }, 'holy'));
const holyZones = (g, p) => (g?.fields || []).filter(f => f.owner === p && isHolyField(f));
const inHolyZone = (g, p, pos) => holyZones(g, p).some(f => insideField(f, pos));
// adopta las zonas sagradas nuevas: Tierra Bendita (z13) las agranda y alarga al nacer; Senda
// Ardiente (z10A) hace que el sendero ralentice
function adoptHoly(g, p) {
  const T = tun();
  for (const f of g?.fields || []) {
    if (f.owner !== p || f.dead || f.kind !== 'zona' || f.data?._holy || !tagsHave({ tags: f.data?.tags }, 'holy')) continue;
    f.data._holy = { dps: f.data.dps || 0, heal: f.data.healPct || 0 };
    f.data.dps = 0; f.data.healPct = 0;
    if (hasPower(p, 'g_z_tierra_bendita')) {
      const r = rankOf(p, 'g_z_tierra_bendita');
      const mul = 1 + T.tierraBendita.radiusPerRank * r / 100;
      if (f.shape === 'line') f.width *= mul; else f.radius *= mul;
      f.t += T.tierraBendita.durPerRank * r; f.dur += T.tierraBendita.durPerRank * r;
    }
    if (f.data.skill === 'g_sendero' && hasPower(p, 'g_z_senda_ardiente')) { f.data.slow = T.sendaArdiente.slow; f.data.slowPct = T.sendaArdiente.slowPct; }
  }
}
// cubetas de cura por receptor (§19.3, §20): `key` 'piadoso' (1 %/s) o 'zona' (4 %/s). Fichas que
// se reponen a `pct` % de la vida por segundo (como mucho 1 s acumulado). Devuelve lo que cabe
function healBucket(p, a, key, pct, want) {
  if (!(want > 0) || !a) return 0;
  const st = powerState(p, 'g_z_cubetas');
  const map = st[key] || (st[key] = new WeakMap());
  const cap = (a.stats?.maxHP || 0) * pct / 100;
  const b = map.get(a) || { at: now(p), avail: cap };
  b.avail = Math.min(cap, b.avail + cap * Math.max(0, now(p) - b.at));
  b.at = now(p);
  const take = Math.min(want, b.avail);
  b.avail -= take;
  map.set(a, b);
  return take;
}
// cura de habilidad a un aliado dentro de una cubeta
function bucketHeal(g, p, a, key, pct, want, src) {
  const amt = healBucket(p, a, key, pct, want);
  return amt > 0 ? skillHeal(g, p, a, amt, src) : 0;
}
// perfil de la marca de Juicio (Sello del Martillo, Edicto, Tribunal): el resuelto o el del
// catálogo forjado con los modifyResolve de sus talentos (Marca Indeleble, Tribunal)
// marca de Juicio que pone OTRA fuente (Sello del Martillo z5, Edicto z22): vale +marcaAjena %
// (S-guerrero, G07: la del propio Juicio vale más, +150 %, para que lanzarlo siga mereciendo la pena)
function sideMarkProf(p) {
  const prof = juicioProf(p);
  if (!prof) return null;
  const det = prof.mark.detonate;
  return { ...prof, mark: { ...prof.mark, detonate: det ? { ...det, pct: tun().marcaAjena } : det } };
}
function juicioProf(p) {
  const r = p?.resolved?.g_juicio;
  if (r?.mark) return r;
  const sk = skillOf(p, 'g_juicio');
  const def = defOf(p, 'g_juicio');
  if (!sk || !def?.mark) return null;
  const prof = { id: 'g_juicio', def, mark: { ...def.mark } };
  for (const id of ['g_z_marca_indeleble', 'g_z_tribunal']) if (hasPower(p, id)) POWER_HOOKS[id]?.modifyResolve?.(p, sk, prof);
  return prof;
}
// Tribunal (z25): los saltos pendientes del golpe que acaba de terminar. Cada última detonación
// salta a los 2 enemigos más cercanos a 6 m que no llevan Juicio ni lo detonaron en ese golpe, como
// marca de UN uso: su detonación la gasta y ya no salta. Un salto viejo (el planificador se vació al
// cambiar de mundo) se descarta
function tribunalJump(g, p, st) {
  const T = tun();
  const list = st.jumps.filter(j => now(p) - j.at < 0.5);
  st.jumps = [];
  if (!list.length) return;
  const prof = juicioProf(p);
  if (!prof) return;
  for (const j of list) {
    const one = { ...prof, mark: { ...prof.mark, uses: 1, detonate: { ...(j.detonate || prof.mark.detonate) } } };
    const free = enemiesNear(g, j.pos, T.tribunal.radius).filter(o => o !== j.from && !st.struck.has(o) && !(o.marks?.juicio?.t > 0));
    free.sort((a, b) => dist2D(a.pos, j.pos) - dist2D(b.pos, j.pos));
    for (const o of free.slice(0, T.tribunal.jump)) g.applyMark(o, one, p);
  }
}
// detonaciones de Juicio de ESTE instante (S-guerrero, G06): se juntan y, al acabar el golpe (planificador,
// 0 s), cada enemigo lleva su destello (verbDetonate dorado) y su anillo, y sale UN texto «¡Juicio!»
// («×N» si fueron varios) sobre el primero: un área que detona cinco marcas no apila cinco textos
export const JUICIO_FX = { color: '#ffc23a', scale: 1.2, ring: 1.6, ringColor: 0xffd36b };
function juicioBurst(g, p, e) {
  const st = powerState(p, 'g_z_martillo_piadoso');
  if (st.detAt !== now(p)) { st.detAt = now(p); st.det = []; }
  if (st.det.includes(e)) return;
  st.det.push(e);
  if (st.det.length > 1) return;                     // el primero programa el pintado de todo el instante
  g.timers?.schedule(0, () => {
    const list = st.det; st.det = [];
    if (!list.length) return;
    const fx = verbFx('verbDetonate', JUICIO_FX.color, JUICIO_FX.scale);
    for (const o of list) {
      g.emitFx?.(fx, o.pos.clone().setY(1.2));
      g.spawnRing?.(o.pos.clone().setY(0), JUICIO_FX.ring, JUICIO_FX.ringColor);
    }
    g.ui?.spawnText?.(list[0].pos.clone().setY(2.6), list.length > 1 ? `¡Juicio! ×${list.length}` : '¡Juicio!', 'txt-crit');
  });
}
// ¿el lanzamiento es un Veredicto? (lo anota la mecánica del Fervor al lanzar el Martillo)
const verdictOf = (p, cast) => !!cast && gaugeState(p, 'fervor')?.verdictCast === cast;
// Milagro (z15A): `a` (tú o un aliado) queda con un 20 % de vida; una vez cada 2 min entre todos
function milagro(g, p, a) {
  const M = tun().milagro;
  const st = powerState(p, 'g_z_milagro');
  if (!a || now(p) - st.at < M.icd - 1e-9) return false;
  st.at = now(p);
  const hp = Math.max(1, Math.round((a.stats?.maxHP || 0) * M.hpPct / 100));
  if (a.setHp) a.setHp(hp, 'g_z_milagro'); else a.hp = hp;
  g.ui?.spawnText?.(a.pos, '¡MILAGRO!', 'txt-heal');
  return true;
}

// ============================================================
// PODERES
// ============================================================
export function guerreroPowers() {
  const T = tun();
  return {
    // ---------------- ÁRBOL DE CLASE (Paso 2g, §6) ----------------
    // c5A Tajo Firme: contra élites y jefes, cada Tajo da 5 de Furia más (10 → 15), una vez por tajo
    g_tajo_firme: {
      name: 'Tajo Firme', desc: 'Contra élites y jefes, cada Tajo te da 15 de Furia (antes 10).',
      state: () => ({ at: -1 }),
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'g_tajo' || !direct(hit) || !isEliteOrBoss(e)) return;
        const st = powerState(p, 'g_tajo_firme');
        if (st.at === now(p)) return;
        st.at = now(p);
        g.gainResource(p, T.tajoFirme);
      },
    },
    // c5B Tajo Voraz: si el Tajo mata, la siguiente principal cuesta la mitad (buff que la gasta)
    g_tajo_voraz: {
      name: 'Tajo Voraz', desc: 'Si el Tajo mata, tu siguiente habilidad principal cuesta la mitad de Furia.',
      onKill(g, p, e, kill) {
        if (kill?.skill !== 'g_tajo') return;
        p.addBuff('g_tajo_voraz', { spenderCostPct: T.tajoVoraz.costPct }, T.tajoVoraz.dur, { name: 'Tajo Voraz', icon: '🍖', desc: 'Tu siguiente principal cuesta la mitad de Furia' });
      },
      afterCast(g, p, cast) { if (isSpenderCast(cast) && !cast.echo) dropBuff(p, 'g_tajo_voraz'); },
    },
    // c6A Ensañamiento: +25 % de tus principales al enemigo con más vida de los que alcanzan
    // (los vivos a su alcance desde ti: radio o distancia de la habilidad + 1,5 m)
    g_ensanamiento: {
      name: 'Ensañamiento', desc: 'Tus habilidades principales hacen +25 % al enemigo con más vida de los que golpean.',
      condAdd(p, e, hit) {
        if (!e?.alive || !tagsHave(hit, 'spender')) return 0;
        const prof = p.resolved?.[hit.skill];
        const reach = Math.max(prof?.radius || 0, prof?.range || 0, 2.2) + T.ensanamiento.reach;
        for (const o of enemiesNear(p.game, p.pos, reach)) if (o !== e && o.hp > e.hp) return 0;
        return T.ensanamiento.pct;
      },
    },
    // c6B Sin Cuartel: +5 % por cada enemigo que alcanza la principal (los que rodean al golpeado
    // en el radio de la habilidad, mínimo 2,5 m), hasta +25 %
    g_sin_cuartel: {
      name: 'Sin Cuartel', desc: 'Tus habilidades principales hacen +5 % por cada enemigo que golpean (hasta +25 %).',
      condAdd(p, e, hit) {
        if (!e || !tagsHave(hit, 'spender')) return 0;
        const prof = p.resolved?.[hit.skill];
        const n = enemiesNear(p.game, e.pos, Math.max(T.sinCuartel.radius, prof?.radius || 0)).length || 1;
        return T.sinCuartel.per * Math.min(T.sinCuartel.max, n);
      },
    },
    // c7 Marcha Imparable: imparable mientras usas tu movilidad y 1 s después de llegar
    g_marcha_imparable: {
      name: 'Marcha Imparable', desc: 'Mientras usas tu movilidad y 1 s después eres imparable: nada te aturde ni te frena.',
      onCast(g, p, cast) {
        if (!isMoveCast(cast)) return;
        const travel = cast.sk?.dashT || cast.sk?.airT || 0.5;
        p.unstoppableT = Math.max(p.unstoppableT || 0, travel + 0.1);
      },
      afterCast(g, p, cast) { if (isMoveCast(cast)) p.unstoppableT = Math.max(p.unstoppableT || 0, T.marcha); },
    },
    // c9A Golpe Pesado (el +0,3 s, el +40 % y el +25 % de la suelta perfecta son mods del nodo):
    // a los jefes, 15 de Quebranto por golpe preparado o suelta perfecta (una vez por enemigo e instante)
    // S-guerrero (G07, opción c de la auditoría): el Juicio no se alarga (se queda en sus 0,3 s; el +40 % sí)
    g_golpe_pesado: {
      name: 'Golpe Pesado', desc: 'Tus golpes con preparación y tus sueltas perfectas llenan 15 de Quebranto a los jefes.',
      state: () => ({ at: -1, seen: new Set() }),
      modifyResolve(p, sk, prof) {
        const w0 = prof.def?.windup || 0;
        if (sk.id === 'g_juicio' && w0 > 0 && prof.windup > 0) prof.windup *= w0 / (w0 + T.golpePesadoAdd);
      },
      onHit(g, p, e, hit) {
        if (!direct(hit) || hit.echo || hit.repeat || !isBoss(e)) return;
        const prof = p.resolved?.[hit.skill];
        const step = hit.step > 0 ? prof?.def?.steps?.[hit.step - 1] : null;
        const prepared = (step ? step.windup || 0 : prof?.windup || 0) > 0;
        if (!prepared && !hit.perfect) return;
        const st = powerState(p, 'g_golpe_pesado');
        if (st.at !== now(p)) { st.at = now(p); st.seen = new Set(); }
        if (st.seen.has(e)) return;
        st.seen.add(e);
        e.addStagger?.(T.golpePesado, p);
      },
    },
    // c9B Sin Pausa (la mitad de preparación y moverte a velocidad normal: mods del nodo):
    // prepararte o cargar no rompe el plantado
    g_sin_pausa: {
      name: 'Sin Pausa', desc: 'Te mueves al prepararte o al cargar sin dejar de estar plantado.',
      modifyResolve(p, sk, prof) { if (prof.windup > 0 || prof.charge || (prof.def?.steps || []).some(s => s.windup > 0)) prof.keepPlanted = true; },
    },
    // c10A Derribo: cada 8 s, tu siguiente golpe derriba 1 s (a los jefes: 20 de Quebranto)
    g_derribo: {
      name: 'Derribo', desc: 'Cada 8 s, tu siguiente golpe derriba 1 s (a los jefes les llena 20 de Quebranto).',
      icd: T.derribo.icd,
      onHit(g, p, e, hit) {
        if (!direct(hit) || !e?.alive) return false;
        if (isBoss(e)) e.addStagger?.(T.derribo.stagger, p);
        else e.applyCC?.('stun', T.derribo.stun, { src: p });
        g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.6), '¡DERRIBO!', 'txt-crit');
      },
    },
    // c10B Silenciar: cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo y deja mudo 3 s
    // (a los jefes, además, el Quebranto de interrumpir)
    g_silenciar: {
      name: 'Silenciar', desc: 'Cada 10 s, tu siguiente Lanza Arrojadiza corta el hechizo del enemigo y lo deja mudo 3 s.',
      icd: T.silenciar.icd,
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'g_lanza' || !direct(hit) || !e?.alive) return false;
        if (!(e.applyCC?.('interrupt', T.silenciar.dur, { src: p }) > 0)) return false;
        g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.6), '¡SILENCIO!', 'txt-crit');
      },
    },
    // c11A Segundo Aliento (concede la activa): si no está en la barra, cada Piel de Hierro la
    // lanza al 50 %: gasta la mitad de tu Furia y cura 1 % por cada 3 gastados (pone su recarga de
    // 30 s con g.startCooldown, la misma que si la lanzaras; esa Furia no cuenta como gastada)
    g_piel_aliento: {
      name: 'Segundo Aliento', desc: 'Si Segundo Aliento no está en la barra, sale con Piel de Hierro al 50 %.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'g_t_aliento')) return;
        const sk = skillOf(p, 'g_t_aliento');
        if (!sk || (p.cds?.[sk.id] || 0) > 0) return;
        const per = sk.furyPerPct || 3;
        const fury = (p.mp || 0) * T.pielHalf;
        if (fury < per * T.pielHalf) return;
        spendResource(p, fury);
        const prof = profOf(g, p, sk.id);
        g.heal(p.stats.maxHP * (fury / per) / 100 * (prof.buffMul || 1), { target: 'self', src: 'g_piel_aliento' });
        g.startCooldown(p, sk.id, prof.cd || sk.cd || 30);
      },
    },
    // c11B Coraza de Hierro: al bajar del 30 % de vida, −30 % de daño recibido 5 s (cada 60 s)
    g_coraza_hierro: {
      name: 'Coraza de Hierro', desc: 'Al bajar del 30 % de vida recibes −30 % de daño durante 5 s. Una vez cada 60 s.',
      icd: T.coraza.icd,
      onDamaged(g, p, dmg) {
        const max = p.stats.maxHP;
        if (!(dmg.amount > 0) || p.hp / max < T.coraza.below || (p.hp - dmg.amount) / max >= T.coraza.below) return false;
        p.addBuff('g_coraza_hierro', { dr: T.coraza.dr }, T.coraza.dur, { name: 'Coraza de Hierro', icon: '🛡️', desc: `−${T.coraza.dr}% de daño recibido` });
        g.ui?.spawnText?.(p.pos, '¡CORAZA!', 'txt-heal');
        fxAt(g, 'ironSkin', p.pos, 1.0);
        return true;
      },
    },
    // c14A Polvareda: al llegar con tu movilidad, ralentizas un 50 % 3 s a todos a 3 m (en una
    // cadena de relanzamientos, solo el primer uso)
    g_polvareda: {
      name: 'Polvareda', desc: 'Al llegar con tu movilidad, ralentizas un 50 % durante 3 s a todos a 3 m.',
      afterCast(g, p, cast) {
        if (!isMoveCast(cast) || cast.echo || cast.recast) return;
        for (const e of enemiesNear(g, p.pos, T.polvareda.radius)) e.applyCC?.('slow', T.polvareda.dur, { pct: T.polvareda.pct, src: p });
        g.spawnRing?.(p.pos, T.polvareda.radius, 0xc8b08a);
      },
    },
    // c14B Carga Reparadora: tu movilidad te quita las ralentizaciones y te cura un 6 % (sustento,
    // una vez cada 6 s; en una cadena, solo el primer uso)
    g_carga_reparadora: {
      name: 'Carga Reparadora', desc: 'Tu movilidad te quita las ralentizaciones y te cura un 6 % de la vida (una vez cada 6 s).',
      state: () => ({ healAt: -99 }),
      afterCast(g, p, cast) {
        if (!isMoveCast(cast) || cast.echo || cast.recast) return;
        p.cleanse?.();
        const st = powerState(p, 'g_carga_reparadora');
        if (now(p) - st.healAt < T.reparadora.icd - 1e-9) return;
        st.healAt = now(p);
        if (p.sustain(p.stats.maxHP * T.reparadora.healPct / 100, 'g_carga_reparadora') > 0) g.ui?.spawnText?.(p.pos, '+❤️', 'txt-heal');
      },
    },
    // c15A Furia Protectora: el 20 % del daño que recibes lo pagas con Furia (1 por cada 0,5 % de
    // tu vida); sin Furia, con vida. Esa Furia no cuenta como gastada
    g_furia_protectora: {
      name: 'Furia Protectora', desc: 'El 20 % del daño que recibes lo pagas con Furia: 1 de Furia por cada 0,5 % de tu vida.',
      onDamaged(g, p, dmg) {
        const max = p.stats?.maxHP || 0;
        if (!(dmg.amount > 0) || !(max > 0) || !((p.mp || 0) > 0)) return;
        const perFury = max * T.protectora.hpPctPerFury / 100;
        const fury = Math.min(p.mp, dmg.amount * T.protectora.share / 100 / perFury);
        if (!(fury > 0) || !spendResource(p, fury)) return;
        dmg.amount -= fury * perFury;
      },
    },
    // c15B Furia Desbordante (Furia máxima +30: stat mp del nodo): por encima de 100, +10 % de daño
    g_desbordante: {
      name: 'Furia Desbordante', desc: 'Por encima de 100 de Furia, haces +10 % de daño.',
      condAdd(p) { return (p.mp || 0) > T.desbordante.over ? T.desbordante.dmgPct : 0; },
    },
    // c17A Grito de Guerra (la activa la concede el nodo): si no está en la barra, cada Piel de
    // Hierro lo lanza al 50 %: +15 de Furia y +5 % de daño al grupo a 15 m 8 s (pone su recarga de
    // 20 s con g.startCooldown)
    g_piel_grito: {
      name: 'Grito de Guerra', desc: 'Si Grito de Guerra no está en la barra, sale con Piel de Hierro al 50 %.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'grito_guerra')) return;
        const sk = skillOf(p, 'grito_guerra');
        if (!sk || (p.cds?.[sk.id] || 0) > 0) return;
        const prof = profOf(g, p, sk.id);
        g.gainResource(p, (prof.gen || sk.gen || 30) * T.pielHalf);
        const buff = {};
        for (const [k, v] of Object.entries(prof.buff || sk.buff || {})) buff[k] = Math.round(v * T.pielHalf);
        const meta = { name: sk.name, icon: sk.icon, desc: `+${buff.dmgPct || 0}% de daño` };
        for (const a of g.allies ? g.allies(p.pos, sk.allyRadius || 15) : [p]) a.addBuff?.(sk.id, { ...buff }, prof.dur || sk.dur || 8, meta);
        g.startCooldown(p, sk.id, prof.cd || sk.cd || 20);
      },
    },
    // c17B Ira Contenida: cada 20 s, tu siguiente principal no cuesta Furia y hace +20 % (buff que
    // la marca; la gasta la principal)
    g_ira_contenida: {
      name: 'Ira Contenida', desc: 'Cada 20 s, tu siguiente habilidad principal no cuesta Furia y hace +20 %.',
      state: () => ({ nextAt: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'g_ira_contenida');
        if (buffOf(p, 'g_ira_contenida') || now(p) < st.nextAt - 1e-9) return;
        p.addBuff('g_ira_contenida', { spenderCostPct: -100 }, 3600, { name: 'Ira Contenida', icon: '💢', desc: `Tu siguiente principal no cuesta Furia y hace +${T.iraContenida.dmgPct}%` });
      },
      condAdd(p, e, hit) { return tagsHave(hit, 'spender') && buffOf(p, 'g_ira_contenida') ? T.iraContenida.dmgPct : 0; },
      afterCast(g, p, cast) {
        if (!isSpenderCast(cast) || cast.echo || !dropBuff(p, 'g_ira_contenida')) return;
        powerState(p, 'g_ira_contenida').nextAt = now(p) + T.iraContenida.every;
      },
    },
    // c19 Temple: con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s
    // (hasta 3 s más por Piel)
    g_temple: {
      name: 'Temple', desc: 'Con Piel de Hierro puesta, cada Tajo te da 3 de Furia más y la alarga 0,25 s (hasta 3 s más).',
      state: () => ({ at: -1, buff: null, ext: 0 }),
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'g_tajo' || !direct(hit)) return;
        const b = buffOf(p, 'g_piel');
        const st = powerState(p, 'g_temple');
        if (!b || st.at === now(p)) return;
        st.at = now(p);
        if (st.buff !== b) { st.buff = b; st.ext = 0; }
        g.gainResource(p, T.temple.fury);
        const add = Math.min(T.temple.ext, T.temple.maxExt - st.ext);
        if (add > 0) { b.t += add; b.dur = (b.dur || 0) + add; st.ext += add; }
      },
    },
    // c20 Desequilibrio: tus críticos ralentizan un 30 % 2 s; contra ralentizados, tus principales
    // tienen +10 % de crítico
    g_desequilibrio: {
      name: 'Desequilibrio', desc: 'Tus críticos ralentizan un 30 % durante 2 s; contra ralentizados, tus principales tienen +10 % de crítico.',
      onHit(g, p, e, hit) { if (hit?.crit && direct(hit) && e?.alive) e.applyCC?.('slow', T.desequilibrio.dur, { pct: T.desequilibrio.slowPct, src: p }); },
      condCrit(p, e, hit) { return tagsHave(hit, 'spender') && ((e?.slowT || 0) > 0 || (e?.frozenT || 0) > 0) ? T.desequilibrio.crit : 0; },
    },
    // c21 Persecución: tu movilidad hace +50 % a los ralentizados o aturdidos (en cada salto)
    g_persecucion: {
      name: 'Persecución', desc: 'Tu movilidad hace +50 % de daño a los enemigos ralentizados o aturdidos.',
      condAdd(p, e, hit) {
        if (!e || !tagsHave(hit, 'movement')) return 0;
        return (e.slowT || 0) > 0 || (e.stunT || 0) > 0 || (e.frozenT || 0) > 0 ? T.persecucion : 0;
      },
    },
    // c22A Intervención (concede la activa): si no está en la barra, cada Piel de Hierro da, sin
    // salto, un escudo del 8 % de tu vida a ti y al aliado más cercano (pone su recarga de 20 s con
    // g.startCooldown)
    g_piel_intervencion: {
      name: 'Intervención', desc: 'Si Intervención no está en la barra, sale con Piel de Hierro al 50 %, sin salto.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'g_t_intervencion')) return;
        const sk = skillOf(p, 'g_t_intervencion');
        if (!sk || (p.cds?.[sk.id] || 0) > 0) return;
        const prof = profOf(g, p, sk.id);
        const amt = Math.round((sk.shieldPct || 15) * T.pielHalf) / 100 * p.stats.maxHP * (prof.buffMul || 1);
        const dur = prof.dur || sk.dur || 6;
        g.shield(amt, { target: 'self', dur, src: 'g_piel_intervencion' });
        let ally = null, bd = Infinity;
        for (const a of others(g, p, Infinity)) { const d = a.pos.distanceTo(p.pos); if (d < bd) { bd = d; ally = a; } }
        ally?.addShield?.(amt, dur, 'g_piel_intervencion');
        g.startCooldown(p, sk.id, prof.cd || sk.cd || 20);
      },
    },
    // c22B Hermandad de Armas: +5 % de daño y +8 % de vida a ti y a los aliados a 15 m; +5 % de
    // Furia generada por aliado cerca (máx. 3; 0 en solitario)
    g_aura_hermandad: {
      name: 'Hermandad de Armas', desc: 'Tú y los aliados a 15 m: +5 % de daño y +8 % de vida máxima. +5 % de Furia por aliado cerca (máx. 3).',
      state: () => ({ acc: 0, near: 0 }),
      stats: () => ({ dmgPct: T.brother.dmgPct, hpPct: T.brother.hpPct }),
      // pulso de 0,5 s: renueva el aura de los aliados a 15 m y cuenta cuántos hay (máx. 3)
      onTick(g, p, dt) {
        const st = powerState(p, 'g_aura_hermandad');
        st.acc += dt;
        if (st.acc < 0.5 - 1e-9) return;
        st.acc = 0;
        const list = others(g, p, T.brother.radius);
        st.near = Math.min(T.brother.maxAllies, list.length);
        for (const a of list) keepBuff(a, 'g_aura_hermandad', { dmgPct: T.brother.dmgPct, hpPct: T.brother.hpPct }, 0.65,
          { name: 'Hermandad de Armas', icon: '🤝', desc: `+${T.brother.dmgPct}% de daño y +${T.brother.hpPct}% de vida` });
      },
      // ⑪ Furia REALMENTE ganada × 5 % por aliado cerca (silent: no se realimenta)
      onResource(g, p, n) {
        const near = powerState(p, 'g_aura_hermandad').near;
        if (near > 0 && n > 0) g.gainResource(p, n * T.brother.furyPct / 100 * near, { silent: true });
      },
    },
    // c23 Ritmo de Combate (rango r): cada crítico del Tajo recarga 0,5·r s de tu movilidad y de
    // Piel de Hierro (una vez por instante). Por cutCd: el suelo de 4 s del Sendero y de la Carga
    // con Avalancha, y las «seguidas» del Salto. noteStart: el inicio de la recarga de la movilidad
    g_ritmo_combate: {
      name: 'Ritmo de Combate', desc: 'Cada crítico del Tajo recarga tu movilidad y Piel de Hierro.',
      state: () => ({ at: -1 }),
      afterCast(g, p, cast) { noteStart(p, cast); },
      onHit(g, p, e, hit) {
        if (!hit?.crit || !direct(hit) || !tagsHave(hit, 'basic')) return;
        const st = powerState(p, 'g_ritmo_combate');
        if (st.at === now(p)) return;
        st.at = now(p);
        const s = T.ritmoCombate * rankOf(p, 'g_ritmo_combate');
        moveCut(g, p, s);
        cutCd(g, p, 'g_piel', s);
      },
    },
    // c25 Rencor (rango r): al acabar Piel de Hierro, devuelves el 10·r % del daño que evitó a
    // los enemigos a 4 m
    g_rencor: {
      name: 'Rencor', desc: 'Al acabar Piel de Hierro, devuelves un 10 % por rango del daño que evitó a los enemigos a 4 m.',
      state: () => ({ buff: null, prevented: 0 }),
      onDamaged(g, p, dmg) {
        const st = powerState(p, 'g_rencor');
        const b = buffOf(p, 'g_piel');
        if (!b) return;
        if (st.buff !== b) { st.buff = b; st.prevented = 0; }
        st.prevented += pielPrevented(p, dmg.amount);
      },
      onTick(g, p) {
        const st = powerState(p, 'g_rencor');
        const b = buffOf(p, 'g_piel');
        if (b) { if (st.buff !== b) { st.buff = b; st.prevented = 0; } return; }
        if (!st.buff) return;
        const total = st.prevented * T.rencor.pctPerRank * rankOf(p, 'g_rencor') / 100;
        st.buff = null; st.prevented = 0;
        if (!(total > 0) || !p.alive) return;
        for (const e of enemiesNear(g, p.pos, T.rencor.radius)) dealProcDamage(g, e, total, { source: 'power:g_rencor' });
        g.spawnRing?.(p.pos, T.rencor.radius, 0x9fc4ff);
      },
    },
    // c26 Desenfreno (rango r): si PAGAS 80 de Furia en 4 s, +(4 + 8·r) % de daño 4 s
    g_ira_gasto: {
      name: 'Desenfreno', desc: 'Si gastas 80 de Furia en 4 s, haces más daño durante 4 s.',
      state: () => ({ log: [] }),
      afterCast(g, p, cast) {
        const paid = furyPaid(cast);
        if (!(paid > 0)) return;
        const st = powerState(p, 'g_ira_gasto');
        st.log = st.log.filter(x => now(p) - x.t <= T.desenfreno.window + 1e-9);
        st.log.push({ t: now(p), n: paid });
        if (st.log.reduce((a, x) => a + x.n, 0) < T.desenfreno.need - 1e-9) return;
        st.log = [];
        const pct = T.desenfreno.base + T.desenfreno.perRank * rankOf(p, 'g_ira_gasto');
        p.addBuff('g_ira_gasto', { dmgPct: pct }, T.desenfreno.dur, { name: 'Desenfreno', icon: '🔥', desc: `+${pct}% de daño` });
      },
    },
    // c27 Rugido de Carga (rango r): al llegar con tu movilidad, los enemigos a 5 m hacen un 8·r %
    // menos de daño 4 s (en una cadena, solo el primer uso)
    g_rugido_carga: {
      name: 'Rugido de Carga', desc: 'Al llegar con tu movilidad, los enemigos a 5 m hacen menos daño durante 4 s.',
      afterCast(g, p, cast) {
        if (!isMoveCast(cast) || cast.echo || cast.recast) return;
        const pct = T.rugido.pctPerRank * rankOf(p, 'g_rugido_carga');
        for (const e of enemiesNear(g, p.pos, T.rugido.radius)) e.weakenOutgoing?.('g_rugido_carga', pct, T.rugido.dur);
      },
    },
    // c28 Inquebrantable (final, rango r): Piel de Hierro no caduca por tiempo: dura hasta evitar
    // daño por un (25 + 15·r) % de tu vida y vuelve 15 s después de romperse (g.startCooldown: la
    // ranura enseña esa recarga); con ella, generas un 10·r % más de Furia
    g_inquebrantable: {
      name: 'Inquebrantable', desc: 'Piel de Hierro dura hasta evitar daño por una parte de tu vida; vuelve 15 s después y te da más Furia.',
      state: () => ({ buff: null, prevented: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel') return;
        if (buffOf(p, 'g_piel')) { g.ui?.message?.('Piel de Hierro ya está puesta'); return false; }
      },
      onTick(g, p) {
        const b = buffOf(p, 'g_piel');
        if (!b) return;
        const st = powerState(p, 'g_inquebrantable');
        if (st.buff !== b) { st.buff = b; st.prevented = 0; }
        b.t = Math.max(b.t, 1); b.dur = Math.max(b.dur || 0, b.t);   // sin caducidad por tiempo
      },
      onDamaged(g, p, dmg) {
        const b = buffOf(p, 'g_piel');
        if (!b) return;
        const st = powerState(p, 'g_inquebrantable');
        if (st.buff !== b) { st.buff = b; st.prevented = 0; }
        st.prevented += pielPrevented(p, dmg.amount);
        const r = rankOf(p, 'g_inquebrantable');
        if (st.prevented < p.stats.maxHP * (T.inquebrantable.base + T.inquebrantable.perRank * r) / 100 - 1e-9) return;
        st.buff = null; st.prevented = 0;
        dropBuff(p, 'g_piel');
        g.startCooldown(p, 'g_piel', T.inquebrantable.cd);
        g.ui?.spawnText?.(p.pos, 'Piel rota', 'txt-dmg-player');
      },
      onResource(g, p, n) {
        if (!(n > 0) || !buffOf(p, 'g_piel')) return;
        g.gainResource(p, n * T.inquebrantable.furyPerRank * rankOf(p, 'g_inquebrantable') / 100, { silent: true, raw: true });
      },
    },
    // c29 Señor de la Guerra (final, rango r): cada 100 de Furia PAGADA, tu siguiente principal
    // sale dos veces; la copia (repetición del núcleo: gratis, no activa otros efectos) al
    // (20 + 20·r) %; con cargar y soltar, con la misma carga
    g_senor_guerra: {
      name: 'Señor de la Guerra', desc: 'Cada 100 de Furia gastada, tu siguiente principal sale dos veces.',
      state: () => ({ spent: 0, ready: false }),
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_senor_guerra');
        if (st.ready && isSpenderCast(cast) && !cast.echo && cast.slot) {
          st.ready = false;
          dropBuff(p, 'g_senor_guerra');
          let mul = (T.senorGuerra.base + T.senorGuerra.perRank * rankOf(p, 'g_senor_guerra')) / 100;
          // la repetición de una carga sale entera: se escala a la carga del original
          const ch = cast.prof?.charge;
          if (ch && cast.charge) {
            const full = chargeRelease(ch, ch.max, { def: cast.sk }).coefMul;
            if (full > 0) mul *= chargeRelease(ch, cast.charge.t, { def: cast.sk }).coefMul / full;
          }
          const slot = cast.slot, id = cast.sk.id;
          g.timers?.schedule(T.senorGuerra.delay, () => { if (p.alive && p.hotbar?.[slot] === id) g.castSkillSlot(slot, mul); });
        }
        const paid = furyPaid(cast);
        if (!(paid > 0) || st.ready) return;
        st.spent += paid;
        if (st.spent < T.senorGuerra.every - 1e-9) return;
        st.spent -= T.senorGuerra.every;
        st.ready = true;
        p.addBuff('g_senor_guerra', {}, 3600, { name: 'Señor de la Guerra', icon: '⚔️', desc: 'Tu siguiente principal sale dos veces' });
      },
    },
    // c30 Asalto Total (final, rango r): tras tu movilidad (primer uso de la cadena), la siguiente
    // principal es gratis y +15·r %; si mata, tu movilidad recupera media recarga (cada 6 s)
    g_asalto_total: {
      name: 'Asalto Total', desc: 'Tras tu movilidad, la siguiente principal es gratis y hace más daño; si mata, tu movilidad recupera media recarga.',
      state: () => ({ refundAt: -99 }),
      condAdd(p, e, hit) {
        if (hit?.skill === 'terremoto' && powerState(p, 'g_d_pisoton').cast) return 0;     // Pisotón (d6): gratis, sin su +%
        return tagsHave(hit, 'spender') && buffOf(p, 'g_asalto_total') ? T.asalto.perRank * rankOf(p, 'g_asalto_total') : 0;
      },
      afterCast(g, p, cast, res) {
        if (cast?.echo) return;
        noteStart(p, cast);
        if (isMoveCast(cast) && !cast.recast) {
          p.addBuff('g_asalto_total', { spenderCostPct: -100 }, T.asalto.dur, { name: 'Asalto Total', icon: '🏇', desc: 'Tu siguiente principal es gratis y hace más daño' });
          return;
        }
        if (!isSpenderCast(cast) || !dropBuff(p, 'g_asalto_total')) return;
        const st = powerState(p, 'g_asalto_total');
        if (!(res?.killed > 0) || now(p) - st.refundAt < T.asalto.icd - 1e-9) return;
        const sk = myMovement(p);
        const left = sk ? p.cds?.[sk.id] || 0 : 0;
        if (left > 0 && moveCut(g, p, left * T.asalto.refund) > 0) st.refundAt = now(p);
      },
    },

    // ---------------- ÁRBOL HÉROE · TITÁN (h1, §9.2) ----------------
    // t0 Golpe de Titán: cada 60 de Furia PAGADA (50 con Ira Acumulada), tu siguiente principal
    // hace +40 % (+80 % con Aplastar) y sacude el suelo a 4 m (7 m con Sacudida Amplia) al 50 %; a
    // los jefes que golpea, 15 de Quebranto (25 con Aplastar). Las repeticiones no lo gastan ni lo
    // cargan. El Bramido de Titán (t4A) deja el siguiente listo
    g_ti_golpe_titan: {
      name: 'Golpe de Titán', desc: 'Cada 60 de Furia gastada, tu siguiente principal hace +40 % y sacude el suelo.',
      priority: 3,
      state: () => ({ spent: 0, ready: false, cast: null, skill: null, at: -99, strike: null, staggered: null }),
      onCast(g, p, cast) {
        const st = powerState(p, 'g_ti_golpe_titan');
        if (st.cast && now(p) - st.at > T.titan.pending) { st.cast = null; arm(p, st); }   // el anterior se anuló
        if (!st.ready || st.cast || !isSpenderCast(cast) || cast.echo) return;
        st.ready = false; st.cast = cast; st.skill = cast.sk.id; st.at = now(p); st.staggered = new Set();
        dropBuff(p, 'g_ti_golpe_titan');
      },
      condAdd(p, e, hit) { return titanPending(p, hit?.skill) ? T.titan.pct + (p.tv?.titanPct || 0) : 0; },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'g_ti_golpe_titan');
        if (!direct(hit) || !titanPending(p, hit.skill) || !isBoss(e) || st.staggered?.has(e)) return;
        st.staggered.add(e);
        e.addStagger?.(T.titan.stagger + (p.tv?.titanStagger || 0), p);
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_ti_golpe_titan');
        if (cast?.sk?.id === 'g_h_bramido' && !st.cast) arm(p, st);
        if (st.cast && st.cast === cast) {
          const center = p.pos.clone();
          const hit = titanShake(g, p, center, 1, cast.sk.id);
          st.strike = { t: now(p), cast, center, hit, target: cast.enemy?.alive ? cast.enemy : null };
          st.cast = null; st.skill = null;
          g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡TITÁN!', 'txt-crit');
        }
        const paid = furyPaid(cast);
        if (!(paid > 0)) return;
        const every = Math.max(1, T.titan.every - (p.tv?.titanCostRed || 0));
        st.spent = Math.min(every, st.spent + paid);
        if (st.spent >= every - 1e-9 && !st.ready && !st.cast) { st.spent = 0; arm(p, st); }
      },
      onTick(g, p) {
        const st = powerState(p, 'g_ti_golpe_titan');
        if (st.cast && now(p) - st.at > T.titan.pending) { st.cast = null; st.skill = null; arm(p, st); }
      },
    },
    // t3 Aplomo: tras un Golpe de Titán, imparable 3 s
    g_ti_aplomo: {
      name: 'Aplomo', desc: 'Tras un Golpe de Titán, nada te derriba, aturde ni ralentiza durante 3 s.',
      afterCast(g, p, cast) { if (titanStrike(p, cast)) p.unstoppableT = Math.max(p.unstoppableT || 0, T.aplomo); },
    },
    // t4B Piel de Montaña: cada Golpe de Titán te da un escudo del 8 % de tu vida 5 s
    g_ti_piel_montana: {
      name: 'Piel de Montaña', desc: 'Cada Golpe de Titán te da un escudo del 8 % de tu vida durante 5 s.',
      afterCast(g, p, cast) {
        if (titanStrike(p, cast)) g.shield(p.stats.maxHP * T.pielMontana.pct / 100, { target: 'self', dur: T.pielMontana.dur, src: 'g_ti_piel_montana' });
      },
    },
    // t6 Eco Pétreo: la sacudida se repite 1 s después al 50 %
    g_ti_eco_petreo: {
      name: 'Eco Pétreo', desc: 'La sacudida del Golpe de Titán se repite 1 s después al 50 %.',
      afterCast(g, p, cast) {
        const s = titanStrike(p, cast);
        if (!s) return;
        const c = s.center.clone();
        g.timers?.schedule(T.eco.delay, () => { if (p.alive) titanShake(g, p, c, T.eco.mul); });
      },
    },
    // t7 Quiebrahuesos: los jefes Quebrantados reciben +15 % de tu daño
    g_ti_quiebrahuesos: {
      name: 'Quiebrahuesos', desc: 'Los jefes Quebrantados reciben +15 % de tu daño.',
      condAdd(p, e) { return isBoss(e) && (e.staggerBrokenT || 0) > 0 ? T.quiebrahuesos : 0; },
    },
    // t8A Derrumbe: si el Golpe de Titán (o su sacudida) mata, el enemigo estalla: 100 % a 3 m
    g_ti_derrumbe: {
      name: 'Derrumbe', desc: 'Si el Golpe de Titán mata, el enemigo estalla: 100 % a todos a 3 m.',
      onKill(g, p, e, kill) {
        if (kill?.nested || !titanPending(p, kill?.skill) || !e?.pos) return;
        const dmg = p.avgHit(T.derrumbe.coef);
        for (const o of enemiesNear(g, e.pos, T.derrumbe.radius)) if (o !== e) dealProcDamage(g, o, dmg, { source: 'power:g_ti_derrumbe', tags: new Set(['area']) });
        g.spawnRing?.(e.pos, T.derrumbe.radius, 0xc8a070);
      },
    },
    // t8B Mole: cada Golpe de Titán seguido sobre el mismo enemigo, +20 % más (hasta +40 %)
    g_ti_mole: {
      name: 'Mole', desc: 'Cada Golpe de Titán seguido sobre el mismo enemigo hace +20 % más (hasta +40 %).',
      state: () => ({ target: null, n: 0 }),
      condAdd(p, e, hit) {
        const st = powerState(p, 'g_ti_mole');
        return st.target && e === st.target && titanPending(p, hit?.skill) ? T.mole.per * st.n : 0;
      },
      afterCast(g, p, cast) {
        const s = titanStrike(p, cast);
        if (!s) return;
        const st = powerState(p, 'g_ti_mole');
        if (s.target && s.target === st.target) st.n = Math.min(T.mole.max, st.n + 1);
        else { st.target = s.target; st.n = s.target ? 1 : 0; }
      },
    },
    // t9 Temblor: los alcanzados por la sacudida hacen un 10 % menos de daño 4 s (lo aplica la
    // sacudida, titanShake, también la del Eco Pétreo y la del Coloso)
    g_ti_temblor: {
      name: 'Temblor', desc: 'Los alcanzados por la sacudida hacen un 10 % menos de daño durante 4 s.',
    },
    // t11 Peso Acumulado: cada Golpe de Titán acorta 1 s la recarga de tu definitiva (con su suelo)
    g_ti_peso: {
      name: 'Peso Acumulado', desc: 'Cada Golpe de Titán acorta 1 s la recarga de tu definitiva.',
      afterCast(g, p, cast) {
        noteStart(p, cast);
        if (titanStrike(p, cast)) ultCut(g, p, T.peso);
      },
    },
    // t12 Coloso Despierto (final): cada 30 s, tu siguiente Golpe de Titán te hace gigante 8 s:
    // todos tus golpes sacuden el suelo al 50 % (una sacudida por instante)
    g_ti_coloso: {
      name: 'Coloso Despierto', desc: 'Cada 30 s, tu siguiente Golpe de Titán te hace gigante 8 s: todos tus golpes sacuden el suelo.',
      state: () => ({ nextAt: 0, at: -1 }),
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_ti_coloso');
        if (!titanStrike(p, cast) || now(p) < st.nextAt - 1e-9) return;
        st.nextAt = now(p) + T.coloso.icd;
        p.addBuff('g_ti_coloso', {}, T.coloso.dur, { name: 'Coloso Despierto', icon: '🗿', desc: 'Todos tus golpes sacuden el suelo' });
      },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'g_ti_coloso');
        if (!direct(hit) || !buffOf(p, 'g_ti_coloso') || st.at === now(p) || !e?.pos) return;
        st.at = now(p);
        titanShake(g, p, e.pos.clone(), T.coloso.mul);
      },
    },

    // ---------------- ÁRBOL HÉROE · GLADIADOR (h2, §9.3) ----------------
    // l0 Rival: tu primer golpe nombra Rival al enemigo 10 s: le haces +15 %. Si muere, +20 de
    // Furia y el Rival pasa al más cercano. Muchos Rivales (l2A): 3 a la vez a +10 %; Duelo a
    // Muerte (l2B): +30 % y solo cambia al morir. Desafío de Arena (l4A): +20 % 8 s más a tu Rival.
    // Ovación (tv.rivalKillHeal): un Rival élite o jefe muerto o Quebrantado te cura un 10 %; uno
    // normal, un 2 % (cada 2 s). Anota nombramientos, muertes y Quebrantos para los demás nodos
    g_gl_rival: {
      name: 'Rival', desc: 'Tu primer golpe nombra Rival al enemigo: le haces más daño y, si muere, ganas Furia.',
      priority: 3,
      state: () => ({ rivals: [], events: [], seq: 0, death: null, healAt: -99 }),
      onHit(g, p, e, hit) {
        if (!direct(hit) || !e?.alive) return;
        const st = rivalState(p);
        pruneRivals(p, st);
        if (!rivalOf(p, e) && st.rivals.length < rivalCap(p)) nameRival(g, p, st, e);
      },
      condAdd(p, e) { return isRival(p, e) ? rivalPct(p) : 0; },
      onKill(g, p, e, kill) {
        const st = rivalState(p);
        const r = rivalOf(p, e);
        if (!r) return;
        st.rivals = st.rivals.filter(x => x !== r);
        const elite = isEliteOrBoss(e);
        st.death = { e, t: now(p), elite };
        g.gainResource(p, T.rival.fury);
        rivalHeal(g, p, st, elite);
        // el Rival pasa al más cercano (que aún no lo sea)
        let best = null, bd = T.rival.pass * T.rival.pass;
        for (const o of g.enemies || []) {
          if (!o.alive || o === e || rivalOf(p, o)) continue;
          const d = o.pos.distanceToSquared(e.pos);
          if (d < bd) { bd = d; best = o; }
        }
        if (best && st.rivals.length < rivalCap(p)) nameRival(g, p, st, best);
        void kill;
      },
      onTick(g, p) {
        const st = rivalState(p);
        pruneRivals(p, st);
        for (const r of st.rivals) {
          const b = r.e.staggerBreaks || 0;
          if (b <= r.breaks) continue;
          r.breaks = b;
          pushRivalEvent(st, { kind: 'broke', e: r.e, t: now(p) });
          rivalHeal(g, p, st, true);
        }
      },
      // Desafío de Arena (l4A): el lanzamiento nombra Rival al de la mira (si no tienes); su +20 %
      // es la Debilidad de la marca del catálogo (no se suma otro aquí). noteStart: suelos de recarga
      afterCast(g, p, cast) {
        noteStart(p, cast);
        if (cast?.sk?.id !== 'g_h_desafio' || cast.echo) return;
        const st = rivalState(p);
        pruneRivals(p, st);
        if (!st.rivals.length) {
          const e = cast.enemy?.alive ? cast.enemy : g.nearestEnemy?.(T.rival.arenaReach);
          if (e) nameRival(g, p, st, e);
        }
      },
    },
    // l2A Muchos Rivales y l2B Duelo a Muerte: cambian cuántos Rivales hay y cuánto pagan (lo lee
    // el Rival)
    g_gl_rivales: { name: 'Muchos Rivales', desc: 'Tienes 3 Rivales a la vez, a +10 % cada uno.' },
    g_gl_duelo: { name: 'Duelo a Muerte', desc: 'Tu Rival recibe +30 %, pero solo cambia cuando muere.' },
    // l3 Tiro de Arena: al nombrar un Rival, le arrojas gratis una Lanza Arrojadiza que lo
    // ralentiza un 40 % 3 s (una vez cada 4 s)
    g_gl_tiro_arena: {
      name: 'Tiro de Arena', desc: 'Al nombrar un Rival, le arrojas gratis una Lanza Arrojadiza que lo ralentiza.',
      state: () => ({ at: -99 }),
      onTick(g, p) {
        const st = powerState(p, 'g_gl_tiro_arena');
        for (const ev of rivalEvents(p, st, 'named')) {
          if (!ev.e?.alive || now(p) - st.at < T.tiroArena.icd - 1e-9) continue;
          st.at = now(p);
          freeLance(g, p, ev.e, { slowPct: T.tiroArena.slowPct, slowDur: T.tiroArena.dur, src: 'g_gl_tiro_arena' });
        }
      },
    },
    // l4B Contraataque: tras esquivar, tu siguiente golpe en 2 s hace +60 % y te cura un 5 %
    // (el primer instante que golpea se lo lleva entero; la cura por p.sustain)
    g_gl_contraataque: {
      name: 'Contraataque', desc: 'Tras esquivar, tu siguiente golpe en 2 s hace +60 % y te cura un 5 %.',
      state: () => ({ dodging: false, until: -99, usedAt: null, healed: false }),
      onTick(g, p) {
        const st = powerState(p, 'g_gl_contraataque');
        if (dodgedNow(p, st)) { st.until = now(p) + (p.dodgeT || 0) + T.contraataque.win; st.usedAt = null; st.healed = false; }
        if (st.usedAt != null && st.usedAt < now(p)) { st.until = -99; st.usedAt = null; }
      },
      condAdd(p) {
        const st = powerState(p, 'g_gl_contraataque');
        if (now(p) > st.until || (st.usedAt != null && st.usedAt !== now(p))) return 0;
        st.usedAt = now(p);
        return T.contraataque.pct;
      },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'g_gl_contraataque');
        if (!direct(hit) || st.usedAt !== now(p) || st.healed) return;
        st.healed = true;
        p.sustain(p.stats.maxHP * T.contraataque.healPct / 100, 'g_gl_contraataque');
      },
    },
    // l5 Gloria: cada Rival que matas y cada 20 % de vida que pierde tu Rival (desde que lo
    // nombraste) dan 1 de Gloria (hasta 5): +4 % de daño cada una. Se borra fuera de combate
    g_gl_gloria: {
      name: 'Gloria', desc: 'Cada Rival que matas y cada 20 % de vida que pierde tu Rival te dan Gloria: +4 % de daño cada una.',
      state: () => ({ n: 0, steps: new WeakMap(), last: -99 }),
      onHit(g, p, e, hit) {
        if (!direct(hit)) return;
        const st = powerState(p, 'g_gl_gloria');
        st.last = now(p);
        const r = rivalOf(p, e);
        if (!r || !(e.maxHP > 0)) return;
        const steps = Math.max(0, Math.floor((r.frac0 - Math.max(0, e.hp) / e.maxHP) / T.gloria.step + 1e-9));
        const had = st.steps.get(e) || 0;
        if (steps > had) { st.steps.set(e, steps); addGloria(p, st, steps - had); }
      },
      onKill(g, p, e) {
        if (!rivalDeath(p, e)) return;
        const st = powerState(p, 'g_gl_gloria');
        st.last = now(p);
        addGloria(p, st, 1);
      },
      onTick(g, p) {
        const st = powerState(p, 'g_gl_gloria');
        if (st.n > 0 && now(p) - Math.max(st.last, now(p) - (p.sinceCombat || 0)) > T.gloria.idle) setGloria(p, st, 0);
      },
      condAdd(p) { return T.gloria.pct * powerState(p, 'g_gl_gloria').n; },
    },
    // l6 Retirada Táctica: al esquivar, arrojas gratis una Lanza Arrojadiza a tu Rival (+30 %),
    // una vez cada 6 s
    g_gl_retirada: {
      name: 'Retirada Táctica', desc: 'Al esquivar, arrojas gratis una Lanza Arrojadiza a tu Rival (+30 %), una vez cada 6 s.',
      state: () => ({ dodging: false, at: -99 }),
      onTick(g, p) {
        const st = powerState(p, 'g_gl_retirada');
        if (!dodgedNow(p, st) || now(p) - st.at < T.retirada.icd - 1e-9) return;
        const r = nearestRival(p);
        if (!r) return;
        st.at = now(p);
        freeLance(g, p, r.e, { addPct: T.retirada.pct, src: 'g_gl_retirada' });
      },
    },
    // l7 Sangre en la Arena: cada punto de Gloria da +5 % de daño de crítico (lo recalcula Gloria)
    g_gl_sangre_arena: {
      name: 'Sangre en la Arena', desc: 'Cada punto de Gloria da a tus críticos +5 % de daño.',
      stats(p) { return { critDmg: T.sangreArena * (powerState(p, 'g_gl_gloria').n || 0) }; },
    },
    // l8A Clamor del Público: matar a un Rival asusta a los enemigos a 6 m 2 s (a los jefes, 20 de
    // Quebranto)
    g_gl_clamor: {
      name: 'Clamor del Público', desc: 'Matar a un Rival asusta a los enemigos a 6 m: huyen 2 s.',
      onKill(g, p, e) { if (rivalDeath(p, e)) scare(g, p, e.pos.clone(), T.clamor.radius, T.clamor); },
    },
    // l8B Pulgar Abajo: tu Rival con menos del 30 % de vida recibe +40 %
    g_gl_pulgar: {
      name: 'Pulgar Abajo', desc: 'Tu Rival con menos del 30 % de vida recibe +40 % de daño.',
      condAdd(p, e) { return isRival(p, e) && e.maxHP > 0 && e.hp / e.maxHP < T.pulgar.below ? T.pulgar.pct : 0; },
    },
    // l9 Finta: esquivar a menos de 3 m de tu Rival acorta 2 s la recarga de tu movilidad
    g_gl_finta: {
      name: 'Finta', desc: 'Esquivar a menos de 3 m de tu Rival acorta 2 s la recarga de tu movilidad.',
      state: () => ({ dodging: false }),
      onTick(g, p) {
        const st = powerState(p, 'g_gl_finta');
        if (!dodgedNow(p, st)) return;
        const r = nearestRival(p);
        if (r && r.e.pos.distanceTo(p.pos) <= T.finta.radius + 0.5 * (r.e.def?.scale || 1)) moveCut(g, p, T.finta.s);
      },
    },
    // l10 Campeón: contra tu Rival, +10 % de crítico
    g_gl_campeon: {
      name: 'Campeón', desc: 'Contra tu Rival, tienes +10 % de probabilidad de crítico.',
      condCrit(p, e) { return isRival(p, e) ? T.campeon : 0; },
    },
    // l11 Vítores: matar a un Rival élite o jefe o Quebrantar a tu Rival acorta 6 s tu definitiva
    // (como mucho cada 15 s, con el suelo de las definitivas)
    g_gl_vitores: {
      name: 'Vítores', desc: 'Matar a un Rival élite o Quebrantar a tu Rival acorta 6 s la recarga de tu definitiva.',
      state: () => ({ at: -99 }),
      afterCast(g, p, cast) { noteStart(p, cast); },
      onKill(g, p, e) { const d = rivalDeath(p, e); if (d?.elite) vitores(g, p); },
      onTick(g, p) { if (rivalEvents(p, powerState(p, 'g_gl_vitores'), 'broke').length) vitores(g, p); },
    },
    // l12 Triunfo (final): Rival Quebrantado o 5 de Gloria (cada 35 s): 10 s de +25 % de daño y
    // principales a media Furia; cada muerte, +1 s (hasta 15 s)
    g_gl_triunfo: {
      name: 'Triunfo', desc: 'Rival Quebrantado o 5 de Gloria: 10 s de más daño y principales a media Furia.',
      state: () => ({ nextAt: 0, extra: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'g_gl_triunfo');
        const broke = rivalEvents(p, st, 'broke').length > 0;
        if (!broke && (powerState(p, 'g_gl_gloria').n || 0) < T.gloria.max) return;
        if (now(p) < st.nextAt - 1e-9) return;
        st.nextAt = now(p) + T.triunfo.icd; st.extra = 0;
        p.addBuff('g_gl_triunfo', { dmgPct: T.triunfo.dmgPct, spenderCostPct: T.triunfo.costPct }, T.triunfo.dur,
          { name: 'Triunfo', icon: '🏆', desc: `+${T.triunfo.dmgPct}% de daño y principales a media Furia` });
        g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡TRIUNFO!', 'txt-crit');
      },
      onKill(g, p) {
        const b = buffOf(p, 'g_gl_triunfo');
        const st = powerState(p, 'g_gl_triunfo');
        const add = Math.min(T.triunfo.perKill, T.triunfo.max - T.triunfo.dur - st.extra);
        if (!b || !(add > 0)) return;
        st.extra += add; b.t += add; b.dur = (b.dur || 0) + add;
      },
    },

    // ---------------- ÁRBOL HÉROE · CAUDILLO (h3, §9.4) ----------------
    // u0 Pendón: cada 15 s, en combate, clavas un Pendón donde estás (12 s): tú y tus aliados a
    // 8 m hacen +8 % de daño y reciben un 8 % menos; dos a la vez no se suman. Ajustes (claves tv
    // de la clase): Asta Alta, Pendón de Asalto/Defensa, Tropel, Línea de Batalla, Doble Asta y
    // Disciplina. El Estandarte de Guerra (u4A) clava otro en la mira, aparte del automático
    g_cau_pendon: {
      name: 'Pendón', desc: 'Cada 15 s clavas un Pendón donde estás: tú y tus aliados hacen más daño y reciben menos.',
      state: () => ({ nextAt: 0, granAt: 0, plants: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'g_cau_pendon');
        if (!p.alive || now(p) < st.nextAt - 1e-9 || !enemiesNear(g, p.pos, T.pendon.combat).length) return;
        if (plantPendon(g, p, p.pos)) st.nextAt = now(p) + T.pendon.every;
      },
      afterCast(g, p, cast) {
        noteStart(p, cast);
        if (cast?.sk?.id !== 'g_h_estandarte' || cast.echo) return;
        // el tipo `aura` del catálogo ya clavó su aura en la mira: se cambia por un Pendón en el
        // mismo sitio (con los ajustes del Caudillo), sin dos auras a la vez
        const aura = (g.fields || []).find(f => !f.dead && f.owner === p && f.kind === 'aura' && f.data?.buffId === 'g_h_estandarte');
        let at = aura ? v3(aura.pos.x, 0, aura.pos.z) : null;
        if (aura) g.expireField(aura);
        for (const a of g.allies ? g.allies() : [p]) if (buffOf(a, 'g_h_estandarte')) dropBuff(a, 'g_h_estandarte');
        if (!at && cast.target) {
          const to = cast.target.clone().sub(p.pos).setY(0);
          if (to.length() > T.estandarteRange) to.setLength(T.estandarteRange);
          at = p.pos.clone().add(to);
        }
        if (at) plantPendon(g, p, at, { auto: false });
      },
    },
    // u3, u4B, u5, u8, u11, u12: los lee el Pendón al clavarse, al moverse o al acabar
    g_cau_arenga: { name: 'Arenga', desc: 'Al clavar un Pendón, tú y tus aliados a 8 m recuperan un 5 % de la vida.' },
    g_cau_abanderado: { name: 'Abanderado', desc: 'Llevas el Pendón a la espalda: te sigue y siempre estás dentro.' },
    g_cau_clarin: { name: 'Clarín', desc: 'Cada vez que clavas un Pendón, ganas 20 de Furia.' },
    g_cau_desbandada: { name: 'Desbandada', desc: 'Al clavar un Pendón, los enemigos a 8 m huyen 2 s.' },
    g_cau_orden: { name: 'Orden de Ataque', desc: 'Al clavar un Pendón, el enemigo con más vida a 15 m recibe +15 % de daño de todo el grupo.' },
    g_cau_relevo: { name: 'Relevo', desc: 'Al acabar un Pendón, tú y tus aliados a 8 m ganan un escudo del 10 % de su vida.' },
    g_cau_gran_estandarte: { name: 'Gran Estandarte', desc: 'Cada 40 s, tu siguiente Pendón es un Gran Estandarte: el doble de grande y de efecto.' },

    // ================================================================
    // ESPECIALIZACIONES (Paso 2g, §7; KT-guerrero, trabajos 2 y 3)
    // ================================================================
    // ---------------- BERSERKER (b*) ----------------
    // b5 Reabrir: cada golpe de Rajar a un enemigo que sangra reinicia sus Sangrados (vuelven a su
    // duración entera) y te da 3 de Sed (una vez por golpe)
    g_b_reabrir: {
      name: 'Reabrir', desc: 'Cada golpe de Rajar a un enemigo que sangra reinicia su Sangrado y te da 3 de Sed.',
      state: () => ({ at: -1 }),
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_rajar') || hit.echo || !e?.alive) return;
        const list = g.dotsOf(e, 'bleed');
        if (!list.length) return;
        for (const d of list) g.replaceDoT(e, d.per * d.ticks, d.ticks, bleedInterval(p, d.source), d.source);
        const st = powerState(p, 'g_b_reabrir');
        if (st.at === now(p)) return;
        st.at = now(p);
        gainGauge(p, 'sed', gaugeTuning().sed.reabrir);
      },
    },
    // b6 Caída Brutal: al caer de un Salto Devastador, tu siguiente Rajar empieza por el 3.er golpe
    g_b_caida_brutal: {
      name: 'Caída Brutal', desc: 'Al caer de un Salto Devastador, tu siguiente Rajar empieza por el 3.er golpe.',
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_salto' && !cast.echo) g.setComboStep(p, 'g_rajar', 3); },
    },
    // b8A Contagio: cuando muere un enemigo que sangra, lo que le quedaba de Sangrado pasa a los 2
    // enemigos más cercanos a 3 m (a cada uno, con la duración de tu Sangrado)
    g_b_contagio: {
      name: 'Contagio', desc: 'Cuando muere un enemigo que sangra, su Sangrado pasa a 2 enemigos a 3 m.',
      onKill(g, p, e, kill) {
        if (!kill?.status?.bleeding) return;
        const rem = g.dotRemaining(e, 'bleed');
        const prof = dotProfile('bleed', 1, { tv: p.tv });
        if (!(rem > 0) || !prof) return;
        for (const o of nearestEnemies(g, e.pos, T.contagio.radius, T.contagio.n, e)) g.applyDoT(o, rem, prof.ticks, prof.interval, undefined, 'g_b_contagio:bleed');
        g.spawnRing?.(e.pos, T.contagio.radius, 0xb3180e);
      },
    },
    // b8B Desangrar: hasta 3 Sangrados a la vez en el mismo enemigo. Sin él, el Sangrado de golpe
    // nuevo sustituye al viejo (la Sed, mech-guerrero.js); con él, el viejo sigue en otra ranura
    // (`<habilidad>#2:bleed`, `#3`) con lo que le quedaba. Con las 3 llenas se pierde el más débil
    g_b_desangrar: {
      name: 'Desangrar', desc: 'Puedes poner hasta 3 Sangrados a la vez en el mismo enemigo.',
      onHit(g, p, e, hit) {
        const src = strikeBleedSource(p, hit);
        if (!src || !e?.alive) return;
        const cur = g.dotsOf(e, src)[0];
        if (!cur) return;
        const base = src.slice(0, -':bleed'.length);
        const slots = [];
        for (let k = 2; k <= T.desangrar; k++) slots.push(`${base}#${k}:bleed`);
        const every = DOT_PROFILES.bleed.interval;
        const free = slots.find(s => !g.dotsOf(e, s).length);
        const rem = g.consumeDoT(e, src);
        if (!(rem > 0)) return;
        if (free) { g.applyDoT(e, rem, cur.left, every, undefined, free); return; }
        let weak = null, wv = rem;
        for (const s of slots) { const v = g.dotRemaining(e, s); if (v < wv) { wv = v; weak = s; } }
        if (weak) g.replaceDoT(e, rem, cur.left, every, weak);
      },
    },
    // b9A Onda de Choque: el 3.er golpe de Rajar suelta una onda del 60 % de ese golpe a 4 m
    g_b_onda_choque: {
      name: 'Onda de Choque', desc: 'El 3.er golpe de Rajar suelta una onda que hace el 60 % a todos a 4 m.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_rajar' || cast.step !== 3 || cast.echo || !cast.target) return;
        const prof = cast.prof, step = (prof.def?.steps || [])[2] || {};
        const c = cast.target.clone().setY(0);
        g.dealArea(c, T.onda.radius, prof.coef * (step.coef ?? 1) * T.onda.pct / 100,
          { addPct: prof.addPct, critBonus: prof.critBonus, from: c, hitInfo: { skill: 'g_rajar', tags: prof.tags, elem: prof.elem }, hitExtra: { step: 3, echo: true } });
        g.spawnRing?.(c, T.onda.radius, 0xd84a2a);
      },
    },
    // b9B Remate Certero: el 3.er golpe de Rajar es crítico seguro; a cada jefe, 15 de Quebranto
    g_b_remate_certero: {
      name: 'Remate Certero', desc: 'El 3.er golpe de Rajar es crítico seguro y a los jefes les llena 15 de Quebranto.',
      state: () => ({ seen: new Set() }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_rajar' || cast.step !== 3) return;
        cast.forceCrit = true;
        powerState(p, 'g_b_remate_certero').seen = new Set();
      },
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_rajar') || hit.step !== 3 || hit.echo || !isBoss(e)) return;
        const st = powerState(p, 'g_b_remate_certero');
        if (st.seen.has(e)) return;
        st.seen.add(e);
        e.addStagger?.(T.remate, p);
      },
    },
    // b10B Salto Aplastante: cada salto SEGUIDO de la cadena sobre el mismo enemigo, +40 % (hasta +120 %)
    g_b_salto_aplastante: {
      name: 'Salto Aplastante', desc: 'Cada salto seguido sobre el mismo enemigo hace un 40 % más que el anterior (hasta +120 %).',
      state: () => ({ chain: new Map(), now: new Set() }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_salto') return;
        const st = powerState(p, 'g_b_salto_aplastante');
        if (!cast.recast) st.chain = new Map();
        st.now = new Set();
      },
      condAdd(p, e, hit) {
        if (hit?.skill !== 'g_salto' || !e) return 0;
        return Math.min(T.aplastante.max, T.aplastante.per * (powerState(p, 'g_b_salto_aplastante').chain.get(e) || 0));
      },
      onHit(g, p, e, hit) { if (isHitOf(hit, 'g_salto') && !hit.echo) powerState(p, 'g_b_salto_aplastante').now.add(e); },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_salto' || cast.echo) return;
        const st = powerState(p, 'g_b_salto_aplastante');
        const next = new Map();
        for (const e of st.now) next.set(e, (st.chain.get(e) || 0) + 1);
        st.chain = next;
        st.now = new Set();
      },
    },
    // b12 Ritmo de Matanza (rango r): cada crítico de Rajar acorta 0,5·r s tus recargas, salvo
    // las definitivas y Piel de Hierro (una vez cada 1,5 s)
    g_b_ritmo_matanza: {
      name: 'Ritmo de Matanza', desc: 'Cada crítico de Rajar acorta tus recargas, salvo la definitiva y Piel de Hierro (una vez cada 1,5 s).',
      state: () => ({ at: -99 }),
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_rajar') || !hit.crit || hit.echo) return;
        const st = powerState(p, 'g_b_ritmo_matanza');
        if (now(p) - st.at < T.ritmo.icd - 1e-9) return;
        st.at = now(p);
        const s = T.ritmo.perRank * rankOf(p, 'g_b_ritmo_matanza');
        for (const sk of p.cls?.skills || []) {
          const def = defOf(p, sk.id);
          if (def.cat === 'ultimate' || def.cdOnEnd || !((p.cds?.[sk.id] || 0) > 0)) continue;
          cutCd(g, p, sk.id, s);
        }
      },
    },
    // b14 Impacto Aturdidor: quien sobrevive a la caída del Salto queda aturdido 0,5 s (cada
    // enemigo, una vez cada 4 s); a los jefes, 15 de Quebranto
    g_b_impacto: {
      name: 'Impacto Aturdidor', desc: 'Quien sobrevive a la caída del Salto queda aturdido 0,5 s; a los jefes, 15 de Quebranto.',
      state: () => ({ at: new WeakMap() }),
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_salto') || hit.echo || !e?.alive) return;
        const st = powerState(p, 'g_b_impacto');
        const t0 = st.at.get(e);
        if (t0 != null && now(p) - t0 < T.impacto.icd - 1e-9) return;
        st.at.set(e, now(p));
        if (isBoss(e)) e.addStagger?.(T.impacto.stagger, p);
        else e.applyCC?.('stun', T.impacto.stun, { src: p });
      },
    },
    // b15A Negación de la Muerte: cada 2 min, un golpe letal te deja con 1 de vida y la Sed en 50
    // (no la llena: no encadena con la salvación de Corazón Indomable 3)
    g_negacion: {
      name: 'Negación de la Muerte', desc: 'Una vez cada 2 minutos, un golpe que te mataría te deja con 1 de vida y la Sed en 50.',
      icd: T.negacion.icd, priority: 1,
      onLethal(g, p) {
        p.setHp(1, 'g_negacion');                       // restauración (§6.1)
        setGauge(p, 'sed', gaugeTuning().sed.negacion);
        g.ui?.message?.('🩸 ¡Negación de la Muerte! Sobrevives con 1 de vida', 3000);
        g.ui?.spawnText?.(p.pos, '¡NEGACIÓN!', 'txt-crit');
        fxAt(g, 'recklessAura', p.pos, 1.0);
        g.addShake?.(0.4, 0.4);
        return true;
      },
    },
    // b16 Sangre Hirviente (rango r): con más de 50 de Sed (gaugeTuning().sed.boilAt), tus golpes
    // (velocidad de ataque) y tus giros y saltos (stat skillSpeedPct del núcleo: preparación, tic del
    // canal y vuelo del salto; no toca recargas) van un 8·r % más rápido
    g_b_sangre_hirviente: {
      name: 'Sangre Hirviente', desc: 'Con más de 50 de Sed, tus golpes, giros y saltos van más rápido.',
      onTick(g, p) {
        if (!(gaugeValue(p, 'sed') > gaugeTuning().sed.boilAt)) return;
        const pct = T.hirviente.perRank * rankOf(p, 'g_b_sangre_hirviente');
        keepBuff(p, 'g_b_sangre_hirviente', { aspdPct: pct, skillSpeedPct: pct }, 0.25, { name: 'Sangre Hirviente', icon: '🩸', desc: `+${pct}% de velocidad de ataque y de tus giros y saltos` });
      },
    },
    // b17 Sin Suelo (rango r): durante Furia Inmortal el Salto no se recarga y encadena r saltos más;
    // al lanzarla, el Salto queda listo
    g_b_sin_suelo: {
      name: 'Sin Suelo', desc: 'Durante Furia Inmortal, el Salto Devastador no se recarga y encadena más saltos.',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'g_salto' || !buffOf(p, 'g_u_furia')) return;
        prof.cd = 0;
        if (prof.recast) prof.recast = { ...prof.recast, n: prof.recast.n + rankOf(p, 'g_b_sin_suelo') };
      },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_u_furia' && !cast.echo) cutCd(g, p, 'g_salto', Infinity); },
    },
    // b18 Avidez (rango r): mientras giras, cada enemigo que EMPIEZAS a desangrar te da 2·r de Furia
    g_b_avidez: {
      name: 'Avidez', desc: 'Mientras giras, cada enemigo que empiezas a desangrar te da Furia.',
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_remolino') || hit.echo || !e?.alive || g.hasDoT(e, 'bleed')) return;
        g.gainResource(p, T.avidez * rankOf(p, 'g_b_avidez'));
      },
    },
    // b19 Último Trago (rango r): el 3.er golpe de Rajar te da 5·r de Sed (el doble si golpea a un
    // élite o a un jefe); una vez por golpe
    g_b_ultimo_trago: {
      name: 'Último Trago', desc: 'El 3.er golpe de Rajar te da Sed (el doble contra élites y jefes).',
      state: () => ({ at: -1, got: 0 }),
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_rajar') || hit.step !== 3 || hit.echo) return;
        const st = powerState(p, 'g_b_ultimo_trago');
        if (st.at !== now(p)) { st.at = now(p); st.got = 0; }
        const want = gaugeTuning().sed.ultimoTrago * rankOf(p, 'g_b_ultimo_trago') * (isEliteOrBoss(e) ? 2 : 1);
        if (want <= st.got) return;
        gainGauge(p, 'sed', want - st.got);
        st.got = want;
      },
    },
    // b21 Caída Sangrienta: el último salto de la cadena desangra a todos los que golpea (el 100 %
    // de su golpe en 3 s, con tus bonos de Sangrado)
    g_b_caida_sangrienta: {
      name: 'Caída Sangrienta', desc: 'El último salto de la cadena desangra a todos los que golpea.',
      onCast(g, p, cast) { if (cast?.sk?.id === 'g_salto') jumpOpen(p, 'g_b_caida_sangrienta', cast); },
      onHit(g, p, e, hit) { if (isHitOf(hit, 'g_salto') && !hit.echo) jumpHit(p, 'g_b_caida_sangrienta', e, hit.dealt); },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_salto' && !cast.echo && soloJump(p, cast)) caidaSangrienta(g, p); },
      onSkillEnd(g, p, sk, end) { if (sk?.id === 'g_salto' && end?.kind === 'recast') caidaSangrienta(g, p); },
    },
    // b22 Estallido Rojo (rango r): al acabar el giro del Remolino (soltarlo, agotarlo o quedarte
    // sin Furia), los Sangrados a 4 m estallan: hacen de golpe el (20 + 15·r) % de lo que les queda
    g_b_estallido_rojo: {
      name: 'Estallido Rojo', desc: 'Al soltar el Remolino, los Sangrados a 4 m estallan.',
      onSkillEnd(g, p, sk, end) {
        if (sk?.id !== 'g_remolino' || end?.kind !== 'channel' || !['release', 'done', 'drain'].includes(end.reason)) return;
        const pct = T.estallido.base + T.estallido.perRank * rankOf(p, 'g_b_estallido_rojo');
        const tags = new Set(['area', 'physical']);
        let n = 0;
        for (const e of enemiesNear(g, p.pos, T.estallido.radius)) {
          const rem = g.consumeDoT(e, 'bleed');
          if (rem > 0 && dealProcDamage(g, e, rem * pct / 100, { source: 'power:g_b_estallido_rojo', skill: 'g_remolino', tags }) > 0) n++;
        }
        if (n) { g.spawnRing?.(p.pos, T.estallido.radius, 0xff2a1a); g.addShake?.(0.3, 0.25); }
      },
    },
    // b23 Verdugo (rango r): el 3.er golpe de Rajar hace +3·r % por cada 10 % de vida que le falta
    // al objetivo (solo el golpe: ni la onda ni el 2.º golpe de Golpe de Gracia)
    g_b_verdugo: {
      name: 'Verdugo', desc: 'El 3.er golpe de Rajar hace más daño cuanta menos vida le queda al objetivo.',
      priority: 5,
      state: () => ({ step3: false }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'g_rajar') powerState(p, 'g_b_verdugo').step3 = cast.step === 3; },
      condAdd(p, e, hit) {
        if (hit?.skill !== 'g_rajar' || !e?.maxHP || !powerState(p, 'g_b_verdugo').step3) return 0;
        const tenths = Math.floor(Math.max(0, 1 - e.hp / e.maxHP) * 10 + 1e-9);
        return T.verdugo * rankOf(p, 'g_b_verdugo') * tenths;
      },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_rajar') powerState(p, 'g_b_verdugo').step3 = false; },
    },
    // b24 Ímpetu (rango r): cada salto de la cadena, +3·r % de daño 8 s (se suma hasta 5 veces)
    g_b_impetu: {
      name: 'Ímpetu', desc: 'Cada salto de la cadena te da daño durante 8 s (se suma hasta 5 veces).',
      state: () => ({ n: 0, until: -1 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_salto' || cast.echo) return;
        const st = powerState(p, 'g_b_impetu');
        if (now(p) > st.until) st.n = 0;
        st.n = Math.min(T.impetu.max, st.n + 1);
        st.until = now(p) + T.impetu.dur;
        const pct = T.impetu.perRank * rankOf(p, 'g_b_impetu') * st.n;
        p.addBuff('g_b_impetu', { dmgPct: pct }, T.impetu.dur, { name: `Ímpetu ×${st.n}`, icon: '🐗', desc: `+${pct}% de daño` });
      },
    },
    // b25 Danza Carmesí (final, rango r): el Remolino sigue mientras toques a alguien que sangra,
    // hasta 6/10/20 s, a 8 de Furia por segundo pasados los 3 s (ese drenaje no cuenta como Furia
    // gastada). Sangrados +15·(r−1) %: clave tv del nodo. Lee el canal con g.channelInfo()
    // (t = s desde que empezó el giro, left = s que le quedan); el radio, el del perfil al lanzarlo.
    // S-guerrero (F1): mientras dura la danza el giro sigue creciendo: el tope de la rampa del Remolino
    // (+45 %) sube +15/30/45 puntos (+60/75/90 %), así el giro largo vale más que la rotación que tapa
    g_b_danza_carmesi: {
      name: 'Danza Carmesí', desc: 'El Remolino sigue mientras toques a alguien que sangra y su giro sigue creciendo.',
      state: () => ({ radius: 0 }),
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'g_remolino' || !prof.ramp) return;
        const add = T.danza.rampAdd[Math.min(T.danza.rampAdd.length, rankOf(p, 'g_b_danza_carmesi')) - 1];
        prof.ramp = { ...prof.ramp, max: prof.ramp.max + add };
      },
      onCast(g, p, cast) { if (cast?.sk?.id === 'g_remolino') powerState(p, 'g_b_danza_carmesi').radius = cast.prof?.radius || 0; },
      onTick(g, p, dt) {
        const ch = g.channelInfo?.();
        if (!ch || ch.p !== p || ch.id !== 'g_remolino') return;
        const D = T.danza;
        if (ch.t < D.after - ch.interval - 1e-9) return;                   // aún en el giro normal
        const cap = D.cap[Math.min(D.cap.length, rankOf(p, 'g_b_danza_carmesi')) - 1];
        const rad = (powerState(p, 'g_b_danza_carmesi').radius || 2.9) + 0.5;
        if (ch.t >= cap - 1e-9 || !enemiesNear(g, p.pos, rad).some(e => g.hasDoT(e, 'bleed'))) return;
        if (ch.t >= D.after - 1e-9 && !drainResource(p, D.furyPerSec, dt)) return;
        if (ch.left < D.step + 0.05 && ch.t + ch.left < cap - 1e-9) g.extendChannel(p, Math.min(D.step, cap - ch.t - ch.left));
      },
    },
    // b26 Golpe de Gracia (final, rango r): el 3.er golpe de Rajar golpea dos veces: el 2.º (0,15 s
    // después, en la misma zona) al 30/45/60 % y deja al objetivo Vulnerable 1/2,5/4 s. Rajar
    // +15·(r−1) %: mod del nodo
    g_b_golpe_gracia: {
      name: 'Golpe de Gracia', desc: 'El 3.er golpe de Rajar golpea dos veces y deja al objetivo Vulnerable.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_rajar' || cast.step !== 3 || cast.echo || !cast.target) return;
        const i = Math.min(3, rankOf(p, 'g_b_golpe_gracia')) - 1;
        const prof = cast.prof, step = (prof.def?.steps || [])[2] || {};
        const c = cast.target.clone().setY(0), tgt = cast.enemy;
        const rad = (step.radius ?? prof.radius ?? 2) * (prof.radiusMul || 1);
        g.timers?.schedule(T.gracia.delay, () => {
          if (!p.alive) return;
          g.dealArea(c, rad, prof.coef * (step.coef ?? 1) * T.gracia.pct[i] / 100,
            { addPct: prof.addPct, critBonus: prof.critBonus, from: c, hitInfo: { skill: 'g_rajar', tags: prof.tags, elem: prof.elem }, hitExtra: { step: 3, echo: true } });
          if (tgt?.alive) tgt.vulnT = Math.max(tgt.vulnT || 0, T.gracia.vuln[i]);
          g.spawnRing?.(c, rad, 0xff3a2a);
        });
      },
    },
    // b27 Estampida Sin Fin (final, rango r): si el último salto de la cadena golpea a 3 o más, el
    // Salto recupera 4 s / 8 s / se recarga al instante; como mucho 2 recargas seguidas recortadas
    // (cuentan las de otros poderes: Asalto Total). Salto +15·(r−1) %: mod del nodo
    g_b_estampida: {
      name: 'Estampida Sin Fin', desc: 'Si el último salto de la cadena golpea a 3 o más, el Salto recupera su recarga y la cadena siguiente deja Vulnerable.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_salto') return;
        if (!cast.recast) {
          const r = saltoRow(p); if (!r.cut) r.row = 0; r.cut = false;
          // la cadena que abre un Salto recargado por la Estampida deja Vulnerable a los que golpea
          const st = powerState(p, 'g_b_estampida');
          st.boost = !!st.armed; st.armed = false;
        }
        jumpOpen(p, 'g_b_estampida', cast);
      },
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_salto') || hit.echo) return;
        jumpHit(p, 'g_b_estampida', e, hit.dealt);
        if (powerState(p, 'g_b_estampida').boost && e?.alive) e.vulnT = Math.max(e.vulnT || 0, T.estampida.vuln);
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_salto' || cast.echo) return;
        noteStart(p, cast);
        if (soloJump(p, cast)) estampida(g, p);
      },
      onSkillEnd(g, p, sk, end) { if (sk?.id === 'g_salto' && end?.kind === 'recast') estampida(g, p); },
    },
    // b28 Corazón Indomable (ápice, rangos): 1) matar a un élite: +30 de Sed · 2) Sed Saciada 9 s (la
    // mecánica) · 3) con la Sed Saciada, un golpe letal te deja con 1 de vida (cada 60 s) · 4) cada 3
    // Sed Saciadas, Furia Inmortal sola 5 s, gratis (cada 90 s)
    g_b_corazon_indomable: {
      name: 'Corazón Indomable', desc: 'Matar élites da Sed, la Sed Saciada dura más, te salva de un golpe letal y lanza Furia Inmortal.',
      priority: 2,
      state: () => ({ sated: 0, lethalAt: -999, freeAt: -999 }),
      onKill(g, p, e) { if (isEliteOrBoss(e)) gainGauge(p, 'sed', gaugeTuning().sed.eliteKill); },
      onLethal(g, p) {
        if (rankOf(p, 'g_b_corazon_indomable') < 3 || !((gaugeState(p, 'sed')?.satedT || 0) > 0)) return false;
        const st = powerState(p, 'g_b_corazon_indomable');
        if (now(p) - st.lethalAt < T.corazon.icd3 - 1e-9) return false;
        st.lethalAt = now(p);
        p.setHp(1, 'g_b_corazon_indomable');
        g.ui?.spawnText?.(p.pos, '¡INDOMABLE!', 'txt-crit');
        return true;
      },
      onGauge(g, p, id, ev) {
        if (id !== 'sed' || ev !== 'full' || rankOf(p, 'g_b_corazon_indomable') < 4) return;
        const st = powerState(p, 'g_b_corazon_indomable');
        st.sated++;
        if (st.sated < T.corazon.every || now(p) - st.freeAt < T.corazon.icd4 - 1e-9) return;
        if (freeFury(g, p, T.corazon.dur)) { st.sated = 0; st.freeAt = now(p); }
      },
    },

    // ---------------- GUARDIÁN (d*) ----------------
    // d4 Contragolpe (rango r): al bloquear, un golpe de escudo del 40·r % del arma a quien te
    // golpeó (o al más cercano a 3 m), una vez por segundo
    g_d_contragolpe: {
      name: 'Contragolpe', desc: 'Al bloquear, devuelves un golpe de escudo (una vez por segundo).',
      state: () => ({ at: -99 }),
      onDamaged(g, p, dmg) {
        if (!dmg?.blocked) return;
        const st = powerState(p, 'g_d_contragolpe');
        if (now(p) - st.at < T.contragolpe.icd - 1e-9) return;
        const e = dmg.src?.alive && dist2D(dmg.src.pos, p.pos) <= T.contragolpe.reach + 1 ? dmg.src : nearestEnemy(g, p.pos, T.contragolpe.reach);
        if (!e) return;
        st.at = now(p);
        dealProcDamage(g, e, p.avgHit(T.contragolpe.perRank * rankOf(p, 'g_d_contragolpe') / 100), { source: 'power:g_d_contragolpe', tags: new Set(['melee', 'physical']) });
        g.spawnBeam?.(p.pos, e.pos, 0x9fc4ff, 0.15);
      },
    },
    // d5 Echar Raíces: en Muralla, cada Terremoto te da 1 carga de Bastión (2 si golpea a 3 o más;
    // los números, en gaugeTuning().bastion: la barra los cita)
    g_d_raices: {
      name: 'Echar Raíces', desc: 'En Muralla, cada Terremoto te da 1 carga de Bastión (2 si golpea a 3 o más).',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'terremoto' || cast.echo || !inMuralla(g, p)) return;
        const B = gaugeTuning().bastion;
        gainGauge(p, 'bastion', (res?.hits || 0) >= B.raicesBig ? B.raicesBigN : B.raices);
      },
    },
    // d6 Pisotón: tras la Carga de Escudo, tu siguiente Terremoto no se prepara y cuenta como
    // plantado; si lleva Asalto Total sale gratis pero sin su +% (lo mira g_asalto_total)
    g_d_pisoton: {
      name: 'Pisotón', desc: 'Tras la Carga de Escudo, tu siguiente Terremoto no se prepara y cuenta como plantado.',
      state: () => ({ armed: false, cast: null }),
      modifyResolve(p, sk, prof) { if (sk.id === 'terremoto' && powerState(p, 'g_d_pisoton').armed) prof.windup = 0; },
      onCast(g, p, cast) {
        const st = powerState(p, 'g_d_pisoton');
        if (cast?.sk?.id !== 'terremoto' || !st.armed) return;
        st.armed = false; st.cast = cast;
        p.plantNow?.();
        p.resolved = {};                                  // el siguiente vuelve a prepararse
      },
      afterCast(g, p, cast) {
        if (cast?.echo) return;
        const st = powerState(p, 'g_d_pisoton');
        if (cast?.sk?.id === 'g_carga_escudo') { st.armed = true; p.resolved = {}; }
        else if (cast === st.cast) st.cast = null;
      },
    },
    // d7 Mirada Desafiante (rango r): los que provoca la Carga de Escudo te atacan r s más
    g_d_mirada: {
      name: 'Mirada Desafiante', desc: 'Los que provoca la Carga de Escudo te atacan más tiempo.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_carga_escudo' && prof.taunt > 0) prof.taunt += T.mirada * rankOf(p, 'g_d_mirada'); },
    },
    // d8A Barrido de Escudo: al cambiar de postura, golpe de escudo del 120 % a todos a 4 m y los
    // provocas 2 s (una vez cada 3 s)
    g_d_barrido: {
      name: 'Barrido de Escudo', desc: 'Al cambiar de postura, golpeas con el escudo a todos a 4 m y los provocas 2 s.',
      state: () => ({ at: -99 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_guardia' || !cast.stance) return;
        const st = powerState(p, 'g_d_barrido');
        if (now(p) - st.at < T.barrido.icd - 1e-9) return;
        st.at = now(p);
        const c = p.pos.clone();
        g.dealArea(c, T.barrido.radius, T.barrido.coef, { from: c, hitInfo: { skill: 'g_guardia', tags: new Set(['spec', 'area', 'physical']), elem: 'physical' },
          onHit: e => { if (e.alive) e.applyCC?.('taunt', T.barrido.taunt, { src: p }); } });
        g.spawnRing?.(c, T.barrido.radius, 0x7fb0e8);
      },
    },
    // d8B Cambio Certero: al cambiar de postura, tu siguiente golpe es crítico seguro; contra un
    // jefe Quebrantado, además +30 %
    g_d_cambio_certero: {
      name: 'Cambio Certero', desc: 'Al cambiar de postura, tu siguiente golpe es crítico seguro (+30 % contra un jefe Quebrantado).',
      state: () => ({ armed: false, skill: null, until: -1 }),
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_guardia' && cast.stance) powerState(p, 'g_d_cambio_certero').armed = true; },
      onCast(g, p, cast) {
        const st = powerState(p, 'g_d_cambio_certero');
        if (cast?.sk?.id === 'g_guardia') return;
        st.skill = null;
        if (!st.armed) return;
        st.armed = false;
        cast.forceCrit = true;
        st.skill = cast.sk?.id || null; st.until = now(p) + T.certero.win;
      },
      condAdd(p, e, hit) {
        const st = powerState(p, 'g_d_cambio_certero');
        return st.skill && hit?.skill === st.skill && now(p) <= st.until && isBoss(e) && (e.staggerBrokenT || 0) > 0 ? T.certero.pct : 0;
      },
    },
    // d9A Réplicas (las 2 réplicas más son mod del nodo): plantado, las réplicas se abren hasta 8 m
    // (cada una llega más lejos; el anillo de fuera lo golpea este poder, como réplica)
    g_d_replicas: {
      name: 'Réplicas', desc: 'Plantado, las réplicas del Terremoto se abren hasta 8 m.',
      afterCast(g, p, cast) {
        const rp = cast?.prof?.repeat;
        if (cast?.sk?.id !== 'terremoto' || cast.echo || !rp?.n || (rp.needPlanted && !p.planted)) return;
        const c = p.pos.clone().setY(0), base = cast.prof.radius || 5;
        for (let i = 1; i <= rp.n; i++) {
          const rad = base + (T.replicas.reach - base) * i / rp.n;
          g.timers?.schedule((rp.every || 0.5) * i + 2e-6, () => {
            if (!p.alive) return;
            const inner = enemiesNear(g, c, base);
            replicaHit(g, p, c, rad, cast.prof.coef * (rp.coef ?? 0.5), { perTarget: { map: new Map(inner.map(e => [e, 1])), max: 1 } });
            g.spawnRing?.(c, rad, 0xd8c49a);
          });
        }
      },
    },
    // d9B Epicentro: plantado, el Terremoto hace +50 % en el centro (2 m) y llena 20 de Quebranto a
    // los jefes que alcanza ahí (una vez por Terremoto)
    g_d_epicentro: {
      name: 'Epicentro', desc: 'Plantado, el Terremoto hace +50 % en el centro (2 m) y llena Quebranto a los jefes.',
      state: () => ({ seen: new Set() }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'terremoto') powerState(p, 'g_d_epicentro').seen = new Set(); },
      condAdd(p, e, hit) {
        if (hit?.skill !== 'terremoto' || !e || !p.planted) return 0;
        return dist2D(e.pos, p.pos) <= T.epicentro.radius + 0.5 * (e.def?.scale || 1) ? T.epicentro.pct : 0;
      },
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'terremoto') || hit.repeat || hit.echo || !p.planted || !isBoss(e)) return;
        if (dist2D(e.pos, p.pos) > T.epicentro.radius + 0.5 * (e.def?.scale || 1)) return;
        const st = powerState(p, 'g_d_epicentro');
        if (st.seen.has(e)) return;
        st.seen.add(e);
        e.addStagger?.(T.epicentro.stagger, p);
      },
    },
    // d10A Gran Arrastre: la Carga de Escudo arrastra a todos a 3 m de tu camino y, al llegar, los
    // junta delante de ti
    g_d_gran_arrastre: {
      name: 'Gran Arrastre', desc: 'La Carga de Escudo arrastra a todos a 3 m de tu camino y los junta delante de ti.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_carga_escudo' && (prof.dragWidth || 0) > 0) prof.dragWidth = Math.max(prof.dragWidth, T.arrastre.width); },
      onCast(g, p, cast) { dragStart(p, cast); },
      onTick(g, p) { if (p.dashMove) dragSample(g, p); },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
        // dirección de la Carga (desde donde salió: al llegar ya estás en la mira)
        const from = powerState(p, DRAG).from;
        const fwd = cast.target && from ? cast.target.clone().setY(0).sub(from) : null;
        if (!fwd || fwd.lengthSq() < 1e-6) return;
        const front = p.pos.clone().addScaledVector(fwd.normalize(), T.arrastre.front);
        for (const e of dragged(g, p, cast)) {
          const d = dist2D(e.pos, front);
          if (e.alive && d > 0.4) e.displace?.(front, d - 0.3, { toward: true, src: p });
        }
      },
    },
    // d10B Choque Frontal: si la Carga de Escudo choca con un élite o un jefe, te paras ahí, el golpe
    // al llegar le hace +60 % y le llena 25 de Quebranto
    g_d_choque: {
      name: 'Choque Frontal', desc: 'Si la Carga de Escudo choca con un élite o un jefe, te paras, haces +60 % y le llenas Quebranto.',
      state: () => ({ cast: null, dir: null, target: null }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo') return;
        const st = powerState(p, 'g_d_choque');
        const dir = cast.target ? cast.target.clone().sub(p.pos).setY(0) : null;
        st.cast = cast; st.target = null; st.dir = dir && dir.lengthSq() > 1e-6 ? dir.normalize() : null;
      },
      onTick(g, p) {
        const st = powerState(p, 'g_d_choque');
        if (!st.cast || !st.dir || st.target || !p.dashMove) return;
        for (const e of enemiesNear(g, p.pos, T.choque.reach)) {
          if (!isEliteOrBoss(e)) continue;
          const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
          if (dx * st.dir.x + dz * st.dir.z < -0.3) continue;            // detrás: ya lo pasaste
          st.target = e;
          g.stopDash(p);                                                 // te paras ahí
          g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.6), '¡CHOQUE!', 'txt-crit');
          return;
        }
      },
      condAdd(p, e, hit) {
        const st = powerState(p, 'g_d_choque');
        return hit?.skill === 'g_carga_escudo' && e && st.target === e ? T.choque.pct : 0;
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_d_choque');
        if (cast?.sk?.id !== 'g_carga_escudo' || st.cast !== cast) return;
        if (st.target?.alive) st.target.addStagger?.(T.choque.stagger, p);
        st.cast = null; st.target = null;
      },
    },
    // d12 Tambor de Guerra (rango r): cada enemigo que golpea el Terremoto acorta 0,5·r s la recarga
    // de Piel de Hierro (hasta r s por Terremoto; solo mientras se recarga, que empieza al acabar)
    g_d_tambor: {
      name: 'Tambor de Guerra', desc: 'Cada enemigo que golpea el Terremoto acorta la recarga de Piel de Hierro.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'terremoto' || cast.echo || !(res?.hits > 0)) return;
        const r = rankOf(p, 'g_d_tambor');
        cutCd(g, p, 'g_piel', Math.min(r, T.tambor * r * res.hits));
      },
    },
    // d13 Escudo por Delante (rango r): al llegar con la Carga de Escudo, bloqueas seguro los 2·r
    // golpes siguientes (durante 4 s)
    g_d_escudo_delante: {
      name: 'Escudo por Delante', desc: 'Al llegar con la Carga de Escudo, bloqueas seguro los golpes siguientes.',
      priority: 4,
      state: () => ({ n: 0, until: -1 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
        const st = powerState(p, 'g_d_escudo_delante');
        st.n = T.delante.perRank * rankOf(p, 'g_d_escudo_delante');
        st.until = now(p) + T.delante.dur;
      },
      onDamaged(g, p, dmg) {
        const st = powerState(p, 'g_d_escudo_delante');
        if (!(st.n > 0) || now(p) > st.until || !forceBlock(g, p, dmg)) return;
        st.n--;
      },
    },
    // d14 Guardia Rota: los que arrastra la Carga de Escudo quedan Vulnerables 3 s
    g_d_guardia_rota: {
      name: 'Guardia Rota', desc: 'Los que arrastra la Carga de Escudo quedan Vulnerables 3 s.',
      onCast(g, p, cast) { dragStart(p, cast); },
      onTick(g, p) { if (p.dashMove) dragSample(g, p); },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
        for (const e of dragged(g, p, cast)) if (e.alive) e.vulnT = Math.max(e.vulnT || 0, T.guardiaRota);
      },
    },
    // d15A Última Línea: un golpe letal te deja con un 10 % de vida y lanza la Ciudadela 3 s, gratis
    // (una vez cada 2 min)
    g_d_ultima_linea: {
      name: 'Última Línea', desc: 'Un golpe que te mataría te deja con un 10 % de vida y lanza la Ciudadela 3 s. Una vez cada 2 min.',
      icd: T.ultimaLinea.icd, priority: 1,
      onLethal(g, p) {
        p.setHp(Math.max(1, Math.round(p.stats.maxHP * T.ultimaLinea.hpPct / 100)), 'g_d_ultima_linea');
        freeCitadel(g, p, T.ultimaLinea.dur);
        g.ui?.spawnText?.(p.pos, '¡ÚLTIMA LÍNEA!', 'txt-crit');
        return true;
      },
    },
    // d15B Aguante de Roca: con 5 cargas de Bastión, nada te derriba ni te aturde (imparable) y tus
    // bloqueos paran un 10 % más (blockPower; tope del 90 % en combat-math)
    g_d_roca: {
      name: 'Aguante de Roca', desc: 'Con 5 cargas de Bastión, nada te derriba ni te aturde y tus bloqueos paran un 10 % más.',
      onTick(g, p) {
        if (gaugeValue(p, 'bastion') < T.roca.need) return;
        keepBuff(p, 'g_d_roca', { blockPower: T.roca.blockPower }, 0.25, { name: 'Aguante de Roca', icon: '🪨', desc: `Imparable y +${T.roca.blockPower}% de bloqueo` });
        p.unstoppableT = Math.max(p.unstoppableT || 0, 0.25);
      },
    },
    // d16 Fuerza del Bastión (rango r): cada carga de Bastión, +2·r % de daño
    g_d_fuerza_bastion: {
      name: 'Fuerza del Bastión', desc: 'Cada carga de Bastión te da daño.',
      condAdd(p) { return T.fuerzaBastion * rankOf(p, 'g_d_fuerza_bastion') * Math.floor(gaugeValue(p, 'bastion')); },
    },
    // d17 Avalancha (rango r): cada enemigo que arrastra la Carga le quita 1 s a su recarga (hasta
    // r s); con Avalancha la Carga nunca baja de 4 s (moveFloor, también para los demás recortes)
    g_d_avalancha: {
      name: 'Avalancha', desc: 'Cada enemigo que arrastra la Carga de Escudo le quita recarga (nunca baja de 4 s).',
      onCast(g, p, cast) { dragStart(p, cast); },
      onTick(g, p) { if (p.dashMove) dragSample(g, p); },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
        noteStart(p, cast);
        const n = dragged(g, p, cast).size;
        if (n > 0) cutCd(g, p, 'g_carga_escudo', Math.min(rankOf(p, 'g_d_avalancha'), T.avalancha * n));
      },
    },
    // d18 Vínculo de Escudo (rango r): en Muralla, recibes tú el 10·r % del daño de tus aliados a 8 m
    g_d_vinculo: {
      name: 'Vínculo de Escudo', desc: 'En Muralla, recibes tú una parte del daño que sufren tus aliados a 8 m.',
      onAllyDamaged(g, p, ally, dmg) {
        if (!p.alive || !(dmg?.amount > 0) || !inMuralla(g, p) || !allyNear(p, ally, T.vinculo.radius)) return;
        const share = dmg.amount * T.vinculo.pct * rankOf(p, 'g_d_vinculo') / 100;
        dmg.amount -= share;
        p.takeDamage(share, nearAL(g, p), { element: 'phys' });
      },
    },
    // d19 Tierra Viva (rango r): plantado y en combate, cada 3 s una réplica gratis a 5 m (30·r %)
    g_d_tierra_viva: {
      name: 'Tierra Viva', desc: 'Plantado, cada 3 s sueltas una réplica gratis a 5 m.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'g_d_tierra_viva');
        if (!p.planted || !((p.sinceCombat ?? 99) < 5)) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc < T.tierraViva.every - 1e-9) return;
        st.acc = 0;
        const c = p.pos.clone().setY(0);
        replicaHit(g, p, c, T.tierraViva.radius, T.tierraViva.coef * rankOf(p, 'g_d_tierra_viva'));
        g.spawnRing?.(c, T.tierraViva.radius, 0xc8a070);
      },
    },
    // d20 Guarnición (rango r): dentro de tu Ciudadela tus aliados hacen +5·r % y tú ganas 1 carga
    // de Bastión por segundo (no en la gratis; el bloqueo tras descargar lo respeta la mecánica)
    g_d_guarnicion: {
      name: 'Guarnición', desc: 'Dentro de tu Ciudadela, tus aliados hacen más daño y ganas Bastión.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'g_d_guarnicion');
        const f = (g.fields || []).find(x => !x.dead && x.owner === p && x.kind === 'aura' && x.data?.buffId === 'g_u_ciudadela');
        if (!f) { st.acc = 0; return; }
        const pos = v3(f.pos.x, 0, f.pos.z);
        const pct = T.guarnicion.perRank * rankOf(p, 'g_d_guarnicion');
        for (const a of others(g, p, Infinity)) if (dist2D(a.pos, pos) <= f.radius) keepBuff(a, 'g_d_guarnicion', { dmgPct: pct }, 0.3, { name: 'Guarnición', icon: '🏰', desc: `+${pct}% de daño` });
        if (f.data.free || dist2D(p.pos, pos) > f.radius) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc >= gaugeTuning().bastion.guarnicion - 1e-9) { st.acc = 0; gainGauge(p, 'bastion', 1); }
      },
    },
    // d21 Proa Blindada: durante la Carga de Escudo bloqueas seguro lo que viene de frente (cada
    // bloqueo da su carga de Bastión por la mecánica)
    g_d_proa: {
      name: 'Proa Blindada', desc: 'Durante la Carga de Escudo bloqueas todo lo que viene de frente.',
      priority: 4,
      state: () => ({ cast: null, dir: null }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo') return;
        const dir = cast.target ? cast.target.clone().sub(p.pos).setY(0) : null;
        Object.assign(powerState(p, 'g_d_proa'), { cast, dir: dir && dir.lengthSq() > 1e-6 ? dir.normalize() : null });
      },
      afterCast(g, p, cast) { const st = powerState(p, 'g_d_proa'); if (st.cast === cast) st.cast = null; },
      onDamaged(g, p, dmg) {
        const st = powerState(p, 'g_d_proa');
        const s = dmg?.src;
        if (!st.cast || !st.dir || !p.dashMove || !s?.pos) return;
        if ((s.pos.x - p.pos.x) * st.dir.x + (s.pos.z - p.pos.z) * st.dir.z <= 0) return;
        forceBlock(g, p, dmg);
      },
    },
    // d22 Guardia Viva (rango r): cada cambio de postura, +3·r % de daño 8 s (hasta 3 veces) y te
    // cura un r % de la vida (sustento)
    g_d_guardia_viva: {
      name: 'Guardia Viva', desc: 'Cada cambio de postura te da daño 8 s (hasta 3 veces) y te cura.',
      state: () => ({ n: 0, until: -1 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_guardia' || !cast.stance) return;
        const st = powerState(p, 'g_d_guardia_viva');
        const r = rankOf(p, 'g_d_guardia_viva');
        if (now(p) > st.until) st.n = 0;
        st.n = Math.min(T.guardiaViva.max, st.n + 1);
        st.until = now(p) + T.guardiaViva.dur;
        const pct = T.guardiaViva.perRank * r * st.n;
        p.addBuff('g_d_guardia_viva', { dmgPct: pct }, T.guardiaViva.dur, { name: `Guardia Viva ×${st.n}`, icon: '🔰', desc: `+${pct}% de daño` });
        p.sustain(p.stats.maxHP * T.guardiaViva.heal * r / 100, 'g_d_guardia_viva');
      },
    },
    // d23 Réplica Honda (rango r): las réplicas del Terremoto hacen +10·r % (el doble contra jefes
    // Quebrantados)
    g_d_replica_honda: {
      name: 'Réplica Honda', desc: 'Las réplicas del Terremoto hacen más daño (el doble contra jefes Quebrantados).',
      condAdd(p, e, hit) {
        if (hit?.skill !== 'terremoto' || !replicaOpen(p)) return 0;
        const pct = T.replicaHonda * rankOf(p, 'g_d_replica_honda');
        return isBoss(e) && (e.staggerBrokenT || 0) > 0 ? pct * 2 : pct;
      },
      afterCast(g, p, cast) {
        const rp = cast?.prof?.repeat;
        if (cast?.sk?.id !== 'terremoto' || cast.echo || !rp?.n || (rp.needPlanted && !p.planted)) return;
        replicaBracket(g, p, Array.from({ length: rp.n }, (_, i) => (rp.every || 0.5) * (i + 1)));
      },
    },
    // d24 Escolta (rango r): al llegar con la Carga, escudo del 4·r % de tu vida a ti y a tus aliados
    // a 6 m (una vez cada 10 s)
    g_d_escolta: {
      name: 'Escolta', desc: 'Al llegar con la Carga de Escudo, das un escudo a ti y a tus aliados a 6 m (cada 10 s).',
      icd: T.escolta.icd,
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return false;
        g.shield(p.stats.maxHP * T.escolta.perRank * rankOf(p, 'g_d_escolta') / 100, { target: 'all', radius: T.escolta.radius, dur: T.escolta.dur, src: 'g_d_escolta' });
        g.spawnRing?.(p.pos, T.escolta.radius, 0x9fc4ff);
      },
    },
    // d25 Guardia Total (final, rango r): tras 3 cambios de postura en 8 s, Muralla y Ariete a la vez
    // 3/4,5/6 s (vuelve a los 15 s; los cambios hechos durante ella no cuentan). Posturas +15·(r−1) %
    g_d_guardia_total: {
      name: 'Guardia Total', desc: 'Tras 3 cambios de postura en 8 s, tienes Muralla y Ariete a la vez.',
      state: () => ({ log: [], until: -1, readyAt: 0, sig: '' }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_guardia' || !cast.stance) return;
        const st = powerState(p, 'g_d_guardia_total');
        const G = T.guardiaTotal;
        if (now(p) < st.until) return;
        st.log = st.log.filter(t => now(p) - t <= G.win + 1e-9);
        st.log.push(now(p));
        if (st.log.length < G.need || now(p) < st.readyAt - 1e-9) return;
        const dur = G.dur[Math.min(3, rankOf(p, 'g_d_guardia_total')) - 1];
        g.setStanceBoth(p, 'g_guardia', dur);
        st.log = []; st.until = now(p) + dur; st.readyAt = now(p) + G.icd;
        g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡GUARDIA TOTAL!', 'txt-crit');
      },
      // posturas +15·(r−1) %: un buff con esa parte de las stats de las posturas activas
      onTick(g, p) {
        const r = rankOf(p, 'g_d_guardia_total');
        if (r < 2) return;
        const k = T.guardiaTotal.bonus * (r - 1) / 100;
        const stats = {};
        for (const m of g.activeStanceModes?.(p) || []) for (const [s, v] of Object.entries(m.stats || {})) stats[s] = (stats[s] || 0) + Math.round(v * k * 10) / 10;
        const st = powerState(p, 'g_d_guardia_total');
        const sig = JSON.stringify(stats);
        if (!Object.keys(stats).length) { if (st.sig) { st.sig = ''; dropBuff(p, 'g_d_posturas'); } return; }
        if (sig !== st.sig || !buffOf(p, 'g_d_posturas')) { st.sig = sig; p.addBuff('g_d_posturas', stats, 0.35, { name: 'Posturas reforzadas', icon: '🔰' }); }
        else keepBuff(p, 'g_d_posturas', stats, 0.35);
      },
    },
    // d26 Montaña Viva (final, rango r): plantado, cada 3.er Terremoto se repite gratis al 50/75/100 %
    // (repetición: no cuenta ni gasta nada) y sus réplicas aturden 0,5 s (los jefes no).
    // Terremoto +15·(r−1) %: mod del nodo. S-guerrero (F2): ese aturdimiento corto NO suma resistencia
    // al control (noDR): no le gasta a Arrollador el derribo de 1 s de la Carga. Decisión del dueño (G4):
    // entero, pero como mucho 1 vez cada 3 s por enemigo, para que no encadene
    g_d_montana_viva: {
      name: 'Montaña Viva', desc: 'Plantado, cada 3.er Terremoto se repite gratis y sus réplicas aturden (1 vez cada 3 s por enemigo).',
      state: () => ({ n: 0, stunUntil: -1, at: new WeakMap() }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'terremoto' || cast.echo || !p.planted) return;
        const st = powerState(p, 'g_d_montana_viva');
        if (++st.n % T.montana.every) return;
        const rp = cast.prof?.repeat;
        st.stunUntil = now(p) + (rp?.n ? (rp.every || 0.5) * rp.n : 0) + 0.05;
        const mul = T.montana.mul[Math.min(3, rankOf(p, 'g_d_montana_viva')) - 1];
        const slot = cast.slot;
        g.timers?.schedule(T.montana.delay, () => { if (p.alive && p.hotbar?.[slot] === 'terremoto') g.castSkillSlot(slot, mul); });
        g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡MONTAÑA VIVA!', 'txt-crit');
      },
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'terremoto') || !hit.repeat || !e?.alive || isBoss(e)) return;
        const st = powerState(p, 'g_d_montana_viva');
        if (now(p) > st.stunUntil) return;
        const t0 = st.at.get(e);
        if (t0 != null && now(p) - t0 < T.montana.icd - 1e-9) return;
        st.at.set(e, now(p));
        e.applyCC?.('stun', T.montana.stun, { src: p, noDR: true });
      },
    },
    // d27 Cabeza de Puente (final, rango r): al acabar la Carga te plantas, ganas 2/3/5 cargas de
    // Bastión (cada 10 s) y los enemigos a 8 m te atacan 4 s. Carga +15·(r−1) %: mod del nodo
    g_d_cabeza_puente: {
      name: 'Cabeza de Puente', desc: 'Al acabar la Carga te plantas, ganas Bastión y los enemigos a 8 m te atacan.',
      state: () => ({ at: -99 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_carga_escudo' || cast.echo) return;
        p.plantNow?.();
        const st = powerState(p, 'g_d_cabeza_puente');
        if (now(p) - st.at >= T.cabeza.icd - 1e-9) {
          st.at = now(p);
          gainGauge(p, 'bastion', T.cabeza.charges[Math.min(3, rankOf(p, 'g_d_cabeza_puente')) - 1]);
        }
        for (const e of enemiesNear(g, p.pos, T.cabeza.radius)) e.applyCC?.('taunt', T.cabeza.taunt, { src: p });
        g.spawnRing?.(p.pos, T.cabeza.radius, 0x7fb0e8);
      },
    },
    // d28 Inexpugnable (ápice, rangos): 1) matar a un élite llena el Bastión · 2) 7 cargas (stat de
    // la mecánica) · 3) descargar acorta 6 s la recarga de Piel de Hierro · 4) cada 3 descargas, la
    // Ciudadela sola 4 s, gratis (cada 45 s)
    g_d_inexpugnable: {
      name: 'Inexpugnable', desc: 'Matar élites llena el Bastión, guarda más cargas, la descarga recarga la Piel y lanza la Ciudadela.',
      state: () => ({ bursts: 0, freeAt: -999 }),
      stats: p => (rankOf(p, 'g_d_inexpugnable') >= 2 ? { 'gaugeMax:bastion': T.inexpugnable.maxAdd } : {}),
      onKill(g, p, e) { if (isEliteOrBoss(e)) gainGauge(p, 'bastion', gaugeMax(p, 'bastion')); },
      onGauge(g, p, id, ev) {
        if (id !== 'bastion' || ev !== 'spent') return;
        const r = rankOf(p, 'g_d_inexpugnable');
        if (r >= 3) cutCd(g, p, 'g_piel', T.inexpugnable.piel);
        if (r < 4) return;
        const st = powerState(p, 'g_d_inexpugnable');
        st.bursts++;
        if (st.bursts < T.inexpugnable.every || now(p) - st.freeAt < T.inexpugnable.icd - 1e-9) return;
        if (freeCitadel(g, p, T.inexpugnable.dur)) { st.bursts = 0; st.freeAt = now(p); }
      },
    },

    // ---------------- CRUZADO (z*) ----------------
    // z0 Voto Sagrado lleva la pasiva del Cruzado (Martillo Piadoso: el 10 % de tu daño sagrado cura
    // al aliado con menos vida a 15 m, hasta un 1 % de su vida por segundo) y la regla de sus zonas
    // sagradas (§21): su daño y su cura no se suman (vale la más fuerte) y la cura de zona va a una
    // cubeta de 4 %/s por receptor
    // S-guerrero (G06): la DETONACIÓN de una marca de Juicio se ve (es la clave del Cruzado: va con el
    // Fervor): verbDetonate dorado y un anillo en cada enemigo y UN «¡Juicio! ×N» por instante (juicioBurst)
    g_z_martillo_piadoso: {
      name: 'Martillo Piadoso', desc: 'El 10 % de tu daño sagrado cura al aliado con menos vida a 15 m (hasta un 1 % de su vida por segundo).',
      procs: true,
      state: () => ({ acc: 0, det: [], detAt: -1 }),
      onHit(g, p, e, hit) {
        if (hit?.detonated && !hit.proc && !hit.dot && e?.pos) juicioBurst(g, p, e);
        if (!(hit?.dealt > 0) || !isHolyHit(hit)) return;
        const a = lowestAlly(g, p, p.pos, T.piadoso.radius);
        if (a) bucketHeal(g, p, a, 'piadoso', T.piadoso.cap, hit.dealt * T.piadoso.pct / 100, 'g_z_martillo_piadoso');
      },
      afterCast(g, p) { adoptHoly(g, p); },
      onTick(g, p, dt) {
        adoptHoly(g, p);
        const st = powerState(p, 'g_z_martillo_piadoso');
        st.acc += dt;
        if (st.acc < T.zonaTick - 1e-9) return;
        const step = st.acc;
        st.acc = 0;
        const zones = holyZones(g, p).filter(f => f.data._holy);
        if (!zones.length) return;
        // daño: a cada enemigo, solo el de la zona más fuerte que pisa
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          let best = null;
          for (const f of zones) if (f.data._holy.dps > (best?.data._holy.dps || 0) && insideField(f, e.pos, 0.5 * (e.def?.scale || 1))) best = f;
          if (best) e.takeDamage(Math.max(1, Math.round(best.data._holy.dps * step)), false, { dot: true, source: 'field:zona', skill: best.data.skill || null, tags: best.data.tags || new Set(['zone', 'holy']) });
        }
        // cura: a cada aliado, la de la zona más curativa que pisa (cubeta de zona)
        for (const a of g.allies ? g.allies() : [p]) {
          let heal = 0;
          for (const f of zones) if (f.data._holy.heal > heal && insideField(f, a.pos)) heal = f.data._holy.heal;
          if (heal > 0) bucketHeal(g, p, a, 'zona', T.zonaCap, (a.stats?.maxHP || 0) * heal / 100 * step, 'g_z_zona');
        }
      },
    },
    // z4 Marca Indeleble (rango r): las marcas de Juicio duran 4·r s más
    g_z_marca_indeleble: {
      name: 'Marca Indeleble', desc: 'Las marcas de Juicio duran más.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_juicio' && prof.mark) prof.mark = { ...prof.mark, dur: (prof.mark.dur || 8) + T.marcaIndeleble * rankOf(p, 'g_z_marca_indeleble') }; },
    },
    // z5 Sello del Martillo: soltar el Martillo en la ventana perfecta marca con Juicio a los que golpea
    g_z_sello_martillo: {
      name: 'Sello del Martillo', desc: 'Soltar el Martillo de Guerra en la ventana perfecta marca con Juicio a todos los que golpea.',
      onHit(g, p, e, hit) {
        if (!isHitOf(hit, 'g_martillo') || !hit.perfect || hit.echo || !e?.alive) return;
        const prof = sideMarkProf(p);
        if (prof) g.applyMark(e, prof, p);
      },
    },
    // z6 Golpe Consagrado: la suelta perfecta consagra 4 s el suelo donde cae el Martillo (40 % por
    // segundo; 2 a la vez: el 3.º quita el más viejo; no se suman: lo aplica la regla de z0)
    g_z_golpe_consagrado: {
      name: 'Golpe Consagrado', desc: 'Soltar en la ventana perfecta consagra 4 s el suelo donde cae el Martillo.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_martillo' || !cast.perfect || cast.echo || !cast.target || !g.spawnField) return;
        const prof = cast.prof;
        const rel = prof.charge ? chargeRelease(prof.charge, cast.charge?.t ?? prof.charge.max, { def: prof.def || cast.sk }) : null;
        const c = cast.target.clone().setY(0);
        g.spawnField('zona', { pos: c, radius: (prof.radius || 3) * (rel?.radiusMul || 1), dur: T.consagrado.dur, owner: p, maxPerSkill: T.consagrado.max,
          data: { dps: p.avgHit(T.consagrado.coef, prof.addPct), color: 0xffe7a0, skill: 'g_martillo', tags: prof.tags } });
        adoptHoly(g, p);
      },
    },
    // z7 Sendero Bendito (rango r): tu sendero cura +0,5·r % por segundo (no se suma: regla de z0) y
    // tus aliados van un 10·r % más rápido dentro
    g_z_sendero_veloz: {
      name: 'Sendero Bendito', desc: 'Tu sendero cura más y tus aliados van más rápido dentro.',
      modifyResolve(p, sk, prof) {
        if (sk.id === 'g_sendero' && prof.trail) prof.trail = { ...prof.trail, heal: (prof.trail.heal || 0) + T.senderoBendito.heal * rankOf(p, 'g_z_sendero_veloz') };
      },
      onTick(g, p) {
        const trails = holyZones(g, p).filter(f => f.data?.skill === 'g_sendero');
        if (!trails.length) return;
        const pct = T.senderoBendito.spd * rankOf(p, 'g_z_sendero_veloz');
        for (const a of g.allies ? g.allies() : [p]) if (trails.some(f => insideField(f, a.pos))) keepBuff(a, 'g_z_sendero_veloz', { spdPct: pct }, 0.3, { name: 'Sendero Bendito', icon: '✨', desc: `+${pct}% de velocidad` });
      },
    },
    // z8A Estallido de Luz: detonar una marca hace estallar el 50 % de ese golpe a los demás a 3 m;
    // cada enemigo recibe como mucho un estallido por lanzamiento (el más fuerte)
    g_z_estallido_luz: {
      name: 'Estallido de Luz', desc: 'Detonar una marca hace estallar el 50 % del golpe a todos a 3 m.',
      state: () => ({ list: [] }),
      onCast(g, p) { powerState(p, 'g_z_estallido_luz').list = []; },
      onHit(g, p, e, hit) { if (hit?.detonated && direct(hit) && !hit.echo) powerState(p, 'g_z_estallido_luz').list.push({ e, pos: e.pos.clone(), dealt: hit.dealt || 0 }); },
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_z_estallido_luz');
        const list = st.list; st.list = [];
        if (cast?.echo || !list.length) return;
        const tags = new Set(['area', 'holy']);
        for (const o of g.enemies || []) {
          if (!o.alive) continue;
          let best = 0;
          for (const d of list) if (d.e !== o && dist2D(o.pos, d.pos) <= T.estallidoLuz.radius + 0.5 * (o.def?.scale || 1)) best = Math.max(best, d.dealt * T.estallidoLuz.pct / 100);
          if (best > 0) dealProcDamage(g, o, best, { source: 'power:g_z_estallido_luz', skill: 'g_juicio', tags, elem: 'holy' });
        }
        for (const d of list) g.spawnRing?.(d.pos, T.estallidoLuz.radius, 0xffe680);
      },
    },
    // z8B Condena: tus marcas en élites y jefes duran el doble y, al detonarlas, a los jefes les llenas
    // 15 de Quebranto
    g_z_condena: {
      name: 'Condena', desc: 'Las marcas en élites y jefes duran el doble y, al detonarlas, les llenas Quebranto.',
      onTick(g, p) {
        for (const e of g.enemies || []) {
          const m = e.alive && isEliteOrBoss(e) ? e.marks?.juicio : null;
          if (!m || m.by !== p || m.condena || !(m.t > 0)) continue;
          m.condena = true;
          g.extendMark(e, 'juicio', { mul: T.condenaMul });     // también su Debilidad (Sentencia)
        }
      },
      onHit(g, p, e, hit) { if (hit?.detonated && direct(hit) && isBoss(e)) e.addStagger?.(T.condena, p); },
    },
    // z9A Veredicto Generoso: el Veredicto golpea a 8 m (antes 5 m) y cura un 3 % a tus otros aliados
    // a 8 m (el más herido sigue con la cura de la mecánica). El radio va en el perfil: la mecánica
    // vacía la caché del resolvedor cada vez que el Fervor entra en 3 o sale de 3
    g_z_veredicto_generoso: {
      name: 'Veredicto Generoso', desc: 'El Veredicto golpea a 8 m y cura un 3 % a tus otros aliados a 8 m.',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'g_martillo' || gaugeValue(p, 'fervor') < gaugeTuning().fervor.verdict.cost - 1e-9) return;
        prof.radius = (prof.radius || 3) * T.generoso.radius / T.generoso.mainRadius;
      },
      afterCast(g, p, cast) {
        if (!verdictOf(p, cast)) return;
        const low = gaugeState(p, 'fervor')?.verdictHealed || null;
        const at = cast.target ? cast.target.clone().setY(0) : p.pos.clone();
        g.heal(a => (a === low ? 0 : (a.stats?.maxHP || 0) * T.generoso.heal / 100), { target: 'all', radius: T.generoso.radius, pos: at, src: 'g_z_veredicto_generoso' });
      },
    },
    // z9B Veredicto Pesado: el Veredicto hace +80 % al objetivo principal y a los jefes les llena 25
    // de Quebranto
    g_z_veredicto_pesado: {
      name: 'Veredicto Pesado', desc: 'El Veredicto hace +80 % al objetivo principal y les llena Quebranto a los jefes.',
      condAdd(p, e, hit) {
        const st = gaugeState(p, 'fervor');
        return hit?.skill === 'g_martillo' && st?.verdictLive && e && e === st.verdictTarget ? T.pesado.pct : 0;
      },
      onHit(g, p, e, hit) {
        const st = gaugeState(p, 'fervor');
        if (!isHitOf(hit, 'g_martillo') || hit.echo || !st?.verdictLive || e !== st.verdictTarget || !isBoss(e)) return;
        e.addStagger?.(T.pesado.stagger, p);
      },
    },
    // z10A Senda Ardiente: el sendero hace +30 % por segundo (no se suma) y ralentiza un 30 % (adoptHoly)
    g_z_senda_ardiente: {
      name: 'Senda Ardiente', desc: 'El sendero hace más daño y ralentiza a quien lo pisa.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_sendero' && prof.trail) prof.trail = { ...prof.trail, coef: (prof.trail.coef || 0) + T.sendaArdiente.coef }; },
    },
    // z10B Refugio: el aliado con menos vida en tu sendero gana un escudo del 10 % de tu vida (cada 6 s)
    g_z_refugio: {
      name: 'Refugio', desc: 'El aliado con menos vida en tu sendero gana un escudo (una vez cada 6 s).',
      state: () => ({ at: -99 }),
      onTick(g, p) {
        const st = powerState(p, 'g_z_refugio');
        if (now(p) - st.at < T.refugio.icd - 1e-9) return;
        const trails = holyZones(g, p).filter(f => f.data?.skill === 'g_sendero');
        if (!trails.length) return;
        let best = null;
        for (const a of g.allies ? g.allies() : [p]) {
          if (!trails.some(f => insideField(f, a.pos)) || !(a.stats?.maxHP > 0)) continue;
          if (!best || a.hp / a.stats.maxHP < best.hp / best.stats.maxHP) best = a;
        }
        if (!best) return;
        st.at = now(p);
        best.addShield?.(p.stats.maxHP * T.refugio.pct / 100, T.refugio.dur, 'g_z_refugio');
      },
    },
    // z12 Liturgia (rango r): cada suelta perfecta acorta 0,5·r s tus recargas, salvo la definitiva y
    // Piel de Hierro (como mucho cada 2 s). Por cutCd: el Sendero nunca baja de 4 s
    g_z_liturgia: {
      name: 'Liturgia', desc: 'Cada suelta perfecta acorta tus recargas, salvo la definitiva y Piel de Hierro.',
      state: () => ({ at: -99 }),
      afterCast(g, p, cast) {
        noteStart(p, cast);
        if (!cast?.perfect || cast.echo) return;
        const st = powerState(p, 'g_z_liturgia');
        if (now(p) - st.at < T.liturgia.icd - 1e-9) return;
        st.at = now(p);
        const s = T.liturgia.perRank * rankOf(p, 'g_z_liturgia');
        for (const sk of p.cls?.skills || []) {
          const def = defOf(p, sk.id);
          if (def.cat === 'ultimate' || def.cdOnEnd || sk.id === 'g_piel' || !((p.cds?.[sk.id] || 0) > 0)) continue;
          cutCd(g, p, sk.id, s);
        }
      },
    },
    // z13 Tierra Bendita (rango r): tus zonas sagradas son un 15·r % más grandes y duran r s más (adoptHoly)
    g_z_tierra_bendita: { name: 'Tierra Bendita', desc: 'Tus zonas sagradas son más grandes y duran más.' },
    // z14 Altar de Campaña: al llegar con el Sendero de Luz, un altar 6 s: tus aliados a 4 m hacen +10 %
    // (no se suma: el mismo buff)
    g_z_altar: {
      name: 'Altar de Campaña', desc: 'Al llegar con el Sendero de Luz, levantas un altar que da +10 % de daño a 4 m.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_sendero' || cast.echo || !g.spawnField) return;
        const A = T.altar;
        g.spawnField('aura', { pos: p.pos.clone().setY(0), radius: A.radius, dur: A.dur, owner: p,
          data: { buff: { dmgPct: A.dmgPct }, buffId: 'g_z_altar', meta: { name: 'Altar de Campaña', icon: '⛪', desc: `+${A.dmgPct}% de daño` }, color: 0xffe7a0 } });
      },
    },
    // z15A Milagro: un golpe que mataría a un aliado o a ti lo deja con un 20 % de vida (cada 2 min)
    g_z_milagro: {
      name: 'Milagro', desc: 'Un golpe que mataría a un aliado o a ti lo deja con un 20 % de vida. Una vez cada 2 min.',
      priority: 1,
      state: () => ({ at: -999 }),
      onLethal(g, p) { return milagro(g, p, p); },
      onAllyLethal(g, p, ally) { return milagro(g, p, ally); },
    },
    // z15B Luz Protectora: cada Veredicto te da un escudo del 10 % de tu vida 6 s
    g_z_luz_protectora: {
      name: 'Luz Protectora', desc: 'Cada Veredicto te da un escudo.',
      onGauge(g, p, id, ev) {
        if (id !== 'fervor' || ev !== 'spent') return;
        g.shield(p.stats.maxHP * T.luzProtectora.pct / 100, { target: 'self', dur: T.luzProtectora.dur, src: 'g_z_luz_protectora' });
      },
    },
    // z16 Ardor (rango r): tus golpes sagrados hacen +4·r % por cada punto de Fervor
    g_z_ardor: {
      name: 'Ardor', desc: 'Tus golpes sagrados hacen más daño por cada punto de Fervor.',
      condAdd(p, e, hit) { return isHolyHit(hit) ? T.ardor * rankOf(p, 'g_z_ardor') * Math.floor(gaugeValue(p, 'fervor')) : 0; },
    },
    // z17 Velo Sagrado (rango r): tú y tus aliados dentro de tus zonas sagradas reciben un 5·r % menos
    g_z_velo: {
      name: 'Velo Sagrado', desc: 'Dentro de tus zonas sagradas, tú y tus aliados reciben menos daño.',
      condDr(p) { return inHolyZone(p.game, p, p.pos) ? T.velo * rankOf(p, 'g_z_velo') : 0; },
      onAllyDamaged(g, p, ally, dmg) {
        if (ally === p || !(dmg?.amount > 0) || !inHolyZone(g, p, ally.pos)) return;
        dmg.amount *= 1 - T.velo * rankOf(p, 'g_z_velo') / 100;
      },
    },
    // z18 Absolución (rango r): cada detonación de Juicio cura al aliado con menos vida un r % (cada 2 s)
    g_z_absolucion: {
      name: 'Absolución', desc: 'Cada detonación de Juicio cura al aliado con menos vida (una vez cada 2 s).',
      state: () => ({ at: -99 }),
      onHit(g, p, e, hit) {
        if (!hit?.detonated || !direct(hit)) return;
        const st = powerState(p, 'g_z_absolucion');
        if (now(p) - st.at < T.absolucion - 1e-9) return;
        st.at = now(p);
        const r = rankOf(p, 'g_z_absolucion');
        g.heal(a => (a.stats?.maxHP || 0) * r / 100, { target: 'lowest', radius: 15, src: 'g_z_absolucion' });
      },
    },
    // z20 Gracia del Cielo (rango r): cada Veredicto acorta 2·r s la recarga del Cataclismo (con el
    // suelo de las definitivas: nunca baja de 42 s)
    g_z_gracia: {
      name: 'Gracia del Cielo', desc: 'Cada Veredicto acorta la recarga del Cataclismo.',
      afterCast(g, p, cast) { noteStart(p, cast); },
      onGauge(g, p, id, ev) { if (id === 'fervor' && ev === 'spent') cutCd(g, p, 'g_u_cataclismo', T.graciaCielo * rankOf(p, 'g_z_gracia')); },
    },
    // z21 Vigilia: en tu zona sagrada, el Sendero de Luz se recarga el doble de rápido (suelo de 4 s)
    g_z_vigilia: {
      name: 'Vigilia', desc: 'En tu zona sagrada, el Sendero de Luz se recarga el doble de rápido.',
      afterCast(g, p, cast) { noteStart(p, cast); },
      onTick(g, p, dt) { if ((p.cds?.g_sendero || 0) > 0 && inHolyZone(g, p, p.pos)) cutCd(g, p, 'g_sendero', dt * (T.vigilia - 1)); },
    },
    // z22 Edicto (rango r): al detonar una marca, marcas a r enemigos sin marca a 5 m de él
    g_z_edicto: {
      name: 'Edicto', desc: 'Al detonar una marca, marcas a enemigos cercanos.',
      state: () => ({ list: [] }),
      onCast(g, p) { powerState(p, 'g_z_edicto').list = []; },
      onHit(g, p, e, hit) { if (hit?.detonated && direct(hit) && !hit.echo) powerState(p, 'g_z_edicto').list.push(e); },
      afterCast(g, p, cast) {
        const st = powerState(p, 'g_z_edicto');
        const list = st.list; st.list = [];
        const prof = list.length && !cast?.echo ? sideMarkProf(p) : null;
        if (!prof) return;
        const n = rankOf(p, 'g_z_edicto');
        for (const d of list) {
          const free = enemiesNear(g, d.pos, T.edicto).filter(o => o !== d && !(o.marks?.juicio?.t > 0))
            .sort((a, b) => dist2D(a.pos, d.pos) - dist2D(b.pos, d.pos)).slice(0, n);
          for (const o of free) g.applyMark(o, prof, p);
        }
      },
    },
    // z23 Racha de Fe (rango r): cada suelta perfecta seguida suma +4·r % al Martillo (hasta 5);
    // fallar la ventana la reinicia (p.perfectStreak del núcleo)
    g_z_racha: {
      name: 'Racha de Fe', desc: 'Cada suelta perfecta seguida suma daño al Martillo (hasta 5 veces).',
      condAdd(p, e, hit) { return hit?.skill === 'g_martillo' ? T.racha.perRank * rankOf(p, 'g_z_racha') * Math.min(T.racha.max, p.perfectStreak || 0) : 0; },
    },
    // z24 Peregrino (rango r): en tu zona sagrada haces +4·r % y recibes un 3·r % menos
    g_z_peregrino: {
      name: 'Peregrino', desc: 'En tu zona sagrada haces más daño y recibes menos.',
      condAdd(p) { return inHolyZone(p.game, p, p.pos) ? T.peregrino.dmg * rankOf(p, 'g_z_peregrino') : 0; },
      condDr(p) { return inHolyZone(p.game, p, p.pos) ? T.peregrino.dr * rankOf(p, 'g_z_peregrino') : 0; },
    },
    // z25 Tribunal (final, rango r): la marca aguanta 2/2/3 detonaciones (las siguientes al 40/60/80 %)
    // y la última salta a 2 enemigos (a 6 m) como marca de un uso que ya no salta. Salta al ACABAR el
    // golpe (planificador, 0 s): un golpe de área no detona la marca que acaba de saltar (antes
    // dependía del orden de sus impactos) y no salta a quien detonó Juicio en ese mismo golpe
    g_z_tribunal: {
      name: 'Tribunal', desc: 'Detonar una marca no la gasta: se detona más veces y la última salta a 2 enemigos.',
      state: () => ({ track: new WeakMap(), at: -1, struck: new WeakSet(), jumps: [] }),
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'g_juicio' || !prof.mark) return;
        prof.mark = { ...prof.mark, uses: T.tribunal.uses[Math.min(3, rankOf(p, 'g_z_tribunal')) - 1] };
      },
      onHit(g, p, e, hit) {
        if (!hit?.detonated || !direct(hit)) return;
        const st = powerState(p, 'g_z_tribunal');
        if (st.at !== now(p)) { st.at = now(p); st.struck = new WeakSet(); }
        st.struck.add(e);
        const i = Math.min(3, rankOf(p, 'g_z_tribunal')) - 1;
        const m = e.marks?.juicio;
        if (m && m.by === p && !m.tribunal) {
          m.tribunal = true;
          m.detonate = { ...(m.detonate || {}), pct: (m.detonate?.pct || 100) * T.tribunal.pct[i] / 100 };
          st.track.set(e, m);
          return;
        }
        const old = st.track.get(e);
        if (m || !old) return;
        st.track.delete(e);
        if (!e.pos) return;
        st.jumps.push({ from: e, pos: e.pos.clone(), detonate: old.detonate, at: now(p) });
        g.timers?.schedule(0, () => tribunalJump(g, p, st));      // el primero hace todos los del golpe
      },
    },
    // z26 Martillo Celestial (final, rango r): cada suelta perfecta llama 0,3 s después un martillo
    // del cielo que repite el 30/45/60 % del golpe (repetición). Martillo +15·(r−1) %: mod del nodo.
    // S-guerrero (G04): también la del Cataclismo, donde cayó (cast.at) y con su radio
    g_z_martillo_celestial: {
      name: 'Martillo Celestial', desc: 'Cada suelta perfecta del Martillo o del Cataclismo llama un martillo del cielo que repite parte del golpe.',
      afterCast(g, p, cast) {
        const id = cast?.sk?.id;
        if ((id !== 'g_martillo' && id !== 'g_u_cataclismo') || !cast.perfect || cast.echo) return;
        const at = cast.at || cast.target;
        if (!at) return;
        const prof = cast.prof;
        const rel = prof.charge ? chargeRelease(prof.charge, cast.charge?.t ?? prof.charge.max, { def: prof.def || cast.sk }) : { coefMul: 1, radiusMul: 1, addPct: 0 };
        const pct = T.celestial.pct[Math.min(3, rankOf(p, 'g_z_martillo_celestial')) - 1];
        const c = at.clone().setY(0), rad = (prof.radius || 3) * (rel.radiusMul || 1);
        g.timers?.schedule(T.celestial.delay, () => {
          if (!p.alive) return;
          g.dealArea(c, rad, prof.coef * (rel.coefMul || 1) * pct / 100,
            { addPct: (prof.addPct || 0) + (rel.addPct || 0), critBonus: prof.critBonus, from: c, hitInfo: { skill: id, tags: prof.tags, elem: prof.elem }, hitExtra: { echo: true } });
          g.spawnRing?.(c, rad, 0xfff0a0);
          fxAt(g, 'holyImpact', c, 0.3);
        });
      },
    },
    // z27 Tierra Santa (final, rango r): tus zonas sagradas duran mientras estés dentro (hasta
    // 8/14/20 s) y curan al más herido de dentro un 1 % por segundo (no se suma; cubeta de zona)
    g_z_tierra_santa: {
      name: 'Tierra Santa', desc: 'Tus zonas sagradas duran mientras estés dentro y curan al más herido.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const zones = holyZones(g, p);
        if (!zones.length) return;
        const cap = T.tierraSanta.cap[Math.min(3, rankOf(p, 'g_z_tierra_santa')) - 1];
        for (const f of zones) if (insideField(f, p.pos) && (f.age || 0) < cap) f.t = Math.max(f.t, Math.min(cap - (f.age || 0), 0.25));
        const st = powerState(p, 'g_z_tierra_santa');
        st.acc += dt;
        if (st.acc < T.zonaTick - 1e-9) return;
        const step = st.acc;
        st.acc = 0;
        let low = null;
        for (const a of g.allies ? g.allies() : [p]) {
          if (!zones.some(f => insideField(f, a.pos)) || !(a.stats?.maxHP > 0) || a.hp >= a.stats.maxHP) continue;
          if (!low || a.hp / a.stats.maxHP < low.hp / low.stats.maxHP) low = a;
        }
        if (low) bucketHeal(g, p, low, 'zona', T.zonaCap, low.stats.maxHP * T.tierraSanta.heal / 100 * step, 'g_z_tierra_santa');
      },
    },
    // z28 Aureola (ápice, rangos): 1) matar a un élite llena el Fervor · 2) el Veredicto cura un 10 %
    // (la mecánica) · 3) la ventana perfecta empieza 0,15 s antes (mod del nodo) · 4) cada 8
    // Veredictos, un Cataclismo al 50 % sobre tu objetivo, gratis (repetición: no da Fervor; cada 30 s)
    g_z_aureola: {
      name: 'Aureola', desc: 'Matar élites llena el Fervor, el Veredicto cura más y cada 8 Veredictos cae un Cataclismo gratis.',
      state: () => ({ n: 0, at: -999 }),
      onKill(g, p, e) { if (isEliteOrBoss(e)) gainGauge(p, 'fervor', gaugeMax(p, 'fervor')); },
      onGauge(g, p, id, ev) {
        if (id !== 'fervor' || ev !== 'spent' || rankOf(p, 'g_z_aureola') < 4) return;
        const st = powerState(p, 'g_z_aureola');
        st.n++;
        if (st.n < T.aureola.every || now(p) - st.at < T.aureola.icd - 1e-9) return;
        const slot = Object.keys(p.hotbar || {}).find(k => p.hotbar[k] === 'g_u_cataclismo');
        if (!slot) return;
        st.n = 0; st.at = now(p);
        g.timers?.schedule(0, () => { if (p.alive) g.castSkillSlot(slot, T.aureola.mul); });
      },
    },
  };
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento (formato MEMORIA §7.3)
// ============================================================
export function guerreroSkillBehaviors() {
  const T = tun();
  return {
    // c2 Segundo Aliento: consumes toda la Furia y te curas 1 % de vida por cada 3 gastada
    // (curación de habilidad: escala con healPct y +6 %/rango)
    g_t_aliento: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const per = sk.furyPerPct || 3;
        const fury = p.mp || 0;
        if (fury < per) { refundCd(g, p, sk, 'Segundo Aliento: no tienes Furia'); return ctx.res; }
        spendResource(p, fury);
        const healed = g.heal(p.stats.maxHP * (fury / per) / 100 * (prof.buffMul || 1), { target: 'self', src: sk.id });
        g.ui?.spawnText?.(p.pos, `+${Math.round(healed)}`, 'txt-heal');
        g.spawnRing?.(p.pos, 1.4, ctx.color || 0xff5a4a);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // c3 Intervención: saltas hasta un aliado a ≤ 8 m (el más cercano a la mira) o 8 m hacia
    // la mira; al caer, tú y él ganáis un escudo del 15 % de TU vida máxima 6 s
    g_t_intervencion: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const range = prof.range || sk.range || 8;
        let ally = null, bd = Infinity;
        for (const a of others(g, p, range + 0.5)) {
          const d = a.pos.distanceTo(cast.target);
          if (d < bd) { bd = d; ally = a; }
        }
        let to;
        if (ally) {
          const back = p.pos.clone().sub(ally.pos).setY(0);
          to = back.lengthSq() > 1e-6 ? ally.pos.clone().addScaledVector(back.normalize(), 1).setY(0) : ally.pos.clone().setY(0);
          to = g.clampWalkable(p.pos, to, range + 1);
        } else to = g.clampWalkable(p.pos, cast.target, range);
        p.faceToward(to);
        fxAt(g, ctx.fx?.trail, p.pos, 0.9);
        p.leap = {
          from: p.pos.clone(), to, t: 0, dur: sk.airT || 0.4,
          onLand: () => {
            const amt = (sk.shieldPct || 15) / 100 * p.stats.maxHP * (prof.buffMul || 1);
            g.shield(amt, { target: 'self', dur: prof.dur || 6, src: sk.id });
            if (ally?.alive !== false) ally?.addShield?.(amt, prof.dur || 6, sk.id);
            g.spawnRing?.(p.pos, 1.6, ctx.color || 0x88bbff);
            fxAt(g, ctx.fx?.impact, p.pos, 1.0);
            ctx.res.hits = ally ? 2 : 1;
            cast.done(ctx.res);
          },
        };
        return undefined;   // diferido: termina al caer
      },
    },
  };
}

// ============================================================
// CAMPOS DE SUELO
// ============================================================
// ---- giro del Remolino (S-guerrero, G02) ----
// el cuerpo gira ~2 vueltas por segundo y el anillo de los pies, más despacio y al revés
const GIRO_SPIN = 13, GIRO_RING = 5;
// radios (en unidades del radio real) del aro continuo y de los arcos que giran por dentro
export const GIRO_EDGE = [0.95, 1], GIRO_ARCS = [0.78, 0.9];
// pose del giro sobre el esqueleto procedural (Player.update no toca rig.rotation.y; los brazos los
// pone cada frame antes de los campos, así que aquí se pisan): brazo del arma extendido hacia fuera
export function giroPose(a, age) {
  if (!a?.rig) return;
  a.rig.rotation.y = (age * GIRO_SPIN) % (Math.PI * 2);
  a.rig.rotation.z = 0;
  if (a.armR) { a.armR.rotation.x = -0.3; a.armR.rotation.z = 1.35; }
  if (a.armL) { a.armL.rotation.x = 0.2; a.armL.rotation.z = -0.8; }
}
function giroRender(g, f) {
  const a = f.data.p?.group?.userData?.anim;
  if (f.dead) {
    if (f.ring) {
      g.fxGroup.remove(f.ring);
      f.ring.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
      f.ring = null;
    }
    if (a?.rig) a.rig.rotation.y = 0;              // vuelve a mirar a la mira
    return;
  }
  if (!f.ring) {
    // aro continuo en el radio REAL (rojo sangre: el alcance se lee siempre, también con el Ciclón) y tres
    // arcos que giran por dentro (el segundo color: gris en el Ciclón)
    const [c0, c1 = c0] = f.data.colors || [0xcc2222];
    const mat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending });
    const grp = new THREE.Group();
    const edge = new THREE.Mesh(new THREE.RingGeometry(GIRO_EDGE[0], GIRO_EDGE[1], 64), mat(c0, 0.75));
    edge.rotation.x = -Math.PI / 2;
    grp.add(edge);
    const arcs = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(GIRO_ARCS[0], GIRO_ARCS[1], 24, 1, i * Math.PI * 2 / 3, 1.25), mat(c1, 0.55));
      arc.rotation.x = -Math.PI / 2;
      arcs.add(arc);
    }
    grp.add(arcs);
    grp.userData = { edge, arcs };
    g.fxGroup.add(grp);
    f.ring = grp;
  }
  f.ring.position.set(f.pos.x, 0.08, f.pos.z);
  f.ring.scale.setScalar(f.radius);
  f.ring.userData.arcs.rotation.y = -(f.age || 0) * GIRO_RING;      // giran los arcos; el aro del radio queda quieto
  giroPose(a, f.age || 0);
}

// ---- Cataclismo (S-guerrero, G05): mira mientras cargas, columna al soltar y suelo consagrado ----
const addMat = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide,
  depthWrite: false, blending: THREE.AdditiveBlending });
function dropMeshes(g, obj) {
  if (!obj) return null;
  g.fxGroup.remove(obj);
  obj.traverse(m => { if (m.isMesh) { m.geometry.dispose(); m.material.dispose(); } });
  return null;
}
// motas por segundo de la luz del héroe (de vacío a carga completa) y del suelo consagrado
export const CATA_MOTES = { charge: [3, 15], ground: 5 };
// anillo del radio real en la mira (blanco; dorado en la ventana perfecta), relleno que crece con la
// carga y, en el héroe, un AURA EN LOS PIES que se cierra y se enciende con la carga (no lo envuelve:
// ronda 2, el cilindro de luz lo tapaba); las motas que suben las emite el campo
export const CATA_FEET = { from: 1.6, to: 0.85, opacity: [0.2, 0.7] };
function cataMiraRender(g, f) {
  if (f.dead) { f.vis = dropMeshes(g, f.vis); f.feet = dropMeshes(g, f.feet); return; }
  if (!f.vis) {
    const grp = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 64), addMat(0xfff2c0, 0.7));
    const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48), addMat(0xffe7a0, 0.1));
    ring.rotation.x = fill.rotation.x = -Math.PI / 2;
    const feet = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.8, 40), addMat(0xffe7a0, 0.2));
    feet.rotation.x = -Math.PI / 2;
    grp.add(ring, fill);
    g.fxGroup.add(grp, feet);
    f.vis = grp; f.ring = ring; f.fill = fill; f.feet = feet;
  }
  const k = f.frac || 0;
  f.vis.position.set(f.pos.x, 0.09, f.pos.z);
  f.ring.scale.setScalar(f.radius);
  f.ring.material.color.setHex(f.win ? 0xffc23a : 0xfff2c0);
  f.ring.material.opacity = f.win ? 0.95 : 0.45 + 0.35 * k;
  f.fill.scale.setScalar(Math.max(0.01, f.radius * k));
  f.fill.material.opacity = 0.06 + 0.16 * k;
  const p = f.data.p;
  if (p?.pos) {
    const F = CATA_FEET;
    f.feet.position.set(p.pos.x, 0.07, p.pos.z);
    f.feet.scale.setScalar(F.from + (F.to - F.from) * k);
    f.feet.material.color.setHex(f.win ? 0xffc23a : 0xffe7a0);
    f.feet.material.opacity = f.win ? F.opacity[1] : F.opacity[0] + (F.opacity[1] - F.opacity[0]) * 0.8 * k;
  }
}
// columna de luz: baja del cielo durante el retardo del impacto y, al caer, se abre y se apaga en
// COLUMNA_FADE s (ronda 2: no blanquea el impacto); mientras arde queda un haz fino que late con cada
// golpe y se apaga al acabar. Opacidades bajas: es aditiva
export const COLUMNA = { h: 14, core: 0.35, halo: 0.12, fade: 0.18, beam: 0.3, beamOpacity: 0.28 };
function cataColumnaRender(g, f) {
  if (f.dead) { f.vis = dropMeshes(g, f.vis); return; }
  const C = COLUMNA;
  if (!f.vis) {
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), addMat(0xfff6d8, C.core)));
    grp.add(new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 1, 24, 1, true), addMat(f.data.color || 0xffe7a0, C.halo)));
    g.fxGroup.add(grp);
    f.vis = grp;
  }
  const delay = f.data.delay || 0.3, burn = f.data.burnT || 0, every = f.data.every || 0.3, age = f.age || 0;
  const r = Math.min(1.8, Math.max(0.6, f.radius * 0.28));
  let len = C.h, w = r, core = C.core, halo = C.halo;
  if (age < delay) len = C.h * Math.max(0.05, age / delay);                              // baja
  else if (age < delay + C.fade) {                                                       // cae: se abre y se apaga
    const k = (age - delay) / C.fade;
    w = r * (1 + 0.6 * k); core = C.core * (1 - k); halo = C.halo * (1 - k);
  } else if (age < delay + burn) {                                                       // arde: haz fino que late
    const ph = ((age - delay) % every) / every;
    w = r * C.beam; core = C.beamOpacity * (1 - 0.6 * ph); halo = 0;
  } else {                                                                               // se apaga
    const k = Math.min(1, (age - delay - burn) / C.fade);
    w = r * C.beam; core = C.beamOpacity * 0.4 * (1 - k); halo = 0;
  }
  f.vis.scale.set(w, len, w);
  f.vis.position.set(f.pos.x, C.h - len / 2, f.pos.z);
  f.vis.children[0].material.opacity = core;
  f.vis.children[1].material.opacity = halo;
}
// borde brillante del suelo consagrado (late despacio) mientras viva la zona
function sueloRender(g, f) {
  if (f.dead) { f.vis = dropMeshes(g, f.vis); return; }
  if (!f.vis) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), addMat(f.data.color || 0xffe7a0, 0.6));
    ring.rotation.x = -Math.PI / 2;
    g.fxGroup.add(ring);
    f.vis = ring;
  }
  f.vis.position.set(f.pos.x, 0.1, f.pos.z);
  f.vis.scale.setScalar(f.radius);
  f.vis.material.opacity = 0.45 + 0.25 * Math.sin((f.age || 0) * 4);
}

export function guerreroFields() {
  return {
    // Giro del Remolino Sangriento (S-guerrero, G02): lo crea el tic del Remolino (skills-guerrero.js) y
    // vive mientras dure ESE canal (data.inst; también lo que alarga Danza Carmesí). Sigue al héroe
    // (data.p; sin dueño: no ocupa sitio en el tope de campos del héroe ni cuenta como suyo) con el
    // radio actual del perfil. Solo dibuja: el héroe gira con el brazo extendido y el anillo rota
    g_giro: {
      name: 'Giro',
      tick(g, f) {
        const d = f.data, p = d.p;
        if (!p?.alive || g._channel !== d.inst) { f.t = 0; return; }
        f.pos.x = p.pos.x; f.pos.z = p.pos.z;
        f.radius = d.inst.ctx?.prof?.radius || f.radius;
      },
      render(g, f) { giroRender(g, f); },
    },
    // Mira del Cataclismo (G05): la crea la mecánica del Fervor al empezar a cargar (mech-guerrero.js) y
    // vive mientras dure ESA carga (data.cast). Sigue a la mira con el radio real; la luz del héroe
    // (motas cataChargeMote) se acelera con la carga
    g_cata_mira: {
      name: 'Mira del Cataclismo',
      init(f) { f.acc = 0; f.frac = 0; f.win = false; },
      tick(g, f, dt) {
        const d = f.data, p = d.p, c = g._charging;
        if (!p?.alive || !c || c.ctx?.cast !== d.cast) { f.t = 0; return; }
        const prof = c.prof || d.prof;
        const aim = typeof g.skillTarget === 'function' ? g.skillTarget(p, prof)?.target : null;
        if (aim) { f.pos.x = aim.x; f.pos.z = aim.z; }
        const rel = chargeRelease(c.ch, c.u, { def: prof.def || c.sk });
        f.radius = (prof.radius || 6) * (rel.radiusMul || 1);
        f.frac = c.frac || 0; f.win = !!c.inWindow;
        const [lo, hi] = CATA_MOTES.charge;
        f.acc += dt * (lo + (hi - lo) * f.frac);
        if (f.acc >= 1) { f.acc -= 1; g.emitFx?.('cataChargeMote', p.pos.clone().setY(0.4 + 1.4 * f.frac)); }
      },
      render(g, f) { cataMiraRender(g, f); },
    },
    // Columna de luz del Cataclismo (G05): baja durante el retardo del impacto; solo dibuja
    g_cata_columna: {
      name: 'Columna de luz',
      render(g, f) { cataColumnaRender(g, f); },
    },
    // Suelo consagrado del Cataclismo (G05): sigue a SU zona (data.zone, la que hace el daño) mientras
    // viva —Tierra Santa la alarga y Tierra Bendita la agranda—; borde brillante y motas doradas
    g_suelo_sagrado: {
      name: 'Suelo consagrado',
      init(f) { f.acc = 0; f.n = 0; },
      tick(g, f, dt) {
        const z = f.data.zone;
        if (!z || z.dead || !(z.t > 0)) { f.t = 0; return; }
        f.pos.x = z.pos.x; f.pos.z = z.pos.z; f.radius = z.radius;
        f.acc += dt * CATA_MOTES.ground;
        while (f.acc >= 1) {
          // reparto en espiral áurea por el disco (sin azar: el de la simulación es de rng.js)
          f.acc -= 1; f.n++;
          const a = f.n * 2.39996, r = Math.sqrt((f.n * 0.618034) % 1) * f.radius;
          g.emitFx?.('holyGroundMote', v3(f.pos.x + Math.cos(a) * r, 0.15, f.pos.z + Math.sin(a) * r));
        }
      },
      render(g, f) { sueloRender(g, f); },
    },
    // Pendón del Caudillo (h3): un pulso al clavarse y otro cada 0,5 s (pendonPulse); con
    // Abanderado sigue al dueño (follow 'owner' del núcleo); al acabar, Relevo da un escudo del
    // 10 % de su vida a los aliados a 8 m
    g_pendon: {
      name: 'Pendón',
      init(f) { f.acc = 0; f.pulsed = false; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.pulsed && f.acc < (f.data.interval || 0.5) - 1e-9) return;
        const step = f.pulsed ? f.acc : 0;
        f.acc = 0; f.pulsed = true;
        pendonPulse(g, f, step);
      },
      onExpire(g, f) {
        const o = f.owner;
        if (!o?.alive || !hasPower(o, 'g_cau_relevo')) return;
        const R = tun().relevo;
        for (const a of g.allies ? g.allies(v3(f.pos.x, 0, f.pos.z), R.radius) : [o]) a.addShield?.((a.stats?.maxHP || 0) * R.pct / 100, R.dur, 'g_cau_relevo');
      },
      render(g, f) {
        if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
        if (!f.decal || f.decalR !== f.radius) {
          if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); }
          const decal = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.95, f.radius, 48),
            new THREE.MeshBasicMaterial({ color: f.data.gran ? 0xffd27a : 0xd8a040, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
          decal.rotation.x = -Math.PI / 2;
          g.fxGroup.add(decal);
          f.decal = decal; f.decalR = f.radius;
        }
        f.decal.position.set(f.pos.x, 0.06, f.pos.z);
      },
    },
  };
}

// ============================================================
// INDICADORES NUEVOS: ninguno (Sed, Bastión y Fervor son de spec-mechanics.js)
// ============================================================
export function guerreroGauges() {
  return {};
}
