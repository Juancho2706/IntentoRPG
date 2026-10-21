# Claves resueltas por W2 (Paso 2 · E1, decisión 11)

Respuesta a `tools/convert-v2/out/claves-impl.md`: cada clave del mockup que no estaba en §3.6 tiene aquí su
nombre canónico en el motor y la suite que lo prueba. El integrador de E1.5 vuelca esta tabla en el
conversor; KA y KT no inventan claves: lo que falte va por la cola W2.

Recuento: el resumen de `claves-impl.md` da 5 «SIN TRADUCCIÓN», 17 claves `tv` nuevas y 4 stats nuevas
(26). La decisión 11 habla de 28; aquí van las 26, los 7 alias de §1 y los 4 nombres pendientes de
confirmar (`repeat`, `trail`, `at:'ownField'`, `pulse`). Los ajustes de mecánica (§5), los campos
nombrados (§6) y `condAdd` (§7) son de KT o KA y no tocan el motor.

## 1. «SIN TRADUCCIÓN» (§2 de claves-impl)

| Clave del mockup | Canónica | Dónde vive | Prueba |
|---|---|---|---|
| `bounce` (maga `a_orbe.A`: `set{bounce:0}`) | `set: { bounces: 0 }`, el parámetro que ya lee el Orbe (`sk.bounces ?? 2`) | `powers-maga.js` (KT-maga/KA-maga): **debe leer `prof.def.bounces`** (la definición forjada), no `sk.bounces` | `test81` (ruta de forja) |
| `chainPct` (maga `rayo.A`) | `chainPct: 70` en la definición: cada salto del Encadenado hace el 70 % del golpe base (sin el −25 % compuesto) | `skill-resolve` (`prof.chainPct`), `game-skills` (`spawnChainBounce(…, pct)`) | `test82` §9 |
| `dmg3` (guerrero `g_rajar.A`) | `mul: { 'steps.2.coef': 1.4 }` (ruta de forja sobre el 3.er paso del combo) | `skill-defs.setPath` | `test82` §9, `test81` |
| `scatter` (maga `meteoro.A`) | `impacts: n, scatter: m` en un `type:'area'`: n impactos a 0,6·m del centro, repartidos en anillo (sin azar) | tipo genérico `area` | `test82` §9 |
| `type:field` (maga `m_u_desgarro.A`) | `type: 'zone'` (+ `at`, `dur`, `radius`, `follow`). `type:'field'` es **error** en un catálogo v2 | tipo genérico `zone` | `test83` §9, `test81` |

## 2. Claves `tv` nuevas (§3 de claves-impl)

Las que lee el núcleo están en `nucleo_tv` (`powers-common.js`, `coreTvKeys`), en `Enemy.applyCC` o en
`dotProfile`. Las que dependen de un indicador de especialización son de KT (`mech-<clase>.js`).

| Clave | Decisión | Dónde vive | Prueba |
|---|---|---|---|
| `tv.bleedDur` | Canónica (s extra del Sangrado, como `burnDur`) | `combat-math.dotProfile` | `test84` §6 |
| `tv.ccDurPct` | Canónica: +% a la duración de los aturdimientos del héroe | `Enemy.applyCC` (`opts.src.tv`) | `test84` §6 |
| `tv.freezeDur` | Canónica: +s al Congelado aplicado por el héroe (todas las fuentes) | `Enemy.applyCC` | `test84` §6 |
| `tv.staggerPct` | **Alias** → stat `staggerPct` (`fx.stats: { staggerPct }`, ya existe) | `recompute` / `Enemy.applyCC`, `displace` | `test84` §6 |
| `tv.critCdrAll` | Canónica (⑤): crítico directo → −X s a todos los enfriamientos salvo definitivas, una vez por instante | `nucleo_tv.onHit` | `test84` §6 |
| `tv.critFrostCdr` | Canónica (⑤): como `critFireCdr`, con Hielo (elemento forjado) | `nucleo_tv.onHit` | `test84` §6 |
| `tv.basicCritCdr` | Canónica (⑤): crítico directo del **básico** → −X s a tu movilidad y tus defensas | `nucleo_tv.onHit` | `test84` §6 |
| `tv.dartCritCdr` | **Alias** → `basicCritCdr` (el núcleo acepta los dos nombres) | `nucleo_tv` | `test84` §6 |
| `tv.drHighFury` | **Alias** → `drHighMana` (recurso > 50 %: vale para Furia, Maná y Energía) | `nucleo_tv.condDr` | `test84` §6 |
| `tv.drLowHp` | Canónica (⑧): reducción de daño con menos del 40 % de vida (`DR_LOW_HP_FRAC`) | `nucleo_tv.condDr` | `test84` §6 |
| `tv.frozenKillHeal` | Canónica (⑥): % de vida al matar a un Congelado; con `tv.frozenKillMana` para el maná | `nucleo_tv.onKill` | `test84` §6 |
| `tv.frostCrit` | KT-maga: crítico contra enemigos con ≥ 3 capas de Escarcha (`condCrit` con `gaugeState`) | `mech-maga.js` | `test-gauges-maga` (KT) |
| `tv.drVsLayered` | KT-maga: reducción contra enemigos con capas (`condDr` con `gaugeState`) | `mech-maga.js` | KT |
| `tv.aspdCharges` | KT-maga: velocidad con ≥ 3 Cargas (stats del indicador) | `mech-maga.js` | KT |
| `tv.chargeCrit` | KT-maga: crítico con ≥ 2 Cargas | `mech-maga.js` | KT |
| `tv.drCharges` | KT-maga: reducción con ≥ 3 Cargas | `mech-maga.js` | KT |
| `tv.galeT` | KT-arquera: duración del Vendaval (`gaugeTuning impulso.galeT + tv`) | `mech-arquera.js` | KT |

