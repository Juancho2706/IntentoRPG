# Pendientes · Guerrero (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft guerrero` desde `docs/mockups/data/talents-v2-guerrero.js` (sha1 b0f282184d7d, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 135 NUEVO · 49 existe · 3 vacío (nodos y opciones). **Forja:** 40 NUEVO · 11 existe · 0 vacío.

> **Archivo fusionado** (Paso 2 · Conversor, tanda 1). Reúne la lista de comprobación que genera el conversor (esta parte, hasta «Barras de mecánica») y, a continuación, las notas que KA-guerrero y KT-guerrero escribieron a mano (antes en `tools/convert-v2/out/pendientes-guerrero.md`, que ahora solo enlaza aquí). Como se edita a mano, `convert.mjs --draft` ya no lo regenera salvo con `--regenerar-pendientes`. Los números de sección de las notas (§1–§6 y §4.1–§4.5) son los de siempre, porque `js/` los cita; por eso hay dos «§4» (la Forja de KA2 y las notas de KT): las citas a la Forja dicen «§4 (Forja)» y las de KT nombran su apartado (§4.1–§4.5).

> **Casillas (tanda 2, KAT-guerrero).** `[x]` = su prueba en verde con el catálogo y la forja reales: cada nodo u opción, su `CHECKS[id]` de `tests/test-talentos-guerrero.mjs` (la suite exige una prueba por nodo y 0 nodos sin efecto); el kit y las activas de talento, `tests/test-skills-guerrero.mjs` §5 y `tests/test-powers-guerrero.mjs` (b); cada pieza de la forja, su bloque de `tests/test-forge-guerrero.mjs` §4. Lo que sigue `[ ]` lleva su motivo. Lo hecho en la tanda 2 y lo que queda, en §7.

## Árbol de clase (c1…c30)

- [x] **c1 Constitución** — existe · `stats.hpPct · existe`
- [x] **c2 Fuerza Bruta** — existe · `mod @all dmg · existe`
- [x] **c3 Avance Implacable** — existe · `mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s; Carga de Escudo y Sendero de Luz 10 → 7,6 s)`
- [x] **c4 Curtido** — existe · `mod g_piel durS · claves`
- [x] **c5·A Tajo Firme** — NUEVO · `power g_tajo_firme · NUEVO (onHit + gainResource)`
- [x] **c5·B Tajo Voraz** — NUEVO · `power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50)`
- [x] **c6·A Ensañamiento** — NUEVO · `power g_ensanamiento · NUEVO (condAdd @spender)`
- [x] **c6·B Sin Cuartel** — NUEVO · `power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento)`
- [x] **c7 Marcha Imparable** — existe · `mod @movement unstoppable + 1 s · claves`
- [x] **c8 Determinación** — NUEVO · `tv.drHighFury · NUEVO (copia de drHighMana)` · traducir: `tv.drHighFury → tv.drHighMana (recurso > 50 %: Furia, Maná o Energía)`
- [x] **c9·A Golpe Pesado** — NUEVO · `mod @windup windupAdd .3 · dmg +40 · stagger 15 + mod @charge perfectDmg 25 · stagger 15 · claves NUEVAS (corrección de la etapa 2: c9 también toca las cargas)` · traducir: `perfectDmg → perfectPct`
- [x] **c9·B Sin Pausa** — NUEVO · `mod @windup windupMult .5 · windupMove · keepPlanted + mod @charge moveWhileCharging 1 · claves NUEVAS` · traducir: `windupMult → windupMul (mod, %)`; `windupMove → moveMul (preparación: 1 = como hoy, 0 = plantado)`; `moveWhileCharging → charge.moveMul`
- [x] **c10·A Derribo** — NUEVO · `power g_derribo · NUEVO (onCast + applyCC knock)`
- [x] **c10·B Silenciar** — NUEVO · `power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes)`
- [x] **c11·A Segundo Aliento (concede g_t_aliento)** — existe · `activa g_t_aliento · existe; si no está en la barra, Piel de Hierro la lanza al 50 % (gasta la mitad de tu Furia y cura 1 % por cada 3 gastados; respeta su recarga de 30 s; esa Furia no cuenta como gastada)`
- [x] **c11·B Coraza de Hierro** — existe · `power g_coraza_hierro · existe`
- [x] **c12 Furia Creciente** — NUEVO · `stats.resGainPct · NUEVO (clave)`
- [x] **c13 Golpes Precisos** — existe · `stats.crit · existe`
- [x] **c14·A Polvareda** — NUEVO · `power g_polvareda · NUEVO (afterCast @movement + applyCC slow; con movilidades que se relanzan, cuenta el primer uso de la cadena)`
- [x] **c14·B Carga Reparadora** — NUEVO · `power g_carga_reparadora · NUEVO (afterCast @movement + cura por p.sustain() + cleanse; icd 6 en la cura; con movilidades que se relanzan, cuenta el primer uso de la cadena; antes g.heal sin icd: ~15 saltos por ciclo en Estampida ≈ 5 %/s fuera de la cubeta)`
- [x] **c15·A Furia Protectora** — NUEVO · `power g_furia_protectora · NUEVO (④ onDamaged: 1 de Furia por cada 0,5 % de la vida máxima; sin Furia, pagas con vida; esa Furia no cuenta como gastada para c26, c29 ni t0)`
- [x] **c15·B Furia Desbordante** — NUEVO · `stats resMaxAdd 30 + power g_desbordante · NUEVO` · traducir: `stats.resMaxAdd → stats.mp (recurso máximo plano)`
- [x] **c16·A Filo Dentado** — existe · `tv.bleedPct 25 + tv.bleedDur 1 · existen`
- [x] **c16·B Contundencia** — NUEVO · `tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves)` · traducir: `tv.staggerPct → stats.staggerPct (fx.stats)`
- [x] **c17·A Grito de Guerra (concede grito_guerra)** — existe · `activa grito_guerra · existe (pasa de base a talento); si no está en la barra, Piel de Hierro la lanza al 50 % (+15 de Furia y +5 % al grupo a 15 m 8 s; respeta su recarga de 20 s)`
- [x] **c17·B Ira Contenida** — NUEVO · `power g_ira_contenida · NUEVO (icd 20 + condAdd)`
- [x] **c18 Hierro Vivo** — existe · `mod g_piel cdr · existe`
- [x] **c19 Temple** — NUEVO · `power g_temple · NUEVO (onHit + extendBuff)`
- [x] **c20 Desequilibrio** — NUEVO · `power g_desequilibrio · NUEVO (onHit + condCrit)`
- [x] **c21 Persecución** — NUEVO · `power g_persecucion · NUEVO (condAdd @movement; vale en cada salto de la cadena: es el daño del golpe, como Peso Muerto, no un efecto al llegar)`
- [x] **c22·A Intervención (concede g_t_intervencion)** — existe · `activa g_t_intervencion · existe (pasa de la 1 a la 2); si no está en la barra, Piel de Hierro la lanza al 50 % (sin salto: escudo del 8 % de tu vida a ti y al aliado más cercano; respeta su recarga de 20 s)`
- [x] **c22·B Hermandad de Armas** — existe · `power g_aura_hermandad · existe`
- [x] **c23 Ritmo de Combate** — NUEVO · `tv.basicCritCdr · NUEVO (copia de dartCritCdr)`
- [x] **c24 Brazo Veloz** — existe · `stats.aspdPct · existe`
- [x] **c25 Rencor** — NUEVO · `power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd)`
- [x] **c26 Desenfreno** — NUEVO · `power g_ira_gasto · NUEVO (⑪ onResource; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; el id g_desenfreno ya es de Sangre Hirviente y sale)`
- [x] **c27 Rugido de Carga** — NUEVO · `power g_rugido_carga · NUEVO (e.weakenOutgoing; con movilidades que se relanzan, cuenta el primer uso de la cadena)`
- [x] **c28 Inquebrantable (final)** — NUEVO · `power g_inquebrantable · NUEVO (presupuesto de daño evitado: 40/55/70 % de la vida máxima; sin caducidad por tiempo; la recarga de 15 s empieza al romperse; el mecanismo escala por rango; antes 3/4/5 golpes, que una manada rompía en ~1 s)`
- [x] **c29 Señor de la Guerra (final)** — NUEVO · `power g_senor_guerra · NUEVO (echo del canal; solo cuenta la Furia pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; con cargar y soltar, la copia sale con la misma carga; la copia es echo:true: no cuenta como suelta perfecta ni como lanzamiento, no da Fervor, no gasta el Golpe de Titán ni suma al 3.er Terremoto de Montaña Viva)`
- [x] **c30 Asalto Total (final)** — NUEVO · `power g_asalto_total · NUEVO (afterCast @movement + onKill cdReduce del 50 % de la recarga restante, icd 6; antes resetCd sin tope; respeta el suelo de 4 s de d17 y el del Sendero (z21) y cuenta como recarga «seguida» de b27; con movilidades que se relanzan, cuenta el primer uso de la cadena, como c14 y c27)`

## Berserker (b0…28)

- [x] **b0 Sed de Batalla (clave, gratis)** — existe · `mecánica sed + power m_berserk · existen (ya no concede activa: el Remolino está en el libro)`
- [x] **b1 Heridas Abiertas** — NUEVO · `tv.bleedDur · NUEVO (copia de burnDur)`
- [x] **b2 Instinto Asesino** — existe · `mod g_rajar crit · claves`
- [x] **b3 Zancada** — existe · `mod g_salto cdr · existe`
- [x] **b4 Sangre Espesa** — existe · `tv.bleedPct · existe`
- [x] **b5 Reabrir** — NUEVO · `power g_b_reabrir · NUEVO (onHit + replaceDoT + gainGauge)`
- [x] **b6 Caída Brutal** — NUEVO · `power g_b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3)`
- [x] **b7 Suelo Roto** — existe · `mod g_salto slow 2 · slowPct · claves`
- [x] **b8·A Contagio** — NUEVO · `power g_b_contagio · NUEVO (onKill; lógica de p_propagacion)`
- [x] **b8·B Desangrar** — NUEVO · `power g_b_desangrar · NUEVO (lógica de p_acumular)`
- [x] **b9·A Onda de Choque** — NUEVO · `power g_b_onda_choque · NUEVO (afterCast step 3 + dealArea)`
- [x] **b9·B Remate Certero** — NUEVO · `power g_b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger)`
- [x] **b10·A Salto en Cadena** — NUEVO · `mod g_salto recastAdd 2 · clave NUEVA`
- [x] **b10·B Salto Aplastante** — NUEVO · `power g_b_salto_aplastante · NUEVO (condAdd por cadena)`
- [x] **b11 Festín de Sangre** — existe · `tv.bleedKillHeal + bleedKillMana · existen`
- [x] **b12 Ritmo de Matanza** — NUEVO · `tv.critCdrAll · NUEVO (como critFireCdr, sobre todas menos @ultimate y g_piel; icd 1,5: ≤ 0,67 s/s)`
- [x] **b13 Peso Muerto** — existe · `mod g_salto dmg · existe`
- [x] **b14 Impacto Aturdidor** — existe · `mod g_salto stun .5 + stagger 15 · claves; icd 4 por enemigo (además de los rendimientos decrecientes de applyCC)`
- [x] **b15·A Negación de la Muerte** — existe · `power g_negacion · existe (+ deja la Sed en 50: no la llena, para no encadenar con la salvación de Corazón Indomable 3)`
- [x] **b15·B Umbral del Dolor** — NUEVO · `tv.drLowHp · NUEVO (clave)`
- [x] **b16 Sangre Hirviente** — NUEVO · `power g_b_sangre_hirviente · NUEVO (stats con gaugeValue)`
- [x] **b17 Sin Suelo** — NUEVO · `power g_b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia)`
- [x] **b18 Avidez** — NUEVO · `power g_b_avidez · NUEVO (onHit en el canal)`
- [x] **b19 Último Trago** — NUEVO · `power g_b_ultimo_trago · NUEVO (gainGauge sed)`
- [x] **b20 Alcance Salvaje** — existe · `mod @melee radius · existe`
- [x] **b21 Caída Sangrienta** — NUEVO · `power g_b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT)`
- [x] **b22 Estallido Rojo** — NUEVO · `power g_b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT)`
- [x] **b23 Verdugo** — NUEVO · `power g_b_verdugo · NUEVO (condAdd por vida que falta)`
- [x] **b24 Ímpetu** — NUEVO · `power g_b_impetu · NUEVO (addBuff con pilas)`
- [x] **b25 Danza Carmesí (final)** — NUEVO · `power g_b_danza_carmesi · NUEVO (canal con drainPerSec y tope por rango: 6/10/20 s)`
- [x] **b26 Golpe de Gracia (final)** — NUEVO · `power g_b_golpe_gracia · NUEVO (echo del paso 3 al 30/45/60 % + vuln 1/2,5/4 s: con un 3.er golpe cada ~2,7 s, Vulnerable el 37/93/100 % del tiempo)`
- [x] **b27 Estampida Sin Fin (final)** — NUEVO · `power g_b_estampida · NUEVO (onChainEnd + cdReduce 4/8 s o resetCd; como mucho 2 reinicios seguidos: la 3.ª cadena espera la recarga normal; cuentan también los de otros poderes: la media recarga de Asalto Total es una «seguida»)`
- [x] **b28 Corazón Indomable (ápice)** — NUEVO · `power g_b_corazon_indomable (rangos) · NUEVO (rango 3: icd 60, antes una vez por Sed; rango 4: icd 90)`

