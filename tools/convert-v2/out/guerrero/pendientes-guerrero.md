# Pendientes · Guerrero (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft guerrero` desde `docs/mockups/data/talents-v2-guerrero.js` (sha1 b0f282184d7d, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 135 NUEVO · 49 existe · 3 vacío (nodos y opciones). **Forja:** 40 NUEVO · 11 existe · 0 vacío.

## Árbol de clase (c1…c30)

- [ ] **c1 Constitución** — existe · `stats.hpPct · existe`
- [ ] **c2 Fuerza Bruta** — existe · `mod @all dmg · existe`
- [ ] **c3 Avance Implacable** — existe · `mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s; Carga de Escudo y Sendero de Luz 10 → 7,6 s)`
- [ ] **c4 Curtido** — existe · `mod g_piel durS · claves`
- [ ] **c5·A Tajo Firme** — NUEVO · `power g_tajo_firme · NUEVO (onHit + gainResource)`
- [ ] **c5·B Tajo Voraz** — NUEVO · `power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50)`
- [ ] **c6·A Ensañamiento** — NUEVO · `power g_ensanamiento · NUEVO (condAdd @spender)`
- [ ] **c6·B Sin Cuartel** — NUEVO · `power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento)`
- [ ] **c7 Marcha Imparable** — existe · `mod @movement unstoppable + 1 s · claves`
- [ ] **c8 Determinación** — NUEVO · `tv.drHighFury · NUEVO (copia de drHighMana)` · traducir: `tv.drHighFury → tv.drHighMana (recurso > 50 %: Furia, Maná o Energía)`
- [ ] **c9·A Golpe Pesado** — NUEVO · `mod @windup windupAdd .3 · dmg +40 · stagger 15 + mod @charge perfectDmg 25 · stagger 15 · claves NUEVAS (corrección de la etapa 2: c9 también toca las cargas)` · traducir: `perfectDmg → perfectPct`
- [ ] **c9·B Sin Pausa** — NUEVO · `mod @windup windupMult .5 · windupMove · keepPlanted + mod @charge moveWhileCharging 1 · claves NUEVAS` · traducir: `windupMult → windupMul (mod, %)`; `windupMove → moveMul (preparación: 1 = como hoy, 0 = plantado)`; `moveWhileCharging → charge.moveMul`
- [ ] **c10·A Derribo** — NUEVO · `power g_derribo · NUEVO (onCast + applyCC knock)`
- [ ] **c10·B Silenciar** — NUEVO · `power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes)`
- [ ] **c11·A Segundo Aliento (concede g_t_aliento)** — existe · `activa g_t_aliento · existe; si no está en la barra, Piel de Hierro la lanza al 50 % (gasta la mitad de tu Furia y cura 1 % por cada 3 gastados; respeta su recarga de 30 s; esa Furia no cuenta como gastada)`
- [ ] **c11·B Coraza de Hierro** — existe · `power g_coraza_hierro · existe`
- [ ] **c12 Furia Creciente** — NUEVO · `stats.resGainPct · NUEVO (clave)`
- [ ] **c13 Golpes Precisos** — existe · `stats.crit · existe`
- [ ] **c14·A Polvareda** — NUEVO · `power g_polvareda · NUEVO (afterCast @movement + applyCC slow; con movilidades que se relanzan, cuenta el primer uso de la cadena)`
- [ ] **c14·B Carga Reparadora** — NUEVO · `power g_carga_reparadora · NUEVO (afterCast @movement + cura por p.sustain() + cleanse; icd 6 en la cura; con movilidades que se relanzan, cuenta el primer uso de la cadena; antes g.heal sin icd: ~15 saltos por ciclo en Estampida ≈ 5 %/s fuera de la cubeta)`
- [ ] **c15·A Furia Protectora** — NUEVO · `power g_furia_protectora · NUEVO (④ onDamaged: 1 de Furia por cada 0,5 % de la vida máxima; sin Furia, pagas con vida; esa Furia no cuenta como gastada para c26, c29 ni t0)`
- [ ] **c15·B Furia Desbordante** — NUEVO · `stats resMaxAdd 30 + power g_desbordante · NUEVO` · traducir: `stats.resMaxAdd → stats.mp (recurso máximo plano)`
- [ ] **c16·A Filo Dentado** — existe · `tv.bleedPct 25 + tv.bleedDur 1 · existen`
- [ ] **c16·B Contundencia** — NUEVO · `tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves)` · traducir: `tv.staggerPct → stats.staggerPct (fx.stats)`
- [ ] **c17·A Grito de Guerra (concede grito_guerra)** — existe · `activa grito_guerra · existe (pasa de base a talento); si no está en la barra, Piel de Hierro la lanza al 50 % (+15 de Furia y +5 % al grupo a 15 m 8 s; respeta su recarga de 20 s)`
- [ ] **c17·B Ira Contenida** — NUEVO · `power g_ira_contenida · NUEVO (icd 20 + condAdd)`
- [ ] **c18 Hierro Vivo** — existe · `mod g_piel cdr · existe`
- [ ] **c19 Temple** — NUEVO · `power g_temple · NUEVO (onHit + extendBuff)`
- [ ] **c20 Desequilibrio** — NUEVO · `power g_desequilibrio · NUEVO (onHit + condCrit)`
- [ ] **c21 Persecución** — NUEVO · `power g_persecucion · NUEVO (condAdd @movement; vale en cada salto de la cadena: es el daño del golpe, como Peso Muerto, no un efecto al llegar)`
- [ ] **c22·A Intervención (concede g_t_intervencion)** — existe · `activa g_t_intervencion · existe (pasa de la 1 a la 2); si no está en la barra, Piel de Hierro la lanza al 50 % (sin salto: escudo del 8 % de tu vida a ti y al aliado más cercano; respeta su recarga de 20 s)`
- [ ] **c22·B Hermandad de Armas** — existe · `power g_aura_hermandad · existe`
- [ ] **c23 Ritmo de Combate** — NUEVO · `tv.basicCritCdr · NUEVO (copia de dartCritCdr)`
- [ ] **c24 Brazo Veloz** — existe · `stats.aspdPct · existe`
- [ ] **c25 Rencor** — NUEVO · `power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd)`
- [ ] **c26 Desenfreno** — NUEVO · `power g_ira_gasto · NUEVO (⑪ onResource; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; el id g_desenfreno ya es de Sangre Hirviente y sale)`
- [ ] **c27 Rugido de Carga** — NUEVO · `power g_rugido_carga · NUEVO (e.weakenOutgoing; con movilidades que se relanzan, cuenta el primer uso de la cadena)`
- [ ] **c28 Inquebrantable (final)** — NUEVO · `power g_inquebrantable · NUEVO (presupuesto de daño evitado: 40/55/70 % de la vida máxima; sin caducidad por tiempo; la recarga de 15 s empieza al romperse; el mecanismo escala por rango; antes 3/4/5 golpes, que una manada rompía en ~1 s)`
- [ ] **c29 Señor de la Guerra (final)** — NUEVO · `power g_senor_guerra · NUEVO (echo del canal; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; con cargar y soltar, la copia sale con la misma carga; la copia es echo:true: no cuenta como suelta perfecta ni como lanzamiento, no da Fervor, no gasta el Golpe de Titán ni suma al 3.er Terremoto de Montaña Viva)`
- [ ] **c30 Asalto Total (final)** — NUEVO · `power g_asalto_total · NUEVO (afterCast @movement + onKill cdReduce del 50 % de la recarga restante, icd 6; antes resetCd sin tope; respeta el suelo de 4 s de d17 y el del Sendero (z21) y cuenta como recarga «seguida» de b27; con movilidades que se relanzan, cuenta el primer uso de la cadena, como c14 y c27)`

