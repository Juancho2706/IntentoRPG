// ============================================================
// PODERES de la ARQUERA — Paso 2g (árbol de clase y árboles héroe) · Paso 2c (especializaciones)
// ============================================================
// Dueño: KT-arquera (docs/paso2-implementacion.md §2 E2). js/powers.js importa y registra al
// cargar los cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-arquera.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Por eso TODOS los
// helpers de este archivo son `function` (elevadas), las tablas son `var` perezosas y lo
// importado solo se usa dentro de los ganchos.
//
//  arqueraPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js:
//                        stats modifyResolve condAdd condCrit onCast afterCast onHit onKill
//                        condDr onDamaged onLethal onTick onGauge onSkillEnd · icd priority procs
//                        state name desc tags). Ningún poder de este archivo declara `mult`.
//  arqueraSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?, end?, params? } } → defineSkillBehavior
//  arqueraFields()          { kind: { init, tick, onEnter?, onExit?, onExpire?, render? } } → defineField
//  arqueraGauges()          {} (la Arquera no añade indicadores: potencia concentracion/coto/impulso)
//
// REGLAS: nada de `powers.has(` (aquí: hasPower), ni setTimeout (g.timers.schedule), ni
// Math.random en la simulación (solo en el dibujo de los campos), ni escribir p.cds (D2:
// g.reduceCooldown). Daño de un poder: dealProcDamage. Control: e.applyCC. Curas: p.sustain /
// g.heal / g.shield (las que la Arquera se da a sí misma, por la cubeta selfHeal). Aliados:
// g.allies(pos, r). Un onCast que devuelve `false` CANCELA el lanzamiento: los poderes con
// onCast llevan su propio enfriamiento interno (takeCd), nunca `icd`.
//
// ── Paso 2g: árbol de clase (docs/paso2g-arquera.md §6) ─────────────────────────
// Un poder por nodo con efecto propio (los finales leen su rango con powerRank):
//   c5 a_punteria_fija · a_saqueo   c6 a_bocajarro · a_tiro_lejano   c9B a_punta_diamante
//   c10 a_flecha_roma · a_silbante  c11 a_camuflaje (+ activa) · a_instinto   c14 a_paso_abrojos · a_rodada_cura
//   c15 a_adrenalina · a_calma_letal   c16 a_presion · a_barrido   c17B a_huida   c19 a_tiro_niebla
//   c20 a_lluvia_retirada   c23 a_recarga_marcha   c25 a_emboscada   c26 a_compas   c27 a_tras_rodada
//   c28 a_manto   c29 a_danza_arco   c30 a_sombra
// «Tus flechas» = las habilidades del grupo `flechas` de los datos (ARQUERA_TALENTS.groups).
// ── Paso 2g: árboles héroe (§9) ─────────────────────────────────────────────────
// Cada árbol es UN poder (su nodo clave) que sus nodos modifican con claves tv propias
// (ARQUERA_TV_KEYS en talents-arquera.js), más el poder de su final:
//   Errante del Viento  q_rafagas (wind*) · q_rosa      Carcaj Encantado  w_puntas (tip*) · w_lluvia_encantada
//   Halconera           y_halcon (hawk*) · y_cielo
// Las flechas de viento y los picados son golpes reales con `echo` (los poderes de la clase
// no los cuentan como flechas); las puntas encantadas, procs. Ninguno genera otro eco.
// Las activas de árbol héroe (a_h_torbellino, a_h_puntas, a_h_halcon) son del catálogo (KA):
// estos poderes reaccionan a su lanzamiento por id (afterCast).
//
// ── Paso 2c: especializaciones (v1) ─────────────────────────────────────────────
// Los poderes de las especializaciones de 2c siguen aquí hasta los trabajos 2 y 3 de KT
// (ningún nodo 2g los lleva); el documento los retira o los sustituye (§11.1).
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, spendGauge, gaugeValue, gaugeState } from './spec-mechanics.js';
import { projFanOffset } from './skill-defs.js';
import { rankCoef } from './combat-math.js';
import { enemiesInField } from './field-entities.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';

// ------------------------------------------------------------
// constantes (un solo sitio; reflejan el texto de cada nodo)
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNE;
function tune() {
  return TUNE || (TUNE = Object.freeze({
    frame: 1e-3,                                     // «cada tick» del planificador
    // ---- árbol de clase (§6)
    cls: Object.freeze({
      punteria: { every: 4 },                                    // c5A: cada 4.º Disparo Rápido al mismo enemigo
      saqueo: { energy: 8 },                                     // c5B
      bocajarro: { near: 5, pct: 15, knock: 1 },                 // c6A
      lejano: { far: 10, pct: 20 },                              // c6B
      diamante: { pct: 40 },                                     // c9B
      roma: { slowPct: 50, slowT: 4 },                           // c10A (icd 8 s)
      silbante: { silence: 3 },                                  // c10B (icd 10 s)
      abrojos: { radius: 2.5, dur: 3, slowPct: 50, slowT: 0.7, color: 0x9a8a5a },   // c14A
      rodada: { pct: 6, every: 12 },                             // c14B
      adrenalina: { below: 0.5, energy: 30, dr: 20, dur: 4 },    // c15A (icd 30 s)
      calma: { over: 40, pct: 10 },                              // c15B
      presion: { pct: 4, max: 5 },                               // c16A
      barrido: { win: 2, pct: 3, max: 5 },                       // c16B
      huida: { below: 0.3, spdPct: 40, dr: 20, dur: 4 },         // c17B (icd 60 s)
      niebla: { energy: 3, ext: 0.3, max: 2 },                   // c19
      retirada: { mult: 0.3, delay: 0.05 },                      // c20
      marcha: { perRank: 0.3 },                                  // c23
      compas: { max: 5, perRank: 2, keep: 3 },                   // c26
      tras: { perRank: 10 },                                     // c27
      manto: { dr: 25, healPerRank: 0.25 },                      // c28
      danza: { perRank: 20 },                                    // c29
      sombra: { dur: 3, base: 0.15, perRank: 0.15, delay: 0.3 }, // c30
    }),
    // cubeta de autocuración (ronda 3, §20): lo que la Arquera se cura a sí misma con sus
    // nodos suma como mucho 1 % de la vida por segundo (depósito que se llena a ese ritmo)
    cubeta: { perSec: 1, cap: 6 },
    // ---- Errante del Viento (§9.2)
    wind: Object.freeze({
      every: 4, max: 3, coef: 0.6, range: 12, width: 1, fan: 0.26, slowT: 2, torbellino: 3, color: 0xcfeff0,
      rosa: { every: 25, dur: 6, gustEvery: 1, pct: 50 },
    }),
    // ---- Carcaj Encantado (§9.3)
    tip: Object.freeze({
      every: 6, oncePer: 1, shareWin: 0.4, healEvery: 6, placeWin: 10,
      burn: { coef: 2.0, dur: 4 }, frost: { slowPct: 40, dur: 3 }, bolt: { coef: 0.8, jumps: 3, radius: 6 },
      bite: { dur: 4 }, braid: { radius: 4 }, desborde: { shots: 4, mult: 0.5 },
      affinity: { impulso: 8, cepo: 1 }, rain: { every: 30, dur: 6, mult: 0.3 },
      colors: { fire: 0xff7a2a, frost: 0x8fd8ff, lightning: 0xd8c8ff },
    }),
    // ---- Halconera (§9.4)
    hawk: Object.freeze({
      every: 6, coef: 1, mark: 6, markPct: 10, range: 15, recent: 5, near: 12, sweep: { len: 8, width: 1.5 },
      deepStagger: 15, flock: { n: 2, radius: 8 }, feathers: { radius: 5, coef: 0.4 }, loyal: { radius: 12 },
      assault: { dur: 6, every: 0.5, coef: 0.4, blind: 30, stagger: 30 }, guard: { below: 0.4, dur: 4, every: 60 },
      sky: { every: 30, dur: 4, gap: 1 }, color: 0xb98a55,
    }),
    // ---- especializaciones (v1 de 2c; trabajos 2 y 3)
    aliento: { spend: 50 },                          // F s4
    acechador: { lossPct: -15 },                     // F s15: 'gaugeLoss:concentracion'
    patience: { perSec: 2, max: 20 },                // F s13B
    overpen: { perEnemy: 15 },                       // F s14
    herida: { pct: 50, dur: 6 },                     // F s6B
    weakspot: { dur: 8, crit: 15 },                  // F x1
    impossible: { gap: 0.25 },                       // F x3
    cepo: { maxArmed: 3, extraR: 0.3, mineCoef: 1.2, poisonDur: 5, ironBossSlow: 50 },
    warden: { pctPerSec: 3, pulse: 0.5 },            // M s13B
    lazo: { rootPerRank: 0.5 },                      // M s10
    ponzona: { slowPct: 10, slowT: 1.2 },            // M s11
    web: { link: 10, width: 0.6, slowPct: 50, slowT: 0.6, pulse: 0.2, bleedCoef: 1.0, vfx: 0.5 },
    greathunt: { dmgPct: 15, dur: 6 },               // M x3
    vientoCola: { aspdPerRank: 5 },                  // T s5
    andanada: { impulso: 20 },                       // T s4
    galechain: { perKill: 0.5, max: 6 },             // T s14
    slip: { spdPct: 15, every: 0.6, dur: 2.5, radius: 1.6 },  // T s13B
    infinite: { every: 10, storm: 5 },               // T x1 / x3
    rebote: { first: 1.8, jumps: 5 },                // T s6A (Paso 2e)
    bengala: { weakPct: 15, weakenPct: 15 },         // c22A (si la definición no los trae)
  }));
}

// ------------------------------------------------------------
// helpers (todos `function`: seguros en el ciclo de módulos)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isEliteish(e) { return !!(e?.def?.rank || isBoss(e)); }
function now(p) { return p?.simT || 0; }
function v3(x, z, y = 0) { return new THREE.Vector3(x, y, z); }
function invalidate(p) { if (p) p.resolved = {}; }
function focus(p) { return gaugeValue(p, 'concentracion'); }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function dist(a, b) { return Math.sqrt(dist2(a, b)); }
// rango del nodo que concede un poder: lo mismo que talents.powerRank sobre el agregado de
// recompute (importar talents.js aquí cerraría el ciclo resources → powers → talents → data → resources)
function powerRank(p, id) { return p?.talentAgg?.powerRank?.[id] | 0; }
// enfriamiento interno de un poder (las claves de `st`): true si toca y lo arranca
function takeCd(st, key, every, p) {
  const t = now(p);
  if ((st[key] ?? -Infinity) > t + 1e-9) return false;
  st[key] = t + every;
  return true;
}

// ---------- «tus flechas» (grupo `flechas` de los datos de talentos) ----------
// eslint-disable-next-line no-var
var ARROWS;
function arrowIds() { return ARROWS || (ARROWS = new Set(ARQUERA_TALENTS.groups?.flechas?.ids || [])); }
// impacto real de una flecha tuya (sin procs ni tics de DoT o de campo)
function arrowHit(hit) { return !!hit && !hit.proc && !hit.dot && arrowIds().has(hit.skill); }
// tirada (③ condAdd/condCrit reciben el HitInfo del lanzamiento: skill, tags, elem)
function arrowRoll(hit) { return !!hit && arrowIds().has(hit.skill); }
// lanzamiento de una flecha (el básico de arma también: cast.weapon)
function arrowCast(cast) { return !!cast && (!!cast.weapon || arrowIds().has(cast.sk?.id)); }
function catOf(p, id) { return p?.cls?.skills?.find(s => s.id === id)?.cat || null; }
// insignia de la especialización activa (categoría 'spec' del kit)
function insigniaOf(p) {
  const spec = p?.talents?.spec || null;
  return (p?.cls?.skills || []).find(s => s.cat === 'spec' && (!s.spec || s.spec === spec)) || null;
}

// enemigos vivos a `r` m de `pos` (sin `except`), del más cercano al más lejano
function foesNear(g, pos, r, except = null) {
  return (g?.enemies || []).filter(e => e.alive && e !== except && dist2(e.pos, pos) <= r * r)
    .sort((a, b) => dist2(a.pos, pos) - dist2(b.pos, pos));
}
function dirTo(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z, l = Math.hypot(dx, dz);
  return l > 1e-4 ? { x: dx / l, z: dz / l } : { x: 0, z: 1 };
}
// enemigos en la recta from→dir (ancho `width`); `first` va delante y el resto por distancia
function lineFoes(g, from, dir, len, width, first = null) {
  const out = [];
  for (const e of g?.enemies || []) {
    if (!e.alive || e === first) continue;
    const dx = e.pos.x - from.x, dz = e.pos.z - from.z;
    const along = dx * dir.x + dz * dir.z;
    if (along < -0.5 || along > len + 0.5) continue;
    if (Math.abs(dx * dir.z - dz * dir.x) > width / 2 + 0.5 * (e.def?.scale || 1)) continue;
    out.push([along, e]);
  }
  out.sort((a, b) => a[0] - b[0]);
  const list = out.map(x => x[1]);
  return first?.alive ? [first, ...list.filter(e => dist2(e.pos, from) > dist2(first.pos, from))] : list;
}
// golpe REAL de un poder héroe (flecha de viento, picado): tirada con crítico, Debilidad y [×];
// lleva `echo` (no cuenta como flecha ni genera otro eco)
function strike(g, p, e, coef, addPct, skill, tags) {
  if (!e?.alive || !(coef > 0)) return { dealt: 0, crit: false };
  const hitInfo = { skill, tags, elem: 'physical' };
  const { dmg, crit } = p.rollDamage(coef, 0, addPct, e, hitInfo);
  const dealt = e.takeDamage(dmg, crit, { skill, tags, elem: 'physical', echo: true }) || 0;
  p.onDealHit?.();
  return { dealt, crit };
}

