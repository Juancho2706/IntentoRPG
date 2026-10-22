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
// ── Paso 2g: especializaciones (§7) ─────────────────────────────────────────────
// Un poder por nodo con efecto propio; el del nodo clave lleva la pasiva y la barra vive en
// js/mech-arquera.js (los v1 de 2c se retiraron, §11.1):
//   Tiradora Veloz  t_*  (t_tercera: Tercera Flecha · Impulso y Vendaval)
//   Francotiradora  f_*  (f_cuerda_tensa: Cuerda Tensa · Concentración, Calma Absoluta y Punto Débil)
//   Montaraz        m_*  (m_cebo: Cebo de Caza · Coto, Presa y Batida)
// Campos propios: m_zarzal (zarzales de m6, m14, m21, m24) y m_cerco (Cerco gratis de Bosque Vivo).
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, gaugeValue, gaugeState, gaugeTuning } from './spec-mechanics.js';
import { projFanOffset } from './skill-defs.js';
import { enemiesInField, fieldArmed, insideField, defineTrapSkin } from './field-entities.js';
import { spendResource } from './resources.js';
import { rankCoef, chargeFullAt } from './combat-math.js';
import { cotoAddPrey, cotoPreys } from './mech-arquera.js';
import { ARQUERA_TALENTS } from './talents-arquera.js';
import { talentArtPath } from './talent-art.js';

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
      bocajarro: { near: 5, pct: 15, knock: 1, delay: 0.15 },    // c6A (empujón al acabar la descarga)
      lejano: { far: 10, pct: 20 },                              // c6B
      diamante: { pct: 40 },                                     // c9B
      roma: { slowPct: 50, slowT: 4 },                           // c10A (icd 8 s)
      silbante: { silence: 3 },                                  // c10B (icd 10 s)
      abrojos: { radius: 2.5, dur: 3, slowPct: 50, slowT: 0.6, color: 0x9a8a5a },   // c14A (pulsos de 0,5 s: sin huecos y sin cobrar Quebranto de más)
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
    // ralentización mantenida (zarzal, Corazón del Bosque 1): dura 1,25 s y se renueva cuando le
    // quedan menos de 0,2 s (un tic de 10 Hz más el fotograma en que se aplica: sin huecos), así el
    // Quebranto a un jefe es ~1,1 veces el de una ralentización continua (holdSlow)
    lento: { dur: 1.25, left: 0.2, every: 0.1 },
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
      guard: { below: 0.4, dur: 4, every: 60 },
      sky: { every: 30, dur: 4, gap: 1 }, color: 0xb98a55,
    }),
    // ---- Tiradora Veloz (§7.0)
    tir: Object.freeze({
      triple: { every: 3, count: 2, spread: 0.262, wideCount: 4, wideSpread: 0.524, coef: 0.6 },   // v0 (30°) · v8A (60°)
      remate: { icd: 4 },                                        // v5
      soltar: { mult: 0.6 },                                     // v6
      clavado: { pct: 20 },                                      // v8B
      instante: { win: 0.5, pct: 40, impulso: 20 },              // v9A
      idaVuelta: { third: 0.7 },                                 // v9B
      rueda: { every: 1, n: 8, coef: 0.6 },                      // v10A
      blanco: { pct: 10, max: 6 },                               // v10B
      salto: { perRank: 8 },                                     // v12
      vacio: { radius: 5, pull: 2, stagger: 15 },                // v14
      brisa: { dr: 20 },                                         // v15A
      retirada: { icd: 8, jump: 4, airT: 0.3, impulso: 15 },     // v15B
      plumas: { over: 50, pctPerRank: 10, ratePerRank: 15 },     // v16
      nube: { first: 6, perRank: 0.4 },                          // v17 (s de Diluvio por segundo de Carrera)
      perdidas: { coef: 0.5, range: 10 },                        // v18
      encadenado: { perRank: 0.5, max: 4 },                      // v19
      fiel: { first: 6, step: 0.4, base: 0.5 },                  // v21
      rafaga: { win: 3 },                                        // v22
      ciclon: { base: 2.5, perRank: 0.5, dur: 4, every: 0.5, coef: 0.28, range: 8, max: 3 },   // v24
      tormenta: { every: 3, base: 3, perRank: 3, coef: 0.6, seek: 3, range: 12 },             // v25
      vaiven: { uses: [1, 2, Infinity], costMul: 0.5 },          // v26
      galerna: { extra: [2, 4, Infinity], cost: 10, ramp: 3 },   // v27 (Energía/s: 10 + 3 por segundo extra)
      ojo: { spdPct: 20, eliteImpulso: 50, max: -20, diluvio: 4 },                            // v28
    }),
    // ---- Francotiradora (§7.1)
    fra: Object.freeze({
      cuerda: { max: 1, perfect: [0.8, 1], addPct: 60, moveMul: 0.6, tensedAt: 0.3, farAt: 10 },  // f0 · f20 (más de 10 m)
      weakDur: 8,                                                // Punto Débil (marca de Tiro Rastreador)
      sobre: { perRank: 10, max: 4 },                            // f4
      mira: { dur: 4 },                                          // f5
      pulso: { widen: 1.5 },                                     // f6
      estela: { delay: 0.5, coef: 0.3, width: 1.5 },             // f8A
      doble: { mult: 0.3 },                                      // f8B
      saltarina: { range: 10 },                                  // f9A
      vital: { pct: 35, stagger: 15 },                           // f9B
      salva: { n: 2, coef: 0.25, range: 12 },                    // f10A
      paciencia: { pct: 15, max: 3 },                            // f10B
      fila: { energy: 4, focus: 5 },                             // f11 (por rango)
      lectura: { perRank: 25 },                                  // f12
      vigia: { perRank: 15 },                                    // f13
      estrella: { cdr: 1.5 },                                    // f14
      nervios: { pct: 8, icd: 6, dur: 6 },                       // f15B
      serenidad: { over: 50, perRank: 10 },                      // f16
      gemelos: { perRank: 0.35 },                                // f17
      rebote: { perRank: 0.1, step: 0.25 },                      // f18
      expuesta: { perRank: 6 },                                  // f19
      firmamento: { rate: 0.2 },                                 // f21
      paralelas: { gap: 1, coef: 0.2 },                          // f22
      heridas: { max: 5, perRank: 2 },                           // f23
      entrenado: { base: 7 },                                    // f24 (cada 7 − rango s)
      mortal: { range: 30, base: 5, perRank: 5, width: 1.5 },    // f25
      imposible: { base: 5, perRank: 10, stagger: 20, delay: 0.15 },   // f26 (icd 1 s)
      atalaya: { dur: [20, 30, Infinity], every: 5, coef: 2, range: 16 },   // f27
      inmovil: { eliteFocus: 50, max: -20, celeste: 5 },         // f28
    }),
    // ---- Montaraz (§7.2)
    mon: Object.freeze({
      cebo: { radius: 6, eliteRadius: 3, boss: false, speedMul: 0.8 },   // m0 (el mismo cebo que Trampa de Cepo)
      atrapada: { icd: 10, coef: 0.6, radius: 2.25 },            // m5
      zarzal: { radius: 2, slowPct: 40, max: 6, color: 0x5f8f3a },        // m6, m14, m21, m24
      cercoPresa: { dur: 4 },                                    // m6
      racimo: { mul: 0.35, gap: 1.3 },                           // m8A
      reforzado: { n: 3, coef: 0.2, every: 0.3, radius: 2.25 },  // m8B
      herida: { weak: 10, stagger: 25 },                         // m9B
      creciente: { perSec: 1, max: 12 },                         // m10A
      asfixia: { perSec: 15, max: 90 },                          // m10B
      metralla: { perRank: 2, coef: 0.2, range: 8 },             // m11
      acoso: { perRank: 15, slowPct: 30, slowT: 3 },             // m12
      semillas: { dur: 4 },                                      // m14
      huida: { below: 0.5, radius: 4, root: 3, icd: 30 },        // m15A
      guarida: { radius: 4, dr: 15 },                            // m15B
      cerrado: { min: 2, perRank: 6 },                           // m16 (+rango s a los zarzales)
      trepadoras: { perRank: 0.5, max: 4, band: 1.2 },           // m17
      rearme: { perRank: 1, gap: 0.3 },                          // m18
      rastro: { range: 10, energy: 10 },                         // m19
      rebrote: { n: 3, dur: 6 },                                 // m21
      sembrado: { mul: 0.35, gap: 1.1, max: 6 },                 // m22
      siembra: { base: 2, perRank: 2 },                          // m24
      arrasada: { mul: 0.3, dist: 3, max: 6 },                   // m25
      caceria: { icd: [12, 9, 6], ring: 2.2, mul: 0.5 },         // m26
      bosque: { icd: 8, base: 1, radius: 7 },                    // m27 (Cerco de rango + 1 s)
      corazon: { slowR: 3, slowPct: 30, every: 12, icd: 90 },    // m28
    }),
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
function takeCubeta(p, pct) {
  const T = tune().cubeta;
  const st = powerState(p, 'arq_cubeta');
  const t = now(p);
  if (st.at == null) { st.at = t; st.v = T.cap; }
  st.v = Math.min(T.cap, st.v + Math.max(0, t - st.at) * T.perSec);
  st.at = t;
  const take = Math.min(pct, st.v);
  if (!(take > 0)) return 0;
  st.v -= take;
  return take;
}
function selfHeal(g, p, pct, src) {
  const take = takeCubeta(p, pct);
  if (!(take > 0)) return 0;
  const amount = (p.stats?.maxHP || 0) * take / 100;
  return g?.heal ? g.heal(amount, { target: 'self', src }) : (p.healSkill?.(amount, src) || 0);
}
// RALENTIZACIÓN MANTENIDA de una zona (`key`: 'zarzal', 'corazon'): mientras el enemigo siga
// dentro, se renueva solo cuando está por acabarse. Enemy.applyCC cobra a un jefe Quebranto por cada
// segundo de ralentización que aplica: renovarla en cada tic (o una vez por cepo) lo cobraba varias veces.
function holdSlow(p, key, e, pct) {
  if (!e?.alive) return false;
  const H = tune().lento, t = now(p);
  const st = powerState(p, 'arq_lento');
  const m = st[key] || (st[key] = new WeakMap());
  if ((m.get(e) ?? -Infinity) - t >= H.left - 1e-9) return false;
  e.applyCC?.('slow', H.dur, { pct, src: p });
  m.set(e, t + H.dur);
  return true;
}
// escudo a ti misma por la misma cubeta (Nervios de Acero)
function selfShield(g, p, pct, dur, src) {
  const take = takeCubeta(p, pct);
  if (!(take > 0)) return 0;
  const amount = (p.stats?.maxHP || 0) * take / 100;
  return g?.shield ? g.shield(amount, { target: 'self', dur, src }) : (p.addShield?.(amount, dur, src) || 0);
}

