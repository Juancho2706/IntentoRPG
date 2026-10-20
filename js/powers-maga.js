// ============================================================
// PODERES de la MAGA (Piromante · Crionte · Arcanista) — Paso 2c.1 / 2c.2
// ============================================================
// Dueño: el trabajador de la clase en el Paso 2c.1 (docs/paso2-diseno.md §9.1.6).
// Solo se tocan ESTE archivo, js/talents-maga.js, js/fx-skills-maga.js y
// tests/test-powers-maga.mjs. js/powers.js importa y registra al cargar los cuatro
// mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-maga.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Por eso TODOS los
// helpers de este archivo son `function` (se elevan) y nada del nivel superior lee
// un binding importado: no hay `const` de módulo.
//
//  magaPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js).
//                        Ningún poder declara `mult` (test67 / test-powers-maga).
//  magaSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?(g,p,inst,dt), end?(g,p,inst) } }
//                        → el `behavior` de las 15 activas de talento de js/talents-maga.js.
//  magaFields()          campos de suelo propios: p_muro_fuego, k_ventisca, k_tumba, k_campo_helado.
//  magaGauges()          ninguno nuevo: los tres indicadores (calor, escarcha, cargas) son los
//                        base de spec-mechanics.js; aquí se POTENCIAN con gainGauge/spendGauge/onGauge.
//
// MAPA nodo → implementación (el texto del nodo manda; desviaciones al final):
//  Clase   c2 m_t_barrera (comp.) · c5A m_t_contrahechizo · c5B m_ralentizar ·
//          c12A m_t_inversion (comp. + passiveTick) · c12B m_t_bloque ·
//          c15 m_aura_intelecto (grupo: g.allies) · resto = stats/tv/mod del núcleo.
//  Piro    s0 p_ignicion (solo la Quemadura 60 %/4 s) · p_llamarada (comp.) ·
//          s4 p_llamarada_avivada · s6A p_propagacion · s6B p_acumular ·
//          s9 p_combustion (comp. + poder propio) · s13A p_fenix · s13B p_muro_fuego (comp. + campo) ·
//          x1 p_corazon_sol (⑬ onDotEnd) · x3 p_nova_solar.
//  Crionte s0 k_prision (comp.) · s4 k_prision_profunda · s6A k_ventisca (comp. + campo) ·
//          s6B k_nova_push · s7 k_icicle_dart · s8 k_frost_armor · s9 k_lanza (comp.) ·
//          s13A k_ice_tomb (campo) · s13B k_aliento (comp.) · s14 k_shatter_chain ·
//          s17 k_numb · x1 k_eternal_winter (campo; x2 fieldVuln) · x3 k_ice_age.
//  Arcan.  s0 a_orbe (comp.) · s4 a_orbe_resonante · s6A a_misiles (comp. tick) ·
//          s9 a_sello (comp.) · s11 a_clarity · s13A a_evocacion (comp.) ·
//          s14 a_resonance · s15 a_overvolt · x1 a_chain_crit · x2 a_arc_charge · x3 a_singularity.
//
// Paso 2c.2 — SIN PORTADORES/ANFITRIONES: cada nodo con efecto propio lleva SU poder
// (ninguno está en dos nodos) o una clave tv que consume el núcleo:
//  · Piromante s5 burningCrit → combat-math.condCritPct · x2 explodedDmg → condAddPct ·
//    s8 burnKillHeal / s15 burnKillMana / s12 critFireCdr → poder común nucleo_tv ·
//    s16 supernovaBurn → comportamiento m_u_supernova (js/skills-maga.js) al crear su
//    Quemadura · s9 Combustión → poder p_combustion (Fuego siempre crítico mientras dura el
//    buff) + stat del buff 'gaugeGain:calor' (Calor ×2).
//  · Crionte s15 manaOnKill → nucleo_tv · s16 Nova Perpetua → mod nova_hielo { zone } (la
//    Estela de una habilidad que ralentiza también ralentiza: núcleo).
//  · Arcanista s8 drHighMana → nucleo_tv (reducción condicional con maná > 50 %).
//  · Clase c7 barrierDr → g.shield(…, { dr }) del comportamiento m_t_barrera.
//  · DoT por la API del núcleo (g.replaceDoT / consumeDoT / dotRemaining / dotsOf): nadie
//    toca e._dots.
//
// DESVIACIONES / RODEOS LOCALES:
//  · Quemadura de Ignición NO se apila (s6B Concentración la deja apilar hasta 3, con
//    fuentes distintas): una nueva aplicación SUSTITUYE a la anterior (g.replaceDoT: lo que
//    le quedaba se pierde). Así Concentración «mejor contra jefes» tiene sentido. Se tira
//    sobre hit.raw (sin Π[×]: los tics ya los reciben).
//  · Llamarada detona (CONSUME, g.consumeDoT) las Quemaduras: 60 % de su daño restante al
//    instante (100 % con s4). Se detona ANTES de que el cono vuelva a encenderlas.
//  · Pirotecnia (s12, núcleo) no reduce el enfriamiento de las definitivas (Supernova).
//  · Nova Solar (x3) cuenta como «explosiones» las de Corazón del Sol y Conflagración.
//  · Prisión de Hielo: a los no jefes los congela 2 s (3 s con s4) y les pone las 5 capas;
//    a los jefes no les suma capas (su base de 5 capas ya da Aterido + 25 de stagger):
//    Aterido 4 s + 20 de stagger (35 con s4), escalado por staggerPct como todo stagger.
//  · Lanza de Hielo ×3 a los Congelados = +200 % del golpe como daño de poder (proc; no
//    hay `mult` nuevo) y «los astilla» = estallido de 3 m con el golpe medio de la Lanza +
//    un ASTILLAMIENTO (cuenta para s14 y x3).
//  · Inversión del Tiempo: el historial lo graba el passiveTick de su comportamiento (cada
//    0,25 s) desde que conoces la activa; sin historial, no gasta el enfriamiento.
//  · Bloque de Hielo: «cancelable» = la ESQUIVA lo rompe (volver a pulsar no llega al
//    comportamiento: la ranura está en enfriamiento).
//  · Sello del Archimago guarda el 25 % de la vida que pierde el objetivo marcado (sondeo
//    de su vida cada 0,1 s; no hay gancho ④ por objetivo marcado sin un poder en s9).
//  · Cadena de Rayos (x1): se quitó el mod `rayo.chain` (encadenaba TODOS los impactos con
//    −25 %/salto); a_chain_crit encadena solo el PRIMER crítico de cada Rayo (150 % a 3
//    enemigos; solo, 2 veces al mismo).
//  · Ralentizar (c5B) ignora el básico de ARMA que ahora también pasa por ⑦ onCast
//    (cast.weapon): antes no lo veía y así no cambia nada.
//  · Claves tv que consumen poderes de su MISMO nodo: fieldVuln (x2, campo de x1: si no hay
//    campo no hay nada que potenciar), clarityPct (s11 a_clarity), arcChargePct (x2 a_arc_charge).
//
// REGLAS: sin `powers.has(` fuera de js/powers*.js (aquí: hasPower), sin setTimeout
// (g.timers.schedule), sin Math.random en la simulación (p.combatRng). Daño de un poder:
// dealProcDamage. Control: e.applyCC. Curas: p.sustain / g.shield; restauraciones p.setHp.
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { gainGauge, gaugeValue, touchGauge } from './spec-mechanics.js';