// CUBETA DE AUTOCURACIÓN (ronda 3, §20): Paso Sanador, Punta Curativa (y el escudo de Nervios de
// Acero) suman como mucho 1 % de la vida por segundo: un depósito de `cap` % que se rellena a
// `perSec` % por segundo. Devuelve lo curado.
function selfHeal(g, p, pct, src) {
  const T = tune().cubeta;
  const st = powerState(p, 'arq_cubeta');
  const t = now(p);
  if (st.at == null) { st.at = t; st.v = T.cap; }
  st.v = Math.min(T.cap, st.v + Math.max(0, t - st.at) * T.perSec);
  st.at = t;
  const take = Math.min(pct, st.v);
  if (!(take > 0)) return 0;
  st.v -= take;
  const amount = (p.stats?.maxHP || 0) * take / 100;
  return g?.heal ? g.heal(amount, { target: 'self', src }) : (p.healSkill?.(amount, src) || 0);
}

// REPETICIÓN GRATIS de una habilidad, también si no está en la barra (Lluvia en Retirada,
// Instinto de Supervivencia): eco del canal ⑦ desde una ranura temporal y, con `at`, apuntado a
// ese punto (la mira se restaura al momento). El tope de repeticiones del motor cuenta por
// lanzamiento ORIGINAL de la habilidad; aquí el original es otro (la rodada, el golpe letal), así
// que cada uso abre su cuenta. Con g.castEcho (petición a la cola W2) lo hace el motor.
const ECHO_SLOT = 'arq_eco';
function castEchoOf(g, p, id, mult, at = null) {
  if (typeof g?.castEcho === 'function') return g.castEcho(p, id, mult, { at });
  if (!g?.castSkillSlot || !p?.cls?.skills?.some(s => s.id === id)) return false;
  const hb = p.hotbar || (p.hotbar = {});
  const inp = g.input || null;
  const aim = inp ? inp.mouseWorld : null;
  const sst = (p.skState || (p.skState = {}))[id] || (p.skState[id] = {});
  sst.echo = { seq: (sst.echo?.seq || 0) + 1, n: 0 };
  hb[ECHO_SLOT] = id;
  if (at && inp) inp.mouseWorld = v3(at.x, at.z);
  try { return g.castSkillSlot(ECHO_SLOT, mult); } finally {
    delete hb[ECHO_SLOT];
    if (inp) inp.mouseWorld = aim;
  }
}

// ---------- Bomba de Humo (campos que deja a_humo: la zona y la ceguera) ----------
function isSmoke(f) { return !f.dead && (f.data?.skill === 'a_humo' || f.kind === 'a_humo_ciego'); }
function smokesOf(g, p) { return (g?.fields || []).filter(f => f.owner === p && isSmoke(f)); }
function smokesHere(g, p) { return (g?.fieldsAt ? g.fieldsAt(p.pos) : []).filter(f => f.owner === p && isSmoke(f)); }

// ---------- Errante del Viento: Ráfagas ----------
function gustMax(p) { return tune().wind.max + (p?.tv?.windMax || 0); }
function addGust(p, k) {
  const st = powerState(p, 'q_rafagas');
  st.n = Math.min(gustMax(p), (st.n || 0) + k);
  return st.n;
}
function rosaStorm(p) { return hasPower(p, 'q_rosa') && (powerState(p, 'q_rosa').storm || 0) > 0; }
// suelta `n` flechas de viento (60 %): buscan a los enemigos más cercanos a la mira (Ojo de la
// Racha: al de más vida; Abanico de Aire: en abanico hacia la mira) y atraviesan los que digan
// sus nodos. Devuelve los impactos.
function windVolley(g, p, n, cast) {
  const T = tune().wind, tv = p.tv || {};
  const foes = foesNear(g, p.pos, T.range);
  if (!(n > 0) || !foes.length) return 0;
  const aim = cast?.target || cast?.enemy?.pos || foes[0].pos;
  const addPct = (tv.windDmg || 0) + (rosaStorm(p) ? T.rosa.pct : 0);
  const through = Math.max(tv.windPierce || 0, tv.windFan || 0);       // enemigos que atraviesa cada flecha
  const tags = new Set(['proj', 'physical']);
  const byAim = foes.slice().sort((a, b) => dist2(a.pos, aim) - dist2(b.pos, aim));
  const heavy = tv.windSeek > 0 ? foes.reduce((a, b) => (b.hp > a.hp ? b : a)) : null;
  const base = Math.atan2(aim.x - p.pos.x, aim.z - p.pos.z);
  let hits = 0, crit = false;
  for (let i = 0; i < n; i++) {
    let first = null, dir;
    if (heavy) first = heavy;
    else if (tv.windFan > 0) { const a = base + projFanOffset(i, n, T.fan); dir = { x: Math.sin(a), z: Math.cos(a) }; }
    else first = byAim[i % byAim.length];
    if (first) dir = dirTo(p.pos, first.pos);
    const list = lineFoes(g, p.pos, dir, T.range, T.width, first).slice(0, 1 + through);
    for (const e of list) {
      const r = strike(g, p, e, T.coef, addPct + (tv.windSeek > 0 && isEliteish(e) ? tv.windSeek : 0), 'q_rafagas', tags);
      hits++;
      if (r.crit) crit = true;
      if (tv.windSlow > 0 && e.alive) e.applyCC?.('slow', T.slowT, { pct: tv.windSlow, src: p });
    }
    const end = list.length ? list[list.length - 1].pos : { x: p.pos.x + dir.x * T.range, z: p.pos.z + dir.z * T.range };
    g.spawnBeam?.(p.pos.clone().setY(1.0), v3(end.x, end.z, 1.0), T.color, 0.18);
  }
  if (hits) g.emitFx?.('arqDanceSwirl', p.pos.clone().setY(1.0));
  // Silbido: un crítico devuelve una Ráfaga (una vez por lanzamiento)
  if (crit && tv.windCrit > 0) addGust(p, tv.windCrit);
  return hits;
}

// ---------- Carcaj Encantado: puntas ----------
const TIPS = ['fire', 'frost', 'lightning'];
function tipEvery(p) { return Math.max(0.5, tune().tip.every - (p?.tv?.tipEvery || 0)); }
function tipReady(p) { return now(p) + 1e-9 >= (powerState(p, 'w_puntas').readyAt || 0); }
// consume la punta del ciclo (rota Fuego → Hielo → Rayo) y arma la Trenza al cerrar las tres
function takeTip(p) {
  const st = powerState(p, 'w_puntas');
  const elem = TIPS[(st.idx || 0) % 3];
  st.idx = ((st.idx || 0) + 1) % 3;
  st.readyAt = now(p) + tipEvery(p);
  st.seq = [...(st.seq || []), elem].slice(-3);
  if (st.seq.join() === TIPS.join()) { st.braid = true; st.seq = []; }
  return elem;
}
// ¿puede llevar punta este enemigo? (una por enemigo cada 1 s)
function tipOpen(p, e) {
  const st = powerState(p, 'w_puntas');
  return (st.last?.get(e) ?? -Infinity) <= now(p) - tune().tip.oncePer + 1e-9;
}
// aplica UNA punta (o, con `elems`, varias que cuentan como una: Desborde) al enemigo
function applyTip(g, p, e, elems, mult, { main = false } = {}) {
  if (!e?.alive || !tipOpen(p, e)) return false;
  const st = powerState(p, 'w_puntas'), T = tune().tip, tv = p.tv || {};
  if (!st.last) st.last = new WeakMap();
  st.last.set(e, now(p));
  const durMul = tv.tipMajor > 0 ? 2 : 1;                         // Punta Mayor: su efecto dura el doble
  const k = mult * (1 + ((tv.tipMajor || 0) + (tv.tipDmg || 0)) / 100);
  for (const elem of [].concat(elems)) {
    if (elem === 'fire') {
      const d = dotOf(p, 'burn', p.avgHit(T.burn.coef) * k * (1 + (tv.tipBurn || 0) / 100), T.burn.dur * durMul);
      g.replaceDoT?.(e, d.total, d.ticks, 1, 'w_puntas:burn');      // la quemadura se renueva, no se suma
    } else if (elem === 'frost') {
      e.applyCC?.('slow', T.frost.dur * durMul, { pct: T.frost.slowPct, src: p });
      if (tv.tipRoot > 0 && !isEliteish(e)) e.applyCC?.('root', tv.tipRoot, { src: p });
      if (tv.tipBite > 0) (st.bite || (st.bite = new WeakMap())).set(e, now(p) + T.bite.dur * durMul);
    } else {
      const n = p.avgHit(T.bolt.coef) * k;
      dealProcDamage(g, e, n, { source: 'power:w_puntas', skill: 'w_puntas' });
      for (const o of foesNear(g, e.pos, T.bolt.radius, e).slice(0, T.bolt.jumps + (tv.tipChain || 0))) {
        dealProcDamage(g, o, n, { source: 'power:w_puntas', skill: 'w_puntas' });
        g.spawnBeam?.(e.pos.clone().setY(1.0), o.pos.clone().setY(1.0), T.colors.lightning, 0.15);
      }
    }
    g.spawnRing?.(e.pos, 0.9, T.colors[elem] || 0xffffff);
  }
  // Punta Curativa: por la cubeta de autocuración, como mucho una vez cada 6 s
  if (tv.tipHeal > 0 && takeCd(st, 'healAt', T.healEvery, p)) selfHeal(g, p, tv.tipHeal, 'w_puntas');
  // Puntas Afines: cada punta del ciclo da Impulso (Tiradora) o recarga Trampa de Cepo (Montaraz)
  if (main && tv.tipAffinity > 0) {
    const m = p.talentAgg?.mechanic;
    if (m === 'impulso') gainGauge(p, 'impulso', T.affinity.impulso);
    else if (m === 'coto') g.reduceCooldown?.(p, 'a_t_cepo', T.affinity.cepo);
  }
  return true;
}
// ¿esta habilidad «coloca» algo que daña? (trampas, zonas y lluvias: Trampa Encantada)
function placesTip(cast) {
  const sk = cast?.sk;
  if (!sk || !(cast.prof?.coef > 0)) return false;
  const tags = cast.prof?.tags;
  return sk.type === 'trap' || sk.type === 'zone' || !!tags?.has?.('trap') || !!tags?.has?.('zone')
    || sk.behavior === 'a_lluvia' || sk.behavior === 'a_diluvio';
}

