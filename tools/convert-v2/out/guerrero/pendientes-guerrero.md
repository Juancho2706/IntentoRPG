# Pendientes · Guerrero (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft guerrero` desde `docs/mockups/data/talents-v2-guerrero.js` (sha1 966148bcbff2, estado «diseño»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 49 NUEVO · 24 existe · 0 vacío (nodos y opciones). **Forja:** 24 NUEVO · 3 existe · 0 vacío.

## Árbol de clase (c1…c30)

- [ ] **c1 Constitución** — existe · `stats.hpPct · existe`
- [ ] **c2 Fuerza Bruta** — existe · `mod @all dmg · existe`
- [ ] **c3 Avance Implacable** — existe · `mod @movement cdr · existe (Embestida 8 → 6 s; Salto Devastador 12 → 9 s)`
- [ ] **c4 Curtido** — existe · `mod g_piel durS · claves`
- [ ] **c5·A Tajo Firme** — NUEVO · `power g_tajo_firme · NUEVO (onHit + gainResource)`
- [ ] **c5·B Tajo Voraz** — NUEVO · `power g_tajo_voraz · NUEVO (onKill + buff spenderCostPct −50)`
- [ ] **c6·A Ensañamiento** — NUEVO · `power g_ensanamiento · NUEVO (condAdd @spender)`
- [ ] **c6·B Sin Cuartel** — NUEVO · `power g_sin_cuartel · NUEVO (modifyResolve por hits del lanzamiento)`
- [ ] **c7 Marcha Imparable** — existe · `mod @movement unstoppable + 1 s · claves`
- [ ] **c8 Determinación** — NUEVO · `tv.drHighFury · NUEVO (copia de drHighMana)`
- [ ] **c9·A Golpe Pesado** — NUEVO · `mod @windup windupAdd .3 · dmg +40 · stagger 15 · claves NUEVAS`
- [ ] **c9·B Sin Pausa** — NUEVO · `mod @windup windupMult .5 · windupMove · claves NUEVAS`
- [ ] **c10·A Derribo** — NUEVO · `power g_derribo · NUEVO (onCast + applyCC knock)`
- [ ] **c10·B Silenciar** — NUEVO · `power g_silenciar · NUEVO (interrupt; +20 de Quebranto a jefes)`
- [ ] **c11·A Segundo Aliento (concede g_t_aliento)** — existe · `activa g_t_aliento · existe`
- [ ] **c11·B Coraza de Hierro** — existe · `power g_coraza_hierro · existe`
- [ ] **c12 Furia Creciente** — NUEVO · `stats.resGainPct · NUEVO (clave)`
- [ ] **c13 Golpes Precisos** — existe · `stats.crit · existe`
- [ ] **c14·A Polvareda** — NUEVO · `power g_polvareda · NUEVO (afterCast @movement + applyCC slow)`
- [ ] **c14·B Carga Reparadora** — NUEVO · `power g_carga_reparadora · NUEVO (afterCast @movement + g.heal + cleanse)`
- [ ] **c15·A Furia Protectora** — NUEVO · `power g_furia_protectora · NUEVO (④ onDamaged)`
- [ ] **c15·B Furia Desbordante** — NUEVO · `stats resMaxAdd 30 + power g_desbordante · NUEVO`
- [ ] **c16·A Filo Dentado** — existe · `tv.bleedPct 25 + tv.bleedDur 1 · existen`
- [ ] **c16·B Contundencia** — NUEVO · `tv.ccDurPct 50 + tv.staggerPct 30 · NUEVOS (claves)`
- [ ] **c17·A Grito de Guerra (concede grito_guerra)** — existe · `activa grito_guerra · existe (pasa de base a talento)`
- [ ] **c17·B Ira Contenida** — NUEVO · `power g_ira_contenida · NUEVO (icd 20 + condAdd)`
- [ ] **c18 Hierro Vivo** — existe · `mod g_piel cdr · existe`
- [ ] **c19 Temple** — NUEVO · `power g_temple · NUEVO (onHit + extendBuff)`
- [ ] **c20 Desequilibrio** — NUEVO · `power g_desequilibrio · NUEVO (onHit + condCrit)`
- [ ] **c21 Persecución** — NUEVO · `power g_persecucion · NUEVO (condAdd @movement)`
- [ ] **c22·A Intervención (concede g_t_intervencion)** — existe · `activa g_t_intervencion · existe (pasa de la 1 a la 2)`
- [ ] **c22·B Hermandad de Armas** — existe · `power g_aura_hermandad · existe`
- [ ] **c23 Ritmo de Combate** — NUEVO · `tv.basicCritCdr · NUEVO (copia de dartCritCdr)`
- [ ] **c24 Brazo Veloz** — existe · `stats.aspdPct · existe`
- [ ] **c25 Rencor** — NUEVO · `power g_rencor · NUEVO (cuenta el daño evitado; onBuffEnd)`
- [ ] **c26 Desenfreno** — NUEVO · `power g_ira_gasto · NUEVO (⑪ onResource; el id g_desenfreno ya es de Sangre Hirviente y sale)`
- [ ] **c27 Rugido de Carga** — NUEVO · `power g_rugido_carga · NUEVO (e.weakenOutgoing)`
- [ ] **c28 Inquebrantable (final)** — NUEVO · `power g_inquebrantable · NUEVO (cuenta golpes; reactiva)`
- [ ] **c29 Señor de la Guerra (final)** — NUEVO · `power g_senor_guerra · NUEVO (echo del canal)`
- [ ] **c30 Asalto Total (final)** — NUEVO · `power g_asalto_total · NUEVO (afterCast @movement + onKill resetCd; con movilidades que se relanzan, cuenta el primer uso de la cadena)`