// REPETICIONES GRATIS (Instinto de Supervivencia, Lluvia en Retirada, Soltar y Disparar, Haces
// Gemelos, Corazón del Bosque): g.castEcho(p, id, { mult, at }) del motor, también si la habilidad no
// está en la barra. Sin coste, enfriamiento ni carga y con su propia serie de repeticiones; `at`
// ({ x, z }) es el punto al que apunta. No repite canalizaciones (devuelve null) y una movilidad
// movería a la heroína: aquí solo se repiten zonas, lluvias, la Andanada (su comportamiento no salta
// en una repetición), los haces y el Cerco.

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
// Cielo de Halcones: cada picado busca a OTRO enemigo (el más cercano que aún no cayó en esta
// tormenta; si ya cayeron todos, cualquiera menos el último)
function skyTarget(g, p) {
  const st = powerState(p, 'y_halcon');
  const seen = st.skySeen || (st.skySeen = new WeakSet());
  const list = foesNear(g, p.pos, tune().hawk.near);
  const e = list.find(o => !seen.has(o)) || list.find(o => o !== st.lastDive) || list[0] || null;
  if (e) seen.add(e);
  return e;
}
// arte del chip de la marca en el marco del objetivo: el del nodo y0, el mismo del panel de talentos
const HAWK_MARK_ART = talentArtPath('arquera', 'h3', 'y0') || 'talents/arquera-clase-c4.webp';
// el marcado recibe +10 % de tus flechas 6 s (Ojo Compartido: 12 s y varios a la vez);
// Presa Señalada: cuenta como tu Presa (Montaraz) o como tu Punto Débil (Francotiradora: weakLeft)
function hawkMark(p, e) {
  const st = powerState(p, 'y_halcon'), tv = p.tv || {};
  if (!st.marks) st.marks = new Map();
  if (!(tv.hawkShared > 0)) for (const o of [...st.marks.keys()]) if (o !== e) hawkUnmark(p, o);
  st.marks.set(e, now(p) + (tv.hawkShared > 0 ? tv.hawkShared : tune().hawk.mark));
  if (tv.hawkPrey > 0 && p.talentAgg?.mechanic === 'coto') e.prey = true;
  // el marco del objetivo la enseña (hud-model: e.uiMarks) mientras siga en el estado del halcón
  (e.uiMarks ||= {}).y_halcon = { id: 'y_halcon', name: 'Marca del Halcón', art: HAWK_MARK_ART,
    get t() { const u = powerState(p, 'y_halcon').marks?.get(e); return u != null ? u - now(p) : 0; } };
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
      // S-arquera (A1/A-x1): el empujón llega al acabar la descarga (T.delay s) y uno por enemigo: las
      // flechas de un mismo abanico (Disparo Disperso, Andanada) que van al mismo enemigo aún lo encuentran
      state: () => ({ pending: new WeakSet() }),
      onHit(g, p, e, hit) {
        const T = tune().cls.bocajarro;
        if (!e?.alive || !arrowHit(hit) || dist(p.pos, e.pos) >= T.near) return;
        const st = powerState(p, 'a_bocajarro');
        if (!g.timers) { e.displace?.(p.pos, T.knock, { src: p }); return; }
        if (st.pending.has(e)) return;
        st.pending.add(e);
        g.timers.schedule(T.delay, () => {
          st.pending.delete(e);
          if (e.alive && p.alive) e.displace?.(p.pos, T.knock, { src: p });
        });
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
        g.timers?.schedule?.(tune().frame, () => { if (p.alive) g.castEcho?.(p, 'a_humo'); });
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
        const f = g.spawnField?.('zona', { pos: p.pos.clone().setY(0), radius: T.radius, dur: T.dur, owner: p,
          data: { dps: 0, slow: T.slowT, slowPct: T.slowPct, color: T.color, skill: 'a_paso_abrojos' } });
        if (f) f.acc = f.data.interval;                              // el primer pulso, ya en el siguiente tic
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
        const T = tune().cls.retirada, at = { x: p.pos.x, z: p.pos.z };
        g.timers?.schedule?.(T.delay, () => { if (p.alive) g.castEcho?.(p, 'lluvia_flechas', { mult: T.mult, at }); });
      },
    },
    // c23 Recarga en Marcha: cada principal recarga 0,3 s/rango de Paso Veloz y de la Bomba de Humo
    a_recarga_marcha: {
      name: 'Recarga en Marcha', desc: 'Cada habilidad principal que lanzas recarga Paso Veloz y la Bomba de Humo.',
      state: () => ({ pend: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.cat !== 'spender') return;
        const s = tune().cls.marcha.perRank * powerRank(p, 'a_recarga_marcha');
        if (!(s > 0)) return;
        g.reduceCooldown?.(p, 'a_paso', s);
        // la Bomba de Humo se recarga al disiparse (cdOnEnd): lo de mientras dura queda pendiente
        if (!((g.reduceCooldown?.(p, 'a_humo', s) || 0) > 0) && (p.cds?.a_humo || 0) > 0) powerState(p, 'a_recarga_marcha').pend += s;
      },
      onTick(g, p) {
        const st = powerState(p, 'a_recarga_marcha');
        if (!(st.pend > 0)) return;
        if (!((p.cds?.a_humo || 0) > 0)) { st.pend = 0; return; }
        if ((g.reduceCooldown?.(p, 'a_humo', st.pend) || 0) > 0) st.pend = 0;
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
    // tus 4 siguientes disparos (en lo que dura: 10 s) llevan las tres puntas al 50 % (cuentan como una por enemigo).
    w_puntas: {
      name: 'Puntas Encantadas', desc: 'Cada 6 s tu siguiente flecha lleva una punta encantada que rota: Fuego, Hielo o Rayo.',
      priority: 1,                                                  // antes que Lluvia Encantada (30 %)
      procs: true,                                                   // los tics de una zona que lleva la punta
      state: () => ({ readyAt: 0, idx: 0, seq: [], braid: false, last: new WeakMap(), bite: new WeakMap(),
        share: null, desborde: 0, desbUntil: 0, desb: null, placed: new Map(), quickAt: -Infinity, healAt: -Infinity }),
      onCast(g, p, cast) {
        const st = powerState(p, 'w_puntas'), sk = cast?.sk, t = now(p);
        if (!sk) return;
        if (st.desborde > 0 && t > st.desbUntil + 1e-9) st.desborde = 0;
        if (st.desborde > 0 && arrowCast(cast)) { st.desborde--; st.desb = { skill: sk.id, until: t + tune().tip.shareWin, done: new Set() }; }
        // Trampa Encantada: lo que colocas toma la punta lista (y la gasta)
        if (p.tv?.tipPlace > 0 && placesTip(cast) && tipReady(p)) {
          const dur = cast.prof?.dur > 0 ? cast.prof.dur : tune().tip.placeWin;
          st.placed.set(sk.id, { elem: takeTip(p), until: t + dur + 1 });
        }
      },
      // Desborde de Puntas: sus disparos valen lo que dura la activa (su `dur`, 10 s)
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_h_puntas') return;
        const st = powerState(p, 'w_puntas');
        st.desborde = tune().tip.desborde.shots;
        st.desbUntil = now(p) + (cast.prof?.dur || cast.sk.dur || 10);
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
    // Llamada del Halcón (activa y4A) es del catálogo (comportamiento a_halcon: 6 s de ataques del
    // 40 % cada 0,5 s, ceguera y 30 de Quebranto); aquí solo Garras Afiladas le sube el daño.
    y_halcon: {
      name: 'Halcón Cazador', desc: 'Un halcón cae en picado cada 6 s sobre tu blanco y lo marca: recibe +10 % de tus flechas.',
      state: () => ({ acc: 0, target: null, targetAt: -99, marks: new Map(), callAt: -Infinity, guardAt: -Infinity, lastDive: null }),
      onTick(g, p, dt) {
        const st = powerState(p, 'y_halcon'), T = tune().hawk, tv = p.tv || {}, t = now(p);
        // marcas que caducan (o mueren); Presa Señalada: el marcado sigue contando como tu Presa
        for (const [e, until] of [...st.marks]) {
          if (!e.alive || until <= t) hawkUnmark(p, e);
          else if (tv.hawkPrey > 0 && p.talentAgg?.mechanic === 'coto') e.prey = true;
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
      // los ataques de la Llamada son del halcón: Garras Afiladas (tv.hawkDmg) también los sube
      modifyResolve(p, sk, prof) { if (sk.id === 'a_h_halcon' && p.tv?.hawkDmg > 0) prof.addPct += p.tv.hawkDmg; },
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
        powerState(p, 'y_halcon').skySeen = new WeakSet();          // cada tormenta reparte de nuevo
        g.ui?.spawnText?.(p.pos, '¡Cielo de Halcones!', 'txt-crit');
      },
    },

    // ================ especializaciones (§7): ver más abajo ================
    ...tiradoraPowers(),
    ...francotiradoraPowers(),
    ...montarazPowers(),
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
// helpers generales
// ------------------------------------------------------------
// renueva (o crea) un buff corto (sin recompute si ya estaba)
function refreshBuff(a, id, stats, keep, meta = {}) {
  const b = a?.buffs?.find?.(x => x.id === id);
  if (b) { b.t = Math.max(b.t, keep); b.dur = Math.max(b.dur || 0, keep); return; }
  a?.addBuff?.(id, { ...stats }, keep, meta);
}
// dirección del héroe hacia `target` (o su orientación)
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  const l = Math.hypot(dx, dz);
  if (l < 0.05) { dx = Math.sin(p.group?.rotation?.y || 0); dz = Math.cos(p.group?.rotation?.y || 0); }
  else { dx /= l; dz /= l; }
  return { x: dx, z: dz };
}
// total y tics de un DoT con el perfil de talentos (dotPct + <tipo>Pct, dotDur añade tics)
function dotOf(p, kind, base, dur) {
  const tv = p?.tv || {};
  const pct = (tv.dotPct || 0) + (tv[kind + 'Pct'] || 0);
  const ticks = Math.max(1, Math.round(dur + (tv.dotDur || 0)));
  return { total: base * Math.max(0, 1 + pct / 100) * ticks / dur, ticks };
}
// decal de suelo de un campo (anillo o disco); se mueve con el campo y se libera al morir
function groundDecal(g, f, { inner = 0.6, opacity = 0.45, color = 0xffffff, disc = false, segs = 32 } = {}) {
  if (f.dead) {
    if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; }
    return null;
  }
  if (!f.decal) {
    const geo = disc ? new THREE.CircleGeometry(f.radius, segs) : new THREE.RingGeometry(f.radius * inner, f.radius, segs);
    const decal = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    decal.rotation.x = -Math.PI / 2;
    g.fxGroup.add(decal);
    f.decal = decal;
  }
  f.decal.position.set(f.pos.x, 0.06, f.pos.z);
  return f.decal;
}

// ------------------------------------------------------------
// helpers de las especializaciones (§7)
// ------------------------------------------------------------
// El perfil de un lanzamiento está cacheado (p.resolved): lo que un onCast cambie en cast.prof
// (coste, daño, carga, proyectiles) vale SOLO para este lanzamiento si antes se suelta de la caché.
function ownProf(p, cast) {
  const id = cast?.sk?.id;
  if (id && p?.resolved?.[id] === cast.prof) delete p.resolved[id];
  return cast?.prof || null;
}
// suelta de la caché los perfiles de esas habilidades (un umbral que cambia lo que resuelven)
function forget(p, ...ids) { if (p?.resolved) for (const id of ids) delete p.resolved[id]; }
// canal en curso de la habilidad `id` del héroe (Carrera del Viento)
function channelOf(g, p, id) {
  const c = g?._channel;
  return c && c.ctx?.p === p && c.ctx?.sk?.id === id ? c : null;
}
// enemigo al que va un lanzamiento (el mismo criterio que la suelta de una carga)
function targetOf(g, cast) {
  return (cast?.target && g?.nearestEnemy?.(3, cast.target)) || (cast?.enemy?.alive ? cast.enemy : null);
}
// ¿un abanico de enemigos? el i-ésimo, repartido entre los que haya
function nth(list, i) { return list.length ? list[i % list.length] : null; }
// flecha de un PODER: golpe real al impactar (crítico, Debilidad, [×]) con `echo` (no es otra
// «flecha tuya» ni genera repeticiones). o = { from, to | angle, coef, addPct, skill, tags, pierce,
// range, speed, color, size, castHits, perTarget }
function shootArrow(g, p, o) {
  if (!g?.spawnProjectile || !(o.coef > 0)) return;
  const from = v3(o.from.x, o.from.z, 1.0);
  const to = o.to ? v3(o.to.x, o.to.z, 1.0) : v3(from.x + Math.sin(o.angle || 0) * 5, from.z + Math.cos(o.angle || 0) * 5, 1.0);
  const tags = o.tags || PROJ_TAGS;
  const hitInfo = { skill: o.skill, tags, elem: 'physical' };
  g.spawnProjectile({
    from, to, speed: o.speed || 20, range: o.range || 12, friendly: true, pierce: !!o.pierce,
    color: o.color ?? 0xe8d8a0, size: o.size || 0.08, castHits: o.castHits || null, perTarget: o.perTarget || 1,
    rollAt: e => p.rollDamage(o.coef, 0, o.addPct || 0, e, hitInfo),
    skill: o.skill, tags, elem: 'physical', hitOpts: { echo: true },
  });
}
const PROJ_TAGS = new Set(['proj', 'physical']);
const TRAP_TAGS = new Set(['trap', 'nature']);

// ---------- Tiradora: Carrera del Viento y Vendaval ----------
// la Carrera en curso: s desde que empezó (−1 si no corre) y su duración propia (sin prórroga)
function runT(g, p) {
  if (!channelOf(g, p, 'a_v_carrera')) return -1;
  return now(p) - (powerState(p, 'arq_carrera').at ?? now(p));
}
function runBase(p) { return powerState(p, 'arq_carrera').dur || 4; }
function galeOn(p) { return (gaugeState(p, 'impulso')?.galeT || 0) > 0; }
// alarga el Vendaval en curso `s` segundos (y su buff de velocidad de ataque)
function extendGale(p, s) {
  const st = gaugeState(p, 'impulso');
  if (!(st?.galeT > 0) || !(s > 0)) return 0;
  st.galeT += s;
  st.galeMax = (st.galeMax || st.galeT) + s;
  const b = p.buffs?.find(x => x.id === 't_vendaval');
  if (b) { b.t += s; b.dur = (b.dur || 0) + s; }
  return s;
}

// ---------- Francotiradora: tensados y Punto Débil ----------
function isCharged(id) { return id === 'a_t_apuntado' || id === 'a_u_celeste'; }
// golpe de un disparo tensado: Disparo Apuntado, un haz o el básico tensado (etiqueta de Cuerda Tensa)
function tensedHit(hit) { return !!hit && (isCharged(hit.skill) || !!hit.tags?.has?.('tensado')); }
function kneeling(p) { return !!p?.game?.stanceOf?.(p, 'a_f_rodilla'); }
function calmOn(p) { return (gaugeState(p, 'concentracion')?.calmT || 0) > 0; }
// la ventana dorada × mul (por los dos lados; si choca con el tope, crece hacia atrás)
function widenWindow(ch, mul) {
  const [a, b] = ch.perfect || [ch.max, ch.max];
  const c = (a + b) / 2, h = (b - a) / 2 * mul;
  let lo = c - h, hi = c + h;
  if (hi > ch.max) { lo -= hi - ch.max; hi = ch.max; }
  ch.perfect = [Math.max(ch.min || 0, lo), hi];
  return ch;
}
// coeficiente del disparo con la carga `frac` (escala de la carga del perfil)
function shotCoef(prof, frac) {
  const s = prof?.charge?.scale?.coef, base = prof?.def?.coef || 0;
  if (!Array.isArray(s) || typeof s[0] !== 'number' || !(base > 0)) return prof?.coef || 0;
  const v = s[0] + (s[s.length - 1] - s[0]) * Math.max(0, Math.min(1, frac || 0));
  return (prof.coef || 0) * v / base;
}
// PUNTO DÉBIL: la marca del motor (a_punto_debil, se gasta con el primer tensado), el seguimiento
// propio (Tiro Rastreador, Línea de Mira, Marca Saltarina) o, con Presa Señalada (y3), la marca del
// halcón: segundos que le quedan. El perfecto gratis es solo de la marca del motor (firstCharged).
function weakMap(p) { const st = powerState(p, 'arq_debil'); return st.m || (st.m = new Map()); }
// (dead: también de un enemigo que acaba de morir, para Marca Saltarina; la del halcón no salta)
function weakLeft(p, e, dead = false) {
  if (!e || (!dead && !e.alive)) return 0;
  const m = e.marks?.a_punto_debil;
  const own = m && m.t > 0 && (!m.by || m.by === p) ? m.t : 0;
  const hawk = p.tv?.hawkPrey > 0 && p.talentAgg?.mechanic === 'concentracion' && hawkMarked(p, e)
    ? powerState(p, 'y_halcon').marks.get(e) - now(p) : 0;
  return Math.max(own, (weakMap(p).get(e) || 0) - now(p), hawk, 0);
}
function isWeak(p, e) { return weakLeft(p, e) > 0; }
function markWeak(p, e, dur) {
  if (!e?.alive || !(dur > 0)) return;
  const m = weakMap(p);
  m.set(e, Math.max(m.get(e) || 0, now(p) + dur));
}
function pruneWeak(p) {
  const m = weakMap(p), t = now(p);
  for (const [e, until] of m) if (!e.alive || until <= t) m.delete(e);
}
// primera pared en la recta (paso de 0,25 m): { d, pos } o null
function firstWall(g, from, dir, len, step = 0.25) {
  const grid = g?.world?.grid;
  if (!grid?.walkable) return null;
  for (let d = 0.5; d <= len + 1e-9; d += step) {
    const x = from.x + dir.x * d, z = from.z + dir.z * d;
    if (!grid.walkable(x, z, 0.05)) return { d, pos: { x: x - dir.x * 0.3, z: z - dir.z * 0.3 } };
  }
  return null;
}

// ---------- Montaraz: trampas, zarzales, Presa y Cerco ----------
// golpe del SALTO de una trampa (la pisan) o de su ESTALLIDO (detonación)
function isSpring(hit) { return !!hit?.trap && hit.source === 'field:trampa'; }
function isBurst(hit) { return !!hit?.trap && hit.source !== 'field:trampa'; }
// cepos «de Trampa de Cepo» (los de carga y los del Racimo); los sembrados, pequeños y gratis no
const CHARGE_CEPOS = new Set(['a_t_cepo', 'm_racimo']);
function fieldByUid(g, uid) { return (g?.fields || []).find(f => f.uid === uid) || null; }
function ownTraps(g, p) { return (g?.fields || []).filter(f => !f.dead && !f.sprung && f.owner === p && (f.kind === 'trampa' || f.data?.trap)); }
function armedTraps(g, p) { return ownTraps(g, p).filter(f => fieldArmed(f)); }
// trampa más nueva de una habilidad (la que acaba de colocar Trampa de Cepo)
function newestTrap(g, p, skill) {
  const list = (g?.fieldsOf?.(p, { kind: 'trampa', skill }) || []).filter(f => !f.sprung);
  return list.length ? list[list.length - 1] : null;
}
// el daño de un cepo × mul (su estallido y su detonación, el núcleo con data.burstMul)
function scaleTrap(f, mul) {
  const d = f.data;
  if (d.baseDmg == null) d.baseDmg = d.dmg;
  d.dmg = (d.dmg || 0) * mul;
  d.burstMul = (d.burstMul || 1) * mul;
}
// rango de Trampa de Cepo (el de su perfil cacheado o el que da el nivel)
function cepoRank(p) { return p?.resolved?.a_t_cepo?.rank || p?.skills?.a_t_cepo || 1; }
// datos de un cepo como el de Trampa de Cepo (el último colocado; si no hay, el de la definición)
function cepoData(p) {
  const tpl = powerState(p, 'arq_cepo').tpl;
  if (tpl) return { data: { ...tpl.data, tags: tpl.data.tags }, radius: tpl.radius, life: tpl.life };
  // sin cepo colocado aún: el perfil de Trampa de Cepo (el cacheado o, si no, la definición FORJADA —
  // Mina de Espinas, Red de Caza— con coef y veneno × rango y su +% de talentos: lo mismo que pondría
  // el tipo trap). Sin importar skill-resolve.js (ciclo con data.js)
  const rank = cepoRank(p), rc = rankCoef(rank);
  const def = p?.resolved?.a_t_cepo?.def || p?.talentAccessors?.().defOf('a_t_cepo') || p?.cls?.skills?.find(s => s.id === 'a_t_cepo') || {};
  const pr = p?.resolved?.a_t_cepo || { coef: (def.coef ?? 0.6) * rc, addPct: (def.addPct || 0) + (p?.talentAgg?.mods?.a_t_cepo?.dmg || 0),
    hitDot: def.hitDot ? { ...def.hitDot, coef: (def.hitDot.coef || 0) * rc } : null };
  const t = def.trap || {}, coef = pr.coef ?? def.coef ?? 0.6;
  return {
    data: { dmg: p.avgHit ? p.avgHit(coef, pr.addPct || 0) : 0, coef, root: Math.max(t.root || 0, pr.root || def.root || 0), color: def.color, skill: 'a_t_cepo',
      tags: pr.tags || new Set([...(def.tags || []), 'trap']), elem: pr.elem || def.elem || 'nature', armT: t.armT ?? 0.5, burst: t.burst || null,
      consume: t.consume !== false, lure: t.lure || null, hitDot: pr.hitDot || null, rank,
      hold: t.hold || 0, boss: t.boss || null, skin: t.skin || null },
    radius: t.radius || pr.radius || 1.5, life: pr.dur || def.dur || 30,
  };
}
// coloca un cepo GENÉRICO (campo 'trampa' del núcleo: detonable, cuenta para el Coto y Salto de
// Acecho lo encuentra) con `mul` de su daño y una habilidad propia (su tope no pisa el de Trampa de
// Cepo). Su estallido (burst crudo de la forja) escala UNA vez con el rango de Trampa de Cepo: data.rank
// (field-entities lo aplica; sin él miraría el rango de `skill`, que la arquera no conoce)
function spawnCepo(g, p, pos, { mul = 1, skill = 'a_t_cepo', max = 6, cluster = null, armT = null } = {}) {
  const c = cepoData(p);
  const base = c.data.baseDmg ?? c.data.dmg;
  const data = { ...c.data, baseDmg: base, dmg: base * mul, burstMul: mul, skill, greatHunt: false, rank: c.data.rank > 0 ? c.data.rank : cepoRank(p) };
  delete data.rankMul;
  if (cluster != null) data.cluster = cluster; else delete data.cluster;
  if (armT != null) data.armT = armT;
  if (!data.lure && hasPower(p, 'm_cebo')) data.lure = { ...tune().mon.cebo };
  return g?.spawnField?.('trampa', { pos: v3(pos.x, pos.z), radius: c.radius, dur: c.life, owner: p, maxPerSkill: max, data }) || null;
}
// zarzal de 2 m que ralentiza (lo alarga Ojo de Trampera: data.fieldDur; Coto Cerrado: +rango s)
function spawnZarzal(g, p, pos, dur, src) {
  const T = tune().mon;
  let d = dur;
  if (hasPower(p, 'm_coto_cerrado') && gaugeValue(p, 'coto') >= T.cerrado.min) d += powerRank(p, 'm_coto_cerrado');
  return g?.spawnField?.('m_zarzal', { pos: v3(pos.x, pos.z), radius: T.zarzal.radius, dur: d, owner: p, maxPerSkill: T.zarzal.max,
    data: { skill: 'm_zarzal', src, slowPct: T.zarzal.slowPct, fieldDur: true, color: T.zarzal.color } }) || null;
}
// Presa (mecánica coto): la lista y añadir una (Presas en Manada, Rastro Fresco)
function preyList(p) { return cotoPreys(gaugeState(p, 'coto')); }
function addPrey(g, p, e, kind) {
  const st = gaugeState(p, 'coto');
  const T = gaugeTuning().coto;
  const ok = cotoAddPrey(st, e, kind, T.preyT, kind === 'trap' ? (hasPower(p, 'm_manada') ? T.manada.trap : 0) : T.manada.elite, now(p));
  if (ok) g?.ui?.spawnText?.(e.pos?.clone ? e.pos.clone().setY((e.def?.scale || 1) + 0.8) : e.pos, '¡PRESA!', 'txt-crit');
  return ok;
}
// el Cerco de Zarzas en curso (campo `zona` de a_u_zarzas): { f, c, r0, at, root } o null
function cercoOf(g, p) {
  const list = g?.fieldsOf?.(p, { kind: 'zona', skill: 'a_u_zarzas' }) || [];
  const f = list[list.length - 1];
  if (!f) return null;
  if (f._r0 == null) { f._r0 = f.radius; f._at = now(p); }
  return { f, c: f.pos, r0: f._r0, at: f._at, root: cercoRoot(p) };
}
// inmovilizar del Cerco: su perfil resuelto o la definición + los «+N s» de talento
function cercoRoot(p) {
  const pr = p?.resolved?.a_u_zarzas;
  if (pr?.root > 0) return pr.root;
  const def = p?.cls?.skills?.find(s => s.id === 'a_u_zarzas');
  return (def?.root || 1.5) + (p?.talentAgg?.mods?.a_u_zarzas?.rootAdd || 0);
}
// un enemigo inmovilizado por un Cerco (el de la definitiva o el de Bosque Vivo): Zarzas Trepadoras lo alarga
function cercoRooted(g, p, f) {
  if (!hasPower(p, 'm_trepadoras') || !f || f.dead) return;
  const T = tune().mon.trepadoras;
  const add = Math.min(T.perRank * powerRank(p, 'm_trepadoras'), T.max - (f._climb || 0));
  if (!(add > 0)) return;
  f._climb = (f._climb || 0) + add;
  f.t += add;
}
// ============================================================
// TIRADORA VELOZ (§7.0): Impulso, Tercera Flecha y sus tres estilos (Abanico, Vaivén, Galerna)
// ============================================================
function tiradoraPowers() {
  const T = tune().tir;
  return {
    // v0 Impulso (la barra vive en js/mech-arquera.js) + pasiva TERCERA FLECHA: cada 3.er Disparo
    // Rápido lanza 2 flechas más en abanico de 30° al 60 % (secuencia `seq` del básico). Lee Triple
    // Abierto (tv.tripleWide: 4 en 60°) y Puntas Templadas (tv.tripleDmg: +% al disparo triple).
    // Anota además el comienzo de cada Carrera del Viento (lo leen Nube de Paso, Nube Fiel y Galerna).
    t_tercera: {
      name: 'Tercera Flecha', desc: 'Cada 3.er Disparo Rápido lanza 2 flechas más en abanico (60 % cada una).',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'a_disparo') return;
        const x = T.triple, wide = (p.tv?.tripleWide || 0) > 0;
        prof.def = { ...prof.def, seq: { every: x.every, extra: { count: wide ? x.wideCount : x.count, spread: wide ? x.wideSpread : x.spread, coef: x.coef } } };
      },
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_v_carrera') {
          const st = powerState(p, 'arq_carrera');
          st.at = now(p);
          st.dur = cast.prof?.dur || cast.sk.dur || 4;
          return;
        }
        const add = p.tv?.tripleDmg || 0;
        if (cast?.weapon && cast.seqNth && add > 0) ownProf(p, cast).addPct += add;
      },
    },
    // v5 Remate Triple: tras una Andanada, el siguiente Disparo Rápido sale triple (una vez cada 4 s)
    t_remate_triple: {
      name: 'Remate Triple', desc: 'Tras una Andanada, tu siguiente Disparo Rápido sale triple.',
      icd: T.remate.icd,
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_andanada') return false;
        g.setSeqCount?.(p, 'a_disparo', T.triple.every - 1);
        return true;
      },
    },
    // v6 Soltar y Disparar: al soltar o acabar Carrera del Viento, una Andanada gratis al 60 % (repetición: no salta)
    t_soltar: {
      name: 'Soltar y Disparar', desc: 'Al soltar o acabar Carrera del Viento disparas una Andanada gratis al 60 %.',
      onSkillEnd(g, p, sk, end) {
        if (sk?.id !== 'a_v_carrera' || end?.kind !== 'channel' || !(end.reason === 'release' || end.reason === 'done')) return;
        g.castEcho?.(p, 'a_t_andanada', { mult: T.soltar.mult });
      },
    },
    // v7 Fondo de Corredora (con su mod durS): mientras corres con la Carrera, inmune a ralentizaciones
    t_fondo_corredora: {
      name: 'Fondo de Corredora', desc: 'Carrera del Viento te hace inmune a las ralentizaciones.',
      onTick(g, p) { if (channelOf(g, p, 'a_v_carrera')) p.grantSlowImmune?.(0.25); },
    },
    // v8B Triple Clavado: el disparo triple es crítico seguro y +20 %
    t_triple_clavado: {
      name: 'Triple Clavado', desc: 'Tu disparo triple es crítico seguro y hace +20 % de daño.',
      onCast(g, p, cast) {
        if (!cast?.weapon || !cast.seqNth) return;
        cast.forceCrit = true;
        ownProf(p, cast).addPct += T.clavado.pct;
      },
    },
    // v9A Último Instante: los relanzamientos de Andanada en su último medio segundo hacen +40 % y dan 20 de Impulso
    t_ultimo_instante: {
      name: 'Último Instante', desc: 'Relanzar Andanada en su último medio segundo: +40 % y 20 de Impulso.',
      modifyResolve(p, sk, prof) {
        if (sk.id === 'a_t_andanada' && prof.recast) prof.recast.perfectLast = Math.max(prof.recast.perfectLast || 0, T.instante.win);
      },
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_andanada' || !cast.recast?.perfect) return;
        ownProf(p, cast).addPct += T.instante.pct;
        gainGauge(p, 'impulso', T.instante.impulso);
        g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡Último instante!', 'txt-crit');
      },
    },
    // v9B Ida y Vuelta (con su mod recastAdd): la tercera Andanada de la cadena sale al 70 %
    t_ida_vuelta: {
      name: 'Ida y Vuelta', desc: 'Puedes relanzar Andanada dos veces; la tercera sale al 70 %.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_andanada' || !((cast.recast?.idx || 1) >= 3)) return;
        ownProf(p, cast).coef *= T.idaVuelta.third;
      },
    },
    // v10A Rueda de Flechas: con la Carrera, cada segundo un anillo de 8 flechas al 60 % (golpes de la Carrera)
    t_rueda: {
      name: 'Rueda de Flechas', desc: 'Mientras corres con Carrera, cada segundo sueltas un anillo de 8 flechas.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const ch = channelOf(g, p, 'a_v_carrera'), st = powerState(p, 't_rueda');
        if (!ch) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc + 1e-9 < T.rueda.every) return;
        st.acc -= T.rueda.every;
        const hits = new Set();
        for (let i = 0; i < T.rueda.n; i++) g.fireProjectile?.(ch.ctx, { angle: i * 2 * Math.PI / T.rueda.n, coef: T.rueda.coef, castHits: hits, size: 0.08 });
        g.emitFx?.('arqDanceSwirl', p.pos.clone().setY(1.0));
      },
    },
    // v10B Blanco Fijo: cada disparo seguido de la Carrera al mismo enemigo +10 % (hasta +60 %)
    t_blanco_fijo: {
      name: 'Blanco Fijo', desc: 'Si Carrera dispara al mismo enemigo, cada flecha seguida hace +10 % (hasta +60 %).',
      state: () => ({ last: null, n: 0 }),
      condAdd(p, e, hit) {
        if (hit?.skill !== 'a_v_carrera') return 0;
        const st = powerState(p, 't_blanco_fijo');
        return st.last === e ? T.blanco.pct * Math.min(T.blanco.max, st.n) : 0;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_v_carrera' || hit.echo) return;
        const st = powerState(p, 't_blanco_fijo');
        if (st.last === e) st.n++; else { st.last = e; st.n = 1; }
      },
      onSkillEnd(g, p, sk, end) {
        if (sk?.id !== 'a_v_carrera' || end?.kind !== 'channel') return;
        Object.assign(powerState(p, 't_blanco_fijo'), { last: null, n: 0 });
      },
    },
    // v12 Salto Impulsivo: cada salto de Andanada da 8 de Impulso por rango
    t_salto_impulsivo: {
      name: 'Salto Impulsivo', desc: 'Cada salto de Andanada te da Impulso.',
      onCast(g, p, cast) {
        if (cast?.sk?.id === 'a_t_andanada') gainGauge(p, 'impulso', T.salto.perRank * powerRank(p, 't_salto_impulsivo'));
      },
    },
    // v14 Vacío de Aire: al soltar o acabar la Carrera atraes 2 m a los de 5 m; a los jefes, 15 de Quebranto
    t_vacio_aire: {
      name: 'Vacío de Aire', desc: 'Al soltar o acabar Carrera del Viento, atraes 2 m a los enemigos cercanos.',
      onSkillEnd(g, p, sk, end) {
        if (sk?.id !== 'a_v_carrera' || end?.kind !== 'channel' || !(end.reason === 'release' || end.reason === 'done')) return;
        for (const e of foesNear(g, p.pos, T.vacio.radius)) {
          if (isBoss(e)) e.addStagger?.(T.vacio.stagger, p);
          else e.displace?.(p.pos, T.vacio.pull, { toward: true, src: p });
        }
        g.spawnRing?.(p.pos.clone().setY(0.1), T.vacio.radius, 0x9fe8ff);
      },
    },
    // v15A Piel de Brisa: durante el Vendaval recibes un 20 % menos
    t_piel_brisa: {
      name: 'Piel de Brisa', desc: 'Durante el Vendaval recibes un 20 % menos de daño.',
      condDr(p) { return galeOn(p) ? T.brisa.dr : 0; },
    },
    // v15B Retirada Instintiva: un golpe cuerpo a cuerpo te hace saltar 4 m atrás y da 15 de Impulso (cada 8 s)
    t_retirada: {
      name: 'Retirada Instintiva', desc: 'Si te golpean cuerpo a cuerpo, saltas 4 m atrás y ganas Impulso.',
      state: () => ({}),
      onDamaged(g, p, info) {
        if (!info?.melee || p.leap || !p.alive) return;
        if (!takeCd(powerState(p, 't_retirada'), 'cd', T.retirada.icd, p)) return;
        const src = info.src?.pos || g.nearestEnemy?.(3)?.pos || null;
        const dir = src ? dirTo(src, p.pos) : (() => { const d = aimDir(p, g.input?.mouseWorld); return { x: -d.x, z: -d.z }; })();
        const want = v3(p.pos.x + dir.x * T.retirada.jump, p.pos.z + dir.z * T.retirada.jump);
        const to = g.clampWalkable ? g.clampWalkable(p.pos, want, T.retirada.jump) : want;
        p.leap = { from: p.pos.clone(), to, t: 0, dur: T.retirada.airT, plant: false };
        gainGauge(p, 'impulso', T.retirada.impulso);
      },
    },
    // v16 Viento en las Plumas: con 50+ de Impulso, Múltiple y Andanada +10 %/rango y la Carrera dispara un 15 %/rango más rápido
    t_viento_plumas: {
      name: 'Viento en las Plumas', desc: 'Con 50 o más de Impulso, Múltiple y Andanada pegan más y Carrera dispara más rápido.',
      state: () => ({ above: false }),
      condAdd(p, e, hit) {
        if (hit?.skill !== 'flecha_multiple' && hit?.skill !== 'a_t_andanada') return 0;
        return gaugeValue(p, 'impulso') >= T.plumas.over ? T.plumas.pctPerRank * powerRank(p, 't_viento_plumas') : 0;
      },
      modifyResolve(p, sk, prof) {
        const a = prof.def?.autoShot;
        if (sk.id !== 'a_v_carrera' || !a || !(gaugeValue(p, 'impulso') >= T.plumas.over)) return;
        const k = 1 + T.plumas.ratePerRank * powerRank(p, 't_viento_plumas') / 100;
        prof.def = { ...prof.def, autoShot: { ...a, every: a.every / k } };
      },
      onTick(g, p) {
        const st = powerState(p, 't_viento_plumas'), above = gaugeValue(p, 'impulso') >= T.plumas.over;
        if (above !== st.above) { st.above = above; forget(p, 'a_v_carrera'); }
      },
    },
    // v17 Nube de Paso: en los 6 primeros s de cada Carrera, cada segundo recarga 0,4 s/rango del Diluvio (suelo de la definitiva)
    t_nube_paso: {
      name: 'Nube de Paso', desc: 'Al principio de cada Carrera del Viento, el Diluvio de Saetas se recarga más rápido.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const t = runT(g, p), st = powerState(p, 't_nube_paso');
        if (t < 0 || t > T.nube.first + 1e-9) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc + 1e-9 < 1) return;
        st.acc -= 1;
        g.reduceCooldown?.(p, 'a_u_diluvio', T.nube.perRank * powerRank(p, 't_nube_paso'));
      },
    },
    // v18 Flechas Perdidas: si Flecha Múltiple mata, suelta rango + 1 flechas al 50 % hacia los cercanos
    t_flechas_perdidas: {
      name: 'Flechas Perdidas', desc: 'Si Flecha Múltiple mata, suelta flechas hacia enemigos cercanos.',
      onKill(g, p, e, kill) {
        if (kill?.skill !== 'flecha_multiple') return;
        const foes = foesNear(g, e.pos, T.perdidas.range, e);
        const n = 1 + powerRank(p, 't_flechas_perdidas');
        for (let i = 0; i < n && foes.length; i++)
          shootArrow(g, p, { from: e.pos, to: nth(foes, i).pos, coef: T.perdidas.coef, skill: 't_flechas_perdidas', range: T.perdidas.range + 2 });
      },
    },
    // v19 Vendaval Encadenado: cada relanzamiento de Andanada alarga el Vendaval 0,5 s/rango (hasta +4 s)
    t_vendaval_encadenado: {
      name: 'Vendaval Encadenado', desc: 'Cada relanzamiento de Andanada alarga el Vendaval.',
      state: () => ({ ext: 0 }),
      onGauge(g, p, id, ev) { if (id === 'impulso' && ev === 'full') powerState(p, 't_vendaval_encadenado').ext = 0; },
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_andanada' || !cast.recast || !galeOn(p)) return;
        const st = powerState(p, 't_vendaval_encadenado');
        const add = Math.min(T.encadenado.perRank * powerRank(p, 't_vendaval_encadenado'), T.encadenado.max - st.ext);
        st.ext += extendGale(p, add);
      },
    },
    // v21 Nube Fiel: en los 6 primeros s de cada Carrera, el Diluvio descarga cada 0,4 s (antes 0,5 s):
    // las oleadas que faltan para ese ritmo caen aparte, con el perfil del Diluvio en curso
    t_nube_fiel: {
      name: 'Nube Fiel', desc: 'Al principio de cada Carrera del Viento, el Diluvio de Saetas descarga más a menudo.',
      state: () => ({ rain: null, acc: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_u_diluvio') return;
        const pr = cast.prof || {}, sk = cast.sk;
        const waves = pr.waves ?? sk.waves ?? 1, span = pr.span ?? sk.span ?? 0;
        const st = powerState(p, 't_nube_fiel');
        st.acc = 0;
        st.rain = waves >= 6 ? { prof: pr, sk, start: now(p) + (pr.impactDelay || 0), end: now(p) + (pr.impactDelay || 0) + span,
          at: cast.target ? { x: cast.target.x, z: cast.target.z } : { x: p.pos.x, z: p.pos.z } } : null;
      },
      onTick(g, p, dt) {
        const st = powerState(p, 't_nube_fiel'), r = st.rain;
        if (!r || now(p) > r.end + 1e-9) { st.rain = null; st.acc = 0; return; }
        const t = runT(g, p);
        if (now(p) < r.start || t < 0 || t > T.fiel.first + 1e-9) return;
        st.acc += dt * (1 / T.fiel.step - 1 / T.fiel.base);
        if (st.acc + 1e-9 < 1) return;
        st.acc -= 1;
        const follow = r.prof.follow ?? r.sk.follow ?? null;
        const c = follow === 'owner' ? p.pos : follow === 'aim' && g.input?.mouseWorld ? g.input.mouseWorld : (r.sk.at === 'self' ? p.pos : r.at);
        const at = v3(c.x, c.z), rad = r.prof.radius || r.sk.radius || 4;
        g.dealArea?.(at, rad, r.prof.coef, { hitInfo: { skill: 'a_u_diluvio', tags: r.prof.tags, elem: r.prof.elem },
          addPct: r.prof.addPct || 0, critBonus: r.prof.critBonus || 0, from: at });
        g.spawnRing?.(at, rad, r.sk.color || 0xbfffbf);
      },
    },
    // v22 Ráfaga Creciente: cada Múltiple a menos de 3 s de otra, 1 flecha más (hasta rango + 1)
    t_rafaga_creciente: {
      name: 'Ráfaga Creciente', desc: 'Cada Flecha Múltiple seguida dispara una flecha más.',
      state: () => ({ n: 0, last: -9 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'flecha_multiple') return;
        const st = powerState(p, 't_rafaga_creciente'), t = now(p);
        st.n = t - st.last <= T.rafaga.win + 1e-9 ? Math.min(1 + powerRank(p, 't_rafaga_creciente'), st.n + 1) : 0;
        st.last = t;
        if (st.n > 0) ownProf(p, cast).proj += st.n;
      },
    },
    // v23 Golpe de Apertura: al empezar el Vendaval, las rango + 1 siguientes Andanadas o Múltiples son críticas
    t_apertura: {
      name: 'Golpe de Apertura', desc: 'Al empezar el Vendaval, tus siguientes Andanadas o Flechas Múltiples son críticas seguras.',
      state: () => ({ left: 0 }),
      onGauge(g, p, id, ev) { if (id === 'impulso' && ev === 'full') powerState(p, 't_apertura').left = 1 + powerRank(p, 't_apertura'); },
      onCast(g, p, cast) {
        const id = cast?.sk?.id, st = powerState(p, 't_apertura');
        if ((id !== 'a_t_andanada' && id !== 'flecha_multiple') || !(st.left > 0)) return;
        st.left--;
        cast.forceCrit = true;
      },
    },
    // v24 Ciclones: con la Carrera, cada 2,5 − 0,5·rango s un ciclón 4 s que dispara cada 0,5 s al
    // más cercano (28 %, 3 vivos). Su golpe es de la Carrera (sus mods) con su propio nombre y `echo`.
    t_ciclones: {
      name: 'Ciclones', desc: 'Mientras corres con Carrera dejas ciclones que disparan al enemigo más cercano.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const ch = channelOf(g, p, 'a_v_carrera'), st = powerState(p, 't_ciclones');
        if (!ch) { st.acc = 0; return; }
        const every = T.ciclon.base - T.ciclon.perRank * powerRank(p, 't_ciclones');
        st.acc += dt;
        if (st.acc + 1e-9 < every) return;
        st.acc -= every;
        const c = ch.ctx;
        const ctx = { ...c, hitInfo: { ...c.hitInfo, skill: 't_ciclones' }, dmgOpts: { ...c.dmgOpts, skill: 't_ciclones', echo: true },
          hitExtra: { ...(c.hitExtra || {}), echo: true } };
        g.spawnField?.('emisor', { pos: v3(p.pos.x, p.pos.z), radius: 1, dur: T.ciclon.dur, owner: p, maxPerSkill: T.ciclon.max,
          data: { every: T.ciclon.every, coef: T.ciclon.coef, range: T.ciclon.range, ctx, skill: 't_ciclones', color: 0xbfefff } });
      },
    },
    // v25 Tormenta de Plumas (final): cada 3.ª Múltiple, además un círculo de 3 + 3·rango flechas al 60 %;
    // hasta 3 de ellas caen sobre el blanco de la Múltiple (con su propio tope de 3 por enemigo)
    t_tormenta_plumas: {
      name: 'Tormenta de Plumas', desc: 'Cada 3.ª Flecha Múltiple sale además en círculo.',
      state: () => ({ n: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'flecha_multiple') return;
        const st = powerState(p, 't_tormenta_plumas'), X = T.tormenta;
        st.n = (st.n + 1) % X.every;
        if (st.n !== 0) return;
        const n = X.base + X.perRank * powerRank(p, 't_tormenta_plumas');
        const tgt = targetOf(g, cast);
        const seek = tgt ? Math.min(X.seek, n) : 0;
        const onTarget = new Map(), ring = new Set();
        for (let i = 0; i < seek; i++)
          shootArrow(g, p, { from: p.pos, to: tgt.pos, coef: X.coef, skill: 't_tormenta_plumas', castHits: onTarget, perTarget: X.seek, range: X.range });
        for (let i = 0; i < n - seek; i++)
          shootArrow(g, p, { from: p.pos, angle: i * 2 * Math.PI / (n - seek), coef: X.coef, skill: 't_tormenta_plumas', castHits: ring, range: X.range });
        g.emitFx?.('arqDanceSwirl', p.pos.clone().setY(1.0));
      },
    },
    // v26 Vaivén Eterno (final): en el Vendaval, al cerrar su ventana Andanada vuelve sin recarga y a
    // mitad de coste (1, 2 o sin límite de veces por Vendaval)
    t_vaiven: {
      name: 'Vaivén Eterno', desc: 'Durante el Vendaval, Andanada vuelve sin recarga y a mitad de coste.',
      state: () => ({ used: 0, half: false }),
      onGauge(g, p, id, ev) { if (id === 'impulso' && ev === 'full') powerState(p, 't_vaiven').used = 0; },
      onSkillEnd(g, p, sk, end) {
        if (sk?.id !== 'a_t_andanada' || end?.kind !== 'recast' || !galeOn(p)) return;
        const st = powerState(p, 't_vaiven');
        const cap = T.vaiven.uses[Math.max(1, powerRank(p, 't_vaiven')) - 1] ?? T.vaiven.uses[0];
        if (st.used >= cap) return;
        st.used++;
        st.half = true;
        g.reduceCooldown?.(p, 'a_t_andanada', Infinity);
        forget(p, 'a_t_andanada');
      },
      modifyResolve(p, sk, prof) { if (sk.id === 'a_t_andanada' && powerState(p, 't_vaiven').half) prof.cost *= T.vaiven.costMul; },
      onCast(g, p, cast) {
        const st = powerState(p, 't_vaiven');
        if (cast?.sk?.id !== 'a_t_andanada' || cast.recast || !st.half) return;
        st.half = false;
        ownProf(p, cast);             // la mitad de coste vale para ESTE lanzamiento; el siguiente se rehace
      },
    },
    // v27 Galerna Infinita (final): mantenida, la Carrera dura 2 s, 4 s o lo que aguantes de más; el tiempo
    // extra gasta 10 de Energía por segundo y 3 más cada segundo (sin Energía, se acaba)
    t_galerna: {
      name: 'Galerna Infinita', desc: 'Carrera del Viento dura más mientras la mantengas, gastando Energía.',
      onTick(g, p, dt) {
        const ch = channelOf(g, p, 'a_v_carrera');
        if (!ch || ch.endless) return;
        const t = runT(g, p), base = runBase(p);
        const cap = T.galerna.extra[Math.max(1, powerRank(p, 't_galerna')) - 1] ?? T.galerna.extra[0];
        if (t >= base - 1e-9) {
          const extra = t - base;
          if (extra >= cap - 1e-9) return;
          if (!spendResource(p, (T.galerna.cost + T.galerna.ramp * Math.floor(extra + 1e-9)) * dt)) return;
        }
        // en el último tic (base o prórroga pagada), un tic más mientras quede tope
        if (ch.left <= 1 && t + ch.left * ch.interval < base + cap - 1e-9) g.extendChannel?.(p, ch.interval);
      },
    },
    // v28 Ojo del Huracán (ápice): 1) el Vendaval da +20 % de velocidad · 2) matar a un élite, 50 de
    // Impulso · 3) el Vendaval salta a 80 · 4) cada Vendaval recarga 4 s del Diluvio (suelo de la definitiva)
    t_ojo_huracan: {
      name: 'Ojo del Huracán', desc: 'El Vendaval te acelera, salta antes y recarga el Diluvio.',
      stats(p) { return powerRank(p, 't_ojo_huracan') >= 3 ? { 'gaugeMax:impulso': T.ojo.max } : {}; },
      onGauge(g, p, id, ev) {
        if (id === 'impulso' && ev === 'full' && powerRank(p, 't_ojo_huracan') >= 4) g.reduceCooldown?.(p, 'a_u_diluvio', T.ojo.diluvio);
      },
      onKill(g, p, e) { if (powerRank(p, 't_ojo_huracan') >= 2 && isEliteish(e)) gainGauge(p, 'impulso', T.ojo.eliteImpulso); },
      onTick(g, p) {
        if (galeOn(p)) refreshBuff(p, 't_ojo_huracan', { spdPct: T.ojo.spdPct }, 0.25, { name: 'Ojo del Huracán', icon: '🌀', desc: `+${T.ojo.spdPct}% de velocidad de movimiento` });
      },
    },
  };
}