## Guardián (d0…28)

- [x] **d0 Pie Firme (clave, gratis)** — NUEVO · `mecánica bastion rehecha (plantedEvery 2, moveLossEvery 2, drPerCharge 4, descarga al cambiar de postura) · NUEVO; m_aegis sale`
- [x] **d1 Escudo Alzado** — NUEVO · `stats.blockPower · NUEVO (combat-math: BLOCK_REDUCTION + blockPower/100; antes +15 % de bloqueo, que chocaba con CAPS.block)`
- [x] **d2 Puño Telúrico** — existe · `mod terremoto dmg · existe`
- [x] **d3 Paso Pesado** — existe · `mod g_carga_escudo cdr · existe`
- [x] **d4 Contragolpe** — NUEVO · `power g_d_contragolpe · NUEVO (④ onDamaged blocked, icd 1)`
- [x] **d5 Echar Raíces** — NUEVO · `power g_d_raices · NUEVO (afterCast + gainGauge)`
- [x] **d6 Pisotón** — NUEVO · `power g_d_pisoton · NUEVO (afterCast → windup 0 + planted; si ese Terremoto lleva Asalto Total, sale gratis pero sin su +%)`
- [x] **d7 Mirada Desafiante** — existe · `mod g_carga_escudo tauntDur · claves (g.forceTarget)` · traducir: `tauntDur → taunt (+s)`
- [x] **d8·A Barrido de Escudo** — NUEVO · `power g_d_barrido · NUEVO (afterCast g_guardia + dealArea + forceTarget; icd 3)`
- [x] **d8·B Cambio Certero** — NUEVO · `power g_d_cambio_certero · NUEVO (afterCast g_guardia → forceCrit; condAdd 30 contra Quebrantados; ya no llena Quebranto)`
- [x] **d9·A Réplicas** — existe · `mod terremoto aftershocks +2 · claves` · traducir: `aftershocks → repeat { n, every, coef, needPlanted } (mod repeatAdd)`
- [x] **d9·B Epicentro** — NUEVO · `power g_d_epicentro · NUEVO (condAdd + addStagger)`
- [x] **d10·A Gran Arrastre** — existe · `mod g_carga_escudo dragWidth 3 · claves`
- [x] **d10·B Choque Frontal** — NUEVO · `power g_d_choque · NUEVO (onHit élite → stop + addStagger)`
- [x] **d11 Corpulencia** — existe · `stats.hpPct · existe`
- [x] **d12 Tambor de Guerra** — NUEVO · `power g_d_tambor · NUEVO (onHit → cdReduce g_piel; tope r s por lanzamiento, antes 3 s; solo mientras la Piel se recarga, que empieza al acabar)`
- [x] **d13 Escudo por Delante** — NUEVO · `power g_d_escudo_delante · NUEVO (afterCast: bloqueos seguros, fuera de CAPS.block; antes −20 % que el tope de reducción anulaba)`
- [x] **d14 Guardia Rota** — NUEVO · `power g_d_guardia_rota · NUEVO (vuln 3 s)`
- [x] **d15·A Última Línea** — NUEVO · `power g_d_ultima_linea · NUEVO (onLethal + lanza g_u_ciudadela 3 s)`
- [x] **d15·B Aguante de Roca** — NUEVO · `power g_d_roca · NUEVO (inmune a control + blockPower +10 con gaugeValue 5; blockPower con tope 90: un bloqueo nunca para todo el golpe; antes «todo el golpe»)`
- [x] **d16 Fuerza del Bastión** — NUEVO · `power g_d_fuerza_bastion · NUEVO (stats con gaugeValue)`
- [x] **d17 Avalancha** — NUEVO · `power g_d_avalancha · NUEVO (afterCast cdReduce, tope r s; suelo de 4 s tras todas las reducciones y reinicios, también los de otros poderes: un resetCd o la media recarga de Asalto Total respetan el suelo)`
- [x] **d18 Vínculo de Escudo** — NUEVO · `power g_d_vinculo · NUEVO (⑫ onAllyDamaged + g.damageAlly; lógica de g_vinculo)`
- [x] **d19 Tierra Viva** — NUEVO · `power g_d_tierra_viva · NUEVO (onTick si p.planted)`
- [x] **d20 Guarnición** — NUEVO · `power g_d_guarnicion · NUEVO (aura del buff g_u_ciudadela; sin cargas en la Ciudadela gratis de Inexpugnable 4 y Última Línea; respeta el bloqueo de 5 s tras descargar)`
- [x] **d21 Proa Blindada** — NUEVO · `power g_d_proa · NUEVO (bloqueo frontal durante el avance)`
- [x] **d22 Guardia Viva** — NUEVO · `power g_d_guardia_viva · NUEVO (afterCast g_guardia + addBuff con pilas + cura por p.sustain(); antes −2/4/6 % de daño recibido, que el tope de reducción anulaba)`
- [x] **d23 Réplica Honda** — NUEVO · `power g_d_replica_honda · NUEVO (condAdd; ×2 contra Quebrantados; ya no llena Quebranto)`
- [x] **d24 Escolta** — NUEVO · `power g_d_escolta · NUEVO (g.shield sobre g.allies(); icd 10)`
- [x] **d25 Guardia Total (final)** — NUEVO · `power g_d_guardia_total · NUEVO (cuenta cambios; stanceBoth 3/4,5/6 s; icd 15 desde que se activa; los cambios hechos durante Guardia Total no cuentan)`
- [x] **d26 Montaña Viva (final)** — NUEVO · `power g_d_montana_viva · NUEVO (contador + eco ×0,5/0,75/1 + applyCC stun; el eco es echo:true: no cuenta para el contador ni gasta el Golpe de Titán)`
- [x] **d27 Cabeza de Puente (final)** — NUEVO · `power g_d_cabeza_puente · NUEVO (afterCast gainGauge 2/3/5 con icd 10 + forceTarget)`
- [x] **d28 Inexpugnable (ápice)** — NUEVO · `power g_d_inexpugnable (rangos) · NUEVO (rango 3: cdReduce g_piel 6, solo mientras se recarga; rango 4: icd 45 y Ciudadela gratis aparte del suelo de las definitivas)`

## Cruzado (z0…28)

- [x] **z0 Voto Sagrado (clave, gratis)** — NUEVO · `mecánica fervor rehecha (perPerfect, perDetonate, perCastMax 1, Veredicto sin Fervor ni suelta perfecta) · NUEVO`
- [x] **z1 Peso de la Ley** — existe · `mod g_juicio detonatePct · claves` · traducir: `detonatePct → mod sobre mark.detonate.pct`
- [x] **z2 Devoción** — existe · `mod g_martillo dmg · existe`
- [x] **z3 Ligereza** — existe · `mod g_sendero cdr · existe`
- [x] **z4 Marca Indeleble** — existe · `mod g_juicio markDur · claves` · traducir: `markDur → mark.dur (o mod markDur)`
- [x] **z5 Sello del Martillo** — NUEVO · `power g_z_sello_martillo · NUEVO (onCast perfect → marca)`
- [x] **z6 Golpe Consagrado** — NUEVO · `power g_z_golpe_consagrado · NUEVO (campo z_suelo; como mucho 2 a la vez: el 3.º quita el más viejo, también con Tierra Santa; el daño de las zonas sagradas no se suma: cada enemigo recibe solo el de la más fuerte; antes, con Tierra Santa, 5–10 suelos de 40 %/s sumados)`
- [x] **z7 Sendero Bendito** — NUEVO · `mod g_sendero zoneHeal + power g_z_sendero_veloz · NUEVO (la cura no se suma entre senderos: como mucho 3 %/s por aliado; entra en la cubeta de zona del Cruzado, 4 %/s por receptor)`
- [x] **z8·A Estallido de Luz** — NUEVO · `power g_z_estallido_luz · NUEVO (dealArea; cada enemigo recibe como mucho un estallido por lanzamiento, el de la marca más fuerte: crece con N y no con N²; antes, N marcas × N enemigos)`
- [x] **z8·B Condena** — NUEVO · `power g_z_condena · NUEVO (markDur ×2 + addStagger)`
- [x] **z9·A Veredicto Generoso** — NUEVO · `power g_z_veredicto_generoso · NUEVO (radio 8; g.heal 3 % al resto del grupo a 8 m; el más herido sigue con el 6/10 %)`
- [x] **z9·B Veredicto Pesado** — NUEVO · `power g_z_veredicto_pesado · NUEVO (condAdd + addStagger)`
- [x] **z10·A Senda Ardiente** — existe · `mod g_sendero zoneCoef + slow · claves (el daño del sendero no se suma entre senderos ni con otras zonas sagradas: vale la más fuerte)`
- [x] **z10·B Refugio** — NUEVO · `power g_z_refugio · NUEVO (g.shield, target lowest)`
- [x] **z11 Juicio Presto** — existe · `mod g_juicio cdr · existe`
- [x] **z12 Liturgia** — NUEVO · `tv.perfectCdrAll · NUEVO (como critCdrAll, sin @ultimate ni g_piel; icd 2: ≤ 0,5 s/s, antes ~0,9 s/s)`
- [x] **z13 Tierra Bendita** — existe · `mod @holyZone radius + zoneDur · claves`
- [x] **z14 Altar de Campaña** — NUEVO · `power g_z_altar · NUEVO (campo con aura; los altares no se suman: +10 % como mucho aunque haya 2 puestos)`
- [x] **z15·A Milagro** — NUEVO · `power g_z_milagro · NUEVO (onLethal + ⑫ onAllyLethal)`
- [x] **z15·B Luz Protectora** — NUEVO · `power g_z_luz_protectora · NUEVO (g.shield)`
- [x] **z16 Ardor** — NUEVO · `power g_z_ardor · NUEVO (stats con gaugeValue)`
- [x] **z17 Velo Sagrado** — NUEVO · `power g_z_velo · NUEVO (condDr en zona)`
- [x] **z18 Absolución** — NUEVO · `power g_z_absolucion · NUEVO (g.heal, target lowest; icd 2)`
- [x] **z19 Fe Serena** — NUEVO · `mod @charge perfectWin +0,1 s por rango (base 0,25 s: 0,35/0,45 s) · clave NUEVA`
- [x] **z20 Gracia del Cielo** — NUEVO · `power g_z_gracia · NUEVO (cdReduce; antes 3/6 s; respeta el suelo de las definitivas: 70 % de su base, 42 s)`
- [x] **z21 Vigilia** — NUEVO · `power g_z_vigilia · NUEVO (cdRate ×2 en zona; suelo de 4 s del Sendero, con o sin Vigilia, tras todas las reducciones y reinicios: Ligereza, c3, Disciplina, Ritmo de Combate y la media recarga de Asalto Total; como el de la Carga, d17; antes ~2,2–2,6 s)`
- [x] **z22 Edicto** — NUEVO · `power g_z_edicto · NUEVO (marca a vecinos)`
- [x] **z23 Racha de Fe** — NUEVO · `power g_z_racha · NUEVO (pilas; se reinicia al fallar la ventana)`
- [x] **z24 Peregrino** — NUEVO · `power g_z_peregrino · NUEVO (condAdd + condDr en zona)`
- [x] **z25 Tribunal (final)** — NUEVO · `power g_z_tribunal · NUEVO (markUses 2/2/3; repeticiones ×0,4/0,6/0,8; las repeticiones no dan Fervor: el tope es 1 por lanzamiento)`
- [x] **z26 Martillo Celestial (final)** — NUEVO · `power g_z_martillo_celestial · NUEVO (eco del golpe ×0,3/0,45/0,6; echo:true)`
- [x] **z27 Tierra Santa (final)** — NUEVO · `power g_z_tierra_santa · NUEVO (campos con stopIf y tope 8/14/20 s; las zonas sagradas no se suman: cada enemigo recibe solo el daño de la más fuerte y la cura de 1 %/s tampoco se suma; Golpe Consagrado, 2 suelos como mucho; cubeta de zona del Cruzado: sendero + Tierra Santa ≤ 4 %/s por receptor)`
- [x] **z28 Aureola (ápice)** — NUEVO · `power g_z_aureola (rangos) · NUEVO (rango 4: eco de g_u_cataclismo a carga completa ×0,5, icd 30; no da Fervor)`

