# Pendientes · Arquera (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft arquera` desde `docs/mockups/data/talents-v2-arquera.js` (sha1 76ae75357a1e, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 107 NUEVO · 35 existe · 45 vacío (nodos y opciones). **Forja:** 40 NUEVO · 11 existe · 0 vacío.

> **Estado (tanda 2, KAT-arquera):** los 187 nodos u opciones de clase, especializaciones y árboles héroe están marcados porque `tests/test-talentos-arquera.mjs` comprueba el efecto de cada uno con el catálogo y la forja reales. Su cobertura final lo exige: 187 con una comprobación que pasa y lo nombra, 0 sin efecto. Las 51 piezas de la forja las mide `tests/test-forge-arquera.mjs`, ya sin pendientes de motor. Lo que queda está en «Tanda 2», al final.

## Árbol de clase (c1…c30)

- [x] **c1 Carcaj Profundo** — existe · `stats.mp · existe`
- [x] **c2 Pulso Firme** — existe · `stats.dmgPct · existe`
- [x] **c3 Paso de Gacela** — existe · `mod a_paso cdr · existe`
- [x] **c4 Bomba Rápida** — existe · `mod a_humo cdr · existe`
- [x] **c5·A Puntería Fija** — NUEVO · `power a_punteria_fija · NUEVO (onCast cast.forceCrit, cuenta por objetivo)`
- [x] **c5·B Flecha Saqueadora** — NUEVO · `power a_saqueo · NUEVO (onKill + g.gainResource; una vez por lanzamiento)`
- [x] **c6·A A Bocajarro** — NUEVO · `power a_bocajarro · NUEVO (condAdd por distancia + knock)`
- [x] **c6·B Tiro Lejano** — NUEVO · `power a_tiro_lejano · NUEVO (condAdd por distancia)`
- [x] **c7 Paso Limpio** — existe · `mod a_paso cleanse · clave existente (prof.cleanse)`
- [x] **c8 Difícil de Alcanzar** — existe · `tv.drMoving · existe`
- [x] **c9·A Flecha Lastrada** — existe · `mod flecha_perforante slow/slowPct · claves existentes`
- [x] **c9·B Punta de Diamante** — NUEVO · `power a_punta_diamante · NUEVO (condAdd al primer impacto)`
- [x] **c10·A Flecha Roma** — NUEVO · `power a_flecha_roma · NUEVO (lógica de a_t_conmocion; onHit + applyCC slow)`
- [x] **c10·B Flecha Silbante** — NUEVO · `power a_silbante · NUEVO (lógica de a_t_silencio; applyCC interrupt = 20 de Quebranto a jefes)`
- [x] **c11·A Camuflaje (concede a_t_camuflaje)** — existe · `activa a_t_camuflaje · existe (+ power a_camuflaje: cds a_paso = 0)`
- [x] **c11·B Instinto de Supervivencia** — NUEVO · `power a_instinto · NUEVO (onLethal + lanza a_humo como eco)`
- [x] **c12 Respiración Pausada** — existe · `stats.regenPct (Energía) · existe`
- [x] **c13 Ojo de Halcón** — existe · `stats.crit · existe`
- [x] **c14·A Paso de Abrojos** — NUEVO · `power a_paso_abrojos · NUEVO (spawnField zona)`
- [x] **c14·B Paso Sanador** — NUEVO · `power a_rodada_cura · NUEVO (g.heal self; icd 12; ronda 3: por la cubeta de autocuración de la Arquera, 1 %/s)`
- [x] **c15·A Adrenalina** — NUEVO · `power a_adrenalina · NUEVO (④ onDamaged + addBuff dr)`
- [x] **c15·B Calma Letal** — existe · `tv.highManaDmg (umbral 40 de Energía) · existe`
- [x] **c16·A Presión Constante** — NUEVO · `power a_presion · NUEVO (condAdd con contador por objetivo)`
- [x] **c16·B Barrido de Caza** — NUEVO · `power a_barrido · NUEVO (onHit + addBuff)`
- [x] **c17·A Agilidad (concede agilidad)** — existe · `activa agilidad · existe (buff genérico con slowImmune)`
- [x] **c17·B Huida Desesperada** — NUEVO · `power a_huida · NUEVO (onDamaged)`
- [x] **c18 Humo Denso** — existe · `mod a_humo durS · existe`
- [x] **c19 Tiro desde la Niebla** — NUEVO · `power a_tiro_niebla · NUEVO (onHit + campo zona)`
- [x] **c20 Lluvia en Retirada** — NUEVO · `power a_lluvia_retirada · NUEVO (afterCast + eco de lluvia_flechas ×0,3)`
- [x] **c21 Piernas de Corredora** — existe · `stats.spdPct · existe`
- [x] **c22·A Flecha Bengala (concede a_t_bengala)** — existe · `activa a_t_bengala · existe (applyWeakness 15 + weakenOutgoing 15)`
- [x] **c22·B Economía Letal** — existe · `tv.costRedBig {pct:20, over:20} · existe`
- [x] **c23 Recarga en Marcha** — NUEVO · `power a_recarga_marcha · NUEVO (afterCast de cat spender)`
- [x] **c24 Cadencia** — existe · `stats.aspdPct · existe`
- [x] **c25 Emboscada** — NUEVO · `power a_emboscada · NUEVO (onTick: dentro→fuera; onCast forceCrit)`
- [x] **c26 Compás** — NUEVO · `power a_compas · NUEVO (⑦ onCast: alterna basic/spender; stacks)`
- [x] **c27 Tras la Rodada** — NUEVO · `power a_tras_rodada · NUEVO (afterCast + modifyResolve)`
- [x] **c28 Manto de Niebla (final)** — NUEVO · `power a_manto · NUEVO (campo que sigue al dueño: dr 25; su ceguera no se suma a la de otro humo; g.heal a los aliados dentro, no a la dueña: ronda 3)`
- [x] **c29 Danza del Arco (final)** — NUEVO · `power a_danza_arco · NUEVO (lee a_compas)`
- [x] **c30 Sombra Gemela (final)** — NUEVO · `power a_sombra · NUEVO (aliado sin vida que copia las principales como eco ×0,3–0,6)`

## Tiradora Veloz (v0…28)

