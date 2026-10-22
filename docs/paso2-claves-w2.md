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

## 8. Cola W2c (E3b: lo que pidieron U1 y U2)

Tres contratos nuevos entre el motor y la interfaz. Los prueba `test89` (§1 a §3); los avisos del Paragon,
también `test65` §6.

### 8.1 `g._chargeEnd`: fin de carga (`game-skills.js`)

El motor escribe `g._chargeEnd = { key, id, reason, perfect, frac, t, instant }` al terminar **cada** carga, y el
registro se queda hasta la siguiente: nadie lo borra. Lo lee `ui-verbs.finishCharge` para el destello de acierto o de
fallo.

| Campo | Qué es |
|---|---|
| `key` | Ranura de la carga (`'lmb'`, `'rmb'`, `'k1'`…`'k4'`) |
| `id` | Id de la habilidad |
| `reason` | Cómo acabó (tabla siguiente) |
| `perfect` | En una suelta, el de la suelta (ventana, `forcePerfect`, `perfectAlways`, Punto Débil). En una cancelación, `false` |
| `frac` | En [0, 1]. En una suelta, el de la suelta (= `end.frac` de ⑭ y `cast.charge.frac`); en una cancelación, lo cargado hasta ese momento |
| `t` | `p.simT` del instante en que terminó: el **mismo** reloj que `g._charging.t0` (inicio de la carga). Un registro con `t < t0` es de una carga anterior |
| `instant` | `true` si la habilidad salió sin carga visible (`charge.instant`, o `cast.instant` puesto en ⑦, como Ojo Entrenado): `reason: 'auto'` y `frac: 1`. **No es un fallo** aunque `perfect` sea `false`: el motor no baja la racha ni suena `verb_miss` |

| `reason` | Dónde | ⑭ `onSkillEnd` |
|---|---|---|
| `release` | `_releaseWith`: soltar el botón o la tecla | Sí, con el mismo `reason`, `frac` y `perfect` |
| `auto` | `_releaseWith`: suelta sola al máximo, y también la carga instantánea (`instant: true`) | Sí |
| `dodge`, `panel`, `cancel`, `interrupt`, `cc` | `_endCharge`, sin coste: esquiva (`dodge`); abrir un panel, pausar o soltar con `g._paused` (`panel`); `blur`, cambio de pestaña o la movilidad (`cancel`); golpe fuerte (`interrupt`); control duro (`cc`) | Sí, con el mismo `reason`, `released: false` y `perfect: false` |
| `reset` | `resetCastState` (cambio de mundo, muerte) | **No**. El reinicio limpia sin ganchos, igual que el canal y el lanzamiento en curso. Este motivo solo existe en `_chargeEnd` |

- Las repeticiones (`cast.echo`: Eco, Archimaga…) **no** lo escriben, aunque pasen por `_releaseWith`: el registro
  sigue siendo el de la última carga del jugador.
- El consumidor solo se fía de un registro de la carga que estaba mirando: misma ranura (`end.key === slot`), mismo id
  si los dos lo traen y `end.t ≥ t0`. Si no hay registro, o no es de esa carga, decide la racha de perfectos
  (`p.perfectStreak`): si sube, perfecta; si cae a 0, fallo; si no cambia, sin destello. Con el registro, fallo =
  `!perfect` con `reason` `release` o `auto`. Falta que excluya `instant` (petición a U2). Hoy no se nota, porque una
  carga instantánea no se ve y la UI no la resuelve.
- En las pruebas, un caso que pisa el registro para probar ese respaldo tiene que hacerlo **después** de simular y
  antes de pintar: el motor ya escribe el suyo en el tick de la suelta (`test89` §1g).

### 8.2 `owner.trapBursts`: estallidos de trampa (`field-entities.js`)

- Cada estallido añade `{ t, x, z, key }` (`key` desde W2d-B: `data.cluster` de la trampa —los cepos de un Racimo son
  una— o su `uid`): `t` = `owner.simT`; `x`, `z` = centro del campo que estalla (`f.pos`), no los
  pies del dueño. Pasa al pisar la trampa (tick de la `trampa` genérica) y al detonarla (`detonateField`, también por
  `detonateAt`). Si el sitio no es finito, solo `{ t }`. Se guardan las 12 últimas.
- Al leer se sigue aceptando el formato viejo, el instante suelto (un número). No cuenta una entrada sin instante
  numérico (`null`, `{ x, z }`, `t` nulo o en texto).
