# Guerrero · catálogo 2g (KA1) — comportamientos propios y pendientes

Lo escribe KA-guerrero (E2). Complementa `guerrero/pendientes-guerrero.md` (lo regenera el conversor y no se edita a mano).

## 1. Comportamientos propios (`GUERRERO_SKILL_BEHAVIORS`)

Todo lo demás del kit sale de tipos y claves genéricos de §3.6 (`channel` + `hold`, `recast`, `combo` + `steps`, `stance`, `dash` + `dashT`/`drag`/`taunt`, `repeat` + `needPlanted`, `blink` + `trail`, `charge`, `mark` + `detonate`, `aura` + `at:'target'`, `cdOnEnd`, `cdFloor`, `buff.minHpPct`/`endHealPct`).

| Habilidad | Por qué no basta un tipo genérico | Qué haría falta en el motor para quitarlo |
|---|---|---|
| `g_u_cataclismo` | La luz cae donde apuntas **al soltar**: `_releaseWith` rehace el contexto con la mira del **inicio** de la carga. Además consagra el suelo (`floor`: zona de 6 s, 40 %/s, una a la vez) y el tipo `area` no deja zona propia | `charge.aimAtRelease` (W2) y una clave genérica de zona al impactar (`floor`/`zoneOnHit`) |
| `g_u_ciudadela` | Te clava (`moveMul` 0 durante `dur`, plantado ya) **y** da el buff a los aliados del radio con provocación al clavarte y cada segundo: el tipo `buff` no frena al héroe ni reparte a aliados sin `ally`, y el tipo `aura` (que sí tiene `pulse`) no frena, no planta y su primer pulso llega a 1 s | `moveMul` y `plant` genéricos en `aura` y un pulso inicial (W2) |
| `g_h_bramido` | Aturde sin dañar: un `area` con `coef` 0 hace 1 de daño a cada uno (`Enemy.takeDamage` redondea a 1) | `area` con `coef` 0 = solo efectos (W2) |
| `g_h_desafio` | Zona `contain` centrada entre tú y el enemigo de la mira (o sobre él), marca con Debilidad y, sin enemigo al alcance, no gasta la recarga | Tipo `zone` con `at:'between'` y «sin objetivo = sin coste» (W2) |

`g_t_aliento` y `g_t_intervencion` siguen siendo comportamientos de `js/powers-guerrero.js` (KT): el catálogo solo los nombra.

## 2. Claves del documento traducidas al vocabulario de §3.6

- Terremoto `aftershocks:{ n:2, coef:.5, needPlanted:1 }` → `repeat:{ n:2, every:.5, coef:.5, needPlanted:true }`.
- Cambio de Guardia `stance:{ a:{ drPct:15, blockPct:10 }, b:{ dmgPct:15 } }` → `stance.modes[{ stats:{ dr, block } }, { stats:{ dmgPct } }]`, `swapCd 3`, `swapGcd 0`.
- Martillo de Guerra `type:'charge'`, `chargeT`, `minT`, `moveWhileCharging`, `perfectBonus:{ dmgPct, gauge }` → `type:'area'` + `charge:{ max, perfect, perfectPct, scale, moveMul, perfectGauge }` (`minT` = el `chargeMin` común, 0,15 s).
- Cataclismo `chargeT 2` → `charge.max 2`; «+3 de Fervor» → `perfectGauge:{ fervor:3 }`.
- Ciudadela `root`, `drPct 40`, `taunt 10` cada 1 s → `moveMul:0`, `plant:true`, `buff:{ dr:40 }`, `pulse:{ every:1, radius:10, taunt:1.5 }`.
- Sendero `healPct 2` → `trail.heal 2`.
- Desafío de Arena «le haces +20 %» → `mark.weakPct 20` (Debilidad: +20 % de **todo** el daño que recibe, no solo el tuyo).

## 3. Pendiente fuera de KA1