## Héroe · Titán (berserker · guardian)

- [x] **t0 Golpe de Titán (clave, gratis)** — NUEVO · `power g_ti_golpe_titan · NUEVO (⑪ onResource cuenta Furia gastada; solo la pagada por habilidades: no cuentan Furia Protectora, Segundo Aliento ni el drenaje de Danza Carmesí; antes +60 %; las copias y repeticiones gratis, echo:true, no lo gastan)`
- [x] **t1 Talla de Gigante** — existe · `stats.hpPct + mod @melee range · claves`
- [x] **t2·A Sacudida Amplia** — existe · `mod g_ti_golpe_titan radius 7 + slow · claves`
- [x] **t2·B Aplastar** — existe · `tv.titanPct 80 + titanStagger 25 · claves` · traducir: `tv.titanPct: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`; `tv.titanStagger: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`
- [x] **t3 Aplomo** — NUEVO · `power g_ti_aplomo · NUEVO (buff imparable 3 s)`
- [x] **t4·A Bramido de Titán (concede g_h_bramido)** — vacío
- [x] **t4·B Piel de Montaña** — NUEVO · `power g_ti_piel_montana · NUEVO (g.shield)`
- [x] **t5 Ira Acumulada** — existe · `tuning titán every 50 · clave`
- [x] **t6 Eco Pétreo** — NUEVO · `power g_ti_eco_petreo · NUEVO (timers: repite la sacudida)`
- [x] **t7 Quiebrahuesos** — NUEVO · `power g_ti_quiebrahuesos · NUEVO (condAdd contra Quebrantados)`
- [x] **t8·A Derrumbe** — NUEVO · `power g_ti_derrumbe · NUEVO (onKill + dealArea)`
- [x] **t8·B Mole** — NUEVO · `power g_ti_mole · NUEVO (pilas por blanco; tope 2)`
- [x] **t9 Temblor** — NUEVO · `power g_ti_temblor · NUEVO (e.weakenOutgoing)`
- [x] **t10 Músculo de Gigante** — existe · `mod @spender dmg · existe`
- [x] **t11 Peso Acumulado** — NUEVO · `power g_ti_peso · NUEVO (cdReduce @ultimate 1 s, antes 2 s; respeta el suelo de las definitivas: 70 % de su base)`
- [x] **t12 Coloso Despierto (final)** — NUEVO · `power g_ti_coloso · NUEVO (icd 30 + buff de 8 s)`

## Héroe · Gladiador (berserker · cruzado)

- [x] **l0 Rival (clave, gratis)** — NUEVO · `power g_gl_rival · NUEVO (marca de duelo; onKill la pasa)`
- [x] **l1 Ovación** — NUEVO · `tv.rivalKillHeal · NUEVO (10 % por Rival élite o jefe, o al Quebrantarlo; 2 % por Rival normal con icd 2; por la cubeta de p.sustain())` · traducir: `tv.rivalKillHeal: clave de la clase (KT-guerrero, <CLASE>_TV_KEYS)`
- [x] **l2·A Muchos Rivales** — NUEVO · `power g_gl_rivales · NUEVO (3 marcas de Rival)`
- [x] **l2·B Duelo a Muerte** — NUEVO · `power g_gl_duelo · NUEVO`
- [x] **l3 Tiro de Arena** — NUEVO · `power g_gl_tiro_arena · NUEVO (al nombrar Rival: eco de g_lanza gratis contra él + slow; icd 4: una Lanza que mata ya no encadena otra; no hace falta la Lanza en la barra)`
- [x] **l4·A Desafío de Arena (concede g_h_desafio)** — vacío
- [x] **l4·B Contraataque** — NUEVO · `power g_gl_contraataque · NUEVO (tras la esquiva)`
- [x] **l5 Gloria** — NUEVO · `power g_gl_gloria · NUEVO (pilas por muerte y por cada 20 % de vida del Rival; se borran fuera de combate)`
- [x] **l6 Retirada Táctica** — NUEVO · `power g_gl_retirada · NUEVO (tras la esquiva: eco de g_lanza gratis contra el Rival, icd 6; no hace falta la Lanza en la barra)`
- [x] **l7 Sangre en la Arena** — NUEVO · `power g_gl_sangre_arena · NUEVO (daño de crítico por pila de Gloria)`
- [x] **l8·A Clamor del Público** — NUEVO · `power g_gl_clamor · NUEVO (miedo + addStagger a jefes)`
- [x] **l8·B Pulgar Abajo** — NUEVO · `power g_gl_pulgar · NUEVO (condAdd con menos del 30 %)`
- [x] **l9 Finta** — NUEVO · `power g_gl_finta · NUEVO (cdReduce @movement)`
- [x] **l10 Campeón** — NUEVO · `power g_gl_campeon · NUEVO (condCrit contra el Rival)`
- [x] **l11 Vítores** — NUEVO · `power g_gl_vitores · NUEVO (cdReduce @ultimate 6 s, icd 15; solo Rival élite o jefe, o al Quebrantarlo; antes 4 s por cada Rival sin tope; respeta el suelo de las definitivas)`
- [x] **l12 Triunfo (final)** — NUEVO · `power g_gl_triunfo · NUEVO (buff con 5 de Gloria o al Quebrantar al Rival; matar +1 s hasta 15 s; icd 35 desde que se activa = 15 s como mucho y 20 s de espera; antes +2 s por muerte sin tope)`

## Héroe · Caudillo (guardian · cruzado)

- [x] **u0 Pendón (clave, gratis)** — NUEVO · `power g_cau_pendon · NUEVO (campo con aura; icd 15, dura 12 s: 80 % del tiempo; antes 10 s cada 20 s)`
- [x] **u1 Asta Alta** — existe · `tuning pendón radius 12 · clave`
- [x] **u2·A Pendón de Asalto** — existe · `tuning pendón dmgPct 16 · clave`
- [x] **u2·B Pendón de Defensa** — existe · `tuning pendón drPct 16 · clave`
- [x] **u3 Arenga** — NUEVO · `power g_cau_arenga · NUEVO (g.heal sobre g.allies())`
- [x] **u4·A Estandarte de Guerra (concede g_h_estandarte)** — vacío
- [x] **u4·B Abanderado** — NUEVO · `power g_cau_abanderado · NUEVO (el campo sigue al jugador)`
- [x] **u5 Clarín** — NUEVO · `power g_cau_clarin · NUEVO (gainResource 20)`
- [x] **u6 Tropel** — existe · `aura del Pendón moveSpd 15 · clave`
- [x] **u7 Línea de Batalla** — existe · `aura del Pendón e.weakenOutgoing 10 · clave`
- [x] **u8·A Desbandada** — NUEVO · `power g_cau_desbandada · NUEVO (miedo + addStagger a jefes)`
- [x] **u8·B Orden de Ataque** — NUEVO · `power g_cau_orden · NUEVO (vuln al de más vida)`
- [x] **u9 Doble Asta** — existe · `tuning pendón durS 20 · clave (antes «2 Pendones a la vez», que sin Estandarte de Guerra no hacía nada)`
- [x] **u10 Disciplina** — existe · `aura del Pendón cdr 12 · clave (antes 10: con el 80 % del tiempo, ~10 % efectivo)`
- [x] **u11 Relevo** — NUEVO · `power g_cau_relevo · NUEVO (fin del campo + g.shield)`
- [x] **u12 Gran Estandarte (final)** — NUEVO · `power g_cau_gran_estandarte · NUEVO (icd 40)`

## Activas de talento (ranura 2, sin forja)

- [x] **g_t_aliento** Segundo Aliento · defense · Nv21 · concede c11 — existe en el juego: revisar texto y números contra la línea 2g
- [x] **grito_guerra** Grito de Guerra · utility · Nv27 · concede c17 — existe en el juego: revisar texto y números contra la línea 2g
- [x] **g_t_intervencion** Intervención · utility · Nv31 · concede c22 — existe en el juego: revisar texto y números contra la línea 2g
- [x] **g_h_bramido** Bramido de Titán · utility · Nv72 · concede t4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [x] **g_h_desafio** Desafío de Arena · utility · Nv72 · concede l4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)
- [x] **g_h_estandarte** Estandarte de Guerra · utility · Nv72 · concede u4 (héroe) — NUEVA: tipo genérico o comportamiento (KA1)

## Kit (KA1): habilidades base y de especialización

