// ============================================================
// PODERES de la MAGA (Piromante · Crionte · Arcanista) — Paso 2c.1 / 2c.2 · Paso 2g (KT-maga)
// ============================================================
// Dueño desde el Paso 2 (E2): KT-maga (docs/paso2-implementacion.md §2 E2). js/powers.js importa
// y registra al cargar los cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-maga.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Por eso TODOS los
// helpers de este archivo son `function` (se elevan) y nada del nivel superior lee
// un binding importado: no hay `const` de módulo. Tampoco se importa js/talents.js:
// resources.js → powers.js → aquí → talents.js → data.js leería RESOURCE_DEFS sin iniciar
// (el rango de un final sale del agregado que deja recompute: rankOf = talents.powerRank).
//
//  magaPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js).
//                        Ningún poder declara `mult` (test67 / test-powers-maga).
//  magaSkillBehaviors() { skillId: { cast?(g,p,prof,cast), tick?(g,p,inst,dt), end?(g,p,inst) } }
//                        → el `behavior` de las activas de talento y de la Barrera de Maná.
//  magaFields()          campos de suelo propios (Muro de Fuego, Ventisca, runas, Sellos…).
//  magaGauges()          ninguno nuevo: los tres indicadores (calor, escarcha, cargas) son los
//                        base de spec-mechanics.js; aquí se POTENCIAN con gainGauge/spendGauge/onGauge.
//
// MAPA nodo 2g → implementación (docs/paso2g-maga-coherencia.md §4 y §7; el texto del nodo manda):
//  Clase   c1 stats.mpPct · c2 mod @all · c3 mod m_parpadeo (espera el catálogo de KA1) · c4 tv.barrierDr ·
//          c5 m_dardo_certero | m_dardo_sifon · c6 mod @spender dmgDirect | splashPct · c7 m_paso_fugaz ·
//          c8 tv.drHighMana · c9 m_nova_congelante | mod nova_hielo + m_nova_cortante ·
//          c10 m_ralentizar | m_disrupcion · c11 activa m_t_bloque | m_aguante · c12 stats.mph ·
//          c13 stats.crit · c14 m_runa | m_parpadeo_cura · c15 m_escudo_mana | stats.regenPct + tv.highManaDmg ·
//          c16 m_armonia | m_pureza · c17 activa m_t_inversion | m_anclaje · c18 mod m_barrera (KA1) ·
//          c19 m_barrera_resonante · c20 m_escarcha_arcana · c21 m_escarcha_tenaz · c22 activa
//          m_t_contrahechizo | tv.costRedBig · c23 tv.basicCritCdr · c24 stats.aspdPct · c25 m_cristal ·
//          c26 m_torrente · c27 m_imagen · finales c28 m_bastion · c29 m_archimaga · c30 m_vacio.
//  Paragon Cronomante t0 m_marca_tiempo (Marca del Tiempo) + claves tv chrono* de t1–t11 (MAGA_TV_KEYS) ·
//          t4B m_retroceso · final t12 m_senora_tiempo.
//          Invocadora f0 m_familiar (Familiar Arcano) + claves tv fam* · final f12 m_legion.
//          Escriba Rúnica e0 m_runas (runas y Sellos) + claves tv rune*/seal* · final e12 m_gran_grimorio.
//          Las activas t4A/e4A/f8A (m_h_detener, m_h_palabra, m_h_constructo) son del catálogo (KA1):
//          la Marca escucha ③ afterCast de m_h_detener (guardan el doble) y las runas, el de m_h_palabra.
//  DESVIACIONES de la clase 2g:
//  · c21 Escarcha Tenaz es un poder y no un mod: `slow` de mergeMods es un MÁXIMO (no suma 2 s). Suma
//    +2 s a la ralentización del perfil (modifyResolve) y a las que ponen los poderes de este archivo.
//  · c9B: el +40 % es mod; «ralentiza 1 s menos» lo quita m_nova_cortante (un mod de slow es un máximo).
//  · La Barrera de Maná se reconoce por la fuente de su escudo (m_barrera; m_t_barrera, la vieja). La
//    pone el comportamiento m_t_barrera (lee shieldManaPct y prof.buffMul; con Bastión no caduca).
//  · Cristal y Bastión distinguen la Barrera ROTA (absorbida hasta 0) de la que caduca.
//  · Torrente cuenta el coste de los lanzamientos (⑦ onCast), no el maná que pagas con Escudo de Maná.
//  · El Familiar, las Marcas y las runas no son mascotas ni proyectiles: sus golpes son daño de PODER
//    (dealProcDamage: no disparan onHit ni llenan el indicador, salvo Eco Elemental f9).
//  · Enjambre (f2B): cada Familiar prefiere un enemigo que no tenga otro; con Cazador (f4B) todos
//    persiguen al de más vida. Grieta Temporal (t9): «a la vez» = en el mismo paso de 0,1 s.
//  · El Dardo Arcano (básico de ARMA) cuenta como hechizo para Armonía, Pureza, el elemento del
//    Familiar y las runas de la Escriba.
//
// MAPA v1 de las especializaciones (lo rehacen los trabajos 2 y 3 de KT-maga):
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
//  · Clase c4 barrierDr (2g; era c7) → g.shield(…, { dr }) de putBarrier.
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
//  · Ralentizar (c10A; era c5B) ignora el básico de ARMA que ahora también pasa por ⑦ onCast
//    (cast.weapon): antes no lo veía y así no cambia nada.
//  · Claves tv que consumen poderes de su MISMO nodo: fieldVuln (x2, campo de x1: si no hay
//    campo no hay nada que potenciar), clarityPct (s11 a_clarity), arcChargePct (x2 a_arc_charge).
//
// REGLAS: sin `powers.has(` fuera de js/powers*.js (aquí: hasPower), sin setTimeout
// (g.timers.schedule), sin Math.random en la simulación (p.combatRng). Daño de un poder:
// dealProcDamage. Control: e.applyCC. Curas: p.sustain / g.shield; restauraciones p.setHp.
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { rankBuff } from './combat-math.js';
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
    slowEvery: 8, slowPct: 50, slowT: 4,                 // Ralentizar (c10A)
    rewindT: 5, rewindEvery: 0.25, rewindKeep: 40,       // Inversión del Tiempo
    prisonLayers: 5, prisonFreeze: 2, prisonFreezeBig: 3, prisonStagger: 20, prisonStaggerBig: 35, numbT: 4,
    novaPush: 3, frostArmorLayers: 1, iceTombT: 4, iceTombR: 1.2, chainLayers: 2, chainR: 4, iceAgeEvery: 15,
    numbExtra: 0.15, winterT: 6, winterSlow: 50,
    orbCap: 2, chainCritN: 3, chainCritFrac: 1.5, chainCritR: 6, chainCritSolo: 0, singPct: 15, singT: 6, singMax: 2,
    misilesChargeEvery: 2,                               // Misiles Arcanos: 1 Carga cada 2 misiles (Paso 2e)
    resonanceCrit: 12, sealR: 3,
    // ---- árbol de CLASE 2g (§4) ----
    barrierPct: 60, barrierT: 8,                         // Barrera de Maná si el catálogo no trae sus números
    certeroEvery: 4,                                     // c5A Dardo Certero
    sifonMana: 6, sifonCdr: 1,                           // c5B Dardo Sifón
    fugazSpd: 30, fugazT: 3,                             // c7 Paso Fugaz
    novaFreezeT: 1, novaFreezeEvery: 8, cortanteSlow: 1, // c9 Nova Congelante / Cortante
    disrupEvery: 10, disrupT: 3,                         // c10B Disrupción
    aguanteCd: 120,                                      // c11B Aguante Arcano
    runaR: 2, runaT: 3, runaSlowPct: 50,                 // c14A Runa de Escarcha
    reparoPct: 8,                                        // c14B Parpadeo Reparador
    escudoManaPct: 20,                                   // c15A Escudo de Maná
    armoniaPct: 8, armoniaT: 5, armoniaMax: 3,           // c16A Armonía Elemental
    purezaN: 3, purezaPct: 15, purezaT: 6,               // c16B Pureza Elemental
    anclajeHp: 0.3, anclajeDr: 30, anclajeSpd: 50, anclajeT: 4, anclajeCd: 60,   // c17B Anclaje Temporal
    resonanteMana: 2, resonanteVida: 2,                  // c19 Barrera Resonante (maná · % de vida)
    escArcSlowPct: 30, escArcT: 2, escArcCrit: 15,       // c20 Escarcha Arcana
    tenazS: 2,                                           // c21 Escarcha Tenaz
    cristalR: 3, cristalKnock: 3, cristalSlowPct: 40, cristalSlowT: 2, cristalMana: 10,   // c25 (maná % por rango)
    torrenteMana: 60, torrenteWin: 3, torrenteBase: 4, torrenteRank: 8, torrenteT: 4,     // c26 Torrente de Maná
    imagenR: 6, imagenBase: 2,                           // c27 Imagen Arcana (s = base + rango)
    bastionVuelta: 20, bastionCoste: 10, bastionDur: 1e6, // c28 Bastión Arcano (coste % por rango)
    archimagaEvery: 4, archimagaBase: 20, archimagaRank: 20, echoGap: 0.25,   // c29 Archimaga
    vacioPct: 15,                                        // c30 Paso del Vacío (por rango)
    // ---- PARAGON 2g (§7) ----
    // Cronomante: Marca del Tiempo
    marcaT: 4, marcaPct: 30, marcaSaltoR: 6, marcaParadojaR: 8, marcaCritMax: 3, marcaPrisaT: 3,
    grietaR: 4, grietaT: 3, detenerT: 3, detenerR: 8, retroHp: 0.4, retroT: 3, retroCd: 90,
    senoraEvery: 30, senoraT: 5,
    // Invocadora: Familiar Arcano (vida = % de la tuya)
    famEvery: 1.5, famCoef: 0.5, famSwarmCoef: 0.4, famRange: 10, famDist: 2.5, famVida: 30,
    famVuelta: 10, famVueltaBoom: 5, famBoomR: 4, famBurnFrac: 0.6, famBurnT: 4, famSlowPct: 30, famSlowT: 1.5,
    famArcMana: 3, famStunEvery: 5, famStunT: 0.5, famHasteT: 3, famForgeWin: 8, famForgeMax: 25,
    famHuntT: 2, famEchoCalor: 3, famEchoCapas: 1, famThreadEvery: 0.5, famThreadW: 0.6,
    legionEvery: 25, legionT: 8, legionCopy: 50, legionMul: 3,
    // Escriba Rúnica: runas (cada 3.er hechizo) y Sellos (3 runas cerca)
    runaEvery: 3, runaVida: 8, runaRad: 1, runaDist: 1.8, selloNear: 5, selloR: 3.5, selloT: 8,
    selloDmg: 15, selloDr: 10, runaElemSlowPct: 30, runaBurnCoef: 0.4, runaBurnT: 4,
    palimpsestoR: 1.2, grimorioEvery: 30, grimorioT: 10, grimorioCopy: 40,
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
// Paso 2g · helpers del árbol de CLASE y del PARAGON
// ============================================================
// rango del nodo que concede el poder `id` (finales): el mismo dato que talents.powerRank, leído
// del agregado de recompute (ver la cabecera: este módulo no importa talents.js). Un poder puesto
// a mano (arnés, talentExtra) cuenta como rango 1.
function rankOf(p, id) {
  const r = p?.talentAgg?.powerRank?.[id] | 0;
  return r > 0 ? r : (hasPower(p, id) ? 1 : 0);
}
function tvOf(p) { return p?.tv || {}; }
function skillOf(p, id) { return p?.cls?.skills?.find(s => s.id === id) || null; }
// definición FORJADA ya resuelta (la caché de resolveSkill); si no, la del catálogo
function forgedOf(p, id) { return p?.forged?.[id]?.def || p?.resolved?.[id]?.def || skillOf(p, id); }
function byDist(pos) { return (a, b) => dist2(a.pos, pos) - dist2(b.pos, pos); }
// un lanzamiento de habilidad principal (cast.sk = definición forjada)
function isSpender(cast) { return cast?.sk?.cat === 'spender'; }
// un «hechizo» con daño (Armonía, Pureza, elemento del Familiar, Gran Grimorio). El Dardo Arcano es el
// básico de ARMA de la Maga (cast.weapon, ⑦ sin afterCast) y cuenta: «Dardo Arcano + Fuego + Nova»
function isSpell(cast) { return !!cast?.sk && (cast.prof?.coef || 0) > 0; }
// ralentización de los poderes de la Maga con Escarcha Tenaz (c21: +2 s)
function slowDur(p, d) { return d + (hasPower(p, 'm_escarcha_tenaz') ? magaTuning().tenazS : 0); }
// buff que se renueva sin recompute: si ya está, solo se alarga (recompute solo al ponerlo)
function refreshBuff(a, id, stats, keep, meta = {}) {
  const b = a?.buffs?.find?.(x => x.id === id);
  if (b) { b.t = Math.max(b.t, keep); b.dur = Math.max(b.dur || 0, keep); return; }
  a?.addBuff?.(id, { ...stats }, keep, meta);
}
// resta `s` s a las recargas en curso de las habilidades cuya definición forjada cumple `pred`
function cdrWhere(g, p, s, pred) {
  for (const sk of p?.cls?.skills || []) {
    if (!((p.cds?.[sk.id] || 0) > 0)) continue;
    if (pred(forgedOf(p, sk.id))) g?.reduceCooldown?.(p, sk.id, s);
  }
}
// repite un lanzamiento como ECO (sin coste ni recarga; una repetición no genera otra) si la
// ranura sigue con esa habilidad
function echoCast(g, p, cast, mult, delay) {
  const slot = cast?.slot, id = cast?.sk?.id;
  if (!slot || !id || !(mult > 0) || !g?.timers) return;
  g.timers.schedule(delay, () => {
    if (!p.alive || g.player !== p || p.hotbar?.[slot] !== id) return;
    g.castSkillSlot?.(slot, mult);
  });
}
function insideR(pos, center, r) { return dist2(pos, center) <= r * r; }
function enemiesIn(g, center, r) {
  return (g?.enemies || []).filter(e => e.alive && insideR(e.pos, center, r + 0.5 * (e.def?.scale || 1)));
}
// partículas sueltas (inline: los presets con nombre son de fx-skills-maga.js)
function glow(color, size = 0.3, life = 0.35) {
  return { name: 'Maga destello', texture: 'glow', blending: 'additive', count: 3, burst: true, lifetime: [life * 0.7, life],
    shape: 'sphere', shapeRadius: 0.12, speed: [0.1, 0.5], gravity: -0.4, drag: 0.6,
    size: { start: [size * 0.8, size], end: 0 }, color: { start: '#ffffff', end: color }, alpha: { start: 0.9, end: 0 } };
}
// color de cada elemento de la Maga (null si no es Fuego, Hielo ni Arcano)
function elemColor(el) { return el === 'fire' ? 0xff7a2a : el === 'frost' ? 0x8fe0ff : el === 'arcane' ? 0xc8a0ff : null; }
function elemHex(el) { return `#${(elemColor(el) ?? 0xc8a0ff).toString(16).padStart(6, '0')}`; }
// calcomanía de suelo (anillo o disco) de un campo; la libera al morir
function decal(g, f, { color, opacity = 0.35, disc = false, inner = 0.82 } = {}) {
  if (f.dead) {
    if (f.decal) { g.fxGroup.remove(f.decal); f.decal.geometry.dispose(); f.decal.material.dispose(); f.decal = null; }
    return null;
  }
  if (!f.decal) {
    const geo = disc ? new THREE.CircleGeometry(f.radius, 32) : new THREE.RingGeometry(f.radius * inner, f.radius, 40);
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    g.fxGroup.add(m);
    f.decal = m;
  }
  f.decal.position.set(f.pos.x, 0.06, f.pos.z);
  return f.decal;
}