## Berserker (b0…28)

- [ ] **b0 Sed de Batalla (clave, gratis)** — existe · `mecánica sed + power m_berserk · existen (ya no concede activa: el Remolino está en el libro)`
- [ ] **b1 Heridas Abiertas** — NUEVO · `tv.bleedDur · NUEVO (copia de burnDur)`
- [ ] **b2 Instinto Asesino** — existe · `mod g_rajar crit · claves`
- [ ] **b3 Zancada** — existe · `mod g_salto cdr · existe`
- [ ] **b4 Sangre Espesa** — existe · `tv.bleedPct · existe`
- [ ] **b5 Reabrir** — NUEVO · `power g_b_reabrir · NUEVO (onHit + replaceDoT + gainGauge)`
- [ ] **b6 Caída Brutal** — NUEVO · `power g_b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3)`
- [ ] **b7 Suelo Roto** — existe · `mod g_salto slow 2 · slowPct · claves`
- [ ] **b8·A Contagio** — NUEVO · `power g_b_contagio · NUEVO (onKill; lógica de p_propagacion)`
- [ ] **b8·B Desangrar** — NUEVO · `power g_b_desangrar · NUEVO (lógica de p_acumular)`
- [ ] **b9·A Onda de Choque** — NUEVO · `power g_b_onda_choque · NUEVO (afterCast step 3 + dealArea)`
- [ ] **b9·B Remate Certero** — NUEVO · `power g_b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger)`
- [ ] **b10·A Salto en Cadena** — NUEVO · `mod g_salto recastAdd 2 · clave NUEVA`
- [ ] **b10·B Salto Aplastante** — NUEVO · `power g_b_salto_aplastante · NUEVO (condAdd por cadena)`
- [ ] **b11 Festín de Sangre** — existe · `tv.bleedKillHeal + bleedKillMana · existen`
- [ ] **b12 Ritmo de Matanza** — NUEVO · `tv.critCdrAll · NUEVO (como critFireCdr, sobre todas menos @ultimate y g_piel; icd 1,5: ≤ 0,67 s/s)`
- [ ] **b13 Peso Muerto** — existe · `mod g_salto dmg · existe`
- [ ] **b14 Impacto Aturdidor** — existe · `mod g_salto stun .5 + stagger 15 · claves; icd 4 por enemigo (además de los rendimientos decrecientes de applyCC)`
- [ ] **b15·A Negación de la Muerte** — existe · `power g_negacion · existe (+ deja la Sed en 50: no la llena, para no encadenar con la salvación de Corazón Indomable 3)`
- [ ] **b15·B Umbral del Dolor** — NUEVO · `tv.drLowHp · NUEVO (clave)`
- [ ] **b16 Sangre Hirviente** — NUEVO · `power g_b_sangre_hirviente · NUEVO (stats con gaugeValue)`
- [ ] **b17 Sin Suelo** — NUEVO · `power g_b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia)`
- [ ] **b18 Avidez** — NUEVO · `power g_b_avidez · NUEVO (onHit en el canal)`
- [ ] **b19 Último Trago** — NUEVO · `power g_b_ultimo_trago · NUEVO (gainGauge sed)`
- [ ] **b20 Alcance Salvaje** — existe · `mod @melee radius · existe`
- [ ] **b21 Caída Sangrienta** — NUEVO · `power g_b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT)`
- [ ] **b22 Estallido Rojo** — NUEVO · `power g_b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT)`
- [ ] **b23 Verdugo** — NUEVO · `power g_b_verdugo · NUEVO (condAdd por vida que falta)`
- [ ] **b24 Ímpetu** — NUEVO · `power g_b_impetu · NUEVO (addBuff con pilas)`
- [ ] **b25 Danza Carmesí (final)** — NUEVO · `power g_b_danza_carmesi · NUEVO (canal con drainPerSec y tope por rango: 6/10/20 s)`
- [ ] **b26 Golpe de Gracia (final)** — NUEVO · `power g_b_golpe_gracia · NUEVO (echo del paso 3 al 30/45/60 % + vuln 1/2,5/4 s: con un 3.er golpe cada ~2,7 s, Vulnerable el 37/93/100 % del tiempo)`
- [ ] **b27 Estampida Sin Fin (final)** — NUEVO · `power g_b_estampida · NUEVO (onChainEnd + cdReduce 4/8 s o resetCd; como mucho 2 reinicios seguidos: la 3.ª cadena espera la recarga normal; cuentan también los de otros poderes: la media recarga de Asalto Total es una «seguida»)`
- [ ] **b28 Corazón Indomable (ápice)** — NUEVO · `power g_b_corazon_indomable (rangos) · NUEVO (rango 3: icd 60, antes una vez por Sed; rango 4: icd 90)`

