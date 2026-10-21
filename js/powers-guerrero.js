// ============================================================
// PODERES del GUERRERO (Berserker · Guardián · Cruzado) — Paso 2c.1
// ============================================================
// Dueño: el trabajador de la clase en el Paso 2c.1 (docs/paso2-diseno.md §9.1.6).
// Solo se tocan ESTE archivo, js/talents-guerrero.js, js/fx-skills-guerrero.js y
// tests/test-powers-guerrero.mjs. js/powers.js ya importa y registra al cargar los
// cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-guerrero.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Los helpers de este
// archivo son también declaraciones de función (se elevan con el módulo); los
// valores de diseño viven en tun() (función, no constante de módulo).
//
//  guerreroPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js:
//                        stats modifyResolve condAdd condCrit onCast afterCast onHit onKill
//                        condDr onDamaged onLethal onTick onGauge · icd priority procs state
//                        name desc tags). `mult` SOLO en los nodos clave ya registrados
//                        (powers-common.js: m_berserk/m_deadeye/m_hunt): un poder nuevo con
//                        mult lo rechaza test67.
//  guerreroSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?(g,p,inst,dt), end?(g,p,inst) } }
//                        → defineSkillBehavior: el `behavior` de las activas de talento de
//                        js/talents-guerrero.js (formato de MEMORIA.md §7 punto 3).
//  guerreroFields()          { kind: { init, tick, onEnter?, onExit?, onExpire?, render? } } → defineField
//  guerreroGauges()          { id: GaugeDef } → spec-mechanics.defineGauge (solo indicadores NUEVOS;
//                        los 9 de §2 ya existen: potencia los tuyos con gainGauge/spendGauge
//                        y el gancho onGauge(g, p, id, ev, n, e)).
//
// REGLAS: no uses nada importado en el nivel superior del módulo (ciclo powers.js ↔
// powers-<clase>.js: los bindings importados solo se usan DENTRO de los ganchos). Nada de `powers.has(` fuera de js/powers*.js
// (aquí sí se puede: hasPower(p, id)), ni setTimeout (g.timers.schedule), ni
// Math.random en la simulación (g.simRng(stream) / p.combatRng). Daño de un poder:
// dealProcDamage(g, e, n, { source: 'power:<id>' }). Control: e.applyCC(kind, dur, { src: p,
// stagger? }). Curas: p.sustain (golpe/muerte) o g.heal / g.shield (habilidad). Amenaza:
// g.forceTarget(e, p, t) / g.addThreat(e, p, n). Aliados: g.allies(pos, r).
//
// ------------------------------------------------------------
// LO QUE HAY AQUÍ (2c.1 + 2c.2)
// ------------------------------------------------------------
// · 29 poderes de los árboles (clase, Berserker, Guardián, Cruzado), uno por nodo.
// · 11 comportamientos de activas de talento: Segundo Aliento, Intervención, Bramido,
//   Remolino Sangriento, Temeridad, Ira Ciega, Grito Desafiante, Muro de Escudos,
//   Carga de Escudo, Aura de Devoción y Veredicto Final (Martillo de Justicia usa el
//   tipo genérico `proj`: aturdir + bossStun + stagger ya los entiende el núcleo).
// · 3 campos de suelo: g_devocion (aura que te sigue), g_consagracion (suelo sagrado
//   que cura) y g_martillos (martillos orbitales del Martillo Bendito).
// · Indicadores (spec-mechanics): Sed (Remolino Sediento +4/enemigo, Instinto Asesino
//   +2/crítico, Temeridad ×2 por stat 'gaugeGain:sed', Negación la llena, Desenfreno al
//   llenarse, Carnicero +15·r por remate), Bastión (Desafío Firme +2, Martillo Pesado +1,
//   Muro de Escudos las gasta, Muralla Viva −2·r % por carga, Bastión Eterno con 5) y
//   Fervor (Devoción Ferviente +1, Fervor Creciente del núcleo, Veredicto gasta 3, Luz
//   del Alba alarga el Aura, Ascensión no gasta).
//
// PASO 2c.2 — sin portadores: cada nodo con efecto propio lleva SU poder o una clave tv
// que consume el núcleo (poder común nucleo_tv / combat-math / spec-mechanics). Un poder
// solo lee el rango de SU PROPIO nodo (ownRank).
//   Berserker  s5 Instinto Asesino → g_instinto_asesino (+2 Sed por crítico)
//              s8 Festín de Sangre → tv.bleedKillHeal · s15 Sed Insaciable → tv.bleedKillMana
//              s9 Temeridad → sin poder: su buff lleva 'gaugeGain:sed' (+100) y dmgTakenPct (+10)
//              x1 Ejecutar → tv.executePct (remate, +40 a élites/jefes, wasExecuted)
//              x2 Carnicero → g_carnicero (onKill de un remate) · x3 → g_matanza_eterna
//   Guardián   s4 → g_desafio_firme · s7 Martillo Pesado → g_martillo_pesado
//              s8 Recuperación → tv.killHeal · s14 Vínculo → ⑫ onAllyDamaged
//              x3 Bastión Eterno → ⑫ onAllyLethal (icd 60 s)
//   Cruzado    s6A Consagración → g_consagracion (afterCast de Martillo: campo que cura)
//              s8 Luz Sanadora → tv.killHeal (a ti) + g_luz_sanadora (a los aliados a 10 m)
//              s12 Fervor Creciente → tv.fervorChance · s13A Intercesión → ⑫ onAllyLethal (icd 90 s)
//   Clase      c15 Hermandad de Armas → ⑪ onResource (+5 % de la Furia ganada por aliado)
//
// GRUPO (cooperativo; en solitario no hacen nada): Hermandad de Armas (buff a aliados a
// 15 m y +5 % de Furia por aliado), Bramido/Devoción/Intervención/Veredicto (aliados en
// el radio), Mano Sanadora, Luz Sanadora, Martillo Bendito (curas a aliados), Vínculo del
// Guardián (te pasas el 20 % del daño de los aliados a 10 m), Intercesión y Bastión Eterno
// (un aliado que iba a caer queda a 1). El daño de los aliados entra por g.damageAlly (⑫).
// Los aliados son las entidades de g.party (contrato de g.allies: { pos, alive, hp,
// stats.maxHP, healSkill, addShield, addBuff?, sustain?, setHp?, grantInvuln? }).
//
// ------------------------------------------------------------
// PASO 2g (docs/paso2g-guerrero.md §6, §9, §11.3; KT-guerrero, trabajo 1): árbol de clase
// c1…c30 y árboles héroe Titán (t*), Gladiador (l*) y Caudillo (u*)
// ------------------------------------------------------------
// · Cada nodo lleva SU poder (`g_*`, `g_ti_*`, `g_gl_*`, `g_cau_*`) o claves tv/stats/mod.
//   Los finales leen su rango con rankOf (= talents.powerRank). Los nodos de ajuste de un árbol
//   héroe (Aplastar, Ira Acumulada, Asta Alta…) son claves tv de la clase (GUERRERO_TV_KEYS)
//   que lee el poder de la mecánica (Golpe de Titán, Rival, Pendón).
// · Furia GASTADA (Desenfreno, Señor de la Guerra, Golpe de Titán): solo el coste que cobra una
//   habilidad (③ afterCast, furyPaid). No cuentan Furia Protectora, Segundo Aliento ni drenajes.
// · «Tu movilidad» (c14, c27, c30): la cadena de un relanzamiento cuenta solo su primer uso.
// · Suelo de las definitivas (rejuicio §20, nota 13 del plan): ninguna reducción de talento deja
//   la recarga efectiva por debajo del 70 % de la base del catálogo (ultCut).
// · Reacciones de una mecánica: el Golpe de Titán guarda su golpe (titanStrike) y los demás
//   nodos reaccionan en su propio afterCast; el Rival guarda nombramientos, muertes y
//   Quebrantos; el Pendón llama a sus nodos al clavarse y al acabar (lo leen por hasPower).
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, spendGauge, gaugeValue, gaugeMax } from './spec-mechanics.js';
import { dotProfile, damageReduction, takenMult, chargeRelease, rankCoef, rankBuff, CAPS } from './combat-math.js';
import { spendResource } from './resources.js';
import { wasExecuted } from './powers-common.js';
import { n1 } from './talent-text.js';
// (importados: úsalos solo dentro de los ganchos). Sin talents.js ni skill-resolve.js: los dos
// llegan a data.js y, si el primer módulo cargado es resources.js, el ciclo resources → powers →
// aquí → data dejaría RESOURCE_DEFS sin iniciar (la misma razón que en powers-common.js)

