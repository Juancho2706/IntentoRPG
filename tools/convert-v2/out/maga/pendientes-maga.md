# Pendientes · Maga (E2: KA y KT)

> Generado por `tools/convert-v2/convert.mjs --draft maga` desde `docs/mockups/data/talents-v2-maga.js` (sha1 7801561901ba, estado «aprobado»).
> Cada línea es un efecto por escribir. «NUEVO» = poder, clave o comportamiento nuevo; «existe» = reutiliza algo del juego; «vacío» = sin nota: se escribe desde el texto del nodo.
> En la forja, «NUEVO» = la nota lleva ★ (clave nueva de la forja, 2f §2.3).

**Talentos:** 88 NUEVO · 51 existe · 48 vacío (nodos y opciones). **Forja:** 38 NUEVO · 13 existe · 0 vacío.

**Estado · tanda 2 (KAT-maga, 2026-10-21).** Los 187 nodos u opciones de talentos están [x]: `tests/test-talentos-maga.mjs` termina con una cobertura que PUEDE fallar (como la Arquera): cada nodo u opción necesita una comprobación que pasó y lo nombra por su id (no cuentan las de datos ni las de control «sin <id>»): 187 de 187, 0 sin efecto. La suite usa el catálogo, la forja (las Mejoras están puestas a Nv70) y los poderes reales. Lo que la cola W2d desbloqueó, hecho y probado: `g.castEcho` (Ventisca Viva con `origin` = centro de la Tormenta, Remolino, Corazón del Sol/Invierno 4, Combustión Perpetua), `costPct` del Sello, `Enemy.clearCC('freeze')` en Ruptura, `g.channelInfo` (Doble Grieta, Grieta Eterna), salpicadura nativa de la Saeta Ígnea (sin `v_saeta_ignea`), Cargas solo con `source 'hit'` y Doble Grieta con el canal real (a21). Ronda de corrección: TODAS las repeticiones (Archimaga, Imitación, Legión, Gran Grimorio, Meteoro Gemelo, Lluvia de Fuego, Rayo Doble, Orbe Múltiple, Tormenta de Cargas) van por `g.castEcho` en la serie del original y apuntando a donde apuntaba (ni la ranura ni la mira prestadas); la copia de una canalización (el Rayo con Haz Concentrado, el Desgarro) es un haz propio que no ata a la heroína y lleva las Cargas del original; Doble Grieta y Singularidad 4 usan el golpe del Desgarro con rango. Lo que sigue abierto está al final, en «Abierto tras la tanda 2».

## Árbol de clase (c1…c30)

- [x] **c1 Reservas Profundas** — existe · `stats.mpPct · existe`
- [x] **c2 Intelecto Arcano** — existe · `mod @all dmg · existe`
- [x] **c3 Reflejos Arcanos** — existe · `mod m_parpadeo cdr · existe`
- [x] **c4 Escudo Prismático** — existe · `tv.barrierDr · existe`
- [x] **c5·A Dardo Certero** — NUEVO · `power m_dardo_certero · NUEVO`
- [x] **c5·B Dardo Sifón** — NUEVO · `power m_dardo_sifon · NUEVO`
- [x] **c6·A Núcleo Denso** — NUEVO · `mod @spender dmgDirect · NUEVO (clave)`
- [x] **c6·B Onda Expansiva** — NUEVO · `mod @spender splashPct · NUEVO (clave)`
- [x] **c7 Paso Fugaz** — NUEVO · `power m_paso_fugaz · NUEVO (afterCast + addBuff)`
- [x] **c8 Piel de Maná** — existe · `tv.drHighMana · existe`
- [x] **c9·A Nova Congelante** — NUEVO · `power m_nova_congelante · NUEVO (applyCC freeze)`
- [x] **c9·B Nova Cortante** — existe · `mod nova_hielo dmg/slow · claves existentes`
- [x] **c10·A Ralentizar** — existe · `power m_ralentizar · existe`
- [x] **c10·B Disrupción** — NUEVO · `power m_disrupcion · NUEVO (lógica de m_t_contrahechizo; +20 de Quebranto a jefes)`
- [x] **c11·A Bloque de Hielo (concede m_t_bloque)** — existe · `activa m_t_bloque · existe`
- [x] **c11·B Aguante Arcano** — NUEVO · `power m_aguante · NUEVO (onLethal)`
- [x] **c12 Flujo de Maná** — existe · `stats.mph · existe`
- [x] **c13 Mente Afilada** — existe · `stats.crit · existe`
- [x] **c14·A Runa de Escarcha** — NUEVO · `power m_runa · NUEVO (spawnField zona)`
- [x] **c14·B Parpadeo Reparador** — NUEVO · `power m_parpadeo_cura · NUEVO (g.heal)`
- [x] **c15·A Escudo de Maná** — NUEVO · `power m_escudo_mana · NUEVO (④ onDamaged)`
- [x] **c15·B Mente Clara** — existe · `stats regen + tv.highManaDmg · existe` · traducir: `stats.regen → stats.regenPct`
- [x] **c16·A Armonía Elemental** — NUEVO · `power m_armonia · NUEVO`
- [x] **c16·B Pureza Elemental** — NUEVO · `power m_pureza · NUEVO`
- [x] **c17·A Inversión del Tiempo (concede m_t_inversion)** — existe · `activa m_t_inversion · existe`
- [x] **c17·B Anclaje Temporal** — NUEVO · `power m_anclaje · NUEVO (onDamaged)`
- [x] **c18 Barrera Reforzada** — existe · `mod m_barrera shieldManaPct · claves` · traducir: `shieldManaPct → mod buff (+% de escudo: el comportamiento de la Barrera multiplica shieldManaPct por prof.buffMul)`
- [x] **c19 Barrera Resonante** — NUEVO · `power m_barrera_resonante · NUEVO`
- [x] **c20 Escarcha Arcana** — NUEVO · `power m_escarcha_arcana · NUEVO`
- [x] **c21 Escarcha Tenaz** — existe · `mod @all slow +2 · claves`
- [x] **c22·A Contrahechizo (concede m_t_contrahechizo)** — existe · `activa m_t_contrahechizo · existe`
- [x] **c22·B Canalizador** — existe · `tv.costRedBig · existe`
- [x] **c23 Ritmo Arcano** — NUEVO · `tv.dartCritCdr · NUEVO` · traducir: `tv.dartCritCdr → tv.basicCritCdr (el núcleo acepta los dos nombres)`
- [x] **c24 Celeridad** — existe · `stats.aspdPct · existe`
- [x] **c25 Cristal de Barrera** — NUEVO · `power m_cristal · NUEVO (onShieldBreak)`
- [x] **c26 Torrente de Maná** — NUEVO · `power m_torrente · NUEVO (⑪ onResource)`
- [x] **c27 Imagen Arcana** — NUEVO · `power m_imagen · NUEVO (g.forceTarget)`
- [x] **c28 Bastión Arcano (final)** — NUEVO · `power m_bastion · NUEVO`
- [x] **c29 Archimaga (final)** — NUEVO · `power m_archimaga · NUEVO (echo del canal)`
- [x] **c30 Paso del Vacío (final)** — NUEVO · `power m_vacio · NUEVO`

## Piromante (s0…28)

