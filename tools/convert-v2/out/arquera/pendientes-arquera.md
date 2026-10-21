# Pendientes · Arquera (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft arquera` desde `docs/mockups/data/talents-v2-arquera.js` (sha1 76ae75357a1e, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 107 NUEVO · 35 existe · 45 vacío (nodos y opciones). **Forja:** 40 NUEVO · 11 existe · 0 vacío.

## Árbol de clase (c1…c30)

- [ ] **c1 Carcaj Profundo** — existe · `stats.mp · existe`
- [ ] **c2 Pulso Firme** — existe · `stats.dmgPct · existe`
- [ ] **c3 Paso de Gacela** — existe · `mod a_paso cdr · existe`
- [ ] **c4 Bomba Rápida** — existe · `mod a_humo cdr · existe`
- [ ] **c5·A Puntería Fija** — NUEVO · `power a_punteria_fija · NUEVO (onCast cast.forceCrit, cuenta por objetivo)`
- [ ] **c5·B Flecha Saqueadora** — NUEVO · `power a_saqueo · NUEVO (onKill + g.gainResource; una vez por lanzamiento)`
- [ ] **c6·A A Bocajarro** — NUEVO · `power a_bocajarro · NUEVO (condAdd por distancia + knock)`
- [ ] **c6·B Tiro Lejano** — NUEVO · `power a_tiro_lejano · NUEVO (condAdd por distancia)`
- [ ] **c7 Paso Limpio** — existe · `mod a_paso cleanse · clave existente (prof.cleanse)`
- [ ] **c8 Difícil de Alcanzar** — existe · `tv.drMoving · existe`
- [ ] **c9·A Flecha Lastrada** — existe · `mod flecha_perforante slow/slowPct · claves existentes`
- [ ] **c9·B Punta de Diamante** — NUEVO · `power a_punta_diamante · NUEVO (condAdd al primer impacto)`
- [ ] **c10·A Flecha Roma** — NUEVO · `power a_flecha_roma · NUEVO (lógica de a_t_conmocion; onHit + applyCC slow)`
- [ ] **c10·B Flecha Silbante** — NUEVO · `power a_silbante · NUEVO (lógica de a_t_silencio; applyCC interrupt = 20 de Quebranto a jefes)`
- [ ] **c11·A Camuflaje (concede a_t_camuflaje)** — existe · `activa a_t_camuflaje · existe (+ power a_camuflaje: cds a_paso = 0)`
- [ ] **c11·B Instinto de Supervivencia** — NUEVO · `power a_instinto · NUEVO (onLethal + lanza a_humo como eco)`
- [ ] **c12 Respiración Pausada** — existe · `stats.regenPct (Energía) · existe`
- [ ] **c13 Ojo de Halcón** — existe · `stats.crit · existe`
- [ ] **c14·A Paso de Abrojos** — NUEVO · `power a_paso_abrojos · NUEVO (spawnField zona)`
- [ ] **c14·B Paso Sanador** — NUEVO · `power a_rodada_cura · NUEVO (g.heal self; icd 12; ronda 3: por la cubeta de autocuración de la Arquera, 1 %/s)`
- [ ] **c15·A Adrenalina** — NUEVO · `power a_adrenalina · NUEVO (④ onDamaged + addBuff dr)`
- [ ] **c15·B Calma Letal** — existe · `tv.highManaDmg (umbral 40 de Energía) · existe`
- [ ] **c16·A Presión Constante** — NUEVO · `power a_presion · NUEVO (condAdd con contador por objetivo)`
- [ ] **c16·B Barrido de Caza** — NUEVO · `power a_barrido · NUEVO (onHit + addBuff)`
- [ ] **c17·A Agilidad (concede agilidad)** — existe · `activa agilidad · existe (buff genérico con slowImmune)`
- [ ] **c17·B Huida Desesperada** — NUEVO · `power a_huida · NUEVO (onDamaged)`
- [ ] **c18 Humo Denso** — existe · `mod a_humo durS · existe`
- [ ] **c19 Tiro desde la Niebla** — NUEVO · `power a_tiro_niebla · NUEVO (onHit + campo zona)`
- [ ] **c20 Lluvia en Retirada** — NUEVO · `power a_lluvia_retirada · NUEVO (afterCast + eco de lluvia_flechas ×0,3)`
- [ ] **c21 Piernas de Corredora** — existe · `stats.spdPct · existe`
- [ ] **c22·A Flecha Bengala (concede a_t_bengala)** — existe · `activa a_t_bengala · existe (applyWeakness 15 + weakenOutgoing 15)`
- [ ] **c22·B Economía Letal** — existe · `tv.costRedBig {pct:20, over:20} · existe`
- [ ] **c23 Recarga en Marcha** — NUEVO · `power a_recarga_marcha · NUEVO (afterCast de cat spender)`
- [ ] **c24 Cadencia** — existe · `stats.aspdPct · existe`
- [ ] **c25 Emboscada** — NUEVO · `power a_emboscada · NUEVO (onTick: dentro→fuera; onCast forceCrit)`
- [ ] **c26 Compás** — NUEVO · `power a_compas · NUEVO (⑦ onCast: alterna basic/spender; stacks)`
- [ ] **c27 Tras la Rodada** — NUEVO · `power a_tras_rodada · NUEVO (afterCast + modifyResolve)`
- [ ] **c28 Manto de Niebla (final)** — NUEVO · `power a_manto · NUEVO (campo que sigue al dueño: dr 25; su ceguera no se suma a la de otro humo; g.heal a los aliados dentro, no a la dueña: ronda 3)`
- [ ] **c29 Danza del Arco (final)** — NUEVO · `power a_danza_arco · NUEVO (lee a_compas)`
- [ ] **c30 Sombra Gemela (final)** — NUEVO · `power a_sombra · NUEVO (aliado sin vida que copia las principales como eco ×0,3–0,6)`

