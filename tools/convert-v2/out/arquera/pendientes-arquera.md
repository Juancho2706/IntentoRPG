# Pendientes · Arquera (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft arquera` desde `docs/mockups/data/talents-v2-arquera.js` (sha1 db6e09d7abe7, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 48 NUEVO · 25 existe · 0 vacío (nodos y opciones). **Forja:** 23 NUEVO · 4 existe · 0 vacío.

## Árbol de clase (c1…c30)

- [ ] **c1 Carcaj Profundo** — existe · `stats.mp · existe`
- [ ] **c2 Pulso Firme** — existe · `stats.dmgPct · existe`
- [ ] **c3 Paso de Gacela** — existe · `mod a_paso cdr · existe`
- [ ] **c4 Bomba Rápida** — existe · `mod a_humo cdr · existe`
- [ ] **c5·A Puntería Fija** — NUEVO · `power a_punteria_fija · NUEVO (onCast cast.forceCrit, cuenta por objetivo)`
- [ ] **c5·B Flecha Saqueadora** — NUEVO · `power a_saqueo · NUEVO (onKill + g.gainResource)`
- [ ] **c6·A A Bocajarro** — NUEVO · `power a_bocajarro · NUEVO (condAdd por distancia + knock)`
- [ ] **c6·B Tiro Lejano** — NUEVO · `power a_tiro_lejano · NUEVO (condAdd por distancia)`
- [ ] **c7 Paso Limpio** — existe · `mod a_paso cleanse · clave existente (prof.cleanse)`
- [ ] **c8 Difícil de Alcanzar** — existe · `tv.drMoving · existe`
- [ ] **c9·A Flecha Lastrada** — existe · `mod flecha_perforante slow/slowPct · claves existentes`
- [ ] **c9·B Punta de Diamante** — NUEVO · `power a_punta_diamante · NUEVO (condAdd al primer impacto)`
- [ ] **c10·A Flecha Roma** — NUEVO · `power a_flecha_roma · NUEVO (lógica de a_t_conmocion; onHit + applyCC slow)`
- [ ] **c10·B Flecha Silbante** — NUEVO · `power a_silbante · NUEVO (lógica de a_t_silencio; applyCC interrupt = 20 de Quebranto a jefes)`
- [ ] **c11·A Camuflaje (concede a_t_camuflaje)** — existe · `activa a_t_camuflaje · existe (+ power a_camuflaje)`
- [ ] **c11·B Instinto de Supervivencia** — NUEVO · `power a_instinto · NUEVO (onLethal + lanza a_humo como eco)`
- [ ] **c12 Respiración Pausada** — existe · `stats.regenPct (Energía) · existe`
- [ ] **c13 Ojo de Halcón** — existe · `stats.crit · existe`
- [ ] **c14·A Paso de Abrojos** — NUEVO · `power a_paso_abrojos · NUEVO (spawnField zona)`
- [ ] **c14·B Paso Sanador** — NUEVO · `power a_rodada_cura · NUEVO (g.heal self)`
- [ ] **c15·A Adrenalina** — NUEVO · `power a_adrenalina · NUEVO (④ onDamaged + addBuff dr)`
- [ ] **c15·B Calma Letal** — existe · `tv.highManaDmg (umbral 40 de Energía) · existe`
- [ ] **c16·A Presión Constante** — NUEVO · `power a_presion · NUEVO (condAdd con contador por objetivo)`
- [ ] **c16·B Barrido de Caza** — NUEVO · `power a_barrido · NUEVO (onHit + addBuff)`
- [ ] **c17·A Agilidad (concede agilidad)** — existe · `activa agilidad · existe (buff genérico con slowImmune)`
- [ ] **c17·B Huida Desesperada** — NUEVO · `power a_huida · NUEVO (onDamaged)`
- [ ] **c18 Humo Denso** — existe · `mod a_humo durS · existe`
- [ ] **c19 Tiro desde la Niebla** — NUEVO · `power a_tiro_niebla · NUEVO (onHit + campo zona)`
- [ ] **c20 Lluvia en Retirada** — NUEVO · `power a_lluvia_retirada · NUEVO (afterCast + eco de lluvia_flechas ×0,5)`
- [ ] **c21 Piernas de Corredora** — existe · `stats.spdPct · existe`
- [ ] **c22·A Flecha Bengala (concede a_t_bengala)** — existe · `activa a_t_bengala · existe (dmgPct → applyWeakness 10)`
- [ ] **c22·B Economía Letal** — existe · `tv.costRedBig {pct:20, over:20} · existe`
- [ ] **c23 Recarga en Marcha** — NUEVO · `power a_recarga_marcha · NUEVO (afterCast de cat spender)`
- [ ] **c24 Cadencia** — existe · `stats.aspdPct · existe`
- [ ] **c25 Emboscada** — NUEVO · `power a_emboscada · NUEVO (onTick: dentro→fuera; onCast forceCrit)`
- [ ] **c26 Compás** — NUEVO · `power a_compas · NUEVO (⑦ onCast: alterna basic/spender; stacks)`
- [ ] **c27 Tras la Rodada** — NUEVO · `power a_tras_rodada · NUEVO (afterCast + modifyResolve)`
- [ ] **c28 Manto de Niebla (final)** — NUEVO · `power a_manto · NUEVO (campo zona que sigue al dueño + g.heal target all en el radio)`
- [ ] **c29 Danza del Arco (final)** — NUEVO · `power a_danza_arco · NUEVO (lee a_compas)`
- [ ] **c30 Sombra Gemela (final)** — NUEVO · `power a_sombra · NUEVO (aliado sin vida que copia las principales como eco ×0,3–0,6)`

