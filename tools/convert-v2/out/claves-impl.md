# Claves de `impl` y `k` fuera del vocabulario de verbos (§3.6)

> Generado por `tools/convert-v2/convert.mjs` (E0.4; tabla de W2 volcada en E1.5). Fuentes: maga (`docs/mockups/data/talents-v2-maga.js`, sha1 7801561901ba, «aprobado») · guerrero (`docs/mockups/data/talents-v2-guerrero.js`, sha1 b0f282184d7d, «diseño») · arquera (`docs/mockups/data/talents-v2-arquera.js`, sha1 76ae75357a1e, «diseño»).
> Las notas `impl`/`k` son texto libre: la lectura es heurística. Traducciones: tabla de alias de §3.6, tabla de W2 (`tools/convert-v2/claves-w2.mjs`,
> de `docs/paso2-claves-w2.md`) y vocabulario del juego: el vivo (`skill-defs.js`: `SKILL_KEYS`, `RETIRED_KEYS`) y el de la foto v1
> (`tools/convert-v2/juego-v1.json`, de antes de E1.5). «SIN TRADUCCIÓN» para al orquestador antes de E2.

**Resumen:** 38 alias con traducción · **0 SIN TRADUCCIÓN** · 20 canónicas nuevas de W2 · claves tv: 11 de clase, 0 para la cola W2, **0 sin decidir** · stats: 0 para la cola W2, **0 sin decidir** · 0 claves de definición para la cola W2 · 2 parámetros de definición de la clase · 12 ajustes de mecánica o aura · 4 campos nombrados · 39 canónicas de §3.5/§3.6 · 73 que ya existen en el juego.

## 1. Alias del mockup → clave canónica

| Clave del mockup | Traducción | Fuente | Dónde |
|---|---|---|---|
| `aftershocks` | repeat { n, every, coef, needPlanted } (mod repeatAdd) | §3.6 | guerrero:d9A |
| `bounce` | set: { bounces: n } (el Orbe lee prof.def.bounces) | W2 | maga:a_orbe.A |
| `charge.coefMax` | set: { 'charge.scale.coef.1': v } (coeficiente a carga completa de scale.coef [aMin, aMax]) | W2 | arquera:a_t_apuntado.B, arquera:a_u_celeste.B |
| `charge.fullCount` | charge.full.count (+ full.spread, full.coefMul) | W2 | arquera:a_t_apuntado.A |
| `chargeMul` | chargeSpeed (%) | §3.6 | arquera:a_f_rodilla.M, arquera:a_f_rodilla.A |
| `chargeT` | charge.max | §3.6 | guerrero:g_martillo.M |
| `decoy` | lure { radius, dur } | juego (RETIRED_KEYS) | arquera:a_u_zarzas.B |
| `detonatePct` | mod sobre mark.detonate.pct | §3.6 | guerrero:z1 |
| `dmg3` | mul: { 'steps.2.coef': × } (3.er paso del combo) | W2 | guerrero:g_rajar.A |
| `dr` | set: { 'buff.dr': v } (DR del buff; en una postura, stance.modes[i].stats.dr) | W2 | guerrero:g_u_ciudadela.A, arquera:a_f_rodilla.B |
| `follow:true` | follow: 'owner' | §3.6 | maga:m_u_supernova.A |
| `length` | wall.len | juego (RETIRED_KEYS) | maga:k_prision.B |
| `markCount` | mark.count | juego (RETIRED_KEYS) | arquera:a_f_rastreador.A |
| `markDur` | mark.dur (o mod markDur) | juego (RETIRED_KEYS) | guerrero:z4, guerrero:g_juicio.A |
| `markRadius` | mark.radius | juego (RETIRED_KEYS) | arquera:a_f_rastreador.A |
| `moveFree` | moveMul (moveFree:false → moveMul: 0) | §3.6 | guerrero:g_remolino.A |
| `moveSpd` | moveMul | §3.6 | guerrero:g_u_ciudadela.A |
| `moveWhileChannel` | moveMul | §3.6 | maga:m_u_desgarro.M |
| `moveWhileCharging` | charge.moveMul | §3.6 | guerrero:c9B |
| `perfectDmg` | perfectPct | §3.6 | guerrero:c9A |
| `recast.max` | recast.n (mod recastAdd) | §3.6 | arquera:v9B |
| `shieldManaPct` | mod buff (+% de escudo: el comportamiento de la Barrera multiplica shieldManaPct por prof.buffMul) | W2 | maga:c18 |
| `single` | radius 0 / splash 0 | juego (RETIRED_KEYS) | guerrero:g_juicio.A |
| `stats.regen` | stats.regenPct | W2 | maga:c15B |
| `stats.resMaxAdd` | stats.mp (recurso máximo plano) | W2 | guerrero:c15B |
| `target` | at: "enemy" | juego (RETIRED_KEYS) | arquera:a_u_zarzas.A |
| `tauntDur` | taunt (+s) | juego (RETIRED_KEYS) | guerrero:d7 |
| `trapIn` | contain (campo) | juego (RETIRED_KEYS) | arquera:a_u_zarzas.A |
| `tv.dartCritCdr` | tv.basicCritCdr (el núcleo acepta los dos nombres) | W2 | maga:c23 |
| `tv.drHighFury` | tv.drHighMana (recurso > 50 %: Furia, Maná o Energía) | W2 | guerrero:c8 |
| `tv.perfectMul` | perfectPct (×1,5 → 50, saco aditivo) | §3.6 | arquera:f2 |
| `tv.staggerPct` | stats.staggerPct (fx.stats) | W2 | guerrero:c16B |
| `type:field` | type: 'zone' (+ at, dur, radius, follow); type:'field' es error en v2 | W2 | maga:m_u_desgarro.A |
| `type:wall` | type:'wall' + wall: { len, width, blocks, contain } | §3.6 | maga:k_prision.B |
| `vulnPct` | mark.weakPct | juego (RETIRED_KEYS) | guerrero:g_juicio.A |
| `window` | recast.win | §3.6 | arquera:a_u_celeste.M |
| `windupMove` | moveMul (preparación: 1 = como hoy, 0 = plantado) | §3.6 | guerrero:c9B |
| `windupMult` | windupMul (mod, %) | §3.6 | guerrero:c9B |