## Tiradora Veloz (v0…28)

- [ ] **v0 Impulso (clave, gratis)** — NUEVO · `mecánica impulso · existe (+ pérdida quieta NUEVA) · pasiva Tercera Flecha: power t_tercera · NUEVO (seq del básico)`
- [ ] **v1 Astiles Ligeros** — existe · `mod flecha_multiple cost · existe`
- [ ] **v2 Vendaval Largo** — NUEVO · `tv.galeT · NUEVO (clave; gaugeTuning impulso.galeT + tv)` · traducir: `tv.galeT: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`
- [ ] **v3 Aire Fresco** — existe · `mod a_v_carrera cdr · claves`
- [ ] **v4 Puntas Templadas** — existe · `mod flecha_multiple dmg + power t_tercera (rango) · claves`
- [ ] **v5 Remate Triple** — NUEVO · `power t_remate_triple · NUEVO (afterCast pone el contador de seq a 2)`
- [ ] **v6 Soltar y Disparar** — NUEVO · `power t_soltar · NUEVO (onRelease del canal + eco de a_t_andanada ×0,6 sin desplazamiento)`
- [ ] **v7 Fondo de Corredora** — existe · `mod a_v_carrera channelT + slowImmune · claves`
- [ ] **v8·A Triple Abierto** — existe · `power t_tercera · opción (seq.onNth count 5)`
- [ ] **v8·B Triple Clavado** — NUEVO · `power t_triple_clavado · NUEVO (onCast forceCrit en el 3.º)`
- [ ] **v9·A Último Instante** — NUEVO · `power t_ultimo_instante · NUEVO (lee recast.left del canal)`
- [ ] **v9·B Ida y Vuelta** — NUEVO · `mod a_t_andanada recast.max +1 · clave NUEVA (tipo genérico recast)` · traducir: `recast.max → recast.n (mod recastAdd)`
- [ ] **v10·A Rueda de Flechas** — NUEVO · `power t_rueda · NUEVO (tick del canal; ronda 2: 50 %, antes 40 %; ronda 3: 60 %, por el suelo del Diluvio)`
- [ ] **v10·B Blanco Fijo** — NUEVO · `power t_blanco_fijo · NUEVO (condAdd por objetivo)`
- [ ] **v11 Mano Llena** — existe · `mod flecha_multiple proj · existe`
- [ ] **v12 Salto Impulsivo** — NUEVO · `power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva)`
- [ ] **v13 Saetas Afiladas** — existe · `mod dmg · claves`
- [ ] **v14 Vacío de Aire** — NUEVO · `power t_vacio_aire · NUEVO (onRelease del canal: atraer + addStagger)`
- [ ] **v15·A Piel de Brisa** — NUEVO · `power t_piel_brisa · NUEVO (condDr con gaugeState impulso.galeT)`
- [ ] **v15·B Retirada Instintiva** — NUEVO · `power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto)`
- [ ] **v16 Viento en las Plumas** — NUEVO · `power t_viento_plumas · NUEVO (condAdd con gaugeValue)`
- [ ] **v17 Nube de Paso** — NUEVO · `power t_nube_paso · NUEVO (tick del canal; solo los 6 primeros s de cada Carrera; ronda 3: 0,4 s por rango, antes 0,5; cdReduce sobre @ultimate: respeta el suelo de las definitivas, 35 s)`
- [ ] **v18 Flechas Perdidas** — NUEVO · `power t_flechas_perdidas · NUEVO (onKill + fireProjectile)`
- [ ] **v19 Vendaval Encadenado** — NUEVO · `power t_vendaval_encadenado · NUEVO (sustituye a t_galechain)`
- [ ] **v20 Pies Ligeros** — existe · `stats.spdPct · existe`
- [ ] **v21 Nube Fiel** — NUEVO · `power t_nube_fiel · NUEVO (modifyResolve del intervalo; no cuenta la prórroga de Galerna Infinita)`
- [ ] **v22 Ráfaga Creciente** — NUEVO · `power t_rafaga_creciente · NUEVO (modifyResolve proj con contador)`
- [ ] **v23 Golpe de Apertura** — NUEVO · `power t_apertura · NUEVO (⑩ onGauge full + onCast forceCrit)`
- [ ] **v24 Ciclones** — NUEVO · `power t_ciclones · NUEVO (campo t_ciclon que dispara; ronda 2: 28 %, antes 35 %)`
- [ ] **v25 Tormenta de Plumas (final)** — NUEVO · `power t_tormenta_plumas · NUEVO (afterCast cada 3.ª: anillo de proyectiles; ronda 2: hasta 3 buscan al blanco de la Múltiple, con su propio tope de 3)`
- [ ] **v26 Vaivén Eterno (final)** — NUEVO · `power t_vaiven · NUEVO (al cerrar la ventana de recast, cds = 0 y coste ×0,5 si galeT > 0; usos por Vendaval 1/2/∞)`
- [ ] **v27 Galerna Infinita (final)** — NUEVO · `power t_galerna · NUEVO (prórroga del canal 2/4/∞ s; coste 10 + 3·t por s: ~6,5 s con 80 de Energía)`
- [ ] **v28 Ojo del Huracán (ápice)** — NUEVO · `power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm; rango 4: cdReduce sobre @ultimate, cuenta para el suelo de las definitivas)`