// ------------------------------------------------------------
// CONSTANTES (perezosas: nada se evalúa al cargar el módulo)
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNE;
export function magaTuning() {
  return TUNE || (TUNE = Object.freeze({
    burnFrac: 0.6, burnT: 4, burnStacks: 3,             // Ignición: 60 % del golpe en 4 s (s6B: 3 pilas)
    detonatePct: 60, detonateBig: 100, avivadaCalor: 25, // Llamarada / Llamarada Avivada
    propagateN: 2, propagateR: 5,                        // Propagación
    coreFrac: 0.3, coreR: 2.5, novaEvery: 20,            // Corazón del Sol / Nova Solar
    fenixCd: 120, fenixHp: 0.5, fenixInvuln: 1,          // Fénix
    slowEvery: 8, slowPct: 50, slowT: 4,                 // Ralentizar (c5B)
    auraR: 15, auraDmg: 5, auraMp: 10,                   // Aura de Intelecto (c15)
    rewindT: 5, rewindEvery: 0.25, rewindKeep: 40,       // Inversión del Tiempo
    prisonLayers: 5, prisonFreeze: 2, prisonFreezeBig: 3, prisonStagger: 20, prisonStaggerBig: 35, numbT: 4,
    novaPush: 3, frostArmorLayers: 1, iceTombT: 4, iceTombR: 1.2, chainLayers: 2, chainR: 4, iceAgeEvery: 15,
    numbExtra: 0.15, winterT: 6, winterSlow: 50,
    orbCap: 2, chainCritN: 3, chainCritFrac: 1.5, chainCritR: 6, chainCritSolo: 0, singPct: 15, singT: 6, singMax: 2,
    misilesChargeEvery: 2,                               // Misiles Arcanos: 1 Carga cada 2 misiles (Paso 2e)
    resonanceCrit: 12, sealR: 3,
  }));
}

// ------------------------------------------------------------
// helpers (todas `function`: se elevan, seguras con el ciclo de módulos)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function now(p) { return p?.simT || 0; }
function rng(p) { return typeof p?.combatRng === 'function' ? p.combatRng() : 0.5; }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function alivesNear(g, pos, r, not = null) {
  return (g?.enemies || []).filter(o => o.alive && o !== not && dist2(o.pos, pos) <= r * r);
}
// vector de THREE a partir de uno existente (este módulo no importa THREE)
function at(ref, x, z, y = 0) { const v = ref.clone(); v.x = x; v.y = y; v.z = z; return v; }
function fx(g, preset, pos, y = 1.0) { if (preset && pos) { try { g.emitFx?.(preset, at(pos, pos.x, pos.z, y)); } catch { /* headless */ } } }
function ring(g, pos, r, color) { try { g.spawnRing?.(at(pos, pos.x, pos.z, 0), r, color); } catch { /* headless */ } }
function text(g, e, s, cls = 'txt-crit') { try { g.ui?.spawnText?.(at(e.pos, e.pos.x, e.pos.z, (e.def?.scale || 1) + 0.7), s, cls); } catch { /* */ } }
function invalidate(p, id = null) { if (!p) return; if (id) { if (p.resolved) delete p.resolved[id]; } else p.resolved = {}; }

// ---- Quemaduras (DoT del planificador, fuentes `<origen>:burn`; API del núcleo, sin e._dots) ----
// aplica una quemadura de `total` en `ticks` s con la fuente `key`, SIN apilar: la nueva
// SUSTITUYE a la anterior de esa fuente (g.replaceDoT: lo que le quedaba se pierde).
// Apilar es lo que da s6B Concentración (fuentes distintas).
function applyBurnTotal(g, e, total, ticks, key) {
  if (!e?.alive || !(total > 0) || !g?.replaceDoT) return 0;
  g.replaceDoT(e, Math.max(1, total), ticks, 1, key);
  return total;
}
// Ignición (Piromante s0): 60 % del golpe en 4 s (+burnDur/dotDur s, × burnPct/dotPct)
function burnProfile(p, base) {
  const T = magaTuning(), tv = p?.tv || {};
  const ticks = T.burnT + Math.max(0, Math.round((tv.burnDur || 0) + (tv.dotDur || 0)));
  const per = base * T.burnFrac / T.burnT * Math.max(0, 1 + ((tv.burnPct || 0) + (tv.dotPct || 0)) / 100);
  return { ticks, total: per * ticks };
}
function ignite(g, p, e, base) {
  if (!e?.alive || !(base > 0)) return 0;
  const { ticks, total } = burnProfile(p, base);
  if (!hasPower(p, 'p_acumular')) return applyBurnTotal(g, e, total, ticks, 'p_ignicion:burn');
  // Concentración (s6B): hasta 3 pilas; la nueva ocupa una libre o la más débil
  const keys = ['p_ignicion:burn', 'p_ignicion#2:burn', 'p_ignicion#3:burn'].slice(0, magaTuning().burnStacks);
  let best = keys[0], bv = Infinity;
  for (const k of keys) {
    const v = g.dotRemaining?.(e, k) || 0;
    if (v < bv) { bv = v; best = k; }
  }
  return applyBurnTotal(g, e, total, ticks, best);
}
function combustionOn(p) { return !!p?.buffs?.some(b => b.id === 'p_combustion' && b.t > 0); }

// ---- utilidades de lanzamiento ----
// grupo más numeroso (centro en el enemigo con más vecinos a r)
function densest(g, r = 4) {
  let best = null, bn = -1;
  for (const e of g?.enemies || []) {
    if (!e.alive) continue;
    const n = alivesNear(g, e.pos, r).length;
    if (n > bn) { bn = n; best = e; }
  }
  return best;
}
// lanza una habilidad «sola y gratis» (Nova Solar, Edad de Hielo) por el canal real como
// ECO a potencia completa (sin coste, sin enfriamiento, sin preparación) hacia `pos`. Si
// no está en la barra, toma prestada su ranura un instante.
function autoCast(g, p, skillId, pos) {
  const sk = p?.cls?.skills?.find(s => s.id === skillId);
  if (!sk || !g?.castSkillSlot || !p.hotbar) return false;
  let slot = Object.keys(p.hotbar).find(k => p.hotbar[k] === skillId);
  let borrowed = false, prev = null;
  if (!slot) { slot = (sk.slots || []).find(s => s !== 'lmb') || 'k4'; prev = p.hotbar[slot]; p.hotbar[slot] = skillId; borrowed = true; }
  const inp = g.input;
  const mw = inp ? inp.mouseWorld : null;
  if (inp && pos) inp.mouseWorld = at(pos, pos.x, pos.z, 0);
  let ok = false;
  try { ok = !!g.castSkillSlot(slot, 1); }
  catch (err) { try { console.warn(`[maga] autoCast ${skillId}`, err); } catch { /* */ } }
  finally {
    if (borrowed) p.hotbar[slot] = prev;
    if (inp && pos) inp.mouseWorld = mw;
  }
  return ok;
}
function scheduleAutoCast(g, p, skillId, fallbackPos) {
  g?.timers?.schedule?.(0.05, () => {
    if (!p.alive || g.player !== p) return;
    const e = densest(g) || null;
    const pos = e ? e.pos : fallbackPos;
    if (pos && autoCast(g, p, skillId, pos)) text(g, e || p, skillId === 'k_prision' ? '¡EDAD DE HIELO!' : '¡NOVA SOLAR!');
  });
}

// ---- Escarcha: astillamientos (Reacción Glacial s14 · Edad de Hielo x3) ----
// cada efecto es de SU poder: s14 suma capas alrededor, x3 cuenta astillamientos
function shatterChain(g, p, e) {
  const T = magaTuning();
  for (const o of alivesNear(g, e.pos, T.chainR, e)) gainGauge(p, 'escarcha', T.chainLayers, o);
  ring(g, e.pos, T.chainR, 0xbfeaff);
}
function iceAgeCount(g, p, e) {
  const T = magaTuning();
  const st = powerState(p, 'k_ice_age');
  st.n = (st.n || 0) + 1;
  if (st.n >= T.iceAgeEvery) { st.n = 0; scheduleAutoCast(g, p, 'k_prision', e.pos); }
}
// un astillamiento fuera de Cero Absoluto (estallido de la Lanza de Hielo): avisa a los
// poderes de astillamiento que tenga el héroe
function shatterEvent(g, p, e) {
  if (hasPower(p, 'k_shatter_chain')) shatterChain(g, p, e);
  if (hasPower(p, 'k_ice_age')) iceAgeCount(g, p, e);
}
// astillamiento de Cero Absoluto (m_shatter, powers-common): su proc mata con source
// 'power:m_shatter' (cada poder de astillamiento lo detecta en su propio onHit)
function isShatterKill(e, hit) { return hit?.source === 'power:m_shatter' && !e?.alive; }

