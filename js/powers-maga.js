// ============================================================
// PODERES de la MAGA (Piromante · Crionte · Arcanista) — Paso 2c.1 / 2c.2 · Paso 2g (KT-maga)
// ============================================================
// Dueño desde el Paso 2 (E2): KT-maga (docs/paso2-implementacion.md §2 E2). js/powers.js importa
// y registra al cargar los cuatro mapas que devuelven las funciones de abajo.
// Son FUNCIONES (no constantes) a propósito: powers.js ↔ powers-maga.js forman un
// ciclo de módulos y una función declarada se puede llamar aunque este módulo aún
// no se haya evaluado (p. ej. si un test lo importa el primero). Por eso TODOS los
// helpers de este archivo son `function` (se elevan) y nada del nivel superior lee
// un binding importado: no hay `const` de módulo. Tampoco se importa js/talents.js ni
// js/skill-resolve.js: resources.js → powers.js → aquí → data.js leería RESOURCE_DEFS sin
// iniciar (el rango de un final sale del agregado que deja recompute: rankOf = talents.powerRank;
// el perfil de una habilidad, de la caché p.resolved).
//
//  magaPowers()          { id: PowerDef }  → definePower (claves de POWER_KEYS en powers.js).
//                        Ningún poder declara `mult` (test67 / test-powers-maga).
//  magaSkillBehaviors() { skillId: { cast?(g,p,prof,cast), passiveTick? } } → el `behavior` de las
//                        activas de talento de la clase (Bloque, Inversión y Contrahechizo). El kit y
//                        las activas del Paragon son del catálogo (KA-maga, js/skills-maga.js).
//  magaFields()          campos de suelo propios (runas, Sellos, Cráter, Suelo Helado, grietas…).
//  magaGauges()          ninguno nuevo: los tres indicadores (calor, escarcha, cargas) son los de
//                        js/mech-maga.js; aquí se potencian con gainGauge/setGauge/onGauge.
//
// MAPA nodo 2g → implementación (docs/paso2g-maga-coherencia.md §4, §5 y §7; el texto del nodo manda):
//  Clase   c1 stats.mpPct · c2 mod @all · c3 mod m_parpadeo · c4 tv.barrierDr · c5 m_dardo_certero |
//          m_dardo_sifon · c6 mod @spender dmgDirect | splashPct · c7 m_paso_fugaz · c8 tv.drHighMana ·
//          c9 m_nova_congelante | mod nova_hielo + m_nova_cortante · c10 m_ralentizar | m_disrupcion ·
//          c11 activa m_t_bloque | m_aguante · c12 stats.mph · c13 stats.crit · c14 m_runa | m_parpadeo_cura ·
//          c15 m_escudo_mana | stats.regenPct + tv.highManaDmg · c16 m_armonia | m_pureza · c17 activa
//          m_t_inversion | m_anclaje · c18 mod m_barrera buff · c19 m_barrera_resonante · c20 m_escarcha_arcana ·
//          c21 m_escarcha_tenaz · c22 activa m_t_contrahechizo | tv.costRedBig · c23 m_ritmo_arcano ·
//          c24 stats.aspdPct · c25 m_cristal · c26 m_torrente · c27 m_imagen · finales c28 m_bastion ·
//          c29 m_archimaga · c30 m_vacio.
//  Paragon Cronomante t0 m_marca_tiempo + claves tv chrono* (MAGA_TV_KEYS) · t4A activa m_h_detener ·
//          t4B m_retroceso · final t12 m_senora_tiempo. Invocadora f0 m_familiar + claves fam* · f8A activa
//          m_h_constructo · final f12 m_legion. Escriba Rúnica e0 m_runas + claves rune*/seal* · e4A activa
//          m_h_palabra · final e12 m_gran_grimorio. La Marca escucha ③ afterCast de m_h_detener (guardan el
//          doble) y las runas, el de m_h_palabra.
//  Piro    s0 p_ignicion (quemadura + Bola al 350 %) · s1 tv.burnDur · s2 tv.burningCrit · s3 mod bola_fuego ·
//          s4 tv.burnPct · s5 p_chispas · s6 p_volatil · s7 p_pira · s8 p_propagacion | p_acumular ·
//          s9 p_llamarada_avivada | p_llamarada_voraz · s10 p_meteoro_gemelo | p_meteoro_conc ·
//          s11 tv.burnKillHeal/burnKillMana · s12 tv.critFireCdr · s13 mod meteoro/supernova ·
//          s14 mod meteoro (ralentiza) + p_sismico · s15 p_fenix | p_escudo_llamas · s16 p_brasero ·
//          s17 p_estrellas_fugaces · s18 p_brasa_errante · s19 tv.calorHit (mech) · s20 mod @fire radius ·
//          s21 p_estela_meteorica · s22 p_brasa_viva · s23 p_combustion · s24 p_crater (campo) ·
//          finales s25 p_incendio · s26 p_perpetua · s27 p_lluvia_fuego · ápice s28 p_corazon_sol.
//  Crionte i0 la mecánica (js/mech-maga.js) · i1 tv.freezeDur · i2 k_filo_helado · i3 mod nova_hielo ·
//          i4 tv.frostDecay (mech) · i5 k_quebradizo · i6 k_polvo · i7 mod m_u_tormenta + k_crece · i8 mod k_prision |
//          k_prision_profunda · i9 mod k_lanza | k_lanza_invierno · i10 k_ventisca_viva | k_frio_sostenido ·
//          i11 tv.frozenKillHeal/frozenKillMana · i12 k_astillas · i13 mod · i14 k_suelo (campo) ·
//          i15 k_piel_invierno | k_cristal · i16 k_invierno · i17 k_remolino · i18 k_cadena · i19 k_ruptura ·
//          i20 mod @frost radius · i21 k_ojo_frio · i22 k_glaciar · i23 k_esquirlas · i24 k_perpetua ·
//          finales i25 k_era_glacial · i26 k_cero · i27 k_eterno · ápice i28 k_corazon_invierno.
//  Arcan.  a0 la mecánica (mech) · a1 tv.chargeDur (mech) · a2 tv.chargeCrit (mech) · a3 mod m_u_desgarro ·
//          a4 tv.chargeDmg (mech) · a5 a_rebote_cargado · a6 a_sello_cargado · a7 a_grieta (campo) ·
//          a8 a_rayo_doble | a_rayo_recargado · a9 a_orbe_cargado | a_orbe_atrae · a10 a_desgarro_fijo |
//          a_desgarro_voraz · a11 mod rayo crit · a12 a_inercia · a13 mod · a14 a_mana_inagotable ·
//          a15 a_desplazamiento | tv.drCharges (mech) · a16 a_resonance · a17 mod a_sello + a_sello_sigue ·
//          a18 a_carga_final · a19 a_satelite · a20 tv.aspdCharges (mech) · a21 a_doble_grieta ·
//          a22 a_desbordadas · a23 a_orbe_multiple · a24 a_fuente · finales a25 a_tormenta_cargas ·
//          a26 a_constelacion · a27 a_grieta_eterna · ápice a28 a_singularidad.
//  Los nodos clave de Crionte y Arcanista (i0, a0) son su mecánica: la llena, la gasta y la pierde
//  el indicador (js/mech-maga.js; funciona con cualquier árbol que declare la mecánica). Piromante s0
//  sí lleva poder: la quemadura y la Bola al 350 % no son del Calor.
//  Los «+X %» de rango 2–3 de los finales y las líneas de rango que solo suman un número van como
//  listas por rango en el `fx` del nodo (mod dmg, tv burnPct/freezeDur, stats critDmg).
//
// DESVIACIONES (el texto del nodo manda; lo que el motor no dice, se fija aquí):
//  · La Barrera de Maná se reconoce por la fuente de su escudo (m_barrera: el comportamiento del
//    catálogo). Cristal y Bastión distinguen la Barrera ROTA (absorbida hasta 0) de la que caduca;
//    con Bastión, la lanzada tampoco caduca (③ afterCast la alarga).
//  · c21 Escarcha Tenaz es un poder y no un mod: `slow` de mergeMods es un MÁXIMO (no suma 2 s).
//  · Torrente cuenta el coste de los lanzamientos (⑦ onCast), no el maná que pagas con Escudo de Maná.
//  · El Familiar, las Marcas, las runas, las esquirlas y los estallidos son daño de PODER
//    (dealProcDamage: no disparan onHit ni llenan el indicador, salvo Eco Elemental f9).
//  · Quemaduras (Piromante): una por enemigo; 3 con Brasa Profunda y 5 con Incendio Forestal (cada
//    una en su hueco; la nueva sustituye a la más débil). Llama Persistente, Brasero e Incendio
//    suben su daño AL PONERLA (un tic de DoT no pasa por el saco aditivo).
//  · «Pasar» una quemadura copia lo que le queda: la mitad del daño y del tiempo; con Brasa Errante,
//    entera (y a 1–2 enemigos más). Brasa Viva copia (no quita) cada segundo.
//  · «Estallar» las quemaduras (Corazón del Sol 1) hace el % de lo que les queda SIN gastarlas.
//  · «Explosiones» (Corazón del Sol 4): cada estallido de Bola o Meteoro que golpea (uno por instante),
//    el segundo del Cráter, cada meteorito de Estrellas Fugaces y cada estallido de Ignición Total.
//  · Pira (s7) usa su propio campo con el 40 % del arma por segundo (el `zone` genérico hace el 45 %
//    del golpe del Meteoro, que no es lo que dice el nodo).
//  · Congelar (Crionte): un enemigo que pasa a Congelado desde el último sondeo (10 Hz, todas las
//    fuentes). Los jefes no se congelan: llenar sus capas es «congelar a un jefe» (Aterido).
//  · «Hacer añicos» (Ruptura, Esquirlas, Cero Absoluto) = la Lanza de Hielo golpea a un Congelado
//    (no jefe) con Ruptura: le quita la congelación (Enemy.clearCC('freeze')) y deja 3 capas.
//  · Astillas (i12) es un poder y no tv.critFrostCdr: el nodo nombra solo la Lanza y la Prisión.
//    Igual Ritmo Arcano (c23, m_ritmo_arcano): solo Parpadeo y Barrera, no tv.basicCritCdr.
//  · Ignición (s0) quema también con los tics de tu suelo de Fuego (decisión pendiente de aprobar).
//  · Grieta Eterna (a27) gasta su 3 %/s también con Maná Inagotable (doc 2g §12; calibra B1).
//  · Prisión Profunda (i8B): la Prisión no atrapa en su área (prof.single, que lee prision_hielo);
//    atrapa 3 s al enemigo de la mira (o al más cercano a 8 m) con un golpe real de la Prisión al 180 %.
//  · Ventisca Viva y Remolino lanzan la Nova de Hielo real como repetición (g.castEcho, con su
//    propia serie: la de tu última Nova no se gasta ni se reinicia). La de Ventisca Viva sale del
//    centro de la Tormenta (origin); la de Remolino, de donde acaba el Paso de Escarcha.
//  · Doble Grieta (a21): el Rayo (principal instantánea) sale durante el canal del Desgarro (una
//    definitiva imparable) sin cortarlo (cola W2d); su ⑦ onCast abre la grieta. Con Haz Concentrado
//    (rayo_ii) el Rayo es otro canal y no sale (lo decide el motor). La grieta hace el 50 % del daño
//    por segundo de ESE canal (su golpe con rango entre su intervalo).
//  · Repeticiones (Archimaga, Imitación, Legión, Gran Grimorio, Meteoro Gemelo, Lluvia de Fuego, Rayo
//    Doble, Orbe Múltiple, Tormenta de Cargas): g.castEcho en la serie del original, apuntando a donde
//    apuntaba, esté o no en la barra. La copia de una CANALIZACIÓN (castEcho no las repite) es un haz
//    propio con los mismos tics que no ata a la heroína (echoChannel); la del Rayo, con sus Cargas.
//  · S-maga (auditoría de sensación): el Orbe Arcano (orbe_arcano), el Haz Concentrado (v_haz_concentrado)
//    y el Desgarro canalizado (desgarro_canal) son comportamientos de ESTE archivo. Inercia (a12) cuenta las
//    descargas que golpean (magaOrbs); Orbe Atrayente (a9B) atrae al detenerse; Satélite (a19) y
//    Constelación (a26) salen al VOLVER el Orbe (③ afterCast); Orbe Múltiple (a23), orbes pequeños.
//  · «Críticos de Hielo +X %» (Cero Absoluto) va al saco de crítico (stats.critDmg): el saco no
//    distingue elemento y la Crionte golpea casi todo con Hielo.
//
// REGLAS: sin `powers.has(` fuera de js/powers*.js (aquí: hasPower), sin setTimeout
// (g.timers.schedule), sin Math.random en la simulación (p.combatRng). Daño de un poder:
// dealProcDamage. Control: e.applyCC. Curas: p.sustain / g.shield; restauraciones p.setHp.
// Enfriamientos: solo g.reduceCooldown (Infinity = reinicio).
import * as THREE from 'three';
import { dealProcDamage, powerState, hasPower } from './powers.js';
import { rankBuff, rankCoef, channelRampPct } from './combat-math.js';
import { gainGauge, spendGauge, setGauge, gaugeValue, gaugeState, gaugeTuning } from './spec-mechanics.js';
import { drainResource, spendResource } from './resources.js';
import { magaStorm } from './skills-maga.js';

// ------------------------------------------------------------
// CONSTANTES (perezosas: nada se evalúa al cargar el módulo). Los números que enseña la barra
// de mecánica viven en js/mech-maga.js (gaugeTuning) y se leen de ahí: una sola fuente.
// ------------------------------------------------------------
// eslint-disable-next-line no-var
var TUNE;
export function magaTuning() {
  return TUNE || (TUNE = Object.freeze({
    rewindT: 5, rewindEvery: 0.25, rewindKeep: 40,       // Inversión del Tiempo
    // ---- árbol de CLASE 2g (§4) ----
    barrierPct: 60, barrierT: 8,                         // Barrera de Maná si el catálogo no trae sus números
    certeroEvery: 4,                                     // c5A Dardo Certero
    sifonMana: 6, sifonCdr: 1,                           // c5B Dardo Sifón
    fugazSpd: 30, fugazT: 3,                             // c7 Paso Fugaz
    novaFreezeT: 1, novaFreezeEvery: 8, cortanteSlow: 1, // c9 Nova Congelante / Cortante
    slowEvery: 8, slowPct: 50, slowT: 4,                 // c10A Ralentizar
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
    ritmoCdr: 0.5,                                       // c23 Ritmo Arcano (s por rango)
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
    // ---- PIROMANTE 2g (§5.0) ----
    burnFrac: 0.6, burnT: 4, bolaPiro: 3.5,              // s0 Ignición: 60 % del golpe en 4 s · Bola 100 → 350 %
    burnStacks: 3, incendioStacks: 5,                    // s8B Brasa Profunda · s25 Incendio Forestal
    volatilRadius: 2,                                    // s6 Combustible Volátil: la Bola explota en el doble (2 → 4 m)
    piraCoef: 0.4, piraBase: 1,                          // s7 Pira: 40 % por segundo durante 1 + rango s
    propagateN: 2, propagateR: 5, passKeep: 0.5,         // s8A Propagación · lo que conserva una quemadura que pasa
    vorazN: 3, vorazCdr: 4,                              // s9B Llamarada Voraz (el Calor por enemigo: mech)
    gemeloEvery: 3,                                      // s10A Meteoro Gemelo
    concPct: 50,                                         // s10B Meteoro Concentrado
    sismicoStagger: 20,                                  // s14 Impacto Sísmico (jefes)
    fenixCd: 120, fenixHp: 0.5, fenixInvuln: 1,          // s15A Fénix
    escudoLlamasDr: 10, escudoLlamasCoef: 1,             // s15B Escudo de Llamas (quemadura de un golpe del arma)
    braseroBurn: 15, braseroBurnRank: 10, braseroMeteo: 10, braseroMeteoRank: 5,   // s16 (el umbral: TG().calor.brasero)
    estrellasCoef: 0.4, estrellasT: 3, estrellasR: 1.5, estrellasArea: 8,   // s17 Estrellas Fugaces (1 + 2 × rango)
    vivaEvery: 1, vivaR: 2, vivaBase: 10, vivaRank: 10,  // s22 Brasa Viva
    craterT: 4, craterBase: 10, craterRank: 5,           // s24 Cráter
    incendioR: 4,                                        // s25 Incendio Forestal
    lluviaEcho: 0.6, lluviaHits: 3, lluviaGap: 0.35,     // s27 Lluvia de Fuego (cae 3 veces: 100/60/60 %)
    coreR: 8, corePct: 50, coreEvery: 20,                // s28 Corazón del Sol (rangos 1 y 4)
    // ---- CRIONTE 2g (§5.2) ----
    filoCrit: 5, pielDr: 15,                             // i2 Filo Helado (por rango) · i15A Piel de Invierno
    quebradizoPct: 20,                                   // i5 Hielo Quebradizo
    creceStep: 10,                                       // i7 Tormenta Creciente: +10 % de radio por segundo
    profundaFreeze: 3, profundaPct: 80, profundaR: 8,    // i8B Prisión Profunda
    lanzaInvierno: 4,                                    // i9B Lanza del Invierno: ×4 a Congelados y Ateridos
    ventiscaEvery: 2,                                    // i10A Ventisca Viva
    frioSostenido: 60,                                   // i10B Frío Sostenido
    astillasCdr: 0.5,                                    // i12 Astillas (s por rango)
    sueloT: 4, sueloSlowPct: 40,                         // i14 Suelo Helado (1 capa por segundo)
    cristalShieldPct: 5, cristalShieldCd: 3, cristalShieldR: 4, cristalShieldT: 6,   // i15B Cristal Protector
    inviernoPct: 5, inviernoR: 10, inviernoMax: 5,       // i16 Invierno Profundo (por rango y Congelado)
    remolinoPct: 50,                                     // i17 Remolino (por rango)
    cadenaR: 4,                                          // i18 Congelación en Cadena (1 por rango)
    rupturaPct: 25, rupturaLayers: 3,                    // i19 Ruptura
    ojoCoef: 2, ojoLayers: 3,                            // i21 Ojo Frío
    glaciarR: 3,                                         // i22 Glaciar (capas = rango)
    esquirlasN: 4, esquirlasBase: 20, esquirlasRank: 10, esquirlasR: 4,   // i23 Esquirlas
    perpetuaStep: 0.5, perpetuaMax: 6,                   // i24 Tormenta Perpetua (s por rango, tope)
    eraR: 5, eraCd: 6,                                   // i25 Era Glacial
    ceroCoef: 3,                                         // i26 Cero Absoluto: 300 % del arma extra
    eternoMax: 20,                                       // i27 Invierno Eterno
    corazonStagger: 20, corazonMana: 10, corazonEvery: 15,   // i28 Corazón del Invierno
    // ---- ARCANISTA 2g (§5.3) ----
    grietaCoef: 0.4, grietaBase: 1, grietaRad: 1.6,      // a7 Grieta Abierta (1 + rango s)
    dobleNeed: 4, dobleCopy: 0.5,                        // a8A Rayo Doble
    recargadoMax: 2,                                     // a8B Rayo Recargado
    orbeCargadoPct: 20,                                  // a9A Orbe Cargado (por Carga)
    atraeR: 4, atraeKeep: 1,                             // a9B Orbe Atrayente: vórtice a 4 m al detenerse (los deja a 1 m)
    fijoPct: 8, fijoMax: 6,                              // a10A Desgarro Fijo (+8 % por medio segundo, hasta +48 %)
    vorazMana: 1.5, vorazMaxN: 3, vorazEvery: 1,         // a10B Desgarro Voraz (maná por enemigo y golpe, hasta 3)
    inerciaCdr: 0.1, inerciaMax: 1,                      // a12 Inercia (s por descarga y tope por orbe, × rango)
    selloCargadoIcd: 0.5,                                // a6 Sello Cargado: 1 Carga cada 0,5 s como mucho
    // ---- Orbe Arcano (S-maga, M-01…M-04: el comportamiento orbe_arcano de este archivo) ----
    orbCatch: 0.8, orbPulse: 0.5, orbTrailEvery: 0.05, orbHumEvery: 0.4,   // recogida, anillo quieto, estela, zumbido
    orbSmallR: 2.5, orbSmallScale: 0.6,                  // a23: los orbes pequeños descargan a 2,5 m
    // ---- Haz Concentrado (M-07/M-08) y Desgarro canalizado (M-12) ----
    hazWidthPer: 0.2, hazGlowPer: 0.075, hazGlowMax: 1.3, hazShake: 0.05,   // el haz crece por Carga gastada (brillo con tope: en
                                                         // aditivo, más satura a blanco); micro-sacudida con 4
    riftShake: 0.06, riftScarR: 1.4, riftGlowTop: 0.15,  // sacudida leve por golpe; grieta en el haz donde apuntas; brillo al tope
                                                         // (poco: con el núcleo ×2 en aditivo ya satura a blanco)
    riftScarLen: 3.2, riftScarWid: 1.1, riftScarKeep: 2, riftScarMin: 1.5,   // la grieta: largo y ancho (m), dura 2 golpes (cada
                                                         // golpe la renueva) y no más cerca de 1,5 m
    inagotablePct: 2,                                    // a14 Maná Inagotable (% del maná por segundo)
    desplazaPct: 20, desplazaDist: 5, desplazaCd: 30,    // a15A Desplazamiento
    cargaFinalNeed: 4,                                   // a18 Carga Final
    sateliteEvery: 3, sateliteT: 8, satelitePct: 20, sateliteR: 0.9, sateliteOrbit: 1.8, sateliteHitCd: 0.5,   // a19
    multipleEvery: 3, multipleCopy: 0.4, multipleSpread: 0.35,   // a23 Orbe Múltiple
    fuenteEvery: 1, fuentePct: 5, fuenteMax: 3,          // a24 Fuente de Maná
    tormentaNeed: 4, tormentaCopy: 0.5, tormentaGap: 0.75,   // a25 Tormenta de Cargas (3 veces en 1,5 s)
    constelT: 8, constelMax: 3, constelEvery: 1, constelCoef: 0.4, constelOrbit: 2.2, constelRange: 10,   // a26
    eternaDrain: 3,                                      // a27 Grieta Eterna (% del maná por segundo)
    singGrietaT: 3, singGrietaCoef: 0.5, singElite: 4, singEvery: 20, singT: 2, singTicks: 8,   // a28 (8 golpes del haz en 2 s)
  }));
}
// números de la barra de mecánica (js/mech-maga.js): una sola fuente para el juego y la UI
function TG() { return gaugeTuning(); }