## Guardián (d0…28)

- [ ] **d0 Pie Firme (clave, gratis)** — NUEVO · `mecánica bastion rehecha (plantedEvery 2, moveLossEvery 2, drPerCharge 4, descarga al cambiar de postura) · NUEVO; m_aegis sale`
- [ ] **d1 Escudo Alzado** — NUEVO · `stats.blockPower · NUEVO (combat-math: BLOCK_REDUCTION + blockPower/100; antes +15 % de bloqueo, que chocaba con CAPS.block)` · traducir: `stats.blockPower: pendiente de la cola W2 (combat-math + recompute (cola W2))`
- [ ] **d2 Puño Telúrico** — existe · `mod terremoto dmg · existe`
- [ ] **d3 Paso Pesado** — existe · `mod g_carga_escudo cdr · existe`
- [ ] **d4 Contragolpe** — NUEVO · `power g_d_contragolpe · NUEVO (④ onDamaged blocked, icd 1)`
- [ ] **d5 Echar Raíces** — NUEVO · `power g_d_raices · NUEVO (afterCast + gainGauge)`
- [ ] **d6 Pisotón** — NUEVO · `power g_d_pisoton · NUEVO (afterCast → windup 0 + planted; si ese Terremoto lleva Asalto Total, sale gratis pero sin su +%)`
- [ ] **d7 Mirada Desafiante** — existe · `mod g_carga_escudo tauntDur · claves (g.forceTarget)` · traducir: `tauntDur → taunt (+s)`
- [ ] **d8·A Barrido de Escudo** — NUEVO · `power g_d_barrido · NUEVO (afterCast g_guardia + dealArea + forceTarget; icd 3)`
- [ ] **d8·B Cambio Certero** — NUEVO · `power g_d_cambio_certero · NUEVO (afterCast g_guardia → forceCrit; condAdd 30 contra Quebrantados; ya no llena Quebranto)`
- [ ] **d9·A Réplicas** — existe · `mod terremoto aftershocks +2 · claves` · traducir: `aftershocks → repeat { n, every, coef, needPlanted } (mod repeatAdd)`
- [ ] **d9·B Epicentro** — NUEVO · `power g_d_epicentro · NUEVO (condAdd + addStagger)`
- [ ] **d10·A Gran Arrastre** — existe · `mod g_carga_escudo dragWidth 3 · claves`
- [ ] **d10·B Choque Frontal** — NUEVO · `power g_d_choque · NUEVO (onHit élite → stop + addStagger)`
- [ ] **d11 Corpulencia** — existe · `stats.hpPct · existe`
- [ ] **d12 Tambor de Guerra** — NUEVO · `power g_d_tambor · NUEVO (onHit → cdReduce g_piel; tope r s por lanzamiento, antes 3 s; solo mientras la Piel se recarga, que empieza al acabar)`
- [ ] **d13 Escudo por Delante** — NUEVO · `power g_d_escudo_delante · NUEVO (afterCast: bloqueos seguros, fuera de CAPS.block; antes −20 % que el tope de reducción anulaba)`
- [ ] **d14 Guardia Rota** — NUEVO · `power g_d_guardia_rota · NUEVO (vuln 3 s)`
- [ ] **d15·A Última Línea** — NUEVO · `power g_d_ultima_linea · NUEVO (onLethal + lanza g_u_ciudadela 3 s)`
- [ ] **d15·B Aguante de Roca** — NUEVO · `power g_d_roca · NUEVO (inmune a control + blockPower +10 con gaugeValue 5; blockPower con tope 90: un bloqueo nunca para todo el golpe; antes «todo el golpe»)`
- [ ] **d16 Fuerza del Bastión** — NUEVO · `power g_d_fuerza_bastion · NUEVO (stats con gaugeValue)`
- [ ] **d17 Avalancha** — NUEVO · `power g_d_avalancha · NUEVO (afterCast cdReduce, tope r s; suelo de 4 s tras todas las reducciones y reinicios, también los de otros poderes: un resetCd o la media recarga de Asalto Total respetan el suelo)`
- [ ] **d18 Vínculo de Escudo** — NUEVO · `power g_d_vinculo · NUEVO (⑫ onAllyDamaged + g.damageAlly; lógica de g_vinculo)`
- [ ] **d19 Tierra Viva** — NUEVO · `power g_d_tierra_viva · NUEVO (onTick si p.planted)`
- [ ] **d20 Guarnición** — NUEVO · `power g_d_guarnicion · NUEVO (aura del buff g_u_ciudadela; sin cargas en la Ciudadela gratis de Inexpugnable 4 y Última Línea; respeta el bloqueo de 5 s tras descargar)`
- [ ] **d21 Proa Blindada** — NUEVO · `power g_d_proa · NUEVO (bloqueo frontal durante el avance)`
- [ ] **d22 Guardia Viva** — NUEVO · `power g_d_guardia_viva · NUEVO (afterCast g_guardia + addBuff con pilas + cura por p.sustain(); antes −2/4/6 % de daño recibido, que el tope de reducción anulaba)`
- [ ] **d23 Réplica Honda** — NUEVO · `power g_d_replica_honda · NUEVO (condAdd; ×2 contra Quebrantados; ya no llena Quebranto)`
- [ ] **d24 Escolta** — NUEVO · `power g_d_escolta · NUEVO (g.shield sobre g.allies(); icd 10)`
- [ ] **d25 Guardia Total (final)** — NUEVO · `power g_d_guardia_total · NUEVO (cuenta cambios; stanceBoth 3/4,5/6 s; icd 15 desde que se activa; los cambios hechos durante Guardia Total no cuentan)`
- [ ] **d26 Montaña Viva (final)** — NUEVO · `power g_d_montana_viva · NUEVO (contador + eco ×0,5/0,75/1 + applyCC stun; el eco es echo:true: no cuenta para el contador ni gasta el Golpe de Titán)`
- [ ] **d27 Cabeza de Puente (final)** — NUEVO · `power g_d_cabeza_puente · NUEVO (afterCast gainGauge 2/3/5 con icd 10 + forceTarget)`
- [ ] **d28 Inexpugnable (ápice)** — NUEVO · `power g_d_inexpugnable (rangos) · NUEVO (rango 3: cdReduce g_piel 6, solo mientras se recarga; rango 4: icd 45 y Ciudadela gratis aparte del suelo de las definitivas)`