Además, de la cola W2 de E0: `tv.perfectCdrAll` (Liturgia, ③ `afterCast` con `cast.perfect`; cada 2 s
como mucho, no definitivas ni `cdOnEnd`).

## 3. Stats nuevas (§4 de claves-impl)

| Clave | Decisión | Dónde vive | Prueba |
|---|---|---|---|
| `stats.regenPct` | Canónica: +% a la regeneración de Maná y Energía | `resources.resourceRegenRate` | `test84` §6 |
| `stats.regen` (Mente Clara) | **Alias** → `stats.regenPct` | — | `test84` §6 |
| `stats.resGainPct` | Canónica: +% al recurso GENERADO (golpes, habilidades, daño recibido); `gainResource(p, n, { raw: true })` lo salta | `resources.gainResource` | `test84` §6 |
| `stats.resMaxAdd` | **Alias** → stat `mp` (planos de recurso máximo; Furia hasta 130) | `recompute` | `test84` §6 |

## 4. Alias de §3.6 (§1 de claves-impl) y nombres pendientes

| Del mockup | Canónica | Prueba |
|---|---|---|
| `follow:true` | `follow: 'owner'` (`'aim'` sigue a la mira) | `test83` §5 |
| `moveFree`, `moveWhileChannel`, `windupMove` | `moveMul` (0 = quieto, 1 = como hoy) | `test84` §1, `test82` §5 |
| `windupMult` | mod `windupMul` (%) | `test81` (alias retirado = error en v2) |
| `recast.max` | `recast.n` = usos TOTALES de la cadena (mod `recastAdd`) | `test82` §3 |
| `type:wall` | `type: 'wall'` + `wall: { len, width, blocks, contain }` | `test83` §4 |
| `repeat` (Terremoto) | Confirmada: `repeat: { n, every, coef, needPlanted }`, mod `repeatAdd`, `HitInfo.repeat` | `test82` §8 |
| `trail` (Sendero de Luz) | Confirmada: `trail: { field, dur, width, coef, heal }` en `dash`/`leap`; mods `zoneCoef`, `zoneHeal` | `test83` §7 |
| `at:'ownField'` (Salto de Acecho) | Confirmada: `at: 'ownField'` + `fieldKind` (+ `fallbackRange` opcional) | `test83` §7 |
| `pulse` (Ciudadela) | Confirmada: `pulse: { every, radius, taunt, coef }` en `buff` y `aura` | `test82` (fixture `vx_ciudadela`) |

## 5. Claves de verbo que el motor añade (para KA y KT)

- **Definición:** `charge.full: { count, spread, coefMul }` (otra cuenta de proyectiles a carga completa),
  `charge.repeat` (fuego continuo; por defecto en básicos), `perTarget` (proyectiles del mismo lanzamiento
  que pueden dar al mismo enemigo), `dashT` + `drag` (+ mod `dragWidth`) + `unstoppable` (avance lento que
  arrastra), `taunt` (s, a los golpeados), `plant`, `detonate: { radius, coef, chain, perTarget }`,
  `trap: { armT, maxArmed, radius, root, burst, consume, lure }`, `contain` y `healPct` en zonas,
  `wave: { range, width, coef }`, `heal: { pct, radius }` y `shield: { pct, radius, dur }` al lanzar,
  `lure: { radius, eliteRadius, boss, speedMul, dur }` (campo señuelo), `cdOnEnd` y `cdFloor`, `keepPlanted`.