- [x] **v0 Impulso (clave, gratis)** — NUEVO · `mecánica impulso · existe (+ pérdida quieta NUEVA) · pasiva Tercera Flecha: power t_tercera · NUEVO (seq del básico)`
- [x] **v1 Astiles Ligeros** — existe · `mod flecha_multiple cost · existe`
- [x] **v2 Vendaval Largo** — NUEVO · `tv.galeT · NUEVO (clave; gaugeTuning impulso.galeT + tv)` · traducir: `tv.galeT: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`
- [x] **v3 Aire Fresco** — existe · `mod a_v_carrera cdr · claves`
- [x] **v4 Puntas Templadas** — existe · `mod flecha_multiple dmg + power t_tercera (rango) · claves`
- [x] **v5 Remate Triple** — NUEVO · `power t_remate_triple · NUEVO (afterCast pone el contador de seq a 2)`
- [x] **v6 Soltar y Disparar** — NUEVO · `power t_soltar · NUEVO (onRelease del canal + eco de a_t_andanada ×0,6 sin desplazamiento)`
- [x] **v7 Fondo de Corredora** — existe · `mod a_v_carrera channelT + slowImmune · claves`
- [x] **v8·A Triple Abierto** — existe · `power t_tercera · opción (seq.onNth count 5)`
- [x] **v8·B Triple Clavado** — NUEVO · `power t_triple_clavado · NUEVO (onCast forceCrit en el 3.º)`
- [x] **v9·A Último Instante** — NUEVO · `power t_ultimo_instante · NUEVO (lee recast.left del canal)`
- [x] **v9·B Ida y Vuelta** — NUEVO · `mod a_t_andanada recast.max +1 · clave NUEVA (tipo genérico recast)` · traducir: `recast.max → recast.n (mod recastAdd)`
- [x] **v10·A Rueda de Flechas** — NUEVO · `power t_rueda · NUEVO (tick del canal; ronda 2: 50 %, antes 40 %; ronda 3: 60 %, por el suelo del Diluvio)`
- [x] **v10·B Blanco Fijo** — NUEVO · `power t_blanco_fijo · NUEVO (condAdd por objetivo)`
- [x] **v11 Mano Llena** — existe · `mod flecha_multiple proj · existe`
- [x] **v12 Salto Impulsivo** — NUEVO · `power t_salto_impulsivo · NUEVO (sustituye a t_andanada_impulsiva)`
- [x] **v13 Saetas Afiladas** — existe · `mod dmg · claves`
- [x] **v14 Vacío de Aire** — NUEVO · `power t_vacio_aire · NUEVO (onRelease del canal: atraer + addStagger)`
- [x] **v15·A Piel de Brisa** — NUEVO · `power t_piel_brisa · NUEVO (condDr con gaugeState impulso.galeT)`
- [x] **v15·B Retirada Instintiva** — NUEVO · `power t_retirada · NUEVO (④ onDamaged; lógica de a_t_salto)`
- [x] **v16 Viento en las Plumas** — NUEVO · `power t_viento_plumas · NUEVO (condAdd con gaugeValue)`
- [x] **v17 Nube de Paso** — NUEVO · `power t_nube_paso · NUEVO (tick del canal; solo los 6 primeros s de cada Carrera; ronda 3: 0,4 s por rango, antes 0,5; cdReduce sobre @ultimate: respeta el suelo de las definitivas, 35 s)`
- [x] **v18 Flechas Perdidas** — NUEVO · `power t_flechas_perdidas · NUEVO (onKill + fireProjectile)`
- [x] **v19 Vendaval Encadenado** — NUEVO · `power t_vendaval_encadenado · NUEVO (sustituye a t_galechain)`
- [x] **v20 Pies Ligeros** — existe · `stats.spdPct · existe`
- [x] **v21 Nube Fiel** — NUEVO · `power t_nube_fiel · NUEVO (modifyResolve del intervalo; no cuenta la prórroga de Galerna Infinita)`
- [x] **v22 Ráfaga Creciente** — NUEVO · `power t_rafaga_creciente · NUEVO (modifyResolve proj con contador)`
- [x] **v23 Golpe de Apertura** — NUEVO · `power t_apertura · NUEVO (⑩ onGauge full + onCast forceCrit)`
- [x] **v24 Ciclones** — NUEVO · `power t_ciclones · NUEVO (campo t_ciclon que dispara; ronda 2: 28 %, antes 35 %)`
- [x] **v25 Tormenta de Plumas (final)** — NUEVO · `power t_tormenta_plumas · NUEVO (afterCast cada 3.ª: anillo de proyectiles; ronda 2: hasta 3 buscan al blanco de la Múltiple, con su propio tope de 3)`
- [x] **v26 Vaivén Eterno (final)** — NUEVO · `power t_vaiven · NUEVO (al cerrar la ventana de recast, cds = 0 y coste ×0,5 si galeT > 0; usos por Vendaval 1/2/∞)`
- [x] **v27 Galerna Infinita (final)** — NUEVO · `power t_galerna · NUEVO (prórroga del canal 2/4/∞ s; coste 10 + 3·t por s: ~6,5 s con 80 de Energía)`
- [x] **v28 Ojo del Huracán (ápice)** — NUEVO · `power t_ojo_huracan (rangos) · NUEVO (sustituye a t_eyestorm; rango 4: cdReduce sobre @ultimate, cuenta para el suelo de las definitivas)`

## Francotiradora (f0…28)

- [x] **f0 Mira Serena (clave, gratis)** — NUEVO · `mecánica concentracion · existe (gainPerSec 15; perfectGain 15/3, Calma Absoluta y Respiro NUEVOS) · pasiva Cuerda Tensa: tipo genérico charge en a_disparo · NUEVO`
- [x] **f1 Punta de Barrena** — existe · `mod a_t_apuntado dmg + range · claves`
- [x] **f2 Ojo Paciente** — NUEVO · `tv.perfectMul · NUEVO (clave del tipo charge)` · traducir: `tv.perfectMul → perfectPct (×1,5 → 50, saco aditivo)`
- [x] **f3 Cuerda Ligera** — NUEVO · `tv.chargeSpeed · NUEVO (clave del tipo charge)`
- [x] **f4 Sobrepenetración** — NUEVO · `power f_sobrepenetracion · NUEVO (sustituye a f_overpen)`
- [x] **f5 Línea de Mira** — NUEVO · `power f_linea_mira · NUEVO (onHit si cast.perfect: marca f_punto_debil 4 s)`
- [x] **f6 Pulso Quieto** — NUEVO · `power f_pulso_quieto · NUEVO (modifyResolve charge.perfect ×1,5 con la postura)`
- [x] **f7 Guardia Larga** — existe · `mod a_f_rodilla dur · claves`
- [x] **f8·A Estela Explosiva** — NUEVO · `power f_estela · NUEVO (campo en línea con retardo)`
- [x] **f8·B Doble Impacto** — NUEVO · `power f_doble_impacto · NUEVO (un solo impacto → eco ×0,6)`
- [x] **f9·A Marca Saltarina** — NUEVO · `power f_marca_saltarina · NUEVO (onKill)`
- [x] **f9·B Punto Vital** — NUEVO · `power f_punto_vital · NUEVO (condAdd + addStagger)`
- [x] **f10·A Salva de Vigía** — NUEVO · `power f_salva · NUEVO (afterCast con la postura; ronda 2: 25 %, antes 40 %)`
- [x] **f10·B Paciencia de Vigía** — NUEVO · `power f_paciencia · NUEVO (sustituye a f_patience; ronda 3: solo Disparo Apuntado, ni el básico tensado ni los haces; +15 % hasta +45 %)`
- [x] **f11 Fila Rota** — NUEVO · `power f_fila_rota · NUEVO (onKill + gainResource + gainGauge)`
- [x] **f12 Lectura del Blanco** — NUEVO · `power f_lectura · NUEVO (modifyResolve charge.perfect contra el marcado)`
- [x] **f13 Puntería de Vigía** — NUEVO · `power f_punteria_vigia · NUEVO (condAdd con la postura)`
- [x] **f14 Estrella Fija** — NUEVO · `power f_estrella_fija · NUEVO (onCast de a_t_apuntado si cast.perfect y la Calma Absoluta está activa: ronda 3; el básico y los haces no cuentan; cdReduce sobre @ultimate: respeta el suelo de las definitivas)`
- [x] **f15·A Quietud** — NUEVO · `tv.drStill · NUEVO (clave, espejo de drMoving)`
- [x] **f15·B Nervios de Acero** — NUEVO · `power f_nervios · NUEVO (④ onDamaged + g.shield; ronda 3: por la cubeta de autocuración de la Arquera, 1 %/s)`
- [x] **f16 Serenidad** — NUEVO · `power f_serenidad · NUEVO (condAdd con gaugeValue)`
- [x] **f17 Haces Gemelos** — NUEVO · `power f_haces_gemelos · NUEVO (eco del haz; un eco no repite; ronda 3: 35/70 %, antes 15/30 %: con el suelo de las definitivas la recarga ya no hace bucle)`
- [x] **f18 Rebote Certero** — NUEVO · `power f_rebote · NUEVO (proyectil que vuelve; el eco no rebota)`
- [x] **f19 Herida Expuesta** — NUEVO · `power f_herida_expuesta · NUEVO (applyWeakness mientras dura la marca)`
- [x] **f20 Vista Larga** — existe · `mod range + condAdd por distancia · claves`
- [x] **f21 Firmamento** — NUEVO · `power f_firmamento · NUEVO (cdRate ×1,2 con la postura; ronda 2: ×1,4; ronda 3: ×1,2 y suelo de las definitivas, 35 s)`
- [x] **f22 Saetas Paralelas** — NUEVO · `power f_paralelas · NUEVO (afterCast si cast.perfect)`
- [x] **f23 Herida sobre Herida** — NUEVO · `power f_heridas · NUEVO (stacks por objetivo; condAdd)`
- [x] **f24 Ojo Entrenado** — NUEVO · `power f_ojo_entrenado · NUEVO (onTick con la postura; charge.instant)`
- [x] **f25 Línea Mortal (final)** — NUEVO · `power f_linea_mortal · NUEVO (charge.full → haz + estallido en línea)`
- [x] **f26 Disparo Imposible (final)** — NUEVO · `power f_disparo_imposible · NUEVO (sustituye a f_impossible; como mucho un doble por segundo; la 2.ª no da Herida ni Concentración)`
- [x] **f27 Atalaya Eterna (final)** — NUEVO · `power f_atalaya · NUEVO (postura de 20/30/∞ s + eco de un haz de a_u_celeste ×0,5 que cae sobre el blanco y no atraviesa; ronda 3: 200 %, antes 160 %)`
- [x] **f28 Ojo Inmóvil (ápice)** — NUEVO · `power f_ojo_inmovil (rangos) · NUEVO (sustituye a f_weakspot; rango 4: cdReduce sobre @ultimate, cuenta para el suelo de las definitivas)`