- [x] **s0 Ignición (clave, gratis)** — existe · `power p_ignicion · existe (+ modifyResolve de la Bola)`
- [x] **s1 Brasas** — existe · `tv.burnDur · existe`
- [x] **s2 Calor Abrasador** — existe · `tv.burningCrit · existe`
- [x] **s3 Mecha Corta** — existe · `mod bola_fuego cdr · existe`
- [x] **s4 Llama Persistente** — existe · `tv.burnPct · existe`
- [x] **s5 Chispas** — NUEVO · `power p_chispas · NUEVO`
- [x] **s6 Combustible Volátil** — NUEVO · `power p_volatil · NUEVO (modifyResolve con prof.ignition)`
- [x] **s7 Pira** — existe · `mod meteoro zone · existe`
- [x] **s8·A Propagación** — existe · `power p_propagacion · existe`
- [x] **s8·B Brasa Profunda** — existe · `power p_acumular · existe`
- [x] **s9·A Llamarada Avivada** — existe · `power p_llamarada_avivada · existe`
- [x] **s9·B Llamarada Voraz** — NUEVO · `power p_llamarada_voraz · NUEVO`
- [x] **s10·A Meteoro Gemelo** — NUEVO · `power p_meteoro_gemelo · NUEVO (echo del canal)`
- [x] **s10·B Meteoro Concentrado** — NUEVO · `power p_meteoro_conc · NUEVO (condAdd)`
- [x] **s11 Fuego Interior** — existe · `tv.burnKillHeal + burnKillMana · existen`
- [x] **s12 Pirotecnia** — existe · `tv.critFireCdr · existe`
- [x] **s13 Ceniza Ardiente** — existe · `mod meteoro/supernova dmg · existe`
- [x] **s14 Impacto Sísmico** — existe · `mod meteoro slow + stagger · claves`
- [x] **s15·A Fénix** — existe · `power p_fenix · existe`
- [x] **s15·B Escudo de Llamas** — NUEVO · `power p_escudo_llamas · NUEVO`
- [x] **s16 Brasero** — NUEVO · `power p_brasero · NUEVO (cond con gaugeValue)`
- [x] **s17 Estrellas Fugaces** — NUEVO · `power p_estrellas_fugaces · NUEVO`
- [x] **s18 Brasa Errante** — NUEVO · `power p_brasa_errante · NUEVO`
- [x] **s19 Ignición Rápida** — existe · `stat gaugeGain:calor · existe`
- [x] **s20 Ola de Calor** — existe · `mod @fire radius · existe`
- [x] **s21 Estela Meteórica** — NUEVO · `power p_estela_meteorica · NUEVO`
- [x] **s22 Brasa Viva** — NUEVO · `power p_brasa_viva · NUEVO (onTick)`
- [x] **s23 Combustión** — existe · `power p_combustion · existe (+ afterCast con prof.ignition)`
- [x] **s24 Cráter** — NUEVO · `power p_crater · NUEVO (campo)`
- [x] **s25 Incendio Forestal (final)** — NUEVO · `power p_incendio · NUEVO`
- [x] **s26 Combustión Perpetua (final)** — NUEVO · `power p_perpetua · NUEVO`
- [x] **s27 Lluvia de Fuego (final)** — NUEVO · `power p_lluvia_fuego · NUEVO`
- [x] **s28 Corazón del Sol (ápice)** — NUEVO · `power p_corazon_sol (rangos) · NUEVO sobre el existente`

## Crionte (i0…28)

- [x] **i0 Escarcha (clave, gratis)** — existe · `mecánica escarcha · existe`
- [x] **i1 Frío Penetrante** — NUEVO · `tv.freezeDur · NUEVO (clave)`
- [x] **i2 Filo Helado** — NUEVO · `tv.frostCrit · NUEVO (clave)` · traducir: `tv.frostCrit: clave de la clase (KT-maga, <CLASE>_TV_KEYS)`
- [x] **i3 Viento Cortante** — existe · `mod nova_hielo cdr · existe`
- [x] **i4 Escarcha Densa** — existe · `tuning escarcha.decayEvery · tv`
- [x] **i5 Hielo Quebradizo** — NUEVO · `power k_quebradizo · NUEVO (condAdd)`
- [x] **i6 Polvo de Diamante** — NUEVO · `power k_polvo · NUEVO`
- [x] **i7 Tormenta Creciente** — existe · `mod m_u_tormenta durS + power k_crece`
- [x] **i8·A Prisión Amplia** — existe · `mod k_prision radius · claves`
- [x] **i8·B Prisión Profunda** — NUEVO · `power k_prision_profunda · NUEVO`
- [x] **i9·A Lanza Larga** — existe · `mod k_lanza range + slow · claves`
- [x] **i9·B Lanza del Invierno** — NUEVO · `power k_lanza_invierno · NUEVO (condAdd)`
- [x] **i10·A Ventisca Viva** — NUEVO · `power k_ventisca_viva · NUEVO (onTick)`
- [x] **i10·B Frío Sostenido** — NUEVO · `power k_frio_sostenido · NUEVO (condAdd)`
- [x] **i11 Sangre Fría** — NUEVO · `tv.frozenKillHeal · NUEVO (clave)`
- [x] **i12 Astillas** — NUEVO · `tv.critFrostCdr · NUEVO (copia de critFireCdr)`
- [x] **i13 Frío Intenso** — existe · `mod dmg · claves`
- [x] **i14 Suelo Helado** — NUEVO · `campo k_suelo · NUEVO`
- [x] **i15·A Piel de Invierno** — NUEVO · `tv.drVsLayered · NUEVO` · traducir: `tv.drVsLayered: clave de la clase (KT-maga, <CLASE>_TV_KEYS)`
- [x] **i15·B Cristal Protector** — NUEVO · `power k_cristal · NUEVO (g.shield)`
- [x] **i16 Invierno Profundo** — NUEVO · `power k_invierno · NUEVO (condAdd)`
- [x] **i17 Remolino** — NUEVO · `power k_remolino · NUEVO (afterCast)`
- [x] **i18 Congelación en Cadena** — NUEVO · `power k_cadena · NUEVO (onKill)`
- [x] **i19 Ruptura** — NUEVO · `power k_ruptura · NUEVO`
- [x] **i20 Expansión Glacial** — existe · `mod @frost radius · claves`
- [x] **i21 Ojo Frío** — NUEVO · `power k_ojo_frio · NUEVO`
- [x] **i22 Glaciar** — NUEVO · `power k_glaciar · NUEVO`
- [x] **i23 Esquirlas** — NUEVO · `power k_esquirlas · NUEVO`
- [x] **i24 Tormenta Perpetua** — NUEVO · `power k_perpetua · NUEVO`
- [x] **i25 Era Glacial (final)** — NUEVO · `power k_era_glacial · NUEVO`
- [x] **i26 Cero Absoluto (final)** — NUEVO · `power k_cero · NUEVO`
- [x] **i27 Invierno Eterno (final)** — NUEVO · `power k_eterno · NUEVO`
- [x] **i28 Corazón del Invierno (ápice)** — NUEVO · `power k_corazon_invierno (rangos) · NUEVO`

## Arcanista (a0…28)

