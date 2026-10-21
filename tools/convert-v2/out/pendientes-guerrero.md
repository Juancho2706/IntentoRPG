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

## 4. Forja (KA2): traducción del mockup `k` y decisiones

Las 51 piezas están en `GUERRERO_SKILL_FORGE` (`js/skills-guerrero.js`); los 10 poderes `v_*`, en `js/powers-forge-guerrero.js` (`guerreroForgePowers()`, números en `guerreroForgeTuning()`). Las 12 líneas acortadas a ≤ 70 caracteres están en `divergencias.json` (`aprobada:false`). Cada pieza se prueba en el arnés en `tests/test-forge-guerrero.mjs`.

- **Tajo:** la salpicadura del motor es `cleave × (1 + splashPct/100)`, así que «+.15 / −.2 / .75» se escriben como `splashPct` +30 / −70 / +20 (65 %, 30 %, 75 %). Siega: `dmgDirect −15` (solo el principal baja al 85 %) y `cleaveR` +0,5 sobre la Mejora (3 m). Desgarro: `hitDot` sangrado 60 %/3 s con etiqueta `dot`.
- **Hendidura · Grieta:** la Estela genérica (`zone`, 2 s, una a la vez). Daña el 45 % del golpe por segundo (factor fijo del motor) y no el 40 % del documento; no lleva la etiqueta `zone` para no admitir soportes de zona que no le hacen nada.
- **Embestida · Carnero:** `drag` genérico (no hace falta `v_carnero`) con `dragWidth 1`: con el valor por defecto (1,5 m) los arrastrados quedan a ~2,2 m, en el borde del golpe de llegada (1,9 m), y el aturdimiento falla.
- **Remolino:** el canal no da inmunidad a ralentizaciones por sí solo → `v_giro_firme` la renueva mientras giras (con `slowImmune` en la definición). Ciclón → `v_ciclon` (atrae 1 m por giro a 5 m; el canal genérico atrae con el radio del daño). Anclado: `moveMul 0`, `radius 2`.
- **Salto · Caída Atronadora:** `recast:null` (sin relanzar), `pull 2`, `stun .75`.
- **Rajar:** Estocada = `steps.2` en línea y `steps.2.coef ×1,4` (conserva preparación y sangrado). Molino = `steps.*` en área propia. Ambas añaden la etiqueta de su forma (`line`/`area`).
- **Furia · Sed Voraz:** `v_sed_voraz` (+8 % de robo mientras dura) y `buff.endHealPct 0`.
- **Cambio de Guardia:** «cdr −50» → `cd` y `stance.swapCd` a 1,5 s (el cambio lee `swapCd`, no el CDR). Compartida → `v_guardia_compartida` (media postura a aliados a 6 m); Opresiva → `v_guardia_opresiva` (Muralla: −10 % de daño a enemigos a 5 m; Ariete: frenados 20 %).
- **Carga de Escudo · Arrollador:** «knock 1» = aturdir 1 s a los arrastrados con `bossStun 0` (a los jefes, solo los 20 de Quebranto). Carga Veloz: `drag:false`, `taunt:0` y quita la etiqueta `taunt`.
- **Terremoto · Martinete:** `at:'target'` a 3 m (el `aim3` del mockup). Falla: tipo `line` 10 × 2 m.
- **Ciudadela · Andante:** `moveMul .5`, `plant:false` y `follow:'owner'` (el aura va contigo; sin seguirte se quedaría clavada donde la lanzaste). Empalizada → `v_empalizada`.
- **Juicio · Sentencia:** `radius 0`, sin salpicadura, `mark.dur 12`, `mark.weakPct 15` (Debilidad: +15 % de todo el daño que recibe).
- **Martillo:** Mano Ágil conserva el ancho de la ventana perfecta. Arrojado: proyectil de 12 m y quita `melee`. Onda: `wave` del motor (la onda también alcanza al del impacto).
- **Cataclismo · Amanecer:** `heal`/`shield` del motor a 8 m del impacto, etiqueta `heal`.
- **VFX:** `GUERRERO_FX` trae entradas para las variantes que cambian de forma (`<id>_i`/`<id>_ii`), pero el motor todavía busca el FX por `sk.id` (petición W2).
- **★ (`GUERRERO_FORGE_RECO`):** las de §7; ninguna apaga la barra de su especialización (lo comprueba `test-forge-guerrero`).

### Pendiente para W2 (forja)
- Buscar el FX por variante: `SKILL_FX[def.forged?.varId] ?? SKILL_FX[sk.id]` en `_makeCtx` (`game-skills.js`) y en `basicAttack` (`entities.js`).
- `SKILL_KEYS` (`skill-defs.js`) sin `forged`: `validateSkillDef` avisa «clave desconocida forged» sobre toda definición forjada.
- Auditoría F7 de `test81`: en los tipos genéricos compara solo el perfil; Estocada y Onda solo se distinguen por la etiqueta `line` (debería comparar también la definición sin `forged`).
- `wave` vuelve a golpear al enemigo del impacto; Estela con factor fijo 0,45 (sin clave `zonePct`).
- `dragWidth` de un talento (Gran Arrastre) reactiva el arrastre en Carga Veloz (`drag:false`): solo debería sumar si la definición arrastra. Arrastrar debería juntar a los arrastrados dentro del golpe de llegada.
- El canal genérico: sin `slowImmune` y atrae con el radio del daño (hoy lo cubren `v_giro_firme` y `v_ciclon`).
- `clampWalkable` avanza en pasos de 0,3 m y pierde el último tramo (un salto de 8 m cae a 7,8 m).