## Francotiradora (f0…28)

- [ ] **f0 Mira Serena (clave, gratis)** — NUEVO · `mecánica concentracion · existe (gainPerSec 15; perfectGain 15/3, Calma Absoluta y Respiro NUEVOS) · pasiva Cuerda Tensa: tipo genérico charge en a_disparo · NUEVO`
- [ ] **f1 Punta de Barrena** — existe · `mod a_t_apuntado dmg + range · claves`
- [ ] **f2 Ojo Paciente** — NUEVO · `tv.perfectMul · NUEVO (clave del tipo charge)` · traducir: `tv.perfectMul → perfectPct (×1,5 → 50, saco aditivo)`
- [ ] **f3 Cuerda Ligera** — NUEVO · `tv.chargeSpeed · NUEVO (clave del tipo charge)`
- [ ] **f4 Sobrepenetración** — NUEVO · `power f_sobrepenetracion · NUEVO (sustituye a f_overpen)`
- [ ] **f5 Línea de Mira** — NUEVO · `power f_linea_mira · NUEVO (onHit si cast.perfect: marca f_punto_debil 4 s)`
- [ ] **f6 Pulso Quieto** — NUEVO · `power f_pulso_quieto · NUEVO (modifyResolve charge.perfect ×1,5 con la postura)`
- [ ] **f7 Guardia Larga** — existe · `mod a_f_rodilla dur · claves`
- [ ] **f8·A Estela Explosiva** — NUEVO · `power f_estela · NUEVO (campo en línea con retardo)`
- [ ] **f8·B Doble Impacto** — NUEVO · `power f_doble_impacto · NUEVO (un solo impacto → eco ×0,6)`
- [ ] **f9·A Marca Saltarina** — NUEVO · `power f_marca_saltarina · NUEVO (onKill)`
- [ ] **f9·B Punto Vital** — NUEVO · `power f_punto_vital · NUEVO (condAdd + addStagger)`
- [ ] **f10·A Salva de Vigía** — NUEVO · `power f_salva · NUEVO (afterCast con la postura; ronda 2: 25 %, antes 40 %)`
- [ ] **f10·B Paciencia de Vigía** — NUEVO · `power f_paciencia · NUEVO (sustituye a f_patience; ronda 3: solo Disparo Apuntado, ni el básico tensado ni los haces; +15 % hasta +45 %)`
- [ ] **f11 Fila Rota** — NUEVO · `power f_fila_rota · NUEVO (onKill + gainResource + gainGauge)`
- [ ] **f12 Lectura del Blanco** — NUEVO · `power f_lectura · NUEVO (modifyResolve charge.perfect contra el marcado)`
- [ ] **f13 Puntería de Vigía** — NUEVO · `power f_punteria_vigia · NUEVO (condAdd con la postura)`
- [ ] **f14 Estrella Fija** — NUEVO · `power f_estrella_fija · NUEVO (onCast de a_t_apuntado si cast.perfect y la Calma Absoluta está activa: ronda 3; el básico y los haces no cuentan; cdReduce sobre @ultimate: respeta el suelo de las definitivas)`
- [ ] **f15·A Quietud** — NUEVO · `tv.drStill · NUEVO (clave, espejo de drMoving)`
- [ ] **f15·B Nervios de Acero** — NUEVO · `power f_nervios · NUEVO (④ onDamaged + g.shield; ronda 3: por la cubeta de autocuración de la Arquera, 1 %/s)`
- [ ] **f16 Serenidad** — NUEVO · `power f_serenidad · NUEVO (condAdd con gaugeValue)`
- [ ] **f17 Haces Gemelos** — NUEVO · `power f_haces_gemelos · NUEVO (eco del haz; un eco no repite; ronda 3: 35/70 %, antes 15/30 %: con el suelo de las definitivas la recarga ya no hace bucle)`
- [ ] **f18 Rebote Certero** — NUEVO · `power f_rebote · NUEVO (proyectil que vuelve; el eco no rebota)`
- [ ] **f19 Herida Expuesta** — NUEVO · `power f_herida_expuesta · NUEVO (applyWeakness mientras dura la marca)`
- [ ] **f20 Vista Larga** — existe · `mod range + condAdd por distancia · claves`
- [ ] **f21 Firmamento** — NUEVO · `power f_firmamento · NUEVO (cdRate ×1,2 con la postura; ronda 2: ×1,4; ronda 3: ×1,2 y suelo de las definitivas, 35 s)`
- [ ] **f22 Saetas Paralelas** — NUEVO · `power f_paralelas · NUEVO (afterCast si cast.perfect)`
- [ ] **f23 Herida sobre Herida** — NUEVO · `power f_heridas · NUEVO (stacks por objetivo; condAdd)`
- [ ] **f24 Ojo Entrenado** — NUEVO · `power f_ojo_entrenado · NUEVO (onTick con la postura; charge.instant)`
- [ ] **f25 Línea Mortal (final)** — NUEVO · `power f_linea_mortal · NUEVO (charge.full → haz + estallido en línea)`
- [ ] **f26 Disparo Imposible (final)** — NUEVO · `power f_disparo_imposible · NUEVO (sustituye a f_impossible; como mucho un doble por segundo; la 2.ª no da Herida ni Concentración)`
- [ ] **f27 Atalaya Eterna (final)** — NUEVO · `power f_atalaya · NUEVO (postura de 20/30/∞ s + eco de un haz de a_u_celeste ×0,5 que cae sobre el blanco y no atraviesa; ronda 3: 200 %, antes 160 %)`
- [ ] **f28 Ojo Inmóvil (ápice)** — NUEVO · `power f_ojo_inmovil (rangos) · NUEVO (sustituye a f_weakspot; rango 4: cdReduce sobre @ultimate, cuenta para el suelo de las definitivas)`