// ---- Inversión del Tiempo: historial de vida/posición ----
// lo graba el passiveTick del comportamiento m_t_inversion (10 Hz mientras CONOCES la
// activa): una muestra cada 0,25 s, las últimas 40 (10 s). Si la grabación se corta
// (otro mundo, un hueco en el reloj) se empieza de cero: no se vuelve a un sitio ajeno.
function rewindState(p) { return p._mgRewind || (p._mgRewind = { hist: [], acc: 1, world: null }); }
function recordRewind(g, p, dt) {
  const T = magaTuning();
  const R = rewindState(p);
  const last = R.hist[R.hist.length - 1];
  if (R.world !== (g?.world || null) || (last && now(p) - last.t > T.rewindEvery * 4)) {
    R.world = g?.world || null; R.hist = []; R.acc = T.rewindEvery;
  }
  R.acc += dt;
  if (R.acc < T.rewindEvery - 1e-9) return;
  R.acc = 0;
  if (!p.alive) return;
  R.hist.push({ t: now(p), hp: p.hp, x: p.pos.x, z: p.pos.z });
  while (R.hist.length > T.rewindKeep) R.hist.shift();
}

// ---- Corazón del Sol: explosión al terminar una quemadura ----
function solarBurst(g, p, e, amount) {
  const T = magaTuning();
  if (!(amount > 0)) return;
  ring(g, e.pos, T.coreR, 0xffa040);
  fx(g, 'fireballBlast', e.pos, 0.6);
  for (const o of alivesNear(g, e.pos, T.coreR + 0.5 * (e.def?.scale || 1)))
    dealProcDamage(g, o, amount, { source: 'power:p_corazon_sol', elem: 'fire', tags: new Set(['area', 'fire']) });
  e.pyroBurst = true;                                    // Sol Naciente (x2): «ya estallaron»
  if (hasPower(p, 'p_nova_solar')) solarCount(g, p, e.pos);
}
function solarCount(g, p, pos) {
  const st = powerState(p, 'p_nova_solar');
  st.n = (st.n || 0) + 1;
  if (st.n >= magaTuning().novaEvery) { st.n = 0; scheduleAutoCast(g, p, 'm_u_supernova', pos); }
}