## Cruzado (z0…28)

- [ ] **z0 Voto Sagrado (clave, gratis)** — NUEVO · `mecánica fervor rehecha (perPerfect, perDetonate, perCastMax 1, Veredicto sin Fervor ni suelta perfecta) · NUEVO`
- [ ] **z1 Peso de la Ley** — existe · `mod g_juicio detonatePct · claves` · traducir: `detonatePct → mod sobre mark.detonate.pct`
- [ ] **z2 Devoción** — existe · `mod g_martillo dmg · existe`
- [ ] **z3 Ligereza** — existe · `mod g_sendero cdr · existe`
- [ ] **z4 Marca Indeleble** — existe · `mod g_juicio markDur · claves` · traducir: `markDur → mark.dur (o mod markDur)`
- [ ] **z5 Sello del Martillo** — NUEVO · `power g_z_sello_martillo · NUEVO (onCast perfect → marca)`
- [ ] **z6 Golpe Consagrado** — NUEVO · `power g_z_golpe_consagrado · NUEVO (campo z_suelo; como mucho 2 a la vez: el 3.º quita el más viejo, también con Tierra Santa; el daño de las zonas sagradas no se suma: cada enemigo recibe solo el de la más fuerte; antes, con Tierra Santa, 5–10 suelos de 40 %/s sumados)`
- [ ] **z7 Sendero Bendito** — NUEVO · `mod g_sendero zoneHeal + power g_z_sendero_veloz · NUEVO (la cura no se suma entre senderos: como mucho 3 %/s por aliado; entra en la cubeta de zona del Cruzado, 4 %/s por receptor)`
- [ ] **z8·A Estallido de Luz** — NUEVO · `power g_z_estallido_luz · NUEVO (dealArea; cada enemigo recibe como mucho un estallido por lanzamiento, el de la marca más fuerte: crece con N y no con N²; antes, N marcas × N enemigos)`
- [ ] **z8·B Condena** — NUEVO · `power g_z_condena · NUEVO (markDur ×2 + addStagger)`
- [ ] **z9·A Veredicto Generoso** — NUEVO · `power g_z_veredicto_generoso · NUEVO (radio 8; g.heal 3 % al resto del grupo a 8 m; el más herido sigue con el 6/10 %)`
- [ ] **z9·B Veredicto Pesado** — NUEVO · `power g_z_veredicto_pesado · NUEVO (condAdd + addStagger)`
- [ ] **z10·A Senda Ardiente** — existe · `mod g_sendero zoneCoef + slow · claves (el daño del sendero no se suma entre senderos ni con otras zonas sagradas: vale la más fuerte)`
- [ ] **z10·B Refugio** — NUEVO · `power g_z_refugio · NUEVO (g.shield, target lowest)`
- [ ] **z11 Juicio Presto** — existe · `mod g_juicio cdr · existe`
- [ ] **z12 Liturgia** — NUEVO · `tv.perfectCdrAll · NUEVO (como critCdrAll, sin @ultimate ni g_piel; icd 2: ≤ 0,5 s/s, antes ~0,9 s/s)`
- [ ] **z13 Tierra Bendita** — existe · `mod @holyZone radius + zoneDur · claves`
- [ ] **z14 Altar de Campaña** — NUEVO · `power g_z_altar · NUEVO (campo con aura; los altares no se suman: +10 % como mucho aunque haya 2 puestos)`
- [ ] **z15·A Milagro** — NUEVO · `power g_z_milagro · NUEVO (onLethal + ⑫ onAllyLethal)`
- [ ] **z15·B Luz Protectora** — NUEVO · `power g_z_luz_protectora · NUEVO (g.shield)`
- [ ] **z16 Ardor** — NUEVO · `power g_z_ardor · NUEVO (stats con gaugeValue)`
- [ ] **z17 Velo Sagrado** — NUEVO · `power g_z_velo · NUEVO (condDr en zona)`
- [ ] **z18 Absolución** — NUEVO · `power g_z_absolucion · NUEVO (g.heal, target lowest; icd 2)`
- [ ] **z19 Fe Serena** — NUEVO · `mod @charge perfectWin +0,1 s por rango (base 0,25 s: 0,35/0,45 s) · clave NUEVA`
- [ ] **z20 Gracia del Cielo** — NUEVO · `power g_z_gracia · NUEVO (cdReduce; antes 3/6 s; respeta el suelo de las definitivas: 70 % de su base, 42 s)`
- [ ] **z21 Vigilia** — NUEVO · `power g_z_vigilia · NUEVO (cdRate ×2 en zona; suelo de 4 s del Sendero, con o sin Vigilia, tras todas las reducciones y reinicios: Ligereza, c3, Disciplina, Ritmo de Combate y la media recarga de Asalto Total; como el de la Carga, d17; antes ~2,2–2,6 s)`
- [ ] **z22 Edicto** — NUEVO · `power g_z_edicto · NUEVO (marca a vecinos)`
- [ ] **z23 Racha de Fe** — NUEVO · `power g_z_racha · NUEVO (pilas; se reinicia al fallar la ventana)`
- [ ] **z24 Peregrino** — NUEVO · `power g_z_peregrino · NUEVO (condAdd + condDr en zona)`
- [ ] **z25 Tribunal (final)** — NUEVO · `power g_z_tribunal · NUEVO (markUses 2/2/3; repeticiones ×0,4/0,6/0,8; las repeticiones no dan Fervor: el tope es 1 por lanzamiento)`
- [ ] **z26 Martillo Celestial (final)** — NUEVO · `power g_z_martillo_celestial · NUEVO (eco del golpe ×0,3/0,45/0,6; echo:true)`
- [ ] **z27 Tierra Santa (final)** — NUEVO · `power g_z_tierra_santa · NUEVO (campos con stopIf y tope 8/14/20 s; las zonas sagradas no se suman: cada enemigo recibe solo el daño de la más fuerte y la cura de 1 %/s tampoco se suma; Golpe Consagrado, 2 suelos como mucho; cubeta de zona del Cruzado: sendero + Tierra Santa ≤ 4 %/s por receptor)`
- [ ] **z28 Aureola (ápice)** — NUEVO · `power g_z_aureola (rangos) · NUEVO (rango 4: eco de g_u_cataclismo a carga completa ×0,5, icd 30; no da Fervor)`

