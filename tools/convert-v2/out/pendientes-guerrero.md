# Guerrero · catálogo 2g (KA1) y forja 2f (KA2) — comportamientos propios y pendientes

Lo escribe KA-guerrero (E2). Complementa `guerrero/pendientes-guerrero.md` (lo regenera el conversor y no se edita a mano).

## 1. Comportamientos propios (`GUERRERO_SKILL_BEHAVIORS`)

Todo lo demás del kit sale de tipos y claves genéricos de §3.6 (`channel` + `hold`, `recast`, `combo` + `steps`, `stance`, `dash` + `dashT`/`drag`/`taunt`, `repeat` + `needPlanted`, `blink` + `trail`, `charge`, `mark` + `detonate`, `aura` + `at:'target'`, `cdOnEnd`, `cdFloor`, `buff.minHpPct`/`endHealPct`).

| Habilidad | Por qué no basta un tipo genérico | Qué haría falta en el motor para quitarlo |
|---|---|---|
| `g_u_cataclismo` | La luz cae donde apuntas **al soltar**: `_releaseWith` rehace el contexto con la mira del **inicio** de la carga. Además consagra el suelo (`floor`: zona de 6 s, 40 %/s, una a la vez) y el tipo `area` no deja zona propia | `charge.aimAtRelease` (W2) y una clave genérica de zona al impactar (`floor`/`zoneOnHit`) |
| `g_u_ciudadela` | Te clava (`moveMul` 0 durante `dur`, plantado ya) **y** da el buff a los aliados del radio con provocación al clavarte y cada segundo: el tipo `buff` no frena al héroe ni reparte a aliados sin `ally`, y el tipo `aura` (que sí tiene `pulse`) no frena, no planta y su primer pulso llega a 1 s | `moveMul` y `plant` genéricos en `aura` y un pulso inicial (W2) |
| `g_h_bramido` | Aturde sin dañar: un `area` con `coef` 0 hace 1 de daño a cada uno (`Enemy.takeDamage` redondea a 1) | `area` con `coef` 0 = solo efectos (W2) |
| `g_h_desafio` | Zona `contain` centrada entre tú y el enemigo de la mira (o sobre él), marca con Debilidad y, sin enemigo al alcance, no gasta la recarga | Tipo `zone` con `at:'between'` y «sin objetivo = sin coste» (W2) |
| `v_onda_sagrada` (forja: Martillo de Guerra II) | La clave genérica `wave` sale del centro del impacto y `enemiesInLine` vuelve a incluir a los que ya recibió el golpe: el del impacto cobraba golpe + onda (×1,60 contra un solo enemigo, más que el Martillo Arrojado ×1,40). El comportamiento hace el golpe en la mira (con la carga ya aplicada) y la onda (`onda: { range, width, coef }`) solo a los que el golpe no alcanzó. Es el único comportamiento de la forja (tope 3, plan §3.5) | Que `wave` excluya a los golpeados por el impacto (W2); entonces la variante vuelve a `set: { wave }` |

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
  - **Piel de Hierro del Guardián (12 s y −50 %), bloqueante para la defensa del Guardián (§19.2).** §11.1 la pone en el catálogo (`innate:{ guardian }`); el catálogo ya trae el texto del chip del mockup (`innate: { guardian: 'Guardián: 12 s y −50 %' }`), pero **nadie aplica el efecto**: con el Guardián, la Piel sigue en 8 s y −40 %. Decisión del orquestador entre: (a) KT pone en el `spec.innate` del Guardián `mod: { g_piel: { durS: 4, buff: 25 } }` (8 → 12 s; 40 × 1,25 = 50 %, y escala con el rango como el resto del buff) y W1 hace que `aggregateTalents` sume `innate.mod` a `agg.mods` (hoy `recompute` solo lee claves de stats del `innate`); o (b) W2 hace que `resolveSkill` aplique un `mod` por especialización del catálogo (clave nueva en `SKILL_KEYS`, p. ej. `innate: { guardian: { line, mod } }`, y entonces KA cambia el texto por ese objeto). Recomendación de KA: (a), porque la pasiva vive en la especialización (su `innateText` ya lo promete) y el catálogo conserva el chip tal como lo trae el mockup.
  - Fervor (`z0`): el catálogo ya da +1 al soltar perfecto el Martillo y +3 el Cataclismo (`perfectGauge`); la mecánica no debe sumarlo otra vez (tope de 1 por lanzamiento salvo el Cataclismo) y el Veredicto no da Fervor.
  - Golpe de Titán (`g_ti_*`): «tu siguiente principal es un Golpe de Titán» se engancha en ③ `afterCast` de `g_h_bramido`.
  - Rival (`g_gl_*`): el encerrado por `g_h_desafio` es `cast.enemy` (o el más cercano a 12 m); su marca es `g_h_desafio`.
  - Pendones (`g_cau_*`): `g_h_estandarte` planta un campo `aura` con `buffId:'g_h_estandarte'`.
  - «Nunca baja de 4 s» (Sendero `z21`, Carga `d17`): `cdFloor` es una fracción de la recarga y solo limita `g.reduceCooldown`; el suelo absoluto lo tiene que respetar el poder (o una clave `cdMinS` de W2).
  - **G1 de `test78`** (rojo desde que el catálogo pasó a 2g): los `touch` de `c6`, `c9` y `c23` (copiados del mockup) nombran ids del kit de especialización: `g_rajar`, `terremoto`, `g_martillo` (c6); `g_rajar`, `terremoto`, `g_juicio`, `g_martillo`, `g_u_cataclismo` (c9); `g_salto`, `g_carga_escudo`, `g_sendero` (c23). Con selectores dejan de fallar: c6 → `['g_hendidura', 'g_lanza', '@spender']`, c9 → `['g_hendidura', '@windup', '@charge']`, c23 → `['g_tajo', '@movement', 'g_piel']`. `test-v2-paridad` no compara `touch`, así que no hace falta divergencia.