- `g.trapBurstsWithin(owner, s = 1, { distinct = false } = {})`: cuántos estallidos hubo en los últimos (con `distinct`,
  cuántas trampas DISTINTAS, por `key`; una entrada sin clave cuenta sola)
  `s` s (la Batida del Coto: 3 en 1 s). `world-marks` lee los dos formatos y pone el anillo de la Batida en el centro
  de los estallidos recientes.

### 8.3 Avisos del Paragon (`game-talents.js`, `_talentMutate`)

- Sin `g._talentQuiet` (HUD, atajos, código importado): «🌟 ¡Paragon abierto!…» y «Paragon en pausa: te falta gastar N
  punto(s) de especialización…» van al banner (`ui.message`, 4 s), como antes.
- Con `g._talentQuiet` (llamadas del panel por `gameTalentOps` de `ui-talents.js`) no van al banner, que el panel
  tapa. La respuesta trae `heroOpened`, `heroPaused` y `missing`, y el panel los enseña en su aviso y anima la
  revelación. Esto corrige lo que dice §3.4 de `paso2-implementacion.md` (petición al orquestador).

## 9. Cola W2d (tanda 1 de la integración de E2)

Fusionada en `paso2-impl` (W2d-A: canal de lanzamiento y perfil; W2d-B: entidades, campos y topes). Lo prueban
`test90-cola-w2d-a` y `test91-cola-w2d-b`.

### 9.1 APIs nuevas

- `g.castEcho(p, id, { mult = 1, at = null, origin = null, series = null } = {})` → `CastInfo | null`: repetición
  gratis de una habilidad conocida (sin coste, enfriamiento, GCD, preparación ni carga), con su propia serie (tope
  `echoCap` = 3). No toca `skState.echo`, la barra ni la mira. Devuelve `null` con una canalización. Una movilidad
  mueve al héroe. Acepta también la firma vieja `castEcho(p, id, mult, { at })`.
- `g.startCooldown(p, id, s)` → bool (sustituye a `cdOnEnd`; con cargas gasta una) · `g.channelInfo()` → `null | { id,
  key, t, dur, left, ticks, interval, toggle, hold, endless, unstoppable, p }` · `g.extendMark(e, markId, { mul, add })`
  (alarga también su Debilidad; con `t ≤ 0` borra las dos).
- `g.spawnChainBounce(…, pct, ctx)`: con `ctx`, cada salto lleva skill, tags, elemento y `hitExtra` (`HitInfo.source
  = 'chain'`). `g.skillTarget(p, prof, aim, from)`. `g.startChannel(ctx, done, { slowImmune, speed })`: los tics van
  a instantes fijos `t0 + k·interval`.
- `Player.basicRange(t)`, `Player.basicReach()` (el básico busca y dispara a esa distancia), `Player.stopDash()` /
  `g.stopDash(p)`, `g.expireField(f)`, `g.detonateAt(owner, pos, det, { skill, rankMul })`.
- `Enemy.applyCC('fear', dur, { src, from })` (control duro con rendimientos; a los jefes, 15 de Quebranto por s),
  `Enemy.clearCC(kind)`, `Enemy.firstChargedOk(p, id, icd, live)` (Punto Débil una vez por enemigo y héroe cada 8 s,
  también al remarcar con `g.applyMark`), `Enemy.staggerOpen()`.
- `combat-math`: `CAPS_HARD { dr: 75, block: 75 }`, `drCapOf(stats)`, `blockCapOf(stats)`, `slowStaggerSecs`,
  `staggerFromDisplace` (resistencia al Quebranto por desplazar), `STAGGER_CC.fear`, `FIRST_CHARGED_ICD`.

### 9.2 Claves y stats

- Stats `costPct` (todas las habilidades con coste; × `spenderCostPct`) y `skillSpeedPct` (preparación, tic de canal,
  vuelo del salto y avance; no toca enfriamientos), los dos por `recompute`. `drCapAdd` y `blockCapAdd`: solo de la
  innata (`INNATE_ONLY_STATS`).
- Definición: `zonePct` (Estela, % del arma por s × rango), `charge.min` declarado > 0 (soltar antes cancela sin coste:
  ⑭ y `_chargeEnd` con `reason: 'early'`), `charge.markMin` (en la unidad de la carga), `charge.scale.rangeAdd` (m que
  suma el tensado al básico), `pull { dist, to, radius, boss:false }`, `detonate` (también al final del vuelo o contra
  una pared). Mod de talento `zonePct`. Selector `'<id>@windup'`: lo produce `skill-resolve` (`comboWindupMods`) y
  solo toca los pasos de combo con preparación.