- [x] **a0 Cargas Arcanas (clave, gratis)** — existe · `mecánica cargas · existe`
- [x] **a1 Memoria Arcana** — existe · `tuning cargas.loseAfter · tv`
- [x] **a2 Mente Brillante** — NUEVO · `tv.chargeCrit · NUEVO (clave)` · traducir: `tv.chargeCrit: clave de la clase (KT-maga, <CLASE>_TV_KEYS)`
- [x] **a3 Flujo Constante** — existe · `mod m_u_desgarro cdr · claves`
- [x] **a4 Potencia Acumulada** — existe · `tuning cargas.dmgPerCharge · tv`
- [x] **a5 Rebote Cargado** — NUEVO · `power a_rebote_cargado · NUEVO (onHit)`
- [x] **a6 Sello Cargado** — NUEVO · `power a_sello_cargado · NUEVO`
- [x] **a7 Grieta Abierta** — NUEVO · `campo a_grieta · NUEVO`
- [x] **a8·A Rayo Doble** — NUEVO · `power a_rayo_doble · NUEVO (echo del canal)`
- [x] **a8·B Rayo Recargado** — NUEVO · `power a_rayo_recargado · NUEVO (afterCast)`
- [x] **a9·A Orbe Cargado** — NUEVO · `power a_orbe_cargado · NUEVO (condAdd)`
- [x] **a9·B Orbe Atrayente** — NUEVO · `power a_orbe_atrae · NUEVO (pull)`
- [x] **a10·A Desgarro Fijo** — NUEVO · `power a_desgarro_fijo · NUEVO`
- [x] **a10·B Desgarro Voraz** — NUEVO · `power a_desgarro_voraz · NUEVO`
- [x] **a11 Precisión Arcana** — existe · `mod rayo crit · claves`
- [x] **a12 Inercia** — NUEVO · `power a_inercia · NUEVO`
- [x] **a13 Torrente Arcano** — existe · `mod dmg · claves`
- [x] **a14 Maná Inagotable** — NUEVO · `power a_mana_inagotable · NUEVO`
- [x] **a15·A Desplazamiento** — NUEVO · `power a_desplazamiento · NUEVO (onDamaged)`
- [x] **a15·B Velo Arcano** — NUEVO · `tv.drCharges · NUEVO` · traducir: `tv.drCharges: clave de la clase (KT-maga, <CLASE>_TV_KEYS)`
- [x] **a16 Resonancia** — existe · `power a_resonance · existe (rangos)`
- [x] **a17 Sello Viviente** — existe · `mod a_sello durS + power a_sello_sigue`
- [x] **a18 Carga Final** — NUEVO · `power a_carga_final · NUEVO (afterCast)`
- [x] **a19 Satélite** — NUEVO · `power a_satelite · NUEVO`
- [x] **a20 Agudeza** — NUEVO · `tv.aspdCharges · NUEVO` · traducir: `tv.aspdCharges: clave de la clase (KT-maga, <CLASE>_TV_KEYS)`
- [x] **a21 Doble Grieta** — NUEVO · `power a_doble_grieta · NUEVO`
- [x] **a22 Cargas Desbordadas** — existe · `tuning cargas.max + condAdd`
- [x] **a23 Orbe Múltiple** — NUEVO · `power a_orbe_multiple · NUEVO (echo)`
- [x] **a24 Fuente de Maná** — NUEVO · `power a_fuente · NUEVO`
- [x] **a25 Tormenta de Cargas (final)** — NUEVO · `power a_tormenta_cargas · NUEVO`
- [x] **a26 Constelación (final)** — NUEVO · `power a_constelacion · NUEVO`
- [x] **a27 Grieta Eterna (final)** — NUEVO · `power a_grieta_eterna · NUEVO`
- [x] **a28 Singularidad (ápice)** — NUEVO · `power a_singularidad (rangos) · NUEVO`

## Héroe · Cronomante (piromante · arcanista)

- [x] **t0 Marca del Tiempo (clave, gratis)** — vacío
- [x] **t1 Reloj de Arena** — vacío
- [x] **t2·A Eco Mayor** — vacío
- [x] **t2·B Marca Contagiosa** — vacío
- [x] **t3 Prisa Temporal** — vacío
- [x] **t4·A Detener el Tiempo (concede m_h_detener)** — vacío
- [x] **t4·B Retroceso** — vacío
- [x] **t5 Segundos Robados** — vacío
- [x] **t6 Paradoja** — vacío
- [x] **t7 Bucle** — vacío
- [x] **t8·A Presagio** — vacío
- [x] **t8·B Memoria** — vacío
- [x] **t9 Grieta Temporal** — vacío
- [x] **t10 Aceleración** — vacío
- [x] **t11 Momento Exacto** — vacío
- [x] **t12 Señora del Tiempo (final)** — vacío

## Héroe · Invocadora (piromante · crionte)

- [x] **f0 Familiar Arcano (clave, gratis)** — vacío
- [x] **f1 Vínculo** — vacío
- [x] **f2·A Gran Constructo** — vacío
- [x] **f2·B Enjambre** — vacío
- [x] **f3 Imitación** — vacío
- [x] **f4·A Guardián** — vacío
- [x] **f4·B Cazador** — vacío
- [x] **f5 Sobrecarga** — vacío
- [x] **f6 Detonar Constructo** — vacío
- [x] **f7 Aprendiz** — vacío
- [x] **f8·A Llamar Constructo (concede m_h_constructo)** — vacío
- [x] **f8·B Fragua Rúnica** — vacío
- [x] **f9 Eco Elemental** — vacío
- [x] **f10 Constructo Templado** — vacío
- [x] **f11 Hilo de Maná** — vacío
- [x] **f12 Legión (final)** — vacío

## Héroe · Escriba Rúnica (crionte · arcanista)

- [x] **e0 Runas (clave, gratis)** — vacío
- [x] **e1 Tinta Duradera** — vacío
- [x] **e2·A Runa de Poder** — vacío
- [x] **e2·B Sello Explosivo** — vacío
- [x] **e3 Tinta de Maná** — vacío
- [x] **e4·A Palabra de Poder (concede m_h_palabra)** — vacío
- [x] **e4·B Runa Guardiana** — vacío
- [x] **e5 Caligrafía Rápida** — vacío
- [x] **e6 Tinta Elemental** — vacío
- [x] **e7 Inspiración** — vacío
- [x] **e8·A Glosa** — vacío
- [x] **e8·B Círculo Protector** — vacío
- [x] **e9 Doble Sello** — vacío
- [x] **e10 Concentración** — vacío
- [x] **e11 Palimpsesto** — vacío
- [x] **e12 Gran Grimorio (final)** — vacío

## Activas de talento (ranura 2, sin forja)

- [x] **m_t_bloque** Bloque de Hielo · defense · Nv21 · concede c11 — catálogo (KA1) · comportamiento `m_t_bloque` de KT (powers-maga.js)
- [x] **m_t_inversion** Inversión del Tiempo · defense · Nv27 · concede c17 — catálogo (KA1) · comportamiento `m_t_inversion` de KT (sin `rewind` en el catálogo: KT lee `sk.rewind || T.rewindT`)
- [x] **m_t_contrahechizo** Contrahechizo · utility · Nv31 · concede c22 — catálogo (KA1) · comportamiento `m_t_contrahechizo` de KT (sin `silence`: KT lee `sk.silence || 3`)
- [x] **m_h_detener** Detener el Tiempo · utility · Nv72 · concede t4 (héroe) — comportamiento propio `m_h_detener` (applyCC stun `dur` s a `radius` m; jefes → Quebranto). Las Marcas que guardan el doble: KT (③ afterCast)
- [x] **m_h_palabra** Palabra de Poder · utility · Nv72 · concede e4 (héroe) — comportamiento propio `m_h_palabra` (params `runes`): deja `cast.runeSpots` (3 puntos a 1,8 m); las runas las escribe el poder de las Runas (e0, KT) en ③ afterCast
- [x] **m_h_constructo** Llamar Constructo · defense · Nv74 · concede f8 (héroe) — comportamiento propio `m_h_constructo` (params `hpPct`): señuelo con vida que provoca cada 1 s a 8 m (applyCC taunt, src = el Constructo); deja `cast.construct`

## Kit (KA1): habilidades base y de especialización