## Tiradora Veloz (v0…28)

- [ ] **v0 Impulso (clave, gratis)** — NUEVO · `mecánica impulso · existe (+ pérdida quieta NUEVA) · pasiva Tercera Flecha: power t_tercera · NUEVO (seq del básico)`
- [ ] **v1 Astiles Ligeros** — existe · `mod flecha_multiple cost · existe`
- [ ] **v2 Vendaval Largo** — NUEVO · `tv.galeT · NUEVO (clave; gaugeTuning impulso.galeT + tv)`
- [ ] **v3 Aire Fresco** — existe · `mod a_v_carrera cdr · claves`
- [ ] **v4 Puntas Templadas** — existe · `mod flecha_multiple dmg + power t_tercera (rango) · claves`
- [ ] **v5 Remate Triple** — NUEVO · `power t_remate_triple · NUEVO (afterCast pone el contador de seq a 2)`
- [ ] **v6 Soltar y Disparar** — NUEVO · `power t_soltar · NUEVO (onRelease del canal + eco de a_t_andanada ×0,6 sin desplazamiento)`
- [ ] **v7 Fondo de Corredora** — existe · `mod a_v_carrera channelT + slowImmune · claves`
- [ ] **v8·A Triple Abierto** — existe · `power t_tercera · opción (seq.onNth count 5)`
- [ ] **v8·B Triple Clavado** — NUEVO · `power t_triple_clavado · NUEVO (onCast forceCrit en el 3.º)`
- [ ] **v9·A Último Instante** — NUEVO · `power t_ultimo_instante · NUEVO (lee recast.left del canal)`
- [ ] **v9·B Ida y Vuelta** — NUEVO · `mod a_t_andanada recast.max +1 · clave NUEVA (tipo genérico recast)`
- [ ] **v10·A Rueda de Flechas** — NUEVO · `power t_rueda · NUEVO (tick del canal)`
- [ ] **v10·B Blanco Fijo** — NUEVO · `power t_blanco_fijo · NUEVO (condAdd por objetivo)`
- [ ] **v11 Mano Llena** — existe · `mod flecha_multiple proj · existe`
- [ ] **v12 Salto Impulsivo** — NUEVO · `power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva)`
- [ ] **v13 Saetas Afiladas** — existe · `mod dmg · claves`
- [ ] **v14 Vacío de Aire** — NUEVO · `power t_vacio_aire · NUEVO (onRelease del canal: atraer + addStagger)`
- [ ] **v15·A Piel de Brisa** — NUEVO · `power t_piel_brisa · NUEVO (condDr con gaugeState impulso.galeT)`
- [ ] **v15·B Retirada Instintiva** — NUEVO · `power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto)`
- [ ] **v16 Viento en las Plumas** — NUEVO · `power t_viento_plumas · NUEVO (condAdd con gaugeValue)`
- [ ] **v17 Nube de Paso** — NUEVO · `power t_nube_paso · NUEVO (tick del canal)`
- [ ] **v18 Flechas Perdidas** — NUEVO · `power t_flechas_perdidas · NUEVO (onKill + fireProjectile)`
- [ ] **v19 Vendaval Encadenado** — NUEVO · `power t_vendaval_encadenado · NUEVO (sustituye a t_galechain)`
- [ ] **v20 Pies Ligeros** — existe · `stats.spdPct · existe`
- [ ] **v21 Nube Fiel** — NUEVO · `power t_nube_fiel · NUEVO (modifyResolve del intervalo mientras canalizas)`
- [ ] **v22 Ráfaga Creciente** — NUEVO · `power t_rafaga_creciente · NUEVO (modifyResolve proj con contador)`
- [ ] **v23 Golpe de Apertura** — NUEVO · `power t_apertura · NUEVO (⑩ onGauge full + onCast forceCrit)`
- [ ] **v24 Ciclones** — NUEVO · `power t_ciclones · NUEVO (campo t_ciclon que dispara)`
- [ ] **v25 Tormenta de Plumas (final)** — NUEVO · `power t_tormenta_plumas · NUEVO (afterCast cada 3.ª: anillo de proyectiles)`
- [ ] **v26 Vaivén Eterno (final)** — NUEVO · `power t_vaiven · NUEVO (al cerrar la ventana de recast, cds = 0 si galeT > 0)`
- [ ] **v27 Galerna Infinita (final)** — NUEVO · `power t_galerna · NUEVO (canal sin fin con coste por tic)`
- [ ] **v28 Ojo del Huracán (ápice)** — NUEVO · `power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm)`