// ---- Barrera de Maná (base del kit; la usan c4, c11B, c18, c19, c25 y c28) ----
// su escudo se reconoce por la fuente: m_barrera (2g) o m_t_barrera (la activa vieja)
function isBarrierSrc(src) { return src === 'm_barrera' || src === 'm_t_barrera'; }
function barrierShield(p) { return (p?.shields || []).find(s => isBarrierSrc(s.src) && s.amt > 0 && s.t > 0) || null; }
// lo que absorbe una Barrera nueva: % del maná máximo × potencia (rango y c18 Barrera Reforzada)
function barrierAmount(p) {
  const prof = p?.resolved?.m_barrera;
  const def = prof?.def || skillOf(p, 'm_barrera');
  const pct = def?.shieldManaPct || magaTuning().barrierPct;
  // sin perfil en caché (Aguante, vuelta del Bastión): la misma cuenta que resolveSkill
  const mul = prof?.buffMul ?? rankBuff(p?.skills?.m_barrera || 1) * Math.max(0, 1 + (p?.talentAgg?.mods?.m_barrera?.buff || 0) / 100);
  return pct / 100 * (p?.stats?.maxMP || 0) * mul;
}
function barrierDur(p) { return p?.resolved?.m_barrera?.dur || skillOf(p, 'm_barrera')?.dur || magaTuning().barrierT; }
// pone la Barrera (comportamiento, Aguante Arcano, vuelta del Bastión): con Bastión Arcano no
// caduca. Guarda su máximo (Barrera Resonante la recarga hasta ahí)
function putBarrier(g, p, amt, dur, src = 'm_barrera') {
  if (!(amt > 0) || !g?.shield) return 0;
  const d = hasPower(p, 'm_bastion') ? magaTuning().bastionDur : dur;
  const got = g.shield(amt, { target: 'self', dur: d, src, dr: tvOf(p).barrierDr || 0 });
  const s = (p.shields || []).find(x => x.src === src);
  if (s) s.max = s.amt;
  return got;
}
// vigía de la Barrera de un poder (st.bar): true si la que había se ROMPIÓ (absorbida hasta 0;
// si caducó o la cambiaste por otra, no)
function barrierBroke(p, st) {
  const was = st.bar;
  st.bar = barrierShield(p);
  return !!was && was !== st.bar && !(was.amt > 0) && was.t > 0;
}
// c25 Cristal de Barrera: empuja 3 m, ralentiza un 40 % 2 s y devuelve maná (10 % por rango)
function crystalBurst(g, p) {
  const T = magaTuning();
  for (const e of enemiesIn(g, p.pos, T.cristalR)) {
    e.applyCC?.('knock', T.cristalKnock, { from: p.pos.clone(), src: p });
    if (e.alive) e.applyCC?.('slow', slowDur(p, T.cristalSlowT), { pct: T.cristalSlowPct, src: p });
  }
  g.gainResource?.(p, (p.stats?.maxMP || 0) * T.cristalMana * rankOf(p, 'm_cristal') / 100);
  ring(g, p.pos, T.cristalR, 0xbfe0ff);
  g.ui?.spawnText?.(p.pos, '¡Cristal!', 'txt-mana');
}
// c28 Bastión Arcano: si la rompen, vuelve sola a los 20 s; el coste baja solo con ella puesta
// (al cambiar ese estado se invalidan los perfiles)
function bastionWatch(g, p, tick) {
  const T = magaTuning();
  const st = powerState(p, 'm_bastion');
  if (barrierBroke(p, st)) st.backAt = now(p) + T.bastionVuelta;
  if (tick && st.backAt > 0 && now(p) >= st.backAt - 1e-9 && p.alive) {
    st.backAt = 0;
    if (!barrierShield(p)) { putBarrier(g, p, barrierAmount(p), barrierDur(p)); st.bar = barrierShield(p); }
  }
  const up = !!barrierShield(p);
  if (up !== !!st.up) { st.up = up; invalidate(p); }
}

