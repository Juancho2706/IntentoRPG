# Investigación · Tecnología del cooperativo de 2 a 4 en navegador (Paso 6)

**Frente:** tecnología. **Fecha:** 22 de octubre de 2026. **Versión 2:** corregida tras la primera refutación (experto en netcode en navegador y experto en backend/infra). Al final está la sección «Refutación y cambios».
**Alcance:** modelo de red, transporte y su presupuesto, señalización y NAT, hosting gratis o casi gratis, anfitrión en segundo plano, mapa compartido, seguridad, anti-trampa (amigos frente a ladder), latencia, reconexión, cuentas y nube, y validación de la propuesta previa del dueño (F0–F3).
**Regla de carga respetada:** solo lectura del repo e investigación web. No se corrió nada pesado.

> **Nota de método.** El presupuesto de búsquedas web de la sesión se agotó otra vez en esta ronda. Lo nuevo lo verifiqué leyendo páginas oficiales y código fuente (WebFetch) y el repo. Lo que no pude confirmar queda marcado **[sin verificar]**. Las deducciones mías van marcadas **[deducción]**.

> **Decisión unificada con `codigo.md`.** Este informe y `codigo.md` recomiendan ahora **el mismo modelo para la v1: autoridad repartida (modelo B)**. La tabla de fases (§11) es la misma que debe usar el diseño. Donde `codigo.md` dice otra cosa (paso fijo de la Fase 0, mapa por semilla, señalización por Trystero), manda lo que dice este informe en §2.3, §6 y §5, y el diseño final debe corregir `codigo.md` en consecuencia.

---

## 0. Veredicto (para leer en 1 minuto)

1. **Modelo de la v1: autoridad repartida (B).** Cada cliente es **dueño de su héroe**: lo simula con el código actual, con 0 ms en sus habilidades y en la carga perfecta, y resuelve el daño que recibe. El **anfitrión es dueño del mundo**: enemigos, IA, apariciones, muertes, cofres y viajes. **Nada de lockstep.** El mundo viaja como **instantáneas a 20 Hz** con **~100 ms de interpolación**. El modelo A (un anfitrión que simula los 4 héroes) queda para un futuro co-op público o un ladder de grupo (F4) y **no** se reutiliza gratis: cuesta mover el estado de lanzamiento de `Game` al héroe (unos 130 sitios), quitar las 13 guardas `g.player !== p` y predecir habilidades.
2. **Paso de simulación en la v1: semifijo**, con subpasos de como mucho 1/60 s y una función `advanceTo(ahora, tope)` que sirve para ponerse al día. No exige separar la posición de simulación de la malla. El **paso fijo de 60 Hz con render interpolado** (`simPos`/`prevPos` separados de `group.position`) es deuda de F3, porque solo el ladder verificable lo necesita.
3. **Transporte:** WebRTC DataChannel **en estrella**, con **tres canales**: `st` no fiable (instantáneas y estado del héroe), `rt` no fiable con **redundancia y acuse en la aplicación** (golpes, daño recibido, muertes y lanzamientos: lo urgente) y `ev` fiable y ordenado (unión, chat, cambio de zona, nivel). **Presupuesto de SCTP:** como mucho **1.100 B por mensaje no fiable**, como mucho **16 KB por mensaje fiable** (lo demás se trocea en la aplicación), y una instantánea se **descarta** si `bufferedAmount` ya tiene más de 2 en cola. La pila de Chrome usa una MTU de 1.191 B, una retransmisión mínima de 400 ms y no intercala mensajes.
4. **Señalización:** un **Worker + un Durable Object (DO) por sala** de Cloudflare, con WebSocket Hibernation. No se pausa nunca y cuesta US$0 a este volumen. El código de sala tiene **8 caracteres** y el anfitrión acepta a cada invitado. **Respaldo:** Trystero con Nostr y la opción `password`, que cifra el SDP con AES-GCM. **Supabase sale de F1** y queda solo para cuentas y nube (F2), así que su pausa por inactividad ya no tumba el co-op.
5. **TURN de Cloudflare** (1.000 GB al mes gratis y después US$0,05/GB). Las credenciales las emite **el DO de la sala, solo a sus miembros**, con TTL corto, revocación al cerrar la sala y un tope diario. No hay un endpoint abierto.
6. **Anfitrión en segundo plano: bloqueante de F1.** En Windows, Chrome trata como de fondo una ventana **tapada** por otra (basta un alt-tab a Discord o a un juego a pantalla completa) y también la pantalla bloqueada. Con el bucle actual el mundo correría al **5 %** de su velocidad. Solución por capas: (a) el anfitrión avanza la simulación **con cada mensaje de red** que llega de los invitados, ponderado por `performance.now()`; (b) audio (en Firefox basta con que exista un `AudioContext`); (c) más adelante, la simulación en un **Worker** con los DataChannels **transferidos** (Chrome 130, Firefox 144, Safari 15); (d) si nada alcanza, pausa cooperativa con el aviso «el anfitrión está ausente».
7. **Mapa compartido:** el pueblo y el refugio colocan árboles y cristales con `Math.random` y **bloquean esas celdas** (`world.js:778-783, 1284-1288`), así que la rejilla de colisión es distinta en cada máquina. Se arregla en F0 con semillas. En el saludo viajan **la semilla y un CRC32 de la rejilla**; si no coincide, el anfitrión manda la rejilla como bitset (120×120 = 1,8 KB).
8. **Ladder verificable (F3): verificación en sombra en un DO.** El jugador juega en local con 0 ms y manda sus entradas en vivo; el DO corre la misma simulación con matemática determinista y su resultado es el oficial. El **reloj del servidor** detecta la cámara lenta, que es la herramienta de un TAS. Requiere determinismo **solo en la simulación del ladder**: `detmath` + una prueba de lint, paso fijo, sin DOM y entradas registradas. El ladder **individual** cabe en el plan gratis (~28 salas-hora al día). El ladder **de grupo** exige el modelo A (F4).
9. **Seguridad (faltaba):** los datos de otros jugadores (`heroName`, `item.name`, `item.icon`) terminan en `innerHTML` (119 usos en `ui.js`) y el sitio no tiene CSP: un héroe manipulado ejecuta código en el navegador del anfitrión. Además, `Object.assign(this, saved)` (`entities.js:524`) deja pasar un `__proto__` hostil. Hace falta un **saneado del héroe remoto**, una **CSP** y límites de tamaño y de ritmo por par.
10. **Cuentas (F2):** Supabase Auth anónimo y después vinculado. Héroes **abiertos** separados de los **de temporada**, como el Battle.net abierto y los reinos cerrados de Diablo II. Desde el **30-oct-2026** las tablas nuevas necesitan `GRANT` explícito, y un proyecto gratis **se pausa tras 7 días sin actividad**.

---

## 1. Punto de partida en el código (lo que condiciona la red)

| Hallazgo | Dónde | Consecuencia para el multijugador |
|---|---|---|
| El bucle va por `setAnimationLoop` (rAF) | `js/main.js:212` | rAF no corre si la página está oculta («`requestAnimationFrame` will wait for the page to be visible»). En Windows, Chrome trata igual una ventana **tapada** o la pantalla bloqueada: detiene la pintura y limita los temporizadores (§8.1). |
| `dt` variable con tope de 50 ms | `js/main.js:1545` | Si el anfitrión queda limitado a 1 tick por segundo, el mundo corre al 5 %. Hace falta una función para ponerse al día con subpasos. |
| Pausa al abrir un panel | `js/main.js:1552-1564` | En co-op no se puede pausar el mundo. La pausa queda solo para el modo solitario. |
| El hit-stop escala el `dt` de la simulación ×0,02 | `js/main.js:1569-1574` | Debe ser solo de presentación y local. |
| **La posición ES la malla** | `get pos() { return this.group.position; }` en `js/entities.js:744, 1906, 3278` | Un paso fijo con render interpolado obliga a separar `simPos`/`prevPos` de `group.position` en `Player`, `Enemy` y `Pet`. Es un refactor real: por eso la v1 usa paso semifijo (§2.3). |
| **Estado de lanzamiento en `Game`, no en el héroe** | `js/game-skills.js` (`_channel`, `_charging`, `_windup`, `_needsRelease`…; ~130 sitios según `codigo.md` §3.1) | Con el modelo B no importa: cada cliente simula solo su héroe. Con el modelo A (4 héroes en una máquina) hay que moverlo a `p.cast`. |
| Reloj de pared en la carga, con gancho | `js/game-skills.js:66` (`wallNow` usa `g.clockNow()` si existe), `2150, 2173, 2286` | Bien: para el ladder basta inyectar `g.clockNow` con el reloj de la simulación. |
| **Pueblo y refugio con `Math.random` en la rejilla** | `js/world.js:6` (`ri` = `Math.random`), `:778-783` (14 árboles con `grid.cells[z][x] = 0`), `:1284-1288` (10 cristales); `js/main.js:472-473` los construye sin semilla | La colisión del pueblo y del refugio cambia en cada máquina (§6). |
| Colocación con `Math.hypot` | `js/zones.js:217` (`cellDistToSpawn`) | `hypot` es aproximada por la implementación: entre motores un empate en el umbral puede resolverse distinto. Arreglo: comparar distancias **al cuadrado** con enteros, que es exacto. |
| La amenaza ya admite varias fuentes | `js/entities.js:2117-2150` | Bien. Falta la adquisición inicial por el héroe más cercano (`codigo.md` 0.10). |
| Primitivas de grupo | `js/game-skills.js:888-893` (`allies`), `:928` (`damageAlly`) | `RemoteHero` implementa ese contrato (`codigo.md` §5). |
| `Player`/`Enemy` corren sin navegador en Node | `tests/helpers/power-harness.mjs:41-47`, `tests/helpers/bench-core.mjs:29-40` | Una simulación sin DOM es factible. `Game` (`main.js`) todavía no lo es. |
| **Datos de otros jugadores en `innerHTML`** | `js/ui.js:2894` (`${p.heroName}`), `:2670, 2723, 2812, 3071` (`${item.icon} ${item.name}`); 119 `innerHTML` en `ui.js`; sin `vercel.json` ni CSP; 4 manejadores en línea (`onclick=`) en `ui.js` | Un héroe o un objeto manipulado inyecta HTML y script en la página de los demás (§9). |
| Carga del guardado con `Object.assign` | `js/entities.js:524` (`Object.assign(this, saved, …)`) | Un `"__proto__"` propio que venga de `JSON.parse` cambia el prototipo del héroe (§9). |
| Lo que se guarda, en una sola lista | `js/save-schema.js:39-58` (`PLAYER_SAVE_FIELDS`, `SAVE_VERSION = 5`) | Sirve como lista blanca para el héroe remoto y para la nube. |
| Costo de la simulación hoy | `tools/smoke/baseline.json` (citado en `codigo.md` §7): 0,064–0,077 ms por tick con 1 héroe y 30 enemigos | Un anfitrión que simula el mundo y su héroe cabe de sobra. |
| Tamaño de un guardado | `tests/fixtures/saves-v4-paso2.json`: de 2,7 a 10,8 KB (mediana 8,2 KB) | Viaja una vez al unirse, por el canal fiable y troceado si pasa de 16 KB. |
| Audio | `js/sfx.js:62` y `js/music.js:33` crean un `AudioContext` | En Firefox, una pestaña con `AudioContext` no se limita (§8.1). |

