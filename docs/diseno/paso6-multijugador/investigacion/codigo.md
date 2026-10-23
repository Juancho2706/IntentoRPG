# Paso 6 · Cooperativo de 2 a 4 en navegador — frente «código» (v2, corregida tras la refutación)

**Investigador:** frente «código» (preparación del código, solo lectura) · **Fecha:** 2026-10-22
**Rama leída:** `paso2-impl` @ `4095ab6` · **Regla de carga respetada:** no se corrió `npm test`, ni el humo, ni servidores, ni Chrome. Solo se leyó código (grep y lectura), se buscó en internet y se ejecutaron dos `node -e` de lectura en la v1 (tamaños de guardados y nº de enemigos por zona).
**Cambios de la v2:** al final, en §13 «Refutación y cambios», hay una tabla punto por punto. Las marcas **[v2]** señalan lo nuevo o lo corregido.

---

## 0. Resumen ejecutivo

1. **[v2] Decisión única de autoridad** (para que los dos informes digan lo mismo; ver §4):
   - **v1 cooperativa (F1) = modelo B, autoridad repartida.** Cada cliente es dueño de su héroe: lo simula con el código actual, con 0 ms de retardo, y resuelve el daño que recibe. El anfitrión es dueño del mundo: enemigos, IA, apariciones, muertes, cofres y viajes.
   - **Ladder verificable (F3) ≠ «reutilizar la simulación de F1».** Con B esa reutilización no existe. F3 cuesta: héroe por instancia (`p.cast`, `p.input`) + simulación del mundo sin DOM + **una de dos**:
     - **(a)** predicción de habilidades en un servidor a 92–136 ms;
     - **(b) verificación en sombra:** el cliente juega a 0 ms y un Durable Object (DO) re-simula en vivo con matemática determinista. Desglose en §5 F3.
2. **Lockstep descartado para el cooperativo, por este orden:**
   - el ritmo lo marca el más lento y la entrada se retrasa un RTT;
   - para unirse a mitad de partida o reconectarse hace falta una instantánea completa, y el estado de hoy **tiene cierres que no se pueden serializar** (`Enemy.casting.run`, ≈ 43 sitios que programan cierres en `timers`);
   - el hit-stop y la pausa son globales.
   El determinismo **sí se puede costear** (detmath con 1,10× de coste más una prueba de lint), pero solo hay evidencia entre versiones de V8. Queda como opción de F3, no como imposibilidad.
3. **Bases que ya existen:**
   - streams `layout/spawn/loot` con semilla;
   - mazmorra y zona reproducibles por semilla (`test58`);
   - planificador por ticks;
   - contrato de aliados (`g.allies`, `g.party`, `g.damageAlly`, ganchos ⑫);
   - amenaza con histéresis;
   - `buffByPact` como punto único de escalado;
   - la mutación de enemigos pasa por ≈ 12 métodos de API.
   **[v2] Pero el pueblo y el refugio NO son reproducibles:** árboles y cristales con `Math.random` bloquean celdas de la rejilla (`world.js:6, 779-783, 1285-1288`).
4. **El supuesto de «un solo héroe» está en todo el código.** El estado de lanzamiento vive en `Game` (≈ 108 referencias), `Enemy.takeDamage` supone que todo daño viene de `game.player`, los ataques enemigos solo dañan a `g.player` y el aggro solo mira a `g.player`.
5. **[v2] Anfitrión oculto = bloqueante de F1.** En Windows, Chrome trata como oculta una ventana **tapada** por otra (un alt-tab a Discord basta) y también la pantalla bloqueada. rAF se detiene. Plan:
   - bombear la simulación del mundo con cada mensaje de red, con un acumulador por `performance.now()` y hasta 1 s de recuperación;
   - si no alcanza, el mundo en un Worker con los DataChannels transferidos;
   - como red de seguridad, una pausa cooperativa.
   Todo esto se valida con un prototipo **antes** de F1 (§7.6).
6. **[v2] Presupuesto de transporte** (dcSCTP de Chrome: MTU de 1191 B, RTO mínimo de 400 ms, ACK diferido de 200 ms, sin intercalado):
   - instantáneas de ≤ 1100 B armadas con un **acumulador de prioridad**;
   - eventos urgentes **dentro** del canal no fiable, con redundancia y acuse;
   - el canal fiable solo para lo que no es urgente, troceado;
   - si se llena el búfer, la instantánea se descarta (§7.4).
7. **[v2] Paso de tiempo:** en la v1 (B) **no** hace falta un paso fijo global. El héroe propio sigue con `dt` variable (misma sensación; el banco sigue siendo comparable). El mundo del anfitrión usa `dt` variable cuando la página se ve y subpasos de ≤ 1/60 cuando se pone al día. El paso fijo a **60 Hz** (no 30) con interpolación de render es un requisito de F3, porque la posición ES la malla (§5, 0.1).
8. **[v2] Seguridad:**
   - `heroName` se guarda sin validar y se pinta con `innerHTML` (`ui.js:2894`). `ui.js` tiene 119 `innerHTML` y no tiene función de escape;
   - `importSave()` (`main.js:337-349`) escribe cualquier JSON;
   - `validateItem()`, que cita tecnologia.md, **no existe** en el repo.
   En cooperativo, el nombre, el chat o los objetos de otro jugador son un XSS en tu máquina. Con cuentas (F2), además pueden robar la sesión. Arreglo en F0: `sanitize.js` puro (§9.1).
9. **Rendimiento:** la simulación cuesta 0,064–0,077 ms por tick. Lo que limita son los VFX (pool de 2000 partículas que descarta), las mallas por proyectil y el guardado en cada muerte.

---

## 1. Qué hay ya (inventario con archivo:línea)

| Pieza | Dónde | Estado para el cooperativo |
|---|---|---|
| Streams con semilla `layout/spawn/loot` (sfc32 + splitmix32) | `js/rng.js:52-99`; `Game.simRng` `main.js:991-993` | ✅ Base sólida. `fx` = `Math.random` a propósito |
| Mazmorra reproducible por semilla (`mulberry32(seed)`, `ri` local) | `world.js:956-960` | ✅ (`test58`) |
| Zona reproducible por semilla (autómata celular solo con operaciones enteras; disco del campamento con `dx*dx+dz*dz`) | `zones.js:34, 47, 103`, `world.js:611-613` | ✅ La rejilla. ⚠️ **[v2]** La colocación de POI usa `Math.hypot` (`zones.js:217`), aproximado según ECMA-262 |
| **[v2] Pueblo (36×36) y refugio (26×26)** | `buildTown()` `world.js:709`; `buildRefuge()` `world.js:1252`; `loadWorld` los construye sin semilla (`main.js:472-473`) | ❌ `ri()` global = `Math.random` (`world.js:6`): 14 árboles (`:779-783`) y 10 cristales (`:1285-1288`) ponen `grid.cells[z][x] = 0`. **La rejilla de colisión es distinta en cada máquina** |
| Semilla semanal de grieta | `rng.js:111` `riftSeed`; llaves con `seed` `items.js:506` | ✅ |
| Planificador por ticks determinista | `js/timers.js` `TickScheduler`, `applyDoTInstance` | ✅ Pero guarda **cierres** (`schedule(delay, fn)`, `timers.js:20`): no se puede serializar |
| Aliados: `allies(pos, r)` = jugador + `g.party` | `game-skills.js:888-893` | ✅ |
| Cura y escudo al aliado con menos vida | `game-skills.js:900-921` | ✅ (solo dispara los poderes de `this.player`) |
| Daño a un aliado ⑫ `onAllyDamaged`/`onAllyLethal` | `game-skills.js:923-945`; `powers-guerrero.js:2339, 2750, 2769` | ⚠️ Gancho síncrono (§8) |
| Contrato de un aliado (arnés) | `tests/helpers/power-harness.mjs:213-227` | ✅ Es la interfaz de `RemoteHero` |
| Amenaza, provocación, `combatTarget` con histéresis | `entities.js:2117-2151` | ✅ Falta la adquisición inicial por cercanía |
| Campos del suelo con dueño héroe o `g.party` | `field-entities.js:117` | ✅ |
| `buffByPact`, punto único al aparecer (`test56`) | `main.js:998-1012` | ✅ Punto del escalado por grupo |
| Guardado declarativo `SAVE_VERSION = 5` | `save-schema.js:37-56` | ✅ (CLAUDE.md dice v4: desactualizado) |
| Exportar e importar el héroe (base64) | `main.js:322-349` | ⚠️ **[v2]** La importación no valida nada (§9.1) |
| Indicadores por enemigo (`perEnemy`) | `spec-mechanics.js:186-193` | ⚠️ Sin dueño |
| Marcas con `by` | `game-skills.js:2085, 2129-2140` | ⚠️ `markDetonation` no comprueba `m.by` |
| Huecos del HUD para grupo y chat; menú «Multijugador» | `docs/paso2d2-hud-pc.md:75, 105`; `docs/paso-frontend-menus.md:166, 199-206` | ✅ Diseño previo |