## Montaraz (m0…28)

- [ ] **m0 Coto de Caza (clave, gratis)** — NUEVO · `mecánica coto · existe (+ Batida NUEVA) · pasiva Cebo de Caza: power m_cebo · NUEVO (sustituye al +25 % de Quebranto)`
- [ ] **m1 Muelles Ligeros** — existe · `mod a_t_cepo cdr · existe`
- [ ] **m2 Olfato de Presa** — existe · `tv.preyDmg · existe`
- [ ] **m3 Raíz Rápida** — existe · `mod a_u_zarzas cdr · claves`
- [ ] **m4 Pólvora Negra** — existe · `mod dmg · claves`
- [ ] **m5 Presa Atrapada** — NUEVO · `power m_presa_atrapada · NUEVO (icd 10 s para el estallido y la carga; las trampas que salta Gran Cacería no la activan)`
- [ ] **m6 Cerco a la Presa** — NUEVO · `power m_cerco_presa · NUEVO (campo m_zarzal)`
- [ ] **m7 Raíces Profundas** — existe · `mod a_u_zarzas crossRoot · claves`
- [ ] **m8·A Racimo de Cepos** — NUEVO · `power m_racimo · NUEVO (afterCast: 2 cepos más ×0,35; coto cuenta 1)`
- [ ] **m8·B Cepo Reforzado** — NUEVO · `power m_cepo_reforzado · NUEVO (rejuicio: 3 × 20 %, antes 3 × 30 %)`
- [ ] **m9·A Presas en Manada** — NUEVO · `power m_manada · NUEVO (coto.preyMax 3)`
- [ ] **m9·B Presa Herida** — NUEVO · `power m_presa_herida · NUEVO (applyWeakness 10 + addStagger)`
- [ ] **m10·A Zarzal Creciente** — NUEVO · `power m_creciente · NUEVO (radio por tic)`
- [ ] **m10·B Zarzal Asfixiante** — NUEVO · `power m_asfixiante · NUEVO (stacks por objetivo)`
- [ ] **m11 Metralla** — NUEVO · `power m_metralla · NUEVO (fireProjectile ×N; ni los cepos sembrados ni los pequeños sueltan)`
- [ ] **m12 Acoso** — NUEVO · `power m_acoso · NUEVO (addStagger; applyCC slow a élites; ya no da Debilidad)`
- [ ] **m13 Espino Venenoso** — existe · `tv.poisonPct · existe`
- [ ] **m14 Semillas de Zarza** — NUEVO · `power m_semillas · NUEVO (campo m_zarzal)`
- [ ] **m15·A Cepo de Huida** — NUEVO · `power m_cepo_huida · NUEVO (④ onDamaged)`
- [ ] **m15·B Guarida** — NUEVO · `power m_guarida · NUEVO (condDr)`
- [ ] **m16 Coto Cerrado** — NUEVO · `power m_coto_cerrado · NUEVO (condAdd con gaugeValue)`
- [ ] **m17 Zarzas Trepadoras** — NUEVO · `power m_trepadoras · NUEVO`
- [ ] **m18 Rearme Rápido** — NUEVO · `power m_rearme · NUEVO (por detonación, no por trampa; los cepos pequeños y sembrados no cuentan; Salto ≥ 5 s)`
- [ ] **m19 Rastro Fresco** — NUEVO · `power m_rastro · NUEVO (onKill)`
- [ ] **m20 Ojo de Trampera** — existe · `tv.fieldDur · claves`
- [ ] **m21 Rebrote** — NUEVO · `power m_rebrote · NUEVO (campo m_zarzal ×3)`
- [ ] **m22 Campo Sembrado** — NUEVO · `power m_campo_sembrado · NUEVO (afterCast)`
- [ ] **m23 Batida Mayor** — NUEVO · `tv.batidaDur + tv.batidaPreyStagger · NUEVO (claves de la mecánica coto; ya no sube la Debilidad)` · traducir: `tv.batidaDur: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`; `tv.batidaPreyStagger: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`
- [ ] **m24 Siembra de Espinas** — NUEVO · `power m_siembra · NUEVO (campo m_zarzal)`
- [ ] **m25 Tierra Arrasada (final)** — NUEVO · `power m_tierra_arrasada · NUEVO (solo siembran los cepos de carga; 6 pequeños vivos como mucho)`
- [ ] **m26 Gran Cacería (final)** — NUEVO · `power m_gran_caceria · NUEVO (sustituye a m_greathunt; rejuicio: las trampas que saltan hacen el 50 % y cuentan para el tope de 2 estallidos; ronda 2: no activan Presa Atrapada, m5; ronda 3: ni cuentan para Corazón del Bosque 4)`
- [ ] **m27 Bosque Vivo (final)** — NUEVO · `power m_bosque_vivo · NUEVO (eco de a_u_zarzas de 2/3/4 s; uno vivo; ronda 2: solo controla, coef 0 y sin el estallido al cerrarse)`
- [ ] **m28 Corazón del Bosque (ápice)** — NUEVO · `power m_corazon_bosque (rangos) · NUEVO (sustituye a m_thornweb; ronda 3, rango 4: cuenta los cepos de carga que estallan por Flecha Detonante, Salto de Acecho o Detonación en Cadena —un Racimo cuenta 1; no cuentan los pequeños, los sembrados, el cepo gratis del rango 2, las minas pisadas ni los que salta Gran Cacería—; icd 90; el Cerco gratis va aparte del suelo de las definitivas)`