- **W2 (cola del motor):**
  - `SKILL_KEYS` sin `art` ni `innate`: las 23 habilidades avisan «clave desconocida art» (y Piel de Hierro, `innate`). Las suites del Guerrero toleran SOLO esos dos avisos hasta que lleguen.
  - `wave` vuelve a golpear al enemigo del impacto (y a todo el que está dentro del radio y en la línea). Ya no es bloqueante: Onda Sagrada usa `v_onda_sagrada`. Si se arregla, la variante puede volver a `set: { wave }`.
  - Buscar el VFX por variante: `SKILL_FX[def.forged?.varId] ?? SKILL_FX[sk.id]` en `_makeCtx` y en `basicAttack`. Hasta entonces las 14 entradas `<id>_i`/`<id>_ii` de `GUERRERO_FX` no se usan (test-forge-guerrero lo mide y lo da por PENDIENTE).
  - Tope de Quebranto por desplazamiento (por objetivo y por tiempo) o `bossPull:false`: con el Arpón (`g_lanza_i`, `pull 4`), cada lanza suma 20 de Quebranto al jefe por el tirón (28 contra 8 sin la variante), en una principal sin recarga de 20 de Furia: 5 lanzas lo quiebran. El Ciclón ya no tira de los jefes (lo filtra `v_ciclon`).
  - La Estela genérica (`zone`, Grieta de la Hendidura II) hace el 45 % del golpe por segundo (factor fijo de `_finishCast`) y no el 40 % de la línea: falta una clave `zonePct` (o `zoneCoef` sobre la Estela).
  - `@windup` no ve la preparación de un paso de combo (`steps[2].windup` de Rajar).
  - `hitDot` hace tics fijos de 0,5 s y no lee `tv.bleedDur`/`bleedPct`: el sangrado del Remolino no recibe los talentos de sangrado del Berserker (el de Rajar, `steps[].dot`, sí, por `dotProfile`).
  - `trail.dur` no recibe `zoneDur` de los talentos.
  - `SKILL_KEYS` sin `forged`: `validateSkillDef` avisa «clave desconocida forged» sobre toda definición forjada.
  - F7 de `test81` compara solo el perfil en los tipos genéricos: Estocada Final (`g_rajar_i`, que cambia `steps.2`) solo se distingue por la etiqueta `line`. Debería comparar también la definición sin `forged` (como hace test-forge-guerrero).
  - `dragWidth` de un talento (Gran Arrastre) reactiva el arrastre en Carga Veloz (`drag:false`): solo debería sumar si la definición arrastra. Arrastrar debería juntar a los arrastrados dentro del golpe de llegada.
  - El canal genérico: sin `slowImmune` y atrae con el radio del daño (hoy lo cubren `v_giro_firme` y `v_ciclon`).
  - `clampWalkable` avanza en pasos de 0,3 m y pierde el último tramo (un salto de 8 m cae a 7,8 m).