## Francotiradora (?0…28)

_(árbol vacío en esta versión de los datos)_

## Montaraz (?0…28)

_(árbol vacío en esta versión de los datos)_

## Héroe · Árbol héroe 1 (tiradora · francotiradora)

_(árbol vacío en esta versión de los datos)_

## Héroe · Árbol héroe 2 (tiradora · montaraz)

_(árbol vacío en esta versión de los datos)_

## Héroe · Árbol héroe 3 (francotiradora · montaraz)

_(árbol vacío en esta versión de los datos)_

## Activas de talento (ranura 2, sin forja)

- [ ] **a_t_camuflaje** Camuflaje · defense · Nv21 · concede c11 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **agilidad** Agilidad · utility · Nv27 · concede c17 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **a_t_bengala** Flecha Bengala · utility · Nv31 · concede c22 — existe en el juego: revisar texto y números contra la línea 2g

## Kit (KA1): habilidades base y de especialización

- [ ] **a_disparo** Disparo Rápido · basic · Nv1 · physical
- [ ] **flecha_perforante** Flecha Perforante · spender · Nv2 · physical
- [ ] **a_paso** Paso Veloz · movement · Nv4 · physical
- [ ] **a_humo** Bomba de Humo · defense · Nv6 · physical
- [ ] **lluvia_flechas** Lluvia de Flechas · spender · Nv8 · physical
- [ ] **a_t_andanada** Andanada · spec · Nv10 · tiradora · physical
- [ ] **a_v_carrera** Carrera del Viento · movement · Nv12 · tiradora · physical
- [ ] **flecha_multiple** Flecha Múltiple · spender · Nv14 · tiradora · physical
- [ ] **a_u_diluvio** Diluvio de Saetas · ultimate · Nv15 · tiradora · physical

## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)

### a_disparo · Disparo Rápido

- [ ] **Mejora · Mano Rápida** — NUEVO · `★set{cadence:.9}`
- [ ] **I (AREA) · Disparo Disperso** — NUEVO · `★set{count:3, spread:.218, coef:.45} (absorbe a Disparo Disperso)`
- [ ] **II (UNI) · Flecha de Cicuta** — NUEVO · `★elem nature · coef .7 · hitDot poison .5/4 s (absorbe a Flecha de Cicuta)`

### flecha_perforante · Flecha Perforante

- [ ] **Mejora · Astil de Fresno** — NUEVO · `range +15 · ★add{speed:+20%}`
- [ ] **I (AREA) · Flecha Explosiva** — NUEVO · `★set{pierce:false} · ★set{splash:.8, radius:3}`
- [ ] **II (UNI) · Tiro de Precisión** — NUEVO · `★set{windup:.35} · dmg +45`

### a_paso · Paso Veloz

- [ ] **Mejora · Ágil** — existe · `durS 1`
- [ ] **I (UNI) · Rodar y Disparar** — NUEVO · `★power v_rodar (afterCast)`
- [ ] **II (MOV) · Doble Rodada** — NUEVO · `★charges 2 · buff 0`

### a_humo · Bomba de Humo

- [ ] **Mejora · Humo Espeso** — existe · `radius +25`
- [ ] **I (AREA) · Humo Venenoso** — NUEVO · `dot poison · ★set{coef:.4}`
- [ ] **II (CTRL) · Estallido de Humo** — NUEVO · `★knock 3 · slow 2 · slowPct 40`

### lluvia_flechas · Lluvia de Flechas

- [ ] **Mejora · Cielo Plomizo** — NUEVO · `★add{waves:1}`
- [ ] **I (UNI) · Aguacero** — NUEVO · `radius −33 · ★set{span:.8} · dmg +40`
- [ ] **II (AGU) · Cortina** — NUEVO · `★set{allyDr:15, projMissPct:50} (zona)` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### a_t_andanada · Andanada