- [x] **g_tajo** Tajo · basic · Nv1 · physical
- [x] **g_hendidura** Hendidura · spender · Nv2 · physical
- [x] **embestida** Embestida · movement · Nv4 · physical
- [x] **g_piel** Piel de Hierro · defense · Nv6 · physical
- [x] **g_lanza** Lanza Arrojadiza · spender · Nv8 · physical
- [x] **g_remolino** Remolino Sangriento · spec · Nv10 · berserker · physical
- [x] **g_salto** Salto Devastador · movement · Nv12 · berserker · physical
- [x] **g_rajar** Rajar · spender · Nv14 · berserker · physical
- [x] **g_u_furia** Furia Inmortal · ultimate · Nv15 · berserker · physical
- [x] **g_guardia** Cambio de Guardia · spec · Nv10 · guardian · physical
- [x] **g_carga_escudo** Carga de Escudo · movement · Nv12 · guardian · physical
- [x] **terremoto** Terremoto · spender · Nv14 · guardian · physical
- [x] **g_u_ciudadela** Ciudadela · ultimate · Nv15 · guardian · physical
- [x] **g_juicio** Juicio · spec · Nv10 · cruzado · holy
- [x] **g_sendero** Sendero de Luz · movement · Nv12 · cruzado · holy
- [x] **g_martillo** Martillo de Guerra · spender · Nv14 · cruzado · holy
- [x] **g_u_cataclismo** Cataclismo · ultimate · Nv15 · cruzado · holy

## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)

### g_tajo · Tajo

- [x] **Mejora · Filo Ancho** — NUEVO · `★add{cleave:+.15, cleaveR:+.5}`
- [x] **I (UNI) · Desgarro** — NUEVO · `hitDot bleed .6/3s · ★add{cleave:−.2}`
- [x] **II (AREA) · Siega** — NUEVO · `★set{cleave:.75, cleaveR:3} · dmg −15 (absorbe a Embate)`

### g_hendidura · Hendidura

- [x] **Mejora · Arco Amplio** — NUEVO · `★set{angle:150}`
- [x] **I (UNI) · Rompefilas** — NUEVO · `★power v_rompefilas (condAdd)`
- [x] **II (AREA) · Grieta** — NUEVO · `zone · zoneDur 2 · ★add{zoneMax:1}`

### embestida · Embestida

- [x] **Mejora · Carga Fiera** — NUEVO · `range +28 · ★add{genOnHit:4}`
- [x] **I (CTRL) · Carnero** — NUEVO · `★power v_carnero · stun .5`
- [x] **II (MOV) · Doble Carga** — NUEVO · `★charges 2`

### g_piel · Piel de Hierro

- [x] **Mejora · Acero Templado** — NUEVO · `★power v_temple (onCast g.heal)`
- [x] **I (AREA) · Espinas** — NUEVO · `★power v_espinas (onDamaged)`
- [x] **II (AGU) · Inamovible** — NUEVO · `durS 2 · ★set{unstoppable:true} · cdr −25 (antes «Bastión», nombre de la barra del Guardián)`

### g_lanza · Lanza Arrojadiza

- [x] **Mejora · Punta de Arpón** — existe · `slow 2 · slowPct 30`
- [x] **I (CTRL) · Arpón** — NUEVO · `★pull 4 · ★set{pierce:false} · dmg +30`
- [x] **II (AREA) · Jabalinas** — NUEVO · `★set{count:3, spread:.25} · dmg −30`

### g_remolino · Remolino Sangriento

- [x] **Mejora · Giro Firme** — NUEVO · `★set{slowImmune:true}`
- [x] **I (UNI) · Remolino Anclado** — NUEVO · `★set{moveFree:false, radius:2} · dmg +60` · traducir: `moveFree → moveMul (moveFree:false → moveMul: 0)`
- [x] **II (CTRL) · Ciclón** — NUEVO · `★pull 1/tic (r 5) · dmg −15` · con el poder `v_ciclon` (1 m por giro, también a los del radio del daño; no a los jefes) hasta que el golpe del canal genérico deje de atraer otra vez (petición a W2, §7)

### g_salto · Salto Devastador

- [x] **Mejora · Caída Pesada** — existe · `radius +33`
- [x] **I (CTRL) · Caída Atronadora** — NUEVO · `★set{recast:0} · ★pull 2 · stun .75 (antes «Impacto Sísmico»: nombre de un nodo de la Maga)`
- [x] **II (MOV) · Salto Rasante** — NUEVO · `★set{range:12, airT:.25} · dmg −20`

### g_rajar · Rajar

- [x] **Mejora · Filo Encadenado** — NUEVO · `★set{comboWin:4}`
- [x] **I (UNI) · Estocada Final** — NUEVO · `★set{steps[2]:{type:line, range:5, width:1}} · dmg3 +40` · traducir: `dmg3 → mul: { 'steps.2.coef': × } (3.er paso del combo)`
- [x] **II (AREA) · Molino** — NUEVO · `★set{steps:*{type:area, at:self, radius:2.5}} · dmg −20`

### g_u_furia · Furia Inmortal

- [x] **Mejora · Sin Freno** — existe · `durS 2`
- [x] **I (AGU) · Sed Voraz** — NUEVO · `★power v_sed_voraz (sustain) · endHeal 0`
- [x] **II (UNI) · Frenesí** — NUEVO · `buff aspdPct +40 · ★set{minHpPct:0}`

### g_guardia · Cambio de Guardia

- [x] **Mejora · Guardia Ligera** — existe · `cdr −50`
- [x] **I (APO) · Guardia Compartida** — NUEVO · `★aura stance 50 % (r 6)` · línea de 87 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (CTRL) · Guardia Opresiva** — NUEVO · `★aura enemigos: weakenOutgoing 10 / slow 20 (r 5)` · línea de 110 > 70 (aviso A1: acortar o divergencias.json)

### g_carga_escudo · Carga de Escudo

- [x] **Mejora · Avance Largo** — existe · `range +25`
- [x] **I (CTRL) · Arrollador** — NUEVO · `★knock 1 · stagger 20` · línea de 81 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (MOV) · Carga Veloz** — NUEVO · `★set{range:12, dashT:.3, drag:false, taunt:0}`

### terremoto · Terremoto

- [x] **Mejora · Suelo Partido** — existe · `radius +20`
- [x] **I (UNI) · Martinete** — NUEVO · `★set{at:aim3, radius:2.5} · dmg +60 · stagger 20` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (AREA) · Falla** — NUEVO · `★set{type:line, range:10, width:2} · dmg −20 · slow 2` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### g_u_ciudadela · Ciudadela

- [x] **Mejora · Muros Altos** — existe · `durS 2`
- [x] **I (MOV) · Ciudadela Andante** — NUEVO · `★set{root:false, moveSpd:.5} · dr 25` · traducir: `moveSpd → moveMul`; `dr → set: { 'buff.dr': v } (DR del buff; en una postura, stance.modes[i].stats.dr)` · línea de 77 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (AREA) · Empalizada** — NUEVO · `★power v_empalizada (onDamaged, icd 1)` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)

### g_juicio · Juicio

- [x] **Mejora · Juicio Amplio** — existe · `radius +33`
- [x] **I (UNI) · Sentencia** — NUEVO · `★set{radius:0, single:true, markDur:12} · vulnPct 15` · traducir: `single → radius 0 / splash 0`; `markDur → mark.dur (o mod markDur)`; `vulnPct → mark.weakPct` · línea de 74 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (AREA) · Tres Juicios** — NUEVO · `★set{count:3, spread:.3} · dmg −40`

### g_sendero · Sendero de Luz

- [x] **Mejora · Huella de Luz** — existe · `zoneDur +2`
- [x] **I (APO) · Escolta de Luz** — NUEVO · `★power v_escolta_luz (g.shield al aliado; icd 6 por aliado)` · línea de 106 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (MOV) · Destello Doble** — NUEVO · `★charges 2 · zoneDur −2`

### g_martillo · Martillo de Guerra

- [x] **Mejora · Mano Ágil** — existe · `chargeT .9 · perfect [.6, .85]` · traducir: `chargeT → charge.max` · línea de 78 > 70 (aviso A1: acortar o divergencias.json)
- [x] **I (UNI) · Martillo Arrojado** — NUEVO · `★set{type:proj, range:12, radius:0} · dmg +40` · línea de 80 > 70 (aviso A1: acortar o divergencias.json)
- [x] **II (AREA) · Onda Sagrada** — NUEVO · `★add{wave:{range:8, coef:.6}}`

### g_u_cataclismo · Cataclismo

- [x] **Mejora · Columna Ancha** — existe · `radius +25`
- [x] **I (UNI) · Rayo del Cielo** — NUEVO · `★set{radius:2} · dmg +80 · stagger 40`
- [x] **II (APO) · Amanecer** — NUEVO · `★heal 30 (r 8) · shield 10 · dmg −40` · línea de 83 > 70 (aviso A1: acortar o divergencias.json)

## Barra y recomendaciones

Todas las referencias de barra y recomendaciones están en el catálogo.

Activas de talento NUEVAS (en `--write` no entran en `GUERRERO_TALENT_SKILLS` hasta que existan): `g_h_bramido`, `g_h_desafio`, `g_h_estandarte`.