// ============================================================
// SENSACIÓN DE LOS TENSADOS (S-arquera, A4 · A5): lo que se VE de Disparo Apuntado, Tiro Celestial y el
// Disparo Rápido tensado (Cuerda Tensa). Lo lleva Cuerda Tensa (f0, gratis con la Francotiradora):
//   · tensando (onTick, 10 Hz): partículas que convergen en el arco y crecen con la carga, brillo del
//     arco (dorado en la ventana) y, al empezar, un ANILLO que se cierra justo cuando se abre la ventana
//     dorada (como el «Perfect Timing» del Snipe de PoE2). El Disparo Rápido tensado, sin anillo y más
//     discreto (lo tensas a cada rato)
//   · al soltar (⑭ de la carga; el básico, en ⑦): destello en el arco, sacudida (Tiro Celestial) y la
//     SAETA ALARGADA (un haz vivo corto que viaja con el proyectil) con su TRAZADOR desde la boca, que
//     acaba en la última víctima (no en el cursor) y se apaga en 0,3 s; dorados y más gruesos en el
//     perfecto. Tres Saetas: una saeta y un trazador por saeta. Tiro Celestial: surco luminoso en el
//     suelo a lo largo de su línea (1 s); su haz de la línea entera lo pinta el motor (`beam`)
//   · al impactar (⑤): chispa en cada enemigo atravesado y congelado en el perfecto (una vez por suelta);
//     la víctima cuenta para el trazador de SU saeta (la que pasa a menos de 0,6 m o de su radio)
// El recorrido del proyectil se calcula (recto, a su velocidad): no hace falta el objeto del motor.
// ============================================================
// eslint-disable-next-line no-var
var TENSE_FEEL;
function tenseFeel() {
  return TENSE_FEEL || (TENSE_FEEL = Object.freeze({
    ids: Object.freeze(['a_t_apuntado', 'a_u_celeste']),
    // los que se ven tensando (el básico también: Cuerda Tensa)
    charge: Object.freeze(['a_t_apuntado', 'a_u_celeste', 'a_disparo']),
    gold: 0xffcf40,
    // glow: × del brillo y de las chispas al tensar; ring: color del anillo (sin él, no hay anillo)
    a_t_apuntado: { color: 0xfff1a8, ring: '#fff1a8', glow: 1, streak: 0.85, width: 0.12, stop: 70, shake: 0.12 },
    a_u_celeste: { color: 0x9fd8ff, ring: '#bfe6ff', glow: 1, streak: 1.2, width: 0.2, stop: 100, shake: 0.32, furrow: 1.0 },
    a_disparo: { color: 0xe8d8a0, ring: null, glow: 0.6, streak: 0.6, width: 0.08, stop: 45, shake: 0, speed: 18 },
    // a qué distancia de la línea de una saeta cuenta una víctima para su trazador (m; o su radio)
    lineR: 0.6,
    trace: { linger: 0.12, fade: 0.3 },
  }));
}
// el arco: a la altura del pecho y un poco por delante (la mano de game-skills.handPos)
function bowPos(p) {
  const r = p?.group?.rotation?.y || 0;
  return v3(p.pos.x + Math.sin(r) * 0.4, p.pos.z + Math.cos(r) * 0.4, 1.2);
}
function hexCol(c) { return '#' + (((c >>> 0) & 0xffffff).toString(16).padStart(6, '0')); }
// tensando: anillo que se cierra al abrirse la ventana (al empezar) y chispas que convergen en el arco
function tenseChargeFx(g, p) {
  const c = g?._charging;
  if (!c || !tenseFeel().charge.includes(c.id)) return;
  const F = tenseFeel(), cfg = F[c.id];
  const st = powerState(p, 'arq_tensado');
  const at = bowPos(p);
  const inWin = !!c.inWindow;
  const col = inWin ? hexCol(F.gold) : (cfg.ring || hexCol(cfg.color));
  if (st.chargeT0 !== c.t0 && cfg.ring) {
    const speed = g._chargeSpeed ? g._chargeSpeed(c) : 1;
    const win0 = (c.window || [c.max])[0];
    const T = Math.max(0.15, (win0 - (c.u || 0)) / Math.max(0.05, speed));
    const R = 1.1;
    g.emitFx?.({ name: 'Tensado anillo', texture: 'glow', blending: 'additive', count: 28, burst: true, lifetime: [T, T],
      shape: 'ring', shapeRadius: R, speed: [-R / T * 1.05, -R / T * 1.05], gravity: -0.6, drag: 0,
      size: { start: [0.12, 0.16], end: 0.22 }, color: { start: cfg.ring, end: hexCol(F.gold) }, alpha: { start: 0.55, end: 1 } }, v3(at.x, at.z, 1.45));
    st.rings = (st.rings || 0) + 1;
  }
  st.chargeT0 = c.t0;
  const k = Math.max(0, Math.min(1, c.frac || 0)), m = cfg.glow ?? 1;
  g.emitFx?.({ name: 'Tensado chispas', texture: 'spark', blending: 'additive', count: Math.max(1, Math.round((3 + 6 * k) * m)), burst: true, lifetime: [0.22, 0.32],
    shape: 'sphere', shapeRadius: 0.9 * m, speed: [-3.2 * m, -2.2 * m], gravity: 0, drag: 0, size: { start: [0.05 + 0.06 * k, 0.08 + 0.1 * k], end: 0.02 },
    color: { start: '#ffffff', end: col }, alpha: { start: 0.9, end: 0.2 } }, at);
  const s = (0.25 + 0.55 * k) * m;
  g.emitFx?.({ name: 'Tensado brillo', texture: 'glow', blending: 'additive', count: 1, burst: true, lifetime: [0.13, 0.13],
    shape: 'point', shapeRadius: 0.01, speed: [0, 0], gravity: 0, drag: 0, size: { start: [s, s], end: (0.2 + 0.5 * k) * m },
    color: { start: inWin ? '#fff6cc' : '#ffffff', end: col }, alpha: { start: 0.55 + 0.35 * k, end: 0.3 } }, at);
  st.glows = (st.glows || 0) + 1;
}
// saeta alargada + trazador de un disparo recto: from (y 1), dir unitaria, speed, range, pierce
function tenseShot(g, p, id, { from, dir, speed, range, pierce, perfect = false, frac = 1 }) {
  if (!g?.spawnLiveBeam) return null;
  const F = tenseFeel(), cfg = F[id] || F.a_disparo;
  const st = powerState(p, 'arq_tensado');
  const end0 = g.clampWalkable ? g.clampWalkable(v3(from.x, from.z), v3(from.x + dir.x * range, from.z + dir.z * range), range) : v3(from.x + dir.x * range, from.z + dir.z * range);
  const lineLen = Math.hypot(end0.x - from.x, end0.z - from.z);
  const shot = { id, t0: now(p), from: { x: from.x, z: from.z }, dir, speed: Math.max(1, speed), lineLen, pierce: !!pierce, stopAt: null, last: null, done: false, perfect, stopped: false };
  const color = perfect ? F.gold : cfg.color;
  const head = () => {
    const d = Math.min(shot.stopAt ?? shot.lineLen, (now(p) - shot.t0) * shot.speed);
    return v3(shot.from.x + dir.x * d, shot.from.z + dir.z * d, 1.0);
  };
  const finished = () => (now(p) - shot.t0) * shot.speed >= (shot.stopAt ?? shot.lineLen) - 1e-6;
  const w = cfg.width * (perfect ? 1.6 : 1) * (0.8 + 0.4 * frac);
  // la saeta: un haz corto que viaja con la punta
  let bolt = null;
  bolt = g.spawnLiveBeam({ color, coreColor: 0xffffff, width: w, core: w * 0.45, intensity: perfect ? 1.8 : 1.3, sparks: false,
    from: () => { const h = head(); const back = Math.min(cfg.streak, Math.hypot(h.x - shot.from.x, h.z - shot.from.z)); return v3(h.x - dir.x * back, h.z - dir.z * back, 1.0); },
    to: () => { const h = head(); if (bolt && !bolt.ending && finished()) bolt.end(0.06); return h; } });
  // el trazador: de la boca a la punta; al acabar, a la última víctima (o donde paró) y se apaga
  let trace = null;
  const traceTo = () => {
    if (!finished()) return head();
    if (!shot.done) {
      shot.done = true;
      g.timers?.schedule?.(F.trace.linger, () => trace?.end?.(F.trace.fade));
    }
    return shot.last ? v3(shot.last.x, shot.last.z, 1.0) : head();
  };
  trace = g.spawnLiveBeam({ color, coreColor: perfect ? 0xfff6cc : 0xffffff, width: w * 0.55, core: w * 0.2, intensity: perfect ? 1.1 : 0.7, sparks: false, scroll: 10,
    from: v3(from.x + dir.x * 0.4, from.z + dir.z * 0.4, 1.0), to: traceTo });
  shot.bolt = bolt; shot.trace = trace;
  return shot;
}
// la suelta de un tensado (Disparo Apuntado, Tiro Celestial): destello, sacudida, saeta y trazador
function tenseRelease(g, p, sk, end) {
  const id = sk?.id;
  if (!tenseFeel().ids.includes(id) || end?.kind !== 'charge' || !(end.casts > 0)) return;
  const F = tenseFeel(), cfg = F[id];
  const prof = p.resolved?.[id] || null;
  const def = prof?.def || sk;
  const st = powerState(p, 'arq_tensado');
  st.release = (st.release || 0) + 1;
  st.stopFor = null;
  const frac = Math.max(0, Math.min(1, end.frac ?? 1)), perfect = !!end.perfect;
  const at = bowPos(p);
  g.emitFx?.(perfect ? 'arqReleasePerfect' : 'arqReleaseFlash', at);
  if (id === 'a_u_celeste') g.emitFx?.('arqCelestialFlash', at);
  if (cfg.shake > 0) g.addShake?.(cfg.shake * (0.6 + 0.4 * frac) * (perfect ? 1.3 : 1));
  if (def.type !== 'proj') return;                                  // Lluvia Estelar: cae del cielo
  const aim = st.aim || (g.input?.mouseWorld ? { x: g.input.mouseWorld.x, z: g.input.mouseWorld.z } : null);
  const dir = aimDir(p, aim);
  const range = prof?.range || def.range || 16;
  // a carga completa con `full` (Tres Saetas): una saeta y un trazador por saeta, en su abanico
  const full = end.full && prof?.charge?.full?.count > 1 ? prof.charge.full : null;
  const n = full ? full.count : 1, spread = full ? (full.spread ?? prof.spread ?? 0) : 0;
  const base = Math.atan2(dir.x, dir.z);
  st.shots = [];
  for (let i = 0; i < n; i++) {
    const a = base + (n > 1 ? projFanOffset(i, n, spread) : 0);
    const s = tenseShot(g, p, id, { from: p.pos, dir: { x: Math.sin(a), z: Math.cos(a) }, speed: prof?.speed || def.speed || 30, range, pierce: prof?.pierce ?? def.pierce, perfect, frac });
    if (s) { s.release = st.release; st.shots.push(s); }
  }
  // la central (la del cursor) es la que se recuerda como «la saeta» de la suelta
  const shot = st.shots[n > 1 ? (n - 1) >> 1 : 0] || null;
  st.shot = shot;
  // surco luminoso en el suelo (Tiro Celestial): se apaga en 1 s
  if (cfg.furrow && shot && g.spawnLiveBeam) {
    const a = v3(p.pos.x + dir.x * 0.5, p.pos.z + dir.z * 0.5, 0.06), b = v3(p.pos.x + dir.x * shot.lineLen, p.pos.z + dir.z * shot.lineLen, 0.06);
    st.furrow = g.spawnLiveBeam({ from: a, to: b, color: F.a_u_celeste.color, coreColor: 0xe8f6ff, width: 0.25 + 0.35 * frac, core: 0.08 + 0.08 * frac,
      intensity: 0.9, sparks: false, scroll: 2, dur: cfg.furrow });
  }
}
// el básico tensado de Cuerda Tensa (⑦ del básico de arma, antes de soltar la flecha)
function tenseBasic(g, p, cast) {
  if (!cast?.weapon || !cast.charge || !(cast.charge.t >= tune().fra.cuerda.tensedAt - 1e-9)) return;
  const F = tenseFeel(), cfg = F.a_disparo;
  const st = powerState(p, 'arq_tensado');
  st.release = (st.release || 0) + 1;
  st.stopFor = null;
  const to = cast.target || cast.enemy?.pos;
  if (!to) return;
  const dir = aimDir(p, to);
  if (cast.perfect) { g.emitFx?.('arqReleasePerfect', bowPos(p)); }
  // el recorrido de la flecha de verdad (Player.basicAttack): su alcance (basicRange, con el de la carga
  // si la escala lo alarga: Vista Larga) y su velocidad
  const pr = cast.prof, sc = pr?.charge?.scale;
  const range = p.basicRange ? p.basicRange(sc?.range || sc?.rangeAdd ? cast.charge.t : null) : 12;
  const shot = tenseShot(g, p, 'a_disparo', { from: p.pos, dir, speed: pr?.def?.speed || cfg.speed, range, pierce: !!pr?.pierce, perfect: !!cast.perfect, frac: cast.charge.frac ?? 1 });
  if (shot) shot.release = st.release;
  st.shot = shot;
  st.shots = shot ? [shot] : [];
}
// impacto de un tensado: la saeta para en su víctima (si no atraviesa), chispa en cada atravesado y
// congelado en el perfecto (una vez por suelta, ni en repeticiones)
function tenseHit(g, p, e, hit) {
  if (!e || hit?.proc || hit?.dot) return;
  const st = powerState(p, 'arq_tensado');
  const id = hit?.skill;
  const mine = (st.shots || []).filter(s => s.id === id && s.release === st.release);
  if (!mine.length) return;
  const F = tenseFeel(), cfg = F[id] || F.a_disparo;
  // la saeta de la víctima: la que pasa más cerca (a menos de 0,6 m de su línea o de su radio)
  const r = Math.max(F.lineR, 0.55 * (e.def?.scale || 1));
  let shot = null, best = Infinity;
  for (const s of mine) {
    const dx = e.pos.x - s.from.x, dz = e.pos.z - s.from.z;
    const along = dx * s.dir.x + dz * s.dir.z, perp = Math.abs(dx * s.dir.z - dz * s.dir.x);
    if (along > -0.5 && perp <= r && perp < best) { best = perp; shot = s; }
  }
  if (!hit.echo) {
    if (shot) {
      shot.last = { x: e.pos.x, z: e.pos.z };
      if (!shot.pierce && shot.stopAt == null) shot.stopAt = Math.max(0.3, Math.hypot(e.pos.x - shot.from.x, e.pos.z - shot.from.z) - 0.3);
    }
    g.emitFx?.((shot || mine[0]).perfect ? 'arqPierceGold' : 'arqPierceSpark', v3(e.pos.x, e.pos.z, 1.0));
  }
  shot = shot || mine[0];
  if (hit.perfect && !hit.echo && st.stopFor !== shot.release && cfg.stop > 0) {
    st.stopFor = shot.release;
    g.hitStop?.(cfg.stop);
    st.stops = (st.stops || 0) + 1;
  }
}