## Montaraz (m0…28)

- [x] **m0 Coto de Caza (clave, gratis)** — NUEVO · `mecánica coto · existe (+ Batida NUEVA) · pasiva Cebo de Caza: power m_cebo · NUEVO (sustituye al +25 % de Quebranto)`
- [x] **m1 Muelles Ligeros** — existe · `mod a_t_cepo cdr · existe`
- [x] **m2 Olfato de Presa** — existe · `tv.preyDmg · existe`
- [x] **m3 Raíz Rápida** — existe · `mod a_u_zarzas cdr · claves`
- [x] **m4 Pólvora Negra** — existe · `mod dmg · claves`
- [x] **m5 Presa Atrapada** — NUEVO · `power m_presa_atrapada · NUEVO (icd 10 s para el estallido y la carga; las trampas que salta Gran Cacería no la activan)`
- [x] **m6 Cerco a la Presa** — NUEVO · `power m_cerco_presa · NUEVO (campo m_zarzal)`
- [x] **m7 Raíces Profundas** — existe · `mod a_u_zarzas crossRoot · claves`
- [x] **m8·A Racimo de Cepos** — NUEVO · `power m_racimo · NUEVO (afterCast: 2 cepos más ×0,35; coto cuenta 1)`
- [x] **m8·B Cepo Reforzado** — NUEVO · `power m_cepo_reforzado · NUEVO (rejuicio: 3 × 20 %, antes 3 × 30 %)`
- [x] **m9·A Presas en Manada** — NUEVO · `power m_manada · NUEVO (coto.preyMax 3)`
- [x] **m9·B Presa Herida** — NUEVO · `power m_presa_herida · NUEVO (applyWeakness 10 + addStagger)`
- [x] **m10·A Zarzal Creciente** — NUEVO · `power m_creciente · NUEVO (radio por tic)`
- [x] **m10·B Zarzal Asfixiante** — NUEVO · `power m_asfixiante · NUEVO (stacks por objetivo)`
- [x] **m11 Metralla** — NUEVO · `power m_metralla · NUEVO (fireProjectile ×N; ni los cepos sembrados ni los pequeños sueltan)`
- [x] **m12 Acoso** — NUEVO · `power m_acoso · NUEVO (addStagger; applyCC slow a élites; ya no da Debilidad)`
- [x] **m13 Espino Venenoso** — existe · `tv.poisonPct · existe`
- [x] **m14 Semillas de Zarza** — NUEVO · `power m_semillas · NUEVO (campo m_zarzal)`
- [x] **m15·A Cepo de Huida** — NUEVO · `power m_cepo_huida · NUEVO (④ onDamaged)`
- [x] **m15·B Guarida** — NUEVO · `power m_guarida · NUEVO (condDr)`
- [x] **m16 Coto Cerrado** — NUEVO · `power m_coto_cerrado · NUEVO (condAdd con gaugeValue)`
- [x] **m17 Zarzas Trepadoras** — NUEVO · `power m_trepadoras · NUEVO`
- [x] **m18 Rearme Rápido** — NUEVO · `power m_rearme · NUEVO (por detonación, no por trampa; los cepos pequeños y sembrados no cuentan; Salto ≥ 5 s)`
- [x] **m19 Rastro Fresco** — NUEVO · `power m_rastro · NUEVO (onKill)`
- [x] **m20 Ojo de Trampera** — existe · `tv.fieldDur · claves`
- [x] **m21 Rebrote** — NUEVO · `power m_rebrote · NUEVO (campo m_zarzal ×3)`
- [x] **m22 Campo Sembrado** — NUEVO · `power m_campo_sembrado · NUEVO (afterCast)`
- [x] **m23 Batida Mayor** — NUEVO · `tv.batidaDur + tv.batidaPreyStagger · NUEVO (claves de la mecánica coto; ya no sube la Debilidad)` · traducir: `tv.batidaDur: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`; `tv.batidaPreyStagger: clave de la clase (KT-arquera, <CLASE>_TV_KEYS)`
- [x] **m24 Siembra de Espinas** — NUEVO · `power m_siembra · NUEVO (campo m_zarzal)`
- [x] **m25 Tierra Arrasada (final)** — NUEVO · `power m_tierra_arrasada · NUEVO (solo siembran los cepos de carga; 6 pequeños vivos como mucho)`
- [x] **m26 Gran Cacería (final)** — NUEVO · `power m_gran_caceria · NUEVO (sustituye a m_greathunt; rejuicio: las trampas que saltan hacen el 50 % y cuentan para el tope de 2 estallidos; ronda 2: no activan Presa Atrapada, m5; ronda 3: ni cuentan para Corazón del Bosque 4)`
- [x] **m27 Bosque Vivo (final)** — NUEVO · `power m_bosque_vivo · NUEVO (eco de a_u_zarzas de 2/3/4 s; uno vivo; ronda 2: solo controla, coef 0 y sin el estallido al cerrarse)`
- [x] **m28 Corazón del Bosque (ápice)** — NUEVO · `power m_corazon_bosque (rangos) · NUEVO (sustituye a m_thornweb; ronda 3, rango 4: cuenta los cepos de carga que estallan por Flecha Detonante, Salto de Acecho o Detonación en Cadena —un Racimo cuenta 1; no cuentan los pequeños, los sembrados, el cepo gratis del rango 2, las minas pisadas ni los que salta Gran Cacería—; icd 90; el Cerco gratis va aparte del suelo de las definitivas)`