## Héroe · Titán (berserker · guardian)

- [ ] **t0 Golpe de Titán (clave, gratis)** — NUEVO · `power g_ti_golpe_titan · NUEVO (⑪ onResource cuenta Furia gastada; solo la pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; antes +60 %; las copias y repeticiones gratis, echo:true, no lo gastan)`
- [ ] **t1 Talla de Gigante** — existe · `stats.hpPct + mod @melee range · claves`
- [ ] **t2·A Sacudida Amplia** — existe · `mod g_ti_golpe_titan radius 7 + slow · claves`
- [ ] **t2·B Aplastar** — existe · `tv.titanPct 80 + titanStagger 25 · claves` · traducir: `tv.titanPct: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`; `tv.titanStagger: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`
- [ ] **t3 Aplomo** — NUEVO · `power g_ti_aplomo · NUEVO (buff imparable 3 s)`
- [ ] **t4·A Bramido de Titán (concede g_h_bramido)** — vacío
- [ ] **t4·B Piel de Montaña** — NUEVO · `power g_ti_piel_montana · NUEVO (g.shield)`
- [ ] **t5 Ira Acumulada** — existe · `tuning titán every 50 · clave`
- [ ] **t6 Eco Pétreo** — NUEVO · `power g_ti_eco_petreo · NUEVO (timers: repite la sacudida)`
- [ ] **t7 Quiebrahuesos** — NUEVO · `power g_ti_quiebrahuesos · NUEVO (condAdd contra Quebrantados)`
- [ ] **t8·A Derrumbe** — NUEVO · `power g_ti_derrumbe · NUEVO (onKill + dealArea)`
- [ ] **t8·B Mole** — NUEVO · `power g_ti_mole · NUEVO (pilas por blanco; tope 2)`
- [ ] **t9 Temblor** — NUEVO · `power g_ti_temblor · NUEVO (e.weakenOutgoing)`
- [ ] **t10 Músculo de Gigante** — existe · `mod @spender dmg · existe`
- [ ] **t11 Peso Acumulado** — NUEVO · `power g_ti_peso · NUEVO (cdReduce @ultimate 1 s, antes 2 s; respeta el suelo de las definitivas: 70 % de su base)`
- [ ] **t12 Coloso Despierto (final)** — NUEVO · `power g_ti_coloso · NUEVO (icd 30 + buff de 8 s)`

## Héroe · Gladiador (berserker · cruzado)

- [ ] **l0 Rival (clave, gratis)** — NUEVO · `power g_gl_rival · NUEVO (marca de duelo; onKill la pasa)`
- [ ] **l1 Ovación** — NUEVO · `tv.rivalKillHeal · NUEVO (10 % por Rival élite o jefe, o al Quebrantarlo; 2 % por Rival normal con icd 2; por la cubeta de p.sustain())` · traducir: `tv.rivalKillHeal: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`
- [ ] **l2·A Muchos Rivales** — NUEVO · `power g_gl_rivales · NUEVO (3 marcas de Rival)`
- [ ] **l2·B Duelo a Muerte** — NUEVO · `power g_gl_duelo · NUEVO`
- [ ] **l3 Tiro de Arena** — NUEVO · `power g_gl_tiro_arena · NUEVO (al nombrar Rival: eco de g_lanza gratis contra él + slow; icd 4: una Lanza que mata ya no encadena otra; no hace falta la Lanza en la barra)`
- [ ] **l4·A Desafío de Arena (concede g_h_desafio)** — vacío
- [ ] **l4·B Contraataque** — NUEVO · `power g_gl_contraataque · NUEVO (tras la esquiva)`
- [ ] **l5 Gloria** — NUEVO · `power g_gl_gloria · NUEVO (pilas por muerte y por cada 20 % de vida del Rival; se borran fuera de combate)`
- [ ] **l6 Retirada Táctica** — NUEVO · `power g_gl_retirada · NUEVO (tras la esquiva: eco de g_lanza gratis contra el Rival, icd 6; no hace falta la Lanza en la barra)`
- [ ] **l7 Sangre en la Arena** — NUEVO · `power g_gl_sangre_arena · NUEVO (daño de crítico por pila de Gloria)`
- [ ] **l8·A Clamor del Público** — NUEVO · `power g_gl_clamor · NUEVO (miedo + addStagger a jefes)`
- [ ] **l8·B Pulgar Abajo** — NUEVO · `power g_gl_pulgar · NUEVO (condAdd con menos del 30 %)`
- [ ] **l9 Finta** — NUEVO · `power g_gl_finta · NUEVO (cdReduce @movement)`
- [ ] **l10 Campeón** — NUEVO · `power g_gl_campeon · NUEVO (condCrit contra el Rival)`
- [ ] **l11 Vítores** — NUEVO · `power g_gl_vitores · NUEVO (cdReduce @ultimate 6 s, icd 15; solo Rival élite o jefe, o al Quebrantarlo; antes 4 s por cada Rival sin tope; respeta el suelo de las definitivas)`
- [ ] **l12 Triunfo (final)** — NUEVO · `power g_gl_triunfo · NUEVO (buff con 5 de Gloria o al Quebrantar al Rival; matar +1 s hasta 15 s; icd 35 desde que se activa = 15 s como mucho y 20 s de espera; antes +2 s por muerte sin tope)`