- [x] **m_dardo** Dardo Arcano · basic · Nv1 · arcane — tipo `weapon`. Tanda 2: con `def.range` ya disponible (W2d-B), el Dardo se queda SIN alcance propio: 9 m (atkRange 7 + 2; 10,8 m con Dardo Veloz). Ronda de corrección: la línea dice el número real, «Dispara un dardo a 9 m…» (doc 2g §9.1 pide el número; el mockup dice «a 20 m»), como PROPUESTA sin aprobar (divergencia `catalogo.m_dardo.line`, aprobada: false; motivo: el catálogo vigente, §A.7, no cambia el Dardo; la Mejora «+2 m» solo cuadra con ~10 m; a 20 m superaría a la Bola, la Lanza, el Rayo y la flecha de la Arquera). test-skills-maga prueba el alcance real y que la línea dice ese número
- [x] **bola_fuego** Bola de Fuego · spender · Nv2 · fire — `proj` genérico, explosión 100 % a 2 m (la pasiva del Piromante la sube a 350 %)
- [x] **nova_hielo** Nova de Hielo · spender · Nv8 · frost — `area` genérico
- [x] **m_parpadeo** Parpadeo · movement · Nv4 · arcane — `blink` genérico
- [x] **m_barrera** Barrera de Maná · defense · Nv6 · arcane — comportamiento propio `m_barrera` (params `shieldManaPct`; × prof.buffMul → c18 por `mod buff`; c4 por `tv.barrierDr`; escudo `src 'm_barrera'`)
- [x] **p_llamarada** Llamarada · spec · Nv10 · piromante · fire — comportamiento propio `llamarada` (params `detonatePct`; consume quemaduras con g.consumeDoT y luego golpea el cono; lee `prof.detonatePct` de Llamarada Avivada; con la forja `type 'area' at 'self'` hace anillo)
- [x] **m_estela_ignea** Estela Ígnea · movement · Nv12 · piromante · fire — comportamiento propio `m_estela_ignea` (desliz + campo `zona` en línea; Muro de Llamas = KA2)
- [x] **meteoro** Meteoro · spender · Nv14 · piromante · fire — `area` genérico at target
- [x] **m_u_supernova** Supernova · ultimate · Nv15 · piromante · fire — comportamiento propio `m_u_supernova` (params `pulses, pulseGap, burn, burnT`; at self; `follow 'owner'` para Sol Errante)
- [x] **k_prision** Prisión de Hielo · spec · Nv10 · crionte · frost — comportamiento propio `prision_hielo` (params `freeze, layers`; las 2 capas: indicador de KT leyendo `prof.def.layers`)
- [x] **m_paso_escarcha** Paso de Escarcha · movement · Nv12 · crionte · frost — comportamiento propio `m_paso_escarcha` (camino `zona` que ralentiza + 1 golpe de Hielo por segundo → 1 capa)
- [x] **k_lanza** Lanza de Hielo · spender · Nv14 · crionte · frost — comportamiento propio `lanza_hielo` (params `frozenMult, layers`; ×3 a Congelados mirado ANTES del golpe; lee `prof.frozenMult` de Lanza del Invierno)
- [x] **m_u_tormenta** Tormenta Glacial · ultimate · Nv15 · crionte · frost — comportamiento propio `m_u_tormenta` (params `interval, pulses`; `follow 'owner'`; exporta `magaStorm(p)` para los poderes de KT)
- [x] **a_orbe** Orbe Arcano · spec · Nv10 · arcanista · arcane — comportamiento propio `orbe_arcano` (params `bounces`; g.fireProjectile por tramo)
- [x] **a_sello** Sello del Archimago · utility · Nv12 · arcanista · arcane — `aura` genérica con `buff { costPct: −30 }` (tanda 2: todas las habilidades con coste, también el Orbe; la línea vuelve a la del mockup, «tus hechizos», y sale su divergencia; test-skills-maga y test-forge-maga); la Carga cada 2 s: indicador de KT
- [x] **rayo** Rayo · spender · Nv14 · arcanista · arcane — `line` genérico (las Cargas: indicador de KT)
- [x] **m_u_desgarro** Desgarro Arcano · ultimate · Nv15 · arcanista · arcane — `channel` genérico, imparable, `moveMul 0` (la Mejora lo deja en 0,4); 1 Carga por golpe: indicador de KT

## Forja (KA2): Mejora (Nv req+3) y variantes I/II (Nv req+6)

KA2-maga: `MAGA_SKILL_FORGE` (17 entradas, nombres/líneas/roles del borrador; todas las líneas ≤ 70) y `MAGA_FORGE_RECO` escritas en `js/skills-maga.js`; poderes `v_*` en `js/powers-forge-maga.js`; VFX de los cambios de forma en `MAGA_FORGE_FX` (`js/fx-skills-maga.js`, por id de variante; los comportamientos propios y los poderes lo leen con `fxOf(cast)`). Prueba: `tests/test-forge-maga.mjs` (datos A1/A9/D28, recomendada que nunca apaga su indicador y cada pieza con el canal real). Un solo comportamiento nuevo de la forja (`v_parpadeo_onda`); el resto, tipos y claves genéricos o parámetros de los comportamientos del kit.

### m_dardo · Dardo Arcano

- [x] **Mejora · Dardo Veloz** — `mul{speed:1.4} · mod{range:20}` (el Dardo declara `speed 13`). El +20 % de alcance lo lee el básico de arma (W2d-B, `Player.basicRange`): 9 → 10,8 m (test-forge-maga y test-skills-maga)
- [x] **I (AREA) · Saeta Ígnea** — `elem fire · set{splash:.3, radius:1.5, color}` con la salpicadura NATIVA del básico de arma (W2d-B): golpes del Dardo con `source 'splash'`, que no dan Cargas. Tanda 2: el poder `v_saeta_ignea` se retira (test-forge-maga: estallido al vecino = 30/105 del impacto, sin poder)
- [x] **II (CTRL) · Saeta Gélida** — `elem frost · set{color} · mod{slow:1.5, slowPct:20, dmg:−10}`

### bola_fuego · Bola de Fuego

- [x] **Mejora · Núcleo Inestable** — `mod{radius:30}` (2 → 2,6 m)
- [x] **I (UNI) · Pirodardo** — `set{windup:0, speed:22} · add{splash:−0.6}` (explosión 100 → 40 %)
- [x] **II (AREA) · Racimo** — poder `v_racimo` (onHit del primer impacto: tras 0,3 s, 3 brasas en anillo de 2 m, radio 1,2, 40 % cada una; no encadena; las brasas llevan `source 'power:v_racimo'`)

### nova_hielo · Nova de Hielo

- [x] **Mejora · Escarcha Profunda** — `mod{slowPct:40}`
- [x] **I (AGU) · Corazón de Hielo** — `set{shieldGain:[3,15]}` (clave genérica del área: 3 % por golpeado, tope 15 %)
- [x] **II (UNI) · Nova Fracturante** — poder `v_fractura` (condAdd +40 % a ralentizados o congelados, solo la Nova)

### m_parpadeo · Parpadeo

- [x] **Mejora · Salto Largo** — `mod{range:25}` (8 → 10 m)
- [x] **I (MOV) · Doble Parpadeo** — `set{charges:2}` (cargas genéricas)
- [x] **II (CTRL) · Parpadeo Disruptor** — comportamiento **`v_parpadeo_onda`** (teletransporte + onda de 4 m al 80 %) · `mod{knock:3, stun:0.5}` (a jefes: Quebranto). Destino y llegada como el `blink` genérico: `ctx.fieldDest`/`ctx.destRange` y `g._arrive` (plantado, provocación, detonación y estela que un talento o la forja le pongan al Parpadeo)

### m_barrera · Barrera de Maná

- [x] **Mejora · Burbuja Estable** — `mod{durS:2}` (8 → 10 s)
- [x] **I (CTRL) · Barrera Gélida** — `elem frost · set{color}` + poder `v_reactiva` (al ROMPERSE, no al caducar: congela 1,5 s a 3 m). VFX: `frostArmor*`, `iceDomeShards`
- [x] **II (UNI) · Coraza Arcana** — poder `v_coraza_arcana` (condAdd +15 % mientras aguanta la Barrera, `src 'm_barrera'`)

### p_llamarada · Llamarada

- [x] **Mejora · Llama Ancha** — `set{angle:90}`
- [x] **I (UNI) · Lanza de Llamas** — `set{angle:25, radius:10} · mod{dmg:50}` · VFX `flameLance`
- [x] **II (AREA) · Erupción** — `set{type:'area', at:'self', radius:5} · mod{dmg:−15}` (el comportamiento `llamarada` hace anillo) · VFX `flameRing`

### m_estela_ignea · Estela Ígnea

- [x] **Mejora · Rastro Ardiente** — `mod{durS:1}` (3 → 4 s)
- [x] **I (AREA) · Senda de Llamas** — `mod{radius:100, dmg:37}` (ancho 1,5 → 3 m)
- [x] **II (CTRL) · Muro de Llamas** — `set{blocks:true} · mod{dmg:−50}`: el rastro es el campo `p_muro_fuego` de KT (`data.blocks`; corta el paso, no a jefes, y quema). Si el campo no está registrado cae al `muro` genérico en línea

### meteoro · Meteoro

- [x] **Mejora · Puntería Ígnea** — `set{impactDelay:0.45}`
- [x] **I (AREA) · Lluvia de Meteoritos** — `set{impacts:3, scatter:2.5, radius:2.2} · mod{dmg:−45}` con el `area` genérico (impactos repartidos). Divergencia: sin `behavior v_meteoritos` (el genérico basta); al centro le caen los 3 (165 %): calibración B1
- [x] **II (UNI) · Meteoro Ancestral** — `mod{dmg:60, stun:1, cdr:−50}` (enfriamiento 6 → 9 s)