---

## 2. Modelo de red

### 2.1 Qué hacen los ARPG

- **Path of Exile** tiene los modos «Predictive» y «Lockstep». Su «lockstep» **no** es el lockstep determinista entre pares: el cliente **espera la confirmación del servidor** antes de mostrar la acción. En los dos modos el servidor es la autoridad. **Corrección:** según la wiki y los jugadores, el lockstep es el modo **para conexiones de latencia baja y estable**, y el modo «Auto» pasa a **predictivo cuando la latencia sube** (umbral ≈ 150 ms según una nota al pie de la wiki que no pude leer). No hay nota oficial de GGG que lo confirme: el artículo de Chris Wilson de 2014 solo dice que «we now support both models simultaneously», sin un modo automático ni un umbral (https://www.pathofexile.com/forum/view-thread/889669). **[sin verificar en una fuente oficial]**. Quito la afirmación de que «PoE2 solo tiene lockstep»: venía de un jugador, sin respuesta del personal.
- **Last Epoch** (blog de desarrollo, 20-jul-2021): «Your spells work online, and are fully server authoritative», «Player positions are mostly authoritative» y «you can get up to 200 ping before having a questionable experience». Las habilidades de movimiento, los canales y las misiones exigieron trabajo aparte (https://forum.lastepoch.com/t/multiplayer-progress-update-july-2021/42239). **Es la referencia de jugabilidad a 92–136 ms**, no PoE.
- **Grim Dawn:** P2P con un jugador como anfitrión; los personajes viven en el cliente y se editan. «Juega con gente de confianza» (https://steamcommunity.com/app/219990/discussions/0/365163686071802740).
- **Diablo II:** personajes **abiertos** en el disco, editables y sin acceso a los reinos, frente a personajes **cerrados** en los servidores; un abierto nunca pasa a cerrado (https://diablo2.diablowiki.net/B.net). Es el precedente de «abierto contra temporada».
- **Valheim** da a un cliente la simulación de una zona: es el patrón de autoridad repartida (citado en `codigo.md` §4).

### 2.2 Por qué no lockstep en el co-op

El orden de las razones importa: el determinismo **se puede conseguir** (§7.2), pero en el co-op no compensa.

1. **El lockstep juega al ritmo del más lento.** Ningún turno avanza sin las entradas de todos, así que la latencia efectiva es la del peor jugador, y además se nota en tus propias habilidades (https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/).
2. **Unirse a mitad y reconectarse exigen un estado completo** de todas formas, y una desincronización mínima «snowballs» hasta romper la partida, como en Factorio, que necesita un CRC por tick (https://gafferongames.com/post/deterministic_lockstep/; Factorio FFF #55 en `codigo.md`).
3. **El determinismo cuesta:** hay unas 206–217 llamadas a `sin/cos/atan2/pow…` en módulos de simulación, más la trigonometría interna de Three.js, y `Math.sin` da bits distintos incluso entre dos versiones de V8 (bounce#8, ver §7.2). Arreglarlo es posible y está costeado en §7.2, pero el co-op no lo necesita.
4. **Lo que ahorra es ancho de banda, y no es nuestro cuello de botella:** unos 20 KB/s por invitado (§4.1).

### 2.3 Modelo B: qué hace cada máquina y parámetros

| Pieza | Valor | Fundamento |
|---|---|---|
| **Autoridad** | Héroe → su dueño. Mundo (enemigos, IA, apariciones, muertes, cofres, viaje) → anfitrión. | Decisión unificada con `codigo.md` §4: menos refactor, 0 ms en lo propio y aguanta las trampas entre amigos. |
| **Paso de simulación (v1)** | **Semifijo:** `advanceTo(t, tope)` avanza en subpasos de como mucho 1/60 s hasta alcanzar `t`. Con la ventana visible: un subpaso por fotograma en 60–144 Hz (dt = fotograma). Para ponerse al día: tope de **30 subpasos** por llamada, solo en el anfitrión. | «Semi-fixed timestep» de Gaffer (https://gafferongames.com/post/fix_your_timestep/): evita el tirón de 144 Hz sin interpolar y no exige separar la posición de la malla. El humo ya mide con dt de 1/60, así que el banco sigue siendo comparable. |
| **Paso fijo + render interpolado** | **F3**, solo cuando haga falta la verificación del ladder | Exige `simPos`/`prevPos` separados de `group.position` (`entities.js:744, 1906, 3278`) e interpolación alfa en `present()`. A 60 Hz las ventanas de carga perfecta (0,20–0,30 s) se cuantizan a 16,7 ms (±6–8 %); a 30 Hz serían ±15 %, así que **nunca 30 Hz**. |
| **Instantáneas del mundo** | 20 Hz, binarias (`DataView`), solo el área de interés (~30–40 m alrededor de cada héroe); cada registro lleva el tick y es autosuficiente | Gaffer: con 2–5 % de pérdida conviene un búfer de ~3 intervalos (https://gafferongames.com/post/snapshot_interpolation/). |
| **Estado del héroe propio** | El dueño lo manda a 20 Hz (posición, giro, animación, vida %, banderas visibles, como «vínculo listo» del Guardián) | El anfitrión lo reenvía a los demás en su instantánea (estrella). |
| **Interpolación** | 100 ms base, que sube hasta 150 ms si hay pérdida | Gambetta (https://www.gabrielgambetta.com/entity-interpolation.html); Colyseus usa 100 ms por defecto (https://docs.colyseus.io/netcode/client-prediction). |
| **Urgentes (`rt`)** | Reclamaciones de golpe, DoT y control; daño recibido; muerte confirmada; lanzamiento remoto | §3.2: redundancia y acuse en la aplicación. |
| **Fiables (`ev`)** | Saludo, héroe al unirse, chat, cambio de zona, nivel, eventos de la grieta, rejilla de respaldo | Lo que puede esperar 400 ms. |
| **Reloj** | Tick del anfitrión más un RTT medido con ping cada 1 s | Para el indicador del HUD y para ordenar las reclamaciones. |

### 2.4 Qué se predice y qué no (modelo B)

| Cosa | En el cliente | En el anfitrión |
|---|---|---|
| **Héroe propio** (movimiento, habilidades, carga, recurso, enfriamientos) | **Autoritativo en local, con 0 ms.** No hay reconciliación. | Recibe su estado y lo reenvía. Aplica cotas de plausibilidad (§7.1). |
| Golpe propio sobre un enemigo | Número de daño y reacción **predichos** sobre la réplica | Aplica la reclamación sin recalcular; decide las condiciones de umbral (ejecutar, muerte). |
| Muerte de un enemigo | Se muestra **solo** cuando llega `kill` del anfitrión (medio RTT + búfer) | Arbitra por orden de llegada. |
| Botín | **Personal**, tirado en cada cliente con `killLootRng(semilla, heroId, netId)`: no viaja por la red | Solo anuncia la muerte. |
| Golpe cuerpo a cuerpo enemigo | Lo aplica el dueño con `Player.takeDamage` (esquiva, bloqueo, escudos) | Lo decide contra `combatTarget` y lo manda por `rt`. |
| Proyectiles y áreas telegrafiadas enemigas | Se replican como **entidades con trayectoria determinista**; cada cliente comprueba solo su héroe | Las lanza. **Exige la misma rejilla en todos** (§6). |
| Enemigos y otros héroes | Interpolados ~100 ms en el pasado | — |
| Hit-stop, sacudida, números flotantes | Locales, solo de presentación | Nunca tocan el `dt` del mundo. |
| Barras de mecánica | Las del héroe propio son exactas (las calcula su dueño) | — |

---

## 3. Transporte en el navegador (octubre de 2026)

### 3.1 Comparativa

| | WebRTC DataChannel | WebSocket | WebTransport (HTTP/3) |
|---|---|---|---|
| Soporte | Chrome, Firefox y Safari. **Transferible a un Worker:** Chrome 130, Firefox 144, Safari 15 (https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RTCDataChannel.json) | Universal | Baseline desde marzo de 2026 con Safari 26.4 (https://webrtc.ventures/2026/04/webtransport-is-now-baseline-what-it-means-for-real-time-media/) |
| No fiable o desordenado | Sí: `ordered:false` y `maxRetransmits` **o** `maxPacketLifeTime` (combinarlos lanza `SyntaxError`) (https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/createDataChannel) | No: TCP con bloqueo de cabeza de línea | Sí (datagramas) |
| Necesita servidor de juego | No (P2P). Sí necesita señalización y TURN. | Sí | Sí, un servidor QUIC propio |
| Uso propuesto | **Co-op (F1)** | **Señalización (F1) y verificador del ladder (F3)**, en un DO | Más adelante, si un servidor lo justifica |

Cloudflare Realtime SFU también reenvía DataChannels (https://developers.cloudflare.com/realtime/sfu/datachannels/), pero solo un suscriptor responde al publicador. Queda como plan B si falla mucho el NAT. geckos.io queda descartado: exige abrir los puertos UDP 1025–65535 en un servidor propio.

### 3.2 Presupuesto de SCTP (nuevo)

Los DataChannels van sobre SCTP. La pila de Chrome (dcSCTP) usa por defecto (https://webrtc.googlesource.com/src/+/refs/heads/main/net/dcsctp/public/dcsctp_options.h, leído):

| Opción | Valor | Qué implica |
|---|---|---|
| `mtu` | **1.191 B** (IPv6 mínimo de 1.280 menos IPv6, UDP, GCM, DTLS y ChannelData de TURN) | Restando la cabecera común de SCTP (12 B) y la del fragmento DATA (16 B) quedan **~1.160 B de carga útil** por paquete [deducción]. Un mensaje más grande **se fragmenta**, y con `maxRetransmits:0` perder un solo fragmento pierde el mensaje entero. |
| `rto_initial` / `rto_min` | 500 ms / **400 ms** | En el canal fiable, un paquete perdido **sin tráfico detrás** tarda al menos 400 ms en reenviarse. Con tráfico continuo (las instantáneas comparten la asociación) puede actuar la retransmisión rápida de RFC 9260 antes que el temporizador **[deducción; medir con chrome://webrtc-internals]**. |
| `delayed_ack_max_timeout` | 200 ms | Los acuses pueden retrasarse. |
| `enable_message_interleaving` | **false** | Un mensaje grande sale de corrido y **retrasa a los demás canales** de la misma asociación. |
| `max_message_size` | 256 KiB | Es el máximo, no lo recomendable. |
| `max_send_buffer_size` | 2.000.000 B | Hay mucho espacio para encolar latencia sin darse cuenta. |

**Reglas que adopto:**

1. **Como mucho 1.100 B por mensaje no fiable.** Una instantánea que se pase se **parte por grupos de entidades**, y cada parte se puede aplicar sola (cada registro lleva su tick y gana el más nuevo). Perder una parte solo atrasa ese grupo.
2. **Como mucho 16 KB por mensaje fiable**; lo más grande (héroe al unirse, de 3 a 11 KB hoy; mundo completo al reconectar) se **trocea en la aplicación** y se rearma.
3. **Canal `rt` para lo urgente:** no fiable, con **secuencia, acuse y redundancia** en la aplicación. Cada paquete repite los mensajes urgentes sin acuse de los últimos ~300 ms; el otro extremo acusa la secuencia más alta contigua en su siguiente paquete (que sale a 20 Hz igual). Si algo pasa 300 ms sin acuse, se reenvía por `ev`, que lo garantiza. El receptor descarta duplicados por secuencia. Así una pérdida se recupera en un intervalo (~50 ms) y no en 400 ms (patrón de Gaffer, https://gafferongames.com/post/reliable_ordered_messages/).
4. **Control de cola:** antes de enviar una instantánea se mira `bufferedAmount` de `st`; si supera ~2 instantáneas, **se descarta** en vez de encolarla, porque una instantánea vieja no vale nada. `bufferedAmountLowThreshold` y el evento `bufferedamountlow` (https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel) regulan los envíos fiables grandes.
5. **Diagnóstico:** `chrome://webrtc-internals` y `RTCPeerConnection.getStats()` (RTT, candidato elegido, bytes) en el panel de depuración del lobby.

---

## 4. Presupuesto de red (cuentas)

### 4.1 Ancho de banda del modelo B (estimación, para medir en el prototipo)

- **Registro de enemigo** cuantizado: id 2 B, x/z 4 B, giro 1 B, vida 2 B, estado 2 B ≈ **11 B**. **Héroe** ≈ 16–24 B.
- **Instantánea típica:** 60 enemigos en el área de interés (lo que coloca `buildZone`) + 4 héroes + cabecera ≈ **0,75 KB**, dentro de un paquete. **Caso malo:** una mazmorra densa con 100 enemigos cerca ≈ 1,2 KB, así que se parte en 2 (§3.2).
- **Bajada por invitado:** 15 KB/s de instantáneas + 2–5 KB/s de urgentes y eventos + ~1,4 KB/s de cabeceras ≈ **20 KB/s (~0,16 Mbps)**.
- **Subida del anfitrión con 3 invitados: ~60 KB/s (~0,5 Mbps).** Es poco para fibra, pero justo para un ADSL con 0,5–1 Mbps de subida: Last Epoch atribuye parte de sus congelamientos a la subida de las conexiones hogareñas asimétricas (https://forum.lastepoch.com/t/network-lag-issues-megathread/55099). Por eso conviene un ajuste de 15 Hz y mostrar la calidad del anfitrión en el lobby.
- **Subida de cada invitado:** estado del héroe (~1,2 KB/s) + reclamaciones (1–3 KB/s) ≈ **4 KB/s**.
- **JSON en vez de binario:** de 3 a 5 veces más. Binario para `st` y `rt`; JSON solo en `ev`.

### 4.2 Latencia medida desde Santiago

Fuente: https://wondernetwork.com/pings/Santiago (promedios).

| Destino | ms | Lectura |
|---|---|---|
| Buenos Aires | 21 | Excelente para P2P |
| Lima | 30 | Excelente |
| São Paulo | 46 | Bien |
| Bogotá | 68 | Bien |
| Miami | 92 | Con el modelo B, solo se nota en las reacciones del mundo |
| Nueva York | 120 | Igual |
| Washington / este de EE. UU. (donde nace un DO pedido desde Sudamérica) | 136 | Igual |
| Ciudad de México | 175 | Cooperativo PvE aceptable (Last Epoch: «hasta 200») |
| Madrid / Fráncfort | 210 | Solo co-op relajado |

### 4.3 Qué latencia es aceptable con el modelo B

- **Lo propio (movimiento, habilidades, carga perfecta, esquivar proyectiles): 0 ms siempre**, porque lo resuelve su dueño.
- **Lo del mundo** (un enemigo que reacciona, una muerte confirmada, un aliado que se mueve): medio RTT + ~100 ms de búfer. Hasta ~150 ms de RTT se siente bien; hasta 200 ms es aceptable en PvE (cifra de Last Epoch). Más de 200 ms: aviso en el lobby.
- **El ladder verificable no paga latencia** porque se juega en local (§7.3).

---

## 5. Señalización, STUN y TURN

### 5.1 Señalización: Worker + DO de Cloudflare como principal

| Opción | Papel | Por qué |
|---|---|---|
| **Worker + un DO por sala, con WebSocket Hibernation** | **Principal (F1)** | No se pausa nunca. «Billable Duration (GB-s) charges do not accrue during hibernation» y los ping/pong no despiertan al objeto (https://developers.cloudflare.com/durable-objects/best-practices/websockets/). Los mensajes WebSocket entrantes cuentan 20:1 (https://developers.cloudflare.com/durable-objects/platform/pricing/). Una sala gasta unas decenas de mensajes, así que el plan gratis da para miles de salas al día. **La misma pieza** emite las credenciales TURN (§5.2) y será el verificador del ladder (F3). |
| **Trystero con Nostr y `password`** | **Respaldo** | La opción `password` cifra el SDP con AES-GCM al pasar por los relés públicos; sin ella, la clave se deriva del id de la app y de la sala, «which a relay operator could reverse-engineer». `getPeers()` devuelve las `RTCPeerConnection`, así que se pueden añadir `st` y `rt` con `negotiated:true` y un id fijo, sin renegociar. Acepta `rtcConfig.iceServers` para usar el STUN y el TURN de Cloudflare (https://github.com/dmotz/trystero, leído). El README no da número de versión: hay que fijar la versión exacta de npm al implementar. |
| Supabase Realtime | **Fuera de F1** | Se pausa tras 7 días sin uso y la restauración es manual (https://supabase.com/pricing). Los canales privados con RLS exigen usuarios autenticados, o sea Auth ya en F1. Además no sirve como relé: el plan gratis admite 100 msg/s y una sala de 4 genera ~440 mensajes contados por segundo (Broadcast cuenta 1 por el envío + 1 por cada receptor). |
| PeerJS Cloud | Descartado | Sin SLA; su propia página recomienda alojar tu servidor (https://peerjs.com/peerserver). |

**Flujo de la sala (F1):**
1. El anfitrión crea la sala: el Worker genera un **código de 8 caracteres** en base32 de Crockford (40 bits, sin letras ambiguas) y un DO con ese nombre. Opcional: Turnstile al crear.
2. Un invitado entra con el código. El DO limita los intentos por IP y avisa al anfitrión: **«Juan quiere unirse · Aceptar / Rechazar»**.
3. Si el anfitrión acepta, el DO reenvía oferta, respuesta y candidatos ICE, y entrega a ambos credenciales TURN (§5.2).
4. Con los DataChannels abiertos, el DO solo queda para reconectar (mientras el anfitrión siga conectado) e hiberna.

**Por qué no un DO en EE. UU. para la señalización desde Chile:** solo se usa unos segundos al armar la sala; los ~136 ms suman como mucho 1 s al tiempo de conexión. El juego va P2P.

### 5.2 NAT y TURN

- **Cuántas sesiones necesitan relé:** el único dato medido que encontré es de Hancke (2017), «up to 17.7%», con tendencia al alza por CGNAT y firewalls, y ~0,5 % que solo funciona con TURN por TLS en el 443 (https://openvidu.io/blog/2026/06/09/turn-key-considerations/). El rango del 10 al 25 % es **[estimación]**: lo mediremos con el tipo de candidato elegido (`host/srflx/relay`) en las métricas del lobby.
- **Cloudflare TURN:** US$0,05/GB, los primeros 1.000 GB al mes gratis compartidos con la SFU, STUN gratis, anycast, UDP 3478/443, TCP 3478/80 y TLS 5349/443 (https://developers.cloudflare.com/realtime/turn/, https://developers.cloudflare.com/realtime/sfu/pricing).
  - Un invitado con relé gasta ~24 KB/s ≈ **85 MB por hora**, así que 1.000 GB ≈ **11.700 horas-invitado con relé al mes**.
- **Credenciales sin endpoint abierto (corrección de seguridad).** Las genera solo el backend con `POST …/credentials/generate-ice-servers` y un `ttl`; hay un endpoint de **revocación** (`…/credentials/$USERNAME/revoke`) (https://developers.cloudflare.com/realtime/turn/generate-credentials/). La doc no dice qué pasa con una asignación activa al revocar ni trae límites de abuso **[sin verificar]**. Reglas:
  1. Solo el **DO de la sala** pide credenciales, y solo para pares **aceptados por el anfitrión**. No existe `api/turn` público.
  2. **TTL corto** (2 h), con renovación por el mismo DO si la sesión sigue viva.
  3. **Revocar** al cerrar la sala o al expulsar a alguien.
  4. **Tope diario** de credenciales emitidas (por ejemplo, 300), guardado en un DO contador, y un Cron Trigger que lea el consumo y **deje de emitir** si el mes pasa de ~800 GB. **[sin verificar: API de consumo de TURN]**
- **Respaldo:** Metered Open Relay, 20 GB al mes gratis (https://www.metered.ca/tools/openrelay/).
- **Privacidad:** los candidatos ICE exponen la IP pública. Con amigos no importa; con desconocidos, `iceTransportPolicy: 'relay'`. **[decisión de diseño]**

---

## 6. Mapa compartido (nuevo)

**Problema.** El modelo B necesita la **misma rejilla de colisión** en todas las máquinas: cada dueño mueve su héroe contra su rejilla y comprueba los proyectiles enemigos contra su héroe. Hoy la mazmorra y la zona son reproducibles por semilla (`test58`), pero el pueblo y el refugio no: `buildTown()` coloca 14 árboles y `buildRefuge()` 10 cristales con `Math.random`, y bloquea esas celdas (`world.js:778-783, 1284-1288`). Un héroe remoto atravesaría árboles o se trabaría.

**Arreglo (F0):**
1. `buildTown(seed)` y `buildRefuge(seed)` usan `mulberry32(seed)` (o el stream `layout`), como la mazmorra y la zona. Lo cosmético (decals, color de las copas) puede seguir con `Math.random`.
2. En `zones.js:217`, comparar **distancias al cuadrado** con enteros (`dx*dx + dz*dz >= minDist*minDist`), que es exacto en cualquier motor, en vez de `Math.hypot`, que el estándar deja aproximada por la implementación (https://esdiscuss.org/topic/es6-accuracy-of-special-functions).
3. **Saludo:** el anfitrión manda `{ versión de sw.js, hash del catálogo, tipo de mundo, semilla, CRC32 de la rejilla }`. Si el CRC del invitado no coincide, el anfitrión manda la **rejilla como bitset** (zona de 120×120 = 1.800 B; pueblo de 36×36 = 162 B) por `ev`, y el invitado la usa en lugar de la suya.
4. **Prueba:** ampliar `test58` al pueblo y al refugio, comparando el hash de la rejilla con una **constante** guardada.

---

## 7. Anti-trampa: co-op entre amigos y ladder

### 7.1 Co-op entre amigos (modelo B, «personaje abierto»)

- **Cada uno manda en su héroe**, así que puede mentir sobre su daño o ignorar el que recibe. Entre amigos se acepta, como en Grim Dawn y en el Battle.net abierto.
- **Medidas baratas en el anfitrión:**
  1. Reconstruye el héroe del invitado desde su guardado **saneado** (§9) y calcula sus estadísticas con el mismo `recompute()`.
  2. `validateItem()` contra los rangos de afijos de `items.js`.
  3. **Cota de plausibilidad por reclamación:** golpe máximo = stats publicados × coeficiente máximo × Π[×] máximo × crítico. Más un tope de reclamaciones por segundo.
  4. Velocidad de movimiento máxima sobre el estado de 20 Hz.
- **El código del juego es público:** nada de firmas con una clave escondida en el cliente.

### 7.2 Determinismo: posible, pero con costo (sección reescrita)

**Corrección.** En la v1 presenté el determinismo como casi imposible. El caso que cité dice lo contrario: el autor de bounce cambió **32 llamadas** a `sin/cos/atan` por núcleos estilo fdlibm hechos solo con operaciones exactas, a **1,10×** el costo, y los hashes coincidieron entre Node 20.19 (V8 11.3) y Chrome 149 (V8 14.9) (https://codeberg.org/perplexdotgg/bounce/issues/8). **Límite:** solo lo probó entre versiones de V8, nunca en SpiderMonkey (Firefox) ni en JavaScriptCore (Safari).

**Por qué funciona entre motores [deducción]:** `+ − × ÷` sobre `double` son exactas en IEEE 754 con redondeo al más cercano, y JavaScript no fusiona multiplicaciones y sumas por su cuenta. Un núcleo que use solo esas operaciones (y `Math.sqrt`, que el hardware redondea correctamente y que en bounce#8 coincidió) da los mismos bits en cualquier motor. Hay que **probarlo** en Firefox y Safari.

**Qué exige, costeado:**

| Pieza | Costo |
|---|---|
| `js/sim/detmath.js`: `dsin`, `dcos`, `datan2`, `dexp`, `dpow`, `dhypot` | Pequeño (núcleos fdlibm conocidos) |
| Reemplazar ~206–217 llamadas en los módulos de simulación | Medio y mecánico |
| **Prueba de lint** que prohíba `Math.(sin|cos|tan|atan|atan2|exp|pow|hypot|log…)` y los métodos trigonométricos de THREE (`applyAxisAngle`, `setFromAxisAngle`, `setFromEuler`…) en los módulos de simulación, como `test67` prohíbe `powers.has(` | Pequeño. **Así el «olvido» no llega al repo.** |
| Paso fijo (F3), azar de combate e IA con streams, entradas registradas (lo que la simulación lee de `g.input`) e inyectar `g.clockNow` (`game-skills.js:66`) | Medio (gran parte ya está en la Fase 0 de `codigo.md`) |
| Simulación sin DOM (`Game` sin `window`/`document`) para correr en el DO | Grande |
| Prueba de repetición: una grabación fija debe dar el mismo CRC en Node, Chrome, Firefox y Safari | Pequeño, pero imprescindible |

**Por qué la «re-simulación del top 100 después de la partida» sigue sin bastar** (en el orden correcto):
1. **Un archivo de entradas no prueba que jugó un humano.** Un TAS se hace en cámara lenta y rebobinando (https://en.wikipedia.org/wiki/Tool-assisted_speedrun), y el archivo resultante pasa cualquier re-simulación. **Solo un reloj del servidor que reciba las entradas en vivo** detecta la cámara lenta (§7.3).
2. **El héroe se puede falsificar** si progresa en el cliente (el caso de D2 abierto). Se resuelve con una build fija (grieta de desafío) o con héroes de temporada en el servidor.
3. **El costo no cabe en una Edge Function:** 10 minutos a 60 Hz son 36.000 ticks; a ~0,1 ms son ~3,6 s de CPU, frente a los **2 s** de una Edge Function de Supabase (https://supabase.com/docs/guides/functions/limits).

### 7.3 Opciones de ladder (de la más barata a la más robusta)

| Opción | Cómo funciona | Qué protege | Costo |
|---|---|---|---|
| **C · Ladder «de honor»** (F2) | El servidor emite la semilla (de un uso) y **mide el tiempo** con su reloj. Topes de plausibilidad y grabación de instantáneas para revisar a mano. | Errores y trampas burdas | US$0 (Supabase gratis) |
| **B′ · Grieta de desafío con verificación en sombra** (F3, recomendada) | Semilla semanal y **build fija para todos**. El jugador juega **en local con 0 ms** y manda sus entradas por WebSocket al DO en lotes de 10 Hz, con un CRC del estado cada 60 ticks. El DO corre la misma simulación determinista y **su resultado es el oficial**. Si los ticks llegan más lentos que el reloj real, o el CRC diverge, el intento se anula. | Todo salvo un bot que juegue en tiempo real. Detecta la cámara lenta y el rebobinado. | Ver abajo |
| **B · Grieta autoritativa en un DO** (la v1 de este informe) | El DO simula y el cliente solo dibuja | Igual que B′ | **Descartada:** desde Chile cada habilidad tendría 92–136 ms de retardo, con ventanas de carga perfecta de 0,20–0,30 s (`skills-arquera.js:93, 116`, `skills-guerrero.js:146, 159`). Predecir habilidades no está costeado. |
| **A · Temporada completa en servidor** (F4) | El héroe de temporada solo existe en el servidor y todo su juego corre en salas DO con el modelo A | Todo | ~US$13 al mes con 50 jugadores × 10 h por semana, más el refactor del modelo A (`p.cast`, guardas, predicción) |

**Cuentas de B′ en un DO:**
- **Duración:** la simulación vive en memoria y recibe un mensaje cada 100 ms, así que **no hiberna**: 0,128 GB × 3.600 s = 460,8 GB-s por sala-hora. Plan gratis: 13.000 GB-s al día ≈ **28 salas-hora al día** ≈ 140 intentos de 12 minutos.
- **Peticiones:** 36.000 mensajes por hora ÷ 20 = 1.800 peticiones por hora ≈ 55 salas-hora al día. Manda la duración.
- **CPU:** cada lote trae ~6 ticks ≈ 0,6 ms. La página de límites de DO habla de 30 s por invocación, que se reinician con cada mensaje WebSocket, pero aclara que también aplican los límites del plan de Workers, y en el plan gratis eso es **10 ms por petición** (https://developers.cloudflare.com/durable-objects/platform/limits/, https://developers.cloudflare.com/workers/platform/limits/). Con 0,6 ms por lote cabe en cualquiera de las dos lecturas. **[medir en el prototipo R2]**
- **Escrituras:** el registro de entradas se guarda en la SQLite del DO cada 5 s → 720 filas por sala-hora, frente a 100.000 filas al día gratis.
- **Plan de US$5:** 400.000 GB-s al mes ≈ 868 salas-hora incluidas; después, ≈ **US$0,007 por sala-hora**.

**Reinicios del DO (corrección).** Un DO se reinicia con cada despliegue, con las actualizaciones del runtime y por decisiones de ubicación. Al reiniciarse «WebSocket requests are terminated automatically during shutdown», vuelve a correr el constructor y se pierde la memoria (https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/). En B′:
1. El **registro de entradas** ya está en SQLite (cada 5 s). Al reiniciarse, el DO **vuelve a simular** desde la semilla y el registro, en tramos de ~50 ticks por mensaje para no pasarse de CPU. Es lo que hace valioso al determinismo.
2. El cliente no nota nada: sigue jugando en local y reenvía los últimos 5 s de entradas al reconectar (`partysocket` reconecta solo).
3. **Regla del ladder:** un intento cortado por mantenimiento no gasta intento.
4. **No desplegar** durante el cierre de una temporada.

**Ladder de grupo:** exige simular varios héroes en el DO, o sea el modelo A completo. Queda para F4 si la comunidad lo pide.

---

## 8. Robustez: anfitrión en segundo plano y reconexión

### 8.1 Anfitrión en segundo plano (bloqueante de F1)

**Qué pasa de verdad:**

| Situación | Chrome | Firefox | Safari |
|---|---|---|---|
| Pestaña oculta o ventana minimizada | rAF se detiene. Con un DataChannel abierto, los temporizadores se revisan **1 vez por segundo** (no 1 por minuto) (https://developer.chrome.com/blog/timer-throttling-in-chrome-88) | Mínimo de 1 s en temporizadores, **salvo que la pestaña tenga un `AudioContext`** (https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout) | **[sin verificar]** |
| **Ventana tapada por otra** (Windows) o **pantalla bloqueada** | Se trata como pestaña de fondo: «painting halts and JavaScript timers are throttled» (https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_native_window_occlusion_tracking.md). **Basta un alt-tab a Discord o a un juego maximizado.** La doc no dice si `visibilityState` pasa a `hidden` **[verificar en el prototipo]**. | **[sin verificar]** | — |
| Congelamiento por Ahorro de energía (Chrome 133) | **Exentas** las páginas con una `RTCPeerConnection` con un `RTCDataChannel` abierto (https://developer.chrome.com/blog/freezing-on-energy-saver) | — | — |
| Sonido | Un sonido en los últimos 30 s quita la limitación; una pista silenciosa no cuenta | Basta con que exista un `AudioContext` (`sfx.js:62`, `music.js:33`) | — |

**Cuánto se frena hoy:** con el `Math.min(0.05, dt)` actual (`main.js:1545`) y un tick por segundo, el mundo corre al **5 %**; con un acumulador de como mucho 4 pasos de 1/60, al **6,7 %**.

**Solución por capas (orden de implementación):**
1. **`advanceTo(performance.now(), 30)` impulsado por la red (F1, en el hilo principal).** En el anfitrión, cada `onmessage` de un invitado llama a `advanceTo`. Los invitados mandan su estado a 20 Hz, así que el mundo recibe 40–60 llamadas por segundo aunque los temporizadores estén limitados. Si la ventana está visible, el bucle de rAF hace lo mismo y además dibuja; si no, no se dibuja nada. Un `setTimeout` de respaldo cubre el caso sin mensajes. Que los eventos de red no se limiten como los temporizadores es lo esperable (la doc de Chrome solo limita temporizadores), pero hay que **medirlo**.
2. **Audio:** si la música suena, Chrome no limita; en Firefox basta con el `AudioContext`. Es un refuerzo, no la base, porque el jugador puede silenciar el juego.
3. **Worker (F3, o antes si el prototipo falla):** la simulación del mundo corre en un Dedicated Worker y los DataChannels se **transfieren** a él (Chrome 130, Firefox 144, Safari 15). La `RTCPeerConnection` se queda en el hilo principal. Exige la simulación sin DOM, la misma pieza que necesita el verificador del ladder. Si el traspaso exige hacerse en la misma tarea en que se crea el canal, hay que diseñar para eso: el estándar no lo aclara (https://w3c.github.io/webrtc-extensions/) **[verificar]**. Los temporizadores de un Worker en una pestaña oculta tampoco están documentados **[verificar]**.
4. **Pausa cooperativa:** si el mundo se atrasa más de 2 s respecto del reloj real, todos ven «el anfitrión está ausente» y el mundo se congela para todos (enemigos inmóviles, nadie recibe daño) hasta que vuelva.

**Prototipo R1 (antes de F1):** medir en Chrome, Firefox y Safari con la ventana tapada, minimizada, la pestaña oculta y la pantalla bloqueada, durante 10 minutos, con y sin audio, cuántos ticks por segundo logra el anfitrión.

### 8.2 Reconexión

- **Invitado:** ping cada 1 s. A los 3 s sin datos aparece «con retraso» en el HUD; a los 10 s pasa a **desconectado**. Su héroe queda quieto e invulnerable, marcado «ausente», **60 s**. Para reintentar: primero `restartIce()`; si falla, una conexión nueva por el DO de la sala con un `rejoinToken`. Al volver recibe el mundo completo, troceado por `ev`, y el CRC de la rejilla. Su héroe nunca se pierde: vive en su `localStorage`.
- **Anfitrión:** si se cae, **termina la sesión** y cada uno conserva su héroe. No hay migración del anfitrión en la v1.
- **Guardado:** con debounce (`codigo.md` 0.14), y al instante al subir de nivel, al recibir un legendario y al salir de la sala.

---

## 9. Seguridad entre jugadores (nuevo)

| Riesgo | Dónde | Medida |
|---|---|---|
| **XSS con datos de otro jugador.** `heroName`, `item.name` e `item.icon` son textos libres del guardado y se pintan con `innerHTML` (`ui.js:2894, 2670, 2723, 2812, 3071`). Un invitado con un héroe editado (`<img src=x onerror=…>`) ejecuta script en la página del anfitrión, puede leer sus guardados de `localStorage` y, desde F2, su sesión de Supabase. | `ui.js` (119 `innerHTML`), sin CSP | 1) **`sanitizeRemoteHero(save)`** en un módulo puro: lista blanca de campos (`PLAYER_SAVE_FIELDS`), tipos y longitudes; `heroName` con `^[\p{L}\p{N} '\-]{1,20}$`; los nombres e iconos de los objetos **se rehacen desde el catálogo** (base + afijos) y nunca se pintan los que vienen de afuera. 2) Chat y nombres remotos solo con `textContent`. 3) **CSP** en `vercel.json`: `script-src 'self' https://cdn.jsdelivr.net` con el hash del import map y del registro del service worker, `object-src 'none'`, `base-uri 'self'`, `connect-src` limitado a Cloudflare y Supabase. Hay que quitar los 4 `onclick=` en línea de `ui.js`. |
| **Contaminación del prototipo.** `JSON.parse('{"__proto__":{…}}')` crea una clave propia `__proto__`, y `Object.assign(this, saved)` (`entities.js:524`) la asigna como prototipo del héroe: sus métodos desaparecen y el anfitrión se cae. | `entities.js:524` | Un *reviver* que descarte `__proto__`, `constructor` y `prototype`, o copiar solo los campos de la lista blanca. Prueba unitaria con ese caso. |
| **Mensajes malformados o desbordes.** Un `DataView` fuera de rango lanza `RangeError` y tumba el bucle. | `js/net/protocol.js` (nuevo) | Decodificador con comprobación de límites y `try/catch` por mensaje; tamaño máximo por canal (1.100 B en `st`/`rt`, 16 KB por trozo en `ev`, 64 KB al rearmar); **ritmo máximo por par** (por ejemplo, 120 mensajes/s) y expulsión si se pasa. |
| **Endpoint de TURN abierto** | Propuesta anterior (`api/turn`) | Eliminado: credenciales solo desde el DO de la sala (§5.2). |
| **Adivinar códigos de sala** | Código de 6 caracteres de la v1 | 8 caracteres (40 bits), límite de intentos por IP en el DO y **aprobación del anfitrión**. |
| **IP expuesta** | Candidatos ICE | `relay` con desconocidos. |
| **Versiones distintas del juego** | Catálogos o reglas diferentes | Saludo con la versión de `sw.js` y el hash del catálogo; si no coinciden, «actualiza la página» (el service worker ya obliga a recargar). |

---

## 10. Hosting gratis o casi gratis (límites de octubre de 2026)

| Servicio | Plan gratis | Plan pago más barato | Qué nos limita | Uso propuesto |
|---|---|---|---|---|
| **Cloudflare Workers / DO** | Workers: 100.000 peticiones al día (después, error 1027) y 10 ms de CPU por petición HTTP; 128 MB por isolate (https://developers.cloudflare.com/workers/platform/limits/). DO: 100.000 peticiones al día (WebSocket entrante 20:1), 13.000 GB-s al día, 5 M de filas leídas y 100.000 escritas al día, 5 GB de SQLite; se facturan 128 MB por objeto aunque use menos; sin duración mientras hiberna (https://developers.cloudflare.com/durable-objects/platform/pricing/). **No hay DO en Sudamérica**: con la pista `sam` nace en el este de Norteamérica (https://developers.cloudflare.com/durable-objects/reference/data-location/). | US$5 al mes: 1 M de peticiones y 400.000 GB-s; después US$0,15 por millón y US$12,50 por millón de GB-s | Latencia desde Chile (solo afecta a la señalización y a la verificación, no al juego); los reinicios del DO | **Señalización (F1), credenciales TURN (F1), verificador del ladder (F3)** |
| **PartyServer / partysocket** | Librerías de Cloudflare tras comprar PartyKit (https://github.com/cloudflare/partykit) | Igual que Workers | — | Ahorran código en la sala y en la reconexión |
| **Cloudflare TURN** | 1.000 GB al mes | US$0,05/GB | Abuso de credenciales | NAT del co-op |
| **Supabase** | 2 proyectos; **pausa tras 1 semana** sin actividad; 500 MB de Postgres; 5 GB de egress; 50.000 MAU; Edge Functions con 2 s de CPU (https://supabase.com/pricing, https://supabase.com/docs/guides/functions/limits). Región `sa-east-1`. | Pro: US$25 al mes, sin pausa | La pausa; el cambio de `GRANT` | **Solo F2:** Auth, guardado en la nube, tablas del ladder |
| **Vercel (Hobby, ya en uso)** | Funciones con duración máxima de **300 s** en Hobby, verificado (https://vercel.com/docs/functions/limitations, actualizada el 24-ago-2026). WebSockets en GA desde el 20-oct-2026, con la conexión fija a una instancia (https://vercel.com/changelog/websocket-support-is-now-generally-available). | Pro | Se corta cada 5 minutos y no hay memoria compartida | **Solo el sitio estático** (y la CSP en `vercel.json`) |
| **Colyseus Cloud** | Sin plan gratis (https://www.colyseus.io/pricing) | Desde US$15 al mes | Precio | Descartado |
| **Fly.io** | Sin plan gratis para cuentas nuevas (https://fly.io/docs/about/free-trial/) | ~US$2 al mes por máquina | Pago desde el día 1 | Descartado |
| **Oracle Cloud Always Free** | 2 OCPU y 12 GB en Ampere, 10 TB de salida al mes, región **Santiago**; recupera instancias ociosas (https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm) | — | Hay que operarlo uno mismo | Plan B de baja latencia (F4) |

---

## 11. Plan corregido (tabla única de fases, para el diseño)

| Fase | Contenido técnico | Costo | Criterio de salida |
|---|---|---|---|
| **F0 · Cimientos sin red** (sirven en solitario) | Lo de `codigo.md` §5 Fase 0, con estos cambios y añadidos: **(a)** en vez de paso fijo, `advanceTo(t, tope)` con **subpasos de como mucho 1/60 s** (tope 4 en solitario y 30 en el anfitrión); **(b)** bucle que no dependa de rAF para simular; **(c)** `buildTown(seed)`/`buildRefuge(seed)` y distancias al cuadrado en `zones.js:217`, con `test58` ampliado; **(d)** `sanitizeRemoteHero` y el *reviver* contra `__proto__`; **(e)** CSP y fuera los `onclick=` en línea; **(f)** hit-stop solo visual, pausa solo en solitario, azar de combate e IA con streams, `heroId`, ids de red por mundo, `takeDamage({by})`, adquisición por el héroe más cercano, daño enemigo a todos los héroes, `resolveKill`/`grantKill` con `killLootRng`, guardado con debounce. | US$0 | `npm test` en verde; en solitario el banco y el humo no cambian de banda; dos instancias en Node, unidas por un **transporte en memoria con 150 ms y 5 % de pérdida**, juegan 10 minutos (un dueño de mundo y un dueño de héroe) sin muertes fantasma ni dobles créditos. |
| **F0.5 · Prototipos de riesgo** (en paralelo con F0, pequeños) | **R1:** anfitrión en segundo plano en los 3 navegadores (§8.1). **R2:** DO de señalización con hibernación y emisión de credenciales TURN. **R3:** presupuesto de SCTP: instantáneas de 0,75 y 1,2 KB con 5 % de pérdida, y recuperación de `rt` frente a `ev` medida en `webrtc-internals`. | US$0 | El anfitrión mantiene ≥ 55 ticks por segundo oculto o tapado en Chrome y Firefox, o queda decidida la pausa cooperativa. |
| **F1 · Co-op P2P (modelo B)** | `js/net/protocol.js` (puro), `transport.js` (3 canales y reglas de §3.2), `session.js` (saludo con CRC), `replica.js`, `remote-hero.js`, mixin `game-net.js`; señalización por DO + respaldo Trystero/Nostr con `password`; TURN por el DO; reconexión con 60 s de gracia; lobby con código de 8 caracteres y aprobación. | US$0 | 4 jugadores (Chile + Argentina + Perú, o simulados) juegan 1 hora sin muertes fantasma, con la sesión forzada por relé funcionando y el anfitrión tapado por otra ventana 5 minutos. |
| **F2 · Cuentas, nube y ladder «de honor» (C)** | Supabase Auth (anónimo y después vinculado); `heroes`/`stash` con `rev`; migración desde `localStorage`; RLS y `GRANT`; ladder C. | US$0 | Un jugador cambia de PC y recupera su héroe; un conflicto muestra las dos tarjetas. |
| **F3 · Ladder verificable (B′)** | Simulación sin DOM; **paso fijo de 60 Hz con `simPos`/`prevPos` y render interpolado**; `detmath` + lint; entradas registradas y `g.clockNow`; verificador en un DO con registro en SQLite y re-simulación tras un reinicio; grieta de desafío semanal con build fija. **Opcional:** mover la simulación del anfitrión del co-op al Worker. | US$0; US$5 al mes al crecer | La misma grabación da el mismo CRC en Node, Chrome, Firefox y Safari; un intento en cámara lenta o con el cliente manipulado se anula; un despliegue a mitad de intento no lo pierde. |
| **F4 · Opcional** | Modelo A: `p.cast` (~130 sitios), fuera las guardas `g.player !== p`, predicción de habilidades. Sirve para el co-op público o hardcore y para el ladder de grupo. O un servidor en Santiago (Oracle). | US$5–15 al mes | Lo decide el dueño según la comunidad. |

---

## 12. Riesgos y qué verificar

| # | Riesgo | Cómo verificarlo |
|---|---|---|
| R1 | Anfitrión oculto, minimizado, tapado o con la pantalla bloqueada | Prototipo de §8.1 en los 3 navegadores; se mide en ticks por segundo |
| R2 | DO: CPU del plan gratis (¿10 ms o 30 s por mensaje?) y reinicios | DO de prueba con hibernación (señalización) y otro con re-simulación por tramos; forzar un despliegue a mitad de intento |
| R3 | SCTP: fragmentación, retransmisión de 400 ms y colas | Prototipo con pérdida inducida; `webrtc-internals` |
| R4 | Rejillas distintas entre máquinas | `test58` ampliado; CRC en el saludo; registrar los desajustes en el lobby |
| R5 | XSS y contaminación del prototipo con héroes remotos | Pruebas unitarias de `sanitizeRemoteHero` con cargas hostiles; CSP con `report-only` primero |
| R6 | Abuso de credenciales TURN | Tope diario en el DO; revisión del consumo mensual |
| R7 | Relés públicos de Nostr sin SLA (respaldo) | Medir cuánto tarda en armarse una sala con el respaldo |
| R8 | CGNAT en LatAm: más relé del previsto | Registrar `host/srflx/relay` en las métricas del lobby |
| R9 | Movilidad y canales en el modelo B (la lección de Last Epoch, ahora en las réplicas) | Suite con latencia simulada para Carrera, Parpadeo, Remolino y las canalizaciones |
| R10 | Determinismo del ladder en Firefox y Safari (bounce#8 solo probó V8) | Prueba de repetición multi-navegador antes de abrir el ladder |
| R11 | Subida del anfitrión en conexiones asimétricas | Medir los KB/s reales; ajuste de 15 Hz |

---

## 13. Cuentas, guardado en la nube y migración (F2)

- **Identidad:** primero `signInAnonymously()` (rol `authenticated`, tope por defecto de 30 por hora por IP; recomiendan CAPTCHA o Turnstile). Después `linkIdentity({ provider: 'google' })` o `updateUser({ email })`. Las RLS distinguen al anónimo con el claim `is_anonymous` y requieren políticas *restrictive* (https://supabase.com/docs/guides/auth/auth-anonymous). El ladder puede exigir una cuenta permanente.
- **Esquema mínimo:** `heroes(id uuid pk, user_id uuid, hero_id uuid, slot int, kind text check (kind in ('abierto','temporada')), save jsonb, save_version int, rev bigint, updated_at timestamptz)`; `stash(user_id uuid pk, data jsonb, rev bigint)`; RLS por `auth.uid()`. **`GRANT` explícitos:** desde el 30-may-2026 para proyectos nuevos y desde el **30-oct-2026** para todos (https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically).
- **Migración (al primer inicio de sesión):** subir cada `intentorpg_save_slot{0..2}` e `intentorpg_stash` tal cual (`main.js:288, 1479`); `MIGRATIONS` ya los lleva al formato vigente; dejar una copia local `.bak-nube`; desde ahí `localStorage` es la caché sin conexión (sincroniza con debounce de 30 s y en `visibilitychange`/`pagehide`).
- **Conflictos:** `update … where rev = :esperado`. Si choca, **dos tarjetas** (nivel, horas, fecha) y el jugador elige.
- **Abierto contra temporada:** los abiertos se editan, van al co-op y se exportan como hoy. Los de temporada no existen en B′ (build fija) y solo en el servidor con A. Un héroe de temporada puede pasar a abierto al terminar; nunca al revés.
- **Pausa del plan gratis:** ya no tumba el co-op (la señalización está en Cloudflare). Solo deja sin nube a quien juegue tras 7 días de inactividad total, hasta restaurarla.

---

## 14. Autorrefutación (para la segunda ronda)

- **«El modelo B deja mentir sobre el daño».** Sí. Entre amigos se acepta, como en Grim Dawn y D2 abierto, con cotas de plausibilidad. El ladder no pasa por el co-op.
- **«La verificación en sombra exige un determinismo que nadie probó en Firefox ni Safari».** Cierto. Es el riesgo R10, y por eso el ladder verificable es F3 y no F1. Si falla, queda C (de honor) o A (F4).
- **«El paso semifijo no es reproducible».** Correcto, y en la v1 no hace falta: el modelo B no reconcilia ni re-simula. El paso fijo llega con F3, que es donde se necesita.
- **«Avanzar el mundo con los mensajes de red es un truco».** Lo es, pero barato y medible. Si el prototipo R1 lo desmiente, se adelanta el Worker, que igual se necesita para F3.
- **«Un DO en el este de EE. UU. es lento para los chilenos».** Con B′ el jugador no lo nota: juega en local, y el DO solo verifica.
- **Puntos débiles que siguen abiertos:**
  - El ancho de banda es una estimación sin medir.
  - El 10–25 % de sesiones con relé es una estimación (dato medido: 17,7 % en 2017).
  - Faltan: qué hace Safari con las pestañas ocultas y WebRTC, si los Workers se limitan, cuándo deja de poder transferirse un DataChannel, la CPU real de un DO gratis y qué pasa con una asignación TURN al revocar.
  - El umbral del modo Auto de PoE sigue sin una fuente oficial; ya no lo uso como argumento.

---

## 15. Refutación y cambios (ronda 1)

**Veredicto de los expertos:** «aprobado con correcciones obligatorias antes de pasar al diseño». Cuatro bloqueantes y varias objeciones de gravedad media. Respondo una por una.

| # | Objeción | Respuesta | Cambio en este informe |
|---|---|---|---|
| 1 | **Los dos informes recomiendan modelos opuestos**; F3 «reutiliza» una simulación que con B no existe; F0 no incluía mover el estado de lanzamiento | **Aceptada.** Adopto el modelo B para la v1, igual que `codigo.md`. **Discrepo en parte** del arreglo «meter `p.cast` en F0»: con B nadie simula héroes ajenos, y el ladder que recomiendo (B′, individual) simula **un solo héroe**, así que el estado de lanzamiento en `Game` no estorba. `p.cast` solo hace falta con el modelo A (co-op público o ladder de grupo), y lo dejo costeado en F4 en vez de pagarlo en F0 sin uso. | §0.1, §2.3, §2.4, §7.3, §11 (tabla única de fases) |
| 2 | **Anfitrión oculto subestimado:** ventana tapada en Windows, mundo al 5–7 %, transferencia de DataChannels a Workers, exención por Ahorro de energía | **Aceptada y verificada:** occlusion tracking de Chromium, transferible en Chrome 130/Firefox 144/Safari 15 (BCD), exención de Chrome 133 por DataChannel abierto. Añado un dato que suma: Firefox no limita una pestaña con `AudioContext` (MDN), y el juego ya crea uno. **Cambio el orden de los prototipos:** primero el avance por mensajes de red (barato y posible en F1), y el Worker después, porque exige la simulación sin DOM que en B no está en F0. | §0.6, §1, §8.1, §11 (F0.5), §12 R1 |
| 3 | **«Reconstruir el mapa por semilla» es falso en el pueblo y el refugio**; `Math.hypot` en `zones.js:217` | **Aceptada y verificada** en `world.js:6, 778-783, 1284-1288` y `main.js:472-473`. Añado que con enteros conviene comparar distancias al cuadrado (exacto) en vez de reemplazar `hypot` por `sqrt`. | §6 (nueva), §1, §11 F0 |
| 4 | **Sin presupuesto de SCTP** | **Aceptada y verificada** en `dcsctp_options.h` (MTU de 1.191, `rto_min` de 400 ms, `rto_initial` de 500 ms, ACK diferido de 200 ms, sin intercalado). Tope de 1.100 B, troceo de más de 16 KB y descarte por `bufferedAmount`. **Cambio sobre el arreglo:** para lo urgente prefiero un canal no fiable con **redundancia y acuse en la aplicación** antes que `maxPacketLifeTime:250`, porque el de vida máxima puede perder el mensaje sin avisar, y en B las reclamaciones de golpe no se pueden perder. | §3.2 (nueva), §2.3 |
| 5 | **El modo Auto de PoE estaba invertido**; «PoE2 solo lockstep» lo dice un jugador | **Aceptada.** El lockstep de PoE es el modo para latencia baja y Auto pasa a predictivo con latencia alta, según la wiki y los jugadores. El artículo de GGG de 2014 no menciona Auto. Lo marco [sin verificar] y apoyo la jugabilidad en Last Epoch. Además, con B el argumento pierde peso: lo propio va a 0 ms. | §2.1, §4.2, §4.3 |
| 6 | **Los DO se reinician** con despliegues y actualizaciones; una grieta en curso se pierde; riesgo de CPU | **Aceptada y verificada** en la página del ciclo de vida. Con B′ el arreglo sale casi gratis: registro de entradas en SQLite cada 5 s y re-simulación determinista tras el reinicio, en tramos para no pasarse de CPU; un intento cortado no gasta intento; no desplegar al cierre de temporada. La CPU del plan gratis sigue ambigua (30 s en la página de DO, 10 ms en la de Workers) y queda para el prototipo R2. | §7.3, §12 R2 |
| 7 | **El ladder autoritativo en un DO daría 92–136 ms en cada habilidad**; evaluar verificación en sombra | **Aceptada.** Adopto la verificación en sombra (B′) como ladder recomendado. Añado por qué es mejor que re-simular después: con las entradas en vivo, **el reloj del servidor detecta la cámara lenta y el rebobinado**, o sea los TAS. Solo quedan los bots en tiempo real. | §0.8, §7.2, §7.3 |
| 8 | **Pasos distintos (30 Hz frente a 1/60)**; un paso fijo sin interpolar da tirones a 144 Hz; la posición es la malla | **Aceptada en el diagnóstico** (verificado en `entities.js:744, 1906, 3278`) y **nunca 30 Hz**. **Discrepo en parte** de meter `simPos`/`prevPos` en F0: en la v1 propongo el **paso semifijo** de Gaffer (subpasos de como mucho 1/60), que evita los tirones sin interpolar, mantiene la sensación y permite ponerse al día. El paso fijo con interpolación lo pido en F3, que es lo único que necesita reproducibilidad exacta. `codigo.md` 0.1 debe ajustarse a esto. Fuente: https://gafferongames.com/post/fix_your_timestep/ («Semi-fixed timestep»). | §0.2, §2.3, §11 |
| 9 | **El determinismo no es casi imposible**: 32 sitios, 1,10×, y solo se probó en V8 | **Aceptada.** Reescribo §7.2: el determinismo es posible y está costeado (`detmath` + lint al estilo de `test67`), con la prueba en Firefox y Safari como condición. Rechazo la re-simulación después de la partida por los TAS y por el héroe editable, no por una imposibilidad técnica. | §2.2, §7.2 |
| 10 | **Señalización en Supabase:** pausa a los 7 días, Auth obligatorio para canales privados; mejor Worker + DO; Trystero con `password` y `getPeers` | **Aceptada y verificada** en el README de Trystero (`password` con AES-GCM, `getPeers()`, `rtcConfig.iceServers`, servidor propio con `ws-relay`). Supabase pasa a ser solo F2. Añado la aprobación del anfitrión y el código de 8 caracteres. | §0.4, §5.1, §10 |
| 11 | **Huecos de seguridad:** XSS con datos de otros jugadores y endpoint de TURN abierto | **Aceptada y ampliada.** Verifiqué en el repo `heroName` e `item.name` en `innerHTML` sin CSP, y encontré además la contaminación del prototipo por `Object.assign(this, saved)` (`entities.js:524`). El endpoint `api/turn` desaparece: credenciales solo desde el DO de la sala, con TTL, revocación y tope. | §9 (nueva), §5.2 |
| — | **Datos sin verificar:** 300 s de Vercel Hobby, 10–25 % por TURN, versión de Trystero | 300 s **verificado** (página de límites, 24-ago-2026). El 10–25 % queda como estimación, con el único dato medido (17,7 %) y medición en el lobby. La versión de Trystero no figura en el README: se fija al implementar. | §5.1, §5.2, §10 |

**Lo que NO cambió tras la ronda:** nada de lockstep en el co-op; WebRTC en estrella con canales fiables y no fiables; TURN de Cloudflare; Supabase descartado como relé; héroes abiertos separados de los de temporada; ladder «de honor» (C) como primer paso barato.

---

## 16. Fuentes (qué saqué de cada una)

**Leídas o verificadas en esta ronda**
- https://webrtc.googlesource.com/src/+/refs/heads/main/net/dcsctp/public/dcsctp_options.h: MTU de 1.191 (desglose IPv6/UDP/GCM/DTLS/TURN), 256 KiB de mensaje máximo, `rto_initial` 500, `rto_min` 400, `rto_max` 60.000, ACK diferido de 200, interleaving desactivado, búfer de envío de 2 MB, ventana inicial de 10 MTU.
- https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/RTCDataChannel.json: transferible en Chrome 130, Edge 130, Firefox 144 y Safari 15.
- https://w3c.github.io/webrtc-extensions/: `RTCDataChannel` `[Exposed=(Window,Worker), Transferable]`; no dice cuándo deja de ser transferible.
- https://chromium.googlesource.com/chromium/src/+/HEAD/docs/windows_native_window_occlusion_tracking.md: una ventana tapada se trata como pestaña de fondo («painting halts and JavaScript timers are throttled»); la pantalla bloqueada cuenta como tapada; minimizada = oculta.
- https://developer.chrome.com/blog/freezing-on-energy-saver: Chrome 133, pestañas ocultas y silenciosas más de 5 minutos y con mucha CPU; exentas las que tienen una `RTCPeerConnection` con un `RTCDataChannel` abierto.
- https://developer.chrome.com/blog/timer-throttling-in-chrome-88: niveles de limitación; WebRTC = DataChannel abierto o pista viva; audio de los últimos 30 s; rAF espera a que la página sea visible; no habla de Workers.
- https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout: Firefox con mínimo de 1 s en pestañas inactivas y sin limitación si hay un `AudioContext`; nada sobre Workers.
- https://developer.mozilla.org/en-US/docs/Web/API/RTCDataChannel: transferible, `bufferedAmount`, `bufferedAmountLowThreshold`, `bufferedamountlow`.
- https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/: reinicios por despliegue, actualizaciones del runtime y ubicación; WebSockets cerrados al apagarse; memoria perdida; hibernación a los 10 s y desalojo a los 70–140 s.
- https://developers.cloudflare.com/durable-objects/platform/limits/: 30 s de CPU por invocación (hasta 5 min), se reinicia con cada mensaje WebSocket; también aplican los límites del plan de Workers; 1.000 peticiones/s por objeto como tope blando.
- https://developers.cloudflare.com/workers/platform/limits/: 10 ms de CPU por petición HTTP en el plan gratis; 100.000 peticiones al día (error 1027); 128 MB por isolate.
- https://developers.cloudflare.com/durable-objects/platform/pricing/: plan gratis y pago (peticiones, GB-s, filas de SQLite, 5 GB), 20:1 para WebSocket entrante, 128 MB facturados, sin duración mientras hiberna.
- https://developers.cloudflare.com/durable-objects/best-practices/websockets/: `acceptWebSocket`, adjuntos de 16 KB, qué impide hibernar, ping/pong automático, agrupar 10–100 mensajes por trama.
- https://developers.cloudflare.com/realtime/turn/generate-credentials/: generación con `ttl` en el backend, endpoint de revocación, no exponer la clave; nada sobre abuso ni límites.
- https://github.com/dmotz/trystero: `password` (AES-GCM sobre el SDP), `getPeers()`, `turnConfig`/`rtcConfig`, estrategias (Nostr, MQTT, BitTorrent, Supabase, Firebase, IPFS, relé propio), troceo automático; sin número de versión.
- https://vercel.com/docs/functions/limitations: Hobby con 300 s por defecto y como máximo (actualizada el 24-ago-2026).
- https://www.pathofexile.com/forum/view-thread/889669: artículo de 2014 de GGG («we now support both models simultaneously»); sin modo Auto ni umbral.

**De la ronda anterior (confirmadas por los expertos)**
- https://supabase.com/docs/guides/realtime/limits, https://supabase.com/docs/guides/realtime/pricing, https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages, https://supabase.com/pricing, https://supabase.com/docs/guides/functions/limits, https://supabase.com/docs/guides/auth/auth-anonymous, https://supabase.com/docs/guides/realtime/authorization, https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically, https://supabase.com/changelog/45702-developer-update-may-2026.
- https://developers.cloudflare.com/durable-objects/reference/data-location/: sin DO en Sudamérica; la pista `sam` hace nacer el objeto en el este de Norteamérica; no se mueve.
- https://developers.cloudflare.com/realtime/turn/, https://developers.cloudflare.com/realtime/sfu/pricing, https://developers.cloudflare.com/realtime/sfu/datachannels/.
- https://vercel.com/changelog/websocket-support-is-now-generally-available: GA el 20-oct-2026.
- https://codeberg.org/perplexdotgg/bounce/issues/8: `sin/cos` difieren entre V8 11.3 y 14.9; 32 sitios cambiados por núcleos fdlibm; 1,10×; solo probado en V8.
- https://esdiscuss.org/topic/es6-accuracy-of-special-functions: funciones especiales aproximadas por la implementación.
- https://webrtc.ventures/2026/04/webtransport-is-now-baseline-what-it-means-for-real-time-media/: WebTransport Baseline con Safari 26.4.
- https://openvidu.io/blog/2026/06/09/turn-key-considerations/: 17,7 % por TURN (Hancke), CGNAT, ~0,5 % solo por TURN-TLS.
- https://www.colyseus.io/pricing, https://fly.io/docs/about/free-trial/, https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm, https://www.metered.ca/tools/openrelay/, https://peerjs.com/peerserver, https://github.com/cloudflare/partykit, https://github.com/geckosio/geckos.io.
- https://wondernetwork.com/pings/Santiago: pings desde Santiago.

**Netcode y precedentes**
- https://gafferongames.com/post/fix_your_timestep/: paso fijo, paso semifijo e interpolación alfa.
- https://gafferongames.com/post/snapshot_interpolation/: búfer de ~3 intervalos.
- https://gafferongames.com/post/reliable_ordered_messages/: fiabilidad sobre un canal no fiable con secuencias, acuses y redundancia.
- https://gafferongames.com/post/what_every_programmer_needs_to_know_about_game_networking/ y https://gafferongames.com/post/deterministic_lockstep/: lockstep, esperar al más lento, desincronización.
- https://www.gabrielgambetta.com/entity-interpolation.html y https://gabrielgambetta.com/client-server-game-architecture.html: interpolación y autoridad.
- https://docs.colyseus.io/netcode/client-prediction: 100 ms de interpolación por defecto.
- https://forum.lastepoch.com/t/multiplayer-progress-update-july-2021/42239 y https://forum.lastepoch.com/t/network-lag-issues-megathread/55099: autoridad de servidor, «up to 200 ping», subida asimétrica.
- https://steamcommunity.com/app/219990/discussions/0/365163686071802740, https://diablo2.diablowiki.net/B.net: personajes abiertos y cerrados.
- https://en.wikipedia.org/wiki/Tool-assisted_speedrun: un TAS se hace con herramientas (cámara lenta, rebobinado).

**Código del repo (solo lectura)**
- `js/main.js:212, 288, 472-475, 495, 1302, 1479, 1545, 1552-1564, 1569-1574`
- `js/world.js:6, 710, 778-783, 949, 1252-1288`
- `js/zones.js:24, 205-220`
- `js/entities.js:524, 744, 1906, 2117-2150, 3278`
- `js/game-skills.js:66, 888-893, 928, 2150, 2173, 2286`
- `js/ui.js` (119 `innerHTML`; `2670, 2723, 2812, 2894, 3071`; 4 `onclick=`)
- `js/save-schema.js:37-58`
- `js/sfx.js:62`, `js/music.js:33`
- `index.html:25-30, 490-495` (import map y script en línea; sin CSP); no existe `vercel.json`
- `tests/helpers/power-harness.mjs`, `tests/helpers/bench-core.mjs`, `tests/fixtures/saves-v4-paso2.json`, `tools/smoke/baseline.json` (vía `codigo.md`)
- `codigo.md` (frente «código»), para unificar el modelo y las fases.