## Héroe · Caudillo (guardian · cruzado)

- [ ] **u0 Pendón (clave, gratis)** — NUEVO · `power g_cau_pendon · NUEVO (campo con aura; icd 15, dura 12 s: 80 % del tiempo; antes 10 s cada 20 s)`
- [ ] **u1 Asta Alta** — existe · `tuning pendón radius 12 · clave`
- [ ] **u2·A Pendón de Asalto** — existe · `tuning pendón dmgPct 16 · clave`
- [ ] **u2·B Pendón de Defensa** — existe · `tuning pendón drPct 16 · clave`
- [ ] **u3 Arenga** — NUEVO · `power g_cau_arenga · NUEVO (g.heal sobre g.allies())`
- [ ] **u4·A Estandarte de Guerra (concede g_h_estandarte)** — vacío
- [ ] **u4·B Abanderado** — NUEVO · `power g_cau_abanderado · NUEVO (el campo sigue al jugador)`
- [ ] **u5 Clarín** — NUEVO · `power g_cau_clarin · NUEVO (gainResource 20)`
- [ ] **u6 Tropel** — existe · `aura del Pendón moveSpd 15 · clave`
- [ ] **u7 Línea de Batalla** — existe · `aura del Pendón e.weakenOutgoing 10 · clave`
- [ ] **u8·A Desbandada** — NUEVO · `power g_cau_desbandada · NUEVO (miedo + addStagger a jefes)`
- [ ] **u8·B Orden de Ataque** — NUEVO · `power g_cau_orden · NUEVO (vuln al de más vida)`
- [ ] **u9 Doble Asta** — existe · `tuning pendón durS 20 · clave (antes «2 Pendones a la vez», que sin Estandarte de Guerra no hacía nada)`
- [ ] **u10 Disciplina** — existe · `aura del Pendón cdr 12 · clave (antes 10: con el 80 % del tiempo, ~10 % efectivo)`
- [ ] **u11 Relevo** — NUEVO · `power g_cau_relevo · NUEVO (fin del campo + g.shield)`
- [ ] **u12 Gran Estandarte (final)** — NUEVO · `power g_cau_gran_estandarte · NUEVO (icd 40)`

## Activas de talento (ranura 2, sin forja)

- [ ] **g_t_aliento** Segundo Aliento · defense · Nv21 · concede c11 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **grito_guerra** Grito de Guerra · utility · Nv27 · concede c17 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **g_t_intervencion** Intervención · utility · Nv31 · concede c22 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **g_h_bramido** Bramido de Titán · utility · Nv72 · concede t4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [ ] **g_h_desafio** Desafío de Arena · utility · Nv72 · concede l4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [ ] **g_h_estandarte** Estandarte de Guerra · utility · Nv72 · concede u4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)

## Kit (KA1): habilidades base y de especialización

- [ ] **g_tajo** Tajo · basic · Nv1 · physical
- [ ] **g_hendidura** Hendidura · spender · Nv2 · physical
- [ ] **embestida** Embestida · movement · Nv4 · physical
- [ ] **g_piel** Piel de Hierro · defense · Nv6 · physical
- [ ] **g_lanza** Lanza Arrojadiza · spender · Nv8 · physical
- [ ] **g_remolino** Remolino Sangriento · spec · Nv10 · berserker · physical
- [ ] **g_salto** Salto Devastador · movement · Nv12 · berserker · physical
- [ ] **g_rajar** Rajar · spender · Nv14 · berserker · physical
- [ ] **g_u_furia** Furia Inmortal · ultimate · Nv15 · berserker · physical
- [ ] **g_guardia** Cambio de Guardia · spec · Nv10 · guardian · physical
- [ ] **g_carga_escudo** Carga de Escudo · movement · Nv12 · guardian · physical
- [ ] **terremoto** Terremoto · spender · Nv14 · guardian · physical
- [ ] **g_u_ciudadela** Ciudadela · ultimate · Nv15 · guardian · physical
- [ ] **g_juicio** Juicio · spec · Nv10 · cruzado · holy
- [ ] **g_sendero** Sendero de Luz · movement · Nv12 · cruzado · holy
- [ ] **g_martillo** Martillo de Guerra · spender · Nv14 · cruzado · holy
- [ ] **g_u_cataclismo** Cataclismo · ultimate · Nv15 · cruzado · holy

## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)

### g_tajo · Tajo

- [ ] **Mejora · Filo Ancho** — NUEVO · `★add{cleave:+.15, cleaveR:+.5}`
- [ ] **I (UNI) · Desgarro** — NUEVO · `hitDot bleed .6/3s · ★add{cleave:−.2}`
- [ ] **II (AREA) · Siega** — NUEVO · `★set{cleave:.75, cleaveR:3} · dmg −15 (absorbe a Embate)`

### g_hendidura · Hendidura

- [ ] **Mejora · Arco Amplio** — NUEVO · `★set{angle:150}`
- [ ] **I (UNI) · Rompefilas** — NUEVO · `★power v_rompefilas (condAdd)`
- [ ] **II (AREA) · Grieta** — NUEVO · `zone · zoneDur 2 · ★add{zoneMax:1}`

### embestida · Embestida

- [ ] **Mejora · Carga Fiera** — NUEVO · `range +28 · ★add{genOnHit:4}`
- [ ] **I (CTRL) · Carnero** — NUEVO · `★power v_carnero · stun .5`
- [ ] **II (MOV) · Doble Carga** — NUEVO · `★charges 2`

### g_piel · Piel de Hierro