## Héroe · Errante del Viento (tiradora · francotiradora)

- [ ] **q0 Ráfagas (clave, gratis)** — NUEVO · `power q_rafagas · NUEVO (contador por tiempo; afterCast de spender/spec)`
- [ ] **q1 Brisa Constante** — vacío
- [ ] **q2·A Viento a Favor** — vacío
- [ ] **q2·B Aire Quieto** — vacío
- [ ] **q3 Plumas de Aire** — vacío
- [ ] **q4·A Torbellino (concede a_h_torbellino)** — vacío
- [ ] **q4·B Corriente Protectora** — vacío
- [ ] **q5 Aire Afilado** — vacío
- [ ] **q6 Empuje del Aire** — vacío
- [ ] **q7 Rachas** — vacío
- [ ] **q8·A Ojo de la Racha** — vacío
- [ ] **q8·B Abanico de Aire** — vacío
- [ ] **q9 Aire Pesado** — vacío
- [ ] **q10 Tormenta Guardada** — vacío
- [ ] **q11 Silbido** — vacío
- [ ] **q12 Rosa de los Vientos (final)** — vacío

## Héroe · Carcaj Encantado (tiradora · montaraz)

- [ ] **w0 Puntas Encantadas (clave, gratis)** — NUEVO · `power w_puntas · NUEVO (onCast cada 6 s; rota fire/frost/lightning; una punta por enemigo cada 1 s; la quemadura se renueva; ronda 3: las tres de Desborde cuentan como una)`
- [ ] **w1 Encantamiento Rápido** — vacío
- [ ] **w2·A Punta Mayor** — vacío
- [ ] **w2·B Punta Repartida** — vacío
- [ ] **w3 Trampa Encantada** — vacío
- [ ] **w4·A Desborde de Puntas (concede a_h_puntas)** — vacío
- [ ] **w4·B Punta Curativa** — vacío
- [ ] **w5 Fuego Prendido** — vacío
- [ ] **w6 Hielo Hondo** — vacío
- [ ] **w7 Trenza de Puntas** — vacío
- [ ] **w8·A Chispa Saltarina** — vacío
- [ ] **w8·B Hielo Mordiente** — vacío
- [ ] **w9 Puntas Afines** — vacío
- [ ] **w10 Encantamiento Hondo** — vacío
- [ ] **w11 Punta Viva** — vacío
- [ ] **w12 Lluvia Encantada (final)** — vacío