- **U2:** `hud-model.baseSkillIcon` pide `skills/<id>.webp` y siete habilidades del kit 2g no tienen ese archivo (`g_remolino`, `g_rajar`, `g_guardia`, `g_carga_escudo`, `g_u_ciudadela`, `g_juicio`, `g_sendero`): el humo `boot` cae por sus 404. El catálogo trae ya `art` (el arte del mockup, todo existente en `assets/`); con `baseSkillIcon` usando `sk.art` (el pequeño, el mismo archivo o su par de `skills/`), el humo vuelve a verde sin arte nuevo.
- **B1 (banco):**
  - Tres Juicios (`g_juicio_ii`, ★ del Cruzado) contra 5 enemigos juntos a 6 m: el Juicio sin variante hace 142 a cada uno y los marca a todos con su salpicadura de 3 m; Tres Juicios, 85 a cada uno (60 %) y marca a los mismos. Solo gana con enemigos repartidos por el abanico. Si F8 lo exige también en grupo, subir el coeficiente (60 → ~75 %) o la salpicadura de cada martillo.
  - Arpón: Quebranto de los tirones (arriba, W2).
  - El suelo consagrado del Cataclismo (40 %/s) y las réplicas del Terremoto (2 × 50 %).
- **Orquestador:** ratificar la forja legada de Torbellino (§5) y las suites que entran en la cuarentena (§6).

## 4. Forja (KA2): traducción del mockup `k` y decisiones

Las 51 piezas están en `GUERRERO_SKILL_FORGE` (`js/skills-guerrero.js`); los 10 poderes `v_*`, en `js/powers-forge-guerrero.js` (`guerreroForgePowers()`, números en `guerreroForgeTuning()`), y el comportamiento `v_onda_sagrada`, en `GUERRERO_SKILL_BEHAVIORS`. Las 12 líneas acortadas a ≤ 70 caracteres están en `divergencias.json` (`aprobada:false`). Cada pieza se prueba en el arnés en `tests/test-forge-guerrero.mjs`.