// ---- Cronomante: Marca del Tiempo (t0) ----
// estado en powerState(p, 'm_marca_tiempo'): marks = Map(enemigo → { until, stored, ext }),
// ends (Marcas acabadas: Bucle), stopUntil/stopOn (Señora del Tiempo), detener (m_h_detener)
function cronoState(p) { return powerState(p, 'm_marca_tiempo'); }
function putMark(g, p, e, st, stored = 0, until = null) {
  if (!e?.alive || st.marks.has(e)) return null;
  const m = { until: until ?? now(p) + magaTuning().marcaT + (tvOf(p).chronoDur || 0), stored, ext: 0 };
  st.marks.set(e, m);
  ring(g, e.pos, 0.8, 0xe8c87a);
  return m;
}
// ¿el enemigo está bajo Detener el Tiempo? (t4A: las Marcas guardan el doble)
function underTimeStop(p, st, e) { return !!st.detener && now(p) < st.detener.until && st.detener.set.has(e); }
// una Marca termina: repite el pct % de lo guardado (daño de poder: no cuenta para otras Marcas)
function endMark(g, p, e, m, pct) {
  const T = magaTuning(), tv = tvOf(p);
  const st = cronoState(p);
  const amount = m.stored * pct / 100;
  let done = 0;
  const opts = { source: 'power:m_marca_tiempo', tags: new Set(['arcane']) };
  if (amount > 0 && e.alive) done += dealProcDamage(g, e, amount, opts);
  st.ends++;
  // t7 Bucle: cada 4.ª Marca que termina se repite una segunda vez
  if (tv.chronoLoop > 0 && st.ends % tv.chronoLoop === 0 && amount > 0 && e.alive) done += dealProcDamage(g, e, amount, opts);
  if (done > 0) { text(g, e, '¡Eco del tiempo!', 'txt-mana'); ring(g, e.pos, 1.1, 0xe8c87a); }
  // t8B Memoria: te curas el 3 % de lo repetido
  if (tv.chronoHeal > 0 && done > 0) p.sustain?.(done * tv.chronoHeal / 100, 'm_marca_tiempo');
  // t3 Prisa Temporal: +10 % de velocidad de lanzamiento 3 s
  if (tv.chronoHaste > 0) refreshBuff(p, 'm_prisa_temporal', { aspdPct: tv.chronoHaste }, T.marcaPrisaT, { name: 'Prisa Temporal', icon: '⏳', desc: `+${tv.chronoHaste} % de velocidad de lanzamiento` });
  // t5 Segundos Robados: recarga 1 s de tu definitiva
  if (tv.chronoUltCdr > 0) cdrWhere(g, p, tv.chronoUltCdr, d => d?.cat === 'ultimate');
  // t2B Marca Contagiosa: pasa a los enemigos cercanos sin Marca
  if (tv.chronoSpread > 0) {
    const near = alivesNear(g, e.pos, T.marcaSaltoR, e).filter(o => !st.marks.has(o)).sort(byDist(e.pos)).slice(0, tv.chronoSpread);
    for (const o of near) { putMark(g, p, o, st); try { g.spawnBeam?.(e.pos, o.pos, 0xe8c87a, 0.2); } catch { /* */ } }
  }
}
// 10 Hz: Paradoja, final de las Marcas, Grieta Temporal y Aceleración
function resolveMarks(g, p) {
  const T = magaTuning(), tv = tvOf(p);
  const st = cronoState(p), t = now(p);
  // muertos antes de tiempo: t6 Paradoja pasa la Marca (con lo guardado) al más cercano
  for (const [e, m] of [...st.marks]) {
    if (e.alive) continue;
    st.marks.delete(e);
    if (!tv.chronoParadox) continue;
    const o = alivesNear(g, e.pos, T.marcaParadojaR).filter(x => !st.marks.has(x)).sort(byDist(e.pos))[0];
    const n = o && putMark(g, p, o, st, m.stored, Math.max(m.until, t + 0.5));
    if (n) { n.ext = m.ext; try { g.spawnBeam?.(e.pos, o.pos, 0xe8c87a, 0.25); } catch { /* */ } }
  }
  // t12 Señora del Tiempo: con el reloj parado no termina ninguna; al acabar, todas al 100 %
  if (st.stopUntil > t + 1e-9) return;
  const all = !!st.stopOn;
  st.stopOn = false;
  const pct = all ? 100 : T.marcaPct + (tv.chronoPct || 0);
  const ending = [];
  for (const [e, m] of st.marks) if (all || t >= m.until - 1e-9) ending.push([e, m]);
  for (const [e, m] of ending) { st.marks.delete(e); endMark(g, p, e, m, pct); }
  // t9 Grieta Temporal: 3 Marcas que terminan a la vez abren una grieta que ralentiza
  if (tv.chronoRift > 0 && ending.length >= 3) {
    let x = 0, z = 0;
    for (const [e] of ending) { x += e.pos.x; z += e.pos.z; }
    const c = at(p.pos, x / ending.length, z / ending.length);
    g.spawnField?.('m_grieta', { pos: c, radius: T.grietaR, dur: T.grietaT, owner: p, data: { slowPct: tv.chronoRift } });
  }
  // t10 Aceleración: con 3 o más Marcas puestas lanzas más rápido
  if (tv.chronoAccel > 0 && st.marks.size >= 3)
    refreshBuff(p, 'm_aceleracion', { aspdPct: tv.chronoAccel }, 0.35, { name: 'Aceleración', icon: '⏳', desc: `+${tv.chronoAccel} % de velocidad de lanzamiento` });
}