---

## 2. Auditoría de determinismo

| Área | Situación hoy | Evidencia | ¿Bloquea el lockstep? | ¿Afecta a B? |
|---|---|---|---|---|
| Paso de tiempo | `dt` variable: `min(0.05, clock.getDelta())`, solo dentro de rAF | `main.js:1545`, `:212` | Sí | Solo por el anfitrión oculto (§7.6) |
| Hit-stop | Escala **todo** el `dt` a 0,02 durante 40–160 ms | `main.js:1569-1574`, `vfx.js:27-34` | Sí | **Sí:** el héroe pierde tiempo frente a un mundo que sigue. Debe ser solo visual |
| Pausa con un panel abierto | Congela la simulación | `main.js:1552-1564` | Sí | **Sí** |
| Azar de combate | `this.combatRng \|\| Math.random`; `combatRng` no se asigna en producción | `entities.js:1005, 1328, 3175` | Sí | No |
| Efecto lateral | `powers-maga.js:258` `rng(p)` devuelve 0,5 fijo: satélites superpuestos | `powers-maga.js:258, 1965, 2646, 2749` | — | **Posible bug actual** |
| `Math.random` en módulos de simulación **[v2: recuento]** | 36 usos: entities 19, game-zone-life 9, field-entities 2, combat-math 2 (valores por defecto), powers-arquera/guerrero/maga 1 cada uno, enemy-abilities 1 (algunos son cosméticos) | grep | Sí | No (la IA corre en el anfitrión) |
| **[v2] Pueblo y refugio** | `Math.random` en celdas bloqueadas | §1 | Sí | **Sí: las rejillas difieren entre máquinas** |
| **[v2] Colocación de POI en la zona** | `Math.hypot` frente a umbrales enteros (`pickOpenCell`) | `zones.js:217-224` | Sí, entre motores | Bajo: los POI los manda el anfitrión (§5 F1) |
| Semillas de zona por sesión | `zoneSeeds[biome] = Math.random()*1e9` | `main.js:460` | — | No: el anfitrión las envía |
| Ids globales del módulo | `enemyUid`, `fieldUid`, `lureSeq`, `itemUid`, `giUid` | `entities.js:1843`, `field-entities.js:79-80`, `items.js:108`, `main.js:72` | Sí | **Sí** como ids de red |
| Reloj de pared en la simulación | La suelta de la carga perfecta usa `wallNow` | `game-skills.js:66, 2150, 2173, 2286` | Sí | No (lo resuelve el dueño) |
| Funciones trascendentes **[v2: recuento]** | **235** `Math.sin/cos/tan/atan/atan2/asin/acos/exp/pow/hypot/log/cbrt…` en módulos de simulación: entities 70, powers-maga 42, powers-arquera 33, game-skills 24, field-entities 15, skills-arquera 12, skills-maga 11, enemy-abilities 11, powers-guerrero 4, game-zone-life 4, powers-forge-maga 3, powers-forge-guerrero 3, combat-math 3. Más **15** usos del operador `**` (también aproximado según ECMA-262). La simulación **no** usa métodos trigonométricos de THREE (`applyAxisAngle`, `setFromAxisAngle`, `lookAt`: 0 apariciones) | grep | Sí, entre motores y versiones | No |
| Estado no serializable **[v2]** | `Enemy.casting = {…, run, onInterrupt}` (`entities.js:2159`); DoT y ecos como cierres en el planificador (≈ 43 sitios) | grep | Complica unirse tarde | No: en B la réplica solo necesita vista (posición, vida, banderas de control) |
| Orden de iteración | `splice` hacia atrás, inserción de `Map` | `main.js:1588`, `entities.js:2117` | Determinista con el mismo orden | No |
| Botín | Stream `loot` secuencial: depende del orden de las muertes | `main.js:1233-1240` | — | **Sí** → sembrado por muerte (§6) |
| Posición = malla | `get pos() { return this.group.position; }` | `entities.js:744, 1906, 3278` | — | Solo para interpolar el render con paso fijo (F3) |