- **Mods nuevos:** `windupAdd`, `windupMul`, `moveMulAdd`, `moveMulMin`, `charges`, `recastAdd`,
  `recastWin`, `comboWin`, `chargeSpeed`, `perfectWin`, `perfectEarly`, `perfectPct`, `zoneMax`, `pull`,
  `knock`, `killReset`, `shieldGain`, `dmgDirect`, `splashPct`, `repeatAdd`, `keepPlanted`, `markDur`,
  `taunt`, `dragWidth`, `zoneCoef`, `zoneHeal`.
- **Stats de postura:** `dmgPct`, `dr`, `block`, `crit`, `critDmg`, `projMissPct`, `dmgTakenPct`, `spdPct`
  (`STANCE_STATS`); por modo también `moveMul` y `chargeSpeed`.
- **API de juego:** `g.releaseSkillSlot`, `g.cancelHeld`, `g.reduceCooldown` (única vía para restar
  enfriamiento), `g.resetCooldowns` (respec: sustituye a `p.cds = {}`), `g.chooseForge`, `g.extendChannel`,
  `g.stanceOf`, `g.setStanceBoth`, `g.setComboStep`, `g.setSeqCount`, `g.applyMark`, `g.marksOf`,
  `g.detonateMark`, `g.fieldsOf`, `g.nearestOwnField`, `g.detonateField`, `g.detonateAt`,
  `g.trapBurstsWithin` (la Batida del Coto: 3 estallidos en 1 s), `g.lureStep`, `g.constrainMove`.
- **HitInfo:** `perfect`, `step`, `repeat`, `echo`, `detonated`, `trap = { uid, skill }` (estallido o golpe de una
  trampa; `null` si no lo es). **CastInfo:** `sk` = definición **forjada** (`prof.def`: Mejora y variante ya aplicadas,
  mismo id que la del catálogo; los comportamientos la reciben igual), `charge { t, frac }`,
  `perfect`, `forcePerfect` (lo pone un poder en ⑦), `recast { idx, left, perfect }`, `step`, `seqNth`,
  `seqIdx`, `echo`, `stance`, `stanceFrom`, `endReason`, `released`. **⑭ `onSkillEnd`:**
  `{ kind, reason, casts, hits, released, frac, perfect }`.

## 6. Ampliaciones de contrato de la ronda de corrección (E1)

- **Vocabulario cerrado de la definición** (`SKILL_KEYS` en `skill-defs.js`): con `v2`, `validateSkillDef` **avisa**
  (no es error) de una clave fuera de la lista: la errata `chrage` o `recats` sale en `errs.warnings` (no
  enumerable) y en `opts.warnings`. Las claves propias de un comportamiento se declaran en su `params`
  (`defineSkillBehavior(id, { cast, params: ['reach'] })`; `params` entra en `BEHAVIOR_KEYS`). Lo prueba `test82` §1.
- **Accesores de talentos** (§3.3, §3.8): `Player.talentAccessors()` → `{ elemOf, kitOf, defOf }`, todos sobre la
  definición **forjada**; `recompute` llama `aggregateTalents(this, this.talentAccessors())`, así `'@tag:'`,
  `'@charge'`… y `'@windup'` ven lo que añade la forja. Lo prueba `test81` §8.
- **Constructor:** `normalizeTalents(this.talents, classId, this.level)`; si `talents.js` v2 deja árboles en
  `talentsTrimmed(p.talents)`, se añade a `p.notices` `TALENTS_TRIMMED_NOTICE` (`'talentos-recortados'`). La
  parte de comportamiento de `test81` §8 se activa sola cuando `talents.js` exporta `talentsTrimmed` (E1.5).
- **Bucle de botones mantenidos:** `g.pumpHeldSlots()` y `g.heldSlotBusy(slot)` en `game-skills.js`; `Game.tick`
  y el arnés llaman al mismo. `test43` debe contar estos dos métodos nuevos de `skillMethods`.
- **Pausa:** soltar la tecla o el botón de una carga con `g._paused` la **cancela** sin coste (`reason: 'panel'`).
- **Stat `perfectAlways`** en `p.stats` (buff de Calma Absoluta): perfecta desde media carga.
- **Cebo:** sustituye solo el movimiento y la decisión del enemigo (`Enemy._updateAI` tras sus temporizadores);
  un lanzamiento enemigo en curso termina antes de que lo atraiga.
- **Fórmulas en `combat-math.js`:** `ELITE_DISPLACE_MUL` (0,6), `displaceDist(dist, dr, elite)` y
  `ccDurationWithTalents(kind, dur, tv)` (`ccDurPct`, `freezeDur`).

## 7. Cola W2 resuelta en paralelo con E2 (punto 16 del plan, W2b)

Las tres filas que `claves-w2.mjs` tenía como `cola` pasan a `canonica`. Las dos `tv` están en `NUCLEO_TV_KEYS`
(`skill-defs.js`), y por ella en `CORE_TV_KEYS`; KT las escribe en el `fx` del nodo sin declararlas en
`<CLASE>_TV_KEYS`.