// ------------------------------------------------------------
// valores de diseño (texto de los nodos) — función: ver la nota del ciclo de módulos
// ------------------------------------------------------------
function tun() {
  return {
    brother: { dmgPct: 5, hpPct: 8, radius: 15, furyPct: 5, maxAllies: 3 },   // c15
    coraza: { below: 0.3, dr: 30, dur: 5, icd: 60 },                        // c12B
    remolinoSed: { perHit: 2, max: 20 },                                     // s4 Berserker
    instintoSed: 2,                    // s5 Berserker: Sed por crítico
    remolinoBleedMul: 0.3,             // Sangrado de Remolino por tic (× perfil de Sangrado)
    carniceria: { jump: 4 },           // s6A: el Sangrado salta a cercanos a ≤ 4 m
    butcher: { sedPerRank: 15, fury: 5 },                                  // x2 Carnicero
    eternal: 2,                        // x3 Matanza Eterna: +2 s de Desenfreno por remate
    frenzy: { aspdPct: 30, dur: 8, healPct: 1 },                            // s14 Desenfreno
    negacion: { icd: 120 },
    desafioFirme: 2, martilloPesado: { hits: 3, n: 1 },                     // Guardián s4 / s7
    reto: { pct: 20, dur: 8 },                                              // Guardián s6B
    juramento: 10,                     // s13A: Muro Inquebrantable 30 → 20 s
    vinculo: { pct: 20, radius: 10 },                                       // s14
    muralla: 1,                        // s17: −1 %/rango por carga de Bastión (Paso 2e: era 2)
    represalia: 30,                    // x1: % del daño bloqueado o absorbido que reflejas
    venganza: { pctPerRank: 20, radius: 6 },                                // x2
    eterno: { radius: 10, icd: 60, invuln: 2 },                             // x3 Bastión Eterno
    manoRadius: 10,                    // Cruzado s3
    ferviente: { fervor: 1, heal: 10 },                                     // s4
    sentencia: { pct: 20, dur: 4, radius: 2.9 },                            // s6B (radio de Juicio)
    consagracion: { healPctPerSec: 2 },                                     // s6A
    luzRadius: 10,                     // s8
    banner: 15,                        // s10: radio del Estandarte
    intercesion: { icd: 90, cost: 20, radius: 15 },                         // s13A
    alba: { dmgPct: 25, selfDmgPct: 10, perFervor: 1 },                                     // s14
    hammers: { n: 3, coef: 0.15, every: 1, reach: 2.6, healPct: 1, healRadius: 15, juicioPct: 15 },  // x1/x2
    ascension: { need: 3, gap: 8, dur: 10, radius: 30, minCd: 1.5 },        // x3

    // ---- Paso 2g · árbol de clase (§6) ----
    tajoFirme: 5,                                         // c5A: 10 → 15 de Furia por Tajo contra élites y jefes
    tajoVoraz: { costPct: -50, dur: 8 },                  // c5B: la siguiente principal a media Furia
    ensanamiento: { pct: 25, reach: 1.5 },                // c6A: al de más vida de los que alcanza la principal
    sinCuartel: { per: 5, max: 5, radius: 2.5 },          // c6B: +5 % por enemigo (hasta +25 %)
    marcha: 1,                                            // c7: s de imparable tras tu movilidad
    golpePesado: 15,                                      // c9A: Quebranto a jefes por golpe preparado o suelta perfecta
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
    rencor: { radius: 4, pctPerRank: 10 },                // c25
    desenfreno: { need: 80, window: 4, dur: 4, base: 4, perRank: 8 },   // c26
    rugido: { radius: 5, pctPerRank: 8, dur: 4 },         // c27
    inquebrantable: { base: 25, perRank: 15, cd: 15, furyPerRank: 10 }, // c28: presupuesto 40/55/70 % de la vida
    senorGuerra: { every: 100, base: 20, perRank: 20, delay: 0.25 },   // c29: copia al 40/60/80 %
    asalto: { perRank: 15, dur: 6, refund: 0.5, icd: 6 }, // c30
    ultFloor: 0.7,                                        // suelo de las definitivas: 70 % de su base

    // ---- Paso 2g · árboles héroe (§9) ----
    // Titán: cada 60 de Furia pagada, la siguiente principal +40 % y sacude el suelo a 4 m (50 %);
    // `pending` = s sin afterCast tras los que un Golpe de Titán anulado (esquiva) vuelve a estar listo
    titan: { every: 60, pct: 40, radius: 4, coef: 0.5, stagger: 15, slowDur: 2, pending: 3 },
    aplomo: 3, pielMontana: { pct: 8, dur: 5 }, eco: { delay: 1, mul: 0.5 }, quiebrahuesos: 15,
    derrumbe: { radius: 3, coef: 1 }, mole: { per: 20, max: 2 }, temblor: { pct: 10, dur: 4 },
    peso: 1, coloso: { icd: 30, dur: 8, mul: 0.5 },
    // Gladiador: Rival 10 s (+15 %); Muchos Rivales 3 a +10 %; Duelo a Muerte 1 a +30 % sin caducar;
    // al morir, +20 de Furia y pasa al más cercano a `pass` m; Desafío de Arena +20 % 8 s
    rival: { dur: 10, pct: 15, fury: 20, pass: 12, many: 3, manyPct: 10, duelPct: 30, arenaPct: 20, arenaDur: 8, arenaReach: 6 },
    ovacion: { normalDiv: 5, icd: 2 },                    // tv.rivalKillHeal 10 → 2 % con un Rival normal
    tiroArena: { slowPct: 40, dur: 3, icd: 4 },
    contraataque: { win: 2, pct: 60, healPct: 5 },
    gloria: { max: 5, step: 0.2, pct: 4, idle: 8 },
    retirada: { pct: 30, icd: 6 },
    sangreArena: 5, clamor: { radius: 6, dur: 2, stagger: 20, push: 3 }, pulgar: { below: 0.3, pct: 40 },
    finta: { radius: 3, s: 2 }, campeon: 10, vitores: { s: 6, icd: 15 },
    triunfo: { dur: 10, max: 15, dmgPct: 25, costPct: -50, icd: 35, perKill: 1 },
    // Caudillo: un Pendón cada 15 s donde estás (si hay enemigos a `combat` m), 12 s, 8 m, +8 % / −8 %
    pendon: { every: 15, dur: 12, radius: 8, dmgPct: 8, dr: 8, interval: 0.5, combat: 12 },
    arenga: { pct: 5, radius: 8 }, clarin: 20, desbandada: { radius: 8, dur: 2, stagger: 20, push: 3 },
    orden: { radius: 15, pct: 15, dur: 10 }, relevo: { pct: 10, radius: 8, dur: 6 },
    granEstandarte: { icd: 40, dur: 15, mul: 2 }, estandarteRange: 15,
  };
}