// ---- Invocadora: Familiar Arcano (f0) ----
// estado en powerState(p, 'm_familiar'): fams (1, 3 con Enjambre; ×3 con Legión), vida común
// (hp/maxHp), elem (el de tu último hechizo), downAt (vuelve), hasteUntil (Sobrecarga),
// recent (habilidades usadas: Fragua Rúnica), threadAcc (Hilo de Maná)
function famState(p) { return powerState(p, 'm_familiar'); }
function legionOn(p) { return hasPower(p, 'm_legion') && powerState(p, 'm_legion').until > now(p) + 1e-9; }
function famCount(p) {
  const base = tvOf(p).famSwarm > 0 ? tvOf(p).famSwarm : 1;
  return base * (legionOn(p) ? magaTuning().legionMul : 1);
}
function famMaxHp(p) { return (p?.stats?.maxHP || 0) * magaTuning().famVida / 100 * (1 + (tvOf(p).famVit || 0) / 100); }
// crea, quita y coloca los Familiares (en corro a 2,5 m de la Maga)
function famSync(g, p, st) {
  const T = magaTuning();
  const want = st.downAt > now(p) + 1e-9 ? 0 : famCount(p);
  if (want > 0 && !st.fams.length) { st.maxHp = famMaxHp(p); st.hp = st.maxHp; }
  while (st.fams.length > want) st.fams.pop();
  while (st.fams.length < want) {
    const i = st.fams.length;
    st.fams.push({ idx: i, pos: at(p.pos, p.pos.x, p.pos.z), acc: T.famEvery * i / Math.max(1, want), shots: 0 });
  }
  const n = st.fams.length, rot = now(p) * 0.6;
  st.fams.forEach((f, i) => {
    const a = rot + i * Math.PI * 2 / Math.max(1, n);
    f.pos.x = p.pos.x + Math.cos(a) * T.famDist; f.pos.z = p.pos.z + Math.sin(a) * T.famDist;
  });
}
// f8B Fragua Rúnica: +5 % por habilidad distinta usada en 8 s (hasta +25 %)
function famForgeBonus(p, st) {
  const per = tvOf(p).famForge || 0;
  if (!(per > 0)) return 0;
  const T = magaTuning(), t = now(p);
  const ids = new Set(st.recent.filter(x => t - x.t <= T.famForgeWin + 1e-9).map(x => x.id));
  return Math.min(T.famForgeMax, per * ids.size);
}
// f7 Aprendiz: copia la variante del Dardo (la forma que cambia frente al catálogo): estalla
// con su salpicadura (Saeta Ígnea) o ralentiza con su frío (Saeta Gélida)
function famApprentice(g, p, e, dmg) {
  const base = skillOf(p, 'm_dardo');
  const fd = p?.forged?.m_dardo?.def;
  if (!base || !fd || fd === base) return;
  if ((fd.splash || 0) > (base.splash || 0) && fd.radius > 0) {
    const frac = fd.splash / Math.max(0.01, fd.coef || 1);
    for (const o of enemiesIn(g, e.pos, fd.radius)) if (o !== e) dealProcDamage(g, o, dmg * frac, { source: 'power:m_familiar', skill: 'm_familiar', elem: fd.elem || null });
    ring(g, e.pos, fd.radius, elemColor(fd.elem) || 0xc8a0ff);
  }
  if ((fd.slow || 0) > (base.slow || 0) && e.alive) e.applyCC?.('slow', slowDur(p, fd.slow), { pct: fd.slowPct || 20, src: p });
}
// un disparo de un Familiar: 50 % del arma con tu último elemento (Fuego quema, Hielo frena,
// Arcano da maná). Daño de poder (no dispara onHit ni llena tu indicador, salvo Eco Elemental)
function famShoot(g, p, st, f) {
  const T = magaTuning(), tv = tvOf(p);
  let list = alivesNear(g, f.pos, T.famRange);
  if (!list.length) return false;
  let e;
  // f4B Cazador: todos persiguen al de más vida
  if (tv.famHunt > 0) e = list.reduce((a, b) => (b.hp > a.hp ? b : a));
  else {
    // el Enjambre reparte: cada uno prefiere un enemigo que no tenga ya otro Familiar
    const taken = new Set(st.fams.filter(o => o !== f && o.target?.alive).map(o => o.target));
    const free = list.filter(x => !taken.has(x));
    e = (free.length ? free : list).sort(byDist(f.pos))[0];
  }
  f.target = e;
  f.shots++;
  const el = st.elem || 'arcane';
  const tags = new Set(['summon', el]);
  // f4B Cazador: el enemigo con más vida recibe +10 % (Debilidad, también este disparo)
  if (tv.famHunt > 0) e.applyWeakness?.('m_cazador', tv.famHunt, T.famHuntT);
  const add = (tv.famBig || 0) + (tv.famDmg || 0) + famForgeBonus(p, st);
  const { dmg } = p.rollDamage(tv.famSwarm > 0 ? T.famSwarmCoef : T.famCoef, 0, add, e, { skill: 'm_familiar', tags, elem: el });
  try { g.spawnBeam?.(at(f.pos, f.pos.x, f.pos.z, 1.4), e.pos, elemColor(el), 0.15); } catch { /* */ }
  dealProcDamage(g, e, dmg, { source: 'power:m_familiar', skill: 'm_familiar', elem: el, tags });
  if (el === 'fire') { if (e.alive) g.replaceDoT?.(e, dmg * T.famBurnFrac, T.famBurnT, 1, 'm_familiar:burn'); }
  else if (el === 'frost') { if (e.alive) e.applyCC?.('slow', slowDur(p, T.famSlowT), { pct: T.famSlowPct, src: p }); }
  else g.gainResource?.(p, T.famArcMana);
  if (tv.famMana > 0) g.gainResource?.(p, tv.famMana);                                 // f1 Vínculo
  if (tv.famBig > 0 && f.shots % T.famStunEvery === 0 && e.alive) e.applyCC?.('stun', T.famStunT, { src: p });   // f2A
  if (tv.famApprentice > 0) famApprentice(g, p, e, dmg);                                // f7
  if (tv.famEcho > 0) {                                                                // f9 Eco Elemental
    gainGauge(p, 'calor', T.famEchoCalor);
    if (e.alive) gainGauge(p, 'escarcha', T.famEchoCapas, e);
  }
  return true;
}
// el Familiar cae (Guardián): f6 Detonar Constructo estalla y vuelve antes
function famDown(g, p, st) {
  const T = magaTuning(), tv = tvOf(p);
  if (tv.famBoom > 0) {
    const dmg = p.avgHit(tv.famBoom / 100);
    for (const f of st.fams) {
      for (const e of enemiesIn(g, f.pos, T.famBoomR)) dealProcDamage(g, e, dmg, { source: 'power:m_familiar', skill: 'm_familiar', tags: new Set(['area', 'arcane']) });
      ring(g, f.pos, T.famBoomR, 0xc8a0ff);
    }
  }
  st.fams = [];
  st.hp = 0;
  st.downAt = now(p) + (tv.famBoom > 0 ? T.famVueltaBoom : T.famVuelta);
  g.ui?.spawnText?.(p.pos, 'El Familiar cae', 'txt-mana');
}
// f11 Hilo de Maná: daña a quien cruza el hilo entre la Maga y cada Familiar (por segundo)
function famThread(g, p, st) {
  const T = magaTuning(), pct = tvOf(p).famThread || 0;
  if (!(pct > 0)) return;
  const per = p.avgHit(pct / 100) * T.famThreadEvery;
  for (const f of st.fams) {
    const a = p.pos, b = f.pos;
    for (const e of g?.enemies || []) {
      if (!e.alive) continue;
      const r = T.famThreadW + 0.5 * (e.def?.scale || 1);
      const vx = b.x - a.x, vz = b.z - a.z, l2 = vx * vx + vz * vz || 1;
      const k = Math.max(0, Math.min(1, ((e.pos.x - a.x) * vx + (e.pos.z - a.z) * vz) / l2));
      const dx = e.pos.x - (a.x + vx * k), dz = e.pos.z - (a.z + vz * k);
      if (dx * dx + dz * dz <= r * r) dealProcDamage(g, e, per, { source: 'power:m_familiar', skill: 'm_familiar_hilo', tags: new Set(['arcane']) });
    }
    try { g.spawnBeam?.(at(a, a.x, a.z, 1.2), at(b, b.x, b.z, 1.4), 0xc8a0ff, T.famThreadEvery); } catch { /* */ }
  }
}

// ---- Escriba Rúnica: runas y Sellos (e0) ----
function runeFields(g, p) { return (g?.fieldsOf?.(p, { kind: 'm_runa_escrita' }) || []).filter(f => !f.data.spent && f.t > 0); }
function sealFields(g, p) { return (g?.fieldsOf?.(p, { kind: 'm_sello' }) || []).filter(f => !f.data.replaced && f.t > 0); }
function sealsAround(p) { return sealFields(p?.game, p).filter(f => insideR(p.pos, f.pos, f.radius)); }
// escribe una runa (sin `pos`: en corro a 1,8 m de la Maga, 120° más allá de la anterior)
function writeRune(g, p, elem, pos = null, { form = true } = {}) {
  const T = magaTuning(), tv = tvOf(p);
  const st = powerState(p, 'm_runas');
  if (!pos) {
    const a = (st.seq++ % 3) * Math.PI * 2 / 3 + 0.3;
    pos = at(p.pos, p.pos.x + Math.cos(a) * T.runaDist, p.pos.z + Math.sin(a) * T.runaDist);
  }
  // e6 Tinta Elemental: la runa toma el elemento del hechizo
  const el = tv.runeElem > 0 && elemColor(elem) ? elem : null;
  const f = g?.spawnField?.('m_runa_escrita', { pos, radius: T.runaRad, dur: T.runaVida + (tv.runeDur || 0), owner: p,
    data: { elem: el, used: false, armed: !insideR(p.pos, pos, T.runaRad) } });
  if (!f) return null;
  if (el === 'arcane') gainGauge(p, 'cargas', 1);            // «Arcano da 1 Carga»
  if (form) tryFormSeal(g, p, f);
  return f;
}
// tres runas a 5 m o menos forman un Sello en su centro (se gastan)
function tryFormSeal(g, p, rune) {
  const T = magaTuning();
  const near = runeFields(g, p).filter(f => insideR(f.pos, rune.pos, T.selloNear)).sort(byDist(rune.pos));
  if (near.length < 3) return null;
  const used = near.slice(0, 3);
  let x = 0, z = 0;
  for (const f of used) { f.data.spent = true; f.t = 0; x += f.pos.x; z += f.pos.z; }
  return formSeal(g, p, at(p.pos, x / 3, z / 3));
}
function formSeal(g, p, pos) {
  const T = magaTuning(), tv = tvOf(p);
  const max = 1 + (tv.sealMax || 0);                         // e9 Doble Sello
  const old = sealFields(g, p);
  while (old.length >= max) { const f = old.shift(); f.data.replaced = true; f.t = 0; }
  // e12 Gran Grimorio: cada 30 s, el siguiente Sello es un Grimorio de 10 s
  let grim = false;
  if (hasPower(p, 'm_gran_grimorio')) {
    const gst = powerState(p, 'm_gran_grimorio');
    if (now(p) >= gst.readyAt - 1e-9) { grim = true; gst.readyAt = now(p) + T.grimorioEvery; }
  }
  const f = g?.spawnField?.('m_sello', { pos, radius: T.selloR, dur: grim ? T.grimorioT : T.selloT, owner: p, data: { grimoire: grim } });
  if (!f) return null;
  ring(g, pos, T.selloR, grim ? 0xffd27a : 0xc8a0ff);
  g.ui?.spawnText?.(pos, grim ? '¡Grimorio!' : '¡Sello!', 'txt-mana');
  // e2B Sello Explosivo: estalla en su área al formarse
  if (tv.sealBurst > 0) {
    const dmg = p.avgHit(tv.sealBurst / 100);
    for (const e of enemiesIn(g, pos, T.selloR)) dealProcDamage(g, e, dmg, { source: 'power:m_runas', tags: new Set(['area', 'arcane']) });
  }
  // e7 Inspiración: todos tus enfriamientos bajan 2 s
  if (tv.sealCdr > 0) cdrWhere(g, p, tv.sealCdr, () => true);
  return f;
}