## 2. SIN TRADUCCIÓN (ni en §3.6, ni en la tabla de W2, ni en el juego)

La «propuesta» NO sale de la tabla de §3.6: es una sugerencia para la decisión del orquestador.

| Clave | Propuesta | Dónde | Ejemplo |
|---|---|---|---|

## 3. Claves `tv` nuevas y su decisión

Núcleo = la lee `condAddPct`, `nucleo_tv`, `resolveSkill`, `dotProfile`… (`CORE_TV_KEYS`). De la clase = la consume un poder o la mecánica de esa
clase: KT la declara en `<CLASE>_TV_KEYS` (`talents-<clase>.js`). Cola W2 = el motor aún no la lee: petición antes de usarla.

| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |
|---|---|---|---|---|
| `tv.aspdCharges` | de la clase (KT-maga) | tv.aspdCharges (MAGA_TV_KEYS) · mech-maga.js | test-gauges-maga | maga:a20 |
| `tv.batidaDur` | de la clase (KT-arquera) | tv.batidaDur (ARQUERA_TV_KEYS) · mech-arquera.js (coto: Batida) | test-gauges-arquera | arquera:m23 |
| `tv.batidaPreyStagger` | de la clase (KT-arquera) | tv.batidaPreyStagger (ARQUERA_TV_KEYS) · mech-arquera.js (coto: Batida) | test-gauges-arquera | arquera:m23 |
| `tv.chargeCrit` | de la clase (KT-maga) | tv.chargeCrit (MAGA_TV_KEYS) · mech-maga.js | test-gauges-maga | maga:a2 |
| `tv.drCharges` | de la clase (KT-maga) | tv.drCharges (MAGA_TV_KEYS) · mech-maga.js | test-gauges-maga | maga:a15B |
| `tv.drVsLayered` | de la clase (KT-maga) | tv.drVsLayered (MAGA_TV_KEYS) · mech-maga.js (condDr con gaugeState) | test-gauges-maga | maga:i15A |
| `tv.frostCrit` | de la clase (KT-maga) | tv.frostCrit (MAGA_TV_KEYS) · mech-maga.js (condCrit con gaugeState) | test-gauges-maga | maga:i2 |
| `tv.galeT` | de la clase (KT-arquera) | tv.galeT (ARQUERA_TV_KEYS) · mech-arquera.js (impulso.galeT + tv) | test-gauges-arquera | arquera:v2 |
| `tv.rivalKillHeal` | de la clase (KT-guerrero) | tv.rivalKillHeal (GUERRERO_TV_KEYS) · powers-guerrero.js (árbol héroe: Rival, por p.sustain) | test-powers-guerrero | guerrero:l1 |
| `tv.titanPct` | de la clase (KT-guerrero) | tv.titanPct (GUERRERO_TV_KEYS) · powers-guerrero.js (árbol héroe: Golpe de Titán) | test-powers-guerrero | guerrero:t2B |
| `tv.titanStagger` | de la clase (KT-guerrero) | tv.titanStagger (GUERRERO_TV_KEYS) · powers-guerrero.js (árbol héroe: Golpe de Titán) | test-powers-guerrero | guerrero:t2B |
| `tv.basicCritCdr` | núcleo (W2, CORE_TV_KEYS) | tv.basicCritCdr · nucleo_tv.onHit (tabla CRIT_CDR_KEYS) | test84 §6 | guerrero:c23 |
| `tv.bleedDur` | núcleo (W2, CORE_TV_KEYS) | tv.bleedDur (s extra del Sangrado) · combat-math.dotProfile | test84 §6 | guerrero:c16A, guerrero:b1 |
| `tv.ccDurPct` | núcleo (W2, CORE_TV_KEYS) | tv.ccDurPct (+% a tus aturdimientos) · combat-math.ccDurationWithTalents | test84 §6 | guerrero:c16B |
| `tv.critCdrAll` | núcleo (W2, CORE_TV_KEYS) | tv.critCdrAll · nucleo_tv.onHit (tabla CRIT_CDR_KEYS) | test84 §6 | guerrero:b12 |
| `tv.critFrostCdr` | núcleo (W2, CORE_TV_KEYS) | tv.critFrostCdr · nucleo_tv.onHit (tabla CRIT_CDR_KEYS) | test84 §6 | maga:i12 |
| `tv.drLowHp` | núcleo (W2, CORE_TV_KEYS) | tv.drLowHp (vida < 40 %) · nucleo_tv.condDr | test84 §6 | guerrero:b15B |
| `tv.drStill` | núcleo (W2, CORE_TV_KEYS) | tv.drStill (% de DR quieta ≥ 1 s: p.stillT, sin desplazarte por ningún medio; espejo de drMoving) · nucleo_tv.condDr (+ Player.stillT) | test88 §1 | arquera:f15A |
| `tv.fieldDur` | núcleo (W2, CORE_TV_KEYS) | tv.fieldDur (+% de duración de tus trampas y zarzales: las trampas y los campos con data.fieldDur: true; el comportamiento termina con f.dur) · field-entities.spawnField (combat-math.fieldDurationWithTalents) | test88 §2 y §2b | arquera:m20 |
| `tv.freezeDur` | núcleo (W2, CORE_TV_KEYS) | tv.freezeDur (+s al Congelado) · combat-math.ccDurationWithTalents | test84 §6 | maga:i1 |
| `tv.frozenKillHeal` | núcleo (W2, CORE_TV_KEYS) | tv.frozenKillHeal · nucleo_tv.onKill | test84 §6 | maga:i11 |
| `tv.perfectCdrAll` | núcleo (W2, CORE_TV_KEYS) | tv.perfectCdrAll (suelta perfecta, cada 2 s como mucho) · nucleo_tv.afterCast | test84 §6 | guerrero:z12 |