## Héroe · Errante del Viento (tiradora · francotiradora)

- [x] **q0 Ráfagas (clave, gratis)** — NUEVO · `power q_rafagas · NUEVO (contador por tiempo; afterCast de spender/spec)`
- [x] **q1 Brisa Constante** — vacío
- [x] **q2·A Viento a Favor** — vacío
- [x] **q2·B Aire Quieto** — vacío
- [x] **q3 Plumas de Aire** — vacío
- [x] **q4·A Torbellino (concede a_h_torbellino)** — vacío
- [x] **q4·B Corriente Protectora** — vacío
- [x] **q5 Aire Afilado** — vacío
- [x] **q6 Empuje del Aire** — vacío
- [x] **q7 Rachas** — vacío
- [x] **q8·A Ojo de la Racha** — vacío
- [x] **q8·B Abanico de Aire** — vacío
- [x] **q9 Aire Pesado** — vacío
- [x] **q10 Tormenta Guardada** — vacío
- [x] **q11 Silbido** — vacío
- [x] **q12 Rosa de los Vientos (final)** — vacío

## Héroe · Carcaj Encantado (tiradora · montaraz)

- [x] **w0 Puntas Encantadas (clave, gratis)** — NUEVO · `power w_puntas · NUEVO (onCast cada 6 s; rota fire/frost/lightning; una punta por enemigo cada 1 s; la quemadura se renueva; ronda 3: las tres de Desborde cuentan como una)`
- [x] **w1 Encantamiento Rápido** — vacío
- [x] **w2·A Punta Mayor** — vacío
- [x] **w2·B Punta Repartida** — vacío
- [x] **w3 Trampa Encantada** — vacío
- [x] **w4·A Desborde de Puntas (concede a_h_puntas)** — vacío
- [x] **w4·B Punta Curativa** — vacío
- [x] **w5 Fuego Prendido** — vacío
- [x] **w6 Hielo Hondo** — vacío
- [x] **w7 Trenza de Puntas** — vacío
- [x] **w8·A Chispa Saltarina** — vacío
- [x] **w8·B Hielo Mordiente** — vacío
- [x] **w9 Puntas Afines** — vacío
- [x] **w10 Encantamiento Hondo** — vacío
- [x] **w11 Punta Viva** — vacío
- [x] **w12 Lluvia Encantada (final)** — vacío

## Héroe · Halconera (francotiradora · montaraz)

- [x] **y0 Halcón Cazador (clave, gratis)** — NUEVO · `power y_halcon · NUEVO (aliado sin vida; picado = eco con marca)`
- [x] **y1 Alas Rápidas** — vacío
- [x] **y2·A Picado Hondo** — vacío
- [x] **y2·B Vuelo Rasante** — vacío
- [x] **y3 Presa Señalada** — vacío
- [x] **y4·A Llamada del Halcón (concede a_h_halcon)** — vacío
- [x] **y4·B Alas Protectoras** — vacío
- [x] **y5 Garras Afiladas** — vacío
- [x] **y6 Grito del Halcón** — vacío
- [x] **y7 Cetrería** — vacío
- [x] **y8·A Bandada** — vacío
- [x] **y8·B Halcón Peregrino** — vacío
- [x] **y9 Plumas Cortantes** — vacío
- [x] **y10 Ojo Compartido** — vacío
- [x] **y11 Halcón Fiel** — vacío
- [x] **y12 Cielo de Halcones (final)** — vacío

## Activas de talento (ranura 2, sin forja)

- [x] **a_t_camuflaje** Camuflaje · defense · Nv21 · concede c11 — KA1: catálogo 2g (20 s, 4 s). Comportamiento `a_t_camuflaje` y crítico al salir: del árbol (powers-arquera.js, KT); «Paso Veloz se recarga» lo pone el poder del nodo (g.reduceCooldown, no p.cds)
- [x] **agilidad** Agilidad · utility · Nv27 · concede c17 — KA1: buff genérico (slowImmune); deja la ranura 1; grant en c17A
- [x] **a_t_bengala** Flecha Bengala · utility · Nv31 · concede c22 — KA1: comportamiento propio `a_bengala` (campo `zona` + pulso de 0,25 s con applyWeakness 15 y weakenOutgoing 15, 10 m, 10 s). Deja sin uso el `a_t_bengala` y el campo `a_bengala` de powers-arquera.js (KT los retira)
- [x] **a_h_torbellino** Torbellino · utility · Nv72 · concede q4 (héroe) — KA1: comportamiento propio `a_torbellino` (golpe sin daño en 4 m que aplica `stun 1.5`; a un jefe, Quebranto). Las 3 Ráfagas: poder del árbol (KT)
- [x] **a_h_puntas** Desborde de Puntas · utility · Nv72 · concede w4 (héroe) — KA1: buff genérico vacío de 10 s (`count: 4`); los 4 disparos con las tres puntas los cuenta el poder `w_puntas` (KT). La duración de 10 s es propuesta de KA1 (el doc no la da)
- [x] **a_h_halcon** Llamada del Halcón · utility · Nv72 · concede y4 (héroe) — KA1: comportamiento propio `a_halcon` (12 ataques de 40 % cada 0,5 s; ceguera −30 % el resto de la llamada; 30 de Quebranto al primer jefe; si el blanco muere o se aleja, el más cercano)

## Kit (KA1): habilidades base y de especialización

