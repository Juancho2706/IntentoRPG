# Claves de `impl` y `k` fuera del vocabulario de verbos (§3.6)

> Generado por `tools/convert-v2/convert.mjs` (E0.4). Fuentes: maga (`docs/mockups/data/talents-v2-maga.js`, sha1 7801561901ba, «aprobado») · guerrero (`docs/mockups/data/talents-v2-guerrero.js`, sha1 966148bcbff2, «diseño») · arquera (`docs/mockups/data/talents-v2-arquera.js`, sha1 db6e09d7abe7, «diseño»).
> Las notas `impl`/`k` son texto libre: la lectura es heurística. «SIN TRADUCCIÓN» para al orquestador antes de E2 (decide el nombre o pide un comportamiento).

**Resumen:** 7 alias con traducción · **5 SIN TRADUCCIÓN** · 17 claves tv nuevas · 4 stats nuevas · 4 ajustes de mecánica o aura · 4 campos nombrados · 22 canónicas de §3.5/§3.6 · 69 que ya existen en el juego.

## 1. Alias del mockup → clave canónica (tabla de alias de §3.6)

| Clave del mockup | Traducción | Dónde |
|---|---|---|
| `follow:true` | follow: 'owner' | maga:m_u_supernova.A |
| `moveFree` | moveMul (moveFree:false → moveMul: 0) | guerrero:g_remolino.A |
| `moveWhileChannel` | moveMul | maga:m_u_desgarro.M |
| `recast.max` | recast.n (mod recastAdd) | arquera:v9B |
| `type:wall` | type:'wall' + wall: { len, width, blocks, contain } | maga:k_prision.B |
| `windupMove` | moveMul (preparación: 1 = como hoy, 0 = plantado) | guerrero:c9B |
| `windupMult` | windupMul (mod, %) | guerrero:c9B |

## 2. SIN TRADUCCIÓN (ni en §3.6 ni en el juego)

La «propuesta» NO sale de la tabla de §3.6: es una sugerencia para la decisión del orquestador.

| Clave | Propuesta | Dónde | Ejemplo |
|---|---|---|---|
| `bounce` | propuesta: `bounces (parámetro que ya existe)` | maga:a_orbe.A | set{speed:2x, bounce:0} |
| `chainPct` | — | maga:rayo.A | chainPct 70 |
| `dmg3` | propuesta: `mul { 'steps.2.coef' } (3.er paso del combo)` | guerrero:g_rajar.A | dmg3 +40 |
| `scatter` | — | maga:meteoro.A | set{impacts:3, scatter:2.5} |
| `type:field` | — | maga:m_u_desgarro.A | set{type:field, dur:5, radius:3} |

## 3. Claves `tv` nuevas (KT: `<CLASE>_TV_KEYS`; si las lee el núcleo —`condAddPct`, `nucleo_tv`, `resolveSkill`, `dotProfile`—, cola W2)

| Clave | Dónde |
|---|---|
| `tv.aspdCharges` | maga:a20 |
| `tv.basicCritCdr` | guerrero:c23 |
| `tv.bleedDur` | guerrero:c16A, guerrero:b1 |
| `tv.ccDurPct` | guerrero:c16B |
| `tv.chargeCrit` | maga:a2 |
| `tv.critCdrAll` | guerrero:b12 |
| `tv.critFrostCdr` | maga:i12 |
| `tv.dartCritCdr` | maga:c23 |
| `tv.drCharges` | maga:a15B |
| `tv.drHighFury` | guerrero:c8 |
| `tv.drLowHp` | guerrero:b15B |
| `tv.drVsLayered` | maga:i15A |
| `tv.freezeDur` | maga:i1 |
| `tv.frostCrit` | maga:i2 |
| `tv.frozenKillHeal` | maga:i11 |
| `tv.galeT` | arquera:v2 |
| `tv.staggerPct` | guerrero:c16B |

## 4. Stats nuevas (`recompute`: cola W2)

| Clave | Dónde | Ejemplo |
|---|---|---|
| `stats.regen` | maga:c15B | stats regen |
| `stats.regenPct` | arquera:c12 | stats.regenPct |
| `stats.resGainPct` | guerrero:c12 | stats.resGainPct |
| `stats.resMaxAdd` | guerrero:c15B | stats resMaxAdd 30 |

## 5. Ajustes de mecánica (`tuning`) y auras (KT · `mech-<clase>.js`)

| Clave | Tipo | Dónde |
|---|---|---|
| `cargas.dmgPerCharge` | tuning | maga:a4 |
| `cargas.loseAfter` | tuning | maga:a1 |
| `cargas.max` | tuning | maga:a22 |
| `escarcha.decayEvery` | tuning | maga:i4 |

## 6. Campos nombrados en las notas (KA/KT: `defineField`)

- `a_grieta` · maga:a7
- `k_muralla` · maga:k_prision.B
- `k_suelo` · maga:i14
- `p_muro_fuego` · maga:m_estela_ignea.B

## 7. Ganchos y claves de poder citados (no son claves de datos)

- `condAdd` · maga:a22

## 8. Claves canónicas (§3.5/§3.6) y existentes del juego (sin traducción necesaria)

- Canónicas: `at`, `autoShot.every`, `autoShot.target`, `channelT`, `charges`, `comboWin`, `dmgDirect`, `follow`, `knock`, `minHpPct`, `moveMul`, `pull`, `recast`, `recastAdd`, `shieldGain`, `splashPct`, `steps`, `type:area`, `type:channel`, `windup`, `windupAdd`, `zoneMax`
- Existentes: `airT`, `allyDr`, `angle`, `blocks`, `buff`, `cadence`, `cdr`, `chain`, `cleanse`, `cleave`, `cleaveR`, `coef`, `cost`, `count`, `crit`, `dmg`, `dot`, `dur`, `durS`, `freeze`, `genOnHit`, `hitDot`, `impactDelay`, `impacts`, `layers`, `length`, `pierce`, `proj`, `projMissPct`, `pulses`, `radius`, `range`, `shieldManaPct`, `slow`, `slowImmune`, `slowPct`, `span`, `speed`, `splash`, `spread`, `stagger`, `stats.aspdPct`, `stats.crit`, `stats.dmgPct`, `stats.gaugeGain`, `stats.hpPct`, `stats.mp`, `stats.mpPct`, `stats.mph`, `stats.spdPct`, `stun`, `tv.barrierDr`, `tv.bleedKillHeal`, `tv.bleedKillMana`, `tv.bleedPct`, `tv.burnDur`, `tv.burnKillHeal`, `tv.burnKillMana`, `tv.burnPct`, `tv.burningCrit`, `tv.costRedBig`, `tv.critFireCdr`, `tv.drHighMana`, `tv.drMoving`, `tv.highManaDmg`, `unstoppable`, `waves`, `zone`, `zoneDur`