// ------------------------------------------------------------
// helpers (declaraciones de función: se elevan con el módulo)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isEliteOrBoss(e) { return !!e?.def?.rank || isBoss(e); }
function specOf(p) { return p?.talentAgg?.spec || null; }
// rango REAL del PROPIO nodo del poder que lo pregunta (0 si no es esa especialización).
// Solo para escalar el efecto de SU nodo (Mano Sanadora, Muralla, Carnicero, Venganza,
// Martillos del Juicio): nunca para encender el efecto de otro nodo (Paso 2c.2).
function ownRank(p, id, spec) {
  const s = specOf(p);
  if (!s || (spec && s !== spec)) return 0;
  return (p.talents?.sp?.[s]?.[id] | 0);
}
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
// SUSTENTO de un aliado (su cubeta; un aliado sin cubeta lo recibe como curación)
function allySustain(a, amt, src) {
  if (!(amt > 0) || !a) return 0;
  return a.sustain ? a.sustain(amt, src) : (a.healSkill?.(amt, src) || 0);
}
function fxAt(g, name, pos, y = 1) {
  if (!name || !pos || !g?.emitFx) return;
  g.emitFx(name, pos.clone ? pos.clone().setY(y) : { x: pos.x, y, z: pos.z });
}
function fieldOf(g, p, kind) { return (g?.fields || []).find(f => !f.dead && f.kind === kind && f.owner === p) || null; }
function v3(x, y, z) { return new THREE.Vector3(x, y, z); }
// Muro de Escudos: puntos de reducción de daño del buff y daño que evitó en un golpe
function muroDr(p) { return buffOf(p, 'g_t_muro')?.stats?.dr || 0; }
function muroPrevented(p, amount) {
  const m = muroDr(p);
  if (!(m > 0) || !(amount > 0)) return 0;
  const t = Math.min(50, p.stats?.dr || 0), without = Math.max(0, t - m);
  return amount * (t - without) / Math.max(1, 100 - t);
}
function nearAL(g, p) {
  let al = 0;
  for (const e of g?.enemies || []) if (e.alive && e.pos.distanceTo(p.pos) <= 20) al = Math.max(al, e.def?.level || 0);
  return al || p.level || 1;
}
// ¿el aliado (de g.party, no tú) está a ≤ r m?
function allyNear(p, a, r) { return !!a && a !== p && !!a.pos?.distanceTo && a.pos.distanceTo(p.pos) <= r; }
// Sangrado de una activa (perfil central de DoT; fuente '<habilidad>:bleed' → Sed y KillInfo)
function applyBleed(g, p, e, avgHit, mul, skill) {
  if (!e?.alive) return;
  const d = dotProfile('bleed', avgHit, { dotMul: mul, tv: p.tv });
  if (d) g.applyDoT?.(e, d.total, d.ticks, d.interval, undefined, `${skill}:bleed`);
}
// buff de una activa (como el tipo genérico `buff`): a ti o, con tag ally, al grupo
function castBuff(g, p, prof, sk, ctx, stats) {
  const meta = { name: sk.name, icon: sk.icon, desc: sk.desc };
  const targets = prof.tags.has('ally') ? g.allies(p.pos, sk.allyRadius || 15) : [p];
  for (const a of targets) {
    a.addBuff?.(sk.id, { ...(stats || prof.buff) }, prof.dur, meta);
    if (prof.unstoppable) a.unstoppableT = Math.max(a.unstoppableT || 0, prof.dur);
  }
  g.spawnRing?.(p.pos, 1.4, ctx.color || 0x66ddff);
  fxAt(g, ctx.fx?.aura, p.pos, 1.0);
  fxAt(g, ctx.fx?.extra, p.pos, 0.2);
  return targets;
}
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
  p.recompute();
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
// recarga de tu movilidad recortada por un poder (Finta, Asalto Total). Los suelos propios de la
// Carga de Escudo (d17) y del Sendero (z21) y la cuenta de «seguidas» de Estampida Sin Fin (b27)
// se enganchan aquí con sus nodos (trabajos 2 y 3)
function moveCut(g, p, s) {
  const sk = myMovement(p);
  if (!sk || !(s > 0) || !((p.cds?.[sk.id] || 0) > 0)) return 0;
  return g.reduceCooldown?.(p, sk.id, s) || 0;
}
// ---- suelo de las definitivas (rejuicio §20; nota 13 del plan: absoluto, 70 % de sk.cd) ----
// Entre todos los talentos, la recarga EFECTIVA de una definitiva (lo que ya pasó desde que
// empezó + lo que le falta) no baja del 70 % de su base del catálogo. Lo recortado por otros
// cuenta porque se mide lo que falta de verdad. El inicio lo anota noteUlt (③ afterCast de los
// poderes que recortan); sin anotación se supone que nadie la recortó (cdMax − lo que falta).
const ULT_STATE = 'g_ult_suelo';
function noteUlt(p, cast) {
  if (!cast || cast.echo || (cast.sk?.cat || cast.prof?.cat) !== 'ultimate') return;
  const st = powerState(p, ULT_STATE);
  (st.start || (st.start = {}))[cast.sk.id] = now(p);
}
function ultCut(g, p, s) {
  if (!(s > 0)) return 0;
  const T = tun();
  const st = powerState(p, ULT_STATE);
  let total = 0;
  for (const sk of p?.cls?.skills || []) {
    if (sk.cat !== 'ultimate') continue;
    const left = p.cds?.[sk.id] || 0;
    if (!(left > 0)) continue;
    const t0 = st.start?.[sk.id];
    const elapsed = t0 != null && t0 <= now(p) ? now(p) - t0 : Math.max(0, (p.cdMax?.[sk.id] || left) - left);
    const room = Math.max(0, left - Math.max(0, (sk.cd || 0) * T.ultFloor - elapsed));
    const cut = Math.min(s, room);
    if (cut > 1e-9) total += g.reduceCooldown?.(p, sk.id, cut) || 0;
  }
  return total;
}
// recorta TODAS tus recargas en `s` (las definitivas con su suelo): Disciplina del Pendón
function cutAll(g, p, s) {
  for (const sk of p?.cls?.skills || []) {
    if (!((p.cds?.[sk.id] || 0) > 0)) continue;
    if (sk.cat === 'ultimate') ultCut(g, p, s); else g.reduceCooldown?.(p, sk.id, s);
  }
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
// miedo (Clamor del Público, Desbandada): «huyen 2 s». Sin control de miedo en el núcleo (cola
// W2: applyCC('fear')), se aleja a los enemigos `push` m (desplazar, con sus rendimientos
// decrecientes). A los jefes no: les llena Quebranto.
function scare(g, p, center, radius, { dur, stagger, push }) {
  let n = 0;
  for (const e of enemiesNear(g, center, radius)) {
    if (isBoss(e)) { if (e.addStagger?.(stagger, p) > 0) n++; continue; }
    const got = e.applyCC?.('fear', dur, { src: p, from: center }) || 0;
    if (got > 0 || (e.displace?.(center, push, { toward: false, src: p }) || 0) > 0) n++;
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
    g_golpe_pesado: {
      name: 'Golpe Pesado', desc: 'Tus golpes con preparación y tus sueltas perfectas llenan 15 de Quebranto a los jefes.',
      state: () => ({ at: -1, seen: new Set() }),
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
    // lanza al 50 %: gasta la mitad de tu Furia y cura 1 % por cada 3 gastados (su recarga de 30 s;
    // esa Furia no cuenta como gastada)
    g_piel_aliento: {
      name: 'Segundo Aliento', desc: 'Si Segundo Aliento no está en la barra, sale con Piel de Hierro al 50 %.',
      state: () => ({ readyAt: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'g_t_aliento')) return;
        const sk = skillOf(p, 'g_t_aliento');
        const st = powerState(p, 'g_piel_aliento');
        if (!sk || now(p) < st.readyAt - 1e-9 || (p.cds?.[sk.id] || 0) > 0) return;
        const per = sk.furyPerPct || 3;
        const fury = (p.mp || 0) * T.pielHalf;
        if (fury < per * T.pielHalf) return;
        spendResource(p, fury);
        const prof = profOf(g, p, sk.id);
        g.heal(p.stats.maxHP * (fury / per) / 100 * (prof.buffMul || 1), { target: 'self', src: 'g_piel_aliento' });
        st.readyAt = now(p) + (prof.cd || sk.cd || 30);
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
        if (!(fury > 0)) return;
        p.mp -= fury;
        dmg.amount -= fury * perFury;
      },
    },
    // c15B Furia Desbordante (Furia máxima +30: stat mp del nodo): por encima de 100, +10 % de daño
    g_desbordante: {
      name: 'Furia Desbordante', desc: 'Por encima de 100 de Furia, haces +10 % de daño.',
      condAdd(p) { return (p.mp || 0) > T.desbordante.over ? T.desbordante.dmgPct : 0; },
    },
    // c17A Grito de Guerra (la activa la concede el nodo): si no está en la barra, cada Piel de
    // Hierro lo lanza al 50 %: +15 de Furia y +5 % de daño al grupo a 15 m 8 s (su recarga de 20 s)
    g_piel_grito: {
      name: 'Grito de Guerra', desc: 'Si Grito de Guerra no está en la barra, sale con Piel de Hierro al 50 %.',
      state: () => ({ readyAt: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'grito_guerra')) return;
        const sk = skillOf(p, 'grito_guerra');
        const st = powerState(p, 'g_piel_grito');
        if (!sk || now(p) < st.readyAt - 1e-9 || (p.cds?.[sk.id] || 0) > 0) return;
        const prof = profOf(g, p, sk.id);
        g.gainResource(p, (prof.gen || sk.gen || 30) * T.pielHalf);
        const buff = {};
        for (const [k, v] of Object.entries(prof.buff || sk.buff || {})) buff[k] = Math.round(v * T.pielHalf);
        const meta = { name: sk.name, icon: sk.icon, desc: `+${buff.dmgPct || 0}% de daño` };
        for (const a of g.allies ? g.allies(p.pos, sk.allyRadius || 15) : [p]) a.addBuff?.(sk.id, { ...buff }, prof.dur || sk.dur || 8, meta);
        st.readyAt = now(p) + (prof.cd || sk.cd || 20);
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
    // salto, un escudo del 8 % de tu vida a ti y al aliado más cercano (su recarga de 20 s)
    g_piel_intervencion: {
      name: 'Intervención', desc: 'Si Intervención no está en la barra, sale con Piel de Hierro al 50 %, sin salto.',
      state: () => ({ readyAt: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel' || cast.echo || onBar(p, 'g_t_intervencion')) return;
        const sk = skillOf(p, 'g_t_intervencion');
        const st = powerState(p, 'g_piel_intervencion');
        if (!sk || now(p) < st.readyAt - 1e-9 || (p.cds?.[sk.id] || 0) > 0) return;
        const prof = profOf(g, p, sk.id);
        const amt = Math.round((sk.shieldPct || 15) * T.pielHalf) / 100 * p.stats.maxHP * (prof.buffMul || 1);
        const dur = prof.dur || sk.dur || 6;
        g.shield(amt, { target: 'self', dur, src: 'g_piel_intervencion' });
        let ally = null, bd = Infinity;
        for (const a of others(g, p, Infinity)) { const d = a.pos.distanceTo(p.pos); if (d < bd) { bd = d; ally = a; } }
        ally?.addShield?.(amt, dur, 'g_piel_intervencion');
        st.readyAt = now(p) + (prof.cd || sk.cd || 20);
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
    // daño por un (25 + 15·r) % de tu vida y vuelve 15 s después de romperse; con ella, generas un
    // 10·r % más de Furia. Sin una vía del núcleo para poner una recarga (cola W2: startCooldown),
    // al romperse la recarga se deja lista y la Piel no se puede lanzar hasta pasados los 15 s
    g_inquebrantable: {
      name: 'Inquebrantable', desc: 'Piel de Hierro dura hasta evitar daño por una parte de tu vida; vuelve 15 s después y te da más Furia.',
      state: () => ({ buff: null, prevented: 0, readyAt: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_piel') return;
        const st = powerState(p, 'g_inquebrantable');
        if (buffOf(p, 'g_piel')) { g.ui?.message?.('Piel de Hierro ya está puesta'); return false; }
        if (now(p) < st.readyAt - 1e-9) { g.ui?.message?.(`Piel de Hierro vuelve en ${n1(Math.ceil((st.readyAt - now(p)) * 10) / 10)} s`); return false; }
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
        const cd = T.inquebrantable.cd;
        if (typeof g.startCooldown === 'function') g.startCooldown(p, 'g_piel', cd);
        else { g.reduceCooldown?.(p, 'g_piel', Infinity); st.readyAt = now(p) + cd; }
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
        return tagsHave(hit, 'spender') && buffOf(p, 'g_asalto_total') ? T.asalto.perRank * rankOf(p, 'g_asalto_total') : 0;
      },
      afterCast(g, p, cast, res) {
        if (cast?.echo) return;
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
        noteUlt(p, cast);
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
      state: () => ({ rivals: [], events: [], seq: 0, death: null, arenaUntil: -99, healAt: -99 }),
      onHit(g, p, e, hit) {
        if (!direct(hit) || !e?.alive) return;
        const st = rivalState(p);
        pruneRivals(p, st);
        if (!rivalOf(p, e) && st.rivals.length < rivalCap(p)) nameRival(g, p, st, e);
      },
      condAdd(p, e) {
        if (!isRival(p, e)) return 0;
        const st = rivalState(p);
        return rivalPct(p) + (now(p) < st.arenaUntil ? T.rival.arenaPct : 0);
      },
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
      // Desafío de Arena (l4A): el lanzamiento nombra Rival al de la mira (si no tienes) y le
      // sube el daño 8 s; noteUlt para el suelo de las definitivas (Vítores)
      afterCast(g, p, cast) {
        noteUlt(p, cast);
        if (cast?.sk?.id !== 'g_h_desafio' || cast.echo) return;
        const st = rivalState(p);
        pruneRivals(p, st);
        if (!st.rivals.length) {
          const e = cast.enemy?.alive ? cast.enemy : g.nearestEnemy?.(T.rival.arenaReach);
          if (e) nameRival(g, p, st, e);
        }
        st.arenaUntil = now(p) + T.rival.arenaDur;
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
      afterCast(g, p, cast) { noteUlt(p, cast); },
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
        noteUlt(p, cast);
        if (cast?.sk?.id !== 'g_h_estandarte' || cast.echo || !cast.target) return;
        const to = cast.target.clone().sub(p.pos).setY(0);
        if (to.length() > T.estandarteRange) to.setLength(T.estandarteRange);
        plantPendon(g, p, p.pos.clone().add(to), { auto: false });
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

    // ---------------- BERSERKER ----------------
    // s4 Remolino Sediento: cada GOLPE de Remolino Sangriento suma 2 de Sed (máx. 20 por uso).
    // Paso 2e: antes 4 por ENEMIGO golpeado: contra un jefe solo daba 4 por giro (la Sed del
    // Berserker no se llenaba nunca en UNI) y con 5 enemigos ya llegaba al tope de 20
    g_remolino_sediento: {
      name: 'Remolino Sediento', desc: 'Cada golpe de Remolino Sangriento suma 2 de Sed (máx. 20 por uso).',
      state: () => ({ got: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_t_remolino') return;
        powerState(p, 'g_remolino_sediento').got = 0;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'g_t_remolino' || hit.dot || hit.proc) return;
        const st = powerState(p, 'g_remolino_sediento');
        if (st.got >= T.remolinoSed.max) return;
        const n = Math.min(T.remolinoSed.perHit, T.remolinoSed.max - st.got);
        st.got += n;
        gainGauge(p, 'sed', n);
      },
    },
    // s5 Instinto Asesino (+3 %/rango de crítico: stats del nodo): cada crítico suma 2 de Sed
    g_instinto_asesino: {
      name: 'Instinto Asesino', desc: 'Cada crítico suma 2 de Sed.',
      onHit(g, p, e, hit) { if (hit?.crit) gainGauge(p, 'sed', T.instintoSed); },
    },
    // s13A Negación de la Muerte: cada 2 min, un golpe letal te deja a 1 de vida y con la Sed llena
    g_negacion: {
      name: 'Negación de la Muerte', desc: 'Una vez cada 2 minutos, un golpe letal te deja con 1 de vida y la Sed llena.',
      icd: T.negacion.icd, priority: 1,
      onLethal(g, p) {
        p.setHp(1, 'g_negacion');                       // restauración (§6.1)
        gainGauge(p, 'sed', gaugeMax(p, 'sed'));
        g.ui?.message?.('🩸 ¡Negación de la Muerte! Sobrevives con la Sed llena', 3000);
        g.ui?.spawnText?.(p.pos, '¡NEGACIÓN!', 'txt-crit');
        fxAt(g, 'recklessAura', p.pos, 1.0);
        g.addShake?.(0.4, 0.4);
        return true;
      },
    },
    // s14 Sangre Hirviente: con la Sed llena entras en Desenfreno 8 s (+30 % de vel. de ataque
    // y cada golpe te cura un 1 % de vida: sustento, §6.1)
    g_desenfreno: {
      name: 'Sangre Hirviente', desc: 'Con la Sed llena: Desenfreno 8 s (+30 % de velocidad de ataque y cada golpe te cura un 1 % de vida).',
      onGauge(g, p, id, ev) {
        if (id !== 'sed' || ev !== 'full') return;
        p.addBuff('g_desenfreno', { aspdPct: T.frenzy.aspdPct }, T.frenzy.dur,
          { name: 'Desenfreno', icon: '🩸', desc: `+${T.frenzy.aspdPct}% de velocidad de ataque y ${T.frenzy.healPct}% de vida por golpe` });
        g.ui?.spawnText?.(p.pos, '¡DESENFRENO!', 'txt-crit');
        fxAt(g, 'recklessAura', p.pos, 1.0);
      },
      onHit(g, p) { if (buffOf(p, 'g_desenfreno')) p.sustain(p.stats.maxHP * T.frenzy.healPct / 100, 'g_desenfreno'); },
    },
    // x2 Carnicero (rango r): cada REMATE (wasExecuted: normal rematado por Ejecutar —
    // tv.executePct de x1, núcleo nucleo_tv— o élite/jefe que muere tras bajar del umbral)
    // suma 15·r de Sed y te devuelve 10 de Furia
    g_carnicero: {
      name: 'Carnicero', desc: 'Cada remate suma 15 de Sed por rango y te devuelve 5 de Furia.',
      onKill(g, p, e) {
        const r = ownRank(p, 'x2', 'berserker');
        if (!(r > 0) || !wasExecuted(e)) return;
        gainGauge(p, 'sed', T.butcher.sedPerRank * r);
        g.gainResource(p, T.butcher.fury);
      },
    },
    // x3 Matanza Eterna: rematar durante el Desenfreno lo alarga 2 s, sin límite
    g_matanza_eterna: {
      name: 'Matanza Eterna', desc: 'Rematar durante el Desenfreno lo alarga 2 s, sin límite.',
      onKill(g, p, e) {
        const b = buffOf(p, 'g_desenfreno');
        if (!b || !wasExecuted(e)) return;
        b.t += T.eternal; b.dur = (b.dur || 0) + T.eternal;
        g.ui?.spawnText?.(p.pos, `+${T.eternal}s`, 'txt-crit');
      },
    },

    // ---------------- GUARDIÁN ----------------
    // s4 Desafío Firme: Grito Desafiante te da 2 cargas de Bastión (si provoca a alguien)
    g_desafio_firme: {
      name: 'Desafío Firme', desc: 'Grito Desafiante te da 2 cargas de Bastión.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id === 'g_t_desafio' && res?.hits > 0) gainGauge(p, 'bastion', T.desafioFirme);
      },
    },
    // s7 Martillo Pesado (+X %/rango de daño de Martillo: mod del nodo): si Martillo de
    // Guerra golpea a 3 o más, +1 carga de Bastión
    g_martillo_pesado: {
      name: 'Martillo Pesado', desc: 'Si Martillo de Guerra golpea a 3 o más enemigos, suma 1 carga de Bastión.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id === 'g_martillo' && res?.hits >= T.martilloPesado.hits) gainGauge(p, 'bastion', T.martilloPesado.n);
      },
    },
    // s6B Reto Singular: Provocación marca a su objetivo: −20 % de daño a tu grupo 8 s
    g_reto: {
      name: 'Reto Singular', desc: 'Provocación marca a un enemigo: hace −20 % de daño a tu grupo durante 8 s.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'g_provocacion' || !(res?.hits > 0)) return;
        const range = cast.prof?.range || 15;
        let e = cast.enemy;
        if (!e?.alive || e.pos.distanceTo(p.pos) > range + 0.5) e = g.nearestEnemy?.(range) || null;
        if (!e?.alive) return;
        e.weakenOutgoing?.('g_reto', T.reto.pct, T.reto.dur);
        (e.marks || (e.marks = {})).g_reto = { t: T.reto.dur, by: p };
        g.spawnRing?.(e.pos, 1.3, 0x5599ff);
        fxAt(g, 'tauntMark', e.pos, (e.def?.scale || 1) + 0.8);
      },
    },
    // s13A Juramento del Escudo: Muro Inquebrantable (m_aegis) se recarga en 20 s en vez de 30 s
    g_juramento: {
      name: 'Juramento del Escudo', desc: 'Muro Inquebrantable se recarga en 20 s en lugar de 30 s.',
      state: () => ({ last: 0 }),
      onTick(g, p) {
        const aegis = powerState(p, 'm_aegis');
        const st = powerState(p, 'g_juramento');
        if ((aegis.cd || 0) > st.last + 1e-6) aegis.cd = Math.max(0, aegis.cd - T.juramento);   // acaba de saltar
        st.last = aegis.cd || 0;
      },
    },
    // s14 Vínculo del Guardián (cooperativo): recibes tú el 20 % del daño que sufren los
    // aliados a 10 m, reducido por tu armadura (⑫ onAllyDamaged: te quedas esa parte)
    g_vinculo: {
      name: 'Vínculo del Guardián', desc: 'Recibes tú el 20 % del daño que sufren los aliados a 10 m, reducido por tu armadura.',
      onAllyDamaged(g, p, ally, dmg) {
        if (!p.alive || !(dmg?.amount > 0) || !allyNear(p, ally, T.vinculo.radius)) return;
        const share = dmg.amount * T.vinculo.pct / 100;
        dmg.amount -= share;
        p.takeDamage(share, nearAL(g, p), { element: 'phys' });
      },
    },
    // s17 Muralla Viviente: cada carga de Bastión te da −2 %/rango de daño recibido
    g_muralla_viva: {
      name: 'Muralla Viviente', desc: 'Cada carga de Bastión te da −1 % de daño recibido por rango.',
      condDr(p) { return T.muralla * ownRank(p, 's17', 'guardian') * Math.floor(gaugeValue(p, 'bastion')); },
    },
    // x1 Represalia: tus espinas reflejan además el 30 % del daño que bloqueas o que absorbe
    // Muro de Escudos (al atacante, como daño de poder)
    g_represalia: {
      name: 'Represalia', desc: 'Reflejas el 30 % del daño que bloqueas o absorbes con Muro de Escudos.',
      onDamaged(g, p, dmg) {
        let prevented = muroPrevented(p, dmg.amount);
        if (dmg.blocked) prevented += dmg.amount;          // el bloqueo quitó lo mismo que dejó pasar (−50 %)
        const src = dmg.src;
        if (!(prevented > 0) || !src?.alive || typeof src.takeDamage !== 'function') return;
        dealProcDamage(g, src, prevented * T.represalia / 100, { source: 'power:g_represalia' });
      },
    },
    // x2 Venganza Acumulada: al terminar Muro de Escudos, una onda devuelve el 20 %/rango del
    // daño absorbido (lo acumula aquí; la onda la lanza el comportamiento del Muro al acabar)
    g_venganza: {
      name: 'Venganza Acumulada', desc: 'Al terminar Muro de Escudos, una onda devuelve un 20 % por rango del daño absorbido.',
      state: () => ({ absorbed: 0 }),
      onDamaged(g, p, dmg) {
        const n = muroPrevented(p, dmg.amount);
        if (n > 0) powerState(p, 'g_venganza').absorbed += n;
      },
    },
    // x3 Bastión Eterno (cooperativo): con 5 cargas, Muro Inquebrantable protege también a
    // los aliados a 10 m (⑫ onAllyLethal: queda a 1 de vida e inmune 2 s; icd 60 s, que
    // solo se gasta si salva: return false no lo consume)
    g_bastion_eterno: {
      name: 'Bastión Eterno', desc: 'Con 5 cargas de Bastión, Muro Inquebrantable protege también a los aliados a 10 m (una vez cada 60 s).',
      icd: T.eterno.icd,
      onAllyLethal(g, p, ally) {
        if (!p.alive || !allyNear(p, ally, T.eterno.radius) || gaugeValue(p, 'bastion') < gaugeMax(p, 'bastion')) return false;
        ally.grantInvuln?.(T.eterno.invuln);
        g.ui?.message?.('🛡️ ¡Bastión Eterno! Tu aliado sobrevive', 2500);
        fxAt(g, 'shieldWall', ally.pos, 1.0);
        return true;
      },
    },

    // ---------------- CRUZADO ----------------
    // s3 Mano Sanadora (+2/rango de vida al golpear: stats.lph): los aliados a 10 m reciben la mitad
    g_mano_sanadora: {
      name: 'Mano Sanadora', desc: 'Los aliados a 10 m reciben la mitad de la vida al golpear de Mano Sanadora.',
      state: () => ({ at: -1 }),
      onHit(g, p) {
        const st = powerState(p, 'g_mano_sanadora');
        if (st.at === p.simT) return;                       // una vez por impacto (como onDealHit)
        st.at = p.simT;
        const half = ownRank(p, 's3', 'cruzado');           // la mitad de 2·rango
        if (half > 0) for (const a of others(g, p, T.manoRadius)) allySustain(a, half, 'g_mano_sanadora');
      },
    },
    // s4 Devoción Ferviente: Aura de Devoción te da 1 de Fervor al lanzarla y cura un 10 % más
    // (el +10 % lo lee el campo g_devocion)
    g_devocion_ferviente: {
      name: 'Devoción Ferviente', desc: 'Aura de Devoción te da 1 de Fervor al lanzarla y cura un 10 % más.',
      afterCast(g, p, cast) { if (cast?.sk?.id === 'g_t_devocion') gainGauge(p, 'fervor', T.ferviente.fervor); },
    },
    // s6B Sentencia: Juicio marca a élites y jefes: +20 % de daño recibido de todo el grupo 4 s
    // (saco Debilidad, §5.3)
    g_sentencia: {
      name: 'Sentencia', desc: 'Juicio marca a élites y jefes: reciben +20 % de daño de todo el grupo durante 4 s.',
      onKill(g, p, e, kill) {
        if (kill?.nested || !e?.pos) return;
        for (const o of g.enemies || []) {
          if (!o.alive || o === e || !isEliteOrBoss(o)) continue;
          const r = T.sentencia.radius + 0.5 * (o.def?.scale || 1);
          if (o.pos.distanceToSquared(e.pos) > r * r) continue;
          o.applyWeakness?.('g_sentencia', T.sentencia.pct, T.sentencia.dur);
          g.ui?.spawnText?.(o.pos.clone().setY((o.def?.scale || 1) + 0.7), 'SENTENCIA', 'txt-crit');
        }
      },
    },
    // s6A Consagración (mod.zone de Martillo: la zona que daña es del núcleo): el suelo
    // sagrado también cura a los aliados que lo pisan (campo g_consagracion, 2 %/s).
    // Paso 2e: la curación NO se apila (cada Martillo renueva el suelo que cura; antes, con
    // un Martillo por segundo, 4 campos curaban 8 %/s y el Cruzado era inmortal en TTD+)
    g_consagracion: {
      name: 'Consagración', desc: 'El suelo sagrado de Martillo de Guerra también cura a los aliados que lo pisan (no se apila: cada Martillo lo renueva).',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'g_martillo' || !cast.target || !g.spawnField) return;
        const prof = cast.prof || {};
        const old = fieldOf(g, p, 'g_consagracion');
        if (old) old.t = 0;
        g.spawnField('g_consagracion', { pos: cast.target.clone().setY(0), radius: Math.max(2, (prof.radius || 3) * 0.9),
          dur: prof.zoneDur || 4, owner: p, data: { healPctPerSec: T.consagracion.healPctPerSec } });
      },
    },
    // s8 Luz Sanadora (tv.killHeal: el núcleo te cura a TI al matar): los aliados a 10 m
    // reciben el mismo % de SU vida (sustento de cada uno)
    g_luz_sanadora: {
      name: 'Luz Sanadora', desc: 'Al matar, los aliados a 10 m se curan el mismo % de vida que tú.',
      onKill(g, p) {
        const pct = p.tv?.killHeal || 0;
        if (!(pct > 0)) return;
        for (const a of others(g, p, T.luzRadius)) allySustain(a, (a.stats?.maxHP || 0) * pct / 100, 'g_luz_sanadora');
      },
    },
    // s10 Estandarte Sagrado (+20 %/rango de duración: mod): su bonificación alcanza a los aliados a 15 m
    g_estandarte_grupo: {
      name: 'Estandarte Sagrado', desc: 'La bonificación de Estandarte de Guerra alcanza a los aliados a 15 m.',
      modifyResolve(p, sk, prof) { if (sk.id === 'g_u_estandarte') prof.radius = Math.max(prof.radius || 0, T.banner); },
    },
    // s13A Intercesión (cooperativo): cada 90 s, un aliado a 15 m que iba a morir queda a 1
    // de vida y tú pierdes un 20 % de vida (⑫ onAllyLethal; icd 90 s, solo si salva)
    g_intercesion: {
      name: 'Intercesión', desc: 'Cada 90 s, un aliado que iba a morir queda a 1 de vida; tú pierdes un 20 % de vida.',
      icd: T.intercesion.icd,
      onAllyLethal(g, p, ally) {
        if (!p.alive || !allyNear(p, ally, T.intercesion.radius)) return false;
        p.setHp(Math.max(1, p.hp - p.stats.maxHP * T.intercesion.cost / 100), 'g_intercesion');
        g.ui?.message?.('✨ ¡Intercesión! Tu aliado sobrevive', 2500);
        return true;
      },
    },
    // s14 Luz del Alba: Aura de Devoción da también +10 % de daño al grupo (lo aplica el campo)
    // y cada Fervor gastado la alarga 1 s
    g_luz_alba: {
      name: 'Luz del Alba', desc: 'Aura de Devoción da +25 % de daño a tus aliados (+10 % a ti) y cada Fervor gastado la alarga 1 s.',
      onGauge(g, p, id, ev, n) {
        if (id !== 'fervor' || ev !== 'spent') return;
        const f = fieldOf(g, p, 'g_devocion');
        if (f) { f.t += n * T.alba.perFervor; f.dur += n * T.alba.perFervor; }
      },
    },
    // x1 Martillo Bendito: 3 martillos sagrados orbitan a tu alrededor (campo g_martillos):
    // cada segundo cada uno golpea al enemigo más cercano a ≤ 2,6 m (15 % del arma, Sagrado,
    // + Fe Ardiente) y cada golpe cura un 1 % de vida a los aliados a 15 m (sustento)
    g_martillo_bendito: {
      name: 'Martillo Bendito', desc: '3 martillos sagrados orbitan a tu alrededor. Cada golpe cura un 1 % de vida a los aliados a 15 m.',
      onTick(g, p) {
        if (!g?.spawnField || !p.alive || fieldOf(g, p, 'g_martillos')) return;
        g.spawnField('g_martillos', { pos: p.pos.clone(), radius: T.hammers.reach, dur: 3600, owner: p, data: {} });
      },
    },
    // x2 Martillos del Juicio: +1 martillo y +15 % de daño de los Martillos Benditos por rango
    // (lo lee el campo g_martillos; este poder solo marca el nodo)
    g_martillos_juicio: {
      name: 'Martillos del Juicio', desc: '+1 martillo y +15 % de daño de los Martillos Benditos por rango.',
    },
    // x3 Ascensión: tras 3 Veredictos seguidos (≤ 8 s entre ellos), 10 s de alas de luz: el
    // Fervor no se gasta y el Aura cubre 30 m. Tope: Veredicto con 1,5 s de enfriamiento
    // mientras dura (sin coste ni enfriamiento serían ≈150 WD en 10 s: desbocado)
    g_ascension: {
      name: 'Ascensión', desc: 'Tras 3 Veredictos seguidos, 10 s de alas de luz: el Fervor no se gasta y el Aura cubre 30 m.',
      state: () => ({ n: 0, last: -99 }),
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'g_t_veredicto' || !res?.verdict || buffOf(p, 'g_ascension')) return;
        const st = powerState(p, 'g_ascension');
        st.n = (p.simT || 0) - st.last <= T.ascension.gap ? st.n + 1 : 1;
        st.last = p.simT || 0;
        if (st.n < T.ascension.need) return;
        st.n = 0;
        p.addBuff('g_ascension', {}, T.ascension.dur, { name: 'Ascensión', icon: '🕊️', desc: 'El Fervor no se gasta y el Aura de Devoción cubre 30 m' });
        g.ui?.spawnText?.(p.pos, '¡ASCENSIÓN!', 'txt-crit');
        fxAt(g, 'devotionCircle', p.pos, 0.2);
        fxAt(g, 'holyImpact', p.pos, 1.6);
      },
      modifyResolve(p, sk, prof) {
        if (sk.id === 'g_t_veredicto' && buffOf(p, 'g_ascension')) prof.cd = Math.max(prof.cd || 0, T.ascension.minCd);
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
    // c12A Bramido de Guerra: tú y los aliados a 15 m ganan +15 % de vida máxima 10 s y se
    // curan ese 15 % al instante (curación de habilidad)
    g_t_bramido: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const targets = castBuff(g, p, prof, sk, ctx);
        // (addBuff ya recalcula: la cura usa la vida máxima NUEVA)
        const pct = (sk.healPct || 15) * (prof.buffMul || 1);
        for (const a of targets) skillHeal(g, p, a, (a.stats?.maxHP || 0) * pct / 100, sk.id);
        ctx.res.hits = targets.length;
        return ctx.res;
      },
    },
    // s0 Remolino Sangriento (insignia del Berserker): 2 s girando (te mueves a velocidad
    // normal), 10 golpes a todo lo que hay a 2,9 m (57 % del arma cada uno) y Sangrado por
    // golpe (30 % del perfil de Sangrado; los tics llenan la Sed). Carnicería (s6A): +10 % de
    // radio y el Sangrado salta a 1 enemigo cercano por golpe. No exige mantener la tecla
    // (canalización del núcleo con hold: false); la esquiva la corta.
    g_t_remolino: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const rad = prof.radius || 2.9;
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        return g.startChannel(ctx, cast.done, {
          hold: false, dur: sk.channelT || 3, ticks: sk.ticks || 10,
          onTick: () => {
            p.swing = 1;
            const hitList = [];
            g.dealArea(p.pos.clone(), rad, ctx.coef, {
              ...ctx.areaOpts,
              onHit: (e, dealt) => { ctx.hit(e, dealt); hitList.push(e); applyBleed(g, p, e, ctx.avgHit, T.remolinoBleedMul * (prof.dotMul || 1), sk.id); },
            });
            // Carnicería: el Sangrado salta a `chain` enemigos cercanos que el giro no tocó
            if (prof.chain > 0 && hitList.length) {
              const hitSet = new Set(hitList);
              let left = prof.chain;
              for (const o of g.enemies || []) {
                if (left <= 0) break;
                if (!o.alive || hitSet.has(o)) continue;
                if (hitList.some(e => e.pos.distanceTo(o.pos) <= T.carniceria.jump)) {
                  applyBleed(g, p, o, ctx.avgHit, T.remolinoBleedMul * (prof.dotMul || 1), sk.id);
                  left--;
                }
              }
            }
            ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
            fxAt(g, ctx.fx?.extra, p.pos, 0.8);
          },
        });
      },
    },
    // s9 Temeridad: 10 s de +25 % de crítico (prof.buff, escala por rango); el MISMO buff
    // lleva la Sed ×2 (stat del núcleo 'gaugeGain:sed' = +100 %) y el +10 % de daño
    // recibido (stat dmgTakenPct, tras mitigar), sin escalar
    g_t_temeridad: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        castBuff(g, p, prof, sk, ctx, {
          ...prof.buff,
          'gaugeGain:sed': ((sk.gaugeMult ?? 2) - 1) * 100,
          dmgTakenPct: sk.dmgTakenPct ?? 10,
        });
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s13B Ira Ciega: pagas un 10 % de tu vida actual: 6 s de +30 % de daño (aditivo) e imparable
    g_t_ira_ciega: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        p.setHp(Math.max(1, p.hp * (1 - (sk.hpCostPct || 10) / 100)), sk.id);
        castBuff(g, p, prof, sk, ctx);
        p.unstoppableT = Math.max(p.unstoppableT || 0, prof.dur);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s0 Grito Desafiante (insignia del Guardián): provoca a todos a 10 m durante 4 s y ganas
    // 20 de Furia. Cerco (s6A): +50 % de radio y ralentiza 3 s. Sin nadie al alcance no se
    // gasta el enfriamiento ni da Furia. Desafío Firme (s4): +2 Bastión (afterCast).
    g_t_desafio: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const rad = prof.radius || 10, dur = prof.dur || 4;
        const list = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(p.pos) <= rad);
        if (!list.length) { refundCd(g, p, sk, 'Ningún enemigo al alcance'); return ctx.res; }
        for (const e of list) {
          if (e.applyCC('taunt', dur, { src: p })) ctx.res.hits++;
          // Paso 2e: los provocados te hacen −weakenPct % de daño mientras dura (× potencia)
          if (sk.weakenPct > 0) e.weakenOutgoing?.('g_t_desafio', Math.round(sk.weakenPct * (prof.buffMul || 1)), dur);
          if (prof.slow > 0) e.applyCC('slow', prof.slow, { pct: prof.slowPct || 50, src: p });
          fxAt(g, ctx.fx?.impact, e.pos, (e.def?.scale || 1) + 0.8);
        }
        g.gainResource(p, sk.genOnUse || 0);
        g.spawnRing?.(p.pos, rad, ctx.color || 0x5599ff);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        return ctx.res;
      },
    },
    // s9 Muro de Escudos: gastas TODAS las cargas de Bastión: −10 % de daño recibido por carga
    // 8 s (máx. −50 %, saco dr). Al terminar: Venganza Acumulada (x2) devuelve un % de lo absorbido.
    g_t_muro: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const n = Math.floor(gaugeValue(p, 'bastion'));
        if (n < 1) { refundCd(g, p, sk, 'Muro de Escudos: no tienes cargas de Bastión'); return ctx.res; }
        spendGauge(p, 'bastion', n);
        const dr = Math.min(sk.drMax || 50, Math.round((sk.drPerCharge || 10) * n * (prof.buffMul || 1)));
        const dur = prof.dur || 8;
        powerState(p, 'g_venganza').absorbed = 0;
        p.addBuff(sk.id, { dr }, dur, { name: sk.name, icon: sk.icon, desc: `−${dr}% de daño recibido (${n} ${n > 1 ? 'cargas' : 'carga'})` });
        g.spawnRing?.(p.pos, 1.6, ctx.color || 0x7fb0e8);
        fxAt(g, ctx.fx?.aura, p.pos, 1.0);
        g.timers.schedule(dur, () => {
          if (!hasPower(p, 'g_venganza') || !p.alive) return;
          const st = powerState(p, 'g_venganza');
          const total = st.absorbed * T.venganza.pctPerRank * Math.max(1, ownRank(p, 'x2', 'guardian')) / 100;
          st.absorbed = 0;
          if (!(total > 0)) return;
          g.spawnRing?.(p.pos, T.venganza.radius, 0x9fc4ff);
          fxAt(g, 'vengeanceWave', p.pos, 0.3);
          for (const e of g.enemies || []) {
            const r = T.venganza.radius + 0.5 * (e.def?.scale || 1);
            if (e.alive && e.pos.distanceToSquared(p.pos) <= r * r) dealProcDamage(g, e, total, { source: 'power:g_venganza' });
          }
        });
        ctx.res.hits = n;
        return ctx.res;
      },
    },
    // s13B Carga de Escudo: cargas hasta 8 m arrastrando a los enemigos (no jefes: se detiene
    // contra ellos); al llegar, 100 % del arma a todo en 1,9 m y aturde 1,5 s (jefes: stagger)
    g_t_carga: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const dir = cast.target.clone().sub(p.pos).setY(0);
        const dist = Math.min(dir.length(), prof.range || sk.range || 8);
        const dragged = new Set();
        if (dist > 0.1) {
          dir.normalize();
          p.faceToward(p.pos.clone().add(dir));
          let traveled = 0, n = 0;
          while (traveled < dist) {
            const step = Math.min(0.3, dist - traveled);
            const nx = p.pos.x + dir.x * step, nz = p.pos.z + dir.z * step;
            if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
            const wall = (g.enemies || []).find(e => e.alive && isBoss(e) && Math.hypot(e.pos.x - nx, e.pos.z - nz) <= 0.6 + 0.5 * (e.def?.scale || 1));
            if (wall) break;                                       // un jefe para la carga
            p.pos.x = nx; p.pos.z = nz; traveled += step;
            for (const e of g.enemies || []) {
              if (!e.alive || dragged.has(e) || isBoss(e)) continue;
              const r = 1.1 + 0.5 * (e.def?.scale || 1);
              if (e.pos.distanceToSquared(p.pos) <= r * r) dragged.add(e);
            }
            const fx = p.pos.x + dir.x * 0.9, fz = p.pos.z + dir.z * 0.9;
            if (!g.world?.grid || g.world.grid.walkable(fx, fz)) for (const e of dragged) { e.pos.x = fx; e.pos.z = fz; }
            if (ctx.fx?.trail && (n++ % 2 === 0)) fxAt(g, ctx.fx.trail, p.pos, 0.9);
          }
        }
        const rad = prof.radius || 1.9;
        g.spawnRing?.(p.pos, rad, ctx.color || 0x6699ff);
        if (ctx.coef > 0) g.dealArea(p.pos.clone(), rad, ctx.coef, ctx.areaOpts);
        ctx.zoneCenter = p.pos.clone(); ctx.zoneRad = rad;
        p.swing = 1;
        fxAt(g, ctx.fx?.impact, p.pos, 0.7);
        g.addShake?.(0.3);
        return ctx.res;
      },
    },
    // s0 Aura de Devoción (insignia del Cruzado): 8 s, tú y los aliados a 15 m recuperan un 2 %
    // de vida por segundo y ganan +30 de armadura (campo g_devocion que te sigue)
    g_t_devocion: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const old = fieldOf(g, p, 'g_devocion');
        if (old) old.t = 0;
        const f = g.spawnField('g_devocion', { pos: p.pos.clone(), radius: sk.allyRadius || 15, dur: prof.dur || 8, owner: p,
          data: { buff: { ...prof.buff }, buffMul: prof.buffMul || 1, healPctPerSec: sk.healPctPerSec || 2, radius: sk.allyRadius || 15,
            meta: { name: sk.name, icon: sk.icon, desc: sk.desc }, color: ctx.color || 0xffdd77 } });
        if (f) devotionPulse(g, f, 0);                       // +armadura al instante
        g.spawnRing?.(p.pos, sk.allyRadius || 15, ctx.color || 0xffdd77);
        fxAt(g, ctx.fx?.aura, p.pos, 0.2);
        fxAt(g, ctx.fx?.extra, p.pos, 1.2);
        ctx.res.hits = 1;
        return ctx.res;
      },
    },
    // s9 Veredicto Final: gasta 3 de Fervor (Ascensión: no se gasta): golpe sagrado en cono de
    // 6 m (300 % del arma); cada aliado a 15 m se cura (sustento) el 25 % (+Gracia) del daño hecho
    g_t_veredicto: {
      cast(g, p, prof, cast) {
        const { sk, ctx } = cast;
        const need = sk.gaugeCost || 3;
        if (!buffOf(p, 'g_ascension') && !spendGauge(p, 'fervor', need)) {
          g.ui?.message?.(`Veredicto Final: necesitas ${need} de Fervor`);
          return ctx.res;
        }
        const dir = cast.target.clone().sub(p.pos).setY(0);
        if (dir.lengthSq() < 1e-6) dir.set(Math.sin(p.group.rotation.y), 0, Math.cos(p.group.rotation.y));
        dir.normalize();
        p.faceToward(p.pos.clone().add(dir));
        p.swing = 1;
        const list = g.enemiesInCone(p.pos, dir, prof.radius || 6, prof.angle || 90);
        for (const e of list) {
          const { dmg, crit } = p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
        }
        if (list.length) p.onDealHit();
        const pct = ((sk.healDealtPct || 25) + (p.tv?.verdictHeal || 0)) / 100;
        if (ctx.res.dealt > 0) for (const a of g.allies(p.pos, 15)) allySustain(a, ctx.res.dealt * pct, sk.id);
        const front = p.pos.clone().addScaledVector(dir, (prof.radius || 6) * 0.5);
        ctx.zoneCenter = front; ctx.zoneRad = (prof.radius || 6) * 0.5;
        g.spawnRing?.(front, (prof.radius || 6) * 0.5, ctx.color || 0xffe08a);
        fxAt(g, ctx.fx?.impact, front, 1.0);
        fxAt(g, ctx.fx?.aura, front, 0.3);
        ctx.res.verdict = true;
        return ctx.res;
      },
    },
  };
}