// ============================================================
// PODERES
// ============================================================
export function magaPowers() {
  const T = magaTuning();
  return {
    // ---------------------------------------------------- CLASE 2g (§4)
    // c10A Ralentizar: cada 8 s, el siguiente hechizo (con daño) ralentiza 50 % 4 s
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
        if (st.armed && hit?.skill === st.armed && e?.alive) e.applyCC?.('slow', slowDur(p, T.slowT), { pct: T.slowPct, src: p });
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'm_ralentizar');
        if (st.armed && cast?.sk?.id === st.armed) { st.armed = null; st.readyAt = now(p) + T.slowEvery; }
      },
    },
    // c5A Dardo Certero: cada 4.º Dardo Arcano es crítico seguro (⑦ pone cast.forceCrit)
    m_dardo_certero: {
      name: 'Dardo Certero', desc: 'Cada 4.º Dardo Arcano es crítico seguro.',
      state: () => ({ n: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_dardo') return;
        const st = powerState(p, 'm_dardo_certero');
        if (++st.n < T.certeroEvery) return;
        st.n = 0;
        cast.forceCrit = true;
      },
    },
    // c5B Dardo Sifón: si el Dardo mata, +6 de maná y tus principales se recargan 1 s antes
    m_dardo_sifon: {
      name: 'Dardo Sifón', desc: 'Si el Dardo Arcano mata, ganas 6 de maná y tus habilidades principales se recargan 1 s antes.',
      onKill(g, p, e, kill) {
        if (kill?.skill !== 'm_dardo') return;
        g.gainResource?.(p, T.sifonMana);
        cdrWhere(g, p, T.sifonCdr, d => d?.cat === 'spender');
      },
    },
    // c7 Paso Fugaz: después de Parpadeo, +30 % de velocidad 3 s
    m_paso_fugaz: {
      name: 'Paso Fugaz', desc: 'Después de Parpadeo corres un 30 % más rápido durante 3 s.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_parpadeo') return;
        p.addBuff('m_paso_fugaz', { spdPct: T.fugazSpd }, T.fugazT, { name: 'Paso Fugaz', icon: '💨', desc: `+${T.fugazSpd} % de velocidad` });
      },
    },
    // c9A Nova Congelante: la Nova congela 1 s (no a jefes); como mucho una vez cada 8 s
    m_nova_congelante: {
      name: 'Nova Congelante', desc: 'La Nova de Hielo congela 1 s (no a jefes); como mucho una vez cada 8 s.',
      state: () => ({ readyAt: 0, armed: false }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'nova_hielo') return;
        const st = powerState(p, 'm_nova_congelante');
        if (now(p) < st.readyAt - 1e-9) return;
        st.armed = true;
        st.readyAt = now(p) + T.novaFreezeEvery;
      },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'nova_hielo' || hit.proc || hit.dot || !e?.alive || isBoss(e)) return;
        if (powerState(p, 'm_nova_congelante').armed) e.applyCC?.('freeze', T.novaFreezeT, { src: p });
      },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'nova_hielo') powerState(p, 'm_nova_congelante').armed = false; },
    },
    // c9B Nova Cortante: el +40 % de daño es su mod; aquí, 1 s menos de ralentización
    // (un mod `slow` es un máximo: no puede restar)
    m_nova_cortante: {
      name: 'Nova Cortante', desc: 'La Nova de Hielo ralentiza 1 s menos.',
      modifyResolve(p, sk, prof) {
        if (sk.id === 'nova_hielo' && prof.slow > 0) prof.slow = Math.max(0, prof.slow - T.cortanteSlow);
      },
    },
    // c10B Disrupción: cada 10 s, tu siguiente Dardo corta el hechizo y deja mudo 3 s (a los
    // jefes, applyCC('interrupt') ya les llena 20 de Quebranto)
    m_disrupcion: {
      name: 'Disrupción', desc: 'Cada 10 s, tu siguiente Dardo Arcano corta el hechizo del enemigo y lo deja mudo 3 s.',
      state: () => ({ readyAt: 0 }),
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'm_dardo' || hit.proc || hit.dot || hit.echo || !e?.alive) return;
        const st = powerState(p, 'm_disrupcion');
        if (now(p) < st.readyAt - 1e-9) return;
        st.readyAt = now(p) + T.disrupEvery;
        e.applyCC?.('interrupt', T.disrupT, { src: p });
        text(g, e, '¡Silenciado!', 'txt-mana');
      },
    },
    // c11B Aguante Arcano: un golpe letal te deja a 1 de vida con una Barrera gratis (cada 120 s)
    m_aguante: {
      name: 'Aguante Arcano', desc: 'Un golpe que te mataría te deja con 1 de vida y una Barrera de Maná gratis. Una vez cada 120 s.',
      state: () => ({ readyAt: 0 }),
      priority: -2,                                    // después de Fénix (el que da más vida, primero)
      onLethal(g, p) {
        const st = powerState(p, 'm_aguante');
        if (now(p) < st.readyAt - 1e-9) return false;
        st.readyAt = now(p) + T.aguanteCd;
        p.setHp(1, 'm_aguante');                        // restauración (no escala)
        putBarrier(g, p, barrierAmount(p), barrierDur(p));
        g.ui?.spawnText?.(p.pos, '¡Aguante!', 'txt-heal');
        return true;
      },
    },
    // c14A Runa de Escarcha: donde empieza tu Parpadeo queda una runa que ralentiza (⑦ onCast:
    // aún estás en el punto de partida)
    m_runa: {
      name: 'Runa de Escarcha', desc: 'Donde empieza tu Parpadeo queda una runa que ralentiza un 50 % durante 3 s.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_parpadeo') return;
        g.spawnField?.('m_runa_escarcha', { pos: p.pos, radius: T.runaR, dur: T.runaT, owner: p, data: { slowPct: T.runaSlowPct } });
      },
    },
    // c14B Parpadeo Reparador: te cura un 8 % (curación de habilidad) y te quita las ralentizaciones
    m_parpadeo_cura: {
      name: 'Parpadeo Reparador', desc: 'Parpadeo te cura un 8 % de la vida y te quita las ralentizaciones.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_parpadeo') return;
        g.heal?.(p.stats.maxHP * T.reparoPct / 100, { target: 'self', src: 'm_parpadeo_cura' });
        p.cleanse?.();
      },
    },
    // c15A Escudo de Maná: el 20 % del daño que recibes lo pagas con maná (mientras te quede)
    m_escudo_mana: {
      name: 'Escudo de Maná', desc: 'El 20 % del daño que recibes lo pagas con maná en vez de vida.',
      onDamaged(g, p, dmg) {
        const take = Math.min((dmg?.amount || 0) * T.escudoManaPct / 100, p.mp || 0);
        if (!(take > 0)) return;
        p.mp -= take;
        dmg.amount -= take;
      },
    },
    // c16A Armonía Elemental: cada cambio de elemento (entre hechizos con daño) +8 % 5 s, hasta 3
    m_armonia: {
      name: 'Armonía Elemental', desc: 'Cada vez que cambias de elemento: +8 % de daño durante 5 s (hasta 3 veces).',
      state: () => ({ last: null, stacks: [] }),
      onCast(g, p, cast) {
        const el = isSpell(cast) ? cast.prof.elem : null;
        if (!el) return;
        const st = powerState(p, 'm_armonia');
        st.stacks = st.stacks.filter(t => t > now(p));
        if (st.last && st.last !== el) {
          st.stacks.push(now(p) + T.armoniaT);
          while (st.stacks.length > T.armoniaMax) st.stacks.shift();
        }
        st.last = el;
      },
      condAdd(p) {
        let n = 0;
        for (const t of powerState(p, 'm_armonia').stacks) if (t > now(p)) n++;
        return n * T.armoniaPct;
      },
    },
    // c16B Pureza Elemental: 3 hechizos seguidos del mismo elemento → +15 % a ese elemento 6 s
    m_pureza: {
      name: 'Pureza Elemental', desc: 'Tres hechizos seguidos del mismo elemento: +15 % de daño de ese elemento durante 6 s.',
      state: () => ({ elem: null, n: 0, bonus: null, until: 0 }),
      onCast(g, p, cast) {
        const el = isSpell(cast) ? cast.prof.elem : null;
        if (!el) return;
        const st = powerState(p, 'm_pureza');
        if (st.elem === el) st.n++; else { st.elem = el; st.n = 1; }
        if (st.n >= T.purezaN) { st.bonus = el; st.until = now(p) + T.purezaT; }
      },
      condAdd(p, e, hit) {
        const st = powerState(p, 'm_pureza');
        return hit?.elem && hit.elem === st.bonus && now(p) < st.until ? T.purezaPct : 0;
      },
    },
    // c17B Anclaje Temporal: un golpe que te deja por debajo del 30 % → −30 % de daño recibido
    // y +50 % de velocidad 4 s (cada 60 s)
    m_anclaje: {
      name: 'Anclaje Temporal', desc: 'Al bajar del 30 % de vida: −30 % de daño recibido y +50 % de velocidad 4 s. Una vez cada 60 s.',
      state: () => ({ readyAt: 0 }),
      onDamaged(g, p, dmg) {
        const st = powerState(p, 'm_anclaje');
        if (now(p) < st.readyAt - 1e-9 || !(p.hp - (dmg?.amount || 0) < (p.stats?.maxHP || 0) * T.anclajeHp)) return;
        st.readyAt = now(p) + T.anclajeCd;
        p.addBuff('m_anclaje', { dr: T.anclajeDr, spdPct: T.anclajeSpd }, T.anclajeT, { name: 'Anclaje Temporal', icon: '⚓', desc: `−${T.anclajeDr} % de daño recibido y +${T.anclajeSpd} % de velocidad` });
      },
    },
    // c19 Barrera Resonante: con la Barrera puesta, cada Dardo da 2 de maná y la recarga un 2 %
    // de tu vida (hasta lo que absorbía al ponerla)
    m_barrera_resonante: {
      name: 'Barrera Resonante', desc: 'Con la Barrera puesta, cada Dardo Arcano te da 2 de maná y la recarga un 2 % de tu vida.',
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'm_dardo' || hit.proc || hit.dot) return;
        const s = barrierShield(p);
        if (!s) return;
        g.gainResource?.(p, T.resonanteMana);
        s.max = s.max ?? s.amt;
        s.amt = Math.min(s.max, s.amt + (p.stats?.maxHP || 0) * T.resonanteVida / 100);
      },
    },
    // c20 Escarcha Arcana: tus críticos ralentizan un 30 % 2 s; el Dardo tiene +15 % de crítico
    // contra ralentizados
    m_escarcha_arcana: {
      name: 'Escarcha Arcana', desc: 'Tus críticos ralentizan un 30 % 2 s; contra enemigos ralentizados, el Dardo Arcano tiene +15 % de crítico.',
      onHit(g, p, e, hit) {
        if (!hit?.crit || hit.proc || hit.dot || !e?.alive) return;
        e.applyCC?.('slow', slowDur(p, T.escArcT), { pct: T.escArcSlowPct, src: p });
      },
      condCrit(p, e, hit) { return hit?.skill === 'm_dardo' && e && ((e.slowT || 0) > 0 || (e.frozenT || 0) > 0) ? T.escArcCrit : 0; },
    },
    // c21 Escarcha Tenaz: tus ralentizaciones duran 2 s más (las del perfil aquí; las de los
    // poderes de la Maga, con slowDur). Antes que Nova Cortante: suma sobre la ralentización base
    m_escarcha_tenaz: {
      name: 'Escarcha Tenaz', desc: 'Todas tus ralentizaciones duran 2 s más.',
      priority: 1,
      modifyResolve(p, sk, prof) { if (prof.slow > 0) prof.slow += T.tenazS; },
    },
    // c25 Cristal de Barrera: al romperse la Barrera, estalla (empuja, ralentiza y devuelve maná)
    m_cristal: {
      name: 'Cristal de Barrera', desc: 'Cuando se rompe la Barrera, estalla: empuja 3 m, ralentiza y te devuelve maná.',
      state: () => ({ bar: null }),
      onDamaged(g, p) { if (barrierBroke(p, powerState(p, 'm_cristal'))) crystalBurst(g, p); },
      onTick(g, p) { if (barrierBroke(p, powerState(p, 'm_cristal'))) crystalBurst(g, p); },
    },
    // c26 Torrente de Maná: gastar 60 de maná en 3 s → Sobrecarga (+4 + 8 × rango % de daño 4 s)
    m_torrente: {
      name: 'Torrente de Maná', desc: 'Si gastas 60 de maná en 3 s, entras en Sobrecarga: más daño durante 4 s.',
      state: () => ({ log: [] }),
      onCast(g, p, cast) {
        const cost = cast?.recast && cast.prof?.recast?.free ? 0 : (cast?.prof?.cost || 0);
        if (!(cost > 0)) return;
        const st = powerState(p, 'm_torrente'), t = now(p);
        st.log = st.log.filter(x => t - x.t <= T.torrenteWin + 1e-9);
        st.log.push({ t, c: cost });
        if (st.log.reduce((a, x) => a + x.c, 0) < T.torrenteMana - 1e-9) return;
        st.log = [];
        const pct = T.torrenteBase + T.torrenteRank * rankOf(p, 'm_torrente');
        p.addBuff('m_torrente', { dmgPct: pct }, T.torrenteT, { name: 'Sobrecarga', icon: '🌀', desc: `+${pct} % de daño` });
        g.ui?.spawnText?.(p.pos, '¡Sobrecarga!', 'txt-mana');
      },
    },
    // c27 Imagen Arcana: Parpadeo deja una copia tuya (2 + rango s) que atrae a los enemigos a 6 m
    m_imagen: {
      name: 'Imagen Arcana', desc: 'Parpadeo deja una copia tuya unos segundos; los enemigos a 6 m la atacan a ella.',
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_parpadeo') return;
        const pos = at(p.pos, p.pos.x, p.pos.z);
        const decoy = { pos: pos.clone(), alive: true, decoy: true, hp: 1, stats: { maxHP: 1 }, takeDamage() { return 0; }, applySlow() { return false; } };
        const f = g.spawnField?.('m_imagen', { pos, radius: T.imagenR, dur: T.imagenBase + rankOf(p, 'm_imagen'), owner: p, data: { decoy } });
        if (f) imageTaunt(g, f);
      },
    },
    // c28 Bastión Arcano (final): la Barrera no caduca y vuelve sola a los 20 s de romperse; con
    // ella, tus hechizos cuestan un 10 % menos por rango
    m_bastion: {
      name: 'Bastión Arcano', desc: 'La Barrera ya no caduca y vuelve a los 20 s de romperse; con ella, tus hechizos cuestan menos.',
      state: () => ({ bar: null, up: false, backAt: 0 }),
      modifyResolve(p, sk, prof) {
        if (!(prof.cost > 0) || !barrierShield(p)) return;
        prof.cost *= Math.max(0, 1 - T.bastionCoste * rankOf(p, 'm_bastion') / 100);
      },
      onDamaged(g, p) { bastionWatch(g, p, false); },
      onTick(g, p) { bastionWatch(g, p, true); },
    },
    // c29 Archimaga (final): cada 4.ª habilidad principal se repite gratis al 20 + 20 × rango %
    m_archimaga: {
      name: 'Archimaga', desc: 'Cada 4.ª habilidad principal se lanza dos veces: la copia es gratis.',
      state: () => ({ n: 0 }),
      afterCast(g, p, cast) {
        if (!isSpender(cast) || cast.echo) return;
        const st = powerState(p, 'm_archimaga');
        if (++st.n < T.archimagaEvery) return;
        st.n = 0;
        echoCast(g, p, cast, (T.archimagaBase + T.archimagaRank * rankOf(p, 'm_archimaga')) / 100, T.echoGap);
      },
    },
    // c30 Paso del Vacío (final): tras Parpadeo, tu siguiente principal no se recarga y hace
    // +15 % por rango
    m_vacio: {
      name: 'Paso del Vacío', desc: 'Tras Parpadeo, tu siguiente habilidad principal no se recarga y hace más daño.',
      state: () => ({ armed: false, skill: null }),
      onCast(g, p, cast) {
        const st = powerState(p, 'm_vacio');
        if (st.armed && isSpender(cast)) { st.armed = false; st.skill = cast.sk.id; }
      },
      condAdd(p, e, hit) {
        const st = powerState(p, 'm_vacio');
        return st.skill && hit?.skill === st.skill ? T.vacioPct * rankOf(p, 'm_vacio') : 0;
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'm_vacio');
        if (cast?.sk?.id === 'm_parpadeo') { st.armed = true; return; }
        if (st.skill && cast?.sk?.id === st.skill) { g.reduceCooldown?.(p, st.skill, Infinity); st.skill = null; }
      },
    },

    // ---------------------------------------------------- PARAGON 2g (§7)
    // t0 Marca del Tiempo (Cronomante): tu primer golpe marca 4 s; al acabar, repite el 30 % de
    // todo el daño que le hiciste (procs y DoT incluidos; no el de otras Marcas). Lee las
    // claves tv chrono* de t1–t11
    m_marca_tiempo: {
      name: 'Marca del Tiempo', desc: 'Tu primer golpe marca al enemigo; al acabar, la Marca repite parte del daño que le hiciste.',
      procs: true,
      state: () => ({ marks: new Map(), ends: 0, stopUntil: 0, stopOn: false, detener: null }),
      onHit(g, p, e, hit) {
        if (!e || hit?.source === 'power:m_marca_tiempo') return;
        const st = cronoState(p), tv = tvOf(p);
        const dealt = hit?.dealt || 0;
        let m = st.marks.get(e);
        if (!m) {
          if (hit.proc || hit.dot || !e.alive) return;            // la pone un golpe directo
          m = putMark(g, p, e, st);
          if (!m) return;
          if (tv.chronoOmen > 0) m.stored += dealt;               // t8A Presagio: ese golpe cuenta doble
        }
        m.stored += dealt * (underTimeStop(p, st, e) ? 2 : 1);
        // t11 Momento Exacto: tus críticos alargan la Marca 1 s (hasta 3 s)
        if (hit.crit && !hit.proc && !hit.dot && tv.chronoCritExt > 0 && m.ext < T.marcaCritMax) {
          const add = Math.min(tv.chronoCritExt, T.marcaCritMax - m.ext);
          m.until += add; m.ext += add;
        }
      },
      // t4A Detener el Tiempo (activa del catálogo): los enemigos a 8 m guardan el doble 3 s
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_h_detener') return;
        cronoState(p).detener = { until: now(p) + (cast.prof?.dur || T.detenerT), set: new Set(alivesNear(g, p.pos, cast.prof?.radius || T.detenerR)) };
      },
      onTick(g, p) { resolveMarks(g, p); },
    },
    // t4B Retroceso: al bajar del 40 %, vuelves a la vida de hace 3 s (cada 90 s)
    m_retroceso: {
      name: 'Retroceso', desc: 'Al bajar del 40 % de vida, vuelves a la vida que tenías hace 3 s. Una vez cada 90 s.',
      state: () => ({ hist: [], acc: 1, readyAt: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'm_retroceso');
        st.acc += dt;
        if (st.acc < 0.25 - 1e-9) return;
        st.acc = 0;
        st.hist.push({ t: now(p), hp: p.hp });
        while (st.hist.length > 20) st.hist.shift();
      },
      onDamaged(g, p, dmg) {
        const st = powerState(p, 'm_retroceso');
        const after = p.hp - (dmg?.amount || 0);
        if (now(p) < st.readyAt - 1e-9 || !(after < (p.stats?.maxHP || 0) * T.retroHp)) return;
        let snap = null;
        for (const s of st.hist) if (s.t <= now(p) - T.retroT + 1e-6) snap = s;
        if (!snap || !(snap.hp > after)) return;
        st.readyAt = now(p) + T.retroCd;
        dmg.amount = 0;
        p.setHp(Math.max(p.hp, snap.hp), 'm_retroceso');          // restauración
        ring(g, p.pos, 1.4, 0xe8c87a);
        g.ui?.spawnText?.(p.pos, '¡Retroceso!', 'txt-heal');
      },
    },
    // t12 Señora del Tiempo (final): cada 30 s, tu siguiente principal para el reloj 5 s; las
    // Marcas no terminan y luego repiten el 100 % de lo guardado
    m_senora_tiempo: {
      name: 'Señora del Tiempo', desc: 'Cada 30 s, tu siguiente habilidad principal para el reloj 5 s y las Marcas repiten todo lo guardado.',
      state: () => ({ readyAt: 0 }),
      onCast(g, p, cast) {
        if (!isSpender(cast)) return;
        const st = powerState(p, 'm_senora_tiempo');
        if (now(p) < st.readyAt - 1e-9) return;
        st.readyAt = now(p) + T.senoraEvery;
        const c = cronoState(p);
        c.stopUntil = now(p) + T.senoraT;
        c.stopOn = true;
        ring(g, p.pos, 3, 0xe8c87a);
        g.ui?.spawnText?.(p.pos, '¡El tiempo se detiene!', 'txt-crit');
      },
    },
    // f0 Familiar Arcano (Invocadora): uno, tres con Enjambre; dispara cada 1,5 s con tu último
    // elemento. Lee las claves tv fam* de f1–f11
    m_familiar: {
      name: 'Familiar Arcano', desc: 'Un Familiar de maná dispara cada 1,5 s con el elemento de tu último hechizo.',
      state: () => ({ fams: [], hp: 0, maxHp: 0, elem: 'arcane', downAt: 0, hasteUntil: 0, recent: [], threadAcc: 0, fxAcc: 0 }),
      onTick(g, p, dt) {
        const st = famState(p), tv = tvOf(p);
        famSync(g, p, st);
        if (!st.fams.length) return;
        const haste = now(p) < st.hasteUntil ? (tv.famHaste || 0) : 0;
        const every = T.famEvery / (1 + haste / 100);
        for (const f of st.fams) {
          f.acc += dt;
          if (f.acc >= every - 1e-9 && famShoot(g, p, st, f)) f.acc -= every;
          else if (f.acc > every) f.acc = every;               // sin objetivo: listo para el siguiente
        }
        st.threadAcc += dt;
        if (st.threadAcc >= T.famThreadEvery - 1e-9) { st.threadAcc = 0; famThread(g, p, st); }
        st.fxAcc += dt;
        if (st.fxAcc >= 0.2 - 1e-9) {
          st.fxAcc = 0;
          for (const f of st.fams) g.emitFx?.(glow(elemHex(st.elem), tv.famSwarm > 0 ? 0.24 : 0.36), at(f.pos, f.pos.x, f.pos.z, 1.4));
        }
      },
      onCast(g, p, cast) {
        const st = famState(p);
        if (cast?.sk?.id) st.recent = [...st.recent.filter(x => now(p) - x.t <= T.famForgeWin), { id: cast.sk.id, t: now(p) }];
        if (isSpell(cast) && elemColor(cast.prof.elem)) st.elem = cast.prof.elem;
      },
      afterCast(g, p, cast) {
        const st = famState(p), tv = tvOf(p);
        if (!st.fams.length || cast?.echo) return;
        if (tv.famHaste > 0 && isSpender(cast)) st.hasteUntil = now(p) + T.famHasteT;          // f5 Sobrecarga
        if (tv.famUltCopy > 0 && cast?.sk?.cat === 'ultimate') echoCast(g, p, cast, tv.famUltCopy / 100, 0.3);   // f3 Imitación
      },
      // f4A Guardián: el Familiar recibe el 15 % del daño que te hacen
      onDamaged(g, p, dmg) {
        const st = famState(p), pct = tvOf(p).famGuard || 0;
        if (!(pct > 0) || !st.fams.length || !(dmg?.amount > 0)) return;
        const share = dmg.amount * pct / 100;
        dmg.amount -= share;
        st.hp -= share;
        if (st.hp <= 0) famDown(g, p, st);
      },
    },
    // f12 Legión (final): cada 25 s, el Familiar se divide en 3 durante 8 s y todos copian tu
    // siguiente principal al 50 % (como mucho 3 repeticiones por lanzamiento)
    m_legion: {
      name: 'Legión', desc: 'Cada 25 s, tu Familiar se divide en 3 durante 8 s y todos copian tu siguiente habilidad principal.',
      state: () => ({ readyAt: 0, until: 0, copy: false }),
      onTick(g, p) {
        const st = powerState(p, 'm_legion');
        if (now(p) < st.readyAt - 1e-9 || !famState(p).fams.length) return;
        st.readyAt = now(p) + T.legionEvery;
        st.until = now(p) + T.legionT;
        st.copy = true;
        g.ui?.spawnText?.(p.pos, '¡Legión!', 'txt-mana');
      },
      afterCast(g, p, cast) {
        const st = powerState(p, 'm_legion');
        if (!st.copy || !isSpender(cast) || cast.echo || !legionOn(p)) return;
        st.copy = false;
        const n = Math.min(3, famState(p).fams.length);
        for (let i = 0; i < n; i++) echoCast(g, p, cast, T.legionCopy / 100, T.echoGap + 0.15 * i);
      },
    },
    // e0 Runas (Escriba Rúnica): cada 3.er hechizo escribe una runa; tres cerca forman un Sello:
    // dentro haces +15 % y recibes −10 %. Lee las claves tv rune*/seal* de e1–e11
    m_runas: {
      name: 'Runas', desc: 'Cada 3.er hechizo escribe una runa; tres runas cerca forman un Sello que te potencia.',
      state: () => ({ n: 0, seq: 0 }),
      onCast(g, p, cast) {
        if (!cast?.sk || cast.sk.id === 'm_h_palabra') return;           // todo hechizo, también el Dardo
        const st = powerState(p, 'm_runas');
        const every = Math.max(1, T.runaEvery - (tvOf(p).runeFast || 0));          // e5 Caligrafía Rápida
        if (++st.n < every) return;
        st.n = 0;
        writeRune(g, p, cast.prof?.elem || cast.sk.elem);
      },
      // e4A Palabra de Poder (activa del catálogo): 3 runas a tu alrededor → un Sello donde estás
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_h_palabra') return;
        for (let i = 0; i < 3; i++) writeRune(g, p, cast.prof?.elem || 'arcane', null, { form: i === 2 });
      },
      condAdd(p) { return sealsAround(p).length ? T.selloDmg + (tvOf(p).sealDmg || 0) : 0; },
      condDr(p) { return sealsAround(p).length ? T.selloDr + (tvOf(p).sealDr || 0) : 0; },
      // e10 Concentración: dentro del Sello lanzas más rápido (sin recompute por tic)
      onTick(g, p) {
        const a = tvOf(p).sealAspd || 0;
        if (a > 0 && sealsAround(p).length) refreshBuff(p, 'm_sello_prisa', { aspdPct: a }, 0.35, { name: 'Concentración', icon: '📜', desc: `+${a} % de velocidad de lanzamiento` });
      },
    },
    // e12 Gran Grimorio (final): dentro de un Grimorio, cada hechizo se repite al 40 % (el Sello
    // se vuelve Grimorio en formSeal, cada 30 s)
    m_gran_grimorio: {
      name: 'Gran Grimorio', desc: 'Cada 30 s, tu siguiente Sello es un Grimorio: dentro, cada hechizo se lanza dos veces.',
      state: () => ({ readyAt: 0 }),
      afterCast(g, p, cast) {
        if (!isSpell(cast) || cast.echo) return;
        if (!sealsAround(p).some(f => f.data.grimoire)) return;
        echoCast(g, p, cast, T.grimorioCopy / 100, 0.2);
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
    // x1 Cadena de Rayos: el primer crítico de cada Rayo salta a 3 enemigos con el 150 % (2e);
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
// sin objetivo: devuelve el enfriamiento entero (D2: solo con g.reduceCooldown; Infinity = listo)
function refund(g, p, sk, msg) {
  g.reduceCooldown?.(p, sk.id, Infinity);
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
    // Paso 2g: es el comportamiento de la Barrera del kit base (m_barrera): la fuente del escudo es
    // el id de la habilidad (los poderes la reconocen así), c18 la refuerza por prof.buffMul y con
    // Bastión Arcano (c28) no caduca
    m_t_barrera: {
      params: ['shieldManaPct'],
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const def = prof.def || sk;
        const dur = prof.dur || def.dur || T.barrierT;
        const amt = (def.shieldManaPct || T.barrierPct) / 100 * (p.stats.maxMP || 0) * (prof.buffMul || 1);
        putBarrier(g, p, amt, dur, sk.id);
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
    // Orbe Arcano: lento, atraviesa y rebota 2 veces (cada segmento golpea de nuevo). Los rebotes
    // salen de la definición FORJADA (la variante puede quitarlos: set { bounces: 0 })
    a_orbe: {
      params: ['bounces'],
      cast(g, p, prof, cast) {
        const { ctx } = cast;
        const def = prof.def || cast.sk;
        p.faceToward?.(cast.target);
        p.swing = 1;
        let finished = false;
        const done = () => { if (!finished) { finished = true; cast.done(ctx.res); } };
        orbSegment(g, ctx, p.pos.clone(), cast.target || p.pos, def.bounces ?? 2, done);
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
// c27 Imagen Arcana: los enemigos del radio atacan a la copia (provocación corta, renovada)
function imageTaunt(g, f) {
  const t = Math.min(f.t, 0.7);
  if (!(t > 0) || !f.data.decoy?.alive) return;
  for (const e of enemiesIn(g, f.pos, f.radius)) g.forceTarget?.(e, f.data.decoy, t);
}

export function magaFields() {
  const T = magaTuning();
  return {
    // ---- Paso 2g: campos del árbol de clase y del Paragon ----
    // c14A Runa de Escarcha: ralentiza (1 s, renovado) a quien la pisa
    m_runa_escarcha: {
      name: 'Runa de Escarcha',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesIn(g, f.pos, f.radius)) e.applyCC?.('slow', slowDur(f.owner, 1), { pct: f.data.slowPct || T.runaSlowPct, src: f.owner });
      },
      render(g, f) { decal(g, f, { color: 0x9fe3ff, opacity: 0.4 }); },
    },
    // c27 Imagen Arcana: la copia que provoca a los enemigos a 6 m mientras dura
    m_imagen: {
      name: 'Imagen Arcana',
      init(f) { f.acc = 0; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        imageTaunt(g, f);
        g.emitFx?.(glow('#c8a0ff', 0.5, 0.5), { x: f.pos.x, y: 1.1, z: f.pos.z });
      },
      onExpire(g, f) { if (f.data.decoy) f.data.decoy.alive = false; },
      render(g, f) { decal(g, f, { color: 0xc8a0ff, opacity: 0.2 }); },
    },
    // t9 Grieta Temporal: ralentiza (1 s, renovado) a los enemigos dentro
    m_grieta: {
      name: 'Grieta Temporal',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesIn(g, f.pos, f.radius)) e.applyCC?.('slow', slowDur(f.owner, 1), { pct: f.data.slowPct || 30, src: f.owner });
      },
      render(g, f) { decal(g, f, { color: 0xe8c87a, opacity: 0.3, disc: true }); },
    },
    // e0 runa escrita: Tinta de Maná (pisarla, una vez, da maná) y Tinta Elemental (Hielo frena,
    // Fuego quema a quien la pisa). `armed`: la Maga tiene que salir de ella antes de pisarla
    m_runa_escrita: {
      name: 'Runa',
      init(f) { f.acc = 0.5; },
      tick(g, f, dt) {
        const p = f.owner, d = f.data, tv = tvOf(p);
        if (!p) return;
        const on = p.alive && insideR(p.pos, f.pos, f.radius);
        if (!on) d.armed = true;
        else if (d.armed && !d.used && tv.runeMana > 0) {
          d.used = true;
          g.gainResource?.(p, tv.runeMana);
          g.ui?.spawnText?.(p.pos, `+${tv.runeMana} maná`, 'txt-mana');
        }
        f.acc += dt;
        if (!d.elem || f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        for (const e of enemiesIn(g, f.pos, f.radius)) {
          if (d.elem === 'frost') e.applyCC?.('slow', slowDur(p, 1), { pct: T.runaElemSlowPct, src: p });
          else if (d.elem === 'fire' && !(g.dotRemaining?.(e, 'm_runa:burn') > 0)) g.replaceDoT?.(e, p.avgHit(T.runaBurnCoef), T.runaBurnT, 1, 'm_runa:burn');
        }
      },
      render(g, f) { decal(g, f, { color: elemColor(f.data.elem) || 0xc8a0ff, opacity: 0.45, disc: true }); },
    },
    // e0 Sello: dentro, +daño y −daño recibido (los da el poder m_runas); Glosa (e8A) debilita a
    // los enemigos dentro y Círculo Protector (e8B) cura a los aliados dentro; Palimpsesto (e11)
    m_sello: {
      name: 'Sello',
      init(f) { f.acc = 0.5; f.healAcc = 0; },
      tick(g, f, dt) {
        const p = f.owner, tv = tvOf(p);
        f.acc += dt; f.healAcc += dt;
        if (f.acc >= 0.5 - 1e-9) {
          f.acc = 0;
          if (tv.sealVuln > 0) for (const e of enemiesIn(g, f.pos, f.radius)) e.applyWeakness?.('m_glosa', tv.sealVuln, 0.7);
        }
        if (f.healAcc >= 1 - 1e-9) {
          f.healAcc = 0;
          if (tv.sealRegen > 0 && g.heal) {
            const c = at(p.pos, f.pos.x, f.pos.z);
            g.heal(a => a.stats.maxHP * tv.sealRegen / 100, { target: 'all', pos: c, radius: f.radius, src: 'm_sello' });
          }
        }
      },
      // e11 Palimpsesto: al acabar deja 3 runas; si sigues dentro, el Sello vuelve a formarse
      onExpire(g, f) {
        const p = f.owner;
        if (!p?.alive || f.data.replaced || !(tvOf(p).sealPalimpsest > 0)) return;
        const inside = insideR(p.pos, f.pos, f.radius);
        for (let i = 0; i < 3; i++) {
          const a = i * Math.PI * 2 / 3;
          writeRune(g, p, null, at(p.pos, f.pos.x + Math.cos(a) * T.palimpsestoR, f.pos.z + Math.sin(a) * T.palimpsestoR), { form: inside && i === 2 });
        }
      },
      render(g, f) {
        const d = decal(g, f, { color: f.data.grimoire ? 0xffd27a : 0xc8a0ff, opacity: 0.4 });
        if (d) d.material.opacity = 0.25 + 0.15 * Math.abs(Math.sin(f.t * 2));
      },
    },
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