- `spec.innate.mod` se suma a `agg.mods` (Piel de Hierro del Guardián).
- Regla de rango: `prof.coef`, `prof.hitDot.coef` y `prof.detonate.coef` se escalan en `skill-resolve`; el estallido de
  la trampa (`data.burst.coef`) va crudo y lo escala una vez `field-entities` con `data.rank` (o `data.rankMul`).
- Trampa genérica: `data.hitDot` se aplica al saltar en lugar del golpe directo (renueva, no suma); con `burst`, quien
  la pisa no recibe además el golpe directo; ⑤ sin daño con `hit.trap` y `source 'field:trampa'`.

## 10. Sensación de las habilidades (S0 y las tres clases; E5, 2026-10-22)

Fusionada en `paso2-impl` (S0 y la Maga en `638206a`, el Guerrero en `663d2e7`, la Arquera en `a8995d7`). Lo prueban
`test-sensacion-motor` (S0) y `test-sensacion-maga`, `-guerrero` y `-arquera`. Qué hace cada habilidad, con sus
números: `MEMORIA.md`, «Paso 2f/2g», puntos 12 a 15.

### 10.1 Claves de la definición (S0)

Están en `SKILL_KEYS` y las valida `validateSkillDef`; las documentan `VERB_DOC.channel` y `VERB_DOC.feel`.

| Clave | Tipo | Qué hace |
|---|---|---|
| `tickNow: true` | `channel` | 1.er tic al pulsar. Los `ticks` se reparten en `channelT` (intervalo = `channelT / (ticks − 1)`) y el último cae al acabar. Exige `ticks ≥ 2`, salvo `endless`. Con velocidad de habilidades ≠ 1, los tics se redondean (`round(dur / intervalo) + 1`) |
| `drainCost: true` | `channel` | El `cost` resuelto no se cobra al empezar: se cobra `cost / ticks` en cada tic (`endless`: `cost` por cada `channelT` s). Para empezar basta pagar un tic; sin recurso, fin `'drain'` |
| `rampPerTic`, `rampMax` (%, van juntas) | `channel` | El tic n pega `coef × (1 + min(rampMax, rampPerTic · (n − 1)) / 100)` (`combat-math.channelRampPct(tickN, perTic, max)`). Multiplica el coef del tic; no va al saco aditivo. Los mods de talento `rampPerTic` y `rampMax` suman. El haz se ensancha ×2 al tope |
| `nonBlocking: true` | `channel` | Sin `castLock`: el básico y las otras ranuras quedan libres. Otro canal lo termina; su ranura no lo relanza |
| `beam: false \| { width, core, color, coreColor, intensity, line }` | `channel` | Haz vivo de la mano al objetivo pegajoso (ancho 0,55 y núcleo 0,16 por defecto); `line: true` lo lleva al final de la línea hacia la mira. Va por defecto en el canal de un objetivo (sin radio, sin `autoShot` y sin tic propio) |
| `beam: true \| { width, core, color, coreColor, intensity, dur }` | `proj` | Haz vivo hasta el final de su línea si atraviesa (si no, hasta la mira); ancho, brillo y duración crecen con la carga (ancho 0,3 y núcleo 0,09 por defecto) |
| `heavy: ms \| { ms, minFrac }` | definición o `steps[i]` | Congelado propio por golpe (1–250 ms), una vez por instante; no en repeticiones ni réplicas; respeta reduceMotion. `minFrac`: solo con la carga ≥ esa fracción |
| `shake` | cualquier `at` | Vale en área `at:'self'`, cono, línea, cuerpo a cuerpo y avance al llegar; × (0,6 + 0,4 · fracción) si la habilidad se carga (`vfx.chargedShake(base, frac)`) |
| `fx.repeatSfx` | réplicas (`repeat`) | Cada réplica emite `fx.aura` y `fx.extra`, sacude × 0,5 y suena `fx.repeatSfx` o `'thud'` |

### 10.2 Canal en curso (S0)

- `g.startChannel(ctx, done, opts)`: opciones nuevas `tickNow`, `drainCost` (número: coste total), `ramp { perTic, max }`,
  `nonBlocking` y `beam` (`true` | objeto). Cierra un canal anterior en vez de dejarlo huérfano.
- `inst` trae `rampPct`, `rampMul` (un `onTick` propio multiplica su coef por `inst.rampMul`), `beam` (el asa),
  `beamBase`, `nonBlocking` y `tickNow`.