// ============================================================
// PODERES
// ============================================================
export function magaPowers() {
  const T = magaTuning();
  return {
    // ---------------------------------------------------- CLASE
    // c5B Ralentizar: cada 8 s, el siguiente hechizo (con daño) ralentiza 50 % 4 s
    m_ralentizar: {
      name: 'Ralentizar', desc: 'Cada 8 s, tu siguiente hechizo ralentiza un 50 % durante 4 s a quien golpea.',
      state: () => ({ readyAt: 0, armed: null, armedAt: -9 }),
      onCast(g, p, cast) {
        if (cast?.weapon) return;                 // el básico de ARMA (2c.2) no lo arma: como antes
        const st = powerState(p, 'm_ralentizar');
        if (now(p) < st.readyAt || !(cast?.prof?.coef > 0)) return;
        if (st.armed && now(p) - st.armedAt < 3) return;
        st.armed = cast.sk.id; st.armedAt = now(p);
      },
      onHit(g, p, e, hit) {
        const st = powerState(p, 'm_ralentizar');
        if (st.armed && hit?.skill === st.armed && e?.alive) e.applyCC?.('slow', T.slowT, { pct: T.slowPct, src: p });
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'm_ralentizar');
        if (st.armed && cast?.sk?.id === st.armed) { st.armed = null; st.readyAt = now(p) + T.slowEvery; }
      },
    },
    // c15 Aura de Intelecto: tú y los aliados a 15 m, +5 % de daño y +10 % de maná máx.
    m_aura_intelecto: {
      name: 'Aura de Intelecto', desc: 'Tú y los aliados a 15 m ganáis +5 % de daño y +10 % de maná máximo.',
      state: () => ({ acc: 0.5 }),
      stats: () => ({ dmgPct: T.auraDmg, mpPct: T.auraMp }),
      onTick(g, p, dt) {
        const st = powerState(p, 'm_aura_intelecto');
        st.acc += dt;
        if (st.acc < 0.5 - 1e-9) return;
        st.acc = 0;
        for (const a of g?.allies?.(p.pos, T.auraR) || []) {
          if (a === p) continue;
          const b = a.buffs?.find(x => x.id === 'm_aura_intelecto');
          if (b) { b.t = Math.max(b.t, 1); b.dur = Math.max(b.dur || 0, 1); }
          else a.addBuff?.('m_aura_intelecto', { dmgPct: T.auraDmg, mpPct: T.auraMp }, 1, { name: 'Aura de Intelecto', icon: '🧠', desc: `+${T.auraDmg}% de daño y +${T.auraMp}% de maná máximo` });
        }
      },
    },

    // ---------------------------------------------------- PIROMANTE
    // s0 Ignición: los golpes de Fuego aplican Quemadura (60 % del golpe en 4 s). Solo eso:
    // s5/s8/s12/s15/x2 son claves tv del núcleo y s16 la lee el comportamiento de Supernova
    p_ignicion: {
      name: 'Ignición', desc: 'Tus golpes de Fuego aplican Quemadura: el 60 % del golpe en 4 s.',
      onHit(g, p, e, hit) {
        if (hit?.proc || hit?.dot || hit?.elem !== 'fire') return;
        if (e?.alive) ignite(g, p, e, hit.raw || hit.dealt || 0);
      },
    },
    // s4 Llamarada Avivada: detona el 100 % y da 25 de Calor
    p_llamarada_avivada: {
      name: 'Llamarada Avivada', desc: 'Llamarada detona el 100 % del daño restante de las Quemaduras y te da 25 de Calor.',
      modifyResolve(p, sk, prof) { if (sk.id === 'p_llamarada') prof.detonatePct = T.detonateBig; },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'p_llamarada') gainGauge(p, 'calor', T.avivadaCalor); },
    },
    // s6A Propagación: si muere un enemigo en llamas, su Quemadura salta a 2 cercanos
    p_propagacion: {
      name: 'Propagación', desc: 'Si muere un enemigo en llamas, su Quemadura salta a 2 enemigos cercanos.',
      onKill(g, p, e) {
        const rem = g.dotRemaining?.(e, 'burn') || 0;
        if (!(rem > 0)) return;
        const near = alivesNear(g, e.pos, T.propagateR, e).sort((a, b) => dist2(a.pos, e.pos) - dist2(b.pos, e.pos)).slice(0, T.propagateN);
        for (const o of near) {
          applyBurnTotal(g, o, rem, T.burnT, 'p_ignicion:burn');
          try { g.spawnBeam?.(e.pos, o.pos, 0xff7722, 0.2); } catch { /* */ }
        }
      },
    },
    // s6B Concentración: la Quemadura se apila hasta 3 veces (la lee ignite)
    p_acumular: { name: 'Concentración', desc: 'La Quemadura de Ignición se acumula hasta 3 veces sobre el mismo objetivo.' },
    // s9 Combustión (poder del nodo; la activa homónima es un comportamiento aparte): el
    // Fuego es siempre crítico mientras dura su buff (addBuff/expirar → recompute invalida).
    // El Calor doble lo da la stat 'gaugeGain:calor' del propio buff.
    p_combustion: {
      name: 'Combustión', desc: 'Mientras dura Combustión, tus hechizos de Fuego son siempre críticos.',
      modifyResolve(p, sk, prof) { if (prof.elem === 'fire' && combustionOn(p)) prof.forceCrit = true; },
    },
    // s13A Fénix: una vez cada 2 minutos, al morir renaces con el 50 % de vida
    p_fenix: {
      name: 'Fénix', desc: 'Una vez cada 2 minutos, al morir renaces con el 50 % de vida.',
      state: () => ({ readyAt: 0 }),
      priority: -1,                                           // después de Muro Inquebrantable
      onLethal(g, p) {
        const st = powerState(p, 'p_fenix');
        if (now(p) < st.readyAt) return false;
        st.readyAt = now(p) + T.fenixCd;
        p.setHp(p.stats.maxHP * T.fenixHp, 'p_fenix');       // restauración (no escala ni usa la cubeta)
        p.grantInvuln?.(T.fenixInvuln);
        ring(g, p.pos, 2.5, 0xffaa33);
        fx(g, 'supernovaFlare', p.pos, 0.4);
        g.ui?.message?.('🔥 ¡Fénix! Renaces de tus cenizas', 3000);
        g.ui?.spawnText?.(p.pos, '¡FÉNIX!', 'txt-heal');
        g.sfx?.('fire');
        return true;
      },
    },
    // x1 Corazón del Sol: cuando una Quemadura termina, explota con el 30 % de su daño total (2c.2: era 40)
    p_corazon_sol: {
      name: 'Corazón del Sol', desc: 'Cuando una Quemadura termina, explota en área con el 30 % de su daño total.',
      // ⑬ solo si se agotó SOLA (no consumida por Llamarada, ni sustituida, ni al morir)
      onDotEnd(g, p, e, dot) { if (dot?.kind === 'burn' && e?.alive) solarBurst(g, p, e, (dot.total || 0) * T.coreFrac); },
    },
    // x3 Nova Solar: cada 20 explosiones (Corazón del Sol, Conflagración), Supernova sola y gratis
    p_nova_solar: {
      name: 'Nova Solar', desc: 'Cada 20 explosiones, Supernova se lanza sola y gratis.',
      state: () => ({ n: 0 }),
      onKill(g, p, e, kill) { if (hasPower(p, 'm_conflag') && !kill?.nested) solarCount(g, p, e.pos); },
    },

    // ---------------------------------------------------- CRIONTE
    // s4 Prisión Profunda: Congelado 3 s y 35 de stagger (lo lee el comportamiento)
    k_prision_profunda: {
      name: 'Prisión Profunda', desc: 'Prisión de Hielo congela 3 s y suma 35 de stagger a los jefes.',
      modifyResolve(p, sk, prof) { if (sk.id === 'k_prision') { prof.prisonFreeze = T.prisonFreezeBig; prof.prisonStagger = T.prisonStaggerBig; } },
    },
    // s6B Témpano: la Nova empuja 3 m (el aturdir 1 s y el radio los da su mod)
    k_nova_push: {
      name: 'Témpano', desc: 'Nova de Hielo empuja 3 m a los enemigos que toca.',
      onHit(g, p, e, hit) { if (hit?.skill === 'nova_hielo' && e?.alive) e.applyCC?.('knock', T.novaPush, { from: p.pos.clone(), src: p }); },
    },
    // s7 Carámbanos: el Dardo Arcano pasa a Escarcha (suma 1 capa por el indicador base)
    k_icicle_dart: {
      name: 'Carámbanos', desc: 'Dardo Arcano dispara carámbanos de Escarcha que suman 1 capa.',
      modifyResolve(p, sk, prof) {
        if (sk.id !== 'm_dardo') return;
        prof.elem = 'frost';
        const tags = new Set(prof.tags); tags.delete('arcane'); tags.add('frost');
        prof.tags = tags;
      },
    },
    // s8 Coraza de Escarcha: quien te golpea cuerpo a cuerpo gana 1 capa (el −5 % es tv.dmgReduc)
    k_frost_armor: {
      name: 'Coraza de Escarcha', desc: 'Quien te golpea cuerpo a cuerpo gana 1 capa de Escarcha.',
      onDamaged(g, p, dmg) { if (dmg?.melee && dmg.src?.alive) gainGauge(p, 'escarcha', T.frostArmorLayers, dmg.src); },
    },
    // s13A Tumba Glacial: los que mueren Congelados dejan un bloque que corta el paso 4 s
    k_ice_tomb: {
      name: 'Tumba Glacial', desc: 'Los enemigos que mueren Congelados dejan un bloque de hielo que corta el paso 4 s.',
      onKill(g, p, e, kill) {
        if (!(kill?.status?.frozen || e.frozenT > 0)) return;
        g.spawnField?.('k_tumba', { pos: e.pos, radius: T.iceTombR, dur: T.iceTombT, owner: p, data: { color: 0xbfeaff } });
      },
    },
    // s14 Reacción Glacial: cada astillamiento suma 2 capas a los enemigos en 4 m
    // (s15 Mente Gélida ya no lo lleva: su maná al matar es tv.manaOnKill del núcleo)
    k_shatter_chain: {
      name: 'Reacción Glacial', desc: 'Cada astillamiento suma 2 capas a los enemigos en 4 m.',
      procs: true,
      onHit(g, p, e, hit) { if (isShatterKill(e, hit)) shatterChain(g, p, e); },
    },
    // s17 Frío Implacable: los Ateridos atacan un 15 % más lento (sobre el −15 % base)
    k_numb: {
      name: 'Frío Implacable', desc: 'Los enemigos Ateridos atacan un 15 % más lento.',
      onTick(g, p, dt) {
        for (const e of g?.enemies || []) if (e.alive && e.numbT > 0 && e.atkCd > 0) e.atkCd += T.numbExtra * dt;
      },
    },
    // x1 Invierno Eterno: la Nova deja un campo helado 6 s (+1 capa/s, −50 % de movimiento).
    // (El suelo helado de s16 Nova Perpetua es la Estela de la Nova: la ralentiza el núcleo.)
    k_eternal_winter: {
      name: 'Invierno Eterno', desc: 'Nova de Hielo deja un campo helado de 6 s que suma 1 capa por segundo y ralentiza un 50 %.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'nova_hielo') return;
        g.spawnField?.('k_campo_helado', { pos: p.pos, radius: cast.prof?.radius || 3.3, dur: T.winterT, owner: p, data: { color: 0x9fe3ff } });
      },
    },
    // x3 Edad de Hielo: cada 15 astillamientos, Prisión de Hielo sola y gratis
    k_ice_age: {
      name: 'Edad de Hielo', desc: 'Cada 15 astillamientos, Prisión de Hielo se lanza sola y gratis sobre el grupo más numeroso.',
      state: () => ({ n: 0 }),
      procs: true,
      onHit(g, p, e, hit) { if (isShatterKill(e, hit)) iceAgeCount(g, p, e); },
    },

    // ---------------------------------------------------- ARCANISTA
    // s4 Orbe Resonante: +1 Carga por enemigo golpeado por el Orbe (máx. 2 por lanzamiento)
    a_orbe_resonante: {
      name: 'Orbe Resonante', desc: 'Orbe Arcano te da 1 Carga Arcana por enemigo golpeado (máx. 2 por lanzamiento).',
      state: () => ({ n: 0 }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'a_orbe') powerState(p, 'a_orbe_resonante').n = 0; },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_orbe') return;
        const st = powerState(p, 'a_orbe_resonante');
        if (st.n >= T.orbCap) return;
        if (gainGauge(p, 'cargas', 1) > 0) st.n++;
      },
    },
    // s11 Claridad: descargar 4 Cargas → X % de que tu siguiente Rayo sea gratis
    a_clarity: {
      name: 'Claridad', desc: 'Descargar 4 Cargas puede dejar gratis tu siguiente Rayo.',
      state: () => ({ free: false }),
      onGauge(g, p, id, ev, n) {
        if (id !== 'cargas' || ev !== 'spent' || n < 4) return;
        if (rng(p) * 100 < (p.tv?.clarityPct || 0)) {
          powerState(p, 'a_clarity').free = true;
          invalidate(p, 'rayo');
          g?.ui?.spawnText?.(p.pos, '¡Claridad!', 'txt-mana');
        }
      },
      modifyResolve(p, sk, prof) { if (sk.id === 'rayo' && powerState(p, 'a_clarity').free) prof.cost = 0; },
      onCast(g, p, cast) {
        const st = powerState(p, 'a_clarity');
        if (st.free && cast?.sk?.id === 'rayo') { st.free = false; invalidate(p, 'rayo'); }
      },
    },
    // s14 Resonancia: con 4 Cargas, +15 % de crítico Arcano y las Cargas no se desvanecen
    a_resonance: {
      name: 'Resonancia', desc: 'Con 4 Cargas, tus hechizos Arcanos tienen +15 % de crítico y las Cargas no se desvanecen.',
      condCrit(p, e, hit) { return hit?.elem === 'arcane' && gaugeValue(p, 'cargas') >= 4 ? T.resonanceCrit : 0; },
      onTick(g, p) { if (gaugeValue(p, 'cargas') > 0) touchGauge(p, 'cargas'); },
    },
    // s15 Sobretensión: con 4 Cargas, el Dardo Arcano atraviesa
    a_overvolt: {
      name: 'Sobretensión', desc: 'Con 4 Cargas, Dardo Arcano atraviesa a los enemigos.',
      modifyResolve(p, sk, prof) { if (sk.id === 'm_dardo' && gaugeValue(p, 'cargas') >= 4) prof.pierce = true; },
      onGauge(g, p, id) { if (id === 'cargas') invalidate(p, 'm_dardo'); },
    },
    // x1 Cadena de Rayos: el primer crítico de cada Rayo salta a 3 enemigos con el 50 %;
    // si está solo, lo golpea dos veces
    a_chain_crit: {
      name: 'Cadena de Rayos', desc: 'Los críticos de Rayo saltan a 3 enemigos con el 150 % del daño; sin otro enemigo cerca no saltan.',
      state: () => ({ done: false }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'rayo') powerState(p, 'a_chain_crit').done = false; },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'rayo' || !hit.crit) return;
        const st = powerState(p, 'a_chain_crit');
        if (st.done) return;
        st.done = true;
        const amt = (hit.dealt || 0) * T.chainCritFrac;
        if (!(amt > 0)) return;
        const opts = { source: 'power:a_chain_crit', skill: 'rayo', elem: 'arcane', tags: new Set(['arcane', 'chain']) };
        const others = alivesNear(g, e.pos, T.chainCritR, e).sort((a, b) => dist2(a.pos, e.pos) - dist2(b.pos, e.pos)).slice(0, T.chainCritN);
        if (others.length) {
          let from = e;
          for (const o of others) { try { g.spawnBeam?.(from.pos, o.pos, 0xd6b8ff, 0.18); } catch { /* */ } dealProcDamage(g, o, amt, opts); from = o; }
        } else if (e.alive) {
          for (let i = 0; i < T.chainCritSolo && e.alive; i++) dealProcDamage(g, e, amt, opts);
        }
      },
    },
    // x2 Arco Eterno: cada salto de la cadena puede dar 1 Carga (se suma al TERMINAR el Rayo,
    // para que no la gaste el mismo Rayo que la genera)
    a_arc_charge: {
      name: 'Arco Eterno', desc: 'Cada salto de la Cadena de Rayos puede darte 1 Carga Arcana.',
      priority: -1, procs: true,
      state: () => ({ pending: 0 }),
      onHit(g, p, e, hit) {
        if (hit?.source !== 'power:a_chain_crit') return;
        if (rng(p) * 100 < (p.tv?.arcChargePct || 0)) powerState(p, 'a_arc_charge').pending++;
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'rayo') return;
        const st = powerState(p, 'a_arc_charge');
        if (st.pending > 0) { gainGauge(p, 'cargas', st.pending); st.pending = 0; }
      },
    },
    // x3 Singularidad: descargar 4 Cargas → el objetivo recibe +15 % de daño 6 s (hasta 2 veces)
    a_singularity: {
      name: 'Singularidad', desc: 'Descargar 4 Cargas hace que el objetivo reciba +15 % de daño durante 6 s (hasta 2 veces).',
      state: () => ({ target: null }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'rayo') powerState(p, 'a_singularity').target = null; },
      onHit(g, p, e, hit) { if (hit?.skill === 'rayo') { const st = powerState(p, 'a_singularity'); if (!st.target) st.target = e; } },
      onGauge(g, p, id, ev, n) {
        if (id !== 'cargas' || ev !== 'spent' || n < 4) return;
        const e = powerState(p, 'a_singularity').target;
        if (!e?.alive) return;
        const cur = e.debuffs?.a_singularity;
        const stacks = Math.min(T.singMax, (cur && cur.t > 0 ? Math.round(cur.pct / T.singPct) : 0) + 1);
        e.applyWeakness?.('a_singularity', T.singPct * stacks, T.singT);
        text(g, e, `Singularidad ×${stacks}`, 'txt-mana');
      },
    },
  };
}