| Clave | Decisión | Dónde vive | Prueba |
|---|---|---|---|
| `tv.drStill` | Canónica (⑧, % como `drMoving`): reducción de daño **quieta ≥ 1 s** (`DR_STILL_T`) = `p.stillT ≥ 1`. `stillT` cuenta los segundos sin desplazarte por ningún medio: caminar (también plantada con `keepPlanted`), la movilidad (`unplant`), un avance o salto (también al llegar con `plant: true`), la esquiva o cualquier desplazamiento entre fotogramas (rodar o un parpadeo de un comportamiento, un tirón) la ponen a 0; chocar contra un muro sin avanzar no. No es el plantado de D20, que no cambia. Nunca se suma a la vez que `drMoving` | `nucleo_tv.condDr` + `Player.stillT` | `test88` §1 |
| `tv.fieldDur` | Canónica (% como las demás): `dur × (1 + fieldDur/100)` en tus **trampas** (la genérica, un campo con `onDetonate` o con `data.trap`) y tus **zarzales**: los campos marcados `data.fieldDur: true`. Una zona sin marca no cambia (`zona` genérica, `estela`, Bomba de Humo…), ni muros, auras, señuelos o emisores; `data.fieldDur: false` deja fuera hasta una trampa. Solo si el dueño es un héroe (`g.player` o `g.party`), nunca un enemigo. No activa `nucleo_tv` (`NUCLEO_TV_OUTSIDE`) | `field-entities.spawnField` (`combat-math.fieldDurationWithTalents`) | `test88` §2 y §2b |
| `stats.blockPower` | Canónica (puntos %): un bloqueo para `BLOCK_REDUCTION + blockPower/100`, con tope `BLOCK_REDUCTION_MAX` (0,9: nunca todo el golpe), en el golpe con azar (`mitigate`) y en el esperado (`expectedMitigation`). Se suma en el saco de `recompute` (`fx.stats`, buffs, poderes con `stats`) y, sin `recompute`, desde una postura (`STANCE_STATS`); el tope solo en `combat-math.blockReduction` | `combat-math.blockReduction` + `recompute` | `test88` §3 |

Cómo se escribe cada nodo:

- Arquera f15A Quietud: `fx: { tv: { drStill: 15 } }`.
- Arquera m20 Ojo de Trampera: `fx: { tv: { fieldDur: 25 } }` por rango (r2 = 50). La Trampa de Cepo cuenta sola si es
  la trampa genérica o un campo con `data.trap`. El Cerco de Zarzas (y cualquier zarzal: `m_zarzal`, ecos de Bosque Vivo)
  solo cuenta si su comportamiento marca el campo con `data.fieldDur: true` **y** toma su final del campo devuelto, no de
  su `dur` local: `const f = g.spawnField('zona', { …, dur, data: { …, fieldDur: true } }); const end = f?.dur ?? dur;`
  (o termina cuando `f.dead`). Así el cruce que inmoviliza, la Debilidad, `cast.done` y el estallido al cerrarse
  llegan cuando el zarzal se cierra de verdad. Si otro campo acompaña al zarzal, lleva la misma marca. Un zarzal hecho
  con el tipo genérico `zone` no se puede marcar (sus `data` las arma `game-skills`): eso sería una petición a W2.
- Guerrero d1 Escudo Alzado: `fx: { stats: { blockPower: 10 } }` por rango (r3 = 80 %).
- Guerrero d15B Aguante de Roca: su poder `g_d_roca` suma `blockPower: 10` solo con 5 cargas de Bastión. Por eventos,
  nunca renovándolo en cada tick (`addBuff` rehace `recompute`): al ganar cargas (⑩ `onGauge(…, 'bastion', 'gain')`)
  con `gaugeValue(p, 'bastion') >= 5` y sin el buff, `addBuff('g_d_roca', { blockPower: 10 }, 3600)`; al gastar cargas (⑩ `'spent'`) o, en `onTick`, si
  `gaugeValue(p, 'bastion') < 5` y el buff sigue, se quita (`p.buffs = p.buffs.filter(b => b.id !== 'g_d_roca');
  p.recompute()`). La pérdida por el tiempo (1 carga cada 6 s) no dispara ⑩ hasta vaciarse: por eso la comprobación en
  `onTick` (barata: solo rehace `recompute` al cambiar).

Las salidas versionadas del conversor (`tools/convert-v2/out/claves-impl.md` y `pendientes-<clase>.md`) se generaron
antes de W2b y aún dicen «cola W2 (pendiente)» en estas tres claves: manda esta tabla (y `claves-w2.mjs`) hasta que se
regeneren (`node tools/convert-v2/convert.mjs --draft --todas`).