// ---------- Halconera: halcón y marca ----------
function skyStorm(p) { return hasPower(p, 'y_cielo') && (powerState(p, 'y_cielo').storm || 0) > 0; }
function hawkMarked(p, e) {
  const until = powerState(p, 'y_halcon').marks?.get(e);
  return !!e?.alive && until != null && until > now(p);
}
// tu blanco: el último enemigo que golpeaste con una flecha (hace ≤ 5 s y a 15 m) o el más cercano
function hawkTarget(g, p) {
  const st = powerState(p, 'y_halcon'), T = tune().hawk;
  const e = st.target;
  if (e?.alive && now(p) - (st.targetAt ?? -99) <= T.recent && dist2(e.pos, p.pos) <= T.range * T.range) return e;
  return foesNear(g, p.pos, T.near)[0] || null;
}
// Cielo de Halcones: cada picado busca a OTRO enemigo (el más cercano sin marca)
function skyTarget(g, p) {
  const st = powerState(p, 'y_halcon');
  const list = foesNear(g, p.pos, tune().hawk.near);
  return list.find(e => e !== st.lastDive && !hawkMarked(p, e)) || list.find(e => e !== st.lastDive) || list[0] || null;
}
// el marcado recibe +10 % de tus flechas 6 s (Ojo Compartido: 12 s y varios a la vez);
// Presa Señalada (Montaraz): cuenta como tu Presa
function hawkMark(p, e) {
  const st = powerState(p, 'y_halcon'), tv = p.tv || {};
  if (!st.marks) st.marks = new Map();
  if (!(tv.hawkShared > 0)) for (const o of [...st.marks.keys()]) if (o !== e) hawkUnmark(p, o);
  st.marks.set(e, now(p) + (tv.hawkShared > 0 ? tv.hawkShared : tune().hawk.mark));
  if (tv.hawkPrey > 0 && p.talentAgg?.mechanic === 'coto') e.prey = true;
}
function hawkUnmark(p, e) {
  const st = powerState(p, 'y_halcon');
  st.marks?.delete(e);
  if (p.tv?.hawkPrey > 0 && e && gaugeState(p, 'coto')?.prey !== e) e.prey = false;
}
// PICADO del halcón sobre `e` (100 %): marca y aplica lo que digan sus nodos
function hawkDive(g, p, e) {
  if (!e?.alive) return false;
  const T = tune().hawk, tv = p.tv || {};
  const tags = new Set(['physical']);
  const claws = tv.hawkDmg || 0;                                    // Garras Afiladas: todo el daño del halcón
  const diveAdd = o => claws + (tv.hawkDeep || 0) + (isEliteish(o) ? (tv.hawkElite || 0) : 0);
  if (tv.hawkSweep > 0) {
    // Vuelo Rasante: barre una línea de 8 m que pasa por el blanco y golpea a todos
    const dir = dirTo(p.pos, e.pos), half = T.sweep.len / 2;
    const from = { x: e.pos.x - dir.x * half, z: e.pos.z - dir.z * half };
    for (const o of lineFoes(g, from, dir, T.sweep.len, T.sweep.width)) strike(g, p, o, tv.hawkSweep / 100, diveAdd(o), 'y_halcon', tags);
    g.spawnBeam?.(v3(from.x, from.z, 1.2), v3(from.x + dir.x * T.sweep.len, from.z + dir.z * T.sweep.len, 1.2), T.color, 0.2);
  } else strike(g, p, e, T.coef, diveAdd(e), 'y_halcon', tags);
  if (tv.hawkDeep > 0 && e.alive) e.addStagger?.(T.deepStagger, p);        // Picado Hondo: Quebranto al jefe
  if (tv.hawkSilence > 0 && e.alive) e.applyCC?.('interrupt', tv.hawkSilence, { src: p });   // Grito del Halcón
  if (e.alive) hawkMark(p, e);
  // Bandada: dos halcones pequeños sobre otros enemigos · Plumas Cortantes: plumas a los de al lado
  if (tv.hawkFlock > 0) for (const o of foesNear(g, e.pos, T.flock.radius, e).slice(0, T.flock.n)) strike(g, p, o, tv.hawkFlock / 100, claws, 'y_halcon', tags);
  if (tv.hawkFeathers > 0) for (const o of foesNear(g, e.pos, T.feathers.radius, e).slice(0, tv.hawkFeathers)) strike(g, p, o, T.feathers.coef, claws, 'y_halcon', tags);
  powerState(p, 'y_halcon').lastDive = e;
  g.spawnBeam?.(v3(e.pos.x, e.pos.z, 6), e.pos.clone().setY(1.0), T.color, 0.2);
  g.emitFx?.('arqStunPop', e.pos.clone().setY(1.2));
  return true;
}