// ============================================================
// COMPORTAMIENTOS de las activas de talento
// ============================================================
// cast = { sk, prof, slot, target, enemy, ctx, done } (MEMORIA.md §7 punto 3)
function refund(g, p, sk, msg) {
  if (p.cds) p.cds[sk.id] = 0;
  if (msg) g.ui?.message?.(msg);
}
function aimDir(p, target) {
  let dx = (target?.x ?? p.pos.x) - p.pos.x, dz = (target?.z ?? p.pos.z) - p.pos.z;
  let l = Math.hypot(dx, dz);
  if (l < 1e-3) { const ry = p.group?.rotation?.y || 0; dx = Math.sin(ry); dz = Math.cos(ry); l = 1; }
  return { x: dx / l, z: dz / l };
}
function dirVec(p, d) { return at(p.pos, d.x, d.z, 0); }
// golpe directo de la habilidad a `e` (tirada + takeDamage + efectos del perfil)
function strike(p, ctx, e, coef = ctx.coef) {
  const prof = ctx.prof;
  const { dmg, crit } = p.rollDamage(coef, prof.critBonus, prof.addPct, e, ctx.hitInfo);
  const dealt = e.takeDamage(dmg, crit, ctx.dmgOpts) || 0;
  ctx.hit(e, dealt);
  return dealt;
}
// enemigos en el radio de un área (mismo criterio que Game.dealArea)
function inArea(g, center, rad) {
  return (g.enemies || []).filter(e => { if (!e.alive) return false; const r = rad + 0.5 * (e.def?.scale || 1); return dist2(e.pos, center) <= r * r; });
}
// orbe que atraviesa y rebota: un segmento de proyectil desde `from` hacia `to`
function orbSegment(g, ctx, from, to, left, done) {
  const { p, prof, sk } = ctx;
  const speed = prof.speed || 6, range = prof.range || 14;
  g.spawnProjectile({
    from: at(from, from.x, from.z, 1.0), to: at(to, to.x, to.z, 1.0),
    speed, range, friendly: true, pierce: true, color: ctx.color ?? sk.color, size: 0.34,
    rollAt: e => p.rollDamage(ctx.coef, prof.critBonus, prof.addPct, e, ctx.hitInfo),
    ...ctx.dmgOpts,
    impactPreset: ctx.fx?.impact,
    onHit: (e, dealt) => ctx.hit(e, dealt),
  });
  const d = aimDir({ pos: from, group: p.group }, to);
  const end = g.clampWalkable ? g.clampWalkable(from, at(from, from.x + d.x * range, from.z + d.z * range), range) : at(from, from.x + d.x * range, from.z + d.z * range);
  g.timers.schedule(range / Math.max(1, speed), () => {
    if (left <= 0 || !p.alive || g.player !== p) { done(); return; }
    // rebote: hacia el enemigo vivo más cercano al final del recorrido; si no hay, de vuelta
    const tgt = (g.enemies || []).filter(o => o.alive).sort((a, b) => dist2(a.pos, end) - dist2(b.pos, end))[0];
    const back = tgt && dist2(tgt.pos, end) > 0.25 ? tgt.pos : at(end, end.x - d.x * range, end.z - d.z * range);
    ring(g, end, 0.9, ctx.color ?? sk.color);
    orbSegment(g, ctx, end, back, left - 1, done);
  });
}