## Héroe · Halconera (francotiradora · montaraz)

- [ ] **y0 Halcón Cazador (clave, gratis)** — NUEVO · `power y_halcon · NUEVO (aliado sin vida; picado = eco con marca)`
- [ ] **y1 Alas Rápidas** — vacío
- [ ] **y2·A Picado Hondo** — vacío
- [ ] **y2·B Vuelo Rasante** — vacío
- [ ] **y3 Presa Señalada** — vacío
- [ ] **y4·A Llamada del Halcón (concede a_h_halcon)** — vacío
- [ ] **y4·B Alas Protectoras** — vacío
- [ ] **y5 Garras Afiladas** — vacío
- [ ] **y6 Grito del Halcón** — vacío
- [ ] **y7 Cetrería** — vacío
- [ ] **y8·A Bandada** — vacío
- [ ] **y8·B Halcón Peregrino** — vacío
- [ ] **y9 Plumas Cortantes** — vacío
- [ ] **y10 Ojo Compartido** — vacío
- [ ] **y11 Halcón Fiel** — vacío
- [ ] **y12 Cielo de Halcones (final)** — vacío

## Activas de talento (ranura 2, sin forja)

- [ ] **a_t_camuflaje** Camuflaje · defense · Nv21 · concede c11 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **agilidad** Agilidad · utility · Nv27 · concede c17 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **a_t_bengala** Flecha Bengala · utility · Nv31 · concede c22 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **a_h_torbellino** Torbellino · utility · Nv72 · concede q4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [ ] **a_h_puntas** Desborde de Puntas · utility · Nv72 · concede w4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [ ] **a_h_halcon** Llamada del Halcón · utility · Nv72 · concede y4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)

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
- [ ] **a_t_apuntado** Disparo Apuntado · spec · Nv10 · francotiradora · physical
- [ ] **a_f_rodilla** Rodilla en Tierra · utility · Nv12 · francotiradora · physical
- [ ] **a_f_rastreador** Tiro Rastreador · spender · Nv14 · francotiradora · physical
- [ ] **a_u_celeste** Tiro Celestial · ultimate · Nv15 · francotiradora · physical
- [ ] **a_t_cepo** Trampa de Cepo · spec · Nv10 · montaraz · nature
- [ ] **a_m_acecho** Salto de Acecho · movement · Nv12 · montaraz · physical
- [ ] **a_m_detonante** Flecha Detonante · spender · Nv14 · montaraz · physical
- [ ] **a_u_zarzas** Cerco de Zarzas · ultimate · Nv15 · montaraz · nature

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
- [ ] **I (UNI) · Andanada Cerrada** — NUEVO · `★set{spread:30°, perTarget:3} · range +3 (tope por salto)` · línea de 85 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (CTRL) · Andanada Repulsora** — NUEVO · `★knock 2 · slow 2 · slowPct 30 · dmg −15`

### a_v_carrera · Carrera del Viento

- [ ] **Mejora · Galope** — NUEVO · `★set{moveMul:1.55}`
- [ ] **I (UNI) · Carrera Certera** — NUEVO · `★set{autoShot.every:.6, autoShot.target:maxHp} · dmg +70`
- [ ] **II (AGU) · Carrera Esquiva** — NUEVO · `★set{projMissPct:40} · dmg −30` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### flecha_multiple · Flecha Múltiple

- [ ] **Mejora · Alcance Largo** — existe · `range +30`
- [ ] **I (AREA) · Abanico Abierto** — NUEVO · `★set{count:7, spread:90°, coef:.38}`
- [ ] **II (UNI) · Haz Cerrado** — NUEVO · `★set{count:3, spread:10°, pierce:true, coef:.55}`

### a_u_diluvio · Diluvio de Saetas

- [ ] **Mejora · Nube Ancha** — existe · `radius +25`
- [ ] **I (AREA) · Diluvio Anclado** — NUEVO · `★set{follow:false, at:target, radius:6}`
- [ ] **II (UNI) · Saetas Pesadas** — NUEVO · `★set{waves:4, span:2, radius:1.5, coef:7}`

### a_t_apuntado · Disparo Apuntado