## Berserker (b0…28)

- [ ] **b0 Sed de Batalla (clave, gratis)** — existe · `mecánica sed + power m_berserk · existen (ya no concede activa: el Remolino está en el libro)`
- [ ] **b1 Heridas Abiertas** — NUEVO · `tv.bleedDur · NUEVO (copia de burnDur)`
- [ ] **b2 Instinto Asesino** — existe · `mod g_rajar crit · claves`
- [ ] **b3 Zancada** — existe · `mod g_salto cdr · existe`
- [ ] **b4 Sangre Espesa** — existe · `tv.bleedPct · existe`
- [ ] **b5 Reabrir** — NUEVO · `power b_reabrir · NUEVO (onHit + replaceDoT + gainGauge)`
- [ ] **b6 Caída Brutal** — NUEVO · `power b_caida_brutal · NUEVO (afterCast g_salto → comboStep 3)`
- [ ] **b7 Suelo Roto** — existe · `mod g_salto slow 2 · slowPct · claves`
- [ ] **b8·A Contagio** — NUEVO · `power b_contagio · NUEVO (onKill; lógica de p_propagacion)`
- [ ] **b8·B Desangrar** — NUEVO · `power b_desangrar · NUEVO (lógica de p_acumular)`
- [ ] **b9·A Onda de Choque** — NUEVO · `power b_onda_choque · NUEVO (afterCast step 3 + dealArea)`
- [ ] **b9·B Remate Certero** — NUEVO · `power b_remate_certero · NUEVO (onCast forceCrit step 3 + addStagger)`
- [ ] **b10·A Salto en Cadena** — NUEVO · `mod g_salto recastAdd 2 · clave NUEVA`
- [ ] **b10·B Salto Aplastante** — NUEVO · `power b_salto_aplastante · NUEVO (condAdd por cadena)`
- [ ] **b11 Festín de Sangre** — existe · `tv.bleedKillHeal + bleedKillMana · existen`
- [ ] **b12 Ritmo de Matanza** — NUEVO · `tv.critCdrAll · NUEVO (como critFireCdr, sobre todas)`
- [ ] **b13 Peso Muerto** — existe · `mod g_salto dmg · existe`
- [ ] **b14 Impacto Aturdidor** — existe · `mod g_salto stun .5 + stagger 15 · claves`
- [ ] **b15·A Negación de la Muerte** — existe · `power g_negacion · existe (+ llena la Sed)`
- [ ] **b15·B Umbral del Dolor** — NUEVO · `tv.drLowHp · NUEVO (clave)`
- [ ] **b16 Sangre Hirviente** — NUEVO · `power b_sangre_hirviente · NUEVO (stats con gaugeValue)`
- [ ] **b17 Sin Suelo** — NUEVO · `power b_sin_suelo · NUEVO (modifyResolve con el buff g_u_furia)`
- [ ] **b18 Avidez** — NUEVO · `power b_avidez · NUEVO (onHit en el canal)`
- [ ] **b19 Último Trago** — NUEVO · `power b_ultimo_trago · NUEVO (gainGauge sed)`
- [ ] **b20 Alcance Salvaje** — existe · `mod @melee radius · existe`
- [ ] **b21 Caída Sangrienta** — NUEVO · `power b_caida_sangrienta · NUEVO (afterCast último salto + applyDoT)`
- [ ] **b22 Estallido Rojo** — NUEVO · `power b_estallido_rojo · NUEVO (onEnd del canal + consumeDoT)`
- [ ] **b23 Verdugo** — NUEVO · `power b_verdugo · NUEVO (condAdd por vida que falta)`
- [ ] **b24 Ímpetu** — NUEVO · `power b_impetu · NUEVO (addBuff con pilas)`
- [ ] **b25 Danza Carmesí (final)** — NUEVO · `power b_danza_carmesi · NUEVO (canal sin fin con drainPerSec)`
- [ ] **b26 Golpe de Gracia (final)** — NUEVO · `power b_golpe_gracia · NUEVO (echo del paso 3 + vuln)`
- [ ] **b27 Estampida Sin Fin (final)** — NUEVO · `power b_estampida · NUEVO (onChainEnd + resetCd)`
- [ ] **b28 Corazón Indomable (ápice)** — NUEVO · `power b_corazon_indomable (rangos) · NUEVO`

## Guardián (?0…28)

_(árbol vacío en esta versión de los datos)_

## Cruzado (?0…28)

_(árbol vacío en esta versión de los datos)_

## Héroe · Titán (etapa 2) (berserker · guardian)