// ============================================================
// PODERES
// ============================================================
export function arqueraPowers() {
  return {
    // ================ árbol de clase (§6) ================
    // c5A Puntería Fija: el crítico se decide al TIRAR el golpe (las flechas tiran al impactar,
    // con el enemigo real). condCrit cuenta los Disparos Rápidos que llegan a cada enemigo y, en
    // el 4.º, fuerza el crítico de ESA tirada; condAdd (va antes en la siguiente tirada) lo
    // devuelve, así no se contagia a las demás flechas del disparo.
    a_punteria_fija: {
      name: 'Puntería Fija', desc: 'Cada 4.º Disparo Rápido al mismo enemigo es crítico seguro.',
      state: () => ({ count: new WeakMap(), forced: null, was: false }),
      condAdd(p) {
        const st = powerState(p, 'a_punteria_fija');
        if (st.forced) { st.forced.forceCrit = st.was; st.forced = null; }
        return 0;
      },
      condCrit(p, e, hit) {
        if (!e || hit?.skill !== 'a_disparo') return 0;
        const st = powerState(p, 'a_punteria_fija');
        const n = (st.count.get(e) || 0) + 1;
        st.count.set(e, n);
        if (n % tune().cls.punteria.every === 0 && !hit.forceCrit) { st.forced = hit; st.was = false; hit.forceCrit = true; }
        return 0;
      },
    },
    // c5B Flecha Saqueadora: si Disparo Rápido mata, +8 de Energía (una vez por disparo)
    a_saqueo: {
      name: 'Flecha Saqueadora', desc: 'Si Disparo Rápido mata, recuperas 8 de Energía (como mucho una vez por disparo).',
      state: () => ({ shot: 0, paid: -1 }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'a_disparo') powerState(p, 'a_saqueo').shot++; },
      onKill(g, p, e, kill) {
        if (kill?.skill !== 'a_disparo') return;
        const st = powerState(p, 'a_saqueo');
        if (st.paid === st.shot) return;
        st.paid = st.shot;
        g.gainResource?.(p, tune().cls.saqueo.energy);
      },
    },
    // c6A A Bocajarro: a menos de 5 m, tus flechas +15 % y empujan 1 m (a un jefe, Quebranto)
    a_bocajarro: {
      name: 'A Bocajarro', desc: 'A menos de 5 m, tus flechas hacen +15 % de daño y empujan 1 m al enemigo.',
      condAdd(p, e, hit) {
        const T = tune().cls.bocajarro;
        return e && arrowRoll(hit) && dist(p.pos, e.pos) < T.near ? T.pct : 0;
      },
      onHit(g, p, e, hit) {
        const T = tune().cls.bocajarro;
        if (!e?.alive || !arrowHit(hit) || dist(p.pos, e.pos) >= T.near) return;
        e.displace?.(p.pos, T.knock, { src: p });
      },
    },
    // c6B Tiro Lejano: a más de 10 m, tus flechas +20 %
    a_tiro_lejano: {
      name: 'Tiro Lejano', desc: 'A más de 10 m, tus flechas hacen +20 % de daño.',
      condAdd(p, e, hit) {
        const T = tune().cls.lejano;
        return e && arrowRoll(hit) && dist(p.pos, e.pos) > T.far ? T.pct : 0;
      },
    },
    // c9B Punta de Diamante: Flecha Perforante +40 % al PRIMER enemigo que toca (el HitInfo es
    // del lanzamiento: la primera tirada lo marca)
    a_punta_diamante: {
      name: 'Punta de Diamante', desc: 'Flecha Perforante hace +40 % al primer enemigo que toca.',
      condAdd(p, e, hit) {
        if (!e || hit?.skill !== 'flecha_perforante' || hit._arqDiamond) return 0;
        hit._arqDiamond = true;
        return tune().cls.diamante.pct;
      },
    },
    // c10A Flecha Roma: cada 8 s, tu siguiente flecha ralentiza un 50 % 4 s
    a_flecha_roma: {
      name: 'Flecha Roma', desc: 'Cada 8 s, tu siguiente disparo ralentiza un 50 % durante 4 s.',
      icd: 8,
      onHit(g, p, e, hit) {
        if (!e?.alive || !arrowHit(hit)) return false;               // false: no gasta el icd
        const T = tune().cls.roma;
        e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
        g.emitFx?.('arqStunPop', e.pos.clone().setY(1.0));
      },
    },
    // c10B Flecha Silbante: cada 10 s, tu siguiente flecha corta el hechizo y deja mudo 3 s
    // (interrumpir llena 20 de Quebranto a un jefe: Enemy.applyCC)
    a_silbante: {
      name: 'Flecha Silbante', desc: 'Cada 10 s, tu siguiente disparo corta el hechizo del enemigo y lo deja mudo 3 s.',
      icd: 10,
      onHit(g, p, e, hit) {
        if (!e?.alive || !arrowHit(hit)) return false;
        e.applyCC?.('interrupt', tune().cls.silbante.silence, { src: p });
        g.emitFx?.('arqSilenceMark', e.pos.clone().setY(1.6));
      },
    },
    // c11A Camuflaje: el primer ataque con daño desde la invisibilidad (la rompe) o al salir de
    // ella es crítico seguro (⑦ onCast → cast.forceCrit: TODOS sus proyectiles). La activa
    // a_t_camuflaje (comportamiento, abajo) te hace invisible y recarga Paso Veloz.
    a_camuflaje: {
      name: 'Camuflaje', desc: 'Tu primer ataque desde la invisibilidad (o al salir de ella) es crítico seguro.',
      state: () => ({ active: false, crit: false }),
      onCast(g, p, cast) {
        if (!cast || !(cast.weapon || (cast.prof?.coef || 0) > 0)) return;
        const st = powerState(p, 'a_camuflaje');
        const invis = !!p.isInvisible?.();
        if (!invis && !st.crit) return;
        cast.forceCrit = true;
        endCamo(p, st, false);
        if (invis) p.reveal();
      },
      // la invisibilidad acabó sola: queda cebado el crítico del primer disparo
      onTick(g, p) {
        const st = powerState(p, 'a_camuflaje');
        if (st.active && !p.isInvisible?.()) endCamo(p, st, true);
      },
    },
    // c11B Instinto de Supervivencia: un golpe letal te deja con 1 de vida y suelta una Bomba
    // de Humo gratis a tus pies (una vez cada 180 s)
    a_instinto: {
      name: 'Instinto de Supervivencia', desc: 'Un golpe que te mataría te deja con 1 de vida y suelta una Bomba de Humo gratis. Una vez cada 180 s.',
      icd: 180,
      onLethal(g, p) {
        const at = p.pos.clone();
        g.timers?.schedule?.(tune().frame, () => { if (p.alive) castEchoOf(g, p, 'a_humo', 1, at); });
        g.ui?.spawnText?.(p.pos, '¡Instinto!', 'txt-crit');
        return true;                                                 // el núcleo te deja con 1 de vida
      },
    },
    // c14A Paso de Abrojos: donde empieza Paso Veloz quedan abrojos 3 s que ralentizan un 50 %
    a_paso_abrojos: {
      name: 'Paso de Abrojos', desc: 'Donde empieza tu Paso Veloz quedan abrojos 3 s que ralentizan un 50 %.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_paso') return;
        const T = tune().cls.abrojos;
        g.spawnField?.('zona', { pos: p.pos.clone().setY(0), radius: T.radius, dur: T.dur, owner: p,
          data: { dps: 0, slow: T.slowT, slowPct: T.slowPct, color: T.color, skill: 'a_paso_abrojos' } });
      },
    },
    // c14B Paso Sanador: Paso Veloz te cura un 6 % (cubeta de autocuración; una vez cada 12 s)
    a_rodada_cura: {
      name: 'Paso Sanador', desc: 'Paso Veloz te cura un 6 % de la vida (como mucho una vez cada 12 s).',
      state: () => ({ at: -Infinity }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_paso') return;
        const T = tune().cls.rodada;
        if (takeCd(powerState(p, 'a_rodada_cura'), 'at', T.every, p)) selfHeal(g, p, T.pct, 'a_rodada_cura');
      },
    },
    // c15A Adrenalina: al bajar del 50 % de vida, +30 de Energía y −20 % de daño 4 s (cada 30 s)
    a_adrenalina: {
      name: 'Adrenalina', desc: 'Al bajar del 50 % de vida recuperas 30 de Energía y recibes un 20 % menos 4 s. Una vez cada 30 s.',
      icd: 30,
      onDamaged(g, p, info) {
        const T = tune().cls.adrenalina, max = p.stats?.maxHP || 1;
        if (!(p.hp >= max * T.below && p.hp - (info?.amount || 0) < max * T.below)) return false;
        g.gainResource?.(p, T.energy);
        p.addBuff?.('a_adrenalina', { dr: T.dr }, T.dur, { name: 'Adrenalina', icon: '💢', desc: `−${T.dr}% de daño recibido` });
      },
    },
    // c15B Calma Letal: con más de 40 de Energía, +10 % de daño (umbral absoluto: la clave
    // tv.highManaDmg del núcleo mira el 70 % del máximo)
    a_calma_letal: {
      name: 'Calma Letal', desc: 'Con más de 40 de Energía, haces +10 % de daño.',
      condAdd(p) { const T = tune().cls.calma; return (p.mp || 0) > T.over ? T.pct : 0; },
    },
    // c16A Presión Constante: cada flecha al mismo enemigo +4 % contra él (hasta +20 %); se
    // pierde al cambiar de blanco
    a_presion: {
      name: 'Presión Constante', desc: 'Cada disparo al mismo enemigo te da +4 % de daño contra él (hasta +20 %); se pierde al cambiar de blanco.',
      state: () => ({ target: null, n: 0 }),
      condAdd(p, e, hit) {
        const st = powerState(p, 'a_presion');
        return e && e === st.target && arrowRoll(hit) ? tune().cls.presion.pct * st.n : 0;
      },
      onHit(g, p, e, hit) {
        if (!e || !arrowHit(hit)) return;
        const st = powerState(p, 'a_presion');
        if (st.target === e) st.n = Math.min(tune().cls.presion.max, st.n + 1);
        else { st.target = e; st.n = 1; }
      },
    },
    // c16B Barrido de Caza: cada enemigo distinto golpeado en 2 s, +3 % de velocidad de ataque (hasta +15 %)
    a_barrido: {
      name: 'Barrido de Caza', desc: 'Cada enemigo distinto que golpeas en 2 s te da +3 % de velocidad de ataque (hasta +15 %).',
      state: () => ({ seen: new Map(), n: 0 }),
      onHit(g, p, e, hit) {
        if (!e || hit?.proc || hit?.dot) return;
        powerState(p, 'a_barrido').seen.set(e, now(p));
        sweepRefresh(p, true);
      },
      onTick(g, p) { sweepRefresh(p, false); },
    },
    // c17B Huida Desesperada: al bajar del 30 % de vida, +40 % de velocidad y −20 % de daño 4 s (cada 60 s)
    a_huida: {
      name: 'Huida Desesperada', desc: 'Al bajar del 30 % de vida: +40 % de velocidad y un 20 % menos de daño 4 s. Una vez cada 60 s.',
      icd: 60,
      onDamaged(g, p, info) {
        const T = tune().cls.huida, max = p.stats?.maxHP || 1;
        if (!(p.hp >= max * T.below && p.hp - (info?.amount || 0) < max * T.below)) return false;
        p.addBuff?.('a_huida', { spdPct: T.spdPct, dr: T.dr }, T.dur, { name: 'Huida Desesperada', icon: '💨', desc: `+${T.spdPct}% de velocidad y −${T.dr}% de daño recibido` });
      },
    },
    // c19 Tiro desde la Niebla: dentro de tu Bomba de Humo, cada Disparo Rápido da 3 de Energía
    // y alarga el humo 0,3 s (hasta +2 s por humo)
    a_tiro_niebla: {
      name: 'Tiro desde la Niebla', desc: 'Dentro de tu Bomba de Humo, cada Disparo Rápido te da 3 de Energía y alarga el humo 0,3 s (hasta +2 s).',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_disparo') return;
        const here = smokesHere(g, p);
        if (!here.length) return;
        const T = tune().cls.niebla;
        g.gainResource?.(p, T.energy);
        for (const f of smokesOf(g, p)) {
          if (!here.includes(f) && !here.some(h => h.pos.x === f.pos.x && h.pos.z === f.pos.z)) continue;   // la ceguera va con su zona
          const ext = Math.min(T.ext, T.max - (f._arqNiebla || 0));
          if (ext > 0) { f.t += ext; f.dur = (f.dur || 0) + ext; f._arqNiebla = (f._arqNiebla || 0) + ext; }
        }
      },
    },
    // c20 Lluvia en Retirada: Paso Veloz deja caer una Lluvia de Flechas gratis al 30 % donde
    // empezaste a rodar (con su variante de la forja: es la misma habilidad, repetida)
    a_lluvia_retirada: {
      name: 'Lluvia en Retirada', desc: 'Paso Veloz deja caer una Lluvia de Flechas gratis al 30 % donde empezaste a rodar.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_paso') return;
        const T = tune().cls.retirada, at = p.pos.clone();
        g.timers?.schedule?.(T.delay, () => { if (p.alive) castEchoOf(g, p, 'lluvia_flechas', T.mult, at); });
      },
    },
    // c23 Recarga en Marcha: cada principal recarga 0,3 s/rango de Paso Veloz y de la Bomba de Humo
    a_recarga_marcha: {
      name: 'Recarga en Marcha', desc: 'Cada habilidad principal que lanzas recarga Paso Veloz y la Bomba de Humo.',
      afterCast(g, p, cast) {
        if (cast?.sk?.cat !== 'spender') return;
        const s = tune().cls.marcha.perRank * powerRank(p, 'a_recarga_marcha');
        if (!(s > 0)) return;
        g.reduceCooldown?.(p, 'a_paso', s);
        g.reduceCooldown?.(p, 'a_humo', s);
      },
    },
    // c25 Emboscada: al salir de tu Bomba de Humo (o al acabarse), tus rango+1 siguientes
    // disparos son críticos seguros
    a_emboscada: {
      name: 'Emboscada', desc: 'Al salir de tu Bomba de Humo o al acabarse, tus siguientes disparos son críticos seguros.',
      state: () => ({ inside: false, n: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'a_emboscada');
        const inside = smokesHere(g, p).length > 0;
        if (st.inside && !inside) st.n = powerRank(p, 'a_emboscada') + 1;
        st.inside = inside;
      },
      onCast(g, p, cast) {
        const st = powerState(p, 'a_emboscada');
        if (!(st.n > 0) || !arrowCast(cast)) return;
        st.n--;
        cast.forceCrit = true;
      },
    },
    // c26 Compás: alternar básica y principal da un Compás (hasta 5): +2 % de daño por rango
    // cada uno; se pierden 3 s después del último
    a_compas: {
      name: 'Compás', desc: 'Alternar básica y principal te da Compases (hasta 5): +% de daño cada uno. Se pierden a los 3 s.',
      state: () => ({ n: 0, last: null, until: 0 }),
      onCast(g, p, cast) {
        const kind = cast?.weapon || cast?.sk?.cat === 'basic' ? 'basic' : cast?.sk?.cat === 'spender' ? 'spender' : null;
        if (!kind) return;
        const st = powerState(p, 'a_compas'), T = tune().cls.compas, t = now(p);
        if (st.n > 0 && t > st.until) { st.n = 0; invalidate(p); }
        if (st.last && st.last !== kind && st.n < T.max) {
          st.n++;
          st.until = t + T.keep;
          if (st.n >= T.max) invalidate(p);                         // Danza del Arco lee los 5 Compases al resolver
        } else if (st.last && st.last !== kind) st.until = t + T.keep;
        st.last = kind;
      },
      onTick(g, p) {
        const st = powerState(p, 'a_compas');
        if (st.n > 0 && now(p) > st.until) { st.n = 0; invalidate(p); }
      },
      condAdd(p) {
        const st = powerState(p, 'a_compas');
        if (!(st.n > 0) || now(p) > st.until) return 0;
        return st.n * tune().cls.compas.perRank * powerRank(p, 'a_compas');
      },
    },
    // c27 Tras la Rodada: tras Paso Veloz, tu siguiente principal no cuesta Energía y hace +10 %/rango.
    // El perfil está cacheado: armar o gastar el efecto lo invalida (modifyResolve lo vuelve a leer).
    a_tras_rodada: {
      name: 'Tras la Rodada', desc: 'Tras Paso Veloz, tu siguiente habilidad principal no cuesta Energía y hace más daño.',
      state: () => ({ armed: false }),
      modifyResolve(p, sk, prof) {
        if (prof.cat !== 'spender' || !powerState(p, 'a_tras_rodada').armed) return;
        prof.cost = 0;
        prof.addPct += tune().cls.tras.perRank * powerRank(p, 'a_tras_rodada');
        prof.trasRodada = true;
      },
      onCast(g, p, cast) {
        const st = powerState(p, 'a_tras_rodada');
        if (cast?.sk?.id === 'a_paso') { if (!st.armed) { st.armed = true; invalidate(p); } return; }
        if (st.armed && cast?.prof?.trasRodada) { st.armed = false; invalidate(p); }
      },
    },
    // c28 Manto de Niebla (final): tu Bomba de Humo te sigue; dentro recibes un 25 % menos (antes
    // 50 %) y cura a tus ALIADOS (no a ti) 0,25 % de vida por segundo y rango. Cada humo nuevo
    // (también el gratis de Instinto) se ajusta en el primer tic; su ceguera no se suma a la de
    // otro humo (weakenOutgoing con un solo id).
    a_manto: {
      name: 'Manto de Niebla', desc: 'Tu Bomba de Humo te sigue; dentro recibes un 25 % menos y cura a tus aliados.',
      onTick(g, p, dt) {
        const T = tune().cls.manto, r = powerRank(p, 'a_manto');
        for (const f of smokesOf(g, p)) {
          if (!f._arqManto) {
            f._arqManto = true;
            f.follow = 'owner';
            if (f.kind !== 'a_humo_ciego' && (f.data.allyDr || 0) > T.dr) f.data.allyDr = T.dr;
          }
          if (f.kind === 'a_humo_ciego' || !(r > 0)) continue;
          const pct = T.healPerRank * r;
          const at = v3(f.pos.x, f.pos.z);
          const inside = new Set((g.allies ? g.allies() : []).filter(a => a !== p && dist2(a.pos, f.pos) <= f.radius * f.radius));
          if (inside.size) g.heal?.(a => (inside.has(a) ? (a.stats?.maxHP || 0) * pct / 100 * dt : 0), { target: 'all', pos: at, radius: f.radius, src: 'a_manto' });
        }
      },
    },
    // c29 Danza del Arco (final): con 5 Compases, tu siguiente principal es gratis, crítica y
    // +20 %/rango; los Compases vuelven a 0 (después de que Compás cuente este lanzamiento)
    a_danza_arco: {
      name: 'Danza del Arco', desc: 'Con 5 Compases, tu siguiente principal es gratis, crítica y hace más daño.',
      priority: -1,
      modifyResolve(p, sk, prof) {
        if (prof.cat !== 'spender') return;
        const c = powerState(p, 'a_compas');
        if (!(c.n >= tune().cls.compas.max && now(p) <= c.until)) return;
        prof.cost = 0;
        prof.forceCrit = true;
        prof.addPct += tune().cls.danza.perRank * powerRank(p, 'a_danza_arco');
        prof.danzaArco = true;
      },
      onCast(g, p, cast) {
        if (!cast?.prof?.danzaArco) return;
        const c = powerState(p, 'a_compas');
        c.n = 0;
        invalidate(p);
        g.ui?.spawnText?.(p.pos, '¡Danza del Arco!', 'txt-crit');
      },
    },
    // c30 Sombra Gemela (final): Paso Veloz deja una sombra 3 s (una a la vez) que repite tus
    // principales al 30/45/60 % (repeticiones del canal: no cuestan ni generan otras)
    a_sombra: {
      name: 'Sombra Gemela', desc: 'Paso Veloz deja una sombra tuya 3 s que repite tus habilidades principales.',
      state: () => ({ until: -1 }),
      onCast(g, p, cast) {
        const st = powerState(p, 'a_sombra'), T = tune().cls.sombra, sk = cast?.sk;
        if (sk?.id === 'a_paso') {
          st.until = now(p) + T.dur;
          g.emitFx?.('arqCamoLeaves', p.pos.clone().setY(1.0));
          return;
        }
        if (sk?.cat !== 'spender' || now(p) > st.until || !cast.slot) return;
        const mult = T.base + T.perRank * powerRank(p, 'a_sombra');
        const slot = cast.slot, id = sk.id;
        g.timers?.schedule?.(T.delay, () => { if (p.alive && p.hotbar?.[slot] === id) g.castSkillSlot?.(slot, mult); });
      },
    },

    // ================ Errante del Viento (§9.2) ================
    // q0 Ráfagas: una cada 4 s (hasta 3); tu siguiente principal o insignia suelta una flecha de
    // viento por Ráfaga. Sus nodos (claves wind*): Brisa Constante (cada 3 s), Viento a Favor
    // (cada 15 m recorridos, rodando y saltando también), Aire Quieto (quieta, cada 2 s), Plumas
    // de Aire (atraviesan), Corriente Protectora (−15 % de daño con 3), Aire Afilado (+30 %),
    // Empuje del Aire (gastar 3: +15 de tu mecánica), Rachas (gastar 3: recarga la insignia),
    // Ojo de la Racha / Abanico de Aire, Aire Pesado (ralentizan), Tormenta Guardada (hasta 5) y
    // Silbido (un crítico devuelve una Ráfaga). Torbellino (activa) da 3 Ráfagas.
    q_rafagas: {
      name: 'Ráfagas', desc: 'Guardas Ráfagas con el tiempo; tu siguiente principal o insignia suelta una flecha de viento por cada una.',
      state: () => ({ n: 0, acc: 0, walk: 0, at: null }),
      onTick(g, p, dt) {
        const st = powerState(p, 'q_rafagas'), T = tune().wind, tv = p.tv || {};
        let every = Math.max(0.5, T.every - (tv.windEvery || 0));
        if (tv.windStill > 0 && !p.moving) every = Math.min(every, tv.windStill);
        if (rosaStorm(p)) every = Math.min(every, T.rosa.gustEvery);
        st.acc += dt;
        while (st.acc >= every - 1e-9) { st.acc -= every; addGust(p, 1); }
        if (tv.windMove > 0) {
          if (st.at) st.walk += Math.hypot(p.pos.x - st.at.x, p.pos.z - st.at.z);
          st.at = { x: p.pos.x, z: p.pos.z };
          while (st.walk >= tv.windMove) { st.walk -= tv.windMove; addGust(p, 1); }
        }
      },
      afterCast(g, p, cast) {
        const sk = cast?.sk;
        if (!sk) return;
        if (sk.id === 'a_h_torbellino') { addGust(p, tune().wind.torbellino); return; }
        if (sk.cat !== 'spender' && sk.cat !== 'spec') return;
        const st = powerState(p, 'q_rafagas'), tv = p.tv || {};
        const n = st.n || 0;
        if (!(n > 0)) return;
        st.n = 0;
        windVolley(g, p, n, cast);
        if (n < 3) return;
        // gastar 3 Ráfagas a la vez
        const m = p.talentAgg?.mechanic;
        if (tv.windGauge > 0 && (m === 'impulso' || m === 'concentracion')) gainGauge(p, m, tv.windGauge);
        const ins = tv.windRush > 0 ? insigniaOf(p) : null;
        if (ins) g.reduceCooldown?.(p, ins.id, tv.windRush);
      },
      condDr(p) {
        const tv = p.tv || {};
        return tv.windGuard > 0 && (powerState(p, 'q_rafagas').n || 0) >= 3 ? tv.windGuard : 0;
      },
    },
    // q12 Rosa de los Vientos (final): cada 25 s el viento ruge 6 s: una Ráfaga por segundo y
    // las flechas de viento +50 % (lo leen q_rafagas y windVolley)
    q_rosa: {
      name: 'Rosa de los Vientos', desc: 'Cada 25 s, el viento ruge 6 s: ganas una Ráfaga por segundo y las flechas de viento hacen +50 %.',
      state: () => ({ cycle: 0, storm: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'q_rosa'), T = tune().wind.rosa;
        if (st.storm > 0) st.storm = Math.max(0, st.storm - dt);
        st.cycle += dt;
        if (st.cycle + 1e-9 < T.every) return;
        st.cycle -= T.every;
        st.storm = T.dur;
        g.ui?.spawnText?.(p.pos, '¡Rosa de los Vientos!', 'txt-crit');
      },
    },

    // ================ Carcaj Encantado (§9.3) ================
    // w0 Puntas Encantadas: cada 6 s tu siguiente flecha lleva una punta que rota (Fuego quema
    // 200 %, Hielo frena un 40 %, Rayo 80 % y salta a 3); una punta por enemigo cada 1 s y la
    // quemadura se renueva. Sus nodos (claves tip*): Encantamiento Rápido (cada 4 s), Punta Mayor
    // / Punta Repartida, Trampa Encantada (trampas, zonas y lluvias toman la punta al colocarlas),
    // Punta Curativa, Fuego Prendido, Hielo Hondo, Trenza de Puntas, Chispa Saltarina / Hielo
    // Mordiente, Puntas Afines, Encantamiento Hondo y Punta Viva. Desborde de Puntas (activa):
    // tus 4 siguientes disparos llevan las tres puntas al 50 % (cuentan como una por enemigo).
    w_puntas: {
      name: 'Puntas Encantadas', desc: 'Cada 6 s tu siguiente flecha lleva una punta encantada que rota: Fuego, Hielo o Rayo.',
      priority: 1,                                                  // antes que Lluvia Encantada (30 %)
      procs: true,                                                   // los tics de una zona que lleva la punta
      state: () => ({ readyAt: 0, idx: 0, seq: [], braid: false, last: new WeakMap(), bite: new WeakMap(),
        share: null, desborde: 0, desb: null, placed: new Map(), quickAt: -Infinity, healAt: -Infinity }),
      onCast(g, p, cast) {
        const st = powerState(p, 'w_puntas'), sk = cast?.sk, t = now(p);
        if (!sk) return;
        if (st.desborde > 0 && arrowCast(cast)) { st.desborde--; st.desb = { skill: sk.id, until: t + tune().tip.shareWin, done: new Set() }; }
        // Trampa Encantada: lo que colocas toma la punta lista (y la gasta)
        if (p.tv?.tipPlace > 0 && placesTip(cast) && tipReady(p)) {
          const dur = cast.prof?.dur > 0 ? cast.prof.dur : tune().tip.placeWin;
          st.placed.set(sk.id, { elem: takeTip(p), until: t + dur + 1 });
        }
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id === 'a_h_puntas') powerState(p, 'w_puntas').desborde = tune().tip.desborde.shots;
      },
      onHit(g, p, e, hit) {
        if (!e || hit?.proc) return;
        const st = powerState(p, 'w_puntas'), T = tune().tip, tv = p.tv || {}, t = now(p);
        // lo colocado con la punta (trampa, zona o lluvia): sus golpes y sus tics
        const pl = st.placed.get(hit.skill);
        if (pl) {
          if (t > pl.until) st.placed.delete(hit.skill);
          else if (e.alive) applyTip(g, p, e, pl.elem, 1);
        }
        if (hit.dot || !e.alive) return;
        // Desborde de Puntas: las tres al 50 % (no avanzan la Trenza ni las reparte Punta Repartida)
        const d = st.desb;
        if (d && d.skill === hit.skill && t <= d.until && !d.done.has(e)) { d.done.add(e); applyTip(g, p, e, TIPS, T.desborde.mult); }
        if (!arrowHit(hit)) return;
        // Trenza de Puntas: tras Fuego, Hielo y Rayo seguidos, esta flecha estalla en 4 m
        if (st.braid && tv.tipBraid > 0) {
          st.braid = false;
          g.dealArea?.(e.pos.clone().setY(0), T.braid.radius, tv.tipBraid / 100,
            { hitInfo: { skill: 'w_puntas', tags: new Set(['area']), elem: null }, hitExtra: { echo: true }, from: e.pos });
          g.emitFx?.('arqBlastPop', e.pos.clone().setY(0.6));
        }
        // la punta del ciclo, si está lista y este enemigo la admite
        if (tipReady(p) && tipOpen(p, e)) {
          const elem = takeTip(p);
          applyTip(g, p, e, elem, 1, { main: true });
          if (tv.tipShare > 0) st.share = { skill: hit.skill, elem, until: t + T.shareWin, done: new Set([e]) };
          return;
        }
        // Punta Repartida: las demás flechas de ese disparo llevan la punta al 30 % (una por enemigo)
        const sh = st.share;
        if (sh && tv.tipShare > 0 && sh.skill === hit.skill && t <= sh.until && !sh.done.has(e)) {
          sh.done.add(e);
          applyTip(g, p, e, sh.elem, tv.tipShare / 100);
        }
      },
      // Hielo Mordiente: los que llevan la punta de Hielo reciben +15 % de tus flechas 4 s (8 con Punta Mayor)
      condAdd(p, e, hit) {
        const tv = p.tv || {};
        if (!e || !(tv.tipBite > 0) || !arrowRoll(hit)) return 0;
        return (powerState(p, 'w_puntas').bite?.get(e) || 0) > now(p) ? tv.tipBite : 0;
      },
      // Punta Viva: si una punta mata, la siguiente llega al instante (una vez cada 3 s)
      onKill(g, p, e, kill) {
        const tv = p.tv || {};
        if (!(tv.tipQuick > 0) || kill?.skill !== 'w_puntas') return;
        const st = powerState(p, 'w_puntas');
        if (takeCd(st, 'quickAt', tv.tipQuick, p)) st.readyAt = now(p);
      },
    },
    // w12 Lluvia Encantada (final): cada 30 s, durante 6 s, tus flechas llevan una punta (al 30 %;
    // una por enemigo cada 1 s), rotando aparte del ciclo de w_puntas
    w_lluvia_encantada: {
      name: 'Lluvia Encantada', desc: 'Cada 30 s, durante 6 s, tus flechas llevan una punta encantada (al 30 %).',
      state: () => ({ cycle: 0, storm: 0, idx: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'w_lluvia_encantada'), T = tune().tip.rain;
        if (st.storm > 0) st.storm = Math.max(0, st.storm - dt);
        st.cycle += dt;
        if (st.cycle + 1e-9 < T.every) return;
        st.cycle -= T.every;
        st.storm = T.dur;
        g.ui?.spawnText?.(p.pos, '¡Lluvia Encantada!', 'txt-crit');
      },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'w_lluvia_encantada');
        if (!(st.storm > 0) || !e?.alive || !arrowHit(hit) || !tipOpen(p, e)) return;
        applyTip(g, p, e, TIPS[st.idx++ % 3], tune().tip.rain.mult);
      },
    },

    // ================ Halconera (§9.4) ================
    // y0 Halcón Cazador: cada 6 s cae en picado sobre tu blanco (100 %) y lo marca 6 s: recibe
    // +10 % de tus flechas. Sus nodos (claves hawk*): Alas Rápidas (cada 5 s), Picado Hondo /
    // Vuelo Rasante, Presa Señalada, Alas Protectoras, Garras Afiladas, Grito del Halcón,
    // Cetrería, Bandada / Halcón Peregrino, Plumas Cortantes, Ojo Compartido y Halcón Fiel.
    // Llamada del Halcón (activa): 6 s de ataques (40 % cada 0,5 s), ceguera y 30 de Quebranto.
    y_halcon: {
      name: 'Halcón Cazador', desc: 'Un halcón cae en picado cada 6 s sobre tu blanco y lo marca: recibe +10 % de tus flechas.',
      state: () => ({ acc: 0, target: null, targetAt: -99, marks: new Map(), assault: null, callAt: -Infinity, guardAt: -Infinity, lastDive: null }),
      onTick(g, p, dt) {
        const st = powerState(p, 'y_halcon'), T = tune().hawk, tv = p.tv || {}, t = now(p);
        // marcas que caducan (o mueren); Presa Señalada: el marcado sigue contando como tu Presa
        for (const [e, until] of [...st.marks]) {
          if (!e.alive || until <= t) hawkUnmark(p, e);
          else if (tv.hawkPrey > 0 && p.talentAgg?.mechanic === 'coto') e.prey = true;
        }
        // Llamada del Halcón: ataques cada 0,5 s durante 6 s (si el blanco cae, busca otro)
        const a = st.assault;
        if (a) {
          if (t > a.until) st.assault = null;
          else if (t + 1e-9 >= a.next) {
            if (!a.e?.alive) a.e = hawkTarget(g, p);
            const e = a.e;
            if (e?.alive) {
              strike(g, p, e, T.assault.coef, tv.hawkDmg || 0, 'y_halcon', new Set(['physical']));
              if (a.first && e.alive) {
                a.first = false;
                e.weakenOutgoing?.('y_ceguera', T.assault.blind, T.assault.dur);
                e.addStagger?.(T.assault.stagger, p);
              }
            }
            a.next += T.assault.every;
          }
        }
        // picado periódico (Cielo de Halcones: cada segundo y sobre otro enemigo)
        const sky = skyStorm(p);
        const every = sky ? T.sky.gap : Math.max(1, T.every - (tv.hawkEvery || 0));
        st.acc += dt;
        if (st.acc + 1e-9 < every) return;
        const e = sky ? skyTarget(g, p) : hawkTarget(g, p);
        if (!e) { st.acc = every; return; }                          // espera a tener blanco
        st.acc = 0;
        hawkDive(g, p, e);
      },
      onHit(g, p, e, hit) {
        if (!e?.alive || !arrowHit(hit)) return;
        const st = powerState(p, 'y_halcon'), tv = p.tv || {};
        st.target = e;
        st.targetAt = now(p);
        // Cetrería: tu principal o tu insignia sobre el marcado hace caer al halcón (cada 10 s)
        if (tv.hawkCall > 0 && hawkMarked(p, e)) {
          const cat = catOf(p, hit.skill);
          if ((cat === 'spender' || cat === 'spec') && takeCd(st, 'callAt', tv.hawkCall, p)) hawkDive(g, p, e);
        }
      },
      condAdd(p, e, hit) { return e && arrowRoll(hit) && hawkMarked(p, e) ? tune().hawk.markPct : 0; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_h_halcon') return;
        const e = hawkTarget(g, p);
        if (e) powerState(p, 'y_halcon').assault = { e, until: now(p) + tune().hawk.assault.dur, next: now(p), first: true };
      },
      // Halcón Fiel: si el marcado muere, el halcón marca al siguiente y cae en picado gratis
      onKill(g, p, e) {
        const st = powerState(p, 'y_halcon');
        if (!(p.tv?.hawkLoyal > 0) || !st.marks.has(e)) return;
        hawkUnmark(p, e);
        const next = foesNear(g, e.pos, tune().hawk.loyal.radius, e)[0];
        if (next) hawkDive(g, p, next);
      },
      // Alas Protectoras: al bajar del 40 % de vida, −30 % de daño 4 s (una vez cada 60 s)
      onDamaged(g, p, info) {
        const tv = p.tv || {}, T = tune().hawk.guard, max = p.stats?.maxHP || 1;
        if (!(tv.hawkGuard > 0) || !(p.hp >= max * T.below && p.hp - (info?.amount || 0) < max * T.below)) return;
        if (!takeCd(powerState(p, 'y_halcon'), 'guardAt', T.every, p)) return;
        p.addBuff?.('y_alas', { dr: tv.hawkGuard }, T.dur, { name: 'Alas Protectoras', icon: '🦅', desc: `−${tv.hawkGuard}% de daño recibido` });
      },
    },
    // y12 Cielo de Halcones (final): cada 30 s, durante 4 s, el halcón cae en picado cada segundo
    // y cada picado marca a otro enemigo (lo leen y_halcon y skyTarget)
    y_cielo: {
      name: 'Cielo de Halcones', desc: 'Cada 30 s, durante 4 s, el halcón cae en picado cada segundo sobre otro enemigo.',
      state: () => ({ cycle: 0, storm: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'y_cielo'), T = tune().hawk.sky;
        if (st.storm > 0) st.storm = Math.max(0, st.storm - dt);
        st.cycle += dt;
        if (st.cycle + 1e-9 < T.every) return;
        st.cycle -= T.every;
        st.storm = T.dur;
        g.ui?.spawnText?.(p.pos, '¡Cielo de Halcones!', 'txt-crit');
      },
    },

    // ================ especializaciones (v1 de 2c: trabajos 2 y 3 de KT) ================
    // ---------------- Francotiradora ----------------
    // s4 Aliento del Cazador: con Concentración 100, Disparo Apuntado sale sin carga y gasta 50.
    // (s11 Respiración Profunda es tv.focusEnergy: la Energía al llenar la da el núcleo)
    f_aliento_cazador: {
      name: 'Aliento del Cazador', desc: 'Con la Concentración al 100 %, Disparo Apuntado sale al instante y gasta 50 de Concentración.',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'a_t_apuntado') return;
        if (focus(p) >= 100 - 1e-6) { prof.windup = 0; prof.aliento = true; }
      },
      // el perfil está cacheado: se corrige con la Concentración de ESTE instante
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_apuntado') return;
        const full = focus(p) >= 100 - 1e-6;
        if (full !== !!cast.prof.aliento) {
          cast.prof.windup = full ? 0 : (cast.sk.windup || 0);
          cast.prof.aliento = full;
          if (p.resolved) delete p.resolved[cast.sk.id];
        }
        if (full) spendGauge(p, 'concentracion', tune().aliento.spend);
      },
      onGauge(g, p, id, ev) {
        if (id === 'concentracion' && ev === 'full' && p.resolved) delete p.resolved.a_t_apuntado;
      },
    },
    // s15 Paso del Acechador: moverte vacía un 15 % menos de Concentración (el +5 %/rango
    // de movimiento es el stats del nodo)
    f_acechador: {
      name: 'Paso del Acechador', desc: 'Moverte vacía un 15 % menos de Concentración.',
      stats: () => ({ 'gaugeLoss:concentracion': tune().acechador.lossPct }),
    },
    // s13B Paciencia del Depredador: quieta, +2 % de daño por segundo (máx. +20 %)
    f_patience: {
      name: 'Paciencia del Depredador', desc: 'Quieta, ganas +2 % de daño por segundo, hasta +20 %. Se pierde al moverte.',
      state: () => ({ t: 0 }),
      onTick(g, p, dt) { const st = powerState(p, 'f_patience'); st.t = p.moving ? 0 : st.t + dt; },
      condAdd(p) {
        if (p.moving) return 0;
        const T = tune().patience;
        return Math.min(T.max, T.perSec * powerState(p, 'f_patience').t);
      },
    },
    // s14 Sobrepenetración: cada enemigo atravesado da +15 % (aditivo) contra el siguiente.
    f_overpen: {
      name: 'Sobrepenetración', desc: 'Cada enemigo que atraviesa Disparo Apuntado aumenta un 15 % su daño contra el siguiente.',
      // hit = hitInfo del disparo (uno por disparo): cuenta los enemigos ya atravesados
      condAdd(p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || hit.proc || hit.dot) return 0;
        const n = hit._overpen | 0;
        hit._overpen = n + 1;
        return tune().overpen.perEnemy * n;
      },
    },
    // s6B Herida Abierta: los críticos de Disparo Apuntado sangran un 80 % extra en 6 s.
    f_herida_abierta: {
      name: 'Herida Abierta', desc: 'Los críticos de Disparo Apuntado sangran un 50 % extra en 6 s.',
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || !hit.crit || hit.proc || hit.dot || !e?.alive) return;
        const T = tune().herida;
        const tv = p.tv || {};
        const total = hit.raw * T.pct / 100 * Math.max(0, 1 + ((tv.dotPct || 0) + (tv.bleedPct || 0)) / 100);
        g.applyDoT?.(e, total, T.dur, 1, 'txt', 'a_t_apuntado:bleed');
      },
    },
    // x1 Punto Débil: Disparo Apuntado marca a élites y jefes 8 s (+15 % de crítico contra ellos).
    // x2 Herida Expuesta (tv.weakCritDmg): +X puntos de daño crítico (saco aditivo) contra el marcado.
    f_weakspot: {
      name: 'Punto Débil', desc: 'Disparo Apuntado marca a élites y jefes 8 s: +15 % de probabilidad de crítico contra ellos.',
      onHit(g, p, e, hit) {
        if (!e || hit?.proc || hit?.dot) return;
        if (hit.skill === 'a_t_apuntado' && e.alive && isEliteish(e)) {
          const fresh = !weak(p, e);
          e._weakspotUntil = now(p) + tune().weakspot.dur;
          e.weakspotBy = p;                              // el grupo (cooperativo) lo lee del enemigo
          if (fresh) g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 0.9), '¡PUNTO DÉBIL!', 'txt-crit');
        }
        // Herida Expuesta: el crítico ya salió; se suma la parte de +X puntos del saco aditivo
        const w = p.tv?.weakCritDmg || 0;
        if (w > 0 && hit.crit && weak(p, e) && e.alive && hit.raw > 0) {
          const A = 100 + (p.stats?.dmgPct || 0) + (p.stats?.critDmg || 0);
          dealProcDamage(g, e, hit.raw * w / A, { source: 'power:f_weakspot' });
        }
      },
      condCrit(p, e) { return weak(p, e) ? tune().weakspot.crit : 0; },
    },
    // x3 Disparo Imposible: con Concentración 100, Disparo Apuntado sale dos veces y el
    // segundo es crítico seguro (lo dispara el comportamiento; aquí se decide al lanzar)
    f_impossible: {
      name: 'Disparo Imposible', desc: 'Con la Concentración al 100 %, Disparo Apuntado se dispara dos veces y el segundo es crítico seguro.',
      priority: 5,                                     // antes de que Aliento del Cazador gaste 50
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_t_apuntado' && focus(p) >= 100 - 1e-6) cast.impossible = true;
      },
    },

    // ---------------- Montaraz ----------------
    // s4 Cepo Doble: Trampa de Cepo gana una 2.ª carga (la lee el comportamiento: trapCharges).
    m_cepo_doble: {
      name: 'Cepo Doble', desc: 'Trampa de Cepo gana una 2.ª carga.',
    },
    // s10 Lazo Corredizo: Flecha Perforante inmoviliza 0,5 s/rango al PRIMER enemigo que toca.
    m_lazo: {
      name: 'Lazo Corredizo', desc: 'Flecha Perforante inmoviliza al primer enemigo que toca.',
      state: () => ({ armed: false }),
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'flecha_perforante') powerState(p, 'm_lazo').armed = true;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'flecha_perforante' || hit.proc || hit.dot) return;
        const st = powerState(p, 'm_lazo');
        if (!st.armed) return;
        st.armed = false;
        const r = Math.max(1, nodeRank(p, 'montaraz', 's10'));
        if (e?.alive) e.applyCC?.('root', tune().lazo.rootPerRank * r, { src: p });
      },
    },
    // s6A Cepo de Hierro: a los jefes los ralentiza un 50 % (el «+1 s» es su mod.rootAdd)
    m_cepo_hierro: {
      name: 'Cepo de Hierro', desc: 'Trampa de Cepo ralentiza un 50 % a los jefes.',
      modifyResolve(p, sk, prof) { if (sk.id === 'a_t_cepo') prof.bossSlowPct = tune().cepo.ironBossSlow; },
    },
    // s6B Mina de Espinas: la trampa estalla en 3 m (su mod.radius +100 %) con el 120 % del
    // arma y no inmoviliza (el coeficiente de la explosión lo pone el comportamiento a_t_cepo)
    m_mina: {
      name: 'Mina de Espinas', desc: 'Trampa de Cepo estalla en 3 m con el 120 % del arma, pero no inmoviliza.',
      modifyResolve(p, sk, prof) { if (sk.id === 'a_t_cepo') prof.mine = true; },
    },
    // s13B Guardabosques: las trampas armadas curan un 3 %/s a los aliados encima (campo a_cepo).
    m_warden: {
      name: 'Guardabosques', desc: 'Tus trampas armadas curan un 3 % de vida por segundo a los aliados que estén encima.',
    },
    // s14 Coto Cerrado: 1 trampa armada más (4) y +30 % de radio de activación.
    m_extratrap: {
      name: 'Coto Cerrado', desc: 'Puedes armar 1 trampa más (hasta 4) y su radio de activación crece un 30 %.',
      stats: () => ({ 'gaugeMax:coto': 1 }),
    },
    // s3 Abrojos: la Lluvia de Flechas deja abrojos (2 s/rango) que ralentizan un 30 %.
    // La Estela que el núcleo crea por mod.zone daña y no ralentiza: se sustituye por a_abrojos.
    m_abrojos: {
      name: 'Abrojos', desc: 'Lluvia de Flechas deja abrojos que ralentizan un 30 %.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'lluvia_flechas' || !cast.target) return;
        const prof = cast.prof;
        for (const f of g.fields || [])
          if (!f.dead && f.kind === 'estela' && f.owner === p && f.data?.skill === 'lluvia_flechas' && f.t > (f.dur || 0) - 0.05) {
            if (g._expireField) g._expireField(f); else f.t = 0;
          }
        g.spawnField?.('a_abrojos', { pos: cast.target.clone ? cast.target.clone() : cast.target, radius: prof.radius || 3,
          dur: prof.zoneDur || 2, owner: p, data: { slowPct: prof.slowPct || 30 } });
      },
    },
    // s11 Ponzoña Lenta: el Veneno ralentiza un 10 % (el «+1,5 s» es su tv.dotDur)
    m_ponzona: {
      name: 'Ponzoña Lenta', desc: 'Tu Veneno ralentiza un 10 %.',
      procs: true,                                     // reacciona a los tics de Veneno
      onHit(g, p, e, hit) {
        if (!hit?.dot || !e?.alive || !/:poison$/.test(hit.source || '')) return;
        const T = tune().ponzona;
        e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
      },
    },
    // x1 Red de Espinas: las trampas armadas a ≤ 10 m se unen; quien cruza la red queda
    // ralentizado un 50 % y sangra. x2 Zarzal (tv.webDmg): X % de tu golpe medio por segundo.
    m_thornweb: {
      name: 'Red de Espinas', desc: 'Tus trampas armadas a menos de 10 m se unen con una red de espinas que ralentiza un 50 % y hace sangrar.',
      state: () => ({ acc: 0, vfx: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'm_thornweb');
        const T = tune().web;
        st.acc += dt; st.vfx += dt;
        if (st.acc < T.pulse - 1e-9) return;
        st.acc = 0;
        const traps = armedTraps(g, p);
        if (traps.length < 2) return;
        const segs = [];
        for (let i = 0; i < traps.length; i++) for (let j = i + 1; j < traps.length; j++) {
          const a = traps[i].pos, b = traps[j].pos;
          if (Math.hypot(a.x - b.x, a.z - b.z) <= T.link) segs.push([a, b]);
        }
        if (!segs.length) return;
        if (st.vfx >= T.vfx) {
          st.vfx = 0;
          for (const [a, b] of segs) g.spawnBeam?.(v3(a.x, a.z, 0.3), v3(b.x, b.z, 0.3), 0x7a9a3a, T.vfx);
        }
        const webDmg = p.tv?.webDmg || 0;
        const great = hasPower(p, 'm_greathunt');
        const preyE = gaugeState(p, 'coto')?.prey || null;
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          const r = T.width + 0.3 * (e.def?.scale || 1);
          if (!segs.some(([a, b]) => segDist2(e.pos.x, e.pos.z, a, b) <= r * r)) continue;
          e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
          if (!g.hasDoT?.(e, 'm_thornweb:bleed')) {
            const d = dotOf(p, 'bleed', p.avgHit(T.bleedCoef) * 0.6, 3);
            g.applyDoT?.(e, d.total, d.ticks, 1, 'txt', 'm_thornweb:bleed');
          }
          if (webDmg > 0 && now(p) - (e._webAt ?? -9) >= 1 - 1e-6) {
            e._webAt = now(p);
            dealProcDamage(g, e, p.avgHit(1) * webDmg / 100, { source: 'power:m_thornweb' });
          }
          if (great && e.alive && e === preyE && e.prey) greatHunt(g, p, e);
        }
      },
    },
    // x3 Gran Cacería: si la Presa queda atrapada en la red, todas las trampas se rearman y el
    // grupo gana +15 % de daño 6 s (una vez por Presa; lo dispara m_thornweb).
    m_greathunt: {
      name: 'Gran Cacería', desc: 'Si tu Presa queda atrapada en la red, todas las trampas se rearman y el grupo gana +15 % de daño durante 6 s.',
    },

    // ---------------- Tiradora Veloz ----------------
    // s4 Andanada Impulsiva: Andanada da 20 de Impulso.
    t_andanada_impulsiva: {
      name: 'Andanada Impulsiva', desc: 'Andanada te da 20 de Impulso.',
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_t_andanada') gainGauge(p, 'impulso', tune().andanada.impulso);
      },
    },
    // s6A Flechas Rebotadoras (Paso 2e; antes mod.chain: solo rebotaba la PRIMERA flecha de cada
    // lanzamiento): cada flecha de Flecha Múltiple que impacta rebota a 5 enemigos cercanos, la
    // primera con el 180 % de su golpe (el rebote del núcleo pierde un 25 % por salto)
    t_rebote: {
      name: 'Flechas Rebotadoras', desc: 'Cada flecha de Flecha Múltiple que impacta rebota a 5 enemigos cercanos (la primera con el 180 %).',
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'flecha_multiple' || hit.proc || hit.dot || !e || !(hit.dealt > 0)) return;
        const R = tune().rebote;
        g.spawnChainBounce?.(e, Math.round(hit.dealt * R.first / 0.75), R.jumps, [], 0x66d7c7);
      },
    },
    // s6B Corona de Flechas: Flecha Múltiple sale en 360° (las +4 flechas y el −30 % son su mod)
    t_corona: {
      name: 'Corona de Flechas', desc: 'Flecha Múltiple sale en 360°.',
      priority: -10,                                   // modifyResolve: después de sumar proyectiles
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'flecha_multiple') return;
        const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
        prof.spread = Math.PI * (n - 1) / n;            // n flechas repartidas en la vuelta entera
      },
    },
    // s5 Viento de Cola: +5 %/rango de vel. de ataque mientras dura Agilidad (el +1 s/rango
    // es su mod.agilidad.durS)
    t_viento_cola: {
      name: 'Viento de Cola', desc: 'Mientras dura Agilidad, ganas +5 % de velocidad de ataque por rango.',
      stats(p) {
        if (!p.buffs?.some(b => b.id === 'agilidad')) return {};
        return { aspdPct: tune().vientoCola.aspdPerRank * Math.max(1, nodeRank(p, 'tiradora', 's5')) };
      },
    },
    // s13B Estela de Viento: durante el Vendaval dejas una estela que acelera un 15 % a los aliados.
    t_slipstream: {
      name: 'Estela de Viento', desc: 'Durante el Vendaval dejas una estela que acelera un 15 % a los aliados.',
      state: () => ({ acc: 9 }),
      onTick(g, p, dt) {
        const st = powerState(p, 't_slipstream');
        const T = tune().slip;
        st.acc += dt;
        if (!((gaugeState(p, 'impulso')?.galeT || 0) > 0) || !partyOf(g, p).length) return;
        if (st.acc < T.every - 1e-9) return;
        st.acc = 0;
        g.spawnField?.('a_estela_viento', { pos: p.pos.clone().setY(0), radius: T.radius, dur: T.dur, owner: p, data: { spdPct: T.spdPct } });
      },
    },
    // s14 Vendaval Perpetuo: durante el Vendaval cada muerte lo alarga 0,5 s (hasta +6 s).
    // (s11 Segundo Aliento es tv.galeHeal + tv.galeEnergy: lo aplica el núcleo al llenar el Impulso)
    t_galechain: {
      name: 'Vendaval Perpetuo', desc: 'Durante el Vendaval, cada enemigo abatido alarga su duración 0,5 s (hasta +6 s).',
      state: () => ({ ext: 0 }),
      onGauge(g, p, id, ev) {
        if (id === 'impulso' && ev === 'full') powerState(p, 't_galechain').ext = 0;
      },
      onKill(g, p) {
        const gs = gaugeState(p, 'impulso');
        const st = powerState(p, 't_galechain');
        const T = tune().galechain;
        if (!(gs?.galeT > 0) || st.ext >= T.max - 1e-9) return;
        const add = Math.min(T.perKill, T.max - st.ext);
        gs.galeT += add;
        st.ext += add;
        const b = p.buffs?.find(x => x.id === 't_vendaval');
        if (b) { b.t += add; b.dur += add; }
      },
    },
    // x1 Ráfaga Infinita: cada 10 disparos, el siguiente no cuesta Energía y lanza el doble de
    // proyectiles. x2 Huracán (tv.infiniteDmg): +X % de daño y +2X de Impulso en ese disparo.
    t_infinite: {
      name: 'Ráfaga Infinita', desc: 'Cada 10 disparos, el siguiente no cuesta Energía y lanza el doble de proyectiles en un abanico el doble de ancho.',
      priority: -5,                                    // después de multidisparo/Vendaval, antes de la Corona
      state: () => ({ shots: 0, ready: false }),
      modifyResolve(p, sk, prof) {
        const st = powerState(p, 't_infinite');
        if (!st.ready || !prof.tags?.has?.('proj')) return;
        const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
        prof.proj = (prof.proj || 0) + n;               // el doble de proyectiles
        if (prof.spread > 0) prof.spread *= 2;           // Paso 2e: en un abanico el doble de ancho (contra un jefe no es un escopetazo)
        prof.cost = 0;
        prof.addPct = (prof.addPct || 0) + (p.tv?.infiniteDmg || 0);
        prof.infinite = true;
      },
      // ⑦ las habilidades de proyectil y el básico de ARMA (cast.weapon: cuenta siempre y,
      // si la Ráfaga está lista, ese disparo la consume, como en 2c.1)
      onCast(g, p, cast) {
        if (cast?.weapon) infiniteShot(g, p, powerState(p, 't_infinite').ready);
        else if (cast?.prof?.tags?.has?.('proj')) infiniteShot(g, p, !!cast.prof.infinite);
      },
    },
    // x3 Ojo del Huracán: durante el Vendaval, Ráfaga Infinita cada 5 disparos (la lee t_infinite)
    t_eyestorm: {
      name: 'Ojo del Huracán', desc: 'Durante el Vendaval, Ráfaga Infinita se activa cada 5 disparos en lugar de 10.',
    },
  };
}