export function magaSkillBehaviors() {
  const T = magaTuning();
  const B = {
    // ---- clase ----
    // Barrera de Maná: escudo del 30 % del maná máximo, 8 s. Escudo Prismático (c7): −X %
    // de daño recibido mientras el escudo aguanta (g.shield con `dr`: se va con el escudo)
    m_t_barrera: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 8;
        const amt = (sk.shieldManaPct || 30) / 100 * (p.stats.maxMP || 0) * (prof.buffMul || 1);
        g.shield(amt, { target: 'self', dur, src: 'm_t_barrera', dr: p.tv?.barrierDr || 0 });
        ring(g, p.pos, 1.4, ctx.color ?? sk.color);
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        return ctx.res;
      },
    },
    // Contrahechizo: interrumpe y silencia 3 s al lanzador a 12 m (prefiere al que está
    // lanzando); a los jefes, applyCC('interrupt') ya suma 20 de stagger
    m_t_contrahechizo: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const range = prof.range || sk.range || 12;
        const aim = cast.target || p.pos;
        const cand = alivesNear(g, p.pos, range + 0.5);
        const e = cand.filter(o => o.casting).sort((a, b) => dist2(a.pos, aim) - dist2(b.pos, aim))[0]
          || cand.sort((a, b) => dist2(a.pos, aim) - dist2(b.pos, aim))[0];
        if (!e) { refund(g, p, sk, 'Ningún enemigo al alcance'); return ctx.res; }
        p.faceToward?.(e.pos);
        e.applyCC('interrupt', sk.silence || 3, { src: p });
        ctx.res.hits++;
        try { g.spawnBeam?.(p.pos, e.pos, ctx.color ?? sk.color, 0.2); } catch { /* */ }
        fx(g, ctx.fx?.impact, e.pos, 1.6);
        text(g, e, '¡Silenciado!', 'txt-mana');
        return ctx.res;
      },
    },
    // Inversión del Tiempo: vuelves a la vida y la posición de hace 5 s. El historial lo
    // graba passiveTick (10 Hz desde que conoces la activa, esté o no en la barra)
    m_t_inversion: {
      passiveTick(g, p, dt) { recordRewind(g, p, dt); },
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const want = now(p) - (sk.rewind || T.rewindT);
        const hist = rewindState(p).hist;
        let snap = null;
        for (const s of hist) if (s.t <= want + 1e-6) snap = s;
        if (!snap && hist.length && hist[0].t < now(p) - 0.5) snap = hist[0];
        if (!snap) { refund(g, p, sk, 'Inversión del Tiempo: aún no hay un instante al que volver'); return ctx.res; }
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        ring(g, p.pos, 1.2, ctx.color ?? sk.color);
        if (!g.world?.grid || g.world.grid.walkable(snap.x, snap.z)) { p.pos.x = snap.x; p.pos.z = snap.z; }
        if (snap.hp > 0) p.setHp(snap.hp, 'm_t_inversion');   // restauración
        p.moveTarget = null;
        ring(g, p.pos, 1.4, ctx.color ?? sk.color);
        fx(g, ctx.fx?.impact, p.pos, 1.0);
        return ctx.res;
      },
    },
    // Bloque de Hielo: inmune 4 s, sin moverte ni atacar; la esquiva lo rompe antes
    m_t_bloque: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 4;
        const hold = { x: p.pos.x, z: p.pos.z };
        const until = g.timers.now + dur;
        const Bk = { on: true };
        p._mgBlock = Bk;
        p.grantInvuln(dur);
        p.castLock = Math.max(p.castLock || 0, dur);
        p.moveTarget = p.attackTarget = null;
        const end = (broken) => {
          Bk.on = false;
          if (p._mgBlock === Bk) p._mgBlock = null;
          p.castLock = 0;
          if (broken) { p.invulnT = 0; g.ui?.spawnText?.(p.pos, '¡Hielo roto!', 'txt-mana'); }
        };
        const step = () => {
          if (!Bk.on || p._mgBlock !== Bk) return;
          if (!p.alive || g.timers.now >= until - 1e-9) { end(false); return; }
          if (p.dodgeT > 0) { end(true); return; }
          p.pos.x = hold.x; p.pos.z = hold.z;
          p.atkCd = Math.max(p.atkCd || 0, 0.1);
          p.castLock = Math.max(p.castLock || 0, 0.1);
          g.timers.schedule(0.05, step);
        };
        g.timers.schedule(0.05, step);
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        ring(g, p.pos, 1.3, ctx.color ?? sk.color);
        return ctx.res;
      },
    },

    // ---- Piromante ----
    // Llamarada: cono de 7 m; DETONA las Quemaduras (60 % / 100 % con s4) y luego golpea
    p_llamarada: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const d = aimDir(p, cast.target);
        const dir = dirVec(p, d);
        p.faceToward?.(at(p.pos, p.pos.x + d.x, p.pos.z + d.z));
        p.swing = 1;
        const rad = prof.radius || 7;
        const list = g.enemiesInCone(p.pos, dir, rad, prof.angle || 70);
        const pct = prof.detonatePct || sk.detonatePct || T.detonatePct;
        for (const e of list) {
          const rem = g.consumeDoT?.(e, 'burn') || 0;
          if (rem > 0) {
            dealProcDamage(g, e, rem * pct / 100, { source: 'power:p_llamarada', skill: 'p_llamarada', elem: 'fire', tags: prof.tags });
            fx(g, 'fireballBlast', e.pos, 0.8);
          }
        }
        let n = 0;
        for (const e of list) if (e.alive) { strike(p, ctx, e); n++; }
        if (n) p.onDealHit();
        const front = at(p.pos, p.pos.x + d.x * rad * 0.5, p.pos.z + d.z * rad * 0.5);
        ctx.zoneCenter = front; ctx.zoneRad = rad * 0.5;
        ring(g, front, rad * 0.5, ctx.color ?? sk.color);
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        fx(g, ctx.fx?.impact, front, 0.8);
        return ctx.res;
      },
    },
    // Combustión: 10 s de Fuego siempre crítico (poder p_combustion del nodo s9) y Calor
    // doble (stat 'gaugeGain:calor' del buff: +100 % de lo ganado con gaugeMult 2)
    p_combustion: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const gain = Math.max(0, ((sk.gaugeMult || 2) - 1) * 100);
        p.addBuff('p_combustion', { 'gaugeGain:calor': gain }, prof.dur || sk.dur || 10, { name: sk.name, icon: sk.icon, desc: 'Fuego siempre crítico y el Calor se llena el doble' });
        ring(g, p.pos, 1.6, ctx.color ?? sk.color);
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        fx(g, ctx.fx?.extra, p.pos, 0.2);
        g.addShake?.(0.2);
        return ctx.res;
      },
    },
    // Muro de Fuego: línea de 8 m (perpendicular a la mira) 5 s; quema y bloquea el paso
    p_muro_fuego: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const c = cast.target || p.pos;
        const d = aimDir(p, c);
        const half = (sk.length || 8) / 2 * (prof.radiusMul || 1);
        g.spawnField('p_muro_fuego', { pos: c, radius: half, dur: prof.dur || sk.dur || 5, owner: p,
          data: { ux: -d.z, uz: d.x, nx: d.x, nz: d.z, half, width: sk.width || 1, blocks: sk.blocks !== false,
            dps: ctx.coef > 0 ? ctx.avgHit : 0, skill: sk.id, tags: prof.tags, color: ctx.color ?? sk.color, preset: ctx.fx?.extra || null } });
        ctx.zoneCenter = at(c, c.x, c.z); ctx.zoneRad = 2;
        fx(g, ctx.fx?.aura, c, 0.3);
        return ctx.res;
      },
    },

    // ---- Crionte ----
    // Prisión de Hielo: 5 capas → Congelados 2 s (3 s con s4); jefes: Aterido + 20/35 de stagger
    k_prision: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const center = at(cast.target || p.pos, (cast.target || p.pos).x, (cast.target || p.pos).z);
        const rad = prof.radius || 4;
        p.faceToward?.(center);
        const freeze = prof.prisonFreeze || sk.freezeDur || T.prisonFreeze;
        const stag = prof.prisonStagger || sk.bossStagger || T.prisonStagger;
        // primero el hielo (la congelación larga gana a la de 1,5 s del indicador), luego el golpe
        for (const e of inArea(g, center, rad)) {
          if (isBoss(e)) { e.numbT = Math.max(e.numbT || 0, T.numbT); e.addStagger?.(stag, p); continue; }
          e.applyCC('freeze', freeze, { src: p });
          gainGauge(p, 'escarcha', Math.max(0, (sk.layers || T.prisonLayers) - gaugeValue(p, 'escarcha', e)), e);
        }
        g.dealArea(center, rad, ctx.coef, ctx.areaOpts);
        ctx.zoneCenter = center; ctx.zoneRad = rad;
        ring(g, center, rad, ctx.color ?? sk.color);
        fx(g, ctx.fx?.aura, center, 0.4);
        fx(g, ctx.fx?.extra, center, 0.2);
        g.addShake?.(0.25);
        return ctx.res;
      },
    },
    // Lanza de Hielo: perforante; ×3 a los Congelados y los astilla (estallido de 3 m)
    k_lanza: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        p.faceToward?.(cast.target);
        p.swing = 1;
        let finished = false;
        const finish = () => { if (!finished) { finished = true; cast.done(ctx.res); } };
        g.fireProjectile(ctx, {
          pierce: true, size: 0.22,
          onEnemy: (e, dealt) => {
            if (isBoss(e) || !(e.frozenT > 0)) return;
            if (e.alive && dealt > 0) dealProcDamage(g, e, dealt * ((sk.frozenMult || 3) - 1), { source: 'power:k_lanza', skill: 'k_lanza', elem: 'frost', tags: prof.tags });
            const r = sk.burstRadius || 3;
            for (const o of alivesNear(g, e.pos, r, e)) dealProcDamage(g, o, ctx.avgHit, { source: 'power:k_lanza', skill: 'k_lanza', elem: 'frost', tags: new Set(['area', 'frost']) });
            ring(g, e.pos, r, ctx.color ?? sk.color);
            fx(g, ctx.fx?.extra, e.pos, 0.8);
            text(g, e, '¡ASTILLADO!');
            shatterEvent(g, p, e);
          },
        });
        g.timers.schedule((prof.range || 13) / Math.max(1, prof.speed || 20) + 0.05, finish);
        return undefined;
      },
    },
    // Ventisca: tormenta de 5 m 6 s; 30 % del arma por segundo y +1 capa por segundo
    k_ventisca: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const c = cast.target || p.pos;
        g.spawnField('k_ventisca', { pos: c, radius: prof.radius || 5, dur: prof.dur || 6, owner: p,
          data: { dps: ctx.coef > 0 ? ctx.avgHit : 0, layers: sk.layersPerSec || 1, slow: prof.slow, slowPct: prof.slowPct, skill: sk.id, tags: prof.tags,
            color: ctx.color ?? sk.color, preset: ctx.fx?.aura || null } });
        ctx.zoneCenter = at(c, c.x, c.z); ctx.zoneRad = prof.radius || 5;
        ring(g, c, prof.radius || 5, ctx.color ?? sk.color);
        fx(g, ctx.fx?.extra, c, 0.3);
        return ctx.res;
      },
    },
    // Aliento Boreal: cono de 6 m, empuja 4 m y deja 3 capas (el golpe de Escarcha da 1)
    k_aliento: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const d = aimDir(p, cast.target);
        p.faceToward?.(at(p.pos, p.pos.x + d.x, p.pos.z + d.z));
        p.swing = 1;
        const from = p.pos.clone();
        const list = g.enemiesInCone(p.pos, dirVec(p, d), prof.radius || 6, prof.angle || 70);
        for (const e of list) {
          if (!e.alive) continue;
          strike(p, ctx, e);
          if (!e.alive) continue;
          e.applyCC('knock', (sk.knock || 4) * (prof.rangeMul || 1), { from, src: p });
          const want = sk.layers || 3;
          gainGauge(p, 'escarcha', Math.max(0, want - 1), e);
        }
        if (list.length) p.onDealHit();
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        fx(g, ctx.fx?.impact, at(p.pos, p.pos.x + d.x * 3, p.pos.z + d.z * 3), 0.8);
        return ctx.res;
      },
    },

    // ---- Arcanista ----
    // Orbe Arcano: lento, atraviesa y rebota 2 veces (cada segmento golpea de nuevo)
    a_orbe: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        p.faceToward?.(cast.target);
        p.swing = 1;
        let finished = false;
        const done = () => { if (!finished) { finished = true; cast.done(ctx.res); } };
        orbSegment(g, ctx, p.pos.clone(), cast.target || p.pos, sk.bounces ?? 2, done);
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        return undefined;
      },
    },
    // Misiles Arcanos: canalización genérica (type channel); cada misil devuelve 1 % de maná
    a_misiles: {
      tick(g, p, inst, interval) {
        const ctx = inst.ctx, prof = ctx.prof, sk = ctx.sk;
        const range = Math.max(2, prof.range || 10);
        let e = inst.target;
        if (!e || !e.alive || e.pos.distanceTo(p.pos) > range + 1) e = inst.target = g.nearestEnemy(range, ctx.target) || g.nearestEnemy(range) || null;
        if (!e) return;
        p.faceToward?.(e.pos);
        strike(p, ctx, e);
        p.onDealHit();
        g.gainResource(p, (p.stats.maxMP || 0) * (sk.manaPerTickPct || 1) / 100);
        // Paso 2e: cada 2 misiles, 1 Carga Arcana (la variante ofensiva de la Arcanista carga el Rayo)
        inst._missiles = (inst._missiles || 0) + 1;
        if (inst._missiles % magaTuning().misilesChargeEvery === 0) gainGauge(p, 'cargas', 1);
        try { g.spawnBeam?.(p.pos, e.pos, ctx.color ?? sk.color, interval); } catch { /* */ }
        fx(g, ctx.fx?.impact, e.pos, 1.0);
        if (ctx.fx?.tickSfx) g.sfx?.(ctx.fx.tickSfx);
      },
    },
    // Sello del Archimago: marca 8 s, +4 Cargas; guarda el 25 % de la vida que pierde y
    // al expirar (o al morir) estalla con todo en 3 m
    a_sello: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const range = prof.range || sk.range || 12;
        let e = cast.enemy;
        if (!e?.alive || e.pos.distanceTo(p.pos) > range + 0.5) e = g.nearestEnemy?.(range) || null;
        if (!e) { refund(g, p, sk, 'Ningún enemigo al alcance'); return ctx.res; }
        const dur = prof.dur || sk.dur || 8;
        e.marks = e.marks || {};
        e.marks[sk.id] = { t: dur, by: p };
        gainGauge(p, 'cargas', sk.charges || 4);
        ctx.res.hits = 1;
        const S = { stored: 0, hp: e.hp, until: g.timers.now + dur, pos: e.pos.clone() };
        e._mgSeal = S;
        const pct = (sk.storePct || 25) / 100;
        const blow = () => {
          if (e.marks) delete e.marks[sk.id];
          if (e._mgSeal === S) e._mgSeal = null;
          const amt = Math.round(S.stored);
          ring(g, S.pos, T.sealR, ctx.color ?? sk.color);
          fx(g, ctx.fx?.impact, S.pos, 1.0);
          if (amt > 0) for (const o of alivesNear(g, S.pos, T.sealR)) dealProcDamage(g, o, amt, { source: 'power:a_sello', skill: 'a_sello', elem: 'arcane', tags: new Set(['arcane', 'area']) });
          g.addShake?.(0.25);
        };
        const poll = () => {
          if (e._mgSeal !== S) return;
          const lost = Math.max(0, S.hp - Math.max(0, e.hp));
          S.stored += lost * pct; S.hp = e.hp;
          if (e.alive) S.pos = e.pos.clone();
          if (!e.alive || g.timers.now >= S.until - 1e-9) { blow(); return; }
          g.timers.schedule(0.1, poll);
        };
        g.timers.schedule(0.1, poll);
        ring(g, e.pos, 1.0, ctx.color ?? sk.color);
        fx(g, ctx.fx?.aura, e.pos, 2.0);
        return ctx.res;
      },
    },
    // Evocación: canalizas 3 s y recuperas el 60 % del maná (los golpes fuertes la cortan)
    a_evocacion: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const ticks = sk.ticks || 6;
        const per = (p.stats.maxMP || 0) * (sk.manaPct || 60) / 100 / ticks;
        fx(g, ctx.fx?.aura, p.pos, 1.0);
        return g.startChannel(ctx, cast.done, {
          dur: sk.channelT || 3, ticks,
          onTick: () => { g.gainResource(p, per); fx(g, ctx.fx?.extra, p.pos, 1.2); },
        });
      },
    },
  };
  return B;
}