_(árbol vacío en esta versión de los datos)_

## Héroe · Gladiador (etapa 2) (berserker · cruzado)

_(árbol vacío en esta versión de los datos)_

## Héroe · Caudillo (etapa 2) (guardian · cruzado)

_(árbol vacío en esta versión de los datos)_

## Activas de talento (ranura 2, sin forja)

- [ ] **g_t_aliento** Segundo Aliento · defense · Nv21 · concede c11 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **grito_guerra** Grito de Guerra · utility · Nv27 · concede c17 — existe en el juego: revisar texto y números contra la línea 2g
- [ ] **g_t_intervencion** Intervención · utility · Nv31 · concede c22 — existe en el juego: revisar texto y números contra la línea 2g

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
- [ ] **I (UNI) · Remolino Anclado** — NUEVO · `★set{moveFree:false, radius:2} · dmg +60`
- [ ] **II (CTRL) · Ciclón** — NUEVO · `★pull 1/tic (r 5) · dmg −15`

### g_salto · Salto Devastador

- [ ] **Mejora · Caída Pesada** — existe · `radius +33`
- [ ] **I (CTRL) · Caída Atronadora** — NUEVO · `★set{recast:0} · ★pull 2 · stun .75 (antes «Impacto Sísmico»: nombre de un nodo de la Maga)`
- [ ] **II (MOV) · Salto Rasante** — NUEVO · `★set{range:12, airT:.25} · dmg −20`

### g_rajar · Rajar

- [ ] **Mejora · Filo Encadenado** — NUEVO · `★set{comboWin:4}`
- [ ] **I (UNI) · Estocada Final** — NUEVO · `★set{steps[2]:{type:line, range:5, width:1}} · dmg3 +40`
- [ ] **II (AREA) · Molino** — NUEVO · `★set{steps:*{type:area, at:self, radius:2.5}} · dmg −20`

### g_u_furia · Furia Inmortal

- [ ] **Mejora · Sin Freno** — existe · `durS 2`
- [ ] **I (AGU) · Sed Voraz** — NUEVO · `★power v_sed_voraz (sustain) · endHeal 0`
- [ ] **II (UNI) · Frenesí** — NUEVO · `buff aspdPct +40 · ★set{minHpPct:0}`

## Barra y recomendaciones

Todas las referencias de barra y recomendaciones están en el catálogo.

Activas de talento del juego actual que dejan de serlo en 2g (pasan al kit de `skills-guerrero.js` o se retiran; lista de cada doc): `g_t_bramido`, `g_t_remolino`, `g_t_temeridad`, `g_t_ira_ciega`, `g_t_desafio`, `g_t_muro`, `g_t_carga`, `g_t_devocion`, `g_t_veredicto`, `g_t_justicia`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`g_tajo_firme`, `g_tajo_voraz`, `g_ensanamiento`, `g_sin_cuartel`, `g_derribo`, `g_silenciar`, `g_polvareda`, `g_carga_reparadora`, `g_furia_protectora`, `g_desbordante`, `g_ira_contenida`, `g_temple`, `g_desequilibrio`, `g_persecucion`, `g_rencor`, `g_ira_gasto`, `g_rugido_carga`, `g_inquebrantable`, `g_senor_guerra`, `g_asalto_total`, `b_reabrir`, `b_caida_brutal`, `b_contagio`, `b_desangrar`, `b_onda_choque`, `b_remate_certero`, `b_salto_aplastante`, `b_sangre_hirviente`, `b_sin_suelo`, `b_avidez`, `b_ultimo_trago`, `b_caida_sangrienta`, `b_estallido_rojo`, `b_verdugo`, `b_impetu`, `b_danza_carmesi`, `b_golpe_gracia`, `b_estampida`, `b_corazon_indomable`, `v_rompefilas`, `v_carnero`, `v_temple`, `v_espinas`, `v_sed_voraz`

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **berserker · Sed** (0–100) — generar: +1 por cada 1 % de vida que pierdes y +2 por golpe de Sangrado (como mucho 10 por segundo) · descargar: A 100: Sed Saciada 6 s: +25 % de daño aunque tengas la vida alta. Después vuelve a 0 · pérdida: −8 por segundo tras 4 s fuera de combate · `sed · perHpPct 1 · perBleedTick 2 · bleedPerSec 10 · satedT 6 · decayAfter 4 · decayRate 8 · lowHpPct 40`
- **guardian · Bastión** (0–5 cargas) — generar: +1 carga por bloqueo (15 % de bloqueo innato con escudo) · descargar: Muro de Escudos las gasta: −10 % de daño recibido por carga 8 s (máx. −50 %) · pérdida: Una carga cada 6 s sin ganar ninguna · `bastion · max 5 · perBlock 1 · decayEvery 6`
- **cruzado · Fervor** (0–3) — generar: +1 por muerte · +1 cada 3 impactos de Martillo · +1 cada 3 golpes del básico · descargar: Veredicto Final gasta 3: 200 % del arma en cono; el grupo se cura el 25 % del daño · pérdida: No se pierde con el tiempo · `fervor · max 3 · perKill 1 · hammerHits 3 · basicHits 3`