// ------------------------------------------------------------
// helpers (todas `function`: se elevan, seguras con el ciclo de módulos)
// ------------------------------------------------------------
function isBoss(e) { return !!(e?.def?.boss || e?.def?.uber || e?.def?.worldBoss); }
function isElite(e) { return !!(e?.def?.rank || isBoss(e)); }
function now(p) { return p?.simT || 0; }
function rng(p) { return typeof p?.combatRng === 'function' ? p.combatRng() : 0.5; }
function dist2(a, b) { const dx = a.x - b.x, dz = a.z - b.z; return dx * dx + dz * dz; }
function alivesNear(g, pos, r, not = null) {
  return (g?.enemies || []).filter(o => o.alive && o !== not && dist2(o.pos, pos) <= r * r);
}
// vector de THREE a partir de uno existente (las posiciones de los campos son objetos planos)
function at(ref, x, z, y = 0) { const v = ref.clone ? ref.clone() : new THREE.Vector3(); v.x = x; v.y = y; v.z = z; return v; }
function fx(g, preset, pos, y = 1.0) { if (preset && pos) { try { g.emitFx?.(preset, at(pos, pos.x, pos.z, y)); } catch { /* headless */ } } }
function ring(g, pos, r, color) { try { g.spawnRing?.(at(pos, pos.x, pos.z, 0), r, color); } catch { /* headless */ } }
function beam(g, a, b, color, t = 0.2) { try { g.spawnBeam?.(at(a, a.x, a.z, 1), at(b, b.x, b.z, 1), color, t); } catch { /* headless */ } }
function text(g, e, s, cls = 'txt-crit') { try { g.ui?.spawnText?.(at(e.pos, e.pos.x, e.pos.z, (e.def?.scale || 1) + 0.7), s, cls); } catch { /* */ } }
function invalidate(p, id = null) { if (!p) return; if (id) { if (p.resolved) delete p.resolved[id]; } else p.resolved = {}; }

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
// lanza una habilidad «sola y gratis» como REPETICIÓN del motor (g.castEcho, cola W2d): × mult de
// su potencia, sin coste, enfriamiento, GCD, preparación ni carga, esté o no en la barra. Va en su
// PROPIA serie de repeticiones: la de tu último lanzamiento queda como estaba (ni se gasta ni se
// reinicia). aim = {x, z}: la mira; origin = {x, z}: de dónde sale (una habilidad at 'self', como la
// Nova, se centra ahí). Una canalización no se repite (castEcho → null) y una movilidad movería a
// la heroína: ninguna de las de aquí lo es. → el CastInfo o null
function autoCast(g, p, skillId, { aim = null, origin = null, mult = 1 } = {}) {
  if (!g?.castEcho) return null;
  const xz = v => (v ? { x: v.x, z: v.z } : null);
  try { return g.castEcho(p, skillId, { mult, at: xz(aim), origin: xz(origin) }); }
  catch (err) { try { console.warn(`[maga] autoCast ${skillId}`, err); } catch { /* */ } return null; }
}
// la definitiva o habilidad que se lanza «sola» un instante después, sobre el grupo más numeroso
function scheduleAutoCast(g, p, skillId, fallbackPos, label) {
  g?.timers?.schedule?.(0.05, () => {
    if (!p.alive || g.player !== p) return;
    const e = densest(g) || null;
    const pos = e ? e.pos : fallbackPos;
    if (pos && autoCast(g, p, skillId, { aim: pos }) && label) text(g, e || p, label);
  });
}
// serie de repeticiones del lanzamiento ORIGINAL `cast`: todas sus copias (Archimaga, Legión,
// Meteoro Gemelo, Lluvia de Fuego, Orbe Múltiple…) comparten el tope echoCap del motor
function seriesOf(cast) { return cast._mgEcho || (cast._mgEcho = { seq: -1, n: 0 }); }
// repite el lanzamiento `cast` tras `delay` s como REPETICIÓN del motor (g.castEcho): × mult de su
// potencia, sin coste ni recarga, esté o no aún en la barra, en la serie del original y apuntando a
// `pos` (por defecto, a donde apuntaba el original). n: las Cargas del original (el Rayo: su golpe
// lee echoN del indicador mientras dura la llamada). Una CANALIZACIÓN no la repite castEcho: su
// copia es un haz propio que no ata a la heroína (echoChannel)
// then(castInfo): lo que hace el poder con la copia ya lanzada (Orbe Múltiple: orbes pequeños)
function echoCast(g, p, cast, mult, delay, { pos = null, n = null, then = null } = {}) {
  const id = cast?.sk?.id;
  if (!id || !(mult > 0) || !g?.timers) return;
  if (cast.sk.type === 'channel') { echoChannel(g, p, cast, mult, delay, n); return; }
  const aim = pos || cast.target;
  const at0 = aim ? { x: aim.x, z: aim.z } : null;
  const series = seriesOf(cast);
  g.timers.schedule(delay, () => {
    if (!p.alive || g.player !== p) return;
    const st = n != null ? gaugeState(p, 'cargas') : null;
    if (st) st.echoN = n;
    let c = null;
    try { c = g.castEcho?.(p, id, { mult, at: at0, series }) || null; }
    finally { if (st) st.echoN = null; }
    if (c && then) then(c);
  });
}
// copia de una CANALIZACIÓN (el Rayo con Haz Concentrado, el Desgarro): el canal es de la heroína
// (su ranura mantenida, castLock y freno), así que la copia es un haz propio que NO la ata: los tics
// del original (su intervalo y su perfil: coef con rango × mult, saco aditivo y crítico) a un
// objetivo pegajoso a su alcance, el más cercano a donde apuntaba. Golpes reales de la habilidad
// marcados como repetición (echo); n: las Cargas del original (el Rayo), en cada tic
function echoChannel(g, p, cast, mult, delay, n = null) {
  const pr = cast.prof, def = cast.sk;
  if (!pr) return;
  const dur = def.channelT || pr.dur || 2;
  const ticks0 = Math.max(1, Math.round(def.ticks || dur / 0.33));
  const speed = Math.max(0.1, pr.skillSpeed || 1);
  const gap = dur / ticks0 / speed;
  const ticks = speed === 1 ? ticks0 : Math.max(1, Math.round(dur / gap));
  const range = Math.max(2, pr.range || 8);
  const aim = cast.target?.clone?.() || null;
  const info = { skill: def.id, tags: pr.tags, elem: pr.elem };
  let tgt = null, live = null;
  for (let i = 1; i <= ticks; i++) {
    g.timers.schedule(delay + gap * i, () => {
      if (!p.alive || g.player !== p) return;
      if (!tgt?.alive || !insideR(tgt.pos, p.pos, range + 1)) tgt = (aim && g.nearestEnemy?.(range, aim)) || g.nearestEnemy?.(range) || null;
      if (!tgt) return;
      const st = n != null ? gaugeState(p, 'cargas') : null;
      if (st) st.echoN = n;
      let roll;
      try { roll = p.rollDamage(pr.coef * mult, pr.critBonus || 0, pr.addPct || 0, tgt, info); }
      finally { if (st) st.echoN = null; }
      tgt.takeDamage(roll.dmg, roll.crit, { ...info, color: def.color, echo: true });
      p.onDealHit?.();
      // la copia también es un haz vivo (más fino), de tu mano al objetivo, mientras dura
      const e = tgt;
      if (!live?.alive) live = liveBeam(g, () => handAt(p), () => ({ x: e.pos.x, y: 1.0, z: e.pos.z }), { color: def.color || 0xc8a0ff, width: 0.22, core: 0.07, dur: gap * (ticks - i + 1) });
      else live.update({ to: () => ({ x: e.pos.x, y: 1.0, z: e.pos.z }) });
      if (live) live.pulse?.(1); else beam(g, p.pos, tgt.pos, def.color || 0xc8a0ff, gap);
    });
  }
}

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

// ============================================================
// Paso 2g · helpers de las ESPECIALIZACIONES
// ============================================================
// ---- Piromante: quemaduras (DoT del planificador, fuentes `p_ignicion[#n]:burn`; API del núcleo) ----
// huecos de quemadura por enemigo: 1; 3 con Brasa Profunda (s8B); 5 con Incendio Forestal (s25)
function burnKeys(p) {
  const T = magaTuning();
  const n = hasPower(p, 'p_incendio') ? T.incendioStacks : hasPower(p, 'p_acumular') ? T.burnStacks : 1;
  const out = [];
  for (let i = 1; i <= n; i++) out.push(i === 1 ? 'p_ignicion:burn' : `p_ignicion#${i}:burn`);
  return out;
}
// +% de una quemadura AL PONERLA: Llama Persistente e Incendio (tv.burnPct, también dotPct) y
// Brasero (s16: con más de 50 de Calor)
function burnBonus(p) {
  const T = magaTuning(), tv = p?.tv || {};
  let add = (tv.burnPct || 0) + (tv.dotPct || 0);
  if (hasPower(p, 'p_brasero') && gaugeValue(p, 'calor') > TG().calor.brasero) add += T.braseroBurn + T.braseroBurnRank * rankOf(p, 'p_brasero');
  return add;
}
// Ignición (s0): 60 % del golpe en 4 s (+burnDur/dotDur s), con su bono
function burnProfile(p, base) {
  const T = magaTuning(), tv = p?.tv || {};
  const ticks = T.burnT + Math.max(0, Math.round((tv.burnDur || 0) + (tv.dotDur || 0)));
  const per = base * T.burnFrac / T.burnT * Math.max(0, 1 + burnBonus(p) / 100);
  return { ticks, total: per * ticks };
}
// pone `total` en `ticks` s en el hueco libre o en el de la más débil, que se pierde; si todas
// son más fuertes que la nueva, no cambia nada (un golpe flojo no apaga una quemadura grande)
function putBurn(g, p, e, total, ticks) {
  if (!e?.alive || !(total > 0) || !g?.replaceDoT) return 0;
  let best = null, bv = Infinity;
  for (const k of burnKeys(p)) {
    const v = g.dotRemaining?.(e, k) || 0;
    if (v < bv) { bv = v; best = k; }
    if (!(v > 0)) break;
  }
  if (bv > 0 && total <= bv) return 0;
  g.replaceDoT(e, Math.max(1, total), Math.max(1, Math.round(ticks)), 1, best);
  return total;
}
function ignite(g, p, e, base) {
  if (!e?.alive || !(base > 0)) return 0;
  const { ticks, total } = burnProfile(p, base);
  return putBurn(g, p, e, total, ticks);
}
// pasa las quemaduras de `from` a `to` (Propagación, Incendio Forestal): copia `frac` de lo que le
// queda a cada una; sin Brasa Errante (s18) pierden la mitad del daño y del tiempo. `whole`: copia
// sin esa pérdida (Brasa Viva ya dice cuánto pasa)
function passBurns(g, p, from, to, frac = 1, whole = false) {
  if (!to?.alive || to === from) return 0;
  const keep = whole || hasPower(p, 'p_brasa_errante') ? 1 : magaTuning().passKeep;
  let n = 0;
  for (const d of g?.dotsOf?.(from, 'burn') || []) {
    const total = d.remaining * frac * keep;
    if (!(total >= 1)) continue;
    putBurn(g, p, to, total, Math.max(1, Math.round(d.left * keep)));
    n++;
  }
  if (n) beam(g, from.pos, to.pos, 0xff7722, 0.2);
  return n;
}
// cuántos enemigos más reciben una quemadura que pasa (Brasa Errante: 1 por rango)
function passExtra(p) { return hasPower(p, 'p_brasa_errante') ? rankOf(p, 'p_brasa_errante') : 0; }
function combustionBuff(p) { return (p?.buffs || []).find(b => b.id === 'p_combustion' && b.t > 0) || null; }
// cuenta una explosión (Corazón del Sol, rango 4): cada 20, Supernova sola y gratis
function countExplosion(g, p, pos) {
  if (!hasPower(p, 'p_corazon_sol') || rankOf(p, 'p_corazon_sol') < 4) return;
  const st = powerState(p, 'p_corazon_sol');
  st.boom = (st.boom || 0) + 1;
  if (st.boom >= magaTuning().coreEvery) { st.boom = 0; scheduleAutoCast(g, p, 'm_u_supernova', pos, '¡Supernova!'); }
}
// ¿dentro de un Cráter tuyo? (s24)
function inCrater(g, p, pos) { return (g?.fieldsOf?.(p, { kind: 'p_crater' }) || []).some(f => f.t > 0 && insideR(pos, f.pos, f.radius)); }