### m_u_supernova · Supernova

- [x] **Mejora · Gravedad Solar** — `set{pull:2}` (parámetro del comportamiento `m_u_supernova`: atrae antes de la 1.ª onda a radio + 2 m; a jefes, Quebranto)
- [x] **I (AREA) · Sol Errante** — `set{follow:'owner', pulses:4, pulseGap:1, impactDelay:1, coef:3.8}`
- [x] **II (UNI) · Colapso** — `set{pulses:1, radius:3, coef:13}` · VFX `collapseCore`

### k_prision · Prisión de Hielo

- [x] **Mejora · Celda Amplia** — `mod{radius:25}` (4 → 5 m)
- [x] **I (UNI) · Celda Lejana** — `set{at:'enemy', range:15, radius:1.5, freeze:3}`. Divergencia: el mockup dice `stun 3` y `at target`; congela (como la Prisión) al enemigo de la mira
- [x] **II (CTRL) · Muralla de Hielo** — `set{type:'wall', at:'target', range:10, dur:3, layers:1, wall:{len:8, width:1, blocks:true}}`: `prision_hielo` levanta el `muro` genérico en línea (perpendicular a la mira; la Mejora lo alarga a 10 m) y el primer roce de cada enemigo es un golpe de Hielo. Divergencia: sin campo `k_muralla`

### m_paso_escarcha · Paso de Escarcha

- [x] **Mejora · Hielo Duradero** — `mod{durS:1}`
- [x] **I (MOV) · Paso Doble** — `set{charges:2}`
- [x] **II (CTRL) · Prisión Fugaz** — poder `v_prision_fugaz` (afterCast: congela 1 s a 2 m al llegar) · VFX `iceCell`

### k_lanza · Lanza de Hielo

- [x] **Mejora · Punta Afilada** — `mod{range:17, dmg:15}`
- [x] **I (UNI) · Lanza Pesada** — `set{pierce:false, layers:2} · mod{dmg:60}` (las 2 capas: KT lee `prof.def.layers`)
- [x] **II (AREA) · Abanico Gélido** — `set{count:3, spread:0.26} · mod{dmg:−50}` (15° entre lanzas; un impacto por enemigo y lanzamiento)

### m_u_tormenta · Tormenta Glacial

- [x] **Mejora · Ojo Tranquilo** — poder `v_ojo` (condDr −10 % dentro de `magaStorm(p)`)
- [x] **I (AREA) · Ventisca Anclada** — `set{follow:false, at:'target', range:12, radius:6}`
- [x] **II (UNI) · Granizo** — `set{follow:false, at:'enemy', range:12, pulses:1, radius:2.5, coef:11, freeze:2}` (nuevo parámetro `freeze` del comportamiento) · VFX `hailStone`

### a_orbe · Orbe Arcano

- [x] **Mejora · Orbe Grande** — `mul{size:1.3}` (el Orbe es un proyectil: «radio +30 %» = tamaño). El radio de choque (0,55 m a escala 1, `Projectile.update`) crece en la misma proporción: dos carriles a ±0,165 m que comparten los impactos (a escala 1, exactamente +30 %; a escala 2, +15 %)
- [x] **I (UNI) · Orbe Veloz** — `mul{speed:2} · set{bounces:0} · mod{dmg:40}`
- [x] **II (AREA) · Orbe Gemelo** — `set{count:2, spread:0.22} · mod{dmg:−40}` (un impacto por enemigo y lanzamiento)

### a_sello · Sello del Archimago

- [x] **Mejora · Sello Firme** — `mod{durS:2}`
- [x] **I (UNI) · Sello Ofensivo** — `set{buff:{costPct:0, critDmg:25}, color}` (la `aura` genérica; `set` fusiona el buff con el de la base, por eso el `costPct: 0`). Divergencia: sin poder `v_sello_ofensivo` (el buff del aura basta)
- [x] **II (CTRL) · Sello de Contención** — `set{slowPct:40, slow:0.6, color}` + poder **`v_sello_contencion`** (nuevo: la `aura` genérica no ralentiza; cada 0,5 s ralentiza 40 % a los enemigos dentro, `slow` s; tanda 2: Escarcha Tenaz, c21, la alarga 2 s como a toda ralentización)

### rayo · Rayo

- [x] **Mejora · Rayo Largo** — `mod{range:20}` (15 → 18 m)
- [x] **I (AREA) · Rayo en Cadena** — `set{chain:3, chainPct:70}` (línea genérica; `spawnChainBounce` con `ctx` desde W2d-A: los saltos llevan la habilidad, `source 'chain'`)
- [x] **II (UNI) · Haz Concentrado** — `set{type:'channel', channelT:1.5, ticks:3, coef:0.8} · mod{dmg:80}`

### m_u_desgarro · Desgarro Arcano

- [x] **Mejora · Desgarro Estable** — `set{moveMul:0.4}`
- [x] **I (AREA) · Brecha** — `set{type:'zone', at:'target', dur:5, radius:3}`
- [x] **II (UNI) · Quiebre** — `set{type:'area', at:'enemy', radius:1.2, windup:0.5, coef:9}`

## Barra y recomendaciones

- [x] Referencias a ids que no están en el catálogo 2g: `reco.crionte.m_toque` se quita (Toque Gélido ya es la Saeta Gélida, `m_dardo: 'ii'`); `reco.arcanista.m_onda` (A) → `m_parpadeo: 'i'` y `reco.arcanista.m_armadura` (B) → `m_barrera: 'ii'`, como `specBar.arcanista.forge` del mockup. Ninguna variante recomendada cambia el elemento a otro que el de su especialización ni apaga su indicador (2f §7.7; lo prueba test-forge-maga). Divergencia `reco` declarada en divergencias.json (aprobada: false).

KA1-maga: `MAGA_SPEC_BAR` y `MAGA_FALLBACK_BAR` escritas (iguales al mockup). KA2-maga: `MAGA_FORGE_RECO` y `MAGA_SKILL_FORGE` escritas; la divergencia temporal `forja` se retira.

Activas de talento NUEVAS (en `--write` no entran en `MAGA_TALENT_SKILLS` hasta que existan): `m_h_detener`, `m_h_palabra`, `m_h_constructo`.

Activas de talento del juego v1 que dejan de serlo en 2g (pasan al kit de `skills-maga.js` o se retiran; lista de cada doc): `m_t_barrera`, `m_t_parpadeo`, `p_llamarada`, `p_combustion`, `p_muro_fuego`, `k_prision`, `k_lanza`, `k_ventisca`, `k_aliento`, `a_orbe`, `a_misiles`, `a_sello`, `a_evocacion`.

## Poderes nuevos citados (comprobar contra out/power-ids.json, D28)

`m_dardo_certero`, `m_dardo_sifon`, `m_paso_fugaz`, `m_nova_congelante`, `m_disrupcion`, `m_aguante`, `m_runa`, `m_parpadeo_cura`, `m_escudo_mana`, `m_armonia`, `m_pureza`, `m_anclaje`, `m_barrera_resonante`, `m_escarcha_arcana`, `m_cristal`, `m_torrente`, `m_imagen`, `m_bastion`, `m_archimaga`, `m_vacio`, `p_chispas`, `p_volatil`, `p_llamarada_voraz`, `p_meteoro_gemelo`, `p_meteoro_conc`, `p_escudo_llamas`, `p_brasero`, `p_estrellas_fugaces`, `p_brasa_errante`, `p_estela_meteorica`, `p_brasa_viva`, `p_crater`, `p_incendio`, `p_perpetua`, `p_lluvia_fuego`, `p_corazon_sol`, `k_quebradizo`, `k_polvo`, `k_crece`, `k_prision_profunda`, `k_lanza_invierno`, `k_ventisca_viva`, `k_frio_sostenido`, `k_cristal`, `k_invierno`, `k_remolino`, `k_cadena`, `k_ruptura`, `k_ojo_frio`, `k_glaciar`, `k_esquirlas`, `k_perpetua`, `k_era_glacial`, `k_cero`, `k_eterno`, `k_corazon_invierno`, `a_rebote_cargado`, `a_sello_cargado`, `a_rayo_doble`, `a_rayo_recargado`, `a_orbe_cargado`, `a_orbe_atrae`, `a_desgarro_fijo`, `a_desgarro_voraz`, `a_inercia`, `a_mana_inagotable`, `a_desplazamiento`, `a_sello_sigue`, `a_carga_final`, `a_satelite`, `a_doble_grieta`, `a_orbe_multiple`, `a_fuente`, `a_tormenta_cargas`, `a_constelacion`, `a_grieta_eterna`, `a_singularidad`, `v_racimo`, `v_fractura`, `v_reactiva`, `v_coraza_arcana`, `v_prision_fugaz`, `v_ojo`, `v_sello_ofensivo`