Activas de talento del juego v1 que dejan de serlo en 2g (pasan al kit de `skills-guerrero.js` o se retiran; lista de cada doc): `g_t_bramido`, `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega`, `g_t_desafio`, `g_t_muro`, `g_t_carga`, `g_t_devocion`, `g_t_veredicto`, `g_t_justicia`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`g_tajo_firme`, `g_tajo_voraz`, `g_ensanamiento`, `g_sin_cuartel`, `g_derribo`, `g_silenciar`, `g_polvareda`, `g_carga_reparadora`, `g_furia_protectora`, `g_desbordante`, `g_ira_contenida`, `g_temple`, `g_desequilibrio`, `g_persecucion`, `g_rencor`, `g_ira_gasto`, `g_rugido_carga`, `g_inquebrantable`, `g_senor_guerra`, `g_asalto_total`, `g_b_reabrir`, `g_b_caida_brutal`, `g_b_contagio`, `g_b_desangrar`, `g_b_onda_choque`, `g_b_remate_certero`, `g_b_salto_aplastante`, `g_b_sangre_hirviente`, `g_b_sin_suelo`, `g_b_avidez`, `g_b_ultimo_trago`, `g_b_caida_sangrienta`, `g_b_estallido_rojo`, `g_b_verdugo`, `g_b_impetu`, `g_b_danza_carmesi`, `g_b_golpe_gracia`, `g_b_estampida`, `g_b_corazon_indomable`, `g_d_contragolpe`, `g_d_raices`, `g_d_pisoton`, `g_d_barrido`, `g_d_cambio_certero`, `g_d_epicentro`, `g_d_choque`, `g_d_tambor`, `g_d_escudo_delante`, `g_d_guardia_rota`, `g_d_ultima_linea`, `g_d_roca`, `g_d_fuerza_bastion`, `g_d_avalancha`, `g_d_vinculo`, `g_d_tierra_viva`, `g_d_guarnicion`, `g_d_proa`, `g_d_guardia_viva`, `g_d_replica_honda`, `g_d_escolta`, `g_d_guardia_total`, `g_d_montana_viva`, `g_d_cabeza_puente`, `g_d_inexpugnable`, `g_z_sello_martillo`, `g_z_golpe_consagrado`, `g_z_sendero_veloz`, `g_z_estallido_luz`, `g_z_condena`, `g_z_veredicto_generoso`, `g_z_veredicto_pesado`, `g_z_refugio`, `g_z_altar`, `g_z_milagro`, `g_z_luz_protectora`, `g_z_ardor`, `g_z_velo`, `g_z_absolucion`, `g_z_gracia`, `g_z_vigilia`, `g_z_edicto`, `g_z_racha`, `g_z_peregrino`, `g_z_tribunal`, `g_z_martillo_celestial`, `g_z_tierra_santa`, `g_z_aureola`, `g_ti_golpe_titan`, `g_ti_aplomo`, `g_ti_piel_montana`, `g_ti_eco_petreo`, `g_ti_quiebrahuesos`, `g_ti_derrumbe`, `g_ti_mole`, `g_ti_temblor`, `g_ti_peso`, `g_ti_coloso`, `g_gl_rival`, `g_gl_rivales`, `g_gl_duelo`, `g_gl_tiro_arena`, `g_gl_contraataque`, `g_gl_gloria`, `g_gl_retirada`, `g_gl_sangre_arena`, `g_gl_clamor`, `g_gl_pulgar`, `g_gl_finta`, `g_gl_campeon`, `g_gl_vitores`, `g_gl_triunfo`, `g_cau_pendon`, `g_cau_arenga`, `g_cau_abanderado`, `g_cau_clarin`, `g_cau_desbandada`, `g_cau_orden`, `g_cau_relevo`, `g_cau_gran_estandarte`, `v_rompefilas`, `v_carnero`, `v_temple`, `v_espinas`, `v_sed_voraz`, `v_empalizada`, `v_escolta_luz`

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **berserker · Sed** (0–100) — generar: +1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo) · descargar: A 100: Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0 · pérdida: −8 por segundo tras 4 s fuera de combate · `sed · perHpPct 1 · perBleedTick 2 · bleedPerSec 10 · satedT 6 · decayAfter 4 · decayRate 8 · lowHpPct 40`
- **guardian · Bastión** (0–5 cargas) — generar: +1 carga por bloqueo y +1 cada 2 s plantado (sin moverte) en combate. Cada carga: −4 % de daño recibido · descargar: Con 5, cambiar de postura las gasta: a Muralla, escudo del 20 % a ti y al más herido; a Ariete, onda de 300 % a 5 m · pérdida: Caminando pierdes 1 carga cada 2 s (la Carga de Escudo no la gasta). Tras descargar, 5 s sin llenarse · `bastion · max 5 · perBlock 1 · plantedEvery 2 · moveLossEvery 2 · drPerCharge 4 · burstShield 20 · burstCoef 3 · burstStagger 30 · lockAfterBurst 5`
- **cruzado · Fervor** (0–3) — generar: +1 por suelta perfecta o detonación de Juicio (como mucho 1 por lanzamiento; Cataclismo perfecto: +3) y +1 cada 3 Tajos · descargar: A 3, tu siguiente Martillo sale al instante como Veredicto: +50 % y cura un 6 % al más herido. El Veredicto no da Fervor · pérdida: No se pierde con el tiempo; fuera de combate, −1 cada 10 s · `fervor · max 3 · perPerfect 1 · perDetonate 1 · perCastMax 1 · basicHits 3 · verdictPct 50 · verdictHeal 6 · verdictNoGain · decayOOC 10`

# Guerrero · catálogo 2g (KA1) y forja 2f (KA2) — comportamientos propios y pendientes

Lo escribe KA-guerrero (E2) y, a partir del §4 de «KT-guerrero (E2)», KT-guerrero. Complementa la lista de comprobación de arriba (la que genera el conversor): hasta la fusión eran dos archivos y el de `out/` decía de la lista generada que «lo regenera el conversor y no se edita a mano»; ahora viven juntos y este archivo se edita a mano.

## 1. Comportamientos propios (`GUERRERO_SKILL_BEHAVIORS`)

Todo lo demás del kit sale de tipos y claves genéricos de §3.6 (`channel` + `hold`, `recast`, `combo` + `steps`, `stance`, `dash` + `dashT`/`drag`/`taunt`, `repeat` + `needPlanted`, `blink` + `trail`, `charge`, `mark` + `detonate`, `aura` + `at:'target'`, `cdOnEnd`, `cdFloor`, `buff.minHpPct`/`endHealPct`).

| Habilidad | Por qué no basta un tipo genérico | Qué haría falta en el motor para quitarlo |
|---|---|---|
| `g_u_cataclismo` | La luz cae donde apuntas **al soltar**: `_releaseWith` rehace el contexto con la mira del **inicio** de la carga. Además consagra el suelo (`floor`: zona de 6 s, 40 %/s, una a la vez) y el tipo `area` no deja zona propia | `charge.aimAtRelease` (W2) y una clave genérica de zona al impactar (`floor`/`zoneOnHit`) |
| `g_u_ciudadela` | Te clava (`moveMul` 0 durante `dur`, plantado ya) **y** da el buff a los aliados del radio con provocación al clavarte y cada segundo: el tipo `buff` no frena al héroe ni reparte a aliados sin `ally`, y el tipo `aura` (que sí tiene `pulse`) no frena, no planta y su primer pulso llega a 1 s | `moveMul` y `plant` genéricos en `aura` y un pulso inicial (W2) |
| `g_h_bramido` | Aturde sin dañar: un `area` con `coef` 0 hace 1 de daño a cada uno (`Enemy.takeDamage` redondea a 1) | `area` con `coef` 0 = solo efectos (W2) |
| `g_h_desafio` | Zona `contain` centrada entre tú y el enemigo de la mira (o sobre él), marca con Debilidad y, sin enemigo al alcance, no gasta la recarga | Tipo `zone` con `at:'between'` y «sin objetivo = sin coste» (W2) |
| ~~`v_onda_sagrada`~~ (forja: Martillo de Guerra II) | **Retirado en la tanda 2:** la clave genérica `wave` ya no repite a los del impacto (cola W2d); la variante es `set: { wave: { range: 8, width: 2, coef: 0.6 } }` | — |

`g_t_aliento` y `g_t_intervencion` siguen siendo comportamientos de `js/powers-guerrero.js` (KT): el catálogo solo los nombra.

## 2. Claves del documento traducidas al vocabulario de §3.6

- Terremoto `aftershocks:{ n:2, coef:.5, needPlanted:1 }` → `repeat:{ n:2, every:.5, coef:.5, needPlanted:true }`.
- Cambio de Guardia `stance:{ a:{ drPct:15, blockPct:10 }, b:{ dmgPct:15 } }` → `stance.modes[{ stats:{ dr, block } }, { stats:{ dmgPct } }]`, `swapCd 3`, `swapGcd 0`.
- Martillo de Guerra `type:'charge'`, `chargeT`, `minT`, `moveWhileCharging`, `perfectBonus:{ dmgPct, gauge }` → `type:'area'` + `charge:{ max, perfect, perfectPct, scale, moveMul, perfectGauge }` (`minT` = el `chargeMin` común, 0,15 s).
- Cataclismo `chargeT 2` → `charge.max 2`; «+3 de Fervor» → `perfectGauge:{ fervor:3 }`.
- Ciudadela `root`, `drPct 40`, `taunt 10` cada 1 s → `moveMul:0`, `plant:true`, `buff:{ dr:40 }`, `pulse:{ every:1, radius:10, taunt:1.5 }`.
- Sendero `healPct 2` → `trail.heal 2`.
- Desafío de Arena «le haces +20 %» → `mark.weakPct 20` (Debilidad: +20 % de **todo** el daño que recibe, no solo el tuyo).

## 3. Peticiones fuera de KA (con dueño)

Las mismas van en las «peticiones» del informe de KA2 para que el orquestador las reparta.

- **KT-guerrero:**
  - ✅ (tanda 2) **Piel de Hierro del Guardián (12 s y −50 %), bloqueante para la defensa del Guardián (§19.2).** §11.1 la pone en el catálogo (`innate:{ guardian }`); el catálogo ya trae el texto del chip del mockup (`innate: { guardian: 'Guardián: 12 s y −50 %' }`), pero **nadie aplica el efecto**: con el Guardián, la Piel sigue en 8 s y −40 %. Decisión del orquestador entre: (a) KT pone en el `spec.innate` del Guardián `mod: { g_piel: { durS: 4, buff: 25 } }` (8 → 12 s; 40 × 1,25 = 50 %, y escala con el rango como el resto del buff) y W1 hace que `aggregateTalents` sume `innate.mod` a `agg.mods` (hoy `recompute` solo lee claves de stats del `innate`); o (b) W2 hace que `resolveSkill` aplique un `mod` por especialización del catálogo (clave nueva en `SKILL_KEYS`, p. ej. `innate: { guardian: { line, mod } }`, y entonces KA cambia el texto por ese objeto). Recomendación de KA: (a), porque la pasiva vive en la especialización (su `innateText` ya lo promete) y el catálogo conserva el chip tal como lo trae el mockup. **Hecho con la opción (a):** `innate.mod` del Guardián (y `drCapAdd`/`blockCapAdd`); `d0` ya no lo lleva.
  - Fervor (`z0`): el catálogo ya da +1 al soltar perfecto el Martillo y +3 el Cataclismo (`perfectGauge`); la mecánica no debe sumarlo otra vez (tope de 1 por lanzamiento salvo el Cataclismo) y el Veredicto no da Fervor.
  - Golpe de Titán (`g_ti_*`): «tu siguiente principal es un Golpe de Titán» se engancha en ③ `afterCast` de `g_h_bramido`.
  - Rival (`g_gl_*`): el encerrado por `g_h_desafio` es `cast.enemy` (o el más cercano a 12 m); su marca es `g_h_desafio`.
  - Pendones (`g_cau_*`): `g_h_estandarte` planta un campo `aura` con `buffId:'g_h_estandarte'`.
  - «Nunca baja de 4 s» (Sendero `z21`, Carga `d17`): `cdFloor` es una fracción de la recarga y solo limita `g.reduceCooldown`; el suelo absoluto lo tiene que respetar el poder (o una clave `cdMinS` de W2).
  - **G1 de `test78`** (rojo desde que el catálogo pasó a 2g): los `touch` de `c6`, `c9` y `c23` (copiados del mockup) nombran ids del kit de especialización: `g_rajar`, `terremoto`, `g_martillo` (c6); `g_rajar`, `terremoto`, `g_juicio`, `g_martillo`, `g_u_cataclismo` (c9); `g_salto`, `g_carga_escudo`, `g_sendero` (c23). Con selectores dejan de fallar: c6 → `['g_hendidura', 'g_lanza', '@spender']`, c9 → `['g_hendidura', '@windup', '@charge']`, c23 → `['g_tajo', '@movement', 'g_piel']`. `test-v2-paridad` no compara `touch`, así que no hace falta divergencia.