// ============================================================
// FRANCOTIRADORA (§7.1): Concentración, Cuerda Tensa y sus tres estilos (Perforación, Punto Débil, Vigía)
// ============================================================
// «Tensados» = Disparo Apuntado, los haces de Tiro Celestial y el Disparo Rápido mantenido (Cuerda
// Tensa le pone la etiqueta `tensado`). El premio del perfecto va al disparo, no a lo que deja.
function francotiradoraPowers() {
  const T = tune().fra;
  // onSkillEnd de una suelta de Disparo Apuntado que disparó (perfecta si `perfect`)
  const aimedRelease = (sk, end, perfect = false) => sk?.id === 'a_t_apuntado' && end?.kind === 'charge' && end.casts > 0 && (!perfect || end.perfect);
  // «a carga completa» (Salva de Vigía, Línea Mortal y Tres Saetas en el motor): el arco tensado del
  // todo, que llega con la ventana dorada si se abre antes del máximo (combat-math chargeFullAt:
  // Disparo Apuntado 1,15 de 1,5 s; Tiro Pesado 2,15 de 2,5; Tensado Rápido 1,0 de 1,3; Tiro
  // Celestial 0,5 de 0,8) y, sin ventana, con el máximo. Así un soltado perfecto también es a carga
  // completa, como dice la rotación del diseño («a carga completa en la ventana dorada»). La suelta
  // lo trae en `end.full` (⑭). Antes pedían el máximo, siempre después de la ventana (E4b-bugs)
  // mira y perfil del último Disparo Apuntado (al empezar a tensar; la suelta sale hacia ahí)
  const aimOf = (p) => powerState(p, 'arq_apuntado');
  return {
    // f0 Mira Serena (la barra vive en js/mech-arquera.js) + pasiva CUERDA TENSA: Disparo Rápido se
    // tensa hasta 1 s (hasta +60 %, repartido entre sus flechas) y su último 0,2 s es perfecto (crítico
    // seguro, sin +50 %). Marca los básicos tensados (`tensado`), lleva el Punto Débil de Tiro Rastreador,
    // la mira de Disparo Apuntado y Vista Larga (tv.farTense: +% a los tensados a más de 10 m).
    f_cuerda_tensa: {
      name: 'Cuerda Tensa', desc: 'Mantén Disparo Rápido para tensarlo: hasta +60 %; su último 0,2 s es perfecto.',
      priority: 2,
      // markMin: un toque (menos de 0,3 s) ni gasta ni fuerza el Punto Débil de Tiro Rastreador (lo lee
      // el motor). Vista Larga (f20, tv.tenseRange: 2 m por rango): el básico TENSADO (desde 0,3 s) llega
      // más lejos (charge.scale.rangeAdd: el motor lo suma en Player.basicRange; aquí no se llama a
      // basicRange, que resuelve este mismo perfil)
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'a_disparo' || prof.charge) return;
        const C = T.cuerda, def = prof.def || sk;
        const n = Math.max(1, Math.floor(def.count || 1)), c0 = def.coef || 1;
        const scale = { coef: [c0, c0 * (1 + C.addPct / 100 / n)] };
        const far = p.tv?.tenseRange || 0;
        if (far > 0) scale.rangeAdd = [[C.tensedAt - 0.01, 0], [C.tensedAt, far]];
        prof.charge = { min: 0, max: C.max, perfect: [...C.perfect], perfectPct: 0, perfectCrit: true,
          scale, moveMul: C.moveMul, autoRelease: true, instant: false,
          repeat: true, perfectGauge: null, full: null, speed: 1, markMin: C.tensedAt };
      },
      // (la sensación de los tensados —tenseFeel: anillo, saeta, trazador, destello y congelado— va en
      // estos mismos ganchos: S-arquera A4 · A5)
      onCast(g, p, cast) {
        const id = cast?.sk?.id;
        // un tensado sale hacia la mira de cuando empezaste a tensar (ctx.target): la saeta y el trazador
        if (tenseFeel().ids.includes(id)) powerState(p, 'arq_tensado').aim = cast.target ? { x: cast.target.x, z: cast.target.z } : null;
        if (id === 'a_t_apuntado') {
          Object.assign(aimOf(p), { aim: cast.target ? { x: cast.target.x, z: cast.target.z } : null, prof: cast.prof });
          return;
        }
        if (!cast?.weapon || !(cast.charge?.t >= T.cuerda.tensedAt - 1e-9)) return;
        const prof = ownProf(p, cast);
        if (prof) prof.tags = new Set([...(prof.tags || []), 'tensado']);
        tenseBasic(g, p, cast);
      },
      condAdd(p, e, hit) {
        const far = p.tv?.farTense || 0;
        if (!(far > 0) || !e || !tensedHit(hit)) return 0;
        return dist2(e.pos, p.pos) > T.cuerda.farAt * T.cuerda.farAt ? far : 0;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill === 'a_f_rastreador' && e?.alive) markWeak(p, e, p.resolved?.a_f_rastreador?.mark?.dur || T.weakDur);
        tenseHit(g, p, e, hit);
      },
      onSkillEnd(g, p, sk, end) { tenseRelease(g, p, sk, end); },
      onTick(g, p) {
        const st = powerState(p, 'arq_debil');
        st.acc = (st.acc || 0) + 1;
        if (st.acc % 10 === 0) pruneWeak(p);
        tenseChargeFx(g, p);
      },
    },
    // f4 Sobrepenetración: +10 %/rango por cada enemigo que ya atravesó la saeta (hasta 4)
    f_sobrepenetracion: {
      name: 'Sobrepenetración', desc: 'Disparo Apuntado hace más daño por cada enemigo que ya atravesó.',
      state: () => ({ n: 0 }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'a_t_apuntado') powerState(p, 'f_sobrepenetracion').n = 0; },
      condAdd(p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado') return 0;
        return T.sobre.perRank * powerRank(p, 'f_sobrepenetracion') * Math.min(T.sobre.max, powerState(p, 'f_sobrepenetracion').n);
      },
      onHit(g, p, e, hit) { if (hit?.skill === 'a_t_apuntado' && !hit.echo) powerState(p, 'f_sobrepenetracion').n++; },
    },
    // f5 Línea de Mira: un soltado perfecto que atraviesa deja un Punto Débil de 4 s en cada enemigo que toca
    f_linea_mira: {
      name: 'Línea de Mira', desc: 'Un soltado perfecto que atraviesa deja un Punto Débil en cada enemigo que toca.',
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || !hit.perfect || hit.echo || !e?.alive) return;
        if (aimOf(p).prof?.pierce === false) return;
        markWeak(p, e, T.mira.dur);
      },
    },
    // f6 Pulso Quieto: de rodillas, la ventana dorada de los tensados es un 50 % más ancha
    f_pulso_quieto: {
      name: 'Pulso Quieto', desc: 'En Rodilla en Tierra, la ventana dorada de tus disparos tensados es más ancha.',
      priority: 1,
      state: () => ({ kneel: false }),
      modifyResolve(p, sk, prof) { if (prof.charge && kneeling(p)) widenWindow(prof.charge, T.pulso.widen); },
      onTick(g, p) {
        const st = powerState(p, 'f_pulso_quieto'), k = kneeling(p);
        if (k !== st.kneel) { st.kneel = k; invalidate(p); }
      },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'a_f_rodilla') { powerState(p, 'f_pulso_quieto').kneel = kneeling(p); invalidate(p); } },
      onSkillEnd(g, p, sk, end) { if (end?.kind === 'stance') { powerState(p, 'f_pulso_quieto').kneel = false; invalidate(p); } },
    },
    // f8A Estela Explosiva: un soltado perfecto de Disparo Apuntado deja su línea cargada: estalla a los 0,5 s (30 %)
    f_estela: {
      name: 'Estela Explosiva', desc: 'Un soltado perfecto de Disparo Apuntado deja su línea cargada: estalla poco después.',
      onSkillEnd(g, p, sk, end) {
        if (!aimedRelease(sk, end, true)) return;
        const st = aimOf(p), from = { x: p.pos.x, z: p.pos.z }, dir = aimDir(p, st.aim);
        const len = st.prof?.range || 16;
        g.timers?.schedule?.(T.estela.delay, () => {
          if (!p.alive) return;
          for (const e of lineFoes(g, from, dir, len, T.estela.width)) strike(g, p, e, T.estela.coef, 0, 'f_estela', PROJ_TAGS);
          g.spawnBeam?.(v3(from.x, from.z, 0.6), v3(from.x + dir.x * len, from.z + dir.z * len, 0.6), 0xffb060, 0.25);
        });
      },
    },
    // f8B Doble Impacto: si Disparo Apuntado no atraviesa a nadie más, golpea otra vez a su blanco al 30 %
    f_doble_impacto: {
      name: 'Doble Impacto', desc: 'Si Disparo Apuntado no atraviesa a nadie más, golpea otra vez al blanco.',
      state: () => ({ last: null, raw: 0, crit: false, tags: null }),
      onHit(g, p, e, hit) {
        if (hit?.skill === 'a_t_apuntado' && !hit.echo) Object.assign(powerState(p, 'f_doble_impacto'), { last: e, raw: hit.raw, crit: hit.crit, tags: hit.tags });
      },
      afterCast(g, p, cast, res) {
        const st = powerState(p, 'f_doble_impacto');
        const e = st.last;
        st.last = null;
        if (cast?.sk?.id !== 'a_t_apuntado' || res?.hits !== 1 || !e?.alive || !(st.raw > 0)) return;
        e.takeDamage(Math.max(1, Math.round(st.raw * T.doble.mult)), st.crit, { skill: 'a_t_apuntado', tags: st.tags || PROJ_TAGS, elem: 'physical', echo: true });
        g.emitFx?.('arqStunPop', e.pos.clone().setY(1.2));
      },
    },
    // f9A Marca Saltarina: si el marcado muere, el Punto Débil salta al más cercano con el tiempo que le quedaba
    f_marca_saltarina: {
      name: 'Marca Saltarina', desc: 'Si el marcado muere, el Punto Débil salta al enemigo más cercano.',
      onKill(g, p, e) {
        const left = weakLeft(p, e, true);
        if (!(left > 0)) return;
        const to = foesNear(g, e.pos, T.saltarina.range, e)[0];
        weakMap(p).delete(e);
        if (!to) return;
        markWeak(p, to, left);
        const m = e.marks?.a_punto_debil;
        if (m && m.t > 0 && (!m.by || m.by === p)) (to.marks || (to.marks = {})).a_punto_debil = { ...m };
        g.spawnBeam?.(e.pos.clone().setY(1.2), to.pos.clone().setY(1.2), 0xff9a4a, 0.25);
      },
    },
    // f9B Punto Vital: contra tu Punto Débil, el soltado perfecto +35 % y 15 de Quebranto
    f_punto_vital: {
      name: 'Punto Vital', desc: 'Contra tu Punto Débil, el soltado perfecto hace más daño y llena Quebranto.',
      state: () => ({ seq: 0, done: -1 }),
      onCast(g, p, cast) {
        const st = powerState(p, 'f_punto_vital');
        st.seq++;
        const tgt = targetOf(g, cast);
        if (cast?.weapon) {                           // básico tensado: el perfecto ya se sabe al disparar
          if (cast.perfect && isWeak(p, tgt)) ownProf(p, cast).addPct += T.vital.pct;
          return;
        }
        if (!isCharged(cast?.sk?.id) || !cast.prof?.charge || !isWeak(p, tgt)) return;
        const prof = ownProf(p, cast);
        prof.charge = { ...prof.charge, perfectPct: (prof.charge.perfectPct || 0) + T.vital.pct };
      },
      onHit(g, p, e, hit) {
        if (!hit?.perfect || hit.echo || !isBoss(e) || !isWeak(p, e)) return;
        const st = powerState(p, 'f_punto_vital');
        if (st.done === st.seq) return;               // una vez por disparo
        st.done = st.seq;
        e.addStagger?.(T.vital.stagger, p);
      },
    },
    // f10A Salva de Vigía: de rodillas, cada soltado a carga completa (Disparo Apuntado o un haz; el
    // básico tensado no, §19.1 hallazgo 4) dispara 2 saetas más al 25 %. «A carga completa» = end.full,
    // desde la ventana dorada: el soltado perfecto también (E4b-bugs; antes, solo al máximo)
    f_salva: {
      name: 'Salva de Vigía', desc: 'En Rodilla en Tierra, cada soltado a carga completa dispara 2 saetas más.',
      onSkillEnd(g, p, sk, end) {
        if (!isCharged(sk?.id) || end?.kind !== 'charge' || !(end.casts > 0) || !end.full || !kneeling(p)) return;
        const foes = foesNear(g, p.pos, T.salva.range);
        for (let i = 0; i < T.salva.n && foes.length; i++)
          shootArrow(g, p, { from: p.pos, to: nth(foes, i).pos, coef: T.salva.coef, skill: 'f_salva', speed: 26, range: T.salva.range + 2 });
      },
    },
    // f10B Paciencia de Vigía: de rodillas, cada Disparo Apuntado seguido al mismo enemigo +15 % (hasta +45 %)
    f_paciencia: {
      name: 'Paciencia de Vigía', desc: 'En Rodilla en Tierra, cada Disparo Apuntado seguido al mismo enemigo hace más daño.',
      state: () => ({ last: null, n: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_apuntado') return;
        const st = powerState(p, 'f_paciencia'), tgt = targetOf(g, cast);
        if (!kneeling(p) || !tgt) { st.last = null; st.n = 0; return; }
        st.n = st.last === tgt ? st.n + 1 : 1;
        st.last = tgt;
        ownProf(p, cast).addPct += T.paciencia.pct * Math.min(T.paciencia.max, st.n);
      },
    },
    // f11 Fila Rota: cada enemigo que mata Disparo Apuntado devuelve 4 de Energía y 5 de Concentración por rango
    f_fila_rota: {
      name: 'Fila Rota', desc: 'Cada enemigo que mata Disparo Apuntado te devuelve Energía y Concentración.',
      onKill(g, p, e, kill) {
        if (kill?.skill !== 'a_t_apuntado') return;
        const r = powerRank(p, 'f_fila_rota');
        g.gainResource?.(p, T.fila.energy * r);
        gainGauge(p, 'concentracion', T.fila.focus * r);
      },
    },
    // f12 Lectura del Blanco: contra tu Punto Débil, la ventana dorada dura un 25 %/rango más
    f_lectura: {
      name: 'Lectura del Blanco', desc: 'Contra tu Punto Débil, la ventana dorada dura más.',
      onCast(g, p, cast) {
        if (!isCharged(cast?.sk?.id) || !cast.prof?.charge || !isWeak(p, targetOf(g, cast))) return;
        const prof = ownProf(p, cast);
        prof.charge = widenWindow({ ...prof.charge }, 1 + T.lectura.perRank * powerRank(p, 'f_lectura') / 100);
      },
    },
    // f13 Puntería de Vigía: de rodillas, los tensados +15 %/rango
    f_punteria_vigia: {
      name: 'Puntería de Vigía', desc: 'En Rodilla en Tierra, tus disparos tensados hacen más daño.',
      condAdd(p, e, hit) { return kneeling(p) && tensedHit(hit) ? T.vigia.perRank * powerRank(p, 'f_punteria_vigia') : 0; },
    },
    // f14 Estrella Fija: en la Calma Absoluta, cada perfecto de Disparo Apuntado recarga 1,5 s de Tiro Celestial
    f_estrella_fija: {
      name: 'Estrella Fija', desc: 'En la Calma Absoluta, cada soltado perfecto de Disparo Apuntado recarga Tiro Celestial.',
      onSkillEnd(g, p, sk, end) {
        if (aimedRelease(sk, end, true) && calmOn(p)) g.reduceCooldown?.(p, 'a_u_celeste', T.estrella.cdr);
      },
    },
    // f15B Nervios de Acero: un golpe mientras tensas da un escudo del 8 % de la vida (cada 6 s; cubeta de autocuración)
    f_nervios: {
      name: 'Nervios de Acero', desc: 'Si te golpean mientras tensas, ganas un escudo.',
      state: () => ({}),
      onDamaged(g, p, info) {
        if (!g?._charging || !(info?.amount > 0)) return;
        if (!takeCd(powerState(p, 'f_nervios'), 'cd', T.nervios.icd, p)) return;
        selfShield(g, p, T.nervios.pct, T.nervios.dur, 'f_nervios');
      },
    },
    // f16 Serenidad: con 50+ de Concentración, Apuntado y los haces se tensan un 10 %/rango más rápido y +10 %/rango
    f_serenidad: {
      name: 'Serenidad', desc: 'Con 50 o más de Concentración, Disparo Apuntado y los haces se tensan más rápido y pegan más.',
      state: () => ({ above: false }),
      condAdd(p, e, hit) {
        return isCharged(hit?.skill) && gaugeValue(p, 'concentracion') >= T.serenidad.over ? T.serenidad.perRank * powerRank(p, 'f_serenidad') : 0;
      },
      modifyResolve(p, sk, prof) {
        if (!isCharged(sk.id) || !prof.charge || !(gaugeValue(p, 'concentracion') >= T.serenidad.over)) return;
        prof.charge.speed *= 1 + T.serenidad.perRank * powerRank(p, 'f_serenidad') / 100;
      },
      onTick(g, p) {
        const st = powerState(p, 'f_serenidad'), above = gaugeValue(p, 'concentracion') >= T.serenidad.over;
        if (above !== st.above) { st.above = above; forget(p, 'a_t_apuntado', 'a_u_celeste'); }
      },
    },
    // f17 Haces Gemelos: cada haz de Tiro Celestial dispara otro detrás, al 35 %/rango (repetición: no repite)
    f_haces_gemelos: {
      name: 'Haces Gemelos', desc: 'Cada haz de Tiro Celestial dispara otro detrás.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_u_celeste') return;
        // la repetición de una carga sale a carga completa: el gemelo, al 35 %/rango DE ESTE haz
        const pr = cast.prof || p.resolved?.a_u_celeste, full = shotCoef(pr, 1);
        const frac = full > 0 ? shotCoef(pr, cast.charge?.frac ?? 1) / full : 1;
        const mult = T.gemelos.perRank * powerRank(p, 'f_haces_gemelos') * frac, at = cast.target ? { x: cast.target.x, z: cast.target.z } : null;
        g.timers?.schedule?.(0.15, () => { if (p.alive) g.castEcho?.(p, 'a_u_celeste', { mult, at }); });
      },
    },
    // f18 Rebote Certero: Disparo Apuntado rebota en el primer muro y vuelve por su línea al 10 %/rango del disparo
    f_rebote: {
      name: 'Rebote Certero', desc: 'Disparo Apuntado rebota en el primer muro y vuelve por su línea.',
      onSkillEnd(g, p, sk, end) {
        if (!aimedRelease(sk, end)) return;
        const st = aimOf(p), pr = st.prof;
        const from = { x: p.pos.x, z: p.pos.z }, dir = aimDir(p, st.aim), len = pr?.range || 16;
        const wall = firstWall(g, from, dir, len, T.rebote.step);
        if (!wall) return;
        const coef = shotCoef(pr, end.frac) * T.rebote.perRank * powerRank(p, 'f_rebote');
        const speed = pr?.speed || 30;
        g.timers?.schedule?.(wall.d / speed, () => {
          if (p.alive) shootArrow(g, p, { from: wall.pos, to: from, coef, skill: 'f_rebote', pierce: true, range: wall.d + 1, speed });
        });
      },
    },
    // f19 Herida Expuesta: mientras tiene tu Punto Débil, el enemigo recibe +6 %/rango de todo el grupo
    f_herida_expuesta: {
      name: 'Herida Expuesta', desc: 'Mientras tiene tu Punto Débil, el enemigo recibe más daño de todo el grupo.',
      onTick(g, p) {
        const pct = T.expuesta.perRank * powerRank(p, 'f_herida_expuesta');
        for (const e of g.enemies || []) if (e.alive && isWeak(p, e)) e.applyWeakness?.('f_herida_expuesta', pct, 0.25);
      },
    },
    // f21 Firmamento: de rodillas, Tiro Celestial se recarga un 20 % más rápido (suelo de la definitiva)
    f_firmamento: {
      name: 'Firmamento', desc: 'En Rodilla en Tierra, Tiro Celestial se recarga más rápido.',
      onTick(g, p, dt) {
        if (kneeling(p) && (p.cds?.a_u_celeste || 0) > 0) g.reduceCooldown?.(p, 'a_u_celeste', T.firmamento.rate * dt);
      },
    },
    // f22 Saetas Paralelas: cada perfecto de Disparo Apuntado suelta rango saetas en paralelo a 1 m (20 %)
    f_paralelas: {
      name: 'Saetas Paralelas', desc: 'Cada soltado perfecto de Disparo Apuntado suelta saetas en paralelo.',
      onSkillEnd(g, p, sk, end) {
        if (!aimedRelease(sk, end, true)) return;
        const st = aimOf(p), dir = aimDir(p, st.aim), len = st.prof?.range || 16;
        const side = { x: dir.z, z: -dir.x };
        const offs = [1, -1, 2, -2, 3, -3].slice(0, powerRank(p, 'f_paralelas'));
        for (const o of offs) {
          const from = { x: p.pos.x + side.x * o * T.paralelas.gap, z: p.pos.z + side.z * o * T.paralelas.gap };
          shootArrow(g, p, { from, to: { x: from.x + dir.x * len, z: from.z + dir.z * len }, coef: T.paralelas.coef, skill: 'f_paralelas',
            pierce: true, range: len, speed: st.prof?.speed || 30, color: 0xfff1a8 });
        }
      },
    },
    // f23 Herida sobre Herida: cada perfecto a tu Punto Débil le deja una Herida (hasta 5): tus tensados +2 %/rango por cada una
    f_heridas: {
      name: 'Herida sobre Herida', desc: 'Cada soltado perfecto a tu Punto Débil le deja una Herida que suma daño.',
      state: () => ({ n: new WeakMap() }),
      onHit(g, p, e, hit) {
        if (!hit?.perfect || hit.echo || !tensedHit(hit) || !isWeak(p, e)) return;
        const m = powerState(p, 'f_heridas').n;
        m.set(e, Math.min(T.heridas.max, (m.get(e) || 0) + 1));
      },
      condAdd(p, e, hit) {
        if (!e || !tensedHit(hit)) return 0;
        return (powerState(p, 'f_heridas').n.get(e) || 0) * T.heridas.perRank * powerRank(p, 'f_heridas');
      },
    },
    // f24 Ojo Entrenado: cada 7 − rango s de rodillas, el siguiente Disparo Apuntado sale al instante y a carga completa
    f_ojo_entrenado: {
      name: 'Ojo Entrenado', desc: 'De rodillas, cada pocos segundos tu siguiente Disparo Apuntado sale al instante.',
      state: () => ({ acc: 0, ready: false }),
      onTick(g, p, dt) {
        const st = powerState(p, 'f_ojo_entrenado');
        if (!kneeling(p)) { st.acc = 0; return; }
        if (st.ready) return;
        st.acc += dt;
        if (st.acc + 1e-9 < T.entrenado.base - powerRank(p, 'f_ojo_entrenado')) return;
        st.acc = 0;
        st.ready = true;
        g.ui?.spawnText?.(p.pos.clone().setY(2.2), '¡Listo!', 'txt-crit');
      },
      onCast(g, p, cast) {
        const st = powerState(p, 'f_ojo_entrenado');
        if (cast?.sk?.id !== 'a_t_apuntado' || !st.ready) return;
        st.ready = false;
        cast.instant = true;
      },
    },
    // f25 Línea Mortal (final): a carga completa (desde la ventana dorada, chargeFullAt), Disparo
    // Apuntado llega a 30 m y su línea estalla (5 + 5·rango %)
    f_linea_mortal: {
      name: 'Línea Mortal', desc: 'A carga completa, Disparo Apuntado es un haz de 30 m que estalla en toda su línea.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_apuntado' || !cast.prof?.charge) return;
        const prof = ownProf(p, cast), ch = prof.charge, def = prof.def || cast.sk;
        const d = def.range || 16, R = prof.range || d, F = chargeFullAt(ch);
        // escala de alcance por tramos: el de siempre hasta la carga completa y 30 m desde ahí (rangeMul = v / def.range)
        prof.charge = { ...ch, scale: { ...(ch.scale || {}), range: [[ch.min, d], [F - 1e-3, d], [F, T.mortal.range * d / R]] } };
      },
      onSkillEnd(g, p, sk, end) {
        if (!aimedRelease(sk, end) || !end.full) return;
        const st = aimOf(p), from = { x: p.pos.x, z: p.pos.z }, dir = aimDir(p, st.aim);
        const coef = (T.mortal.base + T.mortal.perRank * powerRank(p, 'f_linea_mortal')) / 100;
        g.timers?.schedule?.(0.3, () => {
          if (!p.alive) return;
          for (const e of lineFoes(g, from, dir, T.mortal.range, T.mortal.width)) strike(g, p, e, coef, 0, 'f_linea_mortal', PROJ_TAGS);
          g.spawnBeam?.(v3(from.x, from.z, 1.0), v3(from.x + dir.x * T.mortal.range, from.z + dir.z * T.mortal.range, 1.0), 0xfff1a8, 0.35);
        });
      },
    },
    // f26 Disparo Imposible (final): un perfecto de Disparo Apuntado a tu Punto Débil sale dos veces: la 2.ª
    // al 5 + 10·rango % del disparo, crítica y con 20 de Quebranto (una vez por segundo; no da Herida ni Concentración)
    f_disparo_imposible: {
      name: 'Disparo Imposible', desc: 'Un soltado perfecto a tu Punto Débil sale dos veces.',
      icd: 1,
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_t_apuntado' || !hit.perfect || hit.echo || !e?.alive || !isWeak(p, e)) return false;
        const pct = (T.imposible.base + T.imposible.perRank * powerRank(p, 'f_disparo_imposible')) / 100;
        const raw = hit.raw, tags = hit.tags;
        g.timers?.schedule?.(T.imposible.delay, () => {
          if (!e.alive) return;
          e.takeDamage(Math.max(1, Math.round(raw * pct)), true, { skill: 'a_t_apuntado', tags, elem: 'physical', echo: true });
          e.addStagger?.(T.imposible.stagger, p);
          g.emitFx?.('arqStunPop', e.pos.clone().setY(1.2));
        });
        return true;
      },
    },
    // f27 Atalaya Eterna (final): Rodilla en Tierra dura 20 s, 30 s o hasta que te levantes; cada 5 s en ella,
    // un haz celeste gratis sobre tu blanco (200 %, no atraviesa)
    f_atalaya: {
      name: 'Atalaya Eterna', desc: 'Rodilla en Tierra dura más y, de rodillas, cae un haz celeste sobre tu blanco.',
      state: () => ({ acc: 0, target: null }),
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'a_f_rodilla') return;
        const d = T.atalaya.dur[Math.max(1, powerRank(p, 'f_atalaya')) - 1] ?? T.atalaya.dur[0];
        prof.dur = Math.max(prof.dur || 0, d);
      },
      onHit(g, p, e, hit) { if (tensedHit(hit) && !hit.echo) powerState(p, 'f_atalaya').target = e; },
      onTick(g, p, dt) {
        const st = powerState(p, 'f_atalaya');
        if (!kneeling(p)) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc + 1e-9 < T.atalaya.every) return;
        st.acc -= T.atalaya.every;
        const R = T.atalaya.range;
        const e = st.target?.alive && dist2(st.target.pos, p.pos) <= R * R ? st.target : foesNear(g, p.pos, R)[0];
        if (!e) return;
        strike(g, p, e, T.atalaya.coef, 0, 'a_u_celeste', PROJ_TAGS);
        g.spawnBeam?.(v3(e.pos.x, e.pos.z, 8), e.pos.clone().setY(1.0), 0x9fd8ff, 0.3);
      },
    },
    // f28 Ojo Inmóvil (ápice): 1) la Calma dura 8 s (la lee la mecánica) · 2) matar a un élite, 50 de
    // Concentración · 3) la Calma salta a 80 · 4) cada Calma recarga 5 s de Tiro Celestial
    f_ojo_inmovil: {
      name: 'Ojo Inmóvil', desc: 'La Calma Absoluta dura más, salta antes y recarga Tiro Celestial.',
      stats(p) { return powerRank(p, 'f_ojo_inmovil') >= 3 ? { 'gaugeMax:concentracion': T.inmovil.max } : {}; },
      onKill(g, p, e) { if (powerRank(p, 'f_ojo_inmovil') >= 2 && isEliteish(e)) gainGauge(p, 'concentracion', T.inmovil.eliteFocus); },
      onGauge(g, p, id, ev) {
        if (id === 'concentracion' && ev === 'full' && powerRank(p, 'f_ojo_inmovil') >= 4) g.reduceCooldown?.(p, 'a_u_celeste', T.inmovil.celeste);
      },
    },
  };
}