- **KA2:** `GUERRERO_SKILL_FORGE` y `GUERRERO_FORGE_RECO`; al escribirlos, borrar las divergencias `forja` y `reco` de `tools/convert-v2/divergencias.json` y sacar `test81` de la cuarentena.
- **KT-guerrero:**
  - Piel de Hierro del Guardián (12 s y −50 %): por la pasiva de la especialización; el catálogo da 8 s y −40 %.
  - Fervor (`z0`): el catálogo ya da +1 al soltar perfecto el Martillo y +3 el Cataclismo (`perfectGauge`); la mecánica no debe sumarlo otra vez (tope de 1 por lanzamiento salvo el Cataclismo) y el Veredicto no da Fervor.
  - Golpe de Titán (`g_ti_*`): «tu siguiente principal es un Golpe de Titán» se engancha en ③ `afterCast` de `g_h_bramido`.
  - Rival (`g_gl_*`): el encerrado por `g_h_desafio` es `cast.enemy` (o el más cercano a 12 m); su marca es `g_h_desafio`.
  - Pendones (`g_cau_*`): `g_h_estandarte` planta un campo `aura` con `buffId:'g_h_estandarte'`.
  - «Nunca baja de 4 s» (Sendero `z21`, Carga `d17`): `cdFloor` es una fracción de la recarga y solo limita `g.reduceCooldown`; el suelo absoluto lo tiene que respetar el poder (o una clave `cdMinS` de W2).
  - G1 en `test78`: los `touch` de `c6`, `c9` y `c23` nombran ids del kit (`g_rajar`, `terremoto`, `g_martillo`, `g_juicio`, `g_u_cataclismo`, `g_salto`, `g_carga_escudo`, `g_sendero`); con selectores (`@spender`, `@windup`/`@charge`, `@movement`) dejan de fallar.
- **W2:**
  - `@windup` no ve la preparación de un paso de combo (`steps[2].windup` de Rajar).
  - `hitDot` hace tics fijos de 0,5 s y no lee `tv.bleedDur`/`bleedPct`: el sangrado del Remolino no recibe los talentos de sangrado del Berserker (el de Rajar, `steps[].dot`, sí, por `dotProfile`).
  - `trail.dur` no recibe `zoneDur` de los talentos.
- **B1:** calibrar el suelo consagrado del Cataclismo (40 %/s) y las réplicas del Terremoto (2 × 50 %).

## 4. KT-guerrero (E2): talentos de clase, especializaciones y héroe

Lo escribe KT-guerrero. El efecto de cada nodo lo prueba `tests/test-talentos-guerrero.mjs` (187 nodos u opciones); las reglas transversales, `tests/test-powers-guerrero.mjs`; las barras, `tests/test-gauges-guerrero.mjs`.

### 4.1 Lo que §3 dejaba a KT

- Piel de Hierro del Guardián (12 s y −50 %): en la clave gratis `d0` (`mod g_piel { durS: 4, buff: 25 }`). Los topes propios (reducción de daño 65 %, bloqueo 50 %) esperan a `drCapAdd`/`blockCapAdd` (W2).
- Fervor: el catálogo da la suelta perfecta (`perfectGauge`); la mecánica solo suma la detonación si el lanzamiento no fue perfecto (tope 1) y el Veredicto no da Fervor.
- Golpe de Titán, Rival y Pendones enganchados a `g_h_bramido`, `g_h_desafio` y `g_h_estandarte` en ③ `afterCast` (el Estandarte cambia el aura del catálogo por un Pendón en la mira).
- «Nunca baja de 4 s» (Sendero `z21`, Carga con Avalancha `d17`) y el 70 % de las definitivas: un único `cutCd` en `powers-guerrero.js`; el inicio de la recarga lo anota el primer poder de cada lanzamiento (`noteStart`).
- G1 en `test78`: `c6`, `c9` y `c23` tocan selectores (`@spender`, `@windup`/`@charge`, `@movement`).

### 4.2 Poderes que el documento no nombra (D28: ids nuevos, sin choques con otras clases)