- **W2 (cola del motor):**
  - ✅ (cola W2d) `SKILL_KEYS` sin `art` ni `innate`: las 23 habilidades avisan «clave desconocida art» (y Piel de Hierro, `innate`). Las suites del Guerrero toleran SOLO esos dos avisos hasta que lleguen. **Resuelto:** SKILL_KEYS declara `art`, `innate` y `forged`; las suites del Guerrero ya no toleran ningún aviso.
  - ✅ (cola W2d) `wave` vuelve a golpear al enemigo del impacto (y a todo el que está dentro del radio y en la línea). Ya no es bloqueante: Onda Sagrada usa `v_onda_sagrada`. Si se arregla, la variante puede volver a `set: { wave }`. **Resuelto:** Onda Sagrada vuelve a `set: { wave }`; `v_onda_sagrada` retirado.
  - ✅ (cola W2d) Buscar el VFX por variante: `SKILL_FX[def.forged?.varId] ?? SKILL_FX[sk.id]` en `_makeCtx` y en `basicAttack`. Hasta entonces las 14 entradas `<id>_i`/`<id>_ii` de `GUERRERO_FX` no se usan (test-forge-guerrero lo mide y lo da por PENDIENTE). **Resuelto:** `skillFxFor` por variante; test-forge-guerrero §6 lo exige (sonda: Martinete).
  - ✅ (cola W2d) Tope de Quebranto por desplazamiento (por objetivo y por tiempo) o `bossPull:false`: con el Arpón (`g_lanza_i`, `pull 4`), cada lanza suma 20 de Quebranto al jefe por el tirón (28 contra 8 sin la variante), en una principal sin recarga de 20 de Furia: 5 lanzas lo quiebran. El Ciclón ya no tira de los jefes (lo filtra `v_ciclon`). **Resuelto:** resistencia al Quebranto por desplazar (`staggerFromDisplace`); el Ciclón los sigue filtrando en `v_ciclon` (con `pull.boss:false` cuando vuelva al `pull` genérico, §7); la cifra del Arpón, de B1.
  - ✅ (cola W2d) La Estela genérica (`zone`, Grieta de la Hendidura II) hace el 45 % del golpe por segundo (factor fijo de `_finishCast`) y no el 40 % de la línea: falta una clave `zonePct` (o `zoneCoef` sobre la Estela). **Resuelto:** Grieta con `mod zonePct 40` (40 % del arma por segundo con el rango).
  - ✅ (cola W2d) `@windup` no ve la preparación de un paso de combo (`steps[2].windup` de Rajar). **Resuelto:** `skill-resolve` (`comboWindupMods`); c9A/c9B lo prueban con el 3.er golpe de Rajar.
  - ✅ (cola W2d) `hitDot` hace tics fijos de 0,5 s y no lee `tv.bleedDur`/`bleedPct`: el sangrado del Remolino no recibe los talentos de sangrado del Berserker (el de Rajar, `steps[].dot`, sí, por `dotProfile`). **Resuelto:** `resolveHitDot` con `bleedDur`/`bleedPct`; b1 y b4 lo prueban con el Remolino.
  - ✅ (cola W2d) `trail.dur` no recibe `zoneDur` de los talentos. **Resuelto:** `trail.dur` suma `mods.zoneDur` en `skill-resolve`.
  - ✅ (cola W2d) `SKILL_KEYS` sin `forged`: `validateSkillDef` avisa «clave desconocida forged» sobre toda definición forjada. **Resuelto:** `forged` es clave del motor.
  - F7 de `test81` compara solo el perfil en los tipos genéricos: Estocada Final (`g_rajar_i`, que cambia `steps.2`) solo se distingue por la etiqueta `line`. Debería comparar también la definición sin `forged` (como hace test-forge-guerrero).
  - ✅ (cola W2d) `dragWidth` de un talento (Gran Arrastre) reactiva el arrastre en Carga Veloz (`drag:false`): solo debería sumar si la definición arrastra. Arrastrar debería juntar a los arrastrados dentro del golpe de llegada. **Resuelto:** test90 «dragWidth sin drag» y arrastre que junta.
  - (cola W2d, a medias) El canal genérico: sin `slowImmune` y atrae con el radio del daño (hoy lo cubren `v_giro_firme` y `v_ciclon`). **Resuelto Giro Firme** (`slowImmune`; `v_giro_firme` retirado). **El Ciclón sigue en `v_ciclon`:** con `pull { dist, radius, boss:false }` el golpe del tic también atrae y dentro del radio del daño son 2 m por giro (§7; test-forge-guerrero lo vigila).
  - `g._startPulses` es privado y lo llama la Ciudadela (`js/skills-guerrero.js`, comportamiento `g_u_ciudadela`: los pulsos de provocación mientras dura el aura). Falta una vía pública (`g.startPulses(ctx, posFn, alive)`, o pulsos en el tipo `aura` con `moveMul`/`plant`, §1).
  - ✅ (cola W2d) `clampWalkable` avanza en pasos de 0,3 m y pierde el último tramo (un salto de 8 m cae a 7,8 m). **Resuelto:** test90 «clampWalkable entero».
- ✅ **U2:** `hud-model.baseSkillIcon` pide `skills/<id>.webp` y siete habilidades del kit 2g no tienen ese archivo (`g_remolino`, `g_rajar`, `g_guardia`, `g_carga_escudo`, `g_u_ciudadela`, `g_juicio`, `g_sendero`): el humo `boot` cae por sus 404. El catálogo trae ya `art` (el arte del mockup, todo existente en `assets/`); con `baseSkillIcon` usando `sk.art` (el pequeño, el mismo archivo o su par de `skills/`), el humo vuelve a verde sin arte nuevo. **Resuelto:** `baseSkillIcon` prefiere `art`; test-skills-guerrero comprueba que los dos iconos que pide el HUD (grande y pequeño) existen.
- **B1 (banco):**
  - Tres Juicios (`g_juicio_ii`, ★ del Cruzado) contra 5 enemigos juntos a 6 m: el Juicio sin variante hace 142 a cada uno y los marca a todos con su salpicadura de 3 m; Tres Juicios, 85 a cada uno (60 %) y marca a los mismos. Solo gana con enemigos repartidos por el abanico. Si F8 lo exige también en grupo, subir el coeficiente (60 → ~75 %) o la salpicadura de cada martillo.
  - Arpón: Quebranto de los tirones (arriba, W2).
  - El suelo consagrado del Cataclismo (40 %/s) y las réplicas del Terremoto (2 × 50 %).
- **Orquestador:** ratificar la forja legada de Torbellino (§5) y las suites que entran en la cuarentena (§6).

## 4. Forja (KA2): traducción del mockup `k` y decisiones

Las 51 piezas están en `GUERRERO_SKILL_FORGE` (`js/skills-guerrero.js`); los 9 poderes `v_*`, en `js/powers-forge-guerrero.js` (`guerreroForgePowers()`, números en `guerreroForgeTuning()`; tanda 2: sin `v_giro_firme`), y ningún comportamiento propio de la forja (Onda Sagrada es `wave`). Las 12 líneas acortadas a ≤ 70 caracteres están en `divergencias.json` (`aprobada:false`). Cada pieza se prueba en el arnés en `tests/test-forge-guerrero.mjs`.

- **Tajo:** la salpicadura del motor es `cleave × (1 + splashPct/100)`, así que «+.15 / −.2 / .75» se escriben como `splashPct` +30 / −70 / +20 (65 %, 30 %, 75 %). Siega: `dmgDirect −15` (solo el principal baja al 85 %) y `cleaveR` +0,5 sobre la Mejora (3 m). Desgarro: `hitDot` sangrado 60 %/3 s con etiqueta `dot`; `resolveSkill` escala `hitDot.coef` con el rango, así que sigue siendo el 60 % del golpe a rango 5 (medido: 61 % a Nv7 y 62 % a Nv33).
- **Hendidura · Grieta:** la Estela genérica (`zone`, 2 s, una a la vez) con `zonePct 40`: el 40 % del arma por segundo, con el rango (tanda 2; antes el 45 % del golpe, factor fijo del motor); no lleva la etiqueta `zone` para no admitir soportes de zona que no le hacen nada.
- **Embestida · Carnero:** `drag` genérico (no hace falta `v_carnero`) con `dragWidth 1`: con el valor por defecto (1,5 m) los arrastrados quedan a ~2,2 m, en el borde del golpe de llegada (1,9 m), y el aturdimiento falla.
- **Lanza · Arpón:** `pull 4` genérico. A los jefes no los mueve: les suma 20 de Quebranto por lanza (petición de tope a W2/B1).
- **Remolino:** Giro Firme = `slowImmune` en la definición (el canal genérico renueva la inmunidad en cada giro; tanda 2: `v_giro_firme` retirado). Ciclón = `v_ciclon` (atrae 1 m por giro a 5 m y **no toca a los jefes**: el tirón les llenaría Quebranto, y llenar el Quebranto es del Guardián). Lee el canal con `g.channelInfo()` a 10 Hz: el tirón llega hasta 0,1 s después del giro. No usa el `pull` genérico porque el golpe del tic también atrae: dentro del radio del daño serían 2 m por giro (§7). Anclado: `moveMul 0`, `radius 2`.
- **Salto · Caída Atronadora:** `recast:null` (sin relanzar), `pull 2`, `stun .75`.
- **Rajar:** Estocada = `steps.2` en línea y `steps.2.coef ×1,4` (conserva preparación y sangrado). Molino = `steps.*` en área propia. Las dos añaden la etiqueta de su forma (`line`/`area`): ningún soporte la exige ni la prohíbe y ningún selector de talento la lee, así que no cambian qué se engarza ni qué toca cada nodo; en la Estocada, además, es lo único que la distingue para el F7 de `test81` (petición a W2).
- **Furia · Sed Voraz:** `v_sed_voraz` (+8 % de robo solo mientras dura la Furia Inmortal) y `buff.endHealPct 0`.
- **Cambio de Guardia:** «cdr −50» → `cd` y `stance.swapCd` a 1,5 s (el cambio lee `swapCd`, no el CDR). Compartida → `v_guardia_compartida` (media postura a aliados a 6 m); Opresiva → `v_guardia_opresiva` (Muralla: −10 % de daño a enemigos a 5 m; Ariete: frenados 20 %).
- **Carga de Escudo · Arrollador:** «knock 1» = aturdir 1 s a los arrastrados con `bossStun 0` (a los jefes, solo los 20 de Quebranto). Carga Veloz: `drag:false`, `taunt:0` y quita la etiqueta `taunt`.
- **Terremoto · Martinete:** `at:'target'` a 3 m (el `aim3` del mockup). Falla: tipo `line` 10 × 2 m.
- **Ciudadela · Andante:** `moveMul .5`, `plant:false` y `follow:'owner'` (el aura va contigo; sin seguirte se quedaría clavada donde la lanzaste). Empalizada → `v_empalizada`.
- **Juicio · Sentencia:** `radius 0`, sin salpicadura, `mark.dur 12`, `mark.weakPct 15` (Debilidad: +15 % de todo el daño que recibe). Tres Juicios: ver B1 (§3).
- **Martillo:** Mano Ágil conserva el ancho de la ventana perfecta. Arrojado: proyectil de 12 m y quita `melee`. **Onda Sagrada: `set: { wave: { range: 8, width: 2, coef: 0.6 } }`** (tanda 2: la clave genérica ya no repite a los del impacto; el comportamiento `v_onda_sagrada` sale). Contra un solo enemigo (carga de 0,3 s, Nv20): base 222 · Arrojado ×1,40 · Onda ×1,00, así que la variante de un objetivo gana a la de área (F1/F2).
- **Cataclismo · Amanecer:** `heal`/`shield` del motor a 8 m del impacto, etiqueta `heal`.
- **VFX:** `GUERRERO_FX` trae entradas para las variantes que cambian de forma (`<id>_i`/`<id>_ii`) y el motor ya las usa (`skillFxFor`): test-forge-guerrero §6 lo exige con una sonda (el Martinete sale con su golpe).
- **★ (`GUERRERO_FORGE_RECO`):** las de §7; ninguna apaga la barra de su especialización (lo comprueba `test-forge-guerrero`).