- [ ] **Mejora · Acero Templado** — NUEVO · `★power v_temple (onCast g.heal)`
- [ ] **I (AREA) · Espinas** — NUEVO · `★power v_espinas (onDamaged)`
- [ ] **II (AGU) · Inamovible** — NUEVO · `durS 2 · ★set{unstoppable:true} · cdr −25 (antes «Bastión», nombre de la barra del Guardián)`

### g_lanza · Lanza Arrojadiza

- [ ] **Mejora · Punta de Arpón** — existe · `slow 2 · slowPct 30`
- [ ] **I (CTRL) · Arpón** — NUEVO · `★pull 4 · ★set{pierce:false} · dmg +30`
- [ ] **II (AREA) · Jabalinas** — NUEVO · `★set{count:3, spread:.25} · dmg −30`

### g_remolino · Remolino Sangriento

- [ ] **Mejora · Giro Firme** — NUEVO · `★set{slowImmune:true}`
- [ ] **I (UNI) · Remolino Anclado** — NUEVO · `★set{moveFree:false, radius:2} · dmg +60` · traducir: `moveFree → moveMul (moveFree:false → moveMul: 0)`
- [ ] **II (CTRL) · Ciclón** — NUEVO · `★pull 1/tic (r 5) · dmg −15`

### g_salto · Salto Devastador

- [ ] **Mejora · Caída Pesada** — existe · `radius +33`
- [ ] **I (CTRL) · Caída Atronadora** — NUEVO · `★set{recast:0} · ★pull 2 · stun .75 (antes «Impacto Sísmico»: nombre de un nodo de la Maga)`
- [ ] **II (MOV) · Salto Rasante** — NUEVO · `★set{range:12, airT:.25} · dmg −20`

### g_rajar · Rajar

- [ ] **Mejora · Filo Encadenado** — NUEVO · `★set{comboWin:4}`
- [ ] **I (UNI) · Estocada Final** — NUEVO · `★set{steps[2]:{type:line, range:5, width:1}} · dmg3 +40` · traducir: `dmg3 → mul: { 'steps.2.coef': × } (3.er paso del combo)`
- [ ] **II (AREA) · Molino** — NUEVO · `★set{steps:*{type:area, at:self, radius:2.5}} · dmg −20`

### g_u_furia · Furia Inmortal

- [ ] **Mejora · Sin Freno** — existe · `durS 2`
- [ ] **I (AGU) · Sed Voraz** — NUEVO · `★power v_sed_voraz (sustain) · endHeal 0`
- [ ] **II (UNI) · Frenesí** — NUEVO · `buff aspdPct +40 · ★set{minHpPct:0}`

### g_guardia · Cambio de Guardia

- [ ] **Mejora · Guardia Ligera** — existe · `cdr −50`
- [ ] **I (APO) · Guardia Compartida** — NUEVO · `★aura stance 50 % (r 6)` · línea de 87 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (CTRL) · Guardia Opresiva** — NUEVO · `★aura enemigos: weakenOutgoing 10 / slow 20 (r 5)` · línea de 110 > 70 (aviso A1: acortar o divergencias.json)

### g_carga_escudo · Carga de Escudo

- [ ] **Mejora · Avance Largo** — existe · `range +25`
- [ ] **I (CTRL) · Arrollador** — NUEVO · `★knock 1 · stagger 20` · línea de 81 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (MOV) · Carga Veloz** — NUEVO · `★set{range:12, dashT:.3, drag:false, taunt:0}`

### terremoto · Terremoto

- [ ] **Mejora · Suelo Partido** — existe · `radius +20`
- [ ] **I (UNI) · Martinete** — NUEVO · `★set{at:aim3, radius:2.5} · dmg +60 · stagger 20` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AREA) · Falla** — NUEVO · `★set{type:line, range:10, width:2} · dmg −20 · slow 2` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### g_u_ciudadela · Ciudadela

- [ ] **Mejora · Muros Altos** — existe · `durS 2`
- [ ] **I (MOV) · Ciudadela Andante** — NUEVO · `★set{root:false, moveSpd:.5} · dr 25` · traducir: `moveSpd → moveMul`; `dr → set: { 'buff.dr': v } (DR del buff; en una postura, stance.modes[i].stats.dr)` · línea de 77 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AREA) · Empalizada** — NUEVO · `★power v_empalizada (onDamaged, icd 1)` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### g_juicio · Juicio

- [ ] **Mejora · Juicio Amplio** — existe · `radius +33`
- [ ] **I (UNI) · Sentencia** — NUEVO · `★set{radius:0, single:true, markDur:12} · vulnPct 15` · traducir: `single → radius 0 / splash 0`; `markDur → mark.dur (o mod markDur)`; `vulnPct → mark.weakPct` · línea de 74 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AREA) · Tres Juicios** — NUEVO · `★set{count:3, spread:.3} · dmg −40`

### g_sendero · Sendero de Luz

- [ ] **Mejora · Huella de Luz** — existe · `zoneDur +2`
- [ ] **I (APO) · Escolta de Luz** — NUEVO · `★power v_escolta_luz (g.shield al aliado; icd 6 por aliado)` · línea de 106 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (MOV) · Destello Doble** — NUEVO · `★charges 2 · zoneDur −2`

### g_martillo · Martillo de Guerra

- [ ] **Mejora · Mano Ágil** — existe · `chargeT .9 · perfect [.6, .85]` · traducir: `chargeT → charge.max` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **I (UNI) · Martillo Arrojado** — NUEVO · `★set{type:proj, range:12, radius:0} · dmg +40` · línea de 80 > 70 (aviso A1: acortar o divergencias.json)
- [ ] **II (AREA) · Onda Sagrada** — NUEVO · `★add{wave:{range:8, coef:.6}}`

### g_u_cataclismo · Cataclismo

- [ ] **Mejora · Columna Ancha** — existe · `radius +25`
- [ ] **I (UNI) · Rayo del Cielo** — NUEVO · `★set{radius:2} · dmg +80 · stagger 40`
- [ ] **II (APO) · Amanecer** — NUEVO · `★heal 30 (r 8) · shield 10 · dmg −40` · línea de 83 > 70 (aviso A1: acortar o divergencias.json)