KA2-maga: usados `v_racimo`, `v_fractura`, `v_reactiva`, `v_coraza_arcana`, `v_prision_fugaz`, `v_ojo`; nuevo `v_sello_contencion` (ningún otro archivo ni clase lo usa: test-forge-maga); `v_sello_ofensivo` y `v_meteoritos` no se crean (lo cubren el buff del aura y el `area` genérico). `v_saeta_ignea` se retiró en la tanda 2 (salpicadura nativa); `out/power-ids.json` aún lo lista en `registrados` hasta que se regenere (petición al orquestador).

## Barras de mecánica (texto del mockup; KT: `mech-<clase>.js` y `ui-gauges-<clase>.js`)

- **piromante · Calor** (0–100) — generar: +5 por golpe de Fuego (1 por instante) · descargar: A 100: Ignición Total. La siguiente Bola de Fuego o Meteoro, gratis y crítica · pérdida: −10 por segundo tras 3 s sin ganar · `calor · perFireHit 5 · decayAfter 3 · decayRate 10`
- **crionte · Escarcha** (0–5 capas por enemigo) — generar: +1 capa por golpe de Hielo; la Nova, +2 · descargar: A 5 capas: Congelado 1 s. Un jefe queda Aterido 4 s (−30 % de movimiento, −15 % de ataque) y suma 25 de Quebranto · pérdida: 1 capa cada 2 s sin golpearlo · `escarcha · max 5 · nova 2 · freezeT 1 · numbT 4 · decayEvery 2`
- **arcanista · Cargas Arcanas** (0–4) — generar: +1 por impacto del Dardo Arcano · descargar: El Rayo las gasta todas: +35 % de daño y 5 de maná por Carga · pérdida: Todas, 6 s después de la última que ganaste · `cargas · max 4 · perDart 1 · dmgPerCharge 35 · manaPerCharge 5 · loseAfter 6`

## KA1-maga · peticiones (por id)

- [x] **KT-maga**: retirar los comportamientos muertos `m_t_barrera`, `p_llamarada`, `p_combustion`, `k_prision`, `k_lanza`, `k_ventisca`, `k_aliento`, `a_orbe`, `a_misiles`, `a_sello`, `a_evocacion` (el catálogo usa `m_barrera`, `llamarada`, `prision_hielo`, `lanza_hielo`, `orbe_arcano` y la `aura` genérica) y los campos `k_ventisca`, `k_tumba`, `k_campo_helado` si nadie los usa; conservar el campo `p_muro_fuego` si KA2 lo usa para Muro de Llamas. — **Tanda 2:** Hecho: test-powers-maga (solo m_t_bloque, m_t_inversion y m_t_contrahechizo; campos sin k_ventisca, k_tumba ni k_campo_helado; p_muro_fuego sigue para Muro de Llamas).
- [x] **KT-maga**: Escarcha pone `prof.def.layers` capas (Prisión 2) en vez de 1 en ese golpe; Cargas +1 por golpe de `m_u_desgarro` y +1 cada 2 s dentro del propio `a_sello`; c4/c19/c25/c28 identifican el escudo por `src 'm_barrera'`; i7/i10/i24/i27 usan `magaStorm(p)` (`left`, `radius`, `center()`); e0 escribe las runas de `cast.runeSpots`; t4·A «las Marcas guardan el doble» en ③ afterCast de `m_h_detener`; f8 usa `cast.construct`. — **Tanda 2:** Hecho: test-forge-maga (Prisión 2, Lanza Pesada 2), test-talentos-maga (a0, c4/c19/c25/c28, i7/i10/i24/i27, e4A, t4A). `cast.construct` no hace falta: Llamar Constructo hace todo lo de f8A (f8A con el canal real en test-talentos-maga).
- [x] **W2**: stat de coste para TODAS las habilidades con coste (el Sello abarata «tus hechizos»; hoy `spenderCostPct` solo toca principales y no al Orbe); alcance propio del básico de arma (`range` del Dardo: 20 m en el mockup, 9 m en el motor). — **Tanda 2:** Hecho (W2d-A `costPct`, adoptado en la tanda 2). El alcance propio del básico existe (W2d-B `def.range`); el Dardo no lo usa (decisión de la tanda 2, divergencia catalogo.m_dardo.line).

## KA2-maga · peticiones (por id)

- [x] **W2**: `Player.basicAttack` (básico de arma) — leer `prof.rangeMul`/`def.range` (Dardo Veloz +20 %; el mockup da 20 m al Dardo), el `color` de la definición forjada antes que el de `SKILL_FX` (Saeta Ígnea/Gélida salen con el color arcano) y `splash` nativo (con él se retira `v_saeta_ignea`). — **Tanda 2:** Hecho (W2d-B): rangeMul y def.range (test-forge-maga, test-skills-maga), color de la forjada (test91), salpicadura nativa (v_saeta_ignea retirado; test-forge-maga).
- [x] **W2**: `spawnChainBounce` — cada salto es un proyectil que nace sobre el enemigo del que sale y lo golpea a él (el último de la cadena nunca recibe) y sale sin `skill` (no cuenta para indicadores ni poderes). Afecta a Rayo en Cadena y a toda cadena. Arreglo sugerido: `castHits`/`hitSet` sembrado con el origen y el `skill` del lanzamiento. — **Tanda 2:** Hecho (W2d-A, con ctx: los saltos llevan la habilidad y `source 'chain'`; las Cargas no los cuentan, test-talentos-maga a0).
- [x] **W2**: stat de coste para TODAS las habilidades con coste (el Sello abarata «tus hechizos»; `spenderCostPct` solo toca principales). — **Tanda 2:** Hecho (ver arriba).
- [x] **KT-maga**: conservar el campo `p_muro_fuego` (lo usa Muro de Llamas con `data.blocks`); las Cargas, +1 por impacto DIRECTO del Dardo de cualquier elemento (`hit.source === 'hit'`): que no las den los estallidos de la Saeta Ígnea, que llevan `source 'power:v_saeta_ignea'` (las variantes no se excluyen: un Arcanista que viene de otra especialización conserva su Saeta y la recomendada no la toca, D3 y 2f §7.7); Escarcha con `prof.def.layers` (Prisión 2, Lanza Pesada 2, Muralla 1: test-forge-maga lo deja PENDIENTE y lo exige en cuanto llegue); c21 Escarcha Tenaz no alarga la ralentización de `v_sello_contencion`; el 350 % innato de la Bola debería escalar el `splash` forjado (Pirodardo, Racimo). — **Tanda 2:** Hecho en la tanda 2: Cargas solo con `source 'hit'` (la salpicadura nativa de la Saeta lleva `'splash'`); capas con prof.def.layers (aserciones duras en test-forge-maga); c21 alarga la ralentización del Sello de Contención (su `slow` va en la definición forjada; test-talentos-maga); el 350 % de Ignición multiplica la explosión forjada (Pirodardo 40 → 140 %, test-talentos-maga s0; las brasas del Racimo son daño propio del poder, no salpicadura).
- [ ] **B1**: Lluvia de Meteoritos (3 × 55 % que caen todos al centro = 165 %) frente al Ancestral (160 % + aturdir); Haz Concentrado (3 × 0,8 × 1,8); Abanico Gélido y Orbe Gemelo, un impacto por enemigo. — **Tanda 2:** Sigue abierto (B1, E4).

## KA2-maga · ronda de corrección (revisión adversarial)