## 4. Stats nuevas (`recompute`) y su decisión

| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |
|---|---|---|---|---|
| `stats.blockPower` | canónica (W2) | stats.blockPower (un bloqueo para 50 + blockPower %, tope 90; fx.stats, buff o postura) · combat-math.blockReduction (mitigate, expectedMitigation) + recompute (+ STANCE_STATS) | test88 §3 | guerrero:d1 |
| `stats.regenPct` | canónica (W2) | stats.regenPct (+% regeneración de Maná y Energía) · resources.resourceRegenRate | test84 §6 | arquera:c12 |
| `stats.resGainPct` | canónica (W2) | stats.resGainPct (+% al recurso generado) · resources.gainResource | test84 §6 | guerrero:c12 |

## 4b. Claves de definición nuevas de W2, peticiones a la cola W2 y parámetros que lee el código de la clase

| Clave | Decisión | Qué y dónde vive | Prueba | Dónde |
|---|---|---|---|---|
| `blocks` | de la clase (KA-maga) | blocks del campo p_muro_fuego (true = corta el paso, no a jefes; como wall.blocks de §3.6) · powers-maga.js (p_muro_fuego lee sk.blocks); la estela de m_estela_ignea_ii deja ese campo con un comportamiento | test-skills-maga | maga:m_estela_ignea.B |
| `chainPct` | canónica (W2) | chainPct (cada salto hace ese % del golpe base) · skill-resolve (prof.chainPct), game-skills.spawnChainBounce | test82 §9 | maga:rayo.A |
| `layers` | de la clase (KA-maga · KT-maga) | set: { layers: n } (capas de Escarcha que deja cada golpe; hoy lo leen k_prision y k_aliento) · powers-maga.js; para k_lanza, la Escarcha de mech-maga.js (prof.def.layers en el golpe) | test-skills-maga · test-gauges-maga | maga:k_lanza.A |
| `pull.dist` | canónica (W2) | pull: { dist, to: 'self'/'center'/'trap' } · Enemy.displace | test84 §3 | arquera:a_m_detonante.B |
| `pull.to` | canónica (W2) | pull: { dist, to: 'self'/'center'/'trap' } · Enemy.displace | test84 §3 | arquera:a_m_detonante.B |
| `scatter` | canónica (W2) | impacts: n, scatter: m en un type:"area" · tipo genérico area | test82 §9 | maga:meteoro.A |
| `zoneCoef` | canónica (W2) | mod zoneCoef (daño de la estela trail) · game-skills (trail) | test83 §7 | guerrero:z10A |
| `zoneHeal` | canónica (W2) | mod zoneHeal (cura de la estela trail) · game-skills (trail) | test83 §7 | guerrero:z7 |