- [x] **a_disparo** Disparo Rápido · basic · Nv1 · physical — `weapon` genérico. Tercera Flecha (`seq`) y Cuerda Tensa (`charge`) son pasivas de especialización (KT, modifyResolve)
- [x] **flecha_perforante** Flecha Perforante · spender · Nv2 · physical — `proj` genérico
- [x] **a_paso** Paso Veloz · movement · Nv4 · physical — comportamiento `a_paso` (existía; params `rollT`); sin buff (Doble Rodada) no pone el bonus
- [x] **a_humo** Bomba de Humo · defense · Nv6 · physical — comportamiento `a_humo` (existía): zona + campo de ceguera `a_humo_ciego` de KT con la misma vida (KA2: vuelve a usarlo, test88 §2b); `cdOnEnd`; `dps` si la forja le da coef; lee `prof.follow` (Manto de Niebla)
- [x] **lluvia_flechas** Lluvia de Flechas · spender · Nv8 · physical — comportamiento `a_lluvia` (existía; params `waves`, `span`): VFX por oleada. `repeat` genérico no repite el VFX de cada oleada
- [x] **a_t_andanada** Andanada · spec · Nv10 · tiradora · physical — comportamiento NUEVO `a_andanada` (params `jump`): abanico de `count` flechas + salto de 4 m (`p.leap`, atrás en los usos impares, adelante en el relanzamiento); `recast` del motor `{ n: 2, win: 2, cdFrom: 'first' }`; `perTarget` (Andanada Cerrada) con Map por lanzamiento. Ningún tipo genérico dispara un abanico Y salta
- [x] **a_v_carrera** Carrera del Viento · movement · Nv12 · tiradora · physical — `channel` genérico: `hold`, `moveMul 1.4`, `autoShot { every 0.4, coef 0.45, nearest, 10 m }`, `dur 4` (así `durS` la alarga), `ticks 20`
- [x] **flecha_multiple** Flecha Múltiple · spender · Nv14 · tiradora · physical — `proj` genérico (5 en 50°, 45 %)
- [x] **a_u_diluvio** Diluvio de Saetas · ultimate · Nv15 · tiradora · physical — comportamiento `a_diluvio` (lluvia con `follow: 'owner'`: 12 oleadas cada 0,5 s), `cdFloor 0.7`
- [x] **a_t_apuntado** Disparo Apuntado · spec · Nv10 · francotiradora · physical — `proj` genérico + `charge { min 0.3, max 1.5, perfect [1.15, 1.35], perfectPct 50, perfectCrit, scale.coef [0.8, 2.5], moveMul 0.6 }`
- [x] **a_f_rodilla** Rodilla en Tierra · utility · Nv12 · francotiradora · physical — `stance` genérico de un modo (`moveMul 0.5`, `chargeSpeed 40`, `keepGauge 'concentracion'`), `dur 8`, `endOnDodge`, `recastEnds`
- [x] **a_f_rastreador** Tiro Rastreador · spender · Nv14 · francotiradora · physical — `proj` genérico + `mark { id 'a_punto_debil', dur 8, uses 1, firstCharged 30 }`
- [x] **a_u_celeste** Tiro Celestial · ultimate · Nv15 · francotiradora · physical — `proj` genérico + `recast { n 3, win 8, cdFrom 'first' }` + `charge { min 0.3, max 0.8, perfect [0.5, 0.75], scale.coef [2, 4] }`; fuera el comportamiento `a_celeste` (escribía p.cds). El 200 % a carga mínima es propuesta de KA1 (el doc da 400 % a 0,8 s)
- [x] **a_t_cepo** Trampa de Cepo · spec · Nv10 · montaraz · nature — `trap` genérico: `charges 2` (D2; fuera el powerState), `dur 30` (vida), `root 2` (para `rootAdd`), `trap { armT 0.5, maxArmed 3, radius 1.5, lure { 6 m, élite 3 m, jefes no, ×0,8 } }`, `hitDot` declarado (ver peticiones W2)
- [x] **a_m_acecho** Salto de Acecho · movement · Nv12 · montaraz · physical — `leap` genérico con `at: 'ownField'`, `fieldKind 'trampa'`, `fallbackRange 6`, `detonate { radius 2, coef 1, perTarget 2 }`, `cdFloor 0.5` (Rearme Rápido: nunca menos de 5 s); sin daño propio al caer (coef 0)
- [x] **a_m_detonante** Flecha Detonante · spender · Nv14 · montaraz · physical — `proj` genérico con `splash 0.8` en 3 m y `detonate { radius 3, coef 1, perTarget 2 }`
- [x] **a_u_zarzas** Cerco de Zarzas · ultimate · Nv15 · montaraz · nature — comportamiento `a_zarzas` reescrito (params `endMul`): donde apuntas (`at: 'target'`; `'enemy'` para la Jaula), cruzar = golpe sin daño que aplica `root 1.5` (+ `rootAdd`), veneno del campo `zona`, estallido de 300 % al cerrarse, `contain` si la forja lo pone; dura lo que su campo

### Notas de KA1 (E2)

- Comportamientos propios (ningún tipo genérico basta): `a_andanada`, `a_bengala`, `a_torbellino`, `a_halcon` (nuevos) y `a_paso`, `a_humo`, `a_lluvia`, `a_diluvio`, `a_zarzas` (existían). Ids distintos de los de powers-arquera.js (se registran antes y un id repetido rompe la carga).
- Ganchos para KT: la lluvia lee `prof.waves`, `prof.span` y `prof.follow` antes que la definición (Nube Fiel, Nube de Paso); el humo lee `prof.follow` (Manto de Niebla); Desborde de Puntas expone `count: 4`.
- Peticiones W2 (motor) — **todas resueltas por la cola W2d** (tanda 1; las prueban test90, test91 y, en la Arquera, test-forge-arquera y test-skills-arquera): (1) la trampa genérica debería aplicar su `hitDot` al saltar (sustituyendo, «se renueva, no se suma») en vez del golpe directo `dmg`: hoy el cepo hace el 60 % de golpe; (2) Punto Débil: «uno por enemigo cada 8 s aunque lo vuelvas a marcar» (hoy cada impacto rehace la marca con un uso); (3) soltar una carga antes de `min` no debería disparar (hoy dispara a `min`); (4) `detonate.coef` no escala con el rango; (5) un proyectil con `detonate` solo detona al impactar en un enemigo (no al llegar al final del alcance); (6) los tics de `startChannel` derivan un fotograma por tic (una Carrera de 4 s dura ~4,3 s a 60 fps).
- Tablas legadas (save-legacy-arquera.js): §11.3.2 salvo Red de Caza en la Francotiradora, que cae a Rodilla en Tierra (su barra) en vez de a la Bomba de Humo, para que la variante II quede en el cepo sin forjar el humo.
- Divergencias declaradas (KA2 las retira): `forja` y `reco` (retiradas en KA2).
- Arte (U2 / E3): las 8 habilidades del kit sin icono en `assets/skills/` (`a_t_andanada`, `a_v_carrera`, `a_t_apuntado`, `a_f_rodilla`, `a_f_rastreador`, `a_t_cepo`, `a_m_acecho`, `a_m_detonante`) dan 404 en el humo (`hud-model.baseSkillIcon` pide `skills/<id>.webp` a todo lo que no es activa de talento; antes las insignias usaban el sprite de su nodo). Arte de partida del borrador: `talents/arquera-tiradora-s4`, `-s9`, `icons256/a_p_punteria` (no existe), `talents/arquera-francotiradora-s8`, `-x1`, `talents/arquera-montaraz-s0`, `-s2`, `-s6`. Las 3 activas de héroe (kind 'talent') no tienen nodo en los árboles de clase ni de especialización: `talentSkillArt` no las encuentra (marcador).

## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)

`ARQUERA_SKILL_FORGE` y `ARQUERA_FORGE_RECO` en `js/skills-arquera.js`; poderes `v_*` en `js/powers-forge-arquera.js`; VFX de las variantes en `ARQUERA_FX[id].vars.i|ii` (`js/fx-skills-arquera.js`); pruebas en `tests/test-forge-arquera.mjs` (A1, A2/F7 con la lista de claves que puede cambiar cada pieza, A9, las 51 piezas en el arnés, ★ y VFX). Donde la Mejora y una variante fijan el mismo parámetro, la Mejora usa `set` y la variante lo pisa (Diluvio Anclado: 6 m, no 6 × 1,25; Tiro Pesado: 2,5 s, no el 1,3 s de Tensado Rápido).

Las tres piezas que esperaban al motor (`PEND_W2`, marcadas `[~]`) ya son estrictas en `tests/test-forge-arquera.mjs` desde la tanda 2: la cola W2d las resolvió y `PEND_W2` desapareció.

### a_disparo · Disparo Rápido