- `g.channelInfo()` añade `rampPct`, `nonBlocking` y `beam` (el asa: `g.channelInfo().beam.setWidth(…)`).
- **Soltar o cortar antes del 1.er tic** (soltar, esquiva, golpe fuerte, control) cuenta como no lanzado: devuelve coste
  y enfriamiento, no dispara ③ `afterCast`, `CastInfo.aborted = true` y ⑭ `end = { kind: 'channel', casts: 0, ticks: 0, … }`.
  Todo `end` de canal trae `ticks`.

### 10.3 Haz vivo (S0)

- `g.spawnLiveBeam(opts)` → asa `{ update({ from, to }), setWidth(w, core?), setIntensity(k), setColor(c, coreColor?),
  pulse(k = 1), end(fade = 0,14), dispose(), alive, from, to, width, core, intensity }`.
- `opts`: `from` y `to` (Vector3, `{ x, y, z }` o función que se lee cada fotograma), `color` (0xb996ff), `coreColor`
  (0xffffff), `width` (0,5), `core` (0,15), `intensity` (1), `scroll` (6), `sparks` (true), `sparkEvery` (0,1) y `dur`
  (se apaga solo). Valores por defecto en `vfx.LIVE_BEAM_DEFAULTS`.
- `vfx.createLiveBeam(g, opts)` es la versión pura: sin DOM, el asa funciona sin malla. `g.tickLiveBeams(dt)` lo llama
  `tickSkillVerbs`; `resetCastState` los limpia. `handPos(p)` (export de `game-skills.js`) da la mano, a 1,2 m.
- `spawnBeam` sigue para los avisos de enemigos.

### 10.4 Barra, forja y rango (S0)

- `p.hotbarManual = { ranura: id }`: lo anota `assignHotbar`, se guarda (`PLAYER_SAVE_FIELDS`) y se valida al cargar.
- `skill-resolve.specBarUpgrade(p, ids?)` → `[{ slot, id, from }]`, `specBarSwapText(p, swap, tecla = 'T')` y
  `BAR_SLOT_NAME`. Lo llaman `Player.onSkillsLearned` y `applySpecBar`. `save-schema.SPEC_BAR_NOTICE =
  'barra-especializacion'`: el aviso de la pasada que recibe al cargar un v5 sin `hotbarManual`.
- **Forja por build:** `builds[key].forge = { skillId: 'i' | 'ii' | null }` (`null` = sin variante).
  `talents.forgeRecoFor(classId, specId, buildKey?)` pone la de la build encima de la de la especialización (sin clave, la
  `defaultBuild`); `game-talents.applyForgeReco(p, spec, { buildKey, force })`. Lo usan `chooseSpec` (solo lo nunca
  forjado, D3), `applyTalentBuild` («Recomendado» fija lo que declara la build), el banco (`bench-core`) y el libro
  (`hud-model.recoFor`, `recoPlan`, `specSwapSummary`).
- **`needsForm`** en un nodo o una opción: `{ skillId: cond | [cond] }` (todas a la vez), con `cond` ∈ `channel`,
  `pierce`, `charge`, `proj`, `area`, `detonate`, `chain`, `recast`, `trap`, `'type:x'`, `'tag:x'` o `'!cond'`.
  `skill-defs`: `FORM_NEEDS`, `formNeedValid`, `formNeedMet`, `formNeedText`. `talents.formVoids(p, skillId, def)` →
  `[{ id, name, conds, text }]`; `hud-model.voidsText(what, voids)`; `forgeView` da `vars[i].voids`/`voidText` y
  `voids`/`voidText` de la forma actual. `g.chooseForge` avisa y devuelve `{ …, voids }`. `test78` valida la clave.
- `skill-resolve.rankReq(sk)` = `spec ? min(req, TALENT_RULES.specAt) : req`. Lo usan `skillRank` y `hud-model.forgeView`
  (rango y `nextRankLv` del libro).
- Campo de nodo `needs` (D1, nivel de aprendizaje): `docs/paso2-implementacion.md` §3.1.

### 10.5 Control, golpe y sonido (S0)

- `Enemy.applyCC(kind, dur, { …, noDR: true })`: stun, freeze, knock o root sin SUMAR resistencia al control (la que ya
  hay lo sigue acortando).
- `vfx.hitStopMs('basicCrit')` = 40 ms (crítico del básico); `vfx.chargedShake(base, frac)`; tono `'thud'` en `sfx.js`.

### 10.6 Claves y APIs de las clases