// ---------- Barrido de Caza (c16B) ----------
// enemigos distintos golpeados en los últimos 2 s → +3 % de velocidad de ataque cada uno (hasta 5);
// el buff solo se rehace (recompute) cuando cambia la cuenta
function sweepRefresh(p, fromHit) {
  const st = powerState(p, 'a_barrido'), T = tune().cls.barrido, t = now(p);
  for (const [e, at] of [...st.seen]) if (t - at > T.win + 1e-9 || !e.alive) st.seen.delete(e);
  const n = Math.min(T.max, st.seen.size);
  if (n === st.n) {
    const b = fromHit && n > 0 ? p.buffs?.find(x => x.id === 'a_barrido') : null;
    if (b) b.t = Math.max(b.t, T.win);
    return;
  }
  st.n = n;
  if (n > 0) p.addBuff?.('a_barrido', { aspdPct: T.pct * n }, T.win, { name: 'Barrido de Caza', icon: '🏹', desc: `+${T.pct * n}% de velocidad de ataque` });
  else if (p.buffs?.some(b => b.id === 'a_barrido')) { p.buffs = p.buffs.filter(b => b.id !== 'a_barrido'); p.recompute?.(); }
}

// ---------- Camuflaje (c11A) ----------
// a_t_camuflaje te hace invisible DE VERDAD (p.goInvisible: Enemy.update pierde el objetivo
// y no adquiere uno nuevo); el poder a_camuflaje guarda { active, crit }: al acabar sola la
// invisibilidad queda «cebado» el crítico; un ataque con daño (también el básico de arma)
// la rompe (p.reveal) y es crítico seguro (cast.forceCrit).
function endCamo(p, st, primed) {
  st.active = false;
  st.crit = !!primed;
  if (p.buffs?.some(b => b.id === 'a_t_camuflaje')) p.buffs = p.buffs.filter(b => b.id !== 'a_t_camuflaje');
}