- [x] **Mejora · Mano Rápida** — `set { cadence: 0.9 }`. `Player.basicAttack` lee `prof.cadence` (W2d): el siguiente disparo espera 0,9 × atkTime (medido a Nv4, Nv20 Tiradora y Nv20 Montaraz)
- [x] **I (AREA) · Disparo Disperso** — `set { count: 3, spread: 0.218, coef: 0.45 }` (un impacto por enemigo)
- [x] **II (UNI) · Flecha de Cicuta** — `elem nature`, `set { coef: 0.7, hitDot { poison, 0.5, 4 s } }`, tag `dot`; el veneno se suma (applyDoT). El color de la flecha lo pone el básico de arma: primero el VFX de la variante (`vars.ii`), luego la definición forjada (W2d). La entrada base de `ARQUERA_FX.a_disparo` no lleva `color`

### flecha_perforante · Flecha Perforante

- [x] **Mejora · Astil de Fresno** — `set { range: 15 }`, `mul { speed: 1.2 }`
- [x] **I (AREA) · Flecha Explosiva** — `set { pierce: false, splash: 0.8, radius: 3 }`, tag `area`
- [x] **II (UNI) · Tiro de Precisión** — `set { windup: 0.35 }` (la esquiva lo cancela), `mod { dmg: 45 }`

### a_paso · Paso Veloz

- [x] **Mejora · Ágil** — `mod { durS: 1 }`
- [x] **I (UNI) · Rodar y Disparar** — `set { rollShot: 1.5 }` + poder `v_rodar` (③ afterCast: un `Player.basicAttack` real al 150 % al enemigo de la mira, al más cercano a tiro o a la mira; no toca `atkCd`)
- [x] **II (MOV) · Doble Rodada** — `mod { charges: 1 }`, `set { buff: null }` (el comportamiento no pone el bonus)

### a_humo · Bomba de Humo

- [x] **Mejora · Humo Espeso** — `set { radius: 5 }` (la nube y la ceguera)
- [x] **I (AREA) · Humo Venenoso** — `set { coef: 0.4 }`, tag `dot`: el veneno es el daño por segundo de la zona (como el del Cerco)
- [x] **II (CTRL) · Estallido de Humo** — `mod { knock: 3, slow: 2, slowPct: 40 }`: al lanzarla, golpe sin daño a los del radio (empuje desde el centro)

### lluvia_flechas · Lluvia de Flechas

- [x] **Mejora · Cielo Plomizo** — `add { waves: 1 }`
- [x] **I (UNI) · Aguacero** — `set { radius: 2, span: 0.8 }`, `mod { dmg: 40 }`
- [x] **II (AGU) · Cortina** — `set { allyDr: 15, projMissPct: 50 }`: mientras llueve, una zona de defensa para los aliados de dentro (la del k). Línea acortada a «Dentro recibes…» (divergencias.json; ver las dudas del informe)

### a_t_andanada · Andanada

- [x] **Mejora · Arco Ancho** — `set { spread: 1.309 }` (150°)
- [x] **I (UNI) · Andanada Cerrada** — `set { spread: 0.2618, perTarget: 3 }`, `add { range: 3 }`; línea acortada
- [x] **II (CTRL) · Andanada Repulsora** — `mod { knock: 2, slow: 2, slowPct: 30, dmg: -15 }`

### a_v_carrera · Carrera del Viento

- [x] **Mejora · Galope** — `set { moveMul: 1.55 }`
- [x] **I (UNI) · Carrera Certera** — `set { 'autoShot.every': 0.6, 'autoShot.target': 'maxHp' }`, `mod { dmg: 70 }`
- [x] **II (AGU) · Carrera Esquiva** — `set { projMissPct: 40 }`, `mod { dmg: -30 }` + poder `v_carrera_esquiva` (buff mientras dura el canal; sale con ⑭ o, si el canal desaparece, en la comprobación a 10 Hz); línea acortada

### flecha_multiple · Flecha Múltiple

- [x] **Mejora · Alcance Largo** — `set { range: 13 }`
- [x] **I (AREA) · Abanico Abierto** — `set { count: 7, spread: 0.785, coef: 0.38 }`
- [x] **II (UNI) · Haz Cerrado** — `set { count: 3, spread: 0.0873, pierce: true, coef: 0.55 }`: las 3 flechas dan al mismo enemigo (165 %)

### a_u_diluvio · Diluvio de Saetas

- [x] **Mejora · Nube Ancha** — `set { radius: 5 }`
- [x] **I (AREA) · Diluvio Anclado** — `set { follow: false, at: 'target', radius: 6, range: 12 }`
- [x] **II (UNI) · Saetas Pesadas** — `set { follow: false, at: 'enemy', waves: 4, span: 2, radius: 1.5, coef: 7, range: 12 }`: la lluvia sigue a tu objetivo (si muere, queda donde cayó)

### a_t_apuntado · Disparo Apuntado

- [x] **Mejora · Tensado Rápido** — `set { 'charge.max': 1.3, 'charge.perfect': [1.0, 1.17] }` (el ★set del k, con la ventana dorada escalada a mano ×1,3/1,5). Es `set`, no un mod de velocidad: Tiro Pesado lo pisa (carga completa a 2,5 s, no a ~2,17 s como con el `chargeSpeed 15` de la primera entrega) y Tres Saetas lo hereda
- [x] **I (AREA) · Tres Saetas** — `set { 'charge.full': { count: 3, spread: 0.1745, coefMul: 0.4 } }`; línea acortada («al 40 %» del disparo cargado, el ×0,4 del k)
- [x] **II (UNI) · Tiro Pesado** — `set { 'charge.max': 2.5, 'charge.perfect': [2.15, 2.35], 'charge.scale.coef': [0.8, 3], pierce: false }`

### a_f_rodilla · Rodilla en Tierra

- [x] **Mejora · Rodilla Firme** — `set { 'stance.modes.0.chargeSpeed': 50 }`; línea acortada
- [x] **I (UNI) · Puesto Fijo** — `set { 'stance.modes.0.moveMul': 0, 'stance.modes.0.chargeSpeed': 100 }` + poder `v_puesto_fijo` (③ condAdd +15 a Disparo Apuntado y Tiro Celestial de rodillas); línea acortada
- [x] **II (AGU) · Parapeto** — `set { 'stance.modes.0.stats': { dr: 30, projMissPct: 50 } }`; línea acortada

### a_f_rastreador · Tiro Rastreador

- [x] **Mejora · Marca Duradera** — `set { 'mark.dur': 12 }`
- [x] **I (AREA) · Rastreo Múltiple** — `set { 'mark.count': 3, 'mark.radius': 4, 'mark.dur': 6 }`
- [x] **II (CTRL) · Grillete** — `mod { slow: 8, slowPct: 50, stagger: 20 }` (los 8 s del k). **Aviso a E4 / orquestador:** a un jefe, la ralentización ≥ 30 % también llena Quebranto (`staggerFromCC`: 4 por segundo = 32), así que cada impacto da 52 (20 del mod + 32). Tiro Rastreador no tiene recarga y cuesta 20 de Energía: dos impactos quiebran a un jefe (`STAGGER_MAX` 100), por encima del Quebranto de una especialización de control. Lo mismo vale para cualquier marca reaplicable sin recarga con ralentización ≥ 30 %; el arreglo es de reglas (rendimientos decrecientes del Quebranto por ralentización reaplicada, o que el mod la excluya), no de este dato

### a_u_celeste · Tiro Celestial