## Barra y recomendaciones

Todas las referencias de barra y recomendaciones están en el catálogo.

Activas de talento NUEVAS (en `--write` no entran en `GUERRERO_TALENT_SKILLS` hasta que existan): `g_h_bramido`, `g_h_desafio`, `g_h_estandarte`.

Activas de talento del juego actual que dejan de serlo en 2g (pasan al kit de `skills-guerrero.js` o se retiran; lista de cada doc): `g_t_bramido`, `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega`, `g_t_desafio`, `g_t_muro`, `g_t_carga`, `g_t_devocion`, `g_t_veredicto`, `g_t_justicia`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`g_tajo_firme`, `g_tajo_voraz`, `g_ensanamiento`, `g_sin_cuartel`, `g_derribo`, `g_silenciar`, `g_polvareda`, `g_carga_reparadora`, `g_furia_protectora`, `g_desbordante`, `g_ira_contenida`, `g_temple`, `g_desequilibrio`, `g_persecucion`, `g_rencor`, `g_ira_gasto`, `g_rugido_carga`, `g_inquebrantable`, `g_senor_guerra`, `g_asalto_total`, `g_b_reabrir`, `g_b_caida_brutal`, `g_b_contagio`, `g_b_desangrar`, `g_b_onda_choque`, `g_b_remate_certero`, `g_b_salto_aplastante`, `g_b_sangre_hirviente`, `g_b_sin_suelo`, `g_b_avidez`, `g_b_ultimo_trago`, `g_b_caida_sangrienta`, `g_b_estallido_rojo`, `g_b_verdugo`, `g_b_impetu`, `g_b_danza_carmesi`, `g_b_golpe_gracia`, `g_b_estampida`, `g_b_corazon_indomable`, `g_d_contragolpe`, `g_d_raices`, `g_d_pisoton`, `g_d_barrido`, `g_d_cambio_certero`, `g_d_epicentro`, `g_d_choque`, `g_d_tambor`, `g_d_escudo_delante`, `g_d_guardia_rota`, `g_d_ultima_linea`, `g_d_roca`, `g_d_fuerza_bastion`, `g_d_avalancha`, `g_d_vinculo`, `g_d_tierra_viva`, `g_d_guarnicion`, `g_d_proa`, `g_d_guardia_viva`, `g_d_replica_honda`, `g_d_escolta`, `g_d_guardia_total`, `g_d_montana_viva`, `g_d_cabeza_puente`, `g_d_inexpugnable`, `g_z_sello_martillo`, `g_z_golpe_consagrado`, `g_z_sendero_veloz`, `g_z_estallido_luz`, `g_z_condena`, `g_z_veredicto_generoso`, `g_z_veredicto_pesado`, `g_z_refugio`, `g_z_altar`, `g_z_milagro`, `g_z_luz_protectora`, `g_z_ardor`, `g_z_velo`, `g_z_absolucion`, `g_z_gracia`, `g_z_vigilia`, `g_z_edicto`, `g_z_racha`, `g_z_peregrino`, `g_z_tribunal`, `g_z_martillo_celestial`, `g_z_tierra_santa`, `g_z_aureola`, `g_ti_golpe_titan`, `g_ti_aplomo`, `g_ti_piel_montana`, `g_ti_eco_petreo`, `g_ti_quiebrahuesos`, `g_ti_derrumbe`, `g_ti_mole`, `g_ti_temblor`, `g_ti_peso`, `g_ti_coloso`, `g_gl_rival`, `g_gl_rivales`, `g_gl_duelo`, `g_gl_tiro_arena`, `g_gl_contraataque`, `g_gl_gloria`, `g_gl_retirada`, `g_gl_sangre_arena`, `g_gl_clamor`, `g_gl_pulgar`, `g_gl_finta`, `g_gl_campeon`, `g_gl_vitores`, `g_gl_triunfo`, `g_cau_pendon`, `g_cau_arenga`, `g_cau_abanderado`, `g_cau_clarin`, `g_cau_desbandada`, `g_cau_orden`, `g_cau_relevo`, `g_cau_gran_estandarte`, `v_rompefilas`, `v_carnero`, `v_temple`, `v_espinas`, `v_sed_voraz`, `v_empalizada`, `v_escolta_luz`

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **berserker · Sed** (0–100) — generar: +1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo) · descargar: A 100: Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0 · pérdida: −8 por segundo tras 4 s fuera de combate · `sed · perHpPct 1 · perBleedTick 2 · bleedPerSec 10 · satedT 6 · decayAfter 4 · decayRate 8 · lowHpPct 40`
- **guardian · Bastión** (0–5 cargas) — generar: +1 carga por bloqueo y +1 cada 2 s plantado (sin moverte) en combate. Cada carga: −4 % de daño recibido · descargar: Con 5, cambiar de postura las gasta: a Muralla, escudo del 20 % a ti y al más herido; a Ariete, onda de 300 % a 5 m · pérdida: Caminando pierdes 1 carga cada 2 s (la Carga de Escudo no la gasta). Tras descargar, 5 s sin llenarse · `bastion · max 5 · perBlock 1 · plantedEvery 2 · moveLossEvery 2 · drPerCharge 4 · burstShield 20 · burstCoef 3 · burstStagger 30 · lockAfterBurst 5`
- **cruzado · Fervor** (0–3) — generar: +1 por suelta perfecta o detonación de Juicio (como mucho 1 por lanzamiento; Cataclismo perfecto: +3) y +1 cada 3 Tajos · descargar: A 3, tu siguiente Martillo sale al instante como Veredicto: +50 % y cura un 6 % al más herido. El Veredicto no da Fervor · pérdida: No se pierde con el tiempo; fuera de combate, −1 cada 10 s · `fervor · max 3 · perPerfect 1 · perDetonate 1 · perCastMax 1 · basicHits 3 · verdictPct 50 · verdictHeal 6 · verdictNoGain · decayOOC 10`