// ============================================================
// MONTARAZ (§7.2): Coto de Caza, Cebo de Caza y sus tres estilos (Campo Minado, Presa, Zarzal)
// ============================================================
// Los cepos son campos 'trampa' del núcleo (detonables, cuentan para el Coto y Salto de Acecho los
// encuentra). «Cepos de Trampa de Cepo» = los de carga y los del Racimo; los sembrados (Campo
// Sembrado), los pequeños (Tierra Arrasada) y el gratis del ápice llevan su propia habilidad.
// Golpe de una trampa: `isSpring` (alguien la pisa) o `isBurst` (la hace estallar una detonación).
function montarazPowers() {
  const T = tune().mon;
  // una vez por trampa (uid) en un poder: { seen:Set } acotado
  const once = (st, uid) => {
    const s = st.seen || (st.seen = new Set());
    if (s.has(uid)) return false;
    s.add(uid);
    if (s.size > 96) s.delete(s.values().next().value);
    return true;
  };
  // por lanzamiento de Flecha Detonante: el primer golpe (centro de su estallido)
  const detCast = (p, id, cast) => { if (cast?.sk?.id === 'a_m_detonante') { const st = powerState(p, id); st.seq = (st.seq || 0) + 1; st.at = null; } };
  const detFirst = (p, id, hit) => {
    if (hit?.skill !== 'a_m_detonante' || hit.echo || hit.trap) return false;
    const st = powerState(p, id);
    if (st.done === st.seq) return false;
    st.done = st.seq;
    return true;
  };
  // donde acaba el vuelo de Flecha Detonante sin blanco (su alcance hacia la mira)
  const detEnd = (g, p, cast) => {
    const d = aimDir(p, cast.target), R = cast.prof?.range || cast.sk.range || 12;
    const want = v3(p.pos.x + d.x * R, p.pos.z + d.z * R);
    const end = g.clampWalkable ? g.clampWalkable(p.pos, want, R) : want;
    return { x: end.x, z: end.z };
  };
  return {
    // m0 Coto de Caza (la barra vive en js/mech-arquera.js) + pasiva CEBO DE CAZA: todas tus trampas
    // armadas atraen (a 6 m; los élites a 3 m; los jefes no), también las que colocan tus talentos.
    // Guarda el molde del último cepo (spawnCepo) y lee Pólvora Negra (tv.trapBurstPct: +% a los
    // estallidos de trampa) y Espino Venenoso (tv.thornPoison: +% al veneno del Cerco de Zarzas).
    m_cebo: {
      name: 'Cebo de Caza', desc: 'Tus trampas armadas atraen a los enemigos cercanos.',
      priority: 2, procs: true,
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_cepo') return;
        const f = newestTrap(g, p, 'a_t_cepo');
        if (!f) return;
        if (f.data.baseDmg == null) f.data.baseDmg = f.data.dmg;
        powerState(p, 'arq_cepo').tpl = { data: { ...f.data, cluster: undefined, greatHunt: false }, radius: f.radius, life: f.dur };
      },
      onTick(g, p) {
        let changed = false;
        for (const f of ownTraps(g, p)) if (!f.data.lure) { f.data.lure = { ...T.cebo }; changed = true; }
        if (changed) g._recountMoveFields?.();
      },
      condAdd(p, e, hit) {
        const n = p.tv?.trapBurstPct || 0;
        return n > 0 && hit?.tags?.has?.('trap') ? n : 0;
      },
      onHit(g, p, e, hit) {
        const n = p.tv?.thornPoison || 0;
        if (!(n > 0) || !hit?.dot || hit.skill !== 'a_u_zarzas' || !String(hit.source || '').startsWith('field:') || !(hit.raw > 0)) return;
        dealProcDamage(g, e, hit.raw * n / 100, { skill: 'm_cebo', source: 'power' });
      },
    },
    // m5 Presa Atrapada: una trampa que atrapa a tu Presa estalla (60 %) y devuelve una carga de Trampa
    // de Cepo (una vez cada 10 s; las que hizo saltar Gran Cacería no cuentan)
    m_presa_atrapada: {
      name: 'Presa Atrapada', desc: 'Una trampa que atrapa a tu Presa estalla y te devuelve una carga de Trampa de Cepo.',
      icd: T.atrapada.icd,
      onHit(g, p, e, hit) {
        if (!isSpring(hit) || !e?.prey) return false;
        const f = fieldByUid(g, hit.trap.uid);
        if (f?.data?.greatHunt) return false;
        const at = v3(f ? f.pos.x : e.pos.x, f ? f.pos.z : e.pos.z);
        g.dealArea?.(at, T.atrapada.radius, T.atrapada.coef, { hitInfo: { skill: 'm_presa_atrapada', tags: TRAP_TAGS, elem: 'nature' }, from: at });
        g.reduceCooldown?.(p, 'a_t_cepo', Infinity);
        g.spawnRing?.(at, T.atrapada.radius, 0x86d47a);
        return true;
      },
    },
    // m6 Cerco a la Presa: Flecha Detonante sobre tu Presa le deja debajo un zarzal de 2 m 4 s
    m_cerco_presa: {
      name: 'Cerco a la Presa', desc: 'Flecha Detonante sobre tu Presa le deja debajo un zarzal que la ralentiza.',
      onCast(g, p, cast) { detCast(p, 'm_cerco_presa', cast); },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_m_detonante' || hit.echo || hit.trap || !e?.prey) return;
        const st = powerState(p, 'm_cerco_presa');
        if (st.done === st.seq) return;
        st.done = st.seq;
        spawnZarzal(g, p, e.pos, T.cercoPresa.dur, 'm_cerco_presa');
      },
    },
    // m8A Racimo de Cepos: Trampa de Cepo coloca 3 cepos en triángulo (35 % cada uno); el Coto los cuenta como uno
    m_racimo: {
      name: 'Racimo de Cepos', desc: 'Trampa de Cepo coloca 3 cepos en triángulo.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_t_cepo') return;
        const main = newestTrap(g, p, 'a_t_cepo');
        if (!main || main.data.cluster != null) return;
        main.data.cluster = main.uid;
        scaleTrap(main, T.racimo.mul);
        const d = aimDir(p, main.pos), base = Math.atan2(d.x, d.z);
        for (const a of [2 * Math.PI / 3, -2 * Math.PI / 3]) {
          const pos = { x: main.pos.x + Math.sin(base + a) * T.racimo.gap, z: main.pos.z + Math.cos(base + a) * T.racimo.gap };
          spawnCepo(g, p, pos, { mul: T.racimo.mul, skill: 'm_racimo', max: 6, cluster: main.uid });
        }
      },
    },
    // m8B Cepo Reforzado: si atrapa a un élite o a un jefe, el cepo estalla 3 veces (20 % cada una)
    m_cepo_reforzado: {
      name: 'Cepo Reforzado', desc: 'Si atrapa a un élite o a un jefe, el cepo estalla tres veces.',
      onHit(g, p, e, hit) {
        if (!isSpring(hit) || !isEliteish(e)) return;
        const f = fieldByUid(g, hit.trap.uid);
        const at = v3(f ? f.pos.x : e.pos.x, f ? f.pos.z : e.pos.z), X = T.reforzado;
        for (let i = 1; i <= X.n; i++) g.timers?.schedule?.(X.every * i, () => {
          if (!p.alive) return;
          g.dealArea?.(at, X.radius, X.coef, { hitInfo: { skill: 'm_cepo_reforzado', tags: TRAP_TAGS, elem: 'nature' }, from: at });
          g.spawnRing?.(at, X.radius, 0xc8a050);
        });
      },
    },
    // m9A Presas en Manada: hasta 3 Presas: tu primer élite y los 2 primeros enemigos que pisen una trampa
    m_manada: {
      name: 'Presas en Manada', desc: 'Tienes hasta 3 Presas: tu primer élite y los 2 primeros que pisen una trampa.',
      onHit(g, p, e, hit) { if (isSpring(hit) && e?.alive && !e.prey) addPrey(g, p, e, 'trap'); },
    },
    // m9B Presa Herida: tu Presa recibe +10 % de todo el grupo y cada trampa que pisa le llena 25 de Quebranto
    m_presa_herida: {
      name: 'Presa Herida', desc: 'Tu Presa recibe más daño de todo el grupo y sus trampas le llenan Quebranto.',
      onTick(g, p) { for (const e of preyList(p)) e.applyWeakness?.('m_presa_herida', T.herida.weak, 0.3); },
      onHit(g, p, e, hit) { if (isSpring(hit) && e?.prey && isBoss(e)) e.addStagger?.(T.herida.stagger, p); },
    },
    // m10A Zarzal Creciente: el Cerco crece 1 m/s (hasta 12 m) e inmoviliza a los que alcanza
    m_creciente: {
      name: 'Zarzal Creciente', desc: 'Cerco de Zarzas crece y atrapa a los que alcanza.',
      onTick(g, p) {
        const c = cercoOf(g, p);
        if (!c) return;
        const f = c.f, r = Math.min(T.creciente.max, c.r0 + T.creciente.perSec * Math.max(0, now(p) - c.at));
        if (!(r > f.radius + 1e-6)) return;
        const before = f.radius;
        f.radius = r;
        const reached = f._reached || (f._reached = new WeakSet());
        for (const e of g.enemies || []) {
          if (!e.alive || reached.has(e)) continue;
          const d = dist(e.pos, f.pos);
          if (d > before && d <= r) {
            reached.add(e);
            if (e.applyCC?.('root', c.root, { src: p }) > 0) cercoRooted(g, p, f);
          }
        }
      },
    },
    // m10B Zarzal Asfixiante: dentro del Cerco, el veneno al enemigo con más vida sube un 15 % cada segundo (hasta +90 %)
    m_asfixiante: {
      name: 'Zarzal Asfixiante', desc: 'Dentro del Cerco, el veneno al enemigo con más vida sube cada segundo.',
      procs: true,
      state: () => ({ target: null, n: 0, acc: 0, f: null }),
      onTick(g, p, dt) {
        const st = powerState(p, 'm_asfixiante'), c = cercoOf(g, p);
        if (!c) { Object.assign(st, { target: null, n: 0, acc: 0, f: null }); return; }
        let top = null;
        for (const e of g.enemies || []) if (e.alive && insideField(c.f, e.pos) && (!top || e.hp > top.hp)) top = e;
        if (top !== st.target || c.f !== st.f) Object.assign(st, { target: top, n: 0, acc: 0, f: c.f });
        if (!top) return;
        st.acc += dt;
        if (st.acc + 1e-9 < 1) return;
        st.acc -= 1;
        st.n = Math.min(T.asfixia.max / T.asfixia.perSec, st.n + 1);
      },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'm_asfixiante');
        if (!hit?.dot || hit.skill !== 'a_u_zarzas' || e !== st.target || !(st.n > 0) || !(hit.raw > 0)) return;
        dealProcDamage(g, e, hit.raw * T.asfixia.perSec * st.n / 100, { skill: 'm_asfixiante', source: 'power' });
      },
    },
    // m11 Metralla: cada cepo de Trampa de Cepo que estalla suelta 2 púas/rango a los cercanos (20 %)
    m_metralla: {
      name: 'Metralla', desc: 'Cada cepo de Trampa de Cepo que estalla suelta púas a enemigos cercanos.',
      state: () => ({}),
      onHit(g, p, e, hit) {
        if (!isBurst(hit) || !CHARGE_CEPOS.has(hit.trap.skill) || !once(powerState(p, 'm_metralla'), hit.trap.uid)) return;
        const f = fieldByUid(g, hit.trap.uid), at = f ? f.pos : e.pos;
        const foes = foesNear(g, at, T.metralla.range);
        const n = T.metralla.perRank * powerRank(p, 'm_metralla');
        for (let i = 0; i < n && foes.length; i++)
          shootArrow(g, p, { from: at, to: nth(foes, i).pos, coef: T.metralla.coef, skill: 'm_metralla', size: 0.06, color: 0xc8a050, range: T.metralla.range + 2 });
      },
    },
    // m12 Acoso: cada trampa que pisa tu Presa le llena 15 de Quebranto/rango (a un élite, lo ralentiza 30 % 3 s)
    m_acoso: {
      name: 'Acoso', desc: 'Cada trampa que pisa tu Presa le llena Quebranto o la ralentiza.',
      onHit(g, p, e, hit) {
        if (!isSpring(hit) || !e?.prey || !e.alive) return;
        if (isBoss(e)) e.addStagger?.(T.acoso.perRank * powerRank(p, 'm_acoso'), p);
        else if (e.def?.rank) e.applyCC?.('slow', T.acoso.slowT, { pct: T.acoso.slowPct, src: p });
      },
    },
    // m14 Semillas de Zarza: Flecha Detonante deja un zarzal de 2 m durante 4 s donde estalla (sin
    // blanco, donde acaba su vuelo; afterCast llega cuando la flecha termina)
    m_semillas: {
      name: 'Semillas de Zarza', desc: 'Flecha Detonante deja un zarzal donde estalla.',
      state: () => ({}),
      onCast(g, p, cast) { detCast(p, 'm_semillas', cast); },
      onHit(g, p, e, hit) { if (detFirst(p, 'm_semillas', hit)) powerState(p, 'm_semillas').at = { x: e.pos.x, z: e.pos.z }; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_m_detonante') return;
        const st = powerState(p, 'm_semillas'), at = st.at || detEnd(g, p, cast);
        st.at = null;
        spawnZarzal(g, p, at, T.semillas.dur, 'm_semillas');
      },
    },
    // m15A Cepo de Huida: al bajar del 50 % de vida, un cepo a tus pies inmoviliza 3 s a todos a 4 m (cada 30 s)
    m_cepo_huida: {
      name: 'Cepo de Huida', desc: 'Al bajar del 50 % de vida, inmovilizas a los enemigos cercanos.',
      state: () => ({}),
      onDamaged(g, p, info) {
        const max = p.stats?.maxHP || 1, line = max * T.huida.below;
        if (!(p.hp >= line) || !(p.hp - (info?.amount || 0) < line)) return;
        if (!takeCd(powerState(p, 'm_cepo_huida'), 'cd', T.huida.icd, p)) return;
        for (const e of foesNear(g, p.pos, T.huida.radius)) e.applyCC?.('root', T.huida.root, { src: p });
        g.spawnRing?.(p.pos.clone().setY(0.1), T.huida.radius, 0x86d47a);
        g.sfx?.('trap');
      },
    },
    // m15B Guarida: a 4 m de tus trampas armadas recibes un 15 % menos
    m_guarida: {
      name: 'Guarida', desc: 'Cerca de tus trampas armadas recibes menos daño.',
      condDr(p) {
        const R2 = T.guarida.radius * T.guarida.radius;
        return armedTraps(p.game, p).some(f => dist2(f.pos, p.pos) <= R2) ? T.guarida.dr : 0;
      },
    },
    // m16 Coto Cerrado: con 2+ trampas armadas, +6 %/rango de daño (y los zarzales +rango s: spawnZarzal)
    m_coto_cerrado: {
      name: 'Coto Cerrado', desc: 'Con 2 o más trampas armadas haces más daño y tus zarzales duran más.',
      condAdd(p) { return gaugeValue(p, 'coto') >= T.cerrado.min ? T.cerrado.perRank * powerRank(p, 'm_coto_cerrado') : 0; },
    },
    // m17 Zarzas Trepadoras: cada enemigo que inmoviliza el Cerco lo alarga 0,5 s/rango (hasta +4 s).
    // Cruces del anillo seguidos de inmovilización (la pone el Cerco: a_zarzas); Creciente y Bosque Vivo avisan solos.
    m_trepadoras: {
      name: 'Zarzas Trepadoras', desc: 'Cada enemigo que inmoviliza el Cerco de Zarzas lo alarga.',
      state: () => ({ f: null, side: new Map(), rt: new Map(), pend: [] }),
      onTick(g, p) {
        const st = powerState(p, 'm_trepadoras'), c = cercoOf(g, p);
        if (!c) { st.f = null; st.side.clear(); st.pend = []; return; }
        if (st.f !== c.f) { st.f = c.f; st.side.clear(); st.pend = []; }
        const t = now(p), rose = new Set();
        for (const e of g.enemies || []) {
          if (!e.alive) { st.side.delete(e); st.rt.delete(e); continue; }
          // inmovilizado desde el tic anterior (la inmovilización decae: solo sube con una nueva)
          const r = e.rootT || 0, prev = st.rt.get(e) ?? r;
          st.rt.set(e, r);
          if (r > prev + 1e-6) rose.add(e);
          const inside = dist2(e.pos, c.c) <= c.r0 * c.r0, was = st.side.get(e);
          if (was !== undefined && was !== inside) st.pend.push({ e, at: t });
          st.side.set(e, inside);
        }
        st.pend = st.pend.filter(x => {
          if (!x.e.alive || t - x.at > 0.35) return false;
          if (!rose.has(x.e)) return true;
          cercoRooted(g, p, c.f);
          return false;
        });
      },
    },
    // m18 Rearme Rápido: cada detonación que hace estallar un cepo tuyo de carga recarga rango s del Cepo y del Salto
    m_rearme: {
      name: 'Rearme Rápido', desc: 'Cada detonación que hace estallar un cepo tuyo recarga el Cepo y el Salto de Acecho.',
      state: () => ({ last: -9 }),
      onHit(g, p, e, hit) {
        if (!isBurst(hit) || !CHARGE_CEPOS.has(hit.trap.skill)) return;
        const st = powerState(p, 'm_rearme'), t = now(p);
        if (t - st.last <= T.rearme.gap + 1e-9) return;
        st.last = t;
        const s = T.rearme.perRank * powerRank(p, 'm_rearme');
        g.reduceCooldown?.(p, 'a_t_cepo', s);
        g.reduceCooldown?.(p, 'a_m_acecho', s);
      },
    },
    // m19 Rastro Fresco: al morir tu Presa, el más fuerte a 10 m pasa a ser tu Presa y ganas 10 de Energía/rango
    m_rastro: {
      name: 'Rastro Fresco', desc: 'Al morir tu Presa, el enemigo más fuerte cercano pasa a ser tu Presa.',
      onKill(g, p, e, kill) {
        if (!kill?.status?.prey) return;
        const strong = o => (isBoss(o) ? 2 : o.def?.rank ? 1 : 0);
        const next = foesNear(g, e.pos, T.rastro.range, e).sort((a, b) => strong(b) - strong(a) || (b.maxHP || 0) - (a.maxHP || 0))[0];
        if (!next) return;
        addPrey(g, p, next, 'elite');
        g.gainResource?.(p, T.rastro.energy * powerRank(p, 'm_rastro'));
      },
    },
    // m21 Rebrote: al acabarse, el Cerco de Zarzas deja 3 zarzales de 2 m durante 6 s
    m_rebrote: {
      name: 'Rebrote', desc: 'Al acabarse, el Cerco de Zarzas deja zarzales.',
      state: () => ({ f: null, c: null, r0: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'm_rebrote'), c = cercoOf(g, p);
        if (c) { Object.assign(st, { f: c.f, c: { x: c.c.x, z: c.c.z }, r0: c.r0 }); return; }
        if (!st.f) return;
        const { c: at, r0 } = st;
        st.f = null;
        for (let i = 0; i < T.rebrote.n; i++) {
          const a = i * 2 * Math.PI / T.rebrote.n;
          spawnZarzal(g, p, { x: at.x + Math.sin(a) * r0 * 0.6, z: at.z + Math.cos(a) * r0 * 0.6 }, T.rebrote.dur, 'm_rebrote');
        }
      },
    },
    // m22 Campo Sembrado: Flecha Detonante deja rango cepos armados donde cae (35 %; no gasta cargas)
    m_campo_sembrado: {
      name: 'Campo Sembrado', desc: 'Flecha Detonante deja cepos armados donde cae.',
      state: () => ({}),
      onCast(g, p, cast) { detCast(p, 'm_campo_sembrado', cast); },
      onHit(g, p, e, hit) { if (detFirst(p, 'm_campo_sembrado', hit)) powerState(p, 'm_campo_sembrado').at = { x: e.pos.x, z: e.pos.z }; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_m_detonante') return;
        const st = powerState(p, 'm_campo_sembrado');
        const at = st.at || detEnd(g, p, cast);          // sin blanco: donde acaba su vuelo
        st.at = null;
        const n = powerRank(p, 'm_campo_sembrado');
        // tras el estallido de la flecha (que detona tus trampas en su radio)
        g.timers?.schedule?.(0.15, () => {
          if (!p.alive) return;
          for (let i = 0; i < n; i++) {
            const a = i * 2 * Math.PI / n, r = n > 1 ? T.sembrado.gap : 0;
            spawnCepo(g, p, { x: at.x + Math.sin(a) * r, z: at.z + Math.cos(a) * r }, { mul: T.sembrado.mul, skill: 'm_campo_sembrado', max: T.sembrado.max, armT: 0 });
          }
        });
      },
    },
    // m24 Siembra de Espinas: cada cepo que atrapa o estalla deja un zarzal de 2 m durante 2 + 2·rango s
    m_siembra: {
      name: 'Siembra de Espinas', desc: 'Cada cepo que atrapa o estalla deja un zarzal.',
      state: () => ({}),
      onHit(g, p, e, hit) {
        if (!hit?.trap || !once(powerState(p, 'm_siembra'), hit.trap.uid)) return;
        const f = fieldByUid(g, hit.trap.uid);
        spawnZarzal(g, p, f ? f.pos : e.pos, T.siembra.base + T.siembra.perRank * powerRank(p, 'm_siembra'), 'm_siembra');
      },
    },
    // m25 Tierra Arrasada (final): cada cepo de Trampa de Cepo que estalla siembra rango cepos pequeños a 3 m
    // (30 %; esos no siembran; 6 vivos como mucho)
    m_tierra_arrasada: {
      name: 'Tierra Arrasada', desc: 'Cada cepo de Trampa de Cepo que estalla siembra cepos pequeños.',
      state: () => ({}),
      onHit(g, p, e, hit) {
        if (!isBurst(hit) || !CHARGE_CEPOS.has(hit.trap.skill) || !once(powerState(p, 'm_tierra_arrasada'), hit.trap.uid)) return;
        const f = fieldByUid(g, hit.trap.uid), at = { x: f ? f.pos.x : e.pos.x, z: f ? f.pos.z : e.pos.z };
        const n = powerRank(p, 'm_tierra_arrasada'), a0 = (hit.trap.uid % 7) * 0.9;
        g.timers?.schedule?.(0.15, () => {
          if (!p.alive) return;
          for (let i = 0; i < n; i++) {
            const a = a0 + i * 2 * Math.PI / n;
            spawnCepo(g, p, { x: at.x + Math.sin(a) * T.arrasada.dist, z: at.z + Math.cos(a) * T.arrasada.dist }, { mul: T.arrasada.mul, skill: 'm_tierra_arrasada', max: T.arrasada.max });
          }
        });
      },
    },
    // m26 Gran Cacería (final): si tu Presa pisa una trampa, todas tus trampas saltan a su alrededor y se
    // rearman a mitad de daño (una vez cada 12/9/6 s; esas no cuentan para Presa Atrapada ni para el ápice 4).
    // «Todas» incluye la que pisa (E4b-bugs): no se gasta (f.rearmOnce) y salta con las demás. Antes
    // pedía otra trampa armada a la vez y, con los cepos a los pies de la Presa, nunca la había. La que
    // pisa se mueve y se marca DESPUÉS de resolver su pisada (temporizador 0): esa pisada aún es entera
    // y cuenta para Presa Atrapada y el ápice
    m_gran_caceria: {
      name: 'Gran Cacería', desc: 'Si tu Presa pisa una trampa, todas tus trampas saltan a su alrededor.',
      state: () => ({}),
      onHit(g, p, e, hit) {
        if (!isSpring(hit) || !e?.prey || !e.alive) return;
        const traps = ownTraps(g, p);
        const stepped = traps.find(f => f.uid === hit.trap.uid) || null;
        if (!traps.length) return;
        const icd = T.caceria.icd[Math.max(1, powerRank(p, 'm_gran_caceria')) - 1] ?? T.caceria.icd[0];
        if (!takeCd(powerState(p, 'm_gran_caceria'), 'cd', icd, p)) return;
        const jump = (f, i) => {
          if (f.dead) return;
          const a = i * 2 * Math.PI / traps.length;
          f.pos.x = e.pos.x + Math.sin(a) * T.caceria.ring;
          f.pos.z = e.pos.z + Math.cos(a) * T.caceria.ring;
          f.armAt = (f.age || 0) + Math.max(0, f.data.armT ?? 0.5);
          if (!f.data.greatHunt) { f.data.greatHunt = true; scaleTrap(f, T.caceria.mul); }
        };
        traps.forEach((f, i) => {
          if (f !== stepped) { jump(f, i); return; }
          f.rearmOnce = true;
          if (g.timers) g.timers.schedule(0, () => jump(f, i)); else jump(f, i);
        });
        g.ui?.spawnText?.(e.pos.clone().setY((e.def?.scale || 1) + 1), '¡Gran Cacería!', 'txt-crit');
      },
    },
    // m27 Bosque Vivo (final): si 3 zarzales tuyos se tocan, forman un Cerco gratis de rango + 1 s que solo
    // inmoviliza (sin veneno ni estallido; uno vivo; una vez cada 8 s)
    m_bosque_vivo: {
      name: 'Bosque Vivo', desc: 'Si tres zarzales tuyos se tocan, forman un Cerco de Zarzas gratis.',
      state: () => ({ alive: null }),
      onTick(g, p) {
        const st = powerState(p, 'm_bosque_vivo');
        if (st.alive && !st.alive.dead) return;
        const zs = g.fieldsOf?.(p, { kind: 'm_zarzal' }) || [];
        const touch = (a, b) => dist2(a.pos, b.pos) <= (a.radius + b.radius) ** 2 + 1e-9;
        let tri = null;
        for (let i = 0; i < zs.length && !tri; i++)
          for (let j = i + 1; j < zs.length && !tri; j++)
            if (touch(zs[i], zs[j])) for (let k = j + 1; k < zs.length; k++) if (touch(zs[i], zs[k]) && touch(zs[j], zs[k])) { tri = [zs[i], zs[j], zs[k]]; break; }
        if (!tri || !takeCd(st, 'cd', T.bosque.icd, p)) return;
        const c = { x: (tri[0].pos.x + tri[1].pos.x + tri[2].pos.x) / 3, z: (tri[0].pos.z + tri[1].pos.z + tri[2].pos.z) / 3 };
        const def = p.cls?.skills?.find(s => s.id === 'a_u_zarzas');
        st.alive = g.spawnField?.('m_cerco', { pos: v3(c.x, c.z), radius: p.resolved?.a_u_zarzas?.radius || def?.radius || T.bosque.radius,
          dur: T.bosque.base + powerRank(p, 'm_bosque_vivo'), owner: p, data: { root: cercoRoot(p), skill: 'm_bosque_vivo', color: def?.color ?? 0x5a8a3a } }) || null;
        g.sfx?.('trap');
      },
    },
    // m28 Corazón del Bosque (ápice): 1) tus trampas armadas ralentizan un 30 % a 3 m · 2) matar a un élite
    // coloca un cepo gratis donde cae · 3) la Batida salta con 2 trampas (la lee la mecánica) · 4) cada 12
    // cepos de Trampa de Cepo que haces estallar (un Racimo cuenta 1), Cerco de Zarzas gratis (cada 90 s)
    m_corazon_bosque: {
      name: 'Corazón del Bosque', desc: 'Tus trampas ralentizan, los élites dejan cepos y las detonaciones llaman al Cerco.',
      state: () => ({ n: 0 }),
      onTick(g, p) {
        if (powerRank(p, 'm_corazon_bosque') < 1) return;
        const R2 = T.corazon.slowR * T.corazon.slowR, traps = armedTraps(g, p);
        if (!traps.length) return;
        // una sola ralentización por enemigo, aunque tenga varias trampas cerca
        for (const e of g.enemies || []) if (e.alive && traps.some(f => dist2(e.pos, f.pos) <= R2)) holdSlow(p, 'corazon', e, T.corazon.slowPct);
      },
      onKill(g, p, e) {
        if (powerRank(p, 'm_corazon_bosque') >= 2 && isEliteish(e)) spawnCepo(g, p, e.pos, { skill: 'm_corazon_bosque', max: 2 });
      },
      onHit(g, p, e, hit) {
        if (powerRank(p, 'm_corazon_bosque') < 4 || !isBurst(hit) || !CHARGE_CEPOS.has(hit.trap.skill)) return;
        const f = fieldByUid(g, hit.trap.uid);
        if (f?.data?.greatHunt) return;
        const st = powerState(p, 'm_corazon_bosque');
        if (!once(st, f?.data?.cluster ?? hit.trap.uid)) return;
        st.n = Math.min(T.corazon.every, st.n + 1);
        if (st.n < T.corazon.every || !takeCd(st, 'cd', T.corazon.icd, p)) return;
        st.n = 0;
        g.castEcho?.(p, 'a_u_zarzas', { at: { x: e.pos.x, z: e.pos.z } });
      },
    },
  };
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento (las del kit son del catálogo: skills-arquera.js)
// ============================================================
export function arqueraSkillBehaviors() {
  return {
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
  };
}