- [x] **Mejora · Cielo Abierto** — `mod { recastWin: 2 }`
- [x] **I (AREA) · Lluvia Estelar** — `set { type: 'area', at: 'target', radius: 4, coef: 1.5, pierce: false, impactDelay: 0.25, 'charge.scale.coef': [0.75, 1.5] }` (siguen los 3 haces y el tensado)
- [x] **II (UNI) · Haz Único** — `set { recast: null, 'charge.max': 3, 'charge.perfect': [2.7, 2.95], 'charge.scale.coef': [2, 10] }`

### a_t_cepo · Trampa de Cepo

- [x] **Mejora · Muelles Firmes** — `set { 'trap.armT': 0.2 }`
- [x] **I (AREA) · Mina de Espinas** — `set { root: 0, 'trap.burst': { radius: 3, coef: 1 } }`. Quien la pisa recibe solo el estallido del 100 % y el veneno del cepo, sin el golpe directo (W2d-B). El estallido escala una vez con el rango (`data.rank`): a rango 3, 100 % × 1,2. También los cepos con habilidad propia (Racimo, sembrados, pequeños): `spawnCepo` les pone el rango de Trampa de Cepo, y `cepoData` usa la definición forjada aunque aún no hayas colocado ningún cepo (antes un sembrado no llevaba la mina)
- [x] **II (CTRL) · Red de Caza** — `set { root: 2.5, radius: 3 }` + poder `v_red_caza` (⑤ al saltar el cepo —`hit.trap` y `source 'field:trampa'`, no en un estallido—, una red por trampa: inmoviliza a los demás a `radius` m). El radio sale de la definición forjada (`p.talentAccessors().defOf`, que la calcula aunque la caché esté vacía) y la raíz, de la trampa (`data.root`, con `rootAdd`); sin constantes de reserva. Sin golpe directo, la trampa sigue emitiendo el ⑤ sin daño (W2d-B); línea acortada

### a_m_acecho · Salto de Acecho

- [x] **Mejora · Acecho Lejano** — `set { range: 20 }`
- [x] **I (CTRL) · Acecho Enredador** — `set { 'detonate.consume': false, root: 1.5, radius: 3 }` + poder `v_acecho_enredador` (③ afterCast al caer: raíz a `radius` m). La trampa estalla, sigue puesta y vuelve a armarse (`detonate.consume: false`, W2d-B). Para la Batida cuenta una vez aunque estalle dos (`trapBurstsWithin(…, { distinct: true })`)
- [x] **II (MOV) · Doble Acecho** — `mod { charges: 1 }`, `set { 'detonate.coef': 0.7 }` (el estallido no usa el saco aditivo del salto)

### a_m_detonante · Flecha Detonante

- [x] **Mejora · Pólvora Fina** — `set { radius: 4, 'detonate.radius': 4 }`
- [x] **I (AREA) · Detonación en Cadena** — `set { 'detonate.chain': 6 }`
- [x] **II (CTRL) · Flecha de Garfio** — `set { splash: 0, detonate: null, pull: { dist: 6, to: 'trap' } }`, quita el tag `area`

### a_u_zarzas · Cerco de Zarzas

- [x] **Mejora · Espinas Duraderas** — `mod { durS: 2 }`
- [x] **I (UNI) · Jaula de Espinas** — `set { radius: 3, at: 'enemy', contain: true, venomPct: 30 }`: el +30 % va solo al veneno (param `venomPct` del comportamiento), no al estallido; línea acortada
- [x] **II (AGU) · Señuelo de Zarzas** — `set { lure: { radius: 10, dur: 6 } }`: el canal planta el señuelo (`senuelo`) en el centro del anillo al cerrar el lanzamiento

### Notas de KA2 (E2)

- La Bomba de Humo vuelve a usar el campo `a_humo_ciego` de powers-arquera.js para la ceguera (lo pide test88 §2b; la nota de KA1 de arriba ya está corregida): KT lo conserva.
- ★ (`ARQUERA_FORGE_RECO`) = la del mockup. Ninguna apaga la barra de su especialización (2f §7.7): la Tiradora conserva los disparos (`proj`); la Francotiradora, el tensado, la postura que guarda la Concentración y el Punto Débil; el Montaraz, las trampas, las detonaciones y el salto a la trampa. Lo vigila tests/test-forge-arquera.mjs §5 y, en vivo, el Impulso, el perfecto de Tiro Pesado y el Coto.
- Divergencias: las 9 líneas de forja de más de 70 caracteres, acortadas y declaradas (`aprobada: false`); fuera las de KA1 `forja` y `reco`.
- Peticiones a la cola W2 (motor) — **resueltas por las colas W2c y W2d** (test81 pasa fuera de la cuarentena; ninguna queda abierta):
  1. test81 F7: el comparador quita `def` del perfil salvo con comportamiento propio; los tipos genéricos leen la definición forjada (`trap.armT`, `stance.modes`, `detonate.chain`) y salen 4 falsos no-ops (`a_f_rodilla_m`, `a_f_rodilla_ii`, `a_t_cepo_m`, `a_m_detonante_i`). Incluir `def` sin la marca `forged` en la firma (como hace test-forge-arquera §2). Mientras tanto, test81 tiene que entrar en la cuarentena con dueño W2 (lo decide el orquestador: KA no edita `pending-2g.json`).
  2. `Player.basicAttack`: `atkCd = stats.atkTime × prof.cadence` (Mano Rápida; hoy solo la lee `_commitCast` para los básicos que no son de arma). Medido: con la Mejora, el siguiente disparo sigue esperando 1 × atkTime.
  3. `Player.basicAttack`: color de la flecha con este orden: `vars[variant].color` del VFX → `color` de la definición FORJADA (`prof.def.color`) → `color` del VFX base → el de la clase. Hoy es `fx.color ?? wb.color` con `wb` = el catálogo, así que ni la definición forjada ni la variante cuentan. VFX de la variante: `SKILL_FX[id].vars[variant]` fusionado sobre la entrada, también en `_makeCtx` para los tipos genéricos (`ctx.fx`); los comportamientos de la clase ya lo hacen con `fxOf`. **Para el orquestador:** la Arquera indexa `vars` por `i|ii` y KA2-guerrero por id de variante; hay que fijar una sola convención antes de que W2 lo implemente.
  4. `detonate.consume: false` en `detonateAt`, `detonateField` y `_trapBurst` (la trampa estalla y se rearma: Acecho Enredador).
  5. `SKILL_KEYS`: añadir `forged` (la marca de forgeDef) para que validateSkillDef no avise en una definición forjada.
  6. Las de KA1 (ya resueltas) (hitDot de la trampa, Punto Débil por enemigo, soltar antes de `min`, `detonate.coef` por rango, detonar al final del alcance, deriva de los tics del canal).
  7. Trampa genérica con `burst` (Mina de Espinas): (a) el estallido escala con el rango como el resto de la habilidad (`trap.burst.coef × rankCoef`, igual que pide la n.º 4 de KA1 para `detonate.coef`), en `_trapBurst` y en el salto de la trampa; (b) con `burst`, quien la pisa no recibe además el golpe directo `dmg`: el estallido ya le alcanza (con la n.º 1 de KA1, el golpe directo pasa a ser el `hitDot`). **Ojo:** `v_red_caza` se dispara con el ⑤ de ese golpe directo (`hit.trap` y `source 'field:trampa'`); si la n.º 1 de KA1 lo quita, la trampa tiene que seguir emitiendo un ⑤ al saltar (golpe de 0 con `hit.trap`) o dar otro gancho, y Red de Caza se adapta.