- [x] **G17 (plan §8: ≥ 3 verbos por especialización y verbo principal distinto)**: la Maga no lo cumple. Medido con `skillVerbs` sobre la base, la Mejora y las dos variantes del kit: Piromante `follow` (Sol Errante), Crionte `follow` (Tormenta Glacial), Arcanista `hold` (Desgarro y Haz Concentrado). El diseño de la Maga (2g §13 llega hasta G16) es anterior a los verbos. test-skills-maga declara la excepción con lo medido (`G17_EXCEPTION`, falla si el kit cambia sin cambiarla). **Orquestador**: aprobar la excepción para la Maga o encargar el rediseño de los kits. — **Tanda 2:** Excepción APROBADA (plan, punto 17): G17_EXCEPTION de test-skills-maga.
- [ ] **Mejoras que dejan de hacer algo con una variante** (vienen del mockup; **B1** y el dueño): Llama Ancha (ángulo 90) la pisan Lanza de Llamas (25°) y Erupción (anillo); Desgarro Estable (`moveMul` del canal) no sirve con Brecha ni con Quiebre, que no canalizan; Ojo Tranquilo no hace nada con Granizo (la tormenta dura un golpe); Celda Amplia no cambia nada con Celda Lejana si hay objetivo. Desde Nv req+6 esas Mejoras valen 0 con esa variante y F3 pide +5…+15 %. Propuesta: que la Mejora escale relativo (p. ej., ángulo × 90/70 sobre el de la variante) o aceptarlo de forma explícita. — **Tanda 2:** Sigue abierto (B1 y el dueño); ver «Abierto tras la tanda 2».
- [x] **Arte de las habilidades (U2 y cola W2)**: `baseSkillIcon` pide `assets/skills/<id>.webp` y 7 habilidades de la Maga no lo tienen (`m_parpadeo`, `m_barrera`, `p_llamarada`, `k_prision`, `a_orbe`, `k_lanza`, `a_sello`): 404 en el humo boot. El mockup congelado ya les da arte que existe (`talents/maga-clase-c3`, `-c2`, `maga-piromante-s0`, `maga-crionte-s0`, `maga-arcanista-s0`, `maga-crionte-s9`, `maga-arcanista-s9`). Pedido: una clave de catálogo para la ruta del arte (p. ej. `art`, en `SKILL_KEYS` por W2) que `baseSkillIcon` use antes que `skills/<id>.webp`, o el marcador de §3.12 sin pedido de red. Hasta entonces, el humo boot de la Maga no puede salir verde. — **Tanda 2:** Hecho: clave `art` del catálogo y arte 2g propio (e6d2cdb). Comprobado: existen las 34 variantes (`assets/forge/v_<id>.webp`, todas en FORGE_ART), el icono de las 23 habilidades y el de los 156 nodos (talentArtPath).
- [x] **D28 (`out/power-ids.json`)**: el registro sale del mockup y no tiene `v_saeta_ignea` ni `v_sello_contencion` (sí `v_sello_ofensivo` y `v_meteoritos`, que no se crean). test-forge-maga cruza los `v_*` con los poderes vivos de la forja del Guerrero y la Arquera; pedido al dueño del conversor: ampliar el registro con los `v_*` del juego. — **Tanda 2:** Hecho (Conversor, tanda 1: `registrados` sale del juego vivo, con v_sello_contencion). Tras retirar v_saeta_ignea hay que regenerarlo (petición).
- [x] **VFX de la forja**: los cambios de forma ya no traen presets propios: `variantOf` (fx-skills-maga.js) los saca de presets existentes con otro color y escala (Racimo usa `fireStepBurst` tal cual; Lanza de Llamas, además, el cono de 25° de la variante). — **Tanda 2:** Informativo.
- [x] **Líneas del catálogo**: `catalogo.m_dardo.line` («a distancia», no «a 20 m») y `catalogo.a_sello.line` («tus principales», no «tus hechizos») declaradas en divergencias.json (aprobada: false). test-v2-paridad no compara las líneas del catálogo y las marca como que ya no divergen; test-skills-maga sí las compara. Pedido al dueño de la paridad: comparar `line` ↔ `s` del catálogo. — **Tanda 2:** Hecho: test-v2-paridad compara `line` (Conversor, tanda 1); catalogo.a_sello.line salió en la tanda 2 (la línea ya es la del mockup); catalogo.m_dardo.line sigue («a 9 m», propuesta sin aprobar: ver m_dardo arriba).
- [x] **Cuarentena (Orquestador; KA no edita pending-2g.json)**: entran test64 y test69 (dueño W2: el meteoro ya no es base y `m_ascua` se retira), test72 (W2: a Nv30 la Mejora Escarcha Profunda da 40 + 10 = 50; usar Nv10 o esperar 50), test80 (W1: la tabla de prueba usa `m_armadura`, debe usar `m_barrera`) y test78 (KT-maga: G1 de cls/c6 y G17 de nodos); sale test-skills-maga (ya pasa). — **Tanda 2:** Histórico (tanda 1).

## KT-maga · excepciones, peticiones y decisiones pendientes (E2, ronda de corrección)