- [ ] **Mejora · Arco Ancho** — NUEVO · `★set{spread:150°}`
- [ ] **I (UNI) · Andanada Cerrada** — NUEVO · `★set{spread:30°} · range +3`
- [ ] **II (CTRL) · Andanada Repulsora** — NUEVO · `★knock 2 · slow 2 · slowPct 30 · dmg −15`

### a_v_carrera · Carrera del Viento

- [ ] **Mejora · Galope** — NUEVO · `★set{moveMul:1.55}`
- [ ] **I (UNI) · Carrera Certera** — NUEVO · `★set{autoShot.every:.6, autoShot.target:maxHp} · dmg +70`
- [ ] **II (AGU) · Carrera Esquiva** — NUEVO · `★set{projMissPct:40} · dmg −30` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### flecha_multiple · Flecha Múltiple

- [ ] **Mejora · Alcance Largo** — existe · `range +30`
- [ ] **I (AREA) · Abanico Abierto** — NUEVO · `★set{count:7, spread:90°, coef:.33}`
- [ ] **II (UNI) · Haz Cerrado** — NUEVO · `★set{count:3, spread:10°, pierce:true, coef:.55}`

### a_u_diluvio · Diluvio de Saetas

- [ ] **Mejora · Nube Ancha** — existe · `radius +25`
- [ ] **I (AREA) · Diluvio Anclado** — NUEVO · `★set{follow:false, at:target, radius:6}`
- [ ] **II (UNI) · Saetas Pesadas** — NUEVO · `★set{waves:4, span:2, radius:1.5, coef:5}`

## Barra y recomendaciones

Todas las referencias de barra y recomendaciones están en el catálogo.

Activas de talento del juego actual que dejan de serlo en 2g (pasan al kit de `skills-arquera.js` o se retiran; lista de cada doc): `a_t_voltereta`, `a_t_conmocion`, `a_t_silencio`, `a_t_apuntado`, `a_t_vision`, `a_t_disuasorio`, `a_t_cepo`, `a_t_arpon`, `a_t_senuelo`, `a_t_andanada`, `a_t_danza`, `a_t_salto`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`a_punteria_fija`, `a_saqueo`, `a_bocajarro`, `a_tiro_lejano`, `a_punta_diamante`, `a_flecha_roma`, `a_silbante`, `a_instinto`, `a_paso_abrojos`, `a_rodada_cura`, `a_adrenalina`, `a_presion`, `a_barrido`, `a_huida`, `a_tiro_niebla`, `a_lluvia_retirada`, `a_recarga_marcha`, `a_emboscada`, `a_compas`, `a_tras_rodada`, `a_manto`, `a_danza_arco`, `a_sombra`, `t_tercera`, `t_remate_triple`, `t_soltar`, `t_triple_clavado`, `t_ultimo_instante`, `t_rueda`, `t_blanco_fijo`, `t_salto_impulsivo`, `t_vacio_aire`, `t_piel_brisa`, `t_retirada`, `t_viento_plumas`, `t_nube_paso`, `t_flechas_perdidas`, `t_vendaval_encadenado`, `t_nube_fiel`, `t_rafaga_creciente`, `t_apertura`, `t_ciclones`, `t_tormenta_plumas`, `t_vaiven`, `t_galerna`, `t_ojo_huracan`, `v_rodar`

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **tiradora · Impulso** (0–100) — generar: +3 por cada acierto mientras te mueves (como mucho uno cada 0,15 s). Quieta no ganas · descargar: A 100: Vendaval 6 s. +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple · pérdida: Quieta más de 2 s: −10 por segundo. Al acabar el Vendaval vuelve a 0 · `impulso · perShot 3 · shotGap 0,15 · galeT 6 · galeAspd 25 · galeProj 1 · NUEVO: idleAfter 2 · idleRate 10`
- **francotiradora · Concentración** (0–100) — generar: Quieta: +20 por segundo · descargar: Cada punto da +0,15 % de crítico (+15 % a 100) · pérdida: Moverte: −25 por segundo · `concentracion · juego actual · pendiente (etapa 2)`
- **montaraz · Coto de Caza** (0–3 trampas) — generar: Trampa de Cepo: 1 carga, 8 s por carga · descargar: Un cepo pisado inmoviliza 2 s y se gasta. Presa: el primer élite o jefe que golpeas, 15 s · pérdida: Los cepos duran 30 s armados · `coto · juego actual · pendiente (etapa 2)`