- Arte (U2 / E3): los iconos `forge/v_<id>_i|ii` de las 34 variantes no existen todavía (marcador por papel, 2f §5).
- Arte del kit (U2 / E3): `hud-model.baseSkillIcon` pide `skills/<id>.webp` y `skills256/<id>.webp` a toda habilidad que no es de talento, y a 8 del kit les faltan los dos: `a_t_andanada`, `a_v_carrera`, `a_t_apuntado`, `a_f_rodilla`, `a_f_rastreador`, `a_t_cepo`, `a_m_acecho` y `a_m_detonante` (el humo boot cae en rojo por esos 404 en cuanto llega a las insignias de Nv10; en juego, a Nv12 y Nv14, la barra de `SPEC_BAR` y el libro piden 5 más). Petición a U2: respaldo en `baseSkillIcon` al arte del nodo que usa el mockup (`I('<spec>-sN')` → `talents/arquera-<spec>-sN.webp`) o al marcador, sin pedir el archivo que no existe. Petición a E3 (arte): los 8 iconos en 128 y 256 px.
- Para E4 / orquestador: Quebranto por ralentización reaplicada (ver Grillete) y el mínimo de G17 de la Arquera (ver abajo).
- `test78` (dueño de la decisión: orquestador; datos: KT-arquera). **Superado:** G1 quedó aprobado en el punto 17 y G17 se ve en «Tanda 2», al final. Nota original: falla desde que el catálogo 2g trae el kit de especialización (`CATALOG_V = 2`; en `paso2-impl` pasa porque el kit aún no existía): G1, porque `c2`, `c6` (A y B) y `c16` (A y B) llevan en `touch` los 8 ids del kit que el conversor saca del grupo `flechas` del mockup congelado (decisión 10); G17, porque el propio diseño solo tiene 2 nodos mecánicos que tocan `a_u_diluvio` y 1 que toca `a_m_acecho` (§10 solo cita m18). Ni KA ni KT pueden arreglarlo solos: (a) que el conversor expanda `flechas` solo al kit base o que G1 lo exima; (b) fijar el mínimo de G17 para la Arquera o meter test78 en cuarentena (dueño Orq / KT-arquera).

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

## Tanda 2 (KAT-arquera, E2 · integración)

Cola de la Arquera en el punto 18 de `docs/paso2-implementacion.md`. Cada punto tiene su prueba.

- [x] **Cuarentena:** salen `test-gauges-arquera` y `test-talentos-arquera`. Las dos usan ahora el catálogo y la forja reales. A Nv100, Disparo Apuntado lleva Tensado Rápido (ventana dorada 1,0–1,17 s); soltarlo antes de 0,3 s cancela sin coste, y lo comprueban la Concentración y f24. El Cepo se arma en 0,2 s (Muelles Firmes). Con Humo Espeso, el humo mide 5 m (c25). Con Marca Duradera, el Punto Débil dura 12 s (f19). Con Espinas Duraderas, el Cerco dura 10 s (m21).
- [x] **`castEchoOf` → `g.castEcho(p, id, { mult, at })`**, sin ranura ni mira prestada: Instinto, Lluvia en Retirada, Soltar y Disparar, Haces Gemelos y Corazón del Bosque 4. Ninguno repite una canalización ni una movilidad, y la Andanada repetida no salta.
- [x] **Cuerda Tensa:** el motor ya lee `charge.markMin`. Un toque (menos de 0,3 s) ni gasta ni fuerza el Punto Débil; un tensado sí. La prueba es estricta: fuera `ENGINE_MARKMIN`.
- [x] **Vista Larga (f20) en el básico tensado:** `charge.scale.rangeAdd = [[0,29, 0], [0,3, 2·rango]]` en `f_cuerda_tensa.modifyResolve`, que el motor suma en `Player.basicRange`. Probado con `basicRange` y en juego: con f20 r2, un enemigo a 3 m más allá solo lo alcanza el tensado; ni un toque ni el básico sin tensar cambian.
- [x] **Batida:** `g.trapBurstsWithin(p, 1, { distinct: true })` sustituye a `st.live`/`st.gone`. Un Racimo cuenta como una trampa, y una trampa que estalla y se rearma (Acecho Enredador) también cuenta una sola vez.
- [x] **`spawnCepo` con `data.rank`:** los cepos con habilidad propia estallan con el rango de Trampa de Cepo una sola vez. `cepoData` usa la definición forjada y el veneno × rango aunque aún no hayas colocado ningún cepo. Prueba: el sembrado de Campo Sembrado hace el 35 % del estallido de una Mina de Espinas.
- [x] **Cepos con `hitDot` sin golpe directo (W2d-B):** m22 inmoviliza y envenena, y el veneno de dos sembrados se renueva, no se suma. La Mina de Espinas solo estalla (test-forge-arquera).
- [x] **Flecha Detonante:** sin blanco, detona al final de su vuelo (12 m) las trampas de su radio y no las de más allá (test-skills-arquera). Campo Sembrado r3 lo tiene en cuenta (tres flechas a sitios distintos).
- [x] **test-forge-arquera:** `a_disparo_m`, `a_t_cepo_i` y `a_m_acecho_i` son estrictos y `PEND_W2` ya no existe.
- [x] **Activas de los árboles héroe con el catálogo real** (q4A, w4A, y4A) y Agilidad (c17A): se prueba la concesión y el efecto. **Bug:** la Llamada del Halcón atacaba dos veces, por el comportamiento `a_halcon` del catálogo y por el asalto de `y_halcon`: 24 ataques y 60 de Quebranto. `y_halcon` deja la Llamada al catálogo y le suma Garras Afiladas (y5) con `modifyResolve`.
- [x] **Desborde de Puntas:** sus 4 disparos caducan con la activa (10 s); antes se guardaban sin límite.
- [x] **Cobertura:** `test-talentos-arquera` termina exigiendo una comprobación que pase por cada uno de los 187 nodos u opciones (0 sin efecto).
- [x] **`a_m_acecho` en el touch de m11, m25 y m28: fuera.** El texto de esos nodos no nombra el Salto de Acecho, y §10 del diseño congelado le da un solo nodo (m18). Sus poderes ya cuentan los cepos que hace estallar el Salto, porque `CHARGE_CEPOS` mira la habilidad de la trampa y no quién la detona; se midió con Metralla y Tierra Arrasada. m11 y m25 vuelven al touch del mockup y salen de `divergencias.json`; la entrada de m28 queda con `a_t_cepo` y `a_u_zarzas`.
- [ ] **G17 del Salto de Acecho:** con 1 nodo mecánico (m18, como el diseño), `test78` necesita de nuevo su excepción: `G17_EXCEPTION = { arquera: { a_m_acecho: 1 } }` (`tests/test78-talentos-datos-v2.mjs:47`). Es una petición al orquestador; con ese cambio, `test78` pasa (comprobado en una copia).
- [ ] **Para E4 / B1:** el Quebranto del Grillete reaplicado (ver la nota de KA2) y calibrar los rangos de las activas de talento, que escalan con `buffMul`: a Nv60, la Agilidad da +37 % y +19 % (rango 5) frente al +30 % y +15 % del texto (rango 1).
- [ ] **Arte (U2 / E3):** las notas de KA1 y KA2 de arriba (iconos del kit y de las variantes).