- [x] **Excepción pedida al orquestador (hasta que llegue la primitiva de W2):** `thaw` (`js/powers-maga.js`, Ruptura i19) es la única escritura a mano de `e.stunT`/`e.frozenT` del módulo. Quita solo el hielo: si otra fuente dejó un aturdimiento más largo, se queda entero. **W2:** `Enemy.clearCC('freeze')` (quita la congelación y la parte del aturdimiento que era hielo, sin tocar la de otra fuente); con ella, `thaw(e)` pasa a ser `e.clearCC('freeze')`. — **Tanda 2:** Hecho en la tanda 2: `thaw(e)` = `e.clearCC('freeze')`; test-powers-maga vigila que el módulo no escriba controles a mano y test-talentos-maga i19, que no quita el aturdimiento de otra fuente.
- [x] **W2 · lanzar «sola y gratis»:** `g.castFree(p, skillId, { mult, at, origin })`: repetición sin coste ni enfriamiento, con su propia serie de repeticiones, sin ranura y con `origin` (de dónde sale una habilidad `at: 'self'`). Hoy `autoCast` toma prestada la ranura (`p.hotbar`) y aparta y devuelve `p.skState[id].echo` (ya no reinicia la serie del jugador). Lo usan Ventisca Viva (i10A), Remolino (i17), Corazón del Sol 4 (s28) y Corazón del Invierno 4 (i28). Con `origin`, la Nova de Ventisca Viva sale del centro de la Tormenta (con la Ventisca Anclada de KA2, hoy sale a tus pies). — **Tanda 2:** Hecho en la tanda 2 con `g.castEcho(p, id, { mult, at, origin })`: autoCast ya no toma la barra; Ventisca Viva sale del centro de la Tormenta (también anclada); test-talentos-maga (i10A, i17, i28, s26, s28) y test-powers-maga (serie propia, barra intacta).
- [x] **W2 · principal instantánea durante un canal:** Doble Grieta (a21, build «grieta») no puede dispararse: `castSkillSlot` rechaza todo lanzamiento normal con `_channel`. Pedido: dejar lanzar una principal sin preparación (el Rayo) mientras canalizas una definitiva imparable, sin cortarla. Si W2 no lo acepta, rediseño con el dueño (p. ej., «el primer Rayo tras acabar el Desgarro abre una segunda grieta»). — **Tanda 2:** Hecho (W2d-A) y probado en la tanda 2 con el canal real: el Rayo sale sobre el Desgarro sin cortarlo y abre la segunda grieta (test-talentos-maga a21).
- [x] **KA (KA2) · objetivo único de la Prisión:** Prisión Profunda (i8B) baja el radio del área a 1e-3 para que no atrape en área; un enemigo pegado a ti (menos de 0,5 m) sigue cayendo en ella. Pedido: un parámetro de `prision_hielo` para «un solo objetivo» (p. ej. `single: true`), que el poder pondría en `modifyResolve`. — **Tanda 2:** Hecho en la tanda 2: `prof.single` (lo pone Prisión Profunda; prision_hielo no atrapa ni golpea en área). test-talentos-maga i8B: ni el enemigo pegado a ti ni dos golpes al atrapado.
- [ ] **B1 (E4) · Grieta Eterna + Maná Inagotable:** el 3 %/s de a27 se gasta siempre (también con a14, que devuelve un 2 %/s). Con los números congelados la build «grieta» canaliza de más: a Nv70 (351 de maná, 4,7/s de regeneración = 1,3 %/s) gana maná y no acaba; a Nv100 (441) seguía a los 400 s; solo a27 dura ~52 s a Nv70. El doc 2g §12 pide 8–12 s con el maná de Nv100: el gasto tiene que rondar el 12–14 %/s (el texto del nodo dice «3 %»: cambio de dato para el dueño). — **Tanda 2:** Sigue abierto (B1 y el dueño: dato del nodo).
- [x] **Dueño · texto de a14:** «Mientras canalizas el Desgarro no gastas maná…»: el Desgarro no cuesta maná y el gasto de Grieta Eterna se mantiene (§12), así que «no gastas maná» ya no describe nada. Propuesta: «Mientras canalizas el Desgarro recuperas un 2 % de maná por segundo». — **Tanda 2:** Hecho en la tanda 2 (texto aprobado en el punto 17; divergencia spec.arcanista.a14.d).
- [x] **Dueño · decisión de KT (s0 Ignición):** Ignición también quema con los tics de un campo de Fuego tuyo (Estela Ígnea, Pira, Muro de Llamas); los tics de una quemadura y el daño de poder no. Así s0 toca la Estela Ígnea (G17). Declarada en `divergencias.json` (`spec.piromante.s0.touch`, sin aprobar). Si no se aprueba: s0 vuelve a solo golpes directos y la Estela queda con 2 nodos mecánicos (s12, s21): hueco de G17 que decide el dueño (test78 lo da como error). — **Tanda 2:** Aprobada (punto 17; divergencia spec.piromante.s0.touch aprobada).
- [x] **c23 Ritmo Arcano:** poder propio `m_ritmo_arcano` (solo Parpadeo y Barrera) en lugar de `tv.basicCritCdr`, que recarga toda tu movilidad y tus defensas (Estela Ígnea, Paso de Escarcha, Bloque de Hielo, Inversión, Constructo). Alternativa para W2: un filtro de habilidades para la clave. — **Tanda 2:** Decidido (poder propio, probado en test-talentos-maga c23).
- [x] **c15B Mente Clara:** el texto dice «con el maná lleno, +10 %», pero `tv.highManaDmg` (núcleo) se aplica por encima del 70 %. Orquestador: corregir el texto o usar un umbral del 100 % para esta opción. — **Tanda 2:** Hecho en la tanda 2: texto «con más del 70 % de maná» (punto 17; divergencia clase.c15.opts.B.desc), probado al 80 % y al 60 %.
- [x] **Orq · D28:** ids de la Maga que faltan en `out/power-ids.json`: poderes `m_nova_cortante`, `m_escarcha_tenaz`, `m_ritmo_arcano`, `m_marca_tiempo`, `m_retroceso`, `m_senora_tiempo`, `m_familiar`, `m_legion`, `m_runas`, `m_gran_grimorio`, `p_pira`, `p_sismico`, `k_filo_helado`, `k_astillas`, `k_suelo`, `k_piel_invierno`, `a_grieta`, `a_desbordadas`; campos `m_runa_escarcha`, `m_grieta`, `m_runa_escrita`, `m_sello`, `p_muro_fuego`, `k_suelo`, `a_grieta`. Hoy no chocan con la Arquera (prefijos `m_` y `a_` compartidos). — **Tanda 2:** Hecho (todos en `registrados` de power-ids.json desde la tanda 1).
- [x] **Orq · paridad de `touch`:** `test-v2-paridad` no compara `touch`; las 8 rutas de `touch` declaradas (G1/G17) salen como «declaradas que ya no divergen» hasta que la compare. — **Tanda 2:** Hecho (test-v2-paridad compara `touch` desde la tanda 1).

## Abierto tras la tanda 2 (KAT-maga)

Nada de esto es de la cola W2d ni lo arregla un cambio barato en los archivos de la Maga: queda listado con su dueño.

- [ ] **B1 / dueño · los números absolutos de un nodo frente a la Mejora de la forja.** La Mejora está puesta desde Nv req+3 y los nodos suman sobre ella: s6 Combustible Volátil dobla el radio que tenga la Bola («4 m (antes 2 m)»: 2,6 → 5,2 m con Núcleo Inestable), i8A Prisión Amplia «6 m (antes 4 m)» (+50 %: 7 m con Celda Amplia), i9A Lanza Larga «18 m (antes 12 m)» (20,04 m con Punta Afilada), a17 Sello Viviente «12 s (antes 8 s)» (14 s con Sello Firme); los «+X %» de radio (s20, i20) se suman al de la Mejora sobre la base. test-talentos-maga mide el aumento sobre la base («+2 m», «+6 m», «+4 s») y, mientras no se decida, fija en `ABS_NV70` lo medido a Nv70 y el número del texto: falla si cambia uno sin cambiar la tabla. Decidir si el texto debe decir el aumento («+50 %», «+6 m») o si el efecto se calcula sin la Mejora.
- [ ] **B1 · buffs por rango.** Los buffs de las habilidades escalan con el rango (RANK_BUFF_STEP): el −30 % del Sello del Archimago es −34 % a Nv30 y el +25 % de Sello Ofensivo, +28 % (lo mismo que el punto 18 anota para las activas de talento).
- [x] **Repeticiones de una canalización (Rayo con Haz Concentrado, Desgarro).** Antes, Rayo Doble (a8A), Tormenta de Cargas (a25), Archimaga (c29) y Gran Grimorio (e12) repetían por la ranura (`castSkillSlot(slot, mult)`): con Haz Concentrado (la forja recomendada del Arcanista) la copia era otro canal de 1,5 s que ataba a la heroína, le impedía relanzar el Rayo y NO llevaba las Cargas (echoN solo valía durante la llamada). `g.castEcho` no repite canalizaciones, y pasarlas a él dejaría esos nodos sin efecto con la forja recomendada. — **Ronda de corrección:** Hecho: la copia de un canal es un haz propio (`echoChannel`): los mismos tics (intervalo y perfil con rango × la potencia de la copia) a un objetivo pegajoso, sin canal, castLock ni freno, con las Cargas del original en cada tic. test-talentos-maga a8A y a25 con Haz Concentrado: no te ata, relanzas el Rayo y la copia no lo corta, cada tic al 50 % con las 4 Cargas. **Dueño:** ratificar que la copia de un canal sea un haz que no ata (la alternativa es que no exista).
- [x] **Doble Grieta (a21) y Singularidad 4.** La segunda grieta hacía el 50 % del coeficiente BASE del Desgarro (1,2 cada 0,5 s), no del perfil con rango (Nv70: rango 5, 1,68): un 36 %. Igual que la Singularidad 4 (y, con Quiebre forjado, la Singularidad pegaba el pulso de 900 % en cada golpe). — **Ronda de corrección:** Hecho: Doble Grieta usa el perfil del canal en curso (anotado en su ⑦ onCast) y la Singularidad el del Desgarro con rango (con Brecha o Quiebre, el golpe del canal del catálogo con rango). test-talentos-maga a21 (Nv70 y Nv20) y a28.4 (base y Quiebre).
- [ ] **B1 · Grieta Eterna, Lluvia de Meteoritos, Haz Concentrado, Abanico y Orbe Gemelo, Mejoras que valen 0 con una variante:** ver sus casillas de arriba.
- [ ] **Orquestador · `out/power-ids.json`:** regenerarlo (`node tools/convert-v2/convert.mjs --draft --todas`) para que `registrados.poderes.maga` deje de listar `v_saeta_ignea`.
- [ ] **Orquestador · test91 (W2d-B):** el comentario de `tests/test91-cola-w2d-b.mjs:178` dice «su poder aún estalla, tanda 2»: desde la tanda 2 el estallido de la Saeta Ígnea ES la salpicadura nativa (`source 'splash'`).