// ------------------------------------------------------------
// helpers de las especializaciones (v1 de 2c; los rehacen los trabajos 2 y 3)
// ------------------------------------------------------------
// rango de un nodo v1: árbol 'cls' o id de especialización (solo la ACTIVA)
function nodeRank(p, tree, id) {
  const T = p?.talents;
  if (!T) return 0;
  if (tree === 'cls') return T.cls?.[id] | 0;
  if (p.talentAgg?.spec !== tree) return 0;
  if (id === 's0') return 1;
  return T.sp?.[tree]?.[id] | 0;
}
// renueva (o crea) un buff corto a un aliado (auras/campos)
function refreshBuff(a, id, stats, keep, meta = {}) {
  const b = a?.buffs?.find?.(x => x.id === id);
  if (b) { b.t = Math.max(b.t, keep); b.dur = Math.max(b.dur || 0, keep); return; }
  a?.addBuff?.(id, { ...stats }, keep, meta);
}
// los aliados SIN el héroe (poderes «de grupo»: en solitario no hacen nada)
function partyOf(g, p, pos = null, r = Infinity) {
  return (g?.allies ? g.allies(pos, r) : []).filter(a => a && a !== p);
}
// dirección del héroe hacia `target` (o su orientación)
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) { dx = Math.sin(p.group?.rotation?.y || 0); dz = Math.cos(p.group?.rotation?.y || 0); }
  else { dx /= l; dz /= l; }
  return { x: dx, z: dz };
}
// destino «hacia atrás» (contrario a la mira), recortado a lo transitable
function backDest(g, p, target, dist) {
  const d = aimDir(p, target);
  const want = p.pos.clone(); want.x -= d.x * dist; want.z -= d.z * dist; want.y = 0;
  return g.clampWalkable ? g.clampWalkable(p.pos, want, dist) : want;
}
// desplazamiento por pasos del planificador (como Paso Veloz): sin invulnerabilidad
function slide(g, p, dest, dur, { trail = null, onDone = null } = {}) {
  const from = p.pos.clone();
  const steps = 6, dt = Math.max(0.02, dur) / steps;
  let i = 0;
  const step = () => {
    if (!p.alive) { onDone?.(); return; }
    i++;
    const k = i / steps;
    p.pos.x = from.x + (dest.x - from.x) * k;
    p.pos.z = from.z + (dest.z - from.z) * k;
    if (trail && i % 2) g.emitFx?.(trail, p.pos.clone().setY(0.4));
    if (i < steps) g.timers.schedule(dt, step);
    else onDone?.();
  };
  g.timers.schedule(dt, step);
}
// abanico de proyectiles del perfil (g.fireProjectile: crítico, ctx.hit, robo…).
// Devuelve el tiempo de vuelo (para cerrar el lanzamiento con cast.done).
function shootFan(g, p, prof, cast, { ctx = cast.ctx, n = null, spread = 0, angle = null, range = null, size = 0.1, onEnemy = null, beam = false } = {}) {
  const sk = cast.sk;
  const tgt = cast.target || p.pos;
  const base = angle ?? Math.atan2(tgt.x - p.pos.x, tgt.z - p.pos.z);
  const count = Math.max(1, n ?? ((prof.count || 1) + (prof.proj || 0)));
  const castHits = count > 1 && (sk.count || 1) <= 1 ? new Set() : null;   // sin escopetazo
  const R = range ?? (prof.range || sk.range || 10);
  p.faceToward?.(v3(p.pos.x + Math.sin(base), p.pos.z + Math.cos(base)));
  p.swing = 1;
  const muzzle = p.pos.clone().setY(1.0);
  muzzle.x += Math.sin(base) * 0.5; muzzle.z += Math.cos(base) * 0.5;
  if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, muzzle);
  else if (ctx.fx?.trail) g.emitFx?.(ctx.fx.trail, muzzle);
  for (let i = 0; i < count; i++)
    g.fireProjectile(ctx, { angle: base + projFanOffset(i, count, spread), range: R, size, castHits, onEnemy });
  if (beam) {
    const end = p.pos.clone().setY(1.0);
    end.x += Math.sin(base) * R; end.z += Math.cos(base) * R;
    g.spawnBeam?.(muzzle, end, ctx.color || sk.color || 0xffee66, 0.3);
  }
  ctx.lifestealDone = true;
  return R / Math.max(1, prof.speed || 14) + 0.05;
}
// total y tics de un DoT con el perfil de talentos (dotPct + <tipo>Pct, dotDur añade tics)
function dotOf(p, kind, base, dur) {
  const tv = p?.tv || {};
  const pct = (tv.dotPct || 0) + (tv[kind + 'Pct'] || 0);
  const ticks = Math.max(1, Math.round(dur + (tv.dotDur || 0)));
  return { total: base * Math.max(0, 1 + pct / 100) * ticks / dur, ticks };
}
// distancia² de un punto a un segmento (red de espinas)
function segDist2(px, pz, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const L = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / L));
  const qx = a.x + dx * t - px, qz = a.z + dz * t - pz;
  return qx * qx + qz * qz;
}
// decal de suelo de un campo (anillo o disco); libera al morir
function groundDecal(g, f, { inner = 0.6, opacity = 0.45, color = 0xffffff, disc = false, segs = 32 } = {}) {
  if (f.dead) {
    if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; }
    return null;
  }
  if (!f.decal) {
    const geo = disc ? new THREE.CircleGeometry(f.radius, segs) : new THREE.RingGeometry(f.radius * inner, f.radius, segs);
    const decal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    decal.rotation.x = -Math.PI / 2;
    decal.position.set(f.pos.x, 0.06, f.pos.z);
    g.fxGroup.add(decal);
    f.decal = decal;
  }
  return f.decal;
}
// ---------- Trampa de Cepo v1: trampas armadas (las cargas son del motor: D2) ----------
function extraTrap(p) { return hasPower(p, 'm_extratrap'); }
function wardenOn(p) { return hasPower(p, 'm_warden'); }
function armedTraps(g, p) {
  return (g?.fields || []).filter(f => !f.dead && !f.sprung && f.owner === p && f.kind === 'a_cepo');
}
// salta la trampa: inmoviliza (o estalla si es Mina), envenena y desaparece
function springTrap(g, f, e) {
  const p = f.owner, d = f.data;
  f.sprung = true;
  d.trap = false;                      // ya no cuenta como armada (Coto de Caza)
  const at = v3(f.pos.x, f.pos.z);
  if (d.mine) {
    g.dealArea?.(at, d.blastR, d.blastCoef, d.areaOpts);
    g.addShake?.(0.15);
    g.emitFx?.('arqThornBurst', at.clone().setY(0.4));
  } else if (e?.alive) {
    e.applyCC?.('root', d.root, { src: p });
    // Cepo de Hierro (prof.bossSlowPct): a los jefes los ralentiza un 50 % (applyCC aplica
    // ×0,5 a la ralentización de los jefes, de ahí el ×2)
    if (d.bossSlow && isBoss(e)) e.applyCC?.('slow', d.root, { pct: 2 * d.bossSlow, src: p });
  }
  if (e?.alive && d.poison?.total > 0) g.applyDoT?.(e, d.poison.total, d.poison.ticks, 1, 'txt', `${d.skill}:poison`);
  g.spawnRing?.(at, f.radius, d.color);
  g.emitFx?.('arqTrapSnap', at.clone().setY(0.3));
  g.sfx?.('trap');
  f.t = 0;
}
// ---------- Punto Débil v1 ----------
function weak(p, e) { return !!e && (e._weakspotUntil || 0) > now(p); }
// ---------- Gran Cacería v1 ----------
function greatHunt(g, p, e) {
  const st = powerState(p, 'm_greathunt');
  if (st.prey === e) return false;                   // una vez por Presa
  st.prey = e;
  g.reduceCooldown?.(p, 'a_t_cepo', Infinity);      // D2: todas las trampas listas
  const T = tune().greathunt;
  for (const a of g.allies ? g.allies() : [p])
    a.addBuff?.('m_greathunt', { dmgPct: T.dmgPct }, T.dur, { name: 'Gran Cacería', icon: '🏹', desc: `+${T.dmgPct}% de daño` });
  g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 1), '¡GRAN CACERÍA!', 'txt-crit');
  g.sfx?.('levelup');
  return true;
}
// ---------- Ráfaga Infinita v1 ----------
function infiniteShot(g, p, wasInfinite) {
  const st = powerState(p, 't_infinite');
  const T = tune().infinite;
  if (wasInfinite && st.ready) {
    st.ready = false;
    invalidate(p);
    const n = 2 * (p.tv?.infiniteDmg || 0);     // Huracán (x2): +10 de Impulso/rango (el doble del % de daño, 2e)
    if (n > 0) gainGauge(p, 'impulso', n);
    return;
  }
  st.shots = (st.shots || 0) + 1;
  const gale = (gaugeState(p, 'impulso')?.galeT || 0) > 0;
  const every = hasPower(p, 't_eyestorm') && gale ? T.storm : T.every;
  if (st.shots >= every) {
    st.shots = 0;
    st.ready = true;
    invalidate(p);
    g?.ui?.spawnText?.(p.pos, '¡RÁFAGA INFINITA!', 'txt-crit');
  }
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento y del kit v1
// ============================================================
export function arqueraSkillBehaviors() {
  return {
    // c22A Flecha Bengala: bengala de 10 m 10 s: los enemigos dentro reciben +15 % de daño de
    // todo el grupo (Debilidad) y pegan un 15 % menos; también revela a los invisibles
    a_t_bengala: {
      name: 'Flecha Bengala',
      params: ['weakPct', 'weakenPct', 'reveal'],
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const T = tune().bengala;
        const at = (cast.target || p.pos).clone(); at.y = 0;
        p.faceToward?.(at);
        g.spawnBeam?.(p.pos.clone().setY(1.0), at.clone().setY(2.5), ctx.color || 0xffcc55, 0.3);
        const f = g.spawnField?.('a_bengala', { pos: at, radius: prof.radius || sk.radius || 10, dur: prof.dur || sk.dur || 10, owner: p,
          data: { weakPct: sk.weakPct ?? T.weakPct, weakenPct: sk.weakenPct ?? T.weakenPct, color: sk.color || 0xffcc55 } });
        if (f) arqueraFieldsCache().a_bengala.tick(g, f, 0);   // primer pulso al instante
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(2.5));
        ctx.zoneCenter = at; ctx.zoneRad = prof.radius || 10;
        return ctx.res;
      },
    },
    // c11A Camuflaje: invisible 4 s DE VERDAD (p.goInvisible: los enemigos pierden el objetivo
    // y no adquieren uno nuevo) y Paso Veloz se recarga. El crítico del primer ataque (desde la
    // invisibilidad o al salir) lo pone el poder a_camuflaje por ⑦ onCast.
    a_t_camuflaje: {
      name: 'Camuflaje',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 4;
        p.goInvisible(dur);
        const st = powerState(p, 'a_camuflaje');
        st.active = true;
        st.crit = false;
        g.reduceCooldown?.(p, 'a_paso', Infinity);
        p.addBuff(sk.id, {}, dur, { name: sk.name, icon: sk.icon, desc: 'Invisible: los enemigos te pierden; tu primer disparo será crítico' });
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, p.pos.clone().setY(1.0));
        return ctx.res;
      },
    },
    // ---- kit de especialización v1 (los rehace KA1 con los verbos genéricos de §3.6) ----
    // F s0 Disparo Apuntado: saeta perforante (la carga de 1 s es el windup del núcleo).
    // Disparo Imposible (x3): con cast.impossible sale una segunda saeta de crítico seguro.
    a_t_apuntado: {
      name: 'Disparo Apuntado',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        let wait = shootFan(g, p, prof, cast, { size: 0.16, beam: !!sk.beam });
        if (cast.impossible) {
          const c2 = { ...ctx, hitInfo: { ...ctx.hitInfo, forceCrit: true }, _chained: false };
          const gap = tune().impossible.gap;
          g.timers.schedule(gap, () => {
            if (!p.alive) return;
            shootFan(g, p, prof, cast, { ctx: c2, size: 0.18, beam: true });
            g.ui?.spawnText?.(p.pos, '¡DISPARO IMPOSIBLE!', 'txt-crit');
          });
          wait += gap;
        }
        g.timers.schedule(wait, () => cast.done(ctx.res));
        return undefined;
      },
    },
    // M s0 Trampa de Cepo: hasta 3 armadas (4 con Coto Cerrado, +30 % de radio). Inmoviliza
    // prof.root (2 s + los mod.rootAdd de Cepo de Hierro y Raíces Profundas) y envenena 150 % en
    // 5 s. prof.bossSlowPct (Cepo de Hierro): ralentiza a los jefes. prof.mine (Mina de Espinas):
    // estalla 120 % en 3 m, sin inmovilizar. D2: las cargas son del motor (`charges` en la
    // definición y p.skCharges): este comportamiento solo arma la trampa.
    a_t_cepo: {
      name: 'Trampa de Cepo',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const T = tune().cepo;
        // trampas armadas: al pasar del máximo cae la más vieja
        const maxArmed = T.maxArmed + (extraTrap(p) ? 1 : 0);
        const armed = armedTraps(g, p);
        while (armed.length >= maxArmed) {
          const old = armed.shift();
          if (g._expireField) g._expireField(old); else old.t = 0;
        }
        const mine = !!prof.mine;
        const baseMul = mine ? Math.max(0.2, (prof.radiusMul || 2) - 1) : (prof.radiusMul || 1);   // Mina: radius +100 = solo la explosión
        const trigR = (sk.radius || 1.5) * baseMul * (extraTrap(p) ? 1 + T.extraR : 1);
        const root = (prof.root || sk.root || 2) * (prof.durMul || 1);
        const poison = dotOf(p, 'poison', ctx.avgHit, sk.dotDur || T.poisonDur);
        const at = (cast.target || p.pos).clone(); at.y = 0;
        const color = ctx.color || sk.color || 0x86d47a;
        g.spawnField?.('a_cepo', { pos: at, radius: trigR, dur: sk.armT || 30, owner: p,
          data: { trap: true, skill: sk.id, color, root, mine, bossSlow: prof.bossSlowPct || 0, poison,
            blastR: prof.radius || 3, blastCoef: T.mineCoef * rankCoef(prof.rank),
            areaOpts: { addPct: prof.addPct, critBonus: prof.critBonus, color, hitInfo: ctx.hitInfo } } });
        p.faceToward?.(at);
        if (ctx.fx?.aura) g.emitFx?.(ctx.fx.aura, at.clone().setY(0.3));
        g.spawnRing?.(at, trigR, color);
        ctx.zoneCenter = at; ctx.zoneRad = trigR;
        return ctx.res;
      },
    },
    // T s0 Andanada: 12 flechas en 120° (60 % cada una) mientras retrocedes 3 m
    a_t_andanada: {
      name: 'Andanada',
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const fly = shootFan(g, p, prof, cast, { spread: prof.spread || sk.spread || 1.047, size: 0.09 });
        const dest = backDest(g, p, cast.target, sk.backstep || 3);
        slide(g, p, dest, sk.lockT || 0.35, { trail: ctx.fx?.trail });
        g.timers.schedule(Math.max(fly, sk.lockT || 0.35), () => cast.done(ctx.res));
        return undefined;
      },
    },
  };
}