- [ ] **Mejora · Tensado Rápido** — NUEVO · `★set{charge.max:1.3}`
- [ ] **I (AREA) · Tres Saetas** — NUEVO · `★set{charge.fullCount:3, spread:20°, coef ×0,4}` · traducir: `charge.fullCount → charge.full.count (+ full.spread, full.coefMul)` · línea de 83 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (UNI) · Tiro Pesado** — NUEVO · `★set{charge.max:2.5, charge.coefMax:3, pierce:false}` · traducir: `charge.coefMax → set: { 'charge.scale.coef.1': v } (coeficiente a carga completa de scale.coef [aMin, aMax])`

### a_f_rodilla · Rodilla en Tierra

- [ ] **Mejora · Rodilla Firme** — NUEVO · `★set{chargeMul:1.5}` · traducir: `chargeMul → chargeSpeed (%)` · línea de 71 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **I (UNI) · Puesto Fijo** — NUEVO · `★set{moveMul:0, chargeMul:2} · dmg +15 (Apuntado y haces)` · traducir: `chargeMul → chargeSpeed (%)` · línea de 86 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AGU) · Parapeto** — NUEVO · `★set{dr:30, projMissPct:50}` · traducir: `dr → set: { 'buff.dr': v } (DR del buff; en una postura, stance.modes[i].stats.dr)` · línea de 82 > 70 (aviso A1: acortar o divergencias.json)

### a_f_rastreador · Tiro Rastreador

- [ ] **Mejora · Marca Duradera** — existe · `mark.dur 12`
- [ ] **I (AREA) · Rastreo Múltiple** — NUEVO · `★set{markCount:3, markRadius:4, mark.dur:6}` · traducir: `markCount → mark.count`; `markRadius → mark.radius`
- [ ] **II (CTRL) · Grillete** — existe · `slow 8 · slowPct 50 · stagger 20 (jefes)`

### a_u_celeste · Tiro Celestial

- [ ] **Mejora · Cielo Abierto** — existe · `window 10` · traducir: `window → recast.win`
- [ ] **I (AREA) · Lluvia Estelar** — NUEVO · `★set{at:target, radius:4, coef:1.5, pierce:false}`
- [ ] **II (UNI) · Haz Único** — NUEVO · `★set{shots:1, charge.max:3, charge.coefMax:10}` · traducir: `charge.coefMax → set: { 'charge.scale.coef.1': v } (coeficiente a carga completa de scale.coef [aMin, aMax])`

### a_t_cepo · Trampa de Cepo

- [ ] **Mejora · Muelles Firmes** — existe · `armT .2`
- [ ] **I (AREA) · Mina de Espinas** — NUEVO · `★set{root:0, burst:{radius:3, coef:1}}`
- [ ] **II (CTRL) · Red de Caza** — NUEVO · `★set{radius:3, root:2.5} · absorbe a Red de Caza (a_red)` · línea de 76 > 70 (aviso A1: acortar o divergencias.json)

### a_m_acecho · Salto de Acecho

- [ ] **Mejora · Acecho Lejano** — existe · `range 20`
- [ ] **I (CTRL) · Acecho Enredador** — NUEVO · `★set{consume:false, root:1.5, radius:3}`
- [ ] **II (MOV) · Doble Acecho** — NUEVO · `★charges 2 · dmg −30`

### a_m_detonante · Flecha Detonante

- [ ] **Mejora · Pólvora Fina** — existe · `radius +33`
- [ ] **I (AREA) · Detonación en Cadena** — NUEVO · `★set{chain:6}`
- [ ] **II (CTRL) · Flecha de Garfio** — NUEVO · `★set{splash:0, pull:{to:trap, dist:6}} · absorbe al Arpón (a_t_arpon)`

### a_u_zarzas · Cerco de Zarzas

- [ ] **Mejora · Espinas Duraderas** — existe · `dur 10`
- [ ] **I (UNI) · Jaula de Espinas** — NUEVO · `★set{radius:3, target:one, trapIn:true} · dmg +30 (ronda 3; antes +60)` · traducir: `target → at: "enemy"`; `trapIn → contain (campo)` · línea de 71 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AGU) · Señuelo de Zarzas** — NUEVO · `★set{decoy:{dur:6, radius:10}} · absorbe al Señuelo de Paja (a_t_senuelo)` · traducir: `decoy → lure { radius, dur }`

## Barra y recomendaciones

Todas las referencias de barra y recomendaciones están en el catálogo.

Activas de talento NUEVAS (en `--write` no entran en `ARQUERA_TALENT_SKILLS` hasta que existan): `a_h_torbellino`, `a_h_puntas`, `a_h_halcon`.