// ============================================================
// CAMPOS DE SUELO propios (tope por dueño: FIELD_CAP_PER_OWNER = 12, FIFO del núcleo)
// ============================================================
// eslint-disable-next-line no-var
var FIELDS_CACHE;
function arqueraFieldsCache() { return FIELDS_CACHE || (FIELDS_CACHE = buildFields()); }
export function arqueraFields() { return arqueraFieldsCache(); }

// ============================================================
// ASPECTO DEL CEPO (S-arquera, A10): `data.skin: 'cepo'` de Trampa de Cepo (y de los cepos que colocan
// los talentos: spawnCepo copia su molde). Lo registra buildFields en field-entities (defineTrapSkin):
//   · render: placa y dientes de metal alrededor de la placa de presión, más el anillo del radio de
//     disparo. Armándose, apagado; ARMADO, late suave una vez por segundo; CERRADO (f.closed) los dientes
//     se cierran en 0,08 s, va pegado al atrapado y brilla en naranja («¡detónalo!»); mordiendo a un jefe,
//     a medio cerrar y en naranja; a punto de estallar (f.flashT), en rojo
//   · snap: dientes metálicos (arqTrapSnap) y sacudida de 0,1 al cerrarse o morder
//   · burst: estallido de espinas (arqThornBurst + arqDetonBlast) y sacudida de 0,18 al detonarse
// ============================================================
// eslint-disable-next-line no-var
var CEPO_SKIN;
function cepoSkinDef() {
  if (CEPO_SKIN) return CEPO_SKIN;
  const K = Object.freeze({ teeth: 10, r: 0.42, open: -0.95, closed: 0.75, closeT: 0.08, pulse: 1,
    metal: 0xc9cdd2, dark: 0x3f444a, hot: 0xff7a10, flash: 0xff3030, snapShake: 0.1, burstShake: 0.18 });
  const disposeObj = o => o.traverse?.(m => { m.geometry?.dispose?.(); m.material?.dispose?.(); });
  const build = (g, f) => {
    const root = new THREE.Group();
    const col = f.data.color ?? 0x86d47a;
    const plate = new THREE.Mesh(new THREE.RingGeometry(0.16, K.r + 0.08, 28), new THREE.MeshBasicMaterial({ color: K.dark, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
    plate.rotation.x = -Math.PI / 2; plate.position.y = 0.03;
    const trigger = new THREE.Mesh(new THREE.CircleGeometry(0.15, 20), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    trigger.rotation.x = -Math.PI / 2; trigger.position.y = 0.04;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(K.r + 0.3, 28), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.rotation.x = -Math.PI / 2; glow.position.y = 0.05;
    const ring = new THREE.Mesh(new THREE.RingGeometry(f.radius * 0.93, f.radius, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
    root.add(plate, trigger, glow, ring);
    // dientes: un pivote por diente en el borde, que se inclina hacia fuera (abierto) o hacia el centro (cerrado)
    const toothGeo = new THREE.ConeGeometry(0.055, 0.24, 4);
    const toothMat = new THREE.MeshBasicMaterial({ color: K.metal });
    const teeth = [];
    for (let i = 0; i < K.teeth; i++) {
      const a = i * 2 * Math.PI / K.teeth;
      const pivot = new THREE.Object3D();
      pivot.position.set(Math.cos(a) * K.r, 0.05, Math.sin(a) * K.r);
      pivot.rotation.y = -a;                          // el eje x local apunta hacia fuera, radial
      const tooth = new THREE.Mesh(toothGeo, toothMat);
      tooth.position.y = 0.12;
      pivot.add(tooth);
      pivot.rotation.z = K.open;
      root.add(pivot);
      teeth.push(pivot);
    }
    g.fxGroup.add(root);
    return { root, plate, trigger, glow, ring, teeth, toothMat, close: 0 };
  };
  CEPO_SKIN = {
    render(g, f) {
      if (f.dead) {
        if (f.skin) { g.fxGroup.remove(f.skin.root); disposeObj(f.skin.root); f.skin = null; }
        return;
      }
      const s = f.skin || (f.skin = build(g, f));
      s.root.position.set(f.pos.x, 0, f.pos.z);
      const age = f.age || 0, armed = fieldArmed(f);
      const bitten = !f.closed && f.bitten?.size > 0;
      // dientes: abiertos → cerrados en closeT s desde que se cerró (mordiendo a un jefe, a medio cerrar)
      if (f.closed && s.closedAt == null) s.closedAt = age;
      if (!f.closed) s.closedAt = null;
      const want = f.closed ? Math.min(1, (age - s.closedAt) / K.closeT) : bitten ? 0.5 : 0;
      s.close += (want - s.close) * (want > s.close ? 1 : 0.3);
      for (const t of s.teeth) t.rotation.z = K.open + (K.closed - K.open) * s.close;
      // color y pulso: rojo al estallar · naranja cerrado o mordiendo · late armado · apagado armándose
      const k = 0.5 + 0.5 * Math.sin(age * 2 * Math.PI / K.pulse);
      const hot = f.closed || bitten;
      const c = f.flashT > 0 ? K.flash : hot ? K.hot : (f.data.color ?? 0x86d47a);
      s.trigger.material.color.setHex(c);
      s.glow.material.color.setHex(c);
      s.ring.material.color.setHex(c);
      s.toothMat.color.setHex(hot ? 0xffd9b0 : K.metal);
      if (f.flashT > 0) { s.glow.material.opacity = 0.85; s.ring.material.opacity = 0.7; }
      else if (hot) { const q = 0.5 + 0.5 * Math.sin(age * 2 * Math.PI * 3); s.glow.material.opacity = 0.12 + 0.2 * q; s.ring.material.opacity = f.closed ? 0 : 0.35; }
      else if (armed) { s.glow.material.opacity = 0.08 + 0.22 * k; s.ring.material.opacity = 0.18 + 0.2 * k; }
      else { s.glow.material.opacity = 0; s.ring.material.opacity = 0.1; }
      s.trigger.material.opacity = armed || hot ? 0.95 : 0.4;
      s.ring.visible = !f.closed;
    },
    snap(g, f) {
      g.emitFx?.('arqTrapSnap', { x: f.pos.x, y: 0.35, z: f.pos.z });
      g.addShake?.(K.snapShake);
    },
    burst(g, f) {
      g.emitFx?.('arqThornBurst', { x: f.pos.x, y: 0.4, z: f.pos.z });
      g.emitFx?.('arqDetonBlast', { x: f.pos.x, y: 0.6, z: f.pos.z });
      g.addShake?.(K.burstShake);
    },
  };
  return CEPO_SKIN;
}

function buildFields() {
  // aspecto del cepo (A10): field-entities lo usa con data.skin 'cepo'
  defineTrapSkin('cepo', cepoSkinDef());
  return {
    // Bomba de Humo (Paso 2e): ciega a los enemigos dentro: −pct % de daño mientras estén en el humo
    // (skills-arquera.js lo crea junto al humo, con su misma vida)
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
    // Zarzal (m6, m14, m21, m24; tres que se tocan forman el Cerco de Bosque Vivo): ralentiza un 40 %
    m_zarzal: {
      name: 'Zarzal',
      init(f) { f.acc = tune().lento.every; },
      // mira cada 0,1 s quién está dentro; la ralentización se mantiene sin cobrar Quebranto de más (holdSlow)
      tick(g, f, dt) {
        const every = tune().lento.every;
        f.acc += dt;
        if (f.acc < every - 1e-9) return;
        f.acc = Math.min(every, f.acc - every);
        if (!f.owner) return;
        for (const e of enemiesInField(g, f)) holdSlow(f.owner, 'zarzal', e, f.data.slowPct || 40);
      },
      render(g, f) { groundDecal(g, f, { disc: true, opacity: 0.22, color: f.data.color ?? 0x5f8f3a }); },
    },
    // Cerco vivo (m27 Bosque Vivo): anillo que inmoviliza al cruzarlo, sin veneno ni estallido
    m_cerco: {
      name: 'Cerco vivo',
      init(f) { f.side = new Map(); },
      tick(g, f) {
        for (const e of g.enemies || []) {
          if (!e.alive) { f.side.delete(e); continue; }
          const inside = insideField(f, e.pos), was = f.side.get(e);
          if (was !== undefined && was !== inside && (e.applyCC?.('root', f.data.root || 1.5, { src: f.owner }) || 0) > 0) cercoRooted(g, f.owner, f);
          f.side.set(e, inside);
        }
      },
      render(g, f) { groundDecal(g, f, { inner: 0.9, opacity: 0.4, color: f.data.color ?? 0x5a8a3a }); },
    },
  };
}

export function arqueraGauges() {
  return {};
}