// ============================================================
// CAMPOS DE SUELO propios (tope por dueño: FIELD_CAP_PER_OWNER = 12, FIFO del núcleo)
// ============================================================
// eslint-disable-next-line no-var
var FIELDS_CACHE;
function arqueraFieldsCache() { return FIELDS_CACHE || (FIELDS_CACHE = buildFields()); }
export function arqueraFields() { return arqueraFieldsCache(); }

function buildFields() {
  return {
    // Flecha Bengala (c22A): los enemigos dentro reciben +weakPct % de daño de todo el grupo
    // (Debilidad), pegan un weakenPct % menos y quedan revelados (se renueva cada 0,5 s)
    a_bengala: {
      name: 'Flecha Bengala',
      init(f) { f.acc = 0; },
      tick(g, f, dt) {
        f.acc += dt;
        if (dt > 0 && f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesInField(g, f)) {
          e.applyWeakness?.('a_t_bengala', f.data.weakPct, 0.65);
          e.weakenOutgoing?.('a_t_bengala', f.data.weakenPct, 0.65);
          e.revealedT = 0.6;
        }
      },
      render(g, f) {
        const d = groundDecal(g, f, { inner: 0.94, opacity: 0.35, color: f.data.color });
        if (d) d.material.opacity = 0.25 + 0.12 * Math.abs(Math.sin(f.t * 4));
      },
    },
    // Bomba de Humo (Paso 2e): ciega a los enemigos dentro: −pct % de daño mientras estén en el humo
    a_humo_ciego: {
      name: 'Humo cegador',
      init(f) { f.acc = 0.25; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.25 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesInField(g, f)) e.weakenOutgoing?.('a_humo', f.data.pct, 0.4);
      },
    },
    // Trampa de Cepo armada (data.trap: cuenta para el Coto de Caza). Salta con el primer
    // enemigo; con Guardabosques cura un 3 %/s a los aliados encima.
    a_cepo: {
      name: 'Trampa de Cepo',
      init(f) { f.acc = 0; f.data.color = f.data.color ?? 0x86d47a; },
      onEnter(g, f, e) { if (!f.dead && !f.sprung) springTrap(g, f, e); },
      tick(g, f, dt) {
        if (f.sprung) return;
        f.acc += dt;
        const T = tune().warden;
        if (f.acc < T.pulse - 1e-9) return;
        const step = f.acc; f.acc = 0;
        const p = f.owner;
        if (!p || !wardenOn(p)) return;
        // 3 %/s de la vida de CADA aliado encima de la trampa (curación de habilidad)
        g.heal?.(a => (a.stats?.maxHP || 0) * T.pctPerSec / 100 * step,
          { target: 'all', pos: v3(f.pos.x, f.pos.z), radius: f.radius, src: 'm_warden' });
      },
      render(g, f) {
        const d = groundDecal(g, f, { inner: 0.55, opacity: 0.55, color: f.data.color });
        if (d) d.material.opacity = 0.4 + 0.15 * Math.abs(Math.sin(f.t * 3));
      },
    },
    // Abrojos (Montaraz s3): ralentizan un 30 % a quien esté dentro
    a_abrojos: {
      name: 'Abrojos',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesInField(g, f)) e.applyCC?.('slow', 0.7, { pct: f.data.slowPct || 30, src: f.owner });
      },
      render(g, f) { groundDecal(g, f, { disc: true, opacity: 0.18, color: 0x9a8a5a }); },
    },
    // Estela de Viento (Tiradora s13B): +15 % de velocidad a los ALIADOS dentro (no al dueño)
    a_estela_viento: {
      name: 'Estela de Viento',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const a of partyOf(g, f.owner, v3(f.pos.x, f.pos.z), f.radius))
          refreshBuff(a, 't_slipstream', { spdPct: f.data.spdPct || 15 }, 0.7, { name: 'Estela de Viento', icon: '🌬️' });
      },
      render(g, f) { groundDecal(g, f, { disc: true, opacity: 0.12, color: 0x7fe8d8 }); },
    },
  };
}

export function arqueraGauges() {
  return {};
}