Activas de talento del juego v1 que dejan de serlo en 2g (pasan al kit de `skills-arquera.js` o se retiran; lista de cada doc): `a_t_voltereta`, `a_t_conmocion`, `a_t_silencio`, `a_t_apuntado`, `a_t_vision`, `a_t_disuasorio`, `a_t_cepo`, `a_t_arpon`, `a_t_senuelo`, `a_t_andanada`, `a_t_danza`, `a_t_salto`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`a_punteria_fija`, `a_saqueo`, `a_bocajarro`, `a_tiro_lejano`, `a_punta_diamante`, `a_flecha_roma`, `a_silbante`, `a_instinto`, `a_paso_abrojos`, `a_rodada_cura`, `a_adrenalina`, `a_presion`, `a_barrido`, `a_huida`, `a_tiro_niebla`, `a_lluvia_retirada`, `a_recarga_marcha`, `a_emboscada`, `a_compas`, `a_tras_rodada`, `a_manto`, `a_danza_arco`, `a_sombra`, `t_tercera`, `t_remate_triple`, `t_soltar`, `t_triple_clavado`, `t_ultimo_instante`, `t_rueda`, `t_blanco_fijo`, `t_salto_impulsivo`, `t_vacio_aire`, `t_piel_brisa`, `t_retirada`, `t_viento_plumas`, `t_nube_paso`, `t_flechas_perdidas`, `t_vendaval_encadenado`, `t_nube_fiel`, `t_rafaga_creciente`, `t_apertura`, `t_ciclones`, `t_tormenta_plumas`, `t_vaiven`, `t_galerna`, `t_ojo_huracan`, `f_sobrepenetracion`, `f_linea_mira`, `f_pulso_quieto`, `f_estela`, `f_doble_impacto`, `f_marca_saltarina`, `f_punto_vital`, `f_salva`, `f_paciencia`, `f_fila_rota`, `f_lectura`, `f_punteria_vigia`, `f_estrella_fija`, `f_nervios`, `f_serenidad`, `f_haces_gemelos`, `f_rebote`, `f_herida_expuesta`, `f_firmamento`, `f_paralelas`, `f_heridas`, `f_ojo_entrenado`, `f_linea_mortal`, `f_disparo_imposible`, `f_atalaya`, `f_ojo_inmovil`, `m_cebo`, `m_presa_atrapada`, `m_cerco_presa`, `m_racimo`, `m_cepo_reforzado`, `m_manada`, `m_presa_herida`, `m_creciente`, `m_asfixiante`, `m_metralla`, `m_acoso`, `m_semillas`, `m_cepo_huida`, `m_guarida`, `m_coto_cerrado`, `m_trepadoras`, `m_rearme`, `m_rastro`, `m_rebrote`, `m_campo_sembrado`, `m_siembra`, `m_tierra_arrasada`, `m_gran_caceria`, `m_bosque_vivo`, `m_corazon_bosque`, `q_rafagas`, `w_puntas`, `y_halcon`, `v_rodar`

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **tiradora · Impulso** (0–100) — generar: +3 por cada acierto mientras te mueves (como mucho uno cada 0,15 s). Quieta no ganas · descargar: A 100: Vendaval 6 s. +25 % de velocidad de ataque y +1 flecha a Flecha Múltiple · pérdida: Quieta más de 2 s: −10 por segundo. Al acabar el Vendaval vuelve a 0 · `impulso · perShot 3 · shotGap 0,15 · galeT 6 · galeAspd 25 · galeProj 1 · NUEVO: idleAfter 2 · idleRate 10`
- **francotiradora · Concentración** (0–100) — generar: Quieta: +15 por segundo. Perfecto de Disparo Apuntado o de un haz: +15 (uno por segundo); del básico: +3 · descargar: Cada punto: +0,15 % de crítico. A 100: Calma Absoluta 5 s, es perfecto todo tensado a media carga o más · pérdida: Moverte: −25 por segundo (de rodillas, nada). Tras la Calma vuelve a 0 y no sube durante 7 s (Respiro) · `concentracion · gainPerSec 15 (antes 20) · NUEVO: perfectGain 15 (Apuntado y haces; 1 por s) · basicPerfectGain 3 · losePerSec 25 · critPerPoint 0,15 · NUEVO: calmT 5 (perfecto desde media carga; chargeMul 1,5 en Apuntado y haces) · calmLock 7`
- **montaraz · Coto de Caza** (0–3 trampas) — generar: Cada trampa armada suma 1 (hasta 3; un Racimo cuenta como 1). Presa: el primer élite o jefe que golpeas, 15 s · descargar: Si estallan 3 trampas a la vez: Batida, los alcanzados y tu Presa reciben +15 % de daño 6 s (una cada 12 s) · pérdida: Una trampa sin pisar se desarma a los 30 s. La Presa se pierde a los 15 s sin golpearla · `coto · maxArmed 3 · armT 0,5 · armLife 30 · preyT 15 · NUEVO: batida (3 estallidos en 1 s) dmgTaken 15 · 6 s · icd 12 · cebo 6 m · detonate.perTarget 2`