// ============================================================
// CAMPOS DE SUELO
// ============================================================
function enemyR(e) { return 0.45 * (e?.def?.scale || 1); }
function inField(f, e) { return dist2(e.pos, f.pos) <= f.radius * f.radius; }
export function magaFields() {
  const T = magaTuning();
  return {
    // Muro de Fuego: segmento (centro f.pos, eje u, normal n, mitad `half`, ancho `width`)
    p_muro_fuego: {
      name: 'Muro de Fuego',
      init(f) { f.acc = 0; f.fxAcc = 0; f.sides = new Map(); },
      tick(g, f, dt) {
        const d = f.data;
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          const rx = e.pos.x - f.pos.x, rz = e.pos.z - f.pos.z;
          const along = rx * d.ux + rz * d.uz, perp = rx * d.nx + rz * d.nz, r = enemyR(e);
          const inLen = Math.abs(along) <= d.half + r;
          if (!inLen || Math.abs(perp) > d.width / 2 + r) { if (inLen || Math.abs(along) <= d.half + 2) f.sides.set(e, Math.sign(perp) || 1); continue; }
          if (!d.blocks || isBoss(e)) continue;
          const side = f.sides.get(e) || Math.sign(perp) || 1;
          f.sides.set(e, side);
          const off = side * (d.width / 2 + r + 0.05);
          const nx = f.pos.x + d.ux * along + d.nx * off, nz = f.pos.z + d.uz * along + d.nz * off;
          if (!g.world?.grid || g.world.grid.walkable(nx, nz)) { e.pos.x = nx; e.pos.z = nz; }
        }
        f.acc += dt; f.fxAcc += dt;
        if (f.fxAcc >= 0.25 && d.preset) {
          f.fxAcc = 0;
          for (let i = -1; i <= 1; i++) g.emitFx?.(d.preset, { x: f.pos.x + d.ux * d.half * 0.66 * i, y: 0.2, z: f.pos.z + d.uz * d.half * 0.66 * i });
        }
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        const per = Math.max(0, Math.round((d.dps || 0) * 0.5));
        if (!(per > 0)) return;
        for (const e of g.enemies || []) {
          if (!e.alive) continue;
          const rx = e.pos.x - f.pos.x, rz = e.pos.z - f.pos.z, r = enemyR(e);
          if (Math.abs(rx * d.ux + rz * d.uz) > d.half + r || Math.abs(rx * d.nx + rz * d.nz) > d.width / 2 + r + 0.35) continue;
          e.takeDamage(per, false, { dot: true, source: 'field:p_muro_fuego', skill: d.skill || 'p_muro_fuego', tags: d.tags || new Set(['zone', 'fire']), elem: 'fire' });
        }
      },
    },
    // Ventisca: daño por segundo (tic 0,5 s) y +1 capa de Escarcha por segundo dentro
    k_ventisca: {
      name: 'Ventisca',
      init(f) { f.acc = 0; f.layerAcc = 0; f.fxAcc = 0; },
      tick(g, f, dt) {
        const d = f.data;
        f.acc += dt; f.layerAcc += dt; f.fxAcc += dt;
        if (f.fxAcc >= 0.5 && d.preset) { f.fxAcc = 0; g.emitFx?.(d.preset, { x: f.pos.x, y: 1.2, z: f.pos.z }); }
        if (f.acc >= 0.5 - 1e-9) {
          f.acc = 0;
          const per = Math.max(0, Math.round((d.dps || 0) * 0.5));
          for (const e of (g.enemies || []).filter(o => o.alive && inField(f, o))) {
            if (per > 0) e.takeDamage(per, false, { dot: true, source: 'field:k_ventisca', skill: d.skill || 'k_ventisca', tags: d.tags || new Set(['zone', 'frost']), elem: 'frost' });
            if (d.slow && e.alive) e.applyCC?.('slow', Math.min(d.slow, 1), { pct: d.slowPct || 40, src: f.owner });
          }
        }
        if (f.layerAcc >= 1 - 1e-9) {
          f.layerAcc = 0;
          for (const e of (g.enemies || []).filter(o => o.alive && inField(f, o))) gainGauge(f.owner, 'escarcha', d.layers || 1, e);
        }
      },
    },
    // Tumba Glacial: bloque de hielo que corta el paso (empuja fuera a los no jefes)
    k_tumba: {
      name: 'Tumba Glacial',
      tick(g, f) {
        for (const e of g.enemies || []) {
          if (!e.alive || isBoss(e)) continue;
          const dx = e.pos.x - f.pos.x, dz = e.pos.z - f.pos.z, l = Math.hypot(dx, dz), min = f.radius + enemyR(e);
          if (l >= min) continue;
          const ux = l > 1e-3 ? dx / l : 1, uz = l > 1e-3 ? dz / l : 0;
          const nx = f.pos.x + ux * (min + 0.02), nz = f.pos.z + uz * (min + 0.02);
          if (!g.world?.grid || g.world.grid.walkable(nx, nz)) { e.pos.x = nx; e.pos.z = nz; }
        }
      },
    },
    // Invierno Eterno: +1 capa por segundo, −50 % de movimiento y Glaciación (x2: Debilidad)
    k_campo_helado: {
      name: 'Campo helado',
      init(f) { f.acc = 0.5; f.layerAcc = 0; },
      tick(g, f, dt) {
        const p = f.owner;
        f.acc += dt; f.layerAcc += dt;
        if (f.acc >= 0.5 - 1e-9) {
          f.acc = 0;
          const vuln = p?.tv?.fieldVuln || 0;
          for (const e of (g.enemies || []).filter(o => o.alive && inField(f, o))) {
            e.applyCC?.('slow', 0.7, { pct: T.winterSlow, src: p });
            if (vuln > 0) e.applyWeakness?.('k_glaciacion', vuln, 0.7);
          }
        }
        if (f.layerAcc >= 1 - 1e-9) {
          f.layerAcc = 0;
          for (const e of (g.enemies || []).filter(o => o.alive && inField(f, o))) gainGauge(p, 'escarcha', 1, e);
        }
      },
    },
  };
}

export function magaGauges() {
  return {};
}