// ---- Crionte: congelaciones y Tormenta Glacial ----
// enemigos que pasaron a Congelados desde el último sondeo (10 Hz, todas las fuentes). Un solo barrido
// por instante y héroe: los poderes que reaccionan «al congelar» lo comparten
function freezesNow(g, p) {
  const F = p._mgFrz || (p._mgFrz = { t: -1, list: [], on: new WeakSet() });
  if (F.t === now(p)) return F.list;
  F.t = now(p);
  F.list = [];
  for (const e of g?.enemies || []) {
    if (!e.alive) { F.on.delete(e); continue; }
    if ((e.frozenT || 0) > 0) { if (!F.on.has(e)) { F.on.add(e); F.list.push(e); } }
    else F.on.delete(e);
  }
  return F.list;
}
function layersOf(p, e) { return e?.alive ? gaugeValue(p, 'escarcha', e) : 0; }
function frozen(e) { return !!e?.alive && (e.frozenT || 0) > 0; }
function freezeBase() { return TG().escarcha.freezeT; }
// quita la congelación (Ruptura): solo el hielo (Enemy.clearCC, cola W2d). Si otra fuente dejó un
// aturdimiento más largo que el hielo, se queda entero; si mandaba el hielo, se acaba
function thaw(e) { e?.clearCC?.('freeze'); }
// Corazón del Invierno (rango 4): cada 15 congelaciones, la Tormenta Glacial sola y gratis
function countFreezes(g, p, k) {
  if (!(k > 0) || rankOf(p, 'k_corazon_invierno') < 4) return;
  const st = powerState(p, 'k_corazon_invierno');
  st.n = (st.n || 0) + k;
  if (st.n < magaTuning().corazonEvery) return;
  st.n -= magaTuning().corazonEvery;
  scheduleAutoCast(g, p, 'm_u_tormenta', p.pos, '¡Tormenta!');
}
// la Tormenta Glacial activa (comportamiento del catálogo) y su seguimiento por poder
function stormOf(p) { return magaStorm(p); }
function stormTrack(p, id) {
  const st = powerState(p, id);
  const s = stormOf(p);
  if (s && st.inst !== s) { st.inst = s; st.t0 = now(p); st.base = s.radius; st.ext = 0; st.acc = 0; }
  return s;
}

// ---- Arcanista: Cargas, Sello, canal ----
function charges(p) { return Math.floor(gaugeValue(p, 'cargas')); }
// ¿dentro de tu Sello del Archimago? (aura genérica del catálogo: buffId = id de la habilidad)
function sealOf(g, p) { return (g?.fieldsOf?.(p, { kind: 'aura' }) || []).filter(f => f.data?.buffId === 'a_sello' && f.t > 0); }
function inOwnSeal(g, p) { return sealOf(g, p).some(f => insideR(p.pos, f.pos, f.radius)); }
// canalización en curso del héroe, de la habilidad `id` si se da (g.channelInfo, cola W2d:
// { id, t, dur, left (s que le quedan), interval, ticks… })
function channelOf(g, p, id = null) {
  const c = g?.channelInfo?.();
  if (!c || c.p !== p) return null;
  return !id || c.id === id ? c : null;
}
// perfil del Desgarro Arcano (grietas y Singularidad): el primero de `cands` que haya (el de su
// lanzamiento, ⑦ onCast, que es el que pegan los tics de ese canal; el de la caché de resolveSkill)
// o, sin ninguno (recompute la vacía y aún no lo lanzaste), el del catálogo forjado con el rango del
// héroe y el +% de sus mods de talento
function desgarroProf(p, ...cands) {
  const pr = cands.find(Boolean);
  if (pr) return pr;
  const def = forgedOf(p, 'm_u_desgarro');
  return { def, type: def?.type, coef: (def?.coef || 0) * rankCoef(p?.skills?.m_u_desgarro || 1),
    addPct: p?.talentAgg?.mods?.m_u_desgarro?.dmg || 0, range: def?.range || 10 };
}
// grieta arcana en el suelo (Grieta Abierta, Doble Grieta, Singularidad): `coef` del arma por
// segundo con el saco aditivo del Desgarro (`pr`: su perfil)
function openRift(g, p, pos, dur, coef, pr = desgarroProf(p, p.resolved?.m_u_desgarro)) {
  if (!pos || !(dur > 0)) return null;
  return g.spawnField?.('a_grieta', { pos, radius: magaTuning().grietaRad, dur, owner: p,
    data: { dps: p.avgHit(coef, pr.addPct || 0), skill: 'm_u_desgarro' } }) || null;
}
// Cargas que gastó el último Rayo (las anota el indicador, js/mech-maga.js, en su ③ afterCast: los
// poderes que leen esto van con prioridad −1, después de él)
function spentCharges(p) { return gaugeState(p, 'cargas')?.spent || 0; }
// Singularidad (rango 4): un Desgarro propio de 2 s: 8 golpes (cada 0,25 s) del haz ancho hacia el
// enemigo más cercano, a todos los que atraviesa, con la rampa del canal (+10 % por golpe). Cada golpe,
// el del canal con su rango: el del perfil si el Desgarro se canaliza; con Brecha o Quiebre, que no
// canalizan, el del catálogo (0,6 × rango), con el saco aditivo del perfil. No te ata (no es tu canal)
function singularBeam(g, p) {
  const T = magaTuning();
  const pr = desgarroProf(p, p.resolved?.m_u_desgarro, powerState(p, 'a_singularidad').prof);
  const base = skillOf(p, 'm_u_desgarro');
  const coef = pr.type === 'channel' ? pr.coef : (base?.coef || 0.6) * rankCoef(p?.skills?.m_u_desgarro || 1);
  const range = pr.range || base?.range || 10, width = base?.width || 2.5, gap = T.singT / T.singTicks, color = pr.def?.color || 0xd28cff;
  const ramp = { per: base?.rampPerTic || 0, max: base?.rampMax || 0 };
  let tgt = null, live = null;
  for (let i = 1; i <= T.singTicks; i++) {
    g.timers.schedule(gap * i, () => {
      if (!p.alive || g.player !== p) return;
      if (!tgt?.alive || !insideR(tgt.pos, p.pos, range + 1)) tgt = alivesNear(g, p.pos, range).sort(byDist(p.pos))[0] || null;
      if (!tgt) return;
      const mul = 1 + channelRampPct(i, ramp.per, ramp.max) / 100;
      const { end } = riftLine(g, p, tgt.pos, range);
      for (const e of riftTargets(g, p, end, width)) strikeAs(p, e, 'm_u_desgarro', coef * mul, pr.addPct || 0);
      if (!live?.alive) live = liveBeam(g, () => handAt(p), () => ({ x: end.x, y: 1.0, z: end.z }), { color, width: 0.9, core: 0.3, dur: T.singT - gap * (i - 1) });
      live?.update?.({ to: { x: end.x, y: 1.0, z: end.z } });
      live?.pulse?.(1);
    });
  }
  text(g, p, '¡Singularidad!');
}
// mano de la heroína a 1,2 m (de donde salen los haces), sin importar game-skills (ciclo de módulos)
function handAt(p) {
  const r = p?.group?.rotation?.y || 0;
  return { x: p.pos.x + Math.sin(r) * 0.4, y: 1.2, z: p.pos.z + Math.cos(r) * 0.4 };
}
// haz vivo del motor (g.spawnLiveBeam; sin él, nada: pruebas sin motor)
function liveBeam(g, from, to, { color = 0xc8a0ff, width = 0.3, core = 0.09, intensity = 1, dur = 0, sparkEvery = 0.1 } = {}) {
  try { return g?.spawnLiveBeam?.({ from, to, color, coreColor: 0xffffff, width, core, intensity, dur, sparkEvery }) || null; } catch { return null; }
}

// ---- Desgarro Arcano canalizado (S-maga, M-12): haz ANCHO hacia la mira que atraviesa a todos ----
// recta del haz desde la heroína hacia `aim`, recortada por la pared (como el haz vivo del motor)
function riftLine(g, p, aim, range) {
  let dx = (aim?.x ?? p.pos.x) - p.pos.x, dz = (aim?.z ?? p.pos.z) - p.pos.z;
  let l = Math.hypot(dx, dz);
  if (l < 1e-3) { const r = p.group?.rotation?.y || 0; dx = Math.sin(r); dz = Math.cos(r); l = 1; }
  dx /= l; dz /= l;
  const o = at(p.pos, p.pos.x, p.pos.z);
  const far = at(p.pos, p.pos.x + dx * range, p.pos.z + dz * range);
  const end = g.clampWalkable ? g.clampWalkable(o, far, range) : far;
  return { dir: { x: dx, z: dz }, end, len: Math.hypot(end.x - p.pos.x, end.z - p.pos.z) };
}
// enemigos que atraviesa el haz (ancho `width`) de la heroína a `end`
function riftTargets(g, p, end, width) {
  const len = Math.hypot(end.x - p.pos.x, end.z - p.pos.z);
  if (!(len > 0.05)) return [];
  const dir = { x: (end.x - p.pos.x) / len, z: (end.z - p.pos.z) / len };
  return g.enemiesInLine ? g.enemiesInLine(p.pos, dir, len, width) : [];
}

// ============================================================
// ORBE ARCANO (S-maga, auditoría M-01…M-04)
// ============================================================
// El orbe NO choca con nadie (Ball Lightning de PoE2: el proyectil no golpea, descarga a los cercanos;
// Frozen Orb de D2: dispara a su alrededor mientras viaja). Cada lanzamiento son 1 + proj UNIDADES
// (Multiproyectil: en abanico); cada unidad, uno o dos cuerpos (Orbe Gemelo: giran uno alrededor del
// otro). Fases:
//   'ida'    hacia la mira, de minRange a range m; se para en el último punto transitable (pared)
//   'quieto' park s girando, con un anillo del radio de descarga cada 0,5 s (Orbe Veloz no se detiene)
//   'vuelta' hacia donde estás AHORA (back.speed; atraviesa paredes): golpea UNA vez a cada enemigo que
//            cruza (back.coef). A 0,8 m de ti se recoge (1 Carga Arcana; no en las repeticiones); si a
//            los back.max s no te alcanza, se apaga
// En la ida y quieto (y también de vuelta con back.zap) DESCARGA cada zap.every s un rayo a los zap.n
// enemigos más cercanos a zap.radius m: golpe REAL de la habilidad (crítico, ⑤, talentos). Con dos
// cuerpos, cada uno a enemigos distintos. Se mueve cada fotograma en g.projectiles (update(dt) → true al
// acabar, como un Projectile: el bucle de main.js quita su malla). Los poderes lo leen con magaOrbs(p):
// stopAt (Orbe Atrayente), zapHits (Inercia); cast.orbs = sus unidades (Orbe Múltiple: setSmall).
// Satélite (a19) y Constelación (a26) marcan el lanzamiento (cast.orbit): al volver, ese orbe no se
// absorbe (ni Carga ni destello) y se queda en órbita (los dos poderes, en su ③ afterCast)
// eslint-disable-next-line no-var
var ORBS;   // héroe → Set de orbes vivos (perezoso: nada de `const` de módulo, ver la cabecera)
function orbsOf(p) {
  if (!ORBS) ORBS = new WeakMap();
  let s = ORBS.get(p);
  if (!s) ORBS.set(p, (s = new Set()));
  return s;
}
// cambio de zona: loadWorld vacía g.projectiles sin avisar y el orbe ya no se mueve. Los que no están
// en la lista de su juego se apagan (sin Carga) para que su lanzamiento termine y no se acumulen. Lo
// miran el siguiente Orbe (launchOrb) y los poderes que leen magaOrbs (10 Hz)
function sweepOrbs(p) {
  const s = p && ORBS ? ORBS.get(p) : null;
  if (!s) return;
  for (const o of [...s]) if (o.alive && !(o.g?.projectiles || []).includes(o)) orbEnd(o.g, o, false);
}
export function magaOrbs(p) {
  sweepOrbs(p);
  const s = p && ORBS ? ORBS.get(p) : null;
  return s ? [...s].filter(o => o.alive) : [];
}
// parámetros de una unidad: los de la definición FORJADA (Orbe Grande, Veloz, Gemelo) y del perfil
function orbParams(sk, prof) {
  const z = sk.zap || {}, b = sk.back || {};
  const range = Math.max(1, prof.range || sk.range || 12);
  return {
    speed: Math.max(1, prof.speed || sk.speed || 6), range, minRange: Math.min(range, sk.minRange ?? 5),
    every: Math.max(0.05, z.every || 0.25), n: Math.max(1, Math.floor(z.n || 2)), radius: (z.radius || 3.5) * (prof.radiusMul || 1),
    park: Math.max(0, sk.park ?? 2), backSpeed: Math.max(1, b.speed || 10), backR: b.radius || 0.9, backMax: b.max || 3, backZap: !!b.zap,
    backMul: (b.coef ?? 0.8) / Math.max(1e-6, sk.coef || 0.45), twin: Math.max(0, sk.twin || 0),
  };
}
// posiciones de los cuerpos (Gemelo: a ±twin/2 del centro, girando: como rotation.y de la malla)
function orbBodies(o) {
  if (!o.P.twin) return [o.c];
  const s = o.P.twin / 2, cx = Math.cos(o.spin) * s, cz = -Math.sin(o.spin) * s;
  return [{ x: o.c.x + cx, z: o.c.z + cz }, { x: o.c.x - cx, z: o.c.z - cz }];
}
// malla vacía: el bucle de main.js quita y libera pr.mesh al acabar (en las pruebas no se dibuja)
function stubMesh() { return { geometry: { dispose() {} }, material: { dispose() {} } }; }
// malla (M-04): núcleo blanco, interior y halo aditivos de su color (≈ 1,2 m) y dos anillos de runas
// (hexágonos) que giran. La raíz es invisible: los cuerpos cuelgan de ella y, con dos, giran a su alrededor
function orbMesh(g, color, bodies, sep, scale) {
  if (!g?.fxGroup) return null;
  try {
    const add = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const root = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ visible: false }));
    root.frustumCulled = false;
    root.userData.parts = [];
    for (let i = 0; i < bodies; i++) {
      const b = new THREE.Group();
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12), add(color, 0.5));
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.6, 16, 12), add(color, 0.18));
      const r1 = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.7, 6, 1), add(color, 0.75));
      const r2 = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.54, 6, 1), add(0xffffff, 0.45));
      r1.rotation.x = -Math.PI / 2; r2.rotation.x = -Math.PI / 2 + 0.7;
      b.add(core, inner, halo, r1, r2);
      b.position.x = bodies > 1 ? (i ? -1 : 1) * sep / 2 : 0;
      b.scale.setScalar(scale);
      b.userData = { halo, r1, r2 };
      root.add(b);
      root.userData.parts.push(b);
    }
    g.fxGroup.add(root);
    return root;
  } catch { return null; }
}
// libera los cuerpos (la raíz, el bucle de main.js)
function freeOrbMesh(m) {
  if (!m?.isObject3D) return;
  m.traverse(x => { if (x !== m) { x.geometry?.dispose?.(); x.material?.dispose?.(); } });
  m.clear();
}
// golpe REAL del Orbe (descarga o vuelta): crítico, ⑤ onHit y los efectos del perfil
function orbStrike(p, ctx, e, coef) {
  const pr = ctx.prof;
  const { dmg, crit } = p.rollDamage(coef, pr.critBonus || 0, pr.addPct || 0, e, ctx.hitInfo);
  const dealt = e.takeDamage(dmg, crit, ctx.dmgOpts) || 0;
  ctx.hit(e, dealt);
  return dealt;
}
// una descarga: cada cuerpo, a zap.n enemigos a su alcance que no haya tomado el otro cuerpo; primero
// los que este orbe ha alcanzado MENOS veces y, entre ellos, los más cercanos: dispara a su alrededor y
// todos los que están a su alcance reciben (con uno solo, todas van a él)
function orbZap(g, o) {
  const { p, ctx, P } = o;
  const taken = new Set();
  let any = false;
  orbBodies(o).forEach((b, k) => {
    const d2 = e => dist2(e.pos, b);
    const list = (g.enemies || []).filter(e => e.alive && !taken.has(e) && insideR(e.pos, b, P.radius + 0.5 * (e.def?.scale || 1)))
      .sort((x, y) => (o.zapped.get(x) || 0) - (o.zapped.get(y) || 0) || d2(x) - d2(y)).slice(0, P.n);
    for (const e of list) {
      taken.add(e);
      o.zapped.set(e, (o.zapped.get(e) || 0) + 1);
      orbStrike(p, ctx, e, ctx.coef);
      any = true;
      // haz violeta de 0,12 s del cuerpo al enemigo (los dos extremos se mueven) y su chispa
      const h = liveBeam(g, () => { const q = orbBodies(o)[k] || o.c; return { x: q.x, y: 1.0, z: q.z }; },
        () => ({ x: e.pos.x, y: 1.0, z: e.pos.z }), { color: o.color, width: 0.24 * o.scale, core: 0.07, intensity: 1.3, dur: 0.12, sparkEvery: 1 });
      h?.pulse?.(1);
      fx(g, ctx.fx?.impact, e.pos, 1.0);
    }
  });
  if (!any) return;
  o.zapHits++;
  p.onDealHit?.();
  if (ctx.fx?.zapSfx) g.sfx?.(ctx.fx.zapSfx);
}
// de vuelta: golpea una vez a cada enemigo que cruza
function orbContact(g, o) {
  const { p, ctx, P } = o;
  let any = false;
  for (const b of orbBodies(o)) {
    for (const e of g.enemies || []) {
      if (!e.alive || o.backHit.has(e) || !insideR(e.pos, b, P.backR + 0.5 * (e.def?.scale || 1))) continue;
      o.backHit.add(e);
      orbStrike(p, ctx, e, ctx.coef * P.backMul);
      fx(g, ctx.fx?.impact, e.pos, 1.0);
      any = true;
    }
  }
  if (any) p.onDealHit?.();
}
// llega al final de su camino (o choca con la pared): se detiene o, sin park, vuelve ya
function orbStop(g, o) {
  o.stopAt = now(o.p);
  o.stopPos = { x: o.c.x, z: o.c.z };
  if (o.P.park > 0) {
    o.state = 'quieto'; o.parkLeft = o.P.park; o.pulseAcc = 0;
    ring(g, o.c, o.P.radius, o.color);
  } else o.state = 'vuelta';
}
// fin: recogido (Carga y destello en tu mano), en órbita (Satélite / Constelación: ni Carga ni
// destello, un anillo a tu alrededor) o apagado
function orbEnd(g, o, caught) {
  if (!o.alive) return;
  o.alive = false;
  o.state = 'fin';
  o.caught = !!caught;
  orbsOf(o.p).delete(o);
  const p = o.p;
  if (caught && p.alive && !o.echo && o.ctx.cast?.orbit) {
    o.orbited = true;
    ring(g, p.pos, magaTuning().sateliteOrbit, o.color);
  } else if (caught && p.alive) {
    if (!o.echo) gainGauge(p, 'cargas', TG().cargas.perOrb);
    const hand = handAt(p);
    fx(g, o.ctx.fx?.absorb, hand, 1.2);
    fx(g, o.ctx.fx?.aura, hand, 1.2);
    ring(g, p.pos, 1.0, o.color);
    if (o.ctx.fx?.absorbSfx) g.sfx?.(o.ctx.fx.absorbSfx);
  }
  freeOrbMesh(o.mesh);
  o.onDone?.(o);
}
// dibujo de un fotograma: posición, giro de los cuerpos y las runas, latido del halo, estela y zumbido
function orbDraw(g, o, dt) {
  const T = magaTuning();
  o.trailAcc += dt; o.humAcc += dt;
  if (o.trailAcc >= T.orbTrailEvery) {
    o.trailAcc = 0;
    const preset = o.state === 'vuelta' ? o.ctx.fx?.extra : o.ctx.fx?.trail;
    for (const b of orbBodies(o)) fx(g, preset, b, 1.0);
  }
  if (o.humAcc >= T.orbHumEvery) { o.humAcc = 0; if (o.ctx.fx?.humSfx) g.sfx?.(o.ctx.fx.humSfx); }
  const m = o.mesh;
  if (!m?.isObject3D) return;
  m.position.set(o.c.x, 1.0 + 0.08 * Math.sin(o.t * 4), o.c.z);
  m.rotation.y = o.spin;
  for (const b of m.userData.parts || []) {
    b.scale.setScalar(o.scale);
    const u = b.userData;
    u.r1.rotation.z += dt * 2.5; u.r2.rotation.z -= dt * 3.5;
    u.halo.material.opacity = 0.14 + 0.08 * Math.sin(o.t * 9) + (o.state === 'quieto' ? 0.06 : 0);
  }
}
// un fotograma de la simulación (lo llama el bucle de proyectiles) → true al acabar
function orbUpdate(g, o, dt) {
  if (!o.alive) return true;
  const p = o.p, P = o.P;
  if (!p.alive || g.player !== p) { orbEnd(g, o, false); return true; }
  o.t += dt;
  o.spin += dt * (o.state === 'quieto' ? 7 : 4);
  if (o.state === 'ida') {
    const k = Math.min(P.speed * dt, Math.max(0, o.travel - o.went));
    const nx = o.c.x + o.dir.x * k, nz = o.c.z + o.dir.z * k;
    if (g.world?.grid && !g.world.grid.walkable(nx, nz)) orbStop(g, o);
    else {
      o.c.x = nx; o.c.z = nz; o.went += k;
      if (o.went >= o.travel - 1e-6) orbStop(g, o);
    }
  } else if (o.state === 'quieto') {
    o.parkLeft -= dt;
    o.pulseAcc += dt;
    if (o.pulseAcc >= magaTuning().orbPulse - 1e-9) { o.pulseAcc = 0; ring(g, o.c, P.radius, o.color); }
    if (o.parkLeft <= 1e-9) o.state = 'vuelta';
  } else if (o.state === 'vuelta') {
    o.backT += dt;
    const dx = p.pos.x - o.c.x, dz = p.pos.z - o.c.z, d = Math.hypot(dx, dz);
    const k = Math.min(d, P.backSpeed * dt);
    if (d > 1e-6) { o.c.x += dx / d * k; o.c.z += dz / d * k; }
    orbContact(g, o);
    if (Math.hypot(p.pos.x - o.c.x, p.pos.z - o.c.z) <= magaTuning().orbCatch) { orbEnd(g, o, true); return true; }
    if (o.backT >= P.backMax - 1e-9) { orbEnd(g, o, false); return true; }
  }
  if (o.state !== 'vuelta' || P.backZap) {
    o.zapAcc += dt;
    while (o.alive && o.zapAcc >= P.every - 1e-9) { o.zapAcc -= P.every; orbZap(g, o); }
  }
  orbDraw(g, o, dt);
  return !o.alive;
}
// lanza una unidad de `from` hacia `toward` (la dirección; la distancia la acota minRange…range)
function launchOrb(g, p, ctx, { from, toward, echo = false, onDone = null }) {
  const sk = ctx.sk, P = orbParams(sk, ctx.prof);
  let dx = toward.x - from.x, dz = toward.z - from.z;
  const d0 = Math.hypot(dx, dz);
  if (d0 < 1e-3) { const r = p.group?.rotation?.y || 0; dx = Math.sin(r); dz = Math.cos(r); } else { dx /= d0; dz /= d0; }
  const dist = Math.max(P.minRange, Math.min(P.range, d0));
  const o0 = at(p.pos, from.x, from.z);
  const far = at(p.pos, from.x + dx * dist, from.z + dz * dist);
  const stop = g.clampWalkable ? g.clampWalkable(o0, far, dist) : far;
  const color = ctx.color ?? sk.color ?? 0xb388ff;
  const scale = (sk.size || 0.34) / 0.34;
  const o = {
    kind: 'magaOrb', skill: 'a_orbe', friendly: true, alive: true, g, p, ctx, P, color, scale, echo, onDone,
    c: { x: from.x, z: from.z }, dir: { x: dx, z: dz }, travel: Math.hypot(stop.x - from.x, stop.z - from.z), went: 0,
    state: 'ida', t: 0, spin: 0, zapAcc: 0, zapHits: 0, zapped: new Map(), parkLeft: 0, pulseAcc: 0, backT: 0, backHit: new Set(),
    trailAcc: 0, humAcc: 0, stopAt: null, stopPos: null, small: false, caught: false,
    // Orbe Múltiple (a23): orbes pequeños que descargan a 2,5 m
    setSmall() { const T = magaTuning(); o.small = true; o.P.radius = T.orbSmallR; o.scale *= T.orbSmallScale; },
    update(dt) { return orbUpdate(g, o, dt); },
    // cambio de zona: si Game.loadWorld avisa a sus proyectiles antes de vaciar la lista (petición de
    // S-maga al motor), el orbe se apaga en el acto; si no, lo apaga sweepOrbs más tarde
    onWorldReset() { orbEnd(g, o, false); },
  };
  o.mesh = orbMesh(g, color, P.twin ? 2 : 1, P.twin, scale) || stubMesh();
  if (o.travel < 0.3) orbStop(g, o);
  sweepOrbs(p);
  orbsOf(p).add(o);
  (g.projectiles || (g.projectiles = [])).push(o);
  return o;
}
// Inercia (a12): las descargas de `o` que golpearon y aún no recargaron el Rayo (tope por orbe)
function inertia(g, p, o) {
  const T = magaTuning();
  const st = powerState(p, 'a_inercia');
  const prev = st.done.get(o) || 0;
  const n = Math.min(o.zapHits || 0, Math.round(T.inerciaMax / T.inerciaCdr)) - prev;
  if (n <= 0) return;
  st.done.set(o, prev + n);
  g.reduceCooldown?.(p, 'rayo', T.inerciaCdr * rankOf(p, 'a_inercia') * n);
}
// golpe REAL de una habilidad desde un poder (Singularidad 4: cuenta como el Desgarro)
function strikeAs(p, e, skillId, coef, addPct = 0, extra = {}) {
  const tags = new Set(['arcane', ...(extra.tags || [])]);
  const { dmg, crit } = p.rollDamage(coef, 0, addPct, e, { skill: skillId, tags, elem: 'arcane' });
  return e.takeDamage(dmg, crit, { skill: skillId, tags, elem: 'arcane', echo: true }) || 0;
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
// grieta del Desgarro (M-12): una fisura dentada casi blanca sobre un resplandor alargado de su color,
// orientada como el haz (data.ang, data.len × data.wid m); la libera al morir el campo
function riftDecal(g, f) {
  if (f.dead) {
    if (f.decal) { g.fxGroup.remove(f.decal); f.decal.traverse(x => { x.geometry?.dispose?.(); x.material?.dispose?.(); }); f.decal = null; }
    return null;
  }
  if (!f.decal) {
    const L = f.data.len || 3, W = f.data.wid || 1;
    const mat = (c, op) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 28), mat(f.data.color || 0xd28cff, 0.4));
    glow.scale.set(L, W, 1);
    // zigzag fijo a lo largo del eje: borde de arriba de ida y el de abajo de vuelta (más fino en las puntas)
    const Z = [0, 0.16, -0.12, 0.2, -0.16, 0.1, -0.06, 0];
    const H = [0, 0.05, 0.08, 0.09, 0.08, 0.06, 0.04, 0];
    const crackShape = new THREE.Shape();
    Z.forEach((z, i) => { const x = (i / (Z.length - 1) - 0.5) * L * 0.9; const y = z * W + H[i] * W; if (i) crackShape.lineTo(x, y); else crackShape.moveTo(x, y); });
    for (let i = Z.length - 1; i >= 0; i--) crackShape.lineTo((i / (Z.length - 1) - 0.5) * L * 0.9, Z[i] * W - H[i] * W);
    const crack = new THREE.Mesh(new THREE.ShapeGeometry(crackShape), mat(0xf3e6ff, 0.85));
    crack.position.z = 0.01;
    const flat = new THREE.Group();
    flat.rotation.x = -Math.PI / 2;
    flat.add(glow, crack);
    const root = new THREE.Group();
    root.add(flat);
    root.userData = { glow, crack };
    g.fxGroup.add(root);
    f.decal = root;
  }
  // tumbada, el eje x local va por el x del mundo y el y local por −z: girar −ang alrededor de y
  f.decal.rotation.y = -(f.data.ang || 0);
  f.decal.position.set(f.pos.x, 0.06, f.pos.z);
  return f.decal;
}