| Nodo | Poder | Por qué un poder y no `mod`/`tv`/`stats` |
|---|---|---|
| `c7` | `g_marcha_imparable` | Imparable durante la movilidad y 1 s después (no hay clave genérica) |
| `c9A`/`c9B` | `g_golpe_pesado`/`g_sin_pausa` | Quebranto por preparación y moverse cargando sin dejar de estar plantado |
| `c11A`/`c17A`/`c22A` | `g_piel_aliento`/`g_piel_grito`/`g_piel_intervencion` | «Si no la pones, sale con Piel de Hierro al 50 %» (además del `grant`) |
| `b12` | `g_b_ritmo_matanza` | Recorte a todas las recargas salvo definitiva y Piel, por crítico de una habilidad |
| `b14` | `g_b_impacto` | Aturdir al caer con tope por enemigo (y Quebranto a jefes) |
| `d7` | `g_d_mirada` | `taunt` no está en las claves `mod` de `test78` (lo pone `modifyResolve`) |
| `d9A` | `g_d_replicas` | Las réplicas se abren hasta 8 m (`repeatAdd` es mod; el anillo exterior, el poder) |
| `d10A` | `g_d_gran_arrastre` | `dragWidth` no es clave `mod`; además junta a los arrastrados delante de ti |
| `z0` | `g_z_martillo_piadoso` | Pasiva de la especialización (cura por daño sagrado) y regla de zonas sagradas |
| `z4` | `g_z_marca_indeleble` | `markDur` no es clave `mod` |
| `z10A` | `g_z_senda_ardiente` | `zoneCoef` no es clave `mod`; la ralentización la pone la regla de zonas |
| `z13` | `g_z_tierra_bendita` | Radio y duración de TODAS tus zonas sagradas (el sendero incluido) |

### 4.3 Decisiones de lógica (para revisar con el dueño del diseño)

- Zonas sagradas (`z0`): cada enemigo recibe solo la zona más fuerte que pisa y cada aliado la cura más alta; la cura de zona va por una cubeta del 4 %/s por receptor (con 1 s de reserva al entrar) y el Martillo Piadoso, 1 %/s.
- Sed: lo que da un golpe es la vida que de verdad pierdes (un golpe letal no la llena más allá de la que te quedaba: Negación la deja en 50 sin saciarla).
- Bastión: descarga con 5 o más cargas (también con las 7 de Inexpugnable 2) y las gasta todas.
- Estallido Rojo (`b22`) salta al soltar, al acabar y al quedarte sin Furia.
- Desangrar (`b8B`): cada Rajar guarda su Sangrado en una ranura propia (`g_rajar#k:bleed`, hasta 3).
- Las marcas que salta el Tribunal (`z25`) aguantan una sola detonación; la Onda (`b9A`) y el 2.º golpe de Golpe de Gracia (`b26`) no reciben Verdugo (`b23`).
- Rival (`l*`): el +20 % de Desafío de Arena es la Debilidad de su marca (no se suma otro +20 %).
- Innatas: se quitan `hpPct 5` (Guardián) y `healPct 30` (Cruzado), que no estaban en el diseño.
- `tv.fervorChance` sigue leyéndose (contrato del núcleo y `test72`), aunque ningún nodo v2 la da.

### 4.4 Cola W1 / W2

- **W1:** `test78` `POWER_PREFIX.guerrero` debe aceptar `m_berserk` (lo exige `test67b` en `b0`); `MOD_KEYS` con `taunt`, `markDur`, `dragWidth`, `zoneCoef`, `zoneHeal`, `keepPlanted`; `test75` con los nombres nuevos de `x` (`boil`, `stance`, `planted`, `lockT`, `walking`, `walkIn`, `basicHits`…) para quitar los alias `frenzyT`, `wallT`, `hammerHits`, `ascT`.
- **W2:** `drCapAdd`/`blockCapAdd`; bloqueo forzado en el núcleo (hoy `forceBlock` en el poder); `step`/`repeat`/`echo`/`perfect` en el HitInfo de `rollDamage` (quita la ventana de réplicas y la bandera de Verdugo); `hitDot` que lea `bleedPct`/`bleedDur`; `trail.dur` con `zoneDur`; `@windup` en pasos de combo; suelo absoluto `cdMinS` también para los recortes del núcleo (`basicCritCdr`, `perfectCdrAll`); `applyCC('fear')`; velocidad de habilidades (giros y saltos de Sangre Hirviente); `g.channelInfo`, `g.stopDash` y `g.startCooldown` públicos; `dotsOf` con `interval`.