- **Tajo:** la salpicadura del motor es `cleave × (1 + splashPct/100)`, así que «+.15 / −.2 / .75» se escriben como `splashPct` +30 / −70 / +20 (65 %, 30 %, 75 %). Siega: `dmgDirect −15` (solo el principal baja al 85 %) y `cleaveR` +0,5 sobre la Mejora (3 m). Desgarro: `hitDot` sangrado 60 %/3 s con etiqueta `dot`; `resolveSkill` escala `hitDot.coef` con el rango, así que sigue siendo el 60 % del golpe a rango 5 (medido: 61 % a Nv7 y 62 % a Nv33).
- **Hendidura · Grieta:** la Estela genérica (`zone`, 2 s, una a la vez). **Daña el 45 % del golpe por segundo (factor fijo del motor), no el 40 % de la línea** (petición `zonePct` a W2); no lleva la etiqueta `zone` para no admitir soportes de zona que no le hacen nada.
- **Embestida · Carnero:** `drag` genérico (no hace falta `v_carnero`) con `dragWidth 1`: con el valor por defecto (1,5 m) los arrastrados quedan a ~2,2 m, en el borde del golpe de llegada (1,9 m), y el aturdimiento falla.
- **Lanza · Arpón:** `pull 4` genérico. A los jefes no los mueve: les suma 20 de Quebranto por lanza (petición de tope a W2/B1).
- **Remolino:** el canal no da inmunidad a ralentizaciones por sí solo → `v_giro_firme` la renueva mientras giras (con `slowImmune` en la definición). Ciclón → `v_ciclon` (atrae 1 m por giro a 5 m; el canal genérico atrae con el radio del daño) y **no toca a los jefes**: `Enemy.displace` les sumaba 5 de Quebranto por tirón (55 en un giro de 3 s con recarga de 6 s), y llenar el Quebranto es del Guardián. Anclado: `moveMul 0`, `radius 2`.
- **Salto · Caída Atronadora:** `recast:null` (sin relanzar), `pull 2`, `stun .75`.
- **Rajar:** Estocada = `steps.2` en línea y `steps.2.coef ×1,4` (conserva preparación y sangrado). Molino = `steps.*` en área propia. Las dos añaden la etiqueta de su forma (`line`/`area`): ningún soporte la exige ni la prohíbe y ningún selector de talento la lee, así que no cambian qué se engarza ni qué toca cada nodo; en la Estocada, además, es lo único que la distingue para el F7 de `test81` (petición a W2).
- **Furia · Sed Voraz:** `v_sed_voraz` (+8 % de robo solo mientras dura la Furia Inmortal) y `buff.endHealPct 0`.
- **Cambio de Guardia:** «cdr −50» → `cd` y `stance.swapCd` a 1,5 s (el cambio lee `swapCd`, no el CDR). Compartida → `v_guardia_compartida` (media postura a aliados a 6 m); Opresiva → `v_guardia_opresiva` (Muralla: −10 % de daño a enemigos a 5 m; Ariete: frenados 20 %).
- **Carga de Escudo · Arrollador:** «knock 1» = aturdir 1 s a los arrastrados con `bossStun 0` (a los jefes, solo los 20 de Quebranto). Carga Veloz: `drag:false`, `taunt:0` y quita la etiqueta `taunt`.
- **Terremoto · Martinete:** `at:'target'` a 3 m (el `aim3` del mockup). Falla: tipo `line` 10 × 2 m.
- **Ciudadela · Andante:** `moveMul .5`, `plant:false` y `follow:'owner'` (el aura va contigo; sin seguirte se quedaría clavada donde la lanzaste). Empalizada → `v_empalizada`.
- **Juicio · Sentencia:** `radius 0`, sin salpicadura, `mark.dur 12`, `mark.weakPct 15` (Debilidad: +15 % de todo el daño que recibe). Tres Juicios: ver B1 (§3).
- **Martillo:** Mano Ágil conserva el ancho de la ventana perfecta. Arrojado: proyectil de 12 m y quita `melee`. **Onda Sagrada: `v_onda_sagrada`** (golpe en la mira + onda de 8 × 2 m al 60 % solo a quien el golpe no alcanzó). Contra un solo enemigo (carga de 0,3 s, Nv20): base 222 · Arrojado ×1,40 · Onda ×1,00, así que la variante de un objetivo gana a la de área (F1/F2).
- **Cataclismo · Amanecer:** `heal`/`shield` del motor a 8 m del impacto, etiqueta `heal`.
- **VFX:** `GUERRERO_FX` trae entradas para las variantes que cambian de forma (`<id>_i`/`<id>_ii`), pero el motor todavía busca el FX por `sk.id` (petición W2): hoy no se usan, y test-forge-guerrero lo mide (sonda: Martinete) y lo marca PENDIENTE.
- **★ (`GUERRERO_FORGE_RECO`):** las de §7; ninguna apaga la barra de su especialización (lo comprueba `test-forge-guerrero`).

## 5. Tablas legadas (`js/save-legacy-guerrero.js`): decisión para ratificar

- **Torbellino → Hendidura también en la forja** (`torbellino: { to: 'g_hendidura', map: { v1, v2, v3: 'ii' } }`), y no → Remolino como dicen §11.6.4 del documento y el ejemplo de §3.11 del plan. Motivo: el plan (§3.11) manda escribir las tablas **desde v4** («§11.6.4 habla de variantes 2f que nunca se guardaron», D1) con el criterio de 2f §6.1, y las tres opciones de la 3.ª rama v4 de Torbellino son de ÁREA: Estela (zona 4 s), Masacre (4+ golpeados) y Coloso (+90 % de radio). El Remolino solo tiene variantes UNI (Anclado) y CONTROL (Ciclón), así que no hay correspondencia; la Hendidura sí: Grieta es ÁREA y además la misma mecánica que la Estela (zona). Y §11.6.3 manda la ranura de Torbellino a la Hendidura: la variante cae en la habilidad que la ocupa, no en una insignia que solo tiene el Berserker. Si el orquestador prefiere §11.6.4 al pie de la letra, el cambio es `to: 'g_remolino'` con las tres opciones en `'ii'` (Ciclón) y el caso de test-skills-guerrero §6 cambia con él.
- Lo demás sigue §11.6.3: ver la tabla de casos de `tests/test-skills-guerrero.mjs` §6 (con la migración real). `g_t_desafio → g_guardia` y `g_t_bramido → g_h_bramido` dan lo mismo que «→ Piel de Hierro» de §11.6.3: fuera de su ranura o sin el nodo, la barra cae a `SPEC_BAR` (insignia en la 3; Piel de Hierro en la 2).

## 6. Suites rojas frente a `paso2-impl` (las provoca esta rama)

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