// ---- Barrera de Maná (base del kit; la usan c4, c11B, c18, c19, c25 y c28) ----
// su escudo se reconoce por la fuente: m_barrera (el comportamiento del catálogo y putBarrier)
function isBarrierSrc(src) { return src === 'm_barrera'; }
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
  // el marco del objetivo la enseña (hud-model: e.uiMarks); se va sola cuando la Marca deja el estado
  (e.uiMarks ||= {}).m_marca_tiempo = { id: 'm_marca_tiempo', name: 'Marca del Tiempo', art: 'talents/maga-clase-c12.webp',
    get t() { return st.marks.get(e) === m ? Math.max(m.until, st.stopUntil || 0) - now(p) : 0; } };
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
        // el Dardo (básico de arma) no lo gasta: es «contra grupos que te rodean» (win de la opción A)
        // y, si lo gastara el básico que no paras de lanzar, nunca llegaría a la Nova ni a la Bola
        if (cast?.weapon) return;
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
    // c15A Escudo de Maná: el 20 % del daño que recibes lo pagas con maná (mientras te quede; el
    // gasto pasa por resources.js como cualquier coste)
    m_escudo_mana: {
      name: 'Escudo de Maná', desc: 'El 20 % del daño que recibes lo pagas con maná en vez de vida.',
      onDamaged(g, p, dmg) {
        const take = Math.min((dmg?.amount || 0) * T.escudoManaPct / 100, p.mp || 0);
        if (!(take > 0) || !spendResource(p, take)) return;
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
      // la Barrera del catálogo no guarda su máximo: se anota al ponerla
      afterCast(g, p, cast) { if (cast?.sk?.id === 'm_barrera') { const s = barrierShield(p); if (s) s.max = s.amt; } },
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
    // c23 Ritmo Arcano: cada crítico directo del Dardo recarga 0,5 × rango s de Parpadeo y de la
    // Barrera (una vez por instante). Solo esas dos: tv.basicCritCdr del núcleo recargaría también
    // la movilidad y las defensas del kit (Estela Ígnea, Bloque de Hielo…), que el nodo no nombra
    m_ritmo_arcano: {
      name: 'Ritmo Arcano', desc: 'Cada crítico del Dardo Arcano recarga parte de Parpadeo y de la Barrera de Maná.',
      state: () => ({ at: -1 }),
      onHit(g, p, e, hit) {
        if (!hit?.crit || hit.proc || hit.dot || hit.skill !== 'm_dardo') return;
        const st = powerState(p, 'm_ritmo_arcano');
        if (st.at === now(p)) return;
        st.at = now(p);
        const s = T.ritmoCdr * rankOf(p, 'm_ritmo_arcano');
        g.reduceCooldown?.(p, 'm_parpadeo', s);
        g.reduceCooldown?.(p, 'm_barrera', s);
      },
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
      // la Barrera que lanzas tampoco caduca (el comportamiento del catálogo le pone su duración)
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_barrera') return;
        const s = barrierShield(p);
        if (s) s.t = T.bastionDur;
        bastionWatch(g, p, false);
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

    // ---------------------------------------------------- PIROMANTE 2g (§5.0 y Anexo A.7)
    // s0 Ignición (clave): tus golpes de Fuego queman (60 % del golpe en 4 s) y la explosión de la
    // Bola de Fuego pasa del 100 % al 350 % (su innata: con otra especialización vuelve al 100 %).
    // Cuenta también el suelo de Fuego (los tics de un campo con la etiqueta fire: la Estela Ígnea,
    // la Pira); no los tics de una quemadura ni el daño de poder. Decisión de KT-maga pendiente de
    // aprobación (divergencias.json: spec.piromante.s0.touch); sin ella, solo golpes directos
    p_ignicion: {
      name: 'Ignición', desc: 'Tus golpes de Fuego queman (un 60 % extra del golpe en 4 s) y la Bola de Fuego explota al 350 %.',
      procs: true,
      modifyResolve(p, sk, prof) { if (sk.id === 'bola_fuego' && prof.splash > 0) prof.splash *= T.bolaPiro; },
      onHit(g, p, e, hit) {
        if (!hit || hit.proc || !e?.alive) return;
        const fire = hit.dot ? String(hit.source || '').startsWith('field:') && !!hit.tags?.has?.('fire') : hit.elem === 'fire';
        if (fire) ignite(g, p, e, hit.raw || hit.dealt || 0);
      },
    },
    // s5 Chispas: un crítico sobre un enemigo que YA se quemaba reinicia sus quemaduras y da Calor
    // (antes que Ignición: la quemadura que pone este mismo golpe no cuenta)
    p_chispas: {
      name: 'Chispas', desc: 'Un crítico sobre un enemigo que se quema reinicia su quemadura y te da 5 de Calor.',
      priority: 1,
      onHit(g, p, e, hit) {
        if (!hit?.crit || hit.proc || hit.dot || !e?.alive) return;
        const burns = g.dotsOf?.(e, 'burn') || [];
        if (!burns.length) return;
        for (const d of burns) g.replaceDoT(e, d.total, d.ticks, 1, d.source);
        gainGauge(p, 'calor', TG().calor.chispas);
      },
    },
    // s6 Combustible Volátil: con Ignición Total, la Bola explota al doble de radio y el Meteoro cae ya
    p_volatil: {
      name: 'Combustible Volátil', desc: 'Con Ignición Total, la Bola explota en 4 m y el Meteoro cae al instante.',
      priority: -1,                                         // después del indicador (prof.ignition)
      modifyResolve(p, sk, prof) {
        if (!prof.ignition) return;
        if (sk.id === 'bola_fuego') prof.radius *= T.volatilRadius;
        if (sk.id === 'meteoro') prof.impactDelay = 0;
      },
    },
    // s7 Pira: el Meteoro deja el suelo ardiendo 1 + rango s (40 % del arma por segundo)
    p_pira: {
      name: 'Pira', desc: 'El Meteoro deja el suelo ardiendo unos segundos.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'meteoro' || !cast.target) return;
        g.spawnField?.('zona', { pos: cast.target, radius: cast.prof?.radius || 3, dur: T.piraBase + rankOf(p, 'p_pira'), owner: p,
          data: { dps: p.avgHit(T.piraCoef, cast.prof?.addPct || 0), interval: 0.5, color: 0xff5a1f, skill: 'meteoro', tags: new Set(['zone', 'fire']) } });
      },
    },
    // s8A Propagación: al morir quemándose, sus quemaduras pasan a los 2 enemigos más cercanos (5 m)
    p_propagacion: {
      name: 'Propagación', desc: 'Cuando muere un enemigo que se quema, su quemadura pasa a 2 enemigos cercanos.',
      onKill(g, p, e) {
        if (!(g.dotsOf?.(e, 'burn') || []).length) return;
        const near = alivesNear(g, e.pos, T.propagateR, e).sort(byDist(e.pos)).slice(0, T.propagateN + passExtra(p));
        for (const o of near) passBurns(g, p, e, o);
      },
    },
    // s8B Brasa Profunda: hasta 3 quemaduras tuyas a la vez en el mismo enemigo (las cuenta burnKeys)
    p_acumular: { name: 'Brasa Profunda', desc: 'Puedes poner hasta 3 quemaduras a la vez en el mismo enemigo.' },
    // s9A Llamarada Avivada: hace estallar el 100 % y te da 25 de Calor
    p_llamarada_avivada: {
      name: 'Llamarada Avivada', desc: 'Llamarada hace estallar el 100 % de las quemaduras y te da 25 de Calor.',
      modifyResolve(p, sk, prof) { if (sk.id === 'p_llamarada') prof.detonatePct = 100; },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'p_llamarada') gainGauge(p, 'calor', TG().calor.llamarada); },
    },
    // s9B Llamarada Voraz: si estalla 3 o más quemaduras, 4 s menos de recarga y 8 de Calor por enemigo.
    // Cuenta los estallidos (daño de poder `skill:p_llamarada`) de ESE lanzamiento
    p_llamarada_voraz: {
      name: 'Llamarada Voraz', desc: 'Si Llamarada hace estallar 3 o más quemaduras, se recarga antes y te da Calor.',
      procs: true,
      state: () => ({ n: 0 }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'p_llamarada') powerState(p, 'p_llamarada_voraz').n = 0; },
      onHit(g, p, e, hit) { if (hit?.proc && hit.source === 'skill:p_llamarada') powerState(p, 'p_llamarada_voraz').n++; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'p_llamarada') return;
        const st = powerState(p, 'p_llamarada_voraz');
        const n = st.n; st.n = 0;
        if (n < TG().calor.vorazN) return;
        g.reduceCooldown?.(p, 'p_llamarada', T.vorazCdr);
        gainGauge(p, 'calor', TG().calor.voraz * n);
      },
    },
    // s10A Meteoro Gemelo: cada 3.er Meteoro cae otra vez en el mismo sitio
    p_meteoro_gemelo: {
      name: 'Meteoro Gemelo', desc: 'Cada 3.er Meteoro cae dos veces en el mismo sitio.',
      state: () => ({ n: 0 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'meteoro') return;
        const st = powerState(p, 'p_meteoro_gemelo');
        if (++st.n < T.gemeloEvery) return;
        st.n = 0;
        echoCast(g, p, cast, 1, 0.25);
      },
    },
    // s10B Meteoro Concentrado: +50 % al enemigo más cercano al centro del impacto
    p_meteoro_conc: {
      name: 'Meteoro Concentrado', desc: 'El Meteoro hace +50 % al enemigo más cercano al centro.',
      state: () => ({ c: null, at: -1, pick: null }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'meteoro' && cast.target) powerState(p, 'p_meteoro_conc').c = { x: cast.target.x, z: cast.target.z }; },
      condAdd(p, e, hit) {
        if (hit?.skill !== 'meteoro' || !e) return 0;
        const st = powerState(p, 'p_meteoro_conc');
        if (!st.c) return 0;
        if (st.at !== now(p)) { st.at = now(p); st.pick = alivesNear(p.game, st.c, 6).sort(byDist(st.c))[0] || null; }
        return st.pick === e ? T.concPct : 0;
      },
    },
    // s14 Impacto Sísmico: la ralentización es un mod del nodo; a los jefes, 20 de Quebranto por golpe
    p_sismico: {
      name: 'Impacto Sísmico', desc: 'El Meteoro llena 20 de Quebranto a los jefes.',
      onHit(g, p, e, hit) { if (hit?.skill === 'meteoro' && !hit.proc && !hit.dot && isBoss(e)) e.addStagger?.(T.sismicoStagger, p); },
    },
    // s15A Fénix: una vez cada 2 minutos, al morir renaces con la mitad de la vida
    p_fenix: {
      name: 'Fénix', desc: 'Si mueres, renaces con la mitad de la vida. Una vez cada 2 minutos.',
      state: () => ({ readyAt: 0 }),
      priority: -1,                                           // después de los que salvan sin coste
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
    // s15B Escudo de Llamas: −10 % de daño recibido; quien te golpea cuerpo a cuerpo se quema
    // (la quemadura de un golpe del 100 % de tu arma)
    p_escudo_llamas: {
      name: 'Escudo de Llamas', desc: 'Recibes un 10 % menos de daño y quien te golpea cuerpo a cuerpo se quema.',
      condDr() { return T.escudoLlamasDr; },
      onDamaged(g, p, info) {
        const src = info?.src;
        if (!info?.melee || !src?.alive || typeof src.takeDamage !== 'function') return;
        ignite(g, p, src, p.avgHit(T.escudoLlamasCoef));
      },
    },
    // s16 Brasero: con más de 50 de Calor, quemaduras +(15 + 10 × rango) % (al ponerlas: burnBonus)
    // y Meteoro +(10 + 5 × rango) %
    p_brasero: {
      name: 'Brasero', desc: 'Con más de 50 de Calor, tus quemaduras y tu Meteoro hacen más daño.',
      condAdd(p, e, hit) {
        if (hit?.skill !== 'meteoro' || !(gaugeValue(p, 'calor') > TG().calor.brasero)) return 0;
        return T.braseroMeteo + T.braseroMeteoRank * rankOf(p, 'p_brasero');
      },
    },
    // s17 Estrellas Fugaces: Supernova suelta 1 + 2 × rango meteoros pequeños (40 % cada uno) en 3 s
    // sobre los enemigos a 8 m
    p_estrellas_fugaces: {
      name: 'Estrellas Fugaces', desc: 'Supernova suelta además meteoros pequeños en los 3 s siguientes.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_u_supernova') return;
        const n = 1 + 2 * rankOf(p, 'p_estrellas_fugaces');
        const amt = p.avgHit(T.estrellasCoef, cast.prof?.addPct || 0);
        for (let i = 0; i < n; i++) {
          g.timers.schedule(T.estrellasT * (i + 1) / n, () => {
            if (!p.alive || g.player !== p) return;
            const pool = alivesNear(g, p.pos, T.estrellasArea);
            if (!pool.length) return;
            const tgt = pool[Math.floor(rng(p) * pool.length) % pool.length];
            const c = { x: tgt.pos.x, z: tgt.pos.z };
            for (const o of alivesNear(g, c, T.estrellasR + 0.5))
              dealProcDamage(g, o, amt, { source: 'power:p_estrellas_fugaces', skill: 'm_u_supernova', elem: 'fire', tags: new Set(['area', 'fire']) });
            ring(g, c, T.estrellasR, 0xffb347);
            fx(g, 'fireballBlast', c, 0.4);
            countExplosion(g, p, c);
          });
        }
      },
    },
    // s18 Brasa Errante: las quemaduras que pasan no pierden daño ni tiempo y llegan a 1–2 enemigos
    // más (lo leen passBurns y passExtra)
    p_brasa_errante: { name: 'Brasa Errante', desc: 'Las quemaduras que pasan a otro enemigo no pierden daño ni tiempo, y llegan a más enemigos.' },
    // s21 Estela Meteórica: al terminar la Estela Ígnea, tu siguiente Meteoro cae allí al instante
    p_estela_meteorica: {
      name: 'Estela Meteórica', desc: 'Al terminar la Estela Ígnea, tu siguiente Meteoro cae allí al instante.',
      state: () => ({ pos: null }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_estela_ignea') return;
        powerState(p, 'p_estela_meteorica').pos = { x: p.pos.x, z: p.pos.z };
        invalidate(p, 'meteoro');
        ring(g, p.pos, 1.2, 0xff7733);
      },
      modifyResolve(p, sk, prof) { if (sk.id === 'meteoro' && powerState(p, 'p_estela_meteorica').pos) prof.impactDelay = 0; },
      // cast.target es el mismo vector que usa el lanzamiento: se mueve al final de la Estela
      onCast(g, p, cast) {
        const st = powerState(p, 'p_estela_meteorica');
        if (cast?.sk?.id !== 'meteoro' || !st.pos || !cast.target) return;
        cast.target.x = st.pos.x; cast.target.z = st.pos.z;
        st.pos = null;
        invalidate(p, 'meteoro');
      },
    },
    // s22 Brasa Viva: cada segundo, cada enemigo que se quema copia el (10 + 10 × rango) % de lo que
    // le queda a otro enemigo a 2 m (copia: no lo pierde)
    p_brasa_viva: {
      name: 'Brasa Viva', desc: 'Los enemigos que se queman contagian a otro cercano cada segundo.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'p_brasa_viva');
        st.acc += dt;
        if (st.acc < T.vivaEvery - 1e-9) return;
        st.acc = 0;
        const frac = (T.vivaBase + T.vivaRank * rankOf(p, 'p_brasa_viva')) / 100;
        const burning = (g.enemies || []).filter(e => e.alive && (g.dotsOf?.(e, 'burn') || []).length);
        for (const e of burning) {
          const o = alivesNear(g, e.pos, T.vivaR + 0.5 * (e.def?.scale || 1), e).sort(byDist(e.pos))[0];
          if (o) passBurns(g, p, e, o, frac, true);
        }
      },
    },
    // s23 Combustión: al usar Ignición Total, 1,5 + rango s en los que todo tu Fuego es crítico
    p_combustion: {
      name: 'Combustión', desc: 'Al usar Ignición Total, durante unos segundos todo tu Fuego es crítico.',
      onCast(g, p, cast) {
        if (!cast?.prof?.ignition) return;
        const C = TG().calor.combustion;
        const t = C.base + C.perRank * rankOf(p, 'p_combustion');
        p.addBuff('p_combustion', {}, t, { name: 'Combustión', icon: '🔥', desc: 'Todo tu Fuego es crítico' });
        text(g, p, '¡Combustión!');
      },
      modifyResolve(p, sk, prof) { if (prof.elem === 'fire' && combustionBuff(p)) prof.forceCrit = true; },
    },
    // s24 Cráter: el Meteoro deja un cráter 4 s; dentro, +(10 + 5 × rango) % de Fuego y la Bola de
    // Fuego explota dos veces (la segunda, al poco: daño de poder con su explosión)
    p_crater: {
      name: 'Cráter', desc: 'El Meteoro deja un cráter: dentro, más daño de Fuego y la Bola de Fuego explota dos veces.',
      state: () => ({ bolaAt: -1 }),
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'meteoro' || !cast.target) return;
        g.spawnField?.('p_crater', { pos: cast.target, radius: cast.prof?.radius || 3, dur: T.craterT, owner: p, data: { skill: 'meteoro' } });
      },
      condAdd(p, e, hit) {
        if (hit?.elem !== 'fire' || !e || !inCrater(p.game, p, e.pos)) return 0;
        return T.craterBase + T.craterRank * rankOf(p, 'p_crater');
      },
      // el primer golpe de la Bola en un instante es el directo (después llega su explosión)
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'bola_fuego' || hit.proc || hit.dot || !e) return;
        const st = powerState(p, 'p_crater');
        const first = st.bolaAt !== now(p);
        st.bolaAt = now(p);
        if (!first || !inCrater(g, p, e.pos)) return;
        const pr = p.resolved?.bola_fuego;
        const c = { x: e.pos.x, z: e.pos.z }, r = pr?.radius || 2;
        const amt = p.avgHit(pr?.splash || T.bolaPiro, pr?.addPct || 0);
        g.timers.schedule(0.15, () => {
          if (!p.alive || g.player !== p) return;
          for (const o of enemiesIn(g, c, r)) dealProcDamage(g, o, amt, { source: 'power:p_crater', skill: 'bola_fuego', elem: 'fire', tags: new Set(['area', 'fire']) });
          ring(g, c, r, 0xff6622);
          fx(g, 'fireballBlast', c, 0.4);
          countExplosion(g, p, c);
        });
      },
    },
    // s25 Incendio Forestal (final): 5 quemaduras por enemigo; al morir, TODAS pasan a cada enemigo a
    // 4 m (rangos 2–3: tv.burnPct del nodo)
    p_incendio: {
      name: 'Incendio Forestal', desc: 'Un enemigo aguanta hasta 5 quemaduras tuyas; al morir, todas pasan a los que estén a 4 m.',
      onKill(g, p, e) {
        if (!(g.dotsOf?.(e, 'burn') || []).length) return;
        for (const o of alivesNear(g, e.pos, T.incendioR, e)) passBurns(g, p, e, o);
        ring(g, e.pos, T.incendioR, 0xff5a1f);
      },
    },
    // s26 Combustión Perpetua (final): en Combustión, cada crítico da 4 de Calor; al llenarlo, la
    // Combustión dura 3 s más y se lanza una Bola gratis (rangos 2–3: stats.critDmg del nodo)
    p_perpetua: {
      name: 'Combustión Perpetua', desc: 'En Combustión, tus críticos dan Calor; al llenarlo, la Combustión dura más y lanzas una Bola gratis.',
      onHit(g, p, e, hit) {
        if (!hit?.crit || hit.proc || hit.dot || !combustionBuff(p)) return;
        gainGauge(p, 'calor', TG().calor.perpetua);
      },
      onGauge(g, p, id, ev) {
        if (id !== 'calor' || ev !== 'full') return;
        const b = combustionBuff(p);
        if (!b) return;
        const ext = TG().calor.perpetuaExt;
        b.t += ext; b.dur = (b.dur || 0) + ext;
        scheduleAutoCast(g, p, 'bola_fuego', p.pos, '¡Bola gratis!');
      },
    },
    // s27 Lluvia de Fuego (final): con Ignición Total, el Meteoro cae 3 veces (100/60/60 %); si golpea
    // a 3 o más, se recarga al instante (rangos 2–3: mod meteoro dmg del nodo)
    p_lluvia_fuego: {
      name: 'Lluvia de Fuego', desc: 'Con Ignición Total, el Meteoro cae tres veces; si golpea a 3 o más, se recarga al instante.',
      afterCast(g, p, cast, res) {
        if (cast?.sk?.id !== 'meteoro' || !cast.prof?.ignition) return;
        for (let i = 1; i < T.lluviaHits; i++) echoCast(g, p, cast, T.lluviaEcho, T.lluviaGap * i);
        if ((res?.hits || 0) >= T.lluviaHits) g.reduceCooldown?.(p, 'meteoro', Infinity);
      },
    },
    // s28 Corazón del Sol (ápice, 4 rangos): 1) al usar Ignición Total estallan las quemaduras a 8 m
    // (50 % de lo que les queda, sin gastarlas) · 2) matar a un élite da 25 de Calor · 3) Ignición a 80
    // (máximo del Calor −20) · 4) cada 20 explosiones, Supernova sola y gratis (countExplosion)
    p_corazon_sol: {
      name: 'Corazón del Sol', desc: 'Ignición Total hace estallar tus quemaduras; los élites dan Calor; Ignición antes; Supernova sola.',
      state: () => ({ boom: 0, hitKey: '' }),
      stats(p) { return rankOf(p, 'p_corazon_sol') >= 3 ? { 'gaugeMax:calor': TG().calor.ignitionAt - TG().calor.max } : {}; },
      onCast(g, p, cast) {
        if (!cast?.prof?.ignition) return;
        let any = false;
        for (const o of alivesNear(g, p.pos, T.coreR)) {
          const rem = g.dotRemaining?.(o, 'burn') || 0;
          if (!(rem > 0)) continue;
          dealProcDamage(g, o, rem * T.corePct / 100, { source: 'power:p_corazon_sol', elem: 'fire', tags: new Set(['area', 'fire']) });
          fx(g, 'fireballBlast', o.pos, 0.6);
          any = true;
        }
        if (any) { ring(g, p.pos, T.coreR, 0xffa040); countExplosion(g, p, p.pos); }
      },
      onKill(g, p, e) { if (rankOf(p, 'p_corazon_sol') >= 2 && isElite(e)) gainGauge(p, 'calor', TG().calor.eliteCalor); },
      // explosiones de la Bola y del Meteoro: una por habilidad e instante
      onHit(g, p, e, hit) {
        if ((hit?.skill !== 'bola_fuego' && hit?.skill !== 'meteoro') || hit.proc || hit.dot) return;
        const st = powerState(p, 'p_corazon_sol');
        const key = `${hit.skill}@${now(p)}`;
        if (st.hitKey === key) return;
        st.hitKey = key;
        countExplosion(g, p, e?.pos || p.pos);
      },
    },

    // ---------------------------------------------------- CRIONTE 2g (§5.2)
    // i2 Filo Helado: +5 × rango % de crítico contra enemigos con 3 o más capas (las capas son por
    // enemigo: el indicador no puede dar crítico, lo da este poder)
    k_filo_helado: {
      name: 'Filo Helado', desc: 'Más probabilidad de crítico contra enemigos con 3 o más capas de Escarcha.',
      condCrit(p, e) { return e && layersOf(p, e) >= TG().escarcha.critLayers ? T.filoCrit * rankOf(p, 'k_filo_helado') : 0; },
    },
    // i5 Hielo Quebradizo: los Congelados reciben +20 % de daño de todo (saco Debilidad, mientras dure)
    k_quebradizo: {
      name: 'Hielo Quebradizo', desc: 'Los enemigos Congelados reciben +20 % de daño de todo.',
      onTick(g) { for (const e of g.enemies || []) if (frozen(e)) e.applyWeakness('k_quebradizo', T.quebradizoPct, e.frozenT); },
    },
    // i6 Polvo de Diamante: al congelar a un enemigo, tu siguiente Lanza o Nova no cuesta maná
    k_polvo: {
      name: 'Polvo de Diamante', desc: 'Al congelar a un enemigo, tu siguiente Lanza de Hielo o Nova no cuesta maná.',
      state: () => ({ free: false }),
      onTick(g, p) {
        const st = powerState(p, 'k_polvo');
        const list = freezesNow(g, p);                // sondeo en cada tic: una congelación de antes no cuenta luego
        if (st.free || !list.length) return;
        st.free = true;
        invalidate(p, 'k_lanza'); invalidate(p, 'nova_hielo');
      },
      modifyResolve(p, sk, prof) { if ((sk.id === 'k_lanza' || sk.id === 'nova_hielo') && powerState(p, 'k_polvo').free) prof.cost = 0; },
      onCast(g, p, cast) {
        const st = powerState(p, 'k_polvo');
        if (!st.free || (cast?.sk?.id !== 'k_lanza' && cast?.sk?.id !== 'nova_hielo')) return;
        st.free = false;
        invalidate(p, 'k_lanza'); invalidate(p, 'nova_hielo');
      },
    },
    // i7 Tormenta Creciente: la Tormenta Glacial crece un 10 % de radio cada segundo (la duración, mod)
    k_crece: {
      name: 'Tormenta Creciente', desc: 'La Tormenta Glacial crece un 10 % cada segundo.',
      onTick(g, p) {
        const s = stormTrack(p, 'k_crece');
        if (!s) return;
        const st = powerState(p, 'k_crece');
        s.radius = st.base * (1 + T.creceStep / 100 * Math.floor(now(p) - st.t0 + 1e-9));
      },
    },
    // i8B Prisión Profunda: la Prisión no atrapa en área; atrapa 3 s al enemigo de la mira (o al más
    // cercano a 8 m) con un golpe real de la Prisión con +80 %
    k_prision_profunda: {
      name: 'Prisión Profunda', desc: 'La Prisión de Hielo atrapa a un solo enemigo 3 s y le hace +80 %.',
      // prof.single: la Prisión del catálogo no atrapa en área (prision_hielo); aquí, a uno solo
      modifyResolve(p, sk, prof) { if (sk.id === 'k_prision') prof.single = true; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'k_prision') return;
        // el de la mira a 8 m (o a su alcance con Celda Lejana) o, si no, el más cercano a 8 m
        const reach = Math.max(T.profundaR, cast.sk?.at === 'enemy' ? (cast.prof?.range || 0) : 0);
        const pick = cast.enemy?.alive && insideR(cast.enemy.pos, p.pos, reach) ? cast.enemy : alivesNear(g, p.pos, T.profundaR).sort(byDist(p.pos))[0];
        if (!pick) return;
        pick.applyCC('freeze', T.profundaFreeze, { src: p });
        const pr = cast.prof || {};
        const info = { skill: 'k_prision', tags: pr.tags || new Set(['frost']), elem: 'frost' };
        const { dmg, crit } = p.rollDamage(pr.coef || 0.8, pr.critBonus || 0, (pr.addPct || 0) + T.profundaPct, pick, info);
        pick.takeDamage(dmg, crit, info);
        ring(g, pick.pos, 1.2, 0x88ddff);
        fx(g, 'iceShatter', pick.pos, 0.8);
      },
    },
    // i9B Lanza del Invierno: la Lanza hace ×4 a los Congelados (antes ×3: prof.frozenMult) y también
    // ×4 a los jefes Ateridos (antes de que este golpe sume su capa)
    k_lanza_invierno: {
      name: 'Lanza del Invierno', desc: 'Contra Congelados o Ateridos, la Lanza de Hielo hace el cuádruple.',
      priority: 2,
      modifyResolve(p, sk, prof) { if (sk.id === 'k_lanza') prof.frozenMult = T.lanzaInvierno; },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'k_lanza' || hit.proc || hit.dot || !isBoss(e) || !((e.numbT || 0) > 0) || !e.alive) return;
        dealProcDamage(g, e, (hit.dealt || 0) * (T.lanzaInvierno - 1), { source: 'power:k_lanza_invierno', skill: 'k_lanza', elem: 'frost', tags: new Set(['frost']) });
      },
    },
    // i10A Ventisca Viva: mientras dura la Tormenta Glacial, una Nova de Hielo cada 2 s desde el
    // centro de la Tormenta (contigo si te sigue; donde la anclaste con la Ventisca Anclada)
    k_ventisca_viva: {
      name: 'Ventisca Viva', desc: 'Mientras dura, la Tormenta Glacial suelta una Nova de Hielo cada 2 s.',
      state: () => ({ acc: 0 }),
      onTick(g, p, dt) {
        const s = stormTrack(p, 'k_ventisca_viva');
        if (!s) return;
        const st = powerState(p, 'k_ventisca_viva');
        st.acc += dt;
        if (st.acc < T.ventiscaEvery - 1e-9) return;
        st.acc = 0;
        autoCast(g, p, 'nova_hielo', { origin: s.center() });
      },
    },
    // i10B Frío Sostenido: la Tormenta hace +60 % al enemigo con más capas dentro de ella
    k_frio_sostenido: {
      name: 'Frío Sostenido', desc: 'La Tormenta Glacial hace +60 % al enemigo con más capas.',
      state: () => ({ at: -1, pick: null }),
      condAdd(p, e, hit) {
        if (hit?.skill !== 'm_u_tormenta' || !e) return 0;
        const s = stormOf(p);
        if (!s) return 0;
        const st = powerState(p, 'k_frio_sostenido');
        if (st.at !== now(p)) {
          st.at = now(p);
          let best = null, bv = 0;
          for (const o of enemiesIn(p.game, s.center(), s.radius)) { const v = layersOf(p, o); if (v > bv) { bv = v; best = o; } }
          st.pick = best;
        }
        return st.pick === e ? T.frioSostenido : 0;
      },
    },
    // i12 Astillas: cada crítico de Hielo recarga 0,5 × rango s de la Lanza y de la Prisión (uno por instante)
    k_astillas: {
      name: 'Astillas', desc: 'Cada crítico de Hielo recarga parte de la Lanza de Hielo y de la Prisión de Hielo.',
      state: () => ({ at: -1 }),
      onHit(g, p, e, hit) {
        if (!hit?.crit || hit.proc || hit.dot || hit.elem !== 'frost') return;
        const st = powerState(p, 'k_astillas');
        if (st.at === now(p)) return;
        st.at = now(p);
        const s = T.astillasCdr * rankOf(p, 'k_astillas');
        g.reduceCooldown?.(p, 'k_lanza', s);
        g.reduceCooldown?.(p, 'k_prision', s);
      },
    },
    // i14 Suelo Helado: la Prisión deja el suelo helado 4 s (ralentiza un 40 %, 1 capa por segundo)
    // donde se cerró: a tus pies o, si su forma se lanza lejos (at ≠ 'self'), en la mira
    k_suelo: {
      name: 'Suelo Helado', desc: 'La Prisión de Hielo deja el suelo helado: ralentiza y pone capas.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'k_prision') return;
        const r = (cast.prof?.radius || 0) > 0.5 ? cast.prof.radius : (cast.sk.radius || 4);
        const c = cast.sk.at === 'self' ? p.pos : (cast.target || p.pos);
        g.spawnField?.('k_suelo', { pos: at(p.pos, c.x, c.z, 0), radius: r, dur: T.sueloT, owner: p, data: { skill: 'k_prision' } });
      },
    },
    // i15A Piel de Invierno: recibes un 15 % menos de daño de enemigos con capas
    k_piel_invierno: {
      name: 'Piel de Invierno', desc: 'Recibes menos daño de los enemigos con capas de Escarcha.',
      condDr(p, info) { return info?.src && layersOf(p, info.src) >= 1 ? T.pielDr : 0; },
    },
    // i15B Cristal Protector: congelar a un enemigo a 4 m te da un escudo del 5 % de tu vida (cada 3 s)
    k_cristal: {
      name: 'Cristal Protector', desc: 'Congelar a un enemigo cerca de ti te da un escudo.',
      state: () => ({ readyAt: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'k_cristal');
        const list = freezesNow(g, p);
        if (now(p) < st.readyAt - 1e-9 || !list.some(e => insideR(e.pos, p.pos, T.cristalShieldR + 0.5 * (e.def?.scale || 1)))) return;
        st.readyAt = now(p) + T.cristalShieldCd;
        g.shield?.(p.stats.maxHP * T.cristalShieldPct / 100, { target: 'self', dur: T.cristalShieldT, src: 'k_cristal' });
        ring(g, p.pos, 1.1, 0xbfeaff);
      },
    },
    // i16 Invierno Profundo: tu Hielo hace +5 × rango % por cada Congelado a 10 m (hasta 5)
    k_invierno: {
      name: 'Invierno Profundo', desc: 'Tu Hielo hace más daño por cada enemigo Congelado cerca de ti.',
      state: () => ({ at: -1, n: 0 }),
      condAdd(p, e, hit) {
        if (hit?.elem !== 'frost') return 0;
        const st = powerState(p, 'k_invierno');
        if (st.at !== now(p)) { st.at = now(p); st.n = Math.min(T.inviernoMax, enemiesIn(p.game, p.pos, T.inviernoR).filter(frozen).length); }
        return st.n * T.inviernoPct * rankOf(p, 'k_invierno');
      },
    },
    // i17 Remolino: al terminar el Paso de Escarcha, una Nova de Hielo al 50 × rango %
    k_remolino: {
      name: 'Remolino', desc: 'Al terminar el Paso de Escarcha, sueltas una Nova de Hielo.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'm_paso_escarcha') return;
        autoCast(g, p, 'nova_hielo', { mult: T.remolinoPct * rankOf(p, 'k_remolino') / 100 });
      },
    },
    // i18 Congelación en Cadena: cuando muere un Congelado, se congelan 1–2 enemigos a 4 m
    k_cadena: {
      name: 'Congelación en Cadena', desc: 'Cuando muere un enemigo Congelado, se congelan otros cercanos.',
      onKill(g, p, e, kill) {
        if (!kill?.status?.frozen && !((e.frozenT || 0) > 0)) return;
        const near = alivesNear(g, e.pos, T.cadenaR, e).filter(o => !frozen(o)).sort(byDist(e.pos)).slice(0, rankOf(p, 'k_cadena'));
        for (const o of near) { o.applyCC('freeze', freezeBase(), { src: p }); beam(g, e.pos, o.pos, 0xbfeaff, 0.2); }
      },
    },
    // i19 Ruptura: la Lanza hace añicos a un Congelado (no jefe): +25 × rango % (daño de poder),
    // le quita la congelación y le deja 3 capas. Después de Escarcha: el golpe ya puso su capa y
    // quedan exactamente 3 (si no, una Lanza de 2 capas lo volvería a congelar al instante)
    k_ruptura: {
      name: 'Ruptura', desc: 'La Lanza de Hielo hace añicos a un Congelado: más daño, lo descongela y le deja 3 capas.',
      priority: -1,
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'k_lanza' || hit.proc || hit.dot || !e?.alive || isBoss(e) || !frozen(e)) return;
        thaw(e);
        setGauge(p, 'escarcha', T.rupturaLayers, e);
        dealProcDamage(g, e, (hit.dealt || 0) * T.rupturaPct * rankOf(p, 'k_ruptura') / 100, { source: 'power:k_ruptura', skill: 'k_lanza', elem: 'frost', tags: new Set(['frost']) });
        fx(g, 'iceShatter', e.pos, 0.8);
        text(g, e, '¡Añicos!', 'txt-mana');
      },
    },
    // i21 Ojo Frío: al acabar, la Tormenta Glacial estalla (200 %) y congela a los que tengan 3 o más capas
    k_ojo_frio: {
      name: 'Ojo Frío', desc: 'Al acabar, la Tormenta Glacial estalla y congela a los que tengan 3 o más capas.',
      state: () => ({ inst: null, c: null, r: 0, addPct: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'k_ojo_frio');
        const s = stormOf(p);
        if (s) {
          if (st.inst !== s) st.inst = s;
          const c = s.center();
          st.c = { x: c.x, z: c.z }; st.r = s.radius; st.addPct = p.resolved?.m_u_tormenta?.addPct ?? st.addPct;
          return;
        }
        if (!st.inst) return;
        st.inst = null;
        if (!p.alive || !st.c) return;
        const amt = p.avgHit(T.ojoCoef, st.addPct || 0);
        for (const o of enemiesIn(g, st.c, st.r)) {
          dealProcDamage(g, o, amt, { source: 'power:k_ojo_frio', skill: 'm_u_tormenta', elem: 'frost', tags: new Set(['area', 'frost']) });
          if (o.alive && layersOf(p, o) >= T.ojoLayers) o.applyCC('freeze', freezeBase(), { src: p });
        }
        ring(g, st.c, st.r, 0xbfe9ff);
        fx(g, 'iceShatter', st.c, 0.6);
      },
    },
    // i22 Glaciar: al congelar a un enemigo, los que están a 3 m ganan 1 capa por rango
    k_glaciar: {
      name: 'Glaciar', desc: 'Al congelar a un enemigo, los que están cerca ganan capas de Escarcha.',
      onTick(g, p) {
        const n = rankOf(p, 'k_glaciar');
        for (const e of freezesNow(g, p))
          for (const o of alivesNear(g, e.pos, T.glaciarR, e)) gainGauge(p, 'escarcha', n, o);
      },
    },
    // i23 Esquirlas: hacer añicos (Ruptura) suelta 4 esquirlas al (20 + 10 × rango) % a los cercanos
    k_esquirlas: {
      name: 'Esquirlas', desc: 'Hacer añicos a un enemigo suelta esquirlas que dañan a los cercanos.',
      procs: true,
      onHit(g, p, e, hit) {
        if (hit?.source !== 'power:k_ruptura' || !e) return;
        const amt = p.avgHit((T.esquirlasBase + T.esquirlasRank * rankOf(p, 'k_esquirlas')) / 100, p.resolved?.k_lanza?.addPct || 0);
        for (const o of alivesNear(g, e.pos, T.esquirlasR, e).sort(byDist(e.pos)).slice(0, T.esquirlasN)) {
          dealProcDamage(g, o, amt, { source: 'power:k_esquirlas', skill: 'k_lanza', elem: 'frost', tags: new Set(['frost']) });
          beam(g, e.pos, o.pos, 0xcff3ff, 0.15);
        }
      },
    },
    // i24 Tormenta Perpetua: cada enemigo que congelas dentro de la Tormenta la alarga 0,5 × rango s
    // (hasta +6 s)
    k_perpetua: {
      name: 'Tormenta Perpetua', desc: 'Cada enemigo que congelas dentro de la Tormenta Glacial la alarga.',
      onTick(g, p) {
        const list = freezesNow(g, p);                // sondeo también sin Tormenta (no cuenta congelaciones viejas)
        const s = stormTrack(p, 'k_perpetua');
        if (!s) return;
        const st = powerState(p, 'k_perpetua');
        const c = s.center();
        for (const e of list) {
          if (!insideR(e.pos, c, s.radius + 0.5 * (e.def?.scale || 1))) continue;
          const add = Math.min(T.perpetuaStep * rankOf(p, 'k_perpetua'), T.perpetuaMax - st.ext);
          if (!(add > 1e-9)) return;
          st.acc += add;
          const pulses = Math.floor(st.acc / s.interval + 1e-9);
          if (pulses > 0) { s.left += pulses; st.acc -= pulses * s.interval; }
          st.ext += add;
        }
      },
    },
    // i25 Era Glacial (final): al congelar a un enemigo, se congelan todos los que tengan capas a 5 m
    // (una vez cada 6 s; rangos 2–3: tv.freezeDur del nodo)
    k_era_glacial: {
      name: 'Era Glacial', desc: 'Al congelar a un enemigo, se congelan todos los que tengan capas cerca.',
      state: () => ({ readyAt: 0 }),
      onTick(g, p) {
        const st = powerState(p, 'k_era_glacial');
        const e = freezesNow(g, p)[0];               // sondeo en cada tic: lo congelado en la espera no cuenta luego
        if (now(p) < st.readyAt - 1e-9 || !e) return;
        st.readyAt = now(p) + T.eraCd;
        for (const o of alivesNear(g, e.pos, T.eraR, e)) if (layersOf(p, o) >= 1) o.applyCC('freeze', freezeBase(), { src: p });
        ring(g, e.pos, T.eraR, 0xbfeaff);
      },
    },
    // i26 Cero Absoluto (final): hacer añicos a un Congelado hace un 300 % del arma extra y recarga
    // la Lanza (rangos 2–3: stats.critDmg del nodo)
    k_cero: {
      name: 'Cero Absoluto', desc: 'Hacer añicos a un Congelado hace mucho daño extra y recarga la Lanza de Hielo.',
      procs: true,
      onHit(g, p, e, hit) {
        if (hit?.source !== 'power:k_ruptura' || !e) return;
        dealProcDamage(g, e, p.avgHit(T.ceroCoef, p.resolved?.k_lanza?.addPct || 0), { source: 'power:k_cero', skill: 'k_lanza', elem: 'frost', tags: new Set(['frost']) });
        g.reduceCooldown?.(p, 'k_lanza', Infinity);
      },
    },
    // i27 Invierno Eterno (final): la Tormenta no se acaba mientras haya un Congelado dentro (hasta
    // 20 s; rangos 2–3: mod m_u_tormenta dmg del nodo)
    k_eterno: {
      name: 'Invierno Eterno', desc: 'La Tormenta Glacial no se acaba mientras haya un enemigo Congelado dentro.',
      onTick(g, p) {
        const s = stormTrack(p, 'k_eterno');
        if (!s || s.left > 1 || now(p) - powerState(p, 'k_eterno').t0 >= T.eternoMax - s.interval) return;
        if (enemiesIn(g, s.center(), s.radius).some(frozen)) s.left += 1;
      },
    },
    // i28 Corazón del Invierno (ápice, 4 rangos): 1) congelar a un jefe (llenar sus capas) le llena 20
    // de Quebranto · 2) matar a un Congelado da 10 de maná · 3) bastan 4 capas (máximo −1) · 4) cada
    // 15 congelaciones, la Tormenta Glacial sola y gratis
    k_corazon_invierno: {
      name: 'Corazón del Invierno', desc: 'Congelar jefes los quiebra; los Congelados dan maná; congelas antes; la Tormenta se lanza sola.',
      state: () => ({ n: 0 }),
      stats(p) { return rankOf(p, 'k_corazon_invierno') >= 3 ? { 'gaugeMax:escarcha': -1 } : {}; },
      onGauge(g, p, id, ev, n, e) {
        if (id !== 'escarcha' || ev !== 'full' || !isBoss(e)) return;
        e.addStagger?.(T.corazonStagger, p);
        countFreezes(g, p, 1);
      },
      onKill(g, p, e, kill) {
        if (rankOf(p, 'k_corazon_invierno') >= 2 && (kill?.status?.frozen || (e.frozenT || 0) > 0)) g.gainResource?.(p, T.corazonMana);
      },
      onTick(g, p) { const k = freezesNow(g, p).length; if (k) countFreezes(g, p, k); },
    },

    // ---------------------------------------------------- ARCANISTA 2g (§5.3)
    // a0 Cargas Arcanas (clave) es la mecánica: js/mech-maga.js da, gasta y pierde las Cargas
    // a5 Rebote Cargado: cada enemigo que alcanza el Orbe Arcano (sus descargas o su golpe de vuelta) da
    // 1 Carga, una vez por orbe (lanzamiento)
    a_rebote_cargado: {
      name: 'Rebote Cargado', desc: 'Cada enemigo que alcanzan las descargas del Orbe Arcano te da 1 Carga.',
      state: () => ({ seen: new WeakSet() }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'a_orbe') powerState(p, 'a_rebote_cargado').seen = new WeakSet(); },
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'a_orbe' || hit.proc || hit.dot || !e) return;
        const st = powerState(p, 'a_rebote_cargado');
        if (st.seen.has(e)) return;
        st.seen.add(e);
        gainGauge(p, 'cargas', 1);
      },
    },
    // a6 Sello Cargado: dentro de tu Sello, el Orbe y el Desgarro dan 1 Carga por golpe, como mucho 1
    // cada 0,5 s (el Orbe descarga cada 0,25 s a 2 enemigos y el Desgarro golpea cada 0,25 s)
    a_sello_cargado: {
      name: 'Sello Cargado', desc: 'Dentro de tu Sello del Archimago, el Orbe y el Desgarro te dan Cargas al golpear.',
      state: () => ({ at: -9 }),
      onHit(g, p, e, hit) {
        if ((hit?.skill !== 'a_orbe' && hit?.skill !== 'm_u_desgarro') || hit.proc || hit.dot || !inOwnSeal(g, p)) return;
        const st = powerState(p, 'a_sello_cargado');
        if (now(p) - st.at < T.selloCargadoIcd - 1e-9) return;
        st.at = now(p);
        gainGauge(p, 'cargas', 1);
      },
    },
    // a7 Grieta Abierta: al terminar el Desgarro, la grieta queda 1 + rango s (40 % por segundo) donde
    // estaba la grieta del haz, donde apuntabas (st.at: la anota desgarro_canal al acabar, antes de este ⑭)
    a_grieta: {
      name: 'Grieta Abierta', desc: 'Al terminar el Desgarro Arcano, la grieta se queda abierta y sigue dañando.',
      state: () => ({ at: null }),
      onSkillEnd(g, p, sk, end) {
        // un Desgarro soltado antes de su primer golpe no deja grieta (S-maga)
        if (sk?.id !== 'm_u_desgarro' || end?.kind !== 'channel' || !(end.ticks > 0)) return;
        const st = powerState(p, 'a_grieta');
        const pos = st.at || p.pos;
        st.at = null;
        openRift(g, p, pos, T.grietaBase + rankOf(p, 'a_grieta'), T.grietaCoef);
      },
    },
    // a8A Rayo Doble: un Rayo con 4 Cargas se repite al 50 % (con las mismas Cargas)
    a_rayo_doble: {
      name: 'Rayo Doble', desc: 'Un Rayo con 4 Cargas se lanza dos veces; la copia hace el 50 %.',
      priority: -1,
      afterCast(g, p, cast) {
        const n = spentCharges(p);
        if (cast?.sk?.id === 'rayo' && n >= T.dobleNeed) echoCast(g, p, cast, T.dobleCopy, 0.25, { n });
      },
    },
    // a8B Rayo Recargado: cada enemigo DISTINTO que alcanza el Rayo devuelve 1 Carga (hasta 2), tras
    // gastarlas. Con Haz Concentrado cuenta enemigos, no tics (auditoría: un haz a un solo enemigo daba 2)
    a_rayo_recargado: {
      name: 'Rayo Recargado', desc: 'Cada enemigo que atraviesa el Rayo te devuelve 1 Carga (hasta 2).',
      priority: -1,
      state: () => ({ seen: new Set() }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'rayo') powerState(p, 'a_rayo_recargado').seen = new Set(); },
      onHit(g, p, e, hit) { if (hit?.skill === 'rayo' && !hit.proc && !hit.dot && !hit.echo && e) powerState(p, 'a_rayo_recargado').seen.add(e); },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'rayo') return;
        const st = powerState(p, 'a_rayo_recargado');
        const n = Math.min(T.recargadoMax, st.seen.size);
        st.seen = new Set();
        if (n > 0) gainGauge(p, 'cargas', n);
      },
    },
    // a9A Orbe Cargado: el Orbe hace +20 % por Carga que tienes (sin gastarlas)
    a_orbe_cargado: {
      name: 'Orbe Cargado', desc: 'El Orbe Arcano hace más daño por cada Carga que tienes, sin gastarlas.',
      condAdd(p, e, hit) { return hit?.skill === 'a_orbe' ? T.orbeCargadoPct * charges(p) : 0; },
    },
    // a9B Orbe Atrayente: al llegar al final de su camino (se detiene, choca con la pared o, Orbe Veloz,
    // da la vuelta) el Orbe hace un vórtice: atrae hacia sí a los enemigos a 4 m (los deja a 1 m; a los
    // jefes, Quebranto por desplazar). Una vez por orbe; lo mira a 10 Hz (stopAt de magaOrbs)
    a_orbe_atrae: {
      name: 'Orbe Atrayente', desc: 'Al detenerse, el Orbe Arcano atrae hacia sí a los enemigos cercanos.',
      state: () => ({ seen: new WeakSet() }),
      onTick(g, p) {
        const st = powerState(p, 'a_orbe_atrae');
        for (const o of magaOrbs(p)) {
          if (o.stopAt == null || st.seen.has(o)) continue;
          st.seen.add(o);
          const c = o.stopPos;
          for (const e of alivesNear(g, c, T.atraeR + 0.5)) {
            const d = Math.sqrt(dist2(e.pos, c));
            if (d > T.atraeKeep) e.displace?.(at(e.pos, c.x, c.z, 0), d - T.atraeKeep, { toward: true, src: p });
          }
          ring(g, c, T.atraeR, o.color);
        }
      },
    },
    // a10A Desgarro Fijo: si no te mueves, el Desgarro hace +8 % cada medio segundo (hasta +48 %)
    a_desgarro_fijo: {
      name: 'Desgarro Fijo', desc: 'Si no te mueves, el Desgarro Arcano hace cada vez más daño.',
      state: () => ({ n: 0, acc: 0, x: null, z: null }),
      onTick(g, p, dt) {
        const st = powerState(p, 'a_desgarro_fijo');
        if (!channelOf(g, p, 'm_u_desgarro')) { st.n = 0; st.acc = 0; st.x = null; return; }
        if (st.x != null && (Math.abs(p.pos.x - st.x) > 0.05 || Math.abs(p.pos.z - st.z) > 0.05)) { st.n = 0; st.acc = 0; }
        st.x = p.pos.x; st.z = p.pos.z;
        st.acc += dt;
        while (st.acc >= 0.5 - 1e-9) { st.acc -= 0.5; st.n = Math.min(T.fijoMax, st.n + 1); }
      },
      condAdd(p, e, hit) { return hit?.skill === 'm_u_desgarro' ? T.fijoPct * powerState(p, 'a_desgarro_fijo').n : 0; },
    },
    // a10B Desgarro Voraz: cada golpe del Desgarro da 1,5 de maná por enemigo que atraviesa (hasta 3
    // enemigos por golpe: el haz ancho toca a muchos) y 1 Carga por segundo de canal
    a_desgarro_voraz: {
      name: 'Desgarro Voraz', desc: 'El Desgarro Arcano te da maná por golpe y Cargas mientras lo canalizas.',
      state: () => ({ acc: 0, t: -9, n: 0 }),
      onHit(g, p, e, hit) {
        if (hit?.skill !== 'm_u_desgarro' || hit.proc || hit.dot) return;
        const st = powerState(p, 'a_desgarro_voraz');
        if (now(p) - st.t > 1e-6) { st.t = now(p); st.n = 0; }
        if (++st.n <= T.vorazMaxN) g.gainResource?.(p, T.vorazMana);
      },
      onTick(g, p, dt) {
        const st = powerState(p, 'a_desgarro_voraz');
        if (!channelOf(g, p, 'm_u_desgarro')) { st.acc = 0; return; }
        st.acc += dt;
        if (st.acc < T.vorazEvery - 1e-9) return;
        st.acc = 0;
        gainGauge(p, 'cargas', 1);
      },
    },
    // a12 Inercia: cada descarga del Orbe que golpea recarga 0,1 × rango s del Rayo, hasta 1 × rango s por
    // orbe (zapHits de magaOrbs, a 10 Hz; lo que falte del último tramo se cuenta al recogerlo)
    a_inercia: {
      name: 'Inercia', desc: 'Cada descarga del Orbe Arcano que golpea recarga parte del Rayo.',
      state: () => ({ done: new WeakMap() }),
      onTick(g, p) { for (const o of magaOrbs(p)) inertia(g, p, o); },
      afterCast(g, p, cast) { if (cast?.sk?.id === 'a_orbe') for (const o of cast.orbs || []) inertia(g, p, o); },
    },
    // a14 Maná Inagotable: canalizando el Desgarro recuperas un 2 %/s. No anula el gasto de Grieta
    // Eterna (doc 2g §12: ese 3 % se calibra para que la combinación dure 8–12 s)
    a_mana_inagotable: {
      name: 'Maná Inagotable', desc: 'Mientras canalizas el Desgarro Arcano recuperas maná.',
      onTick(g, p, dt) { if (channelOf(g, p, 'm_u_desgarro')) g.gainResource?.(p, (p.stats?.maxMP || 0) * T.inagotablePct / 100 * dt); },
    },
    // a15A Desplazamiento: un golpe de más del 20 % de tu vida te teletransporta 5 m sin hacerte daño
    // (cada 30 s)
    a_desplazamiento: {
      name: 'Desplazamiento', desc: 'Un golpe muy fuerte te teletransporta lejos y no te hace daño. Una vez cada 30 s.',
      state: () => ({ readyAt: 0 }),
      onDamaged(g, p, info) {
        const st = powerState(p, 'a_desplazamiento');
        if (!info || now(p) < st.readyAt - 1e-9 || !(info.amount > (p.stats?.maxHP || 0) * T.desplazaPct / 100)) return;
        st.readyAt = now(p) + T.desplazaCd;
        info.amount = 0;
        const src = info.src?.pos;
        let dx = src ? p.pos.x - src.x : -Math.sin(p.group?.rotation?.y || 0), dz = src ? p.pos.z - src.z : -Math.cos(p.group?.rotation?.y || 0);
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        ring(g, p.pos, 1, 0xc8a0ff);
        for (let k = 0; k < T.desplazaDist / 0.25; k++) {
          const nx = p.pos.x + dx * 0.25, nz = p.pos.z + dz * 0.25;
          if (g.world?.grid && !g.world.grid.walkable(nx, nz)) break;
          p.pos.x = nx; p.pos.z = nz;
        }
        p.moveTarget = null;
        ring(g, p.pos, 1, 0xc8a0ff);
        g.ui?.spawnText?.(p.pos, '¡Desplazada!', 'txt-mana');
      },
    },
    // a16 Resonancia: con 4 Cargas no se pierden (js/mech-maga.js) y tienes +6 × rango % de crítico
    a_resonance: {
      name: 'Resonancia', desc: 'Con 4 Cargas, no se pierden y tienes más probabilidad de crítico.',
      condCrit(p) { return charges(p) >= TG().cargas.max ? TG().cargas.resonanceCrit * rankOf(p, 'a_resonance') : 0; },
    },
    // a17 Sello Viviente: el Sello del Archimago te sigue (la duración, mod del nodo)
    a_sello_sigue: {
      name: 'Sello Viviente', desc: 'El Sello del Archimago te sigue.',
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_sello') return;
        const f = sealOf(g, p).pop();
        if (f) f.follow = 'owner';
      },
    },
    // a18 Carga Final: un Rayo con 4 Cargas te devuelve 1 Carga por rango (después de gastarlas)
    a_carga_final: {
      name: 'Carga Final', desc: 'Un Rayo con 4 Cargas te devuelve Cargas.',
      priority: -1,
      afterCast(g, p, cast) {
        if (cast?.sk?.id === 'rayo' && spentCharges(p) >= T.cargaFinalNeed) gainGauge(p, 'cargas', rankOf(p, 'a_carga_final'));
      },
    },
    // a19 Satélite (M-01, propuesta del dueño): cada 3.er Orbe, al volver a ti, NO se absorbe (ni su Carga):
    // se queda girando a tu alrededor 8 s como un orbe pequeño (20 × rango % por golpe). ⑦ onCast marca
    // el lanzamiento (cast.orbit, lo lee orbEnd) y ③ afterCast (el Orbe ya volvió) lo pone en órbita
    a_satelite: {
      name: 'Satélite', desc: 'Cada 3.er Orbe Arcano, al volver, no se absorbe: se queda girando a tu alrededor.',
      state: () => ({ n: 0, sats: [] }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_orbe') return;
        const st = powerState(p, 'a_satelite');
        if (++st.n < T.sateliteEvery) return;
        st.n = 0;
        cast.orbit = { ...(cast.orbit || {}), satelite: true };
      },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_orbe' || !cast.orbit?.satelite || !(cast.orbs || []).some(o => o.orbited)) return;
        powerState(p, 'a_satelite').sats.push({ until: now(p) + T.sateliteT, ang: rng(p) * Math.PI * 2, hit: new WeakMap() });
      },
      onTick(g, p, dt) {
        const st = powerState(p, 'a_satelite');
        st.sats = st.sats.filter(s => s.until > now(p) + 1e-9);
        if (!st.sats.length) return;
        const amt = p.avgHit(T.satelitePct * rankOf(p, 'a_satelite') / 100, p.resolved?.a_orbe?.addPct || 0);
        for (const s of st.sats) {
          s.ang += dt * Math.PI * 2 / 1.5;
          const c = { x: p.pos.x + Math.cos(s.ang) * T.sateliteOrbit, z: p.pos.z + Math.sin(s.ang) * T.sateliteOrbit };
          for (const e of alivesNear(g, c, T.sateliteR + 0.5)) {
            if ((s.hit.get(e) || -9) > now(p) - T.sateliteHitCd + 1e-9) continue;
            s.hit.set(e, now(p));
            dealProcDamage(g, e, amt, { source: 'power:a_satelite', skill: 'a_orbe', elem: 'arcane', tags: new Set(['arcane']) });
          }
          fx(g, glow(0xc8a0ff, 0.22, 0.25), c, 1.0);
        }
      },
    },
    // a21 Doble Grieta: si lanzas el Rayo durante el Desgarro, se abre una segunda grieta al 50 %
    // donde apuntas mientras dure el canal (el Rayo sale sobre el canal sin cortarlo: cola W2d). El
    // 50 % es del daño por segundo del canal en curso: el golpe de SU perfil (con rango, anotado en
    // su ⑦ onCast) entre su intervalo
    a_doble_grieta: {
      name: 'Doble Grieta', desc: 'Si lanzas el Rayo durante el Desgarro Arcano, se abre una segunda grieta.',
      state: () => ({ prof: null }),
      onCast(g, p, cast) {
        const st = powerState(p, 'a_doble_grieta');
        if (cast?.sk?.id === 'm_u_desgarro') { st.prof = cast.prof || null; return; }
        const ch = channelOf(g, p, 'm_u_desgarro');
        if (cast?.sk?.id !== 'rayo' || !ch) return;
        const at0 = cast.enemy?.alive ? cast.enemy.pos : cast.target;
        if (!at0) return;
        const left = Math.max(0.5, ch.left || 0);
        const pr = desgarroProf(p, st.prof, p.resolved?.m_u_desgarro);
        openRift(g, p, at0, left, pr.coef / (ch.interval || 0.5) * T.dobleCopy, pr);
      },
    },
    // a22 Cargas Desbordadas: guardas 1 Carga más por rango (las que pasan de 4 dan el doble: el indicador)
    a_desbordadas: {
      name: 'Cargas Desbordadas', desc: 'Puedes guardar más Cargas; las que pasan de 4 dan el doble al Rayo.',
      stats(p) { return { 'gaugeMax:cargas': rankOf(p, 'a_desbordadas') }; },
    },
    // a23 Orbe Múltiple: cada 3.er Orbe sale con 1 orbe más por rango (40 % cada uno), en abanico: orbes
    // PEQUEÑOS que descargan a 2,5 m (setSmall de sus unidades)
    a_orbe_multiple: {
      name: 'Orbe Múltiple', desc: 'Cada 3.er Orbe Arcano sale con orbes más pequeños.',
      state: () => ({ n: 0 }),
      onCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_orbe' || !cast.target) return;
        const st = powerState(p, 'a_orbe_multiple');
        if (++st.n < T.multipleEvery) return;
        st.n = 0;
        const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
        const d = Math.max(2, Math.hypot(cast.target.x - p.pos.x, cast.target.z - p.pos.z));
        const k = rankOf(p, 'a_orbe_multiple');
        for (let i = 1; i <= k; i++) {
          const a = base + T.multipleSpread * Math.ceil(i / 2) * (i % 2 ? 1 : -1);
          echoCast(g, p, cast, T.multipleCopy, 0.05 * i, { pos: { x: p.pos.x + Math.sin(a) * d, z: p.pos.z + Math.cos(a) * d },
            then: c => { for (const o of c.orbs || []) o.setSmall?.(); } });
        }
      },
    },
    // a24 Fuente de Maná: mientras canalizas, cada segundo 1 Carga y +5 × rango % de daño (hasta 3 veces)
    a_fuente: {
      name: 'Fuente de Maná', desc: 'Mientras canalizas, ganas Cargas y daño cada segundo.',
      state: () => ({ acc: 0, n: 0 }),
      onTick(g, p, dt) {
        const st = powerState(p, 'a_fuente');
        if (!channelOf(g, p)) { st.acc = 0; st.n = 0; return; }
        st.acc += dt;
        if (st.acc < T.fuenteEvery - 1e-9) return;
        st.acc = 0;
        gainGauge(p, 'cargas', 1);
        st.n = Math.min(T.fuenteMax, st.n + 1);
        const pct = T.fuentePct * rankOf(p, 'a_fuente') * st.n;
        p.addBuff('a_fuente', { dmgPct: pct }, T.fuenteEvery + 0.3, { name: 'Fuente de Maná', icon: '💧', desc: `+${pct} % de daño` });
      },
    },
    // a25 Tormenta de Cargas (final): al gastar 4 o más, el Rayo se repite 2 veces al 50 % en 1,5 s
    // (con las mismas Cargas; rangos 2–3: mod rayo dmg del nodo)
    a_tormenta_cargas: {
      name: 'Tormenta de Cargas', desc: 'Al gastar 4 o más Cargas, el Rayo se lanza tres veces.',
      priority: -1,
      afterCast(g, p, cast) {
        const n = spentCharges(p);
        if (cast?.sk?.id !== 'rayo' || n < T.tormentaNeed) return;
        for (let i = 1; i <= 2; i++) echoCast(g, p, cast, T.tormentaCopy, T.tormentaGap * i, { n });
      },
    },
    // a26 Constelación (final; M-01, propuesta del dueño): tus Orbes, al volver, NO se absorben (ni su
    // Carga): se quedan 8 s girando a tu alrededor (hasta 3) y disparan al más cercano cada segundo (40 %;
    // rangos 2–3: mod a_orbe dmg del nodo). ⑦ marca el lanzamiento; ③ afterCast, uno por orbe que volvió
    a_constelacion: {
      name: 'Constelación', desc: 'Tus Orbes Arcanos, al volver, no se absorben: se quedan girando a tu alrededor y disparan al enemigo más cercano.',
      state: () => ({ orbs: [] }),
      onCast(g, p, cast) { if (cast?.sk?.id === 'a_orbe') cast.orbit = { ...(cast.orbit || {}), constelacion: true }; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'a_orbe' || !cast.orbit?.constelacion) return;
        const st = powerState(p, 'a_constelacion');
        const n = (cast.orbs || []).filter(u => u.orbited).length;
        for (let i = 0; i < n; i++) st.orbs.push({ until: now(p) + T.constelT, acc: 0, ang: rng(p) * Math.PI * 2 });
        while (st.orbs.length > T.constelMax) st.orbs.shift();
      },
      onTick(g, p, dt) {
        const st = powerState(p, 'a_constelacion');
        st.orbs = st.orbs.filter(o => o.until > now(p) + 1e-9);
        if (!st.orbs.length) return;
        const amt = p.avgHit(T.constelCoef, p.resolved?.a_orbe?.addPct || 0);
        for (const o of st.orbs) {
          o.ang += dt * Math.PI * 2 / 3;
          o.acc += dt;
          const c = { x: p.pos.x + Math.cos(o.ang) * T.constelOrbit, z: p.pos.z + Math.sin(o.ang) * T.constelOrbit };
          fx(g, glow(0xb388ff, 0.3, 0.3), c, 1.2);
          if (o.acc < T.constelEvery - 1e-9) continue;
          o.acc = 0;
          const tgt = alivesNear(g, c, T.constelRange).sort(byDist(c))[0];
          if (!tgt) continue;
          dealProcDamage(g, tgt, amt, { source: 'power:a_constelacion', skill: 'a_orbe', elem: 'arcane', tags: new Set(['proj', 'arcane']) });
          beam(g, at(p.pos, c.x, c.z, 1.2), tgt.pos, 0xb388ff, 0.15);
        }
      },
    },
    // a27 Grieta Eterna (final): el Desgarro dura mientras tengas maná: gasta un 3 %/s siempre,
    // también con Maná Inagotable (que solo devuelve su 2 %/s); sin maná, el canal acaba a su hora.
    // Rangos 2–3: mod m_u_desgarro dmg del nodo
    a_grieta_eterna: {
      name: 'Grieta Eterna', desc: 'El Desgarro Arcano dura mientras tengas maná.',
      onTick(g, p, dt) {
        const ch = channelOf(g, p, 'm_u_desgarro');
        if (!ch) return;
        if (!drainResource(p, (p.stats?.maxMP || 0) * T.eternaDrain / 100, dt)) return;
        // con dos golpes o menos por delante, uno más (mientras quede maná)
        const gap = ch.interval || 0.5;
        if ((ch.left || 0) <= 2 * gap + 1e-9 && p.mp > 0) g.extendChannel?.(p, gap);
      },
    },
    // a28 Singularidad (ápice, 4 rangos): 1) un Rayo con 4 Cargas abre una grieta 3 s en el objetivo
    // (50 %/s) · 2) matar a un élite da 4 Cargas · 3) las Cargas no se pierden (tv.chargeKeep del nodo,
    // mech-maga.js) · 4) cada 20 Cargas gastadas, un Desgarro propio de 2 s (golpes reales)
    a_singularidad: {
      name: 'Singularidad', desc: 'El Rayo cargado abre grietas; los élites dan Cargas; no se pierden; el Desgarro se lanza solo.',
      state: () => ({ spent: 0, prof: null }),
      priority: -1,
      // perfil del último Desgarro (singularBeam, si la caché de resolveSkill está vacía)
      onCast(g, p, cast) { if (cast?.sk?.id === 'm_u_desgarro') powerState(p, 'a_singularidad').prof = cast.prof || null; },
      afterCast(g, p, cast) {
        if (cast?.sk?.id !== 'rayo') return;
        const n = spentCharges(p);
        if (n >= 4) {
          const tgt = cast.enemy?.alive ? cast.enemy.pos : cast.target;
          if (tgt) openRift(g, p, tgt, T.singGrietaT, T.singGrietaCoef);
        }
        if (rankOf(p, 'a_singularidad') < 4 || !(n > 0)) return;
        const st = powerState(p, 'a_singularidad');
        st.spent += n;
        if (st.spent < T.singEvery) return;
        st.spent -= T.singEvery;
        singularBeam(g, p);
      },
      onKill(g, p, e) { if (rankOf(p, 'a_singularidad') >= 2 && isElite(e)) gainGauge(p, 'cargas', T.singElite); },
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
export function magaSkillBehaviors() {
  const T = magaTuning();
  const B = {
    // ---- Arcanista: Orbe Arcano, Haz Concentrado y Desgarro canalizado (S-maga) ----
    // Orbe Arcano (insignia): 1 + proj unidades en abanico (motor del Orbe, arriba). No impacta, así
    // que no retiene el Dardo mientras vuela (el bloqueo de acción de una principal con «proj» espera a
    // su impacto): queda el del GCD. Termina (③ afterCast) cuando vuelven todas
    orbe_arcano: {
      params: ['minRange', 'zap', 'park', 'back', 'twin'],
      cast(g, p, prof, cast) {
        const { ctx } = cast;
        p.faceToward?.(cast.target);
        p.swing = 1;
        if (!cast.echo) p.actionLockT = Math.min(p.actionLockT || 0, Math.max(0, p.gcdT || 0));
        const n = Math.max(1, (prof.count || 1) + (prof.proj || 0));
        const spread = prof.spread || 0.35;
        const base = Math.atan2(cast.target.x - p.pos.x, cast.target.z - p.pos.z);
        const dist = Math.max(0.5, Math.hypot(cast.target.x - p.pos.x, cast.target.z - p.pos.z));
        const from = { x: p.pos.x, z: p.pos.z };
        let pending = n;
        const onDone = () => { if (--pending === 0) cast.done(ctx.res); };
        const units = [];
        for (let i = 0; i < n; i++) {
          const a = base + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
          units.push(launchOrb(g, p, ctx, { from, toward: { x: from.x + Math.sin(a) * dist, z: from.z + Math.cos(a) * dist }, echo: !!cast.echo, onDone }));
        }
        ctx.cast.orbs = units;
        fx(g, ctx.fx?.aura, handAt(p), 1.2);
        return undefined;   // diferido: termina al recoger (o apagarse) la última unidad
      },
    },
    // Haz Concentrado (rayo_ii): el tic del canal sin fin. El 1.º gasta TODAS las Cargas (su bono, el
    // condAdd del indicador con st.beamN, vale todo el canal; soltar antes no gasta nada: el motor
    // devuelve el coste) y devuelve su maná; el haz vivo crece con ellas (×2 al tope de la rampa, el
    // motor). Cada tic: el objetivo pegajoso (como el canal genérico) con coef × rampa, su golpe y el
    // zumbido continuo (fx.tickSfx, uno por tic)
    v_haz_concentrado: {
      tick(g, p, inst) {
        const ctx = inst.ctx, prof = ctx.prof, C = TG().cargas;
        if (inst.tickN === 1) {
          const st = gaugeState(p, 'cargas');
          const n = st ? Math.floor(st.v || 0) : 0;
          if (st) st.beamN = n > 0 && spendGauge(p, 'cargas', st.v) ? n : 0;
          if (st?.beamN > 0) g.gainResource?.(p, C.manaPerCharge * st.beamN);
          const k = st?.beamN || 0;
          if (k > 0 && inst.beam && inst.beamBase) {
            inst.beamBase = { width: inst.beamBase.width * (1 + T.hazWidthPer * k), core: inst.beamBase.core * (1 + T.hazWidthPer * k) };
            inst.beam.setWidth(inst.beamBase.width, inst.beamBase.core);
            inst.beam.setIntensity(Math.min(T.hazGlowMax, 1 + T.hazGlowPer * k));
          }
        }
        if (ctx.fx?.tickSfx) g.sfx?.(ctx.fx.tickSfx);
        const range = Math.max(2, prof.range || 15);
        let e = inst.target;
        if (!e || !e.alive || !insideR(e.pos, p.pos, range + 1)) e = inst.target = g.nearestEnemy?.(range, ctx.target) || g.nearestEnemy?.(range) || null;
        if (!e) return;
        p.faceToward?.(e.pos);
        const { dmg, crit } = p.rollDamage(ctx.coef * (inst.rampMul || 1), prof.critBonus || 0, prof.addPct || 0, e, ctx.hitInfo);
        ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
        p.onDealHit?.();
        fx(g, ctx.fx?.impact, e.pos, 1.0);
        if ((gaugeState(p, 'cargas')?.beamN || 0) >= TG().cargas.max && !g.settings?.reduceMotion) g.addShake?.(T.hazShake);
      },
    },
    // Desgarro Arcano canalizado (M-12): cada tic, un haz de `width` m hacia la mira (recortado por la
    // pared) que golpea a TODOS los que atraviesa con coef × rampa; abre una grieta en el suelo, en el haz
    // donde apuntas, y sacude un poco. La Carga por golpe la da el indicador (una por tic). El halo del haz vivo
    // mide lo que golpea: el motor lo ensancharía ×2 con la rampa; aquí se queda y crecen el núcleo (×2
    // al tope) y el brillo
    desgarro_canal: {
      tick(g, p, inst, interval) {
        const ctx = inst.ctx, prof = ctx.prof;
        const aim = g.input?.mouseWorld || ctx.target;
        const { dir, end, len } = riftLine(g, p, aim, Math.max(2, prof.range || 10));
        p.faceToward?.(at(p.pos, p.pos.x + dir.x, p.pos.z + dir.z));
        const list = riftTargets(g, p, end, prof.width || ctx.sk?.width || 2.5);
        const coef = ctx.coef * (inst.rampMul || 1);
        for (const e of list) {
          const { dmg, crit } = p.rollDamage(coef, prof.critBonus || 0, prof.addPct || 0, e, ctx.hitInfo);
          ctx.hit(e, e.takeDamage(dmg, crit, ctx.dmgOpts) || 0);
          fx(g, ctx.fx?.impact, e.pos, 1.0);
        }
        if (list.length) p.onDealHit?.();
        if (inst.beam && inst.beamBase) {
          const k = Math.min(1, (inst.rampPct || 0) / Math.max(1, prof.rampMax || 100));
          inst.beam.setWidth(inst.beamBase.width, inst.beamBase.core * (1 + k));
          inst.beam.setIntensity(1 + T.riftGlowTop * k);
        }
        // la grieta se abre en el haz donde apuntas (la mira sobre su eje, hasta su final: el haz sigue
        // hasta 10 m y la manada suele estar antes), alineada con él. Dura riftScarKeep golpes y cada golpe
        // la renueva: aunque falte el fin del canal (resetCastState al morir), se apaga sola
        const d = Math.max(Math.min(T.riftScarMin, len), Math.min(len, ((aim?.x ?? end.x) - p.pos.x) * dir.x + ((aim?.z ?? end.z) - p.pos.z) * dir.z));
        const spot = { x: p.pos.x + dir.x * d, z: p.pos.z + dir.z * d };
        const keep = T.riftScarKeep * (interval || inst.interval || 0.25);
        const ang = Math.atan2(dir.z, dir.x);
        const scar = inst._scar;
        if (!scar || scar.dead) {
          inst._scar = g.spawnField?.('a_desgarro_grieta', { pos: spot, radius: T.riftScarR, dur: keep, owner: p,
            data: { color: ctx.color ?? 0xd28cff, ang, len: T.riftScarLen, wid: T.riftScarWid } }) || null;
        } else { scar.pos.x = spot.x; scar.pos.z = spot.z; scar.data.ang = ang; scar.t = scar.dur = keep; }
        inst._spot = spot;
        if (inst.tickN % 2 === 1) fx(g, ctx.fx?.extra, spot, 0.4);
        if (ctx.fx?.tickSfx) g.sfx?.(ctx.fx.tickSfx);
        if (!g.settings?.reduceMotion) g.addShake?.(T.riftShake * (1 + (inst.rampPct || 0) / 100));
      },
      // fin del canal (antes del ⑭ onSkillEnd): Grieta Abierta (a7) se queda donde estaba la grieta
      end(g, p, inst) {
        if (inst._spot) powerState(p, 'a_grieta').at = inst._spot;
        if (inst._scar && !inst._scar.dead) g.expireField?.(inst._scar);
        inst._scar = null;
      },
    },
    // ---- activas de talento de la clase (c11A, c17A, c22A) ----
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
    // Bloque de Hielo: inmune 4 s, sin moverte ni atacar; la esquiva lo rompe antes. Quieta por
    // p.setMoveMul (§3.7: multiplicador 0 mientras dura), no clavando la posición
    m_t_bloque: {
      cast(g, p, prof, cast) {
        const { ctx, sk } = cast;
        const dur = prof.dur || sk.dur || 4;
        const until = g.timers.now + dur;
        const Bk = { on: true };
        p._mgBlock = Bk;
        p.grantInvuln(dur);
        p.castLock = Math.max(p.castLock || 0, dur);
        p.setMoveMul('m_t_bloque', 0, dur);
        p.moveTarget = p.attackTarget = null;
        const end = (broken) => {
          Bk.on = false;
          if (p._mgBlock === Bk) p._mgBlock = null;
          p.castLock = 0;
          p.clearMoveMul('m_t_bloque');
          if (broken) { p.invulnT = 0; g.ui?.spawnText?.(p.pos, '¡Hielo roto!', 'txt-mana'); }
        };
        const step = () => {
          if (!Bk.on || p._mgBlock !== Bk) return;
          if (!p.alive || g.timers.now >= until - 1e-9) { end(false); return; }
          if (p.dodgeT > 0) { end(true); return; }
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
  };
  return B;
}

// ============================================================
// CAMPOS DE SUELO
// ============================================================
function enemyR(e) { return 0.45 * (e?.def?.scale || 1); }
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
    // Muro de Fuego (campo en línea que deja la variante Muro de Llamas de la Estela Ígnea, forja)
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
    // ---- Paso 2g: campos de las especializaciones ----
    // s24 Cráter: marca el suelo 4 s (el +% de Fuego y la segunda explosión los mira el poder p_crater)
    p_crater: {
      name: 'Cráter',
      init(f) { f.fxAcc = 0; },
      tick(g, f, dt) {
        f.fxAcc += dt;
        if (f.fxAcc < 0.6) return;
        f.fxAcc = 0;
        ring(g, f.pos, f.radius * 0.9, 0xff5a1f);
      },
      render(g, f) {
        const d = decal(g, f, { color: 0xff5a1f, opacity: 0.32, disc: true });
        if (d) d.material.opacity = 0.18 + 0.14 * Math.max(0, Math.min(1, f.t / (f.dur || 1)));
      },
    },
    // i14 Suelo Helado: ralentiza un 40 % (tic 0,5 s) y pone 1 capa de Escarcha por segundo a quien lo pisa
    k_suelo: {
      name: 'Suelo Helado',
      init(f) { f.acc = 0; f.layerAcc = 0; },
      tick(g, f, dt) {
        const p = f.owner;
        f.acc += dt; f.layerAcc += dt;
        if (f.acc >= 0.5 - 1e-9) {
          f.acc = 0;
          for (const e of enemiesIn(g, f.pos, f.radius)) e.applyCC?.('slow', slowDur(p, 0.7), { pct: T.sueloSlowPct, src: p });
        }
        if (f.layerAcc >= 1 - 1e-9) {
          f.layerAcc = 0;
          for (const e of enemiesIn(g, f.pos, f.radius)) gainGauge(p, 'escarcha', 1, e);
        }
      },
      render(g, f) { decal(g, f, { color: 0x9fe3ff, opacity: 0.3, disc: true }); },
    },
    // Desgarro Arcano (M-12): la grieta del suelo, en el haz donde apuntas, mientras se canaliza (solo se ve: el
    // daño es el del haz). La mueve, la orienta y la renueva desgarro_canal en cada tic; la apaga al acabar
    a_desgarro_grieta: {
      name: 'Grieta del Desgarro',
      init(f) { f.acc = 0; },
      tick(g, f, dt) { f.acc += dt; },
      render(g, f) {
        const d = riftDecal(g, f);
        if (!d) return;
        const k = Math.abs(Math.sin(f.acc * 6));
        d.userData.glow.material.opacity = 0.45 + 0.25 * k;
        d.userData.crack.material.opacity = 0.8 + 0.2 * k;
      },
    },
    // a7 / a21 / a28 Grieta arcana: daña cada 0,5 s (data.dps) a quien está dentro; daño de campo
    a_grieta: {
      name: 'Grieta Arcana',
      init(f) { f.acc = 0; },
      tick(g, f, dt) {
        f.acc += dt;
        if (f.acc < 0.5 - 1e-9) return;
        f.acc = 0;
        const per = Math.max(1, Math.round((f.data.dps || 0) * 0.5));
        for (const e of enemiesIn(g, f.pos, f.radius))
          e.takeDamage(per, false, { dot: true, source: 'field:a_grieta', skill: f.data.skill || null, elem: 'arcane', tags: new Set(['zone', 'arcane']) });
        ring(g, f.pos, f.radius, 0xd28cff);
      },
      render(g, f) {
        const d = decal(g, f, { color: 0xd28cff, opacity: 0.45, disc: true });
        if (d) d.material.opacity = 0.3 + 0.2 * Math.abs(Math.sin(f.t * 5));
      },
    },
  };
}

export function magaGauges() {
  return {};
}