## 5. Ajustes de mecánica (`tuning`) y auras (KT · `mech-<clase>.js`)

| Clave | Tipo | Dónde |
|---|---|---|
| `cargas.dmgPerCharge` | tuning | maga:a4 |
| `cargas.loseAfter` | tuning | maga:a1 |
| `cargas.max` | tuning | maga:a22 |
| `escarcha.decayEvery` | tuning | maga:i4 |
| `pendón dmgPct` | tuning | guerrero:u2A |
| `pendón drPct` | tuning | guerrero:u2B |
| `pendón durS` | tuning | guerrero:u9 |
| `pendón radius` | tuning | guerrero:u1 |
| `titán every` | tuning | guerrero:t5 |
| `e.weakenOutgoing` | aura | guerrero:u7 |
| `moveSpd` | aura | guerrero:u6 |
| `weakenOutgoing` | aura | guerrero:g_guardia.B |

## 6. Campos nombrados en las notas (KA/KT: `defineField`)

- `a_grieta` · maga:a7
- `k_muralla` · maga:k_prision.B
- `k_suelo` · maga:i14
- `p_muro_fuego` · maga:m_estela_ignea.B

## 7. Ganchos y claves de poder citados (no son claves de datos)

- `condAdd` · maga:a22, arquera:f20
- `icd` · guerrero:b14

## 8. Claves canónicas (§3.5/§3.6) y existentes del juego (sin traducción necesaria)

- Canónicas: `at`, `autoShot.every`, `autoShot.target`, `channelT`, `charge.max`, `charge.perfect`, `charges`, `comboWin`, `dmgDirect`, `drag`, `dragWidth`, `follow`, `heal`, `keepPlanted`, `knock`, `mark.dur`, `minHpPct`, `moveMul`, `perTarget`, `perfectWin`, `pull`, `recast`, `recastAdd`, `shield`, `shieldGain`, `splashPct`, `steps`, `taunt`, `trap.armT`, `trap.burst`, `trap.consume`, `type:area`, `type:channel`, `type:line`, `type:proj`, `wave`, `windup`, `windupAdd`, `zoneMax`
- Existentes: `airT`, `allyDr`, `angle`, `buff`, `cadence`, `cdr`, `chain`, `cleanse`, `cleave`, `cleaveR`, `coef`, `cost`, `count`, `crit`, `crossRoot`, `dashT`, `dmg`, `dot`, `dur`, `durS`, `freeze`, `genOnHit`, `hitDot`, `impactDelay`, `impacts`, `pierce`, `proj`, `projMissPct`, `pulses`, `radius`, `range`, `root`, `shots`, `slow`, `slowImmune`, `slowPct`, `span`, `speed`, `splash`, `spread`, `stagger`, `stats.aspdPct`, `stats.crit`, `stats.dmgPct`, `stats.gaugeGain`, `stats.hpPct`, `stats.mp`, `stats.mpPct`, `stats.mph`, `stats.spdPct`, `stun`, `tv.barrierDr`, `tv.bleedKillHeal`, `tv.bleedKillMana`, `tv.bleedPct`, `tv.burnDur`, `tv.burnKillHeal`, `tv.burnKillMana`, `tv.burnPct`, `tv.burningCrit`, `tv.chargeSpeed`, `tv.costRedBig`, `tv.critFireCdr`, `tv.drHighMana`, `tv.drMoving`, `tv.highManaDmg`, `tv.poisonPct`, `tv.preyDmg`, `unstoppable`, `waves`, `width`, `zone`, `zoneDur`