## 5. Tablas legadas (`js/save-legacy-guerrero.js`): decisión para ratificar

- **Torbellino → Hendidura también en la forja** (`torbellino: { to: 'g_hendidura', map: { v1, v2, v3: 'ii' } }`), y no → Remolino como dicen §11.6.4 del documento y el ejemplo de §3.11 del plan. Motivo: el plan (§3.11) manda escribir las tablas **desde v4** («§11.6.4 habla de variantes 2f que nunca se guardaron», D1) con el criterio de 2f §6.1, y las tres opciones de la 3.ª rama v4 de Torbellino son de ÁREA: Estela (zona 4 s), Masacre (4+ golpeados) y Coloso (+90 % de radio). El Remolino solo tiene variantes UNI (Anclado) y CONTROL (Ciclón), así que no hay correspondencia; la Hendidura sí: Grieta es ÁREA y además la misma mecánica que la Estela (zona). Y §11.6.3 manda la ranura de Torbellino a la Hendidura: la variante cae en la habilidad que la ocupa, no en una insignia que solo tiene el Berserker. Si el orquestador prefiere §11.6.4 al pie de la letra, el cambio es `to: 'g_remolino'` con las tres opciones en `'ii'` (Ciclón) y el caso de test-skills-guerrero §6 cambia con él.
- Lo demás sigue §11.6.3: ver la tabla de casos de `tests/test-skills-guerrero.mjs` §6 (con la migración real). `g_t_desafio → g_guardia` y `g_t_bramido → g_h_bramido` dan lo mismo que «→ Piel de Hierro» de §11.6.3: fuera de su ranura o sin el nodo, la barra cae a `SPEC_BAR` (insignia en la 3; Piel de Hierro en la 2).

## 6. Suites rojas frente a `paso2-impl` (las provoca esta rama)

> ✅ **Resuelto en la tanda 1** (W-pruebas): las siete suites pasaron al catálogo 2g y salieron de la cuarentena. Se conserva la tabla como registro.

`paso2-impl` (46ed0f6) está en verde. Con la conmutación al catálogo 2g (`GUERRERO_CATALOG_V = 2`, KA1) caen 7 suites que no son de KA y que usan ids o números del catálogo v1 del Guerrero. Ninguna está en `pending-2g.json`: o entran antes de fusionar o sus dueños las reescriben.

| Suite | Dueño | Causa exacta | Qué tiene que cambiar |
|---|---|---|---|
| `test61-migracion-paso2` | W1 (M1 en E5) | `:194` `hero.skills[f.sp1]` con `sp1 = 'torbellino'` (fixture v4, retirado en 2g) | Comprobar las conocidas con un id 2g del Guerrero (p. ej. `g_hendidura`) o con el `SPEC_BAR` vigente |
| `test62-resolve-skill` | W2 | `:40` `fitsSlot(sk('guerrero', 'torbellino'), …)`: `torbellino` ya no existe (7 usos) | Usar `g_hendidura` (principal 2g: `rmb`/`k2`) o una habilidad sintética |
| `test64-gcd-impacto` | W2 | `:62` espera el Martillo v1 (coste 30, preparación 0,15 + impacto 0,23); en 2g cuesta 25 y es de cargar y soltar. Usa también `torbellino` y `g_salto` (ahora del kit Berserker) | Probar el GCD/impacto con una habilidad sintética o con `g_hendidura` (preparación 0,25, coste 27) |
| `test65-talentos` | W1 | `:83` espera `g_mandoble`/`torbellino` en la barra que deja `SPEC_BAR` (ids v1; también `g_martillo` y `g_u_estandarte`) | Ids del `SPEC_BAR` 2g (`g_tajo`, `g_rajar`…) o leerlos de `SPEC_BAR` |
| `test69-nucleo-2b2` | W2 | `:98` `genOnHit` de Embestida a Nv20 = 16: la Mejora (Carga Fiera, Nv7) suma +4. Después usa `g_provocacion` (retirada), `g_mandoble`, `g_embate`, `g_u_estandarte` | Embestida a Nv4–6 (sin Mejora) o esperar 12 + 4; `genOnHit` de la provocación con una habilidad sintética |
| `test77-talentos-v2` | W1 | `:389` `defs.torbellino` en la definición forjada de prueba | Otra habilidad 2g con preparación (`g_hendidura`) o sintética |
| `test78-talentos-datos-v2` (G1) | KT-guerrero (datos) · W1 (prueba) | Los `touch` de `c6`, `c9` y `c23` nombran ids del kit de especialización (§3) | Selectores en esos `touch` (KT); la regla G1 no cambia |

- **B1:** calibrar el suelo consagrado del Cataclismo (40 %/s) y las réplicas del Terremoto (2 × 50 %).

## 4. KT-guerrero (E2): talentos de clase, especializaciones y héroe

Lo escribe KT-guerrero. El efecto de cada nodo lo prueba `tests/test-talentos-guerrero.mjs` (187 nodos u opciones); las reglas transversales, `tests/test-powers-guerrero.mjs`; las barras, `tests/test-gauges-guerrero.mjs`.

### 4.1 Lo que §3 dejaba a KT

- Piel de Hierro del Guardián (12 s y −50 %): **tanda 2:** en la innata del Guardián (`innate.mod: { g_piel: { durS: 4, buff: 25 } }`, punto 17 opción a), con los topes propios `drCapAdd 15`/`blockCapAdd 10` (reducción de daño 65 %, bloqueo 50 %). `d0` queda sin `fx` (con los dos, la Piel se sumaba dos veces: 16 s). Lo prueba test-powers-guerrero (f) con el Guardián real.
- Fervor: el catálogo da la suelta perfecta (`perfectGauge`); la mecánica solo suma la detonación si el lanzamiento no fue perfecto (tope 1) y el Veredicto no da Fervor.
- Golpe de Titán, Rival y Pendones enganchados a `g_h_bramido`, `g_h_desafio` y `g_h_estandarte` en ③ `afterCast` (el Estandarte cambia el aura del catálogo por un Pendón en la mira).
- «Nunca baja de 4 s» (Sendero `z21`, Carga con Avalancha `d17`) y el 70 % de la recarga BASE de las definitivas: un único `cutCd` en `powers-guerrero.js`; el inicio de la recarga lo anota el primer poder de cada lanzamiento (`noteStart`) o, si nadie lo hizo, el primer recorte que la ve. Una recarga que vuelve a subir es otra (su inicio se anota de nuevo). Ritmo de Combate (`c23`) y Liturgia (`z12`) recortan por `cutCd` (poderes propios): respetan el suelo y cuentan como «seguidas» del Salto.
- G1 en `test78`: `c6`, `c9` y `c23` tocan selectores (`@spender`, `@windup`/`@charge`, `@movement`).

### 4.2 Poderes que el documento no nombra (D28: ids nuevos, sin choques con otras clases)

| Nodo | Poder | Por qué un poder y no `mod`/`tv`/`stats` |
|---|---|---|
| `c7` | `g_marcha_imparable` | Imparable durante la movilidad y 1 s después (no hay clave genérica) |
| `c9A`/`c9B` | `g_golpe_pesado`/`g_sin_pausa` | Quebranto por preparación y moverse cargando sin dejar de estar plantado |
| `c11A`/`c17A`/`c22A` | `g_piel_aliento`/`g_piel_grito`/`g_piel_intervencion` | «Si no la pones, sale con Piel de Hierro al 50 %» (además del `grant`) |
| `c23` | `g_ritmo_combate` | `tv.basicCritCdr` del núcleo recorta toda la movilidad y defensa (también Segundo Aliento) sin los suelos de la clase; el texto dice «tu movilidad y Piel de Hierro» |
| `b12` | `g_b_ritmo_matanza` | Recorte a todas las recargas salvo definitiva y Piel, por crítico de una habilidad |
| `b14` | `g_b_impacto` | Aturdir al caer con tope por enemigo (y Quebranto a jefes) |
| `d7` | `g_d_mirada` | `taunt` no está en las claves `mod` de `test78` (lo pone `modifyResolve`) |
| `d9A` | `g_d_replicas` | Las réplicas se abren hasta 8 m (`repeatAdd` es mod; el anillo exterior, el poder) |
| `d10A` | `g_d_gran_arrastre` | `dragWidth` no es clave `mod`; además junta a los arrastrados delante de ti |
| `z0` | `g_z_martillo_piadoso` | Pasiva de la especialización (cura por daño sagrado) y regla de zonas sagradas |
| `z4` | `g_z_marca_indeleble` | `markDur` no es clave `mod` |
| `z10A` | `g_z_senda_ardiente` | `zoneCoef` no es clave `mod`; la ralentización la pone la regla de zonas |
| `z12` | `g_z_liturgia` | `tv.perfectCdrAll` del núcleo recorta sin el suelo de 4 s del Sendero |
| `z13` | `g_z_tierra_bendita` | Radio y duración de TODAS tus zonas sagradas (el sendero incluido) |

### 4.3 Decisiones de lógica (para revisar con el dueño del diseño)

- Zonas sagradas (`z0`): cada enemigo recibe solo la zona más fuerte que pisa y cada aliado la cura más alta; la cura de zona va por una cubeta del 4 %/s por receptor (con 1 s de reserva al entrar) y el Martillo Piadoso, 1 %/s.
- Sed: lo que da un golpe es la vida que de verdad pierdes (un golpe letal no la llena más allá de la que te quedaba: Negación la deja en 50 sin saciarla).
- Bastión: descarga con 5 o más cargas (también con las 7 de Inexpugnable 2) y las gasta todas.
- Estallido Rojo (`b22`) salta al soltar, al acabar y al quedarte sin Furia.
- **Sangrado de golpe del Berserker (ronda de corrección):** el núcleo suma lo pendiente de un Sangrado al nuevo de la misma fuente, así que «hasta 3 Sangrados» no daba nada (sonda del revisor: 31 frente a 30). El «×2,4 contra jefes» del diseño (§7.1, b8B) solo cuadra si el Sangrado nuevo SUSTITUYE al anterior (6 s de Heridas Abiertas 3 entre ~2,5 s de cada 3.er golpe de Rajar: 6/2,5 = 2,4), como la Ignición de la Maga. Regla (la Sed, `mech-guerrero.js`): el Sangrado del perfil central (el `dot` de la habilidad o del paso: el 3.er golpe de Rajar, un Desgarro) sustituye al que esa habilidad ya había dejado; las copias (`echo`) y el de los giros (`hitDot` del Remolino, 0,08 por pulso, pensado para acumularse) se siguen sumando. Desangrar (`b8B`) aparta el viejo a otra ranura (`g_rajar#2:bleed`, `#3`) con lo que le quedaba; con las 3 llenas se pierde el más débil. Medido: 12 tics de Sangrado en 15 s sin b8B y 30 con él (×2,5). **Para el dueño del diseño:** sin Desangrar, Heridas Abiertas (`b1`) casi no sube el Sangrado de Rajar (sí el del Remolino cuando W2 le pase `bleedDur`); es lo que hace de A/B una elección real.
- Las marcas que salta el Tribunal (`z25`) son de un uso: su detonación las gasta y no vuelven a saltar (se quitó `noJump`, que nunca decidía nada); la Onda (`b9A`) y el 2.º golpe de Golpe de Gracia (`b26`) no reciben Verdugo (`b23`).
- Rival (`l*`): el +20 % de Desafío de Arena es la Debilidad de su marca (no se suma otro +20 %).
- Innatas: el Guardián conserva `hpPct 5` (§11.2 lo cita como la base que se conserva). El Cruzado queda sin el `healPct 30` del juego v1: el diseño no lo nombra (ni la pasiva Martillo Piadoso, ni §17.2) y el presupuesto de cura de §19.3 son cifras brutas sin un ×1,3 de curación. **Para el dueño:** si lo quiere, es una línea en `talents-guerrero.js` (`innate: { healPct: 30 }`) y sube un 30 % todas las curas de habilidad del Cruzado.
- `tv.fervorChance` sigue leyéndose (contrato del núcleo y `test72`), aunque ningún nodo v2 la da.
- **Tribunal (`z25`, tanda 2):** el diseño solo dice «la última salta a 2 enemigos». Tres decisiones para ratificar: (1) no salta a quien detonó Juicio en ese mismo golpe (con la carga de Mano Ágil, el área alcanzaba al recién marcado y lo detonaba en el acto según el orden de los impactos); (2) salta a los 2 más cercanos a 6 m que la pueden recibir (sin Juicio propio), no a los 2 más cercanos a secas (si uno ya llevaba marca, saltaba a uno solo); (3) un salto pendiente de más de 0,5 s se descarta (el planificador se vacía al cambiar de mundo).