**Por qué no lockstep en el cooperativo** **[v2: razones reordenadas]**
1. **Ritmo del más lento y retardo de un RTT** en cada entrada: el lockstep no avanza sin las entradas de todos ([Gaffer, What every programmer…](https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/)).
2. **Unirse a mitad de partida o reconectarse** exige una instantánea completa y determinista. Aquí el estado tiene cierres (`casting.run`, temporizadores), así que serializarlo obliga a reescribir enemigos y DoT de forma declarativa. B solo replica la vista.
3. **Hit-stop y pausa globales:** el crítico de uno congelaría a los cuatro.
4. **Determinismo entre motores:** costeable, no imposible. El caso [bounce#8](https://codeberg.org/perplexdotgg/bounce/issues/8) (ago-2026) mostró que `sin/cos` difieren entre V8 11.3 y 14.9. Lo arreglaron cambiando 32 llamadas por núcleos fdlibm hechos solo con `+ − × ÷`, a 1,10× el coste, y los hashes coincidieron. Solo se probó en V8; no hay datos de SpiderMonkey ni de JavaScriptCore. Aquí serían 235 llamadas más 15 `**` y una prueba de lint (§5 F3). **Esta razón no pesa por sí sola: las tres primeras bastan.**
5. El ahorro de ancho de banda del lockstep no compensa: la instantánea típica cuesta ≈ 15 KB/s por cliente (§7.4).

> Sobre Path of Exile **[v2]**: su «lockstep» espera la confirmación del servidor; no es determinista. Según la wiki de la comunidad, se recomienda con latencia **baja**, y el modo Auto cambia a predictivo por encima de ≈ 150 ms ([poewiki](https://poewiki.net/wiki/Desync), resumen; la página bloquea bots). **[sin verificar en una fuente oficial de GGG]**. tecnologia.md §0.7 lo dice al revés. Las guías de Steam dicen que PoE2 tiene Auto, Lockstep y Predictivo (`networking_type`), lo que contradice el «solo lockstep» del hilo [3887145](https://www.pathofexile.com/forum/view-thread/3887145). Las dos fuentes son de jugadores: no sirven como prueba.

---

## 3. Dónde vive el estado y qué supone «un solo héroe»

### 3.1 Estado
- **`Game`** (`main.js:57-213`): `enemies[]`, `projectiles[]`, `groundItems[]`, `fx[]`, `firePools[]`, `telegraphs[]`, `chains{}`, `world`, `worldRng`, `timers`, `zoneSeeds/zoneExplored`, `stash`, `shopStock`.
- **Estado de lanzamiento en `Game`** **[v2: recuento exacto con grep de `this.|g.|game.`]**:

  | Campo | Referencias |
  |---|---|
  | `_channel` | 31 |
  | `_charging` | 29 |
  | `_windup` | 15 |
  | `_needsRelease` | 15 |
  | `_liveBeams` | 5 |
  | `_chargeEnd` | 4 |
  | `_noTgtAt/_noResAt/_noCastAt` | 9 |
  | **Total** | **≈ 108** |

  Además está `resetCastState()` (`game-skills.js:2447`). Lo leen también `hud-model.js`, `ui-verbs.js`, `entities.js` y `powers-guerrero.js`.
- **`Player`**: ya es por héroe: `stats`, `buffs`, `cds`, `skState`, `gauges`, `castLock`, `leap`, `gcdT`…
- **`Enemy`**: `threat` es un `Map` con objetos como claves; para la red hay que pasarlo a `heroId`. Además, `casting` y `_dots` usan cierres.
- **Entrada leída por la simulación** **[v2]**: 19 lecturas de `input.keyDir/mouseWorld/mouseHeld` en los módulos de simulación (game-skills 6, entities 4, skills-arquera 3, powers-arquera 3, field-entities 1, powers-forge-arquera 1, powers-maga 1).

### 3.2 Supuestos de un solo héroe

| Supuesto | Dónde | Efecto |
|---|---|---|
| Todo daño a un enemigo viene de `game.player` (Π[×], amenaza, stagger, empuje) | `entities.js:2299-2318, 2335` | Un aliado usaría los multiplicadores del jugador local |
| Proyectil amigo → `g.player.onDealHit()` | `entities.js:3155-3157` | Igual |
| Proyectil enemigo, área telegrafiada, charco y aura: **solo dañan a `g.player`** | `entities.js:3170-3183, 2728`, `main.js:931, 1666-1670` | Los aliados serían inmunes |
| Aggro, línea de visión y deambular: solo miran a `g.player` | `entities.js:2526, 2685-2706` | Los enemigos ignoran a un aliado |
| Habilidades enemigas apuntan a `this.player` | `enemy-abilities.js:44, 116, 234, 253` | Igual |
| **[v2]** Guardas `!== g.player` | 14 sitios: powers-maga 7, skills-maga 4, game-skills 2, powers-forge-maga 1 | Matan los canales de un héroe remoto simulado en otra máquina (modelo A) |
| `this.player` dentro del canal de habilidades | 43 en `game-skills.js` | El que lanza está implícito (modelo A) |
| Al morir un enemigo, todo va al jugador local | `main.js:1134-1323` | Separar mundo y héroe |
| Reaparición «lejos del jugador», recogida, mascota, cámara, viaje | `game-zone-life.js:36`, `main.js:1685-1697`, `entities.js:3274-3281`, `main.js:1732-1784`, `main.js:422` | Ver §5 |

---

## 4. Decisión de autoridad (una sola, para los dos informes) **[v2]**

| Modelo | Qué hace cada máquina | Cambios en ESTE código | Latencia percibida | Trampas | Uso |
|---|---|---|---|---|---|
| **C · Lockstep determinista** | Todos simulan todo | dt fijo, todo el azar con semilla, detmath, sin hit-stop ni pausa, instantánea serializable, CRC por tick | Un RTT en todo | Bajas | ❌ |
| **B · Autoridad repartida** | **Dueño del héroe:** lo simula y resuelve el daño que recibe. **Anfitrión:** el mundo | Modo réplica de `Enemy` (≈ 12 métodos), `RemoteHero`, bus de eventos, separar `onEnemyKilled`. **El canal de habilidades no se toca** | Tu héroe: 0 ms. Confirmación de una muerte: medio RTT más el búfer | Un cliente puede mentir; se mitiga con cotas | ✅ **v1 (F1)** |
| **A · Autoridad única** (*listen server* o DO) | La autoridad simula los 4 héroes; los clientes predicen | `p.cast` (≈ 108), `p.input` (19), el que lanza explícito (43), quitar 14 guardas, simulación sin DOM, **predicción de habilidades** | Habilidades con un RTT de retardo si no se predicen | Resistente | F3, opción (a) |
| **A′ · Verificación en sombra** | El cliente juega como en solitario (0 ms) y transmite sus entradas en vivo; un DO re-simula y su resultado es el oficial | Lo de A **sin** predicción, más **determinismo bit a bit** (detmath, lint, paso fijo de 60 Hz, sin reloj de pared) | 0 ms | Resistente a la manipulación del cliente; no a los bots en vivo | F3, opción (b) |

**Qué tiene que alinear tecnologia.md** (el diseño lo fusiona en un solo documento):
- §0.1 y §2.4: en B, el héroe propio **no se predice: es la autoridad**. La tabla de «qué se predice» vale solo para A (F3).
- §2.3: 60 Hz y no 30, y solo donde haya paso fijo (F3).
- §6.1, §7.3 B y §10 F3: «la misma simulación de F1 en un DO» no existe con B. F3 se costea como se describe en §5 F3.
- §7.1: `validateItem()` no existe; se sustituye por `sanitizeRemoteHero` (§9.1).
- §0.7 y §4.2: el modo Auto de PoE está invertido (ver §2).

**Por qué B y no A para la v1:**
- (1) No se reescribe el canal de habilidades (2462 líneas, las 9 especializaciones y las ventanas de carga perfecta de 0,20–0,30 s: `skills-arquera.js:93, 116`, `skills-guerrero.js:146, 159`).
- (2) Las habilidades propias se sienten igual que en solitario.
- (3) Entre amigos, las trampas son aceptables: es el precedente del Battle.net abierto de D2 y de Grim Dawn ([Steam](https://steamcommunity.com/app/219990/discussions/0/365163686071802740)).
- **Deuda asumida:** `p.cast` y `p.input` se pagan en F0 como refactor mecánico sin cambio de comportamiento (0.18), pero **no bloquean F1**.

---

## 5. Plan de cambios por archivo

### Fase 0 — cimientos sin red (se comprueban sin navegador)

| # | Archivo y función | Cambio | Riesgo | Prueba |
|---|---|---|---|---|
| 0.1 **[v2]** | `main.js` `tick()` (1544-1818) | Separar `simStep(dt)` (1576-1708) de `present(realDt)` (1710-1818). **El `dt` variable se mantiene** para el héroe y para el mundo visible. Se añade `catchUp(ms)`: subpasos de ≤ 1/60 con hasta 1 s de recuperación, que solo usa el anfitrión (§7.6). **El paso fijo global y la interpolación pasan a F3** (ver más abajo) | Bajo: no cambia la sensación | Arnés: N pasos dan el mismo estado |
| 0.2 | `main.js:1569-1574`, `vfx.js:27` | Hit-stop **solo visual** en multijugador (pose, sacudida y partículas; no el `dt`). En solitario, a elegir | Medio (sensación) | — |
| 0.3 | `main.js:1552` | `paused = … && !this.net?.active` | Bajo | — |
| 0.4 | `rng.js` | Streams `ai` y `combat`; `killLootRng(seed, heroId, netId)` | Bajo | `test58` |
| 0.5 | `loadWorld` | `p.combatRng = createRng(hashSeed(world.seed,'combat',p.heroId))` (arregla `powers-maga.js:258`) | Bajo (cambian las tiradas) | Bancos |
| 0.6 | `entities.js` (IA), `enemy-abilities.js:164`, `game-zone-life.js` (9), `main.js:962` | `Math.random` → `g.simRng('ai'\|'spawn')` | Bajo | — |
| 0.7 | `save-schema.js:40`, `Player` | `heroId` (`crypto.randomUUID()` si falta) | Bajo | `test57`/`test80` |
| 0.8 | `entities.js:1843`, `field-entities.js:79`, `main.js:72` | Ids **por mundo** (`g.nextNetId()`) | Bajo | — |
| 0.9 | `Enemy.takeDamage` (2290), `Projectile` (3066), `dealArea`/`dealProcDamage` | `opts.by` = héroe atacante; `Projectile.owner` | Medio | `test66` con dos héroes |
| 0.10 | `Enemy._updateAI` (2526, 2685-2706) | `acquireTarget()`: el héroe vivo, visible y más cercano entre `g.heroes()` | Medio | Arnés con `h.ally()` |
| 0.11 | `entities.js:3170-3183, 2728`, `main.js:931, 1666-1670`, `enemy-abilities.js:44, 116, 234, 253` | Los efectos enemigos dañan a **todos** los héroes | Medio | Arnés |
| 0.12 | `combat-math.js` y `buffByPact` | `partyHpMult(n, rank)` y `partyXpMult(n)`; reescalado que mantiene la fracción de vida | Bajo | `test56` |
| 0.13 | `onEnemyKilled` (`main.js:1134-1323`) | `resolveKill(e)` (mundo) frente a `grantKill(p, e, kill)` (héroe, con botín por `killLootRng`) | Medio | `loot-regression` |
| 0.14 | `main.js:1315, 1471` `save()` | Debounce de 3 s, más guardado inmediato al subir de nivel, al recibir un legendario y al morir | Bajo | — |
| 0.15 | `game-skills.js:2129-2140`, `spec-mechanics.js:186-193` | Decidir de quién son las marcas y la Escarcha | Diseño | Por especialización |
| **0.16 [v2]** | `world.js` `buildTown(seed)`, `buildRefuge(seed)`; `main.js:472-473` | `ri` y decoración con `mulberry32(seed)` y un stream de decoración aparte, como en `buildDungeon`. Semilla fija por versión del pueblo (o la que mande el anfitrión) | Bajo (el pueblo cambia de aspecto una vez) | `test58` ampliado: **hash de la rejilla contra una constante** para el pueblo, el refugio, una mazmorra y una zona. Detecta cambios del código y de la versión de V8 de Node |
| **0.17 [v2]** | `zones.js:217` | `cellDistToSpawn` → distancia al cuadrado entera (`dx*dx+dz*dz >= m*m`; los umbrales son enteros: `zones.js:260-361`) | Bajo (solo cambiaría un empate exacto) | `test58` con la constante |
| **0.18 [v2]** | `game-skills.js` (+ `hud-model.js`, `ui-verbs.js`, `entities.js`, `powers-guerrero.js`, `powers-forge-arquera.js`) | **Deuda de A:** `this._channel/_charging/_windup/_needsRelease/_liveBeams/_chargeEnd/_no*At` → `p.cast.*` (≈ 108); `input` → `p.input` (19); `this.player` → el que lanza (43); quitar las 14 guardas. Mecánico y sin cambio de comportamiento. **No bloquea F1** | Medio (amplio, pero lo cubren las suites de habilidades) | Suites de habilidades y talentos en verde; arnés con 2 héroes que lanzan |
| **0.19 [v2]** | `js/sanitize.js` (nuevo, puro), `main.js:337` `importSave` | `esc()` único (hoy hay tres copias: `ui-gauges.js:317`, `ui-skills.js:69`, `ui-talents.js:101`); `sanitizeHeroName`; `sanitizeSave(json)` que reconstruye los objetos a partir de ids del catálogo (§9.1) | Bajo | Prueba pura: un `heroName` o un nombre de objeto `<img src=x onerror=…>` queda inerte |

**Sobre el paso fijo** **[v2]**. La refutación tiene razón en tres cosas:
- 30 Hz cuantiza las ventanas de carga perfecta.
- El humo mide a 1/60.
- Interpolar el render no es trivial, porque `pos` **es** `group.position` en `Player`, `Enemy` y `Pet`.

Discrepo en una sola: **la v1 (B) no necesita paso fijo global**. Nadie reconcilia el héroe propio contra un servidor, porque es su propia autoridad. Las réplicas se dibujan a partir de las instantáneas, con su marca de tiempo, y el interpolador escribe su `pos` directamente. Así que en las réplicas que la posición sea la malla no estorba.

El paso fijo a 60 Hz es un requisito de F3: lo necesitan la predicción de A y el determinismo de A′. Para interpolar el render en F3 hay dos técnicas, a medir:
- **(i)** separar `simPos/prevPos` de `group.position` en las 3 clases;
- **(ii) «posición de render prestada»:** antes de `render()` se escribe `lerp(prev, sim, α)` en `group.position` y después se restaura el valor de simulación. Es O(n) y no cambia la semántica de `pos`. Su riesgo: lo que lea `pos` dentro de `present()` ve la posición interpolada, y para la cámara eso es justo lo deseado.

Fuente: [Fix Your Timestep](https://gafferongames.com/post/fix_your_timestep/).

### Fase 1 — red (modelo B)

| Módulo nuevo | Qué contiene | Notas |
|---|---|---|
| `js/net/protocol.js` (**puro**) | Codificación binaria: posición `uint16` a 1/256 m, ángulo en 1 B, vida en `uint16`, banderas en bits. **[v2]** Un **acumulador de prioridad** por receptor arma cada instantánea hasta 1100 B ([Gaffer, State Synchronization](https://gafferongames.com/post/state_synchronization/)). **[v2]** Mensajes urgentes «fiables sobre no fiable»: id incremental, acuse con un campo de bits de 32, reenvío como mucho cada 100 ms ([Gaffer, Reliable Ordered Messages](https://gafferongames.com/post/reliable_ordered_messages/)) | Se prueba sin navegador, como `hud-model.js` |
| `js/net/transport.js` **[v2]** | Canales propios con `negotiated:true` e **ids fijos altos** (p. ej. 100 `ev` fiable y ordenado, 101 `st` con `{ordered:false, maxRetransmits:0}`), creados sobre la `RTCPeerConnection`. Con Trystero, se obtiene de `getPeers()`. Crear canales nuevos sobre una asociación SCTP ya abierta no obliga a renegociar. Los ids altos evitan chocar con el canal interno de Trystero **[verificar en el prototipo]**. Reglas de presupuesto en §7.4 | Señalización: tecnologia.md. Recomendación conjunta tras la refutación: Worker + DO con hibernación como principal y Trystero (Nostr, con `password`, que cifra el SDP con AES-GCM) de respaldo ([trystero](https://github.com/dmotz/trystero)) |
| `js/net/session.js` **[v2]** | Saludo: `VERSION` de `sw.js`, hash del catálogo, `heroId` y el héroe **saneado** (≈ 3–11 KB, solo en el saludo). Bienvenida: `worldSpec` (tipo, bioma, semilla, piso, grieta), **CRC32 de la rejilla** y **manifiesto de POI** (portales, cofres, santuarios, puntos de ruta con id y posición). Si el CRC no coincide, el cliente pide la rejilla como bitset (zona 120×120 = 1800 B; mazmorra 46×46 = 265 B; pueblo 36×36 = 162 B; refugio 26×26 = 85 B) y usa esa para colisionar | Los POI y las apariciones **nunca** los regenera el cliente: vienen del anfitrión. El cliente regenera por semilla solo el terreno y la decoración |
| `js/net/replica.js` | `Enemy` en modo réplica: sin `_updateAI`, búfer de interpolación de ≈ 100 ms; los ≈ 12 métodos que mutan aplican la predicción y emiten la reclamación `{netId, by, kind, args}` | La muerte se muestra solo cuando el anfitrión la confirma |
| `js/net/remote-hero.js` | `RemoteHero` con el contrato de `g.party`; `takeDamage` → mensaje al dueño; marioneta `Player` construida desde el guardado **saneado** | — |
| `js/net/host-loop.js` **[v2]** | Bombeo del mundo del anfitrión fuera de rAF (§7.6 H1) | Bloqueante de F1: se valida con un prototipo antes |
| `js/game-net.js` (mixin) | Integra todo en `Game`; se registra en `Object.assign` y en `test43-mixins` | — |
| `ui.js` | Marcos de grupo, chat, ping (`getStats()` → `currentRoundTripTime` del par de candidatos), avisos «el anfitrión está ausente» y «con retraso». **[v2] Todo lo que venga de otro jugador se pinta con `textContent`** | `paso2d2-hud-pc.md` |

**Flujos clave (B):**
- **Golpe propio:** el cliente calcula como hoy y envía `hit{netId, dmg, crit, skill, tags, elem, from}` por la vía **urgente**. El anfitrión lo aplica sin recalcular, contra una cota de plausibilidad.
- **DoT:** `dot{netId, total, ticks, interval, source}` → los tics corren en el planificador del anfitrión; ⑬ se avisa por evento.
- **Muerte:** el anfitrión arbitra por orden de llegada y envía `kill{…}` por la vía urgente. Cada cliente ejecuta `grantKill` para su héroe, con botín personal por `killLootRng`. **El botín no viaja por la red.**
- **Daño recibido** **[v2]:** el anfitrión envía `atk{enemy, target, kind, windup}` por la vía urgente al **empezar** el ataque, y el cliente de la víctima lo resuelve al terminar la preparación con lo que ve (posición, esquiva, bloqueo). Los proyectiles y las áreas telegrafiadas se replican como entidades con trayectoria determinista, y cada cliente comprueba solo a su héroe.
- **Habilidad remota (visual):** `cast{heroId, skillId, target, variant}` más los FX como eventos (`emitFx`: `main.js:845`, 64 llamadas).

### Fase 2 — presentación remota y VFX
- Coordinar con el rework de VFX: los FX tienen que ser serializables (id de preset, posición y parámetros).
- Presupuesto de partículas por fuente: el héroe local tiene prioridad y cada remoto ≤ 15 % del pool. Opción «intensidad de efectos aliados» ([Icy Veins](https://www.icy-veins.com/d4/news/has-disabling-other-players-effects-become-needed-for-diablo-4/)). Los telegrafiados enemigos van siempre por encima.

### Fase 3 — ladder verificable: costeo real **[v2]**

**Base común a A y A′:**

| Pieza | Coste en código |
|---|---|
| Héroe por instancia | 0.18 (≈ 108 + 19 + 43 + 14 sitios), si no se hizo en F0 |
| `WorldSim`/`SimGame` sin DOM | Separar `simStep` y `resolveKill` de `main.js`. Los ganchos de presentación (`emitFx` 64, `ui.message`, `sfx`, `addShake`, `vibrate`) van a un bus de eventos. El arnés `makeGame` (`tests/helpers/power-harness.mjs:56-110`) ya es un prototipo |
| Paso fijo de 60 Hz + interpolación de render | §5, nota sobre el paso fijo |

**Opción (a): A en un DO.** Hace falta predecir las habilidades: movilidad, canales y cargas, que es justo donde Last Epoch se atascó ([LE jul-2021](https://forum.lastepoch.com/t/multiplayer-progress-update-july-2021/42239)). Desde Chile, el DO nace en el este de Norteamérica (92–136 ms), y las ventanas de carga perfecta de 0,20–0,30 s se sufren. Es lo más caro y lo que peor se siente.

**Opción (b): A′, verificación en sombra (recomendada para evaluar primero).**
- **Determinismo:**
  - `detmath` (núcleos fdlibm con `+ − × ÷`) para las 235 llamadas y los 15 `**`;
  - 36 `Math.random` → streams;
  - el reloj de pared de la carga (`game-skills.js:2150, 2173, 2286`) → tiempo de simulación;
  - `_runStats.t0` (`main.js:495`) → ticks.
- **Lint al estilo de `test67`:** prohibir en los módulos de simulación `Math.(sin|cos|tan|atan|atan2|asin|acos|exp|expm1|log|log1p|log2|log10|pow|hypot|cbrt|sinh|cosh|tanh)`, `**`, `Math.random`, `performance.now` y `Date.now`. Las líneas de presentación (p. ej. `entities.js:2629, 2722, 3051`, que animan con `Math.sin(performance.now())`) van a una lista de excepciones o salen a `present()`.
- **Prueba dorada entre motores:** la misma repetición de 10 min da el mismo hash en Node, Chrome, Firefox, Safari y workerd. Corre en CI (GitHub Actions; el repo es público), **no en la PC del dueño**.
- **Por qué detmath es obligatorio:** Cloudflare actualiza V8 por su cuenta, sin que lo fije la fecha de compatibilidad. Ejemplo: «Updated v8 to version 15.3» el 2026-08-28 ([changelog de Workers](https://developers.cloudflare.com/workers/platform/changelog/)).
- **Flujo:** el cliente transmite lotes de entradas a 10 Hz. El DO simula **por evento**, al llegar cada lote y sin `setInterval`, compara hashes cada N ticks y anula el intento si hay divergencia. Además comprueba que las entradas llegan al ritmo del reloj real. Así impide un TAS fuera de línea, pero no un bot en vivo.
- **Coste estimado por intento de 10 min [estimación, a medir con el prototipo R2]:**
  - 6000 mensajes → 300 peticiones facturadas (WebSocket entrante a 20:1);
  - duración 0,128 GB × 600 s = 76,8 GB-s → ≈ 169 intentos al día dentro de los 13.000 GB-s gratis;
  - CPU por mensaje ≈ 6 ticks × 0,07–0,3 ms ≈ 0,4–1,8 ms, por debajo de los 10 ms por invocación del plan gratis.
- **Reinicios del DO** (despliegues y actualizaciones del runtime: [ciclo de vida](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)): el estado vivo tiene cierres, así que **no se puede guardar un checkpoint tal cual**. Hay dos salidas:
  - la regla «un intento cortado no consume intento»;
  - restaurar con semilla + registro de entradas re-simulado: 36.000 ticks ≈ 2,5–11 s de CPU, que no cabe en los 10 ms del plan gratis; haría falta el plan de US$5 o re-simular por tramos con alarmas.
- **Puerta de decisión:** si la prueba dorada entre motores falla, A′ se descarta y quedan el ladder «de honor» (tecnologia C) o (a).
- **Personajes de ladder separados de los locales**, como Last Epoch ([FAQ LE](https://forum.lastepoch.com/t/official-last-epoch-multiplayer-faq/42036)) y el Battle.net cerrado de D2: aunque la grieta se verifique, una build progresada en el cliente se puede falsificar.

---

## 6. Escalado de enemigos, botín y progreso con más jugadores

### 6.1 Dónde enganchar
- **Vida y daño:** `buffByPact` (`main.js:998`); las fórmulas van a `combat-math.js`.
- **XP:** en `grantKill`; hoy, `xpGain = def.xp × (1 + pacto)` (`main.js:1142`).
- **Botín:** `rollDrops(floor, {mf, qty, quality, cls, rng})` (`items.js:525`); el grupo entra por `qty`.
- **Stagger:** `staggerFromDamage(dealt, maxHP, …)` (`entities.js:2318`) escala solo con la vida. Decidir si se usa `baseMaxHP`, como PoE usa la vida original para el aturdimiento ([poedb](https://poedb.tw/Partying)).

### 6.2 Referencias numéricas (para el frente de itemización)

| Juego | Vida por jugador extra | Botín y XP | Fuente |
|---|---|---|---|
| D2 (1.10+) | `HP × (n+1)/2`, fijada al aparecer | XP `× (n+1)/2` | [diablowiki](https://diablo2.diablowiki.net/Experience) |
| D3 (1.0.8) | +50 % por jugador | +10 % XP/oro/MF por jugador (tope +30 %) | [Engadget](https://www.engadget.com/2013-04-03-diablo-iii-gets-massive-multiplayer-improvements-in-1-0-8.html) |
| PoE 1 | +50/60/80/100 % por rareza | Cantidad +27/51/73 %; rareza +17/31/44 % | [poedb](https://poedb.tw/Partying) |
| D4 | Botín personal, intercambiable salvo míticos | XP de grupo con tope desde 1.1.0 | [Maxroll](https://maxroll.gg/d4/resources/multiplayer), [Wowhead](https://www.wowhead.com/diablo-4/es/news/experience-bonuses-and-powerleveling-nerfed-diablo-4-season-1-334138) |
| Last Epoch | Botín instanciado | — | [Notas 0.9](https://forum.lastepoch.com/t/the-convergence-update-beta-0-9-patch-notes/51975/2) |

**Lo que el código necesita en cualquier caso:** botín personal sembrado por `(semilla, heroId, netId)`. Así no viaja nada, no depende del orden de las muertes y una grieta se puede reproducir. El intercambio entre jugadores obliga a remapear `uid` (`syncItemUids`, `items.js:110-141`) y a **sanear** el objeto recibido (§9.1).

### 6.3 Progreso compartido
- Cada cliente guarda **su** héroe.
- Grieta completada: evento del anfitrión, y cada cliente calcula sus recompensas (`main.js:1280-1312`).
- Cofres, santuarios, mímicos, goblin y jefe de mundo: estado del anfitrión. El botín se tira por héroe.

---

## 7. Rendimiento, red y robustez

1. **Simulación:**
   - 0,064 / 0,075 / 0,077 ms por tick (arquera / maga / guerrero) con 1 héroe y 30 enemigos a 1/60 (`tools/smoke/baseline.json`, `ccce3d9`, i5-13400F);
   - con 4 héroes en una máquina (A) serían ≈ 0,3–0,45 ms;
   - en B, el anfitrión simula su héroe y ≈ 60 enemigos (`zones.js:348`): despreciable.
2. **Interfaz:** 0,24–0,43 ms de media por fotograma (p95 de 1,0–2,2 ms). Los marcos de grupo se refrescan a 10 Hz.
3. **VFX:**
   - el pool de 2000 partículas (1000 en gama ≥ 2) descarta cuando se llena: hace falta un presupuesto por fuente;
   - cada proyectil crea su propia malla (`main.js:1604-1610`): pool o `InstancedMesh`.
4. **Red y presupuesto SCTP** **[v2]**.
   *Datos de partida.* dcSCTP (libwebrtc, Chrome) usa por defecto ([dcsctp_options.h](https://webrtc.googlesource.com/src/+/refs/heads/main/net/dcsctp/public/dcsctp_options.h)):

   | Opción | Valor por defecto |
   |---|---|
   | `mtu` | **1191 B** |
   | `rto_initial` | 500 ms |
   | `rto_min` | **400 ms** |
   | `delayed_ack_max_timeout` | 200 ms |
   | `enable_message_interleaving` | **false** |
   | `max_message_size` | 256 KiB |
   | `max_send_buffer_size` | 2 MB |

   SCTP repara una pérdida por *fast retransmit* tras **3 avisos de hueco** ([RFC 9260 §7.2.4](https://www.rfc-editor.org/rfc/rfc9260.html)), y quien recibe manda el SACK con el hueco **al instante** (§6.7). Con tráfico continuo (20–60 paquetes/s), una pérdida se repara en ≈ 3 paquetes (≈ 50–150 ms). Con tráfico escaso, como un evento fiable suelto, manda el RTO de ≥ 400 ms. Firefox usa usrsctp, con otros valores por defecto **[sin verificar]**.

   *Reglas:*
   - **T1.** Mensaje no fiable ≤ **1100 B** (margen bajo la MTU tras las cabeceras SCTP). La instantánea se arma con un acumulador de prioridad: lo que no cabe sale primero en la siguiente. Cada paquete es autosuficiente, así que no se trocea. Caben ≈ 95 entidades de 11 B.
   - **T2.** **Eventos urgentes dentro de los paquetes no fiables** (inicio de un ataque contra ti, golpe propio, muerte, interrupción, control sobre ti), con redundancia hasta el acuse. Con una pérdida, el retraso es de ≈ 1 paquete (≤ 50 ms) en lugar de ≥ 400 ms.
   - **T3.** Canal fiable `ev` solo para lo **no urgente**: chat, entrada y salida, cambio de zona, misiones, subida de nivel y el héroe al unirse. Troceado en la app a ≤ 16 KB. **En combate, cada mensaje ≤ 1100 B**: sin intercalado, un mensaje grande retrasa los paquetes de `st` de la misma asociación. Los mensajes grandes solo en el saludo.
   - **T4.** Contrapresión: si `st.bufferedAmount` > 2 × 1100 B, **se descarta** esa instantánea (la siguiente es más fresca). En `ev` se usa `bufferedAmountLowThreshold` ([MDN RTCDataChannel](https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel)).
   - **T5.** **No** recomiendo un tercer canal con `maxPacketLifeTime: 250`. Con un RTO mínimo de 400 ms solo lo repara el *fast retransmit*, que depende de que haya tráfico continuo. T2 da lo mismo con un tiempo predecible.
   - **T6.** Diagnóstico con `chrome://webrtc-internals` y `getStats()`.

   *Cifras:*
   - típica ≈ 0,75 KB por instantánea, ≈ 15 KB/s de bajada por cliente;
   - **tope** 1100 B × 20 Hz = 22 KB/s por cliente; el anfitrión sube como mucho ≈ 66 KB/s (0,53 Mbps) con 3 invitados.
5. **Guardado:** hoy se hace `JSON.stringify` y `setItem` en cada muerte (`main.js:1315`) y en cada recogida (`:1471`) → debounce (0.14).
6. **Anfitrión oculto (bloqueante de F1)** **[v2]**.

   *Hechos:*
   - **(a)** En Windows, Chrome trata una ventana **tapada por otra ventana nativa** como una pestaña de fondo: «rendering stops, and js is throttled». Con la pantalla bloqueada, todas las ventanas se consideran tapadas ([Chromium, occlusion tracking](https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_native_window_occlusion_tracking.md)). Basta un alt-tab.
   - **(b)** rAF «espera a que la página sea visible». Con un `RTCDataChannel` abierto, los temporizadores quedan en el nivel de **una vez por segundo**, no en el intensivo. Con sonido audible en los últimos 30 s, el estrangulamiento es mínimo, pero una pista silenciosa no cuenta ([Chrome 88](https://developer.chrome.com/blog/timer-throttling-in-chrome-88)). Firefox no estrangula una pestaña con un `AudioContext` ([MDN setTimeout](https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout)), y el juego crea uno (`sfx.js:62`, `music.js:33`) **[a medir]**.
   - **(c)** El congelamiento por Ahorro de energía (Chrome 133) exime las páginas con un `RTCPeerConnection` con un `RTCDataChannel` abierto ([Chrome](https://developer.chrome.com/blog/freezing-on-energy-saver)).
   - **(d)** `RTCDataChannel` es **transferible** a un Worker: Chrome 130 (solo Dedicated Workers), Firefox 144 y Safari 15 ([BCD](https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RTCDataChannel.json)). **Condición:** `[[IsTransferable]]` pasa a `false` en la tarea siguiente a su creación o al primer `send()` ([webrtc-pc](https://w3c.github.io/webrtc-pc/)). Hay que transferir el canal **en la misma tarea en que se crea** (encaja con los canales `negotiated` de `transport.js`). Que los temporizadores de un Worker escapen al estrangulamiento de la página **no está documentado** **[sin verificar]**.

   *Velocidad del mundo con la página oculta o tapada:*

   | Situación | Hoy (solo rAF) | `setTimeout` ingenuo con el tope de 0,05 s | Acumulador de 4 pasos (v1 de este informe) | **H1** (bombeo por red, hasta 1 s de recuperación) |
   |---|---|---|---|---|
   | Chrome, en silencio | **0 %** | 5 % | 6,7 % | ≈ 100 %; la fluidez depende de la cadencia de mensajes **[a medir]** |
   | Chrome con música audible | 0 % | ≈ 100 % | ≈ 100 % | ≈ 100 % |
   | Firefox (`AudioContext`) | 0 % | ≈ 100 % según MDN | ≈ 100 % | ≈ 100 % |

   *Plan:*
   - **H1 (barato, F1).** `hostPump()` se llama desde rAF cuando la página se ve, desde **cada `onmessage` de los invitados** (3 × 20 Hz = 60 por segundo; los eventos de red no son temporizadores) y desde un `setTimeout(16)` de respaldo cuando está oculta. Usa el acumulador por `performance.now()` con subpasos de ≤ 1/60 y hasta 1 s de recuperación (≤ 60 × 0,07–0,3 ms ≈ ≤ 18 ms). Las instantáneas salen al final de cada bombeo.
   - **H2 (si H1 falla en algún navegador o caso).** El mundo autoritativo en un Dedicated Worker con los canales transferidos. El hilo principal del anfitrión pasa a ser un cliente más, por `MessageChannel`. Exige el `WorldSim` sin DOM de F3, que así se adelanta.
   - **H3 (siempre, como red de seguridad).** Si los invitados no reciben una instantánea en más de 1 s, aparece «con retraso»; a los 5 s, «el anfitrión está ausente» y una pausa cooperativa.
   - **Prototipo** (de juguete, no el juego; fuera de la PC del dueño o por turno): Chrome, Firefox y Safari × pestaña oculta, ventana tapada, minimizada y pantalla bloqueada × con y sin música. Se mide la velocidad del mundo y la cadencia de las instantáneas.

---

## 8. Riesgos de desincronización y mitigación

| Riesgo | Cómo aparece | Mitigación |
|---|---|---|
| Réplica distinta del anfitrión | Mi golpe se aplica en local y se rechaza | La instantánea pisa la predicción; delta hasta el acuse |
| Doble crédito de muerte | Dos clientes «matan» a la vez | El anfitrión arbitra por orden de llegada |
| Muerte fantasma | El enemigo «revive» | La muerte se muestra solo con `kill` |
| Evento urgente retrasado **[v2]** | Un RTO de ≥ 400 ms en el canal fiable | T2: los urgentes van dentro del canal no fiable con redundancia |
| Instantánea fragmentada **[v2]** | Más de 1191 B: perder un fragmento la pierde entera | T1: tope de 1100 B con acumulador de prioridad |
| Cola que crece **[v2]** | `bufferedAmount` acumula latencia | T4: descartar en lugar de encolar |
| **Rejilla distinta [v2]** | Pueblo y refugio con `Math.random`; `hypot` entre motores | 0.16, 0.17; CRC32 en la bienvenida y bitset si no coincide; POI desde el anfitrión |
| Código distinto | Catálogo o stats diferentes | `VERSION` y hash del catálogo en el saludo |
| El anfitrión se va | Se acaba la sesión | Fin con aviso; cada uno conserva su héroe |
| **Anfitrión oculto o tapado [v2]** | El mundo se congela | §7.6: H1, H2 y H3 |
| Trampas | Daño falso declarado | Cota de plausibilidad (golpe máximo según un `Player` reconstruido del guardado saneado); salas entre amigos; ladder aparte |
| **XSS entre jugadores [v2]** | Nombre, chat u objeto con HTML | §9.1 |
| Ganchos síncronos ⑫ | Vínculo del Guardián, Intercesión, Bastión Eterno | Redirección del lado de la víctima con una bandera replicada (3 poderes) |
| Ventanas de carga perfecta | Autoridad remota | En B las resuelve el dueño (0 ms) |
| Ids globales | Distinto orden | Ids de red del anfitrión (0.8) |
| Marcas y Escarcha sin dueño | Robo o sinergia involuntaria | Decisión 0.15 |

---

## 9. Guardado, cuentas y seguridad

- **Hoy:** 3 huecos `intentorpg_save_slot{0..2}`, más el alijo `intentorpg_stash`, `intentorpg_opts` e `intentorpg_dailylog`. Hay copia `.bak-v4` y exportación en base64.
- **Cooperativo v1 sin cuentas:** salas por código y cada uno trae su héroe local (modelo D2 abierto). El héroe viaja una vez, **saneado**.
- **Con cuentas (F2):** `heroId` es la clave en la nube; conflictos por `rev`.
- **Integridad:** mientras el héroe viva en el cliente, cualquier récord es editable. El ladder exige personajes separados (§5 F3).

### 9.1 Superficie XSS (nuevo en v2)
- **Hechos:**
  - `heroName` se persiste (`save-schema.js:56`) sin validar (`entities.js:586`) y se pinta con `innerHTML` (`ui.js:2894`);
  - `ui.js` tiene 119 `innerHTML` y ninguna función de escape;
  - los objetos llevan `name` dentro del guardado y se pintan en tooltips con `innerHTML` (p. ej. `ui.js:861, 2660`);
  - `importSave()` (`main.js:337-349`) escribe cualquier JSON que se pegue.
- **Hoy** el riesgo es bajo: es tu propio guardado, o un código de exportación que te pasa alguien. **En cooperativo**, el nombre, el chat y el inventario de otro jugador llegan a tu UI. **Con cuentas**, un script inyectado lee la sesión de Supabase de `localStorage`.
- **Arreglo (0.19, F0):**
  1. `js/sanitize.js`, puro: `esc()` único y `sanitizeHeroName` (≤ 16 caracteres; letras, dígitos, espacio y tildes).
  2. `sanitizeSave(json)` deja solo `PLAYER_SAVE_FIELDS`, limita los números y **reconstruye los objetos a partir de los ids del catálogo**, con nombres recalculados del catálogo y nunca el `name` recibido.
  3. Usarlo en `importSave`, en el saludo de red y en el intercambio.
  4. UI de multijugador (marcos y chat) solo con `textContent`.
  5. Más adelante, una CSP por `<meta>` (hoy no hay `vercel.json` ni CSP; el *importmap* inline necesita su hash).
- **Credenciales TURN** (frente de tecnología; aquí, solo dónde va en el código): `api/turn` las entrega solo a quien presente un token de sala firmado por el DO de señalización, con un `ttl` del largo de la sesión y un límite por IP. Así nadie más consume los 1000 GB.

---

## 10. Autorrefutación previa (v1, resumida)
- **R1 (netcode):**
  - B invita a trampas → cotas y ladder aparte.
  - Predecir sobre réplicas atrasadas → los umbrales (`executePct`, muerte) los decide el anfitrión.
  - Los ganchos ⑫ son síncronos → redirección del lado de la víctima.
  - El anfitrión en navegador se duerme → §7.6 (ampliado en v2).
  - Overwatch → exige ECS determinista y servidor dedicado.
- **R2 (ARPG, itemización y grupo):**
  - Vida fijada al aparecer → reescalado manteniendo la fracción.
  - Botín secuencial → `killLootRng`.
  - Economía inflada → `partyLootMult(n)` en manos del frente de itemización.
  - Stagger con más vida → `baseMaxHP` a decidir.
  - Marcas y Escarcha → decisión 0.15.
  - XP sin tope → `partyXp` con distancia y tope.
  - Efectos tapando telegrafiados → presupuesto y opacidad.

---

## 11. Preguntas para el dueño (deciden código)

1. ¿Ladder verificable (F3: A′ si pasa la prueba de determinismo, si no A o el ladder «de honor»), o ladder «entre amigos» por confianza al principio?
2. ¿Botín personal (recomendado) o compartido?
3. ¿Marcas y Escarcha por dueño o compartidas? (0.15)
4. ¿Hit-stop solo visual también en solitario? (0.2)
5. **[v2]** Si el anfitrión se oculta: ¿su héroe queda «ausente» (invulnerable e ignorado por los enemigos) o sigue expuesto como en D2/D4? ¿Pausa cooperativa a los 5 s o fin de la sesión?
6. **[v2]** Pueblo y refugio con semilla (0.16): cambian de aspecto una vez. ¿Semilla fija por versión o la que sortee el anfitrión?

---

## 12. Fuentes (URL → qué se tomó)

**Nuevas o releídas en v2**
- https://webrtc.googlesource.com/src/+/refs/heads/main/net/dcsctp/public/dcsctp_options.h → valores por defecto de dcSCTP: MTU 1191, rto_initial 500, rto_min 400, ACK diferido 200, sin intercalado, 256 KiB, búfer de 2 MB.
- https://www.rfc-editor.org/rfc/rfc9260.html → §6.7 SACK inmediato ante un hueco; §7.2.4 *fast retransmit* tras 3 avisos.
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_native_window_occlusion_tracking.md → ventana tapada = pestaña de fondo; pantalla bloqueada = todas tapadas.
- https://developer.chrome.com/blog/timer-throttling-in-chrome-88 → niveles de estrangulamiento; WebRTC = 1 por segundo; audio audible en 30 s; rAF espera a que la página se vea; no habla de Workers.
- https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout → Firefox: 1 s en pestañas inactivas; no estrangula con un `AudioContext`.
- https://developer.chrome.com/blog/freezing-on-energy-saver → Chrome 133 congela pestañas en segundo plano con mucho uso de CPU; exime `RTCPeerConnection` con un `RTCDataChannel` abierto.
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RTCDataChannel.json → transferible: Chrome 130, Firefox 144, Safari 15.
- https://w3c.github.io/webrtc-pc/ → `[[IsTransferable]]` a `false` en la tarea siguiente a la creación o tras `send()`.
- https://w3c.github.io/webrtc-extensions/ → `RTCDataChannel` expuesto a Workers (Chromium: solo Dedicated, según el issue de 2024).
- https://gafferongames.com/post/state_synchronization/ → acumulador de prioridad; lo que no cabe va primero en el siguiente paquete.
- https://gafferongames.com/post/reliable_ordered_messages/ → mensajes fiables dentro de paquetes no fiables, acuse con campo de 32 bits, reenvío como mucho cada 0,1 s.
- https://github.com/dmotz/trystero → `password` (cifra el SDP con AES-GCM), `getPeers()` devuelve `RTCPeerConnection`, `turnConfig`/`rtcConfig`, `relayConfig.redundancy`; sin opción para canales no fiables.
- https://developers.cloudflare.com/workers/platform/changelog/ → V8 actualizado por Cloudflare (p. ej. 15.3, 2026-08-28), fuera de la fecha de compatibilidad.
- https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/ → reinicios por despliegue y actualización del runtime (citado por la refutación).
- https://poewiki.net/wiki/Desync (resumen) y guías de Steam de PoE2 → lockstep con latencia baja; Auto ≈ 150 ms; PoE2 con tres modos (comunidad, **sin verificar**).
- https://zenn.dev/uhyo/articles/javascript-math-accuracy?locale=en → `**`/`Number::exponentiate` es aproximado según ECMA-262; `+ − × ÷` son exactos (IEEE 754).

**De la v1 (siguen vigentes)**
- https://codeberg.org/perplexdotgg/bounce/issues/8 → `sin/cos` difieren entre V8 11.3 y 14.9; 32 sitios; 1,10×; solo V8.
- https://esdiscuss.org/topic/es6-accuracy-of-special-functions → trigonométricas aproximadas por la implementación.
- https://gafferongames.com/post/fix_your_timestep/ y https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/ → paso fijo e interpolación alfa; lockstep al ritmo del más lento.
- https://gafferongames.com/post/floating_point_determinism/, https://factorio.com/blog/post/fff-55 → control del punto flotante; CRC por tick.
- https://developer.valvesoftware.com/wiki/Interpolation → 100 ms de interpolación.
- https://gabrielgambetta.com/client-server-game-architecture.html → servidor autoritativo contra trampas.
- https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel y https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel → `ordered`, `maxRetransmits`, `negotiated`, `bufferedAmount`.
- https://developers.cloudflare.com/durable-objects/platform/pricing/ → 100.000 peticiones al día, WebSocket a 20:1, 13.000 GB-s.
- https://forum.lastepoch.com/t/multiplayer-progress-update-july-2021/42239 y https://forum.lastepoch.com/t/official-last-epoch-multiplayer-faq/42036 → movilidad y canales; personajes en línea separados.
- D2/D3/PoE/D4/LE: diablowiki, Engadget, poedb, Maxroll, Wowhead, notas 0.9 de LE (§6.2).
- https://steamcommunity.com/app/219990/discussions/0/365163686071802740 → Grim Dawn, personaje editable.
- https://www.icy-veins.com/d4/news/has-disabling-other-players-effects-become-needed-for-diablo-4/ → atenuar los efectos ajenos.

**Código citado (lectura directa, v2):**
- `js/world.js` (6, 235-242, 607-640, 709-820, 948-967, 1252-1303)
- `js/zones.js` (22-47, 103, 200-240, 260-361)
- `js/main.js` (72, 205-213, 322-349, 440-500, 845, 931, 998-1012, 1134-1323, 1471, 1544-1580, 1604-1610, 1666-1670)
- `js/game-skills.js` (66, 750-820, 888-945, 2085-2140, 2150-2289, 2440-2462)
- `js/entities.js` (586, 744, 1005, 1349-1356, 1550-1556, 1843-1906, 2117-2159, 2290-2340, 2526, 2629, 2685-2728, 3051, 3155-3183, 3278)
- `js/timers.js` (20, 111-117), `js/save-schema.js` (4-56), `js/sfx.js` (62), `js/music.js` (33)
- `js/ui.js` (861, 1543-1551, 2660, 2881-2894), `js/ui-gauges.js` (317), `js/ui-skills.js` (69), `js/ui-talents.js` (101)
- `tests/test58-semillas.mjs` (40-63), `tests/helpers/power-harness.mjs`, `tools/smoke/baseline.json`

---

## 13. Refutación y cambios (respuesta a los dos expertos)

| # | Objeción | Veredicto | Qué cambió en este informe |
|---|---|---|---|
| 1 | Los dos informes recomiendan modelos opuestos; F3 «reutiliza» algo que no existe con B | **Aceptada** | §4 fija una sola decisión: B en la v1 y A o A′ en F3. Lista lo que tecnologia.md debe alinear. §5 F3 costea A y A′ con cifras del código (≈ 108 + 19 + 43 + 14 sitios, `WorldSim`, detmath). `p.cast` entra en F0 como 0.18, sin bloquear F1 |
| 2 | Anfitrión oculto mal dimensionado (oclusión en Windows; 6,7 %; Worker; Ahorro de energía) | **Aceptada y ampliada** | §7.6 reescrita. Tabla de velocidades: hoy es 0 % (solo rAF; el 5 % supone un `setTimeout` que no existe); 6,7 % con mi acumulador de la v1. H1 se bombea con los mensajes de red y hasta 1 s de recuperación (el tope de ~30 pasos sugerido se queda corto si los temporizadores van a 1 Hz). H2 en un Worker. H3 con pausa. **Añadí:** el canal debe transferirse en la misma tarea en que se crea (`[[IsTransferable]]`); Firefox no estrangula con un `AudioContext` y el juego tiene uno; que los Workers escapen al estrangulamiento sigue **[sin verificar]** → prototipo. Pasa a bloqueante de F1 |
| 3 | El pueblo y el refugio no son reproducibles por semilla; `hypot` entre motores | **Aceptada (verificada en el código)** | §1, §2, 0.16 y 0.17. CRC32 y bitset en la bienvenida, con los tamaños reales: el pueblo es de **36×36** y el refugio de **26×26** (el bitset de 1,8 KB es el de la zona de 120×120). **Añadí:** los POI salen del anfitrión y nunca se regeneran; `test58` contra una constante dorada |
| 4 | Sin presupuesto SCTP | **Aceptada con un matiz** | §7.4 T1–T6 con los valores de dcSCTP verificados. **Matiz:** no troceo la instantánea con secuencias propias; uso un acumulador de prioridad (Gaffer), así cada paquete es autosuficiente. **Discrepo** del tercer canal con `maxPacketLifeTime: 250`: con un RTO mínimo de 400 ms solo lo salva el *fast retransmit*, que exige tráfico continuo (RFC 9260 §7.2.4). Elijo la otra opción que ofrece la objeción, redundancia con acuse dentro del canal no fiable (Gaffer). Los eventos urgentes se rediseñaron: el ataque enemigo se manda **al empezar** y lo resuelve la víctima |
| 5 | PoE Auto contradictorio entre informes | **Aceptada** | Mi frase original (lockstep con latencia baja y predictivo por encima de ≈ 150 ms) coincide con la corrección. La marco **[sin verificar en fuente oficial]** y señalo que tecnologia.md la invierte. Ya no apoyo nada en PoE |
| 6 | Los DO se reinician y la grieta se pierde | **Aceptada; matiz de código** | §5 F3: un checkpoint «tal cual» no se puede hacer, porque el estado tiene cierres (`casting.run`, ≈ 43 sitios del planificador). Quedan la regla de «no consume intento» o la restauración por re-simulación determinista (que no cabe en los 10 ms gratis) |
| 7 | Latencia del DO en el ladder | **Aceptada** | A′ (verificación en sombra) costeada en §5 F3. Detmath es **obligatorio**, porque Cloudflare cambia V8 por su cuenta. Coste estimado por intento y puerta de decisión con una prueba dorada entre motores en CI |
| 8 | 30 Hz frente a 60 Hz; la interpolación no es trivial | **Aceptada en parte** | 60 Hz y no 30; reconozco que pos = malla complica la interpolación. **Discrepo** de meter el paso fijo en F0: en B no hace falta (nadie reconcilia al héroe propio y las réplicas se interpolan por marca de tiempo). Pasa a F3, con dos técnicas de interpolación a medir. F0 solo agrega la recuperación por subpasos del anfitrión |
| 9 | El determinismo presentado como casi imposible | **Aceptada** | §2 reordenada: ritmo, unirse tarde (cierres), hit-stop y pausa, y al final el determinismo costeable. Lint concreto (lista de funciones, `**`, `Math.random`, reloj de pared) y recuento actualizado: **235 + 15 `**`**; la v1 decía 206 porque no contaba `skills-*.js`. La simulación no usa métodos trigonométricos de THREE |
| 10 | Señalización: Supabase se pausa; Trystero sin SLA | **Aceptada** (decide tecnología) | `transport.js` crea sus propios canales `negotiated` con ids altos sobre la `RTCPeerConnection` (`getPeers()`), así no depende del proveedor y se pueden transferir a un Worker |
| 11 | Seguridad: XSS y endpoint TURN abierto | **Aceptada y verificada** | §9.1 nueva: `heroName` sin escapar en `ui.js:2894`, 119 `innerHTML`, `importSave` sin validar, `validateItem()` inexistente. Arreglo 0.19 en F0. TURN con token de sala |

**Lo que NO cambió tras la refutación:** descartar el lockstep en el cooperativo; B en la v1; el botín personal sembrado por muerte; la Fase 0 primero y sin red; el escalado por `buffByPact`.

**Nota de método (v2):** sí tuve presupuesto de búsqueda web. Leí las fuentes primarias de dcSCTP, RFC 9260, Chromium, Chrome, MDN, BCD, webrtc-pc, Trystero y el changelog de Workers. No pude confirmar en una fuente oficial: el umbral de PoE, si los Workers escapan al estrangulamiento, los valores por defecto de usrsctp en Firefox y si los eventos `onmessage` llegan sin retraso con la página oculta. Todo eso queda para el prototipo de §7.6.