| Clave o API | Dónde | Qué es |
|---|---|---|
| `dashSpeed` (m/s) | `dash` (`skill-defs`, `game-skills`) | La duración sale de la distancia; `dashT` pasa a ser el mínimo (Carga de Escudo a 8 m/s) |
| `dragPct { per, max }` | `dash` | +`per` % por arrastrado vivo al llegar, hasta `max`, al saco aditivo |
| Avances (motor) | `game-skills.js` | Anillo de llegada del color de la habilidad (`ctx.color` o `fx.color`) y estela cada 0,3 m, sin azar. Vale para las 3 clases |
| `mark.detonate.self` + `MARK_SELF_AGE` (0,5 s) | `game-skills.js` (`applyMark` guarda `at`; `markDetonation`) | La misma habilidad detona su marca solo con `self` y si la marca tiene ≥ 0,5 s: los martillos de un mismo lanzamiento no se detonan entre sí. Sin `self`, como antes |
| `markStatus(m)` | `hud-model.js` | Estado genérico «marca» en `enemyStatuses` (etiqueta = nombre ×usos; `icon` = arte de la habilidad que la puso). Sustituye a `STATUS.juicio`; `ui.js` pinta `x.icon` si viene |
| Tono `'gold'`, parpadeo y n.º de rombos | `world-marks.js` | Tiras sobre la barra de vida (sello del Juicio) |
| `foeGen { per, max }` | `g_remolino` (`params`) | Cada giro devuelve `per` de Furia por enemigo golpeado más allá del primero, hasta `max` |
| `pulse { n, every, pct }` | `g_u_cataclismo` (`params`) | Columna que arde: `n` golpes cada `every` s al `pct` % del impacto. No es el `pulse` de la Ciudadela |
| `ownDetonate` | `mech-guerrero.js` | +1 de Fervor seguro al detonar la marca propia del Juicio |
| `whoosh`, `zap`, `hum`, `absorb` | `sfx.js` | Giro del Remolino; descarga del Orbe; zumbido del Haz y del Desgarro; recogida del Orbe |
| `fanW` (m) y `spreadMin` (rad) | `proj` con `count` y básico de arma | Semiapertura = `atan(fanW / dist)`, entre `spreadMin` y `spread` |
| `fanSpread(def, dist, spread, targetR)` | `skill-defs.js` | Con `targetR` (blanco solo: `Player.basicAttack` pasa 0,55 × su escala si no hay otro a 2 m), `fanW` se estrecha a 0,8 × `targetR` |
| `perTarget` en el básico | `entities.js` (`basicAttack`) | Hasta N proyectiles del mismo disparo al mismo enemigo (también en la salpicadura) |
| `trap.hold` (s) | `trap` | El cepo que atrapa queda cerrado (`f.closed`), pegado al atrapado y detonable; si nadie lo detona, se gasta al acabar |
| `trap.boss { slowPct, stagger }` | `trap` | A un jefe no lo atrapa: lo muerde una vez (`trapBossBite`) y cada `TRAP_BOSS_EVERY` (0,5 s) lo ralentiza y le suma `stagger` de Quebranto por s hasta que lo detonan |
| `trap.skin`, `defineTrapSkin(id, def)`, `TRAP_SKINS` | `field-entities.js` | Aspecto de la trampa (`snap`, `burst`, `render` por `skinCall`); `'cepo'` lo registra `powers-arquera.js` |
| `f.closed` fuera de `maxPerSkill` | `field-entities.spawnField` | Un cepo cerrado ya saltó: no cuenta en el tope por habilidad |
| `TWIN_DELAY` (0,05 s) | `skills-arquera.js` (`a_andanada`) | Gemela de la flecha central de la Andanada, por la misma línea |
| `tenseFeel` | `powers-arquera.js` (Cuerda Tensa) | Sensación de los tensados: `tenseChargeFx` (brillo, anillo y chispas), `tenseBasic` (saeta del básico tensado) y un trazador por proyectil |
| `orbe_arcano`, kind `'magaOrb'`, `sweepOrbs`, `onWorldReset()` | `powers-maga.js` | Orbe propio dentro de `g.projectiles` (avanza con `update(dt)`); `sweepOrbs` apaga los que quedaron atrás al cambiar de zona |
| `desgarro_canal`, `riftDecal` | `powers-maga.js` | Desgarro canalizado y su fisura en el suelo |
| `g.skillProfile(p, id)` | `game-skills.js` (C1) | Perfil completo de una habilidad de la clase de `p` (`resolveSkillId`); `null` si no existe, es de otra clase o no hay héroe |

Quedan pedidas (cola abierta, `MEMORIA.md` §5): `onWorldReset()` desde `Game.loadWorld`, `recoFor` con la build
aplicada, `needsForm` «uno u otro», `noFlightLock` y una entidad viva genérica (`g.spawnEntity`), y `detonate.self` en
`VERB_DOC.mark`.