### 4.4 Cola W1 / W2

- **W1:** `test78` `POWER_PREFIX.guerrero` debe aceptar `m_berserk` (lo exige `test67b` en `b0`; es lo ÚNICO que deja `test78` en rojo: cuarentena con dueño W1 hasta entonces); `MOD_KEYS` con `taunt`, `markDur`, `dragWidth`, `zoneCoef`, `zoneHeal`, `keepPlanted`; `test75` con los nombres nuevos de `x` (`boil`, `stance`, `planted`, `lockT`, `walking`, `walkIn`, `basicHits`…) para quitar los alias `frenzyT`, `wallT`, `hammerHits`, `ascT`.
- **W2:** `drCapAdd`/`blockCapAdd`; bloqueo forzado en el núcleo (hoy `forceBlock` en el poder); `step`/`repeat`/`echo`/`perfect` en el HitInfo de `rollDamage` (quita la ventana de réplicas y la bandera de Verdugo); `hitDot` que lea `bleedPct`/`bleedDur`; `trail.dur` con `zoneDur`; `@windup` en pasos de combo; `applyCC('fear')`; velocidad de habilidades (giros y saltos de Sangre Hirviente); `g.channelInfo`, `g.stopDash`, `g.expireField` y `g.startCooldown` públicos; `g.extendMark` (Condena `z8B` alarga hoy `e.marks.juicio.t` a mano); `dotsOf` con `interval`; retirar `m_aegis` y `m_judgment` de `powers-common.js` (§11.3: ningún nodo ni objeto los usa). `cdMinS` ya no le hace falta al Guerrero (Ritmo de Combate y Liturgia son poderes propios por `cutCd`). **Tanda 2:** ya están y se usan `drCapAdd`/`blockCapAdd`, `hitDot` con `bleedPct`/`bleedDur`, `trail.dur` con `zoneDur`, `@windup` en pasos de combo, `applyCC('fear')`, `skillSpeedPct`, `g.channelInfo`, `g.stopDash`, `g.expireField`, `g.startCooldown`, `g.extendMark` y `dotsOf` con `interval`. Siguen en cola: el bloqueo forzado en el núcleo (`forceBlock`), `repeat` en el HitInfo de `rollDamage` (la ventana de réplicas de Réplica Honda) y retirar `m_aegis`/`m_judgment` (W-pruebas, punto 18).

### 4.5 Efectos pendientes de la cola W2 (vigilar antes de E4)

Textos que el jugador ya ve y cuyo efecto hoy es parcial. KT deja su parte lista; cada uno se cierra con su clave del núcleo (y su prueba en `tests/test-talentos-guerrero.mjs`).

| Nodo | El texto dice | Hoy | Falta (W2) |
|---|---|---|---|
| Guardián (innata) | Topes de reducción 65 % y de bloqueo 50 % | Topes de `CAPS` (50 y 40 %) | `drCapAdd`/`blockCapAdd` en la innata (y una prueba del Guardián a 65 %) · ✅ tanda 2: innata con `drCapAdd`/`blockCapAdd` (test-powers-guerrero (f): 65 y 50 % con dr 80 y block 70) |
| `b16` Sangre Hirviente | Tus golpes, giros y saltos, un 8·r % más rápido | Solo los golpes (`aspdPct`) | Velocidad de habilidades (canal del Remolino y vuelo del Salto) · ✅ tanda 2: buff con `aspdPct` y `skillSpeedPct` (b16: el Remolino gira un 16 % más rápido) |
| `b1`, `b4`, `b25` (y `c16A`) | Tus Sangrados duran más / hacen más | El Sangrado de los giros (`hitDot` del Remolino) no los recibe | `hitDot` que lea `bleedDur`/`bleedPct` (y `dotDur`/`dotPct`) · ✅ tanda 2: el `hitDot` del Remolino recibe `bleedDur`/`bleedPct` (b1, b4) |
| `l8A` Clamor del Público, `u8A` Desbandada | Los enemigos huyen 2 s | Se los aleja 3 m (desplazar, con rendimientos decrecientes) | `applyCC('fear')` · ✅ tanda 2: `applyCC('fear')` sin el empujón de reserva (l8A, u8A: `fearT`, `fearFrom` y la IA huye) |
| `c9A`/`c9B` con Rajar | Tus golpes con preparación… | El 3.er golpe de Rajar (preparación del paso del combo) no lo ve `@windup` | `@windup` en los pasos de combo · ✅ tanda 2: `comboWindupMods` (c9A: +0,3 s y +40 %; c9B: la mitad, en el 3.er golpe) |
| `c28` Inquebrantable | Piel de Hierro vuelve 15 s después | La ranura se ve lista y el lanzamiento se bloquea con un mensaje | `g.startCooldown` público (y quitar `readyAt`) · ✅ tanda 2: `g.startCooldown` (c28: la ranura enseña 15 s; sin `readyAt`) |

## 7. Tanda 2 de la integración (KAT-guerrero, KA y KT a la vez)

Hecho (cada cambio con su prueba; las 5 suites del Guerrero en verde y fuera de la cuarentena `test-talentos-guerrero` y `test-forge-guerrero`):

- **Cuarentena:** t11, z5, z6, z12, z25 y z26 se prueban con el catálogo y la forja reales (la Mejora Mano Ágil deja la ventana perfecta en 0,6–0,85 s y la carga completa en 0,9 s; Sin Freno lleva Furia Inmortal a 12 s). l8A y u8A miran el miedo real (`fearT`, `fearFrom`) y avanzan la IA 1 s. Amanecer se compara con la misma especialización sin la variante (el Cruzado ya cura con z0).
- **Tribunal (z25):** la marca salta al ACABAR el golpe (planificador, 0 s) y no a quien detonó Juicio en ese mismo golpe. Antes, con la carga de Mano Ágil el golpe alcanzaba al nuevo marcado y lo detonaba en el acto según el orden de los impactos. Además salta a los 2 más cercanos que la pueden recibir (antes, si uno de los 2 más cercanos ya llevaba marca, saltaba a uno solo).
- **Innata del Guardián:** `{ block: 15, threatMult: 3, hpPct: 5, drCapAdd: 15, blockCapAdd: 10, mod: { g_piel: { durS: 4, buff: 25 } } }`; `d0` sin `fx`.
- **APIs de la cola W2d:** `g.startCooldown` (Inquebrantable y las tres activas que salen con la Piel: Segundo Aliento, Grito de Guerra e Intervención, sin `readyAt`), `g.extendMark` (Condena, también la Debilidad de Sentencia), `zonePct` (Grieta), Giro Firme con `slowImmune` del canal, Onda Sagrada con `wave`, `g.channelInfo` (Danza Carmesí y Ciclón), `skillSpeedPct` (Sangre Hirviente), `g.stopDash` (Choque Frontal) y `g.expireField` (Estandarte). Retirados `v_giro_firme` y el comportamiento `v_onda_sagrada`; el empujón de reserva del miedo (`push` de Clamor y Desbandada) sale. El Ciclón sigue en `v_ciclon` (ronda de corrección: el `pull` del canal genérico atraía dos veces, abajo).
- **Ronda de corrección (revisor):** z12 prueba tres sueltas perfectas comprobadas (`g._chargeEnd.perfect`): la de ~1,2 s no recorta y la de más de 2 s sí (antes la 2.ª no salía perfecta y la prueba no podía fallar). l8A y u8A: un enemigo inmune al miedo (rendimientos decrecientes) no se mueve. b1 y b4 miden el Sangrado que deja de verdad un giro del Remolino (6 s; +30 %). El Ciclón, un enemigo a 2,5 m (dentro del radio del daño) y tres giros: 1 m y un tirón por giro. `st.struck` del Tribunal es un `WeakSet`; sus tres decisiones de lógica, en §4.3.
- **Suites:** las del Guerrero ya no toleran avisos de `art`/`innate` (son claves del motor) y el VFX por variante es una aserción, no un PENDIENTE.

Queda (con dueño):

- **Ciclón, doble atracción (W2):** con `set: { pull }`, el golpe del tic del canal genérico pasa por `applyHitEffects` con `prof.pull`, y el tic atrae otra vez (`startChannel`): dentro del radio del daño (2,9 m) son 2 m por giro, no 1 (medido: 1,88 m frente a 1 m sin la variante). Mientras tanto el Ciclón es `v_ciclon`. Cambio propuesto en `game-skills.js` (`ctx.hit`, ~l. 1417): con `this._channel?.ctx === ctx`, el golpe no atrae (`pull: 0`; el canal ya atrae por tic). Con el arreglo, KA vuelve a `set: { pull: { dist: 1, radius: 5, boss: false } }` y retira `v_ciclon`; test-forge-guerrero ya mide a un enemigo dentro del radio del daño (1 m por giro) y cuenta un tirón por giro.
- **Réplica Honda (W2):** `dealArea` pasa a `rollDamage` el `hitInfo` sin `hitExtra` (`repeat`): `condAdd` no sabe que es una réplica y el poder abre una ventana con el planificador. Cambio propuesto en `game-skills.js` (~l. 1097): `p.rollDamage(mult, cb, opts.addPct || 0, e, opts.hitExtra ? { ...opts.hitInfo, ...opts.hitExtra } : opts.hitInfo)`.
- **Bloqueo forzado (W2):** `forceBlock` (Escudo por Delante, Proa Blindada) sigue en el poder.
- **Conversor:** `out/power-ids.json` aún nombra `v_giro_firme` y `v_onda_sagrada`, retirados (regenerar con `convert.mjs --draft --todas`); `v_ciclon` sigue en uso.
- **W2:** una vía pública para los pulsos de la Ciudadela (`g._startPulses`, §3).
- **B1:** cifras del Quebranto del Arpón, Tres Juicios en grupo, suelo del Cataclismo y réplicas del Terremoto (§3).
- **Dueño del diseño:** las 12 líneas de forja acortadas siguen con `aprobada: false` en `divergencias.json`.