// pulso del Aura de Devoción: buff (armadura, +daño con Luz del Alba) a los aliados en el
// radio y, si step > 0, 2 %/s de vida × step (curación de aura; +10 % con Devoción Ferviente)
function devotionPulse(g, f, step) {
  const o = f.owner;
  if (!o?.alive) return;
  const T = tun();
  const buff = { ...f.data.buff };
  const heal = (f.data.healPctPerSec || 2) * step * (f.data.buffMul || 1) * (hasPower(o, 'g_devocion_ferviente') ? 1 + T.ferviente.heal / 100 : 1);
  for (const a of g.allies ? g.allies(v3(f.pos.x, 0, f.pos.z), f.radius) : [o]) {
    // Luz del Alba (Paso 2e): +25 % de daño a los aliados y +10 % a ti
    const b = hasPower(o, 'g_luz_alba') ? { ...buff, dmgPct: (buff.dmgPct || 0) + (a === o ? T.alba.selfDmgPct : T.alba.dmgPct) } : buff;
    keepBuff(a, 'g_t_devocion', b, f.data.interval + 0.15, f.data.meta);
    if (heal > 0) skillHeal(g, o, a, (a.stats?.maxHP || 0) * heal / 100, 'g_t_devocion');
  }
}

// ============================================================
// CAMPOS DE SUELO
// ============================================================
export function guerreroFields() {
  return {
    // Aura de Devoción: sigue al dueño; cada 0,5 s renueva el buff y cura. Con Ascensión
    // cubre 30 m. Luz del Alba la alarga (f.t) al gastar Fervor.
    g_devocion: {
      name: 'Aura de Devoción',
      init(f) { f.data.interval = f.data.interval || 0.5; f.acc = 0; f.ringAcc = 0; },
      tick(g, f, dt) {
        const o = f.owner;
        if (!o?.alive) { f.t = 0; return; }
        f.pos.x = o.pos.x; f.pos.z = o.pos.z;
        f.radius = buffOf(o, 'g_ascension') ? tun().ascension.radius : f.data.radius;
        f.acc += dt; f.ringAcc += dt;
        if (f.ringAcc >= 1) { f.ringAcc = 0; g.spawnRing?.(v3(f.pos.x, 0.05, f.pos.z), f.radius, f.data.color); }
        if (f.acc < f.data.interval - 1e-9) return;
        const step = f.acc; f.acc = 0;
        devotionPulse(g, f, step);
      },
      render(g, f) {
        if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
        if (!f.decal || f.decalR !== f.radius) {
          if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); }
          const decal = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.94, f.radius, 56),
            new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.32, side: THREE.DoubleSide, depthWrite: false }));
          decal.rotation.x = -Math.PI / 2;
          g.fxGroup.add(decal);
          f.decal = decal; f.decalR = f.radius;
        }
        f.decal.position.set(f.pos.x, 0.06, f.pos.z);
        f.decal.material.opacity = 0.22 + 0.1 * Math.abs(Math.sin(f.t * 3));
      },
    },
    // Consagración (Cruzado s6A): el suelo sagrado de Martillo de Guerra cura a los aliados
    // dentro (curación de aura: 2 % de vida por segundo, cada 0,5 s). El daño es la zona del núcleo.
    g_consagracion: {
      name: 'Consagración',
      init(f) { f.data.interval = 0.5; f.acc = 0; f.data.color = f.data.color ?? 0xffe39a; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < f.data.interval - 1e-9) return;
        const step = f.acc; f.acc = 0;
        const o = f.owner;
        if (!o?.alive) return;
        for (const a of g.allies ? g.allies(v3(f.pos.x, 0, f.pos.z), f.radius) : [])
          skillHeal(g, o, a, (a.stats?.maxHP || 0) * (f.data.healPctPerSec || 2) * step / 100, 'g_consagracion');
      },
      render(g, f) {
        if (f.dead) { if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; } return; }
        if (!f.decal) {
          const decal = new THREE.Mesh(new THREE.CircleGeometry(f.radius, 36),
            new THREE.MeshBasicMaterial({ color: f.data.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
          decal.rotation.x = -Math.PI / 2;
          decal.position.set(f.pos.x, 0.055, f.pos.z);
          g.fxGroup.add(decal);
          f.decal = decal;
        }
        f.decal.material.opacity = 0.1 + 0.1 * Math.max(0, Math.min(1, f.t / (f.dur || 1)));
      },
    },
    // Martillos Benditos (Cruzado x1/x2): orbitan al dueño mientras tenga el poder; cada
    // segundo cada martillo golpea (proc Sagrado) al enemigo más cercano a su alcance y cada
    // golpe cura un 1 % de vida (sustento) a los aliados a 15 m
    g_martillos: {
      name: 'Martillos Benditos',
      init(f) { f.acc = 0; f.ang = 0; },
      tick(g, f, dt) {
        const o = f.owner;
        if (!o?.alive || !hasPower(o, 'g_martillo_bendito')) { f.t = 0; return; }
        f.t = f.dur;
        f.pos.x = o.pos.x; f.pos.z = o.pos.z;
        f.ang += dt * 3;
        const H = tun().hammers;
        f.acc += dt;
        if (f.acc < H.every - 1e-9) return;
        f.acc = 0;
        const r = hasPower(o, 'g_martillos_juicio') ? Math.max(1, ownRank(o, 'x2', 'cruzado')) : 0;
        const n = H.n + r;
        const reach = H.reach;
        const targets = (g.enemies || []).filter(e => e.alive && e.pos.distanceTo(o.pos) <= reach + 0.5 * (e.def?.scale || 1))
          .sort((a, b) => a.pos.distanceToSquared(o.pos) - b.pos.distanceToSquared(o.pos));
        if (!targets.length) return;
        const holy = o.talentAgg?.mods?.g_t_devocion?.dmg || 0;            // Fe Ardiente (+% Sagrado)
        const dmg = o.avgHit(H.coef, holy + H.juicioPct * r);
        const tags = new Set(['holy']);
        for (let i = 0; i < n; i++) {
          const e = targets[i % targets.length];
          if (!e.alive) continue;
          if (dealProcDamage(g, e, dmg, { source: 'power:g_martillo_bendito', tags }) > 0)
            for (const a of g.allies ? g.allies(o.pos, H.healRadius) : [o]) allySustain(a, (a.stats?.maxHP || 0) * H.healPct / 100, 'g_martillo_bendito');
          fxAt(g, 'justiceSpark', e.pos, 1.0);
        }
      },
      render(g, f) {
        const list = f.meshes || [];
        if (f.dead) { for (const m of list) { g.fxGroup.remove(m); m.geometry.dispose(); m.material.dispose(); } f.meshes = null; return; }
        const o = f.owner;
        const H = tun().hammers;
        const n = H.n + (o && hasPower(o, 'g_martillos_juicio') ? Math.max(1, ownRank(o, 'x2', 'cruzado')) : 0);
        while (list.length < n) {
          const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.18),
            new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
          g.fxGroup.add(m); list.push(m);
        }
        while (list.length > n) { const m = list.pop(); g.fxGroup.remove(m); m.geometry.dispose(); m.material.dispose(); }
        f.meshes = list;
        for (let i = 0; i < list.length; i++) {
          const a = f.ang + i * Math.PI * 2 / list.length;
          list[i].position.set(f.pos.x + Math.cos(a) * 1.6, 1.1 + 0.15 * Math.sin(f.ang * 2 + i), f.pos.z + Math.sin(a) * 1.6);
          list[i].rotation.set(0, -a, 0.6);
        }
      },
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
